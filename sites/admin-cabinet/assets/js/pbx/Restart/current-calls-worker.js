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

/* global PbxApi, globalTranslate */

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
   * @type {jQuery}
   */
  $currentCallsInfo: $('#current-calls-info'),

  /**
   * Initializes the current calls worker by restarting the worker.
   */
  initialize: function initialize() {
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
    PbxApi.GetCurrentCalls(currentCallsWorker.cbGetCurrentCalls);
    currentCallsWorker.timeoutHandle = window.setTimeout(currentCallsWorker.worker, currentCallsWorker.timeOut);
  },

  /**
   * Callback function for processing the current calls response.
   * @param {Object} response - The response object containing current calls information.
   */
  cbGetCurrentCalls: function cbGetCurrentCalls(response) {
    currentCallsWorker.$currentCallsInfo.empty();
    if (response === false || _typeof(response) !== 'object') return;
    var respObject = response;
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
    Extensions.UpdatePhonesRepresent('need-update');
  }
};
/**
 * Initialize the current calls worker on document ready.
 */

$(document).ready(function () {
  currentCallsWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L2N1cnJlbnQtY2FsbHMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImN1cnJlbnRDYWxsc1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiJGN1cnJlbnRDYWxsc0luZm8iLCIkIiwiaW5pdGlhbGl6ZSIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4QXBpIiwiR2V0Q3VycmVudENhbGxzIiwiY2JHZXRDdXJyZW50Q2FsbHMiLCJzZXRUaW1lb3V0IiwicmVzcG9uc2UiLCJlbXB0eSIsInJlc3BPYmplY3QiLCJyZXN1bHRVbCIsImdsb2JhbFRyYW5zbGF0ZSIsInJzX0N1cnJlbnRDYWxscyIsInJzX0RhdGVDYWxsIiwicnNfU3JjIiwicnNfRHN0IiwiZWFjaCIsImluZGV4IiwidmFsdWUiLCJzdGFydCIsInNyY19udW0iLCJkc3RfbnVtIiwiaHRtbCIsIkV4dGVuc2lvbnMiLCJVcGRhdGVQaG9uZXNSZXByZXNlbnQiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsa0JBQWtCLEdBQUc7QUFFdkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLElBTmM7O0FBUXZCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxDQVpROztBQWN2QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRUMsQ0FBQyxDQUFDLHFCQUFELENBbEJHOztBQW9CdkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBdkJ1Qix3QkF1QlY7QUFDVEwsSUFBQUEsa0JBQWtCLENBQUNNLGFBQW5CO0FBQ0gsR0F6QnNCOztBQTJCdkI7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLGFBOUJ1QiwyQkE4QlA7QUFDWkMsSUFBQUEsTUFBTSxDQUFDQyxZQUFQLENBQW9CUixrQkFBa0IsQ0FBQ1MsYUFBdkM7QUFDQVQsSUFBQUEsa0JBQWtCLENBQUNVLE1BQW5CO0FBQ0gsR0FqQ3NCOztBQW1DdkI7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLE1BdEN1QixvQkFzQ2Q7QUFDTEMsSUFBQUEsTUFBTSxDQUFDQyxlQUFQLENBQXVCWixrQkFBa0IsQ0FBQ2EsaUJBQTFDO0FBQ0FiLElBQUFBLGtCQUFrQixDQUFDUyxhQUFuQixHQUNNRixNQUFNLENBQUNPLFVBQVAsQ0FBa0JkLGtCQUFrQixDQUFDVSxNQUFyQyxFQUE2Q1Ysa0JBQWtCLENBQUNDLE9BQWhFLENBRE47QUFFSCxHQTFDc0I7O0FBNEN2QjtBQUNKO0FBQ0E7QUFDQTtBQUNJWSxFQUFBQSxpQkFoRHVCLDZCQWdETEUsUUFoREssRUFnREs7QUFDeEJmLElBQUFBLGtCQUFrQixDQUFDRyxpQkFBbkIsQ0FBcUNhLEtBQXJDO0FBQ0EsUUFBSUQsUUFBUSxLQUFLLEtBQWIsSUFBc0IsUUFBT0EsUUFBUCxNQUFvQixRQUE5QyxFQUF3RDtBQUN4RCxRQUFNRSxVQUFVLEdBQUdGLFFBQW5CO0FBQ0EsUUFBSUcsUUFBUSxxQ0FBNEJDLGVBQWUsQ0FBQ0MsZUFBNUMsVUFBWjtBQUNBRixJQUFBQSxRQUFRLElBQUksbURBQVo7QUFDQUEsSUFBQUEsUUFBUSxJQUFJLFNBQVo7QUFDQUEsSUFBQUEsUUFBUSwyQkFBb0JDLGVBQWUsQ0FBQ0UsV0FBcEMsc0JBQTJERixlQUFlLENBQUNHLE1BQTNFLHNCQUE2RkgsZUFBZSxDQUFDSSxNQUE3RyxVQUFSO0FBQ0FMLElBQUFBLFFBQVEsSUFBSSxVQUFaO0FBQ0FBLElBQUFBLFFBQVEsSUFBSSxTQUFaO0FBQ0FkLElBQUFBLENBQUMsQ0FBQ29CLElBQUYsQ0FBT1AsVUFBUCxFQUFtQixVQUFDUSxLQUFELEVBQVFDLEtBQVIsRUFBa0I7QUFDakNSLE1BQUFBLFFBQVEsSUFBSSxNQUFaO0FBQ0FBLE1BQUFBLFFBQVEsSUFBSSwrQ0FBWjtBQUNBQSxNQUFBQSxRQUFRLGtCQUFXUSxLQUFLLENBQUNDLEtBQWpCLFVBQVI7QUFDQVQsTUFBQUEsUUFBUSx3Q0FBK0JRLEtBQUssQ0FBQ0UsT0FBckMsVUFBUjtBQUNBVixNQUFBQSxRQUFRLHdDQUErQlEsS0FBSyxDQUFDRyxPQUFyQyxVQUFSO0FBQ0FYLE1BQUFBLFFBQVEsSUFBSSxPQUFaO0FBQ0gsS0FQRDtBQVFBQSxJQUFBQSxRQUFRLElBQUksa0JBQVo7QUFDQWxCLElBQUFBLGtCQUFrQixDQUFDRyxpQkFBbkIsQ0FBcUMyQixJQUFyQyxDQUEwQ1osUUFBMUM7QUFDQWEsSUFBQUEsVUFBVSxDQUFDQyxxQkFBWCxDQUFpQyxhQUFqQztBQUNIO0FBckVzQixDQUEzQjtBQXdFQTtBQUNBO0FBQ0E7O0FBQ0E1QixDQUFDLENBQUM2QixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbEMsRUFBQUEsa0JBQWtCLENBQUNLLFVBQW5CO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIE9iamVjdCByZXNwb25zaWJsZSBmb3IgaGFuZGxpbmcgY3VycmVudCBjYWxscyBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAbW9kdWxlIGN1cnJlbnRDYWxsc1dvcmtlclxuICovXG5jb25zdCBjdXJyZW50Q2FsbHNXb3JrZXIgPSB7XG5cbiAgICAvKipcbiAgICAgKiBUaW1lIGluIG1pbGxpc2Vjb25kcyBiZWZvcmUgZmV0Y2hpbmcgbmV3IHJlcXVlc3QuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB0aW1lT3V0OiAzMDAwLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGlkIG9mIHRoZSB0aW1lciBmdW5jdGlvbiBmb3IgdGhlIHN0YXR1cyB3b3JrZXIuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB0aW1lT3V0SGFuZGxlOiAwLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGN1cnJlbnQgY2FsbHMgaW5mb3JtYXRpb24gY29udGFpbmVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGN1cnJlbnRDYWxsc0luZm86ICQoJyNjdXJyZW50LWNhbGxzLWluZm8nKSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjdXJyZW50IGNhbGxzIHdvcmtlciBieSByZXN0YXJ0aW5nIHRoZSB3b3JrZXIuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY3VycmVudENhbGxzV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzdGFydHMgdGhlIGN1cnJlbnQgY2FsbHMgd29ya2VyIGJ5IGNsZWFyaW5nIHRoZSB0aW1lb3V0IGhhbmRsZSBhbmQgY2FsbGluZyB0aGUgd29ya2VyIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIHJlc3RhcnRXb3JrZXIoKSB7XG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQoY3VycmVudENhbGxzV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuICAgICAgICBjdXJyZW50Q2FsbHNXb3JrZXIud29ya2VyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBtYWluIHdvcmtlciBmdW5jdGlvbiB0aGF0IGZldGNoZXMgY3VycmVudCBjYWxscyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICB3b3JrZXIoKSB7XG4gICAgICAgIFBieEFwaS5HZXRDdXJyZW50Q2FsbHMoY3VycmVudENhbGxzV29ya2VyLmNiR2V0Q3VycmVudENhbGxzKTtcbiAgICAgICAgY3VycmVudENhbGxzV29ya2VyLnRpbWVvdXRIYW5kbGVcbiAgICAgICAgICAgID0gd2luZG93LnNldFRpbWVvdXQoY3VycmVudENhbGxzV29ya2VyLndvcmtlciwgY3VycmVudENhbGxzV29ya2VyLnRpbWVPdXQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgcHJvY2Vzc2luZyB0aGUgY3VycmVudCBjYWxscyByZXNwb25zZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGNvbnRhaW5pbmcgY3VycmVudCBjYWxscyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkdldEN1cnJlbnRDYWxscyhyZXNwb25zZSkge1xuICAgICAgICBjdXJyZW50Q2FsbHNXb3JrZXIuJGN1cnJlbnRDYWxsc0luZm8uZW1wdHkoKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCB0eXBlb2YgcmVzcG9uc2UgIT09ICdvYmplY3QnKSByZXR1cm47XG4gICAgICAgIGNvbnN0IHJlc3BPYmplY3QgPSByZXNwb25zZTtcbiAgICAgICAgbGV0IHJlc3VsdFVsID0gYDxoMiBjbGFzcz1cInVpIGhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLnJzX0N1cnJlbnRDYWxsc308L2gyPmA7XG4gICAgICAgIHJlc3VsdFVsICs9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGNvbXBhY3QgdW5zdGFja2FibGUgdGFibGVcIj4nO1xuICAgICAgICByZXN1bHRVbCArPSAnPHRoZWFkPic7XG4gICAgICAgIHJlc3VsdFVsICs9IGA8dGg+PC90aD48dGg+JHtnbG9iYWxUcmFuc2xhdGUucnNfRGF0ZUNhbGx9PC90aD48dGg+JHtnbG9iYWxUcmFuc2xhdGUucnNfU3JjfTwvdGg+PHRoPiR7Z2xvYmFsVHJhbnNsYXRlLnJzX0RzdH08L3RoPmA7XG4gICAgICAgIHJlc3VsdFVsICs9ICc8L3RoZWFkPic7XG4gICAgICAgIHJlc3VsdFVsICs9ICc8dGJvZHk+JztcbiAgICAgICAgJC5lYWNoKHJlc3BPYmplY3QsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJlc3VsdFVsICs9ICc8dHI+JztcbiAgICAgICAgICAgIHJlc3VsdFVsICs9ICc8dGQ+PGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT48L3RkPic7XG4gICAgICAgICAgICByZXN1bHRVbCArPSBgPHRkPiR7dmFsdWUuc3RhcnR9PC90ZD5gO1xuICAgICAgICAgICAgcmVzdWx0VWwgKz0gYDx0ZCBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHt2YWx1ZS5zcmNfbnVtfTwvdGQ+YDtcbiAgICAgICAgICAgIHJlc3VsdFVsICs9IGA8dGQgY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7dmFsdWUuZHN0X251bX08L3RkPmA7XG4gICAgICAgICAgICByZXN1bHRVbCArPSAnPC90cj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzdWx0VWwgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICBjdXJyZW50Q2FsbHNXb3JrZXIuJGN1cnJlbnRDYWxsc0luZm8uaHRtbChyZXN1bHRVbCk7XG4gICAgICAgIEV4dGVuc2lvbnMuVXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgdGhlIGN1cnJlbnQgY2FsbHMgd29ya2VyIG9uIGRvY3VtZW50IHJlYWR5LlxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY3VycmVudENhbGxzV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19