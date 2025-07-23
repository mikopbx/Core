# MikoPBX Conference Rooms REST API Migration Plan

## Project Overview

This document contains a detailed plan for adapting the MikoPBX conference room management system to use a unified REST API architecture. The plan is based on the guide `docs/mikopbx-rest-migration-guide.md` and follows the principles of minimal changes to the user interface.

## Current State

### Existing Architecture
- **Model**: `src/Common/Models/ConferenceRooms.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/ConferenceRoomsController.php`
- **Form**: `src/AdminCabinet/Forms/ConferenceRoomEditForm.php`
- **Partial REST API**: Only delete action implemented
- **JavaScript**: Basic list and delete functions

### ConferenceRooms Model Fields
```php
public $id;           // Primary key
public $uniqid;       // Unique identifier
public $extension;    // Extension number
public $name;         // Conference name
public $pinCode;      // Access PIN code
```

### Model Relations
- `belongsTo` → `Extensions` (by extension field)

## Detailed Implementation Plan

### Stage 1: Creating REST API Backend

#### 1.1 MikoPBX REST API Architecture

**Important**: In MikoPBX REST API architecture, Action classes are executed in Workers without HTTP context. Therefore, they should not inherit from Injectable and work with $this->request directly.

**Correct Flow**:
```
HTTP Request → Controller → Worker → Action → Database → Response
```

#### 1.3 Action Classes for Conferences

**File**: `src/PBXCoreREST/Lib/ConferenceRooms/GetRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting conference room record
 * 
 * @api {get} /pbxcore/api/v2/conference-rooms/getRecord/:id Get conference room record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup ConferenceRooms
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Conference room data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.extension Extension number
 * @apiSuccess {String} data.name Conference name
 * @apiSuccess {String} data.pinCode PIN code
 */
class GetRecordAction
{
    /**
     * Get conference room record
     * @param string|null $id - Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
       $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id) || $id === 'new') {
            // Create structure for new record
            $newRoom = new ConferenceRooms();
            $newRoom->id = '';
            $newRoom->uniqid = ConferenceRooms::generateUniqueID(Extensions::TYPE_CONFERENCE.'-');
            $newRoom->extension = Extensions::getNextFreeApplicationNumber();
            $newRoom->name = '';
            $newRoom->pinCode = '';
            
            $res->data = DataStructure::createFromModel($newRoom);
            $res->success = true;
        } else {
            // Find existing record
            $room = ConferenceRooms::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);
            
            if ($room) {
                $res->data = DataStructure::createFromModel($room);
                $res->success = true;
            } else {
                $res->messages['error'][] = 'Conference room not found';
            }
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/ConferenceRooms/GetListAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all conference rooms
 * 
 * @api {get} /pbxcore/api/v2/conference-rooms/getList Get all conference rooms
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup ConferenceRooms
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of conference rooms
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.extension Extension number
 * @apiSuccess {String} data.name Conference name
 * @apiSuccess {String} data.pinCode PIN code
 */
class GetListAction
{
    /**
     * Get list of all conference rooms
     * 
     * @param array $data - Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get all conference rooms sorted by name
            $rooms = ConferenceRooms::find([
                'order' => 'name ASC'
            ]);
            
            $data = [];
            foreach ($rooms as $room) {
                $data[] = DataStructure::createFromModel($room);
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

**File**: `src/PBXCoreREST/Lib/ConferenceRooms/SaveRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for saving conference room record
 * 
 * @api {post} /pbxcore/api/v2/conference-rooms/saveRecord Create conference room
 * @api {put} /pbxcore/api/v2/conference-rooms/saveRecord/:id Update conference room
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup ConferenceRooms
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} name Conference name
 * @apiParam {String} extension Extension number (2-8 digits)
 * @apiParam {String} [pinCode] PIN code (digits only)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved conference room data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction
{
    /**
     * Save conference room record
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
            'name' => 'string|html_escape|max:100',
            'extension' => 'string|regex:/^[0-9]{2,8}$/|max:8',
            'pinCode' => 'string|regex:/^[0-9]*$/|max:20|empty_to_null'
        ];
        $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);
        
        // Validate required fields
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Conference room name is required']
            ],
            'extension' => [
                ['type' => 'required', 'message' => 'Extension number is required'],
                ['type' => 'regex', 'pattern' => '/^[0-9]{2,8}$/', 'message' => 'Extension must be 2-8 digits']
            ]
        ];
        $validationErrors = BaseActionHelper::validateData($data, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Get or create model
        if (!empty($data['id'])) {
            $room = ConferenceRooms::findFirstById($data['id']);
            if (!$room) {
                $res->messages['error'][] = 'api_ConferenceRoomNotFound';
                return $res;
            }
        } else {
            $room = new ConferenceRooms();
            $room->uniqid = ConferenceRooms::generateUniqueID(Extensions::TYPE_CONFERENCE.'-');
        }
        
        // Check extension uniqueness
        if (!BaseActionHelper::checkUniqueness(
            Extensions::class,
            'number',
            $data['extension'],
            $room->extension
        )) {
            $res->messages['error'][] = 'Extension number already exists';
            return $res;
        }
        
        try {
            // Save in transaction using BaseActionHelper
            $savedRoom = BaseActionHelper::executeInTransaction(function() use ($room, $data) {
                // Update/create Extension
                $extension = Extensions::findFirstByNumber($room->extension);
                if (!$extension) {
                    $extension = new Extensions();
                    $extension->type = Extensions::TYPE_CONFERENCE;
                    $extension->show_in_phonebook = 1;
                    $extension->public_access = 1;
                }
                
                $extension->number = $data['extension'];
                $extension->callerid = $data['name'];
                
                if (!$extension->save()) {
                    throw new \Exception(implode(', ', $extension->getMessages()));
                }
                
                // Update ConferenceRoom
                $room->extension = $data['extension'];
                $room->name = $data['name'];
                $room->pinCode = $data['pinCode'] ?? '';
                
                if (!$room->save()) {
                    throw new \Exception(implode(', ', $room->getMessages()));
                }
                
                return $room;
            });
            
            $res->data = DataStructure::createFromModel($savedRoom);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "conference-rooms/modify/{$savedRoom->uniqid}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
}
```

**File**: `src/PBXCoreREST/Lib/ConferenceRooms/DataStructure.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

/**
 * Data structure for conference rooms
 * 
 * @package MikoPBX\PBXCoreREST\Lib\ConferenceRooms
 */
class DataStructure
{
    /**
     * Create data array from ConferenceRooms model
     * @param \MikoPBX\Common\Models\ConferenceRooms $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        return [
            'id' => (string)$model->id,
            'uniqid' => $model->uniqid,
            'extension' => $model->extension,
            'name' => $model->name,
            'pinCode' => $model->pinCode ?? ''
        ];
    }
}
```

**File**: `src/PBXCoreREST/Lib/ConferenceRooms/DeleteRecordAction.php` (use existing)
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for deleting conference room record
 * 
 * @api {delete} /pbxcore/api/v2/conference-rooms/deleteRecord/:id Delete conference room
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup ConferenceRooms
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
     * Delete conference room record
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
            // Find record by uniqid or id
            $room = ConferenceRooms::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);
            
            if (!$room) {
                $res->messages['error'][] = 'api_ConferenceRoomNotFound';
                return $res;
            }
            
            // Delete in transaction using BaseActionHelper
            BaseActionHelper::executeInTransaction(function() use ($room) {
                // Delete related extension
                $extension = Extensions::findFirstByNumber($room->extension);
                if ($extension) {
                    if (!$extension->delete()) {
                        throw new \Exception('Failed to delete extension: ' . implode(', ', $extension->getMessages()));
                    }
                }
                
                // Delete conference room itself
                if (!$room->delete()) {
                    throw new \Exception('Failed to delete conference room: ' . implode(', ', $room->getMessages()));
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

#### 1.4 REST API Controllers

**Note**: MikoPBX uses a standardized approach with a single `callAction` method and `{actionName}` parameter in routes. This avoids creating separate routes for each action.

**Updates to existing file**: `src/PBXCoreREST/Controllers/ConferenceRooms/GetController.php`

Update `callAction` method to support new actions:
```php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\ConferenceRooms;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ConferenceRoomsManagementProcessor;

/**
 * GET controller for conference rooms management
 * 
 * @RoutePrefix("/pbxcore/api/v2/conference-rooms")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/conference-rooms/getRecord/CONFERENCE-123ABC
 * curl http://127.0.0.1/pbxcore/api/v2/conference-rooms/getRecord/new
 * curl http://127.0.0.1/pbxcore/api/v2/conference-rooms/getList
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\ConferenceRooms
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get conference room record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all conference rooms
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
            ConferenceRoomsManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
```

**New file**: `src/PBXCoreREST/Controllers/ConferenceRooms/PostController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\ConferenceRooms;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ConferenceRoomsManagementProcessor;

/**
 * POST controller for conference rooms management
 * 
 * @RoutePrefix("/pbxcore/api/v2/conference-rooms")
 * 
 * @examples
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/conference-rooms/saveRecord \
 *   -d "name=Sales Conference&extension=2001&pinCode=1234"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\ConferenceRooms
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates conference room record
     * @Post("/saveRecord")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        
        $this->sendRequestToBackendWorker(
            ConferenceRoomsManagementProcessor::class,
            $actionName,
            $postData
        );
    }
    
}

```

**New file**: `src/PBXCoreREST/Controllers/ConferenceRooms/PutController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\ConferenceRooms;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ConferenceRoomsManagementProcessor;

/**
 * PUT controller for conference rooms management
 * 
 * @RoutePrefix("/pbxcore/api/v2/conference-rooms")
 * 
 * @examples
 * curl -X PUT http://127.0.0.1/pbxcore/api/v2/conference-rooms/saveRecord/CONFERENCE-123ABC \
 *   -d "name=Updated Conference&extension=2002&pinCode=5678"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\ConferenceRooms
 */
class PutController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Conference room ID for update operations
     * 
     * Updates existing conference room record
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
            ConferenceRoomsManagementProcessor::class,
            $actionName,
            $putData
        );
    }
    
}
```

**New file**: `src/PBXCoreREST/Controllers/ConferenceRooms/DeleteController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\ConferenceRooms;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\ConferenceRoomsManagementProcessor;

/**
 * DELETE controller for conference rooms management
 * 
 * @RoutePrefix("/pbxcore/api/v2/conference-rooms")
 * 
 * @examples
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v2/conference-rooms/deleteRecord/CONFERENCE-123ABC
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\ConferenceRooms
 */
class DeleteController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Conference room ID to delete
     * 
     * Deletes conference room record
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
            ConferenceRoomsManagementProcessor::class,
            $actionName,
            $deleteData
        );
    }
    
}
```

#### 1.5 Update Processor

**Changes to file**: `src/PBXCoreREST/Lib/ConferenceRoomsManagementProcessor.php`

```php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\ConferenceRooms\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction
};
use Phalcon\Di\Injectable;

/**
 * Conference rooms management processor
 *
 * Handles all conference room management operations including:
 * - getRecord: Get single conference room by ID or create new structure
 * - getList: Get list of all conference rooms
 * - saveRecord: Create or update conference room
 * - deleteRecord: Delete conference room
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class ConferenceRoomsManagementProcessor extends Injectable
{
    /**
     * Processes conference room management requests
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

#### 1.6 REST API Routes

**Add to file**: `src/PBXCoreREST/Providers/RouterProvider.php`

Add to routes array:
```php
Use ConferenceRooms\GetController as ConferenceRoomsGetController,
    ConferenceRooms\PostController as ConferenceRoomsPostController,
    ConferenceRooms\PutController as ConferenceRoomsPutController;

// GET routes
[
    ConferenceRoomsGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/conference-rooms/{actionName}', 
    'get', 
    '/'
],
[
    ConferenceRoomsGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/conference-rooms/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'get', 
    '/'
],
// POST route
[
    ConferenceRoomsPostController::class, 
    'callAction', 
    '/pbxcore/api/v2/conference-rooms/{actionName}', 
    'post', 
    '/'
],
// PUT route
[
    ConferenceRoomsPutController::class, 
    'callAction', 
    '/pbxcore/api/v2/conference-rooms/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'put', 
    '/'
],
// DELETE route
[
    ConferenceRoomsDeleteController::class, 
    'callAction', 
    '/pbxcore/api/v2/conference-rooms/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'delete', 
    '/'
],
```

**Important**: MikoPBX uses a standardized approach with `{actionName}` parameter in routes. This allows handling any actions without creating separate routes.


### Stage 2: Update JavaScript Client

#### 2.1 Extend API Methods

**Changes to file**: `sites/admin-cabinet/assets/js/src/PbxAPI/conferenceRoomsAPI.js`

Replace content with:
```javascript
//<Copyright>

/* global globalRootUrl, PbxApi, globalTranslate */

/**
 * ConferenceRoomsAPI - REST API for conference room management
 * 
 * Uses unified approach with centralized endpoint definitions.
 * This provides:
 * - Single point of API URL management
 * - Easy API version switching (v2 -> v3)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
const ConferenceRoomsAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/conference-rooms/`,
    
    // Endpoint definitions for unification
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/conference-rooms/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/conference-rooms/getRecord`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/conference-rooms/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/conference-rooms/deleteRecord`
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

**New file**: `sites/admin-cabinet/assets/js/src/ConferenceRooms/conference-room-modify.js`
```javascript
//<Copyright>

/* global globalRootUrl, ConferenceRoomsAPI, Form, globalTranslate, UserMessage, Extensions */

/**
 * Conference room edit form management module
 */
const conferenceRoomModify = {
    $formObj: $('#conference-room-form'),
    $number: $('#extension'),
    defaultExtension: '',
    
    /**
     * Правила валидации формы
     */
    validateRules: {
        name: {
            identifier: 'name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.cr_ValidateNameIsEmpty
                }
            ]
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.cr_ValidateExtensionIsEmpty
                },
                {
                    type: 'regExp[/^[0-9]{2,8}$/]',
                    prompt: globalTranslate.cr_ValidateExtensionFormat
                },
                {
                    type: 'existRule[extension-error]',
                    prompt: globalTranslate.cr_ValidateExtensionDouble,
                },
            ]
        },
        pinCode: {
            identifier: 'pinCode',
            rules: [
                {
                    type: 'regExp[/^[0-9]*$/]',
                    prompt: globalTranslate.cr_ValidatePinNumber,
                },
            ],
        },
    },
    
    /**
     * Module initialization
     */
    initialize() {
        // Add handler to dynamically check if the input number is available
        let timeoutId;
        conferenceRoomModify.$number.on('input', () => {
            // Clear the previous timer, if it exists
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            // Set a new timer with a delay of 0.5 seconds
            timeoutId = setTimeout(() => {
                // Get the newly entered number
                const newNumber = conferenceRoomModify.$formObj.form('get value', 'extension');

                // Execute the availability check for the number
                Extensions.checkAvailability(conferenceRoomModify.defaultExtension, newNumber);
            }, 500);
        });
        
        // Configure Form.js
        Form.$formObj = conferenceRoomModify.$formObj;
        Form.url = '#'; // Не используется при REST API
        Form.validateRules = conferenceRoomModify.validateRules;
        Form.cbBeforeSendForm = conferenceRoomModify.cbBeforeSendForm;
        Form.cbAfterSendForm = conferenceRoomModify.cbAfterSendForm;
        
        // Настройка REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = ConferenceRoomsAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}conference-rooms/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}conference-rooms/modify/`;
        
        // Initialize Form with all standard features:
        // - Dirty checking (change tracking)
        // - Dropdown submit (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
        // - Form validation
        // - AJAX response handling
        Form.initialize();
        
        // Load form data
        conferenceRoomModify.initializeForm();
    },
    
    /**
     * Load data into form
     */
    initializeForm() {
        const recordId = conferenceRoomModify.getRecordId();
        
        ConferenceRoomsAPI.getRecord(recordId, (response) => {
            if (response.result) {
                conferenceRoomModify.populateForm(response.data);
                // Get the default extension from the form
                conferenceRoomModify.defaultExtension = conferenceRoomModify.$formObj.form('get value', 'extension');
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load conference room data');
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
        // Можно динамически изменить HTTP метод если нужно
        // const recordId = $('#id').val();
        // Form.apiSettings.httpMethod = recordId ? 'PUT' : 'POST';
        
        // Возвращаем settings для продолжения обработки
        return settings;
    },
    
     /**
     * Callback after form submission
     * Handles different save modes (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
     */
    cbAfterSendForm(response) {
        if (response.result) {
           
            if (response.data) {
                conferenceRoomModify.populateForm(response.data);
            }
            
             // Update URL for new records
            const currentId = $('#id').val();
            if (!currentId && response.data && response.data.uniqid) {
                const newUrl = window.location.href.replace(/modify\/?$/, `modify/${response.data.uniqid}`);
                window.history.pushState(null, '', newUrl);
            }
            
        }
    },
    
    /**
     * Populate form with data
     */
    populateForm(data) {
        Form.$formObj.form('set values', data);
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    },
    
};

/**
 * Checks if the number is taken by another account
 * @returns {boolean} True if the parameter has the 'hidden' class, false otherwise
 */
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    conferenceRoomModify.initialize();
});

```

#### 2.3 Integration with delete-something.js

**Conflict analysis**: The existing `delete-something.js` mechanism provides a standardized two-step deletion process but conflicts with double-click edit functionality.

**How delete-something.js works**:
1. **First click** on button with `two-steps-delete` class:
   - Button is temporarily disabled
   - After 200ms, `two-steps-delete` class is removed and icon changes from `trash` to `close`
   - After 3 seconds, `two-steps-delete` class is restored and icon changes back to `trash`

2. **Second click** (within 3 seconds):
   - Button no longer has `two-steps-delete` class, so delete-something doesn't handle it
   - Our delete handler is triggered

3. **Protection from accidental double-click**:
   - Elements with `two-steps-delete` have a `dblclick` handler that stops the event

**Conflict resolution**: Modify double-click selector to exclude cells with action buttons.

#### 2.4 Update Conference List

**Changes to file**: `sites/admin-cabinet/assets/js/src/ConferenceRooms/conference-rooms-index.js`

Replace content with:
```javascript
//<Copyright>

/* global globalRootUrl, ConferenceRoomsAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization */

/**
 * Conference table management module
 */
const conferenceTable = {
    $conferencesTable: $('#conference-rooms-table'),
    dataTable: {},

    /**
     * Initialize the module
     */
    initialize() {
        // Initially show placeholder until data loads
        conferenceTable.toggleEmptyPlaceholder(true);
        
        conferenceTable.initializeDataTable();
    },
    
    /**
     * Initialize DataTable
     */
    initializeDataTable() {
        conferenceTable.dataTable = conferenceTable.$conferencesTable.DataTable({
            ajax: {
                url: ConferenceRoomsAPI.endpoints.getList,
                dataSrc: function(json) {
                    console.log('API Response:', json); // Debug log
                    
                    // Manage empty state
                    conferenceTable.toggleEmptyPlaceholder(
                        !json.result || !json.data || json.data.length === 0
                    );
                    return json.result ? json.data : [];
                }
            },
            columns: [
                {
                    data: 'name',
                    render: function(data, type, row) {
                        return `<strong>${data}</strong>`;
                    }
                },
                {
                    data: 'extension',
                    className: 'center aligned'
                },
                {
                    data: 'pinCode',
                    className: 'center aligned hide-on-mobile',
                    responsivePriority: 2,
                    render: function(data) {
                        return data || '—';
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'right aligned action-buttons', // Added class for identification
                    responsivePriority: 1,
                    render: function(data, type, row) {
                        return `<div class="ui basic icon buttons">
                            <a href="${globalRootUrl}conference-rooms/modify/${row.uniqid}" 
                               class="ui button popuped" 
                               data-content="${globalTranslate.bt_ToolTipEdit}">
                                <i class="edit icon"></i>
                            </a>
                            <a href="#" 
                               data-value="${row.uniqid}" 
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
                conferenceTable.$conferencesTable.find('.popuped').popup();
                
                // Double-click for editing
                conferenceTable.initializeDoubleClickEdit();
            }
        });
        
        // Handle deletion using DeleteSomething.js
        // DeleteSomething.js automatically handles first click
        // We only listen for second click (when two-steps-delete class is removed)
        conferenceTable.$conferencesTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const roomId = $button.attr('data-value');
            
            // Add loading indicator and disable button
            $button.addClass('loading disabled');
            
            ConferenceRoomsAPI.deleteRecord(roomId, conferenceTable.cbAfterDeleteRecord);
        });
    },
    
    /**
     * Callback after record deletion
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Reload table
            conferenceTable.dataTable.ajax.reload();
            
            // Update related components
            if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
                Extensions.cbOnDataChanged();
            }
            
            UserMessage.showSuccess(globalTranslate.cr_ConferenceRoomDeleted);
        } else {
            UserMessage.showError(
                response.messages?.error || 
                globalTranslate.cr_ImpossibleToDeleteConferenceRoom
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
            $('#conference-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-button').show();
            $('#conference-table-container').show();
        }
    },
    
  /**
     * Initialize double-click for editing
     * IMPORTANT: Exclude cells with action-buttons class to avoid conflict with delete-something.js
     */
    initializeDoubleClickEdit() {
        conferenceTable.$conferencesTable.on('dblclick', 'tbody td:not(.action-buttons)', function() {
            const data = conferenceTable.dataTable.row(this).data();
            if (data && data.uniqid) {
                window.location = `${globalRootUrl}conference-rooms/modify/${data.uniqid}`;
            }
        });
    }
};

/**
 *  Initialize on document ready
 */
$(document).ready(() => {
    conferenceTable.initialize();
});


```

#### 2.4.1 Update Volt Template

**Changes to file**: `src/AdminCabinet/Views/ConferenceRooms/index.volt`

Replace content with:
```volt
<div id="add-new-button">
    {% if isAllowed('save') %}
        {{ link_to("conference-rooms/modify", '<i class="add circle icon"></i> '~t._('cr_AddNewConferenceRoom'), "class": "ui blue button") }}
    {% endif %}
</div>

<div id="conference-table-container">
    <table class="ui selectable compact unstackable table" id="conference-rooms-table">
        <thead>
            <tr>
                <th>{{ t._('cr_ColumnName') }}</th>
                <th>{{ t._('cr_ColumnExtension') }}</th>
                <th class="hide-on-mobile">{{ t._('cr_ColumnPinCode') }}</th>
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
        'icon': 'phone volume',
        'title': t._('cr_EmptyTableTitle'),
        'description': t._('cr_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('cr_AddNewConferenceRoom'),
        'addButtonLink': 'conference-rooms/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/conference-rooms'
    ]) }}
</div>

```

#### 2.4.2 Update AssetProvider for DataTables

**Changes to file**: `src/AdminCabinet/Providers/AssetProvider.php`

Add DataTables assets for conference list page:

```php
 private function makeConferenceRoomsAssets(string $action): void
    {
        if ($action === 'index') {
            // DataTables for conference list
            $this->headerCollectionCSS
                ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
            $this->footerCollectionJS
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true);

                 // Main page module
            $this->footerCollectionJS     
                ->addJs('js/pbx/PbxAPI/conferenceRoomsAPI.js', true)
                ->addJs('js/pbx/ConferenceRooms/conference-rooms-index.js', true);
        } elseif ($action === 'modify') {
            $this->footerCollectionJS
                // Edit module
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/PbxAPI/conferenceRoomsAPI.js', true)
                ->addJs('js/pbx/ConferenceRooms/conference-room-modify.js', true);
        }
    }
```

**Important**: AssetProvider automatically includes necessary JavaScript and CSS files based on controller and action. DataTables requires:


### Stage 3: Benefits of Using delete-something.js

**Integration with existing mechanism**:
1. **Standardized UX** - Same deletion logic throughout MikoPBX
2. **Protection from accidental deletion** - Two-step process with visual feedback
3. **Automatic reset** - Button returns to initial state after 3 seconds
4. **Less code** - No need to implement custom two-step deletion logic
5. **Compatibility** - Works with any buttons with `two-steps-delete` class

**Key code changes**:
- Added `action-buttons` class to button column
- Changed double-click selector: `'tbody td:not(.action-buttons)'`
- Simplified delete handler: listen only for `'a.delete:not(.two-steps-delete)'`
- delete-something.js is included automatically, no additional setup required

### Stage 4: AdminCabinet Adaptation

**Changes to file**: `src/AdminCabinet/Controllers/ConferenceRoomsController.php`

Replace data fetching logic in `modifyAction` method:
```php
<?php
//<Copyright>

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\ConferenceRoomEditForm;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;

class ConferenceRoomsController extends BaseController
{
    /**
     * Build the list of conference rooms.
     */
    public function indexAction(): void
    {
        // The data will load by DataTable AJAX
    }

    /**
     * Edit conference room details.
     *
     * @param string|null $uniqid The unique identifier of the conference room.
     */
    public function modifyAction(string $uniqid = null): void
    {
         // Get data via REST API
        $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/v2/conference-rooms/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            ['id' => $uniqid]
        ]);
        
        if (!$restAnswer->success) {
            $this->flash->error(json_encode($restAnswer->messages));
            $this->dispatcher->forward([
                'controller' => 'conference-rooms',
                'action' => 'index'
            ]);
            return;
        }
        
        $getRecordStructure = (object)$restAnswer->data;
        
        // Create form based on API data structure
        $this->view->form = new ConferenceRoomEditForm($getRecordStructure);
        $this->view->represent = $getRecordStructure->name ?: '';
        $this->view->extension = $getRecordStructure->extension ?: '';
    }

}

```

### Stage 5: Translations

**Add to file**: `src/Common/Messages/en.php`
```php
'cr_ValidateNameIsEmpty' => 'Conference room name is required',
'cr_ValidateExtensionIsEmpty' => 'Conference extension is required',
'cr_ValidateExtensionFormat' => 'Extension must be 2-8 digits',
'cr_ConferenceRoomSaved' => 'Conference room saved successfully',
'cr_ConferenceRoomDeleted' => 'Conference room deleted successfully',
```

### Stage 6: Build and Testing

#### 6.1 JavaScript Transpilation
```bash
# For core system files
docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/ConferenceRooms/conference-room-modify.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/ConferenceRooms/conference-rooms-index.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/PbxAPI/conferenceRoomsAPI.js \
  core
```

#### 6.2 PHPStan Check
```bash
# Check PHP code quality
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse /offload/rootfs/usr/www/src/PBXCoreREST/Lib/ConferenceRooms/
```

## New Files to Create

1. `src/PBXCoreREST/Lib/ConferenceRooms/GetRecordAction.php`
2. `src/PBXCoreREST/Lib/ConferenceRooms/GetListAction.php`
3. `src/PBXCoreREST/Lib/ConferenceRooms/SaveRecordAction.php`
4. `src/PBXCoreREST/Lib/ConferenceRooms/DataStructure.php`
5. `src/PBXCoreREST/Controllers/ConferenceRooms/PostController.php`
6. `src/PBXCoreREST/Controllers/ConferenceRooms/PutController.php`
7. `src/PBXCoreREST/Controllers/ConferenceRooms/DeleteController.php`
8. `sites/admin-cabinet/assets/js/src/ConferenceRooms/conference-room-modify.js`


## Files to Modify

1. `src/PBXCoreREST/Lib/ConferenceRoomsManagementProcessor.php`
2. `src/PBXCoreREST/Providers/RouterProvider.php`
3. `sites/admin-cabinet/assets/js/src/PbxAPI/conferenceRoomsAPI.js`
4. `sites/admin-cabinet/assets/js/src/ConferenceRooms/conference-rooms-index.js`
5. `src/AdminCabinet/Controllers/ConferenceRoomsController.php`
6. `src/AdminCabinet/Views/ConferenceRooms/index.volt`
7. `src/Common/Messages/ru.php`
8. `src/AdminCabinet/Providers/AssetProvider.php`

## Expected Results

After implementing the plan, the conference room management system will:

- ✅ Use unified REST API architecture
- ✅ Support full CRUD functionality via REST API
- ✅ Provide two-level data sanitization
- ✅ Use DataTable for list display
- ✅ Integrate with existing Form.js mechanism
- ✅ Preserve all existing UI/UX patterns
- ✅ Correctly display welcome message for empty table
- ✅ Be ready for external integrations
- ✅ Comply with MikoPBX architectural principles

## Testing

### REST API Endpoints for Testing:
- `GET /pbxcore/api/v2/conference-rooms/getList` - conference list
- `GET /pbxcore/api/v2/conference-rooms/getRecord/new` - new conference structure
- `GET /pbxcore/api/v2/conference-rooms/getRecord/{id}` - specific conference
- `POST /pbxcore/api/v2/conference-rooms/saveRecord` - create conference
- `PUT /pbxcore/api/v2/conference-rooms/saveRecord/{id}` - update conference
- `DELETE /pbxcore/api/v2/conference-rooms/deleteRecord/{id}` - delete conference

### Test Scenarios:
1. Create new conference
2. Edit existing conference
3. Delete conference
4. Validate required fields
5. Check extension number uniqueness
6. Update DataTable after operations
7. Save form state and URL
8. Display welcome message for empty table
9. Correct hide/show placeholder after adding/deleting records

### Debugging

If conference table doesn't display correctly:

1. **Check browser console** for JavaScript errors
2. **Check Network tab** to view API responses:
   - API should return structure: `{result: true, data: [...], messages: {...}}`
   - Field `result` (not `success`) indicates operation success. All JavaScript files must use `response.result` instead of `response.success`
3. **Check AssetProvider** - ensure DataTables libraries are included
4. **Check access rights** - user must have rights to view conferences



### 5. Dynamic Extension Availability Check Support

Added integration with Extensions.checkAvailability for real-time extension availability checking:

```javascript
// conference-room-modify.js
let timeoutId;
conferenceRoomModify.$number.on('input', () => {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
        const newNumber = conferenceRoomModify.$formObj.form('get value', 'extension');
        Extensions.checkAvailability(conferenceRoomModify.defaultExtension, newNumber);
    }, 500);
});
```