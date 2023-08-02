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
      }, {
        type: 'specialCharactersExist',
        prompt: globalTranslate.ex_ValidateUsernameSpecialCharacters
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

    extension.$number.inputmask('option', {
      oncomplete: extension.cbOnCompleteNumber
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
    }); // Set up the input mask for the email input

    extension.$email.inputmask('email', {
      oncomplete: extension.cbOnCompleteEmail
    });
    extension.$email.on('paste', function () {
      extension.cbOnCompleteEmail();
    }); // Attach a focusout event listener to the mobile number input

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
    // Parameters: default number, new number, type of check (number), user id

    Extensions.checkAvailability(extension.defaultNumber, newNumber, 'number', userId);
  },

  /**
   * It is executed once an email address has been completely entered.
   */
  cbOnCompleteEmail: function cbOnCompleteEmail() {
    // Dynamic check to see if the entered email is available
    $.api({
      // The URL for the API request, `globalRootUrl` is a global variable containing the base URL
      url: "".concat(globalRootUrl, "users/available/{value}"),
      // The jQuery selector for the context in which to search for the state
      stateContext: '.ui.input.email',
      // 'now' will execute the API request immediately when called
      on: 'now',
      // This function will be called before the API request is made, used to modify settings of the request
      beforeSend: function beforeSend(settings) {
        var result = settings; // Add the entered email to the URL of the API request

        result.urlData = {
          value: extension.$formObj.form('get value', 'user_email')
        };
        return result;
      },
      // This function will be called when the API request is successful
      onSuccess: function onSuccess(response) {
        // If the response indicates that the email is available or the entered email is the same as the default email
        if (response.emailAvailable || extension.defaultEmail === extension.$formObj.form('get value', 'user_email')) {
          // Remove the error class from the email input field
          $('.ui.input.email').parent().removeClass('error'); // Hide the email error message

          $('#email-error').addClass('hidden');
        } else {
          // Add the error class to the email input field
          $('.ui.input.email').parent().addClass('error'); // Show the email error message

          $('#email-error').removeClass('hidden');
        }
      }
    });
  },

  /**
   * Activated when entering a mobile phone number in the employee's profile.
   */
  cbOnCompleteMobileNumber: function cbOnCompleteMobileNumber() {
    console.log('cbOnCompleteMobileNumber'); // Get the new mobile number without any input mask

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
        if (extension.$formObj.form('get value', 'fwd_ringlength').length === 0) {
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
    console.log("new mobile number ".concat(extension.defaultMobileNumber, " "));
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
      extension.$formObj.form('set value', 'fwd_ringlength', '');
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
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    // Store the current extension number as the default number
    extension.defaultNumber = extension.$number.val(); // Update the phone representation with the new default number

    Extensions.UpdatePhoneRepresent(extension.defaultNumber);
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = extension.$formObj;
    Form.url = "".concat(globalRootUrl, "extensions/save"); // Form submission URL

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

  if (fwdForwarding.length > 0 && (fwdRingLength === '0' || fwdRingLength === '')) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJHF1YWxpZnkiLCIkcXVhbGlmeV9mcmVxIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJleF9WYWxpZGF0ZVVzZXJuYW1lU3BlY2lhbENoYXJhY3RlcnMiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsInZhbHVlIiwiZXhfUGFzc3dvcmROb0xvd1NpbXZvbCIsImV4X1Bhc3N3b3JkTm9OdW1iZXJzIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiaW5wdXRtYXNrIiwidGFiIiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwidmFsIiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwidHJpZ2dlciIsIm9uY29tcGxldGUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJtYXNrTGlzdCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJjYk9uQ2xlYXJlZE1vYmlsZU51bWJlciIsImNiT25Db21wbGV0ZU1vYmlsZU51bWJlciIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsImNiT25Db21wbGV0ZUVtYWlsIiwiZm9jdXNvdXQiLCJwaG9uZSIsInRhcmdldCIsInBvcHVwIiwiaW5pdGlhbGl6ZUZvcm0iLCJwYXN0ZWRWYWx1ZSIsIm5ld051bWJlciIsInVzZXJJZCIsImZvcm0iLCJjaGVja0F2YWlsYWJpbGl0eSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJlbWFpbEF2YWlsYWJsZSIsInBhcmVudCIsImNvbnNvbGUiLCJsb2ciLCJuZXdNb2JpbGVOdW1iZXIiLCJsZW5ndGgiLCJ1c2VyTmFtZSIsImNoYXJzIiwicGFzcyIsIngiLCJpIiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwiY2hhckF0IiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJVcGRhdGVQaG9uZVJlcHJlc2VudCIsIkZvcm0iLCJmbiIsImV4dGVuc2lvblJ1bGUiLCJmd2RSaW5nTGVuZ3RoIiwiZndkRm9yd2FyZGluZyIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSIsImF2YXRhciIsImV4dGVuc2lvblN0YXR1c0xvb3BXb3JrZXIiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFNBQVMsR0FBRztBQUNkQyxFQUFBQSxZQUFZLEVBQUUsRUFEQTtBQUVkQyxFQUFBQSxhQUFhLEVBQUUsRUFGRDtBQUdkQyxFQUFBQSxtQkFBbUIsRUFBRSxFQUhQO0FBSWRDLEVBQUFBLE9BQU8sRUFBRUMsQ0FBQyxDQUFDLFNBQUQsQ0FKSTtBQUtkQyxFQUFBQSxXQUFXLEVBQUVELENBQUMsQ0FBQyxhQUFELENBTEE7QUFNZEUsRUFBQUEsY0FBYyxFQUFFRixDQUFDLENBQUMsZ0JBQUQsQ0FOSDtBQU9kRyxFQUFBQSxlQUFlLEVBQUVILENBQUMsQ0FBQyxpQkFBRCxDQVBKO0FBUWRJLEVBQUFBLHFCQUFxQixFQUFFSixDQUFDLENBQUMsdUJBQUQsQ0FSVjtBQVNkSyxFQUFBQSw0QkFBNEIsRUFBRUwsQ0FBQyxDQUFDLDhCQUFELENBVGpCO0FBVWRNLEVBQUFBLFFBQVEsRUFBRU4sQ0FBQyxDQUFDLFVB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bEIsSUFFQUEsYUFBYSxLQUFLLEVBSnRCLENBQUosRUFLTztBQUNILFdBQU8sS0FBUDtBQUNILEdBYjBDLENBZTNDOzs7QUFDQSxTQUFPLElBQVA7QUFDSCxDQWpCRDtBQW1CQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0E1SCxDQUFDLENBQUMwSCxFQUFGLENBQUtoQyxJQUFMLENBQVVPLFFBQVYsQ0FBbUJsRixLQUFuQixDQUF5QitHLFNBQXpCLEdBQXFDLFVBQUM1RixLQUFELEVBQVE2RixTQUFSO0FBQUEsU0FBc0IvSCxDQUFDLFlBQUsrSCxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFHQTtBQUNBO0FBQ0E7OztBQUNBaEksQ0FBQyxDQUFDaUksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnZJLEVBQUFBLFNBQVMsQ0FBQ2tELFVBQVY7QUFDQXNGLEVBQUFBLE1BQU0sQ0FBQ3RGLFVBQVA7QUFDQXVGLEVBQUFBLHlCQUF5QixDQUFDdkYsVUFBMUI7QUFDSCxDQUpEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRm9ybSxcbiBJbnB1dE1hc2tQYXR0ZXJucywgYXZhdGFyLCBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyICovXG5cblxuLyoqXG4gKiBUaGUgZXh0ZW5zaW9uIG9iamVjdC5cbiAqIE1hbmFnZXMgdGhlIG9wZXJhdGlvbnMgYW5kIGJlaGF2aW9ycyBvZiB0aGUgZXh0ZW5zaW9uIGVkaXQgZm9ybVxuICpcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uXG4gKi9cbmNvbnN0IGV4dGVuc2lvbiA9IHtcbiAgICBkZWZhdWx0RW1haWw6ICcnLFxuICAgIGRlZmF1bHROdW1iZXI6ICcnLFxuICAgIGRlZmF1bHRNb2JpbGVOdW1iZXI6ICcnLFxuICAgICRudW1iZXI6ICQoJyNudW1iZXInKSxcbiAgICAkc2lwX3NlY3JldDogJCgnI3NpcF9zZWNyZXQnKSxcbiAgICAkbW9iaWxlX251bWJlcjogJCgnI21vYmlsZV9udW1iZXInKSxcbiAgICAkZndkX2ZvcndhcmRpbmc6ICQoJyNmd2RfZm9yd2FyZGluZycpLFxuICAgICRmd2RfZm9yd2FyZGluZ29uYnVzeTogJCgnI2Z3ZF9mb3J3YXJkaW5nb25idXN5JyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZTogJCgnI2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpLFxuICAgICRxdWFsaWZ5OiAkKCcjcXVhbGlmeScpLFxuICAgICRxdWFsaWZ5X2ZyZXE6ICQoJyNxdWFsaWZ5LWZyZXEnKSxcbiAgICAkZW1haWw6ICQoJyN1c2VyX2VtYWlsJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjZXh0ZW5zaW9ucy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFidWxhciBtZW51LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRhYk1lbnVJdGVtczogJCgnI2V4dGVuc2lvbnMtbWVudSAuaXRlbScpLFxuXG4gICAgZm9yd2FyZGluZ1NlbGVjdDogJyNleHRlbnNpb25zLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBudW1iZXI6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdudW1iZXInLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW251bWJlci1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU51bWJlcklzRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBtb2JpbGVfbnVtYmVyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdtb2JpbGVfbnVtYmVyJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWFzaycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlSXNOb3RDb3JyZWN0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW21vYmlsZS1udW1iZXItZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVNb2JpbGVOdW1iZXJJc0RvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcl9lbWFpbDoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl9lbWFpbCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFbWFpbEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX3VzZXJuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcl91c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVVc2VybmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3BlY2lhbENoYXJhY3RlcnNFeGlzdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlVXNlcm5hbWVTcGVjaWFsQ2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNpcF9zZWNyZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzaXBfc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRXZWFrLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IC9bQS16XS8sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1Bhc3N3b3JkTm9Mb3dTaW12b2xcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZndkX3JpbmdsZW5ndGg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfcmluZ2xlbmd0aCcsXG4gICAgICAgICAgICBkZXBlbmRzOiAnZndkX2ZvcndhcmRpbmcnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzMuLjE4MF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVJpbmdpbmdCZWZvcmVGb3J3YXJkT3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZndkX2ZvcndhcmRpbmc6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5zaW9uUnVsZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nb25idXN5OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGV4dGVuc2lvbiBmb3JtIGFuZCBpdHMgaW50ZXJhY3Rpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFNldCBkZWZhdWx0IHZhbHVlcyBmb3IgZW1haWwsIG1vYmlsZSBudW1iZXIsIGFuZCBleHRlbnNpb24gbnVtYmVyXG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPSBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYiBtZW51IGl0ZW1zLCBhY2NvcmRpb25zLCBhbmQgZHJvcGRvd24gbWVudXNcbiAgICAgICAgZXh0ZW5zaW9uLiR0YWJNZW51SXRlbXMudGFiKCk7XG4gICAgICAgICQoJyNleHRlbnNpb25zLWZvcm0gLnVpLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlIFwicXVhbGlmeVwiIGNoZWNrYm94XG4gICAgICAgIGV4dGVuc2lvbi4kcXVhbGlmeS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRxdWFsaWZ5LmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRxdWFsaWZ5X2ZyZXEucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRxdWFsaWZ5X2ZyZXEuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZHJvcGRvd24gbWVudSBmb3IgZm9yd2FyZGluZyBzZWxlY3RcbiAgICAgICAgJChleHRlbnNpb24uZm9yd2FyZGluZ1NlbGVjdCkuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCkpO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIGEgbmV3IFNJUCBwYXNzd29yZCBpZiB0aGUgZmllbGQgaXMgZW1wdHlcbiAgICAgICAgaWYgKGV4dGVuc2lvbi4kc2lwX3NlY3JldC52YWwoKSA9PT0gJycpIGV4dGVuc2lvbi5nZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCk7XG5cbiAgICAgICAgLy8gQXR0YWNoIGEgY2xpY2sgZXZlbnQgbGlzdGVuZXIgdG8gdGhlIFwiZ2VuZXJhdGUgbmV3IHBhc3N3b3JkXCIgYnV0dG9uXG4gICAgICAgICQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kc2lwX3NlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBcIm9uY29tcGxldGVcIiBldmVudCBoYW5kbGVyIGZvciB0aGUgZXh0ZW5zaW9uIG51bWJlciBpbnB1dFxuICAgICAgICBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ29wdGlvbicsIHtcbiAgICAgICAgICAgIG9uY29tcGxldGU6IGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIsXG4gICAgICAgIH0pO1xuICAgICAgICBleHRlbnNpb24uJG51bWJlci5vbigncGFzdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVOdW1iZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrcyBmb3IgdGhlIG1vYmlsZSBudW1iZXIgaW5wdXRcbiAgICAgICAgY29uc3QgbWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3I6ICdbMC05XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uY2xlYXJlZDogZXh0ZW5zaW9uLmNiT25DbGVhcmVkTW9iaWxlTnVtYmVyLFxuICAgICAgICAgICAgICAgIG9uY29tcGxldGU6IGV4dGVuc2lvbi5jYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIsXG4gICAgICAgICAgICAgICAgb25CZWZvcmVQYXN0ZTogZXh0ZW5zaW9uLmNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZSxcbiAgICAgICAgICAgICAgICBzaG93TWFza09uSG92ZXI6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgbGlzdDogbWFza0xpc3QsXG4gICAgICAgICAgICBsaXN0S2V5OiAnbWFzaycsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCB0aGUgaW5wdXQgbWFzayBmb3IgdGhlIGVtYWlsIGlucHV0XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcsIHtcbiAgICAgICAgICAgIG9uY29tcGxldGU6IGV4dGVuc2lvbi5jYk9uQ29tcGxldGVFbWFpbCxcbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbi4kZW1haWwub24oJ3Bhc3RlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQXR0YWNoIGEgZm9jdXNvdXQgZXZlbnQgbGlzdGVuZXIgdG8gdGhlIG1vYmlsZSBudW1iZXIgaW5wdXRcbiAgICAgICAgZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmZvY3Vzb3V0KGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsZXQgcGhvbmUgPSAkKGUudGFyZ2V0KS52YWwoKS5yZXBsYWNlKC9bXjAtOV0vZywgXCJcIik7XG4gICAgICAgICAgICBpZiAocGhvbmUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJChlLnRhcmdldCkudmFsKCcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgZm9yIHF1ZXN0aW9uIGljb25zXG4gICAgICAgICQoXCJpLnF1ZXN0aW9uXCIpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIGZvcm1cbiAgICAgICAgZXh0ZW5zaW9uLmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBtb2JpbGUgbnVtYmVyIGZyb20gY2xpcGJvYXJkXG4gICAgICovXG4gICAgY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIGFmdGVyIGEgcGhvbmUgbnVtYmVyIGhhcyBiZWVuIGVudGVyZWQgY29tcGxldGVseS5cbiAgICAgKiBJdCBzZXJ2ZXMgdG8gY2hlY2sgaWYgdGhlcmUgYXJlIGFueSBjb25mbGljdHMgd2l0aCBleGlzdGluZyBwaG9uZSBudW1iZXJzLlxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZU51bWJlcigpIHtcbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGFmdGVyIHJlbW92aW5nIGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld051bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSB1c2VyIElEIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cbiAgICAgICAgLy8gQ2FsbCB0aGUgYGNoZWNrQXZhaWxhYmlsaXR5YCBmdW5jdGlvbiBvbiBgRXh0ZW5zaW9uc2Agb2JqZWN0XG4gICAgICAgIC8vIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVudGVyZWQgcGhvbmUgbnVtYmVyIGlzIGFscmVhZHkgaW4gdXNlLlxuICAgICAgICAvLyBQYXJhbWV0ZXJzOiBkZWZhdWx0IG51bWJlciwgbmV3IG51bWJlciwgdHlwZSBvZiBjaGVjayAobnVtYmVyKSwgdXNlciBpZFxuICAgICAgICBFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyLCBuZXdOdW1iZXIsICdudW1iZXInLCB1c2VySWQpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgb25jZSBhbiBlbWFpbCBhZGRyZXNzIGhhcyBiZWVuIGNvbXBsZXRlbHkgZW50ZXJlZC5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVFbWFpbCgpIHtcbiAgICAgICAgLy8gRHluYW1pYyBjaGVjayB0byBzZWUgaWYgdGhlIGVudGVyZWQgZW1haWwgaXMgYXZhaWxhYmxlXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIC8vIFRoZSBVUkwgZm9yIHRoZSBBUEkgcmVxdWVzdCwgYGdsb2JhbFJvb3RVcmxgIGlzIGEgZ2xvYmFsIHZhcmlhYmxlIGNvbnRhaW5pbmcgdGhlIGJhc2UgVVJMXG4gICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9dXNlcnMvYXZhaWxhYmxlL3t2YWx1ZX1gLFxuICAgICAgICAgICAgLy8gVGhlIGpRdWVyeSBzZWxlY3RvciBmb3IgdGhlIGNvbnRleHQgaW4gd2hpY2ggdG8gc2VhcmNoIGZvciB0aGUgc3RhdGVcbiAgICAgICAgICAgIHN0YXRlQ29udGV4dDogJy51aS5pbnB1dC5lbWFpbCcsXG4gICAgICAgICAgICAvLyAnbm93JyB3aWxsIGV4ZWN1dGUgdGhlIEFQSSByZXF1ZXN0IGltbWVkaWF0ZWx5IHdoZW4gY2FsbGVkXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGJlZm9yZSB0aGUgQVBJIHJlcXVlc3QgaXMgbWFkZSwgdXNlZCB0byBtb2RpZnkgc2V0dGluZ3Mgb2YgdGhlIHJlcXVlc3RcbiAgICAgICAgICAgIGJlZm9yZVNlbmQoc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgICAgICAgICAvLyBBZGQgdGhlIGVudGVyZWQgZW1haWwgdG8gdGhlIFVSTCBvZiB0aGUgQVBJIHJlcXVlc3RcbiAgICAgICAgICAgICAgICByZXN1bHQudXJsRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9lbWFpbCcpLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdoZW4gdGhlIEFQSSByZXF1ZXN0IGlzIHN1Y2Nlc3NmdWxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSByZXNwb25zZSBpbmRpY2F0ZXMgdGhhdCB0aGUgZW1haWwgaXMgYXZhaWxhYmxlIG9yIHRoZSBlbnRlcmVkIGVtYWlsIGlzIHRoZSBzYW1lIGFzIHRoZSBkZWZhdWx0IGVtYWlsXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmVtYWlsQXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgIHx8IGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPT09IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9lbWFpbCcpXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgZXJyb3IgY2xhc3MgZnJvbSB0aGUgZW1haWwgaW5wdXQgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIGVtYWlsIGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VtYWlsLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCB0aGUgZXJyb3IgY2xhc3MgdG8gdGhlIGVtYWlsIGlucHV0IGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICQoJy51aS5pbnB1dC5lbWFpbCcpLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBlbWFpbCBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgICQoJyNlbWFpbC1lcnJvcicpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWN0aXZhdGVkIHdoZW4gZW50ZXJpbmcgYSBtb2JpbGUgcGhvbmUgbnVtYmVyIGluIHRoZSBlbXBsb3llZSdzIHByb2ZpbGUuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnY2JPbkNvbXBsZXRlTW9iaWxlTnVtYmVyJyk7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBuZXcgbW9iaWxlIG51bWJlciB3aXRob3V0IGFueSBpbnB1dCBtYXNrXG4gICAgICAgIGNvbnN0IG5ld01vYmlsZU51bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBHZXQgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIER5bmFtaWMgY2hlY2sgdG8gc2VlIGlmIHRoZSBzZWxlY3RlZCBtb2JpbGUgbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAgICBFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyLCBuZXdNb2JpbGVOdW1iZXIsICdtb2JpbGUtbnVtYmVyJywgdXNlcklkKTtcblxuICAgICAgICAvLyBSZWZpbGwgdGhlIG1vYmlsZSBkaWFsc3RyaW5nIGlmIHRoZSBuZXcgbW9iaWxlIG51bWJlciBpcyBkaWZmZXJlbnQgdGhhbiB0aGUgZGVmYXVsdCBvciBpZiB0aGUgbW9iaWxlIGRpYWxzdHJpbmcgaXMgZW1wdHlcbiAgICAgICAgaWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXJcbiAgICAgICAgICAgIHx8IChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vYmlsZV9kaWFsc3RyaW5nJykubGVuZ3RoID09PSAwKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vYmlsZSBudW1iZXIgaGFzIGNoYW5nZWRcbiAgICAgICAgaWYgKG5ld01vYmlsZU51bWJlciAhPT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHVzZXJuYW1lIGZyb20gdGhlIGZvcm1cbiAgICAgICAgICAgIGNvbnN0IHVzZXJOYW1lID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX3VzZXJuYW1lJyk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNhbGwgZm9yd2FyZGluZyB3YXMgc2V0IHRvIHRoZSBkZWZhdWx0IG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHJpbmcgbGVuZ3RoIGlzIGVtcHR5LCBzZXQgaXQgdG8gNDVcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJywgNDUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgbmV3IGZvcndhcmRpbmcgbW9iaWxlIG51bWJlciBpbiB0aGUgZHJvcGRvd24gYW5kIGZvcm1cbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nXG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNhbGwgZm9yd2FyZGluZyBvbiBidXN5IHdhcyBzZXQgdG8gdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIG5ldyBmb3J3YXJkaW5nIG1vYmlsZSBudW1iZXIgaW4gdGhlIGRyb3Bkb3duIGFuZCBmb3JtXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29uYnVzeVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBjYWxsIGZvcndhcmRpbmcgb24gdW5hdmFpbGFibGUgd2FzIHNldCB0byB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIG5ldyBmb3J3YXJkaW5nIG1vYmlsZSBudW1iZXIgaW4gdGhlIGRyb3Bkb3duIGFuZCBmb3JtXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IHRoZSBuZXcgbW9iaWxlIG51bWJlciBhcyB0aGUgZGVmYXVsdFxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9IG5ld01vYmlsZU51bWJlcjtcblxuICAgICAgICBjb25zb2xlLmxvZyhgbmV3IG1vYmlsZSBudW1iZXIgJHtleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcn0gYCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxlZCB3aGVuIHRoZSBtb2JpbGUgcGhvbmUgbnVtYmVyIGlzIGNsZWFyZWQgaW4gdGhlIGVtcGxveWVlIGNhcmQuXG4gICAgICovXG4gICAgY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIENsZWFyIHRoZSAnbW9iaWxlX2RpYWxzdHJpbmcnIGFuZCAnbW9iaWxlX251bWJlcicgZmllbGRzIGluIHRoZSBmb3JtXG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnLCAnJyk7XG4gICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbW9iaWxlX251bWJlcicsICcnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIElmIHNvLCBjbGVhciB0aGUgJ2Z3ZF9yaW5nbGVuZ3RoJyBmaWVsZCBhbmQgc2V0ICdmd2RfZm9yd2FyZGluZycgdG8gLTFcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCAnJyk7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nLmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJykuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnLCAtMSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdoZW4gYnVzeSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBJZiBzbywgc2V0ICdmd2RfZm9yd2FyZGluZ29uYnVzeScgdG8gLTFcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbmJ1c3kuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKS5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsIC0xKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiB1bmF2YWlsYWJsZSB3YXMgc2V0IHRvIHRoZSBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIHNldCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyB0byAtMVxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKS5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLCAtMSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGEgbmV3IFNJUCBwYXNzd29yZC5cbiAgICAgKiBUaGUgZ2VuZXJhdGVkIHBhc3N3b3JkIHdpbGwgY29uc2lzdCBvZiAzMiBjaGFyYWN0ZXJzIGZyb20gYSBzZXQgb2YgcHJlZGVmaW5lZCBjaGFyYWN0ZXJzLlxuICAgICAqL1xuICAgIGdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKSB7XG4gICAgICAgIC8vIFByZWRlZmluZWQgY2hhcmFjdGVycyB0byBiZSB1c2VkIGluIHRoZSBwYXNzd29yZFxuICAgICAgICBjb25zdCBjaGFycyA9ICdhYmNkZWYxMjM0NTY3ODkwJztcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBwYXNzd29yZCBzdHJpbmdcbiAgICAgICAgbGV0IHBhc3MgPSAnJztcblxuICAgICAgICAvLyBHZW5lcmF0ZSBhIDMyIGNoYXJhY3RlcnMgbG9uZyBwYXNzd29yZFxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IDMyOyB4ICs9IDEpIHtcbiAgICAgICAgICAgIC8vIFNlbGVjdCBhIHJhbmRvbSBjaGFyYWN0ZXIgZnJvbSB0aGUgcHJlZGVmaW5lZCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICBjb25zdCBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKTtcblxuICAgICAgICAgICAgLy8gQWRkIHRoZSBzZWxlY3RlZCBjaGFyYWN0ZXIgdG8gdGhlIHBhc3N3b3JkXG4gICAgICAgICAgICBwYXNzICs9IGNoYXJzLmNoYXJBdChpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aGUgZ2VuZXJhdGVkIHBhc3N3b3JkIGFzIHRoZSBTSVAgcGFzc3dvcmRcbiAgICAgICAgZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbChwYXNzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICByZXN1bHQuZGF0YS5tb2JpbGVfbnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFN0b3JlIHRoZSBjdXJyZW50IGV4dGVuc2lvbiBudW1iZXIgYXMgdGhlIGRlZmF1bHQgbnVtYmVyXG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIudmFsKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRoZSBwaG9uZSByZXByZXNlbnRhdGlvbiB3aXRoIHRoZSBuZXcgZGVmYXVsdCBudW1iZXJcbiAgICAgICAgRXh0ZW5zaW9ucy5VcGRhdGVQaG9uZVJlcHJlc2VudChleHRlbnNpb24uZGVmYXVsdE51bWJlcik7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBleHRlbnNpb24uJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGV4dGVuc2lvbi52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZXh0ZW5zaW9uLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBleHRlbnNpb24uY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cblxuLyoqXG4gKiBEZWZpbmUgYSBjdXN0b20gcnVsZSBmb3IgalF1ZXJ5IGZvcm0gdmFsaWRhdGlvbiBuYW1lZCAnZXh0ZW5zaW9uUnVsZScuXG4gKiBUaGUgcnVsZSBjaGVja3MgaWYgYSBmb3J3YXJkaW5nIG51bWJlciBpcyBzZWxlY3RlZCBidXQgdGhlIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRoZSB2YWxpZGF0aW9uIHJlc3VsdC4gSWYgZm9yd2FyZGluZyBpcyBzZXQgYW5kIHJpbmcgbGVuZ3RoIGlzIHplcm8gb3Igbm90IHNldCwgaXQgcmV0dXJucyBmYWxzZSAoaW52YWxpZCkuIE90aGVyd2lzZSwgaXQgcmV0dXJucyB0cnVlICh2YWxpZCkuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbnNpb25SdWxlID0gKCkgPT4ge1xuICAgIC8vIEdldCByaW5nIGxlbmd0aCBhbmQgZm9yd2FyZGluZyBudW1iZXIgZnJvbSB0aGUgZm9ybVxuICAgIGNvbnN0IGZ3ZFJpbmdMZW5ndGggPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJyk7XG4gICAgY29uc3QgZndkRm9yd2FyZGluZyA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKTtcblxuICAgIC8vIElmIGZvcndhcmRpbmcgbnVtYmVyIGlzIHNldCBhbmQgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LCByZXR1cm4gZmFsc2UgKGludmFsaWQpXG4gICAgaWYgKGZ3ZEZvcndhcmRpbmcubGVuZ3RoID4gMFxuICAgICAgICAmJiAoXG4gICAgICAgICAgICBmd2RSaW5nTGVuZ3RoID09PSAnMCdcbiAgICAgICAgICAgIHx8XG4gICAgICAgICAgICBmd2RSaW5nTGVuZ3RoID09PSAnJ1xuICAgICAgICApKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIHJldHVybiB0cnVlICh2YWxpZClcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBudW1iZXIgaXMgdGFrZW4gYnkgYW5vdGhlciBhY2NvdW50XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgcGFyYW1ldGVyIGhhcyB0aGUgJ2hpZGRlbicgY2xhc3MsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFbXBsb3llZSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb24uaW5pdGlhbGl6ZSgpO1xuICAgIGF2YXRhci5pbml0aWFsaXplKCk7XG4gICAgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==