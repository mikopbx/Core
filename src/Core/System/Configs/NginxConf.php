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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use MikoPBX\Modules\Config\SystemConfigInterface;
use Phalcon\Di\Injectable;

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
     * Write additional settings the nginx.conf
     *
     * @param bool $not_ssl
     * @param int  $level
     */
    public function generateConf($not_ssl = false, $level = 0): void
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
        $WEBPort      = $this->mikoPBXConfig->getGeneralSettings('WEBPort');
        $WEBHTTPSPort = $this->mikoPBXConfig->getGeneralSettings('WEBHTTPSPort');

        $config = file_get_contents("{$httpConfigFile}.original");
        $config = str_replace(['<DNS>', '<WEBPort>'], [$dns_server, $WEBPort], $config);

        $RedirectToHttps = $this->mikoPBXConfig->getGeneralSettings('RedirectToHttps');
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
        $WEBHTTPSPublicKey  = $this->mikoPBXConfig->getGeneralSettings('WEBHTTPSPublicKey');
        $WEBHTTPSPrivateKey = $this->mikoPBXConfig->getGeneralSettings('WEBHTTPSPrivateKey');
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
            $config = str_replace(['<DNS>', '<WEBHTTPSPort>'], [$dns_server, $WEBHTTPSPort], $config);
            file_put_contents($httpsConfigFile, $config);
        } elseif (file_exists($httpsConfigFile)) {
            unlink($httpsConfigFile);
        }

        // Test work
        $currentConfigIsGood = $this->testCurrentNginxConfig();
        if ($level < 1 && ! $currentConfigIsGood) {
            ++$level;
            Util::sysLogMsg('nginx', 'Failed test config file. SSL will be disable...', LOG_ERR);
            $this->generateConf(true, $level);
        }
        // Add additional rules from modules
        $this->generateModulesConfigs();
    }

    /**
     * Test current nginx config on errors
     *
     * @return bool
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
     * Generate modules locations conf files
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
        $additionalLocations = PBXConfModulesProvider::hookModulesMethodWithArrayResult(SystemConfigInterface::CREATE_NGINX_LOCATIONS);
        foreach ($additionalLocations as $moduleUniqueId=>$locationContent) {
            $confFileName = "{$locationsPath}/{$moduleUniqueId}.conf";
            file_put_contents($confFileName, $locationContent);
            if ( $this->testCurrentNginxConfig()) {
                // Тест прошел успешно.
                continue;
            }
            // Откат конфига.
            Processes::mwExec("{$rmPath} {$confFileName}");
            Util::sysLogMsg('nginx', 'Failed test config file for module' . $moduleUniqueId, LOG_ERR);
        }
    }
}