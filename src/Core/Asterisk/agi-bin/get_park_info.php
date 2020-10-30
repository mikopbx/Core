#!/usr/bin/php
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2018
 */

use MikoPBX\Core\System\Util;
use MikoPBX\Core\Asterisk\AGI;

require_once 'Globals.php';

// Функция позволяет получить активные каналы. 
// Возвращает ассоциативный массив. Ключ - Linkedid, значение - массив каналов. 
function getActiveIdChannels($EXTEN)
{
    $ParkeeChannel = '';
    $am            = Util::getAstManager('off');
    if ( ! $am->loggedIn()) {
        return $ParkeeChannel;
    }
    $res = $am->ParkedCalls('default');
    if (count($res['data']) == 0) {
        return $ParkeeChannel;
    }

    foreach ($res['data']['ParkedCall'] as $park_row) {
        if ($park_row['ParkingSpace'] == $EXTEN) {
            $ParkeeChannel = $park_row['ParkeeChannel'];
        }
    }

    return $ParkeeChannel;
}

$agi   = new AGI();
$exten = $agi->get_variable("EXTEN", true);

$PARK_CHAN = getActiveIdChannels($exten);
$agi->set_variable("__pt1c_IS_PARK", "1");
$agi->set_variable("pt1c_PARK_CHAN", $PARK_CHAN);