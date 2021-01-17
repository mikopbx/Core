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
  $checkBoxes: $('.checkbox'),
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
      loginForm.$checkBoxes.checkbox();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZXNzaW9uL2xvZ2luLWZvcm0uanMiXSwibmFtZXMiOlsibG9naW5Gb3JtIiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsIiRjaGVja0JveGVzIiwidmFsaWRhdGVSdWxlcyIsImxvZ2luIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImF1dGhfVmFsaWRhdGVMb2dpbk5vdEVtcHR5IiwicGFzc3dvcmQiLCJhdXRoX1ZhbGlkYXRlUGFzc3dvcmROb3RFbXB0eSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRm9ybSIsImtleXVwIiwiZXZlbnQiLCJrZXlDb2RlIiwiY2xpY2siLCJvbiIsInJlbW92ZSIsImNoZWNrYm94IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImtleWJvYXJkU2hvcnRjdXRzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBO0FBRUEsSUFBTUEsU0FBUyxHQUFHO0FBQ2pCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxhQUFELENBRE07QUFFakJDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLGVBQUQsQ0FGQztBQUdqQkUsRUFBQUEsV0FBVyxFQUFFRixDQUFDLENBQUMsV0FBRCxDQUhHO0FBSWpCRyxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsS0FBSyxFQUFFO0FBQ05DLE1BQUFBLFVBQVUsRUFBRSxPQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NDLFFBQUFBLElBQUksRUFBRSxPQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUZ6QixPQURNO0FBRkQsS0FETztBQVVkQyxJQUFBQSxRQUFRLEVBQUU7QUFDVE4sTUFBQUEsVUFBVSxFQUFFLFVBREg7QUFFVEMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ0MsUUFBQUEsSUFBSSxFQUFFLE9BRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRnpCLE9BRE07QUFGRTtBQVZJLEdBSkU7QUF3QmpCQyxFQUFBQSxVQXhCaUI7QUFBQSwwQkF3Qko7QUFDWmYsTUFBQUEsU0FBUyxDQUFDZ0IsY0FBVjtBQUNBZCxNQUFBQSxDQUFDLENBQUMsT0FBRCxDQUFELENBQ0VlLEtBREYsQ0FDUSxVQUFDQyxLQUFELEVBQVU7QUFDakIsWUFBSUEsS0FBSyxDQUFDQyxPQUFOLEtBQWtCLEVBQXRCLEVBQTBCO0FBQ3pCbkIsVUFBQUEsU0FBUyxDQUFDRyxhQUFWLENBQXdCaUIsS0FBeEI7QUFDQTtBQUNELE9BTEQsRUFNRUMsRUFORixDQU1LLE9BTkwsRUFNYyxZQUFNO0FBQ25CbkIsUUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQm9CLE1BQW5CO0FBQ0EsT0FSRDtBQVNBdEIsTUFBQUEsU0FBUyxDQUFDSSxXQUFWLENBQXNCbUIsUUFBdEI7QUFDQTs7QUFwQ2dCO0FBQUE7QUFxQ2pCQyxFQUFBQSxnQkFyQ2lCO0FBQUEsOEJBcUNBQyxRQXJDQSxFQXFDVTtBQUMxQixVQUFNQyxNQUFNLEdBQUdELFFBQWY7QUFDQUMsTUFBQUEsTUFBTSxDQUFDQyxJQUFQLEdBQWMzQixTQUFTLENBQUNDLFFBQVYsQ0FBbUIyQixJQUFuQixDQUF3QixZQUF4QixDQUFkO0FBQ0EsYUFBT0YsTUFBUDtBQUNBOztBQXpDZ0I7QUFBQTtBQTBDakJHLEVBQUFBLGVBMUNpQjtBQUFBLCtCQTBDQyxDQUVqQjs7QUE1Q2dCO0FBQUE7QUE2Q2pCYixFQUFBQSxjQTdDaUI7QUFBQSw4QkE2Q0E7QUFDaEJjLE1BQUFBLElBQUksQ0FBQzdCLFFBQUwsR0FBZ0JELFNBQVMsQ0FBQ0MsUUFBMUI7QUFDQTZCLE1BQUFBLElBQUksQ0FBQ0MsR0FBTCxhQUFjQyxhQUFkO0FBQ0FGLE1BQUFBLElBQUksQ0FBQ3pCLGFBQUwsR0FBcUJMLFNBQVMsQ0FBQ0ssYUFBL0I7QUFDQXlCLE1BQUFBLElBQUksQ0FBQ04sZ0JBQUwsR0FBd0J4QixTQUFTLENBQUN3QixnQkFBbEM7QUFDQU0sTUFBQUEsSUFBSSxDQUFDRCxlQUFMLEdBQXVCN0IsU0FBUyxDQUFDNkIsZUFBakM7QUFDQUMsTUFBQUEsSUFBSSxDQUFDRyxpQkFBTCxHQUF5QixLQUF6QjtBQUNBSCxNQUFBQSxJQUFJLENBQUNmLFVBQUw7QUFDQTs7QUFyRGdCO0FBQUE7QUFBQSxDQUFsQjtBQXdEQWIsQ0FBQyxDQUFDZ0MsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2Qm5DLEVBQUFBLFNBQVMsQ0FBQ2UsVUFBVjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLEZvcm0gKi9cblxuY29uc3QgbG9naW5Gb3JtID0ge1xuXHQkZm9ybU9iajogJCgnI2xvZ2luLWZvcm0nKSxcblx0JHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXHQkY2hlY2tCb3hlczogJCgnLmNoZWNrYm94JyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRsb2dpbjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2xvZ2luJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmF1dGhfVmFsaWRhdGVMb2dpbk5vdEVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHBhc3N3b3JkOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAncGFzc3dvcmQnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYXV0aF9WYWxpZGF0ZVBhc3N3b3JkTm90RW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0bG9naW5Gb3JtLmluaXRpYWxpemVGb3JtKCk7XG5cdFx0JCgnaW5wdXQnKVxuXHRcdFx0LmtleXVwKChldmVudCk9PiB7XG5cdFx0XHRpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcblx0XHRcdFx0bG9naW5Gb3JtLiRzdWJtaXRCdXR0b24uY2xpY2soKTtcblx0XHRcdH1cblx0XHR9KVxuXHRcdFx0Lm9uKCdpbnB1dCcsICgpID0+IHtcblx0XHRcdCQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblx0XHR9KTtcblx0XHRsb2dpbkZvcm0uJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gbG9naW5Gb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGxvZ2luRm9ybS4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9zdGFydGA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gbG9naW5Gb3JtLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbG9naW5Gb3JtLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBsb2dpbkZvcm0uY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0ua2V5Ym9hcmRTaG9ydGN1dHMgPSBmYWxzZTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0bG9naW5Gb3JtLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=