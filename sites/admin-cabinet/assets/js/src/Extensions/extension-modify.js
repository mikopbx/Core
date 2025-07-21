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
 InputMaskPatterns, avatar, extensionStatusLoopWorker, ClipboardJS */


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
        });

        // Show/hide password toggle
        $('#show-hide-password').on('click', (e) => {
            e.preventDefault();
            const $button = $(e.currentTarget);
            const $icon = $button.find('i');
            
            if (extension.$sip_secret.attr('type') === 'password') {
                extension.$sip_secret.attr('type', 'text');
                $icon.removeClass('eye').addClass('eye slash');
            } else {
                extension.$sip_secret.attr('type', 'password');
                $icon.removeClass('eye slash').addClass('eye');
            }
        });

        // Initialize clipboard for password copy
        const clipboard = new ClipboardJS('.clipboard');
        $('.clipboard').popup({
            on: 'manual',
        });

        clipboard.on('success', (e) => {
            $(e.trigger).popup('show');
            setTimeout(() => {
                $(e.trigger).popup('hide');
            }, 1500);
            e.clearSelection();
        });

        clipboard.on('error', (e) => {
            console.error('Action:', e.action);
            console.error('Trigger:', e.trigger);
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

        //extension.$mobile_number.val(new libphonenumber.AsYouType().input('+'+extension.$mobile_number.val()));

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

        extension.$mobile_number.on('paste', function(e) {
            e.preventDefault(); // Предотвращаем стандартное поведение вставки

            // Получаем вставленные данные из буфера обмена
            let pastedData = '';
            if (e.originalEvent.clipboardData && e.originalEvent.clipboardData.getData) {
                pastedData = e.originalEvent.clipboardData.getData('text');
            } else if (window.clipboardData && window.clipboardData.getData) { // Для IE
                pastedData = window.clipboardData.getData('text');
            }

            // Проверяем, начинается ли вставленный текст с '+'
            if (pastedData.charAt(0) === '+') {
                // Сохраняем '+' и удаляем остальные нежелательные символы
                var processedData = '+' + pastedData.slice(1).replace(/\D/g, '');
            } else {
                // Удаляем все символы, кроме цифр
                var processedData = pastedData.replace(/\D/g, '');
            }

            // Вставляем очищенные данные в поле ввода
            const input = this;
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const currentValue = $(input).val();
            const newValue = currentValue.substring(0, start) + processedData + currentValue.substring(end);
            extension.$mobile_number.inputmask("remove");
            extension.$mobile_number.val(newValue);
            // Триггерим событие 'input' для применения маски ввода
            $(input).trigger('input');
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

        //Attach a focusout event listener to the mobile number input
        extension.$mobile_number.focusout(function (e) {
            let phone = $(e.target).val().replace(/[^0-9]/g, "");
            if (phone === '') {
                $(e.target).val('');
            }
        });

        // Initialize popups for question icons and buttons
        $("i.question").popup();
        $('.popuped').popup();

        // Prevent browser password manager for generated passwords
        extension.$sip_secret.on('focus', function() {
            $(this).attr('autocomplete', 'new-password');
        });

        // Initialize the extension form
        extension.initializeForm();
        
        // Initialize tooltips for advanced settings
        extension.initializeTooltips();
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
                if (extension.$formObj.form('get value', 'fwd_ringlength').length === 0
                    || extension.$formObj.form('get value', 'fwd_ringlength')==="0") {
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
            //extension.$formObj.form('set value', 'fwd_forwarding', -1);
        }

        // Check if forwarding when busy was set to the mobile number
        if (extension.$formObj.form('get value', 'fwd_forwardingonbusy') === extension.defaultMobileNumber) {
            // If so, set 'fwd_forwardingonbusy' to -1
            extension.$fwd_forwardingonbusy.dropdown('set text', '-').dropdown('set value', -1);
            //extension.$formObj.form('set value', 'fwd_forwardingonbusy', -1);
        }

        // Check if forwarding when unavailable was set to the mobile number
        if (extension.$formObj.form('get value', 'fwd_forwardingonunavailable') === extension.defaultMobileNumber) {
            // If so, set 'fwd_forwardingonunavailable' to -1
            extension.$fwd_forwardingonunavailable.dropdown('set text', '-').dropdown('set value', -1);
            //extension.$formObj.form('set value', 'fwd_forwardingonunavailable', -1);
        }

        // Clear the default mobile number
        extension.defaultMobileNumber = '';
    },

    /**
     * Generate a new SIP password.
     * The generated password will consist of 16 characters using base64-safe alphabet.
     */
    generateNewSipPassword() {
        // Request 16 chars for unified password length
        PbxApi.PasswordGenerate(16, (password) => {
            extension.$formObj.form('set value', 'sip_secret', password);
            // Update clipboard button attribute
            $('.clipboard').attr('data-clipboard-text', password);
            // Trigger form change to enable save button
            Form.dataChanged();
        });
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
    
    /**
     * Initialize tooltips for advanced settings fields
     */
    initializeTooltips() {
        // Define tooltip configurations for each field
        const tooltipConfigs = {
            mobile_dialstring: extension.buildTooltipContent({
                header: globalTranslate.ex_MobileDialstringTooltip_header,
                description: globalTranslate.ex_MobileDialstringTooltip_desc,
                list: [
                    {
                        term: globalTranslate.ex_MobileDialstringTooltip_usage_header,
                        definition: null
                    },
                    {
                        term: globalTranslate.ex_MobileDialstringTooltip_usage_format,
                        definition: globalTranslate.ex_MobileDialstringTooltip_usage_format_desc
                    },
                    {
                        term: globalTranslate.ex_MobileDialstringTooltip_usage_provider,
                        definition: globalTranslate.ex_MobileDialstringTooltip_usage_provider_desc
                    },
                    {
                        term: globalTranslate.ex_MobileDialstringTooltip_usage_forward,
                        definition: globalTranslate.ex_MobileDialstringTooltip_usage_forward_desc
                    }
                ],
                examplesHeader: globalTranslate.ex_MobileDialstringTooltip_examples_header,
                examples: globalTranslate.ex_MobileDialstringTooltip_examples 
                    ? globalTranslate.ex_MobileDialstringTooltip_examples.split('|') 
                    : [],
                note: globalTranslate.ex_MobileDialstringTooltip_note
            }),
            
            sip_enableRecording: extension.buildTooltipContent({
                header: globalTranslate.ex_SipEnableRecordingTooltip_header,
                description: globalTranslate.ex_SipEnableRecordingTooltip_desc,
                note: globalTranslate.ex_SipEnableRecordingTooltip_note
            }),
            
            sip_dtmfmode: extension.buildTooltipContent({
                header: globalTranslate.ex_SipDtmfmodeTooltip_header,
                description: globalTranslate.ex_SipDtmfmodeTooltip_desc,
                list: {
                    auto: globalTranslate.ex_SipDtmfmodeTooltip_list_auto_desc,
                    rfc4733: globalTranslate.ex_SipDtmfmodeTooltip_list_rfc4733_desc,
                    info: globalTranslate.ex_SipDtmfmodeTooltip_list_info_desc,
                    inband: globalTranslate.ex_SipDtmfmodeTooltip_list_inband_desc,
                    auto_info: globalTranslate.ex_SipDtmfmodeTooltip_list_auto_info_desc
                }
            }),
            
            sip_transport: extension.buildTooltipContent({
                header: globalTranslate.ex_SipTransportTooltip_header,
                description: globalTranslate.ex_SipTransportTooltip_desc,
                list: [
                    {
                        term: globalTranslate.ex_SipTransportTooltip_protocols_header,
                        definition: null
                    },
                    {
                        term: globalTranslate.ex_SipTransportTooltip_udp_tcp,
                        definition: globalTranslate.ex_SipTransportTooltip_udp_tcp_desc
                    },
                    {
                        term: globalTranslate.ex_SipTransportTooltip_udp,
                        definition: globalTranslate.ex_SipTransportTooltip_udp_desc
                    },
                    {
                        term: globalTranslate.ex_SipTransportTooltip_tcp,
                        definition: globalTranslate.ex_SipTransportTooltip_tcp_desc
                    },
                    {
                        term: globalTranslate.ex_SipTransportTooltip_tls,
                        definition: globalTranslate.ex_SipTransportTooltip_tls_desc
                    },
                    {
                        term: globalTranslate.ex_SipTransportTooltip_recommendations_header,
                        definition: null
                    }
                ],
                list2: [
                    globalTranslate.ex_SipTransportTooltip_rec_compatibility
                ]
            }),
            
            sip_networkfilterid: extension.buildTooltipContent({
                header: globalTranslate.ex_SipNetworkfilteridTooltip_header,
                description: globalTranslate.ex_SipNetworkfilteridTooltip_desc,
                warning: {
                    header: globalTranslate.ex_SipNetworkfilteridTooltip_warning_header,
                    text: globalTranslate.ex_SipNetworkfilteridTooltip_warning
                }
            }),
            
            sip_manualattributes: extension.buildTooltipContent({
                header: globalTranslate.ex_SipManualattributesTooltip_header,
                description: globalTranslate.ex_SipManualattributesTooltip_desc,
                list: {
                    rtp_timeout: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_desc,
                    rtp_timeout_hold: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_hold_desc,
                    max_audio_streams: globalTranslate.ex_SipManualattributesTooltip_list_max_audio_streams_desc,
                    device_state_busy_at: globalTranslate.ex_SipManualattributesTooltip_list_device_state_busy_at_desc,
                    max_contacts: globalTranslate.ex_SipManualattributesTooltip_list_max_contacts_desc,
                    remove_existing: globalTranslate.ex_SipManualattributesTooltip_list_remove_existing_desc
                },
                examples: [
                    '[endpoint]',
                    'rtp_timeout = 300',
                    'rtp_timeout_hold = 300',
                    'max_audio_streams = 2',
                    'device_state_busy_at = 3',
                    '',
                    '[aor]',
                    'max_contacts=10',
                    'remove_existing = yes',
                    '',
                    '[acl]',
                    'permit=192.168.1.100',
                    'permit=192.168.1.101'

                ],
                warning: {
                    header: globalTranslate.ex_SipManualattributesTooltip_warning_header,
                    text: globalTranslate.ex_SipManualattributesTooltip_warning
                }
            })
        };
        
        // Initialize tooltip for each field info icon
        $('.field-info-icon').each((index, element) => {
            const $icon = $(element);
            const fieldName = $icon.data('field');
            const content = tooltipConfigs[fieldName];
            
            if (content) {
                $icon.popup({
                    html: content,
                    position: 'top right',
                    hoverable: true,
                    delay: {
                        show: 300,
                        hide: 100
                    },
                    variation: 'flowing'
                });
            }
        });
    },
    
    /**
     * Build HTML content for tooltip popup
     * @param {Object} config - Configuration object for tooltip content
     * @returns {string} - HTML string for tooltip content
     */
    buildTooltipContent(config) {
        if (!config) return '';
        
        let html = '';
        
        // Add header if exists
        if (config.header) {
            html += `<div class="header"><strong>${config.header}</strong></div>`;
            html += '<div class="ui divider"></div>';
        }
        
        // Add description if exists
        if (config.description) {
            html += `<p>${config.description}</p>`;
        }
        
        // Add list items if exist
        if (config.list) {
            if (Array.isArray(config.list) && config.list.length > 0) {
                html += '<ul>';
                config.list.forEach(item => {
                    if (typeof item === 'string') {
                        html += `<li>${item}</li>`;
                    } else if (item.term && item.definition === null) {
                        // Header item without definition
                        html += `</ul><p><strong>${item.term}</strong></p><ul>`;
                    } else if (item.term && item.definition) {
                        html += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                    }
                });
                html += '</ul>';
            } else if (typeof config.list === 'object') {
                // Old format - object with key-value pairs
                html += '<ul>';
                Object.entries(config.list).forEach(([term, definition]) => {
                    html += `<li><strong>${term}:</strong> ${definition}</li>`;
                });
                html += '</ul>';
            }
        }
        
        // Add additional lists (list2, list3, etc.)
        for (let i = 2; i <= 10; i++) {
            const listName = `list${i}`;
            if (config[listName] && config[listName].length > 0) {
                html += '<ul>';
                config[listName].forEach(item => {
                    if (typeof item === 'string') {
                        html += `<li>${item}</li>`;
                    } else if (item.term && item.definition === null) {
                        html += `</ul><p><strong>${item.term}</strong></p><ul>`;
                    } else if (item.term && item.definition) {
                        html += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                    }
                });
                html += '</ul>';
            }
        }
        
        // Add warning if exists
        if (config.warning) {
            html += '<div class="ui small orange message">';
            if (config.warning.header) {
                html += `<div class="header">`;
                html += `<i class="exclamation triangle icon"></i> `;
                html += config.warning.header;
                html += `</div>`;
            }
            html += config.warning.text;
            html += '</div>';
        }
        
        // Add code examples if exist
        if (config.examples && config.examples.length > 0) {
            if (config.examplesHeader) {
                html += `<p><strong>${config.examplesHeader}:</strong></p>`;
            }
            html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
            html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">';
            
            // Process examples with syntax highlighting for sections
            config.examples.forEach((line, index) => {
                if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
                    // Section header
                    if (index > 0) html += '\n';
                    html += `<span style="color: #0084b4; font-weight: bold;">${line}</span>`;
                } else if (line.includes('=')) {
                    // Parameter line
                    const [param, value] = line.split('=', 2);
                    html += `\n<span style="color: #7a3e9d;">${param}</span>=<span style="color: #cf4a4c;">${value}</span>`;
                } else {
                    // Regular line
                    html += line ? `\n${line}` : '';
                }
            });
            
            html += '</pre>';
            html += '</div>';
        }
        
        // Add note if exists
        if (config.note) {
            html += `<p><em>${config.note}</em></p>`;
        }
        
        return html;
    }
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
