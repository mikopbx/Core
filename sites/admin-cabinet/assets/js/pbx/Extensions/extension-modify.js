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
        // Mark as new record if we don't have an ID (following CallQueues pattern)
        if (!recordId || recordId === '') {
          response.data._isNew = true;
        }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJHVzZXJfdXNlcm5hbWUiLCJwYXNzd29yZFdpZGdldCIsIiRmb3JtT2JqIiwiJHRhYk1lbnVJdGVtcyIsImZvcndhcmRpbmdTZWxlY3QiLCJ2YWxpZGF0ZVJ1bGVzIiwibnVtYmVyIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyIiwiZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5IiwiZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSIsIm1vYmlsZV9udW1iZXIiLCJvcHRpb25hbCIsImV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0IiwiZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSIsInVzZXJfZW1haWwiLCJleF9WYWxpZGF0ZUVtYWlsRW1wdHkiLCJ1c2VyX3VzZXJuYW1lIiwiZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5Iiwic2lwX3NlY3JldCIsImV4X1ZhbGlkYXRlU2VjcmV0RW1wdHkiLCJleF9WYWxpZGF0ZVNlY3JldFdlYWsiLCJleF9WYWxpZGF0ZVBhc3N3b3JkVG9vV2VhayIsImZ3ZF9yaW5nbGVuZ3RoIiwiZGVwZW5kcyIsImV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlIiwiZndkX2ZvcndhcmRpbmciLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCIsImZ3ZF9mb3J3YXJkaW5nb25idXN5IiwiZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImFjY29yZGlvbiIsInBvcHVwIiwib24iLCJhdHRyIiwiaW5pdGlhbGl6ZUZvcm0iLCJjdXJyZW50TnVtYmVyIiwiaW5wdXRtYXNrIiwidmFsIiwidXBkYXRlUGFnZUhlYWRlciIsImN1cnJlbnRVc2VybmFtZSIsIkV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIiwiZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJsb2FkRXh0ZW5zaW9uRGF0YSIsImNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZSIsInBhc3RlZFZhbHVlIiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibmV3TnVtYmVyIiwidXNlcklkIiwiZm9ybSIsIkV4dGVuc2lvbnNBUEkiLCJjaGVja0F2YWlsYWJpbGl0eSIsImNiT25Db21wbGV0ZUVtYWlsIiwibmV3RW1haWwiLCJVc2Vyc0FQSSIsImNiT25Db21wbGV0ZU1vYmlsZU51bWJlciIsIm5ld01vYmlsZU51bWJlciIsImxlbmd0aCIsInVzZXJOYW1lIiwiY3VycmVudEZ3ZEZvcndhcmRpbmciLCJjdXJyZW50RndkT25CdXN5IiwiY3VycmVudEZ3ZE9uVW5hdmFpbGFibGUiLCJFeHRlbnNpb25TZWxlY3RvciIsInNldFZhbHVlIiwiY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIiLCJjbGVhciIsImluaXRpYWxpemVJbnB1dE1hc2tzIiwidGltZW91dE51bWJlcklkIiwiZXh0ZW5zaW9uc0xlbmd0aCIsInBhcnNlSW50IiwibWFzayIsInBsYWNlaG9sZGVyIiwib25jb21wbGV0ZSIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJtYXNrTGlzdCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9yaWdpbmFsVmFsIiwiZm4iLCJvZmYiLCIkdGhpcyIsImFyZ3MiLCJhcmd1bWVudHMiLCJuZXdWYWx1ZSIsImRhdGEiLCJhcHBseSIsInRyaWdnZXIiLCJlIiwicHJldmVudERlZmF1bHQiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwicHJvY2Vzc2VkRGF0YSIsImNoYXJBdCIsInNsaWNlIiwiaW5wdXQiLCJzdGFydCIsInNlbGVjdGlvblN0YXJ0IiwiZW5kIiwic2VsZWN0aW9uRW5kIiwiY3VycmVudFZhbHVlIiwic3Vic3RyaW5nIiwidGltZW91dEVtYWlsSWQiLCJmb2N1c291dCIsInBob25lIiwidGFyZ2V0IiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIiRnZW5lcmF0ZUJ0biIsImNsb3Nlc3QiLCJmaW5kIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGlycnR5Iiwic3VibWl0TW9kZSIsInVzZXJfaWQiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInVwZGF0ZVBob25lUmVwcmVzZW50IiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsIkZvcm0iLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJFbXBsb3llZXNBUEkiLCJzYXZlTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImFwaUlkIiwiaGlkZSIsImdldFJlY29yZCIsIl9pc05ldyIsInBvcHVsYXRlRm9ybVdpdGhEYXRhIiwiYXZhdGFyIiwic2hvd0Vycm9yIiwiZXJyb3IiLCJ1cmxQYXJ0cyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImV4dGVuc2lvbnNfbGVuZ3RoIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YSIsInRleHQiLCJzZXRBdmF0YXJVcmwiLCJ1c2VyX2F2YXRhciIsIkV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IiLCJpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJpbmNsdWRlRW1wdHkiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsImV4X1NlbGVjdE5ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsIm5ld0V4dGVuc2lvbiIsInVwZGF0ZUZvcndhcmRpbmdEcm9wZG93bnNFeGNsdXNpb24iLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImZvcndhcmRpbmdGaWVsZHMiLCJmb3JFYWNoIiwiZmllbGROYW1lIiwiY3VycmVudFRleHQiLCJyZW1vdmUiLCJyZWZyZXNoRGF0YSIsImlzTmV3RXh0ZW5zaW9uIiwiaWQiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsInZhbGlkYXRpb24iLCJWQUxJREFUSU9OIiwiU09GVCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwidmFsaWRhdGVPbklucHV0IiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwiaW5jbHVkZVNwZWNpYWwiLCJvbkdlbmVyYXRlIiwicGFzc3dvcmQiLCJkYXRhQ2hhbmdlZCIsIm9uVmFsaWRhdGUiLCJpc1ZhbGlkIiwic2NvcmUiLCIkZHJvcGRvd24iLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiZW1wbG95ZWVOYW1lIiwiZXh0ZW5zaW9uTnVtYmVyIiwiaGVhZGVyVGV4dCIsInRyaW0iLCJleF9DcmVhdGVOZXdFeHRlbnNpb24iLCJodG1sIiwiZXh0ZW5zaW9uUnVsZSIsImZ3ZFJpbmdMZW5ndGgiLCJmd2RGb3J3YXJkaW5nIiwiZXhpc3RSdWxlIiwidmFsdWUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsInBhc3N3b3JkU3RyZW5ndGgiLCJzdGF0ZSIsImdldFN0YXRlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsU0FBUyxHQUFHO0FBQ2RDLEVBQUFBLFlBQVksRUFBRSxFQURBO0FBRWRDLEVBQUFBLGFBQWEsRUFBRSxFQUZEO0FBR2RDLEVBQUFBLG1CQUFtQixFQUFFLEVBSFA7QUFJZEMsRUFBQUEsT0FBTyxFQUFFQyxDQUFDLENBQUMsU0FBRCxDQUpJO0FBS2RDLEVBQUFBLFdBQVcsRUFBRUQsQ0FBQyxDQUFDLGFBQUQsQ0FMQTtBQU1kRSxFQUFBQSxjQUFjLEVBQUVGLENBQUMsQ0FBQyxnQkFBRCxDQU5IO0FBT2RHLEVBQUFBLGVBQWUsRUFBRUgsQ0FBQyxDQUFDLGlCQUFELENBUEo7QUFRZEksRUFBQUEscUJBQXFCLEVBQUVKLENBQUMsQ0FBQyx1QkFBRCxDQVJWO0FBU2RLLEVBQUFBLDRCQUE0QixFQUFFTCxDQUFDLENBQUMsOEJBQUQsQ0FUakI7QUFVZE0sRUFBQUEsTUFBTSxFQUFFTixDQUFDLENBQUMsYUFBRCxDQVZLO0FBV2RPLEVBQUFBLGNBQWMsRUFBRVAsQ0FBQyxDQUFDLGdCQUFELENBWEg7O0FBYWQ7QUFDSjtBQUNBO0FBQ0E7QUFDSVEsRUFBQUEsY0FBYyxFQUFFLElBakJGOztBQW1CZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVULENBQUMsQ0FBQyxrQkFBRCxDQXZCRzs7QUF5QmQ7QUFDSjtBQUNBO0FBQ0E7QUFDSVUsRUFBQUEsYUFBYSxFQUFFVixDQUFDLENBQUMsd0JBQUQsQ0E3QkY7O0FBZ0NkO0FBQ0o7QUFDQTtBQUNBO0FBQ0lXLEVBQUFBLGdCQUFnQixFQUFFLHFDQXBDSjs7QUFzQ2Q7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsTUFBTSxFQUFFO0FBQ0pDLE1BQUFBLFVBQVUsRUFBRSxRQURSO0FBRUpDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxRQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHLEVBS0g7QUFDSUgsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNFO0FBRjVCLE9BTEcsRUFTSDtBQUNJSixRQUFBQSxJQUFJLEVBQUUseUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRjVCLE9BVEc7QUFGSCxLQURHO0FBa0JYQyxJQUFBQSxhQUFhLEVBQUU7QUFDWEMsTUFBQUEsUUFBUSxFQUFFLElBREM7QUFFWFQsTUFBQUEsVUFBVSxFQUFFLGVBRkQ7QUFHWEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE1BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNNO0FBRjVCLE9BREcsRUFLSDtBQUNJUixRQUFBQSxJQUFJLEVBQUUsZ0NBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNPO0FBRjVCLE9BTEc7QUFISSxLQWxCSjtBQWdDWEMsSUFBQUEsVUFBVSxFQUFFO0FBQ1JILE1BQUFBLFFBQVEsRUFBRSxJQURGO0FBRVJULE1BQUFBLFVBQVUsRUFBRSxZQUZKO0FBR1JDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDUztBQUY1QixPQURHO0FBSEMsS0FoQ0Q7QUEwQ1hDLElBQUFBLGFBQWEsRUFBRTtBQUNYZCxNQUFBQSxVQUFVLEVBQUUsZUFERDtBQUVYQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1c7QUFGNUIsT0FERztBQUZJLEtBMUNKO0FBbURYQyxJQUFBQSxVQUFVLEVBQUU7QUFDUmhCLE1BQUFBLFVBQVUsRUFBRSxZQURKO0FBRVJDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDYTtBQUY1QixPQURHLEVBS0g7QUFDSWYsUUFBQUEsSUFBSSxFQUFFLGNBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNjO0FBRjVCLE9BTEcsRUFTSDtBQUNJaEIsUUFBQUEsSUFBSSxFQUFFLGtCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDZTtBQUY1QixPQVRHO0FBRkMsS0FuREQ7QUFvRVhDLElBQUFBLGNBQWMsRUFBRTtBQUNacEIsTUFBQUEsVUFBVSxFQUFFLGdCQURBO0FBRVpxQixNQUFBQSxPQUFPLEVBQUUsZ0JBRkc7QUFHWnBCLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxpQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2tCO0FBRjVCLE9BREc7QUFISyxLQXBFTDtBQThFWEMsSUFBQUEsY0FBYyxFQUFFO0FBQ1pkLE1BQUFBLFFBQVEsRUFBRSxJQURFO0FBRVpULE1BQUFBLFVBQVUsRUFBRSxnQkFGQTtBQUdaQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsZUFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ29CO0FBRjVCLE9BREcsRUFLSDtBQUNJdEIsUUFBQUEsSUFBSSxFQUFFLG1CQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDcUI7QUFGNUIsT0FMRztBQUhLLEtBOUVMO0FBNEZYQyxJQUFBQSxvQkFBb0IsRUFBRTtBQUNsQjFCLE1BQUFBLFVBQVUsRUFBRSxzQkFETTtBQUVsQkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLG1CQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDcUI7QUFGNUIsT0FERztBQUZXLEtBNUZYO0FBcUdYRSxJQUFBQSwyQkFBMkIsRUFBRTtBQUN6QjNCLE1BQUFBLFVBQVUsRUFBRSw2QkFEYTtBQUV6QkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLG1CQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDcUI7QUFGNUIsT0FERztBQUZrQjtBQXJHbEIsR0EzQ0Q7O0FBMkpkO0FBQ0o7QUFDQTtBQUNJRyxFQUFBQSxVQTlKYyx3QkE4SkQ7QUFDVDtBQUNBO0FBQ0EvQyxJQUFBQSxTQUFTLENBQUNDLFlBQVYsR0FBeUIsRUFBekI7QUFDQUQsSUFBQUEsU0FBUyxDQUFDRyxtQkFBVixHQUFnQyxFQUFoQztBQUNBSCxJQUFBQSxTQUFTLENBQUNFLGFBQVYsR0FBMEIsRUFBMUIsQ0FMUyxDQU9UOztBQUNBRixJQUFBQSxTQUFTLENBQUNlLGFBQVYsQ0FBd0JpQyxHQUF4QixDQUE0QjtBQUN4QkMsTUFBQUEsT0FBTyxFQUFFLElBRGU7QUFFeEJDLE1BQUFBLFdBQVcsRUFBRTtBQUZXLEtBQTVCO0FBSUE3QyxJQUFBQSxDQUFDLENBQUMsZ0NBQUQsQ0FBRCxDQUFvQzhDLFNBQXBDLEdBWlMsQ0FjVDs7QUFDQTlDLElBQUFBLENBQUMsQ0FBQyxZQUFELENBQUQsQ0FBZ0IrQyxLQUFoQjtBQUNBL0MsSUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjK0MsS0FBZCxHQWhCUyxDQWtCVDs7QUFDQXBELElBQUFBLFNBQVMsQ0FBQ00sV0FBVixDQUFzQitDLEVBQXRCLENBQXlCLE9BQXpCLEVBQWtDLFlBQVc7QUFDekNoRCxNQUFBQSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFpRCxJQUFSLENBQWEsY0FBYixFQUE2QixjQUE3QjtBQUNILEtBRkQsRUFuQlMsQ0F1QlQ7O0FBQ0F0RCxJQUFBQSxTQUFTLENBQUN1RCxjQUFWLEdBeEJTLENBMEJUOztBQUNBdkQsSUFBQUEsU0FBUyxDQUFDWSxjQUFWLENBQXlCeUMsRUFBekIsQ0FBNEIsT0FBNUIsRUFBcUMsWUFBVztBQUM1QyxVQUFNRyxhQUFhLEdBQUd4RCxTQUFTLENBQUNJLE9BQVYsQ0FBa0JxRCxTQUFsQixHQUE4QnpELFNBQVMsQ0FBQ0ksT0FBVixDQUFrQnFELFNBQWxCLENBQTRCLGVBQTVCLENBQTlCLEdBQTZFekQsU0FBUyxDQUFDSSxPQUFWLENBQWtCc0QsR0FBbEIsRUFBbkc7QUFDQTFELE1BQUFBLFNBQVMsQ0FBQzJELGdCQUFWLENBQTJCdEQsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRcUQsR0FBUixFQUEzQixFQUEwQ0YsYUFBMUM7QUFDSCxLQUhELEVBM0JTLENBZ0NUOztBQUNBeEQsSUFBQUEsU0FBUyxDQUFDSSxPQUFWLENBQWtCaUQsRUFBbEIsQ0FBcUIsT0FBckIsRUFBOEIsWUFBVztBQUNyQyxVQUFNTyxlQUFlLEdBQUc1RCxTQUFTLENBQUNZLGNBQVYsQ0FBeUI4QyxHQUF6QixFQUF4QjtBQUNBLFVBQU1GLGFBQWEsR0FBR25ELENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUW9ELFNBQVIsR0FBb0JwRCxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFvRCxTQUFSLENBQWtCLGVBQWxCLENBQXBCLEdBQXlEcEQsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRcUQsR0FBUixFQUEvRTtBQUNBMUQsTUFBQUEsU0FBUyxDQUFDMkQsZ0JBQVYsQ0FBMkJDLGVBQTNCLEVBQTRDSixhQUE1QztBQUNILEtBSkQsRUFqQ1MsQ0F1Q1Q7O0FBQ0EsUUFBSSxPQUFPSyx1QkFBUCxLQUFtQyxXQUF2QyxFQUFvRDtBQUNoREEsTUFBQUEsdUJBQXVCLENBQUNkLFVBQXhCO0FBQ0gsS0FGRCxNQUVPLElBQUksT0FBT2UsdUJBQVAsS0FBbUMsV0FBdkMsRUFBb0Q7QUFDdkQ7QUFDQUEsTUFBQUEsdUJBQXVCLENBQUNmLFVBQXhCO0FBQ0gsS0E3Q1EsQ0ErQ1Q7OztBQUNBL0MsSUFBQUEsU0FBUyxDQUFDK0QsaUJBQVY7QUFDSCxHQS9NYTs7QUFnTmQ7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLDJCQW5OYyx1Q0FtTmNDLFdBbk5kLEVBbU4yQjtBQUNyQyxXQUFPQSxXQUFQO0FBQ0gsR0FyTmE7O0FBdU5kO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQTNOYyxnQ0EyTk87QUFDakI7QUFDQSxRQUFNQyxTQUFTLEdBQUduRSxTQUFTLENBQUNJLE9BQVYsQ0FBa0JxRCxTQUFsQixDQUE0QixlQUE1QixDQUFsQixDQUZpQixDQUlqQjs7QUFDQSxRQUFNVyxNQUFNLEdBQUdwRSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxTQUFyQyxDQUFmLENBTGlCLENBT2pCO0FBQ0E7QUFDQTs7QUFDQUMsSUFBQUEsYUFBYSxDQUFDQyxpQkFBZCxDQUFnQ3ZFLFNBQVMsQ0FBQ0UsYUFBMUMsRUFBeURpRSxTQUF6RCxFQUFvRSxRQUFwRSxFQUE4RUMsTUFBOUU7QUFDSCxHQXRPYTs7QUF1T2Q7QUFDSjtBQUNBO0FBQ0lJLEVBQUFBLGlCQTFPYywrQkEwT007QUFFaEI7QUFDQSxRQUFNQyxRQUFRLEdBQUd6RSxTQUFTLENBQUNXLE1BQVYsQ0FBaUI4QyxTQUFqQixDQUEyQixlQUEzQixDQUFqQixDQUhnQixDQUtoQjs7QUFDQSxRQUFNVyxNQUFNLEdBQUdwRSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxTQUFyQyxDQUFmLENBTmdCLENBUWhCO0FBQ0E7QUFDQTs7QUFDQUssSUFBQUEsUUFBUSxDQUFDSCxpQkFBVCxDQUEyQnZFLFNBQVMsQ0FBQ0MsWUFBckMsRUFBbUR3RSxRQUFuRCxFQUE0RCxPQUE1RCxFQUFxRUwsTUFBckU7QUFDSCxHQXRQYTs7QUF3UGQ7QUFDSjtBQUNBO0FBQ0lPLEVBQUFBLHdCQTNQYyxzQ0EyUGE7QUFDdkI7QUFDQSxRQUFNQyxlQUFlLEdBQUc1RSxTQUFTLENBQUNPLGNBQVYsQ0FBeUJrRCxTQUF6QixDQUFtQyxlQUFuQyxDQUF4QixDQUZ1QixDQUl2Qjs7QUFDQSxRQUFNVyxNQUFNLEdBQUdwRSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxTQUFyQyxDQUFmLENBTHVCLENBT3ZCOztBQUNBQyxJQUFBQSxhQUFhLENBQUNDLGlCQUFkLENBQWdDdkUsU0FBUyxDQUFDRyxtQkFBMUMsRUFBK0R5RSxlQUEvRCxFQUFnRixlQUFoRixFQUFpR1IsTUFBakcsRUFSdUIsQ0FVdkI7O0FBQ0EsUUFBSVEsZUFBZSxLQUFLNUUsU0FBUyxDQUFDRyxtQkFBOUIsSUFDSUgsU0FBUyxDQUFDYyxRQUFWLENBQW1CdUQsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsbUJBQXJDLEVBQTBEUSxNQUExRCxLQUFxRSxDQUQ3RSxFQUVFO0FBQ0U3RSxNQUFBQSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxtQkFBckMsRUFBMERPLGVBQTFEO0FBQ0gsS0Fmc0IsQ0FpQnZCOzs7QUFDQSxRQUFJQSxlQUFlLEtBQUs1RSxTQUFTLENBQUNHLG1CQUFsQyxFQUF1RDtBQUNuRDtBQUNBLFVBQU0yRSxRQUFRLEdBQUc5RSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxlQUFyQyxDQUFqQixDQUZtRCxDQUluRDs7QUFDQSxVQUFNVSxvQkFBb0IsR0FBRy9FLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLGdCQUFyQyxDQUE3QjtBQUNBLFVBQU1XLGdCQUFnQixHQUFHaEYsU0FBUyxDQUFDYyxRQUFWLENBQW1CdUQsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsc0JBQXJDLENBQXpCO0FBQ0EsVUFBTVksdUJBQXVCLEdBQUdqRixTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyw2QkFBckMsQ0FBaEMsQ0FQbUQsQ0FTbkQ7O0FBQ0EsVUFBSVUsb0JBQW9CLEtBQUsvRSxTQUFTLENBQUNHLG1CQUF2QyxFQUE0RDtBQUV4RDtBQUNBLFlBQUlILFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLGdCQUFyQyxFQUF1RFEsTUFBdkQsS0FBa0UsQ0FBbEUsSUFDRzdFLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLGdCQUFyQyxNQUF5RCxHQURoRSxFQUNxRTtBQUNqRXJFLFVBQUFBLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLGdCQUFyQyxFQUF1RCxFQUF2RDtBQUNILFNBTnVELENBUXhEOzs7QUFDQWEsUUFBQUEsaUJBQWlCLENBQUNDLFFBQWxCLENBQTJCLGdCQUEzQixFQUE2Q1AsZUFBN0MsWUFBaUVFLFFBQWpFLGVBQThFRixlQUE5RTtBQUNILE9BcEJrRCxDQXNCbkQ7OztBQUNBLFVBQUlJLGdCQUFnQixLQUFLaEYsU0FBUyxDQUFDRyxtQkFBbkMsRUFBd0Q7QUFDcEQ7QUFDQStFLFFBQUFBLGlCQUFpQixDQUFDQyxRQUFsQixDQUEyQixzQkFBM0IsRUFBbURQLGVBQW5ELFlBQXVFRSxRQUF2RSxlQUFvRkYsZUFBcEY7QUFDSCxPQTFCa0QsQ0E0Qm5EOzs7QUFDQSxVQUFJSyx1QkFBdUIsS0FBS2pGLFNBQVMsQ0FBQ0csbUJBQTFDLEVBQStEO0FBQzNEO0FBQ0ErRSxRQUFBQSxpQkFBaUIsQ0FBQ0MsUUFBbEIsQ0FBMkIsNkJBQTNCLEVBQTBEUCxlQUExRCxZQUE4RUUsUUFBOUUsZUFBMkZGLGVBQTNGO0FBQ0g7QUFDSixLQW5Ec0IsQ0FvRHZCOzs7QUFDQTVFLElBQUFBLFNBQVMsQ0FBQ0csbUJBQVYsR0FBZ0N5RSxlQUFoQztBQUNILEdBalRhOztBQW1UZDtBQUNKO0FBQ0E7QUFDSVEsRUFBQUEsdUJBdFRjLHFDQXNUWTtBQUN0QjtBQUNBLFFBQU1MLG9CQUFvQixHQUFHL0UsU0FBUyxDQUFDYyxRQUFWLENBQW1CdUQsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZ0JBQXJDLENBQTdCO0FBQ0EsUUFBTVcsZ0JBQWdCLEdBQUdoRixTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxzQkFBckMsQ0FBekI7QUFDQSxRQUFNWSx1QkFBdUIsR0FBR2pGLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLDZCQUFyQyxDQUFoQyxDQUpzQixDQU10Qjs7QUFDQXJFLElBQUFBLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLG1CQUFyQyxFQUEwRCxFQUExRDtBQUNBckUsSUFBQUEsU0FBUyxDQUFDYyxRQUFWLENBQW1CdUQsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZUFBckMsRUFBc0QsRUFBdEQsRUFSc0IsQ0FVdEI7O0FBQ0EsUUFBSVUsb0JBQW9CLEtBQUsvRSxTQUFTLENBQUNHLG1CQUF2QyxFQUE0RDtBQUN4RDtBQUNBSCxNQUFBQSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxnQkFBckMsRUFBdUQsQ0FBdkQsRUFGd0QsQ0FHeEQ7O0FBQ0FhLE1BQUFBLGlCQUFpQixDQUFDRyxLQUFsQixDQUF3QixnQkFBeEI7QUFDSCxLQWhCcUIsQ0FrQnRCOzs7QUFDQSxRQUFJTCxnQkFBZ0IsS0FBS2hGLFNBQVMsQ0FBQ0csbUJBQW5DLEVBQXdEO0FBQ3BEO0FBQ0ErRSxNQUFBQSxpQkFBaUIsQ0FBQ0csS0FBbEIsQ0FBd0Isc0JBQXhCO0FBQ0gsS0F0QnFCLENBd0J0Qjs7O0FBQ0EsUUFBSUosdUJBQXVCLEtBQUtqRixTQUFTLENBQUNHLG1CQUExQyxFQUErRDtBQUMzRDtBQUNBK0UsTUFBQUEsaUJBQWlCLENBQUNHLEtBQWxCLENBQXdCLDZCQUF4QjtBQUNILEtBNUJxQixDQThCdEI7OztBQUNBckYsSUFBQUEsU0FBUyxDQUFDRyxtQkFBVixHQUFnQyxFQUFoQztBQUNILEdBdFZhO0FBd1ZkbUYsRUFBQUEsb0JBeFZjLGtDQXdWUTtBQUNsQjtBQUNBLFFBQUlDLGVBQUosQ0FGa0IsQ0FJbEI7QUFDQTs7QUFDQSxRQUFJdkYsU0FBUyxDQUFDd0YsZ0JBQWQsRUFBZ0M7QUFDNUIsVUFBTUEsZ0JBQWdCLEdBQUdDLFFBQVEsQ0FBQ3pGLFNBQVMsQ0FBQ3dGLGdCQUFYLEVBQTZCLEVBQTdCLENBQWpDOztBQUNBLFVBQUlBLGdCQUFnQixJQUFJLENBQXBCLElBQXlCQSxnQkFBZ0IsSUFBSSxFQUFqRCxFQUFxRDtBQUNqRDtBQUNBeEYsUUFBQUEsU0FBUyxDQUFDSSxPQUFWLENBQWtCcUQsU0FBbEIsQ0FBNEI7QUFDeEJpQyxVQUFBQSxJQUFJLGdCQUFTRixnQkFBVCxNQURvQjtBQUV4QkcsVUFBQUEsV0FBVyxFQUFFLEdBRlc7QUFHeEJDLFVBQUFBLFVBQVUsRUFBRSxzQkFBTTtBQUNkO0FBQ0EsZ0JBQUlMLGVBQUosRUFBcUI7QUFDakJNLGNBQUFBLFlBQVksQ0FBQ04sZUFBRCxDQUFaO0FBQ0gsYUFKYSxDQUtkOzs7QUFDQUEsWUFBQUEsZUFBZSxHQUFHTyxVQUFVLENBQUMsWUFBTTtBQUMvQjlGLGNBQUFBLFNBQVMsQ0FBQ2tFLGtCQUFWO0FBQ0gsYUFGMkIsRUFFekIsR0FGeUIsQ0FBNUI7QUFHSDtBQVp1QixTQUE1QjtBQWNIO0FBQ0o7O0FBRURsRSxJQUFBQSxTQUFTLENBQUNJLE9BQVYsQ0FBa0JpRCxFQUFsQixDQUFxQixPQUFyQixFQUE4QixZQUFXO0FBQ3JDckQsTUFBQUEsU0FBUyxDQUFDa0Usa0JBQVY7QUFDSCxLQUZELEVBM0JrQixDQStCbEI7O0FBQ0EsUUFBTTZCLFFBQVEsR0FBRzFGLENBQUMsQ0FBQzJGLFNBQUYsQ0FBWUMsaUJBQVosRUFBK0IsQ0FBQyxHQUFELENBQS9CLEVBQXNDLFNBQXRDLEVBQWlELE1BQWpELENBQWpCO0FBQ0FqRyxJQUFBQSxTQUFTLENBQUNPLGNBQVYsQ0FBeUIyRixVQUF6QixDQUFvQztBQUNoQ3pDLE1BQUFBLFNBQVMsRUFBRTtBQUNQMEMsUUFBQUEsV0FBVyxFQUFFO0FBQ1QsZUFBSztBQUNEQyxZQUFBQSxTQUFTLEVBQUUsT0FEVjtBQUVEQyxZQUFBQSxXQUFXLEVBQUU7QUFGWjtBQURJLFNBRE47QUFPUEMsUUFBQUEsU0FBUyxFQUFFdEcsU0FBUyxDQUFDb0YsdUJBUGQ7QUFRUFEsUUFBQUEsVUFBVSxFQUFFNUYsU0FBUyxDQUFDMkUsd0JBUmY7QUFTUDRCLFFBQUFBLGVBQWUsRUFBRSxLQVRWLENBVVA7O0FBVk8sT0FEcUI7QUFhaENDLE1BQUFBLEtBQUssRUFBRSxPQWJ5QjtBQWNoQ0MsTUFBQUEsT0FBTyxFQUFFLEdBZHVCO0FBZWhDQyxNQUFBQSxJQUFJLEVBQUVYLFFBZjBCO0FBZ0JoQ1ksTUFBQUEsT0FBTyxFQUFFO0FBaEJ1QixLQUFwQyxFQWpDa0IsQ0FvRGxCOztBQUNBLFFBQU1DLFdBQVcsR0FBR3ZHLENBQUMsQ0FBQ3dHLEVBQUYsQ0FBS25ELEdBQXpCO0FBQ0ExRCxJQUFBQSxTQUFTLENBQUNPLGNBQVYsQ0FBeUJ1RyxHQUF6QixDQUE2QixjQUE3QixFQUE2Q3pELEVBQTdDLENBQWdELGNBQWhELEVBQWdFLFlBQVc7QUFDdkUsVUFBTTBELEtBQUssR0FBRzFHLENBQUMsQ0FBQyxJQUFELENBQWY7QUFDQSxVQUFNMkcsSUFBSSxHQUFHQyxTQUFiLENBRnVFLENBSXZFOztBQUNBLFVBQUlELElBQUksQ0FBQ25DLE1BQUwsR0FBYyxDQUFkLElBQW1CLE9BQU9tQyxJQUFJLENBQUMsQ0FBRCxDQUFYLEtBQW1CLFFBQTFDLEVBQW9EO0FBQ2hELFlBQU1FLFFBQVEsR0FBR0YsSUFBSSxDQUFDLENBQUQsQ0FBckIsQ0FEZ0QsQ0FHaEQ7O0FBQ0EsWUFBSUQsS0FBSyxDQUFDSSxJQUFOLENBQVcsV0FBWCxDQUFKLEVBQTZCO0FBQ3pCSixVQUFBQSxLQUFLLENBQUN0RCxTQUFOLENBQWdCLFFBQWhCO0FBQ0gsU0FOK0MsQ0FRaEQ7OztBQUNBbUQsUUFBQUEsV0FBVyxDQUFDUSxLQUFaLENBQWtCLElBQWxCLEVBQXdCSixJQUF4QixFQVRnRCxDQVdoRDs7QUFDQWxCLFFBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2JpQixVQUFBQSxLQUFLLENBQUNNLE9BQU4sQ0FBYyxPQUFkO0FBQ0gsU0FGUyxFQUVQLEVBRk8sQ0FBVjtBQUdIO0FBQ0osS0FyQkQ7QUF1QkFySCxJQUFBQSxTQUFTLENBQUNPLGNBQVYsQ0FBeUI4QyxFQUF6QixDQUE0QixPQUE1QixFQUFxQyxVQUFTaUUsQ0FBVCxFQUFZO0FBQzdDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUYsR0FENkMsQ0FDekI7QUFFcEI7O0FBQ0EsVUFBSUMsVUFBVSxHQUFHLEVBQWpCLENBSjZDLENBTTdDOztBQUNBLFVBQUlGLENBQUMsQ0FBQ0csYUFBRixJQUFtQkgsQ0FBQyxDQUFDRyxhQUFGLENBQWdCQyxhQUFuQyxJQUFvREosQ0FBQyxDQUFDRyxhQUFGLENBQWdCQyxhQUFoQixDQUE4QkMsT0FBdEYsRUFBK0Y7QUFDM0ZILFFBQUFBLFVBQVUsR0FBR0YsQ0FBQyxDQUFDRyxhQUFGLENBQWdCQyxhQUFoQixDQUE4QkMsT0FBOUIsQ0FBc0MsTUFBdEMsQ0FBYjtBQUNILE9BRkQsTUFFTyxJQUFJTCxDQUFDLENBQUNJLGFBQUYsSUFBbUJKLENBQUMsQ0FBQ0ksYUFBRixDQUFnQkMsT0FBdkMsRUFBZ0Q7QUFDbkQ7QUFDQUgsUUFBQUEsVUFBVSxHQUFHRixDQUFDLENBQUNJLGFBQUYsQ0FBZ0JDLE9BQWhCLENBQXdCLE1BQXhCLENBQWI7QUFDSCxPQUhNLE1BR0EsSUFBSUMsTUFBTSxDQUFDRixhQUFQLElBQXdCRSxNQUFNLENBQUNGLGFBQVAsQ0FBcUJDLE9BQWpELEVBQTBEO0FBQzdEO0FBQ0FILFFBQUFBLFVBQVUsR0FBR0ksTUFBTSxDQUFDRixhQUFQLENBQXFCQyxPQUFyQixDQUE2QixNQUE3QixDQUFiO0FBQ0gsT0FmNEMsQ0FpQjdDOzs7QUFDQSxVQUFJLENBQUNILFVBQUwsRUFBaUI7QUFDYjtBQUNILE9BcEI0QyxDQXNCN0M7OztBQUNBLFVBQUlLLGFBQUo7O0FBQ0EsVUFBSUwsVUFBVSxDQUFDTSxNQUFYLENBQWtCLENBQWxCLE1BQXlCLEdBQTdCLEVBQWtDO0FBQzlCO0FBQ0FELFFBQUFBLGFBQWEsR0FBRyxNQUFNTCxVQUFVLENBQUNPLEtBQVgsQ0FBaUIsQ0FBakIsRUFBb0J0QixPQUFwQixDQUE0QixLQUE1QixFQUFtQyxFQUFuQyxDQUF0QjtBQUNILE9BSEQsTUFHTztBQUNIO0FBQ0FvQixRQUFBQSxhQUFhLEdBQUdMLFVBQVUsQ0FBQ2YsT0FBWCxDQUFtQixLQUFuQixFQUEwQixFQUExQixDQUFoQjtBQUNILE9BOUI0QyxDQWdDN0M7OztBQUNBLFVBQU11QixLQUFLLEdBQUcsSUFBZDtBQUNBLFVBQU1DLEtBQUssR0FBR0QsS0FBSyxDQUFDRSxjQUFOLElBQXdCLENBQXRDO0FBQ0EsVUFBTUMsR0FBRyxHQUFHSCxLQUFLLENBQUNJLFlBQU4sSUFBc0IsQ0FBbEM7QUFDQSxVQUFNQyxZQUFZLEdBQUdoSSxDQUFDLENBQUMySCxLQUFELENBQUQsQ0FBU3RFLEdBQVQsTUFBa0IsRUFBdkM7QUFDQSxVQUFNd0QsUUFBUSxHQUFHbUIsWUFBWSxDQUFDQyxTQUFiLENBQXVCLENBQXZCLEVBQTBCTCxLQUExQixJQUFtQ0osYUFBbkMsR0FBbURRLFlBQVksQ0FBQ0MsU0FBYixDQUF1QkgsR0FBdkIsQ0FBcEUsQ0FyQzZDLENBdUM3Qzs7QUFDQW5JLE1BQUFBLFNBQVMsQ0FBQ08sY0FBVixDQUF5QmtELFNBQXpCLENBQW1DLFFBQW5DO0FBQ0F6RCxNQUFBQSxTQUFTLENBQUNPLGNBQVYsQ0FBeUJtRCxHQUF6QixDQUE2QndELFFBQTdCLEVBekM2QyxDQTJDN0M7O0FBQ0FwQixNQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNiO0FBQ0F6RixRQUFBQSxDQUFDLENBQUMySCxLQUFELENBQUQsQ0FBU1gsT0FBVCxDQUFpQixPQUFqQjtBQUNILE9BSFMsRUFHUCxFQUhPLENBQVY7QUFJSCxLQWhERCxFQTdFa0IsQ0ErSGxCOztBQUNBLFFBQUlrQixjQUFKO0FBQ0F2SSxJQUFBQSxTQUFTLENBQUNXLE1BQVYsQ0FBaUI4QyxTQUFqQixDQUEyQixPQUEzQixFQUFvQztBQUNoQ21DLE1BQUFBLFVBQVUsRUFBRSxzQkFBSTtBQUNaO0FBQ0EsWUFBSTJDLGNBQUosRUFBb0I7QUFDaEIxQyxVQUFBQSxZQUFZLENBQUMwQyxjQUFELENBQVo7QUFDSCxTQUpXLENBS1o7OztBQUNBQSxRQUFBQSxjQUFjLEdBQUd6QyxVQUFVLENBQUMsWUFBTTtBQUM5QjlGLFVBQUFBLFNBQVMsQ0FBQ3dFLGlCQUFWO0FBQ0gsU0FGMEIsRUFFeEIsR0FGd0IsQ0FBM0I7QUFHSDtBQVYrQixLQUFwQztBQVlBeEUsSUFBQUEsU0FBUyxDQUFDVyxNQUFWLENBQWlCMEMsRUFBakIsQ0FBb0IsT0FBcEIsRUFBNkIsWUFBVztBQUNwQ3JELE1BQUFBLFNBQVMsQ0FBQ3dFLGlCQUFWO0FBQ0gsS0FGRCxFQTdJa0IsQ0FpSmxCOztBQUNBeEUsSUFBQUEsU0FBUyxDQUFDTyxjQUFWLENBQXlCaUksUUFBekIsQ0FBa0MsVUFBVWxCLENBQVYsRUFBYTtBQUMzQyxVQUFJbUIsS0FBSyxHQUFHcEksQ0FBQyxDQUFDaUgsQ0FBQyxDQUFDb0IsTUFBSCxDQUFELENBQVloRixHQUFaLEdBQWtCK0MsT0FBbEIsQ0FBMEIsU0FBMUIsRUFBcUMsRUFBckMsQ0FBWjs7QUFDQSxVQUFJZ0MsS0FBSyxLQUFLLEVBQWQsRUFBa0I7QUFDZHBJLFFBQUFBLENBQUMsQ0FBQ2lILENBQUMsQ0FBQ29CLE1BQUgsQ0FBRCxDQUFZaEYsR0FBWixDQUFnQixFQUFoQjtBQUNIO0FBQ0osS0FMRDtBQU1ILEdBaGZhOztBQW9mZDtBQUNKO0FBQ0E7QUFDQTtBQUNJaUYsRUFBQUEsc0JBeGZjLG9DQXdmVztBQUNyQjtBQUNBLFFBQU1DLFlBQVksR0FBRzVJLFNBQVMsQ0FBQ00sV0FBVixDQUFzQnVJLE9BQXRCLENBQThCLFdBQTlCLEVBQTJDQyxJQUEzQyxDQUFnRCwwQkFBaEQsQ0FBckI7O0FBQ0EsUUFBSUYsWUFBWSxDQUFDL0QsTUFBYixHQUFzQixDQUExQixFQUE2QjtBQUN6QitELE1BQUFBLFlBQVksQ0FBQ3ZCLE9BQWIsQ0FBcUIsT0FBckI7QUFDSDtBQUNKLEdBOWZhOztBQWdnQmQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJMEIsRUFBQUEsZ0JBcmdCYyw0QkFxZ0JHQyxRQXJnQkgsRUFxZ0JhO0FBQ3ZCLFFBQU1DLE1BQU0sR0FBR0QsUUFBZjtBQUNBQyxJQUFBQSxNQUFNLENBQUM5QixJQUFQLENBQVl4RixhQUFaLEdBQTRCM0IsU0FBUyxDQUFDTyxjQUFWLENBQXlCa0QsU0FBekIsQ0FBbUMsZUFBbkMsQ0FBNUIsQ0FGdUIsQ0FJdkI7O0FBQ0EsV0FBT3dGLE1BQU0sQ0FBQzlCLElBQVAsQ0FBWStCLE1BQW5CO0FBQ0EsV0FBT0QsTUFBTSxDQUFDOUIsSUFBUCxDQUFZZ0MsVUFBbkI7QUFDQSxXQUFPRixNQUFNLENBQUM5QixJQUFQLENBQVlpQyxPQUFuQixDQVB1QixDQU9LO0FBRTVCOztBQUNBLFdBQU9ILE1BQVA7QUFDSCxHQWhoQmE7O0FBaWhCZDtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxlQXJoQmMsMkJBcWhCRUMsUUFyaEJGLEVBcWhCWTtBQUN0QixRQUFJQSxRQUFRLENBQUNMLE1BQWIsRUFBcUI7QUFDakI7QUFDQSxVQUFJSyxRQUFRLENBQUNuQyxJQUFULElBQWlCbUMsUUFBUSxDQUFDbkMsSUFBVCxDQUFjakcsTUFBbkMsRUFBMkM7QUFDdkNsQixRQUFBQSxTQUFTLENBQUNFLGFBQVYsR0FBMEJvSixRQUFRLENBQUNuQyxJQUFULENBQWNqRyxNQUF4QyxDQUR1QyxDQUV2Qzs7QUFDQW9ELFFBQUFBLGFBQWEsQ0FBQ2lGLG9CQUFkLENBQW1DdkosU0FBUyxDQUFDRSxhQUE3QztBQUNILE9BTmdCLENBT2pCOztBQUNILEtBUkQsTUFRTztBQUNIc0osTUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCSCxRQUFRLENBQUNJLFFBQXJDO0FBQ0g7QUFDSixHQWppQmE7O0FBa2lCZDtBQUNKO0FBQ0E7QUFDSW5HLEVBQUFBLGNBcmlCYyw0QkFxaUJHO0FBQ2I7QUFDQW9HLElBQUFBLElBQUksQ0FBQzdJLFFBQUwsR0FBZ0JkLFNBQVMsQ0FBQ2MsUUFBMUI7QUFDQTZJLElBQUFBLElBQUksQ0FBQ0MsR0FBTCxHQUFXLEdBQVgsQ0FIYSxDQUdHOztBQUNoQkQsSUFBQUEsSUFBSSxDQUFDMUksYUFBTCxHQUFxQmpCLFNBQVMsQ0FBQ2lCLGFBQS9CO0FBQ0EwSSxJQUFBQSxJQUFJLENBQUNaLGdCQUFMLEdBQXdCL0ksU0FBUyxDQUFDK0ksZ0JBQWxDO0FBQ0FZLElBQUFBLElBQUksQ0FBQ04sZUFBTCxHQUF1QnJKLFNBQVMsQ0FBQ3FKLGVBQWpDLENBTmEsQ0FRYjs7QUFDQU0sSUFBQUEsSUFBSSxDQUFDRSxXQUFMLENBQWlCQyxPQUFqQixHQUEyQixJQUEzQjtBQUNBSCxJQUFBQSxJQUFJLENBQUNFLFdBQUwsQ0FBaUJFLFNBQWpCLEdBQTZCQyxZQUE3QjtBQUNBTCxJQUFBQSxJQUFJLENBQUNFLFdBQUwsQ0FBaUJJLFVBQWpCLEdBQThCLFlBQTlCLENBWGEsQ0FhYjtBQUNBOztBQUNBTixJQUFBQSxJQUFJLENBQUNPLHVCQUFMLEdBQStCLElBQS9CLENBZmEsQ0FpQmI7O0FBQ0FQLElBQUFBLElBQUksQ0FBQ1EsbUJBQUwsYUFBOEJDLGFBQTlCO0FBQ0FULElBQUFBLElBQUksQ0FBQ1Usb0JBQUwsYUFBK0JELGFBQS9CO0FBRUFULElBQUFBLElBQUksQ0FBQzVHLFVBQUw7QUFDSCxHQTNqQmE7O0FBNGpCZDtBQUNKO0FBQ0E7QUFDSWdCLEVBQUFBLGlCQS9qQmMsK0JBK2pCTTtBQUNoQixRQUFNdUcsUUFBUSxHQUFHdEssU0FBUyxDQUFDdUssV0FBVixFQUFqQixDQURnQixDQUdoQjs7QUFDQSxRQUFNQyxLQUFLLEdBQUdGLFFBQVEsS0FBSyxFQUFiLEdBQWtCLEtBQWxCLEdBQTBCQSxRQUF4QyxDQUpnQixDQU1oQjs7QUFDQSxRQUFJRSxLQUFLLEtBQUssS0FBZCxFQUFxQjtBQUNqQm5LLE1BQUFBLENBQUMsQ0FBQyxTQUFELENBQUQsQ0FBYW9LLElBQWIsR0FEaUIsQ0FDSTs7QUFDckJwSyxNQUFBQSxDQUFDLENBQUMsc0JBQUQsQ0FBRCxDQUEwQm9LLElBQTFCLEdBRmlCLENBRWlCO0FBQ3JDOztBQUVEVCxJQUFBQSxZQUFZLENBQUNVLFNBQWIsQ0FBdUJGLEtBQXZCLEVBQThCLFVBQUNsQixRQUFELEVBQWM7QUFDeEMsVUFBSUEsUUFBUSxDQUFDTCxNQUFiLEVBQXFCO0FBQ2pCO0FBQ0EsWUFBSSxDQUFDcUIsUUFBRCxJQUFhQSxRQUFRLEtBQUssRUFBOUIsRUFBa0M7QUFDOUJoQixVQUFBQSxRQUFRLENBQUNuQyxJQUFULENBQWN3RCxNQUFkLEdBQXVCLElBQXZCO0FBQ0g7O0FBRUQzSyxRQUFBQSxTQUFTLENBQUM0SyxvQkFBVixDQUErQnRCLFFBQVEsQ0FBQ25DLElBQXhDLEVBTmlCLENBT2pCOztBQUNBbkgsUUFBQUEsU0FBUyxDQUFDRSxhQUFWLEdBQTBCb0osUUFBUSxDQUFDbkMsSUFBVCxDQUFjakcsTUFBZCxJQUF3QixFQUFsRDtBQUNBbEIsUUFBQUEsU0FBUyxDQUFDQyxZQUFWLEdBQXlCcUosUUFBUSxDQUFDbkMsSUFBVCxDQUFjcEYsVUFBZCxJQUE0QixFQUFyRDtBQUNBL0IsUUFBQUEsU0FBUyxDQUFDRyxtQkFBVixHQUFnQ21KLFFBQVEsQ0FBQ25DLElBQVQsQ0FBY3hGLGFBQWQsSUFBK0IsRUFBL0Q7QUFDSCxPQVhELE1BV087QUFBQTs7QUFDSDtBQUNBLFlBQUkySSxRQUFRLEtBQUssRUFBakIsRUFBcUI7QUFDakJPLFVBQUFBLE1BQU0sQ0FBQzlILFVBQVA7QUFDSDs7QUFDRHlHLFFBQUFBLFdBQVcsQ0FBQ3NCLFNBQVosQ0FBc0IsdUJBQUF4QixRQUFRLENBQUNJLFFBQVQsMEVBQW1CcUIsS0FBbkIsS0FBNEIsK0JBQWxEO0FBQ0g7QUFDSixLQW5CRDtBQW9CSCxHQS9sQmE7O0FBaW1CZDtBQUNKO0FBQ0E7QUFDSVIsRUFBQUEsV0FwbUJjLHlCQW9tQkE7QUFDVixRQUFNUyxRQUFRLEdBQUdwRCxNQUFNLENBQUNxRCxRQUFQLENBQWdCQyxRQUFoQixDQUF5QkMsS0FBekIsQ0FBK0IsR0FBL0IsQ0FBakI7QUFDQSxRQUFNQyxXQUFXLEdBQUdKLFFBQVEsQ0FBQ0ssT0FBVCxDQUFpQixRQUFqQixDQUFwQjs7QUFDQSxRQUFJRCxXQUFXLEtBQUssQ0FBQyxDQUFqQixJQUFzQkosUUFBUSxDQUFDSSxXQUFXLEdBQUcsQ0FBZixDQUFsQyxFQUFxRDtBQUNqRCxhQUFPSixRQUFRLENBQUNJLFdBQVcsR0FBRyxDQUFmLENBQWY7QUFDSDs7QUFDRCxXQUFPLEVBQVA7QUFDSCxHQTNtQmE7O0FBNm1CZDtBQUNKO0FBQ0E7QUFDSVIsRUFBQUEsb0JBaG5CYyxnQ0FnbkJPekQsSUFobkJQLEVBZ25CYTtBQUN2QjtBQUNBO0FBQ0FuSCxJQUFBQSxTQUFTLENBQUN3RixnQkFBVixHQUE2QjJCLElBQUksQ0FBQ21FLGlCQUFsQyxDQUh1QixDQUt2Qjs7QUFDQTNCLElBQUFBLElBQUksQ0FBQzRCLG9CQUFMLENBQTBCcEUsSUFBMUIsRUFBZ0M7QUFDNUJxRSxNQUFBQSxhQUFhLEVBQUUsdUJBQUNDLFFBQUQsRUFBYztBQUN6QjtBQUNBekwsUUFBQUEsU0FBUyxDQUFDMEwsZ0NBQVYsQ0FBMkNELFFBQTNDLEVBRnlCLENBSXpCOztBQUNBLFlBQUlBLFFBQVEsQ0FBQ3ZLLE1BQWIsRUFBcUI7QUFDakJiLFVBQUFBLENBQUMsQ0FBQywyQkFBRCxDQUFELENBQStCc0wsSUFBL0IsQ0FBb0NGLFFBQVEsQ0FBQ3ZLLE1BQTdDO0FBQ0gsU0FQd0IsQ0FTekI7OztBQUNBMkosUUFBQUEsTUFBTSxDQUFDOUgsVUFBUCxHQVZ5QixDQVl6Qjs7QUFDQThILFFBQUFBLE1BQU0sQ0FBQ2UsWUFBUCxDQUFvQkgsUUFBUSxDQUFDSSxXQUE3QixFQWJ5QixDQWV6Qjs7QUFDQSxZQUFJLE9BQU9DLDRCQUFQLEtBQXdDLFdBQTVDLEVBQXlEO0FBQ3JEQSxVQUFBQSw0QkFBNEIsQ0FBQy9JLFVBQTdCO0FBQ0gsU0FsQndCLENBb0J6Qjs7O0FBQ0EvQyxRQUFBQSxTQUFTLENBQUMyRCxnQkFBVixDQUEyQjhILFFBQVEsQ0FBQ3hKLGFBQXBDLEVBQW1Ed0osUUFBUSxDQUFDdkssTUFBNUQsRUFyQnlCLENBdUJ6Qjs7QUFDQWxCLFFBQUFBLFNBQVMsQ0FBQytMLHdCQUFWLENBQW1DTixRQUFuQyxFQXhCeUIsQ0EwQnpCOztBQUNBekwsUUFBQUEsU0FBUyxDQUFDc0Ysb0JBQVY7QUFDSDtBQTdCMkIsS0FBaEMsRUFOdUIsQ0FzQ3ZCO0FBQ0gsR0F2cEJhOztBQXlwQmQ7QUFDSjtBQUNBO0FBQ0E7QUFDSW9HLEVBQUFBLGdDQTdwQmMsNENBNnBCbUJ2RSxJQTdwQm5CLEVBNnBCeUI7QUFDbkM7QUFDQWpDLElBQUFBLGlCQUFpQixDQUFDOEcsSUFBbEIsQ0FBdUIsZ0JBQXZCLEVBQXlDO0FBQ3JDM0ssTUFBQUEsSUFBSSxFQUFFLFNBRCtCO0FBRXJDNEssTUFBQUEsaUJBQWlCLEVBQUUsQ0FBQzlFLElBQUksQ0FBQ2pHLE1BQU4sQ0FGa0I7QUFHckNnTCxNQUFBQSxZQUFZLEVBQUUsSUFIdUI7QUFJckMvRSxNQUFBQSxJQUFJLEVBQUVBO0FBSitCLEtBQXpDO0FBT0FqQyxJQUFBQSxpQkFBaUIsQ0FBQzhHLElBQWxCLENBQXVCLHNCQUF2QixFQUErQztBQUMzQzNLLE1BQUFBLElBQUksRUFBRSxTQURxQztBQUUzQzRLLE1BQUFBLGlCQUFpQixFQUFFLENBQUM5RSxJQUFJLENBQUNqRyxNQUFOLENBRndCO0FBRzNDZ0wsTUFBQUEsWUFBWSxFQUFFLElBSDZCO0FBSTNDL0UsTUFBQUEsSUFBSSxFQUFFQTtBQUpxQyxLQUEvQztBQU9BakMsSUFBQUEsaUJBQWlCLENBQUM4RyxJQUFsQixDQUF1Qiw2QkFBdkIsRUFBc0Q7QUFDbEQzSyxNQUFBQSxJQUFJLEVBQUUsU0FENEM7QUFFbEQ0SyxNQUFBQSxpQkFBaUIsRUFBRSxDQUFDOUUsSUFBSSxDQUFDakcsTUFBTixDQUYrQjtBQUdsRGdMLE1BQUFBLFlBQVksRUFBRSxJQUhvQztBQUlsRC9FLE1BQUFBLElBQUksRUFBRUE7QUFKNEMsS0FBdEQsRUFoQm1DLENBdUJuQzs7QUFFQWdGLElBQUFBLHNCQUFzQixDQUFDQyxhQUF2QixDQUFxQyxxQkFBckMsRUFBNERqRixJQUE1RCxFQUFrRTtBQUM5RGtGLE1BQUFBLE1BQU0saUVBRHdEO0FBRTlEMUcsTUFBQUEsV0FBVyxFQUFFcEUsZUFBZSxDQUFDK0ssc0JBRmlDO0FBRzlEQyxNQUFBQSxLQUFLLEVBQUU7QUFIdUQsS0FBbEUsRUF6Qm1DLENBK0JuQztBQUVBOztBQUNBdk0sSUFBQUEsU0FBUyxDQUFDSSxPQUFWLENBQWtCMEcsR0FBbEIsQ0FBc0IsaUJBQXRCLEVBQXlDekQsRUFBekMsQ0FBNEMsaUJBQTVDLEVBQStELFlBQU07QUFDakUsVUFBTW1KLFlBQVksR0FBR3hNLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLFFBQXJDLENBQXJCOztBQUVBLFVBQUltSSxZQUFKLEVBQWtCO0FBQ2Q7QUFDQXhNLFFBQUFBLFNBQVMsQ0FBQ3lNLGtDQUFWLENBQTZDRCxZQUE3QztBQUNIO0FBQ0osS0FQRDtBQVNBeE0sSUFBQUEsU0FBUyxDQUFDME0sMEJBQVY7QUFDQTFNLElBQUFBLFNBQVMsQ0FBQzJNLDJCQUFWO0FBQ0gsR0Exc0JhOztBQTRzQmQ7QUFDSjtBQUNBO0FBQ0lGLEVBQUFBLGtDQS9zQmMsOENBK3NCcUJELFlBL3NCckIsRUErc0JtQztBQUM3QyxRQUFNSSxnQkFBZ0IsR0FBRyxDQUFDLGdCQUFELEVBQW1CLHNCQUFuQixFQUEyQyw2QkFBM0MsQ0FBekI7QUFFQUEsSUFBQUEsZ0JBQWdCLENBQUNDLE9BQWpCLENBQXlCLFVBQUFDLFNBQVMsRUFBSTtBQUNsQyxVQUFNekUsWUFBWSxHQUFHaEksQ0FBQyxZQUFLeU0sU0FBTCxFQUFELENBQW1CcEosR0FBbkIsRUFBckI7QUFDQSxVQUFNcUosV0FBVyxHQUFHMU0sQ0FBQyxZQUFLeU0sU0FBTCxlQUFELENBQTRCaEUsSUFBNUIsQ0FBaUMsT0FBakMsRUFBMEM2QyxJQUExQyxFQUFwQixDQUZrQyxDQUlsQzs7QUFDQXRMLE1BQUFBLENBQUMsWUFBS3lNLFNBQUwsZUFBRCxDQUE0QkUsTUFBNUIsR0FMa0MsQ0FPbEM7O0FBQ0EsVUFBTUMsV0FBVyxHQUFHLEVBQXBCO0FBQ0FBLE1BQUFBLFdBQVcsQ0FBQ0gsU0FBRCxDQUFYLEdBQXlCekUsWUFBekI7QUFDQTRFLE1BQUFBLFdBQVcsV0FBSUgsU0FBSixnQkFBWCxHQUF3Q0MsV0FBeEMsQ0FWa0MsQ0FZbEM7O0FBQ0E3SCxNQUFBQSxpQkFBaUIsQ0FBQzhHLElBQWxCLENBQXVCYyxTQUF2QixFQUFrQztBQUM5QnpMLFFBQUFBLElBQUksRUFBRSxTQUR3QjtBQUU5QjRLLFFBQUFBLGlCQUFpQixFQUFFLENBQUNPLFlBQUQsQ0FGVztBQUc5Qk4sUUFBQUEsWUFBWSxFQUFFLElBSGdCO0FBSTlCL0UsUUFBQUEsSUFBSSxFQUFFOEY7QUFKd0IsT0FBbEM7QUFNSCxLQW5CRDtBQW9CSCxHQXR1QmE7O0FBd3VCZDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lsQixFQUFBQSx3QkE3dUJjLG9DQTZ1QldOLFFBN3VCWCxFQTZ1QnFCO0FBQy9CLFFBQUksQ0FBQ3pMLFNBQVMsQ0FBQ00sV0FBVixDQUFzQnVFLE1BQTNCLEVBQW1DO0FBQy9CO0FBQ0gsS0FIOEIsQ0FLL0I7OztBQUNBeEUsSUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQm9LLElBQWhCO0FBQ0FwSyxJQUFBQSxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5Qm9LLElBQXpCLEdBUCtCLENBUy9COztBQUNBLFFBQU15QyxjQUFjLEdBQUcsQ0FBQ3pCLFFBQVEsQ0FBQzBCLEVBQVYsSUFBZ0IxQixRQUFRLENBQUMwQixFQUFULEtBQWdCLEVBQXZEO0FBRUEsUUFBTUMsTUFBTSxHQUFHQyxjQUFjLENBQUNyQixJQUFmLENBQW9CaE0sU0FBUyxDQUFDTSxXQUE5QixFQUEyQztBQUN0RGdOLE1BQUFBLFVBQVUsRUFBRUQsY0FBYyxDQUFDRSxVQUFmLENBQTBCQyxJQURnQjtBQUNUO0FBQzdDQyxNQUFBQSxjQUFjLEVBQUUsSUFGc0M7QUFFeEI7QUFDOUJDLE1BQUFBLGtCQUFrQixFQUFFLElBSGtDO0FBR3hCO0FBQzlCQyxNQUFBQSxlQUFlLEVBQUUsSUFKcUM7QUFJeEI7QUFDOUJDLE1BQUFBLGVBQWUsRUFBRSxJQUxxQztBQUt4QjtBQUM5QkMsTUFBQUEsWUFBWSxFQUFFLElBTndDO0FBTXhCO0FBQzlCQyxNQUFBQSxlQUFlLEVBQUUsSUFQcUM7QUFPeEI7QUFDOUJDLE1BQUFBLFdBQVcsRUFBRSxJQVJ5QztBQVFuQztBQUNuQkMsTUFBQUEsUUFBUSxFQUFFLEVBVDRDO0FBU3hCO0FBQzlCQyxNQUFBQSxjQUFjLEVBQUUsRUFWc0M7QUFVeEI7QUFDOUJDLE1BQUFBLGNBQWMsRUFBRSxLQVhzQztBQVd4QjtBQUM5QkMsTUFBQUEsVUFBVSxFQUFFLG9CQUFDQyxRQUFELEVBQWM7QUFDdEI7QUFDQXpFLFFBQUFBLElBQUksQ0FBQzBFLFdBQUw7QUFDSCxPQWZxRDtBQWdCdERDLE1BQUFBLFVBQVUsRUFBRSxvQkFBQ0MsT0FBRCxFQUFVQyxLQUFWLEVBQWlCOUUsUUFBakIsRUFBOEIsQ0FDdEM7QUFDQTtBQUNIO0FBbkJxRCxLQUEzQyxDQUFmLENBWitCLENBa0MvQjs7QUFDQTFKLElBQUFBLFNBQVMsQ0FBQ2EsY0FBVixHQUEyQnVNLE1BQTNCLENBbkMrQixDQXFDL0I7O0FBQ0EsUUFBSUYsY0FBYyxJQUFJbE4sU0FBUyxDQUFDTSxXQUFWLENBQXNCb0QsR0FBdEIsT0FBZ0MsRUFBdEQsRUFBMEQ7QUFDdERvQyxNQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNiLFlBQU04QyxZQUFZLEdBQUc1SSxTQUFTLENBQUNNLFdBQVYsQ0FBc0J1SSxPQUF0QixDQUE4QixXQUE5QixFQUEyQ0MsSUFBM0MsQ0FBZ0QsMEJBQWhELENBQXJCOztBQUNBLFlBQUlGLFlBQVksQ0FBQy9ELE1BQWIsR0FBc0IsQ0FBMUIsRUFBNkI7QUFDekIrRCxVQUFBQSxZQUFZLENBQUN2QixPQUFiLENBQXFCLE9BQXJCO0FBQ0g7QUFDSixPQUxTLEVBS1AsR0FMTyxDQUFWO0FBTUg7QUFDSixHQTN4QmE7O0FBNHhCZDtBQUNKO0FBQ0E7QUFDSXFGLEVBQUFBLDBCQS94QmMsd0NBK3hCZTtBQUNyQixRQUFNK0IsU0FBUyxHQUFHcE8sQ0FBQyxDQUFDLHdCQUFELENBQW5CO0FBQ0EsUUFBSW9PLFNBQVMsQ0FBQzVKLE1BQVYsS0FBcUIsQ0FBekIsRUFBNEIsT0FGUCxDQUlyQjs7QUFDQTRKLElBQUFBLFNBQVMsQ0FBQ0MsUUFBVixDQUFtQjtBQUNmQyxNQUFBQSxRQUFRLEVBQUU7QUFBQSxlQUFNaEYsSUFBSSxDQUFDMEUsV0FBTCxFQUFOO0FBQUE7QUFESyxLQUFuQjtBQUdOLEdBdnlCWTs7QUF5eUJkO0FBQ0o7QUFDQTtBQUNJMUIsRUFBQUEsMkJBNXlCYyx5Q0E0eUJnQjtBQUMxQixRQUFNOEIsU0FBUyxHQUFHcE8sQ0FBQyxDQUFDLHlCQUFELENBQW5CO0FBQ0EsUUFBSW9PLFNBQVMsQ0FBQzVKLE1BQVYsS0FBcUIsQ0FBekIsRUFBNEIsT0FGRixDQUkxQjs7QUFDQTRKLElBQUFBLFNBQVMsQ0FBQ0MsUUFBVixDQUFtQjtBQUNmQyxNQUFBQSxRQUFRLEVBQUU7QUFBQSxlQUFNaEYsSUFBSSxDQUFDMEUsV0FBTCxFQUFOO0FBQUE7QUFESyxLQUFuQjtBQUdILEdBcHpCYTs7QUFzekJkO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTFLLEVBQUFBLGdCQTN6QmMsNEJBMnpCR2lMLFlBM3pCSCxFQTJ6QmlCQyxlQTN6QmpCLEVBMnpCa0M7QUFDNUMsUUFBSUMsVUFBSjs7QUFFQSxRQUFJRixZQUFZLElBQUlBLFlBQVksQ0FBQ0csSUFBYixPQUF3QixFQUE1QyxFQUFnRDtBQUM1QztBQUNBRCxNQUFBQSxVQUFVLEdBQUcsdUNBQXVDRixZQUFwRCxDQUY0QyxDQUk1Qzs7QUFDQSxVQUFJQyxlQUFlLElBQUlBLGVBQWUsQ0FBQ0UsSUFBaEIsT0FBMkIsRUFBbEQsRUFBc0Q7QUFDbERELFFBQUFBLFVBQVUsSUFBSSxVQUFVRCxlQUFWLEdBQTRCLE1BQTFDO0FBQ0g7QUFDSixLQVJELE1BUU87QUFDSDtBQUNBQyxNQUFBQSxVQUFVLEdBQUd2TixlQUFlLENBQUN5TixxQkFBN0I7QUFDSCxLQWQyQyxDQWdCNUM7OztBQUNBM08sSUFBQUEsQ0FBQyxDQUFDLGFBQUQsQ0FBRCxDQUFpQjRPLElBQWpCLENBQXNCSCxVQUF0QjtBQUNIO0FBNzBCYSxDQUFsQjtBQWkxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQXpPLENBQUMsQ0FBQ3dHLEVBQUYsQ0FBS3hDLElBQUwsQ0FBVTJFLFFBQVYsQ0FBbUI1SCxLQUFuQixDQUF5QjhOLGFBQXpCLEdBQXlDLFlBQU07QUFDM0M7QUFDQSxNQUFNQyxhQUFhLEdBQUduUCxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxnQkFBckMsQ0FBdEI7QUFDQSxNQUFNK0ssYUFBYSxHQUFHcFAsU0FBUyxDQUFDYyxRQUFWLENBQW1CdUQsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZ0JBQXJDLENBQXRCLENBSDJDLENBSzNDOztBQUNBLE1BQUkrSyxhQUFhLENBQUN2SyxNQUFkLEdBQXVCLENBQXZCLEtBRUlzSyxhQUFhLEtBQUssQ0FBbEIsSUFFQUEsYUFBYSxLQUFLLEVBSnRCLENBQUosRUFLTztBQUNILFdBQU8sS0FBUDtBQUNILEdBYjBDLENBZTNDOzs7QUFDQSxTQUFPLElBQVA7QUFDSCxDQWpCRDtBQW1CQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0E5TyxDQUFDLENBQUN3RyxFQUFGLENBQUt4QyxJQUFMLENBQVUyRSxRQUFWLENBQW1CNUgsS0FBbkIsQ0FBeUJpTyxTQUF6QixHQUFxQyxVQUFDQyxLQUFELEVBQVFDLFNBQVI7QUFBQSxTQUFzQmxQLENBQUMsWUFBS2tQLFNBQUwsRUFBRCxDQUFtQkMsUUFBbkIsQ0FBNEIsUUFBNUIsQ0FBdEI7QUFBQSxDQUFyQzs7QUFHQW5QLENBQUMsQ0FBQ3dHLEVBQUYsQ0FBS3hDLElBQUwsQ0FBVTJFLFFBQVYsQ0FBbUI1SCxLQUFuQixDQUF5QnFPLGdCQUF6QixHQUE0QyxZQUFNO0FBQzlDO0FBQ0EsTUFBSXpQLFNBQVMsQ0FBQ2EsY0FBZCxFQUE4QjtBQUMxQixRQUFNNk8sS0FBSyxHQUFHckMsY0FBYyxDQUFDc0MsUUFBZixDQUF3QjNQLFNBQVMsQ0FBQ2EsY0FBbEMsQ0FBZDtBQUNBLFdBQU82TyxLQUFLLElBQUlBLEtBQUssQ0FBQ2xCLEtBQU4sSUFBZSxFQUEvQixDQUYwQixDQUVTO0FBQ3RDOztBQUNELFNBQU8sSUFBUCxDQU44QyxDQU1qQztBQUNoQixDQVBEO0FBU0E7QUFDQTtBQUNBOzs7QUFDQW5PLENBQUMsQ0FBQ3VQLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEI3UCxFQUFBQSxTQUFTLENBQUMrQyxVQUFWO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnNBUEksIEVtcGxveWVlc0FQSSwgRm9ybSxcbiBJbnB1dE1hc2tQYXR0ZXJucywgYXZhdGFyLCBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yLCBDbGlwYm9hcmRKUywgUGFzc3dvcmRXaWRnZXQsIFVzZXJNZXNzYWdlICovXG5cblxuLyoqXG4gKiBUaGUgZXh0ZW5zaW9uIG9iamVjdC5cbiAqIE1hbmFnZXMgdGhlIG9wZXJhdGlvbnMgYW5kIGJlaGF2aW9ycyBvZiB0aGUgZXh0ZW5zaW9uIGVkaXQgZm9ybVxuICpcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uXG4gKi9cbmNvbnN0IGV4dGVuc2lvbiA9IHtcbiAgICBkZWZhdWx0RW1haWw6ICcnLFxuICAgIGRlZmF1bHROdW1iZXI6ICcnLFxuICAgIGRlZmF1bHRNb2JpbGVOdW1iZXI6ICcnLFxuICAgICRudW1iZXI6ICQoJyNudW1iZXInKSxcbiAgICAkc2lwX3NlY3JldDogJCgnI3NpcF9zZWNyZXQnKSxcbiAgICAkbW9iaWxlX251bWJlcjogJCgnI21vYmlsZV9udW1iZXInKSxcbiAgICAkZndkX2ZvcndhcmRpbmc6ICQoJyNmd2RfZm9yd2FyZGluZycpLFxuICAgICRmd2RfZm9yd2FyZGluZ29uYnVzeTogJCgnI2Z3ZF9mb3J3YXJkaW5nb25idXN5JyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZTogJCgnI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpLFxuICAgICRlbWFpbDogJCgnI3VzZXJfZW1haWwnKSxcbiAgICAkdXNlcl91c2VybmFtZTogJCgnI3VzZXJfdXNlcm5hbWUnKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQYXNzd29yZCB3aWRnZXQgaW5zdGFuY2UuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBwYXNzd29yZFdpZGdldDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNleHRlbnNpb25zLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJ1bGFyIG1lbnUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdGFiTWVudUl0ZW1zOiAkKCcjZXh0ZW5zaW9ucy1tZW51IC5pdGVtJyksXG5cblxuICAgIC8qKlxuICAgICAqIFN0cmluZyBmb3IgdGhlIGZvcndhcmRpbmcgc2VsZWN0LlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZm9yd2FyZGluZ1NlbGVjdDogJyNleHRlbnNpb25zLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBudW1iZXI6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdudW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW251bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBtb2JpbGVfbnVtYmVyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWFzaycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcl9lbWFpbDoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl9lbWFpbCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX3VzZXJuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl91c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzaXBfc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlU2VjcmV0V2VhayxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3Bhc3N3b3JkU3RyZW5ndGgnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVBhc3N3b3JkVG9vV2Vha1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9yaW5nbGVuZ3RoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuICAgICAgICAgICAgZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb24gZm9ybSBhbmQgaXRzIGludGVyYWN0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBEZWZhdWx0IHZhbHVlcyB3aWxsIGJlIHNldCBhZnRlciBSRVNUIEFQSSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggZW1wdHkgdmFsdWVzIHNpbmNlIGZvcm1zIGFyZSBlbXB0eSB1bnRpbCBBUEkgcmVzcG9uZHNcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9ICcnO1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE51bWJlciA9ICcnO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFiIG1lbnUgaXRlbXMsIGFjY29yZGlvbnMsIGFuZCBkcm9wZG93biBtZW51c1xuICAgICAgICBleHRlbnNpb24uJHRhYk1lbnVJdGVtcy50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIC51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBmb3IgcXVlc3Rpb24gaWNvbnMgYW5kIGJ1dHRvbnNcbiAgICAgICAgJChcImkucXVlc3Rpb25cIikucG9wdXAoKTtcbiAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIGV4dGVuc2lvbi4kc2lwX3NlY3JldC5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gZm9ybVxuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgaGFuZGxlciBmb3IgdXNlcm5hbWUgY2hhbmdlIHRvIHVwZGF0ZSBwYWdlIHRpdGxlXG4gICAgICAgIGV4dGVuc2lvbi4kdXNlcl91c2VybmFtZS5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2sgPyBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKSA6IGV4dGVuc2lvbi4kbnVtYmVyLnZhbCgpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLnVwZGF0ZVBhZ2VIZWFkZXIoJCh0aGlzKS52YWwoKSwgY3VycmVudE51bWJlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFsc28gdXBkYXRlIGhlYWRlciB3aGVuIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlc1xuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRVc2VybmFtZSA9IGV4dGVuc2lvbi4kdXNlcl91c2VybmFtZS52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnROdW1iZXIgPSAkKHRoaXMpLmlucHV0bWFzayA/ICQodGhpcykuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykgOiAkKHRoaXMpLnZhbCgpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLnVwZGF0ZVBhZ2VIZWFkZXIoY3VycmVudFVzZXJuYW1lLCBjdXJyZW50TnVtYmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgYWR2YW5jZWQgc2V0dGluZ3MgdXNpbmcgdW5pZmllZCBzeXN0ZW1cbiAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBvbGQgbmFtZSBpZiBuZXcgY2xhc3Mgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9hZCBleHRlbnNpb24gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgZXh0ZW5zaW9uLmxvYWRFeHRlbnNpb25EYXRhKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBtb2JpbGUgbnVtYmVyIGZyb20gY2xpcGJvYXJkXG4gICAgICovXG4gICAgY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgYWZ0ZXIgYSBwaG9uZSBudW1iZXIgaGFzIGJlZW4gZW50ZXJlZCBjb21wbGV0ZWx5LlxuICAgICAqIEl0IHNlcnZlcyB0byBjaGVjayBpZiB0aGVyZSBhcmUgYW55IGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIHBob25lIG51bWJlcnMuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgYWZ0ZXIgcmVtb3ZpbmcgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBDYWxsIHRoZSBgY2hlY2tBdmFpbGFiaWxpdHlgIGZ1bmN0aW9uIG9uIGBFeHRlbnNpb25zYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgaXMgYWxyZWFkeSBpbiB1c2UuXG4gICAgICAgIC8vIFBhcmFtZXRlcnM6IGRlZmF1bHQgbnVtYmVyLCBuZXcgbnVtYmVyLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKG51bWJlciksIHVzZXIgaWRcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE51bWJlciwgbmV3TnVtYmVyLCAnbnVtYmVyJywgdXNlcklkKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIG9uY2UgYW4gZW1haWwgYWRkcmVzcyBoYXMgYmVlbiBjb21wbGV0ZWx5IGVudGVyZWQuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGFmdGVyIHJlbW92aW5nIGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld0VtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGBjaGVja0F2YWlsYWJpbGl0eWAgZnVuY3Rpb24gb24gYFVzZXJzQVBJYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBlbWFpbCBpcyBhbHJlYWR5IGluIHVzZS5cbiAgICAgICAgLy8gUGFyYW1ldGVyczogZGVmYXVsdCBlbWFpbCwgbmV3IGVtYWlsLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKGVtYWlsKSwgdXNlciBpZFxuICAgICAgICBVc2Vyc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdEVtYWlsLCBuZXdFbWFpbCwnZW1haWwnLCB1c2VySWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBY3RpdmF0ZWQgd2hlbiBlbnRlcmluZyBhIG1vYmlsZSBwaG9uZSBudW1iZXIgaW4gdGhlIGVtcGxveWVlJ3MgcHJvZmlsZS5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgd2l0aG91dCBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gR2V0IHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBEeW5hbWljIGNoZWNrIHRvIHNlZSBpZiB0aGUgc2VsZWN0ZWQgbW9iaWxlIG51bWJlciBpcyBhdmFpbGFibGVcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cbiAgICAgICAgLy8gUmVmaWxsIHRoZSBtb2JpbGUgZGlhbHN0cmluZyBpZiB0aGUgbmV3IG1vYmlsZSBudW1iZXIgaXMgZGlmZmVyZW50IHRoYW4gdGhlIGRlZmF1bHQgb3IgaWYgdGhlIG1vYmlsZSBkaWFsc3RyaW5nIGlzIGVtcHR5XG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyXG4gICAgICAgICAgICB8fCAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycpLmxlbmd0aCA9PT0gMClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2JpbGUgbnVtYmVyIGhhcyBjaGFuZ2VkXG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyB1c2VybmFtZSBmcm9tIHRoZSBmb3JtXG4gICAgICAgICAgICBjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9yd2FyZGluZyBmaWVsZHMgdGhhdCBtYXRjaCB0aGUgb2xkIG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEZ3ZE9uQnVzeSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZ3ZF9mb3J3YXJkaW5nIGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkRm9yd2FyZGluZyA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblxuICAgICAgICAgICAgICAgIC8vIFNldCByaW5nIGxlbmd0aCBpZiBlbXB0eVxuICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgICAgICAgIHx8IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKT09PVwiMFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCA0NSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5zZXRWYWx1ZSgnZndkX2ZvcndhcmRpbmcnLCBuZXdNb2JpbGVOdW1iZXIsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZndkX2ZvcndhcmRpbmdvbmJ1c3kgaWYgaXQgbWF0Y2hlcyBvbGQgbW9iaWxlIG51bWJlciAoaW5jbHVkaW5nIGVtcHR5KVxuICAgICAgICAgICAgaWYgKGN1cnJlbnRGd2RPbkJ1c3kgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5zZXRWYWx1ZSgnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLnNldFZhbHVlKCdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCBuZXdNb2JpbGVOdW1iZXIsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFNldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgYXMgdGhlIGRlZmF1bHRcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBuZXdNb2JpbGVOdW1iZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxlZCB3aGVuIHRoZSBtb2JpbGUgcGhvbmUgbnVtYmVyIGlzIGNsZWFyZWQgaW4gdGhlIGVtcGxveWVlIGNhcmQuXG4gICAgICovXG4gICAgY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIENoZWNrIGN1cnJlbnQgZm9yd2FyZGluZyB2YWx1ZXMgYmVmb3JlIGNsZWFyaW5nXG4gICAgICAgIGNvbnN0IGN1cnJlbnRGd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICBjb25zdCBjdXJyZW50RndkT25CdXN5ID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpO1xuICAgICAgICBjb25zdCBjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB0aGUgJ21vYmlsZV9kaWFsc3RyaW5nJyBhbmQgJ21vYmlsZV9udW1iZXInIGZpZWxkcyBpbiB0aGUgZm9ybVxuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgJycpO1xuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9udW1iZXInLCAnJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChjdXJyZW50RndkRm9yd2FyZGluZyA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIElmIHNvLCBjbGVhciB0aGUgJ2Z3ZF9yaW5nbGVuZ3RoJyBmaWVsZCBhbmQgY2xlYXIgZm9yd2FyZGluZyBkcm9wZG93blxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDApO1xuICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmNsZWFyKCdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIGJ1c3kgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoY3VycmVudEZ3ZE9uQnVzeSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiB1bmF2YWlsYWJsZSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG4gICAgfSxcblxuICAgIGluaXRpYWxpemVJbnB1dE1hc2tzKCl7XG4gICAgICAgIC8vIFNldCB1cCBudW1iZXIgaW5wdXQgbWFzayB3aXRoIGNvcnJlY3QgbGVuZ3RoIGZyb20gQVBJXG4gICAgICAgIGxldCB0aW1lb3V0TnVtYmVySWQ7XG5cbiAgICAgICAgLy8gQWx3YXlzIGluaXRpYWxpemUgbWFzayBiYXNlZCBvbiBleHRlbnNpb25zX2xlbmd0aCBmcm9tIEFQSVxuICAgICAgICAvLyBObyBkZWZhdWx0cyBpbiBKYXZhU2NyaXB0IC0gdmFsdWUgbXVzdCBjb21lIGZyb20gQVBJXG4gICAgICAgIGlmIChleHRlbnNpb24uZXh0ZW5zaW9uc0xlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uc0xlbmd0aCA9IHBhcnNlSW50KGV4dGVuc2lvbi5leHRlbnNpb25zTGVuZ3RoLCAxMCk7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uc0xlbmd0aCA+PSAyICYmIGV4dGVuc2lvbnNMZW5ndGggPD0gMTApIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIG1hc2sgd2l0aCBjb3JyZWN0IGxlbmd0aCBhbmQgb25jb21wbGV0ZSBoYW5kbGVyXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKHtcbiAgICAgICAgICAgICAgICAgICAgbWFzazogYDl7Miwke2V4dGVuc2lvbnNMZW5ndGh9fWAsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnXycsXG4gICAgICAgICAgICAgICAgICAgIG9uY29tcGxldGU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBwcmV2aW91cyB0aW1lciwgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGltZW91dE51bWJlcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXROdW1iZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0TnVtYmVySWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlTnVtYmVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vbigncGFzdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrcyBmb3IgdGhlIG1vYmlsZSBudW1iZXIgaW5wdXRcbiAgICAgICAgY29uc3QgbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3I6ICdbMC05XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uY2xlYXJlZDogZXh0ZW5zaW9uLmNiT25DbGVhcmVkTW9iaWxlTnVtYmVyLFxuICAgICAgICAgICAgICAgIG9uY29tcGxldGU6IGV4dGVuc2lvbi5jYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIsXG4gICAgICAgICAgICAgICAgc2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgb25CZWZvcmVQYXN0ZSB0byBwcmV2ZW50IGNvbmZsaWN0cyB3aXRoIG91ciBjdXN0b20gaGFuZGxlclxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgbGlzdDogbWFza0xpc3QsXG4gICAgICAgICAgICBsaXN0S2V5OiAnbWFzaycsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBoYW5kbGVyIGZvciBwcm9ncmFtbWF0aWMgdmFsdWUgY2hhbmdlcyAoZm9yIHRlc3RzIGFuZCBhdXRvbWF0aW9uKVxuICAgICAgICBjb25zdCBvcmlnaW5hbFZhbCA9ICQuZm4udmFsO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIub2ZmKCd2YWwub3ZlcnJpZGUnKS5vbigndmFsLm92ZXJyaWRlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICAgICAgICAvLyBJZiBzZXR0aW5nIGEgdmFsdWUgcHJvZ3JhbW1hdGljYWxseVxuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMCAmJiB0eXBlb2YgYXJnc1swXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGFyZ3NbMF07XG5cbiAgICAgICAgICAgICAgICAvLyBUZW1wb3JhcmlseSByZW1vdmUgbWFza1xuICAgICAgICAgICAgICAgIGlmICgkdGhpcy5kYXRhKCdpbnB1dG1hc2snKSkge1xuICAgICAgICAgICAgICAgICAgICAkdGhpcy5pbnB1dG1hc2soJ3JlbW92ZScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgdmFsdWVcbiAgICAgICAgICAgICAgICBvcmlnaW5hbFZhbC5hcHBseSh0aGlzLCBhcmdzKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlYXBwbHkgbWFzayBhZnRlciBhIHNob3J0IGRlbGF5XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICR0aGlzLnRyaWdnZXIoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgfSwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIub24oJ3Bhc3RlJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpOyAvLyBQcmV2ZW50IGRlZmF1bHQgcGFzdGUgYmVoYXZpb3JcblxuICAgICAgICAgICAgLy8gR2V0IHBhc3RlZCBkYXRhIGZyb20gY2xpcGJvYXJkXG4gICAgICAgICAgICBsZXQgcGFzdGVkRGF0YSA9ICcnO1xuXG4gICAgICAgICAgICAvLyBUcnkgdG8gZ2V0IGRhdGEgZnJvbSBjbGlwYm9hcmQgZXZlbnRcbiAgICAgICAgICAgIGlmIChlLm9yaWdpbmFsRXZlbnQgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUuY2xpcGJvYXJkRGF0YSAmJiBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIERpcmVjdCBjbGlwYm9hcmREYXRhIGFjY2Vzc1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuY2xpcGJvYXJkRGF0YSAmJiB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIElFXG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSWYgd2UgY291bGRuJ3QgZ2V0IGNsaXBib2FyZCBkYXRhLCBkb24ndCBwcm9jZXNzXG4gICAgICAgICAgICBpZiAoIXBhc3RlZERhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFByb2Nlc3MgdGhlIHBhc3RlZCBkYXRhXG4gICAgICAgICAgICBsZXQgcHJvY2Vzc2VkRGF0YTtcbiAgICAgICAgICAgIGlmIChwYXN0ZWREYXRhLmNoYXJBdCgwKSA9PT0gJysnKSB7XG4gICAgICAgICAgICAgICAgLy8gS2VlcCAnKycgYW5kIHJlbW92ZSBvdGhlciBub24tZGlnaXQgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgIHByb2Nlc3NlZERhdGEgPSAnKycgKyBwYXN0ZWREYXRhLnNsaWNlKDEpLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBhbGwgbm9uLWRpZ2l0IGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICBwcm9jZXNzZWREYXRhID0gcGFzdGVkRGF0YS5yZXBsYWNlKC9cXEQvZywgJycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJbnNlcnQgY2xlYW5lZCBkYXRhIGludG8gdGhlIGlucHV0IGZpZWxkXG4gICAgICAgICAgICBjb25zdCBpbnB1dCA9IHRoaXM7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IGlucHV0LnNlbGVjdGlvblN0YXJ0IHx8IDA7XG4gICAgICAgICAgICBjb25zdCBlbmQgPSBpbnB1dC5zZWxlY3Rpb25FbmQgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICQoaW5wdXQpLnZhbCgpIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBjdXJyZW50VmFsdWUuc3Vic3RyaW5nKDAsIHN0YXJ0KSArIHByb2Nlc3NlZERhdGEgKyBjdXJyZW50VmFsdWUuc3Vic3RyaW5nKGVuZCk7XG5cbiAgICAgICAgICAgIC8vIFRlbXBvcmFyaWx5IHJlbW92ZSBtYXNrLCBzZXQgdmFsdWUsIHRoZW4gcmVhcHBseVxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzayhcInJlbW92ZVwiKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci52YWwobmV3VmFsdWUpO1xuXG4gICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgdGhlIHZhbHVlIGlzIHNldCBiZWZvcmUgcmVhcHBseWluZyBtYXNrXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGlucHV0IGV2ZW50IHRvIHJlYXBwbHkgdGhlIG1hc2tcbiAgICAgICAgICAgICAgICAkKGlucHV0KS50cmlnZ2VyKCdpbnB1dCcpO1xuICAgICAgICAgICAgfSwgMTApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2sgZm9yIHRoZSBlbWFpbCBpbnB1dFxuICAgICAgICBsZXQgdGltZW91dEVtYWlsSWQ7XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcsIHtcbiAgICAgICAgICAgIG9uY29tcGxldGU6ICgpPT57XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodGltZW91dEVtYWlsSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRFbWFpbElkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIHdpdGggYSBkZWxheSBvZiAwLjUgc2Vjb25kc1xuICAgICAgICAgICAgICAgIHRpbWVvdXRFbWFpbElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVFbWFpbCgpO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbC5vbigncGFzdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVFbWFpbCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL0F0dGFjaCBhIGZvY3Vzb3V0IGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBtb2JpbGUgbnVtYmVyIGlucHV0XG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5mb2N1c291dChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgbGV0IHBob25lID0gJChlLnRhcmdldCkudmFsKCkucmVwbGFjZSgvW14wLTldL2csIFwiXCIpO1xuICAgICAgICAgICAgaWYgKHBob25lID09PSAnJykge1xuICAgICAgICAgICAgICAgICQoZS50YXJnZXQpLnZhbCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBuZXcgU0lQIHBhc3N3b3JkLlxuICAgICAqIFVzZXMgdGhlIFBhc3N3b3JkV2lkZ2V0IGJ1dHRvbiBsaWtlIGluIEFNSSBtYW5hZ2VyLlxuICAgICAqL1xuICAgIGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSB7XG4gICAgICAgIC8vIFRyaWdnZXIgcGFzc3dvcmQgZ2VuZXJhdGlvbiB0aHJvdWdoIHRoZSB3aWRnZXQgYnV0dG9uIChsaWtlIGluIEFNSSlcbiAgICAgICAgY29uc3QgJGdlbmVyYXRlQnRuID0gZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LmNsb3Nlc3QoJy51aS5pbnB1dCcpLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICBpZiAoJGdlbmVyYXRlQnRuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRnZW5lcmF0ZUJ0bi50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhLm1vYmlsZV9udW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIGZvcm0gY29udHJvbCBmaWVsZHMgdGhhdCBzaG91bGRuJ3QgYmUgc2VudCB0byBzZXJ2ZXJcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLmRpcnJ0eTtcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLnN1Ym1pdE1vZGU7XG4gICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YS51c2VyX2lkOyAvLyBSZW1vdmUgdXNlcl9pZCBmaWVsZCB0byBwcmV2ZW50IHZhbGlkYXRpb24gaXNzdWVzXG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgcmVjb3JkIChjaGVjayBpZiB3ZSBoYXZlIGEgcmVhbCBJRClcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBTdG9yZSB0aGUgY3VycmVudCBleHRlbnNpb24gbnVtYmVyIGFzIHRoZSBkZWZhdWx0IG51bWJlciBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLm51bWJlcikge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gcmVzcG9uc2UuZGF0YS5udW1iZXI7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBwaG9uZSByZXByZXNlbnRhdGlvbiB3aXRoIHRoZSBuZXcgZGVmYXVsdCBudW1iZXJcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lUmVwcmVzZW50KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGUgYW5kIHJlc3BvbnNlLnJlbG9hZCBmcm9tIHNlcnZlclxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5ncyBmb3IgUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBleHRlbnNpb24uJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGV4dGVuc2lvbi52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBleHRlbnNpb24uY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBleHRlbnNpb24uY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gRW1wbG95ZWVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgYXV0b21hdGljIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvblxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgY2hlY2tib3ggdmFsdWVzIGFyZSBzZW50IGFzIHRydWUvZmFsc2UgaW5zdGVhZCBvZiBcIm9uXCIvdW5kZWZpbmVkXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBWNS4wIEFyY2hpdGVjdHVyZTogTG9hZCBleHRlbnNpb24gZGF0YSB2aWEgUkVTVCBBUEkgKHNpbWlsYXIgdG8gSVZSIG1lbnUgcGF0dGVybilcbiAgICAgKi9cbiAgICBsb2FkRXh0ZW5zaW9uRGF0YSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBleHRlbnNpb24uZ2V0UmVjb3JkSWQoKTtcblxuICAgICAgICAvLyBVc2UgJ25ldycgYXMgSUQgZm9yIG5ldyByZWNvcmRzIHRvIGdldCBkZWZhdWx0IHZhbHVlcyBmcm9tIHNlcnZlclxuICAgICAgICBjb25zdCBhcGlJZCA9IHJlY29yZElkID09PSAnJyA/ICduZXcnIDogcmVjb3JkSWQ7XG5cbiAgICAgICAgLy8gSGlkZSBtb25pdG9yaW5nIGVsZW1lbnRzIGZvciBuZXcgZW1wbG95ZWVzXG4gICAgICAgIGlmIChhcGlJZCA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgICQoJyNzdGF0dXMnKS5oaWRlKCk7IC8vIEhpZGUgc3RhdHVzIGxhYmVsXG4gICAgICAgICAgICAkKCdhW2RhdGEtdGFiPVwic3RhdHVzXCJdJykuaGlkZSgpOyAvLyBIaWRlIG1vbml0b3JpbmcgdGFiXG4gICAgICAgIH1cblxuICAgICAgICBFbXBsb3llZXNBUEkuZ2V0UmVjb3JkKGFwaUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRCAoZm9sbG93aW5nIENhbGxRdWV1ZXMgcGF0dGVybilcbiAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLnBvcHVsYXRlRm9ybVdpdGhEYXRhKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIC8vIFN0b3JlIGRlZmF1bHQgdmFsdWVzIGFmdGVyIGRhdGEgbG9hZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gcmVzcG9uc2UuZGF0YS5udW1iZXIgfHwgJyc7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9IHJlc3BvbnNlLmRhdGEudXNlcl9lbWFpbCB8fCAnJztcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IHJlc3BvbnNlLmRhdGEubW9iaWxlX251bWJlciB8fCAnJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBzdGlsbCBpbml0aWFsaXplIGF2YXRhciBldmVuIGlmIEFQSSBmYWlsc1xuICAgICAgICAgICAgICAgIGlmIChyZWNvcmRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgYXZhdGFyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgZXh0ZW5zaW9uIGRhdGEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMIChsaWtlIElWUiBtZW51KVxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gUkVTVCBBUEkgKFY1LjAgY2xlYW4gZGF0YSBhcmNoaXRlY3R1cmUpXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtV2l0aERhdGEoZGF0YSkge1xuICAgICAgICAvLyBTdG9yZSBleHRlbnNpb25zX2xlbmd0aCBmcm9tIEFQSSBmb3IgdXNlIGluIGluaXRpYWxpemVJbnB1dE1hc2tzXG4gICAgICAgIC8vIFRoaXMgdmFsdWUgTVVTVCBjb21lIGZyb20gQVBJIC0gbm8gZGVmYXVsdHMgaW4gSlNcbiAgICAgICAgZXh0ZW5zaW9uLmV4dGVuc2lvbnNMZW5ndGggPSBkYXRhLmV4dGVuc2lvbnNfbGVuZ3RoO1xuXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoIChzYW1lIGFzIElWUiBtZW51KVxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggVjUuMCBzcGVjaWFsaXplZCBjbGFzc2VzIC0gY29tcGxldGUgYXV0b21hdGlvblxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YShmb3JtRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiBhbnkgVUkgZWxlbWVudHMgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgaWYgKGZvcm1EYXRhLm51bWJlcikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLW51bWJlci1kaXNwbGF5JykudGV4dChmb3JtRGF0YS5udW1iZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGF2YXRhciBjb21wb25lbnQgYWZ0ZXIgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgICAgICAgICAgYXZhdGFyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgYXZhdGFyIFVSTCBkeW5hbWljYWxseSBmcm9tIEFQSSBkYXRhXG4gICAgICAgICAgICAgICAgYXZhdGFyLnNldEF2YXRhclVybChmb3JtRGF0YS51c2VyX2F2YXRhcik7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBtb2RpZnkgc3RhdHVzIG1vbml0b3IgYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIGVtcGxveWVlIG5hbWUgYW5kIGV4dGVuc2lvbiBudW1iZXJcbiAgICAgICAgICAgICAgICBleHRlbnNpb24udXBkYXRlUGFnZUhlYWRlcihmb3JtRGF0YS51c2VyX3VzZXJuYW1lLCBmb3JtRGF0YS5udW1iZXIpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0KGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgaW5wdXQgbWFza3MgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUlucHV0TWFza3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBOT1RFOiBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCkgd2lsbCBiZSBjYWxsZWQgYXV0b21hdGljYWxseSBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KClcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggY2xlYW4gZGF0YSAtIFY1LjAgQXJjaGl0ZWN0dXJlXG4gICAgICogVXNlcyBzcGVjaWFsaXplZCBjbGFzc2VzIHdpdGggY29tcGxldGUgYXV0b21hdGlvbiAobm8gb25DaGFuZ2UgY2FsbGJhY2tzIG5lZWRlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEV4dGVuc2lvbiBkcm9wZG93bnMgd2l0aCBjdXJyZW50IGV4dGVuc2lvbiBleGNsdXNpb24gLSBWNS4wIHNwZWNpYWxpemVkIGNsYXNzXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2Z3ZF9mb3J3YXJkaW5nJywge1xuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtkYXRhLm51bWJlcl0sXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsIFxuICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtkYXRhLm51bWJlcl0sXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywge1xuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtkYXRhLm51bWJlcl0sXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gTmV0d29yayBmaWx0ZXIgZHJvcGRvd24gd2l0aCBBUEkgZGF0YSAtIFY1LjAgYmFzZSBjbGFzc1xuICAgICAgICBcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdzaXBfbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICAgICAgICAgICAgYXBpVXJsOiBgL3BieGNvcmUvYXBpL3YzL25ldHdvcmstZmlsdGVyczpnZXRGb3JTZWxlY3Q/Y2F0ZWdvcmllc1tdPVNJUGAsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlbGVjdE5ldHdvcmtGaWx0ZXIsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBWNS4wIGFyY2hpdGVjdHVyZSB3aXRoIGVtcHR5IGZvcm0gc2hvdWxkIG5vdCBoYXZlIEhUTUwgZW50aXRpZXMgaXNzdWVzXG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzIC0gcmVidWlsZCBkcm9wZG93bnMgd2l0aCBuZXcgZXhjbHVzaW9uXG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9mZignY2hhbmdlLmRyb3Bkb3duJykub24oJ2NoYW5nZS5kcm9wZG93bicsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5ld0V4dGVuc2lvbiA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbnVtYmVyJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChuZXdFeHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXhjbHVzaW9ucyBmb3IgZm9yd2FyZGluZyBkcm9wZG93bnNcbiAgICAgICAgICAgICAgICBleHRlbnNpb24udXBkYXRlRm9yd2FyZGluZ0Ryb3Bkb3duc0V4Y2x1c2lvbihuZXdFeHRlbnNpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24oKTtcbiAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGZvcndhcmRpbmcgZHJvcGRvd25zIHdoZW4gZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzXG4gICAgICovXG4gICAgdXBkYXRlRm9yd2FyZGluZ0Ryb3Bkb3duc0V4Y2x1c2lvbihuZXdFeHRlbnNpb24pIHtcbiAgICAgICAgY29uc3QgZm9yd2FyZGluZ0ZpZWxkcyA9IFsnZndkX2ZvcndhcmRpbmcnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJ107XG4gICAgICAgIFxuICAgICAgICBmb3J3YXJkaW5nRmllbGRzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICQoYCMke2ZpZWxkTmFtZX1gKS52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApLmZpbmQoJy50ZXh0JykudGV4dCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgb2xkIGRyb3Bkb3duXG4gICAgICAgICAgICAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCkucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSBuZXcgZGF0YSBvYmplY3Qgd2l0aCBjdXJyZW50IHZhbHVlIGZvciByZWluaXRpYWxpemluZ1xuICAgICAgICAgICAgY29uc3QgcmVmcmVzaERhdGEgPSB7fTtcbiAgICAgICAgICAgIHJlZnJlc2hEYXRhW2ZpZWxkTmFtZV0gPSBjdXJyZW50VmFsdWU7XG4gICAgICAgICAgICByZWZyZXNoRGF0YVtgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGBdID0gY3VycmVudFRleHQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlaW5pdGlhbGl6ZSB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoZmllbGROYW1lLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbbmV3RXh0ZW5zaW9uXSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogcmVmcmVzaERhdGFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0IGFmdGVyIGZvcm0gZGF0YSBpcyBsb2FkZWRcbiAgICAgKiBUaGlzIGVuc3VyZXMgdmFsaWRhdGlvbiBvbmx5IGhhcHBlbnMgYWZ0ZXIgcGFzc3dvcmQgaXMgcG9wdWxhdGVkIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZm9ybURhdGEgLSBUaGUgZm9ybSBkYXRhIGxvYWRlZCBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0KGZvcm1EYXRhKSB7XG4gICAgICAgIGlmICghZXh0ZW5zaW9uLiRzaXBfc2VjcmV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGlkZSBhbnkgbGVnYWN5IGJ1dHRvbnMgaWYgdGhleSBleGlzdFxuICAgICAgICAkKCcuY2xpcGJvYXJkJykuaGlkZSgpO1xuICAgICAgICAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJykuaGlkZSgpO1xuXG4gICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IGV4dGVuc2lvbiAobm8gSUQpIG9yIGV4aXN0aW5nIG9uZVxuICAgICAgICBjb25zdCBpc05ld0V4dGVuc2lvbiA9ICFmb3JtRGF0YS5pZCB8fCBmb3JtRGF0YS5pZCA9PT0gJyc7XG5cbiAgICAgICAgY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdChleHRlbnNpb24uJHNpcF9zZWNyZXQsIHtcbiAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVCwgIC8vIFNvZnQgdmFsaWRhdGlvbiAtIHNob3cgd2FybmluZ3MgYnV0IGFsbG93IHN1Ym1pc3Npb25cbiAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLCAgICAgICAgIC8vIFNob3cgZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsICAgICAvLyBTaG93IHNob3cvaGlkZSBwYXNzd29yZCB0b2dnbGVcbiAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSwgICAgICAgIC8vIFNob3cgY29weSB0byBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsICAgICAgICAvLyBTaG93IHBhc3N3b3JkIHN0cmVuZ3RoIGJhclxuICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLCAgICAgICAgICAgLy8gU2hvdyB2YWxpZGF0aW9uIHdhcm5pbmdzXG4gICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsICAgICAgICAvLyBWYWxpZGF0ZSBhcyB1c2VyIHR5cGVzXG4gICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZSwgLy8gQWx3YXlzIHZhbGlkYXRlIGlmIHBhc3N3b3JkIGZpZWxkIGhhcyB2YWx1ZVxuICAgICAgICAgICAgbWluU2NvcmU6IDMwLCAgICAgICAgICAgICAgICAgLy8gU0lQIHBhc3N3b3JkcyBoYXZlIGxvd2VyIG1pbmltdW0gc2NvcmUgcmVxdWlyZW1lbnRcbiAgICAgICAgICAgIGdlbmVyYXRlTGVuZ3RoOiAyMCwgICAgICAgICAgIC8vIDIwIGNoYXJzIG1heCBmb3IgR3JhbmRzdHJlYW0gR0RNUyBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICBpbmNsdWRlU3BlY2lhbDogZmFsc2UsICAgICAgICAvLyBFeGNsdWRlIHNwZWNpYWwgY2hhcmFjdGVycyBmb3IgU0lQIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgIG9uR2VuZXJhdGU6IChwYXNzd29yZCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVmFsaWRhdGU6IChpc1ZhbGlkLCBzY29yZSwgbWVzc2FnZXMpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBPcHRpb25hbDogSGFuZGxlIHZhbGlkYXRpb24gcmVzdWx0cyBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICAvLyBUaGUgd2lkZ2V0IHdpbGwgaGFuZGxlIHZpc3VhbCBmZWVkYmFjayBhdXRvbWF0aWNhbGx5XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgd2lkZ2V0IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0ID0gd2lkZ2V0O1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIG5ldyBleHRlbnNpb25zIG9ubHk6IGF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgaWYgZmllbGQgaXMgZW1wdHlcbiAgICAgICAgaWYgKGlzTmV3RXh0ZW5zaW9uICYmIGV4dGVuc2lvbi4kc2lwX3NlY3JldC52YWwoKSA9PT0gJycpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRnZW5lcmF0ZUJ0biA9IGV4dGVuc2lvbi4kc2lwX3NlY3JldC5jbG9zZXN0KCcudWkuaW5wdXQnKS5maW5kKCdidXR0b24uZ2VuZXJhdGUtcGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJGdlbmVyYXRlQnRuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJGdlbmVyYXRlQnRuLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEVE1GIG1vZGUgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCkge1xuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3NpcF9kdG1mbW9kZS1kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9KTtcbiAgICAgfSxcbiAgICAgICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0cmFuc3BvcnQgcHJvdG9jb2wgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3NpcF90cmFuc3BvcnQtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCBlbXBsb3llZSBuYW1lIGFuZCBleHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGVtcGxveWVlTmFtZSAtIE5hbWUgb2YgdGhlIGVtcGxveWVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbk51bWJlciAtIEV4dGVuc2lvbiBudW1iZXIgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIHVwZGF0ZVBhZ2VIZWFkZXIoZW1wbG95ZWVOYW1lLCBleHRlbnNpb25OdW1iZXIpIHtcbiAgICAgICAgbGV0IGhlYWRlclRleHQ7XG5cbiAgICAgICAgaWYgKGVtcGxveWVlTmFtZSAmJiBlbXBsb3llZU5hbWUudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgLy8gRXhpc3RpbmcgZW1wbG95ZWUgd2l0aCBuYW1lXG4gICAgICAgICAgICBoZWFkZXJUZXh0ID0gJzxpIGNsYXNzPVwidXNlciBvdXRsaW5lIGljb25cIj48L2k+ICcgKyBlbXBsb3llZU5hbWU7XG5cbiAgICAgICAgICAgIC8vIEFkZCBleHRlbnNpb24gbnVtYmVyIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk51bWJlciAmJiBleHRlbnNpb25OdW1iZXIudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgICAgIGhlYWRlclRleHQgKz0gJyAmbHQ7JyArIGV4dGVuc2lvbk51bWJlciArICcmZ3Q7JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5ldyBlbXBsb3llZSBvciBubyBuYW1lIHlldFxuICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9DcmVhdGVOZXdFeHRlbnNpb247XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgbWFpbiBoZWFkZXIgY29udGVudFxuICAgICAgICAkKCdoMSAuY29udGVudCcpLmh0bWwoaGVhZGVyVGV4dCk7XG4gICAgfVxufTtcblxuXG4vKipcbiAqIERlZmluZSBhIGN1c3RvbSBydWxlIGZvciBqUXVlcnkgZm9ybSB2YWxpZGF0aW9uIG5hbWVkICdleHRlbnNpb25SdWxlJy5cbiAqIFRoZSBydWxlIGNoZWNrcyBpZiBhIGZvcndhcmRpbmcgbnVtYmVyIGlzIHNlbGVjdGVkIGJ1dCB0aGUgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVGhlIHZhbGlkYXRpb24gcmVzdWx0LiBJZiBmb3J3YXJkaW5nIGlzIHNldCBhbmQgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LCBpdCByZXR1cm5zIGZhbHNlIChpbnZhbGlkKS4gT3RoZXJ3aXNlLCBpdCByZXR1cm5zIHRydWUgKHZhbGlkKS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuc2lvblJ1bGUgPSAoKSA9PiB7XG4gICAgLy8gR2V0IHJpbmcgbGVuZ3RoIGFuZCBmb3J3YXJkaW5nIG51bWJlciBmcm9tIHRoZSBmb3JtXG4gICAgY29uc3QgZndkUmluZ0xlbmd0aCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKTtcbiAgICBjb25zdCBmd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuXG4gICAgLy8gSWYgZm9yd2FyZGluZyBudW1iZXIgaXMgc2V0IGFuZCByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQsIHJldHVybiBmYWxzZSAoaW52YWxpZClcbiAgICBpZiAoZndkRm9yd2FyZGluZy5sZW5ndGggPiAwXG4gICAgICAgICYmIChcbiAgICAgICAgICAgIGZ3ZFJpbmdMZW5ndGggPT09IDBcbiAgICAgICAgICAgIHx8XG4gICAgICAgICAgICBmd2RSaW5nTGVuZ3RoID09PSAnJ1xuICAgICAgICApKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIHJldHVybiB0cnVlICh2YWxpZClcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBudW1iZXIgaXMgdGFrZW4gYnkgYW5vdGhlciBhY2NvdW50XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgcGFyYW1ldGVyIGhhcyB0aGUgJ2hpZGRlbicgY2xhc3MsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cblxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnBhc3N3b3JkU3RyZW5ndGggPSAoKSA9PiB7XG4gICAgLy8gQ2hlY2sgaWYgcGFzc3dvcmQgd2lkZ2V0IGV4aXN0cyBhbmQgcGFzc3dvcmQgbWVldHMgbWluaW11bSBzY29yZVxuICAgIGlmIChleHRlbnNpb24ucGFzc3dvcmRXaWRnZXQpIHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBQYXNzd29yZFdpZGdldC5nZXRTdGF0ZShleHRlbnNpb24ucGFzc3dvcmRXaWRnZXQpO1xuICAgICAgICByZXR1cm4gc3RhdGUgJiYgc3RhdGUuc2NvcmUgPj0gMzA7IC8vIE1pbmltdW0gc2NvcmUgZm9yIGV4dGVuc2lvbnNcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7IC8vIFBhc3MgdmFsaWRhdGlvbiBpZiB3aWRnZXQgbm90IGluaXRpYWxpemVkXG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIEVtcGxveWVlIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbi5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==