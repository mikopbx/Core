<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2020
 */

namespace MikoPBX\Core\System;

use MikoPBX\Core\System\Configs\CronConf;
use MikoPBX\Core\System\Configs\NatsConf;
use MikoPBX\Core\System\Configs\NginxConf;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\System\Configs\SSHConf;
use MikoPBX\Core\System\Configs\SyslogConf;
use MikoPBX\Core\System\Configs\VMWareToolsConf;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Core\System\Upgrade\UpdateSystemConfig;
use Phalcon\Di;

class SystemLoader extends Di\Injectable
{
    /**
     * Load system services
     */
    public function startSystem(): bool
    {
        $this->di->getShared('registry')->booting = true;
        $storage                          = new Storage();
        Util::echoWithSyslog(' - Mount storage disk... ');
        $storage->saveFstab();
        $storage->configure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Start syslogd daemon...');
        $syslogConf = new SyslogConf();
        $syslogConf->reStart();
        Util::echoGreenDone();
        
        $dbUpdater = new UpdateDatabase();
        $dbUpdater->updateDatabaseStructure();

        Util::echoWithSyslog(' - Create modules links and folders ... ');
        $storage->createWorkDirsAfterDBUpgrade();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Update configs and applications ... ');
        $confUpdate = new UpdateSystemConfig();
        $confUpdate->updateConfigs();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Load kernel modules ... ');
        $system = new System();
        $system->loadKernelModules();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring VM tools ... ');
        $vmwareTools = new VMWareToolsConf();
        $vmwareTools->configure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring timezone ... ');
        $system->timezoneConfigure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring hostname ... ');
        $network = new Network();
        $network->hostnameConfigure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring resolv.conf ... ');
        $network->resolvConfGenerate();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring network loopback interface ... ');
        $network->loConfigure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring LAN interface ... ');
        $network->lanConfigure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring SSH console ... ');
        $sshConf = new SSHConf();
        $sshConf->configure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring msmtp services... ');
        $notifications = new Notifications();
        $notifications->configure();
        Util::echoGreenDone();

        $this->di->getShared('registry')->booting = false;

        return true;
    }

    /**
     * Load Asterisk and Web interface
     *
     * @return bool
     */
    public function startMikoPBX(): bool
    {
        $this->di->getShared('registry')->booting = true;

        Util::echoWithSyslog(' - Start nats queue daemon...');
        $natsConf = new NatsConf();
        $natsConf->reStart();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Start php-fpm daemon...');
        $phpFPM = new PHPConf();
        $phpFPM->reStart();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Start Nginx daemon...');
        $nginx = new NginxConf();
        $nginx->generateConf();
        $nginx->reStart();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring Asterisk...'.PHP_EOL);
        $pbx                              = new PBX();
        $pbx->configure();

        Util::echoWithSyslog(' - Start Asterisk... ');
        $pbx->start();
        $system                           = new System();
        $system->onAfterPbxStarted();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring Cron tasks... ');
        $cron = new CronConf();
        $cron->reStart();
        Util::echoGreenDone();

        $this->di->getShared('registry')->booting = false;

        return true;
    }
}