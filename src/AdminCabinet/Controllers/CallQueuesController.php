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

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\CallQueueEditForm;

/**
 * CallQueuesController
 *
 * Optimized controller following IVR Menu pattern - minimal server-side logic,
 * JavaScript handles data loading via REST API. No unnecessary REST API calls
 * in controller methods.
 */
class CallQueuesController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    /**
     * Display the list of call queues
     *
     * DataTable handles all data loading via AJAX to REST API.
     * No server-side data processing required.
     */
    public function indexAction(): void
    {
        // Provide empty array for template compatibility during migration
        // JavaScript will handle actual data loading via REST API call-queues-index.js
        $this->view->callQueuesList = [];
    }

    /**
     * Modify call queue action.
     * 
     * Simplified controller following IVR Menu pattern - all data loading is handled by JavaScript via REST API.
     * This only provides the basic form structure.
     *
     * @param string $uniqid - The unique identifier of the call queue to modify.
     */
    public function modifyAction(string $uniqid = ''): void
    {
        // Create empty form - JavaScript will populate everything via REST API
        $emptyQueue = new \stdClass();
        $emptyQueue->id = '';
        $emptyQueue->uniqid = $uniqid ?: '';
        $emptyQueue->extension = '';
        $emptyQueue->name = '';
        $emptyQueue->strategy = 'ringall';
        $emptyQueue->seconds_to_ring_each_member = '15';
        $emptyQueue->seconds_for_wrapup = '15';
        $emptyQueue->recive_calls_while_on_a_call = '1';
        $emptyQueue->caller_hear = 'ringing';
        $emptyQueue->announce_position = '1';
        $emptyQueue->announce_hold_time = '1';
        $emptyQueue->periodic_announce_sound_id = '';
        $emptyQueue->moh_sound_id = '';
        $emptyQueue->periodic_announce_frequency = '0';
        $emptyQueue->timeout_to_redirect_to_extension = '300';
        $emptyQueue->timeout_extension = '';
        $emptyQueue->redirect_to_extension_if_empty = '';
        $emptyQueue->number_unanswered_calls_to_redirect = '3';
        $emptyQueue->redirect_to_extension_if_unanswered = '';
        $emptyQueue->number_repeat_unanswered_to_redirect = '3';
        $emptyQueue->redirect_to_extension_if_repeat_exceeded = '';
        $emptyQueue->callerid_prefix = '';
        $emptyQueue->description = '';
        
        // Create form with minimal options - all dropdowns populated dynamically
        $form = new CallQueueEditForm(
            $emptyQueue,
            [
                'extensions' => ['' => 'Select number'], // Minimal - loaded via Extensions API
                'soundfiles' => ['' => 'Select sound file'], // Minimal - loaded via SoundFiles API
                'mohSoundFiles' => ['' => 'Select sound file'], // Minimal - loaded via SoundFiles API
            ]
        );
        
        // Pass only the form and uniqid - JavaScript handles everything else
        $this->view->form = $form;
        $this->view->uniqid = $uniqid ?: '';
    }

    /**
     * Saves the call queue
     * This action is kept for backward compatibility but the actual saving
     * is handled by the REST API through JavaScript (Form.js integration)
     */
    public function saveAction(): void
    {
        // This method is intentionally empty as all save operations
        // are handled through REST API calls from the frontend JavaScript
        // using Form.js integration with CallQueuesAPI.saveRecord()
    }
}
