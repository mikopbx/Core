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
        $data = array_merge($data, self::getProviderData($model->Providers));
        $data = array_merge($data, self::getExtensionData($model->Extensions));
        
        // Add sound file field using unified approach with underscore separator for consistency with IVR menu
        $data = self::addSoundFileField($data, 'audio_message_id', $model->audio_message_id, '_Represent');
        
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
        $providerData = self::getProviderData($model->Providers);
        // Map database field 'provider' to API field 'providerid' for consistency
        $data['providerid'] = $model->provider ?? 'none';  // Provider ID
        $data['providerRepresent'] = $providerData['providerName'];
        $data['providerDisabled'] = $providerData['providerDisabled'];
        
        // Add extension representation
        $extensionData = self::getExtensionData($model->Extensions);
        $data['extensionRepresent'] = $extensionData['extensionName'];
        
        // Generate ready-to-use HTML representation for the rule
        $data['ruleRepresent'] = self::generateRuleDescription($model, $data);
        
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
        if (!empty($data['providerRepresent'])) {
            $providerDisplay = '<span class="provider">' . $data['providerRepresent'] . '</span>';
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
     * @return array Provider data array
     */
    private static function getProviderData($provider): array
    {
        if ($provider === null) {
            return [
                'providerName' => '',
                'providerType' => '',
                'providerDisabled' => false,
            ];
        }
        
        $isDisabled = false;
        $modelType = ucfirst($provider->type);
        
        if (isset($provider->$modelType) && isset($provider->$modelType->disabled)) {
            $isDisabled = $provider->$modelType->disabled === '1';
        }
        
        return [
            'providerName' => $provider->getRepresent(),
            'providerType' => $provider->type,
            'providerDisabled' => $isDisabled,
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
            'extensionName' => $extension?->getRepresent() ?? '',
        ];
    }
}