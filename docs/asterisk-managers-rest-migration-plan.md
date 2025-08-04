# MikoPBX Asterisk Managers (AMI Users) REST API Migration Plan

## Project Overview

This document contains a detailed plan for adapting the MikoPBX Asterisk Manager Interface (AMI) users management system to use a unified REST API architecture. The plan is based on the guide `docs/mikopbx-rest-migration-guide.md` and follows the principles of minimal changes to the user interface.

## Current State

### Existing Architecture
- **Model**: `src/Common/Models/AsteriskManagerUsers.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/AsteriskManagersController.php`
- **Form**: `src/AdminCabinet/Forms/AsteriskManagerEditForm.php`
- **No existing REST API**: Only traditional web controller actions
- **JavaScript**: Basic list functionality and form validation

### AsteriskManagerUsers Model Fields
```php
public $id;               // Primary key
public $username;         // AMI username
public $secret;           // AMI password
public $call;            // Call permission (read/write)
public $cdr;             // CDR permission (read/write)
public $originate;       // Originate permission (read/write)
public $reporting;       // Reporting permission (read/write)
public $agent;           // Agent permission (read/write)
public $config;          // Config permission (read/write)
public $dialplan;        // Dialplan permission (read/write)
public $dtmf;            // DTMF permission (read/write)
public $log;             // Log permission (read/write)
public $system;          // System permission (read/write)
public $user;            // User permission (read/write)
public $verbose;         // Verbose permission (read/write)
public $command;         // Command permission (read/write)
public $networkfilterid; // Network filter ID
public $description;     // Description
public $weakSecret;      // Weak password status (0/1/2)
```

### Model Relations
- `belongsTo` → `NetworkFilters` (by networkfilterid field)

### Special Features
- **Password Generation**: Automatic secure password generation
- **Permissions System**: Granular read/write permissions for 13 AMI actions
- **Network Filtering**: IP-based access control integration
- **Username Validation**: Real-time availability checking
- **Password Management**: Show/hide toggle, clipboard copy

## Detailed Implementation Plan

### Stage 1: Creating REST API Backend

#### 1.1 MikoPBX REST API Architecture

**Important**: In MikoPBX REST API architecture, Action classes are executed in Workers without HTTP context. Therefore, they should not inherit from Injectable and work with $this->request directly.

**Correct Flow**:
```
HTTP Request → Controller → Worker → Action → Database → Response
```

#### 1.2 Action Classes for Asterisk Managers

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/GetRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting AMI user record
 * 
 * @api {get} /pbxcore/api/v2/asterisk-managers/getRecord/:id Get AMI user record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup AsteriskManagers
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data AMI user data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.username AMI username
 * @apiSuccess {String} data.secret AMI password
 * @apiSuccess {Object} data.permissions Permission settings
 * @apiSuccess {String} data.networkfilterid Network filter ID
 * @apiSuccess {String} data.description Description
 */
class GetRecordAction
{
    /**
     * Get AMI user record
     * @param string|null $id - Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id) || $id === 'new') {
            // Create structure for new record
            $newUser = new AsteriskManagerUsers();
            $newUser->id = '';
            $newUser->username = '';
            $newUser->secret = AsteriskManagerUsers::generateAMIPassword();
            $newUser->networkfilterid = '';
            $newUser->description = '';
            $newUser->weakSecret = '0';
            
            // Initialize all permissions to empty
            $permissions = ['call', 'cdr', 'originate', 'reporting', 'agent', 
                          'config', 'dialplan', 'dtmf', 'log', 'system', 
                          'user', 'verbose', 'command'];
            foreach ($permissions as $perm) {
                $newUser->$perm = '';
            }
            
            $res->data = DataStructure::createFromModel($newUser);
            $res->success = true;
        } else {
            // Find existing record
            $user = AsteriskManagerUsers::findFirstById($id);
            
            if ($user) {
                $res->data = DataStructure::createFromModel($user);
                $res->success = true;
            } else {
                $res->messages['error'][] = 'AMI user not found';
            }
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/GetListAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all AMI users
 * 
 * @api {get} /pbxcore/api/v2/asterisk-managers/getList Get all AMI users
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup AsteriskManagers
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of AMI users
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.username AMI username
 * @apiSuccess {String} data.description Description
 * @apiSuccess {Object} data.permissions Permission summary
 * @apiSuccess {String} data.networkFilterName Network filter name
 */
class GetListAction
{
    /**
     * Get list of all AMI users
     * 
     * @param array $data - Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get all AMI users sorted by username
            $users = AsteriskManagerUsers::find([
                'order' => 'username ASC'
            ]);
            
            // Get network filters for display
            $networkFilters = [];
            $filters = NetworkFilters::find();
            foreach ($filters as $filter) {
                $networkFilters[$filter->id] = $filter->getRepresent();
            }
            
            $data = [];
            foreach ($users as $user) {
                $userData = DataStructure::createFromModel($user);
                
                // Add network filter name for display
                $userData['networkFilterName'] = $networkFilters[$user->networkfilterid] ?? '';
                
                $data[] = $userData;
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

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/SaveRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for saving AMI user record
 * 
 * @api {post} /pbxcore/api/v2/asterisk-managers/saveRecord Create AMI user
 * @api {put} /pbxcore/api/v2/asterisk-managers/saveRecord/:id Update AMI user
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup AsteriskManagers
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} username AMI username
 * @apiParam {String} secret AMI password
 * @apiParam {Object} permissions Permission settings (read/write for each action)
 * @apiParam {String} [networkfilterid] Network filter ID
 * @apiParam {String} [description] Description
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved AMI user data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction
{
    /**
     * Array of available permissions
     */
    private static array $permissionFields = [
        'call', 'cdr', 'originate', 'reporting', 'agent', 
        'config', 'dialplan', 'dtmf', 'log', 'system', 
        'user', 'verbose', 'command'
    ];
    
    /**
     * Save AMI user record
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
            'username' => 'string|regex:/^[a-zA-Z0-9_-]+$/|max:50',
            'secret' => 'string|min:8|max:100',
            'networkfilterid' => 'int|empty_to_null',
            'description' => 'string|html_escape|max:500|empty_to_null'
        ];
        
        // Add permission fields to sanitization rules
        foreach (self::$permissionFields as $field) {
            $sanitizationRules[$field . '_read'] = 'bool';
            $sanitizationRules[$field . '_write'] = 'bool';
        }
        
        $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);
        
        // Validate required fields
        $validationRules = [
            'username' => [
                ['type' => 'required', 'message' => 'AMI username is required'],
                ['type' => 'regex', 'pattern' => '/^[a-zA-Z0-9_-]+$/', 'message' => 'Username can only contain letters, numbers, hyphens and underscores']
            ],
            'secret' => [
                ['type' => 'required', 'message' => 'AMI password is required'],
                ['type' => 'minLength', 'value' => 8, 'message' => 'Password must be at least 8 characters long']
            ]
        ];
        $validationErrors = BaseActionHelper::validateData($data, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }
        
        // Get or create model
        if (!empty($data['id'])) {
            $user = AsteriskManagerUsers::findFirstById($data['id']);
            if (!$user) {
                $res->messages['error'][] = 'api_AMIUserNotFound';
                return $res;
            }
        } else {
            $user = new AsteriskManagerUsers();
        }
        
        // Check username uniqueness
        if (!BaseActionHelper::checkUniqueness(
            AsteriskManagerUsers::class,
            'username',
            $data['username'],
            $user->username
        )) {
            $res->messages['error'][] = 'Username already exists';
            return $res;
        }
        
        try {
            // Save in transaction using BaseActionHelper
            $savedUser = BaseActionHelper::executeInTransaction(function() use ($user, $data) {
                // Update basic fields
                $user->username = $data['username'];
                $user->secret = $data['secret'];
                $user->networkfilterid = $data['networkfilterid'] ?? '';
                $user->description = $data['description'] ?? '';
                $user->weakSecret = '0'; // Reset weak secret status when password is changed
                
                // Update permissions
                foreach (self::$permissionFields as $field) {
                    $permission = '';
                    if (!empty($data[$field . '_read'])) {
                        $permission .= 'read';
                    }
                    if (!empty($data[$field . '_write'])) {
                        $permission .= 'write';
                    }
                    $user->$field = $permission;
                }
                
                if (!$user->save()) {
                    throw new \Exception(implode(', ', $user->getMessages()));
                }
                
                return $user;
            });
            
            $res->data = DataStructure::createFromModel($savedUser);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "asterisk-managers/modify/{$savedUser->id}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
}
```

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/DataStructure.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

/**
 * Data structure for AMI users
 * 
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskManagers
 */
class DataStructure
{
    /**
     * Permission fields array
     */
    private static array $permissionFields = [
        'call', 'cdr', 'originate', 'reporting', 'agent', 
        'config', 'dialplan', 'dtmf', 'log', 'system', 
        'user', 'verbose', 'command'
    ];
    
    /**
     * Create data array from AsteriskManagerUsers model
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        $data = [
            'id' => (string)$model->id,
            'username' => $model->username,
            'secret' => $model->secret,
            'networkfilterid' => $model->networkfilterid ?? '',
            'description' => $model->description ?? '',
            'weakSecret' => $model->weakSecret ?? '0',
            'permissions' => []
        ];
        
        // Build permissions array
        foreach (self::$permissionFields as $field) {
            $value = $model->$field ?? '';
            $data['permissions'][$field] = [
                'read' => str_contains($value, 'read'),
                'write' => str_contains($value, 'write')
            ];
        }
        
        return $data;
    }
    
    /**
     * Get permission summary for list display
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array
     */
    public static function getPermissionSummary($model): array
    {
        $readCount = 0;
        $writeCount = 0;
        
        foreach (self::$permissionFields as $field) {
            $value = $model->$field ?? '';
            if (str_contains($value, 'read')) {
                $readCount++;
            }
            if (str_contains($value, 'write')) {
                $writeCount++;
            }
        }
        
        return [
            'readCount' => $readCount,
            'writeCount' => $writeCount,
            'totalFields' => count(self::$permissionFields)
        ];
    }
}
```

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/DeleteRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for deleting AMI user record
 * 
 * @api {delete} /pbxcore/api/v2/asterisk-managers/deleteRecord/:id Delete AMI user
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup AsteriskManagers
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
     * Delete AMI user record
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
            $user = AsteriskManagerUsers::findFirstById($id);
            
            if (!$user) {
                $res->messages['error'][] = 'api_AMIUserNotFound';
                return $res;
            }
            
            // Delete in transaction using BaseActionHelper
            BaseActionHelper::executeInTransaction(function() use ($user) {
                if (!$user->delete()) {
                    throw new \Exception('Failed to delete AMI user: ' . implode(', ', $user->getMessages()));
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

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/CheckUsernameAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for checking AMI username availability
 * 
 * @api {get} /pbxcore/api/v2/asterisk-managers/checkUsername/:username Check username availability
 * @apiVersion 2.0.0
 * @apiName CheckUsername
 * @apiGroup AsteriskManagers
 * 
 * @apiParam {String} username Username to check
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Check result
 * @apiSuccess {Boolean} data.available Whether username is available
 * @apiSuccess {String} [data.userId] ID of user with this username (if exists)
 */
class CheckUsernameAction
{
    /**
     * Check username availability
     * 
     * @param string $username - Username to check
     * @return PBXApiResult
     */
    public static function main(string $username): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($username)) {
            $res->messages['error'][] = 'Username is required';
            return $res;
        }
        
        try {
            $user = AsteriskManagerUsers::findFirst([
                'conditions' => 'username = :username:',
                'bind' => ['username' => $username]
            ]);
            
            if ($user) {
                $res->data = [
                    'available' => false,
                    'userId' => (string)$user->id
                ];
            } else {
                $res->data = [
                    'available' => true
                ];
            }
            
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/GeneratePasswordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for generating secure AMI password
 * 
 * @api {get} /pbxcore/api/v2/asterisk-managers/generatePassword Generate secure password
 * @apiVersion 2.0.0
 * @apiName GeneratePassword
 * @apiGroup AsteriskManagers
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Generated password
 * @apiSuccess {String} data.password New secure password
 */
class GeneratePasswordAction
{
    /**
     * Generate secure AMI password
     * 
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $password = AsteriskManagerUsers::generateAMIPassword();
            
            $res->data = ['password' => $password];
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

#### 1.3 REST API Controllers

**Updates to existing file**: `src/PBXCoreREST/Controllers/AsteriskManagers/GetController.php`

Create new file if doesn't exist:
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagersManagementProcessor;

/**
 * GET controller for AMI users management
 * 
 * @RoutePrefix("/pbxcore/api/v2/asterisk-managers")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/asterisk-managers/getRecord/123
 * curl http://127.0.0.1/pbxcore/api/v2/asterisk-managers/getRecord/new
 * curl http://127.0.0.1/pbxcore/api/v2/asterisk-managers/getList
 * curl http://127.0.0.1/pbxcore/api/v2/asterisk-managers/checkUsername/testuser
 * curl http://127.0.0.1/pbxcore/api/v2/asterisk-managers/generatePassword
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\AsteriskManagers
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get AMI user record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all AMI users
     * @Get("/getList")
     * 
     * Check username availability
     * @Get("/checkUsername/{username}")
     * 
     * Generate secure password
     * @Get("/generatePassword")
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
            AsteriskManagersManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
```

**New file**: `src/PBXCoreREST/Controllers/AsteriskManagers/PostController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagersManagementProcessor;

/**
 * POST controller for AMI users management
 * 
 * @RoutePrefix("/pbxcore/api/v2/asterisk-managers")
 * 
 * @examples
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/asterisk-managers/saveRecord \
 *   -d "username=testuser&secret=SecurePass123&call_read=1&call_write=1"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\AsteriskManagers
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates AMI user record
     * @Post("/saveRecord")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        
        $this->sendRequestToBackendWorker(
            AsteriskManagersManagementProcessor::class,
            $actionName,
            $postData
        );
    }
    
}

```

**New file**: `src/PBXCoreREST/Controllers/AsteriskManagers/PutController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagersManagementProcessor;

/**
 * PUT controller for AMI users management
 * 
 * @RoutePrefix("/pbxcore/api/v2/asterisk-managers")
 * 
 * @examples
 * curl -X PUT http://127.0.0.1/pbxcore/api/v2/asterisk-managers/saveRecord/123 \
 *   -d "username=updateduser&secret=NewSecurePass123"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\AsteriskManagers
 */
class PutController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id AMI user ID for update operations
     * 
     * Updates existing AMI user record
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
            AsteriskManagersManagementProcessor::class,
            $actionName,
            $putData
        );
    }
    
}
```

**New file**: `src/PBXCoreREST/Controllers/AsteriskManagers/DeleteController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagersManagementProcessor;

/**
 * DELETE controller for AMI users management
 * 
 * @RoutePrefix("/pbxcore/api/v2/asterisk-managers")
 * 
 * @examples
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v2/asterisk-managers/deleteRecord/123
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\AsteriskManagers
 */
class DeleteController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id AMI user ID to delete
     * 
     * Deletes AMI user record
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
            AsteriskManagersManagementProcessor::class,
            $actionName,
            $deleteData
        );
    }
    
}
```

#### 1.4 Create or Update Processor

**New file**: `src/PBXCoreREST/Lib/AsteriskManagersManagementProcessor.php`

```php
<?php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\AsteriskManagers\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction,
    CheckUsernameAction,
    GeneratePasswordAction
};
use Phalcon\Di\Injectable;

/**
 * AMI users management processor
 *
 * Handles all AMI user management operations including:
 * - getRecord: Get single AMI user by ID or create new structure
 * - getList: Get list of all AMI users
 * - saveRecord: Create or update AMI user
 * - deleteRecord: Delete AMI user
 * - checkUsername: Check username availability
 * - generatePassword: Generate secure password
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class AsteriskManagersManagementProcessor extends Injectable
{
    /**
     * Processes AMI user management requests
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
                
            case 'checkUsername':
                if (!empty($data['id'])) {
                    // ID contains username when called from route parameter
                    $res = CheckUsernameAction::main($data['id']);
                } else {
                    $res->messages['error'][] = 'Username is required';
                }
                break;
                
            case 'generatePassword':
                $res = GeneratePasswordAction::main();
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
use AsteriskManagers\GetController as AsteriskManagersGetController,
    AsteriskManagers\PostController as AsteriskManagersPostController,
    AsteriskManagers\PutController as AsteriskManagersPutController,
    AsteriskManagers\DeleteController as AsteriskManagersDeleteController;
```

Add to routes array:
```php
// GET routes
[
    AsteriskManagersGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/asterisk-managers/{actionName}', 
    'get', 
    '/'
],
[
    AsteriskManagersGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/asterisk-managers/{actionName}/{id:[a-zA-Z0-9_\\-]+}', 
    'get', 
    '/'
],
// POST route
[
    AsteriskManagersPostController::class, 
    'callAction', 
    '/pbxcore/api/v2/asterisk-managers/{actionName}', 
    'post', 
    '/'
],
// PUT route
[
    AsteriskManagersPutController::class, 
    'callAction', 
    '/pbxcore/api/v2/asterisk-managers/{actionName}/{id:[0-9]+}', 
    'put', 
    '/'
],
// DELETE route
[
    AsteriskManagersDeleteController::class, 
    'callAction', 
    '/pbxcore/api/v2/asterisk-managers/{actionName}/{id:[0-9]+}', 
    'delete', 
    '/'
],
```

### Stage 2: Update JavaScript Client

#### 2.1 Create API Methods

**New file**: `sites/admin-cabinet/assets/js/src/PbxAPI/asteriskManagersAPI.js`

```javascript
//<Copyright>

/* global globalRootUrl, PbxApi, globalTranslate */

/**
 * AsteriskManagersAPI - REST API for AMI users management
 * 
 * Uses unified approach with centralized endpoint definitions.
 * This provides:
 * - Single point of API URL management
 * - Easy API version switching (v2 -> v3)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
const AsteriskManagersAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/asterisk-managers/`,
    
    // Endpoint definitions for unification
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/asterisk-managers/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/asterisk-managers/getRecord`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/asterisk-managers/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/asterisk-managers/deleteRecord`,
        checkUsername: `${Config.pbxUrl}/pbxcore/api/v2/asterisk-managers/checkUsername`,
        generatePassword: `${Config.pbxUrl}/pbxcore/api/v2/asterisk-managers/generatePassword`
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
     * Check username availability
     * @param {string} username - Username to check
     * @param {function} callback - Callback function
     */
    checkUsername(username, callback) {
        $.api({
            url: `${this.endpoints.checkUsername}/${username}`,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, data: {available: false}});
            }
        });
    },
    
    /**
     * Generate secure password
     * @param {function} callback - Callback function
     */
    generatePassword(callback) {
        $.api({
            url: this.endpoints.generatePassword,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, data: {password: ''}});
            }
        });
    }
};
```

#### 2.2 Form Edit Module

**Update file**: `sites/admin-cabinet/assets/js/src/AsteriskManagers/manager-modify.js`

Replace content with:
```javascript
//<Copyright>

/* global globalRootUrl, globalTranslate, Form, AsteriskManagersAPI, UserMessage, ClipboardJS */

/**
 * AMI user edit form management module
 */
const asteriskManagerModify = {
    $formObj: $('#save-ami-form'),
    $dropDowns: $('#save-ami-form .ui.dropdown'),
    $allCheckBoxes: $('#save-ami-form .list .checkbox'),
    $unCheckButton: $('.uncheck.button'),
    $username: $('#username'),
    $secret: $('#secret'),
    originalName: '',
    
    /**
     * Form validation rules
     */
    validateRules: {
        username: {
            identifier: 'username',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.am_ValidationAMINameIsEmpty,
                },
                {
                    type: 'existRule[username-error]',
                    prompt: globalTranslate.am_ErrorThisUsernameInNotAvailable,
                },
            ],
        },
        secret: {
            identifier: 'secret',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.am_ValidationAMISecretIsEmpty,
                },
                {
                    type: 'minLength[8]',
                    prompt: globalTranslate.am_ValidationPasswordMinLength,
                },
            ],
        },
    },
    
    /**
     * Module initialization
     */
    initialize() {
        // Initialize dropdowns
        asteriskManagerModify.$dropDowns.dropdown();

        // Handle uncheck button click
        asteriskManagerModify.$unCheckButton.on('click', (e) => {
            e.preventDefault();
            asteriskManagerModify.$allCheckBoxes.checkbox('uncheck');
        });

        // Handle username change
        asteriskManagerModify.$username.on('change', () => {
            const userId = asteriskManagerModify.$formObj.form('get value', 'id');
            const newValue = asteriskManagerModify.$formObj.form('get value', 'username');
            asteriskManagerModify.checkAvailability(asteriskManagerModify.originalName, newValue, 'username', userId);
        });

        // Handle generate new password button
        $('#generate-new-password').on('click', (e) => {
            e.preventDefault();
            asteriskManagerModify.generateNewPassword();
        });

        // Show/hide password toggle
        $('#show-hide-password').on('click', (e) => {
            e.preventDefault();
            const $button = $(e.currentTarget);
            const $icon = $button.find('i');
            
            if (asteriskManagerModify.$secret.attr('type') === 'password') {
                asteriskManagerModify.$secret.attr('type', 'text');
                $icon.removeClass('eye').addClass('eye slash');
            } else {
                asteriskManagerModify.$secret.attr('type', 'password');
                $icon.removeClass('eye slash').addClass('eye');
            }
        });

        // Initialize clipboard for password copy
        const clipboard = new ClipboardJS('.clipboard');
        $('.clipboard').popup({
            on: 'manual',
        });

        clipboard.on('success', (e) => {
            $(e.trigger).popup('show');
            setTimeout(() => {
                $(e.trigger).popup('hide');
            }, 1500);
            e.clearSelection();
        });

        clipboard.on('error', (e) => {
            console.error('Action:', e.action);
            console.error('Trigger:', e.trigger);
        });

        // Prevent browser password manager for generated passwords
        asteriskManagerModify.$secret.on('focus', function() {
            $(this).attr('autocomplete', 'new-password');
        });

        // Initialize popups
        $('.popuped').popup();
        
        // Configure Form.js
        Form.$formObj = asteriskManagerModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = asteriskManagerModify.validateRules;
        Form.cbBeforeSendForm = asteriskManagerModify.cbBeforeSendForm;
        Form.cbAfterSendForm = asteriskManagerModify.cbAfterSendForm;
        
        // Setup REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = AsteriskManagersAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}asterisk-managers/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}asterisk-managers/modify/`;
        
        // Initialize Form with all standard features
        Form.initialize();
        
        // Load form data
        asteriskManagerModify.initializeForm();
    },
    
    /**
     * Load data into form
     */
    initializeForm() {
        const recordId = asteriskManagerModify.getRecordId();
        
        AsteriskManagersAPI.getRecord(recordId, (response) => {
            if (response.result) {
                asteriskManagerModify.populateForm(response.data);
                asteriskManagerModify.originalName = response.data.username || '';
                
                // Generate new password if empty
                if (!response.data.secret && recordId === '') {
                    asteriskManagerModify.generateNewPassword();
                }
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load AMI user data');
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
     * Populate form with data
     */
    populateForm(data) {
        // Set basic fields
        Form.$formObj.form('set values', {
            id: data.id,
            username: data.username,
            secret: data.secret,
            networkfilterid: data.networkfilterid || 'none',
            description: data.description || ''
        });
        
        // Set permission checkboxes
        if (data.permissions) {
            Object.keys(data.permissions).forEach(field => {
                const perm = data.permissions[field];
                if (perm.read) {
                    $(`#${field}_read`).checkbox('set checked');
                }
                if (perm.write) {
                    $(`#${field}_write`).checkbox('set checked');
                }
            });
        }
        
        // Update clipboard button
        $('.clipboard').attr('data-clipboard-text', data.secret);
        
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    },
    
    /**
     * Checks if the username doesn't exist in the database
     */
    checkAvailability(oldName, newName, cssClassName = 'username', userId = '') {
        if (oldName === newName) {
            $(`.ui.input.${cssClassName}`).parent().removeClass('error');
            $(`#${cssClassName}-error`).addClass('hidden');
            return;
        }
        
        AsteriskManagersAPI.checkUsername(newName, (response) => {
            if (response.result && response.data) {
                if (response.data.available) {
                    $(`.ui.input.${cssClassName}`).parent().removeClass('error');
                    $(`#${cssClassName}-error`).addClass('hidden');
                } else if (userId.length > 0 && response.data.userId === userId) {
                    $(`.ui.input.${cssClassName}`).parent().removeClass('error');
                    $(`#${cssClassName}-error`).addClass('hidden');
                } else {
                    $(`.ui.input.${cssClassName}`).parent().addClass('error');
                    $(`#${cssClassName}-error`).removeClass('hidden');
                }
            }
        });
    },
    
    /**
     * Generate a new AMI password
     */
    generateNewPassword() {
        AsteriskManagersAPI.generatePassword((response) => {
            if (response.result && response.data && response.data.password) {
                asteriskManagerModify.$formObj.form('set value', 'secret', response.data.password);
                // Update clipboard button attribute
                $('.clipboard').attr('data-clipboard-text', response.data.password);
                // Trigger form change to enable save button
                Form.dataChanged();
            } else {
                UserMessage.showError(globalTranslate.am_ErrorGeneratingPassword);
            }
        });
    },
    
    /**
     * Callback before form submission
     */
    cbBeforeSendForm(settings) {
        const data = asteriskManagerModify.$formObj.form('get values');
        
        // Process permission checkboxes
        const permissions = ['call', 'cdr', 'originate', 'reporting', 'agent', 
                           'config', 'dialplan', 'dtmf', 'log', 'system', 
                           'user', 'verbose', 'command'];
        
        permissions.forEach(field => {
            data[`${field}_read`] = $(`#${field}_read`).checkbox('is checked');
            data[`${field}_write`] = $(`#${field}_write`).checkbox('is checked');
        });
        
        return data;
    },
    
    /**
     * Callback after form submission
     */
    cbAfterSendForm(response) {
        if (response.result) {
            if (response.data) {
                asteriskManagerModify.populateForm(response.data);
                asteriskManagerModify.originalName = response.data.username || '';
            }
            
            // Update URL for new records
            const currentId = $('#id').val();
            if (!currentId && response.data && response.data.id) {
                const newUrl = window.location.href.replace(/modify\/?$/, `modify/${response.data.id}`);
                window.history.pushState(null, '', newUrl);
            }
        }
    },
};

// Custom form validation rule for checking uniqueness of username
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    asteriskManagerModify.initialize();
});

```

#### 2.3 Update List Module

**Update file**: `sites/admin-cabinet/assets/js/src/AsteriskManagers/managers-index.js`

Replace content with:
```javascript
//<Copyright>

/* global globalRootUrl, AsteriskManagersAPI, globalTranslate, UserMessage, SemanticLocalization */

/**
 * AMI users table management module
 */
const asteriskManagersTable = {
    $managersTable: $('#ami-users-table'),
    dataTable: {},

    /**
     * Initialize the module
     */
    initialize() {
        // Initially show placeholder until data loads
        asteriskManagersTable.toggleEmptyPlaceholder(true);
        
        asteriskManagersTable.initializeDataTable();
    },
    
    /**
     * Initialize DataTable
     */
    initializeDataTable() {
        asteriskManagersTable.dataTable = asteriskManagersTable.$managersTable.DataTable({
            ajax: {
                url: AsteriskManagersAPI.endpoints.getList,
                dataSrc: function(json) {                    
                    // Manage empty state
                    asteriskManagersTable.toggleEmptyPlaceholder(
                        !json.result || !json.data || json.data.length === 0
                    );
                    return json.result ? json.data : [];
                }
            },
            columns: [
                {
                    data: 'username',
                    render: function(data, type, row) {
                        return `<i class="user circle icon"></i> <strong>${data}</strong>`;
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
                    data: 'permissions',
                    className: 'center aligned',
                    responsivePriority: 2,
                    render: function(data) {
                        let readCount = 0;
                        let writeCount = 0;
                        const totalFields = Object.keys(data).length;
                        
                        Object.values(data).forEach(perm => {
                            if (perm.read) readCount++;
                            if (perm.write) writeCount++;
                        });
                        
                        const readLabel = readCount > 0 ? 
                            `<div class="ui tiny green label">${globalTranslate.am_ReadLabel}: ${readCount}/${totalFields}</div>` : '';
                        const writeLabel = writeCount > 0 ? 
                            `<div class="ui tiny orange label">${globalTranslate.am_WriteLabel}: ${writeCount}/${totalFields}</div>` : '';
                        
                        return readLabel + writeLabel;
                    }
                },
                {
                    data: 'networkFilterName',
                    className: 'hide-on-mobile',
                    responsivePriority: 4,
                    render: function(data) {
                        return data || globalTranslate.ex_NoNetworkFilter;
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
                            <a href="${globalRootUrl}asterisk-managers/modify/${row.id}" 
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
            searching: true,
            paging: false,
            info: false,
            language: SemanticLocalization.dataTableLocalisation,
            drawCallback: function() {
                console.log('DataTable drawCallback triggered'); // Debug log
                
                // Initialize Semantic UI elements
                asteriskManagersTable.$managersTable.find('.popuped').popup();
                
                // Double-click for editing
                asteriskManagersTable.initializeDoubleClickEdit();
            }
        });
        
        // Handle deletion using DeleteSomething.js
        asteriskManagersTable.$managersTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const userId = $button.attr('data-value');
            
            // Add loading indicator and disable button
            $button.addClass('loading disabled');
            
            AsteriskManagersAPI.deleteRecord(userId, asteriskManagersTable.cbAfterDeleteRecord);
        });
    },
    
    /**
     * Callback after record deletion
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Reload table
            asteriskManagersTable.dataTable.ajax.reload();
            
            UserMessage.showSuccess(globalTranslate.am_AMIUserDeleted);
        } else {
            UserMessage.showError(
                response.messages?.error || 
                globalTranslate.am_ImpossibleToDeleteAMIUser
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
            $('#ami-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-button').show();
            $('#ami-table-container').show();
        }
    },
    
    /**
     * Initialize double-click for editing
     */
    initializeDoubleClickEdit() {
        asteriskManagersTable.$managersTable.on('dblclick', 'tbody td:not(.action-buttons)', function() {
            const data = asteriskManagersTable.dataTable.row(this).data();
            if (data && data.id) {
                window.location = `${globalRootUrl}asterisk-managers/modify/${data.id}`;
            }
        });
    }
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    asteriskManagersTable.initialize();
});

```

#### 2.4 Update Volt Templates

**Update file**: `src/AdminCabinet/Views/AsteriskManagers/index.volt`

Replace content with:
```volt
<div id="add-new-button">
    {% if isAllowed('save') %}
        {{ link_to("asterisk-managers/modify", '<i class="add circle icon"></i> '~t._('am_AddNewManagerUser'), "class": "ui blue button") }}
    {% endif %}
</div>

<div id="ami-table-container">
    <table class="ui selectable compact unstackable table" id="ami-users-table">
        <thead>
            <tr>
                <th>{{ t._('am_ColumnUsername') }}</th>
                <th class="hide-on-mobile">{{ t._('am_ColumnDescription') }}</th>
                <th>{{ t._('am_ColumnPermissions') }}</th>
                <th class="hide-on-mobile">{{ t._('am_ColumnNetworkFilter') }}</th>
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
        'icon': 'key',
        'title': t._('am_EmptyTableTitle'),
        'description': t._('am_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('am_AddNewManagerUser'),
        'addButtonLink': 'asterisk-managers/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/ami-users'
    ]) }}
</div>

```

### Stage 3: AdminCabinet Adaptation

**Update file**: `src/AdminCabinet/Controllers/AsteriskManagersController.php`

Replace content with:
```php
<?php
//<Copyright>

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\AsteriskManagerEditForm;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;

class AsteriskManagersController extends BaseController
{

    private array $arrCheckBoxes;

    /**
     * Base class initialization
     */
    public function initialize(): void
    {
        $this->arrCheckBoxes = [
            'call',
            'cdr',
            'originate',
            'reporting',
            'agent',
            'config',
            'dialplan',
            'dtmf',
            'log',
            'system',
            'user',
            'verbose',
            'command'
        ];
        parent::initialize();
    }

    /**
     * Build the list of AMI users.
     */
    public function indexAction(): void
    {
        // The data will load by DataTable AJAX
    }


    /**
     * Edit AMI user details.
     *
     * @param string|null $id The ID of the AMI user.
     */
    public function modifyAction(string $id = ''): void
    {
        // Get data via REST API
        $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/v2/asterisk-managers/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            ['id' => $id]
        ]);
        
        if (!$restAnswer->success) {
            $this->flash->error(json_encode($restAnswer->messages));
            $this->dispatcher->forward([
                'controller' => 'asterisk-managers',
                'action' => 'index'
            ]);
            return;
        }
        
        $getRecordStructure = (object)$restAnswer->data;
        
        // Prepare network filters
        $arrNetworkFilters = [];
        $networkFilters = NetworkFilters::getAllowedFiltersForType(
            [
                'AJAM',
                'AMI',
            ]
        );
        $arrNetworkFilters['none'] = $this->translation->_('ex_NoNetworkFilter');
        foreach ($networkFilters as $filter) {
            $arrNetworkFilters[$filter->id] = $filter->getRepresent();
        }
        
        // Convert permissions structure to match form expectations
        if (isset($getRecordStructure->permissions)) {
            foreach ($getRecordStructure->permissions as $field => $perms) {
                $value = '';
                if ($perms->read ?? false) {
                    $value .= 'read';
                }
                if ($perms->write ?? false) {
                    $value .= 'write';
                }
                $getRecordStructure->$field = $value;
            }
        }
        
        // Create form based on API data structure
        $this->view->form = new AsteriskManagerEditForm(
            $getRecordStructure,
            [
                'network_filters'     => $arrNetworkFilters,
                'array_of_checkboxes' => $this->arrCheckBoxes,
            ]
        );

        $this->view->setVar('arrCheckBoxes', $this->arrCheckBoxes);
        $this->view->setVar('represent', $getRecordStructure->username ?: '');
    }
}

```

### Stage 4: Update AssetProvider

**Update file**: `src/AdminCabinet/Providers/AssetProvider.php`

Add method for Asterisk Managers assets:

```php
private function makeAsteriskManagersAssets(string $action): void
{
    if ($action === 'index') {
        // DataTables for AMI users list
        $this->headerCollectionCSS
            ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
        $this->footerCollectionJS
            ->addJs('js/vendor/datatable/dataTables.semanticui.js', true);

        // Main page module
        $this->footerCollectionJS     
            ->addJs('js/pbx/PbxAPI/asteriskManagersAPI.js', true)
            ->addJs('js/pbx/AsteriskManagers/managers-index.js', true);
    } elseif ($action === 'modify') {
        // Clipboard.js for password copy
        $this->footerCollectionJS
            ->addJs('js/vendor/clipboard/clipboard.min.js', true);
            
        $this->footerCollectionJS
            // Edit module
            ->addJs('js/pbx/main/form.js', true)
            ->addJs('js/pbx/PbxAPI/asteriskManagersAPI.js', true)
            ->addJs('js/pbx/AsteriskManagers/manager-modify.js', true);
    }
}
```

### Stage 5: Translations

**Add to file**: `src/Common/Messages/en.php`
```php
'am_ValidationPasswordMinLength' => 'Password must be at least 8 characters long',
'am_ErrorGeneratingPassword' => 'Error generating password',
'am_AMIUserDeleted' => 'AMI user deleted successfully',
'am_ImpossibleToDeleteAMIUser' => 'Failed to delete AMI user',
'am_ReadLabel' => 'Read',
'am_WriteLabel' => 'Write',
'am_ColumnPermissions' => 'Permissions',
'am_ColumnNetworkFilter' => 'Network Filter',
'am_EmptyTableTitle' => 'No AMI Users Yet',
'am_EmptyTableDescription' => 'AMI users allow external applications to connect to Asterisk Manager Interface',
```

**Add to file**: `src/Common/Messages/ru.php`
```php
'am_ValidationPasswordMinLength' => 'Пароль должен быть не менее 8 символов',
'am_ErrorGeneratingPassword' => 'Ошибка генерации пароля',
'am_AMIUserDeleted' => 'Пользователь AMI успешно удален',
'am_ImpossibleToDeleteAMIUser' => 'Не удалось удалить пользователя AMI',
'am_ReadLabel' => 'Чтение',
'am_WriteLabel' => 'Запись',
'am_ColumnPermissions' => 'Права доступа',
'am_ColumnNetworkFilter' => 'Сетевой фильтр',
'am_EmptyTableTitle' => 'Пользователи AMI отсутствуют',
'am_EmptyTableDescription' => 'Пользователи AMI позволяют внешним приложениям подключаться к Asterisk Manager Interface',
```

### Stage 6: Build and Testing

#### 6.1 JavaScript Transpilation
```bash
# For core system files
docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/AsteriskManagers/manager-modify.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/AsteriskManagers/managers-index.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/PbxAPI/asteriskManagersAPI.js \
  core
```

#### 6.2 PHPStan Check
```bash
# Check PHP code quality
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse /offload/rootfs/usr/www/src/PBXCoreREST/Lib/AsteriskManagers/
```

## New Files to Create

1. `src/PBXCoreREST/Lib/AsteriskManagers/GetRecordAction.php`
2. `src/PBXCoreREST/Lib/AsteriskManagers/GetListAction.php`
3. `src/PBXCoreREST/Lib/AsteriskManagers/SaveRecordAction.php`
4. `src/PBXCoreREST/Lib/AsteriskManagers/DataStructure.php`
5. `src/PBXCoreREST/Lib/AsteriskManagers/DeleteRecordAction.php`
6. `src/PBXCoreREST/Lib/AsteriskManagers/CheckUsernameAction.php`
7. `src/PBXCoreREST/Lib/AsteriskManagers/GeneratePasswordAction.php`
8. `src/PBXCoreREST/Lib/AsteriskManagersManagementProcessor.php`
9. `src/PBXCoreREST/Controllers/AsteriskManagers/GetController.php`
10. `src/PBXCoreREST/Controllers/AsteriskManagers/PostController.php`
11. `src/PBXCoreREST/Controllers/AsteriskManagers/PutController.php`
12. `src/PBXCoreREST/Controllers/AsteriskManagers/DeleteController.php`
13. `sites/admin-cabinet/assets/js/src/PbxAPI/asteriskManagersAPI.js`

## Files to Modify

1. `src/PBXCoreREST/Providers/RouterProvider.php`
2. `sites/admin-cabinet/assets/js/src/AsteriskManagers/manager-modify.js`
3. `sites/admin-cabinet/assets/js/src/AsteriskManagers/managers-index.js`
4. `src/AdminCabinet/Controllers/AsteriskManagersController.php`
5. `src/AdminCabinet/Views/AsteriskManagers/index.volt`
6. `src/Common/Messages/en.php`
7. `src/Common/Messages/ru.php`
8. `src/AdminCabinet/Providers/AssetProvider.php`

## Expected Results

After implementing the plan, the AMI users management system will:

- ✅ Use unified REST API architecture
- ✅ Support full CRUD functionality via REST API
- ✅ Provide two-level data sanitization
- ✅ Use DataTable for list display with permissions summary
- ✅ Integrate with existing Form.js mechanism
- ✅ Preserve all existing UI/UX patterns
- ✅ Support username availability checking
- ✅ Support secure password generation
- ✅ Display permission summary in list view
- ✅ Be ready for external integrations
- ✅ Comply with MikoPBX architectural principles

## Testing

### REST API Endpoints for Testing:
- `GET /pbxcore/api/v2/asterisk-managers/getList` - AMI users list
- `GET /pbxcore/api/v2/asterisk-managers/getRecord/new` - new user structure
- `GET /pbxcore/api/v2/asterisk-managers/getRecord/{id}` - specific user
- `POST /pbxcore/api/v2/asterisk-managers/saveRecord` - create user
- `PUT /pbxcore/api/v2/asterisk-managers/saveRecord/{id}` - update user
- `DELETE /pbxcore/api/v2/asterisk-managers/deleteRecord/{id}` - delete user
- `GET /pbxcore/api/v2/asterisk-managers/checkUsername/{username}` - check username
- `GET /pbxcore/api/v2/asterisk-managers/generatePassword` - generate password

### Test Scenarios:
1. Create new AMI user
2. Edit existing AMI user
3. Delete AMI user
4. Validate required fields
5. Check username uniqueness
6. Generate secure password
7. Test permission checkboxes
8. Update DataTable after operations
9. Save form state and URL
10. Display welcome message for empty table
11. Password show/hide toggle
12. Password clipboard copy

## Key Differences from Conference Rooms

1. **Complex Permissions System**: 13 permission fields with read/write flags
2. **Password Management**: Generation, show/hide, clipboard functionality
3. **Username Validation**: Real-time availability checking
4. **Network Filters**: Integration with IP access control
5. **No Extension Relationship**: AMI users don't have associated extensions
6. **Permission Summary**: Visual representation in list view

## Security Considerations

1. **Password Generation**: Uses secure random generation
2. **Password Length**: Minimum 8 characters enforced
3. **Username Format**: Letters, numbers, hyphens, underscores only
4. **Network Filtering**: IP-based access control
5. **Sanitization**: All inputs are sanitized and validated
6. **No Plain Text Storage**: Passwords stored securely in database

## Performance Optimizations

1. **DataTable AJAX**: Load data on demand
2. **Minimal Initial Load**: Empty table until data fetched
3. **Efficient Permission Display**: Summary instead of full list
4. **Lazy Network Filter Loading**: Only load when needed
5. **Debounced Username Check**: Avoid excessive API calls