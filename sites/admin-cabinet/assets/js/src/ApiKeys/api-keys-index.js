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

/* global globalRootUrl, ApiKeysAPI, globalTranslate, UserMessage, SemanticLocalization, PbxDataTableIndex, SecurityUtils */

/**
 * API keys table management module using unified base class
 */
const apiKeysIndex = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,

    /**
     * Initialize the module
     */
    initialize() {
        // Create instance of base class with API Keys specific configuration
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'api-keys-table',
            apiModule: ApiKeysAPI,
            routePrefix: 'api-keys',
            showSuccessMessages: false,
            actionButtons: ['edit', 'delete'], // No copy for API Keys
            translations: {
                deleteError: globalTranslate.ak_ImpossibleToDeleteApiKey
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
                        // Use represent from model with proper sanitization for API keys
                        const representation = row.represent || '—';
                        return representation === '—' ? representation : SecurityUtils.sanitizeForDisplay(representation, false);
                    }
                },
                {
                    data: 'allowed_paths',
                    className: 'center aligned hide-on-mobile',
                    responsivePriority: 2,
                    render: function(data, type, row) {
                        const pathCount = row.allowed_paths_count || 0;
                        const hasFilter = row.has_network_filter || false;
                        
                        let badges = [];
                        
                        if (pathCount === 0) {
                            badges.push('<span class="ui small green label">' + globalTranslate.ak_FullAccess + '</span>');
                        } else {
                            badges.push('<span class="ui small blue label">' + pathCount + ' ' + globalTranslate.ak_Endpoints + '</span>');
                        }
                        
                        if (hasFilter) {
                            badges.push('<span class="ui small orange label">' + globalTranslate.ak_NetworkRestricted + '</span>');
                        }
                        
                        return badges.join(' ');
                    }
                },
                {
                    data: 'last_used_at',
                    className: 'center aligned hide-on-mobile',
                    responsivePriority: 3,
                    render: function(data) {
                        if (!data) return globalTranslate.ak_NeverUsed;
                        // Handle MySQL datetime format "YYYY-MM-DD HH:MM:SS"
                        const date = new Date(data.replace(' ', 'T'));
                        if (isNaN(date.getTime())) {
                            return data; // Return original if parsing fails
                        }
                        return date.toLocaleDateString();
                    }
                }
            ],
            // Custom callback after delete to show modal if last key was deleted
            onDeleteSuccess: function() {
                // Check if table is now empty
                const rowCount = $('#api-keys-table tbody tr').length;
                if (rowCount === 0) {
                    $('#api-keys-table-container').hide();
                    $('#add-new-button').hide();
                    $('#empty-table-placeholder').show();
                }
            }
        });
        
        // Add description column with unified renderer after instance is created
        this.dataTableInstance.columns.push({
            data: 'description',
            className: 'hide-on-mobile',
            orderable: false,
            responsivePriority: 4,
            // Use unified description renderer from base class
            render: this.dataTableInstance.createDescriptionRenderer()
        });
        
        // Initialize the base class
        this.dataTableInstance.initialize();
    }
};

/**
 * Initialize API Keys table on document ready
 */
$(document).ready(() => {
    apiKeysIndex.initialize();
});