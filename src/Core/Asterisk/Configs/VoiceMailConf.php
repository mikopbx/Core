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

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\{Sip,Extensions,Users};
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\Util;

class VoiceMailConf extends CoreConfigClass
{
    protected string $description = 'voicemail.conf';

    /**
     * Prepares additional contexts sections in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        $conf  = "[voice_mail_peer] \n";
        $conf .= 'exten => voicemail,1,Answer()' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL:0:5}" == "Local"]?Set(pl=${IF($["${CHANNEL:-1}" == "1"]?2:1)}))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL:0:5}" == "Local"]?Set(bridgePeer=${IMPORT(${CUT(CHANNEL,\;,1)}\;${pl},BRIDGEPEER)}))' . "\n\t";
        $conf .= 'same => n,ExecIf($[ "${FROM_CHAN}" == "${bridgePeer}" ]?ChannelRedirect(${bridgePeer},${CONTEXT},${EXTEN},2))' . "\n\t";
        $conf .= 'same => n,AGI(/usr/www/src/Core/Asterisk/agi-bin/clean_timeout.php)' . "\n\t";
        $conf .= 'same => n,Gosub(voicemail_start,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,VoiceMail(admin@voicemailcontext)' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        return  $conf;
    }

    protected function generateConfigProtected(): void
    {
        // Уважаемый ${VM_NAME}:\n\n\tВам пришло новое голосовое сообщение длиной ${VM_DUR}
        // под номером (number ${VM_MSGNUM})\nв ящик ${VM_MAILBOX} от ${VM_CALLERID}, в ${VM_DATE}. \n\t
        $emailsubject = $this->generalSettings['MailTplVoicemailSubject'];
        $emailsubject = str_replace(["\n", "\t"], '', $emailsubject);

        $emailbody = $this->generalSettings['MailTplVoicemailBody'];
        $emailbody = str_replace(["\n", "\t"], ['\n', ''], $emailbody);

        $emailfooter = $this->generalSettings['MailTplVoicemailFooter'];
        $emailfooter = str_replace(["\n", "\t"], ['\n', ''], $emailfooter);

        $from = $this->generalSettings['MailSMTPSenderAddress'];
        if (empty($from)) {
            $from =  $this->generalSettings['MailSMTPUsername'];
        }

        $timezone = $this->generalSettings['PBXTimezone'];
        $msmtpPath = Util::which('voicemail-sender');

        $conf     = "[general]\n" .
            "format=wav\n" .
            "attach=yes\n" .
            "maxmsg=100\n" .
            "maxsecs=120\n" .
            "maxgreet=60\n" .
            "maxsilence=10\n" .
            "silencethreshold=128\n" .
            "maxlogins=3\n" .
            "moveheard=yes\n" .
            "charset=UTF-8\n" .
            "pbxskip=yes\n" .
            "fromstring=VoiceMail\n" .
            "emailsubject={$emailsubject}\n" .
            "emailbody={$emailbody}".'\n\n'."{$emailfooter}\n" .
            "emaildateformat=%A, %d %B %Y в %H:%M:%S\n" .
            "pagerdateformat=%T %D\n" .
            // "mailcmd={$msmtpPath} --file=/etc/msmtp.conf -t\n" .
            "mailcmd={$msmtpPath}\n" .
            "serveremail={$from}\n\n" .
            "[zonemessages]\n" .
            "local={$timezone}|'vm-received' q 'digits/at' H 'hours' M 'minutes'\n\n";

        $conf .= "[voicemailcontext]\n";

        $mail_box = $this->generalSettings['VoicemailNotificationsEmail'];
        if (empty($mail_box)) {
            $mail_box = $this->generalSettings['SystemNotificationsEmail'];
        }
        $conf .= "admin => admin," . Util::translate("user") . ",{$mail_box},,attach=yes|tz=local|delete=yes\n";
        /*
        $peers = Sip::find('type="peer"');
        foreach ($peers as $peer){
            $username = $peer->extension;
            $mail_box = '';
            $exten = Extensions::findFirst("number='{$username}'");
            if($exten !== null){
                $user = Users::findFirst("id='{$exten->userid}'");
                if($user !== null){
                    $username = $user->username;
                    $mail_box = $user->email;
                }
            }

            // $conf.= "{$peer->extension} => {$peer->extension},{$username},{$mail_box},,attach=yes|tz=local|delete=yes\n";
            $conf.= "{$peer->extension} => {$peer->extension},{$username},{$mail_box},,attach=yes|tz=local\n";
        }
        //*/

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/voicemail.conf', $conf);
    }

    /**
     * @param      $srcFileName
     * @param      $time
     * @param bool $copy
     * @return string
     */
    public static function getCopyFilename($srcFileName, $linkedId, $time, bool $copy = true):string{
        $filename = Util::trimExtensionForFile($srcFileName) . '.wav';
        $recordingFile = '';
        // Переопределим путь к файлу записи разговора. Для конферецнии файл один.
        $monitor_dir = Storage::getMonitorDir();
        $sub_dir     = date('Y/m/d', $time);
        $dirName = "$monitor_dir/$sub_dir/INBOX/";
        if(Util::mwMkdir($dirName)){
            $recordingFile = $dirName.$linkedId.'.wav';
            $cpPath = Util::which('cp');
            if($copy === true){
                Processes::mwExec("{$cpPath} {$filename} {$recordingFile}");
            }
            if($copy === true && !file_exists($recordingFile)){
                $recordingFile = '';
            }else{
                $recordingFile = Util::trimExtensionForFile($recordingFile) . '.mp3';
            }
        }
        return $recordingFile;
    }

}
