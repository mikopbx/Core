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
 * Factory class for Firewall Rules test data
 */
class FirewallRulesDataFactory
{
    /**
     * Available rule types
     */
    public const RULE_TYPES = [
        'SIP', 'WEB', 'SSH', 'AMI', 'AJAM', 'ICMP'
    ];

    /**
     * Firewall rules data storage
     */
    private static array $rulesData = [
        'miko.network' => [
            'id' => 4,
            'description' => 'MikoNetwork',
            'ipv4_network' => '172.16.32.0',
            'ipv4_subnet' => 24,
            'local_network' => true,
            'newer_block_ip' => true,
            'rules' => [
                'SIP' => true,
                'WEB' => true,
                'SSH' => true,
                'AMI' => true,
                'AJAM' => true,
                'ICMP' => true,
            ],
        ],
        'nikolay.macbook' => [
            'id' => 5,
            'description' => 'Nikolay macbook',
            'ipv4_network' => '172.16.32.69',
            'ipv4_subnet' => 32,
            'local_network' => true,
            'newer_block_ip' => true,
            'rules' => [
                'SIP' => true,
                'WEB' => true,
                'SSH' => true,
                'AMI' => true,
                'AJAM' => true,
                'ICMP' => true,
            ],
        ],
        'miko.vpn' => [
            'id' => 6,
            'description' => 'MIKOVPN',
            'ipv4_network' => '172.16.34.0',
            'ipv4_subnet' => 24,
            'local_network' => true,
            'newer_block_ip' => true,
            'rules' => [
                'SIP' => true,
                'WEB' => false,
                'SSH' => false,
                'AMI' => false,
                'AJAM' => false,
                'ICMP' => true,
            ],
        ]
    ];

    public static function getRuleData(string $ruleKey): array
    {
        if (!isset(self::$rulesData[$ruleKey])) {
            throw new \RuntimeException("Firewall rule data not found for key: $ruleKey");
        }
        return self::$rulesData[$ruleKey];
    }

    public static function getAllRuleKeys(): array
    {
        return array_keys(self::$rulesData);
    }
}