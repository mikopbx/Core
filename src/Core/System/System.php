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
use MikoPBX\Common\Models\PbxSettingsConstants;
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
     * Is the configuration default?
     * @return bool
     */
    public function isDefaultConf():bool
    {
        $di = Di::getDefault();
        if ($di === null) {
            return false;
        }
        $sqlite3 = Util::which('sqlite3');
        $md5sum = Util::which('md5sum');
        $busybox = Util::which('busybox');
        $md5_1 = shell_exec("$sqlite3 ".$di->getConfig()->path('database.dbfile')." .dump | $md5sum | $busybox cut -f 1 -d ' '");
        $md5_2 = shell_exec("$sqlite3 /conf.default/mikopbx.db .dump | $md5sum | $busybox cut -f 1 -d ' '");
        return $md5_1 === $md5_2;
    }

    /**
     * Trying to restore the backup
     * @return void
     */
    public function tryRestoreConf():void
    {
        $di = Di::getDefault();
        if ($di === null) {
            return;
        }
        $storage = new Storage();
        $storages = $storage->getStorageCandidate();
        $tmpMountDir = '/tmp/mnt';
        $backupDir   = str_replace(['/storage/usbdisk1','/mountpoint'],['',''],$di->getConfig()->path('core.confBackupDir'));
        $confFile    = $di->getConfig()->path('database.dbfile');
        foreach ($storages as $dev => $fs){
            Util::teletypeEcho("    - mount $dev ..."."\n");
            Util::mwMkdir($tmpMountDir."/$dev");
            $res = Storage::mountDisk($dev, $fs, $tmpMountDir."/$dev");
            if(!$res){
                Util::teletypeEcho("    - fail mount $dev ..."."\n");
            }
        }
        $pathBusybox = Util::which('busybox');
        $pathFind    = Util::which('find');
        $pathMount   = Util::which('umount');
        $pathRm    = Util::which('rm');
        $pathGzip    = Util::which('gzip');
        $pathSqlite3    = Util::which('sqlite3');
        $lastBackUp  = trim(shell_exec("$pathFind $tmpMountDir/dev/*$backupDir -type f -printf '%T@ %p\\n' | $pathBusybox sort -n | $pathBusybox tail -1 | $pathBusybox cut -f2- -d' '"));
        if(empty($lastBackUp)){
            return;
        }
        Util::teletypeEcho("    - Restore $lastBackUp ..."."\n");
        shell_exec("$pathRm -rf {$confFile}*");
        shell_exec("$pathGzip -c -d $lastBackUp | sqlite3 $confFile");
        Processes::mwExec("$pathSqlite3 $confFile 'select * from m_Storage'", $out, $ret);
        if($ret !== 0){
            Util::teletypeEcho("    - fail restore $lastBackUp ..."."\n");
            copy('/conf.default/mikopbx.db', $confFile);
        }elseif(!$this->isDefaultConf()){
            self::rebootSync();
        }
        foreach ($storages as $dev => $fs){
            shell_exec("$pathMount $dev");
        }
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
        $db_tz = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_TIMEZONE);
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
     * Shutdown the system.
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
        $timezone = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_TIMEZONE);

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
