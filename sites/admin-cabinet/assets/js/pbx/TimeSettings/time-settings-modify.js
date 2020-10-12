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
        var timestamp = Date.parse(manualDate) / 1000;
        console.debug("Set new system date: ".concat(manualDate, " timestamp: ").concat(timestamp));
        PbxApi.UpdateDateTime(timestamp);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9UaW1lU2V0dGluZ3MvdGltZS1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsidGltZVNldHRpbmdzIiwiJG51bWJlciIsIiQiLCIkZm9ybU9iaiIsInZhbGlkYXRlUnVsZXMiLCJDdXJyZW50RGF0ZVRpbWUiLCJkZXBlbmRzIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInRzX1ZhbGlkYXRlRGF0ZVRpbWUiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJmdWxsVGV4dFNlYXJjaCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJ0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MiLCJpbml0aWFsaXplRm9ybSIsImZvcm0iLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIm1hbnVhbERhdGUiLCJ0aW1lc3RhbXAiLCJEYXRlIiwicGFyc2UiLCJjb25zb2xlIiwiZGVidWciLCJQYnhBcGkiLCJVcGRhdGVEYXRlVGltZSIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLFlBQVksR0FBRztBQUNwQkMsRUFBQUEsT0FBTyxFQUFFQyxDQUFDLENBQUMsWUFBRCxDQURVO0FBRXBCQyxFQUFBQSxRQUFRLEVBQUVELENBQUMsQ0FBQyxxQkFBRCxDQUZTO0FBR3BCRSxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsZUFBZSxFQUFFO0FBQ2hCQyxNQUFBQSxPQUFPLEVBQUUsdUJBRE87QUFFaEJDLE1BQUFBLFVBQVUsRUFBRSxnQkFGSTtBQUdoQkMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ0MsUUFBQUEsSUFBSSxFQUFFLE9BRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRnpCLE9BRE07QUFIUztBQURILEdBSEs7QUFlcEJDLEVBQUFBLFVBZm9CO0FBQUEsMEJBZVA7QUFDWlgsTUFBQUEsQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQlksUUFBbEIsQ0FBMkI7QUFDMUJDLFFBQUFBLGNBQWMsRUFBRTtBQURVLE9BQTNCO0FBSUFiLE1BQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZWMsUUFBZixDQUF3QjtBQUN2QkMsUUFBQUEsUUFEdUI7QUFBQSw4QkFDWjtBQUNWakIsWUFBQUEsWUFBWSxDQUFDa0Isd0JBQWI7QUFDQTs7QUFIc0I7QUFBQTtBQUFBLE9BQXhCO0FBS0FsQixNQUFBQSxZQUFZLENBQUNtQixjQUFiO0FBQ0FuQixNQUFBQSxZQUFZLENBQUNrQix3QkFBYjtBQUNBOztBQTNCbUI7QUFBQTtBQTRCcEJBLEVBQUFBLHdCQTVCb0I7QUFBQSx3Q0E0Qk87QUFDMUIsVUFBSWxCLFlBQVksQ0FBQ0csUUFBYixDQUFzQmlCLElBQXRCLENBQTJCLFdBQTNCLEVBQXdDLHVCQUF4QyxNQUFxRSxJQUF6RSxFQUErRTtBQUM5RWxCLFFBQUFBLENBQUMsQ0FBQyxtQkFBRCxDQUFELENBQXVCbUIsV0FBdkIsQ0FBbUMsVUFBbkM7QUFDQW5CLFFBQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCb0IsUUFBeEIsQ0FBaUMsVUFBakM7QUFDQSxPQUhELE1BR087QUFDTnBCLFFBQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCbUIsV0FBeEIsQ0FBb0MsVUFBcEM7QUFDQW5CLFFBQUFBLENBQUMsQ0FBQyxtQkFBRCxDQUFELENBQXVCb0IsUUFBdkIsQ0FBZ0MsVUFBaEM7QUFDQTtBQUNEOztBQXBDbUI7QUFBQTtBQXFDcEJDLEVBQUFBLGdCQXJDb0I7QUFBQSw4QkFxQ0hDLFFBckNHLEVBcUNPO0FBQzFCLFVBQU1DLE1BQU0sR0FBR0QsUUFBZjtBQUNBQyxNQUFBQSxNQUFNLENBQUNDLElBQVAsR0FBYzFCLFlBQVksQ0FBQ0csUUFBYixDQUFzQmlCLElBQXRCLENBQTJCLFlBQTNCLENBQWQ7QUFDQSxhQUFPSyxNQUFQO0FBQ0E7O0FBekNtQjtBQUFBO0FBMENwQkUsRUFBQUEsZUExQ29CO0FBQUEsK0JBMENGO0FBQ2pCLFVBQUkzQixZQUFZLENBQUNHLFFBQWIsQ0FBc0JpQixJQUF0QixDQUEyQixXQUEzQixFQUF3Qyx1QkFBeEMsTUFBcUUsSUFBekUsRUFBK0U7QUFDOUUsWUFBTVEsVUFBVSxHQUFHNUIsWUFBWSxDQUFDRyxRQUFiLENBQXNCaUIsSUFBdEIsQ0FBMkIsV0FBM0IsRUFBd0MsZ0JBQXhDLENBQW5CO0FBQ0EsWUFBTVMsU0FBUyxHQUFHQyxJQUFJLENBQUNDLEtBQUwsQ0FBV0gsVUFBWCxJQUF1QixJQUF6QztBQUNBSSxRQUFBQSxPQUFPLENBQUNDLEtBQVIsZ0NBQXNDTCxVQUF0Qyx5QkFBK0RDLFNBQS9EO0FBQ0FLLFFBQUFBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQk4sU0FBdEI7QUFDQTtBQUNEOztBQWpEbUI7QUFBQTtBQWtEcEJWLEVBQUFBLGNBbERvQjtBQUFBLDhCQWtESDtBQUNoQmlCLE1BQUFBLElBQUksQ0FBQ2pDLFFBQUwsR0FBZ0JILFlBQVksQ0FBQ0csUUFBN0I7QUFDQWlDLE1BQUFBLElBQUksQ0FBQ0MsR0FBTCxhQUFjQyxhQUFkO0FBQ0FGLE1BQUFBLElBQUksQ0FBQ2hDLGFBQUwsR0FBcUJKLFlBQVksQ0FBQ0ksYUFBbEM7QUFDQWdDLE1BQUFBLElBQUksQ0FBQ2IsZ0JBQUwsR0FBd0J2QixZQUFZLENBQUN1QixnQkFBckM7QUFDQWEsTUFBQUEsSUFBSSxDQUFDVCxlQUFMLEdBQXVCM0IsWUFBWSxDQUFDMkIsZUFBcEM7QUFDQVMsTUFBQUEsSUFBSSxDQUFDdkIsVUFBTDtBQUNBOztBQXpEbUI7QUFBQTtBQUFBLENBQXJCO0FBNERBWCxDQUFDLENBQUNxQyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCeEMsRUFBQUEsWUFBWSxDQUFDYSxVQUFiO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRm9ybSwgUGJ4QXBpICovXG5cbmNvbnN0IHRpbWVTZXR0aW5ncyA9IHtcblx0JG51bWJlcjogJCgnI2V4dGVuc2lvbicpLFxuXHQkZm9ybU9iajogJCgnI3RpbWUtc2V0dGluZ3MtZm9ybScpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0Q3VycmVudERhdGVUaW1lOiB7XG5cdFx0XHRkZXBlbmRzOiAnUEJYTWFudWFsVGltZVNldHRpbmdzJyxcblx0XHRcdGlkZW50aWZpZXI6ICdNYW51YWxEYXRlVGltZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50c19WYWxpZGF0ZURhdGVUaW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJyNQQlhUaW1lem9uZScpLmRyb3Bkb3duKHtcblx0XHRcdGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuXHRcdH0pO1xuXG5cdFx0JCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuXHRcdFx0b25DaGFuZ2UoKSB7XG5cdFx0XHRcdHRpbWVTZXR0aW5ncy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0dGltZVNldHRpbmdzLmluaXRpYWxpemVGb3JtKCk7XG5cdFx0dGltZVNldHRpbmdzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXHR9LFxuXHR0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG5cdFx0aWYgKHRpbWVTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnUEJYTWFudWFsVGltZVNldHRpbmdzJykgPT09ICdvbicpIHtcblx0XHRcdCQoJyNTZXREYXRlVGltZUJsb2NrJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHQkKCcjU2V0TnRwU2VydmVyQmxvY2snKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCgnI1NldE50cFNlcnZlckJsb2NrJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHQkKCcjU2V0RGF0ZVRpbWVCbG9jaycpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gdGltZVNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cdFx0aWYgKHRpbWVTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnUEJYTWFudWFsVGltZVNldHRpbmdzJykgPT09ICdvbicpIHtcblx0XHRcdGNvbnN0IG1hbnVhbERhdGUgPSB0aW1lU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ01hbnVhbERhdGVUaW1lJyk7XG5cdFx0XHRjb25zdCB0aW1lc3RhbXAgPSBEYXRlLnBhcnNlKG1hbnVhbERhdGUpLzEwMDA7XG5cdFx0XHRjb25zb2xlLmRlYnVnKGBTZXQgbmV3IHN5c3RlbSBkYXRlOiAke21hbnVhbERhdGV9IHRpbWVzdGFtcDogJHt0aW1lc3RhbXB9YCk7XG5cdFx0XHRQYnhBcGkuVXBkYXRlRGF0ZVRpbWUodGltZXN0YW1wKTtcblx0XHR9XG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSB0aW1lU2V0dGluZ3MuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfXRpbWUtc2V0dGluZ3Mvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gdGltZVNldHRpbmdzLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGltZVNldHRpbmdzLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aW1lU2V0dGluZ3MuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHR0aW1lU2V0dGluZ3MuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=