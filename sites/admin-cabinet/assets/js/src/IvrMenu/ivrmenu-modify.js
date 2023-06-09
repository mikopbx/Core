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

/* global globalRootUrl, ivrActions, globalTranslate, Form, Extensions, SoundFilesSelector */


const ivrMenu = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#ivr-menu-form'),

    $dropDowns: $('#ivr-menu-form .ui.dropdown'),
    $number: $('#extension'),

    $errorMessages: $('#form-error-messages'),
    $rowTemplate: $('#row-template'),
    defaultExtension: '',
    actionsRowsCount: 0,

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
                    prompt: globalTranslate.iv_ValidateNameIsEmpty,
                },
            ],
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.iv_ValidateExtensionIsEmpty,
                },
                {
                    type: 'existRule',
                    prompt: globalTranslate.iv_ValidateExtensionIsDouble,
                },
            ],
        },
        timeout_extension: {
            identifier: 'timeout_extension',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.iv_ValidateTimeoutExtensionIsEmpty,
                },
            ],
        },
        audio_message_id: {
            identifier: 'audio_message_id',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.iv_ValidateAudioFileIsEmpty,
                },
            ],
        },
        timeout: {
            identifier: 'timeout',
            rules: [
                {
                    type: 'integer[0..99]',
                    prompt: globalTranslate.iv_ValidateTimeoutOutOfRange,
                },
            ],
        },
        number_of_repeat: {
            identifier: 'number_of_repeat',
            rules: [
                {
                    type: 'integer[0..99]',
                    prompt: globalTranslate.iv_ValidateRepeatNumberOutOfRange,
                },
            ],
        },
    },

    initialize() {
        // Initialize dropdowns
        ivrMenu.$dropDowns.dropdown();

        // Dynamic check to see if the selected number is available
        ivrMenu.$number.on('change', () => {
            const newNumber = ivrMenu.$formObj.form('get value', 'extension');
            Extensions.checkAvailability(ivrMenu.defaultNumber, newNumber);
        });

        // Add event listener for adding a new IVR action row
        $('#add-new-ivr-action').on('click', (el) => {
            ivrMenu.addNewActionRow();
            ivrMenu.rebuildActionExtensionsDropdown();

            // Trigger change event to acknowledge the modification
            Form.dataChanged();

            el.preventDefault();
        })

        // Initialize audio message dropdowns
        $('#ivr-menu-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());

        // Initialize the form
        ivrMenu.initializeForm();

        // Build IVR menu actions
        ivrMenu.buildIvrMenuActions();

        // Get the default extension value
        ivrMenu.defaultExtension = ivrMenu.$formObj.form('get value', 'extension');
    },
    /**
     * Create ivr menu items on the form
     */
    buildIvrMenuActions() {
        const objActions = JSON.parse(ivrActions);
        objActions.forEach((element) => {
            ivrMenu.addNewActionRow(element);
        });
        if (objActions.length === 0) ivrMenu.addNewActionRow();

        ivrMenu.rebuildActionExtensionsDropdown();
    },

    /**
     * Adds new form validation rules for a newly added action row.
     * @param {string} newRowId - The ID of the newly added action row.
     */
    addNewFormRules(newRowId) {

        // Create the identifier for the digits field of the new row
        const $digitsClass = `digits-${newRowId}`;

        // Define the validation rules for the digits field
        ivrMenu.validateRules[$digitsClass] = {
            identifier: $digitsClass,
            rules: [
                {
                    type: 'regExp[/^[0-9]{1,7}$/]',
                    prompt: globalTranslate.iv_ValidateDigitsIsNotCorrect,
                },
                {
                    type: 'checkDoublesDigits',
                    prompt: globalTranslate.iv_ValidateDigitsIsNotCorrect,
                },
            ],

        };

        // Create the identifier for the extension field of the new row
        const $extensionClass = `extension-${newRowId}`;

        // Define the validation rules for the extension field
        ivrMenu.validateRules[$extensionClass] = {
            identifier: $extensionClass,
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.iv_ValidateExtensionIsNotCorrect,
                },
            ],

        };
    },

    /**
     * Adds a new action row to the IVR menu form.
     * @param {Object} paramObj - Optional parameter object with initial values for the action row.
     *                            If not provided, default values will be used.
     */
    addNewActionRow(paramObj) {
        // Default parameter values
        let param = {
            id: '',
            extension: '',
            extensionRepresent: '',
            digits: '',
        };

        // Override default values with the provided parameter object
        if (paramObj !== undefined) {
            param = paramObj;
        }

        // Increment the actionsRowsCount
        ivrMenu.actionsRowsCount += 1;

        // Clone the row template and modify its attributes and content
        const $actionTemplate = ivrMenu.$rowTemplate.clone();
        $actionTemplate
            .removeClass('hidden')
            .attr('id', `row-${ivrMenu.actionsRowsCount}`)
            .attr('data-value', ivrMenu.actionsRowsCount)
            .attr('style', '');

        // Set the attributes and values for digits input field
        $actionTemplate.find('input[name="digits-id"]')
            .attr('id', `digits-${ivrMenu.actionsRowsCount}`)
            .attr('name', `digits-${ivrMenu.actionsRowsCount}`)
            .attr('value', param.digits);

        // Set the attributes and values for extension input field
        $actionTemplate.find('input[name="extension-id"]')
            .attr('id', `extension-${ivrMenu.actionsRowsCount}`)
            .attr('name', `extension-${ivrMenu.actionsRowsCount}`)
            .attr('value', param.extension);

        // Set the data-value attribute for the delete-action-row element
        $actionTemplate.find('div.delete-action-row')
            .attr('data-value', ivrMenu.actionsRowsCount);

        // Update the extensionRepresent content based on the provided value or default text
        if (param.extensionRepresent.length > 0) {
            $actionTemplate.find('div.default.text').removeClass('default').html(param.extensionRepresent);
        } else {
            $actionTemplate.find('div.default.text').html(globalTranslate.ex_SelectNumber);
        }

        // Append the action template to the actions-place element
        $('#actions-place').append($actionTemplate);

        // Add new form rules for the newly added action row
        ivrMenu.addNewFormRules(ivrMenu.actionsRowsCount);
    },

    /**
     * Rebuilds the action extensions dropdown by initializing the dropdown settings for routing
     * and attaching the cbOnExtensionSelect callback function to handle the extension selection event.
     */
    rebuildActionExtensionsDropdown() {
        // Initialize the dropdown settings for routing with cbOnExtensionSelect callback function
        $('#ivr-menu-form .forwarding-select').dropdown(Extensions.getDropdownSettingsForRouting(ivrMenu.cbOnExtensionSelect));

        // Attach a click event handler to the delete-action-row elements
        $('.delete-action-row').on('click', function (e) {
            e.preventDefault();

            // Get the 'data-value' attribute of the clicked element
            const id = $(this).attr('data-value');

            // Remove the corresponding rules from validateRules object
            delete ivrMenu.validateRules[`digits-${id}`];
            delete ivrMenu.validateRules[`extension-${id}`];

            // Remove the row with the corresponding id
            $(`#row-${id}`).remove();

            // Trigger change event to acknowledge the modification
            Form.dataChanged();
        });
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        // Copy the settings object to a new variable to avoid modifying the original
        let result = settings;

        // Get the form values from $formObj of ivrMenu
        result.data = ivrMenu.$formObj.form('get values');

        // Initialize an array to store actions
        const arrActions = [];

        // Iterate over each action row
        $('.action-row').each((index, obj) => {
            const rowId = $(obj).attr('data-value');

            // If rowId is greater than 0, get the 'digits' and 'extension' values from the form and push them into the arrActions array
            if (rowId > 0) {
                arrActions.push({
                    digits: ivrMenu.$formObj.form('get value', `digits-${rowId}`),
                    extension: ivrMenu.$formObj.form('get value', `extension-${rowId}`),
                });
            }
        });

        // If there are no action rows, set the result to false, display an error message and add error class to the form
        if (arrActions.length === 0) {
            result = false;
            ivrMenu.$errorMessages.html(globalTranslate.iv_ValidateNoIVRExtensions);
            ivrMenu.$formObj.addClass('error');
        } else {

            // Convert the arrActions array into a JSON string and assign it to 'actions' key in the result data object
            result.data.actions = JSON.stringify(arrActions);
        }

        // Return the modified settings object or false
        return result;
    },
    /**
     * Callback function that triggers when a number is selected from the dropdown menu.
     * It generates a random number and triggers a change event.
     */
    cbOnExtensionSelect() {
        // Trigger change event to acknowledge the modification
        Form.dataChanged();
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
        Form.$formObj = ivrMenu.$formObj;
        Form.url = `${globalRootUrl}ivr-menu/save`; // Form submission URL
        Form.validateRules = ivrMenu.validateRules; // Form validation rules
        Form.cbBeforeSendForm = ivrMenu.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = ivrMenu.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

/**
 * Custom form rule to check if an element with id 'extension-error' has the class 'hidden'.
 */
$.fn.form.settings.rules.existRule = () => $('#extension-error').hasClass('hidden');


/**
 * Custom form rule to check for duplicate digits values.
 * @param {string} value - The value to check for duplicates.
 * @returns {boolean} - True if there are no duplicates, false otherwise.
 */
$.fn.form.settings.rules.checkDoublesDigits = (value) => {
    let count = 0;
    $("input[id^='digits']").each((index, obj) => {
        if (ivrMenu.$formObj.form('get value', `${obj.id}`) === value) count += 1;
    });

    return (count === 1);
};

/**
 *  Initialize IVR menu modify form on document ready
 */
$(document).ready(() => {
    ivrMenu.initialize();
});

