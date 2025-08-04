# MikoPBX Incoming Routes REST API Migration Plan

## Project Overview

This document contains a detailed plan for adapting the MikoPBX incoming routes management system to use a unified REST API architecture. The plan is based on the guide `docs/mikopbx-rest-migration-guide.md` and follows the principles of minimal changes to the user interface while handling the complex routing logic and special default route requirements.

## Current State

### Existing Architecture
- **Model**: `src/Common/Models/IncomingRoutingTable.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/IncomingRoutesController.php`
- **Forms**: `src/AdminCabinet/Forms/IncomingRouteEditForm.php`, `src/AdminCabinet/Forms/DefaultIncomingRouteForm.php`
- **JavaScript**: Basic list management with drag-and-drop priority, form validation
- **No REST API**: Only traditional MVC implementation exists

### IncomingRoutingTable Model Fields
```php
public $id;                  // Primary key
public $rulename;            // Rule name/description
public $number;              // DID number pattern
public $extension;           // Target extension
public $provider;            // Provider ID
public $priority;            // Rule priority (0-9999)
public $timeout;             // Timeout in seconds (default: 30)
public $action;              // Action type (extension, hangup, busy, did2user, voicemail, playback)
public $note;                // Additional notes
public $audio_message_id;    // Audio file for playback action
```

### Model Relations
- `belongsTo` → `Extensions` (by extension field)
- `belongsTo` → `Providers` (by provider field)
- `belongsTo` → `SoundFiles` (by audio_message_id field)
- `hasOne` → `OutWorkTimesRouts` (by id field) - for time-based routing

### Action Types
- `extension` - Forward to extension
- `hangup` - Hang up call
- `busy` - Return busy signal
- `did2user` - Direct to extension mapping
- `voicemail` - Send to voicemail
- `playback` - Play audio message

### Special Requirements
- **Default Route (ID=1)**: Cannot be deleted, has priority 9999
- **Priority Management**: Auto-assignment and drag-and-drop reordering
- **Time Conditions**: Integration with OutWorkTimesRouts for time-based routing
- **Copy Functionality**: Duplicate existing rules with modifications

## Detailed Implementation Plan

### Stage 1: Creating REST API Backend

#### 1.1 MikoPBX REST API Architecture

**Important**: In MikoPBX REST API architecture, Action classes are executed in Workers without HTTP context. Therefore, they should not inherit from Injectable and work with $this->request directly.

**Correct Flow**:
```
HTTP Request → Controller → Worker → Action → Database → Response
```

#### 1.2 Action Classes for Incoming Routes

**File**: `src/PBXCoreREST/Lib/IncomingRoutes/GetRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\IncomingRoutes;

use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting incoming route record
 * 
 * @api {get} /pbxcore/api/v2/incoming-routes/getRecord/:id Get incoming route record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup IncomingRoutes
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Incoming route data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.rulename Rule name
 * @apiSuccess {String} data.number DID number pattern
 * @apiSuccess {String} data.extension Target extension
 * @apiSuccess {String} data.provider Provider ID
 * @apiSuccess {String} data.priority Rule priority
 * @apiSuccess {String} data.timeout Timeout in seconds
 * @apiSuccess {String} data.action Action type
 * @apiSuccess {String} data.note Additional notes
 * @apiSuccess {String} data.audio_message_id Audio message ID
 */
class GetRecordAction
{
    /**
     * Get incoming route record
     * @param string|null $id - Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id) || $id === 'new') {
            // Create structure for new record
            $newRoute = new IncomingRoutingTable();
            $newRoute->id = '';
            $newRoute->rulename = '';
            $newRoute->number = '';
            $newRoute->extension = '';
            $newRoute->provider = '';
            $newRoute->priority = (string)IncomingRoutingTable::getMaxNewPriority();
            $newRoute->timeout = '30';
            $newRoute->action = IncomingRoutingTable::ACTION_EXTENSION;
            $newRoute->note = '';
            $newRoute->audio_message_id = '';
            
            $res->data = DataStructure::createFromModel($newRoute);
            $res->success = true;
        } else {
            // Find existing record
            $route = IncomingRoutingTable::findFirstById($id);
            
            if ($route) {
                $res->data = DataStructure::createFromModel($route);
                $res->success = true;
            } else {
                $res->messages['error'][] = 'Incoming route not found';
            }
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/IncomingRoutes/GetListAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\IncomingRoutes;

use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all incoming routes
 * 
 * @api {get} /pbxcore/api/v2/incoming-routes/getList Get all incoming routes
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup IncomingRoutes
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of incoming routes ordered by priority
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.rulename Rule name
 * @apiSuccess {String} data.number DID number pattern
 * @apiSuccess {String} data.extension Target extension
 * @apiSuccess {String} data.provider Provider ID
 * @apiSuccess {String} data.priority Rule priority
 * @apiSuccess {String} data.timeout Timeout in seconds
 * @apiSuccess {String} data.action Action type
 * @apiSuccess {String} data.note Additional notes
 * @apiSuccess {String} data.audio_message_id Audio message ID
 * @apiSuccess {Boolean} data.is_default Whether this is the default route (ID=1)
 */
class GetListAction
{
    /**
     * Get list of all incoming routes
     * 
     * @param array $data - Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get all routes ordered by priority, with default route last
            $routes = IncomingRoutingTable::find([
                'order' => 'CAST(priority AS INTEGER) ASC, id ASC'
            ]);
            
            $data = [];
            foreach ($routes as $route) {
                $routeData = DataStructure::createFromModel($route);
                $routeData['is_default'] = ((int)$route->id === 1);
                $data[] = $routeData;
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

**File**: `src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\IncomingRoutes;

use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for saving incoming route record
 * 
 * @api {post} /pbxcore/api/v2/incoming-routes/saveRecord Create incoming route
 * @api {put} /pbxcore/api/v2/incoming-routes/saveRecord/:id Update incoming route
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup IncomingRoutes
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} rulename Rule name/description
 * @apiParam {String} [number] DID number pattern
 * @apiParam {String} [extension] Target extension (required for extension action)
 * @apiParam {String} [provider] Provider ID
 * @apiParam {String} [priority] Rule priority (auto-assigned if empty)
 * @apiParam {String} [timeout] Timeout in seconds (3-7400, default: 30)
 * @apiParam {String} action Action type (extension, hangup, busy, did2user, voicemail, playback)
 * @apiParam {String} [note] Additional notes
 * @apiParam {String} [audio_message_id] Audio message ID (for playback action)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved incoming route data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction
{
    /**
     * Save incoming route record
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
            'rulename' => 'string|html_escape|max:200',
            'number' => 'string|max:50|empty_to_null',
            'extension' => 'string|max:50|empty_to_null',
            'provider' => 'string|max:50|empty_to_null',
            'priority' => 'string|max:10|empty_to_null',
            'timeout' => 'string|regex:/^[0-9]+$/|max:10',
            'action' => 'string|max:20',
            'note' => 'string|html_escape|max:500|empty_to_null',
            'audio_message_id' => 'string|max:50|empty_to_null'
        ];
        $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);
        
        // Validate required fields and business rules
        $validationRules = [
            'rulename' => [
                ['type' => 'required', 'message' => 'Rule name is required']
            ],
            'action' => [
                ['type' => 'required', 'message' => 'Action is required'],
                ['type' => 'in_array', 'values' => [
                    IncomingRoutingTable::ACTION_EXTENSION,
                    IncomingRoutingTable::ACTION_HANGUP,
                    IncomingRoutingTable::ACTION_BUSY,
                    IncomingRoutingTable::ACTION_DID,
                    IncomingRoutingTable::ACTION_VOICEMAIL,
                    IncomingRoutingTable::ACTION_PLAYBACK
                ], 'message' => 'Invalid action type']
            ],
            'timeout' => [
                ['type' => 'regex', 'pattern' => '/^[0-9]+$/', 'message' => 'Timeout must be numeric'],
                ['type' => 'range', 'min' => 3, 'max' => 7400, 'message' => 'Timeout must be between 3 and 7400 seconds']
            ]
        ];
        
        // Additional validation for extension action
        if ($data['action'] === IncomingRoutingTable::ACTION_EXTENSION && empty($data['extension'])) {
            $validationRules['extension'] = [
                ['type' => 'required', 'message' => 'Extension is required for extension action']
            ];
        }
        
        // Additional validation for playback action
        if ($data['action'] === IncomingRoutingTable::ACTION_PLAYBACK && empty($data['audio_message_id'])) {
            $validationRules['audio_message_id'] = [
                ['type' => 'required', 'message' => 'Audio message is required for playback action']
            ];
        }
        
        $validationErrors = BaseActionHelper::validateData($data, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Get or create model
        if (!empty($data['id'])) {
            $route = IncomingRoutingTable::findFirstById($data['id']);
            if (!$route) {
                $res->messages['error'][] = 'Incoming route not found';
                return $res;
            }
        } else {
            $route = new IncomingRoutingTable();
        }
        
        // Validate foreign key references
        if (!empty($data['extension'])) {
            $extension = Extensions::findFirstByNumber($data['extension']);
            if (!$extension) {
                $res->messages['error'][] = 'Extension not found';
                return $res;
            }
        }
        
        if (!empty($data['provider'])) {
            $provider = Providers::findFirstByUniqid($data['provider']);
            if (!$provider) {
                $res->messages['error'][] = 'Provider not found';
                return $res;
            }
        }
        
        if (!empty($data['audio_message_id'])) {
            $audioFile = SoundFiles::findFirstById($data['audio_message_id']);
            if (!$audioFile) {
                $res->messages['error'][] = 'Audio file not found';
                return $res;
            }
        }
        
        try {
            // Save in transaction
            $savedRoute = BaseActionHelper::executeInTransaction(function() use ($route, $data) {
                // Set priority if not provided
                if (empty($data['priority'])) {
                    $data['priority'] = (string)IncomingRoutingTable::getMaxNewPriority();
                }
                
                // Set default timeout if not provided
                if (empty($data['timeout'])) {
                    $data['timeout'] = '30';
                }
                
                // Update model fields
                $route->rulename = $data['rulename'];
                $route->number = $data['number'] ?? '';
                $route->extension = $data['extension'] ?? '';
                $route->provider = $data['provider'] ?? '';
                $route->priority = $data['priority'];
                $route->timeout = $data['timeout'];
                $route->action = $data['action'];
                $route->note = $data['note'] ?? '';
                $route->audio_message_id = $data['audio_message_id'] ?? '';
                
                if (!$route->save()) {
                    throw new \Exception(implode(', ', $route->getMessages()));
                }
                
                return $route;
            });
            
            $res->data = DataStructure::createFromModel($savedRoute);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "incoming-routes/modify/{$savedRoute->id}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/IncomingRoutes/DeleteRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\IncomingRoutes;

use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\OutWorkTimesRouts;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for deleting incoming route record
 * 
 * @api {delete} /pbxcore/api/v2/incoming-routes/deleteRecord/:id Delete incoming route
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup IncomingRoutes
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
     * Delete incoming route record
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
        
        // Prevent deletion of default route (ID=1)
        if ((int)$id === 1) {
            $res->messages['error'][] = 'Cannot delete default route';
            return $res;
        }
        
        try {
            $route = IncomingRoutingTable::findFirstById($id);
            
            if (!$route) {
                $res->messages['error'][] = 'Incoming route not found';
                return $res;
            }
            
            // Delete in transaction using BaseActionHelper
            BaseActionHelper::executeInTransaction(function() use ($route) {
                // Delete related time conditions
                $timeConditions = OutWorkTimesRouts::find("routId = '{$route->id}'");
                foreach ($timeConditions as $condition) {
                    if (!$condition->delete()) {
                        throw new \Exception('Failed to delete time condition: ' . implode(', ', $condition->getMessages()));
                    }
                }
                
                // Delete route itself
                if (!$route->delete()) {
                    throw new \Exception('Failed to delete incoming route: ' . implode(', ', $route->getMessages()));
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

**File**: `src/PBXCoreREST/Lib/IncomingRoutes/UpdatePriorityAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\IncomingRoutes;

use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for updating route priorities (drag-and-drop reordering)
 * 
 * @api {put} /pbxcore/api/v2/incoming-routes/updatePriority Update priorities
 * @apiVersion 2.0.0
 * @apiName UpdatePriority
 * @apiGroup IncomingRoutes
 * 
 * @apiParam {Array} priorities Array of {id, priority} objects
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {String} message Success message
 */
class UpdatePriorityAction
{
    /**
     * Update route priorities
     * @param array $data - Array with 'priorities' field containing {id, priority} pairs
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($data['priorities']) || !is_array($data['priorities'])) {
            $res->messages['error'][] = 'Priorities array is required';
            return $res;
        }
        
        try {
            BaseActionHelper::executeInTransaction(function() use ($data) {
                foreach ($data['priorities'] as $item) {
                    if (empty($item['id']) || !isset($item['priority'])) {
                        continue;
                    }
                    
                    $route = IncomingRoutingTable::findFirstById($item['id']);
                    if ($route) {
                        $route->priority = (string)$item['priority'];
                        if (!$route->save()) {
                            throw new \Exception('Failed to update priority for route ' . $item['id']);
                        }
                    }
                }
                
                return true;
            });
            
            $res->success = true;
            $res->data = ['message' => 'Priorities updated successfully'];
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/IncomingRoutes/DataStructure.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\IncomingRoutes;

/**
 * Data structure for incoming routes
 * 
 * @package MikoPBX\PBXCoreREST\Lib\IncomingRoutes
 */
class DataStructure
{
    /**
     * Create data array from IncomingRoutingTable model
     * @param \MikoPBX\Common\Models\IncomingRoutingTable $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        return [
            'id' => (string)$model->id,
            'rulename' => $model->rulename ?? '',
            'number' => $model->number ?? '',
            'extension' => $model->extension ?? '',
            'provider' => $model->provider ?? '',
            'priority' => $model->priority ?? '0',
            'timeout' => $model->timeout ?? '30',
            'action' => $model->action ?? 'extension',
            'note' => $model->note ?? '',
            'audio_message_id' => $model->audio_message_id ?? ''
        ];
    }
}
```

#### 1.3 REST API Controllers

**New file**: `src/PBXCoreREST/Controllers/IncomingRoutes/GetController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\IncomingRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\IncomingRoutesManagementProcessor;

/**
 * GET controller for incoming routes management
 * 
 * @RoutePrefix("/pbxcore/api/v2/incoming-routes")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/incoming-routes/getRecord/123
 * curl http://127.0.0.1/pbxcore/api/v2/incoming-routes/getRecord/new
 * curl http://127.0.0.1/pbxcore/api/v2/incoming-routes/getList
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\IncomingRoutes
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get incoming route record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all incoming routes
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
            IncomingRoutesManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
```

**New file**: `src/PBXCoreREST/Controllers/IncomingRoutes/PostController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\IncomingRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\IncomingRoutesManagementProcessor;

/**
 * POST controller for incoming routes management
 * 
 * @RoutePrefix("/pbxcore/api/v2/incoming-routes")
 * 
 * @examples
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/incoming-routes/saveRecord \
 *   -d "rulename=Test Route&action=extension&extension=101"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\IncomingRoutes
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates incoming route record
     * @Post("/saveRecord")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        
        $this->sendRequestToBackendWorker(
            IncomingRoutesManagementProcessor::class,
            $actionName,
            $postData
        );
    }
}
```

**New file**: `src/PBXCoreREST/Controllers/IncomingRoutes/PutController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\IncomingRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\IncomingRoutesManagementProcessor;

/**
 * PUT controller for incoming routes management
 * 
 * @RoutePrefix("/pbxcore/api/v2/incoming-routes")
 * 
 * @examples
 * curl -X PUT http://127.0.0.1/pbxcore/api/v2/incoming-routes/saveRecord/123 \
 *   -d "rulename=Updated Route&action=hangup"
 * curl -X PUT http://127.0.0.1/pbxcore/api/v2/incoming-routes/updatePriority \
 *   -d "priorities=[{id:1,priority:10},{id:2,priority:20}]"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\IncomingRoutes
 */
class PutController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Route ID for update operations
     * 
     * Updates existing incoming route record
     * @Put("/saveRecord/{id}")
     * 
     * Updates route priorities for drag-and-drop reordering
     * @Put("/updatePriority")
     * 
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        $putData = self::sanitizeData($this->request->getPut(), $this->filter);
        
        if (!empty($id)) {
            $putData['id'] = $id;
        }
        
        $this->sendRequestToBackendWorker(
            IncomingRoutesManagementProcessor::class,
            $actionName,
            $putData
        );
    }
}
```

**New file**: `src/PBXCoreREST/Controllers/IncomingRoutes/DeleteController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\IncomingRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\IncomingRoutesManagementProcessor;

/**
 * DELETE controller for incoming routes management
 * 
 * @RoutePrefix("/pbxcore/api/v2/incoming-routes")
 * 
 * @examples
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v2/incoming-routes/deleteRecord/123
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\IncomingRoutes
 */
class DeleteController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Route ID to delete
     * 
     * Deletes incoming route record
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
            IncomingRoutesManagementProcessor::class,
            $actionName,
            $deleteData
        );
    }
}
```

#### 1.4 Create Processor

**New file**: `src/PBXCoreREST/Lib/IncomingRoutesManagementProcessor.php`
```php
<?php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\IncomingRoutes\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction,
    UpdatePriorityAction
};
use Phalcon\Di\Injectable;

/**
 * Incoming routes management processor
 *
 * Handles all incoming route management operations including:
 * - getRecord: Get single route by ID or create new structure
 * - getList: Get list of all routes ordered by priority
 * - saveRecord: Create or update route
 * - deleteRecord: Delete route (except default route ID=1)
 * - updatePriority: Update route priorities for reordering
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class IncomingRoutesManagementProcessor extends Injectable
{
    /**
     * Processes incoming route management requests
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
                
            case 'updatePriority':
                $res = UpdatePriorityAction::main($data);
                break;
                
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;
        return $res;
    }
}
```

#### 1.5 Update Router Provider

**Add to file**: `src/PBXCoreREST/Providers/RouterProvider.php`

Add to routes array:
```php
Use IncomingRoutes\GetController as IncomingRoutesGetController,
    IncomingRoutes\PostController as IncomingRoutesPostController,
    IncomingRoutes\PutController as IncomingRoutesPutController,
    IncomingRoutes\DeleteController as IncomingRoutesDeleteController;

// GET routes
[
    IncomingRoutesGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/incoming-routes/{actionName}', 
    'get', 
    '/'
],
[
    IncomingRoutesGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/incoming-routes/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'get', 
    '/'
],
// POST route
[
    IncomingRoutesPostController::class, 
    'callAction', 
    '/pbxcore/api/v2/incoming-routes/{actionName}', 
    'post', 
    '/'
],
// PUT routes
[
    IncomingRoutesPutController::class, 
    'callAction', 
    '/pbxcore/api/v2/incoming-routes/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'put', 
    '/'
],
[
    IncomingRoutesPutController::class, 
    'callAction', 
    '/pbxcore/api/v2/incoming-routes/{actionName}', 
    'put', 
    '/'
],
// DELETE route
[
    IncomingRoutesDeleteController::class, 
    'callAction', 
    '/pbxcore/api/v2/incoming-routes/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'delete', 
    '/'
],
```

### Stage 2: Update JavaScript Client

#### 2.1 Create API Client

**New file**: `sites/admin-cabinet/assets/js/src/PbxAPI/incomingRoutesAPI.js`
```javascript
//<Copyright>

/* global globalRootUrl, PbxApi, globalTranslate */

/**
 * IncomingRoutesAPI - REST API for incoming routes management
 * 
 * Uses unified approach with centralized endpoint definitions.
 * This provides:
 * - Single point of API URL management
 * - Easy API version switching (v2 -> v3)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
const IncomingRoutesAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/incoming-routes/`,
    
    // Endpoint definitions for unification
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/incoming-routes/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/incoming-routes/getRecord`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/incoming-routes/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/incoming-routes/deleteRecord`,
        updatePriority: `${Config.pbxUrl}/pbxcore/api/v2/incoming-routes/updatePriority`
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
    },
    
    /**
     * Update priorities for drag-and-drop reordering
     * @param {Array} priorities - Array of {id, priority} objects
     * @param {function} callback - Callback function
     */
    updatePriorities(priorities, callback) {
        $.api({
            url: this.endpoints.updatePriority,
            method: 'PUT',
            data: { priorities: priorities },
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
    }
};
```

#### 2.2 Update Index Page JavaScript

**Changes to file**: `sites/admin-cabinet/assets/js/src/IncomingRoutes/incoming-route-index.js`

Replace content with:
```javascript
//<Copyright>

/* global globalRootUrl, IncomingRoutesAPI, globalTranslate, UserMessage, SemanticLocalization, Form */

/**
 * Incoming routes table management module
 */
const incomingRoutes = {
    $routesTable: $('#incoming-routes-table'),
    $defaultRouteForm: $('#default-route-form'),
    dataTable: {},
    
    /**
     * Initialize the module
     */
    initialize() {
        // Show placeholder until data loads
        incomingRoutes.toggleEmptyPlaceholder(true);
        
        incomingRoutes.initializeDataTable();
        incomingRoutes.initializeDefaultRouteForm();
    },
    
    /**
     * Initialize DataTable for routes list
     */
    initializeDataTable() {
        incomingRoutes.dataTable = incomingRoutes.$routesTable.DataTable({
            ajax: {
                url: IncomingRoutesAPI.endpoints.getList,
                dataSrc: function(json) {
                    
                    // Separate default route from regular routes
                    const regularRoutes = [];
                    let defaultRoute = null;
                    
                    if (json.result && json.data) {
                        json.data.forEach(route => {
                            if (route.is_default) {
                                defaultRoute = route;
                            } else {
                                regularRoutes.push(route);
                            }
                        });
                    }
                    
                    // Update default route form if found
                    if (defaultRoute) {
                        incomingRoutes.populateDefaultRouteForm(defaultRoute);
                    }
                    
                    // Manage empty state for regular routes
                    incomingRoutes.toggleEmptyPlaceholder(regularRoutes.length === 0);
                    
                    return regularRoutes;
                }
            },
            columns: [
                {
                    // Drag handle
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'center aligned dragHandle',
                    width: '20px',
                    render: function() {
                        return '<i class="sort icon"></i>';
                    }
                },
                {
                    // Priority
                    data: 'priority',
                    className: 'center aligned',
                    width: '80px'
                },
                {
                    // Rule name and description
                    data: null,
                    render: function(data) {
                        let html = `<strong>${data.rulename}</strong>`;
                        if (data.note) {
                            html += `<br><small class="ui grey text">${data.note}</small>`;
                        }
                        return html;
                    }
                },
                {
                    // DID Number
                    data: 'number',
                    className: 'center aligned',
                    render: function(data) {
                        return data || '—';
                    }
                },
                {
                    // Provider
                    data: 'provider',
                    className: 'center aligned hide-on-mobile',
                    responsivePriority: 3,
                    render: function(data) {
                        return data || '—';
                    }
                },
                {
                    // Action
                    data: null,
                    className: 'center aligned',
                    render: function(data) {
                        let actionText = globalTranslate[`ir_action_${data.action}`] || data.action;
                        
                        if (data.action === 'extension' && data.extension) {
                            actionText += ` → ${data.extension}`;
                        } else if (data.action === 'playback' && data.audio_message_id) {
                            actionText += ` (${data.audio_message_id})`;
                        }
                        
                        return actionText;
                    }
                },
                {
                    // Actions
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'right aligned action-buttons',
                    responsivePriority: 1,
                    render: function(data) {
                        return `<div class="ui basic icon buttons">
                            <a href="${globalRootUrl}incoming-routes/modify/${data.id}" 
                               class="ui button popuped" 
                               data-content="${globalTranslate.bt_ToolTipEdit}">
                                <i class="edit icon"></i>
                            </a>
                            <a href="#" 
                               data-value="${data.id}" 
                               class="ui button delete two-steps-delete popuped" 
                               data-content="${globalTranslate.bt_ToolTipDelete}">
                                <i class="trash red icon"></i>
                            </a>
                        </div>`;
                    }
                }
            ],
            order: [[1, 'asc']], // Order by priority
            responsive: true,
            searching: false,
            paging: false,
            info: false,
            language: SemanticLocalization.dataTableLocalisation,
            rowReorder: {
                selector: '.dragHandle',
                update: false // We'll handle updates manually
            },
            drawCallback: function() {
                // Initialize Semantic UI elements
                incomingRoutes.$routesTable.find('.popuped').popup();
                
                // Double-click for editing
                incomingRoutes.initializeDoubleClickEdit();
            }
        });
        
        // Handle drag-and-drop priority updates
        incomingRoutes.$routesTable.on('row-reorder', function(e, diff, edit) {
            if (diff.length === 0) return;
            
            const priorities = [];
            incomingRoutes.dataTable.rows().every(function(index) {
                const data = this.data();
                priorities.push({
                    id: data.id,
                    priority: index + 1
                });
            });
            
            IncomingRoutesAPI.updatePriorities(priorities, function(response) {
                if (response.result) {
                    UserMessage.showSuccess(globalTranslate.ir_PrioritiesUpdated);
                } else {
                    UserMessage.showError(response.messages?.error || 'Failed to update priorities');
                    // Reload table to restore original order
                    incomingRoutes.dataTable.ajax.reload();
                }
            });
        });
        
        // Handle deletion using DeleteSomething.js
        incomingRoutes.$routesTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const routeId = $button.attr('data-value');
            
            $button.addClass('loading disabled');
            
            IncomingRoutesAPI.deleteRecord(routeId, incomingRoutes.cbAfterDeleteRecord);
        });
    },
    
    /**
     * Initialize default route form
     */
    initializeDefaultRouteForm() {
        if (incomingRoutes.$defaultRouteForm.length === 0) return;
        
        // Configure Form.js for default route
        Form.$formObj = incomingRoutes.$defaultRouteForm;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = {}; // Default route has minimal validation
        Form.cbBeforeSendForm = incomingRoutes.cbBeforeDefaultRouteSave;
        Form.cbAfterSendForm = incomingRoutes.cbAfterDefaultRouteSave;
        
        // Setup REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = IncomingRoutesAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        Form.initialize();
        
        // Initialize action-dependent field visibility
        incomingRoutes.toggleDefaultRouteFields();
        incomingRoutes.$defaultRouteForm.find('select[name="action"]').on('change', 
            incomingRoutes.toggleDefaultRouteFields);
    },
    
    /**
     * Populate default route form with data
     */
    populateDefaultRouteForm(data) {
        if (incomingRoutes.$defaultRouteForm.length === 0) return;
        
        // Set form values
        incomingRoutes.$defaultRouteForm.form('set values', data);
        
        // Update field visibility based on action
        incomingRoutes.toggleDefaultRouteFields();
        
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    },
    
    /**
     * Toggle default route form fields based on action
     */
    toggleDefaultRouteFields() {
        const action = incomingRoutes.$defaultRouteForm.form('get value', 'action');
        
        // Hide all conditional fields first
        $('.field.extension-field, .field.audio-field').hide();
        
        // Show relevant fields
        if (action === 'extension' || action === 'did2user') {
            $('.field.extension-field').show();
        } else if (action === 'playback') {
            $('.field.audio-field').show();
        }
    },
    
    /**
     * Callback before default route save
     */
    cbBeforeDefaultRouteSave(settings) {
        // Ensure we're updating the default route (ID=1)
        const formData = incomingRoutes.$defaultRouteForm.form('get values');
        formData.id = '1';
        formData.rulename = 'Default Route';
        formData.priority = '9999';
        
        // Update the settings data
        if (typeof settings.data === 'object') {
            Object.assign(settings.data, formData);
        } else {
            settings.data = formData;
        }
        
        return settings;
    },
    
    /**
     * Callback after default route save
     */
    cbAfterDefaultRouteSave(response) {
        if (response.result) {
            UserMessage.showSuccess(globalTranslate.ir_DefaultRouteUpdated);
            
            // Update form with returned data
            if (response.data) {
                incomingRoutes.populateDefaultRouteForm(response.data);
            }
        }
    },
    
    /**
     * Callback after record deletion
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Reload table
            incomingRoutes.dataTable.ajax.reload();
            
            UserMessage.showSuccess(globalTranslate.ir_RouteDeleted);
        } else {
            UserMessage.showError(
                response.messages?.error || 
                globalTranslate.ir_ImpossibleToDeleteRoute
            );
        }
        
        // Remove loading indicator
        $('a.delete').removeClass('loading disabled');
    },
    
    /**
     * Toggle empty table placeholder visibility
     */
    toggleEmptyPlaceholder(isEmpty) {
        if (isEmpty) {
            $('#routes-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-button').show();
            $('#routes-table-container').show();
        }
    },
    
    /**
     * Initialize double-click for editing
     */
    initializeDoubleClickEdit() {
        incomingRoutes.$routesTable.on('dblclick', 'tbody td:not(.action-buttons):not(.dragHandle)', function() {
            const data = incomingRoutes.dataTable.row(this).data();
            if (data && data.id) {
                window.location = `${globalRootUrl}incoming-routes/modify/${data.id}`;
            }
        });
    }
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    incomingRoutes.initialize();
});
```

#### 2.3 Create Form Edit Module

**New file**: `sites/admin-cabinet/assets/js/src/IncomingRoutes/incoming-route-modify.js`
```javascript
//<Copyright>

/* global globalRootUrl, IncomingRoutesAPI, Form, globalTranslate, UserMessage, Extensions, Providers, SoundFiles */

/**
 * Incoming route edit form management module
 */
const incomingRouteModify = {
    $formObj: $('#incoming-route-form'),
    
    /**
     * Validation rules for the form
     */
    validateRules: {
        rulename: {
            identifier: 'rulename',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ir_ValidateRuleNameIsEmpty
                }
            ]
        },
        timeout: {
            identifier: 'timeout',
            rules: [
                {
                    type: 'integer[3..7400]',
                    prompt: globalTranslate.ir_ValidateTimeoutRange
                }
            ]
        },
        extension: {
            identifier: 'extension',
            depends: 'action',
            rules: [
                {
                    type: 'extensionRule',
                    prompt: globalTranslate.ir_ValidateExtensionRequired
                }
            ]
        },
        audio_message_id: {
            identifier: 'audio_message_id',
            depends: 'action',
            rules: [
                {
                    type: 'audioRule',
                    prompt: globalTranslate.ir_ValidateAudioRequired
                }
            ]
        }
    },
    
    /**
     * Module initialization
     */
    initialize() {
        // Configure Form.js
        Form.$formObj = incomingRouteModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = incomingRouteModify.validateRules;
        Form.cbBeforeSendForm = incomingRouteModify.cbBeforeSendForm;
        Form.cbAfterSendForm = incomingRouteModify.cbAfterSendForm;
        
        // Setup REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = IncomingRoutesAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}incoming-routes/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}incoming-routes/modify/`;
        
        // Initialize Form
        Form.initialize();
        
        // Initialize dropdowns and conditional fields
        incomingRouteModify.initializeDropdowns();
        incomingRouteModify.initializeConditionalFields();
        
        // Load form data
        incomingRouteModify.initializeForm();
    },
    
    /**
     * Initialize Semantic UI dropdowns
     */
    initializeDropdowns() {
        // Provider dropdown
        $('#provider').dropdown();
        
        // Extension dropdown with search
        $('#extension').dropdown({
            fullTextSearch: true,
            filterRemoteData: true
        });
        
        // Audio message dropdown
        $('#audio_message_id').dropdown();
        
        // Action dropdown
        $('#action').dropdown({
            onChange: incomingRouteModify.toggleConditionalFields
        });
    },
    
    /**
     * Initialize conditional field visibility
     */
    initializeConditionalFields() {
        incomingRouteModify.toggleConditionalFields();
    },
    
    /**
     * Toggle conditional fields based on action
     */
    toggleConditionalFields() {
        const action = incomingRouteModify.$formObj.form('get value', 'action');
        
        // Hide all conditional fields first
        $('.field.extension-field, .field.audio-field').hide();
        
        // Show relevant fields based on action
        if (action === 'extension' || action === 'did2user') {
            $('.field.extension-field').show();
        } else if (action === 'playback') {
            $('.field.audio-field').show();
        }
    },
    
    /**
     * Load data into form
     */
    initializeForm() {
        const recordId = incomingRouteModify.getRecordId();
        
        IncomingRoutesAPI.getRecord(recordId, (response) => {
            if (response.result) {
                incomingRouteModify.populateForm(response.data);
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load incoming route data');
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
     * Callback before form submission
     */
    cbBeforeSendForm(settings) {
        // Ensure priority is set
        const formData = incomingRouteModify.$formObj.form('get values');
        if (!formData.priority) {
            formData.priority = '10';
        }
        
        // Update settings data
        if (typeof settings.data === 'object') {
            Object.assign(settings.data, formData);
        } else {
            settings.data = formData;
        }
        
        return settings;
    },
    
    /**
     * Callback after form submission
     */
    cbAfterSendForm(response) {
        if (response.result) {
            if (response.data) {
                incomingRouteModify.populateForm(response.data);
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
        Form.$formObj.form('set values', data);
        
        // Update conditional fields
        incomingRouteModify.toggleConditionalFields();
        
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    }
};

/**
 * Custom validation rule for extension field
 */
$.fn.form.settings.rules.extensionRule = function(value) {
    const action = incomingRouteModify.$formObj.form('get value', 'action');
    
    // Extension is required for extension and did2user actions
    if ((action === 'extension' || action === 'did2user') && !value) {
        return false;
    }
    
    return true;
};

/**
 * Custom validation rule for audio message field
 */
$.fn.form.settings.rules.audioRule = function(value) {
    const action = incomingRouteModify.$formObj.form('get value', 'action');
    
    // Audio message is required for playback action
    if (action === 'playback' && !value) {
        return false;
    }
    
    return true;
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    incomingRouteModify.initialize();
});
```

### Stage 3: AdminCabinet Adaptation

**Changes to file**: `src/AdminCabinet/Controllers/IncomingRoutesController.php`

Replace data fetching logic in methods:
```php
<?php
//<Copyright>

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\DefaultIncomingRouteForm;
use MikoPBX\AdminCabinet\Forms\IncomingRouteEditForm;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use MikoPBX\Common\Models\IncomingRoutingTable;

class IncomingRoutesController extends BaseController
{
    /**
     * Build the list of incoming routes with default route form.
     */
    public function indexAction(): void
    {
        // Get default route data via REST API
        $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/v2/incoming-routes/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            ['id' => '1'] // Default route
        ]);
        
        if ($restAnswer->success) {
            $defaultRoute = (object)$restAnswer->data;
            $this->view->form = new DefaultIncomingRouteForm($defaultRoute);
        } else {
            $this->flash->error(json_encode($restAnswer->messages));
        }
        
        // The regular routes data will load via DataTable AJAX
    }

    /**
     * Edit incoming route details.
     *
     * @param string|null $routeId The route ID.
     */
    public function modifyAction(string $routeId = null): void
    {
        // Get data via REST API
        $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/v2/incoming-routes/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            ['id' => $routeId]
        ]);
        
        if (!$restAnswer->success) {
            $this->flash->error(json_encode($restAnswer->messages));
            $this->dispatcher->forward([
                'controller' => 'incoming-routes',
                'action' => 'index'
            ]);
            return;
        }
        
        $getRecordStructure = (object)$restAnswer->data;
        
        // Handle copy functionality
        $copyId = $this->request->get('copy-source');
        if (!empty($copyId)) {
            $getRecordStructure->id = '';
            $getRecordStructure->rulename = 'Copy of ' . $getRecordStructure->rulename;
            $getRecordStructure->priority = (string)IncomingRoutingTable::getMaxNewPriority();
        }
        
        // Create form based on API data structure
        $this->view->form = new IncomingRouteEditForm($getRecordStructure);
        $this->view->represent = $getRecordStructure->rulename ?: '';
    }

    /**
     * Legacy save action - redirect to index for REST API handling
     */
    public function saveAction(): void
    {
        // This method is kept for backward compatibility
        // All saves now handled via REST API in frontend
        $this->dispatcher->forward([
            'controller' => 'incoming-routes',
            'action' => 'index'
        ]);
    }

    /**
     * Legacy delete action - redirect to index for REST API handling
     */
    public function deleteAction(string $routeId = null): void
    {
        // This method is kept for backward compatibility
        // All deletes now handled via REST API in frontend
        $this->dispatcher->forward([
            'controller' => 'incoming-routes',
            'action' => 'index'
        ]);
    }

    /**
     * Legacy priority change action - now handled via REST API
     */
    public function changePriorityAction(): void
    {
        // This method is kept for backward compatibility
        // Priority changes now handled via REST API in frontend
        $this->response->setJsonContent(['result' => true]);
        $this->response->send();
    }
}
```

### Stage 4: Update Volt Templates

**Changes to file**: `src/AdminCabinet/Views/IncomingRoutes/index.volt`

Update to use DataTable:
```volt
<!-- Default Route Section -->
<div class="ui segment">
    <h3 class="ui header">{{ t._('ir_DefaultRoute') }}</h3>
    {{ form('incoming-routes/save', 'role': 'form', 'class': 'ui large form', 'id': 'default-route-form') }}
        {{ form.render('id') }}
        
        <div class="field">
            <label>{{ t._('ir_DefaultAction') }}</label>
            {{ form.render('action') }}
        </div>
        
        <div class="field extension-field" style="display: none;">
            <label>{{ t._('ir_DefaultExtension') }}</label>
            {{ form.render('extension') }}
        </div>
        
        <div class="field audio-field" style="display: none;">
            <label>{{ t._('ir_DefaultAudioMessage') }}</label>
            {{ form.render('audio_message_id') }}
        </div>
        
        <div class="field">
            <label>{{ t._('ir_Timeout') }}</label>
            {{ form.render('timeout') }}
        </div>
        
        <div class="ui buttons">
            {{ partial("partials/submitbutton",['submitBtnText': t._('bt_Save'), 'submitBtnIconClass': 'save']) }}
        </div>
    {{ end_form() }}
</div>

<!-- Regular Routes Section -->
<div id="add-new-button">
    {% if isAllowed('save') %}
        {{ link_to("incoming-routes/modify", '<i class="add circle icon"></i> '~t._('ir_AddNewRoute'), "class": "ui blue button") }}
    {% endif %}
</div>

<div id="routes-table-container">
    <table class="ui selectable compact unstackable table" id="incoming-routes-table">
        <thead>
            <tr>
                <th></th>
                <th>{{ t._('ir_ColumnPriority') }}</th>
                <th>{{ t._('ir_ColumnRuleName') }}</th>
                <th>{{ t._('ir_ColumnDIDNumber') }}</th>
                <th class="hide-on-mobile">{{ t._('ir_ColumnProvider') }}</th>
                <th>{{ t._('ir_ColumnAction') }}</th>
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
        'icon': 'phone',
        'title': t._('ir_EmptyTableTitle'),
        'description': t._('ir_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('ir_AddNewRoute'),
        'addButtonLink': 'incoming-routes/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/incoming-routes'
    ]) }}
</div>
```

**Changes to file**: `src/AdminCabinet/Views/IncomingRoutes/modify.volt`

Update for REST API form handling:
```volt
{{ form('incoming-routes/save', 'role': 'form', 'class': 'ui large form', 'id': 'incoming-route-form') }}
    {{ form.render('id') }}
    
    <div class="ui ribbon label">
        <i class="phone icon"></i> {{ t._('ir_RouteSettings') }}
    </div>
    
    <div class="field">
        <label>{{ t._('ir_RuleName') }}</label>
        {{ form.render('rulename') }}
    </div>
    
    <div class="two fields">
        <div class="field">
            <label>{{ t._('ir_DIDNumber') }}</label>
            {{ form.render('number') }}
        </div>
        <div class="field">
            <label>{{ t._('ir_Provider') }}</label>
            {{ form.render('provider') }}
        </div>
    </div>
    
    <div class="two fields">
        <div class="field">
            <label>{{ t._('ir_Priority') }}</label>
            {{ form.render('priority') }}
        </div>
        <div class="field">
            <label>{{ t._('ir_Timeout') }}</label>
            {{ form.render('timeout') }}
        </div>
    </div>
    
    <div class="field">
        <label>{{ t._('ir_Action') }}</label>
        {{ form.render('action') }}
    </div>
    
    <div class="field extension-field" style="display: none;">
        <label>{{ t._('ir_TargetExtension') }}</label>
        {{ form.render('extension') }}
    </div>
    
    <div class="field audio-field" style="display: none;">
        <label>{{ t._('ir_AudioMessage') }}</label>
        {{ form.render('audio_message_id') }}
    </div>
    
    <div class="field">
        <label>{{ t._('ir_Note') }}</label>
        {{ form.render('note') }}
    </div>
    
    <div class="ui clearing segment">
        {{ partial("partials/submitbutton") }}
    </div>
{{ end_form() }}
```

### Stage 5: Update AssetProvider

**Changes to file**: `src/AdminCabinet/Providers/AssetProvider.php`

Add assets for incoming routes:
```php
private function makeIncomingRoutesAssets(string $action): void
{
    if ($action === 'index') {
        // DataTables for routes list
        $this->headerCollectionCSS
            ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
        $this->footerCollectionJS
            ->addJs('js/vendor/datatable/dataTables.semanticui.js', true)
            ->addJs('js/vendor/datatable/dataTables.rowReorder.min.js', true);

        // Main page module
        $this->footerCollectionJS     
            ->addJs('js/pbx/main/form.js', true)
            ->addJs('js/pbx/PbxAPI/incomingRoutesAPI.js', true)
            ->addJs('js/pbx/IncomingRoutes/incoming-route-index.js', true);
    } elseif ($action === 'modify') {
        $this->footerCollectionJS
            // Edit module
            ->addJs('js/pbx/main/form.js', true)
            ->addJs('js/pbx/PbxAPI/incomingRoutesAPI.js', true)
            ->addJs('js/pbx/IncomingRoutes/incoming-route-modify.js', true);
    }
}
```

### Stage 6: Translations

**Add to file**: `src/Common/Messages/ru.php`
```php
'ir_ValidateRuleNameIsEmpty' => 'Имя правила обязательно для заполнения',
'ir_ValidateTimeoutRange' => 'Таймаут должен быть от 3 до 7400 секунд',
'ir_ValidateExtensionRequired' => 'Добавочный номер обязателен для этого действия',
'ir_ValidateAudioRequired' => 'Аудиосообщение обязательно для этого действия',
'ir_DefaultRouteUpdated' => 'Маршрут по умолчанию обновлен',
'ir_RouteDeleted' => 'Маршрут удален успешно',
'ir_PrioritiesUpdated' => 'Приоритеты обновлены',
'ir_ImpossibleToDeleteRoute' => 'Невозможно удалить маршрут',
'ir_action_extension' => 'На добавочный',
'ir_action_hangup' => 'Завершить',
'ir_action_busy' => 'Занято',
'ir_action_did2user' => 'Прямое соединение',
'ir_action_voicemail' => 'Голосовая почта',
'ir_action_playback' => 'Воспроизведение',
```

## New Files to Create

1. `src/PBXCoreREST/Lib/IncomingRoutes/GetRecordAction.php`
2. `src/PBXCoreREST/Lib/IncomingRoutes/GetListAction.php`
3. `src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php`
4. `src/PBXCoreREST/Lib/IncomingRoutes/DeleteRecordAction.php`
5. `src/PBXCoreREST/Lib/IncomingRoutes/UpdatePriorityAction.php`
6. `src/PBXCoreREST/Lib/IncomingRoutes/DataStructure.php`
7. `src/PBXCoreREST/Lib/IncomingRoutesManagementProcessor.php`
8. `src/PBXCoreREST/Controllers/IncomingRoutes/GetController.php`
9. `src/PBXCoreREST/Controllers/IncomingRoutes/PostController.php`
10. `src/PBXCoreREST/Controllers/IncomingRoutes/PutController.php`
11. `src/PBXCoreREST/Controllers/IncomingRoutes/DeleteController.php`
12. `sites/admin-cabinet/assets/js/src/PbxAPI/incomingRoutesAPI.js`
13. `sites/admin-cabinet/assets/js/src/IncomingRoutes/incoming-route-modify.js`

## Files to Modify

1. `src/PBXCoreREST/Providers/RouterProvider.php`
2. `sites/admin-cabinet/assets/js/src/IncomingRoutes/incoming-route-index.js`
3. `src/AdminCabinet/Controllers/IncomingRoutesController.php`
4. `src/AdminCabinet/Views/IncomingRoutes/index.volt`
5. `src/AdminCabinet/Views/IncomingRoutes/modify.volt`
6. `src/AdminCabinet/Providers/AssetProvider.php`
7. `src/Common/Messages/ru.php`

## Build and Testing

### JavaScript Transpilation
```bash
# For core system files
docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/IncomingRoutes/incoming-route-modify.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/IncomingRoutes/incoming-route-index.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/PbxAPI/incomingRoutesAPI.js \
  core
```

### PHPStan Check
```bash
# Check PHP code quality
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse /offload/rootfs/usr/www/src/PBXCoreREST/Lib/IncomingRoutes/
```

## Expected Results

After implementing the plan, the incoming routes management system will:

- ✅ Use unified REST API architecture
- ✅ Support full CRUD functionality via REST API
- ✅ Handle complex routing logic (default route, priorities, time conditions)
- ✅ Provide two-level data sanitization
- ✅ Use DataTable for list display with drag-and-drop reordering
- ✅ Integrate with existing Form.js mechanism
- ✅ Preserve all existing UI/UX patterns
- ✅ Correctly handle default route (ID=1) special cases
- ✅ Support priority management and reordering
- ✅ Maintain backward compatibility
- ✅ Be ready for external integrations
- ✅ Comply with MikoPBX architectural principles

## REST API Endpoints for Testing

- `GET /pbxcore/api/v2/incoming-routes/getList` - routes list
- `GET /pbxcore/api/v2/incoming-routes/getRecord/new` - new route structure
- `GET /pbxcore/api/v2/incoming-routes/getRecord/{id}` - specific route
- `POST /pbxcore/api/v2/incoming-routes/saveRecord` - create route
- `PUT /pbxcore/api/v2/incoming-routes/saveRecord/{id}` - update route
- `PUT /pbxcore/api/v2/incoming-routes/updatePriority` - update priorities
- `DELETE /pbxcore/api/v2/incoming-routes/deleteRecord/{id}` - delete route

## Test Scenarios

1. Create new incoming route
2. Edit existing route
3. Delete route (except ID=1)
4. Attempt to delete default route (should fail)
5. Update default route settings
6. Drag-and-drop priority reordering
7. Validate required fields based on action type
8. Test conditional field visibility
9. Verify extension/provider/audio file references
10. Check time condition integration (if implemented)
11. Test copy functionality
12. Verify form state and URL updates

## Special Considerations

### Default Route (ID=1)
- Cannot be deleted
- Has fixed priority 9999
- Displayed separately from regular routes
- Uses separate form on index page

### Priority Management
- Auto-assignment for new routes
- Drag-and-drop reordering via REST API
- Updates via `updatePriority` endpoint

### Action-Dependent Fields
- Extension field required for 'extension' and 'did2user' actions
- Audio message field required for 'playback' action
- Conditional validation and field visibility

### Time Conditions
- Integration with `OutWorkTimesRouts` model
- Deletion cascading for time conditions
- Future enhancement for time-based routing UI

This migration plan provides a comprehensive approach to modernizing the incoming routes system while maintaining all existing functionality and preparing for future enhancements.