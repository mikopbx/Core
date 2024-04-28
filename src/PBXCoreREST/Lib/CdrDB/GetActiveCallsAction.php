<?php
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

namespace MikoPBX\PBXCoreREST\Lib\CdrDB;


use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Get active calls based on CDR data.
 *
 * @package MikoPBX\PBXCoreREST\Lib\CdrDB
 */
class GetActiveCallsAction extends \Phalcon\Di\Injectable
{
    /**
     * Get active calls based on CDR data.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $filter  = [
            'order'       => 'id',
            'columns'     => 'start,answer,endtime,src_num,dst_num,did,linkedid',
            'miko_tmp_db' => true,
        ];
        $client  = new BeanstalkClient(WorkerCdr::SELECT_CDR_TUBE);
        list($result, $message) = $client->sendRequest(json_encode($filter), 2);
        if ($result === false) {
            $res->data = [];
        }else{
            $res->data[] = $message;
        }
        return $res;
    }
}