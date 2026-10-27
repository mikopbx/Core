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

/* global PbxStatusAPI, globalTranslate, ExtensionsAPI, SecurityUtils */

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
      resultUl += '<td><i class="spinner loading icon"></i></td>'; // SECURITY (GHSA-r823-fj9f-rqwh): src_num/dst_num originate from the SIP From
      // header (CDR src/dst) and are rendered via .html(), so they must be escaped.

      resultUl += "<td>".concat(SecurityUtils.escapeHtml(value.start), "</td>");
      resultUl += "<td class=\"need-update\">".concat(SecurityUtils.escapeHtml(value.src_num), "</td>");
      resultUl += "<td class=\"need-update\">".concat(SecurityUtils.escapeHtml(value.dst_num), "</td>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L2N1cnJlbnQtY2FsbHMtd29ya2VyLmpzIl0sIm5hbWVzIjpbImN1cnJlbnRDYWxsc1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiJGN1cnJlbnRDYWxsc0luZm8iLCJpbml0aWFsaXplIiwiJCIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4U3RhdHVzQVBJIiwiZ2V0QWN0aXZlQ2hhbm5lbHMiLCJjYkdldEFjdGl2ZUNoYW5uZWxzIiwic2V0VGltZW91dCIsInJlc3BvbnNlIiwiZW1wdHkiLCJyZXNwT2JqZWN0IiwibGVuZ3RoIiwiaW5mb01lc3NhZ2UiLCJnbG9iYWxUcmFuc2xhdGUiLCJyc19Ob0FjdGl2ZUNhbGxzTWVzc2FnZSIsImh0bWwiLCJyZXN1bHRVbCIsInJzX0N1cnJlbnRDYWxscyIsInJzX0RhdGVDYWxsIiwicnNfU3JjIiwicnNfRHN0IiwiZWFjaCIsImluZGV4IiwidmFsdWUiLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsInN0YXJ0Iiwic3JjX251bSIsImRzdF9udW0iLCJFeHRlbnNpb25zQVBJIiwidXBkYXRlUGhvbmVzUmVwcmVzZW50IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGtCQUFrQixHQUFHO0FBRXZCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE9BQU8sRUFBRSxJQU5jOztBQVF2QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsQ0FaUTs7QUFjdkI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFB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QnZDLEVBQUFBLGtCQUFrQixDQUFDSSxVQUFuQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4U3RhdHVzQVBJLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnNBUEksIFNlY3VyaXR5VXRpbHMgKi9cblxuLyoqXG4gKiBPYmplY3QgcmVzcG9uc2libGUgZm9yIGhhbmRsaW5nIGN1cnJlbnQgY2FsbHMgaW5mb3JtYXRpb24uXG4gKlxuICogQG1vZHVsZSBjdXJyZW50Q2FsbHNXb3JrZXJcbiAqL1xuY29uc3QgY3VycmVudENhbGxzV29ya2VyID0ge1xuXG4gICAgLyoqXG4gICAgICogVGltZSBpbiBtaWxsaXNlY29uZHMgYmVmb3JlIGZldGNoaW5nIG5ldyByZXF1ZXN0LlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdGltZU91dDogMzAwMCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBpZCBvZiB0aGUgdGltZXIgZnVuY3Rpb24gZm9yIHRoZSBzdGF0dXMgd29ya2VyLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdGltZU91dEhhbmRsZTogMCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjdXJyZW50IGNhbGxzIGluZm9ybWF0aW9uIGNvbnRhaW5lci5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY3VycmVudENhbGxzSW5mbzogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjdXJyZW50IGNhbGxzIHdvcmtlciBieSByZXN0YXJ0aW5nIHRoZSB3b3JrZXIuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY3VycmVudENhbGxzV29ya2VyLiRjdXJyZW50Q2FsbHNJbmZvID0gJCgnI2N1cnJlbnQtY2FsbHMtaW5mbycpO1xuICAgICAgICBjdXJyZW50Q2FsbHNXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXN0YXJ0cyB0aGUgY3VycmVudCBjYWxscyB3b3JrZXIgYnkgY2xlYXJpbmcgdGhlIHRpbWVvdXQgaGFuZGxlIGFuZCBjYWxsaW5nIHRoZSB3b3JrZXIgZnVuY3Rpb24uXG4gICAgICovXG4gICAgcmVzdGFydFdvcmtlcigpIHtcbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dChjdXJyZW50Q2FsbHNXb3JrZXIudGltZW91dEhhbmRsZSk7XG4gICAgICAgIGN1cnJlbnRDYWxsc1dvcmtlci53b3JrZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGhlIG1haW4gd29ya2VyIGZ1bmN0aW9uIHRoYXQgZmV0Y2hlcyBjdXJyZW50IGNhbGxzIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIHdvcmtlcigpIHtcbiAgICAgICAgUGJ4U3RhdHVzQVBJLmdldEFjdGl2ZUNoYW5uZWxzKGN1cnJlbnRDYWxsc1dvcmtlci5jYkdldEFjdGl2ZUNoYW5uZWxzKTtcbiAgICAgICAgY3VycmVudENhbGxzV29ya2VyLnRpbWVvdXRIYW5kbGVcbiAgICAgICAgICAgID0gd2luZG93LnNldFRpbWVvdXQoY3VycmVudENhbGxzV29ya2VyLndvcmtlciwgY3VycmVudENhbGxzV29ya2VyLnRpbWVPdXQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgcHJvY2Vzc2luZyB0aGUgY3VycmVudCBjYWxscyByZXNwb25zZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGNvbnRhaW5pbmcgY3VycmVudCBjYWxscyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkdldEFjdGl2ZUNoYW5uZWxzKHJlc3BvbnNlKSB7XG4gICAgICAgIGN1cnJlbnRDYWxsc1dvcmtlci4kY3VycmVudENhbGxzSW5mby5lbXB0eSgpO1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8IHR5cGVvZiByZXNwb25zZSAhPT0gJ29iamVjdCcpIHJldHVybjtcbiAgICAgICAgY29uc3QgcmVzcE9iamVjdCA9IHJlc3BvbnNlO1xuXG4gICAgICAgIC8vIElmIG5vIGFjdGl2ZSBjYWxscywgc2hvdyBpbmZvIG1lc3NhZ2VcbiAgICAgICAgaWYgKCFyZXNwT2JqZWN0IHx8IHJlc3BPYmplY3QubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvTWVzc2FnZSA9IGA8ZGl2IGNsYXNzPVwidWkgaWNvbiBpbmZvIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUucnNfTm9BY3RpdmVDYWxsc01lc3NhZ2V9PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgIGN1cnJlbnRDYWxsc1dvcmtlci4kY3VycmVudENhbGxzSW5mby5odG1sKGluZm9NZXNzYWdlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCByZXN1bHRVbCA9IGA8aDIgY2xhc3M9XCJ1aSBoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5yc19DdXJyZW50Q2FsbHN9PC9oMj5gO1xuICAgICAgICByZXN1bHRVbCArPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHVuc3RhY2thYmxlIHRhYmxlXCI+JztcbiAgICAgICAgcmVzdWx0VWwgKz0gJzx0aGVhZD4nO1xuICAgICAgICByZXN1bHRVbCArPSBgPHRoPjwvdGg+PHRoPiR7Z2xvYmFsVHJhbnNsYXRlLnJzX0RhdGVDYWxsfTwvdGg+PHRoPiR7Z2xvYmFsVHJhbnNsYXRlLnJzX1NyY308L3RoPjx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5yc19Ec3R9PC90aD5gO1xuICAgICAgICByZXN1bHRVbCArPSAnPC90aGVhZD4nO1xuICAgICAgICByZXN1bHRVbCArPSAnPHRib2R5Pic7XG4gICAgICAgICQuZWFjaChyZXNwT2JqZWN0LCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICByZXN1bHRVbCArPSAnPHRyPic7XG4gICAgICAgICAgICByZXN1bHRVbCArPSAnPHRkPjxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+PC90ZD4nO1xuICAgICAgICAgICAgLy8gU0VDVVJJVFkgKEdIU0EtcjgyMy1majlmLXJxd2gpOiBzcmNfbnVtL2RzdF9udW0gb3JpZ2luYXRlIGZyb20gdGhlIFNJUCBGcm9tXG4gICAgICAgICAgICAvLyBoZWFkZXIgKENEUiBzcmMvZHN0KSBhbmQgYXJlIHJlbmRlcmVkIHZpYSAuaHRtbCgpLCBzbyB0aGV5IG11c3QgYmUgZXNjYXBlZC5cbiAgICAgICAgICAgIHJlc3VsdFVsICs9IGA8dGQ+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwodmFsdWUuc3RhcnQpfTwvdGQ+YDtcbiAgICAgICAgICAgIHJlc3VsdFVsICs9IGA8dGQgY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHZhbHVlLnNyY19udW0pfTwvdGQ+YDtcbiAgICAgICAgICAgIHJlc3VsdFVsICs9IGA8dGQgY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHZhbHVlLmRzdF9udW0pfTwvdGQ+YDtcbiAgICAgICAgICAgIHJlc3VsdFVsICs9ICc8L3RyPic7XG4gICAgICAgIH0pO1xuICAgICAgICByZXN1bHRVbCArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgICAgIGN1cnJlbnRDYWxsc1dvcmtlci4kY3VycmVudENhbGxzSW5mby5odG1sKHJlc3VsdFVsKTtcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSB0aGUgY3VycmVudCBjYWxscyB3b3JrZXIgb24gZG9jdW1lbnQgcmVhZHkuXG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjdXJyZW50Q2FsbHNXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=