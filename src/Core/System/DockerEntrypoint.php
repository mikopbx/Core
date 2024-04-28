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

use Error;
use JsonException;
use MikoPBX\Common\Models\PbxSettingsConstants;
use Phalcon\Di;
use ReflectionClass;

require_once 'Globals.php';
/**
 * The entry point class for MikoPBX.
 */
class DockerEntrypoint extends Di\Injectable
{
    public const  PATH_DB = '/cf/conf/mikopbx.db';
    private const  pathInc = '/etc/inc/mikopbx-settings.json';
    public float $workerStartTime;
    private array $incSettings;
    private array $settings;

    /**
     * Constructs the Entrypoint class.
     */
    public function __construct()
    {
        pcntl_async_signals(true);
        register_shutdown_function([$this, 'shutdownHandler']);

    }

    /**
     * Handles the shutdown event.
     */
    public function shutdownHandler(): void
    {
        $e = error_get_last();
        $delta = round(microtime(true) - $this->workerStartTime, 2);
        if ($e === null) {
            SystemMessages::sysLogMsg(static::class, "shutdownHandler after $delta seconds", LOG_DEBUG);
        } else {
            $details = (string)print_r($e, true);
            SystemMessages::sysLogMsg(static::class, "shutdownHandler after $delta seconds with error: $details", LOG_DEBUG);
        }
    }

    /**
     * Starts the MikoPBX system.
     */
    public function start(): void
    {
        $this->workerStartTime = microtime(true);
        $syslogd = Util::which('syslogd');
        // Start the system log.
        Processes::mwExecBg($syslogd . ' -S -C512');

        // Prepare database
        $sqlite3 = Util::which('sqlite3');
        $rm = Util::which('rm');
        $cp = Util::which('cp');
        $out = [];
        Processes::mwExec("$sqlite3 " . self::PATH_DB . ' .tables', $out);
        if (trim(implode('', $out)) === '') {
            Util::mwMkdir(dirname(self::PATH_DB));
            Processes::mwExec("$rm -rf " . self::PATH_DB . "; $cp /conf.default/mikopbx.db " . self::PATH_DB);
            Util::addRegularWWWRights(self::PATH_DB);
        }
        // Get default settings
        $this->initSettings();

        // Update DB values
        $this->applyEnvironmentSettings();

        // Update WWW user id and group id.
        $this->changeWwwUserID();

        // Start the MikoPBX system.
        shell_exec("$rm -rf /tmp/*");
        $commands = 'exec </dev/console >/dev/console 2>/dev/console;' .
            '/etc/rc/bootup 2>/dev/null && ' .
            '/etc/rc/bootup_pbx 2>/dev/null';
        passthru($commands);
    }

    /**
     * Initializes the settings. Required for checking and updating port settings.
     */
    private function initSettings(): void
    {
        // Get settings from mikopbx-settings.json
        $jsonString = file_get_contents(self::pathInc);
        try {
            $this->incSettings = json_decode($jsonString, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            $this->incSettings = [];
            throw new Error(self::pathInc . " has broken format");
        }

        // Get settings from DB
        $out = [];
        $sqlite3 = Util::which('sqlite3');
        Processes::mwExec("$sqlite3 " . self::PATH_DB . " 'SELECT * FROM m_PbxSettings'", $out);
        $this->settings = [];
        foreach ($out as $row) {
            $data = explode('|', $row);
            $key = $data[0] ?? '';
            $value = $data[1] ?? '';
            $this->settings[$key] = $value;
        }

        // Add some extra information
        putenv("VIRTUAL_HARDWARE_TYPE=Docker");
    }

    /**
     * Updates a setting on DB or in mikopbx-settings.json with a new value.
     *
     * @param string $dataPath
     * @param string $newValue
     */
    private function updateSetting(string $dataPath, string $newValue): void
    {
        $result = true;
        if (!empty($this->incSettings[$dataPath]['port'])) {
            $this->incSettings[$dataPath]['port'] = $newValue;
            $newData = json_encode($this->incSettings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            $res = file_put_contents(self::pathInc, $newData);
            $result = (false !== $res);
            SystemMessages::sysLogMsg(__METHOD__, " - Update $dataPath to '$newValue' in ini file", LOG_INFO);
        } elseif (array_key_exists($dataPath, $this->settings) && $this->settings[$dataPath]!==$newValue){
            $sqlite3 = Util::which('sqlite3');
            $res = Processes::mwExec("$sqlite3 " . self::PATH_DB . " 'UPDATE m_PbxSettings SET value=\"$newValue\" WHERE key=\"$dataPath\"'");
            $result = ($res === 0);
            SystemMessages::sysLogMsg(__METHOD__, " - Update $dataPath to '$newValue' in DB", LOG_INFO);
        }
        if (!$result){
            SystemMessages::sysLogMsg(__METHOD__, " - Update $dataPath failed", LOG_ERR);
        }
    }

    /**
     * Changes the ID of the WWW user.
     *
     */
    private function changeWwwUserID(): void
    {
        $newUserId = getenv('ID_WWW_USER');
        $newGroupId = getenv('ID_WWW_GROUP');
        SystemMessages::sysLogMsg(__METHOD__,  ' - Check user id and group id for www',LOG_INFO);
        $pidIdPath = '/cf/conf/user.id';
        $pidGrPath = '/cf/conf/group.id';

        if (empty($newUserId) && file_exists($pidIdPath)) {
            $newUserId = file_get_contents($pidIdPath);
        }
        if (empty($newGroupId) && file_exists($pidGrPath)) {
            $newGroupId = file_get_contents($pidGrPath);
        }

        $commands = [];
        $userID = 'www';
        $grep = Util::which('grep');
        $find = Util::which('find');
        $sed = Util::which('sed');
        $cut = Util::which('cut');
        $chown = Util::which('chown');
        $chgrp = Util::which('chgrp');
        $currentUserId = trim(shell_exec("$grep '^$userID:' < /etc/shadow | $cut -d ':' -f 3"));
        $currentGroupId = trim(shell_exec("$grep '^$userID:' < /etc/shadow | $cut -d ':' -f 4"));

        SystemMessages::sysLogMsg(__METHOD__," - Old $userID user id: $currentUserId; New $userID user id: $newUserId" , LOG_DEBUG);
        SystemMessages::sysLogMsg(__METHOD__," - Old $userID group id: $currentGroupId; New $userID user id: $newGroupId", LOG_DEBUG);
        if (!empty($currentUserId) && !empty($newUserId) && $currentUserId !== $newUserId) {
            $commands[] = "$sed -i 's/$userID:x:$currentUserId:/$userID:x:$newUserId:/g' /etc/shadow*";
            $id = '';
            if (file_exists($pidIdPath)) {
                $id = file_get_contents($pidIdPath);
            }
            if ($id !== $newUserId) {
                $commands[] = "$find / -not -path '/proc/*' -user $currentUserId -exec $chown -h $userID {} \;";
                file_put_contents($pidIdPath, $newUserId);
            }
        }
        if (!empty($currentGroupId) && !empty($newGroupId) && $currentGroupId !== $newGroupId) {
            $commands[] = "$sed -i 's/$userID:x:$currentGroupId:/$userID:x:$newGroupId:/g' /etc/group";
            $commands[] = "$sed -i 's/:$currentGroupId:Web/:$newGroupId:Web/g' /etc/shadow";

            $id = '';
            if (file_exists($pidGrPath)) {
                $id = file_get_contents($pidGrPath);
            }
            if ($id !== $newGroupId) {
                $commands[] = "$find / -not -path '/proc/*' -group $currentGroupId -exec $chgrp -h $newGroupId {} \;";
                file_put_contents($pidGrPath, $newGroupId);
            }
        }
        if (!empty($commands)) {
            passthru(implode('; ', $commands));
        }
    }

    /**
     * Applies settings from environment variables to system constants.
     */
    private function applyEnvironmentSettings(): void
    {
        $extraConstants = [
            'BEANSTALK_PORT' => 'beanstalk',
            'REDIS_PORT' => 'redis',
            'GNATS_PORT' => 'gnats',
        ];

        $reflection = new ReflectionClass(PbxSettingsConstants::class);
        $constants = array_merge($reflection->getConstants(), $extraConstants);

        foreach ($constants as $name => $dbKey) {
            $envValue = getenv($name);
            if ($envValue !== false) {
                $this->updateSetting($dbKey, $envValue);
            }
        }
    }
}

SystemMessages::sysLogMsg(DockerEntrypoint::class, ' - Start Docker entrypoint (php)', LOG_DEBUG);
$main = new DockerEntrypoint();
$main->start();