# MikoPBX Out Off Work Time REST API Migration Plan

## Project Overview

This document contains a detailed plan for adapting the MikoPBX out of work time management system to use a unified REST API architecture. The plan is based on the guide `docs/mikopbx-rest-migration-guide.md` and the conference rooms migration plan, following the principles of minimal changes to the user interface.

## Current State

### Existing Architecture
- **Model**: `src/Common/Models/OutOffWorkTime.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/OutOffWorkTimeController.php`
- **Form**: `src/AdminCabinet/Forms/OutOffWorkTimeEditForm.php`
- **No REST API**: Currently no REST endpoints implemented
- **JavaScript**: Basic list and form handling

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

## Detailed Implementation Plan

### Stage 1: Creating REST API Backend

#### 1.1 MikoPBX REST API Architecture

**Important**: In MikoPBX REST API architecture, Action classes are executed in Workers without HTTP context. Therefore, they should not inherit from Injectable and work with $this->request directly.

**Correct Flow**:
```
HTTP Request → Controller → Worker → Action → Database → Response
```

#### 1.2 Action Classes for Out Off Work Time

**File**: `src/PBXCoreREST/Lib/OutOffWorkTime/GetRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\OutOffWorkTime;

use MikoPBX\Common\Models\OutOffWorkTime;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting out of work time record
 * 
 * @api {get} /pbxcore/api/v2/out-off-work-time/getRecord/:id Get out of work time record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup OutOffWorkTime
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Out of work time data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.date_from Start date
 * @apiSuccess {String} data.date_to End date
 * @apiSuccess {String} data.weekday_from Start weekday (1-7)
 * @apiSuccess {String} data.weekday_to End weekday (1-7)
 * @apiSuccess {String} data.time_from Start time
 * @apiSuccess {String} data.time_to End time
 * @apiSuccess {String} data.action Action type
 * @apiSuccess {String} data.extension Extension for redirect
 * @apiSuccess {String} data.audio_message_id Audio message ID
 * @apiSuccess {String} data.description Description
 * @apiSuccess {String} data.calType Calendar type
 * @apiSuccess {String} data.calUrl Calendar URL
 * @apiSuccess {String} data.isCalDav Is CalDAV
 * @apiSuccess {String} data.allowRestriction Restriction mode
 */
class GetRecordAction
{
    /**
     * Get out of work time record
     * @param string|null $id - Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id) || $id === 'new') {
            // Create structure for new record
            $newRule = new OutOffWorkTime();
            $newRule->id = '';
            $newRule->date_from = '';
            $newRule->date_to = '';
            $newRule->weekday_from = -1;
            $newRule->weekday_to = -1;
            $newRule->time_from = '';
            $newRule->time_to = ''; 
            $newRule->action = 'extension';
            $newRule->extension = '';
            $newRule->audio_message_id = -1;
            $newRule->description = '';
            $newRule->calType = 'none';
            $newRule->calUrl = '';
            $newRule->isCalDav = '0';
            $newRule->allowRestriction = 'allow';
            
            $res->data = DataStructure::createFromModel($newRule);
            $res->success = true;
        } else {
            // Find existing record
            $rule = OutOffWorkTime::findFirstById($id);
            
            if ($rule) {
                $res->data = DataStructure::createFromModel($rule);
                $res->success = true;
            } else {
                $res->messages['error'][] = 'Out of work time rule not found';
            }
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutOffWorkTime/GetListAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\OutOffWorkTime;

use MikoPBX\Common\Models\OutOffWorkTime;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all out of work time rules
 * 
 * @api {get} /pbxcore/api/v2/out-off-work-time/getList Get all out of work time rules
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup OutOffWorkTime
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of out of work time rules
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.date_from Start date
 * @apiSuccess {String} data.date_to End date
 * @apiSuccess {String} data.weekday_from Start weekday
 * @apiSuccess {String} data.weekday_to End weekday
 * @apiSuccess {String} data.time_from Start time
 * @apiSuccess {String} data.time_to End time
 * @apiSuccess {String} data.action Action type
 * @apiSuccess {String} data.extension Extension
 * @apiSuccess {String} data.audio_message_id Audio message ID
 * @apiSuccess {String} data.description Description
 * @apiSuccess {String} data.calType Calendar type
 * @apiSuccess {String} data.calUrl Calendar URL
 * @apiSuccess {String} data.isCalDav Is CalDAV
 * @apiSuccess {String} data.allowRestriction Restriction mode
 */
class GetListAction
{
    /**
     * Get list of all out of work time rules
     * 
     * @param array $data - Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get all rules sorted by ID
            $rules = OutOffWorkTime::find([
                'order' => 'id ASC'
            ]);
            
            $data = [];
            foreach ($rules as $rule) {
                $data[] = DataStructure::createFromModel($rule);
            }
            
            $res->data = $data;
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutOffWorkTime/SaveRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\OutOffWorkTime;

use MikoPBX\Common\Models\OutOffWorkTime;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for saving out of work time record
 * 
 * @api {post} /pbxcore/api/v2/out-off-work-time/saveRecord Create out of work time rule
 * @api {put} /pbxcore/api/v2/out-off-work-time/saveRecord/:id Update out of work time rule
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
 * @apiSuccess {Object} data Saved out of work time data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction
{
    /**
     * Save out of work time record
     * @param array $data - Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Data sanitization
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
            'description' => 'string|html_escape|max:255|empty_to_null',
            'calType' => 'string|in:none,caldav,ics',
            'calUrl' => 'string|url|max:500|empty_to_null',
            'isCalDav' => 'string|in:0,1',
            'allowRestriction' => 'string|in:allow,deny'
        ];
        $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);
        
        // Validate required fields based on rule type
        $validationErrors = self::validateRule($data);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Get or create model
        if (!empty($data['id'])) {
            $rule = OutOffWorkTime::findFirstById($data['id']);
            if (!$rule) {
                $res->messages['error'][] = 'api_OutOffWorkTimeNotFound';
                return $res;
            }
        } else {
            $rule = new OutOffWorkTime();
        }
        
        try {
            // Save in transaction using BaseActionHelper
            $savedRule = BaseActionHelper::executeInTransaction(function() use ($rule, $data) {
                // Update rule fields
                foreach ($data as $key => $value) {
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
                    throw new \Exception(implode(', ', $rule->getMessages()));
                }
                
                return $rule;
            });
            
            $res->data = DataStructure::createFromModel($savedRule);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "out-off-work-time/modify/{$savedRule->id}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Validate rule data
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

**File**: `src/PBXCoreREST/Lib/OutOffWorkTime/DataStructure.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\OutOffWorkTime;

/**
 * Data structure for out of work time rules
 * 
 * @package MikoPBX\PBXCoreREST\Lib\OutOffWorkTime
 */
class DataStructure
{
    /**
     * Create data array from OutOffWorkTime model
     * @param \MikoPBX\Common\Models\OutOffWorkTime $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        return [
            'id' => (string)$model->id,
            'date_from' => $model->date_from ?? '',
            'date_to' => $model->date_to ?? '',
            'weekday_from' => (string)($model->weekday_from ?? -1),
            'weekday_to' => (string)($model->weekday_to ?? -1),
            'time_from' => $model->time_from ?? '',
            'time_to' => $model->time_to ?? '',
            'action' => $model->action ?? 'extension',
            'extension' => $model->extension ?? '',
            'audio_message_id' => (string)($model->audio_message_id ?? -1),
            'description' => $model->description ?? '',
            'calType' => $model->calType ?? 'none',
            'calUrl' => $model->calUrl ?? '',
            'isCalDav' => $model->isCalDav ?? '0',
            'allowRestriction' => $model->allowRestriction ?? 'allow'
        ];
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutOffWorkTime/DeleteRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\OutOffWorkTime;

use MikoPBX\Common\Models\OutOffWorkTime;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for deleting out of work time record
 * 
 * @api {delete} /pbxcore/api/v2/out-off-work-time/deleteRecord/:id Delete out of work time rule
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup OutOffWorkTime
 * 
 * @apiParam {String} id Record ID to delete
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Deletion result
 * @apiSuccess {String} data.deleted_id ID of deleted record
 */
class DeleteRecordAction
{
    /**
     * Delete out of work time record
     * 
     * @param string $id - Record ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id)) {
            $res->messages['error'][] = 'Record ID is required';
            return $res;
        }
        
        try {
            // Find record by id
            $rule = OutOffWorkTime::findFirstById($id);
            
            if (!$rule) {
                $res->messages['error'][] = 'api_OutOffWorkTimeNotFound';
                return $res;
            }
            
            // Delete in transaction using BaseActionHelper
            BaseActionHelper::executeInTransaction(function() use ($rule) {
                if (!$rule->delete()) {
                    throw new \Exception('Failed to delete out of work time rule: ' . implode(', ', $rule->getMessages()));
                }
                
                return true;
            });
            
            $res->success = true;
            $res->data = ['deleted_id' => $id];
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

#### 1.3 REST API Controllers

**File**: `src/PBXCoreREST/Controllers/OutOffWorkTime/GetController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutOffWorkTimeManagementProcessor;

/**
 * GET controller for out of work time management
 * 
 * @RoutePrefix("/pbxcore/api/v2/out-off-work-time")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/out-off-work-time/getRecord/1
 * curl http://127.0.0.1/pbxcore/api/v2/out-off-work-time/getRecord/new
 * curl http://127.0.0.1/pbxcore/api/v2/out-off-work-time/getList
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get out of work time record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all out of work time rules
     * @Get("/getList")
     * 
     * @param string $actionName
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        $requestData = $this->request->get();
        
        if (!empty($id)){
            $requestData['id'] = $id;
        }
        
        // Send request to Worker
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
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutOffWorkTimeManagementProcessor;

/**
 * POST controller for out of work time management
 * 
 * @RoutePrefix("/pbxcore/api/v2/out-off-work-time")
 * 
 * @examples
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/out-off-work-time/saveRecord \
 *   -d "description=Weekend&weekday_from=6&weekday_to=7&action=playback&audio_message_id=1"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates out of work time record
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
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutOffWorkTimeManagementProcessor;

/**
 * PUT controller for out of work time management
 * 
 * @RoutePrefix("/pbxcore/api/v2/out-off-work-time")
 * 
 * @examples
 * curl -X PUT http://127.0.0.1/pbxcore/api/v2/out-off-work-time/saveRecord/1 \
 *   -d "description=Updated Weekend&weekday_from=6&weekday_to=7&action=extension&extension=101"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime
 */
class PutController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Out of work time rule ID for update operations
     * 
     * Updates existing out of work time record
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
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutOffWorkTimeManagementProcessor;

/**
 * DELETE controller for out of work time management
 * 
 * @RoutePrefix("/pbxcore/api/v2/out-off-work-time")
 * 
 * @examples
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v2/out-off-work-time/deleteRecord/1
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\OutOffWorkTime
 */
class DeleteController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Out of work time rule ID to delete
     * 
     * Deletes out of work time record
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

#### 1.4 Create Processor

**File**: `src/PBXCoreREST/Lib/OutOffWorkTimeManagementProcessor.php`
```php
<?php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\OutOffWorkTime\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction
};
use Phalcon\Di\Injectable;

/**
 * Out of work time management processor
 *
 * Handles all out of work time management operations including:
 * - getRecord: Get single rule by ID or create new structure
 * - getList: Get list of all rules
 * - saveRecord: Create or update rule
 * - deleteRecord: Delete rule
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class OutOffWorkTimeManagementProcessor extends Injectable
{
    /**
     * Processes out of work time management requests
     *
     * @param array $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $action = $request['action'];
        $data = $request['data'];
        
        switch ($action) {
            case 'getRecord':
                $recordId = $data['id'] ?? null;
                $res = GetRecordAction::main($recordId);
                break;
                
            case 'getList':
                $res = GetListAction::main($data);
                break;
                
            case 'saveRecord':
                $res = SaveRecordAction::main($data);
                break;
                
            case 'deleteRecord':
                if (!empty($data['id'])) {
                    $res = DeleteRecordAction::main($data['id']);
                } else {
                    $res->messages['error'][] = 'Empty ID in request data';
                }
                break;
                
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;
        return $res;
    }
}
```

#### 1.5 REST API Routes

**Add to file**: `src/PBXCoreREST/Providers/RouterProvider.php`

Add to imports:
```php
use OutOffWorkTime\GetController as OutOffWorkTimeGetController,
    OutOffWorkTime\PostController as OutOffWorkTimePostController,
    OutOffWorkTime\PutController as OutOffWorkTimePutController,
    OutOffWorkTime\DeleteController as OutOffWorkTimeDeleteController;
```

Add to routes array:
```php
// GET routes
[
    OutOffWorkTimeGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/out-off-work-time/{actionName}', 
    'get', 
    '/'
],
[
    OutOffWorkTimeGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/out-off-work-time/{actionName}/{id:[0-9]+}', 
    'get', 
    '/'
],
// POST route
[
    OutOffWorkTimePostController::class, 
    'callAction', 
    '/pbxcore/api/v2/out-off-work-time/{actionName}', 
    'post', 
    '/'
],
// PUT route
[
    OutOffWorkTimePutController::class, 
    'callAction', 
    '/pbxcore/api/v2/out-off-work-time/{actionName}/{id:[0-9]+}', 
    'put', 
    '/'
],
// DELETE route
[
    OutOffWorkTimeDeleteController::class, 
    'callAction', 
    '/pbxcore/api/v2/out-off-work-time/{actionName}/{id:[0-9]+}', 
    'delete', 
    '/'
],
```

### Stage 2: Update JavaScript Client

#### 2.1 Create API Methods

**File**: `sites/admin-cabinet/assets/js/src/PbxAPI/outOffWorkTimeAPI.js`
```javascript
//<Copyright>

/* global globalRootUrl, PbxApi, globalTranslate */

/**
 * OutOffWorkTimeAPI - REST API for out of work time management
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

**File**: `sites/admin-cabinet/assets/js/src/OutOffWorkTime/out-off-work-time-modify.js`
```javascript
//<Copyright>

/* global globalRootUrl, OutOffWorkTimeAPI, Form, globalTranslate, UserMessage, Extensions, SoundFilesSelector */

/**
 * Out of work time edit form management module
 */
const outOffWorkTimeModify = {
    $formObj: $('#out-off-work-time-form'),
    $forwardingSelect: $('#action'),
    $audioMessageRow: $('#audio-message-row'),
    $extensionRow: $('#extension-row'),
    $tabMenuItems: $('#out-off-work-time-menu .item'),
    defaultExtension: '',
    
    /**
     * Validation rules
     */
    validateRules: {
        description: {
            identifier: 'description',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.oowt_ValidateDescriptionIsEmpty
                }
            ]
        },
        extension: {
            depends: 'action',
            identifier: 'extension',
            rules: [
                {
                    type: 'extensionRule',
                    prompt: globalTranslate.oowt_ValidateForwardingIsEmpty
                }
            ]
        },
        audio_message_id: {
            depends: 'action',
            identifier: 'audio_message_id',
            rules: [
                {
                    type: 'audioMessageRule',
                    prompt: globalTranslate.oowt_ValidateAudioMessageIsEmpty
                }
            ]
        },
        timefrom: {
            identifier: 'time_from',
            optional: true,
            rules: [
                {
                    type: 'regExp[/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/]',
                    prompt: globalTranslate.oowt_ValidateTimeFormat
                }
            ]
        },
        timeto: {
            identifier: 'time_to',
            optional: true,
            rules: [
                {
                    type: 'regExp[/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/]',
                    prompt: globalTranslate.oowt_ValidateTimeFormat
                }
            ]
        }
    },
    
    /**
     * Module initialization
     */
    initialize() {
        // Initialize tab menu
        outOffWorkTimeModify.$tabMenuItems.tab();
        
        // Initialize calendars
        $('#rangeDaysStart').calendar({
            type: 'date',
            firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
            text: SemanticLocalization.calendarText,
            endCalendar: $('#rangeDaysEnd'),
            formatter: {
                date(date) {
                    const options = {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    };
                    return date ? date.toLocaleDateString(globalWebAdminLanguage, options) : '';
                },
            },
            onChange(date, text) {
                outOffWorkTimeModify.$formObj.form('set value', 'date_from', text);
            }
        });
        
        $('#rangeDaysEnd').calendar({
            type: 'date',
            firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
            text: SemanticLocalization.calendarText,
            startCalendar: $('#rangeDaysStart'),
            formatter: {
                date(date) {
                    const options = {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    };
                    return date ? date.toLocaleDateString(globalWebAdminLanguage, options) : '';
                },
            },
            onChange(date, text) {
                outOffWorkTimeModify.$formObj.form('set value', 'date_to', text);
            }
        });
        
        // Time calendars
        $('#rangeTimeStart').calendar({
            type: 'time',
            ampm: false,
            firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
            text: SemanticLocalization.calendarText,
            endCalendar: $('#rangeTimeEnd'),
            onChange(date, text) {
                outOffWorkTimeModify.$formObj.form('set value', 'time_from', text);
            }
        });
        
        $('#rangeTimeEnd').calendar({
            type: 'time',
            ampm: false,
            firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
            text: SemanticLocalization.calendarText,
            startCalendar: $('#rangeTimeStart'),
            onChange(date, text) {
                outOffWorkTimeModify.$formObj.form('set value', 'time_to', text);
            }
        });
        
        // Initialize weekday dropdowns
        $('#weekday_from, #weekday_to').dropdown();
        
        // Initialize forwarding dropdown with onChange handler
        outOffWorkTimeModify.$forwardingSelect.dropdown({
            onChange(value) {
                outOffWorkTimeModify.toggleDisabledFieldClass(value);
            }
        });
        
        // Initialize SoundFilesSelector if available
        if (typeof SoundFilesSelector !== 'undefined') {
            SoundFilesSelector.initialize();
        }
        
        // Configure Form.js
        Form.$formObj = outOffWorkTimeModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = outOffWorkTimeModify.validateRules;
        Form.cbBeforeSendForm = outOffWorkTimeModify.cbBeforeSendForm;
        Form.cbAfterSendForm = outOffWorkTimeModify.cbAfterSendForm;
        
        // Setup REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = OutOffWorkTimeAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}out-off-work-time/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}out-off-work-time/modify/`;
        
        // Initialize Form with all standard features
        Form.initialize();
        
        // Load form data
        outOffWorkTimeModify.initializeForm();
    },
    
    /**
     * Load data into form
     */
    initializeForm() {
        const recordId = outOffWorkTimeModify.getRecordId();
        
        OutOffWorkTimeAPI.getRecord(recordId, (response) => {
            if (response.result) {
                outOffWorkTimeModify.populateForm(response.data);
                // Get the default extension from the form
                outOffWorkTimeModify.defaultExtension = outOffWorkTimeModify.$formObj.form('get value', 'extension');
                
                // Update UI based on action value
                const action = outOffWorkTimeModify.$formObj.form('get value', 'action');
                outOffWorkTimeModify.toggleDisabledFieldClass(action);
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load out of work time data');
            }
        });
    },
    
    /**
     * Get record ID from URL
     */
    getRecordId() {
        const urlParts = window.location.pathname.split('/');
        const modifyIndex = urlParts.indexOf('modify');
        if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
            return urlParts[modifyIndex + 1];
        }
        return '';
    },
    
    /**
     * Toggle visibility of fields based on action selection
     */
    toggleDisabledFieldClass(value) {
        if (value === 'extension') {
            outOffWorkTimeModify.$audioMessageRow.hide();
            outOffWorkTimeModify.$extensionRow.show();
        } else if (value === 'playback') {
            outOffWorkTimeModify.$extensionRow.hide();
            outOffWorkTimeModify.$audioMessageRow.show();
        }
    },
    
    /**
     * Callback before form submission
     */
    cbBeforeSendForm(settings) {
        // Convert date formats for backend
        const data = outOffWorkTimeModify.$formObj.form('get values');
        
        // Convert dates to YYYY-MM-DD format if needed
        if (data.date_from) {
            const parts = data.date_from.split(/[\/.-]/);
            if (parts.length === 3 && parts[0].length <= 2) {
                // Assuming DD/MM/YYYY or DD-MM-YYYY format
                data.date_from = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        
        if (data.date_to) {
            const parts = data.date_to.split(/[\/.-]/);
            if (parts.length === 3 && parts[0].length <= 2) {
                data.date_to = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        
        // Update form values
        outOffWorkTimeModify.$formObj.form('set values', data);
        
        return settings;
    },
    
    /**
     * Callback after form submission
     */
    cbAfterSendForm(response) {
        if (response.result) {
            if (response.data) {
                outOffWorkTimeModify.populateForm(response.data);
            }
            
            // Update URL for new records
            const currentId = $('#id').val();
            if (!currentId && response.data && response.data.id) {
                const newUrl = window.location.href.replace(/modify\/?$/, `modify/${response.data.id}`);
                window.history.pushState(null, '', newUrl);
            }
        }
    },
    
    /**
     * Populate form with data
     */
    populateForm(data) {
        // Convert dates from YYYY-MM-DD to locale format for display
        if (data.date_from) {
            const [year, month, day] = data.date_from.split('-');
            const date = new Date(year, month - 1, day);
            const options = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            };
            data.date_from = date.toLocaleDateString(globalWebAdminLanguage, options);
        }
        
        if (data.date_to) {
            const [year, month, day] = data.date_to.split('-');
            const date = new Date(year, month - 1, day);
            const options = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            };
            data.date_to = date.toLocaleDateString(globalWebAdminLanguage, options);
        }
        
        Form.$formObj.form('set values', data);
        
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    }
};

/**
 * Custom validation rule for extension field
 */
$.fn.form.settings.rules.extensionRule = function(value) {
    const action = outOffWorkTimeModify.$formObj.form('get value', 'action');
    return action !== 'extension' || (value && value.length > 0);
};

/**
 * Custom validation rule for audio message field
 */
$.fn.form.settings.rules.audioMessageRule = function(value) {
    const action = outOffWorkTimeModify.$formObj.form('get value', 'action');
    return action !== 'playback' || (value && value !== '-1');
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    outOffWorkTimeModify.initialize();
});
```

#### 2.3 Update List Module

**File**: `sites/admin-cabinet/assets/js/src/OutOffWorkTime/out-off-work-time-index.js`
```javascript
//<Copyright>

/* global globalRootUrl, OutOffWorkTimeAPI, globalTranslate, UserMessage, SemanticLocalization */

/**
 * Out of work time table management module
 */
const outOffWorkTimeTable = {
    $timeFramesTable: $('#time-frames-table'),
    dataTable: {},

    /**
     * Initialize the module
     */
    initialize() {
        // Initially show placeholder until data loads
        outOffWorkTimeTable.toggleEmptyPlaceholder(true);
        
        outOffWorkTimeTable.initializeDataTable();
    },
    
    /**
     * Initialize DataTable
     */
    initializeDataTable() {
        outOffWorkTimeTable.dataTable = outOffWorkTimeTable.$timeFramesTable.DataTable({
            ajax: {
                url: OutOffWorkTimeAPI.endpoints.getList,
                dataSrc: function(json) {
                    // Manage empty state
                    outOffWorkTimeTable.toggleEmptyPlaceholder(
                        !json.result || !json.data || json.data.length === 0
                    );
                    return json.result ? json.data : [];
                }
            },
            columns: [
                {
                    data: 'description',
                    render: function(data, type, row) {
                        return `<strong>${data}</strong>`;
                    }
                },
                {
                    data: null,
                    className: 'center aligned collapsing',
                    render: function(data, type, row) {
                        let restrictions = [];
                        
                        // Date range
                        if (row.date_from || row.date_to) {
                            if (row.date_from && row.date_to) {
                                restrictions.push(`${globalTranslate.oowt_Dates}: ${row.date_from} - ${row.date_to}`);
                            } else if (row.date_from) {
                                restrictions.push(`${globalTranslate.oowt_DateFrom}: ${row.date_from}`);
                            } else {
                                restrictions.push(`${globalTranslate.oowt_DateTo}: ${row.date_to}`);
                            }
                        }
                        
                        // Weekdays
                        if (row.weekday_from > 0 || row.weekday_to > 0) {
                            const weekdays = outOffWorkTimeTable.getWeekdayNames(row.weekday_from, row.weekday_to);
                            restrictions.push(`${globalTranslate.oowt_Weekdays}: ${weekdays}`);
                        }
                        
                        // Time range
                        if (row.time_from || row.time_to) {
                            if (row.time_from && row.time_to) {
                                restrictions.push(`${globalTranslate.oowt_Time}: ${row.time_from} - ${row.time_to}`);
                            } else if (row.time_from) {
                                restrictions.push(`${globalTranslate.oowt_TimeFrom}: ${row.time_from}`);
                            } else {
                                restrictions.push(`${globalTranslate.oowt_TimeTo}: ${row.time_to}`);
                            }
                        }
                        
                        // Calendar
                        if (row.calType !== 'none') {
                            restrictions.push(`${globalTranslate.oowt_Calendar}: ${row.calType.toUpperCase()}`);
                        }
                        
                        return restrictions.join('<br>');
                    }
                },
                {
                    data: null,
                    className: 'center aligned',
                    render: function(data, type, row) {
                        if (row.action === 'extension') {
                            return `<i class="forward icon"></i> ${row.extension}`;
                        } else {
                            return `<i class="play icon"></i> ${globalTranslate.oowt_PlayAudioMessage}`;
                        }
                    }
                },
                {
                    data: 'allowRestriction',
                    className: 'center aligned',
                    render: function(data) {
                        if (data === 'allow') {
                            return `<i class="green check icon"></i> ${globalTranslate.oowt_AllowCalls}`;
                        } else {
                            return `<i class="red ban icon"></i> ${globalTranslate.oowt_DenyCalls}`;
                        }
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'right aligned action-buttons',
                    responsivePriority: 1,
                    render: function(data, type, row) {
                        return `<div class="ui basic icon buttons">
                            <a href="${globalRootUrl}out-off-work-time/modify/${row.id}" 
                               class="ui button popuped" 
                               data-content="${globalTranslate.bt_ToolTipEdit}">
                                <i class="edit icon"></i>
                            </a>
                            <a href="#" 
                               data-value="${row.id}" 
                               class="ui button delete two-steps-delete popuped" 
                               data-content="${globalTranslate.bt_ToolTipDelete}">
                                <i class="trash red icon"></i>
                            </a>
                        </div>`;
                    }
                }
            ],
            order: [[0, 'asc']],
            responsive: true,
            searching: false,
            paging: false,
            info: false,
            language: SemanticLocalization.dataTableLocalisation,
            drawCallback: function() {
                console.log('DataTable drawCallback triggered'); // Debug log
                
                // Initialize Semantic UI elements
                outOffWorkTimeTable.$timeFramesTable.find('.popuped').popup();
                
                // Double-click for editing
                outOffWorkTimeTable.initializeDoubleClickEdit();
            }
        });
        
        // Handle deletion using DeleteSomething.js
        outOffWorkTimeTable.$timeFramesTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const ruleId = $button.attr('data-value');
            
            // Add loading indicator and disable button
            $button.addClass('loading disabled');
            
            OutOffWorkTimeAPI.deleteRecord(ruleId, outOffWorkTimeTable.cbAfterDeleteRecord);
        });
    },
    
    /**
     * Get weekday names
     */
    getWeekdayNames(from, to) {
        const weekdays = [
            globalTranslate.oowt_Monday,
            globalTranslate.oowt_Tuesday,
            globalTranslate.oowt_Wednesday,
            globalTranslate.oowt_Thursday,
            globalTranslate.oowt_Friday,
            globalTranslate.oowt_Saturday,
            globalTranslate.oowt_Sunday
        ];
        
        if (from > 0 && to > 0) {
            if (from === to) {
                return weekdays[from - 1];
            } else {
                return `${weekdays[from - 1]} - ${weekdays[to - 1]}`;
            }
        } else if (from > 0) {
            return weekdays[from - 1];
        } else if (to > 0) {
            return weekdays[to - 1];
        }
        
        return '';
    },
    
    /**
     * Callback after record deletion
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Reload table
            outOffWorkTimeTable.dataTable.ajax.reload();
            
            UserMessage.showSuccess(globalTranslate.oowt_Deleted);
        } else {
            UserMessage.showError(
                response.messages?.error || 
                globalTranslate.oowt_NotDeleted
            );
        }
        
        // Remove loading indicator and restore button to initial state
        $('a.delete').removeClass('loading disabled');
    },
    
    /**
     * Toggle empty table placeholder visibility
     */
    toggleEmptyPlaceholder(isEmpty) {
        if (isEmpty) {
            $('#time-frames-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-button').show();
            $('#time-frames-table-container').show();
        }
    },
    
    /**
     * Initialize double-click for editing
     */
    initializeDoubleClickEdit() {
        outOffWorkTimeTable.$timeFramesTable.on('dblclick', 'tbody td:not(.action-buttons)', function() {
            const data = outOffWorkTimeTable.dataTable.row(this).data();
            if (data && data.id) {
                window.location = `${globalRootUrl}out-off-work-time/modify/${data.id}`;
            }
        });
    }
};

/**
 *  Initialize on document ready
 */
$(document).ready(() => {
    outOffWorkTimeTable.initialize();
});
```

#### 2.4 Update Volt Templates

**File**: `src/AdminCabinet/Views/OutOffWorkTime/index.volt`
```volt
<div id="add-new-button">
    {% if isAllowed('save') %}
        {{ link_to("out-off-work-time/modify", '<i class="add circle icon"></i> '~t._('oowt_AddNewTimeFrameShort'), "class": "ui blue button") }}
    {% endif %}
</div>

<div id="time-frames-table-container">
    <table class="ui selectable compact unstackable table" id="time-frames-table">
        <thead>
            <tr>
                <th>{{ t._('oowt_ColumnDescription') }}</th>
                <th>{{ t._('oowt_ColumnTimeRestrictions') }}</th>
                <th>{{ t._('oowt_ColumnAction') }}</th>
                <th>{{ t._('oowt_ColumnRestrictionMode') }}</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            <!-- DataTable will populate this -->
        </tbody>
    </table>
</div>

<div id="empty-table-placeholder" style="display: none;">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'clock outline',
        'title': t._('oowt_EmptyTableTitle'),
        'description': t._('oowt_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('oowt_AddNewTimeFrameShort'),
        'addButtonLink': 'out-off-work-time/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/out-off-work-time'
    ]) }}
</div>
```

### Stage 3: AdminCabinet Adaptation

**Changes to file**: `src/AdminCabinet/Controllers/OutOffWorkTimeController.php`

Replace data fetching logic in `modifyAction` method:
```php
<?php
//<Copyright>

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\OutOffWorkTimeEditForm;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;

class OutOffWorkTimeController extends BaseController
{
    /**
     * Build the list of out off work time rules.
     */
    public function indexAction(): void
    {
        // The data will load by DataTable AJAX
    }

    /**
     * Edit out off work time rule details.
     *
     * @param string|null $ruleId The rule ID.
     */
    public function modifyAction(string $ruleId = null): void
    {
        // Get data via REST API
        $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/v2/out-off-work-time/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            ['id' => $ruleId]
        ]);
        
        if (!$restAnswer->success) {
            $this->flash->error(json_encode($restAnswer->messages));
            $this->dispatcher->forward([
                'controller' => 'out-off-work-time',
                'action' => 'index'
            ]);
            return;
        }
        
        $rule = (object)$restAnswer->data;
        
        // Create form based on API data structure
        $this->view->form = new OutOffWorkTimeEditForm($rule);
        $this->view->represent = $rule->description ?: $this->translation->_('oowt_NewRule');
        $this->view->id = $rule->id ?: '';
    }
}
```

### Stage 4: Update AssetProvider

**Changes to file**: `src/AdminCabinet/Providers/AssetProvider.php`

Add assets for out of work time pages:
```php
private function makeOutOffWorkTimeAssets(string $action): void
{
    if ($action === 'index') {
        // DataTables for list
        $this->headerCollectionCSS
            ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
        $this->footerCollectionJS
            ->addJs('js/vendor/datatable/dataTables.semanticui.js', true);

        // Main page module
        $this->footerCollectionJS     
            ->addJs('js/pbx/PbxAPI/outOffWorkTimeAPI.js', true)
            ->addJs('js/pbx/OutOffWorkTime/out-off-work-time-index.js', true);
    } elseif ($action === 'modify') {
        $this->footerCollectionJS
            // Edit module
            ->addJs('js/pbx/main/form.js', true)
            ->addJs('js/pbx/PbxAPI/outOffWorkTimeAPI.js', true)
            ->addJs('js/pbx/SoundFiles/sound-file-selector.js', true)
            ->addJs('js/pbx/OutOffWorkTime/out-off-work-time-modify.js', true);
            
        $this->headerCollectionCSS
            ->addCss('css/vendor/datepicker/calendar.css', true);
        $this->footerCollectionJS
            ->addJs('js/vendor/datepicker/calendar.js', true);
    }
}
```

### Stage 5: Translations

**Add to file**: `src/Common/Messages/ru.php`
```php
'oowt_ValidateDescriptionIsEmpty' => 'Не заполнено описание правила',
'oowt_ValidateForwardingIsEmpty' => 'Не выбран номер для переадресации',
'oowt_ValidateAudioMessageIsEmpty' => 'Не выбрано аудио сообщение',
'oowt_ValidateTimeFormat' => 'Неверный формат времени. Используйте ЧЧ:ММ',
'oowt_Deleted' => 'Правило нерабочего времени удалено',
'oowt_NotDeleted' => 'Не удалось удалить правило нерабочего времени',
'oowt_ColumnDescription' => 'Описание',
'oowt_ColumnTimeRestrictions' => 'Временные ограничения',
'oowt_ColumnAction' => 'Действие',
'oowt_ColumnRestrictionMode' => 'Режим',
'oowt_EmptyTableTitle' => 'Нет правил нерабочего времени',
'oowt_EmptyTableDescription' => 'Создайте правила для управления входящими звонками в нерабочее время',
'oowt_Dates' => 'Даты',
'oowt_DateFrom' => 'С даты',
'oowt_DateTo' => 'По дату',
'oowt_Weekdays' => 'Дни недели',
'oowt_Time' => 'Время',
'oowt_TimeFrom' => 'С времени',
'oowt_TimeTo' => 'По время',
'oowt_Calendar' => 'Календарь',
'oowt_PlayAudioMessage' => 'Воспроизвести сообщение',
'oowt_AllowCalls' => 'Разрешить',
'oowt_DenyCalls' => 'Запретить',
'oowt_Sunday' => 'Воскресенье',
'oowt_Monday' => 'Понедельник',
'oowt_Tuesday' => 'Вторник',
'oowt_Wednesday' => 'Среда',
'oowt_Thursday' => 'Четверг',
'oowt_Friday' => 'Пятница',
'oowt_Saturday' => 'Суббота',
'oowt_NewRule' => 'Новое правило',
```

### Stage 6: Build and Testing

#### 6.1 JavaScript Transpilation
```bash
# For core system files
docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/OutOffWorkTime/out-off-work-time-modify.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/OutOffWorkTime/out-off-work-time-index.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/PbxAPI/outOffWorkTimeAPI.js \
  core
```

#### 6.2 PHPStan Check
```bash
# Check PHP code quality
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse /offload/rootfs/usr/www/src/PBXCoreREST/Lib/OutOffWorkTime/
```

## New Files to Create

1. `src/PBXCoreREST/Lib/OutOffWorkTime/GetRecordAction.php`
2. `src/PBXCoreREST/Lib/OutOffWorkTime/GetListAction.php`
3. `src/PBXCoreREST/Lib/OutOffWorkTime/SaveRecordAction.php`
4. `src/PBXCoreREST/Lib/OutOffWorkTime/DeleteRecordAction.php`
5. `src/PBXCoreREST/Lib/OutOffWorkTime/DataStructure.php`
6. `src/PBXCoreREST/Lib/OutOffWorkTimeManagementProcessor.php`
7. `src/PBXCoreREST/Controllers/OutOffWorkTime/GetController.php`
8. `src/PBXCoreREST/Controllers/OutOffWorkTime/PostController.php`
9. `src/PBXCoreREST/Controllers/OutOffWorkTime/PutController.php`
10. `src/PBXCoreREST/Controllers/OutOffWorkTime/DeleteController.php`
11. `sites/admin-cabinet/assets/js/src/PbxAPI/outOffWorkTimeAPI.js`
12. `sites/admin-cabinet/assets/js/src/OutOffWorkTime/out-off-work-time-modify.js`

## Files to Modify

1. `src/PBXCoreREST/Providers/RouterProvider.php`
2. `sites/admin-cabinet/assets/js/src/OutOffWorkTime/out-off-work-time-index.js`
3. `src/AdminCabinet/Controllers/OutOffWorkTimeController.php`
4. `src/AdminCabinet/Views/OutOffWorkTime/index.volt`
5. `src/Common/Messages/ru.php`
6. `src/AdminCabinet/Providers/AssetProvider.php`

## Expected Results

After implementing the plan, the out of work time management system will:

- ✅ Use unified REST API architecture
- ✅ Support full CRUD functionality via REST API
- ✅ Provide two-level data sanitization
- ✅ Use DataTable for list display
- ✅ Integrate with existing Form.js mechanism
- ✅ Preserve all existing UI/UX patterns
- ✅ Support complex time restrictions (dates, weekdays, time, calendar)
- ✅ Support multiple action types (redirect, playback)
- ✅ Correctly display welcome message for empty table
- ✅ Be ready for external integrations
- ✅ Comply with MikoPBX architectural principles

## Testing

### REST API Endpoints for Testing:
- `GET /pbxcore/api/v2/out-off-work-time/getList` - rules list
- `GET /pbxcore/api/v2/out-off-work-time/getRecord/new` - new rule structure
- `GET /pbxcore/api/v2/out-off-work-time/getRecord/{id}` - specific rule
- `POST /pbxcore/api/v2/out-off-work-time/saveRecord` - create rule
- `PUT /pbxcore/api/v2/out-off-work-time/saveRecord/{id}` - update rule
- `DELETE /pbxcore/api/v2/out-off-work-time/deleteRecord/{id}` - delete rule

### Test Scenarios:
1. Create new rule with various time restrictions
2. Edit existing rule
3. Delete rule
4. Validate required fields based on action type
5. Test date/time format conversions
6. Test calendar integration
7. Update DataTable after operations
8. Save form state and URL
9. Display welcome message for empty table
10. Test different action types (extension redirect, audio playback)

## Key Differences from Conference Rooms

1. **No unique ID generation** - Uses numeric auto-increment ID
2. **Complex validation** - At least one time restriction must be set
3. **Multiple UI components** - Tabs, calendars, dropdowns
4. **Conditional validation** - Different fields required based on action type
5. **Date/time handling** - Conversion between display and storage formats
6. **No extension uniqueness check** - Extension can be reused across rules