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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2VzL2FkdmljZXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImFkdmljZXNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRhZHZpY2VzIiwiJCIsIiRhZHZpY2VzQmVsbEJ1dHRvbiIsImluaXRpYWxpemUiLCJzaG93UHJldmlvdXNBZHZpY2UiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25EYXRhQ2hhbmdlZCIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJzZXNzaW9uU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwicHJldmlvdXNBZHZpY2VCZWxsIiwiZ2V0SXRlbSIsInVuZGVmaW5lZCIsImh0bWwiLCJwcmV2aW91c0FkdmljZSIsIlBieEFwaSIsIkFkdmljZXNHZXRMaXN0IiwiY2JBZnRlclJlc3BvbnNlIiwicmVzcG9uc2UiLCJhZHZpY2VzIiwiaHRtbE1lc3NhZ2VzIiwiY291bnRNZXNzYWdlcyIsImljb25CZWxsQ2xhc3MiLCJlcnJvciIsImxlbmd0aCIsImVhY2giLCJrZXkiLCJ2YWx1ZSIsIndhcm5pbmciLCJpbmZvIiwic2V0SXRlbSIsInBvcHVwIiwicG9zaXRpb24iLCJkZWxheSIsInNob3ciLCJoaWRlIiwiZmluZCIsInRyYW5zaXRpb24iLCJzZXRUaW1lb3V0Iiwic3VjY2VzcyIsIm1lc3NhZ2UiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsYUFBYSxHQUFHO0FBQ3JCQyxFQUFBQSxPQUFPLEVBQUUsTUFEWTtBQUVyQkMsRUFBQUEsYUFBYSxFQUFFLEVBRk07QUFHckJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLFVBQUQsQ0FIVTtBQUlyQkMsRUFBQUEsa0JBQWtCLEVBQUVELENBQUMsQ0FBQyxzQkFBRCxDQUpBO0FB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RnRCO0FBR0EsU0FkRCxNQWNPO0FBQ043QyxVQUFBQSxhQUFhLENBQUNLLGtCQUFkLENBQ0VnQixJQURGO0FBRUE7O0FBQ0ROLFFBQUFBLGNBQWMsQ0FBQ3VCLE9BQWYsNkJBQTRDckIsc0JBQTVDLEdBQXNFakIsYUFBYSxDQUFDSyxrQkFBZCxDQUFpQ2dCLElBQWpDLEVBQXRFO0FBQ0FyQixRQUFBQSxhQUFhLENBQUNhLGFBQWQsR0FBOEJKLE1BQU0sQ0FBQ3FDLFVBQVAsQ0FDN0I5QyxhQUFhLENBQUNjLE1BRGUsRUFFN0JkLGFBQWEsQ0FBQ0MsT0FGZSxDQUE5QjtBQUlBLE9BbkZELE1BbUZPLElBQUl5QixRQUFRLENBQUNxQixPQUFULEtBQXFCLElBQXJCLElBQ1ByQixRQUFRLENBQUNzQixPQUFULEtBQXFCNUIsU0FEZCxJQUVQTSxRQUFRLENBQUNzQixPQUFULENBQWlCaEIsTUFBakIsS0FBNEIsQ0FGekIsRUFFNEI7QUFDbENqQixRQUFBQSxjQUFjLENBQUNDLFVBQWYseUJBQTJDQyxzQkFBM0M7QUFDQUYsUUFBQUEsY0FBYyxDQUFDQyxVQUFmLDZCQUErQ0Msc0JBQS9DO0FBQ0FqQixRQUFBQSxhQUFhLENBQUNLLGtCQUFkLENBQ0VnQixJQURGLENBQ08sd0NBRFA7QUFFQTtBQUNEOztBQXZJb0I7QUFBQTtBQUFBLENBQXRCO0FBMElBakIsQ0FBQyxDQUFDNkMsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QmxELEVBQUFBLGFBQWEsQ0FBQ00sVUFBZDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIHNlc3Npb25TdG9yYWdlICovXG5cbmNvbnN0IGFkdmljZXNXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdCRhZHZpY2VzOiAkKCcjYWR2aWNlcycpLFxuXHQkYWR2aWNlc0JlbGxCdXR0b246ICQoJyNzaG93LWFkdmljZXMtYnV0dG9uJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0YWR2aWNlc1dvcmtlci5zaG93UHJldmlvdXNBZHZpY2UoKTtcblx0XHQvLyDQl9Cw0L/Rg9GB0YLQuNC8INC/0L7Qu9GD0YfQtdC90LjQtSDQvdC+0LLRi9GFINGB0L7QstC10YLQvtCyXG5cdFx0YWR2aWNlc1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgYWR2aWNlc1dvcmtlci5jYk9uRGF0YUNoYW5nZWQpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoYWR2aWNlc1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRhZHZpY2VzV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINGB0L7QsdGL0YLQuNGPINGB0LzQtdC90Ysg0Y/Qt9GL0LrQsCDQuNC70Lgg0LTQsNC90L3Ri9GFXG5cdCAqL1xuXHRjYk9uRGF0YUNoYW5nZWQoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2VCZWxsJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdGFkdmljZXNXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC60LDQt9GL0LLQsNC10YIg0YHRgtCw0YDRi9C1INGB0L7QstC10YLRiyDQtNC+INC/0L7Qu9GD0YfQtdC90LjRjyDQvtCx0LLQvdC+0LvQtdC90LjRjyDRgdC+INGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRzaG93UHJldmlvdXNBZHZpY2UoKSB7XG5cdFx0Y29uc3QgcHJldmlvdXNBZHZpY2VCZWxsID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShgcHJldmlvdXNBZHZpY2VCZWxsJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdGlmIChwcmV2aW91c0FkdmljZUJlbGwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b24uaHRtbChwcmV2aW91c0FkdmljZUJlbGwpO1xuXHRcdH1cblx0XHRjb25zdCBwcmV2aW91c0FkdmljZSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdGlmIChwcmV2aW91c0FkdmljZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzLmh0bWwocHJldmlvdXNBZHZpY2UpO1xuXHRcdH1cblx0fSxcblx0d29ya2VyKCkge1xuXHRcdFBieEFwaS5BZHZpY2VzR2V0TGlzdChhZHZpY2VzV29ya2VyLmNiQWZ0ZXJSZXNwb25zZSk7XG5cdH0sXG5cdGNiQWZ0ZXJSZXNwb25zZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSA9PT0gZmFsc2UpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlcy5odG1sKCcnKTtcblx0XHRpZiAocmVzcG9uc2UuYWR2aWNlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsZXQgaHRtbE1lc3NhZ2VzID0gJyc7XG5cdFx0XHRsZXQgY291bnRNZXNzYWdlcyA9IDA7XG5cdFx0XHRsZXQgaWNvbkJlbGxDbGFzcyA9ICcnO1xuXHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwidWkgcmVsYXhlZCBkaXZpZGVkIGxpc3RcIj4nO1xuXG5cdFx0XHRpZiAocmVzcG9uc2UuYWR2aWNlcy5lcnJvciAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMuZXJyb3IubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UuYWR2aWNlcy5lcnJvciwgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwiZnJvd24gb3V0bGluZSByZWQgaWNvblwiPjwvaT4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGRpdiBjbGFzcz1cInVpIHNtYWxsIHJlZCBoZWFkZXJcIj4ke3ZhbHVlfTwvZGl2PmA7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRjb3VudE1lc3NhZ2VzICs9IDE7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHJlc3BvbnNlLmFkdmljZXMud2FybmluZyAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMud2FybmluZy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQuZWFjaChyZXNwb25zZS5hZHZpY2VzLndhcm5pbmcsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8aSBjbGFzcz1cIm1laCBvdXRsaW5lIHllbGxvdyBpY29uXCI+PC9pPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9IGA8ZGl2IGNsYXNzPVwidWkgc21hbGwgaGVhZGVyXCI+JHt2YWx1ZX08L2Rpdj5gO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0Y291bnRNZXNzYWdlcyArPSAxO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZS5hZHZpY2VzLmluZm8gIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLmluZm8ubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UuYWR2aWNlcy5pbmZvLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJzbWlsZSBvdXRsaW5lIGJsdWUgaWNvblwiPjwvaT4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGRpdiBjbGFzcz1cInVpIHNtYWxsIGhlYWRlclwiPiR7dmFsdWV9PC9kaXY+YDtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGNvdW50TWVzc2FnZXMgKz0gMTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyZXNwb25zZS5hZHZpY2VzLmVycm9yICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcy5lcnJvci5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGljb25CZWxsQ2xhc3MgPSAncmVkIGxhcmdlIGljb24gYmVsbCc7XG5cdFx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmFkdmljZXMud2FybmluZyAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMud2FybmluZy5sZW5ndGggPiAwKXtcblx0XHRcdFx0aWNvbkJlbGxDbGFzcyA9ICd5ZWxsb3cgaWNvbiBiZWxsJztcblxuXHRcdFx0fSBlbHNlIGlmIChyZXNwb25zZS5hZHZpY2VzLmluZm8gIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLmluZm8ubGVuZ3RoID4gMCl7XG5cdFx0XHRcdGljb25CZWxsQ2xhc3MgPSAnYmx1ZSBpY29uIGJlbGwnO1xuXHRcdFx0fVxuXG5cblx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbChodG1sTWVzc2FnZXMpO1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCwgaHRtbE1lc3NhZ2VzKTtcblxuXHRcdFx0aWYgKGNvdW50TWVzc2FnZXM+MCl7XG5cdFx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uXG5cdFx0XHRcdFx0Lmh0bWwoYDxpIGNsYXNzPVwiJHtpY29uQmVsbENsYXNzfVwiPjwvaT4ke2NvdW50TWVzc2FnZXN9YClcblx0XHRcdFx0XHQucG9wdXAoe1xuXHRcdFx0XHRcdFx0cG9zaXRpb246ICdib3R0b20gbGVmdCcsXG5cdFx0XHRcdFx0XHRwb3B1cDogYWR2aWNlc1dvcmtlci4kYWR2aWNlcyxcblx0XHRcdFx0XHRcdGRlbGF5OiB7XG5cdFx0XHRcdFx0XHRcdHNob3c6IDMwMCxcblx0XHRcdFx0XHRcdFx0aGlkZTogMTAwMDAsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5maW5kKCdpJylcblx0XHRcdFx0XHQudHJhbnNpdGlvbignc2V0IGxvb3BpbmcnKVxuXHRcdFx0XHRcdC50cmFuc2l0aW9uKCdwdWxzZScsICcxMDAwbXMnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uXG5cdFx0XHRcdFx0Lmh0bWwoYDxpIGNsYXNzPVwiZ3JleSBpY29uIGJlbGxcIj48L2k+YClcblx0XHRcdH1cblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gLCBhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5odG1sKCkpO1xuXHRcdFx0YWR2aWNlc1dvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG5cdFx0XHRcdGFkdmljZXNXb3JrZXIud29ya2VyLFxuXHRcdFx0XHRhZHZpY2VzV29ya2VyLnRpbWVPdXQsXG5cdFx0XHQpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZVxuXHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0FkdmljZUJlbGwke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvblxuXHRcdFx0XHQuaHRtbCgnPGkgY2xhc3M9XCJncmV5IGljb24gYmVsbCBvdXRsaW5lXCI+PC9pPicpO1xuXHRcdH1cblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0YWR2aWNlc1dvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==