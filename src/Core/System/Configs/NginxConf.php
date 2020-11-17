<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Core\System\Configs;


use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use Phalcon\Di\Injectable;

class NginxConf extends Injectable
{
    public const LOCATIONS_PATH = '/etc/nginx/mikopbx/locations';
    public const MODULES_LOCATIONS_PATH = '/etc/nginx/mikopbx/modules_locations';

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
        $NginxPath = Util::which('nginx');
        $pid       = Processes::getPidOfProcess('master process nginx');
        if (!empty($pid)) {
            Processes::mwExec("$NginxPath -s reload");
        } elseif (Util::isSystemctl()) {
            $systemCtrlPath = Util::which('systemctl');
            Processes::mwExec("{$systemCtrlPath} restart nginx.service");
        } else {
            Processes::killByName('nginx');
            Processes::mwExec($NginxPath);
        }
    }

    /**
     * Reload Nginx gracefully
     * https://www.cyberciti.biz/faq/howto-unix-linux-gracefully-reload-restart-nginx-webserver/
     **/
    public function reloadGracefully(): void
    {
        $NginxPath = Util::which('nginx');
        $killPath  = Util::which('kill');
        $pid       = Processes::getPidOfProcess('nginx: master process');
        if (!empty($pid)) {
            Processes::mwExec("$NginxPath -s quit");
            echo $killPath.' -QUIT '.$pid."\n";
        }
        $timeStart = time();
        while (true){
            if(time() - $timeStart > 20){
                break;
            }
            usleep(50000);
            $pid = Processes::getPidOfProcess('nginx: master process');
            if($pid !== ''){
                continue;
            }
            $result = Processes::mwExec($NginxPath);
            if($result === 0){
                break;
            }
            echo "RESULT -- $result\n";
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
        $currentConfigIsGood = $this->testCurrentNginxConfig();
        if ($level < 1 && ! $currentConfigIsGood) {
            ++$level;
            Util::sysLogMsg('nginx', 'Failed test config file. SSL will be disable...');
            $this->generateConf(true, $level);
        }
        // Add additional rules from modules
        $this->generateModulesConf();
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
    public function generateModulesConf(): void
    {
        $locationsPath     = self::MODULES_LOCATIONS_PATH;
        if (!is_dir($locationsPath)){
            Util::mwMkdir($locationsPath,true);
        }
        $additionalModules = $this->di->getShared('pbxConfModules');
        $rmPath            = Util::which('rm');
        Processes::mwExec("{$rmPath} -rf {$locationsPath}/*.conf");
        foreach ($additionalModules as $appClass) {
            if (method_exists($appClass, 'createNginxLocations')) {
                $locationContent = $appClass->createNginxLocations();
                if ( ! empty($locationContent)) {
                    $confFileName = "{$locationsPath}/{$appClass->moduleUniqueId}.conf";
                    file_put_contents($confFileName, $locationContent);
                    if ( ! $this->testCurrentNginxConfig()) {
                        Processes::mwExec("{$rmPath} {$confFileName}");
                        Util::sysLogMsg('nginx', 'Failed test config file for module' . $appClass->moduleUniqueId);
                    }
                }
            }
        }
    }
}