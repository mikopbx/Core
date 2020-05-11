"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalWebAdminLanguage, sessionStorage */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2VzL2FkdmljZXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImFkdmljZXNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRhZHZpY2VzIiwiJCIsIiRhZHZpY2VzQmVsbEJ1dHRvbiIsImluaXRpYWxpemUiLCJzaG93UHJldmlvdXNBZHZpY2UiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25EYXRhQ2hhbmdlZCIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJzZXNzaW9uU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwicHJldmlvdXNBZHZpY2VCZWxsIiwiZ2V0SXRlbSIsInVuZGVmaW5lZCIsImh0bWwiLCJwcmV2aW91c0FkdmljZSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJvbiIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwiY2JBZnRlclJlc3BvbnNlIiwib25FcnJvciIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJsb2NhdGlvbiIsInN1Y2Nlc3MiLCJtZXNzYWdlIiwiaHRtbE1lc3NhZ2VzIiwiY291bnRNZXNzYWdlcyIsImljb25CZWxsQ2xhc3MiLCJpbmZvIiwibGVuZ3RoIiwiZWFjaCIsImtleSIsInZhbHVlIiwid2FybmluZyIsImVycm9yIiwic2V0SXRlbSIsInBvcHVwIiwicG9zaXRpb24iLCJkZWxheSIsInNob3ciLCJoaWRlIiwiZmluZCIsInRyYW5zaXRpb24iLCJzZXRUaW1lb3V0IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLGFBQWEsR0FBRztBQUNyQkMsRUFBQUEsT0FBTyxFQUFFLE1BRFk7QUFFckJDLEVBQUFBLGFBQWEsRUFBRSxFQUZNO0FBR3JCQyxFQUFBQSxRQUFRLEVBQUVD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akMsQ0FBc0MsR0FBdEMsRUFDRUMsVUFERixDQUNhLGFBRGIsRUFFRUEsVUFGRixDQUVhLE9BRmIsRUFFc0IsUUFGdEI7QUFHQXhDLFFBQUFBLGNBQWMsQ0FBQ2lDLE9BQWYsNkJBQTRDL0Isc0JBQTVDLEdBQXNFakIsYUFBYSxDQUFDSyxrQkFBZCxDQUFpQ2dCLElBQWpDLEVBQXRFO0FBQ0FyQixRQUFBQSxhQUFhLENBQUNhLGFBQWQsR0FBOEJKLE1BQU0sQ0FBQytDLFVBQVAsQ0FDN0J4RCxhQUFhLENBQUNjLE1BRGUsRUFFN0JkLGFBQWEsQ0FBQ0MsT0FGZSxDQUE5QjtBQUlBLE9BN0VELE1BNkVPLElBQUkyQixRQUFRLENBQUNRLE9BQVQsS0FBcUIsSUFBckIsSUFDUFIsUUFBUSxDQUFDUyxPQUFULEtBQXFCakIsU0FEZCxJQUVQUSxRQUFRLENBQUNTLE9BQVQsQ0FBaUJLLE1BQWpCLEtBQTRCLENBRnpCLEVBRTRCO0FBQ2xDM0IsUUFBQUEsY0FBYyxDQUFDQyxVQUFmLHlCQUEyQ0Msc0JBQTNDO0FBQ0FGLFFBQUFBLGNBQWMsQ0FBQ0MsVUFBZiw2QkFBK0NDLHNCQUEvQztBQUNBakIsUUFBQUEsYUFBYSxDQUFDSyxrQkFBZCxDQUNFZ0IsSUFERixDQUNPLHdDQURQO0FBRUE7QUFDRDs7QUExSW9CO0FBQUE7QUFBQSxDQUF0QjtBQTZJQWpCLENBQUMsQ0FBQ3FELFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkIxRCxFQUFBQSxhQUFhLENBQUNNLFVBQWQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBzZXNzaW9uU3RvcmFnZSAqL1xuXG5jb25zdCBhZHZpY2VzV29ya2VyID0ge1xuXHR0aW1lT3V0OiAzMDAwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHQkYWR2aWNlczogJCgnI2FkdmljZXMnKSxcblx0JGFkdmljZXNCZWxsQnV0dG9uOiAkKCcjc2hvdy1hZHZpY2VzLWJ1dHRvbicpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGFkdmljZXNXb3JrZXIuc2hvd1ByZXZpb3VzQWR2aWNlKCk7XG5cdFx0Ly8g0JfQsNC/0YPRgdGC0LjQvCDQv9C+0LvRg9GH0LXQvdC40LUg0L3QvtCy0YvRhSDRgdC+0LLQtdGC0L7QslxuXHRcdGFkdmljZXNXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIGFkdmljZXNXb3JrZXIuY2JPbkRhdGFDaGFuZ2VkKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGFkdmljZXNXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0YWR2aWNlc1dvcmtlci53b3JrZXIoKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDRgdC+0LHRi9GC0LjRjyDRgdC80LXQvdGLINGP0LfRi9C60LAg0LjQu9C4INC00LDQvdC90YvRhVxuXHQgKi9cblx0Y2JPbkRhdGFDaGFuZ2VkKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRhZHZpY2VzV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QutCw0LfRi9Cy0LDQtdGCINGB0YLQsNGA0YvQtSDRgdC+0LLQtdGC0Ysg0LTQviDQv9C+0LvRg9GH0LXQvdC40Y8g0L7QsdCy0L3QvtC70LXQvdC40Y8g0YHQviDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0c2hvd1ByZXZpb3VzQWR2aWNlKCkge1xuXHRcdGNvbnN0IHByZXZpb3VzQWR2aWNlQmVsbCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRpZiAocHJldmlvdXNBZHZpY2VCZWxsICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uLmh0bWwocHJldmlvdXNBZHZpY2VCZWxsKTtcblx0XHR9XG5cdFx0Y29uc3QgcHJldmlvdXNBZHZpY2UgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGBwcmV2aW91c0FkdmljZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRpZiAocHJldmlvdXNBZHZpY2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlcy5odG1sKHByZXZpb3VzQWR2aWNlKTtcblx0XHR9XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9YWR2aWNlcy9nZXRBZHZpY2VzYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRhZHZpY2VzV29ya2VyLmNiQWZ0ZXJSZXNwb25zZShyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0Y2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQpIHJldHVybjtcblx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzLmh0bWwoJycpO1xuXHRcdGlmIChyZXNwb25zZS5zdWNjZXNzID09PSB0cnVlXG5cdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGxldCBodG1sTWVzc2FnZXMgPSAnJztcblx0XHRcdGxldCBjb3VudE1lc3NhZ2VzID0gMDtcblx0XHRcdGxldCBpY29uQmVsbENsYXNzID0gJyc7XG5cdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJ1aSByZWxheGVkIGRpdmlkZWQgbGlzdFwiPic7XG5cdFx0XHRpZiAocmVzcG9uc2UubWVzc2FnZS5pbmZvICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZS5pbmZvLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UuaW5mbywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwic21pbGUgb3V0bGluZSBpY29uXCI+PC9pPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHt2YWx1ZX08L2Rpdj5gO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0Y291bnRNZXNzYWdlcyArPSAxO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0aWNvbkJlbGxDbGFzcyA9ICdibHVlIGljb24gYmVsbCc7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2UubWVzc2FnZS53YXJuaW5nICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZS53YXJuaW5nLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2Uud2FybmluZywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwibWVoIG91dGxpbmUgaWNvblwiPjwvaT4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7dmFsdWV9PC9kaXY+YDtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGNvdW50TWVzc2FnZXMgKz0gMTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGljb25CZWxsQ2xhc3MgPSAneWVsbG93IGljb24gYmVsbCc7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2UubWVzc2FnZS5lcnJvciAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLm1lc3NhZ2UuZXJyb3IubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS5lcnJvciwgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwiZnJvd24gb3V0bGluZSBpY29uXCI+PC9pPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHt2YWx1ZX08L2Rpdj5gO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0Y291bnRNZXNzYWdlcyArPSAxO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0aWNvbkJlbGxDbGFzcyA9ICdyZWQgbGFyZ2UgaWNvbiBiZWxsJztcblx0XHRcdH1cblx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbChodG1sTWVzc2FnZXMpO1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCwgaHRtbE1lc3NhZ2VzKTtcblxuXHRcdFx0Ly8gLy8g0J/RgNC+0LLQtdGA0LjQvCDQtdGB0YLRjCDQu9C4INC+0LHQvdC+0LLQu9C10L3QuNC1INGB0LjRgdGC0LXQvNGLXG5cdFx0XHQvLyAkKCdhW2hyZWY9XCIvYWRtaW4tY2FiaW5ldC91cGRhdGUvaW5kZXgvXCJdID4gaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHQvLyBpZiAocmVzcG9uc2UubWVzc2FnZS5pbmZvICE9PSB1bmRlZmluZWRcblx0XHRcdC8vIFx0JiYgcmVzcG9uc2UubWVzc2FnZS5pbmZvLmxlbmd0aCA+IDApIHtcblx0XHRcdC8vIFx0JC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UuaW5mbywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdC8vIFx0XHRpZiAodmFsdWUuaW5kZXhPZignL2FkbWluLWNhYmluZXQvdXBkYXRlL2luZGV4LycpID4gLTEpIHtcblx0XHRcdC8vIFx0XHRcdCQoJ2FbaHJlZj1cIi9hZG1pbi1jYWJpbmV0L3VwZGF0ZS9pbmRleC9cIl0gPiBpJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdC8vIFx0XHR9XG5cdFx0XHQvLyBcdH0pO1xuXHRcdFx0Ly8gfVxuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b25cblx0XHRcdFx0Lmh0bWwoYDxpIGNsYXNzPVwiJHtpY29uQmVsbENsYXNzfVwiPjwvaT4ke2NvdW50TWVzc2FnZXN9YClcblx0XHRcdFx0LnBvcHVwKHtcblx0XHRcdFx0XHRwb3NpdGlvbjogJ2JvdHRvbSBsZWZ0Jyxcblx0XHRcdFx0XHRwb3B1cDogYWR2aWNlc1dvcmtlci4kYWR2aWNlcyxcblx0XHRcdFx0XHRkZWxheToge1xuXHRcdFx0XHRcdFx0c2hvdzogMzAwLFxuXHRcdFx0XHRcdFx0aGlkZTogMTAwMDAsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSk7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5maW5kKCdpJylcblx0XHRcdFx0LnRyYW5zaXRpb24oJ3NldCBsb29waW5nJylcblx0XHRcdFx0LnRyYW5zaXRpb24oJ3B1bHNlJywgJzEwMDBtcycpO1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNBZHZpY2VCZWxsJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWAsIGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uLmh0bWwoKSk7XG5cdFx0XHRhZHZpY2VzV29ya2VyLnRpbWVvdXRIYW5kbGUgPSB3aW5kb3cuc2V0VGltZW91dChcblx0XHRcdFx0YWR2aWNlc1dvcmtlci53b3JrZXIsXG5cdFx0XHRcdGFkdmljZXNXb3JrZXIudGltZU91dCxcblx0XHRcdCk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5zdWNjZXNzID09PSB0cnVlXG5cdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIHJlc3BvbnNlLm1lc3NhZ2UubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0FkdmljZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uXG5cdFx0XHRcdC5odG1sKCc8aSBjbGFzcz1cImdyZXkgaWNvbiBiZWxsIG91dGxpbmVcIj48L2k+Jyk7XG5cdFx0fVxuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRhZHZpY2VzV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19