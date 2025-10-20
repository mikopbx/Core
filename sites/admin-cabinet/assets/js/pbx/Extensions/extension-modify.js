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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJHVzZXJfdXNlcm5hbWUiLCJwYXNzd29yZFdpZGdldCIsIiRmb3JtT2JqIiwiJHRhYk1lbnVJdGVtcyIsImZvcndhcmRpbmdTZWxlY3QiLCJ2YWxpZGF0ZVJ1bGVzIiwibnVtYmVyIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyIiwiZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5IiwiZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSIsIm1vYmlsZV9udW1iZXIiLCJvcHRpb25hbCIsImV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0IiwiZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSIsInVzZXJfZW1haWwiLCJleF9WYWxpZGF0ZUVtYWlsRW1wdHkiLCJ1c2VyX3VzZXJuYW1lIiwiZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5Iiwic2lwX3NlY3JldCIsImV4X1ZhbGlkYXRlU2VjcmV0RW1wdHkiLCJleF9WYWxpZGF0ZVNlY3JldFdlYWsiLCJleF9WYWxpZGF0ZVBhc3N3b3JkVG9vV2VhayIsImZ3ZF9yaW5nbGVuZ3RoIiwiZGVwZW5kcyIsImV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlIiwiZndkX2ZvcndhcmRpbmciLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCIsImZ3ZF9mb3J3YXJkaW5nb25idXN5IiwiZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImFjY29yZGlvbiIsInBvcHVwIiwib24iLCJhdHRyIiwiaW5pdGlhbGl6ZUZvcm0iLCJjdXJyZW50TnVtYmVyIiwiaW5wdXRtYXNrIiwidmFsIiwidXBkYXRlUGFnZUhlYWRlciIsImN1cnJlbnRVc2VybmFtZSIsIkV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIiwiZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJhcHBseUFDTFBlcm1pc3Npb25zIiwibG9hZEV4dGVuc2lvbkRhdGEiLCJBQ0xIZWxwZXIiLCJjb25zb2xlIiwid2FybiIsImFwcGx5UGVybWlzc2lvbnMiLCJzYXZlIiwic2hvdyIsImVuYWJsZSIsImNhblNhdmUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJkaXNhYmxlIiwiaW5mb01lc3NhZ2UiLCJleF9Ob1Blcm1pc3Npb25Ub01vZGlmeSIsIlVzZXJNZXNzYWdlIiwic2hvd0luZm9ybWF0aW9uIiwiY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlIiwicGFzdGVkVmFsdWUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJuZXdOdW1iZXIiLCJ1c2VySWQiLCJmb3JtIiwiRXh0ZW5zaW9uc0FQSSIsImNoZWNrQXZhaWxhYmlsaXR5IiwiY2JPbkNvbXBsZXRlRW1haWwiLCJuZXdFbWFpbCIsIlVzZXJzQVBJIiwiY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyIiwibmV3TW9iaWxlTnVtYmVyIiwibGVuZ3RoIiwidXNlck5hbWUiLCJjdXJyZW50RndkRm9yd2FyZGluZyIsImN1cnJlbnRGd2RPbkJ1c3kiLCJjdXJyZW50RndkT25VbmF2YWlsYWJsZSIsIkV4dGVuc2lvblNlbGVjdG9yIiwic2V0VmFsdWUiLCJjYk9uQ2xlYXJlZE1vYmlsZU51bWJlciIsImNsZWFyIiwiaW5pdGlhbGl6ZUlucHV0TWFza3MiLCJ0aW1lb3V0TnVtYmVySWQiLCJleHRlbnNpb25zTGVuZ3RoIiwicGFyc2VJbnQiLCJtYXNrIiwicGxhY2Vob2xkZXIiLCJvbmNvbXBsZXRlIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIm1hc2tMaXN0IiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsIm9uY2xlYXJlZCIsInNob3dNYXNrT25Ib3ZlciIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5Iiwib3JpZ2luYWxWYWwiLCJmbiIsIm9mZiIsIiR0aGlzIiwiYXJncyIsImFyZ3VtZW50cyIsIm5ld1ZhbHVlIiwiZGF0YSIsImFwcGx5IiwidHJpZ2dlciIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInBhc3RlZERhdGEiLCJvcmlnaW5hbEV2ZW50IiwiY2xpcGJvYXJkRGF0YSIsImdldERhdGEiLCJ3aW5kb3ciLCJwcm9jZXNzZWREYXRhIiwiY2hhckF0Iiwic2xpY2UiLCJpbnB1dCIsInN0YXJ0Iiwic2VsZWN0aW9uU3RhcnQiLCJlbmQiLCJzZWxlY3Rpb25FbmQiLCJjdXJyZW50VmFsdWUiLCJzdWJzdHJpbmciLCJ0aW1lb3V0RW1haWxJZCIsImZvY3Vzb3V0IiwicGhvbmUiLCJ0YXJnZXQiLCJnZW5lcmF0ZU5ld1NpcFBhc3N3b3JkIiwiJGdlbmVyYXRlQnRuIiwiY2xvc2VzdCIsImZpbmQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkaXJydHkiLCJzdWJtaXRNb2RlIiwidXNlcl9pZCIsImNiQWZ0ZXJTZW5kRm9ybSIsInJlc3BvbnNlIiwidXBkYXRlUGhvbmVSZXByZXNlbnQiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsIkZvcm0iLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJFbXBsb3llZXNBUEkiLCJzYXZlTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImFwaUlkIiwiaGlkZSIsImdldFJlY29yZCIsIl9pc05ldyIsInBvcHVsYXRlRm9ybVdpdGhEYXRhIiwiYXZhdGFyIiwic2hvd0Vycm9yIiwiZXJyb3IiLCJ1cmxQYXJ0cyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImV4dGVuc2lvbnNfbGVuZ3RoIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YSIsInRleHQiLCJzZXRBdmF0YXJVcmwiLCJ1c2VyX2F2YXRhciIsIkV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IiLCJpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQiLCJmb3J3YXJkaW5nRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkTmFtZSIsImluc3RhbmNlcyIsImhhcyIsImRlc3Ryb3kiLCIkZHJvcGRvd24iLCJyZW1vdmUiLCJpbml0IiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJpbmNsdWRlRW1wdHkiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsImV4X1NlbGVjdE5ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsIm5ld0V4dGVuc2lvbiIsInVwZGF0ZUZvcndhcmRpbmdEcm9wZG93bnNFeGNsdXNpb24iLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImN1cnJlbnRUZXh0Iiwibm90IiwiaHRtbCIsInJlZnJlc2hEYXRhIiwiaXNOZXdFeHRlbnNpb24iLCJpZCIsIndpZGdldCIsIlBhc3N3b3JkV2lkZ2V0IiwidmFsaWRhdGlvbiIsIlZBTElEQVRJT04iLCJTT0ZUIiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJpbmNsdWRlU3BlY2lhbCIsIm9uR2VuZXJhdGUiLCJwYXNzd29yZCIsImRhdGFDaGFuZ2VkIiwib25WYWxpZGF0ZSIsImlzVmFsaWQiLCJzY29yZSIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJlbXBsb3llZU5hbWUiLCJleHRlbnNpb25OdW1iZXIiLCJoZWFkZXJUZXh0IiwidHJpbSIsImV4X0NyZWF0ZU5ld0V4dGVuc2lvbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJwYXNzd29yZFN0cmVuZ3RoIiwic3RhdGUiLCJnZXRTdGF0ZSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFNBQVMsR0FBRztBQUNkQyxFQUFBQSxZQUFZLEVBQUUsRUFEQTtBQUVkQyxFQUFBQSxhQUFhLEVBQUUsRUFGRDtBQUdkQyxFQUFBQSxtQkFBbUIsRUFBRSxFQUhQO0FBSWRDLEVBQUFBLE9BQU8sRUFBRUMsQ0FBQyxDQUFDLFNBQUQsQ0FKSTtBQUtkQyxFQUFBQSxXQUFXLEVBQUVELENBQUMsQ0FBQyxhQUFELENBTEE7QUFNZEUsRUFBQUEsY0FBYyxFQUFFRixDQUFDLENBQUMsZ0JBQUQsQ0FOSDtBQU9kRyxFQUFBQSxlQUFlLEVBQUVI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TWdRLEtBQUssR0FBR25DLGNBQWMsQ0FBQ29DLFFBQWYsQ0FBd0I5USxTQUFTLENBQUNhLGNBQWxDLENBQWQ7QUFDQSxXQUFPZ1EsS0FBSyxJQUFJQSxLQUFLLENBQUNoQixLQUFOLElBQWUsRUFBL0IsQ0FGMEIsQ0FFUztBQUN0Qzs7QUFDRCxTQUFPLElBQVAsQ0FOOEMsQ0FNakM7QUFDaEIsQ0FQRDtBQVNBO0FBQ0E7QUFDQTs7O0FBQ0F4UCxDQUFDLENBQUMwUSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCaFIsRUFBQUEsU0FBUyxDQUFDK0MsVUFBVjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zQVBJLCBFbXBsb3llZXNBUEksIEZvcm0sXG4gSW5wdXRNYXNrUGF0dGVybnMsIGF2YXRhciwgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciwgQ2xpcGJvYXJkSlMsIFBhc3N3b3JkV2lkZ2V0LCBVc2VyTWVzc2FnZSwgQUNMSGVscGVyICovXG5cblxuLyoqXG4gKiBUaGUgZXh0ZW5zaW9uIG9iamVjdC5cbiAqIE1hbmFnZXMgdGhlIG9wZXJhdGlvbnMgYW5kIGJlaGF2aW9ycyBvZiB0aGUgZXh0ZW5zaW9uIGVkaXQgZm9ybVxuICpcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uXG4gKi9cbmNvbnN0IGV4dGVuc2lvbiA9IHtcbiAgICBkZWZhdWx0RW1haWw6ICcnLFxuICAgIGRlZmF1bHROdW1iZXI6ICcnLFxuICAgIGRlZmF1bHRNb2JpbGVOdW1iZXI6ICcnLFxuICAgICRudW1iZXI6ICQoJyNudW1iZXInKSxcbiAgICAkc2lwX3NlY3JldDogJCgnI3NpcF9zZWNyZXQnKSxcbiAgICAkbW9iaWxlX251bWJlcjogJCgnI21vYmlsZV9udW1iZXInKSxcbiAgICAkZndkX2ZvcndhcmRpbmc6ICQoJyNmd2RfZm9yd2FyZGluZycpLFxuICAgICRmd2RfZm9yd2FyZGluZ29uYnVzeTogJCgnI2Z3ZF9mb3J3YXJkaW5nb25idXN5JyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZTogJCgnI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpLFxuICAgICRlbWFpbDogJCgnI3VzZXJfZW1haWwnKSxcbiAgICAkdXNlcl91c2VybmFtZTogJCgnI3VzZXJfdXNlcm5hbWUnKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQYXNzd29yZCB3aWRnZXQgaW5zdGFuY2UuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBwYXNzd29yZFdpZGdldDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNleHRlbnNpb25zLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJ1bGFyIG1lbnUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdGFiTWVudUl0ZW1zOiAkKCcjZXh0ZW5zaW9ucy1tZW51IC5pdGVtJyksXG5cblxuICAgIC8qKlxuICAgICAqIFN0cmluZyBmb3IgdGhlIGZvcndhcmRpbmcgc2VsZWN0LlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZm9yd2FyZGluZ1NlbGVjdDogJyNleHRlbnNpb25zLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBudW1iZXI6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdudW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW251bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBtb2JpbGVfbnVtYmVyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWFzaycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcl9lbWFpbDoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl9lbWFpbCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX3VzZXJuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl91c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzaXBfc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlU2VjcmV0V2VhayxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3Bhc3N3b3JkU3RyZW5ndGgnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVBhc3N3b3JkVG9vV2Vha1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9yaW5nbGVuZ3RoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuICAgICAgICAgICAgZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb24gZm9ybSBhbmQgaXRzIGludGVyYWN0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBEZWZhdWx0IHZhbHVlcyB3aWxsIGJlIHNldCBhZnRlciBSRVNUIEFQSSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggZW1wdHkgdmFsdWVzIHNpbmNlIGZvcm1zIGFyZSBlbXB0eSB1bnRpbCBBUEkgcmVzcG9uZHNcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9ICcnO1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE51bWJlciA9ICcnO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFiIG1lbnUgaXRlbXMsIGFjY29yZGlvbnMsIGFuZCBkcm9wZG93biBtZW51c1xuICAgICAgICBleHRlbnNpb24uJHRhYk1lbnVJdGVtcy50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIC51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBmb3IgcXVlc3Rpb24gaWNvbnMgYW5kIGJ1dHRvbnNcbiAgICAgICAgJChcImkucXVlc3Rpb25cIikucG9wdXAoKTtcbiAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIGV4dGVuc2lvbi4kc2lwX3NlY3JldC5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gZm9ybVxuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgaGFuZGxlciBmb3IgdXNlcm5hbWUgY2hhbmdlIHRvIHVwZGF0ZSBwYWdlIHRpdGxlXG4gICAgICAgIGV4dGVuc2lvbi4kdXNlcl91c2VybmFtZS5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2sgPyBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKSA6IGV4dGVuc2lvbi4kbnVtYmVyLnZhbCgpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLnVwZGF0ZVBhZ2VIZWFkZXIoJCh0aGlzKS52YWwoKSwgY3VycmVudE51bWJlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFsc28gdXBkYXRlIGhlYWRlciB3aGVuIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlc1xuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRVc2VybmFtZSA9IGV4dGVuc2lvbi4kdXNlcl91c2VybmFtZS52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnROdW1iZXIgPSAkKHRoaXMpLmlucHV0bWFzayA/ICQodGhpcykuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykgOiAkKHRoaXMpLnZhbCgpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLnVwZGF0ZVBhZ2VIZWFkZXIoY3VycmVudFVzZXJuYW1lLCBjdXJyZW50TnVtYmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgYWR2YW5jZWQgc2V0dGluZ3MgdXNpbmcgdW5pZmllZCBzeXN0ZW1cbiAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBvbGQgbmFtZSBpZiBuZXcgY2xhc3Mgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgQUNMIHBlcm1pc3Npb25zIHRvIFVJIGVsZW1lbnRzXG4gICAgICAgIGV4dGVuc2lvbi5hcHBseUFDTFBlcm1pc3Npb25zKCk7XG5cbiAgICAgICAgLy8gTG9hZCBleHRlbnNpb24gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgZXh0ZW5zaW9uLmxvYWRFeHRlbnNpb25EYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IEFDTCBwZXJtaXNzaW9ucyB0byBVSSBlbGVtZW50c1xuICAgICAqIFNob3dzL2hpZGVzIGJ1dHRvbnMgYW5kIGZvcm0gZWxlbWVudHMgYmFzZWQgb24gdXNlciBwZXJtaXNzaW9uc1xuICAgICAqL1xuICAgIGFwcGx5QUNMUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIEFDTCBIZWxwZXIgaXMgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgQUNMSGVscGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdBQ0xIZWxwZXIgaXMgbm90IGF2YWlsYWJsZSwgc2tpcHBpbmcgQUNMIGNoZWNrcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgcGVybWlzc2lvbnMgdXNpbmcgQUNMSGVscGVyXG4gICAgICAgIEFDTEhlbHBlci5hcHBseVBlcm1pc3Npb25zKHtcbiAgICAgICAgICAgIHNhdmU6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAnI3N1Ym1pdGJ1dHRvbiwgI2Ryb3Bkb3duU3VibWl0JyxcbiAgICAgICAgICAgICAgICBlbmFibGU6ICcjZXh0ZW5zaW9ucy1mb3JtJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlbGV0ZToge1xuICAgICAgICAgICAgICAgIHNob3c6ICcuZGVsZXRlLWJ1dHRvbiwgLnR3by1zdGVwcy1kZWxldGUnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgY2hlY2tzIGZvciBzcGVjaWZpYyBhY3Rpb25zXG4gICAgICAgIGlmICghQUNMSGVscGVyLmNhblNhdmUoKSkge1xuICAgICAgICAgICAgLy8gRGlzYWJsZSBmb3JtIGlmIHVzZXIgY2Fubm90IHNhdmVcbiAgICAgICAgICAgICQoJyNleHRlbnNpb25zLWZvcm0gaW5wdXQsICNleHRlbnNpb25zLWZvcm0gc2VsZWN0LCAjZXh0ZW5zaW9ucy1mb3JtIHRleHRhcmVhJylcbiAgICAgICAgICAgICAgICAucHJvcCgncmVhZG9ubHknLCB0cnVlKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgLy8gRGlzYWJsZSBwYXNzd29yZCB3aWRnZXRcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24ucGFzc3dvcmRXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24ucGFzc3dvcmRXaWRnZXQuZGlzYWJsZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTaG93IGluZm8gbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgaW5mb01lc3NhZ2UgPSBnbG9iYWxUcmFuc2xhdGUuZXhfTm9QZXJtaXNzaW9uVG9Nb2RpZnkgfHwgJ1lvdSBkbyBub3QgaGF2ZSBwZXJtaXNzaW9uIHRvIG1vZGlmeSBleHRlbnNpb25zJztcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihpbmZvTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHBhc3RlIG1vYmlsZSBudW1iZXIgZnJvbSBjbGlwYm9hcmRcbiAgICAgKi9cbiAgICBjYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJdCBpcyBleGVjdXRlZCBhZnRlciBhIHBob25lIG51bWJlciBoYXMgYmVlbiBlbnRlcmVkIGNvbXBsZXRlbHkuXG4gICAgICogSXQgc2VydmVzIHRvIGNoZWNrIGlmIHRoZXJlIGFyZSBhbnkgY29uZmxpY3RzIHdpdGggZXhpc3RpbmcgcGhvbmUgbnVtYmVycy5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSBlbnRlcmVkIHBob25lIG51bWJlciBhZnRlciByZW1vdmluZyBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGBjaGVja0F2YWlsYWJpbGl0eWAgZnVuY3Rpb24gb24gYEV4dGVuc2lvbnNgIG9iamVjdFxuICAgICAgICAvLyB0byBjaGVjayB3aGV0aGVyIHRoZSBlbnRlcmVkIHBob25lIG51bWJlciBpcyBhbHJlYWR5IGluIHVzZS5cbiAgICAgICAgLy8gUGFyYW1ldGVyczogZGVmYXVsdCBudW1iZXIsIG5ldyBudW1iZXIsIGNsYXNzIG5hbWUgb2YgZXJyb3IgbWVzc2FnZSAobnVtYmVyKSwgdXNlciBpZFxuICAgICAgICBFeHRlbnNpb25zQVBJLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyLCBuZXdOdW1iZXIsICdudW1iZXInLCB1c2VySWQpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgb25jZSBhbiBlbWFpbCBhZGRyZXNzIGhhcyBiZWVuIGNvbXBsZXRlbHkgZW50ZXJlZC5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVFbWFpbCgpIHtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgYWZ0ZXIgcmVtb3ZpbmcgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3RW1haWwgPSBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSB1c2VyIElEIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cbiAgICAgICAgLy8gQ2FsbCB0aGUgYGNoZWNrQXZhaWxhYmlsaXR5YCBmdW5jdGlvbiBvbiBgVXNlcnNBUElgIG9iamVjdFxuICAgICAgICAvLyB0byBjaGVjayB3aGV0aGVyIHRoZSBlbnRlcmVkIGVtYWlsIGlzIGFscmVhZHkgaW4gdXNlLlxuICAgICAgICAvLyBQYXJhbWV0ZXJzOiBkZWZhdWx0IGVtYWlsLCBuZXcgZW1haWwsIGNsYXNzIG5hbWUgb2YgZXJyb3IgbWVzc2FnZSAoZW1haWwpLCB1c2VyIGlkXG4gICAgICAgIFVzZXJzQVBJLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0RW1haWwsIG5ld0VtYWlsLCdlbWFpbCcsIHVzZXJJZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFjdGl2YXRlZCB3aGVuIGVudGVyaW5nIGEgbW9iaWxlIHBob25lIG51bWJlciBpbiB0aGUgZW1wbG95ZWUncyBwcm9maWxlLlxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZU1vYmlsZU51bWJlcigpIHtcbiAgICAgICAgLy8gR2V0IHRoZSBuZXcgbW9iaWxlIG51bWJlciB3aXRob3V0IGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld01vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBHZXQgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIER5bmFtaWMgY2hlY2sgdG8gc2VlIGlmIHRoZSBzZWxlY3RlZCBtb2JpbGUgbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAgICBFeHRlbnNpb25zQVBJLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyLCBuZXdNb2JpbGVOdW1iZXIsICdtb2JpbGUtbnVtYmVyJywgdXNlcklkKTtcblxuICAgICAgICAvLyBSZWZpbGwgdGhlIG1vYmlsZSBkaWFsc3RyaW5nIGlmIHRoZSBuZXcgbW9iaWxlIG51bWJlciBpcyBkaWZmZXJlbnQgdGhhbiB0aGUgZGVmYXVsdCBvciBpZiB0aGUgbW9iaWxlIGRpYWxzdHJpbmcgaXMgZW1wdHlcbiAgICAgICAgaWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXJcbiAgICAgICAgICAgIHx8IChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJykubGVuZ3RoID09PSAwKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vYmlsZSBudW1iZXIgaGFzIGNoYW5nZWRcbiAgICAgICAgaWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHVzZXJuYW1lIGZyb20gdGhlIGZvcm1cbiAgICAgICAgICAgIGNvbnN0IHVzZXJOYW1lID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX3VzZXJuYW1lJyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3J3YXJkaW5nIGZpZWxkcyB0aGF0IG1hdGNoIHRoZSBvbGQgbW9iaWxlIG51bWJlclxuICAgICAgICAgICAgY29uc3QgY3VycmVudEZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RndkT25CdXN5ID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEZ3ZE9uVW5hdmFpbGFibGUgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZndkX2ZvcndhcmRpbmcgaWYgaXQgbWF0Y2hlcyBvbGQgbW9iaWxlIG51bWJlciAoaW5jbHVkaW5nIGVtcHR5KVxuICAgICAgICAgICAgaWYgKGN1cnJlbnRGd2RGb3J3YXJkaW5nID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHJpbmcgbGVuZ3RoIGlmIGVtcHR5XG4gICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKS5sZW5ndGggPT09IDBcbiAgICAgICAgICAgICAgICAgICAgfHwgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpPT09XCIwXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDQ1KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLnNldFZhbHVlKCdmd2RfZm9yd2FyZGluZycsIG5ld01vYmlsZU51bWJlciwgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmd2RfZm9yd2FyZGluZ29uYnVzeSBpZiBpdCBtYXRjaGVzIG9sZCBtb2JpbGUgbnVtYmVyIChpbmNsdWRpbmcgZW1wdHkpXG4gICAgICAgICAgICBpZiAoY3VycmVudEZ3ZE9uQnVzeSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLnNldFZhbHVlKCdmd2RfZm9yd2FyZGluZ29uYnVzeScsIG5ld01vYmlsZU51bWJlciwgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUgaWYgaXQgbWF0Y2hlcyBvbGQgbW9iaWxlIG51bWJlciAoaW5jbHVkaW5nIGVtcHR5KVxuICAgICAgICAgICAgaWYgKGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3Iuc2V0VmFsdWUoJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIG5ld01vYmlsZU51bWJlciwgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IHRoZSBuZXcgbW9iaWxlIG51bWJlciBhcyB0aGUgZGVmYXVsdFxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IG5ld01vYmlsZU51bWJlcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdoZW4gdGhlIG1vYmlsZSBwaG9uZSBudW1iZXIgaXMgY2xlYXJlZCBpbiB0aGUgZW1wbG95ZWUgY2FyZC5cbiAgICAgKi9cbiAgICBjYk9uQ2xlYXJlZE1vYmlsZU51bWJlcigpIHtcbiAgICAgICAgLy8gQ2hlY2sgY3VycmVudCBmb3J3YXJkaW5nIHZhbHVlcyBiZWZvcmUgY2xlYXJpbmdcbiAgICAgICAgY29uc3QgY3VycmVudEZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPbkJ1c3kgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jyk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIHRoZSAnbW9iaWxlX2RpYWxzdHJpbmcnIGFuZCAnbW9iaWxlX251bWJlcicgZmllbGRzIGluIHRoZSBmb3JtXG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX251bWJlcicsICcnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGN1cnJlbnRGd2RGb3J3YXJkaW5nID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIGNsZWFyIHRoZSAnZndkX3JpbmdsZW5ndGgnIGZpZWxkIGFuZCBjbGVhciBmb3J3YXJkaW5nIGRyb3Bkb3duXG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgMCk7XG4gICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuY2xlYXIoJ2Z3ZF9mb3J3YXJkaW5nJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdoZW4gYnVzeSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChjdXJyZW50RndkT25CdXN5ID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmNsZWFyKCdmd2RfZm9yd2FyZGluZ29uYnVzeScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIHVuYXZhaWxhYmxlIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmNsZWFyKCdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIHRoZSBkZWZhdWx0IG1vYmlsZSBudW1iZXJcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSAnJztcbiAgICB9LFxuXG4gICAgaW5pdGlhbGl6ZUlucHV0TWFza3MoKXtcbiAgICAgICAgLy8gU2V0IHVwIG51bWJlciBpbnB1dCBtYXNrIHdpdGggY29ycmVjdCBsZW5ndGggZnJvbSBBUElcbiAgICAgICAgbGV0IHRpbWVvdXROdW1iZXJJZDtcblxuICAgICAgICAvLyBBbHdheXMgaW5pdGlhbGl6ZSBtYXNrIGJhc2VkIG9uIGV4dGVuc2lvbnNfbGVuZ3RoIGZyb20gQVBJXG4gICAgICAgIC8vIE5vIGRlZmF1bHRzIGluIEphdmFTY3JpcHQgLSB2YWx1ZSBtdXN0IGNvbWUgZnJvbSBBUElcbiAgICAgICAgaWYgKGV4dGVuc2lvbi5leHRlbnNpb25zTGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25zTGVuZ3RoID0gcGFyc2VJbnQoZXh0ZW5zaW9uLmV4dGVuc2lvbnNMZW5ndGgsIDEwKTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25zTGVuZ3RoID49IDIgJiYgZXh0ZW5zaW9uc0xlbmd0aCA8PSAxMCkge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgbWFzayB3aXRoIGNvcnJlY3QgbGVuZ3RoIGFuZCBvbmNvbXBsZXRlIGhhbmRsZXJcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soe1xuICAgICAgICAgICAgICAgICAgICBtYXNrOiBgOXsyLCR7ZXh0ZW5zaW9uc0xlbmd0aH19YCxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICdfJyxcbiAgICAgICAgICAgICAgICAgICAgb25jb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aW1lb3V0TnVtYmVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dE51bWJlcklkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXROdW1iZXJJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2tzIGZvciB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBjb25zdCBtYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrcyh7XG4gICAgICAgICAgICBpbnB1dG1hc2s6IHtcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAnIyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcjogJ1swLTldJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRpbmFsaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25jbGVhcmVkOiBleHRlbnNpb24uY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIsXG4gICAgICAgICAgICAgICAgb25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcbiAgICAgICAgICAgICAgICBzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBvbkJlZm9yZVBhc3RlIHRvIHByZXZlbnQgY29uZmxpY3RzIHdpdGggb3VyIGN1c3RvbSBoYW5kbGVyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICByZXBsYWNlOiAnOScsXG4gICAgICAgICAgICBsaXN0OiBtYXNrTGlzdCxcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGhhbmRsZXIgZm9yIHByb2dyYW1tYXRpYyB2YWx1ZSBjaGFuZ2VzIChmb3IgdGVzdHMgYW5kIGF1dG9tYXRpb24pXG4gICAgICAgIGNvbnN0IG9yaWdpbmFsVmFsID0gJC5mbi52YWw7XG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5vZmYoJ3ZhbC5vdmVycmlkZScpLm9uKCd2YWwub3ZlcnJpZGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0aGlzID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgICAgICAgIC8vIElmIHNldHRpbmcgYSB2YWx1ZSBwcm9ncmFtbWF0aWNhbGx5XG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAwICYmIHR5cGVvZiBhcmdzWzBdID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gYXJnc1swXTtcblxuICAgICAgICAgICAgICAgIC8vIFRlbXBvcmFyaWx5IHJlbW92ZSBtYXNrXG4gICAgICAgICAgICAgICAgaWYgKCR0aGlzLmRhdGEoJ2lucHV0bWFzaycpKSB7XG4gICAgICAgICAgICAgICAgICAgICR0aGlzLmlucHV0bWFzaygncmVtb3ZlJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZVxuICAgICAgICAgICAgICAgIG9yaWdpbmFsVmFsLmFwcGx5KHRoaXMsIGFyZ3MpO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVhcHBseSBtYXNrIGFmdGVyIGEgc2hvcnQgZGVsYXlcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJHRoaXMudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5vbigncGFzdGUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7IC8vIFByZXZlbnQgZGVmYXVsdCBwYXN0ZSBiZWhhdmlvclxuXG4gICAgICAgICAgICAvLyBHZXQgcGFzdGVkIGRhdGEgZnJvbSBjbGlwYm9hcmRcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG5cbiAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgZGF0YSBmcm9tIGNsaXBib2FyZCBldmVudFxuICAgICAgICAgICAgaWYgKGUub3JpZ2luYWxFdmVudCAmJiBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YSAmJiBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5jbGlwYm9hcmREYXRhICYmIGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gRGlyZWN0IGNsaXBib2FyZERhdGEgYWNjZXNzXG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5jbGlwYm9hcmREYXRhICYmIHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgSUVcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiB3ZSBjb3VsZG4ndCBnZXQgY2xpcGJvYXJkIGRhdGEsIGRvbid0IHByb2Nlc3NcbiAgICAgICAgICAgIGlmICghcGFzdGVkRGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUHJvY2VzcyB0aGUgcGFzdGVkIGRhdGFcbiAgICAgICAgICAgIGxldCBwcm9jZXNzZWREYXRhO1xuICAgICAgICAgICAgaWYgKHBhc3RlZERhdGEuY2hhckF0KDApID09PSAnKycpIHtcbiAgICAgICAgICAgICAgICAvLyBLZWVwICcrJyBhbmQgcmVtb3ZlIG90aGVyIG5vbi1kaWdpdCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgcHJvY2Vzc2VkRGF0YSA9ICcrJyArIHBhc3RlZERhdGEuc2xpY2UoMSkucmVwbGFjZSgvXFxEL2csICcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGFsbCBub24tZGlnaXQgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgIHByb2Nlc3NlZERhdGEgPSBwYXN0ZWREYXRhLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluc2VydCBjbGVhbmVkIGRhdGEgaW50byB0aGUgaW5wdXQgZmllbGRcbiAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gaW5wdXQuc2VsZWN0aW9uU3RhcnQgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IGlucHV0LnNlbGVjdGlvbkVuZCB8fCAwO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJChpbnB1dCkudmFsKCkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGN1cnJlbnRWYWx1ZS5zdWJzdHJpbmcoMCwgc3RhcnQpICsgcHJvY2Vzc2VkRGF0YSArIGN1cnJlbnRWYWx1ZS5zdWJzdHJpbmcoZW5kKTtcblxuICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgcmVtb3ZlIG1hc2ssIHNldCB2YWx1ZSwgdGhlbiByZWFwcGx5XG4gICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKFwicmVtb3ZlXCIpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLnZhbChuZXdWYWx1ZSk7XG5cbiAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSB0aGUgdmFsdWUgaXMgc2V0IGJlZm9yZSByZWFwcGx5aW5nIG1hc2tcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgaW5wdXQgZXZlbnQgdG8gcmVhcHBseSB0aGUgbWFza1xuICAgICAgICAgICAgICAgICQoaW5wdXQpLnRyaWdnZXIoJ2lucHV0Jyk7XG4gICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCB0aGUgaW5wdXQgbWFzayBmb3IgdGhlIGVtYWlsIGlucHV0XG4gICAgICAgIGxldCB0aW1lb3V0RW1haWxJZDtcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZTogKCk9PntcbiAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgcHJldmlvdXMgdGltZXIsIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICh0aW1lb3V0RW1haWxJZCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dEVtYWlsSWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgICAgICAgdGltZW91dEVtYWlsSWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsKCk7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBleHRlbnNpb24uJGVtYWlsLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vQXR0YWNoIGEgZm9jdXNvdXQgZXZlbnQgbGlzdGVuZXIgdG8gdGhlIG1vYmlsZSBudW1iZXIgaW5wdXRcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmZvY3Vzb3V0KGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsZXQgcGhvbmUgPSAkKGUudGFyZ2V0KS52YWwoKS5yZXBsYWNlKC9bXjAtOV0vZywgXCJcIik7XG4gICAgICAgICAgICBpZiAocGhvbmUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJChlLnRhcmdldCkudmFsKCcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIG5ldyBTSVAgcGFzc3dvcmQuXG4gICAgICogVXNlcyB0aGUgUGFzc3dvcmRXaWRnZXQgYnV0dG9uIGxpa2UgaW4gQU1JIG1hbmFnZXIuXG4gICAgICovXG4gICAgZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcbiAgICAgICAgLy8gVHJpZ2dlciBwYXNzd29yZCBnZW5lcmF0aW9uIHRocm91Z2ggdGhlIHdpZGdldCBidXR0b24gKGxpa2UgaW4gQU1JKVxuICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBleHRlbnNpb24uJHNpcF9zZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJGdlbmVyYXRlQnRuLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEubW9iaWxlX251bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZW1vdmUgZm9ybSBjb250cm9sIGZpZWxkcyB0aGF0IHNob3VsZG4ndCBiZSBzZW50IHRvIHNlcnZlclxuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEuZGlycnR5O1xuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEuc3VibWl0TW9kZTtcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLnVzZXJfaWQ7IC8vIFJlbW92ZSB1c2VyX2lkIGZpZWxkIHRvIHByZXZlbnQgdmFsaWRhdGlvbiBpc3N1ZXNcblxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgKGNoZWNrIGlmIHdlIGhhdmUgYSByZWFsIElEKVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBjdXJyZW50IGV4dGVuc2lvbiBudW1iZXIgYXMgdGhlIGRlZmF1bHQgbnVtYmVyIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEubnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSByZXNwb25zZS5kYXRhLm51bWJlcjtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHBob25lIHJlcHJlc2VudGF0aW9uIHdpdGggdGhlIG5ldyBkZWZhdWx0IG51bWJlclxuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZSBhbmQgcmVzcG9uc2UucmVsb2FkIGZyb20gc2VydmVyXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzIGZvciBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qcyBmb3IgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGV4dGVuc2lvbi4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZXh0ZW5zaW9uLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBFbXBsb3llZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyBjaGVja2JveCB2YWx1ZXMgYXJlIHNlbnQgYXMgdHJ1ZS9mYWxzZSBpbnN0ZWFkIG9mIFwib25cIi91bmRlZmluZWRcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFY1LjAgQXJjaGl0ZWN0dXJlOiBMb2FkIGV4dGVuc2lvbiBkYXRhIHZpYSBSRVNUIEFQSSAoc2ltaWxhciB0byBJVlIgbWVudSBwYXR0ZXJuKVxuICAgICAqL1xuICAgIGxvYWRFeHRlbnNpb25EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGV4dGVuc2lvbi5nZXRSZWNvcmRJZCgpO1xuXG4gICAgICAgIC8vIFVzZSAnbmV3JyBhcyBJRCBmb3IgbmV3IHJlY29yZHMgdG8gZ2V0IGRlZmF1bHQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGNvbnN0IGFwaUlkID0gcmVjb3JkSWQgPT09ICcnID8gJ25ldycgOiByZWNvcmRJZDtcblxuICAgICAgICAvLyBIaWRlIG1vbml0b3JpbmcgZWxlbWVudHMgZm9yIG5ldyBlbXBsb3llZXNcbiAgICAgICAgaWYgKGFwaUlkID09PSAnbmV3Jykge1xuICAgICAgICAgICAgJCgnI3N0YXR1cycpLmhpZGUoKTsgLy8gSGlkZSBzdGF0dXMgbGFiZWxcbiAgICAgICAgICAgICQoJ2FbZGF0YS10YWI9XCJzdGF0dXNcIl0nKS5oaWRlKCk7IC8vIEhpZGUgbW9uaXRvcmluZyB0YWJcbiAgICAgICAgfVxuXG4gICAgICAgIEVtcGxveWVlc0FQSS5nZXRSZWNvcmQoYXBpSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBpZiB3ZSBkb24ndCBoYXZlIGFuIElEIChmb2xsb3dpbmcgQ2FsbFF1ZXVlcyBwYXR0ZXJuKVxuICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBleHRlbnNpb24ucG9wdWxhdGVGb3JtV2l0aERhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgZGVmYXVsdCB2YWx1ZXMgYWZ0ZXIgZGF0YSBsb2FkXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSByZXNwb25zZS5kYXRhLm51bWJlciB8fCAnJztcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gcmVzcG9uc2UuZGF0YS51c2VyX2VtYWlsIHx8ICcnO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gcmVzcG9uc2UuZGF0YS5tb2JpbGVfbnVtYmVyIHx8ICcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIHN0aWxsIGluaXRpYWxpemUgYXZhdGFyIGV2ZW4gaWYgQVBJIGZhaWxzXG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBleHRlbnNpb24gZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkwgKGxpa2UgSVZSIG1lbnUpXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBSRVNUIEFQSSAoVjUuMCBjbGVhbiBkYXRhIGFyY2hpdGVjdHVyZSlcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1XaXRoRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIFN0b3JlIGV4dGVuc2lvbnNfbGVuZ3RoIGZyb20gQVBJIGZvciB1c2UgaW4gaW5pdGlhbGl6ZUlucHV0TWFza3NcbiAgICAgICAgLy8gVGhpcyB2YWx1ZSBNVVNUIGNvbWUgZnJvbSBBUEkgLSBubyBkZWZhdWx0cyBpbiBKU1xuICAgICAgICBleHRlbnNpb24uZXh0ZW5zaW9uc0xlbmd0aCA9IGRhdGEuZXh0ZW5zaW9uc19sZW5ndGg7XG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggKHNhbWUgYXMgSVZSIG1lbnUpXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBWNS4wIHNwZWNpYWxpemVkIGNsYXNzZXMgLSBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIGFueSBVSSBlbGVtZW50cyBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBpZiAoZm9ybURhdGEubnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb24tbnVtYmVyLWRpc3BsYXknKS50ZXh0KGZvcm1EYXRhLm51bWJlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgYXZhdGFyIGNvbXBvbmVudCBhZnRlciBmb3JtIHBvcHVsYXRpb25cbiAgICAgICAgICAgICAgICBhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBhdmF0YXIgVVJMIGR5bmFtaWNhbGx5IGZyb20gQVBJIGRhdGFcbiAgICAgICAgICAgICAgICBhdmF0YXIuc2V0QXZhdGFyVXJsKGZvcm1EYXRhLnVzZXJfYXZhdGFyKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIG1vZGlmeSBzdGF0dXMgbW9uaXRvciBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggZW1wbG95ZWUgbmFtZSBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVQYWdlSGVhZGVyKGZvcm1EYXRhLnVzZXJfdXNlcm5hbWUsIGZvcm1EYXRhLm51bWJlcik7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dCBtYXNrcyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplSW5wdXRNYXNrcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5PVEU6IEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKSB3aWxsIGJlIGNhbGxlZCBhdXRvbWF0aWNhbGx5IGJ5IEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjbGVhbiBkYXRhIC0gVjUuMCBBcmNoaXRlY3R1cmVcbiAgICAgKiBVc2VzIHNwZWNpYWxpemVkIGNsYXNzZXMgd2l0aCBjb21wbGV0ZSBhdXRvbWF0aW9uIChubyBvbkNoYW5nZSBjYWxsYmFja3MgbmVlZGVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBmb3J3YXJkaW5nIGRyb3Bkb3duIGluc3RhbmNlcyBiZWZvcmUgcmUtaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHByb3BlciByZS1jcmVhdGlvbiB3aGVuIGZvcm0gZGF0YSBpcyByZWxvYWRlZCAoZS5nLiwgYWZ0ZXIgc2F2ZSlcbiAgICAgICAgY29uc3QgZm9yd2FyZGluZ0ZpZWxkcyA9IFsnZndkX2ZvcndhcmRpbmcnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJ107XG4gICAgICAgIGZvcndhcmRpbmdGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgaWYgKEV4dGVuc2lvblNlbGVjdG9yLmluc3RhbmNlcy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmRlc3Ryb3koZmllbGROYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gZHJvcGRvd25zIHdpdGggY3VycmVudCBleHRlbnNpb24gZXhjbHVzaW9uIC0gVjUuMCBzcGVjaWFsaXplZCBjbGFzc1xuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZycsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbZGF0YS5udW1iZXJdLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jywge1xuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLCBcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbZGF0YS5udW1iZXJdLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbZGF0YS5udW1iZXJdLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHdpdGggQVBJIGRhdGEgLSBWNS4wIGJhc2UgY2xhc3NcbiAgICAgICAgXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignc2lwX25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgIGFwaVVybDogYC9wYnhjb3JlL2FwaS92My9uZXR3b3JrLWZpbHRlcnM6Z2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT1TSVBgLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWxlY3ROZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVjUuMCBhcmNoaXRlY3R1cmUgd2l0aCBlbXB0eSBmb3JtIHNob3VsZCBub3QgaGF2ZSBIVE1MIGVudGl0aWVzIGlzc3Vlc1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlcyAtIHJlYnVpbGQgZHJvcGRvd25zIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vZmYoJ2NoYW5nZS5kcm9wZG93bicpLm9uKCdjaGFuZ2UuZHJvcGRvd24nLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdFeHRlbnNpb24gPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ251bWJlcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobmV3RXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4Y2x1c2lvbnMgZm9yIGZvcndhcmRpbmcgZHJvcGRvd25zXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLnVwZGF0ZUZvcndhcmRpbmdEcm9wZG93bnNFeGNsdXNpb24obmV3RXh0ZW5zaW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCk7XG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBmb3J3YXJkaW5nIGRyb3Bkb3ducyB3aGVuIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlc1xuICAgICAqL1xuICAgIHVwZGF0ZUZvcndhcmRpbmdEcm9wZG93bnNFeGNsdXNpb24obmV3RXh0ZW5zaW9uKSB7XG4gICAgICAgIGNvbnN0IGZvcndhcmRpbmdGaWVsZHMgPSBbJ2Z3ZF9mb3J3YXJkaW5nJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSddO1xuICAgICAgICBcbiAgICAgICAgZm9yd2FyZGluZ0ZpZWxkcy5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkKGAjJHtmaWVsZE5hbWV9YCkudmFsKCk7XG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VGV4dCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpLm5vdCgnLmRlZmF1bHQnKS5odG1sKCkgfHwgJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgaW5zdGFuY2UgZmlyc3RcbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmRlc3Ryb3koZmllbGROYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIG9sZCBkcm9wZG93biBET00gZWxlbWVudFxuICAgICAgICAgICAgJGRyb3Bkb3duLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgbmV3IGRhdGEgb2JqZWN0IHdpdGggY3VycmVudCB2YWx1ZSBmb3IgcmVpbml0aWFsaXppbmdcbiAgICAgICAgICAgIGNvbnN0IHJlZnJlc2hEYXRhID0ge307XG4gICAgICAgICAgICByZWZyZXNoRGF0YVtmaWVsZE5hbWVdID0gY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgcmVmcmVzaERhdGFbYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgXSA9IGN1cnJlbnRUZXh0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWluaXRpYWxpemUgd2l0aCBuZXcgZXhjbHVzaW9uXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KGZpZWxkTmFtZSwge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW25ld0V4dGVuc2lvbl0sXG4gICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHJlZnJlc2hEYXRhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBhZnRlciBmb3JtIGRhdGEgaXMgbG9hZGVkXG4gICAgICogVGhpcyBlbnN1cmVzIHZhbGlkYXRpb24gb25seSBoYXBwZW5zIGFmdGVyIHBhc3N3b3JkIGlzIHBvcHVsYXRlZCBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZvcm1EYXRhIC0gVGhlIGZvcm0gZGF0YSBsb2FkZWQgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQYXNzd29yZFdpZGdldChmb3JtRGF0YSkge1xuICAgICAgICBpZiAoIWV4dGVuc2lvbi4kc2lwX3NlY3JldC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhpZGUgYW55IGxlZ2FjeSBidXR0b25zIGlmIHRoZXkgZXhpc3RcbiAgICAgICAgJCgnLmNsaXBib2FyZCcpLmhpZGUoKTtcbiAgICAgICAgJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpLmhpZGUoKTtcblxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyBleHRlbnNpb24gKG5vIElEKSBvciBleGlzdGluZyBvbmVcbiAgICAgICAgY29uc3QgaXNOZXdFeHRlbnNpb24gPSAhZm9ybURhdGEuaWQgfHwgZm9ybURhdGEuaWQgPT09ICcnO1xuXG4gICAgICAgIGNvbnN0IHdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQoZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LCB7XG4gICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlQsICAvLyBTb2Z0IHZhbGlkYXRpb24gLSBzaG93IHdhcm5pbmdzIGJ1dCBhbGxvdyBzdWJtaXNzaW9uXG4gICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSwgICAgICAgICAvLyBTaG93IGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLCAgICAgLy8gU2hvdyBzaG93L2hpZGUgcGFzc3dvcmQgdG9nZ2xlXG4gICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsICAgICAgICAvLyBTaG93IGNvcHkgdG8gY2xpcGJvYXJkIGJ1dHRvblxuICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLCAgICAgICAgLy8gU2hvdyBwYXNzd29yZCBzdHJlbmd0aCBiYXJcbiAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSwgICAgICAgICAgIC8vIFNob3cgdmFsaWRhdGlvbiB3YXJuaW5nc1xuICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLCAgICAgICAgLy8gVmFsaWRhdGUgYXMgdXNlciB0eXBlc1xuICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWUsIC8vIEFsd2F5cyB2YWxpZGF0ZSBpZiBwYXNzd29yZCBmaWVsZCBoYXMgdmFsdWVcbiAgICAgICAgICAgIG1pblNjb3JlOiAzMCwgICAgICAgICAgICAgICAgIC8vIFNJUCBwYXNzd29yZHMgaGF2ZSBsb3dlciBtaW5pbXVtIHNjb3JlIHJlcXVpcmVtZW50XG4gICAgICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMjAsICAgICAgICAgICAvLyAyMCBjaGFycyBtYXggZm9yIEdyYW5kc3RyZWFtIEdETVMgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgaW5jbHVkZVNwZWNpYWw6IGZhbHNlLCAgICAgICAgLy8gRXhjbHVkZSBzcGVjaWFsIGNoYXJhY3RlcnMgZm9yIFNJUCBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICBvbkdlbmVyYXRlOiAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblZhbGlkYXRlOiAoaXNWYWxpZCwgc2NvcmUsIG1lc3NhZ2VzKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gT3B0aW9uYWw6IEhhbmRsZSB2YWxpZGF0aW9uIHJlc3VsdHMgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgLy8gVGhlIHdpZGdldCB3aWxsIGhhbmRsZSB2aXN1YWwgZmVlZGJhY2sgYXV0b21hdGljYWxseVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIHdpZGdldCBpbnN0YW5jZSBmb3IgbGF0ZXIgdXNlXG4gICAgICAgIGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBuZXcgZXh0ZW5zaW9ucyBvbmx5OiBhdXRvLWdlbmVyYXRlIHBhc3N3b3JkIGlmIGZpZWxkIGlzIGVtcHR5XG4gICAgICAgIGlmIChpc05ld0V4dGVuc2lvbiAmJiBleHRlbnNpb24uJHNpcF9zZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBleHRlbnNpb24uJHNpcF9zZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRnZW5lcmF0ZUJ0bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICRnZW5lcmF0ZUJ0bi50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRFRNRiBtb2RlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNzaXBfZHRtZm1vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfSk7XG4gICAgIH0sXG4gICAgICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJhbnNwb3J0IHByb3RvY29sIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNzaXBfdHJhbnNwb3J0LWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggZW1wbG95ZWUgbmFtZSBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBlbXBsb3llZU5hbWUgLSBOYW1lIG9mIHRoZSBlbXBsb3llZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb25OdW1iZXIgLSBFeHRlbnNpb24gbnVtYmVyIChvcHRpb25hbClcbiAgICAgKi9cbiAgICB1cGRhdGVQYWdlSGVhZGVyKGVtcGxveWVlTmFtZSwgZXh0ZW5zaW9uTnVtYmVyKSB7XG4gICAgICAgIGxldCBoZWFkZXJUZXh0O1xuXG4gICAgICAgIGlmIChlbXBsb3llZU5hbWUgJiYgZW1wbG95ZWVOYW1lLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIC8vIEV4aXN0aW5nIGVtcGxveWVlIHdpdGggbmFtZVxuICAgICAgICAgICAgaGVhZGVyVGV4dCA9ICc8aSBjbGFzcz1cInVzZXIgb3V0bGluZSBpY29uXCI+PC9pPiAnICsgZW1wbG95ZWVOYW1lO1xuXG4gICAgICAgICAgICAvLyBBZGQgZXh0ZW5zaW9uIG51bWJlciBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25OdW1iZXIgJiYgZXh0ZW5zaW9uTnVtYmVyLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJUZXh0ICs9ICcgJmx0OycgKyBleHRlbnNpb25OdW1iZXIgKyAnJmd0Oyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOZXcgZW1wbG95ZWUgb3Igbm8gbmFtZSB5ZXRcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfQ3JlYXRlTmV3RXh0ZW5zaW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIG1haW4gaGVhZGVyIGNvbnRlbnRcbiAgICAgICAgJCgnaDEgLmNvbnRlbnQnKS5odG1sKGhlYWRlclRleHQpO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBEZWZpbmUgYSBjdXN0b20gcnVsZSBmb3IgalF1ZXJ5IGZvcm0gdmFsaWRhdGlvbiBuYW1lZCAnZXh0ZW5zaW9uUnVsZScuXG4gKiBUaGUgcnVsZSBjaGVja3MgaWYgYSBmb3J3YXJkaW5nIG51bWJlciBpcyBzZWxlY3RlZCBidXQgdGhlIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRoZSB2YWxpZGF0aW9uIHJlc3VsdC4gSWYgZm9yd2FyZGluZyBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgaXQgcmV0dXJucyBmYWxzZSAoaW52YWxpZCkuIE90aGVyd2lzZSwgaXQgcmV0dXJucyB0cnVlICh2YWxpZCkuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbnNpb25SdWxlID0gKCkgPT4ge1xuICAgIC8vIEdldCByaW5nIGxlbmd0aCBhbmQgZm9yd2FyZGluZyBudW1iZXIgZnJvbSB0aGUgZm9ybVxuICAgIGNvbnN0IGZ3ZFJpbmdMZW5ndGggPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk7XG4gICAgY29uc3QgZndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcblxuICAgIC8vIElmIGZvcndhcmRpbmcgbnVtYmVyIGlzIHNldCBhbmQgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LCByZXR1cm4gZmFsc2UgKGludmFsaWQpXG4gICAgaWYgKGZ3ZEZvcndhcmRpbmcubGVuZ3RoID4gMFxuICAgICAgICAmJiAoXG4gICAgICAgICAgICBmd2RSaW5nTGVuZ3RoID09PSAwXG4gICAgICAgICAgICB8fFxuICAgICAgICAgICAgZndkUmluZ0xlbmd0aCA9PT0gJydcbiAgICAgICAgKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCByZXR1cm4gdHJ1ZSAodmFsaWQpXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgbnVtYmVyIGlzIHRha2VuIGJ5IGFub3RoZXIgYWNjb3VudFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHBhcmFtZXRlciBoYXMgdGhlICdoaWRkZW4nIGNsYXNzLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG5cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5wYXNzd29yZFN0cmVuZ3RoID0gKCkgPT4ge1xuICAgIC8vIENoZWNrIGlmIHBhc3N3b3JkIHdpZGdldCBleGlzdHMgYW5kIHBhc3N3b3JkIG1lZXRzIG1pbmltdW0gc2NvcmVcbiAgICBpZiAoZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gUGFzc3dvcmRXaWRnZXQuZ2V0U3RhdGUoZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0KTtcbiAgICAgICAgcmV0dXJuIHN0YXRlICYmIHN0YXRlLnNjb3JlID49IDMwOyAvLyBNaW5pbXVtIHNjb3JlIGZvciBleHRlbnNpb25zXG4gICAgfVxuICAgIHJldHVybiB0cnVlOyAvLyBQYXNzIHZhbGlkYXRpb24gaWYgd2lkZ2V0IG5vdCBpbml0aWFsaXplZFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFbXBsb3llZSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb24uaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=