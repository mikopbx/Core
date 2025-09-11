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

/* global globalRootUrl, AsteriskRestUsersAPI, globalTranslate, UserMessage, PbxDataTableIndex, SecurityUtils */

/**
 * Asterisk REST users table management module using unified base class
 */
const asteriskRestUsersIndex = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,

    /**
     * Initialize the module
     */
    initialize() {
        // Create instance of base class with AsteriskRestUsers specific configuration
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'asterisk-rest-users-table',
            apiModule: AsteriskRestUsersAPI,
            routePrefix: 'asterisk-rest-users',
            showSuccessMessages: true,
            actionButtons: ['edit', 'delete'], // No copy for REST users
            translations: {
                deleteSuccess: globalTranslate.ari_DeleteSuccess,
                deleteError: globalTranslate.ari_DeleteError
            },
            columns: [
                {
                    data: null,
                    className: 'collapsing',
                    render: function(data, type, row) {
                        // Create single-line represent format with icon, username, and description
                        const icon = '<i class="code branch icon"></i>';
                        const username = row.username ? '<strong>' + window.SecurityUtils.escapeHtml(row.username) + '</strong>' : '';
                        const description = row.description ? ' - ' + window.SecurityUtils.escapeHtml(row.description) : '';
                        
                        // Add system label for pbxcore user
                        let systemLabel = '';
                        if (row.username === 'pbxcore') {
                            systemLabel = ' <span class="ui yellow mini label">' + (globalTranslate.ari_SystemUser || 'SYSTEM') + '</span>';
                        }
                        
                        return icon + ' ' + username + description + systemLabel;
                    }
                },
                {
                    data: 'applicationsSummary',
                    className: 'center aligned hide-on-mobile',
                    responsivePriority: 2,
                    render: function(data) {
                        if (!data) {
                            return '—';
                        }
                        if (data === 'all') {
                            return '<span class="ui blue mini label">ALL</span>';
                        }
                        // Split apps and create labels
                        const apps = data.split(', ');
                        let html = '';
                        apps.forEach(app => {
                            html += '<span class="ui teal mini label">' + window.SecurityUtils.escapeHtml(app) + '</span> ';
                        });
                        return html;
                    }
                }
            ],
            // Custom delete handler to prevent deletion of system user
            customDeleteHandler: function(id, callback) {
                // Get the row data to check username
                const rowData = this.dataTableInstance.dataTable
                    .rows()
                    .data()
                    .toArray()
                    .find(row => row.id === id);
                    
                if (rowData && rowData.username === 'pbxcore') {
                    UserMessage.showError(globalTranslate.ari_CannotDeleteSystemUser || 'Cannot delete system user');
                    callback(false);
                    return;
                }
                
                // Use default delete handler
                AsteriskRestUsersAPI.deleteRecord(id, callback);
            }.bind(this)
        });
        
        // Initialize the base class
        this.dataTableInstance.initialize();
    }
};

/**
 * Initialize AsteriskRestUsers table on document ready
 */
$(document).ready(() => {
    asteriskRestUsersIndex.initialize();
});