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
      setTimeout(advicesWorker.restartWorker, 3000);
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
      PbxApi.AdvicesGetList(advicesWorker.cbAfterResponse);
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(response) {
      if (response === false) {
        return;
      }

      advicesWorker.$advices.html('');

      if (response.advices !== undefined) {
        var htmlMessages = '';
        var countMessages = 0;
        var iconBellClass = '';
        htmlMessages += '<div class="ui relaxed divided list">';

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

    return cbAfterResponse;
  }()
};
$(document).ready(function () {
  advicesWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2VzL2FkdmljZXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImFkdmljZXNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRhZHZpY2VzIiwiJCIsIiRhZHZpY2VzQmVsbEJ1dHRvbiIsImluaXRpYWxpemUiLCJzaG93UHJldmlvdXNBZHZpY2UiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25EYXRhQ2hhbmdlZCIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJzZXNzaW9uU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwic2V0VGltZW91dCIsInByZXZpb3VzQWR2aWNlQmVsbCIsImdldEl0ZW0iLCJ1bmRlZmluZWQiLCJodG1sIiwicHJldmlvdXNBZHZpY2UiLCJQYnhBcGkiLCJBZHZpY2VzR2V0TGlzdCIsImNiQWZ0ZXJSZXNwb25zZSIsInJlc3BvbnNlIiwiYWR2aWNlcyIsImh0bWxNZXNzYWdlcyIsImNvdW50TWVzc2FnZXMiLCJpY29uQmVsbENsYXNzIiwiZXJyb3IiLCJsZW5ndGgiLCJlYWNoIiwia2V5IiwidmFsdWUiLCJ3YXJuaW5nIiwiaW5mbyIsInNldEl0ZW0iLCJwb3B1cCIsInBvc2l0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImZpbmQiLCJ0cmFuc2l0aW9uIiwic3VjY2VzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSxhQUFhLEdBQUc7QUFDckJDLEVBQUFBLE9BQU8sRUFBRSxNQURZO0FBRXJCQyxFQUFBQSxhQUFhLEVBQUUsRUFGTTtBQUdyQkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsVUFBRCxDQUhVO0FBSXJCQyxFQUFBQSxrQkFBa0IsRUFBRUQsQ0FBQyxDQUFDLHNCQUFELENBSkE7QUFLckJFLEVBQUFB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Q0FFYSxPQUZiLEVBRXNCLFFBRnRCO0FBR0EsU0FkRCxNQWNPO0FBQ045QyxVQUFBQSxhQUFhLENBQUNLLGtCQUFkLENBQ0VpQixJQURGO0FBRUE7O0FBQ0RQLFFBQUFBLGNBQWMsQ0FBQ3dCLE9BQWYsNkJBQTRDdEIsc0JBQTVDLEdBQXNFakIsYUFBYSxDQUFDSyxrQkFBZCxDQUFpQ2lCLElBQWpDLEVBQXRFO0FBQ0F0QixRQUFBQSxhQUFhLENBQUNhLGFBQWQsR0FBOEJKLE1BQU0sQ0FBQ1MsVUFBUCxDQUM3QmxCLGFBQWEsQ0FBQ2MsTUFEZSxFQUU3QmQsYUFBYSxDQUFDQyxPQUZlLENBQTlCO0FBSUEsT0FuRkQsTUFtRk8sSUFBSTBCLFFBQVEsQ0FBQ29CLE9BQVQsS0FBcUIsSUFBckIsSUFDUHBCLFFBQVEsQ0FBQ0MsT0FBVCxLQUFxQlAsU0FEZCxJQUVQTSxRQUFRLENBQUNDLE9BQVQsQ0FBaUJLLE1BQWpCLEtBQTRCLENBRnpCLEVBRTRCO0FBQ2xDbEIsUUFBQUEsY0FBYyxDQUFDQyxVQUFmLHlCQUEyQ0Msc0JBQTNDO0FBQ0FGLFFBQUFBLGNBQWMsQ0FBQ0MsVUFBZiw2QkFBK0NDLHNCQUEvQztBQUNBakIsUUFBQUEsYUFBYSxDQUFDSyxrQkFBZCxDQUNFaUIsSUFERixDQUNPLHdDQURQO0FBRUE7QUFDRDs7QUF2SW9CO0FBQUE7QUFBQSxDQUF0QjtBQTBJQWxCLENBQUMsQ0FBQzRDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJqRCxFQUFBQSxhQUFhLENBQUNNLFVBQWQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBzZXNzaW9uU3RvcmFnZSAqL1xuXG5jb25zdCBhZHZpY2VzV29ya2VyID0ge1xuXHR0aW1lT3V0OiAzMDAwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHQkYWR2aWNlczogJCgnI2FkdmljZXMnKSxcblx0JGFkdmljZXNCZWxsQnV0dG9uOiAkKCcjc2hvdy1hZHZpY2VzLWJ1dHRvbicpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGFkdmljZXNXb3JrZXIuc2hvd1ByZXZpb3VzQWR2aWNlKCk7XG5cdFx0Ly8g0JfQsNC/0YPRgdGC0LjQvCDQv9C+0LvRg9GH0LXQvdC40LUg0L3QvtCy0YvRhSDRgdC+0LLQtdGC0L7QslxuXHRcdGFkdmljZXNXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIGFkdmljZXNXb3JrZXIuY2JPbkRhdGFDaGFuZ2VkKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGFkdmljZXNXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0YWR2aWNlc1dvcmtlci53b3JrZXIoKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDRgdC+0LHRi9GC0LjRjyDRgdC80LXQvdGLINGP0LfRi9C60LAg0LjQu9C4INC00LDQvdC90YvRhVxuXHQgKi9cblx0Y2JPbkRhdGFDaGFuZ2VkKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRzZXRUaW1lb3V0KGFkdmljZXNXb3JrZXIucmVzdGFydFdvcmtlciwzMDAwKTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QutCw0LfRi9Cy0LDQtdGCINGB0YLQsNGA0YvQtSDRgdC+0LLQtdGC0Ysg0LTQviDQv9C+0LvRg9GH0LXQvdC40Y8g0L7QsdCy0L3QvtC70LXQvdC40Y8g0YHQviDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0c2hvd1ByZXZpb3VzQWR2aWNlKCkge1xuXHRcdGNvbnN0IHByZXZpb3VzQWR2aWNlQmVsbCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRpZiAocHJldmlvdXNBZHZpY2VCZWxsICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uLmh0bWwocHJldmlvdXNBZHZpY2VCZWxsKTtcblx0XHR9XG5cdFx0Y29uc3QgcHJldmlvdXNBZHZpY2UgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGBwcmV2aW91c0FkdmljZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRpZiAocHJldmlvdXNBZHZpY2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlcy5odG1sKHByZXZpb3VzQWR2aWNlKTtcblx0XHR9XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHRQYnhBcGkuQWR2aWNlc0dldExpc3QoYWR2aWNlc1dvcmtlci5jYkFmdGVyUmVzcG9uc2UpO1xuXHR9LFxuXHRjYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbCgnJyk7XG5cdFx0aWYgKHJlc3BvbnNlLmFkdmljZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bGV0IGh0bWxNZXNzYWdlcyA9ICcnO1xuXHRcdFx0bGV0IGNvdW50TWVzc2FnZXMgPSAwO1xuXHRcdFx0bGV0IGljb25CZWxsQ2xhc3MgPSAnJztcblx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cInVpIHJlbGF4ZWQgZGl2aWRlZCBsaXN0XCI+JztcblxuXHRcdFx0aWYgKHJlc3BvbnNlLmFkdmljZXMuZXJyb3IgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLmVycm9yLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLmFkdmljZXMuZXJyb3IsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8aSBjbGFzcz1cImZyb3duIG91dGxpbmUgcmVkIGljb25cIj48L2k+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCByZWQgaGVhZGVyXCI+JHt2YWx1ZX08L2Rpdj5gO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0Y291bnRNZXNzYWdlcyArPSAxO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZS5hZHZpY2VzLndhcm5pbmcgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLndhcm5pbmcubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UuYWR2aWNlcy53YXJuaW5nLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJtZWggb3V0bGluZSB5ZWxsb3cgaWNvblwiPjwvaT4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGRpdiBjbGFzcz1cInVpIHNtYWxsIGhlYWRlclwiPiR7dmFsdWV9PC9kaXY+YDtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGNvdW50TWVzc2FnZXMgKz0gMTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2UuYWR2aWNlcy5pbmZvICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcy5pbmZvLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLmFkdmljZXMuaW5mbywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwic21pbGUgb3V0bGluZSBibHVlIGljb25cIj48L2k+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBoZWFkZXJcIj4ke3ZhbHVlfTwvZGl2PmA7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRjb3VudE1lc3NhZ2VzICs9IDE7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocmVzcG9uc2UuYWR2aWNlcy5lcnJvciAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMuZXJyb3IubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRpY29uQmVsbENsYXNzID0gJ3JlZCBsYXJnZSBpY29uIGJlbGwnO1xuXHRcdFx0fSBlbHNlIGlmIChyZXNwb25zZS5hZHZpY2VzLndhcm5pbmcgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLndhcm5pbmcubGVuZ3RoID4gMCl7XG5cdFx0XHRcdGljb25CZWxsQ2xhc3MgPSAneWVsbG93IGljb24gYmVsbCc7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuYWR2aWNlcy5pbmZvICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcy5pbmZvLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRpY29uQmVsbENsYXNzID0gJ2JsdWUgaWNvbiBiZWxsJztcblx0XHRcdH1cblxuXG5cdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzLmh0bWwoaHRtbE1lc3NhZ2VzKTtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWAsIGh0bWxNZXNzYWdlcyk7XG5cblx0XHRcdGlmIChjb3VudE1lc3NhZ2VzPjApe1xuXHRcdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvblxuXHRcdFx0XHRcdC5odG1sKGA8aSBjbGFzcz1cIiR7aWNvbkJlbGxDbGFzc31cIj48L2k+JHtjb3VudE1lc3NhZ2VzfWApXG5cdFx0XHRcdFx0LnBvcHVwKHtcblx0XHRcdFx0XHRcdHBvc2l0aW9uOiAnYm90dG9tIGxlZnQnLFxuXHRcdFx0XHRcdFx0cG9wdXA6IGFkdmljZXNXb3JrZXIuJGFkdmljZXMsXG5cdFx0XHRcdFx0XHRkZWxheToge1xuXHRcdFx0XHRcdFx0XHRzaG93OiAzMDAsXG5cdFx0XHRcdFx0XHRcdGhpZGU6IDEwMDAwLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b24uZmluZCgnaScpXG5cdFx0XHRcdFx0LnRyYW5zaXRpb24oJ3NldCBsb29waW5nJylcblx0XHRcdFx0XHQudHJhbnNpdGlvbigncHVsc2UnLCAnMTAwMG1zJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvblxuXHRcdFx0XHRcdC5odG1sKGA8aSBjbGFzcz1cImdyZXkgaWNvbiBiZWxsXCI+PC9pPmApXG5cdFx0XHR9XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGBwcmV2aW91c0FkdmljZUJlbGwke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCwgYWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b24uaHRtbCgpKTtcblx0XHRcdGFkdmljZXNXb3JrZXIudGltZW91dEhhbmRsZSA9IHdpbmRvdy5zZXRUaW1lb3V0KFxuXHRcdFx0XHRhZHZpY2VzV29ya2VyLndvcmtlcixcblx0XHRcdFx0YWR2aWNlc1dvcmtlci50aW1lT3V0LFxuXHRcdFx0KTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWVcblx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMgIT09IHVuZGVmaW5lZFxuXHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2VCZWxsJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b25cblx0XHRcdFx0Lmh0bWwoJzxpIGNsYXNzPVwiZ3JleSBpY29uIGJlbGwgb3V0bGluZVwiPjwvaT4nKTtcblx0XHR9XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGFkdmljZXNXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=