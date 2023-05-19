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

/* global globalTranslate, PbxApi, Extensions */
var restart = {
  initialize: function initialize() {
    $('#restart-button').on('click', function (e) {
      $(e.target).closest('button').addClass('loading');
      PbxApi.SystemReboot();
    });
    $('#shutdown-button').on('click', function (e) {
      $(e.target).closest('button').addClass('loading');
      PbxApi.SystemShutDown();
    });
  }
};
var currentCallsWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  $currentCallsInfo: $('#current-calls-info'),
  initialize: function initialize() {
    currentCallsWorker.restartWorker();
  },
  restartWorker: function restartWorker() {
    window.clearTimeout(currentCallsWorker.timeoutHandle);
    currentCallsWorker.worker();
  },
  worker: function worker() {
    PbxApi.GetCurrentCalls(currentCallsWorker.cbGetCurrentCalls); //TODO::Проверить согласно новой структуре ответа PBXCore

    currentCallsWorker.timeoutHandle = window.setTimeout(currentCallsWorker.worker, currentCallsWorker.timeOut);
  },
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
$(document).ready(function () {
  restart.initialize();
  currentCallsWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L3Jlc3RhcnQtaW5kZXguanMiXSwibmFtZXMiOlsicmVzdGFydCIsImluaXRpYWxpemUiLCIkIiwib24iLCJlIiwidGFyZ2V0IiwiY2xvc2VzdCIsImFkZENsYXNzIiwiUGJ4QXBpIiwiU3lzdGVtUmVib290IiwiU3lzdGVtU2h1dERvd24iLCJjdXJyZW50Q2FsbHNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRjdXJyZW50Q2FsbHNJbmZvIiwicmVzdGFydFdvcmtlciIsIndpbmRvdyIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJHZXRDdXJyZW50Q2FsbHMiLCJjYkdldEN1cnJlbnRDYWxscyIsInNldFRpbWVvdXQiLCJyZXNwb25zZSIsImVtcHR5IiwicmVzcE9iamVjdCIsInJlc3VsdFVsIiwiZ2xvYmFsVHJhbnNsYXRlIiwicnNfQ3VycmVudENhbGxzIiwicnNfRGF0ZUNhbGwiLCJyc19TcmMiLCJyc19Ec3QiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsInN0YXJ0Iiwic3JjX251bSIsImRzdF9udW0iLCJodG1sIiwiRXh0ZW5zaW9ucyIsIlVwZGF0ZVBob25lc1JlcHJlc2VudCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBRUEsSUFBTUEsT0FBTyxHQUFHO0FBQ2ZDLEVBQUFBLFVBRGUsd0JBQ0Y7QUFDWkMsSUFBQUEsQ0FBQyxDQUFDLGlCQUFELENBQUQsQ0FBcUJDLEVBQXJCLENBQXdCLE9BQXhCLEVBQWlDLFVBQUNDLENBQUQsRUFBTztBQUN2Q0YsTUFBQUEsQ0FBQyxDQUFDRSxDQUFDLENBQUNDLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLFFBQXBCLEVBQThCQyxRQUE5QixD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bkI7QUFDQSxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBFeHRlbnNpb25zICovXG5cbmNvbnN0IHJlc3RhcnQgPSB7XG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnI3Jlc3RhcnQtYnV0dG9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdCQoZS50YXJnZXQpLmNsb3Nlc3QoJ2J1dHRvbicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtUmVib290KCk7XG5cdFx0fSk7XG5cdFx0JCgnI3NodXRkb3duLWJ1dHRvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHQkKGUudGFyZ2V0KS5jbG9zZXN0KCdidXR0b24nKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVNodXREb3duKCk7XG5cdFx0fSk7XG5cdH0sXG59O1xuXG5jb25zdCBjdXJyZW50Q2FsbHNXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHQkY3VycmVudENhbGxzSW5mbzogJCgnI2N1cnJlbnQtY2FsbHMtaW5mbycpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGN1cnJlbnRDYWxsc1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChjdXJyZW50Q2FsbHNXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0Y3VycmVudENhbGxzV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0UGJ4QXBpLkdldEN1cnJlbnRDYWxscyhjdXJyZW50Q2FsbHNXb3JrZXIuY2JHZXRDdXJyZW50Q2FsbHMpOyAvL1RPRE86OtCf0YDQvtCy0LXRgNC40YLRjCDRgdC+0LPQu9Cw0YHQvdC+INC90L7QstC+0Lkg0YHRgtGA0YPQutGC0YPRgNC1INC+0YLQstC10YLQsCBQQlhDb3JlXG5cdFx0Y3VycmVudENhbGxzV29ya2VyLnRpbWVvdXRIYW5kbGVcblx0XHRcdD0gd2luZG93LnNldFRpbWVvdXQoY3VycmVudENhbGxzV29ya2VyLndvcmtlciwgY3VycmVudENhbGxzV29ya2VyLnRpbWVPdXQpO1xuXHR9LFxuXHRjYkdldEN1cnJlbnRDYWxscyhyZXNwb25zZSkge1xuXHRcdGN1cnJlbnRDYWxsc1dvcmtlci4kY3VycmVudENhbGxzSW5mby5lbXB0eSgpO1xuXHRcdGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgdHlwZW9mIHJlc3BvbnNlICE9PSAnb2JqZWN0JykgcmV0dXJuO1xuXHRcdGNvbnN0IHJlc3BPYmplY3QgPSByZXNwb25zZTtcblx0XHRsZXQgcmVzdWx0VWwgPSBgPGgyIGNsYXNzPVwidWkgaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUucnNfQ3VycmVudENhbGxzfTwvaDI+YDtcblx0XHRyZXN1bHRVbCArPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHVuc3RhY2thYmxlIHRhYmxlXCI+Jztcblx0XHRyZXN1bHRVbCArPSAnPHRoZWFkPic7XG5cdFx0cmVzdWx0VWwgKz0gYDx0aD48L3RoPjx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5yc19EYXRlQ2FsbH08L3RoPjx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5yc19TcmN9PC90aD48dGg+JHtnbG9iYWxUcmFuc2xhdGUucnNfRHN0fTwvdGg+YDtcblx0XHRyZXN1bHRVbCArPSAnPC90aGVhZD4nO1xuXHRcdHJlc3VsdFVsICs9ICc8dGJvZHk+Jztcblx0XHQkLmVhY2gocmVzcE9iamVjdCwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0cmVzdWx0VWwgKz0gJzx0cj4nO1xuXHRcdFx0cmVzdWx0VWwgKz0gJzx0ZD48aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPjwvdGQ+Jztcblx0XHRcdHJlc3VsdFVsICs9IGA8dGQ+JHt2YWx1ZS5zdGFydH08L3RkPmA7XG5cdFx0XHRyZXN1bHRVbCArPSBgPHRkIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3ZhbHVlLnNyY19udW19PC90ZD5gO1xuXHRcdFx0cmVzdWx0VWwgKz0gYDx0ZCBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHt2YWx1ZS5kc3RfbnVtfTwvdGQ+YDtcblx0XHRcdHJlc3VsdFVsICs9ICc8L3RyPic7XG5cdFx0fSk7XG5cdFx0cmVzdWx0VWwgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuXHRcdGN1cnJlbnRDYWxsc1dvcmtlci4kY3VycmVudENhbGxzSW5mby5odG1sKHJlc3VsdFVsKTtcblx0XHRFeHRlbnNpb25zLlVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRyZXN0YXJ0LmluaXRpYWxpemUoKTtcblx0Y3VycmVudENhbGxzV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=