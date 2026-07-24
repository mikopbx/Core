<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Modules\Pipeline;

use GuzzleHttp;
use Psr\Http\Message\ResponseInterface;

/**
 * Class ModuleDownloadService
 *
 * Downloads a module package synchronously inside the orchestrator process.
 * Mirrors the WorkerDownloader hardening (connect timeout, 30s no-progress
 * watchdog, md5 + size verification) but reports progress through a callback
 * instead of files — the orchestrator uses that callback to keep its journal
 * heartbeat ticking, so no detached process and no poll loop are needed.
 *
 * WorkerDownloader itself is untouched: it stays shared with the firmware
 * update flow.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules\Pipeline
 */
class ModuleDownloadService
{
    // Abort when no bytes arrive for this long
    private const int NO_PROGRESS_TIMEOUT = 30;

    private int $lastActivityAt = 0;
    private int $reportedProgress = 0;
    private int $declaredSize = 0;
    private int $httpCode = 0;
    private string $error = '';

    /**
     * Downloads a file and verifies its md5 and size.
     *
     * @param string $url Source url
     * @param string $md5 Expected md5 of the file
     * @param string $targetFile Where to store the file
     * @param callable|null $onProgress Optional callback(int $percent 0..100),
     *                                  invoked at most once a second
     *
     * @return string Empty string on success, error text on failure
     */
    public function download(string $url, string $md5, string $targetFile, ?callable $onProgress = null): string
    {
        if (file_exists($targetFile)) {
            unlink($targetFile);
        }
        $targetDir = dirname($targetFile);
        if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
            return "Cannot create download directory $targetDir";
        }

        $this->lastActivityAt = time();
        $this->error = '';
        $this->httpCode = 0;

        $curl = new GuzzleHttp\Handler\CurlMultiHandler();
        $handler = GuzzleHttp\HandlerStack::create($curl);
        $client = new GuzzleHttp\Client();
        $lastCallbackAt = 0;
        $promise = $client->getAsync($url, [
            'handler' => $handler,
            'sink' => $targetFile,
            'connect_timeout' => 5,
            'on_headers' => function (ResponseInterface $response): void {
                $this->declaredSize = (int)$response->getHeaderLine('Content-Length');
            },
            'progress' => function (int $downloadTotal, int $downloadedBytes) use ($onProgress, &$lastCallbackAt): void {
                if ($downloadedBytes === 0) {
                    return;
                }
                $this->lastActivityAt = time();
                if ($downloadTotal > 0) {
                    $this->reportedProgress = min((int)round($downloadedBytes / $downloadTotal * 100), 99);
                }
                if ($onProgress !== null && time() !== $lastCallbackAt) {
                    $lastCallbackAt = time();
                    $onProgress($this->reportedProgress);
                }
            },
        ]);
        $promise->then(
            function (ResponseInterface $res): void {
                $this->httpCode = $res->getStatusCode();
            },
            // \Throwable, not RequestException: Guzzle 7 ConnectException
            // extends TransferException and would TypeError a narrower hint,
            // leaving the user with an empty error message
            function (\Throwable $e): void {
                $this->error = $e->getMessage();
                $this->httpCode = -1;
            }
        );

        while ($promise->getState() === 'pending') {
            $curl->tick();
            if (time() - $this->lastActivityAt > self::NO_PROGRESS_TIMEOUT) {
                $this->httpCode = -1;
                $this->error = 'Download aborted: no progress for more than '
                    . self::NO_PROGRESS_TIMEOUT . ' seconds.';
                break;
            }
        }

        if ($this->httpCode !== 200) {
            @unlink($targetFile);
            return $this->error !== '' ? $this->error : "Download failed with HTTP code $this->httpCode";
        }

        return $this->verify($targetFile, $md5);
    }

    /**
     * Verifies md5 and declared size of the downloaded file.
     */
    private function verify(string $targetFile, string $md5): string
    {
        if (!file_exists($targetFile)) {
            return 'Downloaded file is missing';
        }
        if (md5_file($targetFile) !== $md5) {
            unlink($targetFile);
            return 'Error on comparing MD5 sum';
        }
        // A server that omits Content-Length yields declaredSize=0 — an md5
        // match is then the authoritative check, do not fail on size.
        if ($this->declaredSize > 0 && $this->declaredSize !== filesize($targetFile)) {
            unlink($targetFile);
            return 'Error on comparing file size';
        }
        return '';
    }
}
