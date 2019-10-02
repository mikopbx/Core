<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2019
 */

class p_OtherConfigs extends ConfigClass{

    protected $description = 'other asterisk *.conf';

    /**
     * Создание конфигов.
     * @param $general_settings
     * @return bool
     */
    protected function generateConfigProtected($general_settings){
		// Генерация конфигурационных файлов. 
		$result = true;
		$this->asterisk_conf_generate();
		$this->logger_conf_generate();
		$this->ccss_conf_generate();
		// $this->cdr_manager_conf_generate();
		$this->musiconhold_conf_generate();
		$this->cdr_conf_generate();
		$this->acl_generate();
		$this->udptl_generate();
		$this->chan_dahdi_conf_generate();
		$this->cel_conf_generate();
		// $this->cdr_sqlite3_custom_conf_generate();
		// $this->cel_sqlite_custom_generate();
		$this->rtp_conf_generate($general_settings);
		$this->queuerules_generate();
		$this->voicemail_generate();

		return $result;
	}

    private function asterisk_conf_generate() {
		
        $util = new \Util();
        $path2dirs = $util->create_work_dirs();

        $config = new Config();
        $lang   = $config->get_general_settings('PBXLanguage');
		$conf = "[directories]\n".
				"astetcdir => /etc/asterisk\n".
				"astagidir => /etc/asterisk/agi-bin\n".
				"astkeydir => /etc/asterisk\n".
				"astrundir => /var/asterisk/run\n".
				"astmoddir => /offload/asterisk/modules\n".
				"astvarlibdir => {$path2dirs['datapath']}\n".
				"astdbdir => {$path2dirs['dbpath']}\n".
				"astlogdir => {$path2dirs['astlogpath']}\n".
				"astspooldir => {$path2dirs['astspoolpath']}\n".
				"\n".
				"\n".
				"[options]\n".
				"verbose = 0\n".
				"debug = 0\n".
				"dumpcore = no\n".
				"internal_timing = yes\n".
				"hideconnect = yes\n".
				"defaultlanguage = {$lang}\n".
				"lockmode=flock\n".
				"systemname = mikopbx\n";

        Util::file_write_content($this->astConfDir."/asterisk.conf", $conf);
	}

	private function logger_conf_generate(){
		$conf  = "[general]\n";
		$conf .= "queue_log = no\n";
		$conf .= "event_log = no\n";
		$conf .= "dateformat = %F %T\n\n";
		$conf .= "[logfiles]\n";
		$conf .= "syslog.local0 => notice,warning,error\n";
		$conf .= "console => debug,error,verbose(10)\n\n";

        Util::file_write_content($this->astConfDir."/logger.conf", $conf);
	}

	private function ccss_conf_generate(){
		$conf  = "[general]\n".
				 "cc_max_requests = 20\n";

		file_put_contents($this->astConfDir."/ccss.conf", $conf);
	}

    public function cdr_manager_conf_generate(){
		$conf = "[general]\n".
				"enabled=yes\n".
				"\n".
				"[mappings]\n".
				"linkedid => linkedid\n".
				"recordingfile => recordingfile\n\n";

        Util::file_write_content($this->astConfDir."/cdr_manager.conf", $conf);
	}

	private function musiconhold_conf_generate(){
		$mohpath = "/offload/asterisk/moh";
		
		$conf    = "[default]\n".
				   "mode=files\n".
				   "directory=$mohpath\n\n";

        Util::file_write_content($this->astConfDir."/musiconhold.conf", $conf);
	}
	
	private function cdr_conf_generate(){
		$conf = "[general]\n".
				"enable=yes\n".
				"unanswered=yes\n\n".
				"[sqlite]\n".
				"usegmtime=no\n".
				"loguniqueid=yes\n".
				"loguserfield=yes\n";
		file_put_contents($this->astConfDir."/cdr.conf", $conf);
	}

	private function acl_generate(){
		$conf = '';
		file_put_contents($this->astConfDir."/acl.conf", $conf);
	}

	private function udptl_generate(){
		$conf = '';
		file_put_contents($this->astConfDir."/udptl.conf", $conf);
	}

	private function chan_dahdi_conf_generate(){
		$conf = "[trunkgroups]\n".
				"[channels]\n".
				"";
		file_put_contents($this->astConfDir."/chan_dahdi.conf", $conf);
	}

	public function cel_conf_generate(){
		$conf = "[general]\n".
				"enable=yes\n".
				//"apps=all\n".
				"events=BRIDGE_ENTER,BRIDGE_EXIT\n".
				"dateformat = %F %T\n\n".
				"[manager]\n".
				"enabled = yes\n\n";
        Util::file_write_content($this->astConfDir."/cel.conf", $conf);
	}

    public function cdr_sqlite3_custom_conf_generate(){
		$cal = 'start, answer, end, clid, src, dst, dnid, dcontext, channel, dstchannel, lastapp, lastdata, duration, billsec, disposition, amaflags, accountcode, uniqueid, userfield, recordingfile, linkedid';
		$columns = explode(', ', $cal);
		$values    = '';
		foreach ($columns as $key => $value){
			$values.= ($values == '')? "" : ",";
			$values.= "'\${CDR($value)}'";
		}
		
		$conf = "[master]\n".
				"table=cdr\n".
				"columns => $cal \n".
				"values => $values \n";	
			
		file_put_contents($this->astConfDir."/cdr_sqlite3_custom.conf", $conf);
	}

	public function cel_sqlite_custom_generate(){
		$cal = "eventtype, eventtime, cidname, cidnum, cidani, cidrdnis, ciddnid, context, exten, channame, appname, appdata, amaflags, accountcode, uniqueid, userfield, peer, userdeftype, eventextra, linkedid";
		$values  = '\'${eventtype}\',\'${eventtime}\',\'${CALLERID(name)}\',\'${CALLERID(num)}\',\'${CALLERID(ANI)}\',\'${CALLERID(RDNIS)}\',\'${CALLERID(DNID)}\',\'${CHANNEL(context)}\',\'${CHANNEL(exten)}\',\'${CHANNEL(channame)}\',\'${CHANNEL(appname)}\',\'${CHANNEL(appdata)}\',\'${CHANNEL(amaflags)}\',\'${CHANNEL(accountcode)}\',\'${CHANNEL(uniqueid)}\',\'${CHANNEL(userfield)}\',\'${BRIDGEPEER}\',\'${userdeftype}\',\'${eventextra}\',\'${CHANNEL(linkedid)}\'';

		$conf = "[master]\n".
				"table = cel\n".
				"columns => $cal \n".
				"values => $values \n";	

		file_put_contents($this->astConfDir."/cel_sqlite3_custom.conf", $conf);
	}

	private function rtp_conf_generate($settings){

		$conf = "[general]\n".
				"rtpstart={$settings['RTPPortFrom']}\n".
				"rtpend={$settings['RTPPortTo']}\n\n";

        Util::file_write_content($this->astConfDir."/rtp.conf", $conf);
	}

	private function queuerules_generate(){
		$conf = '';
		file_put_contents($this->astConfDir."/queuerules.conf", $conf);
	}

	public function voicemail_generate(){
        $config = new Config();
        // Уважаемый ${VM_NAME}:\n\n\tВам пришло новое голосовое сообщение длиной ${VM_DUR}
        // под номером (number ${VM_MSGNUM})\nв ящик ${VM_MAILBOX} от ${VM_CALLERID}, в ${VM_DATE}. \n\t
        $emailsubject = $config->get_general_settings('MailTplVoicemailSubject');
        $emailsubject = str_replace("\n", '', $emailsubject);
        $emailsubject = str_replace("\t", '', $emailsubject);

        $emailbody = $config->get_general_settings('MailTplVoicemailBody');
        $emailbody = str_replace("\n", '\n', $emailbody);
        $emailbody = str_replace("\t", '', $emailbody);

        $from = $config->get_general_settings('MailSMTPSenderAddress');
        if(empty($MailSMTPSenderAddress)){
            $from = $config->get_general_settings('MailSMTPUsername');
        }

        $timezone = $config->get_general_settings('PBXTimezone');
		$conf = "[general]\n".
                "format=wav49|gsm|wav\n".
                "attach=yes\n".
                "maxmsg=100\n".
                "maxsecs=120\n".
                "maxgreet=60\n".
                "maxsilence=10\n".
                "silencethreshold=128\n".
                "maxlogins=3\n".
                "moveheard=yes\n".
                "charset=UTF-8\n".
                "pbxskip=yes\n".
                "fromstring=VoiceMail\n".
                "emailsubject={$emailsubject}\n".
                "emailbody={$emailbody}\n".
                "emaildateformat=%A, %d %B %Y в %H:%M:%S\n".
                "pagerdateformat=%T %D\n".
                "mailcmd=/usr/bin/msmtp --file=/etc/msmtp.conf -t\n".
                "serveremail={$from}\n\n".
                "[zonemessages]\n".
                "local={$timezone}|'vm-received' q 'digits/at' H 'hours' M 'minutes'\n\n";

        $conf.= "[voicemailcontext]\n";

        $mail_box = $config->get_general_settings('VoicemailNotificationsEmail');
        if(empty($mail_box)){
            $mail_box = $config->get_general_settings('SystemNotificationsEmail');
        }
        $conf.= "admin => admin,".Util::translate("user").",{$mail_box},,attach=yes|tz=local\n";
        /*
        $peers = Models\Sip::find('type="peer"');
        foreach ($peers as $peer){
            $username = $peer->extension;
            $mail_box = '';
            $exten = Models\Extensions::findFirst("number='{$username}'");
            if($exten != null){
                $user = Models\Users::findFirst("id='{$exten->userid}'");
                if($user != null){
                    $username = $user->username;
                    $mail_box = $user->email;
                }
            }

            // $conf.= "{$peer->extension} => {$peer->extension},{$username},{$mail_box},,attach=yes|tz=local|delete=yes\n";
            $conf.= "{$peer->extension} => {$peer->extension},{$username},{$mail_box},,attach=yes|tz=local\n";
        }
        //*/

        Util::file_write_content($this->astConfDir."/voicemail.conf", $conf);

	}

}