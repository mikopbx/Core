"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalWebAdminLanguage */
var advicesWorker = {
  timeOut: 300000,
  timeOutHandle: '',
  $advices: $('#advices'),
  $advicesBellButton: $('#show-advices-button'),
  initialize: function () {
    function initialize() {
      advicesWorker.showPreviousAdvice(); // Запустим получение новых советов

      advicesWorker.restartWorker();
      window.addEventListener('ConfigDataChanged', advicesWorker.cbOnDataChanged);
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
   * Обработка события смены языка или данных
   */
  cbOnDataChanged: function () {
    function cbOnDataChanged() {
      sessionStorage.removeItem("previousAdvice".concat(globalWebAdminLanguage));
      sessionStorage.removeItem("previousAdviceBell".concat(globalWebAdminLanguage));
      advicesWorker.restartWorker();
    }

    return cbOnDataChanged;
  }(),

  /**
   * Показывает старые советы до получения обвноления со станции
   */
  showPreviousAdvice: function () {
    function showPreviousAdvice() {
      var previousAdviceBell = sessionStorage.getItem("previousAdviceBell".concat(globalWebAdminLanguage));

      if (previousAdviceBell !== undefined) {
        advicesWorker.$advicesBellButton.html(previousAdviceBell);
      }

      var previousAdvice = sessionStorage.getItem("previousAdvice".concat(globalWebAdminLanguage));

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
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(response) {
      if (response === undefined) return;
      advicesWorker.$advices.html('');

      if (response.success === true && response.message !== undefined) {
        var htmlMessages = '';
        var countMessages = 0;
        var iconBellClass = '';
        htmlMessages += '<div class="ui relaxed divided list">';

        if (response.message.info !== undefined && response.message.info.length > 0) {
          $.each(response.message.info, function (key, value) {
            htmlMessages += '<div class="item">';
            htmlMessages += '<i class="smile outline icon"></i>';
            htmlMessages += '<div class="content">';
            htmlMessages += "<div class=\"header\">".concat(value, "</div>");
            htmlMessages += '</div>';
            htmlMessages += '</div>';
            countMessages += 1;
          });
          iconBellClass = 'blue icon bell';
        }

        if (response.message.warning !== undefined && response.message.warning.length > 0) {
          $.each(response.message.warning, function (key, value) {
            htmlMessages += '<div class="item">';
            htmlMessages += '<i class="meh outline icon"></i>';
            htmlMessages += '<div class="content">';
            htmlMessages += "<div class=\"header\">".concat(value, "</div>");
            htmlMessages += '</div>';
            htmlMessages += '</div>';
            countMessages += 1;
          });
          iconBellClass = 'yellow icon bell';
        }

        if (response.message.error !== undefined && response.message.error.length > 0) {
          $.each(response.message.error, function (key, value) {
            htmlMessages += '<div class="item">';
            htmlMessages += '<i class="frown outline icon"></i>';
            htmlMessages += '<div class="content">';
            htmlMessages += "<div class=\"header\">".concat(value, "</div>");
            htmlMessages += '</div>';
            htmlMessages += '</div>';
            countMessages += 1;
          });
          iconBellClass = 'red large icon bell';
        }

        htmlMessages += '</div>';
        advicesWorker.$advices.html(htmlMessages);
        sessionStorage.setItem("previousAdvice".concat(globalWebAdminLanguage), htmlMessages); // // Проверим есть ли обновление системы
        // $('a[href="/admin-cabinet/update/index/"] > i').removeClass('loading');
        // if (response.message.info !== undefined
        // 	&& response.message.info.length > 0) {
        // 	$.each(response.message.info, (key, value) => {
        // 		if (value.indexOf('/admin-cabinet/update/index/') > -1) {
        // 			$('a[href="/admin-cabinet/update/index/"] > i').addClass('loading');
        // 		}
        // 	});
        // }

        advicesWorker.$advicesBellButton.html("<i class=\"".concat(iconBellClass, "\"></i>").concat(countMessages)).popup({
          position: 'bottom left',
          popup: advicesWorker.$advices,
          delay: {
            show: 300,
            hide: 10000
          }
        });
        advicesWorker.$advicesBellButton.find('i').transition('set looping').transition('pulse', '1000ms');
        sessionStorage.setItem("previousAdviceBell".concat(globalWebAdminLanguage), advicesWorker.$advicesBellButton.html());
        advicesWorker.timeoutHandle = window.setTimeout(advicesWorker.worker, advicesWorker.timeOut);
      } else if (response.success === true && response.message !== undefined && response.message.length === 0) {
        sessionStorage.removeItem("previousAdvice".concat(globalWebAdminLanguage));
        sessionStorage.removeItem("previousAdviceBell".concat(globalWebAdminLanguage));
        advicesWorker.$advicesBellButton.html('<i class="grey icon bell outline"></i>');
      }
    }

    return cbAfterResponse;
  }()
};
$(document).ready(function () {
  advicesWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2VzL2FkdmljZXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImFkdmljZXNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRhZHZpY2VzIiwiJCIsIiRhZHZpY2VzQmVsbEJ1dHRvbiIsImluaXRpYWxpemUiLCJzaG93UHJldmlvdXNBZHZpY2UiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25EYXRhQ2hhbmdlZCIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJzZXNzaW9uU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwicHJldmlvdXNBZHZpY2VCZWxsIiwiZ2V0SXRlbSIsInVuZGVmaW5lZCIsImh0bWwiLCJwcmV2aW91c0FkdmljZSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJvbiIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwiY2JBZnRlclJlc3BvbnNlIiwib25FcnJvciIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJsb2NhdGlvbiIsInN1Y2Nlc3MiLCJtZXNzYWdlIiwiaHRtbE1lc3NhZ2VzIiwiY291bnRNZXNzYWdlcyIsImljb25CZWxsQ2xhc3MiLCJpbmZvIiwibGVuZ3RoIiwiZWFjaCIsImtleSIsInZhbHVlIiwid2FybmluZyIsImVycm9yIiwic2V0SXRlbSIsInBvcHVwIiwicG9zaXRpb24iLCJkZWxheSIsInNob3ciLCJoaWRlIiwiZmluZCIsInRyYW5zaXRpb24iLCJzZXRUaW1lb3V0IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLGFBQWEsR0FBRztBQUNyQkMsRUFBQUEsT0FBTyxFQUFFLE1BRFk7QUFFckJDLEVBQUFBLGFBQWEsRUFBRSxFQUZNO0FBR3JCQyxFQUFBQSxRQUFRLEVBQUVD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akMsQ0FBc0MsR0FBdEMsRUFDRUMsVUFERixDQUNhLGFBRGIsRUFFRUEsVUFGRixDQUVhLE9BRmIsRUFFc0IsUUFGdEI7QUFHQXhDLFFBQUFBLGNBQWMsQ0FBQ2lDLE9BQWYsNkJBQTRDL0Isc0JBQTVDLEdBQXNFakIsYUFBYSxDQUFDSyxrQkFBZCxDQUFpQ2dCLElBQWpDLEVBQXRFO0FBQ0FyQixRQUFBQSxhQUFhLENBQUNhLGFBQWQsR0FBOEJKLE1BQU0sQ0FBQytDLFVBQVAsQ0FDN0J4RCxhQUFhLENBQUNjLE1BRGUsRUFFN0JkLGFBQWEsQ0FBQ0MsT0FGZSxDQUE5QjtBQUlBLE9BN0VELE1BNkVPLElBQUkyQixRQUFRLENBQUNRLE9BQVQsS0FBcUIsSUFBckIsSUFDUFIsUUFBUSxDQUFDUyxPQUFULEtBQXFCakIsU0FEZCxJQUVQUSxRQUFRLENBQUNTLE9BQVQsQ0FBaUJLLE1BQWpCLEtBQTRCLENBRnpCLEVBRTRCO0FBQ2xDM0IsUUFBQUEsY0FBYyxDQUFDQyxVQUFmLHlCQUEyQ0Msc0JBQTNDO0FBQ0FGLFFBQUFBLGNBQWMsQ0FBQ0MsVUFBZiw2QkFBK0NDLHNCQUEvQztBQUNBakIsUUFBQUEsYUFBYSxDQUFDSyxrQkFBZCxDQUNFZ0IsSUFERixDQUNPLHdDQURQO0FBRUE7QUFDRDs7QUExSW9CO0FBQUE7QUFBQSxDQUF0QjtBQTZJQWpCLENBQUMsQ0FBQ3FELFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkIxRCxFQUFBQSxhQUFhLENBQUNNLFVBQWQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlICovXG5cbmNvbnN0IGFkdmljZXNXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdCRhZHZpY2VzOiAkKCcjYWR2aWNlcycpLFxuXHQkYWR2aWNlc0JlbGxCdXR0b246ICQoJyNzaG93LWFkdmljZXMtYnV0dG9uJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0YWR2aWNlc1dvcmtlci5zaG93UHJldmlvdXNBZHZpY2UoKTtcblx0XHQvLyDQl9Cw0L/Rg9GB0YLQuNC8INC/0L7Qu9GD0YfQtdC90LjQtSDQvdC+0LLRi9GFINGB0L7QstC10YLQvtCyXG5cdFx0YWR2aWNlc1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgYWR2aWNlc1dvcmtlci5jYk9uRGF0YUNoYW5nZWQpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoYWR2aWNlc1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRhZHZpY2VzV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINGB0L7QsdGL0YLQuNGPINGB0LzQtdC90Ysg0Y/Qt9GL0LrQsCDQuNC70Lgg0LTQsNC90L3Ri9GFXG5cdCAqL1xuXHRjYk9uRGF0YUNoYW5nZWQoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2VCZWxsJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdGFkdmljZXNXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC60LDQt9GL0LLQsNC10YIg0YHRgtCw0YDRi9C1INGB0L7QstC10YLRiyDQtNC+INC/0L7Qu9GD0YfQtdC90LjRjyDQvtCx0LLQvdC+0LvQtdC90LjRjyDRgdC+INGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRzaG93UHJldmlvdXNBZHZpY2UoKSB7XG5cdFx0Y29uc3QgcHJldmlvdXNBZHZpY2VCZWxsID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShgcHJldmlvdXNBZHZpY2VCZWxsJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdGlmIChwcmV2aW91c0FkdmljZUJlbGwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b24uaHRtbChwcmV2aW91c0FkdmljZUJlbGwpO1xuXHRcdH1cblx0XHRjb25zdCBwcmV2aW91c0FkdmljZSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdGlmIChwcmV2aW91c0FkdmljZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzLmh0bWwocHJldmlvdXNBZHZpY2UpO1xuXHRcdH1cblx0fSxcblx0d29ya2VyKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1hZHZpY2VzL2dldEFkdmljZXNgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGFkdmljZXNXb3JrZXIuY2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHRjYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbCgnJyk7XG5cdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWVcblx0XHRcdCYmIHJlc3BvbnNlLm1lc3NhZ2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bGV0IGh0bWxNZXNzYWdlcyA9ICcnO1xuXHRcdFx0bGV0IGNvdW50TWVzc2FnZXMgPSAwO1xuXHRcdFx0bGV0IGljb25CZWxsQ2xhc3MgPSAnJztcblx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cInVpIHJlbGF4ZWQgZGl2aWRlZCBsaXN0XCI+Jztcblx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlLmluZm8gIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlLmluZm8ubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS5pbmZvLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJzbWlsZSBvdXRsaW5lIGljb25cIj48L2k+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke3ZhbHVlfTwvZGl2PmA7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRjb3VudE1lc3NhZ2VzICs9IDE7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRpY29uQmVsbENsYXNzID0gJ2JsdWUgaWNvbiBiZWxsJztcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlLndhcm5pbmcgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlLndhcm5pbmcubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS53YXJuaW5nLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJtZWggb3V0bGluZSBpY29uXCI+PC9pPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHt2YWx1ZX08L2Rpdj5gO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0Y291bnRNZXNzYWdlcyArPSAxO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0aWNvbkJlbGxDbGFzcyA9ICd5ZWxsb3cgaWNvbiBiZWxsJztcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlLmVycm9yICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZS5lcnJvci5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQuZWFjaChyZXNwb25zZS5tZXNzYWdlLmVycm9yLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJmcm93biBvdXRsaW5lIGljb25cIj48L2k+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke3ZhbHVlfTwvZGl2PmA7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRjb3VudE1lc3NhZ2VzICs9IDE7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRpY29uQmVsbENsYXNzID0gJ3JlZCBsYXJnZSBpY29uIGJlbGwnO1xuXHRcdFx0fVxuXHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlcy5odG1sKGh0bWxNZXNzYWdlcyk7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGBwcmV2aW91c0FkdmljZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gLCBodG1sTWVzc2FnZXMpO1xuXG5cdFx0XHQvLyAvLyDQn9GA0L7QstC10YDQuNC8INC10YHRgtGMINC70Lgg0L7QsdC90L7QstC70LXQvdC40LUg0YHQuNGB0YLQtdC80Ytcblx0XHRcdC8vICQoJ2FbaHJlZj1cIi9hZG1pbi1jYWJpbmV0L3VwZGF0ZS9pbmRleC9cIl0gPiBpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdC8vIGlmIChyZXNwb25zZS5tZXNzYWdlLmluZm8gIT09IHVuZGVmaW5lZFxuXHRcdFx0Ly8gXHQmJiByZXNwb25zZS5tZXNzYWdlLmluZm8ubGVuZ3RoID4gMCkge1xuXHRcdFx0Ly8gXHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS5pbmZvLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0Ly8gXHRcdGlmICh2YWx1ZS5pbmRleE9mKCcvYWRtaW4tY2FiaW5ldC91cGRhdGUvaW5kZXgvJykgPiAtMSkge1xuXHRcdFx0Ly8gXHRcdFx0JCgnYVtocmVmPVwiL2FkbWluLWNhYmluZXQvdXBkYXRlL2luZGV4L1wiXSA+IGknKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0Ly8gXHRcdH1cblx0XHRcdC8vIFx0fSk7XG5cdFx0XHQvLyB9XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvblxuXHRcdFx0XHQuaHRtbChgPGkgY2xhc3M9XCIke2ljb25CZWxsQ2xhc3N9XCI+PC9pPiR7Y291bnRNZXNzYWdlc31gKVxuXHRcdFx0XHQucG9wdXAoe1xuXHRcdFx0XHRcdHBvc2l0aW9uOiAnYm90dG9tIGxlZnQnLFxuXHRcdFx0XHRcdHBvcHVwOiBhZHZpY2VzV29ya2VyLiRhZHZpY2VzLFxuXHRcdFx0XHRcdGRlbGF5OiB7XG5cdFx0XHRcdFx0XHRzaG93OiAzMDAsXG5cdFx0XHRcdFx0XHRoaWRlOiAxMDAwMCxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KTtcblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uLmZpbmQoJ2knKVxuXHRcdFx0XHQudHJhbnNpdGlvbignc2V0IGxvb3BpbmcnKVxuXHRcdFx0XHQudHJhbnNpdGlvbigncHVsc2UnLCAnMTAwMG1zJyk7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGBwcmV2aW91c0FkdmljZUJlbGwke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCwgYWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b24uaHRtbCgpKTtcblx0XHRcdGFkdmljZXNXb3JrZXIudGltZW91dEhhbmRsZSA9IHdpbmRvdy5zZXRUaW1lb3V0KFxuXHRcdFx0XHRhZHZpY2VzV29ya2VyLndvcmtlcixcblx0XHRcdFx0YWR2aWNlc1dvcmtlci50aW1lT3V0LFxuXHRcdFx0KTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWVcblx0XHRcdCYmIHJlc3BvbnNlLm1lc3NhZ2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZS5sZW5ndGggPT09IDApIHtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2VCZWxsJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b25cblx0XHRcdFx0Lmh0bWwoJzxpIGNsYXNzPVwiZ3JleSBpY29uIGJlbGwgb3V0bGluZVwiPjwvaT4nKTtcblx0XHR9XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGFkdmljZXNXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=