<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\PBXCoreREST\Lib\Firewall;

use MikoPBX\AdminCabinet\Library\Cidr;
use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * ✨ REFERENCE IMPLEMENTATION: Firewall Save Action
 *
 * This is the unified save action following all best practices from CallQueues/IvrMenu:
 * - Single Source of Truth pattern (DataStructure::getSanitizationRules)
 * - Proper data processing pipeline (sanitize → defaults → validate → save)
 * - Schema-based validation (enum, min/max constraints)
 * - Clean separation of concerns
 * - Support for predefined ID (migrations/imports)
 *
 * Processing Pipeline:
 * 1. SANITIZE: Clean user input (remove dangerous chars, trim, normalize)
 * 2. VALIDATE REQUIRED: Check required fields and basic format
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE/PATCH (using numeric ID)
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!)
 * 5. VALIDATE SCHEMA: Check enum/range constraints on complete data
 * 6. SAVE: Transaction with network filter + firewall rules
 *
 * @api {post} /pbxcore/api/v3/firewall Create firewall rule
 * @api {put} /pbxcore/api/v3/firewall/:id Full update
 * @api {patch} /pbxcore/api/v3/firewall/:id Partial update
 * @apiVersion 3.0.0
 * @apiName SaveFirewallRule
 * @apiGroup Firewall
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save firewall rule with comprehensive validation
     *
     * Handles CREATE, UPDATE (PUT), and PATCH operations:
     * - CREATE: New record with auto-increment or predefined ID
     * - UPDATE: Full replacement of existing record
     * - PATCH: Partial update of existing record
     *
     * @param array<string, mixed> $data Input data from API request
     * @return PBXApiResult Result with data/errors and HTTP status code
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        // ============================================================
        // PHASE 1: DATA SANITIZATION
        // Clean user input to prevent XSS, SQL injection, etc.
        // ============================================================

        $sanitizationRules = DataStructure::getSanitizationRules();
        $textFields = ['description'];

        // Preserve ID field that may not be in sanitization rules
        $recordId = $data['id'] ?? null;

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved field (essential for UPDATE/PATCH operations)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // Sanitize currentRules (special handling for nested data)
        if (isset($data['currentRules'])) {
            $currentRules = is_string($data['currentRules'])
                ? (json_decode($data['currentRules'], true) ?: [])
                : (is_array($data['currentRules']) ? $data['currentRules'] : []);

            $sanitizedData['currentRules'] = self::sanitizeCurrentRules($currentRules);
        }

        // ============================================================
        // PHASE 2: REQUIRED FIELDS VALIDATION
        // Check required fields before database operations
        // Note: For PATCH operations with existing ID, network fields are not required
        // ============================================================

        // Determine if this is a PATCH on existing record
        $isExistingRecordPatch = false;
        if (!empty($sanitizedData['id'])) {
            $existingFilter = NetworkFilters::findFirstById($sanitizedData['id']);
            if ($existingFilter) {
                $isExistingRecordPatch = true;
            }
        }

        // For CREATE operations: require network+subnet (form always sends these fields)
        // For UPDATE/PATCH: network data is optional
        if (!$isExistingRecordPatch) {
            if (!isset($sanitizedData['network']) || !isset($sanitizedData['subnet'])) {
                $res->messages['error'][] = 'Network and subnet fields are required';
                return $res;
            }
        }

        // ============================================================
        // PHASE 3: DETERMINE OPERATION TYPE
        // Detect CREATE vs UPDATE/PATCH and prepare model
        // ============================================================

        $networkFilter = null;
        $isNewRecord = true;

        if (!empty($sanitizedData['id'])) {
            // Try to find existing record by numeric ID
            $networkFilter = NetworkFilters::findFirstById($sanitizedData['id']);

            if ($networkFilter) {
                // Record exists - UPDATE or PATCH operation
                $isNewRecord = false;
            }
        }

        if ($isNewRecord) {
            // CREATE: Initialize new network filter
            $networkFilter = new NetworkFilters();

            // ✅ Support predefined ID (migrations/imports)
            // For auto-increment fields, we need to explicitly set the ID
            if (!empty($sanitizedData['id'])) {
                // Use writeAttribute to bypass auto-increment
                $networkFilter->writeAttribute('id', (int)$sanitizedData['id']);
            }
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // Add missing field defaults
        // WHY: CREATE needs all fields, UPDATE/PATCH only touches provided fields
        // ============================================================

        if ($isNewRecord) {
            // ✅ CREATE: Apply defaults for missing fields
            $defaults = [
                'deny' => '0.0.0.0/0',
                'description' => '',
                'newer_block_ip' => '0',
                'local_network' => '0'
            ];
            $sanitizedData = self::applyDefaults($sanitizedData, $defaults);
        }
        // ❌ UPDATE/PATCH: Do NOT apply defaults (would overwrite existing values!)

        // ============================================================
        // PHASE 5: SAVE TO DATABASE
        // Transaction ensures atomicity (network filter + firewall rules)
        // ============================================================

        $di = Di::getDefault();
        $db = $di->get('db');

        try {
            $db->begin();

            // Process network/subnet fields to calculate permit (CIDR notation)
            if (isset($sanitizedData['network']) && isset($sanitizedData['subnet'])) {
                $calculator = new Cidr();
                $networkFilter->permit = $calculator->cidr2network(
                    $sanitizedData['network'],
                    intval($sanitizedData['subnet'])
                ) . '/' . $sanitizedData['subnet'];
            }

            // Convert boolean fields to '0'/'1' strings
            $sanitizedData = self::convertBooleanFields($sanitizedData, ['newer_block_ip', 'local_network']);

            // Update NetworkFilter fields
            // For CREATE: All fields from $sanitizedData (with defaults)
            // For PATCH: Only provided fields (no defaults)
            if (isset($sanitizedData['deny'])) {
                $networkFilter->deny = $sanitizedData['deny'];
            }
            if (isset($sanitizedData['description'])) {
                $networkFilter->description = $sanitizedData['description'];
            }
            if (isset($sanitizedData['newer_block_ip'])) {
                $networkFilter->newer_block_ip = $sanitizedData['newer_block_ip'];
            }
            if (isset($sanitizedData['local_network'])) {
                $networkFilter->local_network = $sanitizedData['local_network'];
            }

            if (!$networkFilter->save()) {
                $errors = $networkFilter->getMessages();
                foreach ($errors as $error) {
                    $res->messages['error'][] = $error->getMessage();
                }
                $db->rollback();
                $res->success = false;
                return $res;
            }

            // Update FirewallRules if currentRules data is provided
            if (isset($sanitizedData['currentRules']) && is_array($sanitizedData['currentRules'])) {
                if ($isNewRecord) {
                    // CREATE: Create new rules
                    if (!self::createFirewallRules($networkFilter->id, $sanitizedData['currentRules'])) {
                        $res->messages['error'][] = 'Failed to create firewall rules';
                        $db->rollback();
                        $res->success = false;
                        return $res;
                    }
                } else {
                    // UPDATE/PATCH: Update existing rules
                    if (!self::updateFirewallRules($networkFilter->id, $sanitizedData['currentRules'], $isNewRecord)) {
                        $res->messages['error'][] = 'Failed to update firewall rules';
                        $db->rollback();
                        $res->success = false;
                        return $res;
                    }
                }
            } elseif ($isNewRecord) {
                // CREATE without rules: Use defaults
                if (!self::createFirewallRules($networkFilter->id, [])) {
                    $res->messages['error'][] = 'Failed to create default firewall rules';
                    $db->rollback();
                    $res->success = false;
                    return $res;
                }
            }

            $db->commit();

            // ============================================================
            // PHASE 6: BUILD RESPONSE
            // Format data using DataStructure
            // ============================================================

            $res->data = DataStructure::createFromModel($networkFilter);
            $res->success = true;
            $res->httpCode = $isNewRecord ? 201 : 200; // 201 Created, 200 OK
            $res->reload = "firewall/modify/{$networkFilter->id}";

            self::logSuccessfulSave('Firewall rule', $networkFilter->description ?: $networkFilter->permit, (string)$networkFilter->id, __METHOD__);

        } catch (\Exception $e) {
            $db->rollback();
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Create FirewallRules for a NetworkFilter
     *
     * @param string $networkFilterId NetworkFilter ID
     * @param array<string, bool> $rulesData Simple boolean map of rules (e.g., ["SIP" => true, "WEB" => false])
     * @return bool Success status
     */
    private static function createFirewallRules(string $networkFilterId, array $rulesData): bool
    {
        $defaultRules = FirewallRules::getDefaultRules();

        foreach ($defaultRules as $category => $categoryData) {
            foreach ($categoryData['rules'] as $rule) {
                $firewallRule = new FirewallRules();
                $firewallRule->networkfilterid = $networkFilterId;
                $firewallRule->protocol = $rule['protocol'];
                $firewallRule->portfrom = $rule['portfrom'];
                $firewallRule->portto = $rule['portto'];
                $firewallRule->category = $category;
                $firewallRule->portFromKey = $rule['portFromKey'] ?? '';
                $firewallRule->portToKey = $rule['portToKey'] ?? '';

                // Get action from currentRules data or use default
                if (isset($rulesData[$category])) {
                    // Simple boolean format: true = allow, false = block
                    $firewallRule->action = $rulesData[$category] ? 'allow' : 'block';
                } else {
                    // Use default from template
                    $firewallRule->action = $categoryData['action'] ?? 'block';
                }

                $firewallRule->description = "$firewallRule->action connection for $category";

                if (!$firewallRule->save()) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Update FirewallRules for a NetworkFilter
     *
     * @param string $networkFilterId NetworkFilter ID
     * @param array<string, bool> $rulesData Simple boolean map of rules (e.g., ["SIP" => true, "WEB" => false])
     * @param bool $isPatch Whether this is a partial update
     * @return bool Success status
     */
    private static function updateFirewallRules(string $networkFilterId, array $rulesData, bool $isPatch): bool
    {
        // Get existing rules
        $existingRules = FirewallRules::find([
            'conditions' => 'networkfilterid = :id:',
            'bind' => ['id' => $networkFilterId]
        ]);

        // Create a map of existing rules by category
        /** @var array<string, array<FirewallRules>> $rulesMap */
        $rulesMap = [];
        /** @phpstan-ignore-next-line - Phalcon ResultsetInterface has count() method */
        if ($existingRules->count() > 0) {
            /** @var FirewallRules $rule */
            /** @phpstan-ignore-next-line - Phalcon ResultsetInterface is iterable */
            foreach ($existingRules as $rule) {
                if (!isset($rulesMap[$rule->category])) {
                    $rulesMap[$rule->category] = [];
                }
                $rulesMap[$rule->category][] = $rule;
            }
        }

        // Update rules
        foreach ($rulesData as $category => $action) {
            if (isset($rulesMap[$category])) {
                // Update existing rules for this category
                foreach ($rulesMap[$category] as $rule) {
                    // Simple boolean format: true = allow, false = block
                    $rule->action = $action ? 'allow' : 'block';
                    $rule->description = "$rule->action connection for $category";

                    if (!$rule->save()) {
                        return false;
                    }
                }
            } elseif (!$isPatch) {
                // For PUT operation, create missing categories with default rules
                $defaultRules = FirewallRules::getDefaultRules();
                if (isset($defaultRules[$category])) {
                    foreach ($defaultRules[$category]['rules'] as $ruleData) {
                        $firewallRule = new FirewallRules();
                        $firewallRule->networkfilterid = $networkFilterId;
                        $firewallRule->protocol = $ruleData['protocol'];
                        $firewallRule->portfrom = $ruleData['portfrom'];
                        $firewallRule->portto = $ruleData['portto'];
                        $firewallRule->category = $category;
                        $firewallRule->portFromKey = $ruleData['portFromKey'] ?? '';
                        $firewallRule->portToKey = $ruleData['portToKey'] ?? '';

                        // Convert boolean to allow/block string
                        $firewallRule->action = $action ? 'allow' : 'block';
                        $firewallRule->description = "$firewallRule->action connection for $category";

                        if (!$firewallRule->save()) {
                            return false;
                        }
                    }
                }
            }
        }

        // For PUT operation, ensure all default categories exist
        if (!$isPatch) {
            $defaultRules = FirewallRules::getDefaultRules();
            foreach ($defaultRules as $category => $categoryData) {
                if (!isset($rulesMap[$category]) && !isset($rulesData[$category])) {
                    // Create missing category with default action
                    foreach ($categoryData['rules'] as $ruleData) {
                        $firewallRule = new FirewallRules();
                        $firewallRule->networkfilterid = $networkFilterId;
                        $firewallRule->protocol = $ruleData['protocol'];
                        $firewallRule->portfrom = $ruleData['portfrom'];
                        $firewallRule->portto = $ruleData['portto'];
                        $firewallRule->category = $category;
                        $firewallRule->portFromKey = $ruleData['portFromKey'] ?? '';
                        $firewallRule->portToKey = $ruleData['portToKey'] ?? '';
                        $firewallRule->action = $categoryData['action'] ?? 'block';
                        $firewallRule->description = "$firewallRule->action connection for $category";

                        if (!$firewallRule->save()) {
                            return false;
                        }
                    }
                }
            }
        }

        return true;
    }

    /**
     * Sanitize currentRules data safely
     *
     * @param array<string, mixed> $rulesData Raw rules data
     * @return array<string, bool> Sanitized rules data (category => boolean)
     */
    private static function sanitizeCurrentRules(array $rulesData): array
    {
        $sanitizedRules = [];
        $validCategories = ['SIP', 'WEB', 'SSH', 'AMI', 'CTI', 'ICMP', 'WEBHTTPs', 'AJAM', 'RTP'];

        foreach ($rulesData as $category => $action) {
            // Validate category name
            if (!in_array($category, $validCategories, true)) {
                continue;
            }

            // Convert action to boolean
            if (is_bool($action)) {
                $sanitizedRules[$category] = $action;
            } elseif (is_string($action)) {
                $sanitizedRules[$category] = ($action === 'allow' || $action === 'true' || $action === '1');
            } elseif (is_numeric($action)) {
                $sanitizedRules[$category] = (bool)$action;
            }
        }

        return $sanitizedRules;
    }
}
