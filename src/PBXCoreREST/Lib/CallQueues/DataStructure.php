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

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\AdminCabinet\Library\SecurityHelper;

/**
 * Data structure for call queues with extension representations
 *
 * Creates consistent data format for API responses including representation
 * fields needed for proper dropdown display with icons and security.
 *
 * @package MikoPBX\PBXCoreREST\Lib\CallQueues
 */
class DataStructure
{
    /**
     * Create data array from CallQueues model with representation fields
     *
     * This method generates all necessary representation fields for proper
     * dropdown display in the frontend, following the IVR Menu pattern.
     *
     * @param \MikoPBX\Common\Models\CallQueues $model Queue model instance
     * @param array $members Array of queue members with representations
     * @return array Complete data structure with representation fields
     */
    public static function createFromModel($model, array $members = []): array
    {
        // Get timeout extension representation
        $timeoutExtensionRepresent = '';
        if (!empty($model->timeout_extension)) {
            $timeoutExt = Extensions::findFirstByNumber($model->timeout_extension);
            if ($timeoutExt) {
                $timeoutExtensionRepresent = $timeoutExt->getRepresent();
            }
        }

        // Get redirect extension representations
        $redirectEmptyRepresent = '';
        if (!empty($model->redirect_to_extension_if_empty)) {
            $redirectExt = Extensions::findFirstByNumber($model->redirect_to_extension_if_empty);
            if ($redirectExt) {
                $redirectEmptyRepresent = $redirectExt->getRepresent();
            }
        }

        $redirectUnansweredRepresent = '';
        if (!empty($model->redirect_to_extension_if_unanswered)) {
            $redirectExt = Extensions::findFirstByNumber($model->redirect_to_extension_if_unanswered);
            if ($redirectExt) {
                $redirectUnansweredRepresent = $redirectExt->getRepresent();
            }
        }

        $redirectRepeatRepresent = '';
        if (!empty($model->redirect_to_extension_if_repeat_exceeded)) {
            $redirectExt = Extensions::findFirstByNumber($model->redirect_to_extension_if_repeat_exceeded);
            if ($redirectExt) {
                $redirectRepeatRepresent = $redirectExt->getRepresent();
            }
        }

        // Get sound file representations
        $periodicAnnounceRepresent = '';
        if (!empty($model->periodic_announce_sound_id)) {
            $soundFile = SoundFiles::findFirstById($model->periodic_announce_sound_id);
            if ($soundFile) {
                $periodicAnnounceRepresent = $soundFile->getRepresent();
            }
        }

        $mohSoundRepresent = '';
        if (!empty($model->moh_sound_id)) {
            $soundFile = SoundFiles::findFirstById($model->moh_sound_id);
            if ($soundFile) {
                $mohSoundRepresent = $soundFile->getRepresent();
            }
        }

        return [
            'id' => (string)$model->id,
            'uniqid' => $model->uniqid,
            // SECURITY: Sanitize user-provided fields to prevent XSS attacks
            'name' => SecurityHelper::escapeHtml($model->name ?? ''),
            'extension' => $model->extension,
            'strategy' => $model->strategy,
            'seconds_to_ring_each_member' => (string)$model->seconds_to_ring_each_member,
            'seconds_for_wrapup' => (string)$model->seconds_for_wrapup,
            
            // Convert checkbox values to boolean for consistent frontend handling (following IVR Menu pattern)
            'recive_calls_while_on_a_call' => ($model->recive_calls_while_on_a_call ?? '0') === '1',
            'caller_hear' => $model->caller_hear,
            'announce_position' => ($model->announce_position ?? '0') === '1',
            'announce_hold_time' => ($model->announce_hold_time ?? '0') === '1',
            'periodic_announce_frequency' => (int)$model->periodic_announce_frequency,
            'timeout_to_redirect_to_extension' => (int)$model->timeout_to_redirect_to_extension,
            'number_unanswered_calls_to_redirect' => (int)$model->number_unanswered_calls_to_redirect,
            'number_repeat_unanswered_to_redirect' => (int)$model->number_repeat_unanswered_to_redirect,
            'callerid_prefix' => SecurityHelper::escapeHtml($model->callerid_prefix ?? ''),
            'description' => SecurityHelper::escapeHtml($model->description ?? ''),

            // Extension fields with representations for dropdown display
            'timeout_extension' => $model->timeout_extension ?? '',
            'timeout_extensionRepresent' => $timeoutExtensionRepresent,

            'redirect_to_extension_if_empty' => $model->redirect_to_extension_if_empty ?? '',
            'redirect_to_extension_if_emptyRepresent' => $redirectEmptyRepresent,

            'redirect_to_extension_if_unanswered' => $model->redirect_to_extension_if_unanswered ?? '',
            'redirect_to_extension_if_unansweredRepresent' => $redirectUnansweredRepresent,

            'redirect_to_extension_if_repeat_exceeded' => $model->redirect_to_extension_if_repeat_exceeded ?? '',
            'redirect_to_extension_if_repeat_exceededRepresent' => $redirectRepeatRepresent,

            // Sound file fields with representations
            'periodic_announce_sound_id' => $model->periodic_announce_sound_id ?? '',
            'periodic_announce_sound_idRepresent' => $periodicAnnounceRepresent,

            'moh_sound_id' => $model->moh_sound_id ?? '',
            'moh_sound_idRepresent' => $mohSoundRepresent,

            // Members with representations
            'members' => $members
        ];
    }

    /**
     * Create simplified data structure for list display
     *
     * @param \MikoPBX\Common\Models\CallQueues $model Queue model instance
     * @return array Simplified data structure for table display
     */
    public static function createForList($model): array
    {
        $data = self::createFromModel($model, []);

        // Create custom represent field for queue display in table (without "Queue:" prefix)
        $queueName = SecurityHelper::escapeHtml($model->name ?? '');
        $data['represent'] = '<i class="users icon"></i> ' . $queueName . " <$model->extension>";

        // Add members summary for list display
        $members = [];
        foreach ($model->CallQueueMembers as $member) {
            $memberExt = Extensions::findFirstByNumber($member->extension);
            $members[] = [
                'extension' => $member->extension,
                'represent' => $memberExt ? $memberExt->getRepresent() : 'ERROR'
            ];
        }

        $data['members'] = $members;
        return $data;
    }
}