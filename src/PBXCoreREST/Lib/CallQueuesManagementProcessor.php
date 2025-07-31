<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Common\Models\CallQueues;
use Phalcon\Di\Injectable;

/**
 * Class CallQueuesManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class CallQueuesManagementProcessor extends Injectable
{
    /**
     * Processes CallQueues management requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $action = $request['action'];
        $data = $request['data'];
        switch ($action) {
            case 'getRecord':
                $res = GetRecordAction::main($data['id'] ?? '');
                break;
            case 'getList':
                $res = self::getList();
                break;
            case 'saveRecord':
                $res = SaveRecordAction::main($data);
                break;
            case 'deleteRecord':
                if (!empty($data['id'])) {
                    $res = DeleteRecordAction::main($data['id']);
                } else {
                    $res->messages['error'][] = 'Empty ID in POST/GET data';
                }
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Get list of all call queues with member representations
     *
     * @return PBXApiResult
     */
    private static function getList(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $queues = CallQueues::find(['order' => 'name ASC']);
            
            $queuesList = [];
            foreach ($queues as $queue) {
                $queuesList[] = \MikoPBX\PBXCoreREST\Lib\CallQueues\DataStructure::createForList($queue);
            }
            
            $res->data = $queuesList;
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            \MikoPBX\Common\Handlers\CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}