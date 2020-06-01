"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate,Form */
var loginForm = {
  $formObj: $('#login-form'),
  $submitButton: $('#submitbutton'),
  validateRules: {
    login: {
      identifier: 'login',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.auth_ValidateLoginNotEmpty
      }]
    },
    password: {
      identifier: 'password',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.auth_ValidatePasswordNotEmpty
      }]
    }
  },
  initialize: function () {
    function initialize() {
      loginForm.initializeForm();
      $('input').on('input', function () {
        $('.message.ajax').remove();
      });
    }

    return initialize;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = loginForm.$formObj.form('get values');
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {}

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = loginForm.$formObj;
      Form.url = "".concat(globalRootUrl, "session/start");
      Form.validateRules = loginForm.validateRules;
      Form.cbBeforeSendForm = loginForm.cbBeforeSendForm;
      Form.cbAfterSendForm = loginForm.cbAfterSendForm;
      Form.keyboardShortcuts = false;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  loginForm.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZXNzaW9uL2xvZ2luLWZvcm0uanMiXSwibmFtZXMiOlsibG9naW5Gb3JtIiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJsb2dpbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhdXRoX1ZhbGlkYXRlTG9naW5Ob3RFbXB0eSIsInBhc3N3b3JkIiwiYXV0aF9WYWxpZGF0ZVBhc3N3b3JkTm90RW1wdHkiLCJpbml0aWFsaXplIiwiaW5pdGlhbGl6ZUZvcm0iLCJvbiIsInJlbW92ZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImRhdGEiLCJmb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJrZXlib2FyZFNob3J0Y3V0cyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSxTQUFTLEdBQUc7QUFDakJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGFBQUQsQ0FETTtBQUVqQkMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsZUFBRCxDQUZDO0FBR2pCRSxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsS0FBSyxFQUFFO0FBQ05DLE1BQUFBLFVBQVUsRUFBRSxPQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NDLFFBQUFBLElBQUksRUFBRSxPQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUZ6QixPQURNO0FBRkQsS0FETztBQVVkQyxJQUFBQSxRQUFRLEVBQUU7QUFDVE4sTUFBQUEsVUFBVSxFQUFFLFVBREg7QUFFVEMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ0MsUUFBQUEsSUFBSSxFQUFFLE9BRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRnpCLE9BRE07QUFGRTtBQVZJLEdBSEU7QUF1QmpCQyxFQUFBQSxVQXZCaUI7QUFBQSwwQkF1Qko7QUFDWmQsTUFBQUEsU0FBUyxDQUFDZSxjQUFWO0FBQ0FiLE1BQUFBLENBQUMsQ0FBQyxPQUFELENBQUQsQ0FBV2MsRUFBWCxDQUFjLE9BQWQsRUFBdUIsWUFBTTtBQUM1QmQsUUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQmUsTUFBbkI7QUFDQSxPQUZEO0FBR0E7O0FBNUJnQjtBQUFBO0FBNkJqQkMsRUFBQUEsZ0JBN0JpQjtBQUFBLDhCQTZCQUMsUUE3QkEsRUE2QlU7QUFDMUIsVUFBTUMsTUFBTSxHQUFHRCxRQUFmO0FBQ0FDLE1BQUFBLE1BQU0sQ0FBQ0MsSUFBUCxHQUFjckIsU0FBUyxDQUFDQyxRQUFWLENBQW1CcUIsSUFBbkIsQ0FBd0IsWUFBeEIsQ0FBZDtBQUNBLGFBQU9GLE1BQVA7QUFDQTs7QUFqQ2dCO0FBQUE7QUFrQ2pCRyxFQUFBQSxlQWxDaUI7QUFBQSwrQkFrQ0MsQ0FFakI7O0FBcENnQjtBQUFBO0FBcUNqQlIsRUFBQUEsY0FyQ2lCO0FBQUEsOEJBcUNBO0FBQ2hCUyxNQUFBQSxJQUFJLENBQUN2QixRQUFMLEdBQWdCRCxTQUFTLENBQUNDLFFBQTFCO0FBQ0F1QixNQUFBQSxJQUFJLENBQUNDLEdBQUwsYUFBY0MsYUFBZDtBQUNBRixNQUFBQSxJQUFJLENBQUNwQixhQUFMLEdBQXFCSixTQUFTLENBQUNJLGFBQS9CO0FBQ0FvQixNQUFBQSxJQUFJLENBQUNOLGdCQUFMLEdBQXdCbEIsU0FBUyxDQUFDa0IsZ0JBQWxDO0FBQ0FNLE1BQUFBLElBQUksQ0FBQ0QsZUFBTCxHQUF1QnZCLFNBQVMsQ0FBQ3VCLGVBQWpDO0FBQ0FDLE1BQUFBLElBQUksQ0FBQ0csaUJBQUwsR0FBeUIsS0FBekI7QUFDQUgsTUFBQUEsSUFBSSxDQUFDVixVQUFMO0FBQ0E7O0FBN0NnQjtBQUFBO0FBQUEsQ0FBbEI7QUFnREFaLENBQUMsQ0FBQzBCLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkI3QixFQUFBQSxTQUFTLENBQUNjLFVBQVY7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSxGb3JtICovXG5cbmNvbnN0IGxvZ2luRm9ybSA9IHtcblx0JGZvcm1PYmo6ICQoJyNsb2dpbi1mb3JtJyksXG5cdCRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdGxvZ2luOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbG9naW4nLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYXV0aF9WYWxpZGF0ZUxvZ2luTm90RW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0cGFzc3dvcmQ6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdwYXNzd29yZCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hdXRoX1ZhbGlkYXRlUGFzc3dvcmROb3RFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRsb2dpbkZvcm0uaW5pdGlhbGl6ZUZvcm0oKTtcblx0XHQkKCdpbnB1dCcpLm9uKCdpbnB1dCcsICgpID0+IHtcblx0XHRcdCQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblx0XHR9KTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gbG9naW5Gb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGxvZ2luRm9ybS4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9zdGFydGA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gbG9naW5Gb3JtLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbG9naW5Gb3JtLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBsb2dpbkZvcm0uY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0ua2V5Ym9hcmRTaG9ydGN1dHMgPSBmYWxzZTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0bG9naW5Gb3JtLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=