#!/usr/bin/php
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2018
 */

use MikoPBX\Core\System\Util;

require_once 'Globals.php';
require_once 'phpagi.php';

$agi        = new AGI();
$channel    = $agi->get_variable('MASTER_CHANNEL(M_TIMEOUT_CHANNEL)', true);
$srcChannel = $agi->get_variable('FROM_CHAN', true);

$am = Util::getAstManager('off');
$am->SetVar($channel, 'TIMEOUT(absolute)', '0');
$am->SetVar($srcChannel, "MASTER_CHANNEL(M_DIALSTATUS)", 'ANSWER');

// Перестрахова на случай с перехватом звонка через *8.
$timeoutChannel = $am->GetVar($srcChannel, 'MASTER_CHANNEL(M_TIMEOUT_CHANNEL)', null, false);
if(is_string($timeoutChannel) && !empty($timeoutChannel)){
    $am->SetVar($timeoutChannel, "TIMEOUT(absolute)", '0');
}
