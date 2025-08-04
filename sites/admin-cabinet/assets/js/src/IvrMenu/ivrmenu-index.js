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

/* global globalRootUrl, IvrMenuAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization, PbxDataTableIndex */

/**
 * IVR menu table management module using unified base class
 */
const ivrMenuIndex = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,

    /**
     * Initialize the module
     */
    initialize() {
        // Create temporary instance to get description renderer
        const tempInstance = new PbxDataTableIndex({
            tableId: 'temp',
            apiModule: IvrMenuAPI,
            routePrefix: 'ivr-menu',
            columns: []
        });
        
        // Create configuration with all columns including description
        const columns = [
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
                // Use the description renderer from temp instance
                render: tempInstance.createDescriptionRenderer()
            }
        ];
        
        // Create real instance of base class with IVR Menu specific configuration
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'ivr-menu-table',
            apiModule: IvrMenuAPI,
            routePrefix: 'ivr-menu',
            showSuccessMessages: true,
            actionButtons: ['edit', 'delete'], // No copy for IVR Menu
            translations: {
                deleteSuccess: globalTranslate.iv_IvrMenuDeleted,
                deleteError: globalTranslate.iv_ImpossibleToDeleteIvrMenu
            },
            descriptionSettings: {
                maxLines: 3,
                dynamicHeight: false
            },
            columns: columns
        });
        
        // Initialize the base class
        this.dataTableInstance.initialize();
    }
};

/**
 *  Initialize IVR menu table on document ready
 */
$(document).ready(() => {
    ivrMenuIndex.initialize();
});

