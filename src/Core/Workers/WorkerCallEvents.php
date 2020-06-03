<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;
require_once 'globals.php';

use MikoPBX\Common\Models\{CallDetailRecords, CallDetailRecordsTmp};
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\System\{BeanstalkClient, MikoPBXConfig, Util};
use Phalcon\Di;
use Phalcon\Exception;

use function function_exists;

class WorkerCallEvents extends WorkerBase
{

    /**
     * Обработка события начала телефонного звонка.
     *
     * @param $data
     */
    public static function Action_dial($data): void
    {
        CdrDb::insertDataToDbM($data);
        self::Action_app_end($data);
    }

    /**
     * Завершение работы приложения.
     *
     * @param $data
     */
    public static function Action_app_end($data): void
    {
        $filter = [
            'linkedid=:linkedid: AND is_app=1 AND endtime IS NULL',
            'bind' => [
                'linkedid' => $data['linkedid'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->writeAttribute('endtime', $data['start']);
            $res = $row->update();
            if ( ! $res) {
                Util::sysLogMsg('Action_app_end', implode(' ', $row->getMessages()));
            }
        }
    }

    /**
     * Обработка события создания канала - пары, при начале телефонного звонка.
     *
     * @param $data
     */
    public static function Action_dial_create_chan($data): void
    {
        if (isset($data['org_id'])) {
            // Вероятно необходимо переопределить искать по двум ID.
            // Применимо только для Originate, когда в качестве звонящего используем два канала
            // мобильный и внутренний номер.
            $filter = [
                '(UNIQUEID=:UNIQUEID: OR UNIQUEID=:org_id:) AND endtime IS NULL',
                'bind' => ['UNIQUEID' => $data['UNIQUEID'], 'org_id' => $data['org_id'],],
            ];
        } else {
            $filter = [
                'UNIQUEID=:UNIQUEID: AND answer IS NULL AND endtime IS NULL',
                'bind' => [
                    'UNIQUEID' => $data['UNIQUEID'],
                ],
            ];
        }

        $rec_start  = false;
        $row_create = false;
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            if ( ! is_object($row)) {
                continue;
            }
            ///
            // Проверим, если более одного канала SIP/256 при входящем.
            $column_chan_name = ('ORIGINATE' === $row->dialstatus) ? 'src_chan' : 'dst_chan';

            if ( ! empty($row->$column_chan_name) && $data['dst_chan'] !== $row->$column_chan_name) {
                if ($row_create) {
                    continue;
                }
                // Необходимо дублировать строку звонка.
                $new_row = new CallDetailRecordsTmp();
                $f_list  = $row->toArray();
                foreach ($f_list as $attribute => $value) {
                    if ($attribute === 'id') {
                        continue;
                    }
                    $new_row->writeAttribute($attribute, $value);
                }
                $new_row->writeAttribute($column_chan_name, $data['dst_chan']);
                $new_row->writeAttribute('UNIQUEID', $data['UNIQUEID'] . '_' . $data['dst_chan']);
                // Подмена $row;
                $row        = $new_row;
                $row_create = true;
            }
            // конец проверки
            ///

            if ($row->dialstatus === 'ORIGINATE') {
                $account_col = 'from_account';
                // При оригинации меняется местами srs_chan в поле dst_chan.
                $row->writeAttribute('src_chan', $data['dst_chan']);
            } else {
                if ( ! $rec_start) {
                    $data['recordingfile'] = CdrDb::MixMonitor(
                        $data['dst_chan'],
                        $row->UNIQUEID,
                        null,
                        $row->recordingfile
                    );
                    $row->writeAttribute('recordingfile', $data['recordingfile']);
                    $rec_start = true;
                }
                $account_col = 'to_account';
                $row->writeAttribute('dst_chan', $data['dst_chan']);
            }

            if (isset($data['to_account']) && ! empty($data['to_account'])) {
                $row->writeAttribute($account_col, $data['to_account']);
            }
            if (isset($data['dst_call_id']) && ! empty($data['dst_call_id'])) {
                $row->writeAttribute('dst_call_id', $data['dst_call_id']);
            }
            $res = $row->save();
            if ( ! $res) {
                Util::sysLogMsg('Action_dial_create_chan', implode(' ', $row->getMessages()));
            }
        }
    }

    /**
     * Обработка события ответа на звонок. Соединение абонентов.
     *
     * @param $data
     */
    public static function Action_dial_answer($data): void
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $pickupexten   = $mikoPBXConfig->getPickupExten();
        if (trim($data['dnid']) === $pickupexten) {
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
                $m_row_data           = $m_data[0];
                $new_data             = $m_row_data->toArray();
                $new_data['start']    = $data['answer'];
                $new_data['answer']   = $data['answer'];
                $new_data['endtime']  = null;
                $new_data['dst_chan'] = $data['agi_channel'];
                $new_data['dst_num']  = $data['dst_num'];
                $new_data['UNIQUEID'] = $data['id'];
                unset($new_data['end']);
                CdrDb::insertDataToDbM($new_data);

                /**
                 * Отправка UserEvent
                 */
                $new_data['action'] = 'answer_pickup_create_cdr';
                $am                 = Util::getAstManager('off');
                $AgiData            = base64_encode(json_encode($new_data));
                $am->UserEvent('CdrConnector', ['AgiData' => $AgiData]);
            }
        } else {
            if ( ! empty($data['ENDCALLONANSWER'])) {
                // Переменная ENDCALLONANSWER устанавливается при начале работы умной маршуртизации.
                // Как только произошел ответ на вызов, отметим вызов на приложение как завершенный.
                $filter = [
                    'UNIQUEID<>:UNIQUEID: AND is_app=1 AND endtime IS NULL AND src_chan=:src_chan:',
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
                        Util::sysLogMsg('ENDCALLONANSWER', implode(' ', $row->getMessages()));
                    }
                }
            }

            if (isset($data['org_id'])) {
                // Вероятно необходимо переопределить искать по двум ID.
                // Применимо только для Originate, когда в качестве звонящего используем два канала
                // мобильный и внутренний номер.
                $filter = [
                    '(UNIQUEID=:UNIQUEID: OR UNIQUEID=:org_id:) AND answer IS NULL AND endtime IS NULL',
                    'bind' => [
                        'UNIQUEID' => $data['id'],
                        'org_id'   => $data['org_id'],
                    ],
                ];
            } else {
                $filter = [
                    '(UNIQUEID=:UNIQUEID: OR UNIQUEID=:UNIQUEID_CHAN:) AND answer IS NULL AND endtime IS NULL',
                    'bind' => [
                        'UNIQUEID'      => $data['id'],
                        'UNIQUEID_CHAN' => $data['id'] . '_' . $data['agi_channel'],
                    ],
                ];
            }
            // Отмечаем вызов как отвеченный.
            $m_data = CallDetailRecordsTmp::find($filter);
            foreach ($m_data as $row) {
                if ($row->dialstatus === 'ORIGINATE') {
                    if ($row->src_chan !== $data['agi_channel']) {
                        // Ищем совпадающий канал
                        continue;
                    }
                    // Найдем все прочие CDR по данному originate и отметим как завершенные.
                    $filter      = [
                        'linkedid=:linkedid: AND endtime IS NOT NULL AND src_chan <> :src_chan:',
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
                    break;
                } else {
                    $row->writeAttribute('answer', $data['answer']);
                }
                $res = $row->save();
                if ( ! $res) {
                    Util::sysLogMsg('Action_dial_answer', implode(' ', $row->getMessages()));
                }
            }
        }
    }

    /**
     * Завершение / уничтожение канала.
     *
     * @param $data
     */
    public static function Action_hangup_chan($data): void
    {
        $channels       = [];
        $transfer_calls = [];
        $filter         = [
            'linkedid=:linkedid: AND endtime IS NULL AND (src_chan=:src_chan: OR dst_chan=:dst_chan:)',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'src_chan' => $data['agi_channel'],
                'dst_chan' => $data['agi_channel'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            if ($row->transfer == 1) {
                $transfer_calls[] = $row->toArray();
            }
            if ($row->dialstatus === 'ORIGINATE') {
                $row->writeAttribute('dialstatus', '');
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
                Util::sysLogMsg('Action_hangup_chan', implode(' ', $row->getMessages()));
            }

            if ($row->src_chan !== $data['agi_channel']) {
                $channels[] = [
                    'chan' => $row->src_chan,
                    'did'  => $row->did,
                    'num'  => $row->src_num,
                    'out'  => true,
                ];
            } else {
                $channels[] = [
                    'chan' => $row->dst_chan,
                    'did'  => $row->did,
                    'num'  => $row->dst_num,
                    'out'  => false,
                ];
            }
        }

        // Проверим, возможно это обычный трансфер.
        self::Action_CreateRowTransfer('hangup_chan', $data, $transfer_calls);

        $not_local = (stripos($data['agi_channel'], 'local/') === false);
        if ($not_local === true && $data['OLD_LINKEDID'] === $data['linkedid']) {
            $am           = Util::getAstManager('off');
            $active_chans = $am->GetChannels(false);
            // TODO / Намек на SIP трансфер.
            foreach ($channels as $data_chan) {
                if ( ! in_array($data_chan['chan'], $active_chans, true)) {
                    // Вызов уже завершен. Не интересно.
                    continue;
                }
                $BRIDGEPEER = $am->GetVar($data_chan['chan'], 'BRIDGEPEER', null, false);
                if ( ! in_array($BRIDGEPEER, $active_chans, true)) {
                    // Вызов уже завершен. Не интересно.
                    continue;
                }
                $linkedid = $am->GetVar($data_chan['chan'], 'CDR(linkedid)', null, false);
                $CALLERID = $am->GetVar($BRIDGEPEER, 'CALLERID(num)', null, false);
                if ( ! empty($linkedid) && $linkedid !== $data['linkedid']) {
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
                    $n_data['recordingfile'] = CdrDb::MixMonitor($n_data['dst_chan'], $n_data['UNIQUEID']);
                    $n_data['did']           = $data_chan['did'];
                    // $data['from_account'] = $from_account;
                    Util::logMsgDb('call_events', json_encode($n_data));
                    CdrDb::insertDataToDbM($n_data);
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
                    $am      = Util::getAstManager('off');
                    $AgiData = base64_encode(json_encode($n_data));
                    $am->UserEvent('CdrConnector', ['AgiData' => $AgiData]);
                }
            } // Обход текущих каналов.

        }
    }

    /**
     * Логирование истории звонков при трасфере.
     *
     * @param       $action
     * @param       $data
     * @param array $calls_data
     */
    public static function Action_CreateRowTransfer($action, $data, $calls_data = null): void
    {
        if (null === $calls_data) {
            $filter     = [
                'linkedid=:linkedid: AND endtime IS NULL AND transfer=1 AND (src_chan=:chan: OR dst_chan=:chan:)',
                'bind'  => [
                    'linkedid' => $data['linkedid'],
                    'chan'     => $data['agi_channel'],
                ],
                'order' => 'is_app',
            ];
            $m_data     = CallDetailRecordsTmp::find($filter);
            $calls_data = $m_data->toArray();
        }

        if (count($calls_data) > 1) {
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
            CdrDb::StopMixMonitor($insert_data['src_chan']);
            CdrDb::StopMixMonitor($insert_data['dst_chan']);
            $recordingfile = CdrDb::MixMonitor(
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
            $am                    = Util::getAstManager('off');
            $AgiData               = base64_encode(json_encode($insert_data));
            $am->UserEvent('CdrConnector', ['AgiData' => $AgiData]);

            CdrDb::insertDataToDbM($insert_data);
            CdrDb::LogEvent(json_encode($insert_data));
        } elseif (empty($calls_data[0]['answer']) && count(
                $calls_data
            ) === 1 && ! empty($calls_data[0]['recordingfile'])) {
            $row_data = $calls_data[0];
            $chan     = ($data['agi_channel'] === $row_data['src_chan']) ? $row_data['dst_chan'] : $row_data['src_chan'];
            $filter   = [
                'linkedid=:linkedid: AND endtime IS NULL AND transfer=1 AND (src_chan=:chan: OR dst_chan=:chan:)',
                'bind'  => [
                    'linkedid' => $data['linkedid'],
                    'chan'     => $chan,
                ],
                'order' => 'is_app',
            ];
            /** @var CallDetailRecordsTmp $not_ended_cdr */
            $not_ended_cdr = CallDetailRecordsTmp::findFirst($filter);
            if ($not_ended_cdr !== null) {
                CdrDb::StopMixMonitor($not_ended_cdr->src_chan);
                // Cdr::StopMixMonitor($not_ended_cdr->dst_chan);
                CdrDb::MixMonitor($not_ended_cdr->dst_chan, '', '', $not_ended_cdr->recordingfile);
            }
        }
    }

    /**
     * Завершение звонка. Завершение прееадресации.
     *
     * @param $data
     */
    public static function Action_dial_hangup($data): void
    {
        // self::Action_CreateRowTransfer('dial_hangup', $data);
    }

    /**
     * Обработка начала переадресации.
     *
     * @param $data
     */
    public static function Action_transfer_dial($data): void
    {
        self::Action_transfer_check($data);
        CdrDb::insertDataToDbM($data);
        self::Action_app_end($data);
    }

    /**
     * Проверка на транфер
     *
     * @param $data
     */
    public static function Action_transfer_check($data): void
    {
        $filter = [
            "linkedid=:linkedid: AND endtime IS NULL AND transfer=0 AND (src_chan=:src_chan: OR dst_chan=:src_chan:)",
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
            CdrDb::StopMixMonitor($row->dst_chan);
            CdrDb::StopMixMonitor($row->src_chan);
            // Установим признак переадресации.
            $row->writeAttribute('transfer', 1);
            $row->save();
        }
    }

    /**
     * Обработка события создания канала - пары, при начале переадресации звонка.
     *
     * @param $data
     */
    public static function Action_transfer_dial_create_chan($data): void
    {
        $filter     = [
            'UNIQUEID=:UNIQUEID: AND endtime IS NULL AND answer IS NULL',
            'bind' => [
                'UNIQUEID' => $data['transfer_UNIQUEID'],
            ],
        ];
        $row_create = false;
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            ///
            // Проверим, если более одного канала SIP/256 при входящем.
            if ( ! empty($row->dst_chan) && $data['dst_chan'] !== $row->dst_chan) {
                if ($row_create) {
                    continue;
                }
                // Необходимо дублировать строку звонка.
                $new_row = new CallDetailRecordsTmp();
                $f_list  = $row->toArray();
                foreach ($f_list as $attribute => $value) {
                    if ($attribute === 'id') {
                        continue;
                    }
                    $new_row->writeAttribute($attribute, $value);
                }
                $new_row->writeAttribute('dst_chan', $data['dst_chan']);
                $new_row->writeAttribute('UNIQUEID', $data['transfer_UNIQUEID'] . '_' . $data['dst_chan']);
                // $new_row->save();
                // Подмена $row;
                $row        = $new_row;
                $row_create = true;
            }

            $data['recordingfile'] = CdrDb::MixMonitor($data['dst_chan'], $row->UNIQUEID);
            // конец проверки
            ///

            $row->writeAttribute('dst_chan', $data['dst_chan']);
            $row->writeAttribute('recordingfile', $data['recordingfile']);
            if (isset($data['dst_call_id']) && ! empty($data['dst_call_id'])) {
                $row->writeAttribute('dst_call_id', $data['dst_call_id']);
            }
            $res = $row->save();
            if ( ! $res) {
                Util::sysLogMsg('Action_transfer_dial_create_chan', implode(' ', $row->getMessages()));
            }
        }
    }

    /**
     * Обработка события ответа на переадресацию. Соединение абонентов.
     *
     * @param $data
     */
    public static function Action_transfer_dial_answer($data): void
    {
        $filter = [
            '(UNIQUEID=:UNIQUEID: OR UNIQUEID=:UNIQUEID_CHAN:) AND answer IS NULL AND endtime IS NULL',
            'bind' => [
                'UNIQUEID'      => $data['transfer_UNIQUEID'],
                'UNIQUEID_CHAN' => $data['transfer_UNIQUEID'] . '_' . $data['agi_channel'],
            ],
        ];

        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->writeAttribute('answer', $data['answer']);
            $res = $row->save();
            if ( ! $res) {
                Util::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()));
            }
        }
    }

    /**
     * Завершение канала при прееадресации.
     *
     * @param $data
     */
    public static function Action_transfer_dial_hangup($data): void
    {
        $pos = stripos($data['agi_channel'], 'local/');
        if ($pos === false) {
            // Это НЕ локальный канал.
            // Если это завершение переадресации (консультативной). Создадим новую строку CDR.
            // self::Action_CreateRowTransfer('transfer_dial_hangup', $data);

            // Найдем записанные ранее строки.
            $filter = [
                'linkedid=:linkedid: AND endtime IS NULL AND (src_chan=:chan: OR dst_chan=:chan:)',
                'bind' => [
                    'linkedid' => $data['linkedid'],
                    'chan'     => $data['agi_channel'],
                ],
            ];
            /** @var CallDetailRecordsTmp $m_data */
            /** @var CallDetailRecordsTmp $row */
            $m_data = CallDetailRecordsTmp::find($filter);
            foreach ($m_data as $row) {
                // Завершим вызов в CDR.
                $row->writeAttribute('endtime', $data['end']);
                $row->writeAttribute('transfer', 0);
                if ( ! $row->save()) {
                    Util::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()));
                }
            }
            // Попробуем начать запись разговора.
            $filter = [
                'linkedid=:linkedid: AND endtime IS NULL AND transfer=1',
                'bind' => [
                    'linkedid' => $data['linkedid'],
                ],
            ];
            /** @var CallDetailRecordsTmp $res */
            $res = CallDetailRecordsTmp::findFirst($filter);
            if ($res !== null) {
                $info      = pathinfo($res->recordingfile);
                $data_time = ($res->answer == null) ? $res->start : $res->answer;
                $subdir    = date('Y/m/d/H/', strtotime($data_time));
                CdrDb::MixMonitor($res->src_chan, $info['filename'], $subdir);
            }
        } elseif ('' === $data['ANSWEREDTIME']) {
            $filter = [
                'linkedid=:linkedid: AND endtime IS NULL AND (src_chan=:src_chan: OR dst_chan=:dst_chan:)',
                'bind' => [
                    'linkedid' => $data['linkedid'],
                    'src_chan' => $data['TRANSFERERNAME'],
                    'dst_chan' => $data['dst_chan'],
                ],
            ];
            /** @var CallDetailRecordsTmp $m_data */
            /** @var CallDetailRecordsTmp $row */
            $m_data = CallDetailRecordsTmp::find($filter);
            foreach ($m_data as $row) {
                // Ответа не было. Переадресация отменена.
                $row->writeAttribute('endtime', $data['end']);
                $row->writeAttribute('transfer', 0);
                if ( ! $row->save()) {
                    Util::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()));
                }
            }

            // Попробуем возобновить запись разговора.
            $filter = [
                'linkedid=:linkedid: AND endtime IS NULL',
                'bind' => [
                    'linkedid' => $data['linkedid'],
                ],
            ];
            $m_data = CallDetailRecordsTmp::find($filter);
            foreach ($m_data as $row) {
                $info      = pathinfo($row->recordingfile);
                $data_time = ($row->answer == null) ? $row->start : $row->answer;
                $subdir    = date('Y/m/d/H/', strtotime($data_time));
                CdrDb::MixMonitor($row->src_chan, $info['filename'], $subdir);
                // Снимем со строк признак переадресации.
                $row->writeAttribute('transfer', 0);
                if ( ! $row->save()) {
                    Util::sysLogMsg('Action_transfer_dial_answer', implode(' ', $row->getMessages()));
                }
            }
        }
    }

    /**
     * Начало работы приложения.
     *
     * @param $data
     */
    public static function Action_dial_app($data): void
    {
        self::Action_app_end($data);
        CdrDb::insertDataToDbM($data);
    }

    /**
     * Вызов в нерабочее время.
     *
     * @param $data
     */
    public static function Action_dial_outworktimes($data): void
    {
        CdrDb::insertDataToDbM($data);
    }

    /**
     * Старт очереди.
     *
     * @param $data
     */
    public static function Action_queue_start($data): void
    {
        if ($data['transfer'] == '1') {
            // Если это трансфер выполним поиск связанных данных.
            self::Action_transfer_check($data);
        }
        if (isset($data['start'])) {
            // Это новая строка.
            CdrDb::insertDataToDbM($data);
        } else {
            // Требуется только обновление данных.
            CdrDb::updateDataInDbM($data);
        }
        self::Action_app_end($data);
    }

    /**
     * Событие входа в конференцкомнату.
     *
     * @param $data
     */
    public static function Action_meetme_dial($data): void
    {
        CdrDb::StopMixMonitor($data['src_chan']);

        if (strpos($data['src_chan'], 'internal-originate') !== false) {
            // Уточним канал и ID записи;
            $filter = [
                'linkedid=:linkedid: AND src_num=:src_num:',
                'bind' => [
                    'linkedid' => $data['linkedid'],
                    'src_num'  => $data['src_num'],
                ],
            ];
            /** @var CallDetailRecordsTmp $m_data */
            /** @var CallDetailRecordsTmp $row */
            $m_data = CallDetailRecordsTmp::findFirst($filter);
            if ($m_data !== null) {
                $data['src_chan'] = $m_data->src_chan;
                $m_data->UNIQUEID = $data['UNIQUEID'];

                $f_list = CdrDb::getDbFields();
                foreach ($data as $attribute => $value) {
                    if ( ! array_key_exists($attribute, $f_list)) {
                        continue;
                    }
                    $m_data->writeAttribute($attribute, $value);
                }
                // Переопределяем идентификатор, это Originate на конференцию.
                $m_data->save();
            }
        } else {
            CdrDb::insertDataToDbM($data);
            self::Action_app_end($data);
        }
    }

    /**
     * Снятие вызова с парковки.
     *
     * @param $data
     */
    public static function Action_unpark_call($data): void
    {
        $data['recordingfile'] = CdrDb::MixMonitor($data['dst_chan'], $data['UNIQUEID']);
        CdrDb::insertDataToDbM($data);
        if (is_array($data['data_parking'])) {
            CdrDb::insertDataToDbM($data['data_parking']);
        }
        $filter = [
            "linkedid=:linkedid: AND src_chan=:src_chan:",
            'bind' => [
                'linkedid' => $data['linkedid_old'],
                'src_chan' => $data['agi_channel'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->delete();
        }
    }

    /**
     * Возвращаем вызов с парковки по таймауту.
     *
     * @param $data
     */
    public static function Action_unpark_call_timeout($data): void
    {
        CdrDb::insertDataToDbM($data);
    }

    /**
     * Ответ агента очереди.
     *
     * @param $data
     */
    public static function Action_queue_answer($data): void
    {
        $filter = [
            "UNIQUEID=:UNIQUEID: AND answer IS NULL",
            'bind' => [
                'UNIQUEID' => $data['id'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->writeAttribute('answer', $data['answer']);
            $row->writeAttribute('endtime', $data['answer']);
            $res = $row->save();
            if ( ! $res) {
                Util::sysLogMsg('Action_queue_answer', implode(' ', $row->getMessages()));
            }
        }
    }

    /**
     * Завершение работы очереди.
     *
     * @param $data
     */
    public static function Action_queue_end($data): void
    {
        $filter = [
            "UNIQUEID=:UNIQUEID:",
            'bind' => [
                'UNIQUEID' => $data['id'],
            ],
        ];
        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        $m_data = CallDetailRecordsTmp::find($filter);
        foreach ($m_data as $row) {
            $row->writeAttribute('endtime', $data['end']);
            $row->writeAttribute('is_app', 1);
            if ($data['dialstatus'] != '') {
                $row->writeAttribute('dialstatus', $data['dialstatus']);
            }
            $res = $row->save();
            if ( ! $res) {
                Util::sysLogMsg('Action_queue_end', implode(' ', $row->getMessages()));
            }
        }
    }

    /**
     * Завершение / уничтожение канала.
     *
     * @param $data
     */
    public static function Action_hangup_chan_meetme($data): void
    {
        clearstatcache();
        $recordingfile = '';
        $dest_chan     = "MeetMe:{$data['conference']}";
        // Отбираем все строки по текущей конференции. Не завершенные вызовы.
        $filter = [
            'dst_chan=:dst_chan: OR linkedid=:linkedid:',
            'bind' => [
                'linkedid' => $data['linkedid'],
                'dst_chan' => $dest_chan,
            ],
        ];
        $m_data = CallDetailRecordsTmp::find($filter);
        /** @var CallDetailRecordsTmp $row */
        foreach ($m_data as $row) {
            if ($dest_chan === $row->dst_chan) {
                $is_local        = (stripos($data['src_chan'], 'local/') !== false);
                $is_stored_local = (stripos($row->src_chan, 'local/') !== false);
                if ($row->UNIQUEID === $data['UNIQUEID'] && $is_local && ! $is_stored_local) {
                    $data['src_chan'] = $row->src_chan;
                }
                if (file_exists($row->recordingfile) || file_exists(
                        Util::trimExtensionForFile($row->recordingfile) . '.wav'
                    )) {
                    // Переопределим путь к файлу записи разговора. Для конферецнии файл один.
                    $recordingfile = $row->recordingfile;
                }
            }
            if ($row->linkedid === $data['meetme_id']) {
                continue;
            }
            // Подменим ID на идентификатор конференции.
            $row->writeAttribute('linkedid', $data['meetme_id']);
            $res = $row->save();
            if ( ! $res) {
                Util::sysLogMsg('Action_hangup_chan_meetme', implode(' ', $row->getMessages()));
            }
        }

        /** @var CallDetailRecordsTmp $m_data */
        /** @var CallDetailRecordsTmp $row */
        /** @var CallDetailRecordsTmp $rec_data */
        foreach ($m_data as $row) {
            if ($row->src_chan !== $data['src_chan']) {
                continue;
            }
            // Заполняем данные для текущего оповещения.
            $row->writeAttribute('endtime', $data['end']);
            $row->writeAttribute('transfer', 0);
            $row->writeAttribute('linkedid', $data['meetme_id']);

            if ( ! empty($recordingfile)) {
                $row->writeAttribute('recordingfile', $recordingfile);
            }
            $res = $row->save();
            if ( ! $res) {
                Util::sysLogMsg('Action_hangup_chan_meetme', implode(' ', $row->getMessages()));
            }
        }
    }

    /**
     *
     * @param $argv
     */
    public function start($argv): void
    {
        $client = new BeanstalkClient(self::class);
        $client->subscribe(self::class, [$this, 'callEventsWorker']);
        $client->subscribe(WorkerCdr::SELECT_CDR_TUBE, [$this, 'selectCDRWorker']);
        $client->subscribe(WorkerCdr::UPDATE_CDR_TUBE, [$this, 'updateCDRWorker']);
        $client->subscribe('ping_' . self::class, [$this, 'pingCallBack']);
        $client->setErrorHandler([$this, 'errorHandler']);

        while (true) {
            $client->wait();
        }
    }

    /**
     * Обработчик событий изменения состояния звонка.
     *
     * @param array | BeanstalkClient $tube
     */
    public function callEventsWorker($tube): void
    {
        $data      = json_decode($tube->getBody(), true);
        $func_name = '\MikoPBX\Core\Workers\WorkerCallEvents::Action_' . $data['action'];
        if (function_exists($func_name)) {
            $func_name($data);
        }
        $tube->reply(json_encode(true));
    }

    /**
     * Получения CDR к обработке.
     *
     * @param array | BeanstalkClient $tube
     */
    public function updateCDRWorker($tube): void
    {
        $q    = $tube->getBody();
        $data = json_decode($q, true);
        $res  = CdrDb::updateDataInDbM($data);
        $tube->reply(json_encode($res));
    }

    /**
     * @param array | BeanstalkClient $tube
     */
    public function selectCDRWorker($tube): void
    {
        $q      = $tube->getBody();
        $filter = json_decode($q, true);
        $res    = null;
        try {
            if (isset($filter['miko_tmp_db'])) {
                $res = CallDetailRecordsTmp::find($filter);
            } else {
                $res = CallDetailRecords::find($filter);
            }
            $res_data = json_encode($res->toArray());
        } catch (Exception $e) {
            $res_data = '[]';
        }

        if ($res && isset($filter['add_pack_query'])) {
            $arr = [];
            foreach ($res->toArray() as $row) {
                $arr[] = $row[$filter['columns']];
            }
            $filter['add_pack_query']['bind'][$filter['columns']] = $arr;
            try {
                $res      = CallDetailRecords::find($filter['add_pack_query']);
                $res_data = json_encode($res->toArray());
            } catch (Exception $e) {
                $res_data = '[]';
            }
        }

        if (isset($filter['miko_result_in_file'])) {
            $di         = Di::getDefault();
            $dirsConfig = $di->getShared('config');
            $filename   = $dirsConfig->path('core.tempPath') . '/' . md5(microtime(true));
            file_put_contents("$filename", $res_data);
            Util::addRegularWWWRights($filename);
            $res_data = json_encode("$filename");
        }

        $tube->reply($res_data);
    }

    private function errorHandler($m): void
    {
        Util::sysLogMsg(self::class . '_ERROR', $m);
    }
}


// Start worker process
$workerClassname = WorkerCallEvents::class;
if (isset($argv) && count($argv) > 1 && $argv[1] === 'start') {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (\Exception $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}





