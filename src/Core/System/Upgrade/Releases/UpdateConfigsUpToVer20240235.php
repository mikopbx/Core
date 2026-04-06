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

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

/**
 * Migration to add CallerID and DID source fields to SIP providers
 */
class UpdateConfigsUpToVer20240235 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2024.2.35';

    private bool $isLiveCD;

    /**
     * Class constructor.
     */
    public function __construct()
    {
        $this->isLiveCD = file_exists('/offload/livecd');
    }

    /**
     * Main function
     */
    public function processUpdate(): void
    {
        if ($this->isLiveCD) {
            return;
        }

        $this->updateSipProvidersCallerIdDidSources();
    }

    /**
     * Add CallerID and DID source fields to existing SIP providers with default values
     * Only SIP provider records need these fields, not user extensions
     * 
     * @return void
     */
    private function updateSipProvidersCallerIdDidSources(): void
    {
        // Build query to find all SIP records that are providers using JOIN
        $parameters = [
            'models' => [
                'Sip' => Sip::class,
            ],
            'joins' => [
                'Providers' => [
                    0 => Providers::class,
                    1 => 'Providers.sipuid = Sip.uniqid AND Providers.type = "SIP"',
                    2 => 'Providers',
                    3 => 'INNER',
                ],
            ],
            'columns' => [
                'sipId' => 'Sip.id',
                'sipUniqid' => 'Sip.uniqid',
            ]
        ];

        $query = $this->di->get('modelsManager')->createBuilder($parameters)->getQuery();
        $sipProviderRecords = $query->execute()->toArray();

        // Update only provider SIP records
        foreach ($sipProviderRecords as $record) {
            $sipProvider = Sip::findFirst($record['sipId']);
            if (!$sipProvider) {
                continue;
            }

            $needsSave = false;

            // Set default CallerID source if not set
            if (empty($sipProvider->cid_source)) {
                $sipProvider->cid_source = Sip::CALLERID_SOURCE_DEFAULT;
                $needsSave = true;
            }

            // Set default DID source if not set
            if (empty($sipProvider->did_source)) {
                $sipProvider->did_source = Sip::DID_SOURCE_DEFAULT;
                $needsSave = true;
            }

            // Set debug mode to disabled if not set
            if (!isset($sipProvider->cid_did_debug) || $sipProvider->cid_did_debug === null) {
                $sipProvider->cid_did_debug = '0';
                $needsSave = true;
            }

            // Initialize empty strings for custom header fields
            $customFields = [
                'cid_custom_header',
                'cid_parser_start',
                'cid_parser_end',
                'cid_parser_regex',
                'did_custom_header',
                'did_parser_start',
                'did_parser_end',
                'did_parser_regex'
            ];

            foreach ($customFields as $field) {
                if (!isset($sipProvider->$field) || $sipProvider->$field === null) {
                    $sipProvider->$field = '';
                    $needsSave = true;
                }
            }

            if ($needsSave) {
                $sipProvider->save();
            }
        }

        // Note: We do NOT update SIP records for user extensions
        // as these CallerID/DID source fields are only relevant for providers/trunks
        // where incoming calls from external sources need header parsing
    }
}