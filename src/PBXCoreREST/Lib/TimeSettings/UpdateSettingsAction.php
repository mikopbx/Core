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

namespace MikoPBX\PBXCoreREST\Lib\TimeSettings;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\TimeSettings\DataStructure;
use Phalcon\Di\Di;

/**
 * Update Time Settings action
 *
 * Updates the time settings configuration (full or partial)
 *
 * @package MikoPBX\PBXCoreREST\Lib\TimeSettings
 */
class UpdateSettingsAction
{
    /**
     * Update time settings
     *
     * @param array<string, mixed> $data The settings data to update
     * @param bool $isPatch Whether this is a partial update (PATCH) or full update (PUT)
     * @return PBXApiResult The API response with operation result
     */
    public static function main(array $data, bool $isPatch = false): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->success = false;

        try {
            $di = Di::getDefault();
            $db = $di->getShared('db');

            $db->begin();

            // Get the list of allowed settings keys
            $allowedKeys = self::getTimeSettingsKeys();

            // If PUT (not patch), validate all required fields are present
            if (!$isPatch) {
                foreach ($allowedKeys as $key) {
                    if (!isset($data[$key]) && $key !== PbxSettings::PBX_MANUAL_TIME_SETTINGS) {
                        $res->messages['error'][] = "Missing required field: $key";
                        return $res;
                    }
                }
            }

            // Process each setting
            foreach ($allowedKeys as $key) {
                // For PATCH, skip if not provided
                if ($isPatch && !isset($data[$key])) {
                    continue;
                }

                $record = PbxSettings::findFirstByKey($key);
                if ($record === null) {
                    $record = new PbxSettings();
                    $record->key = $key;
                }

                switch ($key) {
                    case PbxSettings::PBX_MANUAL_TIME_SETTINGS:
                        // Convert API format (boolean) to storage format (string)
                        if (isset($data[$key])) {
                            $record->value = DataStructure::convertValueForStorage($key, $data[$key]);
                        }
                        break;

                    case PbxSettings::NTP_SERVER:
                        // Process NTP servers (split by various delimiters)
                        if (isset($data[$key])) {
                            $ntp_servers = preg_split('/\r\n|\r|\n| |,/', $data[$key]);
                            if (is_array($ntp_servers)) {
                                $record->value = implode(PHP_EOL, array_filter($ntp_servers));
                            }
                        }
                        break;

                    case PbxSettings::PBX_TIMEZONE:
                        // Validate timezone
                        if (isset($data[$key])) {
                            $timezones = timezone_identifiers_list();
                            if (!in_array($data[$key], $timezones)) {
                                $res->messages['error'][] = "Invalid timezone: {$data[$key]}";
                                $db->rollback();
                                return $res;
                            }
                            $record->value = $data[$key];
                        }
                        break;

                    default:
                        if (isset($data[$key])) {
                            $record->value = $data[$key];
                        }
                }

                if ($record->save() === false) {
                    $errors = $record->getMessages();
                    foreach ($errors as $error) {
                        $res->messages['error'][] = $error->getMessage();
                    }
                    $db->rollback();
                    return $res;
                }
            }

            // Handle manual date/time setting if provided
            if (isset($data['ManualDateTime']) && !empty($data['ManualDateTime'])) {
                // Check if manual time is enabled (expecting boolean from API)
                $manualTimeEnabled = isset($data[PbxSettings::PBX_MANUAL_TIME_SETTINGS])
                    ? (bool)$data[PbxSettings::PBX_MANUAL_TIME_SETTINGS]
                    : false;

                if ($manualTimeEnabled) {
                    // Update system time
                    self::updateSystemTime($data['ManualDateTime'], $data['userTimeZone'] ?? null);
                }
            }

            $db->commit();

            // Trigger configuration reload
            self::triggerConfigurationReload();

            $res->success = true;
            $res->data = ['message' => 'Time settings updated successfully'];

        } catch (\Exception $e) {
            if (isset($db) && $db->isUnderTransaction()) {
                $db->rollback();
            }
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }

    /**
     * Get the array of time settings keys
     *
     * @return array<string> Array of time settings keys
     */
    private static function getTimeSettingsKeys(): array
    {
        return [
            PbxSettings::PBX_TIMEZONE,
            PbxSettings::NTP_SERVER,
            PbxSettings::PBX_MANUAL_TIME_SETTINGS,
        ];
    }

    /**
     * Update system time
     *
     * @param string $dateTime The date/time string to set
     * @param string|null $userTimeZone The user's timezone
     */
    private static function updateSystemTime(string $dateTime, ?string $userTimeZone): void
    {
        // Convert to timestamp
        $timestamp = strtotime($dateTime);
        if ($timestamp === false) {
            throw new \Exception("Invalid date/time format: $dateTime");
        }

        // Execute system time update
        $command = "date -s '@{$timestamp}'";
        Processes::mwExec($command);

        // Sync hardware clock
        Processes::mwExec('/sbin/hwclock -w');
    }

    /**
     * Trigger configuration reload
     */
    private static function triggerConfigurationReload(): void
    {
        $di = Di::getDefault();

        // Send reload event to workers
        try {
            $queue = new BeanstalkClient();
            $queue->publish(json_encode(['action' => 'reload', 'module' => 'TimeSettings']));
        } catch (\Exception $e) {
            // Log but don't fail the request
            SystemMessages::sysLogMsg(__CLASS__, "Failed to trigger config reload: " . $e->getMessage(), LOG_WARNING);
        }
    }
}