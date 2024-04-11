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

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
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
     * Check if the system is running in Docker
     *
     * @var bool
     */
    private bool $isDocker = false;


    /**
     * Check if the system is running from live cd
     *
     * @var bool
     */
    private bool $isRecoveryMode = false;


    /**
     * Constructor
     */
    public function __construct()
    {
        $this->isDocker = Util::isDocker();
        $this->isRecoveryMode = Util::isRecoveryMode();
    }


    /**
     * Echoes the starting message for a stage.
     *
     * @param string $message The message to echo.
     */
    private function echoStartMsg(string $message): void
    {
        SystemMessages::echoStartMsg($message);
        $this->stageMessage = $message;
    }

    /**
     * Echoes the result message for a stage.
     *
     * @param string $result The result of the stage.
     */
    private function echoResultMsg(string $result = SystemMessages::RESULT_DONE): void
    {
        SystemMessages::echoResultMsg($this->stageMessage, $result);
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
        if ($system->isDefaultConf() && !$this->isRecoveryMode) {
            $this->echoStartMsg(' - Try restore backup of settings... ');
            $system->tryRestoreConf();
            $this->echoResultMsg();
        }

        // Check if the system is running on T2SDELinux
        $itIsT2SDELinux = Util::isT2SdeLinux();

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
        if (!$this->isRecoveryMode) {
            $sentryConf = new SentryConf();
            $sentryConf->configure();
            $this->echoResultMsg();
        } else {
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }

        // Configure the system timezone
        $this->echoStartMsg(' - Configuring timezone...');
        if (!$this->isRecoveryMode) {
            System::timezoneConfigure();
            $this->echoResultMsg();
        } else {
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }

        // Mount the storage disk
        $storage = new Storage();
        if ($itIsT2SDELinux) {
            // Do not need to set on Docker or Debian linux
            $storage->saveFstab();
        }
        $storage->configure();
        $this->echoStartMsg(' - Mount storage disk...');
        $this->echoResultMsg();

        // Additional tasks for T2SDELinux
        if ($itIsT2SDELinux) {
            $this->echoStartMsg(' - Connect swap...');
            Processes::mwExecBg('/etc/rc/connect_swap');
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
        $this->echoStartMsg(' - Update configs and applications...' . PHP_EOL);
        $confUpdate = new UpdateSystemConfig();
        $confUpdate->updateConfigs();
        $this->echoStartMsg(' - Update configs...');
        $this->echoResultMsg();

        // Configure VM tools
        $this->echoStartMsg(' - Configuring VM tools...');
        if (!$this->isRecoveryMode) {
            $vmwareTools = new VmToolsConf();
            $resultVMTools = $vmwareTools->configure();
            $this->echoResultMsg((string)$resultVMTools);
        } else {
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }

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
        if ($this->isDocker) {
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
        if (!$this->isRecoveryMode) {
            NTPConf::configure();
            $this->echoResultMsg();
        } else {
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }

        // Do not need to set Debian SSH service
        if (!Util::isSystemctl()) {
            $this->echoStartMsg(' - Configuring SSH console...');
            $sshConf = new SSHConf();
            $resSsh = $sshConf->configure();
            $this->echoResultMsg((string)$resSsh);
        }

        // Start cloud provisioning
        if (!$this->isDocker && !$this->isRecoveryMode) {
            $this->echoStartMsg(' - Attempt to cloud provisioning...' . PHP_EOL);
            CloudProvisioning::start();
        } else {
            $this->echoStartMsg(' - Attempt to cloud provisioning...');
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }

        // Connect storage in a cloud if needed
        $this->echoStartMsg(' - Auto connect storage for a cloud ...');
        if (!$this->isDocker && !$this->isRecoveryMode) {
            $connectResult = Storage::connectStorageInCloud();
            $this->echoResultMsg($connectResult);
        } else {
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }

        // Update external IP if needed
        if (!$this->isRecoveryMode) {
            $this->echoStartMsg(' - Update external IP...');
            $network->updateExternalIp();
            $this->echoResultMsg();
        } else {
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
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
        $this->echoStartMsg(' - Configuring Asterisk...' . PHP_EOL);
        $pbx = new PBX();
        $pbx->configure();

        $this->echoStartMsg(' - Start Asterisk...');
        $pbx->start();
        $this->echoResultMsg();

        // Wait for Asterisk to fully boot and reload SIP settings
        $this->echoStartMsg(' - Wait asterisk fully booted...');
        $asteriskResult = PBX::waitFullyBooted();
        $this->echoResultMsg((string)$asteriskResult);
        if ($asteriskResult) {
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

        // Display network information
        $this->echoStartMsg(self::getInfoMessage());

        $this->di->getShared(RegistryProvider::SERVICE_NAME)->booting = false;

        return true;
    }

    /**
     * Retrieves the information message containing available web interface addresses.
     *
     * @return string The information message.
     */
    public static function getInfoMessage(): string
    {
        // Assuming a total width of 53 characters for each line
        $lineWidth = 53;

        $info = PHP_EOL . "┌────────────────────────────────────────────────┐";
        $info .= PHP_EOL . "│                                                │";
        $headerSpace = $lineWidth - 3 - 5; // 3 for "│    🌟 MikoPBX - All services are fully loaded 🌟 " and 5 for " │" at the end
        $headerLine = sprintf("│  %-{$headerSpace}s │", "🌟 MikoPBX - All services are fully loaded 🌟");
        $info .= PHP_EOL . $headerLine;
        $info .= PHP_EOL . "│                                                │";
        $info .= PHP_EOL . "├────────────────────────────────────────────────┤";

        $addresses = [
            'local' => [],
            'external' => []
        ];
        /** @var LanInterfaces $interface */
        $interfaces = LanInterfaces::find("disabled='0'");
        foreach ($interfaces as $interface) {
            if (!empty($interface->ipaddr)) {
                $addresses['local'][] = $interface->ipaddr;
            }
            if (!empty($interface->exthostname) && !in_array($interface->exthostname, $addresses['local'], true)) {
                $addresses['external'][] = explode(':', $interface->exthostname)[0] ?? '';
            }
            if (!empty($interface->extipaddr) && !in_array($interface->extipaddr, $addresses['local'], true)) {
                $addresses['external'][] = explode(':', $interface->extipaddr)[0] ?? '';
            }
        }
        unset($interfaces);


        // Local network
        $port = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_HTTPS_PORT);
        $info .= PHP_EOL . "│                                                │";
        $headerSpace = $lineWidth - 13 - 1; // 13 for "│    🌐 Web Interface Access 🌐 " and 1 for " │"
        $headerLine = sprintf("│            %-{$headerSpace}s │", "🌐 Web Interface Access 🌐");
        $info .= PHP_EOL . $headerLine;
        $info .= PHP_EOL . "│                                                │";
        $info .= PHP_EOL . "│    Local Network Address:                      │";

        $addressSpace = $lineWidth - 7 - 5; // 7 for "│    ➜ " and 5 for " │" at the end
        foreach ($addresses['local'] as $address) {
            if (empty($address)) {
                continue;
            }
            $formattedAddress = $port === '443' ? "https://$address" : "https://$address:$port";
            // Use sprintf to format the string with padding to ensure constant length
            $info .= PHP_EOL . sprintf("│    ➜ %-{$addressSpace}s │", $formattedAddress);

        }
        $info .= PHP_EOL . "│                                                │";

        // External web address info
        if (!empty($addresses['external'])) {
            $info .= PHP_EOL . "│    External Network Address:                   │";
            foreach ($addresses['external'] as $address) {
                if (empty($address)) {
                    continue;
                }
                $formattedAddress = $port === '443' ? "https://$address" : "https://$address:$port";
                // Use sprintf to format the string with padding to ensure constant length
                $info .= PHP_EOL . sprintf("│    ➜ %-{$addressSpace}s │", $formattedAddress);

            }
            $info .= PHP_EOL . "│                                                │";
        }

        // Default web user info
        $cloudInstanceId = PbxSettings::getValueByKey(PbxSettingsConstants::CLOUD_INSTANCE_ID);
        $webAdminPassword = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_PASSWORD);
        $defaultPassword = PbxSettings::getDefaultArrayValues()[PbxSettingsConstants::WEB_ADMIN_PASSWORD];
        if ($cloudInstanceId === $webAdminPassword || $webAdminPassword === $defaultPassword) {
            $adminUser = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_LOGIN);

            $credentialSpace = $lineWidth - 5 - 3; // 5 for "│    🔑 Default Credentials: " and 3 for " │"
            $credentialLine = sprintf("│    %-{$credentialSpace}s │", "🔑 Default web credentials:");
            $info .= PHP_EOL . $credentialLine;
            // Login
            $loginSpace = $lineWidth - 12 - 5; // 12 for "│    Login: " and 5 for " │" at the end
            $loginLine = sprintf("│    Login: %-{$loginSpace}s │", $adminUser); // Format the login line
            $info .= PHP_EOL . $loginLine;

            // Password
            $passwordSpace = $lineWidth - 15 - 5; // 15 for "│    Password: " and 5 for " │" at the end
            $passwordLine = sprintf("│    Password: %-{$passwordSpace}s │", $cloudInstanceId); // Format the password line
            $info .= PHP_EOL . $passwordLine;
        }
        $info .= PHP_EOL . "└────────────────────────────────────────────────┘" . PHP_EOL . PHP_EOL;
        return $info;
    }
}