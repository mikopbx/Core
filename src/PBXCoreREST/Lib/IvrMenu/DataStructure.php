<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\IvrMenu;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\SearchIndexTrait;
use MikoPBX\Common\Models\Extensions;


/**
 * Data structure for IVR menu
 * 
 * @package MikoPBX\PBXCoreREST\Lib\IvrMenu
 */
class DataStructure extends AbstractDataStructure
{
    use SearchIndexTrait;
    /**
     * Create complete data array from IvrMenu model including actions
     * @param \MikoPBX\Common\Models\IvrMenu $model
     * @param array|bool $actionsOrInclude Actions array for copy mode, or boolean to include actions
     * @return array
     */
    public static function createFromModel($model, $actionsOrInclude = true): array
    {
        // Create custom structure without calling createBaseStructure to avoid duplicate fields
        // Use only 'id' field that contains the uniqid value
        $data = [
            'id' => $model->uniqid ?? '',
            'extension' => $model->extension ?? '',
            'name' => $model->name ?? '',
            'description' => $model->description ?? ''
        ];
        
        // Add IVR menu specific fields
        $data['timeout'] = $model->timeout ?? '7';
        $data['number_of_repeat'] = $model->number_of_repeat ?? '3';

        // Convert boolean fields for frontend consumption
        $booleanFields = ['allow_enter_any_internal_extension'];
        $data = self::formatBooleanFields($data + [
            'allow_enter_any_internal_extension' => $model->allow_enter_any_internal_extension ?? '0'
        ], $booleanFields);

        // Add extension fields with representations using unified approach
        $data = self::addExtensionField($data, 'timeout_extension', $model->timeout_extension);

        // Add sound file field using standard naming convention: field_name_represent
        $data = self::addSoundFileField($data, 'audio_message_id', $model->audio_message_id);
        
        // Handle actions - either from provided array (copy mode) or from model relations
        if (is_array($actionsOrInclude)) {
            // Copy mode - use provided actions array and load extension representations
            $actions = [];
            foreach ($actionsOrInclude as $actionData) {
                $extensionNumber = $actionData['extension'] ?? '';
                $extensionRepresent = '';
                
                // Load extension representation if extension number exists
                if (!empty($extensionNumber)) {
                    $extension = Extensions::findFirstByNumber($extensionNumber);
                    if ($extension) {
                        $extensionRepresent = $extension->getRepresent();
                    }
                }
                
                $actions[] = [
                    'id' => $actionData['id'] ?? '',
                    'digits' => $actionData['digits'] ?? '',
                    'extension' => $extensionNumber,
                    'extension_represent' => $extensionRepresent
                ];
            }
            // Sort actions by digits
            usort($actions, function($a, $b) {
                return (int)$a['digits'] <=> (int)$b['digits'];
            });
            $data['actions'] = $actions;
        } elseif ($actionsOrInclude && !empty($model->id)) {
            // Normal mode - get actions from model relations
            $actions = [];
            foreach ($model->IvrMenuActions as $action) {
                $actions[] = [
                    'id' => (string)$action->id,
                    'digits' => $action->digits,
                    'extension' => $action->extension,
                    'extension_represent' => $action->Extensions?->getRepresent() ?? 'ERROR'
                ];
            }
            // Sort actions by digits
            usort($actions, function($a, $b) {
                return (int)$a['digits'] <=> (int)$b['digits'];
            });
            $data['actions'] = $actions;
        } elseif ($actionsOrInclude) {
            // For new records, set empty actions array
            $data['actions'] = [];
        }
        
        // Generate search index automatically
        $data['search_index'] = self::generateAutoSearchIndex($data);
        
        return $data;
    }
    
    /**
     * Create simplified data array for list view
     * @param \MikoPBX\Common\Models\IvrMenu $model
     * @return array
     */
    public static function createForList($model): array
    {
        $data = self::createFromModel($model, false);
        
        // Add represent field identical to IvrMenu->getRepresent()
        $data['represent'] = $model->getRepresent();
        
        // Add timeout extension representation
        $data['timeoutExtensionRepresent'] = $model->TimeoutExtensions?->getRepresent() ?? '';
        
        // Add simplified actions summary
        $actions = [];
        foreach ($model->IvrMenuActions as $action) {
            $actions[] = [
                'digits' => $action->digits,
                'represent' => $action->Extensions?->getRepresent() ?? 'ERROR'
            ];
        }
        usort($actions, function($a, $b) {
            return (int)$a['digits'] <=> (int)$b['digits'];
        });
        $data['actions'] = $actions;
        
        // Generate search index automatically from all fields
        // This will use all _represent fields and extract extension numbers
        $data['search_index'] = self::generateAutoSearchIndex($data);
        
        return $data;
    }
}