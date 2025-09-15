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

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for Outbound Routes.
 * 
 * @package MikoPBX\PBXCoreREST\Lib\OutboundRoutes
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create complete data array from OutgoingRoutingTable model.
     * 
     * @param \MikoPBX\Common\Models\OutgoingRoutingTable $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        // Start with base structure
        $data = self::createBaseStructure($model);
        
        // Add outbound route specific fields
        $data['rulename'] = $model->rulename ?? '';
        $data['providerid'] = $model->providerid ?? '';  // Unified field name
        $data['priority'] = (int)($model->priority ?? 0);
        $data['numberbeginswith'] = $model->numberbeginswith ?? '';
        $data['restnumbers'] = $model->restnumbers ?? '9';
        $data['trimfrombegin'] = $model->trimfrombegin ?? '0';
        $data['prepend'] = $model->prepend ?? '';
        $data['note'] = $model->note ?? '';
        
        // Add provider details
        $data = array_merge($data, self::getProviderData($model->Providers));
        
        // Add representation
        $data['represent'] = $model->getRepresent();
        
        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data, ['rulename', 'providerid', 'numberbeginswith', 'prepend', 'note']);
        
        return $data;
    }
    
    /**
     * Create simplified data array for list view.
     * 
     * @param \MikoPBX\Common\Models\OutgoingRoutingTable $model
     * @return array
     */
    public static function createForList($model): array
    {
        $data = self::createBaseStructure($model);
        
        // Add essential fields for list display
        $data['rulename'] = $model->rulename ?? '';
        $data['priority'] = (int)($model->priority ?? 0);
        $data['numberbeginswith'] = $model->numberbeginswith ?? '';
        $data['restnumbers'] = $model->restnumbers ?? '9';
        $data['trimfrombegin'] = $model->trimfrombegin ?? '0';
        $data['prepend'] = $model->prepend ?? '';
        $data['note'] = $model->note ?? '';
        
        // Add provider data for list display
        $providerData = self::getProviderData($model->Providers);
        $data['providerid'] = $model->providerid ?? '';  // Provider ID
        $data['providerid_represent'] = $providerData['providerid_represent'];
        $data['provider_disabled'] = $providerData['provider_disabled'];
        
        // Generate ready-to-use description for the rule
        $data['ruleDescription'] = self::generateRuleDescription($model);
        
        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data, ['rulename', 'numberbeginswith', 'prepend', 'note']);
        
        return $data;
    }
    
    /**
     * Create data structure for dropdown/select options.
     * 
     * @param \MikoPBX\Common\Models\OutgoingRoutingTable $model
     * @return array
     */
    public static function createForSelect($model): array
    {
        return [
            'id' => $model->id,
            'name' => $model->rulename,
            'represent' => $model->getRepresent(),
            'disabled' => false
        ];
    }
    
    /**
     * Generate HTML description for the outbound route rule with provider.
     * 
     * @param OutgoingRoutingTable $model
     * @return string HTML description of the rule
     */
    private static function generateRuleDescription(OutgoingRoutingTable $model): string
    {
        $di = \Phalcon\Di\Di::getDefault();
        $translation = $di->get(TranslationProvider::SERVICE_NAME);
        
        $numberbeginswith = $model->numberbeginswith ?? '';
        $restnumbers = (int)($model->restnumbers ?? 0);
        $trimfrombegin = (int)($model->trimfrombegin ?? 0);
        $prepend = $model->prepend ?? '';
        
        // Get provider representation (already includes icon from getRepresent())
        $providerName = $model->Providers?->getRepresent();
        if ($providerName === null) {
            // No provider selected
            return $translation->_('or_RuleNotConfigured');
        }
        // The getRepresent() method already returns HTML with icon, so we don't need to add it
        $providerDisplay = '<span class="provider">' . $providerName . '</span>';
        
        // Determine the base translation key based on pattern
        $baseKey = '';
        $params = ['provider' => $providerDisplay];
        
        if (!$numberbeginswith && $restnumbers === 0) {
            // Rule is not configured
            return $translation->_('or_RuleNotConfigured');
        } elseif (!$numberbeginswith && $restnumbers < 0) {
            // Any numbers
            $baseKey = 'or_RuleAnyNumbersWithProvider';
        } elseif (!$numberbeginswith && $restnumbers > 0) {
            // Numbers with specific length
            $baseKey = 'or_RuleDescriptionBeginEmptyWithProvider';
            $params['restnumbers'] = (string)$restnumbers;
        } elseif ($numberbeginswith) {
            if ($restnumbers > 0) {
                // Pattern with prefix and rest numbers
                $baseKey = 'or_RuleDescriptionWithProvider';
                $params['numberbeginswith'] = htmlspecialchars($numberbeginswith);
                $params['restnumbers'] = (string)$restnumbers;
            } elseif ($restnumbers === 0) {
                // Exact match
                $baseKey = 'or_RuleDescriptionFullMatchWithProvider';
                $params['numberbeginswith'] = htmlspecialchars($numberbeginswith);
            } else {
                // Prefix match with any rest numbers (restnumbers = -1)
                $baseKey = 'or_RuleDescriptionBeginMatchWithProvider';
                $params['numberbeginswith'] = htmlspecialchars($numberbeginswith);
            }
        }
        
        // Add modification suffixes if needed
        if ($trimfrombegin > 0 && !empty($prepend)) {
            // Both trim and prepend
            $baseKey = str_replace('WithProvider', 'WithProviderAndModify', $baseKey);
            $params['trim'] = (string)$trimfrombegin;
            $params['prepend'] = htmlspecialchars($prepend);
        } elseif ($trimfrombegin > 0) {
            // Only trim
            $baseKey = str_replace('WithProvider', 'WithProviderAndTrim', $baseKey);
            $params['trim'] = (string)$trimfrombegin;
        } elseif (!empty($prepend)) {
            // Only prepend
            $baseKey = str_replace('WithProvider', 'WithProviderAndPrepend', $baseKey);
            $params['prepend'] = htmlspecialchars($prepend);
        }
        
        // Generate the final description
        $description = $translation->_($baseKey, $params);
        
        return $description;
    }
    
    /**
     * Get provider data including name and status.
     * 
     * @param mixed $provider Provider model or null
     * @return array Provider data with name, type, and disabled status
     */
    private static function getProviderData($provider): array
    {
        if ($provider === null) {
            return [
                'providerid_represent' => '',
                'provider_type' => '',
                'provider_disabled' => false,
            ];
        }
        
        $isDisabled = false;
        $modelType = ucfirst($provider->type);
        
        if (isset($provider->$modelType) && isset($provider->$modelType->disabled)) {
            $isDisabled = $provider->$modelType->disabled === '1';
        }
        
        return [
            'providerid_represent' => $provider->getRepresent(),
            'provider_type' => $provider->type,
            'provider_disabled' => $isDisabled,
        ];
    }
}