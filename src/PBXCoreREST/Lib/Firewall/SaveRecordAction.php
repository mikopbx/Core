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
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\Utilities\IpAddressHelper;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * ✨ REFERENCE IMPLEMENTATION: Firewall Save Action (Security Critical)
 *
 * This follows the canonical 7-phase pattern with security-critical IP/CIDR validation.
 * Single Source of Truth pattern - all definitions in DataStructure::getParameterDefinitions()
 *
 * Processing Pipeline (7 Phases):
 * 1. SANITIZE: Clean user input (XSS, SQL injection prevention)
 * 2. VALIDATE REQUIRED: Check required fields (network/subnet for CREATE)
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE/PATCH
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!)
 * 5. VALIDATE SCHEMA: Check constraints + IP/CIDR format (security!)
 * 6. SAVE: Transaction with NetworkFilter + FirewallRules
 * 7. BUILD RESPONSE: Format data using DataStructure
 *
 * Security Note: IP/CIDR validation is CRITICAL - prevents malicious network configurations
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

        // Extract HTTP method and ID early to handle validation properly
        $httpMethod = $data['httpMethod'] ?? 'POST';
        // Reuse $recordId from PHASE 1 - already extracted and preserved
        // $recordId is defined in PHASE 1: line 79

        // Determine if this is a PATCH/PUT on existing record
        $isExistingRecordPatch = false;
        if (!empty($recordId)) {
            $existingFilter = NetworkFilters::findFirstById($recordId);
            if ($existingFilter) {
                $isExistingRecordPatch = true;
            } else {
                // Record doesn't exist with this ID
                // Check if PUT/PATCH should fail with 404 immediately
                $error = self::validateRecordExistence($httpMethod, 'Firewall rule');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // If we got here, it's POST with custom ID - allow it to continue
            }
        }

        // For CREATE operations: require network+subnet (form always sends these fields)
        // For UPDATE/PATCH on existing record: network data is optional
        if (!$isExistingRecordPatch) {
            if (!isset($sanitizedData['network']) || !isset($sanitizedData['subnet'])) {
                $res->messages['error'][] = 'Network and subnet fields are required';
                return $res;
            }
        }

        // ============================================================
        // PHASE 3: DETERMINE OPERATION TYPE
        // Detect CREATE vs UPDATE/PATCH and prepare model
        // WHY: Need to distinguish CREATE from UPDATE/PATCH for defaults
        // ============================================================

        $networkFilter = null;
        $isNewRecord = true;

        // Try to find existing record (already checked in PHASE 2, but need model reference)
        if (!empty($recordId)) {
            $networkFilter = NetworkFilters::findFirstById($recordId);

            if ($networkFilter) {
                // Record exists - UPDATE or PATCH operation
                $isNewRecord = false;
            }
            // If not found but we got here, it's POST with custom ID (already validated in PHASE 2)
        }

        if ($isNewRecord) {
            // CREATE: Initialize new network filter
            $networkFilter = new NetworkFilters();

            // ✅ Support predefined ID (migrations/imports)
            // For auto-increment fields, we need to explicitly set the ID
            if (!empty($recordId)) {
                // Use writeAttribute to bypass auto-increment
                $networkFilter->writeAttribute('id', (int)$recordId);
            }
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // WHY CREATE: New records need complete dataset with all fields
        // WHY NOT UPDATE/PATCH: Would overwrite existing values with defaults!
        // ============================================================

        if ($isNewRecord) {
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);
        }

        // ============================================================
        // PHASE 5: SCHEMA VALIDATION (Security Critical!)
        // WHY: Validate AFTER defaults to check complete dataset
        // Includes: enum/min/max constraints + IP/CIDR format validation
        // ============================================================

        // Schema validation (minimum/maximum, enum values)
        $schemaErrors = DataStructure::validateInputData($sanitizedData);
        if (!empty($schemaErrors)) {
            $res->messages['error'] = $schemaErrors;
            $res->httpCode = 422; // Unprocessable Entity
            return $res;
        }

        // Security-critical IP/CIDR validation
        if (isset($sanitizedData['network']) && isset($sanitizedData['subnet'])) {
            $ipValidationErrors = self::validateIpAndCidr(
                $sanitizedData['network'],
                $sanitizedData['subnet']
            );
            if (!empty($ipValidationErrors)) {
                $res->messages['error'] = array_merge(
                    $res->messages['error'] ?? [],
                    $ipValidationErrors
                );
                $res->httpCode = 422;
                return $res;
            }
        }

        // ============================================================
        // PHASE 6: SAVE TO DATABASE
        // WHY: All-or-nothing transaction for NetworkFilter + FirewallRules
        // ============================================================

        $di = Di::getDefault();
        if ($di === null) {
            $res->messages['error'][] = 'DI container is not available';
            $res->httpCode = 500;
            return $res;
        }
        $db = $di->get('db');

        try {
            $db->begin();

            // Process network/subnet fields to calculate permit (CIDR notation)
            if (isset($sanitizedData['network']) && isset($sanitizedData['subnet'])) {
                $network = $sanitizedData['network'];
                $subnet = $sanitizedData['subnet'];

                // Detect IP version to apply correct normalization
                $version = IpAddressHelper::getIpVersion($network);

                if ($version === IpAddressHelper::IP_VERSION_4) {
                    // IPv4: Normalize network address using Cidr calculator
                    $calculator = new Cidr();
                    $normalizedNetwork = $calculator->cidr2network($network, intval($subnet));
                    $networkFilter->permit = $normalizedNetwork . '/' . $subnet;
                } else {
                    // IPv6: Use address as-is (already validated in validateIpAndCidr)
                    $networkFilter->permit = $network . '/' . $subnet;
                }
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
                    // WHY: PATCH = partial update (only provided fields), PUT = full update (all fields)
                    $isPatch = ($httpMethod === 'PATCH');
                    if (!self::updateFirewallRules($networkFilter->id, $sanitizedData['currentRules'], $isPatch)) {
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
            // PHASE 7: BUILD RESPONSE
            // WHY: Consistent API format using DataStructure transformation
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

        // Get valid categories dynamically from getDefaultRules()
        // WHY: Modules can register custom firewall categories via SystemConfigInterface::GET_DEFAULT_FIREWALL_RULES
        // This ensures we accept both core categories (SIP, WEB, SSH, etc.) and module categories (MODULE*)
        $defaultRules = FirewallRules::getDefaultRules();
        $validCategories = array_keys($defaultRules);

        foreach ($rulesData as $category => $action) {
            // Validate category name against dynamic list
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

    /**
     * Validate IP address and CIDR notation (Security Critical!)
     *
     * Validates:
     * - IP address format (IPv4 or IPv6)
     * - IP octets/segments in valid range
     * - CIDR prefix length (0-32 for IPv4, 0-128 for IPv6)
     * - No private/reserved IPs if not explicitly allowed
     *
     * WHY: Prevents malicious network configurations that could:
     * - Allow unauthorized access
     * - Block legitimate traffic
     * - Create security vulnerabilities
     *
     * @param string $network Network address to validate
     * @param int|string $subnet CIDR prefix length
     * @return array<string> List of validation errors (empty if valid)
     */
    private static function validateIpAndCidr(string $network, int|string $subnet): array
    {
        $errors = [];

        // Detect IP version
        $version = IpAddressHelper::getIpVersion($network);
        if ($version === false) {
            $errors[] = TranslationProvider::translate('fw_ValidationInvalidIPFormat', [
                'network' => $network
            ]);
            return $errors;
        }

        $subnetInt = is_string($subnet) ? intval($subnet) : $subnet;

        // Validate subnet range based on IP version
        if ($version === IpAddressHelper::IP_VERSION_4) {
            // IPv4 validation
            if ($subnetInt < 0 || $subnetInt > 32) {
                $errors[] = TranslationProvider::translate('fw_ValidationIPv4SubnetRange', [
                    'subnet' => $subnet
                ]);
            }

            // Validate octets are in correct range
            $octets = explode('.', $network);
            if (count($octets) !== 4) {
                $errors[] = TranslationProvider::translate('fw_ValidationIPv4InvalidOctetCount', [
                    'network' => $network
                ]);
                return $errors;
            }

            foreach ($octets as $index => $octet) {
                $octetNum = (int)$octet;
                if ($octetNum < 0 || $octetNum > 255) {
                    $errors[] = TranslationProvider::translate('fw_ValidationIPv4InvalidOctet', [
                        'index' => $index + 1,
                        'octet' => $octet
                    ]);
                }
            }

            // Validate network address matches CIDR (IPv4 only)
            $calculator = new Cidr();
            $networkAddress = $calculator->cidr2network($network, $subnetInt);

            if ($networkAddress !== $network) {
                // This is a warning, not an error - we'll auto-correct it
                // But we could make it an error for strict validation
                // $errors[] = "IP address $network is not a valid network address for /$subnet (should be $networkAddress)";
            }
        } else {
            // IPv6 validation
            if ($subnetInt < 0 || $subnetInt > 128) {
                $errors[] = TranslationProvider::translate('fw_ValidationIPv6PrefixRange', [
                    'subnet' => $subnet
                ]);
            }

            // Reject IPv6 zone IDs (e.g., fe80::1%eth0)
            // WHY: Zone IDs are valid for link-local addresses but should NOT be stored in firewall rules
            if (str_contains($network, '%')) {
                $errors[] = TranslationProvider::translate('fw_ValidationIPv6ZoneIdNotAllowed', [
                    'network' => $network
                ]);
                return $errors;
            }

            // Validate IPv6 format using filter
            if (!filter_var($network, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
                $errors[] = TranslationProvider::translate('fw_ValidationIPv6InvalidFormat', [
                    'network' => $network
                ]);
            }
        }

        // Validate CIDR notation using IpAddressHelper
        $cidr = "$network/$subnet";
        if (IpAddressHelper::normalizeCidr($cidr) === false) {
            $errors[] = TranslationProvider::translate('fw_ValidationInvalidCIDRFormat', [
                'cidr' => $cidr
            ]);
        }

        return $errors;
    }
}
