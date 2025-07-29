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

use MikoPBX\AdminCabinet\Library\SecurityHelper;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;

/**
 * Data structure for IVR menu
 * 
 * @package MikoPBX\PBXCoreREST\Lib\IvrMenu
 */
class DataStructure
{
    /**
     * Create complete data array from IvrMenu model including actions
     * @param \MikoPBX\Common\Models\IvrMenu $model
     * @param bool $includeActions Whether to include IVR menu actions
     * @return array
     */
    public static function createFromModel($model, bool $includeActions = true): array
    {
        // Get timeout extension represent
        $timeoutExtensionRepresent = '';
        if (!empty($model->timeout_extension)) {
            $timeoutExt = Extensions::findFirst([
                'conditions' => 'number = :number:',
                'bind' => ['number' => $model->timeout_extension]
            ]);
            if ($timeoutExt) {
                $timeoutExtensionRepresent = $timeoutExt->getRepresent();
            }
        }
        
        // Get audio message represent
        $audioMessageRepresent = '';
        if (!empty($model->audio_message_id)) {
            $audioMessage = \MikoPBX\Common\Models\SoundFiles::findFirst([
                'conditions' => 'id = :id:',
                'bind' => ['id' => $model->audio_message_id]
            ]);
            if ($audioMessage) {
                $audioMessageRepresent = $audioMessage->getRepresent();
            }
        }
        
        $data = [
            'id' => (string)$model->id,
            'uniqid' => $model->uniqid,
            'extension' => $model->extension,
            // SECURITY: Sanitize user-provided fields to prevent XSS attacks
            // Use SecurityHelper instead of decodeHtmlEntities to ensure proper escaping
            'name' => SecurityHelper::escapeHtml($model->name ?? ''),
            'audio_message_id' => $model->audio_message_id ?? '',
            'audio_message_id_Represent' => $audioMessageRepresent,
            'timeout' => $model->timeout ?? '7',
            'timeout_extension' => $model->timeout_extension ?? '',
            'timeout_extensionRepresent' => $timeoutExtensionRepresent,
            'allow_enter_any_internal_extension' => ($model->allow_enter_any_internal_extension ?? '0') === '1',
            'number_of_repeat' => $model->number_of_repeat ?? '3',
            // SECURITY: Sanitize description field to prevent XSS attacks
            'description' => SecurityHelper::escapeHtml($model->description ?? '')
        ];
        
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