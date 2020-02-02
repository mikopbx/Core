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

              if (version > currentVerison) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwidGltZU91dCIsInRpbWVPdXRIYW5kbGUiLCJpdGVyYXRpb25zIiwiaW5pdGlhbGl6ZSIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4QXBpIiwiU3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsImNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMiLCJyZXNwb25zZSIsInNldFRpbWVvdXQiLCJsZW5ndGgiLCJkX3N0YXR1cyIsIiQiLCJjbG9zZXN0IiwiZmluZCIsInRleHQiLCJkX3N0YXR1c19wcm9ncmVzcyIsImFkZENsYXNzIiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsInVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvciIsInVwZGF0ZVBCWCIsIiRmb3JtT2JqIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc0JhckxhYmVsIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHJlc3RvcmVNb2RhbEZvcm0iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwibW9kYWwiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlcyIsInVuZGVmaW5lZCIsImZpbGVuYW1lIiwibmFtZSIsInBhcmVudCIsInZhbCIsInByZXZlbnREZWZhdWx0IiwiaGFzQ2xhc3MiLCJmb3JtIiwiZmllbGRzIiwidmFsaWRhdGVSdWxlcyIsIm9uU3VjY2VzcyIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwiZGF0YSIsIlN5c3RlbVVwZ3JhZGUiLCJjYkFmdGVyVXBsb2FkRmlsZSIsInJlcXVlc3REYXRhIiwiVFlQRSIsIlBCWFZFUiIsIkxBTkdVQUdFIiwiZ2xvYmFsUEJYTGFuZ3VhZ2UiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJzdWNjZXNzVGVzdCIsIk9iamVjdCIsImtleXMiLCJyZXN1bHQiLCJ0b1VwcGVyQ2FzZSIsImN1cnJlbnRWZXJpc29uIiwicmVwbGFjZSIsImZpcm13YXJlIiwiZm9yRWFjaCIsIm9iaiIsInZlcnNpb24iLCJBZGROZXdWZXJzaW9uSW5mb3JtYXRpb24iLCJwYXJhbXMiLCIkYUxpbmsiLCJ1cGRhdGVMaW5rIiwiYXR0ciIsIm1kNSIsInNpemUiLCJTeXN0ZW1VcGdyYWRlT25saW5lIiwidXBkX1VwbG9hZEVycm9yIiwicHJvZ3Jlc3MiLCJwZXJjZW50IiwicGFyc2VJbnQiLCJ1cGRfVXBsb2FkSW5Qcm9ncmVzcyIsInVwZF9VcGdyYWRlSW5Qcm9ncmVzcyIsInNob3ciLCJtYXJrZG93blRleHQiLCJkZWNvZGVVUklDb21wb25lbnQiLCJkZXNjcmlwdGlvbiIsImh0bWwiLCJtYWtlSHRtbCIsImR5bWFuaWNSb3ciLCJocmVmIiwiYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmUiLCJidF9Ub29sVGlwRG93bmxvYWQiLCJhcHBlbmQiLCJwb3B1cCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7O0FBR0EsSUFBTUEsdUJBQXVCLEdBQUc7QUFDL0JDLEVBQUFBLE9BQU8sRUFBRSxJQURzQjtBQUUvQkMsRUFBQUEsYUFBYSxFQUFFLEVBRmdCO0FBRy9CQyxFQUFBQSxVQUFVLEVBQUUsQ0FIbUI7QUFJL0JDLEVBQUFBLFVBSitCO0FBQUEsMEJBSWxCO0FBQ1pKLE1BQUFBLHVCQUF1QixDQUFDRyxVQUF4QixHQUFxQyxDQUFyQztBQUNBSCxNQUFBQSx1QkFBdUIsQ0FBQ0ssYUFBeEI7QUFDQTs7QUFQOEI7QUFBQTtBQVEvQkEsRUFBQUEsYUFSK0I7QUFBQSw2QkFRZjtBQUNmQyxNQUFBQSxNQUFNLENBQUNDLFlBQVAsQ0FBb0JQLHVCQUF1QixD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O0FBQ0EsVUFBTUssVUFBVSxtRkFFY3RCLEdBQUcsQ0FBQ0MsT0FGbEIsOEJBR1RtQixJQUhTLDJKQU1BcEIsR0FBRyxDQUFDdUIsSUFOSixnRkFPUTlFLGVBQWUsQ0FBQytFLHVCQVB4Qix1Q0FRQXhCLEdBQUcsQ0FBQ08sR0FSSiw2QkFRd0JQLEdBQUcsQ0FBQ1EsSUFSNUIseUlBWUhSLEdBQUcsQ0FBQ3VCLElBWkQsa0ZBYUs5RSxlQUFlLENBQUNnRixrQkFickIsdUNBY0F6QixHQUFHLENBQUNPLEdBZEosNkJBY3dCUCxHQUFHLENBQUNRLElBZDVCLGtHQUFoQjtBQW1CQXhFLE1BQUFBLENBQUMsQ0FBQyxzQkFBRCxDQUFELENBQTBCMEYsTUFBMUIsQ0FBaUNKLFVBQWpDO0FBQ0F0RixNQUFBQSxDQUFDLENBQUMsV0FBRCxDQUFELENBQWUyRixLQUFmO0FBQ0E7O0FBaEpnQjtBQUFBO0FBQUEsQ0FBbEI7QUFvSkEzRixDQUFDLENBQUM0RixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCbEYsRUFBQUEsU0FBUyxDQUFDeEIsVUFBVjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsUEJYVmVyc2lvbiwgZ2xvYmFsVHJhbnNsYXRlLFxuZ2xvYmFsUEJYTGFuZ3VhZ2UsIGdsb2JhbFBCWFZlcnNpb24sIHNob3dkb3duLCBVc2VyTWVzc2FnZSAqL1xuXG5jb25zdCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciA9IHtcblx0dGltZU91dDogMTAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGl0ZXJhdGlvbnM6IDAsXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaXRlcmF0aW9ucyA9IDA7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFBieEFwaS5TeXN0ZW1HZXRVcGdyYWRlU3RhdHVzKHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMpO1xuXHR9LFxuXHRjYlJlZnJlc2hVcGdyYWRlU3RhdHVzKHJlc3BvbnNlKSB7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaXRlcmF0aW9ucyArPSAxO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUgPVxuXHRcdFx0d2luZG93LnNldFRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIud29ya2VyLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lT3V0KTtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0lOX1BST0dSRVNTJykge1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5jbG9zZXN0KCdhJykuZmluZCgnLnBlcmNlbnQnKS50ZXh0KGAke3Jlc3BvbnNlLmRfc3RhdHVzX3Byb2dyZXNzfSVgKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnRE9XTkxPQURfQ09NUExFVEUnKSB7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5jbG9zZXN0KCdhJykuZmluZCgnLnBlcmNlbnQnKS50ZXh0KGAke3Jlc3BvbnNlLmRfc3RhdHVzX3Byb2dyZXNzfSVgKTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuYWRkQ2xhc3MoJ3N5bmMnKS5yZW1vdmVDbGFzcygncmVkbycpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9FUlJPUicpIHtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvcik7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmFkZENsYXNzKCdyZWRvJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9XG5cdH0sXG59O1xuXG5cbmNvbnN0IHVwZGF0ZVBCWCA9IHtcblx0JGZvcm1PYmo6ICQoJyN1cGdyYWRlLWZvcm0nKSxcblx0JHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXHQkcHJvZ3Jlc3NCYXI6ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyJyksXG5cdCRwcm9ncmVzc0JhckxhYmVsOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLmZpbmQoJy5sYWJlbCcpLFxuXHRjdXJyZW50VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbixcblx0JHJlc3RvcmVNb2RhbEZvcm06ICQoJyN1cGRhdGUtbW9kYWwtZm9ybScpLFxuXHR1cGdyYWRlSW5Qcm9ncmVzczogZmFsc2UsXG5cdGNvbnZlcnRlcjogbmV3IHNob3dkb3duLkNvbnZlcnRlcigpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHVwZGF0ZVBCWC4kcmVzdG9yZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdCQoJ2lucHV0OnRleHQsIC51aS5idXR0b24nLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHQkKCdpbnB1dDpmaWxlJywgJChlLnRhcmdldCkucGFyZW50cygpKS5jbGljaygpO1xuXHRcdH0pO1xuXG5cdFx0JCgnaW5wdXQ6ZmlsZScsICcudWkuYWN0aW9uLmlucHV0Jykub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHRpZiAoZS50YXJnZXQuZmlsZXNbMF0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjb25zdCBmaWxlbmFtZSA9IGUudGFyZ2V0LmZpbGVzWzBdLm5hbWU7XG5cdFx0XHRcdCQoJ2lucHV0OnRleHQnLCAkKGUudGFyZ2V0KS5wYXJlbnQoKSkudmFsKGZpbGVuYW1lKTtcblx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGlmICh1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpIHx8IHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcykgcmV0dXJuO1xuXG5cdFx0XHR1cGRhdGVQQlguJGZvcm1PYmpcblx0XHRcdFx0LmZvcm0oe1xuXHRcdFx0XHRcdG9uOiAnYmx1cicsXG5cdFx0XHRcdFx0ZmllbGRzOiB1cGRhdGVQQlgudmFsaWRhdGVSdWxlcyxcblx0XHRcdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm1cblx0XHRcdFx0XHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0XHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdFx0b25EZW55OiAoKSA9PiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBkYXRhID0gJCgnaW5wdXQ6ZmlsZScpWzBdLmZpbGVzWzBdO1xuXHRcdFx0XHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbVVwZ3JhZGUoZGF0YSwgdXBkYXRlUEJYLmNiQWZ0ZXJVcGxvYWRGaWxlKTtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdC5tb2RhbCgnc2hvdycpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0dXBkYXRlUEJYLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcblx0XHR9KTtcblx0XHRjb25zdCByZXF1ZXN0RGF0YSA9IHtcblx0XHRcdFRZUEU6ICdGSVJNV0FSRScsXG5cdFx0XHRQQlhWRVI6IGdsb2JhbFBCWFZlcnNpb24sXG5cdFx0XHRMQU5HVUFHRTogZ2xvYmFsUEJYTGFuZ3VhZ2UsXG5cdFx0fTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6ICdodHRwczovL3VwZGF0ZS5hc2tvemlhLnJ1Jyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQudG9VcHBlckNhc2UoKSA9PT0gJ1NVQ0NFU1MnO1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjb25zdCBjdXJyZW50VmVyaXNvbiA9IHVwZGF0ZVBCWC5jdXJyZW50VmVyc2lvbi5yZXBsYWNlKC9cXEQvZywgJycpO1xuXHRcdFx0XHRyZXNwb25zZS5maXJtd2FyZS5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdFx0XHRjb25zdCB2ZXJzaW9uID0gb2JqLnZlcnNpb24ucmVwbGFjZSgvXFxEL2csICcnKTtcblx0XHRcdFx0XHRpZiAodmVyc2lvbiA+IGN1cnJlbnRWZXJpc29uKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVQQlguQWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkKCdhLnJlZG8nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcblx0XHRcdFx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm1cblx0XHRcdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0b25EZW55OiAoKSA9PiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBwYXJhbXMgPSBbXTtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnVwZGF0ZUxpbmsgPSAkYUxpbmsuYXR0cignaHJlZicpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy5tZDUgPSAkYUxpbmsuYXR0cignZGF0YS1tZDUnKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdFx0XHRcdFx0XHQkYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtVXBncmFkZU9ubGluZShwYXJhbXMpO1xuXHRcdFx0XHRcdFx0XHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHRjYkFmdGVyVXBsb2FkRmlsZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSB7XG5cdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5mdW5jdGlvbiA9PT0gJ3VwbG9hZF9wcm9ncmVzcycpIHtcblx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuXHRcdFx0XHRwZXJjZW50OiBwYXJzZUludChyZXNwb25zZS5wZXJjZW50LCAxMCksXG5cdFx0XHR9KTtcblx0XHRcdGlmIChyZXNwb25zZS5wZXJjZW50IDwgMTAwKSB7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkSW5Qcm9ncmVzcyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwZ3JhZGVJblByb2dyZXNzKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdEFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbihvYmopIHtcblx0XHQkKCcjb25saW5lLXVwZGF0ZXMtYmxvY2snKS5zaG93KCk7XG5cdFx0bGV0IG1hcmtkb3duVGV4dCA9IGRlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnI+L2csICdcXHInKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvPGJyID4vZywgJ1xccicpO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC9cXCogXFwqL2csICcqJyk7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKlxcKi9nLCAnKicpO1xuXHRcdGNvbnN0IGh0bWwgPSB1cGRhdGVQQlguY29udmVydGVyLm1ha2VIdG1sKG1hcmtkb3duVGV4dCk7XG5cdFx0Y29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cInVwZGF0ZS1yb3dcIj5cblx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0PHRkPiR7aHRtbH08L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiByZWRvIHBvcHVwZWRcIiBcbiAgICBcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmV9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCI+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdDwvYT5cblx0XHRcdFx0PGEgaHJlZj1cIiR7b2JqLmhyZWZ9XCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWQgcG9wdXBlZFwiIFxuXHRcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERvd25sb2FkfVwiXG5cdFx0XHRcdFx0ZGF0YS1tZDUgPVwiJHtvYmoubWQ1fVwiIGRhdGEtc2l6ZSA9XCIke29iai5zaXplfVwiPlxuXHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPlxuXHRcdFx0XHQ8L2E+XG4gICAgXHRcdDwvZGl2PiAgIFxuXHQ8L3RyPmA7XG5cdFx0JCgnI3VwZGF0ZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdFx0JCgnYS5wb3B1cGVkJykucG9wdXAoKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHR1cGRhdGVQQlguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==