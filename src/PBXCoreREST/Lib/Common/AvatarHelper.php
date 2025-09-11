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

namespace MikoPBX\PBXCoreREST\Lib\Common;

use function MikoPBX\Common\Config\appPath;

/**
 * Helper class for avatar image processing and caching
 * 
 * Provides centralized functionality for converting base64 avatar data to cached files
 * and generating URLs for avatar images.
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Common
 */
class AvatarHelper
{
    /**
     * Default avatar image path
     */
    private const DEFAULT_AVATAR = '/admin-cabinet/assets/img/unknownPerson.jpg';
    
    /**
     * Cache directory relative path
     */
    private const CACHE_DIR = 'sites/admin-cabinet/assets/img/cache';
    
    /**
     * Get avatar URL with caching support
     * 
     * Converts base64 avatar data to a cached file and returns the URL.
     * If the avatar data is empty or invalid, returns the default avatar.
     * If the avatar is already a URL path, returns it as is.
     * 
     * @param string $avatarData Base64 avatar data, URL path, or empty string
     * @return string Avatar URL path
     */
    public static function getAvatarUrl(string $avatarData): string
    {
        // Return default avatar for empty data
        if (empty($avatarData)) {
            return self::DEFAULT_AVATAR;
        }
        
        // Check if it's already a URL path (not base64)
        if (!str_starts_with($avatarData, 'data:image')) {
            // Already a URL path, return as is
            return $avatarData;
        }
        
        // Generate filename based on content hash
        $filename = md5($avatarData);
        $imgCacheDir = appPath(self::CACHE_DIR);
        $imgFile = "{$imgCacheDir}/{$filename}.jpg";
        
        // Ensure cache directory exists
        if (!is_dir($imgCacheDir)) {
            if (!mkdir($imgCacheDir, 0755, true)) {
                // Failed to create directory, return default avatar
                return self::DEFAULT_AVATAR;
            }
        }
        
        // Process avatar file if it doesn't exist yet
        if (!file_exists($imgFile)) {
            if (!self::base64ToJpegFile($avatarData, $imgFile)) {
                // Failed to create file, return default avatar
                return self::DEFAULT_AVATAR;
            }
        }
        
        // Return the cache URL
        return "/admin-cabinet/assets/img/cache/{$filename}.jpg";
    }
    
    /**
     * Convert base64 string to JPEG file
     * 
     * @param string $base64String Base64 encoded image data
     * @param string $outputFile Output file path
     * @return bool True on success, false on failure
     */
    private static function base64ToJpegFile(string $base64String, string $outputFile): bool
    {
        try {
            // Open the output file for writing
            $ifp = fopen($outputFile, 'wb');
            if ($ifp === false) {
                return false;
            }
            
            // Split the string on commas
            // $data[0] == "data:image/png;base64"
            // $data[1] == <actual base64 string>
            $data = explode(',', $base64String);
            if (count($data) > 1) {
                // Write the base64 decoded data to the file
                $result = fwrite($ifp, base64_decode($data[1]));
                fclose($ifp);
                return $result !== false;
            }
            
            // Close the file resource
            fclose($ifp);
            return false;
            
        } catch (\Exception $e) {
            // Handle any exceptions during file operations
            return false;
        }
    }
}