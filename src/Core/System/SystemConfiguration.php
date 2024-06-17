<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Providers\ConfigProvider;
use Phalcon\Di;

/**
 * SystemConfiguration class
 *
 * @package MikoPBX\Core\System
 *
 */
class SystemConfiguration extends Di\Injectable
{
    private string $configDBPath='';
    private const DEFAULT_CONFIG_DB = '/conf.default/mikopbx.db';

    public function __construct()
    {
       $this->configDBPath = $this->di->getShared(ConfigProvider::SERVICE_NAME)->path('database.dbfile');
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
        $backupDir   = str_replace(['/storage/usbdisk1','/mountpoint'], ['',''], $confBackupDir);
        $confFile    = $this->configDBPath;
        foreach ($storages as $dev => $fs){
            SystemMessages::echoToTeletype(PHP_EOL."    - mount $dev ...".PHP_EOL, true);
            Util::mwMkdir($tmpMountDir."/$dev");
            $res = Storage::mountDisk($dev, $fs, $tmpMountDir."/$dev");
            if(!$res){
                SystemMessages::echoToTeletype("    - fail mount $dev ...".PHP_EOL, true);
            }
        }

        $tail    = Util::which('tail');
        $sort    = Util::which('sort');
        $find    = Util::which('find');
        $cut    = Util::which('cut');
        $lastBackUp  = trim(shell_exec("$find $tmpMountDir/dev/*$backupDir -type f -printf '%T@ %p\\n' | $sort -n | $tail -1 | $cut -f2- -d' '"));
        if(!empty($lastBackUp)){
            $rm     = Util::which('rm');
            $gzip   = Util::which('gzip');
            $sqlite3= Util::which('sqlite3');

            SystemMessages::echoToTeletype("    - Restore $lastBackUp ...".PHP_EOL, true);
            shell_exec("$rm -rf {$confFile}*");
            shell_exec("$gzip -c -d $lastBackUp | sqlite3 $confFile");
            Processes::mwExec("$sqlite3 $confFile 'select * from m_Storage'", $out, $ret);
            if($ret !== 0){
                SystemMessages::echoToTeletype("    - restore $lastBackUp failed...".PHP_EOL, true);
                copy(self::DEFAULT_CONFIG_DB, $confFile);
            }elseif(!$this->isDefaultConf()){
                System::reboot();
            }
        }
        $mount   = Util::which('umount');
        foreach ($storages as $dev => $fs){
            SystemMessages::echoToTeletype("    - umount $dev ...".PHP_EOL, true);
            shell_exec("$mount $dev");
        }
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
        $confFile    = $this->configDBPath;
        $defaultConfFile =  self::DEFAULT_CONFIG_DB;
        $sqlite3 = Util::which('sqlite3');
        $md5sum = Util::which('md5sum');
        $cut = Util::which('cut');
        $md5_1 = shell_exec("$sqlite3 $confFile .dump | $md5sum | $cut -f 1 -d ' '");
        $md5_2 = shell_exec("$sqlite3 $defaultConfFile .dump | $md5sum | $cut -f 1 -d ' '");
        return $md5_1 === $md5_2;
    }
}