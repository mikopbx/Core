<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionCelAnswer {
    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $channel = $data['Channel']??'';
        if(empty($channel) || stripos($channel, 'local') === 0 || $worker->existsActiveChan($channel)){
            return;
        }
        $worker->addActiveChan($channel);
        usleep(100000);
        $linkedId = Util::getAstManager('off')->GetVar($channel, 'CHANNEL(linkedid)','',false);
        if($linkedId === $data['LinkedID']){
            return;
        }
        // Это возврат вызова после консультативной переадресации.
        $filter         = [
            'linkedid=:linkedid: AND a_transfer = "1"',
            'bind' => [
                'linkedid' => $linkedId,
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row){
            $row->a_transfer = '0';
            $row->save();
            if($worker->existsActiveChan($row->src_chan)){
                $chan   = $row->src_chan;
                $number = $row->src_num;
            }elseif ($worker->existsActiveChan($row->dst_chan)){
                $chan = $row->dst_chan;
                $number = $row->dst_num;
            }else{
                continue;
            }
            $insert_data['action']        = "ret_after_trasfer";
            $insert_data['start']         = date('Y-m-d H:i:s.v', str_replace('mikopbx-', '', $data['LinkedID']));
            $insert_data['answer']        = $data['EventTime'];
            $insert_data['src_chan']      = $chan;
            $insert_data['src_num']       = $number;
            $insert_data['dst_chan']      = $channel;
            $insert_data['dst_num']       = $data['CallerIDnum'];
            $insert_data['linkedid']      = $linkedId;
            $insert_data['UNIQUEID']      = $data['UniqueID']."_".Util::generateRandomString();
            $insert_data['did']           = $row->did;
            $insert_data['transfer']      = '0';

            if($worker->enableMonitor($insert_data['src_num']??'', $insert_data['dst_num']??'')){
                $insert_data['recordingfile'] = $worker->MixMonitor($insert_data['dst_chan'], $insert_data['UNIQUEID'], null, null, 'ret_after_trasfer');
            }
            InsertDataToDB::execute($insert_data);
        }
    }
}