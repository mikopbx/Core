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
      if (extension.$formObj.form('get value', 'id') !== response.data.id) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnkuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uIiwiZGVmYXVsdEVtYWlsIiwiZGVmYXVsdE51bWJlciIsImRlZmF1bHRNb2JpbGVOdW1iZXIiLCIkbnVtYmVyIiwiJCIsIiRzaXBfc2VjcmV0IiwiJG1vYmlsZV9udW1iZXIiLCIkZndkX2ZvcndhcmRpbmciLCIkZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCIkZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIiwiJHF1YWxpZnkiLCIkcXVhbGlmeV9mcmVxIiwiJGVtYWlsIiwiJGZvcm1PYmoiLCIkdGFiTWVudUl0ZW1zIiwiZm9yd2FyZGluZ1NlbGVjdCIsInZhbGlkYXRlUnVsZXMiLCJudW1iZXIiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJleF9WYWxpZGF0ZU51bWJlcklzRW1wdHkiLCJleF9WYWxpZGF0ZU51bWJlcklzRG91YmxlIiwibW9iaWxlX251bWJlciIsIm9wdGlvbmFsIiwiZXhfVmFsaWRhdGVNb2JpbGVJc05vdENvcnJlY3QiLCJleF9WYWxpZGF0ZU1vYmlsZU51bWJlcklzRG91YmxlIiwidXNlcl9lbWFpbCIsImV4X1ZhbGlkYXRlRW1haWxFbXB0eSIsInVzZXJfdXNlcm5hbWUiLCJleF9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJzaXBfc2VjcmV0IiwiZXhfVmFsaWRhdGVTZWNyZXRFbXB0eSIsImV4X1ZhbGlkYXRlU2VjcmV0V2VhayIsInZhbHVlIiwiZXhfUGFzc3dvcmROb0xvd1NpbXZvbCIsImV4X1Bhc3N3b3JkTm9OdW1iZXJzIiwiZndkX3JpbmdsZW5ndGgiLCJkZXBlbmRzIiwiZXhfVmFsaWRhdGVSaW5naW5nQmVmb3JlRm9yd2FyZE91dE9mUmFuZ2UiLCJmd2RfZm9yd2FyZGluZyIsImV4X1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJleF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50IiwiZndkX2ZvcndhcmRpbmdvbmJ1c3kiLCJmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUiLCJpbml0aWFsaXplIiwiaW5wdXRtYXNrIiwidGFiIiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwidmFsIiwiZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwidHJpZ2dlciIsIm9uY29tcGxldGUiLCJjYk9uQ29tcGxldGVOdW1iZXIiLCJtYXNrTGlzdCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJvbmNsZWFyZWQiLCJjYk9uQ2xlYXJlZE1vYmlsZU51bWJlciIsImNiT25Db21wbGV0ZU1vYmlsZU51bWJlciIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUiLCJzaG93TWFza09uSG92ZXIiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsImNiT25Db21wbGV0ZUVtYWlsIiwiZm9jdXNvdXQiLCJwaG9uZSIsInRhcmdldCIsInBvcHVwIiwiaW5pdGlhbGl6ZUZvcm0iLCJwYXN0ZWRWYWx1ZSIsIm5ld051bWJlciIsInVzZXJJZCIsImZvcm0iLCJjaGVja0F2YWlsYWJpbGl0eSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJlbWFpbEF2YWlsYWJsZSIsInBhcmVudCIsImNvbnNvbGUiLCJsb2ciLCJuZXdNb2JpbGVOdW1iZXIiLCJsZW5ndGgiLCJ1c2VyTmFtZSIsImNoYXJzIiwicGFzcyIsIngiLCJpIiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwiY2hhckF0IiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiaW5wdXQiLCJpZCIsImF0dHIiLCJjYkFmdGVyU2VuZEZvcm0iLCJQYnhBcGkiLCJzdWNjZXNzVGVzdCIsIndpbmRvdyIsImxvY2F0aW9uIiwidXBkYXRlUGhvbmVSZXByZXNlbnQiLCJGb3JtIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsIkNvbmZpZyIsInBieFVybCIsImZuIiwiZXh0ZW5zaW9uUnVsZSIsImZ3ZFJpbmdMZW5ndGgiLCJmd2RGb3J3YXJkaW5nIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5IiwiYXZhdGFyIiwiZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsU0FBUyxHQUFHO0FBQ2RDLEVBQUFBLFlBQVksRUFBRSxFQURBO0FBRWRDLEVBQUFBLGFBQWEsRUFBRSxFQUZEO0FBR2RDLEVBQUFBLG1CQUFtQixFQUFFLEVBSFA7QUFJZEMsRUFBQUEsT0FBTyxFQUFFQyxDQUFDLENBQUMsU0FBRCxDQUpJO0FBS2RDLEVBQUFBLFdBQVcsRUFBRUQsQ0FBQyxDQUFDLGFBQUQsQ0FMQTtBQU1kRSxFQUFBQSxjQUFjLEVBQUVGLENBQUMsQ0FBQyxnQkFBRCxDQU5IO0FBT2RHLEVBQUFBLGVBQWUsRUFBRUgsQ0FBQyxDQUFDLGlCQUFELENBUEo7QUFRZEksRUFBQUEscUJB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QyxDQWUzQzs7O0FBQ0EsU0FBTyxJQUFQO0FBQ0gsQ0FqQkQ7QUFtQkE7QUFDQTtBQUNBO0FBQ0E7OztBQUNBM0ksQ0FBQyxDQUFDeUksRUFBRixDQUFLaEQsSUFBTCxDQUFVTyxRQUFWLENBQW1CakYsS0FBbkIsQ0FBeUI4SCxTQUF6QixHQUFxQyxVQUFDNUcsS0FBRCxFQUFRNkcsU0FBUjtBQUFBLFNBQXNCOUksQ0FBQyxZQUFLOEksU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDO0FBR0E7QUFDQTtBQUNBOzs7QUFDQS9JLENBQUMsQ0FBQ2dKLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ0SixFQUFBQSxTQUFTLENBQUNpRCxVQUFWO0FBQ0FzRyxFQUFBQSxNQUFNLENBQUN0RyxVQUFQO0FBQ0F1RyxFQUFBQSx5QkFBeUIsQ0FBQ3ZHLFVBQTFCO0FBQ0gsQ0FKRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sXG4gSW5wdXRNYXNrUGF0dGVybnMsIGF2YXRhciwgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlciAqL1xuXG5cbi8qKlxuICogVGhlIGV4dGVuc2lvbiBvYmplY3QuXG4gKiBNYW5hZ2VzIHRoZSBvcGVyYXRpb25zIGFuZCBiZWhhdmlvcnMgb2YgdGhlIGV4dGVuc2lvbiBlZGl0IGZvcm1cbiAqXG4gKiBAbW9kdWxlIGV4dGVuc2lvblxuICovXG5jb25zdCBleHRlbnNpb24gPSB7XG4gICAgZGVmYXVsdEVtYWlsOiAnJyxcbiAgICBkZWZhdWx0TnVtYmVyOiAnJyxcbiAgICBkZWZhdWx0TW9iaWxlTnVtYmVyOiAnJyxcbiAgICAkbnVtYmVyOiAkKCcjbnVtYmVyJyksXG4gICAgJHNpcF9zZWNyZXQ6ICQoJyNzaXBfc2VjcmV0JyksXG4gICAgJG1vYmlsZV9udW1iZXI6ICQoJyNtb2JpbGVfbnVtYmVyJyksXG4gICAgJGZ3ZF9mb3J3YXJkaW5nOiAkKCcjZndkX2ZvcndhcmRpbmcnKSxcbiAgICAkZndkX2ZvcndhcmRpbmdvbmJ1c3k6ICQoJyNmd2RfZm9yd2FyZGluZ29uYnVzeScpLFxuICAgICRmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGU6ICQoJyNmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSxcbiAgICAkcXVhbGlmeTogJCgnI3F1YWxpZnknKSxcbiAgICAkcXVhbGlmeV9mcmVxOiAkKCcjcXVhbGlmeS1mcmVxJyksXG4gICAgJGVtYWlsOiAkKCcjdXNlcl9lbWFpbCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2V4dGVuc2lvbnMtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYnVsYXIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51SXRlbXM6ICQoJyNleHRlbnNpb25zLW1lbnUgLml0ZW0nKSxcblxuICAgIGZvcndhcmRpbmdTZWxlY3Q6ICcjZXh0ZW5zaW9ucy1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbnVtYmVyOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbnVtYmVyJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTnVtYmVySXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtudW1iZXItZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVOdW1iZXJJc0RvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgbW9iaWxlX251bWJlcjoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbW9iaWxlX251bWJlcicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hc2snLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZU1vYmlsZUlzTm90Q29ycmVjdCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVttb2JpbGUtbnVtYmVyLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlTW9iaWxlTnVtYmVySXNEb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHVzZXJfZW1haWw6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJfZW1haWwnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlRW1haWxFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcl91c2VybmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJfdXNlcm5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgc2lwX3NlY3JldDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NpcF9zZWNyZXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlU2VjcmV0RW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZVNlY3JldFdlYWssXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogL1tBLXpdLyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9QYXNzd29yZE5vTnVtYmVyc1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfcmluZ2xlbmd0aDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Z3ZF9yaW5nbGVuZ3RoJyxcbiAgICAgICAgICAgIGRlcGVuZHM6ICdmd2RfZm9yd2FyZGluZycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMy4uMTgwXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmV4X1ZhbGlkYXRlUmluZ2luZ0JlZm9yZUZvcndhcmRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBmd2RfZm9yd2FyZGluZzoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmcnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbnNpb25SdWxlJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZndkX2ZvcndhcmRpbmdvbmJ1c3k6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmd2RfZm9yd2FyZGluZ29uYnVzeScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtudW1iZXJdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZXhfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZURpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W251bWJlcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZXh0ZW5zaW9uIGZvcm0gYW5kIGl0cyBpbnRlcmFjdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gU2V0IGRlZmF1bHQgdmFsdWVzIGZvciBlbWFpbCwgbW9iaWxlIG51bWJlciwgYW5kIGV4dGVuc2lvbiBudW1iZXJcbiAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9IGV4dGVuc2lvbi4kZW1haWwuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE51bWJlciA9IGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFiIG1lbnUgaXRlbXMsIGFjY29yZGlvbnMsIGFuZCBkcm9wZG93biBtZW51c1xuICAgICAgICBleHRlbnNpb24uJHRhYk1lbnVJdGVtcy50YWIoKTtcbiAgICAgICAgJCgnI2V4dGVuc2lvbnMtZm9ybSAudWkuYWNjb3JkaW9uJykuYWNjb3JkaW9uKCk7XG4gICAgICAgICQoJyNleHRlbnNpb25zLWZvcm0gLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBvZiB0aGUgXCJxdWFsaWZ5XCIgY2hlY2tib3hcbiAgICAgICAgZXh0ZW5zaW9uLiRxdWFsaWZ5LmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb24uJHF1YWxpZnkuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uJHF1YWxpZnlfZnJlcS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uJHF1YWxpZnlfZnJlcS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBkcm9wZG93biBtZW51IGZvciBmb3J3YXJkaW5nIHNlbGVjdFxuICAgICAgICAkKGV4dGVuc2lvbi5mb3J3YXJkaW5nU2VsZWN0KS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgYSBuZXcgU0lQIHBhc3N3b3JkIGlmIHRoZSBmaWVsZCBpcyBlbXB0eVxuICAgICAgICBpZiAoZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnZhbCgpID09PSAnJykgZXh0ZW5zaW9uLmdlbmVyYXRlTmV3U2lwUGFzc3dvcmQoKTtcblxuICAgICAgICAvLyBBdHRhY2ggYSBjbGljayBldmVudCBsaXN0ZW5lciB0byB0aGUgXCJnZW5lcmF0ZSBuZXcgcGFzc3dvcmRcIiBidXR0b25cbiAgICAgICAgJCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBleHRlbnNpb24uZ2VuZXJhdGVOZXdTaXBQYXNzd29yZCgpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRzaXBfc2VjcmV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIFwib25jb21wbGV0ZVwiIGV2ZW50IGhhbmRsZXIgZm9yIHRoZSBleHRlbnNpb24gbnVtYmVyIGlucHV0XG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLmlucHV0bWFzaygnb3B0aW9uJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcixcbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbi4kbnVtYmVyLm9uKCdwYXN0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU51bWJlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIGlucHV0IG1hc2tzIGZvciB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBjb25zdCBtYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuaW5wdXRtYXNrcyh7XG4gICAgICAgICAgICBpbnB1dG1hc2s6IHtcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAnIyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcjogJ1swLTldJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRpbmFsaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25jbGVhcmVkOiBleHRlbnNpb24uY2JPbkNsZWFyZWRNb2JpbGVOdW1iZXIsXG4gICAgICAgICAgICAgICAgb25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZU1vYmlsZU51bWJlcixcbiAgICAgICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBleHRlbnNpb24uY2JPbk1vYmlsZU51bWJlckJlZm9yZVBhc3RlLFxuICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICByZXBsYWNlOiAnOScsXG4gICAgICAgICAgICBsaXN0OiBtYXNrTGlzdCxcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBpbnB1dCBtYXNrIGZvciB0aGUgZW1haWwgaW5wdXRcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZTogZXh0ZW5zaW9uLmNiT25Db21wbGV0ZUVtYWlsLFxuICAgICAgICB9KTtcbiAgICAgICAgZXh0ZW5zaW9uLiRlbWFpbC5vbigncGFzdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5jYk9uQ29tcGxldGVFbWFpbCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBdHRhY2ggYSBmb2N1c291dCBldmVudCBsaXN0ZW5lciB0byB0aGUgbW9iaWxlIG51bWJlciBpbnB1dFxuICAgICAgICBleHRlbnNpb24uJG1vYmlsZV9udW1iZXIuZm9jdXNvdXQoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxldCBwaG9uZSA9ICQoZS50YXJnZXQpLnZhbCgpLnJlcGxhY2UoL1teMC05XS9nLCBcIlwiKTtcbiAgICAgICAgICAgIGlmIChwaG9uZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAkKGUudGFyZ2V0KS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBmb3IgcXVlc3Rpb24gaWNvbnNcbiAgICAgICAgJChcImkucXVlc3Rpb25cIikucG9wdXAoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gZm9ybVxuICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHBhc3RlIG1vYmlsZSBudW1iZXIgZnJvbSBjbGlwYm9hcmRcbiAgICAgKi9cbiAgICBjYk9uTW9iaWxlTnVtYmVyQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSXQgaXMgZXhlY3V0ZWQgYWZ0ZXIgYSBwaG9uZSBudW1iZXIgaGFzIGJlZW4gZW50ZXJlZCBjb21wbGV0ZWx5LlxuICAgICAqIEl0IHNlcnZlcyB0byBjaGVjayBpZiB0aGVyZSBhcmUgYW55IGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIHBob25lIG51bWJlcnMuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlTnVtYmVyKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgYWZ0ZXIgcmVtb3ZpbmcgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gZXh0ZW5zaW9uLiRudW1iZXIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG5cbiAgICAgICAgLy8gUmV0cmlldmUgdGhlIHVzZXIgSUQgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCB1c2VySWQgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfaWQnKTtcblxuICAgICAgICAvLyBDYWxsIHRoZSBgY2hlY2tBdmFpbGFiaWxpdHlgIGZ1bmN0aW9uIG9uIGBFeHRlbnNpb25zYCBvYmplY3RcbiAgICAgICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGUgZW50ZXJlZCBwaG9uZSBudW1iZXIgaXMgYWxyZWFkeSBpbiB1c2UuXG4gICAgICAgIC8vIFBhcmFtZXRlcnM6IGRlZmF1bHQgbnVtYmVyLCBuZXcgbnVtYmVyLCB0eXBlIG9mIGNoZWNrIChudW1iZXIpLCB1c2VyIGlkXG4gICAgICAgIEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIsIG5ld051bWJlciwgJ251bWJlcicsIHVzZXJJZCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJdCBpcyBleGVjdXRlZCBvbmNlIGFuIGVtYWlsIGFkZHJlc3MgaGFzIGJlZW4gY29tcGxldGVseSBlbnRlcmVkLlxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUVtYWlsKCkge1xuICAgICAgICAvLyBEeW5hbWljIGNoZWNrIHRvIHNlZSBpZiB0aGUgZW50ZXJlZCBlbWFpbCBpcyBhdmFpbGFibGVcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgLy8gVGhlIFVSTCBmb3IgdGhlIEFQSSByZXF1ZXN0LCBgZ2xvYmFsUm9vdFVybGAgaXMgYSBnbG9iYWwgdmFyaWFibGUgY29udGFpbmluZyB0aGUgYmFzZSBVUkxcbiAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH11c2Vycy9hdmFpbGFibGUve3ZhbHVlfWAsXG4gICAgICAgICAgICAvLyBUaGUgalF1ZXJ5IHNlbGVjdG9yIGZvciB0aGUgY29udGV4dCBpbiB3aGljaCB0byBzZWFyY2ggZm9yIHRoZSBzdGF0ZVxuICAgICAgICAgICAgc3RhdGVDb250ZXh0OiAnLnVpLmlucHV0LmVtYWlsJyxcbiAgICAgICAgICAgIC8vICdub3cnIHdpbGwgZXhlY3V0ZSB0aGUgQVBJIHJlcXVlc3QgaW1tZWRpYXRlbHkgd2hlbiBjYWxsZWRcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIC8vIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYmVmb3JlIHRoZSBBUEkgcmVxdWVzdCBpcyBtYWRlLCB1c2VkIHRvIG1vZGlmeSBzZXR0aW5ncyBvZiB0aGUgcmVxdWVzdFxuICAgICAgICAgICAgYmVmb3JlU2VuZChzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAgICAgICAgIC8vIEFkZCB0aGUgZW50ZXJlZCBlbWFpbCB0byB0aGUgVVJMIG9mIHRoZSBBUEkgcmVxdWVzdFxuICAgICAgICAgICAgICAgIHJlc3VsdC51cmxEYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2VtYWlsJyksXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8vIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2hlbiB0aGUgQVBJIHJlcXVlc3QgaXMgc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGluZGljYXRlcyB0aGF0IHRoZSBlbWFpbCBpcyBhdmFpbGFibGUgb3IgdGhlIGVudGVyZWQgZW1haWwgaXMgdGhlIHNhbWUgYXMgdGhlIGRlZmF1bHQgZW1haWxcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZW1haWxBdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgfHwgZXh0ZW5zaW9uLmRlZmF1bHRFbWFpbCA9PT0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2VtYWlsJylcbiAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBlcnJvciBjbGFzcyBmcm9tIHRoZSBlbWFpbCBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICAkKCcudWkuaW5wdXQuZW1haWwnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgZW1haWwgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICAkKCcjZW1haWwtZXJyb3InKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHRoZSBlcnJvciBjbGFzcyB0byB0aGUgZW1haWwgaW5wdXQgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmlucHV0LmVtYWlsJykucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIGVtYWlsIGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VtYWlsLWVycm9yJykucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBY3RpdmF0ZWQgd2hlbiBlbnRlcmluZyBhIG1vYmlsZSBwaG9uZSBudW1iZXIgaW4gdGhlIGVtcGxveWVlJ3MgcHJvZmlsZS5cbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXIoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjYk9uQ29tcGxldGVNb2JpbGVOdW1iZXInKTtcblxuICAgICAgICAvLyBHZXQgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIHdpdGhvdXQgYW55IGlucHV0IG1hc2tcbiAgICAgICAgY29uc3QgbmV3TW9iaWxlTnVtYmVyID0gZXh0ZW5zaW9uLiRtb2JpbGVfbnVtYmVyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuXG4gICAgICAgIC8vIEdldCB1c2VyIElEIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgdXNlcklkID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VyX2lkJyk7XG5cbiAgICAgICAgLy8gRHluYW1pYyBjaGVjayB0byBzZWUgaWYgdGhlIHNlbGVjdGVkIG1vYmlsZSBudW1iZXIgaXMgYXZhaWxhYmxlXG4gICAgICAgIEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIsIG5ld01vYmlsZU51bWJlciwgJ21vYmlsZS1udW1iZXInLCB1c2VySWQpO1xuXG4gICAgICAgIC8vIFJlZmlsbCB0aGUgbW9iaWxlIGRpYWxzdHJpbmcgaWYgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIGlzIGRpZmZlcmVudCB0aGFuIHRoZSBkZWZhdWx0IG9yIGlmIHRoZSBtb2JpbGUgZGlhbHN0cmluZyBpcyBlbXB0eVxuICAgICAgICBpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlclxuICAgICAgICAgICAgfHwgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9iaWxlX2RpYWxzdHJpbmcnKS5sZW5ndGggPT09IDApXG4gICAgICAgICkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9iaWxlIG51bWJlciBoYXMgY2hhbmdlZFxuICAgICAgICBpZiAobmV3TW9iaWxlTnVtYmVyICE9PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3MgdXNlcm5hbWUgZnJvbSB0aGUgZm9ybVxuICAgICAgICAgICAgY29uc3QgdXNlck5hbWUgPSBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJfdXNlcm5hbWUnKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY2FsbCBmb3J3YXJkaW5nIHdhcyBzZXQgdG8gdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmcnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgcmluZyBsZW5ndGggaXMgZW1wdHksIHNldCBpdCB0byA0NVxuICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9yaW5nbGVuZ3RoJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnLCA0NSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBuZXcgZm9yd2FyZGluZyBtb2JpbGUgbnVtYmVyIGluIHRoZSBkcm9wZG93biBhbmQgZm9ybVxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdGV4dCcsIGAke3VzZXJOYW1lfSA8JHtuZXdNb2JpbGVOdW1iZXJ9PmApXG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHZhbHVlJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY2FsbCBmb3J3YXJkaW5nIG9uIGJ1c3kgd2FzIHNldCB0byB0aGUgZGVmYXVsdCBtb2JpbGUgbnVtYmVyXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgbmV3IGZvcndhcmRpbmcgbW9iaWxlIG51bWJlciBpbiB0aGUgZHJvcGRvd24gYW5kIGZvcm1cbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb25idXN5XG4gICAgICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHRleHQnLCBgJHt1c2VyTmFtZX0gPCR7bmV3TW9iaWxlTnVtYmVyfT5gKVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB2YWx1ZScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScsIG5ld01vYmlsZU51bWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNhbGwgZm9yd2FyZGluZyBvbiB1bmF2YWlsYWJsZSB3YXMgc2V0IHRvIHRoZSBkZWZhdWx0IG1vYmlsZSBudW1iZXJcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgbmV3IGZvcndhcmRpbmcgbW9iaWxlIG51bWJlciBpbiB0aGUgZHJvcGRvd24gYW5kIGZvcm1cbiAgICAgICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCB0ZXh0JywgYCR7dXNlck5hbWV9IDwke25ld01vYmlsZU51bWJlcn0+YClcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBuZXdNb2JpbGVOdW1iZXIpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgbmV3TW9iaWxlTnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgdGhlIG5ldyBtb2JpbGUgbnVtYmVyIGFzIHRoZSBkZWZhdWx0XG4gICAgICAgIGV4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyID0gbmV3TW9iaWxlTnVtYmVyO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGBuZXcgbW9iaWxlIG51bWJlciAke2V4dGVuc2lvbi5kZWZhdWx0TW9iaWxlTnVtYmVyfSBgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdoZW4gdGhlIG1vYmlsZSBwaG9uZSBudW1iZXIgaXMgY2xlYXJlZCBpbiB0aGUgZW1wbG95ZWUgY2FyZC5cbiAgICAgKi9cbiAgICBjYk9uQ2xlYXJlZE1vYmlsZU51bWJlcigpIHtcbiAgICAgICAgLy8gQ2xlYXIgdGhlICdtb2JpbGVfZGlhbHN0cmluZycgYW5kICdtb2JpbGVfbnVtYmVyJyBmaWVsZHMgaW4gdGhlIGZvcm1cbiAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfZGlhbHN0cmluZycsICcnKTtcbiAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtb2JpbGVfbnVtYmVyJywgJycpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcndhcmRpbmcgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIGNsZWFyIHRoZSAnZndkX3JpbmdsZW5ndGgnIGZpZWxkIGFuZCBzZXQgJ2Z3ZF9mb3J3YXJkaW5nJyB0byAtMVxuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmd2RfcmluZ2xlbmd0aCcsIDApO1xuICAgICAgICAgICAgZXh0ZW5zaW9uLiRmd2RfZm9yd2FyZGluZy5kcm9wZG93bignc2V0IHRleHQnLCAnLScpLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCAtMSk7XG4gICAgICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2Z3ZF9mb3J3YXJkaW5nJywgLTEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9yd2FyZGluZyB3aGVuIGJ1c3kgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29uYnVzeScpID09PSBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlcikge1xuICAgICAgICAgICAgLy8gSWYgc28sIHNldCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knIHRvIC0xXG4gICAgICAgICAgICBleHRlbnNpb24uJGZ3ZF9mb3J3YXJkaW5nb25idXN5LmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJykuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbmJ1c3knLCAtMSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBmb3J3YXJkaW5nIHdoZW4gdW5hdmFpbGFibGUgd2FzIHNldCB0byB0aGUgbW9iaWxlIG51bWJlclxuICAgICAgICBpZiAoZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUnKSA9PT0gZXh0ZW5zaW9uLmRlZmF1bHRNb2JpbGVOdW1iZXIpIHtcbiAgICAgICAgICAgIC8vIElmIHNvLCBzZXQgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZScgdG8gLTFcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlLmRyb3Bkb3duKCdzZXQgdGV4dCcsICctJykuZHJvcGRvd24oJ3NldCB2YWx1ZScsIC0xKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlJywgLTEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgdGhlIGRlZmF1bHQgbW9iaWxlIG51bWJlclxuICAgICAgICBleHRlbnNpb24uZGVmYXVsdE1vYmlsZU51bWJlciA9ICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIG5ldyBTSVAgcGFzc3dvcmQuXG4gICAgICogVGhlIGdlbmVyYXRlZCBwYXNzd29yZCB3aWxsIGNvbnNpc3Qgb2YgMzIgY2hhcmFjdGVycyBmcm9tIGEgc2V0IG9mIHByZWRlZmluZWQgY2hhcmFjdGVycy5cbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld1NpcFBhc3N3b3JkKCkge1xuICAgICAgICAvLyBQcmVkZWZpbmVkIGNoYXJhY3RlcnMgdG8gYmUgdXNlZCBpbiB0aGUgcGFzc3dvcmRcbiAgICAgICAgY29uc3QgY2hhcnMgPSAnYWJjZGVmMTIzNDU2Nzg5MCc7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgcGFzc3dvcmQgc3RyaW5nXG4gICAgICAgIGxldCBwYXNzID0gJyc7XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgYSAzMiBjaGFyYWN0ZXJzIGxvbmcgcGFzc3dvcmRcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCAzMjsgeCArPSAxKSB7XG4gICAgICAgICAgICAvLyBTZWxlY3QgYSByYW5kb20gY2hhcmFjdGVyIGZyb20gdGhlIHByZWRlZmluZWQgY2hhcmFjdGVyc1xuICAgICAgICAgICAgY29uc3QgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCk7XG5cbiAgICAgICAgICAgIC8vIEFkZCB0aGUgc2VsZWN0ZWQgY2hhcmFjdGVyIHRvIHRoZSBwYXNzd29yZFxuICAgICAgICAgICAgcGFzcyArPSBjaGFycy5jaGFyQXQoaSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdGhlIGdlbmVyYXRlZCBwYXNzd29yZCBhcyB0aGUgU0lQIHBhc3N3b3JkXG4gICAgICAgIGV4dGVuc2lvbi4kc2lwX3NlY3JldC52YWwocGFzcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmVzdWx0LmRhdGEubW9iaWxlX251bWJlciA9IGV4dGVuc2lvbi4kbW9iaWxlX251bWJlci5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcblxuICAgICAgICBleHRlbnNpb24uJGZvcm1PYmouZmluZCgnLmNoZWNrYm94JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5wdXQgPSAkKG9iaikuZmluZCgnaW5wdXQnKTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gaW5wdXQuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmICgkKG9iaikuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2lkXT0nMSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2lkXT0nMCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKFBieEFwaS5zdWNjZXNzVGVzdChyZXNwb25zZSkpe1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpZCcpICE9PSByZXNwb25zZS5kYXRhLmlkKXtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb249YCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS8ke3Jlc3BvbnNlLmRhdGEuaWR9YFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdG9yZSB0aGUgY3VycmVudCBleHRlbnNpb24gbnVtYmVyIGFzIHRoZSBkZWZhdWx0IG51bWJlclxuICAgICAgICAgICAgZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIgPSBleHRlbnNpb24uJG51bWJlci52YWwoKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBwaG9uZSByZXByZXNlbnRhdGlvbiB3aXRoIHRoZSBuZXcgZGVmYXVsdCBudW1iZXJcbiAgICAgICAgICAgIEV4dGVuc2lvbnMudXBkYXRlUGhvbmVSZXByZXNlbnQoZXh0ZW5zaW9uLmRlZmF1bHROdW1iZXIpO1xuXG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH1cblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZXh0ZW5zaW9uLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvc2F2ZVJlY29yZGA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZXh0ZW5zaW9uLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBleHRlbnNpb24uY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGV4dGVuc2lvbi5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuXG4vKipcbiAqIERlZmluZSBhIGN1c3RvbSBydWxlIGZvciBqUXVlcnkgZm9ybSB2YWxpZGF0aW9uIG5hbWVkICdleHRlbnNpb25SdWxlJy5cbiAqIFRoZSBydWxlIGNoZWNrcyBpZiBhIGZvcndhcmRpbmcgbnVtYmVyIGlzIHNlbGVjdGVkIGJ1dCB0aGUgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVGhlIHZhbGlkYXRpb24gcmVzdWx0LiBJZiBmb3J3YXJkaW5nIGlzIHNldCBhbmQgcmluZyBsZW5ndGggaXMgemVybyBvciBub3Qgc2V0LCBpdCByZXR1cm5zIGZhbHNlIChpbnZhbGlkKS4gT3RoZXJ3aXNlLCBpdCByZXR1cm5zIHRydWUgKHZhbGlkKS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuc2lvblJ1bGUgPSAoKSA9PiB7XG4gICAgLy8gR2V0IHJpbmcgbGVuZ3RoIGFuZCBmb3J3YXJkaW5nIG51bWJlciBmcm9tIHRoZSBmb3JtXG4gICAgY29uc3QgZndkUmluZ0xlbmd0aCA9IGV4dGVuc2lvbi4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZndkX3JpbmdsZW5ndGgnKTtcbiAgICBjb25zdCBmd2RGb3J3YXJkaW5nID0gZXh0ZW5zaW9uLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmd2RfZm9yd2FyZGluZycpO1xuXG4gICAgLy8gSWYgZm9yd2FyZGluZyBudW1iZXIgaXMgc2V0IGFuZCByaW5nIGxlbmd0aCBpcyB6ZXJvIG9yIG5vdCBzZXQsIHJldHVybiBmYWxzZSAoaW52YWxpZClcbiAgICBpZiAoZndkRm9yd2FyZGluZy5sZW5ndGggPiAwXG4gICAgICAgICYmIChcbiAgICAgICAgICAgIGZ3ZFJpbmdMZW5ndGggPT09IDBcbiAgICAgICAgICAgIHx8XG4gICAgICAgICAgICBmd2RSaW5nTGVuZ3RoID09PSAnJ1xuICAgICAgICApKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIHJldHVybiB0cnVlICh2YWxpZClcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBudW1iZXIgaXMgdGFrZW4gYnkgYW5vdGhlciBhY2NvdW50XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgcGFyYW1ldGVyIGhhcyB0aGUgJ2hpZGRlbicgY2xhc3MsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFbXBsb3llZSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb24uaW5pdGlhbGl6ZSgpO1xuICAgIGF2YXRhci5pbml0aWFsaXplKCk7XG4gICAgZXh0ZW5zaW9uU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==