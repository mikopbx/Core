"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalTranslate, PbxApi, Extensions */
var restart = {
  initialize: function () {
    function initialize() {
      $('#restart-button').on('click', function (e) {
        $(e.target).closest('button').addClass('loading');
        PbxApi.SystemReboot();
      });
      $('#shutdown-button').on('click', function (e) {
        $(e.target).closest('button').addClass('loading');
        PbxApi.SystemShutDown();
      });
    }

    return initialize;
  }()
};
var currentCallsWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  $currentCallsInfo: $('#current-calls-info'),
  initialize: function () {
    function initialize() {
      currentCallsWorker.restartWorker();
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(currentCallsWorker.timeoutHandle);
      currentCallsWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      PbxApi.GetCurrentCalls(currentCallsWorker.cbGetCurrentCalls);
      currentCallsWorker.timeoutHandle = window.setTimeout(currentCallsWorker.worker, currentCallsWorker.timeOut);
    }

    return worker;
  }(),
  cbGetCurrentCalls: function () {
    function cbGetCurrentCalls(response) {
      currentCallsWorker.$currentCallsInfo.empty();
      if (response === false || _typeof(response) !== 'object') return;
      var respObject = response;
      var resultUl = "<h2 class=\"ui header\">".concat(globalTranslate.rs_CurrentCalls, "</h2>");
      resultUl += '<table class="ui very compact table">';
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

    return cbGetCurrentCalls;
  }()
};
$(document).ready(function () {
  restart.initialize();
  currentCallsWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L3Jlc3RhcnQtaW5kZXguanMiXSwibmFtZXMiOlsicmVzdGFydCIsImluaXRpYWxpemUiLCIkIiwib24iLCJlIiwidGFyZ2V0IiwiY2xvc2VzdCIsImFkZENsYXNzIiwiUGJ4QXBpIiwiU3lzdGVtUmVib290IiwiU3lzdGVtU2h1dERvd24iLCJjdXJyZW50Q2FsbHNXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRjdXJyZW50Q2FsbHNJbmZvIiwicmVzdGFydFdvcmtlciIsIndpbmRvdyIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJHZXRDdXJyZW50Q2FsbHMiLCJjYkdldEN1cnJlbnRDYWxscyIsInNldFRpbWVvdXQiLCJyZXNwb25zZSIsImVtcHR5IiwicmVzcE9iamVjdCIsInJlc3VsdFVsIiwiZ2xvYmFsVHJhbnNsYXRlIiwicnNfQ3VycmVudENhbGxzIiwicnNfRGF0ZUNhbGwiLCJyc19TcmMiLCJyc19Ec3QiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsInN0YXJ0Iiwic3JjX251bSIsImRzdF9udW0iLCJodG1sIiwiRXh0ZW5zaW9ucyIsIlVwZGF0ZVBob25lc1JlcHJlc2VudCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLE9BQU8sR0FBRztBQUNmQyxFQUFBQSxVQURlO0FBQUEsMEJBQ0Y7QUFDWkMsTUFBQUEsQ0FBQyxDQUFDLGlCQUFELENBQUQsQ0FBcUJDLEVBQXJCLENBQXdCLE9BQXhCLEVBQWlDLFVBQUNDLENBQUQsRUFBTztBQUN2Q0YsUUFBQUEsQ0FBQyxDQUFDRSxDQUFDLENBQUNDLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLFFBQXBCLEVBQThCQyxRQUE5QixDQUF1QyxTQUF2QztBQUNBQyxRQUFBQSxNQUFNLENBQUNDLFlBQVA7QUFDQSxPQUhEO0FBSUFQLE1BQUFBLENBQUMsQ0FB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Q29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBFeHRlbnNpb25zICovXG5cbmNvbnN0IHJlc3RhcnQgPSB7XG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnI3Jlc3RhcnQtYnV0dG9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdCQoZS50YXJnZXQpLmNsb3Nlc3QoJ2J1dHRvbicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtUmVib290KCk7XG5cdFx0fSk7XG5cdFx0JCgnI3NodXRkb3duLWJ1dHRvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHQkKGUudGFyZ2V0KS5jbG9zZXN0KCdidXR0b24nKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVNodXREb3duKCk7XG5cdFx0fSk7XG5cdH0sXG59O1xuXG5jb25zdCBjdXJyZW50Q2FsbHNXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHQkY3VycmVudENhbGxzSW5mbzogJCgnI2N1cnJlbnQtY2FsbHMtaW5mbycpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGN1cnJlbnRDYWxsc1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChjdXJyZW50Q2FsbHNXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0Y3VycmVudENhbGxzV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0UGJ4QXBpLkdldEN1cnJlbnRDYWxscyhjdXJyZW50Q2FsbHNXb3JrZXIuY2JHZXRDdXJyZW50Q2FsbHMpO1xuXHRcdGN1cnJlbnRDYWxsc1dvcmtlci50aW1lb3V0SGFuZGxlXG5cdFx0XHQ9IHdpbmRvdy5zZXRUaW1lb3V0KGN1cnJlbnRDYWxsc1dvcmtlci53b3JrZXIsIGN1cnJlbnRDYWxsc1dvcmtlci50aW1lT3V0KTtcblx0fSxcblx0Y2JHZXRDdXJyZW50Q2FsbHMocmVzcG9uc2UpIHtcblx0XHRjdXJyZW50Q2FsbHNXb3JrZXIuJGN1cnJlbnRDYWxsc0luZm8uZW1wdHkoKTtcblx0XHRpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8IHR5cGVvZiByZXNwb25zZSAhPT0gJ29iamVjdCcpIHJldHVybjtcblx0XHRjb25zdCByZXNwT2JqZWN0ID0gcmVzcG9uc2U7XG5cdFx0bGV0IHJlc3VsdFVsID0gYDxoMiBjbGFzcz1cInVpIGhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLnJzX0N1cnJlbnRDYWxsc308L2gyPmA7XG5cdFx0cmVzdWx0VWwgKz0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgY29tcGFjdCB0YWJsZVwiPic7XG5cdFx0cmVzdWx0VWwgKz0gJzx0aGVhZD4nO1xuXHRcdHJlc3VsdFVsICs9IGA8dGg+PC90aD48dGg+JHtnbG9iYWxUcmFuc2xhdGUucnNfRGF0ZUNhbGx9PC90aD48dGg+JHtnbG9iYWxUcmFuc2xhdGUucnNfU3JjfTwvdGg+PHRoPiR7Z2xvYmFsVHJhbnNsYXRlLnJzX0RzdH08L3RoPmA7XG5cdFx0cmVzdWx0VWwgKz0gJzwvdGhlYWQ+Jztcblx0XHRyZXN1bHRVbCArPSAnPHRib2R5Pic7XG5cdFx0JC5lYWNoKHJlc3BPYmplY3QsIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdHJlc3VsdFVsICs9ICc8dHI+Jztcblx0XHRcdHJlc3VsdFVsICs9ICc8dGQ+PGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT48L3RkPic7XG5cdFx0XHRyZXN1bHRVbCArPSBgPHRkPiR7dmFsdWUuc3RhcnR9PC90ZD5gO1xuXHRcdFx0cmVzdWx0VWwgKz0gYDx0ZCBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHt2YWx1ZS5zcmNfbnVtfTwvdGQ+YDtcblx0XHRcdHJlc3VsdFVsICs9IGA8dGQgY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7dmFsdWUuZHN0X251bX08L3RkPmA7XG5cdFx0XHRyZXN1bHRVbCArPSAnPC90cj4nO1xuXHRcdH0pO1xuXHRcdHJlc3VsdFVsICs9ICc8L3Rib2R5PjwvdGFibGU+Jztcblx0XHRjdXJyZW50Q2FsbHNXb3JrZXIuJGN1cnJlbnRDYWxsc0luZm8uaHRtbChyZXN1bHRVbCk7XG5cdFx0RXh0ZW5zaW9ucy5VcGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG5cdH0sXG59O1xuXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0cmVzdGFydC5pbml0aWFsaXplKCk7XG5cdGN1cnJlbnRDYWxsc1dvcmtlci5pbml0aWFsaXplKCk7XG59KTtcblxuIl19