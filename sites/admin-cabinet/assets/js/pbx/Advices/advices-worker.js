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
 * Advices Worker module.
 * @module advicesWorker
 */
var advicesWorker = {
  /**
   * Time in milliseconds before fetching new advices.
   * @type {number}
   */
  timeOut: 300000,

  /**
   * Timeout handle for advices worker.
   * @type {number}
   */
  timeOutHandle: '',

  /**
   * jQuery element for advices container.
   * @type {jQuery}
   */
  $advices: $('#advices'),

  /**
   * jQuery element for advices bell button.
   * @type {jQuery}
   */
  $advicesBellButton: $('#show-advices-button'),

  /**
   * Initializes the advices worker.
   */
  initialize: function initialize() {
    advicesWorker.showPreviousAdvice(); // Let's initiate the retrieval of new advices.

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
      htmlMessages += '<div class="ui relaxed divided list">';

      if (response.advices.needUpdate !== undefined && response.advices.needUpdate.length > 0) {
        $(window).trigger('SecurityWarning', [response.advices]);
      }

      if (response.advices.error !== undefined && response.advices.error.length > 0) {
        $.each(response.advices.error, function (key, value) {
          htmlMessages += '<div class="item">';
          htmlMessages += '<i class="frown outline red icon"></i>';
          htmlMessages += "<b>".concat(value, "</b>");
          htmlMessages += '</div>';
          countMessages += 1;
        });
      }

      if (response.advices.warning !== undefined && response.advices.warning.length > 0) {
        $.each(response.advices.warning, function (key, value) {
          htmlMessages += '<div class="item yellow">';
          htmlMessages += '<i class="meh outline yellow icon"></i>';
          htmlMessages += "<b>".concat(value, "</b>");
          htmlMessages += '</div>';
          countMessages += 1;
        });
      }

      if (response.advices.info !== undefined && response.advices.info.length > 0) {
        $.each(response.advices.info, function (key, value) {
          htmlMessages += '<div class="item">';
          htmlMessages += '<i class="smile outline blue icon"></i>';
          htmlMessages += "<b>".concat(value, "</b>");
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
          },
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
$(document).ready(function () {
  advicesWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BZHZpY2VzL2FkdmljZXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImFkdmljZXNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRhZHZpY2VzIiwiJCIsIiRhZHZpY2VzQmVsbEJ1dHRvbiIsImluaXRpYWxpemUiLCJzaG93UHJldmlvdXNBZHZpY2UiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiT25EYXRhQ2hhbmdlZCIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJzZXNzaW9uU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwic2V0VGltZW91dCIsInByZXZpb3VzQWR2aWNlQmVsbCIsImdldEl0ZW0iLCJodG1sIiwicHJldmlvdXNBZHZpY2UiLCJQYnhBcGkiLCJBZHZpY2VzR2V0TGlzdCIsImNiQWZ0ZXJSZXNwb25zZSIsInJlc3BvbnNlIiwiYWR2aWNlcyIsInVuZGVmaW5lZCIsImh0bWxNZXNzYWdlcyIsImNvdW50TWVzc2FnZXMiLCJpY29uQmVsbENsYXNzIiwibmVlZFVwZGF0ZSIsImxlbmd0aCIsInRyaWdnZXIiLCJlcnJvciIsImVhY2giLCJrZXkiLCJ2YWx1ZSIsIndhcm5pbmciLCJpbmZvIiwic2V0SXRlbSIsInBvcHVwIiwicG9zaXRpb24iLCJkZWxheSIsInNob3ciLCJoaWRlIiwibW92ZVBvcHVwIiwiZmluZCIsInRyYW5zaXRpb24iLCJzdWNjZXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ3JCO0FBQ0Q7QUFDQTtBQUNBO0FBQ0NDLEVB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Q0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJwRCxFQUFBQSxhQUFhLENBQUNNLFVBQWQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIHNlc3Npb25TdG9yYWdlLCAkLCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBBZHZpY2VzIFdvcmtlciBtb2R1bGUuXG4gKiBAbW9kdWxlIGFkdmljZXNXb3JrZXJcbiAqL1xuY29uc3QgYWR2aWNlc1dvcmtlciA9IHtcblx0LyoqXG5cdCAqIFRpbWUgaW4gbWlsbGlzZWNvbmRzIGJlZm9yZSBmZXRjaGluZyBuZXcgYWR2aWNlcy5cblx0ICogQHR5cGUge251bWJlcn1cblx0ICovXG5cdHRpbWVPdXQ6IDMwMDAwMCxcblxuXHQvKipcblx0ICogVGltZW91dCBoYW5kbGUgZm9yIGFkdmljZXMgd29ya2VyLlxuXHQgKiBAdHlwZSB7bnVtYmVyfVxuXHQgKi9cblx0dGltZU91dEhhbmRsZTogJycsXG5cblx0LyoqXG5cdCAqIGpRdWVyeSBlbGVtZW50IGZvciBhZHZpY2VzIGNvbnRhaW5lci5cblx0ICogQHR5cGUge2pRdWVyeX1cblx0ICovXG5cdCRhZHZpY2VzOiAkKCcjYWR2aWNlcycpLFxuXG5cdC8qKlxuXHQgKiBqUXVlcnkgZWxlbWVudCBmb3IgYWR2aWNlcyBiZWxsIGJ1dHRvbi5cblx0ICogQHR5cGUge2pRdWVyeX1cblx0ICovXG5cdCRhZHZpY2VzQmVsbEJ1dHRvbjogJCgnI3Nob3ctYWR2aWNlcy1idXR0b24nKSxcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZXMgdGhlIGFkdmljZXMgd29ya2VyLlxuXHQgKi9cblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRhZHZpY2VzV29ya2VyLnNob3dQcmV2aW91c0FkdmljZSgpO1xuXHRcdC8vIExldCdzIGluaXRpYXRlIHRoZSByZXRyaWV2YWwgb2YgbmV3IGFkdmljZXMuXG5cdFx0YWR2aWNlc1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgYWR2aWNlc1dvcmtlci5jYk9uRGF0YUNoYW5nZWQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXN0YXJ0cyB0aGUgYWR2aWNlcyB3b3JrZXIuXG5cdCAqL1xuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoYWR2aWNlc1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRhZHZpY2VzV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBFdmVudCBoYW5kbGVyIGZvciBsYW5ndWFnZSBvciBkYXRhIGNoYW5nZS5cblx0ICovXG5cdGNiT25EYXRhQ2hhbmdlZCgpIHtcblx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0FkdmljZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0FkdmljZUJlbGwke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0c2V0VGltZW91dChhZHZpY2VzV29ya2VyLnJlc3RhcnRXb3JrZXIsMzAwMCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNob3dzIG9sZCBhZHZpY2UgdW50aWwgcmVjZWl2aW5nIGFuIHVwZGF0ZSBmcm9tIHRoZSBzdGF0aW9uLlxuXHQgKi9cblx0c2hvd1ByZXZpb3VzQWR2aWNlKCkge1xuXHRcdGNvbnN0IHByZXZpb3VzQWR2aWNlQmVsbCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRpZiAocHJldmlvdXNBZHZpY2VCZWxsKSB7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5odG1sKHByZXZpb3VzQWR2aWNlQmVsbCk7XG5cdFx0fVxuXHRcdGNvbnN0IHByZXZpb3VzQWR2aWNlID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0aWYgKHByZXZpb3VzQWR2aWNlKSB7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzLmh0bWwocHJldmlvdXNBZHZpY2UpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogV29ya2VyIGZ1bmN0aW9uIGZvciBmZXRjaGluZyBhZHZpY2VzLlxuXHQgKi9cblx0d29ya2VyKCkge1xuXHRcdFBieEFwaS5BZHZpY2VzR2V0TGlzdChhZHZpY2VzV29ya2VyLmNiQWZ0ZXJSZXNwb25zZSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIHJlY2VpdmluZyB0aGUgcmVzcG9uc2UuXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkuXG5cdCAqL1xuXHRjYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbCgnJyk7XG5cdFx0aWYgKHJlc3BvbnNlLmFkdmljZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bGV0IGh0bWxNZXNzYWdlcyA9ICcnO1xuXHRcdFx0bGV0IGNvdW50TWVzc2FnZXMgPSAwO1xuXHRcdFx0bGV0IGljb25CZWxsQ2xhc3MgPSAnJztcblx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cInVpIHJlbGF4ZWQgZGl2aWRlZCBsaXN0XCI+JztcblxuXHRcdFx0aWYgKHJlc3BvbnNlLmFkdmljZXMubmVlZFVwZGF0ZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMubmVlZFVwZGF0ZS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQod2luZG93KS50cmlnZ2VyKCdTZWN1cml0eVdhcm5pbmcnLCBbcmVzcG9uc2UuYWR2aWNlc10pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocmVzcG9uc2UuYWR2aWNlcy5lcnJvciAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMuZXJyb3IubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UuYWR2aWNlcy5lcnJvciwgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwiZnJvd24gb3V0bGluZSByZWQgaWNvblwiPjwvaT4nO1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSBgPGI+JHt2YWx1ZX08L2I+YDtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0Y291bnRNZXNzYWdlcyArPSAxO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZS5hZHZpY2VzLndhcm5pbmcgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLndhcm5pbmcubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UuYWR2aWNlcy53YXJuaW5nLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPGRpdiBjbGFzcz1cIml0ZW0geWVsbG93XCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwibWVoIG91dGxpbmUgeWVsbG93IGljb25cIj48L2k+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxiPiR7dmFsdWV9PC9iPmA7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGNvdW50TWVzc2FnZXMgKz0gMTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2UuYWR2aWNlcy5pbmZvICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcy5pbmZvLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLmFkdmljZXMuaW5mbywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gJzxpIGNsYXNzPVwic21pbGUgb3V0bGluZSBibHVlIGljb25cIj48L2k+Jztcblx0XHRcdFx0XHRodG1sTWVzc2FnZXMgKz0gYDxiPiR7dmFsdWV9PC9iPmA7XG5cdFx0XHRcdFx0aHRtbE1lc3NhZ2VzICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdGNvdW50TWVzc2FnZXMgKz0gMTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyZXNwb25zZS5hZHZpY2VzLmVycm9yICE9PSB1bmRlZmluZWRcblx0XHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcy5lcnJvci5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGljb25CZWxsQ2xhc3MgPSAncmVkIGxhcmdlIGljb24gYmVsbCc7XG5cdFx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmFkdmljZXMud2FybmluZyAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHJlc3BvbnNlLmFkdmljZXMud2FybmluZy5sZW5ndGggPiAwKXtcblx0XHRcdFx0aWNvbkJlbGxDbGFzcyA9ICd5ZWxsb3cgaWNvbiBiZWxsJztcblxuXHRcdFx0fSBlbHNlIGlmIChyZXNwb25zZS5hZHZpY2VzLmluZm8gIT09IHVuZGVmaW5lZFxuXHRcdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLmluZm8ubGVuZ3RoID4gMCl7XG5cdFx0XHRcdGljb25CZWxsQ2xhc3MgPSAnYmx1ZSBpY29uIGJlbGwnO1xuXHRcdFx0fVxuXG5cblx0XHRcdGh0bWxNZXNzYWdlcyArPSAnPC9kaXY+Jztcblx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXMuaHRtbChodG1sTWVzc2FnZXMpO1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCwgaHRtbE1lc3NhZ2VzKTtcblxuXHRcdFx0aWYgKGNvdW50TWVzc2FnZXM+MCl7XG5cdFx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uXG5cdFx0XHRcdFx0Lmh0bWwoYDxpIGNsYXNzPVwiJHtpY29uQmVsbENsYXNzfVwiPjwvaT4ke2NvdW50TWVzc2FnZXN9YClcblx0XHRcdFx0XHQucG9wdXAoe1xuXHRcdFx0XHRcdFx0cG9zaXRpb246ICdib3R0b20gbGVmdCcsXG5cdFx0XHRcdFx0XHRwb3B1cDogYWR2aWNlc1dvcmtlci4kYWR2aWNlcyxcblx0XHRcdFx0XHRcdGRlbGF5OiB7XG5cdFx0XHRcdFx0XHRcdHNob3c6IDMwMCxcblx0XHRcdFx0XHRcdFx0aGlkZTogMTAwMDAsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0bW92ZVBvcHVwOiBmYWxzZVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5maW5kKCdpJylcblx0XHRcdFx0XHQudHJhbnNpdGlvbignc2V0IGxvb3BpbmcnKVxuXHRcdFx0XHRcdC50cmFuc2l0aW9uKCdwdWxzZScsICcxMDAwbXMnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGFkdmljZXNXb3JrZXIuJGFkdmljZXNCZWxsQnV0dG9uXG5cdFx0XHRcdFx0Lmh0bWwoYDxpIGNsYXNzPVwiZ3JleSBpY29uIGJlbGxcIj48L2k+YClcblx0XHRcdH1cblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oYHByZXZpb3VzQWR2aWNlQmVsbCR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gLCBhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvbi5odG1sKCkpO1xuXHRcdFx0YWR2aWNlc1dvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG5cdFx0XHRcdGFkdmljZXNXb3JrZXIud29ya2VyLFxuXHRcdFx0XHRhZHZpY2VzV29ya2VyLnRpbWVPdXQsXG5cdFx0XHQpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZVxuXHRcdFx0JiYgcmVzcG9uc2UuYWR2aWNlcyAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiByZXNwb25zZS5hZHZpY2VzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNBZHZpY2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0FkdmljZUJlbGwke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0XHRhZHZpY2VzV29ya2VyLiRhZHZpY2VzQmVsbEJ1dHRvblxuXHRcdFx0XHQuaHRtbCgnPGkgY2xhc3M9XCJncmV5IGljb24gYmVsbCBvdXRsaW5lXCI+PC9pPicpO1xuXHRcdH1cblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0YWR2aWNlc1dvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==