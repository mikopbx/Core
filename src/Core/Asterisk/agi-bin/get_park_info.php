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

use MikoPBX\Core\System\Util;
use MikoPBX\Core\Asterisk\AGI;

require_once 'Globals.php';

/**
 * Get active channels by extension.
 *
 * @param string $EXTEN The extension to retrieve active channels for.
 * @return string An associative array where the key is the Linkedid and the value is an array of channels.
 */
function getActiveIdChannels(string $EXTEN):string
{
    $ParkeeChannel = '';
    $am            = Util::getAstManager('off');
    if ( ! $am->loggedIn()) {
        return $ParkeeChannel;
    }
    $res = $am->ParkedCalls('default');
    $am->disconnect();
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