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
 * Factory class for Outgoing Call Rules test data
 */
class OutgoingCallRulesDataFactory
{
    private static array $rulesData = [
        'local.calls' => [
            'rulename' => 'Local outgoing calls',
            'note' => 'Local outgoing calls',
            'numberbeginswith' => '(7|8)',
            'restnumbers' => '10',
            'trimfrombegin' => '1',
            'prepend' => '8',
            'providerid' => 'SIP-1683372701',
            'providerName' => '',
            'type' => 'Local',
            'description' => 'Rule for handling local landline calls'
        ],
        'international.calls' => [
            'rulename' => 'International outgoing calls',
            'note' => 'International outgoing calls',
            'numberbeginswith' => '00',
            'restnumbers' => '10',
            'trimfrombegin' => '2',
            'prepend' => '777',
            'providerid' => 'SIP-1683372701',
            'providerName' => '',
            'type' => 'International',
            'description' => 'Rule for handling international calls'
        ],
        'cti.test.1' => [
            'rulename' => 'Outgoing calls for CTI tests 1',
            'note' => '',
            'numberbeginswith' => '',
            'restnumbers' => '10',
            'trimfrombegin' => '0',
            'prepend' => '7',
            'providerid' => 'SIP-1683372744',
            'providerName' => 'Provider for CTI tests',
            'type' => 'Test',
            'description' => 'Basic CTI test rule'
        ],
        'cti.test.2' => [
            'rulename' => 'Outgoing calls for CTI tests 2',
            'note' => '1. The client calls in the company
2. The client hears a voice message
3. The client dials any extension which exists on PBX (201, 202, 203, 2001, 2002). This setup is called "Resolve extension dialing of any extension".
4. There is waiting of 7 seconds. 
5. The client dials digit 1 from the phone. The call goes to the sales department. (Call queue with extension 2001).
6. The client dials digit 2 from the phone. The call goes to the technical support department (Call queue with extension 2002).
7. The client gathers nothing or incorrectly dials the number. The repeated voice notification is lost. The client enters the number again. 
8. The maximum number of attempts of input of the number is equal to 5. Attempts come to an end. The call goes to the number by default.', 
            'numberbeginswith' => '(7|8)',
            'restnumbers' => '10',
            'trimfrombegin' => '0',
            'prepend' => '',
            'providerid' => 'SIP-1683372744',
            'providerName' => 'Provider for CTI tests',
            'type' => 'Test',
            'description' => 'Complex CTI test rule with IVR logic'
        ]
    ];

    public static function getRuleData(string $ruleKey): array
    {
        if (!isset(self::$rulesData[$ruleKey])) {
            throw new \RuntimeException("Outgoing call rule data not found for key: $ruleKey");
        }
        return self::$rulesData[$ruleKey];
    }

    public static function getAllRuleKeys(): array
    {
        return array_keys(self::$rulesData);
    }

    public static function getRulesByType(string $type): array
    {
        return array_filter(
            self::$rulesData,
            fn($data) => $data['type'] === $type
        );
    }
}