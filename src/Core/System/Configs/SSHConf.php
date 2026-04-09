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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\PasswordService;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

/**
 * SSH Configuration Management Class.
 *
 * Manages SSH configurations including password setup, service restarts, and key management.
 *
 * @package MikoPBX\Core\System\Configs
 */
class SSHConf extends SystemConfigClass
{
    public const string PROC_NAME = 'dropbear';


    // Client keep-alive interval in seconds
    private const int CLIENT_KEEP_ALIVE_INTERVAL = 60;

    // Client idle timeout in seconds
    private const int CLIENT_IDLE_TIMEOUT = 1800;

    /**
     * Generates the Monit configuration file for monitoring the current service.
     *
     * This method:
     * - Sets up the start command by calling setStartCommand()
     * - Constructs a stop command using BusyBox to send SIGQUIT to the process
     * - Defines dependencies (e.g., on php_timezone)
     * - Specifies user permissions for starting/stopping the service
     *
     * The generated configuration is saved to a file in the Monit configuration directory,
     * with a filename based on the service priority and name.
     *
     * @return bool Always returns true after successfully writing the configuration file.
     */
    public function generateMonitConf(): bool
    {
        $this->setStartCommand();
        $port = PbxSettings::getValueByKey(PbxSettings::SSH_PORT);
        $busyboxPath = Util::which('busybox');
        $confPath = $this->getMainMonitConfFile();
        $conf = 'check process '.self::PROC_NAME.' with pidfile /var/run/'.self::PROC_NAME.'.pid'.PHP_EOL.
            '    depends on loopback'.PHP_EOL.
            '    start program = "'.$this->startCommand.'"'.PHP_EOL.
            '        as uid root and gid root'.PHP_EOL.
            '    stop program = "'.$busyboxPath.' killall '.self::PROC_NAME.'"'.PHP_EOL.
            '        as uid root and gid root'.PHP_EOL.
            "    if failed port $port protocol ssh then restart".PHP_EOL.
            '    if 5 restarts within 5 cycles then timeout'.PHP_EOL;
        $this->saveFileContent($confPath, $conf);
        return true;
    }

    /**
     * Starts the service by reinitializing configurations and restarting the monitoring service.
     *
     * This method is a wrapper around {@see self::reStart()} and is used to start or restart
     * the service with full reinitialization of settings and time synchronization.
     *
     * @return bool Returns true if the start operation was successful, false otherwise.
     */
    public function start(): bool
    {
        if(System::isBooting()){
            $this->configure();
            Processes::mwExecBg($this->startCommand);
            $result = $this->monitWaitStart();
        }else{
            $result = $this->reStart();
        }
        return $result;
    }

    public function reStart(): bool
    {
        $this->generateMonitConf();
        $this->configure();
        return $this->monitRestart();
    }

    /**
     * Configures SSH settings based on current system settings.
     *
     * @return void
     */
    private function configure(): void
    {
        $lofFile = '/var/log/lastlog';
        if (!file_exists($lofFile)) {
            file_put_contents($lofFile, '');
        }
        $this->generateDropbearKeys();
        $sshLogin = $this->getCreateSshUser();

        // Update root password and restart SSH server
        $this->updateShellPassword($sshLogin);

        $this->setStartCommand();

        $this->generateAuthorizedKeys($sshLogin);
        $this->fixRights($sshLogin);
    }

    /**
     * Constructs the start command for the service based on current system settings.
     *
     * This method builds the full command line to start the Dropbear SSH server,
     * taking into account:
     * - The configured SSH port
     * - Whether password authentication is disabled
     * - Keep-alive and idle timeout options
     *
     * The resulting command is stored in $this->startCommand for later use
     * (e.g., by generateMonitConf() when creating Monit configuration).
     *
     * @return void
     */
    private function setStartCommand()
    {
        $sshPort  = escapeshellcmd(PbxSettings::getValueByKey(PbxSettings::SSH_PORT));
        $sshPasswordDisabled = PbxSettings::getValueByKey(PbxSettings::SSH_DISABLE_SSH_PASSWORD) === '1';
        $options = $sshPasswordDisabled ? '-s' : '';
        $dropBear = Util::which(self::PROC_NAME);

        // Adding keep-alive and idle timeout options to Dropbear configuration
        $this->startCommand = sprintf(
            "%s -p '%s' %s -K %d -I %d -c /etc/rc/hello",
            $dropBear,
            $sshPort,
            $options,
            self::CLIENT_KEEP_ALIVE_INTERVAL,
            self::CLIENT_IDLE_TIMEOUT
        );
    }

    /**
     * Generates or retrieves SSH keys, handling their storage and retrieval.
     *
     * @return void
     */
    private function generateDropbearKeys(): void
    {
        // DSS/DSA is deprecated and unsupported in modern dropbear builds
        $keyTypes = [
            "rsa" => PbxSettings::SSH_RSA_KEY,
            "ecdsa" => PbxSettings::SSH_ECDSA_KEY,
            "ed25519" => PbxSettings::SSH_ED25519_KEY
        ];

        $dropBearDir = '/etc/dropbear';
        Util::mwMkdir($dropBearDir);

        $dropBearKey = Util::which('dropbearkey');
        // Get keys from DB
        foreach ($keyTypes as $keyType => $dbKey) {
            $resKeyFilePath = "$dropBearDir/dropbear_" . $keyType . "_host_key";
            $keyValue = trim(PbxSettings::getValueByKey($dbKey));
            if (strlen($keyValue) > 100) {
                file_put_contents($resKeyFilePath, base64_decode($keyValue));
            } elseif (!file_exists($resKeyFilePath)) {
                Processes::mwExec("$dropBearKey -t $keyType -f $resKeyFilePath");
                if (!file_exists($resKeyFilePath)) {
                    SystemMessages::sysLogMsg(__METHOD__, "Failed to generate $keyType host key", LOG_WARNING);
                    continue;
                }
                $newKey = base64_encode(file_get_contents($resKeyFilePath));
                PbxSettings::setValueByKey($dbKey, $newKey);
            }
        }
        $rsaPath = '/root/.ssh/id_rsa';
        $sshGenPath = Util::which('ssh-keygen');
        $keyCmd = [
            [PbxSettings::SSH_ID_RSA, $rsaPath, $sshGenPath.' -t rsa -b 4096 -f '.$rsaPath.' -N "" -q'],
            [PbxSettings::SSH_ID_RSA_PUB, "$rsaPath.pub", "$sshGenPath -y -f $rsaPath > $rsaPath.pub"],
        ];
        foreach ($keyCmd as [$keySetting, $path, $createCmd]){
            $keyValue = trim(PbxSettings::getValueByKey($keySetting));
            if(empty($keyValue)){
                // Remove existing file to prevent ssh-keygen from waiting for interactive confirmation
                if (file_exists($path)) {
                    unlink($path);
                }
                shell_exec($createCmd);
                if (!file_exists($path)) {
                    SystemMessages::sysLogMsg(__METHOD__, "Failed to generate SSH key: $path", LOG_WARNING);
                    continue;
                }
                $keyValue = base64_encode(file_get_contents($path));
                PbxSettings::setValueByKey($keySetting, $keyValue);
            }
            file_put_contents($path, base64_decode($keyValue));
        }
    }

    /**
     * Retrieves the designated SSH login username from settings.
     *
     * @return string SSH login username.
     */
    private function getCreateSshUser(): string
    {
        $cut = Util::which('cut');
        $chown = Util::which('chown');
        $deluser = Util::which('deluser');
        $delgroup = Util::which('delgroup');
        $addgroup = Util::which('addgroup');
        $adduser = Util::which('adduser');

        $sshLogin = PbxSettings::getValueByKey(PbxSettings::SSH_LOGIN);
        $homeDir = $this->getUserHomeDir($sshLogin);
        $mainUsers = ['root', 'www']; // System users that should not be modified

        // Clean up non-system users
        exec("$cut -f 1 -d ':' < /etc/passwd", $systemUsers);
        foreach ($systemUsers as $user) {
            if ($sshLogin === $user || in_array($user, $mainUsers, true)) {
                continue;
            }
            // Deleting the user and associated group
            shell_exec("$deluser $user");
            shell_exec("$delgroup $user");
        }

        // Adding SSH user if not root
        if ($sshLogin !== 'root') {
            shell_exec("$addgroup $sshLogin 2> /dev/null");
            shell_exec("$adduser -h $homeDir -g 'MikoPBX SSH Admin' -s /bin/bash -G root -D '$sshLogin' 2> /dev/null");
            shell_exec("$addgroup -S '$sshLogin' $sshLogin 2> /dev/null");
            shell_exec("$addgroup -S '$sshLogin' root 2> /dev/null");
            $this->updateUserGroupId($sshLogin);
            shell_exec("$chown -R $sshLogin:$sshLogin $homeDir");
        }
        return $sshLogin;
    }

    /**
     * Retrieves or assigns the home directory for a specified username.
     *
     * @param string $sshLogin SSH login username.
     * @return string Home directory path.
     */
    private function getUserHomeDir(string $sshLogin = 'root'): string
    {
        $homeDir = ($sshLogin === 'root') ? '/root' : "/home/$sshLogin";
        Util::mwMkdir($homeDir);
        return $homeDir;
    }

    /**
     * Updates the shell password for specified SSH login.
     *
     * Uses SHA-512 crypt hashes with chpasswd -e for secure password storage.
     * The SSH_PASSWORD field should contain a SHA-512 hash ($6$...) from database.
     * If a plain text password is provided (legacy/migration), it will be hashed first.
     *
     * @param string $sshLogin SSH login username.
     * @return void
     */
    private function updateShellPassword(string $sshLogin = 'root'): void
    {
        $storedPassword     = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD);
        $disablePassLogin   = PbxSettings::getValueByKey(PbxSettings::SSH_DISABLE_SSH_PASSWORD);

        $echo     = Util::which('echo');
        $chpasswd = Util::which('chpasswd');
        $passwd   = Util::which('passwd');

        // Always lock www user
        Processes::mwExec("$passwd -l www");

        if ($disablePassLogin === '1') {
            // Lock both users when password login is disabled
            Processes::mwExec("$passwd -l $sshLogin");
            Processes::mwExec("$passwd -l root");
        } else {
            // Ensure we have a SHA-512 hash for chpasswd -e
            if (PasswordService::isSha512Hash($storedPassword)) {
                $passwordHash = $storedPassword;
            } else {
                // Legacy plain text password - hash it and update database
                $passwordHash = PasswordService::generateSha512Hash($storedPassword);
                PbxSettings::setValueByKey(PbxSettings::SSH_PASSWORD, $passwordHash);
            }

            // Escape the hash for shell (contains $ characters)
            $escapedHash = escapeshellarg($passwordHash);

            if ($sshLogin === 'root') {
                // Set password using pre-hashed value with chpasswd -e
                Processes::mwExec("$echo $sshLogin:$escapedHash | $chpasswd -e");
            } else {
                // Lock root and set password for custom SSH user
                Processes::mwExec("$passwd -l root");
                Processes::mwExec("$echo $sshLogin:$escapedHash | $chpasswd -e");
            }
        }

        // Update shadow file hash for security monitoring
        $currentHash = md5_file('/etc/shadow');
        PbxSettings::setValueByKey(PbxSettings::SSH_PASSWORD_HASH_FILE, $currentHash);
    }

    /**
     * Generates and stores the authorized_keys based on database settings for a specified SSH login.
     *
     * @param string $sshLogin SSH login username.
     * @return void
     */
    private function generateAuthorizedKeys(string $sshLogin = 'root'): void
    {
        $homeDir = $this->getUserHomeDir($sshLogin);
        $sshDir = "$homeDir/.ssh";
        Util::mwMkdir($sshDir);

        $authorizedKeys = PbxSettings::getValueByKey(PbxSettings::SSH_AUTHORIZED_KEYS);
        file_put_contents("$sshDir/authorized_keys", $authorizedKeys);
    }

    /**
     * Corrects file permissions and ownership for SSH user directories.
     *
     * Sets appropriate permissions and ownership on the home directory and
     * SSH-related files to secure the environment.
     *
     * @param string $sshLogin SSH login username.
     * @return void
     */
    private function fixRights(string $sshLogin = 'root'): void
    {
        $homeDir = $this->getUserHomeDir($sshLogin);
        $sshDir = "$homeDir/.ssh";
        $authorizedKeysFile = "$sshDir/authorized_keys";

        // Ensure the SSH directory exists before attempting to modify it
        if (!file_exists($sshDir) || !file_exists($authorizedKeysFile)) {
            return; // Early exit if essential directories or files are missing
        }

        // Commands used for modifying file permissions and ownership
        $chmod = Util::which('chmod');
        $chown = Util::which('chown');

        // Set directory permissions securely
        Processes::mwExec("$chmod 700 $homeDir"); // Only the user can access the home directory
        Processes::mwExec("$chmod 700 $sshDir");  // Only the user can access the .ssh directory

        // Set file permissions securely
        Processes::mwExec("$chmod 600 $authorizedKeysFile"); // Only the user can read/write authorized_keys

        // Change ownership to the user for both home and SSH directories
        Processes::mwExec("$chown -R $sshLogin:$sshLogin $homeDir");
    }

    /**
     * Updates the user group ID in /etc/passwd.
     *
     * @param string $sshLogin SSH login username.
     * @return void
     */
    private function updateUserGroupId(string $sshLogin): void
    {
        $cat = Util::which('cat');
        $cut = Util::which('cut');
        $sed = Util::which('sed');

        $currentGroupId = trim(shell_exec("$cat /etc/passwd | grep '^$sshLogin:' | $cut -f 3 -d ':'")??'');
        shell_exec("$sed -i 's/$sshLogin:x:$currentGroupId:/$sshLogin:x:0:/g' /etc/passwd");
    }
}
