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
use MikoPBX\Core\Asterisk\Configs\ResParkingConf;
use MikoPBX\Core\System\Util;

require_once 'Globals.php';

/**
 * Creates an event for unparking a call.
 *
 * Retrieves parking slot data via AMI, determines source/destination
 * based on the parking context, and generates a CDR event including
 * the parking duration record.
 *
 * @param AGI $agi The AGI object.
 * @return array The data for the unpark call event.
 * @throws \Exception
 */
function Event_unpark_call(AGI $agi): array
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
    $data['action']       = 'unpark_call';
    $data['UNIQUEID']     = $id;
    $data['linkedid_old'] = $agi->get_variable("CHANNEL(linkedid)", true);
    $data['agi_channel']  = $channel;
    $data['linkedid']     = $park_row['ParkeeLinkedid'];
    $data['start']        = $now;
    $data['transfer']     = '0';
    $data['did']          = $agi->get_variable("FROM_DID", true);
    $data['answer']       = $data['start'];

    $callerIdName = $agi->getCallerIdName($agi->request['agi_callerid']);
    if (null === $park_row) {
        $data['src_chan'] = $channel;
        $data['src_num']  = $agi->request['agi_callerid'];
        $data['src_name'] = $callerIdName;
        $data['dst_num']  = $agi->request['agi_extension'];
        $data['dst_chan'] = 'Park:' . $agi->request['agi_extension'];
    } elseif (true === $park_row['pt1c_is_dst']) {
        $data['src_chan'] = $channel;
        $data['dst_chan'] = $park_row['ParkeeChannel'];
        $data['src_num']  = $agi->request['agi_callerid'];
        $data['src_name'] = $callerIdName;
        $data['dst_num']  = $park_row['ParkeeCallerIDNum'];
    } else {
        $data['src_chan'] = $park_row['ParkeeChannel'];
        $data['dst_chan'] = $channel;
        $data['src_num']  = $park_row['ParkeeCallerIDNum'];
        $data['dst_num']  = $agi->request['agi_callerid'];
        $data['dst_name'] = $callerIdName;
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

$agi    = new AGI();
$result = Event_unpark_call($agi);
$data   = base64_encode(json_encode($result));
$agi->exec("CELGenUserEvent", $data);
$agi->exec("UserEvent", "CdrConnector,AgiData:$data");
