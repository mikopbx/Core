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
        {
          updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadError);
          updatePBX.$submitButton.removeClass('loading'); // Resumable.js passes the rejected chunk's response body; show the
          // server's reason instead of a generic text (#1416)

          var response = PbxApi.tryParseJSON(params.message);
          var reason = response && response.messages && Object.keys(response.messages).length > 0 ? response.messages : globalTranslate.upd_UploadError;
          UserMessage.showMultiString(reason, globalTranslate.upd_UploadError);
          break;
        }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWluZGV4LmpzIl0sIm5hbWVzIjpbInVwZGF0ZVBCWCIsIiRmb3JtT2JqIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc0JhckxhYmVsIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwiJHVwZ3JhZGVNb2RhbEZvcm0iLCIkaUhhdmVCYWNrdXBJbnB1dCIsIiRzdGFydFVwZ3JhZGVCdXR0b24iLCJ1cGdyYWRlSW5Qcm9ncmVzcyIsImNvbnZlcnRlciIsInNob3dkb3duIiwiQ29udmVydGVyIiwidGFibGVzIiwib3BlbkxpbmtzSW5OZXdXaW5kb3ciLCJpbml0aWFsaXplIiwiJCIsIm1vZGFsIiwiYWRkQ2xhc3MiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlcyIsInVuZGVmaW5lZCIsImZpbGVuYW1lIiwibmFtZSIsInBhcmVudCIsInZhbCIsInJlbW92ZUNsYXNzIiwiZ2xvYmFsVHJhbnNsYXRlIiwidXBkX0VudGVySUhhdmVCYWNrdXBQaHJhc2UiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZm9ybSIsImZpZWxkcyIsInZhbGlkYXRlUnVsZXMiLCJvblN1Y2Nlc3MiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImRhdGEiLCJGaWxlc0FQSSIsInVwbG9hZEZpbGUiLCJjYlJlc3VtYWJsZVVwbG9hZEZpbGUiLCJTeXN0ZW1BUEkiLCJjaGVja0ZvclVwZGF0ZXMiLCJyZXNwb25zZSIsInJlc3VsdCIsImhhc1VwZGF0ZXMiLCJmaXJtd2FyZSIsImN1cnJlbnRWZXJpc29uIiwicmVwbGFjZSIsImZvckVhY2giLCJvYmoiLCJ2ZXJzaW9uIiwidmVyc2lvbkNvbXBhcmUiLCJhZGROZXdWZXJzaW9uSW5mb3JtYXRpb24iLCJwYXJhbXMiLCIkYUxpbmsiLCJjbG9zZXN0IiwidXJsIiwiYXR0ciIsIm1kNSIsImZpbmQiLCJkb3dubG9hZEZpcm13YXJlIiwiY2JBZnRlclN0YXJ0RG93bmxvYWRGaXJtd2FyZSIsImFjdGlvbiIsImNoZWNrU3RhdHVzRmlsZU1lcmdpbmciLCJzaG93IiwidGV4dCIsInVwZF9VcGxvYWRJblByb2dyZXNzIiwicHJvZ3Jlc3MiLCJwZXJjZW50IiwicGFyc2VJbnQiLCJ1cGRfVXBsb2FkRXJyb3IiLCJQYnhBcGkiLCJ0cnlQYXJzZUpTT04iLCJtZXNzYWdlIiwicmVhc29uIiwibWVzc2FnZXMiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJqc29uIiwiSlNPTiIsInBhcnNlIiwidXBsb2FkSWQiLCJ1cGxvYWRfaWQiLCJmaWxlUGF0aCIsIkZpbGVVcGxvYWRFdmVudEhhbmRsZXIiLCJzdWJzY3JpYmUiLCJvbk1lcmdlU3RhcnRlZCIsImNvbnNvbGUiLCJsb2ciLCJvbk1lcmdlUHJvZ3Jlc3MiLCJvbk1lcmdlQ29tcGxldGUiLCJ1cGRfVXBncmFkZUluUHJvZ3Jlc3MiLCJ1cGdyYWRlIiwidGVtcF9maWxlbmFtZSIsImNiQWZ0ZXJTdGFydFVwZGF0ZSIsIm9uRXJyb3IiLCJlcnJvciIsInVwZF9VcGdyYWRlRXJyb3IiLCJ1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciIsInVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvciIsIm1hcmtkb3duVGV4dCIsImRlY29kZVVSSUNvbXBvbmVudCIsImRlc2NyaXB0aW9uIiwiaHRtbCIsInNhbml0aXplUmVsZWFzZU5vdGVzIiwibWFrZUh0bWwiLCJzYWZlIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZVRlbXBsYXRlUGFyYW1zIiwiU3RyaW5nIiwiaHJlZiIsInRlc3QiLCJzaXplIiwiZHltYW5pY1JvdyIsImJ0X1Rvb2xUaXBVcGdyYWRlT25saW5lIiwiYnRfVG9vbFRpcERvd25sb2FkIiwiYXBwZW5kIiwicG9wdXAiLCJhbGxvd2VkVGFncyIsInRlbXBsYXRlIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiaW5uZXJIVE1MIiwiQXJyYXkiLCJmcm9tIiwiY29udGVudCIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJub2RlIiwiaW5jbHVkZXMiLCJ0YWdOYW1lIiwicmVtb3ZlIiwicmVwbGFjZVdpdGgiLCJjaGlsZE5vZGVzIiwiZ2V0QXR0cmlidXRlIiwiYXR0cmlidXRlcyIsInJlbW92ZUF0dHJpYnV0ZSIsInRyaW0iLCJzZXRBdHRyaWJ1dGUiLCJjbGFzc05hbWUiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsU0FBUyxHQUFHO0FBQ2Q7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFOSTs7QUFRZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsSUFaRDs7QUFjZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsSUFsQkE7O0FBb0JkO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLElBeEJMOztBQTBCZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUVDLGdCQTlCRjs7QUFnQ2Q7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUUsSUFwQ0w7O0FBc0NkO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLElBMUNMOztBQTRDZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxtQkFBbUIsRUFBRSxJQWhEUDs7QUFrRGQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUUsS0F0REw7O0FBd0RkO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBQUlDLFFB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SSxHQUFHaUIsSUFBSSxDQUFDTSxZQUFMLENBQWtCLE1BQWxCLEtBQTZCLEVBQTFDO0FBQ0FWLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXRyxJQUFJLENBQUNPLFVBQWhCLEVBQTRCekYsT0FBNUIsQ0FBb0MsVUFBQ1MsSUFBRDtBQUFBLGVBQVV5RSxJQUFJLENBQUNRLGVBQUwsQ0FBcUJqRixJQUFJLENBQUNwQyxJQUExQixDQUFWO0FBQUEsT0FBcEM7O0FBQ0EsVUFBSTZHLElBQUksQ0FBQ0UsT0FBTCxLQUFpQixHQUFqQixJQUF3QixzQkFBc0JsQixJQUF0QixDQUEyQkQsSUFBSSxDQUFDMEIsSUFBTCxFQUEzQixDQUE1QixFQUFxRTtBQUNqRVQsUUFBQUEsSUFBSSxDQUFDVSxZQUFMLENBQWtCLE1BQWxCLEVBQTBCM0IsSUFBSSxDQUFDMEIsSUFBTCxFQUExQjtBQUNBVCxRQUFBQSxJQUFJLENBQUNVLFlBQUwsQ0FBa0IsUUFBbEIsRUFBNEIsUUFBNUI7QUFDQVYsUUFBQUEsSUFBSSxDQUFDVSxZQUFMLENBQWtCLEtBQWxCLEVBQXlCLHFCQUF6QjtBQUNILE9BSkQsTUFJTyxJQUFJVixJQUFJLENBQUNFLE9BQUwsS0FBaUIsT0FBckIsRUFBOEI7QUFDakNGLFFBQUFBLElBQUksQ0FBQ1csU0FBTCxHQUFpQixvQ0FBakI7QUFDSDtBQUNKLEtBcEJEO0FBcUJBLFdBQU9uQixRQUFRLENBQUNHLFNBQWhCO0FBQ0g7QUF6WGEsQ0FBbEIsQyxDQTRYQTs7QUFDQW5ILENBQUMsQ0FBQ2lILFFBQUQsQ0FBRCxDQUFZbUIsS0FBWixDQUFrQixZQUFNO0FBQ3BCckosRUFBQUEsU0FBUyxDQUFDZ0IsVUFBVjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxQQlhWZXJzaW9uLCBnbG9iYWxUcmFuc2xhdGUsXG5nbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBzaG93ZG93biwgVXNlck1lc3NhZ2UsIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLCBTeXN0ZW1BUEksIEZpbGVzQVBJLCBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLFxuU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgUEJYIGZpcm13YXJlIHVwZGF0ZXMuXG4gKlxuICogQG1vZHVsZSB1cGRhdGVQQlhcbiAqL1xuY29uc3QgdXBkYXRlUEJYID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN1Ym1pdCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHByb2dyZXNzIGJhci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwcm9ncmVzc0JhcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBwcm9ncmVzcyBiYXIgbGFiZWwuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJvZ3Jlc3NCYXJMYWJlbDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdmVyc2lvbiBvZiB0aGUgUEJYIGZpcm13YXJlLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgY3VycmVudFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbW9kYWwgZm9ybSBiZWZvcmUgdXBncmFkZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1cGdyYWRlTW9kYWxGb3JtOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiSSBoYXZlIGJhY2t1cFwiIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGlIYXZlQmFja3VwSW5wdXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZ3JlZW4gYnV0dG9uIG9uIG1vZGFsIGZvcm0gYmVmb3JlIHVwZ3JhZGUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3RhcnRVcGdyYWRlQnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlcmUgaXMgdXBncmFkZSBwcm9jZXNzIHdvcmtpbmcgbm93IGZsYWcuXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgdXBncmFkZUluUHJvZ3Jlc3M6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSGVscHMgdG8gY29udmVydCBtYXJrZG93biBpbnRvIGh0bWwuXG4gICAgICogUmVsZWFzZSBub3RlcyBjYXJyeSBhIEdGTSB0YWJsZSBvZiBkb3dubG9hZCBsaW5rcyAoIzEyMTgpLCB3aGljaCBzaG93ZG93biBza2lwcyBieSBkZWZhdWx0LlxuICAgICAqIEB0eXBlIHtDb252ZXJ0ZXJ9XG4gICAgICovXG4gICAgY29udmVydGVyOiBuZXcgc2hvd2Rvd24uQ29udmVydGVyKHtcbiAgICAgICAgdGFibGVzOiB0cnVlLFxuICAgICAgICBvcGVuTGlua3NJbk5ld1dpbmRvdzogdHJ1ZSxcbiAgICB9KSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSB1cGRhdGUgUEJYIGZpcm13YXJlIGZ1bmN0aW9uYWxpdHkuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdXBkYXRlUEJYLiRmb3JtT2JqID0gJCgnI3VwZ3JhZGUtZm9ybScpO1xuICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbiA9ICQoJyNzdWJtaXRidXR0b24nKTtcbiAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0JhciA9ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyJyk7XG4gICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbCA9ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyLWxhYmVsJyk7XG4gICAgICAgIHVwZGF0ZVBCWC4kdXBncmFkZU1vZGFsRm9ybSA9ICQoJyN1cGRhdGUtbW9kYWwtZm9ybScpO1xuICAgICAgICB1cGRhdGVQQlguJGlIYXZlQmFja3VwSW5wdXQgPSAkKFwiaW5wdXRbbmFtZT0naS1oYXZlLWJhY2t1cC1pbnB1dCddXCIpO1xuICAgICAgICB1cGRhdGVQQlguJHN0YXJ0VXBncmFkZUJ1dHRvbiA9ICQoJyNzdGFydC11cGdyYWRlLWJ1dHRvbicpO1xuXG4gICAgICAgIC8vIE9wZW4gdGhlIHVwZ3JhZGUgbW9kYWwgZm9ybVxuICAgICAgICB1cGRhdGVQQlguJHVwZ3JhZGVNb2RhbEZvcm0ubW9kYWwoKTtcblxuICAgICAgICAvLyBBZGQgJ2Rpc2FibGVkJyBjbGFzcyB0byBzdWJtaXQgYnV0dG9uXG4gICAgICAgIHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgZmlsZSBpbnB1dCBjbGljayB3aGVuIGNsaWNraW5nIG9uIHRleHQgaW5wdXQgb3IgYnV0dG9uXG4gICAgICAgICQoJ2lucHV0OnRleHQsIC51aS5idXR0b24nLCAnLnVpLmFjdGlvbi5pbnB1dCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAkKCdpbnB1dDpmaWxlJywgJChlLnRhcmdldCkucGFyZW50cygpKS5jbGljaygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGRhdGUgdGV4dCBpbnB1dCB2YWx1ZSB3aGVuIHNlbGVjdGluZyBhIGZpbGVcbiAgICAgICAgJCgnaW5wdXQ6ZmlsZScsICcudWkuYWN0aW9uLmlucHV0Jykub24oJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQuZmlsZXNbMF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lID0gZS50YXJnZXQuZmlsZXNbMF0ubmFtZTtcbiAgICAgICAgICAgICAgICAkKCdpbnB1dDp0ZXh0JywgJChlLnRhcmdldCkucGFyZW50KCkpLnZhbChmaWxlbmFtZSk7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyYWNrIHRoZSBpbnB1dCBmaWVsZCBhbmQgbWFrZSBzdWJtaXQgYnV0dG9uIGF2YWlsYWJsZSBpZiBwaHJhc2UgaXMgZXF1YWwgdG8gJ0kgaGF2ZSBiYWNrdXAnXG4gICAgICAgIHVwZGF0ZVBCWC4kaUhhdmVCYWNrdXBJbnB1dC5vbignaW5wdXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh1cGRhdGVQQlguJGlIYXZlQmFja3VwSW5wdXQudmFsKCk9PT1nbG9iYWxUcmFuc2xhdGUudXBkX0VudGVySUhhdmVCYWNrdXBQaHJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdGFydFVwZ3JhZGVCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdGFydFVwZ3JhZGVCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgc3VibWl0IGJ1dHRvbiBjbGlja1xuICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykgfHwgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzKSByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBmb3JtIGFuZCBzaG93IHRoZSB1cGdyYWRlIG1vZGFsIGZvcm0gb24gc3VjY2Vzc1xuICAgICAgICAgICAgdXBkYXRlUEJYLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IHVwZGF0ZVBCWC52YWxpZGF0ZVJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHVwZ3JhZGVNb2RhbEZvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubW9kYWwoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRGVueTogKCkgPT4gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTdGFydCB0aGUgZmlsZSB1cGxvYWQgcHJvY2Vzc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC51cGdyYWRlSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gJCgnaW5wdXQ6ZmlsZScpWzBdLmZpbGVzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRmlsZXNBUEkudXBsb2FkRmlsZShkYXRhLCB1cGRhdGVQQlguY2JSZXN1bWFibGVVcGxvYWRGaWxlLCBbJ2ltZyddLCAnZmlybXdhcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBmb3JtXG4gICAgICAgICAgICB1cGRhdGVQQlguJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVc2UgdW5pZmllZCBTeXN0ZW1BUEkgdG8gY2hlY2sgZm9yIGZpcm13YXJlIHVwZGF0ZXNcbiAgICAgICAgU3lzdGVtQVBJLmNoZWNrRm9yVXBkYXRlcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWxcbiAgICAgICAgICAgIC8vIE5PVEU6IHRoZSB2MyBlbnZlbG9wZSAoUEJYQXBpUmVzdWx0OjpnZXRSZXN1bHQpIGV4cG9zZXMgdGhlIHN1Y2Nlc3NcbiAgICAgICAgICAgIC8vIGZsYWcgYXMgYHJlc3VsdGAsIG5vdCBgc3VjY2Vzc2AuIFVzaW5nIGBzdWNjZXNzYCBoZXJlIHNpbGVudGx5XG4gICAgICAgICAgICAvLyBlYXJseS1yZXR1cm5lZCBhbmQgbGVmdCB0aGUgdXBkYXRlcyB0YWJsZSBlbXB0eSAocmVncmVzc2lvbiBmcm9tXG4gICAgICAgICAgICAvLyBkMTYwMzFlM2QpLiBLZWVwIHRoaXMgYWxpZ25lZCB3aXRoIFBieEFwaUNsaWVudC5zdWNjZXNzVGVzdCgpLlxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB1cGRhdGVzIGFyZSBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5oYXNVcGRhdGVzIHx8ICFyZXNwb25zZS5kYXRhLmZpcm13YXJlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZmlybXdhcmUgb2JqZWN0cyBhbmQgYWRkIHZlcnNpb24gaW5mb3JtYXRpb25cbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWZXJpc29uID0gdXBkYXRlUEJYLmN1cnJlbnRWZXJzaW9uLnJlcGxhY2UoJy1kZXYnLCAnJyk7XG4gICAgICAgICAgICByZXNwb25zZS5kYXRhLmZpcm13YXJlLmZvckVhY2goKG9iaikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBvYmoudmVyc2lvbi5yZXBsYWNlKCctZGV2JywgJycpO1xuICAgICAgICAgICAgICAgIGlmICh2ZXJzaW9uQ29tcGFyZSh2ZXJzaW9uLCBjdXJyZW50VmVyaXNvbikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC5hZGROZXdWZXJzaW9uSW5mb3JtYXRpb24ob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSGFuZGxlIHJlZG8gYnV0dG9uIGNsaWNrXG4gICAgICAgICAgICAkKCdhLnJlZG8nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBpZiAodXBkYXRlUEJYLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSB8fCB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MpIHJldHVybjtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHVwZ3JhZGVNb2RhbEZvcm1cbiAgICAgICAgICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uRGVueTogKCkgPT4gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByZXBhcmUgcGFyYW1ldGVycyBmb3IgZmlybXdhcmUgZG93bmxvYWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnVybCA9ICRhTGluay5hdHRyKCdocmVmJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm1kNSA9ICRhTGluay5hdHRyKCdkYXRhLW1kNScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy52ZXJzaW9uID0gJGFMaW5rLmF0dHIoJ2RhdGEtdmVyc2lvbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRhTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZpbGVzQVBJLmRvd25sb2FkRmlybXdhcmUocGFyYW1zLCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0RG93bmxvYWRGaXJtd2FyZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZm9yIHJlc3VtYWJsZSBmaWxlIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiBvZiB0aGUgdXBsb2FkLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgZm9yIHRoZSB1cGxvYWQuXG4gICAgICovXG4gICAgY2JSZXN1bWFibGVVcGxvYWRGaWxlKGFjdGlvbiwgcGFyYW1zKSB7XG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdmaWxlU3VjY2Vzcyc6XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLmNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VwbG9hZFN0YXJ0JzpcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIuc2hvdygpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkSW5Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdwcm9ncmVzcyc6XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG4gICAgICAgICAgICAgICAgICAgIHBlcmNlbnQ6IHBhcnNlSW50KHBhcmFtcy5wZXJjZW50LCAxMCksXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6IHtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIC8vIFJlc3VtYWJsZS5qcyBwYXNzZXMgdGhlIHJlamVjdGVkIGNodW5rJ3MgcmVzcG9uc2UgYm9keTsgc2hvdyB0aGVcbiAgICAgICAgICAgICAgICAvLyBzZXJ2ZXIncyByZWFzb24gaW5zdGVhZCBvZiBhIGdlbmVyaWMgdGV4dCAoIzE0MTYpXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBQYnhBcGkudHJ5UGFyc2VKU09OKHBhcmFtcy5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWFzb24gPSByZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlc1xuICAgICAgICAgICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhyZXNwb25zZS5tZXNzYWdlcykubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgICAgICA/IHJlc3BvbnNlLm1lc3NhZ2VzXG4gICAgICAgICAgICAgICAgICAgIDogZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcjtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVhc29uLCBnbG9iYWxUcmFuc2xhdGUudXBkX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgdGhlIGZpbGUgbWVyZ2luZyBwcm9jZXNzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSAvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1cyBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBjaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IFBieEFwaS50cnlQYXJzZUpTT04ocmVzcG9uc2UpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UocmVzcG9uc2UpO1xuICAgICAgICBpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1cGxvYWRJZCA9IGpzb24uZGF0YS51cGxvYWRfaWQ7XG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0ganNvbi5kYXRhLmZpbGVuYW1lO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBXZWJTb2NrZXQgZXZlbnRzIGluc3RlYWQgb2YgdXNpbmcgcG9sbGluZyB3b3JrZXJcbiAgICAgICAgRmlsZVVwbG9hZEV2ZW50SGFuZGxlci5zdWJzY3JpYmUodXBsb2FkSWQsIHtcbiAgICAgICAgICAgIG9uTWVyZ2VTdGFydGVkOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS51cGRfVXBsb2FkSW5Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Zpcm13YXJlIG1lcmdlIHN0YXJ0ZWQ6JywgZGF0YSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlUHJvZ3Jlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGJhciBkdXJpbmcgbWVyZ2VcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5wcm9ncmVzcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVyY2VudDogcGFyc2VJbnQoZGF0YS5wcm9ncmVzcywgMTApLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEZpcm13YXJlIG1lcmdlIHByb2dyZXNzOiAke2RhdGEucHJvZ3Jlc3N9JWApO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZUNvbXBsZXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE1lcmdlIGNvbXBsZXRlIC0gc3RhcnQgdXBncmFkZSBwcm9jZXNzXG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGdyYWRlSW5Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgLy8gQmFja2VuZCBleHBlY3RzICd0ZW1wX2ZpbGVuYW1lJyBwYXJhbWV0ZXIsIG5vdCAnZmlsZW5hbWUnXG4gICAgICAgICAgICAgICAgU3lzdGVtQVBJLnVwZ3JhZGUoe3RlbXBfZmlsZW5hbWU6IGZpbGVQYXRofSwgdXBkYXRlUEJYLmNiQWZ0ZXJTdGFydFVwZGF0ZSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkVycm9yOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBCWC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGRhdGEuZXJyb3IgfHwgZ2xvYmFsVHJhbnNsYXRlLnVwZF9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgdXBkYXRlUEJYLnVwZ3JhZGVJblByb2dyZXNzID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBzdGFydCBQQlggdXBncmFkaW5nXG4gICAgICogQHBhcmFtIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclN0YXJ0VXBkYXRlKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5yZXN1bHQ9PT1mYWxzZSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUudXBkX1VwZ3JhZGVFcnJvcik7XG4gICAgICAgICAgICB1cGRhdGVQQlguJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFmdGVyIHN0YXJ0IG9ubGluZSB1cGdyYWRlIHdlIGhhdmUgdG8gd2FpdCBhbiBhbnN3ZXIsXG4gICAgICogYW5kIHRoZW4gc3RhcnQgc3RhdHVzIGNoZWNrIHdvcmtlclxuICAgICAqL1xuICAgIGNiQWZ0ZXJTdGFydERvd25sb2FkRmlybXdhcmUocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gdjMgZW52ZWxvcGU6IHBheWxvYWQgbGl2ZXMgaW4gcmVzcG9uc2UuZGF0YSwgc3VjY2VzcyBmbGFnIGlzIGByZXN1bHRgXG4gICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmZpbGVuYW1lKSB7XG4gICAgICAgICAgICB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykgfHwgZ2xvYmFsVHJhbnNsYXRlLnVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvcik7XG4gICAgICAgICAgICB1cGRhdGVQQlgudXBncmFkZUluUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgICQoJ2kubG9hZGluZy5yZWRvJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgbmV3IGJsb2NrIG9mIHVwZGF0ZSBpbmZvcm1hdGlvbiBvbiBwYWdlXG4gICAgICovXG4gICAgYWRkTmV3VmVyc2lvbkluZm9ybWF0aW9uKG9iaikge1xuICAgICAgICAkKCcjb25saW5lLXVwZGF0ZXMtYmxvY2snKS5zaG93KCk7XG4gICAgICAgIGxldCBtYXJrZG93blRleHQgPSBkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKTtcbiAgICAgICAgbWFya2Rvd25UZXh0ID0gbWFya2Rvd25UZXh0LnJlcGxhY2UoLzxicj4vZywgJ1xccicpO1xuICAgICAgICBtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvPGJyID4vZywgJ1xccicpO1xuICAgICAgICBtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvXFwqIFxcKi9nLCAnKicpO1xuICAgICAgICBtYXJrZG93blRleHQgPSBtYXJrZG93blRleHQucmVwbGFjZSgvXFwqXFwqL2csICcqJyk7XG4gICAgICAgIGNvbnN0IGh0bWwgPSB1cGRhdGVQQlguc2FuaXRpemVSZWxlYXNlTm90ZXModXBkYXRlUEJYLmNvbnZlcnRlci5tYWtlSHRtbChtYXJrZG93blRleHQpKTtcbiAgICAgICAgY29uc3Qgc2FmZSA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlVGVtcGxhdGVQYXJhbXMoe1xuICAgICAgICAgICAgdmVyc2lvbjogU3RyaW5nKG9iai52ZXJzaW9uIHx8ICcnKSxcbiAgICAgICAgICAgIGhyZWY6IC9eaHR0cHM/OlxcL1xcLy9pLnRlc3QoU3RyaW5nKG9iai5ocmVmIHx8ICcnKSkgPyBTdHJpbmcob2JqLmhyZWYpIDogJyMnLFxuICAgICAgICAgICAgbWQ1OiBTdHJpbmcob2JqLm1kNSB8fCAnJyksXG4gICAgICAgICAgICBzaXplOiBTdHJpbmcob2JqLnNpemUgfHwgJycpLFxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cInVwZGF0ZS1yb3dcIj5cblx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtzYWZlLnZlcnNpb259PC90ZD5cblx0XHRcdDx0ZD4ke2h0bWx9PC90ZD5cblx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHQ8ZGl2IGNsYXNzPVwidWkgc21hbGwgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+XG4gICAgXHRcdFx0PGEgaHJlZj1cIiR7c2FmZS5ocmVmfVwiIGNsYXNzPVwidWkgYnV0dG9uIHJlZG8gcG9wdXBlZFwiIFxuICAgIFx0XHRcdFx0ZGF0YS1jb250ZW50ID0gXCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwVXBncmFkZU9ubGluZX1cIlxuXHRcdFx0XHRcdGRhdGEtbWQ1ID1cIiR7c2FmZS5tZDV9XCIgZGF0YS1zaXplID1cIiR7c2FmZS5zaXplfVwiXG5cdFx0XHRcdFx0ZGF0YS12ZXJzaW9uID0gXCIke3NhZmUudmVyc2lvbn1cIiA+XG5cdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdDwvYT5cblx0XHRcdFx0PGEgaHJlZj1cIiR7c2FmZS5ocmVmfVwiIGNsYXNzPVwidWkgYnV0dG9uIGRvd25sb2FkIHBvcHVwZWRcIiBcblx0XHRcdFx0XHRkYXRhLWNvbnRlbnQgPSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEb3dubG9hZH1cIlxuXHRcdFx0XHRcdGRhdGEtbWQ1ID1cIiR7c2FmZS5tZDV9XCIgZGF0YS1zaXplID1cIiR7c2FmZS5zaXplfVwiPlxuXHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPlxuXHRcdFx0XHQ8L2E+XG4gICAgXHRcdDwvZGl2PiAgIFxuXHQ8L3RyPmA7XG4gICAgICAgICQoJyN1cGRhdGVzLXRhYmxlIHRib2R5JykuYXBwZW5kKGR5bWFuaWNSb3cpO1xuICAgICAgICAkKCdhLnBvcHVwZWQnKS5wb3B1cCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBLZWVwcyBvbmx5IHRoZSBtYXJrdXAgdGhhdCByZWxlYXNlIG5vdGVzIHVzZSAoIzEzMzYpOiBzaG93ZG93biBwYXNzZXMgcmF3IEhUTUwgYW5kXG4gICAgICogamF2YXNjcmlwdDogbGlua3MgdGhyb3VnaCwgYW5kIHRoZSBub3RlcyBjb21lIGZyb20gdGhlIHJlbGVhc2VzIGZlZWQsIG5vdCBmcm9tIHRoZSBhZG1pbi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbCAtIE91dHB1dCBvZiB0aGUgbWFya2Rvd24gY29udmVydGVyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCB3aXRoIGFsbG93ZWQgdGFncywgaHR0cChzKS9tYWlsdG8gbGlua3MgYW5kIG5vIG90aGVyIGF0dHJpYnV0ZXNcbiAgICAgKi9cbiAgICBzYW5pdGl6ZVJlbGVhc2VOb3RlcyhodG1sKSB7XG4gICAgICAgIGNvbnN0IGFsbG93ZWRUYWdzID0gWydBJywgJ1AnLCAnQlInLCAnVUwnLCAnT0wnLCAnTEknLCAnU1RST05HJywgJ0VNJywgJ0InLCAnSScsICdDT0RFJywgJ1BSRScsXG4gICAgICAgICAgICAnQkxPQ0tRVU9URScsICdIMScsICdIMicsICdIMycsICdINCcsICdINScsICdINicsICdIUicsICdUQUJMRScsICdUSEVBRCcsICdUQk9EWScsICdUUicsICdUSCcsICdURCddO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIEFycmF5LmZyb20odGVtcGxhdGUuY29udGVudC5xdWVyeVNlbGVjdG9yQWxsKCcqJykpLmZvckVhY2goKG5vZGUpID0+IHtcbiAgICAgICAgICAgIGlmICghYWxsb3dlZFRhZ3MuaW5jbHVkZXMobm9kZS50YWdOYW1lKSkge1xuICAgICAgICAgICAgICAgIC8vIFVua25vd24gd3JhcHBlcnMgYXJlIHVud3JhcHBlZCAodGhlaXIgY2hpbGRyZW4gY29tZSBsYXRlciBpbiB0aGUgbGlzdCBhbmQgYXJlXG4gICAgICAgICAgICAgICAgLy8gc2FuaXRpemVkIHRvbyk7IHNjcmlwdC1saWtlIGVsZW1lbnRzIGdvIGF3YXkgd2l0aCB0aGVpciBjb250ZW50XG4gICAgICAgICAgICAgICAgaWYgKFsnU0NSSVBUJywgJ1NUWUxFJywgJ0lGUkFNRScsICdPQkpFQ1QnLCAnRU1CRUQnLCAnVEVNUExBVEUnXS5pbmNsdWRlcyhub2RlLnRhZ05hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5yZXBsYWNlV2l0aCguLi5ub2RlLmNoaWxkTm9kZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBocmVmID0gbm9kZS5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSB8fCAnJztcbiAgICAgICAgICAgIEFycmF5LmZyb20obm9kZS5hdHRyaWJ1dGVzKS5mb3JFYWNoKChhdHRyKSA9PiBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyLm5hbWUpKTtcbiAgICAgICAgICAgIGlmIChub2RlLnRhZ05hbWUgPT09ICdBJyAmJiAvXihodHRwcz86fG1haWx0bzopL2kudGVzdChocmVmLnRyaW0oKSkpIHtcbiAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZSgnaHJlZicsIGhyZWYudHJpbSgpKTtcbiAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZSgndGFyZ2V0JywgJ19ibGFuaycpO1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdyZWwnLCAnbm9vcGVuZXIgbm9yZWZlcnJlcicpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlLnRhZ05hbWUgPT09ICdUQUJMRScpIHtcbiAgICAgICAgICAgICAgICBub2RlLmNsYXNzTmFtZSA9ICd1aSB2ZXJ5IGJhc2ljIGNvbXBhY3QgY2VsbGVkIHRhYmxlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZS5pbm5lckhUTUw7XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSB1cGRhdGUgcGJ4IGZpcm13YXJlIGZyb20gaW1hZ2UgcGFnZVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHVwZGF0ZVBCWC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19