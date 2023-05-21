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

/* global globalRootUrl, globalTranslate, Form, PbxApi, clockWorker */


/**
 * Object for managing time settings.
 *
 * @module timeSettings
 */
const timeSettings = {

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#time-settings-form'),

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
        $('#PBXTimezone').dropdown({
            fullTextSearch: true,
        });

        $('#time-settings-form .checkbox').checkbox({
            onChange() {
                timeSettings.toggleDisabledFieldClass();
            },
        });
        timeSettings.initializeForm();
        timeSettings.toggleDisabledFieldClass();
    },

    /**
     * Toggles the disabled field class based on the selected time setting.
     */
    toggleDisabledFieldClass() {
        if (timeSettings.$formObj.form('get value', 'PBXManualTimeSettings') === 'on') {
            $('#SetDateTimeBlock').removeClass('disabled');
            $('#SetNtpServerBlock').addClass('disabled');
        } else {
            $('#SetNtpServerBlock').removeClass('disabled');
            $('#SetDateTimeBlock').addClass('disabled');
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
        result.data = timeSettings.$formObj.form('get values');
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        if (timeSettings.$formObj.form('get value', 'PBXManualTimeSettings') === 'on') {
            const manualDate = timeSettings.$formObj.form('get value', 'ManualDateTime');
            const timestamp = Date.parse(`${manualDate}`) / 1000;
            const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            PbxApi.UpdateDateTime({timestamp, userTimeZone});
        }
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = timeSettings.$formObj;
        Form.url = `${globalRootUrl}time-settings/save`; // Form submission URL
        Form.validateRules = timeSettings.validateRules; // Form validation rules
        Form.cbBeforeSendForm = timeSettings.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = timeSettings.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

// When the document is ready, initialize the time settings form
$(document).ready(() => {
    timeSettings.initialize();
});
