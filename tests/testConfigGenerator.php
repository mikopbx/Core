<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

use MikoPBX\Core\System\PBX;
use Phalcon\Di;

require_once 'globals.php';
$di = Di::getDefault();
$di->getRegistry()->booting = true;
$pbx                              = new PBX();

$pbx->configure();