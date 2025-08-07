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
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class GetListAction
 * 
 * Retrieves list of providers organized by categories (SIP/IAX2)
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Providers
 */
class GetListAction
{
    /**
     * Get list of all providers
     * 
     * @param bool $includeDisabled Include disabled providers in the list
     * @return PBXApiResult
     */
    public static function main(bool $includeDisabled = false): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get all providers
            $providers = Providers::find();
            
            // Process providers
            foreach ($providers as $provider) {
                $providerData = self::processProvider($provider, $includeDisabled);
                if ($providerData !== null) {
                    $res->data[] = $providerData;
                }
            }
            
            // Sort providers by type and name
            usort($res->data, function($a, $b) {
                // First sort by type (SIP before IAX)
                $typeCompare = strcmp($a['type'], $b['type']);
                if ($typeCompare !== 0) {
                    return $typeCompare;
                }
                // Then sort by name
                return strcmp($a['name'], $b['name']);
            });
            
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Process single provider record
     * 
     * @param Providers $provider
     * @param bool $includeDisabled
     * @return array|null Provider data or null if should be skipped
     */
    private static function processProvider(Providers $provider, bool $includeDisabled): ?array
    {
        $providerData = [
            'id' => $provider->id,
            'uniqid' => $provider->uniqid,
            'type' => $provider->type,
            'typeLocalized' => Util::translate("prov_dropdownCategory_{$provider->type}"),
            'name' => $provider->getRepresent(),
            'disabled' => false,
            'note' => $provider->note ?? ''
        ];
        
        // Check if provider is disabled based on type
        if ($provider->type === 'SIP' && $provider->Sip) {
            $providerData['disabled'] = $provider->Sip->disabled === '1';
            $providerData['host'] = $provider->Sip->host;
            $providerData['username'] = $provider->Sip->username;
        } elseif ($provider->type === 'IAX' && $provider->Iax) {
            $providerData['disabled'] = $provider->Iax->disabled === '1';
            $providerData['host'] = $provider->Iax->host;
            $providerData['username'] = $provider->Iax->username;
        }
        
        // Skip disabled providers if not including them
        if (!$includeDisabled && $providerData['disabled']) {
            return null;
        }
        
        return $providerData;
    }
}