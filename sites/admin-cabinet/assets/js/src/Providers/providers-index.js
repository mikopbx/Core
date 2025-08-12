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

/* global globalRootUrl, globalTranslate, ProvidersAPI, SecurityUtils, SemanticLocalization, PbxDataTableIndex, UserMessage, ProviderStatusMonitor */

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
            actionButtons: ['edit', 'delete'], // No copy button for providers
            ajaxData: {
                includeDisabled: 'true'  // Always include disabled providers in admin panel
            },
            translations: {
                deleteError: globalTranslate.pr_ImpossibleToDeleteProvider
            },
            onDataLoaded: this.onDataLoaded.bind(this),
            onDrawCallback: this.onDrawCallback.bind(this),
            order: [[0, 'asc']], // Default sorting by status (enabled first)
            columns: [
                {
                    // Enable/disable checkbox column
                    data: 'disabled',
                    orderable: true,
                    searchable: false,
                    className: 'collapsing',
                    render: function(data, type, row) {
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
                    render: function(data, type, row) {
                        return `<i class="spinner loading icon"></i>`;
                    }
                },
                {
                    // Provider name column - display what comes from server
                    data: 'represent',
                    className: 'collapsing',
                    render: function(data, type, row) {
                        if (type === 'display') {
                            // Use SecurityUtils.sanitizeExtensionsApiContent to allow safe HTML rendering
                            const safeRepresentation = window.SecurityUtils.sanitizeExtensionsApiContent(data || '');
                            
                            return `<span>${safeRepresentation}</span><br><span class="features failure"></span>`;
                        }
                        
                        // For search and other operations, return plain text
                        return [data, row.note, row.type].filter(Boolean).join(' ');
                    }
                },
                {
                    // Host column
                    data: 'host',
                    render: function(data, type, row) {
                        const host = window.SecurityUtils.escapeHtml(data || '');
                        return `<span>${host}</span>`;
                    }
                },
                {
                    // Username column
                    data: 'username',
                    className: 'hide-on-mobile',
                    render: function(data, type, row) {
                        const username = window.SecurityUtils.escapeHtml(data || '');
                        return `<span>${username}</span>`;
                    }
                }
            ],
            // Custom URL generator for modify/edit actions
            getModifyUrl: function(recordId) {
                const data = this.dataTable.rows().data().toArray();
                const record = data.find(r => r.uniqid === recordId);
                if (record) {
                    const type = record.type.toLowerCase();
                    return `${globalRootUrl}providers/modify${type}/${recordId}`;
                }
                return null;
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
                $(this).attr('id', data.uniqid);
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
        
        // Override delete handler to check for links
        $('.provider-row a.delete').off('click').on('click', (e) => {
            e.preventDefault();
            const providerId = $(e.target).closest('a').attr('data-value');
            const linksExist = $(e.target).closest('tr').attr('data-links');
            
            if (linksExist === 'true') {
                providers.$deleteModalForm
                    .modal({
                        closable: false,
                        onDeny: () => true,
                        onApprove: () => {
                            providers.deleteProvider(providerId);
                            return true;
                        },
                    })
                    .modal('show');
            } else {
                providers.deleteProvider(providerId);
            }
        });
    },
    
    /**
     * Initialize enable/disable checkboxes
     */
    initializeCheckboxes() {
        $('.provider-row .checkbox')
            .checkbox({
                onChecked() {
                    const uniqid = $(this).closest('tr').attr('id');
                    const type = $(this).closest('tr').attr('data-value');
                    
                    // Build data object - extract actual type from data-value (remove 'modify' prefix)
                    const actualType = type.replace(/^modify/i, '').toUpperCase();
                    const data = {
                        id: uniqid,
                        type: actualType,
                        disabled: false
                    };
                    
                    // Use REST API to update (will be detected as status-only update)
                    ProvidersAPI.saveRecord(data, (response) => {
                        if (response.result) {
                            // Remove disability classes from cells
                            $(`#${uniqid} td`).removeClass('disability disabled');
                        } else {
                            // Revert checkbox
                            $(this).checkbox('set unchecked');
                            UserMessage.showMultiString(response.messages);
                        }
                    });
                },
                onUnchecked() {
                    const uniqid = $(this).closest('tr').attr('id');
                    const type = $(this).closest('tr').attr('data-value');
                    
                    // Build data object - extract actual type from data-value (remove 'modify' prefix)
                    const actualType = type.replace(/^modify/i, '').toUpperCase();
                    const data = {
                        id: uniqid,
                        type: actualType,
                        disabled: true
                    };
                    
                    // Use REST API to update (will be detected as status-only update)
                    ProvidersAPI.saveRecord(data, (response) => {
                        if (response.result) {
                            // Add disability and disabled classes to data cells
                            $(`#${uniqid} td`).each(function(index) {
                                const totalColumns = $(`#${uniqid} td`).length;
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
     * Delete provider using REST API
     * 
     * @param {string} providerId - Provider ID to delete
     */
    deleteProvider(providerId) {
        ProvidersAPI.deleteRecord(providerId, (response) => {
            if (response.result) {
                // Reload table data
                this.dataTableInstance.dataTable.ajax.reload();
            } else {
                UserMessage.showMultiString(response.messages);
            }
        });
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