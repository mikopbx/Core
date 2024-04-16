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

namespace MikoPBX\Core\System\Configs;


use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Notifications;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerPrepareAdvice;
use Phalcon\Di\Injectable;

/**
 * Class SSHConf
 *
 * Represents the SSH configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class SSHConf extends Injectable
{
    private MikoPBXConfig $mikoPBXConfig;

    /**
     * SSHConf constructor.
     */
    public function __construct()
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Configures SSH settings.
     *
     * @return bool
     */
    public function configure(): bool
    {
        $lofFile = '/var/log/lastlog';
        if(!file_exists($lofFile)){
            file_put_contents($lofFile, '');
        }
        $dropBearDir = '/etc/dropbear';
        Util::mwMkdir($dropBearDir);

        $keytypes = [
            "rsa"     => PbxSettingsConstants::SSH_RSA_KEY,
            "dss"     => PbxSettingsConstants::SSH_DSS_KEY,
            "ecdsa"   => PbxSettingsConstants::SSH_ECDSA_KEY,
            "ed25519" => PbxSettingsConstants::SSH_ED25519_KEY
        ];
        $options = ($this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::SSH_DISABLE_SSH_PASSWORD) === '1')?'-s':'';
        // Get keys from DB
        $dropbearkeyPath = Util::which('dropbearkey');
        $dropbearPath    = Util::which('dropbear');
        foreach ($keytypes as $keytype => $db_key) {
            $res_keyfilepath = "{$dropBearDir}/dropbear_" . $keytype . "_host_key";
            $key             = $this->mikoPBXConfig->getGeneralSettings($db_key);
            $key             = (isset($key) && is_string($key)) ? trim($key) : "";
            if (strlen($key) > 100) {
                // Store key to file
                file_put_contents($res_keyfilepath, base64_decode($key));
            }
            // If key not exists, we will generate and store new one into file and database
            if ( ! file_exists($res_keyfilepath)) {
                // Generation
                Processes::mwExec("{$dropbearkeyPath} -t $keytype -f $res_keyfilepath");
                // Storing
                $new_key = base64_encode(file_get_contents($res_keyfilepath));
                $this->mikoPBXConfig->setGeneralSettings($db_key, $new_key);
            }
        }
        $ssh_port = escapeshellcmd((string)$this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::SSH_PORT));
        // Set root password
        $this->updateShellPassword();
        // Restart ssh  server
        Processes::killByName('dropbear');
        usleep(500000);
        $result = Processes::mwExec("{$dropbearPath} -p '{$ssh_port}' $options -c /etc/rc/hello > /var/log/dropbear_start.log");
        $this->generateAuthorizedKeys();

        return ($result === 0);
    }

    /**
     * Stores authorized_keys from DB to files.
     *
     * @return void
     */
    public function generateAuthorizedKeys(): void
    {
        $ssh_dir = '/root/.ssh';
        Util::mwMkdir($ssh_dir);
        $conf_data = $this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::SSH_AUTHORIZED_KEYS);
        file_put_contents("{$ssh_dir}/authorized_keys", $conf_data);
    }

    /**
     * Sets up the root user password.
     *
     * @return void
     */
    public function updateShellPassword(): void
    {
        $password           = (string)$this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::SSH_PASSWORD);
        $hashString         = (string)$this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::SSH_PASSWORD_HASH_STRING);
        $disablePassLogin   = (string)$this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::SSH_DISABLE_SSH_PASSWORD);

        $echoPath       = Util::which('echo');
        $chPasswdPath   = Util::which('chpasswd');
        $passwdPath   = Util::which('passwd');
        Processes::mwExec("{$passwdPath} -l www");
        if($disablePassLogin === '1'){
            Processes::mwExec("{$passwdPath} -l root");
        }else{
            Processes::mwExec("{$echoPath} 'root:$password' | {$chPasswdPath}");
        }
        $this->mikoPBXConfig->setGeneralSettings(PbxSettingsConstants::SSH_PASSWORD_HASH_FILE, md5_file('/etc/shadow'));
        if($hashString !== md5($password)){
            $this->mikoPBXConfig->setGeneralSettings(PbxSettingsConstants::SSH_PASSWORD_HASH_STRING, md5($password));
            Notifications::sendAdminNotification('adv_SSHPasswordWasChangedSubject', ['adv_SSHPasswordWasChangedBody'],true);
            WorkerPrepareAdvice::afterChangeSSHConf();
        }
    }

}