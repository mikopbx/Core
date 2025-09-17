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
    // Set default values for email, mobile number, and extension number
    extension.defaultEmail = extension.$email.inputmask('unmaskedvalue');
    extension.defaultMobileNumber = extension.$mobile_number.inputmask('unmaskedvalue');
    extension.defaultNumber = extension.$number.inputmask('unmaskedvalue'); // Initialize tab menu items, accordions, and dropdown menus

    extension.$tabMenuItems.tab();
    $('#extensions-form .ui.accordion').accordion(); // Initialize popups for question icons and buttons

    $("i.question").popup();
    $('.popuped').popup(); // Prevent browser password manager for generated passwords

    extension.$sip_secret.on('focus', function () {
      $(this).attr('autocomplete', 'new-password');
    }); // Initialize the extension form

    extension.initializeForm(); // Initialize tooltips for advanced settings using unified system

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
    // Set the "oncomplete" event handler for the extension number input
    var timeoutNumberId;
    extension.$number.inputmask('option', {
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
      // Update form with new data if provided
      if (response.data) {
        extension.populateFormWithData(response.data);
      } // Update URL for new records (after first save)


      var currentId = extension.getRecordId();

      if ((!currentId || currentId === '') && response.data && response.data.id) {
        var newUrl = window.location.href.replace(/modify\/?$/, "modify/".concat(response.data.id));
        window.history.pushState(null, '', newUrl);
      } // Store the current extension number as the default number


      extension.defaultNumber = extension.$number.val(); // Update the phone representation with the new default number

      Extensions.updatePhoneRepresent(extension.defaultNumber);
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
    // Use unified silent population approach (same as IVR menu)
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
        } // Initialize password widget after data is loaded


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJGVtYWlsIiwicGFzc3dvcmRXaWRnZXQiLCIkZm9ybU9iaiIsIiR0YWJNZW51SXRlbXMiLCJmb3J3YXJkaW5nU2VsZWN0IiwidmFsaWRhdGVSdWxlcyIsIm51bWJlciIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImV4X1ZhbGlkYXRlTnVtYmVySXNFbXB0eSIsImV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUiLCJtb2JpbGVfbnVtYmVyIiwib3B0aW9uYWwiLCJleF9WYWxpZGF0ZU1vYmlsZUlzTm90Q29ycmVjdCIsImV4X1ZhbGlkYXRlTW9iaWxlTnVtYmVySXNEb3VibGUiLCJ1c2VyX2VtYWlsIiwiZXhfVmFsaWRhdGVFbWFpbEVtcHR5IiwidXNlcl91c2VybmFtZSIsImV4X1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSIsInNpcF9zZWNyZXQiLCJleF9WYWxpZGF0ZVNlY3JldEVtcHR5IiwiZXhfVmFsaWRhdGVTZWNyZXRXZWFrIiwiZXhfVmFsaWRhdGVQYXNzd29yZFRvb1dlYWsiLCJmd2RfcmluZ2xlbmd0aCIsImRlcGVuZHMiLCJleF9WYWxpZGF0ZVJpbmdpbmdCZWZvcmVGb3J3YXJkT3V0T2ZSYW5nZSIsImZ3ZF9mb3J3YXJkaW5nIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQiLCJmd2RfZm9yd2FyZGluZ29uYnVzeSIsImZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSIsImluaXRpYWxpemUiLCJpbnB1dG1hc2siLCJ0YWIiLCJhY2NvcmRpb24iLCJwb3B1cCIsIm9uIiwiYXR0ciIsImluaXRpYWxpemVGb3JtIiwiRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJleHRlbnNpb25Ub29sdGlwTWFuYWdlciIsImxvYWRFeHRlbnNpb25EYXRhIiwiY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlIiwicGFzdGVkVmFsdWUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJuZXdOdW1iZXIiLCJ1c2VySWQiLCJmb3JtIiwiRXh0ZW5zaW9ucyIsImNoZWNrQXZhaWxhYmlsaXR5IiwiY2JPbkNvbXBsZXRlRW1haWwiLCJuZXdFbWFpbCIsIlVzZXJzQVBJIiwiY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyIiwibmV3TW9iaWxlTnVtYmVyIiwibGVuZ3RoIiwidXNlck5hbWUiLCJjdXJyZW50RndkRm9yd2FyZGluZyIsImN1cnJlbnRGd2RPbkJ1c3kiLCJjdXJyZW50RndkT25VbmF2YWlsYWJsZSIsIiRmd2REcm9wZG93biIsImRyb3Bkb3duIiwiJGZ3ZE9uQnVzeURyb3Bkb3duIiwiJGZ3ZE9uVW5hdmFpbGFibGVEcm9wZG93biIsImNiT25DbGVhcmVkTW9iaWxlTnVtYmVyIiwiaW5pdGlhbGl6ZUlucHV0TWFza3MiLCJ0aW1lb3V0TnVtYmVySWQiLCJvbmNvbXBsZXRlIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIm1hc2tMaXN0IiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsIm9uY2xlYXJlZCIsIm9uQmVmb3JlUGFzdGUiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInBhc3RlZERhdGEiLCJvcmlnaW5hbEV2ZW50IiwiY2xpcGJvYXJkRGF0YSIsImdldERhdGEiLCJ3aW5kb3ciLCJjaGFyQXQiLCJwcm9jZXNzZWREYXRhIiwic2xpY2UiLCJpbnB1dCIsInN0YXJ0Iiwic2VsZWN0aW9uU3RhcnQiLCJlbmQiLCJzZWxlY3Rpb25FbmQiLCJjdXJyZW50VmFsdWUiLCJ2YWwiLCJuZXdWYWx1ZSIsInN1YnN0cmluZyIsInRyaWdnZXIiLCJ0aW1lb3V0RW1haWxJZCIsImZvY3Vzb3V0IiwicGhvbmUiLCJ0YXJnZXQiLCJnZW5lcmF0ZU5ld1NpcFBhc3N3b3JkIiwiJGdlbmVyYXRlQnRuIiwiY2xvc2VzdCIsImZpbmQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiZGlycnR5Iiwic3VibWl0TW9kZSIsInVzZXJfaWQiLCJjdXJyZW50SWQiLCJnZXRSZWNvcmRJZCIsIl9pc05ldyIsImNiQWZ0ZXJTZW5kRm9ybSIsInJlc3BvbnNlIiwicG9wdWxhdGVGb3JtV2l0aERhdGEiLCJpZCIsIm5ld1VybCIsImxvY2F0aW9uIiwiaHJlZiIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJ1cGRhdGVQaG9uZVJlcHJlc2VudCIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJGb3JtIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiRW1wbG95ZWVzQVBJIiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInJlY29yZElkIiwiYXBpSWQiLCJoaWRlIiwiZ2V0UmVjb3JkIiwiYXZhdGFyIiwic2hvd0Vycm9yIiwiZXJyb3IiLCJ1cmxQYXJ0cyIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImFmdGVyUG9wdWxhdGUiLCJmb3JtRGF0YSIsImluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhIiwidGV4dCIsInNldEF2YXRhclVybCIsInVzZXJfYXZhdGFyIiwiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImluaXRpYWxpemVQYXNzd29yZFdpZGdldCIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdCIsImV4Y2x1ZGVFeHRlbnNpb25zIiwiaW5jbHVkZUVtcHR5IiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJwbGFjZWhvbGRlciIsImV4X1NlbGVjdE5ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsIm9mZiIsIm5ld0V4dGVuc2lvbiIsInVwZGF0ZUZvcndhcmRpbmdEcm9wZG93bnNFeGNsdXNpb24iLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImZvcndhcmRpbmdGaWVsZHMiLCJmb3JFYWNoIiwiZmllbGROYW1lIiwiY3VycmVudFRleHQiLCJyZW1vdmUiLCJyZWZyZXNoRGF0YSIsImlzTmV3RXh0ZW5zaW9uIiwid2lkZ2V0IiwiUGFzc3dvcmRXaWRnZXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsIm9uR2VuZXJhdGUiLCJwYXNzd29yZCIsImRhdGFDaGFuZ2VkIiwib25WYWxpZGF0ZSIsImlzVmFsaWQiLCJzY29yZSIsIiRkcm9wZG93biIsIm9uQ2hhbmdlIiwiZm4iLCJleHRlbnNpb25SdWxlIiwiZndkUmluZ0xlbmd0aCIsImZ3ZEZvcndhcmRpbmciLCJleGlzdFJ1bGUiLCJ2YWx1ZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwicGFzc3dvcmRTdHJlbmd0aCIsInN0YXRlIiwiZ2V0U3RhdGUiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxTQUFTLEdBQUc7QUFDZEMsRUFBQUEsWUFBWSxFQUFFLEVBREE7QUFFZEMsRUFBQUEsYUFBYSxFQUFFLEVBRkQ7QUFHZEMsRUFBQUEsbUJBQW1CLEVBQUUsRUFIUDtBQUlkQyxFQUFBQSxPQUFPLEVBQUVDLENBQUMsQ0FBQyxTQUFELENBSkk7QUFLZEMsRUFBQUEsV0FBVyxFQUFFRCxDQUFDLENBQUMsYUFBRCxDQUxBO0FBTWRFLEVBQUFBLGNBQWMsRUFBRUYsQ0FBQyxDQUFDLGdCQUFELENBTkg7QUFPZEcsRUFBQUEsZUFBZSxFQUFFSCxDQUFDLENBQUMsaUJBQUQsQ0FQSjtBQVFkSSxFQUFBQSxxQkFBcUIsRUFBRUosQ0FBQyxDQUFDLHVCQUFELENBUlY7QUFTZEssRUFBQUEsNEJBQTRCLEVBQUVMLENBQUMsQ0FBQyw4QkFBRCxDQVRqQjtBQVVkTSxFQUFBQSxNQUFNLEVBQUVOLENBQUMsQ0FBQyxhQUFELENBVks7O0FBWWQ7QUFDSjtBQUNBO0FBQ0E7QUFDSU8sRUFBQUEsY0FBYyxFQUFFLElBaEJGOztBQWtCZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVSLENBQUMsQ0FBQyxrQkFBRCxDQXRCRzs7QUF3QmQ7QUFDSjtBQUNBO0FBQ0E7QUFDSVMsRUFBQUEsYUFBYSxFQUFFVCxDQUFDLENBQUMsd0JBQUQsQ0E1QkY7O0FBK0JkO0FBQ0o7QUFDQTtBQUNBO0FBQ0lVLEVBQUFBLGdCQUFnQixFQUFFLHFDQW5DSjs7QUFxQ2Q7QUFDSjtBQUNBO0FBQ0E7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LENBTWpDO0FBQ2hCLENBUEQ7QUFTQTtBQUNBO0FBQ0E7OztBQUNBMU4sQ0FBQyxDQUFDd08sUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjlPLEVBQUFBLFNBQVMsQ0FBQzhDLFVBQVY7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRW1wbG95ZWVzQVBJLCBGb3JtLFxuIElucHV0TWFza1BhdHRlcm5zLCBhdmF0YXIsIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IsIENsaXBib2FyZEpTLCBQYXNzd29yZFdpZGdldCwgVXNlck1lc3NhZ2UgKi9cblxuXG4vKipcbiAqIFRoZSBleHRlbnNpb24gb2JqZWN0LlxuICogTWFuYWdlcyB0aGUgb3BlcmF0aW9ucyBhbmQgYmVoYXZpb3JzIG9mIHRoZSBleHRlbnNpb24gZWRpdCBmb3JtXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25cbiAqL1xuY29uc3QgZXh0ZW5zaW9uID0ge1xuICAgIGRlZmF1bHRFbWFpbDogJycsXG4gICAgZGVmYXVsdE51bWJlcjogJycsXG4gICAgZGVmYXVsdE1vYmlsZU51bWJlcjogJycsXG4gICAgJG51bWJlcjogJCgnI251bWJlcicpLFxuICAgICRzaXBfc2VjcmV0OiAkKCcjc2lwX3NlY3JldCcpLFxuICAgICRtb2JpbGVfbnVtYmVyOiAkKCcjbW9iaWxlX251bWJlcicpLFxuICAgICRmd2RfZm9yd2FyZGluZzogJCgnI2Z3ZF9mb3J3YXJkaW5nJyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb25idXN5OiAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKSxcbiAgICAkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiAkKCcjZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyksXG4gICAgJGVtYWlsOiAkKCcjdXNlcl9lbWFpbCcpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHdpZGdldCBpbnN0YW5jZS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHBhc3N3b3JkV2lkZ2V0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2V4dGVuc2lvbnMtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYnVsYXIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51SXRlbXM6ICQoJyNleHRlbnNpb25zLW1lbnUgLml0ZW0nKSxcblxuXG4gICAgLyoqXG4gICAgICogU3RyaW5nIGZvciB0aGUgZm9yd2FyZGluZyBzZWxlY3QuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBmb3J3YXJkaW5nU2VsZWN0OiAnI2V4dGVuc2lvbnMtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG51bWJlcjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ251bWJlcicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIG1vYmlsZV9udW1iZXI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ21vYmlsZV9udW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXNrJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbW9iaWxlLW51bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX2VtYWlsOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUVtYWlsRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHVzZXJfdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNpcF9zZWNyZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzaXBfc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRXZWFrLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncGFzc3dvcmRTdHJlbmd0aCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlUGFzc3dvcmRUb29XZWFrIHx8ICdQYXNzd29yZCBpcyB0b28gd2VhayBmb3Igc2VjdXJpdHkgcmVxdWlyZW1lbnRzJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9yaW5nbGVuZ3RoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuICAgICAgICAgICAgZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb24gZm9ybSBhbmQgaXRzIGludGVyYWN0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIGVtYWlsLCBtb2JpbGUgbnVtYmVyLCBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgbWVudSBpdGVtcywgYWNjb3JkaW9ucywgYW5kIGRyb3Bkb3duIG1lbnVzXG4gICAgICAgIGV4dGVuc2lvbi4kdGFiTWVudUl0ZW1zLnRhYigpO1xuICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIC51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBmb3IgcXVlc3Rpb24gaWNvbnMgYW5kIGJ1dHRvbnNcbiAgICAgICAgJChcImkucXVlc3Rpb25cIikucG9wdXAoKTtcbiAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIGV4dGVuc2lvbi4kc2lwX3NlY3JldC5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gZm9ybVxuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGFkdmFuY2VkIHNldHRpbmdzIHVzaW5nIHVuaWZpZWQgc3lzdGVtXG4gICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFeHRlbnNpb25Ub29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gb2xkIG5hbWUgaWYgbmV3IGNsYXNzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBleHRlbnNpb24gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgZXh0ZW5zaW9uLmxvYWRFeHRlbnNpb25EYXRhKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBtb2JpbGUgbnVtYmVyIGZyb20gY2xpcGJvYXJkXG4gICAgICovXG4gICAgY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgYWZ0ZXIgYSBwaG9uZSBudW1iZXIgaGFzIGJlZW4gZW50ZXJlZCBjb21wbGV0ZWx5LlxuICAgICAqIEl0IHNlcnZlcyB0byBjaGVjayBpZiB0aGVyZSBhcmUgYW55IGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIHBob25lIG51bWJlcnMuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgYWZ0ZXIgcmVtb3ZpbmcgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBDYWxsIHRoZSBgY2hlY2tBdmFpbGFiaWxpdHlgIGZ1bmN0aW9uIG9uIGBFeHRlbnNpb25zYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgaXMgYWxyZWFkeSBpbiB1c2UuXG4gICAgICAgIC8vIFBhcmFtZXRlcnM6IGRlZmF1bHQgbnVtYmVyLCBuZXcgbnVtYmVyLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKG51bWJlciksIHVzZXIgaWRcbiAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE51bWJlciwgbmV3TnVtYmVyLCAnbnVtYmVyJywgdXNlcklkKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIG9uY2UgYW4gZW1haWwgYWRkcmVzcyBoYXMgYmVlbiBjb21wbGV0ZWx5IGVudGVyZWQuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGFmdGVyIHJlbW92aW5nIGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld0VtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGBjaGVja0F2YWlsYWJpbGl0eWAgZnVuY3Rpb24gb24gYFVzZXJzQVBJYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBlbWFpbCBpcyBhbHJlYWR5IGluIHVzZS5cbiAgICAgICAgLy8gUGFyYW1ldGVyczogZGVmYXVsdCBlbWFpbCwgbmV3IGVtYWlsLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKGVtYWlsKSwgdXNlciBpZFxuICAgICAgICBVc2Vyc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdEVtYWlsLCBuZXdFbWFpbCwnZW1haWwnLCB1c2VySWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBY3RpdmF0ZWQgd2hlbiBlbnRlcmluZyBhIG1vYmlsZSBwaG9uZSBudW1iZXIgaW4gdGhlIGVtcGxveWVlJ3MgcHJvZmlsZS5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgd2l0aG91dCBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gR2V0IHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBEeW5hbWljIGNoZWNrIHRvIHNlZSBpZiB0aGUgc2VsZWN0ZWQgbW9iaWxlIG51bWJlciBpcyBhdmFpbGFibGVcbiAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cbiAgICAgICAgLy8gUmVmaWxsIHRoZSBtb2JpbGUgZGlhbHN0cmluZyBpZiB0aGUgbmV3IG1vYmlsZSBudW1iZXIgaXMgZGlmZmVyZW50IHRoYW4gdGhlIGRlZmF1bHQgb3IgaWYgdGhlIG1vYmlsZSBkaWFsc3RyaW5nIGlzIGVtcHR5XG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyXG4gICAgICAgICAgICB8fCAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycpLmxlbmd0aCA9PT0gMClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2JpbGUgbnVtYmVyIGhhcyBjaGFuZ2VkXG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyB1c2VybmFtZSBmcm9tIHRoZSBmb3JtXG4gICAgICAgICAgICBjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9yd2FyZGluZyBmaWVsZHMgdGhhdCBtYXRjaCB0aGUgb2xkIG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEZ3ZE9uQnVzeSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZ3ZF9mb3J3YXJkaW5nIGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkRm9yd2FyZGluZyA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgcmluZyBsZW5ndGggaWYgZW1wdHlcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICAgICAgICAgICB8fCBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk9PT1cIjBcIikge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgNDUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVzZSBTZW1hbnRpYyBVSSBBUEkgZGlyZWN0bHkgb24gZHJvcGRvd24gZWxlbWVudFxuICAgICAgICAgICAgICAgIGNvbnN0ICRmd2REcm9wZG93biA9ICQoYCNmd2RfZm9yd2FyZGluZy1kcm9wZG93bmApO1xuICAgICAgICAgICAgICAgICRmd2REcm9wZG93bi5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKTtcbiAgICAgICAgICAgICAgICAkZndkRHJvcGRvd24uZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmd2RfZm9yd2FyZGluZ29uYnVzeSBpZiBpdCBtYXRjaGVzIG9sZCBtb2JpbGUgbnVtYmVyIChpbmNsdWRpbmcgZW1wdHkpXG4gICAgICAgICAgICBpZiAoY3VycmVudEZ3ZE9uQnVzeSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVc2UgU2VtYW50aWMgVUkgQVBJIGRpcmVjdGx5IG9uIGRyb3Bkb3duIGVsZW1lbnRcbiAgICAgICAgICAgICAgICBjb25zdCAkZndkT25CdXN5RHJvcGRvd24gPSAkKGAjZndkX2ZvcndhcmRpbmdvbmJ1c3ktZHJvcGRvd25gKTtcbiAgICAgICAgICAgICAgICAkZndkT25CdXN5RHJvcGRvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YCk7XG4gICAgICAgICAgICAgICAgJGZ3ZE9uQnVzeURyb3Bkb3duLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIGlmIGl0IG1hdGNoZXMgb2xkIG1vYmlsZSBudW1iZXIgKGluY2x1ZGluZyBlbXB0eSlcbiAgICAgICAgICAgIGlmIChjdXJyZW50RndkT25VbmF2YWlsYWJsZSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVc2UgU2VtYW50aWMgVUkgQVBJIGRpcmVjdGx5IG9uIGRyb3Bkb3duIGVsZW1lbnRcbiAgICAgICAgICAgICAgICBjb25zdCAkZndkT25VbmF2YWlsYWJsZURyb3Bkb3duID0gJChgI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZS1kcm9wZG93bmApO1xuICAgICAgICAgICAgICAgICRmd2RPblVuYXZhaWxhYmxlRHJvcGRvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YCk7XG4gICAgICAgICAgICAgICAgJGZ3ZE9uVW5hdmFpbGFibGVEcm9wZG93bi5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IHRoZSBuZXcgbW9iaWxlIG51bWJlciBhcyB0aGUgZGVmYXVsdFxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IG5ld01vYmlsZU51bWJlcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdoZW4gdGhlIG1vYmlsZSBwaG9uZSBudW1iZXIgaXMgY2xlYXJlZCBpbiB0aGUgZW1wbG95ZWUgY2FyZC5cbiAgICAgKi9cbiAgICBjYk9uQ2xlYXJlZE1vYmlsZU51bWJlcigpIHtcbiAgICAgICAgLy8gQ2hlY2sgY3VycmVudCBmb3J3YXJkaW5nIHZhbHVlcyBiZWZvcmUgY2xlYXJpbmdcbiAgICAgICAgY29uc3QgY3VycmVudEZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPbkJ1c3kgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5Jyk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIHRoZSAnbW9iaWxlX2RpYWxzdHJpbmcnIGFuZCAnbW9iaWxlX251bWJlcicgZmllbGRzIGluIHRoZSBmb3JtXG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX251bWJlcicsICcnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGN1cnJlbnRGd2RGb3J3YXJkaW5nID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIGNsZWFyIHRoZSAnZndkX3JpbmdsZW5ndGgnIGZpZWxkIGFuZCBzZXQgJ2Z3ZF9mb3J3YXJkaW5nJyB0byAtMVxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDApO1xuICAgICAgICAgICAgLy8gVXNlIFNlbWFudGljIFVJIEFQSSBkaXJlY3RseSBvbiBkcm9wZG93biBlbGVtZW50IHdpdGggcHJvcGVyIGNsZWFyaW5nXG4gICAgICAgICAgICBjb25zdCAkZndkRHJvcGRvd24gPSAkKCcjZndkX2ZvcndhcmRpbmctZHJvcGRvd24nKTtcbiAgICAgICAgICAgICRmd2REcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICRmd2REcm9wZG93bi5kcm9wZG93bignc2V0IHRleHQnLCAnLScpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiBidXN5IHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGN1cnJlbnRGd2RPbkJ1c3kgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBVc2UgU2VtYW50aWMgVUkgQVBJIGRpcmVjdGx5IG9uIGRyb3Bkb3duIGVsZW1lbnQgd2l0aCBwcm9wZXIgY2xlYXJpbmdcbiAgICAgICAgICAgIGNvbnN0ICRmd2RPbkJ1c3lEcm9wZG93biA9ICQoJyNmd2RfZm9yd2FyZGluZ29uYnVzeS1kcm9wZG93bicpO1xuICAgICAgICAgICAgJGZ3ZE9uQnVzeURyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgJGZ3ZE9uQnVzeURyb3Bkb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJyk7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIHVuYXZhaWxhYmxlIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGN1cnJlbnRGd2RPblVuYXZhaWxhYmxlID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gVXNlIFNlbWFudGljIFVJIEFQSSBkaXJlY3RseSBvbiBkcm9wZG93biBlbGVtZW50IHdpdGggcHJvcGVyIGNsZWFyaW5nXG4gICAgICAgICAgICBjb25zdCAkZndkT25VbmF2YWlsYWJsZURyb3Bkb3duID0gJCgnI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZS1kcm9wZG93bicpO1xuICAgICAgICAgICAgJGZ3ZE9uVW5hdmFpbGFibGVEcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICRmd2RPblVuYXZhaWxhYmxlRHJvcGRvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuICAgIH0sXG5cbiAgICBpbml0aWFsaXplSW5wdXRNYXNrcygpe1xuICAgICAgICAvLyBTZXQgdGhlIFwib25jb21wbGV0ZVwiIGV2ZW50IGhhbmRsZXIgZm9yIHRoZSBleHRlbnNpb24gbnVtYmVyIGlucHV0XG4gICAgICAgIGxldCB0aW1lb3V0TnVtYmVySWQ7XG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygnb3B0aW9uJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZTogKCk9PntcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWVvdXROdW1iZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXROdW1iZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIHdpdGggYSBkZWxheSBvZiAwLjUgc2Vjb25kc1xuICAgICAgICAgICAgICAgICAgICB0aW1lb3V0TnVtYmVySWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2tzIGZvciB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBjb25zdCBtYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrcyh7XG4gICAgICAgICAgICBpbnB1dG1hc2s6IHtcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAnIyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcjogJ1swLTldJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRpbmFsaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25jbGVhcmVkOiBleHRlbnNpb24uY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIsXG4gICAgICAgICAgICAgICAgb25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcbiAgICAgICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBleHRlbnNpb24uY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlLFxuICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICByZXBsYWNlOiAnOScsXG4gICAgICAgICAgICBsaXN0OiBtYXNrTGlzdCxcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTsgLy8g0J/RgNC10LTQvtGC0LLRgNCw0YnQsNC10Lwg0YHRgtCw0L3QtNCw0YDRgtC90L7QtSDQv9C+0LLQtdC00LXQvdC40LUg0LLRgdGC0LDQstC60LhcblxuICAgICAgICAgICAgLy8g0J/QvtC70YPRh9Cw0LXQvCDQstGB0YLQsNCy0LvQtdC90L3Ri9C1INC00LDQvdC90YvQtSDQuNC3INCx0YPRhNC10YDQsCDQvtCx0LzQtdC90LBcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5jbGlwYm9hcmREYXRhICYmIHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEpIHsgLy8g0JTQu9GPIElFXG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8g0J/RgNC+0LLQtdGA0Y/QtdC8LCDQvdCw0YfQuNC90LDQtdGC0YHRjyDQu9C4INCy0YHRgtCw0LLQu9C10L3QvdGL0Lkg0YLQtdC60YHRgiDRgSAnKydcbiAgICAgICAgICAgIGlmIChwYXN0ZWREYXRhLmNoYXJBdCgwKSA9PT0gJysnKSB7XG4gICAgICAgICAgICAgICAgLy8g0KHQvtGF0YDQsNC90Y/QtdC8ICcrJyDQuCDRg9C00LDQu9GP0LXQvCDQvtGB0YLQsNC70YzQvdGL0LUg0L3QtdC20LXQu9Cw0YLQtdC70YzQvdGL0LUg0YHQuNC80LLQvtC70YtcbiAgICAgICAgICAgICAgICB2YXIgcHJvY2Vzc2VkRGF0YSA9ICcrJyArIHBhc3RlZERhdGEuc2xpY2UoMSkucmVwbGFjZSgvXFxEL2csICcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8g0KPQtNCw0LvRj9C10Lwg0LLRgdC1INGB0LjQvNCy0L7Qu9GLLCDQutGA0L7QvNC1INGG0LjRhNGAXG4gICAgICAgICAgICAgICAgdmFyIHByb2Nlc3NlZERhdGEgPSBwYXN0ZWREYXRhLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vINCS0YHRgtCw0LLQu9GP0LXQvCDQvtGH0LjRidC10L3QvdGL0LUg0LTQsNC90L3Ri9C1INCyINC/0L7Qu9C1INCy0LLQvtC00LBcbiAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gaW5wdXQuc2VsZWN0aW9uU3RhcnQ7XG4gICAgICAgICAgICBjb25zdCBlbmQgPSBpbnB1dC5zZWxlY3Rpb25FbmQ7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkKGlucHV0KS52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gY3VycmVudFZhbHVlLnN1YnN0cmluZygwLCBzdGFydCkgKyBwcm9jZXNzZWREYXRhICsgY3VycmVudFZhbHVlLnN1YnN0cmluZyhlbmQpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzayhcInJlbW92ZVwiKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci52YWwobmV3VmFsdWUpO1xuICAgICAgICAgICAgLy8g0KLRgNC40LPQs9C10YDQuNC8INGB0L7QsdGL0YLQuNC1ICdpbnB1dCcg0LTQu9GPINC/0YDQuNC80LXQvdC10L3QuNGPINC80LDRgdC60Lgg0LLQstC+0LTQsFxuICAgICAgICAgICAgJChpbnB1dCkudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrIGZvciB0aGUgZW1haWwgaW5wdXRcbiAgICAgICAgbGV0IHRpbWVvdXRFbWFpbElkO1xuICAgICAgICBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygnZW1haWwnLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiAoKT0+e1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBwcmV2aW91cyB0aW1lciwgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKHRpbWVvdXRFbWFpbElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0RW1haWxJZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICAgICAgICB0aW1lb3V0RW1haWxJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwoKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwub24oJ3Bhc3RlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9BdHRhY2ggYSBmb2N1c291dCBldmVudCBsaXN0ZW5lciB0byB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuZm9jdXNvdXQoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxldCBwaG9uZSA9ICQoZS50YXJnZXQpLnZhbCgpLnJlcGxhY2UoL1teMC05XS9nLCBcIlwiKTtcbiAgICAgICAgICAgIGlmIChwaG9uZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAkKGUudGFyZ2V0KS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGEgbmV3IFNJUCBwYXNzd29yZC5cbiAgICAgKiBVc2VzIHRoZSBQYXNzd29yZFdpZGdldCBidXR0b24gbGlrZSBpbiBBTUkgbWFuYWdlci5cbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCkge1xuICAgICAgICAvLyBUcmlnZ2VyIHBhc3N3b3JkIGdlbmVyYXRpb24gdGhyb3VnaCB0aGUgd2lkZ2V0IGJ1dHRvbiAobGlrZSBpbiBBTUkpXG4gICAgICAgIGNvbnN0ICRnZW5lcmF0ZUJ0biA9IGV4dGVuc2lvbi4kc2lwX3NlY3JldC5jbG9zZXN0KCcudWkuaW5wdXQnKS5maW5kKCdidXR0b24uZ2VuZXJhdGUtcGFzc3dvcmQnKTtcbiAgICAgICAgaWYgKCRnZW5lcmF0ZUJ0bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkZ2VuZXJhdGVCdG4udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YS5tb2JpbGVfbnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIFJlbW92ZSBmb3JtIGNvbnRyb2wgZmllbGRzIHRoYXQgc2hvdWxkbid0IGJlIHNlbnQgdG8gc2VydmVyXG4gICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YS5kaXJydHk7XG4gICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YS5zdWJtaXRNb2RlO1xuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEudXNlcl9pZDsgLy8gUmVtb3ZlIHVzZXJfaWQgZmllbGQgdG8gcHJldmVudCB2YWxpZGF0aW9uIGlzc3Vlc1xuXG4gICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IHJlY29yZCAoY2hlY2sgaWYgd2UgaGF2ZSBhIHJlYWwgSUQpXG4gICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9IGV4dGVuc2lvbi5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBpZiAoIWN1cnJlbnRJZCB8fCBjdXJyZW50SWQgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBOZXcgZXh0ZW5zaW9uIC0gYWRkIF9pc05ldyBmbGFnIGZvciBwcm9wZXIgUE9TVC9QVVQgbWV0aG9kIHNlbGVjdGlvblxuICAgICAgICAgICAgcmVzdWx0LmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCBuZXcgZGF0YSBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24ucG9wdWxhdGVGb3JtV2l0aERhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzIChhZnRlciBmaXJzdCBzYXZlKVxuICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gZXh0ZW5zaW9uLmdldFJlY29yZElkKCk7XG4gICAgICAgICAgICBpZiAoKCFjdXJyZW50SWQgfHwgY3VycmVudElkID09PSAnJykgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvPyQvLCBgbW9kaWZ5LyR7cmVzcG9uc2UuZGF0YS5pZH1gKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgJycsIG5ld1VybCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBjdXJyZW50IGV4dGVuc2lvbiBudW1iZXIgYXMgdGhlIGRlZmF1bHQgbnVtYmVyXG4gICAgICAgICAgICBleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLnZhbCgpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHBob25lIHJlcHJlc2VudGF0aW9uIHdpdGggdGhlIG5ldyBkZWZhdWx0IG51bWJlclxuICAgICAgICAgICAgRXh0ZW5zaW9ucy51cGRhdGVQaG9uZVJlcHJlc2VudChleHRlbnNpb24uZGVmYXVsdE51bWJlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzIGZvciBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qcyBmb3IgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGV4dGVuc2lvbi4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZXh0ZW5zaW9uLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBFbXBsb3llZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyBjaGVja2JveCB2YWx1ZXMgYXJlIHNlbnQgYXMgdHJ1ZS9mYWxzZSBpbnN0ZWFkIG9mIFwib25cIi91bmRlZmluZWRcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFY1LjAgQXJjaGl0ZWN0dXJlOiBMb2FkIGV4dGVuc2lvbiBkYXRhIHZpYSBSRVNUIEFQSSAoc2ltaWxhciB0byBJVlIgbWVudSBwYXR0ZXJuKVxuICAgICAqL1xuICAgIGxvYWRFeHRlbnNpb25EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGV4dGVuc2lvbi5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlICduZXcnIGFzIElEIGZvciBuZXcgcmVjb3JkcyB0byBnZXQgZGVmYXVsdCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgY29uc3QgYXBpSWQgPSByZWNvcmRJZCA9PT0gJycgPyAnbmV3JyA6IHJlY29yZElkO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlkZSBtb25pdG9yaW5nIGVsZW1lbnRzIGZvciBuZXcgZW1wbG95ZWVzXG4gICAgICAgIGlmIChhcGlJZCA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgICQoJyNzdGF0dXMnKS5oaWRlKCk7IC8vIEhpZGUgc3RhdHVzIGxhYmVsXG4gICAgICAgICAgICAkKCdhW2RhdGEtdGFiPVwic3RhdHVzXCJdJykuaGlkZSgpOyAvLyBIaWRlIG1vbml0b3JpbmcgdGFiXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEVtcGxveWVlc0FQSS5nZXRSZWNvcmQoYXBpSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5wb3B1bGF0ZUZvcm1XaXRoRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBkZWZhdWx0IHZhbHVlcyBhZnRlciBkYXRhIGxvYWRcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IHJlc3BvbnNlLmRhdGEubnVtYmVyIHx8ICcnO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPSByZXNwb25zZS5kYXRhLnVzZXJfZW1haWwgfHwgJyc7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSByZXNwb25zZS5kYXRhLm1vYmlsZV9udW1iZXIgfHwgJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3Jkcywgc3RpbGwgaW5pdGlhbGl6ZSBhdmF0YXIgZXZlbiBpZiBBUEkgZmFpbHNcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGF2YXRhci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIGV4dGVuc2lvbiBkYXRhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTCAobGlrZSBJVlIgbWVudSlcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIFJFU1QgQVBJIChWNS4wIGNsZWFuIGRhdGEgYXJjaGl0ZWN0dXJlKVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybVdpdGhEYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggKHNhbWUgYXMgSVZSIG1lbnUpXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBWNS4wIHNwZWNpYWxpemVkIGNsYXNzZXMgLSBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGZvcm1EYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiBhbnkgVUkgZWxlbWVudHMgaWYgbmVlZGVkICBcbiAgICAgICAgICAgICAgICBpZiAoZm9ybURhdGEubnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb24tbnVtYmVyLWRpc3BsYXknKS50ZXh0KGZvcm1EYXRhLm51bWJlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgYXZhdGFyIGNvbXBvbmVudCBhZnRlciBmb3JtIHBvcHVsYXRpb25cbiAgICAgICAgICAgICAgICBhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBhdmF0YXIgVVJMIGR5bmFtaWNhbGx5IGZyb20gQVBJIGRhdGFcbiAgICAgICAgICAgICAgICBhdmF0YXIuc2V0QXZhdGFyVXJsKGZvcm1EYXRhLnVzZXJfYXZhdGFyKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBtb2RpZnkgc3RhdHVzIG1vbml0b3IgYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dCBtYXNrcyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplSW5wdXRNYXNrcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5PVEU6IEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKSB3aWxsIGJlIGNhbGxlZCBhdXRvbWF0aWNhbGx5IGJ5IEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjbGVhbiBkYXRhIC0gVjUuMCBBcmNoaXRlY3R1cmVcbiAgICAgKiBVc2VzIHNwZWNpYWxpemVkIGNsYXNzZXMgd2l0aCBjb21wbGV0ZSBhdXRvbWF0aW9uIChubyBvbkNoYW5nZSBjYWxsYmFja3MgbmVlZGVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRXh0ZW5zaW9uIGRyb3Bkb3ducyB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvbiAtIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZndkX2ZvcndhcmRpbmcnLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZ29uYnVzeScsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJywgXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEubnVtYmVyXSxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIEFQSSBkYXRhIC0gVjUuMCBiYXNlIGNsYXNzXG4gICAgICAgIFxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3NpcF9uZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6IGAvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109U0lQYCxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0TmV0d29ya0ZpbHRlciB8fCAnU2VsZWN0IE5ldHdvcmsgRmlsdGVyJyxcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFY1LjAgYXJjaGl0ZWN0dXJlIHdpdGggZW1wdHkgZm9ybSBzaG91bGQgbm90IGhhdmUgSFRNTCBlbnRpdGllcyBpc3N1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXMgLSByZWJ1aWxkIGRyb3Bkb3ducyB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIub2ZmKCdjaGFuZ2UuZHJvcGRvd24nKS5vbignY2hhbmdlLmRyb3Bkb3duJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV3RXh0ZW5zaW9uID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdudW1iZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG5ld0V4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleGNsdXNpb25zIGZvciBmb3J3YXJkaW5nIGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi51cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uKG5ld0V4dGVuc2lvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpO1xuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZm9yd2FyZGluZyBkcm9wZG93bnMgd2hlbiBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXNcbiAgICAgKi9cbiAgICB1cGRhdGVGb3J3YXJkaW5nRHJvcGRvd25zRXhjbHVzaW9uKG5ld0V4dGVuc2lvbikge1xuICAgICAgICBjb25zdCBmb3J3YXJkaW5nRmllbGRzID0gWydmd2RfZm9yd2FyZGluZycsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnXTtcbiAgICAgICAgXG4gICAgICAgIGZvcndhcmRpbmdGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJChgIyR7ZmllbGROYW1lfWApLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFRleHQgPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCkuZmluZCgnLnRleHQnKS50ZXh0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBvbGQgZHJvcGRvd25cbiAgICAgICAgICAgICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBkYXRhIG9iamVjdCB3aXRoIGN1cnJlbnQgdmFsdWUgZm9yIHJlaW5pdGlhbGl6aW5nXG4gICAgICAgICAgICBjb25zdCByZWZyZXNoRGF0YSA9IHt9O1xuICAgICAgICAgICAgcmVmcmVzaERhdGFbZmllbGROYW1lXSA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgIHJlZnJlc2hEYXRhW2Ake2ZpZWxkTmFtZX1fcmVwcmVzZW50YF0gPSBjdXJyZW50VGV4dDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVpbml0aWFsaXplIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdChmaWVsZE5hbWUsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtuZXdFeHRlbnNpb25dLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiByZWZyZXNoRGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgYWZ0ZXIgZm9ybSBkYXRhIGlzIGxvYWRlZFxuICAgICAqIFRoaXMgZW5zdXJlcyB2YWxpZGF0aW9uIG9ubHkgaGFwcGVucyBhZnRlciBwYXNzd29yZCBpcyBwb3B1bGF0ZWQgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmb3JtRGF0YSAtIFRoZSBmb3JtIGRhdGEgbG9hZGVkIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoZm9ybURhdGEpIHtcbiAgICAgICAgaWYgKCFleHRlbnNpb24uJHNpcF9zZWNyZXQubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhpZGUgYW55IGxlZ2FjeSBidXR0b25zIGlmIHRoZXkgZXhpc3RcbiAgICAgICAgJCgnLmNsaXBib2FyZCcpLmhpZGUoKTtcbiAgICAgICAgJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpLmhpZGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IGV4dGVuc2lvbiAobm8gSUQpIG9yIGV4aXN0aW5nIG9uZVxuICAgICAgICBjb25zdCBpc05ld0V4dGVuc2lvbiA9ICFmb3JtRGF0YS5pZCB8fCBmb3JtRGF0YS5pZCA9PT0gJyc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KGV4dGVuc2lvbi4kc2lwX3NlY3JldCwge1xuICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULCAgLy8gU29mdCB2YWxpZGF0aW9uIC0gc2hvdyB3YXJuaW5ncyBidXQgYWxsb3cgc3VibWlzc2lvblxuICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsICAgICAgICAgLy8gU2hvdyBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSwgICAgIC8vIFNob3cgc2hvdy9oaWRlIHBhc3N3b3JkIHRvZ2dsZVxuICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLCAgICAgICAgLy8gU2hvdyBjb3B5IHRvIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSwgICAgICAgIC8vIFNob3cgcGFzc3dvcmQgc3RyZW5ndGggYmFyXG4gICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsICAgICAgICAgICAvLyBTaG93IHZhbGlkYXRpb24gd2FybmluZ3NcbiAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSwgICAgICAgIC8vIFZhbGlkYXRlIGFzIHVzZXIgdHlwZXNcbiAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlLCAvLyBBbHdheXMgdmFsaWRhdGUgaWYgcGFzc3dvcmQgZmllbGQgaGFzIHZhbHVlXG4gICAgICAgICAgICBtaW5TY29yZTogMzAsICAgICAgICAgICAgICAgICAvLyBTSVAgcGFzc3dvcmRzIGhhdmUgbG93ZXIgbWluaW11bSBzY29yZSByZXF1aXJlbWVudFxuICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDMyLCAgICAgICAgICAgLy8gR2VuZXJhdGUgMzIgY2hhcmFjdGVyIHBhc3N3b3JkcyBmb3IgYmV0dGVyIHNlY3VyaXR5XG4gICAgICAgICAgICBvbkdlbmVyYXRlOiAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblZhbGlkYXRlOiAoaXNWYWxpZCwgc2NvcmUsIG1lc3NhZ2VzKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gT3B0aW9uYWw6IEhhbmRsZSB2YWxpZGF0aW9uIHJlc3VsdHMgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgLy8gVGhlIHdpZGdldCB3aWxsIGhhbmRsZSB2aXN1YWwgZmVlZGJhY2sgYXV0b21hdGljYWxseVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIHdpZGdldCBpbnN0YW5jZSBmb3IgbGF0ZXIgdXNlXG4gICAgICAgIGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBuZXcgZXh0ZW5zaW9ucyBvbmx5OiBhdXRvLWdlbmVyYXRlIHBhc3N3b3JkIGlmIGZpZWxkIGlzIGVtcHR5XG4gICAgICAgIGlmIChpc05ld0V4dGVuc2lvbiAmJiBleHRlbnNpb24uJHNpcF9zZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBleHRlbnNpb24uJHNpcF9zZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRnZW5lcmF0ZUJ0bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICRnZW5lcmF0ZUJ0bi50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRFRNRiBtb2RlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNzaXBfZHRtZm1vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfSk7XG4gICAgIH0sXG4gICAgICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJhbnNwb3J0IHByb3RvY29sIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNzaXBfdHJhbnNwb3J0LWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH0sXG59O1xuXG5cbi8qKlxuICogRGVmaW5lIGEgY3VzdG9tIHJ1bGUgZm9yIGpRdWVyeSBmb3JtIHZhbGlkYXRpb24gbmFtZWQgJ2V4dGVuc2lvblJ1bGUnLlxuICogVGhlIHJ1bGUgY2hlY2tzIGlmIGEgZm9yd2FyZGluZyBudW1iZXIgaXMgc2VsZWN0ZWQgYnV0IHRoZSByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUaGUgdmFsaWRhdGlvbiByZXN1bHQuIElmIGZvcndhcmRpbmcgaXMgc2V0IGFuZCByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQsIGl0IHJldHVybnMgZmFsc2UgKGludmFsaWQpLiBPdGhlcndpc2UsIGl0IHJldHVybnMgdHJ1ZSAodmFsaWQpLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9ICgpID0+IHtcbiAgICAvLyBHZXQgcmluZyBsZW5ndGggYW5kIGZvcndhcmRpbmcgbnVtYmVyIGZyb20gdGhlIGZvcm1cbiAgICBjb25zdCBmd2RSaW5nTGVuZ3RoID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpO1xuICAgIGNvbnN0IGZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG5cbiAgICAvLyBJZiBmb3J3YXJkaW5nIG51bWJlciBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgcmV0dXJuIGZhbHNlIChpbnZhbGlkKVxuICAgIGlmIChmd2RGb3J3YXJkaW5nLmxlbmd0aCA+IDBcbiAgICAgICAgJiYgKFxuICAgICAgICAgICAgZndkUmluZ0xlbmd0aCA9PT0gMFxuICAgICAgICAgICAgfHxcbiAgICAgICAgICAgIGZ3ZFJpbmdMZW5ndGggPT09ICcnXG4gICAgICAgICkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgcmV0dXJuIHRydWUgKHZhbGlkKVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIG51bWJlciBpcyB0YWtlbiBieSBhbm90aGVyIGFjY291bnRcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBwYXJhbWV0ZXIgaGFzIHRoZSAnaGlkZGVuJyBjbGFzcywgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMucGFzc3dvcmRTdHJlbmd0aCA9ICgpID0+IHtcbiAgICAvLyBDaGVjayBpZiBwYXNzd29yZCB3aWRnZXQgZXhpc3RzIGFuZCBwYXNzd29yZCBtZWV0cyBtaW5pbXVtIHNjb3JlXG4gICAgaWYgKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IFBhc3N3b3JkV2lkZ2V0LmdldFN0YXRlKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIHJldHVybiBzdGF0ZSAmJiBzdGF0ZS5zY29yZSA+PSAzMDsgLy8gTWluaW11bSBzY29yZSBmb3IgZXh0ZW5zaW9uc1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTsgLy8gUGFzcyB2YWxpZGF0aW9uIGlmIHdpZGdldCBub3QgaW5pdGlhbGl6ZWRcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgRW1wbG95ZWUgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uLmluaXRpYWxpemUoKTtcbn0pO1xuIl19