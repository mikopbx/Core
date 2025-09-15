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

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Iax;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for copying a provider (SIP or IAX)
 *
 * This action creates a copy of an existing provider with:
 * - New unique ID generated automatically
 * - Name prefixed with "copy of"
 * - All settings copied
 * - Username suffixed with _copy to avoid conflicts
 *
 * @api {get} /pbxcore/api/v3/sip-providers/{id}:copy Copy SIP provider
 * @api {get} /pbxcore/api/v3/iax-providers/{id}:copy Copy IAX provider
 * @apiVersion 3.0.0
 * @apiName CopyRecord
 * @apiGroup Providers
 *
 * @apiParam {String} id Source provider ID to copy
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Copied provider data ready for creation
 * @apiSuccess {String} data.id Empty for new record
 * @apiSuccess {String} data.uniqid New unique identifier
 * @apiSuccess {String} data.provider_name Name prefixed with "copy of"
 * @apiSuccess {String} data.type Provider type (SIP/IAX)
 */
class CopyRecordAction
{
    /**
     * Copy provider record with new unique ID
     *
     * @param string $sourceId Source provider ID to copy
     * @param string|null $type Provider type filter (SIP/IAX), null for any
     * @return PBXApiResult
     */
    public static function main(string $sourceId, ?string $type = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Find source provider
            $sourceProvider = Providers::findFirst("uniqid='{$sourceId}'");

            if (!$sourceProvider) {
                $res->messages['error'][] = "Source provider not found: {$sourceId}";
                SystemMessages::sysLogMsg(__METHOD__,
                    "Source provider not found for copy: {$sourceId}",
                    LOG_WARNING
                );
                return $res;
            }

            // Check provider type if specified
            if ($type !== null && $sourceProvider->type !== strtoupper($type)) {
                $res->messages['error'][] = "Provider type mismatch: expected {$type}, got {$sourceProvider->type}";
                return $res;
            }

            // Create new provider model with copied values
            $newProvider = self::createCopyFromSource($sourceProvider);

            // Create data structure for the copied provider
            $res->data = DataStructure::createFromModel($newProvider);
            
            // Clear the ID field for new provider creation
            // The frontend should treat this as a new provider
            $res->data['id'] = '';
            
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__METHOD__,
                "Error copying provider: " . $e->getMessage(),
                LOG_ERR
            );
        }

        return $res;
    }

    /**
     * Create copy of Provider from source record
     *
     * @param Providers $sourceProvider
     * @return Providers
     */
    private static function createCopyFromSource(Providers $sourceProvider): Providers
    {
        $newProvider = new Providers();

        // Generate new identifiers
        $newProvider->id = null;
        $newProvider->uniqid = Providers::generateUniqueID($sourceProvider->type);

        // Copy all fields with modifications
        $newProvider->type = $sourceProvider->type;
        $newProvider->note = $sourceProvider->note;

        // Copy type-specific configuration
        if ($sourceProvider->type === 'SIP') {
            $sourceSip = Sip::findFirst("uniqid='{$sourceProvider->uniqid}'");
            if ($sourceSip) {
                $newSip = new Sip();

                // Copy all SIP settings
                $newSip->uniqid = $newProvider->uniqid;
                $newSip->disabled = $sourceSip->disabled;
                $newSip->description = 'copy of ' . ($sourceSip->description ?? '');
                $newSip->type = $sourceSip->type;
                $newSip->registration_type = $sourceSip->registration_type;
                $newSip->host = $sourceSip->host;
                $newSip->port = $sourceSip->port;
                $newSip->username = $sourceSip->username . '_copy'; // Add suffix to avoid conflicts
                $newSip->secret = $sourceSip->secret;
                $newSip->transport = $sourceSip->transport;
                $newSip->outbound_proxy = $sourceSip->outbound_proxy;
                $newSip->fromuser = $sourceSip->fromuser;
                $newSip->fromdomain = $sourceSip->fromdomain;
                $newSip->nat = $sourceSip->nat;
                $newSip->dtmfmode = $sourceSip->dtmfmode;
                $newSip->qualify = $sourceSip->qualify;
                $newSip->qualifyfreq = $sourceSip->qualifyfreq;
                $newSip->networkfilterid = $sourceSip->networkfilterid;
                $newSip->manualattributes = $sourceSip->manualattributes;
                $newSip->disablefromuser = $sourceSip->disablefromuser;
                $newSip->noregister = $sourceSip->noregister;
                $newSip->receive_calls_without_auth = $sourceSip->receive_calls_without_auth;
                $newSip->enableRecording = $sourceSip->enableRecording;
                
                // CallerID and DID source fields
                $newSip->cid_source = $sourceSip->cid_source;
                $newSip->cid_custom_header = $sourceSip->cid_custom_header;
                $newSip->cid_parser_start = $sourceSip->cid_parser_start;
                $newSip->cid_parser_end = $sourceSip->cid_parser_end;
                $newSip->cid_parser_regex = $sourceSip->cid_parser_regex;
                $newSip->did_source = $sourceSip->did_source;
                $newSip->did_custom_header = $sourceSip->did_custom_header;
                $newSip->did_parser_start = $sourceSip->did_parser_start;
                $newSip->did_parser_end = $sourceSip->did_parser_end;
                $newSip->did_parser_regex = $sourceSip->did_parser_regex;
                $newSip->cid_did_debug = $sourceSip->cid_did_debug;

                // Attach to provider model for DataStructure
                $newProvider->Sip = $newSip;
            }
        } elseif ($sourceProvider->type === 'IAX') {
            $sourceIax = Iax::findFirst("uniqid='{$sourceProvider->uniqid}'");
            if ($sourceIax) {
                $newIax = new Iax();

                // Copy all IAX settings
                $newIax->uniqid = $newProvider->uniqid;
                $newIax->disabled = $sourceIax->disabled;
                $newIax->description = 'copy of ' . ($sourceIax->description ?? '');
                $newIax->username = $sourceIax->username . '_copy'; // Add suffix to avoid conflicts
                $newIax->secret = $sourceIax->secret;
                $newIax->host = $sourceIax->host;
                $newIax->port = $sourceIax->port;
                $newIax->qualify = $sourceIax->qualify;
                $newIax->noregister = $sourceIax->noregister;
                $newIax->manualattributes = $sourceIax->manualattributes;
                $newIax->registration_type = $sourceIax->registration_type;
                $newIax->receive_calls_without_auth = $sourceIax->receive_calls_without_auth;
                $newIax->networkfilterid = $sourceIax->networkfilterid;

                // Attach to provider model for DataStructure
                $newProvider->Iax = $newIax;
            }
        }

        return $newProvider;
    }
}