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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwidGltZU91dCIsInRpbWVPdXRIYW5kbGUiLCJpdGVyYXRpb25zIiwiaW5pdGlhbGl6ZSIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4QXBpIiwiU3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsImNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMiLCJyZXNwb25zZSIsInNldFRpbWVvdXQiLCJsZW5ndGgiLCJkX3N0YXR1cyIsIiQiLCJjbG9zZXN0IiwiZmluZCIsInRleHQiLCJkX3N0YXR1c19wcm9ncmVzcyIsImFkZENsYXNzIiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsInVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvciIsInVwZGF0ZVBCWCIsIiRmb3JtT2JqIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc0JhckxhYmVsIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHJlc3RvcmVNb2RhbEZvcm0iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwibW9kYWwiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlcyIsInVuZGVmaW5lZCIsImZpbGVuYW1lIiwibmFtZSIsInBhcmVudCIsInZhbCIsInByZXZlbnREZWZhdWx0IiwiaGFzQ2xhc3MiLCJmb3JtIiwiZmllbGRzIiwidmFsaWRhdGVSdWxlcyIsIm9uU3VjY2VzcyIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwiZGF0YSIsIlN5c3RlbVVwZ3JhZGUiLCJjYkFmdGVyVXBsb2FkRmlsZSIsInJlcXVlc3REYXRhIiwiVFlQRSIsIlBCWFZFUiIsIkxBTkdVQUdFIiwiZ2xvYmFsUEJYTGFuZ3VhZ2UiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJzdWNjZXNzVGVzdCIsIk9iamVjdCIsImtleXMiLCJyZXN1bHQiLCJ0b1VwcGVyQ2FzZSIsImN1cnJlbnRWZXJpc29uIiwicmVwbGFjZSIsImZpcm13YXJlIiwiZm9yRWFjaCIsIm9iaiIsInZlcnNpb24iLCJwYXJzZUludCIsIkFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbiIsInBhcmFtcyIsIiRhTGluayIsInVwZGF0ZUxpbmsiLCJhdHRyIiwibWQ1Iiwic2l6ZSIsIlN5c3RlbVVwZ3JhZGVPbmxpbmUiLCJ1cGRfVXBsb2FkRXJyb3IiLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJ1cGRfVXBsb2FkSW5Qcm9ncmVzcyIsInVwZF9VcGdyYWRlSW5Qcm9ncmVzcyIsInNob3ciLCJtYXJrZG93blRleHQiLCJkZWNvZGVVUklDb21wb25lbnQiLCJkZXNjcmlwdGlvbiIsImh0bWwiLCJtYWtlSHRtbCIsImR5bWFuaWNSb3ciLCJocmVmIiwiYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmUiLCJidF9Ub29sVGlwRG93bmxvYWQiLCJhcHBlbmQiLCJwb3B1cCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7O0FBR0EsSUFBTUEsdUJBQXVCLEdBQUc7QUFDL0JDLEVBQUFBLE9BQU8sRUFBRSxJQURzQjtBQUUvQkMsRUFBQUEsYUFBYSxFQUFFLEVBRmdCO0FBRy9CQyxFQUFBQSxVQUFVLEVBQUUsQ0FIbUI7QUFJL0JDLEVBQUFBLFVBSitCO0FBQUEsMEJBSWxCO0FBQ1pKLE1BQUFBLHVCQUF1QixDQUFDRyxVQUF4QixHQUFxQyxDQUFyQztBQUNBSCxNQUFBQSx1QkFBdUIsQ0FBQ0ssYUFBeEI7QUFDQTs7QUFQOEI7QUFBQTtBQVEvQkEsRUFBQUEsYUFSK0I7QUFBQSw2QkFRZjtBQUNmQyxNQUFBQSxNQUFNLENBQUNDLFlBQVAsQ0FBb0JQLHVCQUF1QixD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SSxHQUFHekUsU0FBUyxDQUFDUyxTQUFWLENBQW9CaUUsUUFBcEIsQ0FBNkJKLFlBQTdCLENBQWI7QUFDQSxVQUFNSyxVQUFVLG1GQUVjdEIsR0FBRyxDQUFDQyxPQUZsQiw4QkFHVG1CLElBSFMsMkpBTUFwQixHQUFHLENBQUN1QixJQU5KLGdGQU9ROUUsZUFBZSxDQUFDK0UsdUJBUHhCLHVDQVFBeEIsR0FBRyxDQUFDUSxHQVJKLDZCQVF3QlIsR0FBRyxDQUFDUyxJQVI1Qix5SUFZSFQsR0FBRyxDQUFDdUIsSUFaRCxrRkFhSzlFLGVBQWUsQ0FBQ2dGLGtCQWJyQix1Q0FjQXpCLEdBQUcsQ0FBQ1EsR0FkSiw2QkFjd0JSLEdBQUcsQ0FBQ1MsSUFkNUIsa0dBQWhCO0FBbUJBekUsTUFBQUEsQ0FBQyxDQUFDLHNCQUFELENBQUQsQ0FBMEIwRixNQUExQixDQUFpQ0osVUFBakM7QUFDQXRGLE1BQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZTJGLEtBQWY7QUFDQTs7QUFoSmdCO0FBQUE7QUFBQSxDQUFsQjtBQW9KQTNGLENBQUMsQ0FBQzRGLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJsRixFQUFBQSxTQUFTLENBQUN4QixVQUFWO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxQQlhWZXJzaW9uLCBnbG9iYWxUcmFuc2xhdGUsXG5nbG9iYWxQQlhMYW5ndWFnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgc2hvd2Rvd24sIFVzZXJNZXNzYWdlICovXG5cbmNvbnN0IHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyID0ge1xuXHR0aW1lT3V0OiAxMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0aXRlcmF0aW9uczogMCxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pdGVyYXRpb25zID0gMDtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci53b3JrZXIoKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0UGJ4QXBpLlN5c3RlbUdldFVwZ3JhZGVTdGF0dXModXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuY2JSZWZyZXNoVXBncmFkZVN0YXR1cyk7XG5cdH0sXG5cdGNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMocmVzcG9uc2UpIHtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pdGVyYXRpb25zICs9IDE7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSA9XG5cdFx0XHR3aW5kb3cuc2V0VGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci53b3JrZXIsIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVPdXQpO1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0aWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnRE9XTkxPQURfSU5fUFJPR1JFU1MnKSB7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmNsb3Nlc3QoJ2EnKS5maW5kKCcucGVyY2VudCcpLnRleHQoYCR7cmVzcG9uc2UuZF9zdGF0dXNfcHJvZ3Jlc3N9JWApO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9DT01QTEVURScpIHtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLmNsb3Nlc3QoJ2EnKS5maW5kKCcucGVyY2VudCcpLnRleHQoYCR7cmVzcG9uc2UuZF9zdGF0dXNfcHJvZ3Jlc3N9JWApO1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5hZGRDbGFzcygnc3luYycpLnJlbW92ZUNsYXNzKCdyZWRvJyk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0VSUk9SJykge1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUudXBkX0Rvd25sb2FkVXBncmFkZUVycm9yKTtcblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuYWRkQ2xhc3MoJ3JlZG8nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH1cblx0fSxcbn07XG5cblxuY29uc3QgdXBkYXRlUEJYID0ge1xuXHQkZm9ybU9iajogJCgnI3VwZ3JhZGUtZm9ybScpLFxuXHQkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG5cdCRwcm9ncmVzc0JhcjogJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKSxcblx0JHByb2dyZXNzQmFyTGFiZWw6ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyJykuZmluZCgnLmxhYmVsJyksXG5cdGN1cnJlbnRWZXJzaW9uOiBnbG9iYWxQQlhWZXJzaW9uLFxuXHQkcmVzdG9yZU1vZGFsRm9ybTogJCgnI3VwZGF0ZS1tb2RhbC1mb3JtJyksXG5cdHVwZ3JhZGVJblByb2dyZXNzOiBmYWxzZSxcblx0Y29udmVydGVyOiBuZXcgc2hvd2Rvd24uQ29udmVydGVyKCksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0dXBkYXRlUEJYLiRyZXN0b3JlTW9kYWxGb3JtLm1vZGFsKCk7XG5cdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0JCgnaW5wdXQ6dGV4dCwgLnVpLmJ1dHRvbicsICcudWkuYWN0aW9uLmlucHV0Jykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdCQoJ2lucHV0OmZpbGUnLCAkKGUudGFyZ2V0KS5wYXJlbnRzKCkpLmNsaWNrKCk7XG5cdFx0fSk7XG5cblx0XHQkKCdpbnB1dDpmaWxlJywgJy51aS5hY3Rpb24uaW5wdXQnKS5vbignY2hhbmdlJywgKGUpID0+IHtcblx0XHRcdGlmIChlLnRhcmdldC5maWxlc1swXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGNvbnN0IGZpbGVuYW1lID0gZS50YXJnZXQuZmlsZXNbMF0ubmFtZTtcblx0XHRcdFx0JCgnaW5wdXQ6dGV4dCcsICQoZS50YXJnZXQpLnBhcmVudCgpKS52YWwoZmlsZW5hbWUpO1xuXHRcdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0aWYgKHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykgfHwgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzKSByZXR1cm47XG5cblx0XHRcdHVwZGF0ZVBCWC4kZm9ybU9ialxuXHRcdFx0XHQuZm9ybSh7XG5cdFx0XHRcdFx0b246ICdibHVyJyxcblx0XHRcdFx0XHRmaWVsZHM6IHVwZGF0ZVBCWC52YWxpZGF0ZVJ1bGVzLFxuXHRcdFx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVBCWC4kcmVzdG9yZU1vZGFsRm9ybVxuXHRcdFx0XHRcdFx0XHQubW9kYWwoe1xuXHRcdFx0XHRcdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0XHRvbkRlbnk6ICgpID0+IHRydWUsXG5cdFx0XHRcdFx0XHRcdFx0b25BcHByb3ZlOiAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGRhdGEgPSAkKCdpbnB1dDpmaWxlJylbMF0uZmlsZXNbMF07XG5cdFx0XHRcdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtVXBncmFkZShkYXRhLCB1cGRhdGVQQlguY2JBZnRlclVwbG9hZEZpbGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0Lm1vZGFsKCdzaG93Jyk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSk7XG5cdFx0XHR1cGRhdGVQQlguJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuXHRcdH0pO1xuXHRcdGNvbnN0IHJlcXVlc3REYXRhID0ge1xuXHRcdFx0VFlQRTogJ0ZJUk1XQVJFJyxcblx0XHRcdFBCWFZFUjogZ2xvYmFsUEJYVmVyc2lvbixcblx0XHRcdExBTkdVQUdFOiBnbG9iYWxQQlhMYW5ndWFnZSxcblx0XHR9O1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogJ2h0dHBzOi8vdXBkYXRlLmFza296aWEucnUnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiByZXF1ZXN0RGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdC50b1VwcGVyQ2FzZSgpID09PSAnU1VDQ0VTUyc7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRWZXJpc29uID0gdXBkYXRlUEJYLmN1cnJlbnRWZXJzaW9uLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cdFx0XHRcdHJlc3BvbnNlLmZpcm13YXJlLmZvckVhY2goKG9iaikgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHZlcnNpb24gPSBvYmoudmVyc2lvbi5yZXBsYWNlKC9cXEQvZywgJycpO1xuXHRcdFx0XHRcdGlmIChwYXJzZUludCh2ZXJzaW9uLCAxMCkgPiBwYXJzZUludChjdXJyZW50VmVyaXNvbiwgMTApKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVQQlguQWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQkKCdhLnJlZG8nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcblx0XHRcdFx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm1cblx0XHRcdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0b25EZW55OiAoKSA9PiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBwYXJhbXMgPSBbXTtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnVwZGF0ZUxpbmsgPSAkYUxpbmsuYXR0cignaHJlZicpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy5tZDUgPSAkYUxpbmsuYXR0cignZGF0YS1tZDUnKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdFx0XHRcdFx0XHQkYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtVXBncmFkZU9ubGluZShwYXJhbXMpO1xuXHRcdFx0XHRcdFx0XHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHRjYkFmdGVyVXBsb2FkRmlsZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSB7XG5cdFx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5mdW5jdGlvbiA9PT0gJ3VwbG9hZF9wcm9ncmVzcycpIHtcblx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuXHRcdFx0XHRwZXJjZW50OiBwYXJzZUludChyZXNwb25zZS5wZXJjZW50LCAxMCksXG5cdFx0XHR9KTtcblx0XHRcdGlmIChyZXNwb25zZS5wZXJjZW50IDwgMTAwKSB7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkSW5Qcm9ncmVzcyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwZ3JhZGVJblByb2dyZXNzKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdEFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbihvYmopIHtcblx0XHQkKCcjb25saW5lLXVwZGF0ZXMtYmxvY2snKS5zaG93KCk7XG5cdFx0bGV0IG1hcmtkb3duVGV4dCA9IGRlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnI+L2csICdcXHInKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvPGJyID4vZywgJ1xccicpO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC9cXCogXFwqL2csICcqJyk7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKlxcKi9nLCAnKicpO1xuXHRcdGNvbnN0IGh0bWwgPSB1cGRhdGVQQlguY29udmVydGVyLm1ha2VIdG1sKG1hcmtkb3duVGV4dCk7XG5cdFx0Y29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cInVwZGF0ZS1yb3dcIj5cblx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0PHRkPiR7aHRtbH08L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiByZWRvIHBvcHVwZWRcIiBcbiAgICBcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmV9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCI+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdDwvYT5cblx0XHRcdFx0PGEgaHJlZj1cIiR7b2JqLmhyZWZ9XCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWQgcG9wdXBlZFwiIFxuXHRcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERvd25sb2FkfVwiXG5cdFx0XHRcdFx0ZGF0YS1tZDUgPVwiJHtvYmoubWQ1fVwiIGRhdGEtc2l6ZSA9XCIke29iai5zaXplfVwiPlxuXHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPlxuXHRcdFx0XHQ8L2E+XG4gICAgXHRcdDwvZGl2PiAgIFxuXHQ8L3RyPmA7XG5cdFx0JCgnI3VwZGF0ZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdFx0JCgnYS5wb3B1cGVkJykucG9wdXAoKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHR1cGRhdGVQQlguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==