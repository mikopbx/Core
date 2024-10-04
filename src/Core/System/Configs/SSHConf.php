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
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

/**
 * SSH Configuration Management Class.
 *
 * Manages SSH configurations including password setup, service restarts, and key management.
 *
 * @package MikoPBX\Core\System\Configs
 */
class SSHConf extends Injectable
{
    // Client keep-alive interval in seconds
    private const int CLIENT_KEEP_ALIVE_INTERVAL = 60;

    // Client idle timeout in seconds
    private const int CLIENT_IDLE_TIMEOUT = 1800;


    private MikoPBXConfig $mikoPBXConfig;

    /**
     * Constructor initializing MikoPBX configuration.
     */
    public function __construct()
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Configures SSH settings based on current system settings.
     *
     * @return bool Returns true if configuration is successful, false otherwise.
     */
    public function configure(): bool
    {
        $lofFile = '/var/log/lastlog';
        if (!file_exists($lofFile)) {
            file_put_contents($lofFile, '');
        }
        $this->generateDropbearKeys();
        $sshLogin = $this->getCreateSshUser();
        $sshPort  = escapeshellcmd(PbxSettings::getValueByKey(PbxSettings::SSH_PORT));

        // Update root password and restart SSH server
        $this->updateShellPassword($sshLogin);

        // Killing existing Dropbear processes before restart
        Processes::killByName('dropbear');
        usleep(500000); // Delay to ensure process has stopped

        $sshPasswordDisabled = PbxSettings::getValueByKey(PbxSettings::SSH_DISABLE_SSH_PASSWORD) === '1';
        $options = $sshPasswordDisabled ? '-s' : '';
        $dropbear = Util::which('dropbear');

        // Adding keep-alive and idle timeout options to Dropbear configuration
        $command = sprintf(
            "%s -p '%s' %s -K %d -I %d -c /etc/rc/hello > /var/log/dropbear_start.log",
            $dropbear,
            $sshPort,
            $options,
            self::CLIENT_KEEP_ALIVE_INTERVAL,
            self::CLIENT_IDLE_TIMEOUT
        );
        $result = Processes::mwExec($command);

        $this->generateAuthorizedKeys($sshLogin);
        $this->fixRights($sshLogin);
        return ($result === 0);
    }

    /**
     * Generates or retrieves SSH keys, handling their storage and retrieval.
     *
     * @return void
     */
    private function generateDropbearKeys(): void
    {
        $keyTypes = [
            "rsa" => PbxSettings::SSH_RSA_KEY,
            "dss" => PbxSettings::SSH_DSS_KEY,
            "ecdsa" => PbxSettings::SSH_ECDSA_KEY,
            "ed25519" => PbxSettings::SSH_ED25519_KEY
        ];

        $dropBearDir = '/etc/dropbear';
        Util::mwMkdir($dropBearDir);

        $dropbearkey = Util::which('dropbearkey');
        // Get keys from DB
        foreach ($keyTypes as $keyType => $dbKey) {
            $resKeyFilePath = "$dropBearDir/dropbear_" . $keyType . "_host_key";
            $keyValue = trim(PbxSettings::getValueByKey($dbKey));
            if (strlen($keyValue) > 100) {
                file_put_contents($resKeyFilePath, base64_decode($keyValue));
            } elseif (!file_exists($resKeyFilePath)) {
                Processes::mwExec("$dropbearkey -t $keyType -f $resKeyFilePath");
                $newKey = base64_encode(file_get_contents($resKeyFilePath));
                $this->mikoPBXConfig->setGeneralSettings($dbKey, $newKey);
            }
        }
    }

    /**
     * Retrieves the designated SSH login username from settings.
     *
     * @return string SSH login username.
     */
    private function getCreateSshUser(): string
    {
        $cat = Util::which('cat');
        $chown = Util::which('chown');
        $deluser = Util::which('deluser');
        $delgroup = Util::which('delgroup');
        $addgroup = Util::which('addgroup');
        $adduser = Util::which('adduser');

        $sshLogin = PbxSettings::getValueByKey(PbxSettings::SSH_LOGIN);
        $homeDir = $this->getUserHomeDir($sshLogin);
        $mainUsers = ['root', 'www']; // System users that should not be modified

        // Clean up non-system users
        exec("$cat -f 1 -d ':' < /etc/passwd", $systemUsers);
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
            shell_exec("$addgroup $sshLogin");
            shell_exec("$adduser -h $homeDir -g 'MikoPBX SSH Admin' -s /bin/bash -G root -D '$sshLogin'");
            shell_exec("$addgroup -S '$sshLogin' $sshLogin");
            shell_exec("$addgroup -S '$sshLogin' root");
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
     * @param string $sshLogin SSH login username.
     * @return void
     */
    private function updateShellPassword(string $sshLogin = 'root'): void
    {
        $password           = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD);
        $hashString         = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD_HASH_STRING);
        $disablePassLogin   = PbxSettings::getValueByKey(PbxSettings::SSH_DISABLE_SSH_PASSWORD);

        $echo     = Util::which('echo');
        $chpasswd = Util::which('chpasswd');
        $passwd   = Util::which('passwd');
        Processes::mwExec("$passwd -l www");
        if ($disablePassLogin === '1') {
            Processes::mwExec("$passwd -l $sshLogin");
            Processes::mwExec("$passwd -l root");
        } elseif ($sshLogin === 'root') {
            Processes::mwExec("$echo '$sshLogin:$password' | $chpasswd");
        } else {
            Processes::mwExec("$passwd -l root");
            Processes::mwExec("$echo '$sshLogin:$password' | $chpasswd");
        }

        // Security hash check and notification
        $currentHash = md5_file('/etc/shadow');
        PbxSettings::setValue(PbxSettings::SSH_PASSWORD_HASH_FILE, $currentHash);
        if ($hashString !== md5($password)) {
            PbxSettings::setValue(PbxSettings::SSH_PASSWORD_HASH_STRING, md5($password));
        }
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

        $currentGroupId = trim(shell_exec("$cat /etc/passwd | grep '^$sshLogin:' | $cut -f 3 -d ':'"));
        shell_exec("$sed -i 's/$sshLogin:x:$currentGroupId:/$sshLogin:x:0:/g' /etc/passwd");
    }
}
