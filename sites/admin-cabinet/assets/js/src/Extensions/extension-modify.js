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

/* global globalRootUrl, globalTranslate, ExtensionsAPI, EmployeesAPI, Form,
 InputMaskPatterns, avatar, ExtensionModifyStatusMonitor, ClipboardJS, PasswordWidget, UserMessage */


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
    $email: $('#user_email'),
    $user_username: $('#user_username'),
    
    /**
     * Password widget instance.
     * @type {Object}
     */
    passwordWidget: null,

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


    /**
     * String for the forwarding select.
     * @type {string}
     */
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
                    type: 'passwordStrength',
                    prompt: globalTranslate.ex_ValidatePasswordTooWeak
                }
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
        // Default values will be set after REST API data is loaded
        // Initialize with empty values since forms are empty until API responds
        extension.defaultEmail = '';
        extension.defaultMobileNumber = '';
        extension.defaultNumber = '';

        // Initialize tab menu items, accordions, and dropdown menus
        extension.$tabMenuItems.tab({
            history: true,
            historyType: 'hash',
        });
        $('#extensions-form .ui.accordion').accordion();

        // Initialize popups for question icons and buttons
        $("i.question").popup();
        $('.popuped').popup();

        // Prevent browser password manager for generated passwords
        extension.$sip_secret.on('focus', function() {
            $(this).attr('autocomplete', 'new-password');
        });

        // Initialize the extension form
        extension.initializeForm();

        // Add event handler for username change to update page title
        extension.$user_username.on('input', function() {
            const currentNumber = extension.$number.inputmask ? extension.$number.inputmask('unmaskedvalue') : extension.$number.val();
            extension.updatePageHeader($(this).val(), currentNumber);
        });

        // Also update header when extension number changes
        extension.$number.on('input', function() {
            const currentUsername = extension.$user_username.val();
            const currentNumber = $(this).inputmask ? $(this).inputmask('unmaskedvalue') : $(this).val();
            extension.updatePageHeader(currentUsername, currentNumber);
        });

        // Initialize tooltips for advanced settings using unified system
        if (typeof ExtensionTooltipManager !== 'undefined') {
            ExtensionTooltipManager.initialize();
        } else if (typeof extensionTooltipManager !== 'undefined') {
            // Fallback to old name if new class not available
            extensionTooltipManager.initialize();
        }

        // Load extension data via REST API
        extension.loadExtensionData();
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
        ExtensionsAPI.checkAvailability(extension.defaultNumber, newNumber, 'number', userId);
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
        ExtensionsAPI.checkAvailability(extension.defaultMobileNumber, newMobileNumber, 'mobile-number', userId);

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

            // Update forwarding fields that match the old mobile number
            const currentFwdForwarding = extension.$formObj.form('get value', 'fwd_forwarding');
            const currentFwdOnBusy = extension.$formObj.form('get value', 'fwd_forwardingonbusy');
            const currentFwdOnUnavailable = extension.$formObj.form('get value', 'fwd_forwardingonunavailable');
            
            // Update fwd_forwarding if it matches old mobile number (including empty)
            if (currentFwdForwarding === extension.defaultMobileNumber) {

                // Set ring length if empty
                if (extension.$formObj.form('get value', 'fwd_ringlength').length === 0
                    || extension.$formObj.form('get value', 'fwd_ringlength')==="0") {
                    extension.$formObj.form('set value', 'fwd_ringlength', 45);
                }

                // Use ExtensionSelector API for V5.0 unified pattern
                ExtensionSelector.setValue('fwd_forwarding', newMobileNumber, `${userName} <${newMobileNumber}>`);
            }

            // Update fwd_forwardingonbusy if it matches old mobile number (including empty)
            if (currentFwdOnBusy === extension.defaultMobileNumber) {
                // Use ExtensionSelector API for V5.0 unified pattern
                ExtensionSelector.setValue('fwd_forwardingonbusy', newMobileNumber, `${userName} <${newMobileNumber}>`);
            }

            // Update fwd_forwardingonunavailable if it matches old mobile number (including empty)
            if (currentFwdOnUnavailable === extension.defaultMobileNumber) {
                // Use ExtensionSelector API for V5.0 unified pattern
                ExtensionSelector.setValue('fwd_forwardingonunavailable', newMobileNumber, `${userName} <${newMobileNumber}>`);
            }
        }
        // Set the new mobile number as the default
        extension.defaultMobileNumber = newMobileNumber;
    },

    /**
     * Called when the mobile phone number is cleared in the employee card.
     */
    cbOnClearedMobileNumber() {
        // Check current forwarding values before clearing
        const currentFwdForwarding = extension.$formObj.form('get value', 'fwd_forwarding');
        const currentFwdOnBusy = extension.$formObj.form('get value', 'fwd_forwardingonbusy');
        const currentFwdOnUnavailable = extension.$formObj.form('get value', 'fwd_forwardingonunavailable');
        
        // Clear the 'mobile_dialstring' and 'mobile_number' fields in the form
        extension.$formObj.form('set value', 'mobile_dialstring', '');
        extension.$formObj.form('set value', 'mobile_number', '');

        // Check if forwarding was set to the mobile number
        if (currentFwdForwarding === extension.defaultMobileNumber) {
            // If so, clear the 'fwd_ringlength' field and clear forwarding dropdown
            extension.$formObj.form('set value', 'fwd_ringlength', 0);
            // Use ExtensionSelector API for V5.0 unified pattern
            ExtensionSelector.clear('fwd_forwarding');
        }

        // Check if forwarding when busy was set to the mobile number
        if (currentFwdOnBusy === extension.defaultMobileNumber) {
            // Use ExtensionSelector API for V5.0 unified pattern
            ExtensionSelector.clear('fwd_forwardingonbusy');
        }

        // Check if forwarding when unavailable was set to the mobile number
        if (currentFwdOnUnavailable === extension.defaultMobileNumber) {
            // Use ExtensionSelector API for V5.0 unified pattern
            ExtensionSelector.clear('fwd_forwardingonunavailable');
        }

        // Clear the default mobile number
        extension.defaultMobileNumber = '';
    },

    initializeInputMasks(){
        // Set up number input mask with correct length from API
        let timeoutNumberId;

        // Always initialize mask based on extensions_length from API
        // No defaults in JavaScript - value must come from API
        if (extension.extensionsLength) {
            const extensionsLength = parseInt(extension.extensionsLength, 10);
            if (extensionsLength >= 2 && extensionsLength <= 10) {
                // Initialize mask with correct length and oncomplete handler
                extension.$number.inputmask({
                    mask: `9{2,${extensionsLength}}`,
                    placeholder: '_',
                    oncomplete: () => {
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
            }
        }

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
                showMaskOnHover: false,
                // Remove onBeforePaste to prevent conflicts with our custom handler
            },
            match: /[0-9]/,
            replace: '9',
            list: maskList,
            listKey: 'mask',
        });

        // Add handler for programmatic value changes (for tests and automation)
        const originalVal = $.fn.val;
        extension.$mobile_number.off('val.override').on('val.override', function() {
            const $this = $(this);
            const args = arguments;

            // If setting a value programmatically
            if (args.length > 0 && typeof args[0] === 'string') {
                const newValue = args[0];

                // Temporarily remove mask
                if ($this.data('inputmask')) {
                    $this.inputmask('remove');
                }

                // Set the value
                originalVal.apply(this, args);

                // Reapply mask after a short delay
                setTimeout(() => {
                    $this.trigger('input');
                }, 10);
            }
        });

        extension.$mobile_number.on('paste', function(e) {
            e.preventDefault(); // Prevent default paste behavior

            // Get pasted data from clipboard
            let pastedData = '';

            // Try to get data from clipboard event
            if (e.originalEvent && e.originalEvent.clipboardData && e.originalEvent.clipboardData.getData) {
                pastedData = e.originalEvent.clipboardData.getData('text');
            } else if (e.clipboardData && e.clipboardData.getData) {
                // Direct clipboardData access
                pastedData = e.clipboardData.getData('text');
            } else if (window.clipboardData && window.clipboardData.getData) {
                // For IE
                pastedData = window.clipboardData.getData('text');
            }

            // If we couldn't get clipboard data, don't process
            if (!pastedData) {
                return;
            }

            // Process the pasted data
            let processedData;
            if (pastedData.charAt(0) === '+') {
                // Keep '+' and remove other non-digit characters
                processedData = '+' + pastedData.slice(1).replace(/\D/g, '');
            } else {
                // Remove all non-digit characters
                processedData = pastedData.replace(/\D/g, '');
            }

            // Insert cleaned data into the input field
            const input = this;
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const currentValue = $(input).val() || '';
            const newValue = currentValue.substring(0, start) + processedData + currentValue.substring(end);

            // Temporarily remove mask, set value, then reapply
            extension.$mobile_number.inputmask("remove");
            extension.$mobile_number.val(newValue);

            // Use setTimeout to ensure the value is set before reapplying mask
            setTimeout(() => {
                // Trigger input event to reapply the mask
                $(input).trigger('input');
            }, 10);
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
    },



    /**
     * Generate a new SIP password.
     * Uses the PasswordWidget button like in AMI manager.
     */
    generateNewSipPassword() {
        // Trigger password generation through the widget button (like in AMI)
        const $generateBtn = extension.$sip_secret.closest('.ui.input').find('button.generate-password');
        if ($generateBtn.length > 0) {
            $generateBtn.trigger('click');
        }
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data.mobile_number = extension.$mobile_number.inputmask('unmaskedvalue');

        // Remove form control fields that shouldn't be sent to server
        delete result.data.dirrty;
        delete result.data.submitMode;
        delete result.data.user_id; // Remove user_id field to prevent validation issues

        // Determine if this is a new record (check if we have a real ID)
        return result;
    },
    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        if (response.result) {
            // Store the current extension number as the default number from response
            if (response.data && response.data.number) {
                extension.defaultNumber = response.data.number;
                // Update the phone representation with the new default number
                ExtensionsAPI.updatePhoneRepresent(extension.defaultNumber);
            }
            // Form.js will handle all redirect logic based on submitMode and response.reload from server
        } else {
            UserMessage.showMultiString(response.messages);
        }
    },
    /**
     * Initialize the form with custom settings for REST API integration
     */
    initializeForm() {
        // Configure Form.js for REST API
        Form.$formObj = extension.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = extension.validateRules;
        Form.cbBeforeSendForm = extension.cbBeforeSendForm;
        Form.cbAfterSendForm = extension.cbAfterSendForm;
        
        // Configure REST API integration
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = EmployeesAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Enable automatic checkbox to boolean conversion
        // This ensures checkbox values are sent as true/false instead of "on"/undefined
        Form.convertCheckboxesToBool = true;
        
        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}extensions/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}extensions/modify/`;
        
        Form.initialize();
    },
    /**
     * V5.0 Architecture: Load extension data via REST API (similar to IVR menu pattern)
     */
    loadExtensionData() {
        const recordId = extension.getRecordId();

        // Use 'new' as ID for new records to get default values from server
        const apiId = recordId === '' ? 'new' : recordId;

        // Hide monitoring elements for new employees
        if (apiId === 'new') {
            $('#status').hide(); // Hide status label
            $('a[data-tab="status"]').hide(); // Hide monitoring tab
        }

        EmployeesAPI.getRecord(apiId, (response) => {
            if (response.result) {
                // Mark as new record if we don't have an ID (following CallQueues pattern)
                if (!recordId || recordId === '') {
                    response.data._isNew = true;
                }

                extension.populateFormWithData(response.data);
                // Store default values after data load
                extension.defaultNumber = response.data.number || '';
                extension.defaultEmail = response.data.user_email || '';
                extension.defaultMobileNumber = response.data.mobile_number || '';
            } else {
                // For new records, still initialize avatar even if API fails
                if (recordId === '') {
                    avatar.initialize();
                }
                UserMessage.showError(response.messages?.error || 'Failed to load extension data');
            }
        });
    },
    
    /**
     * Get record ID from URL (like IVR menu)
     */
    getRecordId() {
        const urlParts = window.location.pathname.split('/');
        const modifyIndex = urlParts.indexOf('modify');
        if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
            return urlParts[modifyIndex + 1];
        }
        return '';
    },
    
    /**
     * Populate form with data from REST API (V5.0 clean data architecture)
     */
    populateFormWithData(data) {
        // Store extensions_length from API for use in initializeInputMasks
        // This value MUST come from API - no defaults in JS
        extension.extensionsLength = data.extensions_length;

        // Use unified silent population approach (same as IVR menu)
        Form.populateFormSilently(data, {
            afterPopulate: (formData) => {
                // Initialize dropdowns with V5.0 specialized classes - complete automation
                extension.initializeDropdownsWithCleanData(formData);

                // Update extension number in any UI elements if needed
                if (formData.number) {
                    $('#extension-number-display').text(formData.number);
                }
                
                // Re-initialize avatar component after form population
                avatar.initialize();
                
                // Set avatar URL dynamically from API data
                avatar.setAvatarUrl(formData.user_avatar);

                // Initialize extension modify status monitor after form is populated
                if (typeof ExtensionModifyStatusMonitor !== 'undefined') {
                    ExtensionModifyStatusMonitor.initialize();
                }

                // Update page header with employee name and extension number
                extension.updatePageHeader(formData.user_username, formData.number);

                // Initialize password widget after data is loaded
                extension.initializePasswordWidget(formData);

                // Initialize input masks after data is loaded
                extension.initializeInputMasks();
            }
        });
        
        // NOTE: Form.initializeDirrity() will be called automatically by Form.populateFormSilently()
    },
    
    /**
     * Initialize dropdowns with clean data - V5.0 Architecture
     * Uses specialized classes with complete automation (no onChange callbacks needed)
     */
    initializeDropdownsWithCleanData(data) {
        // Extension dropdowns with current extension exclusion - V5.0 specialized class
        ExtensionSelector.init('fwd_forwarding', {
            type: 'routing',
            excludeExtensions: [data.number],
            includeEmpty: true,
            data: data
        });
        
        ExtensionSelector.init('fwd_forwardingonbusy', {
            type: 'routing', 
            excludeExtensions: [data.number],
            includeEmpty: true,
            data: data
        });
        
        ExtensionSelector.init('fwd_forwardingonunavailable', {
            type: 'routing',
            excludeExtensions: [data.number],
            includeEmpty: true,
            data: data
        });
        
        // Network filter dropdown with API data - V5.0 base class
        
        DynamicDropdownBuilder.buildDropdown('sip_networkfilterid', data, {
            apiUrl: `/pbxcore/api/v3/network-filters:getForSelect?categories[]=SIP`,
            placeholder: globalTranslate.ex_SelectNetworkFilter,
            cache: false
        });
        
        // V5.0 architecture with empty form should not have HTML entities issues
        
        // Handle extension number changes - rebuild dropdowns with new exclusion
        extension.$number.off('change.dropdown').on('change.dropdown', () => {
            const newExtension = extension.$formObj.form('get value', 'number');
            
            if (newExtension) {
                // Update exclusions for forwarding dropdowns
                extension.updateForwardingDropdownsExclusion(newExtension);
            }
        });

        extension.initializeDtmfModeDropdown();
        extension.initializeTransportDropdown();
    },
    
    /**
     * Update forwarding dropdowns when extension number changes
     */
    updateForwardingDropdownsExclusion(newExtension) {
        const forwardingFields = ['fwd_forwarding', 'fwd_forwardingonbusy', 'fwd_forwardingonunavailable'];
        
        forwardingFields.forEach(fieldName => {
            const currentValue = $(`#${fieldName}`).val();
            const currentText = $(`#${fieldName}-dropdown`).find('.text').text();
            
            // Remove old dropdown
            $(`#${fieldName}-dropdown`).remove();
            
            // Create new data object with current value for reinitializing
            const refreshData = {};
            refreshData[fieldName] = currentValue;
            refreshData[`${fieldName}_represent`] = currentText;
            
            // Reinitialize with new exclusion
            ExtensionSelector.init(fieldName, {
                type: 'routing',
                excludeExtensions: [newExtension],
                includeEmpty: true,
                data: refreshData
            });
        });
    },
    
    /**
     * Initialize password widget after form data is loaded
     * This ensures validation only happens after password is populated from REST API
     * @param {Object} formData - The form data loaded from REST API
     */
    initializePasswordWidget(formData) {
        if (!extension.$sip_secret.length) {
            return;
        }

        // Hide any legacy buttons if they exist
        $('.clipboard').hide();
        $('#show-hide-password').hide();

        // Determine if this is a new extension (no ID) or existing one
        const isNewExtension = !formData.id || formData.id === '';

        const widget = PasswordWidget.init(extension.$sip_secret, {
            validation: PasswordWidget.VALIDATION.SOFT,  // Soft validation - show warnings but allow submission
            generateButton: true,         // Show generate button
            showPasswordButton: true,     // Show show/hide password toggle
            clipboardButton: true,        // Show copy to clipboard button
            showStrengthBar: true,        // Show password strength bar
            showWarnings: true,           // Show validation warnings
            validateOnInput: true,        // Validate as user types
            checkOnLoad: true, // Always validate if password field has value
            minScore: 30,                 // SIP passwords have lower minimum score requirement
            generateLength: 20,           // 20 chars max for Grandstream GDMS compatibility
            includeSpecial: false,        // Exclude special characters for SIP compatibility
            onGenerate: (password) => {
                // Trigger form change to enable save button
                Form.dataChanged();
            },
            onValidate: (isValid, score, messages) => {
                // Optional: Handle validation results if needed
                // The widget will handle visual feedback automatically
            }
        });
        
        // Store widget instance for later use
        extension.passwordWidget = widget;
        
        // For new extensions only: auto-generate password if field is empty
        if (isNewExtension && extension.$sip_secret.val() === '') {
            setTimeout(() => {
                const $generateBtn = extension.$sip_secret.closest('.ui.input').find('button.generate-password');
                if ($generateBtn.length > 0) {
                    $generateBtn.trigger('click');
                }
            }, 100);
        }
    },
    /**
     * Initialize DTMF mode dropdown with standard Fomantic UI (PHP-rendered)
     */
    initializeDtmfModeDropdown() {
            const $dropdown = $('#sip_dtmfmode-dropdown');
            if ($dropdown.length === 0) return;
            
            // Initialize with standard Fomantic UI - it's already rendered by PHP
            $dropdown.dropdown({
                onChange: () => Form.dataChanged()
            });
     },
        
    /**
     * Initialize transport protocol dropdown with standard Fomantic UI (PHP-rendered)
     */
    initializeTransportDropdown() {
        const $dropdown = $('#sip_transport-dropdown');
        if ($dropdown.length === 0) return;

        // Initialize with standard Fomantic UI - it's already rendered by PHP
        $dropdown.dropdown({
            onChange: () => Form.dataChanged()
        });
    },

    /**
     * Update page header with employee name and extension number
     * @param {string} employeeName - Name of the employee
     * @param {string} extensionNumber - Extension number (optional)
     */
    updatePageHeader(employeeName, extensionNumber) {
        let headerText;

        if (employeeName && employeeName.trim() !== '') {
            // Existing employee with name
            headerText = '<i class="user outline icon"></i> ' + employeeName;

            // Add extension number if available
            if (extensionNumber && extensionNumber.trim() !== '') {
                headerText += ' &lt;' + extensionNumber + '&gt;';
            }
        } else {
            // New employee or no name yet
            headerText = globalTranslate.ex_CreateNewExtension;
        }

        // Update main header content
        $('h1 .content').html(headerText);
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


$.fn.form.settings.rules.passwordStrength = () => {
    // Check if password widget exists and password meets minimum score
    if (extension.passwordWidget) {
        const state = PasswordWidget.getState(extension.passwordWidget);
        return state && state.score >= 30; // Minimum score for extensions
    }
    return true; // Pass validation if widget not initialized
};

/**
 *  Initialize Employee form on document ready
 */
$(document).ready(() => {
    extension.initialize();
});
