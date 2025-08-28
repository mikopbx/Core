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


/**
 * Data structure for IVR menu
 * 
 * @package MikoPBX\PBXCoreREST\Lib\IvrMenu
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create complete data array from IvrMenu model including actions
     * @param \MikoPBX\Common\Models\IvrMenu $model
     * @param bool $includeActions Whether to include IVR menu actions
     * @return array
     */
    public static function createFromModel($model, bool $includeActions = true): array
    {
        // Start with base structure - data is already sanitized during storage
        // No additional HTML escaping needed for API response (follows "Store Raw, Escape at Edge")
        $data = self::createBaseStructure($model);
        
        // Mask the id with uniqid value for all REST clients
        $data['id'] = $model->uniqid;
        
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

        // Add sound file field using unified approach with IVR-specific naming (audio_message_id_Represent)
        $data = self::addSoundFileField($data, 'audio_message_id', $model->audio_message_id, '_Represent');
        
        if ($includeActions && !empty($model->id)) {
            // Add IVR actions
            $actions = [];
            foreach ($model->IvrMenuActions as $action) {
                $actions[] = [
                    'id' => (string)$action->id,
                    'digits' => $action->digits,
                    'extension' => $action->extension,
                    'extensionRepresent' => $action->Extensions ? $action->Extensions->getRepresent() : 'ERROR'
                ];
            }
            // Sort actions by digits
            usort($actions, function($a, $b) {
                return (int)$a['digits'] <=> (int)$b['digits'];
            });
            $data['actions'] = $actions;
        } elseif ($includeActions) {
            // For new records, set empty actions array
            $data['actions'] = [];
        }
        
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
        $data['timeoutExtensionRepresent'] = $model->TimeoutExtensions ? 
            $model->TimeoutExtensions->getRepresent() : '';
        
        // Add simplified actions summary
        $actions = [];
        foreach ($model->IvrMenuActions as $action) {
            $actions[] = [
                'digits' => $action->digits,
                'represent' => $action->Extensions ? $action->Extensions->getRepresent() : 'ERROR'
            ];
        }
        usort($actions, function($a, $b) {
            return (int)$a['digits'] <=> (int)$b['digits'];
        });
        $data['actions'] = $actions;
        
        return $data;
    }
}