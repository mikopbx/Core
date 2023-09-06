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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\{LanInterfaces, PbxSettings};
use MikoPBX\Core\System\Configs\IptablesConf;
use MikoPBX\Core\Utilities\SubnetCalculator;
use Phalcon\Di\Injectable;
use Phalcon\Mvc\Model;
use Throwable;

/**
 * Class Network
 */
class Network extends Injectable
{

    public static function startSipDump(): void
    {
        $config = new MikoPBXConfig();
        $use    = $config->getGeneralSettings('USE_PCAP_SIP_DUMP');
        if ($use !== '1') {
            return;
        }

        Processes::killByName('pcapsipdump');
        $log_dir = System::getLogDir() . '/pcapsipdump';
        Util::mwMkdir($log_dir);

        $network         = new Network();
        $arr_eth         = $network->getInterfacesNames();
        $pcapsipdumpPath = Util::which('pcapsipdump');
        foreach ($arr_eth as $eth) {
            $pid_file = "/var/run/pcapsipdump_{$eth}.pid";
            Processes::mwExecBg(
                $pcapsipdumpPath . ' -T 120 -P ' . $pid_file . ' -i ' . $eth . ' -m \'^(INVITE|REGISTER)$\' -L ' . $log_dir . '/dump.db'
            );
        }
    }

    /**
     * Имена всех подключенных сетевых интерфейсов.
     */
    public function getInterfacesNames()
    {
        // Универсальная команда для получения всех PCI сетевых интерфейсов.
        $lsPath   = Util::which('ls');
        $grepPath = Util::which('grep');
        $awkPath  = Util::which('awk');
        Processes::mwExec("{$lsPath} -l /sys/class/net | {$grepPath} devices | {$grepPath} -v virtual | {$awkPath} '{ print $9 }'", $names);

        return $names;
    }

    /**
     * Setups loopback network.
     **/
    public function loConfigure():void
    {
        $busyboxPath  = Util::which('busybox');
        $ifconfigPath = Util::which('ifconfig');
        Processes::mwExec("{$busyboxPath} {$ifconfigPath} lo 127.0.0.1");
    }

    /**
     * Generates resolv.conf
     **/
    public function resolvConfGenerate(): void
    {
        if(Util::isDocker()){
            return;
        }
        $resolv_conf   = '';
        $data_hostname = self::getHostName();
        if (trim($data_hostname['domain']) !== '') {
            $resolv_conf .= "domain {$data_hostname['domain']}\n";
        }

        $resolv_conf .= "nameserver 127.0.0.1\n";

        $named_dns = [];
        $dns       = $this->getHostDNS();
        foreach ($dns as $ns) {
            if (trim($ns) === '') {
                continue;
            }
            $named_dns[] = $ns;
            $resolv_conf .= "nameserver {$ns}\n";
        }
        if (count($dns) === 0) {
            $resolv_conf .= "nameserver 4.4.4.4\n";
            $named_dns[] .= "8.8.8.8";
        }

        if (Util::isSystemctl()) {
            $s_resolv_conf = "[Resolve]\n"
                . "DNS=127.0.0.1\n";
            if (trim($data_hostname['domain']) !== '') {
                $s_resolv_conf .= "Domains={$data_hostname['domain']}\n";
            }
            file_put_contents('/etc/systemd/resolved.conf', $s_resolv_conf);
            $systemctlPath = Util::which('systemctl');
            Processes::mwExec("{$systemctlPath} restart systemd-resolved");
        } else {
            file_put_contents('/etc/resolv.conf', $resolv_conf);
        }

        $this->generatePdnsdConfig($named_dns);
    }

    /**
     * Возвращает имя сервера в виде ассоциативного массива.
     *
     * @return array
     */
    public static function getHostName(): array
    {
        $data = [
            'hostname' => 'mikopbx',
            'domain'   => '',
        ];
        /** @var LanInterfaces $res */
        $res = LanInterfaces::findFirst("internet = '1'");
        if (null !== $res) {
            $data['hostname'] = $res->hostname;
            $data['domain']   = $res->domain;
        }
        $data['hostname'] = (empty($data['hostname'])) ? 'mikopbx' : $data['hostname'];

        return $data;
    }

    /**
     * Возвращает массив DNS серверов из настроек.
     *
     * @return array
     */
    public function getHostDNS(): array
    {
        $dns = [];
        /** @var LanInterfaces $res */
        $res = LanInterfaces::findFirst("internet = '1'");
        if (null !== $res) {
            if ( ! empty($res->primarydns) && '127.0.0.1' !== $res->primarydns) {
                $dns[] = $res->primarydns;
            }
            if ( ! empty($res->secondarydns) && '127.0.0.1' !== $res->secondarydns) {
                $dns[] = $res->secondarydns;
            }
        }

        return $dns;
    }

    /**
     * Настройка кэширующего DNS сервера.
     *
     * @param $named_dns
     */
    public function generatePdnsdConfig($named_dns): void
    {
        $tempDir   = $this->di->getShared('config')->path('core.tempDir');
        $cache_dir = $tempDir . '/pdnsd/cache';
        Util::mwMkdir($cache_dir);

        $conf = 'global {' . "\n" .
            '	perm_cache=10240;' . "\n" .
            '	cache_dir="' . $cache_dir . '";' . "\n" .
            '	pid_file = /var/run/pdnsd.pid;' . "\n" .
            '	run_as="nobody";' . "\n" .
            '	server_ip = 127.0.0.1;' . "\n" .
            '	status_ctl = on;' . "\n" .
            '	query_method=udp_tcp;' . "\n" .
            '	min_ttl=15m;' . "\n" .
            '	max_ttl=1w;' . "\n" .
            '	timeout=10;' . "\n" .
            '	neg_domain_pol=on;' . "\n" .
            '	run_as=root;' . "\n" .
            '	daemon=on;' . "\n" .
            '}' . "\n" .
            'server {' . "\n" .
            '	label = "main";' . "\n" .
            '	ip = ' . implode(', ', $named_dns) . ';' . "\n" .
            '	interface=lo;' . "\n" .
            '	uptest=if;' . "\n" .
            '	interval=10m;' . "\n" .
            '	purge_cache=off;' . "\n" .
            '}';

        $pdnsdConfFile  = '/etc/pdnsd.conf';
        $savedConf = '';
        if(file_exists($pdnsdConfFile)){
            $savedConf = file_get_contents($pdnsdConfFile);
        }
        if($savedConf !== $conf){
            file_put_contents($pdnsdConfFile, $conf);
        }
        $pdnsdPath = Util::which('pdnsd');
        $pid       = Processes::getPidOfProcess($pdnsdPath);
        if (!empty($pid) && $savedConf === $conf) {
            // Выполним дополнительную проверку, работает ли сервер.
            $resultResolve = gethostbynamel('lic.miko.ru');
            if($resultResolve !== false){
                // Ничего делать не нужно. Конфиг не изменился. Рестарт не требуется.
                return;
            }
            // Выполним reload сервера DNS.
        }
        if (!empty($pid)) {
            // Завершаем процесс.
            $busyboxPath = Util::which('busybox');
            $killPath = Util::which('kill');
            Processes::mwExec("{$busyboxPath} {$killPath} '$pid'");
        }
        Processes::mwExec("{$pdnsdPath} -c /etc/pdnsd.conf -4");
    }

    /**
     * Configures LAN interface
     *
     * @return int
     */
    public function lanConfigure(): int
    {
        if(Util::isDocker()){
            // Обновляем список интерфейсов.
            $this->getGeneralNetSettings();
            return 0;
        }

        $busyboxPath = Util::which('busybox');
        $vconfigPath = Util::which('vconfig');
        $killallPath = Util::which('killall');

        $networks     = $this->getGeneralNetSettings();
        $arr_commands = [];
        $arr_commands[] = "{$killallPath} udhcpc";
        $eth_mtu = [];
        foreach ($networks as $if_data) {
            if ($if_data['disabled'] === '1') {
                continue;
            }

            $if_name = $if_data['interface'];
            $if_name = escapeshellcmd(trim($if_name));
            if (empty($if_name)) {
                continue;
            }

            $data_hostname = self::getHostName();
            $hostname      = $data_hostname['hostname'];

            if ($if_data['vlanid'] > 0) {
                // Переопределяем имя интерфейса.
                $arr_commands[] = "{$vconfigPath} set_name_type VLAN_PLUS_VID_NO_PAD";
                // Добавляем новый интерфейс.
                $arr_commands[] = "{$vconfigPath} add {$if_data['interface_orign']} {$if_data['vlanid']}";
            }
            // Отключаем интерфейс.
            $arr_commands[] = "{$busyboxPath} ifconfig $if_name down";
            $arr_commands[] = "{$busyboxPath} ifconfig $if_name 0.0.0.0";

            $gw_param = '';
            if (trim($if_data['dhcp']) === '1') {
                /*
                 * -t - количество попыток.
                 * -T - таймаут попытки.
                 * -v - включить отладку.
                 * -S - логи в syslog.
                 * -q - Exit after obtaining lease
                 * -n - Exit if lease is not obtained
                 */
                $pid_file = "/var/run/udhcpc_{$if_name}";
                $pid_pcc  = Processes::getPidOfProcess($pid_file);
                if ( ! empty($pid_pcc) && file_exists($pid_file)) {
                    // Завершаем старый процесс.
                    $killPath = Util::which('kill');
                    $catPath  = Util::which('cat');
                    system("{$killPath} `{$catPath} {$pid_file}` {$pid_pcc}");
                }
                $udhcpcPath = Util::which('udhcpc');
                $nohupPath  = Util::which('nohup');

                // Получаем IP и дожидаемся завершения процесса.
                $workerPath     = '/etc/rc/udhcpc.configure';
                $options        = '-t 6 -T 5 -q -n';
                $arr_commands[] = "{$udhcpcPath} {$options} -i {$if_name} -x hostname:{$hostname} -s {$workerPath}";
                // Старутем новый процесс udhcpc в  фоне.
                $options        = '-t 6 -T 5 -S -b -n';
                $arr_commands[] = "{$nohupPath} {$udhcpcPath} {$options} -p {$pid_file} -i {$if_name} -x hostname:{$hostname} -s {$workerPath} 2>&1 &";
                /*
                    udhcpc  - утилита произведет настройку интерфейса
                               - произведет конфигурацию /etc/resolv.conf
                    Дальнейшая настройка маршрутов будет произволиться в udhcpcConfigureRenewBound();
                    и в udhcpcConfigureDeconfig(). Эти методы будут вызваны скриптом WorkerUdhcpcConfigure.php.
                    // man udhcp
                    // http://pwet.fr/man/linux/administration_systeme/udhcpc/

                */
            } else {
                $ipaddr  = trim($if_data['ipaddr']);
                $subnet  = trim($if_data['subnet']);
                $gateway = trim($if_data['gateway']);
                if (empty($ipaddr)) {
                    continue;
                }
                // Это короткое представление маск /24 /32.
                try {
                    $calc_subnet = new SubnetCalculator($ipaddr, $subnet);
                    $subnet      = $calc_subnet->getSubnetMask();
                } catch (Throwable $e) {
                    echo "Caught exception: $ipaddr $subnet", $e->getMessage(), "\n";
                    continue;
                }

                $ifconfigPath   = Util::which('ifconfig');
                $arr_commands[] = "{$busyboxPath} {$ifconfigPath} $if_name $ipaddr netmask $subnet";

                if ("" !== trim($gateway)) {
                    $gw_param = "gw $gateway";
                }

                $routePath      = Util::which('route');
                $arr_commands[] = "{$busyboxPath} {$routePath} del default $if_name";

                /** @var LanInterfaces $if_data */
                $if_data = LanInterfaces::findFirst("id = '{$if_data['id']}'");
                $is_inet = ($if_data !== null) ? (string)$if_data->internet : '0';
                // Добавляем маршруты по умолчанию.
                if ($is_inet === '1') {
                    // ТОЛЬКО, если этот интерфейс для интернет, создаем дефолтный маршрут.
                    $arr_commands[] = "{$busyboxPath} {$routePath} add default $gw_param dev $if_name";
                }
                // Поднимаем интерфейс.
                $arr_commands[] = "{$busyboxPath} {$ifconfigPath} $if_name up";

                $eth_mtu[] = $if_name;
            }
        }
        $out = null;
        Processes::mwExecCommands($arr_commands, $out, 'net');
        $this->hostsGenerate();

        foreach ($eth_mtu as $eth) {
            Processes::mwExecBg("/etc/rc/networking.set.mtu '{$eth}'");
        }

        // Дополнительные "ручные" маршруты.
        Util::fileWriteContent('/etc/static-routes', '');
        $arr_commands = [];
        $out          = [];
        $grepPath     = Util::which('grep');
        $awkPath      = Util::which('awk');
        $catPath      = Util::which('cat');
        Processes::mwExec(
            "{$catPath} /etc/static-routes | {$grepPath} '^rout' | {$busyboxPath} {$awkPath} -F ';' '{print $1}'",
            $arr_commands
        );
        Processes::mwExecCommands($arr_commands, $out, 'rout');

        $this->openVpnConfigure();
        return 0;
    }

    /**
     * Получение настроек интерфейсов LAN.
     *
     * @return array
     */
    public function getGeneralNetSettings(): array
    {
        // Массив сетевых интерфейсов, которые видит ОС.
        $src_array_eth = $this->getInterfacesNames();
        // Создаем копию массива сетевых интерфейсов.
        $array_eth = $src_array_eth;
        $res       = LanInterfaces::find(['order' => 'interface,vlanid']);
        $networks  = $res->toArray();
        if (count($networks) > 0) {
            // Дополнительная обработка данных.
            foreach ($networks as &$if_data) {
                $if_data['interface_orign'] = $if_data['interface'];
                $if_data['interface']       = ($if_data['vlanid'] > 0) ? "vlan{$if_data['vlanid']}" : $if_data['interface'];
                $if_data['dhcp']            = ($if_data['vlanid'] > 0) ? 0 : $if_data['dhcp'];

                if (Verify::isIpAddress($if_data['subnet'])) {
                    $if_data['subnet'] = $this->netMaskToCidr($if_data['subnet']);
                }

                $key = array_search($if_data['interface_orign'], $src_array_eth, true);
                if ($key !== false) {
                    // Интерфейс найден.
                    // Удаляем элемент массива, если это не VLAN.
                    if ($if_data['vlanid'] === '0') {
                        unset($array_eth[$key]);
                        $this->enableLanInterface($if_data['interface_orign']);
                    }
                } else {
                    // Интерфейс не существует.
                    $this->disableLanInterface($if_data['interface_orign']);
                    // Отключаем интерфейс.
                    $if_data['disabled'] = 1;
                }
            }
            unset($if_data);
        } elseif (count($array_eth) > 0) {
            $networks = [];
            // Настраиваем основной интерфейс.
            $networks[] = $this->addLanInterface($array_eth[0], true);
            unset($array_eth[0]);
        }
        // $array_eth - в массиве останутся только те элементы,
        // по которым нет настроек в базе дынных.
        // Следует добавить настройки "по умолчанию".
        foreach ($array_eth as $eth) {
            // Добавляем. Все интерфейсы, отключаем.
            $networks[] = $this->addLanInterface($eth, false);
        }
        $res = LanInterfaces::findFirst("internet = '1' AND disabled='0'");
        if (null === $res) {
            /** @var LanInterfaces $eth_settings */
            $eth_settings = LanInterfaces::findFirst("disabled='0'");
            if ($eth_settings !== null) {
                $eth_settings->internet = 1;
                $eth_settings->save();
            }
        }

        return $networks;
    }

    /**
     * Сбор информации о доступных адресах web интерфейса.
     * @return string
     */
    public static function getInfoMessage():string
    {
        $addresses = [
            'local' => [],
            'external' => []
        ];
        /** @var LanInterfaces $interface */
        $interfaces = LanInterfaces::find("disabled='0'");
        foreach ($interfaces as $interface){
            if(!empty($interface->ipaddr)){
                $addresses['local'][] = $interface->ipaddr;
            }
            if(!empty($interface->exthostname) && !in_array($interface->exthostname, $addresses['local'], true)){
                $addresses['external'][] = explode(':', $interface->exthostname)[0]??'';
            }
            if(!empty($interface->extipaddr) && !in_array($interface->extipaddr, $addresses['local'], true) ){
                $addresses['external'][] = explode(':', $interface->extipaddr)[0]??'';
            }
        }
        unset($interfaces);
        $port = PbxSettings::getValueByKey('WEBHTTPSPort');
        $info = PHP_EOL."   The web interface is available at the addresses:".PHP_EOL.PHP_EOL;
        foreach ($addresses['local'] as $address){
            if(empty($address)){
                continue;
            }
            $info.= "    - https://$address:$port".PHP_EOL;
        }
        $info.=PHP_EOL;
        $info.= "   The web interface is available at the external addresses:".PHP_EOL.PHP_EOL;
        foreach ($addresses['external'] as $address){
            if(empty($address)){
                continue;
            }
            $info.= "    - https://$address:$port".PHP_EOL;
        }
        $info.=PHP_EOL;

        return $info;
    }


    /**
     * Преобразует сетевую маску в CIDR представление.
     *
     * @param $net_mask
     *
     * @return int
     */
    public function netMaskToCidr($net_mask): int
    {
        $bits     = 0;
        $net_mask = explode(".", $net_mask);

        foreach ($net_mask as $oct_ect) {
            $bits += strlen(str_replace("0", "", decbin((int)$oct_ect)));
        }

        return $bits;
    }

    /**
     * Включаем интерфейс по его имени.
     *
     * @param $name
     */
    public function enableLanInterface($name): void
    {
        $parameters = [
            'conditions' => 'interface = :ifName: and disabled = :disabled:',
            'bind'       => [
                'ifName'   => $name,
                'disabled' => 1,
            ],
        ];

        $if_data = LanInterfaces::findFirst($parameters);
        if ($if_data !== null) {
            $if_data->disabled = 0;
            $if_data->update();
        }
    }

    /**
     * Удаляем интерфейс по его имени.
     *
     * @param $name
     */
    public function disableLanInterface($name): void
    {
        $if_data = LanInterfaces::findFirst("interface = '{$name}'");
        if ($if_data !== null) {
            $if_data->internet = 0;
            $if_data->disabled = 1;
            $if_data->update();
        }
    }

    /**
     * Добавляем в базу данных сведения о новом интерфейсе.
     *
     * @param      $name
     * @param bool $general
     *
     * @return mixed
     */
    private function addLanInterface($name, $general = false)
    {
        $data = new LanInterfaces();
        $data->name      = $name;
        $data->interface = $name;
        $data->dhcp      = '1';
        $data->internet  = ($general === true) ? '1' : '0';
        $data->disabled  = '0';
        $data->vlanid    = '0';
        $data->hostname  = 'mikopbx';
        $data->domain    = '';
        $data->topology  = 'private';
        $data->primarydns= '';
        $data->save();

        return $data->toArray();
    }

    /**
     * Настройка hosts
     */
    public function hostsGenerate(): void
    {
        $this->hostnameConfigure();
    }

    /**
     *  Setup hostname
     **/
    public function hostnameConfigure(): void
    {
        $data       = self::getHostName();
        $hosts_conf = "127.0.0.1 localhost\n" .
            "127.0.0.1 {$data['hostname']}\n";
        if ( ! empty($data['domain'])) {
            $hosts_conf .= "127.0.0.1 {$data['hostname']}.{$data['domain']}\n";
        }
        $hostnamePath = Util::which('hostname');
        if(Util::isDocker()){
            $realHostName = shell_exec($hostnamePath);
            $hosts_conf .= "127.0.0.1 $realHostName\n";
        }
        Util::fileWriteContent('/etc/hosts', $hosts_conf);
        $hostnamePath = Util::which('hostname');
        Processes::mwExec($hostnamePath . ' ' . escapeshellarg($data['hostname']));
    }

    /**
     * Настройка OpenVPN. Если в кастомизации системных файлов определн конфиг, то сеть поднимется.
     */
    public function openVpnConfigure():void
    {
        $confFile = '/etc/openvpn.ovpn';
        Util::fileWriteContent($confFile, '');
        $data = file_get_contents($confFile);

        $pidFile = '/var/run/openvpn.pid';
        $pid     = Processes::getPidOfProcess('openvpn');
        if ( ! empty($pid)) {
            // Завершаем процесс.
            $busyboxPath = Util::which('busybox');
            Processes::mwExec("{$busyboxPath} kill '$pid'");
        }
        if ( ! empty($data)) {
            $openvpnPath = Util::which('openvpn');
            Processes::mwExecBg("{$openvpnPath} --config /etc/openvpn.ovpn --writepid {$pidFile}", '/dev/null', 5);
        }
    }

    /**
     * Configures LAN interface FROM udhcpc (renew_bound)
     */
    public function udhcpcConfigureRenewBound(): void
    {
        // Инициализация массива переменных.
        $env_vars = [
            'broadcast' => '',
            'interface' => '',
            'ip'        => '',
            'router'    => '',
            'timesvr'   => '',
            'namesvr'   => '',
            'dns'       => '',
            'hostname'  => '',
            'subnet'    => '',
            'serverid'  => '',
            'ipttl'     => '',
            'lease'     => '',
            'domain'    => '',
        ];

        $debugMode = $this->di->getShared('config')->path('core.debugMode');
        // Получаем значения переменных окружения.
        foreach ($env_vars as $key => $value) {
            $env_vars[$key] = trim(getenv($key));
        }
        $BROADCAST = ($env_vars['broadcast'] === '') ? "" : "broadcast {$env_vars['broadcast']}";
        if($env_vars['subnet'] === '255.255.255.255' || $env_vars['subnet'] === ''){
            // support /32 address assignment
            // https://forummikrotik.ru/viewtopic.php?f=3&t=6246&start=40
            $NET_MASK = '';
        }else{
            $NET_MASK = "netmask {$env_vars['subnet']}";
        }
        // Настраиваем интерфейс.
        $busyboxPath = Util::which('busybox');
        Processes::mwExec("{$busyboxPath} ifconfig {$env_vars['interface']} {$env_vars['ip']} $BROADCAST $NET_MASK");

        // Удаляем старые маршруты по умолчанию.
        while (true) {
            $out = [];
            Processes::mwExec("route del default gw 0.0.0.0 dev {$env_vars['interface']}", $out);
            if (trim(implode('', $out)) !== '') {
                // Произошла ошибка, значит все маршруты очищены.
                break;
            }
            if ($debugMode) {
                break;
            } // Иначе бесконечный цикл.
        }
        // Добавляем маршруты по умолчанию.
        /** @var LanInterfaces $if_data */
        $if_data = LanInterfaces::findFirst("interface = '{$env_vars['interface']}'");
        $is_inet = ($if_data !== null) ? (int)$if_data->internet : 0;
        if ('' !== $env_vars['router'] && $is_inet === 1) {
            // ТОЛЬКО, если этот интерфейс для интернет, создаем дефолтный маршрут.
            $routers = explode(' ', $env_vars['router']);
            foreach ($routers as $router) {
                Processes::mwExec("route add default gw {$router} dev {$env_vars['interface']}");
            }
        }
        // Добавляем пользовательские маршруты.
        if (file_exists('/etc/static-routes')) {
            $busyboxPath = Util::which('busybox');
            $grepPath    = Util::which('grep');
            $awkPath     = Util::which('awk');
            $catPath     = Util::which('cat');
            $shPath      = Util::which('sh');
            Processes::mwExec(
                "{$catPath} /etc/static-routes | {$grepPath} '^rout' | {$busyboxPath} {$awkPath} -F ';' '{print $1}' | {$grepPath} '{$env_vars['interface']}' | {$shPath}"
            );
        }
        $named_dns = [];
        if ('' !== $env_vars['dns']) {
            $named_dns = explode(' ', $env_vars['dns']);
        }
        if ($is_inet === 1) {
            // ТОЛЬКО, если этот интерфейс для интернет, правим resolv.conf.
            // Прописываем основные DNS.
            $this->generatePdnsdConfig($named_dns);
        }

        // Сохрании информацию в базу данных.
        $data = [
            'subnet'  => $env_vars['subnet'],
            'ipaddr'  => $env_vars['ip'],
            'gateway' => $env_vars['router'],
        ];
        if (Verify::isIpAddress($env_vars['ip'])) {
            $data['subnet'] = $this->netMaskToCidr($env_vars['subnet']);
        } else {
            $data['subnet'] = '';
        }
        $this->updateIfSettings($data, $env_vars['interface']);

        $data = [
            'primarydns'   => $named_dns[0] ?? '',
            'secondarydns' => $named_dns[1] ?? '',
        ];
        $this->updateDnsSettings($data, $env_vars['interface']);

        Processes::mwExecBg("/etc/rc/networking.set.mtu '{$env_vars['interface']}'");
    }

    /**
     * For OS systemctl (Debian).
     * Configures LAN interface FROM dhcpc (renew_bound).
     */
    public function udhcpcConfigureRenewBoundSystemCtl(): void
    {
        // Инициализация массива переменных.
        $prefix   = "new_";
        $env_vars = [
            'broadcast' => 'broadcast_address',
            'interface' => 'interface',
            'ip'        => 'ip_address',
            'router'    => 'routers',
            'timesvr'   => '',
            'namesvr'   => 'netbios_name_servers',
            'dns'       => 'domain_name_servers',
            'hostname'  => 'host_name',
            'subnet'    => 'subnet_mask',
            'serverid'  => '',
            'ipttl'     => '',
            'lease'     => 'new_dhcp_lease_time',
            'domain'    => 'domain_name',
        ];

        // Получаем значения переменных окружения.
        foreach ($env_vars as $key => $value) {
            $var_name = "{$prefix}{$value}";
            if (empty($var_name)) {
                continue;
            }
            $env_vars[$key] = trim(getenv("{$prefix}{$value}"));
        }

        // Добавляем маршруты по умолчанию.
        /** @var LanInterfaces $if_data */
        $if_data = LanInterfaces::findFirst("interface = '{$env_vars['interface']}'");
        $is_inet = ($if_data !== null) ? (string)$if_data->internet : '0';

        $named_dns = [];
        if ('' !== $env_vars['dns']) {
            $named_dns = explode(' ', $env_vars['dns']);
        }
        if ($is_inet === '1') {
            // ТОЛЬКО, если этот интерфейс для интернет, правим resolv.conf.
            // Прописываем основные DNS.
            $this->generatePdnsdConfig($named_dns);
        }
        // Сохрании информацию в базу данных.
        $data = [
            'subnet'  => $env_vars['subnet'],
            'ipaddr'  => $env_vars['ip'],
            'gateway' => $env_vars['router'],
        ];
        if (Verify::isIpAddress($env_vars['ip'])) {
            $data['subnet'] = $this->netMaskToCidr($env_vars['subnet']);
        } else {
            $data['subnet'] = '';
        }
        $this->updateIfSettings($data, $env_vars['interface']);
        $data = [
            'primarydns'   => $named_dns[0] ?? '',
            'secondarydns' => $named_dns[1] ?? '',
        ];
        $this->updateDnsSettings($data, $env_vars['interface']);
    }

    /**
     * Сохранение настроек сетевого интерфейса.
     *
     * @param $data
     * @param $name
     */
    public function updateIfSettings($data, $name): void
    {
        /** @var LanInterfaces $res */
        $res = LanInterfaces::findFirst("interface = '$name' AND vlanid=0");
        if ($res === null || !$this->settingsIsChange($data, $res->toArray()) ) {
            return;
        }
        foreach ($data as $key => $value) {
            $res->writeAttribute($key, $value);
        }
        $res->save();
    }

    /**
     * Сохранение DNS настроек сетевого интерфейса.
     *
     * @param $data
     * @param $name
     */
    public function updateDnsSettings($data, $name): void
    {
        /** @var LanInterfaces $res */
        $res = LanInterfaces::findFirst("interface = '$name' AND vlanid=0");
        if ($res === null || !$this->settingsIsChange($data, $res->toArray())) {
            return;
        }
        foreach ($data as $key => $value) {
            $res->writeAttribute($key, $value);
        }
        if (empty($res->primarydns) && !empty($res->secondarydns)) {
            $res->primarydns    = $res->secondarydns;
            $res->secondarydns  = '';
        }
        $res->save();
    }

    /**
     * Compares two array
     * @param array $data
     * @param array $dbData
     * @return bool
     */
    private function settingsIsChange(array $data, array $dbData):bool{
        $isChange = false;
        foreach ($dbData as $key => $value){
            if(!isset($data[$key]) || (string)$value === (string)$data[$key]){
                continue;
            } 
            Util::sysLogMsg(__METHOD__, "Find new network settings: {$key} changed {$value}=>{$data[$key]}");
            $isChange = true;
        }
        return $isChange;
    }

    /**
     * Возвращает имя интерфейса по его id.
     *
     * @param $id_net
     *
     * @return string
     */
    public function getInterfaceNameById($id_net): string
    {
        $res = LanInterfaces::findFirstById($id_net);
        if ($res !== null && $res->interface !== null) {
            return $res->interface;
        }

        return '';
    }

    /**
     * Возвращает список включеннх веб интерейсов
     *
     * @return array
     */
    public function getEnabledLanInterfaces(): array
    {
        /** @var LanInterfaces $res */
        $res = LanInterfaces::find('disabled=0');

        return $res->toArray();
    }

    /**
     * Configures LAN interface FROM udhcpc (deconfig)
     */
    public function udhcpcConfigureDeconfig(): void
    {
            $interface = trim(getenv('interface'));
            // Для MIKO LFS Edition.
            $busyboxPath = Util::which('busybox');
            Processes::mwExec("{$busyboxPath} ifconfig {$interface} up");
            Processes::mwExec("{$busyboxPath} ifconfig {$interface} 192.168.2.1 netmask 255.255.255.0");
    }
    /**
     * Сохранение настроек сетевого интерфейса.
     *
     * @param $data
     */
    public function updateNetSettings($data): void
    {
        $res         = LanInterfaces::findFirst("internet = '1'");
        $update_inet = false;
        if ($res === null) {
            $res         = LanInterfaces::findFirst();
            $update_inet = true;
        }

        if ($res !== null) {
            foreach ($data as $key => $value) {
                $res->$key = $value;
            }
            if ($update_inet === true) {
                $res->internet = 1;
            }
            $res->save();
        }
    }

    /**
     * Возвращает массив с информацией по сетевым интерфейсам.
     *
     * @return array
     */
    public function getInterfaces(): array
    {
        // Получим все имена PCI интерфейсов (сеть).
        $i_names = $this->getInterfacesNames();
        $if_list = [];
        foreach ($i_names as $i) {
            $if_list[$i] = $this->getInterface($i);
        }

        return $if_list;
    }

    /**
     * Сбор информации по сетевому интерфейсу.
     *
     * @param $name
     *
     * @return array
     */
    public function getInterface($name): array
    {
        $interface = [];

        // Получаем ifconfig's для interface $name.
        $busyboxPath = Util::which('busybox');
        Processes::mwExec("{$busyboxPath} ifconfig $name 2>/dev/null", $output);
        $output = implode(" ", $output);

        // Парсим mac
        preg_match("/HWaddr (\S+)/", $output, $matches);
        $interface['mac'] = (count($matches) > 0) ? $matches[1] : '';

        // Парсим ip.
        preg_match("/inet addr:(\S+)/", $output, $matches);
        $interface['ipaddr'] = (count($matches) > 0) ? $matches[1] : '';

        // Парсим подсеть.
        preg_match("/Mask:(\S+)/", $output, $matches);
        $subnet              = (count($matches) > 0) ? $this->netMaskToCidr($matches[1]) : '';
        $interface['subnet'] = $subnet;

        // Поднят ли интерфейс?
        preg_match("/\s+(UP)\s+/", $output, $matches);
        $status = (count($matches) > 0) ? $matches[1] : '';
        if ($status === "UP") {
            $interface['up'] = true;
        } else {
            $interface['up'] = false;
        }
        $busyboxPath = Util::which('busybox');
        $grepPath    = Util::which('grep');
        $cutPath     = Util::which('cut');
        $routePath   = Util::which('route');

        Processes::mwExec(
            "{$busyboxPath} {$routePath} -n | {$grepPath} {$name} | {$grepPath} \"^0.0.0.0\" | {$cutPath} -d ' ' -f 10",
            $matches
        );
        $gw = (count($matches) > 0) ? $matches[0] : '';
        if (Verify::isIpAddress($gw)) {
            $interface['gateway'] = $gw;
        }
        $catPath = Util::which('cat');
        Processes::mwExec("{$catPath} /etc/resolv.conf | {$grepPath} nameserver | {$cutPath} -d ' ' -f 2", $dnsout);

        $dnsSrv = [];
        foreach ($dnsout as $line) {
            if (Verify::isIpAddress($line)) {
                $dnsSrv[] = $line;
            }
        }
        $interface['dns'] = $dnsSrv;

        return $interface;
    }
}