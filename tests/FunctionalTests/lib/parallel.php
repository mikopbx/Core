<?php

require 'vendor/autoload.php';
require 'lib/globals.php';

$CONFIG = $GLOBALS['CONFIG'];
$procs = array();

foreach ($CONFIG['environments'] as $key => $value) {
    $cmd = "TASK_ID=$key vendor/bin/phpunit tests/single_test.php 2>&1\n";
    print_r($cmd);

    $procs[$key] = popen($cmd, "r");
}

foreach ($procs as $key => $value) {
    while (!feof($value)) { 
        print fgets($value, 4096);
    }
    pclose($value);
}

