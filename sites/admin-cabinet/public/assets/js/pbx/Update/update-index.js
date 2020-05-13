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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwidGltZU91dCIsInRpbWVPdXRIYW5kbGUiLCJpdGVyYXRpb25zIiwiaW5pdGlhbGl6ZSIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4QXBpIiwiU3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsImNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMiLCJyZXNwb25zZSIsInNldFRpbWVvdXQiLCJsZW5ndGgiLCJkX3N0YXR1cyIsIiQiLCJjbG9zZXN0IiwiZmluZCIsInRleHQiLCJkX3N0YXR1c19wcm9ncmVzcyIsImFkZENsYXNzIiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsInVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvciIsInVwZGF0ZVBCWCIsIiRmb3JtT2JqIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc0JhckxhYmVsIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHJlc3RvcmVNb2RhbEZvcm0iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwibW9kYWwiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlcyIsInVuZGVmaW5lZCIsImZpbGVuYW1lIiwibmFtZSIsInBhcmVudCIsInZhbCIsInByZXZlbnREZWZhdWx0IiwiaGFzQ2xhc3MiLCJmb3JtIiwiZmllbGRzIiwidmFsaWRhdGVSdWxlcyIsIm9uU3VjY2VzcyIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwiZGF0YSIsIlN5c3RlbVVwZ3JhZGUiLCJjYkFmdGVyVXBsb2FkRmlsZSIsInJlcXVlc3REYXRhIiwiVFlQRSIsIlBCWFZFUiIsIkxBTkdVQUdFIiwiZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSIsImFwaSIsInVybCIsIm1ldGhvZCIsInN1Y2Nlc3NUZXN0IiwiT2JqZWN0Iiwia2V5cyIsInJlc3VsdCIsImN1cnJlbnRWZXJpc29uIiwicmVwbGFjZSIsImZpcm13YXJlIiwiZm9yRWFjaCIsIm9iaiIsInZlcnNpb24iLCJwYXJzZUludCIsIkFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbiIsInBhcmFtcyIsIiRhTGluayIsInVwZGF0ZUxpbmsiLCJhdHRyIiwibWQ1Iiwic2l6ZSIsIlN5c3RlbVVwZ3JhZGVPbmxpbmUiLCJjYkFmdGVyU3RhcnRVcGdyYWRlT25saW5lIiwidXBkX1VwbG9hZEVycm9yIiwicHJvZ3Jlc3MiLCJwZXJjZW50IiwidXBkX1VwbG9hZEluUHJvZ3Jlc3MiLCJ1cGRfVXBncmFkZUluUHJvZ3Jlc3MiLCJzaG93IiwibWFya2Rvd25UZXh0IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZGVzY3JpcHRpb24iLCJodG1sIiwibWFrZUh0bWwiLCJkeW1hbmljUm93IiwiaHJlZiIsImJ0X1Rvb2xUaXBVcGdyYWRlT25saW5lIiwiYnRfVG9vbFRpcERvd25sb2FkIiwiYXBwZW5kIiwicG9wdXAiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBOztBQUdBLElBQU1BLHVCQUF1QixHQUFHO0FBQy9CQyxFQUFBQSxPQUFPLEVBQUUsSUFEc0I7QUFFL0JDLEVBQUFBLGFBQWEsRUFBRSxFQUZnQjtBQUcvQkMsRUFBQUEsVUFBVSxFQUFFLENBSG1CO0FBSS9CQyxFQUFBQSxVQUorQjtBQUFBLDBCQUlsQjtBQUNaSixNQUFBQSx1QkFBdUIsQ0FBQ0csVUFBeEIsR0FBcUMsQ0FBckM7QUFDQUgsTUFBQUEsdUJBQXVCLENBQUNLLGFBQXhCO0FBQ0E7O0FBUDhCO0FBQUE7QUFRL0JBLEVBQUFBLGFBUitCO0FBQUEsNkJBUWY7QUFDZkMsTUFBQUEsTUFBTSxDQUFDQyxZ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QUNyQixPQUFiLENBQXFCLE9BQXJCLEVBQThCLElBQTlCLENBQWY7QUFDQXFCLE1BQUFBLFlBQVksR0FBR0EsWUFBWSxDQUFDckIsT0FBYixDQUFxQixRQUFyQixFQUErQixJQUEvQixDQUFmO0FBQ0FxQixNQUFBQSxZQUFZLEdBQUdBLFlBQVksQ0FBQ3JCLE9BQWIsQ0FBcUIsUUFBckIsRUFBK0IsR0FBL0IsQ0FBZjtBQUNBcUIsTUFBQUEsWUFBWSxHQUFHQSxZQUFZLENBQUNyQixPQUFiLENBQXFCLE9BQXJCLEVBQThCLEdBQTlCLENBQWY7QUFDQSxVQUFNd0IsSUFBSSxHQUFHekUsU0FBUyxDQUFDUyxTQUFWLENBQW9CaUUsUUFBcEIsQ0FBNkJKLFlBQTdCLENBQWI7QUFDQSxVQUFNSyxVQUFVLG1GQUVjdkIsR0FBRyxDQUFDQyxPQUZsQiw4QkFHVG9CLElBSFMsMkpBTUFyQixHQUFHLENBQUN3QixJQU5KLGdGQU9ROUUsZUFBZSxDQUFDK0UsdUJBUHhCLHVDQVFBekIsR0FBRyxDQUFDUSxHQVJKLDZCQVF3QlIsR0FBRyxDQUFDUyxJQVI1Qix5SUFZSFQsR0FBRyxDQUFDd0IsSUFaRCxrRkFhSzlFLGVBQWUsQ0FBQ2dGLGtCQWJyQix1Q0FjQTFCLEdBQUcsQ0FBQ1EsR0FkSiw2QkFjd0JSLEdBQUcsQ0FBQ1MsSUFkNUIsa0dBQWhCO0FBbUJBeEUsTUFBQUEsQ0FBQyxDQUFDLHNCQUFELENBQUQsQ0FBMEIwRixNQUExQixDQUFpQ0osVUFBakM7QUFDQXRGLE1BQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZTJGLEtBQWY7QUFDQTs7QUEzSmdCO0FBQUE7QUFBQSxDQUFsQjtBQStKQTNGLENBQUMsQ0FBQzRGLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJsRixFQUFBQSxTQUFTLENBQUN4QixVQUFWO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxQQlhWZXJzaW9uLCBnbG9iYWxUcmFuc2xhdGUsXG5nbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxQQlhWZXJzaW9uLCBzaG93ZG93biwgVXNlck1lc3NhZ2UgKi9cblxuY29uc3QgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDEwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHRpdGVyYXRpb25zOiAwLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLml0ZXJhdGlvbnMgPSAwO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRQYnhBcGkuU3lzdGVtR2V0VXBncmFkZVN0YXR1cyh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5jYlJlZnJlc2hVcGdyYWRlU3RhdHVzKTtcblx0fSxcblx0Y2JSZWZyZXNoVXBncmFkZVN0YXR1cyhyZXNwb25zZSkge1xuXHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLml0ZXJhdGlvbnMgKz0gMTtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlID1cblx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLndvcmtlciwgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZU91dCk7XG5cdFx0aWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCB8fCByZXNwb25zZSA9PT0gZmFsc2UpIHJldHVybjtcblx0XHRpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9JTl9QUk9HUkVTUycpIHtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuY2xvc2VzdCgnYScpLmZpbmQoJy5wZXJjZW50JykudGV4dChgJHtyZXNwb25zZS5kX3N0YXR1c19wcm9ncmVzc30lYCk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0NPTVBMRVRFJykge1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuY2xvc2VzdCgnYScpLmZpbmQoJy5wZXJjZW50JykudGV4dChgJHtyZXNwb25zZS5kX3N0YXR1c19wcm9ncmVzc30lYCk7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmFkZENsYXNzKCdzeW5jJykucmVtb3ZlQ2xhc3MoJ3JlZG8nKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnRE9XTkxPQURfRVJST1InKSB7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS51cGRfRG93bmxvYWRVcGdyYWRlRXJyb3IpO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5hZGRDbGFzcygncmVkbycpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fVxuXHR9LFxufTtcblxuXG5jb25zdCB1cGRhdGVQQlggPSB7XG5cdCRmb3JtT2JqOiAkKCcjdXBncmFkZS1mb3JtJyksXG5cdCRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblx0JHByb2dyZXNzQmFyOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLFxuXHQkcHJvZ3Jlc3NCYXJMYWJlbDogJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKS5maW5kKCcubGFiZWwnKSxcblx0Y3VycmVudFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24sXG5cdCRyZXN0b3JlTW9kYWxGb3JtOiAkKCcjdXBkYXRlLW1vZGFsLWZvcm0nKSxcblx0dXBncmFkZUluUHJvZ3Jlc3M6IGZhbHNlLFxuXHRjb252ZXJ0ZXI6IG5ldyBzaG93ZG93bi5Db252ZXJ0ZXIoKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm0ubW9kYWwoKTtcblx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHQkKCdpbnB1dDp0ZXh0LCAudWkuYnV0dG9uJywgJy51aS5hY3Rpb24uaW5wdXQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0JCgnaW5wdXQ6ZmlsZScsICQoZS50YXJnZXQpLnBhcmVudHMoKSkuY2xpY2soKTtcblx0XHR9KTtcblxuXHRcdCQoJ2lucHV0OmZpbGUnLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuXHRcdFx0aWYgKGUudGFyZ2V0LmZpbGVzWzBdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y29uc3QgZmlsZW5hbWUgPSBlLnRhcmdldC5maWxlc1swXS5uYW1lO1xuXHRcdFx0XHQkKCdpbnB1dDp0ZXh0JywgJChlLnRhcmdldCkucGFyZW50KCkpLnZhbChmaWxlbmFtZSk7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcblxuXHRcdFx0dXBkYXRlUEJYLiRmb3JtT2JqXG5cdFx0XHRcdC5mb3JtKHtcblx0XHRcdFx0XHRvbjogJ2JsdXInLFxuXHRcdFx0XHRcdGZpZWxkczogdXBkYXRlUEJYLnZhbGlkYXRlUnVsZXMsXG5cdFx0XHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRcdFx0dXBkYXRlUEJYLiRyZXN0b3JlTW9kYWxGb3JtXG5cdFx0XHRcdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0XHRcdFx0Y2xvc2FibGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRcdG9uRGVueTogKCkgPT4gdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgZGF0YSA9ICQoJ2lucHV0OmZpbGUnKVswXS5maWxlc1swXTtcblx0XHRcdFx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1VcGdyYWRlKGRhdGEsIHVwZGF0ZVBCWC5jYkFmdGVyVXBsb2FkRmlsZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KTtcblx0XHRcdHVwZGF0ZVBCWC4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG5cdFx0fSk7XG5cdFx0Y29uc3QgcmVxdWVzdERhdGEgPSB7XG5cdFx0XHRUWVBFOiAnRklSTVdBUkUnLFxuXHRcdFx0UEJYVkVSOiBnbG9iYWxQQlhWZXJzaW9uLFxuXHRcdFx0TEFOR1VBR0U6IGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsXG5cdFx0fTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6ICdodHRwczovL3VwZGF0ZS5hc2tvemlhLnJ1Jyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRWZXJpc29uID0gdXBkYXRlUEJYLmN1cnJlbnRWZXJzaW9uLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cdFx0XHRcdHJlc3BvbnNlLmZpcm13YXJlLmZvckVhY2goKG9iaikgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHZlcnNpb24gPSBvYmoudmVyc2lvbi5yZXBsYWNlKC9cXEQvZywgJycpO1xuXHRcdFx0XHRcdGlmIChwYXJzZUludCh2ZXJzaW9uLCAxMCkgPiBwYXJzZUludChjdXJyZW50VmVyaXNvbiwgMTApKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVQQlguQWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkKCdhLnJlZG8nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcblx0XHRcdFx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm1cblx0XHRcdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0b25EZW55OiAoKSA9PiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBwYXJhbXMgPSBbXTtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnVwZGF0ZUxpbmsgPSAkYUxpbmsuYXR0cignaHJlZicpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy5tZDUgPSAkYUxpbmsuYXR0cignZGF0YS1tZDUnKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdFx0XHRcdFx0XHQkYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtVXBncmFkZU9ubGluZShwYXJhbXMsIHVwZGF0ZVBCWC5jYkFmdGVyU3RhcnRVcGdyYWRlT25saW5lKTtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHRjYkFmdGVyVXBsb2FkRmlsZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSB7XG5cdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5mdW5jdGlvbiA9PT0gJ3VwbG9hZF9wcm9ncmVzcycpIHtcblx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuXHRcdFx0XHRwZXJjZW50OiBwYXJzZUludChyZXNwb25zZS5wZXJjZW50LCAxMCksXG5cdFx0XHR9KTtcblx0XHRcdGlmIChyZXNwb25zZS5wZXJjZW50IDwgMTAwKSB7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkSW5Qcm9ncmVzcyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwZ3JhZGVJblByb2dyZXNzKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBzdGFydCBvbmxpbmUgdXBncmFkZSB3ZSBoYXZlIHRvIHdhaXQgYW4gYW5zd2VyLFxuXHQgKiBhbmQgdGhlbiBzdGFydCBzdGF0dXMgY2hlY2sgd29ya2VyXG5cdCAqL1xuXHRjYkFmdGVyU3RhcnRVcGdyYWRlT25saW5lKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG5cdFx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH1cblx0fSxcblx0QWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaikge1xuXHRcdCQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcblx0XHRsZXQgbWFya2Rvd25UZXh0ID0gZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXNjcmlwdGlvbik7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoLzxicj4vZywgJ1xccicpO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnIgPi9nLCAnXFxyJyk7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKiBcXCovZywgJyonKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvXFwqXFwqL2csICcqJyk7XG5cdFx0Y29uc3QgaHRtbCA9IHVwZGF0ZVBCWC5jb252ZXJ0ZXIubWFrZUh0bWwobWFya2Rvd25UZXh0KTtcblx0XHRjb25zdCBkeW1hbmljUm93ID0gYFxuXHRcdFx0PHRyIGNsYXNzPVwidXBkYXRlLXJvd1wiPlxuXHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke29iai52ZXJzaW9ufTwvdGQ+XG5cdFx0XHQ8dGQ+JHtodG1sfTwvdGQ+XG5cdFx0XHQ8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICBcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdDxhIGhyZWY9XCIke29iai5ocmVmfVwiIGNsYXNzPVwidWkgYnV0dG9uIHJlZG8gcG9wdXBlZFwiIFxuICAgIFx0XHRcdFx0ZGF0YS1jb250ZW50ID0gXCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwVXBncmFkZU9ubGluZX1cIlxuXHRcdFx0XHRcdGRhdGEtbWQ1ID1cIiR7b2JqLm1kNX1cIiBkYXRhLXNpemUgPVwiJHtvYmouc2l6ZX1cIj5cblx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdFx0PC9hPlxuXHRcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZCBwb3B1cGVkXCIgXG5cdFx0XHRcdFx0ZGF0YS1jb250ZW50ID0gXCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRG93bmxvYWR9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCI+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+XG5cdFx0XHRcdDwvYT5cbiAgICBcdFx0PC9kaXY+ICAgXG5cdDwvdHI+YDtcblx0XHQkKCcjdXBkYXRlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW1hbmljUm93KTtcblx0XHQkKCdhLnBvcHVwZWQnKS5wb3B1cCgpO1xuXHR9LFxufTtcblxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHVwZGF0ZVBCWC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19