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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use MikoPBX\Modules\Config\SystemConfigInterface;

/**
 * Class CronConf
 *
 * Represents the Cron configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class CronConf extends SystemConfigClass
{
    public const string PROC_NAME = 'crond';

    public function __construct()
    {
        parent::__construct();
        $busyboxPath = Util::which('busybox');
        $binPath = Util::which(self::PROC_NAME);
        $options = "-f -S -l 0";
        $this->startCommand = "/bin/sh -c '$busyboxPath nohup $binPath $options > /dev/null 2>&1 & $busyboxPath echo $! > /var/run/".self::PROC_NAME.".pid'";
    }

    /**
     * Start the service.
     *
     * @return bool True if successful, false otherwise.
     */
    public function start(): bool
    {
        $booting = System::isBooting();
        if($booting){
            $this->generateConfig($booting);
            Processes::mwExecBg($this->startCommand);
            $result = $this->monitWaitStart();
        }else{
            $result = $this->reStart();
        }
        return $result;
    }

    /**
     * Setups cron and restarts it.
     *
     * @return bool Returns 0 on success.
     */
    public function reStart(): bool
    {
        $booting = System::isBooting();
        $this->generateConfig($booting);

        $this->generateMonitConf();
        return $this->monitRestart();
    }

    /**
     * Generates a Monit configuration file for the current system service.
     *
     * This method creates a Monit configuration entry to monitor, start and stop the service.
     * The generated config includes:
     * - PID file path definition
     * - Start command with background execution and PID saving
     * - Stop command using busybox killall
     * - Execution permissions (as root user/group)
     *
     * The configuration is saved to the default Monit configuration directory.
     *
     * @return bool Always returns true after writing the configuration file.
     */
    public function generateMonitConf(): bool{

        $confPath = $this->getMainMonitConfFile();
        $busyboxPath = Util::which('busybox');
        $conf = 'check process '.self::PROC_NAME.' with pidfile /var/run/'.self::PROC_NAME.'.pid '.PHP_EOL.
            '    start program = "'.$this->startCommand.'"'.PHP_EOL.
            '        as uid root and gid root'.PHP_EOL.
            '    stop program = "'.$busyboxPath.' killall '.self::PROC_NAME.'"'.PHP_EOL.
            '        as uid root and gid root';
        $this->saveFileContent($confPath, $conf);
        return true;
    }

    /**
     * Generates crontab config.
     *
     * @param bool $boot Indicates whether the config is generated during boot.
     */
    private function generateConfig(bool $boot = true): void
    {
        $mast_have     = [];
        $cron_filename = '/var/spool/cron/crontabs/root';

        $workerSafeScriptsPath = Util::getFilePathByClassName(WorkerSafeScriptsCore::class);
        $phpPath               = Util::which('php');
        $WorkerSafeScripts     = "$phpPath -f $workerSafeScriptsPath start > /dev/null 2> /dev/null";

        $restart_night =  PbxSettings::getValueByKey(PbxSettings::RESTART_EVERY_NIGHT);
        $auto_update_external_ip =  PbxSettings::getValueByKey(PbxSettings::AUTO_UPDATE_EXTERNAL_IP);
        $asterisk  = Util::which(PbxConf::PROC_NAME);
        $ntpd      = Util::which('ntpd');
        $dump      = Util::which('dump-conf-db');
        $checkIpPath   = Util::which('check-out-ip');
        $recordsCleaner = Util::which('records-cleaner');
        $cleanerLinks  = Util::which('cleanup-stale');

        // Restart every night if enabled
        if ($restart_night === '1') {
            $mast_have[] = '0 1 * * * ' . $asterisk . ' -rx"core restart now" > /dev/null 2> /dev/null' . PHP_EOL;
        }

        if (!Util::isDocker()){
            // Update NTP time every 5 minutes
            $mast_have[] = '*/5 * * * * ' . $ntpd . ' -q > /dev/null 2> /dev/null' . PHP_EOL;
        }

        // Perform database dump every 5 minutes
        $mast_have[] = '*/5 * * * * ' . "$dump > /dev/null 2> /dev/null" . PHP_EOL;
        
        // Clearing outdated conversation records
        $mast_have[] = '*/30 * * * * ' . "$recordsCleaner > /dev/null 2> /dev/null" . PHP_EOL;

        if ($auto_update_external_ip === '1') {
            // Check IP address every minute
            $mast_have[] = '*/1 * * * * ' . "$checkIpPath > /dev/null 2> /dev/null" . PHP_EOL;
        }

        // Clean download links every 6 minutes
        $mast_have[] = '*/6 * * * * ' . "$cleanerLinks > /dev/null 2> /dev/null" . PHP_EOL;

        // Run WorkerSafeScripts every minute
        $mast_have[] = '*/1 * * * * ' . $WorkerSafeScripts . PHP_EOL;

        // Add additional modules includes
        $tasks = [];
        PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::CREATE_CRON_TASKS, [&$tasks]);
        $conf = implode('', array_merge($mast_have, $tasks));

        // Execute WorkerSafeScripts during boot if enabled
        if ($boot === true) {
            Processes::mwExecBg($WorkerSafeScripts);
        }

        // Write the generated config to the cron file
        Util::fileWriteContent($cron_filename, $conf);
    }

    /**
     * Generate additional syslog rules.
     * @return void
     */
    public static function generateSyslogConf(): void
    {
        Util::mwMkdir('/etc/rsyslog.d');
        $log_file       = SyslogConf::getSyslogFile(self::PROC_NAME);
        $pathScript     = SyslogConf::createRotateScript(self::PROC_NAME);
        $confSyslogD = '$outchannel log_' . self::PROC_NAME . ',' . $log_file . ',10485760,' . $pathScript . PHP_EOL .
            'if $programname == "' . self::PROC_NAME . '" then :omfile:$log_' . self::PROC_NAME . PHP_EOL .
            'if $programname == "' . self::PROC_NAME . '" then stop' . PHP_EOL;
        file_put_contents('/etc/rsyslog.d/' . self::PROC_NAME . '.conf', $confSyslogD);
    }
}
