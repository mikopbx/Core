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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Get Available Timezones Action
 *
 * Returns list of available timezones for selection dropdown
 * Separated from main settings to improve performance - only loaded when needed
 */
class GetAvailableTimezonesAction
{
    /**
     * Get available timezones
     *
     * @param array<string, mixed> $data Request data containing optional 'query' parameter for filtering
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $query = $data['query'] ?? '';
            $timezones = self::getTimezoneList($query);

            if (!empty($timezones)) {
                $res->data = $timezones;
                $res->success = true;
            } else {
                $res->messages['error'][] = 'No timezones available';
            }
        } catch (\Throwable $e) {
            $res->messages['error'][] = "Failed to get timezones: " . $e->getMessage();
        }

        return $res;
    }

    /**
     * Generate an array of time zones with formatted offsets
     * Same logic as in GetSettingsAction but separated for performance
     *
     * @param string $query Optional search query to filter timezones
     * @return array<string, string> Array of time zones with labels
     */
    private static function getTimezoneList(string $query = ''): array
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

        // Filter timezones if query is provided
        if (!empty($query)) {
            $filtered_list = [];
            $queryLower = strtolower($query);

            foreach ($timezone_list as $timezone => $label) {
                // Search in both timezone name and label (case-insensitive)
                if (stripos($timezone, $query) !== false || stripos($label, $query) !== false) {
                    $filtered_list[$timezone] = $label;
                }
            }

            return $filtered_list;
        }

        return $timezone_list;
    }
}