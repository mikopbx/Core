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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Action for getting provider record with copy support
 * 
 * @api {get} /pbxcore/api/v2/providers/getRecord/:id Get provider record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup Providers
 * 
 * @apiParam {String} [id] Record ID, "new" for new record structure, or "copy-{id}" for copy mode
 * @apiParam {String} [type] Provider type (SIP/IAX) for new records
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Provider data with type-specific configuration
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.type Provider type (SIP/IAX)
 * @apiSuccess {String} data.note Provider description
 * @apiSuccess {Object} data.sipConfig SIP configuration (if SIP provider)
 * @apiSuccess {Object} data.iaxConfig IAX configuration (if IAX provider)
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get provider record
     *
     * @param string|null $id Provider ID or "new"
     * @param string $type Provider type for new records (SIP or IAX)
     * @return PBXApiResult
     */
    public static function main(?string $id = null, string $type = 'SIP'): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $type = strtoupper($type);

        // Validate provider type
        if (!in_array($type, ['SIP', 'IAX'])) {
            $type = 'SIP';
        }

        $isNew = empty($id) || $id === 'new';

        if ($isNew) {
            // Create structure for new record with default values
            $newProvider = self::createNewRecord($type);
            $res->data = DataStructure::createFromModel($newProvider);
            
            // Clear the ID field for new providers
            // The frontend should treat this as a new provider (POST request)
            $res->data['id'] = '';
            
            $res->success = true;
        } else {
            // Find existing record
            $provider = self::findRecordById(Providers::class, $id);

            if ($provider) {
                $res->data = DataStructure::createFromModel($provider);
                $res->success = true;
            } else {
                $res->messages['error'][] = 'Provider not found';
            }
        }

        return $res;
    }
    
    /**
     * Create new provider record with default values
     * 
     * @param string $type Provider type (SIP or IAX)
     * @return Providers
     */
    private static function createNewRecord(string $type): Providers
    {
        $newProvider = new Providers();
        $newProvider->id = '';
        $newProvider->uniqid = ''; // Will be generated on actual creation
        $newProvider->type = $type;
        $newProvider->note = '';
        
        // Create model instances with defaults to use DataStructure
        if ($type === 'SIP') {
            $config = new Sip();
            $config->uniqid = ''; // No ID for new providers
            $config->disabled = '0';
            $config->username = '';
            $config->secret = '';
            $config->host = '';
            $config->port = '5060';
            $config->transport = 'UDP';
            $config->type = 'friend';
            $config->qualify = '1';
            $config->qualifyfreq = 60;
            $config->registration_type = 'outbound';
            $config->extension = '';
            $config->description = '';
            $config->networkfilterid = 'none';
            // Get proper representation for 'none' value
            $config->networkfilter_represent = AbstractDataStructure::getNetworkFilterRepresentation('none');
            $config->manualattributes = '';
            $config->dtmfmode = 'auto';
            $config->nat = 'auto_force';
            $config->fromuser = '';
            $config->fromdomain = '';
            $config->outbound_proxy = '';
            $config->disablefromuser = '0';
            $config->noregister = '0';
            $config->receive_calls_without_auth = '0';
            
            // CallerID and DID source defaults
            $config->cid_source = Sip::CALLERID_SOURCE_DEFAULT;
            $config->cid_custom_header = '';
            $config->cid_parser_start = '';
            $config->cid_parser_end = '';
            $config->cid_parser_regex = '';
            $config->did_source = Sip::DID_SOURCE_DEFAULT;
            $config->did_custom_header = '';
            $config->did_parser_start = '';
            $config->did_parser_end = '';
            $config->did_parser_regex = '';
            $config->cid_did_debug = '0';
            
            // Attach SIP config to provider
            $newProvider->Sip = $config;
            $newProvider->sipuid = ''; // No ID for new providers
        } else {
            // IAX-specific defaults
            $config = new Iax();
            $config->uniqid = ''; // No ID for new providers
            $config->disabled = '0';
            $config->username = '';
            $config->secret = '';
            $config->host = '';
            $config->port = '4569'; // Default IAX port
            $config->qualify = '1';
            $config->registration_type = 'outbound';
            $config->description = '';
            $config->networkfilterid = 'none';
            // Get proper representation for 'none' value
            $config->networkfilter_represent = AbstractDataStructure::getNetworkFilterRepresentation('none');
            $config->manualattributes = '';
            $config->noregister = '0';
            $config->receive_calls_without_auth = '0';
            
            // Attach IAX config to provider
            $newProvider->Iax = $config;
            $newProvider->iaxuid = ''; // No ID for new providers
        }
        
        return $newProvider;
    }
    
}