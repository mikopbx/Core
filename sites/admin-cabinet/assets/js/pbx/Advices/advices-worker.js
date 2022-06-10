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
        errors += '<li>' + globalTranslate["pass_Check".concat(value, "Empty")] + '</li>'; // }else if(advicesWorker.checkPasswordOk(webPass)){
        // 	errors+=`<li>${globalTranslate['pass_Check${value}Simple']}</li>`;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2VzL2FkdmljZXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImFkdmljZXNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRhZHZpY2VzIiwiJCIsIiRhZHZpY2VzQmVsbEJ1dHRvbiIsImluaXRpYWxpemUiLCJzaG93UHJldmlvdXNBZHZpY2UiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25EYXRhQ2hhbmdlZCIsIm9uIiwiY2JPbkNsaWNrU2F2ZVBhc3N3b3JkIiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsImhpZGUiLCJlcnJvcnMiLCJwYXJhbXMiLCJlYWNoIiwia2V5IiwidmFsdWUiLCJpcyIsInBhc3MiLCJ2YWwiLCJwYXNzUmVwIiwiZ2xvYmFsVHJhbnNsYXRlIiwidHJpbSIsInNob3dQYXNzd29yZEVycm9yIiwic2F2ZVBhc3N3b3JkcyIsInBvc3QiLCJkYXRhIiwic3VjY2VzcyIsInBhc3N3b3JkQ2hlY2tGYWlsIiwibW9kYWwiLCJjbG9zYWJsZSIsImhlYWRlciIsImJvZHkiLCJodG1sIiwic2hvdyIsImNoZWNrUGFzc3dvcmRPayIsInBhc3N3b3JkIiwiY2hlY2sxIiwibWF0Y2giLCJjaGVjazIiLCJjaGVjazMiLCJsZW5ndGgiLCJzZXNzaW9uU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwic2V0VGltZW91dCIsInByZXZpb3VzQWR2aWNlQmVsbCIsImdldEl0ZW0iLCJ1bmRlZmluZWQiLCJwcmV2aW91c0FkdmljZSIsIlBieEFwaSIsIkFkdmljZXNHZXRMaXN0IiwiY2JBZnRlclJlc3BvbnNlIiwicmVzcG9uc2UiLCJhZHZpY2VzIiwiaHRtbE1lc3NhZ2VzIiwiY291bnRNZXNzYWdlcyIsImljb25CZWxsQ2xhc3MiLCJuZWVkVXBkYXRlIiwibmVlZFNob3ciLCJlcnJvciIsIndhcm5pbmciLCJpbmZvIiwic2V0SXRlbSIsInBvcHVwIiwicG9zaXRpb24iLCJkZWxheSIsImZpbmQiLCJ0cmFuc2l0aW9uIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBRUEsSUFBTUEsYUFBYSxHQUFHO0FBQ3JCQyxFQUFBQSxPQUFPLEVBQUUsTUFEWTtBQUVyQkMsRUFBQUEsYUFBYSxFQUFFLEVBRk07QUFHckJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLFVBQUQsQ0FIVTtBQUlyQkMsRUFBQUEsa0JBQWtCLEVBQUVELENBQUMsQ0FBQyxzQkFBRCxDQUpBO0FBS3JCRSxFQUFBQSxVQUxxQix3QkFLUjtBQUNaTixJQUFBQSxhQUFhLENBQUNPLGtCQUFkLEdBRFksQ0FFWjs7QUFDQVAsSUFBQUEsYUFBYSxDQUFDUSxhQUFkO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0IsbUJBQXhCLEVBQTZDVixhQUFhLENBQUNXLGVBQTNEO0FBQ0FQLElBQUFBLENBQUMsQ0FBQyxxQ0FBRCxDQUFELENBQXlDUSxFQUF6QyxDQUE0QyxPQUE1QyxFQUFxRFosYUFBYSxDQUFDYSxxQkFBbkU7QUFDQSxHQVhvQjtBQVlyQkwsRUFBQUEsYUFacUIsMkJBWUw7QUFDZkMsSUFBQUEsTUFBTSxDQUFDSyxZQUFQLENBQW9CZCxhQUFhLENBQUNlLGFBQWxDO0FBQ0FmLElBQUFBLGFBQWEsQ0FBQ2dCLE1BQWQ7QUFDQSxHQWZvQjs7QUFnQnJCO0FBQ0Q7QUFDQTtBQUNDSCxFQUFBQSxxQkFuQnFCLG1DQW1CRTtBQUN0QlQsSUFBQUEsQ0FBQyxDQUFDLDZCQUFELENBQUQsQ0FBaUNhLElBQWpDO0FBQ0EsUUFBSUMsTUFBTSxHQUFHLEVBQWI7QUFDQSxRQUFJQyxNQUFNLEdBQUcsRUFBYjtBQUNBZixJQUFBQSxDQUFDLENBQUNnQixJQUFGLENB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LEtBaEdELE1BZ0dPLElBQUkwRCxRQUFRLENBQUMxQixPQUFULEtBQXFCLElBQXJCLElBQ1AwQixRQUFRLENBQUNDLE9BQVQsS0FBcUJOLFNBRGQsSUFFUEssUUFBUSxDQUFDQyxPQUFULENBQWlCYixNQUFqQixLQUE0QixDQUZ6QixFQUU0QjtBQUNsQ0MsTUFBQUEsY0FBYyxDQUFDQyxVQUFmLHlCQUEyQ0Msc0JBQTNDO0FBQ0FGLE1BQUFBLGNBQWMsQ0FBQ0MsVUFBZiw2QkFBK0NDLHNCQUEvQztBQUNBbEQsTUFBQUEsYUFBYSxDQUFDSyxrQkFBZCxDQUNFa0MsSUFERixDQUNPLHdDQURQO0FBRUE7QUFDRDtBQWxOb0IsQ0FBdEI7QUFxTkFuQyxDQUFDLENBQUN1RSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCNUUsRUFBQUEsYUFBYSxDQUFDTSxVQUFkO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSwgc2Vzc2lvblN0b3JhZ2UsICQsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG5jb25zdCBhZHZpY2VzV29ya2VyID0ge1xuXHR0aW1lT3V0OiAzMDAwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHQkYWR2aWNlczogJCgnI2FkdmljZXMnKSxcblx0JGFkdmljZXNCZWxsQnV0dG9uOiAkKCcjc2hvdy1hZHZpY2VzLWJ1dHRvbicpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGFkdmljZXNXb3JrZXIuc2hvd1ByZXZpb3VzQWR2aWNlKCk7XG5cdFx0Ly8g0JfQsNC/0YPRgdGC0LjQvCDQv9C+0LvRg9GH0LXQvdC40LUg0L3QvtCy0YvRhSDRgdC+0LLQtdGC0L7QslxuXHRcdGFkdmljZXNXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIGFkdmljZXNXb3JrZXIuY2JPbkRhdGFDaGFuZ2VkKTtcblx0XHQkKCcjdXBkYXRlUGFzc3dvcmRXaW5kb3cgI3NhdmVQYXNzd29yZCcpLm9uKCdjbGljaycsIGFkdmljZXNXb3JrZXIuY2JPbkNsaWNrU2F2ZVBhc3N3b3JkKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGFkdmljZXNXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0YWR2aWNlc1dvcmtlci53b3JrZXIoKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0YLQv9GA0LDQstC60LAg0YTQvtGA0LzRiyDQvtCx0L3QvtCy0LvQtdC90LjRjyDQv9Cw0YDQvtC70LXQuSBTU0gg0LggV2ViLlxuXHQgKi9cblx0Y2JPbkNsaWNrU2F2ZVBhc3N3b3JkKCl7XG5cdFx0JCgnI3VwZGF0ZVBhc3N3b3JkV2luZG93UmVzdWx0JykuaGlkZSgpO1xuXHRcdGxldCBlcnJvcnMgPSAnJztcblx0XHRsZXQgcGFyYW1zID0ge307XG5cdFx0JC5lYWNoKFsnV2ViQWRtaW5QYXNzd29yZCcsICdTU0hQYXNzd29yZCddLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aWYoISQoYCN1cGRhdGVQYXNzd29yZFdpbmRvdyAjJHt2YWx1ZX1gKS5pcyhcIjp2aXNpYmxlXCIpKXtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0bGV0IHBhc3MgXHQ9ICQoYCMke3ZhbHVlfWApLnZhbCgpO1xuXHRcdFx0bGV0IHBhc3NSZXAgXHQ9ICQoYCMke3ZhbHVlfVJlcGVhdGApLnZhbCgpO1xuXHRcdFx0aWYoIHBhc3MgIT09IHBhc3NSZXApe1xuXHRcdFx0XHRlcnJvcnMrPSc8bGk+JytnbG9iYWxUcmFuc2xhdGVbYHBhc3NfQ2hlY2ske3ZhbHVlfURvbnRNYXRjaGBdKyc8L2xpPic7XG5cdFx0XHR9ZWxzZSBpZihwYXNzLnRyaW0oKSA9PT0gJycpe1xuXHRcdFx0XHRlcnJvcnMrPSc8bGk+JytnbG9iYWxUcmFuc2xhdGVbYHBhc3NfQ2hlY2ske3ZhbHVlfUVtcHR5YF0rJzwvbGk+Jztcblx0XHRcdFx0Ly8gfWVsc2UgaWYoYWR2aWNlc1dvcmtlci5jaGVja1Bhc3N3b3JkT2sod2ViUGFzcykpe1xuXHRcdFx0XHQvLyBcdGVycm9ycys9YDxsaT4ke2dsb2JhbFRyYW5zbGF0ZVsncGFzc19DaGVjayR7dmFsdWV9U2ltcGxlJ119PC9saT5gO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHBhcmFtc1t2YWx1ZV0gPSBwYXNzO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGlmKGVycm9ycy50cmltKCkgIT09ICcnKXtcblx0XHRcdGVycm9ycyA9IGA8dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JHtlcnJvcnN9PC91bD5gO1xuXHRcdFx0YWR2aWNlc1dvcmtlci5zaG93UGFzc3dvcmRFcnJvcihnbG9iYWxUcmFuc2xhdGVbJ3Bhc3NfQ2hlY2tXZWJQYXNzRXJyb3JDaGFuZ2UnXSwgZXJyb3JzKTtcblx0XHR9ZWxzZXtcblx0XHRcdGFkdmljZXNXb3JrZXIuc2F2ZVBhc3N3b3JkcyhwYXJhbXMpO1xuXHRcdH1cblx0fSxcblx0c2F2ZVBhc3N3b3JkcyhwYXJhbXMpe1xuXHRcdCQucG9zdCgnL2FkbWluLWNhYmluZXQvZ2VuZXJhbC1zZXR0aW5ncy9zYXZlJywgcGFyYW1zLCBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRcdGlmKGRhdGEuc3VjY2VzcyA9PT0gZmFsc2Upe1xuXHRcdFx0XHRsZXQgZXJyb3JzID0gJyc7XG5cdFx0XHRcdGlmKHR5cGVvZiBkYXRhLnBhc3N3b3JkQ2hlY2tGYWlsICE9PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdFx0JC5lYWNoKGRhdGEucGFzc3dvcmRDaGVja0ZhaWwsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0XHRlcnJvcnMrPSc8bGk+JytnbG9iYWxUcmFuc2xhdGVbYHBhc3NfQ2hlY2ske3ZhbHVlfVNpbXBsZWBdKyc8L2xpPic7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdGVycm9ycys9JzxsaT4nK2dsb2JhbFRyYW5zbGF0ZVsnZXJfSW50ZXJuYWxTZXJ2ZXJFcnJvciddKyc8L2xpPic7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYoZXJyb3JzLnRyaW0oKSAhPT0gJycpe1xuXHRcdFx0XHRcdGFkdmljZXNXb3JrZXIuc2hvd1Bhc3N3b3JkRXJyb3IoZ2xvYmFsVHJhbnNsYXRlWydwYXNzX0NoZWNrV2ViUGFzc0Vycm9yQ2hhbmdlJ10sIGVycm9ycyk7XG5cdFx0XHRcdH1cblx0XHRcdH1lbHNle1xuXHRcdFx0XHQkKCcjdXBkYXRlUGFzc3dvcmRXaW5kb3cnKS5tb2RhbCh7IGNsb3NhYmxlIDogZmFsc2UsIH0pLm1vZGFsKCdoaWRlJylcblx0XHRcdFx0YWR2aWNlc1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdHNob3dQYXNzd29yZEVycm9yKGhlYWRlciwgYm9keSl7XG5cdFx0JCgnI3VwZGF0ZVBhc3N3b3JkV2luZG93UmVzdWx0IGRpdicpLmh0bWwoaGVhZGVyKTtcblx0XHQkKCcjdXBkYXRlUGFzc3dvcmRXaW5kb3dSZXN1bHQgcCcpLmh0bWwoYm9keSk7XG5cdFx0JCgnI3VwZGF0ZVBhc3N3b3JkV2luZG93UmVzdWx0Jykuc2hvdygpO1xuXHR9LFxuXHRjaGVja1Bhc3N3b3JkT2socGFzc3dvcmQpIHtcblx0XHRsZXQgY2hlY2sxID0gcGFzc3dvcmQubWF0Y2goL1thLXpdLykgIT09IG51bGw7XG5cdFx0bGV0IGNoZWNrMiA9IHBhc3N3b3JkLm1hdGNoKC9cXGQvKSAhPT0gbnVsbDtcblx0XHRsZXQgY2hlY2szID0gcGFzc3dvcmQubWF0Y2goL1tBLVpdLykgIT09IG51bGw7XG5cdFx0cmV0dXJuIGNoZWNrMSAmJiBjaGVjazIgJiYgY2hlY2szICYmIChwYXNzd29yZC5sZW5ndGggPiA2KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDRgdC+0LHRi9GC0LjRjyDRgdC80LXQvdGLINGP0LfRi9C60LAg0LjQu9C4INC00LDQvdC90YvRhVxuXHQgKi9cblx0Y2JPbkRhdGFDaGFuZ2VkKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRzZXRUaW1lb3V0KGFkdmljZXNXb3JrZXIucmVzdGFydFdvcmtlciwzMDAwKTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QutCw0LfRi9Cy0LDQtdGCINGB0YLQsNGA0YvQtSDRgdC+0LLQtdGC0Ysg0LTQviDQv9C+0LvRg9GH0LXQvdC40Y8g0L7QsdCy0L3QvtC70LXQvdC40Y8g0YHQviDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0c2hvd1ByZXZpb3VzQWR2aWNlKCkge1xuXHRcdGNvbnN0IHByZXZpb3VzQWR2aWNlQmVsbCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRpZiAocHJldmlvdXNBZHZpY2VCZWxsICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uLmh0bWwocHJldmlvdXNBZHZpY2VCZWxsKTtcblx0XHR9XG5cdFx0Y29uc3QgcHJldmlvdXNBZHZpY2UgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGBwcmV2aW91c0FkdmljZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRpZiAocHJldmlvdXNBZHZpY2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlcy5odG1sKHByZXZpb3VzQWR2aWNlKTtcblx0XHR9XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHRQYnhBcGkuQWR2aWNlc0dldExpc3QoYWR2aWNlc1dvcmtlci5jYkFmdGVyUmVzcG9uc2UpO1xuXHR9LFxuXHRjYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbCgnJyk7XG5cdFx0aWYgKHJlc3BvbnNlLmFkdmljZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bGV0IGh0bWxNZXNzYWdlcyA9ICcnO1xuXHRcdFx0bGV0IGNvdW50TWVzc2FnZXMgPSAwO1xuXHRcdFx0bGV0IGljb25CZWxsQ2xhc3MgPSAnJztcblx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cInVpIHJlbGF4ZWQgZGl2aWRlZCBsaXN0XCI+JztcblxuXHRcdFx0aWYgKHJlc3BvbnNlLmFkdmljZXMubmVlZFVwZGF0ZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMubmVlZFVwZGF0ZS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGxldCBuZWVkU2hvdyA9IGZhbHNlO1xuXHRcdFx0XHQkKFwiI3VwZGF0ZVBhc3N3b3JkV2luZG93IGRpdi5taWtvLXNldHRpbmdzLWNvbnRhaW5lclwiKS5oaWRlKCk7XG5cdFx0XHRcdCQuZWFjaChyZXNwb25zZS5hZHZpY2VzLm5lZWRVcGRhdGUsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0JChgI3VwZGF0ZVBhc3N3b3JkV2luZG93ICMke3ZhbHVlfS1jb250YWluZXJgKS5zaG93KCk7XG5cdFx0XHRcdFx0bmVlZFNob3cgPSB0cnVlO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0aWYobmVlZFNob3cpe1xuXHRcdFx0XHRcdCQoJyN1cGRhdGVQYXNzd29yZFdpbmRvdycpLm1vZGFsKHsgY2xvc2FibGUgOiBmYWxzZSwgfSkubW9kYWwoJ3Nob3cnKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyZXNwb25zZS5hZHZpY2VzLmVycm9yICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcy5lcnJvci5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQuZWFjaChyZXNwb25zZS5hZHZpY2VzLmVycm9yLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJmcm93biBvdXRsaW5lIHJlZCBpY29uXCI+PC9pPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9IGA8ZGl2IGNsYXNzPVwidWkgc21hbGwgcmVkIGhlYWRlclwiPiR7dmFsdWV9PC9kaXY+YDtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGNvdW50TWVzc2FnZXMgKz0gMTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2UuYWR2aWNlcy53YXJuaW5nICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcy53YXJuaW5nLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLmFkdmljZXMud2FybmluZywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwibWVoIG91dGxpbmUgeWVsbG93IGljb25cIj48L2k+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBoZWFkZXJcIj4ke3ZhbHVlfTwvZGl2PmA7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRjb3VudE1lc3NhZ2VzICs9IDE7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHJlc3BvbnNlLmFkdmljZXMuaW5mbyAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMuaW5mby5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQuZWFjaChyZXNwb25zZS5hZHZpY2VzLmluZm8sIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8aSBjbGFzcz1cInNtaWxlIG91dGxpbmUgYmx1ZSBpY29uXCI+PC9pPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9IGA8ZGl2IGNsYXNzPVwidWkgc21hbGwgaGVhZGVyXCI+JHt2YWx1ZX08L2Rpdj5gO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0Y291bnRNZXNzYWdlcyArPSAxO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHJlc3BvbnNlLmFkdmljZXMuZXJyb3IgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLmVycm9yLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0aWNvbkJlbGxDbGFzcyA9ICdyZWQgbGFyZ2UgaWNvbiBiZWxsJztcblx0XHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuYWR2aWNlcy53YXJuaW5nICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcy53YXJuaW5nLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRpY29uQmVsbENsYXNzID0gJ3llbGxvdyBpY29uIGJlbGwnO1xuXG5cdFx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmFkdmljZXMuaW5mbyAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMuaW5mby5sZW5ndGggPiAwKXtcblx0XHRcdFx0aWNvbkJlbGxDbGFzcyA9ICdibHVlIGljb24gYmVsbCc7XG5cdFx0XHR9XG5cblxuXHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlcy5odG1sKGh0bWxNZXNzYWdlcyk7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGBwcmV2aW91c0FkdmljZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gLCBodG1sTWVzc2FnZXMpO1xuXG5cdFx0XHRpZiAoY291bnRNZXNzYWdlcz4wKXtcblx0XHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b25cblx0XHRcdFx0XHQuaHRtbChgPGkgY2xhc3M9XCIke2ljb25CZWxsQ2xhc3N9XCI+PC9pPiR7Y291bnRNZXNzYWdlc31gKVxuXHRcdFx0XHRcdC5wb3B1cCh7XG5cdFx0XHRcdFx0XHRwb3NpdGlvbjogJ2JvdHRvbSBsZWZ0Jyxcblx0XHRcdFx0XHRcdHBvcHVwOiBhZHZpY2VzV29ya2VyLiRhZHZpY2VzLFxuXHRcdFx0XHRcdFx0ZGVsYXk6IHtcblx0XHRcdFx0XHRcdFx0c2hvdzogMzAwLFxuXHRcdFx0XHRcdFx0XHRoaWRlOiAxMDAwMCxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uLmZpbmQoJ2knKVxuXHRcdFx0XHRcdC50cmFuc2l0aW9uKCdzZXQgbG9vcGluZycpXG5cdFx0XHRcdFx0LnRyYW5zaXRpb24oJ3B1bHNlJywgJzEwMDBtcycpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b25cblx0XHRcdFx0XHQuaHRtbChgPGkgY2xhc3M9XCJncmV5IGljb24gYmVsbFwiPjwvaT5gKVxuXHRcdFx0fVxuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNBZHZpY2VCZWxsJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWAsIGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uLmh0bWwoKSk7XG5cdFx0XHRhZHZpY2VzV29ya2VyLnRpbWVvdXRIYW5kbGUgPSB3aW5kb3cuc2V0VGltZW91dChcblx0XHRcdFx0YWR2aWNlc1dvcmtlci53b3JrZXIsXG5cdFx0XHRcdGFkdmljZXNXb3JrZXIudGltZU91dCxcblx0XHRcdCk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5zdWNjZXNzID09PSB0cnVlXG5cdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0FkdmljZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uXG5cdFx0XHRcdC5odG1sKCc8aSBjbGFzcz1cImdyZXkgaWNvbiBiZWxsIG91dGxpbmVcIj48L2k+Jyk7XG5cdFx0fVxuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRhZHZpY2VzV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19