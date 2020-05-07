<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */
namespace MikoPBX\Core\System;

use Exception;
use MikoPBX\Core\Asterisk\Configs\{IAXConf, QueueConf, SIPConf};
use MikoPBX\Core\Backup\{Backup, OldConfigConverter};
use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Core\Workers\Cron\WorkerSafeScripts;
use MikoPBX\Core\Workers\WorkerDownloader;
use Phalcon\Di;

/**
 *
 */
class System
{
    private $mikoPBXConfig;
    private $di;

    /**
     * System constructor.
     */
    public function __construct()
    {
        $this->di = Di::getDefault();

        // Класс / обертка для работы с настройками.
        $this->mikoPBXConfig    = new MikoPBXConfig();
    }

    static function setupPhpLog()
    {
        $src_log_file = '/var/log/php_error.log';
        $dst_log_file = self::getPhpFile();
        if ( ! file_exists($src_log_file)) {
            file_put_contents($src_log_file, '');
        }
        $options = file_exists($dst_log_file) ? '>' : '';
        Util::mwExec("cat {$src_log_file} 2> /dev/null >{$options} {$dst_log_file}");
        Util::createUpdateSymlink($dst_log_file, $src_log_file);
    }

    static function getPhpFile()
    {
        $logdir = self::getLogDir() . '/php';
        if ( ! file_exists($logdir) && ! mkdir($logdir, 0777, true) && ! is_dir($logdir)) {
            $logdir = '/var/log';
        }

        return "$logdir/error";
    }

    static function rotatePhpLog()
    {
        $max_size    = 2;
        $f_name      = self::getPhpFile();
        $text_config = "{$f_name}" . ' {
    nocreate
    nocopytruncate
    delaycompress
    nomissingok
    start 0
    rotate 9
    size ' . $max_size . 'M
    missingok
    noolddir
    postrotate
        /usr/sbin/asterisk -rx "logger reload" > /dev/null 2> /dev/null
    endscript
}';
        $varEtcPath = Di::getDefault()->getConfig()->path('core.varEtcPath');
        $path_conf   = $varEtcPath . '/php_logrotate_' . basename($f_name) . '.conf';
        file_put_contents($path_conf, $text_config);
        $mb10 = $max_size * 1024 * 1024;

        $options = '';
        if (Util::mFileSize($f_name) > $mb10) {
            $options = '-f';
        }
        Util::mwExecBg("/usr/sbin/logrotate {$options} '{$path_conf}' > /dev/null 2> /dev/null");
    }

    /**
     *
     */
    public static function gnatsLogRotate(): void
    {
        $log_dir = self::getLogDir() . '/nats';
        $pid     = Util::getPidOfProcess('gnatsd', 'custom_modules');

        $max_size = 1;
        if (empty($pid)) {
            $system = new System();
            $system->gnatsStart();
            sleep(1);
        }
        $text_config = "{$log_dir}/gnatsd.log" . ' {
    start 0
    rotate 9
    size ' . $max_size . 'M
    maxsize 1M
    daily
    missingok
    notifempty
    sharedscripts
    postrotate
        /usr/sbin/gnatsd -sl reopen=' . $pid . ' > /dev/null 2> /dev/null
    endscript
}';

        $mb10 = $max_size * 1024 * 1024;

        $options = '';
        if (Util::mFileSize("{$log_dir}/gnatsd.log") > $mb10) {
            $options = '-f';
        }
        $varEtcPath = Di::getDefault()->getConfig()->path('core.varEtcPath');
        $path_conf = $varEtcPath . '/gnatsd_logrotate.conf';
        file_put_contents($path_conf, $text_config);
        if (file_exists("{$log_dir}/gnatsd.log")) {
            Util::mwExecBg("/usr/sbin/logrotate $options '{$path_conf}' > /dev/null 2> /dev/null");
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
        if ( ! file_exists($confdir) && ! mkdir($confdir, 0777, true) && ! is_dir($confdir)) {
            Util::sysLogMsg('NATS', 'Error. Can not create dir ' . $confdir);
        }
        $logdir = self::getLogDir() . '/nats';
        if ( ! file_exists($logdir) && ! mkdir($logdir, 0777, true) && ! is_dir($logdir)) {
            $logdir = '/var/log';
        }

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
            Util::mwExec('kill $(cat ' . $pid_file . ')');
        }
        Util::mwExecBg("/usr/sbin/gnatsd --config {$conf_file}", "{$logdir}/gnats_process.log");

        $result = [
            'result' => 'Success',
        ];

        // Перезапуск сервисов.
        $additionalModules = $this->di->getShared('pbxConfModules');
        foreach ($additionalModules as $appClass) {
            /** @var \MikoPBX\Core\Asterisk\Configs\ConfigClass $appClass */
            $appClass->onNatsReload();
        }

        return $result;
    }

    /**
     * Reboots the system after calling system_reboot_cleanup()
     *
     * @param bool $check_storage
     */
    static function rebootSync():void
    {
        Util::mwExec("/etc/rc/reboot > /dev/null 2>&1");
    }

    /**
     * Shutdown the system.
     */
    static function shutdown():void
    {
        Util::mwExec("/etc/rc/shutdown > /dev/null 2>&1");
    }

    /**
     * Рестарт сетевых интерфейсов.
     */
    static function networkReload()
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

        return Util::mwExec('/bin/hostname ' . escapeshellarg("{$data['hostname']}"));
    }

    /**
     * Установка системного времени.
     *
     * @param $date - 2015.12.31-01:01:20
     *
     * @return array
     */
    static function setDate($date)
    {
        $result = [
            'result' => 'ERROR',
        ];
        // Преобразование числа к дате. Если необходимо.
        $date = Util::numberToDate($date);
        // Валидация даты.
        $re_date = '/^\d{4}\.\d{2}\.\d{2}\-\d{2}\:\d{2}\:\d{2}$/';
        preg_match_all($re_date, $date, $matches, PREG_SET_ORDER, 0);
        if (count($matches) > 0) {
            $result['result'] = 'Success';
            $arr_data         = [];
            Util::mwExec("date -s '{$date}'", $arr_data);
            $result['data'] = implode($arr_data);
        } else {
            $result['result'] = 'Success';
            $result['data']   = 'Update timezone only.';
            // $result = 'Error format DATE. Need YYYY.MM.DD-hh:mm:ss';
        }

        $sys = new System();
        $sys->timezoneConfigure();

        return $result;
    }

    /**
     * Populates /etc/TZ with an appropriate time zone
     */
    public function timezoneConfigure(): void
    {
        $timezone = $this->mikoPBXConfig->getTimeZone();

        // include('timezones.php'); TODO:: Удалить и сам файл?
        @unlink("/etc/TZ");
        @unlink("/etc/localtime");

        if ($timezone) {
            $zone_file = "/usr/share/zoneinfo/{$timezone}";
            if ( ! file_exists($zone_file)) {
                return;
            }
            exec("cp  $zone_file /etc/localtime");
            file_put_contents('/etc/TZ', $timezone);
            putenv("TZ={$timezone}");
            exec("export TZ;");
        }

        $this->ntpDaemonConfigure();
        self::phpTimeZoneConfigure();
    }

    /**
     * Настрока демона ntpd.
     */
    private function ntpDaemonConfigure()
    {
        $ntp_server = $this->mikoPBXConfig->getServerNTP();
        if ('' != $ntp_server) {
            $ntp_conf = "server $ntp_server";
        } else {
            $ntp_conf = 'server 0.pool.ntp.org
server 1.pool.ntp.org
server 2.pool.ntp.org';
        }
        Util::fileWriteContent('/etc/ntp.conf', $ntp_conf);
        if ( ! Util::isSystemctl()) {
            Util::killByName("ntpd");
        }
        usleep(500000);
        $manual_time = $this->mikoPBXConfig->getGeneralSettings('PBXManualTimeSettings');
        if ($manual_time != 1 && ! Util::isSystemctl()) {
            Util::mwExec("ntpd");
        }
    }

    /**
     * Установка таймзоны для php.
     */
    static function phpTimeZoneConfigure()
    {
        $mikoPBXConfig   = new MikoPBXConfig();
        $timezone = $mikoPBXConfig->getTimeZone();
        date_default_timezone_set($timezone);
        if (file_exists('/etc/TZ')) {
            Util::mwExec('export TZ="$(cat /etc/TZ)"');
        }
    }

    /**
     * Получение сведений о системе.
     *
     * @return array
     */
    static function getInfo()
    {
        $result = [
            'result' => 'Success',
        ];

        $storage        = new Storage();
        $data           = [
            'disks'  => $storage->getAllHdd(),
            'cpu'    => self::getCpu(),
            'uptime' => self::getUpTime(),
            'mem'    => self::getMemInfo(),
        ];
        $result['data'] = $data;

        return $result;
    }

    /**
     * Возвращает информацию по загрузке CPU.
     */
    static function getCpu()
    {
        $ut = [];
        Util::mwExec("/bin/mpstat | /bin/grep all", $ut);
        preg_match("/^.*\s+all\s+.*\s+.*\s+.*\s+.*\s+.*\s+.*\s+.*\s+.*\s+(.*)\s*.*/i", $ut[0], $matches);
        $rv = 100 - $matches[1];

        if (100 < $rv) {
            $rv = 100;
        }

        return round($rv, 2);
    }

    /**
     * Получаем информацию по времени работы ПК.
     */
    static function getUpTime()
    {
        $ut = [];
        Util::mwExec("/usr/bin/uptime | awk -F \" |,\" '{print $5}'", $ut);

        return implode('', $ut);
    }

    /**
     * Получаем информацию по оперативной памяти.
     */
    static function getMemInfo()
    {
        $result = [];
        $out    = [];

        Util::mwExec("cat /proc/meminfo | grep -C 0 'Inactive:' | awk '{print $2}'", $out);
        $result['inactive'] = round((1 * implode($out)) / 1024, 2);
        Util::mwExec("cat /proc/meminfo | grep -C 0 'MemFree:' | awk '{print $2}'", $out);
        $result['free'] = round((1 * implode($out)) / 1024, 2);
        Util::mwExec("cat /proc/meminfo | grep -C 0 'MemTotal:' | awk '{print $2}'", $out);
        $result['total'] = round((1 * implode($out)) / 1024, 2);

        return $result;
    }

    /**
     * Обновление кофнигурации кастомных файлов.
     *
     * @return array
     */
    static function updateCustomFiles()
    {

        $actions = [];
        /** @var \MikoPBX\Common\Models\CustomFiles $res_data */
        $res_data = CustomFiles::find("changed = '1'");
        foreach ($res_data as $file_data) {
            // Всегда рестрартуем все модули asterisk (только чтение конфигурации).
            $actions['asterisk_coreReload'] = 100;
            $filename                        = basename($file_data->filepath);
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
    static function invokeActions($actions)
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
                    $res = CustomFiles::setDate('');
                    break;
                case 'firewall':
                    $res = Firewall::reloadFirewall();
                    break;
                case 'asterisk_coreReload':
                    SIPConf::sipReload();
                    IAXConf::iaxReload();
                    $pbx = new PBX();
                    $pbx->dialplanReload();
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
     * @param bool $booting
     *
     * @return int
     */
    public function cronConfigure():int
    {
        $booting =  $this->di->getRegistry()->booting;
        $this->cronGenerate($booting);
        if (Util::isSystemctl()) {
            Util::mwExec('systemctl restart cron');
        } else {
            Util::killByName('crond');
            Util::mwExec('crond -L /dev/null -l 8');
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
        $mast_have = [];

        if (Util::isSystemctl()) {
            $mast_have[]   = "SHELL=/bin/sh\n";
            $mast_have[]   = "PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin\n\n";
            $cron_filename = '/etc/cron.d/mikopbx';
            $cron_user     = 'root ';
        } else {
            $cron_filename = '/var/spool/cron/crontabs/root';
            $cron_user     = '';
        }


        $workerSafeScriptsPath = Util::getFilePathByClassName(WorkerSafeScripts::class);

        $WorkerSafeScripts = "/usr/bin/php -f {$workerSafeScriptsPath} start > /dev/null 2> /dev/null";

        $workersPath = $this->di->get('config')->path('core.workersPath');

        $restart_night = $this->mikoPBXConfig->getGeneralSettings('RestartEveryNight');
        if ($restart_night === '1') {
            $mast_have[] = '0 1 * * * ' . $cron_user . '/usr/sbin/asterisk -rx"core restart now" > /dev/null 2> /dev/null' . "\n";
        }
        $mast_have[] = '*/5 * * * * ' . $cron_user . '/usr/sbin/ntpd -q > /dev/null 2> /dev/null' . "\n";
        $mast_have[] = '*/6 * * * * ' . $cron_user . "/bin/sh {$workersPath}/Cron/cleaner_download_links.sh  download_link > /dev/null 2> /dev/null\n";
        $mast_have[] = '*/1 * * * * ' . $cron_user . "{$WorkerSafeScripts}\n";

        Backup::createCronTasks($mast_have);
        $tasks = [];
        // Дополнительные модули также могут добавить задачи в cron.
        foreach ($additionalModules as $appClass) {
            /** @var \MikoPBX\Core\Asterisk\Configs\ConfigClass $appClass */
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

    static function convertConfig($config_file = '')
    {
        $result = [
            'result'  => 'Success',
            'message' => '',
        ];
        $di = Di::getDefault();
        $tempDir = $di->getShared('config')->path('core.tempPath');
        if (empty($config_file)) {
            $config_file = "{$tempDir}/old_config.xml";
        }

        if (file_exists($config_file)) {
            try {
                $cntr = new OldConfigConverter($config_file);
                $cntr->parse();
                $cntr->makeConfig();
                file_put_contents('/tmp/ejectcd', '');
                Util::mwExecBg('/etc/rc/reboot', '/dev/null', 3);
            } catch (Exception $e) {
                $result = [
                    'result'  => 'Error',
                    'message' => $e->getMessage(),
                ];
            }
        } else {
            $result = [
                'result'  => 'Error',
                'message' => 'XML config not found',
            ];
        }

        return $result;
    }

    /**
     * Запускает процесс обновление АТС из img образа.
     *
     * @return array
     */
    public static function upgradeFromImg(): array
    {
        $result = [
            'result'  => 'Success',
            'message' => 'In progress...',
            'info'    => 'Update from local file',
        ];

        $di = Di::getDefault();
        $tempDir = $di->getShared('config')->path('core.tempPath');
        $upd_file = "{$tempDir}/update.img";
        if ( ! file_exists($upd_file)) {
            $upd_file       = "{$tempDir}/upgradeOnline/update.img";
            $result['info'] = 'Online update';
        }
        if ( ! file_exists($upd_file)) {
            $result['result']  = 'Error';
            $result['message'] = 'IMG file not found';
            $result['path']    = $upd_file;

            return $result;
        }
        if ( ! file_exists('/var/etc/cfdevice')) {
            $result['result']  = 'Error';
            $result['message'] = 'The system is not installed';
            $result['path']    = $upd_file;

            return $result;
        }
        $dev = trim(file_get_contents('/var/etc/cfdevice'));

        $link = '/tmp/firmware_update.img';
        Util::createUpdateSymlink($upd_file, $link);
        Util::mwExecBg("/etc/rc/firmware recover_upgrade {$link} /dev/{$dev}");

        return $result;
    }

    /**
     * Обновление АТС путем скачивания образа с ресурса МИКО.
     *
     * @param $data
     *
     * @return mixed
     */
    static function upgradeOnline($data)
    {
        $di = Di::getDefault();
        $tempDir = $di->getShared('config')->path('core.tempPath');
        $module = 'upgradeOnline';
        if ( ! file_exists($tempDir. "/{$module}")) {
            Util::mwMkdir($tempDir . "/{$module}");
        } else {
            // Чистим файлы, загруженные онлайн.
            Util::mwExec("rm -rf {$tempDir}/{$module}/* ");
        }
        if (file_exists("{$tempDir}/update.img")) {
            // Чистим вручную загруженный файл.
            Util::mwExec("rm -rf {$tempDir}/update.img");
        }

        $download_settings = [
            'res_file' => "{$tempDir}/{$module}/update.img",
            'url'      => $data['url'],
            'module'   => $module,
            'md5'      => $data['md5'],
            'action'   => $module,
        ];

        $workerDownloaderPath =  Util::getFilePathByClassName(WorkerDownloader::class);

        file_put_contents($tempDir . "/{$module}/progress", '0');
        file_put_contents($tempDir . "/{$module}/download_settings.json",
            json_encode($download_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        Util::mwExecBg("php -f {$workerDownloaderPath} " . $tempDir . "/{$module}/download_settings.json");
        // Ожидание запуска процесса загрузки.
        usleep(500000);
        $d_pid = Util::getPidOfProcess($tempDir . "/{$module}/download_settings.json");
        if (empty($d_pid)) {
            sleep(1);
        }

        $result['result'] = 'Success';

        return $result;
    }

    /**
     * Возвращает информацию по статусу загрузки файла обновления img.
     *
     * @return array
     */
    public static function statusUpgrade(): array
    {
        clearstatcache();
        $result        = [
            'result' => 'Success',
        ];
        $di = Di::getDefault();
        $tempDir = $di->getShared('config')->path('core.tempPath');
        $modulesDir    = $tempDir . '/upgradeOnline';
        $progress_file = $modulesDir . '/progress';

        $error = '';
        if (file_exists($modulesDir . '/error')) {
            $error = trim(file_get_contents($modulesDir . '/error'));
        }

        if ( ! file_exists($progress_file)) {
            $result['d_status_progress'] = '0';
            $result['d_status']          = 'NOT_FOUND';
        } elseif ('' !== $error) {
            $result['d_status']          = 'DOWNLOAD_ERROR';
            $result['d_status_progress'] = file_get_contents($progress_file);
            $result['d_error']           = $error;
        } elseif ('100' === file_get_contents($progress_file)) {
            $result['d_status_progress'] = '100';
            $result['d_status']          = 'DOWNLOAD_COMPLETE';
        } else {
            $result['d_status_progress'] = file_get_contents($progress_file);
            $d_pid                       = Util::getPidOfProcess($tempDir . '/upgradeOnline/download_settings.json');
            if (empty($d_pid)) {
                $result['d_status'] = 'DOWNLOAD_ERROR';
                $error              = '';
                if (file_exists($modulesDir . '/error')) {
                    $error = file_get_contents($modulesDir . '/error');
                }
                $result['d_error'] = $error;
            } else {
                $result['d_status'] = 'DOWNLOAD_IN_PROGRESS';
            }
        }

        return $result;
    }

    /**
     * Возвращает статус скачивания модуля.
     *
     * @param $module - Module ID
     *
     * @return array
     */
    public static function moduleDownloadStatus($module): array
    {
        clearstatcache();
        $result        = [
            'result' => 'Success',
            'data'   => null,
        ];
        $di = Di::getDefault();
        $tempDir = $di->getShared('config')->path('core.tempPath');
        $moduleDirTmp  = $tempDir . '/' . $module;
        $progress_file = $moduleDirTmp . '/progress';
        $error         = '';
        if (file_exists($moduleDirTmp . '/error')) {
            $error = trim(file_get_contents($moduleDirTmp . '/error'));
        }

        // Ожидание запуска процесса загрузки.
        $d_pid = Util::getPidOfProcess("{$moduleDirTmp}/download_settings.json");
        if (empty($d_pid)) {
            usleep(500000);
        }

        if ( ! file_exists($progress_file)) {
            $result['d_status_progress'] = '0';
            $result['d_status']          = 'NOT_FOUND';
            $result['i_status']          = false;
        } elseif ('' !== $error) {
            $result['d_status']          = 'DOWNLOAD_ERROR';
            $result['d_status_progress'] = file_get_contents($progress_file);
            $result['d_error']           = $error;
            $result['i_status']          = false;
        } elseif ('100' === file_get_contents($progress_file)) {
            $result['d_status_progress'] = '100';
            $result['d_status']          = 'DOWNLOAD_COMPLETE';
            $result['i_status']          = file_exists($moduleDirTmp . '/installed');
        } else {
            $result['d_status_progress'] = file_get_contents($progress_file);
            $d_pid                       = Util::getPidOfProcess($moduleDirTmp . '/download_settings.json');
            if (empty($d_pid)) {
                $result['d_status'] = 'DOWNLOAD_ERROR';
                $error              = '';
                if (file_exists($moduleDirTmp . '/error')) {
                    $error = file_get_contents($moduleDirTmp . '/error');
                }
                $result['d_error'] = $error;
            } else {
                $result['d_status'] = 'DOWNLOAD_IN_PROGRESS';
            }
            $result['i_status'] = false;
        }

        return $result;
    }

    /**
     * Запуск процесса фоновой загрузки доп. модуля АТС.
     *
     * @param $module
     * @param $url
     * @param $md5
     *
     * @return array
     */
    public static function moduleStartDownload($module, $url, $md5): array
    {
        $di = Di::getDefault();
        $tempPath = $di->getShared('config')->path('core.tempPath');

        $moduleDirTmp = "{$tempPath}/{$module}";

        if ( ! is_dir($moduleDirTmp)
            && ! mkdir($moduleDirTmp, 0755, true)
            && ! is_dir($moduleDirTmp)) {
            return [];
        }

        $download_settings = [
            'res_file' => "$moduleDirTmp/modulefile.zip",
            'url'      => $url,
            'module'   => $module,
            'md5'      => $md5,
            'action'   => 'module_install',
        ];
        if (file_exists("$moduleDirTmp/error")) {
            unlink("$moduleDirTmp/error");
        }
        if (file_exists("$moduleDirTmp/installed")) {
            unlink("$moduleDirTmp/installed");
        }
        file_put_contents("$moduleDirTmp/progress", '0');
        file_put_contents("$moduleDirTmp/download_settings.json",
            json_encode($download_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        $workerDownloaderPath =  Util::getFilePathByClassName(WorkerDownloader::class);
        Util::mwExecBg("php -f {$workerDownloaderPath} $moduleDirTmp/download_settings.json");

        return [];
    }

    /**
     * Получение информации о публичном IP.
     *
     * @return array
     */
    public static function getExternalIpInfo(): array
    {
        $result = [
            'result'  => 'Error',
            'message' => null,
            'data'    => null,
        ];
        $curl   = curl_init();
        $url    = 'https://ipinfo.io/json';
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_TIMEOUT, 2);

        try {
            $resultrequest = curl_exec($curl);
        } catch (Exception $e) {
            $result['message'] = $e->getMessage();

            return $result;
        }
        curl_close($curl);
        if (Util::isJson($resultrequest)) {
            $result['result'] = 'Success';
            $result['data']   = json_decode($resultrequest, true);
        } else {
            $result['message'] = 'Error format data ' . $resultrequest;
        }

        return $result;
    }

    /**
     * Чтение данных сессии. (Read-only sessions to the rescue).
     * https://www.leaseweb.com/labs/2014/08/session-locking-non-blocking-read-sessions-php/
     */
    public static function sessionReadonly(): void
    {
        if ( ! is_array($_COOKIE) || ! isset($_COOKIE[session_name()])) {
            return;
        }
        $session_name = preg_replace('/[^\da-z]/i', '', $_COOKIE[session_name()]);
        $session_file = session_save_path() . '/sess_' . $session_name;
        if ( ! file_exists($session_file)) {
            return;
        }
        $session_data = @file_get_contents($session_file);
        $return_data  = [];
        $offset       = 0;
        while ($offset < strlen($session_data)) {
            if (strpos(substr($session_data, $offset), '|') === false) {
                break;
            }
            $pos                   = strpos($session_data, '|', $offset);
            $num                   = $pos - $offset;
            $varname               = substr($session_data, $offset, $num);
            $offset                += $num + 1;
            $data                  = unserialize(substr($session_data, $offset), ['allowed_classes' => []]);
            $return_data[$varname] = $data;
            $offset                += strlen(serialize($data));
        }
        $_SESSION = $return_data;
    }

    /**
     * Подгрузка дополнительных модулей ядра.
     */
    public function loadKernelModules(): void
    {
        Util::mwExec('/sbin/modprobe -q dahdi');
        Util::mwExec('/sbin/modprobe -q dahdi_transcode');
        Util::mwExec('ulimit -n 4096');
        Util::mwExec('ulimit -p 4096');

    }

    /**
     *    Старт web сервера.
     **/
    public function nginxStart(): void
    {
        if (Util::isSystemctl()) {
            Util::mwExec('systemctl restart php7.3-fpm');
            Util::mwExec('systemctl restart nginx.service');
        } else {
            Util::killByName('php-fpm');
            Util::killByName('nginx');
            Util::mwExec('php-fpm -c /etc/php-fpm.ini');
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
        $configPath = '/etc/nginx/mikopbx/conf.d';
        $httpConfigFile = "{$configPath}/http-server.conf";
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
        if ($RedirectToHttps === '1' && $not_ssl === false ) {
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
        } else if(file_exists($httpsConfigFile)) {
            unlink($httpsConfigFile);
        }

        // Test work
        $out = [];
        Util::mwExec('nginx -t', $out);
        $res = implode($out);
        if ($level < 1 && false !== strpos($res, 'test failed')) {
            ++$level;
            Util::sysLogMsg('nginx', 'Failed test config file. SSL will be disable...');
            $this->nginxGenerateConf(true, $level);
        }
    }

    public function syslogd_start(): void
    {
        $syslog_file = '/var/log/messages';
        $log_file    = self::getSyslogFile();
        if ( ! file_exists($syslog_file)) {
            file_put_contents($syslog_file, '');
        }
        $pid = Util::getPidOfProcess('/sbin/syslogd');
        if ( ! empty($pid)) {
            $options = file_exists($log_file) ? '>' : '';
            Util::mwExec('/bin/busybox logread 2> /dev/null >' . $options . $log_file);
            // Завершаем процесс.
            Util::mwExec("/bin/busybox kill '$pid'");
        }

        Util::createUpdateSymlink($log_file, $syslog_file);
        Util::mwExec('/sbin/syslogd -O ' . $log_file . ' -b 10 -s 10240');
    }

    static function getSyslogFile()
    {
        $logdir = self::getLogDir() . '/system';
        if ( ! file_exists($logdir) && ! mkdir($logdir, 0777, true) && ! is_dir($logdir)) {
            $logdir = '/var/log';
        }

        return "$logdir/messages";
    }

    static function getLogDir()
    {
        $di = Di::getDefault();
        return $di->getShared('config')->path('core.logsPath');
    }

    public function safeModules($worker_proc_name, $path_to_script): void
    {
        $pid        = Util::getPidOfProcess($worker_proc_name);
        $need_start = false;
        if (empty($pid)) {
            $need_start = true;
        } else {
            $pid_file = '/var/run/' . $worker_proc_name . '.pid';
            if (file_exists($pid_file)) {
                $data = filemtime($pid_file);
                if (time() - $data > 10) {
                    $need_start = true;
                    Util::killByName($worker_proc_name);
                }
            } else {
                $need_start = true;
            }
        }
        if ($need_start) {
            Util::mwExecBg("/usr/bin/php -f {$path_to_script} start");
        }
    }
 
    /**
     * Будет вызван после старта asterisk.
     */
    public function onAfterPbxStarted(): void
    {
        $additionalModules = $this->di->getShared('pbxConfModules');
        foreach ($additionalModules as $appClass) {
            /** @var \MikoPBX\Core\Asterisk\Configs\ConfigClass $appClass */
            $appClass->onAfterPbxStarted();
        }
    }

    /**
     * Запуск SSH сервера.
     **/
    public function sshdConfigure()
    {
        @file_put_contents('/var/log/lastlog', '');
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
            $key = $this->mikoPBXConfig->getGeneralSettings($db_key);
            $key             = (isset($key)) ? trim($key) : "";
            if (strlen($key) > 100) {
                // Сохраняем ключ в файл.
                file_put_contents($res_keyfilepath, base64_decode($key));
            }
            // Если ключ не существует, создадим его и обновим информацию в базе данных.
            if ( ! file_exists($res_keyfilepath)) {
                // Генерация.
                Util::mwExec("/usr/bin/dropbearkey -t $keytype -f $res_keyfilepath");
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
    public function generateAuthorizedKeys()
    {
        $ssh_dir = '/root/.ssh';
        Util::mwMkdir($ssh_dir);


        $conf_data = $this->mikoPBXConfig->getGeneralSettings('SSHAuthorizedKeys');
        file_put_contents("{$ssh_dir}/authorized_keys", $conf_data);
    }

    /**
     * Устанавливаем пароль для пользователя системы.
     **/
    public function updateShellPassword()
    {
        $password = $this->mikoPBXConfig->getGeneralSettings('SSHPassword');
        Util::mwExec("echo \"root:$password\" | /usr/sbin/chpasswd");
    }

    /**
     * Запуск open vmware tools.
     */
    public function vmwareToolsConfigure()
    {
        Util::killByName("vmtoolsd");
        $virtualHW = $this->mikoPBXConfig->getGeneralSettings('VirtualHardwareType');
        if ('VMWARE' === $virtualHW) {
            $conf = "[logging]\n"
                . "log = false\n"
                . "vmtoolsd.level = none\n"
                . ";vmsvc.data = /dev/null\n"
                . "vmsvc.level = none\n";
            file_put_contents('/etc/vmware-tools/tools.conf', $conf);
            Util::mwExec('/usr/bin/vmtoolsd --background=/var/run/vmtoolsd.pid > /dev/null 2> /dev/null');
        }
    }

}
