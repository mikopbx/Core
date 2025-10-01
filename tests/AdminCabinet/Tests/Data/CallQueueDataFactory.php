<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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
 * Factory class for Call Queue test data
 */
class CallQueueDataFactory
{
    /**
     * Call Queue data storage
     * @var array
     */
    private static array $callQueueData = [
        'sales.department' => [
            'description' => 'Sales department queue, the first line of agents',
            'name' => 'Sales department',
            'uniqid' => 'QUEUE-AFDE5973B8115C2B9743C68BF51BFD26',
            'extension' => 20020,
            'seconds_to_ring_each_member' => 14,
            'seconds_for_wrapup' => 12,
            'recive_calls_while_on_a_call' => true,
            'caller_hear' => 'ringing',
            'announce_position' => true,
            'announce_hold_time' => false,
            'periodic_announce_sound_id' => '1',
            'periodic_announce_frequency' => 24,
            'timeout_to_redirect_to_extension' => 18,
            'timeout_extension' => '201',
            'redirect_to_extension_if_empty' => '202',
            'agents' => [
                '201',
                '202',
                '203',
            ],
            'strategy' => 'linear'
        ],
        'accountant.department' => [
            'description' => 'Accountant department queue, the second line of agents',
            'name' => 'Accountant department',
            'uniqid' => 'QUEUE-C02B7C0BBE8F0A48DE1CDF21DBADC25',
            'extension' => 20021,
            'seconds_to_ring_each_member' => 14,
            'seconds_for_wrapup' => 13,
            'recive_calls_while_on_a_call' => false,
            'caller_hear' => 'moh',
            'moh_sound_id' => '2',
            'announce_position' => false,
            'announce_hold_time' => true,
            'periodic_announce_sound_id' => '1',
            'periodic_announce_frequency' => 24,
            'timeout_to_redirect_to_extension' => 18,
            'timeout_extension' => '202',
            'redirect_to_extension_if_empty' => '201',
            'agents' => [
                '202',
                '203',
            ],
            'strategy' => 'leastrecent'
        ],
        'accountant.department.for.test.dropdown' => [
            'description' => 'Accountant department for test dropdown',
            'name' => 'Accountant department for test dropdown',
            'uniqid' => 'QUEUE-C02B7C0BBE8F0A48DE1CDF21DBADC29',
            'extension' => 20029,
            'seconds_to_ring_each_member' => 14,
            'seconds_for_wrapup' => 13,
            'recive_calls_while_on_a_call' => false,
            'caller_hear' => 'moh',
            'moh_sound_id' => '2',
            'announce_position' => false,
            'announce_hold_time' => true,
            'periodic_announce_sound_id' => '1',
            'periodic_announce_frequency' => 24,
            'timeout_to_redirect_to_extension' => 18,
            'timeout_extension' => '202',
            'redirect_to_extension_if_empty' => '201',
            'agents' => [
                '202',
                '203',
            ],
            'strategy' => 'leastrecent'
        ],
        'sales.department.to.change.extension' => [
            'description' => 'Sales department queue, the first line of agents2',
            'name' => 'Sales department2',
            'OldExtension' => 20020,
            'extension' => 20025,
            'seconds_to_ring_each_member' => 15,
            'seconds_for_wrapup' => 14,
            'recive_calls_while_on_a_call' => false,
            'caller_hear' => 'moh',
            'moh_sound_id' => '2',
            'announce_position' => false,
            'announce_hold_time' => true,
            'periodic_announce_sound_id' => '1',
            'periodic_announce_frequency' => 25,
            'timeout_to_redirect_to_extension' => 19,
            'timeout_extension' => '202',
            'redirect_to_extension_if_empty' => '201',
            'agents' => [
                '202',
                '203',
            ],
            'strategy' => 'random',
        ],
    ];

    public static function getCallQueueData(string $queueKey): array
    {
        if (!isset(self::$callQueueData[$queueKey])) {
            throw new \RuntimeException("Call Queue data not found for key: $queueKey");
        }
        return self::$callQueueData[$queueKey];
    }

    public static function getAllQueueKeys(): array
    {
        return array_keys(self::$callQueueData);
    }

    public static function getAllQueueData(): array
    {
        return self::$callQueueData;
    }
}