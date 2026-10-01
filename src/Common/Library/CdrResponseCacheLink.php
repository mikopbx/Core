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

namespace MikoPBX\Common\Library;

final class CdrResponseCacheLink
{
    private const string TEMP_FILE_PREFIX = 'temp-';

    public static function remove(string $cacheDir, string $responseFile): bool
    {
        $responseName = basename($responseFile);
        $pattern = '/^' . preg_quote(self::TEMP_FILE_PREFIX, '/') . '([a-f0-9]{32})$/D';
        if (preg_match($pattern, $responseName, $matches) !== 1) {
            return false;
        }

        $linkName = rtrim($cacheDir, '/') . '/' . $matches[1];

        return is_link($linkName)
            && readlink($linkName) === $responseFile
            && unlink($linkName);
    }
}
