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


/**
 * Class System
 *
 * This class provides various system-level functionalities.
 *
 * @package MikoPBX\Core\System
 * @property \Phalcon\Config config
 */
class System extends Di\Injectable
{
    private MikoPBXConfig $mikoPBXConfig;

    /**
     * System constructor - Instantiates MikoPBXConfig.
     */
    public function __construct()
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Returns the directory where logs are stored.
     *
     * @return string - Directory path where logs are stored.
     */
    public static function getLogDir(): string
    {
        $di = Di::getDefault();
        if ($di !== null) {
            return $di->getConfig()->path('core.logsDir');
        }

        // Default logs directory
        return '/var/log';
    }

    /**
     * Refreshes networks configs and restarts network daemon.
     *
     * @return void
     */
    public static function networkReload(): void
    {
        // Create Network object and configure settings
        $network = new Network();
        $network->hostnameConfigure();
        $network->resolvConfGenerate();
        $network->loConfigure();
        $network->lanConfigure();
    }

    /**
     * Updates custom changes in config files
     *
     * @return void
     */
    public static function updateCustomFiles():void
    {
        $actions = [];

        // Find all custom files marked as changed
        /** @var CustomFiles $res_data */
        $res_data = CustomFiles::find("changed = '1'");

        // Process each changed file
        foreach ($res_data as $file_data) {
            // Always restart asterisk after any custom file change
            $actions['asterisk_core_reload'] = 100;
            $filename                        = basename($file_data->filepath);

            // Process based on file name
            switch ($filename) {
                // Set actions based on the name of the changed file
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

        // Sort actions and invoke them
        asort($actions);
        self::invokeActions($actions);

        // After actions are invoked, reset the changed status and save the file data
        foreach ($res_data as $file_data) {
            /** @var CustomFiles $file_data */
            $file_data->writeAttribute("changed", '0');
            $file_data->save();
        }
    }

    /**
     * Restart modules or services based on the provided actions.
     *
     * @param array $actions - The actions to be performed.
     *
     * @return void
     */
    public static function invokeActions(array $actions): void
    {

        // Process each action
        foreach ($actions as $action => $value) {
            // Restart modules or services based on action
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
     * Sets the system date and time based on timestamp and timezone.
     *
     * @param int    $timeStamp - Unix timestamp.
     * @param string $remote_tz - Timezone string.
     *
     * @return bool
     * @throws \Exception
     */
    public static function setDate(int $timeStamp, string $remote_tz): bool
    {
        $datePath = Util::which('date');

        // Fetch timezone from database
        $db_tz = PbxSettings::getValueByKey('PBXTimezone');
        $origin_tz = '';

        // Read existing timezone from file if it exists
        if (file_exists('/etc/TZ')) {
            $origin_tz = file_get_contents("/etc/TZ");
        }

        // If the timezones are different, configure the timezone
        if ($origin_tz !== $db_tz){
            self::timezoneConfigure();
        }

        // Calculate the time offset and set the system time
        $origin_tz = $db_tz;
        $origin_dtz = new DateTimeZone($origin_tz);
        $remote_dtz = new DateTimeZone($remote_tz);
        $origin_dt  = new DateTime('now', $origin_dtz);
        $remote_dt  = new DateTime('now', $remote_dtz);
        $offset     = $origin_dtz->getOffset($origin_dt) - $remote_dtz->getOffset($remote_dt);
        $timeStamp  = $timeStamp - $offset;

        // Execute date command to set system time
        Processes::mwExec("{$datePath} +%s -s @{$timeStamp}");

        return true;
    }

    /**
     * Reboots the system after calling system_reboot_cleanup()
     *
     * @return void
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
     * Configures the system timezone according to the PBXTimezone setting.
     *
     * @return void
     */
    public static function timezoneConfigure(): void
    {

        // Get the timezone setting from the database
        $timezone = PbxSettings::getValueByKey('PBXTimezone');

        // If /etc/TZ or /etc/localtime exist, delete them
        if (file_exists('/etc/TZ')) {
            unlink("/etc/TZ");
        }
        if (file_exists('/etc/localtime')) {
            unlink("/etc/localtime");
        }

        // If a timezone is set, configure it
        if ($timezone) {

            // The path to the zone file
            $zone_file = "/usr/share/zoneinfo/{$timezone}";

            // If the zone file exists, copy it to /etc/localtime
            if ( ! file_exists($zone_file)) {
                return;
            }
            $cpPath = Util::which('cp');
            Processes::mwExec("{$cpPath}  {$zone_file} /etc/localtime");

            // Write the timezone to /etc/TZ and set the TZ environment variable
            file_put_contents('/etc/TZ', $timezone);
            putenv("TZ={$timezone}");

            // Execute the export TZ command and configure PHP's timezone
            Processes::mwExec("export TZ;");
            PHPConf::phpTimeZoneConfigure();
        }

    }

    /**
     * Loads additional kernel modules.
     *
     * @return bool - Returns true if modules are loaded successfully.
     */
    public function loadKernelModules(): bool
    {
        // If the system is running in Docker, no need to load kernel modules
        if(Util::isDocker()){
            return true;
        }

        // Paths to system commands
        $modprobePath = Util::which('modprobe');
        $ulimitPath   = Util::which('ulimit');

        // Load dahdi and dahdi_transcode modules and set ulimit values
        $res1 = Processes::mwExec("{$modprobePath} -q dahdi");
        $res2 = Processes::mwExec("{$modprobePath} -q dahdi_transcode");
        Processes::mwExec("{$ulimitPath} -n 4096");
        Processes::mwExec("{$ulimitPath} -p 4096");

        // Return true if both modules loaded successfully
        return ($res1 === 0 && $res2 === 0);
    }

    /**
     * Calculate the hash of SSL certificates and extract them from ca-certificates.crt.
     *
     * @return void
     */
    public static function sslRehash(): void
    {
        // Paths to system commands
        $openSslPath = Util::which('openssl');
        $cutPath     = Util::which('cut');

        // Get OpenSSL directory and cert file
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
