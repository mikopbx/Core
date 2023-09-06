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

/* global globalRootUrl, globalTranslate, Extensions,Form, SoundFilesSelector */


/**
 * callQueue module.
 * @module callQueue
 */
const callQueue = {

    // Default extension number
    defaultExtension: '',

    // The input field for the extension number
    $extension: $('#extension'),

    // List of available members for this call queue
    AvailableMembersList: [],

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#queue-form'),

    // The accordion UI components in the form
    $accordions: $('#queue-form .ui.accordion'),

    // The dropdown UI components in the form
    $dropDowns: $('#queue-form .dropdown'),

    // The field for form error messages
    $errorMessages: $('#form-error-messages'),

    // The checkbox UI components in the form
    $checkBoxes: $('#queue-form .checkbox'),

    // The select for forwarding in the form
    forwardingSelect: '#queue-form .forwarding-select',

    // The button to delete a row
    $deleteRowButton: $('.delete-row-button'),

    // The dropdown for periodic announce sound selection
    $periodicAnnounceDropdown: $('#queue-form .periodic-announce-sound-id-select'),

    // The row of the member
    memberRow: '#queue-form .member-row',

    // The dropdown for extension selection
    $extensionSelectDropdown: $('#extensionselect'),

    // The table of extensions
    $extensionsTable: $('#extensionsTable'),

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        name: {
            identifier: 'name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.cq_ValidateNameEmpty,
                },
            ],
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'number',
                    prompt: globalTranslate.cq_ValidateExtensionNumber,
                },
                {
                    type: 'empty',
                    prompt: globalTranslate.cq_ValidateExtensionEmpty,
                },
                {
                    type: 'existRule[extension-error]',
                    prompt: globalTranslate.cq_ValidateExtensionDouble,
                },
            ],
        },
    },

    /**
     * Initialize the call queue form
     */
    initialize() {
        // Get phone extensions and set available queue members
        Extensions.getPhoneExtensions(callQueue.setAvailableQueueMembers);

        // Initialize UI components
        callQueue.$accordions.accordion();
        callQueue.$dropDowns.dropdown();
        callQueue.$checkBoxes.checkbox();

        // Set up periodic announce dropdown behaviour
        callQueue.$periodicAnnounceDropdown.dropdown({
            onChange(value) {
                if (parseInt(value, 10) === -1) {
                    callQueue.$periodicAnnounceDropdown.dropdown('clear');
                }
            },
        });

        // Initialize forwarding select
        $(callQueue.forwardingSelect).dropdown(Extensions.getDropdownSettingsWithEmpty());

        // Set up dynamic availability check for extension number
        callQueue.$extension.on('change', () => {
            const newNumber = callQueue.$formObj.form('get value', 'extension');
            Extensions.checkAvailability(callQueue.defaultNumber, newNumber);
        });

        // Initialize drag and drop for extension table rows
        callQueue.initializeDragAndDropExtensionTableRows();

        // Set up row deletion from queue members table
        callQueue.$deleteRowButton.on('click', (e) => {
            e.preventDefault();
            $(e.target).closest('tr').remove();
            callQueue.reinitializeExtensionSelect();
            callQueue.updateExtensionTableView();
            Form.dataChanged();

            return false;
        });

        // Initialize audio message select
        $('#queue-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());

        // Initialize the form
        callQueue.initializeForm();

        // Set the default extension number
        callQueue.defaultExtension = callQueue.$formObj.form('get value','extension');
    },

    /**
     * Set available members for the call queue
     * @param {Object} arrResult - The list of available members
     */
    setAvailableQueueMembers(arrResult) {
        // Loop through the result and populate AvailableMembersList
        $.each(arrResult.results, (index, extension) => {
            callQueue.AvailableMembersList.push({
                number: extension.value,
                callerid: extension.name,
            });
        });

        // Reinitialize the extension select and update the view
        callQueue.reinitializeExtensionSelect();
        callQueue.updateExtensionTableView();
    },

    /**
     * Return the list of available members for the queue
     * @returns {Array} - The list of available members
     */
    getAvailableQueueMembers() {
        const result = [];

        // Loop through available members and add to result if not already selected
        callQueue.AvailableMembersList.forEach((member) => {
            if ($(`.member-row#${member.number}`).length === 0) {
                result.push({
                    name: member.callerid,
                    value: member.number,
                });
            }
        });
        // result.sort((a, b) => ((a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)));
        return result;
    },

    /**
     * Reinitialize extension select with consideration for already selected members
     */
    reinitializeExtensionSelect() {
        // Setup dropdown with available queue members
        callQueue.$extensionSelectDropdown.dropdown({
            action: 'hide',
            forceSelection: false,
            onChange(value, text) {
                // If a value is selected
                if (value) {
                    // Get the last template row, clone it and populate with the selected member data
                    const $tr = $('.member-row-tpl').last();
                    const $clone = $tr.clone(true);
                    $clone
                        .removeClass('member-row-tpl')
                        .addClass('member-row')
                        .show();
                    $clone.attr('id', value);
                    $clone.find('.number').html(value);
                    $clone.find('.callerid').html(text);

                    // Insert the new member row into the table
                    if ($(callQueue.memberRow).last().length === 0) {
                        $tr.after($clone);
                    } else {
                        $(callQueue.memberRow).last().after($clone);
                    }

                    // Reinitialize the extension select and update the view
                    callQueue.reinitializeExtensionSelect();
                    callQueue.updateExtensionTableView();

                    Form.dataChanged();
                }
            },
            // Set the values for the dropdown
            values: callQueue.getAvailableQueueMembers(),

        });
    },

    /**
     * Initialize Drag and Drop functionality for the extension table rows
     */
    initializeDragAndDropExtensionTableRows() {
        callQueue.$extensionsTable.tableDnD({
            onDragClass: 'hoveringRow',  // CSS class to be applied while a row is being dragged
            dragHandle: '.dragHandle',  // Class of the handler to initiate the drag action
            onDrop: () => { // Callback to be executed after a row has been dropped
                // Trigger change event to acknowledge the modification
                Form.dataChanged();
            },
        });
    },

    /**
     * Display a placeholder if the table has zero rows
     */
    updateExtensionTableView() {
        // Placeholder to be displayed
        const dummy = `<tr class="dummy"><td colspan="4" class="center aligned">${globalTranslate.cq_AddQueueMembers}</td></tr>`;

        if ($(callQueue.memberRow).length === 0) {
            $('#extensionsTable tbody').append(dummy); // Add the placeholder if there are no rows
        } else {
            $('#extensionsTable tbody .dummy').remove(); // Remove the placeholder if rows are present
        }
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        let result = settings;

        // Retrieve form values
        result.data = callQueue.$formObj.form('get values');

        const arrMembers = [];

        // Iterate through each member row and add to arrMembers
        $(callQueue.memberRow).each((index, obj) => {
            if ($(obj).attr('id')) {
                arrMembers.push({
                    number: $(obj).attr('id'),
                    priority: index,
                });
            }
        });

        // Validate if any members exist
        if (arrMembers.length === 0) {
            result = false;
            callQueue.$errorMessages.html(globalTranslate.cq_ValidateNoExtensions);
            callQueue.$formObj.addClass('error');
        } else {
            result.data.members = JSON.stringify(arrMembers);
        }

        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        callQueue.defaultNumber = callQueue.$formObj.form('get value','extension');
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = callQueue.$formObj;
        Form.url = `${globalRootUrl}call-queues/save`;  // Form submission URL
        Form.validateRules = callQueue.validateRules; // Form validation rules
        Form.cbBeforeSendForm = callQueue.cbBeforeSendForm;  // Callback before form is sent
        Form.cbAfterSendForm = callQueue.cbAfterSendForm;  // Callback after form is sent
        Form.initialize();
    },
};

/**
 * Checks if the number is taken by another account
 * @returns {boolean} True if the parameter has the 'hidden' class, false otherwise
 */
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');


/**
 *  Initialize Call Queues modify form on document ready
 */
$(document).ready(() => {
    callQueue.initialize();
});

