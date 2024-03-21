#!/usr/bin/php -f
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

require_once('Globals.php');

use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use function MikoPBX\Common\Config\appPath;

/**
 * The entry point class for MikoPBX.
 */
class Entrypoint
{
    public const  PATH_DB = '/cf/conf/mikopbx.db';
    private const  pathInc = '/etc/inc/mikopbx-settings.json';
    public float $workerStartTime;
    private array $env;
    private array $incSettings;
    private array $settings;

    /**
     * Constructs the Entrypoint class.
     */
    public function __construct()
    {
        pcntl_async_signals(true);
        register_shutdown_function([$this, 'shutdownHandler']);

        $this->env = [
            // Identification of the WWW user.
            'ID_WWW_USER' => '',
            'ID_WWW_GROUP' => '',

            //
            'BEANSTALK_PORT' => 'beanstalk',
            'REDIS_PORT' => 'redis',
            'GNATS_PORT' => 'gnats',

            // General settings.
            'SSH_PORT' => PbxSettingsConstants::SSH_PORT,
            'WEB_PORT' => PbxSettingsConstants::WEB_PORT,
            'WEB_HTTPS_PORT' => PbxSettingsConstants::WEB_HTTPS_PORT,
            'SIP_PORT' => PbxSettingsConstants::SIP_PORT,
            'TLS_PORT' => PbxSettingsConstants::TLS_PORT,
            'RTP_FROM' => PbxSettingsConstants::RTP_PORT_FROM,
            'RTP_TO' => PbxSettingsConstants::RTP_PORT_TO,
            'IAX_PORT' => PbxSettingsConstants::IAX_PORT,
            'AMI_PORT' => PbxSettingsConstants::AMI_PORT,
            'AJAM_PORT' => PbxSettingsConstants::AJAM_PORT,
            'AJAM_PORT_TLS' => PbxSettingsConstants::AJAM_PORT_TLS,
        ];
    }

    /**
     * Handles the shutdown event.
     */
    public function shutdownHandler(): void
    {
        $e = error_get_last();
        $delta = round(microtime(true) - $this->workerStartTime, 2);
        if ($e === null) {
            Util::sysLogMsg(static::class, "shutdownHandler after $delta seconds", LOG_DEBUG);
        } else {
            $details = (string)print_r($e, true);
            Util::sysLogMsg(static::class, "shutdownHandler after $delta seconds with error: $details", LOG_DEBUG);
        }
    }

    /**
     * Starts the MikoPBX system.
     */
    public function start(): void
    {
        $this->workerStartTime = microtime(true);
        $sysLogdPath = Util::which('syslogd');
        // Start the system log.
        Processes::mwExecBg($sysLogdPath . ' -S -C512');
        $out = [];
        Processes::mwExec('sqlite3 ' . self::PATH_DB . ' .tables', $out);
        if (trim(implode('', $out)) === '') {
            Util::mwMkdir(dirname(self::PATH_DB));
            Processes::mwExec("rm -rf " . self::PATH_DB . "; cp /conf.default/mikopbx.db " . self::PATH_DB);
            Util::addRegularWWWRights(self::PATH_DB);
        }
        $this->checkUpdate();
        shell_exec("rm -rf /tmp/*");
        $commands = 'exec </dev/console >/dev/console 2>/dev/console;' .
            '/etc/rc/bootup 2>/dev/null && ' .
            '/etc/rc/bootup_pbx 2>/dev/null';
        passthru($commands);
    }

    /**
     * Checks if there is an indication to apply a custom port value and calls the updateSetting function.
     */
    public function checkUpdate(): void
    {
        Util::echoWithSyslog(' - Check update... ' . PHP_EOL);
        $this->initSettings();
        foreach ($this->env as $key => $dataPath) {
            $newValue = getenv($key);
            if (!is_numeric($newValue)) {
                continue;
            }

            if (empty($dataPath)) {
                $this->env[$key] = $newValue;
                continue;
            }

            $isInc = false;
            $oldValue = $this->settings[$dataPath] ?? '';
            if (empty($oldValue)) {
                $oldValue = 1 * $this->incSettings[$dataPath]['port'] ?? 0;
                $newValue = 1 * $newValue;
                $isInc = true;
            }

            if (empty($oldValue) || $newValue === $oldValue) {
                continue;
            }
            $this->updateSetting($dataPath, $newValue, $isInc);
        }

        $this->changeWwwUserID($this->env['ID_WWW_USER'], $this->env['ID_WWW_GROUP']);
    }

    /**
     * Initializes the settings. Required for checking and updating port settings.
     */
    private function initSettings(): void
    {
        $jsonString = file_get_contents(self::pathInc);
        try {
            $this->incSettings = json_decode($jsonString, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            $this->incSettings = [];
            throw new Error(self::pathInc . " has broken format");
        }

        $out = [];
        Processes::mwExec("sqlite3 " . self::PATH_DB . " 'SELECT * FROM m_PbxSettings' | grep -i port", $out);
        $this->settings = [];
        $keys = array_flip($this->env);
        foreach ($out as $row) {
            $data = explode('|', $row);
            $key = $data[0] ?? '';
            $value = $data[1] ?? '';

            if (!isset($keys[$key]) || empty($value)) {
                continue;
            }
            $this->settings[$key] = $value;
        }
    }

    /**
     * Updates a setting on DB or in mikopbx-settings.json with a new value.
     *
     * @param string $dataPath
     * @param string $newValue
     * @param bool $isInc
     */
    private function updateSetting(string $dataPath, string $newValue, bool $isInc): void
    {
        $msg = " - Update $dataPath (port) to '$newValue' ..." . PHP_EOL;
        Util::echoWithSyslog($msg);
        if ($isInc === true) {
            $this->incSettings[$dataPath]['port'] = $newValue;
            $newData = json_encode($this->incSettings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            $res = file_put_contents(self::pathInc, $newData);
            $result = (false !== $res);
        } else {
            $res = Processes::mwExec("sqlite3 " . self::PATH_DB . " 'UPDATE m_PbxSettings SET value=\"$newValue\" WHERE key=\"$dataPath\"'");
            $result = ($res === 0);
        }
        Util::echoResult($msg, $result);
    }

    /**
     * Changes the ID of the WWW user.
     *
     * @param string $newUserId
     * @param string $newGroupId
     */
    private function changeWwwUserID(string $newUserId, string $newGroupId): void
    {
        Util::echoWithSyslog(' - Check user id... ' . PHP_EOL);
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
        $currentUserId = trim(shell_exec("grep '^$userID:' < /etc/shadow | cut -d ':' -f 3"));
        $currentGroupId = trim(shell_exec("grep '^$userID:' < /etc/shadow | cut -d ':' -f 4"));

        Util::echoWithSyslog(" - Old user id: $currentUserId; New user id: $newUserId" . PHP_EOL);
        Util::echoWithSyslog(" - Old group id: $currentGroupId; New user id: $newGroupId" . PHP_EOL);
        if (!empty($currentUserId) && !empty($newUserId) && $currentUserId !== $newUserId) {
            $commands[] = "sed -i 's/$userID:x:$currentUserId:/$userID:x:$newUserId:/g' /etc/shadow*";
            $id = '';
            if (file_exists($pidIdPath)) {
                $id = file_get_contents($pidIdPath);
            }
            if ($id !== $newUserId) {
                $commands[] = "find / -not -path '/proc/*' -user $currentUserId -exec chown -h $userID {} \;";
                file_put_contents($pidIdPath, $newUserId);
            }
        }
        if (!empty($currentGroupId) && !empty($newGroupId) && $currentGroupId !== $newGroupId) {
            $commands[] = "sed -i 's/$userID:x:$currentGroupId:/$userID:x:$newGroupId:/g' /etc/group";
            $commands[] = "sed -i 's/:$currentGroupId:Web/:$newGroupId:Web/g' /etc/shadow";

            $id = '';
            if (file_exists($pidGrPath)) {
                $id = file_get_contents($pidGrPath);
            }
            if ($id !== $newGroupId) {
                $commands[] = "find / -not -path '/proc/*' -group $currentGroupId -exec chgrp -h $newGroupId {} \;";
                file_put_contents($pidGrPath, $newGroupId);
            }
        }
        if (!empty($commands)) {
            passthru(implode('; ', $commands));
        }
    }
}

Util::echoWithSyslog(' - Start Entrypoint (php)... ' . PHP_EOL);
$main = new Entrypoint();
$main->start();