<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionVoicemailEnd {

    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $filename = Util::trimExtensionForFile($data['vm-recordingfile']) . '.wav';
        $recordingFile = '';
        if (file_exists($filename)) {
            // Переопределим путь к файлу записи разговора. Для конферецнии файл один.
            $monitor_dir = Storage::getMonitorDir();
            $sub_dir = date('Y/m/d/H/');
            $dirName = "{$monitor_dir}/{$sub_dir}";
            if(Util::mwMkdir($dirName)){
                $recordingFile = "{$dirName}{$data['UNIQUEID']}_".basename($filename);
                $cpPath = Util::which('cp');
                Processes::mwExec("{$cpPath} {$filename} {$recordingFile}");
                if(!file_exists($recordingFile)){
                    $recordingFile = '';
                }else{
                    $recordingFile = Util::trimExtensionForFile($recordingFile) . '.mp3';
                }
            }
        }
        $filter         = [
            'linkedid=:linkedid: AND UNIQUEID = :UNIQUEID:',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'UNIQUEID' => $data['UNIQUEID'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->writeAttribute('transfer', 0);
            $row->writeAttribute('endtime',       $data['end']);
            $row->writeAttribute('recordingfile', $recordingFile);
            $row->update();
        }
    }

}