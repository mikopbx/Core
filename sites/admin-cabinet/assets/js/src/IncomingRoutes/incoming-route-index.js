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

/* global globalRootUrl,globalTranslate, Extensions, Form */


/**
 * Object for managing incoming routes table
 *
 * @module incomingRoutes
 */
const incomingRoutes = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#default-rule-form'),

    $actionDropdown: $('#action'),

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'extensionRule',
                    prompt: globalTranslate.ir_ValidateForwardingToBeFilled,
                },
            ],
        },
    },

    /**
     * Initialize the object
     */
    initialize() {
        // Initialize table drag-and-drop with the appropriate callbacks
        $('#routingTable').tableDnD({
            onDrop: incomingRoutes.cbOnDrop, // Callback on dropping an item
            onDragClass: 'hoveringRow', // CSS class while dragging
            dragHandle: '.dragHandle',  // Handle for dragging
        });

        // Setup the dropdown with callback on change
        incomingRoutes.$actionDropdown.dropdown({
            onChange: incomingRoutes.toggleDisabledFieldClass
        });

        // Apply initial class change based on dropdown selection
        incomingRoutes.toggleDisabledFieldClass();

        // Initialize the form
        incomingRoutes.initializeForm();

        // Setup the dropdown for forwarding select with options
        $('.forwarding-select').dropdown(Extensions.getDropdownSettingsForRouting());
        // Initialize audio message dropdowns
        $('.audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());

        // Add double click listener to table cells
        $('.rule-row td').on('dblclick', (e) => {
            // When cell is double clicked, navigate to corresponding modify page
            const id = $(e.target).closest('tr').attr('id');
            window.location = `${globalRootUrl}incoming-routes/modify/${id}`;
        });
    },

    /**
     * Callback to execute after dropping an element
     */
    cbOnDrop() {
        let priorityWasChanged = false;
        const priorityData = {};
        $('.rule-row').each((index, obj) => {
            const ruleId = $(obj).attr('id');
            const oldPriority = parseInt($(obj).attr('data-value'), 10);
            const newPriority = obj.rowIndex;
            if (oldPriority !== newPriority) {
                priorityWasChanged = true;
                priorityData[ruleId] = newPriority;
            }
        });
        if (priorityWasChanged) {
            $.api({
                on: 'now',
                url: `${globalRootUrl}incoming-routes/changePriority`,
                method: 'POST',
                data: priorityData,
            });
        }
    },

    /**
     * Toggle class for disabled field based on dropdown selection
     */
    toggleDisabledFieldClass() {
        let $action = incomingRoutes.$formObj.form('get value', 'action');
        if ($action === 'extension') {
            $('#extension-group').show();
            $('#audio-group').hide();
            $('#audio_message_id').dropdown('clear');
        } else if($action === 'playback'){
            $('#extension-group').hide();
            $('#audio-group').show();
            $('#extension').dropdown('clear');
        } else {
            $('#audio-group').hide();
            $('#extension-group').hide();
            $('#extension').dropdown('clear');
            $('#audio_message_id').dropdown('clear');
        }
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = incomingRoutes.$formObj.form('get values');
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {

    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = incomingRoutes.$formObj;
        Form.url = `${globalRootUrl}incoming-routes/save`; // Form submission URL
        Form.validateRules = incomingRoutes.validateRules; // Form validation rules
        Form.cbBeforeSendForm = incomingRoutes.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = incomingRoutes.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

/**
 * Form validation rule for checking if the 'extension' option is chosen and a number is selected.
 *
 * @param {string} value - The value to be checked
 * @returns {boolean} - Returns false if 'extension' is selected but no number is provided. Otherwise, returns true.
 */
$.fn.form.settings.rules.extensionRule = function (value) {
    // If 'extension' is selected and no number is provided (-1 or empty string), return false.
    if (($('#action').val() === 'extension') &&
        (value === -1 || value === '')) {
        return false;
    }

    // If conditions aren't met, return true.
    return true;
};


/**
 *  Initialize incoming routes on document ready
 */
$(document).ready(() => {
    incomingRoutes.initialize();
});
