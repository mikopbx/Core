<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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


use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCdr;
use Phalcon\Di\Injectable;

class CdrDBProcessor extends Injectable
{
    /**
     * Processes CDR table requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     *
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = $request['action'];
        switch ($action) {
            case 'getActiveCalls':
                $res = self::getActiveCalls();
                break;
            case 'getActiveChannels':
                $res = self::getActiveChannels();
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in cdrCallBack";
                break;
        }

        $res->function = $action;

        return $res;
    }


    /**
     * Получение активных звонков по данным CDR.
     * @return PBXApiResult
     *
     */
    public static function getActiveCalls(): PBXApiResult
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
        $message = $client->request(json_encode($filter), 2);
        if ($message === false) {
            $res->data = [];
        }else{
                $res->data[] = $message;
        }
        return $res;
    }

    /**
     * Получение активных каналов. Не завершенные звонки (endtime IS NULL).
     * @return PBXApiResult
     *
     */
    public static function getActiveChannels(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        $filter  = [
            'endtime=""',
            'order'               => 'id',
            'columns'             => 'start,answer,src_chan,dst_chan,src_num,dst_num,did,linkedid',
            'miko_tmp_db'         => true,
            'miko_result_in_file' => true,
        ];
        $client  = new BeanstalkClient(WorkerCdr::SELECT_CDR_TUBE);
        $message = $client->request(json_encode($filter), 2);
        if ($message === false) {
            $res->data = [];
        } else {
            $am             = Util::getAstManager('off');
            $active_chans   = $am->GetChannels(true);
            $result_data = [];

            $result = json_decode($message);
            if (file_exists($result)) {
                $data = json_decode(file_get_contents($result), true);
                unlink($result);
                foreach ($data as $row) {
                    if ( ! isset($active_chans[$row['linkedid']])) {
                        // Вызов уже не существует.
                        continue;
                    }
                    if (empty($row['dst_chan']) && empty($row['src_chan'])) {
                        // Это ошибочная ситуация. Игнорируем такой вызов.
                        continue;
                    }
                    $channels = $active_chans[$row['linkedid']];
                    if ((empty($row['src_chan']) || in_array($row['src_chan'], $channels))
                        && (empty($row['dst_chan']) || in_array($row['dst_chan'], $channels))) {
                        $result_data[] = $row;
                    }
                }
            }
            $res->data = $result_data;
        }
        return $res;
    }
}