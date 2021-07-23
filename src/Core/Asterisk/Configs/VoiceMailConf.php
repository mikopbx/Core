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


use MikoPBX\Core\System\Util;

class VoiceMailConf extends CoreConfigClass
{
    protected string $description = 'voicemail.conf';

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
        $msmtpPath = Util::which('msmtp');

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
            "mailcmd={$msmtpPath} --file=/etc/msmtp.conf -t\n" .
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
}