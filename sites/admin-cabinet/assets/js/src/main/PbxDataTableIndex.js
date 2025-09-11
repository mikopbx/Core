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

/* global globalRootUrl, SemanticLocalization, globalTranslate, UserMessage, Extensions, SecurityUtils */

/**
 * Base class for MikoPBX index table management with ACL support
 * 
 * Provides common functionality for DataTable-based index pages including:
 * - Server-side ACL permission checking
 * - Dynamic action button rendering based on permissions
 * - Unified description truncation with popup support
 * - Copy functionality support
 * - Custom action buttons
 * - Two-step delete confirmation
 * - Double-click editing
 * 
 * @class PbxDataTableIndex
 */
class PbxDataTableIndex {
    /**
     * Create a new PbxDataTableIndex instance
     * 
     * @param {Object} config - Configuration object
     * @param {string} config.tableId - HTML table element ID
     * @param {Object} config.apiModule - API module for data operations
     * @param {string} config.routePrefix - URL route prefix (e.g., 'call-queues')
     * @param {Object} config.translations - Translation keys for messages
     * @param {Array} config.columns - DataTable column definitions
     * @param {boolean} [config.showSuccessMessages=false] - Show success messages on delete
     * @param {boolean} [config.showInfo=false] - Show DataTable info
     * @param {Array} [config.actionButtons=['edit', 'delete']] - Standard action buttons to show
     * @param {Array} [config.customActionButtons=[]] - Custom action button definitions
     * @param {Object} [config.descriptionSettings] - Description truncation settings
     * @param {Function} [config.onDataLoaded] - Callback after data loaded
     * @param {Function} [config.onDrawCallback] - Callback after table draw
     * @param {Function} [config.onPermissionsLoaded] - Callback after permissions loaded
     * @param {Function} [config.customDeleteHandler] - Custom delete handler
     * @param {Function} [config.onAfterDelete] - Callback after successful deletion
     * @param {Function} [config.getModifyUrl] - Custom URL generator for modify/edit actions
     * @param {boolean} [config.orderable=true] - Enable/disable sorting for all columns
     * @param {Array} [config.order=[[0, 'asc']]] - Default sort order
     * @param {Object} [config.ajaxData] - Additional data parameters for AJAX requests
     */
    constructor(config) {
        // Core configuration
        this.tableId = config.tableId;
        this.apiModule = config.apiModule;
        this.routePrefix = config.routePrefix;
        this.translations = config.translations || {};
        this.columns = config.columns || [];
        this.showSuccessMessages = config.showSuccessMessages || false;
        this.showInfo = config.showInfo || false;
        
        // Sorting configuration (backward compatible)
        this.orderable = config.orderable !== undefined ? config.orderable : true;
        this.order = config.order || [[0, 'asc']];
        
        // Permission state (loaded from server)
        this.permissions = {
            save: false,
            modify: false,
            edit: false,
            delete: false,
            copy: false,
            custom: {}
        };
        
        // Action buttons configuration
        this.actionButtons = config.actionButtons || ['edit', 'delete'];
        this.customActionButtons = config.customActionButtons || [];
        
        // Description truncation settings
        this.descriptionSettings = Object.assign({
            maxLines: 3,
            dynamicHeight: false,
            calculateLines: null
        }, config.descriptionSettings || {});
        
        // Internal properties
        this.$table = $(`#${this.tableId}`);
        this.dataTable = {};
        
        // Optional callbacks
        this.onDataLoaded = config.onDataLoaded;
        this.onDrawCallback = config.onDrawCallback;
        this.onPermissionsLoaded = config.onPermissionsLoaded;
        this.customDeleteHandler = config.customDeleteHandler;
        this.onAfterDelete = config.onAfterDelete;
        this.getModifyUrl = config.getModifyUrl;
        this.ajaxData = config.ajaxData || {};
    }
    
    /**
     * Initialize the module with permission loading
     */
    async initialize() {
        try {
            // Show loader while initializing
            this.showLoader();
            
            // First, load permissions from server
            await this.loadPermissions();
            
            // Initialize DataTable (will handle loader/empty state in data callback)
            this.initializeDataTable();
        } catch (error) {
            console.error('Failed to initialize PbxDataTableIndex:', error);
            UserMessage.showError(globalTranslate.ex_ErrorInitializingTable || 'Failed to initialize table');
            this.hideLoader();
            this.toggleEmptyPlaceholder(true);
        }
    }
    
    /**
     * Load permissions from server
     */
    async loadPermissions() {
        try {
            const response = await $.ajax({
                url: `${globalRootUrl}acl/checkPermissions`,
                method: 'GET',
                data: {
                    controller: this.routePrefix
                },
                dataType: 'json'
            });
            
            if (response.success && response.data) {
                Object.assign(this.permissions, response.data);
                
                if (this.onPermissionsLoaded) {
                    this.onPermissionsLoaded(this.permissions);
                }
            }
        } catch (error) {
            console.warn('Failed to load permissions, using defaults:', error);
            // On error, default to no permissions for safety
        }
    }
    
    /**
     * Initialize DataTable with common configuration
     */
    initializeDataTable() {
        // Add the datatable-width-constrained class to the table
        this.$table.addClass('datatable-width-constrained');
        
        const processedColumns = this.processColumns();
        
        const config = {
            ajax: {
                url: this.apiModule.endpoints.getList,
                type: 'GET',
                data: this.ajaxData,
                dataSrc: (json) => this.handleDataLoad(json),
                error: (xhr, error, thrown) => {
                    this.hideLoader();
                    this.toggleEmptyPlaceholder(true);
                    UserMessage.showError(globalTranslate.ex_ErrorLoadingData || 'Failed to load data');
                }
            },
            columns: processedColumns,
            order: this.order,
            ordering: this.orderable,
            lengthChange: false,
            paging: false,
            searching: true,
            info: this.showInfo,
            language: SemanticLocalization.dataTableLocalisation,
            drawCallback: () => this.handleDrawCallback()
        };
        
        this.dataTable = this.$table.DataTable(config);
        
        // Initialize handlers
        this.initializeDeleteHandler();
        this.initializeCopyHandler();
        this.initializeCustomHandlers();
    }
    
    /**
     * Process column definitions and add action column if needed
     */
    processColumns() {
        const columns = [...this.columns];
        
        // If sorting is globally disabled, ensure all columns respect it
        if (!this.orderable) {
            columns.forEach(col => {
                // Preserve explicit orderable: false, but override true or undefined
                if (col.orderable !== false) {
                    col.orderable = false;
                }
            });
        }
        
        // Add standard action column if not already present
        if (!columns.find(col => col.isActionColumn)) {
            columns.push(this.createActionColumn());
        }
        
        return columns;
    }
    
    /**
     * Create standard action column with permission-based rendering
     */
    createActionColumn() {
        return {
            data: null,
            orderable: false,
            searchable: false,
            className: 'right aligned collapsing',
            isActionColumn: true,
            render: (data, type, row) => {
                const buttons = [];
                // Get the record ID - check for both uniqid and id fields
                const recordId = row.uniqid || row.id || '';
                
                // Edit button
                if (this.actionButtons.includes('edit') && 
                    (this.permissions.modify || this.permissions.edit)) {
                    
                    // Use custom getModifyUrl if provided, otherwise use default
                    const modifyUrl = this.getModifyUrl ? 
                        this.getModifyUrl(recordId) : 
                        `${globalRootUrl}${this.routePrefix}/modify/${recordId}`;
                    
                    buttons.push(`
                        <a href="${modifyUrl}" 
                           class="ui button edit popuped" 
                           data-content="${globalTranslate.bt_ToolTipEdit}">
                            <i class="icon edit blue"></i>
                        </a>
                    `);
                }
                
                // Copy button
                if (this.actionButtons.includes('copy') && this.permissions.copy) {
                    buttons.push(`
                        <a href="#" 
                           data-value="${recordId}"
                           class="ui button copy popuped" 
                           data-content="${globalTranslate.bt_ToolTipCopy}">
                            <i class="icon copy outline blue"></i>
                        </a>
                    `);
                }
                
                // Custom buttons
                this.customActionButtons.forEach(customButton => {
                    if (this.permissions.custom && this.permissions.custom[customButton.name]) {
                        const href = customButton.href || '#';
                        const dataValue = customButton.includeId ? `data-value="${recordId}"` : '';
                        buttons.push(`
                            <a href="${href}" 
                               ${dataValue}
                               class="ui button ${customButton.class} popuped" 
                               data-content="${SecurityUtils.escapeHtml(customButton.tooltip)}">
                                <i class="${customButton.icon}"></i>
                            </a>
                        `);
                    }
                });
                
                // Delete button (always last)
                if (this.actionButtons.includes('delete') && this.permissions.delete) {
                    buttons.push(`
                        <a href="#" 
                           data-value="${recordId}" 
                           class="ui button delete two-steps-delete popuped" 
                           data-content="${globalTranslate.bt_ToolTipDelete}">
                            <i class="icon trash red"></i>
                        </a>
                    `);
                }
                
                return buttons.length > 0 ? 
                    `<div class="ui tiny basic icon buttons action-buttons">${buttons.join('')}</div>` : 
                    '';
            }
        };
    }
    
    /**
     * Handle data load and empty state management
     * Supports multiple API formats:
     * - v2 API: {result: true, data: [...]}
     * - v3 API: {data: {items: [...]}}
     * - Hybrid: {result: true, data: {items: [...]}}
     */
    handleDataLoad(json) {
        // Hide loader first
        this.hideLoader();
        
        let data = [];
        let isSuccess = false;
        
        // First check if we have a result field to determine success
        if (json.hasOwnProperty('result')) {
            isSuccess = json.result === true;
        }
        
        // Now extract data based on structure
        if (json.data) {
            // Check if data has items property (v3 or hybrid format)
            if (json.data.items !== undefined) {
                data = json.data.items || [];
                // If no result field was present, assume success if we have data.items
                if (!json.hasOwnProperty('result')) {
                    isSuccess = true;
                }
            }
            // Check if data is directly an array (v2 format)
            else if (Array.isArray(json.data)) {
                data = json.data;
                // If no result field was present, assume success
                if (!json.hasOwnProperty('result')) {
                    isSuccess = true;
                }
            }
        }
        
        const isEmpty = !isSuccess || data.length === 0;
        this.toggleEmptyPlaceholder(isEmpty);
        
        if (this.onDataLoaded) {
            // Pass normalized response to callback
            const normalizedResponse = {
                result: isSuccess,
                data: data
            };
            this.onDataLoaded(normalizedResponse);
        }
        
        return data;
    }
    
    /**
     * Handle draw callback for post-render operations
     */
    handleDrawCallback() {
        // Initialize Semantic UI popups
        this.$table.find('.popuped').popup();
        
        // Move Add New button to DataTables wrapper
        this.repositionAddButton();
        
        // Initialize double-click editing
        this.initializeDoubleClickEdit();
        
        // Custom draw callback
        if (this.onDrawCallback) {
            this.onDrawCallback();
        }
    }
    
    /**
     * Reposition Add New button to DataTables wrapper
     */
    repositionAddButton() {
        const $addButton = $('#add-new-button');
        const $wrapper = $(`#${this.tableId}_wrapper`);
        const $leftColumn = $wrapper.find('.eight.wide.column').first();
        
        if ($addButton.length && $leftColumn.length && this.permissions.save) {
            $leftColumn.append($addButton);
            $addButton.show();
        }
    }
    
    /**
     * Initialize delete handler with two-step confirmation
     */
    initializeDeleteHandler() {
        // DeleteSomething.js handles first click
        // We handle second click when two-steps-delete class is removed
        this.$table.on('click', 'a.delete:not(.two-steps-delete)', (e) => {
            e.preventDefault();
            const $button = $(e.currentTarget);
            const recordId = $button.attr('data-value');
            
            // Add loading state
            $button.addClass('loading disabled');
            
            if (this.customDeleteHandler) {
                this.customDeleteHandler(recordId);
            } else {
                this.apiModule.deleteRecord(recordId, (response) => this.cbAfterDeleteRecord(response));
            }
        });
    }
    
    /**
     * Initialize copy handler
     */
    initializeCopyHandler() {
        this.$table.on('click', 'a.copy', (e) => {
            e.preventDefault();
            const recordId = $(e.currentTarget).attr('data-value');
            
            // Use same logic as modify URL but add copy parameter
            let copyUrl;
            if (this.getModifyUrl) {
                // Use custom getModifyUrl and add copy parameter
                const modifyUrl = this.getModifyUrl(recordId);
                if (modifyUrl) {
                    // Remove recordId from URL and add copy parameter
                    const baseUrl = modifyUrl.replace(`/${recordId}`, '');
                    copyUrl = `${baseUrl}/?copy=${recordId}`;
                }
            } else {
                // Default URL pattern
                copyUrl = `${globalRootUrl}${this.routePrefix}/modify/?copy=${recordId}`;
            }
            
            // Redirect to copy URL
            if (copyUrl) {
                window.location = copyUrl;
            }
        });
    }
    
    /**
     * Initialize custom button handlers
     */
    initializeCustomHandlers() {
        this.customActionButtons.forEach(customButton => {
            if (customButton.onClick) {
                this.$table.on('click', `a.${customButton.class}`, (e) => {
                    e.preventDefault();
                    const recordId = $(e.currentTarget).attr('data-value');
                    customButton.onClick(recordId);
                });
            }
        });
    }
    
    /**
     * Callback after record deletion
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Reload table data with callback support
            const reloadCallback = () => {
                // Call custom after-delete callback if provided
                if (typeof this.onAfterDelete === 'function') {
                    this.onAfterDelete(response);
                }
            };
            
            // Reload table and execute callback
            this.dataTable.ajax.reload(reloadCallback, false);
            
            // Update related components
            if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
                Extensions.cbOnDataChanged();
            }
            
            // Success message removed - no need to show success for deletion operations
        } else {
            // Show error message
            const errorMessage = response.messages?.error || 
                                this.translations.deleteError || 
                                globalTranslate.ex_ImpossibleToDeleteRecord;
            UserMessage.showError(errorMessage);
        }
        
        // Remove loading state from all delete buttons
        this.$table.find('a.delete').removeClass('loading disabled');
    }
    
    /**
     * Show loader while loading data
     */
    showLoader() {
        // Hide everything first
        // Find the table's parent container - need the original container, not the DataTables wrapper
        const $wrapper = this.$table.closest('div[id$="_wrapper"]');
        let $container;
        if ($wrapper.length) {
            // Get the parent of the wrapper (should be the original container)
            $container = $wrapper.parent('div[id]');
        }
        // Fallback if structure is different
        if (!$container || !$container.length) {
            $container = this.$table.closest('div[id]:not([id$="_wrapper"])');
        }
        const $placeholder = $('#empty-table-placeholder');
        const $addButton = $('#add-new-button');
        
        $container.hide();
        $placeholder.hide();
        $addButton.hide();
        
        // Create and show loader if not exists
        let $loader = $('#table-data-loader');
        if (!$loader.length) {
            // Create a segment with loader for better visual appearance
            $loader = $(`
                <div id="table-data-loader" class="ui segment" style="min-height: 200px; position: relative;">
                    <div class="ui active inverted dimmer">
                        <div class="ui text loader">${globalTranslate.ex_LoadingData || 'Loading...'}</div>
                    </div>
                </div>
            `);
            // Insert loader in the appropriate place
            if ($container.length && $container.parent().length) {
                $container.before($loader);
            } else if ($placeholder.length && $placeholder.parent().length) {
                $placeholder.before($loader);
            } else {
                // Fallback: append to body or parent container
                const $parent = this.$table.closest('.pusher') || this.$table.parent();
                $parent.append($loader);
            }
        }
        $loader.show();
    }
    
    /**
     * Hide loader
     */
    hideLoader() {
        $('#table-data-loader').hide();
    }
    
    /**
     * Toggle empty table placeholder visibility
     */
    toggleEmptyPlaceholder(isEmpty) {
        // Find the table's parent container - need the original container, not the DataTables wrapper
        // DataTables wraps the table in a div with id ending in '_wrapper'
        // We need to find the parent of that wrapper which is the original container
        const $wrapper = this.$table.closest('div[id$="_wrapper"]');
        let $container;
        if ($wrapper.length) {
            // Get the parent of the wrapper (should be the original container)
            $container = $wrapper.parent('div[id]');
        }
        // Fallback if structure is different
        if (!$container || !$container.length) {
            $container = this.$table.closest('div[id]:not([id$="_wrapper"])');
        }
        const $addButton = $('#add-new-button');
        const $placeholder = $('#empty-table-placeholder');
        
        if (isEmpty) {
            $container.hide();
            $addButton.hide();
            // Make sure placeholder is visible
            if ($placeholder.length) {
                $placeholder.show();
            }
        } else {
            if ($placeholder.length) {
                $placeholder.hide();
            }
            if (this.permissions.save) {
                $addButton.show();
            }
            $container.show();
        }
    }
    
    /**
     * Initialize double-click for editing
     * Excludes action button cells to avoid conflicts
     */
    initializeDoubleClickEdit() {
        this.$table.on('dblclick', 'tbody td:not(.right.aligned)', (e) => {
            const data = this.dataTable.row(e.currentTarget).data();
            // Get the record ID - check for both uniqid and id fields
            const recordId = data && (data.uniqid || data.id);
            if (recordId && (this.permissions.modify || this.permissions.edit)) {
                // Use custom getModifyUrl if provided, otherwise use default
                const modifyUrl = this.getModifyUrl ? 
                    this.getModifyUrl(recordId) : 
                    `${globalRootUrl}${this.routePrefix}/modify/${recordId}`;
                window.location = modifyUrl;
            }
        });
    }
    
    /**
     * Create a unified description renderer with truncation support
     * 
     * @returns {Function} Renderer function for DataTables
     */
    createDescriptionRenderer() {
        return (data, type, row) => {
            if (!data || data.trim() === '') {
                return '—';
            }
            
            if (type === 'display') {
                // Escape HTML to prevent XSS
                const safeDesc = window.SecurityUtils.escapeHtml(data);
                const descriptionLines = safeDesc.split('\n').filter(line => line.trim() !== '');
                
                // Calculate max lines
                let maxLines = this.descriptionSettings.maxLines;
                if (this.descriptionSettings.dynamicHeight && this.descriptionSettings.calculateLines) {
                    maxLines = this.descriptionSettings.calculateLines(row);
                }
                
                if (descriptionLines.length <= maxLines) {
                    // Description fits - show with preserved formatting
                    const formattedDesc = descriptionLines.join('<br>');
                    return `<div class="description-text" style="line-height: 1.3;">${formattedDesc}</div>`;
                } else {
                    // Description too long - truncate with popup
                    const visibleLines = descriptionLines.slice(0, maxLines);
                    visibleLines[maxLines - 1] += '...';
                    
                    const truncatedDesc = visibleLines.join('<br>');
                    const fullDesc = descriptionLines.join('\n');
                    
                    return `<div class="description-text truncated popuped" 
                               data-content="${fullDesc}" 
                               data-position="top right" 
                               data-variation="wide"
                               style="cursor: help; border-bottom: 1px dotted #999; line-height: 1.3;">
                        ${truncatedDesc}
                    </div>`;
                }
            }
            
            // For search and other operations, return plain text
            return data;
        };
    }
    
    /**
     * Destroy the DataTable and cleanup
     */
    destroy() {
        // Remove event handlers
        this.$table.off('click', 'a.delete:not(.two-steps-delete)');
        this.$table.off('click', 'a.copy');
        this.$table.off('dblclick', 'tbody td:not(.right.aligned)');
        
        // Destroy DataTable if exists
        if (this.dataTable && typeof this.dataTable.destroy === 'function') {
            this.dataTable.destroy();
        }
        
        // Remove loader
        $('#table-data-loader').remove();
    }
}

// Make available globally
window.PbxDataTableIndex = PbxDataTableIndex;