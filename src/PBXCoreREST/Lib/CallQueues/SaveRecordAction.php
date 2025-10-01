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
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for saving call queue record with comprehensive validation
 *
 * @api {post} /pbxcore/api/v2/call-queues/saveRecord Create call queue
 * @api {put} /pbxcore/api/v2/call-queues/saveRecord/:id Update call queue
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup CallQueues
 *
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} name Queue name
 * @apiParam {String} extension Extension number (2-8 digits)
 * @apiParam {String} [strategy] Call distribution strategy
 * @apiParam {Array} [members] Array of queue members
 * @apiParam {String} [timeout_extension] Timeout redirect extension
 * @apiParam {String} [periodic_announce_sound_id] Announcement sound ID
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved call queue data with representations
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save call queue record with comprehensive validation and proper logging
     *
     * @param array<string, mixed> $data Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        // Get sanitization rules automatically from OpenAPI schema
        // This eliminates duplication between schema and validation rules
        $sanitizationRules = DataStructure::getSanitizationRules();

        // Text fields for unified processing (no HTML decoding, just sanitization)
        $textFields = ['name', 'description', 'callerid_prefix'];

        try {
            // Unified data sanitization using new approach - no HTML entity decoding
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Sanitize routing destination fields
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

        // Sanitize members data
        if (isset($data['members'])) {
            // Decode JSON string if needed
            if (is_string($data['members'])) {
                $decoded = json_decode($data['members'], true);
                // Ensure decoded value is an array, fallback to empty array if not
                $members = is_array($decoded) ? $decoded : [];
            } elseif (is_array($data['members'])) {
                $members = $data['members'];
            } else {
                // If members is neither string nor array, use empty array
                $members = [];
            }
            $sanitizedData['members'] = self::sanitizeMembersData($members);
        }

        // Validate required fields using unified approach
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Queue name is required']
            ],
            'extension' => [
                ['type' => 'required', 'message' => 'Extension number is required'],
                ['type' => 'regex', 'pattern' => '/^[0-9]{2,8}$/', 'message' => 'Extension must be 2-8 digits']
            ]
        ];

        $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }

        // Get or create model
        // v3 API: 'id' field contains uniqid value
        $isNewRecord = empty($sanitizedData['id']);
        if (!$isNewRecord) {
            $queue = CallQueues::findFirst("uniqid='{$sanitizedData['id']}'");
            if (!$queue) {
                $res->messages['error'][] = 'Call queue not found';
                $res->httpCode = 404; // Not Found
                SystemMessages::sysLogMsg(__METHOD__,
                    "Queue not found for update: " . $sanitizedData['id'],
                    LOG_WARNING
                );
                return $res;
            }
        } else {
            $queue = new CallQueues();
            $queue->uniqid = CallQueues::generateUniqueID(Extensions::TYPE_QUEUE.'-');
        }

        // Check extension uniqueness using unified approach
        if (!self::checkExtensionUniqueness($sanitizedData['extension'], $queue->extension)) {
            $res->messages['error'][] = 'Extension number already exists';
            $res->httpCode = 409; // Conflict - proper RESTful code
            return $res;
        }

        try {
            // Save in transaction using unified approach
            $savedQueue = self::executeInTransaction(function() use ($queue, $sanitizedData) {
                // Update/create Extension using unified approach
                self::createOrUpdateExtension(
                    $sanitizedData['extension'],
                    $sanitizedData['name'],
                    Extensions::TYPE_QUEUE,
                    $queue->extension
                );

                // Get default values from schema for fallback
                $defaults = DataStructure::createFromSchema('detail');

                // Update CallQueue with unified data handling
                $queue->extension = $sanitizedData['extension'];
                $queue->name = $sanitizedData['name'];
                $queue->strategy = $sanitizedData['strategy'] ?? $defaults['strategy'];
                $queue->seconds_to_ring_each_member = $sanitizedData['seconds_to_ring_each_member'] ?? $defaults['seconds_to_ring_each_member'];
                $queue->seconds_for_wrapup = $sanitizedData['seconds_for_wrapup'] ?? $defaults['seconds_for_wrapup'];
                $queue->caller_hear = $sanitizedData['caller_hear'] ?? $defaults['caller_hear'];

                // Convert boolean values using unified approach
                $booleanFields = ['recive_calls_while_on_a_call', 'announce_position', 'announce_hold_time'];
                $convertedData = self::convertBooleanFields($sanitizedData, $booleanFields);

                $queue->recive_calls_while_on_a_call = $convertedData['recive_calls_while_on_a_call'] ?? ($defaults['recive_calls_while_on_a_call'] ? '1' : '0');
                $queue->announce_position = $convertedData['announce_position'] ?? ($defaults['announce_position'] ? '1' : '0');
                $queue->announce_hold_time = $convertedData['announce_hold_time'] ?? ($defaults['announce_hold_time'] ? '1' : '0');
                $queue->periodic_announce_sound_id = $sanitizedData['periodic_announce_sound_id'] ?? null;
                $queue->moh_sound_id = $sanitizedData['moh_sound_id'] ?? null;
                // Handle periodic_announce_frequency: convert empty to null for no parameter in config
                $queue->periodic_announce_frequency = $sanitizedData['periodic_announce_frequency'] ?? null;
                // Handle timeout_to_redirect_to_extension: treat 0 as empty (infinite wait)
                $timeout = $sanitizedData['timeout_to_redirect_to_extension'] ?? null;
                if ($timeout === 0 || $timeout === '0') {
                    $queue->timeout_to_redirect_to_extension = '';
                } else {
                    $queue->timeout_to_redirect_to_extension = $timeout ?? '';
                }
                $queue->timeout_extension = $sanitizedData['timeout_extension'] ?? null;
                $queue->redirect_to_extension_if_empty = $sanitizedData['redirect_to_extension_if_empty'] ?? null;
                $queue->number_unanswered_calls_to_redirect = $sanitizedData['number_unanswered_calls_to_redirect'] ?? 3;
                $queue->redirect_to_extension_if_unanswered = $sanitizedData['redirect_to_extension_if_unanswered'] ?? null;
                $queue->number_repeat_unanswered_to_redirect = $sanitizedData['number_repeat_unanswered_to_redirect'] ?? 3;
                $queue->redirect_to_extension_if_repeat_exceeded = $sanitizedData['redirect_to_extension_if_repeat_exceeded'] ?? null;
                $queue->callerid_prefix = $sanitizedData['callerid_prefix'] ?? null;
                $queue->description = $sanitizedData['description'] ?? null;

                if (!$queue->save()) {
                    throw new \Exception('Failed to save call queue: ' . implode(', ', $queue->getMessages()));
                }

                // Update queue members
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

            // Get updated members for response
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
            // Set proper HTTP status code: 201 for creation, 200 for update
            $res->httpCode = $isNewRecord ? 201 : 200;

            // Add reload path for page refresh after save
            $res->reload = "call-queues/modify/{$savedQueue->uniqid}";

            // Log successful operation using unified approach
            self::logSuccessfulSave('Call queue', $savedQueue->name, $savedQueue->extension, __METHOD__);

        } catch (\Exception $e) {
            // Handle save error using unified approach
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