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
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadCrondAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadManagerAction;
use MikoPBX\Core\Workers\WorkerModelsEvents;
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
        $cut = Util::which('cut');
        $md5_1 = shell_exec("$sqlite3 ".$di->getConfig()->path('database.dbfile')." .dump | $md5sum | $cut -f 1 -d ' '");
        $md5_2 = shell_exec("$sqlite3 /conf.default/mikopbx.db .dump | $md5sum | $cut -f 1 -d ' '");
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
        $confBackupDir = Directories::getDir(Directories::CORE_CONF_BACKUP_DIR);
        $backupDir   = str_replace(['/storage/usbdisk1','/mountpoint'],['',''],$confBackupDir);
        $confFile    = $di->getConfig()->path('database.dbfile');
        foreach ($storages as $dev => $fs){
            SystemMessages::echoToTeletype("    - mount $dev ..."."\n");
            Util::mwMkdir($tmpMountDir."/$dev");
            $res = Storage::mountDisk($dev, $fs, $tmpMountDir."/$dev");
            if(!$res){
                SystemMessages::echoToTeletype("    - fail mount $dev ..."."\n");
            }
        }

        $tail    = Util::which('tail');
        $sort    = Util::which('sort');
        $find    = Util::which('find');
        $mount   = Util::which('umount');
        $rm    = Util::which('rm');
        $cut    = Util::which('cut');
        $gzip    = Util::which('gzip');
        $sqlite3    = Util::which('sqlite3');
        $lastBackUp  = trim(shell_exec("$find $tmpMountDir/dev/*$backupDir -type f -printf '%T@ %p\\n' | $sort -n | $tail -1 | $cut -f2- -d' '"));
        if(empty($lastBackUp)){
            return;
        }
        SystemMessages::echoToTeletype("    - Restore $lastBackUp ..."."\n");
        shell_exec("$rm -rf {$confFile}*");
        shell_exec("$gzip -c -d $lastBackUp | sqlite3 $confFile");
        Processes::mwExec("$sqlite3 $confFile 'select * from m_Storage'", $out, $ret);
        if($ret !== 0){
            SystemMessages::echoToTeletype("    - fail restore $lastBackUp ..."."\n");
            copy('/conf.default/mikopbx.db', $confFile);
        }elseif(!$this->isDefaultConf()){
            self::reboot();
        }
        foreach ($storages as $dev => $fs){
            shell_exec("$mount $dev");
        }
    }

    /**
     * Returns the directory where logs are stored.
     * @deprecated use Directories::getDir(Directories::CORE_LOGS_DIR);
     *
     * @return string - Directory path where logs are stored.
     */
    public static function getLogDir(): string
    {
        return Directories::getDir(Directories::CORE_LOGS_DIR);
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
        $network->configureLanInDocker();
        $network->updateExternalIp();
    }

    /**
     * Restart modules or services based on the provided actions.
     * @deprecated use WorkerModelsEvents::invokeAction($actionClassNames);
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
                    WorkerModelsEvents::invokeAction(ReloadManagerAction::class);
                    break;
                case 'cron':
                    WorkerModelsEvents::invokeAction(ReloadCrondAction::class);
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
    public static function reboot(): void
    {
        $pbx_reboot = Util::which('pbx_reboot');
        Processes::mwExec("{$pbx_reboot} > /dev/null 2>&1");
    }

    /**
     * Reboots the system after calling system_reboot_cleanup()
     * @deprecated Use System::reboot() instead.
     * @return void
     */
    public static function rebootSync(): void
    {
        System::reboot();
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
