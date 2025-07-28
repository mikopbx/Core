# MikoPBX Sound Files REST API Migration Plan

## Project Overview

This document contains a detailed plan for adapting the MikoPBX sound files management system to use a unified REST API architecture. The plan is based on the guide `docs/mikopbx-rest-migration-guide.md` and follows the principles of minimal changes to the user interface, preserving the existing two-tab interface and utilizing the IndexSoundPlayer for audio playback.

## Current State

### Existing Architecture
- **Model**: `src/Common/Models/SoundFiles.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/SoundFilesController.php`
- **Form**: `src/AdminCabinet/Forms/SoundFilesEditForm.php`
- **Partial REST API**: Delete and upload actions implemented
- **JavaScript**: Sound file management with IndexSoundPlayer class for audio playback
- **UI Structure**: Two tabs - Custom sounds and Music on Hold
- **Player**: Inline audio player with progress bar and duration display

### SoundFiles Model Fields
```php
public $id;           // Primary key
public $name;         // Sound file name/description
public $path;         // File system path
public $category;     // Category (custom, moh, etc.)
public $description;  // File description
```

### Model Relations
- `hasMany` → `CallQueues` (by moh_sound_id)
- `hasMany` → `IvrMenu` (by various sound fields)
- `hasMany` → `OutWorkTimes` (by audio_message_id)

## Key Migration Principles

1. **Preserve UI/UX**: Keep the existing two-tab interface exactly as is
2. **Use IndexSoundPlayer**: Continue using the existing player class for audio playback
3. **Template-based Rendering**: Use JavaScript to populate Volt template structures with REST API data
4. **Minimal Changes**: Only modify what's necessary for REST API integration
5. **Keep Upload Logic**: Preserve the existing file upload and merge mechanism

## Detailed Implementation Plan

### Stage 1: Creating REST API Backend

#### 1.1 MikoPBX REST API Architecture

**Important**: In MikoPBX REST API architecture, Action classes are executed in Workers without HTTP context. Therefore, they should not inherit from Injectable and work with $this->request directly.

**Correct Flow**:
```
HTTP Request → Controller → Worker → Action → Database → Response
```

#### 1.2 Action Classes for Sound Files

**File**: `src/PBXCoreREST/Lib/SoundFiles/GetRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting sound file record
 * 
 * @api {get} /pbxcore/api/v2/sound-files/getRecord/:id Get sound file record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup SoundFiles
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Sound file data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.name File name
 * @apiSuccess {String} data.path File path
 * @apiSuccess {String} data.category File category
 * @apiSuccess {String} data.description File description
 */
class GetRecordAction
{
    /**
     * Get sound file record
     * @param string|null $id - Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id) || $id === 'new') {
            // Create structure for new record
            $newFile = new SoundFiles();
            $newFile->id = '';
            $newFile->name = '';
            $newFile->path = '';
            $newFile->category = SoundFiles::CATEGORY_CUSTOM;
            $newFile->description = '';
            
            $res->data = DataStructure::createFromModel($newFile);
            $res->success = true;
        } else {
            // Find existing record
            $file = SoundFiles::findFirstById($id);
            
            if ($file) {
                $res->data = DataStructure::createFromModel($file);
                $res->success = true;
            } else {
                $res->messages['error'][] = 'Sound file not found';
            }
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/SoundFiles/GetListAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all sound files
 * 
 * @api {get} /pbxcore/api/v2/sound-files/getList Get all sound files
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup SoundFiles
 * 
 * @apiParam {String} [category] Filter by category
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of sound files
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.name File name
 * @apiSuccess {String} data.path File path
 * @apiSuccess {String} data.category File category
 * @apiSuccess {String} data.description File description
 */
class GetListAction
{
    /**
     * Get list of all sound files
     * 
     * @param array $data - Filter parameters
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Build query conditions
            $parameters = [
                'order' => 'name ASC'
            ];
            
            // Add category filter if provided
            if (!empty($data['category'])) {
                $parameters['conditions'] = 'category = :category:';
                $parameters['bind'] = ['category' => $data['category']];
            }
            
            // Get sound files
            $files = SoundFiles::find($parameters);
            
            $result = [];
            foreach ($files as $file) {
                $result[] = DataStructure::createFromModel($file);
            }
            
            $res->data = $result;
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/SoundFiles/SaveRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for saving sound file record
 * 
 * @api {post} /pbxcore/api/v2/sound-files/saveRecord Create sound file
 * @api {put} /pbxcore/api/v2/sound-files/saveRecord/:id Update sound file
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup SoundFiles
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} name File name/description
 * @apiParam {String} [description] File description
 * @apiParam {String} [category] File category
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved sound file data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction
{
    /**
     * Save sound file record
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
            'name' => 'string|html_escape|max:255',
            'description' => 'string|html_escape|max:1000|empty_to_null',
            'category' => 'string|max:50'
        ];
        $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);
        
        // Validate required fields
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Sound file name is required']
            ]
        ];
        $validationErrors = BaseActionHelper::validateData($data, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Get or create model
        if (!empty($data['id'])) {
            $file = SoundFiles::findFirstById($data['id']);
            if (!$file) {
                $res->messages['error'][] = 'api_SoundFileNotFound';
                return $res;
            }
        } else {
            $file = new SoundFiles();
        }
        
        try {
            // Save in transaction using BaseActionHelper
            $savedFile = BaseActionHelper::executeInTransaction(function() use ($file, $data) {
                // Update model fields
                $file->name = $data['name'];
                $file->description = $data['description'] ?? '';
                
                // Set category only for new files or if explicitly provided
                if (empty($file->id) || !empty($data['category'])) {
                    $file->category = $data['category'] ?? SoundFiles::CATEGORY_CUSTOM;
                }
                
                if (!$file->save()) {
                    throw new \Exception(implode(', ', $file->getMessages()));
                }
                
                return $file;
            });
            
            $res->data = DataStructure::createFromModel($savedFile);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "sound-files/modify/{$savedFile->id}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/SoundFiles/DataStructure.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\SoundFiles;

/**
 * Data structure for sound files
 * 
 * @package MikoPBX\PBXCoreREST\Lib\SoundFiles
 */
class DataStructure
{
    /**
     * Create data array from SoundFiles model
     * @param \MikoPBX\Common\Models\SoundFiles $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        return [
            'id' => (string)$model->id,
            'name' => $model->name,
            'path' => $model->path,
            'category' => $model->category,
            'description' => $model->description ?? '',
            'fileSize' => file_exists($model->path) ? filesize($model->path) : 0,
            'duration' => self::getAudioDuration($model->path)
        ];
    }
    
    /**
     * Get audio file duration
     * @param string $path
     * @return string
     */
    private static function getAudioDuration(string $path): string
    {
        // This is a placeholder - implement actual duration calculation
        // using sox or ffprobe
        return '00:00';
    }
}
```

**File**: `src/PBXCoreREST/Lib/SoundFiles/DeleteRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for deleting sound file record
 * 
 * @api {delete} /pbxcore/api/v2/sound-files/deleteRecord/:id Delete sound file
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup SoundFiles
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
     * Delete sound file record
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
            // Find record
            $file = SoundFiles::findFirstById($id);
            
            if (!$file) {
                $res->messages['error'][] = 'api_SoundFileNotFound';
                return $res;
            }
            
            // Check if file is in use
            $usage = self::checkFileUsage($file);
            if (!empty($usage)) {
                $res->messages['error'][] = 'Sound file is in use: ' . implode(', ', $usage);
                return $res;
            }
            
            // Delete in transaction using BaseActionHelper
            BaseActionHelper::executeInTransaction(function() use ($file) {
                // Delete physical file
                if (file_exists($file->path)) {
                    unlink($file->path);
                }
                
                // Delete database record
                if (!$file->delete()) {
                    throw new \Exception('Failed to delete sound file: ' . implode(', ', $file->getMessages()));
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
    
    /**
     * Check if sound file is in use
     * @param SoundFiles $file
     * @return array
     */
    private static function checkFileUsage(SoundFiles $file): array
    {
        $usage = [];
        
        // Check CallQueues
        if ($file->CallQueues->count() > 0) {
            $usage[] = 'Call Queues';
        }
        
        // Check IvrMenu
        if ($file->IvrMenu->count() > 0) {
            $usage[] = 'IVR Menus';
        }
        
        // Check OutWorkTimes
        if ($file->OutWorkTimes->count() > 0) {
            $usage[] = 'Out of Work Times';
        }
        
        return $usage;
    }
}
```

**File**: `src/PBXCoreREST/Lib/SoundFiles/UploadFileAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Files\UploadFile;

/**
 * Action for uploading sound file
 * 
 * @api {post} /pbxcore/api/v2/sound-files/uploadFile Upload sound file
 * @apiVersion 2.0.0
 * @apiName UploadFile
 * @apiGroup SoundFiles
 * 
 * @apiParam {String} file_id Resumable file identifier
 * @apiParam {String} [category] File category
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Upload result
 * @apiSuccess {String} data.file_id File identifier
 * @apiSuccess {String} data.file_path Path to uploaded file
 * @apiSuccess {String} data.uploaded_size Uploaded file size
 */
class UploadFileAction
{
    /**
     * Upload sound file using Resumable.js
     * 
     * @param array $data - Upload data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $uploadFile = new UploadFile();
        $uploadFile->resumableIdentifier = $data['file_id'] ?? '';
        $category = $data['category'] ?? SoundFiles::CATEGORY_CUSTOM;
        
        $d_info = $uploadFile->upload($category);
        
        if ($d_info['status'] !== 'uploaded') {
            $res->success = false;
            $res->data = $d_info;
        } else {
            // Create or update sound file record
            $soundFile = SoundFiles::findFirst([
                'conditions' => 'path = :path:',
                'bind' => ['path' => $d_info['upload_file_path']]
            ]);
            
            if (!$soundFile) {
                $soundFile = new SoundFiles();
                $soundFile->path = $d_info['upload_file_path'];
                $soundFile->category = $category;
            }
            
            // Extract filename without extension
            $filename = pathinfo($d_info['upload_file_path'], PATHINFO_FILENAME);
            $soundFile->name = $filename;
            
            if ($soundFile->save()) {
                $d_info['sound_file_id'] = $soundFile->id;
                $res->success = true;
                $res->data = $d_info;
            } else {
                $res->messages['error'] = $soundFile->getMessages();
            }
        }
        
        return $res;
    }
}
```

#### 1.3 REST API Controllers

**Note**: MikoPBX uses a standardized approach with a single `callAction` method and `{actionName}` parameter in routes.

**New file**: `src/PBXCoreREST/Controllers/SoundFiles/GetController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\SoundFiles;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\SoundFilesManagementProcessor;

/**
 * GET controller for sound files management
 * 
 * @RoutePrefix("/pbxcore/api/v2/sound-files")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/sound-files/getRecord/123
 * curl http://127.0.0.1/pbxcore/api/v2/sound-files/getRecord/new
 * curl http://127.0.0.1/pbxcore/api/v2/sound-files/getList
 * curl http://127.0.0.1/pbxcore/api/v2/sound-files/getList?category=moh
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\SoundFiles
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get sound file record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all sound files
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
            SoundFilesManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
```

**New file**: `src/PBXCoreREST/Controllers/SoundFiles/PostController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\SoundFiles;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\SoundFilesManagementProcessor;

/**
 * POST controller for sound files management
 * 
 * @RoutePrefix("/pbxcore/api/v2/sound-files")
 * 
 * @examples
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/sound-files/saveRecord \
 *   -d "name=Welcome Message&description=Main IVR greeting"
 * 
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/sound-files/uploadFile \
 *   -F "file=@welcome.wav" -F "category=custom"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\SoundFiles
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates sound file record
     * @Post("/saveRecord")
     * 
     * Uploads sound file
     * @Post("/uploadFile")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        
        // Handle file uploads
        if ($actionName === 'uploadFile') {
            $postData = array_merge($postData, $_REQUEST);
        }
        
        $this->sendRequestToBackendWorker(
            SoundFilesManagementProcessor::class,
            $actionName,
            $postData
        );
    }
}
```

**New file**: `src/PBXCoreREST/Controllers/SoundFiles/PutController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\SoundFiles;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\SoundFilesManagementProcessor;

/**
 * PUT controller for sound files management
 * 
 * @RoutePrefix("/pbxcore/api/v2/sound-files")
 * 
 * @examples
 * curl -X PUT http://127.0.0.1/pbxcore/api/v2/sound-files/saveRecord/123 \
 *   -d "name=Updated Welcome&description=New description"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\SoundFiles
 */
class PutController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Sound file ID for update operations
     * 
     * Updates existing sound file record
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
            SoundFilesManagementProcessor::class,
            $actionName,
            $putData
        );
    }
}
```

**New file**: `src/PBXCoreREST/Controllers/SoundFiles/DeleteController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\SoundFiles;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\SoundFilesManagementProcessor;

/**
 * DELETE controller for sound files management
 * 
 * @RoutePrefix("/pbxcore/api/v2/sound-files")
 * 
 * @examples
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v2/sound-files/deleteRecord/123
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\SoundFiles
 */
class DeleteController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Sound file ID to delete
     * 
     * Deletes sound file record
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
            SoundFilesManagementProcessor::class,
            $actionName,
            $deleteData
        );
    }
}
```

#### 1.4 Update Processor

**Changes to file**: `src/PBXCoreREST/Lib/SoundFilesManagementProcessor.php`

```php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\SoundFiles\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction,
    UploadFileAction
};
use Phalcon\Di\Injectable;

/**
 * Sound files management processor
 *
 * Handles all sound file management operations including:
 * - getRecord: Get single sound file by ID or create new structure
 * - getList: Get list of all sound files
 * - saveRecord: Create or update sound file
 * - deleteRecord: Delete sound file
 * - uploadFile: Upload new sound file
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class SoundFilesManagementProcessor extends Injectable
{
    /**
     * Processes sound file management requests
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
                
            case 'uploadFile':
                $res = UploadFileAction::main($data);
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
use SoundFiles\GetController as SoundFilesGetController,
    SoundFiles\PostController as SoundFilesPostController,
    SoundFiles\PutController as SoundFilesPutController,
    SoundFiles\DeleteController as SoundFilesDeleteController;
```

Add to routes array:
```php
// GET routes
[
    SoundFilesGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/sound-files/{actionName}', 
    'get', 
    '/'
],
[
    SoundFilesGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/sound-files/{actionName}/{id:[0-9]+}', 
    'get', 
    '/'
],
// POST route
[
    SoundFilesPostController::class, 
    'callAction', 
    '/pbxcore/api/v2/sound-files/{actionName}', 
    'post', 
    '/'
],
// PUT route
[
    SoundFilesPutController::class, 
    'callAction', 
    '/pbxcore/api/v2/sound-files/{actionName}/{id:[0-9]+}', 
    'put', 
    '/'
],
// DELETE route
[
    SoundFilesDeleteController::class, 
    'callAction', 
    '/pbxcore/api/v2/sound-files/{actionName}/{id:[0-9]+}', 
    'delete', 
    '/'
],
```

### Stage 2: Update JavaScript Client

#### 2.1 Create API Methods

**New file**: `sites/admin-cabinet/assets/js/src/PbxAPI/soundFilesAPI.js`
```javascript
//<Copyright>

/* global globalRootUrl, PbxApi, globalTranslate */

/**
 * SoundFilesAPI - REST API for sound file management
 * 
 * Uses unified approach with centralized endpoint definitions.
 * This provides:
 * - Single point of API URL management
 * - Easy API version switching (v2 -> v3)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
const SoundFilesAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/`,
    
    // Endpoint definitions for unification
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/getRecord`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/deleteRecord`,
        uploadFile: `${Config.pbxUrl}/pbxcore/api/v2/sound-files/uploadFile`
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
     * @param {object} params - Query parameters (e.g., category filter)
     * @param {function} callback - Callback function
     */
    getList(params, callback) {
        const url = params && Object.keys(params).length > 0 
            ? `${this.endpoints.getList}?${$.param(params)}`
            : this.endpoints.getList;
            
        $.api({
            url: url,
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
     * Upload file endpoint for Resumable.js
     * @returns {string}
     */
    getUploadUrl() {
        return this.endpoints.uploadFile;
    }
};
```

#### 2.2 Form Edit Module with Preserved Upload Mechanism

**IMPORTANT**: We preserve the existing file upload and merging mechanism that works excellently. Only adapt data loading/saving to use REST API.

**New file**: `sites/admin-cabinet/assets/js/src/SoundFiles/sound-file-modify.js`
```javascript
//<Copyright>

/* global globalRootUrl, SoundFilesAPI, Form, globalTranslate, UserMessage */

/**
 * Sound file edit form management module
 */
const soundFileModify = {
    $formObj: $('#sound-file-form'),
    $audioPlayer: $('#audio-player'),
    $uploadButton: $('#upload-button'),
    $fileInput: $('#file-input'),
    
    /**
     * Validation rules
     */
    validateRules: {
        name: {
            identifier: 'name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.sf_ValidateNameIsEmpty
                }
            ]
        }
    },
    
    /**
     * Module initialization
     */
    initialize() {
        // Initialize tabs
        $('.menu .item').tab({
            history: true,
            historyType: 'hash',
        });
        
        // Initialize file upload
        soundFileModify.initializeFileUpload();
        
        // Configure Form.js
        Form.$formObj = soundFileModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = soundFileModify.validateRules;
        Form.cbBeforeSendForm = soundFileModify.cbBeforeSendForm;
        Form.cbAfterSendForm = soundFileModify.cbAfterSendForm;
        
        // Configure REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = SoundFilesAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}sound-files/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}sound-files/modify/`;
        
        // Initialize Form with all standard features
        Form.initialize();
        
        // Load form data
        soundFileModify.initializeForm();
    },
    
    /**
     * Initialize file upload - PRESERVE EXISTING MECHANISM
     * This method should initialize the existing upload system
     * that already works well with file merging functionality
     */
    initializeFileUpload() {
        // Call existing upload initialization
        // This preserves the current working mechanism
        if (window.soundFileModify && window.soundFileModify.initializeForm) {
            // Use existing initialization
            return;
        }
        
        // Initialize with REST API endpoint but keep existing logic
        const $uploadButton = $('#upload-sound-file-button');
        const resumable = new Resumable({
            target: SoundFilesAPI.getUploadUrl(),
            testChunks: false,
            chunkSize: 1 * 1024 * 1024,
            simultaneousUploads: 1
        });
        
        resumable.assignBrowse($uploadButton[0]);
        resumable.assignDrop(soundFileModify.$formObj[0]);
        
        // Keep existing event handlers for file merge functionality
        resumable.on('fileAdded', (file) => {
            // Preserve existing upload logic
            soundFileModify.showUploadProgress();
            resumable.upload();
        });
        
        resumable.on('fileSuccess', (file, response) => {
            const result = JSON.parse(response);
            if (result.result) {
                // Update form fields but preserve existing logic
                $('#path').val(result.data.upload_file_path);
                soundFileModify.updateAudioPlayer(result.data.upload_file_path);
            }
            soundFileModify.hideUploadProgress();
        });
        
        soundFileModify.resumable = resumable;
    },
    
    /**
     * Handle successful file upload
     */
    handleUploadSuccess(data) {
        // Update form with new file data
        $('#path').val(data.upload_file_path);
        
        // Update audio player
        if (soundFileModify.$audioPlayer.length) {
            soundFileModify.$audioPlayer.attr('src', data.upload_file_path);
            soundFileModify.$audioPlayer[0].load();
        }
        
        // Extract filename for name field if empty
        if (!$('#name').val() && data.upload_file_path) {
            const filename = data.upload_file_path.split('/').pop().split('.')[0];
            $('#name').val(filename);
        }
        
        soundFileModify.hideUploadProgress();
        UserMessage.showSuccess(globalTranslate.sf_UploadSuccess);
    },
    
    /**
     * Show upload progress
     */
    showUploadProgress() {
        soundFileModify.$uploadButton.addClass('loading disabled');
        $('#upload-progress').show();
    },
    
    /**
     * Update upload progress
     */
    updateUploadProgress(percent) {
        $('#upload-progress .bar').css('width', percent + '%');
        $('#upload-progress .label').text(percent + '%');
    },
    
    /**
     * Hide upload progress
     */
    hideUploadProgress() {
        soundFileModify.$uploadButton.removeClass('loading disabled');
        $('#upload-progress').hide();
    },
    
    /**
     * Load data into form
     */
    initializeForm() {
        const recordId = soundFileModify.getRecordId();
        
        SoundFilesAPI.getRecord(recordId, (response) => {
            if (response.result) {
                soundFileModify.populateForm(response.data);
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load sound file data');
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
        return settings;
    },
    
    /**
     * Callback after form submission
     */
    cbAfterSendForm(response) {
        if (response.result) {
            if (response.data) {
                soundFileModify.populateForm(response.data);
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
        
        // Update audio player if path exists
        if (data.path && soundFileModify.$audioPlayer.length) {
            soundFileModify.$audioPlayer.attr('src', data.path);
            soundFileModify.$audioPlayer[0].load();
        }
        
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    }
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    soundFileModify.initialize();
});
```

#### 2.3 Update Sound Files List with Template Preservation

**IMPORTANT**: We will preserve Volt template structure and use JavaScript to populate data from REST API into existing templates.

**Changes to file**: `sites/admin-cabinet/assets/js/src/SoundFiles/sound-files-index.js`

Replace content with:
```javascript
//<Copyright>

/* global globalRootUrl, SoundFilesAPI, globalTranslate, UserMessage, IndexSoundPlayer */

/**
 * Sound files table management module with template preservation
 */
const soundFilesTable = {
    $customTab: $('#custom-sound-files-table'),
    $mohTab: $('#moh-sound-files-table'),
    activeCategory: 'custom',
    soundPlayers: {},

    /**
     * Initialize the module
     */
    initialize() {
        // Initialize tabs
        $('#sound-files-menu .item').tab({
            onVisible: (tabPath) => {
                soundFilesTable.activeCategory = tabPath;
                soundFilesTable.loadSoundFiles(tabPath);
            }
        });
        
        // Load initial data
        soundFilesTable.loadSoundFiles('custom');
    },
    
    /**
     * Load sound files from REST API and render using templates
     */
    loadSoundFiles(category) {
        // Show loading state
        const $container = category === 'custom' ? $('.ui.tab[data-tab="custom"]') : $('.ui.tab[data-tab="moh"]');
        $container.addClass('loading');
        
        // Get data from REST API
        SoundFilesAPI.getList({ category: category }, (response) => {
            if (response.result && response.data) {
                soundFilesTable.renderSoundFiles(response.data, category);
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load sound files');
            }
            $container.removeClass('loading');
        });
    },
    
    /**
     * Render sound files using template structure
     */
    renderSoundFiles(files, category) {
        const $container = category === 'custom' ? $('.ui.tab[data-tab="custom"]') : $('.ui.tab[data-tab="moh"]');
        const tableId = category === 'custom' ? 'custom-sound-files-table' : 'moh-sound-files-table';
        
        // Clear existing content but preserve button
        const $button = $container.find('.ui.blue.button').detach();
        $container.empty();
        if ($button.length) {
            $container.append($button);
        }
        
        if (files.length === 0) {
            // Show empty placeholder
            const emptyHtml = soundFilesTable.getEmptyPlaceholder(category);
            $container.append(emptyHtml);
            return;
        }
        
        // Build table using template structure
        let tableHtml = `<table class="ui selectable compact unstackable table" id="${tableId}">
            <thead>
                <tr>
                    <th>${globalTranslate.sf_ColumnFile}</th>
                    <th>${globalTranslate.sf_ColumnPlayer}</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>`;
        
        // Build rows using template structure from customTab.volt
        files.forEach((file) => {
            tableHtml += soundFilesTable.renderFileRow(file);
        });
        
        tableHtml += `</tbody></table>`;
        $container.append(tableHtml);
        
        // Initialize all audio players for this table
        files.forEach((file) => {
            if (file.path) {
                soundFilesTable.soundPlayers[file.id] = new IndexSoundPlayer(file.id);
            }
        });
        
        // Initialize delete buttons
        soundFilesTable.initializeDeleteButtons($container);
        
        // Initialize double-click for editing
        soundFilesTable.initializeDoubleClickEdit($container);
    
    /**
     * Render single file row using template structure
     */
    renderFileRow(file) {
        const playPath = file.path ? `/pbxcore/api/cdr/v2/playback?view=${file.path}` : '';
        const downloadPath = file.path ? `/pbxcore/api/cdr/v2/playback?view=${file.path}&download=1&filename=${file.name}.mp3` : '';
        
        return `<tr class="file-row" id="${file.id}" data-value="${file.path || ''}">
            <td class="name collapsing"><i class="file audio outline icon"></i>${file.name}</td>
            <td class="cdr-player">
                <table>
                    <tr>
                        <td class="one wide">
                            ${file.path ? 
                                `<i class="ui icon play"></i>
                                 <audio preload="metadata" id="audio-player-${file.id}">
                                     <source src="${playPath}"/>
                                 </audio>` : 
                                `<i class="ui icon play disabled"></i>
                                 <audio preload="none" id="audio-player-${file.id}">
                                     <source src=""/>
                                 </audio>`
                            }
                        </td>
                        <td>
                            <div class="ui range cdr-player"></div>
                        </td>
                        <td class="one wide"><span class="cdr-duration"></span></td>
                        <td class="one wide">
                            <i class="ui icon download" data-value="${file.path ? downloadPath : ''}"></i>
                        </td>
                    </tr>
                </table>
            </td>
            <td class="right aligned collapsing">
                <a href="${globalRootUrl}sound-files/modify/${file.id}" 
                   class="ui icon basic button popuped"
                   data-content="${globalTranslate.bt_ToolTipEdit}">
                    <i class="icon edit"></i>
                </a>
                <a href="${globalRootUrl}sound-files/delete/${file.id}" 
                   data-value="${file.id}"
                   class="ui icon basic button delete two-steps-delete popuped"
                   data-content="${globalTranslate.bt_ToolTipDelete}">
                    <i class="icon trash red"></i>
                </a>
            </td>
        </tr>`;
    },
    
    /**
     * Get empty placeholder HTML
     */
    getEmptyPlaceholder(category) {
        const linkPath = category === 'custom' ? 'sound-files/modify/custom' : 'sound-files/modify/moh';
        return `<div class="ui placeholder segment">
            <div class="ui icon header">
                <i class="music icon"></i>
                ${globalTranslate.sf_EmptyTableTitle}
            </div>
            <p>${globalTranslate.sf_EmptyTableDescription}</p>
            <div class="ui primary button" onclick="window.location='${globalRootUrl}${linkPath}'">
                <i class="add circle icon"></i> ${globalTranslate.sf_AddNewSoundFile}
            </div>
        </div>`;
    },
    
    /**
     * Initialize delete buttons
     */
    initializeDeleteButtons($container) {
        $container.on('click', 'a.delete.two-steps-delete', function(e) {
            e.preventDefault();
            $(this).closest('a').removeClass('two-steps-delete');
        });
        
        $container.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const fileId = $button.attr('data-value');
            
            $button.addClass('loading disabled');
            
            SoundFilesAPI.deleteRecord(fileId, (response) => {
                soundFilesTable.cbAfterDeleteRecord(response);
            });
        });
    },
    
    /**
     * Callback after record deletion
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Reload current tab
            soundFilesTable.loadSoundFiles(soundFilesTable.activeCategory);
            UserMessage.showSuccess(globalTranslate.sf_SoundFileDeleted);
        } else {
            UserMessage.showError(
                response.messages?.error || 
                globalTranslate.sf_ImpossibleToDeleteSoundFile
            );
        }
        
        // Remove loading indicator
        $('a.delete').removeClass('loading disabled');
    },
    
    /**
     * Initialize double-click for editing
     */
    initializeDoubleClickEdit($container) {
        $container.on('dblclick', 'tr.file-row td:not(.right)', function() {
            const $row = $(this).closest('tr');
            const fileId = $row.attr('id');
            if (fileId) {
                window.location = `${globalRootUrl}sound-files/modify/${fileId}`;
            }
        });
    }
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    soundFilesTable.initialize();
});
```

#### 2.4 Update Volt Templates

**IMPORTANT**: We will keep the existing two-tab interface structure and only make minimal changes to support REST API data loading.

**Changes to file**: `src/AdminCabinet/Views/SoundFiles/index.volt`

```volt
<div class="ui top attached tabular menu" id="sound-files-menu">
    <a class="item active" data-tab="custom">{{ t._('sf_CustomSounds') }}</a>
    <a class="item" data-tab="moh">{{ t._('sf_MusicOnHold') }}</a>
</div>
<div class="ui bottom attached tab segment active" data-tab="custom">
    {% if isAllowed('save') %}
        {{ link_to("sound-files/modify/custom", '<i class="add circle icon"></i> '~t._('sf_AddNewSoundFile'), "class": " ui blue button ", "id":"add-new-custom-button") }}
    {% endif %}
    <!-- Content will be loaded dynamically via JavaScript -->
</div>
<div class="ui bottom attached tab segment" data-tab="moh">
    {% if isAllowed('save') %}
        {{ link_to("sound-files/modify/moh", '<i class="add circle icon"></i> '~t._('sf_AddNewSoundFile'), "class": " ui blue button ", "id":"add-new-moh-button") }}
    {% endif %}
    <!-- Content will be loaded dynamically via JavaScript -->
</div>
```

**Changes to file**: `src/AdminCabinet/Views/SoundFiles/modify.volt`

```volt
{{ form('sound-files/save', 'role': 'form', 'class': 'ui form large', 'id':'sound-file-form') }}

{{ form.render('id') }}
{{ form.render('path') }}

<div class="ui top attached tabular menu">
    <a class="item active" data-tab="audio-files">{{ t._('sf_TabAudioFiles') }}</a>
    <a class="item" data-tab="music-on-hold">{{ t._('sf_TabMusicOnHold') }}</a>
</div>

<div class="ui bottom attached tab segment active" data-tab="audio-files">
    <div class="field">
        <label>{{ t._('sf_Name') }}</label>
        {{ form.render('name') }}
    </div>
    
    <div class="field">
        <label>{{ t._('sf_Description') }}</label>
        {{ form.render('description') }}
    </div>
    
    <div class="field">
        <label>{{ t._('sf_Category') }}</label>
        {{ form.render('category') }}
    </div>
    
    <div class="field">
        <label>{{ t._('sf_AudioFile') }}</label>
        {% if path %}
            <audio id="audio-player" controls>
                <source src="{{ path }}" type="audio/wav">
                {{ t._('sf_YourBrowserDoesNotSupportAudio') }}
            </audio>
        {% endif %}
        
        <div class="ui placeholder segment" id="upload-drop-zone">
            <div class="ui icon header">
                <i class="file audio outline icon"></i>
                {{ t._('sf_DropFileHereOrClick') }}
            </div>
            <div class="ui primary button" id="upload-button">
                <i class="upload icon"></i>
                {{ t._('sf_SelectFile') }}
            </div>
        </div>
        
        <div class="ui progress" id="upload-progress" style="display: none;">
            <div class="bar">
                <div class="progress"></div>
            </div>
            <div class="label">{{ t._('sf_Uploading') }}</div>
        </div>
    </div>
</div>

<div class="ui bottom attached tab segment" data-tab="music-on-hold">
    <div class="ui info message">
        <div class="header">{{ t._('sf_MusicOnHoldInfo') }}</div>
        <p>{{ t._('sf_MusicOnHoldDescription') }}</p>
    </div>
    
    <!-- MOH specific settings can be added here in the future -->
    <div class="field">
        <div class="ui checkbox">
            {{ form.render('use_as_moh') }}
            <label>{{ t._('sf_UseAsMusicOnHold') }}</label>
        </div>
    </div>
</div>

{{ partial("partials/submitbutton", ['indexurl': 'sound-files/index']) }}

<div class="ui hidden message" id="success-message">
    <i class="close icon"></i>
    <div class="header">{{ t._('sf_UpdateSuccessful') }}</div>
</div>

{{ endForm() }}
```

#### 2.5 Update AssetProvider

**Changes to file**: `src/AdminCabinet/Providers/AssetProvider.php`

Add method for sound files assets:
```php
private function makeSoundFilesAssets(string $action): void
{
    if ($action === 'index') {
        // Required for audio player functionality
        $this->footerCollectionJS
            ->addJs('js/vendor/jquery.address.min.js', true)
            ->addJs('js/vendor/range/range.min.js', true);
            
        // API and sound player
        $this->footerCollectionJS
            ->addJs('js/pbx/PbxAPI/soundFilesAPI.js', true)
            ->addJs('js/pbx/SoundFiles/sound-files-index-player.js', true)
            ->addJs('js/pbx/SoundFiles/sound-files-index.js', true);
            
        // CSS for range slider
        $this->headerCollectionCSS
            ->addCss('css/vendor/range/range.css', true);
    } elseif ($action === 'modify') {
        // Resumable.js for file upload
        $this->footerCollectionJS
            ->addJs('js/vendor/resumable.js', true);
            
        $this->footerCollectionJS
            // Edit module
            ->addJs('js/pbx/main/form.js', true)
            ->addJs('js/pbx/PbxAPI/soundFilesAPI.js', true)
            ->addJs('js/pbx/SoundFiles/sound-file-modify.js', true);
    }
}
```

### Stage 3: AdminCabinet Adaptation

**Changes to file**: `src/AdminCabinet/Controllers/SoundFilesController.php`

Minimal changes to support REST API while keeping the existing interface:
```php
<?php
//<Copyright>

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\SoundFilesEditForm;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;

class SoundFilesController extends BaseController
{
    /**
     * Build the list of sound files.
     */
    public function indexAction(): void
    {
        // Keep existing logic, data will be loaded via JavaScript
        // No changes needed here
    }

    /**
     * Edit sound file details.
     *
     * @param string|null $category The category (custom/moh)
     * @param string|null $id The ID of the sound file.
     */
    public function modifyAction(string $category = null, string $id = null): void
    {
        // Handle both old and new URL patterns
        if ($category && !$id) {
            // New file for specific category
            $id = null;
        } elseif ($category && is_numeric($category)) {
            // Old URL pattern - sound-files/modify/{id}
            $id = $category;
            $category = null;
        }
        
        // Get data via REST API
        $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/v2/sound-files/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            ['id' => $id]
        ]);
        
        if (!$restAnswer->success) {
            $this->flash->error(json_encode($restAnswer->messages));
            $this->dispatcher->forward([
                'controller' => 'sound-files',
                'action' => 'index'
            ]);
            return;
        }
        
        $getRecordStructure = (object)$restAnswer->data;
        
        // Set category for new files
        if (!$id && $category) {
            $getRecordStructure->category = $category;
        }
        
        // Create form based on API data structure
        $this->view->form = new SoundFilesEditForm($getRecordStructure);
        $this->view->represent = $getRecordStructure->name ?: '';
        $this->view->path = $getRecordStructure->path ?: '';
        $this->view->category = $getRecordStructure->category ?: 'custom';
    }
}
```

### Stage 4: Translations

**Add to file**: `src/Common/Messages/en.php`
```php
'sf_ValidateNameIsEmpty' => 'Sound file name is required',
'sf_SoundFileSaved' => 'Sound file saved successfully',
'sf_SoundFileDeleted' => 'Sound file deleted successfully',
'sf_UploadNotSupported' => 'Your browser does not support file uploads',
'sf_UploadFailed' => 'Failed to upload file',
'sf_UploadSuccess' => 'File uploaded successfully',
'sf_FileInUse' => 'This file is in use and cannot be deleted',
'sf_ImpossibleToDeleteSoundFile' => 'Unable to delete sound file',
'sf_CategoryCustom' => 'Custom',
'sf_CategoryMOH' => 'Music on Hold',
'sf_CategorySystem' => 'System',
'sf_FilterByCategory' => 'Filter by category',
'sf_AllCategories' => 'All categories',
'sf_PlayFile' => 'Play file',
'sf_HeaderSoundFiles' => 'Sound Files',
'sf_SubHeaderSoundFiles' => 'Manage audio files for IVR, music on hold, and custom announcements',
'sf_AddNewSoundFile' => 'Add Sound File',
'sf_EmptyTableTitle' => 'No sound files yet',
'sf_EmptyTableDescription' => 'Upload audio files to use them in IVR menus, call queues, and other PBX features',
'sf_TabAudioFiles' => 'Audio files',
'sf_TabMusicOnHold' => 'Music on hold',
'sf_MusicOnHoldInfo' => 'Music on Hold Settings',
'sf_MusicOnHoldDescription' => 'Configure this sound file for use as music on hold in call queues and during transfers.',
'sf_UseAsMusicOnHold' => 'Use as music on hold',
'sf_Category' => 'Category',
'sf_Name' => 'Name',
'sf_Description' => 'Description',
'sf_AudioFile' => 'Audio File',
'sf_YourBrowserDoesNotSupportAudio' => 'Your browser does not support the audio element',
'sf_DropFileHereOrClick' => 'Drop audio file here or click to browse',
'sf_SelectFile' => 'Select File',
'sf_Uploading' => 'Uploading...',
'sf_UpdateSuccessful' => 'Sound file updated successfully',
'sf_ColumnName' => 'Name',
'sf_ColumnCategory' => 'Category',
'sf_ColumnSize' => 'Size',
'sf_ColumnDuration' => 'Duration',
```

**Add to file**: `src/Common/Messages/ru.php`
```php
'sf_ValidateNameIsEmpty' => 'Название звукового файла обязательно',
'sf_SoundFileSaved' => 'Звуковой файл успешно сохранен',
'sf_SoundFileDeleted' => 'Звуковой файл успешно удален',
'sf_UploadNotSupported' => 'Ваш браузер не поддерживает загрузку файлов',
'sf_UploadFailed' => 'Не удалось загрузить файл',
'sf_UploadSuccess' => 'Файл успешно загружен',
'sf_FileInUse' => 'Этот файл используется и не может быть удален',
'sf_ImpossibleToDeleteSoundFile' => 'Невозможно удалить звуковой файл',
'sf_CategoryCustom' => 'Пользовательские',
'sf_CategoryMOH' => 'Музыка на удержании',
'sf_CategorySystem' => 'Системные',
'sf_FilterByCategory' => 'Фильтр по категории',
'sf_AllCategories' => 'Все категории',
'sf_PlayFile' => 'Воспроизвести файл',
'sf_HeaderSoundFiles' => 'Звуковые файлы',
'sf_SubHeaderSoundFiles' => 'Управление аудиофайлами для IVR, музыки на удержании и пользовательских объявлений',
'sf_AddNewSoundFile' => 'Добавить звуковой файл',
'sf_EmptyTableTitle' => 'Звуковых файлов пока нет',
'sf_EmptyTableDescription' => 'Загрузите аудиофайлы для использования в IVR меню, очередях вызовов и других функциях АТС',
'sf_TabAudioFiles' => 'Аудиофайлы',
'sf_TabMusicOnHold' => 'Музыка на удержании',
'sf_MusicOnHoldInfo' => 'Настройки музыки на удержании',
'sf_MusicOnHoldDescription' => 'Настройте этот звуковой файл для использования в качестве музыки на удержании в очередях вызовов и при переводах.',
'sf_UseAsMusicOnHold' => 'Использовать как музыку на удержании',
'sf_Category' => 'Категория',
'sf_Name' => 'Название',
'sf_Description' => 'Описание',
'sf_AudioFile' => 'Аудиофайл',
'sf_YourBrowserDoesNotSupportAudio' => 'Ваш браузер не поддерживает элемент audio',
'sf_DropFileHereOrClick' => 'Перетащите аудиофайл сюда или нажмите для выбора',
'sf_SelectFile' => 'Выбрать файл',
'sf_Uploading' => 'Загрузка...',
'sf_UpdateSuccessful' => 'Звуковой файл успешно обновлен',
'sf_ColumnName' => 'Название',
'sf_ColumnCategory' => 'Категория',
'sf_ColumnSize' => 'Размер',
'sf_ColumnDuration' => 'Длительность',
```

### Stage 5: Build and Testing

#### 5.1 JavaScript Transpilation
```bash
# For core system files
docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/SoundFiles/sound-file-modify.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/SoundFiles/sound-files-index.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/PbxAPI/soundFilesAPI.js \
  core
```

#### 5.2 Important: Export IndexSoundPlayer

**Add to the end of file**: `sites/admin-cabinet/assets/js/src/SoundFiles/sound-files-index-player.js`
```javascript
// Export for use in other modules
window.IndexSoundPlayer = IndexSoundPlayer;
```

#### 5.3 PHPStan Check
```bash
# Check PHP code quality
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse /offload/rootfs/usr/www/src/PBXCoreREST/Lib/SoundFiles/
```

## New Files to Create

1. `src/PBXCoreREST/Lib/SoundFiles/GetRecordAction.php`
2. `src/PBXCoreREST/Lib/SoundFiles/GetListAction.php`
3. `src/PBXCoreREST/Lib/SoundFiles/SaveRecordAction.php`
4. `src/PBXCoreREST/Lib/SoundFiles/DataStructure.php`
5. `src/PBXCoreREST/Lib/SoundFiles/DeleteRecordAction.php`
6. `src/PBXCoreREST/Lib/SoundFiles/UploadFileAction.php`
7. `src/PBXCoreREST/Controllers/SoundFiles/GetController.php`
8. `src/PBXCoreREST/Controllers/SoundFiles/PostController.php`
9. `src/PBXCoreREST/Controllers/SoundFiles/PutController.php`
10. `src/PBXCoreREST/Controllers/SoundFiles/DeleteController.php`
11. `sites/admin-cabinet/assets/js/src/PbxAPI/soundFilesAPI.js`
12. `sites/admin-cabinet/assets/js/src/SoundFiles/sound-file-modify.js`

## Files to Modify

1. `src/PBXCoreREST/Lib/SoundFilesManagementProcessor.php`
2. `src/PBXCoreREST/Providers/RouterProvider.php`
3. `sites/admin-cabinet/assets/js/src/SoundFiles/sound-files-index.js`
4. `sites/admin-cabinet/assets/js/src/SoundFiles/sound-files-index-player.js` - Add export for IndexSoundPlayer class
5. `src/AdminCabinet/Controllers/SoundFilesController.php`
6. `src/AdminCabinet/Views/SoundFiles/index.volt`
7. `src/AdminCabinet/Views/SoundFiles/modify.volt`
8. `src/Common/Messages/ru.php`
9. `src/Common/Messages/en.php`
10. `src/AdminCabinet/Providers/AssetProvider.php`

## Expected Results

After implementing the plan, the sound files management system will:

- ✅ Use unified REST API architecture
- ✅ Support full CRUD functionality via REST API
- ✅ Provide two-level data sanitization
- ✅ Preserve existing two-tab interface (Custom/MOH)
- ✅ Use IndexSoundPlayer for audio playback with progress bars
- ✅ Keep existing file upload and merge functionality
- ✅ Integrate with existing Form.js mechanism
- ✅ Check file usage before deletion
- ✅ Support inline audio playback with duration display
- ✅ Preserve all existing UI/UX patterns
- ✅ Be ready for external integrations
- ✅ Comply with MikoPBX architectural principles
- ✅ Load data dynamically via REST API into Volt template structure

## Testing

### REST API Endpoints for Testing:
- `GET /pbxcore/api/v2/sound-files/getList` - sound files list
- `GET /pbxcore/api/v2/sound-files/getList?category=moh` - filtered list
- `GET /pbxcore/api/v2/sound-files/getRecord/new` - new file structure
- `GET /pbxcore/api/v2/sound-files/getRecord/{id}` - specific file
- `POST /pbxcore/api/v2/sound-files/saveRecord` - create file metadata
- `PUT /pbxcore/api/v2/sound-files/saveRecord/{id}` - update file metadata
- `DELETE /pbxcore/api/v2/sound-files/deleteRecord/{id}` - delete file
- `POST /pbxcore/api/v2/sound-files/uploadFile` - upload audio file

### Test Scenarios:
1. Upload new sound file
2. Edit sound file metadata
3. Delete sound file
4. Check file usage before deletion
5. Filter by category
6. Play audio files from list
7. Validate required fields
8. Update DataTable after operations
9. Test Resumable.js chunk upload
10. Display welcome message for empty table

### Debugging

If sound files table doesn't display correctly:

1. **Check browser console** for JavaScript errors
2. **Check Network tab** to view API responses:
   - API should return structure: `{result: true, data: [...], messages: {...}}`
   - Field `result` (not `success`) indicates operation success
3. **Check AssetProvider** - ensure DataTables and Resumable.js libraries are included
4. **Check access rights** - user must have rights to manage sound files
5. **Check file permissions** - ensure upload directory is writable