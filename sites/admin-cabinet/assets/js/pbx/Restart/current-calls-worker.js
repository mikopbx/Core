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
    PbxApi.GetActiveChannels(currentCallsWorker.cbGetActiveChannels);
    currentCallsWorker.timeoutHandle = window.setTimeout(currentCallsWorker.worker, currentCallsWorker.timeOut);
  },

  /**
   * Callback function for processing the current calls response.
   * @param {Object} response - The response object containing current calls information.
   */
  cbGetActiveChannels: function cbGetActiveChannels(response) {
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
    Extensions.updatePhonesRepresent('need-update');
  }
};
/**
 * Initialize the current calls worker on document ready.
 */

$(document).ready(function () {
  currentCallsWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L2N1cnJlbnQtY2FsbHMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImN1cnJlbnRDYWxsc1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiJGN1cnJlbnRDYWxsc0luZm8iLCIkIiwiaW5pdGlhbGl6ZSIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4QXBpIiwiR2V0QWN0aXZlQ2hhbm5lbHMiLCJjYkdldEFjdGl2ZUNoYW5uZWxzIiwic2V0VGltZW91dCIsInJlc3BvbnNlIiwiZW1wdHkiLCJyZXNwT2JqZWN0IiwicmVzdWx0VWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJyc19DdXJyZW50Q2FsbHMiLCJyc19EYXRlQ2FsbCIsInJzX1NyYyIsInJzX0RzdCIsImVhY2giLCJpbmRleCIsInZhbHVlIiwic3RhcnQiLCJzcmNfbnVtIiwiZHN0X251bSIsImh0bWwiLCJFeHRlbnNpb25zIiwidXBkYXRlUGhvbmVzUmVwcmVzZW50IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGtCQUFrQixHQUFHO0FBRXZCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE9BQU8sRUFBRSxJQU5jOztBQVF2QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsQ0FaUTs7QUFjdkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUVDLENBQUMsQ0FBQyxxQkFBRCxDQWxCRzs7QUFvQnZCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQXZCdUIsd0JBdUJWO0FBQ1RMLElBQUFBLGtCQUFrQixDQUFDTSxhQUFuQjtBQUNILEdBekJzQjs7QUEyQnZCO0FBQ0o7QUFDQTtBQUNJQSxFQUFBQSxhQTlCdUIsMkJBOEJQO0FBQ1pDLElBQUFBLE1BQU0sQ0FBQ0MsWUFBUCxDQUFvQlIsa0JBQWtCLENBQUNTLGFBQXZDO0FBQ0FULElBQUFBLGtCQUFrQixDQUFDVSxNQUFuQjtBQUNILEdBakNzQjs7QUFtQ3ZCO0FBQ0o7QUFDQTtBQUNJQSxFQUFBQSxNQXRDdUIsb0JBc0NkO0FBQ0xDLElBQUFBLE1BQU0sQ0FBQ0MsaUJBQVAsQ0FBeUJaLGtCQUFrQixDQUFDYSxtQkFBNUM7QUFDQWIsSUFBQUEsa0JBQWtCLENBQUNTLGFBQW5CLEdBQ01GLE1BQU0sQ0FBQ08sVUFBUCxDQUFrQmQsa0JBQWtCLENBQUNVLE1BQXJDLEVBQTZDVixrQkFBa0IsQ0FBQ0MsT0FBaEUsQ0FETjtBQUVILEdBMUNzQjs7QUE0Q3ZCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lZLEVBQUFBLG1CQWhEdUIsK0JBZ0RIRSxRQWhERyxFQWdETztBQUMxQmYsSUFBQUEsa0JBQWtCLENBQUNHLGlCQUFuQixDQUFxQ2EsS0FBckM7QUFDQSxRQUFJRCxRQUFRLEtBQUssS0FBYixJQUFzQixRQUFPQSxRQUFQLE1BQW9CLFFBQTlDLEVBQXdEO0FBQ3hELFFBQU1FLFVBQVUsR0FBR0YsUUFBbkI7QUFDQSxRQUFJRyxRQUFRLHFDQUE0QkMsZUFBZSxDQUFDQyxlQUE1QyxVQUFaO0FBQ0FGLElBQUFBLFFBQVEsSUFBSSxtREFBWjtBQUNBQSxJQUFBQSxRQUFRLElBQUksU0FBWjtBQUNBQSxJQUFBQSxRQUFRLDJCQUFvQkMsZUFBZSxDQUFDRSxXQUFwQyxzQkFBMkRGLGVBQWUsQ0FBQ0csTUFBM0Usc0JBQTZGSCxlQUFlLENBQUNJLE1BQTdHLFVBQVI7QUFDQUwsSUFBQUEsUUFBUSxJQUFJLFVBQVo7QUFDQUEsSUFBQUEsUUFBUSxJQUFJLFNBQVo7QUFDQWQsSUFBQUEsQ0FBQyxDQUFDb0IsSUFBRixDQUFPUCxVQUFQLEVBQW1CLFVBQUNRLEtBQUQsRUFBUUMsS0FBUixFQUFrQjtBQUNqQ1IsTUFBQUEsUUFBUSxJQUFJLE1BQVo7QUFDQUEsTUFBQUEsUUFBUSxJQUFJLCtDQUFaO0FBQ0FBLE1BQUFBLFFBQVEsa0JBQVdRLEtBQUssQ0FBQ0MsS0FBakIsVUFBUjtBQUNBVCxNQUFBQSxRQUFRLHdDQUErQlEsS0FBSyxDQUFDRSxPQUFyQyxVQUFSO0FBQ0FWLE1BQUFBLFFBQVEsd0NBQStCUSxLQUFLLENBQUNHLE9BQXJDLFVBQVI7QUFDQVgsTUFBQUEsUUFBUSxJQUFJLE9BQVo7QUFDSCxLQVBEO0FBUUFBLElBQUFBLFFBQVEsSUFBSSxrQkFBWjtBQUNBbEIsSUFBQUEsa0JBQWtCLENBQUNHLGlCQUFuQixDQUFxQzJCLElBQXJDLENBQTBDWixRQUExQztBQUNBYSxJQUFBQSxVQUFVLENBQUNDLHFCQUFYLENBQWlDLGFBQWpDO0FBQ0g7QUFyRXNCLENBQTNCO0FBd0VBO0FBQ0E7QUFDQTs7QUFDQTVCLENBQUMsQ0FBQzZCLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJsQyxFQUFBQSxrQkFBa0IsQ0FBQ0ssVUFBbkI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogT2JqZWN0IHJlc3BvbnNpYmxlIGZvciBoYW5kbGluZyBjdXJyZW50IGNhbGxzIGluZm9ybWF0aW9uLlxuICpcbiAqIEBtb2R1bGUgY3VycmVudENhbGxzV29ya2VyXG4gKi9cbmNvbnN0IGN1cnJlbnRDYWxsc1dvcmtlciA9IHtcblxuICAgIC8qKlxuICAgICAqIFRpbWUgaW4gbWlsbGlzZWNvbmRzIGJlZm9yZSBmZXRjaGluZyBuZXcgcmVxdWVzdC5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHRpbWVPdXQ6IDMwMDAsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgaWQgb2YgdGhlIHRpbWVyIGZ1bmN0aW9uIGZvciB0aGUgc3RhdHVzIHdvcmtlci5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHRpbWVPdXRIYW5kbGU6IDAsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgY3VycmVudCBjYWxscyBpbmZvcm1hdGlvbiBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY3VycmVudENhbGxzSW5mbzogJCgnI2N1cnJlbnQtY2FsbHMtaW5mbycpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGN1cnJlbnQgY2FsbHMgd29ya2VyIGJ5IHJlc3RhcnRpbmcgdGhlIHdvcmtlci5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjdXJyZW50Q2FsbHNXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXN0YXJ0cyB0aGUgY3VycmVudCBjYWxscyB3b3JrZXIgYnkgY2xlYXJpbmcgdGhlIHRpbWVvdXQgaGFuZGxlIGFuZCBjYWxsaW5nIHRoZSB3b3JrZXIgZnVuY3Rpb24uXG4gICAgICovXG4gICAgcmVzdGFydFdvcmtlcigpIHtcbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dChjdXJyZW50Q2FsbHNXb3JrZXIudGltZW91dEhhbmRsZSk7XG4gICAgICAgIGN1cnJlbnRDYWxsc1dvcmtlci53b3JrZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGhlIG1haW4gd29ya2VyIGZ1bmN0aW9uIHRoYXQgZmV0Y2hlcyBjdXJyZW50IGNhbGxzIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIHdvcmtlcigpIHtcbiAgICAgICAgUGJ4QXBpLkdldEFjdGl2ZUNoYW5uZWxzKGN1cnJlbnRDYWxsc1dvcmtlci5jYkdldEFjdGl2ZUNoYW5uZWxzKTtcbiAgICAgICAgY3VycmVudENhbGxzV29ya2VyLnRpbWVvdXRIYW5kbGVcbiAgICAgICAgICAgID0gd2luZG93LnNldFRpbWVvdXQoY3VycmVudENhbGxzV29ya2VyLndvcmtlciwgY3VycmVudENhbGxzV29ya2VyLnRpbWVPdXQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgcHJvY2Vzc2luZyB0aGUgY3VycmVudCBjYWxscyByZXNwb25zZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGNvbnRhaW5pbmcgY3VycmVudCBjYWxscyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkdldEFjdGl2ZUNoYW5uZWxzKHJlc3BvbnNlKSB7XG4gICAgICAgIGN1cnJlbnRDYWxsc1dvcmtlci4kY3VycmVudENhbGxzSW5mby5lbXB0eSgpO1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8IHR5cGVvZiByZXNwb25zZSAhPT0gJ29iamVjdCcpIHJldHVybjtcbiAgICAgICAgY29uc3QgcmVzcE9iamVjdCA9IHJlc3BvbnNlO1xuICAgICAgICBsZXQgcmVzdWx0VWwgPSBgPGgyIGNsYXNzPVwidWkgaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUucnNfQ3VycmVudENhbGxzfTwvaDI+YDtcbiAgICAgICAgcmVzdWx0VWwgKz0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgY29tcGFjdCB1bnN0YWNrYWJsZSB0YWJsZVwiPic7XG4gICAgICAgIHJlc3VsdFVsICs9ICc8dGhlYWQ+JztcbiAgICAgICAgcmVzdWx0VWwgKz0gYDx0aD48L3RoPjx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5yc19EYXRlQ2FsbH08L3RoPjx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5yc19TcmN9PC90aD48dGg+JHtnbG9iYWxUcmFuc2xhdGUucnNfRHN0fTwvdGg+YDtcbiAgICAgICAgcmVzdWx0VWwgKz0gJzwvdGhlYWQ+JztcbiAgICAgICAgcmVzdWx0VWwgKz0gJzx0Ym9keT4nO1xuICAgICAgICAkLmVhY2gocmVzcE9iamVjdCwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgcmVzdWx0VWwgKz0gJzx0cj4nO1xuICAgICAgICAgICAgcmVzdWx0VWwgKz0gJzx0ZD48aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPjwvdGQ+JztcbiAgICAgICAgICAgIHJlc3VsdFVsICs9IGA8dGQ+JHt2YWx1ZS5zdGFydH08L3RkPmA7XG4gICAgICAgICAgICByZXN1bHRVbCArPSBgPHRkIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3ZhbHVlLnNyY19udW19PC90ZD5gO1xuICAgICAgICAgICAgcmVzdWx0VWwgKz0gYDx0ZCBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHt2YWx1ZS5kc3RfbnVtfTwvdGQ+YDtcbiAgICAgICAgICAgIHJlc3VsdFVsICs9ICc8L3RyPic7XG4gICAgICAgIH0pO1xuICAgICAgICByZXN1bHRVbCArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgICAgIGN1cnJlbnRDYWxsc1dvcmtlci4kY3VycmVudENhbGxzSW5mby5odG1sKHJlc3VsdFVsKTtcbiAgICAgICAgRXh0ZW5zaW9ucy51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSB0aGUgY3VycmVudCBjYWxscyB3b3JrZXIgb24gZG9jdW1lbnQgcmVhZHkuXG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjdXJyZW50Q2FsbHNXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=