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
     * Get provider record with copy support
     * 
     * @param string|null $id Provider ID, "new", or "copy-{sourceId}"
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

        // Check for copy mode
        $copyMode = false;
        $sourceId = '';
        if (!empty($id) && strpos($id, 'copy-') === 0) {
            $copyMode = true;
            $sourceId = substr($id, 5); // Remove 'copy-' prefix
        }

        $isNew = empty($id) || $id === 'new' || $copyMode;

        if ($isNew) {
            if ($copyMode && !empty($sourceId)) {
                // Copy mode - load source record and modify it
                $sourceProvider = self::findRecordById(Providers::class, $sourceId);
                
                if ($sourceProvider) {
                    // Create copy of the source provider
                    $newProvider = self::createCopyFromSource($sourceProvider);
                    
                    $res->data = DataStructure::createFromModel($newProvider);
                    $res->success = true;

                    // Log the copy operation (省略日志代码)
                } else {
                    // Fallback to new record if source not found
                    $newProvider = self::createNewRecord($type);
                    $res->data = DataStructure::createFromModel($newProvider);
                    $res->success = true;
                }
            } else {
                // Create structure for new record with default values
                $newProvider = self::createNewRecord($type);
                $res->data = DataStructure::createFromModel($newProvider);
                $res->success = true;
            }
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

        // Always add isNew field for form population
        if ($res->success) {
            $res->data['isNew'] = $isNew ? '1' : '0';
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
        $newProvider->uniqid = Providers::generateUniqueID($type . '-TRUNK-');
        $newProvider->type = $type;
        $newProvider->note = '';
        
        // Create model instances with defaults to use DataStructure
        if ($type === 'SIP') {
            $config = new Sip();
            $config->uniqid = $newProvider->uniqid;
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
            $newProvider->sipuid = $newProvider->uniqid;
        } else {
            // IAX-specific defaults
            $config = new Iax();
            $config->uniqid = $newProvider->uniqid;
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
            $newProvider->iaxuid = $newProvider->uniqid;
        }
        
        return $newProvider;
    }
    
    /**
     * Create copy of provider from source record
     * 
     * @param Providers $sourceProvider
     * @return Providers
     */
    private static function createCopyFromSource(Providers $sourceProvider): Providers
    {
        $newProvider = new Providers();
        
        // Clear identifiers
        $newProvider->id = '';
        $newProvider->uniqid = Providers::generateUniqueID($sourceProvider->type . '-TRUNK-');
        
        // Copy provider fields
        $newProvider->type = $sourceProvider->type;
        $newProvider->note = $sourceProvider->note;
        
        if ($sourceProvider->type === 'SIP' && $sourceProvider->Sip) {
            // Copy SIP configuration
            $config = new Sip();
            $sourceConfig = $sourceProvider->Sip;
            
            $config->uniqid = $newProvider->uniqid;
            $config->disabled = $sourceConfig->disabled;
            $config->username = $sourceConfig->username;
            $config->secret = $sourceConfig->secret; // Note: password will be copied
            $config->host = $sourceConfig->host;
            $config->port = $sourceConfig->port;
            $config->transport = $sourceConfig->transport;
            $config->type = $sourceConfig->type;
            $config->qualify = $sourceConfig->qualify;
            $config->qualifyfreq = $sourceConfig->qualifyfreq;
            $config->registration_type = $sourceConfig->registration_type;
            $config->extension = $sourceConfig->extension;
            $config->description = 'copy of ' . $sourceConfig->description;
            $config->networkfilterid = $sourceConfig->networkfilterid;
            $config->networkfilter_represent = $sourceConfig->networkfilter_represent ?? AbstractDataStructure::getNetworkFilterRepresentation($sourceConfig->networkfilterid);
            $config->manualattributes = $sourceConfig->manualattributes;
            $config->dtmfmode = $sourceConfig->dtmfmode;
            $config->nat = $sourceConfig->nat;
            $config->fromuser = $sourceConfig->fromuser;
            $config->fromdomain = $sourceConfig->fromdomain;
            $config->outbound_proxy = $sourceConfig->outbound_proxy;
            $config->disablefromuser = $sourceConfig->disablefromuser;
            $config->noregister = $sourceConfig->noregister;
            $config->receive_calls_without_auth = $sourceConfig->receive_calls_without_auth;
            
            // Copy CallerID and DID source settings
            $config->cid_source = $sourceConfig->cid_source;
            $config->cid_custom_header = $sourceConfig->cid_custom_header;
            $config->cid_parser_start = $sourceConfig->cid_parser_start;
            $config->cid_parser_end = $sourceConfig->cid_parser_end;
            $config->cid_parser_regex = $sourceConfig->cid_parser_regex;
            $config->did_source = $sourceConfig->did_source;
            $config->did_custom_header = $sourceConfig->did_custom_header;
            $config->did_parser_start = $sourceConfig->did_parser_start;
            $config->did_parser_end = $sourceConfig->did_parser_end;
            $config->did_parser_regex = $sourceConfig->did_parser_regex;
            $config->cid_did_debug = $sourceConfig->cid_did_debug;
            
            // Attach SIP config to provider
            $newProvider->Sip = $config;
            $newProvider->sipuid = $newProvider->uniqid;
            
        } else if ($sourceProvider->type === 'IAX' && $sourceProvider->Iax) {
            // Copy IAX configuration
            $config = new Iax();
            $sourceConfig = $sourceProvider->Iax;
            
            $config->uniqid = $newProvider->uniqid;
            $config->disabled = $sourceConfig->disabled;
            $config->username = $sourceConfig->username;
            $config->secret = $sourceConfig->secret; // Note: password will be copied
            $config->host = $sourceConfig->host;
            $config->port = $sourceConfig->port;
            $config->qualify = $sourceConfig->qualify;
            $config->registration_type = $sourceConfig->registration_type;
            $config->description = 'copy of ' . $sourceConfig->description;
            $config->networkfilterid = $sourceConfig->networkfilterid;
            $config->networkfilter_represent = $sourceConfig->networkfilter_represent ?? AbstractDataStructure::getNetworkFilterRepresentation($sourceConfig->networkfilterid);
            $config->manualattributes = $sourceConfig->manualattributes;
            $config->noregister = $sourceConfig->noregister;
            $config->receive_calls_without_auth = $sourceConfig->receive_calls_without_auth;
            
            // Attach IAX config to provider
            $newProvider->Iax = $config;
            $newProvider->iaxuid = $newProvider->uniqid;
        }
        
        return $newProvider;
    }
}