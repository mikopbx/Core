<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\Asterisk\Configs\VoiceMailConf;
use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionVoicemailEnd {

    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $recordingFile = VoiceMailConf::getCopyFilename($data['vm-recordingfile'], $data['linkedid'],time(), false);
        $filter         = [
            'linkedid=:linkedid: AND dst_num = "'.VoiceMailConf::VOICE_MAIL_EXT.'"',
            'bind' => [
                'linkedid' => $data['linkedid'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->writeAttribute('transfer', 0);
            $row->writeAttribute('endtime',       $data['endtime']);
            $row->writeAttribute('recordingfile', $recordingFile);
            $row->update();
        }
    }

}