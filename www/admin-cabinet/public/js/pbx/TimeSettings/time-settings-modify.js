"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl, globalTranslate, SemanticLocalization, Form, PbxApi */
var timeSettings = {
  $number: $('#extension'),
  $formObj: $('#time-settings-form'),
  validateRules: {
    CurrentDateTime: {
      depends: 'PBXManualTimeSettings',
      identifier: 'CurrentDateTime',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.cq_ValidateNameEmpty
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('#PBXTimezone').dropdown({
        fullTextSearch: true
      });
      $('#CalendarBlock').calendar({
        firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
        ampm: false,
        text: SemanticLocalization.calendarText
      });
      $('.checkbox').checkbox({
        onChange: function () {
          function onChange() {
            timeSettings.toggleDisabledFieldClass();
          }

          return onChange;
        }()
      });
      timeSettings.initializeForm();
      timeSettings.toggleDisabledFieldClass();
    }

    return initialize;
  }(),
  formattedDate: function () {
    function formattedDate() {
      var date = Date.parse(timeSettings.$formObj.form('get value', 'CurrentDateTime'));
      return date / 1000;
    }

    return formattedDate;
  }(),
  toggleDisabledFieldClass: function () {
    function toggleDisabledFieldClass() {
      if (timeSettings.$formObj.form('get value', 'PBXManualTimeSettings') === 'on') {
        $('#SetDateTimeBlock').removeClass('disabled');
        $('#SetNtpServerBlock').addClass('disabled');
      } else {
        $('#SetNtpServerBlock').removeClass('disabled');
        $('#SetDateTimeBlock').addClass('disabled');
      }
    }

    return toggleDisabledFieldClass;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = timeSettings.$formObj.form('get values');
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {
      PbxApi.UpdateDateTime({
        date: timeSettings.formattedDate()
      });
    }

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = timeSettings.$formObj;
      Form.url = "".concat(globalRootUrl, "time-settings/save");
      Form.validateRules = timeSettings.validateRules;
      Form.cbBeforeSendForm = timeSettings.cbBeforeSendForm;
      Form.cbAfterSendForm = timeSettings.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  timeSettings.initialize();
});
//# sourceMappingURL=time-settings-modify.js.map