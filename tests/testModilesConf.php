<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */
require_once 'globals.php';

$mo = new \MikoPBX\Core\Asterisk\Configs\ModulesConf();

$mo->generateModulesConf();
