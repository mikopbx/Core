<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionTransferDial {
    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $worker->addActiveChan($data['src_chan']);
        if($data['is_queue'] !== '1'){
            // Завершаем предыдущий неудачный Dial.
            // Необходимо в том случае, если не был создан канал назначения.
            $filter = [
                'transfer=1 AND endtime = "" AND dst_chan="" AND linkedid=:linkedid:',
                'bind' => [
                    'linkedid' => $data['linkedid']
                ],
            ];
            $m_data = CallDetailRecordsTmp::find($filter);
            /** @var CallDetailRecordsTmp $row */
            foreach ($m_data as $row) {
                // Установим признак переадресации.
                $row->writeAttribute('endtime', $data['start']);
                $row->save();
            }
        }


        ActionTransferCheck::execute($worker, $data);
        InsertDataToDB::execute($data);
        ActionAppEnd::execute($worker, $data);
    }
}