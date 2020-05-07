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
            return response !== undefined && Object.keys(response).length > 0 && response.result.toUpperCase() === 'SUCCESS';
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
  cbAfterUploadFile: function () {
    function cbAfterUploadFile(response) {
      if (response.length === 0 || response === false) {
        updatePBX.$submitButton.removeClass('loading');
        updatePBX.upgradeInProgress = false;
        UserMessage.showError(globalTranslate.upd_UploadError);
      } else if (response["function"] === 'upload_progress') {
        updatePBX.$progressBar.progress({
          percent: parseInt(response.percent, 10)
        });

        if (response.percent < 100) {
          updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadInProgress);
        } else {
          updatePBX.$progressBarLabel.text(globalTranslate.upd_UpgradeInProgress);
        }
      }
    }

    return cbAfterUploadFile;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwidGltZU91dCIsInRpbWVPdXRIYW5kbGUiLCJpdGVyYXRpb25zIiwiaW5pdGlhbGl6ZSIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4QXBpIiwiU3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsImNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMiLCJyZXNwb25zZSIsInNldFRpbWVvdXQiLCJsZW5ndGgiLCJkX3N0YXR1cyIsIiQiLCJjbG9zZXN0IiwiZmluZCIsInRleHQiLCJkX3N0YXR1c19wcm9ncmVzcyIsImFkZENsYXNzIiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsInVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvciIsInVwZGF0ZVBCWCIsIiRmb3JtT2JqIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc0JhckxhYmVsIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHJlc3RvcmVNb2RhbEZvcm0iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwibW9kYWwiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlcyIsInVuZGVmaW5lZCIsImZpbGVuYW1lIiwibmFtZSIsInBhcmVudCIsInZhbCIsInByZXZlbnREZWZhdWx0IiwiaGFzQ2xhc3MiLCJmb3JtIiwiZmllbGRzIiwidmFsaWRhdGVSdWxlcyIsIm9uU3VjY2VzcyIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwiZGF0YSIsIlN5c3RlbVVwZ3JhZGUiLCJjYkFmdGVyVXBsb2FkRmlsZSIsInJlcXVlc3REYXRhIiwiVFlQRSIsIlBCWFZFUiIsIkxBTkdVQUdFIiwiZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSIsImFwaSIsInVybCIsIm1ldGhvZCIsInN1Y2Nlc3NUZXN0IiwiT2JqZWN0Iiwia2V5cyIsInJlc3VsdCIsInRvVXBwZXJDYXNlIiwiY3VycmVudFZlcmlzb24iLCJyZXBsYWNlIiwiZmlybXdhcmUiLCJmb3JFYWNoIiwib2JqIiwidmVyc2lvbiIsInBhcnNlSW50IiwiQWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uIiwicGFyYW1zIiwiJGFMaW5rIiwidXBkYXRlTGluayIsImF0dHIiLCJtZDUiLCJzaXplIiwiU3lzdGVtVXBncmFkZU9ubGluZSIsImNiQWZ0ZXJTdGFydFVwZ3JhZGVPbmxpbmUiLCJ1cGRfVXBsb2FkRXJyb3IiLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJ1cGRfVXBsb2FkSW5Qcm9ncmVzcyIsInVwZF9VcGdyYWRlSW5Qcm9ncmVzcyIsInNob3ciLCJtYXJrZG93blRleHQiLCJkZWNvZGVVUklDb21wb25lbnQiLCJkZXNjcmlwdGlvbiIsImh0bWwiLCJtYWtlSHRtbCIsImR5bWFuaWNSb3ciLCJocmVmIiwiYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmUiLCJidF9Ub29sVGlwRG93bmxvYWQiLCJhcHBlbmQiLCJwb3B1cCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7O0FBR0EsSUFBTUEsdUJBQXVCLEdBQUc7QUFDL0JDLEVBQUFBLE9BQU8sRUFBRSxJQURzQjtBQUUvQkMsRUFBQUEsYUFBYSxFQUFFLEVBRmdCO0FBRy9CQyxFQUFBQSxVQUFVLEVBQUUsQ0FIbUI7QUFJL0JDLEVBQUFBLFVBSitCO0FBQUEsMEJBSWxCO0FBQ1pKLE1BQUFBLHVCQUF1QixDQUFDRyxVQUF4QixHQUFxQyxDQUFyQztBQUNBSCxNQUFBQSx1QkFBdUIsQ0FBQ0ssYUFBeEI7QUFDQTs7QUFQOEI7QUFBQTtBQVEvQkEsRUFBQUEsYUFSK0I7QUFBQSw2QkFRZjtBQUNmQyxNQUFBQSxNQUFNLENBQUNDLFlBQVAsQ0FBb0JQLHVCQUF1QixDQUFDUSxhQUE1QztBQUNBUixNQUFBQSx1QkFBdUIsQ0FBQ1MsTUFBeEI7QUFDQTs7QUFYOEI7QUFBQTtBQVkvQkEsRUFBQUEsTUFaK0I7QUFBQSxzQkFZdEI7QUFDUkgsTUFBQUEsTUFBTSxDQUFDQyxZQUFQLENBQW9CUCx1QkFBdUIsQ0FBQ1EsYUFBNUM7QUFDQUUsTUFBQUEsTUFBTSxDQUFDQyxzQkFBUCxDQUE4QlgsdUJBQXVCLENBQUNZLHNCQUF0RDtBQUNBOztBQWY4QjtBQUFBO0FBZ0IvQkEsRUFBQUEsc0JBaEIrQjtBQUFBLG9DQWdCUkMsUUFoQlEsRUFnQkU7QUFDaENiLE1BQUFBLHVCQUF1QixDQUFDRyxVQUF4QixJQUFzQyxDQUF0QztBQUNBSCxNQUFBQSx1QkFBdUIsQ0FBQ1EsYUFBeEIsR0FDQ0YsTUFBTSxDQUFDUSxVQUFQLENBQWtCZCx1QkFBdUIsQ0FBQ1MsTUFBMUMsRUFBa0RULHVCQUF1QixDQUFDQyxPQUExRSxDQUREO0FBRUEsVUFBSVksUUFBUSxDQUFDRSxNQUFULEtBQW9CLENBQXBCLElBQXlCRixRQUFRLEtBQUssS0FBMUMsRUFBaUQ7O0FBQ2pELFVBQUlBLFFBQVEsQ0FBQ0csUUFBVCxLQUFzQixzQkFBMUIsRUFBa0Q7QUFDakRDLFFBQUFBLENBQUMsQ0FBQyxnQkFBRCxDQUFELENBQW9CQyxPQUFwQixDQUE0QixHQUE1QixFQUFpQ0MsSUFBakMsQ0FBc0MsVUFBdEMsRUFBa0RDLElBQWxELFdBQTBEUCxRQUFRLENBQUNRLGlCQUFuRTtBQUNBLE9BRkQsTUFFTyxJQUFJUixRQUFRLENBQUNHLFFBQVQsS0FBc0IsbUJBQTFCLEVBQStDO0FBQ3JEVixRQUFBQSxNQUFNLENBQUNDLFlBQVAsQ0FBb0JQLHVCQUF1QixDQUFDUSxhQUE1QztBQUNBUyxRQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQkMsT0FBcEIsQ0FBNEIsR0FBNUIsRUFBaUNDLElBQWpDLENBQXNDLFVBQXRDLEVBQWtEQyxJQUFsRCxXQUEwRFAsUUFBUSxDQUFDUSxpQkFBbkU7QUFDQUosUUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JLLFFBQXBCLENBQTZCLE1BQTdCLEVBQXFDQyxXQUFyQyxDQUFpRCxNQUFqRDtBQUNBLE9BSk0sTUFJQSxJQUFJVixRQUFRLENBQUNHLFFBQVQsS0FBc0IsZ0JBQTFCLEVBQTRDO0FBQ2xEVixRQUFBQSxNQUFNLENBQUNDLFlBQVAsQ0FBb0JQLHVCQUF1QixDQUFDUSxhQUE1QztBQUNBZ0IsUUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCQyxlQUFlLENBQUNDLHdCQUF0QztBQUNBVixRQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQkssUUFBcEIsQ0FBNkIsTUFBN0IsRUFBcUNDLFdBQXJDLENBQWlELFNBQWpEO0FBQ0E7QUFDRDs7QUFoQzhCO0FBQUE7QUFBQSxDQUFoQztBQW9DQSxJQUFNSyxTQUFTLEdBQUc7QUFDakJDLEVBQUFBLFFBQVEsRUFBRVosQ0FBQyxDQUFDLGVBQUQsQ0FETTtBQUVqQmEsRUFBQUEsYUFBYSxFQUFFYixDQUFDLENBQUMsZUFBRCxDQUZDO0FBR2pCYyxFQUFBQSxZQUFZLEVBQUVkLENBQUMsQ0FBQyxzQkFBRCxDQUhFO0FBSWpCZSxFQUFBQSxpQkFBaUIsRUFBRWYsQ0FBQyxDQUFDLHNCQUFELENBQUQsQ0FBMEJFLElBQTFCLENBQStCLFFBQS9CLENBSkY7QUFLakJjLEVBQUFBLGNBQWMsRUFBRUMsZ0JBTEM7QUFNakJDLEVBQUFBLGlCQUFpQixFQUFFbEIsQ0FBQyxDQUFDLG9CQUFELENBTkg7QUFPakJtQixFQUFBQSxpQkFBaUIsRUFBRSxLQVBGO0FBUWpCQyxFQUFBQSxTQUFTLEVBQUUsSUFBSUMsUUFBUSxDQUFDQyxTQUFiLEVBUk07QUFTakJuQyxFQUFBQSxVQVRpQjtBQUFBLDBCQVNKO0FBQ1p3QixNQUFBQSxTQUFTLENBQUNPLGlCQUFWLENBQTRCSyxLQUE1QjtBQUNBWixNQUFBQSxTQUFTLENBQUNFLGFBQVYsQ0FBd0JSLFFBQXhCLENBQWlDLFVBQWpDO0FBQ0FMLE1BQUFBLENBQUMsQ0FBQyx3QkFBRCxFQUEyQixrQkFBM0IsQ0FBRCxDQUFnRHdCLEVBQWhELENBQW1ELE9BQW5ELEVBQTRELFVBQUNDLENBQUQsRUFBTztBQUNsRXpCLFFBQUFBLENBQUMsQ0FBQyxZQUFELEVBQWVBLENBQUMsQ0FBQ3lCLENBQUMsQ0FBQ0MsTUFBSCxDQUFELENBQVlDLE9BQVosRUFBZixDQUFELENBQXVDQyxLQUF2QztBQUNBLE9BRkQ7QUFJQTVCLE1BQUFBLENBQUMsQ0FBQyxZQUFELEVBQWUsa0JBQWYsQ0FBRCxDQUFvQ3dCLEVBQXBDLENBQXVDLFFBQXZDLEVBQWlELFVBQUNDLENBQUQsRUFBTztBQUN2RCxZQUFJQSxDQUFDLENBQUNDLE1BQUYsQ0FBU0csS0FBVCxDQUFlLENBQWYsTUFBc0JDLFNBQTFCLEVBQXFDO0FBQ3BDLGNBQU1DLFFBQVEsR0FBR04sQ0FBQyxDQUFDQyxNQUFGLENBQVNHLEtBQVQsQ0FBZSxDQUFmLEVBQWtCRyxJQUFuQztBQUNBaEMsVUFBQUEsQ0FBQyxDQUFDLFlBQUQsRUFBZUEsQ0FBQyxDQUFDeUIsQ0FBQyxDQUFDQyxNQUFILENBQUQsQ0FBWU8sTUFBWixFQUFmLENBQUQsQ0FBc0NDLEdBQXRDLENBQTBDSCxRQUExQztBQUNBcEIsVUFBQUEsU0FBUyxDQUFDRSxhQUFWLENBQXdCUCxXQUF4QixDQUFvQyxVQUFwQztBQUNBO0FBQ0QsT0FORDtBQU9BSyxNQUFBQSxTQUFTLENBQUNFLGFBQVYsQ0FBd0JXLEVBQXhCLENBQTJCLE9BQTNCLEVBQW9DLFVBQUNDLENBQUQsRUFBTztBQUMxQ0EsUUFBQUEsQ0FBQyxDQUFDVSxjQUFGO0FBQ0EsWUFBSXhCLFNBQVMsQ0FBQ0UsYUFBVixDQUF3QnVCLFFBQXhCLENBQWlDLFNBQWpDLEtBQStDekIsU0FBUyxDQUFDUSxpQkFBN0QsRUFBZ0Y7QUFFaEZSLFFBQUFBLFNBQVMsQ0FBQ0MsUUFBVixDQUNFeUIsSUFERixDQUNPO0FBQ0xiLFVBQUFBLEVBQUUsRUFBRSxNQURDO0FBRUxjLFVBQUFBLE1BQU0sRUFBRTNCLFNBQVMsQ0FBQzRCLGFBRmI7QUFHTEMsVUFBQUEsU0FISztBQUFBLGlDQUdPO0FBQ1g3QixjQUFBQSxTQUFTLENBQUNPLGlCQUFWLENBQ0VLLEtBREYsQ0FDUTtBQUNOa0IsZ0JBQUFBLFFBQVEsRUFBRSxLQURKO0FBRU5DLGdCQUFBQSxNQUFNO0FBQUU7QUFBQSwyQkFBTSxJQUFOO0FBQUE7O0FBQUY7QUFBQSxtQkFGQTtBQUdOQyxnQkFBQUEsU0FBUztBQUFFLHVDQUFNO0FBQ2hCaEMsb0JBQUFBLFNBQVMsQ0FBQ0UsYUFBVixDQUF3QlIsUUFBeEIsQ0FBaUMsU0FBakM7QUFDQU0sb0JBQUFBLFNBQVMsQ0FBQ1EsaUJBQVYsR0FBOEIsSUFBOUI7QUFDQSx3QkFBTXlCLElBQUksR0FBRzVDLENBQUMsQ0FBQyxZQUFELENBQUQsQ0FBZ0IsQ0FBaEIsRUFBbUI2QixLQUFuQixDQUF5QixDQUF6QixDQUFiO0FBQ0FwQyxvQkFBQUEsTUFBTSxDQUFDb0QsYUFBUCxDQUFxQkQsSUFBckIsRUFBMkJqQyxTQUFTLENBQUNtQyxpQkFBckM7QUFDQSwyQkFBTyxJQUFQO0FBQ0E7O0FBTlE7QUFBQTtBQUhILGVBRFIsRUFZRXZCLEtBWkYsQ0FZUSxNQVpSO0FBYUE7O0FBakJJO0FBQUE7QUFBQSxTQURQO0FBb0JBWixRQUFBQSxTQUFTLENBQUNDLFFBQVYsQ0FBbUJ5QixJQUFuQixDQUF3QixlQUF4QjtBQUNBLE9BekJEO0FBMEJBLFVBQU1VLFdBQVcsR0FBRztBQUNuQkMsUUFBQUEsSUFBSSxFQUFFLFVBRGE7QUFFbkJDLFFBQUFBLE1BQU0sRUFBRWhDLGdCQUZXO0FBR25CaUMsUUFBQUEsUUFBUSxFQUFFQztBQUhTLE9BQXBCO0FBS0FuRCxNQUFBQSxDQUFDLENBQUNvRCxHQUFGLENBQU07QUFDTEMsUUFBQUEsR0FBRyxFQUFFLDJCQURBO0FBRUw3QixRQUFBQSxFQUFFLEVBQUUsS0FGQztBQUdMOEIsUUFBQUEsTUFBTSxFQUFFLE1BSEg7QUFJTFYsUUFBQUEsSUFBSSxFQUFFRyxXQUpEO0FBS0xRLFFBQUFBLFdBTEs7QUFBQSwrQkFLTzNELFFBTFAsRUFLaUI7QUFDckI7QUFDQSxtQkFBT0EsUUFBUSxLQUFLa0MsU0FBYixJQUNIMEIsTUFBTSxDQUFDQyxJQUFQLENBQVk3RCxRQUFaLEVBQXNCRSxNQUF0QixHQUErQixDQUQ1QixJQUVIRixRQUFRLENBQUM4RCxNQUFULENBQWdCQyxXQUFoQixPQUFrQyxTQUZ0QztBQUdBOztBQVZJO0FBQUE7QUFXTG5CLFFBQUFBLFNBWEs7QUFBQSw2QkFXSzVDLFFBWEwsRUFXZTtBQUNuQixnQkFBTWdFLGNBQWMsR0FBR2pELFNBQVMsQ0FBQ0ssY0FBVixDQUF5QjZDLE9BQXpCLENBQWlDLEtBQWpDLEVBQXdDLEVBQXhDLENBQXZCO0FBQ0FqRSxZQUFBQSxRQUFRLENBQUNrRSxRQUFULENBQWtCQyxPQUFsQixDQUEwQixVQUFDQyxHQUFELEVBQVM7QUFDbEMsa0JBQU1DLE9BQU8sR0FBR0QsR0FBRyxDQUFDQyxPQUFKLENBQVlKLE9BQVosQ0FBb0IsS0FBcEIsRUFBMkIsRUFBM0IsQ0FBaEI7O0FBQ0Esa0JBQUlLLFFBQVEsQ0FBQ0QsT0FBRCxFQUFVLEVBQVYsQ0FBUixHQUF3QkMsUUFBUSxDQUFDTixjQUFELEVBQWlCLEVBQWpCLENBQXBDLEVBQTBEO0FBQ3pEakQsZ0JBQUFBLFNBQVMsQ0FBQ3dELHdCQUFWLENBQW1DSCxHQUFuQztBQUNBO0FBQ0QsYUFMRDtBQU9BaEUsWUFBQUEsQ0FBQyxDQUFDLFFBQUQsQ0FBRCxDQUFZd0IsRUFBWixDQUFlLE9BQWYsRUFBd0IsVUFBQ0MsQ0FBRCxFQUFPO0FBQzlCQSxjQUFBQSxDQUFDLENBQUNVLGNBQUY7QUFDQSxrQkFBSXhCLFNBQVMsQ0FBQ0UsYUFBVixDQUF3QnVCLFFBQXhCLENBQWlDLFNBQWpDLEtBQStDekIsU0FBUyxDQUFDUSxpQkFBN0QsRUFBZ0Y7QUFDaEZSLGNBQUFBLFNBQVMsQ0FBQ08saUJBQVYsQ0FDRUssS0FERixDQUNRO0FBQ05rQixnQkFBQUEsUUFBUSxFQUFFLEtBREo7QUFFTkMsZ0JBQUFBLE1BQU07QUFBRTtBQUFBLDJCQUFNLElBQU47QUFBQTs7QUFBRjtBQUFBLG1CQUZBO0FBR05DLGdCQUFBQSxTQUFTO0FBQUUsdUNBQU07QUFDaEIsd0JBQU15QixNQUFNLEdBQUcsRUFBZjtBQUNBLHdCQUFNQyxNQUFNLEdBQUdyRSxDQUFDLENBQUN5QixDQUFDLENBQUNDLE1BQUgsQ0FBRCxDQUFZekIsT0FBWixDQUFvQixHQUFwQixDQUFmO0FBQ0FtRSxvQkFBQUEsTUFBTSxDQUFDRSxVQUFQLEdBQW9CRCxNQUFNLENBQUNFLElBQVAsQ0FBWSxNQUFaLENBQXBCO0FBQ0FILG9CQUFBQSxNQUFNLENBQUNJLEdBQVAsR0FBYUgsTUFBTSxDQUFDRSxJQUFQLENBQVksVUFBWixDQUFiO0FBQ0FILG9CQUFBQSxNQUFNLENBQUNLLElBQVAsR0FBY0osTUFBTSxDQUFDRSxJQUFQLENBQVksV0FBWixDQUFkO0FBQ0FGLG9CQUFBQSxNQUFNLENBQUNuRSxJQUFQLENBQVksR0FBWixFQUFpQkcsUUFBakIsQ0FBMEIsU0FBMUI7QUFDQU0sb0JBQUFBLFNBQVMsQ0FBQ1EsaUJBQVYsR0FBOEIsSUFBOUI7QUFDQTFCLG9CQUFBQSxNQUFNLENBQUNpRixtQkFBUCxDQUEyQk4sTUFBM0IsRUFBbUN6RCxTQUFTLENBQUNnRSx5QkFBN0M7QUFDQSwyQkFBTyxJQUFQO0FBQ0E7O0FBVlE7QUFBQTtBQUhILGVBRFIsRUFnQkVwRCxLQWhCRixDQWdCUSxNQWhCUjtBQWlCQSxhQXBCRDtBQXFCQTs7QUF6Q0k7QUFBQTtBQUFBLE9BQU47QUEyQ0E7O0FBakdnQjtBQUFBO0FBa0dqQnVCLEVBQUFBLGlCQWxHaUI7QUFBQSwrQkFrR0NsRCxRQWxHRCxFQWtHVztBQUMzQixVQUFJQSxRQUFRLENBQUNFLE1BQVQsS0FBb0IsQ0FBcEIsSUFBeUJGLFFBQVEsS0FBSyxLQUExQyxFQUFpRDtBQUNoRGUsUUFBQUEsU0FBUyxDQUFDRSxhQUFWLENBQXdCUCxXQUF4QixDQUFvQyxTQUFwQztBQUNBSyxRQUFBQSxTQUFTLENBQUNRLGlCQUFWLEdBQThCLEtBQTlCO0FBQ0FaLFFBQUFBLFdBQVcsQ0FBQ0MsU0FBWixDQUFzQkMsZUFBZSxDQUFDbUUsZUFBdEM7QUFDQSxPQUpELE1BSU8sSUFBSWhGLFFBQVEsWUFBUixLQUFzQixpQkFBMUIsRUFBNkM7QUFDbkRlLFFBQUFBLFNBQVMsQ0FBQ0csWUFBVixDQUF1QitELFFBQXZCLENBQWdDO0FBQy9CQyxVQUFBQSxPQUFPLEVBQUVaLFFBQVEsQ0FBQ3RFLFFBQVEsQ0FBQ2tGLE9BQVYsRUFBbUIsRUFBbkI7QUFEYyxTQUFoQzs7QUFHQSxZQUFJbEYsUUFBUSxDQUFDa0YsT0FBVCxHQUFtQixHQUF2QixFQUE0QjtBQUMzQm5FLFVBQUFBLFNBQVMsQ0FBQ0ksaUJBQVYsQ0FBNEJaLElBQTVCLENBQWlDTSxlQUFlLENBQUNzRSxvQkFBakQ7QUFDQSxTQUZELE1BRU87QUFDTnBFLFVBQUFBLFNBQVMsQ0FBQ0ksaUJBQVYsQ0FBNEJaLElBQTVCLENBQWlDTSxlQUFlLENBQUN1RSxxQkFBakQ7QUFDQTtBQUNEO0FBQ0Q7O0FBakhnQjtBQUFBOztBQWtIakI7Ozs7QUFJQUwsRUFBQUEseUJBdEhpQjtBQUFBLHVDQXNIUy9FLFFBdEhULEVBc0htQjtBQUNuQyxVQUFJQSxRQUFRLEtBQUssSUFBakIsRUFBdUI7QUFDdEJiLFFBQUFBLHVCQUF1QixDQUFDSSxVQUF4QjtBQUNBLE9BRkQsTUFFTztBQUNOd0IsUUFBQUEsU0FBUyxDQUFDUSxpQkFBVixHQUE4QixLQUE5QjtBQUNBbkIsUUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JNLFdBQXBCLENBQWdDLFNBQWhDO0FBQ0E7QUFDRDs7QUE3SGdCO0FBQUE7QUE4SGpCNkQsRUFBQUEsd0JBOUhpQjtBQUFBLHNDQThIUUgsR0E5SFIsRUE4SGE7QUFDN0JoRSxNQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQmlGLElBQTNCO0FBQ0EsVUFBSUMsWUFBWSxHQUFHQyxrQkFBa0IsQ0FBQ25CLEdBQUcsQ0FBQ29CLFdBQUwsQ0FBckM7QUFDQUYsTUFBQUEsWUFBWSxHQUFHQSxZQUFZLENBQUNyQixPQUFiLENBQXFCLE9BQXJCLEVBQThCLElBQTlCLENBQWY7QUFDQXFCLE1BQUFBLFlBQVksR0FBR0EsWUFBWSxDQUFDckIsT0FBYixDQUFxQixRQUFyQixFQUErQixJQUEvQixDQUFmO0FBQ0FxQixNQUFBQSxZQUFZLEdBQUdBLFlBQVksQ0FBQ3JCLE9BQWIsQ0FBcUIsUUFBckIsRUFBK0IsR0FBL0IsQ0FBZjtBQUNBcUIsTUFBQUEsWUFBWSxHQUFHQSxZQUFZLENBQUNyQixPQUFiLENBQXFCLE9BQXJCLEVBQThCLEdBQTlCLENBQWY7QUFDQSxVQUFNd0IsSUFBSSxHQUFHMUUsU0FBUyxDQUFDUyxTQUFWLENBQW9Ca0UsUUFBcEIsQ0FBNkJKLFlBQTdCLENBQWI7QUFDQSxVQUFNSyxVQUFVLG1GQUVjdkIsR0FBRyxDQUFDQyxPQUZsQiw4QkFHVG9CLElBSFMsMkpBTUFyQixHQUFHLENBQUN3QixJQU5KLGdGQU9RL0UsZUFBZSxDQUFDZ0YsdUJBUHhCLHVDQVFBekIsR0FBRyxDQUFDUSxHQVJKLDZCQVF3QlIsR0FBRyxDQUFDUyxJQVI1Qix5SUFZSFQsR0FBRyxDQUFDd0IsSUFaRCxrRkFhSy9FLGVBQWUsQ0FBQ2lGLGtCQWJyQix1Q0FjQTFCLEdBQUcsQ0FBQ1EsR0FkSiw2QkFjd0JSLEdBQUcsQ0FBQ1MsSUFkNUIsa0dBQWhCO0FBbUJBekUsTUFBQUEsQ0FBQyxDQUFDLHNCQUFELENBQUQsQ0FBMEIyRixNQUExQixDQUFpQ0osVUFBakM7QUFDQXZGLE1BQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZTRGLEtBQWY7QUFDQTs7QUEzSmdCO0FBQUE7QUFBQSxDQUFsQjtBQStKQTVGLENBQUMsQ0FBQzZGLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJuRixFQUFBQSxTQUFTLENBQUN4QixVQUFWO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxQQlhWZXJzaW9uLCBnbG9iYWxUcmFuc2xhdGUsXG5nbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxQQlhWZXJzaW9uLCBzaG93ZG93biwgVXNlck1lc3NhZ2UgKi9cblxuY29uc3QgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDEwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHRpdGVyYXRpb25zOiAwLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLml0ZXJhdGlvbnMgPSAwO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRQYnhBcGkuU3lzdGVtR2V0VXBncmFkZVN0YXR1cyh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5jYlJlZnJlc2hVcGdyYWRlU3RhdHVzKTtcblx0fSxcblx0Y2JSZWZyZXNoVXBncmFkZVN0YXR1cyhyZXNwb25zZSkge1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLml0ZXJhdGlvbnMgKz0gMTtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlID1cblx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLndvcmtlciwgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZU91dCk7XG5cdFx0aWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCB8fCByZXNwb25zZSA9PT0gZmFsc2UpIHJldHVybjtcblx0XHRpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9JTl9QUk9HUkVTUycpIHtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuY2xvc2VzdCgnYScpLmZpbmQoJy5wZXJjZW50JykudGV4dChgJHtyZXNwb25zZS5kX3N0YXR1c19wcm9ncmVzc30lYCk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0NPTVBMRVRFJykge1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuY2xvc2VzdCgnYScpLmZpbmQoJy5wZXJjZW50JykudGV4dChgJHtyZXNwb25zZS5kX3N0YXR1c19wcm9ncmVzc30lYCk7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmFkZENsYXNzKCdzeW5jJykucmVtb3ZlQ2xhc3MoJ3JlZG8nKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnRE9XTkxPQURfRVJST1InKSB7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS51cGRfRG93bmxvYWRVcGdyYWRlRXJyb3IpO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5hZGRDbGFzcygncmVkbycpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fVxuXHR9LFxufTtcblxuXG5jb25zdCB1cGRhdGVQQlggPSB7XG5cdCRmb3JtT2JqOiAkKCcjdXBncmFkZS1mb3JtJyksXG5cdCRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblx0JHByb2dyZXNzQmFyOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLFxuXHQkcHJvZ3Jlc3NCYXJMYWJlbDogJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKS5maW5kKCcubGFiZWwnKSxcblx0Y3VycmVudFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24sXG5cdCRyZXN0b3JlTW9kYWxGb3JtOiAkKCcjdXBkYXRlLW1vZGFsLWZvcm0nKSxcblx0dXBncmFkZUluUHJvZ3Jlc3M6IGZhbHNlLFxuXHRjb252ZXJ0ZXI6IG5ldyBzaG93ZG93bi5Db252ZXJ0ZXIoKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm0ubW9kYWwoKTtcblx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHQkKCdpbnB1dDp0ZXh0LCAudWkuYnV0dG9uJywgJy51aS5hY3Rpb24uaW5wdXQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0JCgnaW5wdXQ6ZmlsZScsICQoZS50YXJnZXQpLnBhcmVudHMoKSkuY2xpY2soKTtcblx0XHR9KTtcblxuXHRcdCQoJ2lucHV0OmZpbGUnLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuXHRcdFx0aWYgKGUudGFyZ2V0LmZpbGVzWzBdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y29uc3QgZmlsZW5hbWUgPSBlLnRhcmdldC5maWxlc1swXS5uYW1lO1xuXHRcdFx0XHQkKCdpbnB1dDp0ZXh0JywgJChlLnRhcmdldCkucGFyZW50KCkpLnZhbChmaWxlbmFtZSk7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcblxuXHRcdFx0dXBkYXRlUEJYLiRmb3JtT2JqXG5cdFx0XHRcdC5mb3JtKHtcblx0XHRcdFx0XHRvbjogJ2JsdXInLFxuXHRcdFx0XHRcdGZpZWxkczogdXBkYXRlUEJYLnZhbGlkYXRlUnVsZXMsXG5cdFx0XHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRcdFx0dXBkYXRlUEJYLiRyZXN0b3JlTW9kYWxGb3JtXG5cdFx0XHRcdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0XHRcdFx0Y2xvc2FibGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRcdG9uRGVueTogKCkgPT4gdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgZGF0YSA9ICQoJ2lucHV0OmZpbGUnKVswXS5maWxlc1swXTtcblx0XHRcdFx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1VcGdyYWRlKGRhdGEsIHVwZGF0ZVBCWC5jYkFmdGVyVXBsb2FkRmlsZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KTtcblx0XHRcdHVwZGF0ZVBCWC4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG5cdFx0fSk7XG5cdFx0Y29uc3QgcmVxdWVzdERhdGEgPSB7XG5cdFx0XHRUWVBFOiAnRklSTVdBUkUnLFxuXHRcdFx0UEJYVkVSOiBnbG9iYWxQQlhWZXJzaW9uLFxuXHRcdFx0TEFOR1VBR0U6IGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsXG5cdFx0fTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6ICdodHRwczovL3VwZGF0ZS5hc2tvemlhLnJ1Jyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQudG9VcHBlckNhc2UoKSA9PT0gJ1NVQ0NFU1MnO1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjb25zdCBjdXJyZW50VmVyaXNvbiA9IHVwZGF0ZVBCWC5jdXJyZW50VmVyc2lvbi5yZXBsYWNlKC9cXEQvZywgJycpO1xuXHRcdFx0XHRyZXNwb25zZS5maXJtd2FyZS5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdFx0XHRjb25zdCB2ZXJzaW9uID0gb2JqLnZlcnNpb24ucmVwbGFjZSgvXFxEL2csICcnKTtcblx0XHRcdFx0XHRpZiAocGFyc2VJbnQodmVyc2lvbiwgMTApID4gcGFyc2VJbnQoY3VycmVudFZlcmlzb24sIDEwKSkge1xuXHRcdFx0XHRcdFx0dXBkYXRlUEJYLkFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbihvYmopO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0JCgnYS5yZWRvJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0aWYgKHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykgfHwgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzKSByZXR1cm47XG5cdFx0XHRcdFx0dXBkYXRlUEJYLiRyZXN0b3JlTW9kYWxGb3JtXG5cdFx0XHRcdFx0XHQubW9kYWwoe1xuXHRcdFx0XHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdG9uRGVueTogKCkgPT4gdHJ1ZSxcblx0XHRcdFx0XHRcdFx0b25BcHByb3ZlOiAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgcGFyYW1zID0gW107XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy51cGRhdGVMaW5rID0gJGFMaW5rLmF0dHIoJ2hyZWYnKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMubWQ1ID0gJGFMaW5rLmF0dHIoJ2RhdGEtbWQ1Jyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnNpemUgPSAkYUxpbmsuYXR0cignZGF0YS1zaXplJyk7XG5cdFx0XHRcdFx0XHRcdFx0JGFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbVVwZ3JhZGVPbmxpbmUocGFyYW1zLCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0VXBncmFkZU9ubGluZSk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0Lm1vZGFsKCdzaG93Jyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0Y2JBZnRlclVwbG9hZEZpbGUocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkge1xuXHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZnVuY3Rpb24gPT09ICd1cGxvYWRfcHJvZ3Jlc3MnKSB7XG5cdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcblx0XHRcdFx0cGVyY2VudDogcGFyc2VJbnQocmVzcG9uc2UucGVyY2VudCwgMTApLFxuXHRcdFx0fSk7XG5cdFx0XHRpZiAocmVzcG9uc2UucGVyY2VudCA8IDEwMCkge1xuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEluUHJvZ3Jlc3MpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGdyYWRlSW5Qcm9ncmVzcyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgc3RhcnQgb25saW5lIHVwZ3JhZGUgd2UgaGF2ZSB0byB3YWl0IGFuIGFuc3dlcixcblx0ICogYW5kIHRoZW4gc3RhcnQgc3RhdHVzIGNoZWNrIHdvcmtlclxuXHQgKi9cblx0Y2JBZnRlclN0YXJ0VXBncmFkZU9ubGluZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuXHRcdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9XG5cdH0sXG5cdEFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbihvYmopIHtcblx0XHQkKCcjb25saW5lLXVwZGF0ZXMtYmxvY2snKS5zaG93KCk7XG5cdFx0bGV0IG1hcmtkb3duVGV4dCA9IGRlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnI+L2csICdcXHInKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvPGJyID4vZywgJ1xccicpO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC9cXCogXFwqL2csICcqJyk7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKlxcKi9nLCAnKicpO1xuXHRcdGNvbnN0IGh0bWwgPSB1cGRhdGVQQlguY29udmVydGVyLm1ha2VIdG1sKG1hcmtkb3duVGV4dCk7XG5cdFx0Y29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cInVwZGF0ZS1yb3dcIj5cblx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0PHRkPiR7aHRtbH08L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiByZWRvIHBvcHVwZWRcIiBcbiAgICBcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmV9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCI+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdDwvYT5cblx0XHRcdFx0PGEgaHJlZj1cIiR7b2JqLmhyZWZ9XCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWQgcG9wdXBlZFwiIFxuXHRcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERvd25sb2FkfVwiXG5cdFx0XHRcdFx0ZGF0YS1tZDUgPVwiJHtvYmoubWQ1fVwiIGRhdGEtc2l6ZSA9XCIke29iai5zaXplfVwiPlxuXHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPlxuXHRcdFx0XHQ8L2E+XG4gICAgXHRcdDwvZGl2PiAgIFxuXHQ8L3RyPmA7XG5cdFx0JCgnI3VwZGF0ZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdFx0JCgnYS5wb3B1cGVkJykucG9wdXAoKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHR1cGRhdGVQQlguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==