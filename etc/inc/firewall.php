<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 3 2019
 */

require_once("globals.php");

class Firewall{
    private $firewall_enable = false;
    private $fail2ban_enable = false;

    /**
     * Firewall constructor.
     */
    function __construct(){
        // Получение настроек.
        $config = new Config();

        $firewall_enable = $config->get_general_settings('PBXFirewallEnabled');
        $this->firewall_enable = ($firewall_enable == '1');

        $fail2ban_enable = $config->get_general_settings('PBXFail2BanEnabled');
        $this->fail2ban_enable = ($fail2ban_enable == '1');
    }

    /**
	 *	Удаление всех правил Firewall. 
	**/
	private function drop_all_rules(){
		Util::mwexec("iptables -F");
		Util::mwexec("iptables -X");
	}

	/**
	 *	Установка правил Firewall. 
	**/
    public function apply_config(){
        $this->fail2ban_stop();
        $this->drop_all_rules();
		Firewall::fail2ban_make_dirs();

        if($this->firewall_enable){
            $arr_command = array();
            $arr_command[] = $this->get_iptables_input_rule('', '-m conntrack --ctstate ESTABLISHED,RELATED', 'ACCEPT');
            // Добавляем разрешения на сервисы.
            $this->AddFirewallRules($arr_command);
            // Все остальное запрещаем.
            $arr_command[] = $this->get_iptables_input_rule('', '', "DROP");

            Util::mwexec_commands($arr_command, $out, 'firewall');
        }
        if($this->fail2ban_enable){
            // Настройка правил бана.
            $this->write_config();
            $this->fail2ban_start();
        }else{
            $this->fail2ban_stop();
        }
    }

    /**
     * Рестарт firewall.
     */
    static function reload_firewall(){
        $result   = array();

        $firewall = new Firewall();
        $firewall->apply_config();

        $result['result'] = 'Success';
        return $result;
    }

    /**
     * Генератор правил iptables.
     * @param $arr_command
     */
    private function AddFirewallRules(&$arr_command){
        /** @var \Models\FirewallRules $result */
        /** @var \Models\FirewallRules $rule */
        /** @var \Models\FirewallRules $rule */
        $result = \Models\FirewallRules::find();
        foreach ($result as $rule){
            $port   = "{$rule->portfrom}";
            if($rule->portfrom != $rule->portto && trim($rule->portto) != ''){
                $port.=":{$rule->portto}";
            }
            /** @var \Models\NetworkFilters $network_filter */
            $network_filter = \Models\NetworkFilters::findFirst($rule->networkfilterid);
            if(!$network_filter){
                \Util::sys_log_msg('Firewall', "network_filter_id not found {$rule->networkfilterid}");
                continue;
            }
            if('0.0.0.0/0' == $network_filter->permit && $rule->action != 'allow'){
                continue;
            }
            $other_data = "-p {$rule->protocol}";
            $other_data .= ($network_filter==null)?'':' -s '.$network_filter->permit;
            if($rule->protocol == 'icmp'){
                $port = '';
                $other_data .= ' --icmp-type echo-request';
            }

            $action = ($rule->action == 'allow')?'ACCEPT':'DROP';
            $arr_command[] = $this->get_iptables_input_rule("$port", "$other_data", "$action");
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
		$data_port	= "";
		if(trim($dport) != ''){
			$data_port= "--dport ".$dport;
        }
		$other_data = trim($other_data);
		$rule = "iptables -A INPUT $other_data $data_port -j $action";
		return $rule;
	}

    /**
     * Записываем конфиг для fail2ban. Описываем правила блокировок.
     */
    private function write_config(){

        $user_whitelist = '';
        /** @var \Models\Fail2BanRules $res */
        $res = \Models\Fail2BanRules::findFirst("id = '1'");
        if($res!=null){
            $max_retry      = $res->maxretry;
            $find_time      = $res->findtime;
            $ban_time       = $res->bantime;
            $whitelist      = $res->whitelist;
            $arr_whitelist = explode(' ', "$whitelist");
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
            'asterisk'      => 'iptables-allports[name=ASTERISK, protocol=all]',
            'dropbear'      => 'iptables-allports[name=SSH, protocol=all]',
            'mikoajam'      => 'iptables-allports[name=MIKOAJAM, protocol=all]',
            'mikopbx-www'   => 'iptables-allports[name=HTTP, protocol=all]'
        );
        $config = "[DEFAULT]\n".
                  "ignoreip = 127.0.0.1 {$user_whitelist}\n\n";

        foreach ($jails as $jail => $action){
            $config.= "[{$jail}]\n".
                "enabled = true\n".
                "backend = process\n".
                "logprocess = logread -f\n".
                "maxretry = {$max_retry}\n".
                "findtime = {$find_time}\n".
                "bantime = {$ban_time}\n".
                "logencoding = utf-8\n".
                "action = {$action}\n\n";
        }
        Util::file_write_content("/etc/fail2ban/jail.local","$config");
    }

    /**
     * Создаем дополнительные правила.
     */
    private function generate_jails(){
        $filter = 'failregex = ^%(__prefix_line)sFrom\s<HOST>.\sUserAgent:\s(\S|\s)*File not found.$';
        $conf = "[INCLUDES]\n".
                "before = common.conf\n".
                "[Definition]\n".
                "_daemon = miko_ajam\n".
                "$filter\n".
                "ignoreregex =\n";
        file_put_contents('/etc/fail2ban/filter.d/mikoajam.conf', $conf);

        $filter = 'failregex = ^%(__prefix_line)sFrom:\s<HOST>\sUserAgent:(\S|\s)*Wrong password$';
        $filter2 = '            ^(\S|\s)*nginx:\s+\d+/\d+/\d+\s+(\S|\s)*status\s+403(\S|\s)*client:\s+<HOST>(\S|\s)*';
        $conf = "[INCLUDES]\n".
                "before = common.conf\n".
                "[Definition]\n".
                "_daemon = php-errors\n".
                "$filter\n".
                "$filter2\n".
                "ignoreregex =\n";
        file_put_contents('/etc/fail2ban/filter.d/mikopbx-www.conf', $conf);

    }

    /**
     * Завершение работы fail2ban;
     */
    static function fail2ban_stop(){
        Util::mwexec("fail2ban-client -x stop");
    }

    /**
     * Старт firewall.
     */
    static function fail2ban_start(){
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
            $result["message"] = "Not valid ip '{$ip}'.";
            return $result;
        }
        $config = new Config();
        $fail2ban_enable = $config->get_general_settings('PBXFail2BanEnabled');
        $enable = ($fail2ban_enable == '1');
        if($enable){
            // Попробуем найти jail по данным DB.
            $data = Firewall::get_ban_ip($ip);
            foreach ($data as $row){
                $res = Firewall::fail2ban_unban($ip, $row['jail']);
                if($res['result']=='ERROR'){
                    $result = $res;
                }
            }
        }else{
            $result = Firewall::fail2ban_unban_db($ip);
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
        preg_match_all('/^[a-z-]+$/', $jail, $matches, PREG_SET_ORDER, 0);
        if(!Verify::is_ipaddress($ip) || count($matches)==0){
            // это НЕ IP адрес, или не корректно указан jail.
            $res['message'] = 'Not valid ip or jail.';
            return $res;
        }
        $path_sock = '/var/run/fail2ban/fail2ban.sock';
        if(file_exists($path_sock) && filetype($path_sock) == 'socket'){
            $out = array();
            Util::mwexec("fail2ban-client set {$jail} unbanip {$ip} 2>&1", $out);
            $res_data = trim(implode('', $out));
            if($res_data != $ip && $res_data != "IP $ip is not banned"){
                $res['message'] = 'Error fail2ban-client. '.$res_data;
                return $res;
            }
        }else{
            $res['message'] = 'Fail2ban not run.';
            return $res;
        }

        $res = Firewall::fail2ban_unban_db($ip, $jail);
        return $res;
    }

    /**
     * Удаление бана из базы.
     * @param        $ip
     * @param string $jail
     * @return array
     */
    static function fail2ban_unban_db($ip, $jail=''){
        $jail_q     = ($jail=='')?'':"AND jail = '{$jail}'";
        $path_db    = Firewall::fail2ban_get_db_path();
        $db         = new SQLite3($path_db);
        $db->busyTimeout(3000);
        if(FALSE == Firewall::table_ban_exists($db)){
            // Таблица не существует. Бана нет.
            $res = [
                'result'    => 'Success',
                'message'   => ''
            ];
            return $res;
        }
        $q = "DELETE"." FROM bans WHERE ip = '{$ip}' {$jail_q}";
        $db->query($q);

        $err = $db->lastErrorMsg();
        $res = [
            'result'    => ($err == 'not an error')?'Success':'ERROR',
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
        $res_file = Firewall::fail2ban_get_db_path();
        $filename = basename($res_file);
        $dir_db   = $g['cf_path'].'/fail2ban';

        // Создаем рабочие каталоги.
        @mkdir(dirname($res_file), 0755, true);
        @mkdir($dir_db,   0755, true);
        // Символическая ссылка на базу данных.
        if(@filetype("$res_file") != 'link'){
            @unlink("$res_file");
            @symlink("$dir_db/$filename", "$res_file");
        }
        return "$res_file";
    }

    /**
     * Возвращает массив забаненных ip. Либо данные по конкретному адресу.
     * @param null $ip
     * @return array
     */
    static function get_ban_ip($ip = null){
        $result = [];
        $q = 'SELECT'.' DISTINCT jail,ip,MAX(timeofban) AS timeofban FROM bans ';
        if($ip != null){
            $q .= "WHERE ip='{$ip}'";
        }
        $q.=' GROUP BY jail,ip';

        $path_db = Firewall::fail2ban_get_db_path();
        $db = new SQLite3($path_db);
        $db->busyTimeout(5000);

        if(FALSE == Firewall::table_ban_exists($db)){
            // Таблица не существует. Бана нет.
            return $result;
        }

        $results  = $db->query($q);
        if(FALSE != $results && $results->numColumns()>0){
            while($res = $results->fetchArray(SQLITE3_ASSOC)){
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
        $result = (FALSE != $result_check && $result_check->fetchArray(SQLITE3_ASSOC) != FALSE);
        return $result;
    }

}
