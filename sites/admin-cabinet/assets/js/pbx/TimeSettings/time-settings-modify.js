"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, SemanticLocalization, Form, PbxApi */
var timeSettings = {
  $number: $('#extension'),
  $formObj: $('#time-settings-form'),
  validateRules: {
    CurrentDateTime: {
      depends: 'PBXManualTimeSettings',
      identifier: 'ManualDateTime',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.ts_ValidateDateTime
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('#PBXTimezone').dropdown({
        fullTextSearch: true
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
  toggleDisabledFieldClass: function () {
    function toggleDisabledFieldClass() {
      if (timeSettings.$formObj.form('get value', 'PBXManualTimeSettings') === 'on') {
        $('#SetDateTimeBlock').removeClass('disabled');
        $('#SetNtpServerBlock').addClass('disabled');
      } else {
        $('#SetNtpServerBlock').removeClass('disabled');
        $('#SetDateTimeBlock').addClass('disabled');
        clockWorker.restartWorker();
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
      if (timeSettings.$formObj.form('get value', 'PBXManualTimeSettings') === 'on') {
        var manualDate = timeSettings.$formObj.form('get value', 'ManualDateTime');
        var timestamp = Date.parse("".concat(manualDate)) / 1000;
        var userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        PbxApi.UpdateDateTime({
          timestamp: timestamp,
          userTimeZone: userTimeZone
        });
      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9UaW1lU2V0dGluZ3MvdGltZS1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsidGltZVNldHRpbmdzIiwiJG51bWJlciIsIiQiLCIkZm9ybU9iaiIsInZhbGlkYXRlUnVsZXMiLCJDdXJyZW50RGF0ZVRpbWUiLCJkZXBlbmRzIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInRzX1ZhbGlkYXRlRGF0ZVRpbWUiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJmdWxsVGV4dFNlYXJjaCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJ0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MiLCJpbml0aWFsaXplRm9ybSIsImZvcm0iLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiY2xvY2tXb3JrZXIiLCJyZXN0YXJ0V29ya2VyIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIm1hbnVhbERhdGUiLCJ0aW1lc3RhbXAiLCJEYXRlIiwicGFyc2UiLCJ1c2VyVGltZVpvbmUiLCJJbnRsIiwiRGF0ZVRpbWVGb3JtYXQiLCJyZXNvbHZlZE9wdGlvbnMiLCJ0aW1lWm9uZSIsIlBieEFwaSIsIlVwZGF0ZURhdGVUaW1lIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsWUFBWSxHQUFHO0FBQ3BCQyxFQUFBQSxPQUFPLEVBQUVDLENBQUMsQ0FBQyxZQUFELENBRFU7QUFFcEJDLEVBQUFBLFFBQVEsRUFBRUQsQ0FBQyxDQUFDLHFCQUFELENBRlM7QUFHcEJFLEVBQUFBLGFBQWEsRUFBRTtBQUNkQyxJQUFBQSxlQUFlLEVBQUU7QUFDaEJDLE1BQUFBLE9BQU8sRUFBRSx1QkFETztBQUVoQkMsTUFBQUEsVUFBVSxFQUFFLGdC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QUM2QixlQUFwQztBQUNBWSxNQUFBQSxJQUFJLENBQUM1QixVQUFMO0FBQ0E7O0FBMURtQjtBQUFBO0FBQUEsQ0FBckI7QUE2REFYLENBQUMsQ0FBQzBDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkI3QyxFQUFBQSxZQUFZLENBQUNhLFVBQWI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIFNlbWFudGljTG9jYWxpemF0aW9uLCBGb3JtLCBQYnhBcGkgKi9cblxuY29uc3QgdGltZVNldHRpbmdzID0ge1xuXHQkbnVtYmVyOiAkKCcjZXh0ZW5zaW9uJyksXG5cdCRmb3JtT2JqOiAkKCcjdGltZS1zZXR0aW5ncy1mb3JtJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRDdXJyZW50RGF0ZVRpbWU6IHtcblx0XHRcdGRlcGVuZHM6ICdQQlhNYW51YWxUaW1lU2V0dGluZ3MnLFxuXHRcdFx0aWRlbnRpZmllcjogJ01hbnVhbERhdGVUaW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRzX1ZhbGlkYXRlRGF0ZVRpbWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnI1BCWFRpbWV6b25lJykuZHJvcGRvd24oe1xuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0fSk7XG5cblx0XHQkKCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG5cdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0dGltZVNldHRpbmdzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0XHR0aW1lU2V0dGluZ3MuaW5pdGlhbGl6ZUZvcm0oKTtcblx0XHR0aW1lU2V0dGluZ3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cdH0sXG5cdHRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpIHtcblx0XHRpZiAodGltZVNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdQQlhNYW51YWxUaW1lU2V0dGluZ3MnKSA9PT0gJ29uJykge1xuXHRcdFx0JCgnI1NldERhdGVUaW1lQmxvY2snKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdCQoJyNTZXROdHBTZXJ2ZXJCbG9jaycpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCcjU2V0TnRwU2VydmVyQmxvY2snKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdCQoJyNTZXREYXRlVGltZUJsb2NrJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjbG9ja1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdFx0fVxuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSB0aW1lU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRpZiAodGltZVNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdQQlhNYW51YWxUaW1lU2V0dGluZ3MnKSA9PT0gJ29uJykge1xuXHRcdFx0Y29uc3QgbWFudWFsRGF0ZSA9IHRpbWVTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnTWFudWFsRGF0ZVRpbWUnKTtcblx0XHRcdGNvbnN0IHRpbWVzdGFtcCA9IERhdGUucGFyc2UoYCR7bWFudWFsRGF0ZX1gKS8xMDAwO1xuXHRcdFx0Y29uc3QgdXNlclRpbWVab25lID0gSW50bC5EYXRlVGltZUZvcm1hdCgpLnJlc29sdmVkT3B0aW9ucygpLnRpbWVab25lO1xuXHRcdFx0UGJ4QXBpLlVwZGF0ZURhdGVUaW1lKHt0aW1lc3RhbXAsIHVzZXJUaW1lWm9uZX0pO1xuXHRcdH1cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IHRpbWVTZXR0aW5ncy4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9dGltZS1zZXR0aW5ncy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aW1lU2V0dGluZ3MudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aW1lU2V0dGluZ3MuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRpbWVTZXR0aW5ncy5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHRpbWVTZXR0aW5ncy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==