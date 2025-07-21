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
 InputMaskPatterns, avatar, extensionStatusLoopWorker, ClipboardJS */

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
        type: 'notRegExp',
        value: /[A-z]/,
        prompt: globalTranslate.ex_PasswordNoLowSimvol
      }, {
        type: 'notRegExp',
        value: /\d/,
        prompt: globalTranslate.ex_PasswordNoNumbers
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

    $(extension.forwardingSelect).dropdown(Extensions.getDropdownSettingsWithEmpty()); // Generate a new SIP password if the field is empty

    if (extension.$sip_secret.val() === '') extension.generateNewSipPassword(); // Attach a click event listener to the "generate new password" button

    $('#generate-new-password').on('click', function (e) {
      e.preventDefault();
      extension.generateNewSipPassword();
    }); // Show/hide password toggle

    $('#show-hide-password').on('click', function (e) {
      e.preventDefault();
      var $button = $(e.currentTarget);
      var $icon = $button.find('i');

      if (extension.$sip_secret.attr('type') === 'password') {
        extension.$sip_secret.attr('type', 'text');
        $icon.removeClass('eye').addClass('eye slash');
      } else {
        extension.$sip_secret.attr('type', 'password');
        $icon.removeClass('eye slash').addClass('eye');
      }
    }); // Initialize clipboard for password copy

    var clipboard = new ClipboardJS('.clipboard');
    $('.clipboard').popup({
      on: 'manual'
    });
    clipboard.on('success', function (e) {
      $(e.trigger).popup('show');
      setTimeout(function () {
        $(e.trigger).popup('hide');
      }, 1500);
      e.clearSelection();
    });
    clipboard.on('error', function (e) {
      console.error('Action:', e.action);
      console.error('Trigger:', e.trigger);
    }); // Set the "oncomplete" event handler for the extension number input

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
    }); // Initialize the extension form

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
   * The generated password will consist of 16 characters using base64-safe alphabet.
   */
  generateNewSipPassword: function generateNewSipPassword() {
    // Request 16 chars for unified password length
    PbxApi.PasswordGenerate(16, function (password) {
      extension.$formObj.form('set value', 'sip_secret', password); // Update clipboard button attribute

      $('.clipboard').attr('data-clipboard-text', password); // Trigger form change to enable save button

      Form.dataChanged();
    });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJHF1YWxpZnkiLCIkcXVhbGlmeV9mcmVxIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsInZhbHVlIiwiZXhfUGFzc3dvcmROb0xvd1NpbXZvbCIsImV4X1Bhc3N3b3JkTm9OdW1iZXJzIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiaW5wdXRtYXNrIiwidGFiIiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwidmFsIiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCIkaWNvbiIsImZpbmQiLCJhdHRyIiwiY2xpcGJvYXJkIiwiQ2xpcGJvYXJkSlMiLCJwb3B1cCIsInRyaWdnZXIiLCJzZXRUaW1lb3V0IiwiY2xlYXJTZWxlY3Rpb24iLCJjb25zb2xlIiwiZXJyb3IiLCJhY3Rpb24iLCJ0aW1lb3V0TnVtYmVySWQiLCJvbmNvbXBsZXRlIiwiY2xlYXJUaW1lb3V0IiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwib25jbGVhcmVkIiwiY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIiLCJjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIiLCJvbkJlZm9yZVBhc3RlIiwiY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlIiwic2hvd01hc2tPbkhvdmVyIiwibWF0Y2giLCJyZXBsYWNlIiwibGlzdCIsImxpc3RLZXkiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwiY2hhckF0IiwicHJvY2Vzc2VkRGF0YSIsInNsaWNlIiwiaW5wdXQiLCJzdGFydCIsInNlbGVjdGlvblN0YXJ0IiwiZW5kIiwic2VsZWN0aW9uRW5kIiwiY3VycmVudFZhbHVlIiwibmV3VmFsdWUiLCJzdWJzdHJpbmciLCJ0aW1lb3V0RW1haWxJZCIsImNiT25Db21wbGV0ZUVtYWlsIiwiZm9jdXNvdXQiLCJwaG9uZSIsInRhcmdldCIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwicGFzdGVkVmFsdWUiLCJuZXdOdW1iZXIiLCJ1c2VySWQiLCJmb3JtIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJuZXdFbWFpbCIsIlVzZXJzQVBJIiwibmV3TW9iaWxlTnVtYmVyIiwibGVuZ3RoIiwidXNlck5hbWUiLCJQYnhBcGkiLCJQYXNzd29yZEdlbmVyYXRlIiwicGFzc3dvcmQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiaWQiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInN1Y2Nlc3NUZXN0IiwidW5kZWZpbmVkIiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwidXBkYXRlUGhvbmVSZXByZXNlbnQiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwidXJsIiwiQ29uZmlnIiwicGJ4VXJsIiwidG9vbHRpcENvbmZpZ3MiLCJtb2JpbGVfZGlhbHN0cmluZyIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJoZWFkZXIiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2Rlc2MiLCJ0ZXJtIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2Zvcm1hdCIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2Zvcm1hdF9kZXNjIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfcHJvdmlkZXIiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9wcm92aWRlcl9kZXNjIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9yd2FyZCIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmRfZGVzYyIsImV4YW1wbGVzSGVhZGVyIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZXhhbXBsZXMiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlcyIsInNwbGl0Iiwibm90ZSIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX25vdGUiLCJzaXBfZW5hYmxlUmVjb3JkaW5nIiwiZXhfU2lwRW5hYmxlUmVjb3JkaW5nVG9vbHRpcF9oZWFkZXIiLCJleF9TaXBFbmFibGVSZWNvcmRpbmdUb29sdGlwX2Rlc2MiLCJleF9TaXBFbmFibGVSZWNvcmRpbmdUb29sdGlwX25vdGUiLCJzaXBfZHRtZm1vZGUiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfaGVhZGVyIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2Rlc2MiLCJhdXRvIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0b19kZXNjIiwicmZjNDczMyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzNfZGVzYyIsImluZm8iLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmZvX2Rlc2MiLCJpbmJhbmQiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmJhbmRfZGVzYyIsImF1dG9faW5mbyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9faW5mb19kZXNjIiwic2lwX3RyYW5zcG9ydCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfaGVhZGVyIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9wcm90b2NvbHNfaGVhZGVyIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfdGNwIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfdGNwX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3RjcCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3RscyIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJsaXN0MiIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHkiLCJzaXBfbmV0d29ya2ZpbHRlcmlkIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9oZWFkZXIiLCJleF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX2Rlc2MiLCJ3YXJuaW5nIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsInRleHQiLCJleF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX3dhcm5pbmciLCJzaXBfbWFudWFsYXR0cmlidXRlcyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlciIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MiLCJydHBfdGltZW91dCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfZGVzYyIsInJ0cF90aW1lb3V0X2hvbGQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2hvbGRfZGVzYyIsIm1heF9hdWRpb19zdHJlYW1zIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfYXVkaW9fc3RyZWFtc19kZXNjIiwiZGV2aWNlX3N0YXRlX2J1c3lfYXQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RldmljZV9zdGF0ZV9idXN5X2F0X2Rlc2MiLCJtYXhfY29udGFjdHMiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9jb250YWN0c19kZXNjIiwicmVtb3ZlX2V4aXN0aW5nIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfZXhpc3RpbmdfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZyIsImVsZW1lbnQiLCJmaWVsZE5hbWUiLCJjb250ZW50IiwiaHRtbCIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsInZhcmlhdGlvbiIsImNvbmZpZyIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJpdGVtIiwiT2JqZWN0IiwiZW50cmllcyIsImkiLCJsaXN0TmFtZSIsImxpbmUiLCJ0cmltIiwic3RhcnRzV2l0aCIsImVuZHNXaXRoIiwiaW5jbHVkZXMiLCJwYXJhbSIsImZuIiwiZXh0ZW5zaW9uUnVsZSIsImZ3ZFJpbmdMZW5ndGgiLCJmd2RGb3J3YXJkaW5nIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5IiwiYXZhdGFyIiwiZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxTQUFTLEdBQUc7QUFDZEMsRUFBQUEsWUFBWSxF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QUFaLENBQWtCLFlBQU07QUFDcEIvUSxFQUFBQSxTQUFTLENBQUNpRCxVQUFWO0FBQ0ErTixFQUFBQSxNQUFNLENBQUMvTixVQUFQO0FBQ0FnTyxFQUFBQSx5QkFBeUIsQ0FBQ2hPLFVBQTFCO0FBQ0gsQ0FKRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sXG4gSW5wdXRNYXNrUGF0dGVybnMsIGF2YXRhciwgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciwgQ2xpcGJvYXJkSlMgKi9cblxuXG4vKipcbiAqIFRoZSBleHRlbnNpb24gb2JqZWN0LlxuICogTWFuYWdlcyB0aGUgb3BlcmF0aW9ucyBhbmQgYmVoYXZpb3JzIG9mIHRoZSBleHRlbnNpb24gZWRpdCBmb3JtXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25cbiAqL1xuY29uc3QgZXh0ZW5zaW9uID0ge1xuICAgIGRlZmF1bHRFbWFpbDogJycsXG4gICAgZGVmYXVsdE51bWJlcjogJycsXG4gICAgZGVmYXVsdE1vYmlsZU51bWJlcjogJycsXG4gICAgJG51bWJlcjogJCgnI251bWJlcicpLFxuICAgICRzaXBfc2VjcmV0OiAkKCcjc2lwX3NlY3JldCcpLFxuICAgICRtb2JpbGVfbnVtYmVyOiAkKCcjbW9iaWxlX251bWJlcicpLFxuICAgICRmd2RfZm9yd2FyZGluZzogJCgnI2Z3ZF9mb3J3YXJkaW5nJyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb25idXN5OiAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKSxcbiAgICAkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiAkKCcjZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyksXG4gICAgJHF1YWxpZnk6ICQoJyNxdWFsaWZ5JyksXG4gICAgJHF1YWxpZnlfZnJlcTogJCgnI3F1YWxpZnktZnJlcScpLFxuICAgICRlbWFpbDogJCgnI3VzZXJfZW1haWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNleHRlbnNpb25zLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJ1bGFyIG1lbnUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdGFiTWVudUl0ZW1zOiAkKCcjZXh0ZW5zaW9ucy1tZW51IC5pdGVtJyksXG5cbiAgICBmb3J3YXJkaW5nU2VsZWN0OiAnI2V4dGVuc2lvbnMtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG51bWJlcjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ251bWJlcicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIG1vYmlsZV9udW1iZXI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ21vYmlsZV9udW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXNrJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbW9iaWxlLW51bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX2VtYWlsOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUVtYWlsRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHVzZXJfdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNpcF9zZWNyZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzaXBfc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRXZWFrLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IC9bQS16XS8sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1Bhc3N3b3JkTm9Mb3dTaW12b2xcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZndkX3JpbmdsZW5ndGg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfcmluZ2xlbmd0aCcsXG4gICAgICAgICAgICBkZXBlbmRzOiAnZndkX2ZvcndhcmRpbmcnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzMuLjE4MF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVJpbmdpbmdCZWZvcmVGb3J3YXJkT3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZndkX2ZvcndhcmRpbmc6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5zaW9uUnVsZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nb25idXN5OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGV4dGVuc2lvbiBmb3JtIGFuZCBpdHMgaW50ZXJhY3Rpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFNldCBkZWZhdWx0IHZhbHVlcyBmb3IgZW1haWwsIG1vYmlsZSBudW1iZXIsIGFuZCBleHRlbnNpb24gbnVtYmVyXG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPSBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYiBtZW51IGl0ZW1zLCBhY2NvcmRpb25zLCBhbmQgZHJvcGRvd24gbWVudXNcbiAgICAgICAgZXh0ZW5zaW9uLiR0YWJNZW51SXRlbXMudGFiKCk7XG4gICAgICAgICQoJyNleHRlbnNpb25zLWZvcm0gLnVpLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlIFwicXVhbGlmeVwiIGNoZWNrYm94XG4gICAgICAgIGV4dGVuc2lvbi4kcXVhbGlmeS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRxdWFsaWZ5LmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRxdWFsaWZ5X2ZyZXEucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRxdWFsaWZ5X2ZyZXEuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZHJvcGRvd24gbWVudSBmb3IgZm9yd2FyZGluZyBzZWxlY3RcbiAgICAgICAgJChleHRlbnNpb24uZm9yd2FyZGluZ1NlbGVjdCkuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCkpO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIGEgbmV3IFNJUCBwYXNzd29yZCBpZiB0aGUgZmllbGQgaXMgZW1wdHlcbiAgICAgICAgaWYgKGV4dGVuc2lvbi4kc2lwX3NlY3JldC52YWwoKSA9PT0gJycpIGV4dGVuc2lvbi5nZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCk7XG5cbiAgICAgICAgLy8gQXR0YWNoIGEgY2xpY2sgZXZlbnQgbGlzdGVuZXIgdG8gdGhlIFwiZ2VuZXJhdGUgbmV3IHBhc3N3b3JkXCIgYnV0dG9uXG4gICAgICAgICQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2hvdy9oaWRlIHBhc3N3b3JkIHRvZ2dsZVxuICAgICAgICAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICRidXR0b24uZmluZCgnaScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LmF0dHIoJ3R5cGUnKSA9PT0gJ3Bhc3N3b3JkJykge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kc2lwX3NlY3JldC5hdHRyKCd0eXBlJywgJ3RleHQnKTtcbiAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllJykuYWRkQ2xhc3MoJ2V5ZSBzbGFzaCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJHNpcF9zZWNyZXQuYXR0cigndHlwZScsICdwYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUgc2xhc2gnKS5hZGRDbGFzcygnZXllJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBwYXNzd29yZCBjb3B5XG4gICAgICAgIGNvbnN0IGNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNsaXBib2FyZCcpO1xuICAgICAgICAkKCcuY2xpcGJvYXJkJykucG9wdXAoe1xuICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICB9KTtcblxuICAgICAgICBjbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FjdGlvbjonLCBlLmFjdGlvbik7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcmlnZ2VyOicsIGUudHJpZ2dlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgXCJvbmNvbXBsZXRlXCIgZXZlbnQgaGFuZGxlciBmb3IgdGhlIGV4dGVuc2lvbiBudW1iZXIgaW5wdXRcbiAgICAgICAgbGV0IHRpbWVvdXROdW1iZXJJZDtcbiAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCdvcHRpb24nLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiAoKT0+e1xuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgcHJldmlvdXMgdGltZXIsIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgICAgICBpZiAodGltZW91dE51bWJlcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dE51bWJlcklkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgICAgICAgICAgIHRpbWVvdXROdW1iZXJJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcigpO1xuICAgICAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIub24oJ3Bhc3RlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlTnVtYmVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLnZhbChuZXcgbGlicGhvbmVudW1iZXIuQXNZb3VUeXBlKCkuaW5wdXQoJysnK2V4dGVuc2lvbi4kbW9iaWxlX251bWJlci52YWwoKSkpO1xuXG4gICAgICAgIC8vIFNldCB1cCB0aGUgaW5wdXQgbWFza3MgZm9yIHRoZSBtb2JpbGUgbnVtYmVyIGlucHV0XG4gICAgICAgIGNvbnN0IG1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2tzKHtcbiAgICAgICAgICAgIGlucHV0bWFzazoge1xuICAgICAgICAgICAgICAgIGRlZmluaXRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICcjJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yOiAnWzAtOV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FyZGluYWxpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbmNsZWFyZWQ6IGV4dGVuc2lvbi5jYk9uQ2xlYXJlZE1vYmlsZU51bWJlcixcbiAgICAgICAgICAgICAgICBvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyLFxuICAgICAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGV4dGVuc2lvbi5jYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUsXG4gICAgICAgICAgICAgICAgc2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtYXRjaDogL1swLTldLyxcbiAgICAgICAgICAgIHJlcGxhY2U6ICc5JyxcbiAgICAgICAgICAgIGxpc3Q6IG1hc2tMaXN0LFxuICAgICAgICAgICAgbGlzdEtleTogJ21hc2snLFxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIub24oJ3Bhc3RlJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpOyAvLyDQn9GA0LXQtNC+0YLQstGA0LDRidCw0LXQvCDRgdGC0LDQvdC00LDRgNGC0L3QvtC1INC/0L7QstC10LTQtdC90LjQtSDQstGB0YLQsNCy0LrQuFxuXG4gICAgICAgICAgICAvLyDQn9C+0LvRg9GH0LDQtdC8INCy0YHRgtCw0LLQu9C10L3QvdGL0LUg0LTQsNC90L3Ri9C1INC40Lcg0LHRg9GE0LXRgNCwINC+0LHQvNC10L3QsFxuICAgICAgICAgICAgbGV0IHBhc3RlZERhdGEgPSAnJztcbiAgICAgICAgICAgIGlmIChlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YSAmJiBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LmNsaXBib2FyZERhdGEgJiYgd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkgeyAvLyDQlNC70Y8gSUVcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyDQn9GA0L7QstC10YDRj9C10LwsINC90LDRh9C40L3QsNC10YLRgdGPINC70Lgg0LLRgdGC0LDQstC70LXQvdC90YvQuSDRgtC10LrRgdGCINGBICcrJ1xuICAgICAgICAgICAgaWYgKHBhc3RlZERhdGEuY2hhckF0KDApID09PSAnKycpIHtcbiAgICAgICAgICAgICAgICAvLyDQodC+0YXRgNCw0L3Rj9C10LwgJysnINC4INGD0LTQsNC70Y/QtdC8INC+0YHRgtCw0LvRjNC90YvQtSDQvdC10LbQtdC70LDRgtC10LvRjNC90YvQtSDRgdC40LzQstC+0LvRi1xuICAgICAgICAgICAgICAgIHZhciBwcm9jZXNzZWREYXRhID0gJysnICsgcGFzdGVkRGF0YS5zbGljZSgxKS5yZXBsYWNlKC9cXEQvZywgJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyDQo9C00LDQu9GP0LXQvCDQstGB0LUg0YHQuNC80LLQvtC70YssINC60YDQvtC80LUg0YbQuNGE0YBcbiAgICAgICAgICAgICAgICB2YXIgcHJvY2Vzc2VkRGF0YSA9IHBhc3RlZERhdGEucmVwbGFjZSgvXFxEL2csICcnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8g0JLRgdGC0LDQstC70Y/QtdC8INC+0YfQuNGJ0LXQvdC90YvQtSDQtNCw0L3QvdGL0LUg0LIg0L/QvtC70LUg0LLQstC+0LTQsFxuICAgICAgICAgICAgY29uc3QgaW5wdXQgPSB0aGlzO1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBpbnB1dC5zZWxlY3Rpb25TdGFydDtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IGlucHV0LnNlbGVjdGlvbkVuZDtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICQoaW5wdXQpLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBjdXJyZW50VmFsdWUuc3Vic3RyaW5nKDAsIHN0YXJ0KSArIHByb2Nlc3NlZERhdGEgKyBjdXJyZW50VmFsdWUuc3Vic3RyaW5nKGVuZCk7XG4gICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKFwicmVtb3ZlXCIpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLnZhbChuZXdWYWx1ZSk7XG4gICAgICAgICAgICAvLyDQotGA0LjQs9Cz0LXRgNC40Lwg0YHQvtCx0YvRgtC40LUgJ2lucHV0JyDQtNC70Y8g0L/RgNC40LzQtdC90LXQvdC40Y8g0LzQsNGB0LrQuCDQstCy0L7QtNCwXG4gICAgICAgICAgICAkKGlucHV0KS50cmlnZ2VyKCdpbnB1dCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2sgZm9yIHRoZSBlbWFpbCBpbnB1dFxuICAgICAgICBsZXQgdGltZW91dEVtYWlsSWQ7XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcsIHtcbiAgICAgICAgICAgIG9uY29tcGxldGU6ICgpPT57XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodGltZW91dEVtYWlsSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRFbWFpbElkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIHdpdGggYSBkZWxheSBvZiAwLjUgc2Vjb25kc1xuICAgICAgICAgICAgICAgIHRpbWVvdXRFbWFpbElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVFbWFpbCgpO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbC5vbigncGFzdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVFbWFpbCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL0F0dGFjaCBhIGZvY3Vzb3V0IGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBtb2JpbGUgbnVtYmVyIGlucHV0XG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5mb2N1c291dChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgbGV0IHBob25lID0gJChlLnRhcmdldCkudmFsKCkucmVwbGFjZSgvW14wLTldL2csIFwiXCIpO1xuICAgICAgICAgICAgaWYgKHBob25lID09PSAnJykge1xuICAgICAgICAgICAgICAgICQoZS50YXJnZXQpLnZhbCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGZvciBxdWVzdGlvbiBpY29ucyBhbmQgYnV0dG9uc1xuICAgICAgICAkKFwiaS5xdWVzdGlvblwiKS5wb3B1cCgpO1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gUHJldmVudCBicm93c2VyIHBhc3N3b3JkIG1hbmFnZXIgZm9yIGdlbmVyYXRlZCBwYXNzd29yZHNcbiAgICAgICAgZXh0ZW5zaW9uLiRzaXBfc2VjcmV0Lm9uKCdmb2N1cycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdhdXRvY29tcGxldGUnLCAnbmV3LXBhc3N3b3JkJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGV4dGVuc2lvbiBmb3JtXG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgYWR2YW5jZWQgc2V0dGluZ3NcbiAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgcGFzdGUgbW9iaWxlIG51bWJlciBmcm9tIGNsaXBib2FyZFxuICAgICAqL1xuICAgIGNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWU7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJdCBpcyBleGVjdXRlZCBhZnRlciBhIHBob25lIG51bWJlciBoYXMgYmVlbiBlbnRlcmVkIGNvbXBsZXRlbHkuXG4gICAgICogSXQgc2VydmVzIHRvIGNoZWNrIGlmIHRoZXJlIGFyZSBhbnkgY29uZmxpY3RzIHdpdGggZXhpc3RpbmcgcGhvbmUgbnVtYmVycy5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSBlbnRlcmVkIHBob25lIG51bWJlciBhZnRlciByZW1vdmluZyBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGBjaGVja0F2YWlsYWJpbGl0eWAgZnVuY3Rpb24gb24gYEV4dGVuc2lvbnNgIG9iamVjdFxuICAgICAgICAvLyB0byBjaGVjayB3aGV0aGVyIHRoZSBlbnRlcmVkIHBob25lIG51bWJlciBpcyBhbHJlYWR5IGluIHVzZS5cbiAgICAgICAgLy8gUGFyYW1ldGVyczogZGVmYXVsdCBudW1iZXIsIG5ldyBudW1iZXIsIGNsYXNzIG5hbWUgb2YgZXJyb3IgbWVzc2FnZSAobnVtYmVyKSwgdXNlciBpZFxuICAgICAgICBFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyLCBuZXdOdW1iZXIsICdudW1iZXInLCB1c2VySWQpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgb25jZSBhbiBlbWFpbCBhZGRyZXNzIGhhcyBiZWVuIGNvbXBsZXRlbHkgZW50ZXJlZC5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVFbWFpbCgpIHtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgYWZ0ZXIgcmVtb3ZpbmcgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3RW1haWwgPSBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSB1c2VyIElEIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cbiAgICAgICAgLy8gQ2FsbCB0aGUgYGNoZWNrQXZhaWxhYmlsaXR5YCBmdW5jdGlvbiBvbiBgVXNlcnNBUElgIG9iamVjdFxuICAgICAgICAvLyB0byBjaGVjayB3aGV0aGVyIHRoZSBlbnRlcmVkIGVtYWlsIGlzIGFscmVhZHkgaW4gdXNlLlxuICAgICAgICAvLyBQYXJhbWV0ZXJzOiBkZWZhdWx0IGVtYWlsLCBuZXcgZW1haWwsIGNsYXNzIG5hbWUgb2YgZXJyb3IgbWVzc2FnZSAoZW1haWwpLCB1c2VyIGlkXG4gICAgICAgIFVzZXJzQVBJLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0RW1haWwsIG5ld0VtYWlsLCdlbWFpbCcsIHVzZXJJZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFjdGl2YXRlZCB3aGVuIGVudGVyaW5nIGEgbW9iaWxlIHBob25lIG51bWJlciBpbiB0aGUgZW1wbG95ZWUncyBwcm9maWxlLlxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZU1vYmlsZU51bWJlcigpIHtcbiAgICAgICAgLy8gR2V0IHRoZSBuZXcgbW9iaWxlIG51bWJlciB3aXRob3V0IGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld01vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBHZXQgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIER5bmFtaWMgY2hlY2sgdG8gc2VlIGlmIHRoZSBzZWxlY3RlZCBtb2JpbGUgbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAgICBFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyLCBuZXdNb2JpbGVOdW1iZXIsICdtb2JpbGUtbnVtYmVyJywgdXNlcklkKTtcblxuICAgICAgICAvLyBSZWZpbGwgdGhlIG1vYmlsZSBkaWFsc3RyaW5nIGlmIHRoZSBuZXcgbW9iaWxlIG51bWJlciBpcyBkaWZmZXJlbnQgdGhhbiB0aGUgZGVmYXVsdCBvciBpZiB0aGUgbW9iaWxlIGRpYWxzdHJpbmcgaXMgZW1wdHlcbiAgICAgICAgaWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXJcbiAgICAgICAgICAgIHx8IChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJykubGVuZ3RoID09PSAwKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vYmlsZSBudW1iZXIgaGFzIGNoYW5nZWRcbiAgICAgICAgaWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHVzZXJuYW1lIGZyb20gdGhlIGZvcm1cbiAgICAgICAgICAgIGNvbnN0IHVzZXJOYW1lID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX3VzZXJuYW1lJyk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNhbGwgZm9yd2FyZGluZyB3YXMgc2V0IHRvIHRoZSBkZWZhdWx0IG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHJpbmcgbGVuZ3RoIGlzIGVtcHR5LCBzZXQgaXQgdG8gNDVcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICAgICAgICAgICB8fCBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk9PT1cIjBcIikge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgNDUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgbmV3IGZvcndhcmRpbmcgbW9iaWxlIG51bWJlciBpbiB0aGUgZHJvcGRvd24gYW5kIGZvcm1cbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNhbGwgZm9yd2FyZGluZyBvbiBidXN5IHdhcyBzZXQgdG8gdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIG5ldyBmb3J3YXJkaW5nIG1vYmlsZSBudW1iZXIgaW4gdGhlIGRyb3Bkb3duIGFuZCBmb3JtXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29uYnVzeVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBjYWxsIGZvcndhcmRpbmcgb24gdW5hdmFpbGFibGUgd2FzIHNldCB0byB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIG5ldyBmb3J3YXJkaW5nIG1vYmlsZSBudW1iZXIgaW4gdGhlIGRyb3Bkb3duIGFuZCBmb3JtXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IHRoZSBuZXcgbW9iaWxlIG51bWJlciBhcyB0aGUgZGVmYXVsdFxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IG5ld01vYmlsZU51bWJlcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdoZW4gdGhlIG1vYmlsZSBwaG9uZSBudW1iZXIgaXMgY2xlYXJlZCBpbiB0aGUgZW1wbG95ZWUgY2FyZC5cbiAgICAgKi9cbiAgICBjYk9uQ2xlYXJlZE1vYmlsZU51bWJlcigpIHtcbiAgICAgICAgLy8gQ2xlYXIgdGhlICdtb2JpbGVfZGlhbHN0cmluZycgYW5kICdtb2JpbGVfbnVtYmVyJyBmaWVsZHMgaW4gdGhlIGZvcm1cbiAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsICcnKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfbnVtYmVyJywgJycpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIGNsZWFyIHRoZSAnZndkX3JpbmdsZW5ndGgnIGZpZWxkIGFuZCBzZXQgJ2Z3ZF9mb3J3YXJkaW5nJyB0byAtMVxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDApO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZy5kcm9wZG93bignc2V0IHRleHQnLCAnLScpLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG4gICAgICAgICAgICAvL2V4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnLCAtMSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdoZW4gYnVzeSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBJZiBzbywgc2V0ICdmd2RfZm9yd2FyZGluZ29uYnVzeScgdG8gLTFcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3kuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKS5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuICAgICAgICAgICAgLy9leHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgLTEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIHVuYXZhaWxhYmxlIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBJZiBzbywgc2V0ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnIHRvIC0xXG4gICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZS5kcm9wZG93bignc2V0IHRleHQnLCAnLScpLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG4gICAgICAgICAgICAvL2V4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgLTEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIG5ldyBTSVAgcGFzc3dvcmQuXG4gICAgICogVGhlIGdlbmVyYXRlZCBwYXNzd29yZCB3aWxsIGNvbnNpc3Qgb2YgMTYgY2hhcmFjdGVycyB1c2luZyBiYXNlNjQtc2FmZSBhbHBoYWJldC5cbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCkge1xuICAgICAgICAvLyBSZXF1ZXN0IDE2IGNoYXJzIGZvciB1bmlmaWVkIHBhc3N3b3JkIGxlbmd0aFxuICAgICAgICBQYnhBcGkuUGFzc3dvcmRHZW5lcmF0ZSgxNiwgKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3NpcF9zZWNyZXQnLCBwYXNzd29yZCk7XG4gICAgICAgICAgICAvLyBVcGRhdGUgY2xpcGJvYXJkIGJ1dHRvbiBhdHRyaWJ1dGVcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgcGFzc3dvcmQpO1xuICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmVzdWx0LmRhdGEubW9iaWxlX251bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZmluZCgnLmNoZWNrYm94JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5wdXQgPSAkKG9iaikuZmluZCgnaW5wdXQnKTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gaW5wdXQuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmICgkKG9iaikuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2lkXT0nMSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2lkXT0nMCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKFBieEFwaS5zdWNjZXNzVGVzdChyZXNwb25zZSkpe1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuaWQhPT11bmRlZmluZWRcbiAgICAgICAgICAgICAgICAmJiBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywnaWQnKSAhPT0gcmVzcG9uc2UuZGF0YS5pZCl7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uPWAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtyZXNwb25zZS5kYXRhLmlkfWBcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3RvcmUgdGhlIGN1cnJlbnQgZXh0ZW5zaW9uIG51bWJlciBhcyB0aGUgZGVmYXVsdCBudW1iZXJcbiAgICAgICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIudmFsKCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgcGhvbmUgcmVwcmVzZW50YXRpb24gd2l0aCB0aGUgbmV3IGRlZmF1bHQgbnVtYmVyXG4gICAgICAgICAgICBFeHRlbnNpb25zLnVwZGF0ZVBob25lUmVwcmVzZW50KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyKTtcblxuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGV4dGVuc2lvbi4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL3NhdmVSZWNvcmRgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGV4dGVuc2lvbi52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZXh0ZW5zaW9uLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBleHRlbnNpb24uY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBhZHZhbmNlZCBzZXR0aW5ncyBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIERlZmluZSB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBlYWNoIGZpZWxkXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgbW9iaWxlX2RpYWxzdHJpbmc6IGV4dGVuc2lvbi5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfcHJvdmlkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfcHJvdmlkZXJfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9yd2FyZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3J3YXJkX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXNIZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlcyBcbiAgICAgICAgICAgICAgICAgICAgPyBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXMuc3BsaXQoJ3wnKSBcbiAgICAgICAgICAgICAgICAgICAgOiBbXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNpcF9lbmFibGVSZWNvcmRpbmc6IGV4dGVuc2lvbi5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBFbmFibGVSZWNvcmRpbmdUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcEVuYWJsZVJlY29yZGluZ1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRW5hYmxlUmVjb3JkaW5nVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2lwX2R0bWZtb2RlOiBleHRlbnNpb24uYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgYXV0bzogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9fZGVzYyxcbiAgICAgICAgICAgICAgICAgICAgcmZjNDczMzogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzNfZGVzYyxcbiAgICAgICAgICAgICAgICAgICAgaW5mbzogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luZm9fZGVzYyxcbiAgICAgICAgICAgICAgICAgICAgaW5iYW5kOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5iYW5kX2Rlc2MsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9faW5mbzogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9faW5mb19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNpcF90cmFuc3BvcnQ6IGV4dGVuc2lvbi5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3Byb3RvY29sc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcF90Y3AsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfdGNwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2lwX25ldHdvcmtmaWx0ZXJpZDogZXh0ZW5zaW9uLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE5ldHdvcmtmaWx0ZXJpZFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE5ldHdvcmtmaWx0ZXJpZFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzaXBfbWFudWFsYXR0cmlidXRlczogZXh0ZW5zaW9uLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDoge1xuICAgICAgICAgICAgICAgICAgICBydHBfdGltZW91dDogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfZGVzYyxcbiAgICAgICAgICAgICAgICAgICAgcnRwX3RpbWVvdXRfaG9sZDogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfaG9sZF9kZXNjLFxuICAgICAgICAgICAgICAgICAgICBtYXhfYXVkaW9fc3RyZWFtczogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2F1ZGlvX3N0cmVhbXNfZGVzYyxcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlX3N0YXRlX2J1c3lfYXQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RldmljZV9zdGF0ZV9idXN5X2F0X2Rlc2MsXG4gICAgICAgICAgICAgICAgICAgIG1heF9jb250YWN0czogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2NvbnRhY3RzX2Rlc2MsXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZV9leGlzdGluZzogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmVtb3ZlX2V4aXN0aW5nX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICdbZW5kcG9pbnRdJyxcbiAgICAgICAgICAgICAgICAgICAgJ3J0cF90aW1lb3V0ID0gMzAwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3J0cF90aW1lb3V0X2hvbGQgPSAzMDAnLFxuICAgICAgICAgICAgICAgICAgICAnbWF4X2F1ZGlvX3N0cmVhbXMgPSAyJyxcbiAgICAgICAgICAgICAgICAgICAgJ2RldmljZV9zdGF0ZV9idXN5X2F0ID0gMycsXG4gICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAnW2Fvcl0nLFxuICAgICAgICAgICAgICAgICAgICAnbWF4X2NvbnRhY3RzPTEwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3JlbW92ZV9leGlzdGluZyA9IHllcycsXG4gICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAnW2FjbF0nLFxuICAgICAgICAgICAgICAgICAgICAncGVybWl0PTE5Mi4xNjguMS4xMDAnLFxuICAgICAgICAgICAgICAgICAgICAncGVybWl0PTE5Mi4xNjguMS4xMDEnXG5cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcCBmb3IgZWFjaCBmaWVsZCBpbmZvIGljb25cbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRvb2x0aXBDb25maWdzW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcCBwb3B1cFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdCBmb3IgdG9vbHRpcCBjb250ZW50XG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBIVE1MIHN0cmluZyBmb3IgdG9vbHRpcCBjb250ZW50XG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudChjb25maWcpIHtcbiAgICAgICAgaWYgKCFjb25maWcpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaGVhZGVyIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPjxzdHJvbmc+JHtjb25maWcuaGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvbiBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+JHtjb25maWcuZGVzY3JpcHRpb259PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBsaXN0IGl0ZW1zIGlmIGV4aXN0XG4gICAgICAgIGlmIChjb25maWcubGlzdCkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY29uZmlnLmxpc3QpICYmIGNvbmZpZy5saXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBjb25maWcubGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIZWFkZXIgaXRlbSB3aXRob3V0IGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb25maWcubGlzdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAvLyBPbGQgZm9ybWF0IC0gb2JqZWN0IHdpdGgga2V5LXZhbHVlIHBhaXJzXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmVudHJpZXMoY29uZmlnLmxpc3QpLmZvckVhY2goKFt0ZXJtLCBkZWZpbml0aW9uXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke3Rlcm19Ojwvc3Ryb25nPiAke2RlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgbGlzdHMgKGxpc3QyLCBsaXN0MywgZXRjLilcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdE5hbWUgPSBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1tsaXN0TmFtZV0gJiYgY29uZmlnW2xpc3ROYW1lXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICAgICAgY29uZmlnW2xpc3ROYW1lXS5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8L3VsPjxwPjxzdHJvbmc+JHtpdGVtLnRlcm19PC9zdHJvbmc+PC9wPjx1bD5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgd2FybmluZyBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc21hbGwgb3JhbmdlIG1lc3NhZ2VcIj4nO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5gO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT4gYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGNvbmZpZy53YXJuaW5nLmhlYWRlcjtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSBjb25maWcud2FybmluZy50ZXh0O1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNvZGUgZXhhbXBsZXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlcyAmJiBjb25maWcuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlc0hlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxzdHJvbmc+JHtjb25maWcuZXhhbXBsZXNIZWFkZXJ9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICNmOGY4Zjg7IGJvcmRlcjogMXB4IHNvbGlkICNlMGUwZTA7XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxwcmUgc3R5bGU9XCJtYXJnaW46IDA7IGZvbnQtc2l6ZTogMC45ZW07IGxpbmUtaGVpZ2h0OiAxLjRlbTtcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcm9jZXNzIGV4YW1wbGVzIHdpdGggc3ludGF4IGhpZ2hsaWdodGluZyBmb3Igc2VjdGlvbnNcbiAgICAgICAgICAgIGNvbmZpZy5leGFtcGxlcy5mb3JFYWNoKChsaW5lLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChsaW5lLnRyaW0oKS5zdGFydHNXaXRoKCdbJykgJiYgbGluZS50cmltKCkuZW5kc1dpdGgoJ10nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiAwKSBodG1sICs9ICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8c3BhbiBzdHlsZT1cImNvbG9yOiAjMDA4NGI0OyBmb250LXdlaWdodDogYm9sZDtcIj4ke2xpbmV9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsaW5lLmluY2x1ZGVzKCc9JykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUGFyYW1ldGVyIGxpbmVcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgW3BhcmFtLCB2YWx1ZV0gPSBsaW5lLnNwbGl0KCc9JywgMik7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYFxcbjxzcGFuIHN0eWxlPVwiY29sb3I6ICM3YTNlOWQ7XCI+JHtwYXJhbX08L3NwYW4+PTxzcGFuIHN0eWxlPVwiY29sb3I6ICNjZjRhNGM7XCI+JHt2YWx1ZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZWd1bGFyIGxpbmVcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBsaW5lID8gYFxcbiR7bGluZX1gIDogJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvcHJlPic7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbm90ZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48ZW0+JHtjb25maWcubm90ZX08L2VtPjwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogRGVmaW5lIGEgY3VzdG9tIHJ1bGUgZm9yIGpRdWVyeSBmb3JtIHZhbGlkYXRpb24gbmFtZWQgJ2V4dGVuc2lvblJ1bGUnLlxuICogVGhlIHJ1bGUgY2hlY2tzIGlmIGEgZm9yd2FyZGluZyBudW1iZXIgaXMgc2VsZWN0ZWQgYnV0IHRoZSByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUaGUgdmFsaWRhdGlvbiByZXN1bHQuIElmIGZvcndhcmRpbmcgaXMgc2V0IGFuZCByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQsIGl0IHJldHVybnMgZmFsc2UgKGludmFsaWQpLiBPdGhlcndpc2UsIGl0IHJldHVybnMgdHJ1ZSAodmFsaWQpLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9ICgpID0+IHtcbiAgICAvLyBHZXQgcmluZyBsZW5ndGggYW5kIGZvcndhcmRpbmcgbnVtYmVyIGZyb20gdGhlIGZvcm1cbiAgICBjb25zdCBmd2RSaW5nTGVuZ3RoID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpO1xuICAgIGNvbnN0IGZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG5cbiAgICAvLyBJZiBmb3J3YXJkaW5nIG51bWJlciBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgcmV0dXJuIGZhbHNlIChpbnZhbGlkKVxuICAgIGlmIChmd2RGb3J3YXJkaW5nLmxlbmd0aCA+IDBcbiAgICAgICAgJiYgKFxuICAgICAgICAgICAgZndkUmluZ0xlbmd0aCA9PT0gMFxuICAgICAgICAgICAgfHxcbiAgICAgICAgICAgIGZ3ZFJpbmdMZW5ndGggPT09ICcnXG4gICAgICAgICkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgcmV0dXJuIHRydWUgKHZhbGlkKVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIG51bWJlciBpcyB0YWtlbiBieSBhbm90aGVyIGFjY291bnRcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBwYXJhbWV0ZXIgaGFzIHRoZSAnaGlkZGVuJyBjbGFzcywgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuXG4vKipcbiAqICBJbml0aWFsaXplIEVtcGxveWVlIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbi5pbml0aWFsaXplKCk7XG4gICAgYXZhdGFyLmluaXRpYWxpemUoKTtcbiAgICBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19