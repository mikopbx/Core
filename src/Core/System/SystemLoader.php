<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Common\Providers\ModulesDBConnectionsProvider;
use MikoPBX\Core\Asterisk\Configs\Generators\CodecSync;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\System\Configs\ACPIDConf;
use MikoPBX\Core\System\Configs\BeanstalkConf;
use MikoPBX\Core\System\Configs\CronConf;
use MikoPBX\Core\System\Configs\DnsConf;
use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Configs\GeoIP2Conf;
use MikoPBX\Core\System\Configs\IptablesConf;
use MikoPBX\Core\System\Configs\MonitConf;
use MikoPBX\Core\System\Configs\NTPConf;
use MikoPBX\Core\System\Configs\NatsConf;
use MikoPBX\Core\System\Configs\NginxConf;
use MikoPBX\Core\System\Configs\PbxConf;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\System\Configs\RedisConf;
use MikoPBX\Core\System\Configs\SSHConf;
use MikoPBX\Core\System\Configs\SentryConf;
use MikoPBX\Core\System\Configs\SyslogConf;
use MikoPBX\Core\System\Configs\VmToolsConf;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Core\System\Upgrade\UpdateSystemConfig;
use MikoPBX\Common\Models\PbxSettings;
use Phalcon\Di\Injectable;

/**
 * SystemLoader class
 *
 * This class is responsible for loading the system services.
 *
 * @package MikoPBX\Core\System
 * @property \Phalcon\Config\Config config
 */
class SystemLoader extends Injectable
{
    /**
     * Message displayed during the start of a stage.
     *
     * @var string
     */
    private string $stageMessage = '';

    /**
     * Time when the current stage started (hrtime in nanoseconds for monotonic timing)
     *
     * @var int
     */
    private int $stageStartTime = 0;

    /**
     * Time when the system startup began (hrtime in nanoseconds for monotonic timing)
     *
     * @var int
     */
    private int $systemStartTime = 0;

    /**
     * Check if the system is running in Docker
     *
     * @var bool
     */
    private bool $isDocker;


    /**
     * Check if the system is running from live cd
     *
     * @var bool
     */
    private bool $isRecoveryMode;


    /**
     * Constructor
     */
    public function __construct()
    {
        $this->isDocker = System::isDocker();
        $this->isRecoveryMode = Util::isRecoveryMode();

        // Read system boot start time from file, fallback to current time if not available
        // Uses hrtime (monotonic clock) to avoid issues with NTP time synchronization
        $bootTimeFile = '/tmp/system_boot_start_time';
        if (file_exists($bootTimeFile)) {
            $this->systemStartTime = (int)file_get_contents($bootTimeFile);
        } else {
            $this->systemStartTime = hrtime(true);
        }
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
        $this->stageStartTime = hrtime(true);
    }

    /**
     * Echoes the result message for a stage.
     *
     * @param string $result The result of the stage.
     */
    private function echoResultMsg(string $result = SystemMessages::RESULT_DONE): void
    {
        // Only calculate elapsed time if we have a valid start time
        // Convert nanoseconds to seconds with 2 decimal places
        $elapsedTime = 0.0;
        if ($this->stageStartTime > 0) {
            $elapsedTime = round((hrtime(true) - $this->stageStartTime) / 1_000_000_000, 2);
        }
        SystemMessages::echoResultMsgWithTime($this->stageMessage, $result, $elapsedTime);
        $this->stageMessage = '';
        $this->stageStartTime = 0;
    }

    /**
     * Detect and update the environment type (Docker, VM, Cloud, Bare Metal).
     *
     * Uses pbx-env-detect script as the single source of truth for environment detection.
     * Updates VIRTUAL_HARDWARE_TYPE in database with the detected value.
     *
     * @return string The detected environment type
     */
    private function detectEnvironment(): string
    {
        $pbxEnvDetect = '/sbin/pbx-env-detect';
        $envType = 'Bare Metal';

        if (file_exists($pbxEnvDetect) && is_executable($pbxEnvDetect)) {
            // Invalidate stale cache created during early boot (DMI may not have been ready)
            $cacheFile = '/etc/.pbx_env_info';
            if (file_exists($cacheFile)) {
                unlink($cacheFile);
            }

            $envOutput = [];
            Processes::mwExec("$pbxEnvDetect --type 2>/dev/null", $envOutput);
            $detectedType = strtolower(trim(implode('', $envOutput)));

            // Map detected type to display name
            $envType = match ($detectedType) {
                'docker' => 'Docker',
                'vmware' => 'VMware',
                'vbox' => 'VirtualBox',
                'kvm' => 'KVM',
                'qemu' => 'QEMU',
                'xen' => 'Xen',
                'baremetal' => 'Bare Metal',
                'virtual' => 'Virtual Machine',
                default => ucfirst($detectedType) ?: 'Bare Metal',
            };
        }

        // Update the setting in database
        $currentValue = PbxSettings::getValueByKey(PbxSettings::VIRTUAL_HARDWARE_TYPE);
        if ($currentValue !== $envType) {
            PbxSettings::setValueByKey(PbxSettings::VIRTUAL_HARDWARE_TYPE, $envType);
        }

        return $envType;
    }

    /**
     * Starts the system services.
     *
     * @return bool True on success, false otherwise.
     */
    public function startSystem(): bool
    {
        // Is the configuration default?
        // Try restore config...
        $systemConfiguration = new SystemConfiguration();
        if ($systemConfiguration->isDefaultConf() && !$this->isRecoveryMode) {
            $this->echoStartMsg(' - Restoring settings backup...');
            $systemConfiguration->tryRestoreConf();
            $this->echoResultMsg();
        }

        // Check if the system is running on T2SDELinux
        $itIsT2SDELinux = Util::isT2SdeLinux();

        // Mark the registry as booting
        System::setBooting(true);

        // Configure loopback interface BEFORE Redis starts
        // Redis binds to 127.0.0.1 and needs loopback to be UP
        // Full network configuration happens later (after Redis) as it needs cache
        $this->echoStartMsg(' - Configuring loopback interface...');
        $network = new Network();
        $network->loConfigure();
        $this->echoResultMsg();

        // Apply port overrides BEFORE Redis/Beanstalkd start.
        // Docker ENV variables like REDIS_PORT, BEANSTALK_PORT update the JSON config
        // that these services read on startup. No ORM/Redis dependency.
        if (!$this->isRecoveryMode) {
            CloudProvisioning::applyEarlyOverrides();
            // Recreate config provider so services read the updated JSON,
            // not the stale DI cache from SystemConfiguration constructor (#982)
            ConfigProvider::recreateConfigProvider();
        }

        $this->echoStartMsg(' - Starting redis daemon...');
        $redisConf = new RedisConf();
        $redisStatus = $redisConf->start();
        $this->echoResultMsg($redisStatus ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);

        if (!$this->isDocker && System::isAMD64()) {
            // Wait start the ACPID daemon
            $this->echoStartMsg(' - Waiting for acpid daemon...');
            $ACPIDConf = new ACPIDConf();
            $ACPIDConf->start();
            $this->echoResultMsg($ACPIDConf->monitWaitStart() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);
        }
        // Start the Beanstalkd daemon
        $this->echoStartMsg(' - Starting beanstalkd daemon...');
        $beanstalkConf = new BeanstalkConf();
        $beanstalkConf->start();
        $this->echoResultMsg($beanstalkConf->monitWaitStart() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);
        // Configure Sentry error logger
        $this->echoStartMsg(' - Configuring sentry error logger...');
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

        // Configure locales UTF-8
        $this->echoStartMsg(' - Updating locales...');
        System::setupLocales();
        $this->echoResultMsg();

        // Mount the storage disk
        $storage = new Storage();
        if ($itIsT2SDELinux) {
            // Do not need to set on Docker or Debian linux
            $storage->saveFstab();
        }
        $this->echoStartMsg(' - Mounting storage disk...');
        $storage->configure();
        $this->echoResultMsg();

         // Recreate database connections
         $this->echoStartMsg(' - Recreating modules database connections...');
         ModulesDBConnectionsProvider::recreateModulesDBConnections();
         $this->echoResultMsg();

        // Additional tasks for T2SDELinux
        if ($itIsT2SDELinux) {
            $this->echoStartMsg(' - Connecting swap...');
            Processes::mwExecBg('/etc/rc/connect_swap');
            $this->echoResultMsg();
        }

        // Start the syslog daemon
        $this->echoStartMsg(' - Starting syslogd daemon...');
        $syslogConf = new SyslogConf();
        $syslogStatus = $syslogConf->start();
        $this->echoResultMsg($syslogStatus ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);

        // Update the database structure
        $this->echoStartMsg(' - Updating database structure...');
        $dbUpdater = new UpdateDatabase();
        $dbUpdater->updateDatabaseStructure();
        if ($dbUpdater->isTheFirstMessage){
            $this->echoResultMsg();
        }

        // Create directories required by modules after DB upgrade
        $this->echoStartMsg(' - Creating modules links and folders...');
        $storage->createWorkDirsAfterDBUpgrade();
        $this->echoResultMsg();

        // Validate enabled modules for compatibility issues
        $this->echoStartMsg(' - Validating enabled modules...');
        \MikoPBX\Modules\PbxExtensionUtils::validateEnabledModules();
        $this->echoResultMsg();

        // Update the system configuration and applications
        $this->echoStartMsg(' - Updating system configuration...');
        $confUpdate = new UpdateSystemConfig();
        $confUpdate->updateConfigs();
        if ($confUpdate->isTheFirstMessage){
            $this->echoResultMsg();
        }
        
        if (!$this->isDocker && !$this->isRecoveryMode) {
            // Configure VM tools
            $this->echoStartMsg(' - Configuring VM tools...');
            $vmwareTools = new VmToolsConf();
            $this->echoResultMsg($vmwareTools->start() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);
        }

        // Configure the system hostname
        $this->echoStartMsg(' - Configuring hostname...');
        $network = new Network();
        $network->hostnameConfigure();
        $this->echoResultMsg();

        // Generate resolv.conf
        $this->echoStartMsg(' - Configuring DNS service...');
        $dnsConf = new DnsConf();
        $dnsConf->resolveConfGenerate($network->getHostDNS());
        $this->echoResultMsg($dnsConf->start() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);

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

        $this->echoStartMsg(' - Configuring Fail2ban...');
        $fail2ban = new Fail2BanConf();
        $this->echoResultMsg($fail2ban->start() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);

        // Configure NTP
        $this->echoStartMsg(' - Configuring ntpd...');
        if (!$this->isDocker && !$this->isRecoveryMode) {
            $ntpConf = new NTPConf();
            $this->echoResultMsg($ntpConf->start() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);
        } else {
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }

        // Start cloud provisioning BEFORE SSH so SSH keys are available
        // Redis is already running at this point, so ORM can be used
        if (!$this->isRecoveryMode) {
            $cloudResult = CloudProvisioning::start();

            // Show result with informative message
            if ($cloudResult['success']) {
                if (isset($cloudResult['alreadyDone'])) {
                    $this->echoStartMsg(' - Cloud provisioning (already configured)...');
                } else {
                    $this->echoStartMsg(' - Cloud provisioning on ' . $cloudResult['cloudId'] . '...');
                }
                $this->echoResultMsg(SystemMessages::RESULT_DONE);
            } else {
                $this->echoStartMsg(' - Cloud provisioning...');
                $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
            }
        } else {
            $this->echoStartMsg(' - Cloud provisioning...');
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }

        // Detect and update environment type (Docker, VM, Cloud, Bare Metal)
        // Runs after cloud provisioning which may set VIRTUAL_HARDWARE_TYPE
        if (!$this->isRecoveryMode) {
            $envType = $this->detectEnvironment();
            $this->echoStartMsg(" - Detecting environment ($envType)...");
            $this->echoResultMsg(SystemMessages::RESULT_DONE);
        } else {
            $this->echoStartMsg(' - Detecting environment...');
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }

        // SSH starts AFTER cloud provisioning so authorized keys are already in database
        $this->echoStartMsg(' - Configuring SSH console...');
        $sshConf = new SSHConf();
        $this->echoResultMsg($sshConf->start() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);

        // Connect storage in a cloud if needed
        $this->echoStartMsg(' - Connecting cloud storage...');
        if (!$this->isDocker && !$this->isRecoveryMode) {
            $connectResult = Storage::connectStorageInCloud();
            $this->echoResultMsg($connectResult);
        } else {
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }

        // Update external IP if needed
        $this->echoStartMsg(' - Updating external IP...');
        if (!$this->isRecoveryMode) {
            $network->updateExternalIp();
            $this->echoResultMsg();
        } else {
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }

        // Extract GeoIP2 database to storage
        $this->echoStartMsg(' - Extracting GeoIP2 database...');
        if (!$this->isRecoveryMode) {
            $geoip2Conf = new GeoIP2Conf();
            $this->echoResultMsg($geoip2Conf->start() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_SKIPPED);
        } else {
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }

        // Apply user-created custom files (after Redis is started)
        $this->echoStartMsg(' - Applying user-created custom files...');
        if (!$this->isRecoveryMode) {
            CustomFilesApplier::initializeOnBoot();
            $this->echoResultMsg();
        } else {
            $this->echoResultMsg(SystemMessages::RESULT_SKIPPED);
        }
        return true;
    }

    /**
     * Load Asterisk and Web interface
     *
     * @return bool
     */
    public function startMikoPBX(): bool
    {

        // Start the NATS queue daemon
        $this->echoStartMsg(' - Starting nats queue daemon...');
        $natsConf = new NatsConf();
        $natsStatus = $natsConf->start();
        $this->echoResultMsg($natsStatus ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);

        // Start the PHP-FPM daemon
        $this->echoStartMsg(' - Starting php-fpm daemon...');
        $phpConf = new PHPConf();
        $this->echoResultMsg($phpConf->start() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);

        // Configure Asterisk and start it
        $this->echoStartMsg(' - Initializing Asterisk configuration' . PHP_EOL);
        $pbx = new PbxConf();
        $pbx->configure();

        $this->echoStartMsg(' - Starting Asterisk...');
        $this->echoResultMsg($pbx->start() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);

        // Wait for Asterisk to fully boot and reload SIP settings
        $this->echoStartMsg(' - Waiting for Asterisk to fully boot...');
        $asteriskResult = PbxConf::waitFullyBooted();
        $this->echoResultMsg($asteriskResult ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);
        if ($asteriskResult) {
            // Synchronize codec database with Asterisk's available codecs
            // This runs once at boot after Asterisk is fully started
            $this->echoStartMsg(' - Synchronizing codec database...');
            $codecStats = CodecSync::syncCodecsWithAsterisk();
            $totalChanges = $codecStats['added'] + $codecStats['deleted'];
            $this->echoResultMsg($totalChanges > 0 ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_SKIPPED);

            // Always reload SIP configuration after codec sync
            // This ensures codec list is applied to config even if no changes occurred
            $this->echoStartMsg(' - Reloading SIP configuration with codecs' . PHP_EOL);
            SIPConf::reload();
           

            $this->echoStartMsg(' - Reloading SIP settings in AstDB...');
            $sip = new SIPConf();
            $sip->updateAsteriskDatabase();
            $this->echoResultMsg(SystemMessages::RESULT_DONE);
        }
        // Configure and restart cron tasks
        $this->echoStartMsg(' - Configuring Cron tasks...');
        $cron = new CronConf();
        $this->echoResultMsg($cron->start() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);

        // Start the Nginx daemon
        $this->echoStartMsg(' - Starting Nginx daemon...');
        $nginx = new NginxConf();
        $this->echoResultMsg($nginx->start() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);

        // Update Docker network filters configurations
        if ($this->isDocker) {
            $this->echoStartMsg(' - Updating Docker network filters configurations...');
            DockerNetworkFilterService::updateAllConfigurations();
            $this->echoResultMsg();
        }

        // Start the monit daemon
        $this->echoStartMsg(' - Starting monit daemon...');
        $monit = new MonitConf();
        $this->echoResultMsg($monit->start() ? SystemMessages::RESULT_DONE : SystemMessages::RESULT_FAILED);


        System::setBooting(false);

        // Calculate total startup time using monotonic clock
        // Convert nanoseconds to seconds with 1 decimal place
        $totalTime = round((hrtime(true) - $this->systemStartTime) / 1_000_000_000, 1);
        $message = PHP_EOL . " - System startup completed in {$totalTime}s" . PHP_EOL;
        SystemMessages::echoToTeletype($message, true);
        
        // Clean up boot time file
        $bootTimeFile = '/tmp/system_boot_start_time';
        if (file_exists($bootTimeFile)) {
            unlink($bootTimeFile);
        }

        // Display network information
        $headerMessage = "All services are fully loaded welcome";
        $welcomeMessage = SystemMessages::getInfoMessage($headerMessage, true);
        $this->echoStartMsg($welcomeMessage);

        if (!$this->isDocker) {
            // Display the console menu info
            $message =  PHP_EOL . PHP_EOL . 'Run /etc/rc/console_menu if you want to start the console menu...' . PHP_EOL;
            SystemMessages::echoToTeletype($message);
        }

        return true;
    }
}
