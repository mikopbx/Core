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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\SystemMessages;

/**
 * ✨ REFERENCE IMPLEMENTATION: OutWorkTimes Save Action (Complex Validation)
 *
 * This follows the canonical 7-phase pattern with complex time period validation.
 * Single Source of Truth pattern - all definitions in DataStructure::getParameterDefinitions()
 *
 * Processing Pipeline (7 Phases):
 * 1. SANITIZE: Clean user input (XSS, SQL injection prevention)
 * 2. VALIDATE REQUIRED: Check required fields (description)
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE/PATCH
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!) - calType, priority, allowRestriction
 * 5. VALIDATE SCHEMA: Check constraints + complex business rules
 * 6. SAVE: Transaction with nested relationships (incomingRoutes, allowedExtensions)
 * 7. BUILD RESPONSE: Format data using DataStructure
 *
 * Complex Validation:
 * - Time period validation (time_from/time_to format HH:MM)
 * - Date range validation (date_from before date_to)
 * - Weekday validation (1-7 or -1 for empty)
 * - Action-specific validation (extension vs playmessage)
 * - CalType-specific validation (timeframe vs caldav/ical)
 * - Password masking (XXXXXXXX pattern preserved on UPDATE)
 *
 * @package MikoPBX\PBXCoreREST\Lib\OutWorkTimes
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save out-of-work-time condition with comprehensive validation
     *
     * Handles CREATE, UPDATE (PUT), and PATCH operations:
     * - CREATE: New record with auto-increment priority
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
        // WHY: Security - never trust user input
        // ============================================================

        $sanitizationRules = DataStructure::getSanitizationRules();
        $textFields = ['description', 'calUser'];

        // Preserve ID and nested arrays
        $recordId = $data['id'] ?? null;
        $incomingRouteIds = $data['incomingRouteIds'] ?? null;
        $allowedExtensions = $data['allowedExtensions'] ?? null;

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved fields
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }
            if ($incomingRouteIds !== null) {
                $sanitizedData['incomingRouteIds'] = is_array($incomingRouteIds) ? $incomingRouteIds : [];
            }
            if ($allowedExtensions !== null) {
                $sanitizedData['allowedExtensions'] = is_array($allowedExtensions) ? $allowedExtensions : [];
            }

            // Sanitize routing extension field
            if (isset($sanitizedData['extension'])) {
                $sanitizedData = self::sanitizeRoutingDestinations($sanitizedData, ['extension'], 8);
            }

            // Convert weekday values: empty string → -1
            if (isset($sanitizedData['weekday_from']) && $sanitizedData['weekday_from'] === '') {
                $sanitizedData['weekday_from'] = '-1';
            }
            if (isset($sanitizedData['weekday_to']) && $sanitizedData['weekday_to'] === '') {
                $sanitizedData['weekday_to'] = '-1';
            }

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // ============================================================
        // PHASE 2: REQUIRED FIELDS VALIDATION
        // WHY: Fail fast - don't waste resources on invalid data
        // Note: description is optional, will be auto-generated if empty
        // ============================================================

        // No required fields for time conditions (description is optional)

        // ============================================================
        // PHASE 3: DETERMINE OPERATION TYPE
        // WHY: Different logic for new vs existing records
        // ============================================================

        $condition = null;
        $isNewRecord = true;
        $httpMethod = $data['httpMethod'] ?? 'POST';

        if (!empty($sanitizedData['id'])) {
            // Try to find existing record by numeric ID
            $condition = OutWorkTimes::findFirstById($sanitizedData['id']);

            if ($condition) {
                // Record exists - UPDATE or PATCH operation
                $isNewRecord = false;
            } else {
                // Check if PUT/PATCH should fail with 404
                // WHY: REST semantics - PUT/PATCH require existing resource
                $error = self::validateRecordExistence($httpMethod, 'Time condition');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // POST with custom ID allowed for migrations
            }
        }

        if ($isNewRecord) {
            // CREATE: Initialize new time condition
            $condition = new OutWorkTimes();
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // WHY CREATE: New records need complete dataset with all fields
        // WHY NOT UPDATE/PATCH: Would overwrite existing values with defaults!
        // ============================================================

        if ($isNewRecord) {
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);

            // Auto-assign priority if not provided
            if (empty($sanitizedData['priority'])) {
                $maxPriority = OutWorkTimes::maximum(['column' => 'priority']);
                $sanitizedData['priority'] = (int)$maxPriority + 1;
            }
        }

        // ============================================================
        // PHASE 5: SCHEMA VALIDATION (Complex Business Rules!)
        // WHY: Validate AFTER defaults to check complete dataset
        // ============================================================

        // Schema validation (enum, pattern, maxLength)
        $schemaErrors = DataStructure::validateInputData($sanitizedData);
        if (!empty($schemaErrors)) {
            $res->messages['error'] = $schemaErrors;
            $res->httpCode = 422; // Unprocessable Entity
            return $res;
        }

        // For PATCH/UPDATE operations, merge with existing values for validation
        // WHY: Business validation needs complete dataset, not just changed fields
        $dataForValidation = $sanitizedData;
        if (!$isNewRecord && $condition !== null) {
            // Build complete dataset by merging existing values with new ones
            $dataForValidation = [
                'action' => $sanitizedData['action'] ?? $condition->action,
                'extension' => $sanitizedData['extension'] ?? $condition->extension,
                'audio_message_id' => $sanitizedData['audio_message_id'] ?? $condition->audio_message_id,
                'calType' => $sanitizedData['calType'] ?? $condition->calType,
                'calUrl' => $sanitizedData['calUrl'] ?? $condition->calUrl,
                'time_from' => $sanitizedData['time_from'] ?? $condition->time_from,
                'time_to' => $sanitizedData['time_to'] ?? $condition->time_to,
                'date_from' => $sanitizedData['date_from'] ?? $condition->date_from,
                'date_to' => $sanitizedData['date_to'] ?? $condition->date_to,
                'weekday_from' => $sanitizedData['weekday_from'] ?? (empty($condition->weekday_from) ? '-1' : $condition->weekday_from),
                'weekday_to' => $sanitizedData['weekday_to'] ?? (empty($condition->weekday_to) ? '-1' : $condition->weekday_to),
            ];
        }

        // Complex business rules validation
        $businessErrors = self::validateTimePeriods($dataForValidation);
        if (!empty($businessErrors)) {
            $res->messages['error'] = array_merge(
                $res->messages['error'] ?? [],
                $businessErrors
            );
            $res->httpCode = 422;
            return $res;
        }

        // ============================================================
        // PHASE 6: SAVE TO DATABASE
        // WHY: All-or-nothing transaction with nested relationships
        // ============================================================

        try {
            $savedCondition = self::executeInTransaction(function() use ($condition, $sanitizedData, $isNewRecord) {
                // Update description
                if (isset($sanitizedData['description'])) {
                    $condition->description = $sanitizedData['description'];
                }

                // Update calendar type (PATCH support with isset())
                if (isset($sanitizedData['calType'])) {
                    $condition->calType = $sanitizedData['calType'];
                } elseif ($isNewRecord) {
                    $condition->calType = 'timeframe';
                }

                // Update date range (PATCH support with isset())
                if (isset($sanitizedData['date_from'])) {
                    $condition->date_from = $sanitizedData['date_from'];
                } elseif ($isNewRecord) {
                    $condition->date_from = '';
                }
                if (isset($sanitizedData['date_to'])) {
                    $condition->date_to = $sanitizedData['date_to'];
                } elseif ($isNewRecord) {
                    $condition->date_to = '';
                }

                // Update weekday range (PATCH support with isset())
                if (isset($sanitizedData['weekday_from'])) {
                    $condition->weekday_from = $sanitizedData['weekday_from'] === '-1' ? '' : $sanitizedData['weekday_from'];
                } elseif ($isNewRecord) {
                    $condition->weekday_from = '';
                }
                if (isset($sanitizedData['weekday_to'])) {
                    $condition->weekday_to = $sanitizedData['weekday_to'] === '-1' ? '' : $sanitizedData['weekday_to'];
                } elseif ($isNewRecord) {
                    $condition->weekday_to = '';
                }

                // Update time range (PATCH support with isset())
                if (isset($sanitizedData['time_from'])) {
                    $condition->time_from = $sanitizedData['time_from'];
                } elseif ($isNewRecord) {
                    $condition->time_from = '00:00';
                }
                if (isset($sanitizedData['time_to'])) {
                    $condition->time_to = $sanitizedData['time_to'];
                } elseif ($isNewRecord) {
                    $condition->time_to = '23:59';
                }

                // Update CalDAV/iCal fields (PATCH support with isset())
                if (isset($sanitizedData['calUrl'])) {
                    $condition->calUrl = $sanitizedData['calUrl'];
                } elseif ($isNewRecord) {
                    $condition->calUrl = '';
                }
                if (isset($sanitizedData['calUser'])) {
                    $condition->calUser = $sanitizedData['calUser'];
                } elseif ($isNewRecord) {
                    $condition->calUser = '';
                }

                // Password masking: only update if not masked value
                if (isset($sanitizedData['calSecret'])) {
                    if ($sanitizedData['calSecret'] !== 'XXXXXXXX' && $sanitizedData['calSecret'] !== '') {
                        $condition->calSecret = $sanitizedData['calSecret'];
                    } elseif ($sanitizedData['calSecret'] === '') {
                        $condition->calSecret = '';
                    }
                    // If 'XXXXXXXX', keep existing value (don't update)
                } elseif ($isNewRecord) {
                    $condition->calSecret = '';
                }

                // Update action (PATCH support with isset())
                if (isset($sanitizedData['action'])) {
                    $condition->action = $sanitizedData['action'];
                } elseif ($isNewRecord) {
                    $condition->action = 'extension';
                }

                // Update extension (PATCH support with isset())
                if (isset($sanitizedData['extension'])) {
                    $condition->extension = $sanitizedData['extension'];
                } elseif ($isNewRecord) {
                    $condition->extension = '';
                }

                // Update audio message (PATCH support with isset())
                if (isset($sanitizedData['audio_message_id'])) {
                    $condition->audio_message_id = $sanitizedData['audio_message_id'];
                } elseif ($isNewRecord) {
                    $condition->audio_message_id = '';
                }

                // Update priority (PATCH support with isset())
                if (isset($sanitizedData['priority'])) {
                    $condition->priority = (string)$sanitizedData['priority'];
                } elseif ($isNewRecord) {
                    $condition->priority = '0';
                }

                // Update restriction flag (PATCH support with isset())
                if (isset($sanitizedData['allowRestriction'])) {
                    $boolFields = ['allowRestriction'];
                    $converted = self::convertBooleanFields($sanitizedData, $boolFields);
                    $condition->allowRestriction = $converted['allowRestriction'];
                } elseif ($isNewRecord) {
                    $condition->allowRestriction = '0';
                }

                // Save time condition
                if (!$condition->save()) {
                    throw new \Exception('Failed to save time condition: ' . implode(', ', $condition->getMessages()));
                }

                // Update nested relationships (PATCH support with isset())
                if (isset($sanitizedData['incomingRouteIds'])) {
                    self::updateIncomingRoutes((int)$condition->id, $sanitizedData['incomingRouteIds']);
                }

                if (isset($sanitizedData['allowedExtensions'])) {
                    self::updateAllowedExtensions((int)$condition->id, $sanitizedData['allowedExtensions']);
                }

                return $condition;
            });

            // ============================================================
            // PHASE 7: BUILD RESPONSE
            // WHY: Consistent API format using DataStructure transformation
            // ============================================================

            $res->data = DataStructure::createFromModel($savedCondition);
            $res->success = true;
            $res->httpCode = $isNewRecord ? 201 : 200; // 201 Created, 200 OK

            if ($isNewRecord) {
                $res->reload = "off-work-times/modify/{$savedCondition->id}";
            }

            self::logSuccessfulSave(
                'Time condition',
                $savedCondition->description ?: 'Time Condition #' . $savedCondition->id,
                (string)$savedCondition->id,
                __METHOD__
            );

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Validate time periods with complex business rules
     *
     * Validates:
     * - Action-specific fields (extension vs playmessage)
     * - Time format (HH:MM pattern)
     * - Date range (start before end)
     * - Weekday range (1-7)
     * - CalType-specific requirements (CalDAV/iCal URL)
     * - At least one time condition for timeframe type
     *
     * WHY: Business logic validation ensures data integrity
     *
     * @param array<string, mixed> $data Sanitized data
     * @return array<string> List of validation errors (empty if valid)
     */
    private static function validateTimePeriods(array $data): array
    {
        $errors = [];
        $di = \Phalcon\Di\Di::getDefault();
        $t = $di !== null ? $di->get(TranslationProvider::SERVICE_NAME) : null;

        $action = $data['action'] ?? '';
        $calType = $data['calType'] ?? '';

        // Validate action-specific fields
        if ($action === 'extension') {
            if (empty($data['extension']) || trim($data['extension']) === '') {
                $errors[] = $t ? $t->_('tf_ValidateExtensionEmpty') : 'Extension is required when action is extension';
            }
        } elseif ($action === 'playmessage') {
            if (empty($data['audio_message_id']) || trim($data['audio_message_id']) === '') {
                $errors[] = $t ? $t->_('tf_ValidateAudioMessageEmpty') : 'Audio message is required when action is playmessage';
            }
        }

        // Validate time format (HH:MM)
        $timePattern = '/^([01]?[0-9]|2[0-3]):([0-5]?[0-9])$/';
        if (!empty($data['time_from']) && !preg_match($timePattern, $data['time_from'])) {
            $errors[] = $t ? $t->_('tf_ValidateCheckTimeInterval') : 'Invalid time format for time_from';
        }
        if (!empty($data['time_to']) && !preg_match($timePattern, $data['time_to'])) {
            $errors[] = $t ? $t->_('tf_ValidateCheckTimeInterval') : 'Invalid time format for time_to';
        }

        // If one time is set, both must be set
        if ((!empty($data['time_from']) && empty($data['time_to'])) ||
            (empty($data['time_from']) && !empty($data['time_to']))) {
            $errors[] = $t ? $t->_('tf_ValidateCheckTimeInterval') : 'Both time_from and time_to must be specified';
        }

        // Validate calendar-specific fields
        if ($calType === 'caldav' || $calType === 'ical') {
            // CalDAV/iCal requires URL
            if (empty($data['calUrl']) || trim($data['calUrl']) === '') {
                $errors[] = $t ? $t->_('tf_ValidateCalUri') : 'Calendar URL is required for CalDAV/iCal';
            }
            // Validate URL format if provided
            if (!empty($data['calUrl']) && !filter_var($data['calUrl'], FILTER_VALIDATE_URL)) {
                $errors[] = $t ? $t->_('tf_ValidateCalUri') : 'Invalid calendar URL format';
            }
        } elseif ($calType === '' || $calType === 'timeframe') {
            // For timeframe type, at least one condition must be specified
            $hasDateRange = !empty($data['date_from']) || !empty($data['date_to']);
            $hasWeekdayRange = (!empty($data['weekday_from']) && $data['weekday_from'] !== '-1') ||
                               (!empty($data['weekday_to']) && $data['weekday_to'] !== '-1');
            $hasTimeRange = !empty($data['time_from']) || !empty($data['time_to']);

            if (!$hasDateRange && !$hasWeekdayRange && !$hasTimeRange) {
                $errors[] = $t ? $t->_('tf_ValidateAtLeastOneCondition') : 'At least one time condition must be specified';
            }

            // Validate date range if provided
            if ($hasDateRange) {
                if ((!empty($data['date_from']) && empty($data['date_to'])) ||
                    (empty($data['date_from']) && !empty($data['date_to']))) {
                    $errors[] = $t ? $t->_('tf_ValidateDateRangeComplete') : 'Both date_from and date_to must be specified';
                }
                // Check if start date is before end date
                if (!empty($data['date_from']) && !empty($data['date_to'])) {
                    $startTimestamp = is_numeric($data['date_from']) ? (int)$data['date_from'] : strtotime($data['date_from']);
                    $endTimestamp = is_numeric($data['date_to']) ? (int)$data['date_to'] : strtotime($data['date_to']);
                    if ($startTimestamp > $endTimestamp) {
                        $errors[] = $t ? $t->_('tf_ValidateDateRangeOrder') : 'Start date must be before end date';
                    }
                }
            }

            // Validate weekday range if provided
            if ($hasWeekdayRange) {
                $weekdayFrom = $data['weekday_from'] ?? '-1';
                $weekdayTo = $data['weekday_to'] ?? '-1';

                if (($weekdayFrom !== '-1' && $weekdayTo === '-1') ||
                    ($weekdayFrom === '-1' && $weekdayTo !== '-1')) {
                    $errors[] = $t ? $t->_('tf_ValidateWeekdayRangeComplete') : 'Both weekday_from and weekday_to must be specified';
                }

                // Validate weekday values (1-7 or -1)
                if ($weekdayFrom !== '-1' && ((int)$weekdayFrom < 1 || (int)$weekdayFrom > 7)) {
                    $errors[] = $t ? $t->_('tf_ValidateWeekdayInvalid') : 'Weekday must be between 1 and 7';
                }
                if ($weekdayTo !== '-1' && ((int)$weekdayTo < 1 || (int)$weekdayTo > 7)) {
                    $errors[] = $t ? $t->_('tf_ValidateWeekdayInvalid') : 'Weekday must be between 1 and 7';
                }
            }
        }

        return $errors;
    }

    /**
     * Update associated incoming routes
     *
     * Deletes existing associations and creates new ones.
     * Maintains referential integrity with incoming routes.
     *
     * @param int $conditionId Time condition ID
     * @param array<int> $routeIds Incoming route IDs
     * @return void
     */
    private static function updateIncomingRoutes(int $conditionId, array $routeIds): void
    {
        // Delete existing associations
        $existingAssociations = OutWorkTimesRouts::find([
            'conditions' => 'timeConditionId = :conditionId:',
            'bind' => ['conditionId' => $conditionId]
        ]);

        if ($existingAssociations !== false) {
            foreach ($existingAssociations as $association) {
                $association->delete();
            }
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
     * Placeholder for extension restriction logic.
     * Implementation depends on database schema.
     *
     * @param int $conditionId Time condition ID
     * @param array<string> $extensions Extension numbers
     * @return void
     */
    private static function updateAllowedExtensions(int $conditionId, array $extensions): void
    {
        // This would update a related table for allowed extensions
        // Implementation depends on your database schema
        SystemMessages::sysLogMsg(
            __METHOD__,
            "Updating allowed extensions for condition {$conditionId}: " . implode(', ', $extensions),
            LOG_DEBUG
        );
    }
}
