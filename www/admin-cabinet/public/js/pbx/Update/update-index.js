"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

/* global PbxApi, globalPBXVersion, globalTranslate, ConfigWorker,
globalPBXLicense, globalPBXLanguage, globalPBXVersion */
var upgradeStatusLoopWorker = {
  timeOut: 1000,
  timeOutHandle: '',
  iterations: 0,
  $ajaxMessgesDiv: $('#ajax-messages'),
  initialize: function () {
    function initialize() {
      upgradeStatusLoopWorker.iterations = 0;
      upgradeStatusLoopWorker.restartWorker();
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
      upgradeStatusLoopWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
      PbxApi.SystemGetUpgradeStatus(upgradeStatusLoopWorker.cbRefreshUpgradeStatus);
    }

    return worker;
  }(),
  cbRefreshUpgradeStatus: function () {
    function cbRefreshUpgradeStatus(response) {
      upgradeStatusLoopWorker.iterations += 1;
      upgradeStatusLoopWorker.timeoutHandle = window.setTimeout(upgradeStatusLoopWorker.worker, upgradeStatusLoopWorker.timeOut);
      if (response.length === 0 || response === false) return;

      if (response.d_status === 'DOWNLOAD_IN_PROGRESS') {
        $('i.loading.redo').closest('a').find('.percent').text("".concat(response.d_status_progress, "%"));
      } else if (response.d_status === 'DOWNLOAD_COMPLETE') {
        window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
        $('i.loading.redo').closest('a').find('.percent').text("".concat(response.d_status_progress, "%"));
        $('i.loading.redo').addClass('sync').removeClass('redo');
      } else if (response.d_status === 'DOWNLOAD_ERROR') {
        window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
        $('.ui.message.ajax').remove();
        upgradeStatusLoopWorker.$ajaxMessgesDiv.after("<div class=\"ui error message ajax\">".concat(globalTranslate.upd_DownloadUpgradeError, "</div>"));
        $('i.loading.redo').addClass('download').removeClass('loading redo');
      }
    }

    return cbRefreshUpgradeStatus;
  }()
};
var updatePBX = {
  $formObj: $('#upgrade-form'),
  $submitButton: $('#submitbutton'),
  $progressBar: $('#upload-progress-bar'),
  $ajaxMessgesDiv: $('#ajax-messages'),
  currentVersion: globalPBXVersion,
  $restoreModalForm: $('#update-modal-form'),
  upgradeInProgress: false,
  initialize: function () {
    function initialize() {
      updatePBX.$restoreModalForm.modal();
      updatePBX.$submitButton.addClass('disabled');
      $('input:text, .ui.button', '.ui.action.input').on('click', function (e) {
        $('input:file', $(e.target).parents()).click();
      });
      $('input:file', '.ui.action.input').on('change', function (e) {
        if (e.target.files[0] !== undefined) {
          var filename = e.target.files[0].name;
          $('input:text', $(e.target).parent()).val(filename);
          updatePBX.$submitButton.removeClass('disabled');
        }
      });
      updatePBX.$submitButton.on('click', function (e) {
        e.preventDefault();
        if (updatePBX.$submitButton.hasClass('loading') || updatePBX.upgradeInProgress) return;
        updatePBX.$formObj.form({
          on: 'blur',
          fields: updatePBX.validateRules,
          onSuccess: function () {
            function onSuccess() {
              updatePBX.$restoreModalForm.modal({
                closable: false,
                onDeny: function () {
                  function onDeny() {
                    return true;
                  }

                  return onDeny;
                }(),
                onApprove: function () {
                  function onApprove() {
                    ConfigWorker.stopConfigWorker();
                    updatePBX.$submitButton.addClass('loading');
                    updatePBX.upgradeInProgress = true;
                    var data = $('input:file')[0].files[0];
                    PbxApi.SystemUpgrade(data, updatePBX.cbAfterUploadFile);
                    return true;
                  }

                  return onApprove;
                }()
              }).modal('show');
            }

            return onSuccess;
          }()
        });
        updatePBX.$formObj.form('validate form');
      });
      var requestData = {
        TYPE: 'FIRMWARE',
        LICENSE: globalPBXLicense,
        PBXVER: globalPBXVersion,
        LANGUAGE: globalPBXLanguage
      };
      $.api({
        url: 'https://update.askozia.ru',
        on: 'now',
        method: 'POST',
        data: requestData,
        successTest: function () {
          function successTest(response) {
            // test whether a JSON response is valid
            return response !== undefined && Object.keys(response).length > 0 && response.result.toUpperCase() === 'SUCCESS';
          }

          return successTest;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            var currentVerison = updatePBX.currentVersion.replace(/\D/g, '');
            response.firmware.forEach(function (obj) {
              var version = obj.version.replace(/\D/g, '');

              if (version > currentVerison) {
                updatePBX.AddNewVersionInformation(obj);
              }
            });
            $('a.download').on('click', function (e) {
              e.preventDefault();
              if (updatePBX.$submitButton.hasClass('loading') || updatePBX.upgradeInProgress) return;
              updatePBX.$restoreModalForm.modal({
                closable: false,
                onDeny: function () {
                  function onDeny() {
                    return true;
                  }

                  return onDeny;
                }(),
                onApprove: function () {
                  function onApprove() {
                    ConfigWorker.stopConfigWorker();
                    var params = [];
                    var $aLink = $(e.target).closest('a');
                    params.updateLink = $aLink.attr('href');
                    params.md5 = $aLink.attr('data-md5');
                    params.size = $aLink.attr('data-size');
                    $aLink.find('i').addClass('loading redo').removeClass('download');
                    updatePBX.upgradeInProgress = true;
                    PbxApi.SystemUpgradeOnline(params);
                    upgradeStatusLoopWorker.initialize();
                    return true;
                  }

                  return onApprove;
                }()
              }).modal('show');
            });
          }

          return onSuccess;
        }()
      });
    }

    return initialize;
  }(),
  cbAfterUploadFile: function () {
    function cbAfterUploadFile(response) {
      if (response.length === 0 || response === false) {
        updatePBX.$submitButton.removeClass('loading');
        updatePBX.upgradeInProgress = false;
        $('.ui.message.ajax').remove();
        updatePBX.$ajaxMessgesDiv.after("<div class=\"ui error message ajax\">".concat(globalTranslate.upd_UploadError, "</div>"));
      } else if (response["function"] === 'upload_progress') {
        updatePBX.$progressBar.progress({
          percent: parseInt(response.percent, 10)
        });
      }
    }

    return cbAfterUploadFile;
  }(),
  AddNewVersionInformation: function () {
    function AddNewVersionInformation(obj) {
      $('#online-updates-block').show();
      var dymanicRow = "\n\t\t\t<tr class=\"update-row\">\n\t\t\t<td class=\"center aligned\">".concat(obj.version, "</td>\n\t\t\t<td>").concat(decodeURIComponent(obj.description), "</td>\n\t\t\t<td class=\"right aligned collapsing\">\n    \t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t<a href=\"").concat(obj.href, "\" class=\"ui button download\" \n\t\t\t\t\tdata-md5 =\"").concat(obj.md5, "\" data-size =\"").concat(obj.size, "\">\n\t\t\t\t\t<i class=\"icon download blue\"></i>\n\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t</a>\n    \t\t</div>   \n\t</tr>");
      $('#updates-table tbody').append(dymanicRow);
    }

    return AddNewVersionInformation;
  }()
};
$(document).ready(function () {
  updatePBX.initialize();
});
//# sourceMappingURL=update-index.js.map