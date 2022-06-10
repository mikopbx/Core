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

/* global globalRootUrl, globalWebAdminLanguage, sessionStorage, $, globalTranslate */
var advicesWorker = {
  timeOut: 300000,
  timeOutHandle: '',
  $advices: $('#advices'),
  $advicesBellButton: $('#show-advices-button'),
  initialize: function initialize() {
    advicesWorker.showPreviousAdvice(); // Запустим получение новых советов

    advicesWorker.restartWorker();
    window.addEventListener('ConfigDataChanged', advicesWorker.cbOnDataChanged);
    $('#updatePasswordWindow #savePassword').on('click', advicesWorker.cbOnClickSavePassword);
  },
  restartWorker: function restartWorker() {
    window.clearTimeout(advicesWorker.timeoutHandle);
    advicesWorker.worker();
  },

  /**
   * Отправка формы обновления паролей SSH и Web.
   */
  cbOnClickSavePassword: function cbOnClickSavePassword() {
    $('#updatePasswordWindowResult').hide();
    var errors = '';
    var params = {};
    $.each(['WebAdminPassword', 'SSHPassword'], function (key, value) {
      if (!$("#updatePasswordWindow #".concat(value)).is(":visible")) {
        return;
      }

      var pass = $("#".concat(value)).val();
      var passRep = $("#".concat(value, "Repeat")).val();

      if (pass !== passRep) {
        errors += '<li>' + globalTranslate["pass_Check".concat(value, "DontMatch")] + '</li>';
      } else if (pass.trim() === '') {
        errors += '<li>' + globalTranslate["pass_Check".concat(value, "Empty")] + '</li>';
      } else if (advicesWorker.checkPasswordOk(pass)) {
        errors += "<li>".concat(globalTranslate['pass_Check${value}Simple'], "</li>");
      } else {
        params[value] = pass;
      }
    });

    if (errors.trim() !== '') {
      errors = "<ul class=\"ui list\">".concat(errors, "</ul>");
      advicesWorker.showPasswordError(globalTranslate['pass_CheckWebPassErrorChange'], errors);
    } else {
      advicesWorker.savePasswords(params);
    }
  },
  savePasswords: function savePasswords(params) {
    $.post('/admin-cabinet/general-settings/save', params, function (data) {
      if (data.success === false) {
        var errors = '';

        if (typeof data.passwordCheckFail !== 'undefined') {
          $.each(data.passwordCheckFail, function (key, value) {
            errors += '<li>' + globalTranslate["pass_Check".concat(value, "Simple")] + '</li>';
          });
        } else {
          errors += '<li>' + globalTranslate['er_InternalServerError'] + '</li>';
        }

        if (errors.trim() !== '') {
          advicesWorker.showPasswordError(globalTranslate['pass_CheckWebPassErrorChange'], errors);
        }
      } else {
        $('#updatePasswordWindow').modal({
          closable: false
        }).modal('hide');
        advicesWorker.restartWorker();
      }
    });
  },
  showPasswordError: function showPasswordError(header, body) {
    $('#updatePasswordWindowResult div').html(header);
    $('#updatePasswordWindowResult p').html(body);
    $('#updatePasswordWindowResult').show();
  },
  checkPasswordOk: function checkPasswordOk(password) {
    var check1 = password.match(/[a-z]/) !== null;
    var check2 = password.match(/\d/) !== null;
    var check3 = password.match(/[A-Z]/) !== null;
    return check1 && check2 && check3 && password.length > 6;
  },

  /**
   * Обработка события смены языка или данных
   */
  cbOnDataChanged: function cbOnDataChanged() {
    sessionStorage.removeItem("previousAdvice".concat(globalWebAdminLanguage));
    sessionStorage.removeItem("previousAdviceBell".concat(globalWebAdminLanguage));
    setTimeout(advicesWorker.restartWorker, 3000);
  },

  /**
   * Показывает старые советы до получения обвноления со станции
   */
  showPreviousAdvice: function showPreviousAdvice() {
    var previousAdviceBell = sessionStorage.getItem("previousAdviceBell".concat(globalWebAdminLanguage));

    if (previousAdviceBell !== undefined) {
      advicesWorker.$advicesBellButton.html(previousAdviceBell);
    }

    var previousAdvice = sessionStorage.getItem("previousAdvice".concat(globalWebAdminLanguage));

    if (previousAdvice !== undefined) {
      advicesWorker.$advices.html(previousAdvice);
    }
  },
  worker: function worker() {
    PbxApi.AdvicesGetList(advicesWorker.cbAfterResponse);
  },
  cbAfterResponse: function cbAfterResponse(response) {
    if (response === false) {
      return;
    }

    advicesWorker.$advices.html('');

    if (response.advices !== undefined) {
      var htmlMessages = '';
      var countMessages = 0;
      var iconBellClass = '';
      htmlMessages += '<div class="ui relaxed divided list">';

      if (response.advices.needUpdate !== undefined && response.advices.needUpdate.length > 0) {
        var needShow = false;
        $("#updatePasswordWindow div.miko-settings-container").hide();
        $.each(response.advices.needUpdate, function (key, value) {
          $("#updatePasswordWindow #".concat(value, "-container")).show();
          needShow = true;
        });

        if (needShow) {
          $('#updatePasswordWindow').modal({
            closable: false
          }).modal('show');
        }
      }

      if (response.advices.error !== undefined && response.advices.error.length > 0) {
        $.each(response.advices.error, function (key, value) {
          htmlMessages += '<div class="item">';
          htmlMessages += '<i class="frown outline red icon"></i>';
          htmlMessages += '<div class="content">';
          htmlMessages += "<div class=\"ui small red header\">".concat(value, "</div>");
          htmlMessages += '</div>';
          htmlMessages += '</div>';
          countMessages += 1;
        });
      }

      if (response.advices.warning !== undefined && response.advices.warning.length > 0) {
        $.each(response.advices.warning, function (key, value) {
          htmlMessages += '<div class="item">';
          htmlMessages += '<i class="meh outline yellow icon"></i>';
          htmlMessages += '<div class="content">';
          htmlMessages += "<div class=\"ui small header\">".concat(value, "</div>");
          htmlMessages += '</div>';
          htmlMessages += '</div>';
          countMessages += 1;
        });
      }

      if (response.advices.info !== undefined && response.advices.info.length > 0) {
        $.each(response.advices.info, function (key, value) {
          htmlMessages += '<div class="item">';
          htmlMessages += '<i class="smile outline blue icon"></i>';
          htmlMessages += '<div class="content">';
          htmlMessages += "<div class=\"ui small header\">".concat(value, "</div>");
          htmlMessages += '</div>';
          htmlMessages += '</div>';
          countMessages += 1;
        });
      }

      if (response.advices.error !== undefined && response.advices.error.length > 0) {
        iconBellClass = 'red large icon bell';
      } else if (response.advices.warning !== undefined && response.advices.warning.length > 0) {
        iconBellClass = 'yellow icon bell';
      } else if (response.advices.info !== undefined && response.advices.info.length > 0) {
        iconBellClass = 'blue icon bell';
      }

      htmlMessages += '</div>';
      advicesWorker.$advices.html(htmlMessages);
      sessionStorage.setItem("previousAdvice".concat(globalWebAdminLanguage), htmlMessages);

      if (countMessages > 0) {
        advicesWorker.$advicesBellButton.html("<i class=\"".concat(iconBellClass, "\"></i>").concat(countMessages)).popup({
          position: 'bottom left',
          popup: advicesWorker.$advices,
          delay: {
            show: 300,
            hide: 10000
          }
        });
        advicesWorker.$advicesBellButton.find('i').transition('set looping').transition('pulse', '1000ms');
      } else {
        advicesWorker.$advicesBellButton.html("<i class=\"grey icon bell\"></i>");
      }

      sessionStorage.setItem("previousAdviceBell".concat(globalWebAdminLanguage), advicesWorker.$advicesBellButton.html());
      advicesWorker.timeoutHandle = window.setTimeout(advicesWorker.worker, advicesWorker.timeOut);
    } else if (response.success === true && response.advices !== undefined && response.advices.length === 0) {
      sessionStorage.removeItem("previousAdvice".concat(globalWebAdminLanguage));
      sessionStorage.removeItem("previousAdviceBell".concat(globalWebAdminLanguage));
      advicesWorker.$advicesBellButton.html('<i class="grey icon bell outline"></i>');
    }
  }
};
$(document).ready(function () {
  advicesWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2VzL2FkdmljZXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImFkdmljZXNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRhZHZpY2VzIiwiJCIsIiRhZHZpY2VzQmVsbEJ1dHRvbiIsImluaXRpYWxpemUiLCJzaG93UHJldmlvdXNBZHZpY2UiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25EYXRhQ2hhbmdlZCIsIm9uIiwiY2JPbkNsaWNrU2F2ZVBhc3N3b3JkIiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsImhpZGUiLCJlcnJvcnMiLCJwYXJhbXMiLCJlYWNoIiwia2V5IiwidmFsdWUiLCJpcyIsInBhc3MiLCJ2YWwiLCJwYXNzUmVwIiwiZ2xvYmFsVHJhbnNsYXRlIiwidHJpbSIsImNoZWNrUGFzc3dvcmRPayIsInNob3dQYXNzd29yZEVycm9yIiwic2F2ZVBhc3N3b3JkcyIsInBvc3QiLCJkYXRhIiwic3VjY2VzcyIsInBhc3N3b3JkQ2hlY2tGYWlsIiwibW9kYWwiLCJjbG9zYWJsZSIsImhlYWRlciIsImJvZHkiLCJodG1sIiwic2hvdyIsInBhc3N3b3JkIiwiY2hlY2sxIiwibWF0Y2giLCJjaGVjazIiLCJjaGVjazMiLCJsZW5ndGgiLCJzZXNzaW9uU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwic2V0VGltZW91dCIsInByZXZpb3VzQWR2aWNlQmVsbCIsImdldEl0ZW0iLCJ1bmRlZmluZWQiLCJwcmV2aW91c0FkdmljZSIsIlBieEFwaSIsIkFkdmljZXNHZXRMaXN0IiwiY2JBZnRlclJlc3BvbnNlIiwicmVzcG9uc2UiLCJhZHZpY2VzIiwiaHRtbE1lc3NhZ2VzIiwiY291bnRNZXNzYWdlcyIsImljb25CZWxsQ2xhc3MiLCJuZWVkVXBkYXRlIiwibmVlZFNob3ciLCJlcnJvciIsIndhcm5pbmciLCJpbmZvIiwic2V0SXRlbSIsInBvcHVwIiwicG9zaXRpb24iLCJkZWxheSIsImZpbmQiLCJ0cmFuc2l0aW9uIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBRUEsSUFBTUEsYUFBYSxHQUFHO0FBQ3JCQyxFQUFBQSxPQUFPLEVBQUUsTUFEWTtBQUVyQkMsRUFBQUEsYUFBYSxFQUFFLEVBRk07QUFHckJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLFVBQUQsQ0FIVTtBQUlyQkMsRUFBQUEsa0JBQWtCLEVBQUVELENBQUMsQ0FBQyxzQkFBRCxDQUpBO0FBS3JCRSxFQUFBQSxVQUxxQix3QkFLUjtBQUNaTixJQUFBQSxhQUFhLENBQUNPLGtCQUFkLEdBRFksQ0FFWjs7QUFDQVAsSUFBQUEsYUFBYSxDQUFDUSxhQUFkO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0IsbUJBQXhCLEVBQTZDVixhQUFhLENBQUNXLGVBQTNEO0FBQ0FQLElBQUFBLENBQUMsQ0FBQyxxQ0FBRCxDQUFELENBQXlDUSxFQUF6QyxDQUE0QyxPQUE1QyxFQUFxRFosYUFBYSxDQUFDYSxxQkFBbkU7QUFDQSxHQVhvQjtBQVlyQkwsRUFBQUEsYUFacUIsMkJBWUw7QUFDZkMsSUFBQUEsTUFBTSxDQUFDSyxZQUFQLENBQW9CZCxhQUFhLENBQUNlLGFBQWxDO0FBQ0FmLElBQUFBLGFBQWEsQ0FBQ2dCLE1BQWQ7QUFDQSxHQWZvQjs7QUFnQnJCO0FBQ0Q7QUFDQTtBQUNDSCxFQUFBQSxxQkFuQnFCLG1DQW1CRTtBQUN0QlQsSUFBQUEsQ0FBQyxDQUFDLDZCQUFELENBQUQsQ0FBaUNhLElBQWpDO0FBQ0EsUUFBSUMsTUFBTSxHQUFHLEVBQWI7QUFDQSxRQUFJQyxNQUFNLEdBQUcsRUFBYjtBQUNBZixJQUFBQSxDQUFDLENBQUNnQixJQUFGLENB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QUFhLENBQUNlLGFBQWQsR0FBOEJOLE1BQU0sQ0FBQzBDLFVBQVAsQ0FDN0JuRCxhQUFhLENBQUNnQixNQURlLEVBRTdCaEIsYUFBYSxDQUFDQyxPQUZlLENBQTlCO0FBSUEsS0FoR0QsTUFnR08sSUFBSTBELFFBQVEsQ0FBQ3pCLE9BQVQsS0FBcUIsSUFBckIsSUFDUHlCLFFBQVEsQ0FBQ0MsT0FBVCxLQUFxQk4sU0FEZCxJQUVQSyxRQUFRLENBQUNDLE9BQVQsQ0FBaUJiLE1BQWpCLEtBQTRCLENBRnpCLEVBRTRCO0FBQ2xDQyxNQUFBQSxjQUFjLENBQUNDLFVBQWYseUJBQTJDQyxzQkFBM0M7QUFDQUYsTUFBQUEsY0FBYyxDQUFDQyxVQUFmLDZCQUErQ0Msc0JBQS9DO0FBQ0FsRCxNQUFBQSxhQUFhLENBQUNLLGtCQUFkLENBQ0VtQyxJQURGLENBQ08sd0NBRFA7QUFFQTtBQUNEO0FBbE5vQixDQUF0QjtBQXFOQXBDLENBQUMsQ0FBQ3VFLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkI1RSxFQUFBQSxhQUFhLENBQUNNLFVBQWQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBzZXNzaW9uU3RvcmFnZSwgJCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbmNvbnN0IGFkdmljZXNXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdCRhZHZpY2VzOiAkKCcjYWR2aWNlcycpLFxuXHQkYWR2aWNlc0JlbGxCdXR0b246ICQoJyNzaG93LWFkdmljZXMtYnV0dG9uJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0YWR2aWNlc1dvcmtlci5zaG93UHJldmlvdXNBZHZpY2UoKTtcblx0XHQvLyDQl9Cw0L/Rg9GB0YLQuNC8INC/0L7Qu9GD0YfQtdC90LjQtSDQvdC+0LLRi9GFINGB0L7QstC10YLQvtCyXG5cdFx0YWR2aWNlc1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgYWR2aWNlc1dvcmtlci5jYk9uRGF0YUNoYW5nZWQpO1xuXHRcdCQoJyN1cGRhdGVQYXNzd29yZFdpbmRvdyAjc2F2ZVBhc3N3b3JkJykub24oJ2NsaWNrJywgYWR2aWNlc1dvcmtlci5jYk9uQ2xpY2tTYXZlUGFzc3dvcmQpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoYWR2aWNlc1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRhZHZpY2VzV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHQvKipcblx0ICog0J7RgtC/0YDQsNCy0LrQsCDRhNC+0YDQvNGLINC+0LHQvdC+0LLQu9C10L3QuNGPINC/0LDRgNC+0LvQtdC5IFNTSCDQuCBXZWIuXG5cdCAqL1xuXHRjYk9uQ2xpY2tTYXZlUGFzc3dvcmQoKXtcblx0XHQkKCcjdXBkYXRlUGFzc3dvcmRXaW5kb3dSZXN1bHQnKS5oaWRlKCk7XG5cdFx0bGV0IGVycm9ycyA9ICcnO1xuXHRcdGxldCBwYXJhbXMgPSB7fTtcblx0XHQkLmVhY2goWydXZWJBZG1pblBhc3N3b3JkJywgJ1NTSFBhc3N3b3JkJ10sIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRpZighJChgI3VwZGF0ZVBhc3N3b3JkV2luZG93ICMke3ZhbHVlfWApLmlzKFwiOnZpc2libGVcIikpe1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRsZXQgcGFzcyBcdD0gJChgIyR7dmFsdWV9YCkudmFsKCk7XG5cdFx0XHRsZXQgcGFzc1JlcCBcdD0gJChgIyR7dmFsdWV9UmVwZWF0YCkudmFsKCk7XG5cdFx0XHRpZiggcGFzcyAhPT0gcGFzc1JlcCl7XG5cdFx0XHRcdGVycm9ycys9JzxsaT4nK2dsb2JhbFRyYW5zbGF0ZVtgcGFzc19DaGVjayR7dmFsdWV9RG9udE1hdGNoYF0rJzwvbGk+Jztcblx0XHRcdH1lbHNlIGlmKHBhc3MudHJpbSgpID09PSAnJyl7XG5cdFx0XHRcdGVycm9ycys9JzxsaT4nK2dsb2JhbFRyYW5zbGF0ZVtgcGFzc19DaGVjayR7dmFsdWV9RW1wdHlgXSsnPC9saT4nO1xuXHRcdFx0fWVsc2UgaWYoYWR2aWNlc1dvcmtlci5jaGVja1Bhc3N3b3JkT2socGFzcykpe1xuXHRcdFx0XHRlcnJvcnMrPWA8bGk+JHtnbG9iYWxUcmFuc2xhdGVbJ3Bhc3NfQ2hlY2ske3ZhbHVlfVNpbXBsZSddfTwvbGk+YDtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHRwYXJhbXNbdmFsdWVdID0gcGFzcztcblx0XHRcdH1cblx0XHR9KTtcblx0XHRpZihlcnJvcnMudHJpbSgpICE9PSAnJyl7XG5cdFx0XHRlcnJvcnMgPSBgPHVsIGNsYXNzPVwidWkgbGlzdFwiPiR7ZXJyb3JzfTwvdWw+YDtcblx0XHRcdGFkdmljZXNXb3JrZXIuc2hvd1Bhc3N3b3JkRXJyb3IoZ2xvYmFsVHJhbnNsYXRlWydwYXNzX0NoZWNrV2ViUGFzc0Vycm9yQ2hhbmdlJ10sIGVycm9ycyk7XG5cdFx0fWVsc2V7XG5cdFx0XHRhZHZpY2VzV29ya2VyLnNhdmVQYXNzd29yZHMocGFyYW1zKTtcblx0XHR9XG5cdH0sXG5cdHNhdmVQYXNzd29yZHMocGFyYW1zKXtcblx0XHQkLnBvc3QoJy9hZG1pbi1jYWJpbmV0L2dlbmVyYWwtc2V0dGluZ3Mvc2F2ZScsIHBhcmFtcywgZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRpZihkYXRhLnN1Y2Nlc3MgPT09IGZhbHNlKXtcblx0XHRcdFx0bGV0IGVycm9ycyA9ICcnO1xuXHRcdFx0XHRpZih0eXBlb2YgZGF0YS5wYXNzd29yZENoZWNrRmFpbCAhPT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0XHRcdCQuZWFjaChkYXRhLnBhc3N3b3JkQ2hlY2tGYWlsLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdFx0ZXJyb3JzKz0nPGxpPicrZ2xvYmFsVHJhbnNsYXRlW2BwYXNzX0NoZWNrJHt2YWx1ZX1TaW1wbGVgXSsnPC9saT4nO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRlcnJvcnMrPSc8bGk+JytnbG9iYWxUcmFuc2xhdGVbJ2VyX0ludGVybmFsU2VydmVyRXJyb3InXSsnPC9saT4nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmKGVycm9ycy50cmltKCkgIT09ICcnKXtcblx0XHRcdFx0XHRhZHZpY2VzV29ya2VyLnNob3dQYXNzd29yZEVycm9yKGdsb2JhbFRyYW5zbGF0ZVsncGFzc19DaGVja1dlYlBhc3NFcnJvckNoYW5nZSddLCBlcnJvcnMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0JCgnI3VwZGF0ZVBhc3N3b3JkV2luZG93JykubW9kYWwoeyBjbG9zYWJsZSA6IGZhbHNlLCB9KS5tb2RhbCgnaGlkZScpXG5cdFx0XHRcdGFkdmljZXNXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRzaG93UGFzc3dvcmRFcnJvcihoZWFkZXIsIGJvZHkpe1xuXHRcdCQoJyN1cGRhdGVQYXNzd29yZFdpbmRvd1Jlc3VsdCBkaXYnKS5odG1sKGhlYWRlcik7XG5cdFx0JCgnI3VwZGF0ZVBhc3N3b3JkV2luZG93UmVzdWx0IHAnKS5odG1sKGJvZHkpO1xuXHRcdCQoJyN1cGRhdGVQYXNzd29yZFdpbmRvd1Jlc3VsdCcpLnNob3coKTtcblx0fSxcblx0Y2hlY2tQYXNzd29yZE9rKHBhc3N3b3JkKSB7XG5cdFx0bGV0IGNoZWNrMSA9IHBhc3N3b3JkLm1hdGNoKC9bYS16XS8pICE9PSBudWxsO1xuXHRcdGxldCBjaGVjazIgPSBwYXNzd29yZC5tYXRjaCgvXFxkLykgIT09IG51bGw7XG5cdFx0bGV0IGNoZWNrMyA9IHBhc3N3b3JkLm1hdGNoKC9bQS1aXS8pICE9PSBudWxsO1xuXHRcdHJldHVybiBjaGVjazEgJiYgY2hlY2syICYmIGNoZWNrMyAmJiAocGFzc3dvcmQubGVuZ3RoID4gNik7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtC60LAg0YHQvtCx0YvRgtC40Y8g0YHQvNC10L3RiyDRj9C30YvQutCwINC40LvQuCDQtNCw0L3QvdGL0YVcblx0ICovXG5cdGNiT25EYXRhQ2hhbmdlZCgpIHtcblx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0FkdmljZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0FkdmljZUJlbGwke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0c2V0VGltZW91dChhZHZpY2VzV29ya2VyLnJlc3RhcnRXb3JrZXIsMzAwMCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LrQsNC30YvQstCw0LXRgiDRgdGC0LDRgNGL0LUg0YHQvtCy0LXRgtGLINC00L4g0L/QvtC70YPRh9C10L3QuNGPINC+0LHQstC90L7Qu9C10L3QuNGPINGB0L4g0YHRgtCw0L3RhtC40Lhcblx0ICovXG5cdHNob3dQcmV2aW91c0FkdmljZSgpIHtcblx0XHRjb25zdCBwcmV2aW91c0FkdmljZUJlbGwgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGBwcmV2aW91c0FkdmljZUJlbGwke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0aWYgKHByZXZpb3VzQWR2aWNlQmVsbCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5odG1sKHByZXZpb3VzQWR2aWNlQmVsbCk7XG5cdFx0fVxuXHRcdGNvbnN0IHByZXZpb3VzQWR2aWNlID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0aWYgKHByZXZpb3VzQWR2aWNlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbChwcmV2aW91c0FkdmljZSk7XG5cdFx0fVxuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0UGJ4QXBpLkFkdmljZXNHZXRMaXN0KGFkdmljZXNXb3JrZXIuY2JBZnRlclJlc3BvbnNlKTtcblx0fSxcblx0Y2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlID09PSBmYWxzZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzLmh0bWwoJycpO1xuXHRcdGlmIChyZXNwb25zZS5hZHZpY2VzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGxldCBodG1sTWVzc2FnZXMgPSAnJztcblx0XHRcdGxldCBjb3VudE1lc3NhZ2VzID0gMDtcblx0XHRcdGxldCBpY29uQmVsbENsYXNzID0gJyc7XG5cdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJ1aSByZWxheGVkIGRpdmlkZWQgbGlzdFwiPic7XG5cblx0XHRcdGlmIChyZXNwb25zZS5hZHZpY2VzLm5lZWRVcGRhdGUgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLm5lZWRVcGRhdGUubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRsZXQgbmVlZFNob3cgPSBmYWxzZTtcblx0XHRcdFx0JChcIiN1cGRhdGVQYXNzd29yZFdpbmRvdyBkaXYubWlrby1zZXR0aW5ncy1jb250YWluZXJcIikuaGlkZSgpO1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UuYWR2aWNlcy5uZWVkVXBkYXRlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdCQoYCN1cGRhdGVQYXNzd29yZFdpbmRvdyAjJHt2YWx1ZX0tY29udGFpbmVyYCkuc2hvdygpO1xuXHRcdFx0XHRcdG5lZWRTaG93ID0gdHJ1ZTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGlmKG5lZWRTaG93KXtcblx0XHRcdFx0XHQkKCcjdXBkYXRlUGFzc3dvcmRXaW5kb3cnKS5tb2RhbCh7IGNsb3NhYmxlIDogZmFsc2UsIH0pLm1vZGFsKCdzaG93Jylcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAocmVzcG9uc2UuYWR2aWNlcy5lcnJvciAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMuZXJyb3IubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UuYWR2aWNlcy5lcnJvciwgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwiZnJvd24gb3V0bGluZSByZWQgaWNvblwiPjwvaT4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGRpdiBjbGFzcz1cInVpIHNtYWxsIHJlZCBoZWFkZXJcIj4ke3ZhbHVlfTwvZGl2PmA7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRjb3VudE1lc3NhZ2VzICs9IDE7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHJlc3BvbnNlLmFkdmljZXMud2FybmluZyAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMud2FybmluZy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQuZWFjaChyZXNwb25zZS5hZHZpY2VzLndhcm5pbmcsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8aSBjbGFzcz1cIm1laCBvdXRsaW5lIHllbGxvdyBpY29uXCI+PC9pPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9IGA8ZGl2IGNsYXNzPVwidWkgc21hbGwgaGVhZGVyXCI+JHt2YWx1ZX08L2Rpdj5gO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0Y291bnRNZXNzYWdlcyArPSAxO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZS5hZHZpY2VzLmluZm8gIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLmluZm8ubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UuYWR2aWNlcy5pbmZvLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJzbWlsZSBvdXRsaW5lIGJsdWUgaWNvblwiPjwvaT4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGRpdiBjbGFzcz1cInVpIHNtYWxsIGhlYWRlclwiPiR7dmFsdWV9PC9kaXY+YDtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGNvdW50TWVzc2FnZXMgKz0gMTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyZXNwb25zZS5hZHZpY2VzLmVycm9yICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcy5lcnJvci5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGljb25CZWxsQ2xhc3MgPSAncmVkIGxhcmdlIGljb24gYmVsbCc7XG5cdFx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmFkdmljZXMud2FybmluZyAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMud2FybmluZy5sZW5ndGggPiAwKXtcblx0XHRcdFx0aWNvbkJlbGxDbGFzcyA9ICd5ZWxsb3cgaWNvbiBiZWxsJztcblxuXHRcdFx0fSBlbHNlIGlmIChyZXNwb25zZS5hZHZpY2VzLmluZm8gIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLmluZm8ubGVuZ3RoID4gMCl7XG5cdFx0XHRcdGljb25CZWxsQ2xhc3MgPSAnYmx1ZSBpY29uIGJlbGwnO1xuXHRcdFx0fVxuXG5cblx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbChodG1sTWVzc2FnZXMpO1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCwgaHRtbE1lc3NhZ2VzKTtcblxuXHRcdFx0aWYgKGNvdW50TWVzc2FnZXM+MCl7XG5cdFx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uXG5cdFx0XHRcdFx0Lmh0bWwoYDxpIGNsYXNzPVwiJHtpY29uQmVsbENsYXNzfVwiPjwvaT4ke2NvdW50TWVzc2FnZXN9YClcblx0XHRcdFx0XHQucG9wdXAoe1xuXHRcdFx0XHRcdFx0cG9zaXRpb246ICdib3R0b20gbGVmdCcsXG5cdFx0XHRcdFx0XHRwb3B1cDogYWR2aWNlc1dvcmtlci4kYWR2aWNlcyxcblx0XHRcdFx0XHRcdGRlbGF5OiB7XG5cdFx0XHRcdFx0XHRcdHNob3c6IDMwMCxcblx0XHRcdFx0XHRcdFx0aGlkZTogMTAwMDAsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5maW5kKCdpJylcblx0XHRcdFx0XHQudHJhbnNpdGlvbignc2V0IGxvb3BpbmcnKVxuXHRcdFx0XHRcdC50cmFuc2l0aW9uKCdwdWxzZScsICcxMDAwbXMnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uXG5cdFx0XHRcdFx0Lmh0bWwoYDxpIGNsYXNzPVwiZ3JleSBpY29uIGJlbGxcIj48L2k+YClcblx0XHRcdH1cblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gLCBhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5odG1sKCkpO1xuXHRcdFx0YWR2aWNlc1dvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG5cdFx0XHRcdGFkdmljZXNXb3JrZXIud29ya2VyLFxuXHRcdFx0XHRhZHZpY2VzV29ya2VyLnRpbWVPdXQsXG5cdFx0XHQpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZVxuXHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcyAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0FkdmljZUJlbGwke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvblxuXHRcdFx0XHQuaHRtbCgnPGkgY2xhc3M9XCJncmV5IGljb24gYmVsbCBvdXRsaW5lXCI+PC9pPicpO1xuXHRcdH1cblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0YWR2aWNlc1dvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==