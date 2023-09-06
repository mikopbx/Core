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

/* global globalRootUrl,$ */

/**
 * Object for managing the Out-of-Work Times table.
 *
 * @module OutOfWorkTimesTable
 */
const OutOfWorkTimesTable = {

    /**
     * Initializes the Out-of-Work Times table.
     */
    initialize() {

        // Bind double-click event to table cells
        $('.frame-row td').on('dblclick', (e) => {
            const id = $(e.target).closest('tr').attr('id');
            window.location = `${globalRootUrl}out-off-work-time/modify/${id}`;
        });

        // Initialize DataTable
        $('#time-frames-table').DataTable({
            lengthChange: false,
            paging: false,
            columns: [
                null,
                {orderable: false},
                null,
                null,
                {orderable: false},
            ],
            autoWidth: false,
            order: [1, 'asc'],
            language: SemanticLocalization.dataTableLocalisation,
            "drawCallback": function (settings) {
                $("[data-content!=''][data-content]").popup();
            }
        });

        // Move the "Add New" button to the first eight-column div
        $('#add-new-button').appendTo($('div.eight.column:eq(0)'));

        $('body').on('click', 'a.delete', (e) => {
            e.preventDefault();
            const id = $(e.target).closest('tr').attr('id');
            OutOfWorkTimesTable.deleteRule(id);
        });
    },
    /**
     * Deletes an extension with the given ID.
     * @param {string} id - The ID of the rule to delete.
     */
    deleteRule(id) {
        $('.message.ajax').remove();
        $.api({
            url: `${globalRootUrl}out-off-work-time/delete/${id}`,
            on: 'now',
            successTest(response) {
                // test whether a JSON response is valid
                return response !== undefined
                    && Object.keys(response).length > 0;
            },
            onSuccess(response) {
                if (response.success === true) {
                    $('#time-frames-table').find(`tr[id=${id}]`).remove();
                } else {
                    UserMessage.showError(response.message.error, globalTranslate.ex_ImpossibleToDeleteExtension);
                }
            },
        });
    },
};

/**
 *  Initialize out of work table on document ready
 */
$(document).ready(() => {
    OutOfWorkTimesTable.initialize();
});

