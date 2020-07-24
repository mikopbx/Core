<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Core\System\Configs;


use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use Phalcon\Di\Injectable;

class NginxConf extends Injectable
{
    public const LOCATIONS_PATH = '/etc/nginx/mikopbx/locations';

    private MikoPBXConfig $mikoPBXConfig;

    /**
     * NginxConf constructor.
     */
    public function __construct()
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     *   Restart Nginx
     **/
    public function reStart(): void
    {
        if (Util::isSystemctl()) {
            $systemCtrlPath = Util::which('systemctl');
            Util::mwExec("{$systemCtrlPath} restart nginx.service");
        } else {
            $NginxPath  = Util::which('nginx');
            Util::killByName('nginx');
            Util::mwExec($NginxPath);
        }
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
            $conf_data = 'if ( $remote_addr != "127.0.0.1" ) {' . PHP_EOL
                . '        ' . 'return 301 https://$host:' . $WEBHTTPSPort . '$request_uri;' . PHP_EOL
                . '       }' . PHP_EOL;
            $config    = str_replace('include mikopbx/locations/*.conf;', $conf_data, $config);
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
        $nginxPath = Util::which('nginx');
        $out       = [];
        Util::mwExec("{$nginxPath} -t", $out);
        $res = implode($out);
        if ($level < 1 && false !== strpos($res, 'test failed')) {
            ++$level;
            Util::sysLogMsg('nginx', 'Failed test config file. SSL will be disable...');
            $this->generateConf(true, $level);
        }

        // Add additional rules from modules
        $locationsPath     = self::LOCATIONS_PATH;
        $additionalModules = $this->di->getShared('pbxConfModules');
        $rmPath            = Util::which('rm');
        foreach ($additionalModules as $appClass) {
            if (method_exists($appClass, 'createNginxLocations')) {
                $locationContent = $appClass->createNginxLocations();
                if ( ! empty($locationContent)) {
                    $confFileName = "{$locationsPath}/{$appClass->moduleUniqueId}.conf";
                    file_put_contents($confFileName, $locationContent);
                    $out = [];
                    Util::mwExec("{$nginxPath} -t", $out);
                    $res = implode($out);
                    if (false !== strpos($res, 'test failed')) {
                        Util::mwExec("{$rmPath} {$confFileName}");
                        Util::sysLogMsg('nginx', 'Failed test config file for module' . $appClass->moduleUniqueId);
                    }
                }
            }
        }
    }
}