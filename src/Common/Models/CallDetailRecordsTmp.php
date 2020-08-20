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
            $this->delete();
        }
        parent::afterSave();
    }
}