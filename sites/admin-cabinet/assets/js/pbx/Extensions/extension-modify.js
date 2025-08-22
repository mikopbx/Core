"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

/* global globalRootUrl, globalTranslate, Extensions, Form,
 InputMaskPatterns, avatar, extensionStatusLoopWorker, ClipboardJS, PasswordWidget */

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
  $qualify: $('#qualify'),
  $qualify_freq: $('#qualify-freq'),
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
    $('#extensions-form .ui.accordion').accordion();
    $('#extensions-form .dropdown').dropdown(); // Handle the change event of the "qualify" checkbox

    extension.$qualify.checkbox({
      onChange: function onChange() {
        if (extension.$qualify.checkbox('is checked')) {
          extension.$qualify_freq.removeClass('disabled');
        } else {
          extension.$qualify_freq.addClass('disabled');
        }
      }
    }); // Initialize the dropdown menu for forwarding select

    $(extension.forwardingSelect).dropdown(Extensions.getDropdownSettingsWithEmpty()); // Initialize password widget with full functionality for extensions

    if (extension.$sip_secret.length > 0) {
      // Hide any legacy buttons if they exist
      $('.clipboard').hide();
      $('#show-hide-password').hide();
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
        // Validate password when card is opened
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

      extension.passwordWidget = widget; // Auto-generate password if field is empty (for new extensions)

      if (extension.$sip_secret.val() === '') {
        // Use widget API to generate password
        setTimeout(function () {
          widget.generatePassword(widget);
        }, 100);
      }
    } // Set the "oncomplete" event handler for the extension number input


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
    }); //extension.$mobile_number.val(new libphonenumber.AsYouType().input('+'+extension.$mobile_number.val()));
    // Set up the input masks for the mobile number input

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
    }); // Initialize popups for question icons and buttons

    $("i.question").popup();
    $('.popuped').popup(); // Prevent browser password manager for generated passwords

    extension.$sip_secret.on('focus', function () {
      $(this).attr('autocomplete', 'new-password');
    }); // Add custom validation rule for password strength if not already defined

    if (typeof $.fn.form.settings.rules.passwordStrength === 'undefined') {
      $.fn.form.settings.rules.passwordStrength = function () {
        // Check if password widget exists and password meets minimum score
        if (extension.passwordWidget) {
          var state = PasswordWidget.getState(extension.passwordWidget);
          return state && state.score >= 30; // Minimum score for extensions
        }

        return true; // Pass validation if widget not initialized
      };
    } // Initialize the extension form


    extension.initializeForm(); // Initialize tooltips for advanced settings

    extension.initializeTooltips();
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
      var userName = extension.$formObj.form('get value', 'user_username'); // Check if call forwarding was set to the default mobile number

      if (extension.$formObj.form('get value', 'fwd_forwarding') === extension.defaultMobileNumber) {
        // If the ring length is empty, set it to 45
        if (extension.$formObj.form('get value', 'fwd_ringlength').length === 0 || extension.$formObj.form('get value', 'fwd_ringlength') === "0") {
          extension.$formObj.form('set value', 'fwd_ringlength', 45);
        } // Set the new forwarding mobile number in the dropdown and form


        extension.$fwd_forwarding.dropdown('set text', "".concat(userName, " <").concat(newMobileNumber, ">")).dropdown('set value', newMobileNumber);
        extension.$formObj.form('set value', 'fwd_forwarding', newMobileNumber);
      } // Check if call forwarding on busy was set to the default mobile number


      if (extension.$formObj.form('get value', 'fwd_forwardingonbusy') === extension.defaultMobileNumber) {
        // Set the new forwarding mobile number in the dropdown and form
        extension.$fwd_forwardingonbusy.dropdown('set text', "".concat(userName, " <").concat(newMobileNumber, ">")).dropdown('set value', newMobileNumber);
        extension.$formObj.form('set value', 'fwd_forwardingonbusy', newMobileNumber);
      } // Check if call forwarding on unavailable was set to the default mobile number


      if (extension.$formObj.form('get value', 'fwd_forwardingonunavailable') === extension.defaultMobileNumber) {
        // Set the new forwarding mobile number in the dropdown and form
        extension.$fwd_forwardingonunavailable.dropdown('set text', "".concat(userName, " <").concat(newMobileNumber, ">")).dropdown('set value', newMobileNumber);
        extension.$formObj.form('set value', 'fwd_forwardingonunavailable', newMobileNumber);
      }
    } // Set the new mobile number as the default


    extension.defaultMobileNumber = newMobileNumber;
  },

  /**
   * Called when the mobile phone number is cleared in the employee card.
   */
  cbOnClearedMobileNumber: function cbOnClearedMobileNumber() {
    // Clear the 'mobile_dialstring' and 'mobile_number' fields in the form
    extension.$formObj.form('set value', 'mobile_dialstring', '');
    extension.$formObj.form('set value', 'mobile_number', ''); // Check if forwarding was set to the mobile number

    if (extension.$formObj.form('get value', 'fwd_forwarding') === extension.defaultMobileNumber) {
      // If so, clear the 'fwd_ringlength' field and set 'fwd_forwarding' to -1
      extension.$formObj.form('set value', 'fwd_ringlength', 0);
      extension.$fwd_forwarding.dropdown('set text', '-').dropdown('set value', -1); //extension.$formObj.form('set value', 'fwd_forwarding', -1);
    } // Check if forwarding when busy was set to the mobile number


    if (extension.$formObj.form('get value', 'fwd_forwardingonbusy') === extension.defaultMobileNumber) {
      // If so, set 'fwd_forwardingonbusy' to -1
      extension.$fwd_forwardingonbusy.dropdown('set text', '-').dropdown('set value', -1); //extension.$formObj.form('set value', 'fwd_forwardingonbusy', -1);
    } // Check if forwarding when unavailable was set to the mobile number


    if (extension.$formObj.form('get value', 'fwd_forwardingonunavailable') === extension.defaultMobileNumber) {
      // If so, set 'fwd_forwardingonunavailable' to -1
      extension.$fwd_forwardingonunavailable.dropdown('set text', '-').dropdown('set value', -1); //extension.$formObj.form('set value', 'fwd_forwardingonunavailable', -1);
    } // Clear the default mobile number


    extension.defaultMobileNumber = '';
  },

  /**
   * Generate a new SIP password.
   * Uses the PasswordWidget API to generate a secure password.
   */
  generateNewSipPassword: function generateNewSipPassword() {
    // Use PasswordWidget API directly
    if (extension.passwordWidget) {
      extension.passwordWidget.generatePassword(extension.passwordWidget);
    }
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = extension.$formObj.form('get values');
    result.data.mobile_number = extension.$mobile_number.inputmask('unmaskedvalue');
    extension.$formObj.find('.checkbox').each(function (index, obj) {
      var input = $(obj).find('input');
      var id = input.attr('id');

      if ($(obj).checkbox('is checked')) {
        result.data[id] = '1';
      } else {
        result.data[id] = '0';
      }
    });
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (PbxApi.successTest(response)) {
      if (response.data.id !== undefined && extension.$formObj.form('get value', 'id') !== response.data.id) {
        window.location = "".concat(globalRootUrl, "extensions/modify/").concat(response.data.id);
      } // Store the current extension number as the default number


      extension.defaultNumber = extension.$number.val(); // Update the phone representation with the new default number

      Extensions.updatePhoneRepresent(extension.defaultNumber);
      Form.initialize();
    } else {
      UserMessage.showMultiString(response.messages);
    }
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = extension.$formObj;
    Form.url = "".concat(Config.pbxUrl, "/pbxcore/api/extensions/saveRecord"); // Form submission URL

    Form.validateRules = extension.validateRules; // Form validation rules

    Form.cbBeforeSendForm = extension.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = extension.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  },

  /**
   * Initialize tooltips for advanced settings fields
   */
  initializeTooltips: function initializeTooltips() {
    // Define tooltip configurations for each field
    var tooltipConfigs = {
      mobile_dialstring: extension.buildTooltipContent({
        header: globalTranslate.ex_MobileDialstringTooltip_header,
        description: globalTranslate.ex_MobileDialstringTooltip_desc,
        list: [{
          term: globalTranslate.ex_MobileDialstringTooltip_usage_header,
          definition: null
        }, {
          term: globalTranslate.ex_MobileDialstringTooltip_usage_format,
          definition: globalTranslate.ex_MobileDialstringTooltip_usage_format_desc
        }, {
          term: globalTranslate.ex_MobileDialstringTooltip_usage_provider,
          definition: globalTranslate.ex_MobileDialstringTooltip_usage_provider_desc
        }, {
          term: globalTranslate.ex_MobileDialstringTooltip_usage_forward,
          definition: globalTranslate.ex_MobileDialstringTooltip_usage_forward_desc
        }],
        examplesHeader: globalTranslate.ex_MobileDialstringTooltip_examples_header,
        examples: globalTranslate.ex_MobileDialstringTooltip_examples ? globalTranslate.ex_MobileDialstringTooltip_examples.split('|') : [],
        note: globalTranslate.ex_MobileDialstringTooltip_note
      }),
      sip_enableRecording: extension.buildTooltipContent({
        header: globalTranslate.ex_SipEnableRecordingTooltip_header,
        description: globalTranslate.ex_SipEnableRecordingTooltip_desc,
        note: globalTranslate.ex_SipEnableRecordingTooltip_note
      }),
      sip_dtmfmode: extension.buildTooltipContent({
        header: globalTranslate.ex_SipDtmfmodeTooltip_header,
        description: globalTranslate.ex_SipDtmfmodeTooltip_desc,
        list: {
          auto: globalTranslate.ex_SipDtmfmodeTooltip_list_auto_desc,
          rfc4733: globalTranslate.ex_SipDtmfmodeTooltip_list_rfc4733_desc,
          info: globalTranslate.ex_SipDtmfmodeTooltip_list_info_desc,
          inband: globalTranslate.ex_SipDtmfmodeTooltip_list_inband_desc,
          auto_info: globalTranslate.ex_SipDtmfmodeTooltip_list_auto_info_desc
        }
      }),
      sip_transport: extension.buildTooltipContent({
        header: globalTranslate.ex_SipTransportTooltip_header,
        description: globalTranslate.ex_SipTransportTooltip_desc,
        list: [{
          term: globalTranslate.ex_SipTransportTooltip_protocols_header,
          definition: null
        }, {
          term: globalTranslate.ex_SipTransportTooltip_udp_tcp,
          definition: globalTranslate.ex_SipTransportTooltip_udp_tcp_desc
        }, {
          term: globalTranslate.ex_SipTransportTooltip_udp,
          definition: globalTranslate.ex_SipTransportTooltip_udp_desc
        }, {
          term: globalTranslate.ex_SipTransportTooltip_tcp,
          definition: globalTranslate.ex_SipTransportTooltip_tcp_desc
        }, {
          term: globalTranslate.ex_SipTransportTooltip_tls,
          definition: globalTranslate.ex_SipTransportTooltip_tls_desc
        }, {
          term: globalTranslate.ex_SipTransportTooltip_recommendations_header,
          definition: null
        }],
        list2: [globalTranslate.ex_SipTransportTooltip_rec_compatibility]
      }),
      sip_networkfilterid: extension.buildTooltipContent({
        header: globalTranslate.ex_SipNetworkfilteridTooltip_header,
        description: globalTranslate.ex_SipNetworkfilteridTooltip_desc,
        warning: {
          header: globalTranslate.ex_SipNetworkfilteridTooltip_warning_header,
          text: globalTranslate.ex_SipNetworkfilteridTooltip_warning
        }
      }),
      sip_manualattributes: extension.buildTooltipContent({
        header: globalTranslate.ex_SipManualattributesTooltip_header,
        description: globalTranslate.ex_SipManualattributesTooltip_desc,
        list: {
          rtp_timeout: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_desc,
          rtp_timeout_hold: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_hold_desc,
          max_audio_streams: globalTranslate.ex_SipManualattributesTooltip_list_max_audio_streams_desc,
          device_state_busy_at: globalTranslate.ex_SipManualattributesTooltip_list_device_state_busy_at_desc,
          max_contacts: globalTranslate.ex_SipManualattributesTooltip_list_max_contacts_desc,
          remove_existing: globalTranslate.ex_SipManualattributesTooltip_list_remove_existing_desc
        },
        examples: ['[endpoint]', 'rtp_timeout = 300', 'rtp_timeout_hold = 300', 'max_audio_streams = 2', 'device_state_busy_at = 3', '', '[aor]', 'max_contacts=10', 'remove_existing = yes', '', '[acl]', 'permit=192.168.1.100', 'permit=192.168.1.101'],
        warning: {
          header: globalTranslate.ex_SipManualattributesTooltip_warning_header,
          text: globalTranslate.ex_SipManualattributesTooltip_warning
        }
      })
    }; // Initialize tooltip for each field info icon

    $('.field-info-icon').each(function (index, element) {
      var $icon = $(element);
      var fieldName = $icon.data('field');
      var content = tooltipConfigs[fieldName];

      if (content) {
        $icon.popup({
          html: content,
          position: 'top right',
          hoverable: true,
          delay: {
            show: 300,
            hide: 100
          },
          variation: 'flowing'
        });
      }
    });
  },

  /**
   * Build HTML content for tooltip popup
   * @param {Object} config - Configuration object for tooltip content
   * @returns {string} - HTML string for tooltip content
   */
  buildTooltipContent: function buildTooltipContent(config) {
    if (!config) return '';
    var html = ''; // Add header if exists

    if (config.header) {
      html += "<div class=\"header\"><strong>".concat(config.header, "</strong></div>");
      html += '<div class="ui divider"></div>';
    } // Add description if exists


    if (config.description) {
      html += "<p>".concat(config.description, "</p>");
    } // Add list items if exist


    if (config.list) {
      if (Array.isArray(config.list) && config.list.length > 0) {
        html += '<ul>';
        config.list.forEach(function (item) {
          if (typeof item === 'string') {
            html += "<li>".concat(item, "</li>");
          } else if (item.term && item.definition === null) {
            // Header item without definition
            html += "</ul><p><strong>".concat(item.term, "</strong></p><ul>");
          } else if (item.term && item.definition) {
            html += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
          }
        });
        html += '</ul>';
      } else if (_typeof(config.list) === 'object') {
        // Old format - object with key-value pairs
        html += '<ul>';
        Object.entries(config.list).forEach(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              term = _ref2[0],
              definition = _ref2[1];

          html += "<li><strong>".concat(term, ":</strong> ").concat(definition, "</li>");
        });
        html += '</ul>';
      }
    } // Add additional lists (list2, list3, etc.)


    for (var i = 2; i <= 10; i++) {
      var listName = "list".concat(i);

      if (config[listName] && config[listName].length > 0) {
        html += '<ul>';
        config[listName].forEach(function (item) {
          if (typeof item === 'string') {
            html += "<li>".concat(item, "</li>");
          } else if (item.term && item.definition === null) {
            html += "</ul><p><strong>".concat(item.term, "</strong></p><ul>");
          } else if (item.term && item.definition) {
            html += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
          }
        });
        html += '</ul>';
      }
    } // Add warning if exists


    if (config.warning) {
      html += '<div class="ui small orange message">';

      if (config.warning.header) {
        html += "<div class=\"header\">";
        html += "<i class=\"exclamation triangle icon\"></i> ";
        html += config.warning.header;
        html += "</div>";
      }

      html += config.warning.text;
      html += '</div>';
    } // Add code examples if exist


    if (config.examples && config.examples.length > 0) {
      if (config.examplesHeader) {
        html += "<p><strong>".concat(config.examplesHeader, ":</strong></p>");
      }

      html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
      html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">'; // Process examples with syntax highlighting for sections

      config.examples.forEach(function (line, index) {
        if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
          // Section header
          if (index > 0) html += '\n';
          html += "<span style=\"color: #0084b4; font-weight: bold;\">".concat(line, "</span>");
        } else if (line.includes('=')) {
          // Parameter line
          var _line$split = line.split('=', 2),
              _line$split2 = _slicedToArray(_line$split, 2),
              param = _line$split2[0],
              value = _line$split2[1];

          html += "\n<span style=\"color: #7a3e9d;\">".concat(param, "</span>=<span style=\"color: #cf4a4c;\">").concat(value, "</span>");
        } else {
          // Regular line
          html += line ? "\n".concat(line) : '';
        }
      });
      html += '</pre>';
      html += '</div>';
    } // Add note if exists


    if (config.note) {
      html += "<p><em>".concat(config.note, "</em></p>");
    }

    return html;
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
/**
 *  Initialize Employee form on document ready
 */


$(document).ready(function () {
  extension.initialize();
  avatar.initialize();
  extensionStatusLoopWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJHF1YWxpZnkiLCIkcXVhbGlmeV9mcmVxIiwiJGVtYWlsIiwicGFzc3dvcmRXaWRnZXQiLCIkZm9ybU9iaiIsIiR0YWJNZW51SXRlbXMiLCJmb3J3YXJkaW5nU2VsZWN0IiwidmFsaWRhdGVSdWxlcyIsIm51bWJlciIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImV4X1ZhbGlkYXRlTnVtYmVySXNFbXB0eSIsImV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUiLCJtb2JpbGVfbnVtYmVyIiwib3B0aW9uYWwiLCJleF9WYWxpZGF0ZU1vYmlsZUlzTm90Q29ycmVjdCIsImV4X1ZhbGlkYXRlTW9iaWxlTnVtYmVySXNEb3VibGUiLCJ1c2VyX2VtYWlsIiwiZXhfVmFsaWRhdGVFbWFpbEVtcHR5IiwidXNlcl91c2VybmFtZSIsImV4X1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSIsInNpcF9zZWNyZXQiLCJleF9WYWxpZGF0ZVNlY3JldEVtcHR5IiwiZXhfVmFsaWRhdGVTZWNyZXRXZWFrIiwiZXhfVmFsaWRhdGVQYXNzd29yZFRvb1dlYWsiLCJmd2RfcmluZ2xlbmd0aCIsImRlcGVuZHMiLCJleF9WYWxpZGF0ZVJpbmdpbmdCZWZvcmVGb3J3YXJkT3V0T2ZSYW5nZSIsImZ3ZF9mb3J3YXJkaW5nIiwiZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQiLCJmd2RfZm9yd2FyZGluZ29uYnVzeSIsImZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSIsImluaXRpYWxpemUiLCJpbnB1dG1hc2siLCJ0YWIiLCJhY2NvcmRpb24iLCJkcm9wZG93biIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJsZW5ndGgiLCJoaWRlIiwid2lkZ2V0IiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwidmFsaWRhdGlvbiIsIlZBTElEQVRJT04iLCJTT0ZUIiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJvbkdlbmVyYXRlIiwicGFzc3dvcmQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJvblZhbGlkYXRlIiwiaXNWYWxpZCIsInNjb3JlIiwibWVzc2FnZXMiLCJ2YWwiLCJzZXRUaW1lb3V0IiwiZ2VuZXJhdGVQYXNzd29yZCIsInRpbWVvdXROdW1iZXJJZCIsIm9uY29tcGxldGUiLCJjbGVhclRpbWVvdXQiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJvbiIsIm1hc2tMaXN0IiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsIm9uY2xlYXJlZCIsImNiT25DbGVhcmVkTW9iaWxlTnVtYmVyIiwiY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyIiwib25CZWZvcmVQYXN0ZSIsImNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZSIsInNob3dNYXNrT25Ib3ZlciIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5IiwiZSIsInByZXZlbnREZWZhdWx0IiwicGFzdGVkRGF0YSIsIm9yaWdpbmFsRXZlbnQiLCJjbGlwYm9hcmREYXRhIiwiZ2V0RGF0YSIsIndpbmRvdyIsImNoYXJBdCIsInByb2Nlc3NlZERhdGEiLCJzbGljZSIsImlucHV0Iiwic3RhcnQiLCJzZWxlY3Rpb25TdGFydCIsImVuZCIsInNlbGVjdGlvbkVuZCIsImN1cnJlbnRWYWx1ZSIsIm5ld1ZhbHVlIiwic3Vic3RyaW5nIiwidHJpZ2dlciIsInRpbWVvdXRFbWFpbElkIiwiY2JPbkNvbXBsZXRlRW1haWwiLCJmb2N1c291dCIsInBob25lIiwidGFyZ2V0IiwicG9wdXAiLCJhdHRyIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJwYXNzd29yZFN0cmVuZ3RoIiwic3RhdGUiLCJnZXRTdGF0ZSIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwicGFzdGVkVmFsdWUiLCJuZXdOdW1iZXIiLCJ1c2VySWQiLCJjaGVja0F2YWlsYWJpbGl0eSIsIm5ld0VtYWlsIiwiVXNlcnNBUEkiLCJuZXdNb2JpbGVOdW1iZXIiLCJ1c2VyTmFtZSIsImdlbmVyYXRlTmV3U2lwUGFzc3dvcmQiLCJjYkJlZm9yZVNlbmRGb3JtIiwicmVzdWx0IiwiZGF0YSIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJpZCIsImNiQWZ0ZXJTZW5kRm9ybSIsInJlc3BvbnNlIiwiUGJ4QXBpIiwic3VjY2Vzc1Rlc3QiLCJ1bmRlZmluZWQiLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJ1cGRhdGVQaG9uZVJlcHJlc2VudCIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwidXJsIiwiQ29uZmlnIiwicGJ4VXJsIiwidG9vbHRpcENvbmZpZ3MiLCJtb2JpbGVfZGlhbHN0cmluZyIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJoZWFkZXIiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2Rlc2MiLCJ0ZXJtIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2Zvcm1hdCIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2Zvcm1hdF9kZXNjIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfcHJvdmlkZXIiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9wcm92aWRlcl9kZXNjIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9yd2FyZCIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmRfZGVzYyIsImV4YW1wbGVzSGVhZGVyIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZXhhbXBsZXMiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlcyIsInNwbGl0Iiwibm90ZSIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX25vdGUiLCJzaXBfZW5hYmxlUmVjb3JkaW5nIiwiZXhfU2lwRW5hYmxlUmVjb3JkaW5nVG9vbHRpcF9oZWFkZXIiLCJleF9TaXBFbmFibGVSZWNvcmRpbmdUb29sdGlwX2Rlc2MiLCJleF9TaXBFbmFibGVSZWNvcmRpbmdUb29sdGlwX25vdGUiLCJzaXBfZHRtZm1vZGUiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfaGVhZGVyIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2Rlc2MiLCJhdXRvIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0b19kZXNjIiwicmZjNDczMyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzNfZGVzYyIsImluZm8iLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmZvX2Rlc2MiLCJpbmJhbmQiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmJhbmRfZGVzYyIsImF1dG9faW5mbyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9faW5mb19kZXNjIiwic2lwX3RyYW5zcG9ydCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfaGVhZGVyIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9wcm90b2NvbHNfaGVhZGVyIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfdGNwIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfdGNwX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3RjcCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3RscyIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJsaXN0MiIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHkiLCJzaXBfbmV0d29ya2ZpbHRlcmlkIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9oZWFkZXIiLCJleF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX2Rlc2MiLCJ3YXJuaW5nIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsInRleHQiLCJleF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX3dhcm5pbmciLCJzaXBfbWFudWFsYXR0cmlidXRlcyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlciIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MiLCJydHBfdGltZW91dCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfZGVzYyIsInJ0cF90aW1lb3V0X2hvbGQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2hvbGRfZGVzYyIsIm1heF9hdWRpb19zdHJlYW1zIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfYXVkaW9fc3RyZWFtc19kZXNjIiwiZGV2aWNlX3N0YXRlX2J1c3lfYXQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RldmljZV9zdGF0ZV9idXN5X2F0X2Rlc2MiLCJtYXhfY29udGFjdHMiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9jb250YWN0c19kZXNjIiwicmVtb3ZlX2V4aXN0aW5nIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfZXhpc3RpbmdfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZyIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImNvbnRlbnQiLCJodG1sIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJkZWxheSIsInNob3ciLCJ2YXJpYXRpb24iLCJjb25maWciLCJBcnJheSIsImlzQXJyYXkiLCJmb3JFYWNoIiwiaXRlbSIsIk9iamVjdCIsImVudHJpZXMiLCJpIiwibGlzdE5hbWUiLCJsaW5lIiwidHJpbSIsInN0YXJ0c1dpdGgiLCJlbmRzV2l0aCIsImluY2x1ZGVzIiwicGFyYW0iLCJ2YWx1ZSIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSIsImF2YXRhciIsImV4dGVuc2lvblN0YXR1c0xvb3BXb3Jr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Q0FBQzlPLFVBQVA7QUFDQStPLEVBQUFBLHlCQUF5QixDQUFDL08sVUFBMUI7QUFDSCxDQUpEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRm9ybSxcbiBJbnB1dE1hc2tQYXR0ZXJucywgYXZhdGFyLCBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLCBDbGlwYm9hcmRKUywgUGFzc3dvcmRXaWRnZXQgKi9cblxuXG4vKipcbiAqIFRoZSBleHRlbnNpb24gb2JqZWN0LlxuICogTWFuYWdlcyB0aGUgb3BlcmF0aW9ucyBhbmQgYmVoYXZpb3JzIG9mIHRoZSBleHRlbnNpb24gZWRpdCBmb3JtXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25cbiAqL1xuY29uc3QgZXh0ZW5zaW9uID0ge1xuICAgIGRlZmF1bHRFbWFpbDogJycsXG4gICAgZGVmYXVsdE51bWJlcjogJycsXG4gICAgZGVmYXVsdE1vYmlsZU51bWJlcjogJycsXG4gICAgJG51bWJlcjogJCgnI251bWJlcicpLFxuICAgICRzaXBfc2VjcmV0OiAkKCcjc2lwX3NlY3JldCcpLFxuICAgICRtb2JpbGVfbnVtYmVyOiAkKCcjbW9iaWxlX251bWJlcicpLFxuICAgICRmd2RfZm9yd2FyZGluZzogJCgnI2Z3ZF9mb3J3YXJkaW5nJyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb25idXN5OiAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKSxcbiAgICAkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiAkKCcjZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyksXG4gICAgJHF1YWxpZnk6ICQoJyNxdWFsaWZ5JyksXG4gICAgJHF1YWxpZnlfZnJlcTogJCgnI3F1YWxpZnktZnJlcScpLFxuICAgICRlbWFpbDogJCgnI3VzZXJfZW1haWwnKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQYXNzd29yZCB3aWRnZXQgaW5zdGFuY2UuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBwYXNzd29yZFdpZGdldDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNleHRlbnNpb25zLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJ1bGFyIG1lbnUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdGFiTWVudUl0ZW1zOiAkKCcjZXh0ZW5zaW9ucy1tZW51IC5pdGVtJyksXG5cbiAgICBmb3J3YXJkaW5nU2VsZWN0OiAnI2V4dGVuc2lvbnMtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG51bWJlcjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ251bWJlcicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIG1vYmlsZV9udW1iZXI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ21vYmlsZV9udW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXNrJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbW9iaWxlLW51bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX2VtYWlsOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUVtYWlsRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHVzZXJfdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNpcF9zZWNyZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzaXBfc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRXZWFrLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncGFzc3dvcmRTdHJlbmd0aCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlUGFzc3dvcmRUb29XZWFrIHx8ICdQYXNzd29yZCBpcyB0b28gd2VhayBmb3Igc2VjdXJpdHkgcmVxdWlyZW1lbnRzJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9yaW5nbGVuZ3RoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuICAgICAgICAgICAgZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb24gZm9ybSBhbmQgaXRzIGludGVyYWN0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIGVtYWlsLCBtb2JpbGUgbnVtYmVyLCBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgbWVudSBpdGVtcywgYWNjb3JkaW9ucywgYW5kIGRyb3Bkb3duIG1lbnVzXG4gICAgICAgIGV4dGVuc2lvbi4kdGFiTWVudUl0ZW1zLnRhYigpO1xuICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIC51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcbiAgICAgICAgJCgnI2V4dGVuc2lvbnMtZm9ybSAuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IG9mIHRoZSBcInF1YWxpZnlcIiBjaGVja2JveFxuICAgICAgICBleHRlbnNpb24uJHF1YWxpZnkuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kcXVhbGlmeS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kcXVhbGlmeV9mcmVxLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kcXVhbGlmeV9mcmVxLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRyb3Bkb3duIG1lbnUgZm9yIGZvcndhcmRpbmcgc2VsZWN0XG4gICAgICAgICQoZXh0ZW5zaW9uLmZvcndhcmRpbmdTZWxlY3QpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgpKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCB3aXRoIGZ1bGwgZnVuY3Rpb25hbGl0eSBmb3IgZXh0ZW5zaW9uc1xuICAgICAgICBpZiAoZXh0ZW5zaW9uLiRzaXBfc2VjcmV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEhpZGUgYW55IGxlZ2FjeSBidXR0b25zIGlmIHRoZXkgZXhpc3RcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJykuaGlkZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KGV4dGVuc2lvbi4kc2lwX3NlY3JldCwge1xuICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVCwgIC8vIFNvZnQgdmFsaWRhdGlvbiAtIHNob3cgd2FybmluZ3MgYnV0IGFsbG93IHN1Ym1pc3Npb25cbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSwgICAgICAgICAvLyBTaG93IGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSwgICAgIC8vIFNob3cgc2hvdy9oaWRlIHBhc3N3b3JkIHRvZ2dsZVxuICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSwgICAgICAgIC8vIFNob3cgY29weSB0byBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLCAgICAgICAgLy8gU2hvdyBwYXNzd29yZCBzdHJlbmd0aCBiYXJcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsICAgICAgICAgICAvLyBTaG93IHZhbGlkYXRpb24gd2FybmluZ3NcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsICAgICAgICAvLyBWYWxpZGF0ZSBhcyB1c2VyIHR5cGVzXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWUsICAgICAgICAgICAgLy8gVmFsaWRhdGUgcGFzc3dvcmQgd2hlbiBjYXJkIGlzIG9wZW5lZFxuICAgICAgICAgICAgICAgIG1pblNjb3JlOiAzMCwgICAgICAgICAgICAgICAgIC8vIFNJUCBwYXNzd29yZHMgaGF2ZSBsb3dlciBtaW5pbXVtIHNjb3JlIHJlcXVpcmVtZW50XG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDMyLCAgICAgICAgICAgLy8gR2VuZXJhdGUgMzIgY2hhcmFjdGVyIHBhc3N3b3JkcyBmb3IgYmV0dGVyIHNlY3VyaXR5XG4gICAgICAgICAgICAgICAgb25HZW5lcmF0ZTogKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uVmFsaWRhdGU6IChpc1ZhbGlkLCBzY29yZSwgbWVzc2FnZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT3B0aW9uYWw6IEhhbmRsZSB2YWxpZGF0aW9uIHJlc3VsdHMgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZSB3aWRnZXQgd2lsbCBoYW5kbGUgdmlzdWFsIGZlZWRiYWNrIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgd2lkZ2V0IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgICAgIGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBpZiBmaWVsZCBpcyBlbXB0eSAoZm9yIG5ldyBleHRlbnNpb25zKVxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kc2lwX3NlY3JldC52YWwoKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2Ugd2lkZ2V0IEFQSSB0byBnZW5lcmF0ZSBwYXNzd29yZFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB3aWRnZXQuZ2VuZXJhdGVQYXNzd29yZCh3aWRnZXQpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdGhlIFwib25jb21wbGV0ZVwiIGV2ZW50IGhhbmRsZXIgZm9yIHRoZSBleHRlbnNpb24gbnVtYmVyIGlucHV0XG4gICAgICAgIGxldCB0aW1lb3V0TnVtYmVySWQ7XG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygnb3B0aW9uJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZTogKCk9PntcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWVvdXROdW1iZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXROdW1iZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIHdpdGggYSBkZWxheSBvZiAwLjUgc2Vjb25kc1xuICAgICAgICAgICAgICAgICAgICB0aW1lb3V0TnVtYmVySWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2V4dGVuc2lvbi4kbW9iaWxlX251bWJlci52YWwobmV3IGxpYnBob25lbnVtYmVyLkFzWW91VHlwZSgpLmlucHV0KCcrJytleHRlbnNpb24uJG1vYmlsZV9udW1iZXIudmFsKCkpKTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2tzIGZvciB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBjb25zdCBtYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrcyh7XG4gICAgICAgICAgICBpbnB1dG1hc2s6IHtcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAnIyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcjogJ1swLTldJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRpbmFsaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25jbGVhcmVkOiBleHRlbnNpb24uY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIsXG4gICAgICAgICAgICAgICAgb25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcbiAgICAgICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBleHRlbnNpb24uY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlLFxuICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICByZXBsYWNlOiAnOScsXG4gICAgICAgICAgICBsaXN0OiBtYXNrTGlzdCxcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTsgLy8g0J/RgNC10LTQvtGC0LLRgNCw0YnQsNC10Lwg0YHRgtCw0L3QtNCw0YDRgtC90L7QtSDQv9C+0LLQtdC00LXQvdC40LUg0LLRgdGC0LDQstC60LhcblxuICAgICAgICAgICAgLy8g0J/QvtC70YPRh9Cw0LXQvCDQstGB0YLQsNCy0LvQtdC90L3Ri9C1INC00LDQvdC90YvQtSDQuNC3INCx0YPRhNC10YDQsCDQvtCx0LzQtdC90LBcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5jbGlwYm9hcmREYXRhICYmIHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEpIHsgLy8g0JTQu9GPIElFXG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8g0J/RgNC+0LLQtdGA0Y/QtdC8LCDQvdCw0YfQuNC90LDQtdGC0YHRjyDQu9C4INCy0YHRgtCw0LLQu9C10L3QvdGL0Lkg0YLQtdC60YHRgiDRgSAnKydcbiAgICAgICAgICAgIGlmIChwYXN0ZWREYXRhLmNoYXJBdCgwKSA9PT0gJysnKSB7XG4gICAgICAgICAgICAgICAgLy8g0KHQvtGF0YDQsNC90Y/QtdC8ICcrJyDQuCDRg9C00LDQu9GP0LXQvCDQvtGB0YLQsNC70YzQvdGL0LUg0L3QtdC20LXQu9Cw0YLQtdC70YzQvdGL0LUg0YHQuNC80LLQvtC70YtcbiAgICAgICAgICAgICAgICB2YXIgcHJvY2Vzc2VkRGF0YSA9ICcrJyArIHBhc3RlZERhdGEuc2xpY2UoMSkucmVwbGFjZSgvXFxEL2csICcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8g0KPQtNCw0LvRj9C10Lwg0LLRgdC1INGB0LjQvNCy0L7Qu9GLLCDQutGA0L7QvNC1INGG0LjRhNGAXG4gICAgICAgICAgICAgICAgdmFyIHByb2Nlc3NlZERhdGEgPSBwYXN0ZWREYXRhLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vINCS0YHRgtCw0LLQu9GP0LXQvCDQvtGH0LjRidC10L3QvdGL0LUg0LTQsNC90L3Ri9C1INCyINC/0L7Qu9C1INCy0LLQvtC00LBcbiAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gaW5wdXQuc2VsZWN0aW9uU3RhcnQ7XG4gICAgICAgICAgICBjb25zdCBlbmQgPSBpbnB1dC5zZWxlY3Rpb25FbmQ7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkKGlucHV0KS52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gY3VycmVudFZhbHVlLnN1YnN0cmluZygwLCBzdGFydCkgKyBwcm9jZXNzZWREYXRhICsgY3VycmVudFZhbHVlLnN1YnN0cmluZyhlbmQpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzayhcInJlbW92ZVwiKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci52YWwobmV3VmFsdWUpO1xuICAgICAgICAgICAgLy8g0KLRgNC40LPQs9C10YDQuNC8INGB0L7QsdGL0YLQuNC1ICdpbnB1dCcg0LTQu9GPINC/0YDQuNC80LXQvdC10L3QuNGPINC80LDRgdC60Lgg0LLQstC+0LTQsFxuICAgICAgICAgICAgJChpbnB1dCkudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrIGZvciB0aGUgZW1haWwgaW5wdXRcbiAgICAgICAgbGV0IHRpbWVvdXRFbWFpbElkO1xuICAgICAgICBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygnZW1haWwnLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiAoKT0+e1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBwcmV2aW91cyB0aW1lciwgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKHRpbWVvdXRFbWFpbElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0RW1haWxJZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICAgICAgICB0aW1lb3V0RW1haWxJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwoKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwub24oJ3Bhc3RlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9BdHRhY2ggYSBmb2N1c291dCBldmVudCBsaXN0ZW5lciB0byB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuZm9jdXNvdXQoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxldCBwaG9uZSA9ICQoZS50YXJnZXQpLnZhbCgpLnJlcGxhY2UoL1teMC05XS9nLCBcIlwiKTtcbiAgICAgICAgICAgIGlmIChwaG9uZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAkKGUudGFyZ2V0KS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBmb3IgcXVlc3Rpb24gaWNvbnMgYW5kIGJ1dHRvbnNcbiAgICAgICAgJChcImkucXVlc3Rpb25cIikucG9wdXAoKTtcbiAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIGV4dGVuc2lvbi4kc2lwX3NlY3JldC5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBwYXNzd29yZCBzdHJlbmd0aCBpZiBub3QgYWxyZWFkeSBkZWZpbmVkXG4gICAgICAgIGlmICh0eXBlb2YgJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnBhc3N3b3JkU3RyZW5ndGggPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAkLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMucGFzc3dvcmRTdHJlbmd0aCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBwYXNzd29yZCB3aWRnZXQgZXhpc3RzIGFuZCBwYXNzd29yZCBtZWV0cyBtaW5pbXVtIHNjb3JlXG4gICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZSA9IFBhc3N3b3JkV2lkZ2V0LmdldFN0YXRlKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdGF0ZSAmJiBzdGF0ZS5zY29yZSA+PSAzMDsgLy8gTWluaW11bSBzY29yZSBmb3IgZXh0ZW5zaW9uc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gUGFzcyB2YWxpZGF0aW9uIGlmIHdpZGdldCBub3QgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gZm9ybVxuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGFkdmFuY2VkIHNldHRpbmdzXG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHBhc3RlIG1vYmlsZSBudW1iZXIgZnJvbSBjbGlwYm9hcmRcbiAgICAgKi9cbiAgICBjYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgYWZ0ZXIgYSBwaG9uZSBudW1iZXIgaGFzIGJlZW4gZW50ZXJlZCBjb21wbGV0ZWx5LlxuICAgICAqIEl0IHNlcnZlcyB0byBjaGVjayBpZiB0aGVyZSBhcmUgYW55IGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIHBob25lIG51bWJlcnMuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgYWZ0ZXIgcmVtb3ZpbmcgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBDYWxsIHRoZSBgY2hlY2tBdmFpbGFiaWxpdHlgIGZ1bmN0aW9uIG9uIGBFeHRlbnNpb25zYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgaXMgYWxyZWFkeSBpbiB1c2UuXG4gICAgICAgIC8vIFBhcmFtZXRlcnM6IGRlZmF1bHQgbnVtYmVyLCBuZXcgbnVtYmVyLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKG51bWJlciksIHVzZXIgaWRcbiAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE51bWJlciwgbmV3TnVtYmVyLCAnbnVtYmVyJywgdXNlcklkKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIG9uY2UgYW4gZW1haWwgYWRkcmVzcyBoYXMgYmVlbiBjb21wbGV0ZWx5IGVudGVyZWQuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGFmdGVyIHJlbW92aW5nIGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld0VtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGBjaGVja0F2YWlsYWJpbGl0eWAgZnVuY3Rpb24gb24gYFVzZXJzQVBJYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBlbWFpbCBpcyBhbHJlYWR5IGluIHVzZS5cbiAgICAgICAgLy8gUGFyYW1ldGVyczogZGVmYXVsdCBlbWFpbCwgbmV3IGVtYWlsLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKGVtYWlsKSwgdXNlciBpZFxuICAgICAgICBVc2Vyc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdEVtYWlsLCBuZXdFbWFpbCwnZW1haWwnLCB1c2VySWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBY3RpdmF0ZWQgd2hlbiBlbnRlcmluZyBhIG1vYmlsZSBwaG9uZSBudW1iZXIgaW4gdGhlIGVtcGxveWVlJ3MgcHJvZmlsZS5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgd2l0aG91dCBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gR2V0IHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBEeW5hbWljIGNoZWNrIHRvIHNlZSBpZiB0aGUgc2VsZWN0ZWQgbW9iaWxlIG51bWJlciBpcyBhdmFpbGFibGVcbiAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cbiAgICAgICAgLy8gUmVmaWxsIHRoZSBtb2JpbGUgZGlhbHN0cmluZyBpZiB0aGUgbmV3IG1vYmlsZSBudW1iZXIgaXMgZGlmZmVyZW50IHRoYW4gdGhlIGRlZmF1bHQgb3IgaWYgdGhlIG1vYmlsZSBkaWFsc3RyaW5nIGlzIGVtcHR5XG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyXG4gICAgICAgICAgICB8fCAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycpLmxlbmd0aCA9PT0gMClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2JpbGUgbnVtYmVyIGhhcyBjaGFuZ2VkXG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyB1c2VybmFtZSBmcm9tIHRoZSBmb3JtXG4gICAgICAgICAgICBjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBjYWxsIGZvcndhcmRpbmcgd2FzIHNldCB0byB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSByaW5nIGxlbmd0aCBpcyBlbXB0eSwgc2V0IGl0IHRvIDQ1XG4gICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKS5sZW5ndGggPT09IDBcbiAgICAgICAgICAgICAgICAgICAgfHwgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpPT09XCIwXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDQ1KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIG5ldyBmb3J3YXJkaW5nIG1vYmlsZSBudW1iZXIgaW4gdGhlIGRyb3Bkb3duIGFuZCBmb3JtXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ1xuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBjYWxsIGZvcndhcmRpbmcgb24gYnVzeSB3YXMgc2V0IHRvIHRoZSBkZWZhdWx0IG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBuZXcgZm9yd2FyZGluZyBtb2JpbGUgbnVtYmVyIGluIHRoZSBkcm9wZG93biBhbmQgZm9ybVxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY2FsbCBmb3J3YXJkaW5nIG9uIHVuYXZhaWxhYmxlIHdhcyBzZXQgdG8gdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBuZXcgZm9yd2FyZGluZyBtb2JpbGUgbnVtYmVyIGluIHRoZSBkcm9wZG93biBhbmQgZm9ybVxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFNldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgYXMgdGhlIGRlZmF1bHRcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBuZXdNb2JpbGVOdW1iZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxlZCB3aGVuIHRoZSBtb2JpbGUgcGhvbmUgbnVtYmVyIGlzIGNsZWFyZWQgaW4gdGhlIGVtcGxveWVlIGNhcmQuXG4gICAgICovXG4gICAgY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIENsZWFyIHRoZSAnbW9iaWxlX2RpYWxzdHJpbmcnIGFuZCAnbW9iaWxlX251bWJlcicgZmllbGRzIGluIHRoZSBmb3JtXG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX251bWJlcicsICcnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIElmIHNvLCBjbGVhciB0aGUgJ2Z3ZF9yaW5nbGVuZ3RoJyBmaWVsZCBhbmQgc2V0ICdmd2RfZm9yd2FyZGluZycgdG8gLTFcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCAwKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmcuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKS5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuICAgICAgICAgICAgLy9leHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgLTEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIGJ1c3kgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIHNldCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knIHRvIC0xXG4gICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb25idXN5LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJykuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcbiAgICAgICAgICAgIC8vZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsIC0xKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiB1bmF2YWlsYWJsZSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIHNldCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyB0byAtMVxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKS5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuICAgICAgICAgICAgLy9leHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIC0xKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIHRoZSBkZWZhdWx0IG1vYmlsZSBudW1iZXJcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBuZXcgU0lQIHBhc3N3b3JkLlxuICAgICAqIFVzZXMgdGhlIFBhc3N3b3JkV2lkZ2V0IEFQSSB0byBnZW5lcmF0ZSBhIHNlY3VyZSBwYXNzd29yZC5cbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCkge1xuICAgICAgICAvLyBVc2UgUGFzc3dvcmRXaWRnZXQgQVBJIGRpcmVjdGx5XG4gICAgICAgIGlmIChleHRlbnNpb24ucGFzc3dvcmRXaWRnZXQpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldC5nZW5lcmF0ZVBhc3N3b3JkKGV4dGVuc2lvbi5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICByZXN1bHQuZGF0YS5tb2JpbGVfbnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5maW5kKCcuY2hlY2tib3gnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbnB1dCA9ICQob2JqKS5maW5kKCdpbnB1dCcpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBpbnB1dC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKCQob2JqKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbaWRdPScxJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbaWRdPScwJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAoUGJ4QXBpLnN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSl7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5pZCE9PXVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICYmIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpZCcpICE9PSByZXNwb25zZS5kYXRhLmlkKXtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb249YCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS8ke3Jlc3BvbnNlLmRhdGEuaWR9YFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdG9yZSB0aGUgY3VycmVudCBleHRlbnNpb24gbnVtYmVyIGFzIHRoZSBkZWZhdWx0IG51bWJlclxuICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci52YWwoKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBwaG9uZSByZXByZXNlbnRhdGlvbiB3aXRoIHRoZSBuZXcgZGVmYXVsdCBudW1iZXJcbiAgICAgICAgICAgIEV4dGVuc2lvbnMudXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuXG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH1cblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZXh0ZW5zaW9uLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvc2F2ZVJlY29yZGA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZXh0ZW5zaW9uLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBleHRlbnNpb24uY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGFkdmFuY2VkIHNldHRpbmdzIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gRGVmaW5lIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGVhY2ggZmllbGRcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBtb2JpbGVfZGlhbHN0cmluZzogZXh0ZW5zaW9uLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2Zvcm1hdF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9wcm92aWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9wcm92aWRlcl9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3J3YXJkLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICBleGFtcGxlczogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2V4YW1wbGVzIFxuICAgICAgICAgICAgICAgICAgICA/IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlcy5zcGxpdCgnfCcpIFxuICAgICAgICAgICAgICAgICAgICA6IFtdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2lwX2VuYWJsZVJlY29yZGluZzogZXh0ZW5zaW9uLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcEVuYWJsZVJlY29yZGluZ1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRW5hYmxlUmVjb3JkaW5nVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBFbmFibGVSZWNvcmRpbmdUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzaXBfZHRtZm1vZGU6IGV4dGVuc2lvbi5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDoge1xuICAgICAgICAgICAgICAgICAgICBhdXRvOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0b19kZXNjLFxuICAgICAgICAgICAgICAgICAgICByZmM0NzMzOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfcmZjNDczM19kZXNjLFxuICAgICAgICAgICAgICAgICAgICBpbmZvOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5mb19kZXNjLFxuICAgICAgICAgICAgICAgICAgICBpbmJhbmQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmJhbmRfZGVzYyxcbiAgICAgICAgICAgICAgICAgICAgYXV0b19pbmZvOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0b19pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2lwX3RyYW5zcG9ydDogZXh0ZW5zaW9uLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcF90Y3BfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90Y3AsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90Y3BfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90bHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90bHNfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9yZWNfY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzaXBfbmV0d29ya2ZpbHRlcmlkOiBleHRlbnNpb24uYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNpcF9tYW51YWxhdHRyaWJ1dGVzOiBleHRlbnNpb24uYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiB7XG4gICAgICAgICAgICAgICAgICAgIHJ0cF90aW1lb3V0OiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9kZXNjLFxuICAgICAgICAgICAgICAgICAgICBydHBfdGltZW91dF9ob2xkOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9ob2xkX2Rlc2MsXG4gICAgICAgICAgICAgICAgICAgIG1heF9hdWRpb19zdHJlYW1zOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfYXVkaW9fc3RyZWFtc19kZXNjLFxuICAgICAgICAgICAgICAgICAgICBkZXZpY2Vfc3RhdGVfYnVzeV9hdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGV2aWNlX3N0YXRlX2J1c3lfYXRfZGVzYyxcbiAgICAgICAgICAgICAgICAgICAgbWF4X2NvbnRhY3RzOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfY29udGFjdHNfZGVzYyxcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlX2V4aXN0aW5nOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfZXhpc3RpbmdfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ1tlbmRwb2ludF0nLFxuICAgICAgICAgICAgICAgICAgICAncnRwX3RpbWVvdXQgPSAzMDAnLFxuICAgICAgICAgICAgICAgICAgICAncnRwX3RpbWVvdXRfaG9sZCA9IDMwMCcsXG4gICAgICAgICAgICAgICAgICAgICdtYXhfYXVkaW9fc3RyZWFtcyA9IDInLFxuICAgICAgICAgICAgICAgICAgICAnZGV2aWNlX3N0YXRlX2J1c3lfYXQgPSAzJyxcbiAgICAgICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgICAgICdbYW9yXScsXG4gICAgICAgICAgICAgICAgICAgICdtYXhfY29udGFjdHM9MTAnLFxuICAgICAgICAgICAgICAgICAgICAncmVtb3ZlX2V4aXN0aW5nID0geWVzJyxcbiAgICAgICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgICAgICdbYWNsXScsXG4gICAgICAgICAgICAgICAgICAgICdwZXJtaXQ9MTkyLjE2OC4xLjEwMCcsXG4gICAgICAgICAgICAgICAgICAgICdwZXJtaXQ9MTkyLjE2OC4xLjEwMSdcblxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwIGZvciBlYWNoIGZpZWxkIGluZm8gaWNvblxuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdG9vbHRpcENvbmZpZ3NbZmllbGROYW1lXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0IGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEhUTUwgc3RyaW5nIGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWFkZXIgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3QgaXRlbXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0KSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjb25maWcubGlzdCkgJiYgY29uZmlnLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzx1bD4nO1xuICAgICAgICAgICAgICAgIGNvbmZpZy5saXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhlYWRlciBpdGVtIHdpdGhvdXQgZGVmaW5pdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWw+YDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZy5saXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIC8vIE9sZCBmb3JtYXQgLSBvYmplY3Qgd2l0aCBrZXktdmFsdWUgcGFpcnNcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhjb25maWcubGlzdCkuZm9yRWFjaCgoW3Rlcm0sIGRlZmluaXRpb25dKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7dGVybX06PC9zdHJvbmc+ICR7ZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBsaXN0cyAobGlzdDIsIGxpc3QzLCBldGMuKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0TmFtZSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3ROYW1lXSAmJiBjb25maWdbbGlzdE5hbWVdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBjb25maWdbbGlzdE5hbWVdLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB3YXJuaW5nIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPmA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gY29uZmlnLndhcm5pbmcuaGVhZGVyO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGNvbmZpZy53YXJuaW5nLnRleHQ7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29kZSBleGFtcGxlcyBpZiBleGlzdFxuICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke2NvbmZpZy5leGFtcGxlc0hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODsgYm9yZGVyOiAxcHggc29saWQgI2UwZTBlMDtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTsgbGluZS1oZWlnaHQ6IDEuNGVtO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByb2Nlc3MgZXhhbXBsZXMgd2l0aCBzeW50YXggaGlnaGxpZ2h0aW5nIGZvciBzZWN0aW9uc1xuICAgICAgICAgICAgY29uZmlnLmV4YW1wbGVzLmZvckVhY2goKGxpbmUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmUudHJpbSgpLnN0YXJ0c1dpdGgoJ1snKSAmJiBsaW5lLnRyaW0oKS5lbmRzV2l0aCgnXScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IDApIGh0bWwgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICMwMDg0YjQ7IGZvbnQtd2VpZ2h0OiBib2xkO1wiPiR7bGluZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxpbmUuaW5jbHVkZXMoJz0nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBQYXJhbWV0ZXIgbGluZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBbcGFyYW0sIHZhbHVlXSA9IGxpbmUuc3BsaXQoJz0nLCAyKTtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgXFxuPHNwYW4gc3R5bGU9XCJjb2xvcjogIzdhM2U5ZDtcIj4ke3BhcmFtfTwvc3Bhbj49PHNwYW4gc3R5bGU9XCJjb2xvcjogI2NmNGE0YztcIj4ke3ZhbHVlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgbGluZVxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGxpbmUgPyBgXFxuJHtsaW5lfWAgOiAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub3RlIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxlbT4ke2NvbmZpZy5ub3RlfTwvZW0+PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBEZWZpbmUgYSBjdXN0b20gcnVsZSBmb3IgalF1ZXJ5IGZvcm0gdmFsaWRhdGlvbiBuYW1lZCAnZXh0ZW5zaW9uUnVsZScuXG4gKiBUaGUgcnVsZSBjaGVja3MgaWYgYSBmb3J3YXJkaW5nIG51bWJlciBpcyBzZWxlY3RlZCBidXQgdGhlIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRoZSB2YWxpZGF0aW9uIHJlc3VsdC4gSWYgZm9yd2FyZGluZyBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgaXQgcmV0dXJucyBmYWxzZSAoaW52YWxpZCkuIE90aGVyd2lzZSwgaXQgcmV0dXJucyB0cnVlICh2YWxpZCkuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbnNpb25SdWxlID0gKCkgPT4ge1xuICAgIC8vIEdldCByaW5nIGxlbmd0aCBhbmQgZm9yd2FyZGluZyBudW1iZXIgZnJvbSB0aGUgZm9ybVxuICAgIGNvbnN0IGZ3ZFJpbmdMZW5ndGggPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk7XG4gICAgY29uc3QgZndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcblxuICAgIC8vIElmIGZvcndhcmRpbmcgbnVtYmVyIGlzIHNldCBhbmQgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LCByZXR1cm4gZmFsc2UgKGludmFsaWQpXG4gICAgaWYgKGZ3ZEZvcndhcmRpbmcubGVuZ3RoID4gMFxuICAgICAgICAmJiAoXG4gICAgICAgICAgICBmd2RSaW5nTGVuZ3RoID09PSAwXG4gICAgICAgICAgICB8fFxuICAgICAgICAgICAgZndkUmluZ0xlbmd0aCA9PT0gJydcbiAgICAgICAgKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCByZXR1cm4gdHJ1ZSAodmFsaWQpXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgbnVtYmVyIGlzIHRha2VuIGJ5IGFub3RoZXIgYWNjb3VudFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHBhcmFtZXRlciBoYXMgdGhlICdoaWRkZW4nIGNsYXNzLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG5cbi8qKlxuICogIEluaXRpYWxpemUgRW1wbG95ZWUgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uLmluaXRpYWxpemUoKTtcbiAgICBhdmF0YXIuaW5pdGlhbGl6ZSgpO1xuICAgIGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=