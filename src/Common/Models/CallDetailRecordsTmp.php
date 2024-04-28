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

namespace MikoPBX\Common\Models;

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\SystemMessages;
use Throwable;

/**
 * Class CallDetailRecordsTmp
 *
 * @package MikoPBX\Common\Models
 *
 * @Indexes(
 *     [name='UNIQUEID', columns=['UNIQUEID'], type=''],
 *     [name='start', columns=['start'], type=''],
 *     [name='src_chan', columns=['src_chan'], type=''],
 *     [name='dst_chan',columns=['dst_chan'], type=''],
 *     [name='src_num', columns=['src_num'], type=''],
 *     [name='dst_num', columns=['dst_num'], type=''],
 *     [name='linkedid', columns=['linkedid'], type='']
 * )
 */
class CallDetailRecordsTmp extends CallDetailRecordsBase
{
    public const CACHE_KEY = 'Workers:Cdr';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('cdr');
        parent::initialize();
        $this->useDynamicUpdate(true);
        $this->setConnectionService('dbCDR');
    }

     public function beforeSave()
     {
         if(empty($this->linkedid)){
             $trace = debug_backtrace();
             $error =  "Call trace:\n";
             foreach ($trace as $index => $item) {
                 if ($index > 0) {
                     $error.= "{$index}. {$item['file']} (line {$item['line']})\n";
                 }
             }
             SystemMessages::sysLogMsg('ERROR_CDR '.getmypid(), $error);
         }
     }

    /**
     * Perform necessary actions after saving the record.
     */
    public function afterSave(): void
    {
        $moveToGeneral = true;
        // Check if the call was answered and either an interception or originate.
        // In such cases, forcefully logging the call is not required.
        if ($this->disposition === 'ANSWERED' &&
            ($this->appname === 'interception' || $this->appname === 'originate')) {
            $moveToGeneral = false;
        }

        $work_completed = (string)$this->work_completed;

        // If work is completed (value of 'work_completed' is '1') and should be moved to general CDR,
        // create a new CallDetailRecords instance and copy relevant attributes.
        if ($work_completed === '1' && $moveToGeneral) {
            $newCdr = new CallDetailRecords();
            $vars = $this->toArray();
            foreach ($vars as $key => $value) {
                if ('id' === $key) {
                    continue;
                }
                if (property_exists($newCdr, $key)) {
                    $newCdr->writeAttribute($key, $value);
                }
            }
            $newCdr->save();
        }
        $this->saveCdrCache();
    }

    /**
     * Store current calls in Redis cache.
     *
     * @param bool $isSave Indicates whether to save the call record to cache.
     * @return void
     */
    private function saveCdrCache(bool $isSave = true): void
    {
        try {
            $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);

            $rowData = $this->toArray();
            $newKey = self::CACHE_KEY . ':' . $rowData['UNIQUEID'];
            $idsList = $managedCache->getKeys(self::CACHE_KEY);
            if ($isSave && !in_array($newKey, $idsList, true)) {
                $idsList[$rowData['UNIQUEID']] = true;
                $managedCache->set('Workers:Cdr:' . $rowData['UNIQUEID'], $rowData, 19200);
            } else {
                $managedCache->delete('Workers:Cdr:' . $rowData['UNIQUEID']);
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(self::class, $e->getMessage());
            return;
        }
    }

    /**
     * Perform necessary actions after deleting the record.
     */
    public function afterDelete(): void
    {
        $this->saveCdrCache(false);
    }

}