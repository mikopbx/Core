<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\PBXCoreREST\Workers;

require_once 'Globals.php';

use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\System\Util;
use Throwable;


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
            Util::sysLogMsg(__CLASS__, 'Wrong download settings', LOG_ERR);

            return;
        }
        $this->old_memory_limit = ini_get('memory_limit');
        ini_set('memory_limit', '300M');

        $temp_dir            = dirname($this->settings['res_file']);
        $this->progress_file = $temp_dir . '/progress';
        $this->error_file    = $temp_dir . '/error';

        $result = $this->getFile();
        $result = $result && $this->checkFile();
        if ( ! $result) {
            Util::sysLogMsg(__CLASS__, 'Download error...', LOG_ERR);
        }
    }

    /**
     * Downloads file from remote resource by link
     */
    public function getFile(): bool
    {
        if (empty($this->settings)) {
            return false;
        }
        if (file_exists($this->settings['res_file'])) {
            unlink($this->settings['res_file']);
        }
        if (isset($this->settings['size'])){
            $this->file_size = $this->settings['size'];
        } else {
            $this->file_size = $this->remoteFileSize($this->settings['url']);
        }

        file_put_contents($this->progress_file, 0);

        $fp = fopen($this->settings['res_file'], 'w');
        $ch = curl_init();
        if ( ! is_resource($ch)) {
            return false;
        }
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
     * @return int
     */
    private function remoteFileSize(string $url): int
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
     * Checks file md5 sum and size
     */
    public function checkFile(): bool
    {
        if ( ! file_exists($this->settings['res_file'])) {
            file_put_contents($this->error_file, 'File did not upload', FILE_APPEND);

            return false;
        }
        if (md5_file($this->settings['res_file']) !== $this->settings['md5']) {
            unlink($this->settings['res_file']);
            file_put_contents($this->error_file, 'Error on comparing MD5 sum', FILE_APPEND);

            return false;
        }
        if ($this->file_size !== filesize($this->settings['res_file'])) {
            unlink($this->settings['res_file']);
            file_put_contents($this->error_file, 'Error on comparing file size', FILE_APPEND);

            return false;
        }
        file_put_contents($this->progress_file, 100);

        return true;
    }

    /**
     * Returns memory_limit to default value.
     */
    public function __destruct()
    {
        ini_set('memory_limit', $this->old_memory_limit);

    }

    /**
     * Calculates download progress and writes it on progress_file.
     *
     * @param $resource
     * @param $download_size
     * @param $downloaded
     */
    public function progress($resource, $download_size, $downloaded): void
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
            $this->progress = $this->progress < 99 ? $this->progress : 99;
            file_put_contents($this->progress_file, $this->progress);
        }
    }

}

// Start worker process
$workerClassname = WorkerDownloader::class;
if (isset($argv) && count($argv) > 1) {
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (Throwable $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage(), LOG_ERR);
    }
}