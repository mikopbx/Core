<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;

class VoiceMailConf extends ConfigClass
{
    protected $description = 'voicemail.conf';

    protected function generateConfigProtected(): void
    {
        // Уважаемый ${VM_NAME}:\n\n\tВам пришло новое голосовое сообщение длиной ${VM_DUR}
        // под номером (number ${VM_MSGNUM})\nв ящик ${VM_MAILBOX} от ${VM_CALLERID}, в ${VM_DATE}. \n\t
        $emailsubject = $this->generalSettings['MailTplVoicemailSubject'];
        $emailsubject = str_replace(["\n", "\t"], '', $emailsubject);

        $emailbody = $this->generalSettings['MailTplVoicemailBody'];
        $emailbody = str_replace(["\n", "\t"], ['\n', ''], $emailbody);

        $from = $this->generalSettings['MailSMTPSenderAddress'];
        if (empty($from)) {
            $from =  $this->generalSettings['MailSMTPUsername'];
        }

        $timezone = $this->generalSettings['PBXTimezone'];
        $conf     = "[general]\n" .
            "format=wav49|gsm|wav\n" .
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
            "emailbody={$emailbody}\n" .
            "emaildateformat=%A, %d %B %Y в %H:%M:%S\n" .
            "pagerdateformat=%T %D\n" .
            "mailcmd=/usr/bin/msmtp --file=/etc/msmtp.conf -t\n" .
            "serveremail={$from}\n\n" .
            "[zonemessages]\n" .
            "local={$timezone}|'vm-received' q 'digits/at' H 'hours' M 'minutes'\n\n";

        $conf .= "[voicemailcontext]\n";

        $mail_box = $this->generalSettings['VoicemailNotificationsEmail'];
        if (empty($mail_box)) {
            $mail_box = $this->generalSettings['SystemNotificationsEmail'];
        }
        $conf .= "admin => admin," . Util::translate("user") . ",{$mail_box},,attach=yes|tz=local\n";
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

        Util::fileWriteContent($this->config->path('asterisk.confDir') . '/voicemail.conf', $conf);
    }
}