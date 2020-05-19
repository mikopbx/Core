<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\Core\System\{System, Util};

class OtherConf extends ConfigClass
{

    protected $description = 'other asterisk *.conf';

    public function cdrManagerConfGenerate()
    {
        $conf = "[general]\n" .
            "enabled=yes\n" .
            "\n" .
            "[mappings]\n" .
            "linkedid => linkedid\n" .
            "recordingfile => recordingfile\n\n";

        Util::fileWriteContent($this->astConfDir . "/cdr_manager.conf", $conf);
    }

    public function cdrSqlite3CustomConfGenerate()
    {
        $cal     = 'start, answer, end, clid, src, dst, dnid, dcontext, channel, dstchannel, lastapp, lastdata, duration, billsec, disposition, amaflags, accountcode, uniqueid, userfield, recordingfile, linkedid';
        $columns = explode(', ', $cal);
        $values  = '';
        foreach ($columns as $key => $value) {
            $values .= ($values == '') ? "" : ",";
            $values .= "'\${CDR($value)}'";
        }

        $conf = "[master]\n" .
            "table=cdr\n" .
            "columns => $cal \n" .
            "values => $values \n";

        file_put_contents($this->astConfDir . "/cdr_sqlite3_custom.conf", $conf);
    }

    public function celSqliteCustomGenerate()
    {
        $cal    = "eventtype, eventtime, cidname, cidnum, cidani, cidrdnis, ciddnid, context, exten, channame, appname, appdata, amaflags, accountcode, uniqueid, userfield, peer, userdeftype, eventextra, linkedid";
        $values = '\'${eventtype}\',\'${eventtime}\',\'${CALLERID(name)}\',\'${CALLERID(num)}\',\'${CALLERID(ANI)}\',\'${CALLERID(RDNIS)}\',\'${CALLERID(DNID)}\',\'${CHANNEL(context)}\',\'${CHANNEL(exten)}\',\'${CHANNEL(channame)}\',\'${CHANNEL(appname)}\',\'${CHANNEL(appdata)}\',\'${CHANNEL(amaflags)}\',\'${CHANNEL(accountcode)}\',\'${CHANNEL(uniqueid)}\',\'${CHANNEL(userfield)}\',\'${BRIDGEPEER}\',\'${userdeftype}\',\'${eventextra}\',\'${CHANNEL(linkedid)}\'';

        $conf = "[master]\n" .
            "table = cel\n" .
            "columns => $cal \n" .
            "values => $values \n";

        file_put_contents($this->astConfDir . "/cel_sqlite3_custom.conf", $conf);
    }

    /**
     * Создание конфигов.
     *
     * @return void
     */
    protected function generateConfigProtected():void
    {
        // Генерация конфигурационных файлов.
        $this->asteriskConfGenerate();
        $this->loggerConfGenerate();
        $this->ccssConfGenerate();
        // $this->cdrManagerConfGenerate();
        $this->musicOnHoldConfGenerate();
        $this->cdrConfGenerate();
        $this->aclGenerate();
        $this->udptlGenerate();
        $this->chanDahdiConfGenerate();
        $this->celConfGenerate();
        // $this->cdrSqlite3CustomConfGenerate();
        // $this->celSqliteCustomGenerate();
        $this->rtpConfGenerate();
        $this->queueRulesConfGenerate();
        $this->voiceMailConfGenerate();

    }

    private function asteriskConfGenerate(): void
    {
        $dirsConfig = $this->di->getShared('config');

        $lang = $this->generalSettings['PBXLanguage'];
        $conf = "[directories]\n" .
            "astetcdir => /etc/asterisk\n" .
            "astagidir => {$dirsConfig->path('asterisk.astagidir')}\n" .
            "astkeydir => /etc/asterisk\n" .
            "astrundir => /var/asterisk/run\n" .
            "astmoddir => {$dirsConfig->path('asterisk.astmoddir')}\n" .
            "astvarlibdir => {$dirsConfig->path('asterisk.astvarlibdir')}\n" .
            "astdbdir => {$dirsConfig->path('asterisk.astdbdir')}\n" .
            "astlogdir => {$dirsConfig->path('asterisk.astlogdir')}\n" .
            "astspooldir => {$dirsConfig->path('asterisk.astspooldir')}\n" .
            "\n" .
            "\n" .
            "[options]\n" .
            "verbose = 0\n" .
            "debug = 0\n" .
            "dumpcore = no\n" .
            "internal_timing = yes\n" .
            "hideconnect = yes\n" .
            "defaultlanguage = {$lang}\n" .
            "lockmode=flock\n" .
            "systemname = mikopbx\n";

        Util::fileWriteContent($this->astConfDir . '/asterisk.conf', $conf);
    }

    private function loggerConfGenerate(): void
    {
        $logdir = System::getLogDir() . '/asterisk/';
        if ( ! file_exists($logdir) && ! mkdir($logdir, 0777, true) && ! is_dir($logdir)) {
            $logdir = '';
        }
        $conf = "[general]\n";
        $conf .= "queue_log = no\n";
        $conf .= "event_log = no\n";
        $conf .= "dateformat = %F %T\n";
        $conf .= "\n";
        $conf .= "[logfiles]\n";
        // $conf .= "syslog.local0 => notice,warning,error\n";
        $conf .= "console => debug,error,verbose(10)\n\n";
        $conf .= "{$logdir}security_log => security\n";
        $conf .= "{$logdir}messages => notice,warning\n";
        $conf .= "{$logdir}error => error\n";
        $conf .= "\n";

        Util::fileWriteContent($this->astConfDir . '/logger.conf', $conf);
    }

    private function ccssConfGenerate(): void
    {
        $conf = "[general]\n" .
            "cc_max_requests = 20\n";

        file_put_contents($this->astConfDir . '/ccss.conf', $conf);
    }

    private function musicOnHoldConfGenerate(): void
    {
        $dirsConfig = $this->di->getShared('config');
        $mohpath    = $dirsConfig->path('asterisk.mohdir');

        $conf = "[default]\n" .
            "mode=files\n" .
            "directory=$mohpath\n\n";

        Util::fileWriteContent($this->astConfDir . '/musiconhold.conf', $conf);
    }

    private function cdrConfGenerate(): void
    {
        $conf = "[general]\n" .
            "enable=yes\n" .
            "unanswered=yes\n\n" .
            "[sqlite]\n" .
            "usegmtime=no\n" .
            "loguniqueid=yes\n" .
            "loguserfield=yes\n";
        file_put_contents($this->astConfDir . '/cdr.conf', $conf);
    }

    private function aclGenerate(): void
    {
        $conf = '';
        file_put_contents($this->astConfDir . '/acl.conf', $conf);
    }

    private function udptlGenerate(): void
    {
        $conf = '';
        file_put_contents($this->astConfDir . '/udptl.conf', $conf);
    }

    private function chanDahdiConfGenerate(): void
    {
        $conf = "[trunkgroups]\n" .
            "[channels]\n" .
            "";
        file_put_contents($this->astConfDir . '/chan_dahdi.conf', $conf);
    }

    public function celConfGenerate(): void
    {
        $conf = "[general]\n" .
            "enable=yes\n" .
            //"apps=all\n".
            "events=BRIDGE_ENTER,BRIDGE_EXIT\n" .
            "dateformat = %F %T\n\n" .
            "[manager]\n" .
            "enabled = yes\n\n";
        Util::fileWriteContent($this->astConfDir . '/cel.conf', $conf);
    }

    private function rtpConfGenerate(): void
    {
        $conf = "[general]\n" .
            "rtpstart={$this->generalSettings['RTPPortFrom']}\n" .
            "rtpend={$this->generalSettings['RTPPortTo']}\n\n";

        Util::fileWriteContent($this->astConfDir . '/rtp.conf', $conf);
    }

    private function queueRulesConfGenerate(): void
    {
        $conf = '';
        file_put_contents($this->astConfDir . '/queuerules.conf', $conf);
    }

    public function voiceMailConfGenerate(): void
    {
        // Уважаемый ${VM_NAME}:\n\n\tВам пришло новое голосовое сообщение длиной ${VM_DUR}
        // под номером (number ${VM_MSGNUM})\nв ящик ${VM_MAILBOX} от ${VM_CALLERID}, в ${VM_DATE}. \n\t
        $emailsubject = $this->generalSettings['MailTplVoicemailSubject'];
        $emailsubject = str_replace("\n", '', $emailsubject);
        $emailsubject = str_replace("\t", '', $emailsubject);

        $emailbody = $this->generalSettings['MailTplVoicemailBody'];
        $emailbody = str_replace("\n", '\n', $emailbody);
        $emailbody = str_replace("\t", '', $emailbody);

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

        Util::fileWriteContent($this->astConfDir . '/voicemail.conf', $conf);
    }

}