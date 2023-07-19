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
    }); // Enable dropdowns in the form

    $('#general-settings-form .dropdown').dropdown(); // Enable table drag-n-drop functionality

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
    if (!response.success) {
      Form.$submitButton.removeClass('disabled');
    } else {
      $('.password-validate').remove();
    }

    generalSettingsModify.checkDeleteAllConditions();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwiJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyIiwic2F2ZVJlY29yZHNQZXJpb2QiLCJ2YWxpZGF0ZVJ1bGVzIiwicGJ4bmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJnc19WYWxpZGF0ZUVtcHR5UEJYTmFtZSIsIldlYkFkbWluUGFzc3dvcmQiLCJXZWJBZG1pblBhc3N3b3JkUmVwZWF0IiwiZ3NfVmFsaWRhdGVXZWJQYXNzd29yZHNGaWVsZERpZmZlcmVudCIsIlNTSFBhc3N3b3JkIiwiU1NIUGFzc3dvcmRSZXBlYXQiLCJnc19WYWxpZGF0ZVNTSFBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50IiwiV0VCUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE91dE9mUmFuZ2UiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0IiwiV0VCSFRUUFNQb3J0IiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnRPdXRPZlJhbmdlIiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVBvcnQiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCIsIkFKQU1Qb3J0IiwiZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UiLCJ3ZWJBZG1pblBhc3N3b3JkUnVsZXMiLCJnc19WYWxpZGF0ZUVtcHR5V2ViUGFzc3dvcmQiLCJnc19WYWxpZGF0ZVdlYWtXZWJQYXNzd29yZCIsInZhbHVlIiwiZ3NfUGFzc3dvcmRzIiwiZ3NfUGFzc3dvcmROb0xvd1NpbXZvbCIsImdzX1Bhc3N3b3JkTm9OdW1iZXJzIiwiZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sIiwiYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzIiwiZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkIiwiZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQiLCJnc19TU0hQYXNzd29yZCIsImFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzIiwiaW5pdGlhbGl6ZSIsIm9uIiwidmFsIiwiaW5pdFJ1bGVzIiwiUGFzc3dvcmRTY29yZSIsImNoZWNrUGFzc1N0cmVuZ3RoIiwicGFzcyIsImJhciIsInNlY3Rpb24iLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwiZHJvcGRvd24iLCJ0YWJsZURuRCIsIm9uRHJvcCIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIlNvdW5kRmlsZXNTZWxlY3RvciIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiaW50ZXJwcmV0TGFiZWwiLCJsYWJlbHMiLCJnc19TdG9yZTFNb250aE9mUmVjb3JkcyIsImdzX1N0b3JlM01vbnRoc09mUmVjb3JkcyIsImdzX1N0b3JlNk1vbnRoc09mUmVjb3JkcyIsImdzX1N0b3JlMVllYXJPZlJlY29yZHMiLCJnc19TdG9yZTNZZWFyc09mUmVjb3JkcyIsImdzX1N0b3JlQWxsUG9zc2libGVSZWNvcmRzIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlciIsImluaXRpYWxpemVGb3JtIiwiY2hlY2tib3giLCJzaG93SGlkZVNTSFBhc3N3b3JkIiwicmVjb3JkU2F2ZVBlcmlvZCIsImZvcm0iLCJpbmRleE9mIiwid2luZG93IiwiZXZlbnQiLCJuYW1lVGFiIiwiaGlkZSIsInNob3ciLCJjaGVja0RlbGV0ZUFsbENvbmRpdGlvbnMiLCJkZWxldGVBbGxJbnB1dCIsImdzX0VudGVyRGVsZXRlQWxsUGhyYXNlIiwiUGJ4QXBpIiwiU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsImNiQWZ0ZXJSZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwicmVzcG9uc2UiLCJVc2VyTWVzc2FnZSIsInNob3dJbmZvcm1hdGlvbiIsImdzX0FsbFNldHRpbmdzRGVsZXRlZCIsInNob3dNdWx0aVN0cmluZyIsInNhdmVQZXJpb2QiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiYXJyQ29kZWNzIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiYXR0ciIsInB1c2giLCJjb2RlY0lkIiwiZGlzYWJsZWQiLCJwcmlvcml0eSIsImNvZGVjcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJjYkFmdGVyU2VuZEZvcm0iLCJzdWNjZXNzIiwiJHN1Ym1pdEJ1dHRvbiIsInJlbW92ZUNsYXNzIiwicmVtb3ZlIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFHQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxxQkFBcUIsR0FBRztBQUMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx3QkFBRCxDQUxlOztBQU8xQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRUQsQ0FBQyxDQUFDLG1CQUFELENBWE07O0FBYTFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLFlBQVksRUFBRUYsQ0FBQyxD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S0FBcEMsR0FBNENkLHFCQUFxQixDQUFDb0MscUJBQWxFO0FBQ0g7QUFDSixHQXBheUI7O0FBc2ExQjtBQUNKO0FBQ0E7QUFDSWtELEVBQUFBLGNBemEwQiw0QkF5YVQ7QUFDYnJCLElBQUFBLElBQUksQ0FBQ2hFLFFBQUwsR0FBZ0JELHFCQUFxQixDQUFDQyxRQUF0QztBQUNBZ0UsSUFBQUEsSUFBSSxDQUFDaUUsR0FBTCxhQUFjQyxhQUFkLDJCQUZhLENBRXVDOztBQUNwRGxFLElBQUFBLElBQUksQ0FBQ3RELGFBQUwsR0FBcUJYLHFCQUFxQixDQUFDVyxhQUEzQyxDQUhhLENBRzZDOztBQUMxRHNELElBQUFBLElBQUksQ0FBQzRDLGdCQUFMLEdBQXdCN0cscUJBQXFCLENBQUM2RyxnQkFBOUMsQ0FKYSxDQUltRDs7QUFDaEU1QyxJQUFBQSxJQUFJLENBQUM0RCxlQUFMLEdBQXVCN0gscUJBQXFCLENBQUM2SCxlQUE3QyxDQUxhLENBS2lEOztBQUM5RDVELElBQUFBLElBQUksQ0FBQ2hCLFVBQUw7QUFDSDtBQWhieUIsQ0FBOUIsQyxDQW1iQTs7QUFDQS9DLENBQUMsQ0FBQ2tJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJySSxFQUFBQSxxQkFBcUIsQ0FBQ2lELFVBQXRCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYXNzd29yZFNjb3JlLCBQYnhBcGksIFVzZXJNZXNzYWdlLCBTb3VuZEZpbGVzU2VsZWN0b3IsICQgKi9cblxuLyoqXG4gKiBBIG1vZHVsZSB0byBoYW5kbGUgbW9kaWZpY2F0aW9uIG9mIGdlbmVyYWwgc2V0dGluZ3MuXG4gKi9cbmNvbnN0IGdlbmVyYWxTZXR0aW5nc01vZGlmeSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgd2ViIGFkbWluIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHdlYkFkbWluUGFzc3dvcmQ6ICQoJyNXZWJBZG1pblBhc3N3b3JkJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3NoIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNzaFBhc3N3b3JkOiAkKCcjU1NIUGFzc3dvcmQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB3ZWIgc3NoIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpc2FibGVTU0hQYXNzd29yZDogJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLnBhcmVudCgnLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNzaFBhc3N3b3JkU2VnbWVudDogJCgnI29ubHktaWYtcGFzc3dvcmQtZW5hYmxlZCcpLFxuXG4gICAgLyoqXG4gICAgICogSWYgcGFzc3dvcmQgc2V0LCBpdCB3aWxsIGJlIGhpZGVkIGZyb20gd2ViIHVpLlxuICAgICAqL1xuICAgIGhpZGRlblBhc3N3b3JkOiAneHh4eHh4eCcsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgcmVjb3JkcyByZXRlbnRpb24gcGVyaW9kIHNsaWRlci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlcjogJCgnI1BCWFJlY29yZFNhdmVQZXJpb2RTbGlkZXInKSxcblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIHBlcmlvZCB2YWx1ZXMgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbi5cbiAgICAgKi9cbiAgICBzYXZlUmVjb3Jkc1BlcmlvZDogWyczMCcsICc5MCcsICcxODAnLCAnMzYwJywgJzEwODAnLCAnJ10sXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHsgLy8gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXNcbiAgICAgICAgcGJ4bmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1BCWE5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXZWJBZG1pblBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV2ViQWRtaW5QYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgIH0sXG4gICAgICAgIFdlYkFkbWluUGFzc3dvcmRSZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF0Y2hbV2ViQWRtaW5QYXNzd29yZF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBTU0hQYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NTSFBhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgU1NIUGFzc3dvcmRSZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTU0hQYXNzd29yZFJlcGVhdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hdGNoW1NTSFBhc3N3b3JkXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdFQlBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXRUJQb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W1dFQkhUVFBTUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdFQkhUVFBTUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dFQkhUVFBTUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W1dFQlBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgQUpBTVBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdBSkFNUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIFJ1bGVzIGZvciB0aGUgd2ViIGFkbWluIHBhc3N3b3JkIGZpZWxkIHdoZW4gaXQgbm90IGVxdWFsIHRvIGhpZGRlblBhc3N3b3JkXG4gICAgd2ViQWRtaW5QYXNzd29yZFJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5V2ViUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrV2ViUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bYS16XS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9Mb3dTaW12b2xcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1xcZC8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9VcHBlclNpbXZvbFxuICAgICAgICB9XG4gICAgXSxcbiAgICAvLyBSdWxlcyBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZCB3aGVuIFNTSCBsb2dpbiB0aHJvdWdoIHRoZSBwYXNzd29yZCBlbmFibGVkLCBhbmQgaXQgbm90IGVxdWFsIHRvIGhpZGRlblBhc3N3b3JkXG4gICAgYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bYS16XS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vTnVtYmVyc1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW0EtWl0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9VcHBlclNpbXZvbFxuICAgICAgICB9XG4gICAgXSxcblxuICAgIC8vIFJ1bGVzIGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkIHdoZW4gU1NIIGxvZ2luIHRocm91Z2ggdGhlIHBhc3N3b3JkIGRpc2FibGVkXG4gICAgYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCxcbiAgICAgICAgfVxuICAgIF0sXG5cbiAgICAvKipcbiAgICAgKiAgSW5pdGlhbGl6ZSBtb2R1bGUgd2l0aCBldmVudCBiaW5kaW5ncyBhbmQgY29tcG9uZW50IGluaXRpYWxpemF0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIC8vIFdoZW4gV2ViQWRtaW5QYXNzd29yZCBpbnB1dCBpcyBjaGFuZ2VkLCByZWNhbGN1bGF0ZSB0aGUgcGFzc3dvcmQgc3RyZW5ndGhcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLm9uKCdrZXl1cCcsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCkgIT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgcGFzczogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICBiYXI6ICQoJy5wYXNzd29yZC1zY29yZScpLFxuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiAkKCcucGFzc3dvcmQtc2NvcmUtc2VjdGlvbicpLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBXaGVuIFNTSFBhc3N3b3JkIGlucHV0IGlzIGNoYW5nZWQsIHJlY2FsY3VsYXRlIHRoZSBwYXNzd29yZCBzdHJlbmd0aFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLm9uKCdrZXl1cCcsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgUGFzc3dvcmRTY29yZS5jaGVja1Bhc3NTdHJlbmd0aCh7XG4gICAgICAgICAgICAgICAgICAgIHBhc3M6IGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQudmFsKCksXG4gICAgICAgICAgICAgICAgICAgIGJhcjogJCgnLnNzaC1wYXNzd29yZC1zY29yZScpLFxuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiAkKCcuc3NoLXBhc3N3b3JkLXNjb3JlLXNlY3Rpb24nKSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLW1lbnUnKS5maW5kKCcuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGRyb3Bkb3ducyBpbiB0aGUgZm9ybVxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYmxlIGRyYWctbi1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSwgI3ZpZGVvLWNvZGVjcy10YWJsZScpLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcCgpIHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRHJhZ0NsYXNzOiAnaG92ZXJpbmdSb3cnLFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGRyb3Bkb3duIHdpdGggc291bmQgZmlsZSBzZWxlY3Rpb25cbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybSAuYXVkaW8tbWVzc2FnZS1zZWxlY3QnKS5kcm9wZG93bihTb3VuZEZpbGVzU2VsZWN0b3IuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgpKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlY29yZHMgc2F2ZSBwZXJpb2Qgc2xpZGVyXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXJcbiAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICBtYXg6IDUsXG4gICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICBzbW9vdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbGFiZWxzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0b3JlMU1vbnRoT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0b3JlM01vbnRoc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdG9yZTZNb250aHNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RvcmUxWWVhck9mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdG9yZTNZZWFyc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdG9yZUFsbFBvc3NpYmxlUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhZGRpdGlvbmFsIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuXG4gICAgICAgIC8vIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goe1xuICAgICAgICAgICAgJ29uQ2hhbmdlJzogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmRcbiAgICAgICAgfSk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBpbml0aWFsIHZhbHVlIGZvciB0aGUgcmVjb3JkcyBzYXZlIHBlcmlvZCBzbGlkZXJcbiAgICAgICAgY29uc3QgcmVjb3JkU2F2ZVBlcmlvZCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnUEJYUmVjb3JkU2F2ZVBlcmlvZCcpO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyXG4gICAgICAgICAgICAuc2xpZGVyKCdzZXQgdmFsdWUnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2F2ZVJlY29yZHNQZXJpb2QuaW5kZXhPZihyZWNvcmRTYXZlUGVyaW9kKSwgZmFsc2UpO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciB0byBoYW5kbGUgdGFiIGFjdGl2YXRpb25cbiAgICAgICAgJCh3aW5kb3cpLm9uKCdHUy1BY3RpdmF0ZVRhYicsIChldmVudCwgbmFtZVRhYikgPT4ge1xuICAgICAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKCdjaGFuZ2UgdGFiJywgbmFtZVRhYik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50IGFjY29yZGluZyB0byB0aGUgdmFsdWUgb2YgdXNlIFNTSCBwYXNzd29yZCBjaGVja2JveC5cbiAgICAgKi9cbiAgICBzaG93SGlkZVNTSFBhc3N3b3JkKCl7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGNvbmRpdGlvbnMgZm9yIGRlbGV0aW5nIGFsbCByZWNvcmRzLlxuICAgICAqIENvbXBhcmVzIHRoZSB2YWx1ZSBvZiB0aGUgJ2RlbGV0ZUFsbElucHV0JyBmaWVsZCB3aXRoIGEgcGhyYXNlLlxuICAgICAqIElmIHRoZXkgbWF0Y2gsIGl0IHRyaWdnZXJzIGEgc3lzdGVtIHJlc3RvcmUgdG8gZGVmYXVsdCBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBjaGVja0RlbGV0ZUFsbENvbmRpdGlvbnMoKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB2YWx1ZSBvZiAnZGVsZXRlQWxsSW5wdXQnIGZpZWxkLlxuICAgICAgICBjb25zdCBkZWxldGVBbGxJbnB1dCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZGVsZXRlQWxsSW5wdXQnKTtcblxuICAgICAgICAvLyBJZiB0aGUgZW50ZXJlZCBwaHJhc2UgbWF0Y2hlcyB0aGUgcGhyYXNlIGluICdnbG9iYWxUcmFuc2xhdGUuZ3NfRW50ZXJEZWxldGVBbGxQaHJhc2UnLFxuICAgICAgICAvLyBjYWxsICdQYnhBcGkuU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncycgdG8gcmVzdG9yZSBkZWZhdWx0IHNldHRpbmdzLlxuICAgICAgICBpZiAoZGVsZXRlQWxsSW5wdXQgPT09IGdsb2JhbFRyYW5zbGF0ZS5nc19FbnRlckRlbGV0ZUFsbFBocmFzZSkge1xuICAgICAgICAgICAgUGJ4QXBpLlN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNiQWZ0ZXJSZXN0b3JlRGVmYXVsdFNldHRpbmdzKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcmVzcG9uc2UgYWZ0ZXIgcmVzdG9yaW5nIGRlZmF1bHQgc2V0dGluZ3MuXG4gICAgICogQHBhcmFtIHtib29sZWFufHN0cmluZ30gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgcmVzdG9yaW5nIGRlZmF1bHQgc2V0dGluZ3MuXG4gICAgICovXG4gICAgY2JBZnRlclJlc3RvcmVEZWZhdWx0U2V0dGluZ3MocmVzcG9uc2UpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgcmVzcG9uc2UgaXMgdHJ1ZSwgZGlzcGxheSBhIHN1Y2Nlc3MgbWVzc2FnZVxuICAgICAgICAvLyBvdGhlcndpc2UsIGRpc3BsYXkgdGhlIHJlc3BvbnNlIG1lc3NhZ2UuXG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxTZXR0aW5nc0RlbGV0ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZXZlbnQgYWZ0ZXIgdGhlIHNlbGVjdCBzYXZlIHBlcmlvZCBzbGlkZXIgaXMgY2hhbmdlZC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUgZnJvbSB0aGUgc2xpZGVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyKHZhbHVlKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBzYXZlIHBlcmlvZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBzbGlkZXIgdmFsdWUuXG4gICAgICAgIGNvbnN0IHNhdmVQZXJpb2QgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2F2ZVJlY29yZHNQZXJpb2RbdmFsdWVdO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZm9ybSB2YWx1ZSBmb3IgJ1BCWFJlY29yZFNhdmVQZXJpb2QnIHRvIHRoZSBzZWxlY3RlZCBzYXZlIHBlcmlvZC5cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhSZWNvcmRTYXZlUGVyaW9kJywgc2F2ZVBlcmlvZCk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgY29uc3QgYXJyQ29kZWNzID0gW107XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUgLmNvZGVjLXJvdywgI3ZpZGVvLWNvZGVjcy10YWJsZSAuY29kZWMtcm93JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgaWYgKCQob2JqKS5hdHRyKCdpZCcpKSB7XG4gICAgICAgICAgICAgICAgYXJyQ29kZWNzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBjb2RlY0lkOiAkKG9iaikuYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6ICQob2JqKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJyksXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5kYXRhLmNvZGVjcyA9IEpTT04uc3RyaW5naWZ5KGFyckNvZGVjcyk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmICghcmVzcG9uc2Uuc3VjY2Vzcykge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnLnBhc3N3b3JkLXZhbGlkYXRlJykucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNoZWNrRGVsZXRlQWxsQ29uZGl0aW9ucygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSB2YWxpZGF0aW9uIHJ1bGVzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgaW5pdFJ1bGVzKCkge1xuICAgICAgICAvLyBTU0hQYXNzd29yZFxuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzO1xuICAgICAgICB9IGVsc2UgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQudmFsKCkgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2ViQWRtaW5QYXNzd29yZFxuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLnZhbCgpID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5XZWJBZG1pblBhc3N3b3JkLnJ1bGVzID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuV2ViQWRtaW5QYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS53ZWJBZG1pblBhc3N3b3JkUnVsZXM7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9Z2VuZXJhbC1zZXR0aW5ncy9zYXZlYDsgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBnZW5lcmFsU2V0dGluZ3MgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==