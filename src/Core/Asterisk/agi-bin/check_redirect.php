#!/usr/bin/php
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2018
 */

use MikoPBX\Core\System\{BeanstalkClient, Util};
use MikoPBX\Core\Workers\WorkerCdr;

require_once 'phpagi.php';
require_once 'Globals.php';

$chan       = trim($argv[1]);
$agi        = new AGI();
$DIALSTATUS = $agi->get_variable('DIALSTATUS', true);
$linkedid   = $agi->get_variable('CDR(linkedid)', true);
if ($chan === '' && 'ANSWER' === $DIALSTATUS) {
    exit;
}
// Обнуляем значение переменной.
$agi->set_variable('BLINDTRANSFER', '');

try {
    $filter  = [
        '(dst_chan=:chan: OR src_chan=:chan:) AND linkedid=:linkedid:',
        'bind'        => ['chan' => $chan, 'linkedid' => $linkedid],
        'limit'       => 1,
        'miko_tmp_db' => true,
    ];
    $client  = new BeanstalkClient(WorkerCdr::SELECT_CDR_TUBE);
    $message = $client->request(json_encode($filter), 2);
    if ($message !== false) {
        $res = json_decode($client->getBody(), true);
        if (count($res) === 1) {
            $exten = ($res[0]['src_chan'] === $chan) ? $res[0]['src_num'] : $res[0]['dst_num'];
            sleep(2);
            $agi->set_variable('pt1c_UNIQUEID', '');
            $agi->exec_goto('internal', $exten, '1');
        }
    } else {
        Util::sysLogMsg('CheckRedirect', "Error get data from queue 'WorkerCdr::SELECT_CDR_TUBE'. ");
    }
} catch (Exception $e) {
    Util::sysLogMsg('CheckRedirect', $e->getMessage());
}
