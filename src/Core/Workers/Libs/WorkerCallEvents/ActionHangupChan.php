<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionHangupChan {

    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $channels       = [];
        $transfer_calls = [];

        self::hangupChanEndCalls($worker, $data, $transfer_calls, $channels);
        // Проверим, возможно это обычный трансфер.
        CreateRowTransfer::execute($worker, 'hangup_chan', $data, $transfer_calls);
        self::hangupChanCheckSipTrtansfer($worker, $data, $channels);

        // Очистим память.
        if(isset($worker->checkChanHangupTransfer[$data['agi_channel']])){
            unset($worker->checkChanHangupTransfer[$data['agi_channel']]);
        }
        if(isset($worker->mixMonitorChannels[$data['agi_channel']])){
            unset($worker->mixMonitorChannels[$data['agi_channel']]);
        }

    }

    /**
     * Обработка события уничтожения канала.
     * @param       $worker
     * @param array $data
     * @param array $transfer_calls
     * @param array $channels
     */
    private static function hangupChanEndCalls($worker, array $data, array &$transfer_calls, array &$channels):void{
        $filter         = [
            'linkedid=:linkedid: AND endtime = "" AND (src_chan=:src_chan: OR dst_chan=:dst_chan:)',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'src_chan' => $data['agi_channel'],
                'dst_chan' => $data['agi_channel'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        $countRows = count($m_data->toArray());
        foreach ($m_data as $row) {
            if ($row->transfer == 1) {
                $transfer_calls[] = $row->toArray();
            }
            if ($row->dialstatus === 'ORIGINATE') {
                $row->writeAttribute('dialstatus', '');
                if($row->answer === ''){
                    $newId = $row->linkedid.'_'.$row->src_num.'_'.substr($row->src_chan, strpos($row->src_chan,'-') +1);
                    $row->writeAttribute('UNIQUEID', $newId);
                }
            }
            $row->writeAttribute('endtime', $data['end']);
            $row->writeAttribute('transfer', 0);
            if ($data['dialstatus'] !== '') {
                if ($data['dialstatus'] === 'ORIGINATE') {
                    $row->writeAttribute('dst_chan', '');
                }
                $row->writeAttribute('dialstatus', $data['dialstatus']);
            }
            $res = $row->update();
            if ( ! $res) {
                Util::sysLogMsg('Action_hangup_chan', implode(' ', $row->getMessages()), LOG_DEBUG);
            }

            if ($row->src_chan !== $data['agi_channel']) {
                $channels[] = [
                    'chan' => $row->src_chan,
                    'did'  => $row->did,
                    'num'  => $row->src_num,
                    'out'  => true,
                ];
            } else {
                $worker->StopMixMonitor($row->dst_chan);
                $channels[] = [
                    'chan' => $row->dst_chan,
                    'did'  => $row->did,
                    'num'  => $row->dst_num,
                    'out'  => false,
                ];
            }
        }

        self::regMissedCall($data, $countRows);
    }

    /**
     * Если hangup_chan единственный event.
     * @param array $data
     * @param int   $tmpCdrCount
     */
    private static function regMissedCall(array $data, int $tmpCdrCount):void
    {
        if($tmpCdrCount > 0 || $data['did'] === ''){
            return;
        }
        if(stripos($data['agi_channel'], 'local/') !== false){
            // Локальные каналы не логируем как пропущенные.
            return;
        }
        $filter         = [
            'linkedid=:linkedid: AND (src_chan=:src_chan: OR dst_chan=:dst_chan:)',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'src_chan' => $data['agi_channel'],
                'dst_chan' => $data['agi_channel'],
            ],
        ];
        $m_data = CallDetailRecordsTmp::findFirst($filter);
        if($m_data !== null){
            return;
        }
        if(empty($data['UNIQUEID'])){
            $data['UNIQUEID'] = $data['agi_threadid'];
        }
        $time = (float)str_replace('mikopbx-', '', $data['linkedid']);
        $data['start']   = date("Y-m-d H:i:s.v", $time);
        $data['endtime'] = $data['end'];

        InsertDataToDB::execute($data);
    }

    /**
     * Проверяем на SIP трансфер.
     * @param $worker
     * @param $data
     * @param $channels
     */
    private static function hangupChanCheckSipTrtansfer($worker, $data, $channels):void{
        $not_local = (stripos($data['agi_channel'], 'local/') === false);
        if($not_local === false || $data['OLD_LINKEDID'] !== $data['linkedid']) {
            return;
        }
        $am = Util::getAstManager('off');
        $active_chans = $am->GetChannels(false);
        // Намек на SIP трансфер.
        foreach ($channels as $data_chan) {
            if ( ! in_array($data_chan['chan'], $active_chans, true)) {
                // Вызов уже завершен. Не интересно.
                continue;
            }
            $BRIDGEPEER = $am->GetVar($data_chan['chan'], 'BRIDGEPEER', null, false);
            if ( !is_string($BRIDGEPEER) || ! in_array($BRIDGEPEER, $active_chans, true)) {
                // Вызов уже завершен. Не интересно.
                continue;
            }

            $linkedid = $am->GetVar($data_chan['chan'], 'CHANNEL(linkedid)', null, false);
            if ( empty($linkedid) || $linkedid === $data['linkedid']) {
                continue;
            }

            $CALLERID = $am->GetVar($BRIDGEPEER, 'CALLERID(num)', null, false);
            $n_data['action']        = 'sip_transfer';
            $n_data['src_chan']      = $data_chan['out'] ? $data_chan['chan'] : $BRIDGEPEER;
            $n_data['src_num']       = $data_chan['out'] ? $data_chan['num'] : $CALLERID;
            $n_data['dst_chan']      = $data_chan['out'] ? $BRIDGEPEER : $data_chan['chan'];
            $n_data['dst_num']       = $data_chan['out'] ? $CALLERID : $data_chan['num'];
            $n_data['start']         = date('Y-m-d H:i:s');
            $n_data['answer']        = date('Y-m-d H:i:s');
            $n_data['linkedid']      = $linkedid;
            $n_data['UNIQUEID']      = $data['linkedid'] . Util::generateRandomString();
            $n_data['transfer']      = '0';
            $n_data['recordingfile'] = $worker->MixMonitor($n_data['dst_chan'], $n_data['UNIQUEID']);
            $n_data['did']           = $data_chan['did'];

            Util::logMsgDb('call_events', json_encode($n_data));
            InsertDataToDB::execute($n_data);
            $filter = [
                'linkedid=:linkedid:',
                'bind' => ['linkedid' => $data['linkedid']],
            ];
            $m_data = CallDetailRecordsTmp::find($filter);
            foreach ($m_data as $row) {
                $row->writeAttribute('linkedid', $linkedid);
                $row->save();
            }

            /**
             * Отправка UserEvent
             */
            $AgiData = base64_encode(json_encode($n_data));
            $am->UserEvent('CdrConnector', ['AgiData' => $AgiData]);
        } // Обход текущих каналов.
    }
}