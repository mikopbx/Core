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
 * Factory class for SIP provider test data
 */
class SIPProviderDataFactory
{
    /**
     * SIP provider data storage
     * @var array
     */
    private static array $sipProviderData = [
        'pctel' => [
            'type' => 'sip',
            'uniqid' => 'SIP-1683372701',
            'registration_type' => 'outbound',
            'description' => 'PCTEL',
            'host' => 'pctel.ru',
            'username' => 'pctel',
            'password' => 'asdfasdfas',
            'dtmfmode' => 'auto',
            'port' => 5062,
            'qualify' => false,
            'qualifyfreq' => 62,
            'outbound_proxy' => 'proxy.miko.ru:5080',
            'fromuser' => 'testFromUser',
            'fromdomain' => 'TestFromDomain',
            'disablefromuser' => false,
            'manualattributes' => '',
            // New DID and CallerID fields
            'did_source' => 'default',
            'did_custom_header' => '',
            'did_parser_start' => '',
            'did_parser_end' => '',
            'did_parser_regex' => '',
            'callerid_source' => 'default',
            'cid_custom_header' => '',
            'cid_parser_start' => '',
            'cid_parser_end' => '',
            'cid_parser_regex' => '',
            'cid_did_debug' => false,
        ],
        'mango.office' => [
            'type' => 'sip',
            'uniqid' => 'SIP-1683372722',
            'registration_type' => 'inbound',
            'description' => 'Mango office',
            'host' => 'mango.office.ru',
            'username' => 'mango',
            'password' => 'office',
            'dtmfmode' => 'inband',
            'port' => 5061,
            'qualify' => true,
            'qualifyfreq' => 61,
            'outbound_proxy' => 'proxy2.miko.ru',
            'disablefromuser' => true,
            'fromuser' => '',
            'fromdomain' => '',
            'manualattributes' => '',
            // New DID and CallerID fields - testing To: header option
            'did_source' => 'to',
            'did_custom_header' => '',
            'did_parser_start' => '',
            'did_parser_end' => '',
            'did_parser_regex' => '',
            'callerid_source' => 'from',
            'cid_custom_header' => '',
            'cid_parser_start' => '',
            'cid_parser_end' => '',
            'cid_parser_regex' => '',
            'cid_did_debug' => false,
        ],
        'cti.provider' => [
            'type' => 'sip',
            'uniqid' => 'SIP-1683372744',
            'registration_type' => 'outbound',
            'description' => 'Provider for CTI tests',
            'host' => '127.0.0.1',
            'username' => 'test',
            'password' => 'test567',
            'dtmfmode' => 'auto',
            'port' => 5062,
            'qualify' => false,
            'qualifyfreq' => '',
            'outbound_proxy' => '',
            'disablefromuser' => true,
            'fromuser' => '',
            'fromdomain' => 'miko.ru',
            'manualattributes' => '[endpoint]' . PHP_EOL . 'callerid=Mark Spenser <79261234567>',
            // New DID and CallerID fields - testing custom header parsing
            'did_source' => 'custom',
            'did_custom_header' => 'X-DID-Number',
            'did_parser_start' => '[',
            'did_parser_end' => ']',
            'did_parser_regex' => '(?<=DID=)\\+?\\d+',
            'callerid_source' => 'custom',
            'cid_custom_header' => 'X-Caller-ID',
            'cid_parser_start' => '<',
            'cid_parser_end' => '>',
            'cid_parser_regex' => '\\+?\\d+',
            'cid_did_debug' => true,
        ],
        'provider.delete' => [
            'type' => 'sip',
            'uniqid' => 'SIP-1683372748',
            'registration_type' => 'none',
            'description' => 'Provider for delete',
            'host' => 'provider1.office.ru',
            'username' => 'provider1',
            'password' => 'office2',
            'dtmfmode' => 'inband',
            'port' => 5063,
            'qualify' => true,
            'qualifyfreq' => 63,
            'outbound_proxy' => '',
            'disablefromuser' => true,
            'fromuser' => '',
            'fromdomain' => '',
            'manualattributes' => '',
            // New DID and CallerID fields - default configuration
            'did_source' => 'default',
            'did_custom_header' => '',
            'did_parser_start' => '',
            'did_parser_end' => '',
            'did_parser_regex' => '',
            'callerid_source' => 'default',
            'cid_custom_header' => '',
            'cid_parser_start' => '',
            'cid_parser_end' => '',
            'cid_parser_regex' => '',
            'cid_did_debug' => false,
            'possibleToDelete' => true
        ],
    ];

    public static function getSIPProviderData(string $providerKey): array
    {
        if (!isset(self::$sipProviderData[$providerKey])) {
            throw new \RuntimeException("SIP provider data not found for key: $providerKey");
        }
        return self::$sipProviderData[$providerKey];
    }

    public static function getAllProviderKeys(): array
    {
        return array_keys(self::$sipProviderData);
    }

    public static function getAllProviderData(): array
    {
        return self::$sipProviderData;
    }
}
