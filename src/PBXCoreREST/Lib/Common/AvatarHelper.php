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

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Util;

use function MikoPBX\Common\Config\appPath;

/**
 * Helper class for avatar image processing and storage
 *
 * Provides centralized functionality for:
 * - Saving avatar images to permanent storage (/media/avatars/)
 * - Converting base64 avatar data to cached files for display
 * - Generating URLs for avatar images
 *
 * Storage Architecture:
 * - Permanent storage: /storage/.../media/avatars/user_{id}.jpg
 * - Database stores: /avatars/user_{id}.jpg (relative path)
 * - Display cache: /sites/admin-cabinet/assets/img/cache/{hash}.jpg (temporary)
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
     * Cache directory relative path (for display caching of legacy base64 data)
     */
    private const CACHE_DIR = 'sites/admin-cabinet/assets/img/cache';

    /**
     * Avatars storage subdirectory under media dir
     */
    private const AVATARS_SUBDIR = '/avatars';
    
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

    /**
     * Save avatar from base64 data to permanent storage
     *
     * Saves the avatar image to /storage/.../media/avatars/user_{userId}.jpg
     * and returns the relative path to store in database.
     *
     * @param string $base64Data Base64 encoded image data (data:image/...;base64,...)
     * @param string $userId User ID for filename generation
     * @return string|null Relative path (/avatars/user_{id}.jpg) on success, null on failure
     */
    public static function saveAvatarToFile(string $base64Data, string $userId): ?string
    {
        // Validate input
        if (empty($base64Data) || !str_starts_with($base64Data, 'data:image')) {
            return null;
        }

        if (empty($userId)) {
            return null;
        }

        // Get media directory and create avatars subdirectory
        $mediaDir = Directories::getDir(Directories::AST_MEDIA_DIR);
        $avatarsDir = $mediaDir . self::AVATARS_SUBDIR;

        // Create avatars directory if it doesn't exist
        if (!is_dir($avatarsDir)) {
            if (!Util::mwMkdir($avatarsDir, true)) {
                return null;
            }
        }

        // Generate filename and full path
        $filename = "user_{$userId}.jpg";
        $filepath = $avatarsDir . '/' . $filename;

        // Save base64 image to file
        if (!self::saveBase64ImageToFile($base64Data, $filepath)) {
            return null;
        }

        // Return relative path for database storage
        return self::AVATARS_SUBDIR . '/' . $filename;
    }

    /**
     * Delete avatar file from permanent storage
     *
     * @param string $avatarPath Relative avatar path (/avatars/user_{id}.jpg)
     * @return bool True if deleted or didn't exist, false on error
     */
    public static function deleteAvatarFile(string $avatarPath): bool
    {
        if (empty($avatarPath) || !str_starts_with($avatarPath, self::AVATARS_SUBDIR)) {
            return true; // Nothing to delete
        }

        $mediaDir = Directories::getDir(Directories::AST_MEDIA_DIR);
        $filepath = $mediaDir . $avatarPath;

        if (file_exists($filepath)) {
            return unlink($filepath);
        }

        return true; // File doesn't exist, consider it deleted
    }

    /**
     * Save base64 encoded image to a file with proper permissions
     *
     * @param string $base64String Base64 image data (data:image/...;base64,...)
     * @param string $outputFile Output file path
     * @return bool True on success, false on failure
     */
    private static function saveBase64ImageToFile(string $base64String, string $outputFile): bool
    {
        try {
            // Split the string on comma to get actual base64 data
            // Format: data:image/png;base64,<actual-data>
            $parts = explode(',', $base64String, 2);
            if (count($parts) !== 2) {
                return false;
            }

            $imageData = base64_decode($parts[1], true);
            if ($imageData === false) {
                return false;
            }

            // Write to file
            $bytesWritten = file_put_contents($outputFile, $imageData);
            if ($bytesWritten === false) {
                return false;
            }

            // Set proper permissions
            chmod($outputFile, 0644);
            Util::addRegularWWWRights($outputFile);

            return true;

        } catch (\Throwable $e) {
            return false;
        }
    }
}