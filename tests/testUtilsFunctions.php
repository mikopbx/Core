<?php

use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;

require 'globals.php';

$workerSafeScriptsPath = Util::getFilePathByClassName(WorkerSafeScriptsCore::class);