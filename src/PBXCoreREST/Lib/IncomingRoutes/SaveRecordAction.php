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

namespace MikoPBX\PBXCoreREST\Lib\IncomingRoutes;

use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\OutWorkTimesRouts;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;

/**
 * ✨ REFERENCE IMPLEMENTATION: Incoming Route Save Action
 *
 * This follows the canonical pattern established by CallQueues and IvrMenu.
 * Single Source of Truth pattern - all definitions in DataStructure::getParameterDefinitions()
 *
 * Processing Pipeline (7 Phases):
 * 1. SANITIZE: Clean user input (XSS, SQL injection prevention)
 * 2. VALIDATE REQUIRED: Check required fields and basic format
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE/PATCH
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!)
 * 5. VALIDATE SCHEMA: Check enum/range constraints on complete data
 * 6. SAVE: Transaction with model + related records (OutWorkTimesRouts)
 * 7. BUILD RESPONSE: Format data using DataStructure
 *
 * @api {post} /pbxcore/api/v3/incoming-routes Create incoming route
 * @api {put} /pbxcore/api/v3/incoming-routes/:id Full update
 * @api {patch} /pbxcore/api/v3/incoming-routes/:id Partial update
 * @apiVersion 3.0.0
 * @apiName SaveIncomingRoute
 * @apiGroup IncomingRoutes
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save incoming route with comprehensive validation
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
        // WHY: Security first - never trust user input
        // ============================================================

        $sanitizationRules = DataStructure::getSanitizationRules();
        $textFields = ['note'];

        // Preserve ID field (not in sanitization rules, uses auto-increment)
        $recordId = $data['id'] ?? null;

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved ID field (essential for UPDATE/PATCH operations)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }

            // API field mapping: providerid (API) → provider (database)
            // WHY: Frontend uses 'providerid' for consistency, DB uses 'provider'
            if (isset($sanitizedData['providerid'])) {
                if (empty($sanitizedData['providerid']) || $sanitizedData['providerid'] === 'none') {
                    $sanitizedData['provider'] = null;  // "Any Provider" route
                } else {
                    $sanitizedData['provider'] = $sanitizedData['providerid'];
                }
                unset($sanitizedData['providerid']);  // Remove API field name
            } else {
                $sanitizedData['provider'] = null;  // Default to "Any Provider"
            }

            // Handle 'none' value for audio_message_id
            if (isset($sanitizedData['audio_message_id']) && $sanitizedData['audio_message_id'] === 'none') {
                $sanitizedData['audio_message_id'] = null;
            }

            // Sanitize routing destination (extension field)
            $sanitizedData = self::sanitizeRoutingDestinations($sanitizedData, ['extension'], 20);

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // ============================================================
        // PHASE 2: REQUIRED FIELDS VALIDATION
        // Check required fields before database operations
        // WHY: Fail fast - don't waste resources on incomplete data
        // ============================================================

        // Note: No required fields for incoming routes
        // - rulename is optional (auto-generated from rule_represent)
        // - number is optional (empty = "any number")
        // - extension is optional (empty = default action)
        // This allows maximum flexibility for routing rules

        // ============================================================
        // PHASE 3: DETERMINE OPERATION TYPE
        // Detect CREATE vs UPDATE/PATCH and prepare model
        // WHY: Different logic for new vs existing records
        // ============================================================

        $route = null;
        $isNewRecord = true;
        $httpMethod = $data['httpMethod'] ?? 'POST';

        if (!empty($sanitizedData['id'])) {
            // Try to find existing record by auto-increment ID
            $route = IncomingRoutingTable::findFirstById($sanitizedData['id']);

            if ($route) {
                // Record exists - UPDATE or PATCH operation
                $isNewRecord = false;
            } else {
                // ID provided but record not found - check if PUT/PATCH should fail
                $error = self::validateRecordExistence($httpMethod, 'Incoming route');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // POST with custom ID allowed for migrations
            }
        }

        if ($isNewRecord) {
            // CREATE: Initialize new incoming route
            $route = new IncomingRoutingTable();
            // Note: IncomingRoutingTable uses auto-increment ID, not uniqid
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // Add missing field defaults from schema
        // WHY CREATE: New records need complete data with sensible defaults
        // WHY NOT UPDATE/PATCH: Would overwrite existing values!
        // ============================================================

        if ($isNewRecord) {
            // ✅ CREATE: Apply defaults for missing fields
            // Examples: timeout=18, priority=1
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);

            // Special logic: Auto-assign priority if still empty
            // WHY: Priority must be unique and sequential (excluding 9999)
            if (empty($sanitizedData['priority']) || $sanitizedData['priority'] === 1) {
                $params = [
                    'column' => 'priority',
                    'conditions' => 'priority != 9999',
                ];
                $maxPriority = IncomingRoutingTable::maximum($params);
                $sanitizedData['priority'] = ($maxPriority ?: 0) + 1;
            }
        }
        // ❌ UPDATE/PATCH: Do NOT apply defaults (would overwrite existing values!)

        // ============================================================
        // PHASE 5: SCHEMA VALIDATION
        // Validate enum, min/max constraints on complete data
        // WHY: Validate AFTER defaults to check complete dataset
        // ============================================================

        $schemaErrors = DataStructure::validateInputData($sanitizedData);
        if (!empty($schemaErrors)) {
            $res->messages['error'] = $schemaErrors;
            $res->httpCode = 422; // Unprocessable Entity
            return $res;
        }

        // ============================================================
        // PHASE 6: SAVE TO DATABASE
        // Transaction ensures atomicity (route + time-based routing)
        // WHY: All-or-nothing - either complete save or complete rollback
        // ============================================================

        try {
            $savedRoute = self::executeInTransaction(function() use ($route, $sanitizedData, $isNewRecord) {

                // Update IncomingRoutingTable model
                // For CREATE: All fields from $sanitizedData (with defaults)
                // For PATCH: Only provided fields (no defaults)

                // Optional fields (use isset to support PATCH)
                if (isset($sanitizedData['rulename'])) {
                    $route->rulename = $sanitizedData['rulename'];
                }
                if (isset($sanitizedData['number'])) {
                    $route->number = $sanitizedData['number'] ?: '';  // Empty string allowed
                }

                // WHY: Use array_key_exists instead of isset because provider can be null
                // isset($sanitizedData['provider']) returns false when value is null!
                if (array_key_exists('provider', $sanitizedData)) {
                    $route->provider = $sanitizedData['provider'];  // null allowed for "Any Provider"
                }

                if (isset($sanitizedData['priority'])) {
                    $route->priority = $sanitizedData['priority'];
                }

                if (isset($sanitizedData['timeout'])) {
                    $route->timeout = $sanitizedData['timeout'];
                }

                if (isset($sanitizedData['extension'])) {
                    $route->extension = $sanitizedData['extension'] ?: '';
                }

                if (isset($sanitizedData['audio_message_id'])) {
                    $route->audio_message_id = $sanitizedData['audio_message_id'];  // null allowed
                }

                if (isset($sanitizedData['note'])) {
                    $route->note = $sanitizedData['note'] ?: '';
                }

                if (!$route->save()) {
                    throw new \Exception('Failed to save incoming route: ' . implode(', ', $route->getMessages()));
                }

                // Handle time-based routing (OutWorkTimesRouts association)
                // WHY: Routes can be linked to time conditions for complex routing
                self::updateTimeBasedRouting($route);

                return $route;
            });

            // ============================================================
            // PHASE 7: BUILD RESPONSE
            // Format data using DataStructure (representations, types, etc.)
            // WHY: Consistent API response format with all computed fields
            // ============================================================

            $res->data = DataStructure::createFromModel($savedRoute);
            $res->success = true;
            $res->httpCode = $isNewRecord ? 201 : 200; // 201 Created, 200 OK

            // Set reload path for frontend navigation
            // WHY: Frontend needs to know where to redirect after save
            $res->reload = "incoming-routes/modify/{$savedRoute->id}";

            self::logSuccessfulSave('Incoming route', $savedRoute->rulename, $savedRoute->number, __METHOD__);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Update time-based routing associations
     *
     * Links incoming routes to time conditions (OutWorkTimesRouts).
     * WHY: Allows routing rules to change based on time of day/week.
     *
     * @param IncomingRoutingTable $route Saved route record
     * @return void
     */
    private static function updateTimeBasedRouting(IncomingRoutingTable $route): void
    {
        // Find all time conditions that should be linked to this route
        $timeConditionIds = self::findTimeConditionIds($route);

        foreach ($timeConditionIds as $conditionId) {
            self::createOrUpdateTimeRouting($route->id, $conditionId);
        }
    }

    /**
     * Find time condition IDs for the given route
     *
     * Searches for existing time-based routes with same number and provider.
     * WHY: Preserve time-based routing when updating routes.
     *
     * @param IncomingRoutingTable $route Route record
     * @return array<int> Array of time condition IDs
     */
    private static function findTimeConditionIds(IncomingRoutingTable $route): array
    {
        $di = \Phalcon\Di\Di::getDefault();
        $manager = $di->get('modelsManager');

        // Handle NULL provider (any provider)
        $providerCondition = $route->provider === null ?
            'provider IS NULL' :
            'provider = :provider:';

        $queryOptions = [
            'models' => ['IncomingRoutingTable' => IncomingRoutingTable::class],
            'columns' => ['timeConditionId' => 'OutWorkTimesRouts.timeConditionId'],
            'conditions' => "number = :did: AND {$providerCondition}",
            'bind' => array_filter([
                'did' => $route->number,
                'provider' => $route->provider,
            ]),
            'joins' => [
                'OutWorkTimesRouts' => [
                    OutWorkTimesRouts::class,
                    'IncomingRoutingTable.id = OutWorkTimesRouts.routId',
                    'OutWorkTimesRouts',
                    'INNER',
                ],
            ],
            'group' => ['timeConditionId']
        ];

        $query = $manager->createBuilder($queryOptions)->getQuery();
        $results = $query->execute()->toArray();

        return array_column($results, 'timeConditionId');
    }

    /**
     * Create or update time routing record
     *
     * Links route to time condition if not already linked.
     * WHY: Idempotent - safe to call multiple times.
     *
     * @param int $routeId Route ID
     * @param int $conditionId Time condition ID
     * @return void
     */
    private static function createOrUpdateTimeRouting(int $routeId, int $conditionId): void
    {
        $existingRecord = OutWorkTimesRouts::findFirst([
            'conditions' => 'timeConditionId = :timeConditionId: AND routId = :routId:',
            'bind' => [
                'timeConditionId' => $conditionId,
                'routId' => $routeId,
            ],
        ]);

        // Only create if not exists (idempotent)
        if ($existingRecord === null) {
            $newRecord = new OutWorkTimesRouts();
            $newRecord->routId = $routeId;
            $newRecord->timeConditionId = $conditionId;
            $newRecord->save();
        }
    }
}
