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
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;

/**
 * Class PHPConf
 *
 * Represents the PHP configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class PHPConf extends SystemConfigClass
{
    public const string PROC_NAME = 'php-fpm';
    private const string CONF_PATH = '/etc/php.ini';
    private const string CONF_TIME_ZONE = '/etc/php.d/01-timezone.ini';

    public function __construct()
    {
        parent::__construct();
        $binPath = Util::which(self::PROC_NAME);
        $this->startCommand = "$binPath -c ".self::CONF_PATH;
    }

    /**
     * Returns the PHP error log file path.
     *
     * @return string The log file path.
     */
    public static function getLogFile(): string
    {
        $logdir = Directories::getDir(Directories::CORE_LOGS_DIR) . '/php';
        Util::mwMkdir($logdir);
        return "$logdir/php-error.log";
    }

    /**
     * Generates the rsyslog configuration for PHP logging.
     * Creates /etc/rsyslog.d/php.conf to redirect PHP logs to a separate file.
     *
     * @return void
     */
    public static function generateSyslogConf(): void
    {
        Util::mwMkdir('/etc/rsyslog.d');
        $logFile = self::getLogFile();
        $pathScript = SyslogConf::createRotateScript('php-error.log', $logFile);
        $confSyslogD = '$outchannel log_php,' . $logFile . ',10485760,' . $pathScript . PHP_EOL .
            'if $programname == "php" then :omfile:$log_php' . PHP_EOL .
            'if $programname == "php" then stop' . PHP_EOL;
        file_put_contents('/etc/rsyslog.d/php.conf', $confSyslogD);
    }

    /**
     * Removes legacy PHP log symlink.
     * Called during syslog restart to clean up old configuration.
     *
     * @return void
     */
    public static function removeLegacyLogSymlink(): void
    {
        $legacySymlink = '/var/log/php_error.log';
        if (is_link($legacySymlink)) {
            unlink($legacySymlink);
        } elseif (file_exists($legacySymlink)) {
            unlink($legacySymlink);
        }
    }

    /**
     * Sets up the timezone for PHP.
     *
     * @return void
     */
    public static function phpTimeZoneConfigure(): void
    {
        $timezone      = PbxSettings::getValueByKey(PbxSettings::PBX_TIMEZONE);
        date_default_timezone_set($timezone);
        if (file_exists('/etc/TZ')) {
            $cat = Util::which('cat');
            Processes::mwExec("export TZ='$($cat /etc/TZ)'");
        }
        file_put_contents(self::CONF_TIME_ZONE, 'date.timezone="' . $timezone . '"');
    }

    /**
     * Start the service.
     *
     * @return bool True if successful, false otherwise.
     */
    public function start(): bool
    {
        if(System::isBooting()){
            Processes::mwExecBg($this->startCommand);
            $result = $this->monitWaitStart();
        }else{
            $result = $this->reStart();
        }
        return $result;
    }

    /**
     * Restarts php-fpm.
     *
     * @return bool
     */
    public function reStart(): bool
    {
        $this->generateMonitConf();
        return $this->monitRestart();
    }

    /**
     * Generates the Monit configuration file for monitoring the current service.
     *
     * This method constructs a Monit configuration entry that defines:
     * - The process name and PID file path
     * - Start command using the binary with configuration parameter
     * - Stop command using SIGTERM via BusyBox
     * - Execution permissions (as root user/group)
     *
     * The configuration is saved to a file in the Monit configuration directory,
     * with a filename generated based on the service priority and name.
     *
     * @return bool Always returns true after successfully writing the configuration file.
     */
    public function generateMonitConf(): bool
    {
        $busyboxPath = Util::which('busybox');
        $confPath = $this->getMainMonitConfFile();

        $stopCommand = "/bin/sh -c '$busyboxPath kill -SIGQUIT `$busyboxPath cat /var/run/".self::PROC_NAME.".pid`'";

        $conf = 'check process '.self::PROC_NAME.' with pidfile /var/run/'.self::PROC_NAME.'.pid'.PHP_EOL.
            '    start program = "'.$this->startCommand.'"'.PHP_EOL.
            '        as uid root and gid root'.PHP_EOL.
            '    stop program = "'.$stopCommand.'"'.PHP_EOL.
            '        as uid root and gid root';
        $this->saveFileContent($confPath, $conf);
        return true;
    }
}
