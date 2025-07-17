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

namespace MikoPBX\Tests\AdminCabinet\Tests\Data;

/**
 * Factory class for Conference Rooms test data
 */
class ConferenceRoomsDataFactory
{
    /**
     * Conference rooms data storage
     * @var array
     */
    private static array $conferenceRoomsData = [
        'sales.conference' => [
            'name' => 'Sales Team Conference',
            'extension' => '400',
            'pinCode' => '1234',
            'uniqid' => 'CONF-SALES-001',
            'description' => 'Weekly sales team meetings',
        ],
        'management.conference' => [
            'name' => 'Management Conference',
            'extension' => '401',
            'pinCode' => '5678',
            'uniqid' => 'CONF-MGMT-001',
            'description' => 'Executive management meetings with PIN protection',
        ],
        'support.conference' => [
            'name' => 'Support Team Conference',
            'extension' => '402',
            'pinCode' => '',
            'uniqid' => 'CONF-SUPPORT-001',
            'description' => 'Daily support team standup without PIN',
        ],
        'all.hands.conference' => [
            'name' => 'All Hands Meeting',
            'extension' => '403',
            'pinCode' => '9999',
            'uniqid' => 'CONF-ALLHANDS-001',
            'description' => 'Company-wide all hands meetings',
        ],
        'training.conference' => [
            'name' => 'Training Room',
            'extension' => '404',
            'pinCode' => '0000',
            'uniqid' => 'CONF-TRAIN-001',
            'description' => 'Virtual training sessions',
        ],
        'project.alpha.conference' => [
            'name' => 'Project Alpha Room',
            'extension' => '405',
            'pinCode' => '4321',
            'uniqid' => 'CONF-ALPHA-001',
            'description' => 'Project Alpha team meetings',
        ],
        'emergency.conference' => [
            'name' => 'Emergency Response',
            'extension' => '911',
            'pinCode' => '9111',
            'uniqid' => 'CONF-EMRG-001',
            'description' => 'Emergency response coordination',
        ],
        'partner.conference' => [
            'name' => 'Partner Conference',
            'extension' => '406',
            'pinCode' => '2468',
            'uniqid' => 'CONF-PARTNER-001',
            'description' => 'External partner meetings',
        ],
        'tech.conference' => [
            'name' => 'Tech Team Conference',
            'extension' => '407',
            'pinCode' => '',
            'uniqid' => 'CONF-TECH-001',
            'description' => 'Technical team discussions',
        ],
        'board.conference' => [
            'name' => 'Board Room',
            'extension' => '999',
            'pinCode' => '9876',
            'uniqid' => 'CONF-BOARD-001',
            'description' => 'Board of directors meetings',
        ],
    ];

    /**
     * Get conference room data by key
     *
     * @param string $conferenceKey Conference room identifier
     * @return array Conference room data
     * @throws \RuntimeException If conference room data not found
     */
    public static function getConferenceRoomData(string $conferenceKey): array
    {
        if (!isset(self::$conferenceRoomsData[$conferenceKey])) {
            throw new \RuntimeException("Conference room data not found for key: $conferenceKey");
        }
        return self::$conferenceRoomsData[$conferenceKey];
    }

    /**
     * Get all conference room keys
     *
     * @return array List of conference room keys
     */
    public static function getAllConferenceKeys(): array
    {
        return array_keys(self::$conferenceRoomsData);
    }

    /**
     * Get all conference rooms data
     *
     * @return array All conference rooms data
     */
    public static function getAllConferenceData(): array
    {
        return self::$conferenceRoomsData;
    }

    /**
     * Get conference rooms filtered by criteria
     *
     * @param array $criteria Filter criteria (e.g., ['pinCode' => ''])
     * @return array Filtered conference rooms
     */
    public static function getConferencesByCriteria(array $criteria): array
    {
        $filtered = [];
        foreach (self::$conferenceRoomsData as $key => $data) {
            $match = true;
            foreach ($criteria as $field => $value) {
                if (!isset($data[$field]) || $data[$field] !== $value) {
                    $match = false;
                    break;
                }
            }
            if ($match) {
                $filtered[$key] = $data;
            }
        }
        return $filtered;
    }

    /**
     * Get conference rooms without PIN
     *
     * @return array Conference rooms without PIN protection
     */
    public static function getConferencesWithoutPin(): array
    {
        return self::getConferencesByCriteria(['pinCode' => '']);
    }

    /**
     * Get conference rooms with PIN
     *
     * @return array Conference rooms with PIN protection
     */
    public static function getConferencesWithPin(): array
    {
        $filtered = [];
        foreach (self::$conferenceRoomsData as $key => $data) {
            if (!empty($data['pinCode'])) {
                $filtered[$key] = $data;
            }
        }
        return $filtered;
    }
}