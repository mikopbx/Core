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

namespace MikoPBX\Common\Models;

use Phalcon\Mvc\Model\Relation;

/**
 * RecordingStorage - Recording file storage location mapping
 *
 * Maps original recording file paths (from CDR) to their actual storage
 * location (local disk or S3 bucket). This separate mapping table ensures
 * full backward compatibility with CTI clients.
 *
 * Design Principle:
 * - CallDetailRecords.recordingfile remains unchanged (original path)
 * - This model tracks where the file actually is (local vs S3)
 * - StorageAdapter uses this mapping to transparently access files
 *
 * @property int $id                   Auto-increment primary key
 * @property string $recordingfile     Original recording path (UNIQUE)
 * @property string $storage_location  Current location: 'local' or 's3'
 * @property string|null $s3_key       S3 object key (when location='s3')
 * @property string|null $uploaded_at  Timestamp of S3 upload
 * @property int $file_size            File size in bytes
 *
 * @Indexes(
 *     [name='recordingfile', columns=['recordingfile'], type='UNIQUE']
 * )
 */
class RecordingStorage extends ModelsBase
{
    /**
     * Auto-increment primary key
     * Standard ID field for consistency with other MikoPBX models
     *
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Original recording file path (UNIQUE INDEX)
     * Same path as stored in CallDetailRecords.recordingfile
     * Example: /monitor/2024/11/01/10/out-201-102-20241101-100534.17.wav
     *
     * @Column(type="string", nullable=false)
     */
    public string $recordingfile;

    /**
     * Current storage location
     * Values: 'local' (on PBX disk) or 's3' (in cloud bucket)
     *
     * @Column(type="string", nullable=false, default="local")
     */
    public string $storage_location = 'local';

    /**
     * S3 object key (when storage_location = 's3')
     * Format: recordings/YYYY/MM/DD/HH/filename.wav
     * Example: recordings/2024/11/01/10/out-201-102-20241101-100534.17.wav
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $s3_key = null;

    /**
     * Timestamp when file was uploaded to S3
     * Format: Y-m-d H:i:s
     * Used for calculating local retention expiration
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $uploaded_at = null;

    /**
     * File size in bytes
     * Used for storage quota calculations and statistics
     *
     * @Column(type="integer", nullable=false, default=0)
     */
    public int $file_size = 0;

    /**
     * Initialize model relationships and behaviors
     *
     * @return void
     */
    public function initialize(): void
    {
        $this->setSource('m_RecordingStorage');
        parent::initialize();

        // Optional: Add cascade delete when CDR is deleted
        $this->hasOne(
            'recordingfile',
            CallDetailRecords::class,
            'recordingfile',
            [
                'alias' => 'CallDetailRecord',
                'foreignKey' => [
                    'action' => Relation::ACTION_CASCADE,
                ],
            ]
        );
    }

    /**
     * Find recording storage by original file path
     *
     * @param string $recordingfile Original recording path from CDR
     * @return RecordingStorage|null Found record or null
     */
    public static function findByPath(string $recordingfile): ?self
    {
        return self::findFirst([
            'conditions' => 'recordingfile = :path:',
            'bind' => ['path' => $recordingfile],
        ]);
    }

    /**
     * Check if recording is stored in S3
     *
     * @return bool True if file is in S3 bucket
     */
    public function isInS3(): bool
    {
        return $this->storage_location === 's3' && !empty($this->s3_key);
    }

    /**
     * Check if local file should be deleted (retention period expired)
     *
     * This method determines if a recording that was uploaded to S3
     * can be safely deleted from local disk based on the configured
     * local retention period (PBX_RECORD_S3_LOCAL_DAYS).
     *
     * @param int $localRetentionDays Number of days to keep locally after S3 upload
     * @return bool True if local file can be deleted
     */
    public function shouldDeleteLocal(int $localRetentionDays): bool
    {
        // Can't delete if not in S3 or upload time unknown
        if (!$this->isInS3() || empty($this->uploaded_at)) {
            return false;
        }

        $uploadTime = strtotime($this->uploaded_at);
        $expirationTime = $uploadTime + ($localRetentionDays * 86400);

        return time() > $expirationTime;
    }

    /**
     * Check if recording should be permanently deleted (total retention expired)
     *
     * Determines if recording should be deleted from S3 based on
     * total retention period (PBX_RECORD_SAVE_PERIOD).
     *
     * @param int $totalRetentionDays Total retention period in days
     * @return bool True if recording should be permanently deleted
     */
    public function shouldPermanentlyDelete(int $totalRetentionDays): bool
    {
        if (empty($this->uploaded_at)) {
            return false;
        }

        $uploadTime = strtotime($this->uploaded_at);
        $expirationTime = $uploadTime + ($totalRetentionDays * 86400);

        return time() > $expirationTime;
    }

    /**
     * Get recording age in days since upload
     *
     * @return float|null Age in days, or null if not uploaded
     */
    public function getAgeDays(): ?float
    {
        if (empty($this->uploaded_at)) {
            return null;
        }

        $uploadTime = strtotime($this->uploaded_at);
        return (time() - $uploadTime) / 86400;
    }
}
