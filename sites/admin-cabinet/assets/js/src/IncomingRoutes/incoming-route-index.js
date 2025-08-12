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

/* global globalRootUrl, globalTranslate, IncomingRoutesAPI, SecurityUtils, SemanticLocalization, PbxDataTableIndex, UserMessage, incomingRouteDefault */

/**
 * Object for managing incoming routes table
 *
 * @module incomingRoutes
 */
const incomingRoutes = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,

    /**
     * Initialize the object
     */
    initialize() {
        // Initialize the default route form using dedicated module
        incomingRouteDefault.initialize();

        // Initialize the incoming routes table with REST API
        this.initializeDataTable();
        
        // Handle empty table state
        this.checkEmptyTableState();
    },
    
    /**
     * Initialize DataTable using base class
     */
    initializeDataTable() {
        // Create instance of base class with Incoming Routes specific configuration
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'incoming-routes-table',
            apiModule: IncomingRoutesAPI,
            routePrefix: 'incoming-routes',
            showSuccessMessages: false,
            actionButtons: ['edit', 'copy', 'delete'],
            translations: {
                deleteError: globalTranslate.ir_ImpossibleToDeleteIncomingRoute
            },
            orderable: false, // Disable sorting globally
            order: [], // No default order
            onDataLoaded: this.onDataLoaded.bind(this),
            columns: [
                {
                    // Drag handle column
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'collapsing dragHandle',
                    render: function() {
                        return '<i class="sort grey icon"></i>';
                    }
                },
                {
                    // Details column - main column with rule description
                    data: null,
                    className: '',
                    render: function(data, type, row) {
                        // For search and type, return empty string since we use custom search
                        if (type === 'search' || type === 'type') {
                            return '';
                        }
                        
                        // Use ready-to-use HTML representation from REST API
                        const description = row.ruleRepresent || '';
                        const disabledClass = row.disabled ? 'disabled' : '';
                        return '<div class="' + disabledClass + '">' + description + '</div>';
                    }
                },
                {
                    // Note column - use standard description renderer from PbxDataTableIndex
                    data: 'note',
                    className: 'hide-on-mobile',
                    render: null // Will be set after instance creation
                }
            ],
            onDrawCallback: this.cbDrawComplete.bind(this)
        });
        
        // Set the note column renderer using the instance method
        this.dataTableInstance.columns[2].render = this.dataTableInstance.createDescriptionRenderer();
        
        // Initialize the base class
        this.dataTableInstance.initialize();
        
        // Add custom search functionality after DataTable initialization
        this.initializeCustomSearch();
    },
    
    /**
     * Initialize custom search functionality that works with HTML content
     */
    initializeCustomSearch() {
        // Helper function to extract plain text from HTML
        function extractTextFromHtml(htmlString) {
            if (!htmlString) return '';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            return tempDiv.textContent || tempDiv.innerText || '';
        }
        
        // Add custom search function to DataTables
        $.fn.dataTable.ext.search.push((settings, data, dataIndex, rowData, counter) => {
            // Only apply to our specific table
            if (settings.nTable.id !== 'incoming-routes-table') {
                return true;
            }
            
            const searchTerm = $('#incoming-routes-table_filter input').val().toLowerCase();
            
            // If no search term, show all rows
            if (!searchTerm) {
                return true;
            }
            
            // Build searchable text from all available data
            const searchableText = [
                rowData.number || '', 
                rowData.note || '',
                rowData.extension || '',
                extractTextFromHtml(rowData.extensionRepresent || ''),
                extractTextFromHtml(rowData.providerRepresent || ''),
                extractTextFromHtml(rowData.ruleRepresent || '')
            ].filter(Boolean).join(' ').toLowerCase();
            
            return searchableText.includes(searchTerm);
        });
    },
    
    /**
     * Callback after table draw is complete
     */
    cbDrawComplete() {
        // Initialize drag-and-drop on the table
        $('#incoming-routes-table tbody').tableDnD({
            onDrop: this.cbOnDrop.bind(this),
            onDragClass: 'hoveringRow',
            dragHandle: '.dragHandle'
        });
        
        // Add row data attributes for priority tracking
        $('#incoming-routes-table tbody tr').each(function() {
            const data = $('#incoming-routes-table').DataTable().row(this).data();
            if (data) {
                $(this).attr('id', data.id);
                $(this).attr('data-value', data.priority);
                $(this).addClass('rule-row');
            }
        });
    },

    /**
     * Callback to execute after dropping an element
     */
    cbOnDrop() {
        let priorityWasChanged = false;
        const priorityData = {};
        
        $('#incoming-routes-table tbody tr').each((index, obj) => {
            const ruleId = $(obj).attr('id');
            const oldPriority = parseInt($(obj).attr('data-value'), 10);
            const newPriority = index + 1; // Start from 1, not 0
            
            if (oldPriority !== newPriority) {
                priorityWasChanged = true;
                priorityData[ruleId] = newPriority;
            }
        });
        
        if (priorityWasChanged) {
            // Use REST API to update priorities
            IncomingRoutesAPI.changePriority(priorityData, (response) => {
                if (response.result) {
                    // Reload table to reflect new priorities
                    this.dataTableInstance.dataTable.ajax.reload();
                } else {
                    UserMessage.showMultiString(response.messages);
                }
            });
        }
    },
    
    /**
     * Check if table is empty and show/hide appropriate elements
     */
    checkEmptyTableState() {
        // This will be called after data loads
    },
    
    /**
     * Callback when data is loaded
     * @param {Object} response - The API response
     */
    onDataLoaded(response) {
        // Extract data from response
        const data = response.data || [];
        // Check if there are any rules (default rule is not in the table)
        const hasRules = data.length > 0;
        
        if (hasRules) {
            // Show table and button
            $('#routes-table-container').show();
            $('#add-new-button').show();
            $('#empty-table-placeholder').hide();
        } else {
            // Show empty placeholder
            $('#routes-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        }
    }
};

/**
 *  Initialize incoming routes on document ready
 */
$(document).ready(() => {
    incomingRoutes.initialize();
});