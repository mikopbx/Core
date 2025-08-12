# MikoPBX Asterisk Managers (AMI Users) REST API v2 Migration Plan

## Project Overview

This document contains a detailed plan for migrating the MikoPBX Asterisk Manager Interface (AMI) users management system to the unified REST API v2 architecture. The plan follows the modern patterns established in Incoming Routes and Outbound Routes implementations, utilizing PHP 8.3 features, abstract base classes, and simplified controller architecture.

## Current State

### Existing Architecture
- **Model**: `src/Common/Models/AsteriskManagerUsers.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/AsteriskManagersController.php`
- **Form**: `src/AdminCabinet/Forms/AsteriskManagerEditForm.php`
- **No existing REST API**: Only traditional web controller actions
- **JavaScript**: Basic list functionality and form validation

### AsteriskManagerUsers Model Fields
```php
public ?int $id = null;               // Primary key
public ?string $username = null;      // AMI username
public ?string $secret = null;        // AMI password
public ?string $call = null;         // Call permission (read/write)
public ?string $cdr = null;          // CDR permission (read/write)
public ?string $originate = null;    // Originate permission (read/write)
public ?string $reporting = null;    // Reporting permission (read/write)
public ?string $agent = null;        // Agent permission (read/write)
public ?string $config = null;       // Config permission (read/write)
public ?string $dialplan = null;     // Dialplan permission (read/write)
public ?string $dtmf = null;         // DTMF permission (read/write)
public ?string $log = null;          // Log permission (read/write)
public ?string $system = null;       // System permission (read/write)
public ?string $user = null;         // User permission (read/write)
public ?string $verbose = null;      // Verbose permission (read/write)
public ?string $command = null;      // Command permission (read/write)
public ?string $networkfilterid = null; // Network filter ID
public ?string $description = null;  // Description
public ?string $weakSecret = null;   // Weak password status (0/1/2)
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

### Stage 1: Creating REST API v2 Backend

#### 1.1 Data Structure Class

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/DataStructure.php`
```php
<?php
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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for AMI users
 * 
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskManagers
 */
class DataStructure extends AbstractDataStructure
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
     * Create complete data array from AsteriskManagerUsers model
     * 
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        $data = [
            'id' => (string)$model->id,
            'uniqid' => $model->uniqid ?? '',
            'username' => $model->username ?? '',
            'secret' => $model->secret ?? '',
            'networkfilterid' => $model->networkfilterid ?? '',
            'description' => $model->description ?? '',
            'weakSecret' => $model->weakSecret ?? '0',
            'permissions' => self::buildPermissions($model)
        ];
        
        // Add network filter representation
        if (!empty($model->networkfilterid)) {
            $networkFilter = NetworkFilters::findFirstById($model->networkfilterid);
            $data['networkFilterRepresent'] = $networkFilter ? $networkFilter->getRepresent() : '';
        } else {
            $data['networkFilterRepresent'] = '';
        }
        
        // Handle null values for consistent JSON output
        return self::handleNullValues($data, ['username', 'secret', 'description']);
    }
    
    /**
     * Create simplified data array for list view
     * 
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array
     */
    public static function createForList($model): array
    {
        $data = [
            'id' => (string)$model->id,
            'uniqid' => $model->uniqid ?? '',
            'username' => $model->username ?? '',
            'description' => $model->description ?? '',
            'permissions' => self::buildPermissions($model),
            'permissionSummary' => self::getPermissionSummary($model)
        ];
        
        // Add network filter name for display
        if (!empty($model->networkfilterid)) {
            $networkFilter = NetworkFilters::findFirstById($model->networkfilterid);
            $data['networkFilterName'] = $networkFilter ? $networkFilter->getRepresent() : '';
        } else {
            $data['networkFilterName'] = '';
        }
        
        return self::handleNullValues($data, ['username', 'description']);
    }
    
    /**
     * Create data structure for dropdown/select options
     * 
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array
     */
    public static function createForSelect($model): array
    {
        return [
            'id' => (string)$model->id,
            'uniqid' => $model->uniqid ?? '',
            'username' => $model->username ?? '',
            'represent' => $model->username ?? ''
        ];
    }
    
    /**
     * Build permissions array from model
     * 
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array
     */
    private static function buildPermissions($model): array
    {
        $permissions = [];
        
        foreach (self::$permissionFields as $field) {
            $value = $model->$field ?? '';
            $permissions[$field] = [
                'read' => str_contains($value, 'read'),
                'write' => str_contains($value, 'write')
            ];
        }
        
        return $permissions;
    }
    
    /**
     * Get permission summary for list display
     * 
     * @param \MikoPBX\Common\Models\AsteriskManagerUsers $model
     * @return array
     */
    private static function getPermissionSummary($model): array
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

#### 1.2 Action Classes

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/GetRecordAction.php`
```php
<?php
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

declare(strict_types=1);

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
 */
class GetRecordAction
{
    /**
     * Get AMI user record
     * 
     * @param string|null $id Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id) || $id === 'new') {
            // Create structure for new record
            $newUser = new AsteriskManagerUsers();
            $newUser->id = null;
            $newUser->username = '';
            $newUser->secret = AsteriskManagerUsers::generateAMIPassword();
            $newUser->networkfilterid = '';
            $newUser->description = '';
            $newUser->weakSecret = '0';
            
            // Initialize all permissions to empty
            foreach (self::getPermissionFields() as $perm) {
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
    
    /**
     * Get permission fields list
     * 
     * @return array
     */
    private static function getPermissionFields(): array
    {
        return ['call', 'cdr', 'originate', 'reporting', 'agent', 
                'config', 'dialplan', 'dtmf', 'log', 'system', 
                'user', 'verbose', 'command'];
    }
}
```

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/GetListAction.php`
```php
<?php
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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;

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
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Get list of all AMI users
     * 
     * @param array $data Filter parameters (search, ordering, pagination)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        // Override default ordering to use username
        if (!isset($data['order'])) {
            $data['order'] = 'username';
            $data['orderWay'] = 'asc';
        }
        
        return self::executeStandardList(
            AsteriskManagerUsers::class,      // Model class
            DataStructure::class,             // DataStructure class
            $data,                           // Request parameters
            [],                             // Base query options
            false,                          // Use createForList() for better performance
            ['username', 'id'],             // Allowed order fields
            ['username', 'description']     // Searchable fields
        );
    }
}
```

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/SaveRecordAction.php`
```php
<?php
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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

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
     * 
     * @param array $data Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Validate required fields
        if (empty($data['username'])) {
            $res->messages['error'][] = 'AMI username is required';
            return $res;
        }
        
        if (empty($data['secret'])) {
            $res->messages['error'][] = 'AMI password is required';
            return $res;
        }
        
        if (strlen($data['secret']) < 8) {
            $res->messages['error'][] = 'Password must be at least 8 characters long';
            return $res;
        }
        
        try {
            // Get or create model
            if (!empty($data['id'])) {
                $user = AsteriskManagerUsers::findFirstById($data['id']);
                if (!$user) {
                    $res->messages['error'][] = 'AMI user not found';
                    return $res;
                }
            } else {
                $user = new AsteriskManagerUsers();
            }
            
            // Check username uniqueness
            $existing = AsteriskManagerUsers::findFirst([
                'conditions' => 'username = :username: AND id != :id:',
                'bind' => [
                    'username' => $data['username'],
                    'id' => $user->id ?? 0
                ]
            ]);
            
            if ($existing) {
                $res->messages['error'][] = 'Username already exists';
                return $res;
            }
            
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
                $res->messages['error'] = $user->getMessages();
                return $res;
            }
            
            $res->data = DataStructure::createFromModel($user);
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/DeleteRecordAction.php`
```php
<?php
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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

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
 */
class DeleteRecordAction
{
    /**
     * Delete AMI user record
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
            // Find record
            $user = AsteriskManagerUsers::findFirstById($id);
            
            if (!$user) {
                $res->messages['error'][] = 'AMI user not found';
                return $res;
            }
            
            if (!$user->delete()) {
                $res->messages['error'] = $user->getMessages();
                return $res;
            }
            
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

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/CheckUsernameAction.php`
```php
<?php
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

declare(strict_types=1);

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
     * @param string $username Username to check
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
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/AsteriskManagers/GeneratePasswordAction.php`
```php
<?php
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

declare(strict_types=1);

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
        
        $password = AsteriskManagerUsers::generateAMIPassword();
        
        $res->data = ['password' => $password];
        $res->success = true;
        
        return $res;
    }
}
```

#### 1.3 Management Processor with Enum

**File**: `src/PBXCoreREST/Lib/AsteriskManagersManagementProcessor.php`
```php
<?php
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
 * Available actions for AMI users management
 */
enum AsteriskManagerAction: string
{
    case GET_RECORD = 'getRecord';
    case GET_LIST = 'getList';
    case SAVE_RECORD = 'saveRecord';
    case DELETE_RECORD = 'deleteRecord';
    case CHECK_USERNAME = 'checkUsername';
    case GENERATE_PASSWORD = 'generatePassword';
}

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
 */
class AsteriskManagersManagementProcessor extends Injectable
{
    /**
     * Process AMI user management requests
     *
     * @param array $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        $data = $request['data'];
        
        // Try to match action with enum
        $action = AsteriskManagerAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        $res = match ($action) {
            AsteriskManagerAction::GET_RECORD => GetRecordAction::main($data['id'] ?? null),
            AsteriskManagerAction::GET_LIST => GetListAction::main($data),
            AsteriskManagerAction::SAVE_RECORD => SaveRecordAction::main($data),
            AsteriskManagerAction::DELETE_RECORD => DeleteRecordAction::main($data['id'] ?? ''),
            AsteriskManagerAction::CHECK_USERNAME => CheckUsernameAction::main($data['id'] ?? ''), // ID contains username for route parameter
            AsteriskManagerAction::GENERATE_PASSWORD => GeneratePasswordAction::main(),
        };

        $res->function = $actionString;
        return $res;
    }
}
```

#### 1.4 REST API Controllers

**File**: `src/PBXCoreREST/Controllers/AsteriskManagers/GetController.php`
```php
<?php
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

namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagersManagementProcessor;

/**
 * GET controller for AMI users management
 * 
 * @RoutePrefix("/pbxcore/api/v2/asterisk-managers")
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
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        $requestData = $this->request->get();
        
        if (!empty($id)) {
            $requestData['id'] = $id;
        }
        
        $this->sendRequestToBackendWorker(
            AsteriskManagersManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
```

**File**: `src/PBXCoreREST/Controllers/AsteriskManagers/PostController.php`
```php
<?php
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

namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagersManagementProcessor;

/**
 * POST controller for AMI users management
 * 
 * @RoutePrefix("/pbxcore/api/v2/asterisk-managers")
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
     * Creates AMI user record
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

**File**: `src/PBXCoreREST/Controllers/AsteriskManagers/PutController.php`
```php
<?php
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

namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagersManagementProcessor;

/**
 * PUT controller for AMI users management
 * 
 * @RoutePrefix("/pbxcore/api/v2/asterisk-managers")
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

**File**: `src/PBXCoreREST/Controllers/AsteriskManagers/DeleteController.php`
```php
<?php
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

namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagersManagementProcessor;

/**
 * DELETE controller for AMI users management
 * 
 * @RoutePrefix("/pbxcore/api/v2/asterisk-managers")
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

### Stage 2: Update JavaScript Client

#### 2.1 Create API Module

**File**: `sites/admin-cabinet/assets/js/src/PbxAPI/asteriskManagersAPI.js`
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

/* global globalRootUrl, PbxApi, Config */

/**
 * AsteriskManagersAPI - REST API v2 for AMI users management
 */
const AsteriskManagersAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/asterisk-managers/`,
    
    /**
     * Get record by ID
     * @param {string} id - Record ID or empty string for new
     * @param {function} callback - Callback function
     */
    getRecord(id, callback) {
        const recordId = (!id || id === '') ? 'new' : id;
        
        $.api({
            url: `${this.apiUrl}getRecord/${recordId}`,
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
            url: `${this.apiUrl}getList`,
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
            `${this.apiUrl}saveRecord/${data.id}` : 
            `${this.apiUrl}saveRecord`;
        
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
            url: `${this.apiUrl}deleteRecord/${id}`,
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
            url: `${this.apiUrl}checkUsername/${username}`,
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
            url: `${this.apiUrl}generatePassword`,
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

### Stage 3: REST API Routes Registration

**Update file**: `src/PBXCoreREST/Providers/RouterProvider.php`

Add to routes array in `getRoutes()` method:
```php
// Asterisk Managers routes
[
    AsteriskManagers\GetController::class, 
    'callAction', 
    '/pbxcore/api/v2/asterisk-managers/{actionName}', 
    'get', 
    '/'
],
[
    AsteriskManagers\GetController::class, 
    'callAction', 
    '/pbxcore/api/v2/asterisk-managers/{actionName}/{id:[a-zA-Z0-9_\\-]+}', 
    'get', 
    '/'
],
[
    AsteriskManagers\PostController::class, 
    'callAction', 
    '/pbxcore/api/v2/asterisk-managers/{actionName}', 
    'post', 
    '/'
],
[
    AsteriskManagers\PutController::class, 
    'callAction', 
    '/pbxcore/api/v2/asterisk-managers/{actionName}/{id:[0-9]+}', 
    'put', 
    '/'
],
[
    AsteriskManagers\DeleteController::class, 
    'callAction', 
    '/pbxcore/api/v2/asterisk-managers/{actionName}/{id:[0-9]+}', 
    'delete', 
    '/'
],
```

## New Files to Create

1. `src/PBXCoreREST/Lib/AsteriskManagers/DataStructure.php`
2. `src/PBXCoreREST/Lib/AsteriskManagers/GetRecordAction.php`
3. `src/PBXCoreREST/Lib/AsteriskManagers/GetListAction.php`
4. `src/PBXCoreREST/Lib/AsteriskManagers/SaveRecordAction.php`
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

1. `src/PBXCoreREST/Providers/RouterProvider.php` - Add new routes
2. `sites/admin-cabinet/assets/js/src/AsteriskManagers/manager-modify.js` - Update to use REST API
3. `sites/admin-cabinet/assets/js/src/AsteriskManagers/managers-index.js` - Update to use REST API
4. `src/AdminCabinet/Controllers/AsteriskManagersController.php` - Simplify to use REST API

## Key Improvements in v2 Architecture

### 1. Modern PHP 8.3 Features
- **Enums** for action definitions providing type safety
- **Match expressions** replacing verbose switch statements
- **Typed properties** and **strict types** throughout
- **Null-safe operators** for cleaner code

### 2. Abstract Base Classes
- **AbstractDataStructure** - Unified data transformation patterns
- **AbstractGetListAction** - Standard list operations with search, ordering, pagination
- Eliminates code duplication between modules

### 3. Simplified Architecture
- **Static action methods** - No dependency injection needed in actions
- **Minimal controllers** - Just pass data to processors
- **Clear separation** - Controllers → Processors → Actions → Data

### 4. Enhanced Data Management
- **createFromModel()** - Full data for edit forms
- **createForList()** - Optimized data for lists
- **createForSelect()** - Minimal data for dropdowns
- **Consistent null handling** - Empty strings instead of nulls in JSON

### 5. CSRF Protection
- Built-in CSRF protection in all controllers
- Secure by default approach

## Testing

### REST API Endpoints
```bash
# Get list of AMI users
curl http://127.0.0.1/pbxcore/api/v2/asterisk-managers/getList

# Get specific AMI user
curl http://127.0.0.1/pbxcore/api/v2/asterisk-managers/getRecord/123

# Create new AMI user
curl -X POST http://127.0.0.1/pbxcore/api/v2/asterisk-managers/saveRecord \
  -d "username=testuser&secret=SecurePass123&call_read=1&call_write=1"

# Update AMI user
curl -X PUT http://127.0.0.1/pbxcore/api/v2/asterisk-managers/saveRecord/123 \
  -d "username=updateduser&secret=NewSecurePass123"

# Delete AMI user
curl -X DELETE http://127.0.0.1/pbxcore/api/v2/asterisk-managers/deleteRecord/123

# Check username availability
curl http://127.0.0.1/pbxcore/api/v2/asterisk-managers/checkUsername/testuser

# Generate secure password
curl http://127.0.0.1/pbxcore/api/v2/asterisk-managers/generatePassword
```

## Expected Results

After implementing this plan, the AMI users management system will:

- ✅ Use modern REST API v2 architecture with enums and match expressions
- ✅ Leverage abstract base classes for consistent patterns
- ✅ Support full CRUD operations via REST API
- ✅ Implement CSRF protection by default
- ✅ Use optimized data structures for different contexts
- ✅ Follow PHP 8.3 best practices
- ✅ Maintain backward compatibility with existing UI
- ✅ Be ready for external integrations
- ✅ Comply with MikoPBX v2 architectural principles

## Performance Optimizations

1. **Optimized List Views** - Using `createForList()` excludes heavy fields
2. **Efficient Queries** - Standard patterns in `AbstractGetListAction`
3. **Minimal Data Transfer** - Different data structures for different needs
4. **Lazy Loading** - Network filters loaded only when needed

## Security Enhancements

1. **CSRF Protection** - Enabled by default in all controllers
2. **Input Validation** - At controller and action levels
3. **SQL Injection Prevention** - Using bound parameters
4. **Password Security** - Minimum length enforcement, secure generation
5. **Username Validation** - Real-time uniqueness checking

## Migration Path

1. Implement REST API v2 backend (Stage 1)
2. Update JavaScript to use new API (Stage 2)
3. Register routes in RouterProvider (Stage 3)
4. Test all endpoints
5. Update AdminCabinet controllers to use REST API
6. Deprecate old direct model access
7. Remove legacy code in next major version