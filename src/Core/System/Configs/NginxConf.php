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

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\DockerNetworkFilterService;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SslCertificateService;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use MikoPBX\Modules\Config\SystemConfigInterface;
use Phalcon\Di\Di;

/**
 * Class NginxConf
 *
 * Represents the Nginx configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class NginxConf extends SystemConfigClass
{
    public const string PROC_NAME = 'nginx';
    public const string MODULES_LOCATIONS_PATH = '/etc/nginx/mikopbx/modules_locations';
    public const string MODULES_SERVERS_PATH = '/etc/nginx/mikopbx/modules_servers';
    private const string PID_FILE = '/var/run/' . self::PROC_NAME . '.pid';
    private const string CONF_PATH_DIR = '/etc/nginx/mikopbx/conf.d';
    private const string CONF_PATH = self::CONF_PATH_DIR . '/http-server.conf';
    private const string CONF_PATH_SSL = self::CONF_PATH_DIR . '/https-server.conf';

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
     * Starts the service by reinitializing configurations and restarting the monitoring service.
     *
     * This method is a wrapper around {@see self::reStart()} and is used to start or restart
     * the service with full reinitialization of settings and time synchronization.
     *
     * @return bool Returns true if the start operation was successful, false otherwise.
     */
    public function start(): bool
    {
        $this->generateConf();
        if(System::isBooting()){
            NginxConf::setupLog();
            Processes::mwExec($this->startCommand, $out, $ret);
            $result = $this->monitWaitStart();
        }else{
            $result = $this->reStart();
        }
        return $result;
    }

    /**
     * Restart Nginx gracefully
     * https://www.cyberciti.biz/faq/howto-unix-linux-gracefully-reload-restart-nginx-webserver/
     **/
    public function reStart(): bool
    {
        NginxConf::setupLog();
        $this->generateMonitConf();
        $monitResult = $this->monitRestart();

        // Get web port from settings
        $waitResult = $this->monitWaitStart();
        return $monitResult && $waitResult;
    }

    /**
     * Waits for the service to start within a timeout period.
     *
     * @param int $timeout Maximum number of seconds to wait.
     * @return bool True if the service started within the timeout.
     */
    public function monitWaitStart(int $timeout = 20): bool
    {
        $webPort = PbxSettings::getValueByKey(PbxSettings::WEB_PORT);

        $waitResult = false;
        // Wait for Nginx to start completely
        $maxAttempts = 20;
        $attempt = 0;
        while ($attempt < $maxAttempts) {
            $newPid = self::getPid();
            if (!empty($newPid)) {
                // Check if Nginx is responding
                $checkResult = [];
                Processes::mwExec(
                    "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$webPort/ --connect-timeout 1",
                    $checkResult
                );
                if (!empty($checkResult) && (int)$checkResult[0] > 0) {
                    $waitResult = true;
                    break;
                }
            }
            $attempt++;
            usleep(500000);
        }

        return $waitResult;
    }

    /**
     * Retrieves the Nginx process ID.
     *
     * @return string The process ID.
     */
    private static function getPid(): string
    {
        $filePid = '';
        if (file_exists(self::PID_FILE)) {
            $pidContent = file_get_contents(self::PID_FILE);
            if ($pidContent !== false) {
                $filePid = trim($pidContent);
            }
        }

        $pid = '';
        if (!empty($filePid)) {
            $searchPattern = "^$filePid ";
            $pid = Processes::getPidOfProcess($searchPattern);
        } 
        
        if (empty($pid)) {
            $nginxPath = Util::which(self::PROC_NAME);
            // Search for nginx master process
            $pid = Processes::getPidOfProcess("nginx: master process");
            
            // If not found, try searching by executable path
            if (empty($pid)) {
                $pid = Processes::getPidOfProcess($nginxPath);
            }
        }
        
        return $pid;
    }

    /**
     * Checks if any network interface has IPv6 enabled.
     *
     * @return bool True if at least one interface has IPv6 mode '1' (Auto) or '2' (Manual).
     */
    private function hasIpv6Interfaces(): bool
    {
        $interfaces = LanInterfaces::find();
        foreach ($interfaces as $interface) {
            // IPv6 mode: '0' = Off, '1' = Auto (SLAAC/DHCPv6), '2' = Manual
            if ($interface->ipv6_mode === '1' || $interface->ipv6_mode === '2') {
                return true;
            }
        }
        return false;
    }

    /**
     * Writes additional settings to the nginx.conf.
     * Always configures both HTTP and HTTPS with valid certificates.
     *
     * @return void
     */
    public function generateConf(): void
    {
        
        $dns_server      = '127.0.0.1';

        $net = new Network();
        $dns = $net->getHostDNS();
        foreach ($dns as $ns) {
            if (Verify::isIpAddress($ns)) {
                $dns_server = trim($ns);
                break;
            }
        }

        // HTTP
        $WEBPort      = PbxSettings::getValueByKey(PbxSettings::WEB_PORT);
        $WEBHTTPSPort = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT);

        $config = file_get_contents(self::CONF_PATH . ".original");
        if ($config === false) {
            return;
        }

        // Add IPv6 listener if any interface has IPv6 enabled
        if ($this->hasIpv6Interfaces()) {
            // Insert IPv6 listener after the IPv4 listener line
            $config = str_replace(
                "listen      <WEBPort>;",
                "listen      <WEBPort>;\n    listen      [::]:<WEBPort>;",
                $config
            );
            SystemMessages::sysLogMsg(self::PROC_NAME, 'HTTP configured with IPv6 support', LOG_INFO);
        }

        // Add dynamic security filtering via Lua when firewall is enabled
        $firewallEnabled = PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED);
        if ($firewallEnabled === '1') {
            // Get Redis/Lua configuration
            $redisVars = $this->generateRedisLuaConfig();

            // Insert after resolver line
            $config = str_replace("resolver <DNS>;\n", "resolver <DNS>;\n\n$redisVars", $config);
        }

        // Define the placeholders that will be replaced in the configuration string.
        $placeholders = ['<DNS>', '<WEBPort>'];

        // Specify the actual values that will replace the placeholders.
        $replacementValues = [$dns_server, $WEBPort];

        // Replace placeholders in the configuration string with the actual values.
        // This operation updates DNS and Web Port settings in the configuration.
        $config = str_replace($placeholders, $replacementValues, $config);

        $RedirectToHttps = PbxSettings::getValueByKey(PbxSettings::REDIRECT_TO_HTTPS);
        if ($RedirectToHttps === '1') {
            $includeRow = 'include mikopbx/locations/*.conf;';

            $mapDirective = 'map $remote_addr$host $is_local {' . PHP_EOL
                . '    default 0;' . PHP_EOL
                . '    "~127\.0\.0\.1.*" 1;' . PHP_EOL
                . '    "~::1" 1;' . PHP_EOL
                . '    "~.*localhost" 1;' . PHP_EOL
                . '}' . PHP_EOL . PHP_EOL
                . 'map $host $redirect_host {' . PHP_EOL
                . '    default $host;' . PHP_EOL
                . '    "~^\[" $host;' . PHP_EOL
                . '    "~:" "[$host]";' . PHP_EOL
                . '}' . PHP_EOL;


              $conf_data = 'if ( $is_local != 1 ) {' . PHP_EOL
                . '    ' . 'return 301 https://$redirect_host:' . $WEBHTTPSPort . '$request_uri;' . PHP_EOL
                . '}' . PHP_EOL
                . $includeRow . PHP_EOL;

             $config = $mapDirective . PHP_EOL . $config;
             $config = str_replace($includeRow, $conf_data, $config);
        }
        file_put_contents(self::CONF_PATH, $config);

        // SSL Configuration - Always enable HTTPS with valid certificates
        // Prepare SSL certificates (will use user-provided or fallback)
        $certInfo = SslCertificateService::prepareNginxCertificates();

        if (!empty($certInfo['certPath']) && !empty($certInfo['keyPath'])) {
            // We have valid certificates, configure SSL
            $config = file_get_contents(self::CONF_PATH_SSL . ".original");
            if ($config === false) {
                return;
            }

            // Add IPv6 listener if any interface has IPv6 enabled
            if ($this->hasIpv6Interfaces()) {
                // Insert IPv6 listener after the IPv4 listener line
                $config = str_replace(
                    "listen       <WEBHTTPSPort> ssl;",
                    "listen       <WEBHTTPSPort> ssl;\n    listen       [::]:<WEBHTTPSPort> ssl;",
                    $config
                );
                SystemMessages::sysLogMsg(self::PROC_NAME, 'HTTPS configured with IPv6 support', LOG_INFO);
            }

            // Add dynamic security filtering via Lua when firewall is enabled (SSL)
            if ($firewallEnabled === '1') {
                // Redis configuration is already synced above, just add Lua directives
                $redisVars = $this->generateRedisLuaConfig();

                // Insert after resolver line
                $config = str_replace("resolver <DNS>;\n", "resolver <DNS>;\n\n$redisVars", $config);
            }

            // Define the placeholders that will be replaced in the configuration string.
            $placeholders = ['<DNS>', '<WEBHTTPSPort>'];

            // Specify the actual values that will replace the placeholders.
            $replacementValues = [$dns_server, $WEBHTTPSPort];

            // Replace placeholders in the configuration string with the actual values.
            // This operation updates DNS and Web https Port settings in the configuration.
            $config = str_replace($placeholders, $replacementValues, $config);

            file_put_contents(self::CONF_PATH_SSL, $config);
            
            if ($certInfo['usedFallback']) {
                SystemMessages::sysLogMsg(self::PROC_NAME, 'HTTPS configured with self-signed fallback certificates', LOG_INFO);
            } else {
                SystemMessages::sysLogMsg(self::PROC_NAME, 'HTTPS configured with user-provided certificates', LOG_INFO);
            }
        } else {
            // Failed to prepare any certificates - this should rarely happen
            SystemMessages::sysLogMsg(self::PROC_NAME, 'Failed to prepare SSL certificates, HTTPS will be disabled', LOG_ERR);
            if (file_exists(self::CONF_PATH_SSL)) {
                unlink(self::CONF_PATH_SSL);
            }
        }
        // Test configuration for module locations and server blocks
        $this->generateModulesConfigs();
        $this->generateModulesServerConfigs();
    }

    /**
     * Handle fail2ban actions for Nginx in Docker environments
     *
     * @param string $action The action to perform (ban/unban)
     * @param string $ip The IP address to ban/unban
     * @return void
     */
    public static function fail2banNginxAction(string $action, string $ip): void
    {
        // Skip in non-Docker environments - they use regular iptables
        if (!System::isDocker()) {
            return;
        }

        switch ($action) {
            case 'ban':
                // Get ban time from fail2ban settings
                $banTime = Fail2BanConf::getBanTime();

                // Add IP to Redis blocked list for HTTP category
                DockerNetworkFilterService::addBlockedIp($ip, 'http', $banTime);
                SystemMessages::sysLogMsg('fail2ban-nginx', "Banned IP: $ip for $banTime seconds", LOG_WARNING);
                break;

            case 'unban':
                // Remove IP from Redis blocked list for HTTP category
                DockerNetworkFilterService::removeBlockedIp($ip, 'http');
                SystemMessages::sysLogMsg('fail2ban-nginx', "Unbanned IP: $ip", LOG_INFO);
                break;

            default:
                throw new \InvalidArgumentException("Invalid action: $action");
        }
    }

    /**
     * Generate Redis configuration variables for Nginx Lua
     *
     * @return string The nginx configuration directives for Redis/Lua
     */
    private function generateRedisLuaConfig(): string
    {
        // Get Redis configuration
        $di = Di::getDefault();
        $configService = $di->getShared(ConfigProvider::SERVICE_NAME);
        $redisHost = $configService->path('redis.host') ?? '127.0.0.1';
        $redisPort = $configService->path('redis.port') ?? 6379;
        $redisDb = RedisClientProvider::DATABASE_INDEX;


        // Build configuration
        $redisVars = "    # Redis configuration for Lua\n";
        $redisVars .= "    set \$redis_host '$redisHost';\n";
        $redisVars .= "    set \$redis_port '$redisPort';\n";
        $redisVars .= "    set \$redis_db '$redisDb';\n";
        $redisVars .= "    \n";
        $redisVars .= "    # Security configuration\n";
        $redisVars .= "    set \$is_docker '" . (System::isDocker() ? '1' : '0') . "';\n";
        $redisVars .= "    set \$security_mode 'balanced';\n";
        $redisVars .= "    set \$session_check_required '0';\n";

        // Rate limiting can be disabled via environment variable for testing
        $rateLimitEnabled = getenv('MIKOPBX_RATE_LIMIT_ENABLED')??'1';
        $rateLimitEnabled = ($rateLimitEnabled === '0') ? '0' : '1';
        $redisVars .= "    set \$rate_limit_enabled '$rateLimitEnabled';\n";
        $redisVars .= "    \n";
        $redisVars .= "    # Security filtering via Lua\n";
        $redisVars .= "    access_by_lua_file /etc/nginx/mikopbx/lua/unified-security.lua;\n";

        return $redisVars;
    }

    public function generateMonitConf(): bool
    {
        $binPath = Util::which(self::PROC_NAME);
        $confPath = $this->getMainMonitConfFile();

        $stopCommand = "$binPath -s stop";
        $conf = 'check process '.self::PROC_NAME.' with pidfile /var/run/'.self::PROC_NAME.'.pid'.PHP_EOL.
            '    start program = "'.$this->startCommand.'"'.PHP_EOL.
            '        as uid root and gid root'.PHP_EOL.
            '    stop program = "'.$stopCommand.'"'.PHP_EOL.
            '        as uid root and gid root';
        $this->saveFileContent($confPath, $conf);
        return true;
    }


    /**
     * Tests the current nginx config for errors.
     *
     * @return bool Whether the config is valid or not.
     */
    private function testCurrentNginxConfig(): bool
    {
        $nginx = Util::which(self::PROC_NAME);
        $out = [];
        
        Processes::mwExec("$nginx -t 2>&1", $out);
        $res = implode(' ', $out);
        
        if (stripos($res, 'test is successful') !== false || stripos($res, 'syntax is ok') !== false) {
            return true;
        }
        
        SystemMessages::sysLogMsg(self::PROC_NAME, "Nginx config test failed: $res", LOG_ERR);
        return false;
    }

    /**
     * Builds an Nginx server block for a module based on the standard HTTP or HTTPS template.
     *
     * The method takes the original server template, replaces the port placeholder,
     * removes the standard location includes (modules provide their own locations in $content),
     * and injects the module's content before the closing brace.
     *
     * @param int $port The port number for the server block to listen on.
     * @param bool $ssl Whether to use the HTTPS template (true) or HTTP template (false).
     * @param string $content The Nginx location/configuration directives to include in the server block.
     * @return string The complete server block configuration, or empty string if SSL requested but certificates unavailable.
     */
    public static function buildServerBlock(int $port, bool $ssl, string $content): string
    {
        if ($ssl) {
            $templatePath = self::CONF_PATH_SSL . '.original';
            $portPlaceholder = '<WEBHTTPSPort>';
        } else {
            $templatePath = self::CONF_PATH . '.original';
            $portPlaceholder = '<WEBPort>';
        }

        $config = file_get_contents($templatePath);
        if ($config === false) {
            return '';
        }

        // For SSL, check that certificates are available
        if ($ssl) {
            $certInfo = SslCertificateService::prepareNginxCertificates();
            if (empty($certInfo['certPath']) || empty($certInfo['keyPath'])) {
                return '';
            }
        }

        // Remove standard location includes — module provides its own content
        $config = preg_replace(
            '/\s*#\s*locations files\s*\n\s*include\s+mikopbx\/locations\/\*\.conf;\s*\n/',
            "\n",
            $config
        );
        $config = preg_replace(
            '/\s*#\s*module locations files\s*\n\s*include\s+mikopbx\/modules_locations\/\*\.conf;\s*\n/',
            "\n",
            $config
        );

        // Replace port placeholder
        $config = str_replace($portPlaceholder, (string)$port, $config);

        // Replace DNS placeholder
        $dns_server = '127.0.0.1';
        $net = new Network();
        $dns = $net->getHostDNS();
        foreach ($dns as $ns) {
            if (Verify::isIpAddress($ns)) {
                $dns_server = trim($ns);
                break;
            }
        }
        $config = str_replace('<DNS>', $dns_server, $config);

        // Use an instance to access non-static helpers
        $instance = new self();

        // Add IPv6 listener if any interface has IPv6 enabled
        if ($instance->hasIpv6Interfaces()) {
            if ($ssl) {
                $config = str_replace(
                    "listen       $port ssl;",
                    "listen       $port ssl;\n    listen       [::]:$port ssl;",
                    $config
                );
            } else {
                $config = str_replace(
                    "listen      $port;",
                    "listen      $port;\n    listen      [::]:$port;",
                    $config
                );
            }
        }

        // Add Lua firewall if enabled
        $firewallEnabled = PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED);
        if ($firewallEnabled === '1') {
            $redisVars = $instance->generateRedisLuaConfig();
            $config = str_replace("resolver $dns_server;\n", "resolver $dns_server;\n\n$redisVars", $config);
        }

        // Insert module content before the closing brace
        $config = preg_replace('/}\s*$/', "\n$content\n}", $config);

        return $config;
    }

    /**
     * Generates the module server block conf files.
     *
     * @return void
     */
    public function generateModulesServerConfigs(): void
    {
        $serversPath = self::MODULES_SERVERS_PATH;
        if (!is_dir($serversPath)) {
            Util::mwMkdir($serversPath, true);
        }
        $rm = Util::which('rm');
        Processes::mwExec("$rm -rf $serversPath/*.conf");

        $additionalServers = PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::CREATE_NGINX_SERVERS);
        foreach ($additionalServers as $moduleUniqueId => $serverContent) {
            $confFileName = "$serversPath/$moduleUniqueId.conf";
            file_put_contents($confFileName, $serverContent);
            if ($this->testCurrentNginxConfig()) {
                continue;
            }
            // Config test failed — rollback
            Processes::mwExec("$rm $confFileName");
            SystemMessages::sysLogMsg(self::PROC_NAME, 'Failed test server config for module ' . $moduleUniqueId, LOG_ERR);
        }
    }

    /**
     * Generates the modules locations conf files.
     *
     * @return void
     */
    public function generateModulesConfigs(): void
    {
        $locationsPath     = self::MODULES_LOCATIONS_PATH;
        if (!is_dir($locationsPath)) {
            Util::mwMkdir($locationsPath, true);
        }
        $rm            = Util::which('rm');
        Processes::mwExec("$rm -rf $locationsPath/*.conf");

        // Add additional modules routes
        $additionalLocations = PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::CREATE_NGINX_LOCATIONS);
        foreach ($additionalLocations as $moduleUniqueId => $locationContent) {
            $confFileName = "$locationsPath/$moduleUniqueId.conf";
            file_put_contents($confFileName, $locationContent);
            if ($this->testCurrentNginxConfig()) {
                // Test passed successfully.
                continue;
            }
            // Config test failed. Rollback the config.
            Processes::mwExec("$rm $confFileName");
            SystemMessages::sysLogMsg(self::PROC_NAME, 'Failed test config file for module' . $moduleUniqueId, LOG_ERR);
        }
    }

    /**
     * Attempts to start the service via Monit when a failure is detected.
     *
     * This method is typically used as a fallback action to manually restart
     * the service using Monit if it fails unexpectedly. The current implementation
     * does not wait for the service to fully start, but the timeout parameter
     * may be used in extended implementations.
     *
     * @return void
     */
    public function monitFailStartAction(): void
    {
        sleep(1);
    }

     /**
     * Returns the Nginx log file path.
     *
     * @return array<string> The log files path.
     */
    public static function getLogFiles(): array
    {
        $logdir = Directories::getDir(Directories::CORE_LOGS_DIR) . '/nginx';
        Util::mwMkdir($logdir);
        return [
            '/var/log/nginx_access.log' => "$logdir/access.log",
            '/var/log/nginx_error.log' => "$logdir/error.log",
        ];
    }

     /**
     * Relocates Nginx logs to the storage mount.
     *
     * @return void
     */
    public static function setupLog(): void
    {
        $logFiles = self::getLogFiles();

        foreach ($logFiles as $src_log_file => $dst_log_file) {
            if (! file_exists($src_log_file)) {
                file_put_contents($src_log_file, '');
            }
            $options = file_exists($dst_log_file) ? '>' : '';
            $cat = Util::which('cat');
            Processes::mwExec("$cat $src_log_file 2> /dev/null >$options $dst_log_file");
            Util::createUpdateSymlink($dst_log_file, $src_log_file);
            shell_exec(Util::which('chown')." -R www:www ". dirname($dst_log_file));
        }
    }

    /**
     * Rotates the Nginx logs.
     *
     * @return void
     */
    public static function logRotate(): void
    {
        $logrotate = Util::which('logrotate');

        $max_size    = 10;
        foreach (self::getLogFiles() as $f_name) {
            $text_config = $f_name . " {
        nocreate
        nocopytruncate
        compress
        delaycompress
        start 0
        rotate 9
        size {$max_size}M
        missingok
        noolddir
        postrotate
        endscript
    }";
            $path_conf   = '/var/etc/nginx_logrotate_' . basename($f_name) . '.conf';
            file_put_contents($path_conf, $text_config);
            $mb10 = $max_size * 1024 * 1024;

            $options = '';
            if (Util::mFileSize($f_name) > $mb10) {
                $options = '-f';
            }
            Processes::mwExecBg("$logrotate $options '$path_conf' > /dev/null 2> /dev/null");
        }
    }
}