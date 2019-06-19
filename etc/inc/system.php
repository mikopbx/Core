<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2019
 */

require_once 'globals.php';

/**
 * Class System
 */
class System {
    private $config;
    private $arrObject;

    /**
     * System constructor.
     */
    function __construct(){
        global $g;
        // Класс / обертка для работы с настройками.
        $this->config = new Config();
        $this->arrObject = PBX::init_modules($g);
    }

    /**
     * Подгрузка дополнительных модулей ядра.
     */
    public function load_kernel_modules(){
		Util::mwexec("/sbin/modprobe -q dahdi");
		Util::mwexec("/sbin/modprobe -q dahdi_transcode");
	}  

	/**
	 *	Устанавливаем имя хост текущей машины.
	**/
    public function hostname_configure(){
	    $data 		= Network::getHostName();
	    $hostname 	= "${data['hostname']}";
		return Util::mwexec("/bin/hostname " . escapeshellarg("$hostname"));
    }
	
	/**
	 *	Старт web сервера.
	**/
	public function nginx_start(){
	    Util::killbyname('nginx');
	    $this->nginx_generate_conf();
		Util::mwexec("php-fpm");
		Util::mwexec("nginx");
	}

    /**
     * Описание конфига nginx.
     * @param bool $not_ssl
     * @param int  $level
     */
	public function nginx_generate_conf($not_ssl = false, $level=0){

	    $config_file  = '/etc/nginx/nginx.conf';
	    $pattern_file = '/etc/nginx/nginx.conf.pattern';
	    if(!file_exists("$pattern_file")){
            // Создаем резервную копию.
	        copy($config_file, $pattern_file);
        }
        $dns_server = '8.8.8.8';

	    $net = new Network();
        $dns  = $net->getHostDNS();
        foreach ($dns as $ns) {
            if (Verify::is_ipaddress($ns)){
                $dns_server = trim($ns);
                break;
            }
        }
	    $WEBPort            = $this->config->get_general_settings("WEBPort");
	    $WEBHTTPSPort       = $this->config->get_general_settings("WEBHTTPSPort");

        $config = file_get_contents($pattern_file);
        $config = str_replace('<DNS>',          $dns_server,    $config);
        $config = str_replace('<WEBHTTPSPort>', $WEBHTTPSPort,  $config);
        $config = str_replace('<WEBPort>',      $WEBPort,       $config);

        $WEBHTTPSPublicKey  = $this->config->get_general_settings("WEBHTTPSPublicKey");
        $WEBHTTPSPrivateKey = $this->config->get_general_settings("WEBHTTPSPrivateKey");

        if($not_ssl == false && !empty($WEBHTTPSPublicKey) && !empty($WEBHTTPSPrivateKey)){
            file_put_contents("/etc/ssl/certs/nginx.crt",   $WEBHTTPSPublicKey);
            file_put_contents("/etc/ssl/private/nginx.key", $WEBHTTPSPrivateKey);
            // Подключаем конфиг SSL.
            $config = str_replace('###SSL#', '', $config);
        }
        file_put_contents($config_file, $config);

        $out = [];
        Util::mwexec("nginx -t",$out);
        $res = implode($out);
        if(stristr($res, 'test failed') === FALSE) {
            // Все ок.
        }elseif($level<1){
            $level+=1;
            \Util::sys_log_msg('nginx', 'Failed test config file. SSL will be disable...');
            $this->nginx_generate_conf(true, $level);
        }
    }

    /**
     * Старт сервера обработки очередей задач.
     * @return array
     */
	public function gnats_start(){
        $confdir = '/etc/nats';
        if(!is_dir($confdir)){
	        @mkdir($confdir, 0755, true);
        }
		Util::killbyname('gnatsd');
		$logdir = Util::get_log_dir().'/nats';
		if(!is_dir($logdir)){
		    mkdir($logdir,0777,true);
        }
		$settings = array(
            'port' => '4222',
            'http_port' => '8222',
            'debug' => 'false',
            'trace' => 'false',
            'logtime' => 'true',
            'pid_file' => '/var/run/gnatsd.pid',
            'max_connections' => '1000',
            'max_payload' => '1000000',
            'max_control_line' => '512',
            'sessions_path' => "$logdir",
            'log_file' => "{$logdir}/gnatsd.log"
        );
        $config = '';
        foreach ($settings as $key => $val){
            $config .= "{$key}: {$val} \n";
        }
        $conf_file = "{$confdir}/natsd.conf";
        Util::file_write_content($conf_file, $config);

        $lic = $this->config->get_general_settings('PBXLicense');
		file_put_contents($logdir.'/license.key', $lic);
        Util::mwexec_bg("gnatsd --config {$conf_file}");

        $result = array(
            'result'  => 'Success'
        );

        // Перезапуск сервисов.
        foreach ($this->arrObject as $appClass) {
            /** @var \ConfigClass $appClass */
            $appClass->on_nats_reload();
        }
        return $result;
	}

	/**
     * Будет вызван после старта asterisk.
     */
	public function on_after_pbx_started(){
        foreach ($this->arrObject as $appClass) {
            /** @var \ConfigClass $appClass */
            $appClass->on_after_pbx_started();
        }
    }

	/**
	 * Устанавливаем пароль для пользователя системы. 
	**/
	public function update_shell_password() {
        $password = $this->config->get_general_settings('SSHPassword');
		Util::mwexec("echo \"root:$password\" | /usr/sbin/chpasswd");
	}
	
	/**
	 * Запуск SSH сервера.
	**/
	public function sshd_configure() {
        @file_put_contents('/var/log/lastlog', '');
        $result = array(
            'result'  => 'Success'
        );
		if (!file_exists("/etc/dropbear")) mkdir("/etc/dropbear");
		$keytypes = array(
			"rsa"	=> "SSHRsaKey",
			"dss" 	=> "SSHDssKey",
			"ecdsa" => "SSHecdsaKey" // SSHecdsaKey // SSHEcdsaKey
		);
		// Получаем ключ из базы данных. 
		$config = $this->config->get_general_settings();
		// $config = array();
		foreach ($keytypes as $keytype => $db_key) {
			$res_keyfilepath = "/etc/dropbear/dropbear_" . $keytype . "_host_key";
			$key = (isset($config[$db_key]))?trim( $config[$db_key] ):"";
			if(strlen($key) > 100){
				// Сохраняем ключ в файл. 
				file_put_contents($res_keyfilepath, base64_decode($key) );
			}
			// Если ключ не существует, создадим его и обновим информацию в базе данных. 
			if (!file_exists($res_keyfilepath)) {
				// Генерация. 
				Util::mwexec("/usr/bin/dropbearkey -t $keytype -f $res_keyfilepath");
				// Сохранение.
				$new_key = base64_encode(file_get_contents($res_keyfilepath));
                $this->config->set_general_settings("$db_key", "$new_key");
			}
		}
        $ssh_port = escapeshellcmd($this->config->get_general_settings('SSHPort'));
		// Перезапускаем сервис dropbear;
        Util::killbyname("dropbear");
        usleep(500000);
		Util::mwexec("dropbear -p '{$ssh_port}' > /var/log/dropbear_start.log");
		$this->generate_authorized_keys();

        $result['data'] = @file_get_contents('/var/log/dropbear_start.log');
        if(!empty($result['data'])){
            $result['result'] = 'ERROR';
        }

        // Устанавливаем пароль на пользователя ОС.
        $this->update_shell_password();
        return $result;
	}

    /**
     * Сохранение ключей аторизации.
     */
    public function generate_authorized_keys(){
        if (!is_dir("/root/.ssh")) {
            mkdir("/root/.ssh");
        }
        $config = new Config();
        $conf_data = $config->get_general_settings('SSHAuthorizedKeys');

        file_put_contents("/root/.ssh/authorized_keys", $conf_data);
    }

    /**
     * Reboots the system after calling system_reboot_cleanup()
     * @param bool $check_storage
     */
	static function reboot_sync($check_storage=true) {
        if($check_storage!=true){
            try{
                $pbxSettings = \Models\Storage::find();
                /** @var \Models\Storage $pbxSettings */
                /** @var \Models\Storage $row */
                foreach ($pbxSettings as $row){
                    $row->check_when_booting = 0;
                    $row->save();
                }
            }catch (\Exception $e){
                \Util::sys_log_msg("Reboot: Storage ", "".$e->getMessage());
            }
        }
	    \Util::mwexec("/etc/rc/reboot > /dev/null 2>&1");
	}

    /**
     * Shutdown the system.
     */
    static function shutdown() {
        Util::mwexec("/sbin/shutdown > /dev/null 2>&1");
    }

    /**
     * Рестарт сетевых интерфейсов.
     */
	static function network_reload(){
        $system  = new System();
        $system->hostname_configure();

        $network = new Network();
        $network->resolvconf_generate();
        $network->lo_configure();
        $network->lan_configure();
    }

    /**
     * Установка системного времени.
     * @param $date - 2015.12.31-01:01:20
     * @return array
     */
    static function set_date($date){
        $result = array(
            'result'  => 'ERROR'
        );
        // Преобразование числа к дате. Если необходимо.
        $date    = Util::number_to_date($date);
        // Валидация даты.
        $re_date = '/^\d{4}\.\d{2}\.\d{2}\-\d{2}\:\d{2}\:\d{2}$/';
        preg_match_all($re_date, $date, $matches, PREG_SET_ORDER, 0);
        if(count($matches)>0){
            $result['result'] = 'Success';
            $arr_data = array();
            Util::mwexec("date -s '{$date}'",$arr_data);
            $result['data']   = implode($arr_data);
        }else{
            $result['result']   = 'Success';
            $result['data']     = 'Update timezone only.';
            // $result = 'Error format DATE. Need YYYY.MM.DD-hh:mm:ss';
        }

        $sys = new System();
        $sys->timezone_configure();

        return $result;
    }

    /**
     * Получение сведений о системе.
     * @return array
     */
    static function get_info(){
        $result = array(
            'result'  => 'Success'
        );

        $storage = new Storage();
        $data = array(
            'disks' => $storage->get_all_hdd(),
            'cpu'   => System::get_cpu(),
            'uptime'=> System::get_up_time(),
            'mem'   => System::get_mem_info()
        );
        $result['data']   = $data;
        return $result;
    }

    /**
     * Возвращает информацию по загрузке CPU.
     */
    static function get_cpu(){
        $ut = array();
        Util::mwexec("/bin/mpstat | /bin/grep all", $ut);
        preg_match("/^.*\s+all\s+.*\s+.*\s+.*\s+.*\s+.*\s+.*\s+.*\s+.*\s+(.*)\s*.*/i", $ut[0], $matches);
        $rv = 100 - $matches[1];

        if (100 < $rv) {
            $rv = 100;
        }

        return round($rv, 2);
    }

    /**
     * Получаем информацию по оперативной памяти.
     */
    static function get_mem_info(){
        $result = array();
        $out    = array();

        Util::mwexec("cat /proc/meminfo | grep -C 0 'Inactive:' | awk '{print $2}'", $out);
        $result['inactive'] = round( (1* implode($out)) / 1024 , 2);
        Util::mwexec("cat /proc/meminfo | grep -C 0 'MemFree:' | awk '{print $2}'",  $out);
        $result['free']   = round((1* implode($out)) / 1024, 2);
        Util::mwexec("cat /proc/meminfo | grep -C 0 'MemTotal:' | awk '{print $2}'",  $out);
        $result['total']    = round ((1* implode($out)) / 1024, 2);

        return $result;
    }

    /**
     * Получаем информацию по времени работы ПК.
     */
    static function get_up_time(){
        $ut = array();
        Util::mwexec("/usr/bin/uptime | awk -F \" |,\" '{print $5}'", $ut);
        return implode('', $ut);
    }

	/**
	 * Populates /etc/TZ with an appropriate time zone
	 */
	public function timezone_configure() {
        $timezone = $this->config->getTimeZone();

		include("timezones.php");	
		@unlink("/etc/TZ");
		@unlink("/etc/localtime");
		
		if ($timezone) {
			$zone_file = "/usr/share/zoneinfo/{$timezone}";
			if(!file_exists($zone_file)){
				return;
			}
            exec("cp  $zone_file /etc/localtime");
			file_put_contents('/etc/TZ', $timezone);
			putenv( "TZ={$timezone}");
            exec("export TZ;");
		}

        $this->ntp_daemon_configure();
        System::php_timezone_configure();
	}

    /**
     * Настрока демона ntpd.
     */
	private function ntp_daemon_configure(){
		$ntp_server = $this->config->getServerNTP();
		if('' != $ntp_server){
			$ntp_conf = "server $ntp_server";
		}else{
			$ntp_conf = 'server 0.pool.ntp.org
server 1.pool.ntp.org
server 2.pool.ntp.org';
		}

        Util::file_write_content('/etc/ntp.conf', $ntp_conf);
		Util::killbyname("ntpd");
		usleep(500000);
        $manual_time = $this->config->get_general_settings('PBXManualTimeSettings');
        if($manual_time != 1){
            Util::mwexec("ntpd");
        }
	}

    /**
     * Установка таймзоны для php.
     */
	static function php_timezone_configure(){
        $config     = new Config();
	    $timezone   = $config->getTimeZone();
	    date_default_timezone_set($timezone);
	    if(file_exists('/etc/TZ')){
            Util::mwexec('export TZ="$(cat /etc/TZ)"');
        }
	}

    /**
     * Генератор конфига cron.
     * @param bool $boot
     */
	private function cron_generate($boot=true) {
		$worker_safe_scripts = '/usr/bin/php -f /etc/inc/cron/worker_safe_scripts.php > /dev/null 2> /dev/null';
		$mast_have = [];

        $restart_night = $this->config->get_general_settings('RestartEveryNight');
        if("$restart_night" == "1"){
            $mast_have[] = '0 1 * * * /usr/sbin/asterisk -rx"core restart now" > /dev/null 2> /dev/null'. "\n";
        }
		$mast_have[] = '*/5 * * * * /usr/sbin/ntpd -q > /dev/null 2> /dev/null'. "\n";
		$mast_have[] = '*/1 * * * * /usr/bin/php -f /etc/inc/cron/worker_cdr.php > /dev/null 2> /dev/null'. "\n";
		$mast_have[] = '*/6 * * * * /bin/sh /etc/inc/cron/cleaner_download_links.sh  download_link > /dev/null 2> /dev/null'. "\n";
        $mast_have[] = "*/1 * * * * {$worker_safe_scripts}". "\n";

        \Backup::create_cron_tasks($mast_have);
        $tasks = [];
        // Дополнительные модули также могут добавить задачи в cron.
        foreach ($this->arrObject as $appClass) {
            /** @var \ConfigClass $appClass */
            $appClass->create_cron_tasks($tasks);
        }
        $conf = implode('', array_merge($mast_have, $tasks) );
        if($boot == true){
            Util::mwexec("$worker_safe_scripts");
        }

        Util::file_write_content("/var/spool/cron/crontabs/root", $conf);

	}

    /**
     * Настройка cron. Запуск демона.
     * @param bool $booting
     * @return int
     */
	public function cron_configure($booting = false) {
		Util::killbyname("crond");
		$this->cron_generate($booting);
		Util::mwexec("crond -L /dev/null -l 8");
		return 0;
	}

    /**
     * Запуск open vmware tools.
     */
	public function vm_ware_tools_configure(){
        Util::killbyname("vmtoolsd");
		$config = $this->config->get_general_settings();
		if('VMWARE' == $config['VirtualHardwareType']){
            $conf = "[logging]\n"
                ."log = false\n"
                ."vmtoolsd.level = none\n"
                .";vmsvc.data = /dev/null\n"
                ."vmsvc.level = none\n";
            file_put_contents("/etc/vmware-tools/tools.conf", $conf);
			Util::mwexec('/usr/bin/vmtoolsd --background=/var/run/vmtoolsd.pid > /dev/null 2> /dev/null');
		}
	}
    /**
     * Обновление кофнигурации кастомных файлов.
     * @return array
     */
    static function update_custom_files(){

        $actions = array();
        /** @var \Models\CustomFiles $res_data */
        $res_data = \Models\CustomFiles::find("changed = '1'");
        foreach ($res_data as $file_data){
            // Всегда рестрартуем все модули asterisk (только чтение конфигурации).
            $actions['asterisk_core_reload'] = 100;
            $filename = basename($file_data->filepath);
            switch ($filename){
                case 'manager.conf':
                    $actions['manager'] = 10;
                    break;
                case 'modules.conf':
                    $actions['modules'] = 10;
                    break;
                case 'http.conf':
                    $actions['manager'] = 10;
                    break;
                case 'root': // crontabs
                    $actions['cron'] = 10;
                    break;
                case 'queues.conf':
                    $actions['queues']   = 10;
                    break;
                case 'features.conf':
                    $actions['features'] = 10;
                    break;
                case 'ntp.conf':
                    $actions['systemtime'] = 100;
                    break;
                case 'jail.local': // fail2ban
                    $actions['firewall'] = 100;
                    break;
            }
        }

        asort($actions);
        $result = System::invoke_actions($actions);
        if($result['result'] != 'ERROR'){
            // Зафиксируем результат работы.
            foreach ($res_data as $file_data){
                /** @var \Models\CustomFiles $file_data */
                $file_data->writeAttribute("changed", '0');
                $file_data->save();
            }
        }

        return $result;
    }

    /**
     * Выполнение набора действий по рестарту модулей системы.
     * @param $actions
     * @return array|mixed
     */
    static function invoke_actions($actions){
        $result = array(
            'result'  => 'Success'
        );
        foreach ($actions as $action => $value){
            $res = null;
            switch ($action){
                case 'manager':
                    $res = PBX::manager_reload();
                    break;
                case 'modules':
                    $res = PBX::modules_reload();
                    break;
                case 'cron':
                    $system = new System();
                    $system->cron_configure();
                    break;
                case 'queues':
                    $res = p_Queue::queue_reload();
                    break;
                case 'features':
                    $res = PBX::manager_reload();
                    break;
                case 'systemtime':
                    $res = System::set_date('');
                    break;
                case 'firewall':
                    $res = Firewall::reload_firewall();
                    break;
                case 'asterisk_core_reload':
                    p_SIP::sip_reload();
                    p_IAX::iax_reload();
                    $pbx = new PBX();
                    $pbx->dialplan_reload();
                    $res = PBX::core_reload();
                    break;
            }
            if($res != null && $res['result'] == 'ERROR'){
                $result = $res['result'];
                break;
            }
        }
        return $result;
    }

    static function convert_config(){
        $result = [
            'result'  => 'Success',
            'message' => ''
        ];
        try{
            $dirs = PBX::get_asterisk_dirs();
            $cntr = new OldConfigConverter("{$dirs['tmp']}/old_config.xml");
            $cntr->parse();
            $cntr->make_config();

            unlink("{$dirs['tmp']}/old_config.xml");
        }catch (Exception $e){
            $result = [
                'result'  => 'Error',
                'message' => $e->getMessage()
            ];
        }

        return $result;
    }

    /**
     * @return array
     */
    static function upgrade_from_img(){
        $result = array(
            'result'  => 'Success',
            'message' => 'In progress...'
        );

        $dirs = PBX::get_asterisk_dirs();
        $upd_file = "{$dirs['tmp']}/update.img";
        if(!file_exists($upd_file)) {
            $upd_file = "{$dirs['tmp']}/upgrade_online/update.img";
        }
        if(!file_exists($upd_file)){
            $result['result']   = 'Error';
            $result['message']  = 'IMG file not found';
            $result['path']     = "$upd_file";
            return $result;
        }
        if(!file_exists('/var/etc/cfdevice')){
            $result['result']   = 'Error';
            $result['message']  = 'The system is not installed';
            $result['path']     = "$upd_file";
            return $result;
        }
        $dev = trim(file_get_contents('/var/etc/cfdevice'));
        Util::mwexec_bg("/etc/rc/firmware recover_upgrade {$upd_file} /dev/{$dev}");

        return $result;
    }

    /**
     * Обновление АТС путем скачивания образа с ресурса МИКО.
     * @param $data
     * @return mixed
     */
    static function upgrade_online($data){
        $dirs       = \PBX::get_asterisk_dirs();
        $module = 'upgrade_online';
        if(!file_exists($dirs['tmp']."/{$module}")){
            mkdir($dirs['tmp']."/{$module}", 0755, true);
        }else{
            \Util::mwexec("rm -rf {$dirs['tmp']}/{$module}/* ");
        }
        $download_settings = [
            'res_file' => "{$dirs['tmp']}/{$module}/update.img",
            'url'      => $data['url'],
            'module'   => $module,
            'md5'      => $data['md5'],
            'action'   => $module
        ];

        file_put_contents($dirs['tmp']."/{$module}/progress", "0");
        file_put_contents($dirs['tmp']."/{$module}/download_settings.json", json_encode($download_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        \Util::mwexec_bg("php -f /etc/inc/workers/worker_download.php ".$dirs['tmp']."/{$module}/download_settings.json");
        $result['result']   = 'Success';
        return $result;
    }

    /**
     * Возвращает информацию по статусу загрузки файла обновления img.
     * @return array
     */
    static function status_upgrade(){
        $result = array(
            'result'  => 'Success',
        );
        $dirs       = \PBX::get_asterisk_dirs();
        $modulesDir = $dirs['tmp']."/upgrade_online";
        $progress_file = $modulesDir."/progress";

        $error    = '';
        if(file_exists($modulesDir.'/error')){
            $error = trim(file_get_contents($modulesDir.'/error'));
        }

        if(!file_exists($progress_file)){
            $result['d_status_progress'] = '0';
            $result['d_status'] = "NOT_FOUND";
        }elseif('' != $error ){
            $result['d_status'] = "DOWNLOAD_ERROR";
            $result['d_status_progress'] = file_get_contents($progress_file);
            $result['d_error']  = $error;
        }elseif('100' == file_get_contents($progress_file) ){
            $result['d_status_progress'] = '100';
            $result['d_status'] = "DOWNLOAD_COMPLETE";
        }else{
            $result['d_status_progress'] = file_get_contents($progress_file);
            $d_pid = \Util::get_pid_process($dirs['tmp']."/upgrade_online/download_settings.json");
            if(empty($d_pid)){
                $result['d_status'] = "DOWNLOAD_ERROR";
                $error = '';
                if(file_exists($modulesDir.'/error')){
                    $error = file_get_contents($modulesDir.'/error');
                }
                $result['d_error']  = $error;
            }else{
                $result['d_status'] = "DOWNLOAD_IN_PROGRESS";
            }
        }
        return $result;
    }

    /**
     * Возвращает статус скачивания модуля.
     * @param $module
     * @return array
     */
    static function module_download_status($module){
        $result = [
            'result' => 'Success',
            'data'   =>  null
        ];
        $modulesDir = $GLOBALS['g']['phalcon_settings']['application']['modulesDir'];
        $progress_file = $modulesDir.$module.'/progress';
        $error    = '';
        if(file_exists($modulesDir.$module.'/error')){
            $error = trim(file_get_contents($modulesDir.$module.'/error'));
        }


        if(!file_exists($progress_file)){
            $result['d_status_progress'] = '0';
            $result['d_status'] = "NOT_FOUND";
            $result['i_status'] = false;
        }elseif('' != $error ){
            $result['d_status'] = "DOWNLOAD_ERROR";
            $result['d_status_progress'] = file_get_contents($progress_file);
            $result['d_error']  = $error;
            $result['i_status'] = false;
        }elseif('100' == file_get_contents($progress_file) ){
            $result['d_status_progress'] = '100';
            $result['d_status'] = "DOWNLOAD_COMPLETE";
            $result['i_status'] = file_exists($modulesDir.$module.'/installed');
        }else{
            $dirs       = \PBX::get_asterisk_dirs();
            $result['d_status_progress'] = file_get_contents($progress_file);
            $d_pid = \Util::get_pid_process($dirs['tmp']."/{$module}/download_settings.json");
            if(empty($d_pid)){
                $result['d_status'] = "DOWNLOAD_ERROR";
                $error = '';
                if(file_exists($modulesDir.$module.'/error')){
                    $error = file_get_contents($modulesDir.$module.'/error');
                }
                $result['d_error']  = $error;
            }else{
                $result['d_status'] = "DOWNLOAD_IN_PROGRESS";
            }
            $result['i_status'] = false;
        }

        return $result;
    }

    /**
     * Запуск процесса фоновой загрузки доп. модуля АТС.
     * @param $module
     * @param $url
     * @param $md5
     * @return array
     */
    static function module_start_download($module, $url, $md5){
        $dirs       = \PBX::get_asterisk_dirs();
        $modulesDir = $dirs['custom_modules'].'/';
        if(!file_exists($modulesDir.$module)){
            mkdir($modulesDir.$module, 0755, true);
        }
        if(!file_exists($dirs['tmp']."/{$module}")){
            mkdir($dirs['tmp']."/{$module}", 0755, true);
        }

        $download_settings = [
            'res_file' => $dirs['tmp']."/{$module}/modulefile.zip",
            'url'      => $url,
            'module'   => $module,
            'md5'      => $md5,
            'action'   => 'module_install'
        ];
        if(file_exists($modulesDir.$module.'/error')){
            unlink($modulesDir.$module.'/error');
        }
        if(file_exists($modulesDir.$module.'/installed')){
            unlink($modulesDir.$module.'/installed');
        }
        file_put_contents($modulesDir.$module.'/progress', "0");
        file_put_contents($dirs['tmp']."/{$module}/download_settings.json", json_encode($download_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        \Util::mwexec_bg("php -f /etc/inc/workers/worker_download.php ".$dirs['tmp']."/{$module}/download_settings.json");
        return [];
    }

    /**
     * Получение информации о публичном IP.
     * @return array
     */
    static function get_external_ip_info(){
        $result = [
            'result'  => 'Error',
            'message' => null,
            'data'    => null
        ];
        $curl = curl_init();
        $url = 'https://ipinfo.io/json';
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_TIMEOUT, 1);

        try{
            $resultrequest  = curl_exec($curl);
        }catch (Exception $e){
            $result['message'] = $e->getMessage();
            return $result;
        }
        curl_close($curl);
        if(Util::is_json($resultrequest)){
            $result['result']   = 'Success';
            $result['data']     = json_decode($resultrequest, true);
        }else{
            $result['message'] = 'Error format data '.$resultrequest;
        }

        return $result;
    }

    /**
     * Чтение данных сессии. (Read-only sessions to the rescue).
     * https://www.leaseweb.com/labs/2014/08/session-locking-non-blocking-read-sessions-php/
     */
    static function session_readonly(){
        if(!is_array($_COOKIE) || !isset($_COOKIE[session_name()])){
            return;
        }
        $session_name = preg_replace('/[^\da-z]/i', '', $_COOKIE[session_name()]);
        $session_file = session_save_path().'/sess_' . $session_name;
        if(!file_exists($session_file)){
            return;
        }
        $session_data = file_get_contents($session_file);
        $return_data = [];
        $offset = 0;
        while ($offset < strlen($session_data)) {
            if (!strstr(substr($session_data, $offset), "|")) break;
            $pos = strpos($session_data, "|", $offset);
            $num = $pos - $offset;
            $varname = substr($session_data, $offset, $num);
            $offset += $num + 1;
            $data = unserialize(substr($session_data, $offset));
            $return_data[$varname] = $data;
            $offset += strlen(serialize($data));
        }
        $_SESSION = $return_data;
    }

}
