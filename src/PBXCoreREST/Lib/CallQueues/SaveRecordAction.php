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
use MikoPBX\AdminCabinet\Library\SecurityHelper;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use MikoPBX\PBXCoreREST\Lib\Common\SystemSanitizer;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

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
class SaveRecordAction
{
    /**
     * Save call queue record with comprehensive validation and proper logging
     *
     * @param array $data Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Data sanitization
        // SECURITY FIX: Remove html_escape from sanitization rules to prevent double escaping
        // HTML escaping is handled at output level in DataStructure::createFromModel()
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

        // Extract and sanitize main fields
        $fieldsToSanitize = array_intersect_key($data, $sanitizationRules);
        $sanitizedData = BaseActionHelper::sanitizeData($fieldsToSanitize, $sanitizationRules);
        
        // SECURITY FIX: Decode HTML entities from frontend (e.g. &quot; -> ")
        // Frontend sometimes sends already escaped data, so we need to decode it
        // before storing in database to prevent double escaping
        $textFieldsTodecode = ['name', 'description', 'callerid_prefix'];
        foreach ($textFieldsTodecode as $field) {
            if (isset($sanitizedData[$field])) {
                $sanitizedData[$field] = BaseActionHelper::decodeHtmlEntities($sanitizedData[$field]);
            }
        }

        // Custom validation for extension fields using SystemSanitizer
        $extensionFields = [
            'timeout_extension',
            'redirect_to_extension_if_empty',
            'redirect_to_extension_if_unanswered',
            'redirect_to_extension_if_repeat_exceeded'
        ];

        foreach ($extensionFields as $field) {
            if (isset($sanitizedData[$field]) && !empty($sanitizedData[$field])) {
                if (!SystemSanitizer::isValidRoutingDestination($sanitizedData[$field], 20)) {
                    $sanitizedData[$field] = SystemSanitizer::sanitizeRoutingDestination($sanitizedData[$field], 20);
                    if (!SystemSanitizer::isValidRoutingDestination($sanitizedData[$field], 20)) {
                        $res->messages['error'][] = "Invalid {$field} value";
                        SystemMessages::sysLogMsg(__METHOD__,
                            "Invalid extension field {$field}: " . $sanitizedData[$field],
                            LOG_WARNING
                        );
                        return $res;
                    }
                }
            }
        }

        // Check for dangerous content in text fields with proper logging
        $textFields = ['name', 'description', 'callerid_prefix'];
        foreach ($textFields as $field) {
            if (isset($sanitizedData[$field]) && SecurityHelper::containsDangerousContent($sanitizedData[$field])) {
                $res->messages['error'][] = "Dangerous content detected in {$field}";
                SystemMessages::sysLogMsg(__METHOD__,
                    "Dangerous content detected in {$field} from IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') .
                    ", Content: " . substr($sanitizedData[$field], 0, 100),
                    LOG_WARNING
                );
                return $res;
            }
        }

        // Sanitize members data
        if (isset($data['members'])) {
            $sanitizedData['members'] = self::sanitizeMembersData($data['members']);
        }

        // Validate required fields
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Queue name is required']
            ],
            'extension' => [
                ['type' => 'required', 'message' => 'Extension number is required'],
                ['type' => 'regex', 'pattern' => '/^[0-9]{2,8}$/', 'message' => 'Extension must be 2-8 digits']
            ]
        ];

        $validationErrors = BaseActionHelper::validateData($sanitizedData, $validationRules);
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

        // Check extension uniqueness
        if (!BaseActionHelper::checkUniqueness(
            Extensions::class,
            'number',
            $sanitizedData['extension'],
            $queue->extension
        )) {
            $res->messages['error'][] = 'Extension number already exists';
            return $res;
        }

        try {
            // Save in transaction using BaseActionHelper
            $savedQueue = BaseActionHelper::executeInTransaction(function() use ($queue, $sanitizedData) {
                // Update/create Extension
                $extension = Extensions::findFirstByNumber($queue->extension ?? '');
                if (!$extension) {
                    $extension = new Extensions();
                    $extension->type = Extensions::TYPE_QUEUE;
                    $extension->show_in_phonebook = '1';
                    $extension->public_access = '1';
                }

                $extension->number = $sanitizedData['extension'];
                $extension->callerid = $sanitizedData['name'];

                if (!$extension->save()) {
                    throw new \Exception('Failed to save extension: ' . implode(', ', $extension->getMessages()));
                }

                // Update CallQueue
                $queue->extension = $sanitizedData['extension'];
                $queue->name = $sanitizedData['name'];
                $queue->strategy = $sanitizedData['strategy'] ?? 'ringall';
                $queue->seconds_to_ring_each_member = $sanitizedData['seconds_to_ring_each_member'] ?? 15;
                $queue->seconds_for_wrapup = $sanitizedData['seconds_for_wrapup'] ?? 15;
                
                // Convert boolean values to database format (following IVR Menu pattern)
                // Note: Unchecked checkboxes don't send data, so they default to false
                $queue->recive_calls_while_on_a_call = ($sanitizedData['recive_calls_while_on_a_call'] ?? false) ? '1' : '0';
                $queue->caller_hear = $sanitizedData['caller_hear'] ?? 'ringing';
                $queue->announce_position = ($sanitizedData['announce_position'] ?? false) ? '1' : '0';
                $queue->announce_hold_time = ($sanitizedData['announce_hold_time'] ?? false) ? '1' : '0';
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

            // Log successful operation (following MikoPBX standards)
            SystemMessages::sysLogMsg(__METHOD__,
                "Call queue '{$savedQueue->name}' ({$savedQueue->extension}) saved successfully",
                LOG_INFO
            );

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            // Use CriticalErrorsHandler for exceptions (following MikoPBX standards)
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
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