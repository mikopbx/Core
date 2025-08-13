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

/**
 * Action for getting provider record
 * 
 * @api {get} /pbxcore/api/v2/providers/getRecord/:id Get provider record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup Providers
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * @apiParam {String} [type] Provider type (SIP/IAX) for new records
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Provider data with type-specific configuration
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get provider record by ID or create new structure
     * 
     * @param string|null $id Provider ID, uniqid, or 'new' for new record
     * @param string $type Provider type for new records (SIP or IAX)
     * @return PBXApiResult
     */
    public static function main(?string $id = null, string $type = 'SIP'): PBXApiResult
    {
        $type = strtoupper($type);
        
        // Validate provider type
        if (!in_array($type, ['SIP', 'IAX'])) {
            $type = 'SIP';
        }
        
        // For new records, use a callback to set type-specific defaults
        $newRecordCallback = function($model) use ($type) {
            return self::applyProviderTypeDefaults($model, $type);
        };
        
        return self::executeStandardGetRecord(
            $id,
            Providers::class,
            DataStructure::class,
            $type . '-TRUNK-',
            [], // No base defaults - will be set by callback
            'api_ProviderNotFound',
            false, // Providers don't need extensions
            $newRecordCallback
        );
    }
    
    /**
     * Apply type-specific defaults to new provider model
     * 
     * @param mixed $model Provider model instance
     * @param string $type Provider type (SIP or IAX)
     * @return mixed Model with type-specific defaults applied
     */
    private static function applyProviderTypeDefaults($model, string $type)
    {
        // Set common provider fields
        $model->type = $type;
        $model->note = '';
        
        // Create model instances with defaults to use DataStructure
        if ($type === 'SIP') {
            $config = new Sip();
            $config->uniqid = $model->uniqid;
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
            $model->Sip = $config;
            $model->sipuid = $model->uniqid;
        } else {
            // IAX-specific defaults
            $config = new Iax();
            $config->uniqid = $model->uniqid;
            $config->disabled = '0';
            $config->username = '';
            $config->secret = '';
            $config->host = '';
            $config->qualify = '1';
            $config->registration_type = 'outbound';
            $config->description = '';
            $config->manualattributes = '';
            $config->noregister = '0';
            
            // Attach IAX config to provider
            $model->Iax = $config;
            $model->iaxuid = $model->uniqid;
        }
        
        return $model;
    }
}