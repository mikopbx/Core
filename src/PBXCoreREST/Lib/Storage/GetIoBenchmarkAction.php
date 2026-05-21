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

namespace MikoPBX\PBXCoreREST\Lib\Storage;

use MikoPBX\Core\System\Directories;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Get the cached I/O benchmark result.
 *
 * Returns null in `data` when no measurement has ever been run — the UI
 * uses this to show the "no measurement yet" state.
 */
class GetIoBenchmarkAction
{
    private const CACHE_FILE_NAME = '.io-benchmark.json';

    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $tempDir = Directories::getDir(Directories::CORE_TEMP_DIR);
            $cacheFile = $tempDir . '/' . self::CACHE_FILE_NAME;

            if (!is_file($cacheFile)) {
                $res->data = null;
                $res->success = true;
                return $res;
            }

            $raw = @file_get_contents($cacheFile);
            $decoded = $raw !== false ? json_decode($raw, true) : null;
            if (is_array($decoded) && !isset($decoded['_meta'])) {
                // Backfill the TZ envelope for cache files written before the
                // _meta field was introduced — keeps the UI tooltip honest
                // until the next manual re-run rewrites the file.
                $decoded['_meta'] = [
                    'server_timezone' => date_default_timezone_get(),
                    'server_timezone_offset' => (new \DateTime())->getOffset(),
                ];
            }
            $res->data = is_array($decoded) ? $decoded : null;
            $res->success = true;
            return $res;
        } catch (\Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
            return $res;
        }
    }
}
