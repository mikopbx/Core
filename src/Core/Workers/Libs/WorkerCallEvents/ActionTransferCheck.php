<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionTransferCheck {

    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $filter = [
            'linkedid=:linkedid: AND endtime = "" AND transfer=0 AND (src_chan=:src_chan: OR dst_chan=:src_chan:)',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'src_chan' => $data['src_chan'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            // Пробуем остановить записть разговора.
            $worker->StopMixMonitor($row->dst_chan);
            $worker->StopMixMonitor($row->src_chan);
            // Установим признак переадресации.
            $row->writeAttribute('transfer', 1);
            $row->save();
        }
    }
}