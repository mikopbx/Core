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

namespace MikoPBX\PBXCoreREST\Lib\S3Storage;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\RecordingStorage;
use MikoPBX\Common\Models\StorageSettings;
use MikoPBX\Core\System\Storage\S3Client;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Get S3 Storage Statistics Action
 *
 * Retrieves S3 synchronization status and statistics from database.
 * All queries are fast SQL operations - no filesystem scanning required.
 *
 * @package MikoPBX\PBXCoreREST\Lib\S3Storage
 */
class GetS3StatsAction
{
    /**
     * Get S3 storage status and synchronization statistics
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Get S3 settings
            $s3Settings = StorageSettings::getSettings();
            $s3Enabled = $s3Settings->s3_enabled === 1;

            // Initialize response structure
            $data = [
                's3_enabled' => $s3Enabled,
                's3_connected' => false,
                'bucket' => $s3Settings->s3_bucket ?? '',
                'endpoint' => $s3Settings->s3_endpoint ?? '',

                // Statistics from database
                'files_in_s3' => 0,
                'total_size_s3_bytes' => 0,
                'total_size_s3_mb' => 0,
                'files_local' => 0,
                'total_size_local_bytes' => 0,
                'total_size_local_mb' => 0,

                // Sync status
                'sync_status' => 'disabled',  // disabled | synced | syncing | pending
                'sync_percentage' => 0,
                'last_upload_at' => null,
                'oldest_pending_date' => null,

                // Settings
                'local_retention_days' => (int)PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_S3_LOCAL_DAYS),
                'total_retention_days' => (int)PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_SAVE_PERIOD),
            ];

            if (!$s3Enabled) {
                $res->data = $data;
                $res->success = true;
                return $res;
            }

            // Get database connection for raw queries
            $di = Di::getDefault();
            $db = $di->get('db');

            // Count files in S3
            $s3Stats = $db->fetchOne(
                "SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size
                 FROM m_RecordingStorage
                 WHERE storage_location = 's3'"
            );
            $data['files_in_s3'] = (int)($s3Stats['count'] ?? 0);
            $data['total_size_s3_bytes'] = (int)($s3Stats['total_size'] ?? 0);
            $data['total_size_s3_mb'] = round($data['total_size_s3_bytes'] / (1024 * 1024), 2);

            // Count local files (potential pending uploads)
            $localStats = $db->fetchOne(
                "SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size
                 FROM m_RecordingStorage
                 WHERE storage_location = 'local'"
            );
            $data['files_local'] = (int)($localStats['count'] ?? 0);
            $data['total_size_local_bytes'] = (int)($localStats['total_size'] ?? 0);
            $data['total_size_local_mb'] = round($data['total_size_local_bytes'] / (1024 * 1024), 2);

            // Get last upload timestamp
            $lastUpload = $db->fetchOne(
                "SELECT MAX(uploaded_at) as last_upload
                 FROM m_RecordingStorage
                 WHERE storage_location = 's3' AND uploaded_at IS NOT NULL"
            );
            $data['last_upload_at'] = $lastUpload['last_upload'] ?? null;

            // Get oldest local recording (potential pending)
            $oldestLocal = $db->fetchOne(
                "SELECT MIN(recordingfile) as oldest_file
                 FROM m_RecordingStorage
                 WHERE storage_location = 'local'"
            );
            if (!empty($oldestLocal['oldest_file'])) {
                // Extract date from path like /monitor/2024/11/01/10/filename.wav
                if (preg_match('/(\d{4})\/(\d{2})\/(\d{2})/', $oldestLocal['oldest_file'], $matches)) {
                    $data['oldest_pending_date'] = $matches[1] . '-' . $matches[2] . '-' . $matches[3];
                }
            }

            // Calculate sync status
            $totalFiles = $data['files_in_s3'] + $data['files_local'];
            if ($totalFiles > 0) {
                $data['sync_percentage'] = round(($data['files_in_s3'] / $totalFiles) * 100, 1);

                if ($data['files_local'] === 0) {
                    // Check if upload happened recently (within 10 minutes)
                    $recentUpload = false;
                    if (!empty($data['last_upload_at'])) {
                        $lastUploadTime = strtotime($data['last_upload_at']);
                        $recentUpload = (time() - $lastUploadTime) < 600; // 10 minutes
                    }

                    // If recent upload, show "uploading" status instead of "synced"
                    $data['sync_status'] = $recentUpload ? 'uploading' : 'synced';
                } elseif ($data['files_in_s3'] > 0) {
                    $data['sync_status'] = 'syncing';
                } else {
                    $data['sync_status'] = 'pending';
                }
            } else {
                $data['sync_status'] = 'empty';
                $data['sync_percentage'] = 100;
            }

            // Test S3 connection (quick check)
            if ($s3Enabled && $s3Settings->isS3Configured()) {
                try {
                    $s3Client = new S3Client();
                    $testResult = $s3Client->testConnection();
                    $data['s3_connected'] = $testResult['success'] ?? false;
                } catch (\Throwable $e) {
                    $data['s3_connected'] = false;
                }
            }

            $res->data = $data;
            $res->success = true;

        } catch (\Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }

        return $res;
    }
}
