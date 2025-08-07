# MikoPBX Outbound Routes REST API V2 Migration Plan

## Project Overview

This document contains a comprehensive plan for migrating the MikoPBX outbound routes management system to REST API V2 architecture. The plan is based on successful migration of incoming routes (commit e3f7b7c) and follows the established patterns from the unified REST API guide.

## Current State Analysis

### Existing Architecture
- **Model**: `src/Common/Models/OutgoingRoutingTable.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/OutboundRoutesController.php`
- **Form**: `src/AdminCabinet/Forms/OutgoingRouteEditForm.php`
- **JavaScript Files**: 
  - `sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-routes-index.js` - List management
  - `sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-route-modify.js` - Form handling
- **View Templates**:
  - `src/AdminCabinet/Views/OutboundRoutes/index.volt` - List view
  - `src/AdminCabinet/Views/OutboundRoutes/modify.volt` - Edit form
- **No REST API**: Currently no REST API implementation

### OutgoingRoutingTable Model Fields
```php
public $id;                              // Primary key (auto-increment)
public ?string $rulename = '';           // Rule name (required)
public ?string $providerid = '';         // Provider ID (required)
public ?string $priority = '0';          // Rule priority (auto-calculated if empty)
public ?string $numberbeginswith = '';   // Pattern to match at beginning
public ?string $restnumbers = '9';       // Number of digits in rest of number (-1 for any)
public ?string $trimfrombegin = '0';     // Digits to trim from beginning
public ?string $prepend = '';            // Digits to prepend
public ?string $note = '';               // Additional notes
```

### Model Relations
- `belongsTo` → `Providers` (by providerid field)

### Key Differences from Incoming Routes
- No default route (ID=1) protection needed
- Simpler data structure (no extension, timeout, audio_message_id)
- No OutWorkTimesRouts dependencies
- Pattern-based routing instead of DID-based
- No welcome banner functionality needed

## Detailed Implementation Plan

### Stage 1: REST API Backend Implementation

#### 1.1 Create Management Processor

**File**: `src/PBXCoreREST/Lib/OutboundRoutesManagementProcessor.php`

```php
<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\OutboundRoutes\ChangePriorityAction;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutes\DeleteRecordAction;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutes\GetListAction;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutes\GetRecordAction;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutes\SaveRecordAction;

/**
 * Processor for outbound routes management operations
 * Routes requests to appropriate action classes
 */
class OutboundRoutesManagementProcessor extends PBXApiProcessor
{
    /**
     * Process API requests for outbound routes
     * 
     * @param PBXApiResult $res Result object to populate
     * @return PBXApiResult Populated result object
     */
    public function getResultData(PBXApiResult $res): PBXApiResult
    {
        $res->processor = __METHOD__;
        $action = $this->getActionName('OutboundRoutes');

        $data = $this->getRequestData();
        
        switch ($action) {
            case 'GetRecord':
                $res = GetRecordAction::main($data);
                break;
            case 'GetList':
                $res = GetListAction::main($data);
                break;
            case 'SaveRecord':
                $res = SaveRecordAction::main($data);
                break;
            case 'DeleteRecord':
                $res = DeleteRecordAction::main($data);
                break;
            case 'ChangePriority':
                $res = ChangePriorityAction::main($data);
                break;
            default:
                $res->messages['error'][] = "Unknown action: $action in " . __CLASS__;
                break;
        }
        
        $res->function = $action;
        return $res;
    }
}
```

#### 1.2 Create Data Structure Class

**File**: `src/PBXCoreREST/Lib/OutboundRoutes/DataStructure.php`

```php
<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;

/**
 * Data structure transformation for outbound routes
 */
class DataStructure
{
    /**
     * Create data structure from model for detailed view
     */
    public static function createFromModel(OutgoingRoutingTable $model): array
    {
        $provider = $model->Providers;
        $providerRepresent = '';
        $providerName = '';
        $providerDisabled = false;
        
        if ($provider) {
            $providerRepresent = $provider->getRepresent();
            $providerName = $provider->description ?: $provider->getRepresent();
            $modelType = ucfirst($provider->type);
            $provByType = $provider->$modelType;
            $providerDisabled = $provByType ? (bool)$provByType->disabled : false;
        }
        
        return [
            'id' => $model->id,
            'rulename' => $model->rulename ?? '',
            'providerid' => $model->providerid ?? '',
            'providerRepresent' => $providerRepresent,
            'providerName' => $providerName,
            'providerDisabled' => $providerDisabled,
            'priority' => (int)($model->priority ?? 0),
            'numberbeginswith' => $model->numberbeginswith ?? '',
            'restnumbers' => $model->restnumbers ?? '9',
            'trimfrombegin' => $model->trimfrombegin ?? '0',
            'prepend' => $model->prepend ?? '',
            'note' => $model->note ?? '',
            'represent' => $model->getRepresent()
        ];
    }
    
    /**
     * Create simplified structure for list view
     */
    public static function createForList(OutgoingRoutingTable $model): array
    {
        $provider = $model->Providers;
        $providerRepresent = '';
        $providerDisabled = false;
        
        if ($provider) {
            $providerRepresent = $provider->getRepresent();
            $modelType = ucfirst($provider->type);
            $provByType = $provider->$modelType;
            $providerDisabled = $provByType ? (bool)$provByType->disabled : false;
        }
        
        // Generate rule description
        $ruleDescription = self::generateRuleDescription($model);
        
        return [
            'id' => $model->id,
            'priority' => (int)($model->priority ?? 0),
            'rulename' => $model->rulename ?? '',
            'provider' => $providerRepresent,
            'providerName' => $providerRepresent,
            'numberbeginswith' => $model->numberbeginswith ?? '',
            'restnumbers' => $model->restnumbers ?? '9',
            'trimfrombegin' => $model->trimfrombegin ?? '0',
            'prepend' => $model->prepend ?? '',
            'note' => $model->note ?? '',
            'disabled' => $providerDisabled,
            'ruleDescription' => $ruleDescription
        ];
    }
    
    /**
     * Generate human-readable rule description
     */
    private static function generateRuleDescription(OutgoingRoutingTable $model): string
    {
        $numberbeginswith = $model->numberbeginswith ?? '';
        $restnumbers = (int)($model->restnumbers ?? 0);
        
        // Will be translated on frontend
        if (!$numberbeginswith && $restnumbers === 0) {
            return 'or_RuleNotConfigured';
        } elseif (!$numberbeginswith && $restnumbers < 0) {
            return 'or_RuleAnyNumbers';
        } elseif (!$numberbeginswith && $restnumbers > 0) {
            return "or_RuleDescriptionBeginEmpty:{$restnumbers}";
        } elseif ($numberbeginswith) {
            if ($restnumbers > 0) {
                return "or_RuleDescription:{$numberbeginswith}:{$restnumbers}";
            } elseif ($restnumbers === 0) {
                return "or_RuleDescriptionFullMatch:{$numberbeginswith}";
            } elseif ($restnumbers < 0) {
                return "or_RuleDescriptionBeginMatch:{$numberbeginswith}";
            }
        }
        
        return '';
    }
}
```

#### 1.3 Create Action Classes

**File**: `src/PBXCoreREST/Lib/OutboundRoutes/GetRecordAction.php`

```php
<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Get single outbound route record
 */
class GetRecordAction extends \MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction
{
    /**
     * Get outbound route record by ID
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $id = $data['id'] ?? null;
        
        if (empty($id) || $id === 'new') {
            // Create new record structure
            $newRoute = new OutgoingRoutingTable();
            $newRoute->id = '';
            $newRoute->priority = (string)((int)OutgoingRoutingTable::maximum(['column' => 'priority']) + 1);
            $newRoute->rulename = '';
            $newRoute->providerid = '';
            $newRoute->numberbeginswith = '';
            $newRoute->restnumbers = '9';
            $newRoute->trimfrombegin = '0';
            $newRoute->prepend = '';
            $newRoute->note = '';
            
            $res->data = DataStructure::createFromModel($newRoute);
            $res->success = true;
        } else {
            // Handle copy-source parameter
            $copySource = $data['copy-source'] ?? null;
            if ($copySource) {
                $sourceRoute = OutgoingRoutingTable::findFirstById($copySource);
                if ($sourceRoute) {
                    $newRoute = new OutgoingRoutingTable();
                    foreach ($sourceRoute->toArray() as $key => $value) {
                        if ($key !== 'id') {
                            $newRoute->$key = $value;
                        }
                    }
                    $newRoute->id = '';
                    $newRoute->priority = (string)((int)OutgoingRoutingTable::maximum(['column' => 'priority']) + 1);
                    $newRoute->note = '';
                    
                    $res->data = DataStructure::createFromModel($newRoute);
                    $res->success = true;
                    return $res;
                }
            }
            
            // Find existing record
            $route = OutgoingRoutingTable::findFirstById($id);
            
            if ($route) {
                // Handle special case for restnumbers
                if ($route->restnumbers === '-1') {
                    $route->restnumbers = '';
                }
                $res->data = DataStructure::createFromModel($route);
                $res->success = true;
            } else {
                $res->messages['error'][] = 'Outbound route not found';
            }
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutboundRoutes/GetListAction.php`

```php
<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Get list of all outbound routes
 */
class GetListAction extends \MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction
{
    /**
     * Get list of all outbound routes sorted by priority
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $routes = OutgoingRoutingTable::find([
                'order' => 'priority ASC'
            ]);
            
            $routesList = [];
            foreach ($routes as $route) {
                $routesList[] = DataStructure::createForList($route);
            }
            
            $res->data = $routesList;
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutboundRoutes/SaveRecordAction.php`

```php
<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Save outbound route record
 */
class SaveRecordAction
{
    /**
     * Save outbound route record (create or update)
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $di = \Phalcon\Di\Di::getDefault();
        $db = $di->get('db');
        
        $db->begin();
        
        try {
            // Find or create record
            if (!empty($data['id'])) {
                $route = OutgoingRoutingTable::findFirstById($data['id']);
                if (!$route) {
                    throw new \Exception('Outbound route not found');
                }
            } else {
                $route = new OutgoingRoutingTable();
                // Auto-calculate priority for new routes
                if (empty($data['priority'])) {
                    $maxPriority = OutgoingRoutingTable::maximum(['column' => 'priority']);
                    $route->priority = (string)((int)$maxPriority + 1);
                }
            }
            
            // Update fields
            $fieldsToUpdate = [
                'rulename', 'providerid', 'numberbeginswith',
                'restnumbers', 'trimfrombegin', 'prepend', 'note', 'priority'
            ];
            
            foreach ($fieldsToUpdate as $field) {
                if (isset($data[$field])) {
                    if ($field === 'restnumbers' && $data[$field] === '') {
                        $route->$field = '-1';
                    } else {
                        $route->$field = $data[$field];
                    }
                }
            }
            
            // Validate and save
            if (!$route->save()) {
                $errors = $route->getMessages();
                foreach ($errors as $error) {
                    $res->messages['error'][] = $error->getMessage();
                }
                throw new \Exception('Failed to save outbound route');
            }
            
            $db->commit();
            
            $res->data = DataStructure::createFromModel($route);
            $res->success = true;
            
            // Add reload URL for new records
            if (empty($data['id'])) {
                $res->reload = "outbound-routes/modify/{$route->id}";
            }
            
        } catch (\Exception $e) {
            $db->rollback();
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutboundRoutes/DeleteRecordAction.php`

```php
<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Delete outbound route record
 */
class DeleteRecordAction extends \MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction
{
    /**
     * Delete outbound route by ID
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $id = $data['id'] ?? null;
        
        if (empty($id)) {
            $res->messages['error'][] = 'Empty ID in request data';
            return $res;
        }
        
        $di = \Phalcon\Di\Di::getDefault();
        $db = $di->get('db');
        
        $db->begin();
        
        try {
            $route = OutgoingRoutingTable::findFirstById($id);
            
            if (!$route) {
                throw new \Exception('Outbound route not found');
            }
            
            if (!$route->delete()) {
                $errors = $route->getMessages();
                foreach ($errors as $error) {
                    $res->messages['error'][] = $error->getMessage();
                }
                throw new \Exception('Failed to delete outbound route');
            }
            
            $db->commit();
            
            $res->success = true;
            $res->redirect = 'outbound-routes/index';
            
        } catch (\Exception $e) {
            $db->rollback();
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutboundRoutes/ChangePriorityAction.php`

```php
<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Change priority of outbound routes
 */
class ChangePriorityAction
{
    /**
     * Update priorities for multiple routes
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Extract priorities from request data
        $priorities = $data['priorities'] ?? $data;
        
        if (empty($priorities) || !is_array($priorities)) {
            $res->messages['error'][] = 'No priority data provided';
            return $res;
        }
        
        $di = \Phalcon\Di\Di::getDefault();
        $db = $di->get('db');
        
        $db->begin();
        
        try {
            $updatedCount = 0;
            
            foreach ($priorities as $routeId => $newPriority) {
                $route = OutgoingRoutingTable::findFirstById($routeId);
                
                if (!$route) {
                    continue; // Skip non-existent routes
                }
                
                $route->priority = (string)$newPriority;
                
                if (!$route->update()) {
                    $errorMessages = [];
                    foreach ($route->getMessages() as $message) {
                        $errorMessages[] = $message->getMessage();
                    }
                    throw new \Exception(
                        "Failed to update route ID {$routeId}: " . implode(', ', $errorMessages)
                    );
                }
                
                $updatedCount++;
            }
            
            $db->commit();
            
            $res->success = true;
            $res->data = [
                'updated' => $updatedCount,
                'message' => "Successfully updated {$updatedCount} route priorities"
            ];
            
        } catch (\Exception $e) {
            $db->rollback();
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}
```

#### 1.4 Create REST Controllers

**File**: `src/PBXCoreREST/Controllers/OutboundRoutes/GetController.php`

```php
<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\OutboundRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutesManagementProcessor;

/**
 * GET controller for outbound routes management
 * 
 * @RoutePrefix("/pbxcore/api/v2/outbound-routes")
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
     * Get outbound route record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all outbound routes with provider data
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
            OutboundRoutesManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
```

**File**: `src/PBXCoreREST/Controllers/OutboundRoutes/PostController.php`

```php
<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\OutboundRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutesManagementProcessor;

/**
 * POST controller for outbound routes management
 * 
 * @RoutePrefix("/pbxcore/api/v2/outbound-routes")
 */
class PostController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    
    /**
     * Handle the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates outbound route record
     * @Post("/saveRecord")
     * 
     * Deletes the outbound route record
     * @Post("/deleteRecord")
     * 
     * Changes priority of outbound routes
     * @Post("/changePriority")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        // Handle both form data and JSON data
        $postData = [];
        
        if ($this->request->getContentType() === 'application/json') {
            // Handle JSON requests
            $rawBody = $this->request->getRawBody();
            if (!empty($rawBody)) {
                $jsonData = json_decode($rawBody, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($jsonData)) {
                    $postData = $jsonData;
                }
            }
        } else {
            // Handle form data
            $postData = $this->request->getPost();
        }
        
        // Sanitize the data
        $postData = self::sanitizeData($postData, $this->filter);
        
        $this->sendRequestToBackendWorker(
            OutboundRoutesManagementProcessor::class,
            $actionName,
            $postData
        );
    }
}
```

**File**: `src/PBXCoreREST/Controllers/OutboundRoutes/PutController.php`

```php
<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\OutboundRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutesManagementProcessor;

/**
 * PUT controller for outbound routes management
 * 
 * @RoutePrefix("/pbxcore/api/v2/outbound-routes")
 */
class PutController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    
    /**
     * Handle the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Outbound route ID for update operations
     * 
     * Updates existing outbound route record
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
            OutboundRoutesManagementProcessor::class,
            $actionName,
            $putData
        );
    }
}
```

**File**: `src/PBXCoreREST/Controllers/OutboundRoutes/DeleteController.php`

```php
<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\OutboundRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutesManagementProcessor;

/**
 * DELETE controller for outbound routes management
 * 
 * @RoutePrefix("/pbxcore/api/v2/outbound-routes")
 */
class DeleteController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    
    /**
     * Handle the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Outbound route ID to delete
     * 
     * Deletes outbound route record
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
            OutboundRoutesManagementProcessor::class,
            $actionName,
            $deleteData
        );
    }
}
```

### Stage 2: JavaScript Client Implementation

#### 2.1 Create API Module

**File**: `sites/admin-cabinet/assets/js/src/PbxAPI/outboundRoutesAPI.js`

```javascript
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/* global PbxApi */

/**
 * OutboundRoutesAPI - Module for outbound routes REST API interaction
 * @module OutboundRoutesAPI
 */
const OutboundRoutesAPI = {
    /**
     * API endpoint base URL
     */
    baseUrl: `${PbxApi.apiUrl}/pbxcore/api/v2/outbound-routes`,
    
    /**
     * Get all outbound routes
     * @param {Function} callback - Callback function
     */
    getList(callback) {
        $.api({
            url: `${this.baseUrl}/getList`,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError(errorMessage, element, xhr) {
                callback({result: false, messages: {error: [errorMessage]}});
            },
        });
    },
    
    /**
     * Get outbound route record by ID
     * @param {string} id - Record ID or 'new'
     * @param {Function} callback - Callback function
     */
    getRecord(id, callback) {
        const url = id ? `${this.baseUrl}/getRecord/${id}` : `${this.baseUrl}/getRecord`;
        
        $.api({
            url: url,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError(errorMessage, element, xhr) {
                callback({result: false, messages: {error: [errorMessage]}});
            },
        });
    },
    
    /**
     * Save outbound route record
     * @param {Object} record - Record data
     * @param {Function} callback - Callback function
     */
    saveRecord(record, callback) {
        const method = record.id ? 'PUT' : 'POST';
        const url = record.id 
            ? `${this.baseUrl}/saveRecord/${record.id}`
            : `${this.baseUrl}/saveRecord`;
        
        $.api({
            url: url,
            on: 'now',
            method: method,
            data: record,
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError(errorMessage, element, xhr) {
                callback({result: false, messages: {error: [errorMessage]}});
            },
        });
    },
    
    /**
     * Delete outbound route record
     * @param {string} id - Record ID
     * @param {Function} callback - Callback function
     */
    deleteRecord(id, callback) {
        $.api({
            url: `${this.baseUrl}/deleteRecord/${id}`,
            on: 'now',
            method: 'DELETE',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError(errorMessage, element, xhr) {
                callback({result: false, messages: {error: [errorMessage]}});
            },
        });
    },
    
    /**
     * Change routes priority
     * @param {Object} priorityData - Priority data object {id: priority}
     * @param {Function} callback - Callback function
     */
    changePriority(priorityData, callback) {
        $.api({
            url: `${this.baseUrl}/changePriority`,
            on: 'now',
            method: 'POST',
            data: {priorities: priorityData},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError(errorMessage, element, xhr) {
                callback({result: false, messages: {error: [errorMessage]}});
            },
        });
    }
};
```

#### 2.2 Update Index Page JavaScript

**File**: `sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-routes-index.js`

```javascript
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/* global globalRootUrl, globalTranslate, OutboundRoutesAPI, PbxDataTableIndex, UserMessage, SecurityUtils */

/**
 * Object for managing outbound routes table
 * @module outboundRoutes
 */
const outboundRoutes = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,
    
    /**
     * Initialize the object
     */
    initialize() {
        // Initialize the outbound routes table with REST API
        this.initializeDataTable();
        
        // Handle empty table state
        this.checkEmptyTableState();
    },
    
    /**
     * Initialize DataTable using base class
     */
    initializeDataTable() {
        // Create instance of base class with Outbound Routes specific configuration
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'outbound-routes-table',
            apiModule: OutboundRoutesAPI,
            routePrefix: 'outbound-routes',
            showSuccessMessages: false,
            actionButtons: ['edit', 'copy', 'delete'],
            translations: {
                deleteError: globalTranslate.or_ImpossibleToDeleteOutboundRoute
            },
            orderable: false, // Disable sorting globally
            order: [], // No default order
            onDataLoaded: this.onDataLoaded.bind(this),
            columns: [
                {
                    // Drag handle column
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'collapsing dragHandle',
                    render: function() {
                        return '<i class="sort grey icon"></i>';
                    }
                },
                {
                    // Rule name column
                    data: 'rulename',
                    className: '',
                    render: function(data, type, row) {
                        const disabledClass = row.disabled ? 'disabled' : '';
                        return `<div class="${disabledClass}">${SecurityUtils.escapeHtml(data)}</div>`;
                    }
                },
                {
                    // Rule description column
                    data: null,
                    className: '',
                    render: function(data, type, row) {
                        const disabledClass = row.disabled ? 'disabled' : '';
                        let description = '';
                        
                        // Parse rule description from backend
                        if (row.ruleDescription) {
                            const parts = row.ruleDescription.split(':');
                            const translationKey = parts[0];
                            
                            switch (translationKey) {
                                case 'or_RuleNotConfigured':
                                    description = globalTranslate.or_RuleNotConfigured;
                                    break;
                                case 'or_RuleAnyNumbers':
                                    description = globalTranslate.or_RuleAnyNumbers;
                                    break;
                                case 'or_RuleDescriptionBeginEmpty':
                                    description = globalTranslate.or_RuleDescriptionBeginEmpty
                                        .replace('{restnumbers}', parts[1]);
                                    break;
                                case 'or_RuleDescription':
                                    description = globalTranslate.or_RuleDescription
                                        .replace('{numberbeginswith}', parts[1])
                                        .replace('{restnumbers}', parts[2]);
                                    break;
                                case 'or_RuleDescriptionFullMatch':
                                    description = globalTranslate.or_RuleDescriptionFullMatch
                                        .replace('{numberbeginswith}', parts[1]);
                                    break;
                                case 'or_RuleDescriptionBeginMatch':
                                    description = globalTranslate.or_RuleDescriptionBeginMatch
                                        .replace('{numberbeginswith}', parts[1]);
                                    break;
                                default:
                                    description = row.ruleDescription;
                            }
                        }
                        
                        return `<div class="${disabledClass}">${description}</div>`;
                    }
                },
                {
                    // Provider column
                    data: 'provider',
                    className: 'hide-on-mobile',
                    render: function(data, type, row) {
                        const disabledClass = row.disabled ? 'disabled' : '';
                        const negativeClass = !data ? 'negative' : '';
                        return `<div class="${disabledClass} ${negativeClass}">${SecurityUtils.escapeHtml(data || '')}</div>`;
                    }
                },
                {
                    // Note column
                    data: 'note',
                    className: 'hide-on-mobile',
                    render: null // Will be set after instance creation
                }
            ],
            onDrawCallback: this.cbDrawComplete.bind(this)
        });
        
        // Set the note column renderer using the instance method
        this.dataTableInstance.columns[4].render = this.dataTableInstance.createDescriptionRenderer();
        
        // Initialize the base class
        this.dataTableInstance.initialize();
    },
    
    /**
     * Check if table is empty and show welcome message
     */
    checkEmptyTableState() {
        // This will be handled by onDataLoaded callback
    },
    
    /**
     * Callback when data is loaded
     */
    onDataLoaded(data) {
        if (!data || data.length === 0) {
            this.showEmptyTableMessage();
        } else {
            this.hideEmptyTableMessage();
        }
    },
    
    /**
     * Show empty table message
     */
    showEmptyTableMessage() {
        const $container = $('#outbound-routes-table-container');
        const $table = $('#outbound-routes-table_wrapper');
        
        if ($table.length) {
            $table.hide();
        }
        
        // Check if message already exists
        if ($container.find('.empty-table-message').length === 0) {
            const emptyHtml = `
                <div class="ui placeholder segment empty-table-message">
                    <div class="ui icon header">
                        <i class="sign out alternate icon"></i>
                        ${globalTranslate.or_EmptyTableTitle}
                    </div>
                    <div class="inline">
                        <p>${globalTranslate.or_EmptyTableDescription}</p>
                        <a href="${globalRootUrl}outbound-routes/modify" class="ui primary button">
                            <i class="add circle icon"></i> ${globalTranslate.or_AddNewRule}
                        </a>
                    </div>
                </div>
            `;
            $container.append(emptyHtml);
        }
    },
    
    /**
     * Hide empty table message
     */
    hideEmptyTableMessage() {
        $('#outbound-routes-table-container .empty-table-message').remove();
        $('#outbound-routes-table_wrapper').show();
    },
    
    /**
     * Callback after table draw is complete
     */
    cbDrawComplete() {
        // Initialize drag-and-drop on the table
        $('#outbound-routes-table tbody').tableDnD({
            onDrop: this.cbOnDrop.bind(this),
            onDragClass: 'hoveringRow',
            dragHandle: '.dragHandle'
        });
        
        // Add row data attributes for priority tracking
        $('#outbound-routes-table tbody tr').each(function() {
            const data = $('#outbound-routes-table').DataTable().row(this).data();
            if (data) {
                $(this).attr('id', data.id);
                $(this).attr('data-value', data.priority);
                $(this).addClass('rule-row');
            }
        });
    },
    
    /**
     * Callback function triggered when an outbound route is dropped in the list
     */
    cbOnDrop() {
        let priorityWasChanged = false;
        const priorityData = {};
        
        $('#outbound-routes-table tbody tr').each((index, obj) => {
            const ruleId = $(obj).attr('id');
            const oldPriority = parseInt($(obj).attr('data-value'), 10);
            const newPriority = index + 1; // Start from 1, not 0
            
            if (oldPriority !== newPriority) {
                priorityWasChanged = true;
                priorityData[ruleId] = newPriority;
            }
        });
        
        if (priorityWasChanged) {
            // Use REST API to update priorities
            OutboundRoutesAPI.changePriority(priorityData, (response) => {
                if (response.result) {
                    // Reload table to reflect new priorities
                    this.dataTableInstance.dataTable.ajax.reload();
                } else {
                    UserMessage.showMultiString(response.messages);
                }
            });
        }
    }
};

// Initialize on document ready
$(document).ready(() => {
    outboundRoutes.initialize();
});
```

#### 2.3 Update Modify Page JavaScript

**File**: `sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-route-modify.js`

```javascript
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/* global globalRootUrl, globalTranslate, Form, OutboundRoutesAPI, ProvidersAPI, UserMessage */

/**
 * Object for managing outbound route settings
 * @module outboundRoute
 */
const outboundRoute = {
    /**
     * jQuery object for the form
     * @type {jQuery}
     */
    $formObj: $('#outbound-route-form'),
    
    /**
     * jQuery object for provider dropdown
     * @type {jQuery}
     */
    $providerDropDown: $('#providerid'),
    
    /**
     * Route data from API
     * @type {Object|null}
     */
    routeData: null,
    
    /**
     * Validation rules for the form fields before submission
     * @type {object}
     */
    validateRules: {
        rulename: {
            identifier: 'rulename',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.or_ValidationPleaseEnterRuleName,
                },
            ],
        },
        provider: {
            identifier: 'providerid',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.or_ValidationPleaseSelectProvider,
                },
            ],
        },
        numberbeginswith: {
            identifier: 'numberbeginswith',
            rules: [
                {
                    type: 'regExp',
                    value: '/^(|[0-9#+\\*()\\[\\-\\]\\{\\}|]{1,64})$/',
                    prompt: globalTranslate.or_ValidateBeginPattern,
                },
            ],
        },
        restnumbers: {
            identifier: 'restnumbers',
            optional: true,
            rules: [
                {
                    type: 'integer[0..99]',
                    prompt: globalTranslate.or_ValidateRestNumbers,
                },
            ],
        },
        trimfrombegin: {
            identifier: 'trimfrombegin',
            optional: true,
            rules: [
                {
                    type: 'integer[0..99]',
                    prompt: globalTranslate.or_ValidateTrimFromBegin,
                },
            ],
        },
        prepend: {
            identifier: 'prepend',
            optional: true,
            rules: [
                {
                    type: 'regExp',
                    value: '/^[0-9#w+]{0,20}$/',
                    prompt: globalTranslate.or_ValidatePrepend,
                },
            ],
        },
    },
    
    /**
     * Initializes the outbound route form
     */
    initialize() {
        // Get route ID from form or URL
        const routeId = this.getRouteId();
        
        // Load providers first
        this.loadProviders(() => {
            // Then load route data
            this.loadRouteData(routeId);
        });
        
        this.initializeForm();
    },
    
    /**
     * Get route ID from form or URL
     */
    getRouteId() {
        // Try to get from form first
        let routeId = this.$formObj.form('get value', 'id');
        
        // If not in form, try to get from URL
        if (!routeId) {
            const urlParts = window.location.pathname.split('/');
            const modifyIndex = urlParts.indexOf('modify');
            if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
                routeId = urlParts[modifyIndex + 1];
            }
        }
        
        // Check for copy-source parameter
        const urlParams = new URLSearchParams(window.location.search);
        const copySource = urlParams.get('copy-source');
        if (copySource) {
            return `new?copy-source=${copySource}`;
        }
        
        return routeId || 'new';
    },
    
    /**
     * Load available providers
     * @param {Function} callback - Callback after loading
     */
    loadProviders(callback) {
        ProvidersAPI.getList((response) => {
            if (response.result) {
                this.updateProvidersDropdown(response.data);
            }
            if (callback) callback();
        });
    },
    
    /**
     * Update providers dropdown
     * @param {Array} providers - Array of provider objects
     */
    updateProvidersDropdown(providers) {
        this.$providerDropDown.empty();
        this.$providerDropDown.append('<option value=""></option>');
        
        providers.forEach(provider => {
            const disabledText = provider.disabled ? ` (${globalTranslate.mo_Disabled})` : '';
            this.$providerDropDown.append(
                `<option value="${provider.uniqid}">${provider.name}${disabledText}</option>`
            );
        });
        
        this.$providerDropDown.dropdown();
    },
    
    /**
     * Load route data from API
     * @param {string} routeId - Route ID or 'new'
     */
    loadRouteData(routeId) {
        OutboundRoutesAPI.getRecord(routeId, (response) => {
            if (response.result) {
                this.routeData = response.data;
                this.populateForm(response.data);
            } else if (routeId !== 'new') {
                UserMessage.showMultiString(response.messages);
            }
        });
    },
    
    /**
     * Populate form with route data
     * @param {Object} data - Route data
     */
    populateForm(data) {
        // Set form values
        this.$formObj.form('set values', {
            id: data.id || '',
            rulename: data.rulename || '',
            providerid: data.providerid || '',
            priority: data.priority || '',
            numberbeginswith: data.numberbeginswith || '',
            restnumbers: data.restnumbers === '-1' ? '' : (data.restnumbers || ''),
            trimfrombegin: data.trimfrombegin || '0',
            prepend: data.prepend || '',
            note: data.note || ''
        });
        
        // Update page header if we have a representation
        if (data.represent) {
            $('.page-header .header').text(data.represent);
        }
    },
    
    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = outboundRoute.$formObj.form('get values');
        
        // Handle empty restnumbers
        if (result.data.restnumbers === '') {
            result.data.restnumbers = '-1';
        }
        
        return result;
    },
    
    /**
     * Callback function to be called after the form has been sent
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        if (response.result && response.reload) {
            window.location = `${globalRootUrl}${response.reload}`;
        }
    },
    
    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = outboundRoute.$formObj;
        Form.url = `${globalRootUrl}outbound-routes/save`; // Fallback URL
        Form.validateRules = outboundRoute.validateRules;
        Form.cbBeforeSendForm = outboundRoute.cbBeforeSendForm;
        Form.cbAfterSendForm = outboundRoute.cbAfterSendForm;
        Form.initialize();
        
        // Override form submission to use REST API
        this.$formObj.on('submit', (e) => {
            e.preventDefault();
            
            if (!this.$formObj.form('is valid')) {
                return false;
            }
            
            const formData = this.$formObj.form('get values');
            
            // Show loading state
            this.$formObj.addClass('loading');
            
            OutboundRoutesAPI.saveRecord(formData, (response) => {
                this.$formObj.removeClass('loading');
                
                if (response.result) {
                    if (response.reload) {
                        window.location = `${globalRootUrl}${response.reload}`;
                    } else {
                        UserMessage.showInformation(globalTranslate.ms_SuccessfulSaved);
                    }
                } else {
                    UserMessage.showMultiString(response.messages);
                }
            });
            
            return false;
        });
    }
};

// Initialize on document ready
$(document).ready(() => {
    outboundRoute.initialize();
});
```

### Stage 3: AdminCabinet Controller Updates

**File**: `src/AdminCabinet/Controllers/OutboundRoutesController.php`

```php
<?php
declare(strict_types=1);

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\OutgoingRouteEditForm;
use MikoPBX\Common\Models\OutgoingRoutingTable;

class OutboundRoutesController extends BaseController
{
    /**
     * Builds the index page for outbound routes.
     * Only renders view, data loaded via REST API
     *
     * @return void
     */
    public function indexAction(): void
    {
        // Just render the view, JavaScript will load data via API
        $this->view->routingTable = []; // Empty array for initial render
    }

    /**
     * Shows the edit form for an outbound route
     * Only creates empty form, data loaded via REST API
     *
     * @param string $ruleId The ID of the routing rule to edit
     */
    public function modifyAction(string $ruleId = ''): void
    {
        // Create empty form - JS will populate via REST API
        $emptyRoute = new OutgoingRoutingTable();
        $form = new OutgoingRouteEditForm($emptyRoute, []);
        
        $this->view->form = $form;
        $this->view->uniqid = $ruleId;
        $this->view->represent = '';
    }

    /**
     * Save action - handled by REST API
     * @deprecated Use REST API instead
     */
    public function saveAction(): void
    {
        $this->forward('outbound-routes/index');
    }

    /**
     * Delete action - handled by REST API
     * @deprecated Use REST API instead
     *
     * @param string $id The ID of the outgoing route to delete
     */
    public function deleteAction(string $id = ''): void
    {
        $this->forward('outbound-routes/index');
    }

    /**
     * Change priority action - handled by REST API
     * @deprecated Use REST API instead
     */
    public function changePriorityAction(): void
    {
        $this->view->disable();
        echo json_encode(['error' => 'Use REST API']);
    }
}
```

### Stage 4: View Templates Updates

#### 4.1 Update index.volt

**File**: `src/AdminCabinet/Views/OutboundRoutes/index.volt`

```volt
{{ link_to("outbound-routes/modify", '<i class="add circle icon"></i> '~t._('or_AddNewRule'), "class": "ui blue button") }}

<div id="outbound-routes-table-container">
    <table id="outbound-routes-table" class="ui selectable compact unstackable table">
        <thead>
        <tr>
            <th></th>
            <th>{{ t._('or_TableColumnName') }}</th>
            <th>{{ t._('or_TableColumnRule') }}</th>
            <th class="hide-on-mobile">{{ t._('or_TableColumnProvider') }}</th>
            <th class="hide-on-mobile">{{ t._('or_TableColumnNote') }}</th>
            <th></th>
        </tr>
        </thead>
        <tbody>
        </tbody>
    </table>
</div>
```

#### 4.2 Update modify.volt

No changes needed - form structure remains the same.

### Stage 5: Router Configuration

**File**: `src/PBXCoreREST/Providers/RouterProvider.php`

Add the following routes:

```php
// Outbound Routes API V2
// GET endpoints
$router->addGet('/api/v2/outbound-routes/getList', [
    'controller' => 'OutboundRoutes\GetController',
    'action' => 'callAction',
    'actionName' => 'GetList'
]);

$router->addGet('/api/v2/outbound-routes/getRecord/{id}', [
    'controller' => 'OutboundRoutes\GetController',
    'action' => 'callAction',
    'actionName' => 'GetRecord'
]);

$router->addGet('/api/v2/outbound-routes/getRecord', [
    'controller' => 'OutboundRoutes\GetController',
    'action' => 'callAction',
    'actionName' => 'GetRecord'
]);

// POST endpoints
$router->addPost('/api/v2/outbound-routes/saveRecord', [
    'controller' => 'OutboundRoutes\PostController',
    'action' => 'callAction',
    'actionName' => 'SaveRecord'
]);

$router->addPost('/api/v2/outbound-routes/changePriority', [
    'controller' => 'OutboundRoutes\PostController',
    'action' => 'callAction',
    'actionName' => 'ChangePriority'
]);

// PUT endpoints
$router->addPut('/api/v2/outbound-routes/saveRecord/{id}', [
    'controller' => 'OutboundRoutes\PutController',
    'action' => 'callAction',
    'actionName' => 'SaveRecord'
]);

// DELETE endpoints
$router->addDelete('/api/v2/outbound-routes/deleteRecord/{id}', [
    'controller' => 'OutboundRoutes\DeleteController',
    'action' => 'callAction',
    'actionName' => 'DeleteRecord'
]);
```

### Stage 6: Asset Provider Configuration

**File**: `src/AdminCabinet/Providers/AssetProvider.php`

Add JavaScript files to asset collections:

```php
// In the appropriate section for outbound routes:

// API module
$jsFiles[] = 'js/pbx/PbxAPI/outboundRoutesAPI.js';
$jsFiles[] = 'js/pbx/PbxAPI/providersAPI.js';

// Page-specific scripts
if ($controller === 'OutboundRoutes') {
    if ($action === 'index') {
        $jsFiles[] = 'js/pbx/OutboundRoutes/outbound-routes-index.js';
    } elseif ($action === 'modify') {
        $jsFiles[] = 'js/pbx/OutboundRoutes/outbound-route-modify.js';
    }
}
```

### Stage 7: Transpile JavaScript Files

Run babel transpiler for all new/modified JavaScript files:

```bash
# API modules
babel "sites/admin-cabinet/assets/js/src/PbxAPI/outboundRoutesAPI.js" \
  --out-dir "sites/admin-cabinet/assets/js/pbx/PbxAPI" \
  --source-maps inline --presets airbnb

babel "sites/admin-cabinet/assets/js/src/PbxAPI/providersAPI.js" \
  --out-dir "sites/admin-cabinet/assets/js/pbx/PbxAPI" \
  --source-maps inline --presets airbnb

# Page scripts
babel "sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-routes-index.js" \
  --out-dir "sites/admin-cabinet/assets/js/pbx/OutboundRoutes" \
  --source-maps inline --presets airbnb

babel "sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-route-modify.js" \
  --out-dir "sites/admin-cabinet/assets/js/pbx/OutboundRoutes" \
  --source-maps inline --presets airbnb
```

## Testing Strategy

### 1. Unit Tests
- Test each Action class independently
- Test DataStructure transformations
- Test validation logic

### 2. Integration Tests
- Test full CRUD cycle via REST API
- Test priority change functionality
- Test error handling

### 3. Browser Testing
- Verify list page loads and displays routes
- Test drag-and-drop priority reordering
- Test create/edit/delete operations
- Verify form validation
- Test copy functionality
- Check empty state display

### 4. Regression Testing
- Ensure existing functionality still works
- Verify backward compatibility
- Test with existing data

## Migration Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Document current routes configuration
- [ ] Test in development environment

### Implementation
- [ ] Create REST API backend classes
- [ ] Create JavaScript API module
- [ ] Update JavaScript UI code
- [ ] Update AdminCabinet controller
- [ ] Update view templates
- [ ] Configure routes
- [ ] Update asset provider
- [ ] Transpile JavaScript files

### Post-Migration
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Perform browser testing
- [ ] Verify all functionality works
- [ ] Monitor for errors in production

## Rollback Plan

If issues arise:
1. Revert JavaScript files to previous versions
2. Revert AdminCabinet controller changes
3. REST API can remain (won't affect old code)
4. Clear browser cache
5. Restart web services

## Summary

This migration plan provides a complete REST API V2 implementation for Outbound Routes following the patterns established in the Incoming Routes migration. The implementation ensures:

1. **Consistency**: Follows the same architecture as incoming routes
2. **Maintainability**: Clear separation of concerns
3. **Testability**: Easy to test each component
4. **User Experience**: No visible changes for end users
5. **Backward Compatibility**: Old URLs and functionality preserved

The migration can be performed incrementally with minimal risk to existing functionality.