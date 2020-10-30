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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsibWFpbFNldHRpbmdzIiwiJGZvcm1PYmoiLCIkIiwiJGNoZWNrQm94ZXMiLCIkbWVudUl0ZW1zIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfVmFsaWRhdGVOYW1lRW1wdHkiLCJpbml0aWFsaXplIiwidGFiIiwiY2hlY2tib3giLCJpbml0aWFsaXplRm9ybSIsInVwZGF0ZU1haWxTZXR0aW5nc0NhbGxiYWNrIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJhZnRlciIsIm1zX1Rlc3RFbWFpbFN1YmplY3QiLCJ0ZXN0RW1haWwiLCJmb3JtIiwibGVuZ3RoIiwicGFyYW1zIiwiZW1haWwiLCJzdWJqZWN0IiwiYm9keSIsIm1zX1Rlc3RFbWFpbEJvZHkiLCJlbmNvZGUiLCJQYnhBcGkiLCJTZW5kVGVzdEVtYWlsIiwiY2JBZnRlckVtYWlsU2VuZCIsIm1lc3NhZ2UiLCJVc2VyTWVzc2FnZSIsInNob3dJbmZvcm1hdGlvbiIsIm1zX1Rlc3RFbWFpbFNlbnRTdWNjZXNzZnVsbHkiLCJzaG93TXVsdGlTdHJpbmciLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJkYXRhIiwiY2JBZnRlclNlbmRGb3JtIiwic3VjY2VzcyIsIlVwZGF0ZU1haWxTZXR0aW5ncyIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLFlBQVksR0FBRztBQUNwQkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FEUztBQUVwQkMsRUFBQUEsV0FBVyxFQUFFRCxDQUFDLENBQUMsK0JBQUQsQ0FGTTtBQUdwQkUsRUFBQUEsVUFBVSxFQUFFRixDQUFDLENB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SCxlQUFMLEdBQXVCMUMsWUFBWSxDQUFDMEMsZUFBcEM7QUFDQUcsTUFBQUEsSUFBSSxDQUFDaEMsVUFBTDtBQUNBOztBQTNEbUI7QUFBQTtBQUFBLENBQXJCO0FBOERBWCxDQUFDLENBQUM4QyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCakQsRUFBQUEsWUFBWSxDQUFDYSxVQUFiO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBieEFwaSwgVXNlck1lc3NhZ2UgKi9cblxuY29uc3QgbWFpbFNldHRpbmdzID0ge1xuXHQkZm9ybU9iajogJCgnI21haWwtc2V0dGluZ3MtZm9ybScpLFxuXHQkY2hlY2tCb3hlczogJCgnI21haWwtc2V0dGluZ3MtZm9ybSAuY2hlY2tib3gnKSxcblx0JG1lbnVJdGVtczogJCgnI21haWwtc2V0dGluZ3MtbWVudSAuaXRlbScpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0bmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ25hbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVOYW1lRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0bWFpbFNldHRpbmdzLiRtZW51SXRlbXMudGFiKCk7XG5cdFx0bWFpbFNldHRpbmdzLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG5cdFx0bWFpbFNldHRpbmdzLmluaXRpYWxpemVGb3JtKCk7XG5cdH0sXG5cdHVwZGF0ZU1haWxTZXR0aW5nc0NhbGxiYWNrKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuXHRcdFx0bWFpbFNldHRpbmdzLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgc3VjY2VzcyBtZXNzYWdlIGFqYXhcIj4ke2dsb2JhbFRyYW5zbGF0ZS5tc19UZXN0RW1haWxTdWJqZWN0fTwvZGl2PmApO1xuXHRcdFx0Y29uc3QgdGVzdEVtYWlsID0gbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnKTtcblx0XHRcdGlmICh0ZXN0RW1haWwubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRjb25zdCBwYXJhbXMgPSB7XG5cdFx0XHRcdFx0ZW1haWw6IHRlc3RFbWFpbCxcblx0XHRcdFx0XHRzdWJqZWN0OiBnbG9iYWxUcmFuc2xhdGUubXNfVGVzdEVtYWlsU3ViamVjdCxcblx0XHRcdFx0XHRib2R5OiBnbG9iYWxUcmFuc2xhdGUubXNfVGVzdEVtYWlsQm9keSxcblx0XHRcdFx0XHRlbmNvZGU6ICcnLFxuXHRcdFx0XHR9O1xuXHRcdFx0XHRQYnhBcGkuU2VuZFRlc3RFbWFpbChwYXJhbXMsIG1haWxTZXR0aW5ncy5jYkFmdGVyRW1haWxTZW5kKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdGNiQWZ0ZXJFbWFpbFNlbmQobWVzc2FnZSkge1xuXHRcdGlmIChtZXNzYWdlID09PSB0cnVlKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24oZ2xvYmFsVHJhbnNsYXRlLm1zX1Rlc3RFbWFpbFNlbnRTdWNjZXNzZnVsbHkpO1xuXHRcdH0gZWxzZSBpZiAobWVzc2FnZS5sZW5ndGggPiAwKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcobWVzc2FnZSk7XG5cdFx0fVxuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5zdWNjZXNzID09PSB0cnVlKSB7XG5cdFx0XHRQYnhBcGkuVXBkYXRlTWFpbFNldHRpbmdzKG1haWxTZXR0aW5ncy51cGRhdGVNYWlsU2V0dGluZ3NDYWxsYmFjayk7XG5cdFx0fVxuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gbWFpbFNldHRpbmdzLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1tYWlsLXNldHRpbmdzL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IG1haWxTZXR0aW5ncy52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG1haWxTZXR0aW5ncy5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbWFpbFNldHRpbmdzLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0bWFpbFNldHRpbmdzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19