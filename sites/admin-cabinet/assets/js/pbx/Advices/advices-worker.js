"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/**
 * Advice Worker module.
 * @module advicesWorker
 */
var advicesWorker = {
  /**
   * Time in milliseconds before fetching new advice.
   * @type {number}
   */
  timeOut: 10000,

  /**
   * The id of the timer function for advice worker.
   * @type {number}
   */
  timeOutHandle: 0,

  /**
   * jQuery element for advice container.
   * @type {jQuery}
   */
  $advices: $('#advices'),

  /**
   * jQuery element for advice bell button.
   * @type {jQuery}
   */
  $advicesBellButton: $('#show-advices-button'),

  /**
   * Initializes the advice worker.
   */
  initialize: function initialize() {
    advicesWorker.showPreviousAdvice(); // Let's initiate the retrieval of new advice.

    advicesWorker.restartWorker();
    window.addEventListener('ConfigDataChanged', advicesWorker.cbOnDataChanged);
  },

  /**
   * Restarts the advices worker.
   */
  restartWorker: function restartWorker() {
    window.clearTimeout(advicesWorker.timeoutHandle);
    advicesWorker.worker();
  },

  /**
   * Event handler for language or data change.
   */
  cbOnDataChanged: function cbOnDataChanged() {
    sessionStorage.removeItem("previousAdvice".concat(globalWebAdminLanguage));
    sessionStorage.removeItem("previousAdviceBell".concat(globalWebAdminLanguage));
    setTimeout(advicesWorker.restartWorker, 3000);
  },

  /**
   * Shows old advice until receiving an update from the station.
   */
  showPreviousAdvice: function showPreviousAdvice() {
    var previousAdviceBell = sessionStorage.getItem("previousAdviceBell".concat(globalWebAdminLanguage));

    if (previousAdviceBell) {
      advicesWorker.$advicesBellButton.html(previousAdviceBell);
    }

    var previousAdvice = sessionStorage.getItem("previousAdvice".concat(globalWebAdminLanguage));

    if (previousAdvice) {
      advicesWorker.$advices.html(previousAdvice);
      advicesWorker.$advicesBellButton.popup({
        position: 'bottom left',
        popup: advicesWorker.$advices,
        delay: {
          show: 300,
          hide: 10000
        },
        on: 'click',
        movePopup: false
      });
    }
  },

  /**
   * Worker function for fetching advices.
   */
  worker: function worker() {
    PbxApi.AdvicesGetList(advicesWorker.cbAfterResponse);
  },

  /**
   * Callback function after receiving the response.
   * @param {object} response - Response object from the API.
   */
  cbAfterResponse: function cbAfterResponse(response) {
    if (response === false) {
      return;
    }

    advicesWorker.$advices.html('');

    if (response.advices !== undefined) {
      var htmlMessages = '';
      var countMessages = 0;
      var iconBellClass = '';
      htmlMessages += "<div class=\"ui header\">".concat(globalTranslate.adv_PopupHeader, "</div>");
      htmlMessages += '<div class="ui relaxed divided list">';

      if (response.advices.needUpdate !== undefined && response.advices.needUpdate.length > 0) {
        $(window).trigger('SecurityWarning', [response.advices]);
      }

      if (response.advices.error !== undefined && response.advices.error.length > 0) {
        $.each(response.advices.error, function (key, value) {
          htmlMessages += '<div class="item">';
          htmlMessages += '<i class="frown outline red icon"></i>';
          htmlMessages += "".concat(value);
          htmlMessages += '</div>';
          countMessages += 1;
        });
      }

      if (response.advices.warning !== undefined && response.advices.warning.length > 0) {
        $.each(response.advices.warning, function (key, value) {
          htmlMessages += '<div class="item yellow">';
          htmlMessages += '<i class="meh outline yellow icon"></i>';
          htmlMessages += "".concat(value);
          htmlMessages += '</div>';
          countMessages += 1;
        });
      }

      if (response.advices.info !== undefined && response.advices.info.length > 0) {
        $.each(response.advices.info, function (key, value) {
          htmlMessages += '<div class="item">';
          htmlMessages += '<i class="smile outline blue icon"></i>';
          htmlMessages += "".concat(value);
          htmlMessages += '</div>';
          countMessages += 1;
        });
      }

      if (response.advices.error !== undefined && response.advices.error.length > 0) {
        iconBellClass = 'red icon bell';
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
          },
          on: 'click',
          movePopup: false
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
/**
 *  Initialize advices worker on document ready
 */

$(document).ready(function () {
  advicesWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2VzL2FkdmljZXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImFkdmljZXNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRhZHZpY2VzIiwiJCIsIiRhZHZpY2VzQmVsbEJ1dHRvbiIsImluaXRpYWxpemUiLCJzaG93UHJldmlvdXNBZHZpY2UiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25EYXRhQ2hhbmdlZCIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJzZXNzaW9uU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwic2V0VGltZW91dCIsInByZXZpb3VzQWR2aWNlQmVsbCIsImdldEl0ZW0iLCJodG1sIiwicHJldmlvdXNBZHZpY2UiLCJwb3B1cCIsInBvc2l0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsIm9uIiwibW92ZVBvcHVwIiwiUGJ4QXBpIiwiQWR2aWNlc0dldExpc3QiLCJjYkFmdGVyUmVzcG9uc2UiLCJyZXNwb25zZSIsImFkdmljZXMiLCJ1bmRlZmluZWQiLCJodG1sTWVzc2FnZXMiLCJjb3VudE1lc3NhZ2VzIiwiaWNvbkJlbGxDbGFzcyIsImdsb2JhbFRyYW5zbGF0ZSIsImFkdl9Qb3B1cEhlYWRlciIsIm5lZWRVcGRhdGUiLCJsZW5ndGgiLCJ0cmlnZ2VyIiwiZXJyb3IiLCJlYWNoIiwia2V5IiwidmFsdWUiLCJ3YXJuaW5nIiwiaW5mbyIsInNldEl0ZW0iLCJmaW5kIiwidHJhbnNpdGlvbiIsInN1Y2Nlc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFN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LFVBQVAsQ0FDMUJsQixhQUFhLENBQUNjLE1BRFksRUFFMUJkLGFBQWEsQ0FBQ0MsT0FGWSxDQUE5QjtBQUlILEtBbkZELE1BbUZPLElBQUlnQyxRQUFRLENBQUNvQixPQUFULEtBQXFCLElBQXJCLElBQ0pwQixRQUFRLENBQUNDLE9BQVQsS0FBcUJDLFNBRGpCLElBRUpGLFFBQVEsQ0FBQ0MsT0FBVCxDQUFpQlEsTUFBakIsS0FBNEIsQ0FGNUIsRUFFK0I7QUFDbEMzQixNQUFBQSxjQUFjLENBQUNDLFVBQWYseUJBQTJDQyxzQkFBM0M7QUFDQUYsTUFBQUEsY0FBYyxDQUFDQyxVQUFmLDZCQUErQ0Msc0JBQS9DO0FBQ0FqQixNQUFBQSxhQUFhLENBQUNLLGtCQUFkLENBQ0tnQixJQURMLENBQ1Usd0NBRFY7QUFFSDtBQUNKO0FBekxpQixDQUF0QjtBQTRMQTtBQUNBO0FBQ0E7O0FBQ0FqQixDQUFDLENBQUNrRCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCdkQsRUFBQUEsYUFBYSxDQUFDTSxVQUFkO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBzZXNzaW9uU3RvcmFnZSwgJCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogQWR2aWNlIFdvcmtlciBtb2R1bGUuXG4gKiBAbW9kdWxlIGFkdmljZXNXb3JrZXJcbiAqL1xuY29uc3QgYWR2aWNlc1dvcmtlciA9IHtcblxuICAgIC8qKlxuICAgICAqIFRpbWUgaW4gbWlsbGlzZWNvbmRzIGJlZm9yZSBmZXRjaGluZyBuZXcgYWR2aWNlLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdGltZU91dDogMTAwMDAsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgaWQgb2YgdGhlIHRpbWVyIGZ1bmN0aW9uIGZvciBhZHZpY2Ugd29ya2VyLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdGltZU91dEhhbmRsZTogMCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBlbGVtZW50IGZvciBhZHZpY2UgY29udGFpbmVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFkdmljZXM6ICQoJyNhZHZpY2VzJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgZWxlbWVudCBmb3IgYWR2aWNlIGJlbGwgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFkdmljZXNCZWxsQnV0dG9uOiAkKCcjc2hvdy1hZHZpY2VzLWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGFkdmljZSB3b3JrZXIuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgYWR2aWNlc1dvcmtlci5zaG93UHJldmlvdXNBZHZpY2UoKTtcblxuICAgICAgICAvLyBMZXQncyBpbml0aWF0ZSB0aGUgcmV0cmlldmFsIG9mIG5ldyBhZHZpY2UuXG4gICAgICAgIGFkdmljZXNXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignQ29uZmlnRGF0YUNoYW5nZWQnLCBhZHZpY2VzV29ya2VyLmNiT25EYXRhQ2hhbmdlZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc3RhcnRzIHRoZSBhZHZpY2VzIHdvcmtlci5cbiAgICAgKi9cbiAgICByZXN0YXJ0V29ya2VyKCkge1xuICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KGFkdmljZXNXb3JrZXIudGltZW91dEhhbmRsZSk7XG4gICAgICAgIGFkdmljZXNXb3JrZXIud29ya2VyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIGxhbmd1YWdlIG9yIGRhdGEgY2hhbmdlLlxuICAgICAqL1xuICAgIGNiT25EYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG4gICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcbiAgICAgICAgc2V0VGltZW91dChhZHZpY2VzV29ya2VyLnJlc3RhcnRXb3JrZXIsIDMwMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBvbGQgYWR2aWNlIHVudGlsIHJlY2VpdmluZyBhbiB1cGRhdGUgZnJvbSB0aGUgc3RhdGlvbi5cbiAgICAgKi9cbiAgICBzaG93UHJldmlvdXNBZHZpY2UoKSB7XG4gICAgICAgIGNvbnN0IHByZXZpb3VzQWR2aWNlQmVsbCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcbiAgICAgICAgaWYgKHByZXZpb3VzQWR2aWNlQmVsbCkge1xuICAgICAgICAgICAgYWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b24uaHRtbChwcmV2aW91c0FkdmljZUJlbGwpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByZXZpb3VzQWR2aWNlID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG4gICAgICAgIGlmIChwcmV2aW91c0FkdmljZSkge1xuICAgICAgICAgICAgYWR2aWNlc1dvcmtlci4kYWR2aWNlcy5odG1sKHByZXZpb3VzQWR2aWNlKTtcbiAgICAgICAgICAgIGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b20gbGVmdCcsXG4gICAgICAgICAgICAgICAgICAgIHBvcHVwOiBhZHZpY2VzV29ya2VyLiRhZHZpY2VzLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwMDAsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uOiAnY2xpY2snLFxuICAgICAgICAgICAgICAgICAgICBtb3ZlUG9wdXA6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFdvcmtlciBmdW5jdGlvbiBmb3IgZmV0Y2hpbmcgYWR2aWNlcy5cbiAgICAgKi9cbiAgICB3b3JrZXIoKSB7XG4gICAgICAgIFBieEFwaS5BZHZpY2VzR2V0TGlzdChhZHZpY2VzV29ya2VyLmNiQWZ0ZXJSZXNwb25zZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIHJlY2VpdmluZyB0aGUgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSS5cbiAgICAgKi9cbiAgICBjYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbCgnJyk7XG4gICAgICAgIGlmIChyZXNwb25zZS5hZHZpY2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBodG1sTWVzc2FnZXMgPSAnJztcbiAgICAgICAgICAgIGxldCBjb3VudE1lc3NhZ2VzID0gMDtcbiAgICAgICAgICAgIGxldCBpY29uQmVsbENsYXNzID0gJyc7XG4gICAgICAgICAgICBodG1sTWVzc2FnZXMgKz0gYDxkaXYgY2xhc3M9XCJ1aSBoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5hZHZfUG9wdXBIZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cInVpIHJlbGF4ZWQgZGl2aWRlZCBsaXN0XCI+JztcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmFkdmljZXMubmVlZFVwZGF0ZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UuYWR2aWNlcy5uZWVkVXBkYXRlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkKHdpbmRvdykudHJpZ2dlcignU2VjdXJpdHlXYXJuaW5nJywgW3Jlc3BvbnNlLmFkdmljZXNdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmFkdmljZXMuZXJyb3IgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLmFkdmljZXMuZXJyb3IubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5hZHZpY2VzLmVycm9yLCAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+JztcbiAgICAgICAgICAgICAgICAgICAgaHRtbE1lc3NhZ2VzICs9ICc8aSBjbGFzcz1cImZyb3duIG91dGxpbmUgcmVkIGljb25cIj48L2k+JztcbiAgICAgICAgICAgICAgICAgICAgaHRtbE1lc3NhZ2VzICs9IGAke3ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgICAgIGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+JztcbiAgICAgICAgICAgICAgICAgICAgY291bnRNZXNzYWdlcyArPSAxO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmFkdmljZXMud2FybmluZyAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UuYWR2aWNlcy53YXJuaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkLmVhY2gocmVzcG9uc2UuYWR2aWNlcy53YXJuaW5nLCAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtIHllbGxvd1wiPic7XG4gICAgICAgICAgICAgICAgICAgIGh0bWxNZXNzYWdlcyArPSAnPGkgY2xhc3M9XCJtZWggb3V0bGluZSB5ZWxsb3cgaWNvblwiPjwvaT4nO1xuICAgICAgICAgICAgICAgICAgICBodG1sTWVzc2FnZXMgKz0gYCR7dmFsdWV9YDtcbiAgICAgICAgICAgICAgICAgICAgaHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgICAgICAgICBjb3VudE1lc3NhZ2VzICs9IDE7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuYWR2aWNlcy5pbmZvICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5hZHZpY2VzLmluZm8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5hZHZpY2VzLmluZm8sIChrZXksIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj4nO1xuICAgICAgICAgICAgICAgICAgICBodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwic21pbGUgb3V0bGluZSBibHVlIGljb25cIj48L2k+JztcbiAgICAgICAgICAgICAgICAgICAgaHRtbE1lc3NhZ2VzICs9IGAke3ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgICAgIGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+JztcbiAgICAgICAgICAgICAgICAgICAgY291bnRNZXNzYWdlcyArPSAxO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuYWR2aWNlcy5lcnJvciAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UuYWR2aWNlcy5lcnJvci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaWNvbkJlbGxDbGFzcyA9ICdyZWQgaWNvbiBiZWxsJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UuYWR2aWNlcy53YXJuaW5nICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5hZHZpY2VzLndhcm5pbmcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGljb25CZWxsQ2xhc3MgPSAneWVsbG93IGljb24gYmVsbCc7XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UuYWR2aWNlcy5pbmZvICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5hZHZpY2VzLmluZm8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGljb25CZWxsQ2xhc3MgPSAnYmx1ZSBpY29uIGJlbGwnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgYWR2aWNlc1dvcmtlci4kYWR2aWNlcy5odG1sKGh0bWxNZXNzYWdlcyk7XG4gICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGBwcmV2aW91c0FkdmljZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gLCBodG1sTWVzc2FnZXMpO1xuXG4gICAgICAgICAgICBpZiAoY291bnRNZXNzYWdlcyA+IDApIHtcbiAgICAgICAgICAgICAgICBhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCIke2ljb25CZWxsQ2xhc3N9XCI+PC9pPiR7Y291bnRNZXNzYWdlc31gKVxuICAgICAgICAgICAgICAgICAgICAucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b20gbGVmdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3B1cDogYWR2aWNlc1dvcmtlci4kYWR2aWNlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMDAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uOiAnY2xpY2snLFxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZVBvcHVwOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b24uZmluZCgnaScpXG4gICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdzZXQgbG9vcGluZycpXG4gICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdwdWxzZScsICcxMDAwbXMnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYWR2aWNlc1dvcmtlci4kYWR2aWNlc0JlbGxCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwiZ3JleSBpY29uIGJlbGxcIj48L2k+YClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gLCBhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5odG1sKCkpO1xuICAgICAgICAgICAgYWR2aWNlc1dvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG4gICAgICAgICAgICAgICAgYWR2aWNlc1dvcmtlci53b3JrZXIsXG4gICAgICAgICAgICAgICAgYWR2aWNlc1dvcmtlci50aW1lT3V0LFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdWNjZXNzID09PSB0cnVlXG4gICAgICAgICAgICAmJiByZXNwb25zZS5hZHZpY2VzICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICYmIHJlc3BvbnNlLmFkdmljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0FkdmljZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcbiAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcbiAgICAgICAgICAgIGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uXG4gICAgICAgICAgICAgICAgLmh0bWwoJzxpIGNsYXNzPVwiZ3JleSBpY29uIGJlbGwgb3V0bGluZVwiPjwvaT4nKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIGFkdmljZXMgd29ya2VyIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBhZHZpY2VzV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19