<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;

use MikoPBX\Core\System\{MikoPBXConfig, System, Util};
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Phalcon\Exception;

require_once 'globals.php';

class WorkerDownloader extends WorkerBase
{
    private $old_memory_limit;
    private $progress = 0;
    private $settings;
    private $progress_file = '';
    private $error_file = '';
    private $installed_file = '';
    private $file_size = 0;

    /**
     * WorkerDownloader entry point.
     *
     * @param string $settings - path to the download settings file
     */

    public function start($argv): void
    {
        if (file_exists($argv[1])) {
            $this->settings = json_decode(file_get_contents($argv[1]), true);
        } else {
            echo 'Download error... Settings file does not exist';
            return;
        }
        $this->old_memory_limit = ini_get('memory_limit');
        register_shutdown_function([$this, 'shutdownHandler']);
        ini_set('memory_limit', '300M');

        $temp_dir             = dirname($this->settings['res_file']);
        $this->progress_file  = $temp_dir . '/progress';
        $this->installed_file = $temp_dir . '/installed';
        $this->error_file     = $temp_dir . '/error';

        if ( ! is_dir($temp_dir) && ! mkdir($temp_dir, 0777, true) && ! is_dir($temp_dir)) {
            Util::sysLogMsg('FileWorkerDownloader', 'Error on create module folder');
        }

        if ($this->getFile()) {
            $this->action();
        } else {
            echo 'Download error... ';
        }
    }

    /**
     * Скачивание файла с удаленного ресурса.
     */
    public function getFile()
    {
        if ( ! $this->settings) {
            return false;
        }
        if (strpos($this->settings['url'], 'file://') !== false) {
            // Это локальный файл.
            $src_file = str_replace('file://', '', $this->settings['url']);
            Util::mwExec("mv {$src_file} {$this->settings['res_file']}");

            if (file_exists($this->settings['res_file'])) {
                file_put_contents($this->progress_file, 100);
                $result = true;
            } else {
                file_put_contents($this->error_file, "Can not find module file {$src_file}", FILE_APPEND);
                $result = false;
            }

            return $result;
        }
        if (file_exists($this->settings['res_file'])) {
            Util::mwExec("rm -rf {$this->settings['res_file']}");
        }
        $this->file_size = $this->remotefileSize($this->settings['url']);

        file_put_contents($this->progress_file, 0);

        $fp = fopen($this->settings['res_file'], 'w');
        $ch = curl_init();

        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_URL, $this->settings['url']);
        curl_setopt($ch, CURLOPT_PROGRESSFUNCTION, [$this, 'progress']);
        curl_setopt($ch, CURLOPT_NOPROGRESS, false); // needed to make progress function work
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

        curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($http_code !== 200) {
            file_put_contents($this->error_file, "Curl return code $http_code", FILE_APPEND);
        }
        curl_close($ch);

        return $http_code === 200;
    }

    /**
     * Remote File Size Using cURL
     *
     * @param string $url
     *
     * @return int || void
     */
    private function remotefileSize($url)
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_NOBODY, 1);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 0);
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
        curl_exec($ch);
        $filesize = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
        curl_close($ch);

        return $filesize;
    }

    /**
     * Выполнение действия с загруженным файлом.
     */
    public function action()
    {
        if ( ! $this->settings || ! isset($this->settings['action'])) {
            return;
        }
        if ( ! file_exists($this->settings['res_file'])) {
            file_put_contents($this->error_file, 'File does not uploaded', FILE_APPEND);

            return;
        }
        if ( ! file_exists($this->settings['res_file']) || md5_file($this->settings['res_file']) !== $this->settings['md5']) {

            if (file_exists($this->settings['res_file'])) {
                unlink($this->settings['res_file']);
            }
            file_put_contents($this->error_file, 'Error check sum.', FILE_APPEND);

            return;
        }

        // MD5 проверили, подтверждаем загрузку файла на 100%
        if ('module_install' === $this->settings['action']) {

            $error            = false;
            $currentModuleDir = $this->di->getConfig()->path('core.modulesDir') . $this->settings['module'];
            $needBackup       = is_dir($currentModuleDir);
            $path_class       = "\\Modules\\{$this->settings['module']}\\setup\\PbxExtensionSetup";

            // Kill all module processes
            if (is_dir("{$currentModuleDir}/bin")) {
                Util::mwExec("/bin/busybox kill -9 $(/usr/bin/lsof {$currentModuleDir}/bin/* |  /bin/busybox grep -v COMMAND | /bin/busybox awk  '{ print $2}' | /bin/busybox uniq)");
            }

            // Uninstall module with keep settings and backup db
            try {
                if ($needBackup) {
                    $config  = new MikoPBXConfig();
                    $WEBPort = $config->getGeneralSettings('WEBPort');
                    $url     = "http://127.0.0.1:{$WEBPort}/pbxcore/api/modules/{$this->settings['module']}/uninstall";

                    $data        = [
                        'uniqid'       => $this->settings['module'],
                        'keepSettings' => 'true',
                    ];
                    $data_string = json_encode($data);
                    $ch          = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $url);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
                    curl_setopt($ch, CURLOPT_POST, 1);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
                    curl_exec($ch);
                    curl_close($ch);
                }
            } catch (Exception $error) {
                // Broken or very old module. Force uninstall.
                Util::mwExec("rm -rf $currentModuleDir");
            } finally {
                if (is_dir($currentModuleDir)) {
                    // Broken or very old module. Force uninstall.
                    Util::mwExec("rm -rf $currentModuleDir");
                }
            }

            Util::mwExec("7za e -spf -aoa -o$currentModuleDir {$this->settings['res_file']}");
            Util::mwExec("chown www:www -R $currentModuleDir");

            if ( ! $error && class_exists($path_class) && method_exists($path_class, 'installModule')) {
                $setup = new $path_class($this->settings['module']);
                if ( ! $setup->installModule()) {
                    $error          = true;
                    $result['data'] = 'Install error:' . implode('<br>', $setup->getMessages());
                }
            } else {
                $result['data'] = "Install error: the class {$path_class} doesn't exist";
                file_put_contents($this->error_file, $result['data'], FILE_APPEND);
            }

            if ($error) {
                $result['result'] = 'Error';
                file_put_contents($this->error_file, 'Install error ' . $result['data'], FILE_APPEND);
            } else {
                $result['result'] = 'Success';
                file_put_contents($this->installed_file, '');
                file_put_contents($this->progress_file, 100);
                Util::restartModuleDependentWorkers();
                Util::restartWorker(WorkerApiCommands::class);
            }
            Util::mwExec('rm -rf ' . $this->settings['res_file']);
        } elseif ('upgradeOnline' === $this->settings['action']) {
            sleep(3);
            unlink($this->progress_file);
            System::upgradeFromImg();
            file_put_contents($this->progress_file, 100);
        }
    }

    /**
     * Возвращаем memory_limit в исходную.
     */
    public function __destruct()
    {
        ini_set('memory_limit', $this->old_memory_limit);
    }

    /**
     * Обработка фатальных ошибок скрипта.
     */
    public function shutdownHandler(): void
    {
        if (@is_array($e = @error_get_last())) {
            if (file_exists($this->error_file)) {
                file_put_contents($this->error_file,
                    json_encode(error_get_last(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            } else {
                Util::sysLogMsg('FileWorkerDownloader', json_encode(error_get_last()));
            }
        }
    }

    /**
     * Обработка прогресса скачивания файла.
     *
     * @param $resource
     * @param $download_size
     * @param $downloaded
     * @param $upload_size
     * @param $uploaded
     */
    public function progress($resource, $download_size, $downloaded, $upload_size, $uploaded)
    {
        if ($download_size === 0) {
            return;
        }
        if ($this->file_size < 0) {
            $new_progress = $downloaded / $download_size * 100;
        } else {
            $new_progress = $downloaded / $this->file_size * 100;
        }
        $delta = $new_progress - $this->progress;
        if ($delta > 1) {
            $this->progress = round($new_progress, 0);
            file_put_contents($this->progress_file, $this->progress);
        }
        if ($this->file_size === $downloaded) {
            file_put_contents($this->progress_file, 100);
        }
    }

}

// Start worker process
$workerClassname = WorkerDownloader::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (\Exception $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}

// php -dxdebug.remote_autostart=On -f {$workersPath}/WorkerDownloader.php /storage/usbdisk1/mikopbx/tmp/ModuleCTIClient/download_settings.json