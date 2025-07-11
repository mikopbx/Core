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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJHF1YWxpZnkiLCIkcXVhbGlmeV9mcmVxIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsInZhbHVlIiwiZXhfUGFzc3dvcmROb0xvd1NpbXZvbCIsImV4X1Bhc3N3b3JkTm9OdW1iZXJzIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiaW5wdXRtYXNrIiwidGFiIiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwidmFsIiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCIkaWNvbiIsImZpbmQiLCJhdHRyIiwiY2xpcGJvYXJkIiwiQ2xpcGJvYXJkSlMiLCJwb3B1cCIsInRyaWdnZXIiLCJzZXRUaW1lb3V0IiwiY2xlYXJTZWxlY3Rpb24iLCJjb25zb2xlIiwiZXJyb3IiLCJhY3Rpb24iLCJ0aW1lb3V0TnVtYmVySWQiLCJvbmNvbXBsZXRlIiwiY2xlYXJUaW1lb3V0IiwiY2JPbkNvbXBsZXRlTnVtYmVyIiwibWFza0xpc3QiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5Iiwib25jbGVhcmVkIiwiY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIiLCJjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIiLCJvbkJlZm9yZVBhc3RlIiwiY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlIiwic2hvd01hc2tPbkhvdmVyIiwibWF0Y2giLCJyZXBsYWNlIiwibGlzdCIsImxpc3RLZXkiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwiY2hhckF0IiwicHJvY2Vzc2VkRGF0YSIsInNsaWNlIiwiaW5wdXQiLCJzdGFydCIsInNlbGVjdGlvblN0YXJ0IiwiZW5kIiwic2VsZWN0aW9uRW5kIiwiY3VycmVudFZhbHVlIiwibmV3VmFsdWUiLCJzdWJzdHJpbmciLCJ0aW1lb3V0RW1haWxJZCIsImNiT25Db21wbGV0ZUVtYWlsIiwiZm9jdXNvdXQiLCJwaG9uZSIsInRhcmdldCIsImluaXRpYWxpemVGb3JtIiwicGFzdGVkVmFsdWUiLCJuZXdOdW1iZXIiLCJ1c2VySWQiLCJmb3JtIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJuZXdFbWFpbCIsIlVzZXJzQVBJIiwibmV3TW9iaWxlTnVtYmVyIiwibGVuZ3RoIiwidXNlck5hbWUiLCJQYnhBcGkiLCJQYXNzd29yZEdlbmVyYXRlIiwicGFzc3dvcmQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiaWQiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInN1Y2Nlc3NUZXN0IiwidW5kZWZpbmVkIiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwidXBkYXRlUGhvbmVSZXByZXNlbnQiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwidXJsIiwiQ29uZmlnIiwicGJ4VXJsIiwiZm4iLCJleHRlbnNpb25SdWxlIiwiZndkUmluZ0xlbmd0aCIsImZ3ZEZvcndhcmRpbmciLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiLCJhdmF0YXIiLCJleHRlbnNpb25TdGF0dXNMb29wV29ya2VyIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxTQUFTLEdBQUc7QUFDZEMsRUFB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U0FBUyxDQUFDaUQsVUFBVjtBQUNBc0gsRUFBQUEsTUFBTSxDQUFDdEgsVUFBUDtBQUNBdUgsRUFBQUEseUJBQXlCLENBQUN2SCxVQUExQjtBQUNILENBSkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBGb3JtLFxuIElucHV0TWFza1BhdHRlcm5zLCBhdmF0YXIsIGV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIsIENsaXBib2FyZEpTICovXG5cblxuLyoqXG4gKiBUaGUgZXh0ZW5zaW9uIG9iamVjdC5cbiAqIE1hbmFnZXMgdGhlIG9wZXJhdGlvbnMgYW5kIGJlaGF2aW9ycyBvZiB0aGUgZXh0ZW5zaW9uIGVkaXQgZm9ybVxuICpcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uXG4gKi9cbmNvbnN0IGV4dGVuc2lvbiA9IHtcbiAgICBkZWZhdWx0RW1haWw6ICcnLFxuICAgIGRlZmF1bHROdW1iZXI6ICcnLFxuICAgIGRlZmF1bHRNb2JpbGVOdW1iZXI6ICcnLFxuICAgICRudW1iZXI6ICQoJyNudW1iZXInKSxcbiAgICAkc2lwX3NlY3JldDogJCgnI3NpcF9zZWNyZXQnKSxcbiAgICAkbW9iaWxlX251bWJlcjogJCgnI21vYmlsZV9udW1iZXInKSxcbiAgICAkZndkX2ZvcndhcmRpbmc6ICQoJyNmd2RfZm9yd2FyZGluZycpLFxuICAgICRmd2RfZm9yd2FyZGluZ29uYnVzeTogJCgnI2Z3ZF9mb3J3YXJkaW5nb25idXN5JyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZTogJCgnI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpLFxuICAgICRxdWFsaWZ5OiAkKCcjcXVhbGlmeScpLFxuICAgICRxdWFsaWZ5X2ZyZXE6ICQoJyNxdWFsaWZ5LWZyZXEnKSxcbiAgICAkZW1haWw6ICQoJyN1c2VyX2VtYWlsJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjZXh0ZW5zaW9ucy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFidWxhciBtZW51LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRhYk1lbnVJdGVtczogJCgnI2V4dGVuc2lvbnMtbWVudSAuaXRlbScpLFxuXG4gICAgZm9yd2FyZGluZ1NlbGVjdDogJyNleHRlbnNpb25zLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBudW1iZXI6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdudW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW251bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBtb2JpbGVfbnVtYmVyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWFzaycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcl9lbWFpbDoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl9lbWFpbCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX3VzZXJuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl91c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzaXBfc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlU2VjcmV0V2VhayxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAvW0Etel0vLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogL1xcZC8sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9yaW5nbGVuZ3RoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuICAgICAgICAgICAgZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb24gZm9ybSBhbmQgaXRzIGludGVyYWN0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIGVtYWlsLCBtb2JpbGUgbnVtYmVyLCBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgbWVudSBpdGVtcywgYWNjb3JkaW9ucywgYW5kIGRyb3Bkb3duIG1lbnVzXG4gICAgICAgIGV4dGVuc2lvbi4kdGFiTWVudUl0ZW1zLnRhYigpO1xuICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIC51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcbiAgICAgICAgJCgnI2V4dGVuc2lvbnMtZm9ybSAuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IG9mIHRoZSBcInF1YWxpZnlcIiBjaGVja2JveFxuICAgICAgICBleHRlbnNpb24uJHF1YWxpZnkuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kcXVhbGlmeS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kcXVhbGlmeV9mcmVxLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kcXVhbGlmeV9mcmVxLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRyb3Bkb3duIG1lbnUgZm9yIGZvcndhcmRpbmcgc2VsZWN0XG4gICAgICAgICQoZXh0ZW5zaW9uLmZvcndhcmRpbmdTZWxlY3QpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgpKTtcblxuICAgICAgICAvLyBHZW5lcmF0ZSBhIG5ldyBTSVAgcGFzc3dvcmQgaWYgdGhlIGZpZWxkIGlzIGVtcHR5XG4gICAgICAgIGlmIChleHRlbnNpb24uJHNpcF9zZWNyZXQudmFsKCkgPT09ICcnKSBleHRlbnNpb24uZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpO1xuXG4gICAgICAgIC8vIEF0dGFjaCBhIGNsaWNrIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBcImdlbmVyYXRlIG5ldyBwYXNzd29yZFwiIGJ1dHRvblxuICAgICAgICAkKCcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5nZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNob3cvaGlkZSBwYXNzd29yZCB0b2dnbGVcbiAgICAgICAgJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkYnV0dG9uLmZpbmQoJ2knKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kc2lwX3NlY3JldC5hdHRyKCd0eXBlJykgPT09ICdwYXNzd29yZCcpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJHNpcF9zZWNyZXQuYXR0cigndHlwZScsICd0ZXh0Jyk7XG4gICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V5ZScpLmFkZENsYXNzKCdleWUgc2xhc2gnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LmF0dHIoJ3R5cGUnLCAncGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllIHNsYXNoJykuYWRkQ2xhc3MoJ2V5ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmb3IgcGFzc3dvcmQgY29weVxuICAgICAgICBjb25zdCBjbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jbGlwYm9hcmQnKTtcbiAgICAgICAgJCgnLmNsaXBib2FyZCcpLnBvcHVwKHtcbiAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2xpcGJvYXJkLm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBY3Rpb246JywgZS5hY3Rpb24pO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJpZ2dlcjonLCBlLnRyaWdnZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIFwib25jb21wbGV0ZVwiIGV2ZW50IGhhbmRsZXIgZm9yIHRoZSBleHRlbnNpb24gbnVtYmVyIGlucHV0XG4gICAgICAgIGxldCB0aW1lb3V0TnVtYmVySWQ7XG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygnb3B0aW9uJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZTogKCk9PntcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWVvdXROdW1iZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXROdW1iZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIHdpdGggYSBkZWxheSBvZiAwLjUgc2Vjb25kc1xuICAgICAgICAgICAgICAgICAgICB0aW1lb3V0TnVtYmVySWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2V4dGVuc2lvbi4kbW9iaWxlX251bWJlci52YWwobmV3IGxpYnBob25lbnVtYmVyLkFzWW91VHlwZSgpLmlucHV0KCcrJytleHRlbnNpb24uJG1vYmlsZV9udW1iZXIudmFsKCkpKTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2tzIGZvciB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBjb25zdCBtYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrcyh7XG4gICAgICAgICAgICBpbnB1dG1hc2s6IHtcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAnIyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcjogJ1swLTldJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRpbmFsaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25jbGVhcmVkOiBleHRlbnNpb24uY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIsXG4gICAgICAgICAgICAgICAgb25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcbiAgICAgICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBleHRlbnNpb24uY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlLFxuICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICByZXBsYWNlOiAnOScsXG4gICAgICAgICAgICBsaXN0OiBtYXNrTGlzdCxcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTsgLy8g0J/RgNC10LTQvtGC0LLRgNCw0YnQsNC10Lwg0YHRgtCw0L3QtNCw0YDRgtC90L7QtSDQv9C+0LLQtdC00LXQvdC40LUg0LLRgdGC0LDQstC60LhcblxuICAgICAgICAgICAgLy8g0J/QvtC70YPRh9Cw0LXQvCDQstGB0YLQsNCy0LvQtdC90L3Ri9C1INC00LDQvdC90YvQtSDQuNC3INCx0YPRhNC10YDQsCDQvtCx0LzQtdC90LBcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5jbGlwYm9hcmREYXRhICYmIHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEpIHsgLy8g0JTQu9GPIElFXG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8g0J/RgNC+0LLQtdGA0Y/QtdC8LCDQvdCw0YfQuNC90LDQtdGC0YHRjyDQu9C4INCy0YHRgtCw0LLQu9C10L3QvdGL0Lkg0YLQtdC60YHRgiDRgSAnKydcbiAgICAgICAgICAgIGlmIChwYXN0ZWREYXRhLmNoYXJBdCgwKSA9PT0gJysnKSB7XG4gICAgICAgICAgICAgICAgLy8g0KHQvtGF0YDQsNC90Y/QtdC8ICcrJyDQuCDRg9C00LDQu9GP0LXQvCDQvtGB0YLQsNC70YzQvdGL0LUg0L3QtdC20LXQu9Cw0YLQtdC70YzQvdGL0LUg0YHQuNC80LLQvtC70YtcbiAgICAgICAgICAgICAgICB2YXIgcHJvY2Vzc2VkRGF0YSA9ICcrJyArIHBhc3RlZERhdGEuc2xpY2UoMSkucmVwbGFjZSgvXFxEL2csICcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8g0KPQtNCw0LvRj9C10Lwg0LLRgdC1INGB0LjQvNCy0L7Qu9GLLCDQutGA0L7QvNC1INGG0LjRhNGAXG4gICAgICAgICAgICAgICAgdmFyIHByb2Nlc3NlZERhdGEgPSBwYXN0ZWREYXRhLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vINCS0YHRgtCw0LLQu9GP0LXQvCDQvtGH0LjRidC10L3QvdGL0LUg0LTQsNC90L3Ri9C1INCyINC/0L7Qu9C1INCy0LLQvtC00LBcbiAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gaW5wdXQuc2VsZWN0aW9uU3RhcnQ7XG4gICAgICAgICAgICBjb25zdCBlbmQgPSBpbnB1dC5zZWxlY3Rpb25FbmQ7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkKGlucHV0KS52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gY3VycmVudFZhbHVlLnN1YnN0cmluZygwLCBzdGFydCkgKyBwcm9jZXNzZWREYXRhICsgY3VycmVudFZhbHVlLnN1YnN0cmluZyhlbmQpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzayhcInJlbW92ZVwiKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci52YWwobmV3VmFsdWUpO1xuICAgICAgICAgICAgLy8g0KLRgNC40LPQs9C10YDQuNC8INGB0L7QsdGL0YLQuNC1ICdpbnB1dCcg0LTQu9GPINC/0YDQuNC80LXQvdC10L3QuNGPINC80LDRgdC60Lgg0LLQstC+0LTQsFxuICAgICAgICAgICAgJChpbnB1dCkudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrIGZvciB0aGUgZW1haWwgaW5wdXRcbiAgICAgICAgbGV0IHRpbWVvdXRFbWFpbElkO1xuICAgICAgICBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygnZW1haWwnLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiAoKT0+e1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBwcmV2aW91cyB0aW1lciwgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKHRpbWVvdXRFbWFpbElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0RW1haWxJZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICAgICAgICB0aW1lb3V0RW1haWxJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwoKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwub24oJ3Bhc3RlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9BdHRhY2ggYSBmb2N1c291dCBldmVudCBsaXN0ZW5lciB0byB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuZm9jdXNvdXQoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxldCBwaG9uZSA9ICQoZS50YXJnZXQpLnZhbCgpLnJlcGxhY2UoL1teMC05XS9nLCBcIlwiKTtcbiAgICAgICAgICAgIGlmIChwaG9uZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAkKGUudGFyZ2V0KS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBmb3IgcXVlc3Rpb24gaWNvbnMgYW5kIGJ1dHRvbnNcbiAgICAgICAgJChcImkucXVlc3Rpb25cIikucG9wdXAoKTtcbiAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIGV4dGVuc2lvbi4kc2lwX3NlY3JldC5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gZm9ybVxuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHBhc3RlIG1vYmlsZSBudW1iZXIgZnJvbSBjbGlwYm9hcmRcbiAgICAgKi9cbiAgICBjYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgYWZ0ZXIgYSBwaG9uZSBudW1iZXIgaGFzIGJlZW4gZW50ZXJlZCBjb21wbGV0ZWx5LlxuICAgICAqIEl0IHNlcnZlcyB0byBjaGVjayBpZiB0aGVyZSBhcmUgYW55IGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIHBob25lIG51bWJlcnMuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgYWZ0ZXIgcmVtb3ZpbmcgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBDYWxsIHRoZSBgY2hlY2tBdmFpbGFiaWxpdHlgIGZ1bmN0aW9uIG9uIGBFeHRlbnNpb25zYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgaXMgYWxyZWFkeSBpbiB1c2UuXG4gICAgICAgIC8vIFBhcmFtZXRlcnM6IGRlZmF1bHQgbnVtYmVyLCBuZXcgbnVtYmVyLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKG51bWJlciksIHVzZXIgaWRcbiAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE51bWJlciwgbmV3TnVtYmVyLCAnbnVtYmVyJywgdXNlcklkKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIG9uY2UgYW4gZW1haWwgYWRkcmVzcyBoYXMgYmVlbiBjb21wbGV0ZWx5IGVudGVyZWQuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlRW1haWwoKSB7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGFmdGVyIHJlbW92aW5nIGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld0VtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGBjaGVja0F2YWlsYWJpbGl0eWAgZnVuY3Rpb24gb24gYFVzZXJzQVBJYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBlbWFpbCBpcyBhbHJlYWR5IGluIHVzZS5cbiAgICAgICAgLy8gUGFyYW1ldGVyczogZGVmYXVsdCBlbWFpbCwgbmV3IGVtYWlsLCBjbGFzcyBuYW1lIG9mIGVycm9yIG1lc3NhZ2UgKGVtYWlsKSwgdXNlciBpZFxuICAgICAgICBVc2Vyc0FQSS5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdEVtYWlsLCBuZXdFbWFpbCwnZW1haWwnLCB1c2VySWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBY3RpdmF0ZWQgd2hlbiBlbnRlcmluZyBhIG1vYmlsZSBwaG9uZSBudW1iZXIgaW4gdGhlIGVtcGxveWVlJ3MgcHJvZmlsZS5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgd2l0aG91dCBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gR2V0IHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBEeW5hbWljIGNoZWNrIHRvIHNlZSBpZiB0aGUgc2VsZWN0ZWQgbW9iaWxlIG51bWJlciBpcyBhdmFpbGFibGVcbiAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciwgbmV3TW9iaWxlTnVtYmVyLCAnbW9iaWxlLW51bWJlcicsIHVzZXJJZCk7XG5cbiAgICAgICAgLy8gUmVmaWxsIHRoZSBtb2JpbGUgZGlhbHN0cmluZyBpZiB0aGUgbmV3IG1vYmlsZSBudW1iZXIgaXMgZGlmZmVyZW50IHRoYW4gdGhlIGRlZmF1bHQgb3IgaWYgdGhlIG1vYmlsZSBkaWFsc3RyaW5nIGlzIGVtcHR5XG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyXG4gICAgICAgICAgICB8fCAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycpLmxlbmd0aCA9PT0gMClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2JpbGUgbnVtYmVyIGhhcyBjaGFuZ2VkXG4gICAgICAgIGlmIChuZXdNb2JpbGVOdW1iZXIgIT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyB1c2VybmFtZSBmcm9tIHRoZSBmb3JtXG4gICAgICAgICAgICBjb25zdCB1c2VyTmFtZSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl91c2VybmFtZScpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBjYWxsIGZvcndhcmRpbmcgd2FzIHNldCB0byB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSByaW5nIGxlbmd0aCBpcyBlbXB0eSwgc2V0IGl0IHRvIDQ1XG4gICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKS5sZW5ndGggPT09IDBcbiAgICAgICAgICAgICAgICAgICAgfHwgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpPT09XCIwXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDQ1KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIG5ldyBmb3J3YXJkaW5nIG1vYmlsZSBudW1iZXIgaW4gdGhlIGRyb3Bkb3duIGFuZCBmb3JtXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ1xuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBjYWxsIGZvcndhcmRpbmcgb24gYnVzeSB3YXMgc2V0IHRvIHRoZSBkZWZhdWx0IG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBuZXcgZm9yd2FyZGluZyBtb2JpbGUgbnVtYmVyIGluIHRoZSBkcm9wZG93biBhbmQgZm9ybVxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3lcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY2FsbCBmb3J3YXJkaW5nIG9uIHVuYXZhaWxhYmxlIHdhcyBzZXQgdG8gdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBuZXcgZm9yd2FyZGluZyBtb2JpbGUgbnVtYmVyIGluIHRoZSBkcm9wZG93biBhbmQgZm9ybVxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFNldCB0aGUgbmV3IG1vYmlsZSBudW1iZXIgYXMgdGhlIGRlZmF1bHRcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBuZXdNb2JpbGVOdW1iZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxlZCB3aGVuIHRoZSBtb2JpbGUgcGhvbmUgbnVtYmVyIGlzIGNsZWFyZWQgaW4gdGhlIGVtcGxveWVlIGNhcmQuXG4gICAgICovXG4gICAgY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIENsZWFyIHRoZSAnbW9iaWxlX2RpYWxzdHJpbmcnIGFuZCAnbW9iaWxlX251bWJlcicgZmllbGRzIGluIHRoZSBmb3JtXG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX251bWJlcicsICcnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIElmIHNvLCBjbGVhciB0aGUgJ2Z3ZF9yaW5nbGVuZ3RoJyBmaWVsZCBhbmQgc2V0ICdmd2RfZm9yd2FyZGluZycgdG8gLTFcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCAwKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmcuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKS5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuICAgICAgICAgICAgLy9leHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgLTEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIGJ1c3kgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIHNldCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knIHRvIC0xXG4gICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb25idXN5LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJykuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcbiAgICAgICAgICAgIC8vZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsIC0xKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiB1bmF2YWlsYWJsZSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIHNldCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyB0byAtMVxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKS5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuICAgICAgICAgICAgLy9leHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIC0xKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIHRoZSBkZWZhdWx0IG1vYmlsZSBudW1iZXJcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBuZXcgU0lQIHBhc3N3b3JkLlxuICAgICAqIFRoZSBnZW5lcmF0ZWQgcGFzc3dvcmQgd2lsbCBjb25zaXN0IG9mIDE2IGNoYXJhY3RlcnMgdXNpbmcgYmFzZTY0LXNhZmUgYWxwaGFiZXQuXG4gICAgICovXG4gICAgZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcbiAgICAgICAgLy8gUmVxdWVzdCAxNiBjaGFycyBmb3IgdW5pZmllZCBwYXNzd29yZCBsZW5ndGhcbiAgICAgICAgUGJ4QXBpLlBhc3N3b3JkR2VuZXJhdGUoMTYsIChwYXNzd29yZCkgPT4ge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzaXBfc2VjcmV0JywgcGFzc3dvcmQpO1xuICAgICAgICAgICAgLy8gVXBkYXRlIGNsaXBib2FyZCBidXR0b24gYXR0cmlidXRlXG4gICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJlc3VsdC5kYXRhLm1vYmlsZV9udW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZpbmQoJy5jaGVja2JveCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gJChvYmopLmZpbmQoJ2lucHV0Jyk7XG4gICAgICAgICAgICBjb25zdCBpZCA9IGlucHV0LmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoJChvYmopLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtpZF09JzEnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtpZF09JzAnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChQYnhBcGkuc3VjY2Vzc1Rlc3QocmVzcG9uc2UpKXtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmlkIT09dW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgJiYgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ2lkJykgIT09IHJlc3BvbnNlLmRhdGEuaWQpe1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbj1gJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5LyR7cmVzcG9uc2UuZGF0YS5pZH1gXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBjdXJyZW50IGV4dGVuc2lvbiBudW1iZXIgYXMgdGhlIGRlZmF1bHQgbnVtYmVyXG4gICAgICAgICAgICBleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLnZhbCgpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHBob25lIHJlcHJlc2VudGF0aW9uIHdpdGggdGhlIG5ldyBkZWZhdWx0IG51bWJlclxuICAgICAgICAgICAgRXh0ZW5zaW9ucy51cGRhdGVQaG9uZVJlcHJlc2VudChleHRlbnNpb24uZGVmYXVsdE51bWJlcik7XG5cbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBleHRlbnNpb24uJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9zYXZlUmVjb3JkYDsgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBleHRlbnNpb24udmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZXh0ZW5zaW9uLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG5cbi8qKlxuICogRGVmaW5lIGEgY3VzdG9tIHJ1bGUgZm9yIGpRdWVyeSBmb3JtIHZhbGlkYXRpb24gbmFtZWQgJ2V4dGVuc2lvblJ1bGUnLlxuICogVGhlIHJ1bGUgY2hlY2tzIGlmIGEgZm9yd2FyZGluZyBudW1iZXIgaXMgc2VsZWN0ZWQgYnV0IHRoZSByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUaGUgdmFsaWRhdGlvbiByZXN1bHQuIElmIGZvcndhcmRpbmcgaXMgc2V0IGFuZCByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQsIGl0IHJldHVybnMgZmFsc2UgKGludmFsaWQpLiBPdGhlcndpc2UsIGl0IHJldHVybnMgdHJ1ZSAodmFsaWQpLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9ICgpID0+IHtcbiAgICAvLyBHZXQgcmluZyBsZW5ndGggYW5kIGZvcndhcmRpbmcgbnVtYmVyIGZyb20gdGhlIGZvcm1cbiAgICBjb25zdCBmd2RSaW5nTGVuZ3RoID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpO1xuICAgIGNvbnN0IGZ3ZEZvcndhcmRpbmcgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJyk7XG5cbiAgICAvLyBJZiBmb3J3YXJkaW5nIG51bWJlciBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgcmV0dXJuIGZhbHNlIChpbnZhbGlkKVxuICAgIGlmIChmd2RGb3J3YXJkaW5nLmxlbmd0aCA+IDBcbiAgICAgICAgJiYgKFxuICAgICAgICAgICAgZndkUmluZ0xlbmd0aCA9PT0gMFxuICAgICAgICAgICAgfHxcbiAgICAgICAgICAgIGZ3ZFJpbmdMZW5ndGggPT09ICcnXG4gICAgICAgICkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgcmV0dXJuIHRydWUgKHZhbGlkKVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIG51bWJlciBpcyB0YWtlbiBieSBhbm90aGVyIGFjY291bnRcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBwYXJhbWV0ZXIgaGFzIHRoZSAnaGlkZGVuJyBjbGFzcywgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuXG4vKipcbiAqICBJbml0aWFsaXplIEVtcGxveWVlIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbi5pbml0aWFsaXplKCk7XG4gICAgYXZhdGFyLmluaXRpYWxpemUoKTtcbiAgICBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19