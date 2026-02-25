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

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Core\System\{Directories, SystemMessages, Upgrade\UpgradeSystemConfigInterface, Util};
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer20250115
 *
 * Migrates user avatars from database blob storage to filesystem.
 * - Extracts base64-encoded avatar images from m_Users.avatar
 * - Saves them as files in /storage/usbdisk1/mikopbx/media/avatars/
 * - Updates avatar field to contain file path instead of blob data
 *
 * Note: m_RecordingStorage migration to separate database is done manually
 * for the single existing installation. New installations will use the
 * separate recording_storage.db database automatically.
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer20250115 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2025.1.15';

    /**
     * Avatar storage directory path
     */
    private const string AVATARS_DIR = '/avatars';

    /**
     * Main update method
     *
     * @return void
     */
    public function processUpdate(): void
    {
        $this->migrateUserAvatarsToFiles();
        $this->normalizeOutWorkTimesDates();
    }

    /**
     * Normalize date_from and date_to fields in m_OutWorkTimes to Unix timestamps
     *
     * Historical records may contain dates in YYYY-MM-DD format instead of Unix timestamps.
     * This causes TypeError in PHP 8.3 when passed to date() which expects int.
     *
     * @return void
     */
    private function normalizeOutWorkTimesDates(): void
    {
        $db = $this->di->getShared('db');

        $sql = "SELECT id, date_from, date_to FROM m_OutWorkTimes WHERE date_from != '' OR date_to != ''";
        $result = $db->query($sql);
        $records = $result->fetchAll(\PDO::FETCH_ASSOC);

        $migratedCount = 0;
        foreach ($records as $record) {
            $updates = [];
            $binds = ['id' => $record['id']];

            foreach (['date_from', 'date_to'] as $field) {
                $value = $record[$field];
                if ($value !== '' && !is_numeric($value)) {
                    $timestamp = strtotime($value);
                    if ($timestamp !== false) {
                        $updates[] = "$field = :$field";
                        $binds[$field] = (string)$timestamp;
                    }
                }
            }

            if (!empty($updates)) {
                $updateSql = "UPDATE m_OutWorkTimes SET " . implode(', ', $updates) . " WHERE id = :id";
                $db->execute($updateSql, $binds);
                $migratedCount++;
            }
        }

        if ($migratedCount > 0) {
            echo "Normalized {$migratedCount} OutWorkTimes date records to Unix timestamps\n";
        }
    }

    /**
     * Migrate user avatars from database blob to filesystem
     *
     * This method:
     * 1. Creates avatars directory in media storage
     * 2. Reads all users with base64 avatar data
     * 3. Saves avatar images to files
     * 4. Updates database to store file paths instead of blobs
     *
     * @return void
     */
    private function migrateUserAvatarsToFiles(): void
    {
        // Get media directory and create avatars subdirectory
        $mediaDir = Directories::getDir(Directories::AST_MEDIA_DIR);
        $avatarsDir = $mediaDir . self::AVATARS_DIR;

        if (!is_dir($avatarsDir)) {
            Util::mwMkdir($avatarsDir, true);
        }

        // Get database connection
        $db = $this->di->getShared('db');

        // Find users with base64 avatar data (starts with 'data:image')
        $sql = "SELECT id, avatar FROM m_Users WHERE avatar LIKE 'data:image%'";
        $result = $db->query($sql);
        $users = $result->fetchAll(\PDO::FETCH_ASSOC);

        if (empty($users)) {
            echo "No base64 avatars found in m_Users, skipping migration\n";
            return;
        }

        $migratedCount = 0;
        $failedCount = 0;

        foreach ($users as $user) {
            $userId = $user['id'];
            $avatarData = $user['avatar'];

            // Generate filename based on user ID
            $filename = "user_{$userId}.jpg";
            $filepath = $avatarsDir . '/' . $filename;

            // Extract and save base64 image
            if ($this->saveBase64Image($avatarData, $filepath)) {
                // Update database to store relative path
                $relativePath = self::AVATARS_DIR . '/' . $filename;
                $updateSql = "UPDATE m_Users SET avatar = :avatar WHERE id = :id";
                $db->execute($updateSql, ['avatar' => $relativePath, 'id' => $userId]);

                $migratedCount++;
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Migrated avatar for user ID {$userId} to {$relativePath}",
                    LOG_INFO
                );
            } else {
                $failedCount++;
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Failed to migrate avatar for user ID {$userId}",
                    LOG_WARNING
                );
            }
        }

        echo "Migrated {$migratedCount} user avatars to files";
        if ($failedCount > 0) {
            echo " ({$failedCount} failed)";
        }
        echo "\n";
    }

    /**
     * Save base64-encoded image data to a file
     *
     * @param string $base64String Base64 image data (e.g., data:image/png;base64,...)
     * @param string $outputFile Output file path
     * @return bool True on success, false on failure
     */
    private function saveBase64Image(string $base64String, string $outputFile): bool
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

            // Validate decoded data is a real image (check magic bytes and min size)
            if (strlen($imageData) < 1024 || !$this->hasValidImageSignature($imageData)) {
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
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Error saving avatar: " . $e->getMessage(),
                LOG_ERR
            );
            return false;
        }
    }

    /**
     * Check if binary data starts with a known image format signature
     *
     * @param string $data Raw binary data
     * @return bool True if recognized image format
     */
    private function hasValidImageSignature(string $data): bool
    {
        $signatures = [
            "\xFF\xD8\xFF",        // JPEG
            "\x89PNG\r\n\x1A\n",  // PNG
            "GIF87a",              // GIF
            "GIF89a",              // GIF
            "RIFF",                // WEBP
        ];

        foreach ($signatures as $signature) {
            if (str_starts_with($data, $signature)) {
                return true;
            }
        }

        return false;
    }
}
