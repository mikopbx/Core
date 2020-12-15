"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9UaW1lU2V0dGluZ3MvdGltZS1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsidGltZVNldHRpbmdzIiwiJG51bWJlciIsIiQiLCIkZm9ybU9iaiIsInZhbGlkYXRlUnVsZXMiLCJDdXJyZW50RGF0ZVRpbWUiLCJkZXBlbmRzIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInRzX1ZhbGlkYXRlRGF0ZVRpbWUiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJmdWxsVGV4dFNlYXJjaCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJ0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MiLCJpbml0aWFsaXplRm9ybSIsImZvcm0iLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiY2xvY2tXb3JrZXIiLCJyZXN0YXJ0V29ya2VyIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIm1hbnVhbERhdGUiLCJ0aW1lc3RhbXAiLCJEYXRlIiwicGFyc2UiLCJ1c2VyVGltZVpvbmUiLCJJbnRsIiwiRGF0ZVRpbWVGb3JtYXQiLCJyZXNvbHZlZE9wdGlvbnMiLCJ0aW1lWm9uZSIsIlBieEFwaSIsIlVwZGF0ZURhdGVUaW1lIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkE7QUFFQSxJQUFNQSxZQUFZLEdBQUc7QUFDcEJDLEVBQUFBLE9BQU8sRUFBRUMsQ0FBQyxDQUFDLFlBQUQsQ0FEVTtBQUVwQkMsRUFBQUEsUUFBUSxFQUFFRCxDQUFDLENBQUMscUJBQUQsQ0FGUztBQUdwQkUsRUFBQUEsYUFBYSxFQUFFO0FBQ2RDLElBQUFBLGVBQWUsRUFBRTtBQUNoQkMsTUFBQUEsT0FBTyxFQUFFLHVCQURPO0FBRWhCQyxNQUFBQSxV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QjdCLFlBQVksQ0FBQzZCLGVBQXBDO0FBQ0FZLE1BQUFBLElBQUksQ0FBQzVCLFVBQUw7QUFDQTs7QUExRG1CO0FBQUE7QUFBQSxDQUFyQjtBQTZEQVgsQ0FBQyxDQUFDMEMsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjdDLEVBQUFBLFlBQVksQ0FBQ2EsVUFBYjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEZvcm0sIFBieEFwaSwgY2xvY2tXb3JrZXIgKi9cblxuY29uc3QgdGltZVNldHRpbmdzID0ge1xuXHQkbnVtYmVyOiAkKCcjZXh0ZW5zaW9uJyksXG5cdCRmb3JtT2JqOiAkKCcjdGltZS1zZXR0aW5ncy1mb3JtJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRDdXJyZW50RGF0ZVRpbWU6IHtcblx0XHRcdGRlcGVuZHM6ICdQQlhNYW51YWxUaW1lU2V0dGluZ3MnLFxuXHRcdFx0aWRlbnRpZmllcjogJ01hbnVhbERhdGVUaW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRzX1ZhbGlkYXRlRGF0ZVRpbWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnI1BCWFRpbWV6b25lJykuZHJvcGRvd24oe1xuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0fSk7XG5cblx0XHQkKCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG5cdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0dGltZVNldHRpbmdzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0XHR0aW1lU2V0dGluZ3MuaW5pdGlhbGl6ZUZvcm0oKTtcblx0XHR0aW1lU2V0dGluZ3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cdH0sXG5cdHRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpIHtcblx0XHRpZiAodGltZVNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdQQlhNYW51YWxUaW1lU2V0dGluZ3MnKSA9PT0gJ29uJykge1xuXHRcdFx0JCgnI1NldERhdGVUaW1lQmxvY2snKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdCQoJyNTZXROdHBTZXJ2ZXJCbG9jaycpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCcjU2V0TnRwU2VydmVyQmxvY2snKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdCQoJyNTZXREYXRlVGltZUJsb2NrJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjbG9ja1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdFx0fVxuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSB0aW1lU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRpZiAodGltZVNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdQQlhNYW51YWxUaW1lU2V0dGluZ3MnKSA9PT0gJ29uJykge1xuXHRcdFx0Y29uc3QgbWFudWFsRGF0ZSA9IHRpbWVTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnTWFudWFsRGF0ZVRpbWUnKTtcblx0XHRcdGNvbnN0IHRpbWVzdGFtcCA9IERhdGUucGFyc2UoYCR7bWFudWFsRGF0ZX1gKS8xMDAwO1xuXHRcdFx0Y29uc3QgdXNlclRpbWVab25lID0gSW50bC5EYXRlVGltZUZvcm1hdCgpLnJlc29sdmVkT3B0aW9ucygpLnRpbWVab25lO1xuXHRcdFx0UGJ4QXBpLlVwZGF0ZURhdGVUaW1lKHt0aW1lc3RhbXAsIHVzZXJUaW1lWm9uZX0pO1xuXHRcdH1cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IHRpbWVTZXR0aW5ncy4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9dGltZS1zZXR0aW5ncy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aW1lU2V0dGluZ3MudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aW1lU2V0dGluZ3MuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRpbWVTZXR0aW5ncy5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHRpbWVTZXR0aW5ncy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==