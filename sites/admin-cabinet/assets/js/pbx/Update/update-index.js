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
    var html = updatePBX.converter.makeHtml(markdownText);
    var dymanicRow = "\n\t\t\t<tr class=\"update-row\">\n\t\t\t<td class=\"center aligned\">".concat(obj.version, "</td>\n\t\t\t<td>").concat(html, "</td>\n\t\t\t<td class=\"right aligned collapsing\">\n    \t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t<a href=\"").concat(obj.href, "\" class=\"ui button redo popuped\" \n    \t\t\t\tdata-content = \"").concat(globalTranslate.bt_ToolTipUpgradeOnline, "\"\n\t\t\t\t\tdata-md5 =\"").concat(obj.md5, "\" data-size =\"").concat(obj.size, "\"\n\t\t\t\t\tdata-version = \"").concat(obj.version, "\" >\n\t\t\t\t\t<i class=\"icon redo blue\"></i>\n\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t</a>\n\t\t\t\t<a href=\"").concat(obj.href, "\" class=\"ui button download popuped\" \n\t\t\t\t\tdata-content = \"").concat(globalTranslate.bt_ToolTipDownload, "\"\n\t\t\t\t\tdata-md5 =\"").concat(obj.md5, "\" data-size =\"").concat(obj.size, "\">\n\t\t\t\t\t<i class=\"icon download blue\"></i>\n\t\t\t\t</a>\n    \t\t</div>   \n\t</tr>");
    $('#updates-table tbody').append(dymanicRow);
    $('a.popuped').popup();
  }
}; // When the document is ready, initialize the update pbx firmware from image page

$(document).ready(function () {
  updatePBX.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbInVwZGF0ZVBCWCIsIiRmb3JtT2JqIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc0JhckxhYmVsIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHVwZ3JhZGVNb2RhbEZvcm0iLCIkaUhhdmVCYWNrdXBJbnB1dCIsIiRzdGFydFVwZ3JhZGVCdXR0b24iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwiaW5pdGlhbGl6ZSIsIiQiLCJtb2RhbCIsImFkZENsYXNzIiwib24iLCJlIiwidGFyZ2V0IiwicGFyZW50cyIsImNsaWNrIiwiZmlsZXMiLCJ1bmRlZmluZWQiLCJmaWxlbmFtZSIsIm5hbWUiLCJwYXJlbnQiLCJ2YWwiLCJyZW1vdmVDbGFzcyIsImdsb2JhbFRyYW5zbGF0ZSIsInVwZF9FbnRlcklIYXZlQmFja3VwUGhyYXNlIiwicHJldmVudERlZmF1bHQiLCJoYXNDbGFzcyIsImZvcm0iLCJmaWVsZHMiLCJ2YWxpZGF0ZVJ1bGVzIiwib25TdWNjZXNzIiwiY2xvc2FibGUiLCJvbkRlbnkiLCJvbkFwcHJvdmUiLCJkYXRhIiwiRmlsZXNBUEkiLCJ1cGxvYWRGaWxlIiwiY2JSZXN1bWFibGVVcGxvYWRGaWxlIiwiU3lzdGVtQVBJIiwiY2hlY2tGb3JVcGRhdGVzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJoYXNVcGRhdGVzIiwiZmlybXdhcmUiLCJjdXJyZW50VmVyaXNvbiIsInJlcGxhY2UiLCJmb3JFYWNoIiwib2JqIiwidmVyc2lvbiIsInZlcnNpb25Db21wYXJlIiwiYWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uIiwicGFyYW1zIiwiJGFMaW5rIiwiY2xvc2VzdCIsInVybCIsImF0dHIiLCJtZDUiLCJmaW5kIiwiZG93bmxvYWRGaXJtd2FyZSIsImNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUiLCJhY3Rpb24iLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwic2hvdyIsInRleHQiLCJ1cGRfVXBsb2FkSW5Qcm9ncmVzcyIsInByb2dyZXNzIiwicGVyY2VudCIsInBhcnNlSW50IiwidXBkX1VwbG9hZEVycm9yIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJQYnhBcGkiLCJ0cnlQYXJzZUpTT04iLCJqc29uIiwiSlNPTiIsInBhcnNlIiwidXBsb2FkSWQiLCJ1cGxvYWRfaWQiLCJmaWxlUGF0aCIsIkZpbGVVcGxvYWRFdmVudEhhbmRsZXIiLCJzdWJzY3JpYmUiLCJvbk1lcmdlU3RhcnRlZCIsImNvbnNvbGUiLCJsb2ciLCJvbk1lcmdlUHJvZ3Jlc3MiLCJvbk1lcmdlQ29tcGxldGUiLCJ1cGRfVXBncmFkZUluUHJvZ3Jlc3MiLCJ1cGdyYWRlIiwidGVtcF9maWxlbmFtZSIsImNiQWZ0ZXJTdGFydFVwZGF0ZSIsIm9uRXJyb3IiLCJlcnJvciIsIm1lc3NhZ2VzIiwidXBkX1VwZ3JhZGVFcnJvciIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwidXBkX0Rvd25sb2FkVXBncmFkZUVycm9yIiwibWFya2Rvd25UZXh0IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZGVzY3JpcHRpb24iLCJodG1sIiwibWFrZUh0bWwiLCJkeW1hbmljUm93IiwiaHJlZiIsImJ0X1Rvb2xUaXBVcGdyYWRlT25saW5lIiwic2l6ZSIsImJ0X1Rvb2xUaXBEb3dubG9hZCIsImFwcGVuZCIsInBvcHVwIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFNBQVMsR0FBRztBQUNkO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLElBTkk7O0FBUWQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLElBWkQ7O0FBY2Q7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBbEJBOztBQW9CZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRSxJQXhCTDs7QUEwQmQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFQyxnQkE5QkY7O0FBZ0NkO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLElBcENMOztBQXNDZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRSxJQTFDTDs7QUE0Q2Q7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsbUJBQW1CLEVBQUUsSUFoRFA7O0FBa0RkO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLEtBdERMOztBQXdEZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsSUFBSUMsUUFBUSxDQUFDQyxTQUFiLEVBNURHOztBQThEZDtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFqRWMsd0JBaUVEO0FBQ1RkLElBQUFBLFNBQVMsQ0FBQ0MsUUFBVixHQUFxQmMsQ0FBQyxDQUFDLGVBQUQsQ0FBdEI7QUFDQWYsSUFBQUEsU0FBUyxDQUFDRSxhQUFWLEdBQTBCYSxDQUFDLENBQUMsZUFBRCxDQUEzQjtBQUNBZixJQUFBQSxTQUFTLENBQUNHLFlBQVYsR0FBeUJZLENBQUMsQ0FBQyxzQkFBRCxDQUExQjtBQUNBZixJQUFBQSxTQUFTLENBQUNJLGlCQUFWLEdBQThCVyxDQUFDLENBQUMsNEJBQUQsQ0FBL0I7QUFDQWYsSUFBQUEsU0FBUyxDQUFDTyxpQkFBVixHQUE4QlEsQ0FBQyxDQUFDLG9CQUFELENBQS9CO0FBQ0FmLElBQUFBLFNBQVMsQ0FBQ1EsaUJBQVYsR0FBOEJPLENBQUMsQ0FBQyxtQ0FBRCxDQUEvQjtBQUNBZixJQUFBQSxTQUFTLENBQUNTLG1CQUFWLEdBQWdDTSxDQUFDLENBQUMsdUJBQUQsQ0FBakMsQ0FQUyxDQVNUOztBQUNBZixJQUFBQSxTQUFTLENBQUNPLGlCQUFWLENBQTRCUyxLQUE1QixHQVZTLENBWVQ7O0FBQ0FoQixJQUFBQSxTQUFTLENBQUNFLGFBQVYsQ0FBd0JlLFFBQXhCLENBQWlDLFVBQWpDLEVBYlMsQ0FlVDs7QUFDQUYsSUFBQUEsQ0FBQyxDQUFDLHdCQUFELEVBQTJCLGtCQUEzQixDQUFELENBQWdERyxFQUFoRCxDQUFtRCxPQUFuRCxFQUE0RCxVQUFDQyxDQUFELEVBQU87QUFDL0RKLE1BQUFBLENBQUMsQ0FBQyxZQUFELEVBQWVBLENBQUMsQ0FBQ0ksQ0FBQyxDQUFDQyxNQUFILENBQUQsQ0FBWUMsT0FBWixFQUFmLENBQUQsQ0FBdUNDLEtBQXZDO0FBQ0gsS0FGRCxFQWhCUyxDQW9CVDs7QUFDQVAsSUFBQUEsQ0FBQyxDQUFDLFlBQUQsRUFBZSxrQkFBZixDQUFELENBQW9DRyxFQUFwQyxDQUF1QyxRQUF2QyxFQUFpRCxVQUFDQyxDQUFELEVBQU87QUFDcEQsVUFBSUEsQ0FBQyxDQUFDQyxNQUFGLENBQVNHLEtBQVQsQ0FBZSxDQUFmLE1BQXNCQyxTQUExQixFQUFxQztBQUNqQyxZQUFNQyxRQUFRLEdBQUdOLENBQUMsQ0FBQ0MsTUFBRixDQUFTRyxLQUFULENBQWUsQ0FBZixFQUFrQkcsSUFBbkM7QUFDQVgsUUFBQUEsQ0FBQyxDQUFDLFlBQUQsRUFBZUEsQ0FBQyxDQUFDSSxDQUFDLENBQUNDLE1BQUgsQ0FBRCxDQUFZTyxNQUFaLEVBQWYsQ0FBRCxDQUFzQ0MsR0FBdEMsQ0FBMENILFFBQTFDO0FBQ0F6QixRQUFBQSxTQUFTLENBQUNFLGFBQVYsQ0FBd0IyQixXQUF4QixDQUFvQyxVQUFwQztBQUNIO0FBQ0osS0FORCxFQXJCUyxDQTZCVDs7QUFDQTdCLElBQUFBLFNBQVMsQ0FBQ1EsaUJBQVYsQ0FBNEJVLEVBQTVCLENBQStCLE9BQS9CLEVBQXdDLFVBQUNDLENBQUQsRUFBTztBQUN2QyxVQUFJbkIsU0FBUyxDQUFDUSxpQkFBVixDQUE0Qm9CLEdBQTVCLE9BQW9DRSxlQUFlLENBQUNDLDBCQUF4RCxFQUFvRjtBQUNoRi9CLFFBQUFBLFNBQVMsQ0FBQ1MsbUJBQVYsQ0FBOEJvQixXQUE5QixDQUEwQyxVQUExQztBQUNILE9BRkQsTUFFTztBQUNIN0IsUUFBQUEsU0FBUyxDQUFDUyxtQkFBVixDQUE4QlEsUUFBOUIsQ0FBdUMsVUFBdkM7QUFDSDtBQUNSLEtBTkQsRUE5QlMsQ0FzQ1Q7O0FBQ0FqQixJQUFBQSxTQUFTLENBQUNFLGFBQVYsQ0FBd0JnQixFQUF4QixDQUEyQixPQUEzQixFQUFvQyxVQUFDQyxDQUFELEVBQU87QUFDdkNBLE1BQUFBLENBQUMsQ0FBQ2EsY0FBRjtBQUNBLFVBQUloQyxTQUFTLENBQUNFLGFBQVYsQ0FBd0IrQixRQUF4QixDQUFpQyxTQUFqQyxLQUErQ2pDLFNBQVMsQ0FBQ1UsaUJBQTdELEVBQWdGLE9BRnpDLENBSXZDOztBQUNBVixNQUFBQSxTQUFTLENBQUNDLFFBQVYsQ0FDS2lDLElBREwsQ0FDVTtBQUNGaEIsUUFBQUEsRUFBRSxFQUFFLE1BREY7QUFFRmlCLFFBQUFBLE1BQU0sRUFBRW5DLFNBQVMsQ0FBQ29DLGFBRmhCO0FBR0ZDLFFBQUFBLFNBSEUsdUJBR1U7QUFDUnJDLFVBQUFBLFNBQVMsQ0FBQ08saUJBQVYsQ0FDS1MsS0FETCxDQUNXO0FBQ0hzQixZQUFBQSxRQUFRLEVBQUUsS0FEUDtBQUVIQyxZQUFBQSxNQUFNLEVBQUU7QUFBQSxxQkFBTSxJQUFOO0FBQUEsYUFGTDtBQUdIQyxZQUFBQSxTQUFTLEVBQUUscUJBQU07QUFDYjtBQUNBeEMsY0FBQUEsU0FBUyxDQUFDRSxhQUFWLENBQXdCZSxRQUF4QixDQUFpQyxTQUFqQztBQUNBakIsY0FBQUEsU0FBUyxDQUFDVSxpQkFBVixHQUE4QixJQUE5QjtBQUNBLGtCQUFNK0IsSUFBSSxHQUFHMUIsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQixDQUFoQixFQUFtQlEsS0FBbkIsQ0FBeUIsQ0FBekIsQ0FBYjtBQUNBbUIsY0FBQUEsUUFBUSxDQUFDQyxVQUFULENBQW9CRixJQUFwQixFQUEwQnpDLFNBQVMsQ0FBQzRDLHFCQUFwQyxFQUEyRCxDQUFDLEtBQUQsQ0FBM0QsRUFBb0UsVUFBcEU7QUFDQSxxQkFBTyxJQUFQO0FBQ0g7QUFWRSxXQURYLEVBYUs1QixLQWJMLENBYVcsTUFiWDtBQWNIO0FBbEJDLE9BRFYsRUFMdUMsQ0EyQnZDOztBQUNBaEIsTUFBQUEsU0FBUyxDQUFDQyxRQUFWLENBQW1CaUMsSUFBbkIsQ0FBd0IsZUFBeEI7QUFDSCxLQTdCRCxFQXZDUyxDQXNFVDs7QUFDQVcsSUFBQUEsU0FBUyxDQUFDQyxlQUFWLENBQTBCLFVBQUNDLFFBQUQsRUFBYztBQUNwQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBSSxDQUFDQSxRQUFELElBQWEsQ0FBQ0EsUUFBUSxDQUFDQyxNQUF2QixJQUFpQyxDQUFDRCxRQUFRLENBQUNOLElBQS9DLEVBQXFEO0FBQ2pEO0FBQ0gsT0FSbUMsQ0FVcEM7OztBQUNBLFVBQUksQ0FBQ00sUUFBUSxDQUFDTixJQUFULENBQWNRLFVBQWYsSUFBNkIsQ0FBQ0YsUUFBUSxDQUFDTixJQUFULENBQWNTLFFBQWhELEVBQTBEO0FBQ3REO0FBQ0gsT0FibUMsQ0FlcEM7OztBQUNBLFVBQU1DLGNBQWMsR0FBR25ELFNBQVMsQ0FBQ0ssY0FBVixDQUF5QitDLE9BQXpCLENBQWlDLE1BQWpDLEVBQXlDLEVBQXpDLENBQXZCO0FBQ0FMLE1BQUFBLFFBQVEsQ0FBQ04sSUFBVCxDQUFjUyxRQUFkLENBQXVCRyxPQUF2QixDQUErQixVQUFDQyxHQUFELEVBQVM7QUFDcEMsWUFBTUMsT0FBTyxHQUFHRCxHQUFHLENBQUNDLE9BQUosQ0FBWUgsT0FBWixDQUFvQixNQUFwQixFQUE0QixFQUE1QixDQUFoQjs7QUFDQSxZQUFJSSxjQUFjLENBQUNELE9BQUQsRUFBVUosY0FBVixDQUFkLEdBQTBDLENBQTlDLEVBQWlEO0FBQzdDbkQsVUFBQUEsU0FBUyxDQUFDeUQsd0JBQVYsQ0FBbUNILEdBQW5DO0FBQ0g7QUFDSixPQUxELEVBakJvQyxDQXdCcEM7O0FBQ0F2QyxNQUFBQSxDQUFDLENBQUMsUUFBRCxDQUFELENBQVlHLEVBQVosQ0FBZSxPQUFmLEVBQXdCLFVBQUNDLENBQUQsRUFBTztBQUMzQkEsUUFBQUEsQ0FBQyxDQUFDYSxjQUFGO0FBQ0EsWUFBSWhDLFNBQVMsQ0FBQ0UsYUFBVixDQUF3QitCLFFBQXhCLENBQWlDLFNBQWpDLEtBQStDakMsU0FBUyxDQUFDVSxpQkFBN0QsRUFBZ0Y7QUFDaEZWLFFBQUFBLFNBQVMsQ0FBQ08saUJBQVYsQ0FDS1MsS0FETCxDQUNXO0FBQ0hzQixVQUFBQSxRQUFRLEVBQUUsS0FEUDtBQUVIQyxVQUFBQSxNQUFNLEVBQUU7QUFBQSxtQkFBTSxJQUFOO0FBQUEsV0FGTDtBQUdIQyxVQUFBQSxTQUFTLEVBQUUscUJBQU07QUFDYjtBQUNBLGdCQUFNa0IsTUFBTSxHQUFHLEVBQWY7QUFDQSxnQkFBTUMsTUFBTSxHQUFHNUMsQ0FBQyxDQUFDSSxDQUFDLENBQUNDLE1BQUgsQ0FBRCxDQUFZd0MsT0FBWixDQUFvQixHQUFwQixDQUFmO0FBQ0FGLFlBQUFBLE1BQU0sQ0FBQ0csR0FBUCxHQUFhRixNQUFNLENBQUNHLElBQVAsQ0FBWSxNQUFaLENBQWI7QUFDQUosWUFBQUEsTUFBTSxDQUFDSyxHQUFQLEdBQWFKLE1BQU0sQ0FBQ0csSUFBUCxDQUFZLFVBQVosQ0FBYjtBQUNBSixZQUFBQSxNQUFNLENBQUNILE9BQVAsR0FBaUJJLE1BQU0sQ0FBQ0csSUFBUCxDQUFZLGNBQVosQ0FBakI7QUFDQUgsWUFBQUEsTUFBTSxDQUFDSyxJQUFQLENBQVksR0FBWixFQUFpQi9DLFFBQWpCLENBQTBCLFNBQTFCO0FBQ0FqQixZQUFBQSxTQUFTLENBQUNVLGlCQUFWLEdBQThCLElBQTlCO0FBQ0FnQyxZQUFBQSxRQUFRLENBQUN1QixnQkFBVCxDQUEwQlAsTUFBMUIsRUFBa0MxRCxTQUFTLENBQUNrRSw0QkFBNUM7QUFDQSxtQkFBTyxJQUFQO0FBQ0g7QUFkRSxTQURYLEVBaUJLbEQsS0FqQkwsQ0FpQlcsTUFqQlg7QUFrQkgsT0FyQkQ7QUFzQkgsS0EvQ0Q7QUFnREgsR0F4TGE7O0FBMExkO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTRCLEVBQUFBLHFCQS9MYyxpQ0ErTFF1QixNQS9MUixFQStMZ0JULE1BL0xoQixFQStMd0I7QUFDbEMsWUFBUVMsTUFBUjtBQUNJLFdBQUssYUFBTDtBQUNJbkUsUUFBQUEsU0FBUyxDQUFDb0Usc0JBQVYsQ0FBaUNWLE1BQU0sQ0FBQ1gsUUFBeEM7QUFDQTs7QUFDSixXQUFLLGFBQUw7QUFDSS9DLFFBQUFBLFNBQVMsQ0FBQ0UsYUFBVixDQUF3QmUsUUFBeEIsQ0FBaUMsU0FBakM7QUFDQWpCLFFBQUFBLFNBQVMsQ0FBQ0csWUFBVixDQUF1QmtFLElBQXZCO0FBQ0FyRSxRQUFBQSxTQUFTLENBQUNJLGlCQUFWLENBQTRCa0UsSUFBNUIsQ0FBaUN4QyxlQUFlLENBQUN5QyxvQkFBakQ7QUFDQTs7QUFDSixXQUFLLFVBQUw7QUFDSXZFLFFBQUFBLFNBQVMsQ0FBQ0csWUFBVixDQUF1QnFFLFFBQXZCLENBQWdDO0FBQzVCQyxVQUFBQSxPQUFPLEVBQUVDLFFBQVEsQ0FBQ2hCLE1BQU0sQ0FBQ2UsT0FBUixFQUFpQixFQUFqQjtBQURXLFNBQWhDO0FBR0E7O0FBQ0osV0FBSyxPQUFMO0FBQ0l6RSxRQUFBQSxTQUFTLENBQUNJLGlCQUFWLENBQTRCa0UsSUFBNUIsQ0FBaUN4QyxlQUFlLENBQUM2QyxlQUFqRDtBQUNBM0UsUUFBQUEsU0FBUyxDQUFDRSxhQUFWLENBQXdCMkIsV0FBeEIsQ0FBb0MsU0FBcEM7QUFDQStDLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0Qi9DLGVBQWUsQ0FBQzZDLGVBQTVDO0FBQ0E7O0FBQ0o7QUFuQko7QUFxQkgsR0FyTmE7O0FBdU5kO0FBQ0o7QUFDQTtBQUNBO0FBQ0lQLEVBQUFBLHNCQTNOYyxrQ0EyTlNyQixRQTNOVCxFQTJObUI7QUFDN0IsUUFBSUEsUUFBUSxLQUFLdkIsU0FBYixJQUEwQnNELE1BQU0sQ0FBQ0MsWUFBUCxDQUFvQmhDLFFBQXBCLE1BQWtDLEtBQWhFLEVBQXVFO0FBQ25FNkIsTUFBQUEsV0FBVyxDQUFDQyxlQUFaLFdBQStCL0MsZUFBZSxDQUFDNkMsZUFBL0M7QUFDQTtBQUNIOztBQUNELFFBQU1LLElBQUksR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVduQyxRQUFYLENBQWI7O0FBQ0EsUUFBSWlDLElBQUksS0FBS3hELFNBQVQsSUFBc0J3RCxJQUFJLENBQUN2QyxJQUFMLEtBQWNqQixTQUF4QyxFQUFtRDtBQUMvQ29ELE1BQUFBLFdBQVcsQ0FBQ0MsZUFBWixXQUErQi9DLGVBQWUsQ0FBQzZDLGVBQS9DO0FBQ0E7QUFDSDs7QUFDRCxRQUFNUSxRQUFRLEdBQUdILElBQUksQ0FBQ3ZDLElBQUwsQ0FBVTJDLFNBQTNCO0FBQ0EsUUFBTUMsUUFBUSxHQUFHTCxJQUFJLENBQUN2QyxJQUFMLENBQVVoQixRQUEzQixDQVg2QixDQWE3Qjs7QUFDQTZELElBQUFBLHNCQUFzQixDQUFDQyxTQUF2QixDQUFpQ0osUUFBakMsRUFBMkM7QUFDdkNLLE1BQUFBLGNBQWMsRUFBRSx3QkFBQy9DLElBQUQsRUFBVTtBQUN0QnpDLFFBQUFBLFNBQVMsQ0FBQ0ksaUJBQVYsQ0FBNEJrRSxJQUE1QixDQUFpQ3hDLGVBQWUsQ0FBQ3lDLG9CQUFqRDtBQUNBa0IsUUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVkseUJBQVosRUFBdUNqRCxJQUF2QztBQUNILE9BSnNDO0FBTXZDa0QsTUFBQUEsZUFBZSxFQUFFLHlCQUFDbEQsSUFBRCxFQUFVO0FBQ3ZCO0FBQ0EsWUFBSUEsSUFBSSxDQUFDK0IsUUFBTCxLQUFrQmhELFNBQXRCLEVBQWlDO0FBQzdCeEIsVUFBQUEsU0FBUyxDQUFDRyxZQUFWLENBQXVCcUUsUUFBdkIsQ0FBZ0M7QUFDNUJDLFlBQUFBLE9BQU8sRUFBRUMsUUFBUSxDQUFDakMsSUFBSSxDQUFDK0IsUUFBTixFQUFnQixFQUFoQjtBQURXLFdBQWhDO0FBR0g7O0FBQ0RpQixRQUFBQSxPQUFPLENBQUNDLEdBQVIsb0NBQXdDakQsSUFBSSxDQUFDK0IsUUFBN0M7QUFDSCxPQWRzQztBQWdCdkNvQixNQUFBQSxlQUFlLEVBQUUseUJBQUNuRCxJQUFELEVBQVU7QUFDdkI7QUFDQXpDLFFBQUFBLFNBQVMsQ0FBQ0ksaUJBQVYsQ0FBNEJrRSxJQUE1QixDQUFpQ3hDLGVBQWUsQ0FBQytELHFCQUFqRCxFQUZ1QixDQUd2Qjs7QUFDQWhELFFBQUFBLFNBQVMsQ0FBQ2lELE9BQVYsQ0FBa0I7QUFBQ0MsVUFBQUEsYUFBYSxFQUFFVjtBQUFoQixTQUFsQixFQUE2Q3JGLFNBQVMsQ0FBQ2dHLGtCQUF2RDtBQUNILE9BckJzQztBQXVCdkNDLE1BQUFBLE9BQU8sRUFBRSxpQkFBQ3hELElBQUQsRUFBVTtBQUNmekMsUUFBQUEsU0FBUyxDQUFDRSxhQUFWLENBQXdCMkIsV0FBeEIsQ0FBb0MsU0FBcEM7QUFDQTdCLFFBQUFBLFNBQVMsQ0FBQ0ksaUJBQVYsQ0FBNEJrRSxJQUE1QixDQUFpQ3hDLGVBQWUsQ0FBQzZDLGVBQWpEO0FBQ0FDLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QnBDLElBQUksQ0FBQ3lELEtBQUwsSUFBY3BFLGVBQWUsQ0FBQzZDLGVBQTFEO0FBQ0EzRSxRQUFBQSxTQUFTLENBQUNVLGlCQUFWLEdBQThCLEtBQTlCO0FBQ0g7QUE1QnNDLEtBQTNDO0FBOEJILEdBdlFhOztBQXlRZDtBQUNKO0FBQ0E7QUFDQTtBQUNJc0YsRUFBQUEsa0JBN1FjLDhCQTZRS2pELFFBN1FMLEVBNlFlO0FBQ3pCLFFBQUlBLFFBQVEsQ0FBQ0MsTUFBVCxLQUFvQnhCLFNBQXBCLElBQWlDdUIsUUFBUSxDQUFDQyxNQUFULEtBQWtCLEtBQXZELEVBQThEO0FBQzFENEIsTUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCOUIsUUFBUSxDQUFDb0QsUUFBckMsRUFBK0NyRSxlQUFlLENBQUNzRSxnQkFBL0Q7QUFDQXBHLE1BQUFBLFNBQVMsQ0FBQ0UsYUFBVixDQUF3QjJCLFdBQXhCLENBQW9DLFNBQXBDO0FBQ0g7QUFDSixHQWxSYTs7QUFvUmQ7QUFDSjtBQUNBO0FBQ0E7QUFDSXFDLEVBQUFBLDRCQXhSYyx3Q0F3UmVuQixRQXhSZixFQXdSeUI7QUFDbkM7QUFDQSxRQUFJQSxRQUFRLElBQUlBLFFBQVEsQ0FBQ0MsTUFBckIsSUFBK0JELFFBQVEsQ0FBQ04sSUFBeEMsSUFBZ0RNLFFBQVEsQ0FBQ04sSUFBVCxDQUFjaEIsUUFBbEUsRUFBNEU7QUFDeEU0RSxNQUFBQSx1QkFBdUIsQ0FBQ3ZGLFVBQXhCLENBQW1DaUMsUUFBUSxDQUFDTixJQUFULENBQWNoQixRQUFqRDtBQUNILEtBRkQsTUFFTztBQUNIbUQsTUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTZCOUIsUUFBUSxJQUFJQSxRQUFRLENBQUNvRCxRQUF0QixJQUFtQ3JFLGVBQWUsQ0FBQ3dFLHdCQUEvRTtBQUNBdEcsTUFBQUEsU0FBUyxDQUFDVSxpQkFBVixHQUE4QixLQUE5QjtBQUNBSyxNQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQmMsV0FBcEIsQ0FBZ0MsU0FBaEM7QUFDSDtBQUNKLEdBalNhOztBQW1TZDtBQUNKO0FBQ0E7QUFDSTRCLEVBQUFBLHdCQXRTYyxvQ0FzU1dILEdBdFNYLEVBc1NnQjtBQUMxQnZDLElBQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCc0QsSUFBM0I7QUFDQSxRQUFJa0MsWUFBWSxHQUFHQyxrQkFBa0IsQ0FBQ2xELEdBQUcsQ0FBQ21ELFdBQUwsQ0FBckM7QUFDQUYsSUFBQUEsWUFBWSxHQUFHQSxZQUFZLENBQUNuRCxPQUFiLENBQXFCLE9BQXJCLEVBQThCLElBQTlCLENBQWY7QUFDQW1ELElBQUFBLFlBQVksR0FBR0EsWUFBWSxDQUFDbkQsT0FBYixDQUFxQixRQUFyQixFQUErQixJQUEvQixDQUFmO0FBQ0FtRCxJQUFBQSxZQUFZLEdBQUdBLFlBQVksQ0FBQ25ELE9BQWIsQ0FBcUIsUUFBckIsRUFBK0IsR0FBL0IsQ0FBZjtBQUNBbUQsSUFBQUEsWUFBWSxHQUFHQSxZQUFZLENBQUNuRCxPQUFiLENBQXFCLE9BQXJCLEVBQThCLEdBQTlCLENBQWY7QUFDQSxRQUFNc0QsSUFBSSxHQUFHMUcsU0FBUyxDQUFDVyxTQUFWLENBQW9CZ0csUUFBcEIsQ0FBNkJKLFlBQTdCLENBQWI7QUFDQSxRQUFNSyxVQUFVLG1GQUVRdEQsR0FBRyxDQUFDQyxPQUZaLDhCQUdmbUQsSUFIZSwySkFNTnBELEdBQUcsQ0FBQ3VELElBTkUsZ0ZBT0UvRSxlQUFlLENBQUNnRix1QkFQbEIsdUNBUU54RCxHQUFHLENBQUNTLEdBUkUsNkJBUWtCVCxHQUFHLENBQUN5RCxJQVJ0Qiw0Q0FTRHpELEdBQUcsQ0FBQ0MsT0FUSCwwSUFhVEQsR0FBRyxDQUFDdUQsSUFiSyxrRkFjRC9FLGVBQWUsQ0FBQ2tGLGtCQWRmLHVDQWVOMUQsR0FBRyxDQUFDUyxHQWZFLDZCQWVrQlQsR0FBRyxDQUFDeUQsSUFmdEIsa0dBQWhCO0FBb0JBaEcsSUFBQUEsQ0FBQyxDQUFDLHNCQUFELENBQUQsQ0FBMEJrRyxNQUExQixDQUFpQ0wsVUFBakM7QUFDQTdGLElBQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZW1HLEtBQWY7QUFDSDtBQXBVYSxDQUFsQixDLENBdVVBOztBQUNBbkcsQ0FBQyxDQUFDb0csUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnBILEVBQUFBLFNBQVMsQ0FBQ2MsVUFBVjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxQQlhWZXJzaW9uLCBnbG9iYWxUcmFuc2xhdGUsXG5nbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBzaG93ZG93biwgVXNlck1lc3NhZ2UsIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLCBTeXN0ZW1BUEksIEZpbGVzQVBJLCBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBQQlggZmlybXdhcmUgdXBkYXRlcy5cbiAqXG4gKiBAbW9kdWxlIHVwZGF0ZVBCWFxuICovXG5jb25zdCB1cGRhdGVQQlggPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdWJtaXRCdXR0b246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgcHJvZ3Jlc3MgYmFyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHByb2dyZXNzQmFyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHByb2dyZXNzIGJhciBsYWJlbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwcm9ncmVzc0JhckxhYmVsOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQ3VycmVudCB2ZXJzaW9uIG9mIHRoZSBQQlggZmlybXdhcmUuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBjdXJyZW50VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbixcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtb2RhbCBmb3JtIGJlZm9yZSB1cGdyYWRlLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHVwZ3JhZGVNb2RhbEZvcm06IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJJIGhhdmUgYmFja3VwXCIgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkaUhhdmVCYWNrdXBJbnB1dDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBncmVlbiBidXR0b24gb24gbW9kYWwgZm9ybSBiZWZvcmUgdXBncmFkZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdGFydFVwZ3JhZGVCdXR0b246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGVyZSBpcyB1cGdyYWRlIHByb2Nlc3Mgd29ya2luZyBub3cgZmxhZy5cbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICB1cGdyYWRlSW5Qcm9ncmVzczogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBIZWxwcyB0byBjb252ZXJ0IG1hcmtkb3duIGludG8gaHRtbC5cbiAgICAgKiBAdHlwZSB7Q29udmVydGVyfVxuICAgICAqL1xuICAgIGNvbnZlcnRlcjogbmV3IHNob3dkb3duLkNvbnZlcnRlcigpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHVwZGF0ZSBQQlggZmlybXdhcmUgZnVuY3Rpb25hbGl0eS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB1cGRhdGVQQlguJGZvcm1PYmogPSAkKCcjdXBncmFkZS1mb3JtJyk7XG4gICAgICAgIHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uID0gJCgnI3N1Ym1pdGJ1dHRvbicpO1xuICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyID0gJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKTtcbiAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsID0gJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXItbGFiZWwnKTtcbiAgICAgICAgdXBkYXRlUEJYLiR1cGdyYWRlTW9kYWxGb3JtID0gJCgnI3VwZGF0ZS1tb2RhbC1mb3JtJyk7XG4gICAgICAgIHVwZGF0ZVBCWC4kaUhhdmVCYWNrdXBJbnB1dCA9ICQoXCJpbnB1dFtuYW1lPSdpLWhhdmUtYmFja3VwLWlucHV0J11cIik7XG4gICAgICAgIHVwZGF0ZVBCWC4kc3RhcnRVcGdyYWRlQnV0dG9uID0gJCgnI3N0YXJ0LXVwZ3JhZGUtYnV0dG9uJyk7XG5cbiAgICAgICAgLy8gT3BlbiB0aGUgdXBncmFkZSBtb2RhbCBmb3JtXG4gICAgICAgIHVwZGF0ZVBCWC4kdXBncmFkZU1vZGFsRm9ybS5tb2RhbCgpO1xuXG4gICAgICAgIC8vIEFkZCAnZGlzYWJsZWQnIGNsYXNzIHRvIHN1Ym1pdCBidXR0b25cbiAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBmaWxlIGlucHV0IGNsaWNrIHdoZW4gY2xpY2tpbmcgb24gdGV4dCBpbnB1dCBvciBidXR0b25cbiAgICAgICAgJCgnaW5wdXQ6dGV4dCwgLnVpLmJ1dHRvbicsICcudWkuYWN0aW9uLmlucHV0Jykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgICQoJ2lucHV0OmZpbGUnLCAkKGUudGFyZ2V0KS5wYXJlbnRzKCkpLmNsaWNrKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0ZXh0IGlucHV0IHZhbHVlIHdoZW4gc2VsZWN0aW5nIGEgZmlsZVxuICAgICAgICAkKCdpbnB1dDpmaWxlJywgJy51aS5hY3Rpb24uaW5wdXQnKS5vbignY2hhbmdlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLnRhcmdldC5maWxlc1swXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBlLnRhcmdldC5maWxlc1swXS5uYW1lO1xuICAgICAgICAgICAgICAgICQoJ2lucHV0OnRleHQnLCAkKGUudGFyZ2V0KS5wYXJlbnQoKSkudmFsKGZpbGVuYW1lKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJhY2sgdGhlIGlucHV0IGZpZWxkIGFuZCBtYWtlIHN1Ym1pdCBidXR0b24gYXZhaWxhYmxlIGlmIHBocmFzZSBpcyBlcXVhbCB0byAnSSBoYXZlIGJhY2t1cCdcbiAgICAgICAgdXBkYXRlUEJYLiRpSGF2ZUJhY2t1cElucHV0Lm9uKCdpbnB1dCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHVwZGF0ZVBCWC4kaUhhdmVCYWNrdXBJbnB1dC52YWwoKT09PWdsb2JhbFRyYW5zbGF0ZS51cGRfRW50ZXJJSGF2ZUJhY2t1cFBocmFzZSkge1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHN0YXJ0VXBncmFkZUJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHN0YXJ0VXBncmFkZUJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBzdWJtaXQgYnV0dG9uIGNsaWNrXG4gICAgICAgIHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIGZvcm0gYW5kIHNob3cgdGhlIHVwZ3JhZGUgbW9kYWwgZm9ybSBvbiBzdWNjZXNzXG4gICAgICAgICAgICB1cGRhdGVQQlguJGZvcm1PYmpcbiAgICAgICAgICAgICAgICAuZm9ybSh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnYmx1cicsXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkczogdXBkYXRlUEJYLnZhbGlkYXRlUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kdXBncmFkZU1vZGFsRm9ybVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EZW55OiAoKSA9PiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0YXJ0IHRoZSBmaWxlIHVwbG9hZCBwcm9jZXNzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSAkKCdpbnB1dDpmaWxlJylbMF0uZmlsZXNbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGaWxlc0FQSS51cGxvYWRGaWxlKGRhdGEsIHVwZGF0ZVBCWC5jYlJlc3VtYWJsZVVwbG9hZEZpbGUsIFsnaW1nJ10sICdmaXJtd2FyZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIGZvcm1cbiAgICAgICAgICAgIHVwZGF0ZVBCWC4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIFN5c3RlbUFQSSB0byBjaGVjayBmb3IgZmlybXdhcmUgdXBkYXRlc1xuICAgICAgICBTeXN0ZW1BUEkuY2hlY2tGb3JVcGRhdGVzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcmVxdWVzdCB3YXMgc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgLy8gTk9URTogdGhlIHYzIGVudmVsb3BlIChQQlhBcGlSZXN1bHQ6OmdldFJlc3VsdCkgZXhwb3NlcyB0aGUgc3VjY2Vzc1xuICAgICAgICAgICAgLy8gZmxhZyBhcyBgcmVzdWx0YCwgbm90IGBzdWNjZXNzYC4gVXNpbmcgYHN1Y2Nlc3NgIGhlcmUgc2lsZW50bHlcbiAgICAgICAgICAgIC8vIGVhcmx5LXJldHVybmVkIGFuZCBsZWZ0IHRoZSB1cGRhdGVzIHRhYmxlIGVtcHR5IChyZWdyZXNzaW9uIGZyb21cbiAgICAgICAgICAgIC8vIGQxNjAzMWUzZCkuIEtlZXAgdGhpcyBhbGlnbmVkIHdpdGggUGJ4QXBpQ2xpZW50LnN1Y2Nlc3NUZXN0KCkuXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQgfHwgIXJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHVwZGF0ZXMgYXJlIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLmhhc1VwZGF0ZXMgfHwgIXJlc3BvbnNlLmRhdGEuZmlybXdhcmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBmaXJtd2FyZSBvYmplY3RzIGFuZCBhZGQgdmVyc2lvbiBpbmZvcm1hdGlvblxuICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcmlzb24gPSB1cGRhdGVQQlguY3VycmVudFZlcnNpb24ucmVwbGFjZSgnLWRldicsICcnKTtcbiAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuZmlybXdhcmUuZm9yRWFjaCgob2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVyc2lvbiA9IG9iai52ZXJzaW9uLnJlcGxhY2UoJy1kZXYnLCAnJyk7XG4gICAgICAgICAgICAgICAgaWYgKHZlcnNpb25Db21wYXJlKHZlcnNpb24sIGN1cnJlbnRWZXJpc29uKSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLmFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbihvYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBIYW5kbGUgcmVkbyBidXR0b24gY2xpY2tcbiAgICAgICAgICAgICQoJ2EucmVkbycpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGlmICh1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpIHx8IHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcykgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kdXBncmFkZU1vZGFsRm9ybVxuICAgICAgICAgICAgICAgICAgICAubW9kYWwoe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgb25EZW55OiAoKSA9PiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUHJlcGFyZSBwYXJhbWV0ZXJzIGZvciBmaXJtd2FyZSBkb3dubG9hZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMudXJsID0gJGFMaW5rLmF0dHIoJ2hyZWYnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMubWQ1ID0gJGFMaW5rLmF0dHIoJ2RhdGEtbWQ1Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnZlcnNpb24gPSAkYUxpbmsuYXR0cignZGF0YS12ZXJzaW9uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRmlsZXNBUEkuZG93bmxvYWRGaXJtd2FyZShwYXJhbXMsIHVwZGF0ZVBCWC5jYkFmdGVyU3RhcnREb3dubG9hZEZpcm13YXJlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5tb2RhbCgnc2hvdycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgcmVzdW1hYmxlIGZpbGUgdXBsb2FkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIG9mIHRoZSB1cGxvYWQuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIEFkZGl0aW9uYWwgcGFyYW1ldGVycyBmb3IgdGhlIHVwbG9hZC5cbiAgICAgKi9cbiAgICBjYlJlc3VtYWJsZVVwbG9hZEZpbGUoYWN0aW9uLCBwYXJhbXMpIHtcbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2ZpbGVTdWNjZXNzJzpcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhwYXJhbXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndXBsb2FkU3RhcnQnOlxuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0Jhci5zaG93KCk7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRJblByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3Byb2dyZXNzJzpcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcbiAgICAgICAgICAgICAgICAgICAgcGVyY2VudDogcGFyc2VJbnQocGFyYW1zLnBlcmNlbnQsIDEwKSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgdGhlIGZpbGUgbWVyZ2luZyBwcm9jZXNzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSAvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1cyBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBjaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IFBieEFwaS50cnlQYXJzZUpTT04ocmVzcG9uc2UpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UocmVzcG9uc2UpO1xuICAgICAgICBpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1cGxvYWRJZCA9IGpzb24uZGF0YS51cGxvYWRfaWQ7XG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0ganNvbi5kYXRhLmZpbGVuYW1lO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBXZWJTb2NrZXQgZXZlbnRzIGluc3RlYWQgb2YgdXNpbmcgcG9sbGluZyB3b3JrZXJcbiAgICAgICAgRmlsZVVwbG9hZEV2ZW50SGFuZGxlci5zdWJzY3JpYmUodXBsb2FkSWQsIHtcbiAgICAgICAgICAgIG9uTWVyZ2VTdGFydGVkOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkSW5Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Zpcm13YXJlIG1lcmdlIHN0YXJ0ZWQ6JywgZGF0YSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlUHJvZ3Jlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGJhciBkdXJpbmcgbWVyZ2VcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5wcm9ncmVzcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVyY2VudDogcGFyc2VJbnQoZGF0YS5wcm9ncmVzcywgMTApLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEZpcm13YXJlIG1lcmdlIHByb2dyZXNzOiAke2RhdGEucHJvZ3Jlc3N9JWApO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZUNvbXBsZXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE1lcmdlIGNvbXBsZXRlIC0gc3RhcnQgdXBncmFkZSBwcm9jZXNzXG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGdyYWRlSW5Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgLy8gQmFja2VuZCBleHBlY3RzICd0ZW1wX2ZpbGVuYW1lJyBwYXJhbWV0ZXIsIG5vdCAnZmlsZW5hbWUnXG4gICAgICAgICAgICAgICAgU3lzdGVtQVBJLnVwZ3JhZGUoe3RlbXBfZmlsZW5hbWU6IGZpbGVQYXRofSwgdXBkYXRlUEJYLmNiQWZ0ZXJTdGFydFVwZGF0ZSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkVycm9yOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGRhdGEuZXJyb3IgfHwgZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBzdGFydCBQQlggdXBncmFkaW5nXG4gICAgICogQHBhcmFtIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclN0YXJ0VXBkYXRlKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5yZXN1bHQ9PT1mYWxzZSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUudXBkX1VwZ3JhZGVFcnJvcik7XG4gICAgICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFmdGVyIHN0YXJ0IG9ubGluZSB1cGdyYWRlIHdlIGhhdmUgdG8gd2FpdCBhbiBhbnN3ZXIsXG4gICAgICogYW5kIHRoZW4gc3RhcnQgc3RhdHVzIGNoZWNrIHdvcmtlclxuICAgICAqL1xuICAgIGNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gdjMgZW52ZWxvcGU6IHBheWxvYWQgbGl2ZXMgaW4gcmVzcG9uc2UuZGF0YSwgc3VjY2VzcyBmbGFnIGlzIGByZXN1bHRgXG4gICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmZpbGVuYW1lKSB7XG4gICAgICAgICAgICB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykgfHwgZ2xvYmFsVHJhbnNsYXRlLnVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvcik7XG4gICAgICAgICAgICB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgICQoJ2kubG9hZGluZy5yZWRvJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgbmV3IGJsb2NrIG9mIHVwZGF0ZSBpbmZvcm1hdGlvbiBvbiBwYWdlXG4gICAgICovXG4gICAgYWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaikge1xuICAgICAgICAkKCcjb25saW5lLXVwZGF0ZXMtYmxvY2snKS5zaG93KCk7XG4gICAgICAgIGxldCBtYXJrZG93blRleHQgPSBkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKTtcbiAgICAgICAgbWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoLzxicj4vZywgJ1xccicpO1xuICAgICAgICBtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvPGJyID4vZywgJ1xccicpO1xuICAgICAgICBtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvXFwqIFxcKi9nLCAnKicpO1xuICAgICAgICBtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvXFwqXFwqL2csICcqJyk7XG4gICAgICAgIGNvbnN0IGh0bWwgPSB1cGRhdGVQQlguY29udmVydGVyLm1ha2VIdG1sKG1hcmtkb3duVGV4dCk7XG4gICAgICAgIGNvbnN0IGR5bWFuaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJ1cGRhdGUtcm93XCI+XG5cdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdDx0ZD4ke2h0bWx9PC90ZD5cblx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHQ8ZGl2IGNsYXNzPVwidWkgc21hbGwgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+XG4gICAgXHRcdFx0PGEgaHJlZj1cIiR7b2JqLmhyZWZ9XCIgY2xhc3M9XCJ1aSBidXR0b24gcmVkbyBwb3B1cGVkXCIgXG4gICAgXHRcdFx0XHRkYXRhLWNvbnRlbnQgPSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBVcGdyYWRlT25saW5lfVwiXG5cdFx0XHRcdFx0ZGF0YS1tZDUgPVwiJHtvYmoubWQ1fVwiIGRhdGEtc2l6ZSA9XCIke29iai5zaXplfVwiXG5cdFx0XHRcdFx0ZGF0YS12ZXJzaW9uID0gXCIke29iai52ZXJzaW9ufVwiID5cblx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdFx0PC9hPlxuXHRcdFx0XHQ8YSBocmVmPVwiJHtvYmouaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZCBwb3B1cGVkXCIgXG5cdFx0XHRcdFx0ZGF0YS1jb250ZW50ID0gXCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRG93bmxvYWR9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke29iai5tZDV9XCIgZGF0YS1zaXplID1cIiR7b2JqLnNpemV9XCI+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+XG5cdFx0XHRcdDwvYT5cbiAgICBcdFx0PC9kaXY+ICAgXG5cdDwvdHI+YDtcbiAgICAgICAgJCgnI3VwZGF0ZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG4gICAgICAgICQoJ2EucG9wdXBlZCcpLnBvcHVwKCk7XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSB1cGRhdGUgcGJ4IGZpcm13YXJlIGZyb20gaW1hZ2UgcGFnZVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHVwZGF0ZVBCWC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19