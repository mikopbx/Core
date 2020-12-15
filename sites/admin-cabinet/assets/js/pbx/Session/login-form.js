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
      $('input').keyup(function (event) {
        if (event.keyCode === 13) {
          loginForm.$submitButton.click();
        }
      }).on('input', function () {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZXNzaW9uL2xvZ2luLWZvcm0uanMiXSwibmFtZXMiOlsibG9naW5Gb3JtIiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJsb2dpbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhdXRoX1ZhbGlkYXRlTG9naW5Ob3RFbXB0eSIsInBhc3N3b3JkIiwiYXV0aF9WYWxpZGF0ZVBhc3N3b3JkTm90RW1wdHkiLCJpbml0aWFsaXplIiwiaW5pdGlhbGl6ZUZvcm0iLCJrZXl1cCIsImV2ZW50Iiwia2V5Q29kZSIsImNsaWNrIiwib24iLCJyZW1vdmUiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiZm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkE7QUFFQSxJQUFNQSxTQUFTLEdBQUc7QUFDakJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGFBQUQsQ0FETTtBQUVqQkMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsZUFBRCxDQUZDO0FBR2pCRSxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsS0FBSyxFQUFFO0FBQ05DLE1BQUFBLFVBQVUsRUFBRSxPQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NDLFFBQUFBLElBQUksRUFBRSxPQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUZ6QixPQURNO0FBRkQsS0FETztBQVVkQyxJQUFBQSxRQUFRLEVBQUU7QUFDVE4sTUFBQUEsVUFBVSxFQUFFLFVBREg7QUFFVEMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ0MsUUFBQUEsSUFBSSxFQUFFLE9BRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRnpCLE9BRE07QUFGRTtBQVZJLEdBSEU7QUF1QmpCQyxFQUFBQSxVQXZCaUI7QUFBQSwwQkF1Qko7QUFDWmQsTUFBQUEsU0FBUyxDQUFDZSxjQUFWO0FBQ0FiLE1BQUFBLENBQUMsQ0FBQyxPQUFELENBQUQsQ0FDRWMsS0FERixDQUNRLFVBQUNDLEtBQUQsRUFBVTtBQUNqQixZQUFJQSxLQUFLLENBQUNDLE9BQU4sS0FBa0IsRUFBdEIsRUFBMEI7QUFDekJsQixVQUFBQSxTQUFTLENBQUNHLGFBQVYsQ0FBd0JnQixLQUF4QjtBQUNBO0FBQ0QsT0FMRCxFQU1FQyxFQU5GLENBTUssT0FOTCxFQU1jLFlBQU07QUFDbkJsQixRQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CbUIsTUFBbkI7QUFDQSxPQVJEO0FBU0E7O0FBbENnQjtBQUFBO0FBbUNqQkMsRUFBQUEsZ0JBbkNpQjtBQUFBLDhCQW1DQUMsUUFuQ0EsRUFtQ1U7QUFDMUIsVUFBTUMsTUFBTSxHQUFHRCxRQUFmO0FBQ0FDLE1BQUFBLE1BQU0sQ0FBQ0MsSUFBUCxHQUFjekIsU0FBUyxDQUFDQyxRQUFWLENBQW1CeUIsSUFBbkIsQ0FBd0IsWUFBeEIsQ0FBZDtBQUNBLGFBQU9GLE1BQVA7QUFDQTs7QUF2Q2dCO0FBQUE7QUF3Q2pCRyxFQUFBQSxlQXhDaUI7QUFBQSwrQkF3Q0MsQ0FFakI7O0FBMUNnQjtBQUFBO0FBMkNqQlosRUFBQUEsY0EzQ2lCO0FBQUEsOEJBMkNBO0FBQ2hCYSxNQUFBQSxJQUFJLENBQUMzQixRQUFMLEdBQWdCRCxTQUFTLENBQUNDLFFBQTFCO0FBQ0EyQixNQUFBQSxJQUFJLENBQUNDLEdBQUwsYUFBY0MsYUFBZDtBQUNBRixNQUFBQSxJQUFJLENBQUN4QixhQUFMLEdBQXFCSixTQUFTLENBQUNJLGFBQS9CO0FBQ0F3QixNQUFBQSxJQUFJLENBQUNOLGdCQUFMLEdBQXdCdEIsU0FBUyxDQUFDc0IsZ0JBQWxDO0FBQ0FNLE1BQUFBLElBQUksQ0FBQ0QsZUFBTCxHQUF1QjNCLFNBQVMsQ0FBQzJCLGVBQWpDO0FBQ0FDLE1BQUFBLElBQUksQ0FBQ0csaUJBQUwsR0FBeUIsS0FBekI7QUFDQUgsTUFBQUEsSUFBSSxDQUFDZCxVQUFMO0FBQ0E7O0FBbkRnQjtBQUFBO0FBQUEsQ0FBbEI7QUFzREFaLENBQUMsQ0FBQzhCLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJqQyxFQUFBQSxTQUFTLENBQUNjLFVBQVY7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSxGb3JtICovXG5cbmNvbnN0IGxvZ2luRm9ybSA9IHtcblx0JGZvcm1PYmo6ICQoJyNsb2dpbi1mb3JtJyksXG5cdCRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdGxvZ2luOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbG9naW4nLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYXV0aF9WYWxpZGF0ZUxvZ2luTm90RW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0cGFzc3dvcmQ6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdwYXNzd29yZCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hdXRoX1ZhbGlkYXRlUGFzc3dvcmROb3RFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRsb2dpbkZvcm0uaW5pdGlhbGl6ZUZvcm0oKTtcblx0XHQkKCdpbnB1dCcpXG5cdFx0XHQua2V5dXAoKGV2ZW50KT0+IHtcblx0XHRcdGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xuXHRcdFx0XHRsb2dpbkZvcm0uJHN1Ym1pdEJ1dHRvbi5jbGljaygpO1xuXHRcdFx0fVxuXHRcdH0pXG5cdFx0XHQub24oJ2lucHV0JywgKCkgPT4ge1xuXHRcdFx0JCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXHRcdH0pO1xuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBsb2dpbkZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblxuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gbG9naW5Gb3JtLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL3N0YXJ0YDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBsb2dpbkZvcm0udmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBsb2dpbkZvcm0uY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGxvZ2luRm9ybS5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5rZXlib2FyZFNob3J0Y3V0cyA9IGZhbHNlO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRsb2dpbkZvcm0uaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==