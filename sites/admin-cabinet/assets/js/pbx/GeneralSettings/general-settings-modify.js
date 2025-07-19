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

/* global globalRootUrl,globalTranslate, Form, PasswordScore, PbxApi, UserMessage, SoundFilesSelector, $ */

/**
 * A module to handle modification of general settings.
 */
var generalSettingsModify = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#general-settings-form'),

  /**
   * jQuery object for the web admin password input field.
   * @type {jQuery}
   */
  $webAdminPassword: $('#WebAdminPassword'),

  /**
   * jQuery object for the ssh password input field.
   * @type {jQuery}
   */
  $sshPassword: $('#SSHPassword'),

  /**
   * jQuery object for the web ssh password input field.
   * @type {jQuery}
   */
  $disableSSHPassword: $('#SSHDisablePasswordLogins').parent('.checkbox'),

  /**
   * jQuery object for the SSH password fields
   * @type {jQuery}
   */
  $sshPasswordSegment: $('#only-if-password-enabled'),

  /**
   * If password set, it will be hided from web ui.
   */
  hiddenPassword: 'xxxxxxx',

  /**
   * jQuery object for the records retention period slider.
   * @type {jQuery}
   */
  $recordsSavePeriodSlider: $('#PBXRecordSavePeriodSlider'),

  /**
   * Possible period values for the records retention.
   */
  saveRecordsPeriod: ['30', '90', '180', '360', '1080', ''],

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    // generalSettingsModify.validateRules.SSHPassword.rules
    pbxname: {
      identifier: 'PBXName',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.gs_ValidateEmptyPBXName
      }]
    },
    WebAdminPassword: {
      identifier: 'WebAdminPassword',
      rules: []
    },
    WebAdminPasswordRepeat: {
      identifier: 'WebAdminPasswordRepeat',
      rules: [{
        type: 'match[WebAdminPassword]',
        prompt: globalTranslate.gs_ValidateWebPasswordsFieldDifferent
      }]
    },
    SSHPassword: {
      identifier: 'SSHPassword',
      rules: []
    },
    SSHPasswordRepeat: {
      identifier: 'SSHPasswordRepeat',
      rules: [{
        type: 'match[SSHPassword]',
        prompt: globalTranslate.gs_ValidateSSHPasswordsFieldDifferent
      }]
    },
    WEBPort: {
      identifier: 'WEBPort',
      rules: [{
        type: 'integer[1..65535]',
        prompt: globalTranslate.gs_ValidateWEBPortOutOfRange
      }, {
        type: 'different[WEBHTTPSPort]',
        prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToWEBPort
      }, {
        type: 'different[AJAMPortTLS]',
        prompt: globalTranslate.gs_ValidateWEBPortNotEqualToAjamPort
      }, {
        type: 'different[AJAMPort]',
        prompt: globalTranslate.gs_ValidateWEBPortNotEqualToAjamTLSPort
      }]
    },
    WEBHTTPSPort: {
      identifier: 'WEBHTTPSPort',
      rules: [{
        type: 'integer[1..65535]',
        prompt: globalTranslate.gs_ValidateWEBHTTPSPortOutOfRange
      }, {
        type: 'different[WEBPort]',
        prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToWEBPort
      }, {
        type: 'different[AJAMPortTLS]',
        prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToAjamPort
      }, {
        type: 'different[AJAMPort]',
        prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToAjamTLSPort
      }]
    },
    AJAMPort: {
      identifier: 'AJAMPort',
      rules: [{
        type: 'integer[1..65535]',
        prompt: globalTranslate.gs_ValidateAJAMPortOutOfRange
      }, {
        type: 'different[AJAMPortTLS]',
        prompt: globalTranslate.gs_ValidateAJAMPortOutOfRange
      }]
    },
    SIPAuthPrefix: {
      identifier: 'SIPAuthPrefix',
      rules: [{
        type: 'regExp[/^[a-zA-Z]*$/]',
        prompt: globalTranslate.gs_SIPAuthPrefixInvalid
      }]
    }
  },
  // Rules for the web admin password field when it not equal to hiddenPassword
  webAdminPasswordRules: [{
    type: 'empty',
    prompt: globalTranslate.gs_ValidateEmptyWebPassword
  }, {
    type: 'minLength[5]',
    prompt: globalTranslate.gs_ValidateWeakWebPassword
  }, {
    type: 'notRegExp',
    value: /[a-z]/,
    prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.gs_PasswordNoLowSimvol
  }, {
    type: 'notRegExp',
    value: /\d/,
    prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.gs_PasswordNoNumbers
  }, {
    type: 'notRegExp',
    value: /[A-Z]/,
    prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.gs_PasswordNoUpperSimvol
  }],
  // Rules for the SSH password field when SSH login through the password enabled, and it not equal to hiddenPassword
  additionalSshValidRulesPass: [{
    type: 'empty',
    prompt: globalTranslate.gs_ValidateEmptySSHPassword
  }, {
    type: 'minLength[5]',
    prompt: globalTranslate.gs_ValidateWeakSSHPassword
  }, {
    type: 'notRegExp',
    value: /[a-z]/,
    prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.gs_PasswordNoLowSimvol
  }, {
    type: 'notRegExp',
    value: /\d/,
    prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.gs_PasswordNoNumbers
  }, {
    type: 'notRegExp',
    value: /[A-Z]/,
    prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.gs_PasswordNoUpperSimvol
  }],
  // Rules for the SSH password field when SSH login through the password disabled
  additionalSshValidRulesNoPass: [{
    type: 'empty',
    prompt: globalTranslate.gs_ValidateEmptySSHPassword
  }, {
    type: 'minLength[5]',
    prompt: globalTranslate.gs_ValidateWeakSSHPassword
  }],

  /**
   *  Initialize module with event bindings and component initializations.
   */
  initialize: function initialize() {
    // When WebAdminPassword input is changed, recalculate the password strength
    generalSettingsModify.$webAdminPassword.on('keyup', function () {
      if (generalSettingsModify.$webAdminPassword.val() !== generalSettingsModify.hiddenPassword) {
        generalSettingsModify.initRules();
        PasswordScore.checkPassStrength({
          pass: generalSettingsModify.$webAdminPassword.val(),
          bar: $('.password-score'),
          section: $('.password-score-section')
        });
      }
    }); // When SSHPassword input is changed, recalculate the password strength

    generalSettingsModify.$sshPassword.on('keyup', function () {
      if (generalSettingsModify.$sshPassword.val() !== generalSettingsModify.hiddenPassword) {
        generalSettingsModify.initRules();
        PasswordScore.checkPassStrength({
          pass: generalSettingsModify.$sshPassword.val(),
          bar: $('.ssh-password-score'),
          section: $('.ssh-password-score-section')
        });
      }
    }); // Enable tab navigation with history support

    $('#general-settings-menu').find('.item').tab({
      history: true,
      historyType: 'hash'
    }); // Enable dropdowns on the form

    $('#general-settings-form .dropdown').dropdown(); // Enable checkboxes on the form

    $('#general-settings-form .checkbox').checkbox(); // Enable table drag-n-drop functionality

    $('#audio-codecs-table, #video-codecs-table').tableDnD({
      onDrop: function onDrop() {
        // Trigger change event to acknowledge the modification
        Form.dataChanged();
      },
      onDragClass: 'hoveringRow',
      dragHandle: '.dragHandle'
    }); // Enable dropdown with sound file selection

    $('#general-settings-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty()); // Initialize records save period slider

    generalSettingsModify.$recordsSavePeriodSlider.slider({
      min: 0,
      max: 5,
      step: 1,
      smooth: true,
      interpretLabel: function interpretLabel(value) {
        var labels = [globalTranslate.gs_Store1MonthOfRecords, globalTranslate.gs_Store3MonthsOfRecords, globalTranslate.gs_Store6MonthsOfRecords, globalTranslate.gs_Store1YearOfRecords, globalTranslate.gs_Store3YearsOfRecords, globalTranslate.gs_StoreAllPossibleRecords];
        return labels[value];
      },
      onChange: generalSettingsModify.cbAfterSelectSavePeriodSlider
    }); // Initialize the form

    generalSettingsModify.initializeForm(); // Initialize additional validation rules

    generalSettingsModify.initRules(); // Show, hide ssh password segment

    generalSettingsModify.$disableSSHPassword.checkbox({
      'onChange': generalSettingsModify.showHideSSHPassword
    });
    generalSettingsModify.showHideSSHPassword(); // Set the initial value for the records save period slider

    var recordSavePeriod = generalSettingsModify.$formObj.form('get value', 'PBXRecordSavePeriod');
    generalSettingsModify.$recordsSavePeriodSlider.slider('set value', generalSettingsModify.saveRecordsPeriod.indexOf(recordSavePeriod), false); // Add event listener to handle tab activation

    $(window).on('GS-ActivateTab', function (event, nameTab) {
      $('#general-settings-menu').find('.item').tab('change tab', nameTab);
    });
  },

  /**
   * Show, hide ssh password segment according to the value of use SSH password checkbox.
   */
  showHideSSHPassword: function showHideSSHPassword() {
    if (generalSettingsModify.$disableSSHPassword.checkbox('is checked')) {
      generalSettingsModify.$sshPasswordSegment.hide();
    } else {
      generalSettingsModify.$sshPasswordSegment.show();
    }

    generalSettingsModify.initRules();
  },

  /**
   * Handle event after the select save period slider is changed.
   * @param {number} value - The selected value from the slider.
   */
  cbAfterSelectSavePeriodSlider: function cbAfterSelectSavePeriodSlider(value) {
    // Get the save period corresponding to the slider value.
    var savePeriod = generalSettingsModify.saveRecordsPeriod[value]; // Set the form value for 'PBXRecordSavePeriod' to the selected save period.

    generalSettingsModify.$formObj.form('set value', 'PBXRecordSavePeriod', savePeriod); // Trigger change event to acknowledge the modification

    Form.dataChanged();
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = generalSettingsModify.$formObj.form('get values');
    var arrCodecs = [];
    $('#audio-codecs-table .codec-row, #video-codecs-table .codec-row').each(function (index, obj) {
      if ($(obj).attr('id')) {
        arrCodecs.push({
          codecId: $(obj).attr('id'),
          disabled: $(obj).find('.checkbox').checkbox('is unchecked'),
          priority: index
        });
      }
    });
    result.data.codecs = JSON.stringify(arrCodecs);
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    $("#error-messages").remove();

    if (!response.success) {
      Form.$submitButton.removeClass('disabled');
      generalSettingsModify.generateErrorMessageHtml(response);
    } else {
      generalSettingsModify.$formObj.form('set value', 'WebAdminPassword', generalSettingsModify.hiddenPassword);
      generalSettingsModify.$formObj.form('set value', 'WebAdminPasswordRepeat', generalSettingsModify.hiddenPassword);
      generalSettingsModify.$formObj.form('set value', 'SSHPassword', generalSettingsModify.hiddenPassword);
      generalSettingsModify.$formObj.form('set value', 'SSHPasswordRepeat', generalSettingsModify.hiddenPassword);
      $('.password-validate').remove();
    } // Check if delete all phrase was entered


    if (typeof generalSettingsDeleteAll !== 'undefined') {
      generalSettingsDeleteAll.checkDeleteConditions();
    }
  },

  /**
   * The function collects an information message about a data saving error
   * @param response
   */
  generateErrorMessageHtml: function generateErrorMessageHtml(response) {
    if (response.messages && response.messages.error) {
      var $div = $('<div>', {
        "class": 'ui negative message',
        id: 'error-messages'
      });
      var $header = $('<div>', {
        "class": 'header'
      }).text(globalTranslate.gs_ErrorSaveSettings);
      $div.append($header);
      var $ul = $('<ul>', {
        "class": 'list'
      });
      var messagesSet = new Set();
      response.messages.error.forEach(function (errorArray) {
        errorArray.forEach(function (error) {
          var textContent = '';

          if (globalTranslate[error.message] === undefined) {
            textContent = error.message;
          } else {
            textContent = globalTranslate[error.message];
          }

          if (messagesSet.has(textContent)) {
            return;
          }

          messagesSet.add(error.message);
          $ul.append($('<li>').text(textContent));
        });
      });
      $div.append($ul);
      $('#submitbutton').before($div);
    }
  },

  /**
   * Initialize the validation rules of the form
   */
  initRules: function initRules() {
    // SSHPassword
    if (generalSettingsModify.$disableSSHPassword.checkbox('is checked')) {
      Form.validateRules.SSHPassword.rules = generalSettingsModify.additionalSshValidRulesNoPass;
    } else if (generalSettingsModify.$sshPassword.val() === generalSettingsModify.hiddenPassword) {
      Form.validateRules.SSHPassword.rules = [];
    } else {
      Form.validateRules.SSHPassword.rules = generalSettingsModify.additionalSshValidRulesPass;
    } // WebAdminPassword


    if (generalSettingsModify.$webAdminPassword.val() === generalSettingsModify.hiddenPassword) {
      Form.validateRules.WebAdminPassword.rules = [];
    } else {
      Form.validateRules.WebAdminPassword.rules = generalSettingsModify.webAdminPasswordRules;
    }
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = generalSettingsModify.$formObj;
    Form.url = "".concat(globalRootUrl, "general-settings/save"); // Form submission URL

    Form.validateRules = generalSettingsModify.validateRules; // Form validation rules

    Form.cbBeforeSendForm = generalSettingsModify.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = generalSettingsModify.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
}; // When the document is ready, initialize the generalSettings management interface.

$(document).ready(function () {
  generalSettingsModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwiJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyIiwic2F2ZVJlY29yZHNQZXJpb2QiLCJ2YWxpZGF0ZVJ1bGVzIiwicGJ4bmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJnc19WYWxpZGF0ZUVtcHR5UEJYTmFtZSIsIldlYkFkbWluUGFzc3dvcmQiLCJXZWJBZG1pblBhc3N3b3JkUmVwZWF0IiwiZ3NfVmFsaWRhdGVXZWJQYXNzd29yZHNGaWVsZERpZmZlcmVudCIsIlNTSFBhc3N3b3JkIiwiU1NIUGFzc3dvcmRSZXBlYXQiLCJnc19WYWxpZGF0ZVNTSFBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50IiwiV0VCUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE91dE9mUmFuZ2UiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0IiwiV0VCSFRUUFNQb3J0IiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnRPdXRPZlJhbmdlIiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVBvcnQiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCIsIkFKQU1Qb3J0IiwiZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UiLCJTSVBBdXRoUHJlZml4IiwiZ3NfU0lQQXV0aFByZWZpeEludmFsaWQiLCJ3ZWJBZG1pblBhc3N3b3JkUnVsZXMiLCJnc19WYWxpZGF0ZUVtcHR5V2ViUGFzc3dvcmQiLCJnc19WYWxpZGF0ZVdlYWtXZWJQYXNzd29yZCIsInZhbHVlIiwiZ3NfUGFzc3dvcmRzIiwiZ3NfUGFzc3dvcmROb0xvd1NpbXZvbCIsImdzX1Bhc3N3b3JkTm9OdW1iZXJzIiwiZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sIiwiYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzIiwiZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkIiwiZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQiLCJnc19TU0hQYXNzd29yZCIsImFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzIiwiaW5pdGlhbGl6ZSIsIm9uIiwidmFsIiwiaW5pdFJ1bGVzIiwiUGFzc3dvcmRTY29yZSIsImNoZWNrUGFzc1N0cmVuZ3RoIiwicGFzcyIsImJhciIsInNlY3Rpb24iLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwiZHJvcGRvd24iLCJjaGVja2JveCIsInRhYmxlRG5EIiwib25Ecm9wIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwib25EcmFnQ2xhc3MiLCJkcmFnSGFuZGxlIiwiU291bmRGaWxlc1NlbGVjdG9yIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsInNsaWRlciIsIm1pbiIsIm1heCIsInN0ZXAiLCJzbW9vdGgiLCJpbnRlcnByZXRMYWJlbCIsImxhYmVscyIsImdzX1N0b3JlMU1vbnRoT2ZSZWNvcmRzIiwiZ3NfU3RvcmUzTW9udGhzT2ZSZWNvcmRzIiwiZ3NfU3RvcmU2TW9udGhzT2ZSZWNvcmRzIiwiZ3NfU3RvcmUxWWVhck9mUmVjb3JkcyIsImdzX1N0b3JlM1llYXJzT2ZSZWNvcmRzIiwiZ3NfU3RvcmVBbGxQb3NzaWJsZVJlY29yZHMiLCJvbkNoYW5nZSIsImNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyIiwiaW5pdGlhbGl6ZUZvcm0iLCJzaG93SGlkZVNTSFBhc3N3b3JkIiwicmVjb3JkU2F2ZVBlcmlvZCIsImZvcm0iLCJpbmRleE9mIiwid2luZG93IiwiZXZlbnQiLCJuYW1lVGFiIiwiaGlkZSIsInNob3ciLCJzYXZlUGVyaW9kIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImFyckNvZGVjcyIsImVhY2giLCJpbmRleCIsIm9iaiIsImF0dHIiLCJwdXNoIiwiY29kZWNJZCIsImRpc2FibGVkIiwicHJpb3JpdHkiLCJjb2RlY3MiLCJKU09OIiwic3RyaW5naWZ5IiwiY2JBZnRlclNlbmRGb3JtIiwicmVzcG9uc2UiLCJyZW1vdmUiLCJzdWNjZXNzIiwiJHN1Ym1pdEJ1dHRvbiIsInJlbW92ZUNsYXNzIiwiZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sIiwiZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsIiwiY2hlY2tEZWxldGVDb25kaXRpb25zIiwibWVzc2FnZXMiLCJlcnJvciIsIiRkaXYiLCJpZCIsIiRoZWFkZXIiLCJ0ZXh0IiwiZ3NfRXJyb3JTYXZlU2V0dGluZ3MiLCJhcHBlbmQiLCIkdWwiLCJtZXNzYWdlc1NldCIsIlNldCIsImZvckVhY2giLCJlcnJvckFycmF5IiwidGV4dENvbnRlbnQiLCJtZXNzYWdlIiwidW5kZWZpbmVkIiwiaGFzIiwiYWRkIiwiYmVmb3JlIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFHQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxxQkFBcUIsR0FBRztBQUMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx3QkFBRCxDQUxlOztBQU8xQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxF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TCxHQUF3QnBHLHFCQUFxQixDQUFDb0csZ0JBQTlDLENBSmEsQ0FJbUQ7O0FBQ2hFaEMsSUFBQUEsSUFBSSxDQUFDZ0QsZUFBTCxHQUF1QnBILHFCQUFxQixDQUFDb0gsZUFBN0MsQ0FMYSxDQUtpRDs7QUFDOURoRCxJQUFBQSxJQUFJLENBQUNqQixVQUFMO0FBQ0g7QUFyY3lCLENBQTlCLEMsQ0F3Y0E7O0FBQ0FqRCxDQUFDLENBQUNnSixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbkosRUFBQUEscUJBQXFCLENBQUNtRCxVQUF0QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGFzc3dvcmRTY29yZSwgUGJ4QXBpLCBVc2VyTWVzc2FnZSwgU291bmRGaWxlc1NlbGVjdG9yLCAkICovXG5cbi8qKlxuICogQSBtb2R1bGUgdG8gaGFuZGxlIG1vZGlmaWNhdGlvbiBvZiBnZW5lcmFsIHNldHRpbmdzLlxuICovXG5jb25zdCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBhZG1pbiBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR3ZWJBZG1pblBhc3N3b3JkOiAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNzaCBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZDogJCgnI1NTSFBhc3N3b3JkJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgd2ViIHNzaCBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXNhYmxlU1NIUGFzc3dvcmQ6ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5wYXJlbnQoJy5jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZFNlZ21lbnQ6ICQoJyNvbmx5LWlmLXBhc3N3b3JkLWVuYWJsZWQnKSxcblxuICAgIC8qKlxuICAgICAqIElmIHBhc3N3b3JkIHNldCwgaXQgd2lsbCBiZSBoaWRlZCBmcm9tIHdlYiB1aS5cbiAgICAgKi9cbiAgICBoaWRkZW5QYXNzd29yZDogJ3h4eHh4eHgnLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHJlY29yZHMgcmV0ZW50aW9uIHBlcmlvZCBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXI6ICQoJyNQQlhSZWNvcmRTYXZlUGVyaW9kU2xpZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBwZXJpb2QgdmFsdWVzIGZvciB0aGUgcmVjb3JkcyByZXRlbnRpb24uXG4gICAgICovXG4gICAgc2F2ZVJlY29yZHNQZXJpb2Q6IFsnMzAnLCAnOTAnLCAnMTgwJywgJzM2MCcsICcxMDgwJywgJyddLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7IC8vIGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzXG4gICAgICAgIHBieG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdQQlhOYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5UEJYTmFtZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV2ViQWRtaW5QYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dlYkFkbWluUGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBXZWJBZG1pblBhc3N3b3JkUmVwZWF0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV2ViQWRtaW5QYXNzd29yZFJlcGVhdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hdGNoW1dlYkFkbWluUGFzc3dvcmRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWJQYXNzd29yZHNGaWVsZERpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgU1NIUGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTU0hQYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgIH0sXG4gICAgICAgIFNTSFBhc3N3b3JkUmVwZWF0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU1NIUGFzc3dvcmRSZXBlYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXRjaFtTU0hQYXNzd29yZF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVNTSFBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXRUJQb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV0VCUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtXRUJIVFRQU1BvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXRUJIVFRQU1BvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXRUJIVFRQU1BvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtXRUJQb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIEFKQU1Qb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnQUpBTVBvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBTSVBBdXRoUHJlZml4OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU0lQQXV0aFByZWZpeCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cFsvXlthLXpBLVpdKiQvXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhJbnZhbGlkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gUnVsZXMgZm9yIHRoZSB3ZWIgYWRtaW4gcGFzc3dvcmQgZmllbGQgd2hlbiBpdCBub3QgZXF1YWwgdG8gaGlkZGVuUGFzc3dvcmRcbiAgICB3ZWJBZG1pblBhc3N3b3JkUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtXZWJQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1thLXpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1tBLVpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sXG4gICAgICAgIH1cbiAgICBdLFxuICAgIC8vIFJ1bGVzIGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkIHdoZW4gU1NIIGxvZ2luIHRocm91Z2ggdGhlIHBhc3N3b3JkIGVuYWJsZWQsIGFuZCBpdCBub3QgZXF1YWwgdG8gaGlkZGVuUGFzc3dvcmRcbiAgICBhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1thLXpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sXG4gICAgICAgIH1cbiAgICBdLFxuXG4gICAgLy8gUnVsZXMgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGQgd2hlbiBTU0ggbG9naW4gdGhyb3VnaCB0aGUgcGFzc3dvcmQgZGlzYWJsZWRcbiAgICBhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkLFxuICAgICAgICB9XG4gICAgXSxcblxuICAgIC8qKlxuICAgICAqICBJbml0aWFsaXplIG1vZHVsZSB3aXRoIGV2ZW50IGJpbmRpbmdzIGFuZCBjb21wb25lbnQgaW5pdGlhbGl6YXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gV2hlbiBXZWJBZG1pblBhc3N3b3JkIGlucHV0IGlzIGNoYW5nZWQsIHJlY2FsY3VsYXRlIHRoZSBwYXNzd29yZCBzdHJlbmd0aFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQub24oJ2tleXVwJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC52YWwoKSAhPT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgICAgIFBhc3N3b3JkU2NvcmUuY2hlY2tQYXNzU3RyZW5ndGgoe1xuICAgICAgICAgICAgICAgICAgICBwYXNzOiBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCksXG4gICAgICAgICAgICAgICAgICAgIGJhcjogJCgnLnBhc3N3b3JkLXNjb3JlJyksXG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246ICQoJy5wYXNzd29yZC1zY29yZS1zZWN0aW9uJyksXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFdoZW4gU1NIUGFzc3dvcmQgaW5wdXQgaXMgY2hhbmdlZCwgcmVjYWxjdWxhdGUgdGhlIHBhc3N3b3JkIHN0cmVuZ3RoXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQub24oJ2tleXVwJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQudmFsKCkgIT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgcGFzczogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgYmFyOiAkKCcuc3NoLXBhc3N3b3JkLXNjb3JlJyksXG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246ICQoJy5zc2gtcGFzc3dvcmQtc2NvcmUtc2VjdGlvbicpLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb24gd2l0aCBoaXN0b3J5IHN1cHBvcnRcbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbmFibGUgZHJvcGRvd25zIG9uIHRoZSBmb3JtXG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0gLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3hlcyBvbiB0aGUgZm9ybVxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYmxlIGRyYWctbi1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSwgI3ZpZGVvLWNvZGVjcy10YWJsZScpLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcCgpIHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRHJhZ0NsYXNzOiAnaG92ZXJpbmdSb3cnLFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGRyb3Bkb3duIHdpdGggc291bmQgZmlsZSBzZWxlY3Rpb25cbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybSAuYXVkaW8tbWVzc2FnZS1zZWxlY3QnKS5kcm9wZG93bihTb3VuZEZpbGVzU2VsZWN0b3IuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgpKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlY29yZHMgc2F2ZSBwZXJpb2Qgc2xpZGVyXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXJcbiAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICBtYXg6IDUsXG4gICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICBzbW9vdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbGFiZWxzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0b3JlMU1vbnRoT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0b3JlM01vbnRoc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdG9yZTZNb250aHNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RvcmUxWWVhck9mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdG9yZTNZZWFyc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdG9yZUFsbFBvc3NpYmxlUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhZGRpdGlvbmFsIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuXG4gICAgICAgIC8vIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goe1xuICAgICAgICAgICAgJ29uQ2hhbmdlJzogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmRcbiAgICAgICAgfSk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBpbml0aWFsIHZhbHVlIGZvciB0aGUgcmVjb3JkcyBzYXZlIHBlcmlvZCBzbGlkZXJcbiAgICAgICAgY29uc3QgcmVjb3JkU2F2ZVBlcmlvZCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnUEJYUmVjb3JkU2F2ZVBlcmlvZCcpO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyXG4gICAgICAgICAgICAuc2xpZGVyKCdzZXQgdmFsdWUnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2F2ZVJlY29yZHNQZXJpb2QuaW5kZXhPZihyZWNvcmRTYXZlUGVyaW9kKSwgZmFsc2UpO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciB0byBoYW5kbGUgdGFiIGFjdGl2YXRpb25cbiAgICAgICAgJCh3aW5kb3cpLm9uKCdHUy1BY3RpdmF0ZVRhYicsIChldmVudCwgbmFtZVRhYikgPT4ge1xuICAgICAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKCdjaGFuZ2UgdGFiJywgbmFtZVRhYik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50IGFjY29yZGluZyB0byB0aGUgdmFsdWUgb2YgdXNlIFNTSCBwYXNzd29yZCBjaGVja2JveC5cbiAgICAgKi9cbiAgICBzaG93SGlkZVNTSFBhc3N3b3JkKCl7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZXZlbnQgYWZ0ZXIgdGhlIHNlbGVjdCBzYXZlIHBlcmlvZCBzbGlkZXIgaXMgY2hhbmdlZC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUgZnJvbSB0aGUgc2xpZGVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyKHZhbHVlKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBzYXZlIHBlcmlvZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBzbGlkZXIgdmFsdWUuXG4gICAgICAgIGNvbnN0IHNhdmVQZXJpb2QgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2F2ZVJlY29yZHNQZXJpb2RbdmFsdWVdO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZm9ybSB2YWx1ZSBmb3IgJ1BCWFJlY29yZFNhdmVQZXJpb2QnIHRvIHRoZSBzZWxlY3RlZCBzYXZlIHBlcmlvZC5cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhSZWNvcmRTYXZlUGVyaW9kJywgc2F2ZVBlcmlvZCk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgY29uc3QgYXJyQ29kZWNzID0gW107XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUgLmNvZGVjLXJvdywgI3ZpZGVvLWNvZGVjcy10YWJsZSAuY29kZWMtcm93JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgaWYgKCQob2JqKS5hdHRyKCdpZCcpKSB7XG4gICAgICAgICAgICAgICAgYXJyQ29kZWNzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBjb2RlY0lkOiAkKG9iaikuYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6ICQob2JqKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJyksXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5kYXRhLmNvZGVjcyA9IEpTT04uc3RyaW5naWZ5KGFyckNvZGVjcyk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgICQoXCIjZXJyb3ItbWVzc2FnZXNcIikucmVtb3ZlKCk7XG4gICAgICAgIGlmICghcmVzcG9uc2Uuc3VjY2Vzcykge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbChyZXNwb25zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICAkKCcucGFzc3dvcmQtdmFsaWRhdGUnKS5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBDaGVjayBpZiBkZWxldGUgYWxsIHBocmFzZSB3YXMgZW50ZXJlZFxuICAgICAgICBpZiAodHlwZW9mIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jaGVja0RlbGV0ZUNvbmRpdGlvbnMoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZnVuY3Rpb24gY29sbGVjdHMgYW4gaW5mb3JtYXRpb24gbWVzc2FnZSBhYm91dCBhIGRhdGEgc2F2aW5nIGVycm9yXG4gICAgICogQHBhcmFtIHJlc3BvbnNlXG4gICAgICovXG4gICAgZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgY29uc3QgJGRpdiA9ICQoJzxkaXY+JywgeyBjbGFzczogJ3VpIG5lZ2F0aXZlIG1lc3NhZ2UnLCBpZDogJ2Vycm9yLW1lc3NhZ2VzJyB9KTtcbiAgICAgICAgICAgIGNvbnN0ICRoZWFkZXIgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICdoZWFkZXInIH0pLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmdzX0Vycm9yU2F2ZVNldHRpbmdzKTtcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCRoZWFkZXIpO1xuICAgICAgICAgICAgY29uc3QgJHVsID0gJCgnPHVsPicsIHsgY2xhc3M6ICdsaXN0JyB9KTtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzU2V0ID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IuZm9yRWFjaChlcnJvckFycmF5ID0+IHtcbiAgICAgICAgICAgICAgICBlcnJvckFycmF5LmZvckVhY2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdGV4dENvbnRlbnQgPScnO1xuICAgICAgICAgICAgICAgICAgICBpZihnbG9iYWxUcmFuc2xhdGVbZXJyb3IubWVzc2FnZV0gPT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudCA9IGVycm9yLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGVbZXJyb3IubWVzc2FnZV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2VzU2V0Lmhhcyh0ZXh0Q29udGVudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlc1NldC5hZGQoZXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICR1bC5hcHBlbmQoJCgnPGxpPicpLnRleHQodGV4dENvbnRlbnQpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGRpdi5hcHBlbmQoJHVsKTtcbiAgICAgICAgICAgICQoJyNzdWJtaXRidXR0b24nKS5iZWZvcmUoJGRpdik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgdmFsaWRhdGlvbiBydWxlcyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRSdWxlcygpIHtcbiAgICAgICAgLy8gU1NIUGFzc3dvcmRcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzcztcbiAgICAgICAgfSBlbHNlIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdlYkFkbWluUGFzc3dvcmRcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuV2ViQWRtaW5QYXNzd29yZC5ydWxlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkud2ViQWRtaW5QYXNzd29yZFJ1bGVzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWdlbmVyYWwtc2V0dGluZ3Mvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZ2VuZXJhbFNldHRpbmdzIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=