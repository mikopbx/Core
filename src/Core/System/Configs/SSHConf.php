<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Core\System\Configs;


use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

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
     * Configure SSH settings
     **/
    public function configure()
    {
        $dropbear_dir = '/etc/dropbear';
        Util::mwMkdir($dropbear_dir);

        $keytypes = [
            "rsa"   => "SSHRsaKey",
            "dss"   => "SSHDssKey",
            "ecdsa" => "SSHecdsaKey" // SSHecdsaKey // SSHEcdsaKey
        ];
        // Get keys from DB
        $dropbearkeyPath = Util::which('dropbearkey');
        $dropbearPath = Util::which('dropbear');
        foreach ($keytypes as $keytype => $db_key) {
            $res_keyfilepath = "{$dropbear_dir}/dropbear_" . $keytype . "_host_key";
            $key             = $this->mikoPBXConfig->getGeneralSettings($db_key);
            $key             = (isset($key) && is_string($key)) ? trim($key) : "";
            if (strlen($key) > 100) {
                // Store key to file
                file_put_contents($res_keyfilepath, base64_decode($key));
            }
            // If key not exists, we will generate and store new one into file and database
            if ( ! file_exists($res_keyfilepath)) {
                // Generation
                Util::mwExec("{$dropbearkeyPath} -t $keytype -f $res_keyfilepath");
                // Storing
                $new_key = base64_encode(file_get_contents($res_keyfilepath));
                $this->mikoPBXConfig->setGeneralSettings("$db_key", "$new_key");
            }
        }
        $ssh_port = escapeshellcmd($this->mikoPBXConfig->getGeneralSettings('SSHPort'));
        // Restart dropbear
        Util::killByName('dropbear');
        usleep(500000);
        Util::mwExec("{$dropbearPath} -p '{$ssh_port}' -c /etc/rc/hello > /var/log/dropbear_start.log");
        $this->generateAuthorizedKeys();
        $this->updateShellPassword();
    }

    /**
     * Stores authorized_keys from DB to files
     */
    public function generateAuthorizedKeys(): void
    {
        $ssh_dir = '/root/.ssh';
        Util::mwMkdir($ssh_dir);
        $conf_data = $this->mikoPBXConfig->getGeneralSettings('SSHAuthorizedKeys');
        file_put_contents("{$ssh_dir}/authorized_keys", $conf_data);
    }

    /**
     * Setups root user password
     **/
    public function updateShellPassword(): void
    {
        $password = $this->mikoPBXConfig->getGeneralSettings('SSHPassword');
        $echoPath = Util::which('echo');
        $chpasswdPath = Util::which('chpasswd');
        Util::mwExec("{$echoPath} \"root:$password\" | {$chpasswdPath}");
    }
}