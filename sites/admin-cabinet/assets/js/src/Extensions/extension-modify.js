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

/* global globalRootUrl, globalTranslate, Extensions, Form,
 InputMaskPatterns, avatar, extensionStatusLoopWorker */


/**
 * The extension object.
 * Manages the operations and behaviors of the extension edit form
 *
 * @module extension
 */
const extension = {
    defaultEmail: '',
    defaultNumber: '',
    defaultMobileNumber: '',
    $number: $('#number'),
    $sip_secret: $('#sip_secret'),
    $mobile_number: $('#mobile_number'),
    $fwd_forwarding: $('#fwd_forwarding'),
    $fwd_forwardingonbusy: $('#fwd_forwardingonbusy'),
    $fwd_forwardingonunavailable: $('#fwd_forwardingonunavailable'),
    $qualify: $('#qualify'),
    $qualify_freq: $('#qualify-freq'),
    $email: $('#user_email'),

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#extensions-form'),

    /**
     * jQuery object for the tabular menu.
     * @type {jQuery}
     */
    $tabMenuItems: $('#extensions-menu .item'),

    forwardingSelect: '#extensions-form .forwarding-select',

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        number: {
            identifier: 'number',
            rules: [
                {
                    type: 'number',
                    prompt: globalTranslate.ex_ValidateExtensionNumber,
                },
                {
                    type: 'empty',
                    prompt: globalTranslate.ex_ValidateNumberIsEmpty,
                },
                {
                    type: 'existRule[number-error]',
                    prompt: globalTranslate.ex_ValidateNumberIsDouble,
                },
            ],
        },
        mobile_number: {
            optional: true,
            identifier: 'mobile_number',
            rules: [
                {
                    type: 'mask',
                    prompt: globalTranslate.ex_ValidateMobileIsNotCorrect,
                },
                {
                    type: 'existRule[mobile-number-error]',
                    prompt: globalTranslate.ex_ValidateMobileNumberIsDouble,
                },
            ],
        },
        user_email: {
            optional: true,
            identifier: 'user_email',
            rules: [
                {
                    type: 'email',
                    prompt: globalTranslate.ex_ValidateEmailEmpty,
                },
            ],
        },
        user_username: {
            identifier: 'user_username',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ex_ValidateUsernameEmpty,
                },
            ],
        },
        sip_secret: {
            identifier: 'sip_secret',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ex_ValidateSecretEmpty,
                },
                {
                    type: 'minLength[5]',
                    prompt: globalTranslate.ex_ValidateSecretWeak,
                },
                {
                    type: 'notRegExp',
                    value: /[A-z]/,
                    prompt: globalTranslate.ex_PasswordNoLowSimvol
                },
                {
                    type: 'notRegExp',
                    value: /\d/,
                    prompt: globalTranslate.ex_PasswordNoNumbers
                },
            ],
        },
        fwd_ringlength: {
            identifier: 'fwd_ringlength',
            depends: 'fwd_forwarding',
            rules: [
                {
                    type: 'integer[3..180]',
                    prompt: globalTranslate.ex_ValidateRingingBeforeForwardOutOfRange,
                },
            ],
        },
        fwd_forwarding: {
            optional: true,
            identifier: 'fwd_forwarding',
            rules: [
                {
                    type: 'extensionRule',
                    prompt: globalTranslate.ex_ValidateForwardingToBeFilled,
                },
                {
                    type: 'different[number]',
                    prompt: globalTranslate.ex_ValidateForwardingToBeDifferent,
                },
            ],
        },
        fwd_forwardingonbusy: {
            identifier: 'fwd_forwardingonbusy',
            rules: [
                {
                    type: 'different[number]',
                    prompt: globalTranslate.ex_ValidateForwardingToBeDifferent,
                },
            ],
        },
        fwd_forwardingonunavailable: {
            identifier: 'fwd_forwardingonunavailable',
            rules: [
                {
                    type: 'different[number]',
                    prompt: globalTranslate.ex_ValidateForwardingToBeDifferent,
                },
            ],
        },

    },
    /**
     * Initializes the extension form and its interactions.
     */
    initialize() {
        // Set default values for email, mobile number, and extension number
        extension.defaultEmail = extension.$email.inputmask('unmaskedvalue');
        extension.defaultMobileNumber = extension.$mobile_number.inputmask('unmaskedvalue');
        extension.defaultNumber = extension.$number.inputmask('unmaskedvalue');

        // Initialize tab menu items, accordions, and dropdown menus
        extension.$tabMenuItems.tab();
        $('#extensions-form .ui.accordion').accordion();
        $('#extensions-form .dropdown').dropdown();

        // Handle the change event of the "qualify" checkbox
        extension.$qualify.checkbox({
            onChange() {
                if (extension.$qualify.checkbox('is checked')) {
                    extension.$qualify_freq.removeClass('disabled');
                } else {
                    extension.$qualify_freq.addClass('disabled');
                }
            },
        });

        // Initialize the dropdown menu for forwarding select
        $(extension.forwardingSelect).dropdown(Extensions.getDropdownSettingsWithEmpty());

        // Generate a new SIP password if the field is empty
        if (extension.$sip_secret.val() === '') extension.generateNewSipPassword();

        // Attach a click event listener to the "generate new password" button
        $('#generate-new-password').on('click', (e) => {
            e.preventDefault();
            extension.generateNewSipPassword();
            extension.$sip_secret.trigger('change');
        });

        // Set the "oncomplete" event handler for the extension number input
        let timeoutNumberId;
        extension.$number.inputmask('option', {
            oncomplete: ()=>{
                    // Clear the previous timer, if it exists
                    if (timeoutNumberId) {
                        clearTimeout(timeoutNumberId);
                    }
                    // Set a new timer with a delay of 0.5 seconds
                    timeoutNumberId = setTimeout(() => {
                        extension.cbOnCompleteNumber();
                    }, 500);
            }
        });
        extension.$number.on('paste', function() {
            extension.cbOnCompleteNumber();
        });

        // Set up the input masks for the mobile number input
        const maskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
        extension.$mobile_number.inputmasks({
            inputmask: {
                definitions: {
                    '#': {
                        validator: '[0-9]',
                        cardinality: 1,
                    },
                },
                oncleared: extension.cbOnClearedMobileNumber,
                oncomplete: extension.cbOnCompleteMobileNumber,
                onBeforePaste: extension.cbOnMobileNumberBeforePaste,
                showMaskOnHover: false,
            },
            match: /[0-9]/,
            replace: '9',
            list: maskList,
            listKey: 'mask',
        });

        // Set up the input mask for the email input
        let timeoutEmailId;
        extension.$email.inputmask('email', {
            oncomplete: ()=>{
                // Clear the previous timer, if it exists
                if (timeoutEmailId) {
                    clearTimeout(timeoutEmailId);
                }
                // Set a new timer with a delay of 0.5 seconds
                timeoutEmailId = setTimeout(() => {
                    extension.cbOnCompleteEmail();
                }, 500);
            },
        });
        extension.$email.on('paste', function() {
            extension.cbOnCompleteEmail();
        });

        // Attach a focusout event listener to the mobile number input
        extension.$mobile_number.focusout(function (e) {
            let phone = $(e.target).val().replace(/[^0-9]/g, "");
            if (phone === '') {
                $(e.target).val('');
            }
        });

        // Initialize popups for question icons
        $("i.question").popup();

        // Initialize the extension form
        extension.initializeForm();
    },
    /**
     * Callback after paste mobile number from clipboard
     */
    cbOnMobileNumberBeforePaste(pastedValue) {
        return pastedValue;
    },
    /**
     * It is executed after a phone number has been entered completely.
     * It serves to check if there are any conflicts with existing phone numbers.
     */
    cbOnCompleteNumber() {
        // Retrieve the entered phone number after removing any input mask
        const newNumber = extension.$number.inputmask('unmaskedvalue');

        // Retrieve the user ID from the form
        const userId = extension.$formObj.form('get value', 'user_id');

        // Call the `checkAvailability` function on `Extensions` object
        // to check whether the entered phone number is already in use.
        // Parameters: default number, new number, class name of error message (number), user id
        Extensions.checkAvailability(extension.defaultNumber, newNumber, 'number', userId);
    },
    /**
     * It is executed once an email address has been completely entered.
     */
    cbOnCompleteEmail() {

        // Retrieve the entered phone number after removing any input mask
        const newEmail = extension.$email.inputmask('unmaskedvalue');

        // Retrieve the user ID from the form
        const userId = extension.$formObj.form('get value', 'user_id');

        // Call the `checkAvailability` function on `UsersAPI` object
        // to check whether the entered email is already in use.
        // Parameters: default email, new email, class name of error message (email), user id
        UsersAPI.checkAvailability(extension.defaultEmail, newEmail,'email', userId);
    },

    /**
     * Activated when entering a mobile phone number in the employee's profile.
     */
    cbOnCompleteMobileNumber() {
        // Get the new mobile number without any input mask
        const newMobileNumber = extension.$mobile_number.inputmask('unmaskedvalue');

        // Get user ID from the form
        const userId = extension.$formObj.form('get value', 'user_id');

        // Dynamic check to see if the selected mobile number is available
        Extensions.checkAvailability(extension.defaultMobileNumber, newMobileNumber, 'mobile-number', userId);

        // Refill the mobile dialstring if the new mobile number is different than the default or if the mobile dialstring is empty
        if (newMobileNumber !== extension.defaultMobileNumber
            || (extension.$formObj.form('get value', 'mobile_dialstring').length === 0)
        ) {
            extension.$formObj.form('set value', 'mobile_dialstring', newMobileNumber);
        }

        // Check if the mobile number has changed
        if (newMobileNumber !== extension.defaultMobileNumber) {
            // Get the user's username from the form
            const userName = extension.$formObj.form('get value', 'user_username');

            // Check if call forwarding was set to the default mobile number
            if (extension.$formObj.form('get value', 'fwd_forwarding') === extension.defaultMobileNumber) {
                // If the ring length is empty, set it to 45
                if (extension.$formObj.form('get value', 'fwd_ringlength').length === 0) {
                    extension.$formObj.form('set value', 'fwd_ringlength', 45);
                }

                // Set the new forwarding mobile number in the dropdown and form
                extension.$fwd_forwarding
                    .dropdown('set text', `${userName} <${newMobileNumber}>`)
                    .dropdown('set value', newMobileNumber);
                extension.$formObj.form('set value', 'fwd_forwarding', newMobileNumber);
            }

            // Check if call forwarding on busy was set to the default mobile number
            if (extension.$formObj.form('get value', 'fwd_forwardingonbusy') === extension.defaultMobileNumber) {
                // Set the new forwarding mobile number in the dropdown and form
                extension.$fwd_forwardingonbusy
                    .dropdown('set text', `${userName} <${newMobileNumber}>`)
                    .dropdown('set value', newMobileNumber);
                extension.$formObj.form('set value', 'fwd_forwardingonbusy', newMobileNumber);
            }

            // Check if call forwarding on unavailable was set to the default mobile number
            if (extension.$formObj.form('get value', 'fwd_forwardingonunavailable') === extension.defaultMobileNumber) {
                // Set the new forwarding mobile number in the dropdown and form
                extension.$fwd_forwardingonunavailable
                    .dropdown('set text', `${userName} <${newMobileNumber}>`)
                    .dropdown('set value', newMobileNumber);
                extension.$formObj.form('set value', 'fwd_forwardingonunavailable', newMobileNumber);
            }
        }
        // Set the new mobile number as the default
        extension.defaultMobileNumber = newMobileNumber;
    },

    /**
     * Called when the mobile phone number is cleared in the employee card.
     */
    cbOnClearedMobileNumber() {
        // Clear the 'mobile_dialstring' and 'mobile_number' fields in the form
        extension.$formObj.form('set value', 'mobile_dialstring', '');
        extension.$formObj.form('set value', 'mobile_number', '');

        // Check if forwarding was set to the mobile number
        if (extension.$formObj.form('get value', 'fwd_forwarding') === extension.defaultMobileNumber) {
            // If so, clear the 'fwd_ringlength' field and set 'fwd_forwarding' to -1
            extension.$formObj.form('set value', 'fwd_ringlength', 0);
            extension.$fwd_forwarding.dropdown('set text', '-').dropdown('set value', -1);
            extension.$formObj.form('set value', 'fwd_forwarding', -1);
        }

        // Check if forwarding when busy was set to the mobile number
        if (extension.$formObj.form('get value', 'fwd_forwardingonbusy') === extension.defaultMobileNumber) {
            // If so, set 'fwd_forwardingonbusy' to -1
            extension.$fwd_forwardingonbusy.dropdown('set text', '-').dropdown('set value', -1);
            extension.$formObj.form('set value', 'fwd_forwardingonbusy', -1);
        }

        // Check if forwarding when unavailable was set to the mobile number
        if (extension.$formObj.form('get value', 'fwd_forwardingonunavailable') === extension.defaultMobileNumber) {
            // If so, set 'fwd_forwardingonunavailable' to -1
            extension.$fwd_forwardingonunavailable.dropdown('set text', '-').dropdown('set value', -1);
            extension.$formObj.form('set value', 'fwd_forwardingonunavailable', -1);
        }

        // Clear the default mobile number
        extension.defaultMobileNumber = '';
    },

    /**
     * Generate a new SIP password.
     * The generated password will consist of 32 characters from a set of predefined characters.
     */
    generateNewSipPassword() {
        // Predefined characters to be used in the password
        const chars = 'abcdef1234567890';

        // Initialize the password string
        let pass = '';

        // Generate a 32 characters long password
        for (let x = 0; x < 32; x += 1) {
            // Select a random character from the predefined characters
            const i = Math.floor(Math.random() * chars.length);

            // Add the selected character to the password
            pass += chars.charAt(i);
        }

        // Set the generated password as the SIP password
        extension.$sip_secret.val(pass);
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = extension.$formObj.form('get values');
        result.data.mobile_number = extension.$mobile_number.inputmask('unmaskedvalue');

        extension.$formObj.find('.checkbox').each((index, obj) => {
            const input = $(obj).find('input');
            const id = input.attr('id');
            if ($(obj).checkbox('is checked')) {
                result.data[id]='1';
            } else {
                result.data[id]='0';
            }
        });

        return result;
    },
    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        if (PbxApi.successTest(response)){
            if (response.data.id!==undefined
                && extension.$formObj.form('get value','id') !== response.data.id){
                window.location=`${globalRootUrl}extensions/modify/${response.data.id}`
            }

            // Store the current extension number as the default number
            extension.defaultNumber = extension.$number.val();

            // Update the phone representation with the new default number
            Extensions.updatePhoneRepresent(extension.defaultNumber);

            Form.initialize();
        } else {
            UserMessage.showMultiString(response.messages);
        }

    },
    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = extension.$formObj;
        Form.url = `${Config.pbxUrl}/pbxcore/api/extensions/saveRecord`; // Form submission URL
        Form.validateRules = extension.validateRules; // Form validation rules
        Form.cbBeforeSendForm = extension.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = extension.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};


/**
 * Define a custom rule for jQuery form validation named 'extensionRule'.
 * The rule checks if a forwarding number is selected but the ring length is zero or not set.
 * @returns {boolean} - The validation result. If forwarding is set and ring length is zero or not set, it returns false (invalid). Otherwise, it returns true (valid).
 */
$.fn.form.settings.rules.extensionRule = () => {
    // Get ring length and forwarding number from the form
    const fwdRingLength = extension.$formObj.form('get value', 'fwd_ringlength');
    const fwdForwarding = extension.$formObj.form('get value', 'fwd_forwarding');

    // If forwarding number is set and ring length is zero or not set, return false (invalid)
    if (fwdForwarding.length > 0
        && (
            fwdRingLength === 0
            ||
            fwdRingLength === ''
        )) {
        return false;
    }

    // Otherwise, return true (valid)
    return true;
};

/**
 * Checks if the number is taken by another account
 * @returns {boolean} True if the parameter has the 'hidden' class, false otherwise
 */
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');


/**
 *  Initialize Employee form on document ready
 */
$(document).ready(() => {
    extension.initialize();
    avatar.initialize();
    extensionStatusLoopWorker.initialize();
});
