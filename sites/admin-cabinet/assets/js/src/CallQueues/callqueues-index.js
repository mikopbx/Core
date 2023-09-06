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
 * callQueuesTable module.
 *
 *  Define an object for managing call queue tables
 * @module callQueuesTable
 */
const callQueuesTable = {
    $queuesTable: $('#queues-table'),

    /**
     * Initialize the call queue table handlers and DataTable.
     */
    initialize() {

        // Add a double-click handler to each cell in the queue row.
        // This will redirect the user to the modify page for the clicked call queue.
        $('.queue-row td').on('dblclick', (e) => {
            const id = $(e.target).closest('tr').attr('id');
            window.location = `${globalRootUrl}call-queues/modify/${id}`;
        });

        // Initialize the data table for the call queues table.
        callQueuesTable.initializeDataTable();
    },
    /**
     * Initialize the DataTable for the call queues table.
     * This adds additional functionality like sorting and pagination.
     */
    initializeDataTable() {

        // Initialize DataTable on $queuesTable element with custom settings
        callQueuesTable.$queuesTable.DataTable({
            lengthChange: false,  // Disable user to change records per page
            paging: false, // Disable pagination

            // Define the characteristics of each column in the table
            columns: [
                null,
                null,
                null,
                null,
                {
                    orderable: false,  // This column is not orderable
                    searchable: false  // This column is not searchable
                },
            ],
            order: [1, 'asc'],  // By default, order by the second column ascending
            language: SemanticLocalization.dataTableLocalisation, // Set localisation options
        });

        // Move the "add new" button to the first eight column div
        $('#add-new-button').appendTo($('div.eight.column:eq(0)'));
    },
};

// Initialize the call queue table management object when the document is ready
$(document).ready(() => {
    callQueuesTable.initialize();
});

