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


use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCdr;
use Phalcon\Di\Injectable;

/**
 * Class CdrDBProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class CdrDBProcessor extends Injectable
{
    /**
     * Processes CDR table requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $action = $request['action'];
        switch ($action) {
            case 'getActiveChannels':
                $res = self::getActiveChannels();
                break;
            default:
                $res->messages[] = "Unknown action - {$action} in cdrCallBack";
                break;
        }
        $res->function = $action;
        return $res;
    }

    /**
     * Get active channels. These are the unfinished calls (endtime IS NULL).
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function getActiveChannels(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $res->success = true;

            $filter = [
                'endtime=""',
                'order' => 'id',
                'columns' => 'start,answer,src_chan,dst_chan,src_num,dst_num,did,linkedid',
                'miko_tmp_db' => true,
                'miko_result_in_file' => true,
            ];
            $client = new BeanstalkClient(WorkerCdr::SELECT_CDR_TUBE);
            $message = $client->request(json_encode($filter), 2);
            if ($message === false) {
                $res->data = [];
            } else {
                $am = Util::getAstManager('off');
                $active_chans = $am->GetChannels(true);
                $result_data = [];

                $result = json_decode($message);
                if (file_exists($result)) {
                    $data = json_decode(file_get_contents($result), true);
                    unlink($result);
                    foreach ($data as $row) {
                        if (!isset($active_chans[$row['linkedid']])) {
                            // The call no longer exists.
                            continue;
                        }
                        if (empty($row['dst_chan']) && empty($row['src_chan'])) {
                            // This is an erroneous situation. Ignore such a call.
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
        } catch (\Throwable $e) {
            $res->success = false;
            $res->messages[] = $e->getMessage();
        }
        return $res;
    }
}