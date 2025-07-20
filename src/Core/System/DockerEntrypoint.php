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
use MikoPBX\Common\Models\PbxSettings;
use Phalcon\Di\Injectable;
use ReflectionClass;

require_once 'Globals.php';

/**
 * Defines the entry point for the MikoPBX system when deployed in a Docker environment.
 * This class is responsible for initializing the system, configuring environment settings,
 * preparing databases, and handling system startup and shutdown behaviors.
 */
class DockerEntrypoint extends Injectable
{
    private const string PATH_DB = '/cf/conf/mikopbx.db';
    private const string pathInc = '/etc/inc/mikopbx-settings.json';
    public float $workerStartTime;
    private array $jsonSettings;
    private array $settings;
    private string $stageMessage = '';
    private float $stageStartTime = 0.0;

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
     * Outputs a formatted message to console
     * @param string $message
     * @param bool $newLine
     */
    private function echoMessage(string $message, bool $newLine = true): void
    {
        echo $message;
        if ($newLine) {
            echo PHP_EOL;
        }
    }

    /**
     * Echoes a start message to the console.
     * @param string $message The message to echo.
     */
    private function echoStartMsg(string $message): void
    {
        SystemMessages::echoStartMsg($message);
        $this->stageMessage = $message;
        $this->stageStartTime = microtime(true);
    }

    /**
     * Echoes a result message to the console.
     * @param string $result The result of the stage.
     */
    private function echoResultMsg(string $result = SystemMessages::RESULT_DONE): void
    {
        $elapsedTime = 0.0;
        if ($this->stageStartTime > 0) {
            $elapsedTime = round(microtime(true) - $this->stageStartTime, 2);
        }
        SystemMessages::echoResultMsgWithTime($this->stageMessage, $result, $elapsedTime);
        $this->stageMessage = '';
        $this->stageStartTime = 0.0;
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
            // Don't output anything on normal startup completion
            // The shutdown handler runs after the welcome message is displayed
        } else {
            $details = (string)print_r($e, true);
            SystemMessages::sysLogMsg(static::class, "Container stopped after $delta seconds with error: $details", LOG_ERR);
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
        // Output message only if we need to change permissions
        $showMessage = false;
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
        $currentUserId = trim(shell_exec("$grep '^$userID:' < /etc/shadow | $cut -d ':' -f 3")??'');
        $currentGroupId = trim(shell_exec("$grep '^$userID:' < /etc/group | $cut -d ':' -f 3")??'');
        
        $needUserUpdate = ($currentUserId !== '' && !empty($newUserId) && $currentUserId !== $newUserId);
        $needGroupUpdate = ($currentGroupId !== '' && !empty($newGroupId) && $currentGroupId !== $newGroupId);
        
        if ($needUserUpdate || $needGroupUpdate) {
            $this->echoStartMsg(' - Configuring user permissions...');
            
            // Collect all updates first
            if ($needUserUpdate) {
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
            
            if ($needGroupUpdate) {
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
            
            // Execute commands
            if (!empty($commands)) {
                passthru(implode('; ', $commands));
            }
            
            $this->echoResultMsg();
            
            // Show details after completion
            if ($needUserUpdate) {
                $this->echoMessage("   Updated user ID: $currentUserId → $newUserId");
            }
            if ($needGroupUpdate) {
                $this->echoMessage("   Updated group ID: $currentGroupId → $newGroupId");
            }
        }
    }

    /**
     * Prepares the SQLite database for use, checking for table existence and restoring from defaults if necessary.
     * @return array An array containing the results of the database check commands.
     */
    public function prepareDatabase(): array
    {
        $this->echoStartMsg(' - Preparing database...');
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
        $this->echoResultMsg();
        return array($rm, $out);
    }

    /**
     * Retrieves default settings from JSON configuration and the database,
     * setting up initial configuration states required for system operations.
     */
    private function getDefaultSettings(): void
    {
        $this->echoStartMsg(' - Loading system settings...');
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
        $this->echoResultMsg();
    }

    /**
     * Applies configuration settings from environment variables to the system,
     * updating both database and JSON stored settings as necessary.
     */
    private function applyEnvironmentSettings(): void
    {
        $this->echoStartMsg(' - Applying environment variables...');
        $reflection = new ReflectionClass(PbxSettings::class);
        $constants = $reflection->getConstants();
        $appliedSettings = [];

        foreach ($constants as $name => $dbKey) {
            $envValue = getenv($name);
            if ($envValue !== false) {
                switch ($dbKey) {
                    case PbxSettings::BEANSTALK_PORT:
                    case PbxSettings::REDIS_PORT:
                    case PbxSettings::GNATS_PORT:
                        if ($this->updateJsonSettings($dbKey, 'port', intval($envValue))) {
                            $appliedSettings[] = "   Updated $name → " . intval($envValue);
                        }
                        break;
                    case PbxSettings::GNATS_HTTP_PORT:
                        if ($this->updateJsonSettings('gnats', 'httpPort', intval($envValue))) {
                            $appliedSettings[] = "   Updated $name → " . intval($envValue);
                        }
                        break;
                    case PbxSettings::ENABLE_USE_NAT:
                        if ($envValue === '1') {
                            $this->reconfigureNetwork("topology", LanInterfaces::TOPOLOGY_PRIVATE);
                            $appliedSettings[] = "   Updated $name → 1 (NAT enabled)";
                        }
                        break;
                    case PbxSettings::EXTERNAL_SIP_HOST_NAME:
                        $this->reconfigureNetwork("exthostname", $envValue);
                        $appliedSettings[] = "   Updated $name → $envValue";
                        break;
                    case PbxSettings::EXTERNAL_SIP_IP_ADDR:
                        $this->reconfigureNetwork("extipaddr", $envValue);
                        $appliedSettings[] = "   Updated $name → $envValue";
                        break;
                    default:
                        if ($this->updateDBSetting($dbKey, $envValue)) {
                            $appliedSettings[] = "   Updated $name → $envValue";
                        }
                        break;
                }
            }
        }
        
        $this->echoResultMsg();
        
        // Show applied settings after DONE
        foreach ($appliedSettings as $setting) {
            $this->echoMessage($setting);
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
            SystemMessages::sysLogMsg(__METHOD__, " - Update m_LanInterfaces.$key to '$newValue'", LOG_DEBUG);
        } else {
            SystemMessages::sysLogMsg(__METHOD__, " - Update m_LanInterfaces.$key to '$newValue' failed: " . implode($out) . PHP_EOL . 'Command:' . PHP_EOL . $command, LOG_ERR);
        }
    }
    /**
     * Updates the specified setting in the JSON configuration file.
     * @param string $path The JSON path where the setting is stored.
     * @param string $key The setting key to update.
     * @param mixed $newValue The new value to set.
     * @return bool True if the setting was updated, false otherwise.
     */
    private function updateJsonSettings(string $path, string $key, mixed $newValue): bool
    {
        if ($this->jsonSettings[$path][$key] ?? null !== $newValue) {
            $this->jsonSettings[$path][$key] = $newValue;
            $newData = json_encode($this->jsonSettings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            file_put_contents(self::pathInc, $newData);
            SystemMessages::sysLogMsg(__METHOD__, " - Update $path:$key to '$newValue' in /etc/inc/mikopbx-settings.json", LOG_DEBUG);
            return true;
        }
        return false;
    }

    /**
     * Updates a specified setting directly in the database.
     * @param string $key The key of the setting to update.
     * @param string $newValue The new value for the setting.
     * @return bool True if the setting was updated, false otherwise.
     */
    private function updateDBSetting(string $key, string $newValue): bool
    {
        if (array_key_exists($key, $this->settings) && $this->settings[$key] !== $newValue) {
            $sqlite3 = Util::which('sqlite3');
            $dbPath =  self::PATH_DB;
            $out = [];
            $command = "$sqlite3 $dbPath \"UPDATE m_PbxSettings SET value='$newValue' WHERE key='$key'\"";
            $res = Processes::mwExec($command, $out);
            if ($res === 0) {
                SystemMessages::sysLogMsg(__METHOD__, " - Update $key to '$newValue' in m_PbxSettings", LOG_DEBUG);
                return true;
            } else {
                SystemMessages::sysLogMsg(__METHOD__, " - Update $key failed: " . implode($out) . PHP_EOL . 'Command:' . PHP_EOL . $command, LOG_ERR);
                return false;
            }
        } elseif (!array_key_exists($key, $this->settings)) {
            $this->echoMessage("   Warning: Unknown environment variable '$key' - skipping");
        }
        return false;
    }

    /**
     * Executes the final commands to start the MikoPBX system, clearing temporary files and running system scripts.
     */
    public function startTheMikoPBXSystem(): void
    {
        $rm = Util::which('rm');
        shell_exec("$rm -rf /tmp/*");
        $commands = 'if test -c /dev/console && test -r /dev/console && test -w /dev/console; then ' .
            'exec </dev/console >/dev/console 2>/dev/console; fi; ' .
            '/etc/rc/bootup 2>/dev/null && ' .
            '/etc/rc/bootup_pbx 2>/dev/null';
        passthru($commands);
    }
}

// Record system boot start time
$bootStartTime = microtime(true);
file_put_contents('/tmp/system_boot_start_time', $bootStartTime);

// Output startup message
echo PHP_EOL . " - Starting MikoPBX in Docker container..." . PHP_EOL;
$main = new DockerEntrypoint();
$main->start();
