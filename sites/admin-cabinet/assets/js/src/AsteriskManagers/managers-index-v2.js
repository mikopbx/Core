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

/* global globalRootUrl, globalTranslate, AsteriskManagersAPI, UserMessage */

/**
 * Managers Table module using REST API v2.
 * @module managersTable
 */
const managersTable = {
    /**
     * jQuery object for the managers table.
     * @type {jQuery}
     */
    $managersTable: $('#managers-table'),

    /**
     * DataTable object.
     * @type {Object}
     */
    dataTable: null,

    /**
     * Initializes the managers table.
     */
    initialize() {
        // Initialize API
        AsteriskManagersAPI.initialize();

        // Initialize DataTable
        this.initializeDataTable();

        // Load managers data
        this.loadManagers();

        // Setup event handlers
        this.setupEventHandlers();
    },

    /**
     * Initialize DataTable with configuration.
     */
    initializeDataTable() {
        this.dataTable = this.$managersTable.DataTable({
            lengthChange: false,
            paging: false,
            columns: [
                { data: 'username' },
                { data: 'description' },
                { data: 'networkFilterRepresent' },
                { data: 'readPermissionsSummary' },
                { data: 'writePermissionsSummary' },
                { data: null }
            ],
            order: [[0, 'asc']],
            language: SemanticLocalization.dataTableLocalisation,
            columnDefs: [
                {
                    targets: 0,
                    render: function(data, type, row) {
                        if (row.isSystem) {
                            return `<i class="lock icon"></i> ${data}`;
                        }
                        return data;
                    }
                },
                {
                    targets: 2,
                    render: function(data, type, row) {
                        if (data) {
                            return `<i class="shield alternate icon"></i> ${data}`;
                        }
                        return row.permit || '';
                    }
                },
                {
                    targets: 5,
                    orderable: false,
                    searchable: false,
                    render: function(data, type, row) {
                        let buttons = '';
                        
                        if (!row.isSystem) {
                            buttons = `
                                <div class="ui buttons">
                                    <a href="${globalRootUrl}asterisk-managers/modify/${row.id}" 
                                       class="ui small button">
                                        <i class="edit icon"></i>
                                    </a>
                                    <button class="ui small red button delete-manager" 
                                            data-id="${row.id}"
                                            data-name="${row.username}">
                                        <i class="trash icon"></i>
                                    </button>
                                </div>
                            `;
                        } else {
                            buttons = `
                                <a href="${globalRootUrl}asterisk-managers/modify/${row.id}" 
                                   class="ui small button">
                                    <i class="eye icon"></i> ${globalTranslate.bt_View}
                                </a>
                            `;
                        }
                        
                        return buttons;
                    }
                }
            ]
        });
    },

    /**
     * Load managers data from API.
     */
    loadManagers() {
        this.$managersTable.addClass('loading');
        
        AsteriskManagersAPI.getList((managers) => {
            this.$managersTable.removeClass('loading');
            
            if (managers === false) {
                UserMessage.showMultiString(globalTranslate.am_ErrorLoadingManagers);
                return;
            }

            // Clear and add data to table
            this.dataTable.clear();
            this.dataTable.rows.add(managers);
            this.dataTable.draw();
        }, false); // Don't use cache for initial load
    },

    /**
     * Setup event handlers.
     */
    setupEventHandlers() {
        // Double click to edit
        this.$managersTable.on('dblclick', 'tbody tr', (e) => {
            const data = this.dataTable.row(e.currentTarget).data();
            if (data) {
                window.location = `${globalRootUrl}asterisk-managers/modify/${data.id}`;
            }
        });

        // Delete button handler
        this.$managersTable.on('click', '.delete-manager', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const $button = $(e.currentTarget);
            const id = $button.data('id');
            const name = $button.data('name');
            
            this.deleteManager(id, name);
        });

        // Add new manager button
        $('#add-new-manager').on('click', () => {
            window.location = `${globalRootUrl}asterisk-managers/modify`;
        });
    },

    /**
     * Delete a manager.
     * 
     * @param {string} id - Manager ID to delete.
     * @param {string} name - Manager name for confirmation.
     */
    deleteManager(id, name) {
        const confirmMessage = globalTranslate.am_ConfirmDeleteManager
            .replace('{0}', name);

        if (!confirm(confirmMessage)) {
            return;
        }

        // Show loading state
        this.$managersTable.addClass('loading');

        AsteriskManagersAPI.deleteRecord(id, (response) => {
            this.$managersTable.removeClass('loading');

            if (response && response.success) {
                // Remove row from table
                const row = this.dataTable
                    .rows()
                    .indexes()
                    .filter((value, index) => {
                        return this.dataTable.row(index).data().id === id;
                    });
                
                if (row.length > 0) {
                    this.dataTable.row(row[0]).remove().draw();
                }

                UserMessage.showMultiString(globalTranslate.am_ManagerDeleted);
            } else {
                const errorMessage = response?.messages?.error?.[0] || 
                                   globalTranslate.am_ErrorDeletingManager;
                UserMessage.showMultiString(errorMessage, UserMessage.ERROR);
            }
        });
    }
};

/**
 * Initialize Asterisk Managers table on document ready.
 */
$(document).ready(() => {
    managersTable.initialize();
});