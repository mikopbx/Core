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

/* global globalRootUrl, globalTranslate, Extensions, Form,
 InputMaskPatterns, avatar, extensionStatusLoopWorker */

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
      extension.$sip_secret.trigger('change');
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
    }); // Initialize popups for question icons

    $("i.question").popup(); // Initialize the extension form

    extension.initializeForm();
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
      extension.$fwd_forwarding.dropdown('set text', '-').dropdown('set value', -1);
      extension.$formObj.form('set value', 'fwd_forwarding', -1);
    } // Check if forwarding when busy was set to the mobile number


    if (extension.$formObj.form('get value', 'fwd_forwardingonbusy') === extension.defaultMobileNumber) {
      // If so, set 'fwd_forwardingonbusy' to -1
      extension.$fwd_forwardingonbusy.dropdown('set text', '-').dropdown('set value', -1);
      extension.$formObj.form('set value', 'fwd_forwardingonbusy', -1);
    } // Check if forwarding when unavailable was set to the mobile number


    if (extension.$formObj.form('get value', 'fwd_forwardingonunavailable') === extension.defaultMobileNumber) {
      // If so, set 'fwd_forwardingonunavailable' to -1
      extension.$fwd_forwardingonunavailable.dropdown('set text', '-').dropdown('set value', -1);
      extension.$formObj.form('set value', 'fwd_forwardingonunavailable', -1);
    } // Clear the default mobile number


    extension.defaultMobileNumber = '';
  },

  /**
   * Generate a new SIP password.
   * The generated password will consist of 32 characters from a set of predefined characters.
   */
  generateNewSipPassword: function generateNewSipPassword() {
    // Predefined characters to be used in the password
    var chars = 'abcdef1234567890'; // Initialize the password string

    var pass = ''; // Generate a 32 characters long password

    for (var x = 0; x < 32; x += 1) {
      // Select a random character from the predefined characters
      var i = Math.floor(Math.random() * chars.length); // Add the selected character to the password

      pass += chars.charAt(i);
    } // Set the generated password as the SIP password


    extension.$sip_secret.val(pass);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJHF1YWxpZnkiLCIkcXVhbGlmeV9mcmVxIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsInZhbHVlIiwiZXhfUGFzc3dvcmROb0xvd1NpbXZvbCIsImV4X1Bhc3N3b3JkTm9OdW1iZXJzIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiaW5wdXRtYXNrIiwidGFiIiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwidmFsIiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwidHJpZ2dlciIsInRpbWVvdXROdW1iZXJJZCIsIm9uY29tcGxldGUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwib25jbGVhcmVkIiwiY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIiLCJjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIiLCJvbkJlZm9yZVBhc3RlIiwiY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlIiwic2hvd01hc2tPbkhvdmVyIiwibWF0Y2giLCJyZXBsYWNlIiwibGlzdCIsImxpc3RLZXkiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwiY2hhckF0IiwicHJvY2Vzc2VkRGF0YSIsInNsaWNlIiwiaW5wdXQiLCJzdGFydCIsInNlbGVjdGlvblN0YXJ0IiwiZW5kIiwic2VsZWN0aW9uRW5kIiwiY3VycmVudFZhbHVlIiwibmV3VmFsdWUiLCJzdWJzdHJpbmciLCJ0aW1lb3V0RW1haWxJZCIsImNiT25Db21wbGV0ZUVtYWlsIiwiZm9jdXNvdXQiLCJwaG9uZSIsInRhcmdldCIsInBvcHVwIiwiaW5pdGlhbGl6ZUZvcm0iLCJwYXN0ZWRWYWx1ZSIsIm5ld051bWJlciIsInVzZXJJZCIsImZvcm0iLCJjaGVja0F2YWlsYWJpbGl0eSIsIm5ld0VtYWlsIiwiVXNlcnNBUEkiLCJuZXdNb2JpbGVOdW1iZXIiLCJsZW5ndGgiLCJ1c2VyTmFtZSIsImNoYXJzIiwicGFzcyIsIngiLCJpIiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJpZCIsImF0dHIiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsIlBieEFwaSIsInN1Y2Nlc3NUZXN0IiwidW5kZWZpbmVkIiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwidXBkYXRlUGhvbmVSZXByZXNlbnQiLCJGb3JtIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInVybCIsIkNvbmZpZyIsInBieFVybCIsImZuIiwiZXh0ZW5zaW9uUnVsZSIsImZ3ZFJpbmdMZW5ndGgiLCJmd2RGb3J3YXJkaW5nIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5IiwiYXZhdGFyIiwiZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsU0FBUyxHQUFHO0FBQ2RDLEVBQUFBLFlBQVksRUFBRSxFQURBO0FBRWRDLEVBQUFBLGFBQWEsRUFBRSxFQUZEO0FBR2RDLEVBQUFBLG1CQUFtQixFQUFFLEVBSFA7QUFJZEMsRUFBQUEsT0FBTyxFQUFFQyxDQUFD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c0ksYUFBekIsR0FBeUMsWUFBTTtBQUMzQztBQUNBLE1BQU1DLGFBQWEsR0FBRzNKLFNBQVMsQ0FBQ2MsUUFBVixDQUFtQm9HLElBQW5CLENBQXdCLFdBQXhCLEVBQXFDLGdCQUFyQyxDQUF0QjtBQUNBLE1BQU0wQyxhQUFhLEdBQUc1SixTQUFTLENBQUNjLFFBQVYsQ0FBbUJvRyxJQUFuQixDQUF3QixXQUF4QixFQUFxQyxnQkFBckMsQ0FBdEIsQ0FIMkMsQ0FLM0M7O0FBQ0EsTUFBSTBDLGFBQWEsQ0FBQ3JDLE1BQWQsR0FBdUIsQ0FBdkIsS0FFSW9DLGFBQWEsS0FBSyxDQUFsQixJQUVBQSxhQUFhLEtBQUssRUFKdEIsQ0FBSixFQUtPO0FBQ0gsV0FBTyxLQUFQO0FBQ0gsR0FiMEMsQ0FlM0M7OztBQUNBLFNBQU8sSUFBUDtBQUNILENBakJEO0FBbUJBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQXRKLENBQUMsQ0FBQ29KLEVBQUYsQ0FBS3ZDLElBQUwsQ0FBVWUsUUFBVixDQUFtQjdHLEtBQW5CLENBQXlCeUksU0FBekIsR0FBcUMsVUFBQ3ZILEtBQUQsRUFBUXdILFNBQVI7QUFBQSxTQUFzQnpKLENBQUMsWUFBS3lKLFNBQUwsRUFBRCxDQUFtQkMsUUFBbkIsQ0FBNEIsUUFBNUIsQ0FBdEI7QUFBQSxDQUFyQztBQUdBO0FBQ0E7QUFDQTs7O0FBQ0ExSixDQUFDLENBQUMySixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCakssRUFBQUEsU0FBUyxDQUFDaUQsVUFBVjtBQUNBaUgsRUFBQUEsTUFBTSxDQUFDakgsVUFBUDtBQUNBa0gsRUFBQUEseUJBQXlCLENBQUNsSCxVQUExQjtBQUNILENBSkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBGb3JtLFxuIElucHV0TWFza1BhdHRlcm5zLCBhdmF0YXIsIGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIgKi9cblxuXG4vKipcbiAqIFRoZSBleHRlbnNpb24gb2JqZWN0LlxuICogTWFuYWdlcyB0aGUgb3BlcmF0aW9ucyBhbmQgYmVoYXZpb3JzIG9mIHRoZSBleHRlbnNpb24gZWRpdCBmb3JtXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25cbiAqL1xuY29uc3QgZXh0ZW5zaW9uID0ge1xuICAgIGRlZmF1bHRFbWFpbDogJycsXG4gICAgZGVmYXVsdE51bWJlcjogJycsXG4gICAgZGVmYXVsdE1vYmlsZU51bWJlcjogJycsXG4gICAgJG51bWJlcjogJCgnI251bWJlcicpLFxuICAgICRzaXBfc2VjcmV0OiAkKCcjc2lwX3NlY3JldCcpLFxuICAgICRtb2JpbGVfbnVtYmVyOiAkKCcjbW9iaWxlX251bWJlcicpLFxuICAgICRmd2RfZm9yd2FyZGluZzogJCgnI2Z3ZF9mb3J3YXJkaW5nJyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb25idXN5OiAkKCcjZndkX2ZvcndhcmRpbmdvbmJ1c3knKSxcbiAgICAkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiAkKCcjZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyksXG4gICAgJHF1YWxpZnk6ICQoJyNxdWFsaWZ5JyksXG4gICAgJHF1YWxpZnlfZnJlcTogJCgnI3F1YWxpZnktZnJlcScpLFxuICAgICRlbWFpbDogJCgnI3VzZXJfZW1haWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNleHRlbnNpb25zLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJ1bGFyIG1lbnUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdGFiTWVudUl0ZW1zOiAkKCcjZXh0ZW5zaW9ucy1tZW51IC5pdGVtJyksXG5cbiAgICBmb3J3YXJkaW5nU2VsZWN0OiAnI2V4dGVuc2lvbnMtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG51bWJlcjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ251bWJlcicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbnVtYmVyLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNEb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIG1vYmlsZV9udW1iZXI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ21vYmlsZV9udW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXNrJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbbW9iaWxlLW51bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX2VtYWlsOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUVtYWlsRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHVzZXJfdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VyX3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNpcF9zZWNyZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzaXBfc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRXZWFrLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IC9bQS16XS8sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1Bhc3N3b3JkTm9Mb3dTaW12b2xcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZndkX3JpbmdsZW5ndGg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfcmluZ2xlbmd0aCcsXG4gICAgICAgICAgICBkZXBlbmRzOiAnZndkX2ZvcndhcmRpbmcnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzMuLjE4MF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVJpbmdpbmdCZWZvcmVGb3J3YXJkT3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZndkX2ZvcndhcmRpbmc6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5zaW9uUnVsZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nb25idXN5OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGV4dGVuc2lvbiBmb3JtIGFuZCBpdHMgaW50ZXJhY3Rpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFNldCBkZWZhdWx0IHZhbHVlcyBmb3IgZW1haWwsIG1vYmlsZSBudW1iZXIsIGFuZCBleHRlbnNpb24gbnVtYmVyXG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPSBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYiBtZW51IGl0ZW1zLCBhY2NvcmRpb25zLCBhbmQgZHJvcGRvd24gbWVudXNcbiAgICAgICAgZXh0ZW5zaW9uLiR0YWJNZW51SXRlbXMudGFiKCk7XG4gICAgICAgICQoJyNleHRlbnNpb25zLWZvcm0gLnVpLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlIFwicXVhbGlmeVwiIGNoZWNrYm94XG4gICAgICAgIGV4dGVuc2lvbi4kcXVhbGlmeS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRxdWFsaWZ5LmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRxdWFsaWZ5X2ZyZXEucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRxdWFsaWZ5X2ZyZXEuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZHJvcGRvd24gbWVudSBmb3IgZm9yd2FyZGluZyBzZWxlY3RcbiAgICAgICAgJChleHRlbnNpb24uZm9yd2FyZGluZ1NlbGVjdCkuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCkpO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIGEgbmV3IFNJUCBwYXNzd29yZCBpZiB0aGUgZmllbGQgaXMgZW1wdHlcbiAgICAgICAgaWYgKGV4dGVuc2lvbi4kc2lwX3NlY3JldC52YWwoKSA9PT0gJycpIGV4dGVuc2lvbi5nZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCk7XG5cbiAgICAgICAgLy8gQXR0YWNoIGEgY2xpY2sgZXZlbnQgbGlzdGVuZXIgdG8gdGhlIFwiZ2VuZXJhdGUgbmV3IHBhc3N3b3JkXCIgYnV0dG9uXG4gICAgICAgICQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBcIm9uY29tcGxldGVcIiBldmVudCBoYW5kbGVyIGZvciB0aGUgZXh0ZW5zaW9uIG51bWJlciBpbnB1dFxuICAgICAgICBsZXQgdGltZW91dE51bWJlcklkO1xuICAgICAgICBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ29wdGlvbicsIHtcbiAgICAgICAgICAgIG9uY29tcGxldGU6ICgpPT57XG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBwcmV2aW91cyB0aW1lciwgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aW1lb3V0TnVtYmVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0TnVtYmVySWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dE51bWJlcklkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlTnVtYmVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vbigncGFzdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9leHRlbnNpb24uJG1vYmlsZV9udW1iZXIudmFsKG5ldyBsaWJwaG9uZW51bWJlci5Bc1lvdVR5cGUoKS5pbnB1dCgnKycrZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLnZhbCgpKSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrcyBmb3IgdGhlIG1vYmlsZSBudW1iZXIgaW5wdXRcbiAgICAgICAgY29uc3QgbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3I6ICdbMC05XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uY2xlYXJlZDogZXh0ZW5zaW9uLmNiT25DbGVhcmVkTW9iaWxlTnVtYmVyLFxuICAgICAgICAgICAgICAgIG9uY29tcGxldGU6IGV4dGVuc2lvbi5jYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIsXG4gICAgICAgICAgICAgICAgb25CZWZvcmVQYXN0ZTogZXh0ZW5zaW9uLmNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZSxcbiAgICAgICAgICAgICAgICBzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgbGlzdDogbWFza0xpc3QsXG4gICAgICAgICAgICBsaXN0S2V5OiAnbWFzaycsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5vbigncGFzdGUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7IC8vINCf0YDQtdC00L7RgtCy0YDQsNGJ0LDQtdC8INGB0YLQsNC90LTQsNGA0YLQvdC+0LUg0L/QvtCy0LXQtNC10L3QuNC1INCy0YHRgtCw0LLQutC4XG5cbiAgICAgICAgICAgIC8vINCf0L7Qu9GD0YfQsNC10Lwg0LLRgdGC0LDQstC70LXQvdC90YvQtSDQtNCw0L3QvdGL0LUg0LjQtyDQsdGD0YTQtdGA0LAg0L7QsdC80LXQvdCwXG4gICAgICAgICAgICBsZXQgcGFzdGVkRGF0YSA9ICcnO1xuICAgICAgICAgICAgaWYgKGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuY2xpcGJvYXJkRGF0YSAmJiB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7IC8vINCU0LvRjyBJRVxuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vINCf0YDQvtCy0LXRgNGP0LXQvCwg0L3QsNGH0LjQvdCw0LXRgtGB0Y8g0LvQuCDQstGB0YLQsNCy0LvQtdC90L3Ri9C5INGC0LXQutGB0YIg0YEgJysnXG4gICAgICAgICAgICBpZiAocGFzdGVkRGF0YS5jaGFyQXQoMCkgPT09ICcrJykge1xuICAgICAgICAgICAgICAgIC8vINCh0L7RhdGA0LDQvdGP0LXQvCAnKycg0Lgg0YPQtNCw0LvRj9C10Lwg0L7RgdGC0LDQu9GM0L3Ri9C1INC90LXQttC10LvQsNGC0LXQu9GM0L3Ri9C1INGB0LjQvNCy0L7Qu9GLXG4gICAgICAgICAgICAgICAgdmFyIHByb2Nlc3NlZERhdGEgPSAnKycgKyBwYXN0ZWREYXRhLnNsaWNlKDEpLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vINCj0LTQsNC70Y/QtdC8INCy0YHQtSDRgdC40LzQstC+0LvRiywg0LrRgNC+0LzQtSDRhtC40YTRgFxuICAgICAgICAgICAgICAgIHZhciBwcm9jZXNzZWREYXRhID0gcGFzdGVkRGF0YS5yZXBsYWNlKC9cXEQvZywgJycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyDQktGB0YLQsNCy0LvRj9C10Lwg0L7Rh9C40YnQtdC90L3Ri9C1INC00LDQvdC90YvQtSDQsiDQv9C+0LvQtSDQstCy0L7QtNCwXG4gICAgICAgICAgICBjb25zdCBpbnB1dCA9IHRoaXM7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IGlucHV0LnNlbGVjdGlvblN0YXJ0O1xuICAgICAgICAgICAgY29uc3QgZW5kID0gaW5wdXQuc2VsZWN0aW9uRW5kO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJChpbnB1dCkudmFsKCk7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGN1cnJlbnRWYWx1ZS5zdWJzdHJpbmcoMCwgc3RhcnQpICsgcHJvY2Vzc2VkRGF0YSArIGN1cnJlbnRWYWx1ZS5zdWJzdHJpbmcoZW5kKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soXCJyZW1vdmVcIik7XG4gICAgICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIudmFsKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIC8vINCi0YDQuNCz0LPQtdGA0LjQvCDRgdC+0LHRi9GC0LjQtSAnaW5wdXQnINC00LvRjyDQv9GA0LjQvNC10L3QtdC90LjRjyDQvNCw0YHQutC4INCy0LLQvtC00LBcbiAgICAgICAgICAgICQoaW5wdXQpLnRyaWdnZXIoJ2lucHV0Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCB0aGUgaW5wdXQgbWFzayBmb3IgdGhlIGVtYWlsIGlucHV0XG4gICAgICAgIGxldCB0aW1lb3V0RW1haWxJZDtcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZTogKCk9PntcbiAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgcHJldmlvdXMgdGltZXIsIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICh0aW1lb3V0RW1haWxJZCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dEVtYWlsSWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgICAgICAgdGltZW91dEVtYWlsSWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsKCk7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBleHRlbnNpb24uJGVtYWlsLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vQXR0YWNoIGEgZm9jdXNvdXQgZXZlbnQgbGlzdGVuZXIgdG8gdGhlIG1vYmlsZSBudW1iZXIgaW5wdXRcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmZvY3Vzb3V0KGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsZXQgcGhvbmUgPSAkKGUudGFyZ2V0KS52YWwoKS5yZXBsYWNlKC9bXjAtOV0vZywgXCJcIik7XG4gICAgICAgICAgICBpZiAocGhvbmUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJChlLnRhcmdldCkudmFsKCcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgZm9yIHF1ZXN0aW9uIGljb25zXG4gICAgICAgICQoXCJpLnF1ZXN0aW9uXCIpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIGZvcm1cbiAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBtb2JpbGUgbnVtYmVyIGZyb20gY2xpcGJvYXJkXG4gICAgICovXG4gICAgY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIGFmdGVyIGEgcGhvbmUgbnVtYmVyIGhhcyBiZWVuIGVudGVyZWQgY29tcGxldGVseS5cbiAgICAgKiBJdCBzZXJ2ZXMgdG8gY2hlY2sgaWYgdGhlcmUgYXJlIGFueSBjb25mbGljdHMgd2l0aCBleGlzdGluZyBwaG9uZSBudW1iZXJzLlxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZU51bWJlcigpIHtcbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGFmdGVyIHJlbW92aW5nIGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld051bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSB1c2VyIElEIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cbiAgICAgICAgLy8gQ2FsbCB0aGUgYGNoZWNrQXZhaWxhYmlsaXR5YCBmdW5jdGlvbiBvbiBgRXh0ZW5zaW9uc2Agb2JqZWN0XG4gICAgICAgIC8vIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGlzIGFscmVhZHkgaW4gdXNlLlxuICAgICAgICAvLyBQYXJhbWV0ZXJzOiBkZWZhdWx0IG51bWJlciwgbmV3IG51bWJlciwgY2xhc3MgbmFtZSBvZiBlcnJvciBtZXNzYWdlIChudW1iZXIpLCB1c2VyIGlkXG4gICAgICAgIEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIsIG5ld051bWJlciwgJ251bWJlcicsIHVzZXJJZCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJdCBpcyBleGVjdXRlZCBvbmNlIGFuIGVtYWlsIGFkZHJlc3MgaGFzIGJlZW4gY29tcGxldGVseSBlbnRlcmVkLlxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUVtYWlsKCkge1xuXG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSBlbnRlcmVkIHBob25lIG51bWJlciBhZnRlciByZW1vdmluZyBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdFbWFpbCA9IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBDYWxsIHRoZSBgY2hlY2tBdmFpbGFiaWxpdHlgIGZ1bmN0aW9uIG9uIGBVc2Vyc0FQSWAgb2JqZWN0XG4gICAgICAgIC8vIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVudGVyZWQgZW1haWwgaXMgYWxyZWFkeSBpbiB1c2UuXG4gICAgICAgIC8vIFBhcmFtZXRlcnM6IGRlZmF1bHQgZW1haWwsIG5ldyBlbWFpbCwgY2xhc3MgbmFtZSBvZiBlcnJvciBtZXNzYWdlIChlbWFpbCksIHVzZXIgaWRcbiAgICAgICAgVXNlcnNBUEkuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCwgbmV3RW1haWwsJ2VtYWlsJywgdXNlcklkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWN0aXZhdGVkIHdoZW4gZW50ZXJpbmcgYSBtb2JpbGUgcGhvbmUgbnVtYmVyIGluIHRoZSBlbXBsb3llZSdzIHByb2ZpbGUuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyKCkge1xuICAgICAgICAvLyBHZXQgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIHdpdGhvdXQgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIEdldCB1c2VyIElEIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cbiAgICAgICAgLy8gRHluYW1pYyBjaGVjayB0byBzZWUgaWYgdGhlIHNlbGVjdGVkIG1vYmlsZSBudW1iZXIgaXMgYXZhaWxhYmxlXG4gICAgICAgIEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIsIG5ld01vYmlsZU51bWJlciwgJ21vYmlsZS1udW1iZXInLCB1c2VySWQpO1xuXG4gICAgICAgIC8vIFJlZmlsbCB0aGUgbW9iaWxlIGRpYWxzdHJpbmcgaWYgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIGlzIGRpZmZlcmVudCB0aGFuIHRoZSBkZWZhdWx0IG9yIGlmIHRoZSBtb2JpbGUgZGlhbHN0cmluZyBpcyBlbXB0eVxuICAgICAgICBpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlclxuICAgICAgICAgICAgfHwgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnKS5sZW5ndGggPT09IDApXG4gICAgICAgICkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9iaWxlIG51bWJlciBoYXMgY2hhbmdlZFxuICAgICAgICBpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3MgdXNlcm5hbWUgZnJvbSB0aGUgZm9ybVxuICAgICAgICAgICAgY29uc3QgdXNlck5hbWUgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfdXNlcm5hbWUnKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY2FsbCBmb3J3YXJkaW5nIHdhcyBzZXQgdG8gdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgcmluZyBsZW5ndGggaXMgZW1wdHksIHNldCBpdCB0byA0NVxuICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgICAgICAgIHx8IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKT09PVwiMFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCA0NSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBuZXcgZm9yd2FyZGluZyBtb2JpbGUgbnVtYmVyIGluIHRoZSBkcm9wZG93biBhbmQgZm9ybVxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY2FsbCBmb3J3YXJkaW5nIG9uIGJ1c3kgd2FzIHNldCB0byB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgbmV3IGZvcndhcmRpbmcgbW9iaWxlIG51bWJlciBpbiB0aGUgZHJvcGRvd24gYW5kIGZvcm1cbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb25idXN5XG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNhbGwgZm9yd2FyZGluZyBvbiB1bmF2YWlsYWJsZSB3YXMgc2V0IHRvIHRoZSBkZWZhdWx0IG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgbmV3IGZvcndhcmRpbmcgbW9iaWxlIG51bWJlciBpbiB0aGUgZHJvcGRvd24gYW5kIGZvcm1cbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIGFzIHRoZSBkZWZhdWx0XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gbmV3TW9iaWxlTnVtYmVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgd2hlbiB0aGUgbW9iaWxlIHBob25lIG51bWJlciBpcyBjbGVhcmVkIGluIHRoZSBlbXBsb3llZSBjYXJkLlxuICAgICAqL1xuICAgIGNiT25DbGVhcmVkTW9iaWxlTnVtYmVyKCkge1xuICAgICAgICAvLyBDbGVhciB0aGUgJ21vYmlsZV9kaWFsc3RyaW5nJyBhbmQgJ21vYmlsZV9udW1iZXInIGZpZWxkcyBpbiB0aGUgZm9ybVxuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgJycpO1xuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9udW1iZXInLCAnJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBJZiBzbywgY2xlYXIgdGhlICdmd2RfcmluZ2xlbmd0aCcgZmllbGQgYW5kIHNldCAnZndkX2ZvcndhcmRpbmcnIHRvIC0xXG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgMCk7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nLmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJykuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnLCAtMSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdoZW4gYnVzeSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBJZiBzbywgc2V0ICdmd2RfZm9yd2FyZGluZ29uYnVzeScgdG8gLTFcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3kuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKS5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsIC0xKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiB1bmF2YWlsYWJsZSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIHNldCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyB0byAtMVxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKS5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCAtMSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGEgbmV3IFNJUCBwYXNzd29yZC5cbiAgICAgKiBUaGUgZ2VuZXJhdGVkIHBhc3N3b3JkIHdpbGwgY29uc2lzdCBvZiAzMiBjaGFyYWN0ZXJzIGZyb20gYSBzZXQgb2YgcHJlZGVmaW5lZCBjaGFyYWN0ZXJzLlxuICAgICAqL1xuICAgIGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSB7XG4gICAgICAgIC8vIFByZWRlZmluZWQgY2hhcmFjdGVycyB0byBiZSB1c2VkIGluIHRoZSBwYXNzd29yZFxuICAgICAgICBjb25zdCBjaGFycyA9ICdhYmNkZWYxMjM0NTY3ODkwJztcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBwYXNzd29yZCBzdHJpbmdcbiAgICAgICAgbGV0IHBhc3MgPSAnJztcblxuICAgICAgICAvLyBHZW5lcmF0ZSBhIDMyIGNoYXJhY3RlcnMgbG9uZyBwYXNzd29yZFxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IDMyOyB4ICs9IDEpIHtcbiAgICAgICAgICAgIC8vIFNlbGVjdCBhIHJhbmRvbSBjaGFyYWN0ZXIgZnJvbSB0aGUgcHJlZGVmaW5lZCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICBjb25zdCBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKTtcblxuICAgICAgICAgICAgLy8gQWRkIHRoZSBzZWxlY3RlZCBjaGFyYWN0ZXIgdG8gdGhlIHBhc3N3b3JkXG4gICAgICAgICAgICBwYXNzICs9IGNoYXJzLmNoYXJBdChpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aGUgZ2VuZXJhdGVkIHBhc3N3b3JkIGFzIHRoZSBTSVAgcGFzc3dvcmRcbiAgICAgICAgZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbChwYXNzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICByZXN1bHQuZGF0YS5tb2JpbGVfbnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5maW5kKCcuY2hlY2tib3gnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbnB1dCA9ICQob2JqKS5maW5kKCdpbnB1dCcpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBpbnB1dC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKCQob2JqKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbaWRdPScxJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbaWRdPScwJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAoUGJ4QXBpLnN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSl7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5pZCE9PXVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICYmIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpZCcpICE9PSByZXNwb25zZS5kYXRhLmlkKXtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb249YCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS8ke3Jlc3BvbnNlLmRhdGEuaWR9YFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdG9yZSB0aGUgY3VycmVudCBleHRlbnNpb24gbnVtYmVyIGFzIHRoZSBkZWZhdWx0IG51bWJlclxuICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci52YWwoKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBwaG9uZSByZXByZXNlbnRhdGlvbiB3aXRoIHRoZSBuZXcgZGVmYXVsdCBudW1iZXJcbiAgICAgICAgICAgIEV4dGVuc2lvbnMudXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuXG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH1cblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZXh0ZW5zaW9uLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvc2F2ZVJlY29yZGA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZXh0ZW5zaW9uLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBleHRlbnNpb24uY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuXG4vKipcbiAqIERlZmluZSBhIGN1c3RvbSBydWxlIGZvciBqUXVlcnkgZm9ybSB2YWxpZGF0aW9uIG5hbWVkICdleHRlbnNpb25SdWxlJy5cbiAqIFRoZSBydWxlIGNoZWNrcyBpZiBhIGZvcndhcmRpbmcgbnVtYmVyIGlzIHNlbGVjdGVkIGJ1dCB0aGUgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVGhlIHZhbGlkYXRpb24gcmVzdWx0LiBJZiBmb3J3YXJkaW5nIGlzIHNldCBhbmQgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LCBpdCByZXR1cm5zIGZhbHNlIChpbnZhbGlkKS4gT3RoZXJ3aXNlLCBpdCByZXR1cm5zIHRydWUgKHZhbGlkKS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuc2lvblJ1bGUgPSAoKSA9PiB7XG4gICAgLy8gR2V0IHJpbmcgbGVuZ3RoIGFuZCBmb3J3YXJkaW5nIG51bWJlciBmcm9tIHRoZSBmb3JtXG4gICAgY29uc3QgZndkUmluZ0xlbmd0aCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKTtcbiAgICBjb25zdCBmd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuXG4gICAgLy8gSWYgZm9yd2FyZGluZyBudW1iZXIgaXMgc2V0IGFuZCByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQsIHJldHVybiBmYWxzZSAoaW52YWxpZClcbiAgICBpZiAoZndkRm9yd2FyZGluZy5sZW5ndGggPiAwXG4gICAgICAgICYmIChcbiAgICAgICAgICAgIGZ3ZFJpbmdMZW5ndGggPT09IDBcbiAgICAgICAgICAgIHx8XG4gICAgICAgICAgICBmd2RSaW5nTGVuZ3RoID09PSAnJ1xuICAgICAgICApKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIHJldHVybiB0cnVlICh2YWxpZClcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBudW1iZXIgaXMgdGFrZW4gYnkgYW5vdGhlciBhY2NvdW50XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgcGFyYW1ldGVyIGhhcyB0aGUgJ2hpZGRlbicgY2xhc3MsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFbXBsb3llZSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb24uaW5pdGlhbGl6ZSgpO1xuICAgIGF2YXRhci5pbml0aWFsaXplKCk7XG4gICAgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==