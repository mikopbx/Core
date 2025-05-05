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
   * Checks conditions for deleting all records.
   * Compares the value of the 'deleteAllInput' field with a phrase.
   * If they match, it triggers a system restore to default settings.
   */
  checkDeleteAllConditions: function checkDeleteAllConditions() {
    // Get the value of 'deleteAllInput' field.
    var deleteAllInput = generalSettingsModify.$formObj.form('get value', 'deleteAllInput'); // If the entered phrase matches the phrase in 'globalTranslate.gs_EnterDeleteAllPhrase',
    // call 'PbxApi.SystemRestoreDefaultSettings' to restore default settings.

    if (deleteAllInput === globalTranslate.gs_EnterDeleteAllPhrase) {
      PbxApi.SystemRestoreDefaultSettings(generalSettingsModify.cbAfterRestoreDefaultSettings);
    }
  },

  /**
   * Handle response after restoring default settings.
   * @param {boolean|string} response - Response from the server after restoring default settings.
   */
  cbAfterRestoreDefaultSettings: function cbAfterRestoreDefaultSettings(response) {
    // Check if the response is true, display a success message
    // otherwise, display the response message.
    if (response === true) {
      UserMessage.showInformation(globalTranslate.gs_AllSettingsDeleted);
    } else {
      UserMessage.showMultiString(response);
    }
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
    }

    generalSettingsModify.checkDeleteAllConditions();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwiJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyIiwic2F2ZVJlY29yZHNQZXJpb2QiLCJ2YWxpZGF0ZVJ1bGVzIiwicGJ4bmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJnc19WYWxpZGF0ZUVtcHR5UEJYTmFtZSIsIldlYkFkbWluUGFzc3dvcmQiLCJXZWJBZG1pblBhc3N3b3JkUmVwZWF0IiwiZ3NfVmFsaWRhdGVXZWJQYXNzd29yZHNGaWVsZERpZmZlcmVudCIsIlNTSFBhc3N3b3JkIiwiU1NIUGFzc3dvcmRSZXBlYXQiLCJnc19WYWxpZGF0ZVNTSFBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50IiwiV0VCUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE91dE9mUmFuZ2UiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0IiwiV0VCSFRUUFNQb3J0IiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnRPdXRPZlJhbmdlIiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVBvcnQiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCIsIkFKQU1Qb3J0IiwiZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UiLCJTSVBBdXRoUHJlZml4IiwiZ3NfU0lQQXV0aFByZWZpeEludmFsaWQiLCJ3ZWJBZG1pblBhc3N3b3JkUnVsZXMiLCJnc19WYWxpZGF0ZUVtcHR5V2ViUGFzc3dvcmQiLCJnc19WYWxpZGF0ZVdlYWtXZWJQYXNzd29yZCIsInZhbHVlIiwiZ3NfUGFzc3dvcmRzIiwiZ3NfUGFzc3dvcmROb0xvd1NpbXZvbCIsImdzX1Bhc3N3b3JkTm9OdW1iZXJzIiwiZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sIiwiYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzIiwiZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkIiwiZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQiLCJnc19TU0hQYXNzd29yZCIsImFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzIiwiaW5pdGlhbGl6ZSIsIm9uIiwidmFsIiwiaW5pdFJ1bGVzIiwiUGFzc3dvcmRTY29yZSIsImNoZWNrUGFzc1N0cmVuZ3RoIiwicGFzcyIsImJhciIsInNlY3Rpb24iLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwiZHJvcGRvd24iLCJjaGVja2JveCIsInRhYmxlRG5EIiwib25Ecm9wIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwib25EcmFnQ2xhc3MiLCJkcmFnSGFuZGxlIiwiU291bmRGaWxlc1NlbGVjdG9yIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsInNsaWRlciIsIm1pbiIsIm1heCIsInN0ZXAiLCJzbW9vdGgiLCJpbnRlcnByZXRMYWJlbCIsImxhYmVscyIsImdzX1N0b3JlMU1vbnRoT2ZSZWNvcmRzIiwiZ3NfU3RvcmUzTW9udGhzT2ZSZWNvcmRzIiwiZ3NfU3RvcmU2TW9udGhzT2ZSZWNvcmRzIiwiZ3NfU3RvcmUxWWVhck9mUmVjb3JkcyIsImdzX1N0b3JlM1llYXJzT2ZSZWNvcmRzIiwiZ3NfU3RvcmVBbGxQb3NzaWJsZVJlY29yZHMiLCJvbkNoYW5nZSIsImNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyIiwiaW5pdGlhbGl6ZUZvcm0iLCJzaG93SGlkZVNTSFBhc3N3b3JkIiwicmVjb3JkU2F2ZVBlcmlvZCIsImZvcm0iLCJpbmRleE9mIiwid2luZG93IiwiZXZlbnQiLCJuYW1lVGFiIiwiaGlkZSIsInNob3ciLCJjaGVja0RlbGV0ZUFsbENvbmRpdGlvbnMiLCJkZWxldGVBbGxJbnB1dCIsImdzX0VudGVyRGVsZXRlQWxsUGhyYXNlIiwiUGJ4QXBpIiwiU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsImNiQWZ0ZXJSZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwicmVzcG9uc2UiLCJVc2VyTWVzc2FnZSIsInNob3dJbmZvcm1hdGlvbiIsImdzX0FsbFNldHRpbmdzRGVsZXRlZCIsInNob3dNdWx0aVN0cmluZyIsInNhdmVQZXJpb2QiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiYXJyQ29kZWNzIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiYXR0ciIsInB1c2giLCJjb2RlY0lkIiwiZGlzYWJsZWQiLCJwcmlvcml0eSIsImNvZGVjcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZW1vdmUiLCJzdWNjZXNzIiwiJHN1Ym1pdEJ1dHRvbiIsInJlbW92ZUNsYXNzIiwiZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sIiwibWVzc2FnZXMiLCJlcnJvciIsIiRkaXYiLCJpZCIsIiRoZWFkZXIiLCJ0ZXh0IiwiZ3NfRXJyb3JTYXZlU2V0dGluZ3MiLCJhcHBlbmQiLCIkdWwiLCJtZXNzYWdlc1NldCIsIlNldCIsImZvckVhY2giLCJlcnJvckFycmF5IiwidGV4dENvbnRlbnQiLCJtZXNzYWdlIiwidW5kZWZpbmVkIiwiaGFzIiwiYWRkIiwiYmVmb3JlIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QXRCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYXNzd29yZFNjb3JlLCBQYnhBcGksIFVzZXJNZXNzYWdlLCBTb3VuZEZpbGVzU2VsZWN0b3IsICQgKi9cblxuLyoqXG4gKiBBIG1vZHVsZSB0byBoYW5kbGUgbW9kaWZpY2F0aW9uIG9mIGdlbmVyYWwgc2V0dGluZ3MuXG4gKi9cbmNvbnN0IGdlbmVyYWxTZXR0aW5nc01vZGlmeSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgd2ViIGFkbWluIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHdlYkFkbWluUGFzc3dvcmQ6ICQoJyNXZWJBZG1pblBhc3N3b3JkJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3NoIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNzaFBhc3N3b3JkOiAkKCcjU1NIUGFzc3dvcmQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB3ZWIgc3NoIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpc2FibGVTU0hQYXNzd29yZDogJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLnBhcmVudCgnLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNzaFBhc3N3b3JkU2VnbWVudDogJCgnI29ubHktaWYtcGFzc3dvcmQtZW5hYmxlZCcpLFxuXG4gICAgLyoqXG4gICAgICogSWYgcGFzc3dvcmQgc2V0LCBpdCB3aWxsIGJlIGhpZGVkIGZyb20gd2ViIHVpLlxuICAgICAqL1xuICAgIGhpZGRlblBhc3N3b3JkOiAneHh4eHh4eCcsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgcmVjb3JkcyByZXRlbnRpb24gcGVyaW9kIHNsaWRlci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlcjogJCgnI1BCWFJlY29yZFNhdmVQZXJpb2RTbGlkZXInKSxcblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIHBlcmlvZCB2YWx1ZXMgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbi5cbiAgICAgKi9cbiAgICBzYXZlUmVjb3Jkc1BlcmlvZDogWyczMCcsICc5MCcsICcxODAnLCAnMzYwJywgJzEwODAnLCAnJ10sXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHsgLy8gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXNcbiAgICAgICAgcGJ4bmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1BCWE5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXZWJBZG1pblBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV2ViQWRtaW5QYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgIH0sXG4gICAgICAgIFdlYkFkbWluUGFzc3dvcmRSZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF0Y2hbV2ViQWRtaW5QYXNzd29yZF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBTU0hQYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NTSFBhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgU1NIUGFzc3dvcmRSZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTU0hQYXNzd29yZFJlcGVhdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hdGNoW1NTSFBhc3N3b3JkXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdFQlBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXRUJQb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W1dFQkhUVFBTUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdFQkhUVFBTUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dFQkhUVFBTUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W1dFQlBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgQUpBTVBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdBSkFNUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFNJUEF1dGhQcmVmaXg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTSVBBdXRoUHJlZml4JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwWy9eW2EtekEtWl0qJC9dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeEludmFsaWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBSdWxlcyBmb3IgdGhlIHdlYiBhZG1pbiBwYXNzd29yZCBmaWVsZCB3aGVuIGl0IG5vdCBlcXVhbCB0byBoaWRkZW5QYXNzd29yZFxuICAgIHdlYkFkbWluUGFzc3dvcmRSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVdlYlBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1dlYlBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW2Etel0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vTnVtYmVyc1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW0EtWl0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vVXBwZXJTaW12b2xcbiAgICAgICAgfVxuICAgIF0sXG4gICAgLy8gUnVsZXMgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGQgd2hlbiBTU0ggbG9naW4gdGhyb3VnaCB0aGUgcGFzc3dvcmQgZW5hYmxlZCwgYW5kIGl0IG5vdCBlcXVhbCB0byBoaWRkZW5QYXNzd29yZFxuICAgIGFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW2Etel0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9Mb3dTaW12b2xcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1xcZC8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1tBLVpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vVXBwZXJTaW12b2xcbiAgICAgICAgfVxuICAgIF0sXG5cbiAgICAvLyBSdWxlcyBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZCB3aGVuIFNTSCBsb2dpbiB0aHJvdWdoIHRoZSBwYXNzd29yZCBkaXNhYmxlZFxuICAgIGFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQsXG4gICAgICAgIH1cbiAgICBdLFxuXG4gICAgLyoqXG4gICAgICogIEluaXRpYWxpemUgbW9kdWxlIHdpdGggZXZlbnQgYmluZGluZ3MgYW5kIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBXaGVuIFdlYkFkbWluUGFzc3dvcmQgaW5wdXQgaXMgY2hhbmdlZCwgcmVjYWxjdWxhdGUgdGhlIHBhc3N3b3JkIHN0cmVuZ3RoXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC5vbigna2V5dXAnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgUGFzc3dvcmRTY29yZS5jaGVja1Bhc3NTdHJlbmd0aCh7XG4gICAgICAgICAgICAgICAgICAgIHBhc3M6IGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgYmFyOiAkKCcucGFzc3dvcmQtc2NvcmUnKSxcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogJCgnLnBhc3N3b3JkLXNjb3JlLXNlY3Rpb24nKSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gV2hlbiBTU0hQYXNzd29yZCBpbnB1dCBpcyBjaGFuZ2VkLCByZWNhbGN1bGF0ZSB0aGUgcGFzc3dvcmQgc3RyZW5ndGhcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC5vbigna2V5dXAnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSAhPT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgICAgIFBhc3N3b3JkU2NvcmUuY2hlY2tQYXNzU3RyZW5ndGgoe1xuICAgICAgICAgICAgICAgICAgICBwYXNzOiBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICBiYXI6ICQoJy5zc2gtcGFzc3dvcmQtc2NvcmUnKSxcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogJCgnLnNzaC1wYXNzd29yZC1zY29yZS1zZWN0aW9uJyksXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEVuYWJsZSBkcm9wZG93bnMgb24gdGhlIGZvcm1cbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybSAuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveGVzIG9uIHRoZSBmb3JtXG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0gLmNoZWNrYm94JykuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBFbmFibGUgdGFibGUgZHJhZy1uLWRyb3AgZnVuY3Rpb25hbGl0eVxuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlLCAjdmlkZW8tY29kZWNzLXRhYmxlJykudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wKCkge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbmFibGUgZHJvcGRvd24gd2l0aCBzb3VuZCBmaWxlIHNlbGVjdGlvblxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5hdWRpby1tZXNzYWdlLXNlbGVjdCcpLmRyb3Bkb3duKFNvdW5kRmlsZXNTZWxlY3Rvci5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCkpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcmVjb3JkcyBzYXZlIHBlcmlvZCBzbGlkZXJcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlclxuICAgICAgICAgICAgLnNsaWRlcih7XG4gICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgIG1heDogNSxcbiAgICAgICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgICAgIHNtb290aDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBsYWJlbHMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RvcmUxTW9udGhPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RvcmUzTW9udGhzT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0b3JlNk1vbnRoc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdG9yZTFZZWFyT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0b3JlM1llYXJzT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0b3JlQWxsUG9zc2libGVSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JBZnRlclNlbGVjdFNhdmVQZXJpb2RTbGlkZXIsXG4gICAgICAgICAgICB9KVxuICAgICAgICA7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGFkZGl0aW9uYWwgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG5cbiAgICAgICAgLy8gU2hvdywgaGlkZSBzc2ggcGFzc3dvcmQgc2VnbWVudFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCh7XG4gICAgICAgICAgICAnb25DaGFuZ2UnOiBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0hpZGVTU0hQYXNzd29yZFxuICAgICAgICB9KTtcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmQoKTtcblxuICAgICAgICAvLyBTZXQgdGhlIGluaXRpYWwgdmFsdWUgZm9yIHRoZSByZWNvcmRzIHNhdmUgcGVyaW9kIHNsaWRlclxuICAgICAgICBjb25zdCByZWNvcmRTYXZlUGVyaW9kID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdQQlhSZWNvcmRTYXZlUGVyaW9kJyk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXJcbiAgICAgICAgICAgIC5zbGlkZXIoJ3NldCB2YWx1ZScsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zYXZlUmVjb3Jkc1BlcmlvZC5pbmRleE9mKHJlY29yZFNhdmVQZXJpb2QpLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIHRvIGhhbmRsZSB0YWIgYWN0aXZhdGlvblxuICAgICAgICAkKHdpbmRvdykub24oJ0dTLUFjdGl2YXRlVGFiJywgKGV2ZW50LCBuYW1lVGFiKSA9PiB7XG4gICAgICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoJ2NoYW5nZSB0YWInLCBuYW1lVGFiKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnQgYWNjb3JkaW5nIHRvIHRoZSB2YWx1ZSBvZiB1c2UgU1NIIHBhc3N3b3JkIGNoZWNrYm94LlxuICAgICAqL1xuICAgIHNob3dIaWRlU1NIUGFzc3dvcmQoKXtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmRTZWdtZW50LmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmRTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDaGVja3MgY29uZGl0aW9ucyBmb3IgZGVsZXRpbmcgYWxsIHJlY29yZHMuXG4gICAgICogQ29tcGFyZXMgdGhlIHZhbHVlIG9mIHRoZSAnZGVsZXRlQWxsSW5wdXQnIGZpZWxkIHdpdGggYSBwaHJhc2UuXG4gICAgICogSWYgdGhleSBtYXRjaCwgaXQgdHJpZ2dlcnMgYSBzeXN0ZW0gcmVzdG9yZSB0byBkZWZhdWx0IHNldHRpbmdzLlxuICAgICAqL1xuICAgIGNoZWNrRGVsZXRlQWxsQ29uZGl0aW9ucygpIHtcblxuICAgICAgICAvLyBHZXQgdGhlIHZhbHVlIG9mICdkZWxldGVBbGxJbnB1dCcgZmllbGQuXG4gICAgICAgIGNvbnN0IGRlbGV0ZUFsbElucHV0ID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdkZWxldGVBbGxJbnB1dCcpO1xuXG4gICAgICAgIC8vIElmIHRoZSBlbnRlcmVkIHBocmFzZSBtYXRjaGVzIHRoZSBwaHJhc2UgaW4gJ2dsb2JhbFRyYW5zbGF0ZS5nc19FbnRlckRlbGV0ZUFsbFBocmFzZScsXG4gICAgICAgIC8vIGNhbGwgJ1BieEFwaS5TeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzJyB0byByZXN0b3JlIGRlZmF1bHQgc2V0dGluZ3MuXG4gICAgICAgIGlmIChkZWxldGVBbGxJbnB1dCA9PT0gZ2xvYmFsVHJhbnNsYXRlLmdzX0VudGVyRGVsZXRlQWxsUGhyYXNlKSB7XG4gICAgICAgICAgICBQYnhBcGkuU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyhnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JBZnRlclJlc3RvcmVEZWZhdWx0U2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSByZXNwb25zZSBhZnRlciByZXN0b3JpbmcgZGVmYXVsdCBzZXR0aW5ncy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58c3RyaW5nfSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciByZXN0b3JpbmcgZGVmYXVsdCBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBjYkFmdGVyUmVzdG9yZURlZmF1bHRTZXR0aW5ncyhyZXNwb25zZSkge1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXNwb25zZSBpcyB0cnVlLCBkaXNwbGF5IGEgc3VjY2VzcyBtZXNzYWdlXG4gICAgICAgIC8vIG90aGVyd2lzZSwgZGlzcGxheSB0aGUgcmVzcG9uc2UgbWVzc2FnZS5cbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24oZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbFNldHRpbmdzRGVsZXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgc2VsZWN0IHNhdmUgcGVyaW9kIHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCB2YWx1ZSBmcm9tIHRoZSBzbGlkZXIuXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdFNhdmVQZXJpb2RTbGlkZXIodmFsdWUpIHtcblxuICAgICAgICAvLyBHZXQgdGhlIHNhdmUgcGVyaW9kIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHNsaWRlciB2YWx1ZS5cbiAgICAgICAgY29uc3Qgc2F2ZVBlcmlvZCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zYXZlUmVjb3Jkc1BlcmlvZFt2YWx1ZV07XG5cbiAgICAgICAgLy8gU2V0IHRoZSBmb3JtIHZhbHVlIGZvciAnUEJYUmVjb3JkU2F2ZVBlcmlvZCcgdG8gdGhlIHNlbGVjdGVkIHNhdmUgcGVyaW9kLlxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFJlY29yZFNhdmVQZXJpb2QnLCBzYXZlUGVyaW9kKTtcblxuICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBjb25zdCBhcnJDb2RlY3MgPSBbXTtcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSAuY29kZWMtcm93LCAjdmlkZW8tY29kZWNzLXRhYmxlIC5jb2RlYy1yb3cnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBpZiAoJChvYmopLmF0dHIoJ2lkJykpIHtcbiAgICAgICAgICAgICAgICBhcnJDb2RlY3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGNvZGVjSWQ6ICQob2JqKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogJChvYmopLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyB1bmNoZWNrZWQnKSxcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmVzdWx0LmRhdGEuY29kZWNzID0gSlNPTi5zdHJpbmdpZnkoYXJyQ29kZWNzKTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgJChcIiNlcnJvci1tZXNzYWdlc1wiKS5yZW1vdmUoKTtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sKHJlc3BvbnNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgICQoJy5wYXNzd29yZC12YWxpZGF0ZScpLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jaGVja0RlbGV0ZUFsbENvbmRpdGlvbnMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGhlIGZ1bmN0aW9uIGNvbGxlY3RzIGFuIGluZm9ybWF0aW9uIG1lc3NhZ2UgYWJvdXQgYSBkYXRhIHNhdmluZyBlcnJvclxuICAgICAqIEBwYXJhbSByZXNwb25zZVxuICAgICAqL1xuICAgIGdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0ICRkaXYgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICd1aSBuZWdhdGl2ZSBtZXNzYWdlJywgaWQ6ICdlcnJvci1tZXNzYWdlcycgfSk7XG4gICAgICAgICAgICBjb25zdCAkaGVhZGVyID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAnaGVhZGVyJyB9KS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5nc19FcnJvclNhdmVTZXR0aW5ncyk7XG4gICAgICAgICAgICAkZGl2LmFwcGVuZCgkaGVhZGVyKTtcbiAgICAgICAgICAgIGNvbnN0ICR1bCA9ICQoJzx1bD4nLCB7IGNsYXNzOiAnbGlzdCcgfSk7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlc1NldCA9IG5ldyBTZXQoKTtcbiAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmZvckVhY2goZXJyb3JBcnJheSA9PiB7XG4gICAgICAgICAgICAgICAgZXJyb3JBcnJheS5mb3JFYWNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRleHRDb250ZW50ID0nJztcbiAgICAgICAgICAgICAgICAgICAgaWYoZ2xvYmFsVHJhbnNsYXRlW2Vycm9yLm1lc3NhZ2VdID09PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBlcnJvci5tZXNzYWdlO1xuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHRDb250ZW50ID0gZ2xvYmFsVHJhbnNsYXRlW2Vycm9yLm1lc3NhZ2VdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlc1NldC5oYXModGV4dENvbnRlbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXNTZXQuYWRkKGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAkdWwuYXBwZW5kKCQoJzxsaT4nKS50ZXh0KHRleHRDb250ZW50KSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCR1bCk7XG4gICAgICAgICAgICAkKCcjc3VibWl0YnV0dG9uJykuYmVmb3JlKCRkaXYpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHZhbGlkYXRpb24gcnVsZXMgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBpbml0UnVsZXMoKSB7XG4gICAgICAgIC8vIFNTSFBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M7XG4gICAgICAgIH0gZWxzZSBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXZWJBZG1pblBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCkgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5XZWJBZG1pblBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LndlYkFkbWluUGFzc3dvcmRSdWxlcztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1nZW5lcmFsLXNldHRpbmdzL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGdlbmVyYWxTZXR0aW5ncyBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7Il19