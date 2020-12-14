<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2020
 */

namespace MikoPBX\Common\Models;

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

    public function initialize(): void
    {
        $this->setSource('cdr');
        parent::initialize();
        $this->useDynamicUpdate(true);
        $this->setConnectionService('dbCDR');
    }

    public function afterSave():void {
        $work_completed = (string)$this->work_completed;
        if( $work_completed === '1'){
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
        parent::afterSave();
    }
}