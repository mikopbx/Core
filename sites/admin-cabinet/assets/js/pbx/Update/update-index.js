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
   * @type {Converter}
   */
  converter: new showdown.Converter(),

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
}; // When the document is ready, initialize the update pbx firmware from image page

$(document).ready(function () {
  updatePBX.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbInVwZGF0ZVBCWCIsIiRmb3JtT2JqIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc0JhckxhYmVsIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHVwZ3JhZGVNb2RhbEZvcm0iLCIkaUhhdmVCYWNrdXBJbnB1dCIsIiRzdGFydFVwZ3JhZGVCdXR0b24iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwiaW5pdGlhbGl6ZSIsIiQiLCJtb2RhbCIsImFkZENsYXNzIiwib24iLCJlIiwidGFyZ2V0IiwicGFyZW50cyIsImNsaWNrIiwiZmlsZXMiLCJ1bmRlZmluZWQiLCJmaWxlbmFtZSIsIm5hbWUiLCJwYXJlbnQiLCJ2YWwiLCJyZW1vdmVDbGFzcyIsImdsb2JhbFRyYW5zbGF0ZSIsInVwZF9FbnRlcklIYXZlQmFja3VwUGhyYXNlIiwicHJldmVudERlZmF1bHQiLCJoYXNDbGFzcyIsImZvcm0iLCJmaWVsZHMiLCJ2YWxpZGF0ZVJ1bGVzIiwib25TdWNjZXNzIiwiY2xvc2FibGUiLCJvbkRlbnkiLCJvbkFwcHJvdmUiLCJkYXRhIiwiRmlsZXNBUEkiLCJ1cGxvYWRGaWxlIiwiY2JSZXN1bWFibGVVcGxvYWRGaWxlIiwiU3lzdGVtQVBJIiwiY2hlY2tGb3JVcGRhdGVzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJoYXNVcGRhdGVzIiwiZmlybXdhcmUiLCJjdXJyZW50VmVyaXNvbiIsInJlcGxhY2UiLCJmb3JFYWNoIiwib2JqIiwidmVyc2lvbiIsInZlcnNpb25Db21wYXJlIiwiYWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uIiwicGFyYW1zIiwiJGFMaW5rIiwiY2xvc2VzdCIsInVybCIsImF0dHIiLCJtZDUiLCJmaW5kIiwiZG93bmxvYWRGaXJtd2FyZSIsImNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUiLCJhY3Rpb24iLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwic2hvdyIsInRleHQiLCJ1cGRfVXBsb2FkSW5Qcm9ncmVzcyIsInByb2dyZXNzIiwicGVyY2VudCIsInBhcnNlSW50IiwidXBkX1VwbG9hZEVycm9yIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJQYnhBcGkiLCJ0cnlQYXJzZUpTT04iLCJqc29uIiwiSlNPTiIsInBhcnNlIiwidXBsb2FkSWQiLCJ1cGxvYWRfaWQiLCJmaWxlUGF0aCIsIkZpbGVVcGxvYWRFdmVudEhhbmRsZXIiLCJzdWJzY3JpYmUiLCJvbk1lcmdlU3RhcnRlZCIsImNvbnNvbGUiLCJsb2ciLCJvbk1lcmdlUHJvZ3Jlc3MiLCJvbk1lcmdlQ29tcGxldGUiLCJ1cGRfVXBncmFkZUluUHJvZ3Jlc3MiLCJ1cGdyYWRlIiwidGVtcF9maWxlbmFtZSIsImNiQWZ0ZXJTdGFydFVwZGF0ZSIsIm9uRXJyb3IiLCJlcnJvciIsIm1lc3NhZ2VzIiwidXBkX1VwZ3JhZGVFcnJvciIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwibWFya2Rvd25UZXh0IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZGVzY3JpcHRpb24iLCJodG1sIiwibWFrZUh0bWwiLCJkeW1hbmljUm93IiwiaHJlZiIsImJ0X1Rvb2xUaXBVcGdyYWRlT25saW5lIiwic2l6ZSIsImJ0X1Rvb2xUaXBEb3dubG9hZCIsImFwcGVuZCIsInBvcHVwIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFNBQVMsR0FBRztBQUNkO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLElBTkk7O0FBUWQ7QUFDSjtB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K0UsdUJBUGxCLHVDQVFOdkQsR0FBRyxDQUFDUyxHQVJFLDZCQVFrQlQsR0FBRyxDQUFDd0QsSUFSdEIsNENBU0R4RCxHQUFHLENBQUNDLE9BVEgsMElBYVRELEdBQUcsQ0FBQ3NELElBYkssa0ZBY0Q5RSxlQUFlLENBQUNpRixrQkFkZix1Q0FlTnpELEdBQUcsQ0FBQ1MsR0FmRSw2QkFla0JULEdBQUcsQ0FBQ3dELElBZnRCLGtHQUFoQjtBQW9CQS9GLElBQUFBLENBQUMsQ0FBQyxzQkFBRCxDQUFELENBQTBCaUcsTUFBMUIsQ0FBaUNMLFVBQWpDO0FBQ0E1RixJQUFBQSxDQUFDLENBQUMsV0FBRCxDQUFELENBQWVrRyxLQUFmO0FBQ0g7QUFsVWEsQ0FBbEIsQyxDQXFVQTs7QUFDQWxHLENBQUMsQ0FBQ21HLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJuSCxFQUFBQSxTQUFTLENBQUNjLFVBQVY7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsUEJYVmVyc2lvbiwgZ2xvYmFsVHJhbnNsYXRlLFxuZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSwgc2hvd2Rvd24sIFVzZXJNZXNzYWdlLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciwgU3lzdGVtQVBJLCBGaWxlc0FQSSwgRmlsZVVwbG9hZEV2ZW50SGFuZGxlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgUEJYIGZpcm13YXJlIHVwZGF0ZXMuXG4gKlxuICogQG1vZHVsZSB1cGRhdGVQQlhcbiAqL1xuY29uc3QgdXBkYXRlUEJYID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN1Ym1pdCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHByb2dyZXNzIGJhci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwcm9ncmVzc0JhcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBwcm9ncmVzcyBiYXIgbGFiZWwuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJvZ3Jlc3NCYXJMYWJlbDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdmVyc2lvbiBvZiB0aGUgUEJYIGZpcm13YXJlLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgY3VycmVudFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbW9kYWwgZm9ybSBiZWZvcmUgdXBncmFkZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1cGdyYWRlTW9kYWxGb3JtOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiSSBoYXZlIGJhY2t1cFwiIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGlIYXZlQmFja3VwSW5wdXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZ3JlZW4gYnV0dG9uIG9uIG1vZGFsIGZvcm0gYmVmb3JlIHVwZ3JhZGUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3RhcnRVcGdyYWRlQnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlcmUgaXMgdXBncmFkZSBwcm9jZXNzIHdvcmtpbmcgbm93IGZsYWcuXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgdXBncmFkZUluUHJvZ3Jlc3M6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSGVscHMgdG8gY29udmVydCBtYXJrZG93biBpbnRvIGh0bWwuXG4gICAgICogQHR5cGUge0NvbnZlcnRlcn1cbiAgICAgKi9cbiAgICBjb252ZXJ0ZXI6IG5ldyBzaG93ZG93bi5Db252ZXJ0ZXIoKSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSB1cGRhdGUgUEJYIGZpcm13YXJlIGZ1bmN0aW9uYWxpdHkuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdXBkYXRlUEJYLiRmb3JtT2JqID0gJCgnI3VwZ3JhZGUtZm9ybScpO1xuICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbiA9ICQoJyNzdWJtaXRidXR0b24nKTtcbiAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0JhciA9ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyJyk7XG4gICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbCA9ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyLWxhYmVsJyk7XG4gICAgICAgIHVwZGF0ZVBCWC4kdXBncmFkZU1vZGFsRm9ybSA9ICQoJyN1cGRhdGUtbW9kYWwtZm9ybScpO1xuICAgICAgICB1cGRhdGVQQlguJGlIYXZlQmFja3VwSW5wdXQgPSAkKFwiaW5wdXRbbmFtZT0naS1oYXZlLWJhY2t1cC1pbnB1dCddXCIpO1xuICAgICAgICB1cGRhdGVQQlguJHN0YXJ0VXBncmFkZUJ1dHRvbiA9ICQoJyNzdGFydC11cGdyYWRlLWJ1dHRvbicpO1xuXG4gICAgICAgIC8vIE9wZW4gdGhlIHVwZ3JhZGUgbW9kYWwgZm9ybVxuICAgICAgICB1cGRhdGVQQlguJHVwZ3JhZGVNb2RhbEZvcm0ubW9kYWwoKTtcblxuICAgICAgICAvLyBBZGQgJ2Rpc2FibGVkJyBjbGFzcyB0byBzdWJtaXQgYnV0dG9uXG4gICAgICAgIHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgZmlsZSBpbnB1dCBjbGljayB3aGVuIGNsaWNraW5nIG9uIHRleHQgaW5wdXQgb3IgYnV0dG9uXG4gICAgICAgICQoJ2lucHV0OnRleHQsIC51aS5idXR0b24nLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAkKCdpbnB1dDpmaWxlJywgJChlLnRhcmdldCkucGFyZW50cygpKS5jbGljaygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGRhdGUgdGV4dCBpbnB1dCB2YWx1ZSB3aGVuIHNlbGVjdGluZyBhIGZpbGVcbiAgICAgICAgJCgnaW5wdXQ6ZmlsZScsICcudWkuYWN0aW9uLmlucHV0Jykub24oJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQuZmlsZXNbMF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lID0gZS50YXJnZXQuZmlsZXNbMF0ubmFtZTtcbiAgICAgICAgICAgICAgICAkKCdpbnB1dDp0ZXh0JywgJChlLnRhcmdldCkucGFyZW50KCkpLnZhbChmaWxlbmFtZSk7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyYWNrIHRoZSBpbnB1dCBmaWVsZCBhbmQgbWFrZSBzdWJtaXQgYnV0dG9uIGF2YWlsYWJsZSBpZiBwaHJhc2UgaXMgZXF1YWwgdG8gJ0kgaGF2ZSBiYWNrdXAnXG4gICAgICAgIHVwZGF0ZVBCWC4kaUhhdmVCYWNrdXBJbnB1dC5vbignaW5wdXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh1cGRhdGVQQlguJGlIYXZlQmFja3VwSW5wdXQudmFsKCk9PT1nbG9iYWxUcmFuc2xhdGUudXBkX0VudGVySUhhdmVCYWNrdXBQaHJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdGFydFVwZ3JhZGVCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdGFydFVwZ3JhZGVCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgc3VibWl0IGJ1dHRvbiBjbGlja1xuICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykgfHwgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzKSByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBmb3JtIGFuZCBzaG93IHRoZSB1cGdyYWRlIG1vZGFsIGZvcm0gb24gc3VjY2Vzc1xuICAgICAgICAgICAgdXBkYXRlUEJYLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IHVwZGF0ZVBCWC52YWxpZGF0ZVJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHVwZ3JhZGVNb2RhbEZvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubW9kYWwoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRGVueTogKCkgPT4gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTdGFydCB0aGUgZmlsZSB1cGxvYWQgcHJvY2Vzc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gJCgnaW5wdXQ6ZmlsZScpWzBdLmZpbGVzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRmlsZXNBUEkudXBsb2FkRmlsZShkYXRhLCB1cGRhdGVQQlguY2JSZXN1bWFibGVVcGxvYWRGaWxlLCBbJ2ltZyddLCAnZmlybXdhcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBmb3JtXG4gICAgICAgICAgICB1cGRhdGVQQlguJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVc2UgdW5pZmllZCBTeXN0ZW1BUEkgdG8gY2hlY2sgZm9yIGZpcm13YXJlIHVwZGF0ZXNcbiAgICAgICAgU3lzdGVtQVBJLmNoZWNrRm9yVXBkYXRlcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWxcbiAgICAgICAgICAgIC8vIE5PVEU6IHRoZSB2MyBlbnZlbG9wZSAoUEJYQXBpUmVzdWx0OjpnZXRSZXN1bHQpIGV4cG9zZXMgdGhlIHN1Y2Nlc3NcbiAgICAgICAgICAgIC8vIGZsYWcgYXMgYHJlc3VsdGAsIG5vdCBgc3VjY2Vzc2AuIFVzaW5nIGBzdWNjZXNzYCBoZXJlIHNpbGVudGx5XG4gICAgICAgICAgICAvLyBlYXJseS1yZXR1cm5lZCBhbmQgbGVmdCB0aGUgdXBkYXRlcyB0YWJsZSBlbXB0eSAocmVncmVzc2lvbiBmcm9tXG4gICAgICAgICAgICAvLyBkMTYwMzFlM2QpLiBLZWVwIHRoaXMgYWxpZ25lZCB3aXRoIFBieEFwaUNsaWVudC5zdWNjZXNzVGVzdCgpLlxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB1cGRhdGVzIGFyZSBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5oYXNVcGRhdGVzIHx8ICFyZXNwb25zZS5kYXRhLmZpcm13YXJlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZmlybXdhcmUgb2JqZWN0cyBhbmQgYWRkIHZlcnNpb24gaW5mb3JtYXRpb25cbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWZXJpc29uID0gdXBkYXRlUEJYLmN1cnJlbnRWZXJzaW9uLnJlcGxhY2UoJy1kZXYnLCAnJyk7XG4gICAgICAgICAgICByZXNwb25zZS5kYXRhLmZpcm13YXJlLmZvckVhY2goKG9iaikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBvYmoudmVyc2lvbi5yZXBsYWNlKCctZGV2JywgJycpO1xuICAgICAgICAgICAgICAgIGlmICh2ZXJzaW9uQ29tcGFyZSh2ZXJzaW9uLCBjdXJyZW50VmVyaXNvbikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC5hZGROZXdWZXJzaW9uSW5mb3JtYXRpb24ob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSGFuZGxlIHJlZG8gYnV0dG9uIGNsaWNrXG4gICAgICAgICAgICAkKCdhLnJlZG8nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHVwZ3JhZGVNb2RhbEZvcm1cbiAgICAgICAgICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uRGVueTogKCkgPT4gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByZXBhcmUgcGFyYW1ldGVycyBmb3IgZmlybXdhcmUgZG93bmxvYWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnVybCA9ICRhTGluay5hdHRyKCdocmVmJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm1kNSA9ICRhTGluay5hdHRyKCdkYXRhLW1kNScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy52ZXJzaW9uID0gJGFMaW5rLmF0dHIoJ2RhdGEtdmVyc2lvbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRhTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZpbGVzQVBJLmRvd25sb2FkRmlybXdhcmUocGFyYW1zLCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0RG93bmxvYWRGaXJtd2FyZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZm9yIHJlc3VtYWJsZSBmaWxlIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiBvZiB0aGUgdXBsb2FkLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgZm9yIHRoZSB1cGxvYWQuXG4gICAgICovXG4gICAgY2JSZXN1bWFibGVVcGxvYWRGaWxlKGFjdGlvbiwgcGFyYW1zKSB7XG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdmaWxlU3VjY2Vzcyc6XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLmNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VwbG9hZFN0YXJ0JzpcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIuc2hvdygpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkSW5Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdwcm9ncmVzcyc6XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG4gICAgICAgICAgICAgICAgICAgIHBlcmNlbnQ6IHBhcnNlSW50KHBhcmFtcy5wZXJjZW50LCAxMCksXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgc3RhdHVzIG9mIHRoZSBmaWxlIG1lcmdpbmcgcHJvY2Vzcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgL3BieGNvcmUvYXBpL3VwbG9hZC9zdGF0dXMgZnVuY3Rpb24uXG4gICAgICovXG4gICAgY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBQYnhBcGkudHJ5UGFyc2VKU09OKHJlc3BvbnNlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcbiAgICAgICAgaWYgKGpzb24gPT09IHVuZGVmaW5lZCB8fCBqc29uLmRhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdXBsb2FkSWQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gV2ViU29ja2V0IGV2ZW50cyBpbnN0ZWFkIG9mIHVzaW5nIHBvbGxpbmcgd29ya2VyXG4gICAgICAgIEZpbGVVcGxvYWRFdmVudEhhbmRsZXIuc3Vic2NyaWJlKHVwbG9hZElkLCB7XG4gICAgICAgICAgICBvbk1lcmdlU3RhcnRlZDogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEluUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGaXJtd2FyZSBtZXJnZSBzdGFydGVkOicsIGRhdGEpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZVByb2dyZXNzOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyBiYXIgZHVyaW5nIG1lcmdlXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucHJvZ3Jlc3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlcmNlbnQ6IHBhcnNlSW50KGRhdGEucHJvZ3Jlc3MsIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBGaXJtd2FyZSBtZXJnZSBwcm9ncmVzczogJHtkYXRhLnByb2dyZXNzfSVgKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uTWVyZ2VDb21wbGV0ZTogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBNZXJnZSBjb21wbGV0ZSAtIHN0YXJ0IHVwZ3JhZGUgcHJvY2Vzc1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBncmFkZUluUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIC8vIEJhY2tlbmQgZXhwZWN0cyAndGVtcF9maWxlbmFtZScgcGFyYW1ldGVyLCBub3QgJ2ZpbGVuYW1lJ1xuICAgICAgICAgICAgICAgIFN5c3RlbUFQSS51cGdyYWRlKHt0ZW1wX2ZpbGVuYW1lOiBmaWxlUGF0aH0sIHVwZGF0ZVBCWC5jYkFmdGVyU3RhcnRVcGRhdGUpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25FcnJvcjogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgc3RhcnQgUEJYIHVwZ3JhZGluZ1xuICAgICAqIEBwYXJhbSByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTdGFydFVwZGF0ZShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UucmVzdWx0PT09ZmFsc2UpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcywgZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGdyYWRlRXJyb3IpO1xuICAgICAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZnRlciBzdGFydCBvbmxpbmUgdXBncmFkZSB3ZSBoYXZlIHRvIHdhaXQgYW4gYW5zd2VyLFxuICAgICAqIGFuZCB0aGVuIHN0YXJ0IHN0YXR1cyBjaGVjayB3b3JrZXJcbiAgICAgKi9cbiAgICBjYkFmdGVyU3RhcnREb3dubG9hZEZpcm13YXJlKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5maWxlbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKHJlc3BvbnNlLmZpbGVuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IGZhbHNlO1xuICAgICAgICAgICAgJCgnaS5sb2FkaW5nLnJlZG8nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBuZXcgYmxvY2sgb2YgdXBkYXRlIGluZm9ybWF0aW9uIG9uIHBhZ2VcbiAgICAgKi9cbiAgICBhZGROZXdWZXJzaW9uSW5mb3JtYXRpb24ob2JqKSB7XG4gICAgICAgICQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcbiAgICAgICAgbGV0IG1hcmtkb3duVGV4dCA9IGRlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pO1xuICAgICAgICBtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvPGJyPi9nLCAnXFxyJyk7XG4gICAgICAgIG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnIgPi9nLCAnXFxyJyk7XG4gICAgICAgIG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC9cXCogXFwqL2csICcqJyk7XG4gICAgICAgIG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC9cXCpcXCovZywgJyonKTtcbiAgICAgICAgY29uc3QgaHRtbCA9IHVwZGF0ZVBCWC5jb252ZXJ0ZXIubWFrZUh0bWwobWFya2Rvd25UZXh0KTtcbiAgICAgICAgY29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cInVwZGF0ZS1yb3dcIj5cblx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0PHRkPiR7aHRtbH08L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiByZWRvIHBvcHVwZWRcIiBcbiAgICBcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmV9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCJcblx0XHRcdFx0XHRkYXRhLXZlcnNpb24gPSBcIiR7b2JqLnZlcnNpb259XCIgPlxuXHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0XHQ8L2E+XG5cdFx0XHRcdDxhIGhyZWY9XCIke29iai5ocmVmfVwiIGNsYXNzPVwidWkgYnV0dG9uIGRvd25sb2FkIHBvcHVwZWRcIiBcblx0XHRcdFx0XHRkYXRhLWNvbnRlbnQgPSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEb3dubG9hZH1cIlxuXHRcdFx0XHRcdGRhdGEtbWQ1ID1cIiR7b2JqLm1kNX1cIiBkYXRhLXNpemUgPVwiJHtvYmouc2l6ZX1cIj5cblx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT5cblx0XHRcdFx0PC9hPlxuICAgIFx0XHQ8L2Rpdj4gICBcblx0PC90cj5gO1xuICAgICAgICAkKCcjdXBkYXRlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW1hbmljUm93KTtcbiAgICAgICAgJCgnYS5wb3B1cGVkJykucG9wdXAoKTtcbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHVwZGF0ZSBwYnggZmlybXdhcmUgZnJvbSBpbWFnZSBwYWdlXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgdXBkYXRlUEJYLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=