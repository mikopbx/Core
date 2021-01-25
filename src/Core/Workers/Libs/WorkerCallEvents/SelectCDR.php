<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecords;
use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\Util;
use Phalcon\Di;
use Throwable;

class SelectCDR
{
    public static function execute($filter):string
    {

        if(self::filterNotValid($filter)){
            return '[]';
        }

        $res    = null;
        try {
            if (isset($filter['miko_tmp_db'])) {
                $res = CallDetailRecordsTmp::find($filter);
            } else {
                $res = CallDetailRecords::find($filter);
            }
            $res_data = json_encode($res->toArray());
        } catch (Throwable $e) {
            $res_data = '[]';
        }

        if ($res && isset($filter['add_pack_query'])) {
            $arr = [];
            foreach ($res->toArray() as $row) {
                $arr[] = $row[$filter['columns']];
            }
            $filter['add_pack_query']['bind'][$filter['columns']] = $arr;

            if(self::filterNotValid($filter['add_pack_query'])){
                return '[]';
            }

            try {
                $res      = CallDetailRecords::find($filter['add_pack_query']);
                $res_data = json_encode($res->toArray(), JSON_THROW_ON_ERROR);
            } catch (Throwable $e) {
                $res_data = '[]';
            }
        }

        if (isset($filter['miko_result_in_file'])) {
            $di         = Di::getDefault();
            if($di){
                $dirsConfig = $di->getShared('config');
                $filename   = $dirsConfig->path('core.tempDir') . '/' . md5(microtime(true));
            }else{
                $filename = '/tmp/' . md5(microtime(true));
            }
            file_put_contents($filename, $res_data);
            Util::addRegularWWWRights($filename);
            $res_data = json_encode($filename);
        }

        return $res_data;

    }

    /**
     * Проверка фильтра на корректность bind параметров.
     *
     * @param $filter
     *
     * @return bool
     */
    private static function filterNotValid($filter):bool{
        $haveErrors = false;
        $validValue = ['0',''];
        if(isset($filter['bind'])){
            if(is_array($filter)){
                foreach ($filter['bind'] as $bindValue) {
                    if(empty($bindValue) && !in_array($bindValue, $validValue, true)){
                        $haveErrors = true;
                    }
                }
            }else{
                $haveErrors = true;
            }
        }
        return $haveErrors;
    }
}