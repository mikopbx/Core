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

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Models\Providers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;

/**
 * ✨ REFERENCE IMPLEMENTATION: Outbound Route Save Action
 *
 * This follows the canonical pattern established by CallQueues, IvrMenu, and IncomingRoutes.
 * Single Source of Truth pattern - all definitions in DataStructure::getParameterDefinitions()
 *
 * Processing Pipeline (7 Phases):
 * 1. SANITIZE: Clean user input (XSS, SQL injection prevention)
 * 2. VALIDATE REQUIRED: Check required fields (rulename, providerid)
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE/PATCH
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!)
 * 5. VALIDATE SCHEMA: Check enum/range constraints on complete data
 * 6. SAVE: Transaction with model
 * 7. BUILD RESPONSE: Format data using DataStructure
 *
 * @api {post} /pbxcore/api/v3/outbound-routes Create outbound route
 * @api {put} /pbxcore/api/v3/outbound-routes/:id Full update
 * @api {patch} /pbxcore/api/v3/outbound-routes/:id Partial update
 * @apiVersion 3.0.0
 * @apiName SaveOutboundRoute
 * @apiGroup OutboundRoutes
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save outbound route with comprehensive validation
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
        $textFields = ['rulename', 'note'];

        // Preserve ID field (not in sanitization rules, uses auto-increment)
        $recordId = $data['id'] ?? null;

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved ID field (essential for UPDATE/PATCH operations)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // ============================================================
        // PHASE 2: DETERMINE OPERATION TYPE (moved before validation)
        // Detect CREATE vs UPDATE/PATCH and prepare model
        // WHY: Different validation rules for new vs existing records
        // ============================================================

        $route = null;
        $isNewRecord = true;
        $recordId = $sanitizedData['id'] ?? null;
        $httpMethod = $data['httpMethod'] ?? 'POST';

        if (!empty($recordId)) {
            // Try to find existing record by auto-increment ID
            $route = OutgoingRoutingTable::findFirstById($recordId);

            if ($route) {
                // Record exists - UPDATE or PATCH operation
                $isNewRecord = false;
            } else {
                // Check if PUT/PATCH should fail with 404
                $error = self::validateRecordExistence($httpMethod, 'Outbound route');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // POST with custom ID allowed for migrations
            }
        }

        if ($isNewRecord) {
            // CREATE: Initialize new outbound route
            $route = new OutgoingRoutingTable();
            // Note: OutgoingRoutingTable uses auto-increment ID, not uniqid
        }

        // ============================================================
        // PHASE 3: REQUIRED FIELDS VALIDATION
        // Check required fields before database operations
        // WHY: Fail fast - don't waste resources on incomplete data
        // ============================================================

        // Required fields only for CREATE
        // For PATCH (partial update), required fields can be omitted
        if ($isNewRecord || $httpMethod === 'PUT') {
            $validationRules = [
                'rulename' => [
                    ['type' => 'required', 'message' => 'Route name is required']
                ],
                'providerid' => [
                    ['type' => 'required', 'message' => 'Provider is required']
                ]
            ];

            // Note: Unlike IncomingRoutes, providerid is ALWAYS required for OutboundRoutes
            // WHY: Outbound routes must know which provider to use for dialing

            $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
            if (!empty($validationErrors)) {
                $res->messages['error'] = $validationErrors;
                return $res;
            }
        }

        // Validate provider exists in database if provided
        // WHY: Prevent saving routes with non-existent providers
        if (isset($sanitizedData['providerid'])) {
            $provider = Providers::findFirstByUniqid($sanitizedData['providerid']);
            if (!$provider) {
                $res->messages['error'][] = 'Provider not found';
                $res->httpCode = 404;
                return $res;
            }
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // Add missing field defaults from schema
        // WHY CREATE: New records need complete data with sensible defaults
        // WHY NOT UPDATE/PATCH: Would overwrite existing values!
        // ============================================================

        if ($isNewRecord) {
            // ✅ CREATE: Apply defaults for missing fields
            // Examples: restnumbers=-1, trimfrombegin=0, priority=0
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);

            // Special logic: Auto-assign priority if still empty or default
            // WHY: Priority should be unique and sequential
            if (empty($sanitizedData['priority']) || $sanitizedData['priority'] === 0) {
                $maxPriority = OutgoingRoutingTable::maximum(['column' => 'priority']);
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
        // Transaction ensures atomicity
        // WHY: All-or-nothing - either complete save or complete rollback
        // ============================================================

        try {
            $savedRoute = self::executeInTransaction(function() use ($route, $sanitizedData, $isNewRecord) {

                // Update OutgoingRoutingTable model
                // For CREATE: All fields from $sanitizedData (with defaults)
                // For PATCH: Only provided fields (no defaults)

                // Required fields (always set)
                $route->rulename = $sanitizedData['rulename'];
                $route->providerid = $sanitizedData['providerid'];

                // Optional fields (use isset to support PATCH)
                if (isset($sanitizedData['priority'])) {
                    // Store as string (database field type)
                    $route->priority = (string)$sanitizedData['priority'];
                }

                if (isset($sanitizedData['numberbeginswith'])) {
                    $route->numberbeginswith = $sanitizedData['numberbeginswith'] ?: '';
                }

                if (isset($sanitizedData['restnumbers'])) {
                    // Store as string (database field type)
                    // -1 means "any number of digits"
                    $route->restnumbers = (string)$sanitizedData['restnumbers'];
                }

                if (isset($sanitizedData['trimfrombegin'])) {
                    // Store as string (database field type)
                    $route->trimfrombegin = (string)$sanitizedData['trimfrombegin'];
                }

                if (isset($sanitizedData['prepend'])) {
                    $route->prepend = $sanitizedData['prepend'] ?: '';
                }

                if (isset($sanitizedData['note'])) {
                    $route->note = $sanitizedData['note'] ?: '';
                }

                if (!$route->save()) {
                    throw new \Exception('Failed to save outbound route: ' . implode(', ', $route->getMessages()));
                }

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
            $res->reload = "outbound-routes/modify/{$savedRoute->id}";

            self::logSuccessfulSave('Outbound route', $savedRoute->rulename, $savedRoute->numberbeginswith, __METHOD__);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}
