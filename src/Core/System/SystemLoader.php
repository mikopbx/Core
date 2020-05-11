<?php

namespace MikoPBX\Core\System;

use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Core\System\Upgrade\UpdateSystemConfig;
use MikoPBX\Service\Main; // at mikopbx.so
use Phalcon\Di;

ini_set('error_reporting', E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

class SystemLoader
{
    private $di;

    public function __construct()
    {
        $this->di = Di::getDefault();
    }

    /**
     * Load system services
     */
    public function startSystem(): bool
    {
        $this->di->getRegistry()->booting = true;
        $storage                          = new Storage();
        Util::echoWithSyslog(' - Mount storage disk... ');
        $storage->saveFstab();
        $storage->configure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Start syslogd daemon...');
        $system = new System();
        $system->syslogd_start();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Update database ... ');
        $dbUpdater = new UpdateDatabase();
        $dbUpdater->updateDatabaseStructure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Update configs and applications ... ');
        $confUpdate = new UpdateSystemConfig();
        $confUpdate->updateConfigs();
        Util::echoGreenDone();


        Util::echoWithSyslog(' - Load kernel modules ... ');
        $system->loadKernelModules();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring VM tools ... ');
        $system->vmwareToolsConfigure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring timezone ... ');
        $system->timezoneConfigure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring hostname ... ');
        $system->hostnameConfigure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring resolv.conf ... ');
        $network = new Network();
        $network->resolvConfGenerate();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring network loopback interface ... ');
        $network->loConfigure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring LAN interface ... ');
        $network->lanConfigure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring SSH console ...  ');
        $system->sshdConfigure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring msmtp services...');
        $notifications = new Notifications();
        $notifications->configure();
        Util::echoGreenDone();

        $this->di->getRegistry()->booting = false;

        return true;
    }

    /**
     * Load Asterisk and Web interface
     *
     * @return bool
     */
    public function startMikoPBX(): bool
    {
        $this->di->getRegistry()->booting = true;
        $system                           = new System();
        $pbx                              = new PBX();

        Util::echoWithSyslog(' - Start nats queue daemon...');
        $system->gnatsStart();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Start Nginx daemon...');
        $system->nginxGenerateConf();
        $system->nginxStart();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring Asterisk...');
        $pbx->configure();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Start Asterisk...');
        $pbx->start();
        $system->onAfterPbxStarted();
        Util::echoGreenDone();

        Util::echoWithSyslog(' - Configuring Cron tasks...');
        $system->cronConfigure();
        Util::echoGreenDone();

        $this->di->getRegistry()->booting = false;

        return true;
    }
}