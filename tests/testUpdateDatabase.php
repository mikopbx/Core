<?php

use MikoPBX\Core\System\Upgrade\UpdateSystemConfig;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;

require_once 'globals.php';

$updater = new UpdateDatabase();
$updater->updateDatabaseStructure();

$updater = new UpdateSystemConfig();
$updater->updateConfigs();