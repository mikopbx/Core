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
    var $header = $('h1 .content');

    if (employeeName && employeeName.trim() !== '') {
      // Existing employee with name: user-controlled values go in as text (GHSA-qhh5-4p3h-6jwx)
      var headerText = employeeName; // Add extension number if available

      if (extensionNumber && extensionNumber.trim() !== '') {
        headerText += " <".concat(extensionNumber, ">");
      }

      $header.empty().append($('<i>').addClass('user outline icon'), ' ', document.createTextNode(headerText));
    } else {
      // New employee or no name yet
      $header.html(globalTranslate.ex_CreateNewExtension);
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJHNpcF9zZWNyZXQiLCIkbW9iaWxlX251bWJlciIsIiRmd2RfZm9yd2FyZGluZyIsIiRmd2RfZm9yd2FyZGluZ29uYnVzeSIsIiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCIkZW1haWwiLCIkdXNlcl91c2VybmFtZSIsInBhc3N3b3JkV2lkZ2V0IiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsImV4X1ZhbGlkYXRlUGFzc3dvcmRUb29XZWFrIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiJCIsIiRtb2JpbGVfZGlhbHN0cmluZyIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImFjY29yZGlvbiIsInBvcHVwIiwib24iLCJhdHRyIiwiaW5pdGlhbGl6ZUZvcm0iLCJjdXJyZW50TnVtYmVyIiwiaW5wdXRtYXNrIiwidmFsIiwidXBkYXRlUGFnZUhlYWRlciIsImN1cnJlbnRVc2VybmFtZSIsIkV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIiwiZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJhcHBseUFDTFBlcm1pc3Npb25zIiwibG9hZEV4dGVuc2lvbkRhdGEiLCJBQ0xIZWxwZXIiLCJjb25zb2xlIiwid2FybiIsImFwcGx5UGVybWlzc2lvbnMiLCJzYXZlIiwic2hvdyIsImVuYWJsZSIsImNhblNhdmUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJkaXNhYmxlIiwiaW5mb01lc3NhZ2UiLCJleF9Ob1Blcm1pc3Npb25Ub01vZGlmeSIsIlVzZXJNZXNzYWdlIiwic2hvd0luZm9ybWF0aW9uIiwiY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlIiwicGFzdGVkVmFsdWUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJuZXdOdW1iZXIiLCJ1c2VySWQiLCJmb3JtIiwiRXh0ZW5zaW9uc0FQSSIsImNoZWNrQXZhaWxhYmlsaXR5IiwiY2JPbkNvbXBsZXRlRW1haWwiLCJuZXdFbWFpbCIsIlVzZXJzQVBJIiwiY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyIiwibmV3TW9iaWxlTnVtYmVyIiwiY3VycmVudERpYWxzdHJpbmciLCJsZW5ndGgiLCJ1c2VyTmFtZSIsImN1cnJlbnRGd2RGb3J3YXJkaW5nIiwiY3VycmVudEZ3ZE9uQnVzeSIsImN1cnJlbnRGd2RPblVuYXZhaWxhYmxlIiwiRXh0ZW5zaW9uU2VsZWN0b3IiLCJzZXRWYWx1ZSIsImNiT25DbGVhcmVkTW9iaWxlTnVtYmVyIiwiY2xlYXIiLCJpbml0aWFsaXplSW5wdXRNYXNrcyIsInRpbWVvdXROdW1iZXJJZCIsImV4dGVuc2lvbnNMZW5ndGgiLCJwYXJzZUludCIsIm1hc2siLCJwbGFjZWhvbGRlciIsIm9uY29tcGxldGUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0Iiwic29ydGVkTWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsIm1vYmlsZU1hc2tMaXN0IiwiZmlsdGVyIiwiaXRlbSIsImNoYXJBdCIsImNvbmNhdCIsImluaXRNb2JpbGVNYXNrIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9yaWdpbmFsVmFsIiwiZm4iLCJvZmYiLCIkdGhpcyIsImFyZ3MiLCJhcmd1bWVudHMiLCJuZXdWYWx1ZSIsImRhdGEiLCJhcHBseSIsInRyaWdnZXIiLCJlIiwicHJldmVudERlZmF1bHQiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwicHJvY2Vzc2VkRGF0YSIsInNsaWNlIiwiaW5wdXQiLCJzdGFydCIsInNlbGVjdGlvblN0YXJ0IiwiZW5kIiwic2VsZWN0aW9uRW5kIiwiY3VycmVudFZhbHVlIiwic3Vic3RyaW5nIiwidGltZW91dEVtYWlsSWQiLCJmb2N1c291dCIsInBob25lIiwidGFyZ2V0IiwiZGlhbHN0cmluZyIsInZhbHVlIiwidHJpbSIsImN1cnJlbnRNb2JpbGUiLCJ0ZXN0IiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIiRnZW5lcmF0ZUJ0biIsImNsb3Nlc3QiLCJmaW5kIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGlycnR5Iiwic3VibWl0TW9kZSIsInVzZXJfaWQiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInVwZGF0ZVBob25lUmVwcmVzZW50Iiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJGb3JtIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiRW1wbG95ZWVzQVBJIiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJhcGlJZCIsImhpZGUiLCJnZXRSZWNvcmQiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm1XaXRoRGF0YSIsImF2YXRhciIsInNob3dFcnJvciIsImVycm9yIiwidXJsUGFydHMiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJleHRlbnNpb25zX2xlbmd0aCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEiLCJ0ZXh0Iiwic2V0QXZhdGFyVXJsIiwidXNlcl9hdmF0YXIiLCJFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yIiwiaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0IiwiZm9yd2FyZGluZ0ZpZWxkcyIsImZvckVhY2giLCJmaWVsZE5hbWUiLCJpbnN0YW5jZXMiLCJoYXMiLCJkZXN0cm95IiwiJGRyb3Bkb3duIiwicmVtb3ZlIiwiaW5pdCIsImV4Y2x1ZGVFeHRlbnNpb25zIiwiaW5jbHVkZUVtcHR5IiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJleF9TZWxlY3ROZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJuZXdFeHRlbnNpb24iLCJ1cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uIiwiaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24iLCJpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24iLCJjdXJyZW50VGV4dCIsIm5vdCIsImh0bWwiLCJyZWZyZXNoRGF0YSIsImlzTmV3RXh0ZW5zaW9uIiwiaWQiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsInZhbGlkYXRpb24iLCJWQUxJREFUSU9OIiwiU09GVCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwidmFsaWRhdGVPbklucHV0IiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwiaW5jbHVkZVNwZWNpYWwiLCJvbkdlbmVyYXRlIiwicGFzc3dvcmQiLCJkYXRhQ2hhbmdlZCIsIm9uVmFsaWRhdGUiLCJpc1ZhbGlkIiwic2NvcmUiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwic2lwX3RyYW5zcG9ydCIsIm1lc3NhZ2UiLCJleF9TaXBUcmFuc3BvcnRUbHNEZXByZWNhdGVkIiwiYWZ0ZXIiLCJlbXBsb3llZU5hbWUiLCJleHRlbnNpb25OdW1iZXIiLCIkaGVhZGVyIiwiaGVhZGVyVGV4dCIsImVtcHR5IiwiYXBwZW5kIiwiZG9jdW1lbnQiLCJjcmVhdGVUZXh0Tm9kZSIsImV4X0NyZWF0ZU5ld0V4dGVuc2lvbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwicGFzc3dvcmRTdHJlbmd0aCIsImlzTWFza2VkUGFzc3dvcmQiLCJzY29yZVBhc3N3b3JkTG9jYWwiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBR0E7QUFDQTtBQUNB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RUFBc0Q7QUFDbEQsV0FBTyxJQUFQO0FBQ0gsR0FWNkMsQ0FZOUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQSxTQUFPbUYsY0FBYyxDQUFDMkMsa0JBQWYsQ0FBa0M5SCxLQUFsQyxLQUE0QyxFQUFuRCxDQWxCOEMsQ0FrQlM7QUFDMUQsQ0FuQkQ7QUFxQkE7QUFDQTtBQUNBOzs7QUFDQXBILENBQUMsQ0FBQ3VPLFFBQUQsQ0FBRCxDQUFZWSxLQUFaLENBQWtCLFlBQU07QUFDcEJsUyxFQUFBQSxTQUFTLENBQUM4QyxVQUFWO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnNBUEksIEVtcGxveWVlc0FQSSwgRm9ybSxcbiBJbnB1dE1hc2tQYXR0ZXJucywgYXZhdGFyLCBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yLCBDbGlwYm9hcmRKUywgUGFzc3dvcmRXaWRnZXQsIFVzZXJNZXNzYWdlLCBBQ0xIZWxwZXIgKi9cblxuXG4vKipcbiAqIFRoZSBleHRlbnNpb24gb2JqZWN0LlxuICogTWFuYWdlcyB0aGUgb3BlcmF0aW9ucyBhbmQgYmVoYXZpb3JzIG9mIHRoZSBleHRlbnNpb24gZWRpdCBmb3JtXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25cbiAqL1xuY29uc3QgZXh0ZW5zaW9uID0ge1xuICAgIGRlZmF1bHRFbWFpbDogJycsXG4gICAgZGVmYXVsdE51bWJlcjogJycsXG4gICAgZGVmYXVsdE1vYmlsZU51bWJlcjogJycsXG4gICAgLyoqXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG51bWJlcjogbnVsbCxcbiAgICAkc2lwX3NlY3JldDogbnVsbCxcbiAgICAkbW9iaWxlX251bWJlcjogbnVsbCxcbiAgICAkZndkX2ZvcndhcmRpbmc6IG51bGwsXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb25idXN5OiBudWxsLFxuICAgICRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IG51bGwsXG4gICAgJGVtYWlsOiBudWxsLFxuICAgICR1c2VyX3VzZXJuYW1lOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogUGFzc3dvcmQgd2lkZ2V0IGluc3RhbmNlLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgcGFzc3dvcmRXaWRnZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYnVsYXIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51SXRlbXM6IG51bGwsXG5cblxuICAgIC8qKlxuICAgICAqIFN0cmluZyBmb3IgdGhlIGZvcndhcmRpbmcgc2VsZWN0LlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZm9yd2FyZGluZ1NlbGVjdDogJyNleHRlbnNpb25zLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBudW1iZXI6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdudW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW251bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBtb2JpbGVfbnVtYmVyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWFzaycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcl9lbWFpbDoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl9lbWFpbCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX3VzZXJuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl91c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzaXBfc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlU2VjcmV0V2VhayxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3Bhc3N3b3JkU3RyZW5ndGgnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVBhc3N3b3JkVG9vV2Vha1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9yaW5nbGVuZ3RoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuICAgICAgICAgICAgZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb24gZm9ybSBhbmQgaXRzIGludGVyYWN0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBSZXNvbHZlIGpRdWVyeSB3cmFwcGVycyBoZXJlIOKAlCBhdCBtb2R1bGUtbG9hZCB0aW1lIGpRdWVyeSBtYXlcbiAgICAgICAgLy8gbm90IHlldCBiZSBkZWZpbmVkIChTZW50cnkgTUlLT1BCWC1NRzkgcGF0dGVybikuXG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyID0gJCgnI251bWJlcicpO1xuICAgICAgICBleHRlbnNpb24uJHNpcF9zZWNyZXQgPSAkKCcjc2lwX3NlY3JldCcpO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIgPSAkKCcjbW9iaWxlX251bWJlcicpO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9kaWFsc3RyaW5nID0gJCgnI21vYmlsZV9kaWFsc3RyaW5nJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmcgPSAkKCcjZndkX2ZvcndhcmRpbmcnKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29uYnVzeSA9ICQoJyNmd2RfZm9yd2FyZGluZ29uYnVzeScpO1xuICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSA9ICQoJyNmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbCA9ICQoJyN1c2VyX2VtYWlsJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kdXNlcl91c2VybmFtZSA9ICQoJyN1c2VyX3VzZXJuYW1lJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iaiA9ICQoJyNleHRlbnNpb25zLWZvcm0nKTtcbiAgICAgICAgZXh0ZW5zaW9uLiR0YWJNZW51SXRlbXMgPSAkKCcjZXh0ZW5zaW9ucy1tZW51IC5pdGVtJyk7XG5cbiAgICAgICAgLy8gRGVmYXVsdCB2YWx1ZXMgd2lsbCBiZSBzZXQgYWZ0ZXIgUkVTVCBBUEkgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIGVtcHR5IHZhbHVlcyBzaW5jZSBmb3JtcyBhcmUgZW1wdHkgdW50aWwgQVBJIHJlc3BvbmRzXG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPSAnJztcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSAnJztcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSAnJztcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYiBtZW51IGl0ZW1zLCBhY2NvcmRpb25zLCBhbmQgZHJvcGRvd24gbWVudXNcbiAgICAgICAgZXh0ZW5zaW9uLiR0YWJNZW51SXRlbXMudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICB9KTtcbiAgICAgICAgJCgnI2V4dGVuc2lvbnMtZm9ybSAudWkuYWNjb3JkaW9uJykuYWNjb3JkaW9uKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgZm9yIHF1ZXN0aW9uIGljb25zIGFuZCBidXR0b25zXG4gICAgICAgICQoXCJpLnF1ZXN0aW9uXCIpLnBvcHVwKCk7XG4gICAgICAgICQoJy5wb3B1cGVkJykucG9wdXAoKTtcblxuICAgICAgICAvLyBQcmV2ZW50IGJyb3dzZXIgcGFzc3dvcmQgbWFuYWdlciBmb3IgZ2VuZXJhdGVkIHBhc3N3b3Jkc1xuICAgICAgICBleHRlbnNpb24uJHNpcF9zZWNyZXQub24oJ2ZvY3VzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ2F1dG9jb21wbGV0ZScsICduZXctcGFzc3dvcmQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIGZvcm1cbiAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGhhbmRsZXIgZm9yIHVzZXJuYW1lIGNoYW5nZSB0byB1cGRhdGUgcGFnZSB0aXRsZVxuICAgICAgICBleHRlbnNpb24uJHVzZXJfdXNlcm5hbWUub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrID8gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykgOiBleHRlbnNpb24uJG51bWJlci52YWwoKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVQYWdlSGVhZGVyKCQodGhpcykudmFsKCksIGN1cnJlbnROdW1iZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBbHNvIHVwZGF0ZSBoZWFkZXIgd2hlbiBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXNcbiAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VXNlcm5hbWUgPSBleHRlbnNpb24uJHVzZXJfdXNlcm5hbWUudmFsKCk7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50TnVtYmVyID0gJCh0aGlzKS5pbnB1dG1hc2sgPyAkKHRoaXMpLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpIDogJCh0aGlzKS52YWwoKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVQYWdlSGVhZGVyKGN1cnJlbnRVc2VybmFtZSwgY3VycmVudE51bWJlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGFkdmFuY2VkIHNldHRpbmdzIHVzaW5nIHVuaWZpZWQgc3lzdGVtXG4gICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFeHRlbnNpb25Ub29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gb2xkIG5hbWUgaWYgbmV3IGNsYXNzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFwcGx5IEFDTCBwZXJtaXNzaW9ucyB0byBVSSBlbGVtZW50c1xuICAgICAgICBleHRlbnNpb24uYXBwbHlBQ0xQZXJtaXNzaW9ucygpO1xuXG4gICAgICAgIC8vIExvYWQgZXh0ZW5zaW9uIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICAgIGV4dGVuc2lvbi5sb2FkRXh0ZW5zaW9uRGF0YSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBBQ0wgcGVybWlzc2lvbnMgdG8gVUkgZWxlbWVudHNcbiAgICAgKiBTaG93cy9oaWRlcyBidXR0b25zIGFuZCBmb3JtIGVsZW1lbnRzIGJhc2VkIG9uIHVzZXIgcGVybWlzc2lvbnNcbiAgICAgKi9cbiAgICBhcHBseUFDTFBlcm1pc3Npb25zKCkge1xuICAgICAgICAvLyBDaGVjayBpZiBBQ0wgSGVscGVyIGlzIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIEFDTEhlbHBlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignQUNMSGVscGVyIGlzIG5vdCBhdmFpbGFibGUsIHNraXBwaW5nIEFDTCBjaGVja3MnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFwcGx5IHBlcm1pc3Npb25zIHVzaW5nIEFDTEhlbHBlclxuICAgICAgICBBQ0xIZWxwZXIuYXBwbHlQZXJtaXNzaW9ucyh7XG4gICAgICAgICAgICBzYXZlOiB7XG4gICAgICAgICAgICAgICAgc2hvdzogJyNzdWJtaXRidXR0b24sICNkcm9wZG93blN1Ym1pdCcsXG4gICAgICAgICAgICAgICAgZW5hYmxlOiAnI2V4dGVuc2lvbnMtZm9ybSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWxldGU6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAnLmRlbGV0ZS1idXR0b24sIC50d28tc3RlcHMtZGVsZXRlJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNoZWNrcyBmb3Igc3BlY2lmaWMgYWN0aW9uc1xuICAgICAgICBpZiAoIUFDTEhlbHBlci5jYW5TYXZlKCkpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgZm9ybSBpZiB1c2VyIGNhbm5vdCBzYXZlXG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIGlucHV0LCAjZXh0ZW5zaW9ucy1mb3JtIHNlbGVjdCwgI2V4dGVuc2lvbnMtZm9ybSB0ZXh0YXJlYScpXG4gICAgICAgICAgICAgICAgLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSlcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgcGFzc3dvcmQgd2lkZ2V0XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0LmRpc2FibGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2hvdyBpbmZvIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0IGluZm9NZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlLmV4X05vUGVybWlzc2lvblRvTW9kaWZ5IHx8ICdZb3UgZG8gbm90IGhhdmUgcGVybWlzc2lvbiB0byBtb2RpZnkgZXh0ZW5zaW9ucyc7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24oaW5mb01lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBtb2JpbGUgbnVtYmVyIGZyb20gY2xpcGJvYXJkXG4gICAgICovXG4gICAgY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgYWZ0ZXIgYSBwaG9uZSBudW1iZXIgaGFzIGJlZW4gZW50ZXJlZCBjb21wbGV0ZWx5LlxuICAgICAqIEl0IHNlcnZlcyB0byBjaGVjayBpZiB0aGVyZSBhcmUgYW55IGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIHBob25lIG51bWJlcnMuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgYWZ0ZXIgcmVtb3ZpbmcgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBDYWxsIHRoZSBgY2hlY2tBdmFpbGFiaWxpdHlgIGZ1bmN0aW9uIG9uIGBFeHRlbnNpb25zYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgaXMgYWxyZWFkeSBpbiB1c2UuXG4gICAgICAgIC8vIFBhcmFtZXRlcnM6IGRlZmF1bHQgbnVtYmVyLCBuZXcgbnVtYmVyLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKG51bWJlciksIHVzZXIgaWRcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE51bWJlciwgbmV3TnVtYmVyLCAnbnVtYmVyJywgdXNlcklkKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIG9uY2UgYW4gZW1haWwgYWRkcmVzcyBoYXMgYmVlbiBjb21wbGV0ZWx5IGVudGVyZWQuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGFmdGVyIHJlbW92aW5nIGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld0VtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGBjaGVja0F2YWlsYWJpbGl0eWAgZnVuY3Rpb24gb24gYFVzZXJzQVBJYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBlbWFpbCBpcyBhbHJlYWR5IGluIHVzZS5cbiAgICAgICAgLy8gUGFyYW1ldGVyczogZGVmYXVsdCBlbWFpbCwgbmV3IGVtYWlsLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKGVtYWlsKSwgdXNlciBpZFxuICAgICAgICBVc2Vyc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdEVtYWlsLCBuZXdFbWFpbCwnZW1haWwnLCB1c2VySWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBY3RpdmF0ZWQgd2hlbiBlbnRlcmluZyBhIG1vYmlsZSBwaG9uZSBudW1iZXIgaW4gdGhlIGVtcGxveWVlJ3MgcHJvZmlsZS5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgd2l0aG91dCBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gR2V0IHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBEeW5hbWljIGNoZWNrIHRvIHNlZSBpZiB0aGUgc2VsZWN0ZWQgbW9iaWxlIG51bWJlciBpcyBhdmFpbGFibGVcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cbiAgICAgICAgLy8gUmVmaWxsIHRoZSBtb2JpbGUgZGlhbHN0cmluZyBvbmx5IHdoZW4gaXQgd2FzIGxlZnQgYXQgaXRzIGRlZmF1bHQgKGVxdWFsIHRvIHRoZSBvbGQgbW9iaWxlIG51bWJlcilcbiAgICAgICAgLy8gb3IgZW1wdHkuIEEgdXNlci1kZWZpbmVkIGRpYWwgc3RyaW5nIG92ZXJyaWRlIG11c3Qgc3Vydml2ZSBhIG1vYmlsZSBudW1iZXIgY2hhbmdlIChpc3N1ZSAjMTA4MSkuXG4gICAgICAgIGNvbnN0IGN1cnJlbnREaWFsc3RyaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycpO1xuICAgICAgICBpZiAoY3VycmVudERpYWxzdHJpbmcgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyXG4gICAgICAgICAgICB8fCBjdXJyZW50RGlhbHN0cmluZy5sZW5ndGggPT09IDBcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2JpbGUgbnVtYmVyIGhhcyBjaGFuZ2VkXG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyB1c2VybmFtZSBmcm9tIHRoZSBmb3JtXG4gICAgICAgICAgICBjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9yd2FyZGluZyBmaWVsZHMgdGhhdCBtYXRjaCB0aGUgb2xkIG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEZ3ZE9uQnVzeSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZ3ZF9mb3J3YXJkaW5nIGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkRm9yd2FyZGluZyA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblxuICAgICAgICAgICAgICAgIC8vIFNldCByaW5nIGxlbmd0aCBpZiBlbXB0eVxuICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgICAgICAgIHx8IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKT09PVwiMFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCA0NSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5zZXRWYWx1ZSgnZndkX2ZvcndhcmRpbmcnLCBuZXdNb2JpbGVOdW1iZXIsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZndkX2ZvcndhcmRpbmdvbmJ1c3kgaWYgaXQgbWF0Y2hlcyBvbGQgbW9iaWxlIG51bWJlciAoaW5jbHVkaW5nIGVtcHR5KVxuICAgICAgICAgICAgaWYgKGN1cnJlbnRGd2RPbkJ1c3kgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5zZXRWYWx1ZSgnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLnNldFZhbHVlKCdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCBuZXdNb2JpbGVOdW1iZXIsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFNldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgYXMgdGhlIGRlZmF1bHRcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBuZXdNb2JpbGVOdW1iZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxlZCB3aGVuIHRoZSBtb2JpbGUgcGhvbmUgbnVtYmVyIGlzIGNsZWFyZWQgaW4gdGhlIGVtcGxveWVlIGNhcmQuXG4gICAgICovXG4gICAgY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIENoZWNrIGN1cnJlbnQgZm9yd2FyZGluZyB2YWx1ZXMgYmVmb3JlIGNsZWFyaW5nXG4gICAgICAgIGNvbnN0IGN1cnJlbnRGd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICBjb25zdCBjdXJyZW50RndkT25CdXN5ID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpO1xuICAgICAgICBjb25zdCBjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB0aGUgJ21vYmlsZV9kaWFsc3RyaW5nJyBhbmQgJ21vYmlsZV9udW1iZXInIGZpZWxkcyBpbiB0aGUgZm9ybVxuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgJycpO1xuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9udW1iZXInLCAnJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChjdXJyZW50RndkRm9yd2FyZGluZyA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIElmIHNvLCBjbGVhciB0aGUgJ2Z3ZF9yaW5nbGVuZ3RoJyBmaWVsZCBhbmQgY2xlYXIgZm9yd2FyZGluZyBkcm9wZG93blxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDApO1xuICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmNsZWFyKCdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIGJ1c3kgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoY3VycmVudEZ3ZE9uQnVzeSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiB1bmF2YWlsYWJsZSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBpbnB1dCBtYXNrcyBmb3IgdGhlIGV4dGVuc2lvbiBudW1iZXIgYW5kIG1vYmlsZSBudW1iZXIgZmllbGRzLlxuICAgICAqXG4gICAgICogVGhlIGV4dGVuc2lvbiBudW1iZXIgbWFzayBsZW5ndGggaXMgZHJpdmVuIGJ5IHRoZSBBUEk6IGl0IHVzZXNcbiAgICAgKiBgZXh0ZW5zaW9uLmV4dGVuc2lvbnNMZW5ndGhgIChwb3B1bGF0ZWQgZnJvbSB0aGUgc2VydmVyLCBubyBKYXZhU2NyaXB0IGRlZmF1bHQpXG4gICAgICogdG8gYnVpbGQgYSBgOXsyLE59YCBkaWdpdCBtYXNrLCBhcHBsaWVkIG9ubHkgd2hlbiBOIGlzIGJldHdlZW4gMiBhbmQgMTEuXG4gICAgICogSXRzIGBvbmNvbXBsZXRlYCBoYW5kbGVyIGlzIGRlYm91bmNlZCB3aXRoIGEgNTAwbXMgc2V0VGltZW91dCAoY2xlYXJpbmcgYW55XG4gICAgICogcGVuZGluZyB0aW1lcikgYmVmb3JlIGludm9raW5nIGBjYk9uQ29tcGxldGVOdW1iZXIoKWAuXG4gICAgICpcbiAgICAgKiBBbHNvIGNvbmZpZ3VyZXMgdGhlIG1vYmlsZSBudW1iZXIgbWFza3MgZnJvbSBgSW5wdXRNYXNrUGF0dGVybnNgLCBhIHBhc3RlXG4gICAgICogaGFuZGxlciwgYW5kIGEgYHZhbC5vdmVycmlkZWAgZXZlbnQgaGFuZGxlciB0aGF0IHRlbXBvcmFyaWx5IHJlbW92ZXMgdGhlXG4gICAgICogbWFzayBzbyBhIHZhbHVlIGNhbiBiZSBzZXQgcHJvZ3JhbW1hdGljYWxseSAodXNlZCBieSB0ZXN0cyBhbmQgYXV0b21hdGlvbikuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlucHV0TWFza3MoKXtcbiAgICAgICAgLy8gU2V0IHVwIG51bWJlciBpbnB1dCBtYXNrIHdpdGggY29ycmVjdCBsZW5ndGggZnJvbSBBUElcbiAgICAgICAgbGV0IHRpbWVvdXROdW1iZXJJZDtcblxuICAgICAgICAvLyBBbHdheXMgaW5pdGlhbGl6ZSBtYXNrIGJhc2VkIG9uIGV4dGVuc2lvbnNfbGVuZ3RoIGZyb20gQVBJXG4gICAgICAgIC8vIE5vIGRlZmF1bHRzIGluIEphdmFTY3JpcHQgLSB2YWx1ZSBtdXN0IGNvbWUgZnJvbSBBUElcbiAgICAgICAgaWYgKGV4dGVuc2lvbi5leHRlbnNpb25zTGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25zTGVuZ3RoID0gcGFyc2VJbnQoZXh0ZW5zaW9uLmV4dGVuc2lvbnNMZW5ndGgsIDEwKTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25zTGVuZ3RoID49IDIgJiYgZXh0ZW5zaW9uc0xlbmd0aCA8PSAxMSkge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgbWFzayB3aXRoIGNvcnJlY3QgbGVuZ3RoIGFuZCBvbmNvbXBsZXRlIGhhbmRsZXJcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soe1xuICAgICAgICAgICAgICAgICAgICBtYXNrOiBgOXsyLCR7ZXh0ZW5zaW9uc0xlbmd0aH19YCxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICdfJyxcbiAgICAgICAgICAgICAgICAgICAgb25jb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aW1lb3V0TnVtYmVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dE51bWJlcklkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXROdW1iZXJJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2tzIGZvciB0aGUgbW9iaWxlIG51bWJlciBpbnB1dC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGhlIG1hc2sgbGlzdCBpcyBwYXJ0aXRpb25lZCBzbyB0aGF0IG1hc2tzIFdJVEhPVVQgYSBsZWFkaW5nIFwiK1wiIChwbGFpbiBuYXRpb25hbFxuICAgICAgICAvLyBhbmQgc2hvcnQtbnVtYmVyIGZvcm1hdHMpIGFyZSBtYXRjaGVkIGJlZm9yZSB0aGUgcGVyLWNvdW50cnkgXCIrXCIgbWFza3MuIENvbWJpbmVkXG4gICAgICAgIC8vIHdpdGggdGhlIHBsYWluIDctZGlnaXQgZm9ybWF0cyBpbiBJbnB1dE1hc2tQYXR0ZXJucywgdGhpcyBsZXRzIHNob3J0IGludGVybmFsXG4gICAgICAgIC8vIG51bWJlcnMgKDUvNi83IGRpZ2l0cykga2VlcCBhIHBsYWluIGZvcm1hdCBhbmQgY29tcGxldGUvc2F2ZSBpbnN0ZWFkIG9mIGJlaW5nXG4gICAgICAgIC8vIGhpamFja2VkIGJ5IGEgY291bnRyeS1jb2RlIG1hc2sgKGUuZy4gXCIrMjExLTExLV9fXy1fX19fXCIpIHRoYXQgbmV2ZXIgY29tcGxldGVzXG4gICAgICAgIC8vIGFuZCBibG9ja3MgdGhlIHNhdmUgKGlzc3VlICMxMDgxIGZvbGxvdy11cCkuIE51bWJlcnMgbG9uZ2VyIHRoYW4gNyBkaWdpdHMsIG9yIGFueVxuICAgICAgICAvLyB2YWx1ZSBzdGFydGluZyB3aXRoIFwiK1wiLCBoYXZlIG5vIHBsYWluIG1hdGNoIGxlZnQgYW5kIGZhbGwgdGhyb3VnaCB0byB0aGUgZnVsbFxuICAgICAgICAvLyBwZXItY291bnRyeSBpbnRlcm5hdGlvbmFsIGZvcm1hdHRpbmcgYXV0b21hdGljYWxseS5cbiAgICAgICAgY29uc3Qgc29ydGVkTWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcbiAgICAgICAgY29uc3QgbW9iaWxlTWFza0xpc3QgPSBzb3J0ZWRNYXNrTGlzdFxuICAgICAgICAgICAgLmZpbHRlcihpdGVtID0+IGl0ZW0ubWFzay5jaGFyQXQoMCkgIT09ICcrJylcbiAgICAgICAgICAgIC5jb25jYXQoc29ydGVkTWFza0xpc3QuZmlsdGVyKGl0ZW0gPT4gaXRlbS5tYXNrLmNoYXJBdCgwKSA9PT0gJysnKSk7XG5cbiAgICAgICAgLy8gUmV1c2FibGUgKHJlKWluaXRpYWxpc2VyIHNvIHRoZSBkaWFsLXN0cmluZyBhdXRvLWZpbGwgYmVsb3cgY2FuIHJlLWFwcGx5IHRoZSBtYXNrXG4gICAgICAgIC8vIHRvIGEgZnJlc2hseSBpbmplY3RlZCByYXcgdmFsdWUgd2l0aG91dCBpdCBiZWluZyB0cnVuY2F0ZWQgYnkgdGhlIHByZXZpb3VzIG1hc2suXG4gICAgICAgIGV4dGVuc2lvbi5pbml0TW9iaWxlTWFzayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2tzKHtcbiAgICAgICAgICAgICAgICBpbnB1dG1hc2s6IHtcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICcjJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcjogJ1swLTldJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uY2xlYXJlZDogZXh0ZW5zaW9uLmNiT25DbGVhcmVkTW9iaWxlTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgICAgIGxpc3Q6IG1vYmlsZU1hc2tMaXN0LFxuICAgICAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBleHRlbnNpb24uaW5pdE1vYmlsZU1hc2soKTtcblxuICAgICAgICAvLyBBZGQgaGFuZGxlciBmb3IgcHJvZ3JhbW1hdGljIHZhbHVlIGNoYW5nZXMgKGZvciB0ZXN0cyBhbmQgYXV0b21hdGlvbilcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxWYWwgPSAkLmZuLnZhbDtcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLm9mZigndmFsLm92ZXJyaWRlJykub24oJ3ZhbC5vdmVycmlkZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgICAgICAgLy8gSWYgc2V0dGluZyBhIHZhbHVlIHByb2dyYW1tYXRpY2FsbHlcbiAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDAgJiYgdHlwZW9mIGFyZ3NbMF0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBhcmdzWzBdO1xuXG4gICAgICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgcmVtb3ZlIG1hc2tcbiAgICAgICAgICAgICAgICBpZiAoJHRoaXMuZGF0YSgnaW5wdXRtYXNrJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRoaXMuaW5wdXRtYXNrKCdyZW1vdmUnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIHZhbHVlXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxWYWwuYXBwbHkodGhpcywgYXJncyk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZWFwcGx5IG1hc2sgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkdGhpcy50cmlnZ2VyKCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTsgLy8gUHJldmVudCBkZWZhdWx0IHBhc3RlIGJlaGF2aW9yXG5cbiAgICAgICAgICAgIC8vIEdldCBwYXN0ZWQgZGF0YSBmcm9tIGNsaXBib2FyZFxuICAgICAgICAgICAgbGV0IHBhc3RlZERhdGEgPSAnJztcblxuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCBkYXRhIGZyb20gY2xpcGJvYXJkIGV2ZW50XG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50ICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlLmNsaXBib2FyZERhdGEgJiYgZS5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBEaXJlY3QgY2xpcGJvYXJkRGF0YSBhY2Nlc3NcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LmNsaXBib2FyZERhdGEgJiYgd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIEZvciBJRVxuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHdlIGNvdWxkbid0IGdldCBjbGlwYm9hcmQgZGF0YSwgZG9uJ3QgcHJvY2Vzc1xuICAgICAgICAgICAgaWYgKCFwYXN0ZWREYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQcm9jZXNzIHRoZSBwYXN0ZWQgZGF0YVxuICAgICAgICAgICAgbGV0IHByb2Nlc3NlZERhdGE7XG4gICAgICAgICAgICBpZiAocGFzdGVkRGF0YS5jaGFyQXQoMCkgPT09ICcrJykge1xuICAgICAgICAgICAgICAgIC8vIEtlZXAgJysnIGFuZCByZW1vdmUgb3RoZXIgbm9uLWRpZ2l0IGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICBwcm9jZXNzZWREYXRhID0gJysnICsgcGFzdGVkRGF0YS5zbGljZSgxKS5yZXBsYWNlKC9cXEQvZywgJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYWxsIG5vbi1kaWdpdCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgcHJvY2Vzc2VkRGF0YSA9IHBhc3RlZERhdGEucmVwbGFjZSgvXFxEL2csICcnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSW5zZXJ0IGNsZWFuZWQgZGF0YSBpbnRvIHRoZSBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgY29uc3QgaW5wdXQgPSB0aGlzO1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBpbnB1dC5zZWxlY3Rpb25TdGFydCB8fCAwO1xuICAgICAgICAgICAgY29uc3QgZW5kID0gaW5wdXQuc2VsZWN0aW9uRW5kIHx8IDA7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkKGlucHV0KS52YWwoKSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gY3VycmVudFZhbHVlLnN1YnN0cmluZygwLCBzdGFydCkgKyBwcm9jZXNzZWREYXRhICsgY3VycmVudFZhbHVlLnN1YnN0cmluZyhlbmQpO1xuXG4gICAgICAgICAgICAvLyBUZW1wb3JhcmlseSByZW1vdmUgbWFzaywgc2V0IHZhbHVlLCB0aGVuIHJlYXBwbHlcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soXCJyZW1vdmVcIik7XG4gICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIudmFsKG5ld1ZhbHVlKTtcblxuICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIHRoZSB2YWx1ZSBpcyBzZXQgYmVmb3JlIHJlYXBwbHlpbmcgbWFza1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBpbnB1dCBldmVudCB0byByZWFwcGx5IHRoZSBtYXNrXG4gICAgICAgICAgICAgICAgJChpbnB1dCkudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrIGZvciB0aGUgZW1haWwgaW5wdXRcbiAgICAgICAgbGV0IHRpbWVvdXRFbWFpbElkO1xuICAgICAgICBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygnZW1haWwnLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiAoKT0+e1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBwcmV2aW91cyB0aW1lciwgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKHRpbWVvdXRFbWFpbElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0RW1haWxJZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICAgICAgICB0aW1lb3V0RW1haWxJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwoKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwub24oJ3Bhc3RlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9BdHRhY2ggYSBmb2N1c291dCBldmVudCBsaXN0ZW5lciB0byB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuZm9jdXNvdXQoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxldCBwaG9uZSA9ICQoZS50YXJnZXQpLnZhbCgpLnJlcGxhY2UoL1teMC05XS9nLCBcIlwiKTtcbiAgICAgICAgICAgIGlmIChwaG9uZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAkKGUudGFyZ2V0KS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBXaGVuIHRoZSBkaWFsIHN0cmluZyBvdmVycmlkZSBpcyBmaWxsZWQgd2hpbGUgdGhlIG1vYmlsZSBudW1iZXIgaXMgc3RpbGwgZW1wdHksXG4gICAgICAgIC8vIGNvcHkgaXQgaW50byB0aGUgKGVtcHR5KSBtb2JpbGUgbnVtYmVyIGFuZCBsZXQgdGhlIG1hc2sgZW5nYWdlLiBXaXRob3V0IGEgbW9iaWxlXG4gICAgICAgIC8vIG51bWJlciB0aGUgYmFja2VuZCBkcm9wcyB0aGUgd2hvbGUgRXh0ZXJuYWxQaG9uZXMgcm93IG9uIHNhdmUsIHNpbGVudGx5IGNsZWFyaW5nXG4gICAgICAgIC8vIHRoZSBkaWFsIHN0cmluZyB0aGUgdXNlciBqdXN0IHR5cGVkIChpc3N1ZSAjMTA4MSBmb2xsb3ctdXApLlxuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9kaWFsc3RyaW5nLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zdCBkaWFsc3RyaW5nID0gKHRoaXMudmFsdWUgfHwgJycpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRNb2JpbGUgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuZGF0YSgnaW5wdXRtYXNrJylcbiAgICAgICAgICAgICAgICA/IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKVxuICAgICAgICAgICAgICAgIDogKGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci52YWwoKSB8fCAnJyk7XG4gICAgICAgICAgICAvLyBPbmx5IGF1dG8tZmlsbCBmcm9tIGEgcGxhaW4gcGhvbmUtbnVtYmVyIGRpYWwgc3RyaW5nIChvcHRpb25hbCBsZWFkaW5nIFwiK1wiKS5cbiAgICAgICAgICAgIC8vIEEgbm9uLW51bWVyaWMgZGlhbCBzdHJpbmcgKGUuZy4gXCJTSVAvdHJ1bmsvMTIzXCIpIHdvdWxkIGJlIG1hbmdsZWQgYnkgdGhlXG4gICAgICAgICAgICAvLyBkaWdpdC1vbmx5IG1hc2ssIHNvIGl0IGlzIGxlZnQgdW50b3VjaGVkLlxuICAgICAgICAgICAgaWYgKC9eXFwrP1xcZCskLy50ZXN0KGRpYWxzdHJpbmcpICYmIGN1cnJlbnRNb2JpbGUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBjdXJyZW50IG1hc2ssIGluamVjdCB0aGUgcmF3IHZhbHVlIChzbyBpdCBpcyBub3QgdHJ1bmNhdGVkIGJ5IGFcbiAgICAgICAgICAgICAgICAvLyBzaG9ydGVyIGFjdGl2ZSBtYXNrKSwgdGhlbiByZS1pbml0aWFsaXNlIHNvIHRoZSByaWdodCBtYXNrIGlzIGNob3NlbiBhbmRcbiAgICAgICAgICAgICAgICAvLyBmb3JtYXR0aW5nIGFwcGxpZWQuICdjaGFuZ2UnIGtlZXBzIGRlcGVuZGVudCBoYW5kbGVycyAoYXZhaWxhYmlsaXR5KSBpbiBzeW5jLlxuICAgICAgICAgICAgICAgIC8vIE5PVEU6IGlucHV0bWFza3MoJ3JlbW92ZScpIG51bGxzIHRoZSBgLmlucHV0bWFza3NgIG1ldGhvZCBvbiB0aGUgalF1ZXJ5XG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IGl0IGlzIGNhbGxlZCBvbiwgc28gY2FsbCBpdCBvbiBhIHRocm93YXdheSB3cmFwcGVyLCBub3QgdGhlIGNhY2hlZCBvbmUuXG4gICAgICAgICAgICAgICAgJCgnI21vYmlsZV9udW1iZXInKS5pbnB1dG1hc2tzKCdyZW1vdmUnKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIudmFsKGRpYWxzdHJpbmcpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0TW9iaWxlTWFzaygpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIG5ldyBTSVAgcGFzc3dvcmQuXG4gICAgICogVXNlcyB0aGUgUGFzc3dvcmRXaWRnZXQgYnV0dG9uIGxpa2UgaW4gQU1JIG1hbmFnZXIuXG4gICAgICovXG4gICAgZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcbiAgICAgICAgLy8gVHJpZ2dlciBwYXNzd29yZCBnZW5lcmF0aW9uIHRocm91Z2ggdGhlIHdpZGdldCBidXR0b24gKGxpa2UgaW4gQU1JKVxuICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBleHRlbnNpb24uJHNpcF9zZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJGdlbmVyYXRlQnRuLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEubW9iaWxlX251bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZW1vdmUgZm9ybSBjb250cm9sIGZpZWxkcyB0aGF0IHNob3VsZG4ndCBiZSBzZW50IHRvIHNlcnZlclxuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEuZGlycnR5O1xuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEuc3VibWl0TW9kZTtcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLnVzZXJfaWQ7IC8vIFJlbW92ZSB1c2VyX2lkIGZpZWxkIHRvIHByZXZlbnQgdmFsaWRhdGlvbiBpc3N1ZXNcblxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgKGNoZWNrIGlmIHdlIGhhdmUgYSByZWFsIElEKVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBjdXJyZW50IGV4dGVuc2lvbiBudW1iZXIgYXMgdGhlIGRlZmF1bHQgbnVtYmVyIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEubnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSByZXNwb25zZS5kYXRhLm51bWJlcjtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHBob25lIHJlcHJlc2VudGF0aW9uIHdpdGggdGhlIG5ldyBkZWZhdWx0IG51bWJlclxuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZSBhbmQgcmVzcG9uc2UucmVsb2FkIGZyb20gc2VydmVyXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzIGZvciBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qcyBmb3IgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGV4dGVuc2lvbi4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZXh0ZW5zaW9uLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBFbXBsb3llZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyBjaGVja2JveCB2YWx1ZXMgYXJlIHNlbnQgYXMgdHJ1ZS9mYWxzZSBpbnN0ZWFkIG9mIFwib25cIi91bmRlZmluZWRcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFY1LjAgQXJjaGl0ZWN0dXJlOiBMb2FkIGV4dGVuc2lvbiBkYXRhIHZpYSBSRVNUIEFQSSAoc2ltaWxhciB0byBJVlIgbWVudSBwYXR0ZXJuKVxuICAgICAqL1xuICAgIGxvYWRFeHRlbnNpb25EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGV4dGVuc2lvbi5nZXRSZWNvcmRJZCgpO1xuXG4gICAgICAgIC8vIFVzZSAnbmV3JyBhcyBJRCBmb3IgbmV3IHJlY29yZHMgdG8gZ2V0IGRlZmF1bHQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGNvbnN0IGFwaUlkID0gcmVjb3JkSWQgPT09ICcnID8gJ25ldycgOiByZWNvcmRJZDtcblxuICAgICAgICAvLyBIaWRlIG1vbml0b3JpbmcgZWxlbWVudHMgZm9yIG5ldyBlbXBsb3llZXNcbiAgICAgICAgaWYgKGFwaUlkID09PSAnbmV3Jykge1xuICAgICAgICAgICAgJCgnI3N0YXR1cycpLmhpZGUoKTsgLy8gSGlkZSBzdGF0dXMgbGFiZWxcbiAgICAgICAgICAgICQoJ2FbZGF0YS10YWI9XCJzdGF0dXNcIl0nKS5oaWRlKCk7IC8vIEhpZGUgbW9uaXRvcmluZyB0YWJcbiAgICAgICAgfVxuXG4gICAgICAgIEVtcGxveWVlc0FQSS5nZXRSZWNvcmQoYXBpSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBpZiB3ZSBkb24ndCBoYXZlIGFuIElEIChmb2xsb3dpbmcgQ2FsbFF1ZXVlcyBwYXR0ZXJuKVxuICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBleHRlbnNpb24ucG9wdWxhdGVGb3JtV2l0aERhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgZGVmYXVsdCB2YWx1ZXMgYWZ0ZXIgZGF0YSBsb2FkXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSByZXNwb25zZS5kYXRhLm51bWJlciB8fCAnJztcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gcmVzcG9uc2UuZGF0YS51c2VyX2VtYWlsIHx8ICcnO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gcmVzcG9uc2UuZGF0YS5tb2JpbGVfbnVtYmVyIHx8ICcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIHN0aWxsIGluaXRpYWxpemUgYXZhdGFyIGV2ZW4gaWYgQVBJIGZhaWxzXG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBleHRlbnNpb24gZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkwgKGxpa2UgSVZSIG1lbnUpXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBSRVNUIEFQSSAoVjUuMCBjbGVhbiBkYXRhIGFyY2hpdGVjdHVyZSlcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1XaXRoRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIFN0b3JlIGV4dGVuc2lvbnNfbGVuZ3RoIGZyb20gQVBJIGZvciB1c2UgaW4gaW5pdGlhbGl6ZUlucHV0TWFza3NcbiAgICAgICAgLy8gVGhpcyB2YWx1ZSBNVVNUIGNvbWUgZnJvbSBBUEkgLSBubyBkZWZhdWx0cyBpbiBKU1xuICAgICAgICBleHRlbnNpb24uZXh0ZW5zaW9uc0xlbmd0aCA9IGRhdGEuZXh0ZW5zaW9uc19sZW5ndGg7XG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggKHNhbWUgYXMgSVZSIG1lbnUpXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBWNS4wIHNwZWNpYWxpemVkIGNsYXNzZXMgLSBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIGFueSBVSSBlbGVtZW50cyBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBpZiAoZm9ybURhdGEubnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb24tbnVtYmVyLWRpc3BsYXknKS50ZXh0KGZvcm1EYXRhLm51bWJlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgYXZhdGFyIGNvbXBvbmVudCBhZnRlciBmb3JtIHBvcHVsYXRpb25cbiAgICAgICAgICAgICAgICBhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBhdmF0YXIgVVJMIGR5bmFtaWNhbGx5IGZyb20gQVBJIGRhdGFcbiAgICAgICAgICAgICAgICBhdmF0YXIuc2V0QXZhdGFyVXJsKGZvcm1EYXRhLnVzZXJfYXZhdGFyKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIG1vZGlmeSBzdGF0dXMgbW9uaXRvciBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggZW1wbG95ZWUgbmFtZSBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVQYWdlSGVhZGVyKGZvcm1EYXRhLnVzZXJfdXNlcm5hbWUsIGZvcm1EYXRhLm51bWJlcik7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dCBtYXNrcyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplSW5wdXRNYXNrcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5PVEU6IEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKSB3aWxsIGJlIGNhbGxlZCBhdXRvbWF0aWNhbGx5IGJ5IEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjbGVhbiBkYXRhIC0gVjUuMCBBcmNoaXRlY3R1cmVcbiAgICAgKiBVc2VzIHNwZWNpYWxpemVkIGNsYXNzZXMgd2l0aCBjb21wbGV0ZSBhdXRvbWF0aW9uIChubyBvbkNoYW5nZSBjYWxsYmFja3MgbmVlZGVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBmb3J3YXJkaW5nIGRyb3Bkb3duIGluc3RhbmNlcyBiZWZvcmUgcmUtaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHByb3BlciByZS1jcmVhdGlvbiB3aGVuIGZvcm0gZGF0YSBpcyByZWxvYWRlZCAoZS5nLiwgYWZ0ZXIgc2F2ZSlcbiAgICAgICAgY29uc3QgZm9yd2FyZGluZ0ZpZWxkcyA9IFsnZndkX2ZvcndhcmRpbmcnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJ107XG4gICAgICAgIGZvcndhcmRpbmdGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgaWYgKEV4dGVuc2lvblNlbGVjdG9yLmluc3RhbmNlcy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmRlc3Ryb3koZmllbGROYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gZHJvcGRvd25zIHdpdGggY3VycmVudCBleHRlbnNpb24gZXhjbHVzaW9uIC0gVjUuMCBzcGVjaWFsaXplZCBjbGFzc1xuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZycsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbZGF0YS5udW1iZXJdLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jywge1xuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLCBcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbZGF0YS5udW1iZXJdLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbZGF0YS5udW1iZXJdLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHdpdGggQVBJIGRhdGEgLSBWNS4wIGJhc2UgY2xhc3NcbiAgICAgICAgXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignc2lwX25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgIGFwaVVybDogYC9wYnhjb3JlL2FwaS92My9uZXR3b3JrLWZpbHRlcnM6Z2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT1TSVBgLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWxlY3ROZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVjUuMCBhcmNoaXRlY3R1cmUgd2l0aCBlbXB0eSBmb3JtIHNob3VsZCBub3QgaGF2ZSBIVE1MIGVudGl0aWVzIGlzc3Vlc1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlcyAtIHJlYnVpbGQgZHJvcGRvd25zIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vZmYoJ2NoYW5nZS5kcm9wZG93bicpLm9uKCdjaGFuZ2UuZHJvcGRvd24nLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdFeHRlbnNpb24gPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ251bWJlcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobmV3RXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4Y2x1c2lvbnMgZm9yIGZvcndhcmRpbmcgZHJvcGRvd25zXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLnVwZGF0ZUZvcndhcmRpbmdEcm9wZG93bnNFeGNsdXNpb24obmV3RXh0ZW5zaW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCk7XG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oZGF0YSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZm9yd2FyZGluZyBkcm9wZG93bnMgd2hlbiBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXNcbiAgICAgKi9cbiAgICB1cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uKG5ld0V4dGVuc2lvbikge1xuICAgICAgICBjb25zdCBmb3J3YXJkaW5nRmllbGRzID0gWydmd2RfZm9yd2FyZGluZycsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnXTtcbiAgICAgICAgXG4gICAgICAgIGZvcndhcmRpbmdGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJChgIyR7ZmllbGROYW1lfWApLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFRleHQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKS5ub3QoJy5kZWZhdWx0JykuaHRtbCgpIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIGluc3RhbmNlIGZpcnN0XG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5kZXN0cm95KGZpZWxkTmFtZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBvbGQgZHJvcGRvd24gRE9NIGVsZW1lbnRcbiAgICAgICAgICAgICRkcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBkYXRhIG9iamVjdCB3aXRoIGN1cnJlbnQgdmFsdWUgZm9yIHJlaW5pdGlhbGl6aW5nXG4gICAgICAgICAgICBjb25zdCByZWZyZXNoRGF0YSA9IHt9O1xuICAgICAgICAgICAgcmVmcmVzaERhdGFbZmllbGROYW1lXSA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgIHJlZnJlc2hEYXRhW2Ake2ZpZWxkTmFtZX1fcmVwcmVzZW50YF0gPSBjdXJyZW50VGV4dDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVpbml0aWFsaXplIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdChmaWVsZE5hbWUsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtuZXdFeHRlbnNpb25dLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiByZWZyZXNoRGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgYWZ0ZXIgZm9ybSBkYXRhIGlzIGxvYWRlZFxuICAgICAqIFRoaXMgZW5zdXJlcyB2YWxpZGF0aW9uIG9ubHkgaGFwcGVucyBhZnRlciBwYXNzd29yZCBpcyBwb3B1bGF0ZWQgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmb3JtRGF0YSAtIFRoZSBmb3JtIGRhdGEgbG9hZGVkIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoZm9ybURhdGEpIHtcbiAgICAgICAgaWYgKCFleHRlbnNpb24uJHNpcF9zZWNyZXQubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIaWRlIGFueSBsZWdhY3kgYnV0dG9ucyBpZiB0aGV5IGV4aXN0XG4gICAgICAgICQoJy5jbGlwYm9hcmQnKS5oaWRlKCk7XG4gICAgICAgICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKS5oaWRlKCk7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgZXh0ZW5zaW9uIChubyBJRCkgb3IgZXhpc3Rpbmcgb25lXG4gICAgICAgIGNvbnN0IGlzTmV3RXh0ZW5zaW9uID0gIWZvcm1EYXRhLmlkIHx8IGZvcm1EYXRhLmlkID09PSAnJztcblxuICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KGV4dGVuc2lvbi4kc2lwX3NlY3JldCwge1xuICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULCAgLy8gU29mdCB2YWxpZGF0aW9uIC0gc2hvdyB3YXJuaW5ncyBidXQgYWxsb3cgc3VibWlzc2lvblxuICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsICAgICAgICAgLy8gU2hvdyBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSwgICAgIC8vIFNob3cgc2hvdy9oaWRlIHBhc3N3b3JkIHRvZ2dsZVxuICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLCAgICAgICAgLy8gU2hvdyBjb3B5IHRvIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSwgICAgICAgIC8vIFNob3cgcGFzc3dvcmQgc3RyZW5ndGggYmFyXG4gICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsICAgICAgICAgICAvLyBTaG93IHZhbGlkYXRpb24gd2FybmluZ3NcbiAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSwgICAgICAgIC8vIFZhbGlkYXRlIGFzIHVzZXIgdHlwZXNcbiAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlLCAvLyBBbHdheXMgdmFsaWRhdGUgaWYgcGFzc3dvcmQgZmllbGQgaGFzIHZhbHVlXG4gICAgICAgICAgICBtaW5TY29yZTogNjAsICAgICAgICAgICAgICAgICAvLyBNYXRjaCB0aGUgYXV0aG9yaXRhdGl2ZSBTSVAgdGhyZXNob2xkIG9uIHRoZSBzZXJ2ZXJcbiAgICAgICAgICAgIGdlbmVyYXRlTGVuZ3RoOiAyMCwgICAgICAgICAgIC8vIDIwIGNoYXJzIG1heCBmb3IgR3JhbmRzdHJlYW0gR0RNUyBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICBpbmNsdWRlU3BlY2lhbDogZmFsc2UsICAgICAgICAvLyBFeGNsdWRlIHNwZWNpYWwgY2hhcmFjdGVycyBmb3IgU0lQIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgIG9uR2VuZXJhdGU6IChwYXNzd29yZCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVmFsaWRhdGU6IChpc1ZhbGlkLCBzY29yZSwgbWVzc2FnZXMpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBPcHRpb25hbDogSGFuZGxlIHZhbGlkYXRpb24gcmVzdWx0cyBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICAvLyBUaGUgd2lkZ2V0IHdpbGwgaGFuZGxlIHZpc3VhbCBmZWVkYmFjayBhdXRvbWF0aWNhbGx5XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgd2lkZ2V0IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0ID0gd2lkZ2V0O1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIG5ldyBleHRlbnNpb25zIG9ubHk6IGF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgaWYgZmllbGQgaXMgZW1wdHlcbiAgICAgICAgaWYgKGlzTmV3RXh0ZW5zaW9uICYmIGV4dGVuc2lvbi4kc2lwX3NlY3JldC52YWwoKSA9PT0gJycpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRnZW5lcmF0ZUJ0biA9IGV4dGVuc2lvbi4kc2lwX3NlY3JldC5jbG9zZXN0KCcudWkuaW5wdXQnKS5maW5kKCdidXR0b24uZ2VuZXJhdGUtcGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJGdlbmVyYXRlQnRuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJGdlbmVyYXRlQnRuLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEVE1GIG1vZGUgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCkge1xuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3NpcF9kdG1mbW9kZS1kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9KTtcbiAgICAgfSxcbiAgICAgICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0cmFuc3BvcnQgcHJvdG9jb2wgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqXG4gICAgICogVGhlIGRlcHJlY2F0ZWQgXCJ0bHNcIiBvcHRpb24gc3RheXMgb25seSBmb3IgZW1wbG95ZWVzIHRoYXQgYWxyZWFkeSBoYXZlIGl0IHNhdmVkLFxuICAgICAqIGFjY29tcGFuaWVkIGJ5IGEgd2FybmluZyBzdWdnZXN0aW5nIHRoZSBcIjxudW1iZXI+LVRMU1wiIHVzZXJuYW1lIGluc3RlYWQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBFbXBsb3llZSBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oZGF0YSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjc2lwX3RyYW5zcG9ydC1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gICAgICAgICQoJyNzaXAtdHJhbnNwb3J0LXRscy13YXJuaW5nJykucmVtb3ZlKCk7XG4gICAgICAgIGlmIChkYXRhLnNpcF90cmFuc3BvcnQgPT09ICd0bHMnKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRsc0RlcHJlY2F0ZWRcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvJW51bWJlciUvZywgJCgnPGRpdj4nKS50ZXh0KGRhdGEubnVtYmVyIHx8ICcnKS5odG1sKCkpO1xuICAgICAgICAgICAgJGRyb3Bkb3duLmNsb3Nlc3QoJy5maWVsZCcpLmFmdGVyKFxuICAgICAgICAgICAgICAgIGA8ZGl2IGlkPVwic2lwLXRyYW5zcG9ydC10bHMtd2FybmluZ1wiIGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlIHZpc2libGVcIj4ke21lc3NhZ2V9PC9kaXY+YFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5maW5kKCcubWVudSAuaXRlbVtkYXRhLXZhbHVlPVwidGxzXCJdJykucmVtb3ZlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCBlbXBsb3llZSBuYW1lIGFuZCBleHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGVtcGxveWVlTmFtZSAtIE5hbWUgb2YgdGhlIGVtcGxveWVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbk51bWJlciAtIEV4dGVuc2lvbiBudW1iZXIgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIHVwZGF0ZVBhZ2VIZWFkZXIoZW1wbG95ZWVOYW1lLCBleHRlbnNpb25OdW1iZXIpIHtcbiAgICAgICAgY29uc3QgJGhlYWRlciA9ICQoJ2gxIC5jb250ZW50Jyk7XG5cbiAgICAgICAgaWYgKGVtcGxveWVlTmFtZSAmJiBlbXBsb3llZU5hbWUudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgLy8gRXhpc3RpbmcgZW1wbG95ZWUgd2l0aCBuYW1lOiB1c2VyLWNvbnRyb2xsZWQgdmFsdWVzIGdvIGluIGFzIHRleHQgKEdIU0EtcWhoNS00cDNoLTZqd3gpXG4gICAgICAgICAgICBsZXQgaGVhZGVyVGV4dCA9IGVtcGxveWVlTmFtZTtcblxuICAgICAgICAgICAgLy8gQWRkIGV4dGVuc2lvbiBudW1iZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTnVtYmVyICYmIGV4dGVuc2lvbk51bWJlci50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVyVGV4dCArPSBgIDwke2V4dGVuc2lvbk51bWJlcn0+YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJGhlYWRlci5lbXB0eSgpLmFwcGVuZCgkKCc8aT4nKS5hZGRDbGFzcygndXNlciBvdXRsaW5lIGljb24nKSwgJyAnLCBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShoZWFkZXJUZXh0KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOZXcgZW1wbG95ZWUgb3Igbm8gbmFtZSB5ZXRcbiAgICAgICAgICAgICRoZWFkZXIuaHRtbChnbG9iYWxUcmFuc2xhdGUuZXhfQ3JlYXRlTmV3RXh0ZW5zaW9uKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuLyoqXG4gKiBEZWZpbmUgYSBjdXN0b20gcnVsZSBmb3IgalF1ZXJ5IGZvcm0gdmFsaWRhdGlvbiBuYW1lZCAnZXh0ZW5zaW9uUnVsZScuXG4gKiBUaGUgcnVsZSBjaGVja3MgaWYgYSBmb3J3YXJkaW5nIG51bWJlciBpcyBzZWxlY3RlZCBidXQgdGhlIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRoZSB2YWxpZGF0aW9uIHJlc3VsdC4gSWYgZm9yd2FyZGluZyBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgaXQgcmV0dXJucyBmYWxzZSAoaW52YWxpZCkuIE90aGVyd2lzZSwgaXQgcmV0dXJucyB0cnVlICh2YWxpZCkuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbnNpb25SdWxlID0gKCkgPT4ge1xuICAgIC8vIEdldCByaW5nIGxlbmd0aCBhbmQgZm9yd2FyZGluZyBudW1iZXIgZnJvbSB0aGUgZm9ybVxuICAgIGNvbnN0IGZ3ZFJpbmdMZW5ndGggPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk7XG4gICAgY29uc3QgZndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcblxuICAgIC8vIElmIGZvcndhcmRpbmcgbnVtYmVyIGlzIHNldCBhbmQgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LCByZXR1cm4gZmFsc2UgKGludmFsaWQpXG4gICAgaWYgKGZ3ZEZvcndhcmRpbmcubGVuZ3RoID4gMFxuICAgICAgICAmJiAoXG4gICAgICAgICAgICBmd2RSaW5nTGVuZ3RoID09PSAwXG4gICAgICAgICAgICB8fFxuICAgICAgICAgICAgZndkUmluZ0xlbmd0aCA9PT0gJydcbiAgICAgICAgKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCByZXR1cm4gdHJ1ZSAodmFsaWQpXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgbnVtYmVyIGlzIHRha2VuIGJ5IGFub3RoZXIgYWNjb3VudFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHBhcmFtZXRlciBoYXMgdGhlICdoaWRkZW4nIGNsYXNzLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG5cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5wYXNzd29yZFN0cmVuZ3RoID0gKCkgPT4ge1xuICAgIGlmICghZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBQYXNzIHZhbGlkYXRpb24gaWYgd2lkZ2V0IG5vdCBpbml0aWFsaXplZFxuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlID0gZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbCgpO1xuXG4gICAgLy8gQW4gZW1wdHkgb3IgbWFza2VkICh1bmNoYW5nZWQpIGV4aXN0aW5nIHBhc3N3b3JkIGlzIG5vdCByZS1nYXRlZC5cbiAgICBpZiAoIXZhbHVlIHx8IFBhc3N3b3JkV2lkZ2V0LmlzTWFza2VkUGFzc3dvcmQodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIEdhdGUgb24gYSBzeW5jaHJvbm91cyBsb2NhbCBzY29yZSBvZiB0aGUgQ1VSUkVOVCBmaWVsZCB2YWx1ZSByYXRoZXIgdGhhbiB0aGVcbiAgICAvLyBhc3luYyBzdGF0ZS5zY29yZS4gc3RhdGUuc2NvcmUgaXMgb25seSB3cml0dGVuIHdoZW4gdGhlIGRlYm91bmNlZC9pbi1mbGlnaHRcbiAgICAvLyB2YWxpZGF0aW9uIGNhbGxiYWNrIGNvbXBsZXRlcywgc28gcmVhZGluZyBpdCBhdCBzdWJtaXQgdGltZSBjYW4gc2VlIGVpdGhlciBhXG4gICAgLy8gbm90LXlldC1jb21wdXRlZCAwIChmYWxzZSByZWplY3QpIG9yIGEgc3RhbGUgaGlnaCBzY29yZSBmcm9tIGEgcHJldmlvdXNseVxuICAgIC8vIHZhbGlkYXRlZCBzdHJvbmdlciB2YWx1ZSAoZmFsc2UgYWNjZXB0KS4gU2NvcmluZyB0aGUgY3VycmVudCB2YWx1ZSBoZXJlIGlzXG4gICAgLy8gcmFjZS1mcmVlOyB0aGUgc2VydmVyIHJlc3VsdCBzdGlsbCBkcml2ZXMgdGhlIGxpdmUgcHJvZ3Jlc3MgYmFyIGFuZCB3YXJuaW5ncy5cbiAgICByZXR1cm4gUGFzc3dvcmRXaWRnZXQuc2NvcmVQYXNzd29yZExvY2FsKHZhbHVlKSA+PSA2MDsgLy8gTWF0Y2ggdGhlIHNlcnZlcidzIFNJUCB0aHJlc2hvbGRcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgRW1wbG95ZWUgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uLmluaXRpYWxpemUoKTtcbn0pO1xuIl19