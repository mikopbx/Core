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
    extension.$mobile_dialstring = $('#mobile_dialstring');
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
    }); // Set up the input masks for the mobile number input.
    //
    // The mask list is partitioned so that masks WITHOUT a leading "+" (plain national
    // and short-number formats) are matched before the per-country "+" masks. Combined
    // with the plain 7-digit formats in InputMaskPatterns, this lets short internal
    // numbers (5/6/7 digits) keep a plain format and complete/save instead of being
    // hijacked by a country-code mask (e.g. "+211-11-___-____") that never completes
    // and blocks the save (issue #1081 follow-up). Numbers longer than 7 digits, or any
    // value starting with "+", have no plain match left and fall through to the full
    // per-country international formatting automatically.

    var sortedMaskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
    var mobileMaskList = sortedMaskList.filter(function (item) {
      return item.mask.charAt(0) !== '+';
    }).concat(sortedMaskList.filter(function (item) {
      return item.mask.charAt(0) === '+';
    })); // Reusable (re)initialiser so the dial-string auto-fill below can re-apply the mask
    // to a freshly injected raw value without it being truncated by the previous mask.

    extension.initMobileMask = function () {
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
          showMaskOnHover: false
        },
        match: /[0-9]/,
        replace: '9',
        list: mobileMaskList,
        listKey: 'mask'
      });
    };

    extension.initMobileMask(); // Add handler for programmatic value changes (for tests and automation)

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
    }); // When the dial string override is filled while the mobile number is still empty,
    // copy it into the (empty) mobile number and let the mask engage. Without a mobile
    // number the backend drops the whole ExternalPhones row on save, silently clearing
    // the dial string the user just typed (issue #1081 follow-up).

    extension.$mobile_dialstring.on('change', function () {
      var dialstring = (this.value || '').trim();
      var currentMobile = extension.$mobile_number.data('inputmask') ? extension.$mobile_number.inputmask('unmaskedvalue') : extension.$mobile_number.val() || ''; // Only auto-fill from a plain phone-number dial string (optional leading "+").
      // A non-numeric dial string (e.g. "SIP/trunk/123") would be mangled by the
      // digit-only mask, so it is left untouched.

      if (/^\+?\d+$/.test(dialstring) && currentMobile === '') {
        // Remove the current mask, inject the raw value (so it is not truncated by a
        // shorter active mask), then re-initialise so the right mask is chosen and
        // formatting applied. 'change' keeps dependent handlers (availability) in sync.
        // NOTE: inputmasks('remove') nulls the `.inputmasks` method on the jQuery
        // object it is called on, so call it on a throwaway wrapper, not the cached one.
        $('#mobile_number').inputmasks('remove');
        extension.$mobile_number.val(dialstring);
        extension.initMobileMask();
        extension.$mobile_number.trigger('change');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJHNpcF9zZWNyZXQiLCIkbW9iaWxlX251bWJlciIsIiRmd2RfZm9yd2FyZGluZyIsIiRmd2RfZm9yd2FyZGluZ29uYnVzeSIsIiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCIkZW1haWwiLCIkdXNlcl91c2VybmFtZSIsInBhc3N3b3JkV2lkZ2V0IiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsImV4X1ZhbGlkYXRlUGFzc3dvcmRUb29XZWFrIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiJCIsIiRtb2JpbGVfZGlhbHN0cmluZyIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImFjY29yZGlvbiIsInBvcHVwIiwib24iLCJhdHRyIiwiaW5pdGlhbGl6ZUZvcm0iLCJjdXJyZW50TnVtYmVyIiwiaW5wdXRtYXNrIiwidmFsIiwidXBkYXRlUGFnZUhlYWRlciIsImN1cnJlbnRVc2VybmFtZSIsIkV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIiwiZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJhcHBseUFDTFBlcm1pc3Npb25zIiwibG9hZEV4dGVuc2lvbkRhdGEiLCJBQ0xIZWxwZXIiLCJjb25zb2xlIiwid2FybiIsImFwcGx5UGVybWlzc2lvbnMiLCJzYXZlIiwic2hvdyIsImVuYWJsZSIsImNhblNhdmUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJkaXNhYmxlIiwiaW5mb01lc3NhZ2UiLCJleF9Ob1Blcm1pc3Npb25Ub01vZGlmeSIsIlVzZXJNZXNzYWdlIiwic2hvd0luZm9ybWF0aW9uIiwiY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlIiwicGFzdGVkVmFsdWUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJuZXdOdW1iZXIiLCJ1c2VySWQiLCJmb3JtIiwiRXh0ZW5zaW9uc0FQSSIsImNoZWNrQXZhaWxhYmlsaXR5IiwiY2JPbkNvbXBsZXRlRW1haWwiLCJuZXdFbWFpbCIsIlVzZXJzQVBJIiwiY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyIiwibmV3TW9iaWxlTnVtYmVyIiwiY3VycmVudERpYWxzdHJpbmciLCJsZW5ndGgiLCJ1c2VyTmFtZSIsImN1cnJlbnRGd2RGb3J3YXJkaW5nIiwiY3VycmVudEZ3ZE9uQnVzeSIsImN1cnJlbnRGd2RPblVuYXZhaWxhYmxlIiwiRXh0ZW5zaW9uU2VsZWN0b3IiLCJzZXRWYWx1ZSIsImNiT25DbGVhcmVkTW9iaWxlTnVtYmVyIiwiY2xlYXIiLCJpbml0aWFsaXplSW5wdXRNYXNrcyIsInRpbWVvdXROdW1iZXJJZCIsImV4dGVuc2lvbnNMZW5ndGgiLCJwYXJzZUludCIsIm1hc2siLCJwbGFjZWhvbGRlciIsIm9uY29tcGxldGUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0Iiwic29ydGVkTWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsIm1vYmlsZU1hc2tMaXN0IiwiZmlsdGVyIiwiaXRlbSIsImNoYXJBdCIsImNvbmNhdCIsImluaXRNb2JpbGVNYXNrIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9yaWdpbmFsVmFsIiwiZm4iLCJvZmYiLCIkdGhpcyIsImFyZ3MiLCJhcmd1bWVudHMiLCJuZXdWYWx1ZSIsImRhdGEiLCJhcHBseSIsInRyaWdnZXIiLCJlIiwicHJldmVudERlZmF1bHQiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwicHJvY2Vzc2VkRGF0YSIsInNsaWNlIiwiaW5wdXQiLCJzdGFydCIsInNlbGVjdGlvblN0YXJ0IiwiZW5kIiwic2VsZWN0aW9uRW5kIiwiY3VycmVudFZhbHVlIiwic3Vic3RyaW5nIiwidGltZW91dEVtYWlsSWQiLCJmb2N1c291dCIsInBob25lIiwidGFyZ2V0IiwiZGlhbHN0cmluZyIsInZhbHVlIiwidHJpbSIsImN1cnJlbnRNb2JpbGUiLCJ0ZXN0IiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIiRnZW5lcmF0ZUJ0biIsImNsb3Nlc3QiLCJmaW5kIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGlycnR5Iiwic3VibWl0TW9kZSIsInVzZXJfaWQiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInVwZGF0ZVBob25lUmVwcmVzZW50Iiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJGb3JtIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiRW1wbG95ZWVzQVBJIiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJhcGlJZCIsImhpZGUiLCJnZXRSZWNvcmQiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm1XaXRoRGF0YSIsImF2YXRhciIsInNob3dFcnJvciIsImVycm9yIiwidXJsUGFydHMiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJleHRlbnNpb25zX2xlbmd0aCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEiLCJ0ZXh0Iiwic2V0QXZhdGFyVXJsIiwidXNlcl9hdmF0YXIiLCJFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yIiwiaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0IiwiZm9yd2FyZGluZ0ZpZWxkcyIsImZvckVhY2giLCJmaWVsZE5hbWUiLCJpbnN0YW5jZXMiLCJoYXMiLCJkZXN0cm95IiwiJGRyb3Bkb3duIiwicmVtb3ZlIiwiaW5pdCIsImV4Y2x1ZGVFeHRlbnNpb25zIiwiaW5jbHVkZUVtcHR5IiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJleF9TZWxlY3ROZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJuZXdFeHRlbnNpb24iLCJ1cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uIiwiaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24iLCJpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24iLCJjdXJyZW50VGV4dCIsIm5vdCIsImh0bWwiLCJyZWZyZXNoRGF0YSIsImlzTmV3RXh0ZW5zaW9uIiwiaWQiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsInZhbGlkYXRpb24iLCJWQUxJREFUSU9OIiwiU09GVCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwidmFsaWRhdGVPbklucHV0IiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwiaW5jbHVkZVNwZWNpYWwiLCJvbkdlbmVyYXRlIiwicGFzc3dvcmQiLCJkYXRhQ2hhbmdlZCIsIm9uVmFsaWRhdGUiLCJpc1ZhbGlkIiwic2NvcmUiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiZW1wbG95ZWVOYW1lIiwiZXh0ZW5zaW9uTnVtYmVyIiwiaGVhZGVyVGV4dCIsImV4X0NyZWF0ZU5ld0V4dGVuc2lvbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwicGFzc3dvcmRTdHJlbmd0aCIsInN0YXRlIiwiZ2V0U3RhdGUiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxTQUFTLEdBQUc7QUFDZEMsRUFBQUEsWUFBWSxFQUFFLEVBREE7QUFFZEMsRUFBQUEsYUFBYSxFQUFFLEVBRkQ7QUFHZEMsRUFBQUEsbUJBQW1CLEVBQUUsRUFIUDs7QUFJZDtBQUNK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QztBQUNBLE1BQUl0UixTQUFTLENBQUNZLGNBQWQsRUFBOEI7QUFDMUIsUUFBTTJRLEtBQUssR0FBR2pDLGNBQWMsQ0FBQ2tDLFFBQWYsQ0FBd0J4UixTQUFTLENBQUNZLGNBQWxDLENBQWQ7QUFDQSxXQUFPMlEsS0FBSyxJQUFJQSxLQUFLLENBQUNkLEtBQU4sSUFBZSxFQUEvQixDQUYwQixDQUVTO0FBQ3RDOztBQUNELFNBQU8sSUFBUCxDQU44QyxDQU1qQztBQUNoQixDQVBEO0FBU0E7QUFDQTtBQUNBOzs7QUFDQTFOLENBQUMsQ0FBQzBPLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIxUixFQUFBQSxTQUFTLENBQUM4QyxVQUFWO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnNBUEksIEVtcGxveWVlc0FQSSwgRm9ybSxcbiBJbnB1dE1hc2tQYXR0ZXJucywgYXZhdGFyLCBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yLCBDbGlwYm9hcmRKUywgUGFzc3dvcmRXaWRnZXQsIFVzZXJNZXNzYWdlLCBBQ0xIZWxwZXIgKi9cblxuXG4vKipcbiAqIFRoZSBleHRlbnNpb24gb2JqZWN0LlxuICogTWFuYWdlcyB0aGUgb3BlcmF0aW9ucyBhbmQgYmVoYXZpb3JzIG9mIHRoZSBleHRlbnNpb24gZWRpdCBmb3JtXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25cbiAqL1xuY29uc3QgZXh0ZW5zaW9uID0ge1xuICAgIGRlZmF1bHRFbWFpbDogJycsXG4gICAgZGVmYXVsdE51bWJlcjogJycsXG4gICAgZGVmYXVsdE1vYmlsZU51bWJlcjogJycsXG4gICAgLyoqXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG51bWJlcjogbnVsbCxcbiAgICAkc2lwX3NlY3JldDogbnVsbCxcbiAgICAkbW9iaWxlX251bWJlcjogbnVsbCxcbiAgICAkZndkX2ZvcndhcmRpbmc6IG51bGwsXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb25idXN5OiBudWxsLFxuICAgICRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IG51bGwsXG4gICAgJGVtYWlsOiBudWxsLFxuICAgICR1c2VyX3VzZXJuYW1lOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogUGFzc3dvcmQgd2lkZ2V0IGluc3RhbmNlLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgcGFzc3dvcmRXaWRnZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYnVsYXIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51SXRlbXM6IG51bGwsXG5cblxuICAgIC8qKlxuICAgICAqIFN0cmluZyBmb3IgdGhlIGZvcndhcmRpbmcgc2VsZWN0LlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZm9yd2FyZGluZ1NlbGVjdDogJyNleHRlbnNpb25zLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBudW1iZXI6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdudW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW251bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBtb2JpbGVfbnVtYmVyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWFzaycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcl9lbWFpbDoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl9lbWFpbCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX3VzZXJuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl91c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzaXBfc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlU2VjcmV0V2VhayxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3Bhc3N3b3JkU3RyZW5ndGgnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVBhc3N3b3JkVG9vV2Vha1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9yaW5nbGVuZ3RoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuICAgICAgICAgICAgZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb24gZm9ybSBhbmQgaXRzIGludGVyYWN0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBSZXNvbHZlIGpRdWVyeSB3cmFwcGVycyBoZXJlIOKAlCBhdCBtb2R1bGUtbG9hZCB0aW1lIGpRdWVyeSBtYXlcbiAgICAgICAgLy8gbm90IHlldCBiZSBkZWZpbmVkIChTZW50cnkgTUlLT1BCWC1NRzkgcGF0dGVybikuXG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyID0gJCgnI251bWJlcicpO1xuICAgICAgICBleHRlbnNpb24uJHNpcF9zZWNyZXQgPSAkKCcjc2lwX3NlY3JldCcpO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIgPSAkKCcjbW9iaWxlX251bWJlcicpO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9kaWFsc3RyaW5nID0gJCgnI21vYmlsZV9kaWFsc3RyaW5nJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmcgPSAkKCcjZndkX2ZvcndhcmRpbmcnKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29uYnVzeSA9ICQoJyNmd2RfZm9yd2FyZGluZ29uYnVzeScpO1xuICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSA9ICQoJyNmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbCA9ICQoJyN1c2VyX2VtYWlsJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kdXNlcl91c2VybmFtZSA9ICQoJyN1c2VyX3VzZXJuYW1lJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iaiA9ICQoJyNleHRlbnNpb25zLWZvcm0nKTtcbiAgICAgICAgZXh0ZW5zaW9uLiR0YWJNZW51SXRlbXMgPSAkKCcjZXh0ZW5zaW9ucy1tZW51IC5pdGVtJyk7XG5cbiAgICAgICAgLy8gRGVmYXVsdCB2YWx1ZXMgd2lsbCBiZSBzZXQgYWZ0ZXIgUkVTVCBBUEkgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIGVtcHR5IHZhbHVlcyBzaW5jZSBmb3JtcyBhcmUgZW1wdHkgdW50aWwgQVBJIHJlc3BvbmRzXG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPSAnJztcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSAnJztcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSAnJztcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYiBtZW51IGl0ZW1zLCBhY2NvcmRpb25zLCBhbmQgZHJvcGRvd24gbWVudXNcbiAgICAgICAgZXh0ZW5zaW9uLiR0YWJNZW51SXRlbXMudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICB9KTtcbiAgICAgICAgJCgnI2V4dGVuc2lvbnMtZm9ybSAudWkuYWNjb3JkaW9uJykuYWNjb3JkaW9uKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgZm9yIHF1ZXN0aW9uIGljb25zIGFuZCBidXR0b25zXG4gICAgICAgICQoXCJpLnF1ZXN0aW9uXCIpLnBvcHVwKCk7XG4gICAgICAgICQoJy5wb3B1cGVkJykucG9wdXAoKTtcblxuICAgICAgICAvLyBQcmV2ZW50IGJyb3dzZXIgcGFzc3dvcmQgbWFuYWdlciBmb3IgZ2VuZXJhdGVkIHBhc3N3b3Jkc1xuICAgICAgICBleHRlbnNpb24uJHNpcF9zZWNyZXQub24oJ2ZvY3VzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ2F1dG9jb21wbGV0ZScsICduZXctcGFzc3dvcmQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIGZvcm1cbiAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGhhbmRsZXIgZm9yIHVzZXJuYW1lIGNoYW5nZSB0byB1cGRhdGUgcGFnZSB0aXRsZVxuICAgICAgICBleHRlbnNpb24uJHVzZXJfdXNlcm5hbWUub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrID8gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykgOiBleHRlbnNpb24uJG51bWJlci52YWwoKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVQYWdlSGVhZGVyKCQodGhpcykudmFsKCksIGN1cnJlbnROdW1iZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBbHNvIHVwZGF0ZSBoZWFkZXIgd2hlbiBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXNcbiAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VXNlcm5hbWUgPSBleHRlbnNpb24uJHVzZXJfdXNlcm5hbWUudmFsKCk7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50TnVtYmVyID0gJCh0aGlzKS5pbnB1dG1hc2sgPyAkKHRoaXMpLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpIDogJCh0aGlzKS52YWwoKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVQYWdlSGVhZGVyKGN1cnJlbnRVc2VybmFtZSwgY3VycmVudE51bWJlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGFkdmFuY2VkIHNldHRpbmdzIHVzaW5nIHVuaWZpZWQgc3lzdGVtXG4gICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFeHRlbnNpb25Ub29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gb2xkIG5hbWUgaWYgbmV3IGNsYXNzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFwcGx5IEFDTCBwZXJtaXNzaW9ucyB0byBVSSBlbGVtZW50c1xuICAgICAgICBleHRlbnNpb24uYXBwbHlBQ0xQZXJtaXNzaW9ucygpO1xuXG4gICAgICAgIC8vIExvYWQgZXh0ZW5zaW9uIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICAgIGV4dGVuc2lvbi5sb2FkRXh0ZW5zaW9uRGF0YSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBBQ0wgcGVybWlzc2lvbnMgdG8gVUkgZWxlbWVudHNcbiAgICAgKiBTaG93cy9oaWRlcyBidXR0b25zIGFuZCBmb3JtIGVsZW1lbnRzIGJhc2VkIG9uIHVzZXIgcGVybWlzc2lvbnNcbiAgICAgKi9cbiAgICBhcHBseUFDTFBlcm1pc3Npb25zKCkge1xuICAgICAgICAvLyBDaGVjayBpZiBBQ0wgSGVscGVyIGlzIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIEFDTEhlbHBlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignQUNMSGVscGVyIGlzIG5vdCBhdmFpbGFibGUsIHNraXBwaW5nIEFDTCBjaGVja3MnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFwcGx5IHBlcm1pc3Npb25zIHVzaW5nIEFDTEhlbHBlclxuICAgICAgICBBQ0xIZWxwZXIuYXBwbHlQZXJtaXNzaW9ucyh7XG4gICAgICAgICAgICBzYXZlOiB7XG4gICAgICAgICAgICAgICAgc2hvdzogJyNzdWJtaXRidXR0b24sICNkcm9wZG93blN1Ym1pdCcsXG4gICAgICAgICAgICAgICAgZW5hYmxlOiAnI2V4dGVuc2lvbnMtZm9ybSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWxldGU6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAnLmRlbGV0ZS1idXR0b24sIC50d28tc3RlcHMtZGVsZXRlJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNoZWNrcyBmb3Igc3BlY2lmaWMgYWN0aW9uc1xuICAgICAgICBpZiAoIUFDTEhlbHBlci5jYW5TYXZlKCkpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgZm9ybSBpZiB1c2VyIGNhbm5vdCBzYXZlXG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIGlucHV0LCAjZXh0ZW5zaW9ucy1mb3JtIHNlbGVjdCwgI2V4dGVuc2lvbnMtZm9ybSB0ZXh0YXJlYScpXG4gICAgICAgICAgICAgICAgLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSlcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgcGFzc3dvcmQgd2lkZ2V0XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0LmRpc2FibGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2hvdyBpbmZvIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0IGluZm9NZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlLmV4X05vUGVybWlzc2lvblRvTW9kaWZ5IHx8ICdZb3UgZG8gbm90IGhhdmUgcGVybWlzc2lvbiB0byBtb2RpZnkgZXh0ZW5zaW9ucyc7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24oaW5mb01lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBtb2JpbGUgbnVtYmVyIGZyb20gY2xpcGJvYXJkXG4gICAgICovXG4gICAgY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgYWZ0ZXIgYSBwaG9uZSBudW1iZXIgaGFzIGJlZW4gZW50ZXJlZCBjb21wbGV0ZWx5LlxuICAgICAqIEl0IHNlcnZlcyB0byBjaGVjayBpZiB0aGVyZSBhcmUgYW55IGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIHBob25lIG51bWJlcnMuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgYWZ0ZXIgcmVtb3ZpbmcgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBDYWxsIHRoZSBgY2hlY2tBdmFpbGFiaWxpdHlgIGZ1bmN0aW9uIG9uIGBFeHRlbnNpb25zYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgaXMgYWxyZWFkeSBpbiB1c2UuXG4gICAgICAgIC8vIFBhcmFtZXRlcnM6IGRlZmF1bHQgbnVtYmVyLCBuZXcgbnVtYmVyLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKG51bWJlciksIHVzZXIgaWRcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE51bWJlciwgbmV3TnVtYmVyLCAnbnVtYmVyJywgdXNlcklkKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIG9uY2UgYW4gZW1haWwgYWRkcmVzcyBoYXMgYmVlbiBjb21wbGV0ZWx5IGVudGVyZWQuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGFmdGVyIHJlbW92aW5nIGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld0VtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGBjaGVja0F2YWlsYWJpbGl0eWAgZnVuY3Rpb24gb24gYFVzZXJzQVBJYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBlbWFpbCBpcyBhbHJlYWR5IGluIHVzZS5cbiAgICAgICAgLy8gUGFyYW1ldGVyczogZGVmYXVsdCBlbWFpbCwgbmV3IGVtYWlsLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKGVtYWlsKSwgdXNlciBpZFxuICAgICAgICBVc2Vyc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdEVtYWlsLCBuZXdFbWFpbCwnZW1haWwnLCB1c2VySWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBY3RpdmF0ZWQgd2hlbiBlbnRlcmluZyBhIG1vYmlsZSBwaG9uZSBudW1iZXIgaW4gdGhlIGVtcGxveWVlJ3MgcHJvZmlsZS5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgd2l0aG91dCBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gR2V0IHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBEeW5hbWljIGNoZWNrIHRvIHNlZSBpZiB0aGUgc2VsZWN0ZWQgbW9iaWxlIG51bWJlciBpcyBhdmFpbGFibGVcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cbiAgICAgICAgLy8gUmVmaWxsIHRoZSBtb2JpbGUgZGlhbHN0cmluZyBvbmx5IHdoZW4gaXQgd2FzIGxlZnQgYXQgaXRzIGRlZmF1bHQgKGVxdWFsIHRvIHRoZSBvbGQgbW9iaWxlIG51bWJlcilcbiAgICAgICAgLy8gb3IgZW1wdHkuIEEgdXNlci1kZWZpbmVkIGRpYWwgc3RyaW5nIG92ZXJyaWRlIG11c3Qgc3Vydml2ZSBhIG1vYmlsZSBudW1iZXIgY2hhbmdlIChpc3N1ZSAjMTA4MSkuXG4gICAgICAgIGNvbnN0IGN1cnJlbnREaWFsc3RyaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycpO1xuICAgICAgICBpZiAoY3VycmVudERpYWxzdHJpbmcgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyXG4gICAgICAgICAgICB8fCBjdXJyZW50RGlhbHN0cmluZy5sZW5ndGggPT09IDBcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2JpbGUgbnVtYmVyIGhhcyBjaGFuZ2VkXG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyB1c2VybmFtZSBmcm9tIHRoZSBmb3JtXG4gICAgICAgICAgICBjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9yd2FyZGluZyBmaWVsZHMgdGhhdCBtYXRjaCB0aGUgb2xkIG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEZ3ZE9uQnVzeSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZ3ZF9mb3J3YXJkaW5nIGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkRm9yd2FyZGluZyA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblxuICAgICAgICAgICAgICAgIC8vIFNldCByaW5nIGxlbmd0aCBpZiBlbXB0eVxuICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgICAgICAgIHx8IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKT09PVwiMFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCA0NSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5zZXRWYWx1ZSgnZndkX2ZvcndhcmRpbmcnLCBuZXdNb2JpbGVOdW1iZXIsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZndkX2ZvcndhcmRpbmdvbmJ1c3kgaWYgaXQgbWF0Y2hlcyBvbGQgbW9iaWxlIG51bWJlciAoaW5jbHVkaW5nIGVtcHR5KVxuICAgICAgICAgICAgaWYgKGN1cnJlbnRGd2RPbkJ1c3kgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5zZXRWYWx1ZSgnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLnNldFZhbHVlKCdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCBuZXdNb2JpbGVOdW1iZXIsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFNldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgYXMgdGhlIGRlZmF1bHRcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBuZXdNb2JpbGVOdW1iZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxlZCB3aGVuIHRoZSBtb2JpbGUgcGhvbmUgbnVtYmVyIGlzIGNsZWFyZWQgaW4gdGhlIGVtcGxveWVlIGNhcmQuXG4gICAgICovXG4gICAgY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIENoZWNrIGN1cnJlbnQgZm9yd2FyZGluZyB2YWx1ZXMgYmVmb3JlIGNsZWFyaW5nXG4gICAgICAgIGNvbnN0IGN1cnJlbnRGd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICBjb25zdCBjdXJyZW50RndkT25CdXN5ID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpO1xuICAgICAgICBjb25zdCBjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB0aGUgJ21vYmlsZV9kaWFsc3RyaW5nJyBhbmQgJ21vYmlsZV9udW1iZXInIGZpZWxkcyBpbiB0aGUgZm9ybVxuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgJycpO1xuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9udW1iZXInLCAnJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChjdXJyZW50RndkRm9yd2FyZGluZyA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIElmIHNvLCBjbGVhciB0aGUgJ2Z3ZF9yaW5nbGVuZ3RoJyBmaWVsZCBhbmQgY2xlYXIgZm9yd2FyZGluZyBkcm9wZG93blxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDApO1xuICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmNsZWFyKCdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIGJ1c3kgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoY3VycmVudEZ3ZE9uQnVzeSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiB1bmF2YWlsYWJsZSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBpbnB1dCBtYXNrcyBmb3IgdGhlIGV4dGVuc2lvbiBudW1iZXIgYW5kIG1vYmlsZSBudW1iZXIgZmllbGRzLlxuICAgICAqXG4gICAgICogVGhlIGV4dGVuc2lvbiBudW1iZXIgbWFzayBsZW5ndGggaXMgZHJpdmVuIGJ5IHRoZSBBUEk6IGl0IHVzZXNcbiAgICAgKiBgZXh0ZW5zaW9uLmV4dGVuc2lvbnNMZW5ndGhgIChwb3B1bGF0ZWQgZnJvbSB0aGUgc2VydmVyLCBubyBKYXZhU2NyaXB0IGRlZmF1bHQpXG4gICAgICogdG8gYnVpbGQgYSBgOXsyLE59YCBkaWdpdCBtYXNrLCBhcHBsaWVkIG9ubHkgd2hlbiBOIGlzIGJldHdlZW4gMiBhbmQgMTAuXG4gICAgICogSXRzIGBvbmNvbXBsZXRlYCBoYW5kbGVyIGlzIGRlYm91bmNlZCB3aXRoIGEgNTAwbXMgc2V0VGltZW91dCAoY2xlYXJpbmcgYW55XG4gICAgICogcGVuZGluZyB0aW1lcikgYmVmb3JlIGludm9raW5nIGBjYk9uQ29tcGxldGVOdW1iZXIoKWAuXG4gICAgICpcbiAgICAgKiBBbHNvIGNvbmZpZ3VyZXMgdGhlIG1vYmlsZSBudW1iZXIgbWFza3MgZnJvbSBgSW5wdXRNYXNrUGF0dGVybnNgLCBhIHBhc3RlXG4gICAgICogaGFuZGxlciwgYW5kIGEgYHZhbC5vdmVycmlkZWAgZXZlbnQgaGFuZGxlciB0aGF0IHRlbXBvcmFyaWx5IHJlbW92ZXMgdGhlXG4gICAgICogbWFzayBzbyBhIHZhbHVlIGNhbiBiZSBzZXQgcHJvZ3JhbW1hdGljYWxseSAodXNlZCBieSB0ZXN0cyBhbmQgYXV0b21hdGlvbikuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlucHV0TWFza3MoKXtcbiAgICAgICAgLy8gU2V0IHVwIG51bWJlciBpbnB1dCBtYXNrIHdpdGggY29ycmVjdCBsZW5ndGggZnJvbSBBUElcbiAgICAgICAgbGV0IHRpbWVvdXROdW1iZXJJZDtcblxuICAgICAgICAvLyBBbHdheXMgaW5pdGlhbGl6ZSBtYXNrIGJhc2VkIG9uIGV4dGVuc2lvbnNfbGVuZ3RoIGZyb20gQVBJXG4gICAgICAgIC8vIE5vIGRlZmF1bHRzIGluIEphdmFTY3JpcHQgLSB2YWx1ZSBtdXN0IGNvbWUgZnJvbSBBUElcbiAgICAgICAgaWYgKGV4dGVuc2lvbi5leHRlbnNpb25zTGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25zTGVuZ3RoID0gcGFyc2VJbnQoZXh0ZW5zaW9uLmV4dGVuc2lvbnNMZW5ndGgsIDEwKTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25zTGVuZ3RoID49IDIgJiYgZXh0ZW5zaW9uc0xlbmd0aCA8PSAxMCkge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgbWFzayB3aXRoIGNvcnJlY3QgbGVuZ3RoIGFuZCBvbmNvbXBsZXRlIGhhbmRsZXJcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soe1xuICAgICAgICAgICAgICAgICAgICBtYXNrOiBgOXsyLCR7ZXh0ZW5zaW9uc0xlbmd0aH19YCxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICdfJyxcbiAgICAgICAgICAgICAgICAgICAgb25jb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aW1lb3V0TnVtYmVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dE51bWJlcklkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXROdW1iZXJJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2tzIGZvciB0aGUgbW9iaWxlIG51bWJlciBpbnB1dC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGhlIG1hc2sgbGlzdCBpcyBwYXJ0aXRpb25lZCBzbyB0aGF0IG1hc2tzIFdJVEhPVVQgYSBsZWFkaW5nIFwiK1wiIChwbGFpbiBuYXRpb25hbFxuICAgICAgICAvLyBhbmQgc2hvcnQtbnVtYmVyIGZvcm1hdHMpIGFyZSBtYXRjaGVkIGJlZm9yZSB0aGUgcGVyLWNvdW50cnkgXCIrXCIgbWFza3MuIENvbWJpbmVkXG4gICAgICAgIC8vIHdpdGggdGhlIHBsYWluIDctZGlnaXQgZm9ybWF0cyBpbiBJbnB1dE1hc2tQYXR0ZXJucywgdGhpcyBsZXRzIHNob3J0IGludGVybmFsXG4gICAgICAgIC8vIG51bWJlcnMgKDUvNi83IGRpZ2l0cykga2VlcCBhIHBsYWluIGZvcm1hdCBhbmQgY29tcGxldGUvc2F2ZSBpbnN0ZWFkIG9mIGJlaW5nXG4gICAgICAgIC8vIGhpamFja2VkIGJ5IGEgY291bnRyeS1jb2RlIG1hc2sgKGUuZy4gXCIrMjExLTExLV9fXy1fX19fXCIpIHRoYXQgbmV2ZXIgY29tcGxldGVzXG4gICAgICAgIC8vIGFuZCBibG9ja3MgdGhlIHNhdmUgKGlzc3VlICMxMDgxIGZvbGxvdy11cCkuIE51bWJlcnMgbG9uZ2VyIHRoYW4gNyBkaWdpdHMsIG9yIGFueVxuICAgICAgICAvLyB2YWx1ZSBzdGFydGluZyB3aXRoIFwiK1wiLCBoYXZlIG5vIHBsYWluIG1hdGNoIGxlZnQgYW5kIGZhbGwgdGhyb3VnaCB0byB0aGUgZnVsbFxuICAgICAgICAvLyBwZXItY291bnRyeSBpbnRlcm5hdGlvbmFsIGZvcm1hdHRpbmcgYXV0b21hdGljYWxseS5cbiAgICAgICAgY29uc3Qgc29ydGVkTWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcbiAgICAgICAgY29uc3QgbW9iaWxlTWFza0xpc3QgPSBzb3J0ZWRNYXNrTGlzdFxuICAgICAgICAgICAgLmZpbHRlcihpdGVtID0+IGl0ZW0ubWFzay5jaGFyQXQoMCkgIT09ICcrJylcbiAgICAgICAgICAgIC5jb25jYXQoc29ydGVkTWFza0xpc3QuZmlsdGVyKGl0ZW0gPT4gaXRlbS5tYXNrLmNoYXJBdCgwKSA9PT0gJysnKSk7XG5cbiAgICAgICAgLy8gUmV1c2FibGUgKHJlKWluaXRpYWxpc2VyIHNvIHRoZSBkaWFsLXN0cmluZyBhdXRvLWZpbGwgYmVsb3cgY2FuIHJlLWFwcGx5IHRoZSBtYXNrXG4gICAgICAgIC8vIHRvIGEgZnJlc2hseSBpbmplY3RlZCByYXcgdmFsdWUgd2l0aG91dCBpdCBiZWluZyB0cnVuY2F0ZWQgYnkgdGhlIHByZXZpb3VzIG1hc2suXG4gICAgICAgIGV4dGVuc2lvbi5pbml0TW9iaWxlTWFzayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2tzKHtcbiAgICAgICAgICAgICAgICBpbnB1dG1hc2s6IHtcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICcjJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcjogJ1swLTldJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uY2xlYXJlZDogZXh0ZW5zaW9uLmNiT25DbGVhcmVkTW9iaWxlTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgICAgIGxpc3Q6IG1vYmlsZU1hc2tMaXN0LFxuICAgICAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBleHRlbnNpb24uaW5pdE1vYmlsZU1hc2soKTtcblxuICAgICAgICAvLyBBZGQgaGFuZGxlciBmb3IgcHJvZ3JhbW1hdGljIHZhbHVlIGNoYW5nZXMgKGZvciB0ZXN0cyBhbmQgYXV0b21hdGlvbilcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxWYWwgPSAkLmZuLnZhbDtcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLm9mZigndmFsLm92ZXJyaWRlJykub24oJ3ZhbC5vdmVycmlkZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgICAgICAgLy8gSWYgc2V0dGluZyBhIHZhbHVlIHByb2dyYW1tYXRpY2FsbHlcbiAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDAgJiYgdHlwZW9mIGFyZ3NbMF0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBhcmdzWzBdO1xuXG4gICAgICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgcmVtb3ZlIG1hc2tcbiAgICAgICAgICAgICAgICBpZiAoJHRoaXMuZGF0YSgnaW5wdXRtYXNrJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRoaXMuaW5wdXRtYXNrKCdyZW1vdmUnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIHZhbHVlXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxWYWwuYXBwbHkodGhpcywgYXJncyk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZWFwcGx5IG1hc2sgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkdGhpcy50cmlnZ2VyKCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTsgLy8gUHJldmVudCBkZWZhdWx0IHBhc3RlIGJlaGF2aW9yXG5cbiAgICAgICAgICAgIC8vIEdldCBwYXN0ZWQgZGF0YSBmcm9tIGNsaXBib2FyZFxuICAgICAgICAgICAgbGV0IHBhc3RlZERhdGEgPSAnJztcblxuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCBkYXRhIGZyb20gY2xpcGJvYXJkIGV2ZW50XG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50ICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlLmNsaXBib2FyZERhdGEgJiYgZS5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBEaXJlY3QgY2xpcGJvYXJkRGF0YSBhY2Nlc3NcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LmNsaXBib2FyZERhdGEgJiYgd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIEZvciBJRVxuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHdlIGNvdWxkbid0IGdldCBjbGlwYm9hcmQgZGF0YSwgZG9uJ3QgcHJvY2Vzc1xuICAgICAgICAgICAgaWYgKCFwYXN0ZWREYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQcm9jZXNzIHRoZSBwYXN0ZWQgZGF0YVxuICAgICAgICAgICAgbGV0IHByb2Nlc3NlZERhdGE7XG4gICAgICAgICAgICBpZiAocGFzdGVkRGF0YS5jaGFyQXQoMCkgPT09ICcrJykge1xuICAgICAgICAgICAgICAgIC8vIEtlZXAgJysnIGFuZCByZW1vdmUgb3RoZXIgbm9uLWRpZ2l0IGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICBwcm9jZXNzZWREYXRhID0gJysnICsgcGFzdGVkRGF0YS5zbGljZSgxKS5yZXBsYWNlKC9cXEQvZywgJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYWxsIG5vbi1kaWdpdCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgcHJvY2Vzc2VkRGF0YSA9IHBhc3RlZERhdGEucmVwbGFjZSgvXFxEL2csICcnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSW5zZXJ0IGNsZWFuZWQgZGF0YSBpbnRvIHRoZSBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgY29uc3QgaW5wdXQgPSB0aGlzO1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBpbnB1dC5zZWxlY3Rpb25TdGFydCB8fCAwO1xuICAgICAgICAgICAgY29uc3QgZW5kID0gaW5wdXQuc2VsZWN0aW9uRW5kIHx8IDA7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkKGlucHV0KS52YWwoKSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gY3VycmVudFZhbHVlLnN1YnN0cmluZygwLCBzdGFydCkgKyBwcm9jZXNzZWREYXRhICsgY3VycmVudFZhbHVlLnN1YnN0cmluZyhlbmQpO1xuXG4gICAgICAgICAgICAvLyBUZW1wb3JhcmlseSByZW1vdmUgbWFzaywgc2V0IHZhbHVlLCB0aGVuIHJlYXBwbHlcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soXCJyZW1vdmVcIik7XG4gICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIudmFsKG5ld1ZhbHVlKTtcblxuICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIHRoZSB2YWx1ZSBpcyBzZXQgYmVmb3JlIHJlYXBwbHlpbmcgbWFza1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBpbnB1dCBldmVudCB0byByZWFwcGx5IHRoZSBtYXNrXG4gICAgICAgICAgICAgICAgJChpbnB1dCkudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrIGZvciB0aGUgZW1haWwgaW5wdXRcbiAgICAgICAgbGV0IHRpbWVvdXRFbWFpbElkO1xuICAgICAgICBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygnZW1haWwnLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiAoKT0+e1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBwcmV2aW91cyB0aW1lciwgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKHRpbWVvdXRFbWFpbElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0RW1haWxJZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICAgICAgICB0aW1lb3V0RW1haWxJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwoKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwub24oJ3Bhc3RlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9BdHRhY2ggYSBmb2N1c291dCBldmVudCBsaXN0ZW5lciB0byB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuZm9jdXNvdXQoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxldCBwaG9uZSA9ICQoZS50YXJnZXQpLnZhbCgpLnJlcGxhY2UoL1teMC05XS9nLCBcIlwiKTtcbiAgICAgICAgICAgIGlmIChwaG9uZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAkKGUudGFyZ2V0KS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBXaGVuIHRoZSBkaWFsIHN0cmluZyBvdmVycmlkZSBpcyBmaWxsZWQgd2hpbGUgdGhlIG1vYmlsZSBudW1iZXIgaXMgc3RpbGwgZW1wdHksXG4gICAgICAgIC8vIGNvcHkgaXQgaW50byB0aGUgKGVtcHR5KSBtb2JpbGUgbnVtYmVyIGFuZCBsZXQgdGhlIG1hc2sgZW5nYWdlLiBXaXRob3V0IGEgbW9iaWxlXG4gICAgICAgIC8vIG51bWJlciB0aGUgYmFja2VuZCBkcm9wcyB0aGUgd2hvbGUgRXh0ZXJuYWxQaG9uZXMgcm93IG9uIHNhdmUsIHNpbGVudGx5IGNsZWFyaW5nXG4gICAgICAgIC8vIHRoZSBkaWFsIHN0cmluZyB0aGUgdXNlciBqdXN0IHR5cGVkIChpc3N1ZSAjMTA4MSBmb2xsb3ctdXApLlxuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9kaWFsc3RyaW5nLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zdCBkaWFsc3RyaW5nID0gKHRoaXMudmFsdWUgfHwgJycpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRNb2JpbGUgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuZGF0YSgnaW5wdXRtYXNrJylcbiAgICAgICAgICAgICAgICA/IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKVxuICAgICAgICAgICAgICAgIDogKGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci52YWwoKSB8fCAnJyk7XG4gICAgICAgICAgICAvLyBPbmx5IGF1dG8tZmlsbCBmcm9tIGEgcGxhaW4gcGhvbmUtbnVtYmVyIGRpYWwgc3RyaW5nIChvcHRpb25hbCBsZWFkaW5nIFwiK1wiKS5cbiAgICAgICAgICAgIC8vIEEgbm9uLW51bWVyaWMgZGlhbCBzdHJpbmcgKGUuZy4gXCJTSVAvdHJ1bmsvMTIzXCIpIHdvdWxkIGJlIG1hbmdsZWQgYnkgdGhlXG4gICAgICAgICAgICAvLyBkaWdpdC1vbmx5IG1hc2ssIHNvIGl0IGlzIGxlZnQgdW50b3VjaGVkLlxuICAgICAgICAgICAgaWYgKC9eXFwrP1xcZCskLy50ZXN0KGRpYWxzdHJpbmcpICYmIGN1cnJlbnRNb2JpbGUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBjdXJyZW50IG1hc2ssIGluamVjdCB0aGUgcmF3IHZhbHVlIChzbyBpdCBpcyBub3QgdHJ1bmNhdGVkIGJ5IGFcbiAgICAgICAgICAgICAgICAvLyBzaG9ydGVyIGFjdGl2ZSBtYXNrKSwgdGhlbiByZS1pbml0aWFsaXNlIHNvIHRoZSByaWdodCBtYXNrIGlzIGNob3NlbiBhbmRcbiAgICAgICAgICAgICAgICAvLyBmb3JtYXR0aW5nIGFwcGxpZWQuICdjaGFuZ2UnIGtlZXBzIGRlcGVuZGVudCBoYW5kbGVycyAoYXZhaWxhYmlsaXR5KSBpbiBzeW5jLlxuICAgICAgICAgICAgICAgIC8vIE5PVEU6IGlucHV0bWFza3MoJ3JlbW92ZScpIG51bGxzIHRoZSBgLmlucHV0bWFza3NgIG1ldGhvZCBvbiB0aGUgalF1ZXJ5XG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IGl0IGlzIGNhbGxlZCBvbiwgc28gY2FsbCBpdCBvbiBhIHRocm93YXdheSB3cmFwcGVyLCBub3QgdGhlIGNhY2hlZCBvbmUuXG4gICAgICAgICAgICAgICAgJCgnI21vYmlsZV9udW1iZXInKS5pbnB1dG1hc2tzKCdyZW1vdmUnKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIudmFsKGRpYWxzdHJpbmcpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0TW9iaWxlTWFzaygpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIG5ldyBTSVAgcGFzc3dvcmQuXG4gICAgICogVXNlcyB0aGUgUGFzc3dvcmRXaWRnZXQgYnV0dG9uIGxpa2UgaW4gQU1JIG1hbmFnZXIuXG4gICAgICovXG4gICAgZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcbiAgICAgICAgLy8gVHJpZ2dlciBwYXNzd29yZCBnZW5lcmF0aW9uIHRocm91Z2ggdGhlIHdpZGdldCBidXR0b24gKGxpa2UgaW4gQU1JKVxuICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBleHRlbnNpb24uJHNpcF9zZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJGdlbmVyYXRlQnRuLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEubW9iaWxlX251bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZW1vdmUgZm9ybSBjb250cm9sIGZpZWxkcyB0aGF0IHNob3VsZG4ndCBiZSBzZW50IHRvIHNlcnZlclxuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEuZGlycnR5O1xuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEuc3VibWl0TW9kZTtcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLnVzZXJfaWQ7IC8vIFJlbW92ZSB1c2VyX2lkIGZpZWxkIHRvIHByZXZlbnQgdmFsaWRhdGlvbiBpc3N1ZXNcblxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgKGNoZWNrIGlmIHdlIGhhdmUgYSByZWFsIElEKVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBjdXJyZW50IGV4dGVuc2lvbiBudW1iZXIgYXMgdGhlIGRlZmF1bHQgbnVtYmVyIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEubnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSByZXNwb25zZS5kYXRhLm51bWJlcjtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHBob25lIHJlcHJlc2VudGF0aW9uIHdpdGggdGhlIG5ldyBkZWZhdWx0IG51bWJlclxuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZSBhbmQgcmVzcG9uc2UucmVsb2FkIGZyb20gc2VydmVyXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzIGZvciBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qcyBmb3IgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGV4dGVuc2lvbi4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZXh0ZW5zaW9uLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBFbXBsb3llZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyBjaGVja2JveCB2YWx1ZXMgYXJlIHNlbnQgYXMgdHJ1ZS9mYWxzZSBpbnN0ZWFkIG9mIFwib25cIi91bmRlZmluZWRcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFY1LjAgQXJjaGl0ZWN0dXJlOiBMb2FkIGV4dGVuc2lvbiBkYXRhIHZpYSBSRVNUIEFQSSAoc2ltaWxhciB0byBJVlIgbWVudSBwYXR0ZXJuKVxuICAgICAqL1xuICAgIGxvYWRFeHRlbnNpb25EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGV4dGVuc2lvbi5nZXRSZWNvcmRJZCgpO1xuXG4gICAgICAgIC8vIFVzZSAnbmV3JyBhcyBJRCBmb3IgbmV3IHJlY29yZHMgdG8gZ2V0IGRlZmF1bHQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGNvbnN0IGFwaUlkID0gcmVjb3JkSWQgPT09ICcnID8gJ25ldycgOiByZWNvcmRJZDtcblxuICAgICAgICAvLyBIaWRlIG1vbml0b3JpbmcgZWxlbWVudHMgZm9yIG5ldyBlbXBsb3llZXNcbiAgICAgICAgaWYgKGFwaUlkID09PSAnbmV3Jykge1xuICAgICAgICAgICAgJCgnI3N0YXR1cycpLmhpZGUoKTsgLy8gSGlkZSBzdGF0dXMgbGFiZWxcbiAgICAgICAgICAgICQoJ2FbZGF0YS10YWI9XCJzdGF0dXNcIl0nKS5oaWRlKCk7IC8vIEhpZGUgbW9uaXRvcmluZyB0YWJcbiAgICAgICAgfVxuXG4gICAgICAgIEVtcGxveWVlc0FQSS5nZXRSZWNvcmQoYXBpSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBpZiB3ZSBkb24ndCBoYXZlIGFuIElEIChmb2xsb3dpbmcgQ2FsbFF1ZXVlcyBwYXR0ZXJuKVxuICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBleHRlbnNpb24ucG9wdWxhdGVGb3JtV2l0aERhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgZGVmYXVsdCB2YWx1ZXMgYWZ0ZXIgZGF0YSBsb2FkXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSByZXNwb25zZS5kYXRhLm51bWJlciB8fCAnJztcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gcmVzcG9uc2UuZGF0YS51c2VyX2VtYWlsIHx8ICcnO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gcmVzcG9uc2UuZGF0YS5tb2JpbGVfbnVtYmVyIHx8ICcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIHN0aWxsIGluaXRpYWxpemUgYXZhdGFyIGV2ZW4gaWYgQVBJIGZhaWxzXG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBleHRlbnNpb24gZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkwgKGxpa2UgSVZSIG1lbnUpXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBSRVNUIEFQSSAoVjUuMCBjbGVhbiBkYXRhIGFyY2hpdGVjdHVyZSlcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1XaXRoRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIFN0b3JlIGV4dGVuc2lvbnNfbGVuZ3RoIGZyb20gQVBJIGZvciB1c2UgaW4gaW5pdGlhbGl6ZUlucHV0TWFza3NcbiAgICAgICAgLy8gVGhpcyB2YWx1ZSBNVVNUIGNvbWUgZnJvbSBBUEkgLSBubyBkZWZhdWx0cyBpbiBKU1xuICAgICAgICBleHRlbnNpb24uZXh0ZW5zaW9uc0xlbmd0aCA9IGRhdGEuZXh0ZW5zaW9uc19sZW5ndGg7XG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggKHNhbWUgYXMgSVZSIG1lbnUpXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBWNS4wIHNwZWNpYWxpemVkIGNsYXNzZXMgLSBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIGFueSBVSSBlbGVtZW50cyBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBpZiAoZm9ybURhdGEubnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb24tbnVtYmVyLWRpc3BsYXknKS50ZXh0KGZvcm1EYXRhLm51bWJlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgYXZhdGFyIGNvbXBvbmVudCBhZnRlciBmb3JtIHBvcHVsYXRpb25cbiAgICAgICAgICAgICAgICBhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBhdmF0YXIgVVJMIGR5bmFtaWNhbGx5IGZyb20gQVBJIGRhdGFcbiAgICAgICAgICAgICAgICBhdmF0YXIuc2V0QXZhdGFyVXJsKGZvcm1EYXRhLnVzZXJfYXZhdGFyKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIG1vZGlmeSBzdGF0dXMgbW9uaXRvciBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggZW1wbG95ZWUgbmFtZSBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVQYWdlSGVhZGVyKGZvcm1EYXRhLnVzZXJfdXNlcm5hbWUsIGZvcm1EYXRhLm51bWJlcik7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dCBtYXNrcyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplSW5wdXRNYXNrcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5PVEU6IEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKSB3aWxsIGJlIGNhbGxlZCBhdXRvbWF0aWNhbGx5IGJ5IEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjbGVhbiBkYXRhIC0gVjUuMCBBcmNoaXRlY3R1cmVcbiAgICAgKiBVc2VzIHNwZWNpYWxpemVkIGNsYXNzZXMgd2l0aCBjb21wbGV0ZSBhdXRvbWF0aW9uIChubyBvbkNoYW5nZSBjYWxsYmFja3MgbmVlZGVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBmb3J3YXJkaW5nIGRyb3Bkb3duIGluc3RhbmNlcyBiZWZvcmUgcmUtaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHByb3BlciByZS1jcmVhdGlvbiB3aGVuIGZvcm0gZGF0YSBpcyByZWxvYWRlZCAoZS5nLiwgYWZ0ZXIgc2F2ZSlcbiAgICAgICAgY29uc3QgZm9yd2FyZGluZ0ZpZWxkcyA9IFsnZndkX2ZvcndhcmRpbmcnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJ107XG4gICAgICAgIGZvcndhcmRpbmdGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgaWYgKEV4dGVuc2lvblNlbGVjdG9yLmluc3RhbmNlcy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmRlc3Ryb3koZmllbGROYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gZHJvcGRvd25zIHdpdGggY3VycmVudCBleHRlbnNpb24gZXhjbHVzaW9uIC0gVjUuMCBzcGVjaWFsaXplZCBjbGFzc1xuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZycsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbZGF0YS5udW1iZXJdLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jywge1xuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLCBcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbZGF0YS5udW1iZXJdLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbZGF0YS5udW1iZXJdLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHdpdGggQVBJIGRhdGEgLSBWNS4wIGJhc2UgY2xhc3NcbiAgICAgICAgXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignc2lwX25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgIGFwaVVybDogYC9wYnhjb3JlL2FwaS92My9uZXR3b3JrLWZpbHRlcnM6Z2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT1TSVBgLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWxlY3ROZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVjUuMCBhcmNoaXRlY3R1cmUgd2l0aCBlbXB0eSBmb3JtIHNob3VsZCBub3QgaGF2ZSBIVE1MIGVudGl0aWVzIGlzc3Vlc1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlcyAtIHJlYnVpbGQgZHJvcGRvd25zIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vZmYoJ2NoYW5nZS5kcm9wZG93bicpLm9uKCdjaGFuZ2UuZHJvcGRvd24nLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdFeHRlbnNpb24gPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ251bWJlcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobmV3RXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4Y2x1c2lvbnMgZm9yIGZvcndhcmRpbmcgZHJvcGRvd25zXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLnVwZGF0ZUZvcndhcmRpbmdEcm9wZG93bnNFeGNsdXNpb24obmV3RXh0ZW5zaW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCk7XG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBmb3J3YXJkaW5nIGRyb3Bkb3ducyB3aGVuIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlc1xuICAgICAqL1xuICAgIHVwZGF0ZUZvcndhcmRpbmdEcm9wZG93bnNFeGNsdXNpb24obmV3RXh0ZW5zaW9uKSB7XG4gICAgICAgIGNvbnN0IGZvcndhcmRpbmdGaWVsZHMgPSBbJ2Z3ZF9mb3J3YXJkaW5nJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSddO1xuICAgICAgICBcbiAgICAgICAgZm9yd2FyZGluZ0ZpZWxkcy5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkKGAjJHtmaWVsZE5hbWV9YCkudmFsKCk7XG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VGV4dCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpLm5vdCgnLmRlZmF1bHQnKS5odG1sKCkgfHwgJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgaW5zdGFuY2UgZmlyc3RcbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmRlc3Ryb3koZmllbGROYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIG9sZCBkcm9wZG93biBET00gZWxlbWVudFxuICAgICAgICAgICAgJGRyb3Bkb3duLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgbmV3IGRhdGEgb2JqZWN0IHdpdGggY3VycmVudCB2YWx1ZSBmb3IgcmVpbml0aWFsaXppbmdcbiAgICAgICAgICAgIGNvbnN0IHJlZnJlc2hEYXRhID0ge307XG4gICAgICAgICAgICByZWZyZXNoRGF0YVtmaWVsZE5hbWVdID0gY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgcmVmcmVzaERhdGFbYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgXSA9IGN1cnJlbnRUZXh0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWluaXRpYWxpemUgd2l0aCBuZXcgZXhjbHVzaW9uXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KGZpZWxkTmFtZSwge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW25ld0V4dGVuc2lvbl0sXG4gICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHJlZnJlc2hEYXRhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBhZnRlciBmb3JtIGRhdGEgaXMgbG9hZGVkXG4gICAgICogVGhpcyBlbnN1cmVzIHZhbGlkYXRpb24gb25seSBoYXBwZW5zIGFmdGVyIHBhc3N3b3JkIGlzIHBvcHVsYXRlZCBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZvcm1EYXRhIC0gVGhlIGZvcm0gZGF0YSBsb2FkZWQgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQYXNzd29yZFdpZGdldChmb3JtRGF0YSkge1xuICAgICAgICBpZiAoIWV4dGVuc2lvbi4kc2lwX3NlY3JldC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhpZGUgYW55IGxlZ2FjeSBidXR0b25zIGlmIHRoZXkgZXhpc3RcbiAgICAgICAgJCgnLmNsaXBib2FyZCcpLmhpZGUoKTtcbiAgICAgICAgJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpLmhpZGUoKTtcblxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyBleHRlbnNpb24gKG5vIElEKSBvciBleGlzdGluZyBvbmVcbiAgICAgICAgY29uc3QgaXNOZXdFeHRlbnNpb24gPSAhZm9ybURhdGEuaWQgfHwgZm9ybURhdGEuaWQgPT09ICcnO1xuXG4gICAgICAgIGNvbnN0IHdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQoZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LCB7XG4gICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlQsICAvLyBTb2Z0IHZhbGlkYXRpb24gLSBzaG93IHdhcm5pbmdzIGJ1dCBhbGxvdyBzdWJtaXNzaW9uXG4gICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSwgICAgICAgICAvLyBTaG93IGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLCAgICAgLy8gU2hvdyBzaG93L2hpZGUgcGFzc3dvcmQgdG9nZ2xlXG4gICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsICAgICAgICAvLyBTaG93IGNvcHkgdG8gY2xpcGJvYXJkIGJ1dHRvblxuICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLCAgICAgICAgLy8gU2hvdyBwYXNzd29yZCBzdHJlbmd0aCBiYXJcbiAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSwgICAgICAgICAgIC8vIFNob3cgdmFsaWRhdGlvbiB3YXJuaW5nc1xuICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLCAgICAgICAgLy8gVmFsaWRhdGUgYXMgdXNlciB0eXBlc1xuICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWUsIC8vIEFsd2F5cyB2YWxpZGF0ZSBpZiBwYXNzd29yZCBmaWVsZCBoYXMgdmFsdWVcbiAgICAgICAgICAgIG1pblNjb3JlOiAzMCwgICAgICAgICAgICAgICAgIC8vIFNJUCBwYXNzd29yZHMgaGF2ZSBsb3dlciBtaW5pbXVtIHNjb3JlIHJlcXVpcmVtZW50XG4gICAgICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMjAsICAgICAgICAgICAvLyAyMCBjaGFycyBtYXggZm9yIEdyYW5kc3RyZWFtIEdETVMgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgaW5jbHVkZVNwZWNpYWw6IGZhbHNlLCAgICAgICAgLy8gRXhjbHVkZSBzcGVjaWFsIGNoYXJhY3RlcnMgZm9yIFNJUCBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICBvbkdlbmVyYXRlOiAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblZhbGlkYXRlOiAoaXNWYWxpZCwgc2NvcmUsIG1lc3NhZ2VzKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gT3B0aW9uYWw6IEhhbmRsZSB2YWxpZGF0aW9uIHJlc3VsdHMgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgLy8gVGhlIHdpZGdldCB3aWxsIGhhbmRsZSB2aXN1YWwgZmVlZGJhY2sgYXV0b21hdGljYWxseVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIHdpZGdldCBpbnN0YW5jZSBmb3IgbGF0ZXIgdXNlXG4gICAgICAgIGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBuZXcgZXh0ZW5zaW9ucyBvbmx5OiBhdXRvLWdlbmVyYXRlIHBhc3N3b3JkIGlmIGZpZWxkIGlzIGVtcHR5XG4gICAgICAgIGlmIChpc05ld0V4dGVuc2lvbiAmJiBleHRlbnNpb24uJHNpcF9zZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBleHRlbnNpb24uJHNpcF9zZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRnZW5lcmF0ZUJ0bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICRnZW5lcmF0ZUJ0bi50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRFRNRiBtb2RlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNzaXBfZHRtZm1vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfSk7XG4gICAgIH0sXG4gICAgICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJhbnNwb3J0IHByb3RvY29sIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNzaXBfdHJhbnNwb3J0LWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggZW1wbG95ZWUgbmFtZSBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBlbXBsb3llZU5hbWUgLSBOYW1lIG9mIHRoZSBlbXBsb3llZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb25OdW1iZXIgLSBFeHRlbnNpb24gbnVtYmVyIChvcHRpb25hbClcbiAgICAgKi9cbiAgICB1cGRhdGVQYWdlSGVhZGVyKGVtcGxveWVlTmFtZSwgZXh0ZW5zaW9uTnVtYmVyKSB7XG4gICAgICAgIGxldCBoZWFkZXJUZXh0O1xuXG4gICAgICAgIGlmIChlbXBsb3llZU5hbWUgJiYgZW1wbG95ZWVOYW1lLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIC8vIEV4aXN0aW5nIGVtcGxveWVlIHdpdGggbmFtZVxuICAgICAgICAgICAgaGVhZGVyVGV4dCA9ICc8aSBjbGFzcz1cInVzZXIgb3V0bGluZSBpY29uXCI+PC9pPiAnICsgZW1wbG95ZWVOYW1lO1xuXG4gICAgICAgICAgICAvLyBBZGQgZXh0ZW5zaW9uIG51bWJlciBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25OdW1iZXIgJiYgZXh0ZW5zaW9uTnVtYmVyLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJUZXh0ICs9ICcgJmx0OycgKyBleHRlbnNpb25OdW1iZXIgKyAnJmd0Oyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOZXcgZW1wbG95ZWUgb3Igbm8gbmFtZSB5ZXRcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfQ3JlYXRlTmV3RXh0ZW5zaW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIG1haW4gaGVhZGVyIGNvbnRlbnRcbiAgICAgICAgJCgnaDEgLmNvbnRlbnQnKS5odG1sKGhlYWRlclRleHQpO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBEZWZpbmUgYSBjdXN0b20gcnVsZSBmb3IgalF1ZXJ5IGZvcm0gdmFsaWRhdGlvbiBuYW1lZCAnZXh0ZW5zaW9uUnVsZScuXG4gKiBUaGUgcnVsZSBjaGVja3MgaWYgYSBmb3J3YXJkaW5nIG51bWJlciBpcyBzZWxlY3RlZCBidXQgdGhlIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRoZSB2YWxpZGF0aW9uIHJlc3VsdC4gSWYgZm9yd2FyZGluZyBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgaXQgcmV0dXJucyBmYWxzZSAoaW52YWxpZCkuIE90aGVyd2lzZSwgaXQgcmV0dXJucyB0cnVlICh2YWxpZCkuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbnNpb25SdWxlID0gKCkgPT4ge1xuICAgIC8vIEdldCByaW5nIGxlbmd0aCBhbmQgZm9yd2FyZGluZyBudW1iZXIgZnJvbSB0aGUgZm9ybVxuICAgIGNvbnN0IGZ3ZFJpbmdMZW5ndGggPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk7XG4gICAgY29uc3QgZndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcblxuICAgIC8vIElmIGZvcndhcmRpbmcgbnVtYmVyIGlzIHNldCBhbmQgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LCByZXR1cm4gZmFsc2UgKGludmFsaWQpXG4gICAgaWYgKGZ3ZEZvcndhcmRpbmcubGVuZ3RoID4gMFxuICAgICAgICAmJiAoXG4gICAgICAgICAgICBmd2RSaW5nTGVuZ3RoID09PSAwXG4gICAgICAgICAgICB8fFxuICAgICAgICAgICAgZndkUmluZ0xlbmd0aCA9PT0gJydcbiAgICAgICAgKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCByZXR1cm4gdHJ1ZSAodmFsaWQpXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgbnVtYmVyIGlzIHRha2VuIGJ5IGFub3RoZXIgYWNjb3VudFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHBhcmFtZXRlciBoYXMgdGhlICdoaWRkZW4nIGNsYXNzLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG5cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5wYXNzd29yZFN0cmVuZ3RoID0gKCkgPT4ge1xuICAgIC8vIENoZWNrIGlmIHBhc3N3b3JkIHdpZGdldCBleGlzdHMgYW5kIHBhc3N3b3JkIG1lZXRzIG1pbmltdW0gc2NvcmVcbiAgICBpZiAoZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gUGFzc3dvcmRXaWRnZXQuZ2V0U3RhdGUoZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0KTtcbiAgICAgICAgcmV0dXJuIHN0YXRlICYmIHN0YXRlLnNjb3JlID49IDMwOyAvLyBNaW5pbXVtIHNjb3JlIGZvciBleHRlbnNpb25zXG4gICAgfVxuICAgIHJldHVybiB0cnVlOyAvLyBQYXNzIHZhbGlkYXRpb24gaWYgd2lkZ2V0IG5vdCBpbml0aWFsaXplZFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFbXBsb3llZSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb24uaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=