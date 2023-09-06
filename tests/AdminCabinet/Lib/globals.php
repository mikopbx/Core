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

$config_file = getenv('CONFIG_FILE');
if(!file_exists($config_file)) {
    $config_file = 'config/local.conf.json';
}
if(!file_exists($config_file)) {
    $config_file = '../config/local.conf.json';
}
$GLOBALS['CONFIG'] = json_decode(file_get_contents($config_file), true);

$GLOBALS['BROWSERSTACK_USERNAME'] = getenv('BROWSERSTACK_USERNAME');
if(!$GLOBALS['BROWSERSTACK_USERNAME']) $GLOBALS['BROWSERSTACK_USERNAME'] = $GLOBALS['CONFIG']['user'];

$GLOBALS['BROWSERSTACK_ACCESS_KEY'] = getenv('BROWSERSTACK_ACCESS_KEY');
if(!$GLOBALS['BROWSERSTACK_ACCESS_KEY']) $GLOBALS['BROWSERSTACK_ACCESS_KEY'] = $GLOBALS['CONFIG']['key'];

$GLOBALS['BROWSERSTACK_DAEMON_STARTED'] = getenv('BROWSERSTACK_DAEMON_STARTED');

$GLOBALS['SERVER_PBX'] = getenv('SERVER_PBX');
if(!$GLOBALS['SERVER_PBX']) {
    $GLOBALS['SERVER_PBX']='https://172.16.32.72';
}

$GLOBALS['BUILD_NUMBER'] = getenv('BUILD_NUMBER');
if(!$GLOBALS['BUILD_NUMBER']) {
    $GLOBALS['BUILD_NUMBER']='Unknown';
}

$GLOBALS['MIKO_LICENSE_KEY'] = getenv('MIKO_LICENSE_KEY');
if(!$GLOBALS['MIKO_LICENSE_KEY']) {
    $GLOBALS['MIKO_LICENSE_KEY']=$GLOBALS['CONFIG']['MIKO_LICENSE_KEY'];
}

$GLOBALS['bs_local'] = getenv('BROWSERSTACK_LOCAL');
$GLOBALS['bs_localIdentifier'] = getenv('BROWSERSTACK_LOCAL_IDENTIFIER');


