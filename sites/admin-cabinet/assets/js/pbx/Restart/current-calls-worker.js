"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

/* global PbxStatusAPI, globalTranslate, ExtensionsAPI */

/**
 * Object responsible for handling current calls information.
 *
 * @module currentCallsWorker
 */
var currentCallsWorker = {
  /**
   * Time in milliseconds before fetching new request.
   * @type {number}
   */
  timeOut: 3000,

  /**
   * The id of the timer function for the status worker.
   * @type {number}
   */
  timeOutHandle: 0,

  /**
   * jQuery object for the current calls information container.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $currentCallsInfo: null,

  /**
   * Initializes the current calls worker by restarting the worker.
   */
  initialize: function initialize() {
    currentCallsWorker.$currentCallsInfo = $('#current-calls-info');
    currentCallsWorker.restartWorker();
  },

  /**
   * Restarts the current calls worker by clearing the timeout handle and calling the worker function.
   */
  restartWorker: function restartWorker() {
    window.clearTimeout(currentCallsWorker.timeoutHandle);
    currentCallsWorker.worker();
  },

  /**
   * The main worker function that fetches current calls information.
   */
  worker: function worker() {
    PbxStatusAPI.getActiveChannels(currentCallsWorker.cbGetActiveChannels);
    currentCallsWorker.timeoutHandle = window.setTimeout(currentCallsWorker.worker, currentCallsWorker.timeOut);
  },

  /**
   * Callback function for processing the current calls response.
   * @param {Object} response - The response object containing current calls information.
   */
  cbGetActiveChannels: function cbGetActiveChannels(response) {
    currentCallsWorker.$currentCallsInfo.empty();
    if (response === false || _typeof(response) !== 'object') return;
    var respObject = response; // If no active calls, show info message

    if (!respObject || respObject.length === 0) {
      var infoMessage = "<div class=\"ui icon info message\">\n                <i class=\"info circle icon\"></i>\n                <div class=\"content\">\n                    <p>".concat(globalTranslate.rs_NoActiveCallsMessage, "</p>\n                </div>\n            </div>");
      currentCallsWorker.$currentCallsInfo.html(infoMessage);
      return;
    }

    var resultUl = "<h2 class=\"ui header\">".concat(globalTranslate.rs_CurrentCalls, "</h2>");
    resultUl += '<table class="ui very compact unstackable table">';
    resultUl += '<thead>';
    resultUl += "<th></th><th>".concat(globalTranslate.rs_DateCall, "</th><th>").concat(globalTranslate.rs_Src, "</th><th>").concat(globalTranslate.rs_Dst, "</th>");
    resultUl += '</thead>';
    resultUl += '<tbody>';
    $.each(respObject, function (index, value) {
      resultUl += '<tr>';
      resultUl += '<td><i class="spinner loading icon"></i></td>';
      resultUl += "<td>".concat(value.start, "</td>");
      resultUl += "<td class=\"need-update\">".concat(value.src_num, "</td>");
      resultUl += "<td class=\"need-update\">".concat(value.dst_num, "</td>");
      resultUl += '</tr>';
    });
    resultUl += '</tbody></table>';
    currentCallsWorker.$currentCallsInfo.html(resultUl);
    ExtensionsAPI.updatePhonesRepresent('need-update');
  }
};
/**
 * Initialize the current calls worker on document ready.
 */

$(document).ready(function () {
  currentCallsWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L2N1cnJlbnQtY2FsbHMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImN1cnJlbnRDYWxsc1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiJGN1cnJlbnRDYWxsc0luZm8iLCJpbml0aWFsaXplIiwiJCIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4U3RhdHVzQVBJIiwiZ2V0QWN0aXZlQ2hhbm5lbHMiLCJjYkdldEFjdGl2ZUNoYW5uZWxzIiwic2V0VGltZW91dCIsInJlc3BvbnNlIiwiZW1wdHkiLCJyZXNwT2JqZWN0IiwibGVuZ3RoIiwiaW5mb01lc3NhZ2UiLCJnbG9iYWxUcmFuc2xhdGUiLCJyc19Ob0FjdGl2ZUNhbGxzTWVzc2FnZSIsImh0bWwiLCJyZXN1bHRVbCIsInJzX0N1cnJlbnRDYWxscyIsInJzX0RhdGVDYWxsIiwicnNfU3JjIiwicnNfRHN0IiwiZWFjaCIsImluZGV4IiwidmFsdWUiLCJzdGFydCIsInNyY19udW0iLCJkc3RfbnVtIiwiRXh0ZW5zaW9uc0FQSSIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxrQkFBa0IsR0FBRztBQUV2QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsSUFOYzs7QUFRdkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLENBWlE7O0FBY3ZCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUUsSUFuQkk7O0FBcUJ2QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUF4QnVCLHdCQXdCVjtBQUNUSixJQUFBQSxrQkFBa0IsQ0FBQ0csaUJBQW5CLEdBQXVDRSxDQUFDLENBQUMscUJBQUQsQ0FBeEM7QUFDQUwsSUFBQUEsa0JBQWtCLENBQUNNLGFBQW5CO0FBQ0gsR0EzQnNCOztBQTZCdkI7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLGFBaEN1QiwyQkFnQ1A7QUFDWkMsSUFBQUEsTUFBTSxDQUFDQyxZQUFQLENBQW9CUixrQkFBa0IsQ0FBQ1MsYUFBdkM7QUFDQVQsSUFBQUEsa0JBQWtCLENBQUNVLE1BQW5CO0FBQ0gsR0FuQ3NCOztBQXFDdkI7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLE1BeEN1QixvQkF3Q2Q7QUFDTEMsSUFBQUEsWUFBWSxDQUFDQyxpQkFBYixDQUErQlosa0JBQWtCLENBQUNhLG1CQUFsRDtBQUNBYixJQUFBQSxrQkFBa0IsQ0FBQ1MsYUFBbkIsR0FDTUYsTUFBTSxDQUFDTyxVQUFQLENBQWtCZCxrQkFBa0IsQ0FBQ1UsTUFBckMsRUFBNkNWLGtCQUFrQixDQUFDQyxPQUFoRSxDQUROO0FBRUgsR0E1Q3NCOztBQThDdkI7QUFDSjtBQUNBO0FBQ0E7QUFDSVksRUFBQUEsbUJBbER1QiwrQkFrREhFLFFBbERHLEVBa0RPO0FBQzFCZixJQUFBQSxrQkFBa0IsQ0FBQ0csaUJBQW5CLENBQXFDYSxLQUFyQztBQUNBLFFBQUlELFFBQVEsS0FBSyxLQUFiLElBQXNCLFFBQU9BLFFBQVAsTUFBb0IsUUFBOUMsRUFBd0Q7QUFDeEQsUUFBTUUsVUFBVSxHQUFHRixRQUFuQixDQUgwQixDQUsxQjs7QUFDQSxRQUFJLENBQUNFLFVBQUQsSUFBZUEsVUFBVSxDQUFDQyxNQUFYLEtBQXNCLENBQXpDLEVBQTRDO0FBQ3hDLFVBQU1DLFdBQVcsdUtBR0pDLGVBQWUsQ0FBQ0MsdUJBSFoscURBQWpCO0FBTUFyQixNQUFBQSxrQkFBa0IsQ0FBQ0csaUJBQW5CLENBQXFDbUIsSUFBckMsQ0FBMENILFdBQTFDO0FBQ0E7QUFDSDs7QUFFRCxRQUFJSSxRQUFRLHFDQUE0QkgsZUFBZSxDQUFDSSxlQUE1QyxVQUFaO0FBQ0FELElBQUFBLFFBQVEsSUFBSSxtREFBWjtBQUNBQSxJQUFBQSxRQUFRLElBQUksU0FBWjtBQUNBQSxJQUFBQSxRQUFRLDJCQUFvQkgsZUFBZSxDQUFDSyxXQUFwQyxzQkFBMkRMLGVBQWUsQ0FBQ00sTUFBM0Usc0JBQTZGTixlQUFlLENBQUNPLE1BQTdHLFVBQVI7QUFDQUosSUFBQUEsUUFBUSxJQUFJLFVBQVo7QUFDQUEsSUFBQUEsUUFBUSxJQUFJLFNBQVo7QUFDQWxCLElBQUFBLENBQUMsQ0FBQ3VCLElBQUYsQ0FBT1gsVUFBUCxFQUFtQixVQUFDWSxLQUFELEVBQVFDLEtBQVIsRUFBa0I7QUFDakNQLE1BQUFBLFFBQVEsSUFBSSxNQUFaO0FBQ0FBLE1BQUFBLFFBQVEsSUFBSSwrQ0FBWjtBQUNBQSxNQUFBQSxRQUFRLGtCQUFXTyxLQUFLLENBQUNDLEtBQWpCLFVBQVI7QUFDQVIsTUFBQUEsUUFBUSx3Q0FBK0JPLEtBQUssQ0FBQ0UsT0FBckMsVUFBUjtBQUNBVCxNQUFBQSxRQUFRLHdDQUErQk8sS0FBSyxDQUFDRyxPQUFyQyxVQUFSO0FBQ0FWLE1BQUFBLFFBQVEsSUFBSSxPQUFaO0FBQ0gsS0FQRDtBQVFBQSxJQUFBQSxRQUFRLElBQUksa0JBQVo7QUFDQXZCLElBQUFBLGtCQUFrQixDQUFDRyxpQkFBbkIsQ0FBcUNtQixJQUFyQyxDQUEwQ0MsUUFBMUM7QUFDQVcsSUFBQUEsYUFBYSxDQUFDQyxxQkFBZCxDQUFvQyxhQUFwQztBQUNIO0FBcEZzQixDQUEzQjtBQXVGQTtBQUNBO0FBQ0E7O0FBQ0E5QixDQUFDLENBQUMrQixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCckMsRUFBQUEsa0JBQWtCLENBQUNJLFVBQW5CO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhTdGF0dXNBUEksIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9uc0FQSSAqL1xuXG4vKipcbiAqIE9iamVjdCByZXNwb25zaWJsZSBmb3IgaGFuZGxpbmcgY3VycmVudCBjYWxscyBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAbW9kdWxlIGN1cnJlbnRDYWxsc1dvcmtlclxuICovXG5jb25zdCBjdXJyZW50Q2FsbHNXb3JrZXIgPSB7XG5cbiAgICAvKipcbiAgICAgKiBUaW1lIGluIG1pbGxpc2Vjb25kcyBiZWZvcmUgZmV0Y2hpbmcgbmV3IHJlcXVlc3QuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB0aW1lT3V0OiAzMDAwLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGlkIG9mIHRoZSB0aW1lciBmdW5jdGlvbiBmb3IgdGhlIHN0YXR1cyB3b3JrZXIuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB0aW1lT3V0SGFuZGxlOiAwLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGN1cnJlbnQgY2FsbHMgaW5mb3JtYXRpb24gY29udGFpbmVyLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjdXJyZW50Q2FsbHNJbmZvOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGN1cnJlbnQgY2FsbHMgd29ya2VyIGJ5IHJlc3RhcnRpbmcgdGhlIHdvcmtlci5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjdXJyZW50Q2FsbHNXb3JrZXIuJGN1cnJlbnRDYWxsc0luZm8gPSAkKCcjY3VycmVudC1jYWxscy1pbmZvJyk7XG4gICAgICAgIGN1cnJlbnRDYWxsc1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc3RhcnRzIHRoZSBjdXJyZW50IGNhbGxzIHdvcmtlciBieSBjbGVhcmluZyB0aGUgdGltZW91dCBoYW5kbGUgYW5kIGNhbGxpbmcgdGhlIHdvcmtlciBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICByZXN0YXJ0V29ya2VyKCkge1xuICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KGN1cnJlbnRDYWxsc1dvcmtlci50aW1lb3V0SGFuZGxlKTtcbiAgICAgICAgY3VycmVudENhbGxzV29ya2VyLndvcmtlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUaGUgbWFpbiB3b3JrZXIgZnVuY3Rpb24gdGhhdCBmZXRjaGVzIGN1cnJlbnQgY2FsbHMgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgd29ya2VyKCkge1xuICAgICAgICBQYnhTdGF0dXNBUEkuZ2V0QWN0aXZlQ2hhbm5lbHMoY3VycmVudENhbGxzV29ya2VyLmNiR2V0QWN0aXZlQ2hhbm5lbHMpO1xuICAgICAgICBjdXJyZW50Q2FsbHNXb3JrZXIudGltZW91dEhhbmRsZVxuICAgICAgICAgICAgPSB3aW5kb3cuc2V0VGltZW91dChjdXJyZW50Q2FsbHNXb3JrZXIud29ya2VyLCBjdXJyZW50Q2FsbHNXb3JrZXIudGltZU91dCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciBwcm9jZXNzaW5nIHRoZSBjdXJyZW50IGNhbGxzIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgY29udGFpbmluZyBjdXJyZW50IGNhbGxzIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGNiR2V0QWN0aXZlQ2hhbm5lbHMocmVzcG9uc2UpIHtcbiAgICAgICAgY3VycmVudENhbGxzV29ya2VyLiRjdXJyZW50Q2FsbHNJbmZvLmVtcHR5KCk7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgdHlwZW9mIHJlc3BvbnNlICE9PSAnb2JqZWN0JykgcmV0dXJuO1xuICAgICAgICBjb25zdCByZXNwT2JqZWN0ID0gcmVzcG9uc2U7XG5cbiAgICAgICAgLy8gSWYgbm8gYWN0aXZlIGNhbGxzLCBzaG93IGluZm8gbWVzc2FnZVxuICAgICAgICBpZiAoIXJlc3BPYmplY3QgfHwgcmVzcE9iamVjdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGluZm9NZXNzYWdlID0gYDxkaXYgY2xhc3M9XCJ1aSBpY29uIGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5yc19Ob0FjdGl2ZUNhbGxzTWVzc2FnZX08L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgY3VycmVudENhbGxzV29ya2VyLiRjdXJyZW50Q2FsbHNJbmZvLmh0bWwoaW5mb01lc3NhZ2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHJlc3VsdFVsID0gYDxoMiBjbGFzcz1cInVpIGhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLnJzX0N1cnJlbnRDYWxsc308L2gyPmA7XG4gICAgICAgIHJlc3VsdFVsICs9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGNvbXBhY3QgdW5zdGFja2FibGUgdGFibGVcIj4nO1xuICAgICAgICByZXN1bHRVbCArPSAnPHRoZWFkPic7XG4gICAgICAgIHJlc3VsdFVsICs9IGA8dGg+PC90aD48dGg+JHtnbG9iYWxUcmFuc2xhdGUucnNfRGF0ZUNhbGx9PC90aD48dGg+JHtnbG9iYWxUcmFuc2xhdGUucnNfU3JjfTwvdGg+PHRoPiR7Z2xvYmFsVHJhbnNsYXRlLnJzX0RzdH08L3RoPmA7XG4gICAgICAgIHJlc3VsdFVsICs9ICc8L3RoZWFkPic7XG4gICAgICAgIHJlc3VsdFVsICs9ICc8dGJvZHk+JztcbiAgICAgICAgJC5lYWNoKHJlc3BPYmplY3QsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJlc3VsdFVsICs9ICc8dHI+JztcbiAgICAgICAgICAgIHJlc3VsdFVsICs9ICc8dGQ+PGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT48L3RkPic7XG4gICAgICAgICAgICByZXN1bHRVbCArPSBgPHRkPiR7dmFsdWUuc3RhcnR9PC90ZD5gO1xuICAgICAgICAgICAgcmVzdWx0VWwgKz0gYDx0ZCBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHt2YWx1ZS5zcmNfbnVtfTwvdGQ+YDtcbiAgICAgICAgICAgIHJlc3VsdFVsICs9IGA8dGQgY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7dmFsdWUuZHN0X251bX08L3RkPmA7XG4gICAgICAgICAgICByZXN1bHRVbCArPSAnPC90cj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzdWx0VWwgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICBjdXJyZW50Q2FsbHNXb3JrZXIuJGN1cnJlbnRDYWxsc0luZm8uaHRtbChyZXN1bHRVbCk7XG4gICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgdGhlIGN1cnJlbnQgY2FsbHMgd29ya2VyIG9uIGRvY3VtZW50IHJlYWR5LlxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY3VycmVudENhbGxzV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19