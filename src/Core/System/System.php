<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Core\System;

use DateTime;
use DateTimeZone;
use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Configs\CronConf;
use MikoPBX\Core\System\Configs\IptablesConf;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\System\Configs\NTPConf;
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use MikoPBX\Core\Asterisk\Configs\{QueueConf};
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
    public static function updateCustomFiles()
    {
        $actions = [];
        /** @var \MikoPBX\Common\Models\CustomFiles $res_data */
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
                case 'jail.local': // fail2ban
                    $actions['firewall'] = 100;
                    break;
            }
        }

        asort($actions);
        self::invokeActions($actions);
        foreach ($res_data as $file_data) {
            /** @var \MikoPBX\Common\Models\CustomFiles $file_data */
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
                    $ntpConf = new NTPConf();
                    $ntpConf->configure();
                    break;
                case 'firewall':
                    IptablesConf::reloadFirewall();
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
        Util::mwExec("{$datePath} +%s -s @{$timeStamp}");
        // Для 1 января должно быть передано 1577829662
        // Установлено 1577818861

        return true;
    }

    /**
     * Reboots the system after calling system_reboot_cleanup()
     */
    public static function rebootSync(): void
    {
        $mikopbx_rebootPath = Util::which('mikopbx_reboot');
        Util::mwExec("{$mikopbx_rebootPath} > /dev/null 2>&1");
    }

    /**
     * Reboots the system after calling system_reboot_cleanup()
     */
    public static function rebootSyncBg(): void
    {
        $mikopbx_rebootPath = Util::which('mikopbx_reboot');
        Util::mwExecBg("{$mikopbx_rebootPath} > /dev/null 2>&1");
    }

    /**
     * Shutdown the system
     */
    public static function shutdown(): void
    {
        $shutdownPath = Util::which('shutdown');
        Util::mwExec("{$shutdownPath} > /dev/null 2>&1");
    }

    /**
     * Restart all workers in separate process,
     * we use this method after module install or delete
     */
    public static function restartAllWorkers(): void
    {
        $workerSafeScriptsPath = Util::getFilePathByClassName(WorkerSafeScriptsCore::class);
        $phpPath               = Util::which('php');
        $WorkerSafeScripts     = "{$phpPath} -f {$workerSafeScriptsPath} restart > /dev/null 2> /dev/null";
        Util::mwExecBg($WorkerSafeScripts, '/dev/null', 1);
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
            Util::mwExec("{$cpPath}  {$zone_file} /etc/localtime");
            file_put_contents('/etc/TZ', $timezone);
            putenv("TZ={$timezone}");
            Util::mwExec("export TZ;");

            PHPConf::phpTimeZoneConfigure();
        }

    }

    /**
     * Loads additional kernel modules
     */
    public function loadKernelModules(): void
    {
        $modprobePath = Util::which('modprobe');
        $ulimitPath   = Util::which('ulimit');

        Util::mwExec("{$modprobePath} -q dahdi");
        Util::mwExec("{$modprobePath} -q dahdi_transcode");
        Util::mwExec("{$ulimitPath} -n 4096");
        Util::mwExec("{$ulimitPath} -p 4096");
    }

    /**
     * Restart asterisk processor
     */
    public function onAfterPbxStarted(): void
    {
        $additionalModules = $this->di->getShared('pbxConfModules');
        foreach ($additionalModules as $appClass) {
            /** @var \MikoPBX\Modules\Config\ConfigClass $appClass */
            $appClass->onAfterPbxStarted();
        }
    }
}
