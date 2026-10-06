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
                data: null,
                className: 'collapsing',
                render: function(data, type, row) {
                    // Create single-line represent format with icon, name, and extension in <>
                    // This allows DataTable to search by extension number in brackets
                    const icon = '<i class="sitemap icon"></i>';
                    // Cap the name width and ellipsize it: this column is 'collapsing'
                    // (white-space: nowrap), so a long menu name would otherwise stretch
                    // the table past the viewport and push the action buttons off screen.
                    // title carries the full name so it stays readable on hover.
                    const safeName = row.name ? window.SecurityUtils.escapeHtml(row.name) : '';
                    const name = safeName ?
                        '<strong class="ivr-menu-name" title="' + safeName + '">' + safeName + '</strong>' : '';
                    const extension = row.extension ? ' &lt;' + window.SecurityUtils.escapeHtml(row.extension) + '&gt;' : '';

                    return icon + ' ' + name + extension;
                }
            },
            {
                data: 'actions',
                className: 'hide-on-mobile collapsing',
                render: function(data) {
                    if (!data || data.length === 0) {
                        return '<small>—</small>';
                    }
                    // SECURITY: Properly sanitize all content
                    const actionsHtml = data.map(action => {
                        const safeDigits = window.SecurityUtils.escapeHtml(action.digits || '');
                        // Properly sanitize represent field to preserve safe HTML icons
                        const safeRepresent = window.SecurityUtils.sanitizeExtensionsApiContent(action.represent || '');
                        return `${safeDigits} - ${safeRepresent}`;
                    }).join('<br>');
                    // Bound the width and let long targets wrap: this column is 'collapsing'
                    // (white-space: nowrap), so long action targets (which embed the menu name)
                    // would otherwise stretch the table and push the action buttons off screen.
                    return `<small class="ivr-cell-wrap">${actionsHtml}</small>`;
                }
            },
            {
                data: 'timeoutExtensionRepresent',
                className: 'hide-on-mobile collapsing',
                render: function(data) {
                    // Timeout extension representation needs proper sanitization
                    if (!data) {
                        return '<small>—</small>';
                    }
                    // Properly sanitize data to preserve safe HTML icons
                    const safeData = window.SecurityUtils.sanitizeExtensionsApiContent(data);
                    // Bound the width and let it wrap: the timeout target represent embeds the
                    // menu name ("IVR menu: <name>"), so a long name would otherwise stretch this
                    // 'collapsing' (nowrap) column and push the action buttons off screen.
                    return `<small class="ivr-cell-wrap">${safeData}</small>`;
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
            actionButtons: ['edit', 'copy', 'delete'], // Include copy button
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

