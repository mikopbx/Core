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

/* global globalRootUrl,globalTranslate,Form */

const loginForm = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#login-form'),

    /**
     * The jQuery object for the submit button.
     * @type {jQuery}
     */
    $submitButton: $('#submitbutton'),

    /**
     * The jQuery object for the checkboxes.
     * @type {jQuery}
     */
    $checkBoxes: $('.checkbox'),

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        login: {
            identifier: 'login',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.auth_ValidateLoginNotEmpty,
                },
            ],
        },
        password: {
            identifier: 'password',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.auth_ValidatePasswordNotEmpty,
                },
            ],
        },
    },

    /**
     * Initializes the login form functionality.
     */
    initialize() {
        loginForm.initializeForm();
        $('input')
            .keyup((event) => {
                if (event.keyCode === 13) {
                    loginForm.$submitButton.click();
                }
            })
            .on('input', () => {
                $('.message.ajax').remove();
            });
        loginForm.$checkBoxes.checkbox();
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = loginForm.$formObj.form('get values');
        let backUri = `${location.pathname}${location.search}`;
        result.data.backUri = backUri.replace(globalRootUrl, '');
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
        Form.$formObj = loginForm.$formObj;
        Form.url = `${globalRootUrl}session/start`; // Form submission URL
        Form.validateRules = loginForm.validateRules; // Form validation rules
        Form.cbBeforeSendForm = loginForm.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = loginForm.cbAfterSendForm; // Callback after form is sent
        Form.keyboardShortcuts = false;
        Form.initialize();
    },
};

// When the document is ready, initialize the login form.
$(document).ready(() => {
    loginForm.initialize();
});

