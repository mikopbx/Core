"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

/* global PbxApi */
var connectionCheckWorker = {
  timeOut: 1000,
  timeOutHandle: '',
  errorCounts: 0,
  $connectionDimmer: $('#connection-dimmer'),
  initialize: function () {
    function initialize() {
      // Запустим обновление статуса провайдера
      connectionCheckWorker.restartWorker();
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(connectionCheckWorker.timeoutHandle);
      connectionCheckWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      PbxApi.PingPBX(connectionCheckWorker.cbAfterResponse);
      connectionCheckWorker.timeoutHandle = window.setTimeout(connectionCheckWorker.worker, connectionCheckWorker.timeOut);
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(result) {
      if (result === true) {
        connectionCheckWorker.$connectionDimmer.dimmer('hide');
        connectionCheckWorker.timeOut = 3000;
        if (connectionCheckWorker.errorCounts > 5) window.location.reload();
        connectionCheckWorker.errorCounts = 0;
      } else if (connectionCheckWorker.errorCounts > 3) {
        connectionCheckWorker.$connectionDimmer.dimmer('show');
        connectionCheckWorker.timeOut = 1000;
        connectionCheckWorker.errorCounts += 1;
      } else {
        connectionCheckWorker.timeOut = 1000;
        connectionCheckWorker.errorCounts += 1;
      }
    }

    return cbAfterResponse;
  }()
};
$(document).ready(function () {
  connectionCheckWorker.initialize();
});
//# sourceMappingURL=connection-check-worker.js.map