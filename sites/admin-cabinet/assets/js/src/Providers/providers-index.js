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

/* global globalRootUrl, globalTranslate, ProvidersAPI, SipProvidersAPI, IaxProvidersAPI, SecurityUtils, SemanticLocalization, PbxDataTableIndex, UserMessage, ProviderStatusMonitor */

/**
 * Object for managing providers table
 *
 * @module providers
 */
const providers = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,

    /**
     * Delete modal form
     */
    $deleteModalForm: $('#delete-modal-form'),

    /**
     * Initialize the object
     */
    initialize() {
        // Initialize delete modal
        providers.$deleteModalForm.modal();
        
        // Initialize the providers table with REST API
        this.initializeDataTable();
    },
    
    /**
     * Initialize DataTable using base class
     */
    initializeDataTable() {
        // Create instance of base class with Providers specific configuration
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'providers-table',
            apiModule: ProvidersAPI,
            routePrefix: 'providers',
            showSuccessMessages: false,
            actionButtons: ['edit', 'copy', 'delete'], // Include copy button for providers
            ajaxData: {
                includeDisabled: 'true'  // Always include disabled providers in admin panel
            },
            translations: {
                deleteError: globalTranslate.pr_ImpossibleToDeleteProvider
            },
            onDataLoaded: this.onDataLoaded.bind(this),
            onDrawCallback: this.onDrawCallback.bind(this),
            onAfterDelete: this.onAfterDeleteSuccess.bind(this), // Callback after successful deletion
            order: [[0, 'asc']], // Default sorting by status (enabled first)
            columns: [
                {
                    // Enable/disable checkbox column
                    data: 'disabled',
                    orderable: true,
                    searchable: false,
                    className: 'collapsing',
                    render(data, type, row) {
                        if (type === 'sort' || type === 'type') {
                            // Return 0 for enabled, 1 for disabled for sorting
                            return row.disabled ? 1 : 0;
                        }
                        const checked = !row.disabled ? 'checked' : '';
                        return `
                            <div class="ui fitted toggle checkbox">
                                <input type="checkbox" ${checked} />
                                <label></label>
                            </div>
                        `;
                    }
                },
                {
                    // Status column
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'center aligned collapsing provider-status',
                    render() {
                        return '<i class="spinner loading icon"></i>';
                    }
                },
                {
                    // Provider name column - display what comes from server
                    data: 'represent',
                    className: 'collapsing',
                    render(data, type, row) {
                        if (type === 'display') {
                            // Use SecurityUtils.sanitizeForDisplay with less strict mode for provider icons
                            const tmpRepresentation = window.SecurityUtils.sanitizeForDisplay(data || '', false);
                            // Limit the displayed length to 80 characters
                            const safeRepresentation= tmpRepresentation.length > 80 ? tmpRepresentation.slice(0, 77) + '...' : tmpRepresentation;
                            
                            return `<span>${safeRepresentation}</span><br><span class="features failure"></span>`;
                        }
                        
                        // For search and other operations, return plain text
                        return [data, row.note, row.type].filter(Boolean).join(' ');
                    }
                },
                {
                    // Host column
                    data: 'host',
                    className: 'hide-on-mobile',
                    render(data) {
                        const host = window.SecurityUtils.escapeHtml(data || '');
                        return `<span>${host}</span>`;
                    }
                },
                {
                    // Username column
                    data: 'username',
                    className: 'hide-on-mobile',
                    render(data) {
                        const username = window.SecurityUtils.escapeHtml(data || '');
                        return `<span>${username}</span>`;
                    }
                }
            ],
            // Custom URL generator for modify/edit actions
            getModifyUrl(recordId) {
                const data = this.dataTable.rows().data().toArray();
                const record = data.find(r => r.id === recordId);
                if (record) {
                    const type = record.type.toLowerCase();
                    return `${globalRootUrl}providers/modify${type}/${recordId}`;
                }
                return null;
            },
            // Custom delete handler to use correct API based on provider type
            customDeleteHandler(recordId, callback) {
                const data = this.dataTable.rows().data().toArray();
                const record = data.find(r => r.id === recordId);
                
                if (record) {
                    // Use type-specific API for deletion
                    const apiModule = record.type === 'SIP' ? SipProvidersAPI : IaxProvidersAPI;
                    apiModule.deleteRecord(recordId, callback);
                } else {
                    // Record not found in table data
                    callback({
                        result: false,
                        messages: {error: ['Provider not found in table']}
                    });
                }
            }
        });
        
        // Initialize the base class
        this.dataTableInstance.initialize();
        
        // Initialize provider status monitor if available
        if (typeof ProviderStatusMonitor !== 'undefined') {
            ProviderStatusMonitor.initialize();
            // Request initial status after table loads
            setTimeout(() => {
                this.requestInitialStatus();
            }, 500);
        }
    },
    
    /**
     * Callback when data is loaded
     * @param {Object} response - The API response
     */
    onDataLoaded(response) {
        // Extract data from response
        const data = response.data || [];
        const hasProviders = data.length > 0;
        
        if (hasProviders) {
            // Show table and buttons
            $('#providers-table-container').show();
            $('#add-buttons-group').show();
            $('#empty-table-placeholder').hide();
        } else {
            // Show empty placeholder
            $('#providers-table-container').hide();
            $('#add-buttons-group').hide();
            $('#empty-table-placeholder').show();
        }
    },
    
    /**
     * Callback after table draw is complete
     */
    onDrawCallback() {
        // Move add buttons group to DataTables wrapper (next to search)
        const $addButtonsGroup = $('#add-buttons-group');
        const $wrapper = $('#providers-table_wrapper');
        const $leftColumn = $wrapper.find('.eight.wide.column').first();
        
        if ($addButtonsGroup.length && $leftColumn.length) {
            $leftColumn.append($addButtonsGroup);
            // Show buttons only if table has data
            const hasData = $('#providers-table').DataTable().data().any();
            if (hasData) {
                $addButtonsGroup.show();
            }
        }
        
        // Add row data attributes for each provider
        $('#providers-table tbody tr').each(function() {
            const data = $('#providers-table').DataTable().row(this).data();
            if (data) {
                $(this).attr('id', data.id);
                $(this).attr('data-value', 'modify' + data.type.toLowerCase());
                $(this).attr('data-links', data.links || 'false');
                $(this).addClass('provider-row');
                
                // Add disability class to specific cells if provider is disabled
                if (data.disabled) {
                    // Add disability and disabled classes to data cells (not checkbox and actions)
                    $(this).find('td').each(function(index) {
                        const $td = $(this);
                        const totalColumns = $(this).parent().find('td').length;
                        // Skip first column (checkbox) and last column (actions)
                        if (index > 0 && index < totalColumns - 1) {
                            $td.addClass('disability disabled');
                        }
                    });
                }
            }
        });
        
        // Initialize enable/disable checkboxes
        this.initializeCheckboxes();
        
        // Refresh ProviderStatusMonitor cache after DOM changes
        if (typeof ProviderStatusMonitor !== 'undefined' && ProviderStatusMonitor.refreshCache) {
            ProviderStatusMonitor.refreshCache();
        }
    },
    
    /**
     * Initialize enable/disable checkboxes
     */
    initializeCheckboxes() {
        $('.provider-row .checkbox')
            .checkbox({
                onChecked() {
                    const providerId = $(this).closest('tr').attr('id');
                    const type = $(this).closest('tr').attr('data-value');
                    
                    // Build data object - extract actual type from data-value (remove 'modify' prefix)
                    const actualType = type.replace(/^modify/i, '').toUpperCase();
                    const data = {
                        id: providerId,
                        type: actualType,
                        disabled: false
                    };
                    
                    // Use REST API v3 to update provider status
                    ProvidersAPI.updateStatus(providerId, data, (response) => {
                        if (response.result) {
                            // Remove disability classes from cells
                            $(`#${providerId} td`).removeClass('disability disabled');
                        } else {
                            // Revert checkbox
                            $(this).checkbox('set unchecked');
                            UserMessage.showMultiString(response.messages);
                        }
                    });
                },
                onUnchecked() {
                    const providerId = $(this).closest('tr').attr('id');
                    const type = $(this).closest('tr').attr('data-value');
                    
                    // Build data object - extract actual type from data-value (remove 'modify' prefix)
                    const actualType = type.replace(/^modify/i, '').toUpperCase();
                    const data = {
                        id: providerId,
                        type: actualType,
                        disabled: true
                    };
                    
                    // Use REST API v3 to update provider status
                    ProvidersAPI.updateStatus(providerId, data, (response) => {
                        if (response.result) {
                            // Add disability and disabled classes to data cells
                            $(`#${providerId} td`).each(function(index) {
                                const totalColumns = $(`#${providerId} td`).length;
                                // Skip first column (checkbox) and last column (actions)
                                if (index > 0 && index < totalColumns - 1) {
                                    $(this).addClass('disability disabled');
                                }
                            });
                        } else {
                            // Revert checkbox
                            $(this).checkbox('set checked');
                            UserMessage.showMultiString(response.messages);
                        }
                    });
                }
            });
    },
    
    /**
     * Callback after successful provider deletion
     * Restores provider statuses after table reload
     */
    onAfterDeleteSuccess() {
        // Request fresh provider statuses after deletion
        setTimeout(() => {
            this.requestInitialStatus();
        }, 300);
    },
    
    /**
     * Request initial provider status on page load
     */
    requestInitialStatus() {
        ProvidersAPI.getStatuses((response) => {
            // Manually trigger status update
            if (response && response.data && typeof ProviderStatusMonitor !== 'undefined') {
                ProviderStatusMonitor.updateAllProviderStatuses(response.data);
            }
        });
    }
};

/**
 * Initialize providers on document ready
 */
$(document).ready(() => {
    providers.initialize();
});