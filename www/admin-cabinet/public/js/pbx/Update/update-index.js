"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global PbxApi, globalPBXVersion, globalTranslate,
globalPBXLanguage, globalPBXVersion, showdown, UserMessage */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwidGltZU91dCIsInRpbWVPdXRIYW5kbGUiLCJpdGVyYXRpb25zIiwiaW5pdGlhbGl6ZSIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4QXBpIiwiU3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsImNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMiLCJyZXNwb25zZSIsInNldFRpbWVvdXQiLCJsZW5ndGgiLCJkX3N0YXR1cyIsIiQiLCJjbG9zZXN0IiwiZmluZCIsInRleHQiLCJkX3N0YXR1c19wcm9ncmVzcyIsImFkZENsYXNzIiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsInVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvciIsInVwZGF0ZVBCWCIsIiRmb3JtT2JqIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc0JhckxhYmVsIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHJlc3RvcmVNb2RhbEZvcm0iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwibW9kYWwiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlcyIsInVuZGVmaW5lZCIsImZpbGVuYW1lIiwibmFtZSIsInBhcmVudCIsInZhbCIsInByZXZlbnREZWZhdWx0IiwiaGFzQ2xhc3MiLCJmb3JtIiwiZmllbGRzIiwidmFsaWRhdGVSdWxlcyIsIm9uU3VjY2VzcyIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwiZGF0YSIsIlN5c3RlbVVwZ3JhZGUiLCJjYkFmdGVyVXBsb2FkRmlsZSIsInJlcXVlc3REYXRhIiwiVFlQRSIsIlBCWFZFUiIsIkxBTkdVQUdFIiwiZ2xvYmFsUEJYTGFuZ3VhZ2UiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJzdWNjZXNzVGVzdCIsIk9iamVjdCIsImtleXMiLCJyZXN1bHQiLCJ0b1VwcGVyQ2FzZSIsImN1cnJlbnRWZXJpc29uIiwicmVwbGFjZSIsImZpcm13YXJlIiwiZm9yRWFjaCIsIm9iaiIsInZlcnNpb24iLCJwYXJzZUludCIsIkFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbiIsInBhcmFtcyIsIiRhTGluayIsInVwZGF0ZUxpbmsiLCJhdHRyIiwibWQ1Iiwic2l6ZSIsIlN5c3RlbVVwZ3JhZGVPbmxpbmUiLCJjYkFmdGVyU3RhcnRVcGdyYWRlT25saW5lIiwidXBkX1VwbG9hZEVycm9yIiwicHJvZ3Jlc3MiLCJwZXJjZW50IiwidXBkX1VwbG9hZEluUHJvZ3Jlc3MiLCJ1cGRfVXBncmFkZUluUHJvZ3Jlc3MiLCJzaG93IiwibWFya2Rvd25UZXh0IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZGVzY3JpcHRpb24iLCJodG1sIiwibWFrZUh0bWwiLCJkeW1hbmljUm93IiwiaHJlZiIsImJ0X1Rvb2xUaXBVcGdyYWRlT25saW5lIiwiYnRfVG9vbFRpcERvd25sb2FkIiwiYXBwZW5kIiwicG9wdXAiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBOztBQUdBLElBQU1BLHVCQUF1QixHQUFHO0FBQy9CQyxFQUFBQSxPQUFPLEVBQUUsSUFEc0I7QUFFL0JDLEVBQUFBLGFBQWEsRUFBRSxFQUZnQjtBQUcvQkMsRUFBQUEsVUFBVSxFQUFFLENBSG1CO0FBSS9CQyxFQUFBQSxVQUorQjtBQUFBLDBCQUlsQjtBQUNaSixNQUFBQSx1QkFBdUIsQ0FBQ0csVUFBeEIsR0FBcUMsQ0FBckM7QUFDQUgsTUFBQUEsdUJBQXVCLENBQUNLLGFBQXhCO0FBQ0E7O0FBUDhCO0FBQUE7QUFRL0JBLEVBQUFBLGFBUitCO0FBQUEsNkJBUWY7QUFDZkMsTUFBQUEsTUFBTSxDQUFDQyxZQUFQLENBQW9CUCx1QkFBdUIsQ0FBQ1EsYUFBNUM7QUFDQVIsTUFBQUEsdUJBQXVCLENBQUNTLE1BQXhCO0FBQ0E7O0FBWDhCO0FBQUE7QUFZL0JBLEVBQUFBLE1BWitCO0FBQUEsc0JBWXRCO0FBQ1JILE1BQUFBLE1BQU0sQ0FBQ0MsWUFBUCxDQUFvQlAsdUJBQXVCLENBQUNRLGFBQTVDO0FBQ0FFLE1BQUFBLE1BQU0sQ0FBQ0Msc0JBQVAsQ0FBOEJYLHVCQUF1QixDQUFDWSxzQkFBdEQ7QUFDQTs7QUFmOEI7QUFBQTtBQWdCL0JBLEVBQUFBLHNCQWhCK0I7QUFBQSxvQ0FnQlJDLFFBaEJRLEVBZ0JFO0FBQ2hDYixNQUFBQSx1QkFBdUIsQ0FBQ0csVUFBeEIsSUFBc0MsQ0FBdEM7QUFDQUgsTUFBQUEsdUJBQXVCLENBQUNRLGFBQXhCLEdBQ0NGLE1BQU0sQ0FBQ1EsVUFBUCxDQUFrQmQsdUJBQXVCLENBQUNTLE1BQTFDLEVBQWtEVCx1QkFBdUIsQ0FBQ0MsT0FBMUUsQ0FERDtBQUVBLFVBQUlZLFFBQVEsQ0FBQ0UsTUFBVCxLQUFvQixDQUFwQixJQUF5QkYsUUFBUSxLQUFLLEtBQTFDLEVBQWlEOztBQUNqRCxVQUFJQSxRQUFRLENBQUNHLFFBQVQsS0FBc0Isc0JBQTFCLEVBQWtEO0FBQ2pEQyxRQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQkMsT0FBcEIsQ0FBNEIsR0FBNUIsRUFBaUNDLElBQWpDLENBQXNDLFVBQXRDLEVBQWtEQyxJQUFsRCxXQUEwRFAsUUFBUSxDQUFDUSxpQkFBbkU7QUFDQSxPQUZELE1BRU8sSUFBSVIsUUFBUSxDQUFDRyxRQUFULEtBQXNCLG1CQUExQixFQUErQztBQUNyRFYsUUFBQUEsTUFBTSxDQUFDQyxZQUFQLENBQW9CUCx1QkFBdUIsQ0FBQ1EsYUFBNUM7QUFDQVMsUUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JDLE9BQXBCLENBQTRCLEdBQTVCLEVBQWlDQyxJQUFqQyxDQUFzQyxVQUF0QyxFQUFrREMsSUFBbEQsV0FBMERQLFFBQVEsQ0FBQ1EsaUJBQW5FO0FBQ0FKLFFBQUFBLENBQUMsQ0FBQyxnQkFBRCxDQUFELENBQW9CSyxRQUFwQixDQUE2QixNQUE3QixFQUFxQ0MsV0FBckMsQ0FBaUQsTUFBakQ7QUFDQSxPQUpNLE1BSUEsSUFBSVYsUUFBUSxDQUFDRyxRQUFULEtBQXNCLGdCQUExQixFQUE0QztBQUNsRFYsUUFBQUEsTUFBTSxDQUFDQyxZQUFQLENBQW9CUCx1QkFBdUIsQ0FBQ1EsYUFBNUM7QUFDQWdCLFFBQUFBLFdBQVcsQ0FBQ0MsU0FBWixDQUFzQkMsZUFBZSxDQUFDQyx3QkFBdEM7QUFDQVYsUUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JLLFFBQXBCLENBQTZCLE1BQTdCLEVBQXFDQyxXQUFyQyxDQUFpRCxTQUFqRDtBQUNBO0FBQ0Q7O0FBaEM4QjtBQUFBO0FBQUEsQ0FBaEM7QUFvQ0EsSUFBTUssU0FBUyxHQUFHO0FBQ2pCQyxFQUFBQSxRQUFRLEVBQUVaLENBQUMsQ0FBQyxlQUFELENBRE07QUFFakJhLEVBQUFBLGFBQWEsRUFBRWIsQ0FBQyxDQUFDLGVBQUQsQ0FGQztBQUdqQmMsRUFBQUEsWUFBWSxFQUFFZCxDQUFDLENBQUMsc0JBQUQsQ0FIRTtBQUlqQmUsRUFBQUEsaUJBQWlCLEVBQUVmLENBQUMsQ0FBQyxzQkFBRCxDQUFELENBQTBCRSxJQUExQixDQUErQixRQUEvQixDQUpGO0FBS2pCYyxFQUFBQSxjQUFjLEVBQUVDLGdCQUxDO0FBTWpCQyxFQUFBQSxpQkFBaUIsRUFBRWxCLENBQUMsQ0FBQyxvQkFBRCxDQU5IO0FBT2pCbUIsRUFBQUEsaUJBQWlCLEVBQUUsS0FQRjtBQVFqQkMsRUFBQUEsU0FBUyxFQUFFLElBQUlDLFFBQVEsQ0FBQ0MsU0FBYixFQVJNO0FBU2pCbkMsRUFBQUEsVUFUaUI7QUFBQSwwQkFTSjtBQUNad0IsTUFBQUEsU0FBUyxDQUFDTyxpQkFBVixDQUE0QkssS0FBNUI7QUFDQVosTUFBQUEsU0FBUyxDQUFDRSxhQUFWLENBQXdCUixRQUF4QixDQUFpQyxVQUFqQztBQUNBTCxNQUFBQSxDQUFDLENBQUMsd0JBQUQsRUFBMkIsa0JBQTNCLENBQUQsQ0FBZ0R3QixFQUFoRCxDQUFtRCxPQUFuRCxFQUE0RCxVQUFDQyxDQUFELEVBQU87QUFDbEV6QixRQUFBQSxDQUFDLENBQUMsWUFBRCxFQUFlQSxDQUFDLENBQUN5QixDQUFDLENBQUNDLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLEVBQWYsQ0FBRCxDQUF1Q0MsS0FBdkM7QUFDQSxPQUZEO0FBSUE1QixNQUFBQSxDQUFDLENBQUMsWUFBRCxFQUFlLGtCQUFmLENBQUQsQ0FBb0N3QixFQUFwQyxDQUF1QyxRQUF2QyxFQUFpRCxVQUFDQyxDQUFELEVBQU87QUFDdkQsWUFBSUEsQ0FBQyxDQUFDQyxNQUFGLENBQVNHLEtBQVQsQ0FBZSxDQUFmLE1BQXNCQyxTQUExQixFQUFxQztBQUNwQyxjQUFNQyxRQUFRLEdBQUdOLENBQUMsQ0FBQ0MsTUFBRixDQUFTRyxLQUFULENBQWUsQ0FBZixFQUFrQkcsSUFBbkM7QUFDQWhDLFVBQUFBLENBQUMsQ0FBQyxZQUFELEVBQWVBLENBQUMsQ0FBQ3lCLENBQUMsQ0FBQ0MsTUFBSCxDQUFELENBQVlPLE1BQVosRUFBZixDQUFELENBQXNDQyxHQUF0QyxDQUEwQ0gsUUFBMUM7QUFDQXBCLFVBQUFBLFNBQVMsQ0FBQ0UsYUFBVixDQUF3QlAsV0FBeEIsQ0FBb0MsVUFBcEM7QUFDQTtBQUNELE9BTkQ7QUFPQUssTUFBQUEsU0FBUyxDQUFDRSxhQUFWLENBQXdCVyxFQUF4QixDQUEyQixPQUEzQixFQUFvQyxVQUFDQyxDQUFELEVBQU87QUFDMUNBLFFBQUFBLENBQUMsQ0FBQ1UsY0FBRjtBQUNBLFlBQUl4QixTQUFTLENBQUNFLGFBQVYsQ0FBd0J1QixRQUF4QixDQUFpQyxTQUFqQyxLQUErQ3pCLFNBQVMsQ0FBQ1EsaUJBQTdELEVBQWdGO0FBRWhGUixRQUFBQSxTQUFTLENBQUNDLFFBQVYsQ0FDRXlCLElBREYsQ0FDTztBQUNMYixVQUFBQSxFQUFFLEVBQUUsTUFEQztBQUVMYyxVQUFBQSxNQUFNLEVBQUUzQixTQUFTLENBQUM0QixhQUZiO0FBR0xDLFVBQUFBLFNBSEs7QUFBQSxpQ0FHTztBQUNYN0IsY0FBQUEsU0FBUyxDQUFDTyxpQkFBVixDQUNFSyxLQURGLENBQ1E7QUFDTmtCLGdCQUFBQSxRQUFRLEVBQUUsS0FESjtBQUVOQyxnQkFBQUEsTUFBTTtBQUFFO0FBQUEsMkJBQU0sSUFBTjtBQUFBOztBQUFGO0FBQUEsbUJBRkE7QUFHTkMsZ0JBQUFBLFNBQVM7QUFBRSx1Q0FBTTtBQUNoQmhDLG9CQUFBQSxTQUFTLENBQUNFLGFBQVYsQ0FBd0JSLFFBQXhCLENBQWlDLFNBQWpDO0FBQ0FNLG9CQUFBQSxTQUFTLENBQUNRLGlCQUFWLEdBQThCLElBQTlCO0FBQ0Esd0JBQU15QixJQUFJLEdBQUc1QyxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCLENBQWhCLEVBQW1CNkIsS0FBbkIsQ0FBeUIsQ0FBekIsQ0FBYjtBQUNBcEMsb0JBQUFBLE1BQU0sQ0FBQ29ELGFBQVAsQ0FBcUJELElBQXJCLEVBQTJCakMsU0FBUyxDQUFDbUMsaUJBQXJDO0FBQ0EsMkJBQU8sSUFBUDtBQUNBOztBQU5RO0FBQUE7QUFISCxlQURSLEVBWUV2QixLQVpGLENBWVEsTUFaUjtBQWFBOztBQWpCSTtBQUFBO0FBQUEsU0FEUDtBQW9CQVosUUFBQUEsU0FBUyxDQUFDQyxRQUFWLENBQW1CeUIsSUFBbkIsQ0FBd0IsZUFBeEI7QUFDQSxPQXpCRDtBQTBCQSxVQUFNVSxXQUFXLEdBQUc7QUFDbkJDLFFBQUFBLElBQUksRUFBRSxVQURhO0FBRW5CQyxRQUFBQSxNQUFNLEVBQUVoQyxnQkFGVztBQUduQmlDLFFBQUFBLFFBQVEsRUFBRUM7QUFIUyxPQUFwQjtBQUtBbkQsTUFBQUEsQ0FBQyxDQUFDb0QsR0FBRixDQUFNO0FBQ0xDLFFBQUFBLEdBQUcsRUFBRSwyQkFEQTtBQUVMN0IsUUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTDhCLFFBQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUxWLFFBQUFBLElBQUksRUFBRUcsV0FKRDtBQUtMUSxRQUFBQSxXQUxLO0FBQUEsK0JBS08zRCxRQUxQLEVBS2lCO0FBQ3JCO0FBQ0EsbUJBQU9BLFFBQVEsS0FBS2tDLFNBQWIsSUFDSDBCLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZN0QsUUFBWixFQUFzQkUsTUFBdEIsR0FBK0IsQ0FENUIsSUFFSEYsUUFBUSxDQUFDOEQsTUFBVCxDQUFnQkMsV0FBaEIsT0FBa0MsU0FGdEM7QUFHQTs7QUFWSTtBQUFBO0FBV0xuQixRQUFBQSxTQVhLO0FBQUEsNkJBV0s1QyxRQVhMLEVBV2U7QUFDbkIsZ0JBQU1nRSxjQUFjLEdBQUdqRCxTQUFTLENBQUNLLGNBQVYsQ0FBeUI2QyxPQUF6QixDQUFpQyxLQUFqQyxFQUF3QyxFQUF4QyxDQUF2QjtBQUNBakUsWUFBQUEsUUFBUSxDQUFDa0UsUUFBVCxDQUFrQkMsT0FBbEIsQ0FBMEIsVUFBQ0MsR0FBRCxFQUFTO0FBQ2xDLGtCQUFNQyxPQUFPLEdBQUdELEdBQUcsQ0FBQ0MsT0FBSixDQUFZSixPQUFaLENBQW9CLEtBQXBCLEVBQTJCLEVBQTNCLENBQWhCOztBQUNBLGtCQUFJSyxRQUFRLENBQUNELE9BQUQsRUFBVSxFQUFWLENBQVIsR0FBd0JDLFFBQVEsQ0FBQ04sY0FBRCxFQUFpQixFQUFqQixDQUFwQyxFQUEwRDtBQUN6RGpELGdCQUFBQSxTQUFTLENBQUN3RCx3QkFBVixDQUFtQ0gsR0FBbkM7QUFDQTtBQUNELGFBTEQ7QUFPQWhFLFlBQUFBLENBQUMsQ0FBQyxRQUFELENBQUQsQ0FBWXdCLEVBQVosQ0FBZSxPQUFmLEVBQXdCLFVBQUNDLENBQUQsRUFBTztBQUM5QkEsY0FBQUEsQ0FBQyxDQUFDVSxjQUFGO0FBQ0Esa0JBQUl4QixTQUFTLENBQUNFLGFBQVYsQ0FBd0J1QixRQUF4QixDQUFpQyxTQUFqQyxLQUErQ3pCLFNBQVMsQ0FBQ1EsaUJBQTdELEVBQWdGO0FBQ2hGUixjQUFBQSxTQUFTLENBQUNPLGlCQUFWLENBQ0VLLEtBREYsQ0FDUTtBQUNOa0IsZ0JBQUFBLFFBQVEsRUFBRSxLQURKO0FBRU5DLGdCQUFBQSxNQUFNO0FBQUU7QUFBQSwyQkFBTSxJQUFOO0FBQUE7O0FBQUY7QUFBQSxtQkFGQTtBQUdOQyxnQkFBQUEsU0FBUztBQUFFLHVDQUFNO0FBQ2hCLHdCQUFNeUIsTUFBTSxHQUFHLEVBQWY7QUFDQSx3QkFBTUMsTUFBTSxHQUFHckUsQ0FBQyxDQUFDeUIsQ0FBQyxDQUFDQyxNQUFILENBQUQsQ0FBWXpCLE9BQVosQ0FBb0IsR0FBcEIsQ0FBZjtBQUNBbUUsb0JBQUFBLE1BQU0sQ0FBQ0UsVUFBUCxHQUFvQkQsTUFBTSxDQUFDRSxJQUFQLENBQVksTUFBWixDQUFwQjtBQUNBSCxvQkFBQUEsTUFBTSxDQUFDSSxHQUFQLEdBQWFILE1BQU0sQ0FBQ0UsSUFBUCxDQUFZLFVBQVosQ0FBYjtBQUNBSCxvQkFBQUEsTUFBTSxDQUFDSyxJQUFQLEdBQWNKLE1BQU0sQ0FBQ0UsSUFBUCxDQUFZLFdBQVosQ0FBZDtBQUNBRixvQkFBQUEsTUFBTSxDQUFDbkUsSUFBUCxDQUFZLEdBQVosRUFBaUJHLFFBQWpCLENBQTBCLFNBQTFCO0FBQ0FNLG9CQUFBQSxTQUFTLENBQUNRLGlCQUFWLEdBQThCLElBQTlCO0FBQ0ExQixvQkFBQUEsTUFBTSxDQUFDaUYsbUJBQVAsQ0FBMkJOLE1BQTNCLEVBQW1DekQsU0FBUyxDQUFDZ0UseUJBQTdDO0FBQ0EsMkJBQU8sSUFBUDtBQUNBOztBQVZRO0FBQUE7QUFISCxlQURSLEVBZ0JFcEQsS0FoQkYsQ0FnQlEsTUFoQlI7QUFpQkEsYUFwQkQ7QUFxQkE7O0FBekNJO0FBQUE7QUFBQSxPQUFOO0FBMkNBOztBQWpHZ0I7QUFBQTtBQWtHakJ1QixFQUFBQSxpQkFsR2lCO0FBQUEsK0JBa0dDbEQsUUFsR0QsRUFrR1c7QUFDM0IsVUFBSUEsUUFBUSxDQUFDRSxNQUFULEtBQW9CLENBQXBCLElBQXlCRixRQUFRLEtBQUssS0FBMUMsRUFBaUQ7QUFDaERlLFFBQUFBLFNBQVMsQ0FBQ0UsYUFBVixDQUF3QlAsV0FBeEIsQ0FBb0MsU0FBcEM7QUFDQUssUUFBQUEsU0FBUyxDQUFDUSxpQkFBVixHQUE4QixLQUE5QjtBQUNBWixRQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0JDLGVBQWUsQ0FBQ21FLGVBQXRDO0FBQ0EsT0FKRCxNQUlPLElBQUloRixRQUFRLFlBQVIsS0FBc0IsaUJBQTFCLEVBQTZDO0FBQ25EZSxRQUFBQSxTQUFTLENBQUNHLFlBQVYsQ0FBdUIrRCxRQUF2QixDQUFnQztBQUMvQkMsVUFBQUEsT0FBTyxFQUFFWixRQUFRLENBQUN0RSxRQUFRLENBQUNrRixPQUFWLEVBQW1CLEVBQW5CO0FBRGMsU0FBaEM7O0FBR0EsWUFBSWxGLFFBQVEsQ0FBQ2tGLE9BQVQsR0FBbUIsR0FBdkIsRUFBNEI7QUFDM0JuRSxVQUFBQSxTQUFTLENBQUNJLGlCQUFWLENBQTRCWixJQUE1QixDQUFpQ00sZUFBZSxDQUFDc0Usb0JBQWpEO0FBQ0EsU0FGRCxNQUVPO0FBQ05wRSxVQUFBQSxTQUFTLENBQUNJLGlCQUFWLENBQTRCWixJQUE1QixDQUFpQ00sZUFBZSxDQUFDdUUscUJBQWpEO0FBQ0E7QUFDRDtBQUNEOztBQWpIZ0I7QUFBQTs7QUFrSGpCOzs7O0FBSUFMLEVBQUFBLHlCQXRIaUI7QUFBQSx1Q0FzSFMvRSxRQXRIVCxFQXNIbUI7QUFDbkMsVUFBSUEsUUFBUSxLQUFLLElBQWpCLEVBQXVCO0FBQ3RCYixRQUFBQSx1QkFBdUIsQ0FBQ0ksVUFBeEI7QUFDQSxPQUZELE1BRU87QUFDTndCLFFBQUFBLFNBQVMsQ0FBQ1EsaUJBQVYsR0FBOEIsS0FBOUI7QUFDQW5CLFFBQUFBLENBQUMsQ0FBQyxnQkFBRCxDQUFELENBQW9CTSxXQUFwQixDQUFnQyxTQUFoQztBQUNBO0FBQ0Q7O0FBN0hnQjtBQUFBO0FBOEhqQjZELEVBQUFBLHdCQTlIaUI7QUFBQSxzQ0E4SFFILEdBOUhSLEVBOEhhO0FBQzdCaEUsTUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkJpRixJQUEzQjtBQUNBLFVBQUlDLFlBQVksR0FBR0Msa0JBQWtCLENBQUNuQixHQUFHLENBQUNvQixXQUFMLENBQXJDO0FBQ0FGLE1BQUFBLFlBQVksR0FBR0EsWUFBWSxDQUFDckIsT0FBYixDQUFxQixPQUFyQixFQUE4QixJQUE5QixDQUFmO0FBQ0FxQixNQUFBQSxZQUFZLEdBQUdBLFlBQVksQ0FBQ3JCLE9BQWIsQ0FBcUIsUUFBckIsRUFBK0IsSUFBL0IsQ0FBZjtBQUNBcUIsTUFBQUEsWUFBWSxHQUFHQSxZQUFZLENBQUNyQixPQUFiLENBQXFCLFFBQXJCLEVBQStCLEdBQS9CLENBQWY7QUFDQXFCLE1BQUFBLFlBQVksR0FBR0EsWUFBWSxDQUFDckIsT0FBYixDQUFxQixPQUFyQixFQUE4QixHQUE5QixDQUFmO0FBQ0EsVUFBTXdCLElBQUksR0FBRzFFLFNBQVMsQ0FBQ1MsU0FBVixDQUFvQmtFLFFBQXBCLENBQTZCSixZQUE3QixDQUFiO0FBQ0EsVUFBTUssVUFBVSxtRkFFY3ZCLEdBQUcsQ0FBQ0MsT0FGbEIsOEJBR1RvQixJQUhTLDJKQU1BckIsR0FBRyxDQUFDd0IsSUFOSixnRkFPUS9FLGVBQWUsQ0FBQ2dGLHVCQVB4Qix1Q0FRQXpCLEdBQUcsQ0FBQ1EsR0FSSiw2QkFRd0JSLEdBQUcsQ0FBQ1MsSUFSNUIseUlBWUhULEdBQUcsQ0FBQ3dCLElBWkQsa0ZBYUsvRSxlQUFlLENBQUNpRixrQkFickIsdUNBY0ExQixHQUFHLENBQUNRLEdBZEosNkJBY3dCUixHQUFHLENBQUNTLElBZDVCLGtHQUFoQjtBQW1CQXpFLE1BQUFBLENBQUMsQ0FBQyxzQkFBRCxDQUFELENBQTBCMkYsTUFBMUIsQ0FBaUNKLFVBQWpDO0FBQ0F2RixNQUFBQSxDQUFDLENBQUMsV0FBRCxDQUFELENBQWU0RixLQUFmO0FBQ0E7O0FBM0pnQjtBQUFBO0FBQUEsQ0FBbEI7QUErSkE1RixDQUFDLENBQUM2RixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCbkYsRUFBQUEsU0FBUyxDQUFDeEIsVUFBVjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsUEJYVmVyc2lvbiwgZ2xvYmFsVHJhbnNsYXRlLFxuZ2xvYmFsUEJYTGFuZ3VhZ2UsIGdsb2JhbFBCWFZlcnNpb24sIHNob3dkb3duLCBVc2VyTWVzc2FnZSAqL1xuXG5jb25zdCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciA9IHtcblx0dGltZU91dDogMTAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGl0ZXJhdGlvbnM6IDAsXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaXRlcmF0aW9ucyA9IDA7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFBieEFwaS5TeXN0ZW1HZXRVcGdyYWRlU3RhdHVzKHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMpO1xuXHR9LFxuXHRjYlJlZnJlc2hVcGdyYWRlU3RhdHVzKHJlc3BvbnNlKSB7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaXRlcmF0aW9ucyArPSAxO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUgPVxuXHRcdFx0d2luZG93LnNldFRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIud29ya2VyLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lT3V0KTtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0lOX1BST0dSRVNTJykge1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5jbG9zZXN0KCdhJykuZmluZCgnLnBlcmNlbnQnKS50ZXh0KGAke3Jlc3BvbnNlLmRfc3RhdHVzX3Byb2dyZXNzfSVgKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnRE9XTkxPQURfQ09NUExFVEUnKSB7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5jbG9zZXN0KCdhJykuZmluZCgnLnBlcmNlbnQnKS50ZXh0KGAke3Jlc3BvbnNlLmRfc3RhdHVzX3Byb2dyZXNzfSVgKTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuYWRkQ2xhc3MoJ3N5bmMnKS5yZW1vdmVDbGFzcygncmVkbycpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9FUlJPUicpIHtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvcik7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmFkZENsYXNzKCdyZWRvJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9XG5cdH0sXG59O1xuXG5cbmNvbnN0IHVwZGF0ZVBCWCA9IHtcblx0JGZvcm1PYmo6ICQoJyN1cGdyYWRlLWZvcm0nKSxcblx0JHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXHQkcHJvZ3Jlc3NCYXI6ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyJyksXG5cdCRwcm9ncmVzc0JhckxhYmVsOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLmZpbmQoJy5sYWJlbCcpLFxuXHRjdXJyZW50VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbixcblx0JHJlc3RvcmVNb2RhbEZvcm06ICQoJyN1cGRhdGUtbW9kYWwtZm9ybScpLFxuXHR1cGdyYWRlSW5Qcm9ncmVzczogZmFsc2UsXG5cdGNvbnZlcnRlcjogbmV3IHNob3dkb3duLkNvbnZlcnRlcigpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHVwZGF0ZVBCWC4kcmVzdG9yZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdCQoJ2lucHV0OnRleHQsIC51aS5idXR0b24nLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHQkKCdpbnB1dDpmaWxlJywgJChlLnRhcmdldCkucGFyZW50cygpKS5jbGljaygpO1xuXHRcdH0pO1xuXG5cdFx0JCgnaW5wdXQ6ZmlsZScsICcudWkuYWN0aW9uLmlucHV0Jykub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHRpZiAoZS50YXJnZXQuZmlsZXNbMF0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjb25zdCBmaWxlbmFtZSA9IGUudGFyZ2V0LmZpbGVzWzBdLm5hbWU7XG5cdFx0XHRcdCQoJ2lucHV0OnRleHQnLCAkKGUudGFyZ2V0KS5wYXJlbnQoKSkudmFsKGZpbGVuYW1lKTtcblx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGlmICh1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpIHx8IHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcykgcmV0dXJuO1xuXG5cdFx0XHR1cGRhdGVQQlguJGZvcm1PYmpcblx0XHRcdFx0LmZvcm0oe1xuXHRcdFx0XHRcdG9uOiAnYmx1cicsXG5cdFx0XHRcdFx0ZmllbGRzOiB1cGRhdGVQQlgudmFsaWRhdGVSdWxlcyxcblx0XHRcdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm1cblx0XHRcdFx0XHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0XHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdFx0b25EZW55OiAoKSA9PiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBkYXRhID0gJCgnaW5wdXQ6ZmlsZScpWzBdLmZpbGVzWzBdO1xuXHRcdFx0XHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbVVwZ3JhZGUoZGF0YSwgdXBkYXRlUEJYLmNiQWZ0ZXJVcGxvYWRGaWxlKTtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdC5tb2RhbCgnc2hvdycpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0dXBkYXRlUEJYLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcblx0XHR9KTtcblx0XHRjb25zdCByZXF1ZXN0RGF0YSA9IHtcblx0XHRcdFRZUEU6ICdGSVJNV0FSRScsXG5cdFx0XHRQQlhWRVI6IGdsb2JhbFBCWFZlcnNpb24sXG5cdFx0XHRMQU5HVUFHRTogZ2xvYmFsUEJYTGFuZ3VhZ2UsXG5cdFx0fTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6ICdodHRwczovL3VwZGF0ZS5hc2tvemlhLnJ1Jyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQudG9VcHBlckNhc2UoKSA9PT0gJ1NVQ0NFU1MnO1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjb25zdCBjdXJyZW50VmVyaXNvbiA9IHVwZGF0ZVBCWC5jdXJyZW50VmVyc2lvbi5yZXBsYWNlKC9cXEQvZywgJycpO1xuXHRcdFx0XHRyZXNwb25zZS5maXJtd2FyZS5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdFx0XHRjb25zdCB2ZXJzaW9uID0gb2JqLnZlcnNpb24ucmVwbGFjZSgvXFxEL2csICcnKTtcblx0XHRcdFx0XHRpZiAocGFyc2VJbnQodmVyc2lvbiwgMTApID4gcGFyc2VJbnQoY3VycmVudFZlcmlzb24sIDEwKSkge1xuXHRcdFx0XHRcdFx0dXBkYXRlUEJYLkFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbihvYmopO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0JCgnYS5yZWRvJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0aWYgKHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykgfHwgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzKSByZXR1cm47XG5cdFx0XHRcdFx0dXBkYXRlUEJYLiRyZXN0b3JlTW9kYWxGb3JtXG5cdFx0XHRcdFx0XHQubW9kYWwoe1xuXHRcdFx0XHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdG9uRGVueTogKCkgPT4gdHJ1ZSxcblx0XHRcdFx0XHRcdFx0b25BcHByb3ZlOiAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgcGFyYW1zID0gW107XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy51cGRhdGVMaW5rID0gJGFMaW5rLmF0dHIoJ2hyZWYnKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMubWQ1ID0gJGFMaW5rLmF0dHIoJ2RhdGEtbWQ1Jyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnNpemUgPSAkYUxpbmsuYXR0cignZGF0YS1zaXplJyk7XG5cdFx0XHRcdFx0XHRcdFx0JGFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbVVwZ3JhZGVPbmxpbmUocGFyYW1zLCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0VXBncmFkZU9ubGluZSk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0Lm1vZGFsKCdzaG93Jyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0Y2JBZnRlclVwbG9hZEZpbGUocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkge1xuXHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZnVuY3Rpb24gPT09ICd1cGxvYWRfcHJvZ3Jlc3MnKSB7XG5cdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcblx0XHRcdFx0cGVyY2VudDogcGFyc2VJbnQocmVzcG9uc2UucGVyY2VudCwgMTApLFxuXHRcdFx0fSk7XG5cdFx0XHRpZiAocmVzcG9uc2UucGVyY2VudCA8IDEwMCkge1xuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEluUHJvZ3Jlc3MpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGdyYWRlSW5Qcm9ncmVzcyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgc3RhcnQgb25saW5lIHVwZ3JhZGUgd2UgaGF2ZSB0byB3YWl0IGFuIGFuc3dlcixcblx0ICogYW5kIHRoZW4gc3RhcnQgc3RhdHVzIGNoZWNrIHdvcmtlclxuXHQgKi9cblx0Y2JBZnRlclN0YXJ0VXBncmFkZU9ubGluZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuXHRcdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9XG5cdH0sXG5cdEFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbihvYmopIHtcblx0XHQkKCcjb25saW5lLXVwZGF0ZXMtYmxvY2snKS5zaG93KCk7XG5cdFx0bGV0IG1hcmtkb3duVGV4dCA9IGRlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnI+L2csICdcXHInKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvPGJyID4vZywgJ1xccicpO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC9cXCogXFwqL2csICcqJyk7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKlxcKi9nLCAnKicpO1xuXHRcdGNvbnN0IGh0bWwgPSB1cGRhdGVQQlguY29udmVydGVyLm1ha2VIdG1sKG1hcmtkb3duVGV4dCk7XG5cdFx0Y29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cInVwZGF0ZS1yb3dcIj5cblx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0PHRkPiR7aHRtbH08L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiByZWRvIHBvcHVwZWRcIiBcbiAgICBcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmV9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCI+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdDwvYT5cblx0XHRcdFx0PGEgaHJlZj1cIiR7b2JqLmhyZWZ9XCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWQgcG9wdXBlZFwiIFxuXHRcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERvd25sb2FkfVwiXG5cdFx0XHRcdFx0ZGF0YS1tZDUgPVwiJHtvYmoubWQ1fVwiIGRhdGEtc2l6ZSA9XCIke29iai5zaXplfVwiPlxuXHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPlxuXHRcdFx0XHQ8L2E+XG4gICAgXHRcdDwvZGl2PiAgIFxuXHQ8L3RyPmA7XG5cdFx0JCgnI3VwZGF0ZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdFx0JCgnYS5wb3B1cGVkJykucG9wdXAoKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHR1cGRhdGVQQlguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==