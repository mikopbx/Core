#!/usr/bin/php
<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Core\Asterisk\AGI;
use MikoPBX\Core\Asterisk\AsteriskManager;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\System\Util;

require_once 'Globals.php';

/**
 * Creates an event for dialing into a MeetMe/ConfBridge conference.
 *
 * Collects conference participants via AMI, sets caller IDs,
 * generates a recording filename, and produces a CDR event.
 *
 * @param AGI $agi The AGI object.
 * @return array The data for the MeetMe dial event.
 * @throws \Exception
 */
function Event_meetme_dial(AGI $agi): array
{
    $now        = Util::getNowDate();
    $id         = '';
    $time_start = $now;
    $exten      = $agi->request['agi_extension'];

    $is_conf   = ($agi->get_variable('CALLERID(num)', true) === 'Conference_Room');
    $not_local = (stripos($agi->request['agi_channel'], 'local/') === false);
    if ($not_local && ! $is_conf) {
        $am         = Util::getAstManager('off');
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
        // Strip everything before "/".
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
        'action'        => 'meetme_dial',
        'src_chan'      => $agi->request['agi_channel'],
        'src_num'       => $src_num,
        'src_name'      => $agi->getCallerIdName($src_num),
        'dst_num'       => $dst_num,
        'dst_chan'      => 'MeetMe:' . $mikoidconf,
        'start'         => $time_start,
        'answer'        => $time_start,
        'recordingfile' => "$recordingfile.webm",
        'did'           => $agi->get_variable('FROM_DID', true),
        'transfer'      => '0',
        'UNIQUEID'      => $id,
        'linkedid'      => $agi->get_variable('CHANNEL(linkedid)', true),
    ];

    // Capture src_call_id if the channel is PJSIP
    if (stripos($agi->request['agi_channel'], 'PJSIP/') !== false) {
        $data['src_call_id'] = $agi->get_variable('CHANNEL(pjsip,call-id)', true);
    }

    $agi->set_variable('MEETME_RECORDINGFILE', $recordingfile);
    $agi->set_variable('__pt1c_q_UNIQUEID', $id);

    return $data;
}

$agi    = new AGI();
$result = Event_meetme_dial($agi);
$data   = AsteriskManager::encodeCdrData($result);
$agi->exec("CELGenUserEvent", $data);
$agi->exec("UserEvent", "CdrConnector,AgiData:$data");
