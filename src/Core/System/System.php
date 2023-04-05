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

use DateTime;
use DateTimeZone;
use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Asterisk\Configs\H323Conf;
use MikoPBX\Core\Asterisk\Configs\HepConf;
use MikoPBX\Core\System\Configs\CronConf;
use MikoPBX\Core\System\Configs\IptablesConf;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\System\Configs\NTPConf;
use MikoPBX\Core\Asterisk\Configs\QueueConf;
use Phalcon\Di;

class System extends Di\Injectable
{
    private MikoPBXConfig $mikoPBXConfig;

    /**
     * System constructor
     */
    public function __construct()
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Returns logs dir
     *
     * @return string
     */
    public static function getLogDir(): string
    {
        $di = Di::getDefault();
        if ($di !== null) {
            return $di->getConfig()->path('core.logsDir');
        }

        return '/var/log';
    }

    /**
     * Refresh networks configs and restarts network daemon
     */
    public static function networkReload(): void
    {
        $network = new Network();
        $network->hostnameConfigure();
        $network->resolvConfGenerate();
        $network->loConfigure();
        $network->lanConfigure();
    }

    /**
     * Updates custom changes in config files
     */
    public static function updateCustomFiles():void
    {
        $actions = [];
        /** @var CustomFiles $res_data */
        $res_data = CustomFiles::find("changed = '1'");
        foreach ($res_data as $file_data) {
            // Always restart asterisk after any custom file change
            $actions['asterisk_core_reload'] = 100;
            $filename                        = basename($file_data->filepath);
            switch ($filename) {
                case 'manager.conf':
                    $actions['manager'] = 10;
                    break;
                case 'musiconhold.conf':
                    $actions['musiconhold'] = 100;
                    break;
                case 'modules.conf':
                    $actions['modules'] = 10;
                    break;
                case 'http.conf':
                    $actions['manager'] = 10; //
                    break;
                case 'hep.conf':
                    $actions['hep'] = 10; //
                    break;
                case 'root': // crontabs
                    $actions['cron'] = 10;
                    break;
                case 'queues.conf':
                    $actions['queues'] = 10;
                    break;
                case 'features.conf':
                    $actions['features'] = 10;
                    break;
                case 'ntp.conf':
                    $actions['ntp'] = 100;
                    break;
                case 'ooh323.conf':
                    $actions['h323'] = 100;
                    break;
                case 'rtp.conf':
                    $actions['rtp'] = 10;
                    break;
                case 'static-routes':
                case 'openvpn.ovpn':
                    $actions['network'] = 100;
                    break;
                case 'firewall_additional':
                case 'jail.local':
                    $actions['firewall'] = 100;
                    break;
                default:
                    break;
            }
        }
        asort($actions);
        self::invokeActions($actions);
        foreach ($res_data as $file_data) {
            /** @var CustomFiles $file_data */
            $file_data->writeAttribute("changed", '0');
            $file_data->save();
        }
    }

    /**
     * Batch module restart
     *
     * @param $actions
     *
     */
    public static function invokeActions($actions): void
    {
        foreach ($actions as $action => $value) {
            switch ($action) {
                case 'manager':
                    PBX::managerReload();
                    break;
                case 'musiconhold':
                    PBX::musicOnHoldReload();
                    break;
                case 'rtp':
                    PBX::rtpReload();
                    break;
                case 'modules':
                    PBX::modulesReload();
                    break;
                case 'cron':
                    $cron = new CronConf();
                    $cron->reStart();
                    break;
                case 'queues':
                    QueueConf::queueReload();
                    break;
                case 'features':
                    PBX::managerReload(); //
                    break;
                case 'ntp':
                    NTPConf::configure();
                    break;
                case 'firewall':
                    IptablesConf::reloadFirewall();
                    break;
                case 'hep':
                    HepConf::reload();
                    break;
                case 'h323':
                    H323Conf::reload();
                    break;
                case 'network':
                    self::networkReload();
                    break;
                case 'asterisk_core_reload':
                    PBX::sipReload();
                    PBX::iaxReload();
                    PBX::dialplanReload();
                    PBX::coreReload();
                    break;
                default:
            }
        }
    }

    /**
     * Setup system time
     *
     * @param int    $timeStamp
     * @param string $remote_tz
     *
     * @return bool
     * @throws \Exception
     */
    public static function setDate(int $timeStamp, string $remote_tz): bool
    {
        $datePath = Util::which('date');
        $db_tz = PbxSettings::getValueByKey('PBXTimezone');
        $origin_tz = '';
        if (file_exists('/etc/TZ')) {
            $origin_tz = file_get_contents("/etc/TZ");
        }
        if ($origin_tz !== $db_tz){
            self::timezoneConfigure();
        }
        $origin_tz = $db_tz;
        $origin_dtz = new DateTimeZone($origin_tz);
        $remote_dtz = new DateTimeZone($remote_tz);
        $origin_dt  = new DateTime('now', $origin_dtz);
        $remote_dt  = new DateTime('now', $remote_dtz);
        $offset     = $origin_dtz->getOffset($origin_dt) - $remote_dtz->getOffset($remote_dt);
        $timeStamp  = $timeStamp - $offset;
        Processes::mwExec("{$datePath} +%s -s @{$timeStamp}");
        // Для 1 января должно быть передано 1577829662
        // Установлено 1577818861

        return true;
    }

    /**
     * Reboots the system after calling system_reboot_cleanup()
     */
    public static function rebootSync(): void
    {
        $pbx_rebootPath = Util::which('pbx_reboot');
        Processes::mwExec("{$pbx_rebootPath} > /dev/null 2>&1");
    }

    /**
     * Reboots the system after calling system_reboot_cleanup()
     */
    public static function rebootSyncBg(): void
    {
        $pbx_rebootPath = Util::which('pbx_reboot');
        Processes::mwExecBg("{$pbx_rebootPath} > /dev/null 2>&1");
    }

    /**
     * Shutdown the system
     */
    public static function shutdown(): void
    {
        $shutdownPath = Util::which('shutdown');
        Processes::mwExec("{$shutdownPath} > /dev/null 2>&1");
    }


    /**
     * Populates /etc/TZ with an appropriate time zone
     */
    public static function timezoneConfigure(): void
    {
        $timezone = PbxSettings::getValueByKey('PBXTimezone');
        if (file_exists('/etc/TZ')) {
            unlink("/etc/TZ");
        }
        if (file_exists('/etc/localtime')) {
            unlink("/etc/localtime");
        }
        if ($timezone) {
            $zone_file = "/usr/share/zoneinfo/{$timezone}";
            if ( ! file_exists($zone_file)) {
                return;
            }
            $cpPath = Util::which('cp');
            Processes::mwExec("{$cpPath}  {$zone_file} /etc/localtime");
            file_put_contents('/etc/TZ', $timezone);
            putenv("TZ={$timezone}");
            Processes::mwExec("export TZ;");

            PHPConf::phpTimeZoneConfigure();
        }

    }

    /**
     * Loads additional kernel modules
     */
    public function loadKernelModules(): bool
    {
        if(Util::isDocker()){
            return true;
        }

        $modprobePath = Util::which('modprobe');
        $ulimitPath   = Util::which('ulimit');

        $res1 = Processes::mwExec("{$modprobePath} -q dahdi");
        $res2 = Processes::mwExec("{$modprobePath} -q dahdi_transcode");
        Processes::mwExec("{$ulimitPath} -n 4096");
        Processes::mwExec("{$ulimitPath} -p 4096");

        return ($res1 === 0 && $res2 === 0);
    }

    /**
     * Вычисляет хэш сертификатов SSL и распаковывает их из ca-certificates.crt.
     * @return void
     */
    public static function sslRehash(): void
    {
        $openSslPath = Util::which('openssl');
        $cutPath     = Util::which('cut');
        $openSslDir  = trim(shell_exec("$openSslPath version -d | $cutPath -d '\"' -f 2"));
        $certFile    = "$openSslDir/certs/ca-certificates.crt";
        $tmpFile     = tempnam('/tmp', 'cert-');
        $rawData     = file_get_contents($certFile);
        $certs       = explode(PHP_EOL.PHP_EOL, $rawData);
        foreach ($certs as $cert){
            if(strpos($cert, '-----BEGIN CERTIFICATE-----') === false){
                continue;
            }
            file_put_contents($tmpFile, $cert);
            $hash = trim(shell_exec("$openSslPath x509 -subject_hash -noout -in '$tmpFile'"));
            rename($tmpFile, "$openSslDir/certs/$hash.0");
        }
        if(file_exists($tmpFile)){
            unlink($tmpFile);
        }
    }
}
