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

namespace MikoPBX\PBXCoreREST\Lib\IncomingRoutes;

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for Incoming Routes
 * 
 * @package MikoPBX\PBXCoreREST\Lib\IncomingRoutes
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create complete data array from IncomingRoutingTable model
     * 
     * @param \MikoPBX\Common\Models\IncomingRoutingTable $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        // Start with base structure
        $data = self::createBaseStructure($model);
        
        // Add incoming route specific fields
        $data['rulename'] = $model->rulename ?? '';
        $data['number'] = $model->number ?? '';
        // Map database field 'provider' to API field 'providerid' for consistency
        $data['providerid'] = $model->provider ?? 'none';
        $data['priority'] = (int)$model->priority;
        $data['timeout'] = (int)$model->timeout;
        $data['extension'] = $model->extension ?? '';
        $data['audio_message_id'] = $model->audio_message_id ?? '';
        $data['note'] = $model->note ?? '';
        
        // Add provider and extension details
        $providerData = self::getProviderData($model->Providers, $model->provider);
        $data = array_merge($data, $providerData);
        $data = array_merge($data, self::getExtensionData($model->Extensions));
        
        // Add providerid_represent field using standard naming convention: field_name_represent
        $data['providerid_represent'] = $providerData['providerid_represent'];
        
        // Add sound file field using standard naming convention: field_name_represent
        $data = self::addSoundFileField($data, 'audio_message_id', $model->audio_message_id);
        
        // Handle null values for consistent JSON output (excluding providerid which uses 'none')
        $data = self::handleNullValues($data, ['rulename', 'number', 'extension', 'audio_message_id', 'note']);
        
        return $data;
    }
    
    /**
     * Create simplified data array for list view
     * 
     * @param \MikoPBX\Common\Models\IncomingRoutingTable $model
     * @return array
     */
    public static function createForList($model): array
    {
        $data = self::createBaseStructure($model);
        
        // Add essential fields for list display
        $data['number'] = $model->number ?? '';
        $data['priority'] = (int)$model->priority;
        $data['timeout'] = (int)$model->timeout;
        $data['extension'] = $model->extension ?? '';
        $data['note'] = $model->note ?? '';
        
        // Add provider data - map provider to providerid for consistency
        $providerData = self::getProviderData($model->Providers, $model->provider);
        // Map database field 'provider' to API field 'providerid' for consistency
        $data['providerid'] = $model->provider ?? 'none';  // Provider ID
        $data['providerid_represent'] = $providerData['providerid_represent'];
        $data['provider_disabled'] = $providerData['provider_disabled'];
        
        // Add extension representation
        $extensionData = self::getExtensionData($model->Extensions);
        $data['extension_represent'] = $extensionData['extension_represent'];
        
        // Generate ready-to-use HTML representation for the rule
        $data['rule_represent'] = self::generateRuleDescription($model, $data);
        
        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data, ['number', 'extension', 'note']);
        
        return $data;
    }
    
    /**
     * Create data structure for dropdown/select options
     * 
     * @param \MikoPBX\Common\Models\IncomingRoutingTable $model
     * @return array
     */
    public static function createForSelect($model): array
    {
        return [
            'id' => (string)$model->id,
            'uniqid' => $model->uniqid,
            'rulename' => $model->rulename ?? '',
            'number' => $model->number ?? '',
            'represent' => method_exists($model, 'getRepresent') ? $model->getRepresent() : ($model->rulename ?? '')
        ];
    }
    
    /**
     * Generate HTML description for the incoming route rule
     * 
     * @param \MikoPBX\Common\Models\IncomingRoutingTable $model
     * @param array $data Pre-processed data array
     * @return string HTML description of the rule
     */
    private static function generateRuleDescription($model, array $data): string
    {
        $di = \Phalcon\Di\Di::getDefault();
        $translation = $di->get(TranslationProvider::SERVICE_NAME);
        
        // Get extension representation with icon
        $extensionDisplay = '';
        if (!empty($data['extensionRepresent'])) {
            $extensionDisplay = '<span class="callerid">' . $data['extensionRepresent'] . '</span>';
        } elseif (!empty($model->extension)) {
            $extensionDisplay = '<span class="callerid">' . htmlspecialchars($model->extension) . '</span>';
        }
        
        // Get provider representation with icon
        $providerDisplay = '';
        if (!empty($data['providerid_represent'])) {
            $providerDisplay = '<span class="provider">' . $data['providerid_represent'] . '</span>';
        }
        
        // Get number display - use "any number" text that already exists in translations
        $numberDisplay = !empty($model->number) ? 
            htmlspecialchars($model->number) : 
            $translation->_('ir_AnyNumber');
        
        // Generate description based on available data
        if (empty($model->number) && empty($model->provider)) {
            // Without number and without provider
            $description = $translation->_('ir_RuleDescriptionWithoutNumberAndWithoutProvider_v2', [
                'callerid' => $extensionDisplay
            ]);
        } elseif (empty($model->number)) {
            // Without number but with provider
            $description = $translation->_('ir_RuleDescriptionWithoutNumber_v2', [
                'provider' => $providerDisplay,
                'callerid' => $extensionDisplay
            ]);
        } elseif (empty($model->provider)) {
            // With number but without provider
            $description = $translation->_('ir_RuleDescriptionWithoutProvider_v2', [
                'number' => $numberDisplay,
                'callerid' => $extensionDisplay
            ]);
        } else {
            // With both number and provider
            $description = $translation->_('ir_RuleDescriptionWithNumberAndWithProvider_v2', [
                'number' => $numberDisplay,
                'provider' => $providerDisplay,
                'callerid' => $extensionDisplay
            ]);
        }
        
        return $description;
    }
    
    /**
     * Extract provider data from model
     * 
     * @param \MikoPBX\Common\Models\Providers|null $provider
     * @param string|null $providerValue Database value for provider field
     * @return array Provider data array
     */
    private static function getProviderData($provider, $providerValue = null): array
    {
        // Check if this should be treated as "Any Provider"
        if ($provider === null || $providerValue === null || $providerValue === 'none') {
            $di = \Phalcon\Di\Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $anyProviderText = $translation->_('ir_AnyProvider_v2') ?: 'Any Provider';
            
            return [
                'providerid_represent' => '<i class="globe icon"></i> ' . $anyProviderText,
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
    
    /**
     * Extract extension data from model
     * 
     * @param \MikoPBX\Common\Models\Extensions|null $extension
     * @return array Extension data array
     */
    private static function getExtensionData($extension): array
    {
        return [
            'extension_represent' => $extension?->getRepresent() ?? '',
        ];
    }
}