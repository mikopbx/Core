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
 * - Database stores JSON: {"path":"/avatars/user_{id}.jpg","hash":"md5_of_file_contents"}
 * - Display cache: /sites/admin-cabinet/assets/img/cache/{hash}.jpg (temporary, legacy base64)
 *
 * Avatar data formats (backward compatible):
 * - JSON string: {"path":"/avatars/user_1.jpg","hash":"a1b2c3..."} (new format)
 * - Path string: /avatars/user_1.jpg (old format, hash = md5 of path)
 * - Base64 blob: data:image/...;base64,... (legacy format from older MikoPBX)
 * - Empty string: no avatar set
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
     * Parse avatar data from any supported format
     *
     * Returns an associative array with 'path' and 'hash' keys.
     * Handles all backward-compatible formats:
     * - JSON: {"path":"...","hash":"..."} → extracted directly
     * - Path: /avatars/user_1.jpg → hash = md5 of path string
     * - Base64: data:image/...;base64,... → hash = md5 of base64 string, path = ''
     * - Empty: '' → path = '', hash = ''
     *
     * @param string $avatarData Raw avatar field from database
     * @return array{path: string, hash: string}
     */
    public static function parseAvatarData(string $avatarData): array
    {
        if (empty($avatarData)) {
            return ['path' => '', 'hash' => ''];
        }

        // New JSON format
        if (str_starts_with($avatarData, '{')) {
            $decoded = json_decode($avatarData, true);
            if (is_array($decoded) && isset($decoded['path'], $decoded['hash'])) {
                return ['path' => $decoded['path'], 'hash' => $decoded['hash']];
            }
        }

        // Legacy base64 blob
        if (str_starts_with($avatarData, 'data:image')) {
            return ['path' => '', 'hash' => md5($avatarData)];
        }

        // Old path-only format
        return ['path' => $avatarData, 'hash' => md5($avatarData)];
    }

    /**
     * Create JSON avatar data string for database storage
     *
     * @param string $path Relative path to avatar file (e.g. /avatars/user_1.jpg)
     * @param string $hash MD5 hash of the file contents
     * @return string JSON string {"path":"...","hash":"..."}
     */
    public static function createAvatarData(string $path, string $hash): string
    {
        return json_encode(['path' => $path, 'hash' => $hash], JSON_UNESCAPED_SLASHES);
    }

    /**
     * Get avatar URL with caching support
     *
     * Converts avatar data (JSON, path, or base64) to a displayable URL.
     * If the avatar data is empty or invalid, returns the default avatar.
     *
     * @param string $avatarData Avatar data from database (JSON, path, base64, or empty)
     * @return string Avatar URL path
     */
    public static function getAvatarUrl(string $avatarData): string
    {
        // Return default avatar for empty data
        if (empty($avatarData)) {
            return self::DEFAULT_AVATAR;
        }

        // Parse JSON format to extract path
        if (str_starts_with($avatarData, '{')) {
            $parsed = self::parseAvatarData($avatarData);
            if (empty($parsed['path'])) {
                return self::DEFAULT_AVATAR;
            }
            return self::avatarFileExists($parsed['path']) ? $parsed['path'] : self::DEFAULT_AVATAR;
        }

        // Check if it's already a URL path (not base64)
        if (!str_starts_with($avatarData, 'data:image')) {
            return self::avatarFileExists($avatarData) ? $avatarData : self::DEFAULT_AVATAR;
        }

        // Legacy base64 blob — convert to cached file
        $filename = md5($avatarData);
        $imgCacheDir = appPath(self::CACHE_DIR);
        $imgFile = "{$imgCacheDir}/{$filename}.jpg";

        // Ensure cache directory exists
        if (!is_dir($imgCacheDir)) {
            if (!mkdir($imgCacheDir, 0755, true)) {
                return self::DEFAULT_AVATAR;
            }
        }

        // Process avatar file if it doesn't exist yet
        if (!file_exists($imgFile)) {
            if (!self::base64ToJpegFile($avatarData, $imgFile)) {
                return self::DEFAULT_AVATAR;
            }
        }

        // Return the cache URL
        return "/admin-cabinet/assets/img/cache/{$filename}.jpg";
    }

    /**
     * Check if avatar file exists on disk
     *
     * Resolves a relative avatar path (e.g. /avatars/user_1.jpg) to the
     * full filesystem path and checks for existence.
     *
     * @param string $relativePath Relative avatar path starting with /avatars/
     * @return bool True if file exists on disk
     */
    private static function avatarFileExists(string $relativePath): bool
    {
        if (empty($relativePath) || !str_starts_with($relativePath, self::AVATARS_SUBDIR)) {
            return false;
        }

        $mediaDir = Directories::getDir(Directories::AST_MEDIA_DIR);
        return file_exists($mediaDir . $relativePath);
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
            $ifp = fopen($outputFile, 'wb');
            if ($ifp === false) {
                return false;
            }

            $data = explode(',', $base64String);
            if (count($data) > 1) {
                $result = fwrite($ifp, base64_decode($data[1]));
                fclose($ifp);
                return $result !== false;
            }

            fclose($ifp);
            return false;

        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Save avatar from base64 data to permanent storage
     *
     * Saves the avatar image to /storage/.../media/avatars/user_{userId}.jpg
     * and returns JSON string with path and content hash for database storage.
     *
     * @param string $base64Data Base64 encoded image data (data:image/...;base64,...)
     * @param string $userId User ID for filename generation
     * @return string|null JSON string {"path":"...","hash":"..."} on success, null on failure
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

        // Compute md5 hash of file contents for cache invalidation
        $relativePath = self::AVATARS_SUBDIR . '/' . $filename;
        $fileHash = md5_file($filepath);
        if ($fileHash === false) {
            return null;
        }

        // Return JSON string with path and hash
        return self::createAvatarData($relativePath, $fileHash);
    }

    /**
     * Delete avatar file from permanent storage
     *
     * Accepts any avatar data format (JSON, path, base64).
     *
     * @param string $avatarData Avatar data from database (JSON, path, or legacy format)
     * @return bool True if deleted or didn't exist, false on error
     */
    public static function deleteAvatarFile(string $avatarData): bool
    {
        if (empty($avatarData)) {
            return true;
        }

        // Parse the avatar data to get the path
        $parsed = self::parseAvatarData($avatarData);
        $avatarPath = $parsed['path'];

        if (empty($avatarPath) || !str_starts_with($avatarPath, self::AVATARS_SUBDIR)) {
            return true; // Nothing to delete (base64 blob or invalid path)
        }

        $mediaDir = Directories::getDir(Directories::AST_MEDIA_DIR);
        $filepath = $mediaDir . $avatarPath;

        if (file_exists($filepath)) {
            return unlink($filepath);
        }

        return true; // File doesn't exist, consider it deleted
    }

    /**
     * Minimum valid image size in bytes.
     *
     * The smallest valid JPEG is ~107 bytes (1x1 pixel).
     * The smallest valid PNG is ~67 bytes (1x1 pixel).
     * Anything below 1 KB is certainly not a usable avatar.
     */
    private const MIN_IMAGE_SIZE = 1024;

    /**
     * Known image format signatures (magic bytes)
     */
    private const IMAGE_SIGNATURES = [
        "\xFF\xD8\xFF"       => 'JPEG',
        "\x89PNG\r\n\x1A\n"  => 'PNG',
        "GIF87a"             => 'GIF',
        "GIF89a"             => 'GIF',
        "RIFF"               => 'WEBP', // WEBP starts with RIFF....WEBP
    ];

    /**
     * Validate that binary data is a real image
     *
     * Checks magic bytes and minimum size to prevent saving corrupt or
     * garbage data (e.g. from LDAP sync with broken jpegPhoto attributes).
     *
     * @param string $imageData Raw binary image data
     * @return bool True if data looks like a valid image
     */
    private static function isValidImageData(string $imageData): bool
    {
        $size = strlen($imageData);
        if ($size < self::MIN_IMAGE_SIZE) {
            return false;
        }

        foreach (self::IMAGE_SIGNATURES as $signature => $format) {
            if (str_starts_with($imageData, $signature)) {
                return true;
            }
        }

        return false;
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
            $parts = explode(',', $base64String, 2);
            if (count($parts) !== 2) {
                return false;
            }

            $imageData = base64_decode($parts[1], true);
            if ($imageData === false) {
                return false;
            }

            // Validate decoded data is a real image before writing
            if (!self::isValidImageData($imageData)) {
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
