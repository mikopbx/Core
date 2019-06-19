<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2019
 */

ini_set('error_reporting', E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
require_once 'globals.php';
$g['booting']   = true;


function show_status($done, $total, $size=30) {

    static $start_time;

    // if we go over our bound, just ignore it
    if($done > $total) return;

    if(empty($start_time)) $start_time=time();
    $now = time();

    $perc=(double)($done/$total);

    $bar=floor($perc*$size);

    $status_bar="\r[";
    $status_bar.=str_repeat("=", $bar);
    if($bar<$size){
        $status_bar.=">";
        $status_bar.=str_repeat(" ", $size-$bar);
    } else {
        $status_bar.="=";
    }

    $disp=number_format($perc*100, 0);

    $status_bar.="] $disp%  $done/$total";

    $rate = ($now-$start_time)/$done;
    $left = $total - $done;
    $eta = round($rate * $left, 2);

    $elapsed = $now - $start_time;

    $status_bar.= " remaining: ".number_format($eta)." sec.  elapsed: ".number_format($elapsed)." sec.";

    echo "$status_bar  ";

    flush();

    // when done, send a newline
    if($done == $total) {
        echo "\n";
    }

}

function getTime($time = false){
    return $time === false? microtime(true) : microtime(true) - $time;
}
/*
// $b = new \Backup("backup_1555401819");
// $b->create_arhive();
// $b->recover_with_progress();

// exit(0);
$result_file = '/storage/usbdisk1/mikopbx/tmp/result.zip';
for ($i = 1; $i <= 500; $i++) {
    show_status($i, 500);
    $filename = "/storage/usbdisk1/mikopbx/voicemailarchive/file_{$i}.mp3";
    // Создаем временный файл.
    $ret = \Util::mwexec("dd if=/dev/urandom of={$filename} bs=1M count=10");
    if($ret!=0){
        echo "error 1 - $filename";
        break;
    }
//    $time = getTime();
//    $ret = \Util::mwexec("cp ");
//    $delta_time = getTime($time);
//    // unlink($filename);
//
//    if($delta_time > 3){
//        echo "error 3 --- $time";
//        break;
//    }
//    if($ret==false){
//        break;
//    }
}

exit(0);
// */

if(count($argv)==1){
    $g['booting']   = false;
    Cdr::create_db();
    Util::CreateLogDB();

    $pbx = new PBX();
    $pbx->stop();
    $pbx->configure();

}elseif (count($argv)==3){
    // php -f /etc/inc/test.php ModuleSmartIVR InstallDB
    // php -f /etc/inc/test.php ModuleSmartIVR unInstallDB
    // php -f /etc/inc/test.php ModuleCTIClient unInstallDB
    // php -f /etc/inc/test.php ModuleCTIClient InstallDB

    // php -f /etc/inc/test.php ModuleAutoprovision InstallDB
    // php -f /etc/inc/test.php ModuleCallTracking InstallDB
    // php -f /etc/inc/test.php ModuleTelegramNotify InstallDB
    // php -f /etc/inc/test.php ModuleTelegramNotify unInstallDB

    // php -f /etc/inc/test.php ModuleWebConsole InstallDB

    // php -f /etc/inc/test.php ModuleBitrix24Notify InstallDB
    // php -f /etc/inc/test.php ModuleBitrix24Integration InstallDB
    // php -f /etc/inc/test.php ModuleBitrix24Integration unInstallDB

    $module = $argv[1];
    $action = $argv[2];
    $path_class = "\\Modules\\{$module}\\setup\\PbxExtensionSetup";
    if(!class_exists("$path_class")){
        $path_class = false;
        echo "Класс не существует.. $path_class";
        exit(1);
    }

    $setup    = new $path_class();
    $response = $setup->$action();
}
