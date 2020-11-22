// TODO::Добавить в src/Core/System/SystemLoader.php проверку на debian и там стартовать все

<!--#!/usr/bin/php -f-->


use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Processes;<?php
//namespace MikoPBX\Core\Rc;
// /**
//  * Copyright © MIKO LLC - All Rights Reserved
//  * Unauthorized copying of this file, via any medium is strictly prohibited
//  * Proprietary and confidential
//  * Written by Alexey Portnov, 5 2018
//  */
// use MikoPBX\Core\System\System;
// use MikoPBX\Core\System\Network;
// use MikoPBX\Core\System\Notifications;
// use MikoPBX\Core\System\PBX;
// use MikoPBX\Core\System\Util;
// use function MikoPBX\Common\Config\appPath;
//
// require_once('Globals.php');
//
// if(file_exists('/tmp/ejectcd')){
//     sleep(15);
// }
//
// echo " - Update settings db ... ";
// PBX::updateSystemConfig();
// // Обновление конфигурации.
// $util = new Util();
// Util::echoGreenDone();
//
// $system  = new System();
// $network = new Network();
// $notifications = new Notifications();
//
// echo " - Configuring console ... ";
// $system->updateShellPassword();
// // $system->sshdConfigure();
// Util::echoGreenDone();
//
// echo " - Load kernel modules ... ";
// $system->loadKernelModules();
// Util::echoGreenDone();
//
// echo " - Configuring timezone ... ";
// $system->timezoneConfigure();
// Util::echoGreenDone();
//
// echo " - Configuring hostname... ";
// $system->hostnameConfigure();
// Util::echoGreenDone();
//
// echo " - Generating resolv.conf... ";
// $network->resolvConfGenerate();
// Util::echoGreenDone();
//
// echo " - Configuring LAN interface... ";
// $network->lanConfigure();
// Util::echoGreenDone();
//
// echo " - Configuring msmtp services...";
// $notifications->configure();
// Util::echoGreenDone();
//
// echo " - Start syslog deamon...";
// $system->syslogd_start();
//
// echo " - Start models worker...";
// $workersPath = appPath('src/Core/Workers');
// Processes::mwExecBg("/etc/rc/worker_reload 'php -f {$workersPath}/WorkerModelsEvents.php' ");
// Processes::mwExecBg("/etc/rc/worker_reload 'php -f {$workersPath}/WorkerLongPoolAPI.php' ");
//
// echo " - Configuring gnats services...";
// $system->gnatsStart();
// Util::echoGreenDone();
//
// echo " - Configuring nginx services...";
// $system->nginxStart();
// Util::echoGreenDone();
//
// $pbx = new PBX();
// $pbx->configure();
// $system->onAfterPbxStarted();
// $system->cronConfigure(true);
