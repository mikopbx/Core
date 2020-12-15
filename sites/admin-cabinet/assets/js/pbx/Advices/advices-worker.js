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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2VzL2FkdmljZXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImFkdmljZXNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRhZHZpY2VzIiwiJCIsIiRhZHZpY2VzQmVsbEJ1dHRvbiIsImluaXRpYWxpemUiLCJzaG93UHJldmlvdXNBZHZpY2UiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25EYXRhQ2hhbmdlZCIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJzZXNzaW9uU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwic2V0VGltZW91dCIsInByZXZpb3VzQWR2aWNlQmVsbCIsImdldEl0ZW0iLCJ1bmRlZmluZWQiLCJodG1sIiwicHJldmlvdXNBZHZpY2UiLCJQYnhBcGkiLCJBZHZpY2VzR2V0TGlzdCIsImNiQWZ0ZXJSZXNwb25zZSIsInJlc3BvbnNlIiwiYWR2aWNlcyIsImh0bWxNZXNzYWdlcyIsImNvdW50TWVzc2FnZXMiLCJpY29uQmVsbENsYXNzIiwiZXJyb3IiLCJsZW5ndGgiLCJlYWNoIiwia2V5IiwidmFsdWUiLCJ3YXJuaW5nIiwiaW5mbyIsInNldEl0ZW0iLCJwb3B1cCIsInBvc2l0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImZpbmQiLCJ0cmFuc2l0aW9uIiwic3VjY2VzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTtBQUVBLElBQU1BLGFBQWEsR0FBRztBQUNyQkMsRUFBQUEsT0FBTyxFQUFFLE1BRFk7QUFFckJDLEVBQUFBLGFBQWEsRUFBRSxFQUZNO0FBR3JCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxVQUFELENBSFU7QUFJckJDLEVBQUFBLGtCQUFrQixFQUFFRCxDQUFDLENBQUMsc0JBQUQsQ0FKQTtBQUtyQkUsRUFBQUEsVUFMcUI7QUFBQSwwQkFLUjtBQUNaTixNQUFBQSxhQUFhLENBQUNPLGtCQUFkLEdBRFksQ0FFWjs7QUFDQVAsTUFBQUEsYUFBYSxDQUFDUSxhQUFkO0FBQ0FDLE1BQUFBLE1BQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0IsbUJBQXhCLEVBQTZDVixhQUFhLENBQUNXLGVBQTNEO0FBQ0E7O0FBVm9CO0FBQUE7QUFXckJILEVBQUFBLGFBWHFCO0FBQUEsNkJBV0w7QUFDZkMsTUFBQUEsTUFBTSxDQUFDRyxZQUFQLENBQW9CWixhQUFhLENBQUNhLGFBQWxDO0FBQ0FiLE1BQUFBLGFBQWEsQ0FBQ2MsTUFBZDtBQUNBOztBQWRvQjtBQUFBOztBQWVyQjs7O0FBR0FILEVBQUFBLGVBbEJxQjtBQUFBLCtCQWtCSDtBQUNqQkksTUFBQUEsY0FBYyxDQUFDQyxVQUFmLHlCQUEyQ0Msc0JBQTNDO0FBQ0FGLE1BQUFBLGNBQWMsQ0FBQ0MsVUFBZiw2QkFBK0NDLHNCQUEvQztBQUNBQyxNQUFBQSxVQUFVLENBQUNsQixhQUFhLENBQUNRLGFBQWYsRUFBNkIsSUFBN0IsQ0FBVjtBQUNBOztBQXRCb0I7QUFBQTs7QUF1QnJCOzs7QUFHQUQsRUFBQUEsa0JBMUJxQjtBQUFBLGtDQTBCQTtBQUNwQixVQUFNWSxrQkFBa0IsR0FBR0osY0FBYyxDQUFDSyxPQUFmLDZCQUE0Q0gsc0JBQTVDLEVBQTNCOztBQUNBLFVBQUlFLGtCQUFrQixLQUFLRSxTQUEzQixFQUFzQztBQUNyQ3JCLFFBQUFBLGFBQWEsQ0FBQ0ssa0JBQWQsQ0FBaUNpQixJQUFqQyxDQUFzQ0gsa0JBQXRDO0FBQ0E7O0FBQ0QsVUFBTUksY0FBYyxHQUFHUixjQUFjLENBQUNLLE9BQWYseUJBQXdDSCxzQkFBeEMsRUFBdkI7O0FBQ0EsVUFBSU0sY0FBYyxLQUFLRixTQUF2QixFQUFrQztBQUNqQ3JCLFFBQUFBLGFBQWEsQ0FBQ0csUUFBZCxDQUF1Qm1CLElBQXZCLENBQTRCQyxjQUE1QjtBQUNBO0FBQ0Q7O0FBbkNvQjtBQUFBO0FBb0NyQlQsRUFBQUEsTUFwQ3FCO0FBQUEsc0JBb0NaO0FBQ1JVLE1BQUFBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQnpCLGFBQWEsQ0FBQzBCLGVBQXBDO0FBQ0E7O0FBdENvQjtBQUFBO0FBdUNyQkEsRUFBQUEsZUF2Q3FCO0FBQUEsNkJBdUNMQyxRQXZDSyxFQXVDSztBQUN6QixVQUFJQSxRQUFRLEtBQUssS0FBakIsRUFBd0I7QUFDdkI7QUFDQTs7QUFDRDNCLE1BQUFBLGFBQWEsQ0FBQ0csUUFBZCxDQUF1Qm1CLElBQXZCLENBQTRCLEVBQTVCOztBQUNBLFVBQUlLLFFBQVEsQ0FBQ0MsT0FBVCxLQUFxQlAsU0FBekIsRUFBb0M7QUFDbkMsWUFBSVEsWUFBWSxHQUFHLEVBQW5CO0FBQ0EsWUFBSUMsYUFBYSxHQUFHLENBQXBCO0FBQ0EsWUFBSUMsYUFBYSxHQUFHLEVBQXBCO0FBQ0FGLFFBQUFBLFlBQVksSUFBSSx1Q0FBaEI7O0FBRUEsWUFBSUYsUUFBUSxDQUFDQyxPQUFULENBQWlCSSxLQUFqQixLQUEyQlgsU0FBM0IsSUFDQU0sUUFBUSxDQUFDQyxPQUFULENBQWlCSSxLQUFqQixDQUF1QkMsTUFBdkIsR0FBZ0MsQ0FEcEMsRUFDdUM7QUFDdEM3QixVQUFBQSxDQUFDLENBQUM4QixJQUFGLENBQU9QLFFBQVEsQ0FBQ0MsT0FBVCxDQUFpQkksS0FBeEIsRUFBK0IsVUFBQ0csR0FBRCxFQUFNQyxLQUFOLEVBQWdCO0FBQzlDUCxZQUFBQSxZQUFZLElBQUksb0JBQWhCO0FBQ0FBLFlBQUFBLFlBQVksSUFBSSx3Q0FBaEI7QUFDQUEsWUFBQUEsWUFBWSxJQUFJLHVCQUFoQjtBQUNBQSxZQUFBQSxZQUFZLGlEQUF3Q08sS0FBeEMsV0FBWjtBQUNBUCxZQUFBQSxZQUFZLElBQUksUUFBaEI7QUFDQUEsWUFBQUEsWUFBWSxJQUFJLFFBQWhCO0FBQ0FDLFlBQUFBLGFBQWEsSUFBSSxDQUFqQjtBQUNBLFdBUkQ7QUFTQTs7QUFDRCxZQUFJSCxRQUFRLENBQUNDLE9BQVQsQ0FBaUJTLE9BQWpCLEtBQTZCaEIsU0FBN0IsSUFDQU0sUUFBUSxDQUFDQyxPQUFULENBQWlCUyxPQUFqQixDQUF5QkosTUFBekIsR0FBa0MsQ0FEdEMsRUFDeUM7QUFDeEM3QixVQUFBQSxDQUFDLENBQUM4QixJQUFGLENBQU9QLFFBQVEsQ0FBQ0MsT0FBVCxDQUFpQlMsT0FBeEIsRUFBaUMsVUFBQ0YsR0FBRCxFQUFNQyxLQUFOLEVBQWdCO0FBQ2hEUCxZQUFBQSxZQUFZLElBQUksb0JBQWhCO0FBQ0FBLFlBQUFBLFlBQVksSUFBSSx5Q0FBaEI7QUFDQUEsWUFBQUEsWUFBWSxJQUFJLHVCQUFoQjtBQUNBQSxZQUFBQSxZQUFZLDZDQUFvQ08sS0FBcEMsV0FBWjtBQUNBUCxZQUFBQSxZQUFZLElBQUksUUFBaEI7QUFDQUEsWUFBQUEsWUFBWSxJQUFJLFFBQWhCO0FBQ0FDLFlBQUFBLGFBQWEsSUFBSSxDQUFqQjtBQUNBLFdBUkQ7QUFTQTs7QUFDRCxZQUFJSCxRQUFRLENBQUNDLE9BQVQsQ0FBaUJVLElBQWpCLEtBQTBCakIsU0FBMUIsSUFDQU0sUUFBUSxDQUFDQyxPQUFULENBQWlCVSxJQUFqQixDQUFzQkwsTUFBdEIsR0FBK0IsQ0FEbkMsRUFDc0M7QUFDckM3QixVQUFBQSxDQUFDLENBQUM4QixJQUFGLENBQU9QLFFBQVEsQ0FBQ0MsT0FBVCxDQUFpQlUsSUFBeEIsRUFBOEIsVUFBQ0gsR0FBRCxFQUFNQyxLQUFOLEVBQWdCO0FBQzdDUCxZQUFBQSxZQUFZLElBQUksb0JBQWhCO0FBQ0FBLFlBQUFBLFlBQVksSUFBSSx5Q0FBaEI7QUFDQUEsWUFBQUEsWUFBWSxJQUFJLHVCQUFoQjtBQUNBQSxZQUFBQSxZQUFZLDZDQUFvQ08sS0FBcEMsV0FBWjtBQUNBUCxZQUFBQSxZQUFZLElBQUksUUFBaEI7QUFDQUEsWUFBQUEsWUFBWSxJQUFJLFFBQWhCO0FBQ0FDLFlBQUFBLGFBQWEsSUFBSSxDQUFqQjtBQUNBLFdBUkQ7QUFTQTs7QUFFRCxZQUFJSCxRQUFRLENBQUNDLE9BQVQsQ0FBaUJJLEtBQWpCLEtBQTJCWCxTQUEzQixJQUNBTSxRQUFRLENBQUNDLE9BQVQsQ0FBaUJJLEtBQWpCLENBQXVCQyxNQUF2QixHQUFnQyxDQURwQyxFQUN1QztBQUN0Q0YsVUFBQUEsYUFBYSxHQUFHLHFCQUFoQjtBQUNBLFNBSEQsTUFHTyxJQUFJSixRQUFRLENBQUNDLE9BQVQsQ0FBaUJTLE9BQWpCLEtBQTZCaEIsU0FBN0IsSUFDUE0sUUFBUSxDQUFDQyxPQUFULENBQWlCUyxPQUFqQixDQUF5QkosTUFBekIsR0FBa0MsQ0FEL0IsRUFDaUM7QUFDdkNGLFVBQUFBLGFBQWEsR0FBRyxrQkFBaEI7QUFFQSxTQUpNLE1BSUEsSUFBSUosUUFBUSxDQUFDQyxPQUFULENBQWlCVSxJQUFqQixLQUEwQmpCLFNBQTFCLElBQ1BNLFFBQVEsQ0FBQ0MsT0FBVCxDQUFpQlUsSUFBakIsQ0FBc0JMLE1BQXRCLEdBQStCLENBRDVCLEVBQzhCO0FBQ3BDRixVQUFBQSxhQUFhLEdBQUcsZ0JBQWhCO0FBQ0E7O0FBR0RGLFFBQUFBLFlBQVksSUFBSSxRQUFoQjtBQUNBN0IsUUFBQUEsYUFBYSxDQUFDRyxRQUFkLENBQXVCbUIsSUFBdkIsQ0FBNEJPLFlBQTVCO0FBQ0FkLFFBQUFBLGNBQWMsQ0FBQ3dCLE9BQWYseUJBQXdDdEIsc0JBQXhDLEdBQWtFWSxZQUFsRTs7QUFFQSxZQUFJQyxhQUFhLEdBQUMsQ0FBbEIsRUFBb0I7QUFDbkI5QixVQUFBQSxhQUFhLENBQUNLLGtCQUFkLENBQ0VpQixJQURGLHNCQUNvQlMsYUFEcEIsb0JBQzBDRCxhQUQxQyxHQUVFVSxLQUZGLENBRVE7QUFDTkMsWUFBQUEsUUFBUSxFQUFFLGFBREo7QUFFTkQsWUFBQUEsS0FBSyxFQUFFeEMsYUFBYSxDQUFDRyxRQUZmO0FBR051QyxZQUFBQSxLQUFLLEVBQUU7QUFDTkMsY0FBQUEsSUFBSSxFQUFFLEdBREE7QUFFTkMsY0FBQUEsSUFBSSxFQUFFO0FBRkE7QUFIRCxXQUZSO0FBVUE1QyxVQUFBQSxhQUFhLENBQUNLLGtCQUFkLENBQWlDd0MsSUFBakMsQ0FBc0MsR0FBdEMsRUFDRUMsVUFERixDQUNhLGFBRGIsRUFFRUEsVUFGRixDQUVhLE9BRmIsRUFFc0IsUUFGdEI7QUFHQSxTQWRELE1BY087QUFDTjlDLFVBQUFBLGFBQWEsQ0FBQ0ssa0JBQWQsQ0FDRWlCLElBREY7QUFFQTs7QUFDRFAsUUFBQUEsY0FBYyxDQUFDd0IsT0FBZiw2QkFBNEN0QixzQkFBNUMsR0FBc0VqQixhQUFhLENBQUNLLGtCQUFkLENBQWlDaUIsSUFBakMsRUFBdEU7QUFDQXRCLFFBQUFBLGFBQWEsQ0FBQ2EsYUFBZCxHQUE4QkosTUFBTSxDQUFDUyxVQUFQLENBQzdCbEIsYUFBYSxDQUFDYyxNQURlLEVBRTdCZCxhQUFhLENBQUNDLE9BRmUsQ0FBOUI7QUFJQSxPQW5GRCxNQW1GTyxJQUFJMEIsUUFBUSxDQUFDb0IsT0FBVCxLQUFxQixJQUFyQixJQUNQcEIsUUFBUSxDQUFDQyxPQUFULEtBQXFCUCxTQURkLElBRVBNLFFBQVEsQ0FBQ0MsT0FBVCxDQUFpQkssTUFBakIsS0FBNEIsQ0FGekIsRUFFNEI7QUFDbENsQixRQUFBQSxjQUFjLENBQUNDLFVBQWYseUJBQTJDQyxzQkFBM0M7QUFDQUYsUUFBQUEsY0FBYyxDQUFDQyxVQUFmLDZCQUErQ0Msc0JBQS9DO0FBQ0FqQixRQUFBQSxhQUFhLENBQUNLLGtCQUFkLENBQ0VpQixJQURGLENBQ08sd0NBRFA7QUFFQTtBQUNEOztBQXZJb0I7QUFBQTtBQUFBLENBQXRCO0FBMElBbEIsQ0FBQyxDQUFDNEMsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QmpELEVBQUFBLGFBQWEsQ0FBQ00sVUFBZDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIHNlc3Npb25TdG9yYWdlICovXG5cbmNvbnN0IGFkdmljZXNXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdCRhZHZpY2VzOiAkKCcjYWR2aWNlcycpLFxuXHQkYWR2aWNlc0JlbGxCdXR0b246ICQoJyNzaG93LWFkdmljZXMtYnV0dG9uJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0YWR2aWNlc1dvcmtlci5zaG93UHJldmlvdXNBZHZpY2UoKTtcblx0XHQvLyDQl9Cw0L/Rg9GB0YLQuNC8INC/0L7Qu9GD0YfQtdC90LjQtSDQvdC+0LLRi9GFINGB0L7QstC10YLQvtCyXG5cdFx0YWR2aWNlc1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgYWR2aWNlc1dvcmtlci5jYk9uRGF0YUNoYW5nZWQpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoYWR2aWNlc1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRhZHZpY2VzV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINGB0L7QsdGL0YLQuNGPINGB0LzQtdC90Ysg0Y/Qt9GL0LrQsCDQuNC70Lgg0LTQsNC90L3Ri9GFXG5cdCAqL1xuXHRjYk9uRGF0YUNoYW5nZWQoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2VCZWxsJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdHNldFRpbWVvdXQoYWR2aWNlc1dvcmtlci5yZXN0YXJ0V29ya2VyLDMwMDApO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC60LDQt9GL0LLQsNC10YIg0YHRgtCw0YDRi9C1INGB0L7QstC10YLRiyDQtNC+INC/0L7Qu9GD0YfQtdC90LjRjyDQvtCx0LLQvdC+0LvQtdC90LjRjyDRgdC+INGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRzaG93UHJldmlvdXNBZHZpY2UoKSB7XG5cdFx0Y29uc3QgcHJldmlvdXNBZHZpY2VCZWxsID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShgcHJldmlvdXNBZHZpY2VCZWxsJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdGlmIChwcmV2aW91c0FkdmljZUJlbGwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b24uaHRtbChwcmV2aW91c0FkdmljZUJlbGwpO1xuXHRcdH1cblx0XHRjb25zdCBwcmV2aW91c0FkdmljZSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzQWR2aWNlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdGlmIChwcmV2aW91c0FkdmljZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzLmh0bWwocHJldmlvdXNBZHZpY2UpO1xuXHRcdH1cblx0fSxcblx0d29ya2VyKCkge1xuXHRcdFBieEFwaS5BZHZpY2VzR2V0TGlzdChhZHZpY2VzV29ya2VyLmNiQWZ0ZXJSZXNwb25zZSk7XG5cdH0sXG5cdGNiQWZ0ZXJSZXNwb25zZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSA9PT0gZmFsc2UpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0YWR2aWNlc1dvcmtlci4kYWR2aWNlcy5odG1sKCcnKTtcblx0XHRpZiAocmVzcG9uc2UuYWR2aWNlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsZXQgaHRtbE1lc3NhZ2VzID0gJyc7XG5cdFx0XHRsZXQgY291bnRNZXNzYWdlcyA9IDA7XG5cdFx0XHRsZXQgaWNvbkJlbGxDbGFzcyA9ICcnO1xuXHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwidWkgcmVsYXhlZCBkaXZpZGVkIGxpc3RcIj4nO1xuXG5cdFx0XHRpZiAocmVzcG9uc2UuYWR2aWNlcy5lcnJvciAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMuZXJyb3IubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UuYWR2aWNlcy5lcnJvciwgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwiZnJvd24gb3V0bGluZSByZWQgaWNvblwiPjwvaT4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGRpdiBjbGFzcz1cInVpIHNtYWxsIHJlZCBoZWFkZXJcIj4ke3ZhbHVlfTwvZGl2PmA7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRjb3VudE1lc3NhZ2VzICs9IDE7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHJlc3BvbnNlLmFkdmljZXMud2FybmluZyAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMud2FybmluZy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQuZWFjaChyZXNwb25zZS5hZHZpY2VzLndhcm5pbmcsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8aSBjbGFzcz1cIm1laCBvdXRsaW5lIHllbGxvdyBpY29uXCI+PC9pPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9IGA8ZGl2IGNsYXNzPVwidWkgc21hbGwgaGVhZGVyXCI+JHt2YWx1ZX08L2Rpdj5gO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0Y291bnRNZXNzYWdlcyArPSAxO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZS5hZHZpY2VzLmluZm8gIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLmluZm8ubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UuYWR2aWNlcy5pbmZvLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJzbWlsZSBvdXRsaW5lIGJsdWUgaWNvblwiPjwvaT4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGRpdiBjbGFzcz1cInVpIHNtYWxsIGhlYWRlclwiPiR7dmFsdWV9PC9kaXY+YDtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGNvdW50TWVzc2FnZXMgKz0gMTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyZXNwb25zZS5hZHZpY2VzLmVycm9yICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcy5lcnJvci5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGljb25CZWxsQ2xhc3MgPSAncmVkIGxhcmdlIGljb24gYmVsbCc7XG5cdFx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmFkdmljZXMud2FybmluZyAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMud2FybmluZy5sZW5ndGggPiAwKXtcblx0XHRcdFx0aWNvbkJlbGxDbGFzcyA9ICd5ZWxsb3cgaWNvbiBiZWxsJztcblxuXHRcdFx0fSBlbHNlIGlmIChyZXNwb25zZS5hZHZpY2VzLmluZm8gIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLmluZm8ubGVuZ3RoID4gMCl7XG5cdFx0XHRcdGljb25CZWxsQ2xhc3MgPSAnYmx1ZSBpY29uIGJlbGwnO1xuXHRcdFx0fVxuXG5cblx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbChodG1sTWVzc2FnZXMpO1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCwgaHRtbE1lc3NhZ2VzKTtcblxuXHRcdFx0aWYgKGNvdW50TWVzc2FnZXM+MCl7XG5cdFx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uXG5cdFx0XHRcdFx0Lmh0bWwoYDxpIGNsYXNzPVwiJHtpY29uQmVsbENsYXNzfVwiPjwvaT4ke2NvdW50TWVzc2FnZXN9YClcblx0XHRcdFx0XHQucG9wdXAoe1xuXHRcdFx0XHRcdFx0cG9zaXRpb246ICdib3R0b20gbGVmdCcsXG5cdFx0XHRcdFx0XHRwb3B1cDogYWR2aWNlc1dvcmtlci4kYWR2aWNlcyxcblx0XHRcdFx0XHRcdGRlbGF5OiB7XG5cdFx0XHRcdFx0XHRcdHNob3c6IDMwMCxcblx0XHRcdFx0XHRcdFx0aGlkZTogMTAwMDAsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5maW5kKCdpJylcblx0XHRcdFx0XHQudHJhbnNpdGlvbignc2V0IGxvb3BpbmcnKVxuXHRcdFx0XHRcdC50cmFuc2l0aW9uKCdwdWxzZScsICcxMDAwbXMnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uXG5cdFx0XHRcdFx0Lmh0bWwoYDxpIGNsYXNzPVwiZ3JleSBpY29uIGJlbGxcIj48L2k+YClcblx0XHRcdH1cblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gLCBhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5odG1sKCkpO1xuXHRcdFx0YWR2aWNlc1dvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG5cdFx0XHRcdGFkdmljZXNXb3JrZXIud29ya2VyLFxuXHRcdFx0XHRhZHZpY2VzV29ya2VyLnRpbWVPdXQsXG5cdFx0XHQpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZVxuXHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcyAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0FkdmljZUJlbGwke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvblxuXHRcdFx0XHQuaHRtbCgnPGkgY2xhc3M9XCJncmV5IGljb24gYmVsbCBvdXRsaW5lXCI+PC9pPicpO1xuXHRcdH1cblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0YWR2aWNlc1dvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==