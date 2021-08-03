<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Core\System;

use MikoPBX\Core\System\Configs\BeanstalkConf;
use MikoPBX\Core\System\Configs\CronConf;
use MikoPBX\Core\System\Configs\IptablesConf;
use MikoPBX\Core\System\Configs\NatsConf;
use MikoPBX\Core\System\Configs\NginxConf;
use MikoPBX\Core\System\Configs\NTPConf;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\System\Configs\RedisConf;
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

        Util::echoWithSyslog(' - Start beanstalkd daemon...');
        $beanstalkConf = new BeanstalkConf();
        $beanstalkConf->reStart();
        Util::echoDone();

        Util::echoWithSyslog(' - Start redis daemon...');
        $redisConf = new RedisConf();
        $redisConf->reStart();
        Util::echoDone();

        $system = new System();
        Util::echoWithSyslog(' - Configuring timezone ... ');
        $system::timezoneConfigure();
        Util::echoDone();

        $storage       = new Storage();
        Util::echoWithSyslog(' - Mount storage disk... ');
        $storage->saveFstab();
        $storage->configure();
        Util::echoDone();

        Util::echoWithSyslog(' - Connect swap... ');
        $storage->mountSwap();
        Util::echoDone();

        Util::echoWithSyslog(' - Start syslogd daemon...');
        $syslogConf = new SyslogConf();
        $syslogConf->reStart();
        Util::echoDone();
        
        $dbUpdater = new UpdateDatabase();
        $dbUpdater->updateDatabaseStructure();

        Util::echoWithSyslog(' - Create modules links and folders ... ');
        $storage->createWorkDirsAfterDBUpgrade();
        Util::echoDone();

        Util::echoWithSyslog(' - Update configs and applications ... '."\n");
        $confUpdate = new UpdateSystemConfig();
        $confUpdate->updateConfigs();
        Util::echoWithSyslog(' - Update configs ... ');
        Util::echoDone();

        Util::echoWithSyslog(' - Load kernel modules ... ');
        $resKernelModules = $system->loadKernelModules();
        Util::echoDone($resKernelModules);

        Util::echoWithSyslog(' - Configuring VM tools ... ');
        $vmwareTools    = new VMWareToolsConf();
        $resultVMTools  = $vmwareTools->configure();
        Util::echoDone($resultVMTools);

        Util::echoWithSyslog(' - Configuring hostname ... ');
        $network = new Network();
        $network->hostnameConfigure();
        Util::echoDone();

        Util::echoWithSyslog(' - Configuring resolv.conf ... ');
        $network->resolvConfGenerate();
        Util::echoDone();

        Util::echoWithSyslog(' - Configuring LAN interface ... ');
        $network->lanConfigure();
        Util::echoDone();

        Util::echoWithSyslog(' - Configuring Firewall ... ');
        $firewall = new IptablesConf();
        $firewall->applyConfig();
        Util::echoDone();

        Util::echoWithSyslog(' - Configuring ntpd ... ');
        NTPConf::configure();
        Util::echoDone();

        Util::echoWithSyslog(' - Configuring SSH console ... ');
        $sshConf = new SSHConf();
        $resSsh  = $sshConf->configure();
        Util::echoDone($resSsh);

        Util::echoWithSyslog(' - Configuring msmtp services... ');
        $notifications = new Notifications();
        $notifications->configure();
        Util::echoDone();

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
        Util::echoDone();

        Util::echoWithSyslog(' - Start php-fpm daemon...');
        PHPConf::reStart();
        Util::echoDone();

        Util::echoWithSyslog(' - Configuring Asterisk...'.PHP_EOL);
        $pbx                              = new PBX();
        $pbx->configure();

        Util::echoWithSyslog(' - Start Asterisk... ');
        $pbx->start();
        Util::echoDone();

        Util::echoWithSyslog(' - Wait asterisk fully booted... ');
        PBX::waitFullyBooted();
        Util::echoDone();

        Util::echoWithSyslog(' - Configuring Cron tasks... ');
        $cron = new CronConf();
        $cron->reStart();
        Util::echoDone();

        Util::echoWithSyslog(' - Start Nginx daemon...');
        $nginx = new NginxConf();
        $nginx->generateConf();
        $nginx->reStart();
        Util::echoDone();

        $this->di->getShared('registry')->booting = false;

        return true;
    }
}