"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global globalRootUrl, PbxApi */
var ConfigWorker = {
  timeOut: 5000,
  timeOutHandle: '',
  uiResetConfigurationChangesUrl: "".concat(globalRootUrl, "configuration-apply/resetConfigurationChanged/{appliedFunction}"),
  uiCheckConfigurationChangesUrl: "".concat(globalRootUrl, "configuration-apply/getNewConfigurationChanges"),
  $applyConfigurationButton: $('#apply-configuration-button'),
  $submitButton: $('#submitbutton'),
  stillWorking: false,
  initialize: function () {
    function initialize() {
      // Запустим обновление статуса провайдера
      ConfigWorker.restartWorker();
    }

    return initialize;
  }(),
  stopConfigWorker: function () {
    function stopConfigWorker() {
      window.clearTimeout(ConfigWorker.timeoutHandle);
      ConfigWorker.stillWorking = false;
    }

    return stopConfigWorker;
  }(),
  restartWorker: function () {
    function restartWorker() {
      ConfigWorker.stillWorking = false;
      window.clearTimeout(ConfigWorker.timeoutHandle);
      ConfigWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      if (ConfigWorker.stillWorking) return;
      ConfigWorker.timeoutHandle = window.setTimeout(ConfigWorker.worker, ConfigWorker.timeOut);
      ConfigWorker.stillWorking = true;
      $.api({
        url: ConfigWorker.uiCheckConfigurationChangesUrl,
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            if (response !== undefined && response.changed === true) {
              localStorage.setItem('NeedApplyActions', response.actions); // Прпробуем сразу применять после сохранения
              // window.clearTimeout(ConfigWorker.timeoutHandle);

              ConfigWorker.applyConfigurationChanges();
            } else {
              ConfigWorker.$submitButton.removeClass('loading');
            }

            ConfigWorker.stillWorking = false;
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError(errorMessage, element, xhr) {
            if (xhr.status === 403) {
              window.location = "".concat(globalRootUrl, "session/index");
            }

            ConfigWorker.stillWorking = false;
          }

          return onError;
        }()
      });
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(appliedFunction) {
      var needApplyActions = localStorage.getItem('NeedApplyActions');
      var newActionsArray = JSON.parse(needApplyActions).filter(function (e) {
        return e !== appliedFunction;
      });
      localStorage.setItem('NeedApplyActions', JSON.stringify(newActionsArray));
      $.api({
        url: ConfigWorker.uiResetConfigurationChangesUrl,
        on: 'now',
        urlData: {
          appliedFunction: appliedFunction
        }
      });
      ConfigWorker.applyConfigurationChanges(); // Выполним следующую итерацию проверки изменений
    }

    return cbAfterResponse;
  }(),
  applyConfigurationChanges: function () {
    function applyConfigurationChanges() {
      var needApplyActions = JSON.parse(localStorage.getItem('NeedApplyActions'));

      if (needApplyActions.length > 0) {
        ConfigWorker.$submitButton.addClass('loading');
        var actionName = needApplyActions[0];
        PbxApi[actionName](ConfigWorker.cbAfterResponse);
      } else {
        ConfigWorker.$submitButton.removeClass('loading'); // window.clearTimeout(ConfigWorker.timeoutHandle);
      }
    }

    return applyConfigurationChanges;
  }()
};
$(document).ready(function () {
  ConfigWorker.initialize();
});
//# sourceMappingURL=pbx-config-worker.js.map