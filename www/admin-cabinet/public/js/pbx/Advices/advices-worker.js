"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, globalPBXLanguage */
var advicesWorker = {
  timeOut: 300000,
  timeOutHandle: '',
  $advices: $('#advices'),
  initialize: function () {
    function initialize() {
      advicesWorker.showPreviousAdvice(); // Запустим получение новых советов

      advicesWorker.restartWorker();
      window.addEventListener('ConfigDataChanged', advicesWorker.restartWorker);
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(advicesWorker.timeoutHandle);
      advicesWorker.worker();
    }

    return restartWorker;
  }(),

  /**
   * Показывает старые советы до получения обвноления со станции
   */
  showPreviousAdvice: function () {
    function showPreviousAdvice() {
      var previousAdvice = localStorage.getItem("previousAdvice".concat(globalPBXLanguage));

      if (previousAdvice !== undefined) {
        advicesWorker.$advices.html(previousAdvice);
      }
    }

    return showPreviousAdvice;
  }(),
  worker: function () {
    function worker() {
      $.api({
        url: "".concat(globalRootUrl, "advices/getAdvices"),
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            advicesWorker.cbAfterResponse(response);
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError(errorMessage, element, xhr) {
            if (xhr.status === 403) {
              window.location = "".concat(globalRootUrl, "session/index");
            }
          }

          return onError;
        }()
      });
      advicesWorker.timeoutHandle = window.setTimeout(advicesWorker.worker, advicesWorker.timeOut);
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(response) {
      if (response === undefined) return;
      advicesWorker.$advices.html('');

      if (response.success === true && response.message !== undefined) {
        var htmlMessages = '';

        if (response.message.error !== undefined && response.message.error.length > 0) {
          htmlMessages += '<div class="ui icon error message">';
          htmlMessages += '<i class="x icon"></i>';
          htmlMessages += '<div class="content">';
          htmlMessages += "<div class=\"header\">".concat(globalTranslate.adv_MessagesHeaderError, "</div>");
          htmlMessages += '<ul class="list">';
          $.each(response.message.error, function (key, value) {
            htmlMessages += "<li>".concat(value, "</li>");
          });
          htmlMessages += '</ul>';
          htmlMessages += '</div>';
          htmlMessages += '</div>';
        } else if (response.message.warning !== undefined && response.message.warning.length > 0) {
          htmlMessages += '<div class="ui icon warning message">';
          htmlMessages += '<i class="warning icon"></i>';
          htmlMessages += '<div class="content">';
          htmlMessages += "<div class=\"header\">".concat(globalTranslate.adv_MessagesHeader, "</div>");
          htmlMessages += '<ul class="list">';
          $.each(response.message.warning, function (key, value) {
            htmlMessages += "<li>".concat(value, "</li>");
          });
          htmlMessages += '</ul>';
          htmlMessages += '</div>';
          htmlMessages += '</div>';
        } else if (response.message.info !== undefined && response.message.info.length > 0) {
          htmlMessages += '<div class="ui icon info message">';
          htmlMessages += '<i class="info icon"></i>';
          htmlMessages += '<div class="content">';
          htmlMessages += "<div class=\"header\">".concat(globalTranslate.adv_MessagesHeader, "</div>");
          htmlMessages += '<ul class="list">';
          $.each(response.message.info, function (key, value) {
            htmlMessages += "<li>".concat(value, "</li>");
          });
          htmlMessages += '</ul>';
          htmlMessages += '</div>';
          htmlMessages += '</div>';
        }

        advicesWorker.$advices.html(htmlMessages);
        localStorage.setItem("previousAdvice".concat(globalPBXLanguage), htmlMessages); // Проверим есть ли обновление системы

        $('a[href="/admin-cabinet/update/index/"] > i').removeClass('loading');

        if (response.message.info !== undefined && response.message.info.length > 0) {
          $.each(response.message.info, function (key, value) {
            if (value.indexOf('/admin-cabinet/update/index/') > -1) {
              $('a[href="/admin-cabinet/update/index/"] > i').addClass('loading');
            }
          });
        }
      } else if (response.success === true && response.message !== undefined && response.message.length === 0) {
        localStorage.removeItem("previousAdvice".concat(globalPBXLanguage));
      }
    }

    return cbAfterResponse;
  }()
};
$(document).ready(function () {
  advicesWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2VzL2FkdmljZXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImFkdmljZXNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRhZHZpY2VzIiwiJCIsImluaXRpYWxpemUiLCJzaG93UHJldmlvdXNBZHZpY2UiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJwcmV2aW91c0FkdmljZSIsImxvY2FsU3RvcmFnZSIsImdldEl0ZW0iLCJnbG9iYWxQQlhMYW5ndWFnZSIsInVuZGVmaW5lZCIsImh0bWwiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwib24iLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsImNiQWZ0ZXJSZXNwb25zZSIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwieGhyIiwic3RhdHVzIiwibG9jYXRpb24iLCJzZXRUaW1lb3V0Iiwic3VjY2VzcyIsIm1lc3NhZ2UiLCJodG1sTWVzc2FnZXMiLCJlcnJvciIsImxlbmd0aCIsImdsb2JhbFRyYW5zbGF0ZSIsImFkdl9NZXNzYWdlc0hlYWRlckVycm9yIiwiZWFjaCIsImtleSIsInZhbHVlIiwid2FybmluZyIsImFkdl9NZXNzYWdlc0hlYWRlciIsImluZm8iLCJzZXRJdGVtIiwicmVtb3ZlQ2xhc3MiLCJpbmRleE9mIiwiYWRkQ2xhc3MiLCJyZW1vdmVJdGVtIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLGFBQWEsR0FBRztBQUNyQkMsRUFBQUEsT0FBTyxFQUFFLE1BRFk7QUFFckJDLEVBQUFBLGFBQWEsRUFBRSxFQUZNO0FBR3JCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxVQUFELENBSFU7QUFJckJDLEVBQUFBLFVBSnFCO0FBQUEsMEJBSVI7QUFDWkwsTUFB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O0FBQUE7QUFBQSxDQUF0QjtBQTRHQVosQ0FBQyxDQUFDK0MsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnBELEVBQUFBLGFBQWEsQ0FBQ0ssVUFBZDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgZ2xvYmFsUEJYTGFuZ3VhZ2UgKi9cblxuY29uc3QgYWR2aWNlc1dvcmtlciA9IHtcblx0dGltZU91dDogMzAwMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0JGFkdmljZXM6ICQoJyNhZHZpY2VzJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0YWR2aWNlc1dvcmtlci5zaG93UHJldmlvdXNBZHZpY2UoKTtcblx0XHQvLyDQl9Cw0L/Rg9GB0YLQuNC8INC/0L7Qu9GD0YfQtdC90LjQtSDQvdC+0LLRi9GFINGB0L7QstC10YLQvtCyXG5cdFx0YWR2aWNlc1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgYWR2aWNlc1dvcmtlci5yZXN0YXJ0V29ya2VyKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGFkdmljZXNXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0YWR2aWNlc1dvcmtlci53b3JrZXIoKTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QutCw0LfRi9Cy0LDQtdGCINGB0YLQsNGA0YvQtSDRgdC+0LLQtdGC0Ysg0LTQviDQv9C+0LvRg9GH0LXQvdC40Y8g0L7QsdCy0L3QvtC70LXQvdC40Y8g0YHQviDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0c2hvd1ByZXZpb3VzQWR2aWNlKCkge1xuXHRcdGNvbnN0IHByZXZpb3VzQWR2aWNlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxQQlhMYW5ndWFnZX1gKTtcblx0XHRpZiAocHJldmlvdXNBZHZpY2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlcy5odG1sKHByZXZpb3VzQWR2aWNlKTtcblx0XHR9XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9YWR2aWNlcy9nZXRBZHZpY2VzYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRhZHZpY2VzV29ya2VyLmNiQWZ0ZXJSZXNwb25zZShyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0XHRhZHZpY2VzV29ya2VyLnRpbWVvdXRIYW5kbGUgPSB3aW5kb3cuc2V0VGltZW91dChcblx0XHRcdGFkdmljZXNXb3JrZXIud29ya2VyLFxuXHRcdFx0YWR2aWNlc1dvcmtlci50aW1lT3V0LFxuXHRcdCk7XG5cdH0sXG5cdGNiQWZ0ZXJSZXNwb25zZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG5cdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlcy5odG1sKCcnKTtcblx0XHRpZiAocmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZVxuXHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsZXQgaHRtbE1lc3NhZ2VzID0gJyc7XG5cdFx0XHRpZiAocmVzcG9uc2UubWVzc2FnZS5lcnJvciAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLm1lc3NhZ2UuZXJyb3IubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJ1aSBpY29uIGVycm9yIG1lc3NhZ2VcIj4nO1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwieCBpY29uXCI+PC9pPic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5hZHZfTWVzc2FnZXNIZWFkZXJFcnJvcn08L2Rpdj5gO1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzx1bCBjbGFzcz1cImxpc3RcIj4nO1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS5lcnJvciwgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxsaT4ke3ZhbHVlfTwvbGk+YDtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC91bD4nO1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZS53YXJuaW5nICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZS53YXJuaW5nLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwidWkgaWNvbiB3YXJuaW5nIG1lc3NhZ2VcIj4nO1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwid2FybmluZyBpY29uXCI+PC9pPic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5hZHZfTWVzc2FnZXNIZWFkZXJ9PC9kaXY+YDtcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8dWwgY2xhc3M9XCJsaXN0XCI+Jztcblx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2Uud2FybmluZywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxsaT4ke3ZhbHVlfTwvbGk+YDtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC91bD4nO1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZS5pbmZvICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZS5pbmZvLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwidWkgaWNvbiBpbmZvIG1lc3NhZ2VcIj4nO1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwiaW5mbyBpY29uXCI+PC9pPic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5hZHZfTWVzc2FnZXNIZWFkZXJ9PC9kaXY+YDtcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8dWwgY2xhc3M9XCJsaXN0XCI+Jztcblx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UuaW5mbywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxsaT4ke3ZhbHVlfTwvbGk+YDtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC91bD4nO1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdH1cblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbChodG1sTWVzc2FnZXMpO1xuXHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxQQlhMYW5ndWFnZX1gLCBodG1sTWVzc2FnZXMpO1xuXG5cdFx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC10YHRgtGMINC70Lgg0L7QsdC90L7QstC70LXQvdC40LUg0YHQuNGB0YLQtdC80Ytcblx0XHRcdCQoJ2FbaHJlZj1cIi9hZG1pbi1jYWJpbmV0L3VwZGF0ZS9pbmRleC9cIl0gPiBpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlLmluZm8gIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlLmluZm8ubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS5pbmZvLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGlmICh2YWx1ZS5pbmRleE9mKCcvYWRtaW4tY2FiaW5ldC91cGRhdGUvaW5kZXgvJykgPiAtMSkge1xuXHRcdFx0XHRcdFx0JCgnYVtocmVmPVwiL2FkbWluLWNhYmluZXQvdXBkYXRlL2luZGV4L1wiXSA+IGknKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5zdWNjZXNzID09PSB0cnVlXG5cdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIHJlc3BvbnNlLm1lc3NhZ2UubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFBCWExhbmd1YWdlfWApO1xuXHRcdH1cblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0YWR2aWNlc1dvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==