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


use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Notifications;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
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
    public const CHECK_PASSWORD_FILE = '/var/etc/last-check-password';

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
            "rsa"   => "SSHRsaKey",
            "dss"   => "SSHDssKey",
            "ecdsa" => "SSHecdsaKey"
        ];

        $options = ($this->mikoPBXConfig->getGeneralSettings('SSHDisablePasswordLogins') === '1')?'-s':'';
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
        $ssh_port = escapeshellcmd($this->mikoPBXConfig->getGeneralSettings('SSHPort'));
        // Restart dropbear
        $this->updateShellPassword();

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
        $conf_data = $this->mikoPBXConfig->getGeneralSettings('SSHAuthorizedKeys');
        file_put_contents("{$ssh_dir}/authorized_keys", $conf_data);
    }

    /**
     * Sets up the root user password.
     *
     * @return void
     */
    public function updateShellPassword(): void
    {
        $password           = $this->mikoPBXConfig->getGeneralSettings('SSHPassword');
        $hashString         = $this->mikoPBXConfig->getGeneralSettings('SSHPasswordHashString');
        $disablePassLogin   = $this->mikoPBXConfig->getGeneralSettings('SSHDisablePasswordLogins');

        $echoPath       = Util::which('echo');
        $chPasswdPath   = Util::which('chpasswd');
        $passwdPath   = Util::which('passwd');
        Processes::mwExec("{$passwdPath} -l www");
        if($disablePassLogin === '1'){
            Processes::mwExec("{$passwdPath} -l root");
        }else{
            Processes::mwExec("{$echoPath} 'root:$password' | {$chPasswdPath}");
        }
        $this->mikoPBXConfig->setGeneralSettings('SSHPasswordHash',       md5_file('/etc/passwd'));
        if($hashString !== md5($password)){
            $this->mikoPBXConfig->setGeneralSettings('SSHPasswordHashString', md5($password));
            $this->sendNotify('Attention! SSH password changed!', ['The password for SSH access to the PBX has been changed']);
            if(file_exists(self::CHECK_PASSWORD_FILE)){
                unlink(self::CHECK_PASSWORD_FILE);
            }
        }
    }

    /**
     * Sends a notification email.
     *
     * @param string $subject
     * @param array  $messages
     * @return void
     */
    private function sendNotify(string $subject, array $messages):void
    {
        if(!Notifications::checkConnection(Notifications::TYPE_PHP_MAILER)){
            return;
        }
        $subject = Util::translate($subject, false);
        $text = '';
        foreach ($messages as $message){
            $text .= PHP_EOL.Util::translate($message, false);
        }
        $adminMail = $this->mikoPBXConfig->getGeneralSettings('SystemNotificationsEmail');
        $notify = new Notifications();
        $notify->sendMail($adminMail, $subject, trim($text));
    }

    /**
     * Checks the password in case it was changed by an unauthorized means.
     *
     * @return void
     */
    public static function checkPassword():void
    {
        $enableNotify = true;

        if(file_exists(self::CHECK_PASSWORD_FILE)){
            $data = stat(self::CHECK_PASSWORD_FILE);
            if(is_array($data)){
                $enableNotify = (time() - stat(self::CHECK_PASSWORD_FILE)['mtime']??0) > 60*60*4;
            }
        }
        if(!$enableNotify){
            return;
        }
        $messages   = [];
        $password   = PbxSettings::getValueByKey('SSHPassword');
        $hashString = PbxSettings::getValueByKey('SSHPasswordHashString');
        $hashFile   = PbxSettings::getValueByKey('SSHPasswordHash');
        if($hashString !== md5($password)){
            // The password has been changed in an unusual way.
            $messages[] = 'The SSH password was not changed from the web interface.';
        }
        if($hashFile   !== md5_file('/etc/passwd')){
            // The system password does not match what is set in the configuration file.
            $messages[] = 'The system password does not match what is set in the configuration file.';
        }
        if(!empty($messages)){
            file_put_contents(self::CHECK_PASSWORD_FILE, time());
            $SSHConf = new SSHConf();
            $SSHConf->sendNotify('Attention! SSH password compromised', $messages);
        }
    }
}