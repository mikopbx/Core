<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use Phalcon\Di\Injectable;

require_once 'Globals.php';

/**
 * Entry point for MikoPBX when deployed in container environments (Docker, LXC).
 *
 * This class is responsible for initializing the system, configuring environment settings,
 * preparing databases, and handling system startup and shutdown behaviors.
 *
 * Supports both Docker and LXC containers with unified cloud provisioning.
 */
class ContainerEntrypoint extends Injectable
{
    private const string PATH_DB = '/cf/conf/mikopbx.db';
    public float $workerStartTime;
    private string $stageMessage = '';
    private float $stageStartTime = 0.0;

    /**
     * Constructor for the ContainerEntrypoint class.
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
     * Handles the shutdown event for the container.
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

        // Diagnose volume permissions
        $this->diagnosePermissions();

        // Prepare database
        $this->prepareDatabase();

        // Cloud provisioning moved to SystemLoader::startSystem() after Redis is running
        // This allows using ORM instead of direct SQLite queries

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
        $currentUserId = trim((string)shell_exec("$grep '^$userID:' < /etc/shadow | $cut -d ':' -f 3"));
        $currentGroupId = trim((string)shell_exec("$grep '^$userID:' < /etc/group | $cut -d ':' -f 3"));

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

            // Execute collected commands
            passthru(implode('; ', $commands));

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
     * Diagnoses permissions for critical directories and provides helpful feedback.
     * Checks write access to mounted volumes and suggests correct UID/GID if issues found.
     */
    private function diagnosePermissions(): void
    {
        $this->echoStartMsg(' - Diagnosing volume permissions...');

        $criticalPaths = [
            '/cf' => 'Configuration storage',
            '/storage' => 'Data storage'
        ];

        $hasIssues = false;
        $issueDetails = [];
        $currentUserId = posix_getuid();
        $currentGroupId = posix_getgid();
        $userInfo = posix_getpwuid($currentUserId);
        $userName = $userInfo['name'] ?? 'unknown';

        foreach ($criticalPaths as $path => $description) {
            if (!file_exists($path)) {
                $issueDetails[] = "   ✗ $path ($description) - directory does not exist";
                $hasIssues = true;
                continue;
            }

            // Test write access by attempting to create a temporary file
            $testFile = $path . '/.write_test_' . uniqid();
            $canWrite = @file_put_contents($testFile, 'test');

            if ($canWrite === false) {
                $stat = stat($path);
                if ($stat === false) {
                    $issueDetails[] = "   ✗ $path ($description) - cannot read directory stats";
                    $hasIssues = true;
                    continue;
                }
                $owner = posix_getpwuid($stat['uid']);
                $group = posix_getgrgid($stat['gid']);

                $issueDetails[] = sprintf(
                    "   ✗ %s (%s) - NO WRITE ACCESS\n" .
                    "     Directory owner: UID=%d GID=%d (%s:%s)\n" .
                    "     Container user:  UID=%d GID=%d (%s)",
                    $path,
                    $description,
                    $stat['uid'],
                    $stat['gid'],
                    $owner['name'] ?? 'unknown',
                    $group['name'] ?? 'unknown',
                    $currentUserId,
                    $currentGroupId,
                    $userName
                );
                $hasIssues = true;
            } else {
                @unlink($testFile);
                $issueDetails[] = "   ✓ $path ($description) - write access OK";
            }
        }

        if ($hasIssues) {
            $this->echoResultMsg(SystemMessages::RESULT_WARNING);
            $this->echoMessage("\n┌─────────────────────────────────────────────────────────────────┐");
            $this->echoMessage("│ ⚠️  VOLUME PERMISSION ISSUES DETECTED                            │");
            $this->echoMessage("└─────────────────────────────────────────────────────────────────┘\n");

            foreach ($issueDetails as $detail) {
                $this->echoMessage($detail);
            }

            $this->echoMessage("\n┌─────────────────────────────────────────────────────────────────┐");
            $this->echoMessage("│ 💡 SOLUTION: Set correct user permissions                       │");
            $this->echoMessage("└─────────────────────────────────────────────────────────────────┘\n");
            $this->echoMessage("To fix this issue, restart the container with environment variables:");
            $this->echoMessage("\n  docker run ... \\");
            $this->echoMessage("    -e ID_WWW_USER=\"\$(id -u www-user)\" \\");
            $this->echoMessage("    -e ID_WWW_GROUP=\"\$(id -g www-user)\" \\");
            $this->echoMessage("    ...\n");
            $this->echoMessage("Where 'www-user' is the user that owns the mounted directories.");
            $this->echoMessage("\nFor detailed instructions, see:");
            $this->echoMessage("https://github.com/mikopbx/Core/wiki/Docker-Installation\n");

            SystemMessages::sysLogMsg(
                static::class,
                "Volume permission issues detected. Container user UID=$currentUserId GID=$currentGroupId cannot write to mounted volumes.",
                LOG_WARNING
            );
        } else {
            $this->echoResultMsg();
            $this->echoMessage("   All volumes accessible (UID=$currentUserId GID=$currentGroupId)");
        }
    }

    /**
     * Prepares the SQLite database for use, checking for table existence and restoring from defaults if necessary.
     * @return array<int, string> An array containing the results of the database check commands.
     */
    public function prepareDatabase(): array
    {
        $this->echoStartMsg(' - Preparing database...');
        $sqlite3 = Util::which('sqlite3');
        $rm = Util::which('rm');
        $cp = Util::which('cp');
        $out = [];
        Processes::mwExec("$sqlite3 " . self::PATH_DB . ' .tables', $out);
        if ($out !== null && trim(implode('', $out)) === '') {
            Util::mwMkdir(dirname(self::PATH_DB));
            Processes::mwExec("$rm -rf " . self::PATH_DB . "; $cp /conf.default/mikopbx.db " . self::PATH_DB);
            Util::addRegularWWWRights(self::PATH_DB);
        }
        $this->echoResultMsg();
        return [];
    }

    /**
     * Executes the final commands to start the MikoPBX system, clearing temporary files and running system scripts.
     */
    public function startTheMikoPBXSystem(): void
    {
        $rm = Util::which('rm');
        shell_exec("$rm -rf /tmp/*");

        // Determine console device based on environment
        // LXC: Proxmox console is attached to /dev/tty1
        // Docker/bare-metal: use /dev/console
        $consoleDevice = System::isLxc() ? '/dev/tty1' : '/dev/console';

        $commands = "if test -c $consoleDevice && test -r $consoleDevice && test -w $consoleDevice; then " .
            "exec <$consoleDevice >$consoleDevice 2>$consoleDevice; fi; " .
            '/etc/rc/bootup 2>/dev/null && ' .
            '/etc/rc/bootup_pbx 2>/dev/null';
        passthru($commands);
    }
}

// Record system boot start time using monotonic clock (hrtime)
// This avoids issues with NTP time synchronization during boot
$bootStartTime = hrtime(true);
file_put_contents('/tmp/system_boot_start_time', $bootStartTime);

// Output startup message
echo PHP_EOL . " - Starting MikoPBX in container..." . PHP_EOL;
$main = new ContainerEntrypoint();
$main->start();
