#!/usr/bin/php
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2018
 */

use MikoPBX\Core\System\{Util};

require_once 'globals.php';
require_once 'phpagi.php';

$agi       = new AGI();
$channel   = $agi->get_variable('MASTER_CHANNEL(M_TIMEOUT_CHANNEL)', true);
$FROM_CHAN = $agi->get_variable('FROM_CHAN', true);

/** @var AGI_AsteriskManager $am */
$am = Util::getAstManager('off');
$am->SetVar($channel, 'TIMEOUT(absolute)', '0');
$am->SetVar($FROM_CHAN, "MASTER_CHANNEL(M_DIALSTATUS)", 'ANSWER');

// Перестрахова на случай с перехватом звонка через *8.
$t_channel = $am->GetVar($FROM_CHAN, 'MASTER_CHANNEL(M_TIMEOUT_CHANNEL)');
$am->SetVar($t_channel, "TIMEOUT(absolute)", '0');
