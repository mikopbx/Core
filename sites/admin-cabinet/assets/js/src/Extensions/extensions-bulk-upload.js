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
    initialize() {
        // Initialize tabs
        $('#bulk-tabs .item').tab();

        // Initialize dropdowns
        extensionsBulkUpload.$importStrategy.dropdown();
        extensionsBulkUpload.$exportFormat.dropdown();
        extensionsBulkUpload.$templateFormat.dropdown();

        // Set up file upload
        extensionsBulkUpload.initializeFileUpload();

        // Set up event handlers
        extensionsBulkUpload.$confirmImport.on('click', extensionsBulkUpload.confirmImport);
        extensionsBulkUpload.$cancelImport.on('click', extensionsBulkUpload.cancelImport);
        extensionsBulkUpload.$newImport.on('click', extensionsBulkUpload.startNewImport);
        extensionsBulkUpload.$exportButton.on('click', extensionsBulkUpload.exportEmployees);
        extensionsBulkUpload.$downloadTemplate.on('click', extensionsBulkUpload.downloadTemplate);

        // Subscribe to EventBus for import progress
        EventBus.subscribe('import_progress', extensionsBulkUpload.onImportProgress);
        EventBus.subscribe('import_complete', extensionsBulkUpload.onImportComplete);

        // Check URL hash to activate correct tab
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            $(`#bulk-tabs .item[data-tab="${hash}"]`).click();
        }
    },

    /**
     * Initialize file upload with Resumable.js
     */
    initializeFileUpload() {
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
            fileType: ['csv'],
        });

        extensionsBulkUpload.resumable.assignBrowse(extensionsBulkUpload.$uploadButton[0]);
        extensionsBulkUpload.resumable.assignDrop(extensionsBulkUpload.$uploadSegment[0]);

        // File added event
        extensionsBulkUpload.resumable.on('fileAdded', (file) => {
            extensionsBulkUpload.$uploadSegment.addClass('loading');
            extensionsBulkUpload.resumable.upload();
        });

        // Upload progress
        extensionsBulkUpload.resumable.on('fileProgress', (file) => {
            const percent = Math.floor(file.progress() * 100);
            console.log(`Upload progress: ${percent}%`);
        });

        // Upload success
        extensionsBulkUpload.resumable.on('fileSuccess', (file, response) => {
            extensionsBulkUpload.$uploadSegment.removeClass('loading');
            const result = JSON.parse(response);
            if (result.result === true && result.data && result.data.upload_id) {
                extensionsBulkUpload.uploadedFilePath = result.data.upload_id;
                extensionsBulkUpload.previewImport();
            } else {
                UserMessage.showMultiString(globalTranslate.ex_FileUploadError);
            }
        });

        // Upload error
        extensionsBulkUpload.resumable.on('fileError', (file, message) => {
            extensionsBulkUpload.$uploadSegment.removeClass('loading');
            UserMessage.showMultiString(message || globalTranslate.ex_FileUploadError);
        });
    },

    /**
     * Preview import - validate CSV and show preview
     */
    previewImport() {
        const strategy = extensionsBulkUpload.$importStrategy.dropdown('get value');
        
        extensionsBulkUpload.$uploadSegment.addClass('loading');

        EmployeesAPI.importCSV(
            extensionsBulkUpload.uploadedFilePath,
            'preview',
            strategy,
            (response) => {
                extensionsBulkUpload.$uploadSegment.removeClass('loading');
                
                if (response.result === true && response.data) {
                    extensionsBulkUpload.uploadId = response.data.uploadId;
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
                                   row.status === 'duplicate' ? 'warning' : 'negative';
                const statusIcon = row.status === 'valid' ? 'check circle' : 
                                  row.status === 'duplicate' ? 'exclamation triangle' : 'times circle';
                
                $tbody.append(`
                    <tr class="${statusClass}">
                        <td><i class="${statusIcon} icon"></i> ${row.status}</td>
                        <td>${row.number || ''}</td>
                        <td>${row.user_username || ''}</td>
                        <td>${row.user_email || ''}</td>
                        <td>${row.mobile_number || ''}</td>
                        <td>${row.validation_message || ''}</td>
                    </tr>
                `);
            });
        }

        // Initialize DataTable
        extensionsBulkUpload.previewDataTable = extensionsBulkUpload.$previewTable.DataTable({
            lengthChange: false,
            paging: true,
            pageLength: 10,
            searching: false,
            ordering: true,
            language: SemanticLocalization.dataTableLocalisation,
        });

        // Show preview section, hide upload section
        extensionsBulkUpload.$uploadSegment.hide();
        extensionsBulkUpload.$previewSection.show();
    },

    /**
     * Confirm and start import
     */
    confirmImport() {
        if (!extensionsBulkUpload.uploadId) {
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
                    // Hide preview, show progress
                    extensionsBulkUpload.$previewSection.hide();
                    extensionsBulkUpload.$progressSection.show();
                    
                    // Initialize progress bar
                    extensionsBulkUpload.$importProgress.progress({
                        percent: 0
                    });
                    
                    // Clear log messages
                    extensionsBulkUpload.$logMessages.empty();
                    
                    // Import has started, wait for EventBus updates
                    extensionsBulkUpload.addLogMessage('info', globalTranslate.ex_ImportStarted);
                } else {
                    UserMessage.showMultiString(response.messages);
                }
            }
        );
    },

    /**
     * Cancel import and reset
     */
    cancelImport() {
        extensionsBulkUpload.$previewSection.hide();
        extensionsBulkUpload.$uploadSegment.show();
        extensionsBulkUpload.uploadId = null;
        extensionsBulkUpload.uploadedFilePath = null;
    },

    /**
     * Start new import
     */
    startNewImport() {
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
            extensionsBulkUpload.addLogMessage(data.type || 'info', data.log);
        }
    },

    /**
     * Handle import completion
     */
    onImportComplete(data) {
        // Hide progress, show results
        extensionsBulkUpload.$progressSection.hide();
        extensionsBulkUpload.$resultsSection.show();

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
     * Add log message
     */
    addLogMessage(type, message) {
        const iconClass = type === 'error' ? 'times circle red' : 
                         type === 'warning' ? 'exclamation triangle yellow' : 
                         'info circle blue';
        
        const $message = $(`
            <div class="item">
                <i class="${iconClass} icon"></i>
                <div class="content">
                    <div class="description">${message}</div>
                </div>
            </div>
        `);
        
        extensionsBulkUpload.$logMessages.append($message);
        
        // Scroll to bottom
        const logContainer = extensionsBulkUpload.$logMessages.parent()[0];
        if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
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
                    // Trigger download
                    if (response.data.fpassthru) {
                        window.location = `${globalRootUrl}employees/downloadCSV?file=${response.data.fpassthru.filename}`;
                    }
                    
                    const message = globalTranslate.ex_ExportSuccess
                        .replace('{count}', response.data.count || 0);
                    UserMessage.showInformation(message);
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
                    // Trigger download
                    if (response.data.fpassthru) {
                        window.location = `${globalRootUrl}employees/downloadCSV?file=${response.data.fpassthru.filename}`;
                    }
                    
                    UserMessage.showInformation(globalTranslate.ex_TemplateDownloaded);
                } else {
                    UserMessage.showMultiString(response.messages);
                }
            }
        );
    }
};

// Initialize when document is ready
$(document).ready(() => {
    extensionsBulkUpload.initialize();
});