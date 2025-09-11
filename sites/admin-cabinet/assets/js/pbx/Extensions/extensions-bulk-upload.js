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
    $('#bulk-tabs .item').tab(); // Initialize dropdowns

    extensionsBulkUpload.$importStrategy.dropdown();
    extensionsBulkUpload.$exportFormat.dropdown();
    extensionsBulkUpload.$templateFormat.dropdown(); // Set up file upload

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
        // Trigger download
        if (response.data.fpassthru) {
          window.location = "".concat(globalRootUrl, "employees/downloadCSV?file=").concat(response.data.fpassthru.filename);
        }

        var message = globalTranslate.ex_ExportSuccess.replace('{count}', response.data.count || 0);
        UserMessage.showInformation(message);
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
        // Trigger download
        if (response.data.fpassthru) {
          window.location = "".concat(globalRootUrl, "employees/downloadCSV?file=").concat(response.data.fpassthru.filename);
        }

        UserMessage.showInformation(globalTranslate.ex_TemplateDownloaded);
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
  }
}; // Initialize when document is ready

$(document).ready(function () {
  extensionsBulkUpload.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtYnVsay11cGxvYWQuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0J1bGtVcGxvYWQiLCIkdXBsb2FkQnV0dG9uIiwiJCIsIiR1cGxvYWRTZWdtZW50IiwiJHByZXZpZXdTZWN0aW9uIiwiJHByb2dyZXNzU2VjdGlvbiIsIiRyZXN1bHRzU2VjdGlvbiIsIiRwcmV2aWV3VGFibGUiLCIkaW1wb3J0UHJvZ3Jlc3MiLCIkcHJvZ3Jlc3NMYWJlbCIsIiRsb2dNZXNzYWdlcyIsIiRyZXN1bHRNZXNzYWdlIiwiJHRvdGFsQ291bnQiLCIkdmFsaWRDb3VudCIsIiRkdXBsaWNhdGVDb3VudCIsIiRlcnJvckNvdW50IiwiJGNvbmZpcm1JbXBvcnQiLCIkY2FuY2VsSW1wb3J0IiwiJG5ld0ltcG9ydCIsIiRleHBvcnRCdXR0b24iLCIkZG93bmxvYWRUZW1wbGF0ZSIsIiRpbXBvcnRTdHJhdGVneSIsIiRleHBvcnRGb3JtYXQiLCIkdGVtcGxhdGVGb3JtYXQiLCIkbnVtYmVyRnJvbSIsIiRudW1iZXJUbyIsInVwbG9hZElkIiwidXBsb2FkZWRGaWxlUGF0aCIsInJlc3VtYWJsZSIsInByZXZpZXdEYXRhVGFibGUiLCJpbml0aWFsaXplIiwidGFiIiwiZHJvcGRvd24iLCJpbml0aWFsaXplRmlsZVVwbG9hZCIsIm9uIiwiY29uZmlybUltcG9ydCIsImNhbmNlbEltcG9ydCIsInN0YXJ0TmV3SW1wb3J0IiwiZXhwb3J0RW1wbG95ZWVzIiwiZG93bmxvYWRUZW1wbGF0ZSIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwib25JbXBvcnRQcm9ncmVzcyIsIm9uSW1wb3J0Q29tcGxldGUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhhc2giLCJzdWJzdHJpbmciLCJjbGljayIsImxlbmd0aCIsImNvbnNvbGUiLCJ3YXJuIiwiUmVzdW1hYmxlIiwidGFyZ2V0IiwiUGJ4QXBpIiwiZmlsZXNVcGxvYWRGaWxlIiwidGVzdENodW5rcyIsImNodW5rU2l6ZSIsIm1heEZpbGVzIiwic2ltdWx0YW5lb3VzVXBsb2FkcyIsImZpbGVUeXBlIiwiYXNzaWduQnJvd3NlIiwiYXNzaWduRHJvcCIsImZpbGUiLCJhZGRDbGFzcyIsInVwbG9hZCIsInBlcmNlbnQiLCJNYXRoIiwiZmxvb3IiLCJwcm9ncmVzcyIsImxvZyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJKU09OIiwicGFyc2UiLCJkYXRhIiwidXBsb2FkX2lkIiwicHJldmlld0ltcG9ydCIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfRmlsZVVwbG9hZEVycm9yIiwibWVzc2FnZSIsInN0cmF0ZWd5IiwiRW1wbG95ZWVzQVBJIiwiaW1wb3J0Q1NWIiwic2hvd1ByZXZpZXciLCJtZXNzYWdlcyIsInRleHQiLCJ0b3RhbCIsInZhbGlkIiwiZHVwbGljYXRlcyIsImVycm9ycyIsImRlc3Ryb3kiLCIkdGJvZHkiLCJmaW5kIiwiZW1wdHkiLCJwcmV2aWV3IiwiZm9yRWFjaCIsInJvdyIsInN0YXR1c0NsYXNzIiwic3RhdHVzIiwic3RhdHVzSWNvbiIsImFwcGVuZCIsIm51bWJlciIsInVzZXJfdXNlcm5hbWUiLCJ1c2VyX2VtYWlsIiwibW9iaWxlX251bWJlciIsInZhbGlkYXRpb25fbWVzc2FnZSIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInBhZ2VMZW5ndGgiLCJzZWFyY2hpbmciLCJvcmRlcmluZyIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJoaWRlIiwic2hvdyIsImFkZExvZ01lc3NhZ2UiLCJleF9JbXBvcnRTdGFydGVkIiwidW5kZWZpbmVkIiwidHlwZSIsIm1lc3NhZ2VDbGFzcyIsInN1Y2Nlc3MiLCJtZXNzYWdlSWNvbiIsIm1lc3NhZ2VUZXh0Iiwic3RhdHMiLCJleF9JbXBvcnRTdWNjZXNzIiwicmVwbGFjZSIsImNyZWF0ZWQiLCJza2lwcGVkIiwiZmFpbGVkIiwiZXJyb3IiLCJleF9JbXBvcnRGYWlsZWQiLCJodG1sIiwiZXhfSW1wb3J0Q29tcGxldGUiLCJpY29uQ2xhc3MiLCIkbWVzc2FnZSIsImxvZ0NvbnRhaW5lciIsInBhcmVudCIsInNjcm9sbFRvcCIsInNjcm9sbEhlaWdodCIsImZvcm1hdCIsImZpbHRlciIsIm51bWJlckZyb20iLCJ2YWwiLCJudW1iZXJUbyIsIm51bWJlcl9mcm9tIiwibnVtYmVyX3RvIiwiZXhwb3J0Q1NWIiwiZnBhc3N0aHJ1IiwiZ2xvYmFsUm9vdFVybCIsImZpbGVuYW1lIiwiZXhfRXhwb3J0U3VjY2VzcyIsImNvdW50Iiwic2hvd0luZm9ybWF0aW9uIiwiZ2V0VGVtcGxhdGUiLCJleF9UZW1wbGF0ZURvd25sb2FkZWQiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxvQkFBb0IsR0FBRztBQUN6QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FKUztBQUt6QkMsRUFBQUEsY0FBYyxFQUFFRCxDQUFDLENBQUMsaUJBQUQsQ0FMUTtBQU16QkUsRUFBQUEsZUFBZSxFQUFFRixDQUFDLENBQUMsa0JBQUQsQ0FOTztBQU96QkcsRUFBQUEsZ0JBQWdCLEVBQUVILENBQUMsQ0FBQyxtQkFBRCxDQVBNO0FBUXpCSSxFQUFBQSxlQUFlLEVBQUVKLENBQUMsQ0FBQyxrQkFBRCxDQVJPO0FBU3pCSyxFQUFBQSxhQUFhLEVBQUVMLENBQUMsQ0FBQyxnQkFBRCxDQVRTO0FBVXpCTSxFQUFBQSxlQUFlLEVBQUVOLENBQUMsQ0FBQyxrQkFBRCxDQVZPO0FBV3pCTyxFQUFBQSxjQUFjLEVBQUVQLENBQUMsQ0FBQyxpQkFBRCxD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LFdBQWIsQ0FDSWQsTUFESixFQUVJLFVBQUMxRSxRQUFELEVBQWM7QUFDVnZFLE1BQUFBLG9CQUFvQixDQUFDb0IsaUJBQXJCLENBQXVDb0QsV0FBdkMsQ0FBbUQsU0FBbkQ7O0FBRUEsVUFBSUQsUUFBUSxDQUFDRSxNQUFULEtBQW9CLElBQXBCLElBQTRCRixRQUFRLENBQUNLLElBQXpDLEVBQStDO0FBQzNDO0FBQ0EsWUFBSUwsUUFBUSxDQUFDSyxJQUFULENBQWM2RSxTQUFsQixFQUE2QjtBQUN6QjdHLFVBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQjZHLGFBQXJCLHdDQUFnRW5GLFFBQVEsQ0FBQ0ssSUFBVCxDQUFjNkUsU0FBZCxDQUF3QkUsUUFBeEY7QUFDSDs7QUFFRDVFLFFBQUFBLFdBQVcsQ0FBQytFLGVBQVosQ0FBNEI3RSxlQUFlLENBQUMrRSxxQkFBNUM7QUFDSCxPQVBELE1BT087QUFDSGpGLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QlQsUUFBUSxDQUFDaUIsUUFBckM7QUFDSDtBQUNKLEtBZkw7QUFpQkg7QUF4WndCLENBQTdCLEMsQ0EyWkE7O0FBQ0F0RixDQUFDLENBQUMrSixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbEssRUFBQUEsb0JBQW9CLENBQUM4QixVQUFyQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgUGJ4QXBpLCBFbXBsb3llZXNBUEksIEV2ZW50QnVzLCBTZW1hbnRpY0xvY2FsaXphdGlvbiAqL1xuXG4vKipcbiAqIFRoZSBleHRlbnNpb25zQnVsa1VwbG9hZCBtb2R1bGUgaGFuZGxlcyBDU1YgaW1wb3J0L2V4cG9ydCBmdW5jdGlvbmFsaXR5IGZvciBlbXBsb3llZXNcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uc0J1bGtVcGxvYWRcbiAqL1xuY29uc3QgZXh0ZW5zaW9uc0J1bGtVcGxvYWQgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IGVsZW1lbnRzXG4gICAgICovXG4gICAgJHVwbG9hZEJ1dHRvbjogJCgnI3VwbG9hZC1idXR0b24nKSxcbiAgICAkdXBsb2FkU2VnbWVudDogJCgnI3VwbG9hZC1zZWdtZW50JyksXG4gICAgJHByZXZpZXdTZWN0aW9uOiAkKCcjcHJldmlldy1zZWN0aW9uJyksXG4gICAgJHByb2dyZXNzU2VjdGlvbjogJCgnI3Byb2dyZXNzLXNlY3Rpb24nKSxcbiAgICAkcmVzdWx0c1NlY3Rpb246ICQoJyNyZXN1bHRzLXNlY3Rpb24nKSxcbiAgICAkcHJldmlld1RhYmxlOiAkKCcjcHJldmlldy10YWJsZScpLFxuICAgICRpbXBvcnRQcm9ncmVzczogJCgnI2ltcG9ydC1wcm9ncmVzcycpLFxuICAgICRwcm9ncmVzc0xhYmVsOiAkKCcjcHJvZ3Jlc3MtbGFiZWwnKSxcbiAgICAkbG9nTWVzc2FnZXM6ICQoJyNsb2ctbWVzc2FnZXMnKSxcbiAgICAkcmVzdWx0TWVzc2FnZTogJCgnI3Jlc3VsdC1tZXNzYWdlJyksXG4gICAgJHRvdGFsQ291bnQ6ICQoJyN0b3RhbC1jb3VudCcpLFxuICAgICR2YWxpZENvdW50OiAkKCcjdmFsaWQtY291bnQnKSxcbiAgICAkZHVwbGljYXRlQ291bnQ6ICQoJyNkdXBsaWNhdGUtY291bnQnKSxcbiAgICAkZXJyb3JDb3VudDogJCgnI2Vycm9yLWNvdW50JyksXG4gICAgJGNvbmZpcm1JbXBvcnQ6ICQoJyNjb25maXJtLWltcG9ydCcpLFxuICAgICRjYW5jZWxJbXBvcnQ6ICQoJyNjYW5jZWwtaW1wb3J0JyksXG4gICAgJG5ld0ltcG9ydDogJCgnI25ldy1pbXBvcnQnKSxcbiAgICAkZXhwb3J0QnV0dG9uOiAkKCcjZXhwb3J0LWJ1dHRvbicpLFxuICAgICRkb3dubG9hZFRlbXBsYXRlOiAkKCcjZG93bmxvYWQtdGVtcGxhdGUnKSxcbiAgICAkaW1wb3J0U3RyYXRlZ3k6ICQoJyNpbXBvcnQtc3RyYXRlZ3knKSxcbiAgICAkZXhwb3J0Rm9ybWF0OiAkKCcjZXhwb3J0LWZvcm1hdCcpLFxuICAgICR0ZW1wbGF0ZUZvcm1hdDogJCgnI3RlbXBsYXRlLWZvcm1hdCcpLFxuICAgICRudW1iZXJGcm9tOiAkKCcjbnVtYmVyLWZyb20nKSxcbiAgICAkbnVtYmVyVG86ICQoJyNudW1iZXItdG8nKSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdXBsb2FkIGRhdGFcbiAgICAgKi9cbiAgICB1cGxvYWRJZDogbnVsbCxcbiAgICB1cGxvYWRlZEZpbGVQYXRoOiBudWxsLFxuICAgIHJlc3VtYWJsZTogbnVsbCxcbiAgICBwcmV2aWV3RGF0YVRhYmxlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgICQoJyNidWxrLXRhYnMgLml0ZW0nKS50YWIoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuZHJvcGRvd24oKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEZvcm1hdC5kcm9wZG93bigpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdGVtcGxhdGVGb3JtYXQuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBTZXQgdXAgZmlsZSB1cGxvYWRcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW5pdGlhbGl6ZUZpbGVVcGxvYWQoKTtcblxuICAgICAgICAvLyBTZXQgdXAgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY29uZmlybUltcG9ydCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjYW5jZWxJbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY2FuY2VsSW1wb3J0KTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJG5ld0ltcG9ydC5vbignY2xpY2snLCBleHRlbnNpb25zQnVsa1VwbG9hZC5zdGFydE5ld0ltcG9ydCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRleHBvcnRCdXR0b24ub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuZXhwb3J0RW1wbG95ZWVzKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGRvd25sb2FkVGVtcGxhdGUub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuZG93bmxvYWRUZW1wbGF0ZSk7XG5cbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciBpbXBvcnQgcHJvZ3Jlc3NcbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdpbXBvcnRfcHJvZ3Jlc3MnLCBleHRlbnNpb25zQnVsa1VwbG9hZC5vbkltcG9ydFByb2dyZXNzKTtcbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdpbXBvcnRfY29tcGxldGUnLCBleHRlbnNpb25zQnVsa1VwbG9hZC5vbkltcG9ydENvbXBsZXRlKTtcblxuICAgICAgICAvLyBDaGVjayBVUkwgaGFzaCB0byBhY3RpdmF0ZSBjb3JyZWN0IHRhYlxuICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAgICAgICAgIGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSk7XG4gICAgICAgICAgICAkKGAjYnVsay10YWJzIC5pdGVtW2RhdGEtdGFiPVwiJHtoYXNofVwiXWApLmNsaWNrKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmaWxlIHVwbG9hZCB3aXRoIFJlc3VtYWJsZS5qc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWxlVXBsb2FkKCkge1xuICAgICAgICAvLyBDaGVjayBpZiBlbGVtZW50cyBleGlzdCBiZWZvcmUgaW5pdGlhbGl6aW5nXG4gICAgICAgIGlmICghZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZEJ1dHRvbi5sZW5ndGggfHwgIWV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdVcGxvYWQgZWxlbWVudHMgbm90IGZvdW5kLCBza2lwcGluZyBSZXN1bWFibGUgaW5pdGlhbGl6YXRpb24nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucmVzdW1hYmxlID0gbmV3IFJlc3VtYWJsZSh7XG4gICAgICAgICAgICB0YXJnZXQ6IFBieEFwaS5maWxlc1VwbG9hZEZpbGUsXG4gICAgICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgIGNodW5rU2l6ZTogMyAqIDEwMjQgKiAxMDI0LFxuICAgICAgICAgICAgbWF4RmlsZXM6IDEsXG4gICAgICAgICAgICBzaW11bHRhbmVvdXNVcGxvYWRzOiAxLFxuICAgICAgICAgICAgZmlsZVR5cGU6IFsnY3N2J10sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnJlc3VtYWJsZS5hc3NpZ25Ccm93c2UoZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZEJ1dHRvblswXSk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnJlc3VtYWJsZS5hc3NpZ25Ecm9wKGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50WzBdKTtcblxuICAgICAgICAvLyBGaWxlIGFkZGVkIGV2ZW50XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnJlc3VtYWJsZS5vbignZmlsZUFkZGVkJywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5yZXN1bWFibGUudXBsb2FkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVwbG9hZCBwcm9ncmVzc1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5yZXN1bWFibGUub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5mbG9vcihmaWxlLnByb2dyZXNzKCkgKiAxMDApO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFVwbG9hZCBwcm9ncmVzczogJHtwZXJjZW50fSVgKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBsb2FkIHN1Y2Nlc3NcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucmVzdW1hYmxlLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IEpTT04ucGFyc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5yZXN1bHQgPT09IHRydWUgJiYgcmVzdWx0LmRhdGEgJiYgcmVzdWx0LmRhdGEudXBsb2FkX2lkKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlUGF0aCA9IHJlc3VsdC5kYXRhLnVwbG9hZF9pZDtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5wcmV2aWV3SW1wb3J0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXhfRmlsZVVwbG9hZEVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBsb2FkIGVycm9yXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnJlc3VtYWJsZS5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcobWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuZXhfRmlsZVVwbG9hZEVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXZpZXcgaW1wb3J0IC0gdmFsaWRhdGUgQ1NWIGFuZCBzaG93IHByZXZpZXdcbiAgICAgKi9cbiAgICBwcmV2aWV3SW1wb3J0KCkge1xuICAgICAgICBjb25zdCBzdHJhdGVneSA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRTdHJhdGVneS5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgIFxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIEVtcGxveWVlc0FQSS5pbXBvcnRDU1YoXG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVQYXRoLFxuICAgICAgICAgICAgJ3ByZXZpZXcnLFxuICAgICAgICAgICAgc3RyYXRlZ3ksXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRJZCA9IHJlc3BvbnNlLmRhdGEudXBsb2FkSWQ7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnNob3dQcmV2aWV3KHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IHByZXZpZXcgb2YgQ1NWIGRhdGFcbiAgICAgKi9cbiAgICBzaG93UHJldmlldyhkYXRhKSB7XG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0aXN0aWNzXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR0b3RhbENvdW50LnRleHQoZGF0YS50b3RhbCB8fCAwKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHZhbGlkQ291bnQudGV4dChkYXRhLnZhbGlkIHx8IDApO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZHVwbGljYXRlQ291bnQudGV4dChkYXRhLmR1cGxpY2F0ZXMgfHwgMCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRlcnJvckNvdW50LnRleHQoZGF0YS5lcnJvcnMgfHwgMCk7XG5cbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBEYXRhVGFibGUgaWYgZXhpc3RzXG4gICAgICAgIGlmIChleHRlbnNpb25zQnVsa1VwbG9hZC5wcmV2aWV3RGF0YVRhYmxlKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5wcmV2aWV3RGF0YVRhYmxlLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIGFuZCBwb3B1bGF0ZSBwcmV2aWV3IHRhYmxlXG4gICAgICAgIGNvbnN0ICR0Ym9keSA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGJvZHknKTtcbiAgICAgICAgJHRib2R5LmVtcHR5KCk7XG5cbiAgICAgICAgaWYgKGRhdGEucHJldmlldyAmJiBkYXRhLnByZXZpZXcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZGF0YS5wcmV2aWV3LmZvckVhY2goKHJvdykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c0NsYXNzID0gcm93LnN0YXR1cyA9PT0gJ3ZhbGlkJyA/ICdwb3NpdGl2ZScgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93LnN0YXR1cyA9PT0gJ2R1cGxpY2F0ZScgPyAnd2FybmluZycgOiAnbmVnYXRpdmUnO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c0ljb24gPSByb3cuc3RhdHVzID09PSAndmFsaWQnID8gJ2NoZWNrIGNpcmNsZScgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3cuc3RhdHVzID09PSAnZHVwbGljYXRlJyA/ICdleGNsYW1hdGlvbiB0cmlhbmdsZScgOiAndGltZXMgY2lyY2xlJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkdGJvZHkuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwiJHtzdGF0dXNDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD48aSBjbGFzcz1cIiR7c3RhdHVzSWNvbn0gaWNvblwiPjwvaT4gJHtyb3cuc3RhdHVzfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtyb3cubnVtYmVyIHx8ICcnfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtyb3cudXNlcl91c2VybmFtZSB8fCAnJ308L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPiR7cm93LnVzZXJfZW1haWwgfHwgJyd9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke3Jvdy5tb2JpbGVfbnVtYmVyIHx8ICcnfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtyb3cudmFsaWRhdGlvbl9tZXNzYWdlIHx8ICcnfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgRGF0YVRhYmxlXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogMTAsXG4gICAgICAgICAgICBzZWFyY2hpbmc6IGZhbHNlLFxuICAgICAgICAgICAgb3JkZXJpbmc6IHRydWUsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTaG93IHByZXZpZXcgc2VjdGlvbiwgaGlkZSB1cGxvYWQgc2VjdGlvblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3U2VjdGlvbi5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbmZpcm0gYW5kIHN0YXJ0IGltcG9ydFxuICAgICAqL1xuICAgIGNvbmZpcm1JbXBvcnQoKSB7XG4gICAgICAgIGlmICghZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkSWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0cmF0ZWd5ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFN0cmF0ZWd5LmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjb25maXJtSW1wb3J0LmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgRW1wbG95ZWVzQVBJLmNvbmZpcm1JbXBvcnQoXG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRJZCxcbiAgICAgICAgICAgIHN0cmF0ZWd5LFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGlkZSBwcmV2aWV3LCBzaG93IHByb2dyZXNzXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3U2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcm9ncmVzc1NlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwcm9ncmVzcyBiYXJcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFByb2dyZXNzLnByb2dyZXNzKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlcmNlbnQ6IDBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBsb2cgbWVzc2FnZXNcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGxvZ01lc3NhZ2VzLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJbXBvcnQgaGFzIHN0YXJ0ZWQsIHdhaXQgZm9yIEV2ZW50QnVzIHVwZGF0ZXNcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuYWRkTG9nTWVzc2FnZSgnaW5mbycsIGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGFydGVkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FuY2VsIGltcG9ydCBhbmQgcmVzZXRcbiAgICAgKi9cbiAgICBjYW5jZWxJbXBvcnQoKSB7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3U2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnNob3coKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVQYXRoID0gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnQgbmV3IGltcG9ydFxuICAgICAqL1xuICAgIHN0YXJ0TmV3SW1wb3J0KCkge1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcmVzdWx0c1NlY3Rpb24uaGlkZSgpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQuc2hvdygpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRJZCA9IG51bGw7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZVBhdGggPSBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW1wb3J0IHByb2dyZXNzIGZyb20gRXZlbnRCdXNcbiAgICAgKi9cbiAgICBvbkltcG9ydFByb2dyZXNzKGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEucGVyY2VudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0UHJvZ3Jlc3MucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgIHBlcmNlbnQ6IGRhdGEucGVyY2VudFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF0YS5tZXNzYWdlKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NMYWJlbC50ZXh0KGRhdGEubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF0YS5sb2cpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmFkZExvZ01lc3NhZ2UoZGF0YS50eXBlIHx8ICdpbmZvJywgZGF0YS5sb2cpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbXBvcnQgY29tcGxldGlvblxuICAgICAqL1xuICAgIG9uSW1wb3J0Q29tcGxldGUoZGF0YSkge1xuICAgICAgICAvLyBIaWRlIHByb2dyZXNzLCBzaG93IHJlc3VsdHNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRyZXN1bHRzU2VjdGlvbi5zaG93KCk7XG5cbiAgICAgICAgLy8gU2hvdyByZXN1bHQgbWVzc2FnZVxuICAgICAgICBjb25zdCBtZXNzYWdlQ2xhc3MgPSBkYXRhLnN1Y2Nlc3MgPyAncG9zaXRpdmUnIDogJ25lZ2F0aXZlJztcbiAgICAgICAgY29uc3QgbWVzc2FnZUljb24gPSBkYXRhLnN1Y2Nlc3MgPyAnY2hlY2sgY2lyY2xlJyA6ICd0aW1lcyBjaXJjbGUnO1xuICAgICAgICBsZXQgbWVzc2FnZVRleHQgPSAnJztcblxuICAgICAgICBpZiAoZGF0YS5zdGF0cykge1xuICAgICAgICAgICAgbWVzc2FnZVRleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3VjY2Vzc1xuICAgICAgICAgICAgICAgIC5yZXBsYWNlKCd7Y3JlYXRlZH0nLCBkYXRhLnN0YXRzLmNyZWF0ZWQgfHwgMClcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgne3NraXBwZWR9JywgZGF0YS5zdGF0cy5za2lwcGVkIHx8IDApXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJ3tmYWlsZWR9JywgZGF0YS5zdGF0cy5mYWlsZWQgfHwgMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5lcnJvcikge1xuICAgICAgICAgICAgbWVzc2FnZVRleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0RmFpbGVkLnJlcGxhY2UoJ3tlcnJvcn0nLCBkYXRhLmVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRyZXN1bHRNZXNzYWdlLmh0bWwoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cIiR7bWVzc2FnZUNsYXNzfSBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke21lc3NhZ2VJY29ufSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2RhdGEuc3VjY2VzcyA/IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRDb21wbGV0ZSA6IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRGYWlsZWR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxwPiR7bWVzc2FnZVRleHR9PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgbG9nIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBhZGRMb2dNZXNzYWdlKHR5cGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgaWNvbkNsYXNzID0gdHlwZSA9PT0gJ2Vycm9yJyA/ICd0aW1lcyBjaXJjbGUgcmVkJyA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgPT09ICd3YXJuaW5nJyA/ICdleGNsYW1hdGlvbiB0cmlhbmdsZSB5ZWxsb3cnIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ2luZm8gY2lyY2xlIGJsdWUnO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJG1lc3NhZ2UgPSAkKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2ljb25DbGFzc30gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb25cIj4ke21lc3NhZ2V9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCk7XG4gICAgICAgIFxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kbG9nTWVzc2FnZXMuYXBwZW5kKCRtZXNzYWdlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNjcm9sbCB0byBib3R0b21cbiAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGxvZ01lc3NhZ2VzLnBhcmVudCgpWzBdO1xuICAgICAgICBpZiAobG9nQ29udGFpbmVyKSB7XG4gICAgICAgICAgICBsb2dDb250YWluZXIuc2Nyb2xsVG9wID0gbG9nQ29udGFpbmVyLnNjcm9sbEhlaWdodDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHBvcnQgZW1wbG95ZWVzIHRvIENTVlxuICAgICAqL1xuICAgIGV4cG9ydEVtcGxveWVlcygpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEZvcm1hdC5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgIGNvbnN0IGZpbHRlciA9IHt9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbnVtYmVyRnJvbSA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJGcm9tLnZhbCgpO1xuICAgICAgICBjb25zdCBudW1iZXJUbyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJUby52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChudW1iZXJGcm9tKSB7XG4gICAgICAgICAgICBmaWx0ZXIubnVtYmVyX2Zyb20gPSBudW1iZXJGcm9tO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudW1iZXJUbykge1xuICAgICAgICAgICAgZmlsdGVyLm51bWJlcl90byA9IG51bWJlclRvO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIEVtcGxveWVlc0FQSS5leHBvcnRDU1YoXG4gICAgICAgICAgICBmb3JtYXQsXG4gICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXhwb3J0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZG93bmxvYWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuZnBhc3N0aHJ1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWVtcGxveWVlcy9kb3dubG9hZENTVj9maWxlPSR7cmVzcG9uc2UuZGF0YS5mcGFzc3RocnUuZmlsZW5hbWV9YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5leF9FeHBvcnRTdWNjZXNzXG4gICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgne2NvdW50fScsIHJlc3BvbnNlLmRhdGEuY291bnQgfHwgMCk7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWQgQ1NWIHRlbXBsYXRlXG4gICAgICovXG4gICAgZG93bmxvYWRUZW1wbGF0ZSgpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHRlbXBsYXRlRm9ybWF0LmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZG93bmxvYWRUZW1wbGF0ZS5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIEVtcGxveWVlc0FQSS5nZXRUZW1wbGF0ZShcbiAgICAgICAgICAgIGZvcm1hdCxcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkb3dubG9hZFRlbXBsYXRlLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZG93bmxvYWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuZnBhc3N0aHJ1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWVtcGxveWVlcy9kb3dubG9hZENTVj9maWxlPSR7cmVzcG9uc2UuZGF0YS5mcGFzc3RocnUuZmlsZW5hbWV9YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKGdsb2JhbFRyYW5zbGF0ZS5leF9UZW1wbGF0ZURvd25sb2FkZWQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==