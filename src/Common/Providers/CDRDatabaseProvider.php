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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCdr;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * CDR database connection is created based in the parameters defined in the configuration file
 */
class CDRDatabaseProvider extends DatabaseProviderBase implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'dbCDR';

    /**
     * Register dbCDR service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $dbConfig = $di->getShared(ConfigProvider::SERVICE_NAME)->get('cdrDatabase')->toArray();
        $this->registerDBService(self::SERVICE_NAME, $di, $dbConfig);
    }

    /**
     * Возвращает все завершенные временные CDR.
     * @param array $filter
     * @return array
     */
    public static function getCdr(array $filter = []):array
    {
        if(empty($filter)){
            $filter = [
                'work_completed<>1 AND endtime<>""'
            ];
        }
        $filter['miko_result_in_file'] = true;
        $filter['order'] = 'answer';
        $filter['columns'] = 'start,answer,src_num,dst_num,dst_chan,endtime,linkedid,recordingfile,dialstatus,UNIQUEID';

        $client = new BeanstalkClient(WorkerCdr::SELECT_CDR_TUBE);
        try {
            $result   = $client->request(json_encode($filter), 2);
            $filename = json_decode($result, true, 512, JSON_THROW_ON_ERROR);
        }catch (\Throwable $e){
            $filename = '';
        }
        $result_data = [];
        if (file_exists($filename)) {
            try {
                $result_data = json_decode(file_get_contents($filename), true, 512, JSON_THROW_ON_ERROR);
            }catch (\Throwable $e){
                Util::sysLogMsg('SELECT_CDR_TUBE', 'Error parse response.');
            }
            unlink($filename);
        }

        return $result_data;
    }
}