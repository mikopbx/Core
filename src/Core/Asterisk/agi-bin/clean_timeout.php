#!/usr/bin/php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\Asterisk\AGI;
use MikoPBX\Core\Workers\WorkerCallEvents;
require_once 'Globals.php';

$agi    = new AGI();
$client = new BeanstalkClient(WorkerCallEvents::TIMOUT_CHANNEL_TUBE);
$data   = [
    'channel'    => $agi->get_variable('MASTER_CHANNEL(M_TIMEOUT_CHANNEL)', true),
    'srcChannel' => $agi->get_variable('FROM_CHAN', true),
];
$client->publish(json_encode($data));
