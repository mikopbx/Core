/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global DialplanApplicationsAPI, SecurityUtils, SemanticLocalization, globalTranslate, globalRootUrl, Extensions, PbxDataTableIndex, UserMessage */

/**
 * Dialplan applications table management module using unified base class
 */
const dialplanApplicationsTable = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,

    /**
     * Initialize the module 
     */
    initialize() {
        // Create instance of base class with Dialplan Applications specific configuration
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'dialplan-applications-table',
            apiModule: DialplanApplicationsAPI,
            routePrefix: 'dialplan-applications',
            showSuccessMessages: false, // Silent operation - no success messages
            actionButtons: ['edit', 'delete'], // No copy for Dialplan Applications
            translations: {
                deleteError: globalTranslate.da_ImpossibleToDeleteDialplanApplication
            },
            descriptionSettings: {
                maxLines: 3,
                dynamicHeight: false
            },
            columns: [
                {
                    data: null,
                    className: 'collapsing',
                    render: function(data, type, row) {
                        // Create single-line represent format with icon, name, and extension in <>
                        const icon = row.type === 'php' ? 
                            '<i class="php icon blue"></i>' : 
                            '<i class="code icon grey"></i>';
                        const name = '<strong>' + SecurityUtils.escapeHtml(row.name) + '</strong>';
                        const extension = row.extension ? ' &lt;' + SecurityUtils.escapeHtml(row.extension) + '&gt;' : '';
                        
                        return icon + ' ' + name + extension;
                    }
                }
            ],
            // Custom error handler to show joined error messages
            customDeleteHandler: null,
            onDrawCallback: null
        });
        
        // Add description column with unified renderer after instance is created
        this.dataTableInstance.columns.push({
            data: 'description',
            className: 'hide-on-mobile',
            orderable: false,
            responsivePriority: 2,
            // Use unified description renderer from base class
            render: this.dataTableInstance.createDescriptionRenderer()
        });
        
        // Override the delete callback to handle array of error messages
        const originalCallback = this.dataTableInstance.cbAfterDeleteRecord.bind(this.dataTableInstance);
        this.dataTableInstance.cbAfterDeleteRecord = function(response) {
            if (response.result !== true && response.messages && response.messages.error && Array.isArray(response.messages.error)) {
                // Join array of error messages
                response.messages.error = response.messages.error.join(', ');
            }
            originalCallback(response);
        };
        
        // Initialize the base class
        this.dataTableInstance.initialize();
    }
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    dialplanApplicationsTable.initialize();
});

