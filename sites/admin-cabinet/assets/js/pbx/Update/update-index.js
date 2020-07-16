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
            return response !== undefined && Object.keys(response).length > 0 && response.result === true;
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
                    PbxApi.SystemUpgradeOnline(params, updatePBX.cbAfterStartUpgradeOnline);
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
  cbAfterStartUpgradeOnline: function () {
    function cbAfterStartUpgradeOnline(response) {
      if (response === true) {
        upgradeStatusLoopWorker.initialize();
      } else {
        updatePBX.upgradeInProgress = false;
        $('i.loading.redo').removeClass('loading');
      }
    }

    return cbAfterStartUpgradeOnline;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbIm1lcmdpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCIkcHJvZ3Jlc3NCYXJMYWJlbCIsIiQiLCJmaW5kIiwiZmlsZUlEIiwiZmlsZVBhdGgiLCJpbml0aWFsaXplIiwicmVzdGFydFdvcmtlciIsIndpbmRvdyIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJQYnhBcGkiLCJTeXN0ZW1HZXRTdGF0dXNVcGxvYWRGaWxlIiwiY2JBZnRlclJlc3BvbnNlIiwic2V0VGltZW91dCIsInJlc3BvbnNlIiwidGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsInVwZF9VcGxvYWRFcnJvciIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwidXBkYXRlUEJYIiwiJHN1Ym1pdEJ1dHRvbiIsInJlbW92ZUNsYXNzIiwidW5kZWZpbmVkIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsImRfc3RhdHVzIiwidXBkX1VwZ3JhZGVJblByb2dyZXNzIiwiU3lzdGVtVXBncmFkZSIsImNiQWZ0ZXJTdGFydFVwZGF0ZSIsInVwZF9VcGxvYWRJblByb2dyZXNzIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJpdGVyYXRpb25zIiwiU3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsImNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMiLCJjbG9zZXN0IiwiZF9zdGF0dXNfcHJvZ3Jlc3MiLCJhZGRDbGFzcyIsInVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvciIsIiRmb3JtT2JqIiwiJHByb2dyZXNzQmFyIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHJlc3RvcmVNb2RhbEZvcm0iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwibW9kYWwiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlcyIsImZpbGVuYW1lIiwibmFtZSIsInBhcmVudCIsInZhbCIsInByZXZlbnREZWZhdWx0IiwiaGFzQ2xhc3MiLCJmb3JtIiwiZmllbGRzIiwidmFsaWRhdGVSdWxlcyIsIm9uU3VjY2VzcyIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwiZGF0YSIsIlN5c3RlbVVwbG9hZEZpbGUiLCJjYlJlc3VtYWJsZVVwbG9hZEZpbGUiLCJyZXF1ZXN0RGF0YSIsIlRZUEUiLCJQQlhWRVIiLCJMQU5HVUFHRSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJzdWNjZXNzVGVzdCIsInJlc3VsdCIsImN1cnJlbnRWZXJpc29uIiwicmVwbGFjZSIsImZpcm13YXJlIiwiZm9yRWFjaCIsIm9iaiIsInZlcnNpb24iLCJwYXJzZUludCIsIkFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbiIsInBhcmFtcyIsIiRhTGluayIsInVwZGF0ZUxpbmsiLCJhdHRyIiwibWQ1Iiwic2l6ZSIsIlN5c3RlbVVwZ3JhZGVPbmxpbmUiLCJjYkFmdGVyU3RhcnRVcGdyYWRlT25saW5lIiwiYWN0aW9uIiwiY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyIsInNob3ciLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJ0cnlQYXJzZUpTT04iLCJqc29uIiwiSlNPTiIsInBhcnNlIiwidXBsb2FkX2lkIiwidXBkX1VwZ3JhZGVFcnJvciIsIm1hcmtkb3duVGV4dCIsImRlY29kZVVSSUNvbXBvbmVudCIsImRlc2NyaXB0aW9uIiwiaHRtbCIsIm1ha2VIdG1sIiwiZHltYW5pY1JvdyIsImhyZWYiLCJidF9Ub29sVGlwVXBncmFkZU9ubGluZSIsImJ0X1Rvb2xUaXBEb3dubG9hZCIsImFwcGVuZCIsInBvcHVwIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTs7QUFHQSxJQUFNQSxrQkFBa0IsR0FBRztBQUMxQkMsRUFBQUEsT0FB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ckIsdUNBY0EvQixHQUFHLENBQUNRLEdBZEosNkJBY3dCUixHQUFHLENBQUNTLElBZDVCLGtHQUFoQjtBQW1CQS9GLE1BQUFBLENBQUMsQ0FBQyxzQkFBRCxDQUFELENBQTBCc0gsTUFBMUIsQ0FBaUNKLFVBQWpDO0FBQ0FsSCxNQUFBQSxDQUFDLENBQUMsV0FBRCxDQUFELENBQWV1SCxLQUFmO0FBQ0E7O0FBMU1nQjtBQUFBO0FBQUEsQ0FBbEI7QUE4TUF2SCxDQUFDLENBQUN3SCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCckcsRUFBQUEsU0FBUyxDQUFDaEIsVUFBVjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsUEJYVmVyc2lvbiwgZ2xvYmFsVHJhbnNsYXRlLFxuZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgc2hvd2Rvd24sIFVzZXJNZXNzYWdlICovXG5cbmNvbnN0IG1lcmdpbmdDaGVja1dvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGVycm9yQ291bnRzOiAwLFxuXHQkcHJvZ3Jlc3NCYXJMYWJlbDogJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKS5maW5kKCcubGFiZWwnKSxcblx0ZmlsZUlEOiBudWxsLFxuXHRmaWxlUGF0aDogJycsXG5cdGluaXRpYWxpemUoZmlsZUlELCBmaWxlUGF0aCkge1xuXHRcdC8vINCX0LDQv9GD0YHRgtC40Lwg0L7QsdC90L7QstC70LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0L/RgNC+0LLQsNC50LTQtdGA0LBcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZUlEID0gZmlsZUlEO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5maWxlUGF0aCA9IGZpbGVQYXRoO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5yZXN0YXJ0V29ya2VyKGZpbGVJRCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0UGJ4QXBpLlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUobWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVJRCwgbWVyZ2luZ0NoZWNrV29ya2VyLmNiQWZ0ZXJSZXNwb25zZSk7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUgPSB3aW5kb3cuc2V0VGltZW91dChcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci53b3JrZXIsXG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIudGltZU91dCxcblx0XHQpO1xuXHR9LFxuXHRjYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRpZiAobWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzID4gMTApIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuXHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQobWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdH1cblx0XHRpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgKz0gMTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnVVBMT0FEX0NPTVBMRVRFJykge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGdyYWRlSW5Qcm9ncmVzcyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtVXBncmFkZShtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZVBhdGgsIHVwZGF0ZVBCWC5jYkFmdGVyU3RhcnRVcGRhdGUpO1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dChtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEluUHJvZ3Jlc3MpO1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzID0gMDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzICs9IDE7XG5cdFx0fVxuXHR9LFxufTtcblxuXG5jb25zdCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciA9IHtcblx0dGltZU91dDogMTAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGl0ZXJhdGlvbnM6IDAsXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaXRlcmF0aW9ucyA9IDA7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFBieEFwaS5TeXN0ZW1HZXRVcGdyYWRlU3RhdHVzKHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMpO1xuXHR9LFxuXHRjYlJlZnJlc2hVcGdyYWRlU3RhdHVzKHJlc3BvbnNlKSB7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaXRlcmF0aW9ucyArPSAxO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUgPVxuXHRcdFx0d2luZG93LnNldFRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIud29ya2VyLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lT3V0KTtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0lOX1BST0dSRVNTJykge1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5jbG9zZXN0KCdhJykuZmluZCgnLnBlcmNlbnQnKS50ZXh0KGAke3Jlc3BvbnNlLmRfc3RhdHVzX3Byb2dyZXNzfSVgKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnRE9XTkxPQURfQ09NUExFVEUnKSB7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5jbG9zZXN0KCdhJykuZmluZCgnLnBlcmNlbnQnKS50ZXh0KGAke3Jlc3BvbnNlLmRfc3RhdHVzX3Byb2dyZXNzfSVgKTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuYWRkQ2xhc3MoJ3N5bmMnKS5yZW1vdmVDbGFzcygncmVkbycpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9FUlJPUicpIHtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvcik7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmFkZENsYXNzKCdyZWRvJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9XG5cdH0sXG59O1xuXG5cbmNvbnN0IHVwZGF0ZVBCWCA9IHtcblx0JGZvcm1PYmo6ICQoJyN1cGdyYWRlLWZvcm0nKSxcblx0JHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXHQkcHJvZ3Jlc3NCYXI6ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyJyksXG5cdCRwcm9ncmVzc0JhckxhYmVsOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLmZpbmQoJy5sYWJlbCcpLFxuXHRjdXJyZW50VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbixcblx0JHJlc3RvcmVNb2RhbEZvcm06ICQoJyN1cGRhdGUtbW9kYWwtZm9ybScpLFxuXHR1cGdyYWRlSW5Qcm9ncmVzczogZmFsc2UsXG5cdGNvbnZlcnRlcjogbmV3IHNob3dkb3duLkNvbnZlcnRlcigpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHVwZGF0ZVBCWC4kcmVzdG9yZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdCQoJ2lucHV0OnRleHQsIC51aS5idXR0b24nLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHQkKCdpbnB1dDpmaWxlJywgJChlLnRhcmdldCkucGFyZW50cygpKS5jbGljaygpO1xuXHRcdH0pO1xuXG5cdFx0JCgnaW5wdXQ6ZmlsZScsICcudWkuYWN0aW9uLmlucHV0Jykub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHRpZiAoZS50YXJnZXQuZmlsZXNbMF0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjb25zdCBmaWxlbmFtZSA9IGUudGFyZ2V0LmZpbGVzWzBdLm5hbWU7XG5cdFx0XHRcdCQoJ2lucHV0OnRleHQnLCAkKGUudGFyZ2V0KS5wYXJlbnQoKSkudmFsKGZpbGVuYW1lKTtcblx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGlmICh1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpIHx8IHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcykgcmV0dXJuO1xuXG5cdFx0XHR1cGRhdGVQQlguJGZvcm1PYmpcblx0XHRcdFx0LmZvcm0oe1xuXHRcdFx0XHRcdG9uOiAnYmx1cicsXG5cdFx0XHRcdFx0ZmllbGRzOiB1cGRhdGVQQlgudmFsaWRhdGVSdWxlcyxcblx0XHRcdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm1cblx0XHRcdFx0XHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0XHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdFx0b25EZW55OiAoKSA9PiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBkYXRhID0gJCgnaW5wdXQ6ZmlsZScpWzBdLmZpbGVzWzBdO1xuXHRcdFx0XHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbVVwbG9hZEZpbGUoZGF0YSx1cGRhdGVQQlguY2JSZXN1bWFibGVVcGxvYWRGaWxlKTtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdC5tb2RhbCgnc2hvdycpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0dXBkYXRlUEJYLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcblx0XHR9KTtcblx0XHRjb25zdCByZXF1ZXN0RGF0YSA9IHtcblx0XHRcdFRZUEU6ICdGSVJNV0FSRScsXG5cdFx0XHRQQlhWRVI6IGdsb2JhbFBCWFZlcnNpb24sXG5cdFx0XHRMQU5HVUFHRTogZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSxcblx0XHR9O1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogJ2h0dHBzOi8vdXBkYXRlLmFza296aWEucnUnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiByZXF1ZXN0RGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZTtcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y29uc3QgY3VycmVudFZlcmlzb24gPSB1cGRhdGVQQlguY3VycmVudFZlcnNpb24ucmVwbGFjZSgvXFxEL2csICcnKTtcblx0XHRcdFx0cmVzcG9uc2UuZmlybXdhcmUuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgdmVyc2lvbiA9IG9iai52ZXJzaW9uLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cdFx0XHRcdFx0aWYgKHBhcnNlSW50KHZlcnNpb24sIDEwKSA+IHBhcnNlSW50KGN1cnJlbnRWZXJpc29uLCAxMCkpIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVBCWC5BZGROZXdWZXJzaW9uSW5mb3JtYXRpb24ob2JqKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdCQoJ2EucmVkbycpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdGlmICh1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpIHx8IHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcykgcmV0dXJuO1xuXHRcdFx0XHRcdHVwZGF0ZVBCWC4kcmVzdG9yZU1vZGFsRm9ybVxuXHRcdFx0XHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0XHRcdFx0Y2xvc2FibGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRvbkRlbnk6ICgpID0+IHRydWUsXG5cdFx0XHRcdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHBhcmFtcyA9IFtdO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMudXBkYXRlTGluayA9ICRhTGluay5hdHRyKCdocmVmJyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLm1kNSA9ICRhTGluay5hdHRyKCdkYXRhLW1kNScpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuXHRcdFx0XHRcdFx0XHRcdCRhTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0XHRcdFx0XHR1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1VcGdyYWRlT25saW5lKHBhcmFtcywgdXBkYXRlUEJYLmNiQWZ0ZXJTdGFydFVwZ3JhZGVPbmxpbmUpO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdC5tb2RhbCgnc2hvdycpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGxvYWQgZmlsZSBieSBjaHVua3Ncblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYlJlc3VtYWJsZVVwbG9hZEZpbGUoYWN0aW9uLCBwYXJhbXMpe1xuXHRcdHN3aXRjaCAoYWN0aW9uKSB7XG5cdFx0XHRjYXNlICdmaWxlU3VjY2Vzcyc6XG5cdFx0XHRcdHVwZGF0ZVBCWC5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAndXBsb2FkU3RhcnQnOlxuXHRcdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyLnNob3coKTtcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRJblByb2dyZXNzKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdwcm9ncmVzcyc6XG5cdFx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuXHRcdFx0XHRcdHBlcmNlbnQ6IHBhcnNlSW50KHBhcmFtcy5wZXJjZW50LCAxMCksXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2Vycm9yJzpcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXG5cblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBXYWl0IGZvciBmaWxlIHJlYWR5IHRvIHVzZVxuXHQgKlxuXHQgKiBAcGFyYW0gcmVzcG9uc2Ug0L7RgtCy0LXRgiDRhNGD0L3QutGG0LjQuCAvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1c1xuXHQgKi9cblx0Y2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IFBieEFwaS50cnlQYXJzZUpTT04ocmVzcG9uc2UpID09PSBmYWxzZSkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3J9YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcblx0XHRpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoYCR7Z2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcn1gKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QgZmlsZUlEID0ganNvbi5kYXRhLnVwbG9hZF9pZDtcblx0XHRjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuaW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKTtcblx0fSxcblxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgc3RhcnQgUEJYIHVwZ3JhZGluZ1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJTdGFydFVwZGF0ZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGdyYWRlRXJyb3IpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIEFmdGVyIHN0YXJ0IG9ubGluZSB1cGdyYWRlIHdlIGhhdmUgdG8gd2FpdCBhbiBhbnN3ZXIsXG5cdCAqIGFuZCB0aGVuIHN0YXJ0IHN0YXR1cyBjaGVjayB3b3JrZXJcblx0ICovXG5cdGNiQWZ0ZXJTdGFydFVwZ3JhZGVPbmxpbmUocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgPT09IHRydWUpIHtcblx0XHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogQWRkIG5ldyBibG9jayBvZiB1cGRhdGUgaW5mb3JtYXRpb24gb24gcGFnZVxuXHQgKi9cblx0QWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaikge1xuXHRcdCQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcblx0XHRsZXQgbWFya2Rvd25UZXh0ID0gZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXNjcmlwdGlvbik7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoLzxicj4vZywgJ1xccicpO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnIgPi9nLCAnXFxyJyk7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKiBcXCovZywgJyonKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvXFwqXFwqL2csICcqJyk7XG5cdFx0Y29uc3QgaHRtbCA9IHVwZGF0ZVBCWC5jb252ZXJ0ZXIubWFrZUh0bWwobWFya2Rvd25UZXh0KTtcblx0XHRjb25zdCBkeW1hbmljUm93ID0gYFxuXHRcdFx0PHRyIGNsYXNzPVwidXBkYXRlLXJvd1wiPlxuXHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke29iai52ZXJzaW9ufTwvdGQ+XG5cdFx0XHQ8dGQ+JHtodG1sfTwvdGQ+XG5cdFx0XHQ8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICBcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdDxhIGhyZWY9XCIke29iai5ocmVmfVwiIGNsYXNzPVwidWkgYnV0dG9uIHJlZG8gcG9wdXBlZFwiIFxuICAgIFx0XHRcdFx0ZGF0YS1jb250ZW50ID0gXCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwVXBncmFkZU9ubGluZX1cIlxuXHRcdFx0XHRcdGRhdGEtbWQ1ID1cIiR7b2JqLm1kNX1cIiBkYXRhLXNpemUgPVwiJHtvYmouc2l6ZX1cIj5cblx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdFx0PC9hPlxuXHRcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZCBwb3B1cGVkXCIgXG5cdFx0XHRcdFx0ZGF0YS1jb250ZW50ID0gXCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRG93bmxvYWR9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCI+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+XG5cdFx0XHRcdDwvYT5cbiAgICBcdFx0PC9kaXY+ICAgXG5cdDwvdHI+YDtcblx0XHQkKCcjdXBkYXRlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW1hbmljUm93KTtcblx0XHQkKCdhLnBvcHVwZWQnKS5wb3B1cCgpO1xuXHR9LFxufTtcblxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHVwZGF0ZVBCWC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19