"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

/* global PbxApi, globalPBXVersion, globalTranslate,
globalWebAdminLanguage, showdown, UserMessage, upgradeStatusLoopWorker */
var updatePBX = {
  $formObj: $('#upgrade-form'),
  $submitButton: $('#submitbutton'),
  $progressBar: $('#upload-progress-bar'),
  $progressBarLabel: $('#upload-progress-bar').find('.label'),
  currentVersion: globalPBXVersion,
  $restoreModalForm: $('#update-modal-form'),
  upgradeInProgress: false,
  converter: new showdown.Converter(),
  initialize: function initialize() {
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
        onSuccess: function onSuccess() {
          updatePBX.$restoreModalForm.modal({
            closable: false,
            onDeny: function onDeny() {
              return true;
            },
            onApprove: function onApprove() {
              updatePBX.$submitButton.addClass('loading');
              updatePBX.upgradeInProgress = true;
              var data = $('input:file')[0].files[0];
              PbxApi.FilesUploadFile(data, updatePBX.cbResumableUploadFile);
              return true;
            }
          }).modal('show');
        }
      });
      updatePBX.$formObj.form('validate form');
    });
    var requestData = {
      PBXVER: globalPBXVersion,
      LANGUAGE: globalWebAdminLanguage
    };
    $.api({
      url: 'https://releases.mikopbx.com/releases/v1/mikopbx/checkNewFirmware',
      on: 'now',
      method: 'POST',
      data: requestData,
      successTest: function successTest(response) {
        // test whether a JSON response is valid
        return response !== undefined && Object.keys(response).length > 0 && response.result === 'SUCCESS';
      },
      onSuccess: function onSuccess(response) {
        var currentVerison = updatePBX.currentVersion.replace('-dev', '');
        response.firmware.forEach(function (obj) {
          var version = obj.version.replace('-dev', '');

          if (versionCompare(version, currentVerison) > 0) {
            updatePBX.addNewVersionInformation(obj);
          }
        });
        $('a.redo').on('click', function (e) {
          e.preventDefault();
          if (updatePBX.$submitButton.hasClass('loading') || updatePBX.upgradeInProgress) return;
          updatePBX.$restoreModalForm.modal({
            closable: false,
            onDeny: function onDeny() {
              return true;
            },
            onApprove: function onApprove() {
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
          }).modal('show');
        });
      }
    });
  },

  /**
   * Upload file by chunks
   * @param action
   * @param params
   */
  cbResumableUploadFile: function cbResumableUploadFile(action, params) {
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
  },

  /**
   * Wait for file ready to use
   *
   * @param response ответ функции /pbxcore/api/upload/status
   */
  checkStatusFileMerging: function checkStatusFileMerging(response) {
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
    var filePath = json.data.filename; // Wait until system glued all parts of file

    mergingCheckWorker.initialize(fileID, filePath);
  },

  /**
   * Callback after start PBX upgrading
   * @param response
   */
  cbAfterStartUpdate: function cbAfterStartUpdate(response) {
    if (response.length === 0 || response === false) {
      UserMessage.showMultiString(globalTranslate.upd_UpgradeError);
      updatePBX.$submitButton.removeClass('loading');
    }
  },

  /**
   * After start online upgrade we have to wait an answer,
   * and then start status check worker
   */
  cbAfterStartDownloadFirmware: function cbAfterStartDownloadFirmware(response) {
    if (response.filename !== undefined) {
      upgradeStatusLoopWorker.initialize(response.filename);
    } else {
      updatePBX.upgradeInProgress = false;
      $('i.loading.redo').removeClass('loading');
    }
  },

  /**
   * Add new block of update information on page
   */
  addNewVersionInformation: function addNewVersionInformation(obj) {
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
};
$(document).ready(function () {
  updatePBX.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbInVwZGF0ZVBCWCIsIiRmb3JtT2JqIiwiJCIsIiRzdWJtaXRCdXR0b24iLCIkcHJvZ3Jlc3NCYXIiLCIkcHJvZ3Jlc3NCYXJMYWJlbCIsImZpbmQiLCJjdXJyZW50VmVyc2lvbiIsImdsb2JhbFBCWFZlcnNpb24iLCIkcmVzdG9yZU1vZGFsRm9ybSIsInVwZ3JhZGVJblByb2dyZXNzIiwiY29udmVydGVyIiwic2hvd2Rvd24iLCJDb252ZXJ0ZXIiLCJpbml0aWFsaXplIiwibW9kYWwiLCJhZGRDbGFzcyIsIm9uIiwiZSIsInRhcmdldCIsInBhcmVudHMiLCJjbGljayIsImZpbGVzIiwidW5kZWZpbmVkIiwiZmlsZW5hbWUiLCJuYW1lIiwicGFyZW50IiwidmFsIiwicmVtb3ZlQ2xhc3MiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZm9ybSIsImZpZWxkcyIsInZhbGlkYXRlUnVsZXMiLCJvblN1Y2Nlc3MiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImRhdGEiLCJQYnhBcGkiLCJGaWxlc1VwbG9hZEZpbGUiLCJjYlJlc3VtYWJsZVVwbG9hZEZpbGUiLCJyZXF1ZXN0RGF0YSIsIlBCWFZFUiIsIkxBTkdVQUdFIiwiZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSIsImFwaSIsInVybCIsIm1ldGhvZCIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwiY3VycmVudFZlcmlzb24iLCJyZXBsYWNlIiwiZmlybXdhcmUiLCJmb3JFYWNoIiwib2JqIiwidmVyc2lvbiIsInZlcnNpb25Db21wYXJlIiwiYWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uIiwicGFyYW1zIiwiJGFMaW5rIiwiY2xvc2VzdCIsInVwZGF0ZUxpbmsiLCJhdHRyIiwibWQ1Iiwic2l6ZSIsIkZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsImNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUiLCJhY3Rpb24iLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwic2hvdyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJ1cGRfVXBsb2FkSW5Qcm9ncmVzcyIsInByb2dyZXNzIiwicGVyY2VudCIsInBhcnNlSW50IiwidXBkX1VwbG9hZEVycm9yIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJ0cnlQYXJzZUpTT04iLCJqc29uIiwiSlNPTiIsInBhcnNlIiwiZmlsZUlEIiwidXBsb2FkX2lkIiwiZmlsZVBhdGgiLCJtZXJnaW5nQ2hlY2tXb3JrZXIiLCJjYkFmdGVyU3RhcnRVcGRhdGUiLCJ1cGRfVXBncmFkZUVycm9yIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJtYXJrZG93blRleHQiLCJkZWNvZGVVUklDb21wb25lbnQiLCJkZXNjcmlwdGlvbiIsImh0bWwiLCJtYWtlSHRtbCIsImR5bWFuaWNSb3ciLCJocmVmIiwiYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmUiLCJidF9Ub29sVGlwRG93bmxvYWQiLCJhcHBlbmQiLCJwb3B1cCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBRUEsSUFBTUEsU0FBUyxHQUFHO0FBQ2pCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxlQUFELENBRE07QUFFakJDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLGVBQUQsQ0FGQztBQUdqQkUsRUFBQUEsWUFBWSxFQUFFRixDQUFDLENBQUMsc0JBQUQsQ0FIRTtBQUlqQkcsRUFBQUEsaUJBQWlCLEVBQUVILENBQUMsQ0FBQyxzQkFBRCxDQUFELENBQTBCSSxJQUExQixDQUErQixRQUEvQixDQUpGO0FBS2pCQyxFQUFBQSxjQUFjLEVBQUVDLGdCQUxDO0FB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QSxDQUFDLENBQUMsV0FBRCxDQUFELENBQWV1RyxLQUFmO0FBQ0E7QUE1TWdCLENBQWxCO0FBZ05BdkcsQ0FBQyxDQUFDd0csUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjNHLEVBQUFBLFNBQVMsQ0FBQ2MsVUFBVjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsUEJYVmVyc2lvbiwgZ2xvYmFsVHJhbnNsYXRlLFxuZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSwgc2hvd2Rvd24sIFVzZXJNZXNzYWdlLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciAqL1xuXG5jb25zdCB1cGRhdGVQQlggPSB7XG5cdCRmb3JtT2JqOiAkKCcjdXBncmFkZS1mb3JtJyksXG5cdCRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblx0JHByb2dyZXNzQmFyOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLFxuXHQkcHJvZ3Jlc3NCYXJMYWJlbDogJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKS5maW5kKCcubGFiZWwnKSxcblx0Y3VycmVudFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24sXG5cdCRyZXN0b3JlTW9kYWxGb3JtOiAkKCcjdXBkYXRlLW1vZGFsLWZvcm0nKSxcblx0dXBncmFkZUluUHJvZ3Jlc3M6IGZhbHNlLFxuXHRjb252ZXJ0ZXI6IG5ldyBzaG93ZG93bi5Db252ZXJ0ZXIoKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHR1cGRhdGVQQlguJHJlc3RvcmVNb2RhbEZvcm0ubW9kYWwoKTtcblx0XHR1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHQkKCdpbnB1dDp0ZXh0LCAudWkuYnV0dG9uJywgJy51aS5hY3Rpb24uaW5wdXQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0JCgnaW5wdXQ6ZmlsZScsICQoZS50YXJnZXQpLnBhcmVudHMoKSkuY2xpY2soKTtcblx0XHR9KTtcblxuXHRcdCQoJ2lucHV0OmZpbGUnLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuXHRcdFx0aWYgKGUudGFyZ2V0LmZpbGVzWzBdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y29uc3QgZmlsZW5hbWUgPSBlLnRhcmdldC5maWxlc1swXS5uYW1lO1xuXHRcdFx0XHQkKCdpbnB1dDp0ZXh0JywgJChlLnRhcmdldCkucGFyZW50KCkpLnZhbChmaWxlbmFtZSk7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcblxuXHRcdFx0dXBkYXRlUEJYLiRmb3JtT2JqXG5cdFx0XHRcdC5mb3JtKHtcblx0XHRcdFx0XHRvbjogJ2JsdXInLFxuXHRcdFx0XHRcdGZpZWxkczogdXBkYXRlUEJYLnZhbGlkYXRlUnVsZXMsXG5cdFx0XHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRcdFx0dXBkYXRlUEJYLiRyZXN0b3JlTW9kYWxGb3JtXG5cdFx0XHRcdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0XHRcdFx0Y2xvc2FibGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRcdG9uRGVueTogKCkgPT4gdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgZGF0YSA9ICQoJ2lucHV0OmZpbGUnKVswXS5maWxlc1swXTtcblx0XHRcdFx0XHRcdFx0XHRcdFBieEFwaS5GaWxlc1VwbG9hZEZpbGUoZGF0YSwgdXBkYXRlUEJYLmNiUmVzdW1hYmxlVXBsb2FkRmlsZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KTtcblx0XHRcdHVwZGF0ZVBCWC4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG5cdFx0fSk7XG5cdFx0Y29uc3QgcmVxdWVzdERhdGEgPSB7XG5cdFx0XHRQQlhWRVI6IGdsb2JhbFBCWFZlcnNpb24sXG5cdFx0XHRMQU5HVUFHRTogZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSxcblx0XHR9O1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogJ2h0dHBzOi8vcmVsZWFzZXMubWlrb3BieC5jb20vcmVsZWFzZXMvdjEvbWlrb3BieC9jaGVja05ld0Zpcm13YXJlJyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgPT09ICdTVUNDRVNTJztcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y29uc3QgY3VycmVudFZlcmlzb24gPSB1cGRhdGVQQlguY3VycmVudFZlcnNpb24ucmVwbGFjZSgnLWRldicsICcnKTtcblx0XHRcdFx0cmVzcG9uc2UuZmlybXdhcmUuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgdmVyc2lvbiA9IG9iai52ZXJzaW9uLnJlcGxhY2UoJy1kZXYnLCAnJyk7XG5cdFx0XHRcdFx0aWYgKHZlcnNpb25Db21wYXJlKHZlcnNpb24sIGN1cnJlbnRWZXJpc29uKSA+IDApIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVBCWC5hZGROZXdWZXJzaW9uSW5mb3JtYXRpb24ob2JqKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdCQoJ2EucmVkbycpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdGlmICh1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpIHx8IHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcykgcmV0dXJuO1xuXHRcdFx0XHRcdHVwZGF0ZVBCWC4kcmVzdG9yZU1vZGFsRm9ybVxuXHRcdFx0XHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0XHRcdFx0Y2xvc2FibGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRvbkRlbnk6ICgpID0+IHRydWUsXG5cdFx0XHRcdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHBhcmFtcyA9IFtdO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMudXBkYXRlTGluayA9ICRhTGluay5hdHRyKCdocmVmJyk7XG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLm1kNSA9ICRhTGluay5hdHRyKCdkYXRhLW1kNScpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy52ZXJzaW9uID0gJGFMaW5rLmF0dHIoJ2RhdGEtdmVyc2lvbicpO1xuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuXHRcdFx0XHRcdFx0XHRcdCRhTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0XHRcdFx0XHR1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFBieEFwaS5GaWxlc0Rvd25sb2FkTmV3RmlybXdhcmUocGFyYW1zLCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0RG93bmxvYWRGaXJtd2FyZSk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0Lm1vZGFsKCdzaG93Jyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFVwbG9hZCBmaWxlIGJ5IGNodW5rc1xuXHQgKiBAcGFyYW0gYWN0aW9uXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICovXG5cdGNiUmVzdW1hYmxlVXBsb2FkRmlsZShhY3Rpb24sIHBhcmFtcyl7XG5cdFx0c3dpdGNoIChhY3Rpb24pIHtcblx0XHRcdGNhc2UgJ2ZpbGVTdWNjZXNzJzpcblx0XHRcdFx0dXBkYXRlUEJYLmNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocGFyYW1zLnJlc3BvbnNlKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd1cGxvYWRTdGFydCc6XG5cdFx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIuc2hvdygpO1xuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEluUHJvZ3Jlc3MpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3Byb2dyZXNzJzpcblx0XHRcdFx0dXBkYXRlUEJYLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG5cdFx0XHRcdFx0cGVyY2VudDogcGFyc2VJbnQocGFyYW1zLnBlcmNlbnQsIDEwKSxcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZXJyb3InOlxuXHRcdFx0XHR1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcblx0XHRcdFx0dXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cblxuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIFdhaXQgZm9yIGZpbGUgcmVhZHkgdG8gdXNlXG5cdCAqXG5cdCAqIEBwYXJhbSByZXNwb25zZSDQvtGC0LLQtdGCINGE0YPQvdC60YbQuNC4IC9wYnhjb3JlL2FwaS91cGxvYWQvc3RhdHVzXG5cdCAqL1xuXHRjaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgUGJ4QXBpLnRyeVBhcnNlSlNPTihyZXNwb25zZSkgPT09IGZhbHNlKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcn1gKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QganNvbiA9IEpTT04ucGFyc2UocmVzcG9uc2UpO1xuXHRcdGlmIChqc29uID09PSB1bmRlZmluZWQgfHwganNvbi5kYXRhID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yfWApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBmaWxlSUQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuXHRcdGNvbnN0IGZpbGVQYXRoID0ganNvbi5kYXRhLmZpbGVuYW1lO1xuXHRcdC8vIFdhaXQgdW50aWwgc3lzdGVtIGdsdWVkIGFsbCBwYXJ0cyBvZiBmaWxlXG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmluaXRpYWxpemUoZmlsZUlELCBmaWxlUGF0aCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIENhbGxiYWNrIGFmdGVyIHN0YXJ0IFBCWCB1cGdyYWRpbmdcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkFmdGVyU3RhcnRVcGRhdGUocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBncmFkZUVycm9yKTtcblx0XHRcdHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgc3RhcnQgb25saW5lIHVwZ3JhZGUgd2UgaGF2ZSB0byB3YWl0IGFuIGFuc3dlcixcblx0ICogYW5kIHRoZW4gc3RhcnQgc3RhdHVzIGNoZWNrIHdvcmtlclxuXHQgKi9cblx0Y2JBZnRlclN0YXJ0RG93bmxvYWRGaXJtd2FyZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5maWxlbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKHJlc3BvbnNlLmZpbGVuYW1lKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHQkKCdpLmxvYWRpbmcucmVkbycpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogQWRkIG5ldyBibG9jayBvZiB1cGRhdGUgaW5mb3JtYXRpb24gb24gcGFnZVxuXHQgKi9cblx0YWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaikge1xuXHRcdCQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcblx0XHRsZXQgbWFya2Rvd25UZXh0ID0gZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXNjcmlwdGlvbik7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoLzxicj4vZywgJ1xccicpO1xuXHRcdG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnIgPi9nLCAnXFxyJyk7XG5cdFx0bWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKiBcXCovZywgJyonKTtcblx0XHRtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvXFwqXFwqL2csICcqJyk7XG5cdFx0Y29uc3QgaHRtbCA9IHVwZGF0ZVBCWC5jb252ZXJ0ZXIubWFrZUh0bWwobWFya2Rvd25UZXh0KTtcblx0XHRjb25zdCBkeW1hbmljUm93ID0gYFxuXHRcdFx0PHRyIGNsYXNzPVwidXBkYXRlLXJvd1wiPlxuXHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke29iai52ZXJzaW9ufTwvdGQ+XG5cdFx0XHQ8dGQ+JHtodG1sfTwvdGQ+XG5cdFx0XHQ8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICBcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdDxhIGhyZWY9XCIke29iai5ocmVmfVwiIGNsYXNzPVwidWkgYnV0dG9uIHJlZG8gcG9wdXBlZFwiIFxuICAgIFx0XHRcdFx0ZGF0YS1jb250ZW50ID0gXCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwVXBncmFkZU9ubGluZX1cIlxuXHRcdFx0XHRcdGRhdGEtbWQ1ID1cIiR7b2JqLm1kNX1cIiBkYXRhLXNpemUgPVwiJHtvYmouc2l6ZX1cIlxuXHRcdFx0XHRcdGRhdGEtdmVyc2lvbiA9IFwiJHtvYmoudmVyc2lvbn1cIiA+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdDwvYT5cblx0XHRcdFx0PGEgaHJlZj1cIiR7b2JqLmhyZWZ9XCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWQgcG9wdXBlZFwiIFxuXHRcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERvd25sb2FkfVwiXG5cdFx0XHRcdFx0ZGF0YS1tZDUgPVwiJHtvYmoubWQ1fVwiIGRhdGEtc2l6ZSA9XCIke29iai5zaXplfVwiPlxuXHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPlxuXHRcdFx0XHQ8L2E+XG4gICAgXHRcdDwvZGl2PiAgIFxuXHQ8L3RyPmA7XG5cdFx0JCgnI3VwZGF0ZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdFx0JCgnYS5wb3B1cGVkJykucG9wdXAoKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHR1cGRhdGVQQlguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==