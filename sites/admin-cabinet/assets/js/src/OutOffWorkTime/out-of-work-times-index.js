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

/* global globalRootUrl, globalTranslate, OutWorkTimesAPI, SecurityUtils, SemanticLocalization, PbxDataTableIndex, UserMessage */

/**
 * Object for managing the Out-of-Work Times table with REST API v2
 *
 * @module OutOfWorkTimesTable
 */
const OutOfWorkTimesTable = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,

    /**
     * Initialize the object
     */
    initialize() {
        // Initialize the data table with REST API
        this.initializeDataTable();
        
        // Handle empty table state
        this.checkEmptyTableState();
    },
    
    /**
     * Initialize DataTable using base class
     */
    initializeDataTable() {
        // Create instance of base class with Out-of-Work Times specific configuration
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'time-frames-table',
            apiModule: OutWorkTimesAPI,
            routePrefix: 'out-off-work-time',
            showSuccessMessages: false,
            actionButtons: ['edit', 'copy', 'delete'],
            translations: {
                deleteError: globalTranslate.tf_ImpossibleToDeleteTimeFrame
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
                    // Date Period column (matches original structure)
                    data: null,
                    className: 'collapsing',
                    render: function(data, type, row) {
                        // For search and type, return empty string since we use custom search
                        if (type === 'search' || type === 'type') {
                            return '';
                        }
                        
                        const periods = row.calendarPeriods || [];
                        if (periods.length === 0 && row.calType) {
                            // Handle external calendar types
                            return '<div class="ui bulleted list"><div class="item"><i class="icon outline calendar alternate"></i>' + 
                                   SecurityUtils.escapeHtml(row.calType) + '</div></div>';
                        }
                        
                        let html = '<div class="ui bulleted list">';
                        periods.forEach(function(period) {
                            html += '<div class="item"><i class="icon ' + period.icon + '"></i>' + 
                                   SecurityUtils.escapeHtml(period.text) + '</div>';
                        });
                        html += '</div>';
                        
                        return html;
                    }
                },
                {
                    // Allow Restriction column (filter icon)
                    data: null,
                    className: 'collapsing',
                    render: function(data, type, row) {
                        // For search and type, return empty string since we use custom search
                        if (type === 'search' || type === 'type') {
                            return '';
                        }
                        
                        if (row.allowRestriction) {
                            return '<div class="ui basic icon button" data-variation="wide" ' +
                                   'data-content="' + globalTranslate.tf_AllowRestriction + '" data-position="top right">' +
                                   '<i class="filter icon"></i></div>';
                        }
                        
                        return '';
                    }
                },
                {
                    // Notes/Description column
                    data: null,
                    className: 'hide-on-mobile',
                    render: function(data, type, row) {
                        // For search and type, return empty string since we use custom search
                        if (type === 'search' || type === 'type') {
                            return '';
                        }
                        
                        if (row.description) {
                            return '<div class="ui basic icon button" data-variation="wide" ' +
                                   'data-content="' + SecurityUtils.escapeHtml(row.description) + '" data-position="top right">' +
                                   '<i class="file text icon"></i>' + SecurityUtils.escapeHtml(row.shot_description) + '</div>';
                        }
                        
                        return '';
                    }
                },
                {
                    // Action column (right aligned)
                    data: null,
                    className: 'right aligned',
                    render: function(data, type, row) {
                        // For search and type, return empty string since we use custom search
                        if (type === 'search' || type === 'type') {
                            return '';
                        }
                        
                        if (row.actionDisplay) {
                            // actionDisplay contains pre-sanitized HTML with icons from backend
                            return row.actionDisplay;
                        }
                        
                        return '';
                    }
                }
            ],
            onDrawCallback: this.cbDrawComplete.bind(this)
        });
        
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
            if (settings.nTable.id !== 'time-frames-table') {
                return true;
            }
            
            const searchTerm = $('#time-frames-table_filter input').val().toLowerCase();
            
            // If no search term, show all rows
            if (!searchTerm) {
                return true;
            }
            
            // Build searchable text from all available data
            const searchableText = [
                rowData.name || '',
                rowData.description || '',
                rowData.shot_description || '',
                rowData.calType || '',
                rowData.actionDisplay || '',
                rowData.date_from || '',
                rowData.date_to || '',
                rowData.weekday_from || '',
                rowData.weekday_to || '',
                rowData.time_from || '',
                rowData.time_to || '',
                rowData.audio_message_id || '',
                rowData.extension || ''
            ].filter(Boolean).join(' ').toLowerCase();
            
            return searchableText.includes(searchTerm);
        });
    },
    
    /**
     * Callback after data is loaded
     * @param {Object} response - The API response
     */
    onDataLoaded(response) {
        // Extract data from response
        const data = response.data || [];
        // Check if there are any time frames
        const hasTimeFrames = data.length > 0;
        
        if (hasTimeFrames) {
            // Show table and button
            $('#time-frames-table-container').show();
            $('#add-new-button').show();
            $('#empty-table-placeholder').hide();
        } else {
            // Show empty placeholder
            $('#time-frames-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        }
    },
    
    /**
     * Callback after table draw is complete
     */
    cbDrawComplete() {
        // Initialize drag-and-drop on the table
        $('#time-frames-table tbody').tableDnD({
            onDrop: this.cbOnDrop.bind(this),
            onDragClass: 'hoveringRow',
            dragHandle: '.dragHandle'
        });
        
        // Add row data attributes for priority tracking
        $('#time-frames-table tbody tr').each(function() {
            const data = $('#time-frames-table').DataTable().row(this).data();
            if (data) {
                $(this).attr('id', data.id);
                $(this).attr('data-value', data.priority);
                $(this).addClass('frame-row');
            }
        });
    },
    
    /**
     * Callback to execute after dropping an element
     */
    cbOnDrop() {
        let priorityWasChanged = false;
        const priorityData = {};
        
        $('#time-frames-table tbody tr').each((index, obj) => {
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
            OutWorkTimesAPI.changePriority(priorityData, (response) => {
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
    }
};

// Initialize when DOM is ready
$(document).ready(() => {
    OutOfWorkTimesTable.initialize();
});