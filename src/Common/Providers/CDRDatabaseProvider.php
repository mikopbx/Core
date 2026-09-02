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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use MikoPBX\Common\Library\CdrResponseCacheLink;
use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\WorkerCdr;
use Phalcon\Di\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * CDRDatabaseProvider
 *
 * This service provider creates a CDR database connection based on the parameters defined in the configuration file.
 *
 * @package MikoPBX\Common\Providers
 */
class CDRDatabaseProvider extends DatabaseProviderBase implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'dbCDR';

    /**
     * Register dbCDR service provider
     *
     * @param \Phalcon\Di\DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $dbConfig = $di->getShared(ConfigProvider::SERVICE_NAME)->get('cdrDatabase')->toArray();
        $this->registerDBService(self::SERVICE_NAME, $di, $dbConfig);
    }

    /**
     * Retrieves all completed temporary CDRs.
     * @param array $filter  An array of filter parameters.
     * @return array An array of CDR data.
     */
    public static function getCdr(array $filter = []): array
    {
        if (empty($filter)) {
            $filter = [
                'work_completed<>1 AND endtime<>""',
                'miko_tmp_db' => true,
                'limit' => 2000
            ];
        }
        $filter['miko_result_in_file'] = true;
        if(!isset($filter['order'])){
            $filter['order'] = 'answer';
        }
        if (!isset($filter['columns'])) {
            $filter['columns'] = 'id,start,answer,src_num,src_name,dst_num,dst_name,dst_chan,endtime,linkedid,recordingfile,rec_src_channel,dialstatus,UNIQUEID';
        }

        $client = new BeanstalkClient(WorkerCdr::SELECT_CDR_TUBE);
        $filename = '';
        try {
            list($result, $message) = $client->sendRequest(json_encode($filter), 15);
            if ($result!==false){
                $filename = json_decode($message, true, 512, JSON_THROW_ON_ERROR);
            }
        } catch (\Throwable $e) {
            $filename = '';
        }
        $result_data = [];
        if (is_string($filename) && file_exists($filename)) {
            try {
                $result_data = json_decode(file_get_contents($filename), true, 512, JSON_THROW_ON_ERROR);
            } catch (\Throwable $e) {
                SystemMessages::sysLogMsg('SELECT_CDR_TUBE', 'Error parse response.');
            }

            $di = Di::getDefault();
            if ($di !== null) {
                $downloadCacheDir = $di->getShared('config')->path('www.downloadCacheDir');
                CdrResponseCacheLink::remove($downloadCacheDir, $filename);
            }
            unlink($filename);
        }

        return $result_data;
    }

    public static function claimCdr(array $request): array
    {
        $request['token'] = bin2hex(random_bytes(16));
        $request['limit'] = min(200, max(1, (int)($request['limit'] ?? 200)));
        $client = new BeanstalkClient(WorkerCdr::CLAIM_CDR_TUBE);
        $filename = '';
        try {
            [$ok, $message] = $client->sendRequest(json_encode($request, JSON_THROW_ON_ERROR), 15);
            if ($ok !== false) {
                $filename = json_decode($message, true, 512, JSON_THROW_ON_ERROR);
            }
            if (!is_string($filename) || !is_file($filename)) {
                return [];
            }
            return json_decode((string)file_get_contents($filename), true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(self::class, 'CDR claim failed: ' . $e->getMessage(), LOG_ERR);
            return [];
        } finally {
            if (is_string($filename) && is_file($filename)) {
                unlink($filename);
            }
        }
    }

    public static function releaseCdrClaim(string $token): void
    {
        if ($token === '') {
            return;
        }
        $client = new BeanstalkClient(WorkerCdr::RELEASE_CDR_CLAIM_TUBE);
        $client->sendRequest(json_encode(['token' => $token], JSON_THROW_ON_ERROR), 15);
    }

    /**
     * Retrieves all incomplete CDRs from the cache.
     * @return array  An array of CDR data.
     */
    public static function getCacheCdr(): array
    {
        $result = [];
        $di = Di::getDefault();
        if(!$di){
            return $result;
        }
        $managedCache   = $di->get(ManagedCacheProvider::SERVICE_NAME);
        $idsList        = $managedCache->getKeys(CallDetailRecordsTmp::CACHE_KEY);
        foreach ($idsList as $key){
            $cdr = $managedCache->get(str_replace(ManagedCacheProvider::CACHE_PREFIX, '', $key));
            if($cdr && $cdr['appname'] !== 'originate'){
                $result[] = $cdr;
            }
        }
        return $result;
    }

}
