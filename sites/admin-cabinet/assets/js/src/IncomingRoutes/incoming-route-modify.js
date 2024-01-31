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

/* global $,globalRootUrl,globalTranslate, Extensions, Form */


/**
 * Object for managing incoming route record
 *
 * @module incomingRouteModify
 */
const incomingRouteModify = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#incoming-route-form'),

    $providerDropDown: $('#provider'),
    $forwardingSelectDropdown: $('#incoming-route-form .forwarding-select'),

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
                    type: 'empty',
                    prompt: globalTranslate.ir_ValidateForwardingToBeFilled,
                },
            ],
        },
        timeout: {
            identifier: 'timeout',
            rules: [
                {
                    type: 'integer[3..7400]',
                    prompt: globalTranslate.ir_ValidateTimeoutOutOfRange,
                },
            ],
        },
    },

    /**
     * Initialize the object
     */
    initialize() {

        // Setup the dropdown for provider field
        incomingRouteModify.$providerDropDown.dropdown();

        // Initialize audio message dropdowns
        $('.audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());

        // Initialize the form
        incomingRouteModify.initializeForm();

        // Setup the dropdown for forwarding select with options
        incomingRouteModify.$forwardingSelectDropdown.dropdown(Extensions.getDropdownSettingsForRouting());
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = incomingRouteModify.$formObj.form('get values');
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
        Form.$formObj = incomingRouteModify.$formObj;
        Form.url = `${globalRootUrl}incoming-routes/save`; // Form submission URL
        Form.validateRules = incomingRouteModify.validateRules; // Form validation rules
        Form.cbBeforeSendForm = incomingRouteModify.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = incomingRouteModify.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};


/**
 *  Initialize incoming route edit form on document ready
 */
$(document).ready(() => {
    incomingRouteModify.initialize();
});
