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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * RecordingStorageDatabaseProvider
 *
 * Provides SQLite connection for RecordingStorage database.
 * This database tracks recording file locations (local vs S3) separately
 * from the main configuration database to reduce its size.
 *
 * Database location: /storage/usbdisk1/mikopbx/astlogs/asterisk/recording_storage.db
 *
 * @package MikoPBX\Common\Providers
 */
class RecordingStorageDatabaseProvider extends DatabaseProviderBase implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'dbRecordingStorage';

    /**
     * Register dbRecordingStorage service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $dbConfig = $di->getShared(ConfigProvider::SERVICE_NAME)->get('recordingStorageDatabase')->toArray();
        $this->registerDBService(self::SERVICE_NAME, $di, $dbConfig);
    }
}
