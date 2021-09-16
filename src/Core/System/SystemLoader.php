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
    private string $stageMessage = '';

    private function echoStartMsg(string $message):void
    {
        $this->stageMessage = $message;
        Util::echoWithSyslog($this->stageMessage);
    }

    private function echoResultMsg(bool $result = true):void
    {
        Util::echoResult($this->stageMessage, $result);
        $this->stageMessage = '';
    }

    /**
     * Load system services
     */
    public function startSystem(): bool
    {
        $this->di->getShared('registry')->booting = true;

        $this->echoStartMsg(' - Start beanstalkd daemon...');
        $beanstalkConf = new BeanstalkConf();
        $beanstalkConf->reStart();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Start redis daemon...');
        $redisConf = new RedisConf();
        $redisConf->reStart();
        $this->echoResultMsg();

        $system = new System();
        $this->echoStartMsg(' - Configuring timezone...');
        $system::timezoneConfigure();
        $this->echoResultMsg();

        $storage       = new Storage();
        $this->echoStartMsg(' - Mount storage disk...');
        $storage->saveFstab();
        $storage->configure();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Connect swap...');
        $storage->mountSwap();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Start syslogd daemon...');
        $syslogConf = new SyslogConf();
        $syslogConf->reStart();
        $this->echoResultMsg();
        
        $dbUpdater = new UpdateDatabase();
        $dbUpdater->updateDatabaseStructure();

        $this->echoStartMsg(' - Create modules links and folders...');
        $storage->createWorkDirsAfterDBUpgrade();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Update configs and applications...'."\n");
        $confUpdate = new UpdateSystemConfig();
        $confUpdate->updateConfigs();
        $this->echoStartMsg(' - Update configs...');
        $this->echoResultMsg();

        $this->echoStartMsg(' - Load kernel modules...');
        $resKernelModules = $system->loadKernelModules();
        $this->echoResultMsg($resKernelModules);

        $this->echoStartMsg(' - Configuring VM tools...');
        $vmwareTools    = new VMWareToolsConf();
        $resultVMTools  = $vmwareTools->configure();
        $this->echoResultMsg($resultVMTools);

        $this->echoStartMsg(' - Configuring hostname...');
        $network = new Network();
        $network->hostnameConfigure();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Configuring resolv.conf...');
        $network->resolvConfGenerate();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Configuring LAN interface...');
        $network->lanConfigure();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Configuring Firewall...');
        $firewall = new IptablesConf();
        $firewall->applyConfig();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Configuring ntpd...');
        NTPConf::configure();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Configuring SSH console...');
        $sshConf = new SSHConf();
        $resSsh  = $sshConf->configure();
        $this->echoResultMsg($resSsh);

        $this->echoStartMsg(' - Configuring msmtp services...');
        $notifications = new Notifications();
        $notifications->configure();
        $this->echoResultMsg();

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

        $this->echoStartMsg(' - Start nats queue daemon...');
        $natsConf = new NatsConf();
        $natsConf->reStart();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Start php-fpm daemon...');
        PHPConf::reStart();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Configuring Asterisk...'.PHP_EOL);
        $pbx = new PBX();
        $pbx->configure();

        $this->echoStartMsg(' - Start Asterisk...');
        $pbx->start();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Wait asterisk fully booted...');
        PBX::waitFullyBooted();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Configuring Cron tasks...');
        $cron = new CronConf();
        $cron->reStart();
        $this->echoResultMsg();

        $this->echoStartMsg(' - Start Nginx daemon...');
        $nginx = new NginxConf();
        $nginx->generateConf();
        $nginx->reStart();
        $this->echoResultMsg();

        $this->di->getShared('registry')->booting = false;

        return true;
    }
}