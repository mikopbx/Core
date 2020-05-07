<?php

use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\Cron\WorkerSafeScripts;

require 'globals.php';

$workerSafeScriptsPath = Util::getFilePathByClassName(WorkerSafeScripts::class);