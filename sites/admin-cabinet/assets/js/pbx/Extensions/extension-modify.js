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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwiJHVzZXJfdXNlcm5hbWUiLCJwYXNzd29yZFdpZGdldCIsIiRmb3JtT2JqIiwiJHRhYk1lbnVJdGVtcyIsImZvcndhcmRpbmdTZWxlY3QiLCJ2YWxpZGF0ZVJ1bGVzIiwibnVtYmVyIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyIiwiZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5IiwiZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSIsIm1vYmlsZV9udW1iZXIiLCJvcHRpb25hbCIsImV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0IiwiZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSIsInVzZXJfZW1haWwiLCJleF9WYWxpZGF0ZUVtYWlsRW1wdHkiLCJ1c2VyX3VzZXJuYW1lIiwiZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5Iiwic2lwX3NlY3JldCIsImV4X1ZhbGlkYXRlU2VjcmV0RW1wdHkiLCJleF9WYWxpZGF0ZVNlY3JldFdlYWsiLCJleF9WYWxpZGF0ZVBhc3N3b3JkVG9vV2VhayIsImZ3ZF9yaW5nbGVuZ3RoIiwiZGVwZW5kcyIsImV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlIiwiZndkX2ZvcndhcmRpbmciLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCIsImZ3ZF9mb3J3YXJkaW5nb25idXN5IiwiZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImFjY29yZGlvbiIsInBvcHVwIiwib24iLCJhdHRyIiwiaW5pdGlhbGl6ZUZvcm0iLCJjdXJyZW50TnVtYmVyIiwiaW5wdXRtYXNrIiwidmFsIiwidXBkYXRlUGFnZUhlYWRlciIsImN1cnJlbnRVc2VybmFtZSIsIkV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIiwiZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJsb2FkRXh0ZW5zaW9uRGF0YSIsImNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZSIsInBhc3RlZFZhbHVlIiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibmV3TnVtYmVyIiwidXNlcklkIiwiZm9ybSIsIkV4dGVuc2lvbnMiLCJjaGVja0F2YWlsYWJpbGl0eSIsImNiT25Db21wbGV0ZUVtYWlsIiwibmV3RW1haWwiLCJVc2Vyc0FQSSIsImNiT25Db21wbGV0ZU1vYmlsZU51bWJlciIsIm5ld01vYmlsZU51bWJlciIsImxlbmd0aCIsInVzZXJOYW1lIiwiY3VycmVudEZ3ZEZvcndhcmRpbmciLCJjdXJyZW50RndkT25CdXN5IiwiY3VycmVudEZ3ZE9uVW5hdmFpbGFibGUiLCJFeHRlbnNpb25TZWxlY3RvciIsInNldFZhbHVlIiwiY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIiLCJjbGVhciIsImluaXRpYWxpemVJbnB1dE1hc2tzIiwidGltZW91dE51bWJlcklkIiwiZXh0ZW5zaW9uc0xlbmd0aCIsInBhcnNlSW50IiwibWFzayIsInBsYWNlaG9sZGVyIiwib25jb21wbGV0ZSIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJtYXNrTGlzdCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJvbkJlZm9yZVBhc3RlIiwic2hvd01hc2tPbkhvdmVyIiwibWF0Y2giLCJyZXBsYWNlIiwibGlzdCIsImxpc3RLZXkiLCJlIiwicHJldmVudERlZmF1bHQiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwiY2hhckF0IiwicHJvY2Vzc2VkRGF0YSIsInNsaWNlIiwiaW5wdXQiLCJzdGFydCIsInNlbGVjdGlvblN0YXJ0IiwiZW5kIiwic2VsZWN0aW9uRW5kIiwiY3VycmVudFZhbHVlIiwibmV3VmFsdWUiLCJzdWJzdHJpbmciLCJ0cmlnZ2VyIiwidGltZW91dEVtYWlsSWQiLCJmb2N1c291dCIsInBob25lIiwidGFyZ2V0IiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIiRnZW5lcmF0ZUJ0biIsImNsb3Nlc3QiLCJmaW5kIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImRpcnJ0eSIsInN1Ym1pdE1vZGUiLCJ1c2VyX2lkIiwiY3VycmVudElkIiwiZ2V0UmVjb3JkSWQiLCJfaXNOZXciLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInVwZGF0ZVBob25lUmVwcmVzZW50IiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsIkZvcm0iLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJFbXBsb3llZXNBUEkiLCJzYXZlTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwicmVjb3JkSWQiLCJhcGlJZCIsImhpZGUiLCJnZXRSZWNvcmQiLCJwb3B1bGF0ZUZvcm1XaXRoRGF0YSIsImF2YXRhciIsInNob3dFcnJvciIsImVycm9yIiwidXJsUGFydHMiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJleHRlbnNpb25zX2xlbmd0aCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEiLCJ0ZXh0Iiwic2V0QXZhdGFyVXJsIiwidXNlcl9hdmF0YXIiLCJFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yIiwiaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0IiwiaW5pdCIsImV4Y2x1ZGVFeHRlbnNpb25zIiwiaW5jbHVkZUVtcHR5IiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJleF9TZWxlY3ROZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJvZmYiLCJuZXdFeHRlbnNpb24iLCJ1cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uIiwiaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24iLCJpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24iLCJmb3J3YXJkaW5nRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkTmFtZSIsImN1cnJlbnRUZXh0IiwicmVtb3ZlIiwicmVmcmVzaERhdGEiLCJpc05ld0V4dGVuc2lvbiIsImlkIiwid2lkZ2V0IiwiUGFzc3dvcmRXaWRnZXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsIm9uR2VuZXJhdGUiLCJwYXNzd29yZCIsImRhdGFDaGFuZ2VkIiwib25WYWxpZGF0ZSIsImlzVmFsaWQiLCJzY29yZSIsIiRkcm9wZG93biIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJlbXBsb3llZU5hbWUiLCJleHRlbnNpb25OdW1iZXIiLCJoZWFkZXJUZXh0IiwidHJpbSIsImV4X0NyZWF0ZU5ld0V4dGVuc2lvbiIsImh0bWwiLCJmbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJwYXNzd29yZFN0cmVuZ3RoIiwic3RhdGUiLCJnZXRTdGF0ZSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFNBQVMsR0FBRztBQUNkQyxFQUFBQSxZQUFZLEVBQUUsRUFEQTtBQUVkQyxFQUFBQSxhQUFhLEVBQUUsRUFGRDtBQUdkQyxFQUFBQSxtQkFBbUIsRUFBRSxFQUhQO0FBSWRDLEVBQUFBLE9BQU8sRUFBRUMsQ0FBQyxDQUFDLFNBQUQsQ0FKSTtBQUtkQyxFQUFBQSxXQUFXLEVBQUVELENBQUMsQ0FBQyxhQUFELENBTEE7QUFNZEUsRUFBQUEsY0FBYyxFQUFFRixDQUFDLENBQUMsZ0JBQUQsQ0FOSDtBQU9kRyxFQUFBQSxlQUFlLEVBQUVILENBQUMsQ0FBQyxpQkFBRCxDQVBKO0FBUWRJLEVBQUFBLHFCQUFxQixFQUFFSixDQUFDLENBQUMsdUJBQUQsQ0FSVjtBQVNkSyxFQUFBQSw0QkFBNEIsRUFBRUwsQ0FBQyxDQUFDLDhCQUFELENBVGpCO0FBVWRNLEVBQUFBLE1BQU0sRUFBRU4sQ0FBQyxDQUFDLGFBQUQsQ0FWSztBQVdkTyxFQUFBQSxjQUFjLEVBQUVQLENBQUMsQ0FBQyxnQkFBRCxDQVhIOztBQWFkO0FBQ0o7QUFDQTtBQUNBO0FBQ0lRLEVBQUFBLGNBQWMsRUFBRSxJQWpCRjs7QUFtQmQ7QUFDSjtB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Q0FBQyxZQUFLOE8sU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDOztBQUdBL08sQ0FBQyxDQUFDd08sRUFBRixDQUFLeEssSUFBTCxDQUFVb0UsUUFBVixDQUFtQnJILEtBQW5CLENBQXlCaU8sZ0JBQXpCLEdBQTRDLFlBQU07QUFDOUM7QUFDQSxNQUFJclAsU0FBUyxDQUFDYSxjQUFkLEVBQThCO0FBQzFCLFFBQU15TyxLQUFLLEdBQUdyQyxjQUFjLENBQUNzQyxRQUFmLENBQXdCdlAsU0FBUyxDQUFDYSxjQUFsQyxDQUFkO0FBQ0EsV0FBT3lPLEtBQUssSUFBSUEsS0FBSyxDQUFDbkIsS0FBTixJQUFlLEVBQS9CLENBRjBCLENBRVM7QUFDdEM7O0FBQ0QsU0FBTyxJQUFQLENBTjhDLENBTWpDO0FBQ2hCLENBUEQ7QUFTQTtBQUNBO0FBQ0E7OztBQUNBOU4sQ0FBQyxDQUFDbVAsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnpQLEVBQUFBLFNBQVMsQ0FBQytDLFVBQVY7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRW1wbG95ZWVzQVBJLCBGb3JtLFxuIElucHV0TWFza1BhdHRlcm5zLCBhdmF0YXIsIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IsIENsaXBib2FyZEpTLCBQYXNzd29yZFdpZGdldCwgVXNlck1lc3NhZ2UgKi9cblxuXG4vKipcbiAqIFRoZSBleHRlbnNpb24gb2JqZWN0LlxuICogTWFuYWdlcyB0aGUgb3BlcmF0aW9ucyBhbmQgYmVoYXZpb3JzIG9mIHRoZSBleHRlbnNpb24gZWRpdCBmb3JtXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25cbiAqL1xuY29uc3QgZXh0ZW5zaW9uID0ge1xuICAgIGRlZmF1bHRFbWFpbDogJycsXG4gICAgZGVmYXVsdE51bWJlcjogJycsXG4gICAgZGVmYXVsdE1vYmlsZU51bWJlcjogJycsXG4gICAgJG51bWJlcjogJCgnI251bWJlcicpLFxuICAgICRzaXBfc2VjcmV0OiAkKCcjc2lwX3NlY3JldCcpLFxuICAgICRtb2JpbGVfbnVtYmVyOiAkKCcjbW9iaWxlX251bWJlcicpLFxuICAgICRmd2RfZm9yd2FyZGluZzogJCgnI2Z3ZF9mb3J3YXJkaW5nJyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb25idXN5OiAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKSxcbiAgICAkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiAkKCcjZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyksXG4gICAgJGVtYWlsOiAkKCcjdXNlcl9lbWFpbCcpLFxuICAgICR1c2VyX3VzZXJuYW1lOiAkKCcjdXNlcl91c2VybmFtZScpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHdpZGdldCBpbnN0YW5jZS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHBhc3N3b3JkV2lkZ2V0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2V4dGVuc2lvbnMtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYnVsYXIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51SXRlbXM6ICQoJyNleHRlbnNpb25zLW1lbnUgLml0ZW0nKSxcblxuXG4gICAgLyoqXG4gICAgICogU3RyaW5nIGZvciB0aGUgZm9yd2FyZGluZyBzZWxlY3QuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBmb3J3YXJkaW5nU2VsZWN0OiAnI2V4dGVuc2lvbnMtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG51bWJlcjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ251bWJlcicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIG1vYmlsZV9udW1iZXI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ21vYmlsZV9udW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXNrJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbW9iaWxlLW51bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX2VtYWlsOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUVtYWlsRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHVzZXJfdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNpcF9zZWNyZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzaXBfc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRXZWFrLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncGFzc3dvcmRTdHJlbmd0aCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlUGFzc3dvcmRUb29XZWFrIHx8ICdQYXNzd29yZCBpcyB0b28gd2VhayBmb3Igc2VjdXJpdHkgcmVxdWlyZW1lbnRzJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9yaW5nbGVuZ3RoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuICAgICAgICAgICAgZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb24gZm9ybSBhbmQgaXRzIGludGVyYWN0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBEZWZhdWx0IHZhbHVlcyB3aWxsIGJlIHNldCBhZnRlciBSRVNUIEFQSSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggZW1wdHkgdmFsdWVzIHNpbmNlIGZvcm1zIGFyZSBlbXB0eSB1bnRpbCBBUEkgcmVzcG9uZHNcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9ICcnO1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE51bWJlciA9ICcnO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFiIG1lbnUgaXRlbXMsIGFjY29yZGlvbnMsIGFuZCBkcm9wZG93biBtZW51c1xuICAgICAgICBleHRlbnNpb24uJHRhYk1lbnVJdGVtcy50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIC51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBmb3IgcXVlc3Rpb24gaWNvbnMgYW5kIGJ1dHRvbnNcbiAgICAgICAgJChcImkucXVlc3Rpb25cIikucG9wdXAoKTtcbiAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIGV4dGVuc2lvbi4kc2lwX3NlY3JldC5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gZm9ybVxuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgaGFuZGxlciBmb3IgdXNlcm5hbWUgY2hhbmdlIHRvIHVwZGF0ZSBwYWdlIHRpdGxlXG4gICAgICAgIGV4dGVuc2lvbi4kdXNlcl91c2VybmFtZS5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2sgPyBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKSA6IGV4dGVuc2lvbi4kbnVtYmVyLnZhbCgpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLnVwZGF0ZVBhZ2VIZWFkZXIoJCh0aGlzKS52YWwoKSwgY3VycmVudE51bWJlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFsc28gdXBkYXRlIGhlYWRlciB3aGVuIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlc1xuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRVc2VybmFtZSA9IGV4dGVuc2lvbi4kdXNlcl91c2VybmFtZS52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnROdW1iZXIgPSAkKHRoaXMpLmlucHV0bWFzayA/ICQodGhpcykuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykgOiAkKHRoaXMpLnZhbCgpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLnVwZGF0ZVBhZ2VIZWFkZXIoY3VycmVudFVzZXJuYW1lLCBjdXJyZW50TnVtYmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgYWR2YW5jZWQgc2V0dGluZ3MgdXNpbmcgdW5pZmllZCBzeXN0ZW1cbiAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBvbGQgbmFtZSBpZiBuZXcgY2xhc3Mgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgZXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9hZCBleHRlbnNpb24gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgZXh0ZW5zaW9uLmxvYWRFeHRlbnNpb25EYXRhKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBtb2JpbGUgbnVtYmVyIGZyb20gY2xpcGJvYXJkXG4gICAgICovXG4gICAgY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgYWZ0ZXIgYSBwaG9uZSBudW1iZXIgaGFzIGJlZW4gZW50ZXJlZCBjb21wbGV0ZWx5LlxuICAgICAqIEl0IHNlcnZlcyB0byBjaGVjayBpZiB0aGVyZSBhcmUgYW55IGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIHBob25lIG51bWJlcnMuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgYWZ0ZXIgcmVtb3ZpbmcgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBDYWxsIHRoZSBgY2hlY2tBdmFpbGFiaWxpdHlgIGZ1bmN0aW9uIG9uIGBFeHRlbnNpb25zYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgaXMgYWxyZWFkeSBpbiB1c2UuXG4gICAgICAgIC8vIFBhcmFtZXRlcnM6IGRlZmF1bHQgbnVtYmVyLCBuZXcgbnVtYmVyLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKG51bWJlciksIHVzZXIgaWRcbiAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE51bWJlciwgbmV3TnVtYmVyLCAnbnVtYmVyJywgdXNlcklkKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIG9uY2UgYW4gZW1haWwgYWRkcmVzcyBoYXMgYmVlbiBjb21wbGV0ZWx5IGVudGVyZWQuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGFmdGVyIHJlbW92aW5nIGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld0VtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGBjaGVja0F2YWlsYWJpbGl0eWAgZnVuY3Rpb24gb24gYFVzZXJzQVBJYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBlbWFpbCBpcyBhbHJlYWR5IGluIHVzZS5cbiAgICAgICAgLy8gUGFyYW1ldGVyczogZGVmYXVsdCBlbWFpbCwgbmV3IGVtYWlsLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKGVtYWlsKSwgdXNlciBpZFxuICAgICAgICBVc2Vyc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdEVtYWlsLCBuZXdFbWFpbCwnZW1haWwnLCB1c2VySWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBY3RpdmF0ZWQgd2hlbiBlbnRlcmluZyBhIG1vYmlsZSBwaG9uZSBudW1iZXIgaW4gdGhlIGVtcGxveWVlJ3MgcHJvZmlsZS5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgd2l0aG91dCBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gR2V0IHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBEeW5hbWljIGNoZWNrIHRvIHNlZSBpZiB0aGUgc2VsZWN0ZWQgbW9iaWxlIG51bWJlciBpcyBhdmFpbGFibGVcbiAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cbiAgICAgICAgLy8gUmVmaWxsIHRoZSBtb2JpbGUgZGlhbHN0cmluZyBpZiB0aGUgbmV3IG1vYmlsZSBudW1iZXIgaXMgZGlmZmVyZW50IHRoYW4gdGhlIGRlZmF1bHQgb3IgaWYgdGhlIG1vYmlsZSBkaWFsc3RyaW5nIGlzIGVtcHR5XG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyXG4gICAgICAgICAgICB8fCAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycpLmxlbmd0aCA9PT0gMClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2JpbGUgbnVtYmVyIGhhcyBjaGFuZ2VkXG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyB1c2VybmFtZSBmcm9tIHRoZSBmb3JtXG4gICAgICAgICAgICBjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9yd2FyZGluZyBmaWVsZHMgdGhhdCBtYXRjaCB0aGUgb2xkIG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEZ3ZE9uQnVzeSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZ3ZF9mb3J3YXJkaW5nIGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkRm9yd2FyZGluZyA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcblxuICAgICAgICAgICAgICAgIC8vIFNldCByaW5nIGxlbmd0aCBpZiBlbXB0eVxuICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgICAgICAgIHx8IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKT09PVwiMFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCA0NSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5zZXRWYWx1ZSgnZndkX2ZvcndhcmRpbmcnLCBuZXdNb2JpbGVOdW1iZXIsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZndkX2ZvcndhcmRpbmdvbmJ1c3kgaWYgaXQgbWF0Y2hlcyBvbGQgbW9iaWxlIG51bWJlciAoaW5jbHVkaW5nIGVtcHR5KVxuICAgICAgICAgICAgaWYgKGN1cnJlbnRGd2RPbkJ1c3kgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5zZXRWYWx1ZSgnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgRXh0ZW5zaW9uU2VsZWN0b3IgQVBJIGZvciBWNS4wIHVuaWZpZWQgcGF0dGVyblxuICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLnNldFZhbHVlKCdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCBuZXdNb2JpbGVOdW1iZXIsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFNldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgYXMgdGhlIGRlZmF1bHRcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBuZXdNb2JpbGVOdW1iZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxlZCB3aGVuIHRoZSBtb2JpbGUgcGhvbmUgbnVtYmVyIGlzIGNsZWFyZWQgaW4gdGhlIGVtcGxveWVlIGNhcmQuXG4gICAgICovXG4gICAgY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIENoZWNrIGN1cnJlbnQgZm9yd2FyZGluZyB2YWx1ZXMgYmVmb3JlIGNsZWFyaW5nXG4gICAgICAgIGNvbnN0IGN1cnJlbnRGd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICBjb25zdCBjdXJyZW50RndkT25CdXN5ID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpO1xuICAgICAgICBjb25zdCBjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB0aGUgJ21vYmlsZV9kaWFsc3RyaW5nJyBhbmQgJ21vYmlsZV9udW1iZXInIGZpZWxkcyBpbiB0aGUgZm9ybVxuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgJycpO1xuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9udW1iZXInLCAnJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChjdXJyZW50RndkRm9yd2FyZGluZyA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIElmIHNvLCBjbGVhciB0aGUgJ2Z3ZF9yaW5nbGVuZ3RoJyBmaWVsZCBhbmQgY2xlYXIgZm9yd2FyZGluZyBkcm9wZG93blxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDApO1xuICAgICAgICAgICAgLy8gVXNlIEV4dGVuc2lvblNlbGVjdG9yIEFQSSBmb3IgVjUuMCB1bmlmaWVkIHBhdHRlcm5cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmNsZWFyKCdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIGJ1c3kgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoY3VycmVudEZ3ZE9uQnVzeSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiB1bmF2YWlsYWJsZSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIFVzZSBFeHRlbnNpb25TZWxlY3RvciBBUEkgZm9yIFY1LjAgdW5pZmllZCBwYXR0ZXJuXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG4gICAgfSxcblxuICAgIGluaXRpYWxpemVJbnB1dE1hc2tzKCl7XG4gICAgICAgIC8vIFNldCB1cCBudW1iZXIgaW5wdXQgbWFzayB3aXRoIGNvcnJlY3QgbGVuZ3RoIGZyb20gQVBJXG4gICAgICAgIGxldCB0aW1lb3V0TnVtYmVySWQ7XG5cbiAgICAgICAgLy8gQWx3YXlzIGluaXRpYWxpemUgbWFzayBiYXNlZCBvbiBleHRlbnNpb25zX2xlbmd0aCBmcm9tIEFQSVxuICAgICAgICAvLyBObyBkZWZhdWx0cyBpbiBKYXZhU2NyaXB0IC0gdmFsdWUgbXVzdCBjb21lIGZyb20gQVBJXG4gICAgICAgIGlmIChleHRlbnNpb24uZXh0ZW5zaW9uc0xlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uc0xlbmd0aCA9IHBhcnNlSW50KGV4dGVuc2lvbi5leHRlbnNpb25zTGVuZ3RoLCAxMCk7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uc0xlbmd0aCA+PSAyICYmIGV4dGVuc2lvbnNMZW5ndGggPD0gMTApIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIG1hc2sgd2l0aCBjb3JyZWN0IGxlbmd0aCBhbmQgb25jb21wbGV0ZSBoYW5kbGVyXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKHtcbiAgICAgICAgICAgICAgICAgICAgbWFzazogYDl7Miwke2V4dGVuc2lvbnNMZW5ndGh9fWAsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnXycsXG4gICAgICAgICAgICAgICAgICAgIG9uY29tcGxldGU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBwcmV2aW91cyB0aW1lciwgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGltZW91dE51bWJlcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXROdW1iZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0TnVtYmVySWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlTnVtYmVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vbigncGFzdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrcyBmb3IgdGhlIG1vYmlsZSBudW1iZXIgaW5wdXRcbiAgICAgICAgY29uc3QgbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3I6ICdbMC05XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uY2xlYXJlZDogZXh0ZW5zaW9uLmNiT25DbGVhcmVkTW9iaWxlTnVtYmVyLFxuICAgICAgICAgICAgICAgIG9uY29tcGxldGU6IGV4dGVuc2lvbi5jYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIsXG4gICAgICAgICAgICAgICAgb25CZWZvcmVQYXN0ZTogZXh0ZW5zaW9uLmNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZSxcbiAgICAgICAgICAgICAgICBzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgbGlzdDogbWFza0xpc3QsXG4gICAgICAgICAgICBsaXN0S2V5OiAnbWFzaycsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5vbigncGFzdGUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7IC8vINCf0YDQtdC00L7RgtCy0YDQsNGJ0LDQtdC8INGB0YLQsNC90LTQsNGA0YLQvdC+0LUg0L/QvtCy0LXQtNC10L3QuNC1INCy0YHRgtCw0LLQutC4XG5cbiAgICAgICAgICAgIC8vINCf0L7Qu9GD0YfQsNC10Lwg0LLRgdGC0LDQstC70LXQvdC90YvQtSDQtNCw0L3QvdGL0LUg0LjQtyDQsdGD0YTQtdGA0LAg0L7QsdC80LXQvdCwXG4gICAgICAgICAgICBsZXQgcGFzdGVkRGF0YSA9ICcnO1xuICAgICAgICAgICAgaWYgKGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuY2xpcGJvYXJkRGF0YSAmJiB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7IC8vINCU0LvRjyBJRVxuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vINCf0YDQvtCy0LXRgNGP0LXQvCwg0L3QsNGH0LjQvdCw0LXRgtGB0Y8g0LvQuCDQstGB0YLQsNCy0LvQtdC90L3Ri9C5INGC0LXQutGB0YIg0YEgJysnXG4gICAgICAgICAgICBpZiAocGFzdGVkRGF0YS5jaGFyQXQoMCkgPT09ICcrJykge1xuICAgICAgICAgICAgICAgIC8vINCh0L7RhdGA0LDQvdGP0LXQvCAnKycg0Lgg0YPQtNCw0LvRj9C10Lwg0L7RgdGC0LDQu9GM0L3Ri9C1INC90LXQttC10LvQsNGC0LXQu9GM0L3Ri9C1INGB0LjQvNCy0L7Qu9GLXG4gICAgICAgICAgICAgICAgdmFyIHByb2Nlc3NlZERhdGEgPSAnKycgKyBwYXN0ZWREYXRhLnNsaWNlKDEpLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vINCj0LTQsNC70Y/QtdC8INCy0YHQtSDRgdC40LzQstC+0LvRiywg0LrRgNC+0LzQtSDRhtC40YTRgFxuICAgICAgICAgICAgICAgIHZhciBwcm9jZXNzZWREYXRhID0gcGFzdGVkRGF0YS5yZXBsYWNlKC9cXEQvZywgJycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyDQktGB0YLQsNCy0LvRj9C10Lwg0L7Rh9C40YnQtdC90L3Ri9C1INC00LDQvdC90YvQtSDQsiDQv9C+0LvQtSDQstCy0L7QtNCwXG4gICAgICAgICAgICBjb25zdCBpbnB1dCA9IHRoaXM7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IGlucHV0LnNlbGVjdGlvblN0YXJ0O1xuICAgICAgICAgICAgY29uc3QgZW5kID0gaW5wdXQuc2VsZWN0aW9uRW5kO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJChpbnB1dCkudmFsKCk7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGN1cnJlbnRWYWx1ZS5zdWJzdHJpbmcoMCwgc3RhcnQpICsgcHJvY2Vzc2VkRGF0YSArIGN1cnJlbnRWYWx1ZS5zdWJzdHJpbmcoZW5kKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soXCJyZW1vdmVcIik7XG4gICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIudmFsKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIC8vINCi0YDQuNCz0LPQtdGA0LjQvCDRgdC+0LHRi9GC0LjQtSAnaW5wdXQnINC00LvRjyDQv9GA0LjQvNC10L3QtdC90LjRjyDQvNCw0YHQutC4INCy0LLQvtC00LBcbiAgICAgICAgICAgICQoaW5wdXQpLnRyaWdnZXIoJ2lucHV0Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCB0aGUgaW5wdXQgbWFzayBmb3IgdGhlIGVtYWlsIGlucHV0XG4gICAgICAgIGxldCB0aW1lb3V0RW1haWxJZDtcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZTogKCk9PntcbiAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgcHJldmlvdXMgdGltZXIsIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICh0aW1lb3V0RW1haWxJZCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dEVtYWlsSWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgICAgICAgdGltZW91dEVtYWlsSWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsKCk7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBleHRlbnNpb24uJGVtYWlsLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vQXR0YWNoIGEgZm9jdXNvdXQgZXZlbnQgbGlzdGVuZXIgdG8gdGhlIG1vYmlsZSBudW1iZXIgaW5wdXRcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmZvY3Vzb3V0KGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsZXQgcGhvbmUgPSAkKGUudGFyZ2V0KS52YWwoKS5yZXBsYWNlKC9bXjAtOV0vZywgXCJcIik7XG4gICAgICAgICAgICBpZiAocGhvbmUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJChlLnRhcmdldCkudmFsKCcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIG5ldyBTSVAgcGFzc3dvcmQuXG4gICAgICogVXNlcyB0aGUgUGFzc3dvcmRXaWRnZXQgYnV0dG9uIGxpa2UgaW4gQU1JIG1hbmFnZXIuXG4gICAgICovXG4gICAgZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcbiAgICAgICAgLy8gVHJpZ2dlciBwYXNzd29yZCBnZW5lcmF0aW9uIHRocm91Z2ggdGhlIHdpZGdldCBidXR0b24gKGxpa2UgaW4gQU1JKVxuICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBleHRlbnNpb24uJHNpcF9zZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJGdlbmVyYXRlQnRuLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEubW9iaWxlX251bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZW1vdmUgZm9ybSBjb250cm9sIGZpZWxkcyB0aGF0IHNob3VsZG4ndCBiZSBzZW50IHRvIHNlcnZlclxuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEuZGlycnR5O1xuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEuc3VibWl0TW9kZTtcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLnVzZXJfaWQ7IC8vIFJlbW92ZSB1c2VyX2lkIGZpZWxkIHRvIHByZXZlbnQgdmFsaWRhdGlvbiBpc3N1ZXNcblxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgKGNoZWNrIGlmIHdlIGhhdmUgYSByZWFsIElEKVxuICAgICAgICBjb25zdCBjdXJyZW50SWQgPSBleHRlbnNpb24uZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgaWYgKCFjdXJyZW50SWQgfHwgY3VycmVudElkID09PSAnJykge1xuICAgICAgICAgICAgLy8gTmV3IGV4dGVuc2lvbiAtIGFkZCBfaXNOZXcgZmxhZyBmb3IgcHJvcGVyIFBPU1QvUFVUIG1ldGhvZCBzZWxlY3Rpb25cbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBjdXJyZW50IGV4dGVuc2lvbiBudW1iZXIgYXMgdGhlIGRlZmF1bHQgbnVtYmVyIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEubnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSByZXNwb25zZS5kYXRhLm51bWJlcjtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHBob25lIHJlcHJlc2VudGF0aW9uIHdpdGggdGhlIG5ldyBkZWZhdWx0IG51bWJlclxuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMudXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZSBhbmQgcmVzcG9uc2UucmVsb2FkIGZyb20gc2VydmVyXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzIGZvciBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qcyBmb3IgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGV4dGVuc2lvbi4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZXh0ZW5zaW9uLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBFbXBsb3llZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyBjaGVja2JveCB2YWx1ZXMgYXJlIHNlbnQgYXMgdHJ1ZS9mYWxzZSBpbnN0ZWFkIG9mIFwib25cIi91bmRlZmluZWRcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFY1LjAgQXJjaGl0ZWN0dXJlOiBMb2FkIGV4dGVuc2lvbiBkYXRhIHZpYSBSRVNUIEFQSSAoc2ltaWxhciB0byBJVlIgbWVudSBwYXR0ZXJuKVxuICAgICAqL1xuICAgIGxvYWRFeHRlbnNpb25EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGV4dGVuc2lvbi5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlICduZXcnIGFzIElEIGZvciBuZXcgcmVjb3JkcyB0byBnZXQgZGVmYXVsdCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgY29uc3QgYXBpSWQgPSByZWNvcmRJZCA9PT0gJycgPyAnbmV3JyA6IHJlY29yZElkO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlkZSBtb25pdG9yaW5nIGVsZW1lbnRzIGZvciBuZXcgZW1wbG95ZWVzXG4gICAgICAgIGlmIChhcGlJZCA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgICQoJyNzdGF0dXMnKS5oaWRlKCk7IC8vIEhpZGUgc3RhdHVzIGxhYmVsXG4gICAgICAgICAgICAkKCdhW2RhdGEtdGFiPVwic3RhdHVzXCJdJykuaGlkZSgpOyAvLyBIaWRlIG1vbml0b3JpbmcgdGFiXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEVtcGxveWVlc0FQSS5nZXRSZWNvcmQoYXBpSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5wb3B1bGF0ZUZvcm1XaXRoRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBkZWZhdWx0IHZhbHVlcyBhZnRlciBkYXRhIGxvYWRcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IHJlc3BvbnNlLmRhdGEubnVtYmVyIHx8ICcnO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPSByZXNwb25zZS5kYXRhLnVzZXJfZW1haWwgfHwgJyc7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSByZXNwb25zZS5kYXRhLm1vYmlsZV9udW1iZXIgfHwgJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3Jkcywgc3RpbGwgaW5pdGlhbGl6ZSBhdmF0YXIgZXZlbiBpZiBBUEkgZmFpbHNcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGF2YXRhci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIGV4dGVuc2lvbiBkYXRhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTCAobGlrZSBJVlIgbWVudSlcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIFJFU1QgQVBJIChWNS4wIGNsZWFuIGRhdGEgYXJjaGl0ZWN0dXJlKVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybVdpdGhEYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gU3RvcmUgZXh0ZW5zaW9uc19sZW5ndGggZnJvbSBBUEkgZm9yIHVzZSBpbiBpbml0aWFsaXplSW5wdXRNYXNrc1xuICAgICAgICAvLyBUaGlzIHZhbHVlIE1VU1QgY29tZSBmcm9tIEFQSSAtIG5vIGRlZmF1bHRzIGluIEpTXG4gICAgICAgIGV4dGVuc2lvbi5leHRlbnNpb25zTGVuZ3RoID0gZGF0YS5leHRlbnNpb25zX2xlbmd0aDtcblxuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaCAoc2FtZSBhcyBJVlIgbWVudSlcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NlcyAtIGNvbXBsZXRlIGF1dG9tYXRpb25cbiAgICAgICAgICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEoZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4dGVuc2lvbiBudW1iZXIgaW4gYW55IFVJIGVsZW1lbnRzIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGlmIChmb3JtRGF0YS5udW1iZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1udW1iZXItZGlzcGxheScpLnRleHQoZm9ybURhdGEubnVtYmVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBhdmF0YXIgY29tcG9uZW50IGFmdGVyIGZvcm0gcG9wdWxhdGlvblxuICAgICAgICAgICAgICAgIGF2YXRhci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IGF2YXRhciBVUkwgZHluYW1pY2FsbHkgZnJvbSBBUEkgZGF0YVxuICAgICAgICAgICAgICAgIGF2YXRhci5zZXRBdmF0YXJVcmwoZm9ybURhdGEudXNlcl9hdmF0YXIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIG1vZGlmeSBzdGF0dXMgbW9uaXRvciBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggZW1wbG95ZWUgbmFtZSBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVQYWdlSGVhZGVyKGZvcm1EYXRhLnVzZXJfdXNlcm5hbWUsIGZvcm1EYXRhLm51bWJlcik7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dCBtYXNrcyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplSW5wdXRNYXNrcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5PVEU6IEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKSB3aWxsIGJlIGNhbGxlZCBhdXRvbWF0aWNhbGx5IGJ5IEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjbGVhbiBkYXRhIC0gVjUuMCBBcmNoaXRlY3R1cmVcbiAgICAgKiBVc2VzIHNwZWNpYWxpemVkIGNsYXNzZXMgd2l0aCBjb21wbGV0ZSBhdXRvbWF0aW9uIChubyBvbkNoYW5nZSBjYWxsYmFja3MgbmVlZGVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRXh0ZW5zaW9uIGRyb3Bkb3ducyB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvbiAtIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZndkX2ZvcndhcmRpbmcnLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZ29uYnVzeScsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJywgXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIEFQSSBkYXRhIC0gVjUuMCBiYXNlIGNsYXNzXG4gICAgICAgIFxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3NpcF9uZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6IGAvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109U0lQYCxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0TmV0d29ya0ZpbHRlciB8fCAnU2VsZWN0IE5ldHdvcmsgRmlsdGVyJyxcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFY1LjAgYXJjaGl0ZWN0dXJlIHdpdGggZW1wdHkgZm9ybSBzaG91bGQgbm90IGhhdmUgSFRNTCBlbnRpdGllcyBpc3N1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXMgLSByZWJ1aWxkIGRyb3Bkb3ducyB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIub2ZmKCdjaGFuZ2UuZHJvcGRvd24nKS5vbignY2hhbmdlLmRyb3Bkb3duJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV3RXh0ZW5zaW9uID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdudW1iZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG5ld0V4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleGNsdXNpb25zIGZvciBmb3J3YXJkaW5nIGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uKG5ld0V4dGVuc2lvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpO1xuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZm9yd2FyZGluZyBkcm9wZG93bnMgd2hlbiBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXNcbiAgICAgKi9cbiAgICB1cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uKG5ld0V4dGVuc2lvbikge1xuICAgICAgICBjb25zdCBmb3J3YXJkaW5nRmllbGRzID0gWydmd2RfZm9yd2FyZGluZycsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnXTtcbiAgICAgICAgXG4gICAgICAgIGZvcndhcmRpbmdGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJChgIyR7ZmllbGROYW1lfWApLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFRleHQgPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCkuZmluZCgnLnRleHQnKS50ZXh0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBvbGQgZHJvcGRvd25cbiAgICAgICAgICAgICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBkYXRhIG9iamVjdCB3aXRoIGN1cnJlbnQgdmFsdWUgZm9yIHJlaW5pdGlhbGl6aW5nXG4gICAgICAgICAgICBjb25zdCByZWZyZXNoRGF0YSA9IHt9O1xuICAgICAgICAgICAgcmVmcmVzaERhdGFbZmllbGROYW1lXSA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgIHJlZnJlc2hEYXRhW2Ake2ZpZWxkTmFtZX1fcmVwcmVzZW50YF0gPSBjdXJyZW50VGV4dDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVpbml0aWFsaXplIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdChmaWVsZE5hbWUsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtuZXdFeHRlbnNpb25dLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiByZWZyZXNoRGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgYWZ0ZXIgZm9ybSBkYXRhIGlzIGxvYWRlZFxuICAgICAqIFRoaXMgZW5zdXJlcyB2YWxpZGF0aW9uIG9ubHkgaGFwcGVucyBhZnRlciBwYXNzd29yZCBpcyBwb3B1bGF0ZWQgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmb3JtRGF0YSAtIFRoZSBmb3JtIGRhdGEgbG9hZGVkIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoZm9ybURhdGEpIHtcbiAgICAgICAgaWYgKCFleHRlbnNpb24uJHNpcF9zZWNyZXQubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIaWRlIGFueSBsZWdhY3kgYnV0dG9ucyBpZiB0aGV5IGV4aXN0XG4gICAgICAgICQoJy5jbGlwYm9hcmQnKS5oaWRlKCk7XG4gICAgICAgICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKS5oaWRlKCk7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgZXh0ZW5zaW9uIChubyBJRCkgb3IgZXhpc3Rpbmcgb25lXG4gICAgICAgIGNvbnN0IGlzTmV3RXh0ZW5zaW9uID0gIWZvcm1EYXRhLmlkIHx8IGZvcm1EYXRhLmlkID09PSAnJztcblxuICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KGV4dGVuc2lvbi4kc2lwX3NlY3JldCwge1xuICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULCAgLy8gU29mdCB2YWxpZGF0aW9uIC0gc2hvdyB3YXJuaW5ncyBidXQgYWxsb3cgc3VibWlzc2lvblxuICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsICAgICAgICAgLy8gU2hvdyBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSwgICAgIC8vIFNob3cgc2hvdy9oaWRlIHBhc3N3b3JkIHRvZ2dsZVxuICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLCAgICAgICAgLy8gU2hvdyBjb3B5IHRvIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSwgICAgICAgIC8vIFNob3cgcGFzc3dvcmQgc3RyZW5ndGggYmFyXG4gICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsICAgICAgICAgICAvLyBTaG93IHZhbGlkYXRpb24gd2FybmluZ3NcbiAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSwgICAgICAgIC8vIFZhbGlkYXRlIGFzIHVzZXIgdHlwZXNcbiAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlLCAvLyBBbHdheXMgdmFsaWRhdGUgaWYgcGFzc3dvcmQgZmllbGQgaGFzIHZhbHVlXG4gICAgICAgICAgICBtaW5TY29yZTogMzAsICAgICAgICAgICAgICAgICAvLyBTSVAgcGFzc3dvcmRzIGhhdmUgbG93ZXIgbWluaW11bSBzY29yZSByZXF1aXJlbWVudFxuICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDMyLCAgICAgICAgICAgLy8gR2VuZXJhdGUgMzIgY2hhcmFjdGVyIHBhc3N3b3JkcyBmb3IgYmV0dGVyIHNlY3VyaXR5XG4gICAgICAgICAgICBvbkdlbmVyYXRlOiAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblZhbGlkYXRlOiAoaXNWYWxpZCwgc2NvcmUsIG1lc3NhZ2VzKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gT3B0aW9uYWw6IEhhbmRsZSB2YWxpZGF0aW9uIHJlc3VsdHMgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgLy8gVGhlIHdpZGdldCB3aWxsIGhhbmRsZSB2aXN1YWwgZmVlZGJhY2sgYXV0b21hdGljYWxseVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIHdpZGdldCBpbnN0YW5jZSBmb3IgbGF0ZXIgdXNlXG4gICAgICAgIGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBuZXcgZXh0ZW5zaW9ucyBvbmx5OiBhdXRvLWdlbmVyYXRlIHBhc3N3b3JkIGlmIGZpZWxkIGlzIGVtcHR5XG4gICAgICAgIGlmIChpc05ld0V4dGVuc2lvbiAmJiBleHRlbnNpb24uJHNpcF9zZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBleHRlbnNpb24uJHNpcF9zZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRnZW5lcmF0ZUJ0bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICRnZW5lcmF0ZUJ0bi50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRFRNRiBtb2RlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNzaXBfZHRtZm1vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfSk7XG4gICAgIH0sXG4gICAgICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJhbnNwb3J0IHByb3RvY29sIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNzaXBfdHJhbnNwb3J0LWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggZW1wbG95ZWUgbmFtZSBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBlbXBsb3llZU5hbWUgLSBOYW1lIG9mIHRoZSBlbXBsb3llZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb25OdW1iZXIgLSBFeHRlbnNpb24gbnVtYmVyIChvcHRpb25hbClcbiAgICAgKi9cbiAgICB1cGRhdGVQYWdlSGVhZGVyKGVtcGxveWVlTmFtZSwgZXh0ZW5zaW9uTnVtYmVyKSB7XG4gICAgICAgIGxldCBoZWFkZXJUZXh0O1xuXG4gICAgICAgIGlmIChlbXBsb3llZU5hbWUgJiYgZW1wbG95ZWVOYW1lLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIC8vIEV4aXN0aW5nIGVtcGxveWVlIHdpdGggbmFtZVxuICAgICAgICAgICAgaGVhZGVyVGV4dCA9ICc8aSBjbGFzcz1cInVzZXIgb3V0bGluZSBpY29uXCI+PC9pPiAnICsgZW1wbG95ZWVOYW1lO1xuXG4gICAgICAgICAgICAvLyBBZGQgZXh0ZW5zaW9uIG51bWJlciBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25OdW1iZXIgJiYgZXh0ZW5zaW9uTnVtYmVyLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJUZXh0ICs9ICcgJmx0OycgKyBleHRlbnNpb25OdW1iZXIgKyAnJmd0Oyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOZXcgZW1wbG95ZWUgb3Igbm8gbmFtZSB5ZXRcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfQ3JlYXRlTmV3RXh0ZW5zaW9uIHx8ICdOZXcgRW1wbG95ZWUnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIG1haW4gaGVhZGVyIGNvbnRlbnRcbiAgICAgICAgJCgnaDEgLmNvbnRlbnQnKS5odG1sKGhlYWRlclRleHQpO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBEZWZpbmUgYSBjdXN0b20gcnVsZSBmb3IgalF1ZXJ5IGZvcm0gdmFsaWRhdGlvbiBuYW1lZCAnZXh0ZW5zaW9uUnVsZScuXG4gKiBUaGUgcnVsZSBjaGVja3MgaWYgYSBmb3J3YXJkaW5nIG51bWJlciBpcyBzZWxlY3RlZCBidXQgdGhlIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRoZSB2YWxpZGF0aW9uIHJlc3VsdC4gSWYgZm9yd2FyZGluZyBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgaXQgcmV0dXJucyBmYWxzZSAoaW52YWxpZCkuIE90aGVyd2lzZSwgaXQgcmV0dXJucyB0cnVlICh2YWxpZCkuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbnNpb25SdWxlID0gKCkgPT4ge1xuICAgIC8vIEdldCByaW5nIGxlbmd0aCBhbmQgZm9yd2FyZGluZyBudW1iZXIgZnJvbSB0aGUgZm9ybVxuICAgIGNvbnN0IGZ3ZFJpbmdMZW5ndGggPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk7XG4gICAgY29uc3QgZndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcblxuICAgIC8vIElmIGZvcndhcmRpbmcgbnVtYmVyIGlzIHNldCBhbmQgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LCByZXR1cm4gZmFsc2UgKGludmFsaWQpXG4gICAgaWYgKGZ3ZEZvcndhcmRpbmcubGVuZ3RoID4gMFxuICAgICAgICAmJiAoXG4gICAgICAgICAgICBmd2RSaW5nTGVuZ3RoID09PSAwXG4gICAgICAgICAgICB8fFxuICAgICAgICAgICAgZndkUmluZ0xlbmd0aCA9PT0gJydcbiAgICAgICAgKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCByZXR1cm4gdHJ1ZSAodmFsaWQpXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgbnVtYmVyIGlzIHRha2VuIGJ5IGFub3RoZXIgYWNjb3VudFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHBhcmFtZXRlciBoYXMgdGhlICdoaWRkZW4nIGNsYXNzLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG5cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5wYXNzd29yZFN0cmVuZ3RoID0gKCkgPT4ge1xuICAgIC8vIENoZWNrIGlmIHBhc3N3b3JkIHdpZGdldCBleGlzdHMgYW5kIHBhc3N3b3JkIG1lZXRzIG1pbmltdW0gc2NvcmVcbiAgICBpZiAoZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gUGFzc3dvcmRXaWRnZXQuZ2V0U3RhdGUoZXh0ZW5zaW9uLnBhc3N3b3JkV2lkZ2V0KTtcbiAgICAgICAgcmV0dXJuIHN0YXRlICYmIHN0YXRlLnNjb3JlID49IDMwOyAvLyBNaW5pbXVtIHNjb3JlIGZvciBleHRlbnNpb25zXG4gICAgfVxuICAgIHJldHVybiB0cnVlOyAvLyBQYXNzIHZhbGlkYXRpb24gaWYgd2lkZ2V0IG5vdCBpbml0aWFsaXplZFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFbXBsb3llZSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb24uaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=