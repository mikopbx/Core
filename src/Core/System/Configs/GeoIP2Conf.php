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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;

/**
 * Class GeoIP2Conf
 *
 * Manages GeoIP2 database extraction and configuration
 *
 * @package MikoPBX\Core\System\Configs
 */
class GeoIP2Conf extends SystemConfigClass
{
    public const string PROC_NAME = 'geoip2';
    
    /**
     * Source GeoLite2 database file (compressed)
     */
    private const string SOURCE_DB_PATH = '/offload/rootfs/usr/share/geolite2/GeoLite2-Country.mmdb.gz';
    
    /**
     * Database filename (uncompressed)
     */
    private const string DB_FILENAME = 'GeoLite2-Country.mmdb';

    /**
     * Start the service - extract GeoIP2 database to storage if needed
     *
     * @return bool True if successful, false otherwise.
     */
    public function start(): bool
    {
        // Get target directory path using Directories
        $targetDir = Directories::getDir(Directories::CORE_GEOIP2_DB_DIR);
        $targetDbPath = $targetDir . '/' . self::DB_FILENAME;

        // Check if database already exists
        if (file_exists($targetDbPath)) {
            SystemMessages::sysLogMsg(__METHOD__, 'GeoIP2 database already exists: ' . $targetDbPath, LOG_DEBUG);
            return true;
        }

        // Check if source file exists
        if (!file_exists(self::SOURCE_DB_PATH)) {
            SystemMessages::sysLogMsg(__METHOD__, 'Source GeoIP2 database not found: ' . self::SOURCE_DB_PATH, LOG_WARNING);
            return false;
        }

        // Create target directory if it doesn't exist
        Util::mwMkdir($targetDir);

        // Extract the gzipped database file using Processes::mwExec
        $gzipPath = Util::which('gzip');
        $catPath = Util::which('cat');
        
        $sourceFile = escapeshellarg(self::SOURCE_DB_PATH);
        $targetFile = escapeshellarg($targetDbPath);
        
        $command = "$catPath $sourceFile | $gzipPath -d > $targetFile";
        $exitCode = Processes::mwExec($command);

        // Verify extraction was successful
        if ($exitCode === 0 && file_exists($targetDbPath) && filesize($targetDbPath) > 0) {
            SystemMessages::sysLogMsg(__METHOD__, 'GeoIP2 database extracted successfully to: ' . $targetDbPath, LOG_INFO);
            return true;
        }

        SystemMessages::sysLogMsg(__METHOD__, 'Failed to extract GeoIP2 database. Exit code: ' . $exitCode, LOG_WARNING);
        return false;
    }

    /**
     * Get the path to the GeoIP2 database file
     *
     * @return string|null Path to the database file or null if not available
     */
    public static function getDatabasePath(): ?string
    {
        $dbPath = Directories::getDir(Directories::CORE_GEOIP2_DB_DIR) . '/' . self::DB_FILENAME;
        
        return file_exists($dbPath) ? $dbPath : null;
    }
}

