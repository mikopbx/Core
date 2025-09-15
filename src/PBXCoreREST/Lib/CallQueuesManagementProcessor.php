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

use MikoPBX\PBXCoreREST\Lib\CallQueues\DeleteRecordAction;
use MikoPBX\PBXCoreREST\Lib\CallQueues\GetRecordAction;
use MikoPBX\PBXCoreREST\Lib\CallQueues\SaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\CallQueues\GetListAction;
use MikoPBX\PBXCoreREST\Lib\CallQueues\GetDefaultAction;
use MikoPBX\PBXCoreREST\Lib\CallQueues\CreateRecordAction;
use MikoPBX\PBXCoreREST\Lib\CallQueues\UpdateRecordAction;
use MikoPBX\PBXCoreREST\Lib\CallQueues\PatchRecordAction;
use MikoPBX\PBXCoreREST\Lib\CallQueues\CopyRecordAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for call queues management
 */
enum CallQueueAction: string
{
    // Standard CRUD operations
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case GET_DEFAULT = 'getDefault';
    case CREATE = 'create';
    case UPDATE = 'update';
    case PATCH = 'patch';
    case DELETE = 'delete';

    // Custom methods
    case COPY = 'copy';
}

/**
 * Class CallQueuesManagementProcessor
 * 
 * Processes call queue management requests using uniqid as primary identifier
 * 
 * RESTful API mapping:
 * - GET /call-queues         -> getList
 * - GET /call-queues/{id}    -> getRecord
 * - POST /call-queues        -> create
 * - PUT /call-queues/{id}    -> update
 * - PATCH /call-queues/{id}  -> patch
 * - DELETE /call-queues/{id} -> delete
 * 
 * Custom methods:
 * - GET /call-queues:getDefault -> getDefault
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class CallQueuesManagementProcessor extends Injectable
{
    /**
     * Processes CallQueues management requests with type-safe enum matching
     *
     * @param array<string, mixed> $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        $data = $request['data'];
        
        // Type-safe action matching with enum
        $action = CallQueueAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard CRUD operations
            CallQueueAction::GET_LIST => GetListAction::main($data),
            CallQueueAction::GET_RECORD => GetRecordAction::main($data['id'] ?? ''),
            CallQueueAction::GET_DEFAULT => GetDefaultAction::main(),
            CallQueueAction::CREATE => CreateRecordAction::main($data),
            CallQueueAction::UPDATE => UpdateRecordAction::main($data),
            CallQueueAction::PATCH => PatchRecordAction::main($data),
            CallQueueAction::DELETE => DeleteRecordAction::main($data['id'] ?? ''),
            // Custom methods
            CallQueueAction::COPY => CopyRecordAction::main($data['id'] ?? '')
        };

        $res->function = $actionString;
        return $res;
    }
    
}