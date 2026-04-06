<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\Common\SystemSanitizer;

/**
 * ✨ REFERENCE IMPLEMENTATION: Call Queue Save Action
 *
 * This is the canonical example of REST API save action following all best practices:
 * - Single Source of Truth pattern (DataStructure::getParameterDefinitions)
 * - Proper data processing pipeline (sanitize → defaults → validate → save)
 * - Schema-based validation (enum, min/max constraints)
 * - Clean separation of concerns
 *
 * Processing Pipeline:
 * 1. SANITIZE: Clean user input (remove dangerous chars, trim, normalize)
 * 2. VALIDATE REQUIRED: Check required fields and basic format
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE/PATCH
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!)
 * 5. VALIDATE SCHEMA: Check enum/range constraints on complete data
 * 6. SAVE: Transaction with extension + model + related records
 *
 * @api {post} /pbxcore/api/v3/call-queues Create call queue
 * @api {put} /pbxcore/api/v3/call-queues/:id Full update
 * @api {patch} /pbxcore/api/v3/call-queues/:id Partial update
 * @apiVersion 3.0.0
 * @apiName SaveCallQueue
 * @apiGroup CallQueues
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save call queue with comprehensive validation
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
        $textFields = ['name', 'description', 'callerid_prefix'];

        // ✨ Get ID from request body for validation (set by BaseRestController)
        // This is the ORIGINAL ID that user sent in POST/PUT/PATCH body, before it was
        // overwritten with URL path ID. Used to detect conflicting IDs.
        $idFromRequestBody = $data['_idFromRequestBody'] ?? null;

        // Preserve ID fields that may not be in sanitization rules
        $recordId = $data['id'] ?? null;
        $recordExtension = $data['extension'] ?? null;

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved fields (essential for UPDATE/PATCH operations)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }
            if ($recordExtension !== null) {
                $sanitizedData['extension'] = $recordExtension;
            }

            // Sanitize routing destinations (extensions, applications, etc.)
            $routingFields = [
                'timeout_extension',
                'redirect_to_extension_if_empty',
                'redirect_to_extension_if_unanswered',
                'redirect_to_extension_if_repeat_exceeded'
            ];
            $sanitizedData = self::sanitizeRoutingDestinations($sanitizedData, $routingFields, 20);

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // Sanitize members array (special handling for nested data)
        if (isset($data['members'])) {
            $members = is_string($data['members'])
                ? (json_decode($data['members'], true) ?: [])
                : (is_array($data['members']) ? $data['members'] : []);

            $sanitizedData['members'] = self::sanitizeMembersData($members);
        }

        // ============================================================
        // PHASE 2: REQUIRED FIELDS VALIDATION
        // Check required fields before database operations
        // ============================================================

        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Queue name is required']
            ]
        ];

        // Extension required ONLY for CREATE (not for PATCH)
        if (empty($sanitizedData['id'])) {
            $validationRules['extension'] = [
                ['type' => 'required', 'message' => 'Extension number is required'],
                ['type' => 'regex', 'pattern' => '/^[0-9]{2,8}$/', 'message' => 'Extension must be 2-8 digits']
            ];
        }

        $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }

        // ============================================================
        // PHASE 3: DETERMINE OPERATION TYPE
        // Detect CREATE vs UPDATE/PATCH and prepare model
        // ============================================================

        $queue = null;
        $isNewRecord = true;
        $httpMethod = $data['httpMethod'] ?? 'POST';

        if (!empty($sanitizedData['id'])) {
            // Try to find existing record
            $queue = CallQueues::findFirst([
                'conditions' => 'uniqid = :uniqid:',
                'bind' => ['uniqid' => $sanitizedData['id']]
            ]);

            if ($queue) {
                // Record exists - UPDATE or PATCH operation
                $isNewRecord = false;
            } else {
                // Record NOT found with provided ID
                // Check if PUT/PATCH should fail with 404
                // WHY: PUT/PATCH require existing resource, only POST can create
                $error = self::validateRecordExistence($httpMethod, 'Call queue');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // POST with custom ID allowed for migrations/imports
            }
        }

        if ($isNewRecord) {
            // CREATE: Initialize new queue
            $queue = new CallQueues();
            $queue->uniqid = !empty($sanitizedData['id'])
                ? $sanitizedData['id']  // Use provided ID (migrations/imports)
                : CallQueues::generateUniqueID(Extensions::PREFIX_QUEUE);
        } else {
            // ✨ UPDATE/PATCH: Validate that 'id' in request body (if provided) matches URL path
            // WHY: Prevent accidental ID changes and data corruption
            // REST API best practice: ID should only be in URL path, not in request body
            if ($idFromRequestBody !== null && $idFromRequestBody !== $queue->uniqid) {
                $res->messages['error'][] = "Cannot change ID of existing record. ID in request body ('{$idFromRequestBody}') doesn't match existing ID ('{$queue->uniqid}')";
                $res->httpCode = 400; // Bad Request
                return $res;
            }

            // Remove 'id' from sanitizedData to prevent accidental updates
            // ID should come from URL path, not request body
            unset($sanitizedData['id']);
        }

        // For PATCH/UPDATE: preserve existing extension if not provided
        if (!$isNewRecord && empty($sanitizedData['extension'])) {
            $sanitizedData['extension'] = $queue->extension;
        }

        // Check extension uniqueness (skip if unchanged)
        if (!empty($sanitizedData['extension']) &&
            !self::checkExtensionUniqueness($sanitizedData['extension'], $queue->extension)) {
            $res->messages['error'][] = 'Extension number already exists';
            $res->httpCode = 409; // Conflict
            return $res;
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // Add missing field defaults from schema
        // WHY: CREATE needs all fields, UPDATE/PATCH only touches provided fields
        // ============================================================

        if ($isNewRecord) {
            // ✅ CREATE: Apply defaults for missing fields
            // Example: strategy=ringall, seconds_to_ring_each_member=15, etc.
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);
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
        // Transaction ensures atomicity (extension + queue + members)
        // ============================================================

        try {
            $savedQueue = self::executeInTransaction(function() use ($queue, $sanitizedData, $isNewRecord) {
                // Create/update Extension record
                self::createOrUpdateExtension(
                    $sanitizedData['extension'],
                    $sanitizedData['name'],
                    Extensions::TYPE_QUEUE,
                    $queue->extension
                );

                // Update CallQueue model
                // For CREATE: All fields from $sanitizedData (with defaults)
                // For PATCH: Only provided fields (no defaults)
                $queue->extension = $sanitizedData['extension'];
                $queue->name = $sanitizedData['name'];

                // Strategy field (validated against enum)
                if (isset($sanitizedData['strategy'])) {
                    $queue->strategy = $sanitizedData['strategy'];
                }

                // Numeric fields (validated against min/max)
                if (isset($sanitizedData['seconds_to_ring_each_member'])) {
                    $queue->seconds_to_ring_each_member = $sanitizedData['seconds_to_ring_each_member'];
                }
                if (isset($sanitizedData['seconds_for_wrapup'])) {
                    $queue->seconds_for_wrapup = $sanitizedData['seconds_for_wrapup'];
                }

                // Enum field (validated)
                if (isset($sanitizedData['caller_hear'])) {
                    $queue->caller_hear = $sanitizedData['caller_hear'];
                }

                // Boolean fields (convert string/int to boolean)
                $booleanFields = ['recive_calls_while_on_a_call', 'announce_position', 'announce_hold_time'];
                $convertedData = self::convertBooleanFields($sanitizedData, $booleanFields);

                if (isset($convertedData['recive_calls_while_on_a_call'])) {
                    $queue->recive_calls_while_on_a_call = $convertedData['recive_calls_while_on_a_call'];
                }
                if (isset($convertedData['announce_position'])) {
                    $queue->announce_position = $convertedData['announce_position'];
                }
                if (isset($convertedData['announce_hold_time'])) {
                    $queue->announce_hold_time = $convertedData['announce_hold_time'];
                }

                // Sound file IDs (empty string → null for optional fields)
                $queue->periodic_announce_sound_id = !empty($sanitizedData['periodic_announce_sound_id'])
                    ? $sanitizedData['periodic_announce_sound_id']
                    : null;
                $queue->moh_sound_id = !empty($sanitizedData['moh_sound_id'])
                    ? $sanitizedData['moh_sound_id']
                    : null;

                // Frequency (empty → null, means disabled)
                if (isset($sanitizedData['periodic_announce_frequency'])) {
                    $queue->periodic_announce_frequency = !empty($sanitizedData['periodic_announce_frequency'])
                        ? $sanitizedData['periodic_announce_frequency']
                        : null;
                }

                // Timeout (0 means infinite wait → empty string)
                if (isset($sanitizedData['timeout_to_redirect_to_extension'])) {
                    $timeout = $sanitizedData['timeout_to_redirect_to_extension'];
                    $queue->timeout_to_redirect_to_extension = ($timeout === 0 || $timeout === '0') ? '' : $timeout;
                }

                // Optional extension fields
                if (isset($sanitizedData['timeout_extension'])) {
                    $queue->timeout_extension = $sanitizedData['timeout_extension'] ?: null;
                }
                if (isset($sanitizedData['redirect_to_extension_if_empty'])) {
                    $queue->redirect_to_extension_if_empty = $sanitizedData['redirect_to_extension_if_empty'] ?: null;
                }
                if (isset($sanitizedData['redirect_to_extension_if_unanswered'])) {
                    $queue->redirect_to_extension_if_unanswered = $sanitizedData['redirect_to_extension_if_unanswered'] ?: null;
                }
                if (isset($sanitizedData['redirect_to_extension_if_repeat_exceeded'])) {
                    $queue->redirect_to_extension_if_repeat_exceeded = $sanitizedData['redirect_to_extension_if_repeat_exceeded'] ?: null;
                }

                // Numeric counters
                if (isset($sanitizedData['number_unanswered_calls_to_redirect'])) {
                    $queue->number_unanswered_calls_to_redirect = $sanitizedData['number_unanswered_calls_to_redirect'];
                }
                if (isset($sanitizedData['number_repeat_unanswered_to_redirect'])) {
                    $queue->number_repeat_unanswered_to_redirect = $sanitizedData['number_repeat_unanswered_to_redirect'];
                }

                // Text fields
                if (isset($sanitizedData['callerid_prefix'])) {
                    $queue->callerid_prefix = $sanitizedData['callerid_prefix'] ?: null;
                }
                if (isset($sanitizedData['description'])) {
                    $queue->description = $sanitizedData['description'] ?: null;
                }

                if (!$queue->save()) {
                    throw new \Exception('Failed to save call queue: ' . implode(', ', $queue->getMessages()));
                }

                // Update queue members (replace all)
                if (isset($sanitizedData['members']) && is_array($sanitizedData['members'])) {
                    // Delete existing members
                    CallQueueMembers::find([
                        'conditions' => 'queue = :queue:',
                        'bind' => ['queue' => $queue->uniqid]
                    ])->delete();

                    // Add new members
                    foreach ($sanitizedData['members'] as $memberData) {
                        if (!empty($memberData['extension'])) {
                            $member = new CallQueueMembers();
                            $member->queue = $queue->uniqid;
                            $member->extension = $memberData['extension'];
                            $member->priority = $memberData['priority'] ?? 0;

                            if (!$member->save()) {
                                throw new \Exception('Failed to save queue member: ' . implode(', ', $member->getMessages()));
                            }
                        }
                    }
                }

                return $queue;
            });

            // ============================================================
            // PHASE 7: BUILD RESPONSE
            // Format data using DataStructure (representations, types, etc.)
            // ============================================================

            // Load members for response
            /** @var \Phalcon\Mvc\Model\Resultset\Simple $members */
            $members = CallQueueMembers::find([
                'conditions' => 'queue = :queue:',
                'bind' => ['queue' => $savedQueue->uniqid],
                'order' => 'priority ASC'
            ]);

            $membersArray = [];
            /** @var CallQueueMembers $member */
            foreach ($members as $member) {
                $memberExt = Extensions::findFirstByNumber($member->extension);
                $membersArray[] = [
                    'id' => (string)$member->id,
                    'extension' => $member->extension,
                    'priority' => (int)$member->priority,
                    'represent' => $memberExt ? $memberExt->getRepresent() : 'ERROR'
                ];
            }

            $res->data = DataStructure::createFromModel($savedQueue, $membersArray);
            $res->success = true;
            $res->httpCode = $isNewRecord ? 201 : 200; // 201 Created, 200 OK
            $res->reload = "call-queues/modify/{$savedQueue->uniqid}";

            self::logSuccessfulSave('Call queue', $savedQueue->name, $savedQueue->extension, __METHOD__);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Sanitize members data array
     *
     * @param array<int, array<string, mixed>> $members Raw members data
     * @return array<int, array<string, mixed>> Sanitized members data
     */
    private static function sanitizeMembersData(array $members): array
    {
        $sanitizedMembers = [];
        foreach ($members as $member) {
            if (!empty($member['extension'])) {
                $extension = SystemSanitizer::sanitizeExtension($member['extension']);
                if (SystemSanitizer::isValidExtension($extension)) {
                    $sanitizedMembers[] = [
                        'extension' => $extension,
                        'priority' => max(0, min(10, (int)($member['priority'] ?? 0)))
                    ];
                }
            }
        }
        return $sanitizedMembers;
    }
}
