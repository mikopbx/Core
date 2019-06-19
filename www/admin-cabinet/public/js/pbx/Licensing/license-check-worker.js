"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global PbxApi, globalRootUrl  */

/**
 * Периодическая проверка на наличие лицензионного ключа,
 * для отображения информации о ошибке в заголовке всех форм
 */
var licenseCheckWorker = {
  timeOut: 300000,
  timeOutHandle: '',
  $licenseWarningMessage: $('#license-warning'),
  initialize: function () {
    function initialize() {
      // Запустим обновление статуса провайдера
      licenseCheckWorker.restartWorker();
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(licenseCheckWorker.timeoutHandle);
      licenseCheckWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      var previousLicenseCheckResult = localStorage.getItem('previousLicenseCheckResult');
      var nowTime = Math.floor(Date.now() / 1000);

      if (previousLicenseCheckResult !== null) {
        var oldCheckTime = JSON.parse(previousLicenseCheckResult).time;
        var oldCheckResult = JSON.parse(previousLicenseCheckResult).result;

        if (nowTime - oldCheckTime < licenseCheckWorker.timeOut) {
          if (oldCheckResult === true) {
            licenseCheckWorker.$licenseWarningMessage.hide();
          } else {
            licenseCheckWorker.$licenseWarningMessage.show();
          }
        } else {
          $.api({
            url: "".concat(globalRootUrl, "/advices/getAdvices/"),
            on: 'now',
            onSuccess: function () {
              function onSuccess(response) {
                licenseCheckWorker.cbAfterResponse(response);
              }

              return onSuccess;
            }(),
            onError: function () {
              function onError(errorMessage, element, xhr) {
                if (xhr.status === 403) {
                  window.location = "".concat(globalRootUrl, "session/index");
                }
              }

              return onError;
            }()
          });
        }
      } else {
        PbxApi.CheckLicense(licenseCheckWorker.cbAfterResponse);
      }

      if (NeedAjax) {}

      licenseCheckWorker.timeoutHandle = window.setTimeout(licenseCheckWorker.worker, licenseCheckWorker.timeOut);
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(result) {
      if (result === true) {
        licenseCheckWorker.$licenseWarningMessage.hide();
      } else {
        licenseCheckWorker.$licenseWarningMessage.show();
      }

      var nowTime = Math.floor(Date.now() / 1000);
      localStorage.setItem('previousLicenseCheckResult', "{\"time\":".concat(nowTime, ", \"result\":").concat(result === true, " }"));
    }

    return cbAfterResponse;
  }()
};
$(document).ready(function () {
  licenseCheckWorker.initialize();
});
//# sourceMappingURL=license-check-worker.js.map