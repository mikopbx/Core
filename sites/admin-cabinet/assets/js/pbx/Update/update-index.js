"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbIm1lcmdpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCIkcHJvZ3Jlc3NCYXJMYWJlbCIsIiQiLCJmaW5kIiwiZmlsZUlEIiwiZmlsZVBhdGgiLCJpbml0aWFsaXplIiwicmVzdGFydFdvcmtlciIsIndpbmRvdyIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJQYnhBcGkiLCJGaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUiLCJjYkFmdGVyUmVzcG9uc2UiLCJzZXRUaW1lb3V0IiwicmVzcG9uc2UiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidXBkX1VwbG9hZEVycm9yIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJ1cGRhdGVQQlgiLCIkc3VibWl0QnV0dG9uIiwicmVtb3ZlQ2xhc3MiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiZF9zdGF0dXMiLCJ1cGRfVXBncmFkZUluUHJvZ3Jlc3MiLCJTeXN0ZW1VcGdyYWRlIiwiY2JBZnRlclN0YXJ0VXBkYXRlIiwidXBkX1VwbG9hZEluUHJvZ3Jlc3MiLCJ1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciIsIml0ZXJhdGlvbnMiLCJmaWxlbmFtZSIsIkZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyIsImNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMiLCJjbG9zZXN0IiwiZF9zdGF0dXNfcHJvZ3Jlc3MiLCJhZGRDbGFzcyIsInVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvciIsIiRmb3JtT2JqIiwiJHByb2dyZXNzQmFyIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHJlc3RvcmVNb2RhbEZvcm0iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwibW9kYWwiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlcyIsIm5hbWUiLCJwYXJlbnQiLCJ2YWwiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZm9ybSIsImZpZWxkcyIsInZhbGlkYXRlUnVsZXMiLCJvblN1Y2Nlc3MiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImRhdGEiLCJGaWxlc1VwbG9hZEZpbGUiLCJjYlJlc3VtYWJsZVVwbG9hZEZpbGUiLCJyZXF1ZXN0RGF0YSIsIlRZUEUiLCJQQlhWRVIiLCJMQU5HVUFHRSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJzdWNjZXNzVGVzdCIsInJlc3VsdCIsImN1cnJlbnRWZXJpc29uIiwicmVwbGFjZSIsImZpcm13YXJlIiwiZm9yRWFjaCIsIm9iaiIsInZlcnNpb24iLCJwYXJzZUludCIsImFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbiIsInBhcmFtcyIsIiRhTGluayIsInVwZGF0ZUxpbmsiLCJhdHRyIiwibWQ1Iiwic2l6ZSIsIkZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsImNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUiLCJhY3Rpb24iLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwic2hvdyIsInByb2dyZXNzIiwicGVyY2VudCIsInRyeVBhcnNlSlNPTiIsImpzb24iLCJKU09OIiwicGFyc2UiLCJ1cGxvYWRfaWQiLCJ1cGRfVXBncmFkZUVycm9yIiwibWFya2Rvd25UZXh0IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZGVzY3JpcHRpb24iLCJodG1sIiwibWFrZUh0bWwiLCJkeW1hbmljUm93IiwiaHJlZiIsImJ0X1Rvb2xUaXBVcGdyYWRlT25saW5lIiwiYnRfVG9vbFRpcERvd25sb2FkIiwiYXBwZW5kIiwicG9wdXAiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBOztBQUdBLElBQU1BLGtCQUFrQixHQUFH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QixFQUE4QixHQUE5QixDQUFmO0FBQ0EsVUFBTTZCLElBQUksR0FBRzVGLFNBQVMsQ0FBQzJCLFNBQVYsQ0FBb0JrRSxRQUFwQixDQUE2QkosWUFBN0IsQ0FBYjtBQUNBLFVBQU1LLFVBQVUsbUZBRWM1QixHQUFHLENBQUNDLE9BRmxCLDhCQUdUeUIsSUFIUywySkFNQTFCLEdBQUcsQ0FBQzZCLElBTkosZ0ZBT1FuRyxlQUFlLENBQUNvRyx1QkFQeEIsdUNBUUE5QixHQUFHLENBQUNRLEdBUkosNkJBUXdCUixHQUFHLENBQUNTLElBUjVCLDRDQVNLVCxHQUFHLENBQUNDLE9BVFQsMElBYUhELEdBQUcsQ0FBQzZCLElBYkQsa0ZBY0tuRyxlQUFlLENBQUNxRyxrQkFkckIsdUNBZUEvQixHQUFHLENBQUNRLEdBZkosNkJBZXdCUixHQUFHLENBQUNTLElBZjVCLGtHQUFoQjtBQW9CQS9GLE1BQUFBLENBQUMsQ0FBQyxzQkFBRCxDQUFELENBQTBCc0gsTUFBMUIsQ0FBaUNKLFVBQWpDO0FBQ0FsSCxNQUFBQSxDQUFDLENBQUMsV0FBRCxDQUFELENBQWV1SCxLQUFmO0FBQ0E7O0FBNU1nQjtBQUFBO0FBQUEsQ0FBbEI7QUFnTkF2SCxDQUFDLENBQUN3SCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCckcsRUFBQUEsU0FBUyxDQUFDaEIsVUFBVjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsUEJYVmVyc2lvbiwgZ2xvYmFsVHJhbnNsYXRlLFxuZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgc2hvd2Rvd24sIFVzZXJNZXNzYWdlICovXG5cbmNvbnN0IG1lcmdpbmdDaGVja1dvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGVycm9yQ291bnRzOiAwLFxuXHQkcHJvZ3Jlc3NCYXJMYWJlbDogJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKS5maW5kKCcubGFiZWwnKSxcblx0ZmlsZUlEOiBudWxsLFxuXHRmaWxlUGF0aDogJycsXG5cdGluaXRpYWxpemUoZmlsZUlELCBmaWxlUGF0aCkge1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5maWxlSUQgPSBmaWxlSUQ7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVQYXRoID0gZmlsZVBhdGg7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnJlc3RhcnRXb3JrZXIoZmlsZUlEKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHRQYnhBcGkuRmlsZXNHZXRTdGF0dXNVcGxvYWRGaWxlKG1lcmdpbmdDaGVja1dvcmtlci5maWxlSUQsIG1lcmdpbmdDaGVja1dvcmtlci5jYkFmdGVyUmVzcG9uc2UpO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIud29ya2VyLFxuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVPdXQsXG5cdFx0KTtcblx0fSxcblx0Y2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyA+IDEwKSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcblx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzICs9IDE7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ1VQTE9BRF9DT01QTEVURScpIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBncmFkZUluUHJvZ3Jlc3MpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVVwZ3JhZGUobWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVQYXRoLCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0VXBkYXRlKTtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQobWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRJblByb2dyZXNzKTtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyA9IDA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyArPSAxO1xuXHRcdH1cblx0fSxcbn07XG5cblxuY29uc3QgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDEwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHRpdGVyYXRpb25zOiAwLFxuXHRmaWxlbmFtZTogJycsXG5cdGluaXRpYWxpemUoZmlsZW5hbWUpIHtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5maWxlbmFtZSA9IGZpbGVuYW1lO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLml0ZXJhdGlvbnMgPSAwO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRQYnhBcGkuRmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzKHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmZpbGVuYW1lLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5jYlJlZnJlc2hVcGdyYWRlU3RhdHVzKTtcblx0fSxcblx0Y2JSZWZyZXNoVXBncmFkZVN0YXR1cyhyZXNwb25zZSkge1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLml0ZXJhdGlvbnMgKz0gMTtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlID1cblx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLndvcmtlciwgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZU91dCk7XG5cdFx0aWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCB8fCByZXNwb25zZSA9PT0gZmFsc2UpIHJldHVybjtcblx0XHRpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9JTl9QUk9HUkVTUycpIHtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuY2xvc2VzdCgnYScpLmZpbmQoJy5wZXJjZW50JykudGV4dChgJHtyZXNwb25zZS5kX3N0YXR1c19wcm9ncmVzc30lYCk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0NPTVBMRVRFJykge1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuY2xvc2VzdCgnYScpLmZpbmQoJy5wZXJjZW50JykudGV4dChgJHtyZXNwb25zZS5kX3N0YXR1c19wcm9ncmVzc30lYCk7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmFkZENsYXNzKCdzeW5jJykucmVtb3ZlQ2xhc3MoJ3JlZG8nKTtcblx0XHRcdFBieEFwaS5TeXN0ZW1VcGdyYWRlKHJlc3BvbnNlLmZpbGVQYXRoLCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0VXBkYXRlKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnRE9XTkxPQURfRVJST1InKSB7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS51cGRfRG93bmxvYWRVcGdyYWRlRXJyb3IpO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5hZGRDbGFzcygncmVkbycpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fVxuXHR9LFxufTtcblxuXG5jb25zdCB1cGRhdGVQQlggPSB7XG5cdCRmb3JtT2JqOiAkKCcjdXBncmFkZS1mb3JtJyksXG5cdCRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblx0JHByb2dyZXNzQmFyOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLFxuXHQkcHJvZ3Jlc3NCYXJMYWJlbDogJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKS5maW5kKCcubGFiZWwnKSxcblx0Y3VycmVudFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24sXG5cdCRyZXN0b3JlTW9kYWxGb3JtOiAkKCcjdXBkYXRlLW1vZGFsLWZvcm0nKSxcblx0dXBncmFkZUluUHJvZ3Jlc3M6IGZhbHNlLFxuXHRjb252ZXJ0ZXI6IG5ldyBzaG93ZG93bi5Db252ZXJ0ZXIoKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm0ubW9kYWwoKTtcblx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHQkKCdpbnB1dDp0ZXh0LCAudWkuYnV0dG9uJywgJy51aS5hY3Rpb24uaW5wdXQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0JCgnaW5wdXQ6ZmlsZScsICQoZS50YXJnZXQpLnBhcmVudHMoKSkuY2xpY2soKTtcblx0XHR9KTtcblxuXHRcdCQoJ2lucHV0OmZpbGUnLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuXHRcdFx0aWYgKGUudGFyZ2V0LmZpbGVzWzBdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y29uc3QgZmlsZW5hbWUgPSBlLnRhcmdldC5maWxlc1swXS5uYW1lO1xuXHRcdFx0XHQkKCdpbnB1dDp0ZXh0JywgJChlLnRhcmdldCkucGFyZW50KCkpLnZhbChmaWxlbmFtZSk7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcblxuXHRcdFx0dXBkYXRlUEJYLiRmb3JtT2JqXG5cdFx0XHRcdC5mb3JtKHtcblx0XHRcdFx0XHRvbjogJ2JsdXInLFxuXHRcdFx0XHRcdGZpZWxkczogdXBkYXRlUEJYLnZhbGlkYXRlUnVsZXMsXG5cdFx0XHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRcdFx0dXBkYXRlUEJYLiRyZXN0b3JlTW9kYWxGb3JtXG5cdFx0XHRcdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0XHRcdFx0Y2xvc2FibGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRcdG9uRGVueTogKCkgPT4gdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgZGF0YSA9ICQoJ2lucHV0OmZpbGUnKVswXS5maWxlc1swXTtcblx0XHRcdFx0XHRcdFx0XHRcdFBieEFwaS5GaWxlc1VwbG9hZEZpbGUoZGF0YSx1cGRhdGVQQlguY2JSZXN1bWFibGVVcGxvYWRGaWxlKTtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdC5tb2RhbCgnc2hvdycpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0dXBkYXRlUEJYLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcblx0XHR9KTtcblx0XHRjb25zdCByZXF1ZXN0RGF0YSA9IHtcblx0XHRcdFRZUEU6ICdGSVJNV0FSRScsXG5cdFx0XHRQQlhWRVI6IGdsb2JhbFBCWFZlcnNpb24sXG5cdFx0XHRMQU5HVUFHRTogZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSxcblx0XHR9O1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogJ2h0dHBzOi8vdXBkYXRlLmFza296aWEucnUnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiByZXF1ZXN0RGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gJ1NVQ0NFU1MnO1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjb25zdCBjdXJyZW50VmVyaXNvbiA9IHVwZGF0ZVBCWC5jdXJyZW50VmVyc2lvbi5yZXBsYWNlKC9cXEQvZywgJycpO1xuXHRcdFx0XHRyZXNwb25zZS5maXJtd2FyZS5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdFx0XHRjb25zdCB2ZXJzaW9uID0gb2JqLnZlcnNpb24ucmVwbGFjZSgvXFxEL2csICcnKTtcblx0XHRcdFx0XHRpZiAocGFyc2VJbnQodmVyc2lvbiwgMTApID4gcGFyc2VJbnQoY3VycmVudFZlcmlzb24sIDEwKSkge1xuXHRcdFx0XHRcdFx0dXBkYXRlUEJYLmFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbihvYmopO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0JCgnYS5yZWRvJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0aWYgKHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykgfHwgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzKSByZXR1cm47XG5cdFx0XHRcdFx0dXBkYXRlUEJYLiRyZXN0b3JlTW9kYWxGb3JtXG5cdFx0XHRcdFx0XHQubW9kYWwoe1xuXHRcdFx0XHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdG9uRGVueTogKCkgPT4gdHJ1ZSxcblx0XHRcdFx0XHRcdFx0b25BcHByb3ZlOiAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgcGFyYW1zID0gW107XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy51cGRhdGVMaW5rID0gJGFMaW5rLmF0dHIoJ2hyZWYnKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMubWQ1ID0gJGFMaW5rLmF0dHIoJ2RhdGEtbWQ1Jyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnZlcnNpb24gPSAkYUxpbmsuYXR0cignZGF0YS12ZXJzaW9uJyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnNpemUgPSAkYUxpbmsuYXR0cignZGF0YS1zaXplJyk7XG5cdFx0XHRcdFx0XHRcdFx0JGFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0UGJ4QXBpLkZpbGVzRG93bmxvYWROZXdGaXJtd2FyZShwYXJhbXMsIHVwZGF0ZVBCWC5jYkFmdGVyU3RhcnREb3dubG9hZEZpcm13YXJlKTtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogVXBsb2FkIGZpbGUgYnkgY2h1bmtzXG5cdCAqIEBwYXJhbSBhY3Rpb25cblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKi9cblx0Y2JSZXN1bWFibGVVcGxvYWRGaWxlKGFjdGlvbiwgcGFyYW1zKXtcblx0XHRzd2l0Y2ggKGFjdGlvbikge1xuXHRcdFx0Y2FzZSAnZmlsZVN1Y2Nlc3MnOlxuXHRcdFx0XHR1cGRhdGVQQlguY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhwYXJhbXMucmVzcG9uc2UpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3VwbG9hZFN0YXJ0Jzpcblx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0Jhci5zaG93KCk7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkSW5Qcm9ncmVzcyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAncHJvZ3Jlc3MnOlxuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcblx0XHRcdFx0XHRwZXJjZW50OiBwYXJzZUludChwYXJhbXMucGVyY2VudCwgMTApLFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdlcnJvcic6XG5cdFx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuXHRcdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblxuXG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogV2FpdCBmb3IgZmlsZSByZWFkeSB0byB1c2Vcblx0ICpcblx0ICogQHBhcmFtIHJlc3BvbnNlINC+0YLQstC10YIg0YTRg9C90LrRhtC40LggL3BieGNvcmUvYXBpL3VwbG9hZC9zdGF0dXNcblx0ICovXG5cdGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBQYnhBcGkudHJ5UGFyc2VKU09OKHJlc3BvbnNlKSA9PT0gZmFsc2UpIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yfWApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG5cdFx0aWYgKGpzb24gPT09IHVuZGVmaW5lZCB8fCBqc29uLmRhdGEgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3J9YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IGZpbGVJRCA9IGpzb24uZGF0YS51cGxvYWRfaWQ7XG5cdFx0Y29uc3QgZmlsZVBhdGggPSBqc29uLmRhdGEuZmlsZW5hbWU7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmluaXRpYWxpemUoZmlsZUlELCBmaWxlUGF0aCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIENhbGxiYWNrIGFmdGVyIHN0YXJ0IFBCWCB1cGdyYWRpbmdcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkFmdGVyU3RhcnRVcGRhdGUocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBncmFkZUVycm9yKTtcblx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgc3RhcnQgb25saW5lIHVwZ3JhZGUgd2UgaGF2ZSB0byB3YWl0IGFuIGFuc3dlcixcblx0ICogYW5kIHRoZW4gc3RhcnQgc3RhdHVzIGNoZWNrIHdvcmtlclxuXHQgKi9cblx0Y2JBZnRlclN0YXJ0RG93bmxvYWRGaXJtd2FyZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5maWxlbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKHJlc3BvbnNlLmZpbGVuYW1lKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogQWRkIG5ldyBibG9jayBvZiB1cGRhdGUgaW5mb3JtYXRpb24gb24gcGFnZVxuXHQgKi9cblx0YWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaikge1xuXHRcdCQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcblx0XHRsZXQgbWFya2Rvd25UZXh0ID0gZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXNjcmlwdGlvbik7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoLzxicj4vZywgJ1xccicpO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnIgPi9nLCAnXFxyJyk7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKiBcXCovZywgJyonKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvXFwqXFwqL2csICcqJyk7XG5cdFx0Y29uc3QgaHRtbCA9IHVwZGF0ZVBCWC5jb252ZXJ0ZXIubWFrZUh0bWwobWFya2Rvd25UZXh0KTtcblx0XHRjb25zdCBkeW1hbmljUm93ID0gYFxuXHRcdFx0PHRyIGNsYXNzPVwidXBkYXRlLXJvd1wiPlxuXHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke29iai52ZXJzaW9ufTwvdGQ+XG5cdFx0XHQ8dGQ+JHtodG1sfTwvdGQ+XG5cdFx0XHQ8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICBcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdDxhIGhyZWY9XCIke29iai5ocmVmfVwiIGNsYXNzPVwidWkgYnV0dG9uIHJlZG8gcG9wdXBlZFwiIFxuICAgIFx0XHRcdFx0ZGF0YS1jb250ZW50ID0gXCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwVXBncmFkZU9ubGluZX1cIlxuXHRcdFx0XHRcdGRhdGEtbWQ1ID1cIiR7b2JqLm1kNX1cIiBkYXRhLXNpemUgPVwiJHtvYmouc2l6ZX1cIlxuXHRcdFx0XHRcdGRhdGEtdmVyc2lvbiA9IFwiJHtvYmoudmVyc2lvbn1cIiA+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdDwvYT5cblx0XHRcdFx0PGEgaHJlZj1cIiR7b2JqLmhyZWZ9XCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWQgcG9wdXBlZFwiIFxuXHRcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERvd25sb2FkfVwiXG5cdFx0XHRcdFx0ZGF0YS1tZDUgPVwiJHtvYmoubWQ1fVwiIGRhdGEtc2l6ZSA9XCIke29iai5zaXplfVwiPlxuXHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPlxuXHRcdFx0XHQ8L2E+XG4gICAgXHRcdDwvZGl2PiAgIFxuXHQ8L3RyPmA7XG5cdFx0JCgnI3VwZGF0ZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdFx0JCgnYS5wb3B1cGVkJykucG9wdXAoKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHR1cGRhdGVQQlguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==