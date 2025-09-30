/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Form, TimeSettingsAPI, clockWorker, UserMessage, DynamicDropdownBuilder */

/**
 * Object for managing time settings using REST API
 *
 * @module timeSettingsModify
 */
const timeSettingsModify = {

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#time-settings-form'),

    /**
     * Original settings data from API
     * @type {object}
     */
    originalData: {},

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        CurrentDateTime: {
            depends: 'PBXManualTimeSettings',
            identifier: 'ManualDateTime',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ts_ValidateDateTime,
                },
            ],
        },
    },

    /**
     * Initializes the time settings.
     */
    initialize() {
        // Load current settings from API
        timeSettingsModify.loadSettings();

        // Initialize UI elements
        $('#time-settings-form .checkbox').checkbox({
            onChange() {
                timeSettingsModify.toggleDisabledFieldClass();
            },
        });

        timeSettingsModify.initializeForm();
    },

    /**
     * Load settings from REST API
     */
    loadSettings() {
        TimeSettingsAPI.get((response) => {
            if (response.result === true) {
                // Store original data
                timeSettingsModify.originalData = response.data;

                // Populate form with API data
                timeSettingsModify.populateForm(response.data);

                // Apply UI state (this will start/stop worker as needed)
                timeSettingsModify.toggleDisabledFieldClass();
            } else {
                UserMessage.showMultiString(response.messages);
            }
        });
    },

    /**
     * Populate form with data from API using unified approach
     * @param {object} data - Settings data from API
     */
    populateForm(data) {
        // Use unified silent population approach (same as Extensions)
        Form.populateFormSilently(data, {
            afterPopulate: (formData) => {
                // Initialize dropdowns with clean data
                timeSettingsModify.initializeDropdownsWithCleanData(formData);
            }
        });
    },

    /**
     * Initialize dropdowns with clean data - following V5.0 Architecture pattern
     * @param {object} data - Clean data from API
     */
    initializeDropdownsWithCleanData(data) {
        // Build timezone dropdown using DynamicDropdownBuilder with API loading
        DynamicDropdownBuilder.buildDropdown('PBXTimezone', data, {
            apiUrl: `/pbxcore/api/v3/time-settings:getAvailableTimezones`,
            placeholder: globalTranslate.ts_SelectTimezone,
            additionalClasses: ['search'],
            cache: true,
            onResponse: timeSettingsModify.processTimezonesApiResponse
        });
    },

    /**
     * Process API response for timezones dropdown
     * @param {object} response - API response containing timezones
     * @returns {object} Formatted response for dropdown
     */
    processTimezonesApiResponse(response) {
        if (response.result && response.data) {
            return {
                success: true,
                results: Object.keys(response.data).map(tzKey => ({
                    value: tzKey,
                    text: response.data[tzKey]
                }))
            };
        }
        return {
            success: false,
            results: []
        };
    },

    /**
     * Toggles the disabled field class based on the selected time setting.
     */
    toggleDisabledFieldClass() {
        if (timeSettingsModify.$formObj.form('get value', 'PBXManualTimeSettings') === 'on') {
            $('#SetDateTimeBlock').removeClass('disabled');
            $('#SetNtpServerBlock').addClass('disabled');
            // Stop clock worker in manual mode
            clockWorker.stopWorker();
        } else {
            $('#SetNtpServerBlock').removeClass('disabled');
            $('#SetDateTimeBlock').addClass('disabled');
            // Start clock worker in automatic mode
            clockWorker.restartWorker();
        }
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = timeSettingsModify.$formObj.form('get values');

        // Convert checkbox value to boolean for API
        result.data.PBXManualTimeSettings = (result.data.PBXManualTimeSettings === 'on');

        // Add user timezone for manual time setting
        if (result.data.PBXManualTimeSettings === '1' && result.data.ManualDateTime) {
            result.data.userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }

        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        if (response.result === true) {
            // Reload settings to get updated data
            timeSettingsModify.loadSettings();
        } else {
            UserMessage.showMultiString(response.messages);
        }
    },

    /**
     * Initialize the form with REST API integration
     */
    initializeForm() {
        Form.$formObj = timeSettingsModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = timeSettingsModify.validateRules;
        Form.cbBeforeSendForm = timeSettingsModify.cbBeforeSendForm;
        Form.cbAfterSendForm = timeSettingsModify.cbAfterSendForm;

        // REST API integration
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = TimeSettingsAPI;
        Form.apiSettings.saveMethod = 'update';

        // Navigation URLs (empty for singleton resource - stay on same page)
        Form.afterSubmitIndexUrl = '';
        Form.afterSubmitModifyUrl = globalRootUrl + 'time-settings/modify/';

        Form.initialize();
    },
};

// When the document is ready, initialize the time settings form
$(document).ready(() => {
    timeSettingsModify.initialize();
});