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

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting providers list formatted for dropdown selects
 * 
 * @api {get} /pbxcore/api/v2/providers/getForSelect Get providers for select dropdown
 * @apiVersion 2.0.0
 * @apiName GetForSelect
 * @apiGroup Providers
 * 
 * @apiParam {String} [type] Provider type filter (SIP/IAX)
 * @apiParam {Boolean} [includeDisabled=false] Include disabled providers
 * @apiParam {Boolean} [includeNone=false] Include "Any Provider" (none) option for incoming routes
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data List of providers for dropdown
 * @apiSuccess {String} data.value Provider ID
 * @apiSuccess {String} data.text Provider representation with HTML
 * @apiSuccess {String} data.name Provider representation (same as text)
 */
class GetForSelectAction
{
    /**
     * Get providers list for dropdown select
     * 
     * @param array $data Request parameters
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $type = $data['type'] ?? null;
            $includeDisabled = !empty($data['includeDisabled']) && 
                               ($data['includeDisabled'] === 'true' || $data['includeDisabled'] === true);
            $includeNone = !empty($data['includeNone']) && 
                          ($data['includeNone'] === 'true' || $data['includeNone'] === true);
            
            // Build query conditions
            $conditions = [];
            $bind = [];
            
            if ($type) {
                $conditions[] = 'type = :type:';
                $bind['type'] = $type;
            }
            
            // Get providers
            $queryParams = [];
            if (!empty($conditions)) {
                $queryParams['conditions'] = implode(' AND ', $conditions);
                $queryParams['bind'] = $bind;
            }
            
            $providers = Providers::find($queryParams);
            
            $providersList = [];
            foreach ($providers as $provider) {
                // Check if provider is disabled based on type
                $isDisabled = false;
                if ($provider->type === 'SIP' && $provider->Sip) {
                    $isDisabled = $provider->Sip->disabled === '1';
                } elseif ($provider->type === 'IAX' && $provider->Iax) {
                    $isDisabled = $provider->Iax->disabled === '1';
                }
                
                // Skip disabled providers unless explicitly requested
                if (!$includeDisabled && $isDisabled) {
                    continue;
                }
                
                $represent = $provider->getRepresent();
                
                // Add status indicator to representation
                if ($isDisabled) {
                    $di = \Phalcon\Di\Di::getDefault();
                    $translation = $di->get(TranslationProvider::SERVICE_NAME);
                    $disabledText = $translation->_('pr_Disabled') ?: 'Disabled';
                    $represent .= ' <span class="ui red text">(' . $disabledText . ')</span>';
                }
                
                $providersList[] = [
                    'value' => $provider->uniqid,
                    'text' => $represent,
                    'name' => $represent,
                    'type' => $provider->type,
                    'disabled' => $isDisabled
                ];
            }
            
            // Add "Any Provider" option at the beginning if requested
            if ($includeNone) {
                $di = \Phalcon\Di\Di::getDefault();
                $translation = $di->get(TranslationProvider::SERVICE_NAME);
                $anyProviderText = $translation->_('ir_AnyProvider_v2') ?: 'Any Provider';
                
                array_unshift($providersList, [
                    'value' => 'none',
                    'text' => '<i class="globe icon"></i> ' . $anyProviderText,
                    'name' => '<i class="globe icon"></i> ' . $anyProviderText,
                    'type' => 'ALL',
                    'disabled' => false
                ]);
            } else {
                // Sort by representation for better UX (only if not including none)
                usort($providersList, function($a, $b) {
                    return strcasecmp(strip_tags($a['text']), strip_tags($b['text']));
                });
            }
            
            $res->data = $providersList;
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}