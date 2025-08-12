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
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for out-of-work-time conditions
 * 
 * Provides methods to transform model data into API response format.
 * Implements two patterns:
 * - createFromModel: Full data structure with all relationships
 * - createForList: Lightweight structure for list display
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create full data structure from model
     * 
     * Used for single record retrieval and after save operations.
     * Includes all fields and loaded relationships.
     * 
     * @param mixed $model Time condition model (OutWorkTimes)
     * @return array Full data structure
     */
    public static function createFromModel($model): array
    {
        // Start with base structure
        $data = [
            'id' => $model->id,
            'name' => $model->description ?? 'Time Condition #' . $model->id,
            'description' => $model->description ?? '',
            'calType' => $model->calType ?: 'timeframe',  // Empty string in DB means 'timeframe'
            // Return dates as-is (timestamps) for API, not formatted for display
            'date_from' => $model->date_from ?? '',
            'date_to' => $model->date_to ?? '',
            'weekday_from' => $model->weekday_from ?? '',
            'weekday_to' => $model->weekday_to ?? '',
            'time_from' => $model->time_from ?? '',
            'time_to' => $model->time_to ?? '',
            'calUrl' => $model->calUrl ?? '',
            'calUser' => $model->calUser ?? '',
            // Never return real password, only masked value if password exists
            'calSecret' => !empty($model->calSecret) ? 'XXXXXX' : '',
            'priority' => $model->priority,
            'allowRestriction' => ($model->allowRestriction ?? '0') === '1',
            'allowedExtensions' => self::getAllowedExtensions((int)$model->id),
            // Only return IDs of associated incoming routes
            'incomingRouteIds' => self::getIncomingRouteIds((int)$model->id)
        ];
        
        // Add action field (explicit in OutWorkTimes, unlike IncomingRoutes where it's computed)
        $data['action'] = $model->action ?? 'extension';
        
        // Add extension field with representation using unified approach
        $data = self::addExtensionField($data, 'extension', $model->extension);
        
        // Add sound file field using unified approach with underscore separator for consistency
        $data = self::addSoundFileField($data, 'audio_message_id', $model->audio_message_id, '_Represent');
        
        return $data;
    }
    
    /**
     * Create lightweight data structure for list display
     * 
     * Used for list operations to optimize performance.
     * Excludes heavy relationships and detailed info.
     * 
     * @param mixed $model Time condition model
     * @return array Lightweight data structure
     */
    public static function createForList($model): array
    {
        // Get calendar periods for display
        $calendarPeriods = self::getCalendarPeriodsForDisplay($model);
        
        // Get action information
        $actionInfo = self::getActionInfo($model);
        
        return [
            'id' => $model->id,
            'name' => $model->description ?? '',
            'description' => $model->description ?? '',
            'shot_description' => self::getShotDescription($model->description ?? ''),
            'calType' => $model->calType ?? '',
            'calendarPeriods' => $calendarPeriods,
            'allowRestriction' => ($model->allowRestriction ?? '0') === '1',
            'action' => $actionInfo['action'],
            'actionDisplay' => $actionInfo['display'],
            'audio_message_id' => $actionInfo['audio_message'] ?? '',
            'extension' => $actionInfo['extension'] ?? '',
            'priority' => (int)($model->priority ?? 0),
            
            // Fields for original table structure (formatted for display)
            'date_from' => self::formatDateForDisplay($model->date_from ?? ''),
            'date_to' => self::formatDateForDisplay($model->date_to ?? ''),
            'weekday_from' => self::getWeekdayName((int)($model->weekday_from ?? 0)),
            'weekday_to' => self::getWeekdayName((int)($model->weekday_to ?? 0)),
            'time_from' => $model->time_from ?? '',
            'time_to' => $model->time_to ?? '',
        ];
    }
    
    /**
     * Create template for new record
     * 
     * @return array New record template with defaults
     */
    public static function createNewRecord(): array
    {
        $data = [
            'id' => '',
            'name' => '',
            'description' => '',
            'calType' => 'timeframe',
            'date_from' => '',
            'date_to' => '',
            'weekday_from' => '',
            'weekday_to' => '',
            'time_from' => '00:00',
            'time_to' => '23:59',
            'priority' => '0',
            'allowRestriction' => false,
            'allowedExtensions' => [],
            'incomingRouteIds' => []
        ];
        
        // Add extension field with empty representation
        $data = self::addExtensionField($data, 'extension', null);
        
        // Add sound file field with empty representation
        $data = self::addSoundFileField($data, 'audio_message_id', null, '_Represent');
        
        return $data;
    }
    
    /**
     * Get calendar periods for display matching original structure
     * 
     * @param OutWorkTimes $model
     * @return array Calendar period items
     */
    private static function getCalendarPeriodsForDisplay(OutWorkTimes $model): array
    {
        $periods = [];
        
        // Date period
        if (!empty($model->date_from)) {
            $dateRange = self::formatDateForDisplay($model->date_from);
            if ($model->date_from !== $model->date_to && !empty($model->date_to)) {
                $dateRange .= ' - ' . self::formatDateForDisplay($model->date_to);
            }
            $periods[] = [
                'icon' => 'outline calendar alternate',
                'text' => $dateRange,
                'type' => 'date'
            ];
        }
        
        // Weekday period
        if (!empty($model->weekday_from)) {
            $weekdayRange = self::getWeekdayName((int)$model->weekday_from);
            if ($model->weekday_from !== $model->weekday_to && !empty($model->weekday_to)) {
                $weekdayRange .= ' - ' . self::getWeekdayName((int)$model->weekday_to);
            }
            $periods[] = [
                'icon' => 'outline calendar minus',
                'text' => $weekdayRange,
                'type' => 'weekday'
            ];
        }
        
        // Time period
        if (!empty($model->time_from)) {
            $timeRange = $model->time_from;
            if ($model->time_from !== $model->time_to && !empty($model->time_to)) {
                $timeRange .= ' - ' . $model->time_to;
            }
            $periods[] = [
                'icon' => 'clock outline',
                'text' => $timeRange,
                'type' => 'time'
            ];
        }
        
        // CalDAV/iCal calendar
        if (!empty($model->calType) && in_array($model->calType, ['caldav', 'ical'])) {
            $periods[] = [
                'icon' => 'outline calendar alternate',
                'text' => ucfirst($model->calType),
                'type' => 'calendar'
            ];
        }
        
        return $periods;
    }
    
    /**
     * Get action information for display
     * 
     * @param OutWorkTimes $model
     * @return array Action information
     */
    private static function getActionInfo(OutWorkTimes $model): array
    {
        $action = $model->action ?? '';
        $display = '';
        $audioMessage = null;
        $extension = null;
        
        if ($action === 'playmessage' && !empty($model->audio_message_id)) {
            $sound = SoundFiles::findFirstById($model->audio_message_id);
            if ($sound) {
                $audioMessage = $sound->name;
                
                // Get translation service and use the same key as in template
                $di = \Phalcon\Di\Di::getDefault();
                $translation = $di->get(TranslationProvider::SERVICE_NAME);
                $actionText = $translation->_('tf_ActionPlayMessage', ['message' => $audioMessage]);
                
                // Create HTML with sound icon and translated text (don't escape HTML as translation contains safe HTML)
                $display = '<i class="file audio outline icon"></i>' . $actionText;
            }
        } elseif ($action === 'extension' && !empty($model->extension)) {
            $ext = Extensions::findFirstByNumber($model->extension);
            if ($ext) {
                $extension = $ext->number;
                
                // Get translation service and use the same key as in template
                $di = \Phalcon\Di\Di::getDefault();
                $translation = $di->get(TranslationProvider::SERVICE_NAME);
                $actionText = $translation->_('tf_ActionTransferToExtension', ['extension' => $extension]);
                
                // Create HTML with phone icon and translated text (don't escape HTML as translation contains safe HTML)
                $display = '<i class="phone icon"></i>' . $actionText;
            }
        }
        
        return [
            'action' => $action,
            'display' => $display,
            'audio_message' => $audioMessage,
            'extension' => $extension
        ];
    }
    
    /**
     * Get weekday name using translations
     * 
     * @param int $weekday
     * @return string
     */
    private static function getWeekdayName(int $weekday): string
    {
        if ($weekday < 1 || $weekday > 7) {
            return '';
        }
        
        // Get translation service
        $di = \Phalcon\Di\Di::getDefault();
        $translation = $di->get(TranslationProvider::SERVICE_NAME);
        
        // Map weekday numbers to translation keys (using same logic as original form)
        $weekdayKeys = [
            1 => 'Mon',
            2 => 'Tue', 
            3 => 'Wed',
            4 => 'Thu',
            5 => 'Fri',
            6 => 'Sat',
            7 => 'Sun'
        ];
        
        return $translation->_($weekdayKeys[$weekday]);
    }
    
    /**
     * Get short description (first part before newline or period)
     * 
     * @param string $description
     * @return string
     */
    private static function getShotDescription(string $description): string
    {
        if (empty($description)) {
            return '';
        }
        
        // Take first line or first sentence
        $lines = explode("\n", $description);
        $firstLine = trim($lines[0]);
        
        // If line is too long, take first 50 characters
        if (strlen($firstLine) > 50) {
            return substr($firstLine, 0, 47) . '...';
        }
        
        return $firstLine;
    }
    
    
    /**
     * Get IDs of incoming routes associated with time condition
     * 
     * @param int $conditionId Time condition ID
     * @return array Array of incoming route IDs
     */
    private static function getIncomingRouteIds(int $conditionId): array
    {
        $routeIds = [];
        
        $associations = OutWorkTimesRouts::find([
            'conditions' => 'timeConditionId = :conditionId:',
            'bind' => ['conditionId' => $conditionId]
        ]);
        
        foreach ($associations as $association) {
            $routeIds[] = (int)$association->routId;
        }
        
        return $routeIds;
    }
    
    /**
     * Get allowed extensions for time condition
     * 
     * @param int $conditionId Time condition ID
     * @return array Array of allowed extension numbers
     */
    private static function getAllowedExtensions(int $conditionId): array
    {
        // This would retrieve allowed extensions from a related table
        // Implementation depends on your database schema
        // For now, returning empty array as placeholder
        return [];
    }
    
    /**
     * Format date for display, handling both unix timestamps and Y-m-d format
     * 
     * @param string $date Date string (could be timestamp or Y-m-d format)
     * @return string Formatted date in Y-m-d format
     */
    private static function formatDateForDisplay(string $date): string
    {
        if (empty($date)) {
            return '';
        }
        
        // Check if it's a unix timestamp (numeric string)
        if (is_numeric($date)) {
            return date('Y-m-d', (int)$date);
        }
        
        // Check if it's already in Y-m-d format
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return $date;
        }
        
        // Try to parse other date formats
        $timestamp = strtotime($date);
        if ($timestamp !== false) {
            return date('Y-m-d', $timestamp);
        }
        
        // Return as-is if we can't parse it
        return $date;
    }
}