<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Core\System;


use Phalcon\Di;

class DateTime
{
    private $di;
    private MikoPBXConfig $mikoPBXConfig;

    /**
     * DateTime constructor.
     */
    public function __construct()
    {
        $this->di            = Di::getDefault();
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Setup system time
     *
     * @param $date - 2015.12.31-01:01:20
     *
     * @return array
     */
    public static function setDate($date): array
    {
        $result = [
            'result' => 'ERROR',
        ];
        // Преобразование числа к дате. Если необходимо.
        $date = Util::numberToDate($date);
        // Валидация даты.
        $re_date = '/^\d{4}\.\d{2}\.\d{2}\-\d{2}\:\d{2}\:\d{2}$/';
        preg_match_all($re_date, $date, $matches, PREG_SET_ORDER, 0);
        if (count($matches) > 0) {
            $result['result'] = 'Success';
            $arr_data         = [];
            $datePath         = Util::which('date');
            Util::mwExec("{$datePath} -s '{$date}'", $arr_data);
            $result['data'] = implode($arr_data);
        } else {
            $result['result'] = 'Success';
            $result['data']   = 'Update timezone only.';
        }

        $sys = new self();
        $sys->timezoneConfigure();

        return $result;
    }


    /**
     * Populates /etc/TZ with an appropriate time zone
     */
    public function timezoneConfigure(): void
    {
        $timezone = $this->mikoPBXConfig->getTimeZone();

        // include('timezones.php'); TODO:: Удалить и сам файл?
        @unlink("/etc/TZ");
        @unlink("/etc/localtime");

        if ($timezone) {
            $zone_file = "/usr/share/zoneinfo/{$timezone}";
            if ( ! file_exists($zone_file)) {
                return;
            }
            $cpPath = Util::which('cp');
            Util::mwExec("{$cpPath}  {$zone_file} /etc/localtime");
            file_put_contents('/etc/TZ', $timezone);
            putenv("TZ={$timezone}");
            Util::mwExec("export TZ;");
        }

        $this->ntpDaemonConfigure();
        self::phpTimeZoneConfigure();
    }

    /**
     * Setup ntp daemon
     */
    private function ntpDaemonConfigure(): void
    {
        $ntp_server = $this->mikoPBXConfig->getServerNTP();
        if ( ! empty($ntp_server)) {
            $ntp_conf = "server {$ntp_server}";
        } else {
            $ntp_conf = 'server 0.pool.ntp.org
server 1.pool.ntp.org
server 2.pool.ntp.org';
        }
        Util::fileWriteContent('/etc/ntp.conf', $ntp_conf);

        if (Util::isSystemctl()) {
            return;
        }
        Util::killByName("ntpd");
        usleep(500000);
        $manual_time = $this->mikoPBXConfig->getGeneralSettings('PBXManualTimeSettings');
        if ($manual_time !== '1') {
            $ntpdPath = Util::which('ntpd');
            Util::mwExec($ntpdPath);
        }
    }

    /**
     * Setup timezone for PHP
     */
    public static function phpTimeZoneConfigure(): void
    {
        $mikoPBXConfig = new MikoPBXConfig();
        $timezone      = $mikoPBXConfig->getTimeZone();
        date_default_timezone_set($timezone);
        if (file_exists('/etc/TZ')) {
            $catPath = Util::which('cat');
            Util::mwExec("export TZ='$({$catPath} /etc/TZ)'");
        }
        $etcPhpIniPath = '/etc/php.ini';
        $contents = file_get_contents($etcPhpIniPath);
        $contents = preg_replace("/date.timezone(.*)/", 'date.timezone="'.$timezone.'"', $contents);
        Util::fileWriteContent($etcPhpIniPath, $contents);
    }

}