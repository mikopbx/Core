<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

/**
 * Class ActionCelAttendedTransfer
 * This class is responsible for handling certain events when a call is transfer.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class ActionCelAttendedTransfer
{
    /**
     * Executes the action when a Call Event Log (CEL) answer event occurs.
     *
     * @param WorkerCallEvents $worker Instance of WorkerCallEvents.
     * @param array $data Data related to the event.
     * @return void
     */
    public static function execute(WorkerCallEvents $worker, array $data): void
    {
        $extra = json_decode($data['Extra'], true);
        $am = Util::getAstManager('off');
        if(stripos($extra['transferee_channel_name'],'local') === 0){
            $chanTarget = $am->GetVar($extra['transferee_channel_name'],'ATTENDEDTRANSFER', '' ,false);
        }else{
            $chanTarget = $extra['transferee_channel_name'];
        }
        $chanId1 = $worker->getActiveChanId($extra['channel2_name']);
        $chanId2 = $worker->getActiveChanId($chanTarget);
        if(empty($chanId1) || empty($chanId2)){
            return;
        }

        if($chanId1 !== $chanId2){
            $filter = [
                'linkedid=:linkedid1: OR linkedid=:linkedid2:',
                'bind' => [
                    'linkedid1' => $chanId1,
                    'linkedid2' => $chanId2,
                ],
            ];
            $n_data=[];
            $n_data['action'] = 'sip_transfer';
            /** @var CallDetailRecordsTmp $row */
            $m_data = CallDetailRecordsTmp::find($filter);
            foreach ($m_data as $row){
                if(empty($row->endtime)){
                    if(in_array($row->src_chan, [$extra['channel2_name'], $data['Channel']], true)) {
                        $n_data['dst_chan'] = $row->dst_chan;
                        $n_data['dst_num']  = $row->dst_num;
                        $n_data['did'] = $row->did;
                        $worker->StopMixMonitor($n_data['dst_chan']);
                    }elseif(in_array($row->dst_chan, [$extra['channel2_name'], $data['Channel']], true)){
                        $n_data['src_chan'] = $row->src_chan;
                        $n_data['src_num']  = $row->src_num;
                        $n_data['did'] = $row->did;
                        $worker->StopMixMonitor($n_data['src_chan']);
                    }
                }
            }
            $m_data = CallDetailRecordsTmp::find($filter);
            foreach ($m_data as $row) {
                // Set new linked ID.
                if($row->linkedid !== $chanId2){
                    $row->writeAttribute('linkedid', $chanId2);
                }
                if(empty($row->endtime)){
                    if(in_array($row->src_chan, [$extra['channel2_name'], $data['Channel']], true)) {
                        $row->writeAttribute('endtime', date('Y-m-d H:i:s'));
                    }elseif(in_array($row->dst_chan, [$extra['channel2_name'], $data['Channel']], true)){
                        $row->writeAttribute('endtime', date('Y-m-d H:i:s'));
                    }
                }
                $row->save();
            }
            $n_data['start']    = date('Y-m-d H:i:s');
            $n_data['answer']   = date('Y-m-d H:i:s');
            $n_data['linkedid'] = $chanId2;
            $n_data['UNIQUEID'] = $chanId2 . Util::generateRandomString();
            $n_data['transfer'] = '0';
            if(isset($n_data['dst_chan'], $n_data['src_chan'])){
                if ($worker->enableMonitor($n_data['src_num'] ?? '', $n_data['dst_num'] ?? '')) {
                    $n_data['recordingfile'] = $worker->MixMonitor($n_data['dst_chan'], $n_data['UNIQUEID'], '', '', 'hangupChanCheckSipAttTrtansfer');
                }
                InsertDataToDB::execute($n_data);
                // Sending UserEvent
                $AgiData = base64_encode(json_encode($n_data));
                $am->UserEvent('CdrConnector', ['AgiData' => $AgiData]);
            }
        }
    }
}