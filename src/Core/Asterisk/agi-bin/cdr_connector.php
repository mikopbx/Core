#!/usr/bin/php
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2018
 */

use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\Asterisk\Configs\{ResParkingConf};
use MikoPBX\Core\System\{MikoPBXConfig, Util};

require_once 'phpagi.php';
require_once 'Globals.php';

/**
 * Начало телефонного звонка.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_dial($agi, $action)
{
    $now  = Util::getNowDate();
    $data = [];

    // Уточним канал, на случай очереди.
    $QUEUE_SRC_CHAN = $agi->get_variable("QUEUE_SRC_CHAN", true);
    $orign_chan     = $agi->get_variable("orign_chan", true);
    $id             = $agi->get_variable("pt1c_UNIQUEID", true);
    $IS_ORGNT       = $agi->get_variable("IS_ORGNT", true);
    if ($id == '' || ! empty($QUEUE_SRC_CHAN)) {
        // Если это вызов на агента очереди !empty($QUEUE_SRC_CHAN).
        // Если это новый вызов $id == ''.
        $id = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();
    }
    // Канал, AGI скрипта.
    $channel  = $agi->request['agi_channel'];
    $is_local = ! (stripos($channel, 'local/') === false);
    if ($QUEUE_SRC_CHAN != '' && $is_local) {
        // Это LOCAL, Переопределим на исходный.
        $channel = $QUEUE_SRC_CHAN;
    } elseif ($is_local && (stripos($orign_chan, 'local/') === false)) {
        $channel = $orign_chan;
    }

    // Получим ID исходного канала.
    $from_account = $agi->get_variable("FROM_PEER", true);
    if ($from_account == '' && stripos($agi->request['agi_channel'], 'local/') === false) {
        $from_account = $agi->get_variable('CUT(CUT(CHANNEL(name),,1),/,2)', true);
    }

    $data['action'] = "$action";
    if ( ! empty($IS_ORGNT)) {
        $dst_num            = $agi->request['agi_callerid'];
        $src_num            = $agi->request['agi_extension'];
        $data['dialstatus'] = 'ORIGINATE';
        $from_account       = '';

        $p_start = strpos($agi->request['agi_channel'], '/') + 1;
        $p_end   = strpos($agi->request['agi_channel'], '@') - $p_start;
        $num     = substr($agi->request['agi_channel'], $p_start, $p_end);

        $p_start  = strpos($agi->request['agi_channel'], ';');
        $dst_chan = substr($agi->request['agi_channel'], 0, $p_start) . ';1';

        $id               = substr($agi->request['agi_uniqueid'], 0, 16) . '_' . $num . '_' . $IS_ORGNT;
        $data['dst_chan'] = $dst_chan;
    } else {
        $src_num = $agi->request['agi_callerid'];
        $dst_num = $agi->request['agi_extension'];
    }

    $data['src_chan']     = $channel;
    $data['src_num']      = $src_num;
    $data['dst_num']      = $dst_num;
    $data['start']        = $now;
    $data['linkedid']     = $agi->get_variable("CDR(linkedid)", true);
    $data['UNIQUEID']     = $id;
    $data['transfer']     = '0';
    $data['agi_channel']  = $agi->request['agi_channel'];
    $data['did']          = $agi->get_variable("FROM_DID", true);
    $data['from_account'] = $from_account;
    $data['IS_ORGNT']     = ! empty($IS_ORGNT);

    $agi->set_variable("__pt1c_UNIQUEID", "$id");

    return $data;
}

/**
 * Обработка события создания канала - пары, при начале телефонного звонка.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_dial_create_chan($agi, $action)
{
    $now                = Util::getNowDate();
    $data               = [];
    $id                 = $agi->get_variable("pt1c_UNIQUEID", true);
    $data['action']     = "$action";
    $data['dst_chan']   = $agi->request['agi_channel'];
    $data['UNIQUEID']   = $id;
    $data['linkedid']   = $agi->get_variable("CDR(linkedid)", true);
    $data['event_time'] = $now;

    if (stripos($data['dst_chan'], 'local/') === false) {
        $data['to_account'] = $agi->get_variable('CUT(CUT(CHANNEL(name),,1),/,2)', true);
    }

    $IS_ORGNT = $agi->get_variable("IS_ORGNT", true);
    if ( ! empty($IS_ORGNT)) {
        // Вероятно необходимо переопределить искать по двум ID.
        // Применимо только для Originate, когда в качестве звонящего используем два канала
        // мобильный и внутренний номер.
        $peer_mobile = $agi->get_variable("peer_mobile", true);
        if ( ! empty($peer_mobile) && stripos($id, $peer_mobile) === false) {
            $id             = substr($agi->request['agi_uniqueid'], 0, 16) . '_' . $peer_mobile . '_' . $IS_ORGNT;
            $data['org_id'] = $id;
        }
    }

    return $data;
}

/**
 * Обработка события ответа на звонок. Соединение абонентов.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_dial_answer($agi, $action)
{
    $now = Util::getNowDate();

    $id                  = $agi->get_variable("pt1c_UNIQUEID", true);
    $data                = [];
    $data['action']      = "$action";
    $data['answer']      = $now;
    $data['id']          = $id;
    $data['dst_num']     = $agi->request['agi_callerid'];
    $data['agi_channel'] = $agi->request['agi_channel'];
    $data['linkedid']    = $agi->get_variable("CDR(linkedid)", true);

    $data['ENDCALLONANSWER'] = $agi->get_variable("ENDCALLONANSWER", true);
    $data['BRIDGEPEER']      = $agi->get_variable("FROM_CHAN", true);

    $IS_ORGNT = $agi->get_variable("IS_ORGNT", true);
    if ( ! empty($IS_ORGNT)) {
        // Вероятно необходимо переопределить ID.
        // Применимо только для Originate, когда в качестве звонящего используем два канала
        // мобильный и внутренний номер.
        $peer_mobile = $agi->get_variable("peer_mobile", true);
        if ( ! empty($peer_mobile) && stripos($id, $peer_mobile) === false) {
            $id             = substr($agi->request['agi_uniqueid'], 0, 16) . '_' . $peer_mobile . '_' . $IS_ORGNT;
            $data['org_id'] = $id;
        }
    }

    if ( ! empty($data['ENDCALLONANSWER'])) {
        $agi->set_variable("__ENDCALLONANSWER", "");
    }

    $PICKUPEER     = trim('' . $agi->get_variable("PICKUPEER", true));
    $data['dnid']  = $agi->request['agi_dnid'];
    $mikoPBXConfig = new MikoPBXConfig();
    $pickupexten   = $mikoPBXConfig->getPickupExten();
    if ('unknown' == $data['dnid'] && $PICKUPEER != '') {
        // Скорее всего ответ на вызов из 1С.
        $data['dnid'] = $pickupexten;
    } elseif ($pickupexten == substr($data['dnid'], 0, 2) && $PICKUPEER != '') {
        // Это перехват при наборе номера *8XXX.
        $data['dnid'] = $pickupexten;
    }
    if (trim($data['dnid']) == $pickupexten) {
        // Очищаем переменную канала. Больше не требуется.
        $agi->set_variable("PICKUPEER", "");
        $data['old_id'] = $id;
        $data['id']     = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();
    }
    $agi->set_variable("__pt1c_UNIQUEID", "$id");

    return $data;
}

/**
 * Завершение звонка. Завершение прееадресации.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_dial_hangup_DEPRECATED($agi, $action)
{
    // TODO Удалить эту функцию в будущем.
    $now                 = Util::getNowDate();
    $data                = [];
    $data['action']      = "$action";
    $data['end']         = $now;
    $data['id']          = $agi->get_variable("pt1c_UNIQUEID", true);
    $data['agi_channel'] = $agi->request['agi_channel'];
    $data['linkedid']    = $agi->get_variable("CDR(linkedid)", true);
    $data['did']         = $agi->get_variable("FROM_DID", true);

    $data['agi_threadid'] = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();

    return $data;
}

/**
 * Начало переадресации.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_transfer_dial($agi, $action)
{
    $now = Util::getNowDate();
    $id  = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();

    // Пытаемся определить канал.
    $TRANSFERERNAME = $agi->get_variable("TRANSFERERNAME", true);
    $QUEUE_SRC_CHAN = $agi->get_variable("QUEUE_SRC_CHAN", true);
    $is_local       = ! (stripos($TRANSFERERNAME, 'local/') === false);
    if ($QUEUE_SRC_CHAN != '' && $is_local) {
        // Это LOCAL, Переопределим на исходный.
        $channel = $QUEUE_SRC_CHAN;
    } elseif ($QUEUE_SRC_CHAN != '' && $TRANSFERERNAME == '') {
        // Это редирект на очередь.
        $channel = $QUEUE_SRC_CHAN;
    } elseif ($TRANSFERERNAME == '') {
        $channel = $agi->request['agi_channel'];
    } else {
        $channel = $TRANSFERERNAME;
    }

    $data                = [];
    $data['action']      = "$action";
    $data['agi_channel'] = $channel;// $agi->request['agi_channel'];
    $data['linkedid']    = $agi->get_variable("CDR(linkedid)", true);
    $data['src_chan']    = $channel;
    $data['did']         = $agi->get_variable("FROM_DID", true);
    $data['start']       = $now;
    $data['UNIQUEID']    = $id;
    $data['transfer']    = ($TRANSFERERNAME == '') ? '0' : '1';
    $data['src_num']     = $agi->request['agi_callerid'];
    $data['dst_num']     = $agi->request['agi_extension'];

    $agi->set_variable("__transfer_UNIQUEID", $id);

    return $data;
}

/**
 * Обработка события создания канала - пары, при начале переадресации звонка.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_transfer_dial_create_chan($agi, $action)
{
    $id                        = $agi->get_variable("transfer_UNIQUEID", true);
    $data                      = [];
    $data['dst_chan']          = $agi->request['agi_channel'];
    $data['transfer_UNIQUEID'] = "$id";
    $data['action']            = "$action";
    $data['linkedid']          = $agi->get_variable("CDR(linkedid)", true);

    return $data;
}

/**
 * Обработка события ответа на переадресацию. Соединение абонентов.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_transfer_dial_answer($agi, $action)
{
    $data                      = [];
    $now                       = Util::getNowDate();
    $id                        = $agi->get_variable("transfer_UNIQUEID", true);
    $data['answer']            = $now;
    $data['transfer_UNIQUEID'] = "$id";
    $data['action']            = "$action";
    $data['agi_channel']       = $agi->request['agi_channel'];
    $data['linkedid']          = $agi->get_variable("CDR(linkedid)", true);

    return $data;
}

/**
 * Завершение канала при прееадресации.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_transfer_dial_hangup($agi, $action)
{
    $now                  = Util::getNowDate();
    $data                 = [];
    $data['end']          = $now;
    $data['linkedid']     = $agi->get_variable("CDR(linkedid)", true);
    $data['did']          = $agi->get_variable("FROM_DID", true);
    $data['action']       = "$action";
    $data['agi_channel']  = $agi->request['agi_channel'];
    $data['agi_threadid'] = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();

    $pos = stripos($data['agi_channel'], 'local/');
    if ($pos === false) {
        // Если это завершение переадресации (консультативной). Создадим новую строку CDR.
    } else {
        // Если пришел локальный канал:
        $data['TRANSFERERNAME'] = $agi->get_variable("TRANSFERERNAME", true);
        $data['ANSWEREDTIME']   = $agi->get_variable("ANSWEREDTIME", true);
        $data['dst_chan']       = $agi->get_variable("CDR(dstchannel)", true);
    }

    return $data;
}

/**
 * Завершение / уничтожение канала.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_hangup_chan($agi, $action)
{
    $now                  = Util::getNowDate();
    $data                 = [];
    $data['action']       = "$action";
    $data['did']          = $agi->get_variable("FROM_DID", true);
    $data['agi_threadid'] = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();

    $data['linkedid']   = $agi->get_variable("CDR(linkedid)", true);
    $data['dialstatus'] = $agi->get_variable("DIALSTATUS", true);
    if ('ANSWER' == $data['dialstatus']) {
        $data['dialstatus'] = "ANSWERED";
    }
    $data['agi_channel'] = $agi->request['agi_channel'];
    $data['end']         = $now;

    $data['OLD_LINKEDID'] = $agi->get_variable("OLD_LINKEDID", true);
    $data['UNIQUEID']     = $agi->get_variable("pt1c_UNIQUEID", true);

    return $data;
}

/**
 * Забираем вызов с парковки.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_unpark_call($agi, $action)
{
    $now = Util::getNowDate();
    // Обработка данных парковки.
    $exten    = $agi->get_variable("EXTEN", true);
    $park_row = ResParkingConf::getParkslotData($exten);

    $agi->set_variable("__pt1c_IS_PARK", "1");
    $agi->set_variable("pt1c_PARK_CHAN", $park_row['ParkeeChannel']);

    // Сбор данных для генерации CDR.
    $id      = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();
    $channel = $agi->request['agi_channel'];
    $agi->set_variable("__pt1c_UNIQUEID", "$id");
    $data                 = [];
    $data['action']       = "$action";
    $data['UNIQUEID']     = $id;
    $data['linkedid_old'] = $agi->get_variable("CDR(linkedid)", true);
    $data['agi_channel']  = $channel;
    $data['linkedid']     = $park_row['ParkeeLinkedid'];
    $data['start']        = $now;
    $data['transfer']     = '0';
    $data['did']          = $agi->get_variable("FROM_DID", true);
    $data['answer']       = $data['start'];

    if (null == $park_row) {
        $data['src_chan'] = $channel;
        $data['src_num']  = $agi->request['agi_callerid'];
        $data['dst_num']  = $agi->request['agi_extension'];
        $data['dst_chan'] = 'Park:' . $agi->request['agi_extension'];
    } elseif (true == $park_row['pt1c_is_dst']) {
        $data['src_chan'] = $channel;
        $data['dst_chan'] = $park_row['ParkeeChannel'];
        $data['src_num']  = $agi->request['agi_callerid'];
        $data['dst_num']  = $park_row['ParkeeCallerIDNum'];
    } else {
        $data['src_chan'] = $park_row['ParkeeChannel'];
        $data['dst_chan'] = $channel;
        $data['src_num']  = $park_row['ParkeeCallerIDNum'];
        $data['dst_num']  = $agi->request['agi_callerid'];
    }

    if (trim($park_row['ParkingDuration']) != '') {
        $time_start           = date("Y-m-d H:i:s", time() - 1 * ($park_row['ParkingDuration']));
        $data_parking         = [
            'UNIQUEID' => $id . '_' . Util::generateRandomString(3),
            'src_chan' => $park_row['ParkeeChannel'],
            'src_num'  => $park_row['ParkeeCallerIDNum'],
            'dst_num'  => $park_row['ParkingSpace'],
            'dst_chan' => 'Park:' . $park_row['ParkingSpace'],
            'start'    => $time_start,
            'answer'   => $time_start,
            'endtime'  => $now,
            'did'      => $data['did'],
            'transfer' => '0',
            'linkedid' => $data['linkedid'],
        ];
        $data['data_parking'] = $data_parking;
    }

    return $data;
}

/**
 * Возвращаем вызов с парковки по таймауту.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_unpark_call_timeout($agi, $action)
{
    $now = Util::getNowDate();
    $id  = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();
    // PARKER=SIP/206
    $PARKING_DURATION = $agi->get_variable("PARKING_DURATION", true);
    $PARKING_DURATION = ($PARKING_DURATION == '') ? 45 : $PARKING_DURATION;

    $time_start    = date("Y-m-d H:i:s", time() - 1 * ($PARKING_DURATION));
    $PARKING_SPACE = $agi->get_variable("PARKING_SPACE", true);
    $data          = [
        'action'   => "$action",
        'src_chan' => $agi->request['agi_channel'], // $agi->get_variable("PARKER", true), // ???
        'src_num'  => $agi->request['agi_callerid'],
        'dst_num'  => $PARKING_SPACE,
        'dst_chan' => 'Park:' . $PARKING_SPACE,
        'start'    => $time_start,
        'answer'   => $time_start,
        'endtime'  => $now,
        'did'      => $agi->get_variable("FROM_DID", true),
        'UNIQUEID' => $id,
        'transfer' => '0',
        'linkedid' => $agi->get_variable("CDR(linkedid)", true),
        'PARKER'   => $agi->get_variable("PARKER", true),
    ];


    $id2 = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();
    $agi->set_variable("__pt1c_UNIQUEID", "$id2");

    return $data;
}

/**
 * Старт очереди.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_queue_start($agi, $action)
{
    $now        = Util::getNowDate();
    $time_start = null;
    $id         = $agi->get_variable("pt1c_UNIQUEID", true);
    $ISTRANSFER = $agi->get_variable("ISTRANSFER", true);

    if (empty($id) || ! empty($ISTRANSFER)) {
        $id         = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();
        $time_start = $now;
    }

    $data = [
        'action'   => "$action",
        // 'src_chan' => $agi->request['agi_channel'],
        // 'src_num'  => $agi->request['agi_callerid'],
        'dst_num'  => $agi->request['agi_extension'],
        'dst_chan' => 'Queue:' . $agi->request['agi_extension'],
        // 'answer'   => $time_start,
        // 'end'  	   => $now,
        'did'      => $agi->get_variable("FROM_DID", true),
        'is_app'   => '1',
        'UNIQUEID' => $id,
        'linkedid' => $agi->get_variable("CDR(linkedid)", true),
    ];
    if ( ! empty($time_start)) {
        $data['src_chan'] = $agi->get_variable("QUEUE_SRC_CHAN", true);
        $data['src_num']  = $agi->request['agi_callerid'];
        $data['start']    = $time_start;
        $data['linkedid'] = $agi->get_variable("CDR(linkedid)", true);
        $data['transfer'] = '0';
        $agi->set_variable("__pt1c_q_UNIQUEID", "$id");
    }
    if ( ! empty($ISTRANSFER)) {
        $data['transfer'] = '1';
    } else {
        $data['transfer'] = '0';
    }

    return $data;
}

/**
 * Ответ агента очереди.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_queue_answer($agi, $action)
{
    $now                 = Util::getNowDate();
    $id                  = $agi->get_variable("pt1c_q_UNIQUEID", true);
    $data                = [];
    $data['action']      = "$action";
    $data['answer']      = $now;
    $data['id']          = $id;
    $data['agi_channel'] = $agi->request['agi_channel'];
    $data['linkedid']    = $agi->get_variable("CDR(linkedid)", true);

    return $data;
}

/**
 * Завершение работы очереди.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_queue_end($agi, $action)
{
    $now                 = Util::getNowDate();
    $id                  = $agi->get_variable("pt1c_q_UNIQUEID", true);
    $data                = [];
    $data['action']      = "$action";
    $data['end']         = $now;
    $data['id']          = $id;
    $data['dialstatus']  = $agi->get_variable("QUEUESTATUS", true);
    $data['agi_channel'] = $agi->request['agi_channel'];
    $data['linkedid']    = $agi->get_variable("CDR(linkedid)", true);

    return $data;
}

/**
 * Звонок на номер конференции.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_meetme_dial($agi, $action)
{
    $now        = Util::getNowDate();
    $id         = '';
    $time_start = $now;
    $exten      = $agi->request['agi_extension'];

    $is_conf   = ($agi->get_variable('CALLERID(num)', true) === 'Conference_Room');
    $not_local = (stripos($agi->request['agi_channel'], 'local/') === false);
    if ($not_local && ! $is_conf) {
        $am         = Util::getAstManager();
        $res        = $am->meetMeCollectInfo($exten, ['conf_1c']);
        $callid     = $agi->request['agi_callerid'];
        $users_nums = [[$callid]];
        foreach ($res as $row) {
            $users_nums[] = explode('_', $row['conf_1c']);
        }
        $users = implode('_', array_unique(array_merge(... $users_nums)));
        $agi->set_variable('conf_1c', $users);
        $agi->set_variable('CALLERID(num)', 'Conference_Room');
        $agi->set_variable('CALLERID(name)', $callid);
        $agi->set_variable('mikoconfcid', $exten);
        $agi->set_variable('mikoidconf', $exten);

        $mikoidconf    = $exten;
        $BLINDTRANSFER = $agi->get_variable("BLINDTRANSFER", true);
        if (empty($BLINDTRANSFER)) {
            $id = $agi->get_variable('pt1c_UNIQUEID', true);
        }
        $src_num = $callid;
        $dst_num = $exten;
    } else {
        $mikoidconf = $agi->get_variable('mikoidconf', true);
        if (empty($mikoidconf)) {
            $mikoidconf = $exten;
        }
        $src_num = $agi->get_variable('mikoconfcid', true);
        // Отсечем все до "/".
        $tmp_arr = explode('/', $mikoidconf);
        if (count($tmp_arr) > 1) {
            unset($tmp_arr[0]);
            $mikoidconf = implode('/', $tmp_arr);
        }
        $dst_num = substr($mikoidconf, 4);
    }

    if (empty($id)) {
        $id = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();
    }

    $recordingfile = CdrDb::MeetMeSetRecFilename($id);
    $data          = [
        'action'        => $action,
        'src_chan'      => $agi->request['agi_channel'],
        'src_num'       => $src_num,
        'dst_num'       => $dst_num,
        'dst_chan'      => 'MeetMe:' . $mikoidconf,
        'start'         => $time_start,
        'answer'        => $time_start,
        'recordingfile' => "{$recordingfile}.mp3",
        'did'           => $agi->get_variable('FROM_DID', true),
        'transfer'      => '0',
        'UNIQUEID'      => $id,
        'linkedid'      => $agi->get_variable('CDR(linkedid)', true),
    ];
    $agi->set_variable('MEETME_RECORDINGFILE', $recordingfile);
    $agi->set_variable('__pt1c_q_UNIQUEID', $id);

    return $data;
}

/**
 * Выход канала из конференции.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_hangup_chan_meetme($agi, $action): array
{
    $now                 = Util::getNowDate();
    $data                = [];
    $data['action']      = $action;
    $data['linkedid']    = $agi->get_variable('CDR(linkedid)', true);
    $data['src_chan']    = $agi->request['agi_channel'];
    $data['agi_channel'] = $agi->request['agi_channel'];
    $data['end']         = $now;
    $data['meetme_id']   = $agi->get_variable('MEETMEUNIQUEID', true);
    $data['conference']  = $agi->get_variable('mikoidconf', true);
    $data['UNIQUEID']    = $agi->get_variable('pt1c_q_UNIQUEID', true);

    $recordingfile         = $agi->get_variable('MEETME_RECORDINGFILE', true);
    $data['recordingfile'] = "{$recordingfile}.mp3";

    $lamePath = Util::which('lame');
    $nicePath = Util::which('nice');
    $chmodPath = Util::which('chmod');
    $command               = "{$nicePath} -n 19 {$lamePath} -b 32 --silent \"{$recordingfile}.wav\" \"{$recordingfile}.mp3\" && {$chmodPath} o+r \"{$recordingfile}.mp3\"";
    Util::mwExecBg($command);

    return $data;
}

/**
 * Вызов на приложение.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_dial_app($agi, $action)
{
    $id        = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();
    $extension = $agi->get_variable("APPEXTEN", true);
    if (empty($extension)) {
        $extension = $agi->request['agi_extension'];
    }

    $data             = Event_dial($agi, $action);
    $data['dst_chan'] = 'App:' . $extension;
    $data['dst_num']  = $extension;
    $data['is_app']   = 1;
    $data['UNIQUEID'] = $id;
    $agi->set_variable("__pt1c_UNIQUEID", "");

    return $data;
}

/**
 * Вызов в нерабочее время.
 *
 * @param AGI    $agi
 * @param string $action
 *
 * @return array
 */
function Event_dial_outworktimes($agi, $action)
{
    $data             = Event_dial($agi, $action);
    $data['dst_chan'] = 'App:outworktimes';
    $data['dst_num']  = 'outworktimes';
    $data['is_app']   = 1;

    return $data;
}

// Должны быть переданы параметры.
if (count($argv) == 1) {
    exit;
}

$action    = trim($argv[1]);
$func_name = "Event_$action";

if (function_exists($func_name)) {
    $agi = new AGI();
    // Сбор сведений по каналу.
    $result = $func_name($agi, $action);
    // Оповещение без задержек.
    $data = base64_encode(json_encode($result));
    $agi->exec("UserEvent", "CdrConnector,AgiData:" . base64_encode(json_encode($result)));
}
