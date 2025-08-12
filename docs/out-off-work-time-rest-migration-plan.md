# MikoPBX Out-of-Work-Time REST API v2 Migration Plan

## Project Overview

This document contains a comprehensive plan for migrating the MikoPBX out-of-work-time management system to the unified REST API v2 architecture. The plan follows the established patterns from Incoming Routes, Call Queues, and other successfully migrated modules, emphasizing code reusability through abstract base classes and maintaining UI/UX consistency.

## Current State Analysis

### Existing Architecture
- **Model**: `src/Common/Models/OutOffWorkTime.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/OutOffWorkTimeController.php`
- **Form**: `src/AdminCabinet/Forms/OutOffWorkTimeEditForm.php`
- **JavaScript**: Basic list and form handling
- **No REST API**: Currently no REST endpoints implemented

### OutOffWorkTime Model Fields
```php
public $id;               // Primary key
public $date_from;        // Start date (YYYY-MM-DD format)
public $date_to;          // End date (YYYY-MM-DD format)  
public $weekday_from;     // Start weekday (1-7)
public $weekday_to;       // End weekday (1-7)
public $time_from;        // Start time (HH:MM format)
public $time_to;          // End time (HH:MM format)
public $action;           // Action to perform (redirect number/playback)
public $extension;        // Extension for redirect
public $audio_message_id; // Audio message ID for playback
public $description;      // Rule description
public $calType;          // Calendar type (none/caldav/ics)
public $calUrl;           // Calendar URL
public $isCalDav;         // Is CalDAV calendar
public $allowRestriction; // Restriction mode (allow/deny)
```

### Model Relations
- `belongsTo` → `Extensions` (by extension field)
- `belongsTo` → `SoundFiles` (by audio_message_id field)

## Implementation Plan

### Phase 1: REST API Backend Implementation

#### 1.1 Action Classes

Following the established pattern of using abstract base classes for common functionality:

**File**: `src/PBXCoreREST/Lib/OutOffWorkTime/GetRecordAction.php`
```php
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

namespace MikoPBX\PBXCoreREST\Lib\OutOffWorkTime;

use MikoPBX\Common\Models\OutOffWorkTime;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;

/**
 * Action for getting out-of-work-time record
 * 
 * @api {get} /pbxcore/api/v2/out-off-work-time/getRecord/:id Get out-of-work-time record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup OutOffWorkTime
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Out-of-work-time data
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get out-of-work-time record
     * 
     * @param string|null $id Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        return self::executeStandardGet(
            OutOffWorkTime::class,
            DataStructure::class,
            $id,
            self::getNewRecordDefaults()
        );
    }
    
    /**
     * Get default values for new record
     * 
     * @return array
     */
    private static function getNewRecordDefaults(): array
    {
        return [
            'id' => '',
            'date_from' => '',
            'date_to' => '',
            'weekday_from' => -1,
            'weekday_to' => -1,
            'time_from' => '',
            'time_to' => '',
            'action' => 'extension',
            'extension' => '',
            'audio_message_id' => -1,
            'description' => '',
            'calType' => 'none',
            'calUrl' => '',
            'isCalDav' => '0',
            'allowRestriction' => 'allow'
        ];
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutOffWorkTime/GetListAction.php`
```php
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

namespace MikoPBX\PBXCoreREST\Lib\OutOffWorkTime;

use MikoPBX\Common\Models\OutOffWorkTime;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;

/**
 * Action for getting list of all out-of-work-time rules
 * 
 * @api {get} /pbxcore/api/v2/out-off-work-time/getList Get all out-of-work-time rules
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup OutOffWorkTime
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of out-of-work-time rules
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Get list of all out-of-work-time rules
     * 
     * @param array $data Filter parameters (search, ordering, pagination)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        // Default ordering by ID
        if (!isset($data['order'])) {
            $data['order'] = 'id';
            $data['orderWay'] = 'asc';
        }
        
        return self::executeStandardList(
            OutOffWorkTime::class,          // Model class
            DataStructure::class,            // DataStructure class
            $data,                           // Request parameters
            [],                              // Base query options
            false,                           // Use createForList() for performance
            ['id', 'description'],           // Allowed order fields
            ['description', 'extension']     // Searchable fields
        );
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutOffWorkTime/SaveRecordAction.php`
```php
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

namespace MikoPBX\PBXCoreREST\Lib\OutOffWorkTime;

use MikoPBX\Common\Models\OutOffWorkTime;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;

/**
 * Action for saving out-of-work-time record
 * 
 * @api {post} /pbxcore/api/v2/out-off-work-time/saveRecord Create out-of-work-time rule
 * @api {put} /pbxcore/api/v2/out-off-work-time/saveRecord/:id Update out-of-work-time rule
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup OutOffWorkTime
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} [date_from] Start date (YYYY-MM-DD)
 * @apiParam {String} [date_to] End date (YYYY-MM-DD)
 * @apiParam {String} [weekday_from] Start weekday (1-7 or -1)
 * @apiParam {String} [weekday_to] End weekday (1-7 or -1)
 * @apiParam {String} [time_from] Start time (HH:MM)
 * @apiParam {String} [time_to] End time (HH:MM)
 * @apiParam {String} action Action type (extension/playback)
 * @apiParam {String} [extension] Extension for redirect
 * @apiParam {String} [audio_message_id] Audio message ID
 * @apiParam {String} [description] Rule description
 * @apiParam {String} [calType] Calendar type (none/caldav/ics)
 * @apiParam {String} [calUrl] Calendar URL
 * @apiParam {String} [isCalDav] Is CalDAV (0/1)
 * @apiParam {String} [allowRestriction] Restriction mode (allow/deny)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved out-of-work-time data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save out-of-work-time record
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
            'date_from' => 'string|regex:/^(\d{4}-\d{2}-\d{2})?$/|empty_to_null',
            'date_to' => 'string|regex:/^(\d{4}-\d{2}-\d{2})?$/|empty_to_null',
            'weekday_from' => 'int|min:-1|max:7',
            'weekday_to' => 'int|min:-1|max:7',
            'time_from' => 'string|regex:/^(\d{2}:\d{2})?$/|empty_to_null',
            'time_to' => 'string|regex:/^(\d{2}:\d{2})?$/|empty_to_null',
            'action' => 'string|in:extension,playback',
            'extension' => 'string|max:255|empty_to_null',
            'audio_message_id' => 'int',
            'description' => 'string|sanitize|max:255|empty_to_null',
            'calType' => 'string|in:none,caldav,ics',
            'calUrl' => 'string|url|max:500|empty_to_null',
            'isCalDav' => 'string|in:0,1',
            'allowRestriction' => 'string|in:allow,deny'
        ];
        
        // Text fields for unified processing
        $textFields = ['description'];
        
        try {
            // Sanitize only allowed fields
            $allowedData = array_intersect_key($data, $sanitizationRules);
            
            // Unified data sanitization using abstract method
            $sanitizedData = self::sanitizeInputData($allowedData, $sanitizationRules, $textFields);
            
            // Validate required fields based on rule type
            $validationErrors = self::validateRule($sanitizedData);
            if (!empty($validationErrors)) {
                $res->messages['error'] = $validationErrors;
                return $res;
            }
            
            // Find or create record
            if (!empty($sanitizedData['id'])) {
                $rule = OutOffWorkTime::findFirstById($sanitizedData['id']);
                if (!$rule) {
                    $res->messages['error'][] = 'api_OutOffWorkTimeNotFound';
                    return $res;
                }
            } else {
                $rule = new OutOffWorkTime();
            }
            
            // Save in transaction
            $savedRule = self::executeInTransaction(function() use ($rule, $sanitizedData) {
                // Update rule fields
                foreach ($sanitizedData as $key => $value) {
                    if ($key !== 'id' && property_exists($rule, $key)) {
                        $rule->$key = $value;
                    }
                }
                
                // Set defaults for empty values
                if (empty($rule->weekday_from)) $rule->weekday_from = -1;
                if (empty($rule->weekday_to)) $rule->weekday_to = -1;
                if (empty($rule->audio_message_id)) $rule->audio_message_id = -1;
                if (empty($rule->calType)) $rule->calType = 'none';
                if (empty($rule->isCalDav)) $rule->isCalDav = '0';
                if (empty($rule->allowRestriction)) $rule->allowRestriction = 'allow';
                
                if (!$rule->save()) {
                    throw new \Exception('Failed to save out-of-work-time rule: ' . implode(', ', $rule->getMessages()));
                }
                
                return $rule;
            });
            
            $res->data = DataStructure::createFromModel($savedRule);
            $res->success = true;
            
            // Only set reload for new records
            if (empty($data['id'])) {
                $res->reload = "out-off-work-time/modify/{$savedRule->id}";
            }
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            self::logError($e);
        }
        
        return $res;
    }
    
    /**
     * Validate rule data
     * 
     * @param array $data
     * @return array
     */
    private static function validateRule(array $data): array
    {
        $errors = [];
        
        // At least one time restriction must be set
        $hasTimeRestriction = !empty($data['date_from']) || !empty($data['date_to']) ||
                             ($data['weekday_from'] ?? -1) > 0 || ($data['weekday_to'] ?? -1) > 0 ||
                             !empty($data['time_from']) || !empty($data['time_to']) ||
                             ($data['calType'] ?? 'none') !== 'none';
        
        if (!$hasTimeRestriction) {
            $errors[] = 'At least one time restriction must be configured';
        }
        
        // Validate action requirements
        if ($data['action'] === 'extension' && empty($data['extension'])) {
            $errors[] = 'Extension is required when action is redirect';
        }
        
        if ($data['action'] === 'playback' && ($data['audio_message_id'] ?? -1) <= 0) {
            $errors[] = 'Audio message is required when action is playback';
        }
        
        // Validate calendar URL if calendar type is set
        if (in_array($data['calType'] ?? 'none', ['caldav', 'ics']) && empty($data['calUrl'])) {
            $errors[] = 'Calendar URL is required for calendar type ' . $data['calType'];
        }
        
        return $errors;
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutOffWorkTime/DeleteRecordAction.php`
```php
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

namespace MikoPBX\PBXCoreREST\Lib\OutOffWorkTime;

use MikoPBX\Common\Models\OutOffWorkTime;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteRecordAction;

/**
 * Action for deleting out-of-work-time record
 * 
 * @api {delete} /pbxcore/api/v2/out-off-work-time/deleteRecord/:id Delete out-of-work-time rule
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup OutOffWorkTime
 * 
 * @apiParam {String} id Record ID to delete
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Deletion result
 */
class DeleteRecordAction extends AbstractDeleteRecordAction
{
    /**
     * Delete out-of-work-time record
     * 
     * @param string $id Record ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        return self::executeStandardDelete(
            OutOffWorkTime::class,
            $id
        );
    }
}
```

#### 1.2 DataStructure Class

**File**: `src/PBXCoreREST/Lib/OutOffWorkTime/DataStructure.php`
```php
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

namespace MikoPBX\PBXCoreREST\Lib\OutOffWorkTime;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for Out-of-Work-Time rules
 * 
 * @package MikoPBX\PBXCoreREST\Lib\OutOffWorkTime
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create complete data array from OutOffWorkTime model
     * 
     * @param \MikoPBX\Common\Models\OutOffWorkTime $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        // Start with base structure
        $data = self::createBaseStructure($model);
        
        // Add out-of-work-time specific fields
        $data['date_from'] = $model->date_from ?? '';
        $data['date_to'] = $model->date_to ?? '';
        $data['weekday_from'] = (int)($model->weekday_from ?? -1);
        $data['weekday_to'] = (int)($model->weekday_to ?? -1);
        $data['time_from'] = $model->time_from ?? '';
        $data['time_to'] = $model->time_to ?? '';
        $data['action'] = $model->action ?? 'extension';
        $data['extension'] = $model->extension ?? '';
        $data['audio_message_id'] = (string)($model->audio_message_id ?? -1);
        $data['description'] = $model->description ?? '';
        $data['calType'] = $model->calType ?? 'none';
        $data['calUrl'] = $model->calUrl ?? '';
        $data['isCalDav'] = $model->isCalDav ?? '0';
        $data['allowRestriction'] = $model->allowRestriction ?? 'allow';
        
        // Add extension details
        $data = array_merge($data, self::getExtensionData($model->Extensions));
        
        // Add sound file field using unified approach
        $data = self::addSoundFileField($data, 'audio_message_id', $model->audio_message_id, '_Represent');
        
        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data, [
            'date_from', 'date_to', 'time_from', 'time_to',
            'extension', 'description', 'calUrl'
        ]);
        
        return $data;
    }
    
    /**
     * Create simplified data array for list view
     * 
     * @param \MikoPBX\Common\Models\OutOffWorkTime $model
     * @return array
     */
    public static function createForList($model): array
    {
        $data = self::createBaseStructure($model);
        
        // Add essential fields for list display
        $data['description'] = $model->description ?? '';
        $data['date_from'] = $model->date_from ?? '';
        $data['date_to'] = $model->date_to ?? '';
        $data['weekday_from'] = (int)($model->weekday_from ?? -1);
        $data['weekday_to'] = (int)($model->weekday_to ?? -1);
        $data['time_from'] = $model->time_from ?? '';
        $data['time_to'] = $model->time_to ?? '';
        $data['action'] = $model->action ?? 'extension';
        $data['extension'] = $model->extension ?? '';
        $data['audio_message_id'] = (string)($model->audio_message_id ?? -1);
        $data['calType'] = $model->calType ?? 'none';
        $data['allowRestriction'] = $model->allowRestriction ?? 'allow';
        
        // Add extension representation for list display
        $extensionData = self::getExtensionData($model->Extensions);
        $data['extensionRepresent'] = $extensionData['extensionName'];
        
        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data, [
            'description', 'date_from', 'date_to', 'time_from', 'time_to', 'extension'
        ]);
        
        return $data;
    }
}
```

#### 1.3 Management Processor

**File**: `src/PBXCoreREST/Lib/OutOffWorkTimeManagementProcessor.php`
```php
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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\OutOffWorkTime\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction
};
use Phalcon\Di\Injectable;

/**
 * Available actions for out-of-work-time management
 */
enum OutOffWorkTimeAction: string
{
    case GET_RECORD = 'getRecord';
    case GET_LIST = 'getList';
    case SAVE_RECORD = 'saveRecord';
    case DELETE_RECORD = 'deleteRecord';
}

/**
 * Out-of-work-time management processor
 *
 * Handles all out-of-work-time management operations including:
 * - getRecord: Get single rule by ID or create new structure
 * - getList: Get list of all rules
 * - saveRecord: Create or update rule
 * - deleteRecord: Delete rule
 */
class OutOffWorkTimeManagementProcessor extends Injectable
{
    /**
     * Process out-of-work-time management requests
     *
     * @param array $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        $data = $request['data'];
        
        // Try to match action with enum
        $action = OutOffWorkTimeAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        $res = match ($action) {
            OutOffWorkTimeAction::GET_RECORD => GetRecordAction::main($data['id'] ?? null),
            OutOffWorkTimeAction::GET_LIST => GetListAction::main($data),
            OutOffWorkTimeAction::SAVE_RECORD => SaveRecordAction::main($data),
            OutOffWorkTimeAction::DELETE_RECORD => DeleteRecordAction::main($data['id'] ?? ''),
        };

        $res->function = $actionString;
        return $res;
    }
}
```

#### 1.4 REST API Controllers

**File**: `src/PBXCoreREST/Controllers/OutOffWorkTime/GetController.php`
```php
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

namespace MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutOffWorkTimeManagementProcessor;

/**
 * GET controller for out-of-work-time management
 * 
 * @RoutePrefix("/pbxcore/api/v2/out-off-work-time")
 */
class GetController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    
    /**
     * Handle the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get out-of-work-time record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all out-of-work-time rules
     * @Get("/getList")
     * 
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        $requestData = $this->request->get();
        
        if (!empty($id)) {
            $requestData['id'] = $id;
        }
        
        $this->sendRequestToBackendWorker(
            OutOffWorkTimeManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
```

**File**: `src/PBXCoreREST/Controllers/OutOffWorkTime/PostController.php`
```php
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

namespace MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutOffWorkTimeManagementProcessor;

/**
 * POST controller for out-of-work-time management
 * 
 * @RoutePrefix("/pbxcore/api/v2/out-off-work-time")
 */
class PostController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates out-of-work-time record
     * @Post("/saveRecord")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        
        $this->sendRequestToBackendWorker(
            OutOffWorkTimeManagementProcessor::class,
            $actionName,
            $postData
        );
    }
}
```

**File**: `src/PBXCoreREST/Controllers/OutOffWorkTime/PutController.php`
```php
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

namespace MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutOffWorkTimeManagementProcessor;

/**
 * PUT controller for out-of-work-time management
 * 
 * @RoutePrefix("/pbxcore/api/v2/out-off-work-time")
 */
class PutController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Out-of-work-time rule ID for update operations
     * 
     * Updates existing out-of-work-time record
     * @Put("/saveRecord/{id}")
     * 
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        if (empty($id)) {
            $this->response->setJsonContent([
                'result' => false,
                'messages' => ['error' => ['Empty ID in request data']]
            ]);
            $this->response->send();
            return;
        }

        $putData = self::sanitizeData($this->request->getPut(), $this->filter);
        $putData['id'] = $id;
        
        $this->sendRequestToBackendWorker(
            OutOffWorkTimeManagementProcessor::class,
            $actionName,
            $putData
        );
    }
}
```

**File**: `src/PBXCoreREST/Controllers/OutOffWorkTime/DeleteController.php`
```php
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

namespace MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutOffWorkTimeManagementProcessor;

/**
 * DELETE controller for out-of-work-time management
 * 
 * @RoutePrefix("/pbxcore/api/v2/out-off-work-time")
 */
class DeleteController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Out-of-work-time rule ID to delete
     * 
     * Deletes out-of-work-time record
     * @Delete("/deleteRecord/{id}")
     * 
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        if (empty($id)) {
            $this->response->setJsonContent([
                'result' => false,
                'messages' => ['error' => ['Empty ID in request data']]
            ]);
            $this->response->send();
            return;
        }
        
        $deleteData = ['id' => $id];
        
        $this->sendRequestToBackendWorker(
            OutOffWorkTimeManagementProcessor::class,
            $actionName,
            $deleteData
        );
    }
}
```

### Phase 2: Frontend JavaScript Implementation

#### 2.1 API Client Module

**File**: `sites/admin-cabinet/assets/js/src/PbxAPI/outOffWorkTimeAPI.js`
```javascript
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

/* global globalRootUrl, PbxApi, globalTranslate */

/**
 * OutOffWorkTimeAPI - REST API client for out-of-work-time management
 * 
 * Uses unified approach with centralized endpoint definitions.
 * This provides:
 * - Single point of API URL management
 * - Easy API version switching (v2 -> v3)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
const OutOffWorkTimeAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/out-off-work-time/`,
    
    // Endpoint definitions for unification
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/out-off-work-time/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/out-off-work-time/getRecord`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/out-off-work-time/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/out-off-work-time/deleteRecord`
    },
    
    /**
     * Get record by ID
     * @param {string} id - Record ID or empty string for new
     * @param {function} callback - Callback function
     */
    getRecord(id, callback) {
        const recordId = (!id || id === '') ? 'new' : id;
        
        $.api({
            url: `${this.endpoints.getRecord}/${recordId}`,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    },
    
    /**
     * Get list of all records
     * @param {function} callback - Callback function
     */
    getList(callback) {
        $.api({
            url: this.endpoints.getList,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, data: []});
            }
        });
    },
    
    /**
     * Save record
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */
    saveRecord(data, callback) {
        const method = data.id ? 'PUT' : 'POST';
        const url = data.id ? 
            `${this.endpoints.saveRecord}/${data.id}` : 
            this.endpoints.saveRecord;
        
        $.api({
            url: url,
            method: method,
            data: data,
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    },
    
    /**
     * Delete record
     * @param {string} id - Record ID
     * @param {function} callback - Callback function
     */
    deleteRecord(id, callback) {
        $.api({
            url: `${this.endpoints.deleteRecord}/${id}`,
            on: 'now',
            method: 'DELETE',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
            }
        });
    }
};
```

#### 2.2 Form Edit Module

The form module will integrate with the unified Form.js mechanism, supporting all standard features like dirty checking, save modes, and validation.

#### 2.3 List Module

The list module will use DataTables for display with AJAX loading directly from the REST API.

### Phase 3: Integration Points

#### 3.1 Router Provider Update

Add routes to `src/PBXCoreREST/Providers/RouterProvider.php`:

```php
use MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime\{
    GetController as OutOffWorkTimeGetController,
    PostController as OutOffWorkTimePostController,
    PutController as OutOffWorkTimePutController,
    DeleteController as OutOffWorkTimeDeleteController
};

// In getRoutes() method, add:
// GET routes
[OutOffWorkTimeGetController::class, 'callAction', '/pbxcore/api/v2/out-off-work-time/{actionName}', 'get', '/'],
[OutOffWorkTimeGetController::class, 'callAction', '/pbxcore/api/v2/out-off-work-time/{actionName}/{id}', 'get', '/'],

// POST route
[OutOffWorkTimePostController::class, 'callAction', '/pbxcore/api/v2/out-off-work-time/{actionName}', 'post', '/'],

// PUT route
[OutOffWorkTimePutController::class, 'callAction', '/pbxcore/api/v2/out-off-work-time/{actionName}/{id}', 'put', '/'],

// DELETE route
[OutOffWorkTimeDeleteController::class, 'callAction', '/pbxcore/api/v2/out-off-work-time/{actionName}/{id}', 'delete', '/'],
```

#### 3.2 AdminCabinet Controller Update

Update `src/AdminCabinet/Controllers/OutOffWorkTimeController.php` to use REST API for data fetching.

#### 3.3 Asset Provider Update

Update `src/AdminCabinet/Providers/AssetProvider.php` to include new JavaScript modules.

## Key Improvements Over Previous Plan

### 1. Architecture Enhancements
- ✅ Uses abstract base classes (AbstractGetListAction, AbstractSaveRecordAction, etc.)
- ✅ Implements enum for action types (type safety)
- ✅ CSRF protection enabled on all controllers
- ✅ Unified text field processing with TextFieldProcessor
- ✅ Consistent error handling and logging

### 2. Code Reusability
- ✅ Extends abstract classes to eliminate code duplication
- ✅ Uses AbstractDataStructure for consistent data transformation
- ✅ Leverages executeStandardList, executeStandardGet, executeStandardDelete methods
- ✅ Unified sanitization patterns across all save operations

### 3. Modern PHP Patterns
- ✅ PHP 8.3 features (enums, match expressions, typed properties)
- ✅ Strict type declarations
- ✅ Proper namespace organization
- ✅ Transaction-based operations with proper rollback

### 4. Security & Validation
- ✅ Two-level data sanitization (controller + action)
- ✅ Dangerous content detection in text fields
- ✅ Input validation with specific business rules
- ✅ CSRF protection on all mutation endpoints

### 5. Performance Optimizations
- ✅ createForList() method for lightweight list data
- ✅ Efficient query patterns with proper indexing
- ✅ Minimal data transfer for list operations
- ✅ Support for future pagination and search

## Testing Strategy

### API Endpoint Testing
```bash
# Get list of rules
curl -X GET http://127.0.0.1/pbxcore/api/v2/out-off-work-time/getList

# Get specific rule
curl -X GET http://127.0.0.1/pbxcore/api/v2/out-off-work-time/getRecord/1

# Create new rule
curl -X POST http://127.0.0.1/pbxcore/api/v2/out-off-work-time/saveRecord \
  -d "description=Weekend&weekday_from=6&weekday_to=7&action=playback&audio_message_id=1"

# Update existing rule
curl -X PUT http://127.0.0.1/pbxcore/api/v2/out-off-work-time/saveRecord/1 \
  -d "description=Updated Weekend&action=extension&extension=101"

# Delete rule
curl -X DELETE http://127.0.0.1/pbxcore/api/v2/out-off-work-time/deleteRecord/1
```

### PHPStan Analysis
```bash
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse \
  /offload/rootfs/usr/www/src/PBXCoreREST/Lib/OutOffWorkTime/
```

### JavaScript Transpilation
```bash
npm run build:outofworktime
```

## Expected Outcomes

After implementing this plan:

1. **Unified Architecture**: Consistent with other REST API v2 modules
2. **Code Quality**: Reduced duplication through abstract classes
3. **Type Safety**: Enums and strict typing throughout
4. **Performance**: Optimized data structures for different use cases
5. **Maintainability**: Clear separation of concerns
6. **Security**: Multi-layer validation and sanitization
7. **UI/UX Consistency**: Preserved existing user experience
8. **Future-Ready**: Prepared for pagination, search, and filtering

## Migration Checklist

- [ ] Create action classes extending abstract base classes
- [ ] Create DataStructure class with createFromModel and createForList
- [ ] Create management processor with enum actions
- [ ] Create REST controllers with CSRF protection
- [ ] Update RouterProvider with new routes
- [ ] Create JavaScript API client module
- [ ] Update form and list JavaScript modules
- [ ] Update AdminCabinet controller
- [ ] Update AssetProvider
- [ ] Add translations
- [ ] Run PHPStan analysis
- [ ] Transpile JavaScript
- [ ] Test all endpoints
- [ ] Verify UI functionality
- [ ] Document API endpoints

## Conclusion

This migration plan aligns Out-of-Work-Time management with the modern REST API v2 architecture established in Incoming Routes and other modules. By leveraging abstract base classes and following consistent patterns, we achieve better code quality, maintainability, and performance while preserving the user experience.