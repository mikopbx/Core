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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwiJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyIiwic2F2ZVJlY29yZHNQZXJpb2QiLCJ2YWxpZGF0ZVJ1bGVzIiwicGJ4bmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJnc19WYWxpZGF0ZUVtcHR5UEJYTmFtZSIsIldlYkFkbWluUGFzc3dvcmQiLCJXZWJBZG1pblBhc3N3b3JkUmVwZWF0IiwiZ3NfVmFsaWRhdGVXZWJQYXNzd29yZHNGaWVsZERpZmZlcmVudCIsIlNTSFBhc3N3b3JkIiwiU1NIUGFzc3dvcmRSZXBlYXQiLCJnc19WYWxpZGF0ZVNTSFBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50IiwiV0VCUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE91dE9mUmFuZ2UiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0IiwiV0VCSFRUUFNQb3J0IiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnRPdXRPZlJhbmdlIiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVBvcnQiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCIsIkFKQU1Qb3J0IiwiZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UiLCJ3ZWJBZG1pblBhc3N3b3JkUnVsZXMiLCJnc19WYWxpZGF0ZUVtcHR5V2ViUGFzc3dvcmQiLCJnc19WYWxpZGF0ZVdlYWtXZWJQYXNzd29yZCIsInZhbHVlIiwiZ3NfUGFzc3dvcmRzIiwiZ3NfUGFzc3dvcmROb0xvd1NpbXZvbCIsImdzX1Bhc3N3b3JkTm9OdW1iZXJzIiwiZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sIiwiYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzIiwiZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkIiwiZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQiLCJnc19TU0hQYXNzd29yZCIsImFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzIiwiaW5pdGlhbGl6ZSIsIm9uIiwidmFsIiwiaW5pdFJ1bGVzIiwiUGFzc3dvcmRTY29yZSIsImNoZWNrUGFzc1N0cmVuZ3RoIiwicGFzcyIsImJhciIsInNlY3Rpb24iLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwiZHJvcGRvd24iLCJjaGVja2JveCIsInRhYmxlRG5EIiwib25Ecm9wIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwib25EcmFnQ2xhc3MiLCJkcmFnSGFuZGxlIiwiU291bmRGaWxlc1NlbGVjdG9yIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsInNsaWRlciIsIm1pbiIsIm1heCIsInN0ZXAiLCJzbW9vdGgiLCJpbnRlcnByZXRMYWJlbCIsImxhYmVscyIsImdzX1N0b3JlMU1vbnRoT2ZSZWNvcmRzIiwiZ3NfU3RvcmUzTW9udGhzT2ZSZWNvcmRzIiwiZ3NfU3RvcmU2TW9udGhzT2ZSZWNvcmRzIiwiZ3NfU3RvcmUxWWVhck9mUmVjb3JkcyIsImdzX1N0b3JlM1llYXJzT2ZSZWNvcmRzIiwiZ3NfU3RvcmVBbGxQb3NzaWJsZVJlY29yZHMiLCJvbkNoYW5nZSIsImNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyIiwiaW5pdGlhbGl6ZUZvcm0iLCJzaG93SGlkZVNTSFBhc3N3b3JkIiwicmVjb3JkU2F2ZVBlcmlvZCIsImZvcm0iLCJpbmRleE9mIiwid2luZG93IiwiZXZlbnQiLCJuYW1lVGFiIiwiaGlkZSIsInNob3ciLCJjaGVja0RlbGV0ZUFsbENvbmRpdGlvbnMiLCJkZWxldGVBbGxJbnB1dCIsImdzX0VudGVyRGVsZXRlQWxsUGhyYXNlIiwiUGJ4QXBpIiwiU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsImNiQWZ0ZXJSZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwicmVzcG9uc2UiLCJVc2VyTWVzc2FnZSIsInNob3dJbmZvcm1hdGlvbiIsImdzX0FsbFNldHRpbmdzRGVsZXRlZCIsInNob3dNdWx0aVN0cmluZyIsInNhdmVQZXJpb2QiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiYXJyQ29kZWNzIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiYXR0ciIsInB1c2giLCJjb2RlY0lkIiwiZGlzYWJsZWQiLCJwcmlvcml0eSIsImNvZGVjcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZW1vdmUiLCJzdWNjZXNzIiwiJHN1Ym1pdEJ1dHRvbiIsInJlbW92ZUNsYXNzIiwiZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sIiwibWVzc2FnZXMiLCJlcnJvciIsIiRkaXYiLCJpZCIsIiRoZWFkZXIiLCJ0ZXh0IiwiZ3NfRXJyb3JTYXZlU2V0dGluZ3MiLCJhcHBlbmQiLCIkdWwiLCJtZXNzYWdlc1NldCIsIlNldCIsImZvckVhY2giLCJlcnJvckFycmF5IiwidGV4dENvbnRlbnQiLCJtZXNzYWdlIiwidW5kZWZpbmVkIiwiaGFzIiwiYWRkIiwiYmVmb3JlIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFHQTs7QUFFQTtBQUNB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LENBQUNXLGFBQTNDLENBSGEsQ0FHNkM7O0FBQzFEdUQsSUFBQUEsSUFBSSxDQUFDMkMsZ0JBQUwsR0FBd0I3RyxxQkFBcUIsQ0FBQzZHLGdCQUE5QyxDQUphLENBSW1EOztBQUNoRTNDLElBQUFBLElBQUksQ0FBQzJELGVBQUwsR0FBdUI3SCxxQkFBcUIsQ0FBQzZILGVBQTdDLENBTGEsQ0FLaUQ7O0FBQzlEM0QsSUFBQUEsSUFBSSxDQUFDakIsVUFBTDtBQUNIO0FBcGR5QixDQUE5QixDLENBdWRBOztBQUNBL0MsQ0FBQyxDQUFDc0osUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnpKLEVBQUFBLHFCQUFxQixDQUFDaUQsVUFBdEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBhc3N3b3JkU2NvcmUsIFBieEFwaSwgVXNlck1lc3NhZ2UsIFNvdW5kRmlsZXNTZWxlY3RvciwgJCAqL1xuXG4vKipcbiAqIEEgbW9kdWxlIHRvIGhhbmRsZSBtb2RpZmljYXRpb24gb2YgZ2VuZXJhbCBzZXR0aW5ncy5cbiAqL1xuY29uc3QgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB3ZWIgYWRtaW4gcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkd2ViQWRtaW5QYXNzd29yZDogJCgnI1dlYkFkbWluUGFzc3dvcmQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3NoUGFzc3dvcmQ6ICQoJyNTU0hQYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlzYWJsZVNTSFBhc3N3b3JkOiAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykucGFyZW50KCcuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3NoUGFzc3dvcmRTZWdtZW50OiAkKCcjb25seS1pZi1wYXNzd29yZC1lbmFibGVkJyksXG5cbiAgICAvKipcbiAgICAgKiBJZiBwYXNzd29yZCBzZXQsIGl0IHdpbGwgYmUgaGlkZWQgZnJvbSB3ZWIgdWkuXG4gICAgICovXG4gICAgaGlkZGVuUGFzc3dvcmQ6ICd4eHh4eHh4JyxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyOiAkKCcjUEJYUmVjb3JkU2F2ZVBlcmlvZFNsaWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgcGVyaW9kIHZhbHVlcyBmb3IgdGhlIHJlY29yZHMgcmV0ZW50aW9uLlxuICAgICAqL1xuICAgIHNhdmVSZWNvcmRzUGVyaW9kOiBbJzMwJywgJzkwJywgJzE4MCcsICczNjAnLCAnMTA4MCcsICcnXSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczogeyAvLyBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlc1xuICAgICAgICBwYnhuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnUEJYTmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVBCWE5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdlYkFkbWluUGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXZWJBZG1pblBhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgV2ViQWRtaW5QYXNzd29yZFJlcGVhdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXRjaFtXZWJBZG1pblBhc3N3b3JkXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2ViUGFzc3dvcmRzRmllbGREaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFNTSFBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU1NIUGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBTU0hQYXNzd29yZFJlcGVhdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NTSFBhc3N3b3JkUmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF0Y2hbU1NIUGFzc3dvcmRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVTU0hQYXNzd29yZHNGaWVsZERpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV0VCUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dFQlBvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbV0VCSFRUUFNQb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV0VCSFRUUFNQb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV0VCSFRUUFNQb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbV0VCUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBBSkFNUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ0FKQU1Qb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gUnVsZXMgZm9yIHRoZSB3ZWIgYWRtaW4gcGFzc3dvcmQgZmllbGQgd2hlbiBpdCBub3QgZXF1YWwgdG8gaGlkZGVuUGFzc3dvcmRcbiAgICB3ZWJBZG1pblBhc3N3b3JkUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtXZWJQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1thLXpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1tBLVpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sXG4gICAgICAgIH1cbiAgICBdLFxuICAgIC8vIFJ1bGVzIGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkIHdoZW4gU1NIIGxvZ2luIHRocm91Z2ggdGhlIHBhc3N3b3JkIGVuYWJsZWQsIGFuZCBpdCBub3QgZXF1YWwgdG8gaGlkZGVuUGFzc3dvcmRcbiAgICBhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1thLXpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sXG4gICAgICAgIH1cbiAgICBdLFxuXG4gICAgLy8gUnVsZXMgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGQgd2hlbiBTU0ggbG9naW4gdGhyb3VnaCB0aGUgcGFzc3dvcmQgZGlzYWJsZWRcbiAgICBhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkLFxuICAgICAgICB9XG4gICAgXSxcblxuICAgIC8qKlxuICAgICAqICBJbml0aWFsaXplIG1vZHVsZSB3aXRoIGV2ZW50IGJpbmRpbmdzIGFuZCBjb21wb25lbnQgaW5pdGlhbGl6YXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gV2hlbiBXZWJBZG1pblBhc3N3b3JkIGlucHV0IGlzIGNoYW5nZWQsIHJlY2FsY3VsYXRlIHRoZSBwYXNzd29yZCBzdHJlbmd0aFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQub24oJ2tleXVwJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC52YWwoKSAhPT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgICAgIFBhc3N3b3JkU2NvcmUuY2hlY2tQYXNzU3RyZW5ndGgoe1xuICAgICAgICAgICAgICAgICAgICBwYXNzOiBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCksXG4gICAgICAgICAgICAgICAgICAgIGJhcjogJCgnLnBhc3N3b3JkLXNjb3JlJyksXG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246ICQoJy5wYXNzd29yZC1zY29yZS1zZWN0aW9uJyksXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFdoZW4gU1NIUGFzc3dvcmQgaW5wdXQgaXMgY2hhbmdlZCwgcmVjYWxjdWxhdGUgdGhlIHBhc3N3b3JkIHN0cmVuZ3RoXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQub24oJ2tleXVwJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQudmFsKCkgIT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgcGFzczogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgYmFyOiAkKCcuc3NoLXBhc3N3b3JkLXNjb3JlJyksXG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246ICQoJy5zc2gtcGFzc3dvcmQtc2NvcmUtc2VjdGlvbicpLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb24gd2l0aCBoaXN0b3J5IHN1cHBvcnRcbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbmFibGUgZHJvcGRvd25zIG9uIHRoZSBmb3JtXG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0gLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3hlcyBvbiB0aGUgZm9ybVxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYmxlIGRyYWctbi1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSwgI3ZpZGVvLWNvZGVjcy10YWJsZScpLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcCgpIHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRHJhZ0NsYXNzOiAnaG92ZXJpbmdSb3cnLFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGRyb3Bkb3duIHdpdGggc291bmQgZmlsZSBzZWxlY3Rpb25cbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybSAuYXVkaW8tbWVzc2FnZS1zZWxlY3QnKS5kcm9wZG93bihTb3VuZEZpbGVzU2VsZWN0b3IuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgpKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlY29yZHMgc2F2ZSBwZXJpb2Qgc2xpZGVyXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXJcbiAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICBtYXg6IDUsXG4gICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICBzbW9vdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbGFiZWxzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0b3JlMU1vbnRoT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0b3JlM01vbnRoc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdG9yZTZNb250aHNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RvcmUxWWVhck9mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdG9yZTNZZWFyc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdG9yZUFsbFBvc3NpYmxlUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhZGRpdGlvbmFsIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuXG4gICAgICAgIC8vIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goe1xuICAgICAgICAgICAgJ29uQ2hhbmdlJzogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmRcbiAgICAgICAgfSk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBpbml0aWFsIHZhbHVlIGZvciB0aGUgcmVjb3JkcyBzYXZlIHBlcmlvZCBzbGlkZXJcbiAgICAgICAgY29uc3QgcmVjb3JkU2F2ZVBlcmlvZCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnUEJYUmVjb3JkU2F2ZVBlcmlvZCcpO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyXG4gICAgICAgICAgICAuc2xpZGVyKCdzZXQgdmFsdWUnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2F2ZVJlY29yZHNQZXJpb2QuaW5kZXhPZihyZWNvcmRTYXZlUGVyaW9kKSwgZmFsc2UpO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciB0byBoYW5kbGUgdGFiIGFjdGl2YXRpb25cbiAgICAgICAgJCh3aW5kb3cpLm9uKCdHUy1BY3RpdmF0ZVRhYicsIChldmVudCwgbmFtZVRhYikgPT4ge1xuICAgICAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKCdjaGFuZ2UgdGFiJywgbmFtZVRhYik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50IGFjY29yZGluZyB0byB0aGUgdmFsdWUgb2YgdXNlIFNTSCBwYXNzd29yZCBjaGVja2JveC5cbiAgICAgKi9cbiAgICBzaG93SGlkZVNTSFBhc3N3b3JkKCl7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGNvbmRpdGlvbnMgZm9yIGRlbGV0aW5nIGFsbCByZWNvcmRzLlxuICAgICAqIENvbXBhcmVzIHRoZSB2YWx1ZSBvZiB0aGUgJ2RlbGV0ZUFsbElucHV0JyBmaWVsZCB3aXRoIGEgcGhyYXNlLlxuICAgICAqIElmIHRoZXkgbWF0Y2gsIGl0IHRyaWdnZXJzIGEgc3lzdGVtIHJlc3RvcmUgdG8gZGVmYXVsdCBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBjaGVja0RlbGV0ZUFsbENvbmRpdGlvbnMoKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB2YWx1ZSBvZiAnZGVsZXRlQWxsSW5wdXQnIGZpZWxkLlxuICAgICAgICBjb25zdCBkZWxldGVBbGxJbnB1dCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZGVsZXRlQWxsSW5wdXQnKTtcblxuICAgICAgICAvLyBJZiB0aGUgZW50ZXJlZCBwaHJhc2UgbWF0Y2hlcyB0aGUgcGhyYXNlIGluICdnbG9iYWxUcmFuc2xhdGUuZ3NfRW50ZXJEZWxldGVBbGxQaHJhc2UnLFxuICAgICAgICAvLyBjYWxsICdQYnhBcGkuU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncycgdG8gcmVzdG9yZSBkZWZhdWx0IHNldHRpbmdzLlxuICAgICAgICBpZiAoZGVsZXRlQWxsSW5wdXQgPT09IGdsb2JhbFRyYW5zbGF0ZS5nc19FbnRlckRlbGV0ZUFsbFBocmFzZSkge1xuICAgICAgICAgICAgUGJ4QXBpLlN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNiQWZ0ZXJSZXN0b3JlRGVmYXVsdFNldHRpbmdzKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcmVzcG9uc2UgYWZ0ZXIgcmVzdG9yaW5nIGRlZmF1bHQgc2V0dGluZ3MuXG4gICAgICogQHBhcmFtIHtib29sZWFufHN0cmluZ30gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgcmVzdG9yaW5nIGRlZmF1bHQgc2V0dGluZ3MuXG4gICAgICovXG4gICAgY2JBZnRlclJlc3RvcmVEZWZhdWx0U2V0dGluZ3MocmVzcG9uc2UpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgcmVzcG9uc2UgaXMgdHJ1ZSwgZGlzcGxheSBhIHN1Y2Nlc3MgbWVzc2FnZVxuICAgICAgICAvLyBvdGhlcndpc2UsIGRpc3BsYXkgdGhlIHJlc3BvbnNlIG1lc3NhZ2UuXG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxTZXR0aW5nc0RlbGV0ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZXZlbnQgYWZ0ZXIgdGhlIHNlbGVjdCBzYXZlIHBlcmlvZCBzbGlkZXIgaXMgY2hhbmdlZC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUgZnJvbSB0aGUgc2xpZGVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyKHZhbHVlKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBzYXZlIHBlcmlvZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBzbGlkZXIgdmFsdWUuXG4gICAgICAgIGNvbnN0IHNhdmVQZXJpb2QgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2F2ZVJlY29yZHNQZXJpb2RbdmFsdWVdO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZm9ybSB2YWx1ZSBmb3IgJ1BCWFJlY29yZFNhdmVQZXJpb2QnIHRvIHRoZSBzZWxlY3RlZCBzYXZlIHBlcmlvZC5cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhSZWNvcmRTYXZlUGVyaW9kJywgc2F2ZVBlcmlvZCk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgY29uc3QgYXJyQ29kZWNzID0gW107XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUgLmNvZGVjLXJvdywgI3ZpZGVvLWNvZGVjcy10YWJsZSAuY29kZWMtcm93JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgaWYgKCQob2JqKS5hdHRyKCdpZCcpKSB7XG4gICAgICAgICAgICAgICAgYXJyQ29kZWNzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBjb2RlY0lkOiAkKG9iaikuYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6ICQob2JqKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJyksXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5kYXRhLmNvZGVjcyA9IEpTT04uc3RyaW5naWZ5KGFyckNvZGVjcyk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgICQoXCIjZXJyb3ItbWVzc2FnZXNcIikucmVtb3ZlKCk7XG4gICAgICAgIGlmICghcmVzcG9uc2Uuc3VjY2Vzcykge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbChyZXNwb25zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcucGFzc3dvcmQtdmFsaWRhdGUnKS5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2hlY2tEZWxldGVBbGxDb25kaXRpb25zKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBmdW5jdGlvbiBjb2xsZWN0cyBhbiBpbmZvcm1hdGlvbiBtZXNzYWdlIGFib3V0IGEgZGF0YSBzYXZpbmcgZXJyb3JcbiAgICAgKiBAcGFyYW0gcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCAkZGl2ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndWkgbmVnYXRpdmUgbWVzc2FnZScsIGlkOiAnZXJyb3ItbWVzc2FnZXMnIH0pO1xuICAgICAgICAgICAgY29uc3QgJGhlYWRlciA9ICQoJzxkaXY+JywgeyBjbGFzczogJ2hlYWRlcicgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuZ3NfRXJyb3JTYXZlU2V0dGluZ3MpO1xuICAgICAgICAgICAgJGRpdi5hcHBlbmQoJGhlYWRlcik7XG4gICAgICAgICAgICBjb25zdCAkdWwgPSAkKCc8dWw+JywgeyBjbGFzczogJ2xpc3QnIH0pO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZXNTZXQgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5mb3JFYWNoKGVycm9yQXJyYXkgPT4ge1xuICAgICAgICAgICAgICAgIGVycm9yQXJyYXkuZm9yRWFjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0ZXh0Q29udGVudCA9Jyc7XG4gICAgICAgICAgICAgICAgICAgIGlmKGdsb2JhbFRyYW5zbGF0ZVtlcnJvci5tZXNzYWdlXSA9PT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHRDb250ZW50ID0gZXJyb3IubWVzc2FnZTtcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudCA9IGdsb2JhbFRyYW5zbGF0ZVtlcnJvci5tZXNzYWdlXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZXNTZXQuaGFzKHRleHRDb250ZW50KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzU2V0LmFkZChlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgJHVsLmFwcGVuZCgkKCc8bGk+JykudGV4dCh0ZXh0Q29udGVudCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkZGl2LmFwcGVuZCgkdWwpO1xuICAgICAgICAgICAgJCgnI3N1Ym1pdGJ1dHRvbicpLmJlZm9yZSgkZGl2KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSB2YWxpZGF0aW9uIHJ1bGVzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgaW5pdFJ1bGVzKCkge1xuICAgICAgICAvLyBTU0hQYXNzd29yZFxuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzO1xuICAgICAgICB9IGVsc2UgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQudmFsKCkgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2ViQWRtaW5QYXNzd29yZFxuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLnZhbCgpID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5XZWJBZG1pblBhc3N3b3JkLnJ1bGVzID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuV2ViQWRtaW5QYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS53ZWJBZG1pblBhc3N3b3JkUnVsZXM7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9Z2VuZXJhbC1zZXR0aW5ncy9zYXZlYDsgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBnZW5lcmFsU2V0dGluZ3MgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==