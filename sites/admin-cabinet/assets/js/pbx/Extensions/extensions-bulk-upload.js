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
  $progressText: $('#progress-text'),
  $resultMessage: $('#result-message'),
  $totalCount: $('#total-count'),
  $validCount: $('#valid-count'),
  $duplicateCount: $('#duplicate-count'),
  $errorCount: $('#error-count'),
  $confirmImport: $('#confirm-import'),
  $cancelImport: $('#cancel-import'),
  $cancelImportProcess: $('#cancel-import-process'),
  $newImport: $('#new-import'),
  $importControls: $('#import-controls'),
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
  uploadedFileId: null,
  currentJobId: null,
  importChannelId: null,
  importProgressCallback: null,
  previewDataTable: null,

  /**
   * Initialize the module
   */
  initialize: function initialize() {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtYnVsay11cGxvYWQuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0J1bGtVcGxvYWQiLCIkdXBsb2FkQnV0dG9uIiwiJCIsIiR1cGxvYWRTZWdtZW50IiwiJHByZXZpZXdTZWN0aW9uIiwiJHByb2dyZXNzU2VjdGlvbiIsIiRyZXN1bHRzU2VjdGlvbiIsIiRwcmV2aWV3VGFibGUiLCIkaW1wb3J0UHJvZ3Jlc3MiLCIkcHJvZ3Jlc3NMYWJlbCIsIiRwcm9ncmVzc1RleHQiLCIkcmVzdWx0TWVzc2FnZSIsIiR0b3RhbENvdW50IiwiJHZhbGlkQ291bnQiLCIkZHVwbGljYXRlQ291bnQiLCIkZXJyb3JDb3VudCIsIiRjb25maXJtSW1wb3J0IiwiJGNhbmNlbEltcG9ydCIsIiRjYW5jZWxJbXBvcnRQcm9jZXNzIiwiJG5ld0ltcG9ydCIsIiRpbXBvcnRDb250cm9scyIsIiRleHBvcnRCdXR0b24iLCIkZG93bmxvYWRUZW1wbGF0ZSIsIiRpbXBvcnRTdHJhdGVneSIsIiRleHBvcnRGb3JtYXQiLCIkdGVtcGxhdGVGb3JtYXQiLCIkbnVtYmVyRnJvbSIsIiRudW1iZXJUbyIsInVwbG9hZElkIiwidXBsb2FkZWRGaWxlUGF0aCIsInVwbG9hZGVkRmlsZUlkIiwiY3VycmVudEpvYklkIiwiaW1wb3J0Q2hhbm5lbElkIiwiaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayIsInByZXZpZXdEYXRhVGFibGUiLCJpbml0aWFsaXplIiwiY29uc29sZSIsImxvZyIsInRhYiIsIm9uVmlzaWJsZSIsInJlbW92ZSIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInVwZGF0ZUZvcm1hdERlc2NyaXB0aW9uIiwiaW5pdGlhbGl6ZUZpbGVVcGxvYWQiLCJvbiIsImNvbmZpcm1JbXBvcnQiLCJjYW5jZWxJbXBvcnQiLCJjYW5jZWxJbXBvcnRQcm9jZXNzIiwic3RhcnROZXdJbXBvcnQiLCJleHBvcnRFbXBsb3llZXMiLCJkb3dubG9hZFRlbXBsYXRlIiwiRXZlbnRCdXMiLCJzdWJzY3JpYmUiLCJvbkltcG9ydFByb2dyZXNzIiwib25JbXBvcnRDb21wbGV0ZSIsIndpbmRvdyIsImxvY2F0aW9uIiwiaGFzaCIsInN1YnN0cmluZyIsImNsaWNrIiwibGVuZ3RoIiwiZXJyb3IiLCJ1cGxvYWRCdXR0b24iLCJ1cGxvYWRTZWdtZW50IiwiRmlsZXNBUEkiLCJhdHRhY2hUb0J0biIsImNiVXBsb2FkUmVzdW1hYmxlIiwiYWN0aW9uIiwicGFyYW1zIiwiZmlsZU5hbWUiLCJmaWxlIiwibmFtZSIsImZpbGVTaXplIiwic2l6ZSIsImZpbGVUeXBlIiwidHlwZSIsImFkZENsYXNzIiwicHJvZ3Jlc3MiLCJNYXRoIiwicm91bmQiLCJyZXNwb25zZSIsInJlc3VsdCIsIlBieEFwaSIsInRyeVBhcnNlSlNPTiIsImRhdGEiLCJ1cGxvYWRfaWQiLCJmaWxlbmFtZSIsImZpbGVQYXRoIiwiY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyIsImhhc0RhdGEiLCJoYXNVcGxvYWRJZCIsImVycm9yTWVzc2FnZXMiLCJtZXNzYWdlcyIsInJlc3VsdFJlc3VsdCIsInJhd1Jlc3BvbnNlIiwiZXJyb3JNZXNzYWdlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfRmlsZVVwbG9hZEVycm9yIiwiQXJyYXkiLCJpc0FycmF5Iiwiam9pbiIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlIiwidW5kZWZpbmVkIiwianNvbiIsIkpTT04iLCJwYXJzZSIsIkZpbGVVcGxvYWRFdmVudEhhbmRsZXIiLCJvbk1lcmdlU3RhcnRlZCIsIm9uTWVyZ2VQcm9ncmVzcyIsIm9uTWVyZ2VDb21wbGV0ZSIsInByZXZpZXdJbXBvcnQiLCJvbkVycm9yIiwiZF9zdGF0dXMiLCJzdHJhdGVneSIsIkVtcGxveWVlc0FQSSIsImltcG9ydENTViIsInNob3dQcmV2aWV3IiwidGV4dCIsInRvdGFsIiwidmFsaWQiLCJkdXBsaWNhdGVzIiwiZXJyb3JzIiwiZGVzdHJveSIsIiR0Ym9keSIsImZpbmQiLCJlbXB0eSIsInByZXZpZXciLCJmb3JFYWNoIiwicm93Iiwic3RhdHVzQ2xhc3MiLCJzdGF0dXMiLCJzdGF0dXNJY29uIiwic3RhdHVzVGV4dCIsImV4X0ltcG9ydFN0YXR1c1ZhbGlkIiwiZXhfSW1wb3J0U3RhdHVzRHVwbGljYXRlIiwiZXhfSW1wb3J0U3RhdHVzRXhpc3RzIiwiZXhfSW1wb3J0U3RhdHVzRXJyb3IiLCJleF9JbXBvcnRTdGF0dXNJbnZhbGlkIiwiJHJvdyIsIm51bWJlciIsInVzZXJfdXNlcm5hbWUiLCJtb2JpbGVfbnVtYmVyIiwidXNlcl9lbWFpbCIsImFwcGVuZCIsImVhY2giLCJpbmRleCIsIiR0aCIsIiRhbGxUaCIsIiRyb3dzIiwiaXNBc2NlbmRpbmciLCJoYXNDbGFzcyIsInNvcnRlZFJvd3MiLCJzb3J0IiwiYSIsImIiLCJhVGV4dCIsImVxIiwidHJpbSIsImJUZXh0Iiwic3RhdHVzT3JkZXIiLCJhU3RhdHVzIiwic3BsaXQiLCJzbGljZSIsImJTdGF0dXMiLCJvZmYiLCJoaWRlIiwic2hvdyIsImNsb3Nlc3QiLCJqb2JJZCIsImNoYW5uZWxJZCIsInBlcmNlbnQiLCJleF9JbXBvcnRTdGFydGVkIiwic3Vic2NyaWJlVG9JbXBvcnRQcm9ncmVzcyIsInNldFRpbWVvdXQiLCJyZXNldFRhYmxlVG9Qcm9jZXNzaW5nIiwiaGFuZGxlSW1wb3J0U3RhcnRlZCIsImhhbmRsZUltcG9ydFByb2dyZXNzIiwiaGFuZGxlSW1wb3J0Q29tcGxldGVkIiwid2FybiIsInVwZGF0ZVByb2dyZXNzVGV4dCIsImV4X1JlY29yZHMiLCJwcm9jZXNzZWQiLCJjdXJyZW50UmVjb3JkIiwidXBkYXRlUm93U3RhdHVzIiwicGFydHMiLCJjcmVhdGVkIiwicHVzaCIsImV4X0NyZWF0ZWQiLCJ1cGRhdGVkIiwiZXhfVXBkYXRlZCIsInNraXBwZWQiLCJleF9Ta2lwcGVkIiwiZXhfRXJyb3JzIiwiZXhfSW1wb3J0UHJvZ3Jlc3MiLCJleF9JbXBvcnRDb21wbGV0ZWQiLCJ1bnN1YnNjcmliZSIsInNvcnRUYWJsZUJ5U3RhdHVzIiwiZXhfSW1wb3J0Q2FuY2VsbGVkIiwibWVzc2FnZUNsYXNzIiwic3VjY2VzcyIsIm1lc3NhZ2VJY29uIiwibWVzc2FnZVRleHQiLCJzdGF0cyIsImV4X0ltcG9ydFN1Y2Nlc3MiLCJyZXBsYWNlIiwiZmFpbGVkIiwiZXhfSW1wb3J0RmFpbGVkIiwiaHRtbCIsImV4X0ltcG9ydENvbXBsZXRlIiwiZm9ybWF0IiwiZmlsdGVyIiwibnVtYmVyRnJvbSIsInZhbCIsIm51bWJlclRvIiwibnVtYmVyX2Zyb20iLCJudW1iZXJfdG8iLCJleHBvcnRDU1YiLCJocmVmIiwiZ2V0VGVtcGxhdGUiLCJnZXRGb3JtYXRGaWVsZHMiLCJmb3JtYXRzIiwibWluaW1hbCIsImV4X0ZpZWxkTnVtYmVyX0hlbHAiLCJleF9GaWVsZFVzZXJuYW1lX0hlbHAiLCJleF9GaWVsZEVtYWlsX0hlbHAiLCJleF9GaWVsZE1vYmlsZV9IZWxwIiwiZXhfRmllbGRQYXNzd29yZF9IZWxwIiwiZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAiLCJleF9GaWVsZEZvcndhcmRpbmdfSGVscCIsInN0YW5kYXJkIiwiZXhfRmllbGRNb2JpbGVEaWFsc3RyaW5nX0hlbHAiLCJleF9GaWVsZERUTUZNb2RlX0hlbHAiLCJleF9GaWVsZFRyYW5zcG9ydF9IZWxwIiwiZXhfRmllbGRSZWNvcmRpbmdfSGVscCIsImV4X0ZpZWxkRm9yd2FyZGluZ0J1c3lfSGVscCIsImV4X0ZpZWxkRm9yd2FyZGluZ1VuYXZhaWxhYmxlX0hlbHAiLCJmdWxsIiwiZXhfRmllbGRBdmF0YXJfSGVscCIsImV4X0ZpZWxkTWFudWFsQXR0cmlidXRlc19IZWxwIiwiZmllbGRzIiwiJGNvbnRhaW5lciIsIm1hcCIsImZpZWxkIiwiJHN0YXR1c0NlbGwiLCJleF9JbXBvcnRTdGF0dXNQcm9jZXNzaW5nIiwiJHN0YXR1c0hlYWRlciIsImV4X0ltcG9ydFN0YXR1c0NyZWF0ZWQiLCJleF9JbXBvcnRTdGF0dXNVcGRhdGVkIiwiZXhfSW1wb3J0U3RhdHVzU2tpcHBlZCIsImV4X0ltcG9ydFN0YXR1c05vQ2hhbmdlcyIsImRldGFpbEh0bWwiLCJzYWZlTWVzc2FnZSIsImF0dHIiLCJyZW1vdmVBdHRyIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsb0JBQW9CLEdBQUc7QUFDekI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBSlM7QUFLekJDLEVBQUFBLGNBQWMsRUFBRUQsQ0FBQyxDQUFDLGlCQUFELENBTFE7QUFNekJFLEVBQUFBLGVBQWUsRUFBRUYsQ0FBQyxDQUFDLGtCQUFELENBTk87QUFPekJHLEVBQUFBLGdCQUFnQixFQUFFSCxDQUFDLENBQUMsbUJBQUQsQ0FQTTtBQVF6QkksRUFBQUEsZUFBZSxFQUFFSixDQUFDLENBQUMsa0JBQUQsQ0FSTztBQVN6QkssRUFBQUEsYUFBYSxFQUFFTCxDQUFDLENBQUMsZ0JBQUQsQ0FUUztBQVV6Qk0sRUFBQUEsZUFBZSxFQUFFTixDQUFDLENBQUMsa0JBQUQsQ0FWTztBQVd6Qk8sRUFBQUEsY0FBYyxFQUFFUCxDQUFDLENBQUMsaUJBQUQsQ0FYUTtBQVl6QlEsRUFBQUEsYUFBYSxFQUFFUixDQUFDLENBQUMsZ0JBQUQsQ0FaUztBQWF6QlMsRUFBQUEsY0FBYyxFQUFFVCxDQUFDLENBQUMsaUJBQUQsQ0FiUTtBQWN6QlUsRUFBQUEsV0FBVyxFQUFFVixDQUFDLENBQUMsY0FBRCxDQWRXO0FBZXpCVyxFQUFBQSxXQUFXLEVBQUVYLENBQUMsQ0FBQyxjQUFELENBZlc7QUFnQnpCWSxFQUFBQSxlQUFlLEVBQUVaLENBQUMsQ0FBQyxrQkFBRCxDQWhCTztBQWlCekJhLEVBQUFBLFdBQVcsRUFB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OUQsQ0FBdUV3RCxXQUF2RSxFQTNDcUMsQ0E0Q3JDOztBQUNBLFFBQUl5SCxVQUFVLEdBQUcsRUFBakI7O0FBQ0EsUUFBSXhILE1BQU0sS0FBSyxPQUFYLElBQXNCN0IsT0FBMUIsRUFBbUM7QUFDL0IsVUFBTXNKLFdBQVcsR0FBRzlQLENBQUMsQ0FBQyxPQUFELENBQUQsQ0FBV3dILElBQVgsQ0FBZ0JoQixPQUFoQixFQUF5QjBHLElBQXpCLEVBQXBCO0FBQ0EyQyxNQUFBQSxVQUFVLG1EQUFxQ0MsV0FBckMsWUFBVjtBQUNBUixNQUFBQSxXQUFXLENBQUNTLElBQVosQ0FBaUIsT0FBakIsRUFBMEJ2SixPQUExQjtBQUNILEtBSkQsTUFJTztBQUNIOEksTUFBQUEsV0FBVyxDQUFDVSxVQUFaLENBQXVCLE9BQXZCO0FBQ0g7O0FBQ0RWLElBQUFBLFdBQVcsQ0FBQ3BDLElBQVosc0JBQThCNUUsVUFBOUIsc0RBQWlGQyxVQUFqRixvQkFBcUdzSCxVQUFyRztBQUVBM04sSUFBQUEsT0FBTyxDQUFDQyxHQUFSLDJDQUEwQzJHLE1BQTFDLHlCQUErRFAsVUFBL0Qsc0JBQXFGSCxXQUFyRixHQXZEcUMsQ0F5RHJDO0FBQ0g7QUF0L0J3QixDQUE3QixDLENBeS9CQTs7QUFDQXBJLENBQUMsQ0FBQ2lRLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJoTyxFQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxnRUFBWjtBQUNBckMsRUFBQUEsb0JBQW9CLENBQUNtQyxVQUFyQjtBQUNILENBSEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgUGJ4QXBpLCBFbXBsb3llZXNBUEksIEV2ZW50QnVzLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRmlsZVVwbG9hZEV2ZW50SGFuZGxlciwgRmlsZXNBUEkgKi9cblxuLyoqXG4gKiBUaGUgZXh0ZW5zaW9uc0J1bGtVcGxvYWQgbW9kdWxlIGhhbmRsZXMgQ1NWIGltcG9ydC9leHBvcnQgZnVuY3Rpb25hbGl0eSBmb3IgZW1wbG95ZWVzXG4gKiBAbW9kdWxlIGV4dGVuc2lvbnNCdWxrVXBsb2FkXG4gKi9cbmNvbnN0IGV4dGVuc2lvbnNCdWxrVXBsb2FkID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBlbGVtZW50c1xuICAgICAqL1xuICAgICR1cGxvYWRCdXR0b246ICQoJyN1cGxvYWQtYnV0dG9uJyksXG4gICAgJHVwbG9hZFNlZ21lbnQ6ICQoJyN1cGxvYWQtc2VnbWVudCcpLFxuICAgICRwcmV2aWV3U2VjdGlvbjogJCgnI3ByZXZpZXctc2VjdGlvbicpLFxuICAgICRwcm9ncmVzc1NlY3Rpb246ICQoJyNwcm9ncmVzcy1zZWN0aW9uJyksXG4gICAgJHJlc3VsdHNTZWN0aW9uOiAkKCcjcmVzdWx0cy1zZWN0aW9uJyksXG4gICAgJHByZXZpZXdUYWJsZTogJCgnI3ByZXZpZXctdGFibGUnKSxcbiAgICAkaW1wb3J0UHJvZ3Jlc3M6ICQoJyNpbXBvcnQtcHJvZ3Jlc3MnKSxcbiAgICAkcHJvZ3Jlc3NMYWJlbDogJCgnI3Byb2dyZXNzLWxhYmVsJyksXG4gICAgJHByb2dyZXNzVGV4dDogJCgnI3Byb2dyZXNzLXRleHQnKSxcbiAgICAkcmVzdWx0TWVzc2FnZTogJCgnI3Jlc3VsdC1tZXNzYWdlJyksXG4gICAgJHRvdGFsQ291bnQ6ICQoJyN0b3RhbC1jb3VudCcpLFxuICAgICR2YWxpZENvdW50OiAkKCcjdmFsaWQtY291bnQnKSxcbiAgICAkZHVwbGljYXRlQ291bnQ6ICQoJyNkdXBsaWNhdGUtY291bnQnKSxcbiAgICAkZXJyb3JDb3VudDogJCgnI2Vycm9yLWNvdW50JyksXG4gICAgJGNvbmZpcm1JbXBvcnQ6ICQoJyNjb25maXJtLWltcG9ydCcpLFxuICAgICRjYW5jZWxJbXBvcnQ6ICQoJyNjYW5jZWwtaW1wb3J0JyksXG4gICAgJGNhbmNlbEltcG9ydFByb2Nlc3M6ICQoJyNjYW5jZWwtaW1wb3J0LXByb2Nlc3MnKSxcbiAgICAkbmV3SW1wb3J0OiAkKCcjbmV3LWltcG9ydCcpLFxuICAgICRpbXBvcnRDb250cm9sczogJCgnI2ltcG9ydC1jb250cm9scycpLFxuICAgICRleHBvcnRCdXR0b246ICQoJyNleHBvcnQtYnV0dG9uJyksXG4gICAgJGRvd25sb2FkVGVtcGxhdGU6ICQoJyNkb3dubG9hZC10ZW1wbGF0ZScpLFxuICAgICRpbXBvcnRTdHJhdGVneTogJCgnI2ltcG9ydC1zdHJhdGVneScpLFxuICAgICRleHBvcnRGb3JtYXQ6ICQoJyNleHBvcnQtZm9ybWF0JyksXG4gICAgJHRlbXBsYXRlRm9ybWF0OiAkKCcjdGVtcGxhdGUtZm9ybWF0JyksXG4gICAgJG51bWJlckZyb206ICQoJyNudW1iZXItZnJvbScpLFxuICAgICRudW1iZXJUbzogJCgnI251bWJlci10bycpLFxuXG4gICAgLyoqXG4gICAgICogQ3VycmVudCB1cGxvYWQgZGF0YVxuICAgICAqL1xuICAgIHVwbG9hZElkOiBudWxsLFxuICAgIHVwbG9hZGVkRmlsZVBhdGg6IG51bGwsXG4gICAgdXBsb2FkZWRGaWxlSWQ6IG51bGwsXG4gICAgY3VycmVudEpvYklkOiBudWxsLFxuICAgIGltcG9ydENoYW5uZWxJZDogbnVsbCxcbiAgICBpbXBvcnRQcm9ncmVzc0NhbGxiYWNrOiBudWxsLFxuICAgIHByZXZpZXdEYXRhVGFibGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+OryBbQnVsa1VwbG9hZF0gTW9kdWxlIGluaXRpYWxpemF0aW9uIHN0YXJ0ZWQnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnMgd2l0aCBldmVudCBoYW5kbGVyIHRvIGNsZWFyIG1lc3NhZ2VzXG4gICAgICAgICQoJyNidWxrLXRhYnMgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+Rge+4jyBbQnVsa1VwbG9hZF0gVGFiIHZpc2libGUgZXZlbnQnKTtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgZXJyb3IgbWVzc2FnZXMgd2hlbiBzd2l0Y2hpbmcgdGFic1xuICAgICAgICAgICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFN0cmF0ZWd5LmRyb3Bkb3duKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRleHBvcnRGb3JtYXQuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlRm9ybWF0RGVzY3JpcHRpb24oJ2V4cG9ydCcsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR0ZW1wbGF0ZUZvcm1hdC5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVGb3JtYXREZXNjcmlwdGlvbigndGVtcGxhdGUnLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBpbml0aWFsIGZvcm1hdCBkZXNjcmlwdGlvbnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlRm9ybWF0RGVzY3JpcHRpb24oJ2V4cG9ydCcsICdzdGFuZGFyZCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVGb3JtYXREZXNjcmlwdGlvbigndGVtcGxhdGUnLCAnc3RhbmRhcmQnKTtcblxuICAgICAgICAvLyBTZXQgdXAgZmlsZSB1cGxvYWRcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW5pdGlhbGl6ZUZpbGVVcGxvYWQoKTtcblxuICAgICAgICAvLyBTZXQgdXAgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY29uZmlybUltcG9ydCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjYW5jZWxJbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY2FuY2VsSW1wb3J0KTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3Mub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY2FuY2VsSW1wb3J0UHJvY2Vzcyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRuZXdJbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc3RhcnROZXdJbXBvcnQpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXhwb3J0QnV0dG9uLm9uKCdjbGljaycsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmV4cG9ydEVtcGxveWVlcyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkb3dubG9hZFRlbXBsYXRlLm9uKCdjbGljaycsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmRvd25sb2FkVGVtcGxhdGUpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgaW1wb3J0IHByb2dyZXNzXG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnaW1wb3J0X3Byb2dyZXNzJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQub25JbXBvcnRQcm9ncmVzcyk7XG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnaW1wb3J0X2NvbXBsZXRlJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQub25JbXBvcnRDb21wbGV0ZSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgVVJMIGhhc2ggdG8gYWN0aXZhdGUgY29ycmVjdCB0YWJcbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG4gICAgICAgICAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJcgW0J1bGtVcGxvYWRdIEFjdGl2YXRpbmcgdGFiIGZyb20gaGFzaCcsIHsgaGFzaCB9KTtcbiAgICAgICAgICAgICQoYCNidWxrLXRhYnMgLml0ZW1bZGF0YS10YWI9XCIke2hhc2h9XCJdYCkuY2xpY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgW0J1bGtVcGxvYWRdIE1vZHVsZSBpbml0aWFsaXphdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmlsZSB1cGxvYWQgdXNpbmcgRmlsZXNBUEkuYXR0YWNoVG9CdG4gZm9yIGNvbnNpc3RlbnQgYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmlsZVVwbG9hZCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflKcgW0J1bGtVcGxvYWRdIEluaXRpYWxpemluZyBmaWxlIHVwbG9hZCBmdW5jdGlvbmFsaXR5Jyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZWxlbWVudHMgZXhpc3QgYmVmb3JlIGluaXRpYWxpemluZ1xuICAgICAgICBpZiAoIWV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRCdXR0b24ubGVuZ3RoIHx8ICFleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBbQnVsa1VwbG9hZF0gVXBsb2FkIGVsZW1lbnRzIG5vdCBmb3VuZCcsIHtcbiAgICAgICAgICAgICAgICB1cGxvYWRCdXR0b246IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRCdXR0b24ubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHVwbG9hZFNlZ21lbnQ6IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50Lmxlbmd0aFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBVcGxvYWQgZWxlbWVudHMgbm90IGZvdW5kLCBza2lwcGluZyBmaWxlIHVwbG9hZCBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJ+KchSBbQnVsa1VwbG9hZF0gVXBsb2FkIGVsZW1lbnRzIGZvdW5kJywge1xuICAgICAgICAgICAgdXBsb2FkQnV0dG9uOiBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkQnV0dG9uLmxlbmd0aCxcbiAgICAgICAgICAgIHVwbG9hZFNlZ21lbnQ6IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50Lmxlbmd0aFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVc2UgRmlsZXNBUEkuYXR0YWNoVG9CdG4gZm9yIHVuaWZpZWQgZmlsZSB1cGxvYWQgaGFuZGxpbmdcbiAgICAgICAgLy8gVGhpcyBhdHRhY2hlcyBkaXJlY3RseSB0byB0aGUgYnV0dG9uIGFuZCBoYW5kbGVzIGZpbGUgc2VsZWN0aW9uIGludGVybmFsbHlcbiAgICAgICAgRmlsZXNBUEkuYXR0YWNoVG9CdG4oJ3VwbG9hZC1idXR0b24nLCBbJ2NzdiddLCBleHRlbnNpb25zQnVsa1VwbG9hZC5jYlVwbG9hZFJlc3VtYWJsZSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ+KchSBbQnVsa1VwbG9hZF0gRmlsZSB1cGxvYWQgYXR0YWNoZWQgdG8gYnV0dG9uIFwidXBsb2FkLWJ1dHRvblwiIHdpdGggQ1NWIGZpbHRlcicpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgZmlsZSB1cGxvYWQgd2l0aCBjaHVua3MgYW5kIG1lcmdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHBlcmZvcm1lZCBkdXJpbmcgdGhlIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHJlbGF0ZWQgdG8gdGhlIHVwbG9hZC5cbiAgICAgKi9cbiAgICBjYlVwbG9hZFJlc3VtYWJsZShhY3Rpb24sIHBhcmFtcykge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+TpSBbQnVsa1VwbG9hZF0gVXBsb2FkIGNhbGxiYWNrIHRyaWdnZXJlZCcsIHtcbiAgICAgICAgICAgIGFjdGlvbjogYWN0aW9uLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2ZpbGVBZGRlZCc6XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgW0J1bGtVcGxvYWRdIEZpbGUgYWRkZWQgZXZlbnQnLCB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lOiBwYXJhbXMuZmlsZT8uZmlsZU5hbWUgfHwgcGFyYW1zLmZpbGU/Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGZpbGVTaXplOiBwYXJhbXMuZmlsZT8uc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgZmlsZVR5cGU6IHBhcmFtcy5maWxlPy5maWxlPy50eXBlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWRTdGFydCc6XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CfmoAgW0J1bGtVcGxvYWRdIFVwbG9hZCBzdGFydGVkJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2ZpbGVQcm9ncmVzcyc6XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBwYXJhbXMuZmlsZSA/IE1hdGgucm91bmQocGFyYW1zLmZpbGUucHJvZ3Jlc3MoKSAqIDEwMCkgOiAwO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OIIFtCdWxrVXBsb2FkXSBVcGxvYWQgcHJvZ3Jlc3MnLCB7XG4gICAgICAgICAgICAgICAgICAgIHByb2dyZXNzOiBwcm9ncmVzcyArICclJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZmlsZVN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgW0J1bGtVcGxvYWRdIFVwbG9hZCBzdWNjZXNzJywge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZTogcGFyYW1zLnJlc3BvbnNlXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBQYnhBcGkudHJ5UGFyc2VKU09OKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4sgW0J1bGtVcGxvYWRdIFBhcnNlZCByZXNwb25zZScsIHsgcmVzdWx0IH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UgJiYgcmVzdWx0LmRhdGEgJiYgcmVzdWx0LmRhdGEudXBsb2FkX2lkKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkID0gcmVzdWx0LmRhdGEudXBsb2FkX2lkO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVQYXRoID0gcmVzdWx0LmRhdGEuZmlsZW5hbWU7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfkr4gW0J1bGtVcGxvYWRdIEZpbGUgZGF0YSBzYXZlZCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZElkOiBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVQYXRoXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgW0J1bGtVcGxvYWRdIEludmFsaWQgcmVzcG9uc2UgZm9ybWF0Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZXN1bHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNEYXRhOiByZXN1bHQgPyAhIXJlc3VsdC5kYXRhIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNVcGxvYWRJZDogcmVzdWx0Py5kYXRhPy51cGxvYWRfaWQgfHwgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2VzOiByZXN1bHQ/Lm1lc3NhZ2VzIHx8ICdObyBlcnJvciBtZXNzYWdlcycsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRSZXN1bHQ6IHJlc3VsdD8ucmVzdWx0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmF3UmVzcG9uc2U6IHBhcmFtcy5yZXNwb25zZVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG1vcmUgc3BlY2lmaWMgZXJyb3IgbWVzc2FnZSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5leF9GaWxlVXBsb2FkRXJyb3I7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gcmVzdWx0Lm1lc3NhZ2VzLmVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign8J+aqCBbQnVsa1VwbG9hZF0gU2VydmVyIGVycm9yIG1lc3NhZ2U6JywgcmVzdWx0Lm1lc3NhZ2VzLmVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgJiYgcmVzdWx0Lm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfwn5qoIFtCdWxrVXBsb2FkXSBTZXJ2ZXIgbWVzc2FnZXM6JywgcmVzdWx0Lm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzdWx0Lm1lc3NhZ2VzID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IHJlc3VsdC5tZXNzYWdlcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShyZXN1bHQubWVzc2FnZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gcmVzdWx0Lm1lc3NhZ2VzLmpvaW4oJywgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdmaWxlRXJyb3InOlxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBbQnVsa1VwbG9hZF0gRmlsZSBlcnJvcicsIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWU6IHBhcmFtcy5maWxlPy5maWxlTmFtZSB8fCBwYXJhbXMuZmlsZT8ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcGFyYW1zLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuZXhfRmlsZVVwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfwn5KlIFtCdWxrVXBsb2FkXSBVcGxvYWQgZXJyb3InLCB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHBhcmFtcy5tZXNzYWdlIHx8IHBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgZmlsZTogcGFyYW1zLmZpbGVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMsIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWxlVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY29tcGxldGUnOlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn4+BIFtCdWxrVXBsb2FkXSBVcGxvYWQgY29tcGxldGUnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOKEue+4jyBbQnVsa1VwbG9hZF0gVW5oYW5kbGVkIGFjdGlvbjogJHthY3Rpb259YCwgeyBwYXJhbXMgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgZmlsZSBtZXJnaW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBmaWxlIG1lcmdpbmcgc3RhdHVzIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgUGJ4QXBpLnRyeVBhcnNlSlNPTihyZXNwb25zZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X0ZpbGVVcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG4gICAgICAgIGlmIChqc29uID09PSB1bmRlZmluZWQgfHwganNvbi5kYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuZXhfRmlsZVVwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXBsb2FkSWQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHVwbG9hZCBwcm9ncmVzc1xuICAgICAgICBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLnN1YnNjcmliZSh1cGxvYWRJZCwge1xuICAgICAgICAgICAgb25NZXJnZVN0YXJ0ZWQ6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRmlsZSBtZXJnZSBzdGFydGVkXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlUHJvZ3Jlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGlmIG5lZWRlZFxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZUNvbXBsZXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucHJldmlld0ltcG9ydCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25FcnJvcjogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9GaWxlVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpbW1lZGlhdGUgc3RhdHVzIChzYW1lIGFzIHNvdW5kLWZpbGUtbW9kaWZ5LmpzKVxuICAgICAgICBpZiAoanNvbi5kYXRhLmRfc3RhdHVzID09PSAnVVBMT0FEX0NPTVBMRVRFJyB8fCAhanNvbi5kYXRhLmRfc3RhdHVzKSB7XG4gICAgICAgICAgICAvLyBGaWxlIGlzIGFscmVhZHkgcmVhZHksIHByb2NlZWQgd2l0aCBwcmV2aWV3IGltbWVkaWF0ZWx5XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucHJldmlld0ltcG9ydCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIE5vdGU6IHN0YXJ0TWVyZ2luZ0NoZWNrV29ya2VyKCkgbWV0aG9kIHJlbW92ZWQgLSBub3cgdXNpbmcgRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG5cbiAgICAvKipcbiAgICAgKiBQcmV2aWV3IGltcG9ydCAtIHZhbGlkYXRlIENTViBhbmQgc2hvdyBwcmV2aWV3XG4gICAgICovXG4gICAgcHJldmlld0ltcG9ydCgpIHtcbiAgICAgICAgY29uc3Qgc3RyYXRlZ3kgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gVXNlIHVwbG9hZGVkRmlsZUlkIGZvciBBUEkgY2FsbCwgYXMgdGhlIGZpbGUgaXMgbm93IGZ1bGx5IG1lcmdlZFxuICAgICAgICBFbXBsb3llZXNBUEkuaW1wb3J0Q1NWKFxuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlSWQsXG4gICAgICAgICAgICAncHJldmlldycsXG4gICAgICAgICAgICBzdHJhdGVneSxcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQmFja2VuZCByZXR1cm5zIHVwbG9hZF9pZCwgbm90IHVwbG9hZElkXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZElkID0gcmVzcG9uc2UuZGF0YS51cGxvYWRfaWQgfHwgcmVzcG9uc2UuZGF0YS51cGxvYWRJZDtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc2hvd1ByZXZpZXcocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgcHJldmlldyBvZiBDU1YgZGF0YVxuICAgICAqL1xuICAgIHNob3dQcmV2aWV3KGRhdGEpIHtcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRpc3RpY3NcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHRvdGFsQ291bnQudGV4dChkYXRhLnRvdGFsIHx8IDApO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdmFsaWRDb3VudC50ZXh0KGRhdGEudmFsaWQgfHwgMCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkdXBsaWNhdGVDb3VudC50ZXh0KGRhdGEuZHVwbGljYXRlcyB8fCAwKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGVycm9yQ291bnQudGV4dChkYXRhLmVycm9ycyB8fCAwKTtcblxuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIERhdGFUYWJsZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUuZGVzdHJveSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgYW5kIHBvcHVsYXRlIHByZXZpZXcgdGFibGVcbiAgICAgICAgY29uc3QgJHRib2R5ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5maW5kKCd0Ym9keScpO1xuICAgICAgICAkdGJvZHkuZW1wdHkoKTtcblxuICAgICAgICBpZiAoZGF0YS5wcmV2aWV3ICYmIGRhdGEucHJldmlldy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBkYXRhLnByZXZpZXcuZm9yRWFjaCgocm93KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSByb3cuc3RhdHVzID09PSAndmFsaWQnID8gJ3Bvc2l0aXZlJyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5zdGF0dXMgPT09ICdkdXBsaWNhdGUnIHx8IHJvdy5zdGF0dXMgPT09ICdleGlzdHMnID8gJ3dhcm5pbmcnIDogJ25lZ2F0aXZlJztcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNJY29uID0gcm93LnN0YXR1cyA9PT0gJ3ZhbGlkJyA/ICdjaGVjayBjaXJjbGUnIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3cuc3RhdHVzID09PSAnZHVwbGljYXRlJyB8fCByb3cuc3RhdHVzID09PSAnZXhpc3RzJyA/ICdleGNsYW1hdGlvbiB0cmlhbmdsZScgOiAndGltZXMgY2lyY2xlJztcblxuICAgICAgICAgICAgICAgIC8vIFRyYW5zbGF0ZSBzdGF0dXMgdGV4dFxuICAgICAgICAgICAgICAgIGxldCBzdGF0dXNUZXh0ID0gcm93LnN0YXR1cztcbiAgICAgICAgICAgICAgICBzd2l0Y2gocm93LnN0YXR1cykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2YWxpZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c1ZhbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2R1cGxpY2F0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c0R1cGxpY2F0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdleGlzdHMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNFeGlzdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNFcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnZhbGlkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c1RleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzSW52YWxpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGBcbiAgICAgICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwiJHtzdGF0dXNDbGFzc31cIiBkYXRhLXJvdz1cIiR7cm93LnJvd31cIiBkYXRhLW51bWJlcj1cIiR7cm93Lm51bWJlcn1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke3Jvdy5udW1iZXIgfHwgJyd9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke3Jvdy51c2VyX3VzZXJuYW1lIHx8ICcnfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtyb3cubW9iaWxlX251bWJlciB8fCAnJ308L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPiR7cm93LnVzZXJfZW1haWwgfHwgJyd9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInN0YXR1cy1jZWxsXCI+PGkgY2xhc3M9XCIke3N0YXR1c0ljb259IGljb25cIj48L2k+IDxzcGFuIGNsYXNzPVwic3RhdHVzLXRleHRcIj4ke3N0YXR1c1RleHR9PC9zcGFuPjwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgJHRib2R5LmFwcGVuZCgkcm93KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIHNpbXBsZSBTZW1hbnRpYyBVSSB0YWJsZSBpbnN0ZWFkIG9mIERhdGFUYWJsZXMgdG8gYXZvaWQgaGVhZGVyL2JvZHkgc2VwYXJhdGlvbiBpc3N1ZXNcbiAgICAgICAgLy8gQWRkIENTUyBjbGFzcyB0byBwcmV2aWV3IHRhYmxlIGZvciBzdHlsaW5nXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuYWRkQ2xhc3MoJ3ByZXZpZXctdGFibGUnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIHRhYmxlIHNvcnRpbmcgbWFudWFsbHkgaWYgbmVlZGVkXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGgnKS5lYWNoKGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICBjb25zdCAkdGggPSAkKHRoaXMpO1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSA0KSB7IC8vIFN0YXR1cyBjb2x1bW4gLSBtYWtlIGl0IHNvcnRhYmxlIChub3cgYXQgaW5kZXggNClcbiAgICAgICAgICAgICAgICAkdGguYWRkQ2xhc3MoJ3NvcnRlZCBhc2NlbmRpbmcnKTsgLy8gU2V0IGluaXRpYWwgc29ydFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkdGgub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGFsbFRoID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5maW5kKCd0aCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0Ym9keSA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGJvZHknKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkcm93cyA9ICR0Ym9keS5maW5kKCd0cicpO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHNvcnRpbmcgY2xhc3NlcyBmcm9tIG90aGVyIGhlYWRlcnNcbiAgICAgICAgICAgICAgICAkYWxsVGgucmVtb3ZlQ2xhc3MoJ3NvcnRlZCBhc2NlbmRpbmcgZGVzY2VuZGluZycpO1xuXG4gICAgICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIHNvcnQgZGlyZWN0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgaXNBc2NlbmRpbmcgPSAhJHRoLmhhc0NsYXNzKCdzb3J0ZWQnKSB8fCAkdGguaGFzQ2xhc3MoJ2Rlc2NlbmRpbmcnKTtcbiAgICAgICAgICAgICAgICAkdGguYWRkQ2xhc3MoaXNBc2NlbmRpbmcgPyAnc29ydGVkIGFzY2VuZGluZycgOiAnc29ydGVkIGRlc2NlbmRpbmcnKTtcblxuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBzb3J0IGltcGxlbWVudGF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3Qgc29ydGVkUm93cyA9ICRyb3dzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhVGV4dCA9ICQoYSkuZmluZCgndGQnKS5lcShpbmRleCkudGV4dCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYlRleHQgPSAkKGIpLmZpbmQoJ3RkJykuZXEoaW5kZXgpLnRleHQoKS50cmltKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHN0YXR1cyBjb2x1bW4sIHNvcnQgYnkgc3RhdHVzIHByaW9yaXR5XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzT3JkZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ9Cf0YDQvtC/0YPRidC10L0nOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICfQodC+0LfQtNCw0L0nOiAyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICfQntCx0L3QvtCy0LvQtdC9JzogMyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAn0KPQttC1INGB0YPRidC10YHRgtCy0YPQtdGCJzogNCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAn0J7RiNC40LHQutCwJzogNVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFTdGF0dXMgPSBzdGF0dXNPcmRlclthVGV4dC5zcGxpdCgnICcpLnNsaWNlKDEpLmpvaW4oJyAnKV0gfHwgOTk5O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYlN0YXR1cyA9IHN0YXR1c09yZGVyW2JUZXh0LnNwbGl0KCcgJykuc2xpY2UoMSkuam9pbignICcpXSB8fCA5OTk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXNBc2NlbmRpbmcgPyBhU3RhdHVzIC0gYlN0YXR1cyA6IGJTdGF0dXMgLSBhU3RhdHVzO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG90aGVyIGNvbHVtbnMsIHNpbXBsZSB0ZXh0IHNvcnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFUZXh0IDwgYlRleHQpIHJldHVybiBpc0FzY2VuZGluZyA/IC0xIDogMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFUZXh0ID4gYlRleHQpIHJldHVybiBpc0FzY2VuZGluZyA/IDEgOiAtMTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkdGJvZHkuZW1wdHkoKS5hcHBlbmQoc29ydGVkUm93cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3RvcmUgcmVmZXJlbmNlIGZvciByb3cgdXBkYXRlcyAoY29tcGF0aWJpbGl0eSB3aXRoIGV4aXN0aW5nIGNvZGUpXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUgPSB7XG4gICAgICAgICAgICBkZXN0cm95OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBDbGVhbnVwIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGgnKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5yZW1vdmVDbGFzcygncHJldmlldy10YWJsZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNob3cgcHJldmlldyBzZWN0aW9uLCBoaWRlIHVwbG9hZCBzZWN0aW9uXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdTZWN0aW9uLnNob3coKTtcblxuICAgICAgICAvLyBOb3RlOiBSZW1vdmVkIGF1dG9tYXRpYyBzY3JvbGxpbmcgdG8gcHJldmVudCBwYWdlIGp1bXBpbmcgZHVyaW5nIHByb2Nlc3NpbmdcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uZmlybSBhbmQgc3RhcnQgaW1wb3J0XG4gICAgICovXG4gICAgY29uZmlybUltcG9ydCgpIHtcbiAgICAgICAgaWYgKCFleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRJZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKCdVcGxvYWQgSUQgaXMgbWlzc2luZycsICdlcnJvcicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RyYXRlZ3kgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjb25maXJtSW1wb3J0LmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgRW1wbG95ZWVzQVBJLmNvbmZpcm1JbXBvcnQoXG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRJZCxcbiAgICAgICAgICAgIHN0cmF0ZWd5LFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBLZWVwIHByZXZpZXcgdGFibGUgdmlzaWJsZSwgc2hvdyBwcm9ncmVzcyBzZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcm9ncmVzc1NlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgaW1wb3J0IGJ1dHRvbnMsIHNob3cgY2FuY2VsIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY29uZmlybUltcG9ydC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjYW5jZWxJbXBvcnQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuY2xvc2VzdCgnLmZpZWxkJykuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNhdmUgam9iIGluZm9ybWF0aW9uIGZvciBjYW5jZWxsYXRpb25cbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkID0gcmVzcG9uc2UuZGF0YS5qb2JJZCB8fCBudWxsO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgPSByZXNwb25zZS5kYXRhLmNoYW5uZWxJZCB8fCBudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcHJvZ3Jlc3MgYmFyXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRQcm9ncmVzcy5wcm9ncmVzcyh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZXJjZW50OiAwXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IHByb2dyZXNzIHRleHRcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGFydGVkKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTdWJzY3JpYmUgdG8gaW1wb3J0IHByb2dyZXNzIGV2ZW50cyB2aWEgRXZlbnRCdXMgRklSU1RcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuY2hhbm5lbElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5zdWJzY3JpYmVUb0ltcG9ydFByb2dyZXNzKHJlc3BvbnNlLmRhdGEuY2hhbm5lbElkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IHZhbGlkIHJvd3MgdG8gJ3Byb2Nlc3NpbmcnIHN0YXR1cyBhZnRlciBhIHNtYWxsIGRlbGF5IHRvIGVuc3VyZSBFdmVudEJ1cyBpcyByZWFkeVxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnJlc2V0VGFibGVUb1Byb2Nlc3NpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIGltcG9ydCBwcm9ncmVzcyBldmVudHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2hhbm5lbElkIC0gSW1wb3J0IHByb2dyZXNzIGNoYW5uZWwgSURcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb0ltcG9ydFByb2dyZXNzKGNoYW5uZWxJZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhg8J+UlCBbQnVsa1VwbG9hZF0gU3Vic2NyaWJpbmcgdG8gRXZlbnRCdXMgY2hhbm5lbDogJHtjaGFubmVsSWR9YCk7XG5cbiAgICAgICAgLy8gU3RvcmUgY2FsbGJhY2sgZnVuY3Rpb24gcmVmZXJlbmNlIGZvciBsYXRlciB1bnN1YnNjcmlwdGlvblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrID0gKG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGDwn5OoIFtCdWxrVXBsb2FkXSBFdmVudEJ1cyBtZXNzYWdlIHJlY2VpdmVkOmAsIG1lc3NhZ2UpO1xuXG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg8J+UhCBbQnVsa1VwbG9hZF0gUHJvY2Vzc2luZyBtZXNzYWdlIHR5cGU6ICR7bWVzc2FnZS50eXBlfWApO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ltcG9ydF9zdGFydGVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmhhbmRsZUltcG9ydFN0YXJ0ZWQobWVzc2FnZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbXBvcnRfcHJvZ3Jlc3MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaGFuZGxlSW1wb3J0UHJvZ3Jlc3MobWVzc2FnZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbXBvcnRfY29tcGxldGVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmhhbmRsZUltcG9ydENvbXBsZXRlZChtZXNzYWdlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYOKaoO+4jyBbQnVsa1VwbG9hZF0gVW5rbm93biBtZXNzYWdlIHR5cGU6ICR7bWVzc2FnZS50eXBlfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGDimqDvuI8gW0J1bGtVcGxvYWRdIEludmFsaWQgbWVzc2FnZSBmb3JtYXQ6YCwgbWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKGNoYW5uZWxJZCwgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayk7XG4gICAgICAgIGNvbnNvbGUubG9nKGDinIUgW0J1bGtVcGxvYWRdIEV2ZW50QnVzIHN1YnNjcmlwdGlvbiBjb21wbGV0ZWQgZm9yIGNoYW5uZWw6ICR7Y2hhbm5lbElkfWApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW1wb3J0IHN0YXJ0ZWQgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEltcG9ydCBzdGFydGVkIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVJbXBvcnRTdGFydGVkKGRhdGEpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlUHJvZ3Jlc3NUZXh0KGAke2dsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGFydGVkfSAoJHtkYXRhLnRvdGFsfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9SZWNvcmRzfSlgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGltcG9ydCBwcm9ncmVzcyBldmVudFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gSW1wb3J0IHByb2dyZXNzIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVJbXBvcnRQcm9ncmVzcyhkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIFtCdWxrVXBsb2FkXSBoYW5kbGVJbXBvcnRQcm9ncmVzcyBjYWxsZWQgd2l0aCBkYXRhOicsIGRhdGEpO1xuXG4gICAgICAgIGNvbnN0IHBlcmNlbnQgPSBNYXRoLnJvdW5kKChkYXRhLnByb2Nlc3NlZCAvIGRhdGEudG90YWwpICogMTAwKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFByb2dyZXNzLnByb2dyZXNzKHtcbiAgICAgICAgICAgIHBlcmNlbnQ6IHBlcmNlbnRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGluZGl2aWR1YWwgcm93IHN0YXR1cyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoZGF0YS5jdXJyZW50UmVjb3JkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBbQnVsa1VwbG9hZF0gVXBkYXRpbmcgcm93IHN0YXR1cyBmb3I6JywgZGF0YS5jdXJyZW50UmVjb3JkKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwZGF0ZVJvd1N0YXR1cyhcbiAgICAgICAgICAgICAgICBkYXRhLmN1cnJlbnRSZWNvcmQubnVtYmVyLFxuICAgICAgICAgICAgICAgIGRhdGEuY3VycmVudFJlY29yZC5zdGF0dXMsXG4gICAgICAgICAgICAgICAgZGF0YS5jdXJyZW50UmVjb3JkLm1lc3NhZ2VcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBwcm9ncmVzcyBtZXNzYWdlIHdpdGggc2tpcHBlZCBjb3VudFxuICAgICAgICBjb25zdCBwYXJ0cyA9IFtdO1xuICAgICAgICBpZiAoZGF0YS5jcmVhdGVkID4gMCkge1xuICAgICAgICAgICAgcGFydHMucHVzaChgJHtkYXRhLmNyZWF0ZWR9ICR7Z2xvYmFsVHJhbnNsYXRlLmV4X0NyZWF0ZWR9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEudXBkYXRlZCA+IDApIHtcbiAgICAgICAgICAgIHBhcnRzLnB1c2goYCR7ZGF0YS51cGRhdGVkfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9VcGRhdGVkfWApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLnNraXBwZWQgPiAwKSB7XG4gICAgICAgICAgICBwYXJ0cy5wdXNoKGAke2RhdGEuc2tpcHBlZH0gJHtnbG9iYWxUcmFuc2xhdGUuZXhfU2tpcHBlZH1gKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5lcnJvcnMgPiAwKSB7XG4gICAgICAgICAgICBwYXJ0cy5wdXNoKGAke2RhdGEuZXJyb3JzfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9FcnJvcnN9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtZXNzYWdlID0gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFByb2dyZXNzfTogJHtkYXRhLnByb2Nlc3NlZH0vJHtkYXRhLnRvdGFsfSAoJHtwYXJ0cy5qb2luKCcsICcpfSlgO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVQcm9ncmVzc1RleHQobWVzc2FnZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbXBvcnQgY29tcGxldGVkIGV2ZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBJbXBvcnQgY29tcGxldGlvbiBkYXRhXG4gICAgICovXG4gICAgaGFuZGxlSW1wb3J0Q29tcGxldGVkKGRhdGEpIHtcblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0UHJvZ3Jlc3MucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgcGVyY2VudDogMTAwXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNob3cgY29tcGxldGlvbiBtZXNzYWdlXG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0Q29tcGxldGVkfTogJHtkYXRhLmNyZWF0ZWR9ICR7Z2xvYmFsVHJhbnNsYXRlLmV4X0NyZWF0ZWR9LCAke2RhdGEudXBkYXRlZH0gJHtnbG9iYWxUcmFuc2xhdGUuZXhfVXBkYXRlZH0sICR7ZGF0YS5za2lwcGVkfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9Ta2lwcGVkfSwgJHtkYXRhLmVycm9yc30gJHtnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JzfWA7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwZGF0ZVByb2dyZXNzVGV4dChtZXNzYWdlKTtcblxuICAgICAgICAvLyBIaWRlIGNhbmNlbCBidXR0b24gYW5kIGVudGlyZSBpbXBvcnQgY29udHJvbHMgYmxvY2sgYWZ0ZXIgY29tcGxldGlvblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY2FuY2VsSW1wb3J0UHJvY2Vzcy5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRDb250cm9scy5oaWRlKCk7XG5cbiAgICAgICAgLy8gQ2xlYXIgam9iIGRhdGFcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkID0gbnVsbDtcblxuICAgICAgICAvLyBVbnN1YnNjcmliZSBmcm9tIHByb2dyZXNzIGV2ZW50cyBhZnRlciBjb21wbGV0aW9uXG4gICAgICAgIGlmIChleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgJiYgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjaykge1xuICAgICAgICAgICAgRXZlbnRCdXMudW5zdWJzY3JpYmUoZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkLCBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydENoYW5uZWxJZCA9IG51bGw7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF1dG9tYXRpY2FsbHkgc29ydCB0YWJsZSBieSBzdGF0dXMgYWZ0ZXIgaW1wb3J0IGNvbXBsZXRpb25cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc29ydFRhYmxlQnlTdGF0dXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FuY2VsIGltcG9ydCBhbmQgcmVzZXRcbiAgICAgKi9cbiAgICBjYW5jZWxJbXBvcnQoKSB7XG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQuc2hvdygpO1xuICAgICAgICAvLyBVbnN1YnNjcmliZSBmcm9tIEV2ZW50QnVzIGlmIHN1YnNjcmliZWRcbiAgICAgICAgaWYgKGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkKSB7XG4gICAgICAgICAgICBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLnVuc3Vic2NyaWJlKGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZElkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlUGF0aCA9IG51bGw7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayA9IG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbmNlbCB0aGUgcnVubmluZyBpbXBvcnQgcHJvY2Vzc1xuICAgICAqL1xuICAgIGNhbmNlbEltcG9ydFByb2Nlc3MoKSB7XG4gICAgICAgIGlmICghZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYnV0dG9uIHRvIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3MuYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAvLyBGb3Igbm93LCBqdXN0IHN0b3AgdGhlIFVJIHVwZGF0ZXMgc2luY2Ugc2VydmVyLXNpZGUgY2FuY2VsbGF0aW9uIGlzIG5vdCBpbXBsZW1lbnRlZFxuICAgICAgICAvLyBUT0RPOiBJbXBsZW1lbnQgc2VydmVyLXNpZGUgam9iIGNhbmNlbGxhdGlvblxuXG4gICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyB0ZXh0IHdpdGggY2FuY2VsbGF0aW9uIG1lc3NhZ2VcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlUHJvZ3Jlc3NUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRDYW5jZWxsZWQpO1xuXG4gICAgICAgIC8vIEhpZGUgcHJvZ3Jlc3Mgc2VjdGlvblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcblxuICAgICAgICAvLyBTaG93IGltcG9ydCBidXR0b25zIGFnYWluXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjb25maXJtSW1wb3J0LnNob3coKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydC5zaG93KCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRTdHJhdGVneS5jbG9zZXN0KCcuZmllbGQnKS5zaG93KCk7XG5cbiAgICAgICAgLy8gVW5zdWJzY3JpYmUgZnJvbSBFdmVudEJ1c1xuICAgICAgICBpZiAoZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkICYmIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydFByb2dyZXNzQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnVuc3Vic2NyaWJlKGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydENoYW5uZWxJZCwgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciBqb2IgZGF0YVxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5jdXJyZW50Sm9iSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrID0gbnVsbDtcblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY2FuY2VsSW1wb3J0UHJvY2Vzcy5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydCBuZXcgaW1wb3J0XG4gICAgICovXG4gICAgc3RhcnROZXdJbXBvcnQoKSB7XG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdHNTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3U2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnNob3coKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVQYXRoID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5jdXJyZW50Sm9iSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrID0gbnVsbDtcblxuICAgICAgICAvLyBSZXNldCB1cGxvYWQgc3RhdGUgaGFuZGxlZCBieSBGaWxlc0FQSVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW1wb3J0IHByb2dyZXNzIGZyb20gRXZlbnRCdXNcbiAgICAgKi9cbiAgICBvbkltcG9ydFByb2dyZXNzKGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEucGVyY2VudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0UHJvZ3Jlc3MucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgIHBlcmNlbnQ6IGRhdGEucGVyY2VudFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF0YS5tZXNzYWdlKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NMYWJlbC50ZXh0KGRhdGEubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF0YS5sb2cpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwZGF0ZVByb2dyZXNzVGV4dChkYXRhLmxvZyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGltcG9ydCBjb21wbGV0aW9uXG4gICAgICovXG4gICAgb25JbXBvcnRDb21wbGV0ZShkYXRhKSB7XG4gICAgICAgIC8vIEtlZXAgdGFibGUgdmlzaWJsZSwgaGlkZSBwcm9ncmVzcyBiYXIsIHNob3cgcmVzdWx0cyBzZWN0aW9uXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRQcm9ncmVzcy5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcm9ncmVzc0xhYmVsLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3MuaGlkZSgpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcmVzdWx0c1NlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgIC8vIFNob3cgaW1wb3J0IGJ1dHRvbnMgYWdhaW4gZm9yIG5ldyBpbXBvcnRcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQuc2hvdygpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY2FuY2VsSW1wb3J0LnNob3coKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFN0cmF0ZWd5LmNsb3Nlc3QoJy5maWVsZCcpLnNob3coKTtcblxuICAgICAgICAvLyBTaG93IHJlc3VsdCBtZXNzYWdlXG4gICAgICAgIGNvbnN0IG1lc3NhZ2VDbGFzcyA9IGRhdGEuc3VjY2VzcyA/ICdwb3NpdGl2ZScgOiAnbmVnYXRpdmUnO1xuICAgICAgICBjb25zdCBtZXNzYWdlSWNvbiA9IGRhdGEuc3VjY2VzcyA/ICdjaGVjayBjaXJjbGUnIDogJ3RpbWVzIGNpcmNsZSc7XG4gICAgICAgIGxldCBtZXNzYWdlVGV4dCA9ICcnO1xuXG4gICAgICAgIGlmIChkYXRhLnN0YXRzKSB7XG4gICAgICAgICAgICBtZXNzYWdlVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdWNjZXNzXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJ3tjcmVhdGVkfScsIGRhdGEuc3RhdHMuY3JlYXRlZCB8fCAwKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKCd7c2tpcHBlZH0nLCBkYXRhLnN0YXRzLnNraXBwZWQgfHwgMClcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgne2ZhaWxlZH0nLCBkYXRhLnN0YXRzLmZhaWxlZCB8fCAwKTtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICBtZXNzYWdlVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRGYWlsZWQucmVwbGFjZSgne2Vycm9yfScsIGRhdGEuZXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdE1lc3NhZ2UuaHRtbChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiJHttZXNzYWdlQ2xhc3N9IG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIiR7bWVzc2FnZUljb259IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7ZGF0YS5zdWNjZXNzID8gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydENvbXBsZXRlIDogZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydEZhaWxlZH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHttZXNzYWdlVGV4dH08L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwcm9ncmVzcyB0ZXh0XG4gICAgICovXG4gICAgdXBkYXRlUHJvZ3Jlc3NUZXh0KG1lc3NhZ2UpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzVGV4dC50ZXh0KG1lc3NhZ2UpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHBvcnQgZW1wbG95ZWVzIHRvIENTVlxuICAgICAqL1xuICAgIGV4cG9ydEVtcGxveWVlcygpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEZvcm1hdC5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgIGNvbnN0IGZpbHRlciA9IHt9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbnVtYmVyRnJvbSA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJGcm9tLnZhbCgpO1xuICAgICAgICBjb25zdCBudW1iZXJUbyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJUby52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChudW1iZXJGcm9tKSB7XG4gICAgICAgICAgICBmaWx0ZXIubnVtYmVyX2Zyb20gPSBudW1iZXJGcm9tO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudW1iZXJUbykge1xuICAgICAgICAgICAgZmlsdGVyLm51bWJlcl90byA9IG51bWJlclRvO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIEVtcGxveWVlc0FQSS5leHBvcnRDU1YoXG4gICAgICAgICAgICBmb3JtYXQsXG4gICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXhwb3J0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZG93bmxvYWQgdXNpbmcgdGhlIGxpbmsgZnJvbSB0aGUgc2VydmVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmZpbGVuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZXNwb25zZS5kYXRhLmZpbGVuYW1lIGFscmVhZHkgY29udGFpbnMgdGhlIGZ1bGwgcGF0aCBmcm9tIHJvb3RcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzcG9uc2UuZGF0YS5maWxlbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZCBDU1YgdGVtcGxhdGVcbiAgICAgKi9cbiAgICBkb3dubG9hZFRlbXBsYXRlKCkge1xuICAgICAgICBjb25zdCBmb3JtYXQgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kdGVtcGxhdGVGb3JtYXQuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkb3dubG9hZFRlbXBsYXRlLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgRW1wbG95ZWVzQVBJLmdldFRlbXBsYXRlKFxuICAgICAgICAgICAgZm9ybWF0LFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGRvd25sb2FkVGVtcGxhdGUucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBkb3dubG9hZCB1c2luZyB0aGUgbGluayBmcm9tIHRoZSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgYWxyZWFkeSBjb250YWlucyB0aGUgZnVsbCBwYXRoIGZyb20gcm9vdFxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXNwb25zZS5kYXRhLmZpbGVuYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBmaWVsZCBkZXNjcmlwdGlvbnMgZm9yIGZvcm1hdFxuICAgICAqL1xuICAgIGdldEZvcm1hdEZpZWxkcyhmb3JtYXQpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0cyA9IHtcbiAgICAgICAgICAgIG1pbmltYWw6IFtcbiAgICAgICAgICAgICAgICAnbnVtYmVyIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE51bWJlcl9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX3VzZXJuYW1lIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFVzZXJuYW1lX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3VzZXJfZW1haWwgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRW1haWxfSGVscCxcbiAgICAgICAgICAgICAgICAnbW9iaWxlX251bWJlciAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRNb2JpbGVfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3NlY3JldCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRQYXNzd29yZF9IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfcmluZ2xlbmd0aCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdfSGVscFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHN0YW5kYXJkOiBbXG4gICAgICAgICAgICAgICAgJ251bWJlciAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGROdW1iZXJfSGVscCxcbiAgICAgICAgICAgICAgICAndXNlcl91c2VybmFtZSAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRVc2VybmFtZV9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX2VtYWlsIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEVtYWlsX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9udW1iZXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTW9iaWxlX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9kaWFsc3RyaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE1vYmlsZURpYWxzdHJpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3NlY3JldCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRQYXNzd29yZF9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfZHRtZm1vZGUgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRFRNRk1vZGVfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3RyYW5zcG9ydCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRUcmFuc3BvcnRfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX2VuYWJsZVJlY29yZGluZyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSZWNvcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX3JpbmdsZW5ndGggLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkUmluZ0xlbmd0aF9IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfZm9yd2FyZGluZyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRGb3J3YXJkaW5nX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5IC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdCdXN5X0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRGb3J3YXJkaW5nVW5hdmFpbGFibGVfSGVscFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZ1bGw6IFtcbiAgICAgICAgICAgICAgICAnbnVtYmVyIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE51bWJlcl9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX3VzZXJuYW1lIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFVzZXJuYW1lX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3VzZXJfZW1haWwgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRW1haWxfSGVscCxcbiAgICAgICAgICAgICAgICAndXNlcl9hdmF0YXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkQXZhdGFyX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9udW1iZXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTW9iaWxlX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9kaWFsc3RyaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE1vYmlsZURpYWxzdHJpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3NlY3JldCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRQYXNzd29yZF9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfZHRtZm1vZGUgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRFRNRk1vZGVfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3RyYW5zcG9ydCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRUcmFuc3BvcnRfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX2VuYWJsZVJlY29yZGluZyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSZWNvcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX21hbnVhbGF0dHJpYnV0ZXMgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTWFudWFsQXR0cmlidXRlc19IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfcmluZ2xlbmd0aCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX2ZvcndhcmRpbmdvbmJ1c3kgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRm9yd2FyZGluZ0J1c3lfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdVbmF2YWlsYWJsZV9IZWxwXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZm9ybWF0c1tmb3JtYXRdIHx8IGZvcm1hdHMuc3RhbmRhcmQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZm9ybWF0IGRlc2NyaXB0aW9uXG4gICAgICovXG4gICAgdXBkYXRlRm9ybWF0RGVzY3JpcHRpb24odHlwZSwgZm9ybWF0KSB7XG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLmdldEZvcm1hdEZpZWxkcyhmb3JtYXQpO1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gdHlwZSA9PT0gJ2V4cG9ydCcgP1xuICAgICAgICAgICAgJCgnI2V4cG9ydC1mb3JtYXQtZmllbGRzLWRlc2NyaXB0aW9uJykgOlxuICAgICAgICAgICAgJCgnI2Zvcm1hdC1maWVsZHMtZGVzY3JpcHRpb24nKTtcblxuICAgICAgICBpZiAoJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSAnPHVsIGNsYXNzPVwibGlzdFwiPicgK1xuICAgICAgICAgICAgICAgIGZpZWxkcy5tYXAoZmllbGQgPT4gYDxsaT48Y29kZT4ke2ZpZWxkfTwvY29kZT48L2xpPmApLmpvaW4oJycpICtcbiAgICAgICAgICAgICAgICAnPC91bD4nO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5odG1sKGh0bWwpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHRhYmxlIHJvd3MgdG8gcHJvY2Vzc2luZyBzdGF0dXMgKG9ubHkgZm9yIHZhbGlkIHJlY29yZHMgdGhhdCB3aWxsIGJlIHByb2Nlc3NlZClcbiAgICAgKi9cbiAgICByZXNldFRhYmxlVG9Qcm9jZXNzaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBbQnVsa1VwbG9hZF0gcmVzZXRUYWJsZVRvUHJvY2Vzc2luZyBjYWxsZWQnKTtcblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLmZpbmQoJ3Rib2R5IHRyJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5zdGF0dXMtY2VsbCcpO1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzVGV4dCA9ICRzdGF0dXNDZWxsLmZpbmQoJy5zdGF0dXMtdGV4dCcpLnRleHQoKS50cmltKCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGDwn5SNIFtCdWxrVXBsb2FkXSBSb3cgc3RhdHVzIGNoZWNrIC0gaGFzQ2xhc3MgcG9zaXRpdmU6ICR7JHJvdy5oYXNDbGFzcygncG9zaXRpdmUnKX0sIHN0YXR1c1RleHQ6ICcke3N0YXR1c1RleHR9JywgZXhwZWN0ZWRWYWxpZDogJyR7Z2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c1ZhbGlkfSdgKTtcblxuICAgICAgICAgICAgLy8gT25seSByZXNldCByb3dzIHRoYXQgaGF2ZSAndmFsaWQnIHN0YXR1cyBmcm9tIHByZXZpZXdcbiAgICAgICAgICAgIC8vIExlYXZlIGR1cGxpY2F0ZXMsIGV4aXN0cywgYW5kIGVycm9yIHJvd3MgYXMgdGhleSBhcmVcbiAgICAgICAgICAgIGlmICgkcm93Lmhhc0NsYXNzKCdwb3NpdGl2ZScpICYmIHN0YXR1c1RleHQgPT09IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNWYWxpZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDinIUgW0J1bGtVcGxvYWRdIFJlc2V0dGluZyByb3cgdG8gcHJvY2Vzc2luZyBzdGF0dXNgKTtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdG8gcHJvY2Vzc2luZyBzdGF0dXMgb25seSBmb3IgdmFsaWQgcmVjb3Jkc1xuICAgICAgICAgICAgICAgICRyb3cucmVtb3ZlQ2xhc3MoJ3Bvc2l0aXZlIG5lZ2F0aXZlIHdhcm5pbmcnKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbCgnPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT4gPHNwYW4gY2xhc3M9XCJzdGF0dXMtdGV4dFwiPicgKyBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzUHJvY2Vzc2luZyArICc8L3NwYW4+Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTb3J0IHRhYmxlIGJ5IHN0YXR1cyBjb2x1bW4gYWZ0ZXIgaW1wb3J0IGNvbXBsZXRpb25cbiAgICAgKi9cbiAgICBzb3J0VGFibGVCeVN0YXR1cygpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflIQgW0J1bGtVcGxvYWRdIFNvcnRpbmcgdGFibGUgYnkgc3RhdHVzIGFmdGVyIGltcG9ydCBjb21wbGV0aW9uJyk7XG5cbiAgICAgICAgY29uc3QgJHN0YXR1c0hlYWRlciA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGgnKS5lcSg0KTsgLy8gU3RhdHVzIGNvbHVtbiAoaW5kZXggNClcbiAgICAgICAgY29uc3QgJGFsbFRoID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5maW5kKCd0aCcpO1xuICAgICAgICBjb25zdCAkdGJvZHkgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLmZpbmQoJ3Rib2R5Jyk7XG4gICAgICAgIGNvbnN0ICRyb3dzID0gJHRib2R5LmZpbmQoJ3RyJyk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHNvcnRpbmcgY2xhc3NlcyBmcm9tIG90aGVyIGhlYWRlcnNcbiAgICAgICAgJGFsbFRoLnJlbW92ZUNsYXNzKCdzb3J0ZWQgYXNjZW5kaW5nIGRlc2NlbmRpbmcnKTtcblxuICAgICAgICAvLyBTZXQgc3RhdHVzIGNvbHVtbiBhcyBzb3J0ZWQgYXNjZW5kaW5nIChzaG93IHByb2Nlc3NlZCByZXN1bHRzIGZpcnN0KVxuICAgICAgICAkc3RhdHVzSGVhZGVyLmFkZENsYXNzKCdzb3J0ZWQgYXNjZW5kaW5nJyk7XG5cbiAgICAgICAgLy8gU29ydCByb3dzIGJ5IHN0YXR1cyBwcmlvcml0eVxuICAgICAgICBjb25zdCBzb3J0ZWRSb3dzID0gJHJvd3Muc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICBjb25zdCBhVGV4dCA9ICQoYSkuZmluZCgndGQnKS5lcSg0KS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgY29uc3QgYlRleHQgPSAkKGIpLmZpbmQoJ3RkJykuZXEoNCkudGV4dCgpLnRyaW0oKTtcblxuICAgICAgICAgICAgLy8gU3RhdHVzIG9yZGVyIHByaW9yaXR5IChjcmVhdGVkL3VwZGF0ZWQgZmlyc3QsIHRoZW4gc2tpcHBlZCwgdGhlbiBubyBjaGFuZ2VzLCB0aGVuIGVycm9ycylcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c09yZGVyID0ge1xuICAgICAgICAgICAgICAgICfQodC+0LfQtNCw0L0nOiAxLFxuICAgICAgICAgICAgICAgICfQntCx0L3QvtCy0LvQtdC9JzogMixcbiAgICAgICAgICAgICAgICAn0J/RgNC+0L/Rg9GJ0LXQvSc6IDMsXG4gICAgICAgICAgICAgICAgJ9Cj0LbQtSDRgdGD0YnQtdGB0YLQstGD0LXRgic6IDQsXG4gICAgICAgICAgICAgICAgJ9CR0LXQtyDQuNC30LzQtdC90LXQvdC40LknOiA1LFxuICAgICAgICAgICAgICAgICfQntGI0LjQsdC60LAnOiA2LFxuICAgICAgICAgICAgICAgICfQntCx0YDQsNCx0LDRgtGL0LLQsNC10YLRgdGPJzogNyAvLyBTaG91bGQgbm90IGFwcGVhciBhZnRlciBjb21wbGV0aW9uLCBidXQganVzdCBpbiBjYXNlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IHN0YXR1cyB0ZXh0IChyZW1vdmUgaWNvbiBwYXJ0KVxuICAgICAgICAgICAgY29uc3QgYVN0YXR1cyA9IHN0YXR1c09yZGVyW2FUZXh0LnNwbGl0KCcgJykuc2xpY2UoMSkuam9pbignICcpXSB8fCA5OTk7XG4gICAgICAgICAgICBjb25zdCBiU3RhdHVzID0gc3RhdHVzT3JkZXJbYlRleHQuc3BsaXQoJyAnKS5zbGljZSgxKS5qb2luKCcgJyldIHx8IDk5OTtcblxuICAgICAgICAgICAgcmV0dXJuIGFTdGF0dXMgLSBiU3RhdHVzOyAvLyBBc2NlbmRpbmcgb3JkZXJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHdpdGggc29ydGVkIHJvd3NcbiAgICAgICAgJHRib2R5LmVtcHR5KCkuYXBwZW5kKHNvcnRlZFJvd3MpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgW0J1bGtVcGxvYWRdIFRhYmxlIHNvcnRlZCBieSBzdGF0dXMgLSBwcm9jZXNzZWQgcmVjb3JkcyBzaG93biBmaXJzdCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaW5kaXZpZHVhbCByb3cgc3RhdHVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc3RhdHVzIC0gTmV3IHN0YXR1cyAoY3JlYXRlZCwgdXBkYXRlZCwgc2tpcHBlZCwgZXJyb3IpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBTdGF0dXMgbWVzc2FnZVxuICAgICAqL1xuICAgIHVwZGF0ZVJvd1N0YXR1cyhudW1iZXIsIHN0YXR1cywgbWVzc2FnZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhg8J+UhCBbQnVsa1VwbG9hZF0gdXBkYXRlUm93U3RhdHVzIGNhbGxlZCBmb3IgbnVtYmVyOiAke251bWJlcn0sIHN0YXR1czogJHtzdGF0dXN9LCBtZXNzYWdlOiAke21lc3NhZ2V9YCk7XG5cbiAgICAgICAgY29uc3QgJHJvdyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZChgdGJvZHkgdHJbZGF0YS1udW1iZXI9XCIke251bWJlcn1cIl1gKTtcbiAgICAgICAgaWYgKCRyb3cubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYOKaoO+4jyBbQnVsa1VwbG9hZF0gTm8gcm93IGZvdW5kIGZvciBudW1iZXI6ICR7bnVtYmVyfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5zdGF0dXMtY2VsbCcpO1xuXG4gICAgICAgIGxldCBzdGF0dXNDbGFzcywgc3RhdHVzSWNvbiwgc3RhdHVzVGV4dDtcblxuICAgICAgICBzd2l0Y2goc3RhdHVzKSB7XG4gICAgICAgICAgICBjYXNlICdjcmVhdGVkJzpcbiAgICAgICAgICAgIGNhc2UgJ3VwZGF0ZWQnOlxuICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ3Bvc2l0aXZlJztcbiAgICAgICAgICAgICAgICBzdGF0dXNJY29uID0gJ2NoZWNrIGNpcmNsZSBncmVlbic7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IHN0YXR1cyA9PT0gJ2NyZWF0ZWQnID8gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c0NyZWF0ZWQgOiBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzVXBkYXRlZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NraXBwZWQnOlxuICAgICAgICAgICAgY2FzZSAnZXhpc3RzJzogLy8gSGFuZGxlIFwiZXhpc3RzXCIgc3RhdHVzIGZyb20gYmFja2VuZFxuICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ3dhcm5pbmcnO1xuICAgICAgICAgICAgICAgIHN0YXR1c0ljb24gPSAnbWludXMgY2lyY2xlIHllbGxvdyc7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IHN0YXR1cyA9PT0gJ2V4aXN0cycgPyBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzRXhpc3RzIDogZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c1NraXBwZWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdub19jaGFuZ2VzJzpcbiAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICdkaXNhYmxlZCc7XG4gICAgICAgICAgICAgICAgc3RhdHVzSWNvbiA9ICdtaW51cyBjaXJjbGUgZ3JleSc7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNOb0NoYW5nZXM7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnbmVnYXRpdmUnO1xuICAgICAgICAgICAgICAgIHN0YXR1c0ljb24gPSAndGltZXMgY2lyY2xlIHJlZCc7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNFcnJvcjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnYWN0aXZlJztcbiAgICAgICAgICAgICAgICBzdGF0dXNJY29uID0gJ3NwaW5uZXIgbG9hZGluZyc7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNQcm9jZXNzaW5nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHJvdyBjbGFzcyBhbmQgc3RhdHVzXG4gICAgICAgICRyb3cucmVtb3ZlQ2xhc3MoJ3Bvc2l0aXZlIG5lZ2F0aXZlIHdhcm5pbmcgYWN0aXZlIGRpc2FibGVkJykuYWRkQ2xhc3Moc3RhdHVzQ2xhc3MpO1xuICAgICAgICAvLyBTdXJmYWNlIGJhY2tlbmQgZXJyb3IgbWVzc2FnZSBpbmxpbmUgKGlzc3VlICM5OTYpIOKAlCBlc2NhcGUgdmlhIGpRdWVyeSAudGV4dCgpIHRvIHByZXZlbnQgWFNTLlxuICAgICAgICBsZXQgZGV0YWlsSHRtbCA9ICcnO1xuICAgICAgICBpZiAoc3RhdHVzID09PSAnZXJyb3InICYmIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGNvbnN0IHNhZmVNZXNzYWdlID0gJCgnPGRpdj4nKS50ZXh0KG1lc3NhZ2UpLmh0bWwoKTtcbiAgICAgICAgICAgIGRldGFpbEh0bWwgPSBgIDxzcGFuIGNsYXNzPVwic3RhdHVzLWRldGFpbFwiPuKAlCAke3NhZmVNZXNzYWdlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgJHN0YXR1c0NlbGwuYXR0cigndGl0bGUnLCBtZXNzYWdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzdGF0dXNDZWxsLnJlbW92ZUF0dHIoJ3RpdGxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChgPGkgY2xhc3M9XCIke3N0YXR1c0ljb259IGljb25cIj48L2k+IDxzcGFuIGNsYXNzPVwic3RhdHVzLXRleHRcIj4ke3N0YXR1c1RleHR9PC9zcGFuPiR7ZGV0YWlsSHRtbH1gKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhg4pyFIFtCdWxrVXBsb2FkXSBVcGRhdGVkIHJvdyAke251bWJlcn0gdG8gc3RhdHVzOiAke3N0YXR1c1RleHR9LCBjbGFzczogJHtzdGF0dXNDbGFzc31gKTtcblxuICAgICAgICAvLyBOb3RlOiBSZW1vdmVkIGF1dG9tYXRpYyBzY3JvbGxpbmcgdG8gcHJldmVudCBwYWdlIGp1bXBpbmcgZHVyaW5nIHByb2Nlc3NpbmdcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zb2xlLmxvZygn8J+agCBbQnVsa1VwbG9hZF0gRG9jdW1lbnQgcmVhZHksIHN0YXJ0aW5nIG1vZHVsZSBpbml0aWFsaXphdGlvbicpO1xuICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==