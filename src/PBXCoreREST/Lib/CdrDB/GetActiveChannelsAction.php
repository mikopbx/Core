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

use MikoPBX\Common\Providers\CDRDatabaseProvider;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Exception;
use Phalcon\Di\Injectable;

/**
 * Get active channels. These are the unfinished calls (endtime IS NULL).
 *
 * @package MikoPBX\PBXCoreREST\Lib\CdrDB
 */
class GetActiveChannelsAction extends Injectable
{
    /**
     * Get active channels. These are the unfinished calls (endtime IS NULL).
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        try {
            $activeChannels = Util::getAstManager('off')->GetChannels();
        }catch (Exception $e){
            $res->success = false;
            $res->messages[] = $e->getMessage();
            return $res;
        }

        $filter = [
            'endtime=""',
            'order' => 'id',
            'columns' => 'start,answer,src_chan,dst_chan,src_num,dst_num,did,linkedid',
            'miko_tmp_db' => true,
        ];
        $cdrData = CDRDatabaseProvider::getCdr($filter);

        $result_data = [];
        foreach ($cdrData as $row) {
            if (!isset($activeChannels[$row['linkedid']])) {
                // The call no longer exists.
                continue;
            }
            if (empty($row['dst_chan']) && empty($row['src_chan'])) {
                // This is an erroneous situation. Ignore such a call.
                continue;
            }
            $channels = $activeChannels[$row['linkedid']];
            if ((empty($row['src_chan']) || in_array($row['src_chan'], $channels, true))
                && (empty($row['dst_chan']) || in_array($row['dst_chan'], $channels, true))) {
                $result_data[] = $row;
            }
        }
        $res->data = $result_data;
        return $res;
    }
}