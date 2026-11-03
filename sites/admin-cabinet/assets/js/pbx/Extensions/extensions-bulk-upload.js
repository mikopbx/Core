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

/* global globalRootUrl, globalTranslate, UserMessage, PbxApi, EmployeesAPI, EventBus, SemanticLocalization, FileUploadEventHandler, FilesAPI */

/**
 * The extensionsBulkUpload module handles CSV import/export functionality for employees
 * @module extensionsBulkUpload
 */
var extensionsBulkUpload = {
  /**
   * jQuery elements.
   * Resolved in initialize() — must not call $() at module-load time.
   */
  $uploadButton: null,
  $uploadSegment: null,
  $previewSection: null,
  $progressSection: null,
  $resultsSection: null,
  $previewTable: null,
  $importProgress: null,
  $progressLabel: null,
  $progressText: null,
  $resultMessage: null,
  $totalCount: null,
  $validCount: null,
  $duplicateCount: null,
  $errorCount: null,
  $confirmImport: null,
  $cancelImport: null,
  $cancelImportProcess: null,
  $newImport: null,
  $importControls: null,
  $exportButton: null,
  $downloadTemplate: null,
  $importStrategy: null,
  $exportFormat: null,
  $templateFormat: null,
  $numberFrom: null,
  $numberTo: null,

  /**
   * Current upload data
   */
  uploadId: null,
  uploadedFilePath: null,
  uploadedFileId: null,
  currentJobId: null,
  importChannelId: null,
  importProgressCallback: null,
  previewDataTable: null,

  /**
   * Initialize the module
   */
  initialize: function initialize() {
    // Resolve jQuery wrappers here — at module-load time jQuery may
    // not yet be defined (Sentry MIKOPBX-MG9 pattern).
    extensionsBulkUpload.$uploadButton = $('#upload-button');
    extensionsBulkUpload.$uploadSegment = $('#upload-segment');
    extensionsBulkUpload.$previewSection = $('#preview-section');
    extensionsBulkUpload.$progressSection = $('#progress-section');
    extensionsBulkUpload.$resultsSection = $('#results-section');
    extensionsBulkUpload.$previewTable = $('#preview-table');
    extensionsBulkUpload.$importProgress = $('#import-progress');
    extensionsBulkUpload.$progressLabel = $('#progress-label');
    extensionsBulkUpload.$progressText = $('#progress-text');
    extensionsBulkUpload.$resultMessage = $('#result-message');
    extensionsBulkUpload.$totalCount = $('#total-count');
    extensionsBulkUpload.$validCount = $('#valid-count');
    extensionsBulkUpload.$duplicateCount = $('#duplicate-count');
    extensionsBulkUpload.$errorCount = $('#error-count');
    extensionsBulkUpload.$confirmImport = $('#confirm-import');
    extensionsBulkUpload.$cancelImport = $('#cancel-import');
    extensionsBulkUpload.$cancelImportProcess = $('#cancel-import-process');
    extensionsBulkUpload.$newImport = $('#new-import');
    extensionsBulkUpload.$importControls = $('#import-controls');
    extensionsBulkUpload.$exportButton = $('#export-button');
    extensionsBulkUpload.$downloadTemplate = $('#download-template');
    extensionsBulkUpload.$importStrategy = $('#import-strategy');
    extensionsBulkUpload.$exportFormat = $('#export-format');
    extensionsBulkUpload.$templateFormat = $('#template-format');
    extensionsBulkUpload.$numberFrom = $('#number-from');
    extensionsBulkUpload.$numberTo = $('#number-to'); // Initialize tabs with event handler to clear messages

    $('#bulk-tabs .item').tab({
      onVisible: function onVisible() {
        // Clear any existing error messages when switching tabs
        $('.ui.message.ajax').remove();
      }
    }); // Initialize dropdowns with change handlers

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
    extensionsBulkUpload.$cancelImportProcess.on('click', extensionsBulkUpload.cancelImportProcess);
    extensionsBulkUpload.$newImport.on('click', extensionsBulkUpload.startNewImport);
    extensionsBulkUpload.$exportButton.on('click', extensionsBulkUpload.exportEmployees);
    extensionsBulkUpload.$downloadTemplate.on('click', extensionsBulkUpload.downloadTemplate); // Subscribe to EventBus for import progress

    EventBus.subscribe('import_progress', extensionsBulkUpload.onImportProgress);
    EventBus.subscribe('import_complete', extensionsBulkUpload.onImportComplete); // Check URL hash to activate correct tab; compare the attribute, the hash is not selector syntax

    if (window.location.hash) {
      var hash = window.location.hash.substring(1);
      $('#bulk-tabs .item').filter(function (index, item) {
        return item.getAttribute('data-tab') === hash;
      }).click();
    }
  },

  /**
   * Initialize file upload using FilesAPI.attachToBtn for consistent behavior
   */
  initializeFileUpload: function initializeFileUpload() {
    // Check if elements exist before initializing
    if (!extensionsBulkUpload.$uploadButton.length || !extensionsBulkUpload.$uploadSegment.length) {
      console.error('❌ [BulkUpload] Upload elements not found', {
        uploadButton: extensionsBulkUpload.$uploadButton.length,
        uploadSegment: extensionsBulkUpload.$uploadSegment.length
      }); // Upload elements not found, skipping file upload initialization

      return;
    } // Use FilesAPI.attachToBtn for unified file upload handling
    // This attaches directly to the button and handles file selection internally


    FilesAPI.attachToBtn('upload-button', ['csv'], extensionsBulkUpload.cbUploadResumable, null, 'csv');
  },

  /**
   * Callback function for file upload with chunks and merge.
   * @param {string} action - The action performed during the upload.
   * @param {Object} params - Additional parameters related to the upload.
   */
  cbUploadResumable: function cbUploadResumable(action, params) {
    var _params$file, _params$file2;

    switch (action) {
      case 'uploadStart':
        extensionsBulkUpload.$uploadSegment.addClass('loading');
        break;

      case 'fileSuccess':
        {
          var result = PbxApi.tryParseJSON(params.response);

          if (result !== false && result.data && result.data.upload_id) {
            extensionsBulkUpload.uploadedFileId = result.data.upload_id;
            extensionsBulkUpload.uploadedFilePath = result.data.filename;
            extensionsBulkUpload.checkStatusFileMerging(params.response);
          } else {
            var _result$data;

            console.error('❌ [BulkUpload] Invalid response format', {
              result: result,
              hasData: result ? !!result.data : false,
              hasUploadId: (result === null || result === void 0 ? void 0 : (_result$data = result.data) === null || _result$data === void 0 ? void 0 : _result$data.upload_id) || false,
              errorMessages: (result === null || result === void 0 ? void 0 : result.messages) || 'No error messages',
              resultResult: result === null || result === void 0 ? void 0 : result.result,
              rawResponse: params.response
            }); // Show more specific error message if available

            var errorMessage = globalTranslate.ex_FileUploadError;

            if (result && result.messages && result.messages.error) {
              errorMessage = result.messages.error;
              console.error('🚨 [BulkUpload] Server error message:', result.messages.error);
            } else if (result && result.messages) {
              console.error('🚨 [BulkUpload] Server messages:', result.messages);

              if (typeof result.messages === 'string') {
                errorMessage = result.messages;
              } else if (Array.isArray(result.messages)) {
                errorMessage = result.messages.join(', ');
              }
            }

            extensionsBulkUpload.$uploadSegment.removeClass('loading');
            UserMessage.showMultiString(errorMessage);
          }

          break;
        }

      case 'fileError':
        console.error('❌ [BulkUpload] File error', {
          fileName: ((_params$file = params.file) === null || _params$file === void 0 ? void 0 : _params$file.fileName) || ((_params$file2 = params.file) === null || _params$file2 === void 0 ? void 0 : _params$file2.name),
          message: params.message
        });
        extensionsBulkUpload.$uploadSegment.removeClass('loading');
        UserMessage.showMultiString(params.message || globalTranslate.ex_FileUploadError);
        break;

      case 'error':
        console.error('💥 [BulkUpload] Upload error', {
          message: params.message || params,
          file: params.file
        });
        extensionsBulkUpload.$uploadSegment.removeClass('loading');
        UserMessage.showMultiString(params, globalTranslate.ex_FileUploadError);
        break;

      default:
        // fileAdded, fileProgress, complete: nothing to do
        break;
    }
  },

  /**
   * Checks the status of file merging.
   * @param {string} response - The response from the file merging status function.
   */
  checkStatusFileMerging: function checkStatusFileMerging(response) {
    if (response === undefined || PbxApi.tryParseJSON(response) === false) {
      UserMessage.showMultiString("".concat(globalTranslate.ex_FileUploadError));
      return;
    }

    var json = JSON.parse(response);

    if (json === undefined || json.data === undefined) {
      UserMessage.showMultiString("".concat(globalTranslate.ex_FileUploadError));
      return;
    }

    var uploadId = json.data.upload_id;
    var filePath = json.data.filename; // Subscribe to EventBus for upload progress

    FileUploadEventHandler.subscribe(uploadId, {
      onMergeStarted: function onMergeStarted(data) {// File merge started
      },
      onMergeProgress: function onMergeProgress(data) {// Update progress if needed
      },
      onMergeComplete: function onMergeComplete(data) {
        extensionsBulkUpload.$uploadSegment.removeClass('loading');
        extensionsBulkUpload.previewImport();
      },
      onError: function onError(data) {
        extensionsBulkUpload.$uploadSegment.removeClass('loading');
        UserMessage.showMultiString(data.error || globalTranslate.ex_FileUploadError);
      }
    }); // Check immediate status (same as sound-file-modify.js)

    if (json.data.d_status === 'UPLOAD_COMPLETE' || !json.data.d_status) {
      // File is already ready, proceed with preview immediately
      extensionsBulkUpload.$uploadSegment.removeClass('loading');
      extensionsBulkUpload.previewImport();
    }
  },
  // Note: startMergingCheckWorker() method removed - now using EventBus for real-time updates

  /**
   * Preview import - validate CSV and show preview
   */
  previewImport: function previewImport() {
    var strategy = extensionsBulkUpload.$importStrategy.dropdown('get value');
    extensionsBulkUpload.$uploadSegment.addClass('loading'); // Use uploadedFileId for API call, as the file is now fully merged

    EmployeesAPI.importCSV(extensionsBulkUpload.uploadedFileId, 'preview', strategy, function (response) {
      extensionsBulkUpload.$uploadSegment.removeClass('loading');

      if (response.result === true && response.data) {
        // Backend returns upload_id, not uploadId
        extensionsBulkUpload.uploadId = response.data.upload_id || response.data.uploadId;
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
        var statusClass = row.status === 'valid' ? 'positive' : row.status === 'duplicate' || row.status === 'exists' ? 'warning' : 'negative';
        var statusIcon = row.status === 'valid' ? 'check circle' : row.status === 'duplicate' || row.status === 'exists' ? 'exclamation triangle' : 'times circle'; // Translate status text

        var statusText = row.status;

        switch (row.status) {
          case 'valid':
            statusText = globalTranslate.ex_ImportStatusValid;
            break;

          case 'duplicate':
            statusText = globalTranslate.ex_ImportStatusDuplicate;
            break;

          case 'exists':
            statusText = globalTranslate.ex_ImportStatusExists;
            break;

          case 'error':
            statusText = globalTranslate.ex_ImportStatusError;
            break;

          case 'invalid':
            statusText = globalTranslate.ex_ImportStatusInvalid;
            break;
        } // CSV values are data, not markup: set them as text and attributes (issue #1349)


        var $row = $('<tr>').addClass(statusClass).attr('data-row', row.row).attr('data-number', row.number || '');
        [row.number, row.user_username, row.mobile_number, row.user_email].forEach(function (value) {
          $('<td>').text(value || '').appendTo($row);
        });
        var $statusCell = $('<td>').addClass('status-cell').append($('<i>').addClass("".concat(statusIcon, " icon")), ' ', $('<span>').addClass('status-text').text(statusText)).appendTo($row); // Show why the row is rejected (missing fields, a row the delimiter did not split)

        if (row.status === 'error' && row.message) {
          $statusCell.attr('title', row.message).append(' ', $('<span>').addClass('status-detail').text("\u2014 ".concat(row.message)));
        }

        $tbody.append($row);
      });
    } // Use simple Semantic UI table instead of DataTables to avoid header/body separation issues
    // Add CSS class to preview table for styling


    extensionsBulkUpload.$previewTable.addClass('preview-table'); // Initialize Semantic UI table sorting manually if needed

    extensionsBulkUpload.$previewTable.find('th').each(function (index) {
      var $th = $(this);

      if (index === 4) {
        // Status column - make it sortable (now at index 4)
        $th.addClass('sorted ascending'); // Set initial sort
      }

      $th.on('click', function () {
        var $allTh = extensionsBulkUpload.$previewTable.find('th');
        var $tbody = extensionsBulkUpload.$previewTable.find('tbody');
        var $rows = $tbody.find('tr'); // Remove sorting classes from other headers

        $allTh.removeClass('sorted ascending descending'); // Determine sort direction

        var isAscending = !$th.hasClass('sorted') || $th.hasClass('descending');
        $th.addClass(isAscending ? 'sorted ascending' : 'sorted descending'); // Simple sort implementation

        var sortedRows = $rows.sort(function (a, b) {
          var aText = $(a).find('td').eq(index).text().trim();
          var bText = $(b).find('td').eq(index).text().trim(); // For status column, sort by status priority

          if (index === 4) {
            var statusOrder = {
              'Пропущен': 1,
              'Создан': 2,
              'Обновлен': 3,
              'Уже существует': 4,
              'Ошибка': 5
            };
            var aStatus = statusOrder[aText.split(' ').slice(1).join(' ')] || 999;
            var bStatus = statusOrder[bText.split(' ').slice(1).join(' ')] || 999;
            return isAscending ? aStatus - bStatus : bStatus - aStatus;
          } // For other columns, simple text sort


          if (aText < bText) return isAscending ? -1 : 1;
          if (aText > bText) return isAscending ? 1 : -1;
          return 0;
        });
        $tbody.empty().append(sortedRows);
      });
    }); // Store reference for row updates (compatibility with existing code)

    extensionsBulkUpload.previewDataTable = {
      destroy: function destroy() {
        // Cleanup if needed
        extensionsBulkUpload.$previewTable.find('th').off('click');
        extensionsBulkUpload.$previewTable.removeClass('preview-table');
      }
    }; // Show preview section, hide upload section

    extensionsBulkUpload.$uploadSegment.hide();
    extensionsBulkUpload.$previewSection.show(); // Note: Removed automatic scrolling to prevent page jumping during processing
  },

  /**
   * Confirm and start import
   */
  confirmImport: function confirmImport() {
    if (!extensionsBulkUpload.uploadId) {
      UserMessage.showMultiString('Upload ID is missing', 'error');
      return;
    }

    var strategy = extensionsBulkUpload.$importStrategy.dropdown('get value');
    extensionsBulkUpload.$confirmImport.addClass('loading');
    EmployeesAPI.confirmImport(extensionsBulkUpload.uploadId, strategy, function (response) {
      extensionsBulkUpload.$confirmImport.removeClass('loading');

      if (response.result === true && response.data) {
        // Keep preview table visible, show progress section
        extensionsBulkUpload.$progressSection.show(); // Hide import buttons, show cancel button

        extensionsBulkUpload.$confirmImport.hide();
        extensionsBulkUpload.$cancelImport.hide();
        extensionsBulkUpload.$importStrategy.closest('.field').hide(); // Save job information for cancellation

        extensionsBulkUpload.currentJobId = response.data.jobId || null;
        extensionsBulkUpload.importChannelId = response.data.channelId || null; // Initialize progress bar

        extensionsBulkUpload.$importProgress.progress({
          percent: 0
        }); // Reset progress text

        extensionsBulkUpload.$progressText.text(globalTranslate.ex_ImportStarted); // Subscribe to import progress events via EventBus FIRST

        if (response.data.channelId) {
          extensionsBulkUpload.subscribeToImportProgress(response.data.channelId);
        } // Reset valid rows to 'processing' status after a small delay to ensure EventBus is ready


        setTimeout(function () {
          extensionsBulkUpload.resetTableToProcessing();
        }, 100);
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Subscribe to import progress events
   * @param {string} channelId - Import progress channel ID
   */
  subscribeToImportProgress: function subscribeToImportProgress(channelId) {
    // Store callback function reference for later unsubscription.
    // Messages carry CSV values: never log them, the console ends up in error reports.
    extensionsBulkUpload.importProgressCallback = function (message) {
      if (message && message.type) {
        switch (message.type) {
          case 'import_started':
            extensionsBulkUpload.handleImportStarted(message.data);
            break;

          case 'import_progress':
            extensionsBulkUpload.handleImportProgress(message.data);
            break;

          case 'import_completed':
            extensionsBulkUpload.handleImportCompleted(message.data);
            break;

          default:
            console.warn("\u26A0\uFE0F [BulkUpload] Unknown message type: ".concat(message.type));
        }
      } else {
        console.warn('⚠️ [BulkUpload] Import progress message without a type');
      }
    };

    EventBus.subscribe(channelId, extensionsBulkUpload.importProgressCallback);
  },

  /**
   * Handle import started event
   * @param {object} data - Import started data
   */
  handleImportStarted: function handleImportStarted(data) {
    extensionsBulkUpload.updateProgressText("".concat(globalTranslate.ex_ImportStarted, " (").concat(data.total, " ").concat(globalTranslate.ex_Records, ")"));
  },

  /**
   * Handle import progress event
   * @param {object} data - Import progress data
   */
  handleImportProgress: function handleImportProgress(data) {
    var percent = Math.round(data.processed / data.total * 100);
    extensionsBulkUpload.$importProgress.progress({
      percent: percent
    }); // Update individual row status if provided

    if (data.currentRecord) {
      extensionsBulkUpload.updateRowStatus(data.currentRecord.number, data.currentRecord.status, data.currentRecord.message);
    } // Build progress message with skipped count


    var parts = [];

    if (data.created > 0) {
      parts.push("".concat(data.created, " ").concat(globalTranslate.ex_Created));
    }

    if (data.updated > 0) {
      parts.push("".concat(data.updated, " ").concat(globalTranslate.ex_Updated));
    }

    if (data.skipped > 0) {
      parts.push("".concat(data.skipped, " ").concat(globalTranslate.ex_Skipped));
    }

    if (data.errors > 0) {
      parts.push("".concat(data.errors, " ").concat(globalTranslate.ex_Errors));
    }

    var message = "".concat(globalTranslate.ex_ImportProgress, ": ").concat(data.processed, "/").concat(data.total, " (").concat(parts.join(', '), ")");
    extensionsBulkUpload.updateProgressText(message);
  },

  /**
   * Handle import completed event
   * @param {object} data - Import completion data
   */
  handleImportCompleted: function handleImportCompleted(data) {
    extensionsBulkUpload.$importProgress.progress({
      percent: 100
    }); // Show completion message

    var message = "".concat(globalTranslate.ex_ImportCompleted, ": ").concat(data.created, " ").concat(globalTranslate.ex_Created, ", ").concat(data.updated, " ").concat(globalTranslate.ex_Updated, ", ").concat(data.skipped, " ").concat(globalTranslate.ex_Skipped, ", ").concat(data.errors, " ").concat(globalTranslate.ex_Errors);
    extensionsBulkUpload.updateProgressText(message); // Hide cancel button and entire import controls block after completion

    extensionsBulkUpload.$cancelImportProcess.hide();
    extensionsBulkUpload.$importControls.hide(); // Clear job data

    extensionsBulkUpload.currentJobId = null; // Unsubscribe from progress events after completion

    if (extensionsBulkUpload.importChannelId && extensionsBulkUpload.importProgressCallback) {
      EventBus.unsubscribe(extensionsBulkUpload.importChannelId, extensionsBulkUpload.importProgressCallback);
      extensionsBulkUpload.importChannelId = null;
      extensionsBulkUpload.importProgressCallback = null;
    } // Automatically sort table by status after import completion


    extensionsBulkUpload.sortTableByStatus();
  },

  /**
   * Cancel import and reset
   */
  cancelImport: function cancelImport() {
    // Clear any existing error messages
    $('.ui.message.ajax').remove();
    extensionsBulkUpload.$previewSection.hide();
    extensionsBulkUpload.$uploadSegment.show(); // Unsubscribe from EventBus if subscribed

    if (extensionsBulkUpload.uploadedFileId) {
      FileUploadEventHandler.unsubscribe(extensionsBulkUpload.uploadedFileId);
    }

    extensionsBulkUpload.uploadId = null;
    extensionsBulkUpload.uploadedFilePath = null;
    extensionsBulkUpload.uploadedFileId = null;
    extensionsBulkUpload.currentJobId = null;
    extensionsBulkUpload.importChannelId = null;
    extensionsBulkUpload.importProgressCallback = null;
  },

  /**
   * Cancel the running import process
   */
  cancelImportProcess: function cancelImportProcess() {
    if (!extensionsBulkUpload.currentJobId) {
      return;
    } // Set button to loading state


    extensionsBulkUpload.$cancelImportProcess.addClass('loading disabled'); // For now, just stop the UI updates since server-side cancellation is not implemented
    // TODO: Implement server-side job cancellation
    // Update progress text with cancellation message

    extensionsBulkUpload.updateProgressText(globalTranslate.ex_ImportCancelled); // Hide progress section

    extensionsBulkUpload.$progressSection.hide(); // Show import buttons again

    extensionsBulkUpload.$confirmImport.show();
    extensionsBulkUpload.$cancelImport.show();
    extensionsBulkUpload.$importStrategy.closest('.field').show(); // Unsubscribe from EventBus

    if (extensionsBulkUpload.importChannelId && extensionsBulkUpload.importProgressCallback) {
      EventBus.unsubscribe(extensionsBulkUpload.importChannelId, extensionsBulkUpload.importProgressCallback);
    } // Clear job data


    extensionsBulkUpload.currentJobId = null;
    extensionsBulkUpload.importChannelId = null;
    extensionsBulkUpload.importProgressCallback = null;
    extensionsBulkUpload.$cancelImportProcess.removeClass('loading disabled');
  },

  /**
   * Start new import
   */
  startNewImport: function startNewImport() {
    // Clear any existing error messages
    $('.ui.message.ajax').remove();
    extensionsBulkUpload.$resultsSection.hide();
    extensionsBulkUpload.$progressSection.hide();
    extensionsBulkUpload.$previewSection.hide();
    extensionsBulkUpload.$uploadSegment.show();
    extensionsBulkUpload.uploadId = null;
    extensionsBulkUpload.uploadedFilePath = null;
    extensionsBulkUpload.uploadedFileId = null;
    extensionsBulkUpload.currentJobId = null;
    extensionsBulkUpload.importChannelId = null;
    extensionsBulkUpload.importProgressCallback = null; // Reset upload state handled by FilesAPI
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
      extensionsBulkUpload.updateProgressText(data.log);
    }
  },

  /**
   * Handle import completion
   */
  onImportComplete: function onImportComplete(data) {
    // Keep table visible, hide progress bar, show results section
    extensionsBulkUpload.$importProgress.hide();
    extensionsBulkUpload.$progressLabel.hide();
    extensionsBulkUpload.$cancelImportProcess.hide();
    extensionsBulkUpload.$resultsSection.show(); // Show import buttons again for new import

    extensionsBulkUpload.$confirmImport.show();
    extensionsBulkUpload.$cancelImport.show();
    extensionsBulkUpload.$importStrategy.closest('.field').show(); // Show result message

    var messageClass = data.success ? 'positive' : 'negative';
    var messageIcon = data.success ? 'check circle' : 'times circle';
    var messageText = '';

    if (data.stats) {
      messageText = globalTranslate.ex_ImportSuccess.replace('{created}', data.stats.created || 0).replace('{skipped}', data.stats.skipped || 0).replace('{failed}', data.stats.failed || 0);
    } else if (data.error) {
      messageText = globalTranslate.ex_ImportFailed.replace('{error}', data.error);
    }

    extensionsBulkUpload.$resultMessage.html("\n            <div class=\"".concat(messageClass, " message\">\n                <i class=\"").concat(messageIcon, " icon\"></i>\n                <div class=\"content\">\n                    <div class=\"header\">").concat(data.success ? globalTranslate.ex_ImportComplete : globalTranslate.ex_ImportFailed, "</div>\n                    <p>").concat(SecurityUtils.escapeHtml(messageText), "</p>\n                </div>\n            </div>\n        "));
  },

  /**
   * Update progress text
   */
  updateProgressText: function updateProgressText(message) {
    extensionsBulkUpload.$progressText.text(message);
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
  },

  /**
   * Reset table rows to processing status (only for valid records that will be processed)
   */
  resetTableToProcessing: function resetTableToProcessing() {
    extensionsBulkUpload.$previewTable.find('tbody tr').each(function () {
      var $row = $(this);
      var $statusCell = $row.find('.status-cell');
      var statusText = $statusCell.find('.status-text').text().trim(); // Only reset rows that have 'valid' status from preview
      // Leave duplicates, exists, and error rows as they are

      if ($row.hasClass('positive') && statusText === globalTranslate.ex_ImportStatusValid) {
        // Update to processing status only for valid records
        $row.removeClass('positive negative warning').addClass('active');
        $statusCell.html('<i class="spinner loading icon"></i> <span class="status-text">' + globalTranslate.ex_ImportStatusProcessing + '</span>');
      }
    });
  },

  /**
   * Sort table by status column after import completion
   */
  sortTableByStatus: function sortTableByStatus() {
    var $statusHeader = extensionsBulkUpload.$previewTable.find('th').eq(4); // Status column (index 4)

    var $allTh = extensionsBulkUpload.$previewTable.find('th');
    var $tbody = extensionsBulkUpload.$previewTable.find('tbody');
    var $rows = $tbody.find('tr'); // Remove sorting classes from other headers

    $allTh.removeClass('sorted ascending descending'); // Set status column as sorted ascending (show processed results first)

    $statusHeader.addClass('sorted ascending'); // Sort rows by status priority

    var sortedRows = $rows.sort(function (a, b) {
      var aText = $(a).find('td').eq(4).text().trim();
      var bText = $(b).find('td').eq(4).text().trim(); // Status order priority (created/updated first, then skipped, then no changes, then errors)

      var statusOrder = {
        'Создан': 1,
        'Обновлен': 2,
        'Пропущен': 3,
        'Уже существует': 4,
        'Без изменений': 5,
        'Ошибка': 6,
        'Обрабатывается': 7 // Should not appear after completion, but just in case

      }; // Extract status text (remove icon part)

      var aStatus = statusOrder[aText.split(' ').slice(1).join(' ')] || 999;
      var bStatus = statusOrder[bText.split(' ').slice(1).join(' ')] || 999;
      return aStatus - bStatus; // Ascending order
    }); // Update table with sorted rows

    $tbody.empty().append(sortedRows);
  },

  /**
   * Update individual row status
   * @param {string} number - Extension number
   * @param {string} status - New status (created, updated, skipped, error)
   * @param {string} message - Status message
   */
  updateRowStatus: function updateRowStatus(number, status, message) {
    // The number comes from the CSV: compare the attribute instead of building a selector from it,
    // a quote or a bracket in the value made jQuery throw (issue #1349)
    var wanted = String(number !== null && number !== void 0 ? number : '');
    var $row = extensionsBulkUpload.$previewTable.find('tbody tr').filter(function (index, tr) {
      return tr.getAttribute('data-number') === wanted;
    });

    if ($row.length === 0) {
      return;
    }

    var $statusCell = $row.find('.status-cell');
    var statusClass, statusIcon, statusText;

    switch (status) {
      case 'created':
      case 'updated':
        statusClass = 'positive';
        statusIcon = 'check circle green';
        statusText = status === 'created' ? globalTranslate.ex_ImportStatusCreated : globalTranslate.ex_ImportStatusUpdated;
        break;

      case 'skipped':
      case 'exists':
        // Handle "exists" status from backend
        statusClass = 'warning';
        statusIcon = 'minus circle yellow';
        statusText = status === 'exists' ? globalTranslate.ex_ImportStatusExists : globalTranslate.ex_ImportStatusSkipped;
        break;

      case 'no_changes':
        statusClass = 'disabled';
        statusIcon = 'minus circle grey';
        statusText = globalTranslate.ex_ImportStatusNoChanges;
        break;

      case 'error':
        statusClass = 'negative';
        statusIcon = 'times circle red';
        statusText = globalTranslate.ex_ImportStatusError;
        break;

      default:
        statusClass = 'active';
        statusIcon = 'spinner loading';
        statusText = globalTranslate.ex_ImportStatusProcessing;
    } // Update row class and status


    $row.removeClass('positive negative warning active disabled').addClass(statusClass); // Surface backend error message inline (issue #996) — escape via jQuery .text() to prevent XSS.

    var detailHtml = '';

    if (status === 'error' && message) {
      var safeMessage = $('<div>').text(message).html();
      detailHtml = " <span class=\"status-detail\">\u2014 ".concat(safeMessage, "</span>");
      $statusCell.attr('title', message);
    } else {
      $statusCell.removeAttr('title');
    }

    $statusCell.html("<i class=\"".concat(statusIcon, " icon\"></i> <span class=\"status-text\">").concat(statusText, "</span>").concat(detailHtml)); // Note: Removed automatic scrolling to prevent page jumping during processing
  }
}; // Initialize when document is ready

$(document).ready(function () {
  extensionsBulkUpload.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtYnVsay11cGxvYWQuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0J1bGtVcGxvYWQiLCIkdXBsb2FkQnV0dG9uIiwiJHVwbG9hZFNlZ21lbnQiLCIkcHJldmlld1NlY3Rpb24iLCIkcHJvZ3Jlc3NTZWN0aW9uIiwiJHJlc3VsdHNTZWN0aW9uIiwiJHByZXZpZXdUYWJsZSIsIiRpbXBvcnRQcm9ncmVzcyIsIiRwcm9ncmVzc0xhYmVsIiwiJHByb2dyZXNzVGV4dCIsIiRyZXN1bHRNZXNzYWdlIiwiJHRvdGFsQ291bnQiLCIkdmFsaWRDb3VudCIsIiRkdXBsaWNhdGVDb3VudCIsIiRlcnJvckNvdW50IiwiJGNvbmZpcm1JbXBvcnQiLCIkY2FuY2VsSW1wb3J0IiwiJGNhbmNlbEltcG9ydFByb2Nlc3MiLCIkbmV3SW1wb3J0IiwiJGltcG9ydENvbnRyb2xzIiwiJGV4cG9ydEJ1dHRvbiIsIiRkb3dubG9hZFRlbXBsYXRlIiwiJGltcG9ydFN0cmF0ZWd5IiwiJGV4cG9ydEZvcm1hdCIsIiR0ZW1wbGF0ZUZvcm1hdCIsIiRudW1iZXJGcm9tIiwiJG51bWJlclRvIiwidXBsb2FkSWQiLCJ1cGxvYWRlZEZpbGVQYXRoIiwidXBsb2FkZWRGaWxlSWQiLCJjdXJyZW50Sm9iSWQiLCJpbXBvcnRDaGFubmVsSWQiLCJpbXBvcnRQcm9ncmVzc0NhbGxiYWNrIiwicHJldmlld0RhdGFUYWJsZSIsImluaXRpYWxpemUiLCIkIiwidGFiIiwib25WaXNpYmxlIiwicmVtb3ZlIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInZhbHVlIiwidXBkYXRlRm9ybWF0RGVzY3JpcHRpb24iLCJpbml0aWFsaXplRmlsZVVwbG9hZCIsIm9uIiwiY29uZmlybUltcG9ydCIsImNhbmNlbEltcG9ydCIsImNhbmNlbEltcG9ydFByb2Nlc3MiLCJzdGFydE5ld0ltcG9ydCIsImV4cG9ydEVtcGxveWVlcyIsImRvd25sb2FkVGVtcGxhdGUiLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsIm9uSW1wb3J0UHJvZ3Jlc3MiLCJvbkltcG9ydENvbXBsZXRlIiwid2luZG93IiwibG9jYXRpb24iLCJoYXNoIiwic3Vic3RyaW5nIiwiZmlsdGVyIiwiaW5kZXgiLCJpdGVtIiwiZ2V0QXR0cmlidXRlIiwiY2xpY2siLCJsZW5ndGgiLCJjb25zb2xlIiwiZXJyb3IiLCJ1cGxvYWRCdXR0b24iLCJ1cGxvYWRTZWdtZW50IiwiRmlsZXNBUEkiLCJhdHRhY2hUb0J0biIsImNiVXBsb2FkUmVzdW1hYmxlIiwiYWN0aW9uIiwicGFyYW1zIiwiYWRkQ2xhc3MiLCJyZXN1bHQiLCJQYnhBcGkiLCJ0cnlQYXJzZUpTT04iLCJyZXNwb25zZSIsImRhdGEiLCJ1cGxvYWRfaWQiLCJmaWxlbmFtZSIsImNoZWNrU3RhdHVzRmlsZU1lcmdpbmciLCJoYXNEYXRhIiwiaGFzVXBsb2FkSWQiLCJlcnJvck1lc3NhZ2VzIiwibWVzc2FnZXMiLCJyZXN1bHRSZXN1bHQiLCJyYXdSZXNwb25zZSIsImVycm9yTWVzc2FnZSIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X0ZpbGVVcGxvYWRFcnJvciIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJyZW1vdmVDbGFzcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZmlsZU5hbWUiLCJmaWxlIiwibmFtZSIsIm1lc3NhZ2UiLCJ1bmRlZmluZWQiLCJqc29uIiwiSlNPTiIsInBhcnNlIiwiZmlsZVBhdGgiLCJGaWxlVXBsb2FkRXZlbnRIYW5kbGVyIiwib25NZXJnZVN0YXJ0ZWQiLCJvbk1lcmdlUHJvZ3Jlc3MiLCJvbk1lcmdlQ29tcGxldGUiLCJwcmV2aWV3SW1wb3J0Iiwib25FcnJvciIsImRfc3RhdHVzIiwic3RyYXRlZ3kiLCJFbXBsb3llZXNBUEkiLCJpbXBvcnRDU1YiLCJzaG93UHJldmlldyIsInRleHQiLCJ0b3RhbCIsInZhbGlkIiwiZHVwbGljYXRlcyIsImVycm9ycyIsImRlc3Ryb3kiLCIkdGJvZHkiLCJmaW5kIiwiZW1wdHkiLCJwcmV2aWV3IiwiZm9yRWFjaCIsInJvdyIsInN0YXR1c0NsYXNzIiwic3RhdHVzIiwic3RhdHVzSWNvbiIsInN0YXR1c1RleHQiLCJleF9JbXBvcnRTdGF0dXNWYWxpZCIsImV4X0ltcG9ydFN0YXR1c0R1cGxpY2F0ZSIsImV4X0ltcG9ydFN0YXR1c0V4aXN0cyIsImV4X0ltcG9ydFN0YXR1c0Vycm9yIiwiZXhfSW1wb3J0U3RhdHVzSW52YWxpZCIsIiRyb3ciLCJhdHRyIiwibnVtYmVyIiwidXNlcl91c2VybmFtZSIsIm1vYmlsZV9udW1iZXIiLCJ1c2VyX2VtYWlsIiwiYXBwZW5kVG8iLCIkc3RhdHVzQ2VsbCIsImFwcGVuZCIsImVhY2giLCIkdGgiLCIkYWxsVGgiLCIkcm93cyIsImlzQXNjZW5kaW5nIiwiaGFzQ2xhc3MiLCJzb3J0ZWRSb3dzIiwic29ydCIsImEiLCJiIiwiYVRleHQiLCJlcSIsInRyaW0iLCJiVGV4dCIsInN0YXR1c09yZGVyIiwiYVN0YXR1cyIsInNwbGl0Iiwic2xpY2UiLCJiU3RhdHVzIiwib2ZmIiwiaGlkZSIsInNob3ciLCJjbG9zZXN0Iiwiam9iSWQiLCJjaGFubmVsSWQiLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJleF9JbXBvcnRTdGFydGVkIiwic3Vic2NyaWJlVG9JbXBvcnRQcm9ncmVzcyIsInNldFRpbWVvdXQiLCJyZXNldFRhYmxlVG9Qcm9jZXNzaW5nIiwidHlwZSIsImhhbmRsZUltcG9ydFN0YXJ0ZWQiLCJoYW5kbGVJbXBvcnRQcm9ncmVzcyIsImhhbmRsZUltcG9ydENvbXBsZXRlZCIsIndhcm4iLCJ1cGRhdGVQcm9ncmVzc1RleHQiLCJleF9SZWNvcmRzIiwiTWF0aCIsInJvdW5kIiwicHJvY2Vzc2VkIiwiY3VycmVudFJlY29yZCIsInVwZGF0ZVJvd1N0YXR1cyIsInBhcnRzIiwiY3JlYXRlZCIsInB1c2giLCJleF9DcmVhdGVkIiwidXBkYXRlZCIsImV4X1VwZGF0ZWQiLCJza2lwcGVkIiwiZXhfU2tpcHBlZCIsImV4X0Vycm9ycyIsImV4X0ltcG9ydFByb2dyZXNzIiwiZXhfSW1wb3J0Q29tcGxldGVkIiwidW5zdWJzY3JpYmUiLCJzb3J0VGFibGVCeVN0YXR1cyIsImV4X0ltcG9ydENhbmNlbGxlZCIsImxvZyIsIm1lc3NhZ2VDbGFzcyIsInN1Y2Nlc3MiLCJtZXNzYWdlSWNvbiIsIm1lc3NhZ2VUZXh0Iiwic3RhdHMiLCJleF9JbXBvcnRTdWNjZXNzIiwicmVwbGFjZSIsImZhaWxlZCIsImV4X0ltcG9ydEZhaWxlZCIsImh0bWwiLCJleF9JbXBvcnRDb21wbGV0ZSIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwiZm9ybWF0IiwibnVtYmVyRnJvbSIsInZhbCIsIm51bWJlclRvIiwibnVtYmVyX2Zyb20iLCJudW1iZXJfdG8iLCJleHBvcnRDU1YiLCJocmVmIiwiZ2V0VGVtcGxhdGUiLCJnZXRGb3JtYXRGaWVsZHMiLCJmb3JtYXRzIiwibWluaW1hbCIsImV4X0ZpZWxkTnVtYmVyX0hlbHAiLCJleF9GaWVsZFVzZXJuYW1lX0hlbHAiLCJleF9GaWVsZEVtYWlsX0hlbHAiLCJleF9GaWVsZE1vYmlsZV9IZWxwIiwiZXhfRmllbGRQYXNzd29yZF9IZWxwIiwiZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAiLCJleF9GaWVsZEZvcndhcmRpbmdfSGVscCIsInN0YW5kYXJkIiwiZXhfRmllbGRNb2JpbGVEaWFsc3RyaW5nX0hlbHAiLCJleF9GaWVsZERUTUZNb2RlX0hlbHAiLCJleF9GaWVsZFRyYW5zcG9ydF9IZWxwIiwiZXhfRmllbGRSZWNvcmRpbmdfSGVscCIsImV4X0ZpZWxkRm9yd2FyZGluZ0J1c3lfSGVscCIsImV4X0ZpZWxkRm9yd2FyZGluZ1VuYXZhaWxhYmxlX0hlbHAiLCJmdWxsIiwiZXhfRmllbGRBdmF0YXJfSGVscCIsImV4X0ZpZWxkTWFudWFsQXR0cmlidXRlc19IZWxwIiwiZmllbGRzIiwiJGNvbnRhaW5lciIsIm1hcCIsImZpZWxkIiwiZXhfSW1wb3J0U3RhdHVzUHJvY2Vzc2luZyIsIiRzdGF0dXNIZWFkZXIiLCJ3YW50ZWQiLCJTdHJpbmciLCJ0ciIsImV4X0ltcG9ydFN0YXR1c0NyZWF0ZWQiLCJleF9JbXBvcnRTdGF0dXNVcGRhdGVkIiwiZXhfSW1wb3J0U3RhdHVzU2tpcHBlZCIsImV4X0ltcG9ydFN0YXR1c05vQ2hhbmdlcyIsImRldGFpbEh0bWwiLCJzYWZlTWVzc2FnZSIsInJlbW92ZUF0dHIiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxvQkFBb0IsR0FBRztBQUN6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsSUFMVTtBQU16QkMsRUFBQUEsY0FBYyxFQUFFLElBTlM7QUFPekJDLEVBQUFBLGVBQWUsRUFBRSxJQVBRO0FBUXpCQyxFQUFBQSxnQkFBZ0IsRUFBRSxJQVJPO0FBU3pCQyxFQUFBQSxlQUFlLEVBQUUsSUFUUTtBQVV6QkMsRUFBQUEsYUFBYSxFQUFFLElBVlU7QUFXekJDLEVBQUFBLGVBQWUsRUFBRSxJQVhRO0FBWXpCQyxFQUFBQSxjQUFjLEVBQUUsSUFaUztBQWF6QkMsRUFBQUEsYUFBYSxFQUFFLElBYlU7QUFjekJDLEVBQUFBLGNBQWMsRUFBRSxJQWRTO0FBZXpCQyxFQUFBQSxXQUFXLEVBQUUsSUFmWTtBQWdCekJDLEVBQUFBLFdBQVcsRUFBRSxJQWhCWTtBQWlCekJDLEVBQUFBLGVBQWUsRUFBRSxJQWpCUTtBQWtCekJDLEVBQUFBLFdBQVcsRUFBRSxJQWxCWTtBQW1CekJDLEVBQUFBLGNBQWMsRUFBRSxJQW5CUztBQW9CekJDLEVBQUFBLGFBQWEsRUFBRSxJQXBCVTtBQXFCekJDLEVBQUFBLG9CQUFvQixFQUFFLElBckJHO0FBc0J6QkMsRUFBQUEsVUFBVSxFQUFFLElBdEJhO0FBdUJ6QkMsRUFBQUEsZUFBZSxFQUFFLElB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S0FBSyxPQUFYLElBQXNCOUIsT0FBMUIsRUFBbUM7QUFDL0IsVUFBTWlLLFdBQVcsR0FBR25PLENBQUMsQ0FBQyxPQUFELENBQUQsQ0FBV21GLElBQVgsQ0FBZ0JqQixPQUFoQixFQUF5QmtILElBQXpCLEVBQXBCO0FBQ0E4QyxNQUFBQSxVQUFVLG1EQUFxQ0MsV0FBckMsWUFBVjtBQUNBcEgsTUFBQUEsV0FBVyxDQUFDTixJQUFaLENBQWlCLE9BQWpCLEVBQTBCdkMsT0FBMUI7QUFDSCxLQUpELE1BSU87QUFDSDZDLE1BQUFBLFdBQVcsQ0FBQ3FILFVBQVosQ0FBdUIsT0FBdkI7QUFDSDs7QUFDRHJILElBQUFBLFdBQVcsQ0FBQ3FFLElBQVosc0JBQThCbkYsVUFBOUIsc0RBQWlGQyxVQUFqRixvQkFBcUdnSSxVQUFyRyxHQXZEcUMsQ0F5RHJDO0FBQ0g7QUFqK0J3QixDQUE3QixDLENBbytCQTs7QUFDQWxPLENBQUMsQ0FBQ3FPLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ6USxFQUFBQSxvQkFBb0IsQ0FBQ2tDLFVBQXJCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBQYnhBcGksIEVtcGxveWVlc0FQSSwgRXZlbnRCdXMsIFNlbWFudGljTG9jYWxpemF0aW9uLCBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLCBGaWxlc0FQSSAqL1xuXG4vKipcbiAqIFRoZSBleHRlbnNpb25zQnVsa1VwbG9hZCBtb2R1bGUgaGFuZGxlcyBDU1YgaW1wb3J0L2V4cG9ydCBmdW5jdGlvbmFsaXR5IGZvciBlbXBsb3llZXNcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uc0J1bGtVcGxvYWRcbiAqL1xuY29uc3QgZXh0ZW5zaW9uc0J1bGtVcGxvYWQgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IGVsZW1lbnRzLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKi9cbiAgICAkdXBsb2FkQnV0dG9uOiBudWxsLFxuICAgICR1cGxvYWRTZWdtZW50OiBudWxsLFxuICAgICRwcmV2aWV3U2VjdGlvbjogbnVsbCxcbiAgICAkcHJvZ3Jlc3NTZWN0aW9uOiBudWxsLFxuICAgICRyZXN1bHRzU2VjdGlvbjogbnVsbCxcbiAgICAkcHJldmlld1RhYmxlOiBudWxsLFxuICAgICRpbXBvcnRQcm9ncmVzczogbnVsbCxcbiAgICAkcHJvZ3Jlc3NMYWJlbDogbnVsbCxcbiAgICAkcHJvZ3Jlc3NUZXh0OiBudWxsLFxuICAgICRyZXN1bHRNZXNzYWdlOiBudWxsLFxuICAgICR0b3RhbENvdW50OiBudWxsLFxuICAgICR2YWxpZENvdW50OiBudWxsLFxuICAgICRkdXBsaWNhdGVDb3VudDogbnVsbCxcbiAgICAkZXJyb3JDb3VudDogbnVsbCxcbiAgICAkY29uZmlybUltcG9ydDogbnVsbCxcbiAgICAkY2FuY2VsSW1wb3J0OiBudWxsLFxuICAgICRjYW5jZWxJbXBvcnRQcm9jZXNzOiBudWxsLFxuICAgICRuZXdJbXBvcnQ6IG51bGwsXG4gICAgJGltcG9ydENvbnRyb2xzOiBudWxsLFxuICAgICRleHBvcnRCdXR0b246IG51bGwsXG4gICAgJGRvd25sb2FkVGVtcGxhdGU6IG51bGwsXG4gICAgJGltcG9ydFN0cmF0ZWd5OiBudWxsLFxuICAgICRleHBvcnRGb3JtYXQ6IG51bGwsXG4gICAgJHRlbXBsYXRlRm9ybWF0OiBudWxsLFxuICAgICRudW1iZXJGcm9tOiBudWxsLFxuICAgICRudW1iZXJUbzogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdXBsb2FkIGRhdGFcbiAgICAgKi9cbiAgICB1cGxvYWRJZDogbnVsbCxcbiAgICB1cGxvYWRlZEZpbGVQYXRoOiBudWxsLFxuICAgIHVwbG9hZGVkRmlsZUlkOiBudWxsLFxuICAgIGN1cnJlbnRKb2JJZDogbnVsbCxcbiAgICBpbXBvcnRDaGFubmVsSWQ6IG51bGwsXG4gICAgaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjazogbnVsbCxcbiAgICBwcmV2aWV3RGF0YVRhYmxlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gUmVzb2x2ZSBqUXVlcnkgd3JhcHBlcnMgaGVyZSDigJQgYXQgbW9kdWxlLWxvYWQgdGltZSBqUXVlcnkgbWF5XG4gICAgICAgIC8vIG5vdCB5ZXQgYmUgZGVmaW5lZCAoU2VudHJ5IE1JS09QQlgtTUc5IHBhdHRlcm4pLlxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkQnV0dG9uID0gJCgnI3VwbG9hZC1idXR0b24nKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQgPSAkKCcjdXBsb2FkLXNlZ21lbnQnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdTZWN0aW9uID0gJCgnI3ByZXZpZXctc2VjdGlvbicpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NTZWN0aW9uID0gJCgnI3Byb2dyZXNzLXNlY3Rpb24nKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdHNTZWN0aW9uID0gJCgnI3Jlc3VsdHMtc2VjdGlvbicpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlID0gJCgnI3ByZXZpZXctdGFibGUnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFByb2dyZXNzID0gJCgnI2ltcG9ydC1wcm9ncmVzcycpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NMYWJlbCA9ICQoJyNwcm9ncmVzcy1sYWJlbCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NUZXh0ID0gJCgnI3Byb2dyZXNzLXRleHQnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdE1lc3NhZ2UgPSAkKCcjcmVzdWx0LW1lc3NhZ2UnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHRvdGFsQ291bnQgPSAkKCcjdG90YWwtY291bnQnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHZhbGlkQ291bnQgPSAkKCcjdmFsaWQtY291bnQnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGR1cGxpY2F0ZUNvdW50ID0gJCgnI2R1cGxpY2F0ZS1jb3VudCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXJyb3JDb3VudCA9ICQoJyNlcnJvci1jb3VudCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY29uZmlybUltcG9ydCA9ICQoJyNjb25maXJtLWltcG9ydCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY2FuY2VsSW1wb3J0ID0gJCgnI2NhbmNlbC1pbXBvcnQnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3MgPSAkKCcjY2FuY2VsLWltcG9ydC1wcm9jZXNzJyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRuZXdJbXBvcnQgPSAkKCcjbmV3LWltcG9ydCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0Q29udHJvbHMgPSAkKCcjaW1wb3J0LWNvbnRyb2xzJyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRleHBvcnRCdXR0b24gPSAkKCcjZXhwb3J0LWJ1dHRvbicpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZG93bmxvYWRUZW1wbGF0ZSA9ICQoJyNkb3dubG9hZC10ZW1wbGF0ZScpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kgPSAkKCcjaW1wb3J0LXN0cmF0ZWd5Jyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRleHBvcnRGb3JtYXQgPSAkKCcjZXhwb3J0LWZvcm1hdCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdGVtcGxhdGVGb3JtYXQgPSAkKCcjdGVtcGxhdGUtZm9ybWF0Jyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJGcm9tID0gJCgnI251bWJlci1mcm9tJyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJUbyA9ICQoJyNudW1iZXItdG8nKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnMgd2l0aCBldmVudCBoYW5kbGVyIHRvIGNsZWFyIG1lc3NhZ2VzXG4gICAgICAgICQoJyNidWxrLXRhYnMgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgZXJyb3IgbWVzc2FnZXMgd2hlbiBzd2l0Y2hpbmcgdGFic1xuICAgICAgICAgICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFN0cmF0ZWd5LmRyb3Bkb3duKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRleHBvcnRGb3JtYXQuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlRm9ybWF0RGVzY3JpcHRpb24oJ2V4cG9ydCcsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR0ZW1wbGF0ZUZvcm1hdC5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVGb3JtYXREZXNjcmlwdGlvbigndGVtcGxhdGUnLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBpbml0aWFsIGZvcm1hdCBkZXNjcmlwdGlvbnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlRm9ybWF0RGVzY3JpcHRpb24oJ2V4cG9ydCcsICdzdGFuZGFyZCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVGb3JtYXREZXNjcmlwdGlvbigndGVtcGxhdGUnLCAnc3RhbmRhcmQnKTtcblxuICAgICAgICAvLyBTZXQgdXAgZmlsZSB1cGxvYWRcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW5pdGlhbGl6ZUZpbGVVcGxvYWQoKTtcblxuICAgICAgICAvLyBTZXQgdXAgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY29uZmlybUltcG9ydCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjYW5jZWxJbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY2FuY2VsSW1wb3J0KTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3Mub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY2FuY2VsSW1wb3J0UHJvY2Vzcyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRuZXdJbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc3RhcnROZXdJbXBvcnQpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXhwb3J0QnV0dG9uLm9uKCdjbGljaycsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmV4cG9ydEVtcGxveWVlcyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkb3dubG9hZFRlbXBsYXRlLm9uKCdjbGljaycsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmRvd25sb2FkVGVtcGxhdGUpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgaW1wb3J0IHByb2dyZXNzXG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnaW1wb3J0X3Byb2dyZXNzJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQub25JbXBvcnRQcm9ncmVzcyk7XG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnaW1wb3J0X2NvbXBsZXRlJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQub25JbXBvcnRDb21wbGV0ZSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgVVJMIGhhc2ggdG8gYWN0aXZhdGUgY29ycmVjdCB0YWI7IGNvbXBhcmUgdGhlIGF0dHJpYnV0ZSwgdGhlIGhhc2ggaXMgbm90IHNlbGVjdG9yIHN5bnRheFxuICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAgICAgICAgIGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSk7XG4gICAgICAgICAgICAkKCcjYnVsay10YWJzIC5pdGVtJylcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChpbmRleCwgaXRlbSkgPT4gaXRlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFiJykgPT09IGhhc2gpXG4gICAgICAgICAgICAgICAgLmNsaWNrKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmaWxlIHVwbG9hZCB1c2luZyBGaWxlc0FQSS5hdHRhY2hUb0J0biBmb3IgY29uc2lzdGVudCBiZWhhdmlvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWxlVXBsb2FkKCkge1xuICAgICAgICAvLyBDaGVjayBpZiBlbGVtZW50cyBleGlzdCBiZWZvcmUgaW5pdGlhbGl6aW5nXG4gICAgICAgIGlmICghZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZEJ1dHRvbi5sZW5ndGggfHwgIWV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIFtCdWxrVXBsb2FkXSBVcGxvYWQgZWxlbWVudHMgbm90IGZvdW5kJywge1xuICAgICAgICAgICAgICAgIHVwbG9hZEJ1dHRvbjogZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZEJ1dHRvbi5sZW5ndGgsXG4gICAgICAgICAgICAgICAgdXBsb2FkU2VnbWVudDogZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQubGVuZ3RoXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIFVwbG9hZCBlbGVtZW50cyBub3QgZm91bmQsIHNraXBwaW5nIGZpbGUgdXBsb2FkIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgRmlsZXNBUEkuYXR0YWNoVG9CdG4gZm9yIHVuaWZpZWQgZmlsZSB1cGxvYWQgaGFuZGxpbmdcbiAgICAgICAgLy8gVGhpcyBhdHRhY2hlcyBkaXJlY3RseSB0byB0aGUgYnV0dG9uIGFuZCBoYW5kbGVzIGZpbGUgc2VsZWN0aW9uIGludGVybmFsbHlcbiAgICAgICAgRmlsZXNBUEkuYXR0YWNoVG9CdG4oJ3VwbG9hZC1idXR0b24nLCBbJ2NzdiddLCBleHRlbnNpb25zQnVsa1VwbG9hZC5jYlVwbG9hZFJlc3VtYWJsZSwgbnVsbCwgJ2NzdicpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgZmlsZSB1cGxvYWQgd2l0aCBjaHVua3MgYW5kIG1lcmdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHBlcmZvcm1lZCBkdXJpbmcgdGhlIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHJlbGF0ZWQgdG8gdGhlIHVwbG9hZC5cbiAgICAgKi9cbiAgICBjYlVwbG9hZFJlc3VtYWJsZShhY3Rpb24sIHBhcmFtcykge1xuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAndXBsb2FkU3RhcnQnOlxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdmaWxlU3VjY2Vzcyc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBQYnhBcGkudHJ5UGFyc2VKU09OKHBhcmFtcy5yZXNwb25zZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICE9PSBmYWxzZSAmJiByZXN1bHQuZGF0YSAmJiByZXN1bHQuZGF0YS51cGxvYWRfaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlSWQgPSByZXN1bHQuZGF0YS51cGxvYWRfaWQ7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZVBhdGggPSByZXN1bHQuZGF0YS5maWxlbmFtZTtcblxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIFtCdWxrVXBsb2FkXSBJbnZhbGlkIHJlc3BvbnNlIGZvcm1hdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDogcmVzdWx0LFxuICAgICAgICAgICAgICAgICAgICAgICAgaGFzRGF0YTogcmVzdWx0ID8gISFyZXN1bHQuZGF0YSA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGFzVXBsb2FkSWQ6IHJlc3VsdD8uZGF0YT8udXBsb2FkX2lkIHx8IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlczogcmVzdWx0Py5tZXNzYWdlcyB8fCAnTm8gZXJyb3IgbWVzc2FnZXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0UmVzdWx0OiByZXN1bHQ/LnJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhd1Jlc3BvbnNlOiBwYXJhbXMucmVzcG9uc2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBtb3JlIHNwZWNpZmljIGVycm9yIG1lc3NhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgIGxldCBlcnJvck1lc3NhZ2UgPSBnbG9iYWxUcmFuc2xhdGUuZXhfRmlsZVVwbG9hZEVycm9yO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5tZXNzYWdlcyAmJiByZXN1bHQubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IHJlc3VsdC5tZXNzYWdlcy5lcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ/CfmqggW0J1bGtVcGxvYWRdIFNlcnZlciBlcnJvciBtZXNzYWdlOicsIHJlc3VsdC5tZXNzYWdlcy5lcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ICYmIHJlc3VsdC5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign8J+aqCBbQnVsa1VwbG9hZF0gU2VydmVyIG1lc3NhZ2VzOicsIHJlc3VsdC5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJlc3VsdC5tZXNzYWdlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSByZXN1bHQubWVzc2FnZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmVzdWx0Lm1lc3NhZ2VzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IHJlc3VsdC5tZXNzYWdlcy5qb2luKCcsICcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnZmlsZUVycm9yJzpcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgW0J1bGtVcGxvYWRdIEZpbGUgZXJyb3InLCB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lOiBwYXJhbXMuZmlsZT8uZmlsZU5hbWUgfHwgcGFyYW1zLmZpbGU/Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHBhcmFtcy5tZXNzYWdlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocGFyYW1zLm1lc3NhZ2UgfHwgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpbGVVcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign8J+SpSBbQnVsa1VwbG9hZF0gVXBsb2FkIGVycm9yJywge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBwYXJhbXMubWVzc2FnZSB8fCBwYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgIGZpbGU6IHBhcmFtcy5maWxlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocGFyYW1zLCBnbG9iYWxUcmFuc2xhdGUuZXhfRmlsZVVwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gZmlsZUFkZGVkLCBmaWxlUHJvZ3Jlc3MsIGNvbXBsZXRlOiBub3RoaW5nIHRvIGRvXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgZmlsZSBtZXJnaW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBmaWxlIG1lcmdpbmcgc3RhdHVzIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgUGJ4QXBpLnRyeVBhcnNlSlNPTihyZXNwb25zZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X0ZpbGVVcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG4gICAgICAgIGlmIChqc29uID09PSB1bmRlZmluZWQgfHwganNvbi5kYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuZXhfRmlsZVVwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXBsb2FkSWQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHVwbG9hZCBwcm9ncmVzc1xuICAgICAgICBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLnN1YnNjcmliZSh1cGxvYWRJZCwge1xuICAgICAgICAgICAgb25NZXJnZVN0YXJ0ZWQ6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRmlsZSBtZXJnZSBzdGFydGVkXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlUHJvZ3Jlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGlmIG5lZWRlZFxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZUNvbXBsZXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucHJldmlld0ltcG9ydCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25FcnJvcjogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9GaWxlVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpbW1lZGlhdGUgc3RhdHVzIChzYW1lIGFzIHNvdW5kLWZpbGUtbW9kaWZ5LmpzKVxuICAgICAgICBpZiAoanNvbi5kYXRhLmRfc3RhdHVzID09PSAnVVBMT0FEX0NPTVBMRVRFJyB8fCAhanNvbi5kYXRhLmRfc3RhdHVzKSB7XG4gICAgICAgICAgICAvLyBGaWxlIGlzIGFscmVhZHkgcmVhZHksIHByb2NlZWQgd2l0aCBwcmV2aWV3IGltbWVkaWF0ZWx5XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucHJldmlld0ltcG9ydCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIE5vdGU6IHN0YXJ0TWVyZ2luZ0NoZWNrV29ya2VyKCkgbWV0aG9kIHJlbW92ZWQgLSBub3cgdXNpbmcgRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG5cbiAgICAvKipcbiAgICAgKiBQcmV2aWV3IGltcG9ydCAtIHZhbGlkYXRlIENTViBhbmQgc2hvdyBwcmV2aWV3XG4gICAgICovXG4gICAgcHJldmlld0ltcG9ydCgpIHtcbiAgICAgICAgY29uc3Qgc3RyYXRlZ3kgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gVXNlIHVwbG9hZGVkRmlsZUlkIGZvciBBUEkgY2FsbCwgYXMgdGhlIGZpbGUgaXMgbm93IGZ1bGx5IG1lcmdlZFxuICAgICAgICBFbXBsb3llZXNBUEkuaW1wb3J0Q1NWKFxuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlSWQsXG4gICAgICAgICAgICAncHJldmlldycsXG4gICAgICAgICAgICBzdHJhdGVneSxcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQmFja2VuZCByZXR1cm5zIHVwbG9hZF9pZCwgbm90IHVwbG9hZElkXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZElkID0gcmVzcG9uc2UuZGF0YS51cGxvYWRfaWQgfHwgcmVzcG9uc2UuZGF0YS51cGxvYWRJZDtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc2hvd1ByZXZpZXcocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgcHJldmlldyBvZiBDU1YgZGF0YVxuICAgICAqL1xuICAgIHNob3dQcmV2aWV3KGRhdGEpIHtcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRpc3RpY3NcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHRvdGFsQ291bnQudGV4dChkYXRhLnRvdGFsIHx8IDApO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdmFsaWRDb3VudC50ZXh0KGRhdGEudmFsaWQgfHwgMCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkdXBsaWNhdGVDb3VudC50ZXh0KGRhdGEuZHVwbGljYXRlcyB8fCAwKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGVycm9yQ291bnQudGV4dChkYXRhLmVycm9ycyB8fCAwKTtcblxuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIERhdGFUYWJsZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUuZGVzdHJveSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgYW5kIHBvcHVsYXRlIHByZXZpZXcgdGFibGVcbiAgICAgICAgY29uc3QgJHRib2R5ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5maW5kKCd0Ym9keScpO1xuICAgICAgICAkdGJvZHkuZW1wdHkoKTtcblxuICAgICAgICBpZiAoZGF0YS5wcmV2aWV3ICYmIGRhdGEucHJldmlldy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBkYXRhLnByZXZpZXcuZm9yRWFjaCgocm93KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSByb3cuc3RhdHVzID09PSAndmFsaWQnID8gJ3Bvc2l0aXZlJyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5zdGF0dXMgPT09ICdkdXBsaWNhdGUnIHx8IHJvdy5zdGF0dXMgPT09ICdleGlzdHMnID8gJ3dhcm5pbmcnIDogJ25lZ2F0aXZlJztcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNJY29uID0gcm93LnN0YXR1cyA9PT0gJ3ZhbGlkJyA/ICdjaGVjayBjaXJjbGUnIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3cuc3RhdHVzID09PSAnZHVwbGljYXRlJyB8fCByb3cuc3RhdHVzID09PSAnZXhpc3RzJyA/ICdleGNsYW1hdGlvbiB0cmlhbmdsZScgOiAndGltZXMgY2lyY2xlJztcblxuICAgICAgICAgICAgICAgIC8vIFRyYW5zbGF0ZSBzdGF0dXMgdGV4dFxuICAgICAgICAgICAgICAgIGxldCBzdGF0dXNUZXh0ID0gcm93LnN0YXR1cztcbiAgICAgICAgICAgICAgICBzd2l0Y2gocm93LnN0YXR1cykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2YWxpZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c1ZhbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2R1cGxpY2F0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c0R1cGxpY2F0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdleGlzdHMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNFeGlzdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNFcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnZhbGlkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c1RleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzSW52YWxpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENTViB2YWx1ZXMgYXJlIGRhdGEsIG5vdCBtYXJrdXA6IHNldCB0aGVtIGFzIHRleHQgYW5kIGF0dHJpYnV0ZXMgKGlzc3VlICMxMzQ5KVxuICAgICAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKCc8dHI+JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKHN0YXR1c0NsYXNzKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1yb3cnLCByb3cucm93KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1udW1iZXInLCByb3cubnVtYmVyIHx8ICcnKTtcbiAgICAgICAgICAgICAgICBbcm93Lm51bWJlciwgcm93LnVzZXJfdXNlcm5hbWUsIHJvdy5tb2JpbGVfbnVtYmVyLCByb3cudXNlcl9lbWFpbF0uZm9yRWFjaCgodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgnPHRkPicpLnRleHQodmFsdWUgfHwgJycpLmFwcGVuZFRvKCRyb3cpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRzdGF0dXNDZWxsID0gJCgnPHRkPicpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc3RhdHVzLWNlbGwnKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCQoJzxpPicpLmFkZENsYXNzKGAke3N0YXR1c0ljb259IGljb25gKSwgJyAnLCAkKCc8c3Bhbj4nKS5hZGRDbGFzcygnc3RhdHVzLXRleHQnKS50ZXh0KHN0YXR1c1RleHQpKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kVG8oJHJvdyk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB3aHkgdGhlIHJvdyBpcyByZWplY3RlZCAobWlzc2luZyBmaWVsZHMsIGEgcm93IHRoZSBkZWxpbWl0ZXIgZGlkIG5vdCBzcGxpdClcbiAgICAgICAgICAgICAgICBpZiAocm93LnN0YXR1cyA9PT0gJ2Vycm9yJyAmJiByb3cubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbFxuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3RpdGxlJywgcm93Lm1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCcgJywgJCgnPHNwYW4+JykuYWRkQ2xhc3MoJ3N0YXR1cy1kZXRhaWwnKS50ZXh0KGDigJQgJHtyb3cubWVzc2FnZX1gKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICR0Ym9keS5hcHBlbmQoJHJvdyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSBzaW1wbGUgU2VtYW50aWMgVUkgdGFibGUgaW5zdGVhZCBvZiBEYXRhVGFibGVzIHRvIGF2b2lkIGhlYWRlci9ib2R5IHNlcGFyYXRpb24gaXNzdWVzXG4gICAgICAgIC8vIEFkZCBDU1MgY2xhc3MgdG8gcHJldmlldyB0YWJsZSBmb3Igc3R5bGluZ1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLmFkZENsYXNzKCdwcmV2aWV3LXRhYmxlJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSB0YWJsZSBzb3J0aW5nIG1hbnVhbGx5IGlmIG5lZWRlZFxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLmZpbmQoJ3RoJykuZWFjaChmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAgICAgY29uc3QgJHRoID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gNCkgeyAvLyBTdGF0dXMgY29sdW1uIC0gbWFrZSBpdCBzb3J0YWJsZSAobm93IGF0IGluZGV4IDQpXG4gICAgICAgICAgICAgICAgJHRoLmFkZENsYXNzKCdzb3J0ZWQgYXNjZW5kaW5nJyk7IC8vIFNldCBpbml0aWFsIHNvcnRcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHRoLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRhbGxUaCA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGgnKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGJvZHkgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLmZpbmQoJ3Rib2R5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHJvd3MgPSAkdGJvZHkuZmluZCgndHInKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBzb3J0aW5nIGNsYXNzZXMgZnJvbSBvdGhlciBoZWFkZXJzXG4gICAgICAgICAgICAgICAgJGFsbFRoLnJlbW92ZUNsYXNzKCdzb3J0ZWQgYXNjZW5kaW5nIGRlc2NlbmRpbmcnKTtcblxuICAgICAgICAgICAgICAgIC8vIERldGVybWluZSBzb3J0IGRpcmVjdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IGlzQXNjZW5kaW5nID0gISR0aC5oYXNDbGFzcygnc29ydGVkJykgfHwgJHRoLmhhc0NsYXNzKCdkZXNjZW5kaW5nJyk7XG4gICAgICAgICAgICAgICAgJHRoLmFkZENsYXNzKGlzQXNjZW5kaW5nID8gJ3NvcnRlZCBhc2NlbmRpbmcnIDogJ3NvcnRlZCBkZXNjZW5kaW5nJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaW1wbGUgc29ydCBpbXBsZW1lbnRhdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IHNvcnRlZFJvd3MgPSAkcm93cy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYVRleHQgPSAkKGEpLmZpbmQoJ3RkJykuZXEoaW5kZXgpLnRleHQoKS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJUZXh0ID0gJChiKS5maW5kKCd0ZCcpLmVxKGluZGV4KS50ZXh0KCkudHJpbSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBzdGF0dXMgY29sdW1uLCBzb3J0IGJ5IHN0YXR1cyBwcmlvcml0eVxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c09yZGVyID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICfQn9GA0L7Qv9GD0YnQtdC9JzogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAn0KHQvtC30LTQsNC9JzogMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAn0J7QsdC90L7QstC70LXQvSc6IDMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ9Cj0LbQtSDRgdGD0YnQtdGB0YLQstGD0LXRgic6IDQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ9Ce0YjQuNCx0LrQsCc6IDVcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhU3RhdHVzID0gc3RhdHVzT3JkZXJbYVRleHQuc3BsaXQoJyAnKS5zbGljZSgxKS5qb2luKCcgJyldIHx8IDk5OTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJTdGF0dXMgPSBzdGF0dXNPcmRlcltiVGV4dC5zcGxpdCgnICcpLnNsaWNlKDEpLmpvaW4oJyAnKV0gfHwgOTk5O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlzQXNjZW5kaW5nID8gYVN0YXR1cyAtIGJTdGF0dXMgOiBiU3RhdHVzIC0gYVN0YXR1cztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBvdGhlciBjb2x1bW5zLCBzaW1wbGUgdGV4dCBzb3J0XG4gICAgICAgICAgICAgICAgICAgIGlmIChhVGV4dCA8IGJUZXh0KSByZXR1cm4gaXNBc2NlbmRpbmcgPyAtMSA6IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhVGV4dCA+IGJUZXh0KSByZXR1cm4gaXNBc2NlbmRpbmcgPyAxIDogLTE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgJHRib2R5LmVtcHR5KCkuYXBwZW5kKHNvcnRlZFJvd3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFN0b3JlIHJlZmVyZW5jZSBmb3Igcm93IHVwZGF0ZXMgKGNvbXBhdGliaWxpdHkgd2l0aCBleGlzdGluZyBjb2RlKVxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5wcmV2aWV3RGF0YVRhYmxlID0ge1xuICAgICAgICAgICAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2xlYW51cCBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLmZpbmQoJ3RoJykub2ZmKCdjbGljaycpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUucmVtb3ZlQ2xhc3MoJ3ByZXZpZXctdGFibGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTaG93IHByZXZpZXcgc2VjdGlvbiwgaGlkZSB1cGxvYWQgc2VjdGlvblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3U2VjdGlvbi5zaG93KCk7XG5cbiAgICAgICAgLy8gTm90ZTogUmVtb3ZlZCBhdXRvbWF0aWMgc2Nyb2xsaW5nIHRvIHByZXZlbnQgcGFnZSBqdW1waW5nIGR1cmluZyBwcm9jZXNzaW5nXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbmZpcm0gYW5kIHN0YXJ0IGltcG9ydFxuICAgICAqL1xuICAgIGNvbmZpcm1JbXBvcnQoKSB7XG4gICAgICAgIGlmICghZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkSWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZygnVXBsb2FkIElEIGlzIG1pc3NpbmcnLCAnZXJyb3InKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0cmF0ZWd5ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFN0cmF0ZWd5LmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY29uZmlybUltcG9ydC5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIEVtcGxveWVlc0FQSS5jb25maXJtSW1wb3J0KFxuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkSWQsXG4gICAgICAgICAgICBzdHJhdGVneSxcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjb25maXJtSW1wb3J0LnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gS2VlcCBwcmV2aWV3IHRhYmxlIHZpc2libGUsIHNob3cgcHJvZ3Jlc3Mgc2VjdGlvblxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NTZWN0aW9uLnNob3coKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIGltcG9ydCBidXR0b25zLCBzaG93IGNhbmNlbCBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY2FuY2VsSW1wb3J0LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFN0cmF0ZWd5LmNsb3Nlc3QoJy5maWVsZCcpLmhpZGUoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTYXZlIGpvYiBpbmZvcm1hdGlvbiBmb3IgY2FuY2VsbGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmN1cnJlbnRKb2JJZCA9IHJlc3BvbnNlLmRhdGEuam9iSWQgfHwgbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkID0gcmVzcG9uc2UuZGF0YS5jaGFubmVsSWQgfHwgbnVsbDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHByb2dyZXNzIGJhclxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0UHJvZ3Jlc3MucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVyY2VudDogMFxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBSZXNldCBwcm9ncmVzcyB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcm9ncmVzc1RleHQudGV4dChnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhcnRlZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU3Vic2NyaWJlIHRvIGltcG9ydCBwcm9ncmVzcyBldmVudHMgdmlhIEV2ZW50QnVzIEZJUlNUXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNoYW5uZWxJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc3Vic2NyaWJlVG9JbXBvcnRQcm9ncmVzcyhyZXNwb25zZS5kYXRhLmNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBSZXNldCB2YWxpZCByb3dzIHRvICdwcm9jZXNzaW5nJyBzdGF0dXMgYWZ0ZXIgYSBzbWFsbCBkZWxheSB0byBlbnN1cmUgRXZlbnRCdXMgaXMgcmVhZHlcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5yZXNldFRhYmxlVG9Qcm9jZXNzaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBpbXBvcnQgcHJvZ3Jlc3MgZXZlbnRzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNoYW5uZWxJZCAtIEltcG9ydCBwcm9ncmVzcyBjaGFubmVsIElEXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9JbXBvcnRQcm9ncmVzcyhjaGFubmVsSWQpIHtcbiAgICAgICAgLy8gU3RvcmUgY2FsbGJhY2sgZnVuY3Rpb24gcmVmZXJlbmNlIGZvciBsYXRlciB1bnN1YnNjcmlwdGlvbi5cbiAgICAgICAgLy8gTWVzc2FnZXMgY2FycnkgQ1NWIHZhbHVlczogbmV2ZXIgbG9nIHRoZW0sIHRoZSBjb25zb2xlIGVuZHMgdXAgaW4gZXJyb3IgcmVwb3J0cy5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayA9IChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLnR5cGUpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbXBvcnRfc3RhcnRlZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5oYW5kbGVJbXBvcnRTdGFydGVkKG1lc3NhZ2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW1wb3J0X3Byb2dyZXNzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmhhbmRsZUltcG9ydFByb2dyZXNzKG1lc3NhZ2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW1wb3J0X2NvbXBsZXRlZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5oYW5kbGVJbXBvcnRDb21wbGV0ZWQobWVzc2FnZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGDimqDvuI8gW0J1bGtVcGxvYWRdIFVua25vd24gbWVzc2FnZSB0eXBlOiAke21lc3NhZ2UudHlwZX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybign4pqg77iPIFtCdWxrVXBsb2FkXSBJbXBvcnQgcHJvZ3Jlc3MgbWVzc2FnZSB3aXRob3V0IGEgdHlwZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZShjaGFubmVsSWQsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydFByb2dyZXNzQ2FsbGJhY2spO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW1wb3J0IHN0YXJ0ZWQgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEltcG9ydCBzdGFydGVkIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVJbXBvcnRTdGFydGVkKGRhdGEpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlUHJvZ3Jlc3NUZXh0KGAke2dsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGFydGVkfSAoJHtkYXRhLnRvdGFsfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9SZWNvcmRzfSlgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGltcG9ydCBwcm9ncmVzcyBldmVudFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gSW1wb3J0IHByb2dyZXNzIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVJbXBvcnRQcm9ncmVzcyhkYXRhKSB7XG4gICAgICAgIGNvbnN0IHBlcmNlbnQgPSBNYXRoLnJvdW5kKChkYXRhLnByb2Nlc3NlZCAvIGRhdGEudG90YWwpICogMTAwKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFByb2dyZXNzLnByb2dyZXNzKHtcbiAgICAgICAgICAgIHBlcmNlbnQ6IHBlcmNlbnRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGluZGl2aWR1YWwgcm93IHN0YXR1cyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoZGF0YS5jdXJyZW50UmVjb3JkKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVSb3dTdGF0dXMoXG4gICAgICAgICAgICAgICAgZGF0YS5jdXJyZW50UmVjb3JkLm51bWJlcixcbiAgICAgICAgICAgICAgICBkYXRhLmN1cnJlbnRSZWNvcmQuc3RhdHVzLFxuICAgICAgICAgICAgICAgIGRhdGEuY3VycmVudFJlY29yZC5tZXNzYWdlXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgcHJvZ3Jlc3MgbWVzc2FnZSB3aXRoIHNraXBwZWQgY291bnRcbiAgICAgICAgY29uc3QgcGFydHMgPSBbXTtcbiAgICAgICAgaWYgKGRhdGEuY3JlYXRlZCA+IDApIHtcbiAgICAgICAgICAgIHBhcnRzLnB1c2goYCR7ZGF0YS5jcmVhdGVkfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9DcmVhdGVkfWApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLnVwZGF0ZWQgPiAwKSB7XG4gICAgICAgICAgICBwYXJ0cy5wdXNoKGAke2RhdGEudXBkYXRlZH0gJHtnbG9iYWxUcmFuc2xhdGUuZXhfVXBkYXRlZH1gKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5za2lwcGVkID4gMCkge1xuICAgICAgICAgICAgcGFydHMucHVzaChgJHtkYXRhLnNraXBwZWR9ICR7Z2xvYmFsVHJhbnNsYXRlLmV4X1NraXBwZWR9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuZXJyb3JzID4gMCkge1xuICAgICAgICAgICAgcGFydHMucHVzaChgJHtkYXRhLmVycm9yc30gJHtnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JzfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRQcm9ncmVzc306ICR7ZGF0YS5wcm9jZXNzZWR9LyR7ZGF0YS50b3RhbH0gKCR7cGFydHMuam9pbignLCAnKX0pYDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlUHJvZ3Jlc3NUZXh0KG1lc3NhZ2UpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW1wb3J0IGNvbXBsZXRlZCBldmVudFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gSW1wb3J0IGNvbXBsZXRpb24gZGF0YVxuICAgICAqL1xuICAgIGhhbmRsZUltcG9ydENvbXBsZXRlZChkYXRhKSB7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFByb2dyZXNzLnByb2dyZXNzKHtcbiAgICAgICAgICAgIHBlcmNlbnQ6IDEwMFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTaG93IGNvbXBsZXRpb24gbWVzc2FnZVxuICAgICAgICBjb25zdCBtZXNzYWdlID0gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydENvbXBsZXRlZH06ICR7ZGF0YS5jcmVhdGVkfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9DcmVhdGVkfSwgJHtkYXRhLnVwZGF0ZWR9ICR7Z2xvYmFsVHJhbnNsYXRlLmV4X1VwZGF0ZWR9LCAke2RhdGEuc2tpcHBlZH0gJHtnbG9iYWxUcmFuc2xhdGUuZXhfU2tpcHBlZH0sICR7ZGF0YS5lcnJvcnN9ICR7Z2xvYmFsVHJhbnNsYXRlLmV4X0Vycm9yc31gO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVQcm9ncmVzc1RleHQobWVzc2FnZSk7XG5cbiAgICAgICAgLy8gSGlkZSBjYW5jZWwgYnV0dG9uIGFuZCBlbnRpcmUgaW1wb3J0IGNvbnRyb2xzIGJsb2NrIGFmdGVyIGNvbXBsZXRpb25cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3MuaGlkZSgpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0Q29udHJvbHMuaGlkZSgpO1xuXG4gICAgICAgIC8vIENsZWFyIGpvYiBkYXRhXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmN1cnJlbnRKb2JJZCA9IG51bGw7XG5cbiAgICAgICAgLy8gVW5zdWJzY3JpYmUgZnJvbSBwcm9ncmVzcyBldmVudHMgYWZ0ZXIgY29tcGxldGlvblxuICAgICAgICBpZiAoZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkICYmIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydFByb2dyZXNzQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnVuc3Vic2NyaWJlKGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydENoYW5uZWxJZCwgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayk7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgPSBudWxsO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBdXRvbWF0aWNhbGx5IHNvcnQgdGFibGUgYnkgc3RhdHVzIGFmdGVyIGltcG9ydCBjb21wbGV0aW9uXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnNvcnRUYWJsZUJ5U3RhdHVzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbmNlbCBpbXBvcnQgYW5kIHJlc2V0XG4gICAgICovXG4gICAgY2FuY2VsSW1wb3J0KCkge1xuICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgZXJyb3IgbWVzc2FnZXNcbiAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3U2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnNob3coKTtcbiAgICAgICAgLy8gVW5zdWJzY3JpYmUgZnJvbSBFdmVudEJ1cyBpZiBzdWJzY3JpYmVkXG4gICAgICAgIGlmIChleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVJZCkge1xuICAgICAgICAgICAgRmlsZVVwbG9hZEV2ZW50SGFuZGxlci51bnN1YnNjcmliZShleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVJZCk7XG4gICAgICAgIH1cblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRJZCA9IG51bGw7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZVBhdGggPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVJZCA9IG51bGw7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmN1cnJlbnRKb2JJZCA9IG51bGw7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydENoYW5uZWxJZCA9IG51bGw7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydFByb2dyZXNzQ2FsbGJhY2sgPSBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYW5jZWwgdGhlIHJ1bm5pbmcgaW1wb3J0IHByb2Nlc3NcbiAgICAgKi9cbiAgICBjYW5jZWxJbXBvcnRQcm9jZXNzKCkge1xuICAgICAgICBpZiAoIWV4dGVuc2lvbnNCdWxrVXBsb2FkLmN1cnJlbnRKb2JJZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IGJ1dHRvbiB0byBsb2FkaW5nIHN0YXRlXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjYW5jZWxJbXBvcnRQcm9jZXNzLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgLy8gRm9yIG5vdywganVzdCBzdG9wIHRoZSBVSSB1cGRhdGVzIHNpbmNlIHNlcnZlci1zaWRlIGNhbmNlbGxhdGlvbiBpcyBub3QgaW1wbGVtZW50ZWRcbiAgICAgICAgLy8gVE9ETzogSW1wbGVtZW50IHNlcnZlci1zaWRlIGpvYiBjYW5jZWxsYXRpb25cblxuICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3MgdGV4dCB3aXRoIGNhbmNlbGxhdGlvbiBtZXNzYWdlXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwZGF0ZVByb2dyZXNzVGV4dChnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0Q2FuY2VsbGVkKTtcblxuICAgICAgICAvLyBIaWRlIHByb2dyZXNzIHNlY3Rpb25cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG5cbiAgICAgICAgLy8gU2hvdyBpbXBvcnQgYnV0dG9ucyBhZ2FpblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY29uZmlybUltcG9ydC5zaG93KCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjYW5jZWxJbXBvcnQuc2hvdygpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuY2xvc2VzdCgnLmZpZWxkJykuc2hvdygpO1xuXG4gICAgICAgIC8vIFVuc3Vic2NyaWJlIGZyb20gRXZlbnRCdXNcbiAgICAgICAgaWYgKGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydENoYW5uZWxJZCAmJiBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy51bnN1YnNjcmliZShleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydFByb2dyZXNzQ2FsbGJhY2spO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgam9iIGRhdGFcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayA9IG51bGw7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3MucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnQgbmV3IGltcG9ydFxuICAgICAqL1xuICAgIHN0YXJ0TmV3SW1wb3J0KCkge1xuICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgZXJyb3IgbWVzc2FnZXNcbiAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRyZXN1bHRzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcm9ncmVzc1NlY3Rpb24uaGlkZSgpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1NlY3Rpb24uaGlkZSgpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5zaG93KCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZElkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlUGF0aCA9IG51bGw7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayA9IG51bGw7XG5cbiAgICAgICAgLy8gUmVzZXQgdXBsb2FkIHN0YXRlIGhhbmRsZWQgYnkgRmlsZXNBUElcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGltcG9ydCBwcm9ncmVzcyBmcm9tIEV2ZW50QnVzXG4gICAgICovXG4gICAgb25JbXBvcnRQcm9ncmVzcyhkYXRhKSB7XG4gICAgICAgIGlmIChkYXRhLnBlcmNlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFByb2dyZXNzLnByb2dyZXNzKHtcbiAgICAgICAgICAgICAgICBwZXJjZW50OiBkYXRhLnBlcmNlbnRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRhdGEubWVzc2FnZSkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzTGFiZWwudGV4dChkYXRhLm1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRhdGEubG9nKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVQcm9ncmVzc1RleHQoZGF0YS5sb2cpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbXBvcnQgY29tcGxldGlvblxuICAgICAqL1xuICAgIG9uSW1wb3J0Q29tcGxldGUoZGF0YSkge1xuICAgICAgICAvLyBLZWVwIHRhYmxlIHZpc2libGUsIGhpZGUgcHJvZ3Jlc3MgYmFyLCBzaG93IHJlc3VsdHMgc2VjdGlvblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0UHJvZ3Jlc3MuaGlkZSgpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NMYWJlbC5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjYW5jZWxJbXBvcnRQcm9jZXNzLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdHNTZWN0aW9uLnNob3coKTtcblxuICAgICAgICAvLyBTaG93IGltcG9ydCBidXR0b25zIGFnYWluIGZvciBuZXcgaW1wb3J0XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjb25maXJtSW1wb3J0LnNob3coKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydC5zaG93KCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRTdHJhdGVneS5jbG9zZXN0KCcuZmllbGQnKS5zaG93KCk7XG5cbiAgICAgICAgLy8gU2hvdyByZXN1bHQgbWVzc2FnZVxuICAgICAgICBjb25zdCBtZXNzYWdlQ2xhc3MgPSBkYXRhLnN1Y2Nlc3MgPyAncG9zaXRpdmUnIDogJ25lZ2F0aXZlJztcbiAgICAgICAgY29uc3QgbWVzc2FnZUljb24gPSBkYXRhLnN1Y2Nlc3MgPyAnY2hlY2sgY2lyY2xlJyA6ICd0aW1lcyBjaXJjbGUnO1xuICAgICAgICBsZXQgbWVzc2FnZVRleHQgPSAnJztcblxuICAgICAgICBpZiAoZGF0YS5zdGF0cykge1xuICAgICAgICAgICAgbWVzc2FnZVRleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3VjY2Vzc1xuICAgICAgICAgICAgICAgIC5yZXBsYWNlKCd7Y3JlYXRlZH0nLCBkYXRhLnN0YXRzLmNyZWF0ZWQgfHwgMClcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgne3NraXBwZWR9JywgZGF0YS5zdGF0cy5za2lwcGVkIHx8IDApXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJ3tmYWlsZWR9JywgZGF0YS5zdGF0cy5mYWlsZWQgfHwgMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5lcnJvcikge1xuICAgICAgICAgICAgbWVzc2FnZVRleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0RmFpbGVkLnJlcGxhY2UoJ3tlcnJvcn0nLCBkYXRhLmVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRyZXN1bHRNZXNzYWdlLmh0bWwoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cIiR7bWVzc2FnZUNsYXNzfSBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke21lc3NhZ2VJY29ufSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2RhdGEuc3VjY2VzcyA/IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRDb21wbGV0ZSA6IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRGYWlsZWR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxwPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKG1lc3NhZ2VUZXh0KX08L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwcm9ncmVzcyB0ZXh0XG4gICAgICovXG4gICAgdXBkYXRlUHJvZ3Jlc3NUZXh0KG1lc3NhZ2UpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzVGV4dC50ZXh0KG1lc3NhZ2UpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHBvcnQgZW1wbG95ZWVzIHRvIENTVlxuICAgICAqL1xuICAgIGV4cG9ydEVtcGxveWVlcygpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEZvcm1hdC5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgIGNvbnN0IGZpbHRlciA9IHt9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbnVtYmVyRnJvbSA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJGcm9tLnZhbCgpO1xuICAgICAgICBjb25zdCBudW1iZXJUbyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJUby52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChudW1iZXJGcm9tKSB7XG4gICAgICAgICAgICBmaWx0ZXIubnVtYmVyX2Zyb20gPSBudW1iZXJGcm9tO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudW1iZXJUbykge1xuICAgICAgICAgICAgZmlsdGVyLm51bWJlcl90byA9IG51bWJlclRvO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIEVtcGxveWVlc0FQSS5leHBvcnRDU1YoXG4gICAgICAgICAgICBmb3JtYXQsXG4gICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXhwb3J0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZG93bmxvYWQgdXNpbmcgdGhlIGxpbmsgZnJvbSB0aGUgc2VydmVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmZpbGVuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZXNwb25zZS5kYXRhLmZpbGVuYW1lIGFscmVhZHkgY29udGFpbnMgdGhlIGZ1bGwgcGF0aCBmcm9tIHJvb3RcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzcG9uc2UuZGF0YS5maWxlbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZCBDU1YgdGVtcGxhdGVcbiAgICAgKi9cbiAgICBkb3dubG9hZFRlbXBsYXRlKCkge1xuICAgICAgICBjb25zdCBmb3JtYXQgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kdGVtcGxhdGVGb3JtYXQuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkb3dubG9hZFRlbXBsYXRlLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgRW1wbG95ZWVzQVBJLmdldFRlbXBsYXRlKFxuICAgICAgICAgICAgZm9ybWF0LFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGRvd25sb2FkVGVtcGxhdGUucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBkb3dubG9hZCB1c2luZyB0aGUgbGluayBmcm9tIHRoZSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgYWxyZWFkeSBjb250YWlucyB0aGUgZnVsbCBwYXRoIGZyb20gcm9vdFxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXNwb25zZS5kYXRhLmZpbGVuYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBmaWVsZCBkZXNjcmlwdGlvbnMgZm9yIGZvcm1hdFxuICAgICAqL1xuICAgIGdldEZvcm1hdEZpZWxkcyhmb3JtYXQpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0cyA9IHtcbiAgICAgICAgICAgIG1pbmltYWw6IFtcbiAgICAgICAgICAgICAgICAnbnVtYmVyIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE51bWJlcl9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX3VzZXJuYW1lIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFVzZXJuYW1lX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3VzZXJfZW1haWwgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRW1haWxfSGVscCxcbiAgICAgICAgICAgICAgICAnbW9iaWxlX251bWJlciAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRNb2JpbGVfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3NlY3JldCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRQYXNzd29yZF9IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfcmluZ2xlbmd0aCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdfSGVscFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHN0YW5kYXJkOiBbXG4gICAgICAgICAgICAgICAgJ251bWJlciAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGROdW1iZXJfSGVscCxcbiAgICAgICAgICAgICAgICAndXNlcl91c2VybmFtZSAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRVc2VybmFtZV9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX2VtYWlsIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEVtYWlsX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9udW1iZXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTW9iaWxlX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9kaWFsc3RyaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE1vYmlsZURpYWxzdHJpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3NlY3JldCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRQYXNzd29yZF9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfZHRtZm1vZGUgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRFRNRk1vZGVfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3RyYW5zcG9ydCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRUcmFuc3BvcnRfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX2VuYWJsZVJlY29yZGluZyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSZWNvcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX3JpbmdsZW5ndGggLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkUmluZ0xlbmd0aF9IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfZm9yd2FyZGluZyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRGb3J3YXJkaW5nX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5IC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdCdXN5X0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRGb3J3YXJkaW5nVW5hdmFpbGFibGVfSGVscFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZ1bGw6IFtcbiAgICAgICAgICAgICAgICAnbnVtYmVyIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE51bWJlcl9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX3VzZXJuYW1lIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFVzZXJuYW1lX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3VzZXJfZW1haWwgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRW1haWxfSGVscCxcbiAgICAgICAgICAgICAgICAndXNlcl9hdmF0YXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkQXZhdGFyX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9udW1iZXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTW9iaWxlX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9kaWFsc3RyaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE1vYmlsZURpYWxzdHJpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3NlY3JldCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRQYXNzd29yZF9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfZHRtZm1vZGUgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRFRNRk1vZGVfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3RyYW5zcG9ydCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRUcmFuc3BvcnRfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX2VuYWJsZVJlY29yZGluZyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSZWNvcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX21hbnVhbGF0dHJpYnV0ZXMgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTWFudWFsQXR0cmlidXRlc19IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfcmluZ2xlbmd0aCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX2ZvcndhcmRpbmdvbmJ1c3kgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRm9yd2FyZGluZ0J1c3lfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdVbmF2YWlsYWJsZV9IZWxwXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZm9ybWF0c1tmb3JtYXRdIHx8IGZvcm1hdHMuc3RhbmRhcmQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZm9ybWF0IGRlc2NyaXB0aW9uXG4gICAgICovXG4gICAgdXBkYXRlRm9ybWF0RGVzY3JpcHRpb24odHlwZSwgZm9ybWF0KSB7XG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLmdldEZvcm1hdEZpZWxkcyhmb3JtYXQpO1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gdHlwZSA9PT0gJ2V4cG9ydCcgP1xuICAgICAgICAgICAgJCgnI2V4cG9ydC1mb3JtYXQtZmllbGRzLWRlc2NyaXB0aW9uJykgOlxuICAgICAgICAgICAgJCgnI2Zvcm1hdC1maWVsZHMtZGVzY3JpcHRpb24nKTtcblxuICAgICAgICBpZiAoJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSAnPHVsIGNsYXNzPVwibGlzdFwiPicgK1xuICAgICAgICAgICAgICAgIGZpZWxkcy5tYXAoZmllbGQgPT4gYDxsaT48Y29kZT4ke2ZpZWxkfTwvY29kZT48L2xpPmApLmpvaW4oJycpICtcbiAgICAgICAgICAgICAgICAnPC91bD4nO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5odG1sKGh0bWwpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHRhYmxlIHJvd3MgdG8gcHJvY2Vzc2luZyBzdGF0dXMgKG9ubHkgZm9yIHZhbGlkIHJlY29yZHMgdGhhdCB3aWxsIGJlIHByb2Nlc3NlZClcbiAgICAgKi9cbiAgICByZXNldFRhYmxlVG9Qcm9jZXNzaW5nKCkge1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLmZpbmQoJ3Rib2R5IHRyJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5zdGF0dXMtY2VsbCcpO1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzVGV4dCA9ICRzdGF0dXNDZWxsLmZpbmQoJy5zdGF0dXMtdGV4dCcpLnRleHQoKS50cmltKCk7XG5cbiAgICAgICAgICAgIC8vIE9ubHkgcmVzZXQgcm93cyB0aGF0IGhhdmUgJ3ZhbGlkJyBzdGF0dXMgZnJvbSBwcmV2aWV3XG4gICAgICAgICAgICAvLyBMZWF2ZSBkdXBsaWNhdGVzLCBleGlzdHMsIGFuZCBlcnJvciByb3dzIGFzIHRoZXkgYXJlXG4gICAgICAgICAgICBpZiAoJHJvdy5oYXNDbGFzcygncG9zaXRpdmUnKSAmJiBzdGF0dXNUZXh0ID09PSBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdG8gcHJvY2Vzc2luZyBzdGF0dXMgb25seSBmb3IgdmFsaWQgcmVjb3Jkc1xuICAgICAgICAgICAgICAgICRyb3cucmVtb3ZlQ2xhc3MoJ3Bvc2l0aXZlIG5lZ2F0aXZlIHdhcm5pbmcnKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbCgnPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT4gPHNwYW4gY2xhc3M9XCJzdGF0dXMtdGV4dFwiPicgKyBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzUHJvY2Vzc2luZyArICc8L3NwYW4+Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTb3J0IHRhYmxlIGJ5IHN0YXR1cyBjb2x1bW4gYWZ0ZXIgaW1wb3J0IGNvbXBsZXRpb25cbiAgICAgKi9cbiAgICBzb3J0VGFibGVCeVN0YXR1cygpIHtcbiAgICAgICAgY29uc3QgJHN0YXR1c0hlYWRlciA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGgnKS5lcSg0KTsgLy8gU3RhdHVzIGNvbHVtbiAoaW5kZXggNClcbiAgICAgICAgY29uc3QgJGFsbFRoID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5maW5kKCd0aCcpO1xuICAgICAgICBjb25zdCAkdGJvZHkgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLmZpbmQoJ3Rib2R5Jyk7XG4gICAgICAgIGNvbnN0ICRyb3dzID0gJHRib2R5LmZpbmQoJ3RyJyk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHNvcnRpbmcgY2xhc3NlcyBmcm9tIG90aGVyIGhlYWRlcnNcbiAgICAgICAgJGFsbFRoLnJlbW92ZUNsYXNzKCdzb3J0ZWQgYXNjZW5kaW5nIGRlc2NlbmRpbmcnKTtcblxuICAgICAgICAvLyBTZXQgc3RhdHVzIGNvbHVtbiBhcyBzb3J0ZWQgYXNjZW5kaW5nIChzaG93IHByb2Nlc3NlZCByZXN1bHRzIGZpcnN0KVxuICAgICAgICAkc3RhdHVzSGVhZGVyLmFkZENsYXNzKCdzb3J0ZWQgYXNjZW5kaW5nJyk7XG5cbiAgICAgICAgLy8gU29ydCByb3dzIGJ5IHN0YXR1cyBwcmlvcml0eVxuICAgICAgICBjb25zdCBzb3J0ZWRSb3dzID0gJHJvd3Muc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICBjb25zdCBhVGV4dCA9ICQoYSkuZmluZCgndGQnKS5lcSg0KS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgY29uc3QgYlRleHQgPSAkKGIpLmZpbmQoJ3RkJykuZXEoNCkudGV4dCgpLnRyaW0oKTtcblxuICAgICAgICAgICAgLy8gU3RhdHVzIG9yZGVyIHByaW9yaXR5IChjcmVhdGVkL3VwZGF0ZWQgZmlyc3QsIHRoZW4gc2tpcHBlZCwgdGhlbiBubyBjaGFuZ2VzLCB0aGVuIGVycm9ycylcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c09yZGVyID0ge1xuICAgICAgICAgICAgICAgICfQodC+0LfQtNCw0L0nOiAxLFxuICAgICAgICAgICAgICAgICfQntCx0L3QvtCy0LvQtdC9JzogMixcbiAgICAgICAgICAgICAgICAn0J/RgNC+0L/Rg9GJ0LXQvSc6IDMsXG4gICAgICAgICAgICAgICAgJ9Cj0LbQtSDRgdGD0YnQtdGB0YLQstGD0LXRgic6IDQsXG4gICAgICAgICAgICAgICAgJ9CR0LXQtyDQuNC30LzQtdC90LXQvdC40LknOiA1LFxuICAgICAgICAgICAgICAgICfQntGI0LjQsdC60LAnOiA2LFxuICAgICAgICAgICAgICAgICfQntCx0YDQsNCx0LDRgtGL0LLQsNC10YLRgdGPJzogNyAvLyBTaG91bGQgbm90IGFwcGVhciBhZnRlciBjb21wbGV0aW9uLCBidXQganVzdCBpbiBjYXNlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IHN0YXR1cyB0ZXh0IChyZW1vdmUgaWNvbiBwYXJ0KVxuICAgICAgICAgICAgY29uc3QgYVN0YXR1cyA9IHN0YXR1c09yZGVyW2FUZXh0LnNwbGl0KCcgJykuc2xpY2UoMSkuam9pbignICcpXSB8fCA5OTk7XG4gICAgICAgICAgICBjb25zdCBiU3RhdHVzID0gc3RhdHVzT3JkZXJbYlRleHQuc3BsaXQoJyAnKS5zbGljZSgxKS5qb2luKCcgJyldIHx8IDk5OTtcblxuICAgICAgICAgICAgcmV0dXJuIGFTdGF0dXMgLSBiU3RhdHVzOyAvLyBBc2NlbmRpbmcgb3JkZXJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHdpdGggc29ydGVkIHJvd3NcbiAgICAgICAgJHRib2R5LmVtcHR5KCkuYXBwZW5kKHNvcnRlZFJvd3MpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaW5kaXZpZHVhbCByb3cgc3RhdHVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc3RhdHVzIC0gTmV3IHN0YXR1cyAoY3JlYXRlZCwgdXBkYXRlZCwgc2tpcHBlZCwgZXJyb3IpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBTdGF0dXMgbWVzc2FnZVxuICAgICAqL1xuICAgIHVwZGF0ZVJvd1N0YXR1cyhudW1iZXIsIHN0YXR1cywgbWVzc2FnZSkge1xuICAgICAgICAvLyBUaGUgbnVtYmVyIGNvbWVzIGZyb20gdGhlIENTVjogY29tcGFyZSB0aGUgYXR0cmlidXRlIGluc3RlYWQgb2YgYnVpbGRpbmcgYSBzZWxlY3RvciBmcm9tIGl0LFxuICAgICAgICAvLyBhIHF1b3RlIG9yIGEgYnJhY2tldCBpbiB0aGUgdmFsdWUgbWFkZSBqUXVlcnkgdGhyb3cgKGlzc3VlICMxMzQ5KVxuICAgICAgICBjb25zdCB3YW50ZWQgPSBTdHJpbmcobnVtYmVyID8/ICcnKTtcbiAgICAgICAgY29uc3QgJHJvdyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGVcbiAgICAgICAgICAgIC5maW5kKCd0Ym9keSB0cicpXG4gICAgICAgICAgICAuZmlsdGVyKChpbmRleCwgdHIpID0+IHRyLmdldEF0dHJpYnV0ZSgnZGF0YS1udW1iZXInKSA9PT0gd2FudGVkKTtcbiAgICAgICAgaWYgKCRyb3cubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkc3RhdHVzQ2VsbCA9ICRyb3cuZmluZCgnLnN0YXR1cy1jZWxsJyk7XG5cbiAgICAgICAgbGV0IHN0YXR1c0NsYXNzLCBzdGF0dXNJY29uLCBzdGF0dXNUZXh0O1xuXG4gICAgICAgIHN3aXRjaChzdGF0dXMpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZWQnOlxuICAgICAgICAgICAgY2FzZSAndXBkYXRlZCc6XG4gICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAncG9zaXRpdmUnO1xuICAgICAgICAgICAgICAgIHN0YXR1c0ljb24gPSAnY2hlY2sgY2lyY2xlIGdyZWVuJztcbiAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gc3RhdHVzID09PSAnY3JlYXRlZCcgPyBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzQ3JlYXRlZCA6IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNVcGRhdGVkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc2tpcHBlZCc6XG4gICAgICAgICAgICBjYXNlICdleGlzdHMnOiAvLyBIYW5kbGUgXCJleGlzdHNcIiBzdGF0dXMgZnJvbSBiYWNrZW5kXG4gICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnd2FybmluZyc7XG4gICAgICAgICAgICAgICAgc3RhdHVzSWNvbiA9ICdtaW51cyBjaXJjbGUgeWVsbG93JztcbiAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gc3RhdHVzID09PSAnZXhpc3RzJyA/IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNFeGlzdHMgOiBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzU2tpcHBlZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ25vX2NoYW5nZXMnOlxuICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ2Rpc2FibGVkJztcbiAgICAgICAgICAgICAgICBzdGF0dXNJY29uID0gJ21pbnVzIGNpcmNsZSBncmV5JztcbiAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c05vQ2hhbmdlcztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICduZWdhdGl2ZSc7XG4gICAgICAgICAgICAgICAgc3RhdHVzSWNvbiA9ICd0aW1lcyBjaXJjbGUgcmVkJztcbiAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c0Vycm9yO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICdhY3RpdmUnO1xuICAgICAgICAgICAgICAgIHN0YXR1c0ljb24gPSAnc3Bpbm5lciBsb2FkaW5nJztcbiAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c1Byb2Nlc3Npbmc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgcm93IGNsYXNzIGFuZCBzdGF0dXNcbiAgICAgICAgJHJvdy5yZW1vdmVDbGFzcygncG9zaXRpdmUgbmVnYXRpdmUgd2FybmluZyBhY3RpdmUgZGlzYWJsZWQnKS5hZGRDbGFzcyhzdGF0dXNDbGFzcyk7XG4gICAgICAgIC8vIFN1cmZhY2UgYmFja2VuZCBlcnJvciBtZXNzYWdlIGlubGluZSAoaXNzdWUgIzk5Nikg4oCUIGVzY2FwZSB2aWEgalF1ZXJ5IC50ZXh0KCkgdG8gcHJldmVudCBYU1MuXG4gICAgICAgIGxldCBkZXRhaWxIdG1sID0gJyc7XG4gICAgICAgIGlmIChzdGF0dXMgPT09ICdlcnJvcicgJiYgbWVzc2FnZSkge1xuICAgICAgICAgICAgY29uc3Qgc2FmZU1lc3NhZ2UgPSAkKCc8ZGl2PicpLnRleHQobWVzc2FnZSkuaHRtbCgpO1xuICAgICAgICAgICAgZGV0YWlsSHRtbCA9IGAgPHNwYW4gY2xhc3M9XCJzdGF0dXMtZGV0YWlsXCI+4oCUICR7c2FmZU1lc3NhZ2V9PC9zcGFuPmA7XG4gICAgICAgICAgICAkc3RhdHVzQ2VsbC5hdHRyKCd0aXRsZScsIG1lc3NhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHN0YXR1c0NlbGwucmVtb3ZlQXR0cigndGl0bGUnKTtcbiAgICAgICAgfVxuICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKGA8aSBjbGFzcz1cIiR7c3RhdHVzSWNvbn0gaWNvblwiPjwvaT4gPHNwYW4gY2xhc3M9XCJzdGF0dXMtdGV4dFwiPiR7c3RhdHVzVGV4dH08L3NwYW4+JHtkZXRhaWxIdG1sfWApO1xuXG4gICAgICAgIC8vIE5vdGU6IFJlbW92ZWQgYXV0b21hdGljIHNjcm9sbGluZyB0byBwcmV2ZW50IHBhZ2UganVtcGluZyBkdXJpbmcgcHJvY2Vzc2luZ1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmluaXRpYWxpemUoKTtcbn0pO1xuIl19