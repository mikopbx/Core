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
      onUnMask: extension.cbOnUnmaskEmail,
      oncomplete: extension.cbOnCompleteEmail
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
          value: extension.$email.inputmask('unmaskedvalue')
        };
        return result;
      },
      // This function will be called when the API request is successful
      onSuccess: function onSuccess(response) {
        // If the response indicates that the email is available or the entered email is the same as the default email
        if (response.emailAvailable || extension.defaultEmail === extension.$email.inputmask('unmaskedvalue')) {
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
   * It is executed when the completion event on a mobile number input field occurs
   */
  cbOnUnmaskEmail: function cbOnUnmaskEmail(maskedValue, unmaskedValue) {
    return unmaskedValue;
  },

  /**
   * Вызывается при вводе мобильного телефона в карточке сотрудника
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJHF1YWxpZnkiLCIkcXVhbGlmeV9mcmVxIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJleF9WYWxpZGF0ZVVzZXJuYW1lU3BlY2lhbENoYXJhY3RlcnMiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsInZhbHVlIiwiZXhfUGFzc3dvcmROb0xvd1NpbXZvbCIsImV4X1Bhc3N3b3JkTm9OdW1iZXJzIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiaW5wdXRtYXNrIiwidGFiIiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwidmFsIiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwidHJpZ2dlciIsIm9uY29tcGxldGUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJtYXNrTGlzdCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJjYk9uQ2xlYXJlZE1vYmlsZU51bWJlciIsImNiT25Db21wbGV0ZU1vYmlsZU51bWJlciIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm9uVW5NYXNrIiwiY2JPblVubWFza0VtYWlsIiwiY2JPbkNvbXBsZXRlRW1haWwiLCJmb2N1c291dCIsInBob25lIiwidGFyZ2V0IiwicG9wdXAiLCJpbml0aWFsaXplRm9ybSIsInBhc3RlZFZhbHVlIiwibmV3TnVtYmVyIiwidXNlcklkIiwiZm9ybSIsImNoZWNrQXZhaWxhYmlsaXR5IiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInN0YXRlQ29udGV4dCIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsInJlc3VsdCIsInVybERhdGEiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsImVtYWlsQXZhaWxhYmxlIiwicGFyZW50IiwibWFza2VkVmFsdWUiLCJ1bm1hc2tlZFZhbHVlIiwiY29uc29sZSIsImxvZyIsIm5ld01vYmlsZU51bWJlciIsImxlbmd0aCIsInVzZXJOYW1lIiwiY2hhcnMiLCJwYXNzIiwieCIsImkiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJjaGFyQXQiLCJjYkJlZm9yZVNlbmRGb3JtIiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIlVwZGF0ZVBob25lUmVwcmVzZW50IiwiRm9ybSIsImZuIiwiZXh0ZW5zaW9uUnVsZSIsImZ3ZFJpbmdMZW5ndGgiLCJmd2RGb3J3YXJkaW5nIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5IiwiYXZhdGFyIiwiZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsU0FBUyxHQUFHO0FBQ2RDLEVBQUFBLFlBQVksRUFBRSxFQURBO0FBRWRDLEVBQUFBLGFBQWEsRUFBRSxFQUZEO0FBR2RDLEVBQUFBLG1CQUFtQixFQUFFLEVBSFA7QUFJZEMsRUFBQUEsT0FBTyxFQUFFQyxDQUFDLENBQUMsU0FBRCxDQUpJO0FBS2RDLEVBQUFBLFdBQVcsRUFBRUQsQ0FBQyxDQUFDLGFBQUQsQ0FMQTtBQU1kRSxFQUFBQSxjQUFjLEVBQUVGLENBQUMsQ0FBQyxnQkFBRCxDQU5IO0FBT2RHLEVBQUFBLGVBQWUsRUFBRUgsQ0FBQyxDQUFDLGlCQUFELENBUEo7QUFRZEksRUFBQUEscUJBQXFCLEVBQUVKLENBQUMsQ0FBQyx1QkFBRCxDQVJWO0FBU2RLLEVBQUFBLDRCQUE0QixFQUFF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SCxXQUFPLEtBQVA7QUFDSCxHQWIwQyxDQWUzQzs7O0FBQ0EsU0FBTyxJQUFQO0FBQ0gsQ0FqQkQ7QUFtQkE7QUFDQTtBQUNBO0FBQ0E7OztBQUNBaEksQ0FBQyxDQUFDOEgsRUFBRixDQUFLbEMsSUFBTCxDQUFVTyxRQUFWLENBQW1CcEYsS0FBbkIsQ0FBeUJtSCxTQUF6QixHQUFxQyxVQUFDaEcsS0FBRCxFQUFRaUcsU0FBUjtBQUFBLFNBQXNCbkksQ0FBQyxZQUFLbUksU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDO0FBR0E7QUFDQTtBQUNBOzs7QUFDQXBJLENBQUMsQ0FBQ3FJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIzSSxFQUFBQSxTQUFTLENBQUNrRCxVQUFWO0FBQ0EwRixFQUFBQSxNQUFNLENBQUMxRixVQUFQO0FBQ0EyRixFQUFBQSx5QkFBeUIsQ0FBQzNGLFVBQTFCO0FBQ0gsQ0FKRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sXG4gSW5wdXRNYXNrUGF0dGVybnMsIGF2YXRhciwgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciAqL1xuXG5cbi8qKlxuICogVGhlIGV4dGVuc2lvbiBvYmplY3QuXG4gKiBNYW5hZ2VzIHRoZSBvcGVyYXRpb25zIGFuZCBiZWhhdmlvcnMgb2YgdGhlIGV4dGVuc2lvbiBlZGl0IGZvcm1cbiAqXG4gKiBAbW9kdWxlIGV4dGVuc2lvblxuICovXG5jb25zdCBleHRlbnNpb24gPSB7XG4gICAgZGVmYXVsdEVtYWlsOiAnJyxcbiAgICBkZWZhdWx0TnVtYmVyOiAnJyxcbiAgICBkZWZhdWx0TW9iaWxlTnVtYmVyOiAnJyxcbiAgICAkbnVtYmVyOiAkKCcjbnVtYmVyJyksXG4gICAgJHNpcF9zZWNyZXQ6ICQoJyNzaXBfc2VjcmV0JyksXG4gICAgJG1vYmlsZV9udW1iZXI6ICQoJyNtb2JpbGVfbnVtYmVyJyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nOiAkKCcjZndkX2ZvcndhcmRpbmcnKSxcbiAgICAkZndkX2ZvcndhcmRpbmdvbmJ1c3k6ICQoJyNmd2RfZm9yd2FyZGluZ29uYnVzeScpLFxuICAgICRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6ICQoJyNmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSxcbiAgICAkcXVhbGlmeTogJCgnI3F1YWxpZnknKSxcbiAgICAkcXVhbGlmeV9mcmVxOiAkKCcjcXVhbGlmeS1mcmVxJyksXG4gICAgJGVtYWlsOiAkKCcjdXNlcl9lbWFpbCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2V4dGVuc2lvbnMtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYnVsYXIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51SXRlbXM6ICQoJyNleHRlbnNpb25zLW1lbnUgLml0ZW0nKSxcblxuICAgIGZvcndhcmRpbmdTZWxlY3Q6ICcjZXh0ZW5zaW9ucy1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbnVtYmVyOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbnVtYmVyJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtudW1iZXItZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgbW9iaWxlX251bWJlcjoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbW9iaWxlX251bWJlcicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hc2snLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZUlzTm90Q29ycmVjdCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVttb2JpbGUtbnVtYmVyLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlTnVtYmVySXNEb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHVzZXJfZW1haWw6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJfZW1haWwnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRW1haWxFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcl91c2VybmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJfdXNlcm5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3NwZWNpYWxDaGFyYWN0ZXJzRXhpc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVVzZXJuYW1lU3BlY2lhbENoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzaXBfc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2lwX3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlU2VjcmV0V2VhayxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAvW0Etel0vLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogL1xcZC8sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9yaW5nbGVuZ3RoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX3JpbmdsZW5ndGgnLFxuICAgICAgICAgICAgZGVwZW5kczogJ2Z3ZF9mb3J3YXJkaW5nJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclszLi4xODBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZ3ZF9mb3J3YXJkaW5nOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29uYnVzeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbbnVtYmVyXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVEaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb24gZm9ybSBhbmQgaXRzIGludGVyYWN0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIGVtYWlsLCBtb2JpbGUgbnVtYmVyLCBhbmQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdEVtYWlsID0gZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgbWVudSBpdGVtcywgYWNjb3JkaW9ucywgYW5kIGRyb3Bkb3duIG1lbnVzXG4gICAgICAgIGV4dGVuc2lvbi4kdGFiTWVudUl0ZW1zLnRhYigpO1xuICAgICAgICAkKCcjZXh0ZW5zaW9ucy1mb3JtIC51aS5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcbiAgICAgICAgJCgnI2V4dGVuc2lvbnMtZm9ybSAuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IG9mIHRoZSBcInF1YWxpZnlcIiBjaGVja2JveFxuICAgICAgICBleHRlbnNpb24uJHF1YWxpZnkuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kcXVhbGlmeS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kcXVhbGlmeV9mcmVxLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kcXVhbGlmeV9mcmVxLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRyb3Bkb3duIG1lbnUgZm9yIGZvcndhcmRpbmcgc2VsZWN0XG4gICAgICAgICQoZXh0ZW5zaW9uLmZvcndhcmRpbmdTZWxlY3QpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgpKTtcblxuICAgICAgICAvLyBHZW5lcmF0ZSBhIG5ldyBTSVAgcGFzc3dvcmQgaWYgdGhlIGZpZWxkIGlzIGVtcHR5XG4gICAgICAgIGlmIChleHRlbnNpb24uJHNpcF9zZWNyZXQudmFsKCkgPT09ICcnKSBleHRlbnNpb24uZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpO1xuXG4gICAgICAgIC8vIEF0dGFjaCBhIGNsaWNrIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBcImdlbmVyYXRlIG5ldyBwYXNzd29yZFwiIGJ1dHRvblxuICAgICAgICAkKCcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5nZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCk7XG4gICAgICAgICAgICBleHRlbnNpb24uJHNpcF9zZWNyZXQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgXCJvbmNvbXBsZXRlXCIgZXZlbnQgaGFuZGxlciBmb3IgdGhlIGV4dGVuc2lvbiBudW1iZXIgaW5wdXRcbiAgICAgICAgZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCdvcHRpb24nLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlTnVtYmVyLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2tzIGZvciB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBjb25zdCBtYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrcyh7XG4gICAgICAgICAgICBpbnB1dG1hc2s6IHtcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAnIyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcjogJ1swLTldJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRpbmFsaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25jbGVhcmVkOiBleHRlbnNpb24uY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIsXG4gICAgICAgICAgICAgICAgb25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcbiAgICAgICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBleHRlbnNpb24uY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlLFxuICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICByZXBsYWNlOiAnOScsXG4gICAgICAgICAgICBsaXN0OiBtYXNrTGlzdCxcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrIGZvciB0aGUgZW1haWwgaW5wdXRcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJywge1xuICAgICAgICAgICAgb25Vbk1hc2s6IGV4dGVuc2lvbi5jYk9uVW5tYXNrRW1haWwsXG4gICAgICAgICAgICBvbmNvbXBsZXRlOiBleHRlbnNpb24uY2JPbkNvbXBsZXRlRW1haWwsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEF0dGFjaCBhIGZvY3Vzb3V0IGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBtb2JpbGUgbnVtYmVyIGlucHV0XG4gICAgICAgIGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5mb2N1c291dChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgbGV0IHBob25lID0gJChlLnRhcmdldCkudmFsKCkucmVwbGFjZSgvW14wLTldL2csIFwiXCIpO1xuICAgICAgICAgICAgaWYgKHBob25lID09PSAnJykge1xuICAgICAgICAgICAgICAgICQoZS50YXJnZXQpLnZhbCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGZvciBxdWVzdGlvbiBpY29uc1xuICAgICAgICAkKFwiaS5xdWVzdGlvblwiKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGV4dGVuc2lvbiBmb3JtXG4gICAgICAgIGV4dGVuc2lvbi5pbml0aWFsaXplRm9ybSgpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgcGFzdGUgbW9iaWxlIG51bWJlciBmcm9tIGNsaXBib2FyZFxuICAgICAqL1xuICAgIGNiT25Nb2JpbGVOdW1iZXJCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWU7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJdCBpcyBleGVjdXRlZCBhZnRlciBhIHBob25lIG51bWJlciBoYXMgYmVlbiBlbnRlcmVkIGNvbXBsZXRlbHkuXG4gICAgICogSXQgc2VydmVzIHRvIGNoZWNrIGlmIHRoZXJlIGFyZSBhbnkgY29uZmxpY3RzIHdpdGggZXhpc3RpbmcgcGhvbmUgbnVtYmVycy5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVOdW1iZXIoKSB7XG4gICAgICAgIC8vIFJldHJpZXZlIHRoZSBlbnRlcmVkIHBob25lIG51bWJlciBhZnRlciByZW1vdmluZyBhbnkgaW5wdXQgbWFza1xuICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgdXNlciBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcl9pZCcpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGBjaGVja0F2YWlsYWJpbGl0eWAgZnVuY3Rpb24gb24gYEV4dGVuc2lvbnNgIG9iamVjdFxuICAgICAgICAvLyB0byBjaGVjayB3aGV0aGVyIHRoZSBlbnRlcmVkIHBob25lIG51bWJlciBpcyBhbHJlYWR5IGluIHVzZS5cbiAgICAgICAgLy8gUGFyYW1ldGVyczogZGVmYXVsdCBudW1iZXIsIG5ldyBudW1iZXIsIHR5cGUgb2YgY2hlY2sgKG51bWJlciksIHVzZXIgaWRcbiAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShleHRlbnNpb24uZGVmYXVsdE51bWJlciwgbmV3TnVtYmVyLCAnbnVtYmVyJywgdXNlcklkKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEl0IGlzIGV4ZWN1dGVkIG9uY2UgYW4gZW1haWwgYWRkcmVzcyBoYXMgYmVlbiBjb21wbGV0ZWx5IGVudGVyZWQuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlRW1haWwoKSB7XG4gICAgICAgIC8vIER5bmFtaWMgY2hlY2sgdG8gc2VlIGlmIHRoZSBlbnRlcmVkIGVtYWlsIGlzIGF2YWlsYWJsZVxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICAvLyBUaGUgVVJMIGZvciB0aGUgQVBJIHJlcXVlc3QsIGBnbG9iYWxSb290VXJsYCBpcyBhIGdsb2JhbCB2YXJpYWJsZSBjb250YWluaW5nIHRoZSBiYXNlIFVSTFxuICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXVzZXJzL2F2YWlsYWJsZS97dmFsdWV9YCxcbiAgICAgICAgICAgIC8vIFRoZSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRoZSBjb250ZXh0IGluIHdoaWNoIHRvIHNlYXJjaCBmb3IgdGhlIHN0YXRlXG4gICAgICAgICAgICBzdGF0ZUNvbnRleHQ6ICcudWkuaW5wdXQuZW1haWwnLFxuICAgICAgICAgICAgLy8gJ25vdycgd2lsbCBleGVjdXRlIHRoZSBBUEkgcmVxdWVzdCBpbW1lZGlhdGVseSB3aGVuIGNhbGxlZFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBiZWZvcmUgdGhlIEFQSSByZXF1ZXN0IGlzIG1hZGUsIHVzZWQgdG8gbW9kaWZ5IHNldHRpbmdzIG9mIHRoZSByZXF1ZXN0XG4gICAgICAgICAgICBiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgICAgICAgICAgLy8gQWRkIHRoZSBlbnRlcmVkIGVtYWlsIHRvIHRoZSBVUkwgb2YgdGhlIEFQSSByZXF1ZXN0XG4gICAgICAgICAgICAgICAgcmVzdWx0LnVybERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBleHRlbnNpb24uJGVtYWlsLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdoZW4gdGhlIEFQSSByZXF1ZXN0IGlzIHN1Y2Nlc3NmdWxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSByZXNwb25zZSBpbmRpY2F0ZXMgdGhhdCB0aGUgZW1haWwgaXMgYXZhaWxhYmxlIG9yIHRoZSBlbnRlcmVkIGVtYWlsIGlzIHRoZSBzYW1lIGFzIHRoZSBkZWZhdWx0IGVtYWlsXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmVtYWlsQXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgIHx8IGV4dGVuc2lvbi5kZWZhdWx0RW1haWwgPT09IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJylcbiAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBlcnJvciBjbGFzcyBmcm9tIHRoZSBlbWFpbCBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICAkKCcudWkuaW5wdXQuZW1haWwnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgZW1haWwgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICAkKCcjZW1haWwtZXJyb3InKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHRoZSBlcnJvciBjbGFzcyB0byB0aGUgZW1haWwgaW5wdXQgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIGVtYWlsIGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VtYWlsLWVycm9yJykucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJdCBpcyBleGVjdXRlZCB3aGVuIHRoZSBjb21wbGV0aW9uIGV2ZW50IG9uIGEgbW9iaWxlIG51bWJlciBpbnB1dCBmaWVsZCBvY2N1cnNcbiAgICAgKi9cbiAgICBjYk9uVW5tYXNrRW1haWwobWFza2VkVmFsdWUsIHVubWFza2VkVmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHVubWFza2VkVmFsdWU7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQktGL0LfRi9Cy0LDQtdGC0YHRjyDQv9GA0Lgg0LLQstC+0LTQtSDQvNC+0LHQuNC70YzQvdC+0LPQviDRgtC10LvQtdGE0L7QvdCwINCyINC60LDRgNGC0L7Rh9C60LUg0YHQvtGC0YDRg9C00L3QuNC60LBcbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXInKTtcblxuICAgICAgICAvLyBHZXQgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIHdpdGhvdXQgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIEdldCB1c2VyIElEIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cbiAgICAgICAgLy8gRHluYW1pYyBjaGVjayB0byBzZWUgaWYgdGhlIHNlbGVjdGVkIG1vYmlsZSBudW1iZXIgaXMgYXZhaWxhYmxlXG4gICAgICAgIEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIsIG5ld01vYmlsZU51bWJlciwgJ21vYmlsZS1udW1iZXInLCB1c2VySWQpO1xuXG4gICAgICAgIC8vIFJlZmlsbCB0aGUgbW9iaWxlIGRpYWxzdHJpbmcgaWYgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIGlzIGRpZmZlcmVudCB0aGFuIHRoZSBkZWZhdWx0IG9yIGlmIHRoZSBtb2JpbGUgZGlhbHN0cmluZyBpcyBlbXB0eVxuICAgICAgICBpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlclxuICAgICAgICAgICAgfHwgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnKS5sZW5ndGggPT09IDApXG4gICAgICAgICkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9iaWxlIG51bWJlciBoYXMgY2hhbmdlZFxuICAgICAgICBpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3MgdXNlcm5hbWUgZnJvbSB0aGUgZm9ybVxuICAgICAgICAgICAgY29uc3QgdXNlck5hbWUgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfdXNlcm5hbWUnKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY2FsbCBmb3J3YXJkaW5nIHdhcyBzZXQgdG8gdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgcmluZyBsZW5ndGggaXMgZW1wdHksIHNldCBpdCB0byA0NVxuICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCA0NSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBuZXcgZm9yd2FyZGluZyBtb2JpbGUgbnVtYmVyIGluIHRoZSBkcm9wZG93biBhbmQgZm9ybVxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY2FsbCBmb3J3YXJkaW5nIG9uIGJ1c3kgd2FzIHNldCB0byB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgbmV3IGZvcndhcmRpbmcgbW9iaWxlIG51bWJlciBpbiB0aGUgZHJvcGRvd24gYW5kIGZvcm1cbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb25idXN5XG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNhbGwgZm9yd2FyZGluZyBvbiB1bmF2YWlsYWJsZSB3YXMgc2V0IHRvIHRoZSBkZWZhdWx0IG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgbmV3IGZvcndhcmRpbmcgbW9iaWxlIG51bWJlciBpbiB0aGUgZHJvcGRvd24gYW5kIGZvcm1cbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIGFzIHRoZSBkZWZhdWx0XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gbmV3TW9iaWxlTnVtYmVyO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGBuZXcgbW9iaWxlIG51bWJlciAke2V4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyfSBgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdoZW4gdGhlIG1vYmlsZSBwaG9uZSBudW1iZXIgaXMgY2xlYXJlZCBpbiB0aGUgZW1wbG95ZWUgY2FyZC5cbiAgICAgKi9cbiAgICBjYk9uQ2xlYXJlZE1vYmlsZU51bWJlcigpIHtcbiAgICAgICAgLy8gQ2xlYXIgdGhlICdtb2JpbGVfZGlhbHN0cmluZycgYW5kICdtb2JpbGVfbnVtYmVyJyBmaWVsZHMgaW4gdGhlIGZvcm1cbiAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsICcnKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfbnVtYmVyJywgJycpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIGNsZWFyIHRoZSAnZndkX3JpbmdsZW5ndGgnIGZpZWxkIGFuZCBzZXQgJ2Z3ZF9mb3J3YXJkaW5nJyB0byAtMVxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsICcnKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmcuZHJvcGRvd24oJ3NldCB0ZXh0JywgJy0nKS5kcm9wZG93bignc2V0IHZhbHVlJywgLTEpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycsIC0xKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2hlbiBidXN5IHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIElmIHNvLCBzZXQgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JyB0byAtMVxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZ29uYnVzeS5kcm9wZG93bignc2V0IHRleHQnLCAnLScpLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5JywgLTEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIHVuYXZhaWxhYmxlIHdhcyBzZXQgdG8gdGhlIG1vYmlsZSBudW1iZXJcbiAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJykgPT09IGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyKSB7XG4gICAgICAgICAgICAvLyBJZiBzbywgc2V0ICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnIHRvIC0xXG4gICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZS5kcm9wZG93bignc2V0IHRleHQnLCAnLScpLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScsIC0xKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIHRoZSBkZWZhdWx0IG1vYmlsZSBudW1iZXJcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIgPSAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBuZXcgU0lQIHBhc3N3b3JkLlxuICAgICAqIFRoZSBnZW5lcmF0ZWQgcGFzc3dvcmQgd2lsbCBjb25zaXN0IG9mIDMyIGNoYXJhY3RlcnMgZnJvbSBhIHNldCBvZiBwcmVkZWZpbmVkIGNoYXJhY3RlcnMuXG4gICAgICovXG4gICAgZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpIHtcbiAgICAgICAgLy8gUHJlZGVmaW5lZCBjaGFyYWN0ZXJzIHRvIGJlIHVzZWQgaW4gdGhlIHBhc3N3b3JkXG4gICAgICAgIGNvbnN0IGNoYXJzID0gJ2FiY2RlZjEyMzQ1Njc4OTAnO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIHBhc3N3b3JkIHN0cmluZ1xuICAgICAgICBsZXQgcGFzcyA9ICcnO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIGEgMzIgY2hhcmFjdGVycyBsb25nIHBhc3N3b3JkXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgMzI7IHggKz0gMSkge1xuICAgICAgICAgICAgLy8gU2VsZWN0IGEgcmFuZG9tIGNoYXJhY3RlciBmcm9tIHRoZSBwcmVkZWZpbmVkIGNoYXJhY3RlcnNcbiAgICAgICAgICAgIGNvbnN0IGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAvLyBBZGQgdGhlIHNlbGVjdGVkIGNoYXJhY3RlciB0byB0aGUgcGFzc3dvcmRcbiAgICAgICAgICAgIHBhc3MgKz0gY2hhcnMuY2hhckF0KGkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSBnZW5lcmF0ZWQgcGFzc3dvcmQgYXMgdGhlIFNJUCBwYXNzd29yZFxuICAgICAgICBleHRlbnNpb24uJHNpcF9zZWNyZXQudmFsKHBhc3MpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJlc3VsdC5kYXRhLm1vYmlsZV9udW1iZXIgPSBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gU3RvcmUgdGhlIGN1cnJlbnQgZXh0ZW5zaW9uIG51bWJlciBhcyB0aGUgZGVmYXVsdCBudW1iZXJcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci52YWwoKTtcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIHBob25lIHJlcHJlc2VudGF0aW9uIHdpdGggdGhlIG5ldyBkZWZhdWx0IG51bWJlclxuICAgICAgICBFeHRlbnNpb25zLlVwZGF0ZVBob25lUmVwcmVzZW50KGV4dGVuc2lvbi5kZWZhdWx0TnVtYmVyKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGV4dGVuc2lvbi4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZXh0ZW5zaW9uLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBleHRlbnNpb24uY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuXG4vKipcbiAqIERlZmluZSBhIGN1c3RvbSBydWxlIGZvciBqUXVlcnkgZm9ybSB2YWxpZGF0aW9uIG5hbWVkICdleHRlbnNpb25SdWxlJy5cbiAqIFRoZSBydWxlIGNoZWNrcyBpZiBhIGZvcndhcmRpbmcgbnVtYmVyIGlzIHNlbGVjdGVkIGJ1dCB0aGUgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVGhlIHZhbGlkYXRpb24gcmVzdWx0LiBJZiBmb3J3YXJkaW5nIGlzIHNldCBhbmQgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LCBpdCByZXR1cm5zIGZhbHNlIChpbnZhbGlkKS4gT3RoZXJ3aXNlLCBpdCByZXR1cm5zIHRydWUgKHZhbGlkKS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuc2lvblJ1bGUgPSAoKSA9PiB7XG4gICAgLy8gR2V0IHJpbmcgbGVuZ3RoIGFuZCBmb3J3YXJkaW5nIG51bWJlciBmcm9tIHRoZSBmb3JtXG4gICAgY29uc3QgZndkUmluZ0xlbmd0aCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKTtcbiAgICBjb25zdCBmd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuXG4gICAgLy8gSWYgZm9yd2FyZGluZyBudW1iZXIgaXMgc2V0IGFuZCByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQsIHJldHVybiBmYWxzZSAoaW52YWxpZClcbiAgICBpZiAoZndkRm9yd2FyZGluZy5sZW5ndGggPiAwXG4gICAgICAgICYmIChcbiAgICAgICAgICAgIGZ3ZFJpbmdMZW5ndGggPT09ICcwJ1xuICAgICAgICAgICAgfHxcbiAgICAgICAgICAgIGZ3ZFJpbmdMZW5ndGggPT09ICcnXG4gICAgICAgICkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgcmV0dXJuIHRydWUgKHZhbGlkKVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIG51bWJlciBpcyB0YWtlbiBieSBhbm90aGVyIGFjY291bnRcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBwYXJhbWV0ZXIgaGFzIHRoZSAnaGlkZGVuJyBjbGFzcywgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuXG4vKipcbiAqICBJbml0aWFsaXplIEVtcGxveWVlIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbi5pbml0aWFsaXplKCk7XG4gICAgYXZhdGFyLmluaXRpYWxpemUoKTtcbiAgICBleHRlbnNpb25TdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19