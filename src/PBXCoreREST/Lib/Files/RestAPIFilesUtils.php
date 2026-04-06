<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Files;

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Util;

class RestAPIFilesUtils
{
     /**
     * Creates a link to a file in the cache directory for download.
     *
     * @param string $filename The path to the file to link.
     * @param string $prefix The prefix for the link name.
     *
     * @return string The URL path to the linked file.
     */
    public static function makeFileLinkForDownload(string $filename, string $prefix = ''): string
    {
        $cacheDir = Directories::getDir(Directories::WWW_DOWNLOAD_CACHE_DIR);
        $uid = Util::generateRandomString(36);
        $result_dir = "$cacheDir/$uid";
        Util::mwMkdir($result_dir);
        $link_name = $prefix . basename($filename);
        Util::createUpdateSymlink($filename, "$result_dir/$link_name");
        Util::addRegularWWWRights("$result_dir/$link_name");
        return "/pbxcore/files/cache/$uid/$link_name";
    }
}