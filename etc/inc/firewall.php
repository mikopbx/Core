<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 10 2019
 */

require_once('globals.php');

class Firewall{
    private $firewall_enable;
    private $fail2ban_enable;

    /**
     * Firewall constructor.
     */
    public function __construct(){
        $this->firewall_enable = false;
        $this->fail2ban_enable = false;
        // Получение настроек.
        $config = new Config();

        $firewall_enable = $config->get_general_settings('PBXFirewallEnabled');
        $this->firewall_enable = ($firewall_enable === '1');

        $fail2ban_enable = $config->get_general_settings('PBXFail2BanEnabled');
        $this->fail2ban_enable = ($fail2ban_enable === '1');
    }

    /**
     *	Удаление всех правил Firewall.
     */
	private function drop_all_rules():void {
		Util::mwexec('iptables -F');
		Util::mwexec('iptables -X');
	}

	/**
	 *	Установка правил Firewall. 
	**/
    public function apply_config():void {
        self::fail2ban_stop();
        $this->drop_all_rules();
		self::fail2ban_make_dirs();

        if($this->firewall_enable){
            $arr_command = array();
            $arr_command[] = $this->get_iptables_input_rule('', '-m conntrack --ctstate ESTABLISHED,RELATED');
            // Добавляем разрешения на сервисы.
            $this->AddFirewallRules($arr_command);
            // Все остальное запрещаем.
            $arr_command[] = $this->get_iptables_input_rule('', '', 'DROP');

            Util::mwexec_commands($arr_command, $out, 'firewall');

            // Кастомизация правил firewall.
            $arr_commands = []; $out = [];
            Util::file_write_content('/etc/firewall_additional', '');
            Util::mwexec("/bin/cat /etc/firewall_additional | grep -v '|' | grep -v '&'| /bin/grep '^iptables' | /bin/busybox awk -F ';' '{print $1}'",$arr_commands);
            Util::mwexec_commands($arr_commands,$out, 'firewall_additional');
        }
        if($this->fail2ban_enable){
            // Настройка правил бана.
            $this->write_config();
            self::fail2ban_start();
        }else{
            self::fail2ban_stop();
        }
    }

    /**
     * Рестарт firewall.
     * @return array
     */
    static function reload_firewall(){
        $result   = [];

        $pid_file = '/var/run/service_reload_firewall.pid';
        if(file_exists($pid_file)){
            $old_pid = file_get_contents($pid_file);
            $process = Util::get_pid_process("^{$old_pid}");
            if($process !== ''){
                $result['result'] = 'ERROR';
                $result['data']   = 'Another restart process has not yet completed';
                return $result;
            }
        }
        file_put_contents($pid_file, getmypid());

        $firewall = new Firewall();
        $firewall->apply_config();

        unlink($pid_file);
        $result['result'] = 'Success';
        return $result;
    }

    /**
     * Проверка статуса fail2ban
     * @return bool
     */
    private function fail2ban_is_runing(){
        $res_ping = Util::mwexec('fail2ban-client ping');
        $res_stat = Util::mwexec('fail2ban-client status');

        $result = false;
        if($res_ping === 0 && $res_stat === 0){
            $result = true;
        }
        return $result;
    }

    /**
     * Проверка запущен ли fail2ban.
     */
    static function check_fail2ban(){
        $firewall = new Firewall();
        if($firewall->fail2ban_enable && !$firewall->fail2ban_is_runing()){
            self::fail2ban_start();
        }
    }

    /**
     * Генератор правил iptables.
     * @param $arr_command
     */
    private function AddFirewallRules(&$arr_command){
        /** @var Models\FirewallRules $result */
        /** @var Models\FirewallRules $rule */
        /** @var Models\FirewallRules $rule */
        $result = Models\FirewallRules::find();
        foreach ($result as $rule){
            if($rule->portfrom !== $rule->portto && trim($rule->portto) !== ''){
                $port ="{$rule->portfrom}:{$rule->portto}";
            }else{
                $port = $rule->portfrom;
            }
            /** @var Models\NetworkFilters $network_filter */
            $network_filter = Models\NetworkFilters::findFirst($rule->networkfilterid);
            if(!$network_filter){
                Util::sys_log_msg('Firewall', "network_filter_id not found {$rule->networkfilterid}");
                continue;
            }
            if('0.0.0.0/0' === $network_filter->permit && $rule->action !== 'allow'){
                continue;
            }
            $other_data = "-p {$rule->protocol}";
            $other_data .= ($network_filter===null)?'':' -s '.$network_filter->permit;
            if($rule->protocol === 'icmp'){
                $port = '';
                $other_data .= ' --icmp-type echo-request';
            }

            $action = ($rule->action === 'allow')?'ACCEPT':'DROP';
            $arr_command[] = $this->get_iptables_input_rule($port, $other_data, $action);
        }
        // Разрешим все локальные подключения.
        $arr_command[] = $this->get_iptables_input_rule('', '-s 127.0.0.1 ', 'ACCEPT');
    }

    /**
     * Формирует строку правила iptables
     * @param string $dport
     * @param string $other_data
     * @param string $action
     * @return string
     */
    private function get_iptables_input_rule($dport='', $other_data='', $action='ACCEPT'){
		$data_port	= '';
		if(trim($dport) !== ''){
			$data_port= '--dport '.$dport;
        }
		$other_data = trim($other_data);
		return "iptables -A INPUT $other_data $data_port -j $action";
	}

    /**
     * Записываем конфиг для fail2ban. Описываем правила блокировок.
     */
    private function write_config():void {

        $user_whitelist = '';
        /** @var Models\Fail2BanRules $res */
        $res = Models\Fail2BanRules::findFirst("id = '1'");
        if($res!==null){
            $max_retry      = $res->maxretry;
            $find_time      = $res->findtime;
            $ban_time       = $res->bantime;
            $whitelist      = $res->whitelist;
            $arr_whitelist = explode(' ', $whitelist);
            foreach ($arr_whitelist as $ip_string){
                if(Verify::is_ipaddress($ip_string)){
                    $user_whitelist.="$ip_string ";
                }
            }
            $net_filters = Models\NetworkFilters::find("newer_block_ip = '1'");
            foreach ($net_filters as $filter){
                $user_whitelist.="{$filter->permit} ";
            }

            $user_whitelist = trim($user_whitelist);
        }else{
            $max_retry      = '10';
            $find_time      = '1800';
            $ban_time       = '43200';
        }
        $this->generate_jails();
        $jails = array(
            'dropbear'      => 'iptables-allports[name=SSH, protocol=all]',
            'mikoajam'      => 'iptables-allports[name=MIKOAJAM, protocol=all]',
            'mikopbx-www'   => 'iptables-allports[name=HTTP, protocol=all]'
        );
        $config = "[DEFAULT]\n".
                  "ignoreip = 127.0.0.1 {$user_whitelist}\n\n";

        $syslog_file = System::get_syslog_file();

        foreach ($jails as $jail => $action){
            $config.= "[{$jail}]\n".
                "enabled = true\n".
                "backend = process\n".
                "logpath = {$syslog_file}\n".
                // "logprocess = logread -f\n".
                "maxretry = {$max_retry}\n".
                "findtime = {$find_time}\n".
                "bantime = {$ban_time}\n".
                "logencoding = utf-8\n".
                "action = {$action}\n\n";
        }

        $log_dir = System::get_log_dir().'/asterisk/';
        $config.= "[asterisk_security_log]\n".
                  "enabled = true\n".
                  "filter = asterisk\n".
                  "action = iptables-allports[name=ASTERISK, protocol=all]\n".
                  "logencoding = utf-8\n".
                  "maxretry = {$max_retry}\n".
                  "findtime = {$find_time}\n".
                  "bantime = {$ban_time}\n".
                  "logpath = {$log_dir}security_log\n\n";

        $config.= "[asterisk_error]\n".
                  "enabled = true\n".
                  "filter = asterisk\n".
                  "action = iptables-allports[name=ASTERISK_ERROR, protocol=all]\n".
                  "maxretry = {$max_retry}\n".
                  "findtime = {$find_time}\n".
                  "bantime = {$ban_time}\n".
                  "logencoding = utf-8\n".
                  "logpath = {$log_dir}error\n\n";

        $config.= "[asterisk_public]\n".
                  "enabled = true\n".
                  "filter = asterisk\n".
                  "action = iptables-allports[name=ASTERISK_PUBLIC, protocol=all]\n".
                  "maxretry = {$max_retry}\n".
                  "findtime = {$find_time}\n".
                  "bantime = {$ban_time}\n".
                  "logencoding = utf-8\n".
                  "logpath = {$log_dir}messages\n\n";

        Util::file_write_content('/etc/fail2ban/jail.local',$config);
    }

    /**
     * Создаем дополнительные правила.
     */
    private function generate_jails(){

        $conf = "[INCLUDES]\n".
                "before = common.conf\n".
                "[Definition]\n".
                "_daemon = (authpriv.warn |auth.warn )?miko_ajam\n".
                'failregex = ^%(__prefix_line)sFrom\s+<HOST>.\s+UserAgent:\s+[a-zA-Z0-9 \s\.,/:;\+\-_\)\(\[\]]*.\s+Fail\s+auth\s+http.$'."\n".
                '            ^%(__prefix_line)sFrom\s+<HOST>.\s+UserAgent:\s+[a-zA-Z0-9 \s\.,/:;\+\-_\)\(\[\]]*.\s+File\s+not\s+found.$'."\n".
                "ignoreregex =\n";
        file_put_contents('/etc/fail2ban/filter.d/mikoajam.conf', $conf);

        $conf = "[INCLUDES]\n".
                "before = common.conf\n".
                "[Definition]\n".
                "_daemon = [\S\W\s]+web_auth\n".
                'failregex = ^%(__prefix_line)sFrom:\s<HOST>\sUserAgent:(\S|\s)*Wrong password$'."\n".
                '            ^(\S|\s)*nginx:\s+\d+/\d+/\d+\s+(\S|\s)*status\s+403(\S|\s)*client:\s+<HOST>(\S|\s)*'."\n".
                "ignoreregex =\n";
        file_put_contents('/etc/fail2ban/filter.d/mikopbx-www.conf', $conf);

        $conf = "[INCLUDES]\n".
                "before = common.conf\n".
                "[Definition]\n".
                "_daemon = (authpriv.warn )?dropbear\n".
                'prefregex = ^%(__prefix_line)s<F-CONTENT>(?:[Ll]ogin|[Bb]ad|[Ee]xit).+</F-CONTENT>$'."\n".
                'failregex = ^[Ll]ogin attempt for nonexistent user (\'.*\' )?from <HOST>:\d+$'."\n".
                '            ^[Bb]ad (PAM )?password attempt for .+ from <HOST>(:\d+)?$'."\n".
                '            ^[Ee]xit before auth \(user \'.+\', \d+ fails\): Max auth tries reached - user \'.+\' from <HOST>:\d+\s*$'."\n".
                "ignoreregex =\n";
        file_put_contents('/etc/fail2ban/filter.d/dropbear.conf', $conf);

    }

    /**
     * Завершение работы fail2ban;
     */
    static function fail2ban_stop(){
        Util::mwexec('fail2ban-client -x stop');
    }

    /**
     * Старт firewall.
     */
    static function fail2ban_start(){
        Util::killbyname('fail2ban-server');
        $cmd_start      = 'fail2ban-client -x start';
        $command        = "($cmd_start;) > /dev/null 2>&1 &";
        Util::mwexec($command);
    }

    /**
     * Удалить адрес из бана.
     * @param $ip
     * @return array
     */
    static function fail2ban_unban_all($ip){
        $ip = trim($ip);
        $result = array('result'=>'Success');
        if(!Verify::is_ipaddress($ip)){
            $result['message'] = "Not valid ip '{$ip}'.";
            return $result;
        }
        $config = new Config();
        $fail2ban_enable = $config->get_general_settings('PBXFail2BanEnabled');
        $enable = ($fail2ban_enable == '1');
        if($enable){
            // Попробуем найти jail по данным DB.
            $data = self::get_ban_ip($ip);
            foreach ($data as $row){
                $res = self::fail2ban_unban($ip, $row['jail']);
                if($res['result']==='ERROR'){
                    $result = $res;
                }
            }
        }else{
            $result = self::fail2ban_unban_db($ip);
        }

        return $result;
    }

    /**
     * Удалить из бана конкретный IP из конкретного jail.
     * @param $ip
     * @param $jail
     * @return array
     */
    static function fail2ban_unban($ip, $jail){
        $res = array('result' => 'ERROR');
        $ip  = trim($ip);
        // Валидация...
        $matches = array();
        preg_match_all('/^[a-z-]+$/', $jail, $matches, PREG_SET_ORDER);
        if(!Verify::is_ipaddress($ip) || count($matches)===0){
            // это НЕ IP адрес, или не корректно указан jail.
            $res['message'] = 'Not valid ip or jail.';
            return $res;
        }
        $path_sock = '/var/run/fail2ban/fail2ban.sock';
        if(file_exists($path_sock) && filetype($path_sock) === 'socket'){
            $out = array();
            Util::mwexec("fail2ban-client set {$jail} unbanip {$ip} 2>&1", $out);
            $res_data = trim(implode('', $out));
            if($res_data !== $ip && $res_data !== "IP $ip is not banned"){
                $res['message'] = 'Error fail2ban-client. '.$res_data;
                return $res;
            }
        }else{
            $res['message'] = 'Fail2ban not run.';
            return $res;
        }

        $res = self::fail2ban_unban_db($ip, $jail);
        return $res;
    }

    /**
     * Удаление бана из базы.
     * @param        $ip
     * @param string $jail
     * @return array
     */
    static function fail2ban_unban_db($ip, $jail=''){
        $jail_q     = ($jail==='')?'':"AND jail = '{$jail}'";
        $path_db    = self::fail2ban_get_db_path();
        $db         = new SQLite3($path_db);
        $db->busyTimeout(3000);
        if(FALSE === self::table_ban_exists($db)){
            // Таблица не существует. Бана нет.
            $res = [
                'result'    => 'Success',
                'message'   => ''
            ];
            return $res;
        }
        $q = 'DELETE'." FROM bans WHERE ip = '{$ip}' {$jail_q}";
        $db->query($q);

        $err = $db->lastErrorMsg();
        $res = [
            'result'    => ($err === 'not an error')?'Success':'ERROR',
            'message'   =>  $err
        ];

        return $res;
    }

    /**
     * Возвращает путь к файлу базы данных fail2ban.
     * @return string
     */
    static function fail2ban_get_db_path(){
        return '/var/lib/fail2ban/fail2ban.sqlite3';
    }

    /**
     * Создает служебные директории и ссылки на файлы fail2ban
     * @return string
     */
    static function fail2ban_make_dirs(){
        global $g;
        $res_file = self::fail2ban_get_db_path();
        $filename = basename($res_file);

        $old_dir_db   = $g['cf_path'].'/fail2ban';
        $dir_db = self::get_fail2ban_db_dir();

        // Создаем рабочие каталоги.
        $db_bd_dir = dirname($res_file);
        if(!is_dir($db_bd_dir) && !mkdir($db_bd_dir,0755, true) && !is_dir($db_bd_dir)){
            Util::log_msg_db('Fail2ban', 'Error create dir '.$db_bd_dir);
        }
        if(!is_dir($dir_db) && !mkdir($dir_db,0755, true) && !is_dir($dir_db)){
            Util::log_msg_db('Fail2ban', 'Error create dir '.$dir_db);
        }

        $create_link = false;

        // Символическая ссылка на базу данных.
        if(@filetype($res_file) !== 'link'){
            @unlink($res_file);
            $create_link = true;
        }elseif(readlink($res_file) === "$old_dir_db/$filename"){
            @unlink($res_file);
            $create_link = true;
            if(file_exists("$old_dir_db/$filename")){
                // Перемещаем файл в новое местоположение.
                Util::mwexec("mv '$old_dir_db/$filename' '$dir_db/$filename'");
            }
        }

        if($create_link === true){
            @symlink("$dir_db/$filename", $res_file);
        }
        return $res_file;
    }

    static function get_fail2ban_db_dir(){
        if( Storage::is_storage_disk_mounted() ){
            $mount_point = Storage::get_media_dir();
            $db_dir = "$mount_point/fail2ban";
        }else{
            $db_dir = "/var/spool/fail2ban";
        }
        if(!is_dir($db_dir) && !mkdir($db_dir,0755, true) && !is_dir($db_dir)){
            Util::log_msg_db('Fail2ban', 'Error create dir '.$db_dir);
        }
        if(!file_exists($db_dir)){
            $db_dir = '/tmp';
        }
        return $db_dir;
    }

    /**
     * Возвращает массив забаненных ip. Либо данные по конкретному адресу.
     * @param null $ip
     * @return array
     */
    static function get_ban_ip($ip = null){
        $result = [];
        $q = 'SELECT'.' DISTINCT jail,ip,MAX(timeofban) AS timeofban FROM bans ';
        if($ip !== null){
            $q .= "WHERE ip='{$ip}'";
        }
        $q.=' GROUP BY jail,ip';

        $path_db = self::fail2ban_get_db_path();
        $db = new SQLite3($path_db);
        $db->busyTimeout(5000);

        if(FALSE === self::table_ban_exists($db)){
            // Таблица не существует. Бана нет.
            return $result;
        }

        $results  = $db->query($q);
        if(FALSE !== $results && $results->numColumns()>0){
            while($res = $results->fetchArray(SQLITE3_ASSOC)){
                if(strpos($res['jail'], 'asterisk') === 0){
                    $res['jail'] = 'asterisk';
                }
                $result[] = $res;
            }
        }

        return $result;
    }

    /**
     * Проверка существования таблицы ban в базе данных.
     * @param SQLite3 $db
     * @return bool
     */
    static function table_ban_exists($db){
        $q_check = 'SELECT'.' name FROM sqlite_master WHERE type = "table" AND name="bans"';
        $result_check  = $db->query($q_check);
        $result = (FALSE !== $result_check && $result_check->fetchArray(SQLITE3_ASSOC) !== FALSE);
        return $result;
    }

}
