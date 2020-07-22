<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Core\Asterisk\Configs\{QueueConf};
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use Phalcon\Di;
use function MikoPBX\Common\Config\appPath;

/**
 *
 */
class System
{
    private MikoPBXConfig $mikoPBXConfig;
    /**
     * @var mixed|\Phalcon\Di\DiInterface|null
     */
    private $di;

    /**
     * System constructor.
     */
    public function __construct()
    {
        $this->di = Di::getDefault();

        // Класс / обертка для работы с настройками.
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Relocate PHP error log to storage mount
     */
    public static function setupPhpLog(): void
    {
        $src_log_file = '/var/log/php_error.log';
        $dst_log_file = self::getPhpFile();
        if ( ! file_exists($src_log_file)) {
            file_put_contents($src_log_file, '');
        }
        $options = file_exists($dst_log_file) ? '>' : '';
        $catPath = Util::which('cat');
        Util::mwExec("{$catPath} {$src_log_file} 2> /dev/null >{$options} {$dst_log_file}");
        Util::createUpdateSymlink($dst_log_file, $src_log_file);
    }

    /**
     * @return string
     */
    public static function getPhpFile(): string
    {
        $logdir = self::getLogDir() . '/php';
        Util::mwMkdir($logdir);
        return "$logdir/error.log";
    }

    /**
     * @return string
     */
    public static function getLogDir(): string
    {
        $di     = Di::getDefault();
        if ($di !== null){
            return $di->getConfig()->path('core.logsPath');
        }
        return '/var/log';
    }

    /**
     *
     */
    public static function rotatePhpLog(): void
    {
        $asteriskPath = Util::which('asterisk');
        $logrotatePath = Util::which('logrotate');

        $max_size    = 2;
        $f_name      = self::getPhpFile();
        $text_config = (string)($f_name) . " {
    nocreate
    nocopytruncate
    delaycompress
    nomissingok
    start 0
    rotate 9
    size {$max_size}M
    missingok
    noolddir
    postrotate
        {$asteriskPath} -rx 'logger reload' > /dev/null 2> /dev/null
    endscript
}";
        $di     = Di::getDefault();
        if ($di !== null){
            $varEtcPath = $di->getConfig()->path('core.varEtcPath');
        } else {
            $varEtcPath = '/var/etc';
        }
        $path_conf   = $varEtcPath . '/php_logrotate_' . basename($f_name) . '.conf';
        file_put_contents($path_conf, $text_config);
        $mb10 = $max_size * 1024 * 1024;

        $options = '';
        if (Util::mFileSize($f_name) > $mb10) {
            $options = '-f';
        }
        Util::mwExecBg("{$logrotatePath} {$options} '{$path_conf}' > /dev/null 2> /dev/null");
    }

    /**
     *
     */
    public static function gnatsLogRotate(): void
    {
        $log_dir = self::getLogDir() . '/nats';
        $gnatsdPath = Util::which('gnatsd');
        $pid     = Util::getPidOfProcess($gnatsdPath, 'custom_modules');
        $max_size = 1;
        if (empty($pid)) {
            $system = new System();
            $system->gnatsStart();
            sleep(1);
        }
        $text_config = "{$log_dir}/gnatsd.log {
    start 0
    rotate 9
    size {$max_size}M
    maxsize 1M
    daily
    missingok
    notifempty
    sharedscripts
    postrotate
        {$gnatsdPath} -sl reopen=$pid > /dev/null 2> /dev/null
    endscript
}";

        $mb10 = $max_size * 1024 * 1024;

        $options = '';
        if (Util::mFileSize("{$log_dir}/gnatsd.log") > $mb10) {
            $options = '-f';
        }
        $di     = Di::getDefault();
        if ($di !== null){
            $varEtcPath = $di->getConfig()->path('core.varEtcPath');
        } else {
            $varEtcPath = '/var/etc';
        }
        $path_conf  = $varEtcPath . '/gnatsd_logrotate.conf';
        file_put_contents($path_conf, $text_config);
        if (file_exists("{$log_dir}/gnatsd.log")) {
            $logrotatePath = Util::which('logrotate');
            Util::mwExecBg("{$logrotatePath} $options '{$path_conf}' > /dev/null 2> /dev/null");
        }
    }

    /**
     * Старт сервера обработки очередей задач.
     *
     * @return array
     */
    public function gnatsStart(): array
    {
        $confdir = '/etc/nats';
        Util::mwMkdir($confdir);
        $logdir = self::getLogDir() . '/nats';
        Util::mwMkdir($logdir);

        $pid_file = '/var/run/gnatsd.pid';
        $settings = [
            'port'             => '4223',
            'http_port'        => '8223',
            'debug'            => 'false',
            'trace'            => 'false',
            'logtime'          => 'true',
            'pid_file'         => $pid_file,
            'max_connections'  => '1000',
            'max_payload'      => '1000000',
            'max_control_line' => '512',
            'sessions_path'    => $logdir,
            'log_file'         => "{$logdir}/gnatsd.log",
        ];
        $config   = '';
        foreach ($settings as $key => $val) {
            $config .= "{$key}: {$val} \n";
        }
        $conf_file = "{$confdir}/natsd.conf";
        Util::fileWriteContent($conf_file, $config);

        $lic = $this->mikoPBXConfig->getGeneralSettings('PBXLicense');
        file_put_contents($logdir . '/license.key', $lic);

        if (file_exists($pid_file)) {
            $killPath = Util::which('kill');
            $catPath = Util::which('kill');
            Util::mwExec("{$killPath} $({$catPath} {$pid_file})");
        }
        $gnatsdPath = Util::which('gnatsd');
        Util::mwExecBg("{$gnatsdPath} --config {$conf_file}", "{$logdir}/gnats_process.log");

        return [
            'result' => 'Success',
        ];
    }

    /**
     * Рестарт сетевых интерфейсов.
     */
    public static function networkReload(): void
    {
        $system = new System();
        $system->hostnameConfigure();

        $network = new Network();
        $network->resolvConfGenerate();
        $network->loConfigure();
        $network->lanConfigure();
    }

    /**
     *    Устанавливаем имя хост текущей машины.
     **/
    public function hostnameConfigure(): int
    {
        $data       = Network::getHostName();
        $hosts_conf = "127.0.0.1 localhost\n" .
            "127.0.0.1 {$data['hostname']}\n";
        if ( ! empty($data['domain'])) {
            $hosts_conf .= "127.0.0.1 {$data['hostname']}.{$data['domain']}\n";
        }
        Util::fileWriteContent('/etc/hosts', $hosts_conf);

        $hostnamePath = Util::which('hostname');
        return Util::mwExec($hostnamePath.' '. escapeshellarg("{$data['hostname']}"));
    }



    /**
     * Обновление кофнигурации кастомных файлов.
     *
     * @return array
     */
    public static function updateCustomFiles()
    {
        $actions = [];
        /** @var \MikoPBX\Common\Models\CustomFiles $res_data */
        $res_data = CustomFiles::find("changed = '1'");
        foreach ($res_data as $file_data) {
            // Всегда рестрартуем все модули asterisk (только чтение конфигурации).
            $actions['asterisk_coreReload'] = 100;
            $filename                       = basename($file_data->filepath);
            switch ($filename) {
                case 'manager.conf':
                    $actions['manager'] = 10;
                    break;
                case 'musiconhold.conf':
                    $actions['musiconhold'] = 100;
                    break;
                case 'modules.conf':
                    $actions['modules'] = 10;
                    break;
                case 'http.conf':
                    $actions['manager'] = 10;
                    break;
                case 'root': // crontabs
                    $actions['cron'] = 10;
                    break;
                case 'queues.conf':
                    $actions['queues'] = 10;
                    break;
                case 'features.conf':
                    $actions['features'] = 10;
                    break;
                case 'ntp.conf':
                    $actions['systemtime'] = 100;
                    break;
                case 'jail.local': // fail2ban
                    $actions['firewall'] = 100;
                    break;
            }
        }

        asort($actions);
        $result = self::invokeActions($actions);
        if ($result['result'] !== 'ERROR') {
            // Зафиксируем результат работы.
            foreach ($res_data as $file_data) {
                /** @var \MikoPBX\Common\Models\CustomFiles $file_data */
                $file_data->writeAttribute("changed", '0');
                $file_data->save();
            }
        }

        return $result;
    }

    /**
     * Выполнение набора действий по рестарту модулей системы.
     *
     * @param $actions
     *
     * @return array|mixed
     */
    public static function invokeActions($actions)
    {
        $result = [
            'result' => 'Success',
        ];
        foreach ($actions as $action => $value) {
            $res = null;
            switch ($action) {
                case 'manager':
                    $res = PBX::managerReload();
                    break;
                case 'musiconhold':
                    $res = PBX::musicOnHoldReload();
                    break;
                case 'modules':
                    $res = PBX::modulesReload();
                    break;
                case 'cron':
                    $system = new System();
                    $system->cronConfigure();
                    break;
                case 'queues':
                    $res = QueueConf::queueReload();
                    break;
                case 'features':
                    $res = PBX::managerReload();
                    break;
                case 'systemtime':
                    $res = TimeManagement::setDate('');
                    break;
                case 'firewall':
                    $res = Firewall::reloadFirewall();
                    break;
                case 'asterisk_coreReload':
                    PBX::sipReload();
                    PBX::iaxReload();
                    PBX::dialplanReload();
                    $res = PBX::coreReload();
                    break;
            }
            if ($res !== null && $res['result'] === 'ERROR') {
                $result = $res['result'];
                break;
            }
        }

        return $result;
    }

    /**
     * Настройка cron. Запуск демона.
     *
     * @return int
     */
    public function cronConfigure(): int
    {
        $booting = $this->di->getRegistry()->booting;
        $this->cronGenerate($booting);
        if (Util::isSystemctl()) {
            $systemctlPath = Util::which('systemctl');
            Util::mwExec("{$systemctlPath} restart cron");
        } else {
            $crondPath = Util::which('crond');
            Util::killByName($crondPath);
            Util::mwExec("{$crondPath} -L /dev/null -l 8");
        }
        return 0;
    }

    /**
     * Генератор конфига cron.
     *
     * @param bool $boot
     */
    private function cronGenerate($boot = true): void
    {
        $additionalModules = $this->di->getShared('pbxConfModules');
        $mast_have         = [];

        if (Util::isSystemctl()) {
            $mast_have[]   = "SHELL=/bin/sh\n";
            $mast_have[]   = "PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin\n\n";
            $cron_filename = '/etc/cron.d/mikopbx';
            $cron_user     = 'root ';
        } else {
            $cron_filename = '/var/spool/cron/crontabs/root';
            $cron_user     = '';
        }


        $workerSafeScriptsPath = Util::getFilePathByClassName(WorkerSafeScriptsCore::class);
        $phpPath = Util::which('php');
        $WorkerSafeScripts = "{$phpPath} -f {$workerSafeScriptsPath} start > /dev/null 2> /dev/null";

        $workersPath = appPath('src/Core/Workers');

        $restart_night = $this->mikoPBXConfig->getGeneralSettings('RestartEveryNight');
        $asteriskPath = Util::which('asterisk');
        $ntpdPath = Util::which('ntpd');
        $shPath = Util::which('sh');
        if ($restart_night === '1') {
            $mast_have[] = '0 1 * * * ' . $cron_user .$asteriskPath.' -rx"core restart now" > /dev/null 2> /dev/null' . "\n";
        }
        $mast_have[] = '*/5 * * * * ' . $cron_user . $ntpdPath.' -q > /dev/null 2> /dev/null' . "\n";
        $mast_have[] = '*/6 * * * * ' . $cron_user . "{$shPath} {$workersPath}/Cron/cleaner_download_links.sh > /dev/null 2> /dev/null\n";
        $mast_have[] = '*/1 * * * * ' . $cron_user . "{$WorkerSafeScripts}\n";

        $tasks = [];
        // Дополнительные модули также могут добавить задачи в cron.
        foreach ($additionalModules as $appClass) {
            /** @var \MikoPBX\Modules\Config\ConfigClass $appClass */
            $appClass->createCronTasks($tasks);
        }
        $conf = implode('', array_merge($mast_have, $tasks));

        if (Util::isSystemctl()) {
            // Обеспечим совместимость всех существующих модулей с Debian.
            $conf = str_replace(' * * * * /', ' * * * * root /', $conf);
        }

        if ($boot === true) {
            Util::mwExecBg($WorkerSafeScripts);
        }

        Util::fileWriteContent($cron_filename, $conf);
    }

    /**
     * Подгрузка дополнительных модулей ядра.
     */
    public function loadKernelModules(): void
    {
        $modprobePath = Util::which('modprobe');
        $ulimitPath = Util::which('ulimit');

        Util::mwExec("{$modprobePath} -q dahdi");
        Util::mwExec("{$modprobePath} -q dahdi_transcode");
        Util::mwExec("{$ulimitPath} -n 4096");
        Util::mwExec("{$ulimitPath} -p 4096");
    }

    /**
     *   Start Nginx and php-fpm
     **/
    public function nginxStart(): void
    {
        if (Util::isSystemctl()) {
            Util::mwExec('systemctl restart php7.4-fpm');
            Util::mwExec('systemctl restart nginx.service');
        } else {
            Util::killByName('php-fpm');
            Util::killByName('nginx');
            Util::mwExec('php-fpm -c /etc/php.ini');
            Util::mwExec('nginx');
        }
    }

    /**
     * Write additional settings the nginx.conf
     *
     * @param bool $not_ssl
     * @param int  $level
     */
    public function nginxGenerateConf($not_ssl = false, $level = 0): void
    {
        $configPath      = '/etc/nginx/mikopbx/conf.d';
        $httpConfigFile  = "{$configPath}/http-server.conf";
        $httpsConfigFile = "{$configPath}/https-server.conf";

        $dns_server = '127.0.0.1';

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
        $out = [];
        Util::mwExec("{$nginxPath} -t", $out);
        $res = implode($out);
        if ($level < 1 && false !== strpos($res, 'test failed')) {
            ++$level;
            Util::sysLogMsg('nginx', 'Failed test config file. SSL will be disable...');
            $this->nginxGenerateConf(true, $level);
        }

        // Add additional rules from modules
        $locationsPath      = '/etc/nginx/mikopbx/locations';
        $additionalModules = $this->di->getShared('pbxConfModules');
        $rmPath = Util::which('rm');
        foreach ($additionalModules as $appClass) {
           if (method_exists($appClass, 'createNginxLocations')){
               $locationContent = $appClass->createNginxLocations();
               if (!empty($locationContent)){
                   $confFileName = "{$locationsPath}/{$appClass->moduleUniqueId}.conf";
                   file_put_contents($confFileName, $locationContent);
                   $out = [];
                   Util::mwExec("{$nginxPath} -t", $out);
                   $res = implode($out);
                   if (false !== strpos($res, 'test failed')) {
                       Util::mwExec("{$rmPath} {$confFileName}");
                       Util::sysLogMsg('nginx', 'Failed test config file for module'.$appClass->moduleUniqueId);
                   }
               }
           }
        }
    }

    public function syslogDaemonStart(): void
    {
        $syslog_file = '/var/log/messages';
        $log_file    = self::getSyslogFile();
        if ( ! file_exists($syslog_file)) {
            file_put_contents($syslog_file, '');
        }
        $syslogdPath = Util::which('syslogd');
        $busyboxPath = Util::which('busybox');
        $logreadPath = Util::which('logread');
        $killPath = Util::which('kill');
        $pid = Util::getPidOfProcess($syslogdPath);
        if ( ! empty($pid)) {
            $options = file_exists($log_file) ? '>' : '';
            Util::mwExec("{$busyboxPath} {$logreadPath} 2> /dev/null >" . $options . $log_file);
            // Завершаем процесс.
            Util::mwExec("{$busyboxPath} {$killPath} '$pid'");
        }

        Util::createUpdateSymlink($log_file, $syslog_file);
        Util::mwExec("{$syslogdPath} -O {$log_file} -b 10 -s 10240");
    }

    public static function getSyslogFile(): string
    {
        $logdir = self::getLogDir() . '/system';
        Util::mwMkdir($logdir);
        return "$logdir/messages";
    }

    /**
     * Будет вызван после старта asterisk.
     */
    public function onAfterPbxStarted(): void
    {
        $additionalModules = $this->di->getShared('pbxConfModules');
        foreach ($additionalModules as $appClass) {
            /** @var \MikoPBX\Modules\Config\ConfigClass $appClass */
            $appClass->onAfterPbxStarted();
        }
    }

    /**
     * Запуск SSH сервера.
     **/
    public function sshdConfigure(): array
    {
        $result       = [
            'result' => 'Success',
        ];
        $dropbear_dir = '/etc/dropbear';
        Util::mwMkdir($dropbear_dir);

        $keytypes = [
            "rsa"   => "SSHRsaKey",
            "dss"   => "SSHDssKey",
            "ecdsa" => "SSHecdsaKey" // SSHecdsaKey // SSHEcdsaKey
        ];
        // Получаем ключ из базы данных.
        // $config = array();
        foreach ($keytypes as $keytype => $db_key) {
            $res_keyfilepath = "{$dropbear_dir}/dropbear_" . $keytype . "_host_key";
            $key             = $this->mikoPBXConfig->getGeneralSettings($db_key);
            $key             = (isset($key) && is_string($key)) ? trim($key) : "";
            if (strlen($key) > 100) {
                // Сохраняем ключ в файл.
                file_put_contents($res_keyfilepath, base64_decode($key));
            }
            // Если ключ не существует, создадим его и обновим информацию в базе данных.
            if ( ! file_exists($res_keyfilepath)) {
                // Генерация.
                $dropbearkeyPath = Util::which('dropbearkey');
                Util::mwExec("{$dropbearkeyPath} -t $keytype -f $res_keyfilepath");
                // Сохранение.
                $new_key = base64_encode(file_get_contents($res_keyfilepath));
                $this->mikoPBXConfig->setGeneralSettings("$db_key", "$new_key");
            }
        }
        $ssh_port = escapeshellcmd($this->mikoPBXConfig->getGeneralSettings('SSHPort'));
        // Перезапускаем сервис dropbear;
        Util::killByName('dropbear');
        usleep(500000);
        Util::mwExec("dropbear -p '{$ssh_port}' -c /etc/rc/hello > /var/log/dropbear_start.log");
        $this->generateAuthorizedKeys();

        $result['data'] = @file_get_contents('/var/log/dropbear_start.log');
        if ( ! empty($result['data'])) {
            $result['result'] = 'ERROR';
        }

        // Устанавливаем пароль на пользователя ОС.
        $this->updateShellPassword();
        return $result;
    }

    /**
     * Сохранение ключей аторизации.
     */
    public function generateAuthorizedKeys(): void
    {
        $ssh_dir = '/root/.ssh';
        Util::mwMkdir($ssh_dir);


        $conf_data = $this->mikoPBXConfig->getGeneralSettings('SSHAuthorizedKeys');
        file_put_contents("{$ssh_dir}/authorized_keys", $conf_data);
    }

    /**
     * Устанавливаем пароль для пользователя системы.
     **/
    public function updateShellPassword(): void
    {
        $password = $this->mikoPBXConfig->getGeneralSettings('SSHPassword');
        $echoPath = Util::which('echo');
        $chpasswdPath = Util::which('chpasswd');
        Util::mwExec("{$echoPath} \"root:$password\" | {$chpasswdPath}");
    }

    /**
     * Запуск open vmware tools.
     */
    public function vmwareToolsConfigure(): void
    {
        Util::killByName("vmtoolsd");
        $virtualHW = $this->mikoPBXConfig->getGeneralSettings('VirtualHardwareType');
        if ('VMWARE' === $virtualHW) {
            $conf = "[logging]\n"
                . "log = false\n"
                . "vmtoolsd.level = none\n"
                . ";vmsvc.data = /dev/null\n"
                . "vmsvc.level = none\n";

            $dirVM = '/etc/vmware-tools';
            if(!file_exists($dirVM)){
                Util::mwMkdir($dirVM);
            }

            file_put_contents("{$dirVM}/tools.conf", $conf);
            $vmtoolsdPath = Util::which('vmtoolsd');
            Util::mwExec("{$vmtoolsdPath} --background=/var/run/vmtoolsd.pid > /dev/null 2> /dev/null");
        }
    }

    /**
     * Reboots the system after calling system_reboot_cleanup()
     *
     */
    public static function rebootSync(): void
    {
        $mikopbx_rebootPath = Util::which('mikopbx_reboot');
        Util::mwExec("{$mikopbx_rebootPath} > /dev/null 2>&1");
    }

    /**
     * Reboots the system after calling system_reboot_cleanup()
     *
     */
    public static function rebootSyncBg(): void
    {
        $mikopbx_rebootPath = Util::which('mikopbx_reboot');
        Util::mwExecBg("{$mikopbx_rebootPath} > /dev/null 2>&1");
    }

    /**
     * Shutdown the system.
     */
    public static function shutdown(): void
    {
        $shutdownPath = Util::which('shutdown');
        Util::mwExec("{$shutdownPath} > /dev/null 2>&1");
    }
}
