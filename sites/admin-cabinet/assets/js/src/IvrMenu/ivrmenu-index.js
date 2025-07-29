/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, IvrMenuAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization */

/**
 * IVR menu table management module
 */
const ivrMenuIndex = {
    $ivrMenuTable: $('#ivr-menu-table'),
    dataTable: {},



    /**
     * Initialize the module
     */
    initialize() {
        // Initially show placeholder until data loads
        ivrMenuIndex.toggleEmptyPlaceholder(true);
        
        ivrMenuIndex.initializeDataTable();
    },
    
    /**
     * Initialize DataTable
     */
    initializeDataTable() {
        ivrMenuIndex.dataTable = ivrMenuIndex.$ivrMenuTable.DataTable({
            ajax: {
                url: IvrMenuAPI.endpoints.getList,
                dataSrc: function(json) {
                    // Manage empty state
                    ivrMenuIndex.toggleEmptyPlaceholder(
                        !json.result || !json.data || json.data.length === 0
                    );
                    return json.result ? json.data : [];
                }
            },
            columns: [
                {
                    data: 'extension',
                    className: 'centered collapsing',
                    render: function(data) {
                        // SECURITY: Properly escape extension data to prevent XSS
                        return window.SecurityUtils.escapeHtml(data) || '—';
                    }
                },
                {
                    data: 'name',
                    className: 'collapsing',
                    render: function(data) {
                        // SECURITY: Properly escape name data to prevent XSS
                        return window.SecurityUtils.escapeHtml(data) || '—';
                    }
                },
                {
                    data: 'actions',
                    className: 'collapsing',
                    render: function(data) {
                        if (!data || data.length === 0) {
                            return '<small>—</small>';
                        }
                        // SECURITY: Escape digits and sanitize represent field allowing only safe icons
                        const actionsHtml = data.map(action => {
                            const safeDigits = window.SecurityUtils.escapeHtml(action.digits || '');
                            const safeRepresent = window.SecurityUtils.sanitizeExtensionsApiContent(action.represent || '');
                            return `${safeDigits} - ${safeRepresent}`;
                        }).join('<br>');
                        return `<small>${actionsHtml}</small>`;
                    }
                },
                {
                    data: 'timeoutExtensionRepresent',
                    className: 'hide-on-mobile collapsing',
                    render: function(data) {
                        // SECURITY: Sanitize timeout extension representation allowing only safe icons
                        if (!data) {
                            return '<small>—</small>';
                        }
                        const safeData = window.SecurityUtils.sanitizeExtensionsApiContent(data);
                        return `<small>${safeData}</small>`;
                    }
                },
                {
                    data: 'description',
                    className: 'hide-on-mobile',
                    orderable: false,
                    // No collapsing class - this column will stretch to fill remaining space
                    render: function(data) {
                        if (!data || data.trim() === '') {
                            return '—';
                        }
                        // Create popup button for description - properly escape all HTML
                        const escapedData = window.SecurityUtils.escapeHtml(data); // Safe escaping
                        return `<div class="ui basic icon button popuped" 
                                    data-content="${escapedData}" 
                                    data-position="top right" 
                                    data-variation="wide">
                                    <i class="file text icon"></i>
                                </div>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'right aligned collapsing',
                    render: function(data, type, row) {
                        return `<div class="ui tiny basic icon buttons action-buttons">
                            <a href="${globalRootUrl}ivr-menu/modify/${row.uniqid}" 
                               class="ui button edit popuped" 
                               data-content="${globalTranslate.bt_ToolTipEdit}">
                                <i class="icon edit blue"></i>
                            </a>
                            <a href="#" 
                               data-value="${row.uniqid}" 
                               class="ui button delete two-steps-delete popuped" 
                               data-content="${globalTranslate.bt_ToolTipDelete}">
                                <i class="icon trash red"></i>
                            </a>
                        </div>`;
                    }
                }
            ],
            order: [[0, 'asc']],
            lengthChange: false,
            paging: false,
            searching: true,
            info: false,
            language: SemanticLocalization.dataTableLocalisation,
            drawCallback: function() {
                // Initialize Semantic UI elements
                ivrMenuIndex.$ivrMenuTable.find('.popuped').popup();
                
                // Move Add New button to the correct DataTables grid position (like in original)
                const $addButton = $('#add-new-button');
                const $wrapper = $('#ivr-menu-table_wrapper');
                const $leftColumn = $wrapper.find('.eight.wide.column').first();
                
                if ($addButton.length && $leftColumn.length) {
                    // Move button to the left column of DataTables grid
                    $leftColumn.append($addButton);
                    $addButton.show();
                }
                
                // Double-click for editing
                ivrMenuIndex.initializeDoubleClickEdit();
            }
        });
        
        
        // Handle deletion using DeleteSomething.js
        // DeleteSomething.js automatically handles first click
        // We only listen for second click (when two-steps-delete class is removed)
        ivrMenuIndex.$ivrMenuTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const menuId = $button.attr('data-value');
            
            // Add loading indicator and disable button
            $button.addClass('loading disabled');
            
            IvrMenuAPI.deleteRecord(menuId, ivrMenuIndex.cbAfterDeleteRecord);
        });
    },
    
    /**
     * Callback after record deletion
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Reload table
            ivrMenuIndex.dataTable.ajax.reload();
            
            // Update related components
            if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
                Extensions.cbOnDataChanged();
            }
            
            UserMessage.showSuccess(globalTranslate.iv_IvrMenuDeleted);
        } else {
            UserMessage.showError(
                response.messages?.error || 
                globalTranslate.iv_ImpossibleToDeleteIvrMenu
            );
        }
        
        // Remove loading indicator and restore button to initial state
        $('a.delete').removeClass('loading disabled');
    },
    
    /**
     * Toggle empty table placeholder visibility
     */
    toggleEmptyPlaceholder(isEmpty) {
        if (isEmpty) {
            $('#ivr-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-button').show();
            $('#ivr-table-container').show();
        }
    },
    
    /**
     * Initialize double-click for editing
     * IMPORTANT: Exclude cells with ui right aligned class to avoid conflict with delete-something.js
     */
    initializeDoubleClickEdit() {
        ivrMenuIndex.$ivrMenuTable.on('dblclick', 'tbody td:not(.ui.right.aligned)', function() {
            const data = ivrMenuIndex.dataTable.row(this).data();
            if (data && data.uniqid) {
                window.location = `${globalRootUrl}ivr-menu/modify/${data.uniqid}`;
            }
        });
    },
    
    /**
     * Cleanup event handlers
     */
    destroy() {
        // Destroy DataTable if exists
        if (ivrMenuIndex.dataTable) {
            ivrMenuIndex.dataTable.destroy();
        }
    }
};

/**
 *  Initialize IVR menu table on document ready
 */
$(document).ready(() => {
    ivrMenuIndex.initialize();
});

