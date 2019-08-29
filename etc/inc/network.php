<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2019
 */

require_once 'globals.php';
require_once 'ipv4_subnet_calc.php';

/**
 * Class Network
 */
class Network {

    private $config;

    /**
     * Network constructor.
     */
    function __construct(){
        // Класс / обертка для работы с настройками.
        $this->config = new Config();
    }

	/**
	 * Up loopback.
	**/
	public function lo_configure(){
		Util::mwexec("/sbin/ifconfig lo 127.0.0.1");
	}

    /**
     * Возвращает имя сервера в виде ассоциативного массива.
     * @return array
     */
    static function getHostName(){
        $data = array(
            'hostname'  => 'mikopbx.local',
            'domain' 	=> ''
        );
        /** @var \Models\LanInterfaces $res */
        $res = Models\LanInterfaces::findFirst("internet = '1'");
        if(null != $res){
            $data['hostname'] = $res->hostname;
            $data['domain']   = $res->domain;
        }
        $data['hostname'] = (empty($data['hostname']))?'mikopbx.local':$data['hostname'];
        return $data;

    }

	/**
	 * Generates resolv.conf
	**/
	public function resolvconf_generate() {
		global $g;
	    $resolv_conf = '';
	    $data_hostname = Network::getHostName();
	    if(trim($data_hostname['domain']) != ''){
			$resolv_conf .= "domain {$data_hostname['domain']}\n";
	    }

		$dns  = $this->getHostDNS();
		foreach ($dns as $ns) {
			if (trim($ns) !== ''){
				$resolv_conf .= "nameserver $ns\n";
			} 			
		}
		if(count($dns)===0){
            $resolv_conf .= "nameserver 127.0.0.1\n";
        }

		file_put_contents("{$g['pt1c_etc_path']}/resolv.conf", $resolv_conf);
	}

    /**
     * Возвращает массив DNS серверов из настроек.
     * @return array
     */
    public function getHostDNS(){
        $dns = [];
        /** @var \Models\LanInterfaces $res */
        $res = Models\LanInterfaces::findFirst("internet = '1'");
        if(null != $res){
            if('' != trim($res->primarydns) )   $dns[] = $res->primarydns;
            if('' != trim($res->secondarydns) ) $dns[] = $res->secondarydns;
        }
        return $dns;

    }

    /**
     * Получение настроек интерфейсов LAN.
     * @return array
     */
    public function getGeneralNetSettings(){
        // Массив сетевых интерфейсов, которые видит ОС.
        $src_array_eth = $this->get_interface_names();
        // Создаем копию массива сетевых интерфейсов.
        $array_eth = $src_array_eth;
        $res = Models\LanInterfaces::find(['order' => 'interface,vlanid']);
        $networks = $res->toArray();
        if(count($networks)>0){
            // Дополнительная обработка данных.
            foreach ($networks as &$if_data){
                $if_data['interface_orign'] = $if_data['interface'];
                $if_data['interface'] = ($if_data['vlanid']>0)? "vlan{$if_data['vlanid']}" : $if_data['interface'];
                $if_data['dhcp'] = ($if_data['vlanid']>0)? 0: $if_data['dhcp'];

                if( Verify::is_ipaddress($if_data['subnet']) ){
                    $if_data['subnet'] = $this->net_mask_to_cidr($if_data['subnet']);
                }

                $key = array_search($if_data['interface_orign'], $src_array_eth);
                if( $key !==  FALSE ){
                    // Интерфейс найден.
                    // Удаляем элемент массива, если это не VLAN.
                    if($if_data['vlanid'] == 0){
                        unset($array_eth[$key]);
                        $this->enableLanInterface($if_data['interface_orign']);
                    }
                }else{
                    // Интерфейс не существует.
                    $this->disableLanInterface($if_data['interface_orign']);
                    // Отключаем интерфейс.
                    $if_data['disabled'] = 1;
                }
            }
        }else if( count($array_eth)>0 ){
            $networks = [];
            // Настраиваем основной интерфейс.
            $networks[]=$this->addLanInterface($array_eth[0], true);
            unset($array_eth[0]);
        }
        // $array_eth - в массиве останутся только те элементы,
        // по которым нет настроек в базе дынных.
        // Следует добавить настройки "по умолчанию".
        foreach ($array_eth as $eth){
            // Добавляем. Все интерфейсы, отключаем.
            $networks[]=$this->addLanInterface($eth, false);
        }

        return $networks;
    }

    /**
     * Добавляем в базу данных сведения о новом интерфейсе.
     * @param      $name
     * @param bool $general
     * @return mixed
     */
    private function addLanInterface($name, $general=false){
        $disabled = 0; // ($general==true)?0:1;
        $dhcp     = 1; // ($general==true)?1:0;
        $internet = ($general==true)?1:0;

        $data = new Models\LanInterfaces();
        $data->writeAttribute('name',       $name);
        $data->writeAttribute('interface',  $name);
        $data->writeAttribute('dhcp',       $dhcp);
        $data->writeAttribute('internet',   $internet);
        $data->writeAttribute('disabled',   $disabled);
        $data->writeAttribute('vlanid',     0);
        $data->writeAttribute('hostname',   'mikopbx');
        $data->writeAttribute('domain',     'local');
        $data->writeAttribute('topology',   'private');
        $data->writeAttribute('primarydns', '127.0.0.1');

        $data->save();

        return $data->toArray();
    }

    /**
     * Включаем интерфейс по его имени.
     * @param $name
     */
    public function enableLanInterface($name){
        $if_data = Models\LanInterfaces::findFirst("interface = '{$name}'");
        if($if_data){
            $if_data->writeAttribute("disabled", 0);
            $if_data->save();
        }
    }

    /**
     * Удаляем интерфейс по его имени.
     * @param $name
     */
    public function disableLanInterface($name){
        $if_data = Models\LanInterfaces::findFirst("interface = '{$name}'");
        if($if_data){
            $if_data->writeAttribute("disabled", 1);
            $if_data->save();
        }
    }
	/**
	 * Configures LAN interface
	 */
    public function lan_configure() {
		global $g;
		$networks = $this->getGeneralNetSettings();
		$arr_commands = [];


		$eth_mtu = [];
		// Отключаем поддержку ipv6.
		foreach ($networks as $if_data){
			if($if_data['disabled'] == 1) continue;

		    $if_name = $if_data['interface'];
			$if_name = escapeshellarg( trim($if_name) );
			if('' == $if_name) continue;

            $data_hostname  =  Network::getHostName();
			$hostname 	    = "${data_hostname['hostname']}";

			if( $if_data['vlanid'] > 0 ){
                // Переопределяем имя интерфейса.
                $arr_commands[] = "/sbin/vconfig set_name_type VLAN_PLUS_VID_NO_PAD";
                // Добавляем новый интерфейс.
                $arr_commands[] = "/sbin/vconfig add {$if_data['interface_orign']} {$if_data['vlanid']}";
            }
            // Отключаем интерфейс.
            $arr_commands[] = "/sbin/ifconfig $if_name down";
            $arr_commands[] = "/sbin/ifconfig $if_name 0.0.0.0";

			/*
			if (verify_is_macaddress($if_data['mac'])) {
				$arr_commands[] = "/sbin/ifconfig $if_name hw ether $mac";
			}
			*/
			$gw_param = '';
			if($if_data['dhcp'] == 1){
                /*
                 * -t - количество попыток.
                 * -T - таймаут попытки.
                 * -v - включить отладку.
                 * -S - логи в syslog.
                 * -q - Exit after obtaining lease
                 * -n - Exit if lease is not obtained
                 */
                $options = '-t 6 -T 5 -S -q -n';
				$arr_commands[] = "/sbin/udhcpc {$options} -i {$if_name} -x hostname:{$hostname} -s {$g['pt1c_inc_path']}/workers/worker_udhcpc_configure.php";
				/*
					udhcpc  - утилита произведет настройку интерфейса 
						   	- произведет конфигурацию /etc/resolv.conf
					Дальнейшая настройка маршрутов будет произволиться в udhcpc_configure_renew_bound();
					и в udhcpc_configure_deconfig(). Эти методы будут вызваны скриптом worker_udhcpc_configure.php.
				*/
				
			}else{
				$ipaddr  = trim($if_data['ipaddr'] );
				$subnet  = trim($if_data['subnet'] );
				$gateway = trim($if_data['gateway']);
                if(empty($ipaddr)){
                    continue;
                }
				// Это короткое представление маск /24 /32.
                try {
                    $calc_subnet = new SubnetCalculator($ipaddr, $subnet);
                    $subnet = $calc_subnet->getSubnetMask();
                } catch (Exception $e) {
                    echo "Caught exception: $ipaddr $subnet",  $e->getMessage(), "\n";
                    continue;
                }

                $arr_commands[] = "/sbin/ifconfig $if_name $ipaddr netmask $subnet";
				
				if("" != trim($gateway)) $gw_param = "gw $gateway";
				
				$arr_commands[] = "/sbin/route del default $if_name";

				/** @var \Models\LanInterfaces $if_data */
                $if_data = Models\LanInterfaces::findFirst("id = '{$if_data['id']}'");
                $is_inet = ($if_data != null)?$if_data->internet:0;
                // Добавляем маршруты по умолчанию.
				if( $is_inet == 1 ){
					// ТОЛЬКО, если этот интерфейс для интернет, создаем дефолтный маршрут. 
					$arr_commands[] = "/sbin/route add default $gw_param dev $if_name";
				}
				// Поднимаем интерфейс.
				$arr_commands[] = "/sbin/ifconfig $if_name up";

                $eth_mtu[] = $if_name;
			}
		}
		$out = null;
		Util::mwexec_commands($arr_commands,$out, 'net');
		$this->hosts_generate($networks);

		foreach ($eth_mtu as $eth){
            \Util::mwexec_bg("/etc/rc/networking.set.mtu '{$eth}'");
        }

		$firewall = new Firewall();
        $firewall->apply_config();

        // Дополнительные "ручные" маршруты.
        \Util::file_write_content('/etc/static-routes', '');
        $arr_commands = []; $out = [];
        \Util::mwexec("/bin/cat /etc/static-routes | /bin/grep '^rout' | /bin/busybox awk -F ';' '{print $1}'",$arr_commands);
        \Util::mwexec_commands($arr_commands,$out, 'rout');

		return 0;
	}
	
	/**
	 * Configures LAN interface FROM udhcpc (renew_bound)
	 */
	public function udhcpc_configure_renew_bound(){
		global $g;
		// Инициализация массива переменных. 
		$env_vars = array(
			'broadcast' => '',
			'interface' => '',
			'ip'		=> '',
			'router'	=> '',
			'timesvr'	=> '',
			'namesvr'	=> '',
			'dns'		=> '',
			'hostname'	=> '',
			'subnet'	=> '',
			'serverid'	=> '',
			'domain'	=> ''	
		);
		// Получаем значения переменных окружения. 
		foreach ($env_vars as $key => $value){
			$env_vars[$key] = trim(getenv($key));
		}
		$BROADCAST = ($env_vars['broadcast'] == '')?"":"broadcast {$env_vars['broadcast']}";
        $NET_MASK   = ($env_vars['subnet']    == '')?"":"netmask {$env_vars['subnet']}";

		// Настраиваем интерфейс. 
		Util::mwexec("ifconfig {$env_vars['interface']} {$env_vars['ip']} $BROADCAST $NET_MASK");
		
		// Удаляем старые маршруты по умолчанию. 
		while(true){
			$out = array();
			Util::mwexec("route del default gw 0.0.0.0 dev {$env_vars['interface']}", $out);
			if(trim(implode('', $out)) != ''){
				// Произошла ошибка, значит все маршруты очищены. 
				break;
			}
				
			if($g['debug'] == true) break; // Иначе бесконечный цикл. 
		}
        // Добавляем маршруты по умолчанию.
        /** @var \Models\LanInterfaces $if_data */
        $if_data = Models\LanInterfaces::findFirst("interface = '{$env_vars['interface']}'");
        $is_inet = ($if_data != null)?$if_data->internet:0;
		if('' != $env_vars['router'] && $is_inet == 1){
			// ТОЛЬКО, если этот интерфейс для интернет, создаем дефолтный маршрут. 
			$routers = explode(' ', $env_vars['router']);
			foreach ($routers as $router){
				Util::mwexec("route add default gw {$router} dev {$env_vars['interface']}");
			}
		}

        if($is_inet == 1){
			// ТОЛЬКО, если этот интерфейс для интернет, правим resolv.conf. 
			$resolv_text = '';
			// Домен сети.
			if('' != $env_vars['domain']){
				$resolv_text.="search {$env_vars['domain']}\n";
			}
			// Прописываем основные DNS. 
			if('' != $env_vars['dns']){
				$dns = explode(' ', $env_vars['dns']);
				foreach ($dns as $i){
					$resolv_text.="nameserver $i\n";	
				}
			}
			echo "{$g['pt1c_etc_path']}/resolv.conf";
			file_put_contents("{$g['pt1c_etc_path']}/resolv.conf", $resolv_text);
		}

		// Сохрании информацию в базу данных.
		$data = array(
		    'subnet'  => $env_vars['subnet'],
            'ipaddr'  => $env_vars['ip'],
            'gateway' => $env_vars['router']
        );
		if(Verify::is_ipaddress($env_vars['ip'])){
            $data['subnet'] = $this->net_mask_to_cidr($env_vars['subnet']);

        }else{
            $data['subnet'] = '';
        }
        $this->update_if_settings($data, $env_vars['interface']);
        \Util::mwexec_bg("/etc/rc/networking.set.mtu '{$env_vars['interface']}'");
    }

    /**
     * Возвращает имя интерфейса по его id.
     * @param $id_net
     * @return string
     */
    public function get_interface_name_by_id($id_net){
        /** @var \Models\LanInterfaces $res */
        $res = Models\LanInterfaces::findFirst("id = '$id_net'");
        $interface_inet = ($res == null)?'':$res->interface;

        return $interface_inet;
    }

	/**
	 * Configures LAN interface FROM udhcpc (deconfig)
	 */
	public function udhcpc_configure_deconfig(){
		// Настройка по умолчанию.
		$interface = trim(getenv('interface'));
		Util::mwexec("ifconfig $interface 192.168.2.1 netmask 255.255.255.0");
        $data = array(
            'subnet'  => '24',
            'ipaddr'  => '192.168.2.1',
            'gateway' => ''
        );
        $this->update_if_settings($data, $interface);
	}	
	
	/**
	 * Настройка hosts
     * @param $networks
     */
    public function hosts_generate($networks){
		global $g;
		$hosts = "127.0.0.1 localhost\n";
		foreach ($networks as $if_data){
            if($if_data['internet'] == 1){
                $data 		         = Network::getHostName();
                $if_data['hostname'] = "${data['hostname']}";
            }
            $if_info = $this->get_interface($if_data['interface']);
			if(NULL == $if_info['ipaddr'] || empty($if_data['hostname'])){
				continue;
			}
			$hosts .= "{$if_info['ipaddr']} {$if_data['hostname']}\n";
		}
        \Util::file_write_content("{$g['pt1c_etc_path']}/hosts", $hosts);
	}
	
	/**
	 * Имена всех подключенных сетевых интерфейсов.
	 */
	public function get_interface_names() {
		Util::mwexec("ls /proc/sys/net/ipv4/conf/ | grep eth", $names);
		return $names;
	}

	/**
	 * Сбор информации по сетевому интерфейсу.
     * @param $name
     * @return array
     */
	public function get_interface($name) {
		$interface = array();
		
		// Получаем ifconfig's для interface $name. 
		Util::mwexec("/sbin/ifconfig $name 2>/dev/null", $output);
		$output = implode(" ", $output);
	
		// Парсим mac
		preg_match("/HWaddr (\S+)/", $output, $matches);
		$interface['mac'] = (count($matches)>0)?$matches[1]:'';
	
		// Парсим ip.
		preg_match("/inet addr:(\S+)/", $output, $matches);
		$interface['ipaddr'] = (count($matches)>0)?$matches[1]:'';
	
		// Парсим подсеть. 
		preg_match("/Mask:(\S+)/", $output, $matches);
		$subnet = (count($matches)>0)?$this->net_mask_to_cidr($matches[1]):'';
		$interface['subnet'] = $subnet;
	
		// Поднят ли интерфейс? 
		preg_match("/\s+(UP)\s+/", $output, $matches);
		$status = (count($matches)>0)?$matches[1]:'';
		if ($status == "UP") {
			$interface['up'] = true;
		} else {
			$interface['up'] = false;
		}
	
		Util::mwexec('/sbin/route -n | grep '.$name.'| grep "^0.0.0.0" | cut -d " " -f 10', $matches);	
		$gw = (count($matches)>0)?$matches[0]:'';
		if (Verify::is_ipaddress($gw)) {
			$interface['gateway'] = $gw;
		}
	
		Util::mwexec('cat /etc/resolv.conf | grep "nameserver" | cut -d " " -f 2', $dnsout);
		foreach ($dnsout as $line) {
			if (Verify::is_ipaddress($line)) {
				$interface['dns'][] = $line;
			}
		}
	
		return $interface;
	}

	/**
	 * Сохранение настроек сетевого интерфейса.
     * @param $data
     */
	public function update_net_settings($data){
	    $res = Models\LanInterfaces::findFirst("internet = '1'");
	    $update_inet = false;
	    if($res == null){
            $res = Models\LanInterfaces::findFirst();
            $update_inet = true;
        }

        if($res != null){
            foreach ($data as $key => $value){
                $res->writeAttribute("$key", "$value");
            }
            if($update_inet == true){
                $res->writeAttribute("internet", "1");
            }
            $res->save();
        }
    }

    /**
     * Сохранение настроек сетевого интерфейса.
     * @param $data
     * @param $name
     */
    public function update_if_settings($data, $name){
        $res = Models\LanInterfaces::findFirst("interface = '$name' AND vlanid=0");
        foreach ($data as $key => $value){
            $res->writeAttribute("$key", "$value");
        }
        $res->save();
    }

    /**
     * Возвращает массив с информацией по сетевым интерфейсам.
     * @return array
     */
    public function get_interfaces() {
		
		// get network interface names
		$i_names = $this->get_interface_names();
		// interface information array
		$if_list = array();
		// go through each name and populate the interface information array
		foreach ($i_names as $i) {
			if (preg_match("/^(eth)\d/", $i)) {
                $if_list[$i] = $this->get_interface($i);
			}
		}
		return $if_list;
	}

    /**
     * Преобразует сетевую маску в CIDR представление.
     * @param $net_mask
     * @return int
     */
	public function net_mask_to_cidr($net_mask){
        $bits = 0;
        $net_mask = explode(".", $net_mask);

        foreach($net_mask as $oct_ect)
            $bits += strlen(str_replace("0", "", decbin($oct_ect)));

		return $bits;
    }
	
}
