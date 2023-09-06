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

/* global globalRootUrl,globalTranslate, Form, PbxApi, UserMessage */


/**
 * Object for managing mail settings
 *
 * @module mailSettings
 */
const mailSettings = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#mail-settings-form'),

    /**
     * jQuery object for the checkboxes.
     * @type {jQuery}
     */
    $checkBoxes: $('#mail-settings-form .checkbox'),

    /**
     * jQuery object for the menu items.
     * @type {jQuery}
     */
    $menuItems: $('#mail-settings-menu .item'),

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
    },

    // Initialize the mail settings page.
    initialize() {
        mailSettings.$menuItems.tab();
        mailSettings.$checkBoxes.checkbox();
        mailSettings.initializeForm();
    },

    /**
     * Callback function after updating mail settings.
     * @param {Object} response - The response object from the server.
     */
    updateMailSettingsCallback(response) {
        if (response.result === true) {
            mailSettings.$formObj.after(`<div class="ui success message ajax">${globalTranslate.ms_TestEmailSubject}</div>`);
            const testEmail = mailSettings.$formObj.form('get value', 'SystemNotificationsEmail');
            if (testEmail.length > 0) {
                const params = {
                    email: testEmail,
                    subject: globalTranslate.ms_TestEmailSubject,
                    body: globalTranslate.ms_TestEmailBody,
                    encode: '',
                };
                PbxApi.SendTestEmail(params, mailSettings.cbAfterEmailSend);
            }
        }
    },

    /**
     * Callback function after sending a test email.
     * @param {string|boolean} message - The message or result from the server.
     */
    cbAfterEmailSend(message) {
        if (message === true) {
            UserMessage.showInformation(globalTranslate.ms_TestEmailSentSuccessfully);
        } else if (message.length > 0) {
            UserMessage.showMultiString(message);
        }
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = mailSettings.$formObj.form('get values');
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        if (response.success === true) {
            PbxApi.UpdateMailSettings(mailSettings.updateMailSettingsCallback);
        }
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = mailSettings.$formObj;
        Form.url = `${globalRootUrl}mail-settings/save`; // Form submission URL
        Form.validateRules = mailSettings.validateRules; // Form validation rules
        Form.cbBeforeSendForm = mailSettings.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = mailSettings.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

/**
 *  Initialize mail settings form on document ready
 */
$(document).ready(() => {
    mailSettings.initialize();
});
