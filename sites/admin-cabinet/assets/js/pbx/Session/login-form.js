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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZXNzaW9uL2xvZ2luLWZvcm0uanMiXSwibmFtZXMiOlsibG9naW5Gb3JtIiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJsb2dpbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhdXRoX1ZhbGlkYXRlTG9naW5Ob3RFbXB0eSIsInBhc3N3b3JkIiwiYXV0aF9WYWxpZGF0ZVBhc3N3b3JkTm90RW1wdHkiLCJpbml0aWFsaXplIiwiaW5pdGlhbGl6ZUZvcm0iLCJrZXl1cCIsImV2ZW50Iiwia2V5Q29kZSIsImNsaWNrIiwib24iLCJyZW1vdmUiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiZm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsU0FBUyxHQUFHO0FBQ2pCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxhQUFELENBRE07QUFFakJDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLGVBQUQsQ0FGQztBQUdqQkUsRUFBQUEsYUFBYSxFQUFFO0FBQ2RDLElBQUFBLEtBQUssRUFBRTtBQUNOQyxNQUFBQSxVQUFVLEVBQUUsT0FETjtBQUVOQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDQyxRQUFBQSxJQUFJLEVBQUUsT0FEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGekIsT0FETTtBQUZELEtBRE87QUFVZEMsSUFBQUEsUUFBUSxFQUFFO0FBQ1ROLE1BQUFBLFVBQVUsRUFBRSxVQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NDLFFBQUFBLElBQUksRUFBRSxPQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRztBQUZ6QixPQURNO0FBRkU7QUFWSSxHQUhFO0FBdUJqQkMsRUFBQUEsVUF2QmlCO0FBQUEsMEJBdUJKO0FBQ1pkLE1BQUFBLFNBQVMsQ0FBQ2UsY0FBVjtBQUNBYixNQUFBQSxDQUFDLENBQUMsT0FBRCxDQUFELENBQ0VjLEtBREYsQ0FDUSxVQUFDQyxLQUFELEVBQVU7QUFDakIsWUFBSUEsS0FBSyxDQUFDQyxPQUFOLEtBQWtCLEVBQXRCLEVBQTBCO0FBQ3pCbEIsVUFBQUEsU0FBUyxDQUFDRyxhQUFWLENBQXdCZ0IsS0FBeEI7QUFDQTtBQUNELE9BTEQsRUFNRUMsRUFORixDQU1LLE9BTkwsRUFNYyxZQUFNO0FBQ25CbEIsUUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQm1CLE1BQW5CO0FBQ0EsT0FSRDtBQVNBOztBQWxDZ0I7QUFBQTtBQW1DakJDLEVBQUFBLGdCQW5DaUI7QUFBQSw4QkFtQ0FDLFFBbkNBLEVBbUNVO0FBQzFCLFVBQU1DLE1BQU0sR0FBR0QsUUFBZjtBQUNBQyxNQUFBQSxNQUFNLENBQUNDLElBQVAsR0FBY3pCLFNBQVMsQ0FBQ0MsUUFBVixDQUFtQnlCLElBQW5CLENBQXdCLFlBQXhCLENBQWQ7QUFDQSxhQUFPRixNQUFQO0FBQ0E7O0FBdkNnQjtBQUFBO0FBd0NqQkcsRUFBQUEsZUF4Q2lCO0FBQUEsK0JBd0NDLENBRWpCOztBQTFDZ0I7QUFBQTtBQTJDakJaLEVBQUFBLGNBM0NpQjtBQUFBLDhCQTJDQTtBQUNoQmEsTUFBQUEsSUFBSSxDQUFDM0IsUUFBTCxHQUFnQkQsU0FBUyxDQUFDQyxRQUExQjtBQUNBMkIsTUFBQUEsSUFBSSxDQUFDQyxHQUFMLGFBQWNDLGFBQWQ7QUFDQUYsTUFBQUEsSUFBSSxDQUFDeEIsYUFBTCxHQUFxQkosU0FBUyxDQUFDSSxhQUEvQjtBQUNBd0IsTUFBQUEsSUFBSSxDQUFDTixnQkFBTCxHQUF3QnRCLFNBQVMsQ0FBQ3NCLGdCQUFsQztBQUNBTSxNQUFBQSxJQUFJLENBQUNELGVBQUwsR0FBdUIzQixTQUFTLENBQUMyQixlQUFqQztBQUNBQyxNQUFBQSxJQUFJLENBQUNHLGlCQUFMLEdBQXlCLEtBQXpCO0FBQ0FILE1BQUFBLElBQUksQ0FBQ2QsVUFBTDtBQUNBOztBQW5EZ0I7QUFBQTtBQUFBLENBQWxCO0FBc0RBWixDQUFDLENBQUM4QixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCakMsRUFBQUEsU0FBUyxDQUFDYyxVQUFWO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsRm9ybSAqL1xuXG5jb25zdCBsb2dpbkZvcm0gPSB7XG5cdCRmb3JtT2JqOiAkKCcjbG9naW4tZm9ybScpLFxuXHQkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRsb2dpbjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2xvZ2luJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmF1dGhfVmFsaWRhdGVMb2dpbk5vdEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHBhc3N3b3JkOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAncGFzc3dvcmQnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYXV0aF9WYWxpZGF0ZVBhc3N3b3JkTm90RW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0bG9naW5Gb3JtLmluaXRpYWxpemVGb3JtKCk7XG5cdFx0JCgnaW5wdXQnKVxuXHRcdFx0LmtleXVwKChldmVudCk9PiB7XG5cdFx0XHRpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcblx0XHRcdFx0bG9naW5Gb3JtLiRzdWJtaXRCdXR0b24uY2xpY2soKTtcblx0XHRcdH1cblx0XHR9KVxuXHRcdFx0Lm9uKCdpbnB1dCcsICgpID0+IHtcblx0XHRcdCQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblx0XHR9KTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gbG9naW5Gb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGxvZ2luRm9ybS4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9zdGFydGA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gbG9naW5Gb3JtLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbG9naW5Gb3JtLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBsb2dpbkZvcm0uY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0ua2V5Ym9hcmRTaG9ydGN1dHMgPSBmYWxzZTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0bG9naW5Gb3JtLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=