<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionAppEnd {

    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $filter = self::getFilter($data);
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->writeAttribute('endtime', $data['start']);
            $res = $row->update();
            if ( ! $res) {
                Util::sysLogMsg(static::class, implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }

    private static function getFilter($data):array
    {
        return [
            'linkedid=:linkedid: AND is_app=1 AND endtime = ""',
            'bind' => [
                'linkedid' => $data['linkedid'],
            ],
        ];
    }

}