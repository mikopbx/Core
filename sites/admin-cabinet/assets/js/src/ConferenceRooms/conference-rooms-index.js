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
/* global globalRootUrl, ConferenceRoomsAPI, Extensions, globalTranslate, UserMessage */

/**
 * Module handling interactions with the conference room table.
 * @module conferenceTable
 */
const conferenceTable = {

    $conferencesTable: $('#conference-rooms-table'),

    /**
     * Initializes module functionality.
     * Specifically, it adds a double click event handler to the rows of the conference table.
     */
    initialize() {

        // Attach double-click event handler to each cell in the conference room table
        // The handler redirects to a URL specific to the conference room for editing
        $('.record-row td').on('dblclick', (e) => {
            const id = $(e.target).closest('tr').attr('id');
            window.location = `${globalRootUrl}conference-rooms/modify/${id}`;
        });

        // Set up delete functionality on delete button click.
        $('body').on('click', 'a.delete', (e) => {
            e.preventDefault();
            $(e.target).addClass('disabled');
            // Get the conference room  ID from the closest table row.
            const rowId = $(e.target).closest('tr').attr('id');

            // Remove any previous AJAX messages.
            $('.message.ajax').remove();

            // Call the PbxApi method to delete the conference room record.
            ConferenceRoomsAPI.deleteRecord(rowId, conferenceTable.cbAfterDeleteRecord);
        });
    },

    /**
     * Callback function executed after deleting a record.
     * @param {Object} response - The response object from the API.
     */
    cbAfterDeleteRecord(response){
        if (response.result === true) {
            // Remove the deleted record's table row.
            conferenceTable.$conferencesTable.find(`tr[id=${response.data.id}]`).remove();
            // Call the callback function for data change.
            Extensions.cbOnDataChanged();
        } else {
            // Show an error message if deletion was not successful.
            UserMessage.showError(response.messages.error, globalTranslate.cr_ImpossibleToDeleteConferenceRoom);
        }
        $('a.delete').removeClass('disabled');
    },
};

/**
 *  Initialize conference rooms table on document ready
 */
$(document).ready(() => {
    conferenceTable.initialize();
});

