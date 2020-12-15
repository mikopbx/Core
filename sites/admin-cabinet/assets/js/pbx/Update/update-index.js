"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi, globalPBXVersion, globalTranslate,
globalWebAdminLanguage, globalPBXVersion, showdown, UserMessage */
var mergingCheckWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  errorCounts: 0,
  $progressBarLabel: $('#upload-progress-bar').find('.label'),
  fileID: null,
  filePath: '',
  initialize: function () {
    function initialize(fileID, filePath) {
      mergingCheckWorker.fileID = fileID;
      mergingCheckWorker.filePath = filePath;
      mergingCheckWorker.restartWorker(fileID);
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(mergingCheckWorker.timeoutHandle);
      mergingCheckWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      PbxApi.FilesGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
      mergingCheckWorker.timeoutHandle = window.setTimeout(mergingCheckWorker.worker, mergingCheckWorker.timeOut);
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(response) {
      if (mergingCheckWorker.errorCounts > 10) {
        mergingCheckWorker.$progressBarLabel.text(globalTranslate.upd_UploadError);
        UserMessage.showMultiString(globalTranslate.upd_UploadError);
        updatePBX.$submitButton.removeClass('loading');
        window.clearTimeout(mergingCheckWorker.timeoutHandle);
      }

      if (response === undefined || Object.keys(response).length === 0) {
        mergingCheckWorker.errorCounts += 1;
        return;
      }

      if (response.d_status === 'UPLOAD_COMPLETE') {
        mergingCheckWorker.$progressBarLabel.text(globalTranslate.upd_UpgradeInProgress);
        PbxApi.SystemUpgrade(mergingCheckWorker.filePath, updatePBX.cbAfterStartUpdate);
        window.clearTimeout(mergingCheckWorker.timeoutHandle);
      } else if (response.d_status !== undefined) {
        mergingCheckWorker.$progressBarLabel.text(globalTranslate.upd_UploadInProgress);
        mergingCheckWorker.errorCounts = 0;
      } else {
        mergingCheckWorker.errorCounts += 1;
      }
    }

    return cbAfterResponse;
  }()
};
var upgradeStatusLoopWorker = {
  timeOut: 1000,
  timeOutHandle: '',
  iterations: 0,
  filename: '',
  initialize: function () {
    function initialize(filename) {
      upgradeStatusLoopWorker.filename = filename;
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
      PbxApi.FilesFirmwareDownloadStatus(upgradeStatusLoopWorker.filename, upgradeStatusLoopWorker.cbRefreshUpgradeStatus);
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
        PbxApi.SystemUpgrade(response.filePath, updatePBX.cbAfterStartUpdate);
      } else if (response.d_status === 'DOWNLOAD_ERROR') {
        window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
        UserMessage.showMultiString(globalTranslate.upd_DownloadUpgradeError);
        $('i.loading.redo').addClass('redo').removeClass('loading');
      }
    }

    return cbRefreshUpgradeStatus;
  }()
};
var updatePBX = {
  $formObj: $('#upgrade-form'),
  $submitButton: $('#submitbutton'),
  $progressBar: $('#upload-progress-bar'),
  $progressBarLabel: $('#upload-progress-bar').find('.label'),
  currentVersion: globalPBXVersion,
  $restoreModalForm: $('#update-modal-form'),
  upgradeInProgress: false,
  converter: new showdown.Converter(),
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
                    updatePBX.$submitButton.addClass('loading');
                    updatePBX.upgradeInProgress = true;
                    var data = $('input:file')[0].files[0];
                    PbxApi.FilesUploadFile(data, updatePBX.cbResumableUploadFile);
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
        PBXVER: globalPBXVersion,
        LANGUAGE: globalWebAdminLanguage
      };
      $.api({
        url: 'https://update.askozia.ru',
        on: 'now',
        method: 'POST',
        data: requestData,
        successTest: function () {
          function successTest(response) {
            // test whether a JSON response is valid
            return response !== undefined && Object.keys(response).length > 0 && response.result === 'SUCCESS';
          }

          return successTest;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            var currentVerison = updatePBX.currentVersion.replace(/\D/g, '');
            response.firmware.forEach(function (obj) {
              var version = obj.version.replace(/\D/g, '');

              if (parseInt(version, 10) > parseInt(currentVerison, 10)) {
                updatePBX.addNewVersionInformation(obj);
              }
            });
            $('a.redo').on('click', function (e) {
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
                    var params = [];
                    var $aLink = $(e.target).closest('a');
                    params.updateLink = $aLink.attr('href');
                    params.md5 = $aLink.attr('data-md5');
                    params.version = $aLink.attr('data-version');
                    params.size = $aLink.attr('data-size');
                    $aLink.find('i').addClass('loading');
                    updatePBX.upgradeInProgress = true;
                    PbxApi.FilesDownloadNewFirmware(params, updatePBX.cbAfterStartDownloadFirmware);
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

  /**
   * Upload file by chunks
   * @param action
   * @param params
   */
  cbResumableUploadFile: function () {
    function cbResumableUploadFile(action, params) {
      switch (action) {
        case 'fileSuccess':
          updatePBX.checkStatusFileMerging(params.response);
          break;

        case 'uploadStart':
          updatePBX.$submitButton.addClass('loading');
          updatePBX.$progressBar.show();
          updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadInProgress);
          break;

        case 'progress':
          updatePBX.$progressBar.progress({
            percent: parseInt(params.percent, 10)
          });
          break;

        case 'error':
          updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadError);
          updatePBX.$submitButton.removeClass('loading');
          UserMessage.showMultiString(globalTranslate.upd_UploadError);
          break;

        default:
      }
    }

    return cbResumableUploadFile;
  }(),

  /**
   * Wait for file ready to use
   *
   * @param response ответ функции /pbxcore/api/upload/status
   */
  checkStatusFileMerging: function () {
    function checkStatusFileMerging(response) {
      if (response === undefined || PbxApi.tryParseJSON(response) === false) {
        UserMessage.showMultiString("".concat(globalTranslate.upd_UploadError));
        return;
      }

      var json = JSON.parse(response);

      if (json === undefined || json.data === undefined) {
        UserMessage.showMultiString("".concat(globalTranslate.upd_UploadError));
        return;
      }

      var fileID = json.data.upload_id;
      var filePath = json.data.filename;
      mergingCheckWorker.initialize(fileID, filePath);
    }

    return checkStatusFileMerging;
  }(),

  /**
   * Callback after start PBX upgrading
   * @param response
   */
  cbAfterStartUpdate: function () {
    function cbAfterStartUpdate(response) {
      if (response.length === 0 || response === false) {
        UserMessage.showMultiString(globalTranslate.upd_UpgradeError);
        updatePBX.$submitButton.removeClass('loading');
      }
    }

    return cbAfterStartUpdate;
  }(),

  /**
   * After start online upgrade we have to wait an answer,
   * and then start status check worker
   */
  cbAfterStartDownloadFirmware: function () {
    function cbAfterStartDownloadFirmware(response) {
      if (response.filename !== undefined) {
        upgradeStatusLoopWorker.initialize(response.filename);
      } else {
        updatePBX.upgradeInProgress = false;
        $('i.loading.redo').removeClass('loading');
      }
    }

    return cbAfterStartDownloadFirmware;
  }(),

  /**
   * Add new block of update information on page
   */
  addNewVersionInformation: function () {
    function addNewVersionInformation(obj) {
      $('#online-updates-block').show();
      var markdownText = decodeURIComponent(obj.description);
      markdownText = markdownText.replace(/<br>/g, '\r');
      markdownText = markdownText.replace(/<br >/g, '\r');
      markdownText = markdownText.replace(/\* \*/g, '*');
      markdownText = markdownText.replace(/\*\*/g, '*');
      var html = updatePBX.converter.makeHtml(markdownText);
      var dymanicRow = "\n\t\t\t<tr class=\"update-row\">\n\t\t\t<td class=\"center aligned\">".concat(obj.version, "</td>\n\t\t\t<td>").concat(html, "</td>\n\t\t\t<td class=\"right aligned collapsing\">\n    \t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t<a href=\"").concat(obj.href, "\" class=\"ui button redo popuped\" \n    \t\t\t\tdata-content = \"").concat(globalTranslate.bt_ToolTipUpgradeOnline, "\"\n\t\t\t\t\tdata-md5 =\"").concat(obj.md5, "\" data-size =\"").concat(obj.size, "\"\n\t\t\t\t\tdata-version = \"").concat(obj.version, "\" >\n\t\t\t\t\t<i class=\"icon redo blue\"></i>\n\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t</a>\n\t\t\t\t<a href=\"").concat(obj.href, "\" class=\"ui button download popuped\" \n\t\t\t\t\tdata-content = \"").concat(globalTranslate.bt_ToolTipDownload, "\"\n\t\t\t\t\tdata-md5 =\"").concat(obj.md5, "\" data-size =\"").concat(obj.size, "\">\n\t\t\t\t\t<i class=\"icon download blue\"></i>\n\t\t\t\t</a>\n    \t\t</div>   \n\t</tr>");
      $('#updates-table tbody').append(dymanicRow);
      $('a.popuped').popup();
    }

    return addNewVersionInformation;
  }()
};
$(document).ready(function () {
  updatePBX.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbIm1lcmdpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCIkcHJvZ3Jlc3NCYXJMYWJlbCIsIiQiLCJmaW5kIiwiZmlsZUlEIiwiZmlsZVBhdGgiLCJpbml0aWFsaXplIiwicmVzdGFydFdvcmtlciIsIndpbmRvdyIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJQYnhBcGkiLCJGaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUiLCJjYkFmdGVyUmVzcG9uc2UiLCJzZXRUaW1lb3V0IiwicmVzcG9uc2UiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidXBkX1VwbG9hZEVycm9yIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJ1cGRhdGVQQlgiLCIkc3VibWl0QnV0dG9uIiwicmVtb3ZlQ2xhc3MiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiZF9zdGF0dXMiLCJ1cGRfVXBncmFkZUluUHJvZ3Jlc3MiLCJTeXN0ZW1VcGdyYWRlIiwiY2JBZnRlclN0YXJ0VXBkYXRlIiwidXBkX1VwbG9hZEluUHJvZ3Jlc3MiLCJ1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciIsIml0ZXJhdGlvbnMiLCJmaWxlbmFtZSIsIkZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyIsImNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMiLCJjbG9zZXN0IiwiZF9zdGF0dXNfcHJvZ3Jlc3MiLCJhZGRDbGFzcyIsInVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvciIsIiRmb3JtT2JqIiwiJHByb2dyZXNzQmFyIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHJlc3RvcmVNb2RhbEZvcm0iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwibW9kYWwiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlcyIsIm5hbWUiLCJwYXJlbnQiLCJ2YWwiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZm9ybSIsImZpZWxkcyIsInZhbGlkYXRlUnVsZXMiLCJvblN1Y2Nlc3MiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImRhdGEiLCJGaWxlc1VwbG9hZEZpbGUiLCJjYlJlc3VtYWJsZVVwbG9hZEZpbGUiLCJyZXF1ZXN0RGF0YSIsIlRZUEUiLCJQQlhWRVIiLCJMQU5HVUFHRSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJzdWNjZXNzVGVzdCIsInJlc3VsdCIsImN1cnJlbnRWZXJpc29uIiwicmVwbGFjZSIsImZpcm13YXJlIiwiZm9yRWFjaCIsIm9iaiIsInZlcnNpb24iLCJwYXJzZUludCIsImFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbiIsInBhcmFtcyIsIiRhTGluayIsInVwZGF0ZUxpbmsiLCJhdHRyIiwibWQ1Iiwic2l6ZSIsIkZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsImNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUiLCJhY3Rpb24iLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwic2hvdyIsInByb2dyZXNzIiwicGVyY2VudCIsInRyeVBhcnNlSlNPTiIsImpzb24iLCJKU09OIiwicGFyc2UiLCJ1cGxvYWRfaWQiLCJ1cGRfVXBncmFkZUVycm9yIiwibWFya2Rvd25UZXh0IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZGVzY3JpcHRpb24iLCJodG1sIiwibWFrZUh0bWwiLCJkeW1hbmljUm93IiwiaHJlZiIsImJ0X1Rvb2xUaXBVcGdyYWRlT25saW5lIiwiYnRfVG9vbFRpcERvd25sb2FkIiwiYXBwZW5kIiwicG9wdXAiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkE7O0FBR0EsSUFBTUEs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LENBQXFCLE9BQXJCLEVBQThCLEdBQTlCLENBQWY7QUFDQSxVQUFNNkIsSUFBSSxHQUFHNUYsU0FBUyxDQUFDMkIsU0FBVixDQUFvQmtFLFFBQXBCLENBQTZCSixZQUE3QixDQUFiO0FBQ0EsVUFBTUssVUFBVSxtRkFFYzVCLEdBQUcsQ0FBQ0MsT0FGbEIsOEJBR1R5QixJQUhTLDJKQU1BMUIsR0FBRyxDQUFDNkIsSUFOSixnRkFPUW5HLGVBQWUsQ0FBQ29HLHVCQVB4Qix1Q0FRQTlCLEdBQUcsQ0FBQ1EsR0FSSiw2QkFRd0JSLEdBQUcsQ0FBQ1MsSUFSNUIsNENBU0tULEdBQUcsQ0FBQ0MsT0FUVCwwSUFhSEQsR0FBRyxDQUFDNkIsSUFiRCxrRkFjS25HLGVBQWUsQ0FBQ3FHLGtCQWRyQix1Q0FlQS9CLEdBQUcsQ0FBQ1EsR0FmSiw2QkFld0JSLEdBQUcsQ0FBQ1MsSUFmNUIsa0dBQWhCO0FBb0JBL0YsTUFBQUEsQ0FBQyxDQUFDLHNCQUFELENBQUQsQ0FBMEJzSCxNQUExQixDQUFpQ0osVUFBakM7QUFDQWxILE1BQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZXVILEtBQWY7QUFDQTs7QUE1TWdCO0FBQUE7QUFBQSxDQUFsQjtBQWdOQXZILENBQUMsQ0FBQ3dILFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJyRyxFQUFBQSxTQUFTLENBQUNoQixVQUFWO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxQQlhWZXJzaW9uLCBnbG9iYWxUcmFuc2xhdGUsXG5nbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxQQlhWZXJzaW9uLCBzaG93ZG93biwgVXNlck1lc3NhZ2UgKi9cblxuY29uc3QgbWVyZ2luZ0NoZWNrV29ya2VyID0ge1xuXHR0aW1lT3V0OiAzMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0ZXJyb3JDb3VudHM6IDAsXG5cdCRwcm9ncmVzc0JhckxhYmVsOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLmZpbmQoJy5sYWJlbCcpLFxuXHRmaWxlSUQ6IG51bGwsXG5cdGZpbGVQYXRoOiAnJyxcblx0aW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKSB7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVJRCA9IGZpbGVJRDtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZVBhdGggPSBmaWxlUGF0aDtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIucmVzdGFydFdvcmtlcihmaWxlSUQpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQobWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci53b3JrZXIoKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdFBieEFwaS5GaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUobWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVJRCwgbWVyZ2luZ0NoZWNrV29ya2VyLmNiQWZ0ZXJSZXNwb25zZSk7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUgPSB3aW5kb3cuc2V0VGltZW91dChcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci53b3JrZXIsXG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIudGltZU91dCxcblx0XHQpO1xuXHR9LFxuXHRjYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRpZiAobWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzID4gMTApIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuXHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQobWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdH1cblx0XHRpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgKz0gMTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnVVBMT0FEX0NPTVBMRVRFJykge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGdyYWRlSW5Qcm9ncmVzcyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtVXBncmFkZShtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZVBhdGgsIHVwZGF0ZVBCWC5jYkFmdGVyU3RhcnRVcGRhdGUpO1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dChtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEluUHJvZ3Jlc3MpO1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzID0gMDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzICs9IDE7XG5cdFx0fVxuXHR9LFxufTtcblxuXG5jb25zdCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciA9IHtcblx0dGltZU91dDogMTAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGl0ZXJhdGlvbnM6IDAsXG5cdGZpbGVuYW1lOiAnJyxcblx0aW5pdGlhbGl6ZShmaWxlbmFtZSkge1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmZpbGVuYW1lID0gZmlsZW5hbWU7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaXRlcmF0aW9ucyA9IDA7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFBieEFwaS5GaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXModXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuZmlsZW5hbWUsIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMpO1xuXHR9LFxuXHRjYlJlZnJlc2hVcGdyYWRlU3RhdHVzKHJlc3BvbnNlKSB7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaXRlcmF0aW9ucyArPSAxO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUgPVxuXHRcdFx0d2luZG93LnNldFRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIud29ya2VyLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lT3V0KTtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0lOX1BST0dSRVNTJykge1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5jbG9zZXN0KCdhJykuZmluZCgnLnBlcmNlbnQnKS50ZXh0KGAke3Jlc3BvbnNlLmRfc3RhdHVzX3Byb2dyZXNzfSVgKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnRE9XTkxPQURfQ09NUExFVEUnKSB7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5jbG9zZXN0KCdhJykuZmluZCgnLnBlcmNlbnQnKS50ZXh0KGAke3Jlc3BvbnNlLmRfc3RhdHVzX3Byb2dyZXNzfSVgKTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuYWRkQ2xhc3MoJ3N5bmMnKS5yZW1vdmVDbGFzcygncmVkbycpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVVwZ3JhZGUocmVzcG9uc2UuZmlsZVBhdGgsIHVwZGF0ZVBCWC5jYkFmdGVyU3RhcnRVcGRhdGUpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9FUlJPUicpIHtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLnVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvcik7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmFkZENsYXNzKCdyZWRvJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9XG5cdH0sXG59O1xuXG5cbmNvbnN0IHVwZGF0ZVBCWCA9IHtcblx0JGZvcm1PYmo6ICQoJyN1cGdyYWRlLWZvcm0nKSxcblx0JHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXHQkcHJvZ3Jlc3NCYXI6ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyJyksXG5cdCRwcm9ncmVzc0JhckxhYmVsOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLmZpbmQoJy5sYWJlbCcpLFxuXHRjdXJyZW50VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbixcblx0JHJlc3RvcmVNb2RhbEZvcm06ICQoJyN1cGRhdGUtbW9kYWwtZm9ybScpLFxuXHR1cGdyYWRlSW5Qcm9ncmVzczogZmFsc2UsXG5cdGNvbnZlcnRlcjogbmV3IHNob3dkb3duLkNvbnZlcnRlcigpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHVwZGF0ZVBCWC4kcmVzdG9yZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdCQoJ2lucHV0OnRleHQsIC51aS5idXR0b24nLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHQkKCdpbnB1dDpmaWxlJywgJChlLnRhcmdldCkucGFyZW50cygpKS5jbGljaygpO1xuXHRcdH0pO1xuXG5cdFx0JCgnaW5wdXQ6ZmlsZScsICcudWkuYWN0aW9uLmlucHV0Jykub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHRpZiAoZS50YXJnZXQuZmlsZXNbMF0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjb25zdCBmaWxlbmFtZSA9IGUudGFyZ2V0LmZpbGVzWzBdLm5hbWU7XG5cdFx0XHRcdCQoJ2lucHV0OnRleHQnLCAkKGUudGFyZ2V0KS5wYXJlbnQoKSkudmFsKGZpbGVuYW1lKTtcblx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGlmICh1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpIHx8IHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcykgcmV0dXJuO1xuXG5cdFx0XHR1cGRhdGVQQlguJGZvcm1PYmpcblx0XHRcdFx0LmZvcm0oe1xuXHRcdFx0XHRcdG9uOiAnYmx1cicsXG5cdFx0XHRcdFx0ZmllbGRzOiB1cGRhdGVQQlgudmFsaWRhdGVSdWxlcyxcblx0XHRcdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm1cblx0XHRcdFx0XHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0XHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdFx0b25EZW55OiAoKSA9PiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBkYXRhID0gJCgnaW5wdXQ6ZmlsZScpWzBdLmZpbGVzWzBdO1xuXHRcdFx0XHRcdFx0XHRcdFx0UGJ4QXBpLkZpbGVzVXBsb2FkRmlsZShkYXRhLHVwZGF0ZVBCWC5jYlJlc3VtYWJsZVVwbG9hZEZpbGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0Lm1vZGFsKCdzaG93Jyk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSk7XG5cdFx0XHR1cGRhdGVQQlguJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuXHRcdH0pO1xuXHRcdGNvbnN0IHJlcXVlc3REYXRhID0ge1xuXHRcdFx0VFlQRTogJ0ZJUk1XQVJFJyxcblx0XHRcdFBCWFZFUjogZ2xvYmFsUEJYVmVyc2lvbixcblx0XHRcdExBTkdVQUdFOiBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLFxuXHRcdH07XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiAnaHR0cHM6Ly91cGRhdGUuYXNrb3ppYS5ydScsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0c3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcblx0XHRcdFx0Ly8gdGVzdCB3aGV0aGVyIGEgSlNPTiByZXNwb25zZSBpcyB2YWxpZFxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSAnU1VDQ0VTUyc7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRWZXJpc29uID0gdXBkYXRlUEJYLmN1cnJlbnRWZXJzaW9uLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cdFx0XHRcdHJlc3BvbnNlLmZpcm13YXJlLmZvckVhY2goKG9iaikgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHZlcnNpb24gPSBvYmoudmVyc2lvbi5yZXBsYWNlKC9cXEQvZywgJycpO1xuXHRcdFx0XHRcdGlmIChwYXJzZUludCh2ZXJzaW9uLCAxMCkgPiBwYXJzZUludChjdXJyZW50VmVyaXNvbiwgMTApKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVQQlguYWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkKCdhLnJlZG8nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcblx0XHRcdFx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm1cblx0XHRcdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0b25EZW55OiAoKSA9PiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBwYXJhbXMgPSBbXTtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnVwZGF0ZUxpbmsgPSAkYUxpbmsuYXR0cignaHJlZicpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy5tZDUgPSAkYUxpbmsuYXR0cignZGF0YS1tZDUnKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMudmVyc2lvbiA9ICRhTGluay5hdHRyKCdkYXRhLXZlcnNpb24nKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdFx0XHRcdFx0XHQkYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRQYnhBcGkuRmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlKHBhcmFtcywgdXBkYXRlUEJYLmNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUpO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdC5tb2RhbCgnc2hvdycpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGxvYWQgZmlsZSBieSBjaHVua3Ncblx0ICogQHBhcmFtIGFjdGlvblxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqL1xuXHRjYlJlc3VtYWJsZVVwbG9hZEZpbGUoYWN0aW9uLCBwYXJhbXMpe1xuXHRcdHN3aXRjaCAoYWN0aW9uKSB7XG5cdFx0XHRjYXNlICdmaWxlU3VjY2Vzcyc6XG5cdFx0XHRcdHVwZGF0ZVBCWC5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAndXBsb2FkU3RhcnQnOlxuXHRcdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyLnNob3coKTtcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRJblByb2dyZXNzKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdwcm9ncmVzcyc6XG5cdFx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuXHRcdFx0XHRcdHBlcmNlbnQ6IHBhcnNlSW50KHBhcmFtcy5wZXJjZW50LCAxMCksXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2Vycm9yJzpcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXG5cblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBXYWl0IGZvciBmaWxlIHJlYWR5IHRvIHVzZVxuXHQgKlxuXHQgKiBAcGFyYW0gcmVzcG9uc2Ug0L7RgtCy0LXRgiDRhNGD0L3QutGG0LjQuCAvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1c1xuXHQgKi9cblx0Y2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IFBieEFwaS50cnlQYXJzZUpTT04ocmVzcG9uc2UpID09PSBmYWxzZSkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3J9YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcblx0XHRpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcn1gKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QgZmlsZUlEID0ganNvbi5kYXRhLnVwbG9hZF9pZDtcblx0XHRjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuaW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKTtcblx0fSxcblxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgc3RhcnQgUEJYIHVwZ3JhZGluZ1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJTdGFydFVwZGF0ZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGdyYWRlRXJyb3IpO1xuXHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBzdGFydCBvbmxpbmUgdXBncmFkZSB3ZSBoYXZlIHRvIHdhaXQgYW4gYW5zd2VyLFxuXHQgKiBhbmQgdGhlbiBzdGFydCBzdGF0dXMgY2hlY2sgd29ya2VyXG5cdCAqL1xuXHRjYkFmdGVyU3RhcnREb3dubG9hZEZpcm13YXJlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlLmZpbGVuYW1lICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUocmVzcG9uc2UuZmlsZW5hbWUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBBZGQgbmV3IGJsb2NrIG9mIHVwZGF0ZSBpbmZvcm1hdGlvbiBvbiBwYWdlXG5cdCAqL1xuXHRhZGROZXdWZXJzaW9uSW5mb3JtYXRpb24ob2JqKSB7XG5cdFx0JCgnI29ubGluZS11cGRhdGVzLWJsb2NrJykuc2hvdygpO1xuXHRcdGxldCBtYXJrZG93blRleHQgPSBkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvPGJyPi9nLCAnXFxyJyk7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoLzxiciA+L2csICdcXHInKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvXFwqIFxcKi9nLCAnKicpO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC9cXCpcXCovZywgJyonKTtcblx0XHRjb25zdCBodG1sID0gdXBkYXRlUEJYLmNvbnZlcnRlci5tYWtlSHRtbChtYXJrZG93blRleHQpO1xuXHRcdGNvbnN0IGR5bWFuaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJ1cGRhdGUtcm93XCI+XG5cdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdDx0ZD4ke2h0bWx9PC90ZD5cblx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHQ8ZGl2IGNsYXNzPVwidWkgc21hbGwgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+XG4gICAgXHRcdFx0PGEgaHJlZj1cIiR7b2JqLmhyZWZ9XCIgY2xhc3M9XCJ1aSBidXR0b24gcmVkbyBwb3B1cGVkXCIgXG4gICAgXHRcdFx0XHRkYXRhLWNvbnRlbnQgPSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBVcGdyYWRlT25saW5lfVwiXG5cdFx0XHRcdFx0ZGF0YS1tZDUgPVwiJHtvYmoubWQ1fVwiIGRhdGEtc2l6ZSA9XCIke29iai5zaXplfVwiXG5cdFx0XHRcdFx0ZGF0YS12ZXJzaW9uID0gXCIke29iai52ZXJzaW9ufVwiID5cblx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdFx0PC9hPlxuXHRcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZCBwb3B1cGVkXCIgXG5cdFx0XHRcdFx0ZGF0YS1jb250ZW50ID0gXCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRG93bmxvYWR9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCI+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+XG5cdFx0XHRcdDwvYT5cbiAgICBcdFx0PC9kaXY+ICAgXG5cdDwvdHI+YDtcblx0XHQkKCcjdXBkYXRlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW1hbmljUm93KTtcblx0XHQkKCdhLnBvcHVwZWQnKS5wb3B1cCgpO1xuXHR9LFxufTtcblxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHVwZGF0ZVBCWC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19