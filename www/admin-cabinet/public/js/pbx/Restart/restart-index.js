"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
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
//# sourceMappingURL=restart-index.js.map