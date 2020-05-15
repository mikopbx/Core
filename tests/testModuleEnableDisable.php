<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */
require_once 'globals.php';

use MikoPBX\Modules\ModuleState;

$moduleStateProcessor = new ModuleState('ModuleSmartIVR');
if ($moduleStateProcessor->disableModule() === false){
    $result['messages']   = $moduleStateProcessor->getMessages();
} else {
    unset($result);
    $result['result']   = 'Success';
}

if ($moduleStateProcessor->enableModule() === false){
    $result['messages']   = $moduleStateProcessor->getMessages();
} else {
    unset($result);
    $result['result']   = 'Success';
}
