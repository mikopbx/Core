<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Core\System\Configs;


use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use Phalcon\Di;
use Phalcon\Di\Injectable;

class PHPConf extends Injectable
{

    /**
     * Relocate PHP error log to storage mount
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
        Util::mwExec("{$catPath} {$src_log_file} 2> /dev/null >{$options} {$dst_log_file}");
        Util::createUpdateSymlink($dst_log_file, $src_log_file);
    }


    /**
     * Returns php error log filepath
     * @return string
     */
    public static function getLogFile(): string
    {
        $logdir = System::getLogDir() . '/php';
        Util::mwMkdir($logdir);
        return "$logdir/error.log";
    }

    /**
     * Rotate php error log
     */
    public static function rotateLog(): void
    {
        $logrotatePath = Util::which('logrotate');

        $max_size    = 2;
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
        // TODO::Доделать рестарт PHP-FPM после обновление лога
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
        Util::mwExecBg("{$logrotatePath} {$options} '{$path_conf}' > /dev/null 2> /dev/null");
    }

    /**
     * Setup timezone for PHP
     */
    public static function phpTimeZoneConfigure(): void
    {
        $timezone      = PbxSettings::getValueByKey('PBXTimezone');
        date_default_timezone_set($timezone);
        if (file_exists('/etc/TZ')) {
            $catPath = Util::which('cat');
            Util::mwExec("export TZ='$({$catPath} /etc/TZ)'");
        }
        $etcPhpIniPath = '/etc/php.d/01-timezone.ini';
        $contents = 'date.timezone="'.$timezone.'"';
        file_put_contents($etcPhpIniPath, $contents);
    }

    /**
     *   Restart php-fpm
     **/
    public static function reStart(): void
    {
        if (Util::isSystemctl()) {
            $systemCtrlPath = Util::which('systemctl');
            Util::mwExec("{$systemCtrlPath} restart php7.4-fpm");
        } else {
            $phpFPMPath = Util::which('php-fpm');
            // Отправляем запрос на graceful shutdown;
            Util::mwExec('kill -SIGQUIT "$(cat /var/run/php-fpm.pid)"');
            usleep(100000);
            // Принудительно завершаем.
            Util::killByName('php-fpm');
            Util::mwExec("{$phpFPMPath} -c /etc/php.ini");
        }
    }
}