<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2019
 */

use Models\NetworkFilters;

require_once 'globals.php';

class PBX {
	private $arrObject;
	private $arr_gs;
	private $config;

    /**
     * PBX constructor.
     */
	public function __construct() {
		global $g;
		// Получение настроек.
        $this->config = new Config();
		$this->arr_gs = $this->config->get_general_settings();

		// Инициализация вспомогательных классов. 
		$this->arrObject = self::init_modules($g);
	}

    /**
     * Возвращает массив инициализированных модулей АТС.
     * @param $g
     * @return array
     */
	public static function init_modules($g) :array {
	    $arrObject = [];
        $arr = array(
            'p_ExternalPhones',
            'p_OtherConfigs',
            'p_SIP',
            'p_IAX',
            'p_IVR',
            'p_Park',
            'p_Conference',
            'p_Queue',
            'p_DialplanApplication',
            'p_MikoAjam',
        );
        // Подключение классов.
        foreach ($arr as $value) {
            if (class_exists($value)){
                $arrObject[] = new $value($g);
            }
        }
        $modules = Models\PbxExtensionModules::find('disabled=0');
        foreach ($modules as $value) {
            $class_name = str_replace('Module', '', $value->uniqid);
            $path_class  = "\\Modules\\{$value->uniqid}\\Lib\\{$class_name}";
            if (class_exists($path_class)){
                $arrObject[] = new $path_class($g);
            }
        }
        return $arrObject;
    }
	
	/**
	 * Generates all Asterisk configuration files and (re)starts the Asterisk process
	 */
	public function configure() :array {
		global $g;
        $result = array(
            'result'  => 'ERROR'
        );

		if (!$g['booting']) {
			self::stop();
		}
		/**
			Создание конфигурационных файлов.
		*/
		if ($g['booting']) {echo '   |- generate modules.conf... ';}
		$this->modules_conf_generate();
		if ($g['booting']) {echo "\033[32;1mdone\033[0m \n";}
				
		if ($g['booting']) {echo '   |- generate manager.conf... ';}
		$this->manager_conf_generate();
        $this->http_conf_generate();
		if ($g['booting']) {echo "\033[32;1mdone\033[0m \n";}

		foreach ($this->arrObject as $appClass) {
			$appClass->generateConfig($this->arr_gs);
		}
		$this->features_generate();
		$this->indication_conf_generate();

		if ($g['booting']) {echo '   |- generate extensions.conf... ';}
        $this->dialplan_reload();
		if ($g['booting']) {echo "\033[32;1mdone\033[0m \n";}

        // Создание базы данных истории звонков.
        /** @var Phalcon\Di\FactoryDefault $g['m_di'] */
        /** @var Phalcon\Db\Adapter\Pdo\Sqlite $connection */
        $connection = $g['m_di']->get('dbCDR');
        if (!$connection->tableExists('cdr')) {
            Cdr::create_db();
            Util::CreateLogDB();
            init_db($g['m_di'], $g['phalcon_settings']);
        }else{
            Cdr::check_db();
        }

        if ($g['booting']) {echo '   |- starting Asterisk... ';}
		self::start($g['booting']);
		if ($g['booting']) {echo "\033[32;1mdone\033[0m \n";}

		$this->modules_start();

		$result['result'] = 'Success';
        return $result;
	}

    /**
     * Старт сервиса работы с модулями.
     */
    private function modules_start():void {
        Util::mwexec_bg('/usr/bin/php -f /etc/inc/workers/module_monitor.php');
    }

    /**
     * Возвращает массив с путями к директориям asterisk.
     * @return array
     */
	public static function get_asterisk_dirs() : array {
		global $g;
		$path2dirs = [];
		$path2dirs['datapath'] 	   = '/offload/asterisk';
		if( Storage::is_storage_disk_mounted() ){
			$mount_point = Storage::get_media_dir();
			$path2dirs['media'] 	     = "$mount_point/{$g['pt1c_pbx_name']}/media";
			$path2dirs['dbpath'] 	     = "$mount_point/{$g['pt1c_pbx_name']}/persistence";
			$path2dirs['astlogpath']     = "$mount_point/{$g['pt1c_pbx_name']}/astlogs/asterisk";
			$path2dirs['astspoolpath']   = "$mount_point/{$g['pt1c_pbx_name']}/voicemailarchive";
			$path2dirs['backup']         = "$mount_point/{$g['pt1c_pbx_name']}/backup";
			$path2dirs['tmp']            = "$mount_point/{$g['pt1c_pbx_name']}/tmp";
			$path2dirs['custom_modules'] = "$mount_point/{$g['pt1c_pbx_name']}/custom_modules";
			$path2dirs['cache_js_dir']   = "$mount_point/{$g['pt1c_pbx_name']}/cache_js_dir";
			$path2dirs['cache_css_dir']  = "$mount_point/{$g['pt1c_pbx_name']}/cache_css_dir";
			$path2dirs['cache_img_dir']  = "$mount_point/{$g['pt1c_pbx_name']}/cache_img_dir";
            $path2dirs['php_session']    = "$mount_point/{$g['pt1c_pbx_name']}/php_session";
			$g['pt1c_cdr_db_path'] 	     = "$mount_point/{$g['pt1c_pbx_name']}/astlogs/asterisk/cdr.db";

			if(is_link('/ultmp') === false){
                // Создадим сссылку на диск с данными.
			    Util::mwexec('rm -rf /ultmp');
                symlink($path2dirs['tmp'], '/ultmp');
            }
		}else{
            $path2dirs = self::get_asterisk_dirs_mem();
		}

        $path2dirs['download_link'] = '/var/spool/download_link';
		return $path2dirs;
	}

	public static function get_asterisk_dirs_mem():array {
        $path2dirs = [];
        $path2dirs['dbpath'] 	     = '/etc/asterisk/db';
        $path2dirs['astlogpath']     = '/var/asterisk/log';
        $path2dirs['media'] 	     = '/var/asterisk/spool/media';
        $path2dirs['astspoolpath']   = '/var/asterisk/spool';
        $path2dirs['backup'] 	     = '/var/asterisk/backup';
        $path2dirs['tmp'] 	         = '/ultmp';
        $path2dirs['custom_modules'] = '/var/asterisk/custom_modules';
        $path2dirs['php_session']    = '/var/tmp/php';
        $path2dirs['cache_js_dir']   = '/var/cache/www/cache_js_dir';
        $path2dirs['cache_css_dir']  = '/var/cache/www/cache_css_dir';
        $path2dirs['cache_img_dir']  = '/var/cache/www/cache_img_dir';

        return $path2dirs;
    }

    /**
     * Запуск процесса Asterisk.
     * @param bool $booting
     */
	public static function start($booting = false) :void {
		Util::mwexec_bg('/usr/sbin/safe_asterisk -fn');
		$sys = new System();
		$sys->cron_configure($booting);
	}

    /**
     * Остановка процесса Asterisk.
     */
	public static function stop() :void {
		Util::killbyname('safe_asterisk');
		sleep(1);
		Util::mwexec("asterisk -rx 'core stop now'");
        Util::process_worker('','', 'worker_call_events','stop');
        Util::process_worker('','', 'worker_ami_listener','stop');
        Util::killbyname('asterisk');
	}

    /**
     * Запуск генератора dialplan.
     * @return array
     */
	public function dialplan_reload() :array {
        global $g;
        $result = array(
            'result'  => 'ERROR'
        );

        $extensions = new Extensions($this->arrObject);
        $extensions->generate();
        if ($g['booting'] !== true){
            Util::mwexec("asterisk -rx 'dialplan reload'");
            Util::mwexec("asterisk -rx 'module reload pbx_lua.so'");
        }

        $result['result'] = 'Success';
        return $result;
    }

    /**
     * Перезапуск процесса Asterisk.
     */
	public static function restart() :void {
		self::stop();
		self::start();
	}

    /**
     * Создание конфига modules.conf
     */
	private function modules_conf_generate() :void {
		$conf = "[modules]\n".
				"autoload=no\n";
		$modules  = [];
		$modules[]='app_mixmonitor.so';
		$modules[]='app_cdr.so';
        $modules[]='app_exec.so';
        $modules[]='app_dial.so';
        $modules[]='app_directed_pickup.so';
        $modules[]='app_echo.so';
        $modules[]='app_meetme.so';
        $modules[]='app_milliwatt.so';
        $modules[]='app_originate.so';
        $modules[]='app_playback.so';
        $modules[]='app_playtones.so';
        $modules[]='app_read.so';
        $modules[]='app_stack.so';
        $modules[]='app_verbose.so';
        $modules[]='app_voicemail.so';
        $modules[]='chan_dahdi.so';
        $modules[]='chan_iax2.so';
        $modules[]='chan_sip.so';

        $modules[]='codec_alaw.so';
        $modules[]='codec_dahdi.so';
        $modules[]='codec_g722.so';
        $modules[]='codec_g726.so';
        $modules[]='codec_gsm.so';
        $modules[]='codec_ulaw.so';
        $modules[]='codec_adpcm.so';

        $modules[]='format_gsm.so';
        $modules[]='format_pcm.so';
        $modules[]='format_wav.so';
        $modules[]='format_wav_gsm.so';
        $modules[]='format_ogg_vorbis.so';
        $modules[]='format_mp3.so';

        $modules[]='format_g726.so';
        $modules[]='format_h263.so';
        $modules[]='format_h264.so';
        $modules[]='format_g723.so';
        $modules[]='format_g719.so';

        $modules[]='func_callerid.so';
        $modules[]='func_channel.so';
        $modules[]='func_config.so';
        $modules[]='func_cut.so';
        $modules[]='func_cdr.so';
        $modules[]='func_devstate.so';
        $modules[]='func_db.so';
        $modules[]='func_logic.so';
        $modules[]='func_strings.so';
        $modules[]='pbx_config.so';
        $modules[]='pbx_loopback.so';
        $modules[]='pbx_spool.so';
        $modules[]='res_agi.so';
        $modules[]='res_limit.so';
        $modules[]='res_musiconhold.so';
        $modules[]='res_rtp_asterisk.so';
        $modules[]='res_srtp.so';
        $modules[]='res_timing_dahdi.so';
        $modules[]='res_mutestream.so';
        // $modules[]='cdr_sqlite3_custom.so';
        // $modules[]='cdr_manager.so';
        // $modules[]='cel_sqlite3_custom.so';
        $modules[]='func_timeout.so';
        $modules[]='res_parking.so';
        // $modules[]='app_authenticate.so';
        // $modules[]='app_page.so';
        $modules[]='app_queue.so';
        $modules[]='app_senddtmf.so';
        $modules[]='app_userevent.so';
        $modules[]='app_chanspy.so';
        // Необходимое для работы переадресаций.
        $modules[]='bridge_simple.so';
        // Прочие bridge модули. Один из них необходим для работы парковки.
        $modules[]='bridge_holding.so';
        $modules[]='bridge_builtin_features.so';
        $modules[]='bridge_builtin_interval_features.so';
        // $modules[]='bridge_native_rtp.so';
        // $modules[]='bridge_softmix.so';
        // $modules[]='chan_bridge_media.so';
        $modules[]='app_mp3.so';
        $modules[]='pbx_lua.so';
        $modules[]='app_stack.so';
        $modules[]='func_dialplan.so';

        if(file_exists('/offload/asterisk/modules/res_pjproject.so')){
            $modules[]='res_pjproject.so';
            $modules[]='res_speech.so';
            $modules[]='res_sorcery_astdb.so';
            $modules[]='res_sorcery_config.so';
            $modules[]='res_sorcery_memory.so';
            file_put_contents('/etc/asterisk/pjproject.conf', '');
            file_put_contents('/etc/asterisk/sorcery.conf', '');
        }else{
            $modules[]='app_macro.so';
        }

		foreach ($modules as $key => $value){
			$conf.= "load => $value\n";
		}

        Util::file_write_content('/etc/asterisk/modules.conf', $conf);
	}

    /**
     * Создание конфига indication.conf
     * @param string $country
     */
	private function indication_conf_generate($country = 'ru') :void{
		global $g;
		$data = file_get_contents("{$g['pt1c_etc_path']}/inc/sample_conf/indications.conf.sample");		
		$conf = str_replace('{country}', $country, $data);
        Util::file_write_content('/etc/asterisk/indications.conf', $conf);
	}

    /**
     * Создание конфига features.conf
     */
	private function features_generate() :void{

        $pickup_extension = Config::get_pickupexten();
		$conf = "[general]\n".
				"featuredigittimeout = {$this->arr_gs['PBXFeatureDigitTimeout']}\n".
				"atxfernoanswertimeout = {$this->arr_gs['PBXFeatureAtxferNoAnswerTimeout']}\n".
				"transferdigittimeout = 3\n".
				"pickupexten = {$pickup_extension}\n".
				"atxferabort = *0\n".
				"\n".
				"[featuremap]\n".
				"atxfer => {$this->arr_gs['PBXFeatureAttendedTransfer']}\n".
                "disconnect = *0\n".
				"blindxfer => {$this->arr_gs['PBXFeatureBlindTransfer']}\n";
		
		foreach ($this->arrObject as $appClass) {
			$conf .= $appClass->getfeaturemap();
		}

        Util::file_write_content('/etc/asterisk/features.conf', $conf);
	}

    /**
     * Перезапуск модуля features.
     * @return array
     */
    public static function features_reload() :array{
        $pbx = new PBX();
        $pbx->features_generate();
	    $result = [
            'result'  => 'Success'
        ];
        $arr_out = [];
        Util::mwexec("asterisk -rx 'module reload features'", $arr_out);
        $out = implode(' ', $arr_out);
        if(!"Module 'features' reloaded successfully." === $out){
            $result['result'] = 'ERROR';
        }
        $result['data'] = $out;
        return $result;
    }

    /**
     * Перезапуск большинства модулей asterisk.
     * @return array
     */
	public static function core_reload() :array{
        $pbx = new PBX();
        $pbx->features_generate();
	    $result = [
            'result'  => 'Success'
        ];
        $arr_out = array();
        Util::mwexec("asterisk -rx 'core reload'", $arr_out);
        $out = implode(' ', $arr_out);
        if('' !== $out){
            $result['result'] = 'ERROR';
        }
        $result['data'] = $out;
        return $result;
    }

    /**
     * Перезапуск manager модуля.
     * @return array
     */
    public static function manager_reload() :array {
        $pbx = new PBX();
        $pbx->manager_conf_generate();
        $pbx->http_conf_generate();

        $result = array(
            'result'  => 'Success',
            'data'    => ''
        );
        $arr_out = array();
        Util::mwexec("asterisk -rx 'module reload manager'", $arr_out);
        $out = implode(' ', $arr_out);
        if(!"Module 'manager' reloaded successfully." === $out){
            $result['result'] = 'ERROR';
        }
        $result['data'] .= $out;

        Util::mwexec("asterisk -rx 'module reload http'", $arr_out);
        $out = implode(' ', $arr_out);
        if(!"Module 'http' reloaded successfully." === trim($out) ){
            $result['result'] = 'ERROR';
        }
        $result['data'] .= " $out";
        return $result;
    }

    public static function musiconhold_reload() :array {
        $o = new p_OtherConfigs($GLOBALS['g']);
        $c = new Config();
        $o->generateConfig($c->get_general_settings());
        Util::mwexec("asterisk -rx 'module reload manager'");
        $result = [
            'result'  => 'Success',
            'data'    => ''
        ];
        return $result;
    }

    public static function modules_reload() :array {
        $pbx = new PBX();
        $pbx->modules_conf_generate();
        $arr_out = [];
        Util::mwexec("asterisk -rx 'core restart now'",   $arr_out);
        $result = array(
            'result'  => 'Success',
            'data'    => ''
        );
        return $result;
    }

	/**
     * Создание конфига manager.conf
     */
	private function manager_conf_generate() :void {
	    $conf = "[general]\n".
				"enabled = yes\n".
				"port = {$this->arr_gs['AMIPort']};\n".
				"bindaddr = 0.0.0.0\n".
				"displayconnects = no\n".
				"allowmultiplelogin = yes\n".
				"webenabled = yes\n".
				"httptimeout = 60\n\n";

		if($this->arr_gs['AMIEnabled'] === '1'){

		    /** @var Models\AsteriskManagerUsers $managers */
		    /** @var Models\AsteriskManagerUsers $user */
            $managers = Models\AsteriskManagerUsers::find();
            $result   = [];
            foreach ( $managers as $user ) {
                $arr_data = $user->toArray();
                /** @var Models\NetworkFilters $network_filter */
                $network_filter     = Models\NetworkFilters::findFirst($user->networkfilterid);
                $arr_data['permit'] = empty($network_filter)?'':$network_filter->permit;
                $arr_data['deny']   = empty($network_filter)?'':$network_filter->deny;
                $result[] = $arr_data;
            }

			foreach ($result as $user ) {
				$conf .= '['.$user['username']."]\n";
				$conf .= 'secret='.$user['secret']."\n";

                if(trim($user['deny']) !== ''){
                    $conf .= 'deny='.$user['deny']."\n";
                }
                if(trim($user['permit']) !== ''){
                    $conf .= 'permit='.$user['permit']."\n";
                }

				$keys  = array( 'call', 'cdr', 'originate', 'reporting',
                                'agent', 'config', 'dialplan', 'dtmf',
                                'log', 'system', 'verbose', 'user');
				$read  = '';
				$write = '';
				foreach($keys as $perm){
					if($user[$perm] === 'readwrite'){
						$read  .= ('' === $read)?$perm:",$perm";
						$write .= ('' === $write)?$perm:",$perm";
					} elseif($user[$perm] === 'write'){
						$write .= ('' === $write)?$perm:",$perm";
					} elseif($user[$perm] === 'read'){
						$read  .= ('' === $read)?$perm:",$perm";
					}
				}
				if ($read !== '') {
					$conf .= "read=$read\n";
				}
	
				if ($write !== '') {
					$conf .= "write=$write\n";
				}
                $conf.= "eventfilter=!UserEvent: CdrConnector\n";
                $conf.= "eventfilter=!Event: Newexten\n";
				$conf.= "\n";
			}
			$conf.= "\n";

		}
		$conf.='[phpagi]' ."\n";
		$conf.='secret=phpagi' ."\n";
		$conf.='deny=0.0.0.0/0.0.0.0' ."\n";
		$conf.='permit=127.0.0.1/255.255.255.255' ."\n";
		$conf.='read=all' ."\n";
		$conf.='write=all' ."\n";
        $conf.= "eventfilter=!Event: Newexten\n";
        $conf.= "\n";

        $conf.='[amidclient]' ."\n";
        $conf.='secret=amidclient' ."\n";
        $conf.='deny=0.0.0.0/0.0.0.0' ."\n";
        $conf.='permit=127.0.0.1/255.255.255.255' ."\n";
        $conf.='read=agent,call,cdr,user' ."\n";
        $conf.='write=call,originate,reporting' ."\n";
        $conf.="eventfilter=!UserEvent: CdrConnector\n";
        $conf.="eventfilter=!Event: Newexten\n";
        $conf.="\n";


        Util::file_write_content('/etc/asterisk/manager.conf', $conf);
	}

    /**
     * Генерация http.cong AJAM.
     */
    private function http_conf_generate() :void {

        $enabled = ($this->arr_gs['AJAMEnabled'] === '1')?'yes':'no';
        $conf = "[general]\n".
                "enabled={$enabled}\n".
                "bindaddr=0.0.0.0\n".
                "bindport={$this->arr_gs['AJAMPort']}\n".
                "prefix=asterisk\n".
                "enablestatic=no\n\n";

        if(!empty($this->arr_gs['AJAMPortTLS'])){
            $conf .= "tlsenable=yes\n".
                     "tlsbindaddr=0.0.0.0:{$this->arr_gs['AJAMPortTLS']}\n".
                     "tlscertfile=/etc/asterisk/ajam.pem\n".
                     "tlsprivatekey=/etc/asterisk/ajam.pem\n";
            $s_data = $this->config->get_general_settings('PBXHTTPSKey');
            if(empty($s_data)){
                // Генерируем сертификат ssl.
                $data   = Util::generate_ssl_sert();
                $s_data = implode("\n", $data);
                $this->config->set_general_settings('PBXHTTPSKey', $s_data);
            }
            file_put_contents('/etc/asterisk/ajam.pem', $s_data);
        }

        Util::file_write_content('/etc/asterisk/http.conf', $conf);
    }

    /**
     * Обновление системы.
     */
    public static function update_system_config() :bool {
        $g =  $GLOBALS['g'];
        $needreboot = false;

        // ОБНОВЛЕНИЕ СТРУКТУРЫ БАЗЫ ДАННЫХ.
        ///
        if(isset($g['m_di'])){
            /** @var Phalcon\DI\FactoryDefault $g['m_di'] */
            $connection = $g['m_di']->get('db');
        }else{
            $connection = new Phalcon\Db\Adapter\Pdo\Sqlite(['dbname' => $g['pt1c_db_path']]);
        }
        $type_key = ['type' => Phalcon\Db\Column::TYPE_INTEGER, 'notNull' => true, 'autoIncrement' => true, 'primary'=> true];
        $type_int = ['type' => Phalcon\Db\Column::TYPE_INTEGER, 'default' => 0 ];
        $type_str = ['type' => Phalcon\Db\Column::TYPE_TEXT,    'default' => ''];

        if (!$connection->tableExists('m_BackupRules')) {
            $columns = [
                new Phalcon\Db\Column('id',                    $type_key),
                new Phalcon\Db\Column('enabled',               $type_int),
                new Phalcon\Db\Column('every',                 $type_int),
                new Phalcon\Db\Column('at_time',               $type_str),
                new Phalcon\Db\Column('keep_older_versions',   $type_int),
                new Phalcon\Db\Column('ftp_host',              $type_str),
                new Phalcon\Db\Column('ftp_port',              $type_int),
                new Phalcon\Db\Column('ftp_username',          $type_str),
                new Phalcon\Db\Column('ftp_secret',            $type_str),
                new Phalcon\Db\Column('ftp_path',              $type_str),
                new Phalcon\Db\Column('ftp_sftp_mode',         $type_int),
                new Phalcon\Db\Column('what_backup',           $type_str),
            ];
            $result = $connection->createTable( 'm_BackupRules', null, ['columns' => $columns ]);
            if($result === true){
                // Необходима перезагрузка.
                $needreboot = true;
                echo " - Create new table m_BackupRules.\n";
            }else{
                Util::sys_log_msg('update_system_config', 'Error: Failed to create table m_BackupRules.');
            }
        }

        $meta_data = $connection->query("PRAGMA table_info('m_IvrMenu') ")->fetchAll();
        $found_number_of_repeat = false;
        $found_timeout          = false;
        foreach ($meta_data as $column) {
            if ('number_of_repeat' === $column['name']) {
                $found_number_of_repeat = true;
            }elseif ('timeout' === $column['name']){
                $found_timeout = true;
            }
        }
        if ($found_number_of_repeat === false) {
            $connection->addColumn('m_IvrMenu', null, new Phalcon\Db\Column('number_of_repeat', $type_int));
            $needreboot = true;
        }
        if ($found_timeout === false) {
            $connection->addColumn('m_IvrMenu', null, new Phalcon\Db\Column('timeout', $type_int));
            $needreboot = true;
        }

        if($needreboot === true){
            sleep(2);
            if(function_exists('init_db')){
                init_db($g['m_di'], $g['phalcon_settings']);
            }else{
                echo " - Need reboot.\n";
                file_put_contents('/tmp/ejectcd', '');
                Util::mwexec_bg( '/etc/rc/reboot');
                sleep(20);
                return false;
            }
        }

        ///
        // ОБНОВЛЕНИЕ КОНФИГОВ.
        ///
        $config = new Config();
        $start_version  = $config->get_general_settings('PBXVersion');
        $version        = $start_version;

        if( version_compare($version, '1.0.0', '<=') ) {
            // Обновление конфигов. Это первый запуск системы.
            /** @var Models\Sip $peers */
            /** @var Models\Sip $peer */
            $peers = Models\Sip::find('type="peer"');
            foreach ($peers as $peer){
                $peer->secret = md5(''.time().'sip'.$peer->id);
                $peer->save();
            }

            /** @var Models\AsteriskManagerUsers $managers */
            /** @var Models\AsteriskManagerUsers $manager */
            $managers = Models\AsteriskManagerUsers::find();
            foreach ($managers as $manager){
                $manager->secret = md5(''.time().'manager'.$manager->id);
                $manager->save();
           }
        }

        if( version_compare($version, '6.1', '<=') ){
            $applicationlogic = 'PD9waHAKcmVxdWlyZV9vbmNlICdnbG9iYWxzLnBocCc7CnJlcXVpcmVfb25jZSAncGhwYWdpLnBocCc7CgokaXZyICAgID0gbmV3IFNtYXJ0SVZSKCk7CiRyZXN1bHQgPSAkaXZyLT5zdGFydElWUigpOwo=';
            /** @var Models\DialplanApplications $d_app */
            $d_app = Models\DialplanApplications::findFirst('extension="10000123"');
            if($d_app){
                $d_app->applicationlogic  = $applicationlogic;
                $d_app->type              = 'php';
                if($d_app->uniqid ==='SmartIVR' || empty($d_app->uniqid)){
                    $d_app->uniqid = 'DIALPLAN-APPLICATION-'.md5(time());
                }
                $d_app->save();
            }
        }
        if( version_compare($version, '6.2.110', '<') ){
            /** @var Models\Codecs $codec_g722 */
            $codec_g722 = Models\Codecs::findFirst('name="g722"');
            if(!$codec_g722){
                /** @var Models\Codecs $codec_g722 */
                $codec_g722 = new Models\Codecs();
                $codec_g722->name        = 'g722';
                $codec_g722->type        = 'audio';
                $codec_g722->description = 'G.722';
                $codec_g722->save();
            }

            /** @var Models\IvrMenu $ivrs */
            /** @var Models\IvrMenu $ivr */
            $ivrs = Models\IvrMenu::find();
            foreach ($ivrs as $ivr){
                if(empty($ivr->number_of_repeat)){
                    $ivr->number_of_repeat = 5;
                    $ivr->save();
                }
                if(empty($ivr->timeout)){
                    $ivr->timeout = 7;
                    $ivr->save();
                }
            }

            // Чистим мусор.
            /** @var Models\PbxExtensionModules $modules */
            $modules = Models\PbxExtensionModules::find();
            foreach ($modules as $module){
                if($module->version === '1.0' && empty($module->support_email && 'МИКО' === $module->developer)){
                    $modules->delete();
                }
            }
        }

        if( version_compare($version, '6.4', '<') ) {
            /** @var Models\DialplanApplications $res */
            $app_number = '10000100';
            $app_logic  = base64_encode('1,Goto(voice_mail_peer,voicemail,1)');
            $d_app = Models\DialplanApplications::findFirst('extension="'.$app_number.'"');
            if(!$d_app){
                $d_app = new Models\DialplanApplications();
                $d_app->applicationlogic = $app_logic;
                $d_app->extension        = $app_number;
                $d_app->description      = 'Voice Mail';
                $d_app->name             = 'VOICEMAIL';
                $d_app->type             = 'plaintext';
                $d_app->uniqid           = 'DIALPLAN-APPLICATION-'.md5(time());

                if($d_app->save()){
                    $extension = Models\Extensions::findFirst("number = '{$app_number}'");
                    if(!$extension){
                        $extension = new Models\Extensions();
                        $extension->number   = $app_number;
                        $extension->type     = 'DIALPLAN APPLICATION';
                        $extension->callerid = $d_app->name;
                        $extension->show_in_phonebook = true;
                        $extension->save();
                    }
                }
            }else{
                $d_app->applicationlogic  = $app_logic;
                $d_app->type              = 'plaintext';
                $d_app->save();
            }
        }
        $version = trim(file_get_contents('/etc/version'));
        if($start_version !== $version){
            // Фиксируем флаг необходимости очистки кэш web.
            file_put_contents('/cf/conf/need_clean_cashe_www', '');
            $config->set_general_settings('PBXVersion', $version);

            /** @var Models\FirewallRules $rule */
            $result = Models\FirewallRules::find();
            foreach ($result as $rule) {
                /** @var Models\NetworkFilters $network_filter */
                $network_filter = Models\NetworkFilters::findFirst($rule->networkfilterid);
                if (!$network_filter) {
                    // Это "битая" роль, необходимо ее удалить. Нет ссылки на подсеть.
                    $rule->delete();
                }
            }

            // Права доступа к каталогам.
            /** @var Models\PbxExtensionModules $modules */
            $modules = Models\PbxExtensionModules::find();
            $modulesDir = $GLOBALS['g']['phalcon_settings']['application']['modulesDir'];
            foreach ($modules as $module){
                Util::mwexec("chmod +xr {$modulesDir}/{$module->name}/agi-bin");
            }
        }

        $PrivateKey = $config->get_general_settings('WEBHTTPSPrivateKey');
        $PublicKey  = $config->get_general_settings('WEBHTTPSPublicKey');
        if(empty($PrivateKey) || empty($PublicKey)){
            $serts = Util::generate_ssl_sert();
            $config->set_general_settings('WEBHTTPSPrivateKey', $serts['PrivateKey']);
            $config->set_general_settings('WEBHTTPSPublicKey',  $serts['PublicKey']);
        }

        if(empty($config->get_general_settings('AJAMPortTLS'))){
            $config->set_general_settings('AJAMPortTLS', '8089');
        }

        return true;
    }
}
