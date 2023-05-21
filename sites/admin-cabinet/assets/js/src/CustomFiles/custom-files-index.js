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
 * Module for handling interactions with the custom files table.
 * @module FilesTable
 */
const FilesTable = {

    /**
     * Initializes the custom files table, applying DataTable features and setting up event handlers.
     */
    initialize() {

        // Initialize the DataTable with custom settings.
        // Features include disabling length change and paging, setting column properties,
        // setting the default order, and applying language localization.
        $('#custom-files-table').DataTable({
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

        // Attach a double-click event handler to each cell in the file row.
        // The handler redirects to a URL specific to the custom file for modification.
        $('.file-row td').on('dblclick', (e) => {
            const id = $(e.target).closest('tr').attr('id');
            window.location = `${globalRootUrl}custom-files/modify/${id}`;
        });
    },

};

// Initialize the custom files table when the document is ready.
$(document).ready(() => {
    FilesTable.initialize();
});

