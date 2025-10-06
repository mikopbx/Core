"use strict";

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
var extension = {
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
      rules: [{
        type: 'number',
        prompt: globalTranslate.ex_ValidateExtensionNumber
      }, {
        type: 'empty',
        prompt: globalTranslate.ex_ValidateNumberIsEmpty
      }, {
        type: 'existRule[number-error]',
        prompt: globalTranslate.ex_ValidateNumberIsDouble
      }]
    },
    mobile_number: {
      optional: true,
      identifier: 'mobile_number',
      rules: [{
        type: 'mask',
        prompt: globalTranslate.ex_ValidateMobileIsNotCorrect
      }, {
        type: 'existRule[mobile-number-error]',
        prompt: globalTranslate.ex_ValidateMobileNumberIsDouble
      }]
    },
    user_email: {
      optional: true,
      identifier: 'user_email',
      rules: [{
        type: 'email',
        prompt: globalTranslate.ex_ValidateEmailEmpty
      }]
    },
    user_username: {
      identifier: 'user_username',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.ex_ValidateUsernameEmpty
      }]
    },
    sip_secret: {
      identifier: 'sip_secret',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.ex_ValidateSecretEmpty
      }, {
        type: 'minLength[5]',
        prompt: globalTranslate.ex_ValidateSecretWeak
      }, {
        type: 'passwordStrength',
        prompt: globalTranslate.ex_ValidatePasswordTooWeak
      }]
    },
    fwd_ringlength: {
      identifier: 'fwd_ringlength',
      depends: 'fwd_forwarding',
      rules: [{
        type: 'integer[3..180]',
        prompt: globalTranslate.ex_ValidateRingingBeforeForwardOutOfRange
      }]
    },
    fwd_forwarding: {
      optional: true,
      identifier: 'fwd_forwarding',
      rules: [{
        type: 'extensionRule',
        prompt: globalTranslate.ex_ValidateForwardingToBeFilled
      }, {
        type: 'different[number]',
        prompt: globalTranslate.ex_ValidateForwardingToBeDifferent
      }]
    },
    fwd_forwardingonbusy: {
      identifier: 'fwd_forwardingonbusy',
      rules: [{
        type: 'different[number]',
        prompt: globalTranslate.ex_ValidateForwardingToBeDifferent
      }]
    },
    fwd_forwardingonunavailable: {
      identifier: 'fwd_forwardingonunavailable',
      rules: [{
        type: 'different[number]',
        prompt: globalTranslate.ex_ValidateForwardingToBeDifferent
      }]
    }
  },

  /**
   * Initializes the extension form and its interactions.
   */
  initialize: function initialize() {
    // Default values will be set after REST API data is loaded
    // Initialize with empty values since forms are empty until API responds
    extension.defaultEmail = '';
    extension.defaultMobileNumber = '';
    extension.defaultNumber = ''; // Initialize tab menu items, accordions, and dropdown menus

    extension.$tabMenuItems.tab({
      history: true,
      historyType: 'hash'
    });
    $('#extensions-form .ui.accordion').accordion(); // Initialize popups for question icons and buttons

    $("i.question").popup();
    $('.popuped').popup(); // Prevent browser password manager for generated passwords

    extension.$sip_secret.on('focus', function () {
      $(this).attr('autocomplete', 'new-password');
    }); // Initialize the extension form

    extension.initializeForm(); // Add event handler for username change to update page title

    extension.$user_username.on('input', function () {
      var currentNumber = extension.$number.inputmask ? extension.$number.inputmask('unmaskedvalue') : extension.$number.val();
      extension.updatePageHeader($(this).val(), currentNumber);
    }); // Also update header when extension number changes

    extension.$number.on('input', function () {
      var currentUsername = extension.$user_username.val();
      var currentNumber = $(this).inputmask ? $(this).inputmask('unmaskedvalue') : $(this).val();
      extension.updatePageHeader(currentUsername, currentNumber);
    }); // Initialize tooltips for advanced settings using unified system

    if (typeof ExtensionTooltipManager !== 'undefined') {
      ExtensionTooltipManager.initialize();
    } else if (typeof extensionTooltipManager !== 'undefined') {
      // Fallback to old name if new class not available
      extensionTooltipManager.initialize();
    } // Load extension data via REST API


    extension.loadExtensionData();
  },

  /**
   * Callback after paste mobile number from clipboard
   */
  cbOnMobileNumberBeforePaste: function cbOnMobileNumberBeforePaste(pastedValue) {
    return pastedValue;
  },

  /**
   * It is executed after a phone number has been entered completely.
   * It serves to check if there are any conflicts with existing phone numbers.
   */
  cbOnCompleteNumber: function cbOnCompleteNumber() {
    // Retrieve the entered phone number after removing any input mask
    var newNumber = extension.$number.inputmask('unmaskedvalue'); // Retrieve the user ID from the form

    var userId = extension.$formObj.form('get value', 'user_id'); // Call the `checkAvailability` function on `Extensions` object
    // to check whether the entered phone number is already in use.
    // Parameters: default number, new number, class name of error message (number), user id

    ExtensionsAPI.checkAvailability(extension.defaultNumber, newNumber, 'number', userId);
  },

  /**
   * It is executed once an email address has been completely entered.
   */
  cbOnCompleteEmail: function cbOnCompleteEmail() {
    // Retrieve the entered phone number after removing any input mask
    var newEmail = extension.$email.inputmask('unmaskedvalue'); // Retrieve the user ID from the form

    var userId = extension.$formObj.form('get value', 'user_id'); // Call the `checkAvailability` function on `UsersAPI` object
    // to check whether the entered email is already in use.
    // Parameters: default email, new email, class name of error message (email), user id

    UsersAPI.checkAvailability(extension.defaultEmail, newEmail, 'email', userId);
  },

  /**
   * Activated when entering a mobile phone number in the employee's profile.
   */
  cbOnCompleteMobileNumber: function cbOnCompleteMobileNumber() {
    // Get the new mobile number without any input mask
    var newMobileNumber = extension.$mobile_number.inputmask('unmaskedvalue'); // Get user ID from the form

    var userId = extension.$formObj.form('get value', 'user_id'); // Dynamic check to see if the selected mobile number is available

    ExtensionsAPI.checkAvailability(extension.defaultMobileNumber, newMobileNumber, 'mobile-number', userId); // Refill the mobile dialstring if the new mobile number is different than the default or if the mobile dialstring is empty

    if (newMobileNumber !== extension.defaultMobileNumber || extension.$formObj.form('get value', 'mobile_dialstring').length === 0) {
      extension.$formObj.form('set value', 'mobile_dialstring', newMobileNumber);
    } // Check if the mobile number has changed


    if (newMobileNumber !== extension.defaultMobileNumber) {
      // Get the user's username from the form
      var userName = extension.$formObj.form('get value', 'user_username'); // Update forwarding fields that match the old mobile number

      var currentFwdForwarding = extension.$formObj.form('get value', 'fwd_forwarding');
      var currentFwdOnBusy = extension.$formObj.form('get value', 'fwd_forwardingonbusy');
      var currentFwdOnUnavailable = extension.$formObj.form('get value', 'fwd_forwardingonunavailable'); // Update fwd_forwarding if it matches old mobile number (including empty)

      if (currentFwdForwarding === extension.defaultMobileNumber) {
        // Set ring length if empty
        if (extension.$formObj.form('get value', 'fwd_ringlength').length === 0 || extension.$formObj.form('get value', 'fwd_ringlength') === "0") {
          extension.$formObj.form('set value', 'fwd_ringlength', 45);
        } // Use ExtensionSelector API for V5.0 unified pattern


        ExtensionSelector.setValue('fwd_forwarding', newMobileNumber, "".concat(userName, " <").concat(newMobileNumber, ">"));
      } // Update fwd_forwardingonbusy if it matches old mobile number (including empty)


      if (currentFwdOnBusy === extension.defaultMobileNumber) {
        // Use ExtensionSelector API for V5.0 unified pattern
        ExtensionSelector.setValue('fwd_forwardingonbusy', newMobileNumber, "".concat(userName, " <").concat(newMobileNumber, ">"));
      } // Update fwd_forwardingonunavailable if it matches old mobile number (including empty)


      if (currentFwdOnUnavailable === extension.defaultMobileNumber) {
        // Use ExtensionSelector API for V5.0 unified pattern
        ExtensionSelector.setValue('fwd_forwardingonunavailable', newMobileNumber, "".concat(userName, " <").concat(newMobileNumber, ">"));
      }
    } // Set the new mobile number as the default


    extension.defaultMobileNumber = newMobileNumber;
  },

  /**
   * Called when the mobile phone number is cleared in the employee card.
   */
  cbOnClearedMobileNumber: function cbOnClearedMobileNumber() {
    // Check current forwarding values before clearing
    var currentFwdForwarding = extension.$formObj.form('get value', 'fwd_forwarding');
    var currentFwdOnBusy = extension.$formObj.form('get value', 'fwd_forwardingonbusy');
    var currentFwdOnUnavailable = extension.$formObj.form('get value', 'fwd_forwardingonunavailable'); // Clear the 'mobile_dialstring' and 'mobile_number' fields in the form

    extension.$formObj.form('set value', 'mobile_dialstring', '');
    extension.$formObj.form('set value', 'mobile_number', ''); // Check if forwarding was set to the mobile number

    if (currentFwdForwarding === extension.defaultMobileNumber) {
      // If so, clear the 'fwd_ringlength' field and clear forwarding dropdown
      extension.$formObj.form('set value', 'fwd_ringlength', 0); // Use ExtensionSelector API for V5.0 unified pattern

      ExtensionSelector.clear('fwd_forwarding');
    } // Check if forwarding when busy was set to the mobile number


    if (currentFwdOnBusy === extension.defaultMobileNumber) {
      // Use ExtensionSelector API for V5.0 unified pattern
      ExtensionSelector.clear('fwd_forwardingonbusy');
    } // Check if forwarding when unavailable was set to the mobile number


    if (currentFwdOnUnavailable === extension.defaultMobileNumber) {
      // Use ExtensionSelector API for V5.0 unified pattern
      ExtensionSelector.clear('fwd_forwardingonunavailable');
    } // Clear the default mobile number


    extension.defaultMobileNumber = '';
  },
  initializeInputMasks: function initializeInputMasks() {
    // Set up number input mask with correct length from API
    var timeoutNumberId; // Always initialize mask based on extensions_length from API
    // No defaults in JavaScript - value must come from API

    if (extension.extensionsLength) {
      var extensionsLength = parseInt(extension.extensionsLength, 10);

      if (extensionsLength >= 2 && extensionsLength <= 10) {
        // Initialize mask with correct length and oncomplete handler
        extension.$number.inputmask({
          mask: "9{2,".concat(extensionsLength, "}"),
          placeholder: '_',
          oncomplete: function oncomplete() {
            // Clear the previous timer, if it exists
            if (timeoutNumberId) {
              clearTimeout(timeoutNumberId);
            } // Set a new timer with a delay of 0.5 seconds


            timeoutNumberId = setTimeout(function () {
              extension.cbOnCompleteNumber();
            }, 500);
          }
        });
      }
    }

    extension.$number.on('paste', function () {
      extension.cbOnCompleteNumber();
    }); // Set up the input masks for the mobile number input

    var maskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
    extension.$mobile_number.inputmasks({
      inputmask: {
        definitions: {
          '#': {
            validator: '[0-9]',
            cardinality: 1
          }
        },
        oncleared: extension.cbOnClearedMobileNumber,
        oncomplete: extension.cbOnCompleteMobileNumber,
        showMaskOnHover: false // Remove onBeforePaste to prevent conflicts with our custom handler

      },
      match: /[0-9]/,
      replace: '9',
      list: maskList,
      listKey: 'mask'
    }); // Add handler for programmatic value changes (for tests and automation)

    var originalVal = $.fn.val;
    extension.$mobile_number.off('val.override').on('val.override', function () {
      var $this = $(this);
      var args = arguments; // If setting a value programmatically

      if (args.length > 0 && typeof args[0] === 'string') {
        var newValue = args[0]; // Temporarily remove mask

        if ($this.data('inputmask')) {
          $this.inputmask('remove');
        } // Set the value


        originalVal.apply(this, args); // Reapply mask after a short delay

        setTimeout(function () {
          $this.trigger('input');
        }, 10);
      }
    });
    extension.$mobile_number.on('paste', function (e) {
      e.preventDefault(); // Prevent default paste behavior
      // Get pasted data from clipboard

      var pastedData = ''; // Try to get data from clipboard event

      if (e.originalEvent && e.originalEvent.clipboardData && e.originalEvent.clipboardData.getData) {
        pastedData = e.originalEvent.clipboardData.getData('text');
      } else if (e.clipboardData && e.clipboardData.getData) {
        // Direct clipboardData access
        pastedData = e.clipboardData.getData('text');
      } else if (window.clipboardData && window.clipboardData.getData) {
        // For IE
        pastedData = window.clipboardData.getData('text');
      } // If we couldn't get clipboard data, don't process


      if (!pastedData) {
        return;
      } // Process the pasted data


      var processedData;

      if (pastedData.charAt(0) === '+') {
        // Keep '+' and remove other non-digit characters
        processedData = '+' + pastedData.slice(1).replace(/\D/g, '');
      } else {
        // Remove all non-digit characters
        processedData = pastedData.replace(/\D/g, '');
      } // Insert cleaned data into the input field


      var input = this;
      var start = input.selectionStart || 0;
      var end = input.selectionEnd || 0;
      var currentValue = $(input).val() || '';
      var newValue = currentValue.substring(0, start) + processedData + currentValue.substring(end); // Temporarily remove mask, set value, then reapply

      extension.$mobile_number.inputmask("remove");
      extension.$mobile_number.val(newValue); // Use setTimeout to ensure the value is set before reapplying mask

      setTimeout(function () {
        // Trigger input event to reapply the mask
        $(input).trigger('input');
      }, 10);
    }); // Set up the input mask for the email input

    var timeoutEmailId;
    extension.$email.inputmask('email', {
      oncomplete: function oncomplete() {
        // Clear the previous timer, if it exists
        if (timeoutEmailId) {
          clearTimeout(timeoutEmailId);
        } // Set a new timer with a delay of 0.5 seconds


        timeoutEmailId = setTimeout(function () {
          extension.cbOnCompleteEmail();
        }, 500);
      }
    });
    extension.$email.on('paste', function () {
      extension.cbOnCompleteEmail();
    }); //Attach a focusout event listener to the mobile number input

    extension.$mobile_number.focusout(function (e) {
      var phone = $(e.target).val().replace(/[^0-9]/g, "");

      if (phone === '') {
        $(e.target).val('');
      }
    });
  },

  /**
   * Generate a new SIP password.
   * Uses the PasswordWidget button like in AMI manager.
   */
  generateNewSipPassword: function generateNewSipPassword() {
    // Trigger password generation through the widget button (like in AMI)
    var $generateBtn = extension.$sip_secret.closest('.ui.input').find('button.generate-password');

    if ($generateBtn.length > 0) {
      $generateBtn.trigger('click');
    }
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data.mobile_number = extension.$mobile_number.inputmask('unmaskedvalue'); // Remove form control fields that shouldn't be sent to server

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
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result) {
      // Store the current extension number as the default number from response
      if (response.data && response.data.number) {
        extension.defaultNumber = response.data.number; // Update the phone representation with the new default number

        ExtensionsAPI.updatePhoneRepresent(extension.defaultNumber);
      } // Form.js will handle all redirect logic based on submitMode and response.reload from server

    } else {
      UserMessage.showMultiString(response.messages);
    }
  },

  /**
   * Initialize the form with custom settings for REST API integration
   */
  initializeForm: function initializeForm() {
    // Configure Form.js for REST API
    Form.$formObj = extension.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = extension.validateRules;
    Form.cbBeforeSendForm = extension.cbBeforeSendForm;
    Form.cbAfterSendForm = extension.cbAfterSendForm; // Configure REST API integration

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = EmployeesAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Enable automatic checkbox to boolean conversion
    // This ensures checkbox values are sent as true/false instead of "on"/undefined

    Form.convertCheckboxesToBool = true; // Important settings for correct save modes operation

    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "extensions/index/");
    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "extensions/modify/");
    Form.initialize();
  },

  /**
   * V5.0 Architecture: Load extension data via REST API (similar to IVR menu pattern)
   */
  loadExtensionData: function loadExtensionData() {
    var recordId = extension.getRecordId(); // Use 'new' as ID for new records to get default values from server

    var apiId = recordId === '' ? 'new' : recordId; // Hide monitoring elements for new employees

    if (apiId === 'new') {
      $('#status').hide(); // Hide status label

      $('a[data-tab="status"]').hide(); // Hide monitoring tab
    }

    EmployeesAPI.getRecord(apiId, function (response) {
      if (response.result) {
        extension.populateFormWithData(response.data); // Store default values after data load

        extension.defaultNumber = response.data.number || '';
        extension.defaultEmail = response.data.user_email || '';
        extension.defaultMobileNumber = response.data.mobile_number || '';
      } else {
        var _response$messages;

        // For new records, still initialize avatar even if API fails
        if (recordId === '') {
          avatar.initialize();
        }

        UserMessage.showError(((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || 'Failed to load extension data');
      }
    });
  },

  /**
   * Get record ID from URL (like IVR menu)
   */
  getRecordId: function getRecordId() {
    var urlParts = window.location.pathname.split('/');
    var modifyIndex = urlParts.indexOf('modify');

    if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
      return urlParts[modifyIndex + 1];
    }

    return '';
  },

  /**
   * Populate form with data from REST API (V5.0 clean data architecture)
   */
  populateFormWithData: function populateFormWithData(data) {
    // Store extensions_length from API for use in initializeInputMasks
    // This value MUST come from API - no defaults in JS
    extension.extensionsLength = data.extensions_length; // Use unified silent population approach (same as IVR menu)

    Form.populateFormSilently(data, {
      afterPopulate: function afterPopulate(formData) {
        // Initialize dropdowns with V5.0 specialized classes - complete automation
        extension.initializeDropdownsWithCleanData(formData); // Update extension number in any UI elements if needed

        if (formData.number) {
          $('#extension-number-display').text(formData.number);
        } // Re-initialize avatar component after form population


        avatar.initialize(); // Set avatar URL dynamically from API data

        avatar.setAvatarUrl(formData.user_avatar); // Initialize extension modify status monitor after form is populated

        if (typeof ExtensionModifyStatusMonitor !== 'undefined') {
          ExtensionModifyStatusMonitor.initialize();
        } // Update page header with employee name and extension number


        extension.updatePageHeader(formData.user_username, formData.number); // Initialize password widget after data is loaded

        extension.initializePasswordWidget(formData); // Initialize input masks after data is loaded

        extension.initializeInputMasks();
      }
    }); // NOTE: Form.initializeDirrity() will be called automatically by Form.populateFormSilently()
  },

  /**
   * Initialize dropdowns with clean data - V5.0 Architecture
   * Uses specialized classes with complete automation (no onChange callbacks needed)
   */
  initializeDropdownsWithCleanData: function initializeDropdownsWithCleanData(data) {
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
    }); // Network filter dropdown with API data - V5.0 base class

    DynamicDropdownBuilder.buildDropdown('sip_networkfilterid', data, {
      apiUrl: "/pbxcore/api/v3/network-filters:getForSelect?categories[]=SIP",
      placeholder: globalTranslate.ex_SelectNetworkFilter,
      cache: false
    }); // V5.0 architecture with empty form should not have HTML entities issues
    // Handle extension number changes - rebuild dropdowns with new exclusion

    extension.$number.off('change.dropdown').on('change.dropdown', function () {
      var newExtension = extension.$formObj.form('get value', 'number');

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
  updateForwardingDropdownsExclusion: function updateForwardingDropdownsExclusion(newExtension) {
    var forwardingFields = ['fwd_forwarding', 'fwd_forwardingonbusy', 'fwd_forwardingonunavailable'];
    forwardingFields.forEach(function (fieldName) {
      var currentValue = $("#".concat(fieldName)).val();
      var currentText = $("#".concat(fieldName, "-dropdown")).find('.text').text(); // Remove old dropdown

      $("#".concat(fieldName, "-dropdown")).remove(); // Create new data object with current value for reinitializing

      var refreshData = {};
      refreshData[fieldName] = currentValue;
      refreshData["".concat(fieldName, "_represent")] = currentText; // Reinitialize with new exclusion

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
  initializePasswordWidget: function initializePasswordWidget(formData) {
    if (!extension.$sip_secret.length) {
      return;
    } // Hide any legacy buttons if they exist


    $('.clipboard').hide();
    $('#show-hide-password').hide(); // Determine if this is a new extension (no ID) or existing one

    var isNewExtension = !formData.id || formData.id === '';
    var widget = PasswordWidget.init(extension.$sip_secret, {
      validation: PasswordWidget.VALIDATION.SOFT,
      // Soft validation - show warnings but allow submission
      generateButton: true,
      // Show generate button
      showPasswordButton: true,
      // Show show/hide password toggle
      clipboardButton: true,
      // Show copy to clipboard button
      showStrengthBar: true,
      // Show password strength bar
      showWarnings: true,
      // Show validation warnings
      validateOnInput: true,
      // Validate as user types
      checkOnLoad: true,
      // Always validate if password field has value
      minScore: 30,
      // SIP passwords have lower minimum score requirement
      generateLength: 20,
      // 20 chars max for Grandstream GDMS compatibility
      includeSpecial: false,
      // Exclude special characters for SIP compatibility
      onGenerate: function onGenerate(password) {
        // Trigger form change to enable save button
        Form.dataChanged();
      },
      onValidate: function onValidate(isValid, score, messages) {// Optional: Handle validation results if needed
        // The widget will handle visual feedback automatically
      }
    }); // Store widget instance for later use

    extension.passwordWidget = widget; // For new extensions only: auto-generate password if field is empty

    if (isNewExtension && extension.$sip_secret.val() === '') {
      setTimeout(function () {
        var $generateBtn = extension.$sip_secret.closest('.ui.input').find('button.generate-password');

        if ($generateBtn.length > 0) {
          $generateBtn.trigger('click');
        }
      }, 100);
    }
  },

  /**
   * Initialize DTMF mode dropdown with standard Fomantic UI (PHP-rendered)
   */
  initializeDtmfModeDropdown: function initializeDtmfModeDropdown() {
    var $dropdown = $('#sip_dtmfmode-dropdown');
    if ($dropdown.length === 0) return; // Initialize with standard Fomantic UI - it's already rendered by PHP

    $dropdown.dropdown({
      onChange: function onChange() {
        return Form.dataChanged();
      }
    });
  },

  /**
   * Initialize transport protocol dropdown with standard Fomantic UI (PHP-rendered)
   */
  initializeTransportDropdown: function initializeTransportDropdown() {
    var $dropdown = $('#sip_transport-dropdown');
    if ($dropdown.length === 0) return; // Initialize with standard Fomantic UI - it's already rendered by PHP

    $dropdown.dropdown({
      onChange: function onChange() {
        return Form.dataChanged();
      }
    });
  },

  /**
   * Update page header with employee name and extension number
   * @param {string} employeeName - Name of the employee
   * @param {string} extensionNumber - Extension number (optional)
   */
  updatePageHeader: function updatePageHeader(employeeName, extensionNumber) {
    var headerText;

    if (employeeName && employeeName.trim() !== '') {
      // Existing employee with name
      headerText = '<i class="user outline icon"></i> ' + employeeName; // Add extension number if available

      if (extensionNumber && extensionNumber.trim() !== '') {
        headerText += ' &lt;' + extensionNumber + '&gt;';
      }
    } else {
      // New employee or no name yet
      headerText = globalTranslate.ex_CreateNewExtension;
    } // Update main header content


    $('h1 .content').html(headerText);
  }
};
/**
 * Define a custom rule for jQuery form validation named 'extensionRule'.
 * The rule checks if a forwarding number is selected but the ring length is zero or not set.
 * @returns {boolean} - The validation result. If forwarding is set and ring length is zero or not set, it returns false (invalid). Otherwise, it returns true (valid).
 */

$.fn.form.settings.rules.extensionRule = function () {
  // Get ring length and forwarding number from the form
  var fwdRingLength = extension.$formObj.form('get value', 'fwd_ringlength');
  var fwdForwarding = extension.$formObj.form('get value', 'fwd_forwarding'); // If forwarding number is set and ring length is zero or not set, return false (invalid)

  if (fwdForwarding.length > 0 && (fwdRingLength === 0 || fwdRingLength === '')) {
    return false;
  } // Otherwise, return true (valid)


  return true;
};
/**
 * Checks if the number is taken by another account
 * @returns {boolean} True if the parameter has the 'hidden' class, false otherwise
 */


$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
};

$.fn.form.settings.rules.passwordStrength = function () {
  // Check if password widget exists and password meets minimum score
  if (extension.passwordWidget) {
    var state = PasswordWidget.getState(extension.passwordWidget);
    return state && state.score >= 30; // Minimum score for extensions
  }

  return true; // Pass validation if widget not initialized
};
/**
 *  Initialize Employee form on document ready
 */


$(document).ready(function () {
  extension.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJHVzZXJfdXNlcm5hbWUiLCJwYXNzd29yZFdpZGdldCIsIiRmb3JtT2JqIiwiJHRhYk1lbnVJdGVtcyIsImZvcndhcmRpbmdTZWxlY3QiLCJ2YWxpZGF0ZVJ1bGVzIiwibnVtYmVyIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyIiwiZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5IiwiZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSIsIm1vYmlsZV9udW1iZXIiLCJvcHRpb25hbCIsImV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0IiwiZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSIsInVzZXJfZW1haWwiLCJleF9WYWxpZGF0ZUVtYWlsRW1wdHkiLCJ1c2VyX3VzZXJuYW1lIiwiZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5Iiwic2lwX3NlY3JldCIsImV4X1ZhbGlkYXRlU2VjcmV0RW1wdHkiLCJleF9WYWxpZGF0ZVNlY3JldFdlYWsiLCJleF9WYWxpZGF0ZVBhc3N3b3JkVG9vV2VhayIsImZ3ZF9yaW5nbGVuZ3RoIiwiZGVwZW5kcyIsImV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlIiwiZndkX2ZvcndhcmRpbmciLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCIsImZ3ZF9mb3J3YXJkaW5nb25idXN5IiwiZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImFjY29yZGlvbiIsInBvcHVwIiwib24iLCJhdHRyIiwiaW5pdGlhbGl6ZUZvcm0iLCJjdXJyZW50TnVtYmVyIiwiaW5wdXRtYXNrIiwidmFsIiwidXBkYXRlUGFnZUhlYWRlciIsImN1cnJlbnRVc2VybmFtZSIsIkV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIiwiZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJsb2FkRXh0ZW5zaW9uRGF0YSIsImNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZSIsInBhc3RlZFZhbHVlIiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibmV3TnVtYmVyIiwidXNlcklkIiwiZm9ybSIsIkV4dGVuc2lvbnNBUEkiLCJjaGVja0F2YWlsYWJpbGl0eSIsImNiT25Db21wbGV0ZUVtYWlsIiwibmV3RW1haWwiLCJVc2Vyc0FQSSIsImNiT25Db21wbGV0ZU1vYmlsZU51bWJlciIsIm5ld01vYmlsZU51bWJlciIsImxlbmd0aCIsInVzZXJOYW1lIiwiY3VycmVudEZ3ZEZvcndhcmRpbmciLCJjdXJyZW50RndkT25CdXN5IiwiY3VycmVudEZ3ZE9uVW5hdmFpbGFibGUiLCJFeHRlbnNpb25TZWxlY3RvciIsInNldFZhbHVlIiwiY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIiLCJjbGVhciIsImluaXRpYWxpemVJbnB1dE1hc2tzIiwidGltZW91dE51bWJlcklkIiwiZXh0ZW5zaW9uc0xlbmd0aCIsInBhcnNlSW50IiwibWFzayIsInBsYWNlaG9sZGVyIiwib25jb21wbGV0ZSIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJtYXNrTGlzdCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9yaWdpbmFsVmFsIiwiZm4iLCJvZmYiLCIkdGhpcyIsImFyZ3MiLCJhcmd1bWVudHMiLCJuZXdWYWx1ZSIsImRhdGEiLCJhcHBseSIsInRyaWdnZXIiLCJlIiwicHJldmVudERlZmF1bHQiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwicHJvY2Vzc2VkRGF0YSIsImNoYXJBdCIsInNsaWNlIiwiaW5wdXQiLCJzdGFydCIsInNlbGVjdGlvblN0YXJ0IiwiZW5kIiwic2VsZWN0aW9uRW5kIiwiY3VycmVudFZhbHVlIiwic3Vic3RyaW5nIiwidGltZW91dEVtYWlsSWQiLCJmb2N1c291dCIsInBob25lIiwidGFyZ2V0IiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIiRnZW5lcmF0ZUJ0biIsImNsb3Nlc3QiLCJmaW5kIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGlycnR5Iiwic3VibWl0TW9kZSIsInVzZXJfaWQiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInVwZGF0ZVBob25lUmVwcmVzZW50IiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsIkZvcm0iLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJFbXBsb3llZXNBUEkiLCJzYXZlTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImFwaUlkIiwiaGlkZSIsImdldFJlY29yZCIsInBvcHVsYXRlRm9ybVdpdGhEYXRhIiwiYXZhdGFyIiwic2hvd0Vycm9yIiwiZXJyb3IiLCJ1cmxQYXJ0cyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImV4dGVuc2lvbnNfbGVuZ3RoIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YSIsInRleHQiLCJzZXRBdmF0YXJVcmwiLCJ1c2VyX2F2YXRhciIsIkV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IiLCJpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJpbmNsdWRlRW1wdHkiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsImV4X1NlbGVjdE5ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsIm5ld0V4dGVuc2lvbiIsInVwZGF0ZUZvcndhcmRpbmdEcm9wZG93bnNFeGNsdXNpb24iLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImZvcndhcmRpbmdGaWVsZHMiLCJmb3JFYWNoIiwiZmllbGROYW1lIiwiY3VycmVudFRleHQiLCJyZW1vdmUiLCJyZWZyZXNoRGF0YSIsImlzTmV3RXh0ZW5zaW9uIiwiaWQiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsInZhbGlkYXRpb24iLCJWQUxJREFUSU9OIiwiU09GVCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwidmFsaWRhdGVPbklucHV0IiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwiaW5jbHVkZVNwZWNpYWwiLCJvbkdlbmVyYXRlIiwicGFzc3dvcmQiLCJkYXRhQ2hhbmdlZCIsIm9uVmFsaWRhdGUiLCJpc1ZhbGlkIiwic2NvcmUiLCIkZHJvcGRvd24iLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiZW1wbG95ZWVOYW1lIiwiZXh0ZW5zaW9uTnVtYmVyIiwiaGVhZGVyVGV4dCIsInRyaW0iLCJleF9DcmVhdGVOZXdFeHRlbnNpb24iLCJodG1sIiwiZXh0ZW5zaW9uUnVsZSIsImZ3ZFJpbmdMZW5ndGgiLCJmd2RGb3J3YXJkaW5nIiwiZXhpc3RSdWxlIiwidmFsdWUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsInBhc3N3b3JkU3RyZW5ndGgiLCJzdGF0ZSIsImdldFN0YXRlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsU0FBUyxHQUFHO0FBQ2RDLEVBQUFBLFlBQVksRUFBRSxFQURBO0FBRWRDLEVBQUFBLGFBQWEsRUFBRSxFQUZEO0FBR2RDLEVBQUFBLG1CQUFtQixFQUFFLEVBSFA7QUFJZEMsRUFBQUEsT0FBTyxFQUFFQyxDQUFDLENBQUMsU0FBRCxDQUpJO0FBS2RDLEVBQUFBLFdBQVcsRUFBRUQsQ0FBQyxDQUFDLGFBQUQsQ0FMQTtBQU1kRSxFQUFBQSxjQUFjLEVBQUVGLENBQUMsQ0FBQyxnQkFBRCxDQU5IO0FBT2RHLEVBQUFBLGVBQWUsRUFBRUgsQ0FBQyxDQUFDLGlCQUFELENBUEo7QUFRZEksRUFBQUEscUJBQXFCLEVBQUVKLENBQUMsQ0FBQyx1QkFBRCxDQVJWO0FBU2RLLEVBQUFBLDRCQUE0QixFQUFFTCxDQUFDLENBQUMsOEJBQUQsQ0FUakI7QUFVZE0sRUFBQUEsTUFBTSxFQUFFTixDQUFDLENBQUMsYUFBRCxDQVZLO0FBV2RPLEVBQUFBLGNBQWMsRUFBRVAsQ0FBQyxDQUFDLGdCQUFELENBWEg7O0FBYWQ7QUFDSjtBQUNBO0FBQ0E7QUFDSVEsRUFB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LFNBQXNCalAsQ0FBQyxZQUFLaVAsU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDOztBQUdBbFAsQ0FBQyxDQUFDd0csRUFBRixDQUFLeEMsSUFBTCxDQUFVMkUsUUFBVixDQUFtQjVILEtBQW5CLENBQXlCb08sZ0JBQXpCLEdBQTRDLFlBQU07QUFDOUM7QUFDQSxNQUFJeFAsU0FBUyxDQUFDYSxjQUFkLEVBQThCO0FBQzFCLFFBQU00TyxLQUFLLEdBQUdyQyxjQUFjLENBQUNzQyxRQUFmLENBQXdCMVAsU0FBUyxDQUFDYSxjQUFsQyxDQUFkO0FBQ0EsV0FBTzRPLEtBQUssSUFBSUEsS0FBSyxDQUFDbEIsS0FBTixJQUFlLEVBQS9CLENBRjBCLENBRVM7QUFDdEM7O0FBQ0QsU0FBTyxJQUFQLENBTjhDLENBTWpDO0FBQ2hCLENBUEQ7QUFTQTtBQUNBO0FBQ0E7OztBQUNBbE8sQ0FBQyxDQUFDc1AsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjVQLEVBQUFBLFNBQVMsQ0FBQytDLFVBQVY7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9uc0FQSSwgRW1wbG95ZWVzQVBJLCBGb3JtLFxuIElucHV0TWFza1BhdHRlcm5zLCBhdmF0YXIsIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IsIENsaXBib2FyZEpTLCBQYXNzd29yZFdpZGdldCwgVXNlck1lc3NhZ2UgKi9cblxuXG4vKipcbiAqIFRoZSBleHRlbnNpb24gb2JqZWN0LlxuICogTWFuYWdlcyB0aGUgb3BlcmF0aW9ucyBhbmQgYmVoYXZpb3JzIG9mIHRoZSBleHRlbnNpb24gZWRpdCBmb3JtXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25cbiAqL1xuY29uc3QgZXh0ZW5zaW9uID0ge1xuICAgIGRlZmF1bHRFbWFpbDogJycsXG4gICAgZGVmYXVsdE51bWJlcjogJycsXG4gICAgZGVmYXVsdE1vYmlsZU51bWJlcjogJycsXG4gICAgJG51bWJlcjogJCgnI251bWJlcicpLFxuICAgICRzaXBfc2VjcmV0OiAkKCcjc2lwX3NlY3JldCcpLFxuICAgICRtb2JpbGVfbnVtYmVyOiAkKCcjbW9iaWxlX251bWJlcicpLFxuICAgICRmd2RfZm9yd2FyZGluZzogJCgnI2Z3ZF9mb3J3YXJkaW5nJyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb25idXN5OiAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKSxcbiAgICAkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiAkKCcjZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyksXG4gICAgJGVtYWlsOiAkKCcjdXNlcl9lbWFpbCcpLFxuICAgICR1c2VyX3VzZXJuYW1lOiAkKCcjdXNlcl91c2VybmFtZScpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHdpZGdldCBpbnN0YW5jZS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHBhc3N3b3JkV2lkZ2V0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2V4dGVuc2lvbnMtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYnVsYXIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51SXRlbXM6ICQoJyNleHRlbnNpb25zLW1lbnUgLml0ZW0nKSxcblxuXG4gICAgLyoqXG4gICAgICogU3RyaW5nIGZvciB0aGUgZm9yd2FyZGluZyBzZWxlY3QuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBmb3J3YXJkaW5nU2VsZWN0OiAnI2V4dGVuc2lvbnMtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG51bWJlcjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ251bWJlcicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIG1vYmlsZV9udW1iZXI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ21vYmlsZV9udW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXNrJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbW9iaWxlLW51bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX2VtYWlsOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUVtYWlsRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHVzZXJfdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNpcF9zZWNyZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzaXBfc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRXZWFrLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncGFzc3dvcmRTdHJlbmd0aCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlUGFzc3dvcmRUb29XZWFrXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZndkX3JpbmdsZW5ndGg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfcmluZ2xlbmd0aCcsXG4gICAgICAgICAgICBkZXBlbmRzOiAnZndkX2ZvcndhcmRpbmcnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzMuLjE4MF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVJpbmdpbmdCZWZvcmVGb3J3YXJkT3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZndkX2ZvcndhcmRpbmc6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5zaW9uUnVsZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nb25idXN5OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGV4dGVuc2lvbiBmb3JtIGFuZCBpdHMgaW50ZXJhY3Rpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIERlZmF1bHQgdmFsdWVzIHdpbGwgYmUgc2V0IGFmdGVyIFJFU1QgQVBJIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBlbXB0eSB2YWx1ZXMgc2luY2UgZm9ybXMgYXJlIGVtcHR5IHVudGlsIEFQSSByZXNwb25kc1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gJyc7XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gJyc7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgbWVudSBpdGVtcywgYWNjb3JkaW9ucywgYW5kIGRyb3Bkb3duIG1lbnVzXG4gICAgICAgIGV4dGVuc2lvbi4kdGFiTWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG4gICAgICAgICQoJyNleHRlbnNpb25zLWZvcm0gLnVpLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGZvciBxdWVzdGlvbiBpY29ucyBhbmQgYnV0dG9uc1xuICAgICAgICAkKFwiaS5xdWVzdGlvblwiKS5wb3B1cCgpO1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gUHJldmVudCBicm93c2VyIHBhc3N3b3JkIG1hbmFnZXIgZm9yIGdlbmVyYXRlZCBwYXNzd29yZHNcbiAgICAgICAgZXh0ZW5zaW9uLiRzaXBfc2VjcmV0Lm9uKCdmb2N1cycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdhdXRvY29tcGxldGUnLCAnbmV3LXBhc3N3b3JkJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGV4dGVuc2lvbiBmb3JtXG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBoYW5kbGVyIGZvciB1c2VybmFtZSBjaGFuZ2UgdG8gdXBkYXRlIHBhZ2UgdGl0bGVcbiAgICAgICAgZXh0ZW5zaW9uLiR1c2VyX3VzZXJuYW1lLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzayA/IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpIDogZXh0ZW5zaW9uLiRudW1iZXIudmFsKCk7XG4gICAgICAgICAgICBleHRlbnNpb24udXBkYXRlUGFnZUhlYWRlcigkKHRoaXMpLnZhbCgpLCBjdXJyZW50TnVtYmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWxzbyB1cGRhdGUgaGVhZGVyIHdoZW4gZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzXG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFVzZXJuYW1lID0gZXh0ZW5zaW9uLiR1c2VyX3VzZXJuYW1lLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudE51bWJlciA9ICQodGhpcykuaW5wdXRtYXNrID8gJCh0aGlzKS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKSA6ICQodGhpcykudmFsKCk7XG4gICAgICAgICAgICBleHRlbnNpb24udXBkYXRlUGFnZUhlYWRlcihjdXJyZW50VXNlcm5hbWUsIGN1cnJlbnROdW1iZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBhZHZhbmNlZCBzZXR0aW5ncyB1c2luZyB1bmlmaWVkIHN5c3RlbVxuICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHRlbnNpb25Ub29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIG9sZCBuYW1lIGlmIG5ldyBjbGFzcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBleHRlbnNpb25Ub29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMb2FkIGV4dGVuc2lvbiBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICBleHRlbnNpb24ubG9hZEV4dGVuc2lvbkRhdGEoKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHBhc3RlIG1vYmlsZSBudW1iZXIgZnJvbSBjbGlwYm9hcmRcbiAgICAgKi9cbiAgICBjYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJdCBpcyBleGVjdXRlZCBhZnRlciBhIHBob25lIG51bWJlciBoYXMgYmVlbiBlbnRlcmVkIGNvbXBsZXRlbHkuXG4gICAgICogSXQgc2VydmVzIHRvIGNoZWNrIGlmIHRoZXJlIGFyZSBhbnkgY29uZmxpY3RzIHdpdGggZXhpc3RpbmcgcGhvbmUgbnVtYmVycy5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSBlbnRlcmVkIHBob25lIG51bWJlciBhZnRlciByZW1vdmluZyBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGBjaGVja0F2YWlsYWJpbGl0eWAgZnVuY3Rpb24gb24gYEV4dGVuc2lvbnNgIG9iamVjdFxuICAgICAgICAvLyB0byBjaGVjayB3aGV0aGVyIHRoZSBlbnRlcmVkIHBob25lIG51bWJlciBpcyBhbHJlYWR5IGluIHVzZS5cbiAgICAgICAgLy8gUGFyYW1ldGVyczogZGVmYXVsdCBudW1iZXIsIG5ldyBudW1iZXIsIGNsYXNzIG5hbWUgb2YgZXJyb3IgbWVzc2FnZSAobnVtYmVyKSwgdXNlciBpZFxuICAgICAgICBFeHRlbnNpb25zQVBJLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyLCBuZXdOdW1iZXIsICdudW1iZXInLCB1c2VySWQpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgb25jZSBhbiBlbWFpbCBhZGRyZXNzIGhhcyBiZWVuIGNvbXBsZXRlbHkgZW50ZXJlZC5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVFbWFpbCgpIHtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgYWZ0ZXIgcmVtb3ZpbmcgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3RW1haWwgPSBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSB1c2VyIElEIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cbiAgICAgICAgLy8gQ2FsbCB0aGUgYGNoZWNrQXZhaWxhYmlsaXR5YCBmdW5jdGlvbiBvbiBgVXNlcnNBUElgIG9iamVjdFxuICAgICAgICAvLyB0byBjaGVjayB3aGV0aGVyIHRoZSBlbnRlcmVkIGVtYWlsIGlzIGFscmVhZHkgaW4gdXNlLlxuICAgICAgICAvLyBQYXJhbWV0ZXJzOiBkZWZhdWx0IGVtYWlsLCBuZXcgZW1haWwsIGNsYXNzIG5hbWUgb2YgZXJyb3IgbWVzc2FnZSAoZW1haWwpLCB1c2VyIGlkXG4gICAgICAgIFVzZXJzQVBJLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0RW1haWwsIG5ld0VtYWlsLCdlbWFpbCcsIHVzZXJJZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFjdGl2YXRlZCB3aGVuIGVudGVyaW5nIGEgbW9iaWxlIHBob25lIG51bWJlciBpbiB0aGUgZW1wbG95ZWUncyBwcm9maWxlLlxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZU1vYmlsZU51bWJlcigpIHtcbiAgICAgICAgLy8gR2V0IHRoZSBuZXcgbW9iaWxlIG51bWJlciB3aXRob3V0IGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld01vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBHZXQgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIER5bmFtaWMgY2hlY2sgdG8gc2VlIGlmIHRoZSBzZWxlY3RlZCBtb2JpbGUgbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAgICBFeHRlbnNpb25zQVBJLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyLCBuZXdNb2JpbGVOdW1iZXIsICdtb2JpbGUtbnVtYmVyJywgdXNlcklkKTtcblxuICAgICAgICAvLyBSZWZpbGwgdGhlIG1vYmlsZSBkaWFsc3RyaW5nIGlmIHRoZSBuZXcgbW9iaWxlIG51bWJlciBpcyBkaWZmZXJlbnQgdGhhbiB0aGUgZGVmYXVsdCBvciBpZiB0aGUgbW9iaWxlIGRpYWxzdHJpbmcgaXMgZW1wdHlcbiAgICAgICAgaWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXJcbiAgICAgICAgICAgIHx8IChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJykubGVuZ3RoID09PSAwKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vYmlsZSBudW1iZXIgaGFzIGNoYW5nZWRcbiAgICAgICAgaWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHVzZXJuYW1lIGZyb20gdGhlIGZvcm1cbiAgICAgICAgICAgIGNvbnN0IHVzZXJOYW1lID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX3VzZXJuYW1lJyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3J3YXJkaW5nIGZpZWxkcyB0aGF0IG1hdGNoIHRoZSBvbGQgbW9iaWxlIG51bWJlclxuICAgICAgICAgICAgY29uc3QgY3VycmVudEZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RndkT25CdXN5ID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEZ3ZE9uVW5hdmFpbGFibGUgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZndkX2ZvcndhcmRpbmcgaWYgaXQgbWF0Y2hlcyBvbGQgbW9iaWxlIG51bWJlciAoaW5jbHVkaW5nIGVtcHR5KVxuICAgICAgICAgICAgaWYgKGN1cnJlbnRGd2RGb3J3YXJkaW5nID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHJpbmcgbGVuZ3RoIGlmIGVtcHR5XG4gICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKS5sZW5ndGggPT09IDBcbiAgICAgICAgICAgICAgICAgICAgfHwgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpPT09XCIwXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDQ1KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLnNldFZhbHVlKCdmd2RfZm9yd2FyZGluZycsIG5ld01vYmlsZU51bWJlciwgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmd2RfZm9yd2FyZGluZ29uYnVzeSBpZiBpdCBtYXRjaGVzIG9sZCBtb2JpbGUgbnVtYmVyIChpbmNsdWRpbmcgZW1wdHkpXG4gICAgICAgICAgICBpZiAoY3VycmVudEZ3ZE9uQnVzeSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLnNldFZhbHVlKCdmd2RfZm9yd2FyZGluZ29uYnVzeScsIG5ld01vYmlsZU51bWJlciwgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUgaWYgaXQgbWF0Y2hlcyBvbGQgbW9iaWxlIG51bWJlciAoaW5jbHVkaW5nIGVtcHR5KVxuICAgICAgICAgICAgaWYgKGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3Iuc2V0VmFsdWUoJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIG5ld01vYmlsZU51bWJlciwgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IHRoZSBuZXcgbW9iaWxlIG51bWJlciBhcyB0aGUgZGVmYXVsdFxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IG5ld01vYmlsZU51bWJlcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdoZW4gdGhlIG1vYmlsZSBwaG9uZSBudW1iZXIgaXMgY2xlYXJlZCBpbiB0aGUgZW1wbG95ZWUgY2FyZC5cbiAgICAgKi9cbiAgICBjYk9uQ2xlYXJlZE1vYmlsZU51bWJlcigpIHtcbiAgICAgICAgLy8gQ2hlY2sgY3VycmVudCBmb3J3YXJkaW5nIHZhbHVlcyBiZWZvcmUgY2xlYXJpbmdcbiAgICAgICAgY29uc3QgY3VycmVudEZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPbkJ1c3kgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jyk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIHRoZSAnbW9iaWxlX2RpYWxzdHJpbmcnIGFuZCAnbW9iaWxlX251bWJlcicgZmllbGRzIGluIHRoZSBmb3JtXG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX251bWJlcicsICcnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGN1cnJlbnRGd2RGb3J3YXJkaW5nID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIGNsZWFyIHRoZSAnZndkX3JpbmdsZW5ndGgnIGZpZWxkIGFuZCBjbGVhciBmb3J3YXJkaW5nIGRyb3Bkb3duXG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgMCk7XG4gICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuY2xlYXIoJ2Z3ZF9mb3J3YXJkaW5nJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdoZW4gYnVzeSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChjdXJyZW50RndkT25CdXN5ID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmNsZWFyKCdmd2RfZm9yd2FyZGluZ29uYnVzeScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIHVuYXZhaWxhYmxlIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmNsZWFyKCdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIHRoZSBkZWZhdWx0IG1vYmlsZSBudW1iZXJcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSAnJztcbiAgICB9LFxuXG4gICAgaW5pdGlhbGl6ZUlucHV0TWFza3MoKXtcbiAgICAgICAgLy8gU2V0IHVwIG51bWJlciBpbnB1dCBtYXNrIHdpdGggY29ycmVjdCBsZW5ndGggZnJvbSBBUElcbiAgICAgICAgbGV0IHRpbWVvdXROdW1iZXJJZDtcblxuICAgICAgICAvLyBBbHdheXMgaW5pdGlhbGl6ZSBtYXNrIGJhc2VkIG9uIGV4dGVuc2lvbnNfbGVuZ3RoIGZyb20gQVBJXG4gICAgICAgIC8vIE5vIGRlZmF1bHRzIGluIEphdmFTY3JpcHQgLSB2YWx1ZSBtdXN0IGNvbWUgZnJvbSBBUElcbiAgICAgICAgaWYgKGV4dGVuc2lvbi5leHRlbnNpb25zTGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25zTGVuZ3RoID0gcGFyc2VJbnQoZXh0ZW5zaW9uLmV4dGVuc2lvbnNMZW5ndGgsIDEwKTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25zTGVuZ3RoID49IDIgJiYgZXh0ZW5zaW9uc0xlbmd0aCA8PSAxMCkge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgbWFzayB3aXRoIGNvcnJlY3QgbGVuZ3RoIGFuZCBvbmNvbXBsZXRlIGhhbmRsZXJcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soe1xuICAgICAgICAgICAgICAgICAgICBtYXNrOiBgOXsyLCR7ZXh0ZW5zaW9uc0xlbmd0aH19YCxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICdfJyxcbiAgICAgICAgICAgICAgICAgICAgb25jb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aW1lb3V0TnVtYmVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dE51bWJlcklkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXROdW1iZXJJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2tzIGZvciB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBjb25zdCBtYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrcyh7XG4gICAgICAgICAgICBpbnB1dG1hc2s6IHtcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAnIyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcjogJ1swLTldJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRpbmFsaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25jbGVhcmVkOiBleHRlbnNpb24uY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIsXG4gICAgICAgICAgICAgICAgb25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcbiAgICAgICAgICAgICAgICBzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBvbkJlZm9yZVBhc3RlIHRvIHByZXZlbnQgY29uZmxpY3RzIHdpdGggb3VyIGN1c3RvbSBoYW5kbGVyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICByZXBsYWNlOiAnOScsXG4gICAgICAgICAgICBsaXN0OiBtYXNrTGlzdCxcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGhhbmRsZXIgZm9yIHByb2dyYW1tYXRpYyB2YWx1ZSBjaGFuZ2VzIChmb3IgdGVzdHMgYW5kIGF1dG9tYXRpb24pXG4gICAgICAgIGNvbnN0IG9yaWdpbmFsVmFsID0gJC5mbi52YWw7XG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5vZmYoJ3ZhbC5vdmVycmlkZScpLm9uKCd2YWwub3ZlcnJpZGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0aGlzID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgICAgICAgIC8vIElmIHNldHRpbmcgYSB2YWx1ZSBwcm9ncmFtbWF0aWNhbGx5XG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAwICYmIHR5cGVvZiBhcmdzWzBdID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gYXJnc1swXTtcblxuICAgICAgICAgICAgICAgIC8vIFRlbXBvcmFyaWx5IHJlbW92ZSBtYXNrXG4gICAgICAgICAgICAgICAgaWYgKCR0aGlzLmRhdGEoJ2lucHV0bWFzaycpKSB7XG4gICAgICAgICAgICAgICAgICAgICR0aGlzLmlucHV0bWFzaygncmVtb3ZlJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZVxuICAgICAgICAgICAgICAgIG9yaWdpbmFsVmFsLmFwcGx5KHRoaXMsIGFyZ3MpO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVhcHBseSBtYXNrIGFmdGVyIGEgc2hvcnQgZGVsYXlcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJHRoaXMudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5vbigncGFzdGUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7IC8vIFByZXZlbnQgZGVmYXVsdCBwYXN0ZSBiZWhhdmlvclxuXG4gICAgICAgICAgICAvLyBHZXQgcGFzdGVkIGRhdGEgZnJvbSBjbGlwYm9hcmRcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG5cbiAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgZGF0YSBmcm9tIGNsaXBib2FyZCBldmVudFxuICAgICAgICAgICAgaWYgKGUub3JpZ2luYWxFdmVudCAmJiBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YSAmJiBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5jbGlwYm9hcmREYXRhICYmIGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gRGlyZWN0IGNsaXBib2FyZERhdGEgYWNjZXNzXG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5jbGlwYm9hcmREYXRhICYmIHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgSUVcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiB3ZSBjb3VsZG4ndCBnZXQgY2xpcGJvYXJkIGRhdGEsIGRvbid0IHByb2Nlc3NcbiAgICAgICAgICAgIGlmICghcGFzdGVkRGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUHJvY2VzcyB0aGUgcGFzdGVkIGRhdGFcbiAgICAgICAgICAgIGxldCBwcm9jZXNzZWREYXRhO1xuICAgICAgICAgICAgaWYgKHBhc3RlZERhdGEuY2hhckF0KDApID09PSAnKycpIHtcbiAgICAgICAgICAgICAgICAvLyBLZWVwICcrJyBhbmQgcmVtb3ZlIG90aGVyIG5vbi1kaWdpdCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgcHJvY2Vzc2VkRGF0YSA9ICcrJyArIHBhc3RlZERhdGEuc2xpY2UoMSkucmVwbGFjZSgvXFxEL2csICcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGFsbCBub24tZGlnaXQgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgIHByb2Nlc3NlZERhdGEgPSBwYXN0ZWREYXRhLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluc2VydCBjbGVhbmVkIGRhdGEgaW50byB0aGUgaW5wdXQgZmllbGRcbiAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gaW5wdXQuc2VsZWN0aW9uU3RhcnQgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IGlucHV0LnNlbGVjdGlvbkVuZCB8fCAwO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJChpbnB1dCkudmFsKCkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGN1cnJlbnRWYWx1ZS5zdWJzdHJpbmcoMCwgc3RhcnQpICsgcHJvY2Vzc2VkRGF0YSArIGN1cnJlbnRWYWx1ZS5zdWJzdHJpbmcoZW5kKTtcblxuICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgcmVtb3ZlIG1hc2ssIHNldCB2YWx1ZSwgdGhlbiByZWFwcGx5XG4gICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKFwicmVtb3ZlXCIpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLnZhbChuZXdWYWx1ZSk7XG5cbiAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSB0aGUgdmFsdWUgaXMgc2V0IGJlZm9yZSByZWFwcGx5aW5nIG1hc2tcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgaW5wdXQgZXZlbnQgdG8gcmVhcHBseSB0aGUgbWFza1xuICAgICAgICAgICAgICAgICQoaW5wdXQpLnRyaWdnZXIoJ2lucHV0Jyk7XG4gICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCB0aGUgaW5wdXQgbWFzayBmb3IgdGhlIGVtYWlsIGlucHV0XG4gICAgICAgIGxldCB0aW1lb3V0RW1haWxJZDtcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZTogKCk9PntcbiAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgcHJldmlvdXMgdGltZXIsIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICh0aW1lb3V0RW1haWxJZCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dEVtYWlsSWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgICAgICAgdGltZW91dEVtYWlsSWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsKCk7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBleHRlbnNpb24uJGVtYWlsLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vQXR0YWNoIGEgZm9jdXNvdXQgZXZlbnQgbGlzdGVuZXIgdG8gdGhlIG1vYmlsZSBudW1iZXIgaW5wdXRcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmZvY3Vzb3V0KGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsZXQgcGhvbmUgPSAkKGUudGFyZ2V0KS52YWwoKS5yZXBsYWNlKC9bXjAtOV0vZywgXCJcIik7XG4gICAgICAgICAgICBpZiAocGhvbmUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJChlLnRhcmdldCkudmFsKCcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIG5ldyBTSVAgcGFzc3dvcmQuXG4gICAgICogVXNlcyB0aGUgUGFzc3dvcmRXaWRnZXQgYnV0dG9uIGxpa2UgaW4gQU1JIG1hbmFnZXIuXG4gICAgICovXG4gICAgZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcbiAgICAgICAgLy8gVHJpZ2dlciBwYXNzd29yZCBnZW5lcmF0aW9uIHRocm91Z2ggdGhlIHdpZGdldCBidXR0b24gKGxpa2UgaW4gQU1JKVxuICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBleHRlbnNpb24uJHNpcF9zZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJGdlbmVyYXRlQnRuLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEubW9iaWxlX251bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZW1vdmUgZm9ybSBjb250cm9sIGZpZWxkcyB0aGF0IHNob3VsZG4ndCBiZSBzZW50IHRvIHNlcnZlclxuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEuZGlycnR5O1xuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEuc3VibWl0TW9kZTtcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLnVzZXJfaWQ7IC8vIFJlbW92ZSB1c2VyX2lkIGZpZWxkIHRvIHByZXZlbnQgdmFsaWRhdGlvbiBpc3N1ZXNcblxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgKGNoZWNrIGlmIHdlIGhhdmUgYSByZWFsIElEKVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBjdXJyZW50IGV4dGVuc2lvbiBudW1iZXIgYXMgdGhlIGRlZmF1bHQgbnVtYmVyIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEubnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSByZXNwb25zZS5kYXRhLm51bWJlcjtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHBob25lIHJlcHJlc2VudGF0aW9uIHdpdGggdGhlIG5ldyBkZWZhdWx0IG51bWJlclxuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZSBhbmQgcmVzcG9uc2UucmVsb2FkIGZyb20gc2VydmVyXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzIGZvciBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qcyBmb3IgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGV4dGVuc2lvbi4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZXh0ZW5zaW9uLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBFbXBsb3llZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyBjaGVja2JveCB2YWx1ZXMgYXJlIHNlbnQgYXMgdHJ1ZS9mYWxzZSBpbnN0ZWFkIG9mIFwib25cIi91bmRlZmluZWRcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFY1LjAgQXJjaGl0ZWN0dXJlOiBMb2FkIGV4dGVuc2lvbiBkYXRhIHZpYSBSRVNUIEFQSSAoc2ltaWxhciB0byBJVlIgbWVudSBwYXR0ZXJuKVxuICAgICAqL1xuICAgIGxvYWRFeHRlbnNpb25EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGV4dGVuc2lvbi5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlICduZXcnIGFzIElEIGZvciBuZXcgcmVjb3JkcyB0byBnZXQgZGVmYXVsdCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgY29uc3QgYXBpSWQgPSByZWNvcmRJZCA9PT0gJycgPyAnbmV3JyA6IHJlY29yZElkO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlkZSBtb25pdG9yaW5nIGVsZW1lbnRzIGZvciBuZXcgZW1wbG95ZWVzXG4gICAgICAgIGlmIChhcGlJZCA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgICQoJyNzdGF0dXMnKS5oaWRlKCk7IC8vIEhpZGUgc3RhdHVzIGxhYmVsXG4gICAgICAgICAgICAkKCdhW2RhdGEtdGFiPVwic3RhdHVzXCJdJykuaGlkZSgpOyAvLyBIaWRlIG1vbml0b3JpbmcgdGFiXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEVtcGxveWVlc0FQSS5nZXRSZWNvcmQoYXBpSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5wb3B1bGF0ZUZvcm1XaXRoRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBkZWZhdWx0IHZhbHVlcyBhZnRlciBkYXRhIGxvYWRcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IHJlc3BvbnNlLmRhdGEubnVtYmVyIHx8ICcnO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPSByZXNwb25zZS5kYXRhLnVzZXJfZW1haWwgfHwgJyc7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSByZXNwb25zZS5kYXRhLm1vYmlsZV9udW1iZXIgfHwgJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3Jkcywgc3RpbGwgaW5pdGlhbGl6ZSBhdmF0YXIgZXZlbiBpZiBBUEkgZmFpbHNcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGF2YXRhci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIGV4dGVuc2lvbiBkYXRhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTCAobGlrZSBJVlIgbWVudSlcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIFJFU1QgQVBJIChWNS4wIGNsZWFuIGRhdGEgYXJjaGl0ZWN0dXJlKVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybVdpdGhEYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gU3RvcmUgZXh0ZW5zaW9uc19sZW5ndGggZnJvbSBBUEkgZm9yIHVzZSBpbiBpbml0aWFsaXplSW5wdXRNYXNrc1xuICAgICAgICAvLyBUaGlzIHZhbHVlIE1VU1QgY29tZSBmcm9tIEFQSSAtIG5vIGRlZmF1bHRzIGluIEpTXG4gICAgICAgIGV4dGVuc2lvbi5leHRlbnNpb25zTGVuZ3RoID0gZGF0YS5leHRlbnNpb25zX2xlbmd0aDtcblxuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaCAoc2FtZSBhcyBJVlIgbWVudSlcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NlcyAtIGNvbXBsZXRlIGF1dG9tYXRpb25cbiAgICAgICAgICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEoZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4dGVuc2lvbiBudW1iZXIgaW4gYW55IFVJIGVsZW1lbnRzIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGlmIChmb3JtRGF0YS5udW1iZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1udW1iZXItZGlzcGxheScpLnRleHQoZm9ybURhdGEubnVtYmVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBhdmF0YXIgY29tcG9uZW50IGFmdGVyIGZvcm0gcG9wdWxhdGlvblxuICAgICAgICAgICAgICAgIGF2YXRhci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IGF2YXRhciBVUkwgZHluYW1pY2FsbHkgZnJvbSBBUEkgZGF0YVxuICAgICAgICAgICAgICAgIGF2YXRhci5zZXRBdmF0YXJVcmwoZm9ybURhdGEudXNlcl9hdmF0YXIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIG1vZGlmeSBzdGF0dXMgbW9uaXRvciBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggZW1wbG95ZWUgbmFtZSBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVQYWdlSGVhZGVyKGZvcm1EYXRhLnVzZXJfdXNlcm5hbWUsIGZvcm1EYXRhLm51bWJlcik7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dCBtYXNrcyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplSW5wdXRNYXNrcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5PVEU6IEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKSB3aWxsIGJlIGNhbGxlZCBhdXRvbWF0aWNhbGx5IGJ5IEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjbGVhbiBkYXRhIC0gVjUuMCBBcmNoaXRlY3R1cmVcbiAgICAgKiBVc2VzIHNwZWNpYWxpemVkIGNsYXNzZXMgd2l0aCBjb21wbGV0ZSBhdXRvbWF0aW9uIChubyBvbkNoYW5nZSBjYWxsYmFja3MgbmVlZGVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRXh0ZW5zaW9uIGRyb3Bkb3ducyB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvbiAtIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZndkX2ZvcndhcmRpbmcnLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZ29uYnVzeScsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJywgXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIEFQSSBkYXRhIC0gVjUuMCBiYXNlIGNsYXNzXG4gICAgICAgIFxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3NpcF9uZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6IGAvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109U0lQYCxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0TmV0d29ya0ZpbHRlcixcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFY1LjAgYXJjaGl0ZWN0dXJlIHdpdGggZW1wdHkgZm9ybSBzaG91bGQgbm90IGhhdmUgSFRNTCBlbnRpdGllcyBpc3N1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXMgLSByZWJ1aWxkIGRyb3Bkb3ducyB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIub2ZmKCdjaGFuZ2UuZHJvcGRvd24nKS5vbignY2hhbmdlLmRyb3Bkb3duJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV3RXh0ZW5zaW9uID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdudW1iZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG5ld0V4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleGNsdXNpb25zIGZvciBmb3J3YXJkaW5nIGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uKG5ld0V4dGVuc2lvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpO1xuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZm9yd2FyZGluZyBkcm9wZG93bnMgd2hlbiBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXNcbiAgICAgKi9cbiAgICB1cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uKG5ld0V4dGVuc2lvbikge1xuICAgICAgICBjb25zdCBmb3J3YXJkaW5nRmllbGRzID0gWydmd2RfZm9yd2FyZGluZycsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnXTtcbiAgICAgICAgXG4gICAgICAgIGZvcndhcmRpbmdGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJChgIyR7ZmllbGROYW1lfWApLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFRleHQgPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCkuZmluZCgnLnRleHQnKS50ZXh0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBvbGQgZHJvcGRvd25cbiAgICAgICAgICAgICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBkYXRhIG9iamVjdCB3aXRoIGN1cnJlbnQgdmFsdWUgZm9yIHJlaW5pdGlhbGl6aW5nXG4gICAgICAgICAgICBjb25zdCByZWZyZXNoRGF0YSA9IHt9O1xuICAgICAgICAgICAgcmVmcmVzaERhdGFbZmllbGROYW1lXSA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgIHJlZnJlc2hEYXRhW2Ake2ZpZWxkTmFtZX1fcmVwcmVzZW50YF0gPSBjdXJyZW50VGV4dDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVpbml0aWFsaXplIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdChmaWVsZE5hbWUsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtuZXdFeHRlbnNpb25dLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiByZWZyZXNoRGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgYWZ0ZXIgZm9ybSBkYXRhIGlzIGxvYWRlZFxuICAgICAqIFRoaXMgZW5zdXJlcyB2YWxpZGF0aW9uIG9ubHkgaGFwcGVucyBhZnRlciBwYXNzd29yZCBpcyBwb3B1bGF0ZWQgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmb3JtRGF0YSAtIFRoZSBmb3JtIGRhdGEgbG9hZGVkIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoZm9ybURhdGEpIHtcbiAgICAgICAgaWYgKCFleHRlbnNpb24uJHNpcF9zZWNyZXQubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIaWRlIGFueSBsZWdhY3kgYnV0dG9ucyBpZiB0aGV5IGV4aXN0XG4gICAgICAgICQoJy5jbGlwYm9hcmQnKS5oaWRlKCk7XG4gICAgICAgICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKS5oaWRlKCk7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgZXh0ZW5zaW9uIChubyBJRCkgb3IgZXhpc3Rpbmcgb25lXG4gICAgICAgIGNvbnN0IGlzTmV3RXh0ZW5zaW9uID0gIWZvcm1EYXRhLmlkIHx8IGZvcm1EYXRhLmlkID09PSAnJztcblxuICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KGV4dGVuc2lvbi4kc2lwX3NlY3JldCwge1xuICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULCAgLy8gU29mdCB2YWxpZGF0aW9uIC0gc2hvdyB3YXJuaW5ncyBidXQgYWxsb3cgc3VibWlzc2lvblxuICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsICAgICAgICAgLy8gU2hvdyBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSwgICAgIC8vIFNob3cgc2hvdy9oaWRlIHBhc3N3b3JkIHRvZ2dsZVxuICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLCAgICAgICAgLy8gU2hvdyBjb3B5IHRvIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSwgICAgICAgIC8vIFNob3cgcGFzc3dvcmQgc3RyZW5ndGggYmFyXG4gICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsICAgICAgICAgICAvLyBTaG93IHZhbGlkYXRpb24gd2FybmluZ3NcbiAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSwgICAgICAgIC8vIFZhbGlkYXRlIGFzIHVzZXIgdHlwZXNcbiAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlLCAvLyBBbHdheXMgdmFsaWRhdGUgaWYgcGFzc3dvcmQgZmllbGQgaGFzIHZhbHVlXG4gICAgICAgICAgICBtaW5TY29yZTogMzAsICAgICAgICAgICAgICAgICAvLyBTSVAgcGFzc3dvcmRzIGhhdmUgbG93ZXIgbWluaW11bSBzY29yZSByZXF1aXJlbWVudFxuICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDIwLCAgICAgICAgICAgLy8gMjAgY2hhcnMgbWF4IGZvciBHcmFuZHN0cmVhbSBHRE1TIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgIGluY2x1ZGVTcGVjaWFsOiBmYWxzZSwgICAgICAgIC8vIEV4Y2x1ZGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGZvciBTSVAgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgb25HZW5lcmF0ZTogKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25WYWxpZGF0ZTogKGlzVmFsaWQsIHNjb3JlLCBtZXNzYWdlcykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE9wdGlvbmFsOiBIYW5kbGUgdmFsaWRhdGlvbiByZXN1bHRzIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIC8vIFRoZSB3aWRnZXQgd2lsbCBoYW5kbGUgdmlzdWFsIGZlZWRiYWNrIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSB3aWRnZXQgaW5zdGFuY2UgZm9yIGxhdGVyIHVzZVxuICAgICAgICBleHRlbnNpb24ucGFzc3dvcmRXaWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgbmV3IGV4dGVuc2lvbnMgb25seTogYXV0by1nZW5lcmF0ZSBwYXNzd29yZCBpZiBmaWVsZCBpcyBlbXB0eVxuICAgICAgICBpZiAoaXNOZXdFeHRlbnNpb24gJiYgZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGdlbmVyYXRlQnRuID0gZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LmNsb3Nlc3QoJy51aS5pbnB1dCcpLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAkZ2VuZXJhdGVCdG4udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERUTUYgbW9kZSBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24oKSB7XG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjc2lwX2R0bWZtb2RlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH0pO1xuICAgICB9LFxuICAgICAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRyYW5zcG9ydCBwcm90b2NvbCBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjc2lwX3RyYW5zcG9ydC1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIGVtcGxveWVlIG5hbWUgYW5kIGV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZW1wbG95ZWVOYW1lIC0gTmFtZSBvZiB0aGUgZW1wbG95ZWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uTnVtYmVyIC0gRXh0ZW5zaW9uIG51bWJlciAob3B0aW9uYWwpXG4gICAgICovXG4gICAgdXBkYXRlUGFnZUhlYWRlcihlbXBsb3llZU5hbWUsIGV4dGVuc2lvbk51bWJlcikge1xuICAgICAgICBsZXQgaGVhZGVyVGV4dDtcblxuICAgICAgICBpZiAoZW1wbG95ZWVOYW1lICYmIGVtcGxveWVlTmFtZS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAvLyBFeGlzdGluZyBlbXBsb3llZSB3aXRoIG5hbWVcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSAnPGkgY2xhc3M9XCJ1c2VyIG91dGxpbmUgaWNvblwiPjwvaT4gJyArIGVtcGxveWVlTmFtZTtcblxuICAgICAgICAgICAgLy8gQWRkIGV4dGVuc2lvbiBudW1iZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTnVtYmVyICYmIGV4dGVuc2lvbk51bWJlci50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVyVGV4dCArPSAnICZsdDsnICsgZXh0ZW5zaW9uTnVtYmVyICsgJyZndDsnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTmV3IGVtcGxveWVlIG9yIG5vIG5hbWUgeWV0XG4gICAgICAgICAgICBoZWFkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0NyZWF0ZU5ld0V4dGVuc2lvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBtYWluIGhlYWRlciBjb250ZW50XG4gICAgICAgICQoJ2gxIC5jb250ZW50JykuaHRtbChoZWFkZXJUZXh0KTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogRGVmaW5lIGEgY3VzdG9tIHJ1bGUgZm9yIGpRdWVyeSBmb3JtIHZhbGlkYXRpb24gbmFtZWQgJ2V4dGVuc2lvblJ1bGUnLlxuICogVGhlIHJ1bGUgY2hlY2tzIGlmIGEgZm9yd2FyZGluZyBudW1iZXIgaXMgc2VsZWN0ZWQgYnV0IHRoZSByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUaGUgdmFsaWRhdGlvbiByZXN1bHQuIElmIGZvcndhcmRpbmcgaXMgc2V0IGFuZCByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQsIGl0IHJldHVybnMgZmFsc2UgKGludmFsaWQpLiBPdGhlcndpc2UsIGl0IHJldHVybnMgdHJ1ZSAodmFsaWQpLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9ICgpID0+IHtcbiAgICAvLyBHZXQgcmluZyBsZW5ndGggYW5kIGZvcndhcmRpbmcgbnVtYmVyIGZyb20gdGhlIGZvcm1cbiAgICBjb25zdCBmd2RSaW5nTGVuZ3RoID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpO1xuICAgIGNvbnN0IGZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG5cbiAgICAvLyBJZiBmb3J3YXJkaW5nIG51bWJlciBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgcmV0dXJuIGZhbHNlIChpbnZhbGlkKVxuICAgIGlmIChmd2RGb3J3YXJkaW5nLmxlbmd0aCA+IDBcbiAgICAgICAgJiYgKFxuICAgICAgICAgICAgZndkUmluZ0xlbmd0aCA9PT0gMFxuICAgICAgICAgICAgfHxcbiAgICAgICAgICAgIGZ3ZFJpbmdMZW5ndGggPT09ICcnXG4gICAgICAgICkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgcmV0dXJuIHRydWUgKHZhbGlkKVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIG51bWJlciBpcyB0YWtlbiBieSBhbm90aGVyIGFjY291bnRcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBwYXJhbWV0ZXIgaGFzIHRoZSAnaGlkZGVuJyBjbGFzcywgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMucGFzc3dvcmRTdHJlbmd0aCA9ICgpID0+IHtcbiAgICAvLyBDaGVjayBpZiBwYXNzd29yZCB3aWRnZXQgZXhpc3RzIGFuZCBwYXNzd29yZCBtZWV0cyBtaW5pbXVtIHNjb3JlXG4gICAgaWYgKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IFBhc3N3b3JkV2lkZ2V0LmdldFN0YXRlKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIHJldHVybiBzdGF0ZSAmJiBzdGF0ZS5zY29yZSA+PSAzMDsgLy8gTWluaW11bSBzY29yZSBmb3IgZXh0ZW5zaW9uc1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTsgLy8gUGFzcyB2YWxpZGF0aW9uIGlmIHdpZGdldCBub3QgaW5pdGlhbGl6ZWRcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgRW1wbG95ZWUgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uLmluaXRpYWxpemUoKTtcbn0pO1xuIl19