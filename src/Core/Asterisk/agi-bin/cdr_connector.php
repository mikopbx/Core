#!/usr/bin/php
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

use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\Asterisk\AGI;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\Asterisk\Configs\{ResParkingConf};
use MikoPBX\Core\System\{MikoPBXConfig, Util};

require_once 'Globals.php';

/**
 * Creates an event for dialing with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the dialing event.
 *
 * @return array The data for the dialing event.
 */
function Event_dial($agi, $action)
{
    $now  = Util::getNowDate();
    $data = [];

    // Determine the channel for queue calls.
    $QUEUE_SRC_CHAN = $agi->get_variable("QUEUE_SRC_CHAN", true);
    $orign_chan     = $agi->get_variable("orign_chan", true);
    $id             = $agi->get_variable("pt1c_UNIQUEID", true);
    $IS_ORGNT       = $agi->get_variable("IS_ORGNT", true);
    if ($id == '' || ! empty($QUEUE_SRC_CHAN)) {
        // If it's a call to a queue agent (!empty($QUEUE_SRC_CHAN)).
        // If it's a new call ($id == '').
        $id = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();
    }
    // AGI script channel.
    $channel  = $agi->request['agi_channel'];
    $is_local = ! (stripos($channel, 'local/') === false);
    if ($QUEUE_SRC_CHAN != '' && $is_local) {
        // It's a LOCAL channel, override it with the original channel.
        $channel = $QUEUE_SRC_CHAN;
    } elseif ($is_local && (stripos($orign_chan, 'local/') === false)) {
        $channel = $orign_chan;
    }

    // Get the ID of the source channel.
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
    $data['linkedid']     = $agi->get_variable("CHANNEL(linkedid)", true);
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
 * Creates an event for creating a channel with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the channel creation event.
 *
 * @return array The data for the channel creation event.
 */
function Event_dial_create_chan($agi, $action)
{
    $now                = Util::getNowDate();
    $data               = [];
    $id                 = $agi->get_variable("pt1c_UNIQUEID", true);
    $data['action']     = "$action";
    $data['dst_chan']   = $agi->request['agi_channel'];
    $data['UNIQUEID']   = $id;
    $data['linkedid']   = $agi->get_variable("CHANNEL(linkedid)", true);
    $data['event_time'] = $now;

    if (stripos($data['dst_chan'], 'local/') === false) {
        $data['to_account'] = $agi->get_variable('CUT(CUT(CHANNEL(name),,1),/,2)', true);
    }

    $IS_ORGNT = $agi->get_variable("IS_ORGNT", true);
    if ( ! empty($IS_ORGNT)) {
        // It's probably necessary to search for two IDs.
        // Applicable only for Originate, when we use two channels as the caller,
        // a mobile number and an internal number.
        $peer_mobile = $agi->get_variable("peer_mobile", true);
        if ( ! empty($peer_mobile) && stripos($id, $peer_mobile) === false) {
            $id             = substr($agi->request['agi_uniqueid'], 0, 16) . '_' . $peer_mobile . '_' . $IS_ORGNT;
            $data['org_id'] = $id;
        }
    }

    return $data;
}

/**
 * Creates an event for answering a call with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the call answer event.
 *
 * @return array The data for the call answer event.
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
    $data['linkedid']    = $agi->get_variable("CHANNEL(linkedid)", true);

    $data['ENDCALLONANSWER'] = $agi->get_variable("ENDCALLONANSWER", true);
    $data['BRIDGEPEER']      = $agi->get_variable("FROM_CHAN", true);

    $IS_ORGNT = $agi->get_variable("IS_ORGNT", true);
    if ( ! empty($IS_ORGNT)) {
        // Probably need to override the ID.
        // Applicable only for Originate, when we use two channels as the caller,
        // a mobile number and an internal number.
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
    $pickupexten   = $mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::PBX_FEATURE_PICKUP_EXTEN);
    if ('unknown' == $data['dnid'] && $PICKUPEER != '') {
        // Most likely an answer to a call from 1C.
        $data['dnid'] = $pickupexten;
    } elseif ($pickupexten == substr($data['dnid'], 0, 2) && $PICKUPEER != '') {
        // Call interception when dialing *8XXX.
        $data['dnid'] = $pickupexten;
    }
    if (trim($data['dnid']) == $pickupexten) {
        // Clear the channel variable. No longer needed.
        $agi->set_variable("PICKUPEER", "");
        $data['old_id'] = $id;
        $data['id']     = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();
    }
    $agi->set_variable("__pt1c_UNIQUEID", "$id");

    return $data;
}

/**
 * [DEPRECATED] Creates an event for hanging up a call with necessary data.
 *
 * WARNING: This function is deprecated and should be removed in the future.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the call hangup event.
 *
 * @return array The data for the call hangup event.
 */
function Event_dial_hangup_DEPRECATED($agi, $action)
{
    $now                 = Util::getNowDate();
    $data                = [];
    $data['action']      = "$action";
    $data['end']         = $now;
    $data['id']          = $agi->get_variable("pt1c_UNIQUEID", true);
    $data['agi_channel'] = $agi->request['agi_channel'];
    $data['linkedid']    = $agi->get_variable("CHANNEL(linkedid)", true);
    $data['did']         = $agi->get_variable("FROM_DID", true);

    $data['agi_threadid'] = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();

    return $data;
}

/**
 * Creates an event for a transfer dial with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the transfer dial event.
 *
 * @return array The data for the transfer dial event.
 */
function Event_transfer_dial($agi, $action)
{
    $now = Util::getNowDate();
    $id  = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();

    // Attempt to determine the channel.
    $TRANSFERERNAME = $agi->get_variable("TRANSFERERNAME", true);
    $QUEUE_SRC_CHAN = $agi->get_variable("QUEUE_SRC_CHAN", true);
    $is_local       = ! (stripos($TRANSFERERNAME, 'local/') === false);
    if ($QUEUE_SRC_CHAN != '' && $is_local) {
        // It's a LOCAL channel, override it with the original channel.
        $channel = $QUEUE_SRC_CHAN;
    } elseif ($QUEUE_SRC_CHAN != '' && $TRANSFERERNAME == '') {
        // It's a redirect to a queue.
        $channel = $QUEUE_SRC_CHAN;
    } elseif ($TRANSFERERNAME == '') {
        $channel = $agi->request['agi_channel'];
    } else {
        $channel = $TRANSFERERNAME;
    }

    $data                = [];
    $data['action']      = "$action";
    $data['agi_channel'] = $channel;// $agi->request['agi_channel'];
    $data['linkedid']    = $agi->get_variable("CHANNEL(linkedid)", true);
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
 * Creates an event for creating a channel during a transfer dial with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the transfer dial channel creation event.
 *
 * @return array The data for the transfer dial channel creation event.
 */
function Event_transfer_dial_create_chan($agi, $action)
{
    $id                        = $agi->get_variable("transfer_UNIQUEID", true);
    $data                      = [];
    $data['dst_chan']          = $agi->request['agi_channel'];
    $data['transfer_UNIQUEID'] = "$id";
    $data['action']            = "$action";
    $data['linkedid']          = $agi->get_variable("CHANNEL(linkedid)", true);

    return $data;
}

/**
 * Creates an event for answering a call during a transfer dial with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the transfer dial answer event.
 *
 * @return array The data for the transfer dial answer event.
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
    $data['linkedid']          = $agi->get_variable("CHANNEL(linkedid)", true);

    return $data;
}

/**
 * Creates an event for hanging up a call during a transfer dial with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the transfer dial hangup event.
 *
 * @return array The data for the transfer dial hangup event.
 */
function Event_transfer_dial_hangup($agi, $action)
{
    $now                  = Util::getNowDate();
    $data                 = [];
    $data['end']          = $now;
    $data['linkedid']     = $agi->get_variable("CHANNEL(linkedid)", true);
    $data['did']          = $agi->get_variable("FROM_DID", true);
    $data['action']       = "$action";
    $data['agi_channel']  = $agi->request['agi_channel'];
    $data['agi_threadid'] = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();

    $pos = stripos($data['agi_channel'], 'local/');
    if ($pos === false) {
        // If it's the end of a transfer (consultative). Create a new CDR record.
    } else {
        // If it's a local channel:
        $data['TRANSFERERNAME'] = $agi->get_variable("TRANSFERERNAME", true);
        $data['ANSWEREDTIME']   = $agi->get_variable("ANSWEREDTIME", true);
        $data['dst_chan']       = $agi->get_variable("CDR(dstchannel)", true);
    }

    return $data;
}

/**
 * Creates an event for hanging up a channel with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the channel hangup event.
 *
 * @return array The data for the channel hangup event.
 */
function Event_hangup_chan($agi, $action)
{
    $now                  = Util::getNowDate();
    $data                 = [];
    $data['action']       = "$action";
    $data['did']          = $agi->get_variable("FROM_DID", true);
    $data['agi_threadid'] = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();

    $data['linkedid']   = $agi->get_variable("CHANNEL(linkedid)", true);
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
 * Creates an event for unparking a call with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the unpark call event.
 *
 * @return array The data for the unpark call event.
 */
function Event_unpark_call($agi, $action)
{
    $now = Util::getNowDate();
    // Processing parking data.
    $exten    = $agi->get_variable("EXTEN", true);
    $park_row = ResParkingConf::getParkSlotData($exten);

    $agi->set_variable("__pt1c_IS_PARK", "1");
    $agi->set_variable("pt1c_PARK_CHAN", $park_row['ParkeeChannel']);

    // Collecting data for generating CDR.
    $id      = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();
    $channel = $agi->request['agi_channel'];
    $agi->set_variable("__pt1c_UNIQUEID", "$id");
    $data                 = [];
    $data['action']       = "$action";
    $data['UNIQUEID']     = $id;
    $data['linkedid_old'] = $agi->get_variable("CHANNEL(linkedid)", true);
    $data['agi_channel']  = $channel;
    $data['linkedid']     = $park_row['ParkeeLinkedid'];
    $data['start']        = $now;
    $data['transfer']     = '0';
    $data['did']          = $agi->get_variable("FROM_DID", true);
    $data['answer']       = $data['start'];

    if (null === $park_row) {
        $data['src_chan'] = $channel;
        $data['src_num']  = $agi->request['agi_callerid'];
        $data['dst_num']  = $agi->request['agi_extension'];
        $data['dst_chan'] = 'Park:' . $agi->request['agi_extension'];
    } elseif (true === $park_row['pt1c_is_dst']) {
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

    if (trim($park_row['ParkingDuration']) !== '') {
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
 * Creates an event for a timeout during call unparking with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the unpark call timeout event.
 *
 * @return array The data for the unpark call timeout event.
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
        'linkedid' => $agi->get_variable("CHANNEL(linkedid)", true),
        'PARKER'   => $agi->get_variable("PARKER", true),
    ];


    $id2 = $agi->request['agi_uniqueid'] . '_' . Util::generateRandomString();
    $agi->set_variable("__pt1c_UNIQUEID", "$id2");

    return $data;
}

/**
 * Creates an event for the start of a queue with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the queue start event.
 *
 * @return array The data for the queue start event.
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
        'linkedid' => $agi->get_variable("CHANNEL(linkedid)", true),
    ];
    if ( ! empty($time_start)) {
        $data['src_chan'] = $agi->get_variable("QUEUE_SRC_CHAN", true);
        $data['src_num']  = $agi->request['agi_callerid'];
        $data['start']    = $time_start;
        $data['linkedid'] = $agi->get_variable("CHANNEL(linkedid)", true);
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
 * Creates an event for answering a queue call with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the queue answer event.
 *
 * @return array The data for the queue answer event.
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
    $data['linkedid']    = $agi->get_variable("CHANNEL(linkedid)", true);

    return $data;
}

/**
 * Creates an event for ending a queue call with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the queue end event.
 *
 * @return array The data for the queue end event.
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
    $data['linkedid']    = $agi->get_variable("CHANNEL(linkedid)", true);

    return $data;
}

/**
 * Creates an event for dialing into a MeetMe conference with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the MeetMe dial event.
 *
 * @return array The data for the MeetMe dial event.
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
        'linkedid'      => $agi->get_variable('CHANNEL(linkedid)', true),
    ];
    $agi->set_variable('MEETME_RECORDINGFILE', $recordingfile);
    $agi->set_variable('__pt1c_q_UNIQUEID', $id);

    return $data;
}

/**
 * Creates an event for hanging up a MeetMe channel with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the MeetMe hangup event.
 *
 * @return array The data for the MeetMe hangup event.
 */
function Event_hangup_chan_meetme($agi, $action): array
{
    $now                 = Util::getNowDate();
    $data                = [];
    $data['action']      = $action;
    $data['linkedid']    = $agi->get_variable('CHANNEL(linkedid)', true);
    $data['src_chan']    = $agi->request['agi_channel'];
    $data['agi_channel'] = $agi->request['agi_channel'];
    $data['end']         = $now;

    $confId = $agi->get_variable('MEETMEUNIQUEID', true);
    if(empty($confId)){
        $confId = $agi->get_variable('CONFBRIDGEUNIQUEID', true);
    }
    $data['meetme_id']   = $confId;

    $data['conference']  = $agi->get_variable('mikoidconf', true);
    $data['UNIQUEID']    = $agi->get_variable('pt1c_q_UNIQUEID', true);

    $recordingfile         = $agi->get_variable('MEETME_RECORDINGFILE', true);
    $data['recordingfile'] = "{$recordingfile}.mp3";

    return $data;
}

/**
 * Creates an event for dialing an application channel with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the dial app event.
 *
 * @return array The data for the dial app event.
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
 * Creates an event for dialing the outworktimes application with necessary data.
 *
 * @param AGI $agi The AGI object.
 * @param string $action The action associated with the dial outworktimes event.
 *
 * @return array The data for the dial outworktimes event.
 */
function Event_dial_outworktimes($agi, $action)
{
    $data             = Event_dial($agi, $action);
    $data['dst_chan'] = 'App:outworktimes';
    $data['dst_num']  = 'outworktimes';
    $data['is_app']   = 1;

    return $data;
}

/**
 * Main entry point for executing the event based on the command-line arguments.
 */
if (count($argv) == 1) {
    exit;
}

$action    = trim($argv[1]);
$func_name = "Event_$action";

if (function_exists($func_name)) {
    $agi = new AGI();
    // Retrieve channel information.
    $result = $func_name($agi, $action);
    // Notify without delays.
    $data = base64_encode(json_encode($result));
    $agi->exec("CELGenUserEvent", $data);
    $agi->exec("UserEvent", "CdrConnector,AgiData:$data");
}
