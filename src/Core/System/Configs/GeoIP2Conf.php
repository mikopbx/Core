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

use GeoIp2\Database\Reader;
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
     * GeoIP2 database reader instance (singleton)
     *
     * @var Reader|null
     */
    private static ?Reader $geoReader = null;

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
    
    /**
     * Initialize GeoIP2 reader if available
     *
     * @return void
     */
    private static function initGeoReader(): void
    {
        if (self::$geoReader !== null) {
            return;
        }

        $dbPath = self::getDatabasePath();
        if ($dbPath !== null) {
            try {
                self::$geoReader = new Reader($dbPath);
            } catch (\Throwable $e) {
                SystemMessages::sysLogMsg(__METHOD__, 'Failed to initialize GeoIP2 reader: ' . $e->getMessage(), LOG_WARNING);
                self::$geoReader = null;
            }
        }
    }
    
    /**
     * Check if IP address is private, local or bogon network
     *
     * @param string $ip IP address to check
     * @return bool True if IP is private/local/bogon
     */
    private static function isPrivateOrLocalIp(string $ip): bool
    {
        // Validate IP format
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return true; // Invalid IP treated as local
        }
        
        // Check for private, reserved, or local IP ranges
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Get country information for an IP address
     *
     * @param string $ip IP address to lookup
     * @return array Country information with keys: isoCode, name
     */
    public static function getCountryByIp(string $ip): array
    {
        $result = [
            'isoCode' => '',
            'name' => '',
        ];
        
        // Check for private/local/bogon networks first
        if (self::isPrivateOrLocalIp($ip)) {
            $result['isoCode'] = 'LOCAL';
            $result['name'] = 'Local/Private Network';
            return $result;
        }

        // Initialize reader if needed
        self::initGeoReader();

        if (self::$geoReader === null) {
            return $result;
        }

        try {
            $record = self::$geoReader->country($ip);
            $result['isoCode'] = $record->country->isoCode ?? '';
            $result['name'] = $record->country->name ?? '';
        } catch (\Throwable $e) {
            // IP not found in database or error - return empty data
            SystemMessages::sysLogMsg(__METHOD__, "Failed to lookup IP {$ip}: " . $e->getMessage(), LOG_DEBUG);
        }

        return $result;
    }
}

