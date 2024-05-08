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
use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettingsConstants;
use Phalcon\Di;
use ReflectionClass;

require_once 'Globals.php';

/**
 * Defines the entry point for the MikoPBX system when deployed in a Docker environment.
 * This class is responsible for initializing the system, configuring environment settings,
 * preparing databases, and handling system startup and shutdown behaviors.
 */
class DockerEntrypoint extends Di\Injectable
{
    private const  PATH_DB = '/cf/conf/mikopbx.db';
    private const  pathInc = '/etc/inc/mikopbx-settings.json';
    public float $workerStartTime;
    private array $jsonSettings;
    private array $settings;

    /**
     * Constructor for the DockerEntrypoint class.
     * Registers the shutdown handler and enables asynchronous signal handling.
     */
    public function __construct()
    {
        pcntl_async_signals(true);
        register_shutdown_function([$this, 'shutdownHandler']);

    }

    /**
     * Handles the shutdown event for the Docker container.
     * Logs the time taken since the worker start and any last-minute errors.
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
     * Initiates the startup sequence for the MikoPBX system.
     * Processes include system log initialization, database preparation, settings retrieval and application,
     * and triggering system startup routines.
     */
    public function start(): void
    {
        $this->workerStartTime = microtime(true);
        $syslogd = Util::which('syslogd');
        // Start the system log.
        Processes::mwExecBg($syslogd . ' -S -C512');

        // Update WWW user id and group id.
        $this->changeWwwUserID();

        // Prepare database
        $this->prepareDatabase();

        // Get default settings
        $this->getDefaultSettings();

        // Update DB values
        $this->applyEnvironmentSettings();

        // Start the MikoPBX system.
        $this->startTheMikoPBXSystem();
    }

    /**
     * Updates the system user 'www' with new user and group IDs if they are provided through environment variables
     * or from existing configuration files.
     */
    private function changeWwwUserID(): void
    {
        $newUserId = getenv('ID_WWW_USER');
        $newGroupId = getenv('ID_WWW_GROUP');
        SystemMessages::sysLogMsg(__METHOD__, ' - Check user id and group id for www', LOG_INFO);
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
        if ($currentUserId!=='' && !empty($newUserId) && $currentUserId !== $newUserId) {
            SystemMessages::sysLogMsg(__METHOD__, " - Old $userID user id: $currentUserId; New $userID user id: $newUserId", LOG_DEBUG);
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

        $currentGroupId = trim(shell_exec("$grep '^$userID:' < /etc/group | $cut -d ':' -f 3"));
        if ($currentGroupId!=='' && !empty($newGroupId) && $currentGroupId !== $newGroupId) {
            SystemMessages::sysLogMsg(__METHOD__, " - Old $userID group id: $currentGroupId; New $userID group id: $newGroupId", LOG_DEBUG);
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
     * Prepares the SQLite database for use, checking for table existence and restoring from defaults if necessary.
     * @return array An array containing the results of the database check commands.
     */
    public function prepareDatabase(): array
    {
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
        return array($rm, $out);
    }

    /**
     * Retrieves default settings from JSON configuration and the database,
     * setting up initial configuration states required for system operations.
     */
    private function getDefaultSettings(): void
    {
        // Get settings from mikopbx-settings.json
        $jsonString = file_get_contents(self::pathInc);
        try {
            $this->jsonSettings = json_decode($jsonString, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            $this->jsonSettings = [];
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
     * Applies configuration settings from environment variables to the system,
     * updating both database and JSON stored settings as necessary.
     */
    private function applyEnvironmentSettings(): void
    {
        $reflection = new ReflectionClass(PbxSettingsConstants::class);
        $constants = $reflection->getConstants();

        foreach ($constants as $name => $dbKey) {
            $envValue = getenv($name);
            if ($envValue !== false) {
                switch ($dbKey) {
                    case PbxSettingsConstants::BEANSTALK_PORT:
                    case PbxSettingsConstants::REDIS_PORT:
                    case PbxSettingsConstants::GNATS_PORT:
                        $this->updateJsonSettings($dbKey, 'port', intval($envValue));
                        break;
                    case PbxSettingsConstants::GNATS_HTTP_PORT:
                        $this->updateJsonSettings('gnats', 'httpPort', intval($envValue));
                        break;
                    case PbxSettingsConstants::ENABLE_USE_NAT:
                        if ($envValue==='1'){
                            $this->reconfigureNetwork("topology", LanInterfaces::TOPOLOGY_PRIVATE);
                        }
                        break;
                    case PbxSettingsConstants::EXTERNAL_SIP_HOST_NAME:
                        $this->reconfigureNetwork("exthostname", $envValue);
                        break;
                    case PbxSettingsConstants::EXTERNAL_SIP_IP_ADDR:
                        $this->reconfigureNetwork("extipaddr", $envValue);
                        break;
                    default:
                        $this->updateDBSetting($dbKey, $envValue);
                        break;
                }
            }
        }
    }

    /**
     * Reconfigures a network setting in the database.
     *
     * This method updates the value of a specified setting for network interfaces
     * that are marked as connected to the internet in the database. It logs the outcome
     * of the operation, detailing success or failure along with the executed command
     * if an error occurs.
     *
     * @param string $key The database column key representing the setting to update.
     * @param string $newValue The new value to assign to the specified setting.
     * @return void
     */
    private function reconfigureNetwork(string $key, string $newValue): void
    {
        $sqlite3 = Util::which('sqlite3');
        $dbPath =  self::PATH_DB;
        $out = [];
        $command = "$sqlite3 $dbPath \"UPDATE m_LanInterfaces SET $key='$newValue' WHERE internet='1'\"";
        $res = Processes::mwExec($command, $out);
        if ($res === 0) {
            SystemMessages::sysLogMsg(__METHOD__, " - Update m_LanInterfaces.$key to '$newValue'", LOG_INFO);
        } else {
            SystemMessages::sysLogMsg(__METHOD__, " - Update m_LanInterfaces.$key to '$newValue' failed: " . implode($out) . PHP_EOL . 'Command:' . PHP_EOL . $command, LOG_ERR);
        }
    }
    /**
     * Updates the specified setting in the JSON configuration file.
     * @param string $path The JSON path where the setting is stored.
     * @param string $key The setting key to update.
     * @param mixed $newValue The new value to set.
     */
    private function updateJsonSettings(string $path, string $key, $newValue): void
    {
        if ($this->jsonSettings[$path][$key] ?? null !== $newValue)
            $this->jsonSettings[$path][$key] = $newValue;
        $newData = json_encode($this->jsonSettings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        file_put_contents(self::pathInc, $newData);
        SystemMessages::sysLogMsg(__METHOD__, " - Update $path:$key to '$newValue' in /etc/inc/mikopbx-settings.json", LOG_INFO);
    }

    /**
     * Updates a specified setting directly in the database.
     * @param string $key The key of the setting to update.
     * @param string $newValue The new value for the setting.
     */
    private function updateDBSetting(string $key, string $newValue): void
    {
        if (array_key_exists($key, $this->settings) && $this->settings[$key] !== $newValue) {
            $sqlite3 = Util::which('sqlite3');
            $dbPath =  self::PATH_DB;
            $out = [];
            $command = "$sqlite3 $dbPath \"UPDATE m_PbxSettings SET value='$newValue' WHERE key='$key'\"";
            $res = Processes::mwExec($command, $out);
            if ($res === 0) {
                SystemMessages::sysLogMsg(__METHOD__, " - Update $key to '$newValue' in m_PbxSettings", LOG_INFO);
            } else {
                SystemMessages::sysLogMsg(__METHOD__, " - Update $key failed: " . implode($out) . PHP_EOL . 'Command:' . PHP_EOL . $command, LOG_ERR);
            }
        } elseif(!array_key_exists($key, $this->settings)) {
            SystemMessages::sysLogMsg(__METHOD__, " - Unknown environment settings key:  $key", LOG_ERR);
        }
    }

    /**
     * Executes the final commands to start the MikoPBX system, clearing temporary files and running system scripts.
     */
    public function startTheMikoPBXSystem(): void
    {
        $rm = Util::which('rm');
        shell_exec("$rm -rf /tmp/*");
        $commands = 'exec </dev/console >/dev/console 2>/dev/console;' .
            '/etc/rc/bootup 2>/dev/null && ' .
            '/etc/rc/bootup_pbx 2>/dev/null';
        passthru($commands);
    }
}

SystemMessages::sysLogMsg(DockerEntrypoint::class, ' - Start Docker entrypoint (php)', LOG_DEBUG);
$main = new DockerEntrypoint();
$main->start();