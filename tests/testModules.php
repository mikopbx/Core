<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */

use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\System\{
    Util,
    Firewall,
    PBX
};
require_once 'globals.php';

ini_set('error_reporting', E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);


if(count($argv)===1){
    CdrDb::createDb();
    Util::CreateLogDB();

    $pbx = new PBX();
    $pbx::stop();
    $pbx->configure();

    Firewall::reloadFirewall();

}elseif (count($argv)===3){
    // php -f /etc/inc/test.php ModuleSmartIVR installModule
    // php -f /etc/inc/test.php ModuleSmartIVR uninstallModule
    // php -f /etc/inc/test.php ModuleCTIClient unInstallDB
    // php -f /etc/inc/test.php ModuleCTIClient InstallDB

    // php -f /etc/inc/test.php ModuleAutoprovision InstallDB
    // php -f /etc/inc/test.php ModuleCallTracking installModule
    // php -f /etc/inc/test.php ModuleTelegramNotify InstallDB
    // php -f /etc/inc/test.php ModuleTelegramNotify unInstallDB
    // php -f /etc/inc/test.php ModuleAdditionalWebAPI InstallDB
    // php -f /etc/inc/test.php ModuleAdditionalWebAPI unInstallDB

    // php -f /etc/inc/test.php ModuleWebConsole InstallDB
    // php -f /etc/inc/test.php ModulePatch_2020_1_62_v1 installModule
    // php -f /etc/inc/test.php ModulePatch_2020_1_62_v1 uninstallModule


    // php -f /etc/inc/test.php ModuleBitrix24Notify InstallDB
    // php -f /etc/inc/test.php ModuleBitrix24Integration installModule
    // php -f /etc/inc/test.php ModuleBitrix24Integration uninstallModule
    // php -f /etc/inc/test.php ModuleBitrix24Integration uninstallModule
    $module = $argv[1] ?? '';
    $action = $argv[2] ?? '';
    $path_class = "\\Modules\\{$module}\\Setup\\PbxExtensionSetup";
    if(!class_exists($path_class)){
        $path_class = false;
        echo "Класс не существует.. $path_class";
        exit(1);
    }

    $setup    = new $path_class();
    $response = $setup->$action();
}
