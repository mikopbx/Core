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

namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\SearchIndexTrait;

/**
 * Data structure for call queues with extension representations
 *
 * Creates consistent data format for API responses including representation
 * fields needed for proper dropdown display with icons and security.
 *
 * @package MikoPBX\PBXCoreREST\Lib\CallQueues
 */
class DataStructure extends AbstractDataStructure
{
    use SearchIndexTrait;
    /**
     * Create data array from CallQueues model with representation fields
     *
     * This method generates all necessary representation fields for proper
     * dropdown display in the frontend, following the IVR Menu pattern.
     * 
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param \MikoPBX\Common\Models\CallQueues $model Queue model instance
     * @param array $members Array of queue members with representations
     * @return array Complete data structure with representation fields
     */
    public static function createFromModel($model, array $members = []): array
    {

        // Start with base structure (raw data, no HTML escaping)
        $data = self::createBaseStructure($model);
        
        // Replace numeric id with uniqid for v3 API
        $data['id'] = $model->uniqid;
        unset($data['uniqid']); // Remove uniqid field to avoid duplication
        
        // Add call queue specific fields
        $data['strategy'] = $model->strategy;
        
        // Convert string fields to strings for API consistency
        $stringFields = ['seconds_to_ring_each_member', 'seconds_for_wrapup'];
        $data = self::convertNumericFieldsToStrings($data + [
            'seconds_to_ring_each_member' => $model->seconds_to_ring_each_member,
            'seconds_for_wrapup' => $model->seconds_for_wrapup,
        ], $stringFields);
        
        // Convert boolean fields for frontend consumption
        $booleanFields = ['recive_calls_while_on_a_call', 'announce_position', 'announce_hold_time'];
        $data = self::formatBooleanFields($data + [
            'recive_calls_while_on_a_call' => $model->recive_calls_while_on_a_call ?? '0',
            'announce_position' => $model->announce_position ?? '0',
            'announce_hold_time' => $model->announce_hold_time ?? '0',
        ], $booleanFields);
        
        // Add other fields
        $data['caller_hear'] = $model->caller_hear;
        
        // Convert integer fields
        $integerFields = ['periodic_announce_frequency', 'timeout_to_redirect_to_extension', 
                         'number_unanswered_calls_to_redirect', 'number_repeat_unanswered_to_redirect'];
        $data = self::convertIntegerFields($data + [
            'periodic_announce_frequency' => $model->periodic_announce_frequency,
            'timeout_to_redirect_to_extension' => $model->timeout_to_redirect_to_extension,
            'number_unanswered_calls_to_redirect' => $model->number_unanswered_calls_to_redirect,
            'number_repeat_unanswered_to_redirect' => $model->number_repeat_unanswered_to_redirect,
        ], $integerFields);
        
        // Add callerid_prefix (raw data - already sanitized on input)
        $data['callerid_prefix'] = $model->callerid_prefix ?? '';

        // Add extension fields with representations using unified approach
        $data = self::addMultipleExtensionFields($data, [
            'timeout_extension' => $model->timeout_extension,
            'redirect_to_extension_if_empty' => $model->redirect_to_extension_if_empty,
            'redirect_to_extension_if_unanswered' => $model->redirect_to_extension_if_unanswered,
            'redirect_to_extension_if_repeat_exceeded' => $model->redirect_to_extension_if_repeat_exceeded,
        ]);

        // Add sound file fields with representations using unified approach
        // Using standard naming convention: field_name_represent (lowercase with underscores)
        $data = self::addSoundFileField($data, 'periodic_announce_sound_id', $model->periodic_announce_sound_id);
        $data = self::addSoundFileField($data, 'moh_sound_id', $model->moh_sound_id);

        // Add members
        $data['members'] = $members;

        return $data;
    }

    /**
     * Create simplified data structure for list display
     *
     * @param \MikoPBX\Common\Models\CallQueues $model Queue model instance
     * @return array Simplified data structure for table display
     */
    public static function createForList($model): array
    {
        // Use unified base method for list creation
        $data = parent::createForList($model);

        // Replace numeric id with uniqid for v3 API
        $data['id'] = $model->uniqid;
        unset($data['uniqid']); // Remove uniqid field to avoid duplication

        // Add call queue specific fields for list display
        $data['strategy'] = $model->strategy;
        $data['extension'] = $model->extension;

        // Create custom represent field for queue display
        // Note: The represent field contains HTML markup and will be escaped by the frontend when needed
        $data['represent'] = '<i class="users icon"></i> ' . ($model->name ?? '') . " <{$model->extension}>";

        // Add members summary for list display
        $members = [];
        foreach ($model->CallQueueMembers as $member) {
            $members[] = [
                'extension' => $member->extension,
                'represent' => self::getExtensionRepresentation($member->extension)
            ];
        }

        $data['members'] = $members;
        
        // Generate search index automatically from all fields
        // This will use all _represent fields and extract extension numbers
        $data['search_index'] = self::generateAutoSearchIndex($data);
        
        return $data;
    }
    
    /**
     * Create default data structure for a new call queue
     *
     * Provides default values and empty structures for creating a new queue
     * following the same pattern as existing DataStructure methods.
     *
     * @return array Default data structure for new call queue
     */
    public static function createForNewQueue(): array
    {
        // Create base structure with default values
        // Using 'id' field for uniqid value (v3 API simplified structure)
        $data = [
            'id' => '', // Will be filled with uniqid value
            'name' => '',
            'extension' => '',
            'description' => '',
            'strategy' => 'ringall', // Default strategy
            'seconds_to_ring_each_member' => '15',
            'seconds_for_wrapup' => '15',
            'recive_calls_while_on_a_call' => '0',
            'announce_position' => '0',
            'announce_hold_time' => '0',
            'periodic_announce_sound_id' => '',
            'periodic_announce_sound_id_represent' => '',
            'periodic_announce_frequency' => 0,
            'timeout_to_redirect_to_extension' => 0,
            'timeout_extension' => '',
            'timeout_extension_represent' => '',
            'redirect_to_extension_if_empty' => '',
            'redirect_to_extension_if_empty_represent' => '',
            'redirect_to_extension_if_unanswered' => '',
            'redirect_to_extension_if_unanswered_represent' => '',
            'redirect_to_extension_if_repeat_exceeded' => '',
            'redirect_to_extension_if_repeat_exceeded_represent' => '',
            'number_unanswered_calls_to_redirect' => 0,
            'number_repeat_unanswered_to_redirect' => 0,
            'callerid_prefix' => '',
            'moh_sound_id' => '',
            'moh_sound_id_represent' => '',
            'caller_hear' => 'mohClass',
            'members' => [],
            'represent' => ''
        ];
        
        return $data;
    }
}