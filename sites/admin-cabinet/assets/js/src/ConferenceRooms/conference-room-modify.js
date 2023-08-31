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

/* global globalRootUrl,globalTranslate, Extensions, Form  */

/**
 * Conference module, providing functionality related to conference room management.
 * @module conference
 */
const conference = {
    // jQuery object referencing the extension field in the conference room form
    $number: $('#extension'),

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#conference-room-form'),

    // Default value for the extension field in the conference room form
    defaultExtension: '',

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
                    prompt: globalTranslate.cr_ValidateNameEmpty,
                },
            ],
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'number',
                    prompt: globalTranslate.cr_ValidateExtensionNumber,
                },
                {
                    type: 'minLength[2]',
                    prompt: globalTranslate.cr_ValidateExtensionLen,
                },
                {
                    type: 'empty',
                    prompt: globalTranslate.cr_ValidateExtensionEmpty,
                },
                {
                    type: 'existRule[extension-error]',
                    prompt: globalTranslate.cr_ValidateExtensionDouble,
                },
            ],
        },
        pinCode: {
            identifier: 'pinCode',
            rules: [
                {
                    type: 'number',
                    prompt: globalTranslate.cr_ValidatePinNumber,
                },
            ],
        },
    },
    /**
     * Initialize the conference room management functionality.
     * This method adds handlers and initializes the form.
     */
    initialize() {

        // Add handler to dynamically check if the input number is available
        let timeoutId;
        conference.$number.on('input', () => {
            // Clear the previous timer, if it exists
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            // Set a new timer with a delay of 0.5 seconds
            timeoutId = setTimeout(() => {
                // Get the newly entered number
                const newNumber = conference.$formObj.form('get value', 'extension');

                // Execute the availability check for the number
                Extensions.checkAvailability(conference.defaultNumber, newNumber);
            }, 500);
        });

        // Initialize the conference room form
        conference.initializeForm();

        // Get the default extension from the form
        conference.defaultExtension = conference.$formObj.form('get value', 'extension');
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = conference.$formObj.form('get values');
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
        Form.$formObj = conference.$formObj;
        Form.url = `${globalRootUrl}conference-rooms/save`; // Form submission URL
        Form.validateRules = conference.validateRules; // Form validation rules
        Form.cbBeforeSendForm = conference.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = conference.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

/**
 * Checks if the number is taken by another account
 * @returns {boolean} True if the parameter has the 'hidden' class, false otherwise
 */
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');


// Initialize the conference room modify form when the document is ready
$(document).ready(() => {
    conference.initialize();
});

