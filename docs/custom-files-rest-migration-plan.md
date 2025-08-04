# MikoPBX CustomFiles REST API Migration Plan

## Project Overview

This document contains a detailed plan for adapting the MikoPBX CustomFiles management system to use a unified REST API architecture. The plan is based on the guide `docs/mikopbx-rest-migration-guide.md` and follows the principles of minimal changes to the user interface.

**IMPORTANT**: CustomFiles is a mechanism for editing predefined system files only. The system works with a fixed list of files defined in ProcessCustomFiles::getDependencyTable(). Creating new files or deleting existing ones is not allowed through this mechanism.

## Current State

### Existing Architecture
- **Model**: `src/Common/Models/CustomFiles.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/CustomFilesController.php`
- **Form**: `src/AdminCabinet/Forms/CustomFilesEditForm.php`
- **JavaScript**: Custom file editing with ACE editor
- **Partial REST API**: Only reading file content via Files API
- **Worker**: `src/Core/Workers/Libs/WorkerModelsEvents/ProcessCustomFiles.php`

### CustomFiles Model Fields
```php
public $id;           // Primary key
public $filepath;     // Target file path
public $content;      // File content (base64 encoded)
public $mode;         // Operation mode: none|append|override|script
public $changed;      // Modification flag (1/0)
public $description;  // File description
```

### Operation Modes
- `none` - No operation (inactive)
- `append` - Append content to existing file
- `override` - Replace entire file content
- `script` - Execute as shell script

## Detailed Implementation Plan

### Stage 1: Creating REST API Backend

#### 1.1 MikoPBX REST API Architecture

**Important**: In MikoPBX REST API architecture, Action classes are executed in Workers without HTTP context. Therefore, they should not inherit from Injectable and work with $this->request directly.

**Correct Flow**:
```
HTTP Request → Controller → Worker → Action → Database → Response
```

#### 1.2 Action Classes for CustomFiles

**File**: `src/PBXCoreREST/Lib/CustomFiles/GetRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Core\System\Util;

/**
 * Action for getting custom file record
 * 
 * @api {get} /pbxcore/api/v2/custom-files/getRecord/:id Get custom file record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup CustomFiles
 * 
 * @apiParam {String} id Record ID
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Custom file data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.filepath Target file path
 * @apiSuccess {String} data.content File content (base64 encoded)
 * @apiSuccess {String} data.mode Operation mode (none|append|override|script)
 * @apiSuccess {String} data.changed Modification flag
 * @apiSuccess {String} data.description File description
 */
class GetRecordAction
{
    /**
     * Get custom file record
     * @param string $id - Record ID (required)
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
        
        // Find existing record
        $customFile = CustomFiles::findFirstById($id);
        
        if ($customFile) {
            $res->data = DataStructure::createFromModel($customFile);
            $res->success = true;
        } else {
            $res->messages['error'][] = 'Custom file not found';
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/CustomFiles/GetRecordByPathAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting custom file record by filepath
 * 
 * @api {get} /pbxcore/api/v2/custom-files/getRecordByPath Get custom file by filepath
 * @apiVersion 2.0.0
 * @apiName GetRecordByPath
 * @apiGroup CustomFiles
 * 
 * @apiParam {String} filepath File path (URL encoded)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Custom file data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.filepath Target file path
 * @apiSuccess {String} data.content File content (base64 encoded)
 * @apiSuccess {String} data.mode Operation mode (none|append|override|script)
 * @apiSuccess {String} data.changed Modification flag
 * @apiSuccess {String} data.description File description
 */
class GetRecordByPathAction
{
    /**
     * Get custom file record by filepath
     * @param array $data - Request data containing filepath
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $filepath = $data['filepath'] ?? '';
        
        if (empty($filepath)) {
            $res->messages['error'][] = 'File path is required';
            return $res;
        }
        
        // URL decode the filepath (it may contain special characters)
        $filepath = urldecode($filepath);
        
        // Find existing record by filepath
        $customFile = CustomFiles::findFirst([
            'conditions' => 'filepath = :filepath:',
            'bind' => ['filepath' => $filepath]
        ]);
        
        if ($customFile) {
            $res->data = DataStructure::createFromModel($customFile);
            $res->success = true;
        } else {
            $res->messages['error'][] = 'Custom file not found for path: ' . $filepath;
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/CustomFiles/GetListAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all custom files
 * 
 * @api {get} /pbxcore/api/v2/custom-files/getList Get all custom files
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup CustomFiles
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of custom files
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.filepath Target file path
 * @apiSuccess {String} data.mode Operation mode
 * @apiSuccess {String} data.changed Modification flag
 * @apiSuccess {String} data.description File description
 */
class GetListAction
{
    /**
     * Get list of all custom files
     * 
     * @param array $data - Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get all custom files sorted by filepath
            $customFiles = CustomFiles::find([
                'order' => 'filepath ASC'
            ]);
            
            $data = [];
            foreach ($customFiles as $file) {
                $data[] = DataStructure::createFromModel($file);
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

**File**: `src/PBXCoreREST/Lib/CustomFiles/SaveRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for updating custom file record
 * 
 * @api {put} /pbxcore/api/v2/custom-files/saveRecord/:id Update custom file
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup CustomFiles
 * 
 * @apiParam {String} id Record ID (required)
 * @apiParam {String} content File content (base64 encoded)
 * @apiParam {String} mode Operation mode (none|append|override|script)
 * @apiParam {String} [description] File description
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved custom file data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction
{
    /**
     * Update custom file record (only existing files can be edited)
     * @param array $data - Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Require ID - only existing files can be edited
        if (empty($data['id'])) {
            $res->messages['error'][] = 'Record ID is required. Only existing custom files can be edited.';
            return $res;
        }
        
        // Data sanitization
        // IMPORTANT: We exclude 'content' from sanitization because it contains program code
        // The content is expected to be base64 encoded, which is safe for transmission
        $sanitizationRules = [
            'id' => 'int',
            'mode' => 'string|in:none,append,override,script',
            'description' => 'string|html_escape|max:500|empty_to_null'
        ];
        
        // Store content separately to avoid sanitization
        $content = $data['content'] ?? '';
        
        // Validate base64 encoding if content is provided
        if (!empty($content) && !base64_decode($content, true)) {
            $res->messages['error'][] = 'Content must be valid base64 encoded string';
            return $res;
        }
        
        // Sanitize other fields
        $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);
        
        // Restore unsanitized content
        $data['content'] = $content;
        
        // Validate required fields
        $validationRules = [
            'mode' => [
                ['type' => 'required', 'message' => 'Operation mode is required'],
                ['type' => 'in', 'values' => ['none', 'append', 'override', 'script'], 'message' => 'Invalid operation mode']
            ]
        ];
        $validationErrors = BaseActionHelper::validateData($data, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Get existing model
        $customFile = CustomFiles::findFirstById($data['id']);
        if (!$customFile) {
            $res->messages['error'][] = 'api_CustomFileNotFound';
            return $res;
        }
        
        try {
            // Update CustomFiles record (filepath cannot be changed)
            $customFile->content = $data['content'] ?? '';
            $customFile->mode = $data['mode'];
            $customFile->description = $data['description'] ?? '';
            $customFile->changed = '1'; // Mark as changed
            
            if (!$customFile->save()) {
                throw new \Exception(implode(', ', $customFile->getMessages()));
            }
            
            $res->data = DataStructure::createFromModel($customFile);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "custom-files/modify/{$customFile->id}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/CustomFiles/DataStructure.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

/**
 * Data structure for custom files
 * 
 * @package MikoPBX\PBXCoreREST\Lib\CustomFiles
 */
class DataStructure
{
    /**
     * Create data array from CustomFiles model
     * @param \MikoPBX\Common\Models\CustomFiles $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        return [
            'id' => (string)$model->id,
            'filepath' => $model->filepath,
            'content' => $model->content ?? '',
            'mode' => $model->mode,
            'changed' => $model->changed,
            'description' => $model->description ?? ''
        ];
    }
}
```

**Note**: DeleteRecordAction is intentionally not implemented. CustomFiles works with a predefined list of system files that cannot be deleted via API.

**File**: `src/PBXCoreREST/Lib/CustomFiles/SaveRecordByPathAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for updating custom file record by filepath
 * 
 * @api {put} /pbxcore/api/v2/custom-files/saveRecordByPath Update custom file by filepath
 * @apiVersion 2.0.0
 * @apiName SaveRecordByPath
 * @apiGroup CustomFiles
 * 
 * @apiParam {String} filepath File path (URL encoded)
 * @apiParam {String} content File content (base64 encoded)
 * @apiParam {String} mode Operation mode (none|append|override|script)
 * @apiParam {String} [description] File description
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved custom file data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordByPathAction
{
    /**
     * Update custom file record by filepath
     * @param array $data - Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $filepath = $data['filepath'] ?? '';
        
        if (empty($filepath)) {
            $res->messages['error'][] = 'File path is required';
            return $res;
        }
        
        // URL decode the filepath
        $filepath = urldecode($filepath);
        
        // Data sanitization
        // IMPORTANT: We exclude 'content' from sanitization because it contains program code
        $sanitizationRules = [
            'mode' => 'string|in:none,append,override,script',
            'description' => 'string|html_escape|max:500|empty_to_null'
        ];
        
        // Store content separately to avoid sanitization
        $content = $data['content'] ?? '';
        
        // Validate base64 encoding if content is provided
        if (!empty($content) && !base64_decode($content, true)) {
            $res->messages['error'][] = 'Content must be valid base64 encoded string';
            return $res;
        }
        
        // Sanitize other fields
        $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);
        
        // Restore unsanitized content
        $data['content'] = $content;
        
        // Validate required fields
        $validationRules = [
            'mode' => [
                ['type' => 'required', 'message' => 'Operation mode is required'],
                ['type' => 'in', 'values' => ['none', 'append', 'override', 'script'], 'message' => 'Invalid operation mode']
            ]
        ];
        $validationErrors = BaseActionHelper::validateData($data, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Find existing record by filepath
        $customFile = CustomFiles::findFirst([
            'conditions' => 'filepath = :filepath:',
            'bind' => ['filepath' => $filepath]
        ]);
        
        if (!$customFile) {
            $res->messages['error'][] = 'Custom file not found for path: ' . $filepath;
            return $res;
        }
        
        try {
            // Update CustomFiles record (filepath cannot be changed)
            $customFile->content = $data['content'] ?? '';
            $customFile->mode = $data['mode'];
            $customFile->description = $data['description'] ?? '';
            $customFile->changed = '1'; // Mark as changed
            
            if (!$customFile->save()) {
                throw new \Exception(implode(', ', $customFile->getMessages()));
            }
            
            $res->data = DataStructure::createFromModel($customFile);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "custom-files/modify/{$customFile->id}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/CustomFiles/ApplyChangesAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\ProcessCustomFiles;

/**
 * Action for applying custom file changes to the system
 * 
 * @api {post} /pbxcore/api/v2/custom-files/applyChanges Apply custom file changes
 * @apiVersion 2.0.0
 * @apiName ApplyChanges
 * @apiGroup CustomFiles
 * 
 * @apiParam {String} [id] Specific file ID to apply (optional, applies all if not specified)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data.applied List of applied files
 * @apiSuccess {Array} data.errors List of errors during application
 */
class ApplyChangesAction
{
    /**
     * Apply custom file changes to the system
     * 
     * @param array $data - Request data
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $applied = [];
            $errors = [];
            
            // Get files to apply
            if (!empty($data['id'])) {
                $customFiles = CustomFiles::find([
                    'conditions' => 'id = :id: AND changed = "1"',
                    'bind' => ['id' => $data['id']]
                ]);
            } else {
                // Apply all changed files
                $customFiles = CustomFiles::find([
                    'conditions' => 'changed = "1"'
                ]);
            }
            
            foreach ($customFiles as $customFile) {
                try {
                    // Apply the custom file
                    $result = ProcessCustomFiles::applyCustomFile($customFile);
                    if ($result) {
                        $applied[] = $customFile->filepath;
                        // Mark as applied
                        $customFile->changed = '0';
                        $customFile->save();
                    } else {
                        $errors[] = "Failed to apply: {$customFile->filepath}";
                    }
                } catch (\Exception $e) {
                    $errors[] = "Error applying {$customFile->filepath}: " . $e->getMessage();
                }
            }
            
            $res->success = empty($errors);
            $res->data = [
                'applied' => $applied,
                'errors' => $errors
            ];
            
            // Trigger system reload if files were applied
            if (!empty($applied)) {
                ProcessCustomFiles::reloadServicesForChangedFiles($applied);
            }
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

#### 1.3 REST API Controllers

**File**: `src/PBXCoreREST/Controllers/CustomFiles/GetController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\CustomFiles;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\CustomFilesManagementProcessor;

/**
 * GET controller for custom files management
 * 
 * @RoutePrefix("/pbxcore/api/v2/custom-files")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/custom-files/getRecord/123
 * curl http://127.0.0.1/pbxcore/api/v2/custom-files/getRecord/new
 * curl http://127.0.0.1/pbxcore/api/v2/custom-files/getList
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\CustomFiles
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get custom file record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all custom files
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
            CustomFilesManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
```

**File**: `src/PBXCoreREST/Controllers/CustomFiles/PostController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\CustomFiles;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\CustomFilesManagementProcessor;

/**
 * POST controller for custom files management
 * 
 * @RoutePrefix("/pbxcore/api/v2/custom-files")
 * 
 * @examples
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/custom-files/saveRecord \
 *   -d "filepath=/etc/asterisk/custom.conf&content=base64content&mode=override"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\CustomFiles
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates custom file record
     * @Post("/saveRecord")
     * 
     * Apply custom file changes to the system
     * @Post("/applyChanges")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        
        $this->sendRequestToBackendWorker(
            CustomFilesManagementProcessor::class,
            $actionName,
            $postData
        );
    }
}
```

**File**: `src/PBXCoreREST/Controllers/CustomFiles/PutController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\CustomFiles;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\CustomFilesManagementProcessor;

/**
 * PUT controller for custom files management
 * 
 * @RoutePrefix("/pbxcore/api/v2/custom-files")
 * 
 * @examples
 * curl -X PUT http://127.0.0.1/pbxcore/api/v2/custom-files/saveRecord/123 \
 *   -d "filepath=/etc/asterisk/custom.conf&content=updatedcontent&mode=override"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\CustomFiles
 */
class PutController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Custom file ID for update operations
     * 
     * Updates existing custom file record
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
            CustomFilesManagementProcessor::class,
            $actionName,
            $putData
        );
    }
}
```

**Note**: DeleteController is intentionally not implemented. CustomFiles works with a predefined list of system files that cannot be deleted via API.

#### 1.4 Create Processor

**File**: `src/PBXCoreREST/Lib/CustomFilesManagementProcessor.php`
```php
<?php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\CustomFiles\{
    GetRecordAction,
    GetRecordByPathAction,
    GetListAction,
    SaveRecordAction,
    SaveRecordByPathAction,
    ApplyChangesAction
};
use Phalcon\Di\Injectable;

/**
 * Custom files management processor
 *
 * Handles all custom file management operations including:
 * - getRecord: Get single custom file by ID
 * - getRecordByPath: Get single custom file by filepath
 * - getList: Get list of all custom files
 * - saveRecord: Update custom file by ID (only existing files)
 * - saveRecordByPath: Update custom file by filepath (only existing files)
 * - applyChanges: Apply custom file changes to the system
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class CustomFilesManagementProcessor extends Injectable
{
    /**
     * Processes custom file management requests
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
                if (!empty($data['id'])) {
                    $res = GetRecordAction::main($data['id']);
                } else {
                    $res->messages['error'][] = 'Record ID is required';
                }
                break;
                
            case 'getRecordByPath':
                $res = GetRecordByPathAction::main($data);
                break;
                
            case 'getList':
                $res = GetListAction::main($data);
                break;
                
            case 'saveRecord':
                $res = SaveRecordAction::main($data);
                break;
                
            case 'saveRecordByPath':
                $res = SaveRecordByPathAction::main($data);
                break;
                
            case 'applyChanges':
                $res = ApplyChangesAction::main($data);
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

Add imports and routes:
```php
use CustomFiles\GetController as CustomFilesGetController,
    CustomFiles\PostController as CustomFilesPostController,
    CustomFiles\PutController as CustomFilesPutController;

// GET routes
[
    CustomFilesGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/custom-files/{actionName}', 
    'get', 
    '/'
],
[
    CustomFilesGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/custom-files/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'get', 
    '/'
],
// POST routes
[
    CustomFilesPostController::class, 
    'callAction', 
    '/pbxcore/api/v2/custom-files/{actionName}', 
    'post', 
    '/'
],
// PUT route
[
    CustomFilesPutController::class, 
    'callAction', 
    '/pbxcore/api/v2/custom-files/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'put', 
    '/'
],
// Note: DELETE routes are not implemented as CustomFiles cannot be deleted
```

### Stage 2: Update JavaScript Client

#### 2.1 Create API Methods

**File**: `sites/admin-cabinet/assets/js/src/PbxAPI/customFilesAPI.js`
```javascript
//<Copyright>

/* global globalRootUrl, PbxApi, globalTranslate */

/**
 * CustomFilesAPI - REST API for custom files management
 * 
 * Uses unified approach with centralized endpoint definitions.
 * This provides:
 * - Single point of API URL management
 * - Easy API version switching (v2 -> v3)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
const CustomFilesAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/custom-files/`,
    
    // Endpoint definitions for unification
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/custom-files/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/custom-files/getRecord`,
        getRecordByPath: `${Config.pbxUrl}/pbxcore/api/v2/custom-files/getRecordByPath`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/custom-files/saveRecord`,
        saveRecordByPath: `${Config.pbxUrl}/pbxcore/api/v2/custom-files/saveRecordByPath`,
        applyChanges: `${Config.pbxUrl}/pbxcore/api/v2/custom-files/applyChanges`
    },
    
    /**
     * Get record by ID
     * @param {string} id - Record ID (required)
     * @param {function} callback - Callback function
     */
    getRecord(id, callback) {
        if (!id || id === '') {
            callback({result: false, messages: {error: 'Record ID is required'}});
            return;
        }
        
        $.api({
            url: `${this.endpoints.getRecord}/${id}`,
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
     * Get record by filepath
     * @param {string} filepath - File path
     * @param {function} callback - Callback function
     */
    getRecordByPath(filepath, callback) {
        if (!filepath || filepath === '') {
            callback({result: false, messages: {error: 'File path is required'}});
            return;
        }
        
        $.api({
            url: this.endpoints.getRecordByPath,
            method: 'GET',
            data: { filepath: encodeURIComponent(filepath) },
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
     * Save record (only updates existing files)
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */
    saveRecord(data, callback) {
        if (!data.id) {
            callback({result: false, messages: {error: 'Only existing files can be updated'}});
            return;
        }
        
        const url = `${this.endpoints.saveRecord}/${data.id}`;
        
        $.api({
            url: url,
            method: 'PUT',
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
     * Save record by filepath (only updates existing files)
     * @param {object} data - Data to save (must include filepath)
     * @param {function} callback - Callback function
     */
    saveRecordByPath(data, callback) {
        if (!data.filepath) {
            callback({result: false, messages: {error: 'File path is required'}});
            return;
        }
        
        // URL encode the filepath
        data.filepath = encodeURIComponent(data.filepath);
        
        $.api({
            url: this.endpoints.saveRecordByPath,
            method: 'PUT',
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
     * Apply custom file changes to the system
     * @param {string|null} id - Specific file ID or null for all
     * @param {function} callback - Callback function
     */
    applyChanges(id, callback) {
        const data = id ? {id: id} : {};
        
        $.api({
            url: this.endpoints.applyChanges,
            method: 'POST',
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
    }
};
```

#### 2.2 Update Form Edit Module

**Changes to file**: `sites/admin-cabinet/assets/js/src/CustomFiles/custom-files-modify.js`

Key changes needed:
```javascript
// Add at the beginning of the file
/* global globalRootUrl, CustomFilesAPI, Form, globalTranslate, UserMessage */

// Replace save functionality with REST API
const customFile = {
    // ... existing properties ...
    
    /**
     * Initialize module with REST API
     */
    initialize() {
        // ... existing initialization code ...
        
        // Configure Form.js for REST API
        Form.$formObj = customFile.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = customFile.validateRules;
        Form.cbBeforeSendForm = customFile.cbBeforeSendForm;
        Form.cbAfterSendForm = customFile.cbAfterSendForm;
        
        // Enable REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = CustomFilesAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}custom-files/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}custom-files/modify/`;
        
        // Initialize Form with all standard features
        Form.initialize();
        
        // Load form data
        customFile.initializeForm();
    },
    
    /**
     * Load data into form via REST API
     */
    initializeForm() {
        const recordId = customFile.getRecordId();
        
        if (!recordId) {
            UserMessage.showError('Custom file ID is required');
            window.location = `${globalRootUrl}custom-files/index/`;
            return;
        }
        
        CustomFilesAPI.getRecord(recordId, (response) => {
            if (response.result) {
                customFile.populateForm(response.data);
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load custom file data');
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
        // Encode content to base64 before sending
        const content = customFile.viewer.getValue();
        settings.data.content = btoa(unescape(encodeURIComponent(content)));
        
        return settings;
    },
    
    /**
     * Callback after form submission
     */
    cbAfterSendForm(response) {
        if (response.result) {
            if (response.data) {
                customFile.populateForm(response.data);
            }
        }
    },
    
    /**
     * Populate form with data
     */
    populateForm(data) {
        // Decode base64 content
        if (data.content) {
            try {
                data.content = decodeURIComponent(escape(atob(data.content)));
            } catch (e) {
                console.error('Failed to decode content:', e);
            }
        }
        
        Form.$formObj.form('set values', data);
        
        // Update ACE editor
        if (data.content) {
            customFile.viewer.setValue(data.content);
        }
        
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    },
    
    /**
     * Apply changes button handler
     */
    onApplyChanges() {
        const recordId = $('#id').val();
        if (!recordId) {
            UserMessage.showError('Save the file first before applying');
            return;
        }
        
        CustomFilesAPI.applyChanges(recordId, (response) => {
            if (response.result) {
                UserMessage.showSuccess('Changes applied successfully');
                // Update changed flag
                $('#changed').val('0');
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to apply changes');
            }
        });
    }
};
```

#### 2.3 Update List Module

**Changes to file**: `sites/admin-cabinet/assets/js/src/CustomFiles/custom-files-index.js`

Replace with DataTable implementation:
```javascript
//<Copyright>

/* global globalRootUrl, CustomFilesAPI, globalTranslate, UserMessage, SemanticLocalization */

/**
 * Custom files table management module
 */
const customFilesTable = {
    $customFilesTable: $('#custom-files-table'),
    dataTable: {},

    /**
     * Initialize the module
     */
    initialize() {
        // Initially show placeholder until data loads
        customFilesTable.toggleEmptyPlaceholder(true);
        
        customFilesTable.initializeDataTable();
    },
    
    /**
     * Initialize DataTable
     */
    initializeDataTable() {
        customFilesTable.dataTable = customFilesTable.$customFilesTable.DataTable({
            ajax: {
                url: CustomFilesAPI.endpoints.getList,
                dataSrc: function(json) {
                    // Manage empty state
                    customFilesTable.toggleEmptyPlaceholder(
                        !json.result || !json.data || json.data.length === 0
                    );
                    return json.result ? json.data : [];
                }
            },
            columns: [
                {
                    data: 'filepath',
                    render: function(data, type, row) {
                        return `<strong>${data}</strong>`;
                    }
                },
                {
                    data: 'mode',
                    className: 'center aligned',
                    render: function(data) {
                        const modeText = globalTranslate[`cf_FileMode_${data}`] || data;
                        const modeClass = {
                            'none': 'grey',
                            'append': 'blue',
                            'override': 'orange',
                            'script': 'green'
                        }[data] || 'grey';
                        
                        return `<div class="ui ${modeClass} basic label">${modeText}</div>`;
                    }
                },
                {
                    data: 'changed',
                    className: 'center aligned',
                    render: function(data) {
                        if (data === '1') {
                            return '<i class="yellow exclamation circle icon" title="' + globalTranslate.cf_FileChangedNeedApply + '"></i>';
                        }
                        return '<i class="green check circle icon"></i>';
                    }
                },
                {
                    data: 'description',
                    className: 'hide-on-mobile',
                    responsivePriority: 2,
                    render: function(data) {
                        return data || '—';
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'right aligned action-buttons',
                    responsivePriority: 1,
                    render: function(data, type, row) {
                        let buttons = `<div class="ui basic icon buttons">
                            <a href="${globalRootUrl}custom-files/modify/${row.id}" 
                               class="ui button popuped" 
                               data-content="${globalTranslate.bt_ToolTipEdit}">
                                <i class="edit icon"></i>
                            </a>`;
                        
                        // Add apply button if file has changes
                        if (row.changed === '1') {
                            buttons += `<a href="#" 
                                   data-value="${row.id}" 
                                   class="ui button apply popuped" 
                                   data-content="${globalTranslate.cf_ApplyChanges}">
                                    <i class="play green icon"></i>
                                </a>`;
                        }
                        
                        buttons += `</div>`;
                        
                        return buttons;
                    }
                }
            ],
            order: [[0, 'asc']],
            responsive: true,
            searching: true,
            paging: false,
            info: false,
            language: SemanticLocalization.dataTableLocalisation,
            drawCallback: function() {
                // Initialize Semantic UI elements
                customFilesTable.$customFilesTable.find('.popuped').popup();
                
                // Double-click for editing
                customFilesTable.initializeDoubleClickEdit();
            }
        });
        
        // Handle apply changes
        customFilesTable.$customFilesTable.on('click', 'a.apply', function(e) {
            e.preventDefault();
            const $button = $(this);
            const fileId = $button.attr('data-value');
            
            $button.addClass('loading disabled');
            
            CustomFilesAPI.applyChanges(fileId, (response) => {
                $button.removeClass('loading disabled');
                
                if (response.result) {
                    UserMessage.showSuccess('Changes applied successfully');
                    // Reload table
                    customFilesTable.dataTable.ajax.reload();
                } else {
                    UserMessage.showError(response.messages?.error || 'Failed to apply changes');
                }
            });
        });
        
        // Note: Delete functionality is not implemented as CustomFiles cannot be deleted
        
        // Apply all changes button
        $('#apply-all-button').on('click', function() {
            const $button = $(this);
            $button.addClass('loading disabled');
            
            CustomFilesAPI.applyChanges(null, (response) => {
                $button.removeClass('loading disabled');
                
                if (response.result) {
                    const message = response.data.applied.length > 0 
                        ? `Applied ${response.data.applied.length} files`
                        : 'No files to apply';
                    UserMessage.showSuccess(message);
                    
                    if (response.data.errors.length > 0) {
                        UserMessage.showError('Errors: ' + response.data.errors.join(', '));
                    }
                    
                    // Reload table
                    customFilesTable.dataTable.ajax.reload();
                } else {
                    UserMessage.showError(response.messages?.error || 'Failed to apply changes');
                }
            });
        });
    },
    
    
    /**
     * Toggle empty table placeholder visibility
     */
    toggleEmptyPlaceholder(isEmpty) {
        if (isEmpty) {
            $('#custom-files-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-button').show();
            $('#custom-files-table-container').show();
        }
    },
    
    /**
     * Initialize double-click for editing
     */
    initializeDoubleClickEdit() {
        customFilesTable.$customFilesTable.on('dblclick', 'tbody td:not(.action-buttons)', function() {
            const data = customFilesTable.dataTable.row(this).data();
            if (data && data.id) {
                window.location = `${globalRootUrl}custom-files/modify/${data.id}`;
            }
        });
    }
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    customFilesTable.initialize();
});
```

### Stage 3: AdminCabinet Adaptation

#### 3.1 Update Controller

**Changes to file**: `src/AdminCabinet/Controllers/CustomFilesController.php`

Replace data fetching with REST API:
```php
<?php
//<Copyright>

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\CustomFilesEditForm;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;

class CustomFilesController extends BaseController
{
    /**
     * Build the list of custom files.
     */
    public function indexAction(): void
    {
        // The data will load by DataTable AJAX
    }

    /**
     * Edit custom file details.
     *
     * @param string $id The ID of the custom file (required).
     */
    public function modifyAction(string $id): void
    {
        if (empty($id)) {
            $this->flash->error('Custom file ID is required');
            $this->dispatcher->forward([
                'controller' => 'custom-files',
                'action' => 'index'
            ]);
            return;
        }
        
        // Get data via REST API
        $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/v2/custom-files/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            ['id' => $id]
        ]);
        
        if (!$restAnswer->success) {
            $this->flash->error(json_encode($restAnswer->messages));
            $this->dispatcher->forward([
                'controller' => 'custom-files',
                'action' => 'index'
            ]);
            return;
        }
        
        $getRecordStructure = (object)$restAnswer->data;
        
        // Create form based on API data structure
        $this->view->form = new CustomFilesEditForm($getRecordStructure);
        $this->view->represent = $getRecordStructure->filepath ?: '';
        $this->view->filepath = $getRecordStructure->filepath ?: '';
    }
}
```

#### 3.2 Update Views

**Changes to file**: `src/AdminCabinet/Views/CustomFiles/index.volt`

Update to support DataTable:
```volt
<div id="action-buttons">
    {% if isAllowed('save') %}
        <button id="apply-all-button" class="ui green button">
            <i class="play icon"></i> {{ t._('cf_ApplyAllChanges') }}
        </button>
    {% endif %}
</div>

<div id="custom-files-table-container">
    <table class="ui selectable compact unstackable table" id="custom-files-table">
        <thead>
            <tr>
                <th>{{ t._('cf_ColumnFilePath') }}</th>
                <th>{{ t._('cf_ColumnMode') }}</th>
                <th>{{ t._('cf_ColumnStatus') }}</th>
                <th class="hide-on-mobile">{{ t._('cf_ColumnDescription') }}</th>
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
        'icon': 'file code',
        'title': t._('cf_EmptyTableTitle'),
        'description': t._('cf_EmptyTableDescription'),
        'showButton': false,
        'documentationLink': 'https://wiki.mikopbx.com/custom-files'
    ]) }}
</div>
```

#### 3.3 Update AssetProvider

**Changes to file**: `src/AdminCabinet/Providers/AssetProvider.php`

Add method for CustomFiles assets:
```php
private function makeCustomFilesAssets(string $action): void
{
    if ($action === 'index') {
        // DataTables for custom files list
        $this->headerCollectionCSS
            ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
        $this->footerCollectionJS
            ->addJs('js/vendor/datatable/dataTables.semanticui.js', true);

        // Main page module
        $this->footerCollectionJS     
            ->addJs('js/pbx/PbxAPI/customFilesAPI.js', true)
            ->addJs('js/pbx/CustomFiles/custom-files-index.js', true);
    } elseif ($action === 'modify') {
        // ACE editor for code editing
        $this->footerCollectionJS
            ->addJs('js/vendor/ace/ace.js', true)
            ->addJs('js/vendor/ace/mode-sh.js', true)
            ->addJs('js/vendor/ace/ext-language_tools.js', true);
            
        $this->footerCollectionJS
            // Edit module
            ->addJs('js/pbx/main/form.js', true)
            ->addJs('js/pbx/PbxAPI/customFilesAPI.js', true)
            ->addJs('js/pbx/CustomFiles/custom-files-modify.js', true);
    }
}
```

### Stage 4: Translations

**Add to file**: `src/Common/Messages/en.php`
```php
'cf_ValidateFilePathIsEmpty' => 'File path is required',
'cf_ValidateFilePathFormat' => 'File path must start with /',
'cf_ValidateModeIsEmpty' => 'Operation mode is required',
'cf_CustomFileSaved' => 'Custom file saved successfully',
'cf_CustomFileDeleted' => 'Custom file deleted successfully',
'cf_ApplyChanges' => 'Apply changes',
'cf_ApplyAllChanges' => 'Apply all changes',
'cf_FileChangedNeedApply' => 'File has unsaved changes',
'cf_FileMode_none' => 'Inactive',
'cf_FileMode_append' => 'Append',
'cf_FileMode_override' => 'Override',
'cf_FileMode_script' => 'Script',
'cf_ColumnFilePath' => 'File Path',
'cf_ColumnMode' => 'Mode',
'cf_ColumnStatus' => 'Status',
'cf_ColumnDescription' => 'Description',
```

### Stage 5: Build and Testing

#### 5.1 JavaScript Transpilation
```bash
# For core system files
docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/CustomFiles/custom-files-modify.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/CustomFiles/custom-files-index.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/PbxAPI/customFilesAPI.js \
  core
```

#### 5.2 PHPStan Check
```bash
# Check PHP code quality
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse /offload/rootfs/usr/www/src/PBXCoreREST/Lib/CustomFiles/
```

## New Files to Create

1. `src/PBXCoreREST/Lib/CustomFiles/GetRecordAction.php`
2. `src/PBXCoreREST/Lib/CustomFiles/GetRecordByPathAction.php`
3. `src/PBXCoreREST/Lib/CustomFiles/GetListAction.php`
4. `src/PBXCoreREST/Lib/CustomFiles/SaveRecordAction.php`
5. `src/PBXCoreREST/Lib/CustomFiles/SaveRecordByPathAction.php`
6. `src/PBXCoreREST/Lib/CustomFiles/ApplyChangesAction.php`
7. `src/PBXCoreREST/Lib/CustomFiles/DataStructure.php`
8. `src/PBXCoreREST/Controllers/CustomFiles/GetController.php`
9. `src/PBXCoreREST/Controllers/CustomFiles/PostController.php`
10. `src/PBXCoreREST/Controllers/CustomFiles/PutController.php`
11. `src/PBXCoreREST/Lib/CustomFilesManagementProcessor.php`
12. `sites/admin-cabinet/assets/js/src/PbxAPI/customFilesAPI.js`

## Files to Modify

1. `src/PBXCoreREST/Providers/RouterProvider.php`
2. `sites/admin-cabinet/assets/js/src/CustomFiles/custom-files-modify.js`
3. `sites/admin-cabinet/assets/js/src/CustomFiles/custom-files-index.js`
4. `src/AdminCabinet/Controllers/CustomFilesController.php`
5. `src/AdminCabinet/Views/CustomFiles/index.volt`
6. `src/Common/Messages/en.php` and `ru.php`
7. `src/AdminCabinet/Providers/AssetProvider.php`

## Expected Results

After implementing the plan, the custom files management system will:

- ✅ Use unified REST API architecture
- ✅ Support reading and updating existing custom files via REST API
- ✅ Prevent creation and deletion of custom files (working with predefined list)
- ✅ Provide apply changes functionality via API
- ✅ Use DataTable for list display with status indicators
- ✅ Integrate with existing Form.js mechanism
- ✅ Preserve ACE editor functionality
- ✅ Show changed status and allow applying changes
- ✅ Support batch apply for all changed files
- ✅ Be ready for external integrations
- ✅ Comply with MikoPBX architectural principles

## Testing

### REST API Endpoints for Testing:
- `GET /pbxcore/api/v2/custom-files/getList` - custom files list
- `GET /pbxcore/api/v2/custom-files/getRecord/{id}` - specific file by ID
- `GET /pbxcore/api/v2/custom-files/getRecordByPath?filepath={encodedPath}` - specific file by filepath
- `PUT /pbxcore/api/v2/custom-files/saveRecord/{id}` - update file by ID
- `PUT /pbxcore/api/v2/custom-files/saveRecordByPath` - update file by filepath
- `POST /pbxcore/api/v2/custom-files/applyChanges` - apply changes

### Test Scenarios:
1. List all custom files
2. Get specific custom file by ID
3. Get specific custom file by filepath (e.g. `/etc/asterisk/manager.conf`)
4. Update existing custom file content by ID
5. Update existing custom file content by filepath
6. Try to get record without ID (should fail)
7. Try to get record with non-existent filepath (should fail)
8. Try to save without ID (should fail)
9. Apply changes to individual file
10. Apply all changes
11. Test different operation modes (none, append, override, script)
12. Verify base64 encoding/decoding
13. Check ACE editor integration
14. Verify that filepath cannot be changed when updating by ID
15. Test content validation (must be valid base64)
16. Test URL encoding/decoding for filepath parameter

## CustomFiles-Specific Features

This migration includes special features not present in the conference rooms example:

1. **Predefined Files Only** - Works with a fixed list of system files, no arbitrary file creation/deletion
2. **Base64 Content Encoding** - File content is stored and transmitted as base64
3. **No Content Sanitization** - Program code in content field is excluded from sanitization to preserve code integrity
4. **Apply Changes Functionality** - Ability to apply custom files to the system
5. **Changed Status Tracking** - Visual indicators for files with pending changes
6. **Operation Modes** - Different modes for file handling (append, override, script)
7. **ACE Editor Integration** - Maintaining code editor functionality
8. **Batch Operations** - Apply all changed files at once
9. **Worker Integration** - Triggering system reloads after file changes

## Important Restrictions

CustomFiles API is designed to work with predefined system configuration files only:

1. **No Create Operation** - New custom files cannot be created via API
2. **No Delete Operation** - Existing custom files cannot be deleted via API
3. **Fixed File Paths** - The filepath property cannot be changed when updating
4. **ID or Filepath Required** - Operations require either a valid record ID or filepath
5. **Predefined List** - Files must be pre-populated in the CustomFiles table by the system
6. **Filepath Support** - Added ability to work with files using filepath as identifier for easier integration

This design ensures security and prevents unauthorized access to arbitrary system files while still providing flexibility for legitimate customization needs.

## API Usage Examples

### Working with ID:
```bash
# Get file by ID
curl -X GET http://127.0.0.1/pbxcore/api/v2/custom-files/getRecord/123

# Update file by ID
curl -X PUT http://127.0.0.1/pbxcore/api/v2/custom-files/saveRecord/123 \
  -d "content=base64encodedcontent&mode=override&description=Updated config"
```

### Working with Filepath:
```bash
# Get file by filepath
curl -X GET "http://127.0.0.1/pbxcore/api/v2/custom-files/getRecordByPath?filepath=%2Fetc%2Fasterisk%2Fmanager.conf"

# Update file by filepath
curl -X PUT http://127.0.0.1/pbxcore/api/v2/custom-files/saveRecordByPath \
  -d "filepath=%2Fetc%2Fasterisk%2Fmanager.conf&content=base64encodedcontent&mode=override"
```