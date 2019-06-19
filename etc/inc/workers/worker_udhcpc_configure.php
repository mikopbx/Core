#!/usr/bin/php
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2018
 */

require_once 'globals.php';

$network = new Network();
$action  = trim($argv[1]);

if($action == 'deconfig'){
    $network->udhcpc_configure_deconfig();
}elseif( 'renew' == $action || 'bound' == $action ){
    $network->udhcpc_configure_renew_bound();
}
