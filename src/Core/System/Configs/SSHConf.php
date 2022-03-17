<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
     * Configure SSH settings
     **/
    public function configure(): bool
    {
        if(Util::isSystemctl() && ! Util::isDocker()){
            // Не настраиваем.
            return true;
        }
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
        $password       = $this->mikoPBXConfig->getGeneralSettings('SSHPassword');
        $hashString     = $this->mikoPBXConfig->getGeneralSettings('SSHPasswordHashString');
        $echoPath       = Util::which('echo');
        $chpasswdPath   = Util::which('chpasswd');
        Processes::mwExec("{$echoPath} \"root:$password\" | {$chpasswdPath}");
        $this->mikoPBXConfig->setGeneralSettings('SSHPasswordHash',       md5_file('/etc/passwd'));
        if($hashString !== md5($password)){
            $this->mikoPBXConfig->setGeneralSettings('SSHPasswordHashString', md5($password));
            $this->sendNotify('Attention! SSH password changed!', ['The password for SSH access to the PBX has been changed']);
            unlink(self::CHECK_PASSWORD_FILE);
        }
    }

    /**
     * @param $subject
     * @param $messages
     * @return void
     */
    private function sendNotify($subject, $messages):void
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
     * Проверка пароля на случай, если он был изменен не обычным способом (взлом системы).
     * @return void
     */
    public static function checkPassword():void
    {
        $enableNotify = true;
        $data = stat(self::CHECK_PASSWORD_FILE);
        if(is_array($data)){
            $enableNotify = (time() - stat('/etc/asterisk/asterisk.conf')['mtime']??0) > 60*60*4;
        }
        $messages   = [];
        $password   = PbxSettings::getValueByKey('SSHPassword');
        $hashString = PbxSettings::getValueByKey('SSHPasswordHashString');
        $hashFile   = PbxSettings::getValueByKey('SSHPasswordHash');
        if($hashString !== md5($password)){
            // Изменился пароль. Не обычным способом.
            $messages[] = 'The SSH password was not changed from the web interface.';
        }
        if($hashFile   !== md5_file('/etc/passwd')){
            // Системный пароль не соответствует тому, что установлен в конфигурационном файле.
            $messages[] = 'The system password does not match what is set in the configuration file.';
        }
        if(!empty($messages) && $enableNotify){
            file_put_contents(self::CHECK_PASSWORD_FILE, time());
            $SSHConf = new SSHConf();
            $SSHConf->sendNotify('Attention! SSH password compromised', $messages);
        }
    }
}