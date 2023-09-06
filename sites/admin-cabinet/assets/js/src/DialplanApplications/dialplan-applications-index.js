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

/* global globalRootUrl, SemanticLocalization */

/**
 * The DialplanApplicationsTable object.
 * Manages the operations and behaviors of the Dialplan applications table in the UI.
 *
 * @module DialplanApplicationsTable
 */
const DialplanApplicationsTable = {

    /**
     * Initializes the Dialplan Applications Table.
     * Sets up the data table, moves the "Add New" button, and adds a double click event handler to table rows.
     */
    initialize() {
        $('#custom-applications-table').DataTable({
            lengthChange: false,
            paging: false,
            columns: [
                null,
                null,
                {orderable: false, searchable: false},
                {orderable: false, searchable: false},
            ],
            order: [0, 'asc'],
            language: SemanticLocalization.dataTableLocalisation,
        });

        // Move the "Add New" button to the first eight-column div
        $('#add-new-button').appendTo($('div.eight.column:eq(0)'));

        // Attach double click event handler to table rows
        $('.app-row td').on('dblclick', (e) => {
            // On double click, navigate to the modification page of the clicked application
            const id = $(e.target).closest('tr').attr('id');
            window.location = `${globalRootUrl}dialplan-applications/modify/${id}`;
        });
    },

};

// Initialize the Dialplan Applications table when the document is ready
$(document).ready(() => {
    DialplanApplicationsTable.initialize();
});

