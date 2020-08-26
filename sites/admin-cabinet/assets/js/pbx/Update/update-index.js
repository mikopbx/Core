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
      // Запустим обновление статуса провайдера
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
      PbxApi.SystemGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
      mergingCheckWorker.timeoutHandle = window.setTimeout(mergingCheckWorker.worker, mergingCheckWorker.timeOut);
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(response) {
      if (mergingCheckWorker.errorCounts > 10) {
        mergingCheckWorker.$progressBarLabel.text(globalTranslate.upd_UploadError);
        UserMessage.showError(globalTranslate.upd_UploadError);
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
      PbxApi.SystemGetFirmwareDownloadStatus(upgradeStatusLoopWorker.cbRefreshUpgradeStatus);
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
        UserMessage.showError(globalTranslate.upd_DownloadUpgradeError);
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
                    PbxApi.SystemUploadFile(data, updatePBX.cbResumableUploadFile);
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
                updatePBX.AddNewVersionInformation(obj);
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
                    params.size = $aLink.attr('data-size');
                    $aLink.find('i').addClass('loading');
                    updatePBX.upgradeInProgress = true;
                    PbxApi.SystemDownloadNewFirmware(params, updatePBX.cbAfterStartDownloadFirmware);
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
   * @param response
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
          UserMessage.showError(globalTranslate.upd_UploadError);
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
        UserMessage.showError("".concat(globalTranslate.upd_UploadError));
        return;
      }

      var json = JSON.parse(response);

      if (json === undefined || json.data === undefined) {
        UserMessage.showError("".concat(globalTranslate.upd_UploadError));
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
        UserMessage.showError(globalTranslate.upd_UpgradeError);
      } else {
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
      if (response === true) {
        upgradeStatusLoopWorker.initialize();
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
  AddNewVersionInformation: function () {
    function AddNewVersionInformation(obj) {
      $('#online-updates-block').show();
      var markdownText = decodeURIComponent(obj.description);
      markdownText = markdownText.replace(/<br>/g, '\r');
      markdownText = markdownText.replace(/<br >/g, '\r');
      markdownText = markdownText.replace(/\* \*/g, '*');
      markdownText = markdownText.replace(/\*\*/g, '*');
      var html = updatePBX.converter.makeHtml(markdownText);
      var dymanicRow = "\n\t\t\t<tr class=\"update-row\">\n\t\t\t<td class=\"center aligned\">".concat(obj.version, "</td>\n\t\t\t<td>").concat(html, "</td>\n\t\t\t<td class=\"right aligned collapsing\">\n    \t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t<a href=\"").concat(obj.href, "\" class=\"ui button redo popuped\" \n    \t\t\t\tdata-content = \"").concat(globalTranslate.bt_ToolTipUpgradeOnline, "\"\n\t\t\t\t\tdata-md5 =\"").concat(obj.md5, "\" data-size =\"").concat(obj.size, "\">\n\t\t\t\t\t<i class=\"icon redo blue\"></i>\n\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t</a>\n\t\t\t\t<a href=\"").concat(obj.href, "\" class=\"ui button download popuped\" \n\t\t\t\t\tdata-content = \"").concat(globalTranslate.bt_ToolTipDownload, "\"\n\t\t\t\t\tdata-md5 =\"").concat(obj.md5, "\" data-size =\"").concat(obj.size, "\">\n\t\t\t\t\t<i class=\"icon download blue\"></i>\n\t\t\t\t</a>\n    \t\t</div>   \n\t</tr>");
      $('#updates-table tbody').append(dymanicRow);
      $('a.popuped').popup();
    }

    return AddNewVersionInformation;
  }()
};
$(document).ready(function () {
  updatePBX.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbIm1lcmdpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCIkcHJvZ3Jlc3NCYXJMYWJlbCIsIiQiLCJmaW5kIiwiZmlsZUlEIiwiZmlsZVBhdGgiLCJpbml0aWFsaXplIiwicmVzdGFydFdvcmtlciIsIndpbmRvdyIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJQYnhBcGkiLCJTeXN0ZW1HZXRTdGF0dXNVcGxvYWRGaWxlIiwiY2JBZnRlclJlc3BvbnNlIiwic2V0VGltZW91dCIsInJlc3BvbnNlIiwidGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsInVwZF9VcGxvYWRFcnJvciIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwidXBkYXRlUEJYIiwiJHN1Ym1pdEJ1dHRvbiIsInJlbW92ZUNsYXNzIiwidW5kZWZpbmVkIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsImRfc3RhdHVzIiwidXBkX1VwZ3JhZGVJblByb2dyZXNzIiwiU3lzdGVtVXBncmFkZSIsImNiQWZ0ZXJTdGFydFVwZGF0ZSIsInVwZF9VcGxvYWRJblByb2dyZXNzIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJpdGVyYXRpb25zIiwiU3lzdGVtR2V0RmlybXdhcmVEb3dubG9hZFN0YXR1cyIsImNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMiLCJjbG9zZXN0IiwiZF9zdGF0dXNfcHJvZ3Jlc3MiLCJhZGRDbGFzcyIsInVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvciIsIiRmb3JtT2JqIiwiJHByb2dyZXNzQmFyIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHJlc3RvcmVNb2RhbEZvcm0iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwibW9kYWwiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlcyIsImZpbGVuYW1lIiwibmFtZSIsInBhcmVudCIsInZhbCIsInByZXZlbnREZWZhdWx0IiwiaGFzQ2xhc3MiLCJmb3JtIiwiZmllbGRzIiwidmFsaWRhdGVSdWxlcyIsIm9uU3VjY2VzcyIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwiZGF0YSIsIlN5c3RlbVVwbG9hZEZpbGUiLCJjYlJlc3VtYWJsZVVwbG9hZEZpbGUiLCJyZXF1ZXN0RGF0YSIsIlRZUEUiLCJQQlhWRVIiLCJMQU5HVUFHRSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJzdWNjZXNzVGVzdCIsInJlc3VsdCIsImN1cnJlbnRWZXJpc29uIiwicmVwbGFjZSIsImZpcm13YXJlIiwiZm9yRWFjaCIsIm9iaiIsInZlcnNpb24iLCJwYXJzZUludCIsIkFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbiIsInBhcmFtcyIsIiRhTGluayIsInVwZGF0ZUxpbmsiLCJhdHRyIiwibWQ1Iiwic2l6ZSIsIlN5c3RlbURvd25sb2FkTmV3RmlybXdhcmUiLCJjYkFmdGVyU3RhcnREb3dubG9hZEZpcm13YXJlIiwiYWN0aW9uIiwiY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyIsInNob3ciLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJ0cnlQYXJzZUpTT04iLCJqc29uIiwiSlNPTiIsInBhcnNlIiwidXBsb2FkX2lkIiwidXBkX1VwZ3JhZGVFcnJvciIsIm1hcmtkb3duVGV4dCIsImRlY29kZVVSSUNvbXBvbmVudCIsImRlc2NyaXB0aW9uIiwiaHRtbCIsIm1ha2VIdG1sIiwiZHltYW5pY1JvdyIsImhyZWYiLCJidF9Ub29sVGlwVXBncmFkZU9ubGluZSIsImJ0X1Rvb2xUaXBEb3dubG9hZCIsImFwcGVuZCIsInBvcHVwIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTs7QUFHQSxJQUFNQSxrQkFBa0IsR0FB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LHVDQVFBOUIsR0FBRyxDQUFDUSxHQVJKLDZCQVF3QlIsR0FBRyxDQUFDUyxJQVI1Qix5SUFZSFQsR0FBRyxDQUFDNkIsSUFaRCxrRkFhS25HLGVBQWUsQ0FBQ3FHLGtCQWJyQix1Q0FjQS9CLEdBQUcsQ0FBQ1EsR0FkSiw2QkFjd0JSLEdBQUcsQ0FBQ1MsSUFkNUIsa0dBQWhCO0FBbUJBL0YsTUFBQUEsQ0FBQyxDQUFDLHNCQUFELENBQUQsQ0FBMEJzSCxNQUExQixDQUFpQ0osVUFBakM7QUFDQWxILE1BQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZXVILEtBQWY7QUFDQTs7QUExTWdCO0FBQUE7QUFBQSxDQUFsQjtBQThNQXZILENBQUMsQ0FBQ3dILFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJyRyxFQUFBQSxTQUFTLENBQUNoQixVQUFWO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxQQlhWZXJzaW9uLCBnbG9iYWxUcmFuc2xhdGUsXG5nbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxQQlhWZXJzaW9uLCBzaG93ZG93biwgVXNlck1lc3NhZ2UgKi9cblxuY29uc3QgbWVyZ2luZ0NoZWNrV29ya2VyID0ge1xuXHR0aW1lT3V0OiAzMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0ZXJyb3JDb3VudHM6IDAsXG5cdCRwcm9ncmVzc0JhckxhYmVsOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLmZpbmQoJy5sYWJlbCcpLFxuXHRmaWxlSUQ6IG51bGwsXG5cdGZpbGVQYXRoOiAnJyxcblx0aW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKSB7XG5cdFx0Ly8g0JfQsNC/0YPRgdGC0LjQvCDQvtCx0L3QvtCy0LvQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQv9GA0L7QstCw0LnQtNC10YDQsFxuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5maWxlSUQgPSBmaWxlSUQ7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVQYXRoID0gZmlsZVBhdGg7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnJlc3RhcnRXb3JrZXIoZmlsZUlEKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHRQYnhBcGkuU3lzdGVtR2V0U3RhdHVzVXBsb2FkRmlsZShtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZUlELCBtZXJnaW5nQ2hlY2tXb3JrZXIuY2JBZnRlclJlc3BvbnNlKTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSA9IHdpbmRvdy5zZXRUaW1lb3V0KFxuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLndvcmtlcixcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci50aW1lT3V0LFxuXHRcdCk7XG5cdH0sXG5cdGNiQWZ0ZXJSZXNwb25zZShyZXNwb25zZSkge1xuXHRcdGlmIChtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPiAxMCkge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG5cdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dChtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0fVxuXHRcdGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPT09IDApIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyArPSAxO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdVUExPQURfQ09NUExFVEUnKSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwZ3JhZGVJblByb2dyZXNzKTtcblx0XHRcdFBieEFwaS5TeXN0ZW1VcGdyYWRlKG1lcmdpbmdDaGVja1dvcmtlci5maWxlUGF0aCwgdXBkYXRlUEJYLmNiQWZ0ZXJTdGFydFVwZGF0ZSk7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkSW5Qcm9ncmVzcyk7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPSAwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgKz0gMTtcblx0XHR9XG5cdH0sXG59O1xuXG5cbmNvbnN0IHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyID0ge1xuXHR0aW1lT3V0OiAxMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0aXRlcmF0aW9uczogMCxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pdGVyYXRpb25zID0gMDtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci53b3JrZXIoKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0UGJ4QXBpLlN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXModXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuY2JSZWZyZXNoVXBncmFkZVN0YXR1cyk7XG5cdH0sXG5cdGNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMocmVzcG9uc2UpIHtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pdGVyYXRpb25zICs9IDE7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSA9XG5cdFx0XHR3aW5kb3cuc2V0VGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci53b3JrZXIsIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVPdXQpO1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0aWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnRE9XTkxPQURfSU5fUFJPR1JFU1MnKSB7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmNsb3Nlc3QoJ2EnKS5maW5kKCcucGVyY2VudCcpLnRleHQoYCR7cmVzcG9uc2UuZF9zdGF0dXNfcHJvZ3Jlc3N9JWApO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9DT01QTEVURScpIHtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmNsb3Nlc3QoJ2EnKS5maW5kKCcucGVyY2VudCcpLnRleHQoYCR7cmVzcG9uc2UuZF9zdGF0dXNfcHJvZ3Jlc3N9JWApO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5hZGRDbGFzcygnc3luYycpLnJlbW92ZUNsYXNzKCdyZWRvJyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtVXBncmFkZShyZXNwb25zZS5maWxlUGF0aCwgdXBkYXRlUEJYLmNiQWZ0ZXJTdGFydFVwZGF0ZSk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0VSUk9SJykge1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUudXBkX0Rvd25sb2FkVXBncmFkZUVycm9yKTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuYWRkQ2xhc3MoJ3JlZG8nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH1cblx0fSxcbn07XG5cblxuY29uc3QgdXBkYXRlUEJYID0ge1xuXHQkZm9ybU9iajogJCgnI3VwZ3JhZGUtZm9ybScpLFxuXHQkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG5cdCRwcm9ncmVzc0JhcjogJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKSxcblx0JHByb2dyZXNzQmFyTGFiZWw6ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyJykuZmluZCgnLmxhYmVsJyksXG5cdGN1cnJlbnRWZXJzaW9uOiBnbG9iYWxQQlhWZXJzaW9uLFxuXHQkcmVzdG9yZU1vZGFsRm9ybTogJCgnI3VwZGF0ZS1tb2RhbC1mb3JtJyksXG5cdHVwZ3JhZGVJblByb2dyZXNzOiBmYWxzZSxcblx0Y29udmVydGVyOiBuZXcgc2hvd2Rvd24uQ29udmVydGVyKCksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0dXBkYXRlUEJYLiRyZXN0b3JlTW9kYWxGb3JtLm1vZGFsKCk7XG5cdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0JCgnaW5wdXQ6dGV4dCwgLnVpLmJ1dHRvbicsICcudWkuYWN0aW9uLmlucHV0Jykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdCQoJ2lucHV0OmZpbGUnLCAkKGUudGFyZ2V0KS5wYXJlbnRzKCkpLmNsaWNrKCk7XG5cdFx0fSk7XG5cblx0XHQkKCdpbnB1dDpmaWxlJywgJy51aS5hY3Rpb24uaW5wdXQnKS5vbignY2hhbmdlJywgKGUpID0+IHtcblx0XHRcdGlmIChlLnRhcmdldC5maWxlc1swXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGNvbnN0IGZpbGVuYW1lID0gZS50YXJnZXQuZmlsZXNbMF0ubmFtZTtcblx0XHRcdFx0JCgnaW5wdXQ6dGV4dCcsICQoZS50YXJnZXQpLnBhcmVudCgpKS52YWwoZmlsZW5hbWUpO1xuXHRcdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0aWYgKHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykgfHwgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzKSByZXR1cm47XG5cblx0XHRcdHVwZGF0ZVBCWC4kZm9ybU9ialxuXHRcdFx0XHQuZm9ybSh7XG5cdFx0XHRcdFx0b246ICdibHVyJyxcblx0XHRcdFx0XHRmaWVsZHM6IHVwZGF0ZVBCWC52YWxpZGF0ZVJ1bGVzLFxuXHRcdFx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVBCWC4kcmVzdG9yZU1vZGFsRm9ybVxuXHRcdFx0XHRcdFx0XHQubW9kYWwoe1xuXHRcdFx0XHRcdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0XHRvbkRlbnk6ICgpID0+IHRydWUsXG5cdFx0XHRcdFx0XHRcdFx0b25BcHByb3ZlOiAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGRhdGEgPSAkKCdpbnB1dDpmaWxlJylbMF0uZmlsZXNbMF07XG5cdFx0XHRcdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtVXBsb2FkRmlsZShkYXRhLHVwZGF0ZVBCWC5jYlJlc3VtYWJsZVVwbG9hZEZpbGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0Lm1vZGFsKCdzaG93Jyk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSk7XG5cdFx0XHR1cGRhdGVQQlguJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuXHRcdH0pO1xuXHRcdGNvbnN0IHJlcXVlc3REYXRhID0ge1xuXHRcdFx0VFlQRTogJ0ZJUk1XQVJFJyxcblx0XHRcdFBCWFZFUjogZ2xvYmFsUEJYVmVyc2lvbixcblx0XHRcdExBTkdVQUdFOiBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLFxuXHRcdH07XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiAnaHR0cHM6Ly91cGRhdGUuYXNrb3ppYS5ydScsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0c3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcblx0XHRcdFx0Ly8gdGVzdCB3aGV0aGVyIGEgSlNPTiByZXNwb25zZSBpcyB2YWxpZFxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSAnU1VDQ0VTUyc7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRWZXJpc29uID0gdXBkYXRlUEJYLmN1cnJlbnRWZXJzaW9uLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cdFx0XHRcdHJlc3BvbnNlLmZpcm13YXJlLmZvckVhY2goKG9iaikgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHZlcnNpb24gPSBvYmoudmVyc2lvbi5yZXBsYWNlKC9cXEQvZywgJycpO1xuXHRcdFx0XHRcdGlmIChwYXJzZUludCh2ZXJzaW9uLCAxMCkgPiBwYXJzZUludChjdXJyZW50VmVyaXNvbiwgMTApKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVQQlguQWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkKCdhLnJlZG8nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcblx0XHRcdFx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm1cblx0XHRcdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0b25EZW55OiAoKSA9PiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBwYXJhbXMgPSBbXTtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnVwZGF0ZUxpbmsgPSAkYUxpbmsuYXR0cignaHJlZicpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy5tZDUgPSAkYUxpbmsuYXR0cignZGF0YS1tZDUnKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdFx0XHRcdFx0XHQkYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZShwYXJhbXMsIHVwZGF0ZVBCWC5jYkFmdGVyU3RhcnREb3dubG9hZEZpcm13YXJlKTtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogVXBsb2FkIGZpbGUgYnkgY2h1bmtzXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JSZXN1bWFibGVVcGxvYWRGaWxlKGFjdGlvbiwgcGFyYW1zKXtcblx0XHRzd2l0Y2ggKGFjdGlvbikge1xuXHRcdFx0Y2FzZSAnZmlsZVN1Y2Nlc3MnOlxuXHRcdFx0XHR1cGRhdGVQQlguY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhwYXJhbXMucmVzcG9uc2UpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3VwbG9hZFN0YXJ0Jzpcblx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0Jhci5zaG93KCk7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkSW5Qcm9ncmVzcyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAncHJvZ3Jlc3MnOlxuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcblx0XHRcdFx0XHRwZXJjZW50OiBwYXJzZUludChwYXJhbXMucGVyY2VudCwgMTApLFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdlcnJvcic6XG5cdFx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuXHRcdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblxuXG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogV2FpdCBmb3IgZmlsZSByZWFkeSB0byB1c2Vcblx0ICpcblx0ICogQHBhcmFtIHJlc3BvbnNlINC+0YLQstC10YIg0YTRg9C90LrRhtC40LggL3BieGNvcmUvYXBpL3VwbG9hZC9zdGF0dXNcblx0ICovXG5cdGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBQYnhBcGkudHJ5UGFyc2VKU09OKHJlc3BvbnNlKSA9PT0gZmFsc2UpIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihgJHtnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yfWApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG5cdFx0aWYgKGpzb24gPT09IHVuZGVmaW5lZCB8fCBqc29uLmRhdGEgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3J9YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IGZpbGVJRCA9IGpzb24uZGF0YS51cGxvYWRfaWQ7XG5cdFx0Y29uc3QgZmlsZVBhdGggPSBqc29uLmRhdGEuZmlsZW5hbWU7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmluaXRpYWxpemUoZmlsZUlELCBmaWxlUGF0aCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIENhbGxiYWNrIGFmdGVyIHN0YXJ0IFBCWCB1cGdyYWRpbmdcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkFmdGVyU3RhcnRVcGRhdGUocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBncmFkZUVycm9yKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBzdGFydCBvbmxpbmUgdXBncmFkZSB3ZSBoYXZlIHRvIHdhaXQgYW4gYW5zd2VyLFxuXHQgKiBhbmQgdGhlbiBzdGFydCBzdGF0dXMgY2hlY2sgd29ya2VyXG5cdCAqL1xuXHRjYkFmdGVyU3RhcnREb3dubG9hZEZpcm13YXJlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG5cdFx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIEFkZCBuZXcgYmxvY2sgb2YgdXBkYXRlIGluZm9ybWF0aW9uIG9uIHBhZ2Vcblx0ICovXG5cdEFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbihvYmopIHtcblx0XHQkKCcjb25saW5lLXVwZGF0ZXMtYmxvY2snKS5zaG93KCk7XG5cdFx0bGV0IG1hcmtkb3duVGV4dCA9IGRlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnI+L2csICdcXHInKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvPGJyID4vZywgJ1xccicpO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC9cXCogXFwqL2csICcqJyk7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKlxcKi9nLCAnKicpO1xuXHRcdGNvbnN0IGh0bWwgPSB1cGRhdGVQQlguY29udmVydGVyLm1ha2VIdG1sKG1hcmtkb3duVGV4dCk7XG5cdFx0Y29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cInVwZGF0ZS1yb3dcIj5cblx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0PHRkPiR7aHRtbH08L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiByZWRvIHBvcHVwZWRcIiBcbiAgICBcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmV9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCI+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdDwvYT5cblx0XHRcdFx0PGEgaHJlZj1cIiR7b2JqLmhyZWZ9XCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWQgcG9wdXBlZFwiIFxuXHRcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERvd25sb2FkfVwiXG5cdFx0XHRcdFx0ZGF0YS1tZDUgPVwiJHtvYmoubWQ1fVwiIGRhdGEtc2l6ZSA9XCIke29iai5zaXplfVwiPlxuXHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPlxuXHRcdFx0XHQ8L2E+XG4gICAgXHRcdDwvZGl2PiAgIFxuXHQ8L3RyPmA7XG5cdFx0JCgnI3VwZGF0ZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdFx0JCgnYS5wb3B1cGVkJykucG9wdXAoKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHR1cGRhdGVQQlguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==