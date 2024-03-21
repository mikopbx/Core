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

namespace MikoPBX\Core\System\Configs;


use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use Phalcon\Di;
use Phalcon\Di\Injectable;

/**
 * Class PHPConf
 *
 * Represents the PHP configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class PHPConf extends Injectable
{

    /**
     * Relocates PHP error log to the storage mount.
     *
     * @return void
     */
    public static function setupLog(): void
    {
        $src_log_file = '/var/log/php_error.log';
        $dst_log_file = self::getLogFile();
        if ( ! file_exists($src_log_file)) {
            file_put_contents($src_log_file, '');
        }
        $options = file_exists($dst_log_file) ? '>' : '';
        $catPath = Util::which('cat');
        Processes::mwExec("{$catPath} {$src_log_file} 2> /dev/null >{$options} {$dst_log_file}");
        Util::createUpdateSymlink($dst_log_file, $src_log_file);
    }


    /**
     * Returns the PHP error log file path.
     *
     * @return string The log file path.
     */
    public static function getLogFile(): string
    {
        $logdir = System::getLogDir() . '/php';
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
        $logrotatePath = Util::which('logrotate');

        $max_size    = 10;
        $f_name      = self::getLogFile();
        $text_config = $f_name . " {
    nocreate
    nocopytruncate
    delaycompress
    nomissingok
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
        if ($di !== null){
            $varEtcDir = $di->getConfig()->path('core.varEtcDir');
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
        Processes::mwExecBg("{$logrotatePath} {$options} '{$path_conf}' > /dev/null 2> /dev/null");
    }

    /**
     * Sets up the timezone for PHP.
     *
     * @return void
     */
    public static function phpTimeZoneConfigure(): void
    {
        $timezone      = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_TIMEZONE);
        date_default_timezone_set($timezone);
        if (file_exists('/etc/TZ')) {
            $catPath = Util::which('cat');
            Processes::mwExec("export TZ='$({$catPath} /etc/TZ)'");
        }
        $etcPhpIniPath = '/etc/php.d/01-timezone.ini';
        $contents = 'date.timezone="'.$timezone.'"';
        file_put_contents($etcPhpIniPath, $contents);
    }

    /**
     * Restarts php-fpm.
     *
     * @return void
     */
    public static function reStart(): void
    {
        $phpFPMPath = Util::which('php-fpm');

        // Send graceful shutdown signal
        Processes::mwExec('kill -SIGQUIT "$(cat /var/run/php-fpm.pid)"');
        usleep(100000);

        // Forcefully terminate
        Processes::killByName('php-fpm');
        Processes::mwExec("{$phpFPMPath} -c /etc/php.ini");
    }
}