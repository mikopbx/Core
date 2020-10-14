"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, SemanticLocalization, Form, PbxApi, clockWorker */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9UaW1lU2V0dGluZ3MvdGltZS1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsidGltZVNldHRpbmdzIiwiJG51bWJlciIsIiQiLCIkZm9ybU9iaiIsInZhbGlkYXRlUnVsZXMiLCJDdXJyZW50RGF0ZVRpbWUiLCJkZXBlbmRzIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInRzX1ZhbGlkYXRlRGF0ZVRpbWUiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJmdWxsVGV4dFNlYXJjaCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJ0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MiLCJpbml0aWFsaXplRm9ybSIsImZvcm0iLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiY2xvY2tXb3JrZXIiLCJyZXN0YXJ0V29ya2VyIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIm1hbnVhbERhdGUiLCJ0aW1lc3RhbXAiLCJEYXRlIiwicGFyc2UiLCJ1c2VyVGltZVpvbmUiLCJJbnRsIiwiRGF0ZVRpbWVGb3JtYXQiLCJyZXNvbHZlZE9wdGlvbnMiLCJ0aW1lWm9uZSIsIlBieEFwaSIsIlVwZGF0ZURhdGVUaW1lIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsWUFBWSxHQUFHO0FBQ3BCQyxFQUFBQSxPQUFPLEVBQUVDLENBQUMsQ0FBQyxZQUFELENBRFU7QUFFcEJDLEVBQUFBLFFBQVEsRUFBRUQsQ0FBQyxDQUFDLHFCQUFELENBRlM7QUFHcEJFLEVBQUFBLGFBQWEsRUFBRTtBQUNkQyxJQUFBQSxlQUFlLEVBQUU7QUFDaEJDLE1BQUFBLE9BQU8sRUFBRSx1QkFETztBQUVoQkMsTUFBQUEsVUFBVSxFQUFFLGdC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QUM2QixlQUFwQztBQUNBWSxNQUFBQSxJQUFJLENBQUM1QixVQUFMO0FBQ0E7O0FBMURtQjtBQUFBO0FBQUEsQ0FBckI7QUE2REFYLENBQUMsQ0FBQzBDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkI3QyxFQUFBQSxZQUFZLENBQUNhLFVBQWI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIFNlbWFudGljTG9jYWxpemF0aW9uLCBGb3JtLCBQYnhBcGksIGNsb2NrV29ya2VyICovXG5cbmNvbnN0IHRpbWVTZXR0aW5ncyA9IHtcblx0JG51bWJlcjogJCgnI2V4dGVuc2lvbicpLFxuXHQkZm9ybU9iajogJCgnI3RpbWUtc2V0dGluZ3MtZm9ybScpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0Q3VycmVudERhdGVUaW1lOiB7XG5cdFx0XHRkZXBlbmRzOiAnUEJYTWFudWFsVGltZVNldHRpbmdzJyxcblx0XHRcdGlkZW50aWZpZXI6ICdNYW51YWxEYXRlVGltZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50c19WYWxpZGF0ZURhdGVUaW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJyNQQlhUaW1lem9uZScpLmRyb3Bkb3duKHtcblx0XHRcdGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuXHRcdH0pO1xuXG5cdFx0JCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuXHRcdFx0b25DaGFuZ2UoKSB7XG5cdFx0XHRcdHRpbWVTZXR0aW5ncy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0dGltZVNldHRpbmdzLmluaXRpYWxpemVGb3JtKCk7XG5cdFx0dGltZVNldHRpbmdzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXHR9LFxuXHR0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG5cdFx0aWYgKHRpbWVTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnUEJYTWFudWFsVGltZVNldHRpbmdzJykgPT09ICdvbicpIHtcblx0XHRcdCQoJyNTZXREYXRlVGltZUJsb2NrJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHQkKCcjU2V0TnRwU2VydmVyQmxvY2snKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCgnI1NldE50cFNlcnZlckJsb2NrJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHQkKCcjU2V0RGF0ZVRpbWVCbG9jaycpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y2xvY2tXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHRcdH1cblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gdGltZVNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cdFx0aWYgKHRpbWVTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnUEJYTWFudWFsVGltZVNldHRpbmdzJykgPT09ICdvbicpIHtcblx0XHRcdGNvbnN0IG1hbnVhbERhdGUgPSB0aW1lU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ01hbnVhbERhdGVUaW1lJyk7XG5cdFx0XHRjb25zdCB0aW1lc3RhbXAgPSBEYXRlLnBhcnNlKGAke21hbnVhbERhdGV9YCkvMTAwMDtcblx0XHRcdGNvbnN0IHVzZXJUaW1lWm9uZSA9IEludGwuRGF0ZVRpbWVGb3JtYXQoKS5yZXNvbHZlZE9wdGlvbnMoKS50aW1lWm9uZTtcblx0XHRcdFBieEFwaS5VcGRhdGVEYXRlVGltZSh7dGltZXN0YW1wLCB1c2VyVGltZVpvbmV9KTtcblx0XHR9XG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSB0aW1lU2V0dGluZ3MuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfXRpbWUtc2V0dGluZ3Mvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gdGltZVNldHRpbmdzLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGltZVNldHRpbmdzLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aW1lU2V0dGluZ3MuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHR0aW1lU2V0dGluZ3MuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=