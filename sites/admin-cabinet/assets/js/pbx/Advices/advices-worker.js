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

        if (response.message.error !== undefined && response.message.error.length > 0) {
          $.each(response.message.error, function (key, value) {
            htmlMessages += '<div class="item">';
            htmlMessages += '<i class="frown outline red icon"></i>';
            htmlMessages += '<div class="content">';
            htmlMessages += "<div class=\"ui small red header\">".concat(value, "</div>");
            htmlMessages += '</div>';
            htmlMessages += '</div>';
            countMessages += 1;
          });
        }

        if (response.message.warning !== undefined && response.message.warning.length > 0) {
          $.each(response.message.warning, function (key, value) {
            htmlMessages += '<div class="item">';
            htmlMessages += '<i class="meh outline yellow icon"></i>';
            htmlMessages += '<div class="content">';
            htmlMessages += "<div class=\"ui small header\">".concat(value, "</div>");
            htmlMessages += '</div>';
            htmlMessages += '</div>';
            countMessages += 1;
          });
        }

        if (response.message.info !== undefined && response.message.info.length > 0) {
          $.each(response.message.info, function (key, value) {
            htmlMessages += '<div class="item">';
            htmlMessages += '<i class="smile outline blue icon"></i>';
            htmlMessages += '<div class="content">';
            htmlMessages += "<div class=\"ui small header\">".concat(value, "</div>");
            htmlMessages += '</div>';
            htmlMessages += '</div>';
            countMessages += 1;
          });
        }

        if (response.message.error !== undefined && response.message.error.length > 0) {
          iconBellClass = 'red large icon bell';
        } else if (response.message.warning !== undefined && response.message.warning.length > 0) {
          iconBellClass = 'yellow icon bell';
        } else if (response.message.info !== undefined && response.message.info.length > 0) {
          iconBellClass = 'blue icon bell';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2VzL2FkdmljZXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImFkdmljZXNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRhZHZpY2VzIiwiJCIsIiRhZHZpY2VzQmVsbEJ1dHRvbiIsImluaXRpYWxpemUiLCJzaG93UHJldmlvdXNBZHZpY2UiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25EYXRhQ2hhbmdlZCIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJzZXNzaW9uU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwicHJldmlvdXNBZHZpY2VCZWxsIiwiZ2V0SXRlbSIsInVuZGVmaW5lZCIsImh0bWwiLCJwcmV2aW91c0FkdmljZSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJvbiIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwiY2JBZnRlclJlc3BvbnNlIiwib25FcnJvciIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJsb2NhdGlvbiIsInN1Y2Nlc3MiLCJtZXNzYWdlIiwiaHRtbE1lc3NhZ2VzIiwiY291bnRNZXNzYWdlcyIsImljb25CZWxsQ2xhc3MiLCJlcnJvciIsImxlbmd0aCIsImVhY2giLCJrZXkiLCJ2YWx1ZSIsIndhcm5pbmciLCJpbmZvIiwic2V0SXRlbSIsInBvcHVwIiwicG9zaXRpb24iLCJkZWxheSIsInNob3ciLCJoaWRlIiwiZmluZCIsInRyYW5zaXRpb24iLCJzZXRUaW1lb3V0IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLGFBQWEsR0FBRztBQUNyQkMsRUFBQUEsT0FBTyxFQUFFLE1BRFk7QUFFckJDLEVBQUFBLGFBQWEsRUFBRSxFQUZNO0FBR3JCQyxFQUFBQSxRQUFRLEVBQUVD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LENBQUNLLGtCQUFkLENBQ0VnQixJQURGLENBQ08sd0NBRFA7QUFFQTtBQUNEOztBQXRKb0I7QUFBQTtBQUFBLENBQXRCO0FBeUpBakIsQ0FBQyxDQUFDcUQsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjFELEVBQUFBLGFBQWEsQ0FBQ00sVUFBZDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIHNlc3Npb25TdG9yYWdlICovXG5cbmNvbnN0IGFkdmljZXNXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdCRhZHZpY2VzOiAkKCcjYWR2aWNlcycpLFxuXHQkYWR2aWNlc0JlbGxCdXR0b246ICQoJyNzaG93LWFkdmljZXMtYnV0dG9uJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0YWR2aWNlc1dvcmtlci5zaG93UHJldmlvdXNBZHZpY2UoKTtcblx0XHQvLyDQl9Cw0L/Rg9GB0YLQuNC8INC/0L7Qu9GD0YfQtdC90LjQtSDQvdC+0LLRi9GFINGB0L7QstC10YLQvtCyXG5cdFx0YWR2aWNlc1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgYWR2aWNlc1dvcmtlci5jYk9uRGF0YUNoYW5nZWQpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoYWR2aWNlc1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRhZHZpY2VzV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINGB0L7QsdGL0YLQuNGPINGB0LzQtdC90Ysg0Y/Qt9GL0LrQsCDQuNC70Lgg0LTQsNC90L3Ri9GFXG5cdCAqL1xuXHRjYk9uRGF0YUNoYW5nZWQoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2VCZWxsJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdGFkdmljZXNXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC60LDQt9GL0LLQsNC10YIg0YHRgtCw0YDRi9C1INGB0L7QstC10YLRiyDQtNC+INC/0L7Qu9GD0YfQtdC90LjRjyDQvtCx0LLQvdC+0LvQtdC90LjRjyDRgdC+INGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRzaG93UHJldmlvdXNBZHZpY2UoKSB7XG5cdFx0Y29uc3QgcHJldmlvdXNBZHZpY2VCZWxsID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShgcHJldmlvdXNBZHZpY2VCZWxsJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdGlmIChwcmV2aW91c0FkdmljZUJlbGwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b24uaHRtbChwcmV2aW91c0FkdmljZUJlbGwpO1xuXHRcdH1cblx0XHRjb25zdCBwcmV2aW91c0FkdmljZSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdGlmIChwcmV2aW91c0FkdmljZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzLmh0bWwocHJldmlvdXNBZHZpY2UpO1xuXHRcdH1cblx0fSxcblx0d29ya2VyKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1hZHZpY2VzL2dldEFkdmljZXNgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGFkdmljZXNXb3JrZXIuY2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHRjYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbCgnJyk7XG5cdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWVcblx0XHRcdCYmIHJlc3BvbnNlLm1lc3NhZ2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bGV0IGh0bWxNZXNzYWdlcyA9ICcnO1xuXHRcdFx0bGV0IGNvdW50TWVzc2FnZXMgPSAwO1xuXHRcdFx0bGV0IGljb25CZWxsQ2xhc3MgPSAnJztcblx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cInVpIHJlbGF4ZWQgZGl2aWRlZCBsaXN0XCI+JztcblxuXHRcdFx0aWYgKHJlc3BvbnNlLm1lc3NhZ2UuZXJyb3IgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlLmVycm9yLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UuZXJyb3IsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8aSBjbGFzcz1cImZyb3duIG91dGxpbmUgcmVkIGljb25cIj48L2k+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCByZWQgaGVhZGVyXCI+JHt2YWx1ZX08L2Rpdj5gO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0Y291bnRNZXNzYWdlcyArPSAxO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlLndhcm5pbmcgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlLndhcm5pbmcubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS53YXJuaW5nLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJtZWggb3V0bGluZSB5ZWxsb3cgaWNvblwiPjwvaT4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGRpdiBjbGFzcz1cInVpIHNtYWxsIGhlYWRlclwiPiR7dmFsdWV9PC9kaXY+YDtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGNvdW50TWVzc2FnZXMgKz0gMTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2UubWVzc2FnZS5pbmZvICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZS5pbmZvLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UuaW5mbywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwic21pbGUgb3V0bGluZSBibHVlIGljb25cIj48L2k+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBoZWFkZXJcIj4ke3ZhbHVlfTwvZGl2PmA7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRjb3VudE1lc3NhZ2VzICs9IDE7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocmVzcG9uc2UubWVzc2FnZS5lcnJvciAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLm1lc3NhZ2UuZXJyb3IubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRpY29uQmVsbENsYXNzID0gJ3JlZCBsYXJnZSBpY29uIGJlbGwnO1xuXHRcdFx0fSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlLndhcm5pbmcgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlLndhcm5pbmcubGVuZ3RoID4gMCl7XG5cdFx0XHRcdGljb25CZWxsQ2xhc3MgPSAneWVsbG93IGljb24gYmVsbCc7XG5cblx0XHRcdH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZS5pbmZvICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZS5pbmZvLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRpY29uQmVsbENsYXNzID0gJ2JsdWUgaWNvbiBiZWxsJztcblx0XHRcdH1cblxuXG5cdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzLmh0bWwoaHRtbE1lc3NhZ2VzKTtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWAsIGh0bWxNZXNzYWdlcyk7XG5cblx0XHRcdC8vIC8vINCf0YDQvtCy0LXRgNC40Lwg0LXRgdGC0Ywg0LvQuCDQvtCx0L3QvtCy0LvQtdC90LjQtSDRgdC40YHRgtC10LzRi1xuXHRcdFx0Ly8gJCgnYVtocmVmPVwiL2FkbWluLWNhYmluZXQvdXBkYXRlL2luZGV4L1wiXSA+IGknKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0Ly8gaWYgKHJlc3BvbnNlLm1lc3NhZ2UuaW5mbyAhPT0gdW5kZWZpbmVkXG5cdFx0XHQvLyBcdCYmIHJlc3BvbnNlLm1lc3NhZ2UuaW5mby5sZW5ndGggPiAwKSB7XG5cdFx0XHQvLyBcdCQuZWFjaChyZXNwb25zZS5tZXNzYWdlLmluZm8sIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHQvLyBcdFx0aWYgKHZhbHVlLmluZGV4T2YoJy9hZG1pbi1jYWJpbmV0L3VwZGF0ZS9pbmRleC8nKSA+IC0xKSB7XG5cdFx0XHQvLyBcdFx0XHQkKCdhW2hyZWY9XCIvYWRtaW4tY2FiaW5ldC91cGRhdGUvaW5kZXgvXCJdID4gaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHQvLyBcdFx0fVxuXHRcdFx0Ly8gXHR9KTtcblx0XHRcdC8vIH1cblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uXG5cdFx0XHRcdC5odG1sKGA8aSBjbGFzcz1cIiR7aWNvbkJlbGxDbGFzc31cIj48L2k+JHtjb3VudE1lc3NhZ2VzfWApXG5cdFx0XHRcdC5wb3B1cCh7XG5cdFx0XHRcdFx0cG9zaXRpb246ICdib3R0b20gbGVmdCcsXG5cdFx0XHRcdFx0cG9wdXA6IGFkdmljZXNXb3JrZXIuJGFkdmljZXMsXG5cdFx0XHRcdFx0ZGVsYXk6IHtcblx0XHRcdFx0XHRcdHNob3c6IDMwMCxcblx0XHRcdFx0XHRcdGhpZGU6IDEwMDAwLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b24uZmluZCgnaScpXG5cdFx0XHRcdC50cmFuc2l0aW9uKCdzZXQgbG9vcGluZycpXG5cdFx0XHRcdC50cmFuc2l0aW9uKCdwdWxzZScsICcxMDAwbXMnKTtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gLCBhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5odG1sKCkpO1xuXHRcdFx0YWR2aWNlc1dvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG5cdFx0XHRcdGFkdmljZXNXb3JrZXIud29ya2VyLFxuXHRcdFx0XHRhZHZpY2VzV29ya2VyLnRpbWVPdXQsXG5cdFx0XHQpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZVxuXHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0FkdmljZUJlbGwke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvblxuXHRcdFx0XHQuaHRtbCgnPGkgY2xhc3M9XCJncmV5IGljb24gYmVsbCBvdXRsaW5lXCI+PC9pPicpO1xuXHRcdH1cblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0YWR2aWNlc1dvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==