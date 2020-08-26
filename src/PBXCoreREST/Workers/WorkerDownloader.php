<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\PBXCoreREST\Workers;

require_once 'Globals.php';

use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\System\Util;


class WorkerDownloader extends WorkerBase
{
    private string $old_memory_limit;
    private int $progress = 0;
    private array $settings;
    private string $progress_file = '';
    private string $error_file = '';
    private int $file_size = 0;

    /**
     * WorkerDownloader entry point.
     *
     * @param $argv
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
        $this->error_file     = $temp_dir . '/error';
        Util::mwMkdir($temp_dir);

        if ($this->getFile()) {
            $this->action();
        } else {
            echo 'Download error... ';
        }
    }

    /**
     * Скачивание файла с удаленного ресурса.
     */
    public function getFile(): bool
    {
        if (empty($this->settings)) {
            return false;
        }
        if (file_exists($this->settings['res_file'])) {
            unlink($this->settings['res_file']);
        }
        $this->file_size = $this->remoteFileSize($this->settings['url']);

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
    private function remoteFileSize($url): int
    {
        $ch       = curl_init($url);
        $fileSize = 0;
        if ($ch !== false) {
            curl_setopt($ch, CURLOPT_NOBODY, 1);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 0);
            curl_setopt($ch, CURLOPT_HEADER, 0);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
            curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
            curl_exec($ch);
            $fileSize = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
            curl_close($ch);
        }

        return $fileSize;
    }

    /**
     * Выполнение действия с загруженным файлом.
     */
    public function action(): void
    {
        if (empty($this->settings) || ! isset($this->settings['action'])) {
            return;
        }
        if ( ! file_exists($this->settings['res_file'])) {
            file_put_contents($this->error_file, 'File does not uploaded', FILE_APPEND);

            return;
        }
        if ( ! file_exists($this->settings['res_file']) || md5_file(
                $this->settings['res_file']
            ) !== $this->settings['md5']) {
            if (file_exists($this->settings['res_file'])) {
                unlink($this->settings['res_file']);
            }
            file_put_contents($this->error_file, 'Error check sum.', FILE_APPEND);

            return;
        }
        file_put_contents($this->progress_file, 100);
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
                file_put_contents(
                    $this->error_file,
                    json_encode(error_get_last(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
                );
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
    public function progress($resource, $download_size, $downloaded, $upload_size, $uploaded): void
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