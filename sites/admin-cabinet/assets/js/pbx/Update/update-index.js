"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
globalWebAdminLanguage, showdown, UserMessage, upgradeStatusLoopWorker, SystemAPI, FilesAPI, FileUploadEventHandler */

/**
 * Object for managing PBX firmware updates.
 *
 * @module updatePBX
 */
var updatePBX = {
  /**
   * jQuery object for the form.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * jQuery object for the submit button.
   * @type {jQuery}
   */
  $submitButton: null,

  /**
   * jQuery object for the progress bar.
   * @type {jQuery}
   */
  $progressBar: null,

  /**
   * jQuery object for the progress bar label.
   * @type {jQuery}
   */
  $progressBarLabel: null,

  /**
   * Current version of the PBX firmware.
   * @type {string}
   */
  currentVersion: globalPBXVersion,

  /**
   * jQuery object for the modal form before upgrade.
   * @type {jQuery}
   */
  $upgradeModalForm: null,

  /**
   * jQuery object for the "I have backup" input field.
   * @type {jQuery}
   */
  $iHaveBackupInput: null,

  /**
   * jQuery object for the green button on modal form before upgrade.
   * @type {jQuery}
   */
  $startUpgradeButton: null,

  /**
   * There is upgrade process working now flag.
   * @type {boolean}
   */
  upgradeInProgress: false,

  /**
   * Helps to convert markdown into html.
   * Release notes carry a GFM table of download links (#1218), which showdown skips by default.
   * @type {Converter}
   */
  converter: new showdown.Converter({
    tables: true,
    openLinksInNewWindow: true
  }),

  /**
   * Initializes the update PBX firmware functionality.
   */
  initialize: function initialize() {
    updatePBX.$formObj = $('#upgrade-form');
    updatePBX.$submitButton = $('#submitbutton');
    updatePBX.$progressBar = $('#upload-progress-bar');
    updatePBX.$progressBarLabel = $('#upload-progress-bar-label');
    updatePBX.$upgradeModalForm = $('#update-modal-form');
    updatePBX.$iHaveBackupInput = $("input[name='i-have-backup-input']");
    updatePBX.$startUpgradeButton = $('#start-upgrade-button'); // Open the upgrade modal form

    updatePBX.$upgradeModalForm.modal(); // Add 'disabled' class to submit button

    updatePBX.$submitButton.addClass('disabled'); // Trigger file input click when clicking on text input or button

    $('input:text, .ui.button', '.ui.action.input').on('click', function (e) {
      $('input:file', $(e.target).parents()).click();
    }); // Update text input value when selecting a file

    $('input:file', '.ui.action.input').on('change', function (e) {
      if (e.target.files[0] !== undefined) {
        var filename = e.target.files[0].name;
        $('input:text', $(e.target).parent()).val(filename);
        updatePBX.$submitButton.removeClass('disabled');
      }
    }); // Track the input field and make submit button available if phrase is equal to 'I have backup'

    updatePBX.$iHaveBackupInput.on('input', function (e) {
      if (updatePBX.$iHaveBackupInput.val() === globalTranslate.upd_EnterIHaveBackupPhrase) {
        updatePBX.$startUpgradeButton.removeClass('disabled');
      } else {
        updatePBX.$startUpgradeButton.addClass('disabled');
      }
    }); // Handle submit button click

    updatePBX.$submitButton.on('click', function (e) {
      e.preventDefault();
      if (updatePBX.$submitButton.hasClass('loading') || updatePBX.upgradeInProgress) return; // Validate the form and show the upgrade modal form on success

      updatePBX.$formObj.form({
        on: 'blur',
        fields: updatePBX.validateRules,
        onSuccess: function onSuccess() {
          updatePBX.$upgradeModalForm.modal({
            closable: false,
            onDeny: function onDeny() {
              return true;
            },
            onApprove: function onApprove() {
              // Start the file upload process
              updatePBX.$submitButton.addClass('loading');
              updatePBX.upgradeInProgress = true;
              var data = $('input:file')[0].files[0];
              FilesAPI.uploadFile(data, updatePBX.cbResumableUploadFile, ['img'], 'firmware');
              return true;
            }
          }).modal('show');
        }
      }); // Validate the form

      updatePBX.$formObj.form('validate form');
    }); // Use unified SystemAPI to check for firmware updates

    SystemAPI.checkForUpdates(function (response) {
      // Check if request was successful
      // NOTE: the v3 envelope (PBXApiResult::getResult) exposes the success
      // flag as `result`, not `success`. Using `success` here silently
      // early-returned and left the updates table empty (regression from
      // d16031e3d). Keep this aligned with PbxApiClient.successTest().
      if (!response || !response.result || !response.data) {
        return;
      } // Check if updates are available


      if (!response.data.hasUpdates || !response.data.firmware) {
        return;
      } // Iterate through firmware objects and add version information


      var currentVerison = updatePBX.currentVersion.replace('-dev', '');
      response.data.firmware.forEach(function (obj) {
        var version = obj.version.replace('-dev', '');

        if (versionCompare(version, currentVerison) > 0) {
          updatePBX.addNewVersionInformation(obj);
        }
      }); // Handle redo button click

      $('a.redo').on('click', function (e) {
        e.preventDefault();
        if (updatePBX.$submitButton.hasClass('loading') || updatePBX.upgradeInProgress) return;
        updatePBX.$upgradeModalForm.modal({
          closable: false,
          onDeny: function onDeny() {
            return true;
          },
          onApprove: function onApprove() {
            // Prepare parameters for firmware download
            var params = {};
            var $aLink = $(e.target).closest('a');
            params.url = $aLink.attr('href');
            params.md5 = $aLink.attr('data-md5');
            params.version = $aLink.attr('data-version');
            $aLink.find('i').addClass('loading');
            updatePBX.upgradeInProgress = true;
            FilesAPI.downloadFirmware(params, updatePBX.cbAfterStartDownloadFirmware);
            return true;
          }
        }).modal('show');
      });
    });
  },

  /**
   * Callback function for resumable file upload.
   * @param {string} action - The action of the upload.
   * @param {object} params - Additional parameters for the upload.
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
   * Checks the status of the file merging process.
   * @param {string} response - The response from the /pbxcore/api/upload/status function.
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

    var uploadId = json.data.upload_id;
    var filePath = json.data.filename; // Subscribe to WebSocket events instead of using polling worker

    FileUploadEventHandler.subscribe(uploadId, {
      onMergeStarted: function onMergeStarted(data) {
        updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadInProgress);
        console.log('Firmware merge started:', data);
      },
      onMergeProgress: function onMergeProgress(data) {
        // Update progress bar during merge
        if (data.progress !== undefined) {
          updatePBX.$progressBar.progress({
            percent: parseInt(data.progress, 10)
          });
        }

        console.log("Firmware merge progress: ".concat(data.progress, "%"));
      },
      onMergeComplete: function onMergeComplete(data) {
        // Merge complete - start upgrade process
        updatePBX.$progressBarLabel.text(globalTranslate.upd_UpgradeInProgress); // Backend expects 'temp_filename' parameter, not 'filename'

        SystemAPI.upgrade({
          temp_filename: filePath
        }, updatePBX.cbAfterStartUpdate);
      },
      onError: function onError(data) {
        updatePBX.$submitButton.removeClass('loading');
        updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadError);
        UserMessage.showMultiString(data.error || globalTranslate.upd_UploadError);
        updatePBX.upgradeInProgress = false;
      }
    });
  },

  /**
   * Callback after start PBX upgrading
   * @param response
   */
  cbAfterStartUpdate: function cbAfterStartUpdate(response) {
    if (response.result !== undefined && response.result === false) {
      UserMessage.showMultiString(response.messages, globalTranslate.upd_UpgradeError);
      updatePBX.$submitButton.removeClass('loading');
    }
  },

  /**
   * After start online upgrade we have to wait an answer,
   * and then start status check worker
   */
  cbAfterStartDownloadFirmware: function cbAfterStartDownloadFirmware(response) {
    // v3 envelope: payload lives in response.data, success flag is `result`
    if (response && response.result && response.data && response.data.filename) {
      upgradeStatusLoopWorker.initialize(response.data.filename);
    } else {
      UserMessage.showMultiString(response && response.messages || globalTranslate.upd_DownloadUpgradeError);
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
    var html = updatePBX.converter.makeHtml(markdownText).replace(/<table>/g, '<table class="ui very basic compact celled table">');
    var dymanicRow = "\n\t\t\t<tr class=\"update-row\">\n\t\t\t<td class=\"center aligned\">".concat(obj.version, "</td>\n\t\t\t<td>").concat(html, "</td>\n\t\t\t<td class=\"right aligned collapsing\">\n    \t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t<a href=\"").concat(obj.href, "\" class=\"ui button redo popuped\" \n    \t\t\t\tdata-content = \"").concat(globalTranslate.bt_ToolTipUpgradeOnline, "\"\n\t\t\t\t\tdata-md5 =\"").concat(obj.md5, "\" data-size =\"").concat(obj.size, "\"\n\t\t\t\t\tdata-version = \"").concat(obj.version, "\" >\n\t\t\t\t\t<i class=\"icon redo blue\"></i>\n\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t</a>\n\t\t\t\t<a href=\"").concat(obj.href, "\" class=\"ui button download popuped\" \n\t\t\t\t\tdata-content = \"").concat(globalTranslate.bt_ToolTipDownload, "\"\n\t\t\t\t\tdata-md5 =\"").concat(obj.md5, "\" data-size =\"").concat(obj.size, "\">\n\t\t\t\t\t<i class=\"icon download blue\"></i>\n\t\t\t\t</a>\n    \t\t</div>   \n\t</tr>");
    $('#updates-table tbody').append(dymanicRow);
    $('a.popuped').popup();
  }
}; // When the document is ready, initialize the update pbx firmware from image page

$(document).ready(function () {
  updatePBX.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJ1cGRhdGVQQlgiLCIkZm9ybU9iaiIsIiRzdWJtaXRCdXR0b24iLCIkcHJvZ3Jlc3NCYXIiLCIkcHJvZ3Jlc3NCYXJMYWJlbCIsImN1cnJlbnRWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsIiR1cGdyYWRlTW9kYWxGb3JtIiwiJGlIYXZlQmFja3VwSW5wdXQiLCIkc3RhcnRVcGdyYWRlQnV0dG9uIiwidXBncmFkZUluUHJvZ3Jlc3MiLCJjb252ZXJ0ZXIiLCJzaG93ZG93biIsIkNvbnZlcnRlciIsInRhYmxlcyIsIm9wZW5MaW5rc0luTmV3V2luZG93IiwiaW5pdGlhbGl6ZSIsIiQiLCJtb2RhbCIsImFkZENsYXNzIiwib24iLCJlIiwidGFyZ2V0IiwicGFyZW50cyIsImNsaWNrIiwiZmlsZXMiLCJ1bmRlZmluZWQiLCJmaWxlbmFtZSIsIm5hbWUiLCJwYXJlbnQiLCJ2YWwiLCJyZW1vdmVDbGFzcyIsImdsb2JhbFRyYW5zbGF0ZSIsInVwZF9FbnRlcklIYXZlQmFja3VwUGhyYXNlIiwicHJldmVudERlZmF1bHQiLCJoYXNDbGFzcyIsImZvcm0iLCJmaWVsZHMiLCJ2YWxpZGF0ZVJ1bGVzIiwib25TdWNjZXNzIiwiY2xvc2FibGUiLCJvbkRlbnkiLCJvbkFwcHJvdmUiLCJkYXRhIiwiRmlsZXNBUEkiLCJ1cGxvYWRGaWxlIiwiY2JSZXN1bWFibGVVcGxvYWRGaWxlIiwiU3lzdGVtQVBJIiwiY2hlY2tGb3JVcGRhdGVzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJoYXNVcGRhdGVzIiwiZmlybXdhcmUiLCJjdXJyZW50VmVyaXNvbiIsInJlcGxhY2UiLCJmb3JFYWNoIiwib2JqIiwidmVyc2lvbiIsInZlcnNpb25Db21wYXJlIiwiYWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uIiwicGFyYW1zIiwiJGFMaW5rIiwiY2xvc2VzdCIsInVybCIsImF0dHIiLCJtZDUiLCJmaW5kIiwiZG93bmxvYWRGaXJtd2FyZSIsImNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUiLCJhY3Rpb24iLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwic2hvdyIsInRleHQiLCJ1cGRfVXBsb2FkSW5Qcm9ncmVzcyIsInByb2dyZXNzIiwicGVyY2VudCIsInBhcnNlSW50IiwidXBkX1VwbG9hZEVycm9yIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJQYnhBcGkiLCJ0cnlQYXJzZUpTT04iLCJqc29uIiwiSlNPTiIsInBhcnNlIiwidXBsb2FkSWQiLCJ1cGxvYWRfaWQiLCJmaWxlUGF0aCIsIkZpbGVVcGxvYWRFdmVudEhhbmRsZXIiLCJzdWJzY3JpYmUiLCJvbk1lcmdlU3RhcnRlZCIsImNvbnNvbGUiLCJsb2ciLCJvbk1lcmdlUHJvZ3Jlc3MiLCJvbk1lcmdlQ29tcGxldGUiLCJ1cGRfVXBncmFkZUluUHJvZ3Jlc3MiLCJ1cGdyYWRlIiwidGVtcF9maWxlbmFtZSIsImNiQWZ0ZXJTdGFydFVwZGF0ZSIsIm9uRXJyb3IiLCJlcnJvciIsIm1lc3NhZ2VzIiwidXBkX1VwZ3JhZGVFcnJvciIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwidXBkX0Rvd25sb2FkVXBncmFkZUVycm9yIiwibWFya2Rvd25UZXh0IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZGVzY3JpcHRpb24iLCJodG1sIiwibWFrZUh0bWwiLCJkeW1hbmljUm93IiwiaHJlZiIsImJ0X1Rvb2xUaXBVcGdyYWRlT25saW5lIiwic2l6ZSIsImJ0X1Rvb2xUaXBEb3dubG9hZCIsImFwcGVuZCIsInBvcHVwIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIGdsb2JhbFBCWFZlcnNpb24sIGdsb2JhbFRyYW5zbGF0ZSxcbmdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIHNob3dkb3duLCBVc2VyTWVzc2FnZSwgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIsIFN5c3RlbUFQSSwgRmlsZXNBUEksIEZpbGVVcGxvYWRFdmVudEhhbmRsZXIgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIFBCWCBmaXJtd2FyZSB1cGRhdGVzLlxuICpcbiAqIEBtb2R1bGUgdXBkYXRlUEJYXG4gKi9cbmNvbnN0IHVwZGF0ZVBCWCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdWJtaXQgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN1Ym1pdEJ1dHRvbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBwcm9ncmVzcyBiYXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJvZ3Jlc3NCYXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgcHJvZ3Jlc3MgYmFyIGxhYmVsLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHByb2dyZXNzQmFyTGFiZWw6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBDdXJyZW50IHZlcnNpb24gb2YgdGhlIFBCWCBmaXJtd2FyZS5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGN1cnJlbnRWZXJzaW9uOiBnbG9iYWxQQlhWZXJzaW9uLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1vZGFsIGZvcm0gYmVmb3JlIHVwZ3JhZGUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdXBncmFkZU1vZGFsRm9ybTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIkkgaGF2ZSBiYWNrdXBcIiBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRpSGF2ZUJhY2t1cElucHV0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGdyZWVuIGJ1dHRvbiBvbiBtb2RhbCBmb3JtIGJlZm9yZSB1cGdyYWRlLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN0YXJ0VXBncmFkZUJ1dHRvbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZXJlIGlzIHVwZ3JhZGUgcHJvY2VzcyB3b3JraW5nIG5vdyBmbGFnLlxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHVwZ3JhZGVJblByb2dyZXNzOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEhlbHBzIHRvIGNvbnZlcnQgbWFya2Rvd24gaW50byBodG1sLlxuICAgICAqIFJlbGVhc2Ugbm90ZXMgY2FycnkgYSBHRk0gdGFibGUgb2YgZG93bmxvYWQgbGlua3MgKCMxMjE4KSwgd2hpY2ggc2hvd2Rvd24gc2tpcHMgYnkgZGVmYXVsdC5cbiAgICAgKiBAdHlwZSB7Q29udmVydGVyfVxuICAgICAqL1xuICAgIGNvbnZlcnRlcjogbmV3IHNob3dkb3duLkNvbnZlcnRlcih7XG4gICAgICAgIHRhYmxlczogdHJ1ZSxcbiAgICAgICAgb3BlbkxpbmtzSW5OZXdXaW5kb3c6IHRydWUsXG4gICAgfSksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgdXBkYXRlIFBCWCBmaXJtd2FyZSBmdW5jdGlvbmFsaXR5LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHVwZGF0ZVBCWC4kZm9ybU9iaiA9ICQoJyN1cGdyYWRlLWZvcm0nKTtcbiAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24gPSAkKCcjc3VibWl0YnV0dG9uJyk7XG4gICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIgPSAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpO1xuICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwgPSAkKCcjdXBsb2FkLXByb2dyZXNzLWJhci1sYWJlbCcpO1xuICAgICAgICB1cGRhdGVQQlguJHVwZ3JhZGVNb2RhbEZvcm0gPSAkKCcjdXBkYXRlLW1vZGFsLWZvcm0nKTtcbiAgICAgICAgdXBkYXRlUEJYLiRpSGF2ZUJhY2t1cElucHV0ID0gJChcImlucHV0W25hbWU9J2ktaGF2ZS1iYWNrdXAtaW5wdXQnXVwiKTtcbiAgICAgICAgdXBkYXRlUEJYLiRzdGFydFVwZ3JhZGVCdXR0b24gPSAkKCcjc3RhcnQtdXBncmFkZS1idXR0b24nKTtcblxuICAgICAgICAvLyBPcGVuIHRoZSB1cGdyYWRlIG1vZGFsIGZvcm1cbiAgICAgICAgdXBkYXRlUEJYLiR1cGdyYWRlTW9kYWxGb3JtLm1vZGFsKCk7XG5cbiAgICAgICAgLy8gQWRkICdkaXNhYmxlZCcgY2xhc3MgdG8gc3VibWl0IGJ1dHRvblxuICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAvLyBUcmlnZ2VyIGZpbGUgaW5wdXQgY2xpY2sgd2hlbiBjbGlja2luZyBvbiB0ZXh0IGlucHV0IG9yIGJ1dHRvblxuICAgICAgICAkKCdpbnB1dDp0ZXh0LCAudWkuYnV0dG9uJywgJy51aS5hY3Rpb24uaW5wdXQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgJCgnaW5wdXQ6ZmlsZScsICQoZS50YXJnZXQpLnBhcmVudHMoKSkuY2xpY2soKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRleHQgaW5wdXQgdmFsdWUgd2hlbiBzZWxlY3RpbmcgYSBmaWxlXG4gICAgICAgICQoJ2lucHV0OmZpbGUnLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUudGFyZ2V0LmZpbGVzWzBdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGUudGFyZ2V0LmZpbGVzWzBdLm5hbWU7XG4gICAgICAgICAgICAgICAgJCgnaW5wdXQ6dGV4dCcsICQoZS50YXJnZXQpLnBhcmVudCgpKS52YWwoZmlsZW5hbWUpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmFjayB0aGUgaW5wdXQgZmllbGQgYW5kIG1ha2Ugc3VibWl0IGJ1dHRvbiBhdmFpbGFibGUgaWYgcGhyYXNlIGlzIGVxdWFsIHRvICdJIGhhdmUgYmFja3VwJ1xuICAgICAgICB1cGRhdGVQQlguJGlIYXZlQmFja3VwSW5wdXQub24oJ2lucHV0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodXBkYXRlUEJYLiRpSGF2ZUJhY2t1cElucHV0LnZhbCgpPT09Z2xvYmFsVHJhbnNsYXRlLnVwZF9FbnRlcklIYXZlQmFja3VwUGhyYXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kc3RhcnRVcGdyYWRlQnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kc3RhcnRVcGdyYWRlQnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHN1Ym1pdCBidXR0b24gY2xpY2tcbiAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmICh1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpIHx8IHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcykgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSB0aGUgZm9ybSBhbmQgc2hvdyB0aGUgdXBncmFkZSBtb2RhbCBmb3JtIG9uIHN1Y2Nlc3NcbiAgICAgICAgICAgIHVwZGF0ZVBCWC4kZm9ybU9ialxuICAgICAgICAgICAgICAgIC5mb3JtKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdibHVyJyxcbiAgICAgICAgICAgICAgICAgICAgZmllbGRzOiB1cGRhdGVQQlgudmFsaWRhdGVSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLiR1cGdyYWRlTW9kYWxGb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRlbnk6ICgpID0+IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3RhcnQgdGhlIGZpbGUgdXBsb2FkIHByb2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9ICQoJ2lucHV0OmZpbGUnKVswXS5maWxlc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZpbGVzQVBJLnVwbG9hZEZpbGUoZGF0YSwgdXBkYXRlUEJYLmNiUmVzdW1hYmxlVXBsb2FkRmlsZSwgWydpbWcnXSwgJ2Zpcm13YXJlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tb2RhbCgnc2hvdycpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSB0aGUgZm9ybVxuICAgICAgICAgICAgdXBkYXRlUEJYLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgU3lzdGVtQVBJIHRvIGNoZWNrIGZvciBmaXJtd2FyZSB1cGRhdGVzXG4gICAgICAgIFN5c3RlbUFQSS5jaGVja0ZvclVwZGF0ZXMoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsXG4gICAgICAgICAgICAvLyBOT1RFOiB0aGUgdjMgZW52ZWxvcGUgKFBCWEFwaVJlc3VsdDo6Z2V0UmVzdWx0KSBleHBvc2VzIHRoZSBzdWNjZXNzXG4gICAgICAgICAgICAvLyBmbGFnIGFzIGByZXN1bHRgLCBub3QgYHN1Y2Nlc3NgLiBVc2luZyBgc3VjY2Vzc2AgaGVyZSBzaWxlbnRseVxuICAgICAgICAgICAgLy8gZWFybHktcmV0dXJuZWQgYW5kIGxlZnQgdGhlIHVwZGF0ZXMgdGFibGUgZW1wdHkgKHJlZ3Jlc3Npb24gZnJvbVxuICAgICAgICAgICAgLy8gZDE2MDMxZTNkKS4gS2VlcCB0aGlzIGFsaWduZWQgd2l0aCBQYnhBcGlDbGllbnQuc3VjY2Vzc1Rlc3QoKS5cbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCB8fCAhcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdXBkYXRlcyBhcmUgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlLmRhdGEuaGFzVXBkYXRlcyB8fCAhcmVzcG9uc2UuZGF0YS5maXJtd2FyZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGZpcm13YXJlIG9iamVjdHMgYW5kIGFkZCB2ZXJzaW9uIGluZm9ybWF0aW9uXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmVyaXNvbiA9IHVwZGF0ZVBCWC5jdXJyZW50VmVyc2lvbi5yZXBsYWNlKCctZGV2JywgJycpO1xuICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5maXJtd2FyZS5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gb2JqLnZlcnNpb24ucmVwbGFjZSgnLWRldicsICcnKTtcbiAgICAgICAgICAgICAgICBpZiAodmVyc2lvbkNvbXBhcmUodmVyc2lvbiwgY3VycmVudFZlcmlzb24pID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlguYWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSByZWRvIGJ1dHRvbiBjbGlja1xuICAgICAgICAgICAgJCgnYS5yZWRvJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgaWYgKHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykgfHwgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzKSByZXR1cm47XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiR1cGdyYWRlTW9kYWxGb3JtXG4gICAgICAgICAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkRlbnk6ICgpID0+IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQcmVwYXJlIHBhcmFtZXRlcnMgZm9yIGZpcm13YXJlIGRvd25sb2FkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy51cmwgPSAkYUxpbmsuYXR0cignaHJlZicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5tZDUgPSAkYUxpbmsuYXR0cignZGF0YS1tZDUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMudmVyc2lvbiA9ICRhTGluay5hdHRyKCdkYXRhLXZlcnNpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGaWxlc0FQSS5kb3dubG9hZEZpcm13YXJlKHBhcmFtcywgdXBkYXRlUEJYLmNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciByZXN1bWFibGUgZmlsZSB1cGxvYWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbiAtIFRoZSBhY3Rpb24gb2YgdGhlIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzIGZvciB0aGUgdXBsb2FkLlxuICAgICAqL1xuICAgIGNiUmVzdW1hYmxlVXBsb2FkRmlsZShhY3Rpb24sIHBhcmFtcykge1xuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnZmlsZVN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWRTdGFydCc6XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyLnNob3coKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEluUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncHJvZ3Jlc3MnOlxuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgICAgICBwZXJjZW50OiBwYXJzZUludChwYXJhbXMucGVyY2VudCwgMTApLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIHN0YXR1cyBvZiB0aGUgZmlsZSBtZXJnaW5nIHByb2Nlc3MuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIC9wYnhjb3JlL2FwaS91cGxvYWQvc3RhdHVzIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgUGJ4QXBpLnRyeVBhcnNlSlNPTihyZXNwb25zZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG4gICAgICAgIGlmIChqc29uID09PSB1bmRlZmluZWQgfHwganNvbi5kYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHVwbG9hZElkID0ganNvbi5kYXRhLnVwbG9hZF9pZDtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBqc29uLmRhdGEuZmlsZW5hbWU7XG5cbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIFdlYlNvY2tldCBldmVudHMgaW5zdGVhZCBvZiB1c2luZyBwb2xsaW5nIHdvcmtlclxuICAgICAgICBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLnN1YnNjcmliZSh1cGxvYWRJZCwge1xuICAgICAgICAgICAgb25NZXJnZVN0YXJ0ZWQ6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRJblByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRmlybXdhcmUgbWVyZ2Ugc3RhcnRlZDonLCBkYXRhKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uTWVyZ2VQcm9ncmVzczogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3MgYmFyIGR1cmluZyBtZXJnZVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnByb2dyZXNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZXJjZW50OiBwYXJzZUludChkYXRhLnByb2dyZXNzLCAxMCksXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRmlybXdhcmUgbWVyZ2UgcHJvZ3Jlc3M6ICR7ZGF0YS5wcm9ncmVzc30lYCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlQ29tcGxldGU6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgY29tcGxldGUgLSBzdGFydCB1cGdyYWRlIHByb2Nlc3NcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwZ3JhZGVJblByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICAvLyBCYWNrZW5kIGV4cGVjdHMgJ3RlbXBfZmlsZW5hbWUnIHBhcmFtZXRlciwgbm90ICdmaWxlbmFtZSdcbiAgICAgICAgICAgICAgICBTeXN0ZW1BUEkudXBncmFkZSh7dGVtcF9maWxlbmFtZTogZmlsZVBhdGh9LCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0VXBkYXRlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uRXJyb3I6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZGF0YS5lcnJvciB8fCBnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHN0YXJ0IFBCWCB1cGdyYWRpbmdcbiAgICAgKiBAcGFyYW0gcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU3RhcnRVcGRhdGUocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlc3VsdD09PWZhbHNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBncmFkZUVycm9yKTtcbiAgICAgICAgICAgIHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWZ0ZXIgc3RhcnQgb25saW5lIHVwZ3JhZGUgd2UgaGF2ZSB0byB3YWl0IGFuIGFuc3dlcixcbiAgICAgKiBhbmQgdGhlbiBzdGFydCBzdGF0dXMgY2hlY2sgd29ya2VyXG4gICAgICovXG4gICAgY2JBZnRlclN0YXJ0RG93bmxvYWRGaXJtd2FyZShyZXNwb25zZSkge1xuICAgICAgICAvLyB2MyBlbnZlbG9wZTogcGF5bG9hZCBsaXZlcyBpbiByZXNwb25zZS5kYXRhLCBzdWNjZXNzIGZsYWcgaXMgYHJlc3VsdGBcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUocmVzcG9uc2UuZGF0YS5maWxlbmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoKHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzKSB8fCBnbG9iYWxUcmFuc2xhdGUudXBkX0Rvd25sb2FkVXBncmFkZUVycm9yKTtcbiAgICAgICAgICAgIHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IGZhbHNlO1xuICAgICAgICAgICAgJCgnaS5sb2FkaW5nLnJlZG8nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBuZXcgYmxvY2sgb2YgdXBkYXRlIGluZm9ybWF0aW9uIG9uIHBhZ2VcbiAgICAgKi9cbiAgICBhZGROZXdWZXJzaW9uSW5mb3JtYXRpb24ob2JqKSB7XG4gICAgICAgICQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcbiAgICAgICAgbGV0IG1hcmtkb3duVGV4dCA9IGRlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pO1xuICAgICAgICBtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvPGJyPi9nLCAnXFxyJyk7XG4gICAgICAgIG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnIgPi9nLCAnXFxyJyk7XG4gICAgICAgIG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC9cXCogXFwqL2csICcqJyk7XG4gICAgICAgIG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC9cXCpcXCovZywgJyonKTtcbiAgICAgICAgY29uc3QgaHRtbCA9IHVwZGF0ZVBCWC5jb252ZXJ0ZXIubWFrZUh0bWwobWFya2Rvd25UZXh0KVxuICAgICAgICAgICAgLnJlcGxhY2UoLzx0YWJsZT4vZywgJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgYmFzaWMgY29tcGFjdCBjZWxsZWQgdGFibGVcIj4nKTtcbiAgICAgICAgY29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cInVwZGF0ZS1yb3dcIj5cblx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0PHRkPiR7aHRtbH08L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiByZWRvIHBvcHVwZWRcIiBcbiAgICBcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmV9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCJcblx0XHRcdFx0XHRkYXRhLXZlcnNpb24gPSBcIiR7b2JqLnZlcnNpb259XCIgPlxuXHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0XHQ8L2E+XG5cdFx0XHRcdDxhIGhyZWY9XCIke29iai5ocmVmfVwiIGNsYXNzPVwidWkgYnV0dG9uIGRvd25sb2FkIHBvcHVwZWRcIiBcblx0XHRcdFx0XHRkYXRhLWNvbnRlbnQgPSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEb3dubG9hZH1cIlxuXHRcdFx0XHRcdGRhdGEtbWQ1ID1cIiR7b2JqLm1kNX1cIiBkYXRhLXNpemUgPVwiJHtvYmouc2l6ZX1cIj5cblx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT5cblx0XHRcdFx0PC9hPlxuICAgIFx0XHQ8L2Rpdj4gICBcblx0PC90cj5gO1xuICAgICAgICAkKCcjdXBkYXRlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW1hbmljUm93KTtcbiAgICAgICAgJCgnYS5wb3B1cGVkJykucG9wdXAoKTtcbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHVwZGF0ZSBwYnggZmlybXdhcmUgZnJvbSBpbWFnZSBwYWdlXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgdXBkYXRlUEJYLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FB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