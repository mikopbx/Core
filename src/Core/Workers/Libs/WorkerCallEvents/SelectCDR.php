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
use phpDocumentor\Reflection\Utils;
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
            [$tmpDir, $downloadCacheDir] = self::getTmpDir();
            $fileBaseName = md5(microtime(true));
            // temp- в названии файла необходямо, чтобы файл был автоматом удален через 5 минут.
            $filename     = $tmpDir.'/temp-'.$fileBaseName;
            file_put_contents($filename, $res_data);

            if(!empty($downloadCacheDir)){
                $linkName     = $downloadCacheDir.'/'.$fileBaseName;
                // Для автоматического удаления файла.
                // Файл с такой ссылкой будет удален через 5 минут по cron.
                Util::createUpdateSymlink($filename, $linkName,true);
            }
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

    private static function getTmpDir():array
    {
        $downloadCacheDir = '';
        $dirName    = '/tmp/';
        $di         = Di::getDefault();
        if($di){
            $dirsConfig = $di->getShared('config');
            $tmoDirName   = $dirsConfig->path('core.tempDir').'/SelectCdrService';
            Util::mwMkdir($tmoDirName, true);
            if(file_exists($tmoDirName)){
                $dirName = $tmoDirName;
            }

            $downloadCacheDir = $dirsConfig->path('www.downloadCacheDir');
            if(!file_exists($downloadCacheDir)){
                $downloadCacheDir = '';
            }
        }


        return [$dirName,$downloadCacheDir];
    }
}