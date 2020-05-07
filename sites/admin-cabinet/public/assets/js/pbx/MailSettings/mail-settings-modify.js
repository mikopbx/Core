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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsibWFpbFNldHRpbmdzIiwiJGZvcm1PYmoiLCIkIiwiJGNoZWNrQm94ZXMiLCIkbWVudUl0ZW1zIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfVmFsaWRhdGVOYW1lRW1wdHkiLCJpbml0aWFsaXplIiwidGFiIiwiY2hlY2tib3giLCJpbml0aWFsaXplRm9ybSIsInVwZGF0ZU1haWxTZXR0aW5nc0NhbGxiYWNrIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJ0b1VwcGVyQ2FzZSIsImFmdGVyIiwibXNfVGVzdEVtYWlsU3ViamVjdCIsInRlc3RFbWFpbCIsImZvcm0iLCJsZW5ndGgiLCJwYXJhbXMiLCJlbWFpbCIsInN1YmplY3QiLCJib2R5IiwibXNfVGVzdEVtYWlsQm9keSIsImVuY29kZSIsIlBieEFwaSIsIlNlbmRUZXN0RW1haWwiLCJjYkFmdGVyRW1haWxTZW5kIiwibWVzc2FnZSIsIlVzZXJNZXNzYWdlIiwic2hvd0luZm9ybWF0aW9uIiwibXNfVGVzdEVtYWlsU2VudFN1Y2Nlc3NmdWxseSIsInNob3dFcnJvciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJzdWNjZXNzIiwiVXBkYXRlTWFpbFNldHRpbmdzIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsWUFBWSxHQUFHO0FBQ3BCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxxQkFBRCxDQURTO0FBRXBCQyxFQUFBQSxXQUFXLEVBQUVELENBQUMsQ0FBQywrQkFBRCxDQUZNO0FBR3BCRSxFQUFBQSxVQUFVLEVBQUVG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QUFDQU0sTUFBQUEsSUFBSSxDQUFDSCxlQUFMLEdBQXVCM0MsWUFBWSxDQUFDMkMsZUFBcEM7QUFDQUcsTUFBQUEsSUFBSSxDQUFDakMsVUFBTDtBQUNBOztBQTNEbUI7QUFBQTtBQUFBLENBQXJCO0FBOERBWCxDQUFDLENBQUMrQyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCbEQsRUFBQUEsWUFBWSxDQUFDYSxVQUFiO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBieEFwaSwgVXNlck1lc3NhZ2UgKi9cblxuY29uc3QgbWFpbFNldHRpbmdzID0ge1xuXHQkZm9ybU9iajogJCgnI21haWwtc2V0dGluZ3MtZm9ybScpLFxuXHQkY2hlY2tCb3hlczogJCgnI21haWwtc2V0dGluZ3MtZm9ybSAuY2hlY2tib3gnKSxcblx0JG1lbnVJdGVtczogJCgnI21haWwtc2V0dGluZ3MtbWVudSAuaXRlbScpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0bmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ25hbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVOYW1lRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0bWFpbFNldHRpbmdzLiRtZW51SXRlbXMudGFiKCk7XG5cdFx0bWFpbFNldHRpbmdzLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG5cdFx0bWFpbFNldHRpbmdzLmluaXRpYWxpemVGb3JtKCk7XG5cdH0sXG5cdHVwZGF0ZU1haWxTZXR0aW5nc0NhbGxiYWNrKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlLnJlc3VsdC50b1VwcGVyQ2FzZSgpID09PSAnU1VDQ0VTUycpIHtcblx0XHRcdG1haWxTZXR0aW5ncy4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpIHN1Y2Nlc3MgbWVzc2FnZSBhamF4XCI+JHtnbG9iYWxUcmFuc2xhdGUubXNfVGVzdEVtYWlsU3ViamVjdH08L2Rpdj5gKTtcblx0XHRcdGNvbnN0IHRlc3RFbWFpbCA9IG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJyk7XG5cdFx0XHRpZiAodGVzdEVtYWlsLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Y29uc3QgcGFyYW1zID0ge1xuXHRcdFx0XHRcdGVtYWlsOiB0ZXN0RW1haWwsXG5cdFx0XHRcdFx0c3ViamVjdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1Rlc3RFbWFpbFN1YmplY3QsXG5cdFx0XHRcdFx0Ym9keTogZ2xvYmFsVHJhbnNsYXRlLm1zX1Rlc3RFbWFpbEJvZHksXG5cdFx0XHRcdFx0ZW5jb2RlOiAnJyxcblx0XHRcdFx0fTtcblx0XHRcdFx0UGJ4QXBpLlNlbmRUZXN0RW1haWwocGFyYW1zLCBtYWlsU2V0dGluZ3MuY2JBZnRlckVtYWlsU2VuZCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHRjYkFmdGVyRW1haWxTZW5kKG1lc3NhZ2UpIHtcblx0XHRpZiAobWVzc2FnZSA9PT0gdHJ1ZSkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKGdsb2JhbFRyYW5zbGF0ZS5tc19UZXN0RW1haWxTZW50U3VjY2Vzc2Z1bGx5KTtcblx0XHR9IGVsc2UgaWYgKG1lc3NhZ2UubGVuZ3RoID4gMCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2UpO1xuXHRcdH1cblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZSkge1xuXHRcdFx0UGJ4QXBpLlVwZGF0ZU1haWxTZXR0aW5ncyhtYWlsU2V0dGluZ3MudXBkYXRlTWFpbFNldHRpbmdzQ2FsbGJhY2spO1xuXHRcdH1cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IG1haWxTZXR0aW5ncy4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9bWFpbC1zZXR0aW5ncy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBtYWlsU2V0dGluZ3MudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBtYWlsU2V0dGluZ3MuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG1haWxTZXR0aW5ncy5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdG1haWxTZXR0aW5ncy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==