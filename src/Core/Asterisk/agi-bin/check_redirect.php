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

use MikoPBX\Core\System\{BeanstalkClient, SystemMessages};
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\Core\Asterisk\AGI;

require_once 'Globals.php';

$chan       = trim($argv[1]);
$agi        = new AGI();
$DIALSTATUS = $agi->get_variable('DIALSTATUS', true);
$linkedid   = $agi->get_variable('CHANNEL(linkedid)', true);
if ($chan === '' && 'ANSWER' === $DIALSTATUS) {
    exit;
}
// Reset the value of the variable.
$agi->set_variable('BLINDTRANSFER', '');

try {
    $filter  = [
        '(dst_chan=:chan: OR src_chan=:chan:) AND linkedid=:linkedid:',
        'bind'        => ['chan' => $chan, 'linkedid' => $linkedid],
        'limit'       => 1,
        'miko_tmp_db' => true,
    ];
    $client  = new BeanstalkClient(WorkerCdr::SELECT_CDR_TUBE);
    list($result, $message) = $client->sendRequest(json_encode($filter), 2);
    if ($result !== false) {
        $res = json_decode($client->getBody(), true);
        if (count($res) === 1) {
            $exten = ($res[0]['src_chan'] === $chan) ? $res[0]['src_num'] : $res[0]['dst_num'];
            sleep(2);
            $agi->set_variable('pt1c_UNIQUEID', '');
            $agi->exec_goto('internal', $exten, '1');
        }
    } else {
        SystemMessages::sysLogMsg('CheckRedirect', "Error get data from queue 'WorkerCdr::SELECT_CDR_TUBE'. ", LOG_ERR);
    }
} catch (\Throwable $e) {
    SystemMessages::sysLogMsg('CheckRedirect', $e->getMessage(), LOG_ERR);
}
