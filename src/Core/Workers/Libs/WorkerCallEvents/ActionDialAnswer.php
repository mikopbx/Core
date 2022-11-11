<?php


namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;


use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;

class ActionDialAnswer {
    private const NEED_CONTINUE = 1;
    private const NEED_BREAK    = 2;
    private const NORM_EXIT     = 0;

    public static function execute(WorkerCallEvents $worker, $data):void
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $pickupexten   = $mikoPBXConfig->getGeneralSettings('PBXFeaturePickupExten');
        if (trim($data['dnid']) === $pickupexten) {
            // Pickup / перехват вызова.
            // Событие возникает, когда мы пытаемся перехватить вызов на соседний телефон.
            self::fillPickUpCdr($worker, $data);
        } else {
            self::checkSmartIvrCalls($data);
            $filter = self::getCallDataFilter($data);

            // Отмечаем вызов как отвеченный.
            $m_data = CallDetailRecordsTmp::find($filter);
            foreach ($m_data as $row) {
                $result = self::fillAnsweredCdr($worker, $data, $row);
                if ($result === self::NEED_BREAK) {
                    break;
                }

                if($result === self::NEED_CONTINUE) {
                    continue;
                }
            }
        }
    }

    /**
     * Возвращает фильтр по текущим CDR.
     * @param $data
     * @return array
     */
    private static function getCallDataFilter($data):array{
        if (isset($data['org_id'])) {
            // Вероятно необходимо переопределить искать по двум ID.
            // Применимо только для Originate, когда в качестве звонящего используем два канала
            // мобильный и внутренний номер.
            $filter = [
                '(UNIQUEID=:UNIQUEID: OR UNIQUEID=:org_id:) AND answer = "" AND endtime = ""',
                'bind' => [
                    'UNIQUEID' => $data['id'],
                    'org_id'   => $data['org_id'],
                ],
            ];
        } else {
            $filter = [
                '(UNIQUEID=:UNIQUEID: OR UNIQUEID=:UNIQUEID_CHAN:) AND answer = "" AND endtime = ""',
                'bind' => [
                    'UNIQUEID'      => $data['id'],
                    'UNIQUEID_CHAN' => $data['id'] . '_' . $data['agi_channel'],
                ],
            ];
        }

        return $filter;
    }

    /**
     * Проверка параметров SmartIVR звонка.
     * @param $data
     */
    private static function checkSmartIvrCalls($data):void
    {
        if ( empty($data['ENDCALLONANSWER'])) {
            return;
        }
        // Переменная ENDCALLONANSWER устанавливается при начале работы умной маршуртизации.
        // Как только произошел ответ на вызов, отметим вызов на приложение как завершенный.
        $filter = [
            'UNIQUEID<>:UNIQUEID: AND is_app=1 AND endtime = "" AND src_chan=:src_chan:',
            'bind' => [
                'UNIQUEID' => $data['id'],
                'src_chan' => $data['BRIDGEPEER'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->writeAttribute('endtime', $data['answer']);
            $row->writeAttribute('is_app', 1);
            $res = $row->save();
            if ( ! $res) {
                Util::sysLogMsg('ENDCALLONANSWER', implode(' ', $row->getMessages()), LOG_DEBUG);
            }
        }
    }

    /**
     * Обработка PickUp звонка.
     * @param WorkerCallEvents $worker
     * @param $data
     */
    private static function fillPickUpCdr($worker, $data):void
    {
        // Pickup / перехват вызова.
        // Событие возникает, когда мы пытаемся перехватить вызов на соседний телефон.
        $filter = [
            'UNIQUEID=:UNIQUEID:',
            'bind' => ['UNIQUEID' => $data['old_id'],],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        $m_data = CallDetailRecordsTmp::find($filter);
        if (count($m_data->toArray()) === 1) {
            /** @var CallDetailRecordsTmp $m_row_data */
            $m_row_data                 = $m_data[0];
            $new_data                   = $m_row_data->toArray();
            $new_data['start']          = $data['answer'];
            $new_data['answer']         = $data['answer'];
            $new_data['endtime']        = '';
            $new_data['dst_chan']       = $data['agi_channel'];
            $new_data['dst_num']        = $data['dst_num'];
            $new_data['UNIQUEID']       = $data['id'];
            $new_data['recordingfile']  = $worker->MixMonitor($new_data['dst_chan'],  'pickup_'.$new_data['UNIQUEID'], null, null, 'fillPickUpCdr');

            unset($new_data['id'], $new_data['end']);
            InsertDataToDB::execute($new_data);
            /**
             * Отправка UserEvent
             */
            $new_data['action'] = 'answer_pickup_create_cdr';
            $AgiData            = base64_encode(json_encode($new_data));
            $am = Util::getAstManager('off');
            $am->UserEvent('CdrConnector', ['AgiData' => $AgiData]);
        }
    }

    /**
     * Заполнение информации об отвеченном вызове.
     * @param $worker
     * @param $data
     * @param $row
     * @return int
     */
    private static function fillAnsweredCdr($worker, $data, $row): int
    {

        if ($row->dialstatus === 'ORIGINATE') {
            if ($row->src_chan !== $data['agi_channel']) {
                // Ищем совпадающий канал
                return self::NEED_CONTINUE;
            }
            // Найдем все прочие CDR по данному originate и отметим как завершенные.
            $filter      = [
                'linkedid=:linkedid: AND endtime <> "" AND src_chan <> :src_chan:',
                'bind' => [
                    'linkedid' => $row->linkedid,
                    'src_chan' => $data['agi_channel'],
                ],
            ];
            $m_orgn_data = CallDetailRecordsTmp::find($filter);
            /** @var CallDetailRecordsTmp $orgn_row */
            foreach ($m_orgn_data as $orgn_row) {
                if (empty($orgn_row->endtime)) {
                    $orgn_row->writeAttribute('endtime', $data['answer']);
                }
                $orgn_row->writeAttribute('dst_chan', '');
                $orgn_row->writeAttribute('UNIQUEID', $data['id'] . '_' . $orgn_row->src_chan);
                $orgn_row->update();
            }

            $row->writeAttribute('dst_chan', '');
            $row->writeAttribute('dialstatus', '');
            $row->writeAttribute('UNIQUEID', $data['id']);
            $row->save();
            return self::NEED_BREAK;
        }

        $row->writeAttribute('answer', $data['answer']);
        $recFile = $data['recordingfile']??'';
        if(!empty($recFile)){
            $worker->mixMonitorChannels[$data['agi_channel']] = $recFile;
            $row->writeAttribute('recordingfile', $recFile);
        }
        $res = $row->save();
        if ( !$res) {
            Util::sysLogMsg('Action_dial_answer', implode(' ', $row->getMessages()), LOG_DEBUG);
        }
        return self::NORM_EXIT;
    }
}