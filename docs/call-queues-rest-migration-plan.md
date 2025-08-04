# MikoPBX Call Queues REST API Migration Plan

## Project Overview

This document contains a detailed plan for adapting the MikoPBX call queue management system to use a unified REST API architecture. The plan is based on the guide `docs/mikopbx-rest-migration-guide.md` and follows the principles of minimal changes to the user interface.

## Current State

### Existing Architecture
- **Model**: `src/Common/Models/CallQueues.php` and `src/Common/Models/CallQueueMembers.php`
- **AdminCabinet Controller**: `src/AdminCabinet/Controllers/CallQueuesController.php`
- **Form**: `src/AdminCabinet/Forms/CallQueueEditForm.php`
- **Partial REST API**: Only delete action implemented
- **JavaScript**: Feature-rich client with 500+ lines, member management, drag-and-drop
- **Views**: Complex UI with accordion, tooltips, member tables

### CallQueues Model Fields
```php
public $id;                                    // Primary key
public $uniqid;                               // Unique identifier
public $name;                                 // Queue name
public $extension;                            // Extension number
public $strategy;                             // Call distribution strategy
public $seconds_to_ring_each_member;          // Ring duration per member
public $seconds_for_wrapup;                   // Wrap-up time
public $recive_calls_while_on_a_call;        // Concurrent calls flag
public $caller_hear;                          // What caller hears
public $announce_position;                    // Position announcements
public $announce_hold_time;                   // Hold time announcements
public $periodic_announce_sound_id;           // Announcement sound
public $moh_sound_id;                         // Music on hold sound
public $periodic_announce_frequency;          // Announcement frequency
public $timeout_to_redirect_to_extension;     // Timeout before redirect
public $timeout_extension;                    // Timeout redirect extension
public $redirect_to_extension_if_empty;       // Empty queue redirect
public $number_unanswered_calls_to_redirect;  // Unanswered calls threshold
public $redirect_to_extension_if_unanswered;  // Unanswered redirect extension
public $number_repeat_unanswered_to_redirect; // Repeat threshold
public $redirect_to_extension_if_repeat_exceeded; // Repeat exceeded redirect
public $callerid_prefix;                      // Caller ID prefix
public $description;                          // Queue description
```

### CallQueueMembers Model Fields
```php
public $id;         // Primary key
public $queue;      // CallQueues.uniqid reference
public $extension;  // Member extension
public $priority;   // Member priority (0-10)
```

### Model Relations
- `belongsTo` → `Extensions` (main extension, timeout extension, redirect extensions)
- `belongsTo` → `SoundFiles` (periodic announce and MOH sounds)
- `hasMany` → `CallQueueMembers` (cascade delete)

## Detailed Implementation Plan

### Stage 1: Creating REST API Backend

#### 1.1 MikoPBX REST API Architecture

**Important**: In MikoPBX REST API architecture, Action classes are executed in Workers without HTTP context. Therefore, they should not inherit from Injectable and work with $this->request directly.

**Correct Flow**:
```
HTTP Request → Controller → Worker → Action → Database → Response
```

#### 1.2 Action Classes for Call Queues

**File**: `src/PBXCoreREST/Lib/CallQueues/GetRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting call queue record
 * 
 * @api {get} /pbxcore/api/v2/call-queues/getRecord/:id Get call queue record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup CallQueues
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Call queue data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.name Queue name
 * @apiSuccess {String} data.extension Extension number
 * @apiSuccess {String} data.strategy Call distribution strategy
 * @apiSuccess {Array} data.members Array of queue members
 */
class GetRecordAction
{
    /**
     * Get call queue record
     * @param string|null $id - Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($id) || $id === 'new') {
            // Create structure for new record
            $newQueue = new CallQueues();
            $newQueue->id = '';
            $newQueue->uniqid = CallQueues::generateUniqueID(Extensions::TYPE_QUEUE.'-');
            $newQueue->extension = Extensions::getNextFreeApplicationNumber();
            $newQueue->name = '';
            $newQueue->strategy = 'ringall';
            $newQueue->seconds_to_ring_each_member = '15';
            $newQueue->seconds_for_wrapup = '15';
            $newQueue->recive_calls_while_on_a_call = 1;
            $newQueue->caller_hear = 'ringing';
            $newQueue->announce_position = 1;
            $newQueue->announce_hold_time = 1;
            $newQueue->periodic_announce_frequency = 0;
            $newQueue->timeout_to_redirect_to_extension = 300;
            $newQueue->timeout_extension = '';
            $newQueue->redirect_to_extension_if_empty = '';
            $newQueue->number_unanswered_calls_to_redirect = 3;
            $newQueue->redirect_to_extension_if_unanswered = '';
            $newQueue->number_repeat_unanswered_to_redirect = 3;
            $newQueue->redirect_to_extension_if_repeat_exceeded = '';
            $newQueue->callerid_prefix = '';
            $newQueue->description = '';
            
            $res->data = DataStructure::createFromModel($newQueue, []);
            $res->success = true;
        } else {
            // Find existing record
            $queue = CallQueues::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);
            
            if ($queue) {
                // Get queue members
                $members = CallQueueMembers::find([
                    'conditions' => 'queue = :queue:',
                    'bind' => ['queue' => $queue->uniqid],
                    'order' => 'priority ASC'
                ]);
                
                $membersArray = [];
                foreach ($members as $member) {
                    $membersArray[] = [
                        'id' => (string)$member->id,
                        'extension' => $member->extension,
                        'priority' => (int)$member->priority
                    ];
                }
                
                $res->data = DataStructure::createFromModel($queue, $membersArray);
                $res->success = true;
            } else {
                $res->messages['error'][] = 'Call queue not found';
            }
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/CallQueues/GetListAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all call queues
 * 
 * @api {get} /pbxcore/api/v2/call-queues/getList Get all call queues
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup CallQueues
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of call queues with members
 */
class GetListAction
{
    /**
     * Get list of all call queues
     * 
     * @param array $data - Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get all call queues sorted by name
            $queues = CallQueues::find([
                'order' => 'name ASC'
            ]);
            
            $data = [];
            foreach ($queues as $queue) {
                // Get members for each queue
                $members = CallQueueMembers::find([
                    'conditions' => 'queue = :queue:',
                    'bind' => ['queue' => $queue->uniqid],
                    'order' => 'priority ASC'
                ]);
                
                $membersArray = [];
                foreach ($members as $member) {
                    $membersArray[] = [
                        'extension' => $member->extension,
                        'priority' => (int)$member->priority
                    ];
                }
                
                $queueData = DataStructure::createFromModel($queue, $membersArray);
                $data[] = $queueData;
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

**File**: `src/PBXCoreREST/Lib/CallQueues/SaveRecordAction.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for saving call queue record
 * 
 * @api {post} /pbxcore/api/v2/call-queues/saveRecord Create call queue
 * @api {put} /pbxcore/api/v2/call-queues/saveRecord/:id Update call queue
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup CallQueues
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} name Queue name
 * @apiParam {String} extension Extension number (2-8 digits)
 * @apiParam {String} [strategy] Call distribution strategy
 * @apiParam {Array} [members] Array of queue members
 * @apiParam {Object} [members.extension] Member extension number
 * @apiParam {Number} [members.priority] Member priority (0-10)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved call queue data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction
{
    /**
     * Save call queue record
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
            'strategy' => 'string|in:ringall,leastrecent,fewestcalls,random,rrmemory,linear',
            'seconds_to_ring_each_member' => 'int|min:1|max:300',
            'seconds_for_wrapup' => 'int|min:0|max:300',
            'recive_calls_while_on_a_call' => 'bool',
            'caller_hear' => 'string|in:ringing,musiconhold',
            'announce_position' => 'bool',
            'announce_hold_time' => 'bool',
            'periodic_announce_sound_id' => 'string|empty_to_null',
            'moh_sound_id' => 'string|empty_to_null',
            'periodic_announce_frequency' => 'int|min:0|max:3600',
            'timeout_to_redirect_to_extension' => 'int|min:0|max:7200',
            'timeout_extension' => 'string|empty_to_null',
            'redirect_to_extension_if_empty' => 'string|empty_to_null',
            'number_unanswered_calls_to_redirect' => 'int|min:1|max:20',
            'redirect_to_extension_if_unanswered' => 'string|empty_to_null',
            'number_repeat_unanswered_to_redirect' => 'int|min:1|max:20',
            'redirect_to_extension_if_repeat_exceeded' => 'string|empty_to_null',
            'callerid_prefix' => 'string|max:20|empty_to_null',
            'description' => 'string|html_escape|max:500|empty_to_null',
            'members' => 'array'
        ];
        $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);
        
        // Validate required fields
        $validationRules = [
            'name' => [
                ['type' => 'required', 'message' => 'Queue name is required']
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
            $queue = CallQueues::findFirstById($data['id']);
            if (!$queue) {
                $res->messages['error'][] = 'api_CallQueueNotFound';
                return $res;
            }
        } else {
            $queue = new CallQueues();
            $queue->uniqid = CallQueues::generateUniqueID(Extensions::TYPE_QUEUE.'-');
        }
        
        // Check extension uniqueness
        if (!BaseActionHelper::checkUniqueness(
            Extensions::class,
            'number',
            $data['extension'],
            $queue->extension
        )) {
            $res->messages['error'][] = 'Extension number already exists';
            return $res;
        }
        
        try {
            // Save in transaction using BaseActionHelper
            $savedQueue = BaseActionHelper::executeInTransaction(function() use ($queue, $data) {
                // Update/create Extension
                $extension = Extensions::findFirstByNumber($queue->extension);
                if (!$extension) {
                    $extension = new Extensions();
                    $extension->type = Extensions::TYPE_QUEUE;
                    $extension->show_in_phonebook = 1;
                    $extension->public_access = 1;
                }
                
                $extension->number = $data['extension'];
                $extension->callerid = $data['name'];
                
                if (!$extension->save()) {
                    throw new \Exception(implode(', ', $extension->getMessages()));
                }
                
                // Update CallQueue
                $queue->extension = $data['extension'];
                $queue->name = $data['name'];
                $queue->strategy = $data['strategy'] ?? 'ringall';
                $queue->seconds_to_ring_each_member = $data['seconds_to_ring_each_member'] ?? 15;
                $queue->seconds_for_wrapup = $data['seconds_for_wrapup'] ?? 15;
                $queue->recive_calls_while_on_a_call = $data['recive_calls_while_on_a_call'] ?? 1;
                $queue->caller_hear = $data['caller_hear'] ?? 'ringing';
                $queue->announce_position = $data['announce_position'] ?? 1;
                $queue->announce_hold_time = $data['announce_hold_time'] ?? 1;
                $queue->periodic_announce_sound_id = $data['periodic_announce_sound_id'];
                $queue->moh_sound_id = $data['moh_sound_id'];
                $queue->periodic_announce_frequency = $data['periodic_announce_frequency'] ?? 0;
                $queue->timeout_to_redirect_to_extension = $data['timeout_to_redirect_to_extension'] ?? 300;
                $queue->timeout_extension = $data['timeout_extension'];
                $queue->redirect_to_extension_if_empty = $data['redirect_to_extension_if_empty'];
                $queue->number_unanswered_calls_to_redirect = $data['number_unanswered_calls_to_redirect'] ?? 3;
                $queue->redirect_to_extension_if_unanswered = $data['redirect_to_extension_if_unanswered'];
                $queue->number_repeat_unanswered_to_redirect = $data['number_repeat_unanswered_to_redirect'] ?? 3;
                $queue->redirect_to_extension_if_repeat_exceeded = $data['redirect_to_extension_if_repeat_exceeded'];
                $queue->callerid_prefix = $data['callerid_prefix'];
                $queue->description = $data['description'];
                
                if (!$queue->save()) {
                    throw new \Exception(implode(', ', $queue->getMessages()));
                }
                
                // Update queue members
                if (isset($data['members']) && is_array($data['members'])) {
                    // Delete existing members
                    CallQueueMembers::find([
                        'conditions' => 'queue = :queue:',
                        'bind' => ['queue' => $queue->uniqid]
                    ])->delete();
                    
                    // Add new members
                    foreach ($data['members'] as $memberData) {
                        if (!empty($memberData['extension'])) {
                            $member = new CallQueueMembers();
                            $member->queue = $queue->uniqid;
                            $member->extension = $memberData['extension'];
                            $member->priority = $memberData['priority'] ?? 0;
                            
                            if (!$member->save()) {
                                throw new \Exception('Failed to save queue member: ' . implode(', ', $member->getMessages()));
                            }
                        }
                    }
                }
                
                return $queue;
            });
            
            // Get updated members for response
            $members = CallQueueMembers::find([
                'conditions' => 'queue = :queue:',
                'bind' => ['queue' => $savedQueue->uniqid],
                'order' => 'priority ASC'
            ]);
            
            $membersArray = [];
            foreach ($members as $member) {
                $membersArray[] = [
                    'id' => (string)$member->id,
                    'extension' => $member->extension,
                    'priority' => (int)$member->priority
                ];
            }
            
            $res->data = DataStructure::createFromModel($savedQueue, $membersArray);
            $res->success = true;
            
            // Add reload path for page refresh after save
            $res->reload = "call-queues/modify/{$savedQueue->uniqid}";
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}
```

**File**: `src/PBXCoreREST/Lib/CallQueues/DataStructure.php`
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

/**
 * Data structure for call queues
 * 
 * @package MikoPBX\PBXCoreREST\Lib\CallQueues
 */
class DataStructure
{
    /**
     * Create data array from CallQueues model
     * @param \MikoPBX\Common\Models\CallQueues $model
     * @param array $members - Array of queue members
     * @return array
     */
    public static function createFromModel($model, array $members = []): array
    {
        return [
            'id' => (string)$model->id,
            'uniqid' => $model->uniqid,
            'name' => $model->name,
            'extension' => $model->extension,
            'strategy' => $model->strategy,
            'seconds_to_ring_each_member' => (string)$model->seconds_to_ring_each_member,
            'seconds_for_wrapup' => (string)$model->seconds_for_wrapup,
            'recive_calls_while_on_a_call' => (bool)$model->recive_calls_while_on_a_call,
            'caller_hear' => $model->caller_hear,
            'announce_position' => (bool)$model->announce_position,
            'announce_hold_time' => (bool)$model->announce_hold_time,
            'periodic_announce_sound_id' => $model->periodic_announce_sound_id ?? '',
            'moh_sound_id' => $model->moh_sound_id ?? '',
            'periodic_announce_frequency' => (int)$model->periodic_announce_frequency,
            'timeout_to_redirect_to_extension' => (int)$model->timeout_to_redirect_to_extension,
            'timeout_extension' => $model->timeout_extension ?? '',
            'redirect_to_extension_if_empty' => $model->redirect_to_extension_if_empty ?? '',
            'number_unanswered_calls_to_redirect' => (int)$model->number_unanswered_calls_to_redirect,
            'redirect_to_extension_if_unanswered' => $model->redirect_to_extension_if_unanswered ?? '',
            'number_repeat_unanswered_to_redirect' => (int)$model->number_repeat_unanswered_to_redirect,
            'redirect_to_extension_if_repeat_exceeded' => $model->redirect_to_extension_if_repeat_exceeded ?? '',
            'callerid_prefix' => $model->callerid_prefix ?? '',
            'description' => $model->description ?? '',
            'members' => $members
        ];
    }
}
```

**File**: `src/PBXCoreREST/Lib/CallQueues/DeleteRecordAction.php` (extend existing)
```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Action for deleting call queue record
 * 
 * @api {delete} /pbxcore/api/v2/call-queues/deleteRecord/:id Delete call queue
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup CallQueues
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
     * Delete call queue record
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
            $queue = CallQueues::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);
            
            if (!$queue) {
                $res->messages['error'][] = 'api_CallQueueNotFound';
                return $res;
            }
            
            // Delete in transaction using BaseActionHelper
            BaseActionHelper::executeInTransaction(function() use ($queue) {
                // Delete related queue members
                $members = CallQueueMembers::find([
                    'conditions' => 'queue = :queue:',
                    'bind' => ['queue' => $queue->uniqid]
                ]);
                foreach ($members as $member) {
                    if (!$member->delete()) {
                        throw new \Exception('Failed to delete queue member: ' . implode(', ', $member->getMessages()));
                    }
                }
                
                // Delete related extension
                $extension = Extensions::findFirstByNumber($queue->extension);
                if ($extension) {
                    if (!$extension->delete()) {
                        throw new \Exception('Failed to delete extension: ' . implode(', ', $extension->getMessages()));
                    }
                }
                
                // Delete call queue itself
                if (!$queue->delete()) {
                    throw new \Exception('Failed to delete call queue: ' . implode(', ', $queue->getMessages()));
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

#### 1.3 REST API Controllers

**Updates to existing file**: `src/PBXCoreREST/Controllers/CallQueues/GetController.php`

Update `callAction` method to support new actions:
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\CallQueues;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\CallQueuesManagementProcessor;

/**
 * GET controller for call queues management
 * 
 * @RoutePrefix("/pbxcore/api/v2/call-queues")
 * 
 * @examples
 * curl http://127.0.0.1/pbxcore/api/v2/call-queues/getRecord/QUEUE-123ABC
 * curl http://127.0.0.1/pbxcore/api/v2/call-queues/getRecord/new
 * curl http://127.0.0.1/pbxcore/api/v2/call-queues/getList
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get call queue record by ID, if ID is 'new' or empty returns structure with default data
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all call queues
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
            CallQueuesManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}
```

**New file**: `src/PBXCoreREST/Controllers/CallQueues/PostController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\CallQueues;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\CallQueuesManagementProcessor;

/**
 * POST controller for call queues management
 * 
 * @RoutePrefix("/pbxcore/api/v2/call-queues")
 * 
 * @examples
 * curl -X POST http://127.0.0.1/pbxcore/api/v2/call-queues/saveRecord \
 *   -d "name=Sales Queue&extension=2001&strategy=ringall"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates call queue record
     * @Post("/saveRecord")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        
        $this->sendRequestToBackendWorker(
            CallQueuesManagementProcessor::class,
            $actionName,
            $postData
        );
    }
}
```

**New file**: `src/PBXCoreREST/Controllers/CallQueues/PutController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\CallQueues;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\CallQueuesManagementProcessor;

/**
 * PUT controller for call queues management
 * 
 * @RoutePrefix("/pbxcore/api/v2/call-queues")
 * 
 * @examples
 * curl -X PUT http://127.0.0.1/pbxcore/api/v2/call-queues/saveRecord/QUEUE-123ABC \
 *   -d "name=Updated Queue&extension=2002&strategy=leastrecent"
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
 */
class PutController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Call queue ID for update operations
     * 
     * Updates existing call queue record
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
            CallQueuesManagementProcessor::class,
            $actionName,
            $putData
        );
    }
}
```

**New file**: `src/PBXCoreREST/Controllers/CallQueues/DeleteController.php`
```php
<?php
//<Copyright>
namespace MikoPBX\PBXCoreREST\Controllers\CallQueues;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\CallQueuesManagementProcessor;

/**
 * DELETE controller for call queues management
 * 
 * @RoutePrefix("/pbxcore/api/v2/call-queues")
 * 
 * @examples
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v2/call-queues/deleteRecord/QUEUE-123ABC
 * 
 * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
 */
class DeleteController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Call queue ID to delete
     * 
     * Deletes call queue record
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
            CallQueuesManagementProcessor::class,
            $actionName,
            $deleteData
        );
    }
}
```

#### 1.4 Update Processor

**Changes to file**: `src/PBXCoreREST/Lib/CallQueuesManagementProcessor.php`

```php
<?php
//<Copyright>

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\CallQueues\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction
};
use Phalcon\Di\Injectable;

/**
 * Call queues management processor
 *
 * Handles all call queue management operations including:
 * - getRecord: Get single call queue by ID or create new structure
 * - getList: Get list of all call queues with members
 * - saveRecord: Create or update call queue
 * - deleteRecord: Delete call queue with related records
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class CallQueuesManagementProcessor extends Injectable
{
    /**
     * Processes call queue management requests
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

#### 1.5 REST API Routes

**Add to file**: `src/PBXCoreREST/Providers/RouterProvider.php`

Add to routes array:
```php
use CallQueues\GetController as CallQueuesGetController,
    CallQueues\PostController as CallQueuesPostController,
    CallQueues\PutController as CallQueuesPutController,
    CallQueues\DeleteController as CallQueuesDeleteController;

// GET routes
[
    CallQueuesGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/call-queues/{actionName}', 
    'get', 
    '/'
],
[
    CallQueuesGetController::class, 
    'callAction', 
    '/pbxcore/api/v2/call-queues/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'get', 
    '/'
],
// POST route
[
    CallQueuesPostController::class, 
    'callAction', 
    '/pbxcore/api/v2/call-queues/{actionName}', 
    'post', 
    '/'
],
// PUT route
[
    CallQueuesPutController::class, 
    'callAction', 
    '/pbxcore/api/v2/call-queues/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'put', 
    '/'
],
// DELETE route
[
    CallQueuesDeleteController::class, 
    'callAction', 
    '/pbxcore/api/v2/call-queues/{actionName}/{id:[a-zA-Z0-9\-]+}', 
    'delete', 
    '/'
],
```

### Stage 2: Update JavaScript Client

#### 2.1 Extend API Methods

**Changes to file**: `sites/admin-cabinet/assets/js/src/PbxAPI/callQueuesAPI.js`

Replace content with:
```javascript
//<Copyright>

/* global globalRootUrl, PbxApi, globalTranslate */

/**
 * CallQueuesAPI - REST API for call queue management
 * 
 * Uses unified approach with centralized endpoint definitions.
 * This provides:
 * - Single point of API URL management
 * - Easy API version switching (v2 -> v3)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
const CallQueuesAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/call-queues/`,
    
    // Endpoint definitions for unification
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/call-queues/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/call-queues/getRecord`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/call-queues/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/call-queues/deleteRecord`
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

**Changes to file**: `sites/admin-cabinet/assets/js/src/CallQueues/callqueue-modify.js`

The existing file is complex (500+ lines). Key changes needed:

1. **Replace AJAX form submission with REST API**:
```javascript
// Replace existing form submission logic
Form.apiSettings.enabled = true;
Form.apiSettings.apiObject = CallQueuesAPI;
Form.apiSettings.saveMethod = 'saveRecord';

// Important settings for correct save modes operation
Form.afterSubmitIndexUrl = `${globalRootUrl}call-queues/index/`;
Form.afterSubmitModifyUrl = `${globalRootUrl}call-queues/modify/`;
```

2. **Add data loading via REST API**:
```javascript
/**
 * Load data into form
 */
initializeForm() {
    const recordId = callqueueModify.getRecordId();
    
    CallQueuesAPI.getRecord(recordId, (response) => {
        if (response.result) {
            callqueueModify.populateForm(response.data);
            // Populate members table
            if (response.data.members) {
                callqueueModify.populateMembers(response.data.members);
            }
            callqueueModify.defaultExtension = response.data.extension;
        } else {
            UserMessage.showError(response.messages?.error || 'Failed to load call queue data');
        }
    });
},
```

3. **Update member management to work with REST API**:
```javascript
/**
 * Prepare members data for API submission
 */
cbBeforeSendForm(settings) {
    // Collect members data from table
    const members = [];
    $('.member-row').each(function(index) {
        const extension = $(this).find('.extension-input').val();
        if (extension) {
            members.push({
                extension: extension,
                priority: index
            });
        }
    });
    
    // Add members to form data
    settings.data.members = members;
    
    return settings;
},
```

#### 2.3 Update Call Queue List

**Changes to file**: `sites/admin-cabinet/assets/js/src/CallQueues/callqueues-index.js`

Replace content with DataTable implementation:
```javascript
//<Copyright>

/* global globalRootUrl, CallQueuesAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization */

/**
 * Call queues table management module
 */
const queueTable = {
    $queuesTable: $('#call-queues-table'),
    dataTable: {},

    /**
     * Initialize the module
     */
    initialize() {
        // Initially show placeholder until data loads
        queueTable.toggleEmptyPlaceholder(true);
        
        queueTable.initializeDataTable();
    },
    
    /**
     * Initialize DataTable
     */
    initializeDataTable() {
        queueTable.dataTable = queueTable.$queuesTable.DataTable({
            ajax: {
                url: CallQueuesAPI.endpoints.getList,
                dataSrc: function(json) {                    
                    // Manage empty state
                    queueTable.toggleEmptyPlaceholder(
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
                    data: 'strategy',
                    className: 'center aligned hide-on-mobile',
                    responsivePriority: 3
                },
                {
                    data: 'members',
                    className: 'center aligned hide-on-mobile',
                    responsivePriority: 2,
                    render: function(data) {
                        if (!data || data.length === 0) {
                            return '—';
                        }
                        const memberList = data.map(member => member.extension).join(', ');
                        return memberList.length > 20 ? 
                            memberList.substring(0, 20) + '...' : 
                            memberList;
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
                            <a href="${globalRootUrl}call-queues/modify/${row.uniqid}" 
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
                // Initialize Semantic UI elements
                queueTable.$queuesTable.find('.popuped').popup();
                
                // Double-click for editing
                queueTable.initializeDoubleClickEdit();
            }
        });
        
        // Handle deletion using DeleteSomething.js
        queueTable.$queuesTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const queueId = $button.attr('data-value');
            
            // Add loading indicator and disable button
            $button.addClass('loading disabled');
            
            CallQueuesAPI.deleteRecord(queueId, queueTable.cbAfterDeleteRecord);
        });
    },
    
    /**
     * Callback after record deletion
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Reload table
            queueTable.dataTable.ajax.reload();
            
            // Update related components
            if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
                Extensions.cbOnDataChanged();
            }
            
            UserMessage.showSuccess(globalTranslate.cq_QueueDeleted);
        } else {
            UserMessage.showError(
                response.messages?.error || 
                globalTranslate.cq_ImpossibleToDeleteQueue
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
            $('#queue-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-button').show();
            $('#queue-table-container').show();
        }
    },
    
    /**
     * Initialize double-click for editing
     * IMPORTANT: Exclude cells with action-buttons class to avoid conflict with delete-something.js
     */
    initializeDoubleClickEdit() {
        queueTable.$queuesTable.on('dblclick', 'tbody td:not(.action-buttons)', function() {
            const data = queueTable.dataTable.row(this).data();
            if (data && data.uniqid) {
                window.location = `${globalRootUrl}call-queues/modify/${data.uniqid}`;
            }
        });
    }
};

/**
 *  Initialize on document ready
 */
$(document).ready(() => {
    queueTable.initialize();
});
```

### Stage 3: AdminCabinet Adaptation

**Changes to file**: `src/AdminCabinet/Controllers/CallQueuesController.php`

Replace data fetching logic in `modifyAction` method:
```php
<?php
//<Copyright>

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\CallQueueEditForm;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;

class CallQueuesController extends BaseController
{
    /**
     * Build the list of call queues.
     */
    public function indexAction(): void
    {
        // The data will load by DataTable AJAX
    }

    /**
     * Edit call queue details.
     *
     * @param string|null $uniqid The unique identifier of the call queue.
     */
    public function modifyAction(string $uniqid = null): void
    {
        // Get data via REST API
        $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/v2/call-queues/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            ['id' => $uniqid]
        ]);
        
        if (!$restAnswer->success) {
            $this->flash->error(json_encode($restAnswer->messages));
            $this->dispatcher->forward([
                'controller' => 'call-queues',
                'action' => 'index'
            ]);
            return;
        }
        
        $getRecordStructure = (object)$restAnswer->data;
        
        // Create form based on API data structure
        $this->view->form = new CallQueueEditForm($getRecordStructure);
        $this->view->represent = $getRecordStructure->name ?: '';
        $this->view->extension = $getRecordStructure->extension ?: '';
        
        // Convert members array to format expected by form
        if (isset($getRecordStructure->members)) {
            $this->view->queueMembers = $getRecordStructure->members;
        } else {
            $this->view->queueMembers = [];
        }
    }

    /**
     * Remove legacy saveAction() method - replaced by REST API
     */
}
```

### Stage 4: Update Views

#### 4.1 Update index.volt

**Changes to file**: `src/AdminCabinet/Views/CallQueues/index.volt`

Replace content with:
```volt
<div id="add-new-button">
    {% if isAllowed('save') %}
        {{ link_to("call-queues/modify", '<i class="add circle icon"></i> '~t._('cq_AddNewQueue'), "class": "ui blue button") }}
    {% endif %}
</div>

<div id="queue-table-container">
    <table class="ui selectable compact unstackable table" id="call-queues-table">
        <thead>
            <tr>
                <th>{{ t._('cq_ColumnName') }}</th>
                <th>{{ t._('cq_ColumnExtension') }}</th>
                <th class="hide-on-mobile">{{ t._('cq_ColumnStrategy') }}</th>
                <th class="hide-on-mobile">{{ t._('cq_ColumnMembers') }}</th>
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
        'title': t._('cq_EmptyTableTitle'),
        'description': t._('cq_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('cq_AddNewQueue'),
        'addButtonLink': 'call-queues/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/call-queues'
    ]) }}
</div>
```

#### 4.2 Update AssetProvider for DataTables

**Changes to file**: `src/AdminCabinet/Providers/AssetProvider.php`

Add DataTables assets for call queue list page:

```php
private function makeCallQueuesAssets(string $action): void
{
    if ($action === 'index') {
        // DataTables for queue list
        $this->headerCollectionCSS
            ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
        $this->footerCollectionJS
            ->addJs('js/vendor/datatable/dataTables.semanticui.js', true);

        // Main page module
        $this->footerCollectionJS     
            ->addJs('js/pbx/PbxAPI/callQueuesAPI.js', true)
            ->addJs('js/pbx/CallQueues/callqueues-index.js', true);
    } elseif ($action === 'modify') {
        $this->footerCollectionJS
            // Edit module (existing complex JS)
            ->addJs('js/pbx/main/form.js', true)
            ->addJs('js/pbx/PbxAPI/callQueuesAPI.js', true)
            ->addJs('js/pbx/CallQueues/callqueue-modify.js', true);
    }
}
```

### Stage 5: Translations

**Add to file**: `src/Common/Messages/ru.php`
```php
'cq_ValidateNameIsEmpty' => 'Название очереди обязательно для заполнения',
'cq_ValidateExtensionIsEmpty' => 'Номер добавочного обязателен для заполнения',
'cq_ValidateExtensionFormat' => 'Номер добавочного должен содержать от 2 до 8 цифр',
'cq_QueueSaved' => 'Очередь вызовов успешно сохранена',
'cq_QueueDeleted' => 'Очередь вызовов успешно удалена',
'cq_ImpossibleToDeleteQueue' => 'Невозможно удалить очередь вызовов',
'cq_EmptyTableTitle' => 'Очереди вызовов не созданы',
'cq_EmptyTableDescription' => 'Создайте первую очередь для организации распределения входящих вызовов',
'cq_AddNewQueue' => 'Добавить очередь',
'cq_ColumnName' => 'Название',
'cq_ColumnExtension' => 'Номер',
'cq_ColumnStrategy' => 'Стратегия',
'cq_ColumnMembers' => 'Участники',
```

### Stage 6: Build and Testing

#### 6.1 JavaScript Transpilation
```bash
# For core system files
docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/CallQueues/callqueue-modify.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/CallQueues/callqueues-index.js \
  core

docker run --rm -v /Users/nb/PhpstormProjects/mikopbx:/workspace \
  mikopbx/mikopbx-babel-compiler \
  /workspace/Core/sites/admin-cabinet/assets/js/src/PbxAPI/callQueuesAPI.js \
  core
```

#### 6.2 PHPStan Check
```bash
# Check PHP code quality
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse /offload/rootfs/usr/www/src/PBXCoreREST/Lib/CallQueues/
```

## New Files to Create

1. `src/PBXCoreREST/Lib/CallQueues/GetRecordAction.php`
2. `src/PBXCoreREST/Lib/CallQueues/GetListAction.php`
3. `src/PBXCoreREST/Lib/CallQueues/SaveRecordAction.php`
4. `src/PBXCoreREST/Lib/CallQueues/DataStructure.php`
5. `src/PBXCoreREST/Controllers/CallQueues/PostController.php`
6. `src/PBXCoreREST/Controllers/CallQueues/PutController.php`
7. `src/PBXCoreREST/Controllers/CallQueues/DeleteController.php`

## Files to Modify

1. `src/PBXCoreREST/Lib/CallQueuesManagementProcessor.php`
2. `src/PBXCoreREST/Controllers/CallQueues/GetController.php`
3. `src/PBXCoreREST/Providers/RouterProvider.php`
4. `sites/admin-cabinet/assets/js/src/PbxAPI/callQueuesAPI.js`
5. `sites/admin-cabinet/assets/js/src/CallQueues/callqueues-index.js`
6. `sites/admin-cabinet/assets/js/src/CallQueues/callqueue-modify.js`
7. `src/AdminCabinet/Controllers/CallQueuesController.php`
8. `src/AdminCabinet/Views/CallQueues/index.volt`
9. `src/Common/Messages/ru.php`
10. `src/AdminCabinet/Providers/AssetProvider.php`

## Expected Results

After implementing the plan, the call queue management system will:

- ✅ Use unified REST API architecture
- ✅ Support full CRUD functionality via REST API
- ✅ Provide two-level data sanitization
- ✅ Use DataTable for list display
- ✅ Integrate with existing Form.js mechanism
- ✅ Preserve all existing UI/UX patterns including complex member management
- ✅ Maintain drag-and-drop functionality for queue members
- ✅ Correctly display welcome message for empty table
- ✅ Be ready for external integrations
- ✅ Comply with MikoPBX architectural principles

## Testing

### REST API Endpoints for Testing:
- `GET /pbxcore/api/v2/call-queues/getList` - queue list with members
- `GET /pbxcore/api/v2/call-queues/getRecord/new` - new queue structure
- `GET /pbxcore/api/v2/call-queues/getRecord/{id}` - specific queue with members
- `POST /pbxcore/api/v2/call-queues/saveRecord` - create queue
- `PUT /pbxcore/api/v2/call-queues/saveRecord/{id}` - update queue
- `DELETE /pbxcore/api/v2/call-queues/deleteRecord/{id}` - delete queue

### Test Scenarios:
1. Create new queue with members
2. Edit existing queue and modify members
3. Delete queue with cascade deletion of members
4. Validate required fields and complex parameters
5. Check extension number uniqueness
6. Member priority management and reordering
7. Update DataTable after operations
8. Save form state and URL
9. Display welcome message for empty table
10. Test complex UI features (accordion, tooltips, drag-and-drop)

### Special Considerations for Call Queues:

1. **Complex Member Management**: The existing JavaScript has sophisticated member management with drag-and-drop reordering. This functionality must be preserved.

2. **Sound File Integration**: Call queues use sound files for announcements and music on hold. The REST API must handle these relationships.

3. **Multiple Redirect Extensions**: Call queues have several redirect extensions (timeout, empty, unanswered, repeat exceeded). All must be properly handled.

4. **Strategy-specific Settings**: Different call distribution strategies may require different validation rules.

5. **Extension Availability**: Real-time extension availability checking is critical for both queue extension and member extensions.

The migration maintains backward compatibility while providing a modern REST API interface for external integrations and improved maintainability.