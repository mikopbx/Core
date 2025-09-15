/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/* global globalRootUrl, globalTranslate, OutboundRoutesAPI, PbxDataTableIndex, UserMessage, SecurityUtils */

/**
 * Object for managing outbound routes table
 * @module outboundRoutes
 */
const outboundRoutes = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,
    
    /**
     * Initialize the object
     */
    initialize() {
        // Initialize the outbound routes table with REST API
        this.initializeDataTable();
        
        // Handle empty table state
        this.checkEmptyTableState();
    },
    
    /**
     * Initialize DataTable using base class
     */
    initializeDataTable() {
        // Use OutboundRoutesAPI directly
        const apiWrapper = OutboundRoutesAPI;
        
        // Create instance of base class with Outbound Routes specific configuration
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'outbound-routes-table',
            apiModule: apiWrapper,
            routePrefix: 'outbound-routes',
            showSuccessMessages: false,
            actionButtons: ['edit', 'copy', 'delete'],
            translations: {
                deleteError: globalTranslate.or_ImpossibleToDeleteOutboundRoute
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
                    // Rule name column
                    data: 'rulename',
                    className: '',
                    render: function(data, type, row) {
                        const disabledClass = row.disabled ? 'disabled' : '';
                        return `<div class="${disabledClass}">${SecurityUtils.escapeHtml(data)}</div>`;
                    }
                },
                {
                    // Rule description column with provider info
                    data: null,
                    className: '',
                    render: function(data, type, row) {
                        const disabledClass = row.disabled ? 'disabled' : '';
                        // Rule description already includes provider info from backend
                        const description = row.ruleDescription || '';
                        return `<div class="${disabledClass}">${description}</div>`;
                    }
                },
                {
                    // Note column
                    data: 'note',
                    className: 'hide-on-mobile',
                    render: null // Will be set after instance creation
                }
            ],
            onDrawCallback: this.cbDrawComplete.bind(this)
        });
        
        // Set the note column renderer using the instance method
        this.dataTableInstance.columns[3].render = this.dataTableInstance.createDescriptionRenderer();
        
        // Initialize the base class
        this.dataTableInstance.initialize();
    },
    
    /**
     * Check if table is empty and show welcome message
     */
    checkEmptyTableState() {
        // This will be handled by onDataLoaded callback
    },
    
    /**
     * Callback when data is loaded
     * @param {Object} response - The API response
     */
    onDataLoaded(response) {
        // Extract data from response
        const data = response.data || [];
        
        if (!data || data.length === 0) {
            this.showEmptyTableMessage();
        } else {
            this.showTableWithData();
        }
    },
    
    /**
     * Show empty table message
     */
    showEmptyTableMessage() {
        // Hide table container and add button
        $('#routes-table-container').hide();
        $('#add-new-button').hide();
        
        // Show empty placeholder
        $('#empty-table-placeholder').show();
    },
    
    /**
     * Show table with data
     */
    showTableWithData() {
        // Hide empty placeholder
        $('#empty-table-placeholder').hide();
        
        // Show table container and add button
        $('#routes-table-container').show();
        $('#add-new-button').show();
    },
    
    /**
     * Callback after table draw is complete
     */
    cbDrawComplete() {
        // Initialize drag-and-drop on the table
        $('#outbound-routes-table tbody').tableDnD({
            onDrop: this.cbOnDrop.bind(this),
            onDragClass: 'hoveringRow',
            dragHandle: '.dragHandle'
        });
        
        // Add row data attributes for priority tracking
        $('#outbound-routes-table tbody tr').each(function() {
            const data = $('#outbound-routes-table').DataTable().row(this).data();
            if (data) {
                $(this).attr('id', data.id);
                $(this).attr('data-value', data.priority);
                $(this).addClass('rule-row');
            }
        });
    },
    
    /**
     * Callback function triggered when an outbound route is dropped in the list
     */
    cbOnDrop() {
        let priorityWasChanged = false;
        const priorityData = {};
        
        $('#outbound-routes-table tbody tr').each((index, obj) => {
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
            OutboundRoutesAPI.changePriority(priorityData, (response) => {
                if (response.result) {
                    // Reload table to reflect new priorities
                    this.dataTableInstance.dataTable.ajax.reload();
                } else {
                    UserMessage.showMultiString(response.messages);
                }
            });
        }
    }
};

// Initialize on document ready
$(document).ready(() => {
    outboundRoutes.initialize();
});