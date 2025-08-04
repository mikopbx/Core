# MikoPBX Outbound Routes REST API Migration Plan

## Project Overview

This document contains a detailed plan for adapting the MikoPBX outbound routes management system to use a unified REST API architecture. The plan is based on the guide `docs/mikopbx-rest-migration-guide.md` and follows the principles of minimal changes to the user interface.

## Current State

### Existing Architecture
- **Model**: `src/Common/Models/OutgoingRoutingTable.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/OutboundRoutesController.php`
- **Form**: `src/AdminCabinet/Forms/OutgoingRouteEditForm.php`
- **No REST API**: Currently no REST API implementation
- **JavaScript**: Basic list management with drag-and-drop priority reordering

### OutgoingRoutingTable Model Fields
```php
public $id;               // Primary key
public ?string $rulename = '';          // Rule name
public ?string $providerid = '';        // Provider ID
public ?string $priority = '0';         // Rule priority
public ?string $numberbeginswith = '';  // Pattern to match at beginning
public ?string $restnumbers = '9';      // Number of digits in rest of number
public ?string $trimfrombegin = '0';    // Digits to trim from beginning
public ?string $prepend = '';           // Digits to prepend
public ?string $note = '';              // Additional notes
```

### Model Relations
- `belongsTo` → `Providers` (by providerid field)

## Detailed Implementation Plan

### Stage 1: Creating REST API Backend

#### 1.1 MikoPBX REST API Architecture

**Important**: In MikoPBX REST API architecture, Action classes are executed in Workers without HTTP context. Therefore, they should not inherit from Injectable and work with $this->request directly.

**Correct Flow**:
```
HTTP Request → Controller → Worker → Action → Database → Response
```

#### 1.2 Data Structure Class

**File**: `src/PBXCoreREST/Lib/OutboundRoutes/DataStructure.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;

/**
 * Data structure for outbound routes
 */
class DataStructure
{
    /**
     * Create data structure from model
     * 
     * @param OutgoingRoutingTable $model
     * @return array
     */
    public static function createFromModel(OutgoingRoutingTable $model): array
    {
        $provider = $model->Providers;
        $providerRepresent = '';
        $providerDisabled = false;
        
        if ($provider) {
            $providerRepresent = $provider->getRepresent();
            $modelType = ucfirst($provider->type);
            $provByType = $provider->$modelType;
            $providerDisabled = (bool)$provByType->disabled;
        }
        
        return [
            'id' => $model->id,
            'rulename' => $model->rulename ?? '',
            'providerid' => $model->providerid ?? '',
            'providerName' => $providerRepresent,
            'providerDisabled' => $providerDisabled,
            'priority' => (int)$model->priority,
            'numberbeginswith' => $model->numberbeginswith ?? '',
            'restnumbers' => $model->restnumbers ?? '9',
            'trimfrombegin' => $model->trimfrombegin ?? '0',
            'prepend' => $model->prepend ?? '',
            'note' => $model->note ?? '',
            'represent' => $model->getRepresent()
        ];
    }
    
    /**
     * Create simplified structure for list
     * 
     * @param OutgoingRoutingTable $model
     * @return array
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
            $providerDisabled = (bool)$provByType->disabled;
        }
        
        return [
            'id' => $model->id,
            'priority' => (int)$model->priority,
            'rulename' => $model->getRepresent(),
            'provider' => $providerRepresent,
            'numberbeginswith' => $model->numberbeginswith ?? '',
            'restnumbers' => $model->restnumbers ?? '9',
            'trimfrombegin' => $model->trimfrombegin ?? '0',
            'prepend' => $model->prepend ?? '',
            'note' => $model->note ?? '',
            'disabled' => $providerDisabled
        ];
    }
}
```

#### 1.3 Action Classes for Outbound Routes

**File**: `src/PBXCoreREST/Lib/OutboundRoutes/GetRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting outbound route record
 * 
 * @api {get} /pbxcore/api/v2/outbound-routes/getRecord/:id Get outbound route record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup OutboundRoutes
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Outbound route data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.rulename Rule name
 * @apiSuccess {String} data.providerid Provider ID
 * @apiSuccess {Number} data.priority Rule priority
 * @apiSuccess {String} data.numberbeginswith Pattern to match at beginning
 * @apiSuccess {String} data.restnumbers Number of digits in rest
 * @apiSuccess {String} data.trimfrombegin Digits to trim from beginning
 * @apiSuccess {String} data.prepend Digits to prepend
 * @apiSuccess {String} data.note Additional notes
 */
class GetRecordAction
{
    /**
     * Get outbound route record
     * @param string|null $id - Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id) || $id === 'new') {
            // Create structure for new record
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
            // Find existing record
            $route = OutgoingRoutingTable::findFirstByid($id);
            
            if ($route) {
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
namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all outbound routes
 * 
 * @api {get} /pbxcore/api/v2/outbound-routes/getList Get all outbound routes
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup OutboundRoutes
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of outbound routes
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {Number} data.priority Rule priority
 * @apiSuccess {String} data.rulename Rule display name
 * @apiSuccess {String} data.provider Provider name
 * @apiSuccess {String} data.numberbeginswith Pattern to match
 * @apiSuccess {String} data.restnumbers Number of digits
 * @apiSuccess {String} data.note Additional notes
 * @apiSuccess {Boolean} data.disabled Provider disabled status
 */
class GetListAction
{
    /**
     * Get list of all outbound routes
     * 
     * @param array $data - Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get all outbound routes sorted by priority
            $routes = OutgoingRoutingTable::find([
                'order' => 'priority ASC'
            ]);
            
            $data = [];
            foreach ($routes as $route) {
                $data[] = DataStructure::createForList($route);
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

**File**: `src/PBXCoreREST/Lib/OutboundRoutes/SaveRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for saving outbound route record
 * 
 * @api {post} /pbxcore/api/v2/outbound-routes/saveRecord Create outbound route
 * @api {put} /pbxcore/api/v2/outbound-routes/saveRecord/:id Update outbound route
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup OutboundRoutes
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} rulename Rule name
 * @apiParam {String} providerid Provider ID
 * @apiParam {String} [numberbeginswith] Pattern to match at beginning
 * @apiParam {String} [restnumbers] Number of remaining digits
 * @apiParam {String} [trimfrombegin] Digits to trim from beginning
 * @apiParam {String} [prepend] Digits to prepend
 * @apiParam {String} [note] Additional notes
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved outbound route data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction
{
    /**
     * Save outbound route record
     * 
     * @param array $data - Record data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $db = Util::getDbConnection();
        $db->begin();
        
        try {
            // Find or create record
            if (!empty($data['id'])) {
                $route = OutgoingRoutingTable::findFirstByid($data['id']);
                if (!$route) {
                    throw new \Exception('Outbound route not found');
                }
            } else {
                $route = new OutgoingRoutingTable();
                $route->priority = (string)((int)OutgoingRoutingTable::maximum(['column' => 'priority']) + 1);
            }
            
            // Update fields
            if (isset($data['rulename'])) {
                $route->rulename = $data['rulename'];
            }
            
            if (isset($data['providerid'])) {
                $route->providerid = $data['providerid'];
            }
            
            if (isset($data['numberbeginswith'])) {
                $route->numberbeginswith = $data['numberbeginswith'];
            }
            
            if (isset($data['restnumbers'])) {
                $route->restnumbers = ($data['restnumbers'] === '') ? '-1' : $data['restnumbers'];
            }
            
            if (isset($data['trimfrombegin'])) {
                $route->trimfrombegin = $data['trimfrombegin'];
            }
            
            if (isset($data['prepend'])) {
                $route->prepend = $data['prepend'];
            }
            
            if (isset($data['note'])) {
                $route->note = $data['note'];
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
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutboundRoutes/DeleteRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for deleting outbound route record
 * 
 * @api {delete} /pbxcore/api/v2/outbound-routes/deleteRecord/:id Delete outbound route
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup OutboundRoutes
 * 
 * @apiParam {String} id Record ID to delete
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {String} redirect URL for redirect after delete
 */
class DeleteRecordAction
{
    /**
     * Delete outbound route record
     * 
     * @param string $id - Record ID
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $db = Util::getDbConnection();
        $db->begin();
        
        try {
            $route = OutgoingRoutingTable::findFirstByid($id);
            
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
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutboundRoutes/ChangePriorityAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for changing outbound routes priority
 * 
 * @api {post} /pbxcore/api/v2/outbound-routes/changePriority Change routes priority
 * @apiVersion 2.0.0
 * @apiName ChangePriority
 * @apiGroup OutboundRoutes
 * 
 * @apiParam {Object} priorityTable Object with route IDs as keys and new priorities as values
 * 
 * @apiSuccess {Boolean} result Operation result
 */
class ChangePriorityAction
{
    /**
     * Change priority of outbound routes
     * 
     * @param array $priorityTable - Array with route IDs as keys and priorities as values
     * @return PBXApiResult
     */
    public static function main(array $priorityTable): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $db = Util::getDbConnection();
        $db->begin();
        
        try {
            $routes = OutgoingRoutingTable::find();
            foreach ($routes as $route) {
                if (array_key_exists($route->id, $priorityTable)) {
                    $route->priority = (string)$priorityTable[$route->id];
                    if (!$route->update()) {
                        throw new \Exception('Failed to update route priority');
                    }
                }
            }
            
            $db->commit();
            $res->success = true;
            
        } catch (\Exception $e) {
            $db->rollback();
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/OutboundRoutes/GetProvidersAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\Providers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting available providers list
 * 
 * @api {get} /pbxcore/api/v2/outbound-routes/getProviders Get available providers
 * @apiVersion 2.0.0
 * @apiName GetProviders
 * @apiGroup OutboundRoutes
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of providers
 * @apiSuccess {String} data.uniqid Provider unique ID
 * @apiSuccess {String} data.name Provider name
 * @apiSuccess {Boolean} data.disabled Provider disabled status
 */
class GetProvidersAction
{
    /**
     * Get list of available providers
     * 
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $providers = Providers::find();
            $providersList = [];
            
            foreach ($providers as $provider) {
                $modelType = ucfirst($provider->type);
                $provByType = $provider->$modelType;
                
                $providersList[] = [
                    'uniqid' => $provider->uniqid,
                    'name' => $provider->getRepresent(),
                    'disabled' => (bool)$provByType->disabled
                ];
            }
            
            // Sort by name and disabled status
            usort($providersList, function($a, $b) {
                if ($a['disabled'] !== $b['disabled']) {
                    return $a['disabled'] ? 1 : -1;
                }
                return strcasecmp($a['name'], $b['name']);
            });
            
            $res->data = $providersList;
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

#### 1.4 REST API Controller

**File**: `src/PBXCoreREST/Controllers/OutboundRoutes/OutboundRoutesController.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Controllers\OutboundRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * Outbound Routes REST API Controller
 */
class OutboundRoutesController extends BaseController
{
    /**
     * Get outbound route record
     * 
     * @param string|null $id
     */
    public function getRecordAction(string $id = null): void
    {
        $this->sendRequestToBackend(
            \MikoPBX\PBXCoreREST\Lib\OutboundRoutes\GetRecordAction::class,
            [$id]
        );
    }
    
    /**
     * Get list of all outbound routes
     */
    public function getListAction(): void
    {
        $this->sendRequestToBackend(
            \MikoPBX\PBXCoreREST\Lib\OutboundRoutes\GetListAction::class,
            [$this->request->getQuery()]
        );
    }
    
    /**
     * Save outbound route record
     */
    public function saveRecordAction(): void
    {
        $data = $this->request->getPost();
        
        // Get ID from route parameters if it's an update
        $id = $this->dispatcher->getParam('id');
        if ($id) {
            $data['id'] = $id;
        }
        
        $this->sendRequestToBackend(
            \MikoPBX\PBXCoreREST\Lib\OutboundRoutes\SaveRecordAction::class,
            [$data]
        );
    }
    
    /**
     * Delete outbound route record
     * 
     * @param string $id
     */
    public function deleteRecordAction(string $id): void
    {
        $this->sendRequestToBackend(
            \MikoPBX\PBXCoreREST\Lib\OutboundRoutes\DeleteRecordAction::class,
            [$id]
        );
    }
    
    /**
     * Change routes priority
     */
    public function changePriorityAction(): void
    {
        $priorityTable = $this->request->getPost();
        
        $this->sendRequestToBackend(
            \MikoPBX\PBXCoreREST\Lib\OutboundRoutes\ChangePriorityAction::class,
            [$priorityTable]
        );
    }
    
    /**
     * Get available providers
     */
    public function getProvidersAction(): void
    {
        $this->sendRequestToBackend(
            \MikoPBX\PBXCoreREST\Lib\OutboundRoutes\GetProvidersAction::class,
            []
        );
    }
}
```

### Stage 2: JavaScript Client Development

#### 2.1 New JavaScript Files

**File**: `sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-routes-api.js`
```javascript
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi */

/**
 * outboundRoutesAPI - Module for REST API interaction
 * @module outboundRoutesAPI
 */
const outboundRoutesAPI = {
    
    /**
     * Get all outbound routes
     * @param {Function} callback - Callback function
     */
    getList(callback) {
        $.api({
            url: `${PbxApi.apiUrl}/pbxcore/api/v2/outbound-routes/getList`,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(true, response.data);
            },
            onFailure(response) {
                callback(false, response);
            },
            onError(errorMessage, element, xhr) {
                callback(false, xhr);
            },
        });
    },
    
    /**
     * Get outbound route record by ID
     * @param {string} id - Record ID or 'new'
     * @param {Function} callback - Callback function
     */
    getRecord(id, callback) {
        const url = id ? `${PbxApi.apiUrl}/pbxcore/api/v2/outbound-routes/getRecord/${id}` 
                      : `${PbxApi.apiUrl}/pbxcore/api/v2/outbound-routes/getRecord`;
        
        $.api({
            url: url,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(true, response.data);
            },
            onFailure(response) {
                callback(false, response);
            },
            onError(errorMessage, element, xhr) {
                callback(false, xhr);
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
            ? `${PbxApi.apiUrl}/pbxcore/api/v2/outbound-routes/saveRecord/${record.id}`
            : `${PbxApi.apiUrl}/pbxcore/api/v2/outbound-routes/saveRecord`;
        
        $.api({
            url: url,
            on: 'now',
            method: method,
            data: record,
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(true, response);
            },
            onFailure(response) {
                callback(false, response);
            },
            onError(errorMessage, element, xhr) {
                callback(false, xhr);
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
            url: `${PbxApi.apiUrl}/pbxcore/api/v2/outbound-routes/deleteRecord/${id}`,
            on: 'now',
            method: 'DELETE',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(true, response);
            },
            onFailure(response) {
                callback(false, response);
            },
            onError(errorMessage, element, xhr) {
                callback(false, xhr);
            },
        });
    },
    
    /**
     * Change routes priority
     * @param {Object} priorityData - Priority data
     * @param {Function} callback - Callback function
     */
    changePriority(priorityData, callback) {
        $.api({
            url: `${PbxApi.apiUrl}/pbxcore/api/v2/outbound-routes/changePriority`,
            on: 'now',
            method: 'POST',
            data: priorityData,
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(true, response);
            },
            onFailure(response) {
                callback(false, response);
            },
            onError(errorMessage, element, xhr) {
                callback(false, xhr);
            },
        });
    },
    
    /**
     * Get available providers
     * @param {Function} callback - Callback function
     */
    getProviders(callback) {
        $.api({
            url: `${PbxApi.apiUrl}/pbxcore/api/v2/outbound-routes/getProviders`,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(true, response.data);
            },
            onFailure(response) {
                callback(false, response);
            },
            onError(errorMessage, element, xhr) {
                callback(false, xhr);
            },
        });
    }
};
```

#### 2.2 Update Existing JavaScript Files

**Update**: `sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-routes-index.js`
```javascript
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, outboundRoutesAPI */

/**
 * Object for managing list of outbound routes
 *
 * @module outboundRoutes
 */
const outboundRoutes = {
    /**
     * jQuery object for the routes table
     * @type {jQuery}
     */
    $routingTable: $('#routingTable'),
    
    /**
     * Initializes the outbound routes list.
     */
    initialize() {
        // Load routes from API
        outboundRoutes.loadRoutes();
    },
    
    /**
     * Load routes from API and render table
     */
    loadRoutes() {
        outboundRoutesAPI.getList((success, data) => {
            if (success) {
                outboundRoutes.renderRoutesTable(data);
                outboundRoutes.initializeTableFeatures();
            } else {
                UserMessage.showError(globalTranslate.or_ErrorLoadingRoutes);
            }
        });
    },
    
    /**
     * Render routes table
     * @param {Array} routes - Array of route objects
     */
    renderRoutesTable(routes) {
        const $container = $('#outbound-routes-table-container');
        $container.empty();
        
        if (routes.length === 0) {
            outboundRoutes.renderEmptyTable($container);
            return;
        }
        
        let tableHtml = `
            <table class="ui selectable compact unstackable table" id="routingTable">
                <thead>
                    <tr>
                        <th></th>
                        <th>${globalTranslate.or_TableColumnName}</th>
                        <th>${globalTranslate.or_TableColumnRule}</th>
                        <th class="hide-on-mobile">${globalTranslate.or_TableColumnProvider}</th>
                        <th class="hide-on-mobile">${globalTranslate.or_TableColumnNote}</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        routes.forEach(rule => {
            const ruleDescription = outboundRoutes.getRuleDescription(rule);
            const disabledClass = rule.disabled ? 'disabled' : '';
            const negativeClass = !rule.provider ? 'ui negative' : '';
            
            tableHtml += `
                <tr class="rule-row ${negativeClass}" id="${rule.id}" data-value="${rule.priority}">
                    <td class="dragHandle"><i class="sort grey icon"></i></td>
                    <td class="${disabledClass}">${rule.rulename}</td>
                    <td class="${disabledClass}">${ruleDescription}</td>
                    <td class="${disabledClass} hide-on-mobile">${rule.provider || ''}</td>
                    <td class="${disabledClass} hide-on-mobile">
                        ${rule.note ? `<div class="ui basic icon button" data-content="${rule.note}" data-variation="wide" data-position="top right">
                            <i class="file text icon"></i>
                        </div>` : ''}
                    </td>
                    <td class="right aligned collapsing">
                        <div class="ui small basic icon buttons action-buttons">
                            <a href="${globalRootUrl}outbound-routes/modify/${rule.id}" class="ui button" data-tooltip="${globalTranslate.bt_Edit}">
                                <i class="icon pencil"></i>
                            </a>
                            <a href="${globalRootUrl}outbound-routes/modify?copy-source=${rule.id}" class="ui button" data-tooltip="${globalTranslate.bt_Copy}">
                                <i class="icon copy"></i>
                            </a>
                            <button class="ui button delete-route" data-id="${rule.id}" data-tooltip="${globalTranslate.bt_Delete}">
                                <i class="icon trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableHtml += `
                </tbody>
            </table>
            ${routes.length > 0 ? `<a href="${globalRootUrl}outbound-routes/modify" class="ui blue button">
                <i class="add circle icon"></i> ${globalTranslate.or_AddNewRule}
            </a>` : ''}
        `;
        
        $container.html(tableHtml);
    },
    
    /**
     * Get rule description based on pattern settings
     * @param {Object} rule - Rule object
     * @returns {string} Rule description
     */
    getRuleDescription(rule) {
        const numberbeginswith = rule.numberbeginswith || '';
        const restnumbers = parseInt(rule.restnumbers) || 0;
        
        if (!numberbeginswith && !rule.restnumbers) {
            return globalTranslate.or_RuleNotConfigured;
        } else if (!numberbeginswith && restnumbers < 0) {
            return globalTranslate.or_RuleAnyNumbers;
        } else if (!numberbeginswith && restnumbers > 0) {
            return globalTranslate.or_RuleDescriptionBeginEmpty.replace('{restnumbers}', restnumbers);
        } else {
            if (restnumbers > 0) {
                return globalTranslate.or_RuleDescription
                    .replace('{numberbeginswith}', numberbeginswith)
                    .replace('{restnumbers}', restnumbers);
            } else if (restnumbers === 0) {
                return globalTranslate.or_RuleDescriptionFullMatch.replace('{numberbeginswith}', numberbeginswith);
            } else if (restnumbers === -1) {
                return globalTranslate.or_RuleDescriptionBeginMatch.replace('{numberbeginswith}', numberbeginswith);
            }
        }
        return '';
    },
    
    /**
     * Render empty table placeholder
     * @param {jQuery} $container - Container element
     */
    renderEmptyTable($container) {
        const emptyHtml = `
            <div class="ui placeholder segment">
                <div class="ui icon header">
                    <i class="sign out alternate icon"></i>
                    ${globalTranslate.or_EmptyTableTitle}
                </div>
                <div class="inline">
                    <p>${globalTranslate.or_EmptyTableDescription}</p>
                    ${UserMessage.isAllowed('save') ? `<a href="${globalRootUrl}outbound-routes/modify" class="ui blue button">
                        <i class="add circle icon"></i> ${globalTranslate.or_AddNewRule}
                    </a>` : ''}
                </div>
            </div>
        `;
        $container.html(emptyHtml);
    },
    
    /**
     * Initialize table features after rendering
     */
    initializeTableFeatures() {
        // Initialize drag-and-drop
        outboundRoutes.$routingTable = $('#routingTable');
        if (outboundRoutes.$routingTable.length > 0) {
            outboundRoutes.$routingTable.tableDnD({
                onDrop: outboundRoutes.cbOnDrop,
                onDragClass: 'hoveringRow',
                dragHandle: '.dragHandle',
            });
        }
        
        // Initialize tooltips
        $('.ui.button[data-tooltip]').popup();
        $('.ui.basic.icon.button[data-content]').popup();
        
        // Double-click handler
        $('.rule-row td').off('dblclick').on('dblclick', (e) => {
            const id = $(e.target).closest('tr').attr('id');
            if (id) {
                window.location = `${globalRootUrl}outbound-routes/modify/${id}`;
            }
        });
        
        // Delete button handler
        $('.delete-route').off('click').on('click', (e) => {
            e.preventDefault();
            const id = $(e.currentTarget).data('id');
            outboundRoutes.deleteRoute(id);
        });
    },
    
    /**
     * Delete route with confirmation
     * @param {string} id - Route ID
     */
    deleteRoute(id) {
        const $row = $(`#${id}`);
        const ruleName = $row.find('td:nth-child(2)').text();
        
        UserMessage.showConfirm(
            globalTranslate.or_ConfirmDelete.replace('{0}', ruleName),
            globalTranslate.or_DeleteRoute,
            'warning',
            () => {
                outboundRoutesAPI.deleteRecord(id, (success, response) => {
                    if (success) {
                        if (response.redirect) {
                            window.location = `${globalRootUrl}${response.redirect}`;
                        } else {
                            outboundRoutes.loadRoutes();
                        }
                    } else {
                        UserMessage.showError(globalTranslate.or_ErrorDeletingRoute);
                    }
                });
            }
        );
    },

    /**
     * Callback function triggered when an outbound route is dropped in the list.
     */
    cbOnDrop() {
        let priorityWasChanged = false;
        const priorityData = {};
        $('.rule-row').each((index, obj) => {
            const ruleId = $(obj).attr('id');
            const oldPriority = parseInt($(obj).attr('data-value'), 10);
            const newPriority = obj.rowIndex;
            if (oldPriority !== newPriority) {
                priorityWasChanged = true;
                priorityData[ruleId] = newPriority;
            }
        });
        
        if (priorityWasChanged) {
            outboundRoutesAPI.changePriority(priorityData, (success) => {
                if (!success) {
                    UserMessage.showError(globalTranslate.or_ErrorChangingPriority);
                    // Reload to restore correct order
                    outboundRoutes.loadRoutes();
                }
            });
        }
    },
};

/**
 *  Initialize outbound routes table on document ready
 */
$(document).ready(() => {
    outboundRoutes.initialize();
});
```

**Update**: `sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-route-modify.js`
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

/* global globalRootUrl, globalTranslate, Form, outboundRoutesAPI */

/**
 * Object for managing outbound route settings
 *
 * @module outboundRoute
 */
const outboundRoute = {
    /**
     * jQuery object for the form.
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
     * Validation rules for the form fields before submission.
     *
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
     * Initializes the outbound route form.
     */
    initialize() {
        // Get route ID from form
        const routeId = outboundRoute.$formObj.form('get value', 'id') || 'new';
        
        // Load providers first
        outboundRoute.loadProviders(() => {
            // Then load route data
            outboundRoute.loadRouteData(routeId);
        });
        
        outboundRoute.initializeForm();
    },
    
    /**
     * Load available providers
     * @param {Function} callback - Callback after loading
     */
    loadProviders(callback) {
        outboundRoutesAPI.getProviders((success, providers) => {
            if (success) {
                outboundRoute.updateProvidersDropdown(providers);
            }
            if (callback) callback();
        });
    },
    
    /**
     * Update providers dropdown
     * @param {Array} providers - Array of provider objects
     */
    updateProvidersDropdown(providers) {
        outboundRoute.$providerDropDown.empty();
        outboundRoute.$providerDropDown.append('<option value=""></option>');
        
        providers.forEach(provider => {
            const disabledText = provider.disabled ? ` (${globalTranslate.mo_Disabled})` : '';
            outboundRoute.$providerDropDown.append(
                `<option value="${provider.uniqid}">${provider.name}${disabledText}</option>`
            );
        });
        
        outboundRoute.$providerDropDown.dropdown();
    },
    
    /**
     * Load route data from API
     * @param {string} routeId - Route ID or 'new'
     */
    loadRouteData(routeId) {
        outboundRoutesAPI.getRecord(routeId, (success, data) => {
            if (success) {
                outboundRoute.routeData = data;
                outboundRoute.populateForm(data);
            } else if (routeId !== 'new') {
                UserMessage.showError(globalTranslate.or_ErrorLoadingRoute);
            }
        });
    },
    
    /**
     * Populate form with route data
     * @param {Object} data - Route data
     */
    populateForm(data) {
        outboundRoute.$formObj.form('set values', {
            id: data.id || '',
            rulename: data.rulename || '',
            providerid: data.providerid || '',
            priority: data.priority || '',
            numberbeginswith: data.numberbeginswith || '',
            restnumbers: data.restnumbers || '',
            trimfrombegin: data.trimfrombegin || '0',
            prepend: data.prepend || '',
            note: data.note || ''
        });
        
        // Update page title
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
        
        // Use REST API instead of old controller
        result.url = `${globalRootUrl}pbxcore/api/v2/outbound-routes/saveRecord`;
        if (result.data.id) {
            result.url += `/${result.data.id}`;
            result.method = 'PUT';
        } else {
            result.method = 'POST';
        }
        
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        if (response.reload) {
            window.location = `${globalRootUrl}${response.reload}`;
        }
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = outboundRoute.$formObj;
        Form.url = `${globalRootUrl}outbound-routes/save`; // Will be overridden in cbBeforeSendForm
        Form.validateRules = outboundRoute.validateRules;
        Form.cbBeforeSendForm = outboundRoute.cbBeforeSendForm;
        Form.cbAfterSendForm = outboundRoute.cbAfterSendForm;
        Form.initialize();
    },
};

/**
 *  Initialize outbound route settings form on document ready
 */
$(document).ready(() => {
    outboundRoute.initialize();
});
```

### Stage 3: Adapting AdminCabinet Controllers

#### 3.1 Modify OutboundRoutesController

**File**: `src/AdminCabinet/Controllers/OutboundRoutesController.php`

The controller needs to be updated to work with the REST API while maintaining backward compatibility:

```php
<?php

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\OutgoingRouteEditForm;
use MikoPBX\Common\Models\{OutgoingRoutingTable, Providers};
use Phalcon\Filter\Filter;

class OutboundRoutesController extends BaseController
{
    /**
     * Builds the list of outgoing routes
     * This method now serves as a view renderer only, data is loaded via REST API
     */
    public function indexAction(): void
    {
        // Just render the view, JavaScript will load data via API
        $this->view->routingTable = []; // Empty array for initial render
    }

    /**
     * Shows the edit form for an outbound route
     *
     * @param string $ruleId The ID of the routing rule to edit.
     */
    public function modifyAction(string $ruleId = ''): void
    {
        // Handle copy-source parameter
        $idIsEmpty = false;
        if (empty($ruleId)) {
            $idIsEmpty = true;
            $ruleId = $this->request->get('copy-source', Filter::FILTER_INT, '');
        }

        // For new routes or copies, provide empty form
        if (empty($ruleId) || $idIsEmpty) {
            $rule = new OutgoingRoutingTable();
            $rule->id = '';
            $rule->priority = '999'; // Default high priority
            $rule->restnumbers = '9';
            $rule->trimfrombegin = '0';
        } else {
            // For existing routes, just set the ID
            // JavaScript will load the data via API
            $rule = new OutgoingRoutingTable();
            $rule->id = $ruleId;
        }

        // Provide empty providers list, will be loaded via API
        $providersList = [];

        $this->view->form = new OutgoingRouteEditForm($rule, $providersList);
        $this->view->represent = '';
    }

    /**
     * Legacy save action - redirects to REST API
     * Kept for backward compatibility
     */
    public function saveAction(): void
    {
        // This action is now handled by REST API
        // Redirect to index if called directly
        $this->forward('outbound-routes/index');
    }

    /**
     * Legacy delete action - redirects to REST API
     * Kept for backward compatibility
     *
     * @param string $id The ID of the outgoing route to delete.
     */
    public function deleteAction(string $id = ''): void
    {
        // This action is now handled by REST API
        // Redirect to index if called directly
        $this->forward('outbound-routes/index');
    }

    /**
     * Legacy change priority action - redirects to REST API
     * Kept for backward compatibility
     */
    public function changePriorityAction(): void
    {
        $this->view->disable();
        echo json_encode(['error' => 'Use REST API']);
    }
}
```

### Stage 4: View Templates Updates

The existing view templates need minimal changes since most functionality moves to JavaScript:

#### 4.1 Update index.volt

**File**: `src/AdminCabinet/Views/OutboundRoutes/index.volt`

```volt
<div id="outbound-routes-table-container">
    <!-- Table will be rendered here by JavaScript -->
    <div class="ui active inverted dimmer">
        <div class="ui text loader">{{ t._('Loading') }}</div>
    </div>
</div>

<script type="text/javascript">
    // Pass translations to JavaScript
    const globalTranslate = {
        or_TableColumnName: '{{ t._('or_TableColumnName') }}',
        or_TableColumnRule: '{{ t._('or_TableColumnRule') }}',
        or_TableColumnProvider: '{{ t._('or_TableColumnProvider') }}',
        or_TableColumnNote: '{{ t._('or_TableColumnNote') }}',
        or_AddNewRule: '{{ t._('or_AddNewRule') }}',
        or_EmptyTableTitle: '{{ t._('or_EmptyTableTitle') }}',
        or_EmptyTableDescription: '{{ t._('or_EmptyTableDescription') }}',
        or_RuleNotConfigured: '{{ t._('or_RuleNotConfigured') }}',
        or_RuleAnyNumbers: '{{ t._('or_RuleAnyNumbers') }}',
        or_RuleDescriptionBeginEmpty: '{{ t._('or_RuleDescriptionBeginEmpty') }}',
        or_RuleDescription: '{{ t._('or_RuleDescription') }}',
        or_RuleDescriptionFullMatch: '{{ t._('or_RuleDescriptionFullMatch') }}',
        or_RuleDescriptionBeginMatch: '{{ t._('or_RuleDescriptionBeginMatch') }}',
        or_ErrorLoadingRoutes: '{{ t._('or_ErrorLoadingRoutes') }}',
        or_ErrorDeletingRoute: '{{ t._('or_ErrorDeletingRoute') }}',
        or_ErrorChangingPriority: '{{ t._('or_ErrorChangingPriority') }}',
        or_ConfirmDelete: '{{ t._('or_ConfirmDelete') }}',
        or_DeleteRoute: '{{ t._('or_DeleteRoute') }}',
        bt_Edit: '{{ t._('bt_Edit') }}',
        bt_Copy: '{{ t._('bt_Copy') }}',
        bt_Delete: '{{ t._('bt_Delete') }}',
        mo_Disabled: '{{ t._('mo_Disabled') }}'
    };
    
    // Check if user has save permission
    const UserMessage = {
        isAllowed: function(action) {
            return {{ isAllowed('save') ? 'true' : 'false' }};
        },
        showError: function(message) {
            // Implement error display
            console.error(message);
        },
        showConfirm: function(message, title, type, callback) {
            if (confirm(message)) {
                callback();
            }
        }
    };
</script>
```

#### 4.2 Update modify.volt

No significant changes needed to `modify.volt` as it already works with the form object and JavaScript handles the data loading and submission.

### Stage 5: REST API Routes Configuration

Add routes for the new REST API endpoints:

**File**: `src/PBXCoreREST/Config/RouterProvider.php` (add to existing routes)

```php
// Outbound Routes API v2
$routes[] = [
    'method' => 'get',
    'route' => '/api/v2/outbound-routes/getList',
    'handler' => [OutboundRoutesController::class, 'getListAction']
];

$routes[] = [
    'method' => 'get', 
    'route' => '/api/v2/outbound-routes/getRecord[/{id}]',
    'handler' => [OutboundRoutesController::class, 'getRecordAction']
];

$routes[] = [
    'method' => 'post',
    'route' => '/api/v2/outbound-routes/saveRecord',
    'handler' => [OutboundRoutesController::class, 'saveRecordAction']
];

$routes[] = [
    'method' => 'put',
    'route' => '/api/v2/outbound-routes/saveRecord/{id}',
    'handler' => [OutboundRoutesController::class, 'saveRecordAction']
];

$routes[] = [
    'method' => 'delete',
    'route' => '/api/v2/outbound-routes/deleteRecord/{id}',
    'handler' => [OutboundRoutesController::class, 'deleteRecordAction']
];

$routes[] = [
    'method' => 'post',
    'route' => '/api/v2/outbound-routes/changePriority',
    'handler' => [OutboundRoutesController::class, 'changePriorityAction']
];

$routes[] = [
    'method' => 'get',
    'route' => '/api/v2/outbound-routes/getProviders',
    'handler' => [OutboundRoutesController::class, 'getProvidersAction']
];
```

### Stage 6: Testing Plan

#### 6.1 Unit Tests

Create unit tests for new Action classes:

**File**: `tests/Unit/PBXCoreREST/Lib/OutboundRoutes/GetListActionTest.php`
```php
<?php

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\PBXCoreREST\Lib\OutboundRoutes\GetListAction;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class GetListActionTest extends AbstractUnitTest
{
    public function testGetList()
    {
        $result = GetListAction::main();
        
        $this->assertTrue($result->success);
        $this->assertIsArray($result->data);
        
        if (count($result->data) > 0) {
            $firstRoute = $result->data[0];
            $this->assertArrayHasKey('id', $firstRoute);
            $this->assertArrayHasKey('priority', $firstRoute);
            $this->assertArrayHasKey('rulename', $firstRoute);
            $this->assertArrayHasKey('provider', $firstRoute);
        }
    }
}
```

#### 6.2 API Integration Tests

Test REST API endpoints:

```php
<?php

namespace MikoPBX\Tests\Integration\PBXCoreREST\Controllers\OutboundRoutes;

use MikoPBX\Tests\Integration\AbstractRestApiTest;

class OutboundRoutesControllerTest extends AbstractRestApiTest
{
    public function testFullCycle()
    {
        // 1. Get list (should be empty or have existing routes)
        $response = $this->apiClient->get('/pbxcore/api/v2/outbound-routes/getList');
        $this->assertTrue($response['result']);
        $initialCount = count($response['data']);
        
        // 2. Create new route
        $newRoute = [
            'rulename' => 'Test Route',
            'providerid' => 'test-provider-id',
            'numberbeginswith' => '7',
            'restnumbers' => '10',
            'trimfrombegin' => '1',
            'prepend' => '8',
            'note' => 'Test note'
        ];
        
        $response = $this->apiClient->post('/pbxcore/api/v2/outbound-routes/saveRecord', $newRoute);
        $this->assertTrue($response['result']);
        $routeId = $response['data']['id'];
        
        // 3. Get created route
        $response = $this->apiClient->get("/pbxcore/api/v2/outbound-routes/getRecord/{$routeId}");
        $this->assertTrue($response['result']);
        $this->assertEquals('Test Route', $response['data']['rulename']);
        
        // 4. Update route
        $updateData = ['rulename' => 'Updated Test Route'];
        $response = $this->apiClient->put("/pbxcore/api/v2/outbound-routes/saveRecord/{$routeId}", $updateData);
        $this->assertTrue($response['result']);
        
        // 5. Delete route
        $response = $this->apiClient->delete("/pbxcore/api/v2/outbound-routes/deleteRecord/{$routeId}");
        $this->assertTrue($response['result']);
        
        // 6. Verify deletion
        $response = $this->apiClient->get('/pbxcore/api/v2/outbound-routes/getList');
        $this->assertEquals($initialCount, count($response['data']));
    }
}
```

#### 6.3 Browser Testing Scenarios

1. **List Page**:
   - Load page and verify routes are displayed
   - Test drag-and-drop priority reordering
   - Test delete functionality with confirmation
   - Test navigation to edit page

2. **Edit/Create Page**:
   - Create new route with all fields
   - Edit existing route
   - Test form validation
   - Test provider dropdown loading
   - Test copy functionality

3. **API Error Handling**:
   - Test behavior when API is unavailable
   - Test validation errors display
   - Test concurrent editing scenarios

### Stage 7: Migration Steps

1. **Deploy Backend**:
   - Deploy new Action classes
   - Deploy REST controller
   - Update routes configuration

2. **Deploy Frontend**:
   - Deploy new JavaScript API module
   - Deploy updated JavaScript files
   - Deploy updated controller

3. **Testing**:
   - Run unit tests
   - Run integration tests
   - Perform manual browser testing

4. **Rollback Plan**:
   - Keep old controller methods for backward compatibility
   - Can revert JavaScript changes if issues arise
   - Database structure remains unchanged

## Summary

This migration plan provides a complete REST API implementation for OutboundRoutes while maintaining the existing user interface and workflow. The implementation follows MikoPBX architecture patterns and ensures smooth transition with minimal user impact.

### Key Benefits:
1. **Unified API**: All CRUD operations through REST API
2. **Better Testing**: Easier to test business logic separately
3. **Modern Architecture**: Follows current MikoPBX patterns
4. **Backward Compatibility**: Old URLs still work
5. **Improved Maintainability**: Clear separation of concerns

### Files to be Created:
1. `src/PBXCoreREST/Lib/OutboundRoutes/DataStructure.php`
2. `src/PBXCoreREST/Lib/OutboundRoutes/GetRecordAction.php`
3. `src/PBXCoreREST/Lib/OutboundRoutes/GetListAction.php`
4. `src/PBXCoreREST/Lib/OutboundRoutes/SaveRecordAction.php`
5. `src/PBXCoreREST/Lib/OutboundRoutes/DeleteRecordAction.php`
6. `src/PBXCoreREST/Lib/OutboundRoutes/ChangePriorityAction.php`
7. `src/PBXCoreREST/Lib/OutboundRoutes/GetProvidersAction.php`
8. `src/PBXCoreREST/Controllers/OutboundRoutes/OutboundRoutesController.php`
9. `sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-routes-api.js`

### Files to be Modified:
1. `src/AdminCabinet/Controllers/OutboundRoutesController.php`
2. `sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-routes-index.js`
3. `sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-route-modify.js`
4. `src/AdminCabinet/Views/OutboundRoutes/index.volt`
5. `src/PBXCoreREST/Config/RouterProvider.php`

### Database Changes:
None required - existing model structure is maintained