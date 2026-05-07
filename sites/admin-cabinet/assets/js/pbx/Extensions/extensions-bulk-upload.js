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
    extensionsBulkUpload.$numberTo = $('#number-to');
    console.log('🎯 [BulkUpload] Module initialization started'); // Initialize tabs with event handler to clear messages

    $('#bulk-tabs .item').tab({
      onVisible: function onVisible() {
        console.log('👁️ [BulkUpload] Tab visible event'); // Clear any existing error messages when switching tabs

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
    EventBus.subscribe('import_complete', extensionsBulkUpload.onImportComplete); // Check URL hash to activate correct tab

    if (window.location.hash) {
      var hash = window.location.hash.substring(1);
      console.log('🔗 [BulkUpload] Activating tab from hash', {
        hash: hash
      });
      $("#bulk-tabs .item[data-tab=\"".concat(hash, "\"]")).click();
    }

    console.log('✅ [BulkUpload] Module initialization completed successfully');
  },

  /**
   * Initialize file upload using FilesAPI.attachToBtn for consistent behavior
   */
  initializeFileUpload: function initializeFileUpload() {
    console.log('🔧 [BulkUpload] Initializing file upload functionality'); // Check if elements exist before initializing

    if (!extensionsBulkUpload.$uploadButton.length || !extensionsBulkUpload.$uploadSegment.length) {
      console.error('❌ [BulkUpload] Upload elements not found', {
        uploadButton: extensionsBulkUpload.$uploadButton.length,
        uploadSegment: extensionsBulkUpload.$uploadSegment.length
      }); // Upload elements not found, skipping file upload initialization

      return;
    }

    console.log('✅ [BulkUpload] Upload elements found', {
      uploadButton: extensionsBulkUpload.$uploadButton.length,
      uploadSegment: extensionsBulkUpload.$uploadSegment.length
    }); // Use FilesAPI.attachToBtn for unified file upload handling
    // This attaches directly to the button and handles file selection internally

    FilesAPI.attachToBtn('upload-button', ['csv'], extensionsBulkUpload.cbUploadResumable);
    console.log('✅ [BulkUpload] File upload attached to button "upload-button" with CSV filter');
  },

  /**
   * Callback function for file upload with chunks and merge.
   * @param {string} action - The action performed during the upload.
   * @param {Object} params - Additional parameters related to the upload.
   */
  cbUploadResumable: function cbUploadResumable(action, params) {
    var _params$file, _params$file2, _params$file3, _params$file4, _params$file4$file, _params$file5, _params$file6;

    console.log('📥 [BulkUpload] Upload callback triggered', {
      action: action,
      params: params
    });

    switch (action) {
      case 'fileAdded':
        console.log('📁 [BulkUpload] File added event', {
          fileName: ((_params$file = params.file) === null || _params$file === void 0 ? void 0 : _params$file.fileName) || ((_params$file2 = params.file) === null || _params$file2 === void 0 ? void 0 : _params$file2.name),
          fileSize: (_params$file3 = params.file) === null || _params$file3 === void 0 ? void 0 : _params$file3.size,
          fileType: (_params$file4 = params.file) === null || _params$file4 === void 0 ? void 0 : (_params$file4$file = _params$file4.file) === null || _params$file4$file === void 0 ? void 0 : _params$file4$file.type
        });
        break;

      case 'uploadStart':
        console.log('🚀 [BulkUpload] Upload started');
        extensionsBulkUpload.$uploadSegment.addClass('loading');
        break;

      case 'fileProgress':
        var progress = params.file ? Math.round(params.file.progress() * 100) : 0;
        console.log('📈 [BulkUpload] Upload progress', {
          progress: progress + '%'
        });
        break;

      case 'fileSuccess':
        console.log('✅ [BulkUpload] Upload success', {
          response: params.response
        });
        var result = PbxApi.tryParseJSON(params.response);
        console.log('📋 [BulkUpload] Parsed response', {
          result: result
        });

        if (result !== false && result.data && result.data.upload_id) {
          extensionsBulkUpload.uploadedFileId = result.data.upload_id;
          extensionsBulkUpload.uploadedFilePath = result.data.filename;
          console.log('💾 [BulkUpload] File data saved', {
            uploadId: extensionsBulkUpload.uploadedFileId,
            filePath: extensionsBulkUpload.uploadedFilePath
          });
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

      case 'fileError':
        console.error('❌ [BulkUpload] File error', {
          fileName: ((_params$file5 = params.file) === null || _params$file5 === void 0 ? void 0 : _params$file5.fileName) || ((_params$file6 = params.file) === null || _params$file6 === void 0 ? void 0 : _params$file6.name),
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

      case 'complete':
        console.log('🏁 [BulkUpload] Upload complete');
        break;

      default:
        console.log("\u2139\uFE0F [BulkUpload] Unhandled action: ".concat(action), {
          params: params
        });
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
        }

        var $row = $("\n                    <tr class=\"".concat(statusClass, "\" data-row=\"").concat(row.row, "\" data-number=\"").concat(row.number, "\">\n                        <td>").concat(row.number || '', "</td>\n                        <td>").concat(row.user_username || '', "</td>\n                        <td>").concat(row.mobile_number || '', "</td>\n                        <td>").concat(row.user_email || '', "</td>\n                        <td class=\"status-cell\"><i class=\"").concat(statusIcon, " icon\"></i> <span class=\"status-text\">").concat(statusText, "</span></td>\n                    </tr>\n                "));
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
    console.log("\uD83D\uDD14 [BulkUpload] Subscribing to EventBus channel: ".concat(channelId)); // Store callback function reference for later unsubscription

    extensionsBulkUpload.importProgressCallback = function (message) {
      console.log("\uD83D\uDCE8 [BulkUpload] EventBus message received:", message);

      if (message && message.type) {
        console.log("\uD83D\uDD04 [BulkUpload] Processing message type: ".concat(message.type));

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
        console.warn("\u26A0\uFE0F [BulkUpload] Invalid message format:", message);
      }
    };

    EventBus.subscribe(channelId, extensionsBulkUpload.importProgressCallback);
    console.log("\u2705 [BulkUpload] EventBus subscription completed for channel: ".concat(channelId));
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
    console.log('🔄 [BulkUpload] handleImportProgress called with data:', data);
    var percent = Math.round(data.processed / data.total * 100);
    extensionsBulkUpload.$importProgress.progress({
      percent: percent
    }); // Update individual row status if provided

    if (data.currentRecord) {
      console.log('🔄 [BulkUpload] Updating row status for:', data.currentRecord);
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

    extensionsBulkUpload.$resultMessage.html("\n            <div class=\"".concat(messageClass, " message\">\n                <i class=\"").concat(messageIcon, " icon\"></i>\n                <div class=\"content\">\n                    <div class=\"header\">").concat(data.success ? globalTranslate.ex_ImportComplete : globalTranslate.ex_ImportFailed, "</div>\n                    <p>").concat(messageText, "</p>\n                </div>\n            </div>\n        "));
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
    console.log('🔄 [BulkUpload] resetTableToProcessing called');
    extensionsBulkUpload.$previewTable.find('tbody tr').each(function () {
      var $row = $(this);
      var $statusCell = $row.find('.status-cell');
      var statusText = $statusCell.find('.status-text').text().trim();
      console.log("\uD83D\uDD0D [BulkUpload] Row status check - hasClass positive: ".concat($row.hasClass('positive'), ", statusText: '").concat(statusText, "', expectedValid: '").concat(globalTranslate.ex_ImportStatusValid, "'")); // Only reset rows that have 'valid' status from preview
      // Leave duplicates, exists, and error rows as they are

      if ($row.hasClass('positive') && statusText === globalTranslate.ex_ImportStatusValid) {
        console.log("\u2705 [BulkUpload] Resetting row to processing status"); // Update to processing status only for valid records

        $row.removeClass('positive negative warning').addClass('active');
        $statusCell.html('<i class="spinner loading icon"></i> <span class="status-text">' + globalTranslate.ex_ImportStatusProcessing + '</span>');
      }
    });
  },

  /**
   * Sort table by status column after import completion
   */
  sortTableByStatus: function sortTableByStatus() {
    console.log('🔄 [BulkUpload] Sorting table by status after import completion');
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
    console.log('✅ [BulkUpload] Table sorted by status - processed records shown first');
  },

  /**
   * Update individual row status
   * @param {string} number - Extension number
   * @param {string} status - New status (created, updated, skipped, error)
   * @param {string} message - Status message
   */
  updateRowStatus: function updateRowStatus(number, status, message) {
    console.log("\uD83D\uDD04 [BulkUpload] updateRowStatus called for number: ".concat(number, ", status: ").concat(status, ", message: ").concat(message));
    var $row = extensionsBulkUpload.$previewTable.find("tbody tr[data-number=\"".concat(number, "\"]"));

    if ($row.length === 0) {
      console.warn("\u26A0\uFE0F [BulkUpload] No row found for number: ".concat(number));
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

    $statusCell.html("<i class=\"".concat(statusIcon, " icon\"></i> <span class=\"status-text\">").concat(statusText, "</span>").concat(detailHtml));
    console.log("\u2705 [BulkUpload] Updated row ".concat(number, " to status: ").concat(statusText, ", class: ").concat(statusClass)); // Note: Removed automatic scrolling to prevent page jumping during processing
  }
}; // Initialize when document is ready

$(document).ready(function () {
  console.log('🚀 [BulkUpload] Document ready, starting module initialization');
  extensionsBulkUpload.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtYnVsay11cGxvYWQuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0J1bGtVcGxvYWQiLCIkdXBsb2FkQnV0dG9uIiwiJHVwbG9hZFNlZ21lbnQiLCIkcHJldmlld1NlY3Rpb24iLCIkcHJvZ3Jlc3NTZWN0aW9uIiwiJHJlc3VsdHNTZWN0aW9uIiwiJHByZXZpZXdUYWJsZSIsIiRpbXBvcnRQcm9ncmVzcyIsIiRwcm9ncmVzc0xhYmVsIiwiJHByb2dyZXNzVGV4dCIsIiRyZXN1bHRNZXNzYWdlIiwiJHRvdGFsQ291bnQiLCIkdmFsaWRDb3VudCIsIiRkdXBsaWNhdGVDb3VudCIsIiRlcnJvckNvdW50IiwiJGNvbmZpcm1JbXBvcnQiLCIkY2FuY2VsSW1wb3J0IiwiJGNhbmNlbEltcG9ydFByb2Nlc3MiLCIkbmV3SW1wb3J0IiwiJGltcG9ydENvbnRyb2xzIiwiJGV4cG9ydEJ1dHRvbiIsIiRkb3dubG9hZFRlbXBsYXRlIiwiJGltcG9ydFN0cmF0ZWd5IiwiJGV4cG9ydEZvcm1hdCIsIiR0ZW1wbGF0ZUZvcm1hdCIsIiRudW1iZXJGcm9tIiwiJG51bWJlclRvIiwidXBsb2FkSWQiLCJ1cGxvYWRlZEZpbGVQYXRoIiwidXBsb2FkZWRGaWxlSWQiLCJjdXJyZW50Sm9iSWQiLCJpbXBvcnRDaGFubmVsSWQiLCJpbXBvcnRQcm9ncmVzc0NhbGxiYWNrIiwicHJldmlld0RhdGFUYWJsZSIsImluaXRpYWxpemUiLCIkIiwiY29uc29sZSIsImxvZyIsInRhYiIsIm9uVmlzaWJsZSIsInJlbW92ZSIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInVwZGF0ZUZvcm1hdERlc2NyaXB0aW9uIiwiaW5pdGlhbGl6ZUZpbGVVcGxvYWQiLCJvbiIsImNvbmZpcm1JbXBvcnQiLCJjYW5jZWxJbXBvcnQiLCJjYW5jZWxJbXBvcnRQcm9jZXNzIiwic3RhcnROZXdJbXBvcnQiLCJleHBvcnRFbXBsb3llZXMiLCJkb3dubG9hZFRlbXBsYXRlIiwiRXZlbnRCdXMiLCJzdWJzY3JpYmUiLCJvbkltcG9ydFByb2dyZXNzIiwib25JbXBvcnRDb21wbGV0ZSIsIndpbmRvdyIsImxvY2F0aW9uIiwiaGFzaCIsInN1YnN0cmluZyIsImNsaWNrIiwibGVuZ3RoIiwiZXJyb3IiLCJ1cGxvYWRCdXR0b24iLCJ1cGxvYWRTZWdtZW50IiwiRmlsZXNBUEkiLCJhdHRhY2hUb0J0biIsImNiVXBsb2FkUmVzdW1hYmxlIiwiYWN0aW9uIiwicGFyYW1zIiwiZmlsZU5hbWUiLCJmaWxlIiwibmFtZSIsImZpbGVTaXplIiwic2l6ZSIsImZpbGVUeXBlIiwidHlwZSIsImFkZENsYXNzIiwicHJvZ3Jlc3MiLCJNYXRoIiwicm91bmQiLCJyZXNwb25zZSIsInJlc3VsdCIsIlBieEFwaSIsInRyeVBhcnNlSlNPTiIsImRhdGEiLCJ1cGxvYWRfaWQiLCJmaWxlbmFtZSIsImZpbGVQYXRoIiwiY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyIsImhhc0RhdGEiLCJoYXNVcGxvYWRJZCIsImVycm9yTWVzc2FnZXMiLCJtZXNzYWdlcyIsInJlc3VsdFJlc3VsdCIsInJhd1Jlc3BvbnNlIiwiZXJyb3JNZXNzYWdlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfRmlsZVVwbG9hZEVycm9yIiwiQXJyYXkiLCJpc0FycmF5Iiwiam9pbiIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlIiwidW5kZWZpbmVkIiwianNvbiIsIkpTT04iLCJwYXJzZSIsIkZpbGVVcGxvYWRFdmVudEhhbmRsZXIiLCJvbk1lcmdlU3RhcnRlZCIsIm9uTWVyZ2VQcm9ncmVzcyIsIm9uTWVyZ2VDb21wbGV0ZSIsInByZXZpZXdJbXBvcnQiLCJvbkVycm9yIiwiZF9zdGF0dXMiLCJzdHJhdGVneSIsIkVtcGxveWVlc0FQSSIsImltcG9ydENTViIsInNob3dQcmV2aWV3IiwidGV4dCIsInRvdGFsIiwidmFsaWQiLCJkdXBsaWNhdGVzIiwiZXJyb3JzIiwiZGVzdHJveSIsIiR0Ym9keSIsImZpbmQiLCJlbXB0eSIsInByZXZpZXciLCJmb3JFYWNoIiwicm93Iiwic3RhdHVzQ2xhc3MiLCJzdGF0dXMiLCJzdGF0dXNJY29uIiwic3RhdHVzVGV4dCIsImV4X0ltcG9ydFN0YXR1c1ZhbGlkIiwiZXhfSW1wb3J0U3RhdHVzRHVwbGljYXRlIiwiZXhfSW1wb3J0U3RhdHVzRXhpc3RzIiwiZXhfSW1wb3J0U3RhdHVzRXJyb3IiLCJleF9JbXBvcnRTdGF0dXNJbnZhbGlkIiwiJHJvdyIsIm51bWJlciIsInVzZXJfdXNlcm5hbWUiLCJtb2JpbGVfbnVtYmVyIiwidXNlcl9lbWFpbCIsImFwcGVuZCIsImVhY2giLCJpbmRleCIsIiR0aCIsIiRhbGxUaCIsIiRyb3dzIiwiaXNBc2NlbmRpbmciLCJoYXNDbGFzcyIsInNvcnRlZFJvd3MiLCJzb3J0IiwiYSIsImIiLCJhVGV4dCIsImVxIiwidHJpbSIsImJUZXh0Iiwic3RhdHVzT3JkZXIiLCJhU3RhdHVzIiwic3BsaXQiLCJzbGljZSIsImJTdGF0dXMiLCJvZmYiLCJoaWRlIiwic2hvdyIsImNsb3Nlc3QiLCJqb2JJZCIsImNoYW5uZWxJZCIsInBlcmNlbnQiLCJleF9JbXBvcnRTdGFydGVkIiwic3Vic2NyaWJlVG9JbXBvcnRQcm9ncmVzcyIsInNldFRpbWVvdXQiLCJyZXNldFRhYmxlVG9Qcm9jZXNzaW5nIiwiaGFuZGxlSW1wb3J0U3RhcnRlZCIsImhhbmRsZUltcG9ydFByb2dyZXNzIiwiaGFuZGxlSW1wb3J0Q29tcGxldGVkIiwid2FybiIsInVwZGF0ZVByb2dyZXNzVGV4dCIsImV4X1JlY29yZHMiLCJwcm9jZXNzZWQiLCJjdXJyZW50UmVjb3JkIiwidXBkYXRlUm93U3RhdHVzIiwicGFydHMiLCJjcmVhdGVkIiwicHVzaCIsImV4X0NyZWF0ZWQiLCJ1cGRhdGVkIiwiZXhfVXBkYXRlZCIsInNraXBwZWQiLCJleF9Ta2lwcGVkIiwiZXhfRXJyb3JzIiwiZXhfSW1wb3J0UHJvZ3Jlc3MiLCJleF9JbXBvcnRDb21wbGV0ZWQiLCJ1bnN1YnNjcmliZSIsInNvcnRUYWJsZUJ5U3RhdHVzIiwiZXhfSW1wb3J0Q2FuY2VsbGVkIiwibWVzc2FnZUNsYXNzIiwic3VjY2VzcyIsIm1lc3NhZ2VJY29uIiwibWVzc2FnZVRleHQiLCJzdGF0cyIsImV4X0ltcG9ydFN1Y2Nlc3MiLCJyZXBsYWNlIiwiZmFpbGVkIiwiZXhfSW1wb3J0RmFpbGVkIiwiaHRtbCIsImV4X0ltcG9ydENvbXBsZXRlIiwiZm9ybWF0IiwiZmlsdGVyIiwibnVtYmVyRnJvbSIsInZhbCIsIm51bWJlclRvIiwibnVtYmVyX2Zyb20iLCJudW1iZXJfdG8iLCJleHBvcnRDU1YiLCJocmVmIiwiZ2V0VGVtcGxhdGUiLCJnZXRGb3JtYXRGaWVsZHMiLCJmb3JtYXRzIiwibWluaW1hbCIsImV4X0ZpZWxkTnVtYmVyX0hlbHAiLCJleF9GaWVsZFVzZXJuYW1lX0hlbHAiLCJleF9GaWVsZEVtYWlsX0hlbHAiLCJleF9GaWVsZE1vYmlsZV9IZWxwIiwiZXhfRmllbGRQYXNzd29yZF9IZWxwIiwiZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAiLCJleF9GaWVsZEZvcndhcmRpbmdfSGVscCIsInN0YW5kYXJkIiwiZXhfRmllbGRNb2JpbGVEaWFsc3RyaW5nX0hlbHAiLCJleF9GaWVsZERUTUZNb2RlX0hlbHAiLCJleF9GaWVsZFRyYW5zcG9ydF9IZWxwIiwiZXhfRmllbGRSZWNvcmRpbmdfSGVscCIsImV4X0ZpZWxkRm9yd2FyZGluZ0J1c3lfSGVscCIsImV4X0ZpZWxkRm9yd2FyZGluZ1VuYXZhaWxhYmxlX0hlbHAiLCJmdWxsIiwiZXhfRmllbGRBdmF0YXJfSGVscCIsImV4X0ZpZWxkTWFudWFsQXR0cmlidXRlc19IZWxwIiwiZmllbGRzIiwiJGNvbnRhaW5lciIsIm1hcCIsImZpZWxkIiwiJHN0YXR1c0NlbGwiLCJleF9JbXBvcnRTdGF0dXNQcm9jZXNzaW5nIiwiJHN0YXR1c0hlYWRlciIsImV4X0ltcG9ydFN0YXR1c0NyZWF0ZWQiLCJleF9JbXBvcnRTdGF0dXNVcGRhdGVkIiwiZXhfSW1wb3J0U3RhdHVzU2tpcHBlZCIsImV4X0ltcG9ydFN0YXR1c05vQ2hhbmdlcyIsImRldGFpbEh0bWwiLCJzYWZlTWVzc2FnZSIsImF0dHIiLCJyZW1vdmVBdHRyIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsb0JBQW9CLEdBQUc7QUFDekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLElBTFU7QUFNekJDLEVBQUFBLGNBQWMsRUFBRSxJQU5TO0FBT3pCQyxFQUFBQSxlQUFlLEVBQUUsSUFQUTtBQVF6QkMsRUFBQUEsZ0JBQWdCLEVBQUUsSUFSTztBQVN6QkMsRUFBQUEsZUFBZSxFQUFFLElBVFE7QUFVekJDLEVBQUFBLGFBQWEsRUFBRSxJQVZVO0FBV3pCQyxFQUFBQSxlQUFlLEVBQUUsSUFYUTtBQVl6QkMsRUFBQUEsY0FBYyxFQUFFLElBWlM7QUFhekJDLEVBQUFBLGFBQWEsRUFBRSxJQWJVO0FBY3pCQyxFQUFBQSxjQUFjLEVBQUUsSUFkUztBQWV6QkMsRUFBQUEsV0FBVyxFQUFFLElBZlk7QUFnQnpCQyxFQUFBQSxXQUFXLEVBQUUsSUFoQlk7QUFpQnpCQyxFQUFBQSxlQUFlLEVBQUUsSUFqQlE7QUFrQnpCQyxFQUFBQSxXQUFXLEVBQUUsSUFsQlk7QUFtQnpCQyxFQUFBQSxjQUFjLEVBQUUsSUFuQlM7QUFvQnpCQyxFQUFBQSxhQUFhLEVBQUUsSUFwQlU7QUFxQnpCQyxFQUFBQSxvQkFBb0IsRUFBRSxJQXJCRztBQXNCekJDLEVBQUFBLFVBQVUsRUFBRSxJQXRCYTtBQXVCekJDLEVBQUFBLGVBQWUsRUFBRSxJQXZCUTtBQXdCekJDLEVBQUFBLGFBQWEsRUFBRSxJQXhCVTtBQXlCekJDLEVBQUFBLGlCQUFpQixF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O0FBQ0FyQyxFQUFBQSxvQkFBb0IsQ0FBQ2tDLFVBQXJCO0FBQ0gsQ0FIRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBQYnhBcGksIEVtcGxveWVlc0FQSSwgRXZlbnRCdXMsIFNlbWFudGljTG9jYWxpemF0aW9uLCBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLCBGaWxlc0FQSSAqL1xuXG4vKipcbiAqIFRoZSBleHRlbnNpb25zQnVsa1VwbG9hZCBtb2R1bGUgaGFuZGxlcyBDU1YgaW1wb3J0L2V4cG9ydCBmdW5jdGlvbmFsaXR5IGZvciBlbXBsb3llZXNcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uc0J1bGtVcGxvYWRcbiAqL1xuY29uc3QgZXh0ZW5zaW9uc0J1bGtVcGxvYWQgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IGVsZW1lbnRzLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKi9cbiAgICAkdXBsb2FkQnV0dG9uOiBudWxsLFxuICAgICR1cGxvYWRTZWdtZW50OiBudWxsLFxuICAgICRwcmV2aWV3U2VjdGlvbjogbnVsbCxcbiAgICAkcHJvZ3Jlc3NTZWN0aW9uOiBudWxsLFxuICAgICRyZXN1bHRzU2VjdGlvbjogbnVsbCxcbiAgICAkcHJldmlld1RhYmxlOiBudWxsLFxuICAgICRpbXBvcnRQcm9ncmVzczogbnVsbCxcbiAgICAkcHJvZ3Jlc3NMYWJlbDogbnVsbCxcbiAgICAkcHJvZ3Jlc3NUZXh0OiBudWxsLFxuICAgICRyZXN1bHRNZXNzYWdlOiBudWxsLFxuICAgICR0b3RhbENvdW50OiBudWxsLFxuICAgICR2YWxpZENvdW50OiBudWxsLFxuICAgICRkdXBsaWNhdGVDb3VudDogbnVsbCxcbiAgICAkZXJyb3JDb3VudDogbnVsbCxcbiAgICAkY29uZmlybUltcG9ydDogbnVsbCxcbiAgICAkY2FuY2VsSW1wb3J0OiBudWxsLFxuICAgICRjYW5jZWxJbXBvcnRQcm9jZXNzOiBudWxsLFxuICAgICRuZXdJbXBvcnQ6IG51bGwsXG4gICAgJGltcG9ydENvbnRyb2xzOiBudWxsLFxuICAgICRleHBvcnRCdXR0b246IG51bGwsXG4gICAgJGRvd25sb2FkVGVtcGxhdGU6IG51bGwsXG4gICAgJGltcG9ydFN0cmF0ZWd5OiBudWxsLFxuICAgICRleHBvcnRGb3JtYXQ6IG51bGwsXG4gICAgJHRlbXBsYXRlRm9ybWF0OiBudWxsLFxuICAgICRudW1iZXJGcm9tOiBudWxsLFxuICAgICRudW1iZXJUbzogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdXBsb2FkIGRhdGFcbiAgICAgKi9cbiAgICB1cGxvYWRJZDogbnVsbCxcbiAgICB1cGxvYWRlZEZpbGVQYXRoOiBudWxsLFxuICAgIHVwbG9hZGVkRmlsZUlkOiBudWxsLFxuICAgIGN1cnJlbnRKb2JJZDogbnVsbCxcbiAgICBpbXBvcnRDaGFubmVsSWQ6IG51bGwsXG4gICAgaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjazogbnVsbCxcbiAgICBwcmV2aWV3RGF0YVRhYmxlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gUmVzb2x2ZSBqUXVlcnkgd3JhcHBlcnMgaGVyZSDigJQgYXQgbW9kdWxlLWxvYWQgdGltZSBqUXVlcnkgbWF5XG4gICAgICAgIC8vIG5vdCB5ZXQgYmUgZGVmaW5lZCAoU2VudHJ5IE1JS09QQlgtTUc5IHBhdHRlcm4pLlxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkQnV0dG9uID0gJCgnI3VwbG9hZC1idXR0b24nKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQgPSAkKCcjdXBsb2FkLXNlZ21lbnQnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdTZWN0aW9uID0gJCgnI3ByZXZpZXctc2VjdGlvbicpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NTZWN0aW9uID0gJCgnI3Byb2dyZXNzLXNlY3Rpb24nKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdHNTZWN0aW9uID0gJCgnI3Jlc3VsdHMtc2VjdGlvbicpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlID0gJCgnI3ByZXZpZXctdGFibGUnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFByb2dyZXNzID0gJCgnI2ltcG9ydC1wcm9ncmVzcycpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NMYWJlbCA9ICQoJyNwcm9ncmVzcy1sYWJlbCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NUZXh0ID0gJCgnI3Byb2dyZXNzLXRleHQnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdE1lc3NhZ2UgPSAkKCcjcmVzdWx0LW1lc3NhZ2UnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHRvdGFsQ291bnQgPSAkKCcjdG90YWwtY291bnQnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHZhbGlkQ291bnQgPSAkKCcjdmFsaWQtY291bnQnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGR1cGxpY2F0ZUNvdW50ID0gJCgnI2R1cGxpY2F0ZS1jb3VudCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXJyb3JDb3VudCA9ICQoJyNlcnJvci1jb3VudCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY29uZmlybUltcG9ydCA9ICQoJyNjb25maXJtLWltcG9ydCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY2FuY2VsSW1wb3J0ID0gJCgnI2NhbmNlbC1pbXBvcnQnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3MgPSAkKCcjY2FuY2VsLWltcG9ydC1wcm9jZXNzJyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRuZXdJbXBvcnQgPSAkKCcjbmV3LWltcG9ydCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0Q29udHJvbHMgPSAkKCcjaW1wb3J0LWNvbnRyb2xzJyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRleHBvcnRCdXR0b24gPSAkKCcjZXhwb3J0LWJ1dHRvbicpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZG93bmxvYWRUZW1wbGF0ZSA9ICQoJyNkb3dubG9hZC10ZW1wbGF0ZScpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kgPSAkKCcjaW1wb3J0LXN0cmF0ZWd5Jyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRleHBvcnRGb3JtYXQgPSAkKCcjZXhwb3J0LWZvcm1hdCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdGVtcGxhdGVGb3JtYXQgPSAkKCcjdGVtcGxhdGUtZm9ybWF0Jyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJGcm9tID0gJCgnI251bWJlci1mcm9tJyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJUbyA9ICQoJyNudW1iZXItdG8nKTtcblxuICAgICAgICBjb25zb2xlLmxvZygn8J+OryBbQnVsa1VwbG9hZF0gTW9kdWxlIGluaXRpYWxpemF0aW9uIHN0YXJ0ZWQnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnMgd2l0aCBldmVudCBoYW5kbGVyIHRvIGNsZWFyIG1lc3NhZ2VzXG4gICAgICAgICQoJyNidWxrLXRhYnMgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+Rge+4jyBbQnVsa1VwbG9hZF0gVGFiIHZpc2libGUgZXZlbnQnKTtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgZXJyb3IgbWVzc2FnZXMgd2hlbiBzd2l0Y2hpbmcgdGFic1xuICAgICAgICAgICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFN0cmF0ZWd5LmRyb3Bkb3duKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRleHBvcnRGb3JtYXQuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlRm9ybWF0RGVzY3JpcHRpb24oJ2V4cG9ydCcsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR0ZW1wbGF0ZUZvcm1hdC5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVGb3JtYXREZXNjcmlwdGlvbigndGVtcGxhdGUnLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBpbml0aWFsIGZvcm1hdCBkZXNjcmlwdGlvbnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlRm9ybWF0RGVzY3JpcHRpb24oJ2V4cG9ydCcsICdzdGFuZGFyZCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVGb3JtYXREZXNjcmlwdGlvbigndGVtcGxhdGUnLCAnc3RhbmRhcmQnKTtcblxuICAgICAgICAvLyBTZXQgdXAgZmlsZSB1cGxvYWRcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW5pdGlhbGl6ZUZpbGVVcGxvYWQoKTtcblxuICAgICAgICAvLyBTZXQgdXAgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY29uZmlybUltcG9ydCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjYW5jZWxJbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY2FuY2VsSW1wb3J0KTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3Mub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY2FuY2VsSW1wb3J0UHJvY2Vzcyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRuZXdJbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc3RhcnROZXdJbXBvcnQpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXhwb3J0QnV0dG9uLm9uKCdjbGljaycsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmV4cG9ydEVtcGxveWVlcyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkb3dubG9hZFRlbXBsYXRlLm9uKCdjbGljaycsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmRvd25sb2FkVGVtcGxhdGUpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgaW1wb3J0IHByb2dyZXNzXG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnaW1wb3J0X3Byb2dyZXNzJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQub25JbXBvcnRQcm9ncmVzcyk7XG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnaW1wb3J0X2NvbXBsZXRlJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQub25JbXBvcnRDb21wbGV0ZSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgVVJMIGhhc2ggdG8gYWN0aXZhdGUgY29ycmVjdCB0YWJcbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG4gICAgICAgICAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJcgW0J1bGtVcGxvYWRdIEFjdGl2YXRpbmcgdGFiIGZyb20gaGFzaCcsIHsgaGFzaCB9KTtcbiAgICAgICAgICAgICQoYCNidWxrLXRhYnMgLml0ZW1bZGF0YS10YWI9XCIke2hhc2h9XCJdYCkuY2xpY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgW0J1bGtVcGxvYWRdIE1vZHVsZSBpbml0aWFsaXphdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmlsZSB1cGxvYWQgdXNpbmcgRmlsZXNBUEkuYXR0YWNoVG9CdG4gZm9yIGNvbnNpc3RlbnQgYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmlsZVVwbG9hZCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflKcgW0J1bGtVcGxvYWRdIEluaXRpYWxpemluZyBmaWxlIHVwbG9hZCBmdW5jdGlvbmFsaXR5Jyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZWxlbWVudHMgZXhpc3QgYmVmb3JlIGluaXRpYWxpemluZ1xuICAgICAgICBpZiAoIWV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRCdXR0b24ubGVuZ3RoIHx8ICFleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBbQnVsa1VwbG9hZF0gVXBsb2FkIGVsZW1lbnRzIG5vdCBmb3VuZCcsIHtcbiAgICAgICAgICAgICAgICB1cGxvYWRCdXR0b246IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRCdXR0b24ubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHVwbG9hZFNlZ21lbnQ6IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50Lmxlbmd0aFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBVcGxvYWQgZWxlbWVudHMgbm90IGZvdW5kLCBza2lwcGluZyBmaWxlIHVwbG9hZCBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJ+KchSBbQnVsa1VwbG9hZF0gVXBsb2FkIGVsZW1lbnRzIGZvdW5kJywge1xuICAgICAgICAgICAgdXBsb2FkQnV0dG9uOiBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkQnV0dG9uLmxlbmd0aCxcbiAgICAgICAgICAgIHVwbG9hZFNlZ21lbnQ6IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50Lmxlbmd0aFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVc2UgRmlsZXNBUEkuYXR0YWNoVG9CdG4gZm9yIHVuaWZpZWQgZmlsZSB1cGxvYWQgaGFuZGxpbmdcbiAgICAgICAgLy8gVGhpcyBhdHRhY2hlcyBkaXJlY3RseSB0byB0aGUgYnV0dG9uIGFuZCBoYW5kbGVzIGZpbGUgc2VsZWN0aW9uIGludGVybmFsbHlcbiAgICAgICAgRmlsZXNBUEkuYXR0YWNoVG9CdG4oJ3VwbG9hZC1idXR0b24nLCBbJ2NzdiddLCBleHRlbnNpb25zQnVsa1VwbG9hZC5jYlVwbG9hZFJlc3VtYWJsZSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ+KchSBbQnVsa1VwbG9hZF0gRmlsZSB1cGxvYWQgYXR0YWNoZWQgdG8gYnV0dG9uIFwidXBsb2FkLWJ1dHRvblwiIHdpdGggQ1NWIGZpbHRlcicpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgZmlsZSB1cGxvYWQgd2l0aCBjaHVua3MgYW5kIG1lcmdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHBlcmZvcm1lZCBkdXJpbmcgdGhlIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHJlbGF0ZWQgdG8gdGhlIHVwbG9hZC5cbiAgICAgKi9cbiAgICBjYlVwbG9hZFJlc3VtYWJsZShhY3Rpb24sIHBhcmFtcykge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+TpSBbQnVsa1VwbG9hZF0gVXBsb2FkIGNhbGxiYWNrIHRyaWdnZXJlZCcsIHtcbiAgICAgICAgICAgIGFjdGlvbjogYWN0aW9uLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2ZpbGVBZGRlZCc6XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgW0J1bGtVcGxvYWRdIEZpbGUgYWRkZWQgZXZlbnQnLCB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lOiBwYXJhbXMuZmlsZT8uZmlsZU5hbWUgfHwgcGFyYW1zLmZpbGU/Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGZpbGVTaXplOiBwYXJhbXMuZmlsZT8uc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgZmlsZVR5cGU6IHBhcmFtcy5maWxlPy5maWxlPy50eXBlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWRTdGFydCc6XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CfmoAgW0J1bGtVcGxvYWRdIFVwbG9hZCBzdGFydGVkJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2ZpbGVQcm9ncmVzcyc6XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBwYXJhbXMuZmlsZSA/IE1hdGgucm91bmQocGFyYW1zLmZpbGUucHJvZ3Jlc3MoKSAqIDEwMCkgOiAwO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OIIFtCdWxrVXBsb2FkXSBVcGxvYWQgcHJvZ3Jlc3MnLCB7XG4gICAgICAgICAgICAgICAgICAgIHByb2dyZXNzOiBwcm9ncmVzcyArICclJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZmlsZVN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgW0J1bGtVcGxvYWRdIFVwbG9hZCBzdWNjZXNzJywge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZTogcGFyYW1zLnJlc3BvbnNlXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBQYnhBcGkudHJ5UGFyc2VKU09OKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4sgW0J1bGtVcGxvYWRdIFBhcnNlZCByZXNwb25zZScsIHsgcmVzdWx0IH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UgJiYgcmVzdWx0LmRhdGEgJiYgcmVzdWx0LmRhdGEudXBsb2FkX2lkKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkID0gcmVzdWx0LmRhdGEudXBsb2FkX2lkO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVQYXRoID0gcmVzdWx0LmRhdGEuZmlsZW5hbWU7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfkr4gW0J1bGtVcGxvYWRdIEZpbGUgZGF0YSBzYXZlZCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZElkOiBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVQYXRoXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgW0J1bGtVcGxvYWRdIEludmFsaWQgcmVzcG9uc2UgZm9ybWF0Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZXN1bHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNEYXRhOiByZXN1bHQgPyAhIXJlc3VsdC5kYXRhIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNVcGxvYWRJZDogcmVzdWx0Py5kYXRhPy51cGxvYWRfaWQgfHwgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2VzOiByZXN1bHQ/Lm1lc3NhZ2VzIHx8ICdObyBlcnJvciBtZXNzYWdlcycsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRSZXN1bHQ6IHJlc3VsdD8ucmVzdWx0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmF3UmVzcG9uc2U6IHBhcmFtcy5yZXNwb25zZVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG1vcmUgc3BlY2lmaWMgZXJyb3IgbWVzc2FnZSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5leF9GaWxlVXBsb2FkRXJyb3I7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gcmVzdWx0Lm1lc3NhZ2VzLmVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign8J+aqCBbQnVsa1VwbG9hZF0gU2VydmVyIGVycm9yIG1lc3NhZ2U6JywgcmVzdWx0Lm1lc3NhZ2VzLmVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgJiYgcmVzdWx0Lm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfwn5qoIFtCdWxrVXBsb2FkXSBTZXJ2ZXIgbWVzc2FnZXM6JywgcmVzdWx0Lm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzdWx0Lm1lc3NhZ2VzID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IHJlc3VsdC5tZXNzYWdlcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShyZXN1bHQubWVzc2FnZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gcmVzdWx0Lm1lc3NhZ2VzLmpvaW4oJywgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdmaWxlRXJyb3InOlxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBbQnVsa1VwbG9hZF0gRmlsZSBlcnJvcicsIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWU6IHBhcmFtcy5maWxlPy5maWxlTmFtZSB8fCBwYXJhbXMuZmlsZT8ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcGFyYW1zLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuZXhfRmlsZVVwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfwn5KlIFtCdWxrVXBsb2FkXSBVcGxvYWQgZXJyb3InLCB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHBhcmFtcy5tZXNzYWdlIHx8IHBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgZmlsZTogcGFyYW1zLmZpbGVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMsIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWxlVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY29tcGxldGUnOlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn4+BIFtCdWxrVXBsb2FkXSBVcGxvYWQgY29tcGxldGUnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOKEue+4jyBbQnVsa1VwbG9hZF0gVW5oYW5kbGVkIGFjdGlvbjogJHthY3Rpb259YCwgeyBwYXJhbXMgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgZmlsZSBtZXJnaW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBmaWxlIG1lcmdpbmcgc3RhdHVzIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgUGJ4QXBpLnRyeVBhcnNlSlNPTihyZXNwb25zZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X0ZpbGVVcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG4gICAgICAgIGlmIChqc29uID09PSB1bmRlZmluZWQgfHwganNvbi5kYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuZXhfRmlsZVVwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXBsb2FkSWQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHVwbG9hZCBwcm9ncmVzc1xuICAgICAgICBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLnN1YnNjcmliZSh1cGxvYWRJZCwge1xuICAgICAgICAgICAgb25NZXJnZVN0YXJ0ZWQ6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRmlsZSBtZXJnZSBzdGFydGVkXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlUHJvZ3Jlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGlmIG5lZWRlZFxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZUNvbXBsZXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucHJldmlld0ltcG9ydCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25FcnJvcjogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9GaWxlVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpbW1lZGlhdGUgc3RhdHVzIChzYW1lIGFzIHNvdW5kLWZpbGUtbW9kaWZ5LmpzKVxuICAgICAgICBpZiAoanNvbi5kYXRhLmRfc3RhdHVzID09PSAnVVBMT0FEX0NPTVBMRVRFJyB8fCAhanNvbi5kYXRhLmRfc3RhdHVzKSB7XG4gICAgICAgICAgICAvLyBGaWxlIGlzIGFscmVhZHkgcmVhZHksIHByb2NlZWQgd2l0aCBwcmV2aWV3IGltbWVkaWF0ZWx5XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucHJldmlld0ltcG9ydCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIE5vdGU6IHN0YXJ0TWVyZ2luZ0NoZWNrV29ya2VyKCkgbWV0aG9kIHJlbW92ZWQgLSBub3cgdXNpbmcgRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG5cbiAgICAvKipcbiAgICAgKiBQcmV2aWV3IGltcG9ydCAtIHZhbGlkYXRlIENTViBhbmQgc2hvdyBwcmV2aWV3XG4gICAgICovXG4gICAgcHJldmlld0ltcG9ydCgpIHtcbiAgICAgICAgY29uc3Qgc3RyYXRlZ3kgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gVXNlIHVwbG9hZGVkRmlsZUlkIGZvciBBUEkgY2FsbCwgYXMgdGhlIGZpbGUgaXMgbm93IGZ1bGx5IG1lcmdlZFxuICAgICAgICBFbXBsb3llZXNBUEkuaW1wb3J0Q1NWKFxuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlSWQsXG4gICAgICAgICAgICAncHJldmlldycsXG4gICAgICAgICAgICBzdHJhdGVneSxcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQmFja2VuZCByZXR1cm5zIHVwbG9hZF9pZCwgbm90IHVwbG9hZElkXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZElkID0gcmVzcG9uc2UuZGF0YS51cGxvYWRfaWQgfHwgcmVzcG9uc2UuZGF0YS51cGxvYWRJZDtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc2hvd1ByZXZpZXcocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgcHJldmlldyBvZiBDU1YgZGF0YVxuICAgICAqL1xuICAgIHNob3dQcmV2aWV3KGRhdGEpIHtcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRpc3RpY3NcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHRvdGFsQ291bnQudGV4dChkYXRhLnRvdGFsIHx8IDApO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdmFsaWRDb3VudC50ZXh0KGRhdGEudmFsaWQgfHwgMCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkdXBsaWNhdGVDb3VudC50ZXh0KGRhdGEuZHVwbGljYXRlcyB8fCAwKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGVycm9yQ291bnQudGV4dChkYXRhLmVycm9ycyB8fCAwKTtcblxuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIERhdGFUYWJsZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUuZGVzdHJveSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgYW5kIHBvcHVsYXRlIHByZXZpZXcgdGFibGVcbiAgICAgICAgY29uc3QgJHRib2R5ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5maW5kKCd0Ym9keScpO1xuICAgICAgICAkdGJvZHkuZW1wdHkoKTtcblxuICAgICAgICBpZiAoZGF0YS5wcmV2aWV3ICYmIGRhdGEucHJldmlldy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBkYXRhLnByZXZpZXcuZm9yRWFjaCgocm93KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSByb3cuc3RhdHVzID09PSAndmFsaWQnID8gJ3Bvc2l0aXZlJyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5zdGF0dXMgPT09ICdkdXBsaWNhdGUnIHx8IHJvdy5zdGF0dXMgPT09ICdleGlzdHMnID8gJ3dhcm5pbmcnIDogJ25lZ2F0aXZlJztcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNJY29uID0gcm93LnN0YXR1cyA9PT0gJ3ZhbGlkJyA/ICdjaGVjayBjaXJjbGUnIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3cuc3RhdHVzID09PSAnZHVwbGljYXRlJyB8fCByb3cuc3RhdHVzID09PSAnZXhpc3RzJyA/ICdleGNsYW1hdGlvbiB0cmlhbmdsZScgOiAndGltZXMgY2lyY2xlJztcblxuICAgICAgICAgICAgICAgIC8vIFRyYW5zbGF0ZSBzdGF0dXMgdGV4dFxuICAgICAgICAgICAgICAgIGxldCBzdGF0dXNUZXh0ID0gcm93LnN0YXR1cztcbiAgICAgICAgICAgICAgICBzd2l0Y2gocm93LnN0YXR1cykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2YWxpZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c1ZhbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2R1cGxpY2F0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c0R1cGxpY2F0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdleGlzdHMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNFeGlzdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNFcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnZhbGlkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c1RleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzSW52YWxpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGBcbiAgICAgICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwiJHtzdGF0dXNDbGFzc31cIiBkYXRhLXJvdz1cIiR7cm93LnJvd31cIiBkYXRhLW51bWJlcj1cIiR7cm93Lm51bWJlcn1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke3Jvdy5udW1iZXIgfHwgJyd9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke3Jvdy51c2VyX3VzZXJuYW1lIHx8ICcnfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtyb3cubW9iaWxlX251bWJlciB8fCAnJ308L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPiR7cm93LnVzZXJfZW1haWwgfHwgJyd9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInN0YXR1cy1jZWxsXCI+PGkgY2xhc3M9XCIke3N0YXR1c0ljb259IGljb25cIj48L2k+IDxzcGFuIGNsYXNzPVwic3RhdHVzLXRleHRcIj4ke3N0YXR1c1RleHR9PC9zcGFuPjwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgJHRib2R5LmFwcGVuZCgkcm93KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIHNpbXBsZSBTZW1hbnRpYyBVSSB0YWJsZSBpbnN0ZWFkIG9mIERhdGFUYWJsZXMgdG8gYXZvaWQgaGVhZGVyL2JvZHkgc2VwYXJhdGlvbiBpc3N1ZXNcbiAgICAgICAgLy8gQWRkIENTUyBjbGFzcyB0byBwcmV2aWV3IHRhYmxlIGZvciBzdHlsaW5nXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuYWRkQ2xhc3MoJ3ByZXZpZXctdGFibGUnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIHRhYmxlIHNvcnRpbmcgbWFudWFsbHkgaWYgbmVlZGVkXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGgnKS5lYWNoKGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICBjb25zdCAkdGggPSAkKHRoaXMpO1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSA0KSB7IC8vIFN0YXR1cyBjb2x1bW4gLSBtYWtlIGl0IHNvcnRhYmxlIChub3cgYXQgaW5kZXggNClcbiAgICAgICAgICAgICAgICAkdGguYWRkQ2xhc3MoJ3NvcnRlZCBhc2NlbmRpbmcnKTsgLy8gU2V0IGluaXRpYWwgc29ydFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkdGgub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGFsbFRoID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5maW5kKCd0aCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0Ym9keSA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGJvZHknKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkcm93cyA9ICR0Ym9keS5maW5kKCd0cicpO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHNvcnRpbmcgY2xhc3NlcyBmcm9tIG90aGVyIGhlYWRlcnNcbiAgICAgICAgICAgICAgICAkYWxsVGgucmVtb3ZlQ2xhc3MoJ3NvcnRlZCBhc2NlbmRpbmcgZGVzY2VuZGluZycpO1xuXG4gICAgICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIHNvcnQgZGlyZWN0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgaXNBc2NlbmRpbmcgPSAhJHRoLmhhc0NsYXNzKCdzb3J0ZWQnKSB8fCAkdGguaGFzQ2xhc3MoJ2Rlc2NlbmRpbmcnKTtcbiAgICAgICAgICAgICAgICAkdGguYWRkQ2xhc3MoaXNBc2NlbmRpbmcgPyAnc29ydGVkIGFzY2VuZGluZycgOiAnc29ydGVkIGRlc2NlbmRpbmcnKTtcblxuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBzb3J0IGltcGxlbWVudGF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3Qgc29ydGVkUm93cyA9ICRyb3dzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhVGV4dCA9ICQoYSkuZmluZCgndGQnKS5lcShpbmRleCkudGV4dCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYlRleHQgPSAkKGIpLmZpbmQoJ3RkJykuZXEoaW5kZXgpLnRleHQoKS50cmltKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHN0YXR1cyBjb2x1bW4sIHNvcnQgYnkgc3RhdHVzIHByaW9yaXR5XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzT3JkZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ9Cf0YDQvtC/0YPRidC10L0nOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICfQodC+0LfQtNCw0L0nOiAyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICfQntCx0L3QvtCy0LvQtdC9JzogMyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAn0KPQttC1INGB0YPRidC10YHRgtCy0YPQtdGCJzogNCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAn0J7RiNC40LHQutCwJzogNVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFTdGF0dXMgPSBzdGF0dXNPcmRlclthVGV4dC5zcGxpdCgnICcpLnNsaWNlKDEpLmpvaW4oJyAnKV0gfHwgOTk5O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYlN0YXR1cyA9IHN0YXR1c09yZGVyW2JUZXh0LnNwbGl0KCcgJykuc2xpY2UoMSkuam9pbignICcpXSB8fCA5OTk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXNBc2NlbmRpbmcgPyBhU3RhdHVzIC0gYlN0YXR1cyA6IGJTdGF0dXMgLSBhU3RhdHVzO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG90aGVyIGNvbHVtbnMsIHNpbXBsZSB0ZXh0IHNvcnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFUZXh0IDwgYlRleHQpIHJldHVybiBpc0FzY2VuZGluZyA/IC0xIDogMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFUZXh0ID4gYlRleHQpIHJldHVybiBpc0FzY2VuZGluZyA/IDEgOiAtMTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkdGJvZHkuZW1wdHkoKS5hcHBlbmQoc29ydGVkUm93cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3RvcmUgcmVmZXJlbmNlIGZvciByb3cgdXBkYXRlcyAoY29tcGF0aWJpbGl0eSB3aXRoIGV4aXN0aW5nIGNvZGUpXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUgPSB7XG4gICAgICAgICAgICBkZXN0cm95OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBDbGVhbnVwIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGgnKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5yZW1vdmVDbGFzcygncHJldmlldy10YWJsZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNob3cgcHJldmlldyBzZWN0aW9uLCBoaWRlIHVwbG9hZCBzZWN0aW9uXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdTZWN0aW9uLnNob3coKTtcblxuICAgICAgICAvLyBOb3RlOiBSZW1vdmVkIGF1dG9tYXRpYyBzY3JvbGxpbmcgdG8gcHJldmVudCBwYWdlIGp1bXBpbmcgZHVyaW5nIHByb2Nlc3NpbmdcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uZmlybSBhbmQgc3RhcnQgaW1wb3J0XG4gICAgICovXG4gICAgY29uZmlybUltcG9ydCgpIHtcbiAgICAgICAgaWYgKCFleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRJZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKCdVcGxvYWQgSUQgaXMgbWlzc2luZycsICdlcnJvcicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RyYXRlZ3kgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjb25maXJtSW1wb3J0LmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgRW1wbG95ZWVzQVBJLmNvbmZpcm1JbXBvcnQoXG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRJZCxcbiAgICAgICAgICAgIHN0cmF0ZWd5LFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBLZWVwIHByZXZpZXcgdGFibGUgdmlzaWJsZSwgc2hvdyBwcm9ncmVzcyBzZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcm9ncmVzc1NlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgaW1wb3J0IGJ1dHRvbnMsIHNob3cgY2FuY2VsIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY29uZmlybUltcG9ydC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjYW5jZWxJbXBvcnQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuY2xvc2VzdCgnLmZpZWxkJykuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNhdmUgam9iIGluZm9ybWF0aW9uIGZvciBjYW5jZWxsYXRpb25cbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkID0gcmVzcG9uc2UuZGF0YS5qb2JJZCB8fCBudWxsO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgPSByZXNwb25zZS5kYXRhLmNoYW5uZWxJZCB8fCBudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcHJvZ3Jlc3MgYmFyXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRQcm9ncmVzcy5wcm9ncmVzcyh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZXJjZW50OiAwXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IHByb2dyZXNzIHRleHRcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGFydGVkKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTdWJzY3JpYmUgdG8gaW1wb3J0IHByb2dyZXNzIGV2ZW50cyB2aWEgRXZlbnRCdXMgRklSU1RcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuY2hhbm5lbElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5zdWJzY3JpYmVUb0ltcG9ydFByb2dyZXNzKHJlc3BvbnNlLmRhdGEuY2hhbm5lbElkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IHZhbGlkIHJvd3MgdG8gJ3Byb2Nlc3NpbmcnIHN0YXR1cyBhZnRlciBhIHNtYWxsIGRlbGF5IHRvIGVuc3VyZSBFdmVudEJ1cyBpcyByZWFkeVxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnJlc2V0VGFibGVUb1Byb2Nlc3NpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIGltcG9ydCBwcm9ncmVzcyBldmVudHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2hhbm5lbElkIC0gSW1wb3J0IHByb2dyZXNzIGNoYW5uZWwgSURcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb0ltcG9ydFByb2dyZXNzKGNoYW5uZWxJZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhg8J+UlCBbQnVsa1VwbG9hZF0gU3Vic2NyaWJpbmcgdG8gRXZlbnRCdXMgY2hhbm5lbDogJHtjaGFubmVsSWR9YCk7XG5cbiAgICAgICAgLy8gU3RvcmUgY2FsbGJhY2sgZnVuY3Rpb24gcmVmZXJlbmNlIGZvciBsYXRlciB1bnN1YnNjcmlwdGlvblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrID0gKG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGDwn5OoIFtCdWxrVXBsb2FkXSBFdmVudEJ1cyBtZXNzYWdlIHJlY2VpdmVkOmAsIG1lc3NhZ2UpO1xuXG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg8J+UhCBbQnVsa1VwbG9hZF0gUHJvY2Vzc2luZyBtZXNzYWdlIHR5cGU6ICR7bWVzc2FnZS50eXBlfWApO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ltcG9ydF9zdGFydGVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmhhbmRsZUltcG9ydFN0YXJ0ZWQobWVzc2FnZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbXBvcnRfcHJvZ3Jlc3MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaGFuZGxlSW1wb3J0UHJvZ3Jlc3MobWVzc2FnZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbXBvcnRfY29tcGxldGVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmhhbmRsZUltcG9ydENvbXBsZXRlZChtZXNzYWdlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYOKaoO+4jyBbQnVsa1VwbG9hZF0gVW5rbm93biBtZXNzYWdlIHR5cGU6ICR7bWVzc2FnZS50eXBlfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGDimqDvuI8gW0J1bGtVcGxvYWRdIEludmFsaWQgbWVzc2FnZSBmb3JtYXQ6YCwgbWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKGNoYW5uZWxJZCwgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayk7XG4gICAgICAgIGNvbnNvbGUubG9nKGDinIUgW0J1bGtVcGxvYWRdIEV2ZW50QnVzIHN1YnNjcmlwdGlvbiBjb21wbGV0ZWQgZm9yIGNoYW5uZWw6ICR7Y2hhbm5lbElkfWApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW1wb3J0IHN0YXJ0ZWQgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEltcG9ydCBzdGFydGVkIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVJbXBvcnRTdGFydGVkKGRhdGEpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlUHJvZ3Jlc3NUZXh0KGAke2dsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGFydGVkfSAoJHtkYXRhLnRvdGFsfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9SZWNvcmRzfSlgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGltcG9ydCBwcm9ncmVzcyBldmVudFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gSW1wb3J0IHByb2dyZXNzIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVJbXBvcnRQcm9ncmVzcyhkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIFtCdWxrVXBsb2FkXSBoYW5kbGVJbXBvcnRQcm9ncmVzcyBjYWxsZWQgd2l0aCBkYXRhOicsIGRhdGEpO1xuXG4gICAgICAgIGNvbnN0IHBlcmNlbnQgPSBNYXRoLnJvdW5kKChkYXRhLnByb2Nlc3NlZCAvIGRhdGEudG90YWwpICogMTAwKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFByb2dyZXNzLnByb2dyZXNzKHtcbiAgICAgICAgICAgIHBlcmNlbnQ6IHBlcmNlbnRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGluZGl2aWR1YWwgcm93IHN0YXR1cyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoZGF0YS5jdXJyZW50UmVjb3JkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBbQnVsa1VwbG9hZF0gVXBkYXRpbmcgcm93IHN0YXR1cyBmb3I6JywgZGF0YS5jdXJyZW50UmVjb3JkKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwZGF0ZVJvd1N0YXR1cyhcbiAgICAgICAgICAgICAgICBkYXRhLmN1cnJlbnRSZWNvcmQubnVtYmVyLFxuICAgICAgICAgICAgICAgIGRhdGEuY3VycmVudFJlY29yZC5zdGF0dXMsXG4gICAgICAgICAgICAgICAgZGF0YS5jdXJyZW50UmVjb3JkLm1lc3NhZ2VcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBwcm9ncmVzcyBtZXNzYWdlIHdpdGggc2tpcHBlZCBjb3VudFxuICAgICAgICBjb25zdCBwYXJ0cyA9IFtdO1xuICAgICAgICBpZiAoZGF0YS5jcmVhdGVkID4gMCkge1xuICAgICAgICAgICAgcGFydHMucHVzaChgJHtkYXRhLmNyZWF0ZWR9ICR7Z2xvYmFsVHJhbnNsYXRlLmV4X0NyZWF0ZWR9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEudXBkYXRlZCA+IDApIHtcbiAgICAgICAgICAgIHBhcnRzLnB1c2goYCR7ZGF0YS51cGRhdGVkfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9VcGRhdGVkfWApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLnNraXBwZWQgPiAwKSB7XG4gICAgICAgICAgICBwYXJ0cy5wdXNoKGAke2RhdGEuc2tpcHBlZH0gJHtnbG9iYWxUcmFuc2xhdGUuZXhfU2tpcHBlZH1gKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5lcnJvcnMgPiAwKSB7XG4gICAgICAgICAgICBwYXJ0cy5wdXNoKGAke2RhdGEuZXJyb3JzfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9FcnJvcnN9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtZXNzYWdlID0gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFByb2dyZXNzfTogJHtkYXRhLnByb2Nlc3NlZH0vJHtkYXRhLnRvdGFsfSAoJHtwYXJ0cy5qb2luKCcsICcpfSlgO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVQcm9ncmVzc1RleHQobWVzc2FnZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbXBvcnQgY29tcGxldGVkIGV2ZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBJbXBvcnQgY29tcGxldGlvbiBkYXRhXG4gICAgICovXG4gICAgaGFuZGxlSW1wb3J0Q29tcGxldGVkKGRhdGEpIHtcblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0UHJvZ3Jlc3MucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgcGVyY2VudDogMTAwXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNob3cgY29tcGxldGlvbiBtZXNzYWdlXG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0Q29tcGxldGVkfTogJHtkYXRhLmNyZWF0ZWR9ICR7Z2xvYmFsVHJhbnNsYXRlLmV4X0NyZWF0ZWR9LCAke2RhdGEudXBkYXRlZH0gJHtnbG9iYWxUcmFuc2xhdGUuZXhfVXBkYXRlZH0sICR7ZGF0YS5za2lwcGVkfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9Ta2lwcGVkfSwgJHtkYXRhLmVycm9yc30gJHtnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JzfWA7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwZGF0ZVByb2dyZXNzVGV4dChtZXNzYWdlKTtcblxuICAgICAgICAvLyBIaWRlIGNhbmNlbCBidXR0b24gYW5kIGVudGlyZSBpbXBvcnQgY29udHJvbHMgYmxvY2sgYWZ0ZXIgY29tcGxldGlvblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY2FuY2VsSW1wb3J0UHJvY2Vzcy5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRDb250cm9scy5oaWRlKCk7XG5cbiAgICAgICAgLy8gQ2xlYXIgam9iIGRhdGFcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkID0gbnVsbDtcblxuICAgICAgICAvLyBVbnN1YnNjcmliZSBmcm9tIHByb2dyZXNzIGV2ZW50cyBhZnRlciBjb21wbGV0aW9uXG4gICAgICAgIGlmIChleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgJiYgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjaykge1xuICAgICAgICAgICAgRXZlbnRCdXMudW5zdWJzY3JpYmUoZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkLCBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydENoYW5uZWxJZCA9IG51bGw7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF1dG9tYXRpY2FsbHkgc29ydCB0YWJsZSBieSBzdGF0dXMgYWZ0ZXIgaW1wb3J0IGNvbXBsZXRpb25cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc29ydFRhYmxlQnlTdGF0dXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FuY2VsIGltcG9ydCBhbmQgcmVzZXRcbiAgICAgKi9cbiAgICBjYW5jZWxJbXBvcnQoKSB7XG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQuc2hvdygpO1xuICAgICAgICAvLyBVbnN1YnNjcmliZSBmcm9tIEV2ZW50QnVzIGlmIHN1YnNjcmliZWRcbiAgICAgICAgaWYgKGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkKSB7XG4gICAgICAgICAgICBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLnVuc3Vic2NyaWJlKGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZElkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlUGF0aCA9IG51bGw7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayA9IG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbmNlbCB0aGUgcnVubmluZyBpbXBvcnQgcHJvY2Vzc1xuICAgICAqL1xuICAgIGNhbmNlbEltcG9ydFByb2Nlc3MoKSB7XG4gICAgICAgIGlmICghZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYnV0dG9uIHRvIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3MuYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAvLyBGb3Igbm93LCBqdXN0IHN0b3AgdGhlIFVJIHVwZGF0ZXMgc2luY2Ugc2VydmVyLXNpZGUgY2FuY2VsbGF0aW9uIGlzIG5vdCBpbXBsZW1lbnRlZFxuICAgICAgICAvLyBUT0RPOiBJbXBsZW1lbnQgc2VydmVyLXNpZGUgam9iIGNhbmNlbGxhdGlvblxuXG4gICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyB0ZXh0IHdpdGggY2FuY2VsbGF0aW9uIG1lc3NhZ2VcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlUHJvZ3Jlc3NUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRDYW5jZWxsZWQpO1xuXG4gICAgICAgIC8vIEhpZGUgcHJvZ3Jlc3Mgc2VjdGlvblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcblxuICAgICAgICAvLyBTaG93IGltcG9ydCBidXR0b25zIGFnYWluXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjb25maXJtSW1wb3J0LnNob3coKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydC5zaG93KCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRTdHJhdGVneS5jbG9zZXN0KCcuZmllbGQnKS5zaG93KCk7XG5cbiAgICAgICAgLy8gVW5zdWJzY3JpYmUgZnJvbSBFdmVudEJ1c1xuICAgICAgICBpZiAoZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkICYmIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydFByb2dyZXNzQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnVuc3Vic2NyaWJlKGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydENoYW5uZWxJZCwgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciBqb2IgZGF0YVxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5jdXJyZW50Sm9iSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrID0gbnVsbDtcblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY2FuY2VsSW1wb3J0UHJvY2Vzcy5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydCBuZXcgaW1wb3J0XG4gICAgICovXG4gICAgc3RhcnROZXdJbXBvcnQoKSB7XG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdHNTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3U2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnNob3coKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVQYXRoID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5jdXJyZW50Sm9iSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrID0gbnVsbDtcblxuICAgICAgICAvLyBSZXNldCB1cGxvYWQgc3RhdGUgaGFuZGxlZCBieSBGaWxlc0FQSVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW1wb3J0IHByb2dyZXNzIGZyb20gRXZlbnRCdXNcbiAgICAgKi9cbiAgICBvbkltcG9ydFByb2dyZXNzKGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEucGVyY2VudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0UHJvZ3Jlc3MucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgIHBlcmNlbnQ6IGRhdGEucGVyY2VudFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF0YS5tZXNzYWdlKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NMYWJlbC50ZXh0KGRhdGEubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF0YS5sb2cpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwZGF0ZVByb2dyZXNzVGV4dChkYXRhLmxvZyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGltcG9ydCBjb21wbGV0aW9uXG4gICAgICovXG4gICAgb25JbXBvcnRDb21wbGV0ZShkYXRhKSB7XG4gICAgICAgIC8vIEtlZXAgdGFibGUgdmlzaWJsZSwgaGlkZSBwcm9ncmVzcyBiYXIsIHNob3cgcmVzdWx0cyBzZWN0aW9uXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRQcm9ncmVzcy5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcm9ncmVzc0xhYmVsLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3MuaGlkZSgpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcmVzdWx0c1NlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgIC8vIFNob3cgaW1wb3J0IGJ1dHRvbnMgYWdhaW4gZm9yIG5ldyBpbXBvcnRcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQuc2hvdygpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY2FuY2VsSW1wb3J0LnNob3coKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFN0cmF0ZWd5LmNsb3Nlc3QoJy5maWVsZCcpLnNob3coKTtcblxuICAgICAgICAvLyBTaG93IHJlc3VsdCBtZXNzYWdlXG4gICAgICAgIGNvbnN0IG1lc3NhZ2VDbGFzcyA9IGRhdGEuc3VjY2VzcyA/ICdwb3NpdGl2ZScgOiAnbmVnYXRpdmUnO1xuICAgICAgICBjb25zdCBtZXNzYWdlSWNvbiA9IGRhdGEuc3VjY2VzcyA/ICdjaGVjayBjaXJjbGUnIDogJ3RpbWVzIGNpcmNsZSc7XG4gICAgICAgIGxldCBtZXNzYWdlVGV4dCA9ICcnO1xuXG4gICAgICAgIGlmIChkYXRhLnN0YXRzKSB7XG4gICAgICAgICAgICBtZXNzYWdlVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdWNjZXNzXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJ3tjcmVhdGVkfScsIGRhdGEuc3RhdHMuY3JlYXRlZCB8fCAwKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKCd7c2tpcHBlZH0nLCBkYXRhLnN0YXRzLnNraXBwZWQgfHwgMClcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgne2ZhaWxlZH0nLCBkYXRhLnN0YXRzLmZhaWxlZCB8fCAwKTtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICBtZXNzYWdlVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRGYWlsZWQucmVwbGFjZSgne2Vycm9yfScsIGRhdGEuZXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdE1lc3NhZ2UuaHRtbChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiJHttZXNzYWdlQ2xhc3N9IG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIiR7bWVzc2FnZUljb259IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7ZGF0YS5zdWNjZXNzID8gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydENvbXBsZXRlIDogZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydEZhaWxlZH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHttZXNzYWdlVGV4dH08L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwcm9ncmVzcyB0ZXh0XG4gICAgICovXG4gICAgdXBkYXRlUHJvZ3Jlc3NUZXh0KG1lc3NhZ2UpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzVGV4dC50ZXh0KG1lc3NhZ2UpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHBvcnQgZW1wbG95ZWVzIHRvIENTVlxuICAgICAqL1xuICAgIGV4cG9ydEVtcGxveWVlcygpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEZvcm1hdC5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgIGNvbnN0IGZpbHRlciA9IHt9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbnVtYmVyRnJvbSA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJGcm9tLnZhbCgpO1xuICAgICAgICBjb25zdCBudW1iZXJUbyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJUby52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChudW1iZXJGcm9tKSB7XG4gICAgICAgICAgICBmaWx0ZXIubnVtYmVyX2Zyb20gPSBudW1iZXJGcm9tO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudW1iZXJUbykge1xuICAgICAgICAgICAgZmlsdGVyLm51bWJlcl90byA9IG51bWJlclRvO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIEVtcGxveWVlc0FQSS5leHBvcnRDU1YoXG4gICAgICAgICAgICBmb3JtYXQsXG4gICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXhwb3J0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZG93bmxvYWQgdXNpbmcgdGhlIGxpbmsgZnJvbSB0aGUgc2VydmVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmZpbGVuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZXNwb25zZS5kYXRhLmZpbGVuYW1lIGFscmVhZHkgY29udGFpbnMgdGhlIGZ1bGwgcGF0aCBmcm9tIHJvb3RcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzcG9uc2UuZGF0YS5maWxlbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZCBDU1YgdGVtcGxhdGVcbiAgICAgKi9cbiAgICBkb3dubG9hZFRlbXBsYXRlKCkge1xuICAgICAgICBjb25zdCBmb3JtYXQgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kdGVtcGxhdGVGb3JtYXQuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkb3dubG9hZFRlbXBsYXRlLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgRW1wbG95ZWVzQVBJLmdldFRlbXBsYXRlKFxuICAgICAgICAgICAgZm9ybWF0LFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGRvd25sb2FkVGVtcGxhdGUucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBkb3dubG9hZCB1c2luZyB0aGUgbGluayBmcm9tIHRoZSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgYWxyZWFkeSBjb250YWlucyB0aGUgZnVsbCBwYXRoIGZyb20gcm9vdFxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXNwb25zZS5kYXRhLmZpbGVuYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBmaWVsZCBkZXNjcmlwdGlvbnMgZm9yIGZvcm1hdFxuICAgICAqL1xuICAgIGdldEZvcm1hdEZpZWxkcyhmb3JtYXQpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0cyA9IHtcbiAgICAgICAgICAgIG1pbmltYWw6IFtcbiAgICAgICAgICAgICAgICAnbnVtYmVyIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE51bWJlcl9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX3VzZXJuYW1lIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFVzZXJuYW1lX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3VzZXJfZW1haWwgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRW1haWxfSGVscCxcbiAgICAgICAgICAgICAgICAnbW9iaWxlX251bWJlciAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRNb2JpbGVfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3NlY3JldCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRQYXNzd29yZF9IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfcmluZ2xlbmd0aCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdfSGVscFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHN0YW5kYXJkOiBbXG4gICAgICAgICAgICAgICAgJ251bWJlciAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGROdW1iZXJfSGVscCxcbiAgICAgICAgICAgICAgICAndXNlcl91c2VybmFtZSAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRVc2VybmFtZV9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX2VtYWlsIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEVtYWlsX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9udW1iZXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTW9iaWxlX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9kaWFsc3RyaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE1vYmlsZURpYWxzdHJpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3NlY3JldCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRQYXNzd29yZF9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfZHRtZm1vZGUgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRFRNRk1vZGVfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3RyYW5zcG9ydCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRUcmFuc3BvcnRfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX2VuYWJsZVJlY29yZGluZyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSZWNvcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX3JpbmdsZW5ndGggLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkUmluZ0xlbmd0aF9IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfZm9yd2FyZGluZyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRGb3J3YXJkaW5nX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5IC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdCdXN5X0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRGb3J3YXJkaW5nVW5hdmFpbGFibGVfSGVscFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZ1bGw6IFtcbiAgICAgICAgICAgICAgICAnbnVtYmVyIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE51bWJlcl9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX3VzZXJuYW1lIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFVzZXJuYW1lX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3VzZXJfZW1haWwgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRW1haWxfSGVscCxcbiAgICAgICAgICAgICAgICAndXNlcl9hdmF0YXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkQXZhdGFyX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9udW1iZXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTW9iaWxlX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9kaWFsc3RyaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE1vYmlsZURpYWxzdHJpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3NlY3JldCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRQYXNzd29yZF9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfZHRtZm1vZGUgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRFRNRk1vZGVfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3RyYW5zcG9ydCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRUcmFuc3BvcnRfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX2VuYWJsZVJlY29yZGluZyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSZWNvcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX21hbnVhbGF0dHJpYnV0ZXMgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTWFudWFsQXR0cmlidXRlc19IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfcmluZ2xlbmd0aCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX2ZvcndhcmRpbmdvbmJ1c3kgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRm9yd2FyZGluZ0J1c3lfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdVbmF2YWlsYWJsZV9IZWxwXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZm9ybWF0c1tmb3JtYXRdIHx8IGZvcm1hdHMuc3RhbmRhcmQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZm9ybWF0IGRlc2NyaXB0aW9uXG4gICAgICovXG4gICAgdXBkYXRlRm9ybWF0RGVzY3JpcHRpb24odHlwZSwgZm9ybWF0KSB7XG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLmdldEZvcm1hdEZpZWxkcyhmb3JtYXQpO1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gdHlwZSA9PT0gJ2V4cG9ydCcgP1xuICAgICAgICAgICAgJCgnI2V4cG9ydC1mb3JtYXQtZmllbGRzLWRlc2NyaXB0aW9uJykgOlxuICAgICAgICAgICAgJCgnI2Zvcm1hdC1maWVsZHMtZGVzY3JpcHRpb24nKTtcblxuICAgICAgICBpZiAoJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSAnPHVsIGNsYXNzPVwibGlzdFwiPicgK1xuICAgICAgICAgICAgICAgIGZpZWxkcy5tYXAoZmllbGQgPT4gYDxsaT48Y29kZT4ke2ZpZWxkfTwvY29kZT48L2xpPmApLmpvaW4oJycpICtcbiAgICAgICAgICAgICAgICAnPC91bD4nO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5odG1sKGh0bWwpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHRhYmxlIHJvd3MgdG8gcHJvY2Vzc2luZyBzdGF0dXMgKG9ubHkgZm9yIHZhbGlkIHJlY29yZHMgdGhhdCB3aWxsIGJlIHByb2Nlc3NlZClcbiAgICAgKi9cbiAgICByZXNldFRhYmxlVG9Qcm9jZXNzaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBbQnVsa1VwbG9hZF0gcmVzZXRUYWJsZVRvUHJvY2Vzc2luZyBjYWxsZWQnKTtcblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLmZpbmQoJ3Rib2R5IHRyJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5zdGF0dXMtY2VsbCcpO1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzVGV4dCA9ICRzdGF0dXNDZWxsLmZpbmQoJy5zdGF0dXMtdGV4dCcpLnRleHQoKS50cmltKCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGDwn5SNIFtCdWxrVXBsb2FkXSBSb3cgc3RhdHVzIGNoZWNrIC0gaGFzQ2xhc3MgcG9zaXRpdmU6ICR7JHJvdy5oYXNDbGFzcygncG9zaXRpdmUnKX0sIHN0YXR1c1RleHQ6ICcke3N0YXR1c1RleHR9JywgZXhwZWN0ZWRWYWxpZDogJyR7Z2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c1ZhbGlkfSdgKTtcblxuICAgICAgICAgICAgLy8gT25seSByZXNldCByb3dzIHRoYXQgaGF2ZSAndmFsaWQnIHN0YXR1cyBmcm9tIHByZXZpZXdcbiAgICAgICAgICAgIC8vIExlYXZlIGR1cGxpY2F0ZXMsIGV4aXN0cywgYW5kIGVycm9yIHJvd3MgYXMgdGhleSBhcmVcbiAgICAgICAgICAgIGlmICgkcm93Lmhhc0NsYXNzKCdwb3NpdGl2ZScpICYmIHN0YXR1c1RleHQgPT09IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNWYWxpZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDinIUgW0J1bGtVcGxvYWRdIFJlc2V0dGluZyByb3cgdG8gcHJvY2Vzc2luZyBzdGF0dXNgKTtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdG8gcHJvY2Vzc2luZyBzdGF0dXMgb25seSBmb3IgdmFsaWQgcmVjb3Jkc1xuICAgICAgICAgICAgICAgICRyb3cucmVtb3ZlQ2xhc3MoJ3Bvc2l0aXZlIG5lZ2F0aXZlIHdhcm5pbmcnKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbCgnPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT4gPHNwYW4gY2xhc3M9XCJzdGF0dXMtdGV4dFwiPicgKyBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzUHJvY2Vzc2luZyArICc8L3NwYW4+Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTb3J0IHRhYmxlIGJ5IHN0YXR1cyBjb2x1bW4gYWZ0ZXIgaW1wb3J0IGNvbXBsZXRpb25cbiAgICAgKi9cbiAgICBzb3J0VGFibGVCeVN0YXR1cygpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflIQgW0J1bGtVcGxvYWRdIFNvcnRpbmcgdGFibGUgYnkgc3RhdHVzIGFmdGVyIGltcG9ydCBjb21wbGV0aW9uJyk7XG5cbiAgICAgICAgY29uc3QgJHN0YXR1c0hlYWRlciA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGgnKS5lcSg0KTsgLy8gU3RhdHVzIGNvbHVtbiAoaW5kZXggNClcbiAgICAgICAgY29uc3QgJGFsbFRoID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5maW5kKCd0aCcpO1xuICAgICAgICBjb25zdCAkdGJvZHkgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLmZpbmQoJ3Rib2R5Jyk7XG4gICAgICAgIGNvbnN0ICRyb3dzID0gJHRib2R5LmZpbmQoJ3RyJyk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHNvcnRpbmcgY2xhc3NlcyBmcm9tIG90aGVyIGhlYWRlcnNcbiAgICAgICAgJGFsbFRoLnJlbW92ZUNsYXNzKCdzb3J0ZWQgYXNjZW5kaW5nIGRlc2NlbmRpbmcnKTtcblxuICAgICAgICAvLyBTZXQgc3RhdHVzIGNvbHVtbiBhcyBzb3J0ZWQgYXNjZW5kaW5nIChzaG93IHByb2Nlc3NlZCByZXN1bHRzIGZpcnN0KVxuICAgICAgICAkc3RhdHVzSGVhZGVyLmFkZENsYXNzKCdzb3J0ZWQgYXNjZW5kaW5nJyk7XG5cbiAgICAgICAgLy8gU29ydCByb3dzIGJ5IHN0YXR1cyBwcmlvcml0eVxuICAgICAgICBjb25zdCBzb3J0ZWRSb3dzID0gJHJvd3Muc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICBjb25zdCBhVGV4dCA9ICQoYSkuZmluZCgndGQnKS5lcSg0KS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgY29uc3QgYlRleHQgPSAkKGIpLmZpbmQoJ3RkJykuZXEoNCkudGV4dCgpLnRyaW0oKTtcblxuICAgICAgICAgICAgLy8gU3RhdHVzIG9yZGVyIHByaW9yaXR5IChjcmVhdGVkL3VwZGF0ZWQgZmlyc3QsIHRoZW4gc2tpcHBlZCwgdGhlbiBubyBjaGFuZ2VzLCB0aGVuIGVycm9ycylcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c09yZGVyID0ge1xuICAgICAgICAgICAgICAgICfQodC+0LfQtNCw0L0nOiAxLFxuICAgICAgICAgICAgICAgICfQntCx0L3QvtCy0LvQtdC9JzogMixcbiAgICAgICAgICAgICAgICAn0J/RgNC+0L/Rg9GJ0LXQvSc6IDMsXG4gICAgICAgICAgICAgICAgJ9Cj0LbQtSDRgdGD0YnQtdGB0YLQstGD0LXRgic6IDQsXG4gICAgICAgICAgICAgICAgJ9CR0LXQtyDQuNC30LzQtdC90LXQvdC40LknOiA1LFxuICAgICAgICAgICAgICAgICfQntGI0LjQsdC60LAnOiA2LFxuICAgICAgICAgICAgICAgICfQntCx0YDQsNCx0LDRgtGL0LLQsNC10YLRgdGPJzogNyAvLyBTaG91bGQgbm90IGFwcGVhciBhZnRlciBjb21wbGV0aW9uLCBidXQganVzdCBpbiBjYXNlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IHN0YXR1cyB0ZXh0IChyZW1vdmUgaWNvbiBwYXJ0KVxuICAgICAgICAgICAgY29uc3QgYVN0YXR1cyA9IHN0YXR1c09yZGVyW2FUZXh0LnNwbGl0KCcgJykuc2xpY2UoMSkuam9pbignICcpXSB8fCA5OTk7XG4gICAgICAgICAgICBjb25zdCBiU3RhdHVzID0gc3RhdHVzT3JkZXJbYlRleHQuc3BsaXQoJyAnKS5zbGljZSgxKS5qb2luKCcgJyldIHx8IDk5OTtcblxuICAgICAgICAgICAgcmV0dXJuIGFTdGF0dXMgLSBiU3RhdHVzOyAvLyBBc2NlbmRpbmcgb3JkZXJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHdpdGggc29ydGVkIHJvd3NcbiAgICAgICAgJHRib2R5LmVtcHR5KCkuYXBwZW5kKHNvcnRlZFJvd3MpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgW0J1bGtVcGxvYWRdIFRhYmxlIHNvcnRlZCBieSBzdGF0dXMgLSBwcm9jZXNzZWQgcmVjb3JkcyBzaG93biBmaXJzdCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaW5kaXZpZHVhbCByb3cgc3RhdHVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc3RhdHVzIC0gTmV3IHN0YXR1cyAoY3JlYXRlZCwgdXBkYXRlZCwgc2tpcHBlZCwgZXJyb3IpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBTdGF0dXMgbWVzc2FnZVxuICAgICAqL1xuICAgIHVwZGF0ZVJvd1N0YXR1cyhudW1iZXIsIHN0YXR1cywgbWVzc2FnZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhg8J+UhCBbQnVsa1VwbG9hZF0gdXBkYXRlUm93U3RhdHVzIGNhbGxlZCBmb3IgbnVtYmVyOiAke251bWJlcn0sIHN0YXR1czogJHtzdGF0dXN9LCBtZXNzYWdlOiAke21lc3NhZ2V9YCk7XG5cbiAgICAgICAgY29uc3QgJHJvdyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZChgdGJvZHkgdHJbZGF0YS1udW1iZXI9XCIke251bWJlcn1cIl1gKTtcbiAgICAgICAgaWYgKCRyb3cubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYOKaoO+4jyBbQnVsa1VwbG9hZF0gTm8gcm93IGZvdW5kIGZvciBudW1iZXI6ICR7bnVtYmVyfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5zdGF0dXMtY2VsbCcpO1xuXG4gICAgICAgIGxldCBzdGF0dXNDbGFzcywgc3RhdHVzSWNvbiwgc3RhdHVzVGV4dDtcblxuICAgICAgICBzd2l0Y2goc3RhdHVzKSB7XG4gICAgICAgICAgICBjYXNlICdjcmVhdGVkJzpcbiAgICAgICAgICAgIGNhc2UgJ3VwZGF0ZWQnOlxuICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ3Bvc2l0aXZlJztcbiAgICAgICAgICAgICAgICBzdGF0dXNJY29uID0gJ2NoZWNrIGNpcmNsZSBncmVlbic7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IHN0YXR1cyA9PT0gJ2NyZWF0ZWQnID8gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c0NyZWF0ZWQgOiBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzVXBkYXRlZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NraXBwZWQnOlxuICAgICAgICAgICAgY2FzZSAnZXhpc3RzJzogLy8gSGFuZGxlIFwiZXhpc3RzXCIgc3RhdHVzIGZyb20gYmFja2VuZFxuICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ3dhcm5pbmcnO1xuICAgICAgICAgICAgICAgIHN0YXR1c0ljb24gPSAnbWludXMgY2lyY2xlIHllbGxvdyc7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IHN0YXR1cyA9PT0gJ2V4aXN0cycgPyBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzRXhpc3RzIDogZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c1NraXBwZWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdub19jaGFuZ2VzJzpcbiAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICdkaXNhYmxlZCc7XG4gICAgICAgICAgICAgICAgc3RhdHVzSWNvbiA9ICdtaW51cyBjaXJjbGUgZ3JleSc7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNOb0NoYW5nZXM7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnbmVnYXRpdmUnO1xuICAgICAgICAgICAgICAgIHN0YXR1c0ljb24gPSAndGltZXMgY2lyY2xlIHJlZCc7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNFcnJvcjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnYWN0aXZlJztcbiAgICAgICAgICAgICAgICBzdGF0dXNJY29uID0gJ3NwaW5uZXIgbG9hZGluZyc7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNQcm9jZXNzaW5nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHJvdyBjbGFzcyBhbmQgc3RhdHVzXG4gICAgICAgICRyb3cucmVtb3ZlQ2xhc3MoJ3Bvc2l0aXZlIG5lZ2F0aXZlIHdhcm5pbmcgYWN0aXZlIGRpc2FibGVkJykuYWRkQ2xhc3Moc3RhdHVzQ2xhc3MpO1xuICAgICAgICAvLyBTdXJmYWNlIGJhY2tlbmQgZXJyb3IgbWVzc2FnZSBpbmxpbmUgKGlzc3VlICM5OTYpIOKAlCBlc2NhcGUgdmlhIGpRdWVyeSAudGV4dCgpIHRvIHByZXZlbnQgWFNTLlxuICAgICAgICBsZXQgZGV0YWlsSHRtbCA9ICcnO1xuICAgICAgICBpZiAoc3RhdHVzID09PSAnZXJyb3InICYmIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGNvbnN0IHNhZmVNZXNzYWdlID0gJCgnPGRpdj4nKS50ZXh0KG1lc3NhZ2UpLmh0bWwoKTtcbiAgICAgICAgICAgIGRldGFpbEh0bWwgPSBgIDxzcGFuIGNsYXNzPVwic3RhdHVzLWRldGFpbFwiPuKAlCAke3NhZmVNZXNzYWdlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgJHN0YXR1c0NlbGwuYXR0cigndGl0bGUnLCBtZXNzYWdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzdGF0dXNDZWxsLnJlbW92ZUF0dHIoJ3RpdGxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChgPGkgY2xhc3M9XCIke3N0YXR1c0ljb259IGljb25cIj48L2k+IDxzcGFuIGNsYXNzPVwic3RhdHVzLXRleHRcIj4ke3N0YXR1c1RleHR9PC9zcGFuPiR7ZGV0YWlsSHRtbH1gKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhg4pyFIFtCdWxrVXBsb2FkXSBVcGRhdGVkIHJvdyAke251bWJlcn0gdG8gc3RhdHVzOiAke3N0YXR1c1RleHR9LCBjbGFzczogJHtzdGF0dXNDbGFzc31gKTtcblxuICAgICAgICAvLyBOb3RlOiBSZW1vdmVkIGF1dG9tYXRpYyBzY3JvbGxpbmcgdG8gcHJldmVudCBwYWdlIGp1bXBpbmcgZHVyaW5nIHByb2Nlc3NpbmdcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zb2xlLmxvZygn8J+agCBbQnVsa1VwbG9hZF0gRG9jdW1lbnQgcmVhZHksIHN0YXJ0aW5nIG1vZHVsZSBpbml0aWFsaXphdGlvbicpO1xuICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==