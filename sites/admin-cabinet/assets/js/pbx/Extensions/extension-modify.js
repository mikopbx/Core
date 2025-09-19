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

/* global globalRootUrl, globalTranslate, Extensions, EmployeesAPI, Form,
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
        prompt: globalTranslate.ex_ValidatePasswordTooWeak || 'Password is too weak for security requirements'
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

    Extensions.checkAvailability(extension.defaultNumber, newNumber, 'number', userId);
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

    Extensions.checkAvailability(extension.defaultMobileNumber, newMobileNumber, 'mobile-number', userId); // Refill the mobile dialstring if the new mobile number is different than the default or if the mobile dialstring is empty

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
        } // Use Semantic UI API directly on dropdown element


        var $fwdDropdown = $("#fwd_forwarding-dropdown");
        $fwdDropdown.dropdown('set text', "".concat(userName, " <").concat(newMobileNumber, ">"));
        $fwdDropdown.dropdown('set value', newMobileNumber);
        extension.$formObj.form('set value', 'fwd_forwarding', newMobileNumber);
      } // Update fwd_forwardingonbusy if it matches old mobile number (including empty)


      if (currentFwdOnBusy === extension.defaultMobileNumber) {
        // Use Semantic UI API directly on dropdown element
        var $fwdOnBusyDropdown = $("#fwd_forwardingonbusy-dropdown");
        $fwdOnBusyDropdown.dropdown('set text', "".concat(userName, " <").concat(newMobileNumber, ">"));
        $fwdOnBusyDropdown.dropdown('set value', newMobileNumber);
        extension.$formObj.form('set value', 'fwd_forwardingonbusy', newMobileNumber);
      } // Update fwd_forwardingonunavailable if it matches old mobile number (including empty)


      if (currentFwdOnUnavailable === extension.defaultMobileNumber) {
        // Use Semantic UI API directly on dropdown element
        var $fwdOnUnavailableDropdown = $("#fwd_forwardingonunavailable-dropdown");
        $fwdOnUnavailableDropdown.dropdown('set text', "".concat(userName, " <").concat(newMobileNumber, ">"));
        $fwdOnUnavailableDropdown.dropdown('set value', newMobileNumber);
        extension.$formObj.form('set value', 'fwd_forwardingonunavailable', newMobileNumber);
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
      // If so, clear the 'fwd_ringlength' field and set 'fwd_forwarding' to -1
      extension.$formObj.form('set value', 'fwd_ringlength', 0); // Use Semantic UI API directly on dropdown element with proper clearing

      var $fwdDropdown = $('#fwd_forwarding-dropdown');
      $fwdDropdown.dropdown('clear');
      $fwdDropdown.dropdown('set text', '-');
      extension.$formObj.form('set value', 'fwd_forwarding', '');
    } // Check if forwarding when busy was set to the mobile number


    if (currentFwdOnBusy === extension.defaultMobileNumber) {
      // Use Semantic UI API directly on dropdown element with proper clearing
      var $fwdOnBusyDropdown = $('#fwd_forwardingonbusy-dropdown');
      $fwdOnBusyDropdown.dropdown('clear');
      $fwdOnBusyDropdown.dropdown('set text', '-');
      extension.$formObj.form('set value', 'fwd_forwardingonbusy', '');
    } // Check if forwarding when unavailable was set to the mobile number


    if (currentFwdOnUnavailable === extension.defaultMobileNumber) {
      // Use Semantic UI API directly on dropdown element with proper clearing
      var $fwdOnUnavailableDropdown = $('#fwd_forwardingonunavailable-dropdown');
      $fwdOnUnavailableDropdown.dropdown('clear');
      $fwdOnUnavailableDropdown.dropdown('set text', '-');
      extension.$formObj.form('set value', 'fwd_forwardingonunavailable', '');
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
        onBeforePaste: extension.cbOnMobileNumberBeforePaste,
        showMaskOnHover: false
      },
      match: /[0-9]/,
      replace: '9',
      list: maskList,
      listKey: 'mask'
    });
    extension.$mobile_number.on('paste', function (e) {
      e.preventDefault(); // Предотвращаем стандартное поведение вставки
      // Получаем вставленные данные из буфера обмена

      var pastedData = '';

      if (e.originalEvent.clipboardData && e.originalEvent.clipboardData.getData) {
        pastedData = e.originalEvent.clipboardData.getData('text');
      } else if (window.clipboardData && window.clipboardData.getData) {
        // Для IE
        pastedData = window.clipboardData.getData('text');
      } // Проверяем, начинается ли вставленный текст с '+'


      if (pastedData.charAt(0) === '+') {
        // Сохраняем '+' и удаляем остальные нежелательные символы
        var processedData = '+' + pastedData.slice(1).replace(/\D/g, '');
      } else {
        // Удаляем все символы, кроме цифр
        var processedData = pastedData.replace(/\D/g, '');
      } // Вставляем очищенные данные в поле ввода


      var input = this;
      var start = input.selectionStart;
      var end = input.selectionEnd;
      var currentValue = $(input).val();
      var newValue = currentValue.substring(0, start) + processedData + currentValue.substring(end);
      extension.$mobile_number.inputmask("remove");
      extension.$mobile_number.val(newValue); // Триггерим событие 'input' для применения маски ввода

      $(input).trigger('input');
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

    var currentId = extension.getRecordId();

    if (!currentId || currentId === '') {
      // New extension - add _isNew flag for proper POST/PUT method selection
      result.data._isNew = true;
    }

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

        Extensions.updatePhoneRepresent(extension.defaultNumber);
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
      placeholder: globalTranslate.ex_SelectNetworkFilter || 'Select Network Filter',
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
      generateLength: 32,
      // Generate 32 character passwords for better security
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
      headerText = globalTranslate.ex_CreateNewExtension || 'New Employee';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJHVzZXJfdXNlcm5hbWUiLCJwYXNzd29yZFdpZGdldCIsIiRmb3JtT2JqIiwiJHRhYk1lbnVJdGVtcyIsImZvcndhcmRpbmdTZWxlY3QiLCJ2YWxpZGF0ZVJ1bGVzIiwibnVtYmVyIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyIiwiZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5IiwiZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSIsIm1vYmlsZV9udW1iZXIiLCJvcHRpb25hbCIsImV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0IiwiZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSIsInVzZXJfZW1haWwiLCJleF9WYWxpZGF0ZUVtYWlsRW1wdHkiLCJ1c2VyX3VzZXJuYW1lIiwiZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5Iiwic2lwX3NlY3JldCIsImV4X1ZhbGlkYXRlU2VjcmV0RW1wdHkiLCJleF9WYWxpZGF0ZVNlY3JldFdlYWsiLCJleF9WYWxpZGF0ZVBhc3N3b3JkVG9vV2VhayIsImZ3ZF9yaW5nbGVuZ3RoIiwiZGVwZW5kcyIsImV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlIiwiZndkX2ZvcndhcmRpbmciLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCIsImZ3ZF9mb3J3YXJkaW5nb25idXN5IiwiZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImFjY29yZGlvbiIsInBvcHVwIiwib24iLCJhdHRyIiwiaW5pdGlhbGl6ZUZvcm0iLCJjdXJyZW50TnVtYmVyIiwiaW5wdXRtYXNrIiwidmFsIiwidXBkYXRlUGFnZUhlYWRlciIsImN1cnJlbnRVc2VybmFtZSIsIkV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIiwiZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJsb2FkRXh0ZW5zaW9uRGF0YSIsImNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZSIsInBhc3RlZFZhbHVlIiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibmV3TnVtYmVyIiwidXNlcklkIiwiZm9ybSIsIkV4dGVuc2lvbnMiLCJjaGVja0F2YWlsYWJpbGl0eSIsImNiT25Db21wbGV0ZUVtYWlsIiwibmV3RW1haWwiLCJVc2Vyc0FQSSIsImNiT25Db21wbGV0ZU1vYmlsZU51bWJlciIsIm5ld01vYmlsZU51bWJlciIsImxlbmd0aCIsInVzZXJOYW1lIiwiY3VycmVudEZ3ZEZvcndhcmRpbmciLCJjdXJyZW50RndkT25CdXN5IiwiY3VycmVudEZ3ZE9uVW5hdmFpbGFibGUiLCIkZndkRHJvcGRvd24iLCJkcm9wZG93biIsIiRmd2RPbkJ1c3lEcm9wZG93biIsIiRmd2RPblVuYXZhaWxhYmxlRHJvcGRvd24iLCJjYk9uQ2xlYXJlZE1vYmlsZU51bWJlciIsImluaXRpYWxpemVJbnB1dE1hc2tzIiwidGltZW91dE51bWJlcklkIiwiZXh0ZW5zaW9uc0xlbmd0aCIsInBhcnNlSW50IiwibWFzayIsInBsYWNlaG9sZGVyIiwib25jb21wbGV0ZSIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJtYXNrTGlzdCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJvbkJlZm9yZVBhc3RlIiwic2hvd01hc2tPbkhvdmVyIiwibWF0Y2giLCJyZXBsYWNlIiwibGlzdCIsImxpc3RLZXkiLCJlIiwicHJldmVudERlZmF1bHQiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwiY2hhckF0IiwicHJvY2Vzc2VkRGF0YSIsInNsaWNlIiwiaW5wdXQiLCJzdGFydCIsInNlbGVjdGlvblN0YXJ0IiwiZW5kIiwic2VsZWN0aW9uRW5kIiwiY3VycmVudFZhbHVlIiwibmV3VmFsdWUiLCJzdWJzdHJpbmciLCJ0cmlnZ2VyIiwidGltZW91dEVtYWlsSWQiLCJmb2N1c291dCIsInBob25lIiwidGFyZ2V0IiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIiRnZW5lcmF0ZUJ0biIsImNsb3Nlc3QiLCJmaW5kIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImRpcnJ0eSIsInN1Ym1pdE1vZGUiLCJ1c2VyX2lkIiwiY3VycmVudElkIiwiZ2V0UmVjb3JkSWQiLCJfaXNOZXciLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInVwZGF0ZVBob25lUmVwcmVzZW50IiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsIkZvcm0iLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJFbXBsb3llZXNBUEkiLCJzYXZlTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwicmVjb3JkSWQiLCJhcGlJZCIsImhpZGUiLCJnZXRSZWNvcmQiLCJwb3B1bGF0ZUZvcm1XaXRoRGF0YSIsImF2YXRhciIsInNob3dFcnJvciIsImVycm9yIiwidXJsUGFydHMiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJleHRlbnNpb25zX2xlbmd0aCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEiLCJ0ZXh0Iiwic2V0QXZhdGFyVXJsIiwidXNlcl9hdmF0YXIiLCJFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yIiwiaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0IiwiRXh0ZW5zaW9uU2VsZWN0b3IiLCJpbml0IiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJpbmNsdWRlRW1wdHkiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsImV4X1NlbGVjdE5ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsIm9mZiIsIm5ld0V4dGVuc2lvbiIsInVwZGF0ZUZvcndhcmRpbmdEcm9wZG93bnNFeGNsdXNpb24iLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImZvcndhcmRpbmdGaWVsZHMiLCJmb3JFYWNoIiwiZmllbGROYW1lIiwiY3VycmVudFRleHQiLCJyZW1vdmUiLCJyZWZyZXNoRGF0YSIsImlzTmV3RXh0ZW5zaW9uIiwiaWQiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsInZhbGlkYXRpb24iLCJWQUxJREFUSU9OIiwiU09GVCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwidmFsaWRhdGVPbklucHV0IiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwib25HZW5lcmF0ZSIsInBhc3N3b3JkIiwiZGF0YUNoYW5nZWQiLCJvblZhbGlkYXRlIiwiaXNWYWxpZCIsInNjb3JlIiwiJGRyb3Bkb3duIiwib25DaGFuZ2UiLCJlbXBsb3llZU5hbWUiLCJleHRlbnNpb25OdW1iZXIiLCJoZWFkZXJUZXh0IiwidHJpbSIsImV4X0NyZWF0ZU5ld0V4dGVuc2lvbiIsImh0bWwiLCJmbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJwYXNzd29yZFN0cmVuZ3RoIiwic3RhdGUiLCJnZXRTdGF0ZSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFNBQVMsR0FBRztBQUNkQyxFQUFBQSxZQUFZLEVBQUUsRUFEQTtBQUVkQyxFQUFBQSxhQUFhLEVBQUUsRUFGRDtBQUdkQyxFQUFBQSxtQkFBbUIsRUFBRSxFQUhQO0FBSWRDLEVBQUFBLE9BQU8sRUFBRUMsQ0FBQyxDQUFDLFNBQUQsQ0FKSTtBQUtkQyxFQUFBQSxXQUFXLEVBQUVELENBQUMsQ0FBQyxhQUFELENBTEE7QUFNZEUsRUFBQUEsY0FBYyxFQUFFRixDQUFDLENBQUMsZ0JBQUQsQ0FOSDtBQU9kRyxFQUFBQSxlQUFlLEVBQUVILENBQUMsQ0FBQyxpQkFBRCxDQVBKO0FBUWRJLEVBQUFBLHFCQUFxQixFQUFFSixDQUFDLENBQUMsdUJBQUQsQ0FSVjtBQVNkSyxFQUFBQSw0QkFBNEIsRUFBRUwsQ0FBQyxDQUFDLDhCQUFELENBVGpCO0FBVWRNLEVBQUFBLE1BQU0sRUFBRU4sQ0FBQyxDQUFDLGFBQUQsQ0FWSztBQVdkTyxFQUFBQSxjQUFjLEVBQUVQLENBQUMsQ0FBQyxnQkFBRCxDQVhIOztBQWFkO0FBQ0o7QUFDQTtBQUNBO0FBQ0lRLEVBQUFBLGNBQWMsRUFBRSxJQWpCRjs7QUFtQmQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFVCxDQUFDLENBQUMsa0JBQUQsQ0F2Qkc7O0FBeUJkO0FBQ0o7QUFDQTtBQUNBO0FBQ0lVLEVBQUFBLGFBQWEsRUFBRVYsQ0FBQyxDQUFDLHdCQUFELENBN0JGOztBQWdDZDtBQUNKO0FBQ0E7QUFDQTtBQUNJVyxFQUFBQSxnQkFBZ0IsRUFBRSxxQ0FwQ0o7O0FBc0NkO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLE1BQU0sRUFBRTtBQUNKQyxNQUFBQSxVQUFVLEVBQUUsUUFEUjtBQUVKQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsUUFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERyxFQUtIO0FBQ0lILFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRTtBQUY1QixPQUxHLEVBU0g7QUFDSUosUUFBQUEsSUFBSSxFQUFFLHlCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRztBQUY1QixPQVRHO0FBRkgsS0FERztBQWtCWEMsSUFBQUEsYUFBYSxFQUFFO0FBQ1hDLE1BQUFBLFFBQVEsRUFBRSxJQURDO0FBRVhULE1BQUFBLFVBQVUsRUFBRSxlQUZEO0FBR1hDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxNQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDTTtBQUY1QixPQURHLEVBS0g7QUFDSVIsUUFBQUEsSUFBSSxFQUFFLGdDQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDTztBQUY1QixPQUxHO0FBSEksS0FsQko7QUFnQ1hDLElBQUFBLFVBQVUsRUFBRTtBQUNSSCxNQUFBQSxRQUFRLEVBQUUsSUFERjtBQUVSVCxNQUFBQSxVQUFVLEVBQUUsWUFGSjtBQUdSQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1M7QUFGNUIsT0FERztBQUhDLEtBaENEO0FBMENYQyxJQUFBQSxhQUFhLEVBQUU7QUFDWGQsTUFBQUEsVUFBVSxFQUFFLGVBREQ7QUFFWEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNXO0FBRjVCLE9BREc7QUFGSSxLQTFDSjtBQW1EWEMsSUFBQUEsVUFBVSxFQUFFO0FBQ1JoQixNQUFBQSxVQUFVLEVBQUUsWUFESjtBQUVSQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2E7QUFGNUIsT0FERyxFQUtIO0FBQ0lmLFFBQUFBLElBQUksRUFBRSxjQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDYztBQUY1QixPQUxHLEVBU0g7QUFDSWhCLFFBQUFBLElBQUksRUFBRSxrQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2UsMEJBQWhCLElBQThDO0FBRjFELE9BVEc7QUFGQyxLQW5ERDtBQW9FWEMsSUFBQUEsY0FBYyxFQUFFO0FBQ1pwQixNQUFBQSxVQUFVLEVBQUUsZ0JBREE7QUFFWnFCLE1BQUFBLE9BQU8sRUFBRSxnQkFGRztBQUdacEIsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLGlCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDa0I7QUFGNUIsT0FERztBQUhLLEtBcEVMO0FBOEVYQyxJQUFBQSxjQUFjLEVBQUU7QUFDWmQsTUFBQUEsUUFBUSxFQUFFLElBREU7QUFFWlQsTUFBQUEsVUFBVSxFQUFFLGdCQUZBO0FBR1pDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxlQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDb0I7QUFGNUIsT0FERyxFQUtIO0FBQ0l0QixRQUFBQSxJQUFJLEVBQUUsbUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNxQjtBQUY1QixPQUxHO0FBSEssS0E5RUw7QUE0RlhDLElBQUFBLG9CQUFvQixFQUFFO0FBQ2xCMUIsTUFBQUEsVUFBVSxFQUFFLHNCQURNO0FBRWxCQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsbUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNxQjtBQUY1QixPQURHO0FBRlcsS0E1Rlg7QUFxR1hFLElBQUFBLDJCQUEyQixFQUFFO0FBQ3pCM0IsTUFBQUEsVUFBVSxFQUFFLDZCQURhO0FBRXpCQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsbUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNxQjtBQUY1QixPQURHO0FBRmtCO0FBckdsQixHQTNDRDs7QUEySmQ7QUFDSjtBQUNBO0FBQ0lHLEVBQUFBLFVBOUpjLHdCQThKRDtBQUNUO0FBQ0E7QUFDQS9DLElBQUFBLFNBQVMsQ0FBQ0MsWUFBVixHQUF5QixFQUF6QjtBQUNBRCxJQUFBQSxTQUFTLENBQUNHLG1CQUFWLEdBQWdDLEVBQWhDO0FBQ0FILElBQUFBLFNBQVMsQ0FBQ0UsYUFBVixHQUEwQixFQUExQixDQUxTLENBT1Q7O0FBQ0FGLElBQUFBLFNBQVMsQ0FBQ2UsYUFBVixDQUF3QmlDLEdBQXhCLENBQTRCO0FBQ3hCQyxNQUFBQSxPQUFPLEVBQUUsSUFEZTtBQUV4QkMsTUFBQUEsV0FBVyxFQUFFO0FBRlcsS0FBNUI7QUFJQTdDLElBQUFBLENBQUMsQ0FBQyxnQ0FBRCxDQUFELENBQW9DOEMsU0FBcEMsR0FaUyxDQWNUOztBQUNBOUMsSUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQitDLEtBQWhCO0FBQ0EvQyxJQUFBQSxDQUFDLENBQUMsVUFBRCxDQUFELENBQWMrQyxLQUFkLEdBaEJTLENBa0JUOztBQUNBcEQsSUFBQUEsU0FBUyxDQUFDTSxXQUFWLENBQXNCK0MsRUFBdEIsQ0FBeUIsT0FBekIsRUFBa0MsWUFBVztBQUN6Q2hELE1BQUFBLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUWlELElBQVIsQ0FBYSxjQUFiLEVBQTZCLGNBQTdCO0FBQ0gsS0FGRCxFQW5CUyxDQXVCVDs7QUFDQXRELElBQUFBLFNBQVMsQ0FBQ3VELGNBQVYsR0F4QlMsQ0EwQlQ7O0FBQ0F2RCxJQUFBQSxTQUFTLENBQUNZLGNBQVYsQ0FBeUJ5QyxFQUF6QixDQUE0QixPQUE1QixFQUFxQyxZQUFXO0FBQzVDLFVBQU1HLGFBQWEsR0FBR3hELFNBQVMsQ0FBQ0ksT0FBVixDQUFrQnFELFNBQWxCLEdBQThCekQsU0FBUyxDQUFDSSxPQUFWLENBQWtCcUQsU0FBbEIsQ0FBNEIsZUFBNUIsQ0FBOUIsR0FBNkV6RCxTQUFTLENBQUNJLE9BQVYsQ0FBa0JzRCxHQUFsQixFQUFuRztBQUNBMUQsTUFBQUEsU0FBUyxDQUFDMkQsZ0JBQVYsQ0FBMkJ0RCxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFxRCxHQUFSLEVBQTNCLEVBQTBDRixhQUExQztBQUNILEtBSEQsRUEzQlMsQ0FnQ1Q7O0FBQ0F4RCxJQUFBQSxTQUFTLENBQUNJLE9BQVYsQ0FBa0JpRCxFQUFsQixDQUFxQixPQUFyQixFQUE4QixZQUFXO0FBQ3JDLFVBQU1PLGVBQWUsR0FBRzVELFNBQVMsQ0FBQ1ksY0FBVixDQUF5QjhDLEdBQXpCLEVBQXhCO0FBQ0EsVUFBTUYsYUFBYSxHQUFHbkQsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRb0QsU0FBUixHQUFvQnBELENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUW9ELFNBQVIsQ0FBa0IsZUFBbEIsQ0FBcEIsR0FBeURwRCxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFxRCxHQUFSLEVBQS9FO0FBQ0ExRCxNQUFBQSxTQUFTLENBQUMyRCxnQkFBVixDQUEyQkMsZUFBM0IsRUFBNENKLGFBQTVDO0FBQ0gsS0FKRCxFQWpDUyxDQXVDVDs7QUFDQSxRQUFJLE9BQU9LLHVCQUFQLEtBQW1DLFdBQXZDLEVBQW9EO0FBQ2hEQSxNQUFBQSx1QkFBdUIsQ0FBQ2QsVUFBeEI7QUFDSCxLQUZELE1BRU8sSUFBSSxPQUFPZSx1QkFBUCxLQUFtQyxXQUF2QyxFQUFvRDtBQUN2RDtBQUNBQSxNQUFBQSx1QkFBdUIsQ0FBQ2YsVUFBeEI7QUFDSCxLQTdDUSxDQStDVDs7O0FBQ0EvQyxJQUFBQSxTQUFTLENBQUMrRCxpQkFBVjtBQUNILEdBL01hOztBQWdOZDtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsMkJBbk5jLHVDQW1OY0MsV0FuTmQsRUFtTjJCO0FBQ3JDLFdBQU9BLFdBQVA7QUFDSCxHQXJOYTs7QUF1TmQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsa0JBM05jLGdDQTJOTztBQUNqQjtBQUNBLFFBQU1DLFNBQVMsR0FBR25FLFNBQVMsQ0FBQ0ksT0FBVixDQUFrQnFELFNBQWxCLENBQTRCLGVBQTVCLENBQWxCLENBRmlCLENBSWpCOztBQUNBLFFBQU1XLE1BQU0sR0FBR3BFLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLFNBQXJDLENBQWYsQ0FMaUIsQ0FPakI7QUFDQTtBQUNBOztBQUNBQyxJQUFBQSxVQUFVLENBQUNDLGlCQUFYLENBQTZCdkUsU0FBUyxDQUFDRSxhQUF2QyxFQUFzRGlFLFNBQXRELEVBQWlFLFFBQWpFLEVBQTJFQyxNQUEzRTtBQUNILEdBdE9hOztBQXVPZDtBQUNKO0FBQ0E7QUFDSUksRUFBQUEsaUJBMU9jLCtCQTBPTTtBQUVoQjtBQUNBLFFBQU1DLFFBQVEsR0FBR3pFLFNBQVMsQ0FBQ1csTUFBVixDQUFpQjhDLFNBQWpCLENBQTJCLGVBQTNCLENBQWpCLENBSGdCLENBS2hCOztBQUNBLFFBQU1XLE1BQU0sR0FBR3BFLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLFNBQXJDLENBQWYsQ0FOZ0IsQ0FRaEI7QUFDQTtBQUNBOztBQUNBSyxJQUFBQSxRQUFRLENBQUNILGlCQUFULENBQTJCdkUsU0FBUyxDQUFDQyxZQUFyQyxFQUFtRHdFLFFBQW5ELEVBQTRELE9BQTVELEVBQXFFTCxNQUFyRTtBQUNILEdBdFBhOztBQXdQZDtBQUNKO0FBQ0E7QUFDSU8sRUFBQUEsd0JBM1BjLHNDQTJQYTtBQUN2QjtBQUNBLFFBQU1DLGVBQWUsR0FBRzVFLFNBQVMsQ0FBQ08sY0FBVixDQUF5QmtELFNBQXpCLENBQW1DLGVBQW5DLENBQXhCLENBRnVCLENBSXZCOztBQUNBLFFBQU1XLE1BQU0sR0FBR3BFLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLFNBQXJDLENBQWYsQ0FMdUIsQ0FPdkI7O0FBQ0FDLElBQUFBLFVBQVUsQ0FBQ0MsaUJBQVgsQ0FBNkJ2RSxTQUFTLENBQUNHLG1CQUF2QyxFQUE0RHlFLGVBQTVELEVBQTZFLGVBQTdFLEVBQThGUixNQUE5RixFQVJ1QixDQVV2Qjs7QUFDQSxRQUFJUSxlQUFlLEtBQUs1RSxTQUFTLENBQUNHLG1CQUE5QixJQUNJSCxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxtQkFBckMsRUFBMERRLE1BQTFELEtBQXFFLENBRDdFLEVBRUU7QUFDRTdFLE1BQUFBLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLG1CQUFyQyxFQUEwRE8sZUFBMUQ7QUFDSCxLQWZzQixDQWlCdkI7OztBQUNBLFFBQUlBLGVBQWUsS0FBSzVFLFNBQVMsQ0FBQ0csbUJBQWxDLEVBQXVEO0FBQ25EO0FBQ0EsVUFBTTJFLFFBQVEsR0FBRzlFLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLGVBQXJDLENBQWpCLENBRm1ELENBSW5EOztBQUNBLFVBQU1VLG9CQUFvQixHQUFHL0UsU0FBUyxDQUFDYyxRQUFWLENBQW1CdUQsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZ0JBQXJDLENBQTdCO0FBQ0EsVUFBTVcsZ0JBQWdCLEdBQUdoRixTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxzQkFBckMsQ0FBekI7QUFDQSxVQUFNWSx1QkFBdUIsR0FBR2pGLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLDZCQUFyQyxDQUFoQyxDQVBtRCxDQVNuRDs7QUFDQSxVQUFJVSxvQkFBb0IsS0FBSy9FLFNBQVMsQ0FBQ0csbUJBQXZDLEVBQTREO0FBRXhEO0FBQ0EsWUFBSUgsU0FBUyxDQUFDYyxRQUFWLENBQW1CdUQsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZ0JBQXJDLEVBQXVEUSxNQUF2RCxLQUFrRSxDQUFsRSxJQUNHN0UsU0FBUyxDQUFDYyxRQUFWLENBQW1CdUQsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZ0JBQXJDLE1BQXlELEdBRGhFLEVBQ3FFO0FBQ2pFckUsVUFBQUEsU0FBUyxDQUFDYyxRQUFWLENBQW1CdUQsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZ0JBQXJDLEVBQXVELEVBQXZEO0FBQ0gsU0FOdUQsQ0FReEQ7OztBQUNBLFlBQU1hLFlBQVksR0FBRzdFLENBQUMsNEJBQXRCO0FBQ0E2RSxRQUFBQSxZQUFZLENBQUNDLFFBQWIsQ0FBc0IsVUFBdEIsWUFBcUNMLFFBQXJDLGVBQWtERixlQUFsRDtBQUNBTSxRQUFBQSxZQUFZLENBQUNDLFFBQWIsQ0FBc0IsV0FBdEIsRUFBbUNQLGVBQW5DO0FBQ0E1RSxRQUFBQSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxnQkFBckMsRUFBdURPLGVBQXZEO0FBQ0gsT0F2QmtELENBeUJuRDs7O0FBQ0EsVUFBSUksZ0JBQWdCLEtBQUtoRixTQUFTLENBQUNHLG1CQUFuQyxFQUF3RDtBQUVwRDtBQUNBLFlBQU1pRixrQkFBa0IsR0FBRy9FLENBQUMsa0NBQTVCO0FBQ0ErRSxRQUFBQSxrQkFBa0IsQ0FBQ0QsUUFBbkIsQ0FBNEIsVUFBNUIsWUFBMkNMLFFBQTNDLGVBQXdERixlQUF4RDtBQUNBUSxRQUFBQSxrQkFBa0IsQ0FBQ0QsUUFBbkIsQ0FBNEIsV0FBNUIsRUFBeUNQLGVBQXpDO0FBQ0E1RSxRQUFBQSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxzQkFBckMsRUFBNkRPLGVBQTdEO0FBQ0gsT0FqQ2tELENBbUNuRDs7O0FBQ0EsVUFBSUssdUJBQXVCLEtBQUtqRixTQUFTLENBQUNHLG1CQUExQyxFQUErRDtBQUUzRDtBQUNBLFlBQU1rRix5QkFBeUIsR0FBR2hGLENBQUMseUNBQW5DO0FBQ0FnRixRQUFBQSx5QkFBeUIsQ0FBQ0YsUUFBMUIsQ0FBbUMsVUFBbkMsWUFBa0RMLFFBQWxELGVBQStERixlQUEvRDtBQUNBUyxRQUFBQSx5QkFBeUIsQ0FBQ0YsUUFBMUIsQ0FBbUMsV0FBbkMsRUFBZ0RQLGVBQWhEO0FBQ0E1RSxRQUFBQSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyw2QkFBckMsRUFBb0VPLGVBQXBFO0FBQ0g7QUFDSixLQTlEc0IsQ0ErRHZCOzs7QUFDQTVFLElBQUFBLFNBQVMsQ0FBQ0csbUJBQVYsR0FBZ0N5RSxlQUFoQztBQUNILEdBNVRhOztBQThUZDtBQUNKO0FBQ0E7QUFDSVUsRUFBQUEsdUJBalVjLHFDQWlVWTtBQUN0QjtBQUNBLFFBQU1QLG9CQUFvQixHQUFHL0UsU0FBUyxDQUFDYyxRQUFWLENBQW1CdUQsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZ0JBQXJDLENBQTdCO0FBQ0EsUUFBTVcsZ0JBQWdCLEdBQUdoRixTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxzQkFBckMsQ0FBekI7QUFDQSxRQUFNWSx1QkFBdUIsR0FBR2pGLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLDZCQUFyQyxDQUFoQyxDQUpzQixDQU10Qjs7QUFDQXJFLElBQUFBLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLG1CQUFyQyxFQUEwRCxFQUExRDtBQUNBckUsSUFBQUEsU0FBUyxDQUFDYyxRQUFWLENBQW1CdUQsSUFBbkIsQ0FBd0IsV0FBeEIsRUFBcUMsZUFBckMsRUFBc0QsRUFBdEQsRUFSc0IsQ0FVdEI7O0FBQ0EsUUFBSVUsb0JBQW9CLEtBQUsvRSxTQUFTLENBQUNHLG1CQUF2QyxFQUE0RDtBQUN4RDtBQUNBSCxNQUFBQSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxnQkFBckMsRUFBdUQsQ0FBdkQsRUFGd0QsQ0FHeEQ7O0FBQ0EsVUFBTWEsWUFBWSxHQUFHN0UsQ0FBQyxDQUFDLDBCQUFELENBQXRCO0FBQ0E2RSxNQUFBQSxZQUFZLENBQUNDLFFBQWIsQ0FBc0IsT0FBdEI7QUFDQUQsTUFBQUEsWUFBWSxDQUFDQyxRQUFiLENBQXNCLFVBQXRCLEVBQWtDLEdBQWxDO0FBQ0FuRixNQUFBQSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxnQkFBckMsRUFBdUQsRUFBdkQ7QUFDSCxLQW5CcUIsQ0FxQnRCOzs7QUFDQSxRQUFJVyxnQkFBZ0IsS0FBS2hGLFNBQVMsQ0FBQ0csbUJBQW5DLEVBQXdEO0FBQ3BEO0FBQ0EsVUFBTWlGLGtCQUFrQixHQUFHL0UsQ0FBQyxDQUFDLGdDQUFELENBQTVCO0FBQ0ErRSxNQUFBQSxrQkFBa0IsQ0FBQ0QsUUFBbkIsQ0FBNEIsT0FBNUI7QUFDQUMsTUFBQUEsa0JBQWtCLENBQUNELFFBQW5CLENBQTRCLFVBQTVCLEVBQXdDLEdBQXhDO0FBQ0FuRixNQUFBQSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxzQkFBckMsRUFBNkQsRUFBN0Q7QUFDSCxLQTVCcUIsQ0E4QnRCOzs7QUFDQSxRQUFJWSx1QkFBdUIsS0FBS2pGLFNBQVMsQ0FBQ0csbUJBQTFDLEVBQStEO0FBQzNEO0FBQ0EsVUFBTWtGLHlCQUF5QixHQUFHaEYsQ0FBQyxDQUFDLHVDQUFELENBQW5DO0FBQ0FnRixNQUFBQSx5QkFBeUIsQ0FBQ0YsUUFBMUIsQ0FBbUMsT0FBbkM7QUFDQUUsTUFBQUEseUJBQXlCLENBQUNGLFFBQTFCLENBQW1DLFVBQW5DLEVBQStDLEdBQS9DO0FBQ0FuRixNQUFBQSxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyw2QkFBckMsRUFBb0UsRUFBcEU7QUFDSCxLQXJDcUIsQ0F1Q3RCOzs7QUFDQXJFLElBQUFBLFNBQVMsQ0FBQ0csbUJBQVYsR0FBZ0MsRUFBaEM7QUFDSCxHQTFXYTtBQTRXZG9GLEVBQUFBLG9CQTVXYyxrQ0E0V1E7QUFDbEI7QUFDQSxRQUFJQyxlQUFKLENBRmtCLENBSWxCO0FBQ0E7O0FBQ0EsUUFBSXhGLFNBQVMsQ0FBQ3lGLGdCQUFkLEVBQWdDO0FBQzVCLFVBQU1BLGdCQUFnQixHQUFHQyxRQUFRLENBQUMxRixTQUFTLENBQUN5RixnQkFBWCxFQUE2QixFQUE3QixDQUFqQzs7QUFDQSxVQUFJQSxnQkFBZ0IsSUFBSSxDQUFwQixJQUF5QkEsZ0JBQWdCLElBQUksRUFBakQsRUFBcUQ7QUFDakQ7QUFDQXpGLFFBQUFBLFNBQVMsQ0FBQ0ksT0FBVixDQUFrQnFELFNBQWxCLENBQTRCO0FBQ3hCa0MsVUFBQUEsSUFBSSxnQkFBU0YsZ0JBQVQsTUFEb0I7QUFFeEJHLFVBQUFBLFdBQVcsRUFBRSxHQUZXO0FBR3hCQyxVQUFBQSxVQUFVLEVBQUUsc0JBQU07QUFDZDtBQUNBLGdCQUFJTCxlQUFKLEVBQXFCO0FBQ2pCTSxjQUFBQSxZQUFZLENBQUNOLGVBQUQsQ0FBWjtBQUNILGFBSmEsQ0FLZDs7O0FBQ0FBLFlBQUFBLGVBQWUsR0FBR08sVUFBVSxDQUFDLFlBQU07QUFDL0IvRixjQUFBQSxTQUFTLENBQUNrRSxrQkFBVjtBQUNILGFBRjJCLEVBRXpCLEdBRnlCLENBQTVCO0FBR0g7QUFadUIsU0FBNUI7QUFjSDtBQUNKOztBQUVEbEUsSUFBQUEsU0FBUyxDQUFDSSxPQUFWLENBQWtCaUQsRUFBbEIsQ0FBcUIsT0FBckIsRUFBOEIsWUFBVztBQUNyQ3JELE1BQUFBLFNBQVMsQ0FBQ2tFLGtCQUFWO0FBQ0gsS0FGRCxFQTNCa0IsQ0ErQmxCOztBQUNBLFFBQU04QixRQUFRLEdBQUczRixDQUFDLENBQUM0RixTQUFGLENBQVlDLGlCQUFaLEVBQStCLENBQUMsR0FBRCxDQUEvQixFQUFzQyxTQUF0QyxFQUFpRCxNQUFqRCxDQUFqQjtBQUNBbEcsSUFBQUEsU0FBUyxDQUFDTyxjQUFWLENBQXlCNEYsVUFBekIsQ0FBb0M7QUFDaEMxQyxNQUFBQSxTQUFTLEVBQUU7QUFDUDJDLFFBQUFBLFdBQVcsRUFBRTtBQUNULGVBQUs7QUFDREMsWUFBQUEsU0FBUyxFQUFFLE9BRFY7QUFFREMsWUFBQUEsV0FBVyxFQUFFO0FBRlo7QUFESSxTQUROO0FBT1BDLFFBQUFBLFNBQVMsRUFBRXZHLFNBQVMsQ0FBQ3NGLHVCQVBkO0FBUVBPLFFBQUFBLFVBQVUsRUFBRTdGLFNBQVMsQ0FBQzJFLHdCQVJmO0FBU1A2QixRQUFBQSxhQUFhLEVBQUV4RyxTQUFTLENBQUNnRSwyQkFUbEI7QUFVUHlDLFFBQUFBLGVBQWUsRUFBRTtBQVZWLE9BRHFCO0FBYWhDQyxNQUFBQSxLQUFLLEVBQUUsT0FieUI7QUFjaENDLE1BQUFBLE9BQU8sRUFBRSxHQWR1QjtBQWVoQ0MsTUFBQUEsSUFBSSxFQUFFWixRQWYwQjtBQWdCaENhLE1BQUFBLE9BQU8sRUFBRTtBQWhCdUIsS0FBcEM7QUFtQkE3RyxJQUFBQSxTQUFTLENBQUNPLGNBQVYsQ0FBeUI4QyxFQUF6QixDQUE0QixPQUE1QixFQUFxQyxVQUFTeUQsQ0FBVCxFQUFZO0FBQzdDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUYsR0FENkMsQ0FDekI7QUFFcEI7O0FBQ0EsVUFBSUMsVUFBVSxHQUFHLEVBQWpCOztBQUNBLFVBQUlGLENBQUMsQ0FBQ0csYUFBRixDQUFnQkMsYUFBaEIsSUFBaUNKLENBQUMsQ0FBQ0csYUFBRixDQUFnQkMsYUFBaEIsQ0FBOEJDLE9BQW5FLEVBQTRFO0FBQ3hFSCxRQUFBQSxVQUFVLEdBQUdGLENBQUMsQ0FBQ0csYUFBRixDQUFnQkMsYUFBaEIsQ0FBOEJDLE9BQTlCLENBQXNDLE1BQXRDLENBQWI7QUFDSCxPQUZELE1BRU8sSUFBSUMsTUFBTSxDQUFDRixhQUFQLElBQXdCRSxNQUFNLENBQUNGLGFBQVAsQ0FBcUJDLE9BQWpELEVBQTBEO0FBQUU7QUFDL0RILFFBQUFBLFVBQVUsR0FBR0ksTUFBTSxDQUFDRixhQUFQLENBQXFCQyxPQUFyQixDQUE2QixNQUE3QixDQUFiO0FBQ0gsT0FUNEMsQ0FXN0M7OztBQUNBLFVBQUlILFVBQVUsQ0FBQ0ssTUFBWCxDQUFrQixDQUFsQixNQUF5QixHQUE3QixFQUFrQztBQUM5QjtBQUNBLFlBQUlDLGFBQWEsR0FBRyxNQUFNTixVQUFVLENBQUNPLEtBQVgsQ0FBaUIsQ0FBakIsRUFBb0JaLE9BQXBCLENBQTRCLEtBQTVCLEVBQW1DLEVBQW5DLENBQTFCO0FBQ0gsT0FIRCxNQUdPO0FBQ0g7QUFDQSxZQUFJVyxhQUFhLEdBQUdOLFVBQVUsQ0FBQ0wsT0FBWCxDQUFtQixLQUFuQixFQUEwQixFQUExQixDQUFwQjtBQUNILE9BbEI0QyxDQW9CN0M7OztBQUNBLFVBQU1hLEtBQUssR0FBRyxJQUFkO0FBQ0EsVUFBTUMsS0FBSyxHQUFHRCxLQUFLLENBQUNFLGNBQXBCO0FBQ0EsVUFBTUMsR0FBRyxHQUFHSCxLQUFLLENBQUNJLFlBQWxCO0FBQ0EsVUFBTUMsWUFBWSxHQUFHeEgsQ0FBQyxDQUFDbUgsS0FBRCxDQUFELENBQVM5RCxHQUFULEVBQXJCO0FBQ0EsVUFBTW9FLFFBQVEsR0FBR0QsWUFBWSxDQUFDRSxTQUFiLENBQXVCLENBQXZCLEVBQTBCTixLQUExQixJQUFtQ0gsYUFBbkMsR0FBbURPLFlBQVksQ0FBQ0UsU0FBYixDQUF1QkosR0FBdkIsQ0FBcEU7QUFDQTNILE1BQUFBLFNBQVMsQ0FBQ08sY0FBVixDQUF5QmtELFNBQXpCLENBQW1DLFFBQW5DO0FBQ0F6RCxNQUFBQSxTQUFTLENBQUNPLGNBQVYsQ0FBeUJtRCxHQUF6QixDQUE2Qm9FLFFBQTdCLEVBM0I2QyxDQTRCN0M7O0FBQ0F6SCxNQUFBQSxDQUFDLENBQUNtSCxLQUFELENBQUQsQ0FBU1EsT0FBVCxDQUFpQixPQUFqQjtBQUNILEtBOUJELEVBcERrQixDQW9GbEI7O0FBQ0EsUUFBSUMsY0FBSjtBQUNBakksSUFBQUEsU0FBUyxDQUFDVyxNQUFWLENBQWlCOEMsU0FBakIsQ0FBMkIsT0FBM0IsRUFBb0M7QUFDaENvQyxNQUFBQSxVQUFVLEVBQUUsc0JBQUk7QUFDWjtBQUNBLFlBQUlvQyxjQUFKLEVBQW9CO0FBQ2hCbkMsVUFBQUEsWUFBWSxDQUFDbUMsY0FBRCxDQUFaO0FBQ0gsU0FKVyxDQUtaOzs7QUFDQUEsUUFBQUEsY0FBYyxHQUFHbEMsVUFBVSxDQUFDLFlBQU07QUFDOUIvRixVQUFBQSxTQUFTLENBQUN3RSxpQkFBVjtBQUNILFNBRjBCLEVBRXhCLEdBRndCLENBQTNCO0FBR0g7QUFWK0IsS0FBcEM7QUFZQXhFLElBQUFBLFNBQVMsQ0FBQ1csTUFBVixDQUFpQjBDLEVBQWpCLENBQW9CLE9BQXBCLEVBQTZCLFlBQVc7QUFDcENyRCxNQUFBQSxTQUFTLENBQUN3RSxpQkFBVjtBQUNILEtBRkQsRUFsR2tCLENBc0dsQjs7QUFDQXhFLElBQUFBLFNBQVMsQ0FBQ08sY0FBVixDQUF5QjJILFFBQXpCLENBQWtDLFVBQVVwQixDQUFWLEVBQWE7QUFDM0MsVUFBSXFCLEtBQUssR0FBRzlILENBQUMsQ0FBQ3lHLENBQUMsQ0FBQ3NCLE1BQUgsQ0FBRCxDQUFZMUUsR0FBWixHQUFrQmlELE9BQWxCLENBQTBCLFNBQTFCLEVBQXFDLEVBQXJDLENBQVo7O0FBQ0EsVUFBSXdCLEtBQUssS0FBSyxFQUFkLEVBQWtCO0FBQ2Q5SCxRQUFBQSxDQUFDLENBQUN5RyxDQUFDLENBQUNzQixNQUFILENBQUQsQ0FBWTFFLEdBQVosQ0FBZ0IsRUFBaEI7QUFDSDtBQUNKLEtBTEQ7QUFNSCxHQXpkYTs7QUE2ZGQ7QUFDSjtBQUNBO0FBQ0E7QUFDSTJFLEVBQUFBLHNCQWplYyxvQ0FpZVc7QUFDckI7QUFDQSxRQUFNQyxZQUFZLEdBQUd0SSxTQUFTLENBQUNNLFdBQVYsQ0FBc0JpSSxPQUF0QixDQUE4QixXQUE5QixFQUEyQ0MsSUFBM0MsQ0FBZ0QsMEJBQWhELENBQXJCOztBQUNBLFFBQUlGLFlBQVksQ0FBQ3pELE1BQWIsR0FBc0IsQ0FBMUIsRUFBNkI7QUFDekJ5RCxNQUFBQSxZQUFZLENBQUNOLE9BQWIsQ0FBcUIsT0FBckI7QUFDSDtBQUNKLEdBdmVhOztBQXllZDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lTLEVBQUFBLGdCQTllYyw0QkE4ZUdDLFFBOWVILEVBOGVhO0FBQ3ZCLFFBQU1DLE1BQU0sR0FBR0QsUUFBZjtBQUNBQyxJQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWWpILGFBQVosR0FBNEIzQixTQUFTLENBQUNPLGNBQVYsQ0FBeUJrRCxTQUF6QixDQUFtQyxlQUFuQyxDQUE1QixDQUZ1QixDQUl2Qjs7QUFDQSxXQUFPa0YsTUFBTSxDQUFDQyxJQUFQLENBQVlDLE1BQW5CO0FBQ0EsV0FBT0YsTUFBTSxDQUFDQyxJQUFQLENBQVlFLFVBQW5CO0FBQ0EsV0FBT0gsTUFBTSxDQUFDQyxJQUFQLENBQVlHLE9BQW5CLENBUHVCLENBT0s7QUFFNUI7O0FBQ0EsUUFBTUMsU0FBUyxHQUFHaEosU0FBUyxDQUFDaUosV0FBVixFQUFsQjs7QUFDQSxRQUFJLENBQUNELFNBQUQsSUFBY0EsU0FBUyxLQUFLLEVBQWhDLEVBQW9DO0FBQ2hDO0FBQ0FMLE1BQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZTSxNQUFaLEdBQXFCLElBQXJCO0FBQ0g7O0FBRUQsV0FBT1AsTUFBUDtBQUNILEdBL2ZhOztBQWdnQmQ7QUFDSjtBQUNBO0FBQ0E7QUFDSVEsRUFBQUEsZUFwZ0JjLDJCQW9nQkVDLFFBcGdCRixFQW9nQlk7QUFDdEIsUUFBSUEsUUFBUSxDQUFDVCxNQUFiLEVBQXFCO0FBQ2pCO0FBQ0EsVUFBSVMsUUFBUSxDQUFDUixJQUFULElBQWlCUSxRQUFRLENBQUNSLElBQVQsQ0FBYzFILE1BQW5DLEVBQTJDO0FBQ3ZDbEIsUUFBQUEsU0FBUyxDQUFDRSxhQUFWLEdBQTBCa0osUUFBUSxDQUFDUixJQUFULENBQWMxSCxNQUF4QyxDQUR1QyxDQUV2Qzs7QUFDQW9ELFFBQUFBLFVBQVUsQ0FBQytFLG9CQUFYLENBQWdDckosU0FBUyxDQUFDRSxhQUExQztBQUNILE9BTmdCLENBT2pCOztBQUNILEtBUkQsTUFRTztBQUNIb0osTUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCSCxRQUFRLENBQUNJLFFBQXJDO0FBQ0g7QUFDSixHQWhoQmE7O0FBaWhCZDtBQUNKO0FBQ0E7QUFDSWpHLEVBQUFBLGNBcGhCYyw0QkFvaEJHO0FBQ2I7QUFDQWtHLElBQUFBLElBQUksQ0FBQzNJLFFBQUwsR0FBZ0JkLFNBQVMsQ0FBQ2MsUUFBMUI7QUFDQTJJLElBQUFBLElBQUksQ0FBQ0MsR0FBTCxHQUFXLEdBQVgsQ0FIYSxDQUdHOztBQUNoQkQsSUFBQUEsSUFBSSxDQUFDeEksYUFBTCxHQUFxQmpCLFNBQVMsQ0FBQ2lCLGFBQS9CO0FBQ0F3SSxJQUFBQSxJQUFJLENBQUNoQixnQkFBTCxHQUF3QnpJLFNBQVMsQ0FBQ3lJLGdCQUFsQztBQUNBZ0IsSUFBQUEsSUFBSSxDQUFDTixlQUFMLEdBQXVCbkosU0FBUyxDQUFDbUosZUFBakMsQ0FOYSxDQVFiOztBQUNBTSxJQUFBQSxJQUFJLENBQUNFLFdBQUwsQ0FBaUJDLE9BQWpCLEdBQTJCLElBQTNCO0FBQ0FILElBQUFBLElBQUksQ0FBQ0UsV0FBTCxDQUFpQkUsU0FBakIsR0FBNkJDLFlBQTdCO0FBQ0FMLElBQUFBLElBQUksQ0FBQ0UsV0FBTCxDQUFpQkksVUFBakIsR0FBOEIsWUFBOUIsQ0FYYSxDQWFiO0FBQ0E7O0FBQ0FOLElBQUFBLElBQUksQ0FBQ08sdUJBQUwsR0FBK0IsSUFBL0IsQ0FmYSxDQWlCYjs7QUFDQVAsSUFBQUEsSUFBSSxDQUFDUSxtQkFBTCxhQUE4QkMsYUFBOUI7QUFDQVQsSUFBQUEsSUFBSSxDQUFDVSxvQkFBTCxhQUErQkQsYUFBL0I7QUFFQVQsSUFBQUEsSUFBSSxDQUFDMUcsVUFBTDtBQUNILEdBMWlCYTs7QUEyaUJkO0FBQ0o7QUFDQTtBQUNJZ0IsRUFBQUEsaUJBOWlCYywrQkE4aUJNO0FBQ2hCLFFBQU1xRyxRQUFRLEdBQUdwSyxTQUFTLENBQUNpSixXQUFWLEVBQWpCLENBRGdCLENBR2hCOztBQUNBLFFBQU1vQixLQUFLLEdBQUdELFFBQVEsS0FBSyxFQUFiLEdBQWtCLEtBQWxCLEdBQTBCQSxRQUF4QyxDQUpnQixDQU1oQjs7QUFDQSxRQUFJQyxLQUFLLEtBQUssS0FBZCxFQUFxQjtBQUNqQmhLLE1BQUFBLENBQUMsQ0FBQyxTQUFELENBQUQsQ0FBYWlLLElBQWIsR0FEaUIsQ0FDSTs7QUFDckJqSyxNQUFBQSxDQUFDLENBQUMsc0JBQUQsQ0FBRCxDQUEwQmlLLElBQTFCLEdBRmlCLENBRWlCO0FBQ3JDOztBQUVEUixJQUFBQSxZQUFZLENBQUNTLFNBQWIsQ0FBdUJGLEtBQXZCLEVBQThCLFVBQUNqQixRQUFELEVBQWM7QUFDeEMsVUFBSUEsUUFBUSxDQUFDVCxNQUFiLEVBQXFCO0FBQ2pCM0ksUUFBQUEsU0FBUyxDQUFDd0ssb0JBQVYsQ0FBK0JwQixRQUFRLENBQUNSLElBQXhDLEVBRGlCLENBRWpCOztBQUNBNUksUUFBQUEsU0FBUyxDQUFDRSxhQUFWLEdBQTBCa0osUUFBUSxDQUFDUixJQUFULENBQWMxSCxNQUFkLElBQXdCLEVBQWxEO0FBQ0FsQixRQUFBQSxTQUFTLENBQUNDLFlBQVYsR0FBeUJtSixRQUFRLENBQUNSLElBQVQsQ0FBYzdHLFVBQWQsSUFBNEIsRUFBckQ7QUFDQS9CLFFBQUFBLFNBQVMsQ0FBQ0csbUJBQVYsR0FBZ0NpSixRQUFRLENBQUNSLElBQVQsQ0FBY2pILGFBQWQsSUFBK0IsRUFBL0Q7QUFDSCxPQU5ELE1BTU87QUFBQTs7QUFDSDtBQUNBLFlBQUl5SSxRQUFRLEtBQUssRUFBakIsRUFBcUI7QUFDakJLLFVBQUFBLE1BQU0sQ0FBQzFILFVBQVA7QUFDSDs7QUFDRHVHLFFBQUFBLFdBQVcsQ0FBQ29CLFNBQVosQ0FBc0IsdUJBQUF0QixRQUFRLENBQUNJLFFBQVQsMEVBQW1CbUIsS0FBbkIsS0FBNEIsK0JBQWxEO0FBQ0g7QUFDSixLQWREO0FBZUgsR0F6a0JhOztBQTJrQmQ7QUFDSjtBQUNBO0FBQ0kxQixFQUFBQSxXQTlrQmMseUJBOGtCQTtBQUNWLFFBQU0yQixRQUFRLEdBQUd4RCxNQUFNLENBQUN5RCxRQUFQLENBQWdCQyxRQUFoQixDQUF5QkMsS0FBekIsQ0FBK0IsR0FBL0IsQ0FBakI7QUFDQSxRQUFNQyxXQUFXLEdBQUdKLFFBQVEsQ0FBQ0ssT0FBVCxDQUFpQixRQUFqQixDQUFwQjs7QUFDQSxRQUFJRCxXQUFXLEtBQUssQ0FBQyxDQUFqQixJQUFzQkosUUFBUSxDQUFDSSxXQUFXLEdBQUcsQ0FBZixDQUFsQyxFQUFxRDtBQUNqRCxhQUFPSixRQUFRLENBQUNJLFdBQVcsR0FBRyxDQUFmLENBQWY7QUFDSDs7QUFDRCxXQUFPLEVBQVA7QUFDSCxHQXJsQmE7O0FBdWxCZDtBQUNKO0FBQ0E7QUFDSVIsRUFBQUEsb0JBMWxCYyxnQ0EwbEJPNUIsSUExbEJQLEVBMGxCYTtBQUN2QjtBQUNBO0FBQ0E1SSxJQUFBQSxTQUFTLENBQUN5RixnQkFBVixHQUE2Qm1ELElBQUksQ0FBQ3NDLGlCQUFsQyxDQUh1QixDQUt2Qjs7QUFDQXpCLElBQUFBLElBQUksQ0FBQzBCLG9CQUFMLENBQTBCdkMsSUFBMUIsRUFBZ0M7QUFDNUJ3QyxNQUFBQSxhQUFhLEVBQUUsdUJBQUNDLFFBQUQsRUFBYztBQUN6QjtBQUNBckwsUUFBQUEsU0FBUyxDQUFDc0wsZ0NBQVYsQ0FBMkNELFFBQTNDLEVBRnlCLENBSXpCOztBQUNBLFlBQUlBLFFBQVEsQ0FBQ25LLE1BQWIsRUFBcUI7QUFDakJiLFVBQUFBLENBQUMsQ0FBQywyQkFBRCxDQUFELENBQStCa0wsSUFBL0IsQ0FBb0NGLFFBQVEsQ0FBQ25LLE1BQTdDO0FBQ0gsU0FQd0IsQ0FTekI7OztBQUNBdUosUUFBQUEsTUFBTSxDQUFDMUgsVUFBUCxHQVZ5QixDQVl6Qjs7QUFDQTBILFFBQUFBLE1BQU0sQ0FBQ2UsWUFBUCxDQUFvQkgsUUFBUSxDQUFDSSxXQUE3QixFQWJ5QixDQWV6Qjs7QUFDQSxZQUFJLE9BQU9DLDRCQUFQLEtBQXdDLFdBQTVDLEVBQXlEO0FBQ3JEQSxVQUFBQSw0QkFBNEIsQ0FBQzNJLFVBQTdCO0FBQ0gsU0FsQndCLENBb0J6Qjs7O0FBQ0EvQyxRQUFBQSxTQUFTLENBQUMyRCxnQkFBVixDQUEyQjBILFFBQVEsQ0FBQ3BKLGFBQXBDLEVBQW1Eb0osUUFBUSxDQUFDbkssTUFBNUQsRUFyQnlCLENBdUJ6Qjs7QUFDQWxCLFFBQUFBLFNBQVMsQ0FBQzJMLHdCQUFWLENBQW1DTixRQUFuQyxFQXhCeUIsQ0EwQnpCOztBQUNBckwsUUFBQUEsU0FBUyxDQUFDdUYsb0JBQVY7QUFDSDtBQTdCMkIsS0FBaEMsRUFOdUIsQ0FzQ3ZCO0FBQ0gsR0Fqb0JhOztBQW1vQmQ7QUFDSjtBQUNBO0FBQ0E7QUFDSStGLEVBQUFBLGdDQXZvQmMsNENBdW9CbUIxQyxJQXZvQm5CLEVBdW9CeUI7QUFDbkM7QUFDQWdELElBQUFBLGlCQUFpQixDQUFDQyxJQUFsQixDQUF1QixnQkFBdkIsRUFBeUM7QUFDckN4SyxNQUFBQSxJQUFJLEVBQUUsU0FEK0I7QUFFckN5SyxNQUFBQSxpQkFBaUIsRUFBRSxDQUFDbEQsSUFBSSxDQUFDMUgsTUFBTixDQUZrQjtBQUdyQzZLLE1BQUFBLFlBQVksRUFBRSxJQUh1QjtBQUlyQ25ELE1BQUFBLElBQUksRUFBRUE7QUFKK0IsS0FBekM7QUFPQWdELElBQUFBLGlCQUFpQixDQUFDQyxJQUFsQixDQUF1QixzQkFBdkIsRUFBK0M7QUFDM0N4SyxNQUFBQSxJQUFJLEVBQUUsU0FEcUM7QUFFM0N5SyxNQUFBQSxpQkFBaUIsRUFBRSxDQUFDbEQsSUFBSSxDQUFDMUgsTUFBTixDQUZ3QjtBQUczQzZLLE1BQUFBLFlBQVksRUFBRSxJQUg2QjtBQUkzQ25ELE1BQUFBLElBQUksRUFBRUE7QUFKcUMsS0FBL0M7QUFPQWdELElBQUFBLGlCQUFpQixDQUFDQyxJQUFsQixDQUF1Qiw2QkFBdkIsRUFBc0Q7QUFDbER4SyxNQUFBQSxJQUFJLEVBQUUsU0FENEM7QUFFbER5SyxNQUFBQSxpQkFBaUIsRUFBRSxDQUFDbEQsSUFBSSxDQUFDMUgsTUFBTixDQUYrQjtBQUdsRDZLLE1BQUFBLFlBQVksRUFBRSxJQUhvQztBQUlsRG5ELE1BQUFBLElBQUksRUFBRUE7QUFKNEMsS0FBdEQsRUFoQm1DLENBdUJuQzs7QUFFQW9ELElBQUFBLHNCQUFzQixDQUFDQyxhQUF2QixDQUFxQyxxQkFBckMsRUFBNERyRCxJQUE1RCxFQUFrRTtBQUM5RHNELE1BQUFBLE1BQU0saUVBRHdEO0FBRTlEdEcsTUFBQUEsV0FBVyxFQUFFckUsZUFBZSxDQUFDNEssc0JBQWhCLElBQTBDLHVCQUZPO0FBRzlEQyxNQUFBQSxLQUFLLEVBQUU7QUFIdUQsS0FBbEUsRUF6Qm1DLENBK0JuQztBQUVBOztBQUNBcE0sSUFBQUEsU0FBUyxDQUFDSSxPQUFWLENBQWtCaU0sR0FBbEIsQ0FBc0IsaUJBQXRCLEVBQXlDaEosRUFBekMsQ0FBNEMsaUJBQTVDLEVBQStELFlBQU07QUFDakUsVUFBTWlKLFlBQVksR0FBR3RNLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLFFBQXJDLENBQXJCOztBQUVBLFVBQUlpSSxZQUFKLEVBQWtCO0FBQ2Q7QUFDQXRNLFFBQUFBLFNBQVMsQ0FBQ3VNLGtDQUFWLENBQTZDRCxZQUE3QztBQUNIO0FBQ0osS0FQRDtBQVNBdE0sSUFBQUEsU0FBUyxDQUFDd00sMEJBQVY7QUFDQXhNLElBQUFBLFNBQVMsQ0FBQ3lNLDJCQUFWO0FBQ0gsR0FwckJhOztBQXNyQmQ7QUFDSjtBQUNBO0FBQ0lGLEVBQUFBLGtDQXpyQmMsOENBeXJCcUJELFlBenJCckIsRUF5ckJtQztBQUM3QyxRQUFNSSxnQkFBZ0IsR0FBRyxDQUFDLGdCQUFELEVBQW1CLHNCQUFuQixFQUEyQyw2QkFBM0MsQ0FBekI7QUFFQUEsSUFBQUEsZ0JBQWdCLENBQUNDLE9BQWpCLENBQXlCLFVBQUFDLFNBQVMsRUFBSTtBQUNsQyxVQUFNL0UsWUFBWSxHQUFHeEgsQ0FBQyxZQUFLdU0sU0FBTCxFQUFELENBQW1CbEosR0FBbkIsRUFBckI7QUFDQSxVQUFNbUosV0FBVyxHQUFHeE0sQ0FBQyxZQUFLdU0sU0FBTCxlQUFELENBQTRCcEUsSUFBNUIsQ0FBaUMsT0FBakMsRUFBMEMrQyxJQUExQyxFQUFwQixDQUZrQyxDQUlsQzs7QUFDQWxMLE1BQUFBLENBQUMsWUFBS3VNLFNBQUwsZUFBRCxDQUE0QkUsTUFBNUIsR0FMa0MsQ0FPbEM7O0FBQ0EsVUFBTUMsV0FBVyxHQUFHLEVBQXBCO0FBQ0FBLE1BQUFBLFdBQVcsQ0FBQ0gsU0FBRCxDQUFYLEdBQXlCL0UsWUFBekI7QUFDQWtGLE1BQUFBLFdBQVcsV0FBSUgsU0FBSixnQkFBWCxHQUF3Q0MsV0FBeEMsQ0FWa0MsQ0FZbEM7O0FBQ0FqQixNQUFBQSxpQkFBaUIsQ0FBQ0MsSUFBbEIsQ0FBdUJlLFNBQXZCLEVBQWtDO0FBQzlCdkwsUUFBQUEsSUFBSSxFQUFFLFNBRHdCO0FBRTlCeUssUUFBQUEsaUJBQWlCLEVBQUUsQ0FBQ1EsWUFBRCxDQUZXO0FBRzlCUCxRQUFBQSxZQUFZLEVBQUUsSUFIZ0I7QUFJOUJuRCxRQUFBQSxJQUFJLEVBQUVtRTtBQUp3QixPQUFsQztBQU1ILEtBbkJEO0FBb0JILEdBaHRCYTs7QUFrdEJkO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXBCLEVBQUFBLHdCQXZ0QmMsb0NBdXRCV04sUUF2dEJYLEVBdXRCcUI7QUFDL0IsUUFBSSxDQUFDckwsU0FBUyxDQUFDTSxXQUFWLENBQXNCdUUsTUFBM0IsRUFBbUM7QUFDL0I7QUFDSCxLQUg4QixDQUsvQjs7O0FBQ0F4RSxJQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCaUssSUFBaEI7QUFDQWpLLElBQUFBLENBQUMsQ0FBQyxxQkFBRCxDQUFELENBQXlCaUssSUFBekIsR0FQK0IsQ0FTL0I7O0FBQ0EsUUFBTTBDLGNBQWMsR0FBRyxDQUFDM0IsUUFBUSxDQUFDNEIsRUFBVixJQUFnQjVCLFFBQVEsQ0FBQzRCLEVBQVQsS0FBZ0IsRUFBdkQ7QUFFQSxRQUFNQyxNQUFNLEdBQUdDLGNBQWMsQ0FBQ3RCLElBQWYsQ0FBb0I3TCxTQUFTLENBQUNNLFdBQTlCLEVBQTJDO0FBQ3REOE0sTUFBQUEsVUFBVSxFQUFFRCxjQUFjLENBQUNFLFVBQWYsQ0FBMEJDLElBRGdCO0FBQ1Q7QUFDN0NDLE1BQUFBLGNBQWMsRUFBRSxJQUZzQztBQUV4QjtBQUM5QkMsTUFBQUEsa0JBQWtCLEVBQUUsSUFIa0M7QUFHeEI7QUFDOUJDLE1BQUFBLGVBQWUsRUFBRSxJQUpxQztBQUl4QjtBQUM5QkMsTUFBQUEsZUFBZSxFQUFFLElBTHFDO0FBS3hCO0FBQzlCQyxNQUFBQSxZQUFZLEVBQUUsSUFOd0M7QUFNeEI7QUFDOUJDLE1BQUFBLGVBQWUsRUFBRSxJQVBxQztBQU94QjtBQUM5QkMsTUFBQUEsV0FBVyxFQUFFLElBUnlDO0FBUW5DO0FBQ25CQyxNQUFBQSxRQUFRLEVBQUUsRUFUNEM7QUFTeEI7QUFDOUJDLE1BQUFBLGNBQWMsRUFBRSxFQVZzQztBQVV4QjtBQUM5QkMsTUFBQUEsVUFBVSxFQUFFLG9CQUFDQyxRQUFELEVBQWM7QUFDdEI7QUFDQXhFLFFBQUFBLElBQUksQ0FBQ3lFLFdBQUw7QUFDSCxPQWRxRDtBQWV0REMsTUFBQUEsVUFBVSxFQUFFLG9CQUFDQyxPQUFELEVBQVVDLEtBQVYsRUFBaUI3RSxRQUFqQixFQUE4QixDQUN0QztBQUNBO0FBQ0g7QUFsQnFELEtBQTNDLENBQWYsQ0FaK0IsQ0FpQy9COztBQUNBeEosSUFBQUEsU0FBUyxDQUFDYSxjQUFWLEdBQTJCcU0sTUFBM0IsQ0FsQytCLENBb0MvQjs7QUFDQSxRQUFJRixjQUFjLElBQUloTixTQUFTLENBQUNNLFdBQVYsQ0FBc0JvRCxHQUF0QixPQUFnQyxFQUF0RCxFQUEwRDtBQUN0RHFDLE1BQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2IsWUFBTXVDLFlBQVksR0FBR3RJLFNBQVMsQ0FBQ00sV0FBVixDQUFzQmlJLE9BQXRCLENBQThCLFdBQTlCLEVBQTJDQyxJQUEzQyxDQUFnRCwwQkFBaEQsQ0FBckI7O0FBQ0EsWUFBSUYsWUFBWSxDQUFDekQsTUFBYixHQUFzQixDQUExQixFQUE2QjtBQUN6QnlELFVBQUFBLFlBQVksQ0FBQ04sT0FBYixDQUFxQixPQUFyQjtBQUNIO0FBQ0osT0FMUyxFQUtQLEdBTE8sQ0FBVjtBQU1IO0FBQ0osR0Fwd0JhOztBQXF3QmQ7QUFDSjtBQUNBO0FBQ0l3RSxFQUFBQSwwQkF4d0JjLHdDQXd3QmU7QUFDckIsUUFBTThCLFNBQVMsR0FBR2pPLENBQUMsQ0FBQyx3QkFBRCxDQUFuQjtBQUNBLFFBQUlpTyxTQUFTLENBQUN6SixNQUFWLEtBQXFCLENBQXpCLEVBQTRCLE9BRlAsQ0FJckI7O0FBQ0F5SixJQUFBQSxTQUFTLENBQUNuSixRQUFWLENBQW1CO0FBQ2ZvSixNQUFBQSxRQUFRLEVBQUU7QUFBQSxlQUFNOUUsSUFBSSxDQUFDeUUsV0FBTCxFQUFOO0FBQUE7QUFESyxLQUFuQjtBQUdOLEdBaHhCWTs7QUFreEJkO0FBQ0o7QUFDQTtBQUNJekIsRUFBQUEsMkJBcnhCYyx5Q0FxeEJnQjtBQUMxQixRQUFNNkIsU0FBUyxHQUFHak8sQ0FBQyxDQUFDLHlCQUFELENBQW5CO0FBQ0EsUUFBSWlPLFNBQVMsQ0FBQ3pKLE1BQVYsS0FBcUIsQ0FBekIsRUFBNEIsT0FGRixDQUkxQjs7QUFDQXlKLElBQUFBLFNBQVMsQ0FBQ25KLFFBQVYsQ0FBbUI7QUFDZm9KLE1BQUFBLFFBQVEsRUFBRTtBQUFBLGVBQU05RSxJQUFJLENBQUN5RSxXQUFMLEVBQU47QUFBQTtBQURLLEtBQW5CO0FBR0gsR0E3eEJhOztBQSt4QmQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJdkssRUFBQUEsZ0JBcHlCYyw0QkFveUJHNkssWUFweUJILEVBb3lCaUJDLGVBcHlCakIsRUFveUJrQztBQUM1QyxRQUFJQyxVQUFKOztBQUVBLFFBQUlGLFlBQVksSUFBSUEsWUFBWSxDQUFDRyxJQUFiLE9BQXdCLEVBQTVDLEVBQWdEO0FBQzVDO0FBQ0FELE1BQUFBLFVBQVUsR0FBRyx1Q0FBdUNGLFlBQXBELENBRjRDLENBSTVDOztBQUNBLFVBQUlDLGVBQWUsSUFBSUEsZUFBZSxDQUFDRSxJQUFoQixPQUEyQixFQUFsRCxFQUFzRDtBQUNsREQsUUFBQUEsVUFBVSxJQUFJLFVBQVVELGVBQVYsR0FBNEIsTUFBMUM7QUFDSDtBQUNKLEtBUkQsTUFRTztBQUNIO0FBQ0FDLE1BQUFBLFVBQVUsR0FBR25OLGVBQWUsQ0FBQ3FOLHFCQUFoQixJQUF5QyxjQUF0RDtBQUNILEtBZDJDLENBZ0I1Qzs7O0FBQ0F2TyxJQUFBQSxDQUFDLENBQUMsYUFBRCxDQUFELENBQWlCd08sSUFBakIsQ0FBc0JILFVBQXRCO0FBQ0g7QUF0ekJhLENBQWxCO0FBMHpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBck8sQ0FBQyxDQUFDeU8sRUFBRixDQUFLekssSUFBTCxDQUFVcUUsUUFBVixDQUFtQnRILEtBQW5CLENBQXlCMk4sYUFBekIsR0FBeUMsWUFBTTtBQUMzQztBQUNBLE1BQU1DLGFBQWEsR0FBR2hQLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQnVELElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLGdCQUFyQyxDQUF0QjtBQUNBLE1BQU00SyxhQUFhLEdBQUdqUCxTQUFTLENBQUNjLFFBQVYsQ0FBbUJ1RCxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxnQkFBckMsQ0FBdEIsQ0FIMkMsQ0FLM0M7O0FBQ0EsTUFBSTRLLGFBQWEsQ0FBQ3BLLE1BQWQsR0FBdUIsQ0FBdkIsS0FFSW1LLGFBQWEsS0FBSyxDQUFsQixJQUVBQSxhQUFhLEtBQUssRUFKdEIsQ0FBSixFQUtPO0FBQ0gsV0FBTyxLQUFQO0FBQ0gsR0FiMEMsQ0FlM0M7OztBQUNBLFNBQU8sSUFBUDtBQUNILENBakJEO0FBbUJBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQTNPLENBQUMsQ0FBQ3lPLEVBQUYsQ0FBS3pLLElBQUwsQ0FBVXFFLFFBQVYsQ0FBbUJ0SCxLQUFuQixDQUF5QjhOLFNBQXpCLEdBQXFDLFVBQUNDLEtBQUQsRUFBUUMsU0FBUjtBQUFBLFNBQXNCL08sQ0FBQyxZQUFLK08sU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDOztBQUdBaFAsQ0FBQyxDQUFDeU8sRUFBRixDQUFLekssSUFBTCxDQUFVcUUsUUFBVixDQUFtQnRILEtBQW5CLENBQXlCa08sZ0JBQXpCLEdBQTRDLFlBQU07QUFDOUM7QUFDQSxNQUFJdFAsU0FBUyxDQUFDYSxjQUFkLEVBQThCO0FBQzFCLFFBQU0wTyxLQUFLLEdBQUdwQyxjQUFjLENBQUNxQyxRQUFmLENBQXdCeFAsU0FBUyxDQUFDYSxjQUFsQyxDQUFkO0FBQ0EsV0FBTzBPLEtBQUssSUFBSUEsS0FBSyxDQUFDbEIsS0FBTixJQUFlLEVBQS9CLENBRjBCLENBRVM7QUFDdEM7O0FBQ0QsU0FBTyxJQUFQLENBTjhDLENBTWpDO0FBQ2hCLENBUEQ7QUFTQTtBQUNBO0FBQ0E7OztBQUNBaE8sQ0FBQyxDQUFDb1AsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjFQLEVBQUFBLFNBQVMsQ0FBQytDLFVBQVY7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRW1wbG95ZWVzQVBJLCBGb3JtLFxuIElucHV0TWFza1BhdHRlcm5zLCBhdmF0YXIsIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IsIENsaXBib2FyZEpTLCBQYXNzd29yZFdpZGdldCwgVXNlck1lc3NhZ2UgKi9cblxuXG4vKipcbiAqIFRoZSBleHRlbnNpb24gb2JqZWN0LlxuICogTWFuYWdlcyB0aGUgb3BlcmF0aW9ucyBhbmQgYmVoYXZpb3JzIG9mIHRoZSBleHRlbnNpb24gZWRpdCBmb3JtXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25cbiAqL1xuY29uc3QgZXh0ZW5zaW9uID0ge1xuICAgIGRlZmF1bHRFbWFpbDogJycsXG4gICAgZGVmYXVsdE51bWJlcjogJycsXG4gICAgZGVmYXVsdE1vYmlsZU51bWJlcjogJycsXG4gICAgJG51bWJlcjogJCgnI251bWJlcicpLFxuICAgICRzaXBfc2VjcmV0OiAkKCcjc2lwX3NlY3JldCcpLFxuICAgICRtb2JpbGVfbnVtYmVyOiAkKCcjbW9iaWxlX251bWJlcicpLFxuICAgICRmd2RfZm9yd2FyZGluZzogJCgnI2Z3ZF9mb3J3YXJkaW5nJyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb25idXN5OiAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKSxcbiAgICAkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiAkKCcjZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyksXG4gICAgJGVtYWlsOiAkKCcjdXNlcl9lbWFpbCcpLFxuICAgICR1c2VyX3VzZXJuYW1lOiAkKCcjdXNlcl91c2VybmFtZScpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHdpZGdldCBpbnN0YW5jZS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHBhc3N3b3JkV2lkZ2V0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2V4dGVuc2lvbnMtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYnVsYXIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51SXRlbXM6ICQoJyNleHRlbnNpb25zLW1lbnUgLml0ZW0nKSxcblxuXG4gICAgLyoqXG4gICAgICogU3RyaW5nIGZvciB0aGUgZm9yd2FyZGluZyBzZWxlY3QuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBmb3J3YXJkaW5nU2VsZWN0OiAnI2V4dGVuc2lvbnMtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG51bWJlcjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ251bWJlcicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIG1vYmlsZV9udW1iZXI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ21vYmlsZV9udW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXNrJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbW9iaWxlLW51bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX2VtYWlsOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUVtYWlsRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHVzZXJfdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNpcF9zZWNyZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzaXBfc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRXZWFrLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncGFzc3dvcmRTdHJlbmd0aCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlUGFzc3dvcmRUb29XZWFrIHx8ICdQYXNzd29yZCBpcyB0b28gd2VhayBmb3Igc2VjdXJpdHkgcmVxdWlyZW1lbnRzJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9yaW5nbGVuZ3RoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuICAgICAgICAgICAgZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb24gZm9ybSBhbmQgaXRzIGludGVyYWN0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBEZWZhdWx0IHZhbHVlcyB3aWxsIGJlIHNldCBhZnRlciBSRVNUIEFQSSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggZW1wdHkgdmFsdWVzIHNpbmNlIGZvcm1zIGFyZSBlbXB0eSB1bnRpbCBBUEkgcmVzcG9uZHNcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9ICcnO1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE51bWJlciA9ICcnO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFiIG1lbnUgaXRlbXMsIGFjY29yZGlvbnMsIGFuZCBkcm9wZG93biBtZW51c1xuICAgICAgICBleHRlbnNpb24uJHRhYk1lbnVJdGVtcy50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIC51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBmb3IgcXVlc3Rpb24gaWNvbnMgYW5kIGJ1dHRvbnNcbiAgICAgICAgJChcImkucXVlc3Rpb25cIikucG9wdXAoKTtcbiAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIGV4dGVuc2lvbi4kc2lwX3NlY3JldC5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gZm9ybVxuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgaGFuZGxlciBmb3IgdXNlcm5hbWUgY2hhbmdlIHRvIHVwZGF0ZSBwYWdlIHRpdGxlXG4gICAgICAgIGV4dGVuc2lvbi4kdXNlcl91c2VybmFtZS5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2sgPyBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKSA6IGV4dGVuc2lvbi4kbnVtYmVyLnZhbCgpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLnVwZGF0ZVBhZ2VIZWFkZXIoJCh0aGlzKS52YWwoKSwgY3VycmVudE51bWJlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFsc28gdXBkYXRlIGhlYWRlciB3aGVuIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlc1xuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRVc2VybmFtZSA9IGV4dGVuc2lvbi4kdXNlcl91c2VybmFtZS52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnROdW1iZXIgPSAkKHRoaXMpLmlucHV0bWFzayA/ICQodGhpcykuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykgOiAkKHRoaXMpLnZhbCgpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLnVwZGF0ZVBhZ2VIZWFkZXIoY3VycmVudFVzZXJuYW1lLCBjdXJyZW50TnVtYmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgYWR2YW5jZWQgc2V0dGluZ3MgdXNpbmcgdW5pZmllZCBzeXN0ZW1cbiAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBvbGQgbmFtZSBpZiBuZXcgY2xhc3Mgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9hZCBleHRlbnNpb24gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgZXh0ZW5zaW9uLmxvYWRFeHRlbnNpb25EYXRhKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBtb2JpbGUgbnVtYmVyIGZyb20gY2xpcGJvYXJkXG4gICAgICovXG4gICAgY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgYWZ0ZXIgYSBwaG9uZSBudW1iZXIgaGFzIGJlZW4gZW50ZXJlZCBjb21wbGV0ZWx5LlxuICAgICAqIEl0IHNlcnZlcyB0byBjaGVjayBpZiB0aGVyZSBhcmUgYW55IGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIHBob25lIG51bWJlcnMuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgYWZ0ZXIgcmVtb3ZpbmcgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBDYWxsIHRoZSBgY2hlY2tBdmFpbGFiaWxpdHlgIGZ1bmN0aW9uIG9uIGBFeHRlbnNpb25zYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgaXMgYWxyZWFkeSBpbiB1c2UuXG4gICAgICAgIC8vIFBhcmFtZXRlcnM6IGRlZmF1bHQgbnVtYmVyLCBuZXcgbnVtYmVyLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKG51bWJlciksIHVzZXIgaWRcbiAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE51bWJlciwgbmV3TnVtYmVyLCAnbnVtYmVyJywgdXNlcklkKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIG9uY2UgYW4gZW1haWwgYWRkcmVzcyBoYXMgYmVlbiBjb21wbGV0ZWx5IGVudGVyZWQuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGFmdGVyIHJlbW92aW5nIGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld0VtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGBjaGVja0F2YWlsYWJpbGl0eWAgZnVuY3Rpb24gb24gYFVzZXJzQVBJYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBlbWFpbCBpcyBhbHJlYWR5IGluIHVzZS5cbiAgICAgICAgLy8gUGFyYW1ldGVyczogZGVmYXVsdCBlbWFpbCwgbmV3IGVtYWlsLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKGVtYWlsKSwgdXNlciBpZFxuICAgICAgICBVc2Vyc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdEVtYWlsLCBuZXdFbWFpbCwnZW1haWwnLCB1c2VySWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBY3RpdmF0ZWQgd2hlbiBlbnRlcmluZyBhIG1vYmlsZSBwaG9uZSBudW1iZXIgaW4gdGhlIGVtcGxveWVlJ3MgcHJvZmlsZS5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgd2l0aG91dCBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gR2V0IHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBEeW5hbWljIGNoZWNrIHRvIHNlZSBpZiB0aGUgc2VsZWN0ZWQgbW9iaWxlIG51bWJlciBpcyBhdmFpbGFibGVcbiAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cbiAgICAgICAgLy8gUmVmaWxsIHRoZSBtb2JpbGUgZGlhbHN0cmluZyBpZiB0aGUgbmV3IG1vYmlsZSBudW1iZXIgaXMgZGlmZmVyZW50IHRoYW4gdGhlIGRlZmF1bHQgb3IgaWYgdGhlIG1vYmlsZSBkaWFsc3RyaW5nIGlzIGVtcHR5XG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyXG4gICAgICAgICAgICB8fCAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycpLmxlbmd0aCA9PT0gMClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2JpbGUgbnVtYmVyIGhhcyBjaGFuZ2VkXG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyB1c2VybmFtZSBmcm9tIHRoZSBmb3JtXG4gICAgICAgICAgICBjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9yd2FyZGluZyBmaWVsZHMgdGhhdCBtYXRjaCB0aGUgb2xkIG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEZ3ZE9uQnVzeSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZ3ZF9mb3J3YXJkaW5nIGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkRm9yd2FyZGluZyA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgcmluZyBsZW5ndGggaWYgZW1wdHlcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICAgICAgICAgICB8fCBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk9PT1cIjBcIikge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgNDUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVzZSBTZW1hbnRpYyBVSSBBUEkgZGlyZWN0bHkgb24gZHJvcGRvd24gZWxlbWVudFxuICAgICAgICAgICAgICAgIGNvbnN0ICRmd2REcm9wZG93biA9ICQoYCNmd2RfZm9yd2FyZGluZy1kcm9wZG93bmApO1xuICAgICAgICAgICAgICAgICRmd2REcm9wZG93bi5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKTtcbiAgICAgICAgICAgICAgICAkZndkRHJvcGRvd24uZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmd2RfZm9yd2FyZGluZ29uYnVzeSBpZiBpdCBtYXRjaGVzIG9sZCBtb2JpbGUgbnVtYmVyIChpbmNsdWRpbmcgZW1wdHkpXG4gICAgICAgICAgICBpZiAoY3VycmVudEZ3ZE9uQnVzeSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVc2UgU2VtYW50aWMgVUkgQVBJIGRpcmVjdGx5IG9uIGRyb3Bkb3duIGVsZW1lbnRcbiAgICAgICAgICAgICAgICBjb25zdCAkZndkT25CdXN5RHJvcGRvd24gPSAkKGAjZndkX2ZvcndhcmRpbmdvbmJ1c3ktZHJvcGRvd25gKTtcbiAgICAgICAgICAgICAgICAkZndkT25CdXN5RHJvcGRvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YCk7XG4gICAgICAgICAgICAgICAgJGZ3ZE9uQnVzeURyb3Bkb3duLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVc2UgU2VtYW50aWMgVUkgQVBJIGRpcmVjdGx5IG9uIGRyb3Bkb3duIGVsZW1lbnRcbiAgICAgICAgICAgICAgICBjb25zdCAkZndkT25VbmF2YWlsYWJsZURyb3Bkb3duID0gJChgI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZS1kcm9wZG93bmApO1xuICAgICAgICAgICAgICAgICRmd2RPblVuYXZhaWxhYmxlRHJvcGRvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YCk7XG4gICAgICAgICAgICAgICAgJGZ3ZE9uVW5hdmFpbGFibGVEcm9wZG93bi5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IHRoZSBuZXcgbW9iaWxlIG51bWJlciBhcyB0aGUgZGVmYXVsdFxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IG5ld01vYmlsZU51bWJlcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdoZW4gdGhlIG1vYmlsZSBwaG9uZSBudW1iZXIgaXMgY2xlYXJlZCBpbiB0aGUgZW1wbG95ZWUgY2FyZC5cbiAgICAgKi9cbiAgICBjYk9uQ2xlYXJlZE1vYmlsZU51bWJlcigpIHtcbiAgICAgICAgLy8gQ2hlY2sgY3VycmVudCBmb3J3YXJkaW5nIHZhbHVlcyBiZWZvcmUgY2xlYXJpbmdcbiAgICAgICAgY29uc3QgY3VycmVudEZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPbkJ1c3kgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jyk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIHRoZSAnbW9iaWxlX2RpYWxzdHJpbmcnIGFuZCAnbW9iaWxlX251bWJlcicgZmllbGRzIGluIHRoZSBmb3JtXG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX251bWJlcicsICcnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGN1cnJlbnRGd2RGb3J3YXJkaW5nID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIGNsZWFyIHRoZSAnZndkX3JpbmdsZW5ndGgnIGZpZWxkIGFuZCBzZXQgJ2Z3ZF9mb3J3YXJkaW5nJyB0byAtMVxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDApO1xuICAgICAgICAgICAgLy8gVXNlIFNlbWFudGljIFVJIEFQSSBkaXJlY3RseSBvbiBkcm9wZG93biBlbGVtZW50IHdpdGggcHJvcGVyIGNsZWFyaW5nXG4gICAgICAgICAgICBjb25zdCAkZndkRHJvcGRvd24gPSAkKCcjZndkX2ZvcndhcmRpbmctZHJvcGRvd24nKTtcbiAgICAgICAgICAgICRmd2REcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICRmd2REcm9wZG93bi5kcm9wZG93bignc2V0IHRleHQnLCAnLScpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiBidXN5IHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGN1cnJlbnRGd2RPbkJ1c3kgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBVc2UgU2VtYW50aWMgVUkgQVBJIGRpcmVjdGx5IG9uIGRyb3Bkb3duIGVsZW1lbnQgd2l0aCBwcm9wZXIgY2xlYXJpbmdcbiAgICAgICAgICAgIGNvbnN0ICRmd2RPbkJ1c3lEcm9wZG93biA9ICQoJyNmd2RfZm9yd2FyZGluZ29uYnVzeS1kcm9wZG93bicpO1xuICAgICAgICAgICAgJGZ3ZE9uQnVzeURyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgJGZ3ZE9uQnVzeURyb3Bkb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJyk7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIHVuYXZhaWxhYmxlIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gVXNlIFNlbWFudGljIFVJIEFQSSBkaXJlY3RseSBvbiBkcm9wZG93biBlbGVtZW50IHdpdGggcHJvcGVyIGNsZWFyaW5nXG4gICAgICAgICAgICBjb25zdCAkZndkT25VbmF2YWlsYWJsZURyb3Bkb3duID0gJCgnI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZS1kcm9wZG93bicpO1xuICAgICAgICAgICAgJGZ3ZE9uVW5hdmFpbGFibGVEcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICRmd2RPblVuYXZhaWxhYmxlRHJvcGRvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuICAgIH0sXG5cbiAgICBpbml0aWFsaXplSW5wdXRNYXNrcygpe1xuICAgICAgICAvLyBTZXQgdXAgbnVtYmVyIGlucHV0IG1hc2sgd2l0aCBjb3JyZWN0IGxlbmd0aCBmcm9tIEFQSVxuICAgICAgICBsZXQgdGltZW91dE51bWJlcklkO1xuXG4gICAgICAgIC8vIEFsd2F5cyBpbml0aWFsaXplIG1hc2sgYmFzZWQgb24gZXh0ZW5zaW9uc19sZW5ndGggZnJvbSBBUElcbiAgICAgICAgLy8gTm8gZGVmYXVsdHMgaW4gSmF2YVNjcmlwdCAtIHZhbHVlIG11c3QgY29tZSBmcm9tIEFQSVxuICAgICAgICBpZiAoZXh0ZW5zaW9uLmV4dGVuc2lvbnNMZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbnNMZW5ndGggPSBwYXJzZUludChleHRlbnNpb24uZXh0ZW5zaW9uc0xlbmd0aCwgMTApO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbnNMZW5ndGggPj0gMiAmJiBleHRlbnNpb25zTGVuZ3RoIDw9IDEwKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBtYXNrIHdpdGggY29ycmVjdCBsZW5ndGggYW5kIG9uY29tcGxldGUgaGFuZGxlclxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzayh7XG4gICAgICAgICAgICAgICAgICAgIG1hc2s6IGA5ezIsJHtleHRlbnNpb25zTGVuZ3RofX1gLFxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogJ18nLFxuICAgICAgICAgICAgICAgICAgICBvbmNvbXBsZXRlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgcHJldmlvdXMgdGltZXIsIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWVvdXROdW1iZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0TnVtYmVySWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIHdpdGggYSBkZWxheSBvZiAwLjUgc2Vjb25kc1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dE51bWJlcklkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIub24oJ3Bhc3RlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlTnVtYmVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCB0aGUgaW5wdXQgbWFza3MgZm9yIHRoZSBtb2JpbGUgbnVtYmVyIGlucHV0XG4gICAgICAgIGNvbnN0IG1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2tzKHtcbiAgICAgICAgICAgIGlucHV0bWFzazoge1xuICAgICAgICAgICAgICAgIGRlZmluaXRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICcjJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yOiAnWzAtOV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FyZGluYWxpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbmNsZWFyZWQ6IGV4dGVuc2lvbi5jYk9uQ2xlYXJlZE1vYmlsZU51bWJlcixcbiAgICAgICAgICAgICAgICBvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyLFxuICAgICAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGV4dGVuc2lvbi5jYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUsXG4gICAgICAgICAgICAgICAgc2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtYXRjaDogL1swLTldLyxcbiAgICAgICAgICAgIHJlcGxhY2U6ICc5JyxcbiAgICAgICAgICAgIGxpc3Q6IG1hc2tMaXN0LFxuICAgICAgICAgICAgbGlzdEtleTogJ21hc2snLFxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIub24oJ3Bhc3RlJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpOyAvLyDQn9GA0LXQtNC+0YLQstGA0LDRidCw0LXQvCDRgdGC0LDQvdC00LDRgNGC0L3QvtC1INC/0L7QstC10LTQtdC90LjQtSDQstGB0YLQsNCy0LrQuFxuXG4gICAgICAgICAgICAvLyDQn9C+0LvRg9GH0LDQtdC8INCy0YHRgtCw0LLQu9C10L3QvdGL0LUg0LTQsNC90L3Ri9C1INC40Lcg0LHRg9GE0LXRgNCwINC+0LHQvNC10L3QsFxuICAgICAgICAgICAgbGV0IHBhc3RlZERhdGEgPSAnJztcbiAgICAgICAgICAgIGlmIChlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YSAmJiBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LmNsaXBib2FyZERhdGEgJiYgd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkgeyAvLyDQlNC70Y8gSUVcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyDQn9GA0L7QstC10YDRj9C10LwsINC90LDRh9C40L3QsNC10YLRgdGPINC70Lgg0LLRgdGC0LDQstC70LXQvdC90YvQuSDRgtC10LrRgdGCINGBICcrJ1xuICAgICAgICAgICAgaWYgKHBhc3RlZERhdGEuY2hhckF0KDApID09PSAnKycpIHtcbiAgICAgICAgICAgICAgICAvLyDQodC+0YXRgNCw0L3Rj9C10LwgJysnINC4INGD0LTQsNC70Y/QtdC8INC+0YHRgtCw0LvRjNC90YvQtSDQvdC10LbQtdC70LDRgtC10LvRjNC90YvQtSDRgdC40LzQstC+0LvRi1xuICAgICAgICAgICAgICAgIHZhciBwcm9jZXNzZWREYXRhID0gJysnICsgcGFzdGVkRGF0YS5zbGljZSgxKS5yZXBsYWNlKC9cXEQvZywgJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyDQo9C00LDQu9GP0LXQvCDQstGB0LUg0YHQuNC80LLQvtC70YssINC60YDQvtC80LUg0YbQuNGE0YBcbiAgICAgICAgICAgICAgICB2YXIgcHJvY2Vzc2VkRGF0YSA9IHBhc3RlZERhdGEucmVwbGFjZSgvXFxEL2csICcnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8g0JLRgdGC0LDQstC70Y/QtdC8INC+0YfQuNGJ0LXQvdC90YvQtSDQtNCw0L3QvdGL0LUg0LIg0L/QvtC70LUg0LLQstC+0LTQsFxuICAgICAgICAgICAgY29uc3QgaW5wdXQgPSB0aGlzO1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBpbnB1dC5zZWxlY3Rpb25TdGFydDtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IGlucHV0LnNlbGVjdGlvbkVuZDtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICQoaW5wdXQpLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBjdXJyZW50VmFsdWUuc3Vic3RyaW5nKDAsIHN0YXJ0KSArIHByb2Nlc3NlZERhdGEgKyBjdXJyZW50VmFsdWUuc3Vic3RyaW5nKGVuZCk7XG4gICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKFwicmVtb3ZlXCIpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLnZhbChuZXdWYWx1ZSk7XG4gICAgICAgICAgICAvLyDQotGA0LjQs9Cz0LXRgNC40Lwg0YHQvtCx0YvRgtC40LUgJ2lucHV0JyDQtNC70Y8g0L/RgNC40LzQtdC90LXQvdC40Y8g0LzQsNGB0LrQuCDQstCy0L7QtNCwXG4gICAgICAgICAgICAkKGlucHV0KS50cmlnZ2VyKCdpbnB1dCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2sgZm9yIHRoZSBlbWFpbCBpbnB1dFxuICAgICAgICBsZXQgdGltZW91dEVtYWlsSWQ7XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcsIHtcbiAgICAgICAgICAgIG9uY29tcGxldGU6ICgpPT57XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodGltZW91dEVtYWlsSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRFbWFpbElkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIHdpdGggYSBkZWxheSBvZiAwLjUgc2Vjb25kc1xuICAgICAgICAgICAgICAgIHRpbWVvdXRFbWFpbElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVFbWFpbCgpO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbC5vbigncGFzdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVFbWFpbCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL0F0dGFjaCBhIGZvY3Vzb3V0IGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBtb2JpbGUgbnVtYmVyIGlucHV0XG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5mb2N1c291dChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgbGV0IHBob25lID0gJChlLnRhcmdldCkudmFsKCkucmVwbGFjZSgvW14wLTldL2csIFwiXCIpO1xuICAgICAgICAgICAgaWYgKHBob25lID09PSAnJykge1xuICAgICAgICAgICAgICAgICQoZS50YXJnZXQpLnZhbCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBuZXcgU0lQIHBhc3N3b3JkLlxuICAgICAqIFVzZXMgdGhlIFBhc3N3b3JkV2lkZ2V0IGJ1dHRvbiBsaWtlIGluIEFNSSBtYW5hZ2VyLlxuICAgICAqL1xuICAgIGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSB7XG4gICAgICAgIC8vIFRyaWdnZXIgcGFzc3dvcmQgZ2VuZXJhdGlvbiB0aHJvdWdoIHRoZSB3aWRnZXQgYnV0dG9uIChsaWtlIGluIEFNSSlcbiAgICAgICAgY29uc3QgJGdlbmVyYXRlQnRuID0gZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LmNsb3Nlc3QoJy51aS5pbnB1dCcpLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICBpZiAoJGdlbmVyYXRlQnRuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRnZW5lcmF0ZUJ0bi50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhLm1vYmlsZV9udW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIGZvcm0gY29udHJvbCBmaWVsZHMgdGhhdCBzaG91bGRuJ3QgYmUgc2VudCB0byBzZXJ2ZXJcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLmRpcnJ0eTtcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLnN1Ym1pdE1vZGU7XG4gICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YS51c2VyX2lkOyAvLyBSZW1vdmUgdXNlcl9pZCBmaWVsZCB0byBwcmV2ZW50IHZhbGlkYXRpb24gaXNzdWVzXG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgcmVjb3JkIChjaGVjayBpZiB3ZSBoYXZlIGEgcmVhbCBJRClcbiAgICAgICAgY29uc3QgY3VycmVudElkID0gZXh0ZW5zaW9uLmdldFJlY29yZElkKCk7XG4gICAgICAgIGlmICghY3VycmVudElkIHx8IGN1cnJlbnRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgIC8vIE5ldyBleHRlbnNpb24gLSBhZGQgX2lzTmV3IGZsYWcgZm9yIHByb3BlciBQT1NUL1BVVCBtZXRob2Qgc2VsZWN0aW9uXG4gICAgICAgICAgICByZXN1bHQuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBTdG9yZSB0aGUgY3VycmVudCBleHRlbnNpb24gbnVtYmVyIGFzIHRoZSBkZWZhdWx0IG51bWJlciBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLm51bWJlcikge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gcmVzcG9uc2UuZGF0YS5udW1iZXI7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBwaG9uZSByZXByZXNlbnRhdGlvbiB3aXRoIHRoZSBuZXcgZGVmYXVsdCBudW1iZXJcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLnVwZGF0ZVBob25lUmVwcmVzZW50KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGUgYW5kIHJlc3BvbnNlLnJlbG9hZCBmcm9tIHNlcnZlclxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5ncyBmb3IgUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBleHRlbnNpb24uJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGV4dGVuc2lvbi52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBleHRlbnNpb24uY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBleHRlbnNpb24uY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gRW1wbG95ZWVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgYXV0b21hdGljIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvblxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgY2hlY2tib3ggdmFsdWVzIGFyZSBzZW50IGFzIHRydWUvZmFsc2UgaW5zdGVhZCBvZiBcIm9uXCIvdW5kZWZpbmVkXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBWNS4wIEFyY2hpdGVjdHVyZTogTG9hZCBleHRlbnNpb24gZGF0YSB2aWEgUkVTVCBBUEkgKHNpbWlsYXIgdG8gSVZSIG1lbnUgcGF0dGVybilcbiAgICAgKi9cbiAgICBsb2FkRXh0ZW5zaW9uRGF0YSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBleHRlbnNpb24uZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSAnbmV3JyBhcyBJRCBmb3IgbmV3IHJlY29yZHMgdG8gZ2V0IGRlZmF1bHQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGNvbnN0IGFwaUlkID0gcmVjb3JkSWQgPT09ICcnID8gJ25ldycgOiByZWNvcmRJZDtcbiAgICAgICAgXG4gICAgICAgIC8vIEhpZGUgbW9uaXRvcmluZyBlbGVtZW50cyBmb3IgbmV3IGVtcGxveWVlc1xuICAgICAgICBpZiAoYXBpSWQgPT09ICduZXcnKSB7XG4gICAgICAgICAgICAkKCcjc3RhdHVzJykuaGlkZSgpOyAvLyBIaWRlIHN0YXR1cyBsYWJlbFxuICAgICAgICAgICAgJCgnYVtkYXRhLXRhYj1cInN0YXR1c1wiXScpLmhpZGUoKTsgLy8gSGlkZSBtb25pdG9yaW5nIHRhYlxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBFbXBsb3llZXNBUEkuZ2V0UmVjb3JkKGFwaUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24ucG9wdWxhdGVGb3JtV2l0aERhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgZGVmYXVsdCB2YWx1ZXMgYWZ0ZXIgZGF0YSBsb2FkXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSByZXNwb25zZS5kYXRhLm51bWJlciB8fCAnJztcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gcmVzcG9uc2UuZGF0YS51c2VyX2VtYWlsIHx8ICcnO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gcmVzcG9uc2UuZGF0YS5tb2JpbGVfbnVtYmVyIHx8ICcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIHN0aWxsIGluaXRpYWxpemUgYXZhdGFyIGV2ZW4gaWYgQVBJIGZhaWxzXG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBleHRlbnNpb24gZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkwgKGxpa2UgSVZSIG1lbnUpXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBSRVNUIEFQSSAoVjUuMCBjbGVhbiBkYXRhIGFyY2hpdGVjdHVyZSlcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1XaXRoRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIFN0b3JlIGV4dGVuc2lvbnNfbGVuZ3RoIGZyb20gQVBJIGZvciB1c2UgaW4gaW5pdGlhbGl6ZUlucHV0TWFza3NcbiAgICAgICAgLy8gVGhpcyB2YWx1ZSBNVVNUIGNvbWUgZnJvbSBBUEkgLSBubyBkZWZhdWx0cyBpbiBKU1xuICAgICAgICBleHRlbnNpb24uZXh0ZW5zaW9uc0xlbmd0aCA9IGRhdGEuZXh0ZW5zaW9uc19sZW5ndGg7XG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggKHNhbWUgYXMgSVZSIG1lbnUpXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBWNS4wIHNwZWNpYWxpemVkIGNsYXNzZXMgLSBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIGFueSBVSSBlbGVtZW50cyBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBpZiAoZm9ybURhdGEubnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb24tbnVtYmVyLWRpc3BsYXknKS50ZXh0KGZvcm1EYXRhLm51bWJlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgYXZhdGFyIGNvbXBvbmVudCBhZnRlciBmb3JtIHBvcHVsYXRpb25cbiAgICAgICAgICAgICAgICBhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBhdmF0YXIgVVJMIGR5bmFtaWNhbGx5IGZyb20gQVBJIGRhdGFcbiAgICAgICAgICAgICAgICBhdmF0YXIuc2V0QXZhdGFyVXJsKGZvcm1EYXRhLnVzZXJfYXZhdGFyKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBtb2RpZnkgc3RhdHVzIG1vbml0b3IgYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIGVtcGxveWVlIG5hbWUgYW5kIGV4dGVuc2lvbiBudW1iZXJcbiAgICAgICAgICAgICAgICBleHRlbnNpb24udXBkYXRlUGFnZUhlYWRlcihmb3JtRGF0YS51c2VyX3VzZXJuYW1lLCBmb3JtRGF0YS5udW1iZXIpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0KGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgaW5wdXQgbWFza3MgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUlucHV0TWFza3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBOT1RFOiBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCkgd2lsbCBiZSBjYWxsZWQgYXV0b21hdGljYWxseSBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KClcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggY2xlYW4gZGF0YSAtIFY1LjAgQXJjaGl0ZWN0dXJlXG4gICAgICogVXNlcyBzcGVjaWFsaXplZCBjbGFzc2VzIHdpdGggY29tcGxldGUgYXV0b21hdGlvbiAobm8gb25DaGFuZ2UgY2FsbGJhY2tzIG5lZWRlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEV4dGVuc2lvbiBkcm9wZG93bnMgd2l0aCBjdXJyZW50IGV4dGVuc2lvbiBleGNsdXNpb24gLSBWNS4wIHNwZWNpYWxpemVkIGNsYXNzXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2Z3ZF9mb3J3YXJkaW5nJywge1xuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtkYXRhLm51bWJlcl0sXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsIFxuICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtkYXRhLm51bWJlcl0sXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywge1xuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtkYXRhLm51bWJlcl0sXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gTmV0d29yayBmaWx0ZXIgZHJvcGRvd24gd2l0aCBBUEkgZGF0YSAtIFY1LjAgYmFzZSBjbGFzc1xuICAgICAgICBcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdzaXBfbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICAgICAgICAgICAgYXBpVXJsOiBgL3BieGNvcmUvYXBpL3YzL25ldHdvcmstZmlsdGVyczpnZXRGb3JTZWxlY3Q/Y2F0ZWdvcmllc1tdPVNJUGAsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlbGVjdE5ldHdvcmtGaWx0ZXIgfHwgJ1NlbGVjdCBOZXR3b3JrIEZpbHRlcicsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBWNS4wIGFyY2hpdGVjdHVyZSB3aXRoIGVtcHR5IGZvcm0gc2hvdWxkIG5vdCBoYXZlIEhUTUwgZW50aXRpZXMgaXNzdWVzXG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzIC0gcmVidWlsZCBkcm9wZG93bnMgd2l0aCBuZXcgZXhjbHVzaW9uXG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9mZignY2hhbmdlLmRyb3Bkb3duJykub24oJ2NoYW5nZS5kcm9wZG93bicsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5ld0V4dGVuc2lvbiA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbnVtYmVyJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChuZXdFeHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXhjbHVzaW9ucyBmb3IgZm9yd2FyZGluZyBkcm9wZG93bnNcbiAgICAgICAgICAgICAgICBleHRlbnNpb24udXBkYXRlRm9yd2FyZGluZ0Ryb3Bkb3duc0V4Y2x1c2lvbihuZXdFeHRlbnNpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24oKTtcbiAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGZvcndhcmRpbmcgZHJvcGRvd25zIHdoZW4gZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzXG4gICAgICovXG4gICAgdXBkYXRlRm9yd2FyZGluZ0Ryb3Bkb3duc0V4Y2x1c2lvbihuZXdFeHRlbnNpb24pIHtcbiAgICAgICAgY29uc3QgZm9yd2FyZGluZ0ZpZWxkcyA9IFsnZndkX2ZvcndhcmRpbmcnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJ107XG4gICAgICAgIFxuICAgICAgICBmb3J3YXJkaW5nRmllbGRzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICQoYCMke2ZpZWxkTmFtZX1gKS52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApLmZpbmQoJy50ZXh0JykudGV4dCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgb2xkIGRyb3Bkb3duXG4gICAgICAgICAgICAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCkucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSBuZXcgZGF0YSBvYmplY3Qgd2l0aCBjdXJyZW50IHZhbHVlIGZvciByZWluaXRpYWxpemluZ1xuICAgICAgICAgICAgY29uc3QgcmVmcmVzaERhdGEgPSB7fTtcbiAgICAgICAgICAgIHJlZnJlc2hEYXRhW2ZpZWxkTmFtZV0gPSBjdXJyZW50VmFsdWU7XG4gICAgICAgICAgICByZWZyZXNoRGF0YVtgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGBdID0gY3VycmVudFRleHQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlaW5pdGlhbGl6ZSB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoZmllbGROYW1lLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbbmV3RXh0ZW5zaW9uXSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogcmVmcmVzaERhdGFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0IGFmdGVyIGZvcm0gZGF0YSBpcyBsb2FkZWRcbiAgICAgKiBUaGlzIGVuc3VyZXMgdmFsaWRhdGlvbiBvbmx5IGhhcHBlbnMgYWZ0ZXIgcGFzc3dvcmQgaXMgcG9wdWxhdGVkIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZm9ybURhdGEgLSBUaGUgZm9ybSBkYXRhIGxvYWRlZCBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0KGZvcm1EYXRhKSB7XG4gICAgICAgIGlmICghZXh0ZW5zaW9uLiRzaXBfc2VjcmV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIaWRlIGFueSBsZWdhY3kgYnV0dG9ucyBpZiB0aGV5IGV4aXN0XG4gICAgICAgICQoJy5jbGlwYm9hcmQnKS5oaWRlKCk7XG4gICAgICAgICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKS5oaWRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyBleHRlbnNpb24gKG5vIElEKSBvciBleGlzdGluZyBvbmVcbiAgICAgICAgY29uc3QgaXNOZXdFeHRlbnNpb24gPSAhZm9ybURhdGEuaWQgfHwgZm9ybURhdGEuaWQgPT09ICcnO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdChleHRlbnNpb24uJHNpcF9zZWNyZXQsIHtcbiAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVCwgIC8vIFNvZnQgdmFsaWRhdGlvbiAtIHNob3cgd2FybmluZ3MgYnV0IGFsbG93IHN1Ym1pc3Npb25cbiAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLCAgICAgICAgIC8vIFNob3cgZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsICAgICAvLyBTaG93IHNob3cvaGlkZSBwYXNzd29yZCB0b2dnbGVcbiAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSwgICAgICAgIC8vIFNob3cgY29weSB0byBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsICAgICAgICAvLyBTaG93IHBhc3N3b3JkIHN0cmVuZ3RoIGJhclxuICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLCAgICAgICAgICAgLy8gU2hvdyB2YWxpZGF0aW9uIHdhcm5pbmdzXG4gICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsICAgICAgICAvLyBWYWxpZGF0ZSBhcyB1c2VyIHR5cGVzXG4gICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZSwgLy8gQWx3YXlzIHZhbGlkYXRlIGlmIHBhc3N3b3JkIGZpZWxkIGhhcyB2YWx1ZVxuICAgICAgICAgICAgbWluU2NvcmU6IDMwLCAgICAgICAgICAgICAgICAgLy8gU0lQIHBhc3N3b3JkcyBoYXZlIGxvd2VyIG1pbmltdW0gc2NvcmUgcmVxdWlyZW1lbnRcbiAgICAgICAgICAgIGdlbmVyYXRlTGVuZ3RoOiAzMiwgICAgICAgICAgIC8vIEdlbmVyYXRlIDMyIGNoYXJhY3RlciBwYXNzd29yZHMgZm9yIGJldHRlciBzZWN1cml0eVxuICAgICAgICAgICAgb25HZW5lcmF0ZTogKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25WYWxpZGF0ZTogKGlzVmFsaWQsIHNjb3JlLCBtZXNzYWdlcykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE9wdGlvbmFsOiBIYW5kbGUgdmFsaWRhdGlvbiByZXN1bHRzIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIC8vIFRoZSB3aWRnZXQgd2lsbCBoYW5kbGUgdmlzdWFsIGZlZWRiYWNrIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSB3aWRnZXQgaW5zdGFuY2UgZm9yIGxhdGVyIHVzZVxuICAgICAgICBleHRlbnNpb24ucGFzc3dvcmRXaWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgbmV3IGV4dGVuc2lvbnMgb25seTogYXV0by1nZW5lcmF0ZSBwYXNzd29yZCBpZiBmaWVsZCBpcyBlbXB0eVxuICAgICAgICBpZiAoaXNOZXdFeHRlbnNpb24gJiYgZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGdlbmVyYXRlQnRuID0gZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LmNsb3Nlc3QoJy51aS5pbnB1dCcpLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAkZ2VuZXJhdGVCdG4udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERUTUYgbW9kZSBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24oKSB7XG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjc2lwX2R0bWZtb2RlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH0pO1xuICAgICB9LFxuICAgICAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRyYW5zcG9ydCBwcm90b2NvbCBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjc2lwX3RyYW5zcG9ydC1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIGVtcGxveWVlIG5hbWUgYW5kIGV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZW1wbG95ZWVOYW1lIC0gTmFtZSBvZiB0aGUgZW1wbG95ZWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uTnVtYmVyIC0gRXh0ZW5zaW9uIG51bWJlciAob3B0aW9uYWwpXG4gICAgICovXG4gICAgdXBkYXRlUGFnZUhlYWRlcihlbXBsb3llZU5hbWUsIGV4dGVuc2lvbk51bWJlcikge1xuICAgICAgICBsZXQgaGVhZGVyVGV4dDtcblxuICAgICAgICBpZiAoZW1wbG95ZWVOYW1lICYmIGVtcGxveWVlTmFtZS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAvLyBFeGlzdGluZyBlbXBsb3llZSB3aXRoIG5hbWVcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSAnPGkgY2xhc3M9XCJ1c2VyIG91dGxpbmUgaWNvblwiPjwvaT4gJyArIGVtcGxveWVlTmFtZTtcblxuICAgICAgICAgICAgLy8gQWRkIGV4dGVuc2lvbiBudW1iZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTnVtYmVyICYmIGV4dGVuc2lvbk51bWJlci50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVyVGV4dCArPSAnICZsdDsnICsgZXh0ZW5zaW9uTnVtYmVyICsgJyZndDsnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTmV3IGVtcGxveWVlIG9yIG5vIG5hbWUgeWV0XG4gICAgICAgICAgICBoZWFkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0NyZWF0ZU5ld0V4dGVuc2lvbiB8fCAnTmV3IEVtcGxveWVlJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBtYWluIGhlYWRlciBjb250ZW50XG4gICAgICAgICQoJ2gxIC5jb250ZW50JykuaHRtbChoZWFkZXJUZXh0KTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogRGVmaW5lIGEgY3VzdG9tIHJ1bGUgZm9yIGpRdWVyeSBmb3JtIHZhbGlkYXRpb24gbmFtZWQgJ2V4dGVuc2lvblJ1bGUnLlxuICogVGhlIHJ1bGUgY2hlY2tzIGlmIGEgZm9yd2FyZGluZyBudW1iZXIgaXMgc2VsZWN0ZWQgYnV0IHRoZSByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUaGUgdmFsaWRhdGlvbiByZXN1bHQuIElmIGZvcndhcmRpbmcgaXMgc2V0IGFuZCByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQsIGl0IHJldHVybnMgZmFsc2UgKGludmFsaWQpLiBPdGhlcndpc2UsIGl0IHJldHVybnMgdHJ1ZSAodmFsaWQpLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9ICgpID0+IHtcbiAgICAvLyBHZXQgcmluZyBsZW5ndGggYW5kIGZvcndhcmRpbmcgbnVtYmVyIGZyb20gdGhlIGZvcm1cbiAgICBjb25zdCBmd2RSaW5nTGVuZ3RoID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpO1xuICAgIGNvbnN0IGZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG5cbiAgICAvLyBJZiBmb3J3YXJkaW5nIG51bWJlciBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgcmV0dXJuIGZhbHNlIChpbnZhbGlkKVxuICAgIGlmIChmd2RGb3J3YXJkaW5nLmxlbmd0aCA+IDBcbiAgICAgICAgJiYgKFxuICAgICAgICAgICAgZndkUmluZ0xlbmd0aCA9PT0gMFxuICAgICAgICAgICAgfHxcbiAgICAgICAgICAgIGZ3ZFJpbmdMZW5ndGggPT09ICcnXG4gICAgICAgICkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgcmV0dXJuIHRydWUgKHZhbGlkKVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIG51bWJlciBpcyB0YWtlbiBieSBhbm90aGVyIGFjY291bnRcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBwYXJhbWV0ZXIgaGFzIHRoZSAnaGlkZGVuJyBjbGFzcywgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMucGFzc3dvcmRTdHJlbmd0aCA9ICgpID0+IHtcbiAgICAvLyBDaGVjayBpZiBwYXNzd29yZCB3aWRnZXQgZXhpc3RzIGFuZCBwYXNzd29yZCBtZWV0cyBtaW5pbXVtIHNjb3JlXG4gICAgaWYgKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IFBhc3N3b3JkV2lkZ2V0LmdldFN0YXRlKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIHJldHVybiBzdGF0ZSAmJiBzdGF0ZS5zY29yZSA+PSAzMDsgLy8gTWluaW11bSBzY29yZSBmb3IgZXh0ZW5zaW9uc1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTsgLy8gUGFzcyB2YWxpZGF0aW9uIGlmIHdpZGdldCBub3QgaW5pdGlhbGl6ZWRcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgRW1wbG95ZWUgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uLmluaXRpYWxpemUoKTtcbn0pO1xuIl19