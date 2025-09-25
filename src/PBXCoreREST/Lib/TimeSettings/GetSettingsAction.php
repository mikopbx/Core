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

use DateTime;
use DateTimeZone;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\Common\FieldTypeResolver;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Get Time Settings action
 *
 * Retrieves the current time settings configuration
 *
 * @package MikoPBX\PBXCoreREST\Lib\TimeSettings
 */
class GetSettingsAction
{
    /**
     * Get current time settings
     *
     * @return PBXApiResult The API response with settings data
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->success = false;

        try {
            $settings = [];

            // Get settings from database
            $parameters = [
                'key IN ({ids:array})',
                'bind' => ['ids' => self::getTimeSettingsKeys()],
            ];

            /** @var \Phalcon\Mvc\Model\Resultset\Simple<PbxSettings> $timeSettingsFields */
            $timeSettingsFields = PbxSettings::find($parameters);

            foreach ($timeSettingsFields as $field) {
                // Use FieldTypeResolver to convert values to proper types
                $value = FieldTypeResolver::convertToApiFormat($field->value, PbxSettings::class, $field->key);

                switch ($field->key) {
                    case PbxSettings::PBX_TIMEZONE:
                        $settings['PBXTimezone'] = $value;
                        // Add representation for timezone dropdown
                        if (!empty($value)) {
                            $settings['PBXTimezone_represent'] = self::getTimezoneRepresentation($value);
                        }
                        break;
                    case PbxSettings::NTP_SERVER:
                        $settings['NTPServer'] = $value;
                        break;
                    case PbxSettings::PBX_MANUAL_TIME_SETTINGS:
                        $settings['PBXManualTimeSettings'] = $value; // Will be boolean now
                        break;
                }
            }

            // Set default values if not found
            $settings['PBXTimezone'] = $settings['PBXTimezone'] ?? '';
            $settings['NTPServer'] = $settings['NTPServer'] ?? '';
            $settings['PBXManualTimeSettings'] = $settings['PBXManualTimeSettings'] ?? false;
            $settings['ManualDateTime'] = '';

            // Add timezone representation if not already set
            if (!empty($settings['PBXTimezone']) && !isset($settings['PBXTimezone_represent'])) {
                $settings['PBXTimezone_represent'] = self::getTimezoneRepresentation($settings['PBXTimezone']);
            }

            // Get current system time
            $settings['CurrentDateTime'] = date('Y-m-d H:i:s');

            $res->data = $settings;
            $res->success = true;
        } catch (\Exception $e) {
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
     * Generate an array of time zones with formatted offsets
     *
     * @return array<string, string> Array of time zones with labels
     */
    private static function getTimezoneList(): array
    {
        static $regions = [
            DateTimeZone::AFRICA,
            DateTimeZone::AMERICA,
            DateTimeZone::ANTARCTICA,
            DateTimeZone::ASIA,
            DateTimeZone::ATLANTIC,
            DateTimeZone::AUSTRALIA,
            DateTimeZone::EUROPE,
            DateTimeZone::INDIAN,
            DateTimeZone::PACIFIC,
        ];

        $timezones = [];
        foreach ($regions as $region) {
            $timezones[] = DateTimeZone::listIdentifiers($region);
        }
        $timezones = array_merge(...$timezones);

        $timezone_offsets = [];
        foreach ($timezones as $timezone) {
            try {
                $tz = new DateTimeZone($timezone);
                $timezone_offsets[$timezone] = $tz->getOffset(new DateTime());
            } catch (\Exception $e) {
                continue;
            }
        }

        // Sort timezone by offset
        asort($timezone_offsets);

        $timezone_list = [];
        foreach ($timezone_offsets as $timezone => $offset) {
            $offset_prefix = $offset < 0 ? '-' : '+';
            $absOffset = (int)abs($offset);
            $offset_formatted = gmdate('H:i', $absOffset);
            $pretty_offset = "UTC$offset_prefix$offset_formatted";
            $timezone_list[$timezone] = "$timezone ($pretty_offset)";
        }

        return $timezone_list;
    }

    /**
     * Get timezone representation for a specific timezone
     *
     * @param string $timezone Timezone identifier (e.g., 'America/New_York')
     * @return string Formatted timezone representation (e.g., 'America/New_York (UTC-05:00)')
     */
    private static function getTimezoneRepresentation(string $timezone): string
    {
        if (empty($timezone)) {
            return '';
        }

        try {
            $tz = new DateTimeZone($timezone);
            $offset = $tz->getOffset(new DateTime());
            $offset_prefix = $offset < 0 ? '-' : '+';
            $absOffset = (int)abs($offset);
            $offset_formatted = gmdate('H:i', $absOffset);
            $pretty_offset = "UTC$offset_prefix$offset_formatted";

            return "$timezone ($pretty_offset)";
        } catch (\Exception $e) {
            return $timezone;
        }
    }
}