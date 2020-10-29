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
      PbxApi.FilesFirmwareDownloadStatus(upgradeStatusLoopWorker.cbRefreshUpgradeStatus);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbIm1lcmdpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCIkcHJvZ3Jlc3NCYXJMYWJlbCIsIiQiLCJmaW5kIiwiZmlsZUlEIiwiZmlsZVBhdGgiLCJpbml0aWFsaXplIiwicmVzdGFydFdvcmtlciIsIndpbmRvdyIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJQYnhBcGkiLCJGaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUiLCJjYkFmdGVyUmVzcG9uc2UiLCJzZXRUaW1lb3V0IiwicmVzcG9uc2UiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidXBkX1VwbG9hZEVycm9yIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJ1cGRhdGVQQlgiLCIkc3VibWl0QnV0dG9uIiwicmVtb3ZlQ2xhc3MiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiZF9zdGF0dXMiLCJ1cGRfVXBncmFkZUluUHJvZ3Jlc3MiLCJTeXN0ZW1VcGdyYWRlIiwiY2JBZnRlclN0YXJ0VXBkYXRlIiwidXBkX1VwbG9hZEluUHJvZ3Jlc3MiLCJ1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciIsIml0ZXJhdGlvbnMiLCJGaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJjYlJlZnJlc2hVcGdyYWRlU3RhdHVzIiwiY2xvc2VzdCIsImRfc3RhdHVzX3Byb2dyZXNzIiwiYWRkQ2xhc3MiLCJ1cGRfRG93bmxvYWRVcGdyYWRlRXJyb3IiLCIkZm9ybU9iaiIsIiRwcm9ncmVzc0JhciIsImN1cnJlbnRWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsIiRyZXN0b3JlTW9kYWxGb3JtIiwidXBncmFkZUluUHJvZ3Jlc3MiLCJjb252ZXJ0ZXIiLCJzaG93ZG93biIsIkNvbnZlcnRlciIsIm1vZGFsIiwib24iLCJlIiwidGFyZ2V0IiwicGFyZW50cyIsImNsaWNrIiwiZmlsZXMiLCJmaWxlbmFtZSIsIm5hbWUiLCJwYXJlbnQiLCJ2YWwiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZm9ybSIsImZpZWxkcyIsInZhbGlkYXRlUnVsZXMiLCJvblN1Y2Nlc3MiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImRhdGEiLCJGaWxlc1VwbG9hZEZpbGUiLCJjYlJlc3VtYWJsZVVwbG9hZEZpbGUiLCJyZXF1ZXN0RGF0YSIsIlRZUEUiLCJQQlhWRVIiLCJMQU5HVUFHRSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJzdWNjZXNzVGVzdCIsInJlc3VsdCIsImN1cnJlbnRWZXJpc29uIiwicmVwbGFjZSIsImZpcm13YXJlIiwiZm9yRWFjaCIsIm9iaiIsInZlcnNpb24iLCJwYXJzZUludCIsIkFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbiIsInBhcmFtcyIsIiRhTGluayIsInVwZGF0ZUxpbmsiLCJhdHRyIiwibWQ1Iiwic2l6ZSIsIkZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsImNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUiLCJhY3Rpb24iLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwic2hvdyIsInByb2dyZXNzIiwicGVyY2VudCIsInRyeVBhcnNlSlNPTiIsImpzb24iLCJKU09OIiwicGFyc2UiLCJ1cGxvYWRfaWQiLCJ1cGRfVXBncmFkZUVycm9yIiwibWFya2Rvd25UZXh0IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZGVzY3JpcHRpb24iLCJodG1sIiwibWFrZUh0bWwiLCJkeW1hbmljUm93IiwiaHJlZiIsImJ0X1Rvb2xUaXBVcGdyYWRlT25saW5lIiwiYnRfVG9vbFRpcERvd25sb2FkIiwiYXBwZW5kIiwicG9wdXAiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBOztBQUdBLElBQU1BLGtCQUFrQixHQUFH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Siw2QkFRd0JSLEdBQUcsQ0FBQ1MsSUFSNUIseUlBWUhULEdBQUcsQ0FBQzZCLElBWkQsa0ZBYUtuRyxlQUFlLENBQUNxRyxrQkFickIsdUNBY0EvQixHQUFHLENBQUNRLEdBZEosNkJBY3dCUixHQUFHLENBQUNTLElBZDVCLGtHQUFoQjtBQW1CQS9GLE1BQUFBLENBQUMsQ0FBQyxzQkFBRCxDQUFELENBQTBCc0gsTUFBMUIsQ0FBaUNKLFVBQWpDO0FBQ0FsSCxNQUFBQSxDQUFDLENBQUMsV0FBRCxDQUFELENBQWV1SCxLQUFmO0FBQ0E7O0FBek1nQjtBQUFBO0FBQUEsQ0FBbEI7QUE2TUF2SCxDQUFDLENBQUN3SCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCckcsRUFBQUEsU0FBUyxDQUFDaEIsVUFBVjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsUEJYVmVyc2lvbiwgZ2xvYmFsVHJhbnNsYXRlLFxuZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgc2hvd2Rvd24sIFVzZXJNZXNzYWdlICovXG5cbmNvbnN0IG1lcmdpbmdDaGVja1dvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGVycm9yQ291bnRzOiAwLFxuXHQkcHJvZ3Jlc3NCYXJMYWJlbDogJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKS5maW5kKCcubGFiZWwnKSxcblx0ZmlsZUlEOiBudWxsLFxuXHRmaWxlUGF0aDogJycsXG5cdGluaXRpYWxpemUoZmlsZUlELCBmaWxlUGF0aCkge1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5maWxlSUQgPSBmaWxlSUQ7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVQYXRoID0gZmlsZVBhdGg7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnJlc3RhcnRXb3JrZXIoZmlsZUlEKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHRQYnhBcGkuRmlsZXNHZXRTdGF0dXNVcGxvYWRGaWxlKG1lcmdpbmdDaGVja1dvcmtlci5maWxlSUQsIG1lcmdpbmdDaGVja1dvcmtlci5jYkFmdGVyUmVzcG9uc2UpO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIud29ya2VyLFxuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVPdXQsXG5cdFx0KTtcblx0fSxcblx0Y2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyA+IDEwKSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcblx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzICs9IDE7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ1VQTE9BRF9DT01QTEVURScpIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBncmFkZUluUHJvZ3Jlc3MpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVVwZ3JhZGUobWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVQYXRoLCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0VXBkYXRlKTtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQobWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRJblByb2dyZXNzKTtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyA9IDA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyArPSAxO1xuXHRcdH1cblx0fSxcbn07XG5cblxuY29uc3QgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDEwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHRpdGVyYXRpb25zOiAwLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLml0ZXJhdGlvbnMgPSAwO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRQYnhBcGkuRmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzKHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMpO1xuXHR9LFxuXHRjYlJlZnJlc2hVcGdyYWRlU3RhdHVzKHJlc3BvbnNlKSB7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaXRlcmF0aW9ucyArPSAxO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUgPVxuXHRcdFx0d2luZG93LnNldFRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIud29ya2VyLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lT3V0KTtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0lOX1BST0dSRVNTJykge1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5jbG9zZXN0KCdhJykuZmluZCgnLnBlcmNlbnQnKS50ZXh0KGAke3Jlc3BvbnNlLmRfc3RhdHVzX3Byb2dyZXNzfSVgKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnRE9XTkxPQURfQ09NUExFVEUnKSB7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5jbG9zZXN0KCdhJykuZmluZCgnLnBlcmNlbnQnKS50ZXh0KGAke3Jlc3BvbnNlLmRfc3RhdHVzX3Byb2dyZXNzfSVgKTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuYWRkQ2xhc3MoJ3N5bmMnKS5yZW1vdmVDbGFzcygncmVkbycpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVVwZ3JhZGUocmVzcG9uc2UuZmlsZVBhdGgsIHVwZGF0ZVBCWC5jYkFmdGVyU3RhcnRVcGRhdGUpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9FUlJPUicpIHtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLnVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvcik7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmFkZENsYXNzKCdyZWRvJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9XG5cdH0sXG59O1xuXG5cbmNvbnN0IHVwZGF0ZVBCWCA9IHtcblx0JGZvcm1PYmo6ICQoJyN1cGdyYWRlLWZvcm0nKSxcblx0JHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXHQkcHJvZ3Jlc3NCYXI6ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyJyksXG5cdCRwcm9ncmVzc0JhckxhYmVsOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLmZpbmQoJy5sYWJlbCcpLFxuXHRjdXJyZW50VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbixcblx0JHJlc3RvcmVNb2RhbEZvcm06ICQoJyN1cGRhdGUtbW9kYWwtZm9ybScpLFxuXHR1cGdyYWRlSW5Qcm9ncmVzczogZmFsc2UsXG5cdGNvbnZlcnRlcjogbmV3IHNob3dkb3duLkNvbnZlcnRlcigpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHVwZGF0ZVBCWC4kcmVzdG9yZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdCQoJ2lucHV0OnRleHQsIC51aS5idXR0b24nLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHQkKCdpbnB1dDpmaWxlJywgJChlLnRhcmdldCkucGFyZW50cygpKS5jbGljaygpO1xuXHRcdH0pO1xuXG5cdFx0JCgnaW5wdXQ6ZmlsZScsICcudWkuYWN0aW9uLmlucHV0Jykub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHRpZiAoZS50YXJnZXQuZmlsZXNbMF0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjb25zdCBmaWxlbmFtZSA9IGUudGFyZ2V0LmZpbGVzWzBdLm5hbWU7XG5cdFx0XHRcdCQoJ2lucHV0OnRleHQnLCAkKGUudGFyZ2V0KS5wYXJlbnQoKSkudmFsKGZpbGVuYW1lKTtcblx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGlmICh1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpIHx8IHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcykgcmV0dXJuO1xuXG5cdFx0XHR1cGRhdGVQQlguJGZvcm1PYmpcblx0XHRcdFx0LmZvcm0oe1xuXHRcdFx0XHRcdG9uOiAnYmx1cicsXG5cdFx0XHRcdFx0ZmllbGRzOiB1cGRhdGVQQlgudmFsaWRhdGVSdWxlcyxcblx0XHRcdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm1cblx0XHRcdFx0XHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0XHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdFx0b25EZW55OiAoKSA9PiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBkYXRhID0gJCgnaW5wdXQ6ZmlsZScpWzBdLmZpbGVzWzBdO1xuXHRcdFx0XHRcdFx0XHRcdFx0UGJ4QXBpLkZpbGVzVXBsb2FkRmlsZShkYXRhLHVwZGF0ZVBCWC5jYlJlc3VtYWJsZVVwbG9hZEZpbGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0Lm1vZGFsKCdzaG93Jyk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSk7XG5cdFx0XHR1cGRhdGVQQlguJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuXHRcdH0pO1xuXHRcdGNvbnN0IHJlcXVlc3REYXRhID0ge1xuXHRcdFx0VFlQRTogJ0ZJUk1XQVJFJyxcblx0XHRcdFBCWFZFUjogZ2xvYmFsUEJYVmVyc2lvbixcblx0XHRcdExBTkdVQUdFOiBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLFxuXHRcdH07XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiAnaHR0cHM6Ly91cGRhdGUuYXNrb3ppYS5ydScsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0c3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcblx0XHRcdFx0Ly8gdGVzdCB3aGV0aGVyIGEgSlNPTiByZXNwb25zZSBpcyB2YWxpZFxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSAnU1VDQ0VTUyc7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRWZXJpc29uID0gdXBkYXRlUEJYLmN1cnJlbnRWZXJzaW9uLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cdFx0XHRcdHJlc3BvbnNlLmZpcm13YXJlLmZvckVhY2goKG9iaikgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHZlcnNpb24gPSBvYmoudmVyc2lvbi5yZXBsYWNlKC9cXEQvZywgJycpO1xuXHRcdFx0XHRcdGlmIChwYXJzZUludCh2ZXJzaW9uLCAxMCkgPiBwYXJzZUludChjdXJyZW50VmVyaXNvbiwgMTApKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVQQlguQWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkKCdhLnJlZG8nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcblx0XHRcdFx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm1cblx0XHRcdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0b25EZW55OiAoKSA9PiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBwYXJhbXMgPSBbXTtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnVwZGF0ZUxpbmsgPSAkYUxpbmsuYXR0cignaHJlZicpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy5tZDUgPSAkYUxpbmsuYXR0cignZGF0YS1tZDUnKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdFx0XHRcdFx0XHQkYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRQYnhBcGkuRmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlKHBhcmFtcywgdXBkYXRlUEJYLmNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUpO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdC5tb2RhbCgnc2hvdycpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGxvYWQgZmlsZSBieSBjaHVua3Ncblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYlJlc3VtYWJsZVVwbG9hZEZpbGUoYWN0aW9uLCBwYXJhbXMpe1xuXHRcdHN3aXRjaCAoYWN0aW9uKSB7XG5cdFx0XHRjYXNlICdmaWxlU3VjY2Vzcyc6XG5cdFx0XHRcdHVwZGF0ZVBCWC5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAndXBsb2FkU3RhcnQnOlxuXHRcdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyLnNob3coKTtcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRJblByb2dyZXNzKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdwcm9ncmVzcyc6XG5cdFx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuXHRcdFx0XHRcdHBlcmNlbnQ6IHBhcnNlSW50KHBhcmFtcy5wZXJjZW50LCAxMCksXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2Vycm9yJzpcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXG5cblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBXYWl0IGZvciBmaWxlIHJlYWR5IHRvIHVzZVxuXHQgKlxuXHQgKiBAcGFyYW0gcmVzcG9uc2Ug0L7RgtCy0LXRgiDRhNGD0L3QutGG0LjQuCAvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1c1xuXHQgKi9cblx0Y2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IFBieEFwaS50cnlQYXJzZUpTT04ocmVzcG9uc2UpID09PSBmYWxzZSkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3J9YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcblx0XHRpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcn1gKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QgZmlsZUlEID0ganNvbi5kYXRhLnVwbG9hZF9pZDtcblx0XHRjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuaW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKTtcblx0fSxcblxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgc3RhcnQgUEJYIHVwZ3JhZGluZ1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJTdGFydFVwZGF0ZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGdyYWRlRXJyb3IpO1xuXHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBzdGFydCBvbmxpbmUgdXBncmFkZSB3ZSBoYXZlIHRvIHdhaXQgYW4gYW5zd2VyLFxuXHQgKiBhbmQgdGhlbiBzdGFydCBzdGF0dXMgY2hlY2sgd29ya2VyXG5cdCAqL1xuXHRjYkFmdGVyU3RhcnREb3dubG9hZEZpcm13YXJlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG5cdFx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIEFkZCBuZXcgYmxvY2sgb2YgdXBkYXRlIGluZm9ybWF0aW9uIG9uIHBhZ2Vcblx0ICovXG5cdEFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbihvYmopIHtcblx0XHQkKCcjb25saW5lLXVwZGF0ZXMtYmxvY2snKS5zaG93KCk7XG5cdFx0bGV0IG1hcmtkb3duVGV4dCA9IGRlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnI+L2csICdcXHInKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvPGJyID4vZywgJ1xccicpO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC9cXCogXFwqL2csICcqJyk7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKlxcKi9nLCAnKicpO1xuXHRcdGNvbnN0IGh0bWwgPSB1cGRhdGVQQlguY29udmVydGVyLm1ha2VIdG1sKG1hcmtkb3duVGV4dCk7XG5cdFx0Y29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cInVwZGF0ZS1yb3dcIj5cblx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0PHRkPiR7aHRtbH08L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiByZWRvIHBvcHVwZWRcIiBcbiAgICBcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmV9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCI+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdDwvYT5cblx0XHRcdFx0PGEgaHJlZj1cIiR7b2JqLmhyZWZ9XCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWQgcG9wdXBlZFwiIFxuXHRcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERvd25sb2FkfVwiXG5cdFx0XHRcdFx0ZGF0YS1tZDUgPVwiJHtvYmoubWQ1fVwiIGRhdGEtc2l6ZSA9XCIke29iai5zaXplfVwiPlxuXHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPlxuXHRcdFx0XHQ8L2E+XG4gICAgXHRcdDwvZGl2PiAgIFxuXHQ8L3RyPmA7XG5cdFx0JCgnI3VwZGF0ZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdFx0JCgnYS5wb3B1cGVkJykucG9wdXAoKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHR1cGRhdGVQQlguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==