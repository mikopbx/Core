"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, UserMessage, PbxApi, EmployeesAPI, EventBus, SemanticLocalization */

/**
 * The extensionsBulkUpload module handles CSV import/export functionality for employees
 * @module extensionsBulkUpload
 */
var extensionsBulkUpload = {
  /**
   * jQuery elements
   */
  $uploadButton: $('#upload-button'),
  $uploadSegment: $('#upload-segment'),
  $previewSection: $('#preview-section'),
  $progressSection: $('#progress-section'),
  $resultsSection: $('#results-section'),
  $previewTable: $('#preview-table'),
  $importProgress: $('#import-progress'),
  $progressLabel: $('#progress-label'),
  $logMessages: $('#log-messages'),
  $resultMessage: $('#result-message'),
  $totalCount: $('#total-count'),
  $validCount: $('#valid-count'),
  $duplicateCount: $('#duplicate-count'),
  $errorCount: $('#error-count'),
  $confirmImport: $('#confirm-import'),
  $cancelImport: $('#cancel-import'),
  $newImport: $('#new-import'),
  $exportButton: $('#export-button'),
  $downloadTemplate: $('#download-template'),
  $importStrategy: $('#import-strategy'),
  $exportFormat: $('#export-format'),
  $templateFormat: $('#template-format'),
  $numberFrom: $('#number-from'),
  $numberTo: $('#number-to'),

  /**
   * Current upload data
   */
  uploadId: null,
  uploadedFilePath: null,
  resumable: null,
  previewDataTable: null,

  /**
   * Initialize the module
   */
  initialize: function initialize() {
    // Initialize tabs
    $('#bulk-tabs .item').tab(); // Initialize dropdowns with change handlers

    extensionsBulkUpload.$importStrategy.dropdown();
    extensionsBulkUpload.$exportFormat.dropdown({
      onChange: function onChange(value) {
        extensionsBulkUpload.updateFormatDescription('export', value);
      }
    });
    extensionsBulkUpload.$templateFormat.dropdown({
      onChange: function onChange(value) {
        extensionsBulkUpload.updateFormatDescription('template', value);
      }
    }); // Show initial format descriptions

    extensionsBulkUpload.updateFormatDescription('export', 'standard');
    extensionsBulkUpload.updateFormatDescription('template', 'standard'); // Set up file upload

    extensionsBulkUpload.initializeFileUpload(); // Set up event handlers

    extensionsBulkUpload.$confirmImport.on('click', extensionsBulkUpload.confirmImport);
    extensionsBulkUpload.$cancelImport.on('click', extensionsBulkUpload.cancelImport);
    extensionsBulkUpload.$newImport.on('click', extensionsBulkUpload.startNewImport);
    extensionsBulkUpload.$exportButton.on('click', extensionsBulkUpload.exportEmployees);
    extensionsBulkUpload.$downloadTemplate.on('click', extensionsBulkUpload.downloadTemplate); // Subscribe to EventBus for import progress

    EventBus.subscribe('import_progress', extensionsBulkUpload.onImportProgress);
    EventBus.subscribe('import_complete', extensionsBulkUpload.onImportComplete); // Check URL hash to activate correct tab

    if (window.location.hash) {
      var hash = window.location.hash.substring(1);
      $("#bulk-tabs .item[data-tab=\"".concat(hash, "\"]")).click();
    }
  },

  /**
   * Initialize file upload with Resumable.js
   */
  initializeFileUpload: function initializeFileUpload() {
    // Check if elements exist before initializing
    if (!extensionsBulkUpload.$uploadButton.length || !extensionsBulkUpload.$uploadSegment.length) {
      console.warn('Upload elements not found, skipping Resumable initialization');
      return;
    }

    extensionsBulkUpload.resumable = new Resumable({
      target: PbxApi.filesUploadFile,
      testChunks: false,
      chunkSize: 3 * 1024 * 1024,
      maxFiles: 1,
      simultaneousUploads: 1,
      fileType: ['csv']
    });
    extensionsBulkUpload.resumable.assignBrowse(extensionsBulkUpload.$uploadButton[0]);
    extensionsBulkUpload.resumable.assignDrop(extensionsBulkUpload.$uploadSegment[0]); // File added event

    extensionsBulkUpload.resumable.on('fileAdded', function (file) {
      extensionsBulkUpload.$uploadSegment.addClass('loading');
      extensionsBulkUpload.resumable.upload();
    }); // Upload progress

    extensionsBulkUpload.resumable.on('fileProgress', function (file) {
      var percent = Math.floor(file.progress() * 100);
      console.log("Upload progress: ".concat(percent, "%"));
    }); // Upload success

    extensionsBulkUpload.resumable.on('fileSuccess', function (file, response) {
      extensionsBulkUpload.$uploadSegment.removeClass('loading');
      var result = JSON.parse(response);

      if (result.result === true && result.data && result.data.upload_id) {
        extensionsBulkUpload.uploadedFilePath = result.data.upload_id;
        extensionsBulkUpload.previewImport();
      } else {
        UserMessage.showMultiString(globalTranslate.ex_FileUploadError);
      }
    }); // Upload error

    extensionsBulkUpload.resumable.on('fileError', function (file, message) {
      extensionsBulkUpload.$uploadSegment.removeClass('loading');
      UserMessage.showMultiString(message || globalTranslate.ex_FileUploadError);
    });
  },

  /**
   * Preview import - validate CSV and show preview
   */
  previewImport: function previewImport() {
    var strategy = extensionsBulkUpload.$importStrategy.dropdown('get value');
    extensionsBulkUpload.$uploadSegment.addClass('loading');
    EmployeesAPI.importCSV(extensionsBulkUpload.uploadedFilePath, 'preview', strategy, function (response) {
      extensionsBulkUpload.$uploadSegment.removeClass('loading');

      if (response.result === true && response.data) {
        extensionsBulkUpload.uploadId = response.data.uploadId;
        extensionsBulkUpload.showPreview(response.data);
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Show preview of CSV data
   */
  showPreview: function showPreview(data) {
    // Update statistics
    extensionsBulkUpload.$totalCount.text(data.total || 0);
    extensionsBulkUpload.$validCount.text(data.valid || 0);
    extensionsBulkUpload.$duplicateCount.text(data.duplicates || 0);
    extensionsBulkUpload.$errorCount.text(data.errors || 0); // Destroy existing DataTable if exists

    if (extensionsBulkUpload.previewDataTable) {
      extensionsBulkUpload.previewDataTable.destroy();
    } // Clear and populate preview table


    var $tbody = extensionsBulkUpload.$previewTable.find('tbody');
    $tbody.empty();

    if (data.preview && data.preview.length > 0) {
      data.preview.forEach(function (row) {
        var statusClass = row.status === 'valid' ? 'positive' : row.status === 'duplicate' ? 'warning' : 'negative';
        var statusIcon = row.status === 'valid' ? 'check circle' : row.status === 'duplicate' ? 'exclamation triangle' : 'times circle';
        $tbody.append("\n                    <tr class=\"".concat(statusClass, "\">\n                        <td><i class=\"").concat(statusIcon, " icon\"></i> ").concat(row.status, "</td>\n                        <td>").concat(row.number || '', "</td>\n                        <td>").concat(row.user_username || '', "</td>\n                        <td>").concat(row.user_email || '', "</td>\n                        <td>").concat(row.mobile_number || '', "</td>\n                        <td>").concat(row.validation_message || '', "</td>\n                    </tr>\n                "));
      });
    } // Initialize DataTable


    extensionsBulkUpload.previewDataTable = extensionsBulkUpload.$previewTable.DataTable({
      lengthChange: false,
      paging: true,
      pageLength: 10,
      searching: false,
      ordering: true,
      language: SemanticLocalization.dataTableLocalisation
    }); // Show preview section, hide upload section

    extensionsBulkUpload.$uploadSegment.hide();
    extensionsBulkUpload.$previewSection.show();
  },

  /**
   * Confirm and start import
   */
  confirmImport: function confirmImport() {
    if (!extensionsBulkUpload.uploadId) {
      return;
    }

    var strategy = extensionsBulkUpload.$importStrategy.dropdown('get value');
    extensionsBulkUpload.$confirmImport.addClass('loading');
    EmployeesAPI.confirmImport(extensionsBulkUpload.uploadId, strategy, function (response) {
      extensionsBulkUpload.$confirmImport.removeClass('loading');

      if (response.result === true && response.data) {
        // Hide preview, show progress
        extensionsBulkUpload.$previewSection.hide();
        extensionsBulkUpload.$progressSection.show(); // Initialize progress bar

        extensionsBulkUpload.$importProgress.progress({
          percent: 0
        }); // Clear log messages

        extensionsBulkUpload.$logMessages.empty(); // Import has started, wait for EventBus updates

        extensionsBulkUpload.addLogMessage('info', globalTranslate.ex_ImportStarted);
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Cancel import and reset
   */
  cancelImport: function cancelImport() {
    extensionsBulkUpload.$previewSection.hide();
    extensionsBulkUpload.$uploadSegment.show();
    extensionsBulkUpload.uploadId = null;
    extensionsBulkUpload.uploadedFilePath = null;
  },

  /**
   * Start new import
   */
  startNewImport: function startNewImport() {
    extensionsBulkUpload.$resultsSection.hide();
    extensionsBulkUpload.$progressSection.hide();
    extensionsBulkUpload.$previewSection.hide();
    extensionsBulkUpload.$uploadSegment.show();
    extensionsBulkUpload.uploadId = null;
    extensionsBulkUpload.uploadedFilePath = null;
  },

  /**
   * Handle import progress from EventBus
   */
  onImportProgress: function onImportProgress(data) {
    if (data.percent !== undefined) {
      extensionsBulkUpload.$importProgress.progress({
        percent: data.percent
      });
    }

    if (data.message) {
      extensionsBulkUpload.$progressLabel.text(data.message);
    }

    if (data.log) {
      extensionsBulkUpload.addLogMessage(data.type || 'info', data.log);
    }
  },

  /**
   * Handle import completion
   */
  onImportComplete: function onImportComplete(data) {
    // Hide progress, show results
    extensionsBulkUpload.$progressSection.hide();
    extensionsBulkUpload.$resultsSection.show(); // Show result message

    var messageClass = data.success ? 'positive' : 'negative';
    var messageIcon = data.success ? 'check circle' : 'times circle';
    var messageText = '';

    if (data.stats) {
      messageText = globalTranslate.ex_ImportSuccess.replace('{created}', data.stats.created || 0).replace('{skipped}', data.stats.skipped || 0).replace('{failed}', data.stats.failed || 0);
    } else if (data.error) {
      messageText = globalTranslate.ex_ImportFailed.replace('{error}', data.error);
    }

    extensionsBulkUpload.$resultMessage.html("\n            <div class=\"".concat(messageClass, " message\">\n                <i class=\"").concat(messageIcon, " icon\"></i>\n                <div class=\"content\">\n                    <div class=\"header\">").concat(data.success ? globalTranslate.ex_ImportComplete : globalTranslate.ex_ImportFailed, "</div>\n                    <p>").concat(messageText, "</p>\n                </div>\n            </div>\n        "));
  },

  /**
   * Add log message
   */
  addLogMessage: function addLogMessage(type, message) {
    var iconClass = type === 'error' ? 'times circle red' : type === 'warning' ? 'exclamation triangle yellow' : 'info circle blue';
    var $message = $("\n            <div class=\"item\">\n                <i class=\"".concat(iconClass, " icon\"></i>\n                <div class=\"content\">\n                    <div class=\"description\">").concat(message, "</div>\n                </div>\n            </div>\n        "));
    extensionsBulkUpload.$logMessages.append($message); // Scroll to bottom

    var logContainer = extensionsBulkUpload.$logMessages.parent()[0];

    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  },

  /**
   * Export employees to CSV
   */
  exportEmployees: function exportEmployees() {
    var format = extensionsBulkUpload.$exportFormat.dropdown('get value');
    var filter = {};
    var numberFrom = extensionsBulkUpload.$numberFrom.val();
    var numberTo = extensionsBulkUpload.$numberTo.val();

    if (numberFrom) {
      filter.number_from = numberFrom;
    }

    if (numberTo) {
      filter.number_to = numberTo;
    }

    extensionsBulkUpload.$exportButton.addClass('loading');
    EmployeesAPI.exportCSV(format, filter, function (response) {
      extensionsBulkUpload.$exportButton.removeClass('loading');

      if (response.result === true && response.data) {
        // Trigger download using the link from the server
        if (response.data.filename) {
          // response.data.filename already contains the full path from root
          window.location.href = response.data.filename;
        }
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Download CSV template
   */
  downloadTemplate: function downloadTemplate() {
    var format = extensionsBulkUpload.$templateFormat.dropdown('get value');
    extensionsBulkUpload.$downloadTemplate.addClass('loading');
    EmployeesAPI.getTemplate(format, function (response) {
      extensionsBulkUpload.$downloadTemplate.removeClass('loading');

      if (response.result === true && response.data) {
        // Trigger download using the link from the server
        if (response.data.filename) {
          // response.data.filename already contains the full path from root
          window.location.href = response.data.filename;
        }
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Get field descriptions for format
   */
  getFormatFields: function getFormatFields(format) {
    var formats = {
      minimal: ['number - ' + globalTranslate.ex_FieldNumber_Help, 'user_username - ' + globalTranslate.ex_FieldUsername_Help, 'user_email - ' + globalTranslate.ex_FieldEmail_Help, 'mobile_number - ' + globalTranslate.ex_FieldMobile_Help, 'sip_secret - ' + globalTranslate.ex_FieldPassword_Help, 'fwd_ringlength - ' + globalTranslate.ex_FieldRingLength_Help, 'fwd_forwarding - ' + globalTranslate.ex_FieldForwarding_Help],
      standard: ['number - ' + globalTranslate.ex_FieldNumber_Help, 'user_username - ' + globalTranslate.ex_FieldUsername_Help, 'user_email - ' + globalTranslate.ex_FieldEmail_Help, 'mobile_number - ' + globalTranslate.ex_FieldMobile_Help, 'mobile_dialstring - ' + globalTranslate.ex_FieldMobileDialstring_Help, 'sip_secret - ' + globalTranslate.ex_FieldPassword_Help, 'sip_dtmfmode - ' + globalTranslate.ex_FieldDTMFMode_Help, 'sip_transport - ' + globalTranslate.ex_FieldTransport_Help, 'sip_enableRecording - ' + globalTranslate.ex_FieldRecording_Help, 'fwd_ringlength - ' + globalTranslate.ex_FieldRingLength_Help, 'fwd_forwarding - ' + globalTranslate.ex_FieldForwarding_Help, 'fwd_forwardingonbusy - ' + globalTranslate.ex_FieldForwardingBusy_Help, 'fwd_forwardingonunavailable - ' + globalTranslate.ex_FieldForwardingUnavailable_Help],
      full: ['number - ' + globalTranslate.ex_FieldNumber_Help, 'user_username - ' + globalTranslate.ex_FieldUsername_Help, 'user_email - ' + globalTranslate.ex_FieldEmail_Help, 'user_avatar - ' + globalTranslate.ex_FieldAvatar_Help, 'mobile_number - ' + globalTranslate.ex_FieldMobile_Help, 'mobile_dialstring - ' + globalTranslate.ex_FieldMobileDialstring_Help, 'sip_secret - ' + globalTranslate.ex_FieldPassword_Help, 'sip_dtmfmode - ' + globalTranslate.ex_FieldDTMFMode_Help, 'sip_transport - ' + globalTranslate.ex_FieldTransport_Help, 'sip_enableRecording - ' + globalTranslate.ex_FieldRecording_Help, 'sip_manualattributes - ' + globalTranslate.ex_FieldManualAttributes_Help, 'fwd_ringlength - ' + globalTranslate.ex_FieldRingLength_Help, 'fwd_forwarding - ' + globalTranslate.ex_FieldForwarding_Help, 'fwd_forwardingonbusy - ' + globalTranslate.ex_FieldForwardingBusy_Help, 'fwd_forwardingonunavailable - ' + globalTranslate.ex_FieldForwardingUnavailable_Help]
    };
    return formats[format] || formats.standard;
  },

  /**
   * Update format description
   */
  updateFormatDescription: function updateFormatDescription(type, format) {
    var fields = extensionsBulkUpload.getFormatFields(format);
    var $container = type === 'export' ? $('#export-format-fields-description') : $('#format-fields-description');

    if ($container.length) {
      var html = '<ul class="list">' + fields.map(function (field) {
        return "<li><code>".concat(field, "</code></li>");
      }).join('') + '</ul>';
      $container.html(html);
    }
  }
}; // Initialize when document is ready

$(document).ready(function () {
  extensionsBulkUpload.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtYnVsay11cGxvYWQuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0J1bGtVcGxvYWQiLCIkdXBsb2FkQnV0dG9uIiwiJCIsIiR1cGxvYWRTZWdtZW50IiwiJHByZXZpZXdTZWN0aW9uIiwiJHByb2dyZXNzU2VjdGlvbiIsIiRyZXN1bHRzU2VjdGlvbiIsIiRwcmV2aWV3VGFibGUiLCIkaW1wb3J0UHJvZ3Jlc3MiLCIkcHJvZ3Jlc3NMYWJlbCIsIiRsb2dNZXNzYWdlcyIsIiRyZXN1bHRNZXNzYWdlIiwiJHRvdGFsQ291bnQiLCIkdmFsaWRDb3VudCIsIiRkdXBsaWNhdGVDb3VudCIsIiRlcnJvckNvdW50IiwiJGNvbmZpcm1JbXBvcnQiLCIkY2FuY2VsSW1wb3J0IiwiJG5ld0ltcG9ydCIsIiRleHBvcnRCdXR0b24iLCIkZG93bmxvYWRUZW1wbGF0ZSIsIiRpbXBvcnRTdHJhdGVneSIsIiRleHBvcnRGb3JtYXQiLCIkdGVtcGxhdGVGb3JtYXQiLCIkbnVtYmVyRnJvbSIsIiRudW1iZXJUbyIsInVwbG9hZElkIiwidXBsb2FkZWRGaWxlUGF0aCIsInJlc3VtYWJsZSIsInByZXZpZXdEYXRhVGFibGUiLCJpbml0aWFsaXplIiwidGFiIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInZhbHVlIiwidXBkYXRlRm9ybWF0RGVzY3JpcHRpb24iLCJpbml0aWFsaXplRmlsZVVwbG9hZCIsIm9uIiwiY29uZmlybUltcG9ydCIsImNhbmNlbEltcG9ydCIsInN0YXJ0TmV3SW1wb3J0IiwiZXhwb3J0RW1wbG95ZWVzIiwiZG93bmxvYWRUZW1wbGF0ZSIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwib25JbXBvcnRQcm9ncmVzcyIsIm9uSW1wb3J0Q29tcGxldGUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhhc2giLCJzdWJzdHJpbmciLCJjbGljayIsImxlbmd0aCIsImNvbnNvbGUiLCJ3YXJuIiwiUmVzdW1hYmxlIiwidGFyZ2V0IiwiUGJ4QXBpIiwiZmlsZXNVcGxvYWRGaWxlIiwidGVzdENodW5rcyIsImNodW5rU2l6ZSIsIm1heEZpbGVzIiwic2ltdWx0YW5lb3VzVXBsb2FkcyIsImZpbGVUeXBlIiwiYXNzaWduQnJvd3NlIiwiYXNzaWduRHJvcCIsImZpbGUiLCJhZGRDbGFzcyIsInVwbG9hZCIsInBlcmNlbnQiLCJNYXRoIiwiZmxvb3IiLCJwcm9ncmVzcyIsImxvZyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJKU09OIiwicGFyc2UiLCJkYXRhIiwidXBsb2FkX2lkIiwicHJldmlld0ltcG9ydCIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfRmlsZVVwbG9hZEVycm9yIiwibWVzc2FnZSIsInN0cmF0ZWd5IiwiRW1wbG95ZWVzQVBJIiwiaW1wb3J0Q1NWIiwic2hvd1ByZXZpZXciLCJtZXNzYWdlcyIsInRleHQiLCJ0b3RhbCIsInZhbGlkIiwiZHVwbGljYXRlcyIsImVycm9ycyIsImRlc3Ryb3kiLCIkdGJvZHkiLCJmaW5kIiwiZW1wdHkiLCJwcmV2aWV3IiwiZm9yRWFjaCIsInJvdyIsInN0YXR1c0NsYXNzIiwic3RhdHVzIiwic3RhdHVzSWNvbiIsImFwcGVuZCIsIm51bWJlciIsInVzZXJfdXNlcm5hbWUiLCJ1c2VyX2VtYWlsIiwibW9iaWxlX251bWJlciIsInZhbGlkYXRpb25fbWVzc2FnZSIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInBhZ2VMZW5ndGgiLCJzZWFyY2hpbmciLCJvcmRlcmluZyIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJoaWRlIiwic2hvdyIsImFkZExvZ01lc3NhZ2UiLCJleF9JbXBvcnRTdGFydGVkIiwidW5kZWZpbmVkIiwidHlwZSIsIm1lc3NhZ2VDbGFzcyIsInN1Y2Nlc3MiLCJtZXNzYWdlSWNvbiIsIm1lc3NhZ2VUZXh0Iiwic3RhdHMiLCJleF9JbXBvcnRTdWNjZXNzIiwicmVwbGFjZSIsImNyZWF0ZWQiLCJza2lwcGVkIiwiZmFpbGVkIiwiZXJyb3IiLCJleF9JbXBvcnRGYWlsZWQiLCJodG1sIiwiZXhfSW1wb3J0Q29tcGxldGUiLCJpY29uQ2xhc3MiLCIkbWVzc2FnZSIsImxvZ0NvbnRhaW5lciIsInBhcmVudCIsInNjcm9sbFRvcCIsInNjcm9sbEhlaWdodCIsImZvcm1hdCIsImZpbHRlciIsIm51bWJlckZyb20iLCJ2YWwiLCJudW1iZXJUbyIsIm51bWJlcl9mcm9tIiwibnVtYmVyX3RvIiwiZXhwb3J0Q1NWIiwiZmlsZW5hbWUiLCJocmVmIiwiZ2V0VGVtcGxhdGUiLCJnZXRGb3JtYXRGaWVsZHMiLCJmb3JtYXRzIiwibWluaW1hbCIsImV4X0ZpZWxkTnVtYmVyX0hlbHAiLCJleF9GaWVsZFVzZXJuYW1lX0hlbHAiLCJleF9GaWVsZEVtYWlsX0hlbHAiLCJleF9GaWVsZE1vYmlsZV9IZWxwIiwiZXhfRmllbGRQYXNzd29yZF9IZWxwIiwiZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAiLCJleF9GaWVsZEZvcndhcmRpbmdfSGVscCIsInN0YW5kYXJkIiwiZXhfRmllbGRNb2JpbGVEaWFsc3RyaW5nX0hlbHAiLCJleF9GaWVsZERUTUZNb2RlX0hlbHAiLCJleF9GaWVsZFRyYW5zcG9ydF9IZWxwIiwiZXhfRmllbGRSZWNvcmRpbmdfSGVscCIsImV4X0ZpZWxkRm9yd2FyZGluZ0J1c3lfSGVscCIsImV4X0ZpZWxkRm9yd2FyZGluZ1VuYXZhaWxhYmxlX0hlbHAiLCJmdWxsIiwiZXhfRmllbGRBdmF0YXJfSGVscCIsImV4X0ZpZWxkTWFudWFsQXR0cmlidXRlc19IZWxwIiwiZmllbGRzIiwiJGNvbnRhaW5lciIsIm1hcCIsImZpZWxkIiwiam9pbiIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUFVLENBQUNoSSxNQUFmLEVBQXVCO0FBQ25CLFVBQU13RixJQUFJLEdBQUcsc0JBQ1R1QyxNQUFNLENBQUNFLEdBQVAsQ0FBVyxVQUFBQyxLQUFLO0FBQUEsbUNBQWlCQSxLQUFqQjtBQUFBLE9BQWhCLEVBQXNEQyxJQUF0RCxDQUEyRCxFQUEzRCxDQURTLEdBRVQsT0FGSjtBQUdBSCxNQUFBQSxVQUFVLENBQUN4QyxJQUFYLENBQWdCQSxJQUFoQjtBQUNIO0FBQ0o7QUFwZXdCLENBQTdCLEMsQ0F1ZUE7O0FBQ0ExSSxDQUFDLENBQUNzTCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCekwsRUFBQUEsb0JBQW9CLENBQUM4QixVQUFyQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgUGJ4QXBpLCBFbXBsb3llZXNBUEksIEV2ZW50QnVzLCBTZW1hbnRpY0xvY2FsaXphdGlvbiAqL1xuXG4vKipcbiAqIFRoZSBleHRlbnNpb25zQnVsa1VwbG9hZCBtb2R1bGUgaGFuZGxlcyBDU1YgaW1wb3J0L2V4cG9ydCBmdW5jdGlvbmFsaXR5IGZvciBlbXBsb3llZXNcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uc0J1bGtVcGxvYWRcbiAqL1xuY29uc3QgZXh0ZW5zaW9uc0J1bGtVcGxvYWQgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IGVsZW1lbnRzXG4gICAgICovXG4gICAgJHVwbG9hZEJ1dHRvbjogJCgnI3VwbG9hZC1idXR0b24nKSxcbiAgICAkdXBsb2FkU2VnbWVudDogJCgnI3VwbG9hZC1zZWdtZW50JyksXG4gICAgJHByZXZpZXdTZWN0aW9uOiAkKCcjcHJldmlldy1zZWN0aW9uJyksXG4gICAgJHByb2dyZXNzU2VjdGlvbjogJCgnI3Byb2dyZXNzLXNlY3Rpb24nKSxcbiAgICAkcmVzdWx0c1NlY3Rpb246ICQoJyNyZXN1bHRzLXNlY3Rpb24nKSxcbiAgICAkcHJldmlld1RhYmxlOiAkKCcjcHJldmlldy10YWJsZScpLFxuICAgICRpbXBvcnRQcm9ncmVzczogJCgnI2ltcG9ydC1wcm9ncmVzcycpLFxuICAgICRwcm9ncmVzc0xhYmVsOiAkKCcjcHJvZ3Jlc3MtbGFiZWwnKSxcbiAgICAkbG9nTWVzc2FnZXM6ICQoJyNsb2ctbWVzc2FnZXMnKSxcbiAgICAkcmVzdWx0TWVzc2FnZTogJCgnI3Jlc3VsdC1tZXNzYWdlJyksXG4gICAgJHRvdGFsQ291bnQ6ICQoJyN0b3RhbC1jb3VudCcpLFxuICAgICR2YWxpZENvdW50OiAkKCcjdmFsaWQtY291bnQnKSxcbiAgICAkZHVwbGljYXRlQ291bnQ6ICQoJyNkdXBsaWNhdGUtY291bnQnKSxcbiAgICAkZXJyb3JDb3VudDogJCgnI2Vycm9yLWNvdW50JyksXG4gICAgJGNvbmZpcm1JbXBvcnQ6ICQoJyNjb25maXJtLWltcG9ydCcpLFxuICAgICRjYW5jZWxJbXBvcnQ6ICQoJyNjYW5jZWwtaW1wb3J0JyksXG4gICAgJG5ld0ltcG9ydDogJCgnI25ldy1pbXBvcnQnKSxcbiAgICAkZXhwb3J0QnV0dG9uOiAkKCcjZXhwb3J0LWJ1dHRvbicpLFxuICAgICRkb3dubG9hZFRlbXBsYXRlOiAkKCcjZG93bmxvYWQtdGVtcGxhdGUnKSxcbiAgICAkaW1wb3J0U3RyYXRlZ3k6ICQoJyNpbXBvcnQtc3RyYXRlZ3knKSxcbiAgICAkZXhwb3J0Rm9ybWF0OiAkKCcjZXhwb3J0LWZvcm1hdCcpLFxuICAgICR0ZW1wbGF0ZUZvcm1hdDogJCgnI3RlbXBsYXRlLWZvcm1hdCcpLFxuICAgICRudW1iZXJGcm9tOiAkKCcjbnVtYmVyLWZyb20nKSxcbiAgICAkbnVtYmVyVG86ICQoJyNudW1iZXItdG8nKSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdXBsb2FkIGRhdGFcbiAgICAgKi9cbiAgICB1cGxvYWRJZDogbnVsbCxcbiAgICB1cGxvYWRlZEZpbGVQYXRoOiBudWxsLFxuICAgIHJlc3VtYWJsZTogbnVsbCxcbiAgICBwcmV2aWV3RGF0YVRhYmxlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgICQoJyNidWxrLXRhYnMgLml0ZW0nKS50YWIoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIGNoYW5nZSBoYW5kbGVyc1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuZHJvcGRvd24oKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEZvcm1hdC5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVGb3JtYXREZXNjcmlwdGlvbignZXhwb3J0JywgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHRlbXBsYXRlRm9ybWF0LmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwZGF0ZUZvcm1hdERlc2NyaXB0aW9uKCd0ZW1wbGF0ZScsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGluaXRpYWwgZm9ybWF0IGRlc2NyaXB0aW9uc1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVGb3JtYXREZXNjcmlwdGlvbignZXhwb3J0JywgJ3N0YW5kYXJkJyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwZGF0ZUZvcm1hdERlc2NyaXB0aW9uKCd0ZW1wbGF0ZScsICdzdGFuZGFyZCcpO1xuXG4gICAgICAgIC8vIFNldCB1cCBmaWxlIHVwbG9hZFxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbml0aWFsaXplRmlsZVVwbG9hZCgpO1xuXG4gICAgICAgIC8vIFNldCB1cCBldmVudCBoYW5kbGVyc1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY29uZmlybUltcG9ydC5vbignY2xpY2snLCBleHRlbnNpb25zQnVsa1VwbG9hZC5jb25maXJtSW1wb3J0KTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydC5vbignY2xpY2snLCBleHRlbnNpb25zQnVsa1VwbG9hZC5jYW5jZWxJbXBvcnQpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kbmV3SW1wb3J0Lm9uKCdjbGljaycsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnN0YXJ0TmV3SW1wb3J0KTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEJ1dHRvbi5vbignY2xpY2snLCBleHRlbnNpb25zQnVsa1VwbG9hZC5leHBvcnRFbXBsb3llZXMpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZG93bmxvYWRUZW1wbGF0ZS5vbignY2xpY2snLCBleHRlbnNpb25zQnVsa1VwbG9hZC5kb3dubG9hZFRlbXBsYXRlKTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIGltcG9ydCBwcm9ncmVzc1xuICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ2ltcG9ydF9wcm9ncmVzcycsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLm9uSW1wb3J0UHJvZ3Jlc3MpO1xuICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ2ltcG9ydF9jb21wbGV0ZScsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLm9uSW1wb3J0Q29tcGxldGUpO1xuXG4gICAgICAgIC8vIENoZWNrIFVSTCBoYXNoIHRvIGFjdGl2YXRlIGNvcnJlY3QgdGFiXG4gICAgICAgIGlmICh3aW5kb3cubG9jYXRpb24uaGFzaCkge1xuICAgICAgICAgICAgY29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKTtcbiAgICAgICAgICAgICQoYCNidWxrLXRhYnMgLml0ZW1bZGF0YS10YWI9XCIke2hhc2h9XCJdYCkuY2xpY2soKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZpbGUgdXBsb2FkIHdpdGggUmVzdW1hYmxlLmpzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZpbGVVcGxvYWQoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGVsZW1lbnRzIGV4aXN0IGJlZm9yZSBpbml0aWFsaXppbmdcbiAgICAgICAgaWYgKCFleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkQnV0dG9uLmxlbmd0aCB8fCAhZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VwbG9hZCBlbGVtZW50cyBub3QgZm91bmQsIHNraXBwaW5nIFJlc3VtYWJsZSBpbml0aWFsaXphdGlvbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5yZXN1bWFibGUgPSBuZXcgUmVzdW1hYmxlKHtcbiAgICAgICAgICAgIHRhcmdldDogUGJ4QXBpLmZpbGVzVXBsb2FkRmlsZSxcbiAgICAgICAgICAgIHRlc3RDaHVua3M6IGZhbHNlLFxuICAgICAgICAgICAgY2h1bmtTaXplOiAzICogMTAyNCAqIDEwMjQsXG4gICAgICAgICAgICBtYXhGaWxlczogMSxcbiAgICAgICAgICAgIHNpbXVsdGFuZW91c1VwbG9hZHM6IDEsXG4gICAgICAgICAgICBmaWxlVHlwZTogWydjc3YnXSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucmVzdW1hYmxlLmFzc2lnbkJyb3dzZShleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkQnV0dG9uWzBdKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucmVzdW1hYmxlLmFzc2lnbkRyb3AoZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnRbMF0pO1xuXG4gICAgICAgIC8vIEZpbGUgYWRkZWQgZXZlbnRcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucmVzdW1hYmxlLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnJlc3VtYWJsZS51cGxvYWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBsb2FkIHByb2dyZXNzXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnJlc3VtYWJsZS5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSBNYXRoLmZsb29yKGZpbGUucHJvZ3Jlc3MoKSAqIDEwMCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgVXBsb2FkIHByb2dyZXNzOiAke3BlcmNlbnR9JWApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGxvYWQgc3VjY2Vzc1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5yZXN1bWFibGUub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG4gICAgICAgICAgICBpZiAocmVzdWx0LnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXN1bHQuZGF0YSAmJiByZXN1bHQuZGF0YS51cGxvYWRfaWQpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVQYXRoID0gcmVzdWx0LmRhdGEudXBsb2FkX2lkO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdJbXBvcnQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leF9GaWxlVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGxvYWQgZXJyb3JcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucmVzdW1hYmxlLm9uKCdmaWxlRXJyb3InLCAoZmlsZSwgbWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhtZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9GaWxlVXBsb2FkRXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJldmlldyBpbXBvcnQgLSB2YWxpZGF0ZSBDU1YgYW5kIHNob3cgcHJldmlld1xuICAgICAqL1xuICAgIHByZXZpZXdJbXBvcnQoKSB7XG4gICAgICAgIGNvbnN0IHN0cmF0ZWd5ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFN0cmF0ZWd5LmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgRW1wbG95ZWVzQVBJLmltcG9ydENTVihcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZVBhdGgsXG4gICAgICAgICAgICAncHJldmlldycsXG4gICAgICAgICAgICBzdHJhdGVneSxcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZElkID0gcmVzcG9uc2UuZGF0YS51cGxvYWRJZDtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc2hvd1ByZXZpZXcocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgcHJldmlldyBvZiBDU1YgZGF0YVxuICAgICAqL1xuICAgIHNob3dQcmV2aWV3KGRhdGEpIHtcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRpc3RpY3NcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHRvdGFsQ291bnQudGV4dChkYXRhLnRvdGFsIHx8IDApO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdmFsaWRDb3VudC50ZXh0KGRhdGEudmFsaWQgfHwgMCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkdXBsaWNhdGVDb3VudC50ZXh0KGRhdGEuZHVwbGljYXRlcyB8fCAwKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGVycm9yQ291bnQudGV4dChkYXRhLmVycm9ycyB8fCAwKTtcblxuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIERhdGFUYWJsZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUuZGVzdHJveSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgYW5kIHBvcHVsYXRlIHByZXZpZXcgdGFibGVcbiAgICAgICAgY29uc3QgJHRib2R5ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5maW5kKCd0Ym9keScpO1xuICAgICAgICAkdGJvZHkuZW1wdHkoKTtcblxuICAgICAgICBpZiAoZGF0YS5wcmV2aWV3ICYmIGRhdGEucHJldmlldy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBkYXRhLnByZXZpZXcuZm9yRWFjaCgocm93KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSByb3cuc3RhdHVzID09PSAndmFsaWQnID8gJ3Bvc2l0aXZlJyA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3cuc3RhdHVzID09PSAnZHVwbGljYXRlJyA/ICd3YXJuaW5nJyA6ICduZWdhdGl2ZSc7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzSWNvbiA9IHJvdy5zdGF0dXMgPT09ICd2YWxpZCcgPyAnY2hlY2sgY2lyY2xlJyA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5zdGF0dXMgPT09ICdkdXBsaWNhdGUnID8gJ2V4Y2xhbWF0aW9uIHRyaWFuZ2xlJyA6ICd0aW1lcyBjaXJjbGUnO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICR0Ym9keS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgICAgICA8dHIgY2xhc3M9XCIke3N0YXR1c0NsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPjxpIGNsYXNzPVwiJHtzdGF0dXNJY29ufSBpY29uXCI+PC9pPiAke3Jvdy5zdGF0dXN9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke3Jvdy5udW1iZXIgfHwgJyd9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke3Jvdy51c2VyX3VzZXJuYW1lIHx8ICcnfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtyb3cudXNlcl9lbWFpbCB8fCAnJ308L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPiR7cm93Lm1vYmlsZV9udW1iZXIgfHwgJyd9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke3Jvdy52YWxpZGF0aW9uX21lc3NhZ2UgfHwgJyd9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBEYXRhVGFibGVcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucHJldmlld0RhdGFUYWJsZSA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiAxMCxcbiAgICAgICAgICAgIHNlYXJjaGluZzogZmFsc2UsXG4gICAgICAgICAgICBvcmRlcmluZzogdHJ1ZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNob3cgcHJldmlldyBzZWN0aW9uLCBoaWRlIHVwbG9hZCBzZWN0aW9uXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdTZWN0aW9uLnNob3coKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uZmlybSBhbmQgc3RhcnQgaW1wb3J0XG4gICAgICovXG4gICAgY29uZmlybUltcG9ydCgpIHtcbiAgICAgICAgaWYgKCFleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRJZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RyYXRlZ3kgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICBcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICBFbXBsb3llZXNBUEkuY29uZmlybUltcG9ydChcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZElkLFxuICAgICAgICAgICAgc3RyYXRlZ3ksXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY29uZmlybUltcG9ydC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIHByZXZpZXcsIHNob3cgcHJvZ3Jlc3NcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHByb2dyZXNzIGJhclxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0UHJvZ3Jlc3MucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVyY2VudDogMFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGxvZyBtZXNzYWdlc1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kbG9nTWVzc2FnZXMuZW1wdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEltcG9ydCBoYXMgc3RhcnRlZCwgd2FpdCBmb3IgRXZlbnRCdXMgdXBkYXRlc1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5hZGRMb2dNZXNzYWdlKCdpbmZvJywgZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXJ0ZWQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYW5jZWwgaW1wb3J0IGFuZCByZXNldFxuICAgICAqL1xuICAgIGNhbmNlbEltcG9ydCgpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQuc2hvdygpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRJZCA9IG51bGw7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZVBhdGggPSBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydCBuZXcgaW1wb3J0XG4gICAgICovXG4gICAgc3RhcnROZXdJbXBvcnQoKSB7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRyZXN1bHRzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcm9ncmVzc1NlY3Rpb24uaGlkZSgpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1NlY3Rpb24uaGlkZSgpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5zaG93KCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZElkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlUGF0aCA9IG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbXBvcnQgcHJvZ3Jlc3MgZnJvbSBFdmVudEJ1c1xuICAgICAqL1xuICAgIG9uSW1wb3J0UHJvZ3Jlc3MoZGF0YSkge1xuICAgICAgICBpZiAoZGF0YS5wZXJjZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRQcm9ncmVzcy5wcm9ncmVzcyh7XG4gICAgICAgICAgICAgICAgcGVyY2VudDogZGF0YS5wZXJjZW50XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkYXRhLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcm9ncmVzc0xhYmVsLnRleHQoZGF0YS5tZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkYXRhLmxvZykge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuYWRkTG9nTWVzc2FnZShkYXRhLnR5cGUgfHwgJ2luZm8nLCBkYXRhLmxvZyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGltcG9ydCBjb21wbGV0aW9uXG4gICAgICovXG4gICAgb25JbXBvcnRDb21wbGV0ZShkYXRhKSB7XG4gICAgICAgIC8vIEhpZGUgcHJvZ3Jlc3MsIHNob3cgcmVzdWx0c1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdHNTZWN0aW9uLnNob3coKTtcblxuICAgICAgICAvLyBTaG93IHJlc3VsdCBtZXNzYWdlXG4gICAgICAgIGNvbnN0IG1lc3NhZ2VDbGFzcyA9IGRhdGEuc3VjY2VzcyA/ICdwb3NpdGl2ZScgOiAnbmVnYXRpdmUnO1xuICAgICAgICBjb25zdCBtZXNzYWdlSWNvbiA9IGRhdGEuc3VjY2VzcyA/ICdjaGVjayBjaXJjbGUnIDogJ3RpbWVzIGNpcmNsZSc7XG4gICAgICAgIGxldCBtZXNzYWdlVGV4dCA9ICcnO1xuXG4gICAgICAgIGlmIChkYXRhLnN0YXRzKSB7XG4gICAgICAgICAgICBtZXNzYWdlVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdWNjZXNzXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJ3tjcmVhdGVkfScsIGRhdGEuc3RhdHMuY3JlYXRlZCB8fCAwKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKCd7c2tpcHBlZH0nLCBkYXRhLnN0YXRzLnNraXBwZWQgfHwgMClcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgne2ZhaWxlZH0nLCBkYXRhLnN0YXRzLmZhaWxlZCB8fCAwKTtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICBtZXNzYWdlVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRGYWlsZWQucmVwbGFjZSgne2Vycm9yfScsIGRhdGEuZXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdE1lc3NhZ2UuaHRtbChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiJHttZXNzYWdlQ2xhc3N9IG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIiR7bWVzc2FnZUljb259IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7ZGF0YS5zdWNjZXNzID8gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydENvbXBsZXRlIDogZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydEZhaWxlZH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHttZXNzYWdlVGV4dH08L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBsb2cgbWVzc2FnZVxuICAgICAqL1xuICAgIGFkZExvZ01lc3NhZ2UodHlwZSwgbWVzc2FnZSkge1xuICAgICAgICBjb25zdCBpY29uQ2xhc3MgPSB0eXBlID09PSAnZXJyb3InID8gJ3RpbWVzIGNpcmNsZSByZWQnIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9PT0gJ3dhcm5pbmcnID8gJ2V4Y2xhbWF0aW9uIHRyaWFuZ2xlIHllbGxvdycgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAnaW5mbyBjaXJjbGUgYmx1ZSc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkbWVzc2FnZSA9ICQoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIiR7aWNvbkNsYXNzfSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvblwiPiR7bWVzc2FnZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRsb2dNZXNzYWdlcy5hcHBlbmQoJG1lc3NhZ2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2Nyb2xsIHRvIGJvdHRvbVxuICAgICAgICBjb25zdCBsb2dDb250YWluZXIgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kbG9nTWVzc2FnZXMucGFyZW50KClbMF07XG4gICAgICAgIGlmIChsb2dDb250YWluZXIpIHtcbiAgICAgICAgICAgIGxvZ0NvbnRhaW5lci5zY3JvbGxUb3AgPSBsb2dDb250YWluZXIuc2Nyb2xsSGVpZ2h0O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4cG9ydCBlbXBsb3llZXMgdG8gQ1NWXG4gICAgICovXG4gICAgZXhwb3J0RW1wbG95ZWVzKCkge1xuICAgICAgICBjb25zdCBmb3JtYXQgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXhwb3J0Rm9ybWF0LmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgY29uc3QgZmlsdGVyID0ge307XG4gICAgICAgIFxuICAgICAgICBjb25zdCBudW1iZXJGcm9tID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJG51bWJlckZyb20udmFsKCk7XG4gICAgICAgIGNvbnN0IG51bWJlclRvID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJG51bWJlclRvLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKG51bWJlckZyb20pIHtcbiAgICAgICAgICAgIGZpbHRlci5udW1iZXJfZnJvbSA9IG51bWJlckZyb207XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bWJlclRvKSB7XG4gICAgICAgICAgICBmaWx0ZXIubnVtYmVyX3RvID0gbnVtYmVyVG87XG4gICAgICAgIH1cblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXhwb3J0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgRW1wbG95ZWVzQVBJLmV4cG9ydENTVihcbiAgICAgICAgICAgIGZvcm1hdCxcbiAgICAgICAgICAgIGZpbHRlcixcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRleHBvcnRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBkb3dubG9hZCB1c2luZyB0aGUgbGluayBmcm9tIHRoZSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgYWxyZWFkeSBjb250YWlucyB0aGUgZnVsbCBwYXRoIGZyb20gcm9vdFxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXNwb25zZS5kYXRhLmZpbGVuYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERvd25sb2FkIENTViB0ZW1wbGF0ZVxuICAgICAqL1xuICAgIGRvd25sb2FkVGVtcGxhdGUoKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdCA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR0ZW1wbGF0ZUZvcm1hdC5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGRvd25sb2FkVGVtcGxhdGUuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICBFbXBsb3llZXNBUEkuZ2V0VGVtcGxhdGUoXG4gICAgICAgICAgICBmb3JtYXQsXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZG93bmxvYWRUZW1wbGF0ZS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGRvd25sb2FkIHVzaW5nIHRoZSBsaW5rIGZyb20gdGhlIHNlcnZlclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5maWxlbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVzcG9uc2UuZGF0YS5maWxlbmFtZSBhbHJlYWR5IGNvbnRhaW5zIHRoZSBmdWxsIHBhdGggZnJvbSByb290XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlc3BvbnNlLmRhdGEuZmlsZW5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGZpZWxkIGRlc2NyaXB0aW9ucyBmb3IgZm9ybWF0XG4gICAgICovXG4gICAgZ2V0Rm9ybWF0RmllbGRzKGZvcm1hdCkge1xuICAgICAgICBjb25zdCBmb3JtYXRzID0ge1xuICAgICAgICAgICAgbWluaW1hbDogW1xuICAgICAgICAgICAgICAgICdudW1iZXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTnVtYmVyX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3VzZXJfdXNlcm5hbWUgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkVXNlcm5hbWVfSGVscCxcbiAgICAgICAgICAgICAgICAndXNlcl9lbWFpbCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRFbWFpbF9IZWxwLFxuICAgICAgICAgICAgICAgICdtb2JpbGVfbnVtYmVyIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE1vYmlsZV9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfc2VjcmV0IC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFBhc3N3b3JkX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9yaW5nbGVuZ3RoIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFJpbmdMZW5ndGhfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX2ZvcndhcmRpbmcgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRm9yd2FyZGluZ19IZWxwXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgc3RhbmRhcmQ6IFtcbiAgICAgICAgICAgICAgICAnbnVtYmVyIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE51bWJlcl9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX3VzZXJuYW1lIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFVzZXJuYW1lX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3VzZXJfZW1haWwgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRW1haWxfSGVscCxcbiAgICAgICAgICAgICAgICAnbW9iaWxlX251bWJlciAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRNb2JpbGVfSGVscCxcbiAgICAgICAgICAgICAgICAnbW9iaWxlX2RpYWxzdHJpbmcgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTW9iaWxlRGlhbHN0cmluZ19IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfc2VjcmV0IC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFBhc3N3b3JkX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3NpcF9kdG1mbW9kZSAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGREVE1GTW9kZV9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfdHJhbnNwb3J0IC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFRyYW5zcG9ydF9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfZW5hYmxlUmVjb3JkaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFJlY29yZGluZ19IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfcmluZ2xlbmd0aCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX2ZvcndhcmRpbmdvbmJ1c3kgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRm9yd2FyZGluZ0J1c3lfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdVbmF2YWlsYWJsZV9IZWxwXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZnVsbDogW1xuICAgICAgICAgICAgICAgICdudW1iZXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTnVtYmVyX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3VzZXJfdXNlcm5hbWUgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkVXNlcm5hbWVfSGVscCxcbiAgICAgICAgICAgICAgICAndXNlcl9lbWFpbCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRFbWFpbF9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX2F2YXRhciAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRBdmF0YXJfSGVscCxcbiAgICAgICAgICAgICAgICAnbW9iaWxlX251bWJlciAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRNb2JpbGVfSGVscCxcbiAgICAgICAgICAgICAgICAnbW9iaWxlX2RpYWxzdHJpbmcgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTW9iaWxlRGlhbHN0cmluZ19IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfc2VjcmV0IC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFBhc3N3b3JkX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3NpcF9kdG1mbW9kZSAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGREVE1GTW9kZV9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfdHJhbnNwb3J0IC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFRyYW5zcG9ydF9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfZW5hYmxlUmVjb3JkaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFJlY29yZGluZ19IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfbWFudWFsYXR0cmlidXRlcyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRNYW51YWxBdHRyaWJ1dGVzX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9yaW5nbGVuZ3RoIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFJpbmdMZW5ndGhfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX2ZvcndhcmRpbmcgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRm9yd2FyZGluZ19IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfZm9yd2FyZGluZ29uYnVzeSAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRGb3J3YXJkaW5nQnVzeV9IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfZm9yd2FyZGluZ29udW5hdmFpbGFibGUgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRm9yd2FyZGluZ1VuYXZhaWxhYmxlX0hlbHBcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmb3JtYXRzW2Zvcm1hdF0gfHwgZm9ybWF0cy5zdGFuZGFyZDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBmb3JtYXQgZGVzY3JpcHRpb25cbiAgICAgKi9cbiAgICB1cGRhdGVGb3JtYXREZXNjcmlwdGlvbih0eXBlLCBmb3JtYXQpIHtcbiAgICAgICAgY29uc3QgZmllbGRzID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuZ2V0Rm9ybWF0RmllbGRzKGZvcm1hdCk7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSB0eXBlID09PSAnZXhwb3J0JyA/IFxuICAgICAgICAgICAgJCgnI2V4cG9ydC1mb3JtYXQtZmllbGRzLWRlc2NyaXB0aW9uJykgOiBcbiAgICAgICAgICAgICQoJyNmb3JtYXQtZmllbGRzLWRlc2NyaXB0aW9uJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSAnPHVsIGNsYXNzPVwibGlzdFwiPicgKyBcbiAgICAgICAgICAgICAgICBmaWVsZHMubWFwKGZpZWxkID0+IGA8bGk+PGNvZGU+JHtmaWVsZH08L2NvZGU+PC9saT5gKS5qb2luKCcnKSArIFxuICAgICAgICAgICAgICAgICc8L3VsPic7XG4gICAgICAgICAgICAkY29udGFpbmVyLmh0bWwoaHRtbCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbml0aWFsaXplKCk7XG59KTsiXX0=