<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use MikoPBX\Modules\Config\SystemConfigInterface;
use Phalcon\Di\Injectable;

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
    public const string  MODULES_LOCATIONS_PATH = '/etc/nginx/mikopbx/modules_locations';
    private const string PID_FILE = '/var/run/'.self::PROC_NAME.'.pid';
    private const string CONF_PATH_DIR = '/etc/nginx/mikopbx/conf.d';
    private const string CONF_PATH = self::CONF_PATH_DIR. '/http-server.conf';
    private const string CONF_PATH_SSL = self::CONF_PATH_DIR. '/https-server.conf';

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
        return $this->reStart();
    }

    /**
     * Restart Nginx gracefully
     * https://www.cyberciti.biz/faq/howto-unix-linux-gracefully-reload-restart-nginx-webserver/
     **/
    public function reStart(): bool
    {
        $this->generateMonitConf();
        $monitResult = $this->monitRestart();
        
        // Get web port from settings
        $webPort = PbxSettings::getValueByKey(PbxSettings::WEB_PORT);

        $waitResult = false;
        // Wait for Nginx to start completely (max 10 seconds)
        $maxAttempts = 20;
        $attempt = 0;
        while ($attempt < $maxAttempts) {
            $newPid = self::getPid();
            if (!empty($newPid)) {
                // Check if Nginx is responding
                $checkResult = [];
                Processes::mwExec("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$webPort/ --connect-timeout 1", $checkResult);
                if (!empty($checkResult) && (int)$checkResult[0] > 0) {
                    $waitResult = true;
                    break;
                }
            }
            $attempt++;
            usleep(500000); // 0.5 seconds
        }

        return $monitResult && $waitResult;
    }

    /**
     * Retrieves the Nginx process ID.
     *
     * @return string The process ID.
     */
    private static function getPid(): string
    {
        $filePid = trim(file_get_contents(self::PID_FILE));
        if (!empty($filePid)) {
            $pid = Processes::getPidOfProcess("^$filePid ");
        } else {
            $nginxPath = Util::which('nginx');
            $pid       = Processes::getPidOfProcess($nginxPath);
        }
        return $pid;
    }

    /**
     * Writes additional settings to the nginx.conf.
     *
     * @param bool $not_ssl Whether to generate the configuration for non-SSL.
     * @param int $level The recursion level.
     *
     * @return void
     */
    public function generateConf(bool $not_ssl = false, int $level = 0): void
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

        $config = file_get_contents(self::CONF_PATH.".original");

        // Define the placeholders that will be replaced in the configuration string.
        $placeholders = ['<DNS>', '<WEBPort>'];

        // Specify the actual values that will replace the placeholders.
        $replacementValues = [$dns_server, $WEBPort];

        // Replace placeholders in the configuration string with the actual values.
        // This operation updates DNS and Web Port settings in the configuration.
        $config = str_replace($placeholders, $replacementValues, $config);

        $RedirectToHttps = PbxSettings::getValueByKey(PbxSettings::REDIRECT_TO_HTTPS);
        if ($RedirectToHttps === '1' && $not_ssl === false) {
            $includeRow = 'include mikopbx/locations/*.conf;';

            $conf_data = 'if ( $remote_addr != "127.0.0.1" ) {' . PHP_EOL
                . '        ' . 'return 301 https://$host:' . $WEBHTTPSPort . '$request_uri;' . PHP_EOL
                . '    }' . PHP_EOL
                . '    ' . $includeRow . PHP_EOL;
            $config    = str_replace($includeRow, $conf_data, $config);
        }
        file_put_contents(self::CONF_PATH, $config);

        // SSL
        $WEBHTTPSPublicKey  = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PUBLIC_KEY);
        $WEBHTTPSPrivateKey = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PRIVATE_KEY);
        if (
            $not_ssl === false
            && ! empty($WEBHTTPSPublicKey)
            && ! empty($WEBHTTPSPrivateKey)
        ) {
            $public_filename  = '/etc/ssl/certs/nginx.crt';
            $private_filename = '/etc/ssl/private/nginx.key';
            file_put_contents($public_filename, $WEBHTTPSPublicKey);
            file_put_contents($private_filename, $WEBHTTPSPrivateKey);
            $config = file_get_contents(self::CONF_PATH_SSL.".original");

            // Define the placeholders that will be replaced in the configuration string.
            $placeholders = ['<DNS>', '<WEBHTTPSPort>'];

            // Specify the actual values that will replace the placeholders.
            $replacementValues = [$dns_server, $WEBHTTPSPort];

            // Replace placeholders in the configuration string with the actual values.
            // This operation updates DNS and Web https Port settings in the configuration.
            $config = str_replace($placeholders, $replacementValues, $config);

            file_put_contents(self::CONF_PATH_SSL, $config);
        } elseif (file_exists(self::CONF_PATH_SSL)) {
            unlink(self::CONF_PATH_SSL);
        }

        // Test work
        $currentConfigIsGood = $this->testCurrentNginxConfig();
        if ($level < 1 && ! $currentConfigIsGood) {
            ++$level;
            SystemMessages::sysLogMsg('nginx', 'Failed test config file. SSL will be disable...', LOG_ERR);
            $this->generateConf(true, $level);
        }
        // Add additional rules from modules
        $this->generateModulesConfigs();
    }

    public function generateMonitConf(): bool
    {
        $binPath = Util::which(self::PROC_NAME);
        $confPath = $this->getMainMonitConfFile();

        $this->startCommand = $binPath;
        $stopCommand = "$binPath -s stop";

        $conf = 'check file '.self::PROC_NAME.'-conf with path '.self::CONF_PATH .PHP_EOL.
            'check process '.self::PROC_NAME.' with pidfile /var/run/'.self::PROC_NAME.'.pid'.PHP_EOL.
            '    depends on '.self::PROC_NAME.'-conf'.PHP_EOL.
            '    depends on '.PHPConf::PROC_NAME.PHP_EOL.
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
        $nginx = Util::which('nginx');
        $out       = [];
        Processes::mwExec("$nginx -t", $out);
        $res = implode($out);

        return false === stripos($res, 'test failed');
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
            SystemMessages::sysLogMsg('nginx', 'Failed test config file for module' . $moduleUniqueId, LOG_ERR);
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
}
