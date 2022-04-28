<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionDialEnd {

    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $filter = self::getFilter($data);
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->writeAttribute('endtime', $data['endtime']);
            $res = $row->update();
            if (!$res) {
                Util::sysLogMsg(static::class, implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }

    private static function getFilter($data):array
    {
        return [
            'UNIQUEID=:UNIQUEID: AND src_chan=:src_chan: AND dst_chan = ""',
            'bind' => [
                'UNIQUEID' => $data['UNIQUEID'],
                'src_chan' => $data['src_chan'],
            ],
        ];
    }
}