"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global PbxApi, ConfigWorker, globalTranslate, globalRootUrl */
var restoreWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  $submitButton: $('#submitbutton'),
  waitRestoreId: undefined,
  $progressBar: $('#restore-progress-bar'),
  $ajaxMessagesDiv: $('#ajax-messages'),
  restoreIsProcessing: false,
  $formObj: $('#backup-restore-form'),
  formAlreadyBuilded: false,
  initialize: function () {
    function initialize(waitRestoreId) {
      restoreWorker.waitRestoreId = waitRestoreId; // Запустим обновление статуса восстановления резервной копии

      restoreWorker.restartWorker();
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(restoreWorker.timeoutHandle);
      restoreWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      PbxApi.BackupGetFilesList(restoreWorker.cbAfterGetFiles);
      restoreWorker.timeoutHandle = window.setTimeout(restoreWorker.worker, restoreWorker.timeOut);
    }

    return worker;
  }(),
  cbAfterGetFiles: function () {
    function cbAfterGetFiles(response) {
      if (response.length === 0 || response === false) {
        window.clearTimeout(restoreWorker.timeoutHandle);
        restoreWorker.$submitButton.removeClass('loading');
      } else {
        var percentOfTotal = 0;
        $.each(response, function (key, value) {
          restoreWorker.restoreIsProcessing = value.pid_recover.length > 0 || restoreWorker.restoreIsProcessing;

          if (restoreWorker.waitRestoreId === undefined && value.pid_recover.length > 0) {
            restoreWorker.waitRestoreId = value.id;
          }

          if (restoreWorker.waitRestoreId === value.id && restoreWorker.restoreIsProcessing > 0) {
            percentOfTotal = 100 * (value.progress_recover / value.total);
            restoreWorker.$progressBar.progress({
              duration: value.progress_recover,
              total: value.total,
              percent: parseInt(percentOfTotal, 10),
              text: {
                active: '{value} of {total} done'
              }
            });

            if (value.progress_recover === value.total) {
              restoreWorker.$submitButton.removeClass('loading');
            }
          } // Построим форму с чекбоксами


          if (restoreWorker.waitRestoreId === value.id) {
            if (!restoreWorker.formAlreadyBuilded) {
              $.each(value.config, function (configKey, configValue) {
                if (configValue === '1') {
                  var locLabel = "bkp_".concat(configKey);
                  var html = '<div class="ui segment"><div class="field"><div class="ui toggle checkbox">';
                  html += "<input type=\"checkbox\" name=\"".concat(configKey, "\" checked = \"checked\" class=\"hidden\"/>");
                  html += "<label>".concat(globalTranslate[locLabel], "</label>");
                  html += '</div></div></div>';
                  restoreWorker.$formObj.prepend(html);
                }
              });
              $('.checkbox').checkbox({
                onChange: restoreWorker.onChangeCheckbox
              });
              restoreWorker.formAlreadyBuilded = true;
            }
          }
        });

        if (restoreWorker.restoreIsProcessing === false) {
          window.clearTimeout(restoreWorker.timeoutHandle);
        }
      }
    }

    return cbAfterGetFiles;
  }(),

  /**
   * При выключении всех чекбоксов отключить кнопку
   */
  onChangeCheckbox: function () {
    function onChangeCheckbox() {
      var formResult = restoreWorker.$formObj.form('get values');
      var options = {};
      $.each(formResult, function (key, value) {
        if (value) {
          options[key] = '1';
        }
      });

      if (Object.entries(options).length === 0) {
        restoreWorker.$submitButton.addClass('disabled');
      } else {
        restoreWorker.$submitButton.removeClass('disabled');
      }
    }

    return onChangeCheckbox;
  }()
};
var restoreBackup = {
  $progressBar: $('#restore-progress-bar'),
  $formObj: $('#backup-restore-form'),
  $submitButton: $('#submitbutton'),
  $deleteButton: $('#deletebutton'),
  $ajaxMessagesDiv: $('#ajax-messages'),
  $restoreModalForm: $('#restore-modal-form'),
  currentBackupId: window.location.pathname.split('/')[4],
  initialize: function () {
    function initialize() {
      restoreBackup.$restoreModalForm.modal();
      restoreBackup.$submitButton.on('click', function (e) {
        e.preventDefault();
        if (restoreWorker.restoreIsProcessing) return;
        var formResult = restoreBackup.$formObj.form('get values');
        var options = {};
        $.each(formResult, function (key, value) {
          if (value) {
            options[key] = '1';
          }
        });

        if (Object.entries(options).length > 0) {
          var params = {
            id: restoreBackup.currentBackupId,
            options: options
          };
          restoreBackup.$restoreModalForm.modal({
            closable: false,
            onDeny: function () {
              function onDeny() {
                return true;
              }

              return onDeny;
            }(),
            onApprove: function () {
              function onApprove() {
                restoreWorker.$submitButton.addClass('loading');
                restoreWorker.restoreIsProcessing = true;
                ConfigWorker.stopConfigWorker();
                PbxApi.BackupRecover(params, restoreBackup.cbAfterRestore);
                return true;
              }

              return onApprove;
            }()
          }).modal('show');
        }
      });
      restoreBackup.$deleteButton.on('click', function (e) {
        e.preventDefault();
        if (restoreWorker.restoreIsProcessing) return;
        PbxApi.BackupDeleteFile(restoreBackup.currentBackupId, restoreBackup.cbAfterDeleteFile);
      });
      restoreWorker.initialize(restoreBackup.currentBackupId);
    }

    return initialize;
  }(),
  cbAfterRestore: function () {
    function cbAfterRestore() {
      restoreWorker.initialize(restoreBackup.currentBackupId);
    }

    return cbAfterRestore;
  }(),
  cbAfterDeleteFile: function () {
    function cbAfterDeleteFile(response) {
      if (response) {
        window.location = "".concat(globalRootUrl, "/backup/index");
      }
    }

    return cbAfterDeleteFile;
  }()
};
$(document).ready(function () {
  restoreBackup.initialize();
});
//# sourceMappingURL=backup-restore.js.map