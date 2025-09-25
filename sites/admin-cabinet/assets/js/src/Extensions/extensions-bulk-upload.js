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
const extensionsBulkUpload = {
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
    initialize() {
        console.log('🎯 [BulkUpload] Module initialization started');

        // Initialize tabs with event handler to clear messages
        $('#bulk-tabs .item').tab({
            onVisible: function() {
                console.log('👁️ [BulkUpload] Tab visible event');
                // Clear any existing error messages when switching tabs
                $('.ui.message.ajax').remove();
            }
        });

        // Initialize dropdowns with change handlers
        extensionsBulkUpload.$importStrategy.dropdown();
        extensionsBulkUpload.$exportFormat.dropdown({
            onChange: function(value) {
                extensionsBulkUpload.updateFormatDescription('export', value);
            }
        });
        extensionsBulkUpload.$templateFormat.dropdown({
            onChange: function(value) {
                extensionsBulkUpload.updateFormatDescription('template', value);
            }
        });
        
        // Show initial format descriptions
        extensionsBulkUpload.updateFormatDescription('export', 'standard');
        extensionsBulkUpload.updateFormatDescription('template', 'standard');

        // Set up file upload
        extensionsBulkUpload.initializeFileUpload();

        // Set up event handlers
        extensionsBulkUpload.$confirmImport.on('click', extensionsBulkUpload.confirmImport);
        extensionsBulkUpload.$cancelImport.on('click', extensionsBulkUpload.cancelImport);
        extensionsBulkUpload.$cancelImportProcess.on('click', extensionsBulkUpload.cancelImportProcess);
        extensionsBulkUpload.$newImport.on('click', extensionsBulkUpload.startNewImport);
        extensionsBulkUpload.$exportButton.on('click', extensionsBulkUpload.exportEmployees);
        extensionsBulkUpload.$downloadTemplate.on('click', extensionsBulkUpload.downloadTemplate);

        // Subscribe to EventBus for import progress
        EventBus.subscribe('import_progress', extensionsBulkUpload.onImportProgress);
        EventBus.subscribe('import_complete', extensionsBulkUpload.onImportComplete);

        // Check URL hash to activate correct tab
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            console.log('🔗 [BulkUpload] Activating tab from hash', { hash });
            $(`#bulk-tabs .item[data-tab="${hash}"]`).click();
        }

        console.log('✅ [BulkUpload] Module initialization completed successfully');
    },

    /**
     * Initialize file upload using FilesAPI.attachToBtn for consistent behavior
     */
    initializeFileUpload() {
        console.log('🔧 [BulkUpload] Initializing file upload functionality');

        // Check if elements exist before initializing
        if (!extensionsBulkUpload.$uploadButton.length || !extensionsBulkUpload.$uploadSegment.length) {
            console.error('❌ [BulkUpload] Upload elements not found', {
                uploadButton: extensionsBulkUpload.$uploadButton.length,
                uploadSegment: extensionsBulkUpload.$uploadSegment.length
            });
            // Upload elements not found, skipping file upload initialization
            return;
        }

        console.log('✅ [BulkUpload] Upload elements found', {
            uploadButton: extensionsBulkUpload.$uploadButton.length,
            uploadSegment: extensionsBulkUpload.$uploadSegment.length
        });

        // Use FilesAPI.attachToBtn for unified file upload handling
        // This attaches directly to the button and handles file selection internally
        FilesAPI.attachToBtn('upload-button', ['csv'], extensionsBulkUpload.cbUploadResumable);

        console.log('✅ [BulkUpload] File upload attached to button "upload-button" with CSV filter');
    },

    /**
     * Callback function for file upload with chunks and merge.
     * @param {string} action - The action performed during the upload.
     * @param {Object} params - Additional parameters related to the upload.
     */
    cbUploadResumable(action, params) {
        console.log('📥 [BulkUpload] Upload callback triggered', {
            action: action,
            params: params
        });

        switch (action) {
            case 'fileAdded':
                console.log('📁 [BulkUpload] File added event', {
                    fileName: params.file?.fileName || params.file?.name,
                    fileSize: params.file?.size,
                    fileType: params.file?.file?.type
                });
                break;
            case 'uploadStart':
                console.log('🚀 [BulkUpload] Upload started');
                extensionsBulkUpload.$uploadSegment.addClass('loading');
                break;
            case 'fileProgress':
                const progress = params.file ? Math.round(params.file.progress() * 100) : 0;
                console.log('📈 [BulkUpload] Upload progress', {
                    progress: progress + '%'
                });
                break;
            case 'fileSuccess':
                console.log('✅ [BulkUpload] Upload success', {
                    response: params.response
                });

                const result = PbxApi.tryParseJSON(params.response);
                console.log('📋 [BulkUpload] Parsed response', { result });

                if (result !== false && result.data && result.data.upload_id) {
                    extensionsBulkUpload.uploadedFileId = result.data.upload_id;
                    extensionsBulkUpload.uploadedFilePath = result.data.filename;

                    console.log('💾 [BulkUpload] File data saved', {
                        uploadId: extensionsBulkUpload.uploadedFileId,
                        filePath: extensionsBulkUpload.uploadedFilePath
                    });

                    extensionsBulkUpload.checkStatusFileMerging(params.response);
                } else {
                    console.error('❌ [BulkUpload] Invalid response format', {
                        result: result,
                        hasData: result ? !!result.data : false,
                        hasUploadId: result?.data?.upload_id || false,
                        errorMessages: result?.messages || 'No error messages',
                        resultResult: result?.result,
                        rawResponse: params.response
                    });

                    // Show more specific error message if available
                    let errorMessage = globalTranslate.ex_FileUploadError;
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
                    fileName: params.file?.fileName || params.file?.name,
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
                console.log(`ℹ️ [BulkUpload] Unhandled action: ${action}`, { params });
        }
    },

    /**
     * Checks the status of file merging.
     * @param {string} response - The response from the file merging status function.
     */
    checkStatusFileMerging(response) {
        if (response === undefined || PbxApi.tryParseJSON(response) === false) {
            UserMessage.showMultiString(`${globalTranslate.ex_FileUploadError}`);
            return;
        }
        const json = JSON.parse(response);
        if (json === undefined || json.data === undefined) {
            UserMessage.showMultiString(`${globalTranslate.ex_FileUploadError}`);
            return;
        }

        const uploadId = json.data.upload_id;
        const filePath = json.data.filename;

        // Subscribe to EventBus for upload progress
        FileUploadEventHandler.subscribe(uploadId, {
            onMergeStarted: (data) => {
                // File merge started
            },

            onMergeProgress: (data) => {
                // Update progress if needed
            },

            onMergeComplete: (data) => {
                extensionsBulkUpload.$uploadSegment.removeClass('loading');
                extensionsBulkUpload.previewImport();
            },

            onError: (data) => {
                extensionsBulkUpload.$uploadSegment.removeClass('loading');
                UserMessage.showMultiString(data.error || globalTranslate.ex_FileUploadError);
            }
        });

        // Check immediate status (same as sound-file-modify.js)
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
    previewImport() {
        const strategy = extensionsBulkUpload.$importStrategy.dropdown('get value');

        extensionsBulkUpload.$uploadSegment.addClass('loading');

        // Use uploadedFileId for API call, as the file is now fully merged
        EmployeesAPI.importCSV(
            extensionsBulkUpload.uploadedFileId,
            'preview',
            strategy,
            (response) => {
                extensionsBulkUpload.$uploadSegment.removeClass('loading');

                if (response.result === true && response.data) {
                    // Backend returns upload_id, not uploadId
                    extensionsBulkUpload.uploadId = response.data.upload_id || response.data.uploadId;
                    extensionsBulkUpload.showPreview(response.data);
                } else {
                    UserMessage.showMultiString(response.messages);
                }
            }
        );
    },

    /**
     * Show preview of CSV data
     */
    showPreview(data) {
        // Update statistics
        extensionsBulkUpload.$totalCount.text(data.total || 0);
        extensionsBulkUpload.$validCount.text(data.valid || 0);
        extensionsBulkUpload.$duplicateCount.text(data.duplicates || 0);
        extensionsBulkUpload.$errorCount.text(data.errors || 0);

        // Destroy existing DataTable if exists
        if (extensionsBulkUpload.previewDataTable) {
            extensionsBulkUpload.previewDataTable.destroy();
        }

        // Clear and populate preview table
        const $tbody = extensionsBulkUpload.$previewTable.find('tbody');
        $tbody.empty();

        if (data.preview && data.preview.length > 0) {
            data.preview.forEach((row) => {
                const statusClass = row.status === 'valid' ? 'positive' :
                                   row.status === 'duplicate' || row.status === 'exists' ? 'warning' : 'negative';
                const statusIcon = row.status === 'valid' ? 'check circle' :
                                  row.status === 'duplicate' || row.status === 'exists' ? 'exclamation triangle' : 'times circle';

                // Translate status text
                let statusText = row.status;
                switch(row.status) {
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

                const $row = $(`
                    <tr class="${statusClass}" data-row="${row.row}" data-number="${row.number}">
                        <td>${row.number || ''}</td>
                        <td>${row.user_username || ''}</td>
                        <td>${row.mobile_number || ''}</td>
                        <td>${row.user_email || ''}</td>
                        <td class="status-cell"><i class="${statusIcon} icon"></i> <span class="status-text">${statusText}</span></td>
                    </tr>
                `);
                $tbody.append($row);
            });
        }

        // Use simple Semantic UI table instead of DataTables to avoid header/body separation issues
        // Add CSS class to preview table for styling
        extensionsBulkUpload.$previewTable.addClass('preview-table');

        // Initialize Semantic UI table sorting manually if needed
        extensionsBulkUpload.$previewTable.find('th').each(function(index) {
            const $th = $(this);
            if (index === 4) { // Status column - make it sortable (now at index 4)
                $th.addClass('sorted ascending'); // Set initial sort
            }

            $th.on('click', function() {
                const $allTh = extensionsBulkUpload.$previewTable.find('th');
                const $tbody = extensionsBulkUpload.$previewTable.find('tbody');
                const $rows = $tbody.find('tr');

                // Remove sorting classes from other headers
                $allTh.removeClass('sorted ascending descending');

                // Determine sort direction
                const isAscending = !$th.hasClass('sorted') || $th.hasClass('descending');
                $th.addClass(isAscending ? 'sorted ascending' : 'sorted descending');

                // Simple sort implementation
                const sortedRows = $rows.sort(function(a, b) {
                    const aText = $(a).find('td').eq(index).text().trim();
                    const bText = $(b).find('td').eq(index).text().trim();

                    // For status column, sort by status priority
                    if (index === 4) {
                        const statusOrder = {
                            'Пропущен': 1,
                            'Создан': 2,
                            'Обновлен': 3,
                            'Уже существует': 4,
                            'Ошибка': 5
                        };
                        const aStatus = statusOrder[aText.split(' ').slice(1).join(' ')] || 999;
                        const bStatus = statusOrder[bText.split(' ').slice(1).join(' ')] || 999;
                        return isAscending ? aStatus - bStatus : bStatus - aStatus;
                    }

                    // For other columns, simple text sort
                    if (aText < bText) return isAscending ? -1 : 1;
                    if (aText > bText) return isAscending ? 1 : -1;
                    return 0;
                });

                $tbody.empty().append(sortedRows);
            });
        });

        // Store reference for row updates (compatibility with existing code)
        extensionsBulkUpload.previewDataTable = {
            destroy: function() {
                // Cleanup if needed
                extensionsBulkUpload.$previewTable.find('th').off('click');
                extensionsBulkUpload.$previewTable.removeClass('preview-table');
            }
        };

        // Show preview section, hide upload section
        extensionsBulkUpload.$uploadSegment.hide();
        extensionsBulkUpload.$previewSection.show();

        // Note: Removed automatic scrolling to prevent page jumping during processing
    },

    /**
     * Confirm and start import
     */
    confirmImport() {
        if (!extensionsBulkUpload.uploadId) {
            UserMessage.showMultiString('Upload ID is missing', 'error');
            return;
        }

        const strategy = extensionsBulkUpload.$importStrategy.dropdown('get value');

        extensionsBulkUpload.$confirmImport.addClass('loading');

        EmployeesAPI.confirmImport(
            extensionsBulkUpload.uploadId,
            strategy,
            (response) => {
                extensionsBulkUpload.$confirmImport.removeClass('loading');

                if (response.result === true && response.data) {
                    // Keep preview table visible, show progress section
                    extensionsBulkUpload.$progressSection.show();

                    // Hide import buttons, show cancel button
                    extensionsBulkUpload.$confirmImport.hide();
                    extensionsBulkUpload.$cancelImport.hide();
                    extensionsBulkUpload.$importStrategy.closest('.field').hide();

                    // Save job information for cancellation
                    extensionsBulkUpload.currentJobId = response.data.jobId || null;
                    extensionsBulkUpload.importChannelId = response.data.channelId || null;

                    // Initialize progress bar
                    extensionsBulkUpload.$importProgress.progress({
                        percent: 0
                    });

                    // Reset progress text
                    extensionsBulkUpload.$progressText.text(globalTranslate.ex_ImportStarted);

                    // Subscribe to import progress events via EventBus FIRST
                    if (response.data.channelId) {
                        extensionsBulkUpload.subscribeToImportProgress(response.data.channelId);
                    }

                    // Reset valid rows to 'processing' status after a small delay to ensure EventBus is ready
                    setTimeout(() => {
                        extensionsBulkUpload.resetTableToProcessing();
                    }, 100);
                } else {
                    UserMessage.showMultiString(response.messages);
                }
            }
        );
    },

    /**
     * Subscribe to import progress events
     * @param {string} channelId - Import progress channel ID
     */
    subscribeToImportProgress(channelId) {
        console.log(`🔔 [BulkUpload] Subscribing to EventBus channel: ${channelId}`);

        // Store callback function reference for later unsubscription
        extensionsBulkUpload.importProgressCallback = (message) => {
            console.log(`📨 [BulkUpload] EventBus message received:`, message);

            if (message && message.type) {
                console.log(`🔄 [BulkUpload] Processing message type: ${message.type}`);
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
                        console.warn(`⚠️ [BulkUpload] Unknown message type: ${message.type}`);
                }
            } else {
                console.warn(`⚠️ [BulkUpload] Invalid message format:`, message);
            }
        };

        EventBus.subscribe(channelId, extensionsBulkUpload.importProgressCallback);
        console.log(`✅ [BulkUpload] EventBus subscription completed for channel: ${channelId}`);
    },

    /**
     * Handle import started event
     * @param {object} data - Import started data
     */
    handleImportStarted(data) {
        extensionsBulkUpload.updateProgressText(`${globalTranslate.ex_ImportStarted} (${data.total} ${globalTranslate.ex_Records})`);
    },

    /**
     * Handle import progress event
     * @param {object} data - Import progress data
     */
    handleImportProgress(data) {
        console.log('🔄 [BulkUpload] handleImportProgress called with data:', data);

        const percent = Math.round((data.processed / data.total) * 100);
        extensionsBulkUpload.$importProgress.progress({
            percent: percent
        });

        // Update individual row status if provided
        if (data.currentRecord) {
            console.log('🔄 [BulkUpload] Updating row status for:', data.currentRecord);
            extensionsBulkUpload.updateRowStatus(
                data.currentRecord.number,
                data.currentRecord.status,
                data.currentRecord.message
            );
        }

        // Build progress message with skipped count
        const parts = [];
        if (data.created > 0) {
            parts.push(`${data.created} ${globalTranslate.ex_Created}`);
        }
        if (data.updated > 0) {
            parts.push(`${data.updated} ${globalTranslate.ex_Updated}`);
        }
        if (data.skipped > 0) {
            parts.push(`${data.skipped} ${globalTranslate.ex_Skipped}`);
        }
        if (data.errors > 0) {
            parts.push(`${data.errors} ${globalTranslate.ex_Errors}`);
        }

        const message = `${globalTranslate.ex_ImportProgress}: ${data.processed}/${data.total} (${parts.join(', ')})`;
        extensionsBulkUpload.updateProgressText(message);
    },

    /**
     * Handle import completed event
     * @param {object} data - Import completion data
     */
    handleImportCompleted(data) {

        extensionsBulkUpload.$importProgress.progress({
            percent: 100
        });

        // Show completion message
        const message = `${globalTranslate.ex_ImportCompleted}: ${data.created} ${globalTranslate.ex_Created}, ${data.updated} ${globalTranslate.ex_Updated}, ${data.skipped} ${globalTranslate.ex_Skipped}, ${data.errors} ${globalTranslate.ex_Errors}`;
        extensionsBulkUpload.updateProgressText(message);

        // Hide cancel button and entire import controls block after completion
        extensionsBulkUpload.$cancelImportProcess.hide();
        extensionsBulkUpload.$importControls.hide();

        // Clear job data
        extensionsBulkUpload.currentJobId = null;

        // Unsubscribe from progress events after completion
        if (extensionsBulkUpload.importChannelId && extensionsBulkUpload.importProgressCallback) {
            EventBus.unsubscribe(extensionsBulkUpload.importChannelId, extensionsBulkUpload.importProgressCallback);
            extensionsBulkUpload.importChannelId = null;
            extensionsBulkUpload.importProgressCallback = null;
        }

        // Automatically sort table by status after import completion
        extensionsBulkUpload.sortTableByStatus();
    },

    /**
     * Cancel import and reset
     */
    cancelImport() {
        // Clear any existing error messages
        $('.ui.message.ajax').remove();

        extensionsBulkUpload.$previewSection.hide();
        extensionsBulkUpload.$uploadSegment.show();
        // Unsubscribe from EventBus if subscribed
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
    cancelImportProcess() {
        if (!extensionsBulkUpload.currentJobId) {
            return;
        }

        // Set button to loading state
        extensionsBulkUpload.$cancelImportProcess.addClass('loading disabled');

        // For now, just stop the UI updates since server-side cancellation is not implemented
        // TODO: Implement server-side job cancellation

        // Update progress text with cancellation message
        extensionsBulkUpload.updateProgressText(globalTranslate.ex_ImportCancelled);

        // Hide progress section
        extensionsBulkUpload.$progressSection.hide();

        // Show import buttons again
        extensionsBulkUpload.$confirmImport.show();
        extensionsBulkUpload.$cancelImport.show();
        extensionsBulkUpload.$importStrategy.closest('.field').show();

        // Unsubscribe from EventBus
        if (extensionsBulkUpload.importChannelId && extensionsBulkUpload.importProgressCallback) {
            EventBus.unsubscribe(extensionsBulkUpload.importChannelId, extensionsBulkUpload.importProgressCallback);
        }

        // Clear job data
        extensionsBulkUpload.currentJobId = null;
        extensionsBulkUpload.importChannelId = null;
        extensionsBulkUpload.importProgressCallback = null;

        extensionsBulkUpload.$cancelImportProcess.removeClass('loading disabled');
    },

    /**
     * Start new import
     */
    startNewImport() {
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
        extensionsBulkUpload.importProgressCallback = null;

        // Reset upload state handled by FilesAPI
    },

    /**
     * Handle import progress from EventBus
     */
    onImportProgress(data) {
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
    onImportComplete(data) {
        // Keep table visible, hide progress bar, show results section
        extensionsBulkUpload.$importProgress.hide();
        extensionsBulkUpload.$progressLabel.hide();
        extensionsBulkUpload.$cancelImportProcess.hide();
        extensionsBulkUpload.$resultsSection.show();

        // Show import buttons again for new import
        extensionsBulkUpload.$confirmImport.show();
        extensionsBulkUpload.$cancelImport.show();
        extensionsBulkUpload.$importStrategy.closest('.field').show();

        // Show result message
        const messageClass = data.success ? 'positive' : 'negative';
        const messageIcon = data.success ? 'check circle' : 'times circle';
        let messageText = '';

        if (data.stats) {
            messageText = globalTranslate.ex_ImportSuccess
                .replace('{created}', data.stats.created || 0)
                .replace('{skipped}', data.stats.skipped || 0)
                .replace('{failed}', data.stats.failed || 0);
        } else if (data.error) {
            messageText = globalTranslate.ex_ImportFailed.replace('{error}', data.error);
        }

        extensionsBulkUpload.$resultMessage.html(`
            <div class="${messageClass} message">
                <i class="${messageIcon} icon"></i>
                <div class="content">
                    <div class="header">${data.success ? globalTranslate.ex_ImportComplete : globalTranslate.ex_ImportFailed}</div>
                    <p>${messageText}</p>
                </div>
            </div>
        `);
    },

    /**
     * Update progress text
     */
    updateProgressText(message) {
        extensionsBulkUpload.$progressText.text(message);
    },

    /**
     * Export employees to CSV
     */
    exportEmployees() {
        const format = extensionsBulkUpload.$exportFormat.dropdown('get value');
        const filter = {};
        
        const numberFrom = extensionsBulkUpload.$numberFrom.val();
        const numberTo = extensionsBulkUpload.$numberTo.val();
        
        if (numberFrom) {
            filter.number_from = numberFrom;
        }
        if (numberTo) {
            filter.number_to = numberTo;
        }

        extensionsBulkUpload.$exportButton.addClass('loading');

        EmployeesAPI.exportCSV(
            format,
            filter,
            (response) => {
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
            }
        );
    },

    /**
     * Download CSV template
     */
    downloadTemplate() {
        const format = extensionsBulkUpload.$templateFormat.dropdown('get value');

        extensionsBulkUpload.$downloadTemplate.addClass('loading');

        EmployeesAPI.getTemplate(
            format,
            (response) => {
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
            }
        );
    },

    /**
     * Get field descriptions for format
     */
    getFormatFields(format) {
        const formats = {
            minimal: [
                'number - ' + globalTranslate.ex_FieldNumber_Help,
                'user_username - ' + globalTranslate.ex_FieldUsername_Help,
                'user_email - ' + globalTranslate.ex_FieldEmail_Help,
                'mobile_number - ' + globalTranslate.ex_FieldMobile_Help,
                'sip_secret - ' + globalTranslate.ex_FieldPassword_Help,
                'fwd_ringlength - ' + globalTranslate.ex_FieldRingLength_Help,
                'fwd_forwarding - ' + globalTranslate.ex_FieldForwarding_Help
            ],
            standard: [
                'number - ' + globalTranslate.ex_FieldNumber_Help,
                'user_username - ' + globalTranslate.ex_FieldUsername_Help,
                'user_email - ' + globalTranslate.ex_FieldEmail_Help,
                'mobile_number - ' + globalTranslate.ex_FieldMobile_Help,
                'mobile_dialstring - ' + globalTranslate.ex_FieldMobileDialstring_Help,
                'sip_secret - ' + globalTranslate.ex_FieldPassword_Help,
                'sip_dtmfmode - ' + globalTranslate.ex_FieldDTMFMode_Help,
                'sip_transport - ' + globalTranslate.ex_FieldTransport_Help,
                'sip_enableRecording - ' + globalTranslate.ex_FieldRecording_Help,
                'fwd_ringlength - ' + globalTranslate.ex_FieldRingLength_Help,
                'fwd_forwarding - ' + globalTranslate.ex_FieldForwarding_Help,
                'fwd_forwardingonbusy - ' + globalTranslate.ex_FieldForwardingBusy_Help,
                'fwd_forwardingonunavailable - ' + globalTranslate.ex_FieldForwardingUnavailable_Help
            ],
            full: [
                'number - ' + globalTranslate.ex_FieldNumber_Help,
                'user_username - ' + globalTranslate.ex_FieldUsername_Help,
                'user_email - ' + globalTranslate.ex_FieldEmail_Help,
                'user_avatar - ' + globalTranslate.ex_FieldAvatar_Help,
                'mobile_number - ' + globalTranslate.ex_FieldMobile_Help,
                'mobile_dialstring - ' + globalTranslate.ex_FieldMobileDialstring_Help,
                'sip_secret - ' + globalTranslate.ex_FieldPassword_Help,
                'sip_dtmfmode - ' + globalTranslate.ex_FieldDTMFMode_Help,
                'sip_transport - ' + globalTranslate.ex_FieldTransport_Help,
                'sip_enableRecording - ' + globalTranslate.ex_FieldRecording_Help,
                'sip_manualattributes - ' + globalTranslate.ex_FieldManualAttributes_Help,
                'fwd_ringlength - ' + globalTranslate.ex_FieldRingLength_Help,
                'fwd_forwarding - ' + globalTranslate.ex_FieldForwarding_Help,
                'fwd_forwardingonbusy - ' + globalTranslate.ex_FieldForwardingBusy_Help,
                'fwd_forwardingonunavailable - ' + globalTranslate.ex_FieldForwardingUnavailable_Help
            ]
        };
        
        return formats[format] || formats.standard;
    },
    
    /**
     * Update format description
     */
    updateFormatDescription(type, format) {
        const fields = extensionsBulkUpload.getFormatFields(format);
        const $container = type === 'export' ?
            $('#export-format-fields-description') :
            $('#format-fields-description');

        if ($container.length) {
            const html = '<ul class="list">' +
                fields.map(field => `<li><code>${field}</code></li>`).join('') +
                '</ul>';
            $container.html(html);
        }
    },

    /**
     * Reset table rows to processing status (only for valid records that will be processed)
     */
    resetTableToProcessing() {
        console.log('🔄 [BulkUpload] resetTableToProcessing called');

        extensionsBulkUpload.$previewTable.find('tbody tr').each(function() {
            const $row = $(this);
            const $statusCell = $row.find('.status-cell');
            const statusText = $statusCell.find('.status-text').text().trim();

            console.log(`🔍 [BulkUpload] Row status check - hasClass positive: ${$row.hasClass('positive')}, statusText: '${statusText}', expectedValid: '${globalTranslate.ex_ImportStatusValid}'`);

            // Only reset rows that have 'valid' status from preview
            // Leave duplicates, exists, and error rows as they are
            if ($row.hasClass('positive') && statusText === globalTranslate.ex_ImportStatusValid) {
                console.log(`✅ [BulkUpload] Resetting row to processing status`);
                // Update to processing status only for valid records
                $row.removeClass('positive negative warning').addClass('active');
                $statusCell.html('<i class="spinner loading icon"></i> <span class="status-text">' + globalTranslate.ex_ImportStatusProcessing + '</span>');
            }
        });
    },

    /**
     * Sort table by status column after import completion
     */
    sortTableByStatus() {
        console.log('🔄 [BulkUpload] Sorting table by status after import completion');

        const $statusHeader = extensionsBulkUpload.$previewTable.find('th').eq(4); // Status column (index 4)
        const $allTh = extensionsBulkUpload.$previewTable.find('th');
        const $tbody = extensionsBulkUpload.$previewTable.find('tbody');
        const $rows = $tbody.find('tr');

        // Remove sorting classes from other headers
        $allTh.removeClass('sorted ascending descending');

        // Set status column as sorted ascending (show processed results first)
        $statusHeader.addClass('sorted ascending');

        // Sort rows by status priority
        const sortedRows = $rows.sort(function(a, b) {
            const aText = $(a).find('td').eq(4).text().trim();
            const bText = $(b).find('td').eq(4).text().trim();

            // Status order priority (created/updated first, then skipped, then no changes, then errors)
            const statusOrder = {
                'Создан': 1,
                'Обновлен': 2,
                'Пропущен': 3,
                'Уже существует': 4,
                'Без изменений': 5,
                'Ошибка': 6,
                'Обрабатывается': 7 // Should not appear after completion, but just in case
            };

            // Extract status text (remove icon part)
            const aStatus = statusOrder[aText.split(' ').slice(1).join(' ')] || 999;
            const bStatus = statusOrder[bText.split(' ').slice(1).join(' ')] || 999;

            return aStatus - bStatus; // Ascending order
        });

        // Update table with sorted rows
        $tbody.empty().append(sortedRows);

        console.log('✅ [BulkUpload] Table sorted by status - processed records shown first');
    },

    /**
     * Update individual row status
     * @param {string} number - Extension number
     * @param {string} status - New status (created, updated, skipped, error)
     * @param {string} message - Status message
     */
    updateRowStatus(number, status, message) {
        console.log(`🔄 [BulkUpload] updateRowStatus called for number: ${number}, status: ${status}, message: ${message}`);

        const $row = extensionsBulkUpload.$previewTable.find(`tbody tr[data-number="${number}"]`);
        if ($row.length === 0) {
            console.warn(`⚠️ [BulkUpload] No row found for number: ${number}`);
            return;
        }

        const $statusCell = $row.find('.status-cell');

        let statusClass, statusIcon, statusText;

        switch(status) {
            case 'created':
            case 'updated':
                statusClass = 'positive';
                statusIcon = 'check circle green';
                statusText = status === 'created' ? globalTranslate.ex_ImportStatusCreated : globalTranslate.ex_ImportStatusUpdated;
                break;
            case 'skipped':
            case 'exists': // Handle "exists" status from backend
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
        }

        // Update row class and status
        $row.removeClass('positive negative warning active disabled').addClass(statusClass);
        $statusCell.html(`<i class="${statusIcon} icon"></i> <span class="status-text">${statusText}</span>`);

        console.log(`✅ [BulkUpload] Updated row ${number} to status: ${statusText}, class: ${statusClass}`);

        // Note: Removed automatic scrolling to prevent page jumping during processing
    }
};

// Initialize when document is ready
$(document).ready(() => {
    console.log('🚀 [BulkUpload] Document ready, starting module initialization');
    extensionsBulkUpload.initialize();
});