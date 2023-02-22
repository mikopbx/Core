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

namespace MikoPBX\Common\Models;

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Util;

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
     * @Column(type="integer", nullable=true)
     */
    public ?string $a_transfer = '0';

    public function initialize(): void
    {
        $this->setSource('cdr');
        parent::initialize();
        $this->useDynamicUpdate(true);
        $this->setConnectionService('dbCDR');
    }

    public function afterSave():void {

        $moveToGeneral = true;
        if( $this->disposition === 'ANSWERED' &&
            ($this->appname === 'interception' || $this->appname === 'originate') ){
            // Это успешный originate или перехват на ответственного.
            // Принудительно логировать такой вызов не следует.
            $moveToGeneral = false;
        }

        $work_completed = (string)$this->work_completed;
        if( $work_completed === '1' && $moveToGeneral){
            $newCdr = new CallDetailRecords();
            $vars   = $this->toArray();
            foreach ($vars as $key => $value){
                if( 'id' === $key){
                    continue;
                }
                if(property_exists($newCdr, $key)){
                    $newCdr->writeAttribute($key, $value);
                }
            }
            $newCdr->save();
        }
        $this->saveCdrCache();
    }

    public function afterDelete():void
    {
        $this->saveCdrCache(false);
    }

    /**
     * Храним в Redis текущие звонки.
     * @param bool $isSave
     * @return void
     */
    private function saveCdrCache(bool $isSave = true):void
    {
        try {
            $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);

            $rowData = $this->toArray();
            $newKey  = self::CACHE_KEY.':'.$rowData['UNIQUEID'];
            $idsList = $managedCache->getKeys(self::CACHE_KEY);
            if($isSave && !in_array($newKey, $idsList, true)){
                $idsList[$rowData['UNIQUEID']] = true;
                $managedCache->set('Workers:Cdr:'.$rowData['UNIQUEID'], $rowData, 19200);
            }else{
                $managedCache->delete('Workers:Cdr:'.$rowData['UNIQUEID']);
            }
        }catch (\Throwable $e){
            Util::sysLogMsg(self::class, $e->getMessage());
            return;
        }
    }

}