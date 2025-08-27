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
     * @param array $data Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        // Define sanitization rules - no HTML escaping as it's handled at output level
        $sanitizationRules = [
            'id' => 'int',
            'name' => 'string|max:100',
            'extension' => 'string|regex:/^[0-9]{2,8}$/|max:8',
            'strategy' => 'string|in:ringall,leastrecent,fewestcalls,random,rrmemory,linear',
            'seconds_to_ring_each_member' => 'int|min:1|max:300',
            'seconds_for_wrapup' => 'int|min:0|max:300',
            'recive_calls_while_on_a_call' => 'bool',
            'caller_hear' => 'string|in:ringing,musiconhold',
            'announce_position' => 'bool',
            'announce_hold_time' => 'bool',
            'periodic_announce_sound_id' => 'string|empty_to_null',
            'moh_sound_id' => 'string|empty_to_null',
            'periodic_announce_frequency' => 'int|min:0|max:3600',
            'timeout_to_redirect_to_extension' => 'int|min:0|max:7200',
            'timeout_extension' => 'string|empty_to_null',
            'redirect_to_extension_if_empty' => 'string|empty_to_null',
            'number_unanswered_calls_to_redirect' => 'int|min:1|max:20',
            'redirect_to_extension_if_unanswered' => 'string|empty_to_null',
            'number_repeat_unanswered_to_redirect' => 'int|min:1|max:20',
            'redirect_to_extension_if_repeat_exceeded' => 'string|empty_to_null',
            'callerid_prefix' => 'string|max:20|empty_to_null',
            'description' => 'string|max:500|empty_to_null',
            'members' => 'array'
        ];

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
            $sanitizedData['members'] = self::sanitizeMembersData($data['members']);
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
        if (!empty($sanitizedData['id'])) {
            $queue = CallQueues::findFirstById($sanitizedData['id']);
            if (!$queue) {
                $res->messages['error'][] = 'Call queue not found';
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

                // Update CallQueue with unified data handling
                $queue->extension = $sanitizedData['extension'];
                $queue->name = $sanitizedData['name'];
                $queue->strategy = $sanitizedData['strategy'] ?? 'ringall';
                $queue->seconds_to_ring_each_member = $sanitizedData['seconds_to_ring_each_member'] ?? 15;
                $queue->seconds_for_wrapup = $sanitizedData['seconds_for_wrapup'] ?? 15;
                $queue->caller_hear = $sanitizedData['caller_hear'] ?? 'ringing';

                // Convert boolean values using unified approach
                $booleanFields = ['recive_calls_while_on_a_call', 'announce_position', 'announce_hold_time'];
                $convertedData = self::convertBooleanFields($sanitizedData, $booleanFields);
                
                $queue->recive_calls_while_on_a_call = $convertedData['recive_calls_while_on_a_call'] ?? '0';
                $queue->announce_position = $convertedData['announce_position'] ?? '0';
                $queue->announce_hold_time = $convertedData['announce_hold_time'] ?? '0';
                $queue->periodic_announce_sound_id = $sanitizedData['periodic_announce_sound_id'] ?? null;
                $queue->moh_sound_id = $sanitizedData['moh_sound_id'] ?? null;
                $queue->periodic_announce_frequency = $sanitizedData['periodic_announce_frequency'] ?? 0;
                $queue->timeout_to_redirect_to_extension = $sanitizedData['timeout_to_redirect_to_extension'] ?? 300;
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
     * @param array $members Raw members data
     * @return array Sanitized members data
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