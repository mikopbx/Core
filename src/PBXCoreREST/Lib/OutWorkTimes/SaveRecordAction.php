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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\OutWorkTimes;

use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\Common\Models\OutWorkTimesRouts;
use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for saving out-of-work-time condition record
 * 
 * Extends AbstractSaveRecordAction to leverage unified save patterns.
 * Handles complex relationships with incoming routes and allowed extensions.
 * 
 * @api {post} /pbxcore/api/v2/out-work-times/saveRecord Create time condition
 * @api {put} /pbxcore/api/v2/out-work-times/saveRecord/:id Update time condition
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup OutWorkTimes
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} [description] Description
 * @apiParam {String} calType Calendar type (CalendarType enum)
 * @apiParam {String} [date_from] Start date (for date range)
 * @apiParam {String} [date_to] End date (for date range)
 * @apiParam {String} [weekday_from] Start weekday (for weekday range)
 * @apiParam {String} [weekday_to] End weekday (for weekday range)
 * @apiParam {String} [time_from] Start time (HH:MM format)
 * @apiParam {String} [time_to] End time (HH:MM format)
 * @apiParam {String} [calUrl] CalDAV calendar URL
 * @apiParam {String} [calUser] CalDAV username
 * @apiParam {String} [calSecret] CalDAV password/secret
 * @apiParam {String} [failover_extension] Failover extension
 * @apiParam {String} [audio_message_id] Audio message ID
 * @apiParam {Number} [priority] Priority (auto-assigned if empty)
 * @apiParam {Boolean} [enabled] Status
 * @apiParam {Array} [allowedExtensions] Allowed extension numbers
 * @apiParam {Array} [incomingRouteIds] Associated incoming route IDs
 * @apiParam {String} [currentTab] Current tab for preservation
 * 
 * @apiSuccess {Boolean} success Operation result
 * @apiSuccess {Object} data Saved time condition data
 * @apiSuccess {String} reload URL for page reload
 * @apiSuccess {String} [data.redirectTab] Tab to redirect to
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save out-of-work-time condition record
     * 
     * @param array $data Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);
        
        // Define sanitization rules
        $sanitizationRules = [
            'id' => 'int',
            'description' => 'string|sanitize|max:255|empty_to_null',
            'calType' => 'string|max:32',
            'date_from' => 'string|date|empty_to_null',
            'date_to' => 'string|date|empty_to_null',
            'weekday_from' => 'int|min:1|max:7|empty_to_null',
            'weekday_to' => 'int|min:1|max:7|empty_to_null',
            'time_from' => 'string|time|empty_to_null',
            'time_to' => 'string|time|empty_to_null',
            'calUrl' => 'string|sanitize|max:512|empty_to_null',
            'calUser' => 'string|sanitize|max:255|empty_to_null',
            'calSecret' => 'string|sanitize|max:255|empty_to_null',
            'action' => 'string|max:32',
            'extension' => 'string|max:32|empty_to_null',
            'audio_message_id' => 'string|max:64|empty_to_null',
            'priority' => 'int',
            'allowRestriction' => 'bool',
            'allowedExtensions' => 'array',
            'incomingRouteIds' => 'array',
            'currentTab' => 'string|max:32' // For tab preservation
        ];
        
        // Text fields for unified processing
        $textFields = ['description'];
        
        // Routing fields that need special validation
        $routingFields = ['extension'];

        try {
            // Sanitize only allowed fields
            $allowedData = array_intersect_key($data, $sanitizationRules);
            
            // Unified data sanitization
            $sanitizedData = self::sanitizeInputData($allowedData, $sanitizationRules, $textFields);
            
            // Sanitize routing destinations
            if (!empty($routingFields)) {
                $sanitizedData = self::sanitizeRoutingDestinations($sanitizedData, $routingFields);
            }
            
            // Convert boolean fields
            $sanitizedData = self::convertBooleanFields($sanitizedData, ['allowRestriction']);
            
            // Apply defaults
            $sanitizedData = self::applyDefaults($sanitizedData, [
                'priority' => 0,
                'allowRestriction' => '0'
            ]);
            
            // Validate data based on action and calendar type
            $validationErrors = self::validateTimeConditionData($sanitizedData);
            
            if (!empty($validationErrors)) {
                $res->messages['error'] = $validationErrors;
                return $res;
            }
            
            // Find or create record
            if (!empty($sanitizedData['id'])) {
                $condition = OutWorkTimes::findFirstById($sanitizedData['id']);
                if (!$condition) {
                    $res->messages['error'][] = 'api_OutWorkTimeNotFound';
                    return $res;
                }
            } else {
                $condition = new OutWorkTimes();
            }
            
            // Handle priority
            if (empty($sanitizedData['priority'])) {
                $maxPriority = OutWorkTimes::maximum(['column' => 'priority']);
                $sanitizedData['priority'] = (int)$maxPriority + 1;
            }
            
            // Save in transaction
            $savedCondition = self::executeInTransaction(function() use ($condition, $sanitizedData) {
                // Update condition fields
                $condition->description = $sanitizedData['description'] ?? '';
                $condition->calType = $sanitizedData['calType'] ?? '';
                $condition->date_from = $sanitizedData['date_from'] ?? '';
                $condition->date_to = $sanitizedData['date_to'] ?? '';
                $condition->weekday_from = isset($sanitizedData['weekday_from']) && $sanitizedData['weekday_from'] !== null ? (string)$sanitizedData['weekday_from'] : '';
                $condition->weekday_to = isset($sanitizedData['weekday_to']) && $sanitizedData['weekday_to'] !== null ? (string)$sanitizedData['weekday_to'] : '';
                $condition->time_from = $sanitizedData['time_from'] ?? '';
                $condition->time_to = $sanitizedData['time_to'] ?? '';
                $condition->calUrl = $sanitizedData['calUrl'] ?? '';
                $condition->calUser = $sanitizedData['calUser'] ?? '';
                
                // Only update password if it's not the masked value and not empty
                // If it's 'XXXXXX' (masked) or empty, keep the existing password
                if (!empty($sanitizedData['calSecret']) && $sanitizedData['calSecret'] !== 'XXXXXX') {
                    $condition->calSecret = $sanitizedData['calSecret'];
                } elseif (empty($sanitizedData['calSecret'])) {
                    // If empty string is sent, clear the password
                    $condition->calSecret = null;
                }
                // If 'XXXXXX' is sent, we don't update the field at all (keep existing value)
                
                $condition->action = $sanitizedData['action'] ?? '';
                $condition->extension = $sanitizedData['extension'] ?? '';
                $condition->audio_message_id = $sanitizedData['audio_message_id'] ?? '';
                $condition->priority = (string)$sanitizedData['priority'];
                $condition->allowRestriction = $sanitizedData['allowRestriction'] ?? '0';
                
                if (!$condition->save()) {
                    throw new \Exception('Failed to save time condition: ' . implode(', ', $condition->getMessages()));
                }
                
                // Update related incoming routes
                if (isset($sanitizedData['incomingRouteIds'])) {
                    self::updateIncomingRoutes((int)$condition->id, $sanitizedData['incomingRouteIds']);
                }
                
                // Update allowed extensions
                if (isset($sanitizedData['allowedExtensions'])) {
                    self::updateAllowedExtensions((int)$condition->id, $sanitizedData['allowedExtensions']);
                }
                
                return $condition;
            });
            
            $res->data = DataStructure::createFromModel($savedCondition);
            $res->success = true;
            
            // Only set reload for new records
            if (empty($data['id'])) {
                $res->reload = "off-work-times/modify/{$savedCondition->id}";
            }
            
            // Handle tab preservation
            self::handleTabPreservation($data, $res);
            
            // Log successful operation
            self::logSuccessfulSave(
                'Time condition',
                $savedCondition->description ?: 'Time Condition #' . $savedCondition->id,
                (string)$savedCondition->id,
                __METHOD__
            );
            
        } catch (\Exception $e) {
            return self::handleSaveError($e, $res);
        }
        
        return $res;
    }
    
    /**
     * Validate time condition data with all business rules
     * 
     * @param array $data Sanitized data
     * @return array Validation errors
     */
    private static function validateTimeConditionData(array $data): array
    {
        $errors = [];
        $di = \Phalcon\Di\Di::getDefault();
        $t = $di->get(TranslationProvider::SERVICE_NAME);
        
        // Get action and calType
        $action = $data['action'] ?? '';
        $calType = $data['calType'] ?? '';
        
        // Validate action-specific fields
        if ($action === 'extension') {
            // Extension is required when action is 'extension'
            if (empty($data['extension']) || trim($data['extension']) === '') {
                $errors[] = $t->_('tf_ValidateExtensionEmpty');
            }
        } elseif ($action === 'playmessage') {
            // Audio message is required when action is 'playmessage'
            if (empty($data['audio_message_id']) || trim($data['audio_message_id']) === '') {
                $errors[] = $t->_('tf_ValidateAudioMessageEmpty');
            }
        }
        
        // Validate time format if provided
        $timePattern = '/^([01]?[0-9]|2[0-3]):([0-5]?[0-9])$/';
        if (!empty($data['time_from']) && !preg_match($timePattern, $data['time_from'])) {
            $errors[] = $t->_('tf_ValidateCheckTimeInterval');
        }
        if (!empty($data['time_to']) && !preg_match($timePattern, $data['time_to'])) {
            $errors[] = $t->_('tf_ValidateCheckTimeInterval');
        }
        
        // If one time is set, both must be set
        if ((!empty($data['time_from']) && empty($data['time_to'])) ||
            (empty($data['time_from']) && !empty($data['time_to']))) {
            $errors[] = $t->_('tf_ValidateCheckTimeInterval');
        }
        
        // Validate calendar-specific fields
        if ($calType === 'CALDAV' || $calType === 'ICAL') {
            // CalDAV/iCal requires URL
            if (empty($data['calUrl']) || trim($data['calUrl']) === '') {
                $errors[] = $t->_('tf_ValidateCalUri');
            }
            // Validate URL format if provided
            if (!empty($data['calUrl']) && !filter_var($data['calUrl'], FILTER_VALIDATE_URL)) {
                $errors[] = $t->_('tf_ValidateCalUri');
            }
        } elseif ($calType === '' || $calType === 'timeframe') {
            // For timeframe type, at least one condition must be specified
            $hasDateRange = !empty($data['date_from']) || !empty($data['date_to']);
            $hasWeekdayRange = !empty($data['weekday_from']) || !empty($data['weekday_to']);
            $hasTimeRange = !empty($data['time_from']) || !empty($data['time_to']);
            
            if (!$hasDateRange && !$hasWeekdayRange && !$hasTimeRange) {
                // At least one time condition must be specified
                $errors[] = $t->_('tf_ValidateAtLeastOneCondition');
            }
            
            // Validate date range if provided
            if ($hasDateRange) {
                if ((!empty($data['date_from']) && empty($data['date_to'])) ||
                    (empty($data['date_from']) && !empty($data['date_to']))) {
                    $errors[] = $t->_('tf_ValidateDateRangeComplete');
                }
                // Check if start date is before end date
                if (!empty($data['date_from']) && !empty($data['date_to'])) {
                    $startTimestamp = is_numeric($data['date_from']) ? (int)$data['date_from'] : strtotime($data['date_from']);
                    $endTimestamp = is_numeric($data['date_to']) ? (int)$data['date_to'] : strtotime($data['date_to']);
                    if ($startTimestamp > $endTimestamp) {
                        $errors[] = $t->_('tf_ValidateDateRangeOrder');
                    }
                }
            }
            
            // Validate weekday range if provided
            if ($hasWeekdayRange) {
                if ((!empty($data['weekday_from']) && empty($data['weekday_to'])) ||
                    (empty($data['weekday_from']) && !empty($data['weekday_to']))) {
                    $errors[] = $t->_('tf_ValidateWeekdayRangeComplete');
                }
                // Validate weekday values (1-7)
                if (!empty($data['weekday_from']) && ((int)$data['weekday_from'] < 1 || (int)$data['weekday_from'] > 7)) {
                    $errors[] = $t->_('tf_ValidateWeekdayInvalid');
                }
                if (!empty($data['weekday_to']) && ((int)$data['weekday_to'] < 1 || (int)$data['weekday_to'] > 7)) {
                    $errors[] = $t->_('tf_ValidateWeekdayInvalid');
                }
            }
        }
        
        return $errors;
    }
    
    /**
     * Update associated incoming routes
     * 
     * @param int $conditionId Time condition ID
     * @param array $routeIds Incoming route IDs
     * @return void
     */
    private static function updateIncomingRoutes(int $conditionId, array $routeIds): void
    {
        // Delete existing associations
        $existingAssociations = OutWorkTimesRouts::find([
            'conditions' => 'timeConditionId = :conditionId:',
            'bind' => ['conditionId' => $conditionId]
        ]);
        
        foreach ($existingAssociations as $association) {
            $association->delete();
        }
        
        // Create new associations
        foreach ($routeIds as $routeId) {
            if (empty($routeId)) {
                continue;
            }
            
            $association = new OutWorkTimesRouts();
            $association->timeConditionId = $conditionId;
            $association->routId = (int)$routeId;
            $association->save();
        }
    }
    
    /**
     * Update allowed extensions for time condition
     * 
     * @param int $conditionId Time condition ID
     * @param array $extensions Extension numbers
     * @return void
     */
    private static function updateAllowedExtensions(int $conditionId, array $extensions): void
    {
        // This would update a related table for allowed extensions
        // Implementation depends on your database schema
        // For now, this is a placeholder
        SystemMessages::sysLogMsg(
            __METHOD__,
            "Updating allowed extensions for condition {$conditionId}: " . implode(', ', $extensions),
            LOG_DEBUG
        );
    }
}