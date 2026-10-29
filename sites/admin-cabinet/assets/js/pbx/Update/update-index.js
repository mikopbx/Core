"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

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
globalWebAdminLanguage, showdown, UserMessage, upgradeStatusLoopWorker, SystemAPI, FilesAPI, FileUploadEventHandler,
SecurityUtils */

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
    var html = updatePBX.sanitizeReleaseNotes(updatePBX.converter.makeHtml(markdownText));
    var safe = SecurityUtils.escapeTemplateParams({
      version: String(obj.version || ''),
      href: /^https?:\/\//i.test(String(obj.href || '')) ? String(obj.href) : '#',
      md5: String(obj.md5 || ''),
      size: String(obj.size || '')
    });
    var dymanicRow = "\n\t\t\t<tr class=\"update-row\">\n\t\t\t<td class=\"center aligned\">".concat(safe.version, "</td>\n\t\t\t<td>").concat(html, "</td>\n\t\t\t<td class=\"right aligned collapsing\">\n    \t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t<a href=\"").concat(safe.href, "\" class=\"ui button redo popuped\" \n    \t\t\t\tdata-content = \"").concat(globalTranslate.bt_ToolTipUpgradeOnline, "\"\n\t\t\t\t\tdata-md5 =\"").concat(safe.md5, "\" data-size =\"").concat(safe.size, "\"\n\t\t\t\t\tdata-version = \"").concat(safe.version, "\" >\n\t\t\t\t\t<i class=\"icon redo blue\"></i>\n\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t</a>\n\t\t\t\t<a href=\"").concat(safe.href, "\" class=\"ui button download popuped\" \n\t\t\t\t\tdata-content = \"").concat(globalTranslate.bt_ToolTipDownload, "\"\n\t\t\t\t\tdata-md5 =\"").concat(safe.md5, "\" data-size =\"").concat(safe.size, "\">\n\t\t\t\t\t<i class=\"icon download blue\"></i>\n\t\t\t\t</a>\n    \t\t</div>   \n\t</tr>");
    $('#updates-table tbody').append(dymanicRow);
    $('a.popuped').popup();
  },

  /**
   * Keeps only the markup that release notes use (#1336): showdown passes raw HTML and
   * javascript: links through, and the notes come from the releases feed, not from the admin.
   * @param {string} html - Output of the markdown converter
   * @returns {string} HTML with allowed tags, http(s)/mailto links and no other attributes
   */
  sanitizeReleaseNotes: function sanitizeReleaseNotes(html) {
    var allowedTags = ['A', 'P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'B', 'I', 'CODE', 'PRE', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD'];
    var template = document.createElement('template');
    template.innerHTML = html;
    Array.from(template.content.querySelectorAll('*')).forEach(function (node) {
      if (!allowedTags.includes(node.tagName)) {
        // Unknown wrappers are unwrapped (their children come later in the list and are
        // sanitized too); script-like elements go away with their content
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE'].includes(node.tagName)) {
          node.remove();
        } else {
          node.replaceWith.apply(node, _toConsumableArray(node.childNodes));
        }

        return;
      }

      var href = node.getAttribute('href') || '';
      Array.from(node.attributes).forEach(function (attr) {
        return node.removeAttribute(attr.name);
      });

      if (node.tagName === 'A' && /^(https?:|mailto:)/i.test(href.trim())) {
        node.setAttribute('href', href.trim());
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      } else if (node.tagName === 'TABLE') {
        node.className = 'ui very basic compact celled table';
      }
    });
    return template.innerHTML;
  }
}; // When the document is ready, initialize the update pbx firmware from image page

$(document).ready(function () {
  updatePBX.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbInVwZGF0ZVBCWCIsIiRmb3JtT2JqIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc0JhckxhYmVsIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHVwZ3JhZGVNb2RhbEZvcm0iLCIkaUhhdmVCYWNrdXBJbnB1dCIsIiRzdGFydFVwZ3JhZGVCdXR0b24iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwidGFibGVzIiwib3BlbkxpbmtzSW5OZXdXaW5kb3ciLCJpbml0aWFsaXplIiwiJCIsIm1vZGFsIiwiYWRkQ2xhc3MiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlcyIsInVuZGVmaW5lZCIsImZpbGVuYW1lIiwibmFtZSIsInBhcmVudCIsInZhbCIsInJlbW92ZUNsYXNzIiwiZ2xvYmFsVHJhbnNsYXRlIiwidXBkX0VudGVySUhhdmVCYWNrdXBQaHJhc2UiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZm9ybSIsImZpZWxkcyIsInZhbGlkYXRlUnVsZXMiLCJvblN1Y2Nlc3MiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImRhdGEiLCJGaWxlc0FQSSIsInVwbG9hZEZpbGUiLCJjYlJlc3VtYWJsZVVwbG9hZEZpbGUiLCJTeXN0ZW1BUEkiLCJjaGVja0ZvclVwZGF0ZXMiLCJyZXNwb25zZSIsInJlc3VsdCIsImhhc1VwZGF0ZXMiLCJmaXJtd2FyZSIsImN1cnJlbnRWZXJpc29uIiwicmVwbGFjZSIsImZvckVhY2giLCJvYmoiLCJ2ZXJzaW9uIiwidmVyc2lvbkNvbXBhcmUiLCJhZGROZXdWZXJzaW9uSW5mb3JtYXRpb24iLCJwYXJhbXMiLCIkYUxpbmsiLCJjbG9zZXN0IiwidXJsIiwiYXR0ciIsIm1kNSIsImZpbmQiLCJkb3dubG9hZEZpcm13YXJlIiwiY2JBZnRlclN0YXJ0RG93bmxvYWRGaXJtd2FyZSIsImFjdGlvbiIsImNoZWNrU3RhdHVzRmlsZU1lcmdpbmciLCJzaG93IiwidGV4dCIsInVwZF9VcGxvYWRJblByb2dyZXNzIiwicHJvZ3Jlc3MiLCJwZXJjZW50IiwicGFyc2VJbnQiLCJ1cGRfVXBsb2FkRXJyb3IiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIlBieEFwaSIsInRyeVBhcnNlSlNPTiIsImpzb24iLCJKU09OIiwicGFyc2UiLCJ1cGxvYWRJZCIsInVwbG9hZF9pZCIsImZpbGVQYXRoIiwiRmlsZVVwbG9hZEV2ZW50SGFuZGxlciIsInN1YnNjcmliZSIsIm9uTWVyZ2VTdGFydGVkIiwiY29uc29sZSIsImxvZyIsIm9uTWVyZ2VQcm9ncmVzcyIsIm9uTWVyZ2VDb21wbGV0ZSIsInVwZF9VcGdyYWRlSW5Qcm9ncmVzcyIsInVwZ3JhZGUiLCJ0ZW1wX2ZpbGVuYW1lIiwiY2JBZnRlclN0YXJ0VXBkYXRlIiwib25FcnJvciIsImVycm9yIiwibWVzc2FnZXMiLCJ1cGRfVXBncmFkZUVycm9yIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJ1cGRfRG93bmxvYWRVcGdyYWRlRXJyb3IiLCJtYXJrZG93blRleHQiLCJkZWNvZGVVUklDb21wb25lbnQiLCJkZXNjcmlwdGlvbiIsImh0bWwiLCJzYW5pdGl6ZVJlbGVhc2VOb3RlcyIsIm1ha2VIdG1sIiwic2FmZSIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVUZW1wbGF0ZVBhcmFtcyIsIlN0cmluZyIsImhyZWYiLCJ0ZXN0Iiwic2l6ZSIsImR5bWFuaWNSb3ciLCJidF9Ub29sVGlwVXBncmFkZU9ubGluZSIsImJ0X1Rvb2xUaXBEb3dubG9hZCIsImFwcGVuZCIsInBvcHVwIiwiYWxsb3dlZFRhZ3MiLCJ0ZW1wbGF0ZSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImlubmVySFRNTCIsIkFycmF5IiwiZnJvbSIsImNvbnRlbnQiLCJxdWVyeVNlbGVjdG9yQWxsIiwibm9kZSIsImluY2x1ZGVzIiwidGFnTmFtZSIsInJlbW92ZSIsInJlcGxhY2VXaXRoIiwiY2hpbGROb2RlcyIsImdldEF0dHJpYnV0ZSIsImF0dHJpYnV0ZXMiLCJyZW1vdmVBdHRyaWJ1dGUiLCJ0cmltIiwic2V0QXR0cmlidXRlIiwiY2xhc3NOYW1lIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFNBQVMsR0FBRztBQUNkO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLElBTkk7O0FBUWQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLElBWkQ7O0FBY2Q7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBbEJBOztBQW9CZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRSxJQXhCTDs7QUEwQmQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFQyxnQkE5QkY7O0FBZ0NkO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLElBcENMOztBQXNDZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRSxJQTFDTDs7QUE0Q2Q7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsbUJBQW1CLEVBQUUsSUFoRFA7O0FBa0RkO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLEtBdERMOztBQXdEZDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQUFJQyxRQUFRLENBQUNDLFNBQWIsQ0FBdUI7QUFDOUJDLElBQUFBLE1BQU0sRUFBRSxJ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VSxZQUFMLENBQWtCLE1BQWxCLEVBQTBCM0IsSUFBSSxDQUFDMEIsSUFBTCxFQUExQjtBQUNBVCxRQUFBQSxJQUFJLENBQUNVLFlBQUwsQ0FBa0IsUUFBbEIsRUFBNEIsUUFBNUI7QUFDQVYsUUFBQUEsSUFBSSxDQUFDVSxZQUFMLENBQWtCLEtBQWxCLEVBQXlCLHFCQUF6QjtBQUNILE9BSkQsTUFJTyxJQUFJVixJQUFJLENBQUNFLE9BQUwsS0FBaUIsT0FBckIsRUFBOEI7QUFDakNGLFFBQUFBLElBQUksQ0FBQ1csU0FBTCxHQUFpQixvQ0FBakI7QUFDSDtBQUNKLEtBcEJEO0FBcUJBLFdBQU9uQixRQUFRLENBQUNHLFNBQWhCO0FBQ0g7QUFqWGEsQ0FBbEIsQyxDQW9YQTs7QUFDQTlHLENBQUMsQ0FBQzRHLFFBQUQsQ0FBRCxDQUFZbUIsS0FBWixDQUFrQixZQUFNO0FBQ3BCaEosRUFBQUEsU0FBUyxDQUFDZ0IsVUFBVjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxQQlhWZXJzaW9uLCBnbG9iYWxUcmFuc2xhdGUsXG5nbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBzaG93ZG93biwgVXNlck1lc3NhZ2UsIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLCBTeXN0ZW1BUEksIEZpbGVzQVBJLCBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLFxuU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgUEJYIGZpcm13YXJlIHVwZGF0ZXMuXG4gKlxuICogQG1vZHVsZSB1cGRhdGVQQlhcbiAqL1xuY29uc3QgdXBkYXRlUEJYID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN1Ym1pdCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHByb2dyZXNzIGJhci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwcm9ncmVzc0JhcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBwcm9ncmVzcyBiYXIgbGFiZWwuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJvZ3Jlc3NCYXJMYWJlbDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdmVyc2lvbiBvZiB0aGUgUEJYIGZpcm13YXJlLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgY3VycmVudFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbW9kYWwgZm9ybSBiZWZvcmUgdXBncmFkZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1cGdyYWRlTW9kYWxGb3JtOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiSSBoYXZlIGJhY2t1cFwiIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGlIYXZlQmFja3VwSW5wdXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZ3JlZW4gYnV0dG9uIG9uIG1vZGFsIGZvcm0gYmVmb3JlIHVwZ3JhZGUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3RhcnRVcGdyYWRlQnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlcmUgaXMgdXBncmFkZSBwcm9jZXNzIHdvcmtpbmcgbm93IGZsYWcuXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgdXBncmFkZUluUHJvZ3Jlc3M6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSGVscHMgdG8gY29udmVydCBtYXJrZG93biBpbnRvIGh0bWwuXG4gICAgICogUmVsZWFzZSBub3RlcyBjYXJyeSBhIEdGTSB0YWJsZSBvZiBkb3dubG9hZCBsaW5rcyAoIzEyMTgpLCB3aGljaCBzaG93ZG93biBza2lwcyBieSBkZWZhdWx0LlxuICAgICAqIEB0eXBlIHtDb252ZXJ0ZXJ9XG4gICAgICovXG4gICAgY29udmVydGVyOiBuZXcgc2hvd2Rvd24uQ29udmVydGVyKHtcbiAgICAgICAgdGFibGVzOiB0cnVlLFxuICAgICAgICBvcGVuTGlua3NJbk5ld1dpbmRvdzogdHJ1ZSxcbiAgICB9KSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSB1cGRhdGUgUEJYIGZpcm13YXJlIGZ1bmN0aW9uYWxpdHkuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdXBkYXRlUEJYLiRmb3JtT2JqID0gJCgnI3VwZ3JhZGUtZm9ybScpO1xuICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbiA9ICQoJyNzdWJtaXRidXR0b24nKTtcbiAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0JhciA9ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyJyk7XG4gICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbCA9ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyLWxhYmVsJyk7XG4gICAgICAgIHVwZGF0ZVBCWC4kdXBncmFkZU1vZGFsRm9ybSA9ICQoJyN1cGRhdGUtbW9kYWwtZm9ybScpO1xuICAgICAgICB1cGRhdGVQQlguJGlIYXZlQmFja3VwSW5wdXQgPSAkKFwiaW5wdXRbbmFtZT0naS1oYXZlLWJhY2t1cC1pbnB1dCddXCIpO1xuICAgICAgICB1cGRhdGVQQlguJHN0YXJ0VXBncmFkZUJ1dHRvbiA9ICQoJyNzdGFydC11cGdyYWRlLWJ1dHRvbicpO1xuXG4gICAgICAgIC8vIE9wZW4gdGhlIHVwZ3JhZGUgbW9kYWwgZm9ybVxuICAgICAgICB1cGRhdGVQQlguJHVwZ3JhZGVNb2RhbEZvcm0ubW9kYWwoKTtcblxuICAgICAgICAvLyBBZGQgJ2Rpc2FibGVkJyBjbGFzcyB0byBzdWJtaXQgYnV0dG9uXG4gICAgICAgIHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgZmlsZSBpbnB1dCBjbGljayB3aGVuIGNsaWNraW5nIG9uIHRleHQgaW5wdXQgb3IgYnV0dG9uXG4gICAgICAgICQoJ2lucHV0OnRleHQsIC51aS5idXR0b24nLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAkKCdpbnB1dDpmaWxlJywgJChlLnRhcmdldCkucGFyZW50cygpKS5jbGljaygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGRhdGUgdGV4dCBpbnB1dCB2YWx1ZSB3aGVuIHNlbGVjdGluZyBhIGZpbGVcbiAgICAgICAgJCgnaW5wdXQ6ZmlsZScsICcudWkuYWN0aW9uLmlucHV0Jykub24oJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQuZmlsZXNbMF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lID0gZS50YXJnZXQuZmlsZXNbMF0ubmFtZTtcbiAgICAgICAgICAgICAgICAkKCdpbnB1dDp0ZXh0JywgJChlLnRhcmdldCkucGFyZW50KCkpLnZhbChmaWxlbmFtZSk7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyYWNrIHRoZSBpbnB1dCBmaWVsZCBhbmQgbWFrZSBzdWJtaXQgYnV0dG9uIGF2YWlsYWJsZSBpZiBwaHJhc2UgaXMgZXF1YWwgdG8gJ0kgaGF2ZSBiYWNrdXAnXG4gICAgICAgIHVwZGF0ZVBCWC4kaUhhdmVCYWNrdXBJbnB1dC5vbignaW5wdXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh1cGRhdGVQQlguJGlIYXZlQmFja3VwSW5wdXQudmFsKCk9PT1nbG9iYWxUcmFuc2xhdGUudXBkX0VudGVySUhhdmVCYWNrdXBQaHJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdGFydFVwZ3JhZGVCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdGFydFVwZ3JhZGVCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgc3VibWl0IGJ1dHRvbiBjbGlja1xuICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykgfHwgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzKSByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBmb3JtIGFuZCBzaG93IHRoZSB1cGdyYWRlIG1vZGFsIGZvcm0gb24gc3VjY2Vzc1xuICAgICAgICAgICAgdXBkYXRlUEJYLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IHVwZGF0ZVBCWC52YWxpZGF0ZVJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHVwZ3JhZGVNb2RhbEZvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubW9kYWwoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRGVueTogKCkgPT4gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTdGFydCB0aGUgZmlsZSB1cGxvYWQgcHJvY2Vzc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gJCgnaW5wdXQ6ZmlsZScpWzBdLmZpbGVzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRmlsZXNBUEkudXBsb2FkRmlsZShkYXRhLCB1cGRhdGVQQlguY2JSZXN1bWFibGVVcGxvYWRGaWxlLCBbJ2ltZyddLCAnZmlybXdhcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBmb3JtXG4gICAgICAgICAgICB1cGRhdGVQQlguJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVc2UgdW5pZmllZCBTeXN0ZW1BUEkgdG8gY2hlY2sgZm9yIGZpcm13YXJlIHVwZGF0ZXNcbiAgICAgICAgU3lzdGVtQVBJLmNoZWNrRm9yVXBkYXRlcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWxcbiAgICAgICAgICAgIC8vIE5PVEU6IHRoZSB2MyBlbnZlbG9wZSAoUEJYQXBpUmVzdWx0OjpnZXRSZXN1bHQpIGV4cG9zZXMgdGhlIHN1Y2Nlc3NcbiAgICAgICAgICAgIC8vIGZsYWcgYXMgYHJlc3VsdGAsIG5vdCBgc3VjY2Vzc2AuIFVzaW5nIGBzdWNjZXNzYCBoZXJlIHNpbGVudGx5XG4gICAgICAgICAgICAvLyBlYXJseS1yZXR1cm5lZCBhbmQgbGVmdCB0aGUgdXBkYXRlcyB0YWJsZSBlbXB0eSAocmVncmVzc2lvbiBmcm9tXG4gICAgICAgICAgICAvLyBkMTYwMzFlM2QpLiBLZWVwIHRoaXMgYWxpZ25lZCB3aXRoIFBieEFwaUNsaWVudC5zdWNjZXNzVGVzdCgpLlxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB1cGRhdGVzIGFyZSBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5oYXNVcGRhdGVzIHx8ICFyZXNwb25zZS5kYXRhLmZpcm13YXJlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZmlybXdhcmUgb2JqZWN0cyBhbmQgYWRkIHZlcnNpb24gaW5mb3JtYXRpb25cbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWZXJpc29uID0gdXBkYXRlUEJYLmN1cnJlbnRWZXJzaW9uLnJlcGxhY2UoJy1kZXYnLCAnJyk7XG4gICAgICAgICAgICByZXNwb25zZS5kYXRhLmZpcm13YXJlLmZvckVhY2goKG9iaikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBvYmoudmVyc2lvbi5yZXBsYWNlKCctZGV2JywgJycpO1xuICAgICAgICAgICAgICAgIGlmICh2ZXJzaW9uQ29tcGFyZSh2ZXJzaW9uLCBjdXJyZW50VmVyaXNvbikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC5hZGROZXdWZXJzaW9uSW5mb3JtYXRpb24ob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSGFuZGxlIHJlZG8gYnV0dG9uIGNsaWNrXG4gICAgICAgICAgICAkKCdhLnJlZG8nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHVwZ3JhZGVNb2RhbEZvcm1cbiAgICAgICAgICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uRGVueTogKCkgPT4gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByZXBhcmUgcGFyYW1ldGVycyBmb3IgZmlybXdhcmUgZG93bmxvYWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnVybCA9ICRhTGluay5hdHRyKCdocmVmJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm1kNSA9ICRhTGluay5hdHRyKCdkYXRhLW1kNScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy52ZXJzaW9uID0gJGFMaW5rLmF0dHIoJ2RhdGEtdmVyc2lvbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRhTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZpbGVzQVBJLmRvd25sb2FkRmlybXdhcmUocGFyYW1zLCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0RG93bmxvYWRGaXJtd2FyZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZm9yIHJlc3VtYWJsZSBmaWxlIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiBvZiB0aGUgdXBsb2FkLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgZm9yIHRoZSB1cGxvYWQuXG4gICAgICovXG4gICAgY2JSZXN1bWFibGVVcGxvYWRGaWxlKGFjdGlvbiwgcGFyYW1zKSB7XG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdmaWxlU3VjY2Vzcyc6XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLmNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VwbG9hZFN0YXJ0JzpcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIuc2hvdygpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkSW5Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdwcm9ncmVzcyc6XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG4gICAgICAgICAgICAgICAgICAgIHBlcmNlbnQ6IHBhcnNlSW50KHBhcmFtcy5wZXJjZW50LCAxMCksXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgc3RhdHVzIG9mIHRoZSBmaWxlIG1lcmdpbmcgcHJvY2Vzcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgL3BieGNvcmUvYXBpL3VwbG9hZC9zdGF0dXMgZnVuY3Rpb24uXG4gICAgICovXG4gICAgY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBQYnhBcGkudHJ5UGFyc2VKU09OKHJlc3BvbnNlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcbiAgICAgICAgaWYgKGpzb24gPT09IHVuZGVmaW5lZCB8fCBqc29uLmRhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdXBsb2FkSWQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gV2ViU29ja2V0IGV2ZW50cyBpbnN0ZWFkIG9mIHVzaW5nIHBvbGxpbmcgd29ya2VyXG4gICAgICAgIEZpbGVVcGxvYWRFdmVudEhhbmRsZXIuc3Vic2NyaWJlKHVwbG9hZElkLCB7XG4gICAgICAgICAgICBvbk1lcmdlU3RhcnRlZDogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEluUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGaXJtd2FyZSBtZXJnZSBzdGFydGVkOicsIGRhdGEpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZVByb2dyZXNzOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyBiYXIgZHVyaW5nIG1lcmdlXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucHJvZ3Jlc3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlcmNlbnQ6IHBhcnNlSW50KGRhdGEucHJvZ3Jlc3MsIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBGaXJtd2FyZSBtZXJnZSBwcm9ncmVzczogJHtkYXRhLnByb2dyZXNzfSVgKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uTWVyZ2VDb21wbGV0ZTogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBNZXJnZSBjb21wbGV0ZSAtIHN0YXJ0IHVwZ3JhZGUgcHJvY2Vzc1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBncmFkZUluUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIC8vIEJhY2tlbmQgZXhwZWN0cyAndGVtcF9maWxlbmFtZScgcGFyYW1ldGVyLCBub3QgJ2ZpbGVuYW1lJ1xuICAgICAgICAgICAgICAgIFN5c3RlbUFQSS51cGdyYWRlKHt0ZW1wX2ZpbGVuYW1lOiBmaWxlUGF0aH0sIHVwZGF0ZVBCWC5jYkFmdGVyU3RhcnRVcGRhdGUpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25FcnJvcjogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgc3RhcnQgUEJYIHVwZ3JhZGluZ1xuICAgICAqIEBwYXJhbSByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTdGFydFVwZGF0ZShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UucmVzdWx0PT09ZmFsc2UpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcywgZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGdyYWRlRXJyb3IpO1xuICAgICAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZnRlciBzdGFydCBvbmxpbmUgdXBncmFkZSB3ZSBoYXZlIHRvIHdhaXQgYW4gYW5zd2VyLFxuICAgICAqIGFuZCB0aGVuIHN0YXJ0IHN0YXR1cyBjaGVjayB3b3JrZXJcbiAgICAgKi9cbiAgICBjYkFmdGVyU3RhcnREb3dubG9hZEZpcm13YXJlKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIHYzIGVudmVsb3BlOiBwYXlsb2FkIGxpdmVzIGluIHJlc3BvbnNlLmRhdGEsIHN1Y2Nlc3MgZmxhZyBpcyBgcmVzdWx0YFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5maWxlbmFtZSkge1xuICAgICAgICAgICAgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZShyZXNwb25zZS5kYXRhLmZpbGVuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZygocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHx8IGdsb2JhbFRyYW5zbGF0ZS51cGRfRG93bmxvYWRVcGdyYWRlRXJyb3IpO1xuICAgICAgICAgICAgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gZmFsc2U7XG4gICAgICAgICAgICAkKCdpLmxvYWRpbmcucmVkbycpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIG5ldyBibG9jayBvZiB1cGRhdGUgaW5mb3JtYXRpb24gb24gcGFnZVxuICAgICAqL1xuICAgIGFkZE5ld1ZlcnNpb25JbmZvcm1hdGlvbihvYmopIHtcbiAgICAgICAgJCgnI29ubGluZS11cGRhdGVzLWJsb2NrJykuc2hvdygpO1xuICAgICAgICBsZXQgbWFya2Rvd25UZXh0ID0gZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXNjcmlwdGlvbik7XG4gICAgICAgIG1hcmtkb3duVGV4dCA9IG1hcmtkb3duVGV4dC5yZXBsYWNlKC88YnI+L2csICdcXHInKTtcbiAgICAgICAgbWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoLzxiciA+L2csICdcXHInKTtcbiAgICAgICAgbWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKiBcXCovZywgJyonKTtcbiAgICAgICAgbWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoL1xcKlxcKi9nLCAnKicpO1xuICAgICAgICBjb25zdCBodG1sID0gdXBkYXRlUEJYLnNhbml0aXplUmVsZWFzZU5vdGVzKHVwZGF0ZVBCWC5jb252ZXJ0ZXIubWFrZUh0bWwobWFya2Rvd25UZXh0KSk7XG4gICAgICAgIGNvbnN0IHNhZmUgPSBTZWN1cml0eVV0aWxzLmVzY2FwZVRlbXBsYXRlUGFyYW1zKHtcbiAgICAgICAgICAgIHZlcnNpb246IFN0cmluZyhvYmoudmVyc2lvbiB8fCAnJyksXG4gICAgICAgICAgICBocmVmOiAvXmh0dHBzPzpcXC9cXC8vaS50ZXN0KFN0cmluZyhvYmouaHJlZiB8fCAnJykpID8gU3RyaW5nKG9iai5ocmVmKSA6ICcjJyxcbiAgICAgICAgICAgIG1kNTogU3RyaW5nKG9iai5tZDUgfHwgJycpLFxuICAgICAgICAgICAgc2l6ZTogU3RyaW5nKG9iai5zaXplIHx8ICcnKSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IGR5bWFuaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJ1cGRhdGUtcm93XCI+XG5cdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7c2FmZS52ZXJzaW9ufTwvdGQ+XG5cdFx0XHQ8dGQ+JHtodG1sfTwvdGQ+XG5cdFx0XHQ8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICBcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdDxhIGhyZWY9XCIke3NhZmUuaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiByZWRvIHBvcHVwZWRcIiBcbiAgICBcdFx0XHRcdGRhdGEtY29udGVudCA9IFwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFVwZ3JhZGVPbmxpbmV9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke3NhZmUubWQ1fVwiIGRhdGEtc2l6ZSA9XCIke3NhZmUuc2l6ZX1cIlxuXHRcdFx0XHRcdGRhdGEtdmVyc2lvbiA9IFwiJHtzYWZlLnZlcnNpb259XCIgPlxuXHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0XHQ8L2E+XG5cdFx0XHRcdDxhIGhyZWY9XCIke3NhZmUuaHJlZn1cIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZCBwb3B1cGVkXCIgXG5cdFx0XHRcdFx0ZGF0YS1jb250ZW50ID0gXCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRG93bmxvYWR9XCJcblx0XHRcdFx0XHRkYXRhLW1kNSA9XCIke3NhZmUubWQ1fVwiIGRhdGEtc2l6ZSA9XCIke3NhZmUuc2l6ZX1cIj5cblx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT5cblx0XHRcdFx0PC9hPlxuICAgIFx0XHQ8L2Rpdj4gICBcblx0PC90cj5gO1xuICAgICAgICAkKCcjdXBkYXRlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW1hbmljUm93KTtcbiAgICAgICAgJCgnYS5wb3B1cGVkJykucG9wdXAoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogS2VlcHMgb25seSB0aGUgbWFya3VwIHRoYXQgcmVsZWFzZSBub3RlcyB1c2UgKCMxMzM2KTogc2hvd2Rvd24gcGFzc2VzIHJhdyBIVE1MIGFuZFxuICAgICAqIGphdmFzY3JpcHQ6IGxpbmtzIHRocm91Z2gsIGFuZCB0aGUgbm90ZXMgY29tZSBmcm9tIHRoZSByZWxlYXNlcyBmZWVkLCBub3QgZnJvbSB0aGUgYWRtaW4uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWwgLSBPdXRwdXQgb2YgdGhlIG1hcmtkb3duIGNvbnZlcnRlclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgd2l0aCBhbGxvd2VkIHRhZ3MsIGh0dHAocykvbWFpbHRvIGxpbmtzIGFuZCBubyBvdGhlciBhdHRyaWJ1dGVzXG4gICAgICovXG4gICAgc2FuaXRpemVSZWxlYXNlTm90ZXMoaHRtbCkge1xuICAgICAgICBjb25zdCBhbGxvd2VkVGFncyA9IFsnQScsICdQJywgJ0JSJywgJ1VMJywgJ09MJywgJ0xJJywgJ1NUUk9ORycsICdFTScsICdCJywgJ0knLCAnQ09ERScsICdQUkUnLFxuICAgICAgICAgICAgJ0JMT0NLUVVPVEUnLCAnSDEnLCAnSDInLCAnSDMnLCAnSDQnLCAnSDUnLCAnSDYnLCAnSFInLCAnVEFCTEUnLCAnVEhFQUQnLCAnVEJPRFknLCAnVFInLCAnVEgnLCAnVEQnXTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICBBcnJheS5mcm9tKHRlbXBsYXRlLmNvbnRlbnQucXVlcnlTZWxlY3RvckFsbCgnKicpKS5mb3JFYWNoKChub2RlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIWFsbG93ZWRUYWdzLmluY2x1ZGVzKG5vZGUudGFnTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAvLyBVbmtub3duIHdyYXBwZXJzIGFyZSB1bndyYXBwZWQgKHRoZWlyIGNoaWxkcmVuIGNvbWUgbGF0ZXIgaW4gdGhlIGxpc3QgYW5kIGFyZVxuICAgICAgICAgICAgICAgIC8vIHNhbml0aXplZCB0b28pOyBzY3JpcHQtbGlrZSBlbGVtZW50cyBnbyBhd2F5IHdpdGggdGhlaXIgY29udGVudFxuICAgICAgICAgICAgICAgIGlmIChbJ1NDUklQVCcsICdTVFlMRScsICdJRlJBTUUnLCAnT0JKRUNUJywgJ0VNQkVEJywgJ1RFTVBMQVRFJ10uaW5jbHVkZXMobm9kZS50YWdOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUucmVwbGFjZVdpdGgoLi4ubm9kZS5jaGlsZE5vZGVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaHJlZiA9IG5vZGUuZ2V0QXR0cmlidXRlKCdocmVmJykgfHwgJyc7XG4gICAgICAgICAgICBBcnJheS5mcm9tKG5vZGUuYXR0cmlidXRlcykuZm9yRWFjaCgoYXR0cikgPT4gbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKSk7XG4gICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lID09PSAnQScgJiYgL14oaHR0cHM/OnxtYWlsdG86KS9pLnRlc3QoaHJlZi50cmltKCkpKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBocmVmLnRyaW0oKSk7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ3RhcmdldCcsICdfYmxhbmsnKTtcbiAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZSgncmVsJywgJ25vb3BlbmVyIG5vcmVmZXJyZXInKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZS50YWdOYW1lID09PSAnVEFCTEUnKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5jbGFzc05hbWUgPSAndWkgdmVyeSBiYXNpYyBjb21wYWN0IGNlbGxlZCB0YWJsZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGVtcGxhdGUuaW5uZXJIVE1MO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgdXBkYXRlIHBieCBmaXJtd2FyZSBmcm9tIGltYWdlIHBhZ2VcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICB1cGRhdGVQQlguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==