<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Common\Models\CallDetailRecords;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionInsertCdr {
    /**
     * Обработка события начала телефонного звонка.
     * @param $worker
     * @param $cdr
     */
    public static function execute(WorkerCallEvents $worker, $cdr):void
    {
        foreach ($cdr['rows'] as $data){
            if (empty($data['UNIQUEID'])) {
                Util::sysLogMsg(__FUNCTION__, 'UNIQUEID is empty ' . json_encode($data), LOG_DEBUG);
                return;
            }
            $m_data = CallDetailRecords::findFirst(
                [
                    "UNIQUEID=:id:",
                    'bind' => [
                        'id'       => $data['UNIQUEID'],
                    ],
                ]
            );
            if(!$m_data){
                /** @var CallDetailRecords $m_data */
                $m_data = new CallDetailRecords();
            }
            $f_list = $m_data->toArray();
            foreach ($data as $attribute => $value) {
                if ( ! array_key_exists($attribute, $f_list)) {
                    continue;
                }
                $m_data->writeAttribute($attribute, $value);
            }
            if (!$m_data->save()) {
                Util::sysLogMsg(__FUNCTION__, implode(' ', $m_data->getMessages()), LOG_ERR);
            }
        }
    }
}