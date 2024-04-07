<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Providers\RegistryProvider;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\System\Configs\ACPIDConf;
use MikoPBX\Core\System\Configs\BeanstalkConf;
use MikoPBX\Core\System\Configs\CronConf;
use MikoPBX\Core\System\Configs\IptablesConf;
use MikoPBX\Core\System\Configs\NatsConf;
use MikoPBX\Core\System\Configs\NginxConf;
use MikoPBX\Core\System\Configs\NTPConf;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\System\Configs\RedisConf;
use MikoPBX\Core\System\Configs\SentryConf;
use MikoPBX\Core\System\Configs\SSHConf;
use MikoPBX\Core\System\Configs\SyslogConf;
use MikoPBX\Core\System\Configs\VmToolsConf;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Core\System\Upgrade\UpdateSystemConfig;
use Phalcon\Di;

/**
 * SystemLoader class
 *
 * This class is responsible for loading the system services.
 *
 * @package MikoPBX\Core\System
 * @property \Phalcon\Config config
 */

class SystemLoader extends Di\Injectable
{
    /**
     * Message displayed during the start of a stage.
     *
     * @var string
     */
    private string $stageMessage = '';

    /**
     * Echoes the starting message for a stage.
     *
     * @param string $message The message to echo.
     */
    private function echoStartMsg(string $message):void
    {
        $this->stageMessage = $message;
        Util::teletypeEcho($message);
        Util::echoWithSyslog($this->stageMessage);
    }

    /**
     * Echoes the result message for a stage.
     *
     * @param bool $result The result of the stage.
     */
    private function echoResultMsg(bool $result = true):void
    {
        Util::echoResult($this->stageMessage, $result);
        Util::teletypeEchoDone($this->stageMessage, $result);
        $this->stageMessage = '';
    }

    /**
     * Starts the system services.
     *
     * @return bool True on success, false otherwise.
     */
    public function startSystem(): bool
    {
        $system = new System();
        // Is the configuration default?
        // Try restore config...
        if($system->isDefaultConf() && !file_exists('/offload/livecd')){
            $this->echoStartMsg(' - Try restore backup of settings... ');
            $system->tryRestoreConf();
            $this->echoResultMsg();
        }

        // Check if the system is running on T2SDELinux
        $itIsT2SDELinux = Util::isT2SdeLinux();

        // Check if the system is running in Docker
        $itIsDocker = Util::isDocker();

        // Mark the registry as booting
        $this->di->getShared(RegistryProvider::SERVICE_NAME)->booting = true;

        // Start the ACPID daemon
        $this->echoStartMsg(PHP_EOL);
        $this->echoStartMsg(' - Start acpid daemon...');
        $ACPIDConf = new ACPIDConf();
        $ACPIDConf->reStart();
        $this->echoResultMsg();

        // Start the Beanstalkd daemon
        $this->echoStartMsg(' - Start beanstalkd daemon...');
        $beanstalkConf = new BeanstalkConf();
        $beanstalkConf->reStart();
        $this->echoResultMsg();

        // Start the Redis daemon
        $this->echoStartMsg(' - Start redis daemon...');
        $redisConf = new RedisConf();
        $redisConf->reStart();
        $this->echoResultMsg();

        // Configure Sentry error logger
        $this->echoStartMsg(' - Configuring sentry error logger ...');
        $sentryConf = new SentryConf();
        $sentryConf->configure();
        $this->echoResultMsg();

        // Configure the system timezone
        $this->echoStartMsg(' - Configuring timezone...');
        $system::timezoneConfigure();
        $this->echoResultMsg();

        // Mount the storage disk
        $storage       = new Storage();
        if($itIsT2SDELinux){
            // Do not need to set on Docker or Debian linux
            $storage->saveFstab();
        }
        $storage->configure();
        $this->echoStartMsg(' - Mount storage disk...');
        $this->echoResultMsg();

        // Additional tasks for T2SDELinux
        if($itIsT2SDELinux) {
            $this->echoStartMsg(' - Connect swap...');
            Processes::mwExecBg('/etc/rc/connect-swap');
            $this->echoResultMsg();
        }

        // Start the syslogd daemon
        $this->echoStartMsg(' - Start syslogd daemon...');
        $syslogConf = new SyslogConf();
        $syslogConf->reStart();
        $this->echoResultMsg();

        // Update the database structure
        $dbUpdater = new UpdateDatabase();
        $dbUpdater->updateDatabaseStructure();

        // Create directories required by modules after DB upgrade
        $this->echoStartMsg(' - Create modules links and folders...');
        $storage->createWorkDirsAfterDBUpgrade();
        $this->echoResultMsg();

        // Update the system configuration and applications
        $this->echoStartMsg(' - Update configs and applications...'."\n");
        $confUpdate = new UpdateSystemConfig();
        $confUpdate->updateConfigs();
        $this->echoStartMsg(' - Update configs...');
        $this->echoResultMsg();

        // Configure VM tools
        $this->echoStartMsg(' - Configuring VM tools...');
        $vmwareTools    = new VmToolsConf();
        $resultVMTools  = $vmwareTools->configure();
        $this->echoResultMsg($resultVMTools);

        // Configure the system hostname
        $this->echoStartMsg(' - Configuring hostname...');
        $network = new Network();
        $network->hostnameConfigure();
        $this->echoResultMsg();

        // Generate resolv.conf
        $this->echoStartMsg(' - Configuring resolv.conf...');
        $network->resolvConfGenerate();
        $this->echoResultMsg();

        // Configure LAN interface
        $this->echoStartMsg(' - Configuring LAN interface...');
        if ($itIsDocker){
            $network->configureLanInDocker();
        } else {
            $network->lanConfigure();
        }
        $this->echoResultMsg();

        // SSL rehash
        $this->echoStartMsg(' - SSL rehash...');
        System::sslRehash();
        $this->echoResultMsg();

        // Configure the firewall
        $this->echoStartMsg(' - Configuring Firewall...');
        $firewall = new IptablesConf();
        $firewall->applyConfig();
        $this->echoResultMsg();

        // Configure NTP
        $this->echoStartMsg(' - Configuring ntpd...');
        NTPConf::configure();
        $this->echoResultMsg();

        // Do not need to set Debian SSH service
        if(!Util::isSystemctl()){
            $this->echoStartMsg(' - Configuring SSH console...');
            $sshConf = new SSHConf();
            $resSsh  = $sshConf->configure();
            $this->echoResultMsg($resSsh);
        }

        // Start cloud provisioning
        if (!$itIsDocker) {
            $this->echoStartMsg(' - Cloud provisioning...'."\n");
            CloudProvisioning::start();
            $this->echoResultMsg();
        }
        $this->di->getShared(RegistryProvider::SERVICE_NAME)->booting = false;

        return true;
    }

    /**
     * Load Asterisk and Web interface
     *
     * @return bool
     */
    public function startMikoPBX(): bool
    {
        $this->di->getShared(RegistryProvider::SERVICE_NAME)->booting = true;

        // Start the NATS queue daemon
        $this->echoStartMsg(' - Start nats queue daemon...');
        $natsConf = new NatsConf();
        $natsConf->reStart();
        $this->echoResultMsg();

        // Start the PHP-FPM daemon
        $this->echoStartMsg(' - Start php-fpm daemon...');
        PHPConf::reStart();
        $this->echoResultMsg();

        // Configure Asterisk and start it
        $this->echoStartMsg(' - Configuring Asterisk...'.PHP_EOL);
        $pbx = new PBX();
        $pbx->configure();

        $this->echoStartMsg(' - Start Asterisk...');
        $pbx->start();
        $this->echoResultMsg();

        // Wait for Asterisk to fully boot and reload SIP settings
        $this->echoStartMsg(' - Wait asterisk fully booted...');
        $asteriskResult = PBX::waitFullyBooted();
        $this->echoResultMsg($asteriskResult);
        if($asteriskResult){
            $this->echoStartMsg(' - Reload SIP settings in AstDB...');
            $sip = new SIPConf();
            $sip->updateAsteriskDatabase();
            $this->echoResultMsg();
        }

        // Configure and restart cron tasks
        $this->echoStartMsg(' - Configuring Cron tasks...');
        $cron = new CronConf();
        $cron->reStart();
        $this->echoResultMsg();

        // Start the Nginx daemon
        $this->echoStartMsg(' - Start Nginx daemon...');
        $nginx = new NginxConf();
        $nginx->generateConf();
        $nginx->reStart();
        $this->echoResultMsg();

        // Log that all services are fully loaded if Asterisk is fully booted
        if($asteriskResult){
            $this->echoStartMsg(' - All services are fully loaded');
        }

        // Display network information
        $this->echoStartMsg(Network::getInfoMessage());

        $this->di->getShared(RegistryProvider::SERVICE_NAME)->booting = false;

        return true;
    }
}