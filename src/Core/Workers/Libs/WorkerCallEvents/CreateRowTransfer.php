<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

class CreateRowTransfer {

    public static function execute(WorkerCallEvents $worker, $action, $data, $calls_data = null):void
    {
        if( isset($worker->checkChanHangupTransfer[$data['agi_channel']]) ) {
            return;
        }
        $worker->checkChanHangupTransfer[$data['agi_channel']] = $action;
        self::initCallsData($data,$calls_data);
        if (count($calls_data) === 2) {
            // Это нормальная переадресация
            self::fillRedirectCdrData($worker, $action, $data, $calls_data);
        } elseif (self::isFailRedirect($calls_data)) {
            // Неудачная переадресация.
            self::fillFailRedirectCdrData($worker, $data, $calls_data);
        }
    }

    /**
     * Проверка на обрыв переадресации.
     * @param $calls_data
     * @return bool
     */
    private static function isFailRedirect($calls_data):bool
    {
        return empty($calls_data[0]['answer']) && count($calls_data) === 1 && ! empty($calls_data[0]['recordingfile']);
    }

    /**
     * Обработка обрыва переадресации.
     * @param $worker
     * @param $data
     * @param $calls_data
     */
    private static function fillFailRedirectCdrData($worker, $data, $calls_data):void
    {
        // Возобновление записи разговора при срыве переадресации.
        $row_data = $calls_data[0];
        $chan     = ($data['agi_channel'] === $row_data['src_chan']) ? $row_data['dst_chan'] : $row_data['src_chan'];
        $filter   = [
            'linkedid=:linkedid: AND endtime = ""',
            'bind'  => [
                'linkedid' => $data['linkedid'],
            ],
            'order' => 'is_app',
        ];
        /** @var CallDetailRecordsTmp $not_ended_cdr */
        $cdr = CallDetailRecordsTmp::find($filter);
        /** @var CallDetailRecordsTmp $row */
        $not_ended_cdr = null;
        $transferNotComplete = false;
        foreach ($cdr as $row){
            if($row->transfer === '1' && ($row->src_chan === $chan || $row->dst_chan === $chan) ){
                $not_ended_cdr = $row;
            }
            if($row->answer === '' && $row->endtime === ''
                && ($row->src_chan === $chan || $row->dst_chan === $chan) ){
                $transferNotComplete = true;
            }
        }

        if ($not_ended_cdr !== null && !$transferNotComplete) {
            $worker->StopMixMonitor($not_ended_cdr->src_chan);
            $worker->MixMonitor($not_ended_cdr->dst_chan, '', '', $not_ended_cdr->recordingfile);
        }
    }

    /**
     * Обработка нормальной переадресации.
     * @param $worker
     * @param $action
     * @param $data
     * @param $calls_data
     */
    private static function fillRedirectCdrData($worker, $action, $data, $calls_data):void
    {
        $insert_data = [];
        foreach ($calls_data as $row_data) {
            if ($row_data['src_chan'] === $data['agi_channel']) {
                $fname_chan = isset($insert_data['dst_chan']) ? 'src_chan' : 'dst_chan';
                $fname_num  = isset($insert_data['dst_num']) ? 'src_num' : 'dst_num';

                $insert_data[$fname_chan] = $row_data['dst_chan'];
                $insert_data[$fname_num]  = $row_data['dst_num'];
            } else {
                $fname_chan = ! isset($insert_data['src_chan']) ? 'src_chan' : 'dst_chan';
                $fname_num  = ! isset($insert_data['src_num']) ? 'src_num' : 'dst_num';

                $insert_data[$fname_chan] = $row_data['src_chan'];
                $insert_data[$fname_num]  = $row_data['src_num'];
            }
        }
        // Запись разговора.
        $worker->StopMixMonitor($insert_data['src_chan']);
        $worker->StopMixMonitor($insert_data['dst_chan']);
        $recordingfile = $worker->MixMonitor(
            $insert_data['dst_chan'],
            'transfer_' . $insert_data['src_num'] . '_' . $insert_data['dst_num'] . '_' . $data['linkedid']
        );
        //
        $insert_data['action']        = "{$action}_end_trasfer";
        $insert_data['recordingfile'] = $recordingfile;
        $insert_data['start']         = $data['end'];
        $insert_data['answer']        = $data['end'];
        $insert_data['linkedid']      = $data['linkedid'];
        $insert_data['UNIQUEID']      = $data['agi_threadid'];
        $insert_data['did']           = $data['did'];
        $insert_data['transfer']      = '0';

        /**
         * Отправка UserEvent
         */
        $insert_data['action'] = 'transfer_dial_create_cdr';

        $AgiData               = base64_encode(json_encode($insert_data));
        $am = Util::getAstManager('off');
        $am->UserEvent('CdrConnector', ['AgiData' => $AgiData]);

        InsertDataToDB::execute($insert_data);
    }

    /**
     * Получает из базы данных строки истории звонков.
     * @param $data
     * @param $calls_data
     */
    private static function initCallsData($data, &$calls_data):void
    {
        if (null === $calls_data) {
            $filter     = [
                'linkedid=:linkedid: AND endtime = "" AND transfer=1 AND (src_chan=:chan: OR dst_chan=:chan:)',
                'bind'  => [
                    'linkedid' => $data['linkedid'],
                    'chan'     => $data['agi_channel'],
                ],
                'order' => 'is_app',
            ];
            $m_data     = CallDetailRecordsTmp::find($filter);
            $calls_data = $m_data->toArray();
        }
    }

}