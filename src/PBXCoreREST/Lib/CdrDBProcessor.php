<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\PBXCoreREST\Lib;


use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCdr;
use Phalcon\Di\Injectable;
use phpDocumentor\Reflection\Types\Self_;

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
    public static function cdrCallBack(array $request): PBXApiResult
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
            'endtime IS NULL',
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