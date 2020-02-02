"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate */
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
      var previousAdvice = localStorage.getItem('previousAdvice');

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
        localStorage.setItem('previousAdvice', htmlMessages); // Проверим есть ли обновление системы

        $('a[href="/admin-cabinet/update/index/"] > i').removeClass('loading');

        if (response.message.info !== undefined && response.message.info.length > 0) {
          $.each(response.message.info, function (key, value) {
            if (value.indexOf('/admin-cabinet/update/index/') > -1) {
              $('a[href="/admin-cabinet/update/index/"] > i').addClass('loading');
            }
          });
        }
      } else if (response.success === true && response.message !== undefined && response.message.length === 0) {
        localStorage.removeItem('previousAdvice');
      }
    }

    return cbAfterResponse;
  }()
};
$(document).ready(function () {
  advicesWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2VzL2FkdmljZXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImFkdmljZXNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRhZHZpY2VzIiwiJCIsImluaXRpYWxpemUiLCJzaG93UHJldmlvdXNBZHZpY2UiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJwcmV2aW91c0FkdmljZSIsImxvY2FsU3RvcmFnZSIsImdldEl0ZW0iLCJ1bmRlZmluZWQiLCJodG1sIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJjYkFmdGVyUmVzcG9uc2UiLCJvbkVycm9yIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsImxvY2F0aW9uIiwic2V0VGltZW91dCIsInN1Y2Nlc3MiLCJtZXNzYWdlIiwiaHRtbE1lc3NhZ2VzIiwiZXJyb3IiLCJsZW5ndGgiLCJnbG9iYWxUcmFuc2xhdGUiLCJhZHZfTWVzc2FnZXNIZWFkZXJFcnJvciIsImVhY2giLCJrZXkiLCJ2YWx1ZSIsIndhcm5pbmciLCJhZHZfTWVzc2FnZXNIZWFkZXIiLCJpbmZvIiwic2V0SXRlbSIsInJlbW92ZUNsYXNzIiwiaW5kZXhPZiIsImFkZENsYXNzIiwicmVtb3ZlSXRlbSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSxhQUFhLEdBQUc7QUFDckJDLEVBQUFBLE9BQU8sRUFBRSxNQURZO0FBRXJCQyxFQUFBQSxhQUFhLEVBQUUsRUFGTTtBQUdyQkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsVUFBRCxDQUhVO0FBSXJCQyxFQUFBQSxVQUpxQjtBQUFBLDBCQUlSO0FBQ1pMLE1BQUFBLGFBQWEsQ0FBQ00sa0JBQWQs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LENBQUM4QyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCbkQsRUFBQUEsYUFBYSxDQUFDSyxVQUFkO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbmNvbnN0IGFkdmljZXNXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdCRhZHZpY2VzOiAkKCcjYWR2aWNlcycpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGFkdmljZXNXb3JrZXIuc2hvd1ByZXZpb3VzQWR2aWNlKCk7XG5cdFx0Ly8g0JfQsNC/0YPRgdGC0LjQvCDQv9C+0LvRg9GH0LXQvdC40LUg0L3QvtCy0YvRhSDRgdC+0LLQtdGC0L7QslxuXHRcdGFkdmljZXNXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIGFkdmljZXNXb3JrZXIucmVzdGFydFdvcmtlcik7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChhZHZpY2VzV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdGFkdmljZXNXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LrQsNC30YvQstCw0LXRgiDRgdGC0LDRgNGL0LUg0YHQvtCy0LXRgtGLINC00L4g0L/QvtC70YPRh9C10L3QuNGPINC+0LHQstC90L7Qu9C10L3QuNGPINGB0L4g0YHRgtCw0L3RhtC40Lhcblx0ICovXG5cdHNob3dQcmV2aW91c0FkdmljZSgpIHtcblx0XHRjb25zdCBwcmV2aW91c0FkdmljZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwcmV2aW91c0FkdmljZScpO1xuXHRcdGlmIChwcmV2aW91c0FkdmljZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzLmh0bWwocHJldmlvdXNBZHZpY2UpO1xuXHRcdH1cblx0fSxcblx0d29ya2VyKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1hZHZpY2VzL2dldEFkdmljZXNgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGFkdmljZXNXb3JrZXIuY2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdGFkdmljZXNXb3JrZXIudGltZW91dEhhbmRsZSA9IHdpbmRvdy5zZXRUaW1lb3V0KFxuXHRcdFx0YWR2aWNlc1dvcmtlci53b3JrZXIsXG5cdFx0XHRhZHZpY2VzV29ya2VyLnRpbWVPdXQsXG5cdFx0KTtcblx0fSxcblx0Y2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQpIHJldHVybjtcblx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzLmh0bWwoJycpO1xuXHRcdGlmIChyZXNwb25zZS5zdWNjZXNzID09PSB0cnVlXG5cdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGxldCBodG1sTWVzc2FnZXMgPSAnJztcblx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlLmVycm9yICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZS5lcnJvci5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cInVpIGljb24gZXJyb3IgbWVzc2FnZVwiPic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJ4IGljb25cIj48L2k+Jztcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmFkdl9NZXNzYWdlc0hlYWRlckVycm9yfTwvZGl2PmA7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPHVsIGNsYXNzPVwibGlzdFwiPic7XG5cdFx0XHRcdCQuZWFjaChyZXNwb25zZS5tZXNzYWdlLmVycm9yLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGxpPiR7dmFsdWV9PC9saT5gO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L3VsPic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0fSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlLndhcm5pbmcgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlLndhcm5pbmcubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJ1aSBpY29uIHdhcm5pbmcgbWVzc2FnZVwiPic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJ3YXJuaW5nIGljb25cIj48L2k+Jztcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmFkdl9NZXNzYWdlc0hlYWRlcn08L2Rpdj5gO1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzx1bCBjbGFzcz1cImxpc3RcIj4nO1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS53YXJuaW5nLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGxpPiR7dmFsdWV9PC9saT5gO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L3VsPic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0fSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlLmluZm8gIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlLmluZm8ubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJ1aSBpY29uIGluZm8gbWVzc2FnZVwiPic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJpbmZvIGljb25cIj48L2k+Jztcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmFkdl9NZXNzYWdlc0hlYWRlcn08L2Rpdj5gO1xuXHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzx1bCBjbGFzcz1cImxpc3RcIj4nO1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS5pbmZvLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGxpPiR7dmFsdWV9PC9saT5gO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L3VsPic7XG5cdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0fVxuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlcy5odG1sKGh0bWxNZXNzYWdlcyk7XG5cdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncHJldmlvdXNBZHZpY2UnLCBodG1sTWVzc2FnZXMpO1xuXG5cdFx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC10YHRgtGMINC70Lgg0L7QsdC90L7QstC70LXQvdC40LUg0YHQuNGB0YLQtdC80Ytcblx0XHRcdCQoJ2FbaHJlZj1cIi9hZG1pbi1jYWJpbmV0L3VwZGF0ZS9pbmRleC9cIl0gPiBpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlLmluZm8gIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlLmluZm8ubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS5pbmZvLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGlmICh2YWx1ZS5pbmRleE9mKCcvYWRtaW4tY2FiaW5ldC91cGRhdGUvaW5kZXgvJykgPiAtMSkge1xuXHRcdFx0XHRcdFx0JCgnYVtocmVmPVwiL2FkbWluLWNhYmluZXQvdXBkYXRlL2luZGV4L1wiXSA+IGknKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5zdWNjZXNzID09PSB0cnVlXG5cdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIHJlc3BvbnNlLm1lc3NhZ2UubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgncHJldmlvdXNBZHZpY2UnKTtcblx0XHR9XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGFkdmljZXNXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=