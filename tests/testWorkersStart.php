<?php

use MikoPBX\Core\System\Util;
use \MikoPBX\Core\Workers\WorkerLongPoolAPI;
use \MikoPBX\Core\Workers\WorkerModelsEvents;
use Phalcon\Loader;

require_once 'globals.php';



$ReflectedClass = new ReflectionClass(WorkerModelsEvents::class);

echo $ReflectedClass->getFileName();

// $reflection = new \ReflectionClass();
// $filename = $reflection->getFileName();