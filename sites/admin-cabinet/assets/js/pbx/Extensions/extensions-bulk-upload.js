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


    $row.removeClass('positive negative warning active disabled').addClass(statusClass);
    $statusCell.html("<i class=\"".concat(statusIcon, " icon\"></i> <span class=\"status-text\">").concat(statusText, "</span>"));
    console.log("\u2705 [BulkUpload] Updated row ".concat(number, " to status: ").concat(statusText, ", class: ").concat(statusClass)); // Note: Removed automatic scrolling to prevent page jumping during processing
  }
}; // Initialize when document is ready

$(document).ready(function () {
  console.log('🚀 [BulkUpload] Document ready, starting module initialization');
  extensionsBulkUpload.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtYnVsay11cGxvYWQuanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0J1bGtVcGxvYWQiLCIkdXBsb2FkQnV0dG9uIiwiJCIsIiR1cGxvYWRTZWdtZW50IiwiJHByZXZpZXdTZWN0aW9uIiwiJHByb2dyZXNzU2VjdGlvbiIsIiRyZXN1bHRzU2VjdGlvbiIsIiRwcmV2aWV3VGFibGUiLCIkaW1wb3J0UHJvZ3Jlc3MiLCIkcHJvZ3Jlc3NMYWJlbCIsIiRwcm9ncmVzc1RleHQiLCIkcmVzdWx0TWVzc2FnZSIsIiR0b3RhbENvdW50IiwiJHZhbGlkQ291bnQiLCIkZHVwbGljYXRlQ291bnQiLCIkZXJyb3JDb3VudCIsIiRjb25maXJtSW1wb3J0IiwiJGNhbmNlbEltcG9ydCIsIiRjYW5jZWxJbXBvcnRQcm9jZXNzIiwiJG5ld0ltcG9ydCIsIiRpbXBvcnRDb250cm9scyIsIiRleHBvcnRCdXR0b24iLCIkZG93bmxvYWRUZW1wbGF0ZSIsIiRpbXBvcnRTdHJhdGVneSIsIiRleHBvcnRGb3JtYXQiLCIkdGVtcGxhdGVGb3JtYXQiLCIkbnVtYmVyRnJvbSIsIiRudW1iZXJUbyIsInVwbG9hZElkIiwidXBsb2FkZWRGaWxlUGF0aCIsInVwbG9hZGVkRmlsZUlkIiwiY3VycmVudEpvYklkIiwiaW1wb3J0Q2hhbm5lbElkIiwiaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayIsInByZXZpZXdEYXRhVGFibGUiLCJpbml0aWFsaXplIiwiY29uc29sZSIsImxvZyIsInRhYiIsIm9uVmlzaWJsZSIsInJlbW92ZSIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInVwZGF0ZUZvcm1hdERlc2NyaXB0aW9uIiwiaW5pdGlhbGl6ZUZpbGVVcGxvYWQiLCJvbiIsImNvbmZpcm1JbXBvcnQiLCJjYW5jZWxJbXBvcnQiLCJjYW5jZWxJbXBvcnRQcm9jZXNzIiwic3RhcnROZXdJbXBvcnQiLCJleHBvcnRFbXBsb3llZXMiLCJkb3dubG9hZFRlbXBsYXRlIiwiRXZlbnRCdXMiLCJzdWJzY3JpYmUiLCJvbkltcG9ydFByb2dyZXNzIiwib25JbXBvcnRDb21wbGV0ZSIsIndpbmRvdyIsImxvY2F0aW9uIiwiaGFzaCIsInN1YnN0cmluZyIsImNsaWNrIiwibGVuZ3RoIiwiZXJyb3IiLCJ1cGxvYWRCdXR0b24iLCJ1cGxvYWRTZWdtZW50IiwiRmlsZXNBUEkiLCJhdHRhY2hUb0J0biIsImNiVXBsb2FkUmVzdW1hYmxlIiwiYWN0aW9uIiwicGFyYW1zIiwiZmlsZU5hbWUiLCJmaWxlIiwibmFtZSIsImZpbGVTaXplIiwic2l6ZSIsImZpbGVUeXBlIiwidHlwZSIsImFkZENsYXNzIiwicHJvZ3Jlc3MiLCJNYXRoIiwicm91bmQiLCJyZXNwb25zZSIsInJlc3VsdCIsIlBieEFwaSIsInRyeVBhcnNlSlNPTiIsImRhdGEiLCJ1cGxvYWRfaWQiLCJmaWxlbmFtZSIsImZpbGVQYXRoIiwiY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyIsImhhc0RhdGEiLCJoYXNVcGxvYWRJZCIsImVycm9yTWVzc2FnZXMiLCJtZXNzYWdlcyIsInJlc3VsdFJlc3VsdCIsInJhd1Jlc3BvbnNlIiwiZXJyb3JNZXNzYWdlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfRmlsZVVwbG9hZEVycm9yIiwiQXJyYXkiLCJpc0FycmF5Iiwiam9pbiIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlIiwidW5kZWZpbmVkIiwianNvbiIsIkpTT04iLCJwYXJzZSIsIkZpbGVVcGxvYWRFdmVudEhhbmRsZXIiLCJvbk1lcmdlU3RhcnRlZCIsIm9uTWVyZ2VQcm9ncmVzcyIsIm9uTWVyZ2VDb21wbGV0ZSIsInByZXZpZXdJbXBvcnQiLCJvbkVycm9yIiwiZF9zdGF0dXMiLCJzdHJhdGVneSIsIkVtcGxveWVlc0FQSSIsImltcG9ydENTViIsInNob3dQcmV2aWV3IiwidGV4dCIsInRvdGFsIiwidmFsaWQiLCJkdXBsaWNhdGVzIiwiZXJyb3JzIiwiZGVzdHJveSIsIiR0Ym9keSIsImZpbmQiLCJlbXB0eSIsInByZXZpZXciLCJmb3JFYWNoIiwicm93Iiwic3RhdHVzQ2xhc3MiLCJzdGF0dXMiLCJzdGF0dXNJY29uIiwic3RhdHVzVGV4dCIsImV4X0ltcG9ydFN0YXR1c1ZhbGlkIiwiZXhfSW1wb3J0U3RhdHVzRHVwbGljYXRlIiwiZXhfSW1wb3J0U3RhdHVzRXhpc3RzIiwiZXhfSW1wb3J0U3RhdHVzRXJyb3IiLCJleF9JbXBvcnRTdGF0dXNJbnZhbGlkIiwiJHJvdyIsIm51bWJlciIsInVzZXJfdXNlcm5hbWUiLCJtb2JpbGVfbnVtYmVyIiwidXNlcl9lbWFpbCIsImFwcGVuZCIsImVhY2giLCJpbmRleCIsIiR0aCIsIiRhbGxUaCIsIiRyb3dzIiwiaXNBc2NlbmRpbmciLCJoYXNDbGFzcyIsInNvcnRlZFJvd3MiLCJzb3J0IiwiYSIsImIiLCJhVGV4dCIsImVxIiwidHJpbSIsImJUZXh0Iiwic3RhdHVzT3JkZXIiLCJhU3RhdHVzIiwic3BsaXQiLCJzbGljZSIsImJTdGF0dXMiLCJvZmYiLCJoaWRlIiwic2hvdyIsImNsb3Nlc3QiLCJqb2JJZCIsImNoYW5uZWxJZCIsInBlcmNlbnQiLCJleF9JbXBvcnRTdGFydGVkIiwic3Vic2NyaWJlVG9JbXBvcnRQcm9ncmVzcyIsInNldFRpbWVvdXQiLCJyZXNldFRhYmxlVG9Qcm9jZXNzaW5nIiwiaGFuZGxlSW1wb3J0U3RhcnRlZCIsImhhbmRsZUltcG9ydFByb2dyZXNzIiwiaGFuZGxlSW1wb3J0Q29tcGxldGVkIiwid2FybiIsInVwZGF0ZVByb2dyZXNzVGV4dCIsImV4X1JlY29yZHMiLCJwcm9jZXNzZWQiLCJjdXJyZW50UmVjb3JkIiwidXBkYXRlUm93U3RhdHVzIiwicGFydHMiLCJjcmVhdGVkIiwicHVzaCIsImV4X0NyZWF0ZWQiLCJ1cGRhdGVkIiwiZXhfVXBkYXRlZCIsInNraXBwZWQiLCJleF9Ta2lwcGVkIiwiZXhfRXJyb3JzIiwiZXhfSW1wb3J0UHJvZ3Jlc3MiLCJleF9JbXBvcnRDb21wbGV0ZWQiLCJ1bnN1YnNjcmliZSIsInNvcnRUYWJsZUJ5U3RhdHVzIiwiZXhfSW1wb3J0Q2FuY2VsbGVkIiwibWVzc2FnZUNsYXNzIiwic3VjY2VzcyIsIm1lc3NhZ2VJY29uIiwibWVzc2FnZVRleHQiLCJzdGF0cyIsImV4X0ltcG9ydFN1Y2Nlc3MiLCJyZXBsYWNlIiwiZmFpbGVkIiwiZXhfSW1wb3J0RmFpbGVkIiwiaHRtbCIsImV4X0ltcG9ydENvbXBsZXRlIiwiZm9ybWF0IiwiZmlsdGVyIiwibnVtYmVyRnJvbSIsInZhbCIsIm51bWJlclRvIiwibnVtYmVyX2Zyb20iLCJudW1iZXJfdG8iLCJleHBvcnRDU1YiLCJocmVmIiwiZ2V0VGVtcGxhdGUiLCJnZXRGb3JtYXRGaWVsZHMiLCJmb3JtYXRzIiwibWluaW1hbCIsImV4X0ZpZWxkTnVtYmVyX0hlbHAiLCJleF9GaWVsZFVzZXJuYW1lX0hlbHAiLCJleF9GaWVsZEVtYWlsX0hlbHAiLCJleF9GaWVsZE1vYmlsZV9IZWxwIiwiZXhfRmllbGRQYXNzd29yZF9IZWxwIiwiZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAiLCJleF9GaWVsZEZvcndhcmRpbmdfSGVscCIsInN0YW5kYXJkIiwiZXhfRmllbGRNb2JpbGVEaWFsc3RyaW5nX0hlbHAiLCJleF9GaWVsZERUTUZNb2RlX0hlbHAiLCJleF9GaWVsZFRyYW5zcG9ydF9IZWxwIiwiZXhfRmllbGRSZWNvcmRpbmdfSGVscCIsImV4X0ZpZWxkRm9yd2FyZGluZ0J1c3lfSGVscCIsImV4X0ZpZWxkRm9yd2FyZGluZ1VuYXZhaWxhYmxlX0hlbHAiLCJmdWxsIiwiZXhfRmllbGRBdmF0YXJfSGVscCIsImV4X0ZpZWxkTWFudWFsQXR0cmlidXRlc19IZWxwIiwiZmllbGRzIiwiJGNvbnRhaW5lciIsIm1hcCIsImZpZWxkIiwiJHN0YXR1c0NlbGwiLCJleF9JbXBvcnRTdGF0dXNQcm9jZXNzaW5nIiwiJHN0YXR1c0hlYWRlciIsImV4X0ltcG9ydFN0YXR1c0NyZWF0ZWQiLCJleF9JbXBvcnRTdGF0dXNVcGRhdGVkIiwiZXhfSW1wb3J0U3RhdHVzU2tpcHBlZCIsImV4X0ltcG9ydFN0YXR1c05vQ2hhbmdlcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG9CQUFvQixHQUFHO0FBQ3pCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQUpTO0FBS3pCQyxFQUFBQSxjQUFjLEVBQUVELENBQUMsQ0FBQyxpQkFBRCxDQUxRO0FBTXpCRSxFQUFBQSxlQUFlLEVBQUVGLENBQUMsQ0FBQyxrQkFBRCxDQU5PO0FBT3pCRyxFQUFBQSxnQkFBZ0IsRUFBRUgsQ0FBQyxDQUFDLG1CQUFELENBUE07QUFRekJJLEVBQUFBLGVBQWUsRUFBRUosQ0FBQyxDQUFDLGtCQUFELENBUk87QUFTekJLLEVBQUFBLGFBQWEsRUFBRUwsQ0FBQyxDQUFDLGdCQUFELENBVFM7QUFVekJNLEVBQUFBLGVBQWUsRUFBRU4sQ0FBQyxDQUFDLGtCQUFELENBVk87QUFXekJPLEVBQUFBLGNBQWMsRUFBRVAsQ0FBQyxDQUFDLGlCQUFELENBWFE7QUFZekJRLEVBQUFBLGFBQWEsRUFBRVIsQ0FBQyxDQUFDLGdCQUFELENBWlM7QUFhekJTLEVBQUFBLGNBQWMsRUFBRVQsQ0FBQyxDQUFDLGlCQUFELENBYlE7QUFjekJVLEVBQUFBLFdBQVcsRUFBRVYsQ0FBQyxDQUFDLGNBQUQsQ0FkVztBQWV6QlcsRUFBQUEsV0FBVyxFQUFFWCxDQUFDLENBQUMsY0FBRCxDQWZXO0FBZ0J6QlksRUFBQUEsZUFBZSxFQUFFWixDQUFDLENBQUMsa0JBQUQsQ0FoQk87QUFpQnpCYSxFQUFBQSxXQUFXLEVBQUViLENBQUMsQ0FBQyxjQUFELENBakJXO0FBa0J6QmMsRUFBQUEsY0FBYyxFQUFF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c0JBQThCNUUsVUFBOUIsc0RBQWlGQyxVQUFqRjtBQUVBckcsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLDJDQUEwQzJHLE1BQTFDLHlCQUErRFAsVUFBL0Qsc0JBQXFGSCxXQUFyRixHQTlDcUMsQ0FnRHJDO0FBQ0g7QUE3K0J3QixDQUE3QixDLENBZy9CQTs7QUFDQXBJLENBQUMsQ0FBQzZQLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEI1TixFQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxnRUFBWjtBQUNBckMsRUFBQUEsb0JBQW9CLENBQUNtQyxVQUFyQjtBQUNILENBSEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgUGJ4QXBpLCBFbXBsb3llZXNBUEksIEV2ZW50QnVzLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRmlsZVVwbG9hZEV2ZW50SGFuZGxlciwgRmlsZXNBUEkgKi9cblxuLyoqXG4gKiBUaGUgZXh0ZW5zaW9uc0J1bGtVcGxvYWQgbW9kdWxlIGhhbmRsZXMgQ1NWIGltcG9ydC9leHBvcnQgZnVuY3Rpb25hbGl0eSBmb3IgZW1wbG95ZWVzXG4gKiBAbW9kdWxlIGV4dGVuc2lvbnNCdWxrVXBsb2FkXG4gKi9cbmNvbnN0IGV4dGVuc2lvbnNCdWxrVXBsb2FkID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBlbGVtZW50c1xuICAgICAqL1xuICAgICR1cGxvYWRCdXR0b246ICQoJyN1cGxvYWQtYnV0dG9uJyksXG4gICAgJHVwbG9hZFNlZ21lbnQ6ICQoJyN1cGxvYWQtc2VnbWVudCcpLFxuICAgICRwcmV2aWV3U2VjdGlvbjogJCgnI3ByZXZpZXctc2VjdGlvbicpLFxuICAgICRwcm9ncmVzc1NlY3Rpb246ICQoJyNwcm9ncmVzcy1zZWN0aW9uJyksXG4gICAgJHJlc3VsdHNTZWN0aW9uOiAkKCcjcmVzdWx0cy1zZWN0aW9uJyksXG4gICAgJHByZXZpZXdUYWJsZTogJCgnI3ByZXZpZXctdGFibGUnKSxcbiAgICAkaW1wb3J0UHJvZ3Jlc3M6ICQoJyNpbXBvcnQtcHJvZ3Jlc3MnKSxcbiAgICAkcHJvZ3Jlc3NMYWJlbDogJCgnI3Byb2dyZXNzLWxhYmVsJyksXG4gICAgJHByb2dyZXNzVGV4dDogJCgnI3Byb2dyZXNzLXRleHQnKSxcbiAgICAkcmVzdWx0TWVzc2FnZTogJCgnI3Jlc3VsdC1tZXNzYWdlJyksXG4gICAgJHRvdGFsQ291bnQ6ICQoJyN0b3RhbC1jb3VudCcpLFxuICAgICR2YWxpZENvdW50OiAkKCcjdmFsaWQtY291bnQnKSxcbiAgICAkZHVwbGljYXRlQ291bnQ6ICQoJyNkdXBsaWNhdGUtY291bnQnKSxcbiAgICAkZXJyb3JDb3VudDogJCgnI2Vycm9yLWNvdW50JyksXG4gICAgJGNvbmZpcm1JbXBvcnQ6ICQoJyNjb25maXJtLWltcG9ydCcpLFxuICAgICRjYW5jZWxJbXBvcnQ6ICQoJyNjYW5jZWwtaW1wb3J0JyksXG4gICAgJGNhbmNlbEltcG9ydFByb2Nlc3M6ICQoJyNjYW5jZWwtaW1wb3J0LXByb2Nlc3MnKSxcbiAgICAkbmV3SW1wb3J0OiAkKCcjbmV3LWltcG9ydCcpLFxuICAgICRpbXBvcnRDb250cm9sczogJCgnI2ltcG9ydC1jb250cm9scycpLFxuICAgICRleHBvcnRCdXR0b246ICQoJyNleHBvcnQtYnV0dG9uJyksXG4gICAgJGRvd25sb2FkVGVtcGxhdGU6ICQoJyNkb3dubG9hZC10ZW1wbGF0ZScpLFxuICAgICRpbXBvcnRTdHJhdGVneTogJCgnI2ltcG9ydC1zdHJhdGVneScpLFxuICAgICRleHBvcnRGb3JtYXQ6ICQoJyNleHBvcnQtZm9ybWF0JyksXG4gICAgJHRlbXBsYXRlRm9ybWF0OiAkKCcjdGVtcGxhdGUtZm9ybWF0JyksXG4gICAgJG51bWJlckZyb206ICQoJyNudW1iZXItZnJvbScpLFxuICAgICRudW1iZXJUbzogJCgnI251bWJlci10bycpLFxuXG4gICAgLyoqXG4gICAgICogQ3VycmVudCB1cGxvYWQgZGF0YVxuICAgICAqL1xuICAgIHVwbG9hZElkOiBudWxsLFxuICAgIHVwbG9hZGVkRmlsZVBhdGg6IG51bGwsXG4gICAgdXBsb2FkZWRGaWxlSWQ6IG51bGwsXG4gICAgY3VycmVudEpvYklkOiBudWxsLFxuICAgIGltcG9ydENoYW5uZWxJZDogbnVsbCxcbiAgICBpbXBvcnRQcm9ncmVzc0NhbGxiYWNrOiBudWxsLFxuICAgIHByZXZpZXdEYXRhVGFibGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+OryBbQnVsa1VwbG9hZF0gTW9kdWxlIGluaXRpYWxpemF0aW9uIHN0YXJ0ZWQnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnMgd2l0aCBldmVudCBoYW5kbGVyIHRvIGNsZWFyIG1lc3NhZ2VzXG4gICAgICAgICQoJyNidWxrLXRhYnMgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+Rge+4jyBbQnVsa1VwbG9hZF0gVGFiIHZpc2libGUgZXZlbnQnKTtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgZXJyb3IgbWVzc2FnZXMgd2hlbiBzd2l0Y2hpbmcgdGFic1xuICAgICAgICAgICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFN0cmF0ZWd5LmRyb3Bkb3duKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRleHBvcnRGb3JtYXQuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlRm9ybWF0RGVzY3JpcHRpb24oJ2V4cG9ydCcsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR0ZW1wbGF0ZUZvcm1hdC5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVGb3JtYXREZXNjcmlwdGlvbigndGVtcGxhdGUnLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBpbml0aWFsIGZvcm1hdCBkZXNjcmlwdGlvbnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlRm9ybWF0RGVzY3JpcHRpb24oJ2V4cG9ydCcsICdzdGFuZGFyZCcpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVGb3JtYXREZXNjcmlwdGlvbigndGVtcGxhdGUnLCAnc3RhbmRhcmQnKTtcblxuICAgICAgICAvLyBTZXQgdXAgZmlsZSB1cGxvYWRcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW5pdGlhbGl6ZUZpbGVVcGxvYWQoKTtcblxuICAgICAgICAvLyBTZXQgdXAgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY29uZmlybUltcG9ydCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjYW5jZWxJbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY2FuY2VsSW1wb3J0KTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3Mub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY2FuY2VsSW1wb3J0UHJvY2Vzcyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRuZXdJbXBvcnQub24oJ2NsaWNrJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc3RhcnROZXdJbXBvcnQpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXhwb3J0QnV0dG9uLm9uKCdjbGljaycsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmV4cG9ydEVtcGxveWVlcyk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkb3dubG9hZFRlbXBsYXRlLm9uKCdjbGljaycsIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmRvd25sb2FkVGVtcGxhdGUpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgaW1wb3J0IHByb2dyZXNzXG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnaW1wb3J0X3Byb2dyZXNzJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQub25JbXBvcnRQcm9ncmVzcyk7XG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnaW1wb3J0X2NvbXBsZXRlJywgZXh0ZW5zaW9uc0J1bGtVcGxvYWQub25JbXBvcnRDb21wbGV0ZSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgVVJMIGhhc2ggdG8gYWN0aXZhdGUgY29ycmVjdCB0YWJcbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG4gICAgICAgICAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJcgW0J1bGtVcGxvYWRdIEFjdGl2YXRpbmcgdGFiIGZyb20gaGFzaCcsIHsgaGFzaCB9KTtcbiAgICAgICAgICAgICQoYCNidWxrLXRhYnMgLml0ZW1bZGF0YS10YWI9XCIke2hhc2h9XCJdYCkuY2xpY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgW0J1bGtVcGxvYWRdIE1vZHVsZSBpbml0aWFsaXphdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmlsZSB1cGxvYWQgdXNpbmcgRmlsZXNBUEkuYXR0YWNoVG9CdG4gZm9yIGNvbnNpc3RlbnQgYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmlsZVVwbG9hZCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflKcgW0J1bGtVcGxvYWRdIEluaXRpYWxpemluZyBmaWxlIHVwbG9hZCBmdW5jdGlvbmFsaXR5Jyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZWxlbWVudHMgZXhpc3QgYmVmb3JlIGluaXRpYWxpemluZ1xuICAgICAgICBpZiAoIWV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRCdXR0b24ubGVuZ3RoIHx8ICFleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBbQnVsa1VwbG9hZF0gVXBsb2FkIGVsZW1lbnRzIG5vdCBmb3VuZCcsIHtcbiAgICAgICAgICAgICAgICB1cGxvYWRCdXR0b246IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRCdXR0b24ubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHVwbG9hZFNlZ21lbnQ6IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50Lmxlbmd0aFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBVcGxvYWQgZWxlbWVudHMgbm90IGZvdW5kLCBza2lwcGluZyBmaWxlIHVwbG9hZCBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJ+KchSBbQnVsa1VwbG9hZF0gVXBsb2FkIGVsZW1lbnRzIGZvdW5kJywge1xuICAgICAgICAgICAgdXBsb2FkQnV0dG9uOiBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkQnV0dG9uLmxlbmd0aCxcbiAgICAgICAgICAgIHVwbG9hZFNlZ21lbnQ6IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50Lmxlbmd0aFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVc2UgRmlsZXNBUEkuYXR0YWNoVG9CdG4gZm9yIHVuaWZpZWQgZmlsZSB1cGxvYWQgaGFuZGxpbmdcbiAgICAgICAgLy8gVGhpcyBhdHRhY2hlcyBkaXJlY3RseSB0byB0aGUgYnV0dG9uIGFuZCBoYW5kbGVzIGZpbGUgc2VsZWN0aW9uIGludGVybmFsbHlcbiAgICAgICAgRmlsZXNBUEkuYXR0YWNoVG9CdG4oJ3VwbG9hZC1idXR0b24nLCBbJ2NzdiddLCBleHRlbnNpb25zQnVsa1VwbG9hZC5jYlVwbG9hZFJlc3VtYWJsZSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ+KchSBbQnVsa1VwbG9hZF0gRmlsZSB1cGxvYWQgYXR0YWNoZWQgdG8gYnV0dG9uIFwidXBsb2FkLWJ1dHRvblwiIHdpdGggQ1NWIGZpbHRlcicpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgZmlsZSB1cGxvYWQgd2l0aCBjaHVua3MgYW5kIG1lcmdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHBlcmZvcm1lZCBkdXJpbmcgdGhlIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHJlbGF0ZWQgdG8gdGhlIHVwbG9hZC5cbiAgICAgKi9cbiAgICBjYlVwbG9hZFJlc3VtYWJsZShhY3Rpb24sIHBhcmFtcykge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+TpSBbQnVsa1VwbG9hZF0gVXBsb2FkIGNhbGxiYWNrIHRyaWdnZXJlZCcsIHtcbiAgICAgICAgICAgIGFjdGlvbjogYWN0aW9uLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2ZpbGVBZGRlZCc6XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgW0J1bGtVcGxvYWRdIEZpbGUgYWRkZWQgZXZlbnQnLCB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lOiBwYXJhbXMuZmlsZT8uZmlsZU5hbWUgfHwgcGFyYW1zLmZpbGU/Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGZpbGVTaXplOiBwYXJhbXMuZmlsZT8uc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgZmlsZVR5cGU6IHBhcmFtcy5maWxlPy5maWxlPy50eXBlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWRTdGFydCc6XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CfmoAgW0J1bGtVcGxvYWRdIFVwbG9hZCBzdGFydGVkJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2ZpbGVQcm9ncmVzcyc6XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBwYXJhbXMuZmlsZSA/IE1hdGgucm91bmQocGFyYW1zLmZpbGUucHJvZ3Jlc3MoKSAqIDEwMCkgOiAwO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OIIFtCdWxrVXBsb2FkXSBVcGxvYWQgcHJvZ3Jlc3MnLCB7XG4gICAgICAgICAgICAgICAgICAgIHByb2dyZXNzOiBwcm9ncmVzcyArICclJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZmlsZVN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgW0J1bGtVcGxvYWRdIFVwbG9hZCBzdWNjZXNzJywge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZTogcGFyYW1zLnJlc3BvbnNlXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBQYnhBcGkudHJ5UGFyc2VKU09OKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4sgW0J1bGtVcGxvYWRdIFBhcnNlZCByZXNwb25zZScsIHsgcmVzdWx0IH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UgJiYgcmVzdWx0LmRhdGEgJiYgcmVzdWx0LmRhdGEudXBsb2FkX2lkKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkID0gcmVzdWx0LmRhdGEudXBsb2FkX2lkO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVQYXRoID0gcmVzdWx0LmRhdGEuZmlsZW5hbWU7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfkr4gW0J1bGtVcGxvYWRdIEZpbGUgZGF0YSBzYXZlZCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZElkOiBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVQYXRoXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgW0J1bGtVcGxvYWRdIEludmFsaWQgcmVzcG9uc2UgZm9ybWF0Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZXN1bHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNEYXRhOiByZXN1bHQgPyAhIXJlc3VsdC5kYXRhIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNVcGxvYWRJZDogcmVzdWx0Py5kYXRhPy51cGxvYWRfaWQgfHwgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2VzOiByZXN1bHQ/Lm1lc3NhZ2VzIHx8ICdObyBlcnJvciBtZXNzYWdlcycsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRSZXN1bHQ6IHJlc3VsdD8ucmVzdWx0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmF3UmVzcG9uc2U6IHBhcmFtcy5yZXNwb25zZVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG1vcmUgc3BlY2lmaWMgZXJyb3IgbWVzc2FnZSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5leF9GaWxlVXBsb2FkRXJyb3I7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gcmVzdWx0Lm1lc3NhZ2VzLmVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign8J+aqCBbQnVsa1VwbG9hZF0gU2VydmVyIGVycm9yIG1lc3NhZ2U6JywgcmVzdWx0Lm1lc3NhZ2VzLmVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgJiYgcmVzdWx0Lm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfwn5qoIFtCdWxrVXBsb2FkXSBTZXJ2ZXIgbWVzc2FnZXM6JywgcmVzdWx0Lm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzdWx0Lm1lc3NhZ2VzID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IHJlc3VsdC5tZXNzYWdlcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShyZXN1bHQubWVzc2FnZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gcmVzdWx0Lm1lc3NhZ2VzLmpvaW4oJywgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdmaWxlRXJyb3InOlxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBbQnVsa1VwbG9hZF0gRmlsZSBlcnJvcicsIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWU6IHBhcmFtcy5maWxlPy5maWxlTmFtZSB8fCBwYXJhbXMuZmlsZT8ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcGFyYW1zLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuZXhfRmlsZVVwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfwn5KlIFtCdWxrVXBsb2FkXSBVcGxvYWQgZXJyb3InLCB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHBhcmFtcy5tZXNzYWdlIHx8IHBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgZmlsZTogcGFyYW1zLmZpbGVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMsIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWxlVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY29tcGxldGUnOlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn4+BIFtCdWxrVXBsb2FkXSBVcGxvYWQgY29tcGxldGUnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOKEue+4jyBbQnVsa1VwbG9hZF0gVW5oYW5kbGVkIGFjdGlvbjogJHthY3Rpb259YCwgeyBwYXJhbXMgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgZmlsZSBtZXJnaW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBmaWxlIG1lcmdpbmcgc3RhdHVzIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgUGJ4QXBpLnRyeVBhcnNlSlNPTihyZXNwb25zZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X0ZpbGVVcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG4gICAgICAgIGlmIChqc29uID09PSB1bmRlZmluZWQgfHwganNvbi5kYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuZXhfRmlsZVVwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXBsb2FkSWQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHVwbG9hZCBwcm9ncmVzc1xuICAgICAgICBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLnN1YnNjcmliZSh1cGxvYWRJZCwge1xuICAgICAgICAgICAgb25NZXJnZVN0YXJ0ZWQ6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRmlsZSBtZXJnZSBzdGFydGVkXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlUHJvZ3Jlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGlmIG5lZWRlZFxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZUNvbXBsZXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucHJldmlld0ltcG9ydCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25FcnJvcjogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9GaWxlVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpbW1lZGlhdGUgc3RhdHVzIChzYW1lIGFzIHNvdW5kLWZpbGUtbW9kaWZ5LmpzKVxuICAgICAgICBpZiAoanNvbi5kYXRhLmRfc3RhdHVzID09PSAnVVBMT0FEX0NPTVBMRVRFJyB8fCAhanNvbi5kYXRhLmRfc3RhdHVzKSB7XG4gICAgICAgICAgICAvLyBGaWxlIGlzIGFscmVhZHkgcmVhZHksIHByb2NlZWQgd2l0aCBwcmV2aWV3IGltbWVkaWF0ZWx5XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdXBsb2FkU2VnbWVudC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQucHJldmlld0ltcG9ydCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIE5vdGU6IHN0YXJ0TWVyZ2luZ0NoZWNrV29ya2VyKCkgbWV0aG9kIHJlbW92ZWQgLSBub3cgdXNpbmcgRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG5cbiAgICAvKipcbiAgICAgKiBQcmV2aWV3IGltcG9ydCAtIHZhbGlkYXRlIENTViBhbmQgc2hvdyBwcmV2aWV3XG4gICAgICovXG4gICAgcHJldmlld0ltcG9ydCgpIHtcbiAgICAgICAgY29uc3Qgc3RyYXRlZ3kgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gVXNlIHVwbG9hZGVkRmlsZUlkIGZvciBBUEkgY2FsbCwgYXMgdGhlIGZpbGUgaXMgbm93IGZ1bGx5IG1lcmdlZFxuICAgICAgICBFbXBsb3llZXNBUEkuaW1wb3J0Q1NWKFxuICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlSWQsXG4gICAgICAgICAgICAncHJldmlldycsXG4gICAgICAgICAgICBzdHJhdGVneSxcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQmFja2VuZCByZXR1cm5zIHVwbG9hZF9pZCwgbm90IHVwbG9hZElkXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZElkID0gcmVzcG9uc2UuZGF0YS51cGxvYWRfaWQgfHwgcmVzcG9uc2UuZGF0YS51cGxvYWRJZDtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc2hvd1ByZXZpZXcocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgcHJldmlldyBvZiBDU1YgZGF0YVxuICAgICAqL1xuICAgIHNob3dQcmV2aWV3KGRhdGEpIHtcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRpc3RpY3NcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHRvdGFsQ291bnQudGV4dChkYXRhLnRvdGFsIHx8IDApO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kdmFsaWRDb3VudC50ZXh0KGRhdGEudmFsaWQgfHwgMCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkdXBsaWNhdGVDb3VudC50ZXh0KGRhdGEuZHVwbGljYXRlcyB8fCAwKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGVycm9yQ291bnQudGV4dChkYXRhLmVycm9ycyB8fCAwKTtcblxuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIERhdGFUYWJsZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUuZGVzdHJveSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgYW5kIHBvcHVsYXRlIHByZXZpZXcgdGFibGVcbiAgICAgICAgY29uc3QgJHRib2R5ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5maW5kKCd0Ym9keScpO1xuICAgICAgICAkdGJvZHkuZW1wdHkoKTtcblxuICAgICAgICBpZiAoZGF0YS5wcmV2aWV3ICYmIGRhdGEucHJldmlldy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBkYXRhLnByZXZpZXcuZm9yRWFjaCgocm93KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSByb3cuc3RhdHVzID09PSAndmFsaWQnID8gJ3Bvc2l0aXZlJyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5zdGF0dXMgPT09ICdkdXBsaWNhdGUnIHx8IHJvdy5zdGF0dXMgPT09ICdleGlzdHMnID8gJ3dhcm5pbmcnIDogJ25lZ2F0aXZlJztcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNJY29uID0gcm93LnN0YXR1cyA9PT0gJ3ZhbGlkJyA/ICdjaGVjayBjaXJjbGUnIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3cuc3RhdHVzID09PSAnZHVwbGljYXRlJyB8fCByb3cuc3RhdHVzID09PSAnZXhpc3RzJyA/ICdleGNsYW1hdGlvbiB0cmlhbmdsZScgOiAndGltZXMgY2lyY2xlJztcblxuICAgICAgICAgICAgICAgIC8vIFRyYW5zbGF0ZSBzdGF0dXMgdGV4dFxuICAgICAgICAgICAgICAgIGxldCBzdGF0dXNUZXh0ID0gcm93LnN0YXR1cztcbiAgICAgICAgICAgICAgICBzd2l0Y2gocm93LnN0YXR1cykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2YWxpZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c1ZhbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2R1cGxpY2F0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c0R1cGxpY2F0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdleGlzdHMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNFeGlzdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNFcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnZhbGlkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c1RleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzSW52YWxpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGBcbiAgICAgICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwiJHtzdGF0dXNDbGFzc31cIiBkYXRhLXJvdz1cIiR7cm93LnJvd31cIiBkYXRhLW51bWJlcj1cIiR7cm93Lm51bWJlcn1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke3Jvdy5udW1iZXIgfHwgJyd9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke3Jvdy51c2VyX3VzZXJuYW1lIHx8ICcnfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtyb3cubW9iaWxlX251bWJlciB8fCAnJ308L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPiR7cm93LnVzZXJfZW1haWwgfHwgJyd9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInN0YXR1cy1jZWxsXCI+PGkgY2xhc3M9XCIke3N0YXR1c0ljb259IGljb25cIj48L2k+IDxzcGFuIGNsYXNzPVwic3RhdHVzLXRleHRcIj4ke3N0YXR1c1RleHR9PC9zcGFuPjwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgJHRib2R5LmFwcGVuZCgkcm93KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIHNpbXBsZSBTZW1hbnRpYyBVSSB0YWJsZSBpbnN0ZWFkIG9mIERhdGFUYWJsZXMgdG8gYXZvaWQgaGVhZGVyL2JvZHkgc2VwYXJhdGlvbiBpc3N1ZXNcbiAgICAgICAgLy8gQWRkIENTUyBjbGFzcyB0byBwcmV2aWV3IHRhYmxlIGZvciBzdHlsaW5nXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuYWRkQ2xhc3MoJ3ByZXZpZXctdGFibGUnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIHRhYmxlIHNvcnRpbmcgbWFudWFsbHkgaWYgbmVlZGVkXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGgnKS5lYWNoKGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICBjb25zdCAkdGggPSAkKHRoaXMpO1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSA0KSB7IC8vIFN0YXR1cyBjb2x1bW4gLSBtYWtlIGl0IHNvcnRhYmxlIChub3cgYXQgaW5kZXggNClcbiAgICAgICAgICAgICAgICAkdGguYWRkQ2xhc3MoJ3NvcnRlZCBhc2NlbmRpbmcnKTsgLy8gU2V0IGluaXRpYWwgc29ydFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkdGgub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGFsbFRoID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5maW5kKCd0aCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0Ym9keSA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGJvZHknKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkcm93cyA9ICR0Ym9keS5maW5kKCd0cicpO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHNvcnRpbmcgY2xhc3NlcyBmcm9tIG90aGVyIGhlYWRlcnNcbiAgICAgICAgICAgICAgICAkYWxsVGgucmVtb3ZlQ2xhc3MoJ3NvcnRlZCBhc2NlbmRpbmcgZGVzY2VuZGluZycpO1xuXG4gICAgICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIHNvcnQgZGlyZWN0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgaXNBc2NlbmRpbmcgPSAhJHRoLmhhc0NsYXNzKCdzb3J0ZWQnKSB8fCAkdGguaGFzQ2xhc3MoJ2Rlc2NlbmRpbmcnKTtcbiAgICAgICAgICAgICAgICAkdGguYWRkQ2xhc3MoaXNBc2NlbmRpbmcgPyAnc29ydGVkIGFzY2VuZGluZycgOiAnc29ydGVkIGRlc2NlbmRpbmcnKTtcblxuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBzb3J0IGltcGxlbWVudGF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3Qgc29ydGVkUm93cyA9ICRyb3dzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhVGV4dCA9ICQoYSkuZmluZCgndGQnKS5lcShpbmRleCkudGV4dCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYlRleHQgPSAkKGIpLmZpbmQoJ3RkJykuZXEoaW5kZXgpLnRleHQoKS50cmltKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHN0YXR1cyBjb2x1bW4sIHNvcnQgYnkgc3RhdHVzIHByaW9yaXR5XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzT3JkZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ9Cf0YDQvtC/0YPRidC10L0nOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICfQodC+0LfQtNCw0L0nOiAyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICfQntCx0L3QvtCy0LvQtdC9JzogMyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAn0KPQttC1INGB0YPRidC10YHRgtCy0YPQtdGCJzogNCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAn0J7RiNC40LHQutCwJzogNVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFTdGF0dXMgPSBzdGF0dXNPcmRlclthVGV4dC5zcGxpdCgnICcpLnNsaWNlKDEpLmpvaW4oJyAnKV0gfHwgOTk5O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYlN0YXR1cyA9IHN0YXR1c09yZGVyW2JUZXh0LnNwbGl0KCcgJykuc2xpY2UoMSkuam9pbignICcpXSB8fCA5OTk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXNBc2NlbmRpbmcgPyBhU3RhdHVzIC0gYlN0YXR1cyA6IGJTdGF0dXMgLSBhU3RhdHVzO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG90aGVyIGNvbHVtbnMsIHNpbXBsZSB0ZXh0IHNvcnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFUZXh0IDwgYlRleHQpIHJldHVybiBpc0FzY2VuZGluZyA/IC0xIDogMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFUZXh0ID4gYlRleHQpIHJldHVybiBpc0FzY2VuZGluZyA/IDEgOiAtMTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkdGJvZHkuZW1wdHkoKS5hcHBlbmQoc29ydGVkUm93cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3RvcmUgcmVmZXJlbmNlIGZvciByb3cgdXBkYXRlcyAoY29tcGF0aWJpbGl0eSB3aXRoIGV4aXN0aW5nIGNvZGUpXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnByZXZpZXdEYXRhVGFibGUgPSB7XG4gICAgICAgICAgICBkZXN0cm95OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBDbGVhbnVwIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGgnKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5yZW1vdmVDbGFzcygncHJldmlldy10YWJsZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNob3cgcHJldmlldyBzZWN0aW9uLCBoaWRlIHVwbG9hZCBzZWN0aW9uXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdTZWN0aW9uLnNob3coKTtcblxuICAgICAgICAvLyBOb3RlOiBSZW1vdmVkIGF1dG9tYXRpYyBzY3JvbGxpbmcgdG8gcHJldmVudCBwYWdlIGp1bXBpbmcgZHVyaW5nIHByb2Nlc3NpbmdcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uZmlybSBhbmQgc3RhcnQgaW1wb3J0XG4gICAgICovXG4gICAgY29uZmlybUltcG9ydCgpIHtcbiAgICAgICAgaWYgKCFleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRJZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKCdVcGxvYWQgSUQgaXMgbWlzc2luZycsICdlcnJvcicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RyYXRlZ3kgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjb25maXJtSW1wb3J0LmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgRW1wbG95ZWVzQVBJLmNvbmZpcm1JbXBvcnQoXG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRJZCxcbiAgICAgICAgICAgIHN0cmF0ZWd5LFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBLZWVwIHByZXZpZXcgdGFibGUgdmlzaWJsZSwgc2hvdyBwcm9ncmVzcyBzZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcm9ncmVzc1NlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgaW1wb3J0IGJ1dHRvbnMsIHNob3cgY2FuY2VsIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY29uZmlybUltcG9ydC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjYW5jZWxJbXBvcnQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0U3RyYXRlZ3kuY2xvc2VzdCgnLmZpZWxkJykuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNhdmUgam9iIGluZm9ybWF0aW9uIGZvciBjYW5jZWxsYXRpb25cbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkID0gcmVzcG9uc2UuZGF0YS5qb2JJZCB8fCBudWxsO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgPSByZXNwb25zZS5kYXRhLmNoYW5uZWxJZCB8fCBudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcHJvZ3Jlc3MgYmFyXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRQcm9ncmVzcy5wcm9ncmVzcyh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZXJjZW50OiAwXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IHByb2dyZXNzIHRleHRcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGFydGVkKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTdWJzY3JpYmUgdG8gaW1wb3J0IHByb2dyZXNzIGV2ZW50cyB2aWEgRXZlbnRCdXMgRklSU1RcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuY2hhbm5lbElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5zdWJzY3JpYmVUb0ltcG9ydFByb2dyZXNzKHJlc3BvbnNlLmRhdGEuY2hhbm5lbElkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IHZhbGlkIHJvd3MgdG8gJ3Byb2Nlc3NpbmcnIHN0YXR1cyBhZnRlciBhIHNtYWxsIGRlbGF5IHRvIGVuc3VyZSBFdmVudEJ1cyBpcyByZWFkeVxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnJlc2V0VGFibGVUb1Byb2Nlc3NpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIGltcG9ydCBwcm9ncmVzcyBldmVudHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2hhbm5lbElkIC0gSW1wb3J0IHByb2dyZXNzIGNoYW5uZWwgSURcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb0ltcG9ydFByb2dyZXNzKGNoYW5uZWxJZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhg8J+UlCBbQnVsa1VwbG9hZF0gU3Vic2NyaWJpbmcgdG8gRXZlbnRCdXMgY2hhbm5lbDogJHtjaGFubmVsSWR9YCk7XG5cbiAgICAgICAgLy8gU3RvcmUgY2FsbGJhY2sgZnVuY3Rpb24gcmVmZXJlbmNlIGZvciBsYXRlciB1bnN1YnNjcmlwdGlvblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrID0gKG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGDwn5OoIFtCdWxrVXBsb2FkXSBFdmVudEJ1cyBtZXNzYWdlIHJlY2VpdmVkOmAsIG1lc3NhZ2UpO1xuXG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg8J+UhCBbQnVsa1VwbG9hZF0gUHJvY2Vzc2luZyBtZXNzYWdlIHR5cGU6ICR7bWVzc2FnZS50eXBlfWApO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ltcG9ydF9zdGFydGVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmhhbmRsZUltcG9ydFN0YXJ0ZWQobWVzc2FnZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbXBvcnRfcHJvZ3Jlc3MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaGFuZGxlSW1wb3J0UHJvZ3Jlc3MobWVzc2FnZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbXBvcnRfY29tcGxldGVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmhhbmRsZUltcG9ydENvbXBsZXRlZChtZXNzYWdlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYOKaoO+4jyBbQnVsa1VwbG9hZF0gVW5rbm93biBtZXNzYWdlIHR5cGU6ICR7bWVzc2FnZS50eXBlfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGDimqDvuI8gW0J1bGtVcGxvYWRdIEludmFsaWQgbWVzc2FnZSBmb3JtYXQ6YCwgbWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKGNoYW5uZWxJZCwgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayk7XG4gICAgICAgIGNvbnNvbGUubG9nKGDinIUgW0J1bGtVcGxvYWRdIEV2ZW50QnVzIHN1YnNjcmlwdGlvbiBjb21wbGV0ZWQgZm9yIGNoYW5uZWw6ICR7Y2hhbm5lbElkfWApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW1wb3J0IHN0YXJ0ZWQgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEltcG9ydCBzdGFydGVkIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVJbXBvcnRTdGFydGVkKGRhdGEpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlUHJvZ3Jlc3NUZXh0KGAke2dsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGFydGVkfSAoJHtkYXRhLnRvdGFsfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9SZWNvcmRzfSlgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGltcG9ydCBwcm9ncmVzcyBldmVudFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gSW1wb3J0IHByb2dyZXNzIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVJbXBvcnRQcm9ncmVzcyhkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIFtCdWxrVXBsb2FkXSBoYW5kbGVJbXBvcnRQcm9ncmVzcyBjYWxsZWQgd2l0aCBkYXRhOicsIGRhdGEpO1xuXG4gICAgICAgIGNvbnN0IHBlcmNlbnQgPSBNYXRoLnJvdW5kKChkYXRhLnByb2Nlc3NlZCAvIGRhdGEudG90YWwpICogMTAwKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFByb2dyZXNzLnByb2dyZXNzKHtcbiAgICAgICAgICAgIHBlcmNlbnQ6IHBlcmNlbnRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGluZGl2aWR1YWwgcm93IHN0YXR1cyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoZGF0YS5jdXJyZW50UmVjb3JkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBbQnVsa1VwbG9hZF0gVXBkYXRpbmcgcm93IHN0YXR1cyBmb3I6JywgZGF0YS5jdXJyZW50UmVjb3JkKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwZGF0ZVJvd1N0YXR1cyhcbiAgICAgICAgICAgICAgICBkYXRhLmN1cnJlbnRSZWNvcmQubnVtYmVyLFxuICAgICAgICAgICAgICAgIGRhdGEuY3VycmVudFJlY29yZC5zdGF0dXMsXG4gICAgICAgICAgICAgICAgZGF0YS5jdXJyZW50UmVjb3JkLm1lc3NhZ2VcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBwcm9ncmVzcyBtZXNzYWdlIHdpdGggc2tpcHBlZCBjb3VudFxuICAgICAgICBjb25zdCBwYXJ0cyA9IFtdO1xuICAgICAgICBpZiAoZGF0YS5jcmVhdGVkID4gMCkge1xuICAgICAgICAgICAgcGFydHMucHVzaChgJHtkYXRhLmNyZWF0ZWR9ICR7Z2xvYmFsVHJhbnNsYXRlLmV4X0NyZWF0ZWR9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEudXBkYXRlZCA+IDApIHtcbiAgICAgICAgICAgIHBhcnRzLnB1c2goYCR7ZGF0YS51cGRhdGVkfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9VcGRhdGVkfWApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLnNraXBwZWQgPiAwKSB7XG4gICAgICAgICAgICBwYXJ0cy5wdXNoKGAke2RhdGEuc2tpcHBlZH0gJHtnbG9iYWxUcmFuc2xhdGUuZXhfU2tpcHBlZH1gKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5lcnJvcnMgPiAwKSB7XG4gICAgICAgICAgICBwYXJ0cy5wdXNoKGAke2RhdGEuZXJyb3JzfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9FcnJvcnN9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtZXNzYWdlID0gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFByb2dyZXNzfTogJHtkYXRhLnByb2Nlc3NlZH0vJHtkYXRhLnRvdGFsfSAoJHtwYXJ0cy5qb2luKCcsICcpfSlgO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGRhdGVQcm9ncmVzc1RleHQobWVzc2FnZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbXBvcnQgY29tcGxldGVkIGV2ZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBJbXBvcnQgY29tcGxldGlvbiBkYXRhXG4gICAgICovXG4gICAgaGFuZGxlSW1wb3J0Q29tcGxldGVkKGRhdGEpIHtcblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0UHJvZ3Jlc3MucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgcGVyY2VudDogMTAwXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNob3cgY29tcGxldGlvbiBtZXNzYWdlXG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0Q29tcGxldGVkfTogJHtkYXRhLmNyZWF0ZWR9ICR7Z2xvYmFsVHJhbnNsYXRlLmV4X0NyZWF0ZWR9LCAke2RhdGEudXBkYXRlZH0gJHtnbG9iYWxUcmFuc2xhdGUuZXhfVXBkYXRlZH0sICR7ZGF0YS5za2lwcGVkfSAke2dsb2JhbFRyYW5zbGF0ZS5leF9Ta2lwcGVkfSwgJHtkYXRhLmVycm9yc30gJHtnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JzfWA7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwZGF0ZVByb2dyZXNzVGV4dChtZXNzYWdlKTtcblxuICAgICAgICAvLyBIaWRlIGNhbmNlbCBidXR0b24gYW5kIGVudGlyZSBpbXBvcnQgY29udHJvbHMgYmxvY2sgYWZ0ZXIgY29tcGxldGlvblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY2FuY2VsSW1wb3J0UHJvY2Vzcy5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRDb250cm9scy5oaWRlKCk7XG5cbiAgICAgICAgLy8gQ2xlYXIgam9iIGRhdGFcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkID0gbnVsbDtcblxuICAgICAgICAvLyBVbnN1YnNjcmliZSBmcm9tIHByb2dyZXNzIGV2ZW50cyBhZnRlciBjb21wbGV0aW9uXG4gICAgICAgIGlmIChleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgJiYgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjaykge1xuICAgICAgICAgICAgRXZlbnRCdXMudW5zdWJzY3JpYmUoZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkLCBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydENoYW5uZWxJZCA9IG51bGw7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF1dG9tYXRpY2FsbHkgc29ydCB0YWJsZSBieSBzdGF0dXMgYWZ0ZXIgaW1wb3J0IGNvbXBsZXRpb25cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuc29ydFRhYmxlQnlTdGF0dXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FuY2VsIGltcG9ydCBhbmQgcmVzZXRcbiAgICAgKi9cbiAgICBjYW5jZWxJbXBvcnQoKSB7XG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHVwbG9hZFNlZ21lbnQuc2hvdygpO1xuICAgICAgICAvLyBVbnN1YnNjcmliZSBmcm9tIEV2ZW50QnVzIGlmIHN1YnNjcmliZWRcbiAgICAgICAgaWYgKGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkKSB7XG4gICAgICAgICAgICBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLnVuc3Vic2NyaWJlKGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZElkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlUGF0aCA9IG51bGw7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwbG9hZGVkRmlsZUlkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayA9IG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbmNlbCB0aGUgcnVubmluZyBpbXBvcnQgcHJvY2Vzc1xuICAgICAqL1xuICAgIGNhbmNlbEltcG9ydFByb2Nlc3MoKSB7XG4gICAgICAgIGlmICghZXh0ZW5zaW9uc0J1bGtVcGxvYWQuY3VycmVudEpvYklkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYnV0dG9uIHRvIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3MuYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAvLyBGb3Igbm93LCBqdXN0IHN0b3AgdGhlIFVJIHVwZGF0ZXMgc2luY2Ugc2VydmVyLXNpZGUgY2FuY2VsbGF0aW9uIGlzIG5vdCBpbXBsZW1lbnRlZFxuICAgICAgICAvLyBUT0RPOiBJbXBsZW1lbnQgc2VydmVyLXNpZGUgam9iIGNhbmNlbGxhdGlvblxuXG4gICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyB0ZXh0IHdpdGggY2FuY2VsbGF0aW9uIG1lc3NhZ2VcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBkYXRlUHJvZ3Jlc3NUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRDYW5jZWxsZWQpO1xuXG4gICAgICAgIC8vIEhpZGUgcHJvZ3Jlc3Mgc2VjdGlvblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcblxuICAgICAgICAvLyBTaG93IGltcG9ydCBidXR0b25zIGFnYWluXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRjb25maXJtSW1wb3J0LnNob3coKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydC5zaG93KCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRTdHJhdGVneS5jbG9zZXN0KCcuZmllbGQnKS5zaG93KCk7XG5cbiAgICAgICAgLy8gVW5zdWJzY3JpYmUgZnJvbSBFdmVudEJ1c1xuICAgICAgICBpZiAoZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0Q2hhbm5lbElkICYmIGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydFByb2dyZXNzQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnVuc3Vic2NyaWJlKGV4dGVuc2lvbnNCdWxrVXBsb2FkLmltcG9ydENoYW5uZWxJZCwgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuaW1wb3J0UHJvZ3Jlc3NDYWxsYmFjayk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciBqb2IgZGF0YVxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5jdXJyZW50Sm9iSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrID0gbnVsbDtcblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY2FuY2VsSW1wb3J0UHJvY2Vzcy5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydCBuZXcgaW1wb3J0XG4gICAgICovXG4gICAgc3RhcnROZXdJbXBvcnQoKSB7XG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdHNTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3U2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiR1cGxvYWRTZWdtZW50LnNob3coKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC51cGxvYWRlZEZpbGVQYXRoID0gbnVsbDtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQudXBsb2FkZWRGaWxlSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5jdXJyZW50Sm9iSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRDaGFubmVsSWQgPSBudWxsO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbXBvcnRQcm9ncmVzc0NhbGxiYWNrID0gbnVsbDtcblxuICAgICAgICAvLyBSZXNldCB1cGxvYWQgc3RhdGUgaGFuZGxlZCBieSBGaWxlc0FQSVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW1wb3J0IHByb2dyZXNzIGZyb20gRXZlbnRCdXNcbiAgICAgKi9cbiAgICBvbkltcG9ydFByb2dyZXNzKGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEucGVyY2VudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kaW1wb3J0UHJvZ3Jlc3MucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgIHBlcmNlbnQ6IGRhdGEucGVyY2VudFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF0YS5tZXNzYWdlKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJvZ3Jlc3NMYWJlbC50ZXh0KGRhdGEubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF0YS5sb2cpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLnVwZGF0ZVByb2dyZXNzVGV4dChkYXRhLmxvZyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGltcG9ydCBjb21wbGV0aW9uXG4gICAgICovXG4gICAgb25JbXBvcnRDb21wbGV0ZShkYXRhKSB7XG4gICAgICAgIC8vIEtlZXAgdGFibGUgdmlzaWJsZSwgaGlkZSBwcm9ncmVzcyBiYXIsIHNob3cgcmVzdWx0cyBzZWN0aW9uXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRpbXBvcnRQcm9ncmVzcy5oaWRlKCk7XG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcm9ncmVzc0xhYmVsLmhpZGUoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNhbmNlbEltcG9ydFByb2Nlc3MuaGlkZSgpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcmVzdWx0c1NlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgIC8vIFNob3cgaW1wb3J0IGJ1dHRvbnMgYWdhaW4gZm9yIG5ldyBpbXBvcnRcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGNvbmZpcm1JbXBvcnQuc2hvdygpO1xuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kY2FuY2VsSW1wb3J0LnNob3coKTtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGltcG9ydFN0cmF0ZWd5LmNsb3Nlc3QoJy5maWVsZCcpLnNob3coKTtcblxuICAgICAgICAvLyBTaG93IHJlc3VsdCBtZXNzYWdlXG4gICAgICAgIGNvbnN0IG1lc3NhZ2VDbGFzcyA9IGRhdGEuc3VjY2VzcyA/ICdwb3NpdGl2ZScgOiAnbmVnYXRpdmUnO1xuICAgICAgICBjb25zdCBtZXNzYWdlSWNvbiA9IGRhdGEuc3VjY2VzcyA/ICdjaGVjayBjaXJjbGUnIDogJ3RpbWVzIGNpcmNsZSc7XG4gICAgICAgIGxldCBtZXNzYWdlVGV4dCA9ICcnO1xuXG4gICAgICAgIGlmIChkYXRhLnN0YXRzKSB7XG4gICAgICAgICAgICBtZXNzYWdlVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdWNjZXNzXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJ3tjcmVhdGVkfScsIGRhdGEuc3RhdHMuY3JlYXRlZCB8fCAwKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKCd7c2tpcHBlZH0nLCBkYXRhLnN0YXRzLnNraXBwZWQgfHwgMClcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgne2ZhaWxlZH0nLCBkYXRhLnN0YXRzLmZhaWxlZCB8fCAwKTtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICBtZXNzYWdlVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRGYWlsZWQucmVwbGFjZSgne2Vycm9yfScsIGRhdGEuZXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHJlc3VsdE1lc3NhZ2UuaHRtbChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiJHttZXNzYWdlQ2xhc3N9IG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIiR7bWVzc2FnZUljb259IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7ZGF0YS5zdWNjZXNzID8gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydENvbXBsZXRlIDogZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydEZhaWxlZH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHttZXNzYWdlVGV4dH08L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwcm9ncmVzcyB0ZXh0XG4gICAgICovXG4gICAgdXBkYXRlUHJvZ3Jlc3NUZXh0KG1lc3NhZ2UpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByb2dyZXNzVGV4dC50ZXh0KG1lc3NhZ2UpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHBvcnQgZW1wbG95ZWVzIHRvIENTVlxuICAgICAqL1xuICAgIGV4cG9ydEVtcGxveWVlcygpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0ID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEZvcm1hdC5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgIGNvbnN0IGZpbHRlciA9IHt9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbnVtYmVyRnJvbSA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJGcm9tLnZhbCgpO1xuICAgICAgICBjb25zdCBudW1iZXJUbyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRudW1iZXJUby52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChudW1iZXJGcm9tKSB7XG4gICAgICAgICAgICBmaWx0ZXIubnVtYmVyX2Zyb20gPSBudW1iZXJGcm9tO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudW1iZXJUbykge1xuICAgICAgICAgICAgZmlsdGVyLm51bWJlcl90byA9IG51bWJlclRvO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGV4cG9ydEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIEVtcGxveWVlc0FQSS5leHBvcnRDU1YoXG4gICAgICAgICAgICBmb3JtYXQsXG4gICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kZXhwb3J0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZG93bmxvYWQgdXNpbmcgdGhlIGxpbmsgZnJvbSB0aGUgc2VydmVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmZpbGVuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZXNwb25zZS5kYXRhLmZpbGVuYW1lIGFscmVhZHkgY29udGFpbnMgdGhlIGZ1bGwgcGF0aCBmcm9tIHJvb3RcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzcG9uc2UuZGF0YS5maWxlbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZCBDU1YgdGVtcGxhdGVcbiAgICAgKi9cbiAgICBkb3dubG9hZFRlbXBsYXRlKCkge1xuICAgICAgICBjb25zdCBmb3JtYXQgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kdGVtcGxhdGVGb3JtYXQuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRkb3dubG9hZFRlbXBsYXRlLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgRW1wbG95ZWVzQVBJLmdldFRlbXBsYXRlKFxuICAgICAgICAgICAgZm9ybWF0LFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJGRvd25sb2FkVGVtcGxhdGUucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBkb3dubG9hZCB1c2luZyB0aGUgbGluayBmcm9tIHRoZSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgYWxyZWFkeSBjb250YWlucyB0aGUgZnVsbCBwYXRoIGZyb20gcm9vdFxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXNwb25zZS5kYXRhLmZpbGVuYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBmaWVsZCBkZXNjcmlwdGlvbnMgZm9yIGZvcm1hdFxuICAgICAqL1xuICAgIGdldEZvcm1hdEZpZWxkcyhmb3JtYXQpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0cyA9IHtcbiAgICAgICAgICAgIG1pbmltYWw6IFtcbiAgICAgICAgICAgICAgICAnbnVtYmVyIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE51bWJlcl9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX3VzZXJuYW1lIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFVzZXJuYW1lX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3VzZXJfZW1haWwgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRW1haWxfSGVscCxcbiAgICAgICAgICAgICAgICAnbW9iaWxlX251bWJlciAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRNb2JpbGVfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3NlY3JldCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRQYXNzd29yZF9IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfcmluZ2xlbmd0aCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdfSGVscFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHN0YW5kYXJkOiBbXG4gICAgICAgICAgICAgICAgJ251bWJlciAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGROdW1iZXJfSGVscCxcbiAgICAgICAgICAgICAgICAndXNlcl91c2VybmFtZSAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRVc2VybmFtZV9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX2VtYWlsIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEVtYWlsX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9udW1iZXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTW9iaWxlX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9kaWFsc3RyaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE1vYmlsZURpYWxzdHJpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3NlY3JldCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRQYXNzd29yZF9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfZHRtZm1vZGUgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRFRNRk1vZGVfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3RyYW5zcG9ydCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRUcmFuc3BvcnRfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX2VuYWJsZVJlY29yZGluZyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSZWNvcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX3JpbmdsZW5ndGggLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkUmluZ0xlbmd0aF9IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfZm9yd2FyZGluZyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRGb3J3YXJkaW5nX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nb25idXN5IC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdCdXN5X0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nb251bmF2YWlsYWJsZSAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRGb3J3YXJkaW5nVW5hdmFpbGFibGVfSGVscFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZ1bGw6IFtcbiAgICAgICAgICAgICAgICAnbnVtYmVyIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE51bWJlcl9IZWxwLFxuICAgICAgICAgICAgICAgICd1c2VyX3VzZXJuYW1lIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZFVzZXJuYW1lX0hlbHAsXG4gICAgICAgICAgICAgICAgJ3VzZXJfZW1haWwgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRW1haWxfSGVscCxcbiAgICAgICAgICAgICAgICAndXNlcl9hdmF0YXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkQXZhdGFyX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9udW1iZXIgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTW9iaWxlX0hlbHAsXG4gICAgICAgICAgICAgICAgJ21vYmlsZV9kaWFsc3RyaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZE1vYmlsZURpYWxzdHJpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3NlY3JldCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRQYXNzd29yZF9IZWxwLFxuICAgICAgICAgICAgICAgICdzaXBfZHRtZm1vZGUgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRFRNRk1vZGVfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX3RyYW5zcG9ydCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRUcmFuc3BvcnRfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX2VuYWJsZVJlY29yZGluZyAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSZWNvcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnc2lwX21hbnVhbGF0dHJpYnV0ZXMgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkTWFudWFsQXR0cmlidXRlc19IZWxwLFxuICAgICAgICAgICAgICAgICdmd2RfcmluZ2xlbmd0aCAtICcgKyBnbG9iYWxUcmFuc2xhdGUuZXhfRmllbGRSaW5nTGVuZ3RoX0hlbHAsXG4gICAgICAgICAgICAgICAgJ2Z3ZF9mb3J3YXJkaW5nIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX2ZvcndhcmRpbmdvbmJ1c3kgLSAnICsgZ2xvYmFsVHJhbnNsYXRlLmV4X0ZpZWxkRm9yd2FyZGluZ0J1c3lfSGVscCxcbiAgICAgICAgICAgICAgICAnZndkX2ZvcndhcmRpbmdvbnVuYXZhaWxhYmxlIC0gJyArIGdsb2JhbFRyYW5zbGF0ZS5leF9GaWVsZEZvcndhcmRpbmdVbmF2YWlsYWJsZV9IZWxwXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZm9ybWF0c1tmb3JtYXRdIHx8IGZvcm1hdHMuc3RhbmRhcmQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZm9ybWF0IGRlc2NyaXB0aW9uXG4gICAgICovXG4gICAgdXBkYXRlRm9ybWF0RGVzY3JpcHRpb24odHlwZSwgZm9ybWF0KSB7XG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLmdldEZvcm1hdEZpZWxkcyhmb3JtYXQpO1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gdHlwZSA9PT0gJ2V4cG9ydCcgP1xuICAgICAgICAgICAgJCgnI2V4cG9ydC1mb3JtYXQtZmllbGRzLWRlc2NyaXB0aW9uJykgOlxuICAgICAgICAgICAgJCgnI2Zvcm1hdC1maWVsZHMtZGVzY3JpcHRpb24nKTtcblxuICAgICAgICBpZiAoJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSAnPHVsIGNsYXNzPVwibGlzdFwiPicgK1xuICAgICAgICAgICAgICAgIGZpZWxkcy5tYXAoZmllbGQgPT4gYDxsaT48Y29kZT4ke2ZpZWxkfTwvY29kZT48L2xpPmApLmpvaW4oJycpICtcbiAgICAgICAgICAgICAgICAnPC91bD4nO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5odG1sKGh0bWwpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHRhYmxlIHJvd3MgdG8gcHJvY2Vzc2luZyBzdGF0dXMgKG9ubHkgZm9yIHZhbGlkIHJlY29yZHMgdGhhdCB3aWxsIGJlIHByb2Nlc3NlZClcbiAgICAgKi9cbiAgICByZXNldFRhYmxlVG9Qcm9jZXNzaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBbQnVsa1VwbG9hZF0gcmVzZXRUYWJsZVRvUHJvY2Vzc2luZyBjYWxsZWQnKTtcblxuICAgICAgICBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLmZpbmQoJ3Rib2R5IHRyJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5zdGF0dXMtY2VsbCcpO1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzVGV4dCA9ICRzdGF0dXNDZWxsLmZpbmQoJy5zdGF0dXMtdGV4dCcpLnRleHQoKS50cmltKCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGDwn5SNIFtCdWxrVXBsb2FkXSBSb3cgc3RhdHVzIGNoZWNrIC0gaGFzQ2xhc3MgcG9zaXRpdmU6ICR7JHJvdy5oYXNDbGFzcygncG9zaXRpdmUnKX0sIHN0YXR1c1RleHQ6ICcke3N0YXR1c1RleHR9JywgZXhwZWN0ZWRWYWxpZDogJyR7Z2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c1ZhbGlkfSdgKTtcblxuICAgICAgICAgICAgLy8gT25seSByZXNldCByb3dzIHRoYXQgaGF2ZSAndmFsaWQnIHN0YXR1cyBmcm9tIHByZXZpZXdcbiAgICAgICAgICAgIC8vIExlYXZlIGR1cGxpY2F0ZXMsIGV4aXN0cywgYW5kIGVycm9yIHJvd3MgYXMgdGhleSBhcmVcbiAgICAgICAgICAgIGlmICgkcm93Lmhhc0NsYXNzKCdwb3NpdGl2ZScpICYmIHN0YXR1c1RleHQgPT09IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNWYWxpZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDinIUgW0J1bGtVcGxvYWRdIFJlc2V0dGluZyByb3cgdG8gcHJvY2Vzc2luZyBzdGF0dXNgKTtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdG8gcHJvY2Vzc2luZyBzdGF0dXMgb25seSBmb3IgdmFsaWQgcmVjb3Jkc1xuICAgICAgICAgICAgICAgICRyb3cucmVtb3ZlQ2xhc3MoJ3Bvc2l0aXZlIG5lZ2F0aXZlIHdhcm5pbmcnKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbCgnPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT4gPHNwYW4gY2xhc3M9XCJzdGF0dXMtdGV4dFwiPicgKyBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzUHJvY2Vzc2luZyArICc8L3NwYW4+Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTb3J0IHRhYmxlIGJ5IHN0YXR1cyBjb2x1bW4gYWZ0ZXIgaW1wb3J0IGNvbXBsZXRpb25cbiAgICAgKi9cbiAgICBzb3J0VGFibGVCeVN0YXR1cygpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflIQgW0J1bGtVcGxvYWRdIFNvcnRpbmcgdGFibGUgYnkgc3RhdHVzIGFmdGVyIGltcG9ydCBjb21wbGV0aW9uJyk7XG5cbiAgICAgICAgY29uc3QgJHN0YXR1c0hlYWRlciA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZCgndGgnKS5lcSg0KTsgLy8gU3RhdHVzIGNvbHVtbiAoaW5kZXggNClcbiAgICAgICAgY29uc3QgJGFsbFRoID0gZXh0ZW5zaW9uc0J1bGtVcGxvYWQuJHByZXZpZXdUYWJsZS5maW5kKCd0aCcpO1xuICAgICAgICBjb25zdCAkdGJvZHkgPSBleHRlbnNpb25zQnVsa1VwbG9hZC4kcHJldmlld1RhYmxlLmZpbmQoJ3Rib2R5Jyk7XG4gICAgICAgIGNvbnN0ICRyb3dzID0gJHRib2R5LmZpbmQoJ3RyJyk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHNvcnRpbmcgY2xhc3NlcyBmcm9tIG90aGVyIGhlYWRlcnNcbiAgICAgICAgJGFsbFRoLnJlbW92ZUNsYXNzKCdzb3J0ZWQgYXNjZW5kaW5nIGRlc2NlbmRpbmcnKTtcblxuICAgICAgICAvLyBTZXQgc3RhdHVzIGNvbHVtbiBhcyBzb3J0ZWQgYXNjZW5kaW5nIChzaG93IHByb2Nlc3NlZCByZXN1bHRzIGZpcnN0KVxuICAgICAgICAkc3RhdHVzSGVhZGVyLmFkZENsYXNzKCdzb3J0ZWQgYXNjZW5kaW5nJyk7XG5cbiAgICAgICAgLy8gU29ydCByb3dzIGJ5IHN0YXR1cyBwcmlvcml0eVxuICAgICAgICBjb25zdCBzb3J0ZWRSb3dzID0gJHJvd3Muc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICBjb25zdCBhVGV4dCA9ICQoYSkuZmluZCgndGQnKS5lcSg0KS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgY29uc3QgYlRleHQgPSAkKGIpLmZpbmQoJ3RkJykuZXEoNCkudGV4dCgpLnRyaW0oKTtcblxuICAgICAgICAgICAgLy8gU3RhdHVzIG9yZGVyIHByaW9yaXR5IChjcmVhdGVkL3VwZGF0ZWQgZmlyc3QsIHRoZW4gc2tpcHBlZCwgdGhlbiBubyBjaGFuZ2VzLCB0aGVuIGVycm9ycylcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c09yZGVyID0ge1xuICAgICAgICAgICAgICAgICfQodC+0LfQtNCw0L0nOiAxLFxuICAgICAgICAgICAgICAgICfQntCx0L3QvtCy0LvQtdC9JzogMixcbiAgICAgICAgICAgICAgICAn0J/RgNC+0L/Rg9GJ0LXQvSc6IDMsXG4gICAgICAgICAgICAgICAgJ9Cj0LbQtSDRgdGD0YnQtdGB0YLQstGD0LXRgic6IDQsXG4gICAgICAgICAgICAgICAgJ9CR0LXQtyDQuNC30LzQtdC90LXQvdC40LknOiA1LFxuICAgICAgICAgICAgICAgICfQntGI0LjQsdC60LAnOiA2LFxuICAgICAgICAgICAgICAgICfQntCx0YDQsNCx0LDRgtGL0LLQsNC10YLRgdGPJzogNyAvLyBTaG91bGQgbm90IGFwcGVhciBhZnRlciBjb21wbGV0aW9uLCBidXQganVzdCBpbiBjYXNlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IHN0YXR1cyB0ZXh0IChyZW1vdmUgaWNvbiBwYXJ0KVxuICAgICAgICAgICAgY29uc3QgYVN0YXR1cyA9IHN0YXR1c09yZGVyW2FUZXh0LnNwbGl0KCcgJykuc2xpY2UoMSkuam9pbignICcpXSB8fCA5OTk7XG4gICAgICAgICAgICBjb25zdCBiU3RhdHVzID0gc3RhdHVzT3JkZXJbYlRleHQuc3BsaXQoJyAnKS5zbGljZSgxKS5qb2luKCcgJyldIHx8IDk5OTtcblxuICAgICAgICAgICAgcmV0dXJuIGFTdGF0dXMgLSBiU3RhdHVzOyAvLyBBc2NlbmRpbmcgb3JkZXJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHdpdGggc29ydGVkIHJvd3NcbiAgICAgICAgJHRib2R5LmVtcHR5KCkuYXBwZW5kKHNvcnRlZFJvd3MpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgW0J1bGtVcGxvYWRdIFRhYmxlIHNvcnRlZCBieSBzdGF0dXMgLSBwcm9jZXNzZWQgcmVjb3JkcyBzaG93biBmaXJzdCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaW5kaXZpZHVhbCByb3cgc3RhdHVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc3RhdHVzIC0gTmV3IHN0YXR1cyAoY3JlYXRlZCwgdXBkYXRlZCwgc2tpcHBlZCwgZXJyb3IpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBTdGF0dXMgbWVzc2FnZVxuICAgICAqL1xuICAgIHVwZGF0ZVJvd1N0YXR1cyhudW1iZXIsIHN0YXR1cywgbWVzc2FnZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhg8J+UhCBbQnVsa1VwbG9hZF0gdXBkYXRlUm93U3RhdHVzIGNhbGxlZCBmb3IgbnVtYmVyOiAke251bWJlcn0sIHN0YXR1czogJHtzdGF0dXN9LCBtZXNzYWdlOiAke21lc3NhZ2V9YCk7XG5cbiAgICAgICAgY29uc3QgJHJvdyA9IGV4dGVuc2lvbnNCdWxrVXBsb2FkLiRwcmV2aWV3VGFibGUuZmluZChgdGJvZHkgdHJbZGF0YS1udW1iZXI9XCIke251bWJlcn1cIl1gKTtcbiAgICAgICAgaWYgKCRyb3cubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYOKaoO+4jyBbQnVsa1VwbG9hZF0gTm8gcm93IGZvdW5kIGZvciBudW1iZXI6ICR7bnVtYmVyfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5zdGF0dXMtY2VsbCcpO1xuXG4gICAgICAgIGxldCBzdGF0dXNDbGFzcywgc3RhdHVzSWNvbiwgc3RhdHVzVGV4dDtcblxuICAgICAgICBzd2l0Y2goc3RhdHVzKSB7XG4gICAgICAgICAgICBjYXNlICdjcmVhdGVkJzpcbiAgICAgICAgICAgIGNhc2UgJ3VwZGF0ZWQnOlxuICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ3Bvc2l0aXZlJztcbiAgICAgICAgICAgICAgICBzdGF0dXNJY29uID0gJ2NoZWNrIGNpcmNsZSBncmVlbic7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IHN0YXR1cyA9PT0gJ2NyZWF0ZWQnID8gZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c0NyZWF0ZWQgOiBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzVXBkYXRlZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NraXBwZWQnOlxuICAgICAgICAgICAgY2FzZSAnZXhpc3RzJzogLy8gSGFuZGxlIFwiZXhpc3RzXCIgc3RhdHVzIGZyb20gYmFja2VuZFxuICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ3dhcm5pbmcnO1xuICAgICAgICAgICAgICAgIHN0YXR1c0ljb24gPSAnbWludXMgY2lyY2xlIHllbGxvdyc7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IHN0YXR1cyA9PT0gJ2V4aXN0cycgPyBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3J0U3RhdHVzRXhpc3RzIDogZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9ydFN0YXR1c1NraXBwZWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdub19jaGFuZ2VzJzpcbiAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICdkaXNhYmxlZCc7XG4gICAgICAgICAgICAgICAgc3RhdHVzSWNvbiA9ICdtaW51cyBjaXJjbGUgZ3JleSc7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNOb0NoYW5nZXM7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnbmVnYXRpdmUnO1xuICAgICAgICAgICAgICAgIHN0YXR1c0ljb24gPSAndGltZXMgY2lyY2xlIHJlZCc7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNFcnJvcjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnYWN0aXZlJztcbiAgICAgICAgICAgICAgICBzdGF0dXNJY29uID0gJ3NwaW5uZXIgbG9hZGluZyc7XG4gICAgICAgICAgICAgICAgc3RhdHVzVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvcnRTdGF0dXNQcm9jZXNzaW5nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHJvdyBjbGFzcyBhbmQgc3RhdHVzXG4gICAgICAgICRyb3cucmVtb3ZlQ2xhc3MoJ3Bvc2l0aXZlIG5lZ2F0aXZlIHdhcm5pbmcgYWN0aXZlIGRpc2FibGVkJykuYWRkQ2xhc3Moc3RhdHVzQ2xhc3MpO1xuICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKGA8aSBjbGFzcz1cIiR7c3RhdHVzSWNvbn0gaWNvblwiPjwvaT4gPHNwYW4gY2xhc3M9XCJzdGF0dXMtdGV4dFwiPiR7c3RhdHVzVGV4dH08L3NwYW4+YCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coYOKchSBbQnVsa1VwbG9hZF0gVXBkYXRlZCByb3cgJHtudW1iZXJ9IHRvIHN0YXR1czogJHtzdGF0dXNUZXh0fSwgY2xhc3M6ICR7c3RhdHVzQ2xhc3N9YCk7XG5cbiAgICAgICAgLy8gTm90ZTogUmVtb3ZlZCBhdXRvbWF0aWMgc2Nyb2xsaW5nIHRvIHByZXZlbnQgcGFnZSBqdW1waW5nIGR1cmluZyBwcm9jZXNzaW5nXG4gICAgfVxufTtcblxuLy8gSW5pdGlhbGl6ZSB3aGVuIGRvY3VtZW50IGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY29uc29sZS5sb2coJ/CfmoAgW0J1bGtVcGxvYWRdIERvY3VtZW50IHJlYWR5LCBzdGFydGluZyBtb2R1bGUgaW5pdGlhbGl6YXRpb24nKTtcbiAgICBleHRlbnNpb25zQnVsa1VwbG9hZC5pbml0aWFsaXplKCk7XG59KTsiXX0=