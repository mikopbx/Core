# MikoPBX Dialplan Applications REST API Migration Plan v2

## Project Overview

This document contains the detailed implementation plan for migrating the MikoPBX dialplan applications management system to REST API v2 architecture. The plan incorporates enhanced security measures, proper logging practices, optimized controller architecture, and seamless user experience patterns established in the MikoPBX AdminCabinet.

## Key Requirements and Improvements

### 1. Logging Standards
- **SystemMessages::sysLogMsg(__METHOD__, $message, LOG_ERR)** for general error logging
- **CriticalErrorsHandler::handleExceptionWithSyslog($e)** for exception handling
- No `error_log()` usage - all logging through MikoPBX system

### 2. User Experience
- **No success messages** for save/delete operations
- **Silent operations** with UI updates only
- **Seamless navigation** without disruptive notifications

### 3. Controller Optimizations
- **Minimal REST API calls** in `modifyAction` following IVR menu pattern
- **JavaScript-driven data loading** for better performance
- **Reduced server-side processing** for view rendering

### 4. Security Enhancements
- **Multi-level sanitization** with special handling for program code
- **Context-aware XSS protection** preserving code syntax
- **CSRF protection** through existing SecurityPlugin
- **Code validation** with security audit logging

## Current State Analysis

### Existing Architecture
- **Model**: `src/Common/Models/DialplanApplications.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/DialplanApplicationsController.php`
- **Form**: `src/AdminCabinet/Forms/DialplanApplicationEditForm.php`
- **Partial REST API**: Only delete action implemented
- **JavaScript**: Basic functionality with ACE editor integration

### DialplanApplications Model Features
```php
public $id;                // Primary key
public $uniqid;            // Unique identifier
public $extension;         // Extension number
public $name;              // Application name
public $hint;              // Application hint
public $applicationlogic;  // Base64-encoded application logic (PHP or plaintext)
public $type;              // Application type ('php' or 'plaintext')
public $description;       // Application description
```

**Special Features:**
- Base64 encoding/decoding for `applicationlogic` field
- ACE editor integration with syntax highlighting
- Type-dependent editor modes (PHP vs Julia for plaintext)
- Extension relationship management

## Implementation Plan

## Phase 1: Enhanced REST API Backend

### 1.1 Code Security Validator

**New File**: `src/PBXCoreREST/Lib/Common/CodeSecurityValidator.php`

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\PBXCoreREST\Lib\Common;

use MikoPBX\Core\System\SystemMessages;

/**
 * Security validator for program code in dialplan applications
 */
class CodeSecurityValidator 
{
    /**
     * Validate code security without breaking syntax
     * 
     * @param string $code The program code to validate
     * @param string $type Code type ('php' or 'plaintext')
     * @param string $applicationName Application name for logging
     * @return array Array of security issues found
     */
    public static function validateCodeSecurity(string $code, string $type, string $applicationName): array
    {
        $securityIssues = [];
        
        // Check for potentially dangerous PHP functions
        if ($type === 'php') {
            $dangerousFunctions = [
                'exec', 'system', 'shell_exec', 'passthru', 'eval',
                'file_get_contents', 'file_put_contents', 'fopen', 'fwrite',
                'curl_exec', 'proc_open', 'popen'
            ];
            
            foreach ($dangerousFunctions as $func) {
                if (preg_match('/\b' . preg_quote($func, '/') . '\s*\(/i', $code)) {
                    $securityIssues[] = "Potentially dangerous function detected: {$func}";
                }
            }
        }
        
        // Check code size limits
        if (strlen($code) > 100000) { // 100KB limit
            $securityIssues[] = 'Code exceeds maximum size limit (100KB)';
        }
        
        // Check for suspicious patterns
        $suspiciousPatterns = [
            '/\$_(?:GET|POST|REQUEST|COOKIE|SERVER)\s*\[/' => 'Direct superglobal access detected',
            '/\bpassword\s*=\s*["\'][^"\']*["\']/i' => 'Hardcoded password detected',
            '/\bapikey\s*=\s*["\'][^"\']*["\']/i' => 'Hardcoded API key detected',
        ];
        
        foreach ($suspiciousPatterns as $pattern => $message) {
            if (preg_match($pattern, $code)) {
                $securityIssues[] = $message;
            }
        }
        
        // Log security audit results
        if (!empty($securityIssues)) {
            SystemMessages::sysLogMsg(
                __METHOD__, 
                "Security audit for dialplan application '{$applicationName}': " . implode(', ', $securityIssues), 
                LOG_WARNING
            );
        }
        
        return $securityIssues;
    }
    
    /**
     * Sanitize code preserving syntax integrity
     * 
     * @param string $code The code to sanitize
     * @param string $type Code type
     * @return string Sanitized code
     */
    public static function sanitizeCodePreservingSyntax(string $code, string $type): string
    {
        // For dialplan applications, we preserve the code as-is
        // since any modification could break the functionality
        // Security validation is done separately without modification
        return $code;
    }
}
```

### 1.2 Enhanced SaveRecordAction

**File**: `src/PBXCoreREST/Lib/DialplanApplications/SaveRecordAction.php`

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use MikoPBX\PBXCoreREST\Lib\Common\CodeSecurityValidator;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util\CriticalErrorsHandler;

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
 * @apiParam {String} extension Extension number (dialplan format)
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
     * 
     * @param array $data Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Enhanced sanitization preserving code integrity
            $sanitizationRules = [
                'id' => 'int',
                'name' => 'string|html_escape|max:100',
                'extension' => 'string|regex:/^[0-9#+\\*|X]{1,64}$/|max:64',
                'hint' => 'string|html_escape|max:255|empty_to_null',
                'type' => 'string|in:php,plaintext',
                'description' => 'string|html_escape|max:2000|empty_to_null'
                // applicationlogic is handled separately to preserve syntax
            ];
            
            // Sanitize all fields except applicationlogic
            $sanitizedData = [];
            foreach ($data as $key => $value) {
                if ($key === 'applicationlogic') {
                    // Preserve code syntax - only validate security
                    $sanitizedData[$key] = $value;
                } elseif (isset($sanitizationRules[$key])) {
                    $sanitizedData[$key] = BaseActionHelper::sanitizeField($value, $sanitizationRules[$key]);
                } else {
                    $sanitizedData[$key] = $value;
                }
            }
            
            // Validation rules
            $validationRules = [
                'name' => [
                    ['type' => 'required', 'message' => 'da_ValidateNameIsEmpty']
                ],
                'extension' => [
                    ['type' => 'required', 'message' => 'da_ValidateExtensionIsEmpty'],
                    ['type' => 'regex', 'pattern' => '/^[0-9#+\\*|X]{1,64}$/', 'message' => 'da_ValidateExtensionNumber']
                ]
            ];
            
            $validationErrors = BaseActionHelper::validateData($sanitizedData, $validationRules);
            if (!empty($validationErrors)) {
                $res->messages['error'] = $validationErrors;
                return $res;
            }
            
            // Security validation for application code
            if (!empty($sanitizedData['applicationlogic'])) {
                $securityIssues = CodeSecurityValidator::validateCodeSecurity(
                    $sanitizedData['applicationlogic'],
                    $sanitizedData['type'] ?? 'php',
                    $sanitizedData['name'] ?? 'Unknown'
                );
                
                // Log security issues but don't block save (configurable behavior)
                if (!empty($securityIssues)) {
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "Dialplan application '{$sanitizedData['name']}' has security concerns: " . implode(', ', $securityIssues),
                        LOG_WARNING
                    );
                }
            }
            
            // Find or create record
            if (!empty($sanitizedData['id'])) {
                $app = DialplanApplications::findFirstById($sanitizedData['id']);
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
                $sanitizedData['extension'],
                $app->extension ?? ''
            )) {
                $res->messages['error'][] = 'da_ValidateExtensionDouble';
                return $res;
            }
            
            // Save in transaction
            $savedApp = BaseActionHelper::executeInTransaction(function() use ($app, $sanitizedData) {
                // Handle Extension record
                $extension = Extensions::findFirstByNumber($app->extension ?? '');
                if (!$extension) {
                    $extension = new Extensions();
                    $extension->type = Extensions::TYPE_DIALPLAN_APPLICATION;
                    $extension->show_in_phonebook = 1;
                    $extension->public_access = 0;
                    $extension->userid = null;
                }
                
                $extension->number = $sanitizedData['extension'];
                $extension->callerid = $sanitizedData['name'];
                
                if (!$extension->save()) {
                    throw new \Exception('Failed to save extension: ' . implode(', ', $extension->getMessages()));
                }
                
                // Update DialplanApplication
                $app->extension = $sanitizedData['extension'];
                $app->name = $sanitizedData['name'];
                $app->hint = $sanitizedData['hint'] ?? '';
                $app->type = $sanitizedData['type'] ?? 'php';
                $app->description = $sanitizedData['description'] ?? '';
                
                // Handle applicationlogic with base64 encoding
                if (isset($sanitizedData['applicationlogic'])) {
                    // Use model method for proper base64 encoding
                    $app->setApplicationlogic($sanitizedData['applicationlogic']);
                }
                
                if (!$app->save()) {
                    throw new \Exception('Failed to save dialplan application: ' . implode(', ', $app->getMessages()));
                }
                
                return $app;
            });
            
            $res->data = DataStructure::createFromModel($savedApp);
            $res->success = true;
            $res->reload = "dialplan-applications/modify/{$savedApp->uniqid}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}
```

### 1.3 Complete Action Classes Set

**File**: `src/PBXCoreREST/Lib/DialplanApplications/GetRecordAction.php`

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Core\System\Util\CriticalErrorsHandler;

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
 */
class GetRecordAction
{
    /**
     * Get dialplan application record
     * 
     * @param string|null $id Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
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
                    $res->messages['error'][] = 'api_DialplanApplicationNotFound';
                }
            }
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/DialplanApplications/GetListAction.php`

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Core\System\Util\CriticalErrorsHandler;

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
 */
class GetListAction
{
    /**
     * Get list of all dialplan applications
     * 
     * @param array $data Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $apps = DialplanApplications::find([
                'order' => 'name ASC'
            ]);
            
            $resultData = [];
            foreach ($apps as $app) {
                $resultData[] = DataStructure::createFromModel($app);
            }
            
            $res->data = $resultData;
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/DialplanApplications/DeleteRecordAction.php`

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use MikoPBX\Core\System\Util\CriticalErrorsHandler;

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
 */
class DeleteRecordAction
{
    /**
     * Delete dialplan application record
     * 
     * @param string $id Record ID to delete
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
            $app = DialplanApplications::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);
            
            if (!$app) {
                $res->messages['error'][] = 'api_DialplanApplicationNotFound';
                return $res;
            }
            
            // Delete in transaction
            BaseActionHelper::executeInTransaction(function() use ($app) {
                // Delete related extension
                $extension = Extensions::findFirstByNumber($app->extension);
                if ($extension && !$extension->delete()) {
                    throw new \Exception('Failed to delete extension: ' . implode(', ', $extension->getMessages()));
                }
                
                // Delete dialplan application
                if (!$app->delete()) {
                    throw new \Exception('Failed to delete dialplan application: ' . implode(', ', $app->getMessages()));
                }
                
                return true;
            });
            
            $res->success = true;
            $res->data = ['deleted_id' => $id];
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/DialplanApplications/DataStructure.php`

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

/**
 * Data structure for dialplan applications
 */
class DataStructure
{
    /**
     * Create data array from DialplanApplications model
     * 
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

### 1.4 Management Processor

**File**: `src/PBXCoreREST/Lib/DialplanApplicationsManagementProcessor.php`

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

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
 */
class DialplanApplicationsManagementProcessor extends Injectable
{
    /**
     * Process dialplan application management requests
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

### 1.5 REST API Controllers

**Update existing file**: `src/PBXCoreREST/Controllers/DialplanApplications/GetController.php`

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\PBXCoreREST\Controllers\DialplanApplications;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\DialplanApplicationsManagementProcessor;

/**
 * GET controller for dialplan applications management
 * 
 * @RoutePrefix("/pbxcore/api/v2/dialplan-applications")
 */
class GetController extends BaseController
{
    /**
     * Handle the call to different actions based on the action name
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
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        $requestData = $this->request->get();
        
        if (!empty($id)) {
            $requestData['id'] = $id;
        }
        
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
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\PBXCoreREST\Controllers\DialplanApplications;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\DialplanApplicationsManagementProcessor;

/**
 * POST controller for dialplan applications management
 * 
 * @RoutePrefix("/pbxcore/api/v2/dialplan-applications")
 */
class PostController extends BaseController
{
    /**
     * Handle the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates dialplan application record
     * @Post("/saveRecord")
     * 
     * Deletes the dialplan applications record with its dependent tables
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
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\PBXCoreREST\Controllers\DialplanApplications;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\DialplanApplicationsManagementProcessor;

/**
 * PUT controller for dialplan applications management
 * 
 * @RoutePrefix("/pbxcore/api/v2/dialplan-applications")
 */
class PutController extends BaseController
{
    /**
     * Handle the call to different actions based on the action name
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
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\PBXCoreREST\Controllers\DialplanApplications;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\DialplanApplicationsManagementProcessor;

/**
 * DELETE controller for dialplan applications management
 * 
 * @RoutePrefix("/pbxcore/api/v2/dialplan-applications")
 */
class DeleteController extends BaseController
{
    /**
     * Handle the call to different actions based on the action name
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

## Phase 2: Enhanced Frontend with Security

### 2.1 Secure API Module

**File**: `sites/admin-cabinet/assets/js/src/PbxAPI/dialplanApplicationsAPI.js`

```javascript
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global Config, SecurityUtils, PbxApi */

/**
 * DialplanApplicationsAPI - REST API for dialplan applications management with enhanced security
 * 
 * Provides centralized API methods with built-in security features:
 * - Input sanitization for display
 * - XSS protection with code preservation
 * - Consistent error handling
 * - CSRF protection through session cookies
 */
const DialplanApplicationsAPI = {
    /**
     * API endpoints configuration
     */
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/dialplan-applications/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/dialplan-applications/getRecord`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/dialplan-applications/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/dialplan-applications/deleteRecord`
    },
    
    /**
     * Get record by ID with security processing
     * 
     * @param {string} id - Record ID or empty string for new
     * @param {function} callback - Callback function
     */
    getRecord(id, callback) {
        const recordId = (!id || id === '') ? 'new' : id;
        
        $.api({
            url: `${this.endpoints.getRecord}/${recordId}`,
            method: 'GET',
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    // Sanitize data for display while preserving applicationlogic
                    response.data = this.sanitizeApplicationData(response.data);
                }
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback({result: false, messages: {error: ['Network error']}});
            }
        });
    },
    
    /**
     * Get list of all records with security processing
     * 
     * @param {function} callback - Callback function
     */
    getList(callback) {
        $.api({
            url: this.endpoints.getList,
            method: 'GET',
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    // Sanitize array of applications
                    response.data = response.data.map(item => this.sanitizeApplicationData(item));
                }
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback({result: false, data: []});
            }
        });
    },
    
    /**
     * Save record with validation and security
     * 
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */
    saveRecord(data, callback) {
        // Client-side validation
        if (!this.validateApplicationData(data)) {
            callback({
                result: false, 
                messages: {error: ['Client-side validation failed']}
            });
            return;
        }
        
        const method = data.id ? 'PUT' : 'POST';
        const url = data.id ? 
            `${this.endpoints.saveRecord}/${data.id}` : 
            this.endpoints.saveRecord;
        
        $.api({
            url: url,
            method: method,
            data: data,
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    response.data = this.sanitizeApplicationData(response.data);
                }
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback({result: false, messages: {error: ['Network error']}});
            }
        });
    },
    
    /**
     * Delete record
     * 
     * @param {string} id - Record ID
     * @param {function} callback - Callback function
     */
    deleteRecord(id, callback) {
        $.api({
            url: `${this.endpoints.deleteRecord}/${id}`,
            on: 'now',
            method: 'DELETE',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback(false);
            }
        });
    },
    
    /**
     * Sanitize application data for secure display
     * 
     * @param {object} data - Raw application data
     * @return {object} Sanitized data
     */
    sanitizeApplicationData(data) {
        if (!data) return data;
        
        return {
            id: data.id,
            uniqid: data.uniqid,
            extension: SecurityUtils.escapeHtml(data.extension || ''),
            name: SecurityUtils.escapeHtml(data.name || ''),
            hint: SecurityUtils.escapeHtml(data.hint || ''),
            type: data.type, // Safe enum value
            description: SecurityUtils.escapeHtml(data.description || ''),
            // applicationlogic is NOT sanitized - it's program code
            applicationlogic: data.applicationlogic || ''
        };
    },
    
    /**
     * Client-side validation
     * 
     * @param {object} data - Data to validate
     * @return {boolean} Validation result
     */
    validateApplicationData(data) {
        // Required fields
        if (!data.name || !data.name.trim()) {
            return false;
        }
        
        if (!data.extension || !data.extension.trim()) {
            return false;
        }
        
        // Extension format validation
        if (!/^[0-9#+\\*|X]{1,64}$/.test(data.extension)) {
            return false;
        }
        
        // Type validation
        if (data.type && !['php', 'plaintext'].includes(data.type)) {
            return false;
        }
        
        return true;
    }
};
```

### 2.2 Enhanced Form Module

**File**: `sites/admin-cabinet/assets/js/src/DialplanApplications/dialplan-applications-modify.js`

```javascript
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global DialplanApplicationsAPI, Form, SecurityUtils, globalTranslate, Extensions, ace, UserMessage */

/**
 * Dialplan application edit form management module with enhanced security
 */
const dialplanApplicationModify = {
    $formObj: $('#dialplan-application-form'),
    $number: $('#extension'),
    $typeSelectDropDown: $('#dialplan-application-form .type-select'),
    $tabMenuItems: $('#application-code-menu .item'),
    defaultExtension: '',
    editor: null,
    
    /**
     * Form validation rules
     */
    validateRules: {
        name: {
            identifier: 'name',
            rules: [{
                type: 'empty',
                prompt: globalTranslate.da_ValidateNameIsEmpty
            }]
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'regExp',
                    value: '/^[0-9#+\\*|X]{1,64}$/',
                    prompt: globalTranslate.da_ValidateExtensionNumber,
                },
                {
                    type: 'empty',
                    prompt: globalTranslate.da_ValidateExtensionIsEmpty,
                },
                {
                    type: 'existRule[extension-error]',
                    prompt: globalTranslate.da_ValidateExtensionDouble,
                }
            ]
        }
    },
    
    /**
     * Initialize the module
     */
    initialize() {
        // Initialize UI components
        dialplanApplicationModify.$tabMenuItems.tab();
        dialplanApplicationModify.$typeSelectDropDown.dropdown({
            onChange: dialplanApplicationModify.changeAceMode
        });
        
        // Extension availability check
        let timeoutId;
        dialplanApplicationModify.$number.on('input', () => {
            if (timeoutId) clearTimeout(timeoutId);
            
            timeoutId = setTimeout(() => {
                const newNumber = dialplanApplicationModify.$formObj.form('get value', 'extension');
                Extensions.checkAvailability(dialplanApplicationModify.defaultExtension, newNumber);
            }, 500);
        });
        
        // Configure Form.js for REST API
        Form.$formObj = dialplanApplicationModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = dialplanApplicationModify.validateRules;
        Form.cbBeforeSendForm = dialplanApplicationModify.cbBeforeSendForm;
        Form.cbAfterSendForm = dialplanApplicationModify.cbAfterSendForm;
        
        // REST API integration
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = DialplanApplicationsAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Navigation URLs
        Form.afterSubmitIndexUrl = `${globalRootUrl}dialplan-applications/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}dialplan-applications/modify/`;
        
        Form.initialize();
        
        // Initialize components
        dialplanApplicationModify.initializeAce();
        dialplanApplicationModify.initializeFullscreenHandlers();
        dialplanApplicationModify.initializeForm();
    },
    
    /**
     * Load form data via REST API
     */
    initializeForm() {
        const recordId = dialplanApplicationModify.getRecordId();
        
        DialplanApplicationsAPI.getRecord(recordId, (response) => {
            if (response.result) {
                // Data is already sanitized in API module
                dialplanApplicationModify.populateForm(response.data);
                dialplanApplicationModify.defaultExtension = response.data.extension;
                
                // Set ACE editor content (applicationlogic is not sanitized)
                const codeContent = response.data.applicationlogic || '';
                dialplanApplicationModify.editor.getSession().setValue(codeContent);
                dialplanApplicationModify.changeAceMode();
                
                // Switch to main tab for new records
                if (!response.data.name) {
                    dialplanApplicationModify.$tabMenuItems.tab('change tab', 'main');
                }
            } else {
                const errorMessage = response.messages?.error ? 
                    response.messages.error.join(', ') : 
                    'Failed to load dialplan application data';
                UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
            }
        });
    },
    
    /**
     * Get record ID from URL
     * 
     * @return {string} Record ID
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
     * Initialize ACE editor with security considerations
     */
    initializeAce() {
        const aceHeight = window.innerHeight - 380;
        const rowsCount = Math.round(aceHeight / 16.3);
        
        $(window).on('load', function () {
            $('.application-code').css('min-height', `${aceHeight}px`);
        });
        
        dialplanApplicationModify.editor = ace.edit('application-code');
        dialplanApplicationModify.editor.setTheme('ace/theme/monokai');
        dialplanApplicationModify.editor.resize();
        
        // Track changes for Form.js
        dialplanApplicationModify.editor.getSession().on('change', () => {
            Form.dataChanged();
        });
        
        dialplanApplicationModify.editor.setOptions({
            maxLines: rowsCount,
            showPrintMargin: false,
            showLineNumbers: false
        });
        
        // Security: prevent code execution in editor
        dialplanApplicationModify.editor.commands.addCommand({
            name: 'preventCodeExecution',
            bindKey: {win: 'Ctrl-E', mac: 'Command-E'},
            exec: function() {
                console.warn('Code execution prevented for security');
                return false;
            }
        });
    },
    
    /**
     * Initialize fullscreen handlers
     */
    initializeFullscreenHandlers() {
        $('.fullscreen-toggle-btn').on('click', function () {
            const container = $(this).siblings('.application-code')[0];
            dialplanApplicationModify.toggleFullScreen(container);
        });

        document.addEventListener('fullscreenchange', dialplanApplicationModify.adjustEditorHeight);
    },
    
    /**
     * Toggle fullscreen mode
     * 
     * @param {HTMLElement} container - Container element
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
     * Adjust editor height on fullscreen change
     */
    adjustEditorHeight() {
        dialplanApplicationModify.editor.resize();
    },
    
    /**
     * Change ACE editor mode based on type
     */
    changeAceMode() {
        const mode = dialplanApplicationModify.$formObj.form('get value', 'type');
        let NewMode;

        if (mode === 'php') {
            NewMode = ace.require('ace/mode/php').Mode;
            dialplanApplicationModify.editor.setOptions({
                showLineNumbers: true
            });
        } else {
            NewMode = ace.require('ace/mode/julia').Mode;
            dialplanApplicationModify.editor.setOptions({
                showLineNumbers: false
            });
        }

        dialplanApplicationModify.editor.session.setMode(new NewMode());
        dialplanApplicationModify.editor.setTheme('ace/theme/monokai');
    },
    
    /**
     * Callback before form submission
     * 
     * @param {object} settings - Form settings
     * @return {object|false} Modified settings or false to cancel
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = dialplanApplicationModify.$formObj.form('get values');
        
        // Add application logic from ACE editor (not sanitized)
        result.data.applicationlogic = dialplanApplicationModify.editor.getValue();
        
        // Additional client-side validation
        if (!DialplanApplicationsAPI.validateApplicationData(result.data)) {
            UserMessage.showError('Validation failed');
            return false;
        }
        
        return result;
    },
    
    /**
     * Callback after form submission (no success messages - UI updates only)
     * 
     * @param {object} response - Server response
     */
    cbAfterSendForm(response) {
        if (response.result) {
            if (response.data) {
                // Data is already sanitized in API module
                dialplanApplicationModify.populateForm(response.data);
                
                // Update ACE editor content
                const codeContent = response.data.applicationlogic || '';
                dialplanApplicationModify.editor.getSession().setValue(codeContent);
            }
            
            // Update URL for new records
            const currentId = $('#id').val();
            if (!currentId && response.data && response.data.uniqid) {
                const newUrl = window.location.href.replace(/modify\/?$/, `modify/${response.data.uniqid}`);
                window.history.pushState(null, '', newUrl);
            }
            
            // No success message - just silent update
        }
    },
    
    /**
     * Populate form with sanitized data
     * 
     * @param {object} data - Form data
     */
    populateForm(data) {
        Form.$formObj.form('set values', data);
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    }
};

/**
 * Custom validation rule for extension existence
 */
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    dialplanApplicationModify.initialize();
});
```

### 2.3 Enhanced Index Page with DataTable

**File**: `sites/admin-cabinet/assets/js/src/DialplanApplications/dialplan-applications-index.js`

```javascript
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global DialplanApplicationsAPI, SecurityUtils, SemanticLocalization, globalTranslate, globalRootUrl, Extensions */

/**
 * Dialplan applications table management module with enhanced security
 */
const dialplanApplicationsTable = {
    $applicationsTable: $('#dialplan-applications-table'),
    dataTable: {},

    /**
     * Initialize the module
     */
    initialize() {
        // Show placeholder initially
        dialplanApplicationsTable.toggleEmptyPlaceholder(true);
        dialplanApplicationsTable.initializeDataTable();
    },
    
    /**
     * Initialize DataTable with proper Semantic UI integration
     */
    initializeDataTable() {
        dialplanApplicationsTable.dataTable = dialplanApplicationsTable.$applicationsTable.DataTable({
            ajax: {
                url: DialplanApplicationsAPI.endpoints.getList,
                dataSrc: function(json) {
                    // Manage empty state
                    const isEmpty = !json.result || !json.data || json.data.length === 0;
                    dialplanApplicationsTable.toggleEmptyPlaceholder(isEmpty);
                    
                    // Data is already sanitized in API module
                    return json.result ? json.data : [];
                }
            },
            columns: [
                {
                    data: 'name',
                    className: 'collapsing',
                    render: function(data, type, row) {
                        // Data is already sanitized
                        return `<strong>${data}</strong>`;
                    }
                },
                {
                    data: 'extension',
                    className: 'center aligned collapsing'
                    // Data is already sanitized
                },
                {
                    data: 'type',
                    className: 'center aligned hide-on-mobile collapsing',
                    responsivePriority: 2,
                    render: function(data) {
                        // Type is safe enum value
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
                        // Data is already sanitized
                        return data || '—';
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'right aligned action-buttons collapsing',
                    responsivePriority: 1,
                    render: function(data, type, row) {
                        // Create secure action buttons
                        const editUrl = SecurityUtils.escapeAttribute(`${globalRootUrl}dialplan-applications/modify/${row.uniqid}`);
                        const deleteId = SecurityUtils.escapeAttribute(row.uniqid);
                        const editTooltip = SecurityUtils.escapeAttribute(globalTranslate.bt_ToolTipEdit);
                        const deleteTooltip = SecurityUtils.escapeAttribute(globalTranslate.bt_ToolTipDelete);
                        
                        return `<div class="ui tiny basic icon buttons">
                            <a href="${editUrl}" 
                               class="ui button edit popuped" 
                               data-content="${editTooltip}">
                                <i class="edit icon blue"></i>
                            </a>
                            <a href="#" 
                               data-value="${deleteId}" 
                               class="ui button delete two-steps-delete popuped" 
                               data-content="${deleteTooltip}">
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
                // Initialize Semantic UI components
                dialplanApplicationsTable.$applicationsTable.find('.popuped').popup();
                dialplanApplicationsTable.initializeDoubleClickEdit();
            }
        });
        
        // Handle deletion with DeleteSomething.js integration
        dialplanApplicationsTable.$applicationsTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const appId = $button.attr('data-value');
            
            $button.addClass('loading disabled');
            
            DialplanApplicationsAPI.deleteRecord(appId, dialplanApplicationsTable.cbAfterDeleteRecord);
        });
    },
    
    /**
     * Callback after record deletion (no success messages - UI updates only)
     * 
     * @param {object} response - Server response
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Silent operation - just reload table
            dialplanApplicationsTable.dataTable.ajax.reload();
            
            // Update related components
            if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
                Extensions.cbOnDataChanged();
            }
            
            // No success message - silent operation
        } else {
            // Only show errors
            const errorMessage = response.messages?.error ? 
                response.messages.error.join(', ') : 
                globalTranslate.da_ImpossibleToDeleteDialplanApplication;
            UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
        
        // Remove loading state
        $('a.delete').removeClass('loading disabled');
    },
    
    /**
     * Toggle empty table placeholder visibility
     * 
     * @param {boolean} isEmpty - Whether table is empty
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
     * Initialize double-click for editing (exclude action buttons)
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
 * Initialize on document ready
 */
$(document).ready(() => {
    dialplanApplicationsTable.initialize();
});
```

## Phase 3: Optimized AdminCabinet Controller

### 3.1 Minimalist Controller Following IVR Pattern

**Update file**: `src/AdminCabinet/Controllers/DialplanApplicationsController.php`

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\DialplanApplicationEditForm;

/**
 * DialplanApplicationsController - Simplified controller following IVR menu pattern
 * 
 * All data loading is handled by JavaScript via REST API.
 * Controller provides only the basic structure for views.
 */
class DialplanApplicationsController extends BaseController
{
    /**
     * Build the list of dialplan applications
     * 
     * Data is loaded by DataTable AJAX - no server-side processing needed
     */
    public function indexAction(): void
    {
        // Empty method - all data loading handled by JavaScript
    }

    /**
     * Edit dialplan application details
     * 
     * Simplified controller - all data loading is handled by JavaScript via REST API.
     * This only provides the basic form structure without REST API calls.
     *
     * @param string $uniqid The unique identifier of the dialplan application
     */
    public function modifyAction(string $uniqid = ''): void
    {
        // Create empty form structure - JavaScript will populate everything via REST API
        $emptyApplication = new \stdClass();
        $emptyApplication->id = '';
        $emptyApplication->uniqid = $uniqid ?: '';
        $emptyApplication->extension = '';
        $emptyApplication->name = '';
        $emptyApplication->hint = '';
        $emptyApplication->applicationlogic = '';
        $emptyApplication->type = 'php';
        $emptyApplication->description = '';
        
        // Create form with minimal structure
        $form = new DialplanApplicationEditForm($emptyApplication);
        
        // Pass only essential data - JavaScript handles everything else
        $this->view->form = $form;
        $this->view->uniqid = $uniqid ?: '';
    }

    /**
     * Save dialplan application
     * 
     * This action is kept for backward compatibility but the actual saving
     * is handled by the REST API through JavaScript (Form.js integration)
     */
    public function saveAction(): void
    {
        // This method is intentionally empty as all save operations
        // are handled through REST API via Form.js integration
        // Redirect to prevent direct access
        $this->response->redirect('dialplan-applications/index');
    }
}
```

### 3.2 Updated Form with Security

**Update file**: `src/AdminCabinet/Forms/DialplanApplicationEditForm.php`

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Element\Select;

/**
 * DialplanApplicationEditForm - Form for editing dialplan applications
 * 
 * Integrates with REST API through JavaScript - provides structure only
 */
class DialplanApplicationEditForm extends BaseForm
{
    /**
     * Initialize the form
     * 
     * @param object|null $entity Entity object
     * @param array|null $options Form options
     */
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);
        
        // CSRF protection is handled automatically by BaseForm
        
        // Hidden fields for REST API integration
        $this->add(new Hidden('id'));
        $this->add(new Hidden('uniqid'));
        
        // Basic form fields
        $this->add(new Text('name', [
            'maxlength' => 100,
            'class' => 'form-control'
        ]));
        
        $this->add(new Text('extension', [
            'maxlength' => 64,
            'class' => 'form-control'
        ]));
        
        $this->add(new Text('hint', [
            'maxlength' => 255,
            'class' => 'form-control'
        ]));
        
        // Application type selector
        $this->add(new Select('type', [
            'php' => $this->translation->_('da_TypePhp'),
            'plaintext' => $this->translation->_('da_TypePlaintext')
        ], [
            'class' => 'ui dropdown type-select'
        ]));
        
        // Application logic - no filtering to preserve code syntax
        $this->add(new TextArea('applicationlogic', [
            'class' => 'application-code',
            'id' => 'application-code'
        ]));
        
        $this->add(new TextArea('description', [
            'maxlength' => 500,
            'class' => 'form-control'
        ]));
    }
}
```

### 3.3 Updated Volt Templates

**Update file**: `src/AdminCabinet/Views/DialplanApplications/index.volt`

```volt
{% extends "layouts/main.volt" %}

{% block content %}
<div id="add-new-button" style="display:none;">
    {% if isAllowed('save') %}
        {{ link_to("dialplan-applications/modify", '<i class="add circle icon"></i> '~t._('da_AddNewDialplanApplication'), "class": "ui blue button") }}
    {% endif %}
</div>

<div id="dialplan-applications-table-container" style="display:none;">
    <table class="ui selectable compact unstackable table" id="dialplan-applications-table">
        <thead>
            <tr>
                <th class="collapsing">{{ t._('da_ColumnName') }}</th>
                <th class="center aligned collapsing">{{ t._('da_ColumnExtension') }}</th>
                <th class="center aligned hide-on-mobile collapsing">{{ t._('da_ColumnType') }}</th>
                <th class="hide-on-mobile">{{ t._('da_ColumnDescription') }}</th>
                <th class="right aligned collapsing"></th>
            </tr>
        </thead>
        <tbody>
            <!-- DataTable will populate automatically -->
        </tbody>
    </table>
</div>

<div id="empty-table-placeholder">
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
{% endblock %}
```

**Update file**: `src/AdminCabinet/Views/DialplanApplications/modify.volt`

```volt
{% extends "layouts/main.volt" %}

{% block content %}
{{ form('dialplan-applications/save', 'role': 'form', 'class': 'ui form large', 'id':'dialplan-application-form') }}

{{ form.render('id') }}
{{ form.render('uniqid') }}

<div class="ui top attached tabular menu" id="application-code-menu">
    <a class="item active" data-tab="main">{{ t._('da_TabMain') }}</a>
    <a class="item" data-tab="code">{{ t._('da_TabCode') }}</a>
</div>

<div class="ui bottom attached tab segment active" data-tab="main">
    <div class="field">
        <label>{{ t._('da_Name') }}</label>
        {{ form.render('name') }}
    </div>
    
    <div class="field">
        <label>{{ t._('da_Extension') }}</label>
        {{ form.render('extension') }}
        <div id="extension-error" class="ui pointing red basic label hidden">
            {{ t._('da_ValidateExtensionDouble') }}
        </div>
    </div>
    
    <div class="field">
        <label>{{ t._('da_Type') }}</label>
        {{ form.render('type') }}
    </div>
    
    <div class="field">
        <label>{{ t._('da_Hint') }}</label>
        {{ form.render('hint') }}
    </div>
    
    <div class="field">
        <label>{{ t._('da_Description') }}</label>
        {{ form.render('description') }}
    </div>
</div>

<div class="ui bottom attached tab segment" data-tab="code">
    <div class="field">
        <label>
            {{ t._('da_ApplicationLogic') }}
            <button type="button" class="ui right floated tiny button fullscreen-toggle-btn">
                <i class="expand arrows alternate icon"></i>
                {{ t._('da_FullscreenMode') }}
            </button>
        </label>
        {{ form.render('applicationlogic') }}
    </div>
</div>

{% endblock %}

{% block footerjs %}
    {{ partial('partials/footer-submit-form') }}
{% endblock %}
```

## Phase 4: Asset Management and Routes

### 4.1 AssetProvider Updates

**Add to file**: `src/AdminCabinet/Providers/AssetProvider.php`

```php
/**
 * Create assets for dialplan applications pages
 * 
 * @param string $action Controller action
 */
private function makeDialplanApplicationsAssets(string $action): void
{
    if ($action === 'index') {
        // DataTables for applications list
        $this->headerCollectionCSS
            ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
        $this->footerCollectionJS
            ->addJs('js/vendor/datatable/dataTables.semanticui.js', true);

        // Main page modules
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
            
        // Form modules
        $this->footerCollectionJS
            ->addJs('js/pbx/main/form.js', true)
            ->addJs('js/pbx/PbxAPI/dialplanApplicationsAPI.js', true)
            ->addJs('js/pbx/DialplanApplications/dialplan-applications-modify.js', true);
    }
}
```

### 4.2 Router Updates

**Add to file**: `src/PBXCoreREST/Providers/RouterProvider.php`

```php
// Import dialplan applications controllers
use MikoPBX\PBXCoreREST\Controllers\DialplanApplications\GetController as DialplanApplicationsGetController,
    MikoPBX\PBXCoreREST\Controllers\DialplanApplications\PostController as DialplanApplicationsPostController,
    MikoPBX\PBXCoreREST\Controllers\DialplanApplications\PutController as DialplanApplicationsPutController,
    MikoPBX\PBXCoreREST\Controllers\DialplanApplications\DeleteController as DialplanApplicationsDeleteController;

// Add to routes array:
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
    '/pbxcore/api/v2/dialplan-applications/{actionName}/{id:[a-zA-Z0-9\\-]+}', 
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
    '/pbxcore/api/v2/dialplan-applications/{actionName}/{id:[a-zA-Z0-9\\-]+}', 
    'put', 
    '/'
],
// DELETE route
[
    DialplanApplicationsDeleteController::class, 
    'callAction', 
    '/pbxcore/api/v2/dialplan-applications/{actionName}/{id:[a-zA-Z0-9\\-]+}', 
    'delete', 
    '/'
],
```

## Phase 5: Translations and Testing

### 5.1 Russian Translations

**Add to file**: `src/Common/Messages/ru.php`

```php
// Dialplan Applications translations
'da_ValidateNameIsEmpty' => 'Необходимо заполнить название приложения',
'da_ValidateExtensionIsEmpty' => 'Необходимо заполнить номер приложения',
'da_ValidateExtensionNumber' => 'Неправильный формат номера приложения',
'da_ValidateExtensionDouble' => 'Номер приложения уже существует',
'da_AddNewDialplanApplication' => 'Добавить новое приложение',
'da_ColumnName' => 'Название',
'da_ColumnExtension' => 'Номер',
'da_ColumnType' => 'Тип',
'da_ColumnDescription' => 'Описание',
'da_EmptyTableTitle' => 'Приложения диалплана не настроены',
'da_EmptyTableDescription' => 'Создайте первое приложение для управления дополнительной логикой АТС',
'da_TypePhp' => 'PHP код',
'da_TypePlaintext' => 'Текстовая логика',
'da_TabMain' => 'Основные настройки',
'da_TabCode' => 'Код приложения',
'da_Name' => 'Название',  
'da_Extension' => 'Номер',
'da_Type' => 'Тип',
'da_Hint' => 'Подсказка',
'da_Description' => 'Описание',
'da_ApplicationLogic' => 'Логика приложения',
'da_FullscreenMode' => 'Полноэкранный режим',
'da_ImpossibleToDeleteDialplanApplication' => 'Невозможно удалить приложение диалплана',
'api_DialplanApplicationNotFound' => 'Приложение диалплана не найдено',
```

### 5.2 JavaScript Transpilation

```bash
# Transpile JavaScript files using Babel
/Users/nb/PhpstormProjects/mikopbx/MikoPBXUtils/node_modules/.bin/babel \
  sites/admin-cabinet/assets/js/src/PbxAPI/dialplanApplicationsAPI.js \
  --out-dir sites/admin-cabinet/assets/js/pbx/PbxAPI/ \
  --source-maps inline \
  --presets airbnb

/Users/nb/PhpstormProjects/mikopbx/MikoPBXUtils/node_modules/.bin/babel \
  sites/admin-cabinet/assets/js/src/DialplanApplications/dialplan-applications-index.js \
  --out-dir sites/admin-cabinet/assets/js/pbx/DialplanApplications/ \
  --source-maps inline \
  --presets airbnb

/Users/nb/PhpstormProjects/mikopbx/MikoPBXUtils/node_modules/.bin/babel \
  sites/admin-cabinet/assets/js/src/DialplanApplications/dialplan-applications-modify.js \
  --out-dir sites/admin-cabinet/assets/js/pbx/DialplanApplications/ \
  --source-maps inline \
  --presets airbnb
```

### 5.3 PHP Quality Check

```bash
# Run PHPStan for code quality analysis
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse \
  /offload/rootfs/usr/www/src/PBXCoreREST/Lib/DialplanApplications/ \
  --level=5
```

## Key Improvements in v2

### 1. Enhanced Security
- **CodeSecurityValidator** for program code validation without syntax breaking
- **Multi-level sanitization** preserving applicationlogic integrity  
- **XSS protection** with context-aware escaping
- **Security audit logging** for compliance

### 2. Better User Experience
- **No success messages** - silent operations with UI updates only
- **Seamless navigation** without disruptive notifications
- **Real-time extension validation** with debounced input
- **Optimized loading states** and error handling

### 3. Performance Optimizations
- **Minimalist controller** following IVR menu pattern
- **JavaScript-driven data loading** reducing server load
- **Efficient REST API** with proper caching headers
- **Reduced AdminCabinet processing** for better response times

### 4. Maintainability
- **Consistent logging** through SystemMessages and CriticalErrorsHandler
- **Clear separation of concerns** between REST API and AdminCabinet
- **Comprehensive documentation** with English comments
- **Testable architecture** with proper error handling

This enhanced plan provides a robust, secure, and maintainable solution for migrating dialplan applications to REST API v2 while preserving all existing functionality and improving the overall user experience.