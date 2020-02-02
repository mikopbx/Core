"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, Form, PbxApi, UserMessage */
var mailSettings = {
  $formObj: $('#mail-settings-form'),
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
      $('#mail-settings-menu .item').tab();
      $('.checkbox').checkbox();
      mailSettings.initializeForm();
    }

    return initialize;
  }(),
  updateMailSettingsCallback: function () {
    function updateMailSettingsCallback(response) {
      if (response.result.toUpperCase() === 'SUCCESS') {
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
        UserMessage.showError(message);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsibWFpbFNldHRpbmdzIiwiJGZvcm1PYmoiLCIkIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfVmFsaWRhdGVOYW1lRW1wdHkiLCJpbml0aWFsaXplIiwidGFiIiwiY2hlY2tib3giLCJpbml0aWFsaXplRm9ybSIsInVwZGF0ZU1haWxTZXR0aW5nc0NhbGxiYWNrIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJ0b1VwcGVyQ2FzZSIsImFmdGVyIiwibXNfVGVzdEVtYWlsU3ViamVjdCIsInRlc3RFbWFpbCIsImZvcm0iLCJsZW5ndGgiLCJwYXJhbXMiLCJlbWFpbCIsInN1YmplY3QiLCJib2R5IiwibXNfVGVzdEVtYWlsQm9keSIsImVuY29kZSIsIlBieEFwaSIsIlNlbmRUZXN0RW1haWwiLCJjYkFmdGVyRW1haWxTZW5kIiwibWVzc2FnZSIsIlVzZXJNZXNzYWdlIiwic2hvd0luZm9ybWF0aW9uIiwibXNfVGVzdEVtYWlsU2VudFN1Y2Nlc3NmdWxseSIsInNob3dFcnJvciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJzdWNjZXNzIiwiVXBkYXRlTWFpbFNldHRpbmdzIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsWUFBWSxHQUFHO0FBQ3BCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxxQkFBRCxDQURTO0FBRXBCQyxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsSUFBSSxFQUFFO0FBQ0xDLE1BQUFBLFVBQVUsRUFBRSxNQURQO0FBRUxDLE1BQUFBLEtBQUssRUFBRSxD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QUE2REFULENBQUMsQ0FBQzZDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJoRCxFQUFBQSxZQUFZLENBQUNXLFVBQWI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBVc2VyTWVzc2FnZSAqL1xuXG5jb25zdCBtYWlsU2V0dGluZ3MgPSB7XG5cdCRmb3JtT2JqOiAkKCcjbWFpbC1zZXR0aW5ncy1mb3JtJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRuYW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5hbWVFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcjbWFpbC1zZXR0aW5ncy1tZW51IC5pdGVtJykudGFiKCk7XG5cdFx0JCgnLmNoZWNrYm94JykuY2hlY2tib3goKTtcblxuXHRcdG1haWxTZXR0aW5ncy5pbml0aWFsaXplRm9ybSgpO1xuXHR9LFxuXHR1cGRhdGVNYWlsU2V0dGluZ3NDYWxsYmFjayhyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5yZXN1bHQudG9VcHBlckNhc2UoKSA9PT0gJ1NVQ0NFU1MnKSB7XG5cdFx0XHRtYWlsU2V0dGluZ3MuJGZvcm1PYmouYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBzdWNjZXNzIG1lc3NhZ2UgYWpheFwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zX1Rlc3RFbWFpbFN1YmplY3R9PC9kaXY+YCk7XG5cdFx0XHRjb25zdCB0ZXN0RW1haWwgPSBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCcpO1xuXHRcdFx0aWYgKHRlc3RFbWFpbC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGNvbnN0IHBhcmFtcyA9IHtcblx0XHRcdFx0XHRlbWFpbDogdGVzdEVtYWlsLFxuXHRcdFx0XHRcdHN1YmplY3Q6IGdsb2JhbFRyYW5zbGF0ZS5tc19UZXN0RW1haWxTdWJqZWN0LFxuXHRcdFx0XHRcdGJvZHk6IGdsb2JhbFRyYW5zbGF0ZS5tc19UZXN0RW1haWxCb2R5LFxuXHRcdFx0XHRcdGVuY29kZTogJycsXG5cdFx0XHRcdH07XG5cdFx0XHRcdFBieEFwaS5TZW5kVGVzdEVtYWlsKHBhcmFtcywgbWFpbFNldHRpbmdzLmNiQWZ0ZXJFbWFpbFNlbmQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblx0Y2JBZnRlckVtYWlsU2VuZChtZXNzYWdlKSB7XG5cdFx0aWYgKG1lc3NhZ2UgPT09IHRydWUpIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihnbG9iYWxUcmFuc2xhdGUubXNfVGVzdEVtYWlsU2VudFN1Y2Nlc3NmdWxseSk7XG5cdFx0fSBlbHNlIGlmIChtZXNzYWdlLmxlbmd0aCA+IDApIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlKTtcblx0XHR9XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUpIHtcblx0XHRcdFBieEFwaS5VcGRhdGVNYWlsU2V0dGluZ3MobWFpbFNldHRpbmdzLnVwZGF0ZU1haWxTZXR0aW5nc0NhbGxiYWNrKTtcblx0XHR9XG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBtYWlsU2V0dGluZ3MuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfW1haWwtc2V0dGluZ3Mvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFpbFNldHRpbmdzLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFpbFNldHRpbmdzLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBtYWlsU2V0dGluZ3MuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=