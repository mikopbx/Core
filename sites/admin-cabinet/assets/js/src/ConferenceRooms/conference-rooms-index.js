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

/* global globalRootUrl, ConferenceRoomsAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization, PbxDataTableIndex, SecurityUtils */

/**
 * Conference rooms table management module using unified base class
 */
const conferenceRoomsIndex = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,

    /**
     * Initialize the module
     */
    initialize() {
        // Create instance of base class with Conference Rooms specific configuration
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'conference-rooms-table',
            apiModule: ConferenceRoomsAPI,
            routePrefix: 'conference-rooms',
            showSuccessMessages: true,
            actionButtons: ['edit', 'delete'], // No copy for Conference Rooms
            translations: {
                deleteSuccess: globalTranslate.cr_ConferenceRoomDeleted,
                deleteError: globalTranslate.cr_ImpossibleToDeleteConferenceRoom
            },
            columns: [
                {
                    data: 'name',
                    render: function(data) {
                        // SECURITY: Properly escape room name to prevent XSS
                        const safeName = window.SecurityUtils.escapeHtml(data);
                        return `<strong>${safeName}</strong>`;
                    }
                },
                {
                    data: 'extension',
                    className: 'center aligned',
                    render: function(data) {
                        // SECURITY: Properly escape extension to prevent XSS
                        return window.SecurityUtils.escapeHtml(data) || '—';
                    }
                },
                {
                    data: 'pinCode',
                    className: 'center aligned hide-on-mobile',
                    responsivePriority: 2,
                    render: function(data) {
                        // SECURITY: Properly escape PIN code to prevent XSS
                        return window.SecurityUtils.escapeHtml(data) || '—';
                    }
                }
            ]
        });
        
        // Initialize the base class
        this.dataTableInstance.initialize();
    }
};

/**
 * Initialize Conference Rooms table on document ready
 */
$(document).ready(() => {
    conferenceRoomsIndex.initialize();
});