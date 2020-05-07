<?php

use MikoPBX\Core\System\UpdateSystemConfig;
require_once 'globals.php';

$updater = new UpdateSystemConfig();
$updater->updateDatabaseStructure();