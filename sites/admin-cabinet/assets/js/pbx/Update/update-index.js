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
      PbxApi.SystemGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbIm1lcmdpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCIkcHJvZ3Jlc3NCYXJMYWJlbCIsIiQiLCJmaW5kIiwiZmlsZUlEIiwiZmlsZVBhdGgiLCJpbml0aWFsaXplIiwicmVzdGFydFdvcmtlciIsIndpbmRvdyIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJQYnhBcGkiLCJTeXN0ZW1HZXRTdGF0dXNVcGxvYWRGaWxlIiwiY2JBZnRlclJlc3BvbnNlIiwic2V0VGltZW91dCIsInJlc3BvbnNlIiwidGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsInVwZF9VcGxvYWRFcnJvciIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwidXBkYXRlUEJYIiwiJHN1Ym1pdEJ1dHRvbiIsInJlbW92ZUNsYXNzIiwidW5kZWZpbmVkIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsImRfc3RhdHVzIiwidXBkX1VwZ3JhZGVJblByb2dyZXNzIiwiU3lzdGVtVXBncmFkZSIsImNiQWZ0ZXJTdGFydFVwZGF0ZSIsInVwZF9VcGxvYWRJblByb2dyZXNzIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJpdGVyYXRpb25zIiwiU3lzdGVtR2V0RmlybXdhcmVEb3dubG9hZFN0YXR1cyIsImNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMiLCJjbG9zZXN0IiwiZF9zdGF0dXNfcHJvZ3Jlc3MiLCJhZGRDbGFzcyIsInVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvciIsIiRmb3JtT2JqIiwiJHByb2dyZXNzQmFyIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHJlc3RvcmVNb2RhbEZvcm0iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwibW9kYWwiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlcyIsImZpbGVuYW1lIiwibmFtZSIsInBhcmVudCIsInZhbCIsInByZXZlbnREZWZhdWx0IiwiaGFzQ2xhc3MiLCJmb3JtIiwiZmllbGRzIiwidmFsaWRhdGVSdWxlcyIsIm9uU3VjY2VzcyIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwiZGF0YSIsIlN5c3RlbVVwbG9hZEZpbGUiLCJjYlJlc3VtYWJsZVVwbG9hZEZpbGUiLCJyZXF1ZXN0RGF0YSIsIlRZUEUiLCJQQlhWRVIiLCJMQU5HVUFHRSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJzdWNjZXNzVGVzdCIsInJlc3VsdCIsImN1cnJlbnRWZXJpc29uIiwicmVwbGFjZSIsImZpcm13YXJlIiwiZm9yRWFjaCIsIm9iaiIsInZlcnNpb24iLCJwYXJzZUludCIsIkFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbiIsInBhcmFtcyIsIiRhTGluayIsInVwZGF0ZUxpbmsiLCJhdHRyIiwibWQ1Iiwic2l6ZSIsIlN5c3RlbURvd25sb2FkTmV3RmlybXdhcmUiLCJjYkFmdGVyU3RhcnREb3dubG9hZEZpcm13YXJlIiwiYWN0aW9uIiwiY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyIsInNob3ciLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJ0cnlQYXJzZUpTT04iLCJqc29uIiwiSlNPTiIsInBhcnNlIiwidXBsb2FkX2lkIiwidXBkX1VwZ3JhZGVFcnJvciIsIm1hcmtkb3duVGV4dCIsImRlY29kZVVSSUNvbXBvbmVudCIsImRlc2NyaXB0aW9uIiwiaHRtbCIsIm1ha2VIdG1sIiwiZHltYW5pY1JvdyIsImhyZWYiLCJidF9Ub29sVGlwVXBncmFkZU9ubGluZSIsImJ0X1Rvb2xUaXBEb3dubG9hZCIsImFwcGVuZCIsInBvcHVwIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTs7QUFHQSxJQUFNQSxrQkFB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LHVDQVFBOUIsR0FBRyxDQUFDUSxHQVJKLDZCQVF3QlIsR0FBRyxDQUFDUyxJQVI1Qix5SUFZSFQsR0FBRyxDQUFDNkIsSUFaRCxrRkFhS25HLGVBQWUsQ0FBQ3FHLGtCQWJyQix1Q0FjQS9CLEdBQUcsQ0FBQ1EsR0FkSiw2QkFjd0JSLEdBQUcsQ0FBQ1MsSUFkNUIsa0dBQWhCO0FBbUJBL0YsTUFBQUEsQ0FBQyxDQUFDLHNCQUFELENBQUQsQ0FBMEJzSCxNQUExQixDQUFpQ0osVUFBakM7QUFDQWxILE1BQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZXVILEtBQWY7QUFDQTs7QUExTWdCO0FBQUE7QUFBQSxDQUFsQjtBQThNQXZILENBQUMsQ0FBQ3dILFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJyRyxFQUFBQSxTQUFTLENBQUNoQixVQUFWO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxQQlhWZXJzaW9uLCBnbG9iYWxUcmFuc2xhdGUsXG5nbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxQQlhWZXJzaW9uLCBzaG93ZG93biwgVXNlck1lc3NhZ2UgKi9cblxuY29uc3QgbWVyZ2luZ0NoZWNrV29ya2VyID0ge1xuXHR0aW1lT3V0OiAzMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0ZXJyb3JDb3VudHM6IDAsXG5cdCRwcm9ncmVzc0JhckxhYmVsOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLmZpbmQoJy5sYWJlbCcpLFxuXHRmaWxlSUQ6IG51bGwsXG5cdGZpbGVQYXRoOiAnJyxcblx0aW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKSB7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVJRCA9IGZpbGVJRDtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZVBhdGggPSBmaWxlUGF0aDtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIucmVzdGFydFdvcmtlcihmaWxlSUQpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQobWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci53b3JrZXIoKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdFBieEFwaS5TeXN0ZW1HZXRTdGF0dXNVcGxvYWRGaWxlKG1lcmdpbmdDaGVja1dvcmtlci5maWxlSUQsIG1lcmdpbmdDaGVja1dvcmtlci5jYkFmdGVyUmVzcG9uc2UpO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIud29ya2VyLFxuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVPdXQsXG5cdFx0KTtcblx0fSxcblx0Y2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyA+IDEwKSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcblx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzICs9IDE7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ1VQTE9BRF9DT01QTEVURScpIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBncmFkZUluUHJvZ3Jlc3MpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVVwZ3JhZGUobWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVQYXRoLCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0VXBkYXRlKTtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQobWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRJblByb2dyZXNzKTtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyA9IDA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyArPSAxO1xuXHRcdH1cblx0fSxcbn07XG5cblxuY29uc3QgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDEwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHRpdGVyYXRpb25zOiAwLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLml0ZXJhdGlvbnMgPSAwO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRQYnhBcGkuU3lzdGVtR2V0RmlybXdhcmVEb3dubG9hZFN0YXR1cyh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5jYlJlZnJlc2hVcGdyYWRlU3RhdHVzKTtcblx0fSxcblx0Y2JSZWZyZXNoVXBncmFkZVN0YXR1cyhyZXNwb25zZSkge1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLml0ZXJhdGlvbnMgKz0gMTtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlID1cblx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLndvcmtlciwgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZU91dCk7XG5cdFx0aWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCB8fCByZXNwb25zZSA9PT0gZmFsc2UpIHJldHVybjtcblx0XHRpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9JTl9QUk9HUkVTUycpIHtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuY2xvc2VzdCgnYScpLmZpbmQoJy5wZXJjZW50JykudGV4dChgJHtyZXNwb25zZS5kX3N0YXR1c19wcm9ncmVzc30lYCk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0NPTVBMRVRFJykge1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuY2xvc2VzdCgnYScpLmZpbmQoJy5wZXJjZW50JykudGV4dChgJHtyZXNwb25zZS5kX3N0YXR1c19wcm9ncmVzc30lYCk7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmFkZENsYXNzKCdzeW5jJykucmVtb3ZlQ2xhc3MoJ3JlZG8nKTtcblx0XHRcdFBieEFwaS5TeXN0ZW1VcGdyYWRlKHJlc3BvbnNlLmZpbGVQYXRoLCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0VXBkYXRlKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnRE9XTkxPQURfRVJST1InKSB7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS51cGRfRG93bmxvYWRVcGdyYWRlRXJyb3IpO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5hZGRDbGFzcygncmVkbycpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fVxuXHR9LFxufTtcblxuXG5jb25zdCB1cGRhdGVQQlggPSB7XG5cdCRmb3JtT2JqOiAkKCcjdXBncmFkZS1mb3JtJyksXG5cdCRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblx0JHByb2dyZXNzQmFyOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLFxuXHQkcHJvZ3Jlc3NCYXJMYWJlbDogJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKS5maW5kKCcubGFiZWwnKSxcblx0Y3VycmVudFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24sXG5cdCRyZXN0b3JlTW9kYWxGb3JtOiAkKCcjdXBkYXRlLW1vZGFsLWZvcm0nKSxcblx0dXBncmFkZUluUHJvZ3Jlc3M6IGZhbHNlLFxuXHRjb252ZXJ0ZXI6IG5ldyBzaG93ZG93bi5Db252ZXJ0ZXIoKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm0ubW9kYWwoKTtcblx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHQkKCdpbnB1dDp0ZXh0LCAudWkuYnV0dG9uJywgJy51aS5hY3Rpb24uaW5wdXQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0JCgnaW5wdXQ6ZmlsZScsICQoZS50YXJnZXQpLnBhcmVudHMoKSkuY2xpY2soKTtcblx0XHR9KTtcblxuXHRcdCQoJ2lucHV0OmZpbGUnLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuXHRcdFx0aWYgKGUudGFyZ2V0LmZpbGVzWzBdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y29uc3QgZmlsZW5hbWUgPSBlLnRhcmdldC5maWxlc1swXS5uYW1lO1xuXHRcdFx0XHQkKCdpbnB1dDp0ZXh0JywgJChlLnRhcmdldCkucGFyZW50KCkpLnZhbChmaWxlbmFtZSk7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcblxuXHRcdFx0dXBkYXRlUEJYLiRmb3JtT2JqXG5cdFx0XHRcdC5mb3JtKHtcblx0XHRcdFx0XHRvbjogJ2JsdXInLFxuXHRcdFx0XHRcdGZpZWxkczogdXBkYXRlUEJYLnZhbGlkYXRlUnVsZXMsXG5cdFx0XHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRcdFx0dXBkYXRlUEJYLiRyZXN0b3JlTW9kYWxGb3JtXG5cdFx0XHRcdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0XHRcdFx0Y2xvc2FibGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRcdG9uRGVueTogKCkgPT4gdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgZGF0YSA9ICQoJ2lucHV0OmZpbGUnKVswXS5maWxlc1swXTtcblx0XHRcdFx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1VcGxvYWRGaWxlKGRhdGEsdXBkYXRlUEJYLmNiUmVzdW1hYmxlVXBsb2FkRmlsZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KTtcblx0XHRcdHVwZGF0ZVBCWC4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG5cdFx0fSk7XG5cdFx0Y29uc3QgcmVxdWVzdERhdGEgPSB7XG5cdFx0XHRUWVBFOiAnRklSTVdBUkUnLFxuXHRcdFx0UEJYVkVSOiBnbG9iYWxQQlhWZXJzaW9uLFxuXHRcdFx0TEFOR1VBR0U6IGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsXG5cdFx0fTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6ICdodHRwczovL3VwZGF0ZS5hc2tvemlhLnJ1Jyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgPT09ICdTVUNDRVNTJztcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y29uc3QgY3VycmVudFZlcmlzb24gPSB1cGRhdGVQQlguY3VycmVudFZlcnNpb24ucmVwbGFjZSgvXFxEL2csICcnKTtcblx0XHRcdFx0cmVzcG9uc2UuZmlybXdhcmUuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgdmVyc2lvbiA9IG9iai52ZXJzaW9uLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cdFx0XHRcdFx0aWYgKHBhcnNlSW50KHZlcnNpb24sIDEwKSA+IHBhcnNlSW50KGN1cnJlbnRWZXJpc29uLCAxMCkpIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVBCWC5BZGROZXdWZXJzaW9uSW5mb3JtYXRpb24ob2JqKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdCQoJ2EucmVkbycpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdGlmICh1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpIHx8IHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcykgcmV0dXJuO1xuXHRcdFx0XHRcdHVwZGF0ZVBCWC4kcmVzdG9yZU1vZGFsRm9ybVxuXHRcdFx0XHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0XHRcdFx0Y2xvc2FibGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRvbkRlbnk6ICgpID0+IHRydWUsXG5cdFx0XHRcdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHBhcmFtcyA9IFtdO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMudXBkYXRlTGluayA9ICRhTGluay5hdHRyKCdocmVmJyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLm1kNSA9ICRhTGluay5hdHRyKCdkYXRhLW1kNScpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuXHRcdFx0XHRcdFx0XHRcdCRhTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0XHRcdFx0XHR1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1Eb3dubG9hZE5ld0Zpcm13YXJlKHBhcmFtcywgdXBkYXRlUEJYLmNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUpO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdC5tb2RhbCgnc2hvdycpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGxvYWQgZmlsZSBieSBjaHVua3Ncblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYlJlc3VtYWJsZVVwbG9hZEZpbGUoYWN0aW9uLCBwYXJhbXMpe1xuXHRcdHN3aXRjaCAoYWN0aW9uKSB7XG5cdFx0XHRjYXNlICdmaWxlU3VjY2Vzcyc6XG5cdFx0XHRcdHVwZGF0ZVBCWC5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAndXBsb2FkU3RhcnQnOlxuXHRcdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyLnNob3coKTtcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRJblByb2dyZXNzKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdwcm9ncmVzcyc6XG5cdFx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuXHRcdFx0XHRcdHBlcmNlbnQ6IHBhcnNlSW50KHBhcmFtcy5wZXJjZW50LCAxMCksXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2Vycm9yJzpcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXG5cblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBXYWl0IGZvciBmaWxlIHJlYWR5IHRvIHVzZVxuXHQgKlxuXHQgKiBAcGFyYW0gcmVzcG9uc2Ug0L7RgtCy0LXRgiDRhNGD0L3QutGG0LjQuCAvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1c1xuXHQgKi9cblx0Y2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IFBieEFwaS50cnlQYXJzZUpTT04ocmVzcG9uc2UpID09PSBmYWxzZSkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3J9YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcblx0XHRpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcn1gKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QgZmlsZUlEID0ganNvbi5kYXRhLnVwbG9hZF9pZDtcblx0XHRjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuaW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKTtcblx0fSxcblxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgc3RhcnQgUEJYIHVwZ3JhZGluZ1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJTdGFydFVwZGF0ZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGdyYWRlRXJyb3IpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIEFmdGVyIHN0YXJ0IG9ubGluZSB1cGdyYWRlIHdlIGhhdmUgdG8gd2FpdCBhbiBhbnN3ZXIsXG5cdCAqIGFuZCB0aGVuIHN0YXJ0IHN0YXR1cyBjaGVjayB3b3JrZXJcblx0ICovXG5cdGNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgPT09IHRydWUpIHtcblx0XHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogQWRkIG5ldyBibG9jayBvZiB1cGRhdGUgaW5mb3JtYXRpb24gb24gcGFnZVxuXHQgKi9cblx0QWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaikge1xuXHRcdCQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcblx0XHRsZXQgbWFya2Rvd25UZXh0ID0gZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXNjcmlwdGlvbik7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoLzxicj4vZywgJ1xccicpO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnIgPi9nLCAnXFxyJyk7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKiBcXCovZywgJyonKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvXFwqXFwqL2csICcqJyk7XG5cdFx0Y29uc3QgaHRtbCA9IHVwZGF0ZVBCWC5jb252ZXJ0ZXIubWFrZUh0bWwobWFya2Rvd25UZXh0KTtcblx0XHRjb25zdCBkeW1hbmljUm93ID0gYFxuXHRcdFx0PHRyIGNsYXNzPVwidXBkYXRlLXJvd1wiPlxuXHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke29iai52ZXJzaW9ufTwvdGQ+XG5cdFx0XHQ8dGQ+JHtodG1sfTwvdGQ+XG5cdFx0XHQ8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICBcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdDxhIGhyZWY9XCIke29iai5ocmVmfVwiIGNsYXNzPVwidWkgYnV0dG9uIHJlZG8gcG9wdXBlZFwiIFxuICAgIFx0XHRcdFx0ZGF0YS1jb250ZW50ID0gXCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwVXBncmFkZU9ubGluZX1cIlxuXHRcdFx0XHRcdGRhdGEtbWQ1ID1cIiR7b2JqLm1kNX1cIiBkYXRhLXNpemUgPVwiJHtvYmouc2l6ZX1cIj5cblx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdFx0PC9hPlxuXHRcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZCBwb3B1cGVkXCIgXG5cdFx0XHRcdFx0ZGF0YS1jb250ZW50ID0gXCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRG93bmxvYWR9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCI+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+XG5cdFx0XHRcdDwvYT5cbiAgICBcdFx0PC9kaXY+ICAgXG5cdDwvdHI+YDtcblx0XHQkKCcjdXBkYXRlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW1hbmljUm93KTtcblx0XHQkKCdhLnBvcHVwZWQnKS5wb3B1cCgpO1xuXHR9LFxufTtcblxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHVwZGF0ZVBCWC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19