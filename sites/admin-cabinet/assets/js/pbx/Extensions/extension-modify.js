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
   * to build a `9{2,N}` digit mask, applied only when N is between 2 and 11.
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

      if (extensionsLength >= 2 && extensionsLength <= 11) {
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
    extension.initializeTransportDropdown(data);
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
      minScore: 60,
      // Match the authoritative SIP threshold on the server
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
   *
   * The deprecated "tls" option stays only for employees that already have it saved,
   * accompanied by a warning suggesting the "<number>-TLS" username instead.
   * @param {Object} data - Employee data from REST API
   */
  initializeTransportDropdown: function initializeTransportDropdown(data) {
    var $dropdown = $('#sip_transport-dropdown');
    if ($dropdown.length === 0) return;
    $('#sip-transport-tls-warning').remove();

    if (data.sip_transport === 'tls') {
      var message = globalTranslate.ex_SipTransportTlsDeprecated.replace(/%number%/g, $('<div>').text(data.number || '').html());
      $dropdown.closest('.field').after("<div id=\"sip-transport-tls-warning\" class=\"ui warning message visible\">".concat(message, "</div>"));
    } else {
      $dropdown.find('.menu .item[data-value="tls"]').remove();
    } // Initialize with standard Fomantic UI - it's already rendered by PHP


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
  if (!extension.passwordWidget) {
    return true; // Pass validation if widget not initialized
  }

  var value = extension.$sip_secret.val(); // An empty or masked (unchanged) existing password is not re-gated.

  if (!value || PasswordWidget.isMaskedPassword(value)) {
    return true;
  } // Gate on a synchronous local score of the CURRENT field value rather than the
  // async state.score. state.score is only written when the debounced/in-flight
  // validation callback completes, so reading it at submit time can see either a
  // not-yet-computed 0 (false reject) or a stale high score from a previously
  // validated stronger value (false accept). Scoring the current value here is
  // race-free; the server result still drives the live progress bar and warnings.


  return PasswordWidget.scorePasswordLocal(value) >= 60; // Match the server's SIP threshold
};
/**
 *  Initialize Employee form on document ready
 */


$(document).ready(function () {
  extension.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJHNpcF9zZWNyZXQiLCIkbW9iaWxlX251bWJlciIsIiRmd2RfZm9yd2FyZGluZyIsIiRmd2RfZm9yd2FyZGluZ29uYnVzeSIsIiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCIkZW1haWwiLCIkdXNlcl91c2VybmFtZSIsInBhc3N3b3JkV2lkZ2V0IiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsImV4X1ZhbGlkYXRlUGFzc3dvcmRUb29XZWFrIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiJCIsIiRtb2JpbGVfZGlhbHN0cmluZyIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImFjY29yZGlvbiIsInBvcHVwIiwib24iLCJhdHRyIiwiaW5pdGlhbGl6ZUZvcm0iLCJjdXJyZW50TnVtYmVyIiwiaW5wdXRtYXNrIiwidmFsIiwidXBkYXRlUGFnZUhlYWRlciIsImN1cnJlbnRVc2VybmFtZSIsIkV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIiwiZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJhcHBseUFDTFBlcm1pc3Npb25zIiwibG9hZEV4dGVuc2lvbkRhdGEiLCJBQ0xIZWxwZXIiLCJjb25zb2xlIiwid2FybiIsImFwcGx5UGVybWlzc2lvbnMiLCJzYXZlIiwic2hvdyIsImVuYWJsZSIsImNhblNhdmUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJkaXNhYmxlIiwiaW5mb01lc3NhZ2UiLCJleF9Ob1Blcm1pc3Npb25Ub01vZGlmeSIsIlVzZXJNZXNzYWdlIiwic2hvd0luZm9ybWF0aW9uIiwiY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlIiwicGFzdGVkVmFsdWUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJuZXdOdW1iZXIiLCJ1c2VySWQiLCJmb3JtIiwiRXh0ZW5zaW9uc0FQSSIsImNoZWNrQXZhaWxhYmlsaXR5IiwiY2JPbkNvbXBsZXRlRW1haWwiLCJuZXdFbWFpbCIsIlVzZXJzQVBJIiwiY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyIiwibmV3TW9iaWxlTnVtYmVyIiwiY3VycmVudERpYWxzdHJpbmciLCJsZW5ndGgiLCJ1c2VyTmFtZSIsImN1cnJlbnRGd2RGb3J3YXJkaW5nIiwiY3VycmVudEZ3ZE9uQnVzeSIsImN1cnJlbnRGd2RPblVuYXZhaWxhYmxlIiwiRXh0ZW5zaW9uU2VsZWN0b3IiLCJzZXRWYWx1ZSIsImNiT25DbGVhcmVkTW9iaWxlTnVtYmVyIiwiY2xlYXIiLCJpbml0aWFsaXplSW5wdXRNYXNrcyIsInRpbWVvdXROdW1iZXJJZCIsImV4dGVuc2lvbnNMZW5ndGgiLCJwYXJzZUludCIsIm1hc2siLCJwbGFjZWhvbGRlciIsIm9uY29tcGxldGUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0Iiwic29ydGVkTWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsIm1vYmlsZU1hc2tMaXN0IiwiZmlsdGVyIiwiaXRlbSIsImNoYXJBdCIsImNvbmNhdCIsImluaXRNb2JpbGVNYXNrIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9yaWdpbmFsVmFsIiwiZm4iLCJvZmYiLCIkdGhpcyIsImFyZ3MiLCJhcmd1bWVudHMiLCJuZXdWYWx1ZSIsImRhdGEiLCJhcHBseSIsInRyaWdnZXIiLCJlIiwicHJldmVudERlZmF1bHQiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwicHJvY2Vzc2VkRGF0YSIsInNsaWNlIiwiaW5wdXQiLCJzdGFydCIsInNlbGVjdGlvblN0YXJ0IiwiZW5kIiwic2VsZWN0aW9uRW5kIiwiY3VycmVudFZhbHVlIiwic3Vic3RyaW5nIiwidGltZW91dEVtYWlsSWQiLCJmb2N1c291dCIsInBob25lIiwidGFyZ2V0IiwiZGlhbHN0cmluZyIsInZhbHVlIiwidHJpbSIsImN1cnJlbnRNb2JpbGUiLCJ0ZXN0IiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIiRnZW5lcmF0ZUJ0biIsImNsb3Nlc3QiLCJmaW5kIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGlycnR5Iiwic3VibWl0TW9kZSIsInVzZXJfaWQiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInVwZGF0ZVBob25lUmVwcmVzZW50Iiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJGb3JtIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiRW1wbG95ZWVzQVBJIiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJhcGlJZCIsImhpZGUiLCJnZXRSZWNvcmQiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm1XaXRoRGF0YSIsImF2YXRhciIsInNob3dFcnJvciIsImVycm9yIiwidXJsUGFydHMiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJleHRlbnNpb25zX2xlbmd0aCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEiLCJ0ZXh0Iiwic2V0QXZhdGFyVXJsIiwidXNlcl9hdmF0YXIiLCJFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yIiwiaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0IiwiZm9yd2FyZGluZ0ZpZWxkcyIsImZvckVhY2giLCJmaWVsZE5hbWUiLCJpbnN0YW5jZXMiLCJoYXMiLCJkZXN0cm95IiwiJGRyb3Bkb3duIiwicmVtb3ZlIiwiaW5pdCIsImV4Y2x1ZGVFeHRlbnNpb25zIiwiaW5jbHVkZUVtcHR5IiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJleF9TZWxlY3ROZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJuZXdFeHRlbnNpb24iLCJ1cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uIiwiaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24iLCJpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24iLCJjdXJyZW50VGV4dCIsIm5vdCIsImh0bWwiLCJyZWZyZXNoRGF0YSIsImlzTmV3RXh0ZW5zaW9uIiwiaWQiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsInZhbGlkYXRpb24iLCJWQUxJREFUSU9OIiwiU09GVCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwidmFsaWRhdGVPbklucHV0IiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwiaW5jbHVkZVNwZWNpYWwiLCJvbkdlbmVyYXRlIiwicGFzc3dvcmQiLCJkYXRhQ2hhbmdlZCIsIm9uVmFsaWRhdGUiLCJpc1ZhbGlkIiwic2NvcmUiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwic2lwX3RyYW5zcG9ydCIsIm1lc3NhZ2UiLCJleF9TaXBUcmFuc3BvcnRUbHNEZXByZWNhdGVkIiwiYWZ0ZXIiLCJlbXBsb3llZU5hbWUiLCJleHRlbnNpb25OdW1iZXIiLCJoZWFkZXJUZXh0IiwiZXhfQ3JlYXRlTmV3RXh0ZW5zaW9uIiwiZXh0ZW5zaW9uUnVsZSIsImZ3ZFJpbmdMZW5ndGgiLCJmd2RGb3J3YXJkaW5nIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJwYXNzd29yZFN0cmVuZ3RoIiwiaXNNYXNrZWRQYXNzd29yZCIsInNjb3JlUGFzc3dvcmRMb2NhbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFNBQVMsR0FBRztBQUNkQyxF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O0FBcUJBO0FBQ0E7QUFDQTs7O0FBQ0FwSCxDQUFDLENBQUM4TyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCOVIsRUFBQUEsU0FBUyxDQUFDOEMsVUFBVjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zQVBJLCBFbXBsb3llZXNBUEksIEZvcm0sXG4gSW5wdXRNYXNrUGF0dGVybnMsIGF2YXRhciwgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciwgQ2xpcGJvYXJkSlMsIFBhc3N3b3JkV2lkZ2V0LCBVc2VyTWVzc2FnZSwgQUNMSGVscGVyICovXG5cblxuLyoqXG4gKiBUaGUgZXh0ZW5zaW9uIG9iamVjdC5cbiAqIE1hbmFnZXMgdGhlIG9wZXJhdGlvbnMgYW5kIGJlaGF2aW9ycyBvZiB0aGUgZXh0ZW5zaW9uIGVkaXQgZm9ybVxuICpcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uXG4gKi9cbmNvbnN0IGV4dGVuc2lvbiA9IHtcbiAgICBkZWZhdWx0RW1haWw6ICcnLFxuICAgIGRlZmF1bHROdW1iZXI6ICcnLFxuICAgIGRlZmF1bHRNb2JpbGVOdW1iZXI6ICcnLFxuICAgIC8qKlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRudW1iZXI6IG51bGwsXG4gICAgJHNpcF9zZWNyZXQ6IG51bGwsXG4gICAgJG1vYmlsZV9udW1iZXI6IG51bGwsXG4gICAgJGZ3ZF9mb3J3YXJkaW5nOiBudWxsLFxuICAgICRmd2RfZm9yd2FyZGluZ29uYnVzeTogbnVsbCxcbiAgICAkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiBudWxsLFxuICAgICRlbWFpbDogbnVsbCxcbiAgICAkdXNlcl91c2VybmFtZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHdpZGdldCBpbnN0YW5jZS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHBhc3N3b3JkV2lkZ2V0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJ1bGFyIG1lbnUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdGFiTWVudUl0ZW1zOiBudWxsLFxuXG5cbiAgICAvKipcbiAgICAgKiBTdHJpbmcgZm9yIHRoZSBmb3J3YXJkaW5nIHNlbGVjdC5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGZvcndhcmRpbmdTZWxlY3Q6ICcjZXh0ZW5zaW9ucy1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbnVtYmVyOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbnVtYmVyJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtudW1iZXItZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgbW9iaWxlX251bWJlcjoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbW9iaWxlX251bWJlcicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hc2snLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZUlzTm90Q29ycmVjdCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVttb2JpbGUtbnVtYmVyLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlTnVtYmVySXNEb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHVzZXJfZW1haWw6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJfZW1haWwnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRW1haWxFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcl91c2VybmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJfdXNlcm5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgc2lwX3NlY3JldDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NpcF9zZWNyZXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlU2VjcmV0RW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldFdlYWssXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdwYXNzd29yZFN0cmVuZ3RoJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVQYXNzd29yZFRvb1dlYWtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfcmluZ2xlbmd0aDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9yaW5nbGVuZ3RoJyxcbiAgICAgICAgICAgIGRlcGVuZHM6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMy4uMTgwXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZzoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmcnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbnNpb25SdWxlJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZndkX2ZvcndhcmRpbmdvbmJ1c3k6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29uYnVzeScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZXh0ZW5zaW9uIGZvcm0gYW5kIGl0cyBpbnRlcmFjdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gUmVzb2x2ZSBqUXVlcnkgd3JhcHBlcnMgaGVyZSDigJQgYXQgbW9kdWxlLWxvYWQgdGltZSBqUXVlcnkgbWF5XG4gICAgICAgIC8vIG5vdCB5ZXQgYmUgZGVmaW5lZCAoU2VudHJ5IE1JS09QQlgtTUc5IHBhdHRlcm4pLlxuICAgICAgICBleHRlbnNpb24uJG51bWJlciA9ICQoJyNudW1iZXInKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRzaXBfc2VjcmV0ID0gJCgnI3NpcF9zZWNyZXQnKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyID0gJCgnI21vYmlsZV9udW1iZXInKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfZGlhbHN0cmluZyA9ICQoJyNtb2JpbGVfZGlhbHN0cmluZycpO1xuICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nID0gJCgnI2Z3ZF9mb3J3YXJkaW5nJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3kgPSAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUgPSAkKCcjZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwgPSAkKCcjdXNlcl9lbWFpbCcpO1xuICAgICAgICBleHRlbnNpb24uJHVzZXJfdXNlcm5hbWUgPSAkKCcjdXNlcl91c2VybmFtZScpO1xuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmogPSAkKCcjZXh0ZW5zaW9ucy1mb3JtJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kdGFiTWVudUl0ZW1zID0gJCgnI2V4dGVuc2lvbnMtbWVudSAuaXRlbScpO1xuXG4gICAgICAgIC8vIERlZmF1bHQgdmFsdWVzIHdpbGwgYmUgc2V0IGFmdGVyIFJFU1QgQVBJIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBlbXB0eSB2YWx1ZXMgc2luY2UgZm9ybXMgYXJlIGVtcHR5IHVudGlsIEFQSSByZXNwb25kc1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gJyc7XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gJyc7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgbWVudSBpdGVtcywgYWNjb3JkaW9ucywgYW5kIGRyb3Bkb3duIG1lbnVzXG4gICAgICAgIGV4dGVuc2lvbi4kdGFiTWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG4gICAgICAgICQoJyNleHRlbnNpb25zLWZvcm0gLnVpLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGZvciBxdWVzdGlvbiBpY29ucyBhbmQgYnV0dG9uc1xuICAgICAgICAkKFwiaS5xdWVzdGlvblwiKS5wb3B1cCgpO1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gUHJldmVudCBicm93c2VyIHBhc3N3b3JkIG1hbmFnZXIgZm9yIGdlbmVyYXRlZCBwYXNzd29yZHNcbiAgICAgICAgZXh0ZW5zaW9uLiRzaXBfc2VjcmV0Lm9uKCdmb2N1cycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdhdXRvY29tcGxldGUnLCAnbmV3LXBhc3N3b3JkJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGV4dGVuc2lvbiBmb3JtXG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBoYW5kbGVyIGZvciB1c2VybmFtZSBjaGFuZ2UgdG8gdXBkYXRlIHBhZ2UgdGl0bGVcbiAgICAgICAgZXh0ZW5zaW9uLiR1c2VyX3VzZXJuYW1lLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzayA/IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpIDogZXh0ZW5zaW9uLiRudW1iZXIudmFsKCk7XG4gICAgICAgICAgICBleHRlbnNpb24udXBkYXRlUGFnZUhlYWRlcigkKHRoaXMpLnZhbCgpLCBjdXJyZW50TnVtYmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWxzbyB1cGRhdGUgaGVhZGVyIHdoZW4gZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzXG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFVzZXJuYW1lID0gZXh0ZW5zaW9uLiR1c2VyX3VzZXJuYW1lLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudE51bWJlciA9ICQodGhpcykuaW5wdXRtYXNrID8gJCh0aGlzKS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKSA6ICQodGhpcykudmFsKCk7XG4gICAgICAgICAgICBleHRlbnNpb24udXBkYXRlUGFnZUhlYWRlcihjdXJyZW50VXNlcm5hbWUsIGN1cnJlbnROdW1iZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBhZHZhbmNlZCBzZXR0aW5ncyB1c2luZyB1bmlmaWVkIHN5c3RlbVxuICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHRlbnNpb25Ub29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIG9sZCBuYW1lIGlmIG5ldyBjbGFzcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBleHRlbnNpb25Ub29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBseSBBQ0wgcGVybWlzc2lvbnMgdG8gVUkgZWxlbWVudHNcbiAgICAgICAgZXh0ZW5zaW9uLmFwcGx5QUNMUGVybWlzc2lvbnMoKTtcblxuICAgICAgICAvLyBMb2FkIGV4dGVuc2lvbiBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICBleHRlbnNpb24ubG9hZEV4dGVuc2lvbkRhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgQUNMIHBlcm1pc3Npb25zIHRvIFVJIGVsZW1lbnRzXG4gICAgICogU2hvd3MvaGlkZXMgYnV0dG9ucyBhbmQgZm9ybSBlbGVtZW50cyBiYXNlZCBvbiB1c2VyIHBlcm1pc3Npb25zXG4gICAgICovXG4gICAgYXBwbHlBQ0xQZXJtaXNzaW9ucygpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgQUNMIEhlbHBlciBpcyBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBBQ0xIZWxwZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0FDTEhlbHBlciBpcyBub3QgYXZhaWxhYmxlLCBza2lwcGluZyBBQ0wgY2hlY2tzJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBseSBwZXJtaXNzaW9ucyB1c2luZyBBQ0xIZWxwZXJcbiAgICAgICAgQUNMSGVscGVyLmFwcGx5UGVybWlzc2lvbnMoe1xuICAgICAgICAgICAgc2F2ZToge1xuICAgICAgICAgICAgICAgIHNob3c6ICcjc3VibWl0YnV0dG9uLCAjZHJvcGRvd25TdWJtaXQnLFxuICAgICAgICAgICAgICAgIGVuYWJsZTogJyNleHRlbnNpb25zLWZvcm0nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVsZXRlOiB7XG4gICAgICAgICAgICAgICAgc2hvdzogJy5kZWxldGUtYnV0dG9uLCAudHdvLXN0ZXBzLWRlbGV0ZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkaXRpb25hbCBjaGVja3MgZm9yIHNwZWNpZmljIGFjdGlvbnNcbiAgICAgICAgaWYgKCFBQ0xIZWxwZXIuY2FuU2F2ZSgpKSB7XG4gICAgICAgICAgICAvLyBEaXNhYmxlIGZvcm0gaWYgdXNlciBjYW5ub3Qgc2F2ZVxuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnMtZm9ybSBpbnB1dCwgI2V4dGVuc2lvbnMtZm9ybSBzZWxlY3QsICNleHRlbnNpb25zLWZvcm0gdGV4dGFyZWEnKVxuICAgICAgICAgICAgICAgIC5wcm9wKCdyZWFkb25seScsIHRydWUpXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICAvLyBEaXNhYmxlIHBhc3N3b3JkIHdpZGdldFxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldC5kaXNhYmxlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNob3cgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCBpbmZvTWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5leF9Ob1Blcm1pc3Npb25Ub01vZGlmeSB8fCAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gbW9kaWZ5IGV4dGVuc2lvbnMnO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKGluZm9NZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgcGFzdGUgbW9iaWxlIG51bWJlciBmcm9tIGNsaXBib2FyZFxuICAgICAqL1xuICAgIGNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIGFmdGVyIGEgcGhvbmUgbnVtYmVyIGhhcyBiZWVuIGVudGVyZWQgY29tcGxldGVseS5cbiAgICAgKiBJdCBzZXJ2ZXMgdG8gY2hlY2sgaWYgdGhlcmUgYXJlIGFueSBjb25mbGljdHMgd2l0aCBleGlzdGluZyBwaG9uZSBudW1iZXJzLlxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZU51bWJlcigpIHtcbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGFmdGVyIHJlbW92aW5nIGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld051bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSB1c2VyIElEIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cbiAgICAgICAgLy8gQ2FsbCB0aGUgYGNoZWNrQXZhaWxhYmlsaXR5YCBmdW5jdGlvbiBvbiBgRXh0ZW5zaW9uc2Agb2JqZWN0XG4gICAgICAgIC8vIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGlzIGFscmVhZHkgaW4gdXNlLlxuICAgICAgICAvLyBQYXJhbWV0ZXJzOiBkZWZhdWx0IG51bWJlciwgbmV3IG51bWJlciwgY2xhc3MgbmFtZSBvZiBlcnJvciBtZXNzYWdlIChudW1iZXIpLCB1c2VyIGlkXG4gICAgICAgIEV4dGVuc2lvbnNBUEkuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIsIG5ld051bWJlciwgJ251bWJlcicsIHVzZXJJZCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJdCBpcyBleGVjdXRlZCBvbmNlIGFuIGVtYWlsIGFkZHJlc3MgaGFzIGJlZW4gY29tcGxldGVseSBlbnRlcmVkLlxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUVtYWlsKCkge1xuXG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSBlbnRlcmVkIHBob25lIG51bWJlciBhZnRlciByZW1vdmluZyBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdFbWFpbCA9IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBDYWxsIHRoZSBgY2hlY2tBdmFpbGFiaWxpdHlgIGZ1bmN0aW9uIG9uIGBVc2Vyc0FQSWAgb2JqZWN0XG4gICAgICAgIC8vIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVudGVyZWQgZW1haWwgaXMgYWxyZWFkeSBpbiB1c2UuXG4gICAgICAgIC8vIFBhcmFtZXRlcnM6IGRlZmF1bHQgZW1haWwsIG5ldyBlbWFpbCwgY2xhc3MgbmFtZSBvZiBlcnJvciBtZXNzYWdlIChlbWFpbCksIHVzZXIgaWRcbiAgICAgICAgVXNlcnNBUEkuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCwgbmV3RW1haWwsJ2VtYWlsJywgdXNlcklkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWN0aXZhdGVkIHdoZW4gZW50ZXJpbmcgYSBtb2JpbGUgcGhvbmUgbnVtYmVyIGluIHRoZSBlbXBsb3llZSdzIHByb2ZpbGUuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyKCkge1xuICAgICAgICAvLyBHZXQgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIHdpdGhvdXQgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIEdldCB1c2VyIElEIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cbiAgICAgICAgLy8gRHluYW1pYyBjaGVjayB0byBzZWUgaWYgdGhlIHNlbGVjdGVkIG1vYmlsZSBudW1iZXIgaXMgYXZhaWxhYmxlXG4gICAgICAgIEV4dGVuc2lvbnNBUEkuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIsIG5ld01vYmlsZU51bWJlciwgJ21vYmlsZS1udW1iZXInLCB1c2VySWQpO1xuXG4gICAgICAgIC8vIFJlZmlsbCB0aGUgbW9iaWxlIGRpYWxzdHJpbmcgb25seSB3aGVuIGl0IHdhcyBsZWZ0IGF0IGl0cyBkZWZhdWx0IChlcXVhbCB0byB0aGUgb2xkIG1vYmlsZSBudW1iZXIpXG4gICAgICAgIC8vIG9yIGVtcHR5LiBBIHVzZXItZGVmaW5lZCBkaWFsIHN0cmluZyBvdmVycmlkZSBtdXN0IHN1cnZpdmUgYSBtb2JpbGUgbnVtYmVyIGNoYW5nZSAoaXNzdWUgIzEwODEpLlxuICAgICAgICBjb25zdCBjdXJyZW50RGlhbHN0cmluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnKTtcbiAgICAgICAgaWYgKGN1cnJlbnREaWFsc3RyaW5nID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlclxuICAgICAgICAgICAgfHwgY3VycmVudERpYWxzdHJpbmcubGVuZ3RoID09PSAwXG4gICAgICAgICkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9iaWxlIG51bWJlciBoYXMgY2hhbmdlZFxuICAgICAgICBpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3MgdXNlcm5hbWUgZnJvbSB0aGUgZm9ybVxuICAgICAgICAgICAgY29uc3QgdXNlck5hbWUgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfdXNlcm5hbWUnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcndhcmRpbmcgZmllbGRzIHRoYXQgbWF0Y2ggdGhlIG9sZCBtb2JpbGUgbnVtYmVyXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPbkJ1c3kgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jyk7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmd2RfZm9yd2FyZGluZyBpZiBpdCBtYXRjaGVzIG9sZCBtb2JpbGUgbnVtYmVyIChpbmNsdWRpbmcgZW1wdHkpXG4gICAgICAgICAgICBpZiAoY3VycmVudEZ3ZEZvcndhcmRpbmcgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgcmluZyBsZW5ndGggaWYgZW1wdHlcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICAgICAgICAgICB8fCBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk9PT1cIjBcIikge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgNDUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3Iuc2V0VmFsdWUoJ2Z3ZF9mb3J3YXJkaW5nJywgbmV3TW9iaWxlTnVtYmVyLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZ3ZF9mb3J3YXJkaW5nb25idXN5IGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkT25CdXN5ID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3Iuc2V0VmFsdWUoJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgbmV3TW9iaWxlTnVtYmVyLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSBpZiBpdCBtYXRjaGVzIG9sZCBtb2JpbGUgbnVtYmVyIChpbmNsdWRpbmcgZW1wdHkpXG4gICAgICAgICAgICBpZiAoY3VycmVudEZ3ZE9uVW5hdmFpbGFibGUgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5zZXRWYWx1ZSgnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgbmV3TW9iaWxlTnVtYmVyLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIGFzIHRoZSBkZWZhdWx0XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gbmV3TW9iaWxlTnVtYmVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgd2hlbiB0aGUgbW9iaWxlIHBob25lIG51bWJlciBpcyBjbGVhcmVkIGluIHRoZSBlbXBsb3llZSBjYXJkLlxuICAgICAqL1xuICAgIGNiT25DbGVhcmVkTW9iaWxlTnVtYmVyKCkge1xuICAgICAgICAvLyBDaGVjayBjdXJyZW50IGZvcndhcmRpbmcgdmFsdWVzIGJlZm9yZSBjbGVhcmluZ1xuICAgICAgICBjb25zdCBjdXJyZW50RndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcbiAgICAgICAgY29uc3QgY3VycmVudEZ3ZE9uQnVzeSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgY29uc3QgY3VycmVudEZ3ZE9uVW5hdmFpbGFibGUgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgdGhlICdtb2JpbGVfZGlhbHN0cmluZycgYW5kICdtb2JpbGVfbnVtYmVyJyBmaWVsZHMgaW4gdGhlIGZvcm1cbiAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsICcnKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfbnVtYmVyJywgJycpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoY3VycmVudEZ3ZEZvcndhcmRpbmcgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBJZiBzbywgY2xlYXIgdGhlICdmd2RfcmluZ2xlbmd0aCcgZmllbGQgYW5kIGNsZWFyIGZvcndhcmRpbmcgZHJvcGRvd25cbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCAwKTtcbiAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZndkX2ZvcndhcmRpbmcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiBidXN5IHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGN1cnJlbnRGd2RPbkJ1c3kgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuY2xlYXIoJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdoZW4gdW5hdmFpbGFibGUgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoY3VycmVudEZ3ZE9uVW5hdmFpbGFibGUgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuY2xlYXIoJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgaW5wdXQgbWFza3MgZm9yIHRoZSBleHRlbnNpb24gbnVtYmVyIGFuZCBtb2JpbGUgbnVtYmVyIGZpZWxkcy5cbiAgICAgKlxuICAgICAqIFRoZSBleHRlbnNpb24gbnVtYmVyIG1hc2sgbGVuZ3RoIGlzIGRyaXZlbiBieSB0aGUgQVBJOiBpdCB1c2VzXG4gICAgICogYGV4dGVuc2lvbi5leHRlbnNpb25zTGVuZ3RoYCAocG9wdWxhdGVkIGZyb20gdGhlIHNlcnZlciwgbm8gSmF2YVNjcmlwdCBkZWZhdWx0KVxuICAgICAqIHRvIGJ1aWxkIGEgYDl7MixOfWAgZGlnaXQgbWFzaywgYXBwbGllZCBvbmx5IHdoZW4gTiBpcyBiZXR3ZWVuIDIgYW5kIDExLlxuICAgICAqIEl0cyBgb25jb21wbGV0ZWAgaGFuZGxlciBpcyBkZWJvdW5jZWQgd2l0aCBhIDUwMG1zIHNldFRpbWVvdXQgKGNsZWFyaW5nIGFueVxuICAgICAqIHBlbmRpbmcgdGltZXIpIGJlZm9yZSBpbnZva2luZyBgY2JPbkNvbXBsZXRlTnVtYmVyKClgLlxuICAgICAqXG4gICAgICogQWxzbyBjb25maWd1cmVzIHRoZSBtb2JpbGUgbnVtYmVyIG1hc2tzIGZyb20gYElucHV0TWFza1BhdHRlcm5zYCwgYSBwYXN0ZVxuICAgICAqIGhhbmRsZXIsIGFuZCBhIGB2YWwub3ZlcnJpZGVgIGV2ZW50IGhhbmRsZXIgdGhhdCB0ZW1wb3JhcmlseSByZW1vdmVzIHRoZVxuICAgICAqIG1hc2sgc28gYSB2YWx1ZSBjYW4gYmUgc2V0IHByb2dyYW1tYXRpY2FsbHkgKHVzZWQgYnkgdGVzdHMgYW5kIGF1dG9tYXRpb24pLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dE1hc2tzKCl7XG4gICAgICAgIC8vIFNldCB1cCBudW1iZXIgaW5wdXQgbWFzayB3aXRoIGNvcnJlY3QgbGVuZ3RoIGZyb20gQVBJXG4gICAgICAgIGxldCB0aW1lb3V0TnVtYmVySWQ7XG5cbiAgICAgICAgLy8gQWx3YXlzIGluaXRpYWxpemUgbWFzayBiYXNlZCBvbiBleHRlbnNpb25zX2xlbmd0aCBmcm9tIEFQSVxuICAgICAgICAvLyBObyBkZWZhdWx0cyBpbiBKYXZhU2NyaXB0IC0gdmFsdWUgbXVzdCBjb21lIGZyb20gQVBJXG4gICAgICAgIGlmIChleHRlbnNpb24uZXh0ZW5zaW9uc0xlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uc0xlbmd0aCA9IHBhcnNlSW50KGV4dGVuc2lvbi5leHRlbnNpb25zTGVuZ3RoLCAxMCk7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uc0xlbmd0aCA+PSAyICYmIGV4dGVuc2lvbnNMZW5ndGggPD0gMTEpIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIG1hc2sgd2l0aCBjb3JyZWN0IGxlbmd0aCBhbmQgb25jb21wbGV0ZSBoYW5kbGVyXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKHtcbiAgICAgICAgICAgICAgICAgICAgbWFzazogYDl7Miwke2V4dGVuc2lvbnNMZW5ndGh9fWAsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnXycsXG4gICAgICAgICAgICAgICAgICAgIG9uY29tcGxldGU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBwcmV2aW91cyB0aW1lciwgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGltZW91dE51bWJlcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXROdW1iZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0TnVtYmVySWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlTnVtYmVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vbigncGFzdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrcyBmb3IgdGhlIG1vYmlsZSBudW1iZXIgaW5wdXQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZSBtYXNrIGxpc3QgaXMgcGFydGl0aW9uZWQgc28gdGhhdCBtYXNrcyBXSVRIT1VUIGEgbGVhZGluZyBcIitcIiAocGxhaW4gbmF0aW9uYWxcbiAgICAgICAgLy8gYW5kIHNob3J0LW51bWJlciBmb3JtYXRzKSBhcmUgbWF0Y2hlZCBiZWZvcmUgdGhlIHBlci1jb3VudHJ5IFwiK1wiIG1hc2tzLiBDb21iaW5lZFxuICAgICAgICAvLyB3aXRoIHRoZSBwbGFpbiA3LWRpZ2l0IGZvcm1hdHMgaW4gSW5wdXRNYXNrUGF0dGVybnMsIHRoaXMgbGV0cyBzaG9ydCBpbnRlcm5hbFxuICAgICAgICAvLyBudW1iZXJzICg1LzYvNyBkaWdpdHMpIGtlZXAgYSBwbGFpbiBmb3JtYXQgYW5kIGNvbXBsZXRlL3NhdmUgaW5zdGVhZCBvZiBiZWluZ1xuICAgICAgICAvLyBoaWphY2tlZCBieSBhIGNvdW50cnktY29kZSBtYXNrIChlLmcuIFwiKzIxMS0xMS1fX18tX19fX1wiKSB0aGF0IG5ldmVyIGNvbXBsZXRlc1xuICAgICAgICAvLyBhbmQgYmxvY2tzIHRoZSBzYXZlIChpc3N1ZSAjMTA4MSBmb2xsb3ctdXApLiBOdW1iZXJzIGxvbmdlciB0aGFuIDcgZGlnaXRzLCBvciBhbnlcbiAgICAgICAgLy8gdmFsdWUgc3RhcnRpbmcgd2l0aCBcIitcIiwgaGF2ZSBubyBwbGFpbiBtYXRjaCBsZWZ0IGFuZCBmYWxsIHRocm91Z2ggdG8gdGhlIGZ1bGxcbiAgICAgICAgLy8gcGVyLWNvdW50cnkgaW50ZXJuYXRpb25hbCBmb3JtYXR0aW5nIGF1dG9tYXRpY2FsbHkuXG4gICAgICAgIGNvbnN0IHNvcnRlZE1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG4gICAgICAgIGNvbnN0IG1vYmlsZU1hc2tMaXN0ID0gc29ydGVkTWFza0xpc3RcbiAgICAgICAgICAgIC5maWx0ZXIoaXRlbSA9PiBpdGVtLm1hc2suY2hhckF0KDApICE9PSAnKycpXG4gICAgICAgICAgICAuY29uY2F0KHNvcnRlZE1hc2tMaXN0LmZpbHRlcihpdGVtID0+IGl0ZW0ubWFzay5jaGFyQXQoMCkgPT09ICcrJykpO1xuXG4gICAgICAgIC8vIFJldXNhYmxlIChyZSlpbml0aWFsaXNlciBzbyB0aGUgZGlhbC1zdHJpbmcgYXV0by1maWxsIGJlbG93IGNhbiByZS1hcHBseSB0aGUgbWFza1xuICAgICAgICAvLyB0byBhIGZyZXNobHkgaW5qZWN0ZWQgcmF3IHZhbHVlIHdpdGhvdXQgaXQgYmVpbmcgdHJ1bmNhdGVkIGJ5IHRoZSBwcmV2aW91cyBtYXNrLlxuICAgICAgICBleHRlbnNpb24uaW5pdE1vYmlsZU1hc2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrcyh7XG4gICAgICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnIyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3I6ICdbMC05XScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FyZGluYWxpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmNsZWFyZWQ6IGV4dGVuc2lvbi5jYk9uQ2xlYXJlZE1vYmlsZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgb25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgc2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgICAgIHJlcGxhY2U6ICc5JyxcbiAgICAgICAgICAgICAgICBsaXN0OiBtb2JpbGVNYXNrTGlzdCxcbiAgICAgICAgICAgICAgICBsaXN0S2V5OiAnbWFzaycsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgZXh0ZW5zaW9uLmluaXRNb2JpbGVNYXNrKCk7XG5cbiAgICAgICAgLy8gQWRkIGhhbmRsZXIgZm9yIHByb2dyYW1tYXRpYyB2YWx1ZSBjaGFuZ2VzIChmb3IgdGVzdHMgYW5kIGF1dG9tYXRpb24pXG4gICAgICAgIGNvbnN0IG9yaWdpbmFsVmFsID0gJC5mbi52YWw7XG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5vZmYoJ3ZhbC5vdmVycmlkZScpLm9uKCd2YWwub3ZlcnJpZGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0aGlzID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgICAgICAgIC8vIElmIHNldHRpbmcgYSB2YWx1ZSBwcm9ncmFtbWF0aWNhbGx5XG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAwICYmIHR5cGVvZiBhcmdzWzBdID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gYXJnc1swXTtcblxuICAgICAgICAgICAgICAgIC8vIFRlbXBvcmFyaWx5IHJlbW92ZSBtYXNrXG4gICAgICAgICAgICAgICAgaWYgKCR0aGlzLmRhdGEoJ2lucHV0bWFzaycpKSB7XG4gICAgICAgICAgICAgICAgICAgICR0aGlzLmlucHV0bWFzaygncmVtb3ZlJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZVxuICAgICAgICAgICAgICAgIG9yaWdpbmFsVmFsLmFwcGx5KHRoaXMsIGFyZ3MpO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVhcHBseSBtYXNrIGFmdGVyIGEgc2hvcnQgZGVsYXlcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJHRoaXMudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5vbigncGFzdGUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7IC8vIFByZXZlbnQgZGVmYXVsdCBwYXN0ZSBiZWhhdmlvclxuXG4gICAgICAgICAgICAvLyBHZXQgcGFzdGVkIGRhdGEgZnJvbSBjbGlwYm9hcmRcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG5cbiAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgZGF0YSBmcm9tIGNsaXBib2FyZCBldmVudFxuICAgICAgICAgICAgaWYgKGUub3JpZ2luYWxFdmVudCAmJiBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YSAmJiBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5jbGlwYm9hcmREYXRhICYmIGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gRGlyZWN0IGNsaXBib2FyZERhdGEgYWNjZXNzXG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5jbGlwYm9hcmREYXRhICYmIHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgSUVcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiB3ZSBjb3VsZG4ndCBnZXQgY2xpcGJvYXJkIGRhdGEsIGRvbid0IHByb2Nlc3NcbiAgICAgICAgICAgIGlmICghcGFzdGVkRGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUHJvY2VzcyB0aGUgcGFzdGVkIGRhdGFcbiAgICAgICAgICAgIGxldCBwcm9jZXNzZWREYXRhO1xuICAgICAgICAgICAgaWYgKHBhc3RlZERhdGEuY2hhckF0KDApID09PSAnKycpIHtcbiAgICAgICAgICAgICAgICAvLyBLZWVwICcrJyBhbmQgcmVtb3ZlIG90aGVyIG5vbi1kaWdpdCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgcHJvY2Vzc2VkRGF0YSA9ICcrJyArIHBhc3RlZERhdGEuc2xpY2UoMSkucmVwbGFjZSgvXFxEL2csICcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGFsbCBub24tZGlnaXQgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgIHByb2Nlc3NlZERhdGEgPSBwYXN0ZWREYXRhLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluc2VydCBjbGVhbmVkIGRhdGEgaW50byB0aGUgaW5wdXQgZmllbGRcbiAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gaW5wdXQuc2VsZWN0aW9uU3RhcnQgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IGlucHV0LnNlbGVjdGlvbkVuZCB8fCAwO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJChpbnB1dCkudmFsKCkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGN1cnJlbnRWYWx1ZS5zdWJzdHJpbmcoMCwgc3RhcnQpICsgcHJvY2Vzc2VkRGF0YSArIGN1cnJlbnRWYWx1ZS5zdWJzdHJpbmcoZW5kKTtcblxuICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgcmVtb3ZlIG1hc2ssIHNldCB2YWx1ZSwgdGhlbiByZWFwcGx5XG4gICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKFwicmVtb3ZlXCIpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLnZhbChuZXdWYWx1ZSk7XG5cbiAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSB0aGUgdmFsdWUgaXMgc2V0IGJlZm9yZSByZWFwcGx5aW5nIG1hc2tcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgaW5wdXQgZXZlbnQgdG8gcmVhcHBseSB0aGUgbWFza1xuICAgICAgICAgICAgICAgICQoaW5wdXQpLnRyaWdnZXIoJ2lucHV0Jyk7XG4gICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCB0aGUgaW5wdXQgbWFzayBmb3IgdGhlIGVtYWlsIGlucHV0XG4gICAgICAgIGxldCB0aW1lb3V0RW1haWxJZDtcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZTogKCk9PntcbiAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgcHJldmlvdXMgdGltZXIsIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICh0aW1lb3V0RW1haWxJZCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dEVtYWlsSWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgICAgICAgdGltZW91dEVtYWlsSWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsKCk7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBleHRlbnNpb24uJGVtYWlsLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vQXR0YWNoIGEgZm9jdXNvdXQgZXZlbnQgbGlzdGVuZXIgdG8gdGhlIG1vYmlsZSBudW1iZXIgaW5wdXRcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmZvY3Vzb3V0KGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsZXQgcGhvbmUgPSAkKGUudGFyZ2V0KS52YWwoKS5yZXBsYWNlKC9bXjAtOV0vZywgXCJcIik7XG4gICAgICAgICAgICBpZiAocGhvbmUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJChlLnRhcmdldCkudmFsKCcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gV2hlbiB0aGUgZGlhbCBzdHJpbmcgb3ZlcnJpZGUgaXMgZmlsbGVkIHdoaWxlIHRoZSBtb2JpbGUgbnVtYmVyIGlzIHN0aWxsIGVtcHR5LFxuICAgICAgICAvLyBjb3B5IGl0IGludG8gdGhlIChlbXB0eSkgbW9iaWxlIG51bWJlciBhbmQgbGV0IHRoZSBtYXNrIGVuZ2FnZS4gV2l0aG91dCBhIG1vYmlsZVxuICAgICAgICAvLyBudW1iZXIgdGhlIGJhY2tlbmQgZHJvcHMgdGhlIHdob2xlIEV4dGVybmFsUGhvbmVzIHJvdyBvbiBzYXZlLCBzaWxlbnRseSBjbGVhcmluZ1xuICAgICAgICAvLyB0aGUgZGlhbCBzdHJpbmcgdGhlIHVzZXIganVzdCB0eXBlZCAoaXNzdWUgIzEwODEgZm9sbG93LXVwKS5cbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfZGlhbHN0cmluZy5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc3QgZGlhbHN0cmluZyA9ICh0aGlzLnZhbHVlIHx8ICcnKS50cmltKCk7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50TW9iaWxlID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmRhdGEoJ2lucHV0bWFzaycpXG4gICAgICAgICAgICAgICAgPyBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJylcbiAgICAgICAgICAgICAgICA6IChleHRlbnNpb24uJG1vYmlsZV9udW1iZXIudmFsKCkgfHwgJycpO1xuICAgICAgICAgICAgLy8gT25seSBhdXRvLWZpbGwgZnJvbSBhIHBsYWluIHBob25lLW51bWJlciBkaWFsIHN0cmluZyAob3B0aW9uYWwgbGVhZGluZyBcIitcIikuXG4gICAgICAgICAgICAvLyBBIG5vbi1udW1lcmljIGRpYWwgc3RyaW5nIChlLmcuIFwiU0lQL3RydW5rLzEyM1wiKSB3b3VsZCBiZSBtYW5nbGVkIGJ5IHRoZVxuICAgICAgICAgICAgLy8gZGlnaXQtb25seSBtYXNrLCBzbyBpdCBpcyBsZWZ0IHVudG91Y2hlZC5cbiAgICAgICAgICAgIGlmICgvXlxcKz9cXGQrJC8udGVzdChkaWFsc3RyaW5nKSAmJiBjdXJyZW50TW9iaWxlID09PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgY3VycmVudCBtYXNrLCBpbmplY3QgdGhlIHJhdyB2YWx1ZSAoc28gaXQgaXMgbm90IHRydW5jYXRlZCBieSBhXG4gICAgICAgICAgICAgICAgLy8gc2hvcnRlciBhY3RpdmUgbWFzayksIHRoZW4gcmUtaW5pdGlhbGlzZSBzbyB0aGUgcmlnaHQgbWFzayBpcyBjaG9zZW4gYW5kXG4gICAgICAgICAgICAgICAgLy8gZm9ybWF0dGluZyBhcHBsaWVkLiAnY2hhbmdlJyBrZWVwcyBkZXBlbmRlbnQgaGFuZGxlcnMgKGF2YWlsYWJpbGl0eSkgaW4gc3luYy5cbiAgICAgICAgICAgICAgICAvLyBOT1RFOiBpbnB1dG1hc2tzKCdyZW1vdmUnKSBudWxscyB0aGUgYC5pbnB1dG1hc2tzYCBtZXRob2Qgb24gdGhlIGpRdWVyeVxuICAgICAgICAgICAgICAgIC8vIG9iamVjdCBpdCBpcyBjYWxsZWQgb24sIHNvIGNhbGwgaXQgb24gYSB0aHJvd2F3YXkgd3JhcHBlciwgbm90IHRoZSBjYWNoZWQgb25lLlxuICAgICAgICAgICAgICAgICQoJyNtb2JpbGVfbnVtYmVyJykuaW5wdXRtYXNrcygncmVtb3ZlJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLnZhbChkaWFsc3RyaW5nKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uaW5pdE1vYmlsZU1hc2soKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBuZXcgU0lQIHBhc3N3b3JkLlxuICAgICAqIFVzZXMgdGhlIFBhc3N3b3JkV2lkZ2V0IGJ1dHRvbiBsaWtlIGluIEFNSSBtYW5hZ2VyLlxuICAgICAqL1xuICAgIGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSB7XG4gICAgICAgIC8vIFRyaWdnZXIgcGFzc3dvcmQgZ2VuZXJhdGlvbiB0aHJvdWdoIHRoZSB3aWRnZXQgYnV0dG9uIChsaWtlIGluIEFNSSlcbiAgICAgICAgY29uc3QgJGdlbmVyYXRlQnRuID0gZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LmNsb3Nlc3QoJy51aS5pbnB1dCcpLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICBpZiAoJGdlbmVyYXRlQnRuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRnZW5lcmF0ZUJ0bi50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhLm1vYmlsZV9udW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIGZvcm0gY29udHJvbCBmaWVsZHMgdGhhdCBzaG91bGRuJ3QgYmUgc2VudCB0byBzZXJ2ZXJcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLmRpcnJ0eTtcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLnN1Ym1pdE1vZGU7XG4gICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YS51c2VyX2lkOyAvLyBSZW1vdmUgdXNlcl9pZCBmaWVsZCB0byBwcmV2ZW50IHZhbGlkYXRpb24gaXNzdWVzXG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgcmVjb3JkIChjaGVjayBpZiB3ZSBoYXZlIGEgcmVhbCBJRClcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBTdG9yZSB0aGUgY3VycmVudCBleHRlbnNpb24gbnVtYmVyIGFzIHRoZSBkZWZhdWx0IG51bWJlciBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLm51bWJlcikge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gcmVzcG9uc2UuZGF0YS5udW1iZXI7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBwaG9uZSByZXByZXNlbnRhdGlvbiB3aXRoIHRoZSBuZXcgZGVmYXVsdCBudW1iZXJcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lUmVwcmVzZW50KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGUgYW5kIHJlc3BvbnNlLnJlbG9hZCBmcm9tIHNlcnZlclxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5ncyBmb3IgUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBleHRlbnNpb24uJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGV4dGVuc2lvbi52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBleHRlbnNpb24uY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBleHRlbnNpb24uY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gRW1wbG95ZWVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgYXV0b21hdGljIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvblxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgY2hlY2tib3ggdmFsdWVzIGFyZSBzZW50IGFzIHRydWUvZmFsc2UgaW5zdGVhZCBvZiBcIm9uXCIvdW5kZWZpbmVkXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBWNS4wIEFyY2hpdGVjdHVyZTogTG9hZCBleHRlbnNpb24gZGF0YSB2aWEgUkVTVCBBUEkgKHNpbWlsYXIgdG8gSVZSIG1lbnUgcGF0dGVybilcbiAgICAgKi9cbiAgICBsb2FkRXh0ZW5zaW9uRGF0YSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBleHRlbnNpb24uZ2V0UmVjb3JkSWQoKTtcblxuICAgICAgICAvLyBVc2UgJ25ldycgYXMgSUQgZm9yIG5ldyByZWNvcmRzIHRvIGdldCBkZWZhdWx0IHZhbHVlcyBmcm9tIHNlcnZlclxuICAgICAgICBjb25zdCBhcGlJZCA9IHJlY29yZElkID09PSAnJyA/ICduZXcnIDogcmVjb3JkSWQ7XG5cbiAgICAgICAgLy8gSGlkZSBtb25pdG9yaW5nIGVsZW1lbnRzIGZvciBuZXcgZW1wbG95ZWVzXG4gICAgICAgIGlmIChhcGlJZCA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgICQoJyNzdGF0dXMnKS5oaWRlKCk7IC8vIEhpZGUgc3RhdHVzIGxhYmVsXG4gICAgICAgICAgICAkKCdhW2RhdGEtdGFiPVwic3RhdHVzXCJdJykuaGlkZSgpOyAvLyBIaWRlIG1vbml0b3JpbmcgdGFiXG4gICAgICAgIH1cblxuICAgICAgICBFbXBsb3llZXNBUEkuZ2V0UmVjb3JkKGFwaUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRCAoZm9sbG93aW5nIENhbGxRdWV1ZXMgcGF0dGVybilcbiAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLnBvcHVsYXRlRm9ybVdpdGhEYXRhKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIC8vIFN0b3JlIGRlZmF1bHQgdmFsdWVzIGFmdGVyIGRhdGEgbG9hZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gcmVzcG9uc2UuZGF0YS5udW1iZXIgfHwgJyc7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9IHJlc3BvbnNlLmRhdGEudXNlcl9lbWFpbCB8fCAnJztcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IHJlc3BvbnNlLmRhdGEubW9iaWxlX251bWJlciB8fCAnJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBzdGlsbCBpbml0aWFsaXplIGF2YXRhciBldmVuIGlmIEFQSSBmYWlsc1xuICAgICAgICAgICAgICAgIGlmIChyZWNvcmRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgYXZhdGFyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgZXh0ZW5zaW9uIGRhdGEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMIChsaWtlIElWUiBtZW51KVxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gUkVTVCBBUEkgKFY1LjAgY2xlYW4gZGF0YSBhcmNoaXRlY3R1cmUpXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtV2l0aERhdGEoZGF0YSkge1xuICAgICAgICAvLyBTdG9yZSBleHRlbnNpb25zX2xlbmd0aCBmcm9tIEFQSSBmb3IgdXNlIGluIGluaXRpYWxpemVJbnB1dE1hc2tzXG4gICAgICAgIC8vIFRoaXMgdmFsdWUgTVVTVCBjb21lIGZyb20gQVBJIC0gbm8gZGVmYXVsdHMgaW4gSlNcbiAgICAgICAgZXh0ZW5zaW9uLmV4dGVuc2lvbnNMZW5ndGggPSBkYXRhLmV4dGVuc2lvbnNfbGVuZ3RoO1xuXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoIChzYW1lIGFzIElWUiBtZW51KVxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggVjUuMCBzcGVjaWFsaXplZCBjbGFzc2VzIC0gY29tcGxldGUgYXV0b21hdGlvblxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YShmb3JtRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiBhbnkgVUkgZWxlbWVudHMgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgaWYgKGZvcm1EYXRhLm51bWJlcikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLW51bWJlci1kaXNwbGF5JykudGV4dChmb3JtRGF0YS5udW1iZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGF2YXRhciBjb21wb25lbnQgYWZ0ZXIgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgICAgICAgICAgYXZhdGFyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgYXZhdGFyIFVSTCBkeW5hbWljYWxseSBmcm9tIEFQSSBkYXRhXG4gICAgICAgICAgICAgICAgYXZhdGFyLnNldEF2YXRhclVybChmb3JtRGF0YS51c2VyX2F2YXRhcik7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBtb2RpZnkgc3RhdHVzIG1vbml0b3IgYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIGVtcGxveWVlIG5hbWUgYW5kIGV4dGVuc2lvbiBudW1iZXJcbiAgICAgICAgICAgICAgICBleHRlbnNpb24udXBkYXRlUGFnZUhlYWRlcihmb3JtRGF0YS51c2VyX3VzZXJuYW1lLCBmb3JtRGF0YS5udW1iZXIpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0KGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgaW5wdXQgbWFza3MgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUlucHV0TWFza3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBOT1RFOiBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCkgd2lsbCBiZSBjYWxsZWQgYXV0b21hdGljYWxseSBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KClcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggY2xlYW4gZGF0YSAtIFY1LjAgQXJjaGl0ZWN0dXJlXG4gICAgICogVXNlcyBzcGVjaWFsaXplZCBjbGFzc2VzIHdpdGggY29tcGxldGUgYXV0b21hdGlvbiAobm8gb25DaGFuZ2UgY2FsbGJhY2tzIG5lZWRlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgZm9yd2FyZGluZyBkcm9wZG93biBpbnN0YW5jZXMgYmVmb3JlIHJlLWluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyBwcm9wZXIgcmUtY3JlYXRpb24gd2hlbiBmb3JtIGRhdGEgaXMgcmVsb2FkZWQgKGUuZy4sIGFmdGVyIHNhdmUpXG4gICAgICAgIGNvbnN0IGZvcndhcmRpbmdGaWVsZHMgPSBbJ2Z3ZF9mb3J3YXJkaW5nJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSddO1xuICAgICAgICBmb3J3YXJkaW5nRmllbGRzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIGlmIChFeHRlbnNpb25TZWxlY3Rvci5pbnN0YW5jZXMuaGFzKGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5kZXN0cm95KGZpZWxkTmFtZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRXh0ZW5zaW9uIGRyb3Bkb3ducyB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvbiAtIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZndkX2ZvcndhcmRpbmcnLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZ29uYnVzeScsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJywgXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIEFQSSBkYXRhIC0gVjUuMCBiYXNlIGNsYXNzXG4gICAgICAgIFxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3NpcF9uZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6IGAvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109U0lQYCxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0TmV0d29ya0ZpbHRlcixcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFY1LjAgYXJjaGl0ZWN0dXJlIHdpdGggZW1wdHkgZm9ybSBzaG91bGQgbm90IGhhdmUgSFRNTCBlbnRpdGllcyBpc3N1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXMgLSByZWJ1aWxkIGRyb3Bkb3ducyB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIub2ZmKCdjaGFuZ2UuZHJvcGRvd24nKS5vbignY2hhbmdlLmRyb3Bkb3duJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV3RXh0ZW5zaW9uID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdudW1iZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG5ld0V4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleGNsdXNpb25zIGZvciBmb3J3YXJkaW5nIGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uKG5ld0V4dGVuc2lvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpO1xuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKGRhdGEpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGZvcndhcmRpbmcgZHJvcGRvd25zIHdoZW4gZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzXG4gICAgICovXG4gICAgdXBkYXRlRm9yd2FyZGluZ0Ryb3Bkb3duc0V4Y2x1c2lvbihuZXdFeHRlbnNpb24pIHtcbiAgICAgICAgY29uc3QgZm9yd2FyZGluZ0ZpZWxkcyA9IFsnZndkX2ZvcndhcmRpbmcnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJ107XG4gICAgICAgIFxuICAgICAgICBmb3J3YXJkaW5nRmllbGRzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICQoYCMke2ZpZWxkTmFtZX1gKS52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Jykubm90KCcuZGVmYXVsdCcpLmh0bWwoKSB8fCAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBpbnN0YW5jZSBmaXJzdFxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuZGVzdHJveShmaWVsZE5hbWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgb2xkIGRyb3Bkb3duIERPTSBlbGVtZW50XG4gICAgICAgICAgICAkZHJvcGRvd24ucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSBuZXcgZGF0YSBvYmplY3Qgd2l0aCBjdXJyZW50IHZhbHVlIGZvciByZWluaXRpYWxpemluZ1xuICAgICAgICAgICAgY29uc3QgcmVmcmVzaERhdGEgPSB7fTtcbiAgICAgICAgICAgIHJlZnJlc2hEYXRhW2ZpZWxkTmFtZV0gPSBjdXJyZW50VmFsdWU7XG4gICAgICAgICAgICByZWZyZXNoRGF0YVtgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGBdID0gY3VycmVudFRleHQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlaW5pdGlhbGl6ZSB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoZmllbGROYW1lLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbbmV3RXh0ZW5zaW9uXSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogcmVmcmVzaERhdGFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0IGFmdGVyIGZvcm0gZGF0YSBpcyBsb2FkZWRcbiAgICAgKiBUaGlzIGVuc3VyZXMgdmFsaWRhdGlvbiBvbmx5IGhhcHBlbnMgYWZ0ZXIgcGFzc3dvcmQgaXMgcG9wdWxhdGVkIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZm9ybURhdGEgLSBUaGUgZm9ybSBkYXRhIGxvYWRlZCBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0KGZvcm1EYXRhKSB7XG4gICAgICAgIGlmICghZXh0ZW5zaW9uLiRzaXBfc2VjcmV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGlkZSBhbnkgbGVnYWN5IGJ1dHRvbnMgaWYgdGhleSBleGlzdFxuICAgICAgICAkKCcuY2xpcGJvYXJkJykuaGlkZSgpO1xuICAgICAgICAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJykuaGlkZSgpO1xuXG4gICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IGV4dGVuc2lvbiAobm8gSUQpIG9yIGV4aXN0aW5nIG9uZVxuICAgICAgICBjb25zdCBpc05ld0V4dGVuc2lvbiA9ICFmb3JtRGF0YS5pZCB8fCBmb3JtRGF0YS5pZCA9PT0gJyc7XG5cbiAgICAgICAgY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdChleHRlbnNpb24uJHNpcF9zZWNyZXQsIHtcbiAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVCwgIC8vIFNvZnQgdmFsaWRhdGlvbiAtIHNob3cgd2FybmluZ3MgYnV0IGFsbG93IHN1Ym1pc3Npb25cbiAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLCAgICAgICAgIC8vIFNob3cgZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsICAgICAvLyBTaG93IHNob3cvaGlkZSBwYXNzd29yZCB0b2dnbGVcbiAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSwgICAgICAgIC8vIFNob3cgY29weSB0byBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsICAgICAgICAvLyBTaG93IHBhc3N3b3JkIHN0cmVuZ3RoIGJhclxuICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLCAgICAgICAgICAgLy8gU2hvdyB2YWxpZGF0aW9uIHdhcm5pbmdzXG4gICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsICAgICAgICAvLyBWYWxpZGF0ZSBhcyB1c2VyIHR5cGVzXG4gICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZSwgLy8gQWx3YXlzIHZhbGlkYXRlIGlmIHBhc3N3b3JkIGZpZWxkIGhhcyB2YWx1ZVxuICAgICAgICAgICAgbWluU2NvcmU6IDYwLCAgICAgICAgICAgICAgICAgLy8gTWF0Y2ggdGhlIGF1dGhvcml0YXRpdmUgU0lQIHRocmVzaG9sZCBvbiB0aGUgc2VydmVyXG4gICAgICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMjAsICAgICAgICAgICAvLyAyMCBjaGFycyBtYXggZm9yIEdyYW5kc3RyZWFtIEdETVMgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgaW5jbHVkZVNwZWNpYWw6IGZhbHNlLCAgICAgICAgLy8gRXhjbHVkZSBzcGVjaWFsIGNoYXJhY3RlcnMgZm9yIFNJUCBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICBvbkdlbmVyYXRlOiAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblZhbGlkYXRlOiAoaXNWYWxpZCwgc2NvcmUsIG1lc3NhZ2VzKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gT3B0aW9uYWw6IEhhbmRsZSB2YWxpZGF0aW9uIHJlc3VsdHMgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgLy8gVGhlIHdpZGdldCB3aWxsIGhhbmRsZSB2aXN1YWwgZmVlZGJhY2sgYXV0b21hdGljYWxseVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIHdpZGdldCBpbnN0YW5jZSBmb3IgbGF0ZXIgdXNlXG4gICAgICAgIGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBuZXcgZXh0ZW5zaW9ucyBvbmx5OiBhdXRvLWdlbmVyYXRlIHBhc3N3b3JkIGlmIGZpZWxkIGlzIGVtcHR5XG4gICAgICAgIGlmIChpc05ld0V4dGVuc2lvbiAmJiBleHRlbnNpb24uJHNpcF9zZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBleHRlbnNpb24uJHNpcF9zZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRnZW5lcmF0ZUJ0bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICRnZW5lcmF0ZUJ0bi50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRFRNRiBtb2RlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNzaXBfZHRtZm1vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfSk7XG4gICAgIH0sXG4gICAgICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJhbnNwb3J0IHByb3RvY29sIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKlxuICAgICAqIFRoZSBkZXByZWNhdGVkIFwidGxzXCIgb3B0aW9uIHN0YXlzIG9ubHkgZm9yIGVtcGxveWVlcyB0aGF0IGFscmVhZHkgaGF2ZSBpdCBzYXZlZCxcbiAgICAgKiBhY2NvbXBhbmllZCBieSBhIHdhcm5pbmcgc3VnZ2VzdGluZyB0aGUgXCI8bnVtYmVyPi1UTFNcIiB1c2VybmFtZSBpbnN0ZWFkLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRW1wbG95ZWUgZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKGRhdGEpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3NpcF90cmFuc3BvcnQtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcblxuICAgICAgICAkKCcjc2lwLXRyYW5zcG9ydC10bHMtd2FybmluZycpLnJlbW92ZSgpO1xuICAgICAgICBpZiAoZGF0YS5zaXBfdHJhbnNwb3J0ID09PSAndGxzJykge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUbHNEZXByZWNhdGVkXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoLyVudW1iZXIlL2csICQoJzxkaXY+JykudGV4dChkYXRhLm51bWJlciB8fCAnJykuaHRtbCgpKTtcbiAgICAgICAgICAgICRkcm9wZG93bi5jbG9zZXN0KCcuZmllbGQnKS5hZnRlcihcbiAgICAgICAgICAgICAgICBgPGRpdiBpZD1cInNpcC10cmFuc3BvcnQtdGxzLXdhcm5pbmdcIiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZSB2aXNpYmxlXCI+JHttZXNzYWdlfTwvZGl2PmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZmluZCgnLm1lbnUgLml0ZW1bZGF0YS12YWx1ZT1cInRsc1wiXScpLnJlbW92ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggZW1wbG95ZWUgbmFtZSBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBlbXBsb3llZU5hbWUgLSBOYW1lIG9mIHRoZSBlbXBsb3llZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb25OdW1iZXIgLSBFeHRlbnNpb24gbnVtYmVyIChvcHRpb25hbClcbiAgICAgKi9cbiAgICB1cGRhdGVQYWdlSGVhZGVyKGVtcGxveWVlTmFtZSwgZXh0ZW5zaW9uTnVtYmVyKSB7XG4gICAgICAgIGxldCBoZWFkZXJUZXh0O1xuXG4gICAgICAgIGlmIChlbXBsb3llZU5hbWUgJiYgZW1wbG95ZWVOYW1lLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIC8vIEV4aXN0aW5nIGVtcGxveWVlIHdpdGggbmFtZVxuICAgICAgICAgICAgaGVhZGVyVGV4dCA9ICc8aSBjbGFzcz1cInVzZXIgb3V0bGluZSBpY29uXCI+PC9pPiAnICsgZW1wbG95ZWVOYW1lO1xuXG4gICAgICAgICAgICAvLyBBZGQgZXh0ZW5zaW9uIG51bWJlciBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25OdW1iZXIgJiYgZXh0ZW5zaW9uTnVtYmVyLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJUZXh0ICs9ICcgJmx0OycgKyBleHRlbnNpb25OdW1iZXIgKyAnJmd0Oyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOZXcgZW1wbG95ZWUgb3Igbm8gbmFtZSB5ZXRcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfQ3JlYXRlTmV3RXh0ZW5zaW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIG1haW4gaGVhZGVyIGNvbnRlbnRcbiAgICAgICAgJCgnaDEgLmNvbnRlbnQnKS5odG1sKGhlYWRlclRleHQpO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBEZWZpbmUgYSBjdXN0b20gcnVsZSBmb3IgalF1ZXJ5IGZvcm0gdmFsaWRhdGlvbiBuYW1lZCAnZXh0ZW5zaW9uUnVsZScuXG4gKiBUaGUgcnVsZSBjaGVja3MgaWYgYSBmb3J3YXJkaW5nIG51bWJlciBpcyBzZWxlY3RlZCBidXQgdGhlIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRoZSB2YWxpZGF0aW9uIHJlc3VsdC4gSWYgZm9yd2FyZGluZyBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgaXQgcmV0dXJucyBmYWxzZSAoaW52YWxpZCkuIE90aGVyd2lzZSwgaXQgcmV0dXJucyB0cnVlICh2YWxpZCkuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbnNpb25SdWxlID0gKCkgPT4ge1xuICAgIC8vIEdldCByaW5nIGxlbmd0aCBhbmQgZm9yd2FyZGluZyBudW1iZXIgZnJvbSB0aGUgZm9ybVxuICAgIGNvbnN0IGZ3ZFJpbmdMZW5ndGggPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk7XG4gICAgY29uc3QgZndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcblxuICAgIC8vIElmIGZvcndhcmRpbmcgbnVtYmVyIGlzIHNldCBhbmQgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LCByZXR1cm4gZmFsc2UgKGludmFsaWQpXG4gICAgaWYgKGZ3ZEZvcndhcmRpbmcubGVuZ3RoID4gMFxuICAgICAgICAmJiAoXG4gICAgICAgICAgICBmd2RSaW5nTGVuZ3RoID09PSAwXG4gICAgICAgICAgICB8fFxuICAgICAgICAgICAgZndkUmluZ0xlbmd0aCA9PT0gJydcbiAgICAgICAgKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCByZXR1cm4gdHJ1ZSAodmFsaWQpXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgbnVtYmVyIGlzIHRha2VuIGJ5IGFub3RoZXIgYWNjb3VudFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHBhcmFtZXRlciBoYXMgdGhlICdoaWRkZW4nIGNsYXNzLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG5cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5wYXNzd29yZFN0cmVuZ3RoID0gKCkgPT4ge1xuICAgIGlmICghZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBQYXNzIHZhbGlkYXRpb24gaWYgd2lkZ2V0IG5vdCBpbml0aWFsaXplZFxuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlID0gZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbCgpO1xuXG4gICAgLy8gQW4gZW1wdHkgb3IgbWFza2VkICh1bmNoYW5nZWQpIGV4aXN0aW5nIHBhc3N3b3JkIGlzIG5vdCByZS1nYXRlZC5cbiAgICBpZiAoIXZhbHVlIHx8IFBhc3N3b3JkV2lkZ2V0LmlzTWFza2VkUGFzc3dvcmQodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIEdhdGUgb24gYSBzeW5jaHJvbm91cyBsb2NhbCBzY29yZSBvZiB0aGUgQ1VSUkVOVCBmaWVsZCB2YWx1ZSByYXRoZXIgdGhhbiB0aGVcbiAgICAvLyBhc3luYyBzdGF0ZS5zY29yZS4gc3RhdGUuc2NvcmUgaXMgb25seSB3cml0dGVuIHdoZW4gdGhlIGRlYm91bmNlZC9pbi1mbGlnaHRcbiAgICAvLyB2YWxpZGF0aW9uIGNhbGxiYWNrIGNvbXBsZXRlcywgc28gcmVhZGluZyBpdCBhdCBzdWJtaXQgdGltZSBjYW4gc2VlIGVpdGhlciBhXG4gICAgLy8gbm90LXlldC1jb21wdXRlZCAwIChmYWxzZSByZWplY3QpIG9yIGEgc3RhbGUgaGlnaCBzY29yZSBmcm9tIGEgcHJldmlvdXNseVxuICAgIC8vIHZhbGlkYXRlZCBzdHJvbmdlciB2YWx1ZSAoZmFsc2UgYWNjZXB0KS4gU2NvcmluZyB0aGUgY3VycmVudCB2YWx1ZSBoZXJlIGlzXG4gICAgLy8gcmFjZS1mcmVlOyB0aGUgc2VydmVyIHJlc3VsdCBzdGlsbCBkcml2ZXMgdGhlIGxpdmUgcHJvZ3Jlc3MgYmFyIGFuZCB3YXJuaW5ncy5cbiAgICByZXR1cm4gUGFzc3dvcmRXaWRnZXQuc2NvcmVQYXNzd29yZExvY2FsKHZhbHVlKSA+PSA2MDsgLy8gTWF0Y2ggdGhlIHNlcnZlcidzIFNJUCB0aHJlc2hvbGRcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgRW1wbG95ZWUgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uLmluaXRpYWxpemUoKTtcbn0pO1xuIl19