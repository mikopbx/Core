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

use Phalcon\Filter\Validation;
use Phalcon\Filter\Validation\Validator\PresenceOf;

/**
 * StorageSettings - S3 storage configuration
 *
 * Stores S3-compatible storage credentials and settings.
 * Secret keys are encrypted using EncryptionService for security.
 *
 * Design Pattern: Singleton
 * - Only one settings record exists in database
 * - Use getSettings() to retrieve/create instance
 *
 * @property int $id                   Unique identifier for the storage settings record
 * @property int $s3_enabled           Enable S3 storage (0=disabled, 1=enabled)
 * @property string|null $s3_endpoint  S3 endpoint URL
 * @property string|null $s3_region    S3 region
 * @property string|null $s3_bucket    S3 bucket name
 * @property string|null $s3_access_key S3 access key
 * @property string|null $s3_secret_key S3 secret key (ENCRYPTED)
 */
class StorageSettings extends ModelsBase
{

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Enable S3 storage (0=disabled, 1=enabled)
     *
     * @Column(type="integer", nullable=false, default=0)
     */
    public int $s3_enabled = 0;

    /**
     * S3 endpoint URL
     * Examples:
     * - AWS: https://s3.amazonaws.com
     * - MinIO: http://minio:9000
     * - Wasabi: https://s3.wasabisys.com
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $s3_endpoint = null;

    /**
     * S3 region
     * Default: us-east-1
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $s3_region = 'us-east-1';

    /**
     * S3 bucket name for recordings
     * Example: mikopbx-recordings
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $s3_bucket = null;

    /**
     * S3 access key
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $s3_access_key = null;

    /**
     * S3 secret key (stored in plain text following MikoPBX patterns)
     * Use getSecretKey() to retrieve value
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $s3_secret_key = null;

    /**
     * Initialize model
     *
     * @return void
     */
    public function initialize(): void
    {
        $this->setSource('m_StorageSettings');
        parent::initialize();
    }

    /**
     * Get singleton settings record
     * Creates new record if doesn't exist
     *
     * @return StorageSettings Settings instance
     */
    public static function getSettings(): self
    {
        $settings = self::findFirst();

        if (!$settings) {
            $settings = new self();
            $settings->save();
        }

        return $settings;
    }

    /**
     * Get secret key for S3 client
     *
     * WHY: In MikoPBX, credentials (Sip::secret, Providers passwords) are stored
     *      in plain text. AWS SDK uses HTTPS for all API calls, providing
     *      transport-level encryption. Database-level encryption is not used
     *      following MikoPBX architecture patterns.
     *
     * @return string|null Secret key or null if not set
     */
    public function getSecretKey(): ?string
    {
        return $this->s3_secret_key ?? null;
    }

    /**
     * Test if S3 is configured and enabled
     *
     * @return bool True if S3 is ready to use
     */
    public function isS3Configured(): bool
    {
        return $this->s3_enabled === 1
            && !empty($this->s3_endpoint)
            && !empty($this->s3_bucket)
            && !empty($this->s3_access_key)
            && !empty($this->s3_secret_key);
    }

    /**
     * Perform validation on the model
     *
     * When S3 is enabled, validates that all required fields are present
     *
     * @return bool Whether the validation was successful or not
     */
    public function validation(): bool
    {
        $validation = new Validation();

        // If S3 enabled, all fields are required
        if ($this->s3_enabled === 1) {
            $validation->add(
                's3_endpoint',
                new PresenceOf([
                    'message' => 'S3 endpoint is required when S3 storage is enabled',
                ])
            );

            $validation->add(
                's3_bucket',
                new PresenceOf([
                    'message' => 'S3 bucket is required when S3 storage is enabled',
                ])
            );

            $validation->add(
                's3_access_key',
                new PresenceOf([
                    'message' => 'S3 access key is required when S3 storage is enabled',
                ])
            );

            $validation->add(
                's3_secret_key',
                new PresenceOf([
                    'message' => 'S3 secret key is required when S3 storage is enabled',
                ])
            );
        }

        return $this->validate($validation);
    }
}
