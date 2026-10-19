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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Middleware;

use Phalcon\Mvc\Micro;

/**
 * Refuses request bodies that would be read into memory and pushed to Redis (#1171).
 *
 * The Lua WAF gives 413 for the same bodies, but it skips localhost, the relaxed mode and
 * URIs exempt from the body scan. Only files of a multipart POST (uploads) may be larger:
 * the media type is cut the way PHP SAPI cuts it, and the text fields PHP parsed into $_POST
 * still count. Behind nginx CONTENT_LENGTH is always set: it buffers a chunked body first.
 */
class RequestSizeMiddleware extends BaseMiddleware
{
    public const int MAX_BODY_BYTES = 4 * 1024 * 1024;

    public function call(Micro $application): bool
    {
        $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($length <= self::MAX_BODY_BYTES) {
            return true;
        }
        $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
        $isUpload = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST'
            && strtok($contentType, ';, ') === 'multipart/form-data'
            && !str_contains($contentType, 'json');
        if ($isUpload && self::fieldsLength($_POST) <= self::MAX_BODY_BYTES) {
            return true;
        }
        $this->halt($application, 413, 'Request body too large: more than ' . self::MAX_BODY_BYTES . ' bytes');
        return false;
    }

    /**
     * @param array<mixed> $fields
     */
    private static function fieldsLength(array $fields): int
    {
        $length = 0;
        array_walk_recursive($fields, static function ($value, $key) use (&$length): void {
            $length += strlen((string)$key) + strlen((string)$value);
        });
        return $length;
    }
}
