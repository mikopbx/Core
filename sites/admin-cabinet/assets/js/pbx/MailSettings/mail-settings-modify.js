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

/* global globalRootUrl,globalTranslate, Form, PbxApi, UserMessage */
var mailSettings = {
  $formObj: $('#mail-settings-form'),
  $checkBoxes: $('#mail-settings-form .checkbox'),
  $menuItems: $('#mail-settings-menu .item'),
  validateRules: {
    name: {
      identifier: 'name',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.cq_ValidateNameEmpty
      }]
    }
  },
  initialize: function () {
    function initialize() {
      mailSettings.$menuItems.tab();
      mailSettings.$checkBoxes.checkbox();
      mailSettings.initializeForm();
    }

    return initialize;
  }(),
  updateMailSettingsCallback: function () {
    function updateMailSettingsCallback(response) {
      if (response.result === true) {
        mailSettings.$formObj.after("<div class=\"ui success message ajax\">".concat(globalTranslate.ms_TestEmailSubject, "</div>"));
        var testEmail = mailSettings.$formObj.form('get value', 'SystemNotificationsEmail');

        if (testEmail.length > 0) {
          var params = {
            email: testEmail,
            subject: globalTranslate.ms_TestEmailSubject,
            body: globalTranslate.ms_TestEmailBody,
            encode: ''
          };
          PbxApi.SendTestEmail(params, mailSettings.cbAfterEmailSend);
        }
      }
    }

    return updateMailSettingsCallback;
  }(),
  cbAfterEmailSend: function () {
    function cbAfterEmailSend(message) {
      if (message === true) {
        UserMessage.showInformation(globalTranslate.ms_TestEmailSentSuccessfully);
      } else if (message.length > 0) {
        UserMessage.showMultiString(message);
      }
    }

    return cbAfterEmailSend;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = mailSettings.$formObj.form('get values');
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm(response) {
      if (response.success === true) {
        PbxApi.UpdateMailSettings(mailSettings.updateMailSettingsCallback);
      }
    }

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = mailSettings.$formObj;
      Form.url = "".concat(globalRootUrl, "mail-settings/save");
      Form.validateRules = mailSettings.validateRules;
      Form.cbBeforeSendForm = mailSettings.cbBeforeSendForm;
      Form.cbAfterSendForm = mailSettings.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  mailSettings.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsibWFpbFNldHRpbmdzIiwiJGZvcm1PYmoiLCIkIiwiJGNoZWNrQm94ZXMiLCIkbWVudUl0ZW1zIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfVmFsaWRhdGVOYW1lRW1wdHkiLCJpbml0aWFsaXplIiwidGFiIiwiY2hlY2tib3giLCJpbml0aWFsaXplRm9ybSIsInVwZGF0ZU1haWxTZXR0aW5nc0NhbGxiYWNrIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJhZnRlciIsIm1zX1Rlc3RFbWFpbFN1YmplY3QiLCJ0ZXN0RW1haWwiLCJmb3JtIiwibGVuZ3RoIiwicGFyYW1zIiwiZW1haWwiLCJzdWJqZWN0IiwiYm9keSIsIm1zX1Rlc3RFbWFpbEJvZHkiLCJlbmNvZGUiLCJQYnhBcGkiLCJTZW5kVGVzdEVtYWlsIiwiY2JBZnRlckVtYWlsU2VuZCIsIm1lc3NhZ2UiLCJVc2VyTWVzc2FnZSIsInNob3dJbmZvcm1hdGlvbiIsIm1zX1Rlc3RFbWFpbFNlbnRTdWNjZXNzZnVsbHkiLCJzaG93TXVsdGlTdHJpbmciLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJkYXRhIiwiY2JBZnRlclNlbmRGb3JtIiwic3VjY2VzcyIsIlVwZGF0ZU1haWxTZXR0aW5ncyIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBO0FBRUEsSUFBTUEsWUFBWSxHQUFHO0FBQ3BCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxxQkFBRCxDQURTO0FBRXBCQyxFQUFBQSxXQUFXLEVBQUVELENBQUMsQ0FBQywrQkFBRCxDQUZNO0FBR3BCRSxFQUFBQSxVQUFVLEVB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QSxJQUFJLENBQUNILGVBQUwsR0FBdUIxQyxZQUFZLENBQUMwQyxlQUFwQztBQUNBRyxNQUFBQSxJQUFJLENBQUNoQyxVQUFMO0FBQ0E7O0FBM0RtQjtBQUFBO0FBQUEsQ0FBckI7QUE4REFYLENBQUMsQ0FBQzhDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJqRCxFQUFBQSxZQUFZLENBQUNhLFVBQWI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBVc2VyTWVzc2FnZSAqL1xuXG5jb25zdCBtYWlsU2V0dGluZ3MgPSB7XG5cdCRmb3JtT2JqOiAkKCcjbWFpbC1zZXR0aW5ncy1mb3JtJyksXG5cdCRjaGVja0JveGVzOiAkKCcjbWFpbC1zZXR0aW5ncy1mb3JtIC5jaGVja2JveCcpLFxuXHQkbWVudUl0ZW1zOiAkKCcjbWFpbC1zZXR0aW5ncy1tZW51IC5pdGVtJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRuYW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5hbWVFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRtYWlsU2V0dGluZ3MuJG1lbnVJdGVtcy50YWIoKTtcblx0XHRtYWlsU2V0dGluZ3MuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcblx0XHRtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZUZvcm0oKTtcblx0fSxcblx0dXBkYXRlTWFpbFNldHRpbmdzQ2FsbGJhY2socmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG5cdFx0XHRtYWlsU2V0dGluZ3MuJGZvcm1PYmouYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBzdWNjZXNzIG1lc3NhZ2UgYWpheFwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zX1Rlc3RFbWFpbFN1YmplY3R9PC9kaXY+YCk7XG5cdFx0XHRjb25zdCB0ZXN0RW1haWwgPSBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCcpO1xuXHRcdFx0aWYgKHRlc3RFbWFpbC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGNvbnN0IHBhcmFtcyA9IHtcblx0XHRcdFx0XHRlbWFpbDogdGVzdEVtYWlsLFxuXHRcdFx0XHRcdHN1YmplY3Q6IGdsb2JhbFRyYW5zbGF0ZS5tc19UZXN0RW1haWxTdWJqZWN0LFxuXHRcdFx0XHRcdGJvZHk6IGdsb2JhbFRyYW5zbGF0ZS5tc19UZXN0RW1haWxCb2R5LFxuXHRcdFx0XHRcdGVuY29kZTogJycsXG5cdFx0XHRcdH07XG5cdFx0XHRcdFBieEFwaS5TZW5kVGVzdEVtYWlsKHBhcmFtcywgbWFpbFNldHRpbmdzLmNiQWZ0ZXJFbWFpbFNlbmQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblx0Y2JBZnRlckVtYWlsU2VuZChtZXNzYWdlKSB7XG5cdFx0aWYgKG1lc3NhZ2UgPT09IHRydWUpIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihnbG9iYWxUcmFuc2xhdGUubXNfVGVzdEVtYWlsU2VudFN1Y2Nlc3NmdWxseSk7XG5cdFx0fSBlbHNlIGlmIChtZXNzYWdlLmxlbmd0aCA+IDApIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhtZXNzYWdlKTtcblx0XHR9XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUpIHtcblx0XHRcdFBieEFwaS5VcGRhdGVNYWlsU2V0dGluZ3MobWFpbFNldHRpbmdzLnVwZGF0ZU1haWxTZXR0aW5nc0NhbGxiYWNrKTtcblx0XHR9XG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBtYWlsU2V0dGluZ3MuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfW1haWwtc2V0dGluZ3Mvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFpbFNldHRpbmdzLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFpbFNldHRpbmdzLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBtYWlsU2V0dGluZ3MuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=