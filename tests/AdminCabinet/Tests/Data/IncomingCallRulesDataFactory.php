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
 * Factory class for Incoming Call Rules test data
 */
class IncomingCallRulesDataFactory
{
    /**
     * Incoming call rules data storage
     */
    private static array $rulesData = [
        'first.rule' => [
            'rulename' => 'First rule rulename',
            'note' => 'First rule note',
            'provider' => 'none',
            'providerName' => '',
            'number' => '74952293042',
            'extension' => '201',
            'timeout' => '14',
            'description' => 'Basic incoming call rule without provider'
        ],
        'second.rule' => [
            'rulename' => 'Second rule',
            'note' => 'Second rule',
            'provider' => 'SIP-1683372701',
            'providerName' => '',
            'number' => '74952293043',
            'extension' => '202',
            'timeout' => '16',
            'description' => 'Rule with SIP provider'
        ],
        'test.provider.rule' => [
            'rulename' => 'Rule for test provider',
            'note' => '1. The client calls in the company
2. The client hears a voice message
3. The client dials any extension which exists on PBX (201, 202, 203, 2001, 2002). This setup is called "Resolve extension dialing of any extension".
4. There is waiting of 7 seconds. 
5. The client dials digit 1 from phone. The call goes to sales department. (Call queue with extension 2001).
6. The client dials digit 2 from phone. The call goes to technical support department (Call queue with extension 2002).
7. The client gathers nothing or incorrectly dials number. The repeated voice notification is lost. The client enters number again. 
8. The maximum number of attempts of input of number is equal to 5. Attempts come to the end. The call goes to number by default.',
            'provider' => 'SIP-TRUNK-1683372744',
            'providerName' => 'Provider for CTI tests',
            'number' => '',
            'extension' => '202',
            'timeout' => '50',
            'description' => 'Complex routing rule with IVR logic'
        ]
    ];

    public static function getRuleData(string $ruleKey): array
    {
        if (!isset(self::$rulesData[$ruleKey])) {
            throw new \RuntimeException("Incoming call rule data not found for key: $ruleKey");
        }
        return self::$rulesData[$ruleKey];
    }

    public static function getAllRuleKeys(): array
    {
        return array_keys(self::$rulesData);
    }
}