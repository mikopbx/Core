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

use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\MikoPBXConfig;
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
class NginxConf extends Injectable
{
    public const  MODULES_LOCATIONS_PATH = '/etc/nginx/mikopbx/modules_locations';
    private const PID_FILE = '/var/run/nginx.pid';

    private MikoPBXConfig $mikoPBXConfig;

    /**
     * NginxConf constructor.
     */
    public function __construct()
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Restart Nginx gracefully
     * https://www.cyberciti.biz/faq/howto-unix-linux-gracefully-reload-restart-nginx-webserver/
     **/
    public function reStart(): void
    {
        $pid = self::getPid();
        if (!empty($pid)) {
            $killPath = Util::which('kill');
            // reload Nginx workers gracefully
            Processes::mwExec("{$killPath} -SIGHUP {$pid} ");
        } else {
            $nginxPath = Util::which('nginx');
            Processes::killByName('nginx');
            Processes::mwExec($nginxPath);
        }
    }

    /**
     * Retrieves the Nginx process ID.
     *
     * @return string The process ID.
     */
    private static function getPid():string{
        $filePid = trim(file_get_contents(self::PID_FILE));
        if(!empty($filePid)) {
            $pid = Processes::getPidOfProcess("^$filePid ");
        }else{
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
        $configPath      = '/etc/nginx/mikopbx/conf.d';
        $httpConfigFile  = "{$configPath}/http-server.conf";
        $httpsConfigFile = "{$configPath}/https-server.conf";
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
        $WEBPort      = (string)$this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::WEB_PORT);
        $WEBHTTPSPort = (string)$this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::WEB_HTTPS_PORT);

        $config = file_get_contents("{$httpConfigFile}.original");

        // Define the placeholders that will be replaced in the configuration string.
        $placeholders = ['<DNS>', '<WEBPort>'];

        // Specify the actual values that will replace the placeholders.
        $replacementValues = [$dns_server, $WEBPort];

        // Replace placeholders in the configuration string with the actual values.
        // This operation updates DNS and Web Port settings in the configuration.
        $config = str_replace($placeholders, $replacementValues, $config);

        $RedirectToHttps = $this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::REDIRECT_TO_HTTPS);
        if ($RedirectToHttps === '1' && $not_ssl === false) {
            $includeRow = 'include mikopbx/locations/*.conf;';

            $conf_data = 'if ( $remote_addr != "127.0.0.1" ) {' . PHP_EOL
                . '        ' . 'return 301 https://$host:' . $WEBHTTPSPort . '$request_uri;' . PHP_EOL
                . '    }' . PHP_EOL
                . '    '.$includeRow. PHP_EOL;
            $config    = str_replace($includeRow, $conf_data, $config);
        }
        file_put_contents($httpConfigFile, $config);

        // SSL
        $WEBHTTPSPublicKey  = (string)$this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::WEB_HTTPS_PUBLIC_KEY);
        $WEBHTTPSPrivateKey = (string)$this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::WEB_HTTPS_PRIVATE_KEY);
        if (
            $not_ssl === false
            && ! empty($WEBHTTPSPublicKey)
            && ! empty($WEBHTTPSPrivateKey)
        ) {
            $public_filename  = '/etc/ssl/certs/nginx.crt';
            $private_filename = '/etc/ssl/private/nginx.key';
            file_put_contents($public_filename, $WEBHTTPSPublicKey);
            file_put_contents($private_filename, $WEBHTTPSPrivateKey);
            $config = file_get_contents("{$httpsConfigFile}.original");

            // Define the placeholders that will be replaced in the configuration string.
            $placeholders = ['<DNS>', '<WEBHTTPSPort>'];

            // Specify the actual values that will replace the placeholders.
            $replacementValues = [$dns_server, $WEBHTTPSPort];

            // Replace placeholders in the configuration string with the actual values.
            // This operation updates DNS and Web https Port settings in the configuration.
            $config = str_replace($placeholders, $replacementValues, $config);

            file_put_contents($httpsConfigFile, $config);
        } elseif (file_exists($httpsConfigFile)) {
            unlink($httpsConfigFile);
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

    /**
     * Tests the current nginx config for errors.
     *
     * @return bool Whether the config is valid or not.
     */
    private function testCurrentNginxConfig(): bool
    {
        $nginxPath = Util::which('nginx');
        $out       = [];
        Processes::mwExec("{$nginxPath} -t", $out);
        $res = implode($out);

        return (false === stripos($res, 'test failed'));
    }

    /**
     * Generates the modules locations conf files.
     *
     * @return void
     */
    public function generateModulesConfigs(): void
    {
        $locationsPath     = self::MODULES_LOCATIONS_PATH;
        if (!is_dir($locationsPath)){
            Util::mwMkdir($locationsPath,true);
        }
        $rmPath            = Util::which('rm');
        Processes::mwExec("{$rmPath} -rf {$locationsPath}/*.conf");

        // Add additional modules routes
        $additionalLocations = PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::CREATE_NGINX_LOCATIONS);
        foreach ($additionalLocations as $moduleUniqueId=>$locationContent) {
            $confFileName = "{$locationsPath}/{$moduleUniqueId}.conf";
            file_put_contents($confFileName, $locationContent);
            if ( $this->testCurrentNginxConfig()) {
                // Test passed successfully.
                continue;
            }
            // Config test failed. Rollback the config.
            Processes::mwExec("{$rmPath} {$confFileName}");
            SystemMessages::sysLogMsg('nginx', 'Failed test config file for module' . $moduleUniqueId, LOG_ERR);
        }
    }
}