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
 InputMaskPatterns, avatar, ExtensionModifyStatusMonitor, ClipboardJS, PasswordWidget, UserMessage, ACLHelper */

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

  /**
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $number: null,
  $sip_secret: null,
  $mobile_number: null,
  $fwd_forwarding: null,
  $fwd_forwardingonbusy: null,
  $fwd_forwardingonunavailable: null,
  $email: null,
  $user_username: null,

  /**
   * Password widget instance.
   * @type {Object}
   */
  passwordWidget: null,

  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * jQuery object for the tabular menu.
   * @type {jQuery}
   */
  $tabMenuItems: null,

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
    // Resolve jQuery wrappers here — at module-load time jQuery may
    // not yet be defined (Sentry MIKOPBX-MG9 pattern).
    extension.$number = $('#number');
    extension.$sip_secret = $('#sip_secret');
    extension.$mobile_number = $('#mobile_number');
    extension.$fwd_forwarding = $('#fwd_forwarding');
    extension.$fwd_forwardingonbusy = $('#fwd_forwardingonbusy');
    extension.$fwd_forwardingonunavailable = $('#fwd_forwardingonunavailable');
    extension.$email = $('#user_email');
    extension.$user_username = $('#user_username');
    extension.$formObj = $('#extensions-form');
    extension.$tabMenuItems = $('#extensions-menu .item'); // Default values will be set after REST API data is loaded
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
    } // Apply ACL permissions to UI elements


    extension.applyACLPermissions(); // Load extension data via REST API

    extension.loadExtensionData();
  },

  /**
   * Apply ACL permissions to UI elements
   * Shows/hides buttons and form elements based on user permissions
   */
  applyACLPermissions: function applyACLPermissions() {
    // Check if ACL Helper is available
    if (typeof ACLHelper === 'undefined') {
      console.warn('ACLHelper is not available, skipping ACL checks');
      return;
    } // Apply permissions using ACLHelper


    ACLHelper.applyPermissions({
      save: {
        show: '#submitbutton, #dropdownSubmit',
        enable: '#extensions-form'
      },
      "delete": {
        show: '.delete-button, .two-steps-delete'
      }
    }); // Additional checks for specific actions

    if (!ACLHelper.canSave()) {
      // Disable form if user cannot save
      $('#extensions-form input, #extensions-form select, #extensions-form textarea').prop('readonly', true).addClass('disabled'); // Disable password widget

      if (extension.passwordWidget) {
        extension.passwordWidget.disable();
      } // Show info message


      var infoMessage = globalTranslate.ex_NoPermissionToModify || 'You do not have permission to modify extensions';
      UserMessage.showInformation(infoMessage);
    }
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

    ExtensionsAPI.checkAvailability(extension.defaultMobileNumber, newMobileNumber, 'mobile-number', userId); // Refill the mobile dialstring only when it was left at its default (equal to the old mobile number)
    // or empty. A user-defined dial string override must survive a mobile number change (issue #1081).

    var currentDialstring = extension.$formObj.form('get value', 'mobile_dialstring');

    if (currentDialstring === extension.defaultMobileNumber || currentDialstring.length === 0) {
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

  /**
   * Initializes the input masks for the extension number and mobile number fields.
   *
   * The extension number mask length is driven by the API: it uses
   * `extension.extensionsLength` (populated from the server, no JavaScript default)
   * to build a `9{2,N}` digit mask, applied only when N is between 2 and 10.
   * Its `oncomplete` handler is debounced with a 500ms setTimeout (clearing any
   * pending timer) before invoking `cbOnCompleteNumber()`.
   *
   * Also configures the mobile number masks from `InputMaskPatterns`, a paste
   * handler, and a `val.override` event handler that temporarily removes the
   * mask so a value can be set programmatically (used by tests and automation).
   */
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
    // Destroy existing forwarding dropdown instances before re-initialization
    // This ensures proper re-creation when form data is reloaded (e.g., after save)
    var forwardingFields = ['fwd_forwarding', 'fwd_forwardingonbusy', 'fwd_forwardingonunavailable'];
    forwardingFields.forEach(function (fieldName) {
      if (ExtensionSelector.instances.has(fieldName)) {
        ExtensionSelector.destroy(fieldName);
        var $dropdown = $("#".concat(fieldName, "-dropdown"));

        if ($dropdown.length) {
          $dropdown.remove();
        }
      }
    }); // Extension dropdowns with current extension exclusion - V5.0 specialized class

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
      var $dropdown = $("#".concat(fieldName, "-dropdown"));
      var currentText = $dropdown.find('.text').not('.default').html() || ''; // Destroy existing instance first

      ExtensionSelector.destroy(fieldName); // Remove old dropdown DOM element

      $dropdown.remove(); // Create new data object with current value for reinitializing

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJHNpcF9zZWNyZXQiLCIkbW9iaWxlX251bWJlciIsIiRmd2RfZm9yd2FyZGluZyIsIiRmd2RfZm9yd2FyZGluZ29uYnVzeSIsIiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCIkZW1haWwiLCIkdXNlcl91c2VybmFtZSIsInBhc3N3b3JkV2lkZ2V0IiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsImV4X1ZhbGlkYXRlUGFzc3dvcmRUb29XZWFrIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiJCIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImFjY29yZGlvbiIsInBvcHVwIiwib24iLCJhdHRyIiwiaW5pdGlhbGl6ZUZvcm0iLCJjdXJyZW50TnVtYmVyIiwiaW5wdXRtYXNrIiwidmFsIiwidXBkYXRlUGFnZUhlYWRlciIsImN1cnJlbnRVc2VybmFtZSIsIkV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIiwiZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJhcHBseUFDTFBlcm1pc3Npb25zIiwibG9hZEV4dGVuc2lvbkRhdGEiLCJBQ0xIZWxwZXIiLCJjb25zb2xlIiwid2FybiIsImFwcGx5UGVybWlzc2lvbnMiLCJzYXZlIiwic2hvdyIsImVuYWJsZSIsImNhblNhdmUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJkaXNhYmxlIiwiaW5mb01lc3NhZ2UiLCJleF9Ob1Blcm1pc3Npb25Ub01vZGlmeSIsIlVzZXJNZXNzYWdlIiwic2hvd0luZm9ybWF0aW9uIiwiY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlIiwicGFzdGVkVmFsdWUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJuZXdOdW1iZXIiLCJ1c2VySWQiLCJmb3JtIiwiRXh0ZW5zaW9uc0FQSSIsImNoZWNrQXZhaWxhYmlsaXR5IiwiY2JPbkNvbXBsZXRlRW1haWwiLCJuZXdFbWFpbCIsIlVzZXJzQVBJIiwiY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyIiwibmV3TW9iaWxlTnVtYmVyIiwiY3VycmVudERpYWxzdHJpbmciLCJsZW5ndGgiLCJ1c2VyTmFtZSIsImN1cnJlbnRGd2RGb3J3YXJkaW5nIiwiY3VycmVudEZ3ZE9uQnVzeSIsImN1cnJlbnRGd2RPblVuYXZhaWxhYmxlIiwiRXh0ZW5zaW9uU2VsZWN0b3IiLCJzZXRWYWx1ZSIsImNiT25DbGVhcmVkTW9iaWxlTnVtYmVyIiwiY2xlYXIiLCJpbml0aWFsaXplSW5wdXRNYXNrcyIsInRpbWVvdXROdW1iZXJJZCIsImV4dGVuc2lvbnNMZW5ndGgiLCJwYXJzZUludCIsIm1hc2siLCJwbGFjZWhvbGRlciIsIm9uY29tcGxldGUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwib25jbGVhcmVkIiwic2hvd01hc2tPbkhvdmVyIiwibWF0Y2giLCJyZXBsYWNlIiwibGlzdCIsImxpc3RLZXkiLCJvcmlnaW5hbFZhbCIsImZuIiwib2ZmIiwiJHRoaXMiLCJhcmdzIiwiYXJndW1lbnRzIiwibmV3VmFsdWUiLCJkYXRhIiwiYXBwbHkiLCJ0cmlnZ2VyIiwiZSIsInByZXZlbnREZWZhdWx0IiwicGFzdGVkRGF0YSIsIm9yaWdpbmFsRXZlbnQiLCJjbGlwYm9hcmREYXRhIiwiZ2V0RGF0YSIsIndpbmRvdyIsInByb2Nlc3NlZERhdGEiLCJjaGFyQXQiLCJzbGljZSIsImlucHV0Iiwic3RhcnQiLCJzZWxlY3Rpb25TdGFydCIsImVuZCIsInNlbGVjdGlvbkVuZCIsImN1cnJlbnRWYWx1ZSIsInN1YnN0cmluZyIsInRpbWVvdXRFbWFpbElkIiwiZm9jdXNvdXQiLCJwaG9uZSIsInRhcmdldCIsImdlbmVyYXRlTmV3U2lwUGFzc3dvcmQiLCIkZ2VuZXJhdGVCdG4iLCJjbG9zZXN0IiwiZmluZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImRpcnJ0eSIsInN1Ym1pdE1vZGUiLCJ1c2VyX2lkIiwiY2JBZnRlclNlbmRGb3JtIiwicmVzcG9uc2UiLCJ1cGRhdGVQaG9uZVJlcHJlc2VudCIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiRm9ybSIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIkVtcGxveWVlc0FQSSIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiYXBpSWQiLCJoaWRlIiwiZ2V0UmVjb3JkIiwiX2lzTmV3IiwicG9wdWxhdGVGb3JtV2l0aERhdGEiLCJhdmF0YXIiLCJzaG93RXJyb3IiLCJlcnJvciIsInVybFBhcnRzIiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiZXh0ZW5zaW9uc19sZW5ndGgiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImFmdGVyUG9wdWxhdGUiLCJmb3JtRGF0YSIsImluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhIiwidGV4dCIsInNldEF2YXRhclVybCIsInVzZXJfYXZhdGFyIiwiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImluaXRpYWxpemVQYXNzd29yZFdpZGdldCIsImZvcndhcmRpbmdGaWVsZHMiLCJmb3JFYWNoIiwiZmllbGROYW1lIiwiaW5zdGFuY2VzIiwiaGFzIiwiZGVzdHJveSIsIiRkcm9wZG93biIsInJlbW92ZSIsImluaXQiLCJleGNsdWRlRXh0ZW5zaW9ucyIsImluY2x1ZGVFbXB0eSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwiZXhfU2VsZWN0TmV0d29ya0ZpbHRlciIsImNhY2hlIiwibmV3RXh0ZW5zaW9uIiwidXBkYXRlRm9yd2FyZGluZ0Ryb3Bkb3duc0V4Y2x1c2lvbiIsImluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duIiwiaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duIiwiY3VycmVudFRleHQiLCJub3QiLCJodG1sIiwicmVmcmVzaERhdGEiLCJpc05ld0V4dGVuc2lvbiIsImlkIiwid2lkZ2V0IiwiUGFzc3dvcmRXaWRnZXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsImluY2x1ZGVTcGVjaWFsIiwib25HZW5lcmF0ZSIsInBhc3N3b3JkIiwiZGF0YUNoYW5nZWQiLCJvblZhbGlkYXRlIiwiaXNWYWxpZCIsInNjb3JlIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImVtcGxveWVlTmFtZSIsImV4dGVuc2lvbk51bWJlciIsImhlYWRlclRleHQiLCJ0cmltIiwiZXhfQ3JlYXRlTmV3RXh0ZW5zaW9uIiwiZXh0ZW5zaW9uUnVsZSIsImZ3ZFJpbmdMZW5ndGgiLCJmd2RGb3J3YXJkaW5nIiwiZXhpc3RSdWxlIiwidmFsdWUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsInBhc3N3b3JkU3RyZW5ndGgiLCJzdGF0ZSIsImdldFN0YXRlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsU0FBUyxHQUFHO0FBQ2RDLEVBQUFBLFlBQVksRUFBRSxFQURBO0FBRWRDLEVBQUFBLGFBQWEsRUFBRSxFQUZEO0FBR2RDLEVBQUFBLG1CQUFtQixFQUFFLEVBSFA7O0FBSWQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLElBUks7QUFTZEMsRUFBQUEsV0FBVyxFQUFFLElBVEM7QUFVZEMsRUFBQUEsY0FBYyxFQUFFLElBVkY7QUFXZEMsRUFBQUEsZUFBZSxFQUFFLElBWEg7QUFZ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ZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnNBUEksIEVtcGxveWVlc0FQSSwgRm9ybSxcbiBJbnB1dE1hc2tQYXR0ZXJucywgYXZhdGFyLCBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yLCBDbGlwYm9hcmRKUywgUGFzc3dvcmRXaWRnZXQsIFVzZXJNZXNzYWdlLCBBQ0xIZWxwZXIgKi9cblxuXG4vKipcbiAqIFRoZSBleHRlbnNpb24gb2JqZWN0LlxuICogTWFuYWdlcyB0aGUgb3BlcmF0aW9ucyBhbmQgYmVoYXZpb3JzIG9mIHRoZSBleHRlbnNpb24gZWRpdCBmb3JtXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25cbiAqL1xuY29uc3QgZXh0ZW5zaW9uID0ge1xuICAgIGRlZmF1bHRFbWFpbDogJycsXG4gICAgZGVmYXVsdE51bWJlcjogJycsXG4gICAgZGVmYXVsdE1vYmlsZU51bWJlcjogJycsXG4gICAgLyoqXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG51bWJlcjogbnVsbCxcbiAgICAkc2lwX3NlY3JldDogbnVsbCxcbiAgICAkbW9iaWxlX251bWJlcjogbnVsbCxcbiAgICAkZndkX2ZvcndhcmRpbmc6IG51bGwsXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb25idXN5OiBudWxsLFxuICAgICRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IG51bGwsXG4gICAgJGVtYWlsOiBudWxsLFxuICAgICR1c2VyX3VzZXJuYW1lOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogUGFzc3dvcmQgd2lkZ2V0IGluc3RhbmNlLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgcGFzc3dvcmRXaWRnZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYnVsYXIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51SXRlbXM6IG51bGwsXG5cblxuICAgIC8qKlxuICAgICAqIFN0cmluZyBmb3IgdGhlIGZvcndhcmRpbmcgc2VsZWN0LlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZm9yd2FyZGluZ1NlbGVjdDogJyNleHRlbnNpb25zLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBudW1iZXI6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdudW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW251bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBtb2JpbGVfbnVtYmVyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWFzaycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcl9lbWFpbDoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl9lbWFpbCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX3VzZXJuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl91c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzaXBfc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlU2VjcmV0V2VhayxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3Bhc3N3b3JkU3RyZW5ndGgnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVBhc3N3b3JkVG9vV2Vha1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9yaW5nbGVuZ3RoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuICAgICAgICAgICAgZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb24gZm9ybSBhbmQgaXRzIGludGVyYWN0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBSZXNvbHZlIGpRdWVyeSB3cmFwcGVycyBoZXJlIOKAlCBhdCBtb2R1bGUtbG9hZCB0aW1lIGpRdWVyeSBtYXlcbiAgICAgICAgLy8gbm90IHlldCBiZSBkZWZpbmVkIChTZW50cnkgTUlLT1BCWC1NRzkgcGF0dGVybikuXG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyID0gJCgnI251bWJlcicpO1xuICAgICAgICBleHRlbnNpb24uJHNpcF9zZWNyZXQgPSAkKCcjc2lwX3NlY3JldCcpO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIgPSAkKCcjbW9iaWxlX251bWJlcicpO1xuICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nID0gJCgnI2Z3ZF9mb3J3YXJkaW5nJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3kgPSAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUgPSAkKCcjZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwgPSAkKCcjdXNlcl9lbWFpbCcpO1xuICAgICAgICBleHRlbnNpb24uJHVzZXJfdXNlcm5hbWUgPSAkKCcjdXNlcl91c2VybmFtZScpO1xuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmogPSAkKCcjZXh0ZW5zaW9ucy1mb3JtJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kdGFiTWVudUl0ZW1zID0gJCgnI2V4dGVuc2lvbnMtbWVudSAuaXRlbScpO1xuXG4gICAgICAgIC8vIERlZmF1bHQgdmFsdWVzIHdpbGwgYmUgc2V0IGFmdGVyIFJFU1QgQVBJIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBlbXB0eSB2YWx1ZXMgc2luY2UgZm9ybXMgYXJlIGVtcHR5IHVudGlsIEFQSSByZXNwb25kc1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gJyc7XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gJyc7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgbWVudSBpdGVtcywgYWNjb3JkaW9ucywgYW5kIGRyb3Bkb3duIG1lbnVzXG4gICAgICAgIGV4dGVuc2lvbi4kdGFiTWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG4gICAgICAgICQoJyNleHRlbnNpb25zLWZvcm0gLnVpLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGZvciBxdWVzdGlvbiBpY29ucyBhbmQgYnV0dG9uc1xuICAgICAgICAkKFwiaS5xdWVzdGlvblwiKS5wb3B1cCgpO1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gUHJldmVudCBicm93c2VyIHBhc3N3b3JkIG1hbmFnZXIgZm9yIGdlbmVyYXRlZCBwYXNzd29yZHNcbiAgICAgICAgZXh0ZW5zaW9uLiRzaXBfc2VjcmV0Lm9uKCdmb2N1cycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdhdXRvY29tcGxldGUnLCAnbmV3LXBhc3N3b3JkJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGV4dGVuc2lvbiBmb3JtXG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBoYW5kbGVyIGZvciB1c2VybmFtZSBjaGFuZ2UgdG8gdXBkYXRlIHBhZ2UgdGl0bGVcbiAgICAgICAgZXh0ZW5zaW9uLiR1c2VyX3VzZXJuYW1lLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzayA/IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpIDogZXh0ZW5zaW9uLiRudW1iZXIudmFsKCk7XG4gICAgICAgICAgICBleHRlbnNpb24udXBkYXRlUGFnZUhlYWRlcigkKHRoaXMpLnZhbCgpLCBjdXJyZW50TnVtYmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWxzbyB1cGRhdGUgaGVhZGVyIHdoZW4gZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzXG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFVzZXJuYW1lID0gZXh0ZW5zaW9uLiR1c2VyX3VzZXJuYW1lLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudE51bWJlciA9ICQodGhpcykuaW5wdXRtYXNrID8gJCh0aGlzKS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKSA6ICQodGhpcykudmFsKCk7XG4gICAgICAgICAgICBleHRlbnNpb24udXBkYXRlUGFnZUhlYWRlcihjdXJyZW50VXNlcm5hbWUsIGN1cnJlbnROdW1iZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBhZHZhbmNlZCBzZXR0aW5ncyB1c2luZyB1bmlmaWVkIHN5c3RlbVxuICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHRlbnNpb25Ub29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIG9sZCBuYW1lIGlmIG5ldyBjbGFzcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBleHRlbnNpb25Ub29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBseSBBQ0wgcGVybWlzc2lvbnMgdG8gVUkgZWxlbWVudHNcbiAgICAgICAgZXh0ZW5zaW9uLmFwcGx5QUNMUGVybWlzc2lvbnMoKTtcblxuICAgICAgICAvLyBMb2FkIGV4dGVuc2lvbiBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICBleHRlbnNpb24ubG9hZEV4dGVuc2lvbkRhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgQUNMIHBlcm1pc3Npb25zIHRvIFVJIGVsZW1lbnRzXG4gICAgICogU2hvd3MvaGlkZXMgYnV0dG9ucyBhbmQgZm9ybSBlbGVtZW50cyBiYXNlZCBvbiB1c2VyIHBlcm1pc3Npb25zXG4gICAgICovXG4gICAgYXBwbHlBQ0xQZXJtaXNzaW9ucygpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgQUNMIEhlbHBlciBpcyBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBBQ0xIZWxwZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0FDTEhlbHBlciBpcyBub3QgYXZhaWxhYmxlLCBza2lwcGluZyBBQ0wgY2hlY2tzJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBseSBwZXJtaXNzaW9ucyB1c2luZyBBQ0xIZWxwZXJcbiAgICAgICAgQUNMSGVscGVyLmFwcGx5UGVybWlzc2lvbnMoe1xuICAgICAgICAgICAgc2F2ZToge1xuICAgICAgICAgICAgICAgIHNob3c6ICcjc3VibWl0YnV0dG9uLCAjZHJvcGRvd25TdWJtaXQnLFxuICAgICAgICAgICAgICAgIGVuYWJsZTogJyNleHRlbnNpb25zLWZvcm0nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVsZXRlOiB7XG4gICAgICAgICAgICAgICAgc2hvdzogJy5kZWxldGUtYnV0dG9uLCAudHdvLXN0ZXBzLWRlbGV0ZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkaXRpb25hbCBjaGVja3MgZm9yIHNwZWNpZmljIGFjdGlvbnNcbiAgICAgICAgaWYgKCFBQ0xIZWxwZXIuY2FuU2F2ZSgpKSB7XG4gICAgICAgICAgICAvLyBEaXNhYmxlIGZvcm0gaWYgdXNlciBjYW5ub3Qgc2F2ZVxuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnMtZm9ybSBpbnB1dCwgI2V4dGVuc2lvbnMtZm9ybSBzZWxlY3QsICNleHRlbnNpb25zLWZvcm0gdGV4dGFyZWEnKVxuICAgICAgICAgICAgICAgIC5wcm9wKCdyZWFkb25seScsIHRydWUpXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICAvLyBEaXNhYmxlIHBhc3N3b3JkIHdpZGdldFxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldC5kaXNhYmxlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNob3cgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCBpbmZvTWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5leF9Ob1Blcm1pc3Npb25Ub01vZGlmeSB8fCAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gbW9kaWZ5IGV4dGVuc2lvbnMnO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKGluZm9NZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgcGFzdGUgbW9iaWxlIG51bWJlciBmcm9tIGNsaXBib2FyZFxuICAgICAqL1xuICAgIGNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIGFmdGVyIGEgcGhvbmUgbnVtYmVyIGhhcyBiZWVuIGVudGVyZWQgY29tcGxldGVseS5cbiAgICAgKiBJdCBzZXJ2ZXMgdG8gY2hlY2sgaWYgdGhlcmUgYXJlIGFueSBjb25mbGljdHMgd2l0aCBleGlzdGluZyBwaG9uZSBudW1iZXJzLlxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZU51bWJlcigpIHtcbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGFmdGVyIHJlbW92aW5nIGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld051bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSB1c2VyIElEIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cbiAgICAgICAgLy8gQ2FsbCB0aGUgYGNoZWNrQXZhaWxhYmlsaXR5YCBmdW5jdGlvbiBvbiBgRXh0ZW5zaW9uc2Agb2JqZWN0XG4gICAgICAgIC8vIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGlzIGFscmVhZHkgaW4gdXNlLlxuICAgICAgICAvLyBQYXJhbWV0ZXJzOiBkZWZhdWx0IG51bWJlciwgbmV3IG51bWJlciwgY2xhc3MgbmFtZSBvZiBlcnJvciBtZXNzYWdlIChudW1iZXIpLCB1c2VyIGlkXG4gICAgICAgIEV4dGVuc2lvbnNBUEkuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIsIG5ld051bWJlciwgJ251bWJlcicsIHVzZXJJZCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJdCBpcyBleGVjdXRlZCBvbmNlIGFuIGVtYWlsIGFkZHJlc3MgaGFzIGJlZW4gY29tcGxldGVseSBlbnRlcmVkLlxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUVtYWlsKCkge1xuXG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSBlbnRlcmVkIHBob25lIG51bWJlciBhZnRlciByZW1vdmluZyBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdFbWFpbCA9IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBDYWxsIHRoZSBgY2hlY2tBdmFpbGFiaWxpdHlgIGZ1bmN0aW9uIG9uIGBVc2Vyc0FQSWAgb2JqZWN0XG4gICAgICAgIC8vIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVudGVyZWQgZW1haWwgaXMgYWxyZWFkeSBpbiB1c2UuXG4gICAgICAgIC8vIFBhcmFtZXRlcnM6IGRlZmF1bHQgZW1haWwsIG5ldyBlbWFpbCwgY2xhc3MgbmFtZSBvZiBlcnJvciBtZXNzYWdlIChlbWFpbCksIHVzZXIgaWRcbiAgICAgICAgVXNlcnNBUEkuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCwgbmV3RW1haWwsJ2VtYWlsJywgdXNlcklkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWN0aXZhdGVkIHdoZW4gZW50ZXJpbmcgYSBtb2JpbGUgcGhvbmUgbnVtYmVyIGluIHRoZSBlbXBsb3llZSdzIHByb2ZpbGUuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyKCkge1xuICAgICAgICAvLyBHZXQgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIHdpdGhvdXQgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIEdldCB1c2VyIElEIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cbiAgICAgICAgLy8gRHluYW1pYyBjaGVjayB0byBzZWUgaWYgdGhlIHNlbGVjdGVkIG1vYmlsZSBudW1iZXIgaXMgYXZhaWxhYmxlXG4gICAgICAgIEV4dGVuc2lvbnNBUEkuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIsIG5ld01vYmlsZU51bWJlciwgJ21vYmlsZS1udW1iZXInLCB1c2VySWQpO1xuXG4gICAgICAgIC8vIFJlZmlsbCB0aGUgbW9iaWxlIGRpYWxzdHJpbmcgb25seSB3aGVuIGl0IHdhcyBsZWZ0IGF0IGl0cyBkZWZhdWx0IChlcXVhbCB0byB0aGUgb2xkIG1vYmlsZSBudW1iZXIpXG4gICAgICAgIC8vIG9yIGVtcHR5LiBBIHVzZXItZGVmaW5lZCBkaWFsIHN0cmluZyBvdmVycmlkZSBtdXN0IHN1cnZpdmUgYSBtb2JpbGUgbnVtYmVyIGNoYW5nZSAoaXNzdWUgIzEwODEpLlxuICAgICAgICBjb25zdCBjdXJyZW50RGlhbHN0cmluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnKTtcbiAgICAgICAgaWYgKGN1cnJlbnREaWFsc3RyaW5nID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlclxuICAgICAgICAgICAgfHwgY3VycmVudERpYWxzdHJpbmcubGVuZ3RoID09PSAwXG4gICAgICAgICkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9iaWxlIG51bWJlciBoYXMgY2hhbmdlZFxuICAgICAgICBpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3MgdXNlcm5hbWUgZnJvbSB0aGUgZm9ybVxuICAgICAgICAgICAgY29uc3QgdXNlck5hbWUgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfdXNlcm5hbWUnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcndhcmRpbmcgZmllbGRzIHRoYXQgbWF0Y2ggdGhlIG9sZCBtb2JpbGUgbnVtYmVyXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPbkJ1c3kgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jyk7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmd2RfZm9yd2FyZGluZyBpZiBpdCBtYXRjaGVzIG9sZCBtb2JpbGUgbnVtYmVyIChpbmNsdWRpbmcgZW1wdHkpXG4gICAgICAgICAgICBpZiAoY3VycmVudEZ3ZEZvcndhcmRpbmcgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgcmluZyBsZW5ndGggaWYgZW1wdHlcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICAgICAgICAgICB8fCBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk9PT1cIjBcIikge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgNDUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3Iuc2V0VmFsdWUoJ2Z3ZF9mb3J3YXJkaW5nJywgbmV3TW9iaWxlTnVtYmVyLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZ3ZF9mb3J3YXJkaW5nb25idXN5IGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkT25CdXN5ID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3Iuc2V0VmFsdWUoJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgbmV3TW9iaWxlTnVtYmVyLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSBpZiBpdCBtYXRjaGVzIG9sZCBtb2JpbGUgbnVtYmVyIChpbmNsdWRpbmcgZW1wdHkpXG4gICAgICAgICAgICBpZiAoY3VycmVudEZ3ZE9uVW5hdmFpbGFibGUgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5zZXRWYWx1ZSgnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgbmV3TW9iaWxlTnVtYmVyLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIGFzIHRoZSBkZWZhdWx0XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gbmV3TW9iaWxlTnVtYmVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgd2hlbiB0aGUgbW9iaWxlIHBob25lIG51bWJlciBpcyBjbGVhcmVkIGluIHRoZSBlbXBsb3llZSBjYXJkLlxuICAgICAqL1xuICAgIGNiT25DbGVhcmVkTW9iaWxlTnVtYmVyKCkge1xuICAgICAgICAvLyBDaGVjayBjdXJyZW50IGZvcndhcmRpbmcgdmFsdWVzIGJlZm9yZSBjbGVhcmluZ1xuICAgICAgICBjb25zdCBjdXJyZW50RndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcbiAgICAgICAgY29uc3QgY3VycmVudEZ3ZE9uQnVzeSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgY29uc3QgY3VycmVudEZ3ZE9uVW5hdmFpbGFibGUgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgdGhlICdtb2JpbGVfZGlhbHN0cmluZycgYW5kICdtb2JpbGVfbnVtYmVyJyBmaWVsZHMgaW4gdGhlIGZvcm1cbiAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsICcnKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfbnVtYmVyJywgJycpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoY3VycmVudEZ3ZEZvcndhcmRpbmcgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBJZiBzbywgY2xlYXIgdGhlICdmd2RfcmluZ2xlbmd0aCcgZmllbGQgYW5kIGNsZWFyIGZvcndhcmRpbmcgZHJvcGRvd25cbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCAwKTtcbiAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZndkX2ZvcndhcmRpbmcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiBidXN5IHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGN1cnJlbnRGd2RPbkJ1c3kgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuY2xlYXIoJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdoZW4gdW5hdmFpbGFibGUgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoY3VycmVudEZ3ZE9uVW5hdmFpbGFibGUgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuY2xlYXIoJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgaW5wdXQgbWFza3MgZm9yIHRoZSBleHRlbnNpb24gbnVtYmVyIGFuZCBtb2JpbGUgbnVtYmVyIGZpZWxkcy5cbiAgICAgKlxuICAgICAqIFRoZSBleHRlbnNpb24gbnVtYmVyIG1hc2sgbGVuZ3RoIGlzIGRyaXZlbiBieSB0aGUgQVBJOiBpdCB1c2VzXG4gICAgICogYGV4dGVuc2lvbi5leHRlbnNpb25zTGVuZ3RoYCAocG9wdWxhdGVkIGZyb20gdGhlIHNlcnZlciwgbm8gSmF2YVNjcmlwdCBkZWZhdWx0KVxuICAgICAqIHRvIGJ1aWxkIGEgYDl7MixOfWAgZGlnaXQgbWFzaywgYXBwbGllZCBvbmx5IHdoZW4gTiBpcyBiZXR3ZWVuIDIgYW5kIDEwLlxuICAgICAqIEl0cyBgb25jb21wbGV0ZWAgaGFuZGxlciBpcyBkZWJvdW5jZWQgd2l0aCBhIDUwMG1zIHNldFRpbWVvdXQgKGNsZWFyaW5nIGFueVxuICAgICAqIHBlbmRpbmcgdGltZXIpIGJlZm9yZSBpbnZva2luZyBgY2JPbkNvbXBsZXRlTnVtYmVyKClgLlxuICAgICAqXG4gICAgICogQWxzbyBjb25maWd1cmVzIHRoZSBtb2JpbGUgbnVtYmVyIG1hc2tzIGZyb20gYElucHV0TWFza1BhdHRlcm5zYCwgYSBwYXN0ZVxuICAgICAqIGhhbmRsZXIsIGFuZCBhIGB2YWwub3ZlcnJpZGVgIGV2ZW50IGhhbmRsZXIgdGhhdCB0ZW1wb3JhcmlseSByZW1vdmVzIHRoZVxuICAgICAqIG1hc2sgc28gYSB2YWx1ZSBjYW4gYmUgc2V0IHByb2dyYW1tYXRpY2FsbHkgKHVzZWQgYnkgdGVzdHMgYW5kIGF1dG9tYXRpb24pLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dE1hc2tzKCl7XG4gICAgICAgIC8vIFNldCB1cCBudW1iZXIgaW5wdXQgbWFzayB3aXRoIGNvcnJlY3QgbGVuZ3RoIGZyb20gQVBJXG4gICAgICAgIGxldCB0aW1lb3V0TnVtYmVySWQ7XG5cbiAgICAgICAgLy8gQWx3YXlzIGluaXRpYWxpemUgbWFzayBiYXNlZCBvbiBleHRlbnNpb25zX2xlbmd0aCBmcm9tIEFQSVxuICAgICAgICAvLyBObyBkZWZhdWx0cyBpbiBKYXZhU2NyaXB0IC0gdmFsdWUgbXVzdCBjb21lIGZyb20gQVBJXG4gICAgICAgIGlmIChleHRlbnNpb24uZXh0ZW5zaW9uc0xlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uc0xlbmd0aCA9IHBhcnNlSW50KGV4dGVuc2lvbi5leHRlbnNpb25zTGVuZ3RoLCAxMCk7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uc0xlbmd0aCA+PSAyICYmIGV4dGVuc2lvbnNMZW5ndGggPD0gMTApIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIG1hc2sgd2l0aCBjb3JyZWN0IGxlbmd0aCBhbmQgb25jb21wbGV0ZSBoYW5kbGVyXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKHtcbiAgICAgICAgICAgICAgICAgICAgbWFzazogYDl7Miwke2V4dGVuc2lvbnNMZW5ndGh9fWAsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnXycsXG4gICAgICAgICAgICAgICAgICAgIG9uY29tcGxldGU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBwcmV2aW91cyB0aW1lciwgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGltZW91dE51bWJlcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXROdW1iZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0TnVtYmVySWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlTnVtYmVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vbigncGFzdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrcyBmb3IgdGhlIG1vYmlsZSBudW1iZXIgaW5wdXRcbiAgICAgICAgY29uc3QgbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3I6ICdbMC05XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uY2xlYXJlZDogZXh0ZW5zaW9uLmNiT25DbGVhcmVkTW9iaWxlTnVtYmVyLFxuICAgICAgICAgICAgICAgIG9uY29tcGxldGU6IGV4dGVuc2lvbi5jYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIsXG4gICAgICAgICAgICAgICAgc2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgb25CZWZvcmVQYXN0ZSB0byBwcmV2ZW50IGNvbmZsaWN0cyB3aXRoIG91ciBjdXN0b20gaGFuZGxlclxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgbGlzdDogbWFza0xpc3QsXG4gICAgICAgICAgICBsaXN0S2V5OiAnbWFzaycsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBoYW5kbGVyIGZvciBwcm9ncmFtbWF0aWMgdmFsdWUgY2hhbmdlcyAoZm9yIHRlc3RzIGFuZCBhdXRvbWF0aW9uKVxuICAgICAgICBjb25zdCBvcmlnaW5hbFZhbCA9ICQuZm4udmFsO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIub2ZmKCd2YWwub3ZlcnJpZGUnKS5vbigndmFsLm92ZXJyaWRlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICAgICAgICAvLyBJZiBzZXR0aW5nIGEgdmFsdWUgcHJvZ3JhbW1hdGljYWxseVxuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMCAmJiB0eXBlb2YgYXJnc1swXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGFyZ3NbMF07XG5cbiAgICAgICAgICAgICAgICAvLyBUZW1wb3JhcmlseSByZW1vdmUgbWFza1xuICAgICAgICAgICAgICAgIGlmICgkdGhpcy5kYXRhKCdpbnB1dG1hc2snKSkge1xuICAgICAgICAgICAgICAgICAgICAkdGhpcy5pbnB1dG1hc2soJ3JlbW92ZScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgdmFsdWVcbiAgICAgICAgICAgICAgICBvcmlnaW5hbFZhbC5hcHBseSh0aGlzLCBhcmdzKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlYXBwbHkgbWFzayBhZnRlciBhIHNob3J0IGRlbGF5XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICR0aGlzLnRyaWdnZXIoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgfSwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIub24oJ3Bhc3RlJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpOyAvLyBQcmV2ZW50IGRlZmF1bHQgcGFzdGUgYmVoYXZpb3JcblxuICAgICAgICAgICAgLy8gR2V0IHBhc3RlZCBkYXRhIGZyb20gY2xpcGJvYXJkXG4gICAgICAgICAgICBsZXQgcGFzdGVkRGF0YSA9ICcnO1xuXG4gICAgICAgICAgICAvLyBUcnkgdG8gZ2V0IGRhdGEgZnJvbSBjbGlwYm9hcmQgZXZlbnRcbiAgICAgICAgICAgIGlmIChlLm9yaWdpbmFsRXZlbnQgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUuY2xpcGJvYXJkRGF0YSAmJiBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIERpcmVjdCBjbGlwYm9hcmREYXRhIGFjY2Vzc1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuY2xpcGJvYXJkRGF0YSAmJiB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIElFXG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSWYgd2UgY291bGRuJ3QgZ2V0IGNsaXBib2FyZCBkYXRhLCBkb24ndCBwcm9jZXNzXG4gICAgICAgICAgICBpZiAoIXBhc3RlZERhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFByb2Nlc3MgdGhlIHBhc3RlZCBkYXRhXG4gICAgICAgICAgICBsZXQgcHJvY2Vzc2VkRGF0YTtcbiAgICAgICAgICAgIGlmIChwYXN0ZWREYXRhLmNoYXJBdCgwKSA9PT0gJysnKSB7XG4gICAgICAgICAgICAgICAgLy8gS2VlcCAnKycgYW5kIHJlbW92ZSBvdGhlciBub24tZGlnaXQgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgIHByb2Nlc3NlZERhdGEgPSAnKycgKyBwYXN0ZWREYXRhLnNsaWNlKDEpLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBhbGwgbm9uLWRpZ2l0IGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICBwcm9jZXNzZWREYXRhID0gcGFzdGVkRGF0YS5yZXBsYWNlKC9cXEQvZywgJycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJbnNlcnQgY2xlYW5lZCBkYXRhIGludG8gdGhlIGlucHV0IGZpZWxkXG4gICAgICAgICAgICBjb25zdCBpbnB1dCA9IHRoaXM7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IGlucHV0LnNlbGVjdGlvblN0YXJ0IHx8IDA7XG4gICAgICAgICAgICBjb25zdCBlbmQgPSBpbnB1dC5zZWxlY3Rpb25FbmQgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICQoaW5wdXQpLnZhbCgpIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBjdXJyZW50VmFsdWUuc3Vic3RyaW5nKDAsIHN0YXJ0KSArIHByb2Nlc3NlZERhdGEgKyBjdXJyZW50VmFsdWUuc3Vic3RyaW5nKGVuZCk7XG5cbiAgICAgICAgICAgIC8vIFRlbXBvcmFyaWx5IHJlbW92ZSBtYXNrLCBzZXQgdmFsdWUsIHRoZW4gcmVhcHBseVxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzayhcInJlbW92ZVwiKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci52YWwobmV3VmFsdWUpO1xuXG4gICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgdGhlIHZhbHVlIGlzIHNldCBiZWZvcmUgcmVhcHBseWluZyBtYXNrXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGlucHV0IGV2ZW50IHRvIHJlYXBwbHkgdGhlIG1hc2tcbiAgICAgICAgICAgICAgICAkKGlucHV0KS50cmlnZ2VyKCdpbnB1dCcpO1xuICAgICAgICAgICAgfSwgMTApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2sgZm9yIHRoZSBlbWFpbCBpbnB1dFxuICAgICAgICBsZXQgdGltZW91dEVtYWlsSWQ7XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcsIHtcbiAgICAgICAgICAgIG9uY29tcGxldGU6ICgpPT57XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodGltZW91dEVtYWlsSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRFbWFpbElkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIHdpdGggYSBkZWxheSBvZiAwLjUgc2Vjb25kc1xuICAgICAgICAgICAgICAgIHRpbWVvdXRFbWFpbElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVFbWFpbCgpO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbC5vbigncGFzdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVFbWFpbCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL0F0dGFjaCBhIGZvY3Vzb3V0IGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBtb2JpbGUgbnVtYmVyIGlucHV0XG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5mb2N1c291dChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgbGV0IHBob25lID0gJChlLnRhcmdldCkudmFsKCkucmVwbGFjZSgvW14wLTldL2csIFwiXCIpO1xuICAgICAgICAgICAgaWYgKHBob25lID09PSAnJykge1xuICAgICAgICAgICAgICAgICQoZS50YXJnZXQpLnZhbCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBuZXcgU0lQIHBhc3N3b3JkLlxuICAgICAqIFVzZXMgdGhlIFBhc3N3b3JkV2lkZ2V0IGJ1dHRvbiBsaWtlIGluIEFNSSBtYW5hZ2VyLlxuICAgICAqL1xuICAgIGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSB7XG4gICAgICAgIC8vIFRyaWdnZXIgcGFzc3dvcmQgZ2VuZXJhdGlvbiB0aHJvdWdoIHRoZSB3aWRnZXQgYnV0dG9uIChsaWtlIGluIEFNSSlcbiAgICAgICAgY29uc3QgJGdlbmVyYXRlQnRuID0gZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LmNsb3Nlc3QoJy51aS5pbnB1dCcpLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICBpZiAoJGdlbmVyYXRlQnRuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRnZW5lcmF0ZUJ0bi50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhLm1vYmlsZV9udW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIGZvcm0gY29udHJvbCBmaWVsZHMgdGhhdCBzaG91bGRuJ3QgYmUgc2VudCB0byBzZXJ2ZXJcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLmRpcnJ0eTtcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLnN1Ym1pdE1vZGU7XG4gICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YS51c2VyX2lkOyAvLyBSZW1vdmUgdXNlcl9pZCBmaWVsZCB0byBwcmV2ZW50IHZhbGlkYXRpb24gaXNzdWVzXG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgcmVjb3JkIChjaGVjayBpZiB3ZSBoYXZlIGEgcmVhbCBJRClcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBTdG9yZSB0aGUgY3VycmVudCBleHRlbnNpb24gbnVtYmVyIGFzIHRoZSBkZWZhdWx0IG51bWJlciBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLm51bWJlcikge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gcmVzcG9uc2UuZGF0YS5udW1iZXI7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBwaG9uZSByZXByZXNlbnRhdGlvbiB3aXRoIHRoZSBuZXcgZGVmYXVsdCBudW1iZXJcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lUmVwcmVzZW50KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGUgYW5kIHJlc3BvbnNlLnJlbG9hZCBmcm9tIHNlcnZlclxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5ncyBmb3IgUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBleHRlbnNpb24uJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGV4dGVuc2lvbi52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBleHRlbnNpb24uY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBleHRlbnNpb24uY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gRW1wbG95ZWVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgYXV0b21hdGljIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvblxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgY2hlY2tib3ggdmFsdWVzIGFyZSBzZW50IGFzIHRydWUvZmFsc2UgaW5zdGVhZCBvZiBcIm9uXCIvdW5kZWZpbmVkXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBWNS4wIEFyY2hpdGVjdHVyZTogTG9hZCBleHRlbnNpb24gZGF0YSB2aWEgUkVTVCBBUEkgKHNpbWlsYXIgdG8gSVZSIG1lbnUgcGF0dGVybilcbiAgICAgKi9cbiAgICBsb2FkRXh0ZW5zaW9uRGF0YSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBleHRlbnNpb24uZ2V0UmVjb3JkSWQoKTtcblxuICAgICAgICAvLyBVc2UgJ25ldycgYXMgSUQgZm9yIG5ldyByZWNvcmRzIHRvIGdldCBkZWZhdWx0IHZhbHVlcyBmcm9tIHNlcnZlclxuICAgICAgICBjb25zdCBhcGlJZCA9IHJlY29yZElkID09PSAnJyA/ICduZXcnIDogcmVjb3JkSWQ7XG5cbiAgICAgICAgLy8gSGlkZSBtb25pdG9yaW5nIGVsZW1lbnRzIGZvciBuZXcgZW1wbG95ZWVzXG4gICAgICAgIGlmIChhcGlJZCA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgICQoJyNzdGF0dXMnKS5oaWRlKCk7IC8vIEhpZGUgc3RhdHVzIGxhYmVsXG4gICAgICAgICAgICAkKCdhW2RhdGEtdGFiPVwic3RhdHVzXCJdJykuaGlkZSgpOyAvLyBIaWRlIG1vbml0b3JpbmcgdGFiXG4gICAgICAgIH1cblxuICAgICAgICBFbXBsb3llZXNBUEkuZ2V0UmVjb3JkKGFwaUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRCAoZm9sbG93aW5nIENhbGxRdWV1ZXMgcGF0dGVybilcbiAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLnBvcHVsYXRlRm9ybVdpdGhEYXRhKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIC8vIFN0b3JlIGRlZmF1bHQgdmFsdWVzIGFmdGVyIGRhdGEgbG9hZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gcmVzcG9uc2UuZGF0YS5udW1iZXIgfHwgJyc7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9IHJlc3BvbnNlLmRhdGEudXNlcl9lbWFpbCB8fCAnJztcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IHJlc3BvbnNlLmRhdGEubW9iaWxlX251bWJlciB8fCAnJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBzdGlsbCBpbml0aWFsaXplIGF2YXRhciBldmVuIGlmIEFQSSBmYWlsc1xuICAgICAgICAgICAgICAgIGlmIChyZWNvcmRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgYXZhdGFyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgZXh0ZW5zaW9uIGRhdGEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMIChsaWtlIElWUiBtZW51KVxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gUkVTVCBBUEkgKFY1LjAgY2xlYW4gZGF0YSBhcmNoaXRlY3R1cmUpXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtV2l0aERhdGEoZGF0YSkge1xuICAgICAgICAvLyBTdG9yZSBleHRlbnNpb25zX2xlbmd0aCBmcm9tIEFQSSBmb3IgdXNlIGluIGluaXRpYWxpemVJbnB1dE1hc2tzXG4gICAgICAgIC8vIFRoaXMgdmFsdWUgTVVTVCBjb21lIGZyb20gQVBJIC0gbm8gZGVmYXVsdHMgaW4gSlNcbiAgICAgICAgZXh0ZW5zaW9uLmV4dGVuc2lvbnNMZW5ndGggPSBkYXRhLmV4dGVuc2lvbnNfbGVuZ3RoO1xuXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoIChzYW1lIGFzIElWUiBtZW51KVxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggVjUuMCBzcGVjaWFsaXplZCBjbGFzc2VzIC0gY29tcGxldGUgYXV0b21hdGlvblxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YShmb3JtRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiBhbnkgVUkgZWxlbWVudHMgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgaWYgKGZvcm1EYXRhLm51bWJlcikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLW51bWJlci1kaXNwbGF5JykudGV4dChmb3JtRGF0YS5udW1iZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGF2YXRhciBjb21wb25lbnQgYWZ0ZXIgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgICAgICAgICAgYXZhdGFyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgYXZhdGFyIFVSTCBkeW5hbWljYWxseSBmcm9tIEFQSSBkYXRhXG4gICAgICAgICAgICAgICAgYXZhdGFyLnNldEF2YXRhclVybChmb3JtRGF0YS51c2VyX2F2YXRhcik7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBtb2RpZnkgc3RhdHVzIG1vbml0b3IgYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIGVtcGxveWVlIG5hbWUgYW5kIGV4dGVuc2lvbiBudW1iZXJcbiAgICAgICAgICAgICAgICBleHRlbnNpb24udXBkYXRlUGFnZUhlYWRlcihmb3JtRGF0YS51c2VyX3VzZXJuYW1lLCBmb3JtRGF0YS5udW1iZXIpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0KGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgaW5wdXQgbWFza3MgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUlucHV0TWFza3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBOT1RFOiBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCkgd2lsbCBiZSBjYWxsZWQgYXV0b21hdGljYWxseSBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KClcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggY2xlYW4gZGF0YSAtIFY1LjAgQXJjaGl0ZWN0dXJlXG4gICAgICogVXNlcyBzcGVjaWFsaXplZCBjbGFzc2VzIHdpdGggY29tcGxldGUgYXV0b21hdGlvbiAobm8gb25DaGFuZ2UgY2FsbGJhY2tzIG5lZWRlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgZm9yd2FyZGluZyBkcm9wZG93biBpbnN0YW5jZXMgYmVmb3JlIHJlLWluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyBwcm9wZXIgcmUtY3JlYXRpb24gd2hlbiBmb3JtIGRhdGEgaXMgcmVsb2FkZWQgKGUuZy4sIGFmdGVyIHNhdmUpXG4gICAgICAgIGNvbnN0IGZvcndhcmRpbmdGaWVsZHMgPSBbJ2Z3ZF9mb3J3YXJkaW5nJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSddO1xuICAgICAgICBmb3J3YXJkaW5nRmllbGRzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIGlmIChFeHRlbnNpb25TZWxlY3Rvci5pbnN0YW5jZXMuaGFzKGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5kZXN0cm95KGZpZWxkTmFtZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRXh0ZW5zaW9uIGRyb3Bkb3ducyB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvbiAtIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZndkX2ZvcndhcmRpbmcnLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZ29uYnVzeScsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJywgXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIEFQSSBkYXRhIC0gVjUuMCBiYXNlIGNsYXNzXG4gICAgICAgIFxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3NpcF9uZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6IGAvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109U0lQYCxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0TmV0d29ya0ZpbHRlcixcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFY1LjAgYXJjaGl0ZWN0dXJlIHdpdGggZW1wdHkgZm9ybSBzaG91bGQgbm90IGhhdmUgSFRNTCBlbnRpdGllcyBpc3N1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXMgLSByZWJ1aWxkIGRyb3Bkb3ducyB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIub2ZmKCdjaGFuZ2UuZHJvcGRvd24nKS5vbignY2hhbmdlLmRyb3Bkb3duJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV3RXh0ZW5zaW9uID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdudW1iZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG5ld0V4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleGNsdXNpb25zIGZvciBmb3J3YXJkaW5nIGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uKG5ld0V4dGVuc2lvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpO1xuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZm9yd2FyZGluZyBkcm9wZG93bnMgd2hlbiBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXNcbiAgICAgKi9cbiAgICB1cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uKG5ld0V4dGVuc2lvbikge1xuICAgICAgICBjb25zdCBmb3J3YXJkaW5nRmllbGRzID0gWydmd2RfZm9yd2FyZGluZycsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnXTtcbiAgICAgICAgXG4gICAgICAgIGZvcndhcmRpbmdGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJChgIyR7ZmllbGROYW1lfWApLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFRleHQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKS5ub3QoJy5kZWZhdWx0JykuaHRtbCgpIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIGluc3RhbmNlIGZpcnN0XG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5kZXN0cm95KGZpZWxkTmFtZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBvbGQgZHJvcGRvd24gRE9NIGVsZW1lbnRcbiAgICAgICAgICAgICRkcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBkYXRhIG9iamVjdCB3aXRoIGN1cnJlbnQgdmFsdWUgZm9yIHJlaW5pdGlhbGl6aW5nXG4gICAgICAgICAgICBjb25zdCByZWZyZXNoRGF0YSA9IHt9O1xuICAgICAgICAgICAgcmVmcmVzaERhdGFbZmllbGROYW1lXSA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgIHJlZnJlc2hEYXRhW2Ake2ZpZWxkTmFtZX1fcmVwcmVzZW50YF0gPSBjdXJyZW50VGV4dDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVpbml0aWFsaXplIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdChmaWVsZE5hbWUsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtuZXdFeHRlbnNpb25dLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiByZWZyZXNoRGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgYWZ0ZXIgZm9ybSBkYXRhIGlzIGxvYWRlZFxuICAgICAqIFRoaXMgZW5zdXJlcyB2YWxpZGF0aW9uIG9ubHkgaGFwcGVucyBhZnRlciBwYXNzd29yZCBpcyBwb3B1bGF0ZWQgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmb3JtRGF0YSAtIFRoZSBmb3JtIGRhdGEgbG9hZGVkIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoZm9ybURhdGEpIHtcbiAgICAgICAgaWYgKCFleHRlbnNpb24uJHNpcF9zZWNyZXQubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIaWRlIGFueSBsZWdhY3kgYnV0dG9ucyBpZiB0aGV5IGV4aXN0XG4gICAgICAgICQoJy5jbGlwYm9hcmQnKS5oaWRlKCk7XG4gICAgICAgICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKS5oaWRlKCk7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgZXh0ZW5zaW9uIChubyBJRCkgb3IgZXhpc3Rpbmcgb25lXG4gICAgICAgIGNvbnN0IGlzTmV3RXh0ZW5zaW9uID0gIWZvcm1EYXRhLmlkIHx8IGZvcm1EYXRhLmlkID09PSAnJztcblxuICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KGV4dGVuc2lvbi4kc2lwX3NlY3JldCwge1xuICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULCAgLy8gU29mdCB2YWxpZGF0aW9uIC0gc2hvdyB3YXJuaW5ncyBidXQgYWxsb3cgc3VibWlzc2lvblxuICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsICAgICAgICAgLy8gU2hvdyBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSwgICAgIC8vIFNob3cgc2hvdy9oaWRlIHBhc3N3b3JkIHRvZ2dsZVxuICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLCAgICAgICAgLy8gU2hvdyBjb3B5IHRvIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSwgICAgICAgIC8vIFNob3cgcGFzc3dvcmQgc3RyZW5ndGggYmFyXG4gICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsICAgICAgICAgICAvLyBTaG93IHZhbGlkYXRpb24gd2FybmluZ3NcbiAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSwgICAgICAgIC8vIFZhbGlkYXRlIGFzIHVzZXIgdHlwZXNcbiAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlLCAvLyBBbHdheXMgdmFsaWRhdGUgaWYgcGFzc3dvcmQgZmllbGQgaGFzIHZhbHVlXG4gICAgICAgICAgICBtaW5TY29yZTogMzAsICAgICAgICAgICAgICAgICAvLyBTSVAgcGFzc3dvcmRzIGhhdmUgbG93ZXIgbWluaW11bSBzY29yZSByZXF1aXJlbWVudFxuICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDIwLCAgICAgICAgICAgLy8gMjAgY2hhcnMgbWF4IGZvciBHcmFuZHN0cmVhbSBHRE1TIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgIGluY2x1ZGVTcGVjaWFsOiBmYWxzZSwgICAgICAgIC8vIEV4Y2x1ZGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGZvciBTSVAgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgb25HZW5lcmF0ZTogKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25WYWxpZGF0ZTogKGlzVmFsaWQsIHNjb3JlLCBtZXNzYWdlcykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE9wdGlvbmFsOiBIYW5kbGUgdmFsaWRhdGlvbiByZXN1bHRzIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIC8vIFRoZSB3aWRnZXQgd2lsbCBoYW5kbGUgdmlzdWFsIGZlZWRiYWNrIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSB3aWRnZXQgaW5zdGFuY2UgZm9yIGxhdGVyIHVzZVxuICAgICAgICBleHRlbnNpb24ucGFzc3dvcmRXaWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgbmV3IGV4dGVuc2lvbnMgb25seTogYXV0by1nZW5lcmF0ZSBwYXNzd29yZCBpZiBmaWVsZCBpcyBlbXB0eVxuICAgICAgICBpZiAoaXNOZXdFeHRlbnNpb24gJiYgZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGdlbmVyYXRlQnRuID0gZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LmNsb3Nlc3QoJy51aS5pbnB1dCcpLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAkZ2VuZXJhdGVCdG4udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERUTUYgbW9kZSBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24oKSB7XG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjc2lwX2R0bWZtb2RlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH0pO1xuICAgICB9LFxuICAgICAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRyYW5zcG9ydCBwcm90b2NvbCBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjc2lwX3RyYW5zcG9ydC1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIGVtcGxveWVlIG5hbWUgYW5kIGV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZW1wbG95ZWVOYW1lIC0gTmFtZSBvZiB0aGUgZW1wbG95ZWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uTnVtYmVyIC0gRXh0ZW5zaW9uIG51bWJlciAob3B0aW9uYWwpXG4gICAgICovXG4gICAgdXBkYXRlUGFnZUhlYWRlcihlbXBsb3llZU5hbWUsIGV4dGVuc2lvbk51bWJlcikge1xuICAgICAgICBsZXQgaGVhZGVyVGV4dDtcblxuICAgICAgICBpZiAoZW1wbG95ZWVOYW1lICYmIGVtcGxveWVlTmFtZS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAvLyBFeGlzdGluZyBlbXBsb3llZSB3aXRoIG5hbWVcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSAnPGkgY2xhc3M9XCJ1c2VyIG91dGxpbmUgaWNvblwiPjwvaT4gJyArIGVtcGxveWVlTmFtZTtcblxuICAgICAgICAgICAgLy8gQWRkIGV4dGVuc2lvbiBudW1iZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTnVtYmVyICYmIGV4dGVuc2lvbk51bWJlci50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVyVGV4dCArPSAnICZsdDsnICsgZXh0ZW5zaW9uTnVtYmVyICsgJyZndDsnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTmV3IGVtcGxveWVlIG9yIG5vIG5hbWUgeWV0XG4gICAgICAgICAgICBoZWFkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0NyZWF0ZU5ld0V4dGVuc2lvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBtYWluIGhlYWRlciBjb250ZW50XG4gICAgICAgICQoJ2gxIC5jb250ZW50JykuaHRtbChoZWFkZXJUZXh0KTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogRGVmaW5lIGEgY3VzdG9tIHJ1bGUgZm9yIGpRdWVyeSBmb3JtIHZhbGlkYXRpb24gbmFtZWQgJ2V4dGVuc2lvblJ1bGUnLlxuICogVGhlIHJ1bGUgY2hlY2tzIGlmIGEgZm9yd2FyZGluZyBudW1iZXIgaXMgc2VsZWN0ZWQgYnV0IHRoZSByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUaGUgdmFsaWRhdGlvbiByZXN1bHQuIElmIGZvcndhcmRpbmcgaXMgc2V0IGFuZCByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQsIGl0IHJldHVybnMgZmFsc2UgKGludmFsaWQpLiBPdGhlcndpc2UsIGl0IHJldHVybnMgdHJ1ZSAodmFsaWQpLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9ICgpID0+IHtcbiAgICAvLyBHZXQgcmluZyBsZW5ndGggYW5kIGZvcndhcmRpbmcgbnVtYmVyIGZyb20gdGhlIGZvcm1cbiAgICBjb25zdCBmd2RSaW5nTGVuZ3RoID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpO1xuICAgIGNvbnN0IGZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG5cbiAgICAvLyBJZiBmb3J3YXJkaW5nIG51bWJlciBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgcmV0dXJuIGZhbHNlIChpbnZhbGlkKVxuICAgIGlmIChmd2RGb3J3YXJkaW5nLmxlbmd0aCA+IDBcbiAgICAgICAgJiYgKFxuICAgICAgICAgICAgZndkUmluZ0xlbmd0aCA9PT0gMFxuICAgICAgICAgICAgfHxcbiAgICAgICAgICAgIGZ3ZFJpbmdMZW5ndGggPT09ICcnXG4gICAgICAgICkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgcmV0dXJuIHRydWUgKHZhbGlkKVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIG51bWJlciBpcyB0YWtlbiBieSBhbm90aGVyIGFjY291bnRcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBwYXJhbWV0ZXIgaGFzIHRoZSAnaGlkZGVuJyBjbGFzcywgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMucGFzc3dvcmRTdHJlbmd0aCA9ICgpID0+IHtcbiAgICAvLyBDaGVjayBpZiBwYXNzd29yZCB3aWRnZXQgZXhpc3RzIGFuZCBwYXNzd29yZCBtZWV0cyBtaW5pbXVtIHNjb3JlXG4gICAgaWYgKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IFBhc3N3b3JkV2lkZ2V0LmdldFN0YXRlKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIHJldHVybiBzdGF0ZSAmJiBzdGF0ZS5zY29yZSA+PSAzMDsgLy8gTWluaW11bSBzY29yZSBmb3IgZXh0ZW5zaW9uc1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTsgLy8gUGFzcyB2YWxpZGF0aW9uIGlmIHdpZGdldCBub3QgaW5pdGlhbGl6ZWRcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgRW1wbG95ZWUgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uLmluaXRpYWxpemUoKTtcbn0pO1xuIl19