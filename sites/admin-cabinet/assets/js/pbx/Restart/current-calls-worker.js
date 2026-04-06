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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L2N1cnJlbnQtY2FsbHMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImN1cnJlbnRDYWxsc1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiJGN1cnJlbnRDYWxsc0luZm8iLCIkIiwiaW5pdGlhbGl6ZSIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4U3RhdHVzQVBJIiwiZ2V0QWN0aXZlQ2hhbm5lbHMiLCJjYkdldEFjdGl2ZUNoYW5uZWxzIiwic2V0VGltZW91dCIsInJlc3BvbnNlIiwiZW1wdHkiLCJyZXNwT2JqZWN0IiwibGVuZ3RoIiwiaW5mb01lc3NhZ2UiLCJnbG9iYWxUcmFuc2xhdGUiLCJyc19Ob0FjdGl2ZUNhbGxzTWVzc2FnZSIsImh0bWwiLCJyZXN1bHRVbCIsInJzX0N1cnJlbnRDYWxscyIsInJzX0RhdGVDYWxsIiwicnNfU3JjIiwicnNfRHN0IiwiZWFjaCIsImluZGV4IiwidmFsdWUiLCJzdGFydCIsInNyY19udW0iLCJkc3RfbnVtIiwiRXh0ZW5zaW9uc0FQSSIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxrQkFBa0IsR0FBRztBQUV2QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsSUFOYzs7QUFRdkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLENBWlE7O0FBY3ZCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FsQkc7O0FBb0J2QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUF2QnVCLHdCQXVCVjtBQUNUTCxJQUFBQSxrQkFBa0IsQ0FBQ00sYUFBbkI7QUFDSCxHQXpCc0I7O0FBMkJ2QjtBQUNKO0FBQ0E7QUFDSUEsRUFBQUEsYUE5QnVCLDJCQThCUDtBQUNaQyxJQUFBQSxNQUFNLENBQUNDLFlBQVAsQ0FBb0JSLGtCQUFrQixDQUFDUyxhQUF2QztBQUNBVCxJQUFBQSxrQkFBa0IsQ0FBQ1UsTUFBbkI7QUFDSCxHQWpDc0I7O0FBbUN2QjtBQUNKO0FBQ0E7QUFDSUEsRUFBQUEsTUF0Q3VCLG9CQXNDZDtBQUNMQyxJQUFBQSxZQUFZLENBQUNDLGlCQUFiLENBQStCWixrQkFBa0IsQ0FBQ2EsbUJBQWxEO0FBQ0FiLElBQUFBLGtCQUFrQixDQUFDUyxhQUFuQixHQUNNRixNQUFNLENBQUNPLFVBQVAsQ0FBa0JkLGtCQUFrQixDQUFDVSxNQUFyQyxFQUE2Q1Ysa0JBQWtCLENBQUNDLE9BQWhFLENBRE47QUFFSCxHQTFDc0I7O0FBNEN2QjtBQUNKO0FBQ0E7QUFDQTtBQUNJWSxFQUFBQSxtQkFoRHVCLCtCQWdESEUsUUFoREcsRUFnRE87QUFDMUJmLElBQUFBLGtCQUFrQixDQUFDRyxpQkFBbkIsQ0FBcUNhLEtBQXJDO0FBQ0EsUUFBSUQsUUFBUSxLQUFLLEtBQWIsSUFBc0IsUUFBT0EsUUFBUCxNQUFvQixRQUE5QyxFQUF3RDtBQUN4RCxRQUFNRSxVQUFVLEdBQUdGLFFBQW5CLENBSDBCLENBSzFCOztBQUNBLFFBQUksQ0FBQ0UsVUFBRCxJQUFlQSxVQUFVLENBQUNDLE1BQVgsS0FBc0IsQ0FBekMsRUFBNEM7QUFDeEMsVUFBTUMsV0FBVyx1S0FHSkMsZUFBZSxDQUFDQyx1QkFIWixxREFBakI7QUFNQXJCLE1BQUFBLGtCQUFrQixDQUFDRyxpQkFBbkIsQ0FBcUNtQixJQUFyQyxDQUEwQ0gsV0FBMUM7QUFDQTtBQUNIOztBQUVELFFBQUlJLFFBQVEscUNBQTRCSCxlQUFlLENBQUNJLGVBQTVDLFVBQVo7QUFDQUQsSUFBQUEsUUFBUSxJQUFJLG1EQUFaO0FBQ0FBLElBQUFBLFFBQVEsSUFBSSxTQUFaO0FBQ0FBLElBQUFBLFFBQVEsMkJBQW9CSCxlQUFlLENBQUNLLFdBQXBDLHNCQUEyREwsZUFBZSxDQUFDTSxNQUEzRSxzQkFBNkZOLGVBQWUsQ0FBQ08sTUFBN0csVUFBUjtBQUNBSixJQUFBQSxRQUFRLElBQUksVUFBWjtBQUNBQSxJQUFBQSxRQUFRLElBQUksU0FBWjtBQUNBbkIsSUFBQUEsQ0FBQyxDQUFDd0IsSUFBRixDQUFPWCxVQUFQLEVBQW1CLFVBQUNZLEtBQUQsRUFBUUMsS0FBUixFQUFrQjtBQUNqQ1AsTUFBQUEsUUFBUSxJQUFJLE1BQVo7QUFDQUEsTUFBQUEsUUFBUSxJQUFJLCtDQUFaO0FBQ0FBLE1BQUFBLFFBQVEsa0JBQVdPLEtBQUssQ0FBQ0MsS0FBakIsVUFBUjtBQUNBUixNQUFBQSxRQUFRLHdDQUErQk8sS0FBSyxDQUFDRSxPQUFyQyxVQUFSO0FBQ0FULE1BQUFBLFFBQVEsd0NBQStCTyxLQUFLLENBQUNHLE9BQXJDLFVBQVI7QUFDQVYsTUFBQUEsUUFBUSxJQUFJLE9BQVo7QUFDSCxLQVBEO0FBUUFBLElBQUFBLFFBQVEsSUFBSSxrQkFBWjtBQUNBdkIsSUFBQUEsa0JBQWtCLENBQUNHLGlCQUFuQixDQUFxQ21CLElBQXJDLENBQTBDQyxRQUExQztBQUNBVyxJQUFBQSxhQUFhLENBQUNDLHFCQUFkLENBQW9DLGFBQXBDO0FBQ0g7QUFsRnNCLENBQTNCO0FBcUZBO0FBQ0E7QUFDQTs7QUFDQS9CLENBQUMsQ0FBQ2dDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJyQyxFQUFBQSxrQkFBa0IsQ0FBQ0ssVUFBbkI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieFN0YXR1c0FQSSwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zQVBJICovXG5cbi8qKlxuICogT2JqZWN0IHJlc3BvbnNpYmxlIGZvciBoYW5kbGluZyBjdXJyZW50IGNhbGxzIGluZm9ybWF0aW9uLlxuICpcbiAqIEBtb2R1bGUgY3VycmVudENhbGxzV29ya2VyXG4gKi9cbmNvbnN0IGN1cnJlbnRDYWxsc1dvcmtlciA9IHtcblxuICAgIC8qKlxuICAgICAqIFRpbWUgaW4gbWlsbGlzZWNvbmRzIGJlZm9yZSBmZXRjaGluZyBuZXcgcmVxdWVzdC5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHRpbWVPdXQ6IDMwMDAsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgaWQgb2YgdGhlIHRpbWVyIGZ1bmN0aW9uIGZvciB0aGUgc3RhdHVzIHdvcmtlci5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHRpbWVPdXRIYW5kbGU6IDAsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgY3VycmVudCBjYWxscyBpbmZvcm1hdGlvbiBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY3VycmVudENhbGxzSW5mbzogJCgnI2N1cnJlbnQtY2FsbHMtaW5mbycpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGN1cnJlbnQgY2FsbHMgd29ya2VyIGJ5IHJlc3RhcnRpbmcgdGhlIHdvcmtlci5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjdXJyZW50Q2FsbHNXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXN0YXJ0cyB0aGUgY3VycmVudCBjYWxscyB3b3JrZXIgYnkgY2xlYXJpbmcgdGhlIHRpbWVvdXQgaGFuZGxlIGFuZCBjYWxsaW5nIHRoZSB3b3JrZXIgZnVuY3Rpb24uXG4gICAgICovXG4gICAgcmVzdGFydFdvcmtlcigpIHtcbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dChjdXJyZW50Q2FsbHNXb3JrZXIudGltZW91dEhhbmRsZSk7XG4gICAgICAgIGN1cnJlbnRDYWxsc1dvcmtlci53b3JrZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGhlIG1haW4gd29ya2VyIGZ1bmN0aW9uIHRoYXQgZmV0Y2hlcyBjdXJyZW50IGNhbGxzIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIHdvcmtlcigpIHtcbiAgICAgICAgUGJ4U3RhdHVzQVBJLmdldEFjdGl2ZUNoYW5uZWxzKGN1cnJlbnRDYWxsc1dvcmtlci5jYkdldEFjdGl2ZUNoYW5uZWxzKTtcbiAgICAgICAgY3VycmVudENhbGxzV29ya2VyLnRpbWVvdXRIYW5kbGVcbiAgICAgICAgICAgID0gd2luZG93LnNldFRpbWVvdXQoY3VycmVudENhbGxzV29ya2VyLndvcmtlciwgY3VycmVudENhbGxzV29ya2VyLnRpbWVPdXQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgcHJvY2Vzc2luZyB0aGUgY3VycmVudCBjYWxscyByZXNwb25zZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGNvbnRhaW5pbmcgY3VycmVudCBjYWxscyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkdldEFjdGl2ZUNoYW5uZWxzKHJlc3BvbnNlKSB7XG4gICAgICAgIGN1cnJlbnRDYWxsc1dvcmtlci4kY3VycmVudENhbGxzSW5mby5lbXB0eSgpO1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8IHR5cGVvZiByZXNwb25zZSAhPT0gJ29iamVjdCcpIHJldHVybjtcbiAgICAgICAgY29uc3QgcmVzcE9iamVjdCA9IHJlc3BvbnNlO1xuXG4gICAgICAgIC8vIElmIG5vIGFjdGl2ZSBjYWxscywgc2hvdyBpbmZvIG1lc3NhZ2VcbiAgICAgICAgaWYgKCFyZXNwT2JqZWN0IHx8IHJlc3BPYmplY3QubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvTWVzc2FnZSA9IGA8ZGl2IGNsYXNzPVwidWkgaWNvbiBpbmZvIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUucnNfTm9BY3RpdmVDYWxsc01lc3NhZ2V9PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgIGN1cnJlbnRDYWxsc1dvcmtlci4kY3VycmVudENhbGxzSW5mby5odG1sKGluZm9NZXNzYWdlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCByZXN1bHRVbCA9IGA8aDIgY2xhc3M9XCJ1aSBoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5yc19DdXJyZW50Q2FsbHN9PC9oMj5gO1xuICAgICAgICByZXN1bHRVbCArPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHVuc3RhY2thYmxlIHRhYmxlXCI+JztcbiAgICAgICAgcmVzdWx0VWwgKz0gJzx0aGVhZD4nO1xuICAgICAgICByZXN1bHRVbCArPSBgPHRoPjwvdGg+PHRoPiR7Z2xvYmFsVHJhbnNsYXRlLnJzX0RhdGVDYWxsfTwvdGg+PHRoPiR7Z2xvYmFsVHJhbnNsYXRlLnJzX1NyY308L3RoPjx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5yc19Ec3R9PC90aD5gO1xuICAgICAgICByZXN1bHRVbCArPSAnPC90aGVhZD4nO1xuICAgICAgICByZXN1bHRVbCArPSAnPHRib2R5Pic7XG4gICAgICAgICQuZWFjaChyZXNwT2JqZWN0LCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICByZXN1bHRVbCArPSAnPHRyPic7XG4gICAgICAgICAgICByZXN1bHRVbCArPSAnPHRkPjxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+PC90ZD4nO1xuICAgICAgICAgICAgcmVzdWx0VWwgKz0gYDx0ZD4ke3ZhbHVlLnN0YXJ0fTwvdGQ+YDtcbiAgICAgICAgICAgIHJlc3VsdFVsICs9IGA8dGQgY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7dmFsdWUuc3JjX251bX08L3RkPmA7XG4gICAgICAgICAgICByZXN1bHRVbCArPSBgPHRkIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3ZhbHVlLmRzdF9udW19PC90ZD5gO1xuICAgICAgICAgICAgcmVzdWx0VWwgKz0gJzwvdHI+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdFVsICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgY3VycmVudENhbGxzV29ya2VyLiRjdXJyZW50Q2FsbHNJbmZvLmh0bWwocmVzdWx0VWwpO1xuICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIHRoZSBjdXJyZW50IGNhbGxzIHdvcmtlciBvbiBkb2N1bWVudCByZWFkeS5cbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGN1cnJlbnRDYWxsc1dvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==