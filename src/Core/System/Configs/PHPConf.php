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
use MikoPBX\Core\System\Util;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

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

    /**
     * Relocates PHP error log to the storage mount.
     *
     * @return void
     */
    public static function setupLog(): void
    {
        $src_log_file = '/var/log/php_error.log';
        $dst_log_file = self::getLogFile();
        if (! file_exists($src_log_file)) {
            file_put_contents($src_log_file, '');
        }
        $options = file_exists($dst_log_file) ? '>' : '';
        $cat = Util::which('cat');
        Processes::mwExec("$cat $src_log_file 2> /dev/null >$options $dst_log_file");
        Util::createUpdateSymlink($dst_log_file, $src_log_file);
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
        return "$logdir/error.log";
    }

    /**
     * Rotates the PHP error log.
     *
     * @return void
     */
    public static function logRotate(): void
    {
        $logrotate = Util::which('logrotate');

        $max_size    = 10;
        $f_name      = self::getLogFile();
        $text_config = $f_name . " {
    nocreate
    nocopytruncate
    compress
    delaycompress
    start 0
    rotate 9
    size {$max_size}M
    missingok
    noolddir
    postrotate
    endscript
}";
        // TODO::Add restart PHP-FPM after rotation
        $di     = Di::getDefault();
        if ($di !== null) {
            $varEtcDir = Directories::getDir(Directories::CORE_VAR_ETC_DIR);
        } else {
            $varEtcDir = '/var/etc';
        }
        $path_conf   = $varEtcDir . '/php_logrotate_' . basename($f_name) . '.conf';
        file_put_contents($path_conf, $text_config);
        $mb10 = $max_size * 1024 * 1024;

        $options = '';
        if (Util::mFileSize($f_name) > $mb10) {
            $options = '-f';
        }
        Processes::mwExecBg("$logrotate $options '$path_conf' > /dev/null 2> /dev/null");
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
        return $this->reStart();
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
        $binPath = Util::which(self::PROC_NAME);
        $busyboxPath = Util::which('busybox');
        $confPath = $this->getMainMonitConfFile();

        $this->startCommand = "$binPath -c ".self::CONF_PATH;
        $stopCommand = "/bin/sh -c '$busyboxPath kill -SIGQUIT `$busyboxPath cat /var/run/".self::PROC_NAME.".pid`'";

        $conf = 'check file php_timezone with path '.self::CONF_TIME_ZONE .PHP_EOL.
            'check process '.self::PROC_NAME.' with pidfile /var/run/'.self::PROC_NAME.'.pid'.PHP_EOL.
            '    depends on php_timezone'.PHP_EOL.
            '    start program = "'.$this->startCommand.'"'.PHP_EOL.
            '        as uid root and gid root'.PHP_EOL.
            '    stop program = "'.$stopCommand.'"'.PHP_EOL.
            '        as uid root and gid root';
        $this->saveFileContent($confPath, $conf);
        return true;
    }
}
