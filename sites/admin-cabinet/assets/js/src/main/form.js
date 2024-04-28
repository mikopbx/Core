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

/* global globalRootUrl, globalTranslate */

/**
 * The Form object is responsible for sending forms data to backend
 *
 * @module Form
 */
const Form = {

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: '',

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {},

    /**
     * Dirty check field, for checking if something on the form was changed
     * @type {jQuery}
     */
    $dirrtyField: $('#dirrty'),

    url: '',
    cbBeforeSendForm: '',
    cbAfterSendForm: '',
    $submitButton: $('#submitbutton'),
    $dropdownSubmit: $('#dropdownSubmit'),
    $submitModeInput: $('input[name="submitMode"]'),
    processData: true,
    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    keyboardShortcuts: true,
    enableDirrity: true,
    afterSubmitIndexUrl: '',
    afterSubmitModifyUrl: '',
    oldFormValues: [],
    initialize() {
        // Set up custom form validation rules
        Form.$formObj.form.settings.rules.notRegExp = Form.notRegExpValidateRule;
        Form.$formObj.form.settings.rules.specialCharactersExist = Form.specialCharactersExistValidateRule;

        if (Form.enableDirrity) {
            // Initialize dirrity if enabled
            Form.initializeDirrity();
        }

        // Handle click event on submit button
        Form.$submitButton.on('click', (e) => {
            e.preventDefault();
            if (Form.$submitButton.hasClass('loading')) return;
            if (Form.$submitButton.hasClass('disabled')) return;

            // Set up form validation and submit
            Form.$formObj
                .form({
                    on: 'blur',
                    fields: Form.validateRules,
                    onSuccess() {
                        // Call submitForm() on successful validation
                        Form.submitForm();
                    },
                    onFailure() {
                        // Add error class to form on validation failure
                        Form.$formObj.removeClass('error').addClass('error');
                    },
                });
            Form.$formObj.form('validate form');
        });

        // Handle dropdown submit
        if (Form.$dropdownSubmit.length > 0) {
            Form.$dropdownSubmit.dropdown({
                onChange: (value) => {
                    const translateKey = `bt_${value}`;
                    Form.$submitModeInput.val(value);
                    Form.$submitButton
                        .html(`<i class="save icon"></i> ${globalTranslate[translateKey]}`)
                        .click();
                },
            });
        }

        // Prevent form submission on enter keypress
        Form.$formObj.on('submit', (e) => {
            e.preventDefault();
        });
    },

    /**
     * Initializes tracking of form changes.
     */
    initializeDirrity() {
        Form.saveInitialValues();
        Form.setEvents();
        Form.$submitButton.addClass('disabled');
        Form.$dropdownSubmit.addClass('disabled');
    },

    /**
     * Saves the initial form values for comparison.
     */
    saveInitialValues() {
        Form.oldFormValues = Form.$formObj.form('get values');
    },

    /**
     * Sets up event handlers for form objects.
     */
    setEvents() {
        Form.$formObj.find('input, select').change(() => {
            Form.checkValues();
        });
        Form.$formObj.find('input, textarea').on('keyup keydown blur', () => {
            Form.checkValues();
        });
        Form.$formObj.find('.ui.checkbox').on('click', () => {
            Form.checkValues();
        });
    },

    /**
     * Compares the old and new form values for changes.
     */
    checkValues() {
        const newFormValues = Form.$formObj.form('get values');
        if (JSON.stringify(Form.oldFormValues) === JSON.stringify(newFormValues)) {
            Form.$submitButton.addClass('disabled');
            Form.$dropdownSubmit.addClass('disabled');
        } else {
            Form.$submitButton.removeClass('disabled');
            Form.$dropdownSubmit.removeClass('disabled');
        }
    },

    /**
     *  Changes the value of '$dirrtyField' to trigger
     *  the 'change' form event and enable submit button.
     */
    dataChanged() {
        if (Form.enableDirrity) {
            Form.$dirrtyField.val(Math.random());
            Form.$dirrtyField.trigger('change');
        }
    },

    /**
     * Submits the form to the server.
     */
    submitForm() {
        $.api({
            url: Form.url,
            on: 'now',
            method: 'POST',
            processData: Form.processData,
            contentType: Form.contentType,
            keyboardShortcuts: Form.keyboardShortcuts,

            /**
             * Executes before sending the request.
             * @param {object} settings - The API settings object.
             * @returns {object} - The modified API settings object.
             */
            beforeSend(settings) {
                // Add 'loading' class to the submit button
                Form.$submitButton.addClass('loading');

                // Call cbBeforeSendForm function and handle the result
                const cbBeforeSendResult = Form.cbBeforeSendForm(settings);
                if (cbBeforeSendResult === false) {
                    // If cbBeforeSendForm returns false, remove 'loading' class and perform a 'shake' transition on the submit button
                    Form.$submitButton
                        .transition('shake')
                        .removeClass('loading');
                } else {
                    // Iterate over cbBeforeSendResult data, trim string values, and exclude sensitive information from being modified
                    $.each(cbBeforeSendResult.data, (index, value) => {
                        if (index.indexOf('ecret') > -1 || index.indexOf('assword') > -1) return;
                        if (typeof value === 'string') cbBeforeSendResult.data[index] = value.trim();
                    });
                }
                return cbBeforeSendResult;
            },

            /**
             * Executes when the request is successful.
             * @param {object} response - The response object.
             */
            onSuccess(response) {
                // Remove any existing AJAX messages
                $('.ui.message.ajax').remove();

                // Iterate over response message and handle errors
                $.each(response.message, (index, value) => {
                    if (index === 'error') {
                        // If there is an error, perform a 'shake' transition on the submit button and add an error message after the form
                        Form.$submitButton.transition('shake').removeClass('loading');
                        Form.$formObj.after(`<div class="ui ${index} message ajax">${value}</div>`);
                    }
                });
                // Dispatch 'ConfigDataChanged' event
                const event = document.createEvent('Event');
                event.initEvent('ConfigDataChanged', false, true);
                window.dispatchEvent(event);

                // Call cbAfterSendForm function
                Form.cbAfterSendForm(response);

                // Check response conditions and perform necessary actions
                if (Form.checkSuccess(response)) {
                    const submitMode = Form.$submitModeInput.val();
                    const reloadPath = Form.getReloadPath(response);

                    // Redirect based on submitMode and other conditions
                    switch (submitMode) {
                        case 'SaveSettings':
                            // Redirect to the specified URL if conditions are met
                            if (reloadPath.length > 0) {
                                window.location = globalRootUrl + reloadPath;
                            }
                            break;
                        case 'SaveSettingsAndAddNew':
                            if (Form.afterSubmitModifyUrl.length > 1) {
                                window.location = Form.afterSubmitModifyUrl;
                            } else {
                                const emptyUrl = window.location.href.split('modify');
                                let action = 'modify';
                                let prefixData = emptyUrl[1].split('/');
                                if (prefixData.length > 0) {
                                    action = action + prefixData[0];
                                }
                                if (emptyUrl.length > 1) {
                                    window.location = `${emptyUrl[0]}${action}/`;
                                }
                            }
                            break;
                        case 'SaveSettingsAndExit':
                            if (Form.afterSubmitIndexUrl.length > 1) {
                                window.location = Form.afterSubmitIndexUrl;
                            } else {
                                Form.redirectToAction('index');
                            }
                            break;
                        default:
                            if (reloadPath.length > 0) {
                                // Redirect to the specified URL if conditions are met
                                window.location = globalRootUrl + reloadPath;
                            }
                            break;
                    }
                    if (Form.enableDirrity) {
                        // Initialize dirrity if conditions are met
                        Form.initializeDirrity();
                    }
                }
                // Remove 'loading' class from the submit button
                Form.$submitButton.removeClass('loading');
            },

            /**
             * Executes when the request fails.
             * @param {object} response - The response object.
             */
            onFailure(response) {
                // Add the response message after the form and perform a 'shake' transition on the submit button
                Form.$formObj.after(response);
                Form.$submitButton
                    .transition('shake')
                    .removeClass('loading');
            },

        });
    },
    /**
     * Checks if the response is successful
     */
    checkSuccess(response) {
        return !!(response.success || response.result);
    },

    /**
     * Extracts reload path from response.
     */
    getReloadPath(response) {
        if (response.reload !== undefined && response.reload.length > 0) {
            return response.reload;
        }
        return '';
    },

    /**
     * Function to redirect to a specific action ('modify' or 'index')
     */
    redirectToAction(actionName) {
        const baseUrl = window.location.href.split('modify')[0];
        window.location = `${baseUrl}${actionName}/`;
    },

    /**
     * Checks if the value does not match the regex pattern.
     * @param {string} value - The value to validate.
     * @param {RegExp} regex - The regex pattern to match against.
     * @returns {boolean} - True if the value does not match the regex, false otherwise.
     */
    notRegExpValidateRule(value, regex) {
        return value.match(regex) !== null;
    },

    /**
     * Checks if the value contains special characters.
     * @param {string} value - The value to validate.
     * @returns {boolean} - True if the value contains special characters, false otherwise.
     */
    specialCharactersExistValidateRule(value) {
        return value.match(/[()$^;#"><,.%№@!+=_]/) === null;
    }
};

// export default Form;
