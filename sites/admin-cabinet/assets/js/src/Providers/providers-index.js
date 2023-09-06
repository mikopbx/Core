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
 * Object for handling providers table
 *
 * @module providers
 */
const providers = {

    $deleteModalForm: $('#delete-modal-form'),
    $providersTable: $('#providers-table'),

    /**
     * Initializes the providers page.
     */
    initialize() {
        providers.$deleteModalForm.modal();

        // Enable/disable provider checkbox handlers
        $('.provider-row .checkbox')
            .checkbox({
                onChecked() {
                    const uniqid = $(this).closest('tr').attr('id');
                    $.api({
                        url: `${globalRootUrl}providers/enable/{type}/{uniqid}`,
                        on: 'now',
                        urlData: {
                            type: $(this).closest('tr').attr('data-value'),
                            uniqid,
                        },
                        onSuccess(response) {
                            if (response.success) {
                                $(`#${uniqid} .disability`).removeClass('disabled');
                            }
                        },

                    });
                },
                onUnchecked() {
                    const uniqid = $(this).closest('tr').attr('id');
                    $.api({
                        url: `${globalRootUrl}providers/disable/{type}/{uniqid}`,
                        on: 'now',
                        urlData: {
                            type: $(this).closest('tr').attr('data-value'),
                            uniqid,
                        },
                        onSuccess(response) {
                            if (response.success) {
                                $(`#${uniqid} .disability`).addClass('disabled');
                            }
                        },

                    });
                },
            });

        // Double-click provider row handler
        $('.provider-row td').on('dblclick', (e) => {
            const id = $(e.target).closest('tr').attr('id');
            const type = $(e.target).closest('tr').attr('data-value');
            window.location = `${globalRootUrl}providers/modify${type}/${id}`;
        });

        // Delete provider link handler
        $('body').on('click', '.provider-row a.delete', (e) => {
            e.preventDefault();
            const linksExist = $(e.target).closest('tr').attr('data-links');
            if (linksExist === 'true') {
                providers.$deleteModalForm
                    .modal({
                        closable: false,
                        onDeny: () => true,
                        onApprove: () => {
                            window.location = $(e.target).closest('a').attr('href');
                            return true;
                        },
                    })
                    .modal('show');
            } else {
                window.location = $(e.target).closest('a').attr('href');
            }
        });
        providers.initializeDataTable();
    },

    /**
     * Initializes the DataTable for the providers table.
     */
    initializeDataTable() {
        providers.$providersTable.DataTable({
            lengthChange: false,
            paging: false,
            columns: [
                null,
                null,
                null,
                {"width": "0"},
                null,
                null,
                {orderable: false, searchable: false},
            ],
            autoWidth: false,
            order: [1, 'asc'],
            language: SemanticLocalization.dataTableLocalisation,
        });

        // Move the "Add New" button to the first eight-column div
        $('.add-new-button').appendTo($('div.eight.column:eq(0)'));
    },
};

/**
 *  Initialize providers table on document ready
 */
$(document).ready(() => {
    providers.initialize();
});