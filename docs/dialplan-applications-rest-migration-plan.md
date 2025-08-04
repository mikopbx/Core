# MikoPBX Dialplan Applications REST API Migration Plan

## Project Overview

This document contains a detailed plan for adapting the MikoPBX dialplan applications management system to use a unified REST API architecture. The plan is based on the guide `docs/mikopbx-rest-migration-guide.md` and follows the principles of minimal changes to the user interface.

## Current State

### Existing Architecture
- **Model**: `src/Common/Models/DialplanApplications.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/DialplanApplicationsController.php`
- **Form**: `src/AdminCabinet/Forms/DialplanApplicationEditForm.php`
- **Partial REST API**: Only delete action implemented
- **JavaScript**: Basic list and delete functions with Ace editor integration

### DialplanApplications Model Fields
```php
public $id;             // Primary key
public $uniqid;         // Unique identifier
public $extension;      // Extension number
public $name;           // Application name
public $hint;           // Application hint
public $applicationlogic; // Base64-encoded application logic (PHP or plaintext)
public $type;           // Application type ('php' or 'plaintext')
public $description;    // Application description
```

### Model Relations
- `belongsTo` → `Extensions` (by extension field)

### Special Features
- **Base64 encoding/decoding** for `applicationlogic` field via `getApplicationlogic()` and `setApplicationlogic()` methods
- **Ace editor integration** with PHP and plaintext syntax highlighting
- **Fullscreen editor support** with dynamic height calculation
- **Type-dependent syntax highlighting** (PHP mode vs Julia mode for plaintext)

## Detailed Implementation Plan

### Stage 1: Creating REST API Backend

#### 1.1 MikoPBX REST API Architecture

**Important**: In MikoPBX REST API architecture, Action classes are executed in Workers without HTTP context. Therefore, they should not inherit from Injectable and work with $this->request directly.

**Correct Flow**:
```
HTTP Request → Controller → Worker → Action → Database → Response
```

#### 1.3 Action Classes for Dialplan Applications

**File**: `src/PBXCoreREST/Lib/DialplanApplications/GetRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting dialplan application record
 * 
 * @api {get} /pbxcore/api/v2/dialplan-applications/getRecord/:id Get dialplan application record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup DialplanApplications
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Dialplan application data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.extension Extension number
 * @apiSuccess {String} data.name Application name
 * @apiSuccess {String} data.hint Application hint
 * @apiSuccess {String} data.applicationlogic Application logic (decoded)
 * @apiSuccess {String} data.type Application type ('php'|'plaintext')
 * @apiSuccess {String} data.description Application description
 */
class GetRecordAction
{
    /**
     * Get dialplan application record
     * @param string|null $id - Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
       $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id) || $id === 'new') {
            // Create structure for new record
            $newApp = new DialplanApplications();
            $newApp->id = '';
            $newApp->uniqid = DialplanApplications::generateUniqueID('DIALPLAN-APP-');
            $newApp->extension = Extensions::getNextFreeApplicationNumber();
            $newApp->name = '';
            $newApp->hint = '';
            $newApp->applicationlogic = '';
            $newApp->type = 'php';
            $newApp->description = '';
            
            $res->data = DataStructure::createFromModel($newApp);
            $res->success = true;
        } else {
            // Find existing record
            $app = DialplanApplications::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);
            
            if ($app) {
                $res->data = DataStructure::createFromModel($app);
                $res->success = true;
            } else {
                $res->messages['error'][] = 'Dialplan application not found';
            }
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/DialplanApplications/GetListAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all dialplan applications
 * 
 * @api {get} /pbxcore/api/v2/dialplan-applications/getList Get all dialplan applications
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup DialplanApplications
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of dialplan applications
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.extension Extension number
 * @apiSuccess {String} data.name Application name
 * @apiSuccess {String} data.hint Application hint
 * @apiSuccess {String} data.applicationlogic Application logic (decoded)
 * @apiSuccess {String} data.type Application type ('php'|'plaintext')
 * @apiSuccess {String} data.description Application description
 */
class GetListAction
{
    /**
     * Get list of all dialplan applications
     * 
     * @param array $data - Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get all dialplan applications sorted by name
            $apps = DialplanApplications::find([
                'order' => 'name ASC'
            ]);
            
            $data = [];
            foreach ($apps as $app) {
                $data[] = DataStructure::createFromModel($app);
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

**File**: `src/PBXCoreREST/Lib/DialplanApplications/SaveRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for saving dialplan application record
 * 
 * @api {post} /pbxcore/api/v2/dialplan-applications/saveRecord Create dialplan application
 * @api {put} /pbxcore/api/v2/dialplan-applications/saveRecord/:id Update dialplan application
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup DialplanApplications
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} name Application name
 * @apiParam {String} extension Extension number (2-8 digits)
 * @apiParam {String} [hint] Application hint
 * @apiParam {String} [applicationlogic] Application logic code
 * @apiParam {String} [type] Application type ('php'|'plaintext'), default 'php'
 * @apiParam {String} [description] Application description
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved dialplan application data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction
{
    /**
     * Save dialplan application record
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
            'extension' => 'string|regex:/^[0-9#+\\*|X]{1,64}$/|max:64',
            'hint' => 'string|html_escape|max:255|empty_to_null',
            'applicationlogic' => 'string|empty_to_null',
            'type' => 'string|in:php,plaintext',
            'description' => 'string|html_escape|max:500|empty_to_null'
        ];
        $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);
        
        // Validate required fields
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Dialplan application name is required']
            ],
            'extension' => [
                ['type' => 'required', 'message' => 'Extension number is required'],
                ['type' => 'regex', 'pattern' => '/^[0-9#+\\*|X]{1,64}$/', 'message' => 'Invalid extension format']
            ]
        ];
        $validationErrors = BaseActionHelper::validateData($data, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Get or create model
        if (!empty($data['id'])) {
            $app = DialplanApplications::findFirstById($data['id']);
            if (!$app) {
                $res->messages['error'][] = 'api_DialplanApplicationNotFound';
                return $res;
            }
        } else {
            $app = new DialplanApplications();
            $app->uniqid = DialplanApplications::generateUniqueID('DIALPLAN-APP-');
        }
        
        // Check extension uniqueness
        if (!BaseActionHelper::checkUniqueness(
            Extensions::class,
            'number',
            $data['extension'],
            $app->extension
        )) {
            $res->messages['error'][] = 'Extension number already exists';
            return $res;
        }
        
        try {
            // Save in transaction using BaseActionHelper
            $savedApp = BaseActionHelper::executeInTransaction(function() use ($app, $data) {
                // Update/create Extension
                $extension = Extensions::findFirstByNumber($app->extension);
                if (!$extension) {
                    $extension = new Extensions();
                    $extension->type = Extensions::TYPE_DIALPLAN_APPLICATION;
                    $extension->show_in_phonebook = 1;
                    $extension->public_access = 0;
                    $extension->userid = null;
                }
                
                $extension->number = $data['extension'];
                $extension->callerid = $data['name'];
                
                if (!$extension->save()) {
                    throw new \Exception(implode(', ', $extension->getMessages()));
                }
                
                // Update DialplanApplication
                $app->extension = $data['extension'];
                $app->name = $data['name'];
                $app->hint = $data['hint'] ?? '';
                $app->type = $data['type'] ?? 'php';
                $app->description = $data['description'] ?? '';
                
                // Handle application logic with base64 encoding
                if (isset($data['applicationlogic'])) {
                    $app->setApplicationlogic($data['applicationlogic']);
                }
                
                if (!$app->save()) {
                    throw new \Exception(implode(', ', $app->getMessages()));
                }
                
                return $app;
            });
            
            $res->data = DataStructure::createFromModel($savedApp);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "dialplan-applications/modify/{$savedApp->uniqid}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
}
```

**File**: `src/PBXCoreREST/Lib/DialplanApplications/DataStructure.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

/**
 * Data structure for dialplan applications
 * 
 * @package MikoPBX\PBXCoreREST\Lib\DialplanApplications
 */
class DataStructure
{
    /**
     * Create data array from DialplanApplications model
     * @param \MikoPBX\Common\Models\DialplanApplications $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        return [
            'id' => (string)$model->id,
            'uniqid' => $model->uniqid,
            'extension' => $model->extension,
            'name' => $model->name,
            'hint' => $model->hint ?? '',
            'applicationlogic' => $model->getApplicationlogic(), // Decoded logic
            'type' => $model->type ?? 'php',
            'description' => $model->description ?? ''
        ];
    }
}
```

**File**: `src/PBXCoreREST/Lib/DialplanApplications/DeleteRecordAction.php` (update existing)
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for deleting dialplan application record
 * 
 * @api {delete} /pbxcore/api/v2/dialplan-applications/deleteRecord/:id Delete dialplan application
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup DialplanApplications
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
     * Delete dialplan application record
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
            $app = DialplanApplications::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);
            
            if (!$app) {
                $res->messages['error'][] = 'api_DialplanApplicationNotFound';
                return $res;
            }
            
            // Delete in transaction using BaseActionHelper
            BaseActionHelper::executeInTransaction(function() use ($app) {
                // Delete related extension
                $extension = Extensions::findFirstByNumber($app->extension);
                if ($extension) {
                    if (!$extension->delete()) {
                        throw new \Exception('Failed to delete extension: ' . implode(', ', $extension->getMessages()));
                    }
                }
                
                // Delete dialplan application itself
                if (!$app->delete()) {
                    throw new \Exception('Failed to delete dialplan application: ' . implode(', ', $app->getMessages()));
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

**Updates to existing file**: `src/PBXCoreREST/Controllers/DialplanApplications/GetController.php`

Update `callAction` method to support new actions:
```php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\DialplanApplications;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\DialplanApplicationsManagementProcessor;

/**
 * GET controller for dialplan applications management
 * 
 * @RoutePrefix("/pbxcore/api/v2/dialplan-applications")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/dialplan-applications/getRecord/DIALPLAN-APP-123ABC
 * curl http://127.0.0.1/pbxcore/api/v2/dialplan-applications/getRecord/new
 * curl http://127.0.0.1/pbxcore/api/v2/dialplan-applications/getList
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\DialplanApplications
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get dialplan application record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all dialplan applications
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
            DialplanApplicationsManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
```

**Update existing file**: `src/PBXCoreREST/Controllers/DialplanApplications/PostController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\DialplanApplications;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\DialplanApplicationsManagementProcessor;

/**
 * POST controller for dialplan applications management
 * 
 * @RoutePrefix("/pbxcore/api/v2/dialplan-applications")
 * 
 * @examples
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/dialplan-applications/saveRecord \
 *   -d "name=Test App&extension=2001&type=php&applicationlogic=<?php echo 'test';"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\DialplanApplications
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates dialplan application record
     * @Post("/saveRecord")
     * 
     * Deletes the dialplan applications record with its dependent tables.
     * @Post("/deleteRecord")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        
        $this->sendRequestToBackendWorker(
            DialplanApplicationsManagementProcessor::class,
            $actionName,
            $postData
        );
    }
    
}

```

**New file**: `src/PBXCoreREST/Controllers/DialplanApplications/PutController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\DialplanApplications;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\DialplanApplicationsManagementProcessor;

/**
 * PUT controller for dialplan applications management
 * 
 * @RoutePrefix("/pbxcore/api/v2/dialplan-applications")
 * 
 * @examples
 * curl -X PUT http://127.0.0.1/pbxcore/api/v2/dialplan-applications/saveRecord/DIALPLAN-APP-123ABC \
 *   -d "name=Updated App&extension=2002&type=plaintext&applicationlogic=Updated logic"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\DialplanApplications
 */
class PutController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Dialplan application ID for update operations
     * 
     * Updates existing dialplan application record
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
            DialplanApplicationsManagementProcessor::class,
            $actionName,
            $putData
        );
    }
    
}
```

**New file**: `src/PBXCoreREST/Controllers/DialplanApplications/DeleteController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\DialplanApplications;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\DialplanApplicationsManagementProcessor;

/**
 * DELETE controller for dialplan applications management
 * 
 * @RoutePrefix("/pbxcore/api/v2/dialplan-applications")
 * 
 * @examples
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v2/dialplan-applications/deleteRecord/DIALPLAN-APP-123ABC
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\DialplanApplications
 */
class DeleteController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Dialplan application ID to delete
     * 
     * Deletes dialplan application record
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
            DialplanApplicationsManagementProcessor::class,
            $actionName,
            $deleteData
        );
    }
    
}
```

#### 1.5 Update Processor

**Changes to file**: `src/PBXCoreREST/Lib/DialplanApplicationsManagementProcessor.php`

```php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\DialplanApplications\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction
};
use Phalcon\Di\Injectable;

/**
 * Dialplan applications management processor
 *
 * Handles all dialplan application management operations including:
 * - getRecord: Get single dialplan application by ID or create new structure
 * - getList: Get list of all dialplan applications
 * - saveRecord: Create or update dialplan application
 * - deleteRecord: Delete dialplan application
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class DialplanApplicationsManagementProcessor extends Injectable
{
    /**
     * Processes dialplan application management requests
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
Use DialplanApplications\GetController as DialplanApplicationsGetController,
    DialplanApplications\PostController as DialplanApplicationsPostController,
    DialplanApplications\PutController as DialplanApplicationsPutController,
    DialplanApplications\DeleteController as DialplanApplicationsDeleteController;

// GET routes
[
    DialplanApplicationsGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/dialplan-applications/{actionName}', 
    'get', 
    '/'
],
[
    DialplanApplicationsGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/dialplan-applications/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'get', 
    '/'
],
// POST route
[
    DialplanApplicationsPostController::class, 
    'callAction', 
    '/pbxcore/api/v2/dialplan-applications/{actionName}', 
    'post', 
    '/'
],
// PUT route
[
    DialplanApplicationsPutController::class, 
    'callAction', 
    '/pbxcore/api/v2/dialplan-applications/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'put', 
    '/'
],
// DELETE route
[
    DialplanApplicationsDeleteController::class, 
    'callAction', 
    '/pbxcore/api/v2/dialplan-applications/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'delete', 
    '/'
],
```

**Important**: MikoPBX uses a standardized approach with `{actionName}` parameter in routes. This allows handling any actions without creating separate routes.


### Stage 2: Update JavaScript Client

#### 2.1 Extend API Methods

**Changes to file**: `sites/admin-cabinet/assets/js/src/PbxAPI/dialplanApplicationsAPI.js`

Replace content with:
```javascript
//<Copyright>

/* global globalRootUrl, PbxApi, globalTranslate */

/**
 * DialplanApplicationsAPI - REST API for dialplan applications management
 * 
 * Uses unified approach with centralized endpoint definitions.
 * This provides:
 * - Single point of API URL management
 * - Easy API version switching (v2 -> v3)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
const DialplanApplicationsAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/dialplan-applications/`,
    
    // Endpoint definitions for unification
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/dialplan-applications/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/dialplan-applications/getRecord`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/dialplan-applications/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/dialplan-applications/deleteRecord`
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

**Changes to file**: `sites/admin-cabinet/assets/js/src/DialplanApplications/dialplan-applications-modify.js`

Replace content with:
```javascript
//<Copyright>

/* global globalRootUrl, DialplanApplicationsAPI, Form, globalTranslate, UserMessage, Extensions, ace */

/**
 * Dialplan application edit form management module
 */
const dialplanApplicationModify = {
    $formObj: $('#dialplan-application-form'),
    $number: $('#extension'),
    $typeSelectDropDown: $('#dialplan-application-form .type-select'),
    $tabMenuItems: $('#application-code-menu .item'),
    defaultExtension: '',
    
    // Ace editor instance
    editor: '',
    
    /**
     * Form validation rules
     */
    validateRules: {
        name: {
            identifier: 'name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.da_ValidateNameIsEmpty
                }
            ]
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'regExp',
                    value: '/^(|[0-9#+\\*|X]{1,64})$/',
                    prompt: globalTranslate.da_ValidateExtensionNumber,
                },
                {
                    type: 'empty',
                    prompt: globalTranslate.da_ValidateExtensionIsEmpty,
                },
                {
                    type: 'existRule[extension-error]',
                    prompt: globalTranslate.da_ValidateExtensionDouble,
                },
            ],
        },
    },
    
    /**
     * Module initialization
     */
    initialize() {
        // Initialize tabs
        dialplanApplicationModify.$tabMenuItems.tab();
        
        // Initialize dropdown
        dialplanApplicationModify.$typeSelectDropDown.dropdown({
            onChange: dialplanApplicationModify.changeAceMode,
        });
        
        // Add handler to dynamically check if the input number is available
        let timeoutId;
        dialplanApplicationModify.$number.on('input', () => {
            // Clear the previous timer, if it exists
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            // Set a new timer with a delay of 0.5 seconds
            timeoutId = setTimeout(() => {
                // Get the newly entered number
                const newNumber = dialplanApplicationModify.$formObj.form('get value', 'extension');

                // Execute the availability check for the number
                Extensions.checkAvailability(dialplanApplicationModify.defaultExtension, newNumber);
            }, 500);
        });
        
        // Configure Form.js
        Form.$formObj = dialplanApplicationModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = dialplanApplicationModify.validateRules;
        Form.cbBeforeSendForm = dialplanApplicationModify.cbBeforeSendForm;
        Form.cbAfterSendForm = dialplanApplicationModify.cbAfterSendForm;
        
        // Setup REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = DialplanApplicationsAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}dialplan-applications/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}dialplan-applications/modify/`;
        
        // Initialize Form with all standard features:
        // - Dirty checking (change tracking)
        // - Dropdown submit (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
        // - Form validation
        // - AJAX response handling
        Form.initialize();
        
        // Initialize ACE editor
        dialplanApplicationModify.initializeAce();
        
        // Initialize fullscreen handlers
        dialplanApplicationModify.initializeFullscreenHandlers();
        
        // Load form data
        dialplanApplicationModify.initializeForm();
    },
    
    /**
     * Load data into form
     */
    initializeForm() {
        const recordId = dialplanApplicationModify.getRecordId();
        
        DialplanApplicationsAPI.getRecord(recordId, (response) => {
            if (response.result) {
                dialplanApplicationModify.populateForm(response.data);
                // Get the default extension from the form
                dialplanApplicationModify.defaultExtension = dialplanApplicationModify.$formObj.form('get value', 'extension');
                
                // Set up ACE editor with loaded content
                dialplanApplicationModify.editor.getSession().setValue(response.data.applicationlogic || '');
                dialplanApplicationModify.changeAceMode();
                
                // Switch to main tab if name is empty
                if (!response.data.name) {
                    dialplanApplicationModify.$tabMenuItems.tab('change tab', 'main');
                }
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load dialplan application data');
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
     * Initialize ACE editor
     */
    initializeAce() {
        const aceHeight = window.innerHeight - 380;
        const rowsCount = Math.round(aceHeight / 16.3);
        $(window).load(function () {
            $('.application-code').css('min-height', `${aceHeight}px`);
        });
        
        dialplanApplicationModify.editor = ace.edit('application-code');
        dialplanApplicationModify.editor.setTheme('ace/theme/monokai');
        dialplanApplicationModify.editor.resize();
        dialplanApplicationModify.editor.getSession().on('change', () => {
            // Trigger change event to acknowledge the modification
            Form.dataChanged();
        });
        dialplanApplicationModify.editor.setOptions({
            maxLines: rowsCount,
            showPrintMargin: false,
            showLineNumbers: false,
        });
    },
    
    /**
     * Initialize fullscreen handlers
     */
    initializeFullscreenHandlers() {
        //  Add handlers for fullscreen mode buttons
        $('.fullscreen-toggle-btn').on('click', function () {
            const container = $(this).siblings('.application-code')[0];
            dialplanApplicationModify.toggleFullScreen(container);
        });

        // Add handler to recalculate sizes when exiting fullscreen mode
        document.addEventListener('fullscreenchange', dialplanApplicationModify.adjustEditorHeight);
    },
    
    /**
     * Enable/disable fullscreen mode for a specific block.
     *
     * @param {HTMLElement} container - The container to expand to fullscreen.
     */
    toggleFullScreen(container) {
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    },

    /**
     * Recalculate editor heights when the screen mode changes.
     */
    adjustEditorHeight() {
        dialplanApplicationModify.editor.resize();
    },
    
    /**
     * Changes the Ace editor mode and settings based on the 'type' form value.
     */
    changeAceMode() {
        // Retrieve 'type' value from the form
        const mode = dialplanApplicationModify.$formObj.form('get value', 'type');
        let NewMode;

        if (mode === 'php') {
            // If 'type' is 'php', set the editor mode to PHP and show line numbers
            NewMode = ace.require('ace/mode/php').Mode;
            dialplanApplicationModify.editor.setOptions({
                showLineNumbers: true,
            });
        } else {
            // If 'type' is not 'php', set the editor mode to Julia and hide line numbers
            NewMode = ace.require('ace/mode/julia').Mode;
            dialplanApplicationModify.editor.setOptions({
                showLineNumbers: false,
            });
        }

        // Set the new mode and theme for the editor
        dialplanApplicationModify.editor.session.setMode(new NewMode());
        dialplanApplicationModify.editor.setTheme('ace/theme/monokai');
    },
    
    /**
     * Callback before form submission
     */
    cbBeforeSendForm(settings) {
        // Add application logic from ACE editor to form data
        const result = settings;
        result.data = dialplanApplicationModify.$formObj.form('get values');
        result.data.applicationlogic = dialplanApplicationModify.editor.getValue();
        
        return result;
    },
    
     /**
     * Callback after form submission
     * Handles different save modes (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
     */
    cbAfterSendForm(response) {
        if (response.result) {
           
            if (response.data) {
                dialplanApplicationModify.populateForm(response.data);
                // Update ACE editor content
                dialplanApplicationModify.editor.getSession().setValue(response.data.applicationlogic || '');
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
    dialplanApplicationModify.initialize();
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

#### 2.4 Update Dialplan Applications List

**Changes to file**: `sites/admin-cabinet/assets/js/src/DialplanApplications/dialplan-applications-index.js`

Replace content with:
```javascript
//<Copyright>

/* global globalRootUrl, DialplanApplicationsAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization */

/**
 * Dialplan applications table management module
 */
const dialplanApplicationsTable = {
    $applicationsTable: $('#dialplan-applications-table'),
    dataTable: {},

    /**
     * Initialize the module
     */
    initialize() {
        // Initially show placeholder until data loads
        dialplanApplicationsTable.toggleEmptyPlaceholder(true);
        
        dialplanApplicationsTable.initializeDataTable();
    },
    
    /**
     * Initialize DataTable
     */
    initializeDataTable() {
        dialplanApplicationsTable.dataTable = dialplanApplicationsTable.$applicationsTable.DataTable({
            ajax: {
                url: DialplanApplicationsAPI.endpoints.getList,
                dataSrc: function(json) {                    
                    // Manage empty state
                    dialplanApplicationsTable.toggleEmptyPlaceholder(
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
                    data: 'type',
                    className: 'center aligned hide-on-mobile',
                    responsivePriority: 2,
                    render: function(data) {
                        return data === 'php' ? 
                            '<i class="php icon"></i> PHP' : 
                            '<i class="file text icon"></i> ' + globalTranslate.da_TypePlaintext;
                    }
                },
                {
                    data: 'description',
                    className: 'hide-on-mobile',
                    responsivePriority: 3,
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
                            <a href="${globalRootUrl}dialplan-applications/modify/${row.uniqid}" 
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
                dialplanApplicationsTable.$applicationsTable.find('.popuped').popup();
                
                // Double-click for editing
                dialplanApplicationsTable.initializeDoubleClickEdit();
            }
        });
        
        // Handle deletion using DeleteSomething.js
        // DeleteSomething.js automatically handles first click
        // We only listen for second click (when two-steps-delete class is removed)
        dialplanApplicationsTable.$applicationsTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const appId = $button.attr('data-value');
            
            // Add loading indicator and disable button
            $button.addClass('loading disabled');
            
            DialplanApplicationsAPI.deleteRecord(appId, dialplanApplicationsTable.cbAfterDeleteRecord);
        });
    },
    
    /**
     * Callback after record deletion
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Reload table
            dialplanApplicationsTable.dataTable.ajax.reload();
            
            // Update related components
            if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
                Extensions.cbOnDataChanged();
            }
            
            UserMessage.showSuccess(globalTranslate.da_DialplanApplicationDeleted);
        } else {
            UserMessage.showError(
                response.messages?.error || 
                globalTranslate.da_ImpossibleToDeleteDialplanApplication
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
            $('#dialplan-applications-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-button').show();
            $('#dialplan-applications-table-container').show();
        }
    },
    
  /**
     * Initialize double-click for editing
     * IMPORTANT: Exclude cells with action-buttons class to avoid conflict with delete-something.js
     */
    initializeDoubleClickEdit() {
        dialplanApplicationsTable.$applicationsTable.on('dblclick', 'tbody td:not(.action-buttons)', function() {
            const data = dialplanApplicationsTable.dataTable.row(this).data();
            if (data && data.uniqid) {
                window.location = `${globalRootUrl}dialplan-applications/modify/${data.uniqid}`;
            }
        });
    }
};

/**
 *  Initialize on document ready
 */
$(document).ready(() => {
    dialplanApplicationsTable.initialize();
});


```

#### 2.4.1 Update Volt Template

**Changes to file**: `src/AdminCabinet/Views/DialplanApplications/index.volt`

Replace content with:
```volt
<div id="add-new-button">
    {% if isAllowed('save') %}
        {{ link_to("dialplan-applications/modify", '<i class="add circle icon"></i> '~t._('da_AddNewDialplanApplication'), "class": "ui blue button") }}
    {% endif %}
</div>

<div id="dialplan-applications-table-container">
    <table class="ui selectable compact unstackable table" id="dialplan-applications-table">
        <thead>
            <tr>
                <th>{{ t._('da_ColumnName') }}</th>
                <th>{{ t._('da_ColumnExtension') }}</th>
                <th class="hide-on-mobile">{{ t._('da_ColumnType') }}</th>
                <th class="hide-on-mobile">{{ t._('da_ColumnDescription') }}</th>
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
        'icon': 'code',
        'title': t._('da_EmptyTableTitle'),
        'description': t._('da_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('da_AddNewDialplanApplication'),
        'addButtonLink': 'dialplan-applications/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/dialplan-applications'
    ]) }}
</div>

```

#### 2.4.2 Update AssetProvider for DataTables

**Changes to file**: `src/AdminCabinet/Providers/AssetProvider.php`

Add DataTables assets for dialplan applications list page:

```php
 private function makeDialplanApplicationsAssets(string $action): void
    {
        if ($action === 'index') {
            // DataTables for dialplan applications list
            $this->headerCollectionCSS
                ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
            $this->footerCollectionJS
                ->addJs('js/vendor/datatable/dataTables.semanticui.js', true);

                 // Main page module
            $this->footerCollectionJS     
                ->addJs('js/pbx/PbxAPI/dialplanApplicationsAPI.js', true)
                ->addJs('js/pbx/DialplanApplications/dialplan-applications-index.js', true);
        } elseif ($action === 'modify') {
            // ACE Editor for code editing
            $this->headerCollectionCSS
                ->addCss('css/vendor/ace/ace.css', true);
            $this->footerCollectionJS
                ->addJs('js/vendor/ace/ace.js', true)
                ->addJs('js/vendor/ace/mode-julia.js', true)
                ->addJs('js/vendor/ace/mode-php.js', true)
                ->addJs('js/vendor/ace/theme-monokai.js', true);
                
            $this->footerCollectionJS
                // Edit module
                ->addJs('js/pbx/main/form.js', true)
                ->addJs('js/pbx/PbxAPI/dialplanApplicationsAPI.js', true)
                ->addJs('js/pbx/DialplanApplications/dialplan-applications-modify.js', true);
        }
    }
```

**Important**: AssetProvider automatically includes necessary JavaScript and CSS files based on controller and action. DataTables requires DataTables CSS/JS, and the modify action requires ACE editor assets for code editing.


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

**Changes to file**: `src/AdminCabinet/Controllers/DialplanApplicationsController.php`

Replace data fetching logic in `modifyAction` method:
```php
<?php
//<Copyright>

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\DialplanApplicationEditForm;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;

class DialplanApplicationsController extends BaseController
{
    /**
     * Build the list of dialplan applications.
     */
    public function indexAction(): void
    {
        // The data will load by DataTable AJAX
    }

    /**
     * Edit dialplan application details.
     *
     * @param string|null $uniqid The unique identifier of the dialplan application.
     */
    public function modifyAction(string $uniqid = null): void
    {
         // Get data via REST API
        $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/v2/dialplan-applications/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            ['id' => $uniqid]
        ]);
        
        if (!$restAnswer->success) {
            $this->flash->error(json_encode($restAnswer->messages));
            $this->dispatcher->forward([
                'controller' => 'dialplan-applications',
                'action' => 'index'
            ]);
            return;
        }
        
        $getRecordStructure = (object)$restAnswer->data;
        
        // Create form based on API data structure
        $this->view->form = new DialplanApplicationEditForm($getRecordStructure);
        $this->view->represent = $getRecordStructure->name ?: '';
        $this->view->extension = $getRecordStructure->extension ?: '';
    }

}

```

### Stage 5: Translations

**Add to file**: `src/Common/Messages/ru.php`
```php
'da_ValidateNameIsEmpty' => 'Необходимо заполнить название приложения',
'da_ValidateExtensionIsEmpty' => 'Необходимо заполнить номер приложения',
'da_ValidateExtensionNumber' => 'Неправильный формат номера приложения',
'da_DialplanApplicationSaved' => 'Приложение сохранено успешно',
'da_DialplanApplicationDeleted' => 'Приложение удалено успешно',
'da_ImpossibleToDeleteDialplanApplication' => 'Невозможно удалить приложение',
'da_AddNewDialplanApplication' => 'Добавить новое приложение',
'da_ColumnName' => 'Название',
'da_ColumnExtension' => 'Номер',
'da_ColumnType' => 'Тип',
'da_ColumnDescription' => 'Описание',
'da_EmptyTableTitle' => 'Приложения не настроены',
'da_EmptyTableDescription' => 'Создайте первое приложение для управления дополнительной логикой АТС',
'da_TypePhp' => 'PHP код',
'da_TypePlaintext' => 'Текстовая логика',
```

### Stage 6: Build and Testing

#### 6.1 JavaScript Transpilation
```bash
# For core system files
docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/DialplanApplications/dialplan-applications-modify.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/DialplanApplications/dialplan-applications-index.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/PbxAPI/dialplanApplicationsAPI.js \
  core
```

#### 6.2 PHPStan Check
```bash
# Check PHP code quality
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse /offload/rootfs/usr/www/src/PBXCoreREST/Lib/DialplanApplications/
```

## New Files to Create

1. `src/PBXCoreREST/Lib/DialplanApplications/GetRecordAction.php`
2. `src/PBXCoreREST/Lib/DialplanApplications/GetListAction.php`
3. `src/PBXCoreREST/Lib/DialplanApplications/SaveRecordAction.php`
4. `src/PBXCoreREST/Lib/DialplanApplications/DataStructure.php`
5. `src/PBXCoreREST/Controllers/DialplanApplications/PutController.php`
6. `src/PBXCoreREST/Controllers/DialplanApplications/DeleteController.php`


## Files to Modify

1. `src/PBXCoreREST/Lib/DialplanApplicationsManagementProcessor.php`
2. `src/PBXCoreREST/Controllers/DialplanApplications/GetController.php`
3. `src/PBXCoreREST/Controllers/DialplanApplications/PostController.php`
4. `src/PBXCoreREST/Providers/RouterProvider.php`
5. `sites/admin-cabinet/assets/js/src/PbxAPI/dialplanApplicationsAPI.js`
6. `sites/admin-cabinet/assets/js/src/DialplanApplications/dialplan-applications-index.js`
7. `sites/admin-cabinet/assets/js/src/DialplanApplications/dialplan-applications-modify.js`
8. `src/AdminCabinet/Controllers/DialplanApplicationsController.php`
9. `src/AdminCabinet/Views/DialplanApplications/index.volt`
10. `src/Common/Messages/ru.php`
11. `src/AdminCabinet/Providers/AssetProvider.php`

## Expected Results

After implementing the plan, the dialplan applications management system will:

- ✅ Use unified REST API architecture
- ✅ Support full CRUD functionality via REST API
- ✅ Provide two-level data sanitization
- ✅ Use DataTable for list display
- ✅ Integrate with existing Form.js mechanism
- ✅ Preserve all existing UI/UX patterns including ACE editor
- ✅ Support PHP and plaintext syntax highlighting
- ✅ Handle base64 encoding/decoding of application logic
- ✅ Support fullscreen editing mode
- ✅ Correctly display welcome message for empty table
- ✅ Be ready for external integrations
- ✅ Comply with MikoPBX architectural principles

## Testing

### REST API Endpoints for Testing:
- `GET /pbxcore/api/v2/dialplan-applications/getList` - applications list
- `GET /pbxcore/api/v2/dialplan-applications/getRecord/new` - new application structure
- `GET /pbxcore/api/v2/dialplan-applications/getRecord/{id}` - specific application
- `POST /pbxcore/api/v2/dialplan-applications/saveRecord` - create application
- `PUT /pbxcore/api/v2/dialplan-applications/saveRecord/{id}` - update application
- `DELETE /pbxcore/api/v2/dialplan-applications/deleteRecord/{id}` - delete application

### Test Scenarios:
1. Create new dialplan application
2. Edit existing dialplan application
3. Delete dialplan application
4. Validate required fields
5. Check extension number uniqueness
6. Update DataTable after operations
7. Save form state and URL
8. Display welcome message for empty table
9. Correct hide/show placeholder after adding/deleting records
10. ACE editor functionality with syntax highlighting
11. Fullscreen editing mode
12. PHP vs plaintext mode switching
13. Application logic encoding/decoding
14. Tab navigation (main tab, code tab)

### Debugging

If dialplan applications table doesn't display correctly:

1. **Check browser console** for JavaScript errors
2. **Check Network tab** to view API responses:
   - API should return structure: `{result: true, data: [...], messages: {...}}`
   - Field `result` (not `success`) indicates operation success. All JavaScript files must use `response.result` instead of `response.success`
3. **Check AssetProvider** - ensure DataTables libraries and ACE editor are included
4. **Check access rights** - user must have rights to view dialplan applications
5. **Check ACE editor** - ensure ACE editor loads correctly and syntax highlighting works
6. **Check base64 encoding** - ensure application logic is properly encoded/decoded

### Special Features Testing

#### ACE Editor Integration:
- Test PHP syntax highlighting when type is 'php'
- Test plaintext mode when type is 'plaintext'
- Test fullscreen toggle functionality
- Test editor content saving and loading
- Test editor height adjustment on window resize

#### Base64 Encoding:
- Verify application logic is base64 encoded in database
- Verify application logic is decoded when loaded in editor
- Test special characters and multi-line code handling

#### Dynamic Extension Availability Check Support

Added integration with Extensions.checkAvailability for real-time extension availability checking:

```javascript
// dialplan-applications-modify.js
let timeoutId;
dialplanApplicationModify.$number.on('input', () => {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
        const newNumber = dialplanApplicationModify.$formObj.form('get value', 'extension');
        Extensions.checkAvailability(dialplanApplicationModify.defaultExtension, newNumber);
    }, 500);
});
```

This provides immediate feedback to users about extension availability during form entry, improving user experience and preventing conflicts.