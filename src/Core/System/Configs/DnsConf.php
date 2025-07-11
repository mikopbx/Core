<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;

/**
 * Class DnsConf
 *
 * @package MikoPBX\Core\System\Configs
 */
class DnsConf extends SystemConfigClass
{
    public const string PROC_NAME = 'dnsmasq';
    public const string CONF_FILE = '/etc/dnsmasq.conf';

    /**
     * Priority level used to sort configuration objects when generating configs.
     * Lower values mean higher priority.
     */
    public int $priority = 20;

    /**
     * Constructor for the class.
     *
     * Initializes the parent class and sets up the start command for the process.
     * - Determines the binary path of the process using `Util::which(self::PROC_NAME)`.
     * - Constructs the start command with necessary parameters, including the configuration file path and PID file location.
     */
    public function __construct()
    {
        parent::__construct();
        $binPath = Util::which(self::PROC_NAME);
        $this->startCommand = $binPath;
    }

    /**
     * Generates the resolv.conf file based on system configuration.
     */
    public function resolveConfGenerate(array $dns = []): void
    {
        if(empty($dns)){
            // Retrieve host DNS settings
            $netConf = new Network();
            $dns = $netConf->getHostDNS();
            unset($netConf);
        }

        // Initialize resolv.conf content
        $resolveConf = '';

        // Get hostname information
        $data_hostname = Network::getHostName();

        // Append domain to resolv.conf if it is not empty
        if (trim($data_hostname['domain']) !== '') {
            $resolveConf .= "domain {$data_hostname['domain']}\n";
        }

        // Append local nameserver to resolv.conf
        $resolveConf .= "nameserver 127.0.0.1\n";

        // Initialize an array to store named DNS servers
        $named_dns = [];

        // Iterate over each DNS server
        foreach ($dns as $ns) {
            // Skip empty DNS servers
            if (trim($ns) === '') {
                continue;
            }
            // Add the DNS server to the named_dns array
            $named_dns[] = $ns;

            // Append the DNS server to resolv.conf
            $resolveConf .= "nameserver $ns\n";
        }

        // If no DNS servers were found, use default ones and add them to named_dns
        if (empty($dns)) {
            $resolveConf .= "nameserver 77.88.8.8  # Yandex DNS\n";
            $resolveConf .= "nameserver 1.1.1.1    # Cloudflare\n";
            $resolveConf .= "nameserver 8.8.8.8    # Google DNS\n";
            $named_dns[] = "77.88.8.8";
            $named_dns[] = "1.1.1.1";
            $named_dns[] = "8.8.8.8";
        }

        file_put_contents('/etc/resolv.conf', $resolveConf);

        // Generate pdnsd configuration using named_dns
        $this->generateDnsConfig($named_dns);
    }

    /**
     * Generates the P dns D  configuration file and restarts the service if necessary.
     *
     * @param array $named_dns An array of named DNS servers.
     */
    public function generateDnsConfig(array $named_dns, bool $needRestart = true): void
    {
        $config  = "listen-address=127.0.0.1" . PHP_EOL;
        $config .= "no-dhcp-interface=*" . PHP_EOL;
        $config .= "cache-size=1000" . PHP_EOL;
        foreach ($named_dns as $dns) {
            $config .= "server=$dns" . PHP_EOL;
        }
        $config .= "no-resolv" . PHP_EOL;
        $config .= "user=www" . PHP_EOL;
        $config .= "group=www" . PHP_EOL;
        $config .= "strict-order" . PHP_EOL;
        $config .= "interface=lo" . PHP_EOL;
        $config .= "bind-interfaces" . PHP_EOL;
        $config .= "pid-file=/var/run/".self::PROC_NAME.".pid" . PHP_EOL;

        $savedConf = '';
        if (file_exists(self::CONF_FILE)) {
            $savedConf = file_get_contents(self::CONF_FILE);
        }
        if ($savedConf !== $config) {
            file_put_contents(self::CONF_FILE, $config);
        }
    }

    /**
     * Starts the dnsmasq server.
     *
     * @return bool
     */
    public function start(): bool
    {
        if(System::isBooting()){
            Processes::mwExecBg($this->startCommand);
            $result = $this->monitWaitStart();
        } else {
            $result = $this->reStart();
        }
        return $result;
    }

    /**
     * Restarts dnsmasq server
     */
    public function reStart(): bool
    {
        $this->resolveConfGenerate();
        $this->generateMonitConf();
        return $this->monitRestart();
    }

    /**
     * Generates the Monit configuration file for monitoring a specific process.
     * @return bool
     */
    public function generateMonitConf(): bool
    {
        if(Util::isDocker()){
            return true;
        }
        $busyboxPath = Util::which('busybox');
        $confPath = $this->getMainMonitConfFile();

        $stopCommand = "/bin/sh -c '$busyboxPath kill -TERM `$busyboxPath cat /var/run/".self::PROC_NAME.".pid`'";
        $conf = 'check process '.self::PROC_NAME.' with pidfile /var/run/'.self::PROC_NAME.'.pid'.PHP_EOL.
                '    start program = "'.$this->startCommand.'"'.PHP_EOL.
                '    stop program = "'.$stopCommand.'"'.PHP_EOL;
        $this->saveFileContent($confPath, $conf);
        return true;
    }
}
