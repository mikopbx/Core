#!/usr/bin/php
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2018
 */
require_once 'globals.php';
require_once 'phpagi.php';

$agi = new AGI();
$channel	= $agi->get_variable('MASTER_CHANNEL(M_TIMEOUT_CHANNEL)', 	true);

/** @var AGI_AsteriskManager $am */
$am = Util::get_am('off');
$am->SetVar($channel, 'TIMEOUT(absolute)', '0');
