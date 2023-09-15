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

/* global globalRootUrl, SemanticLocalization, UserMessage,  */

/**
 * Define object which manage IVR (Interactive Voice Menu) list
 *
 * @module ivrMenuIndex
 */
const ivrMenuIndex = {
    $ivrTable: $('#ivr-menu-table'),
    initialize() {

        // Add double click listener to table cells
        $('.menu-row td').on('dblclick', (e) => {
            // When cell is double clicked, navigate to corresponding modify page
            const id = $(e.target).closest('tr').attr('id');
            window.location = `${globalRootUrl}ivr-menu/modify/${id}`;
        });

        // Initialize the data table
        ivrMenuIndex.initializeDataTable();

        // Set up delete functionality on delete button click.
        $('body').on('click', 'a.delete', (e) => {
            e.preventDefault();
            $(e.target).addClass('disabled');
            // Get the ivr menu  ID from the closest table row.
            const rowId = $(e.target).closest('tr').attr('id');

            // Remove any previous AJAX messages.
            $('.message.ajax').remove();

            // Call the PbxApi method to delete the IVR menu record.
            IVRMenuAPI.deleteRecord(rowId, ivrMenuIndex.cbAfterDeleteRecord);
        });
    },

    /**
     * Initialize data tables on table
     */
    initializeDataTable() {
        ivrMenuIndex.$ivrTable.DataTable({
            lengthChange: false, // Disable ability to change number of entries shown
            paging: false, // Disable pagination
            columns: [
                null,
                null,
                null,
                null,
                null,
                {orderable: false, searchable: false},
            ],
            order: [1, 'asc'],
            language: SemanticLocalization.dataTableLocalisation,
        });

        // Move the "Add New" button to the first eight-column div
        $('#add-new-button').appendTo($('div.eight.column:eq(0)'));
    },

    /**
     * Callback function executed after deleting a record.
     * @param {Object} response - The response object from the API.
     */
    cbAfterDeleteRecord(response){
        if (response.result === true) {
            // Remove the deleted record's table row.
            ivrMenuIndex.$ivrTable.find(`tr[id=${response.data.id}]`).remove();
            // Call the callback function for data change.
            Extensions.cbOnDataChanged();
        } else {
            // Show an error message if deletion was not successful.
            UserMessage.showError(response.messages.error, globalTranslate.iv_ImpossibleToDeleteIVRMenu);
        }
        $('a.delete').removeClass('disabled');
    },
};

/**
 *  Initialize IVR menu table on document ready
 */
$(document).ready(() => {
    ivrMenuIndex.initialize();
});

