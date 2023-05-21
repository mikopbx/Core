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

/* global globalRootUrl, ClipboardJS, SemanticLocalization, InputMaskPatterns, UserMessage, globalTranslate */


/**
 * The ExtensionsIndex module handles the functionality for the extensions index page.
 *
 * @module extensionsIndex
 */
const extensionsIndex = {
    maskList: null,
    $extensionsList: $('#extensions-table'),
    $contentFrame: $('#content-frame'),

    /**
     * Initialize the ExtensionsIndex module.
     * This function sets up necessary interactivity and features on the page.
     */
    initialize() {

        // Loop over each avatar and provide a default source if one does not exist.
        $('.avatar').each(function () {
            if ($(this).attr('src') === '') {
                $(this).attr('src', `${globalRootUrl}assets/img/unknownPerson.jpg`);
            }
        });

        // Initialize the input mask for mobile numbers.
        extensionsIndex.initializeInputmask($('input.mobile-number-input'));

        // Set up the DataTable on the extensions list.
        extensionsIndex.$extensionsList.DataTable({
            lengthChange: false,
            paging: false,
            columns: [
                {orderable: false, searchable: false, "width": "0"},
                null,
                null,
                null,
                null,
                {orderable: false, searchable: false},
            ],
            autoWidth: false,
            order: [1, 'asc'],
            language: SemanticLocalization.dataTableLocalisation,
            drawCallback() {
            },
        });

        // Move the "Add New" button to the first eight-column div.
        $('#add-new-button').appendTo($('div.eight.column:eq(0)'));

        // Set up double-click behavior on the extension rows.
        $('.extension-row td').on('dblclick', (e) => {
            const id = $(e.target).closest('tr').attr('id');
            window.location = `${globalRootUrl}extensions/modify/${id}`;
        });

        // Set up ClipboardJS for copying to the clipboard.
        const clipboard = new ClipboardJS('.clipboard');
        $('.clipboard').popup({
            on: 'manual',
        });

        // Set up 'success' event listener for the clipboard.
        clipboard.on('success', (e) => {
            $(e.trigger).popup('show');
            setTimeout(() => {
                $(e.trigger).popup('hide');
            }, 1500);
            e.clearSelection();
        });

        // Set up 'error' event listener for the clipboard.
        clipboard.on('error', (e) => {
            console.error('Action:', e.action);
            console.error('Trigger:', e.trigger);
        });

        // Setup checkbox functionality in the extension row.
        $('.extension-row .checkbox')
            .checkbox({
                onChecked() {
                    const number = $(this).attr('data-value');
                    $.api({
                        url: `${globalRootUrl}extensions/enable/${number}`,
                        on: 'now',
                        onSuccess(response) {
                            if (response.success) {
                                $(`#${number} .disability`).removeClass('disabled');
                            }
                        },
                    });
                },
                onUnchecked() {
                    const number = $(this).attr('data-value');
                    $.api({
                        url: `${globalRootUrl}extensions/disable/${number}`,
                        on: 'now',
                        onSuccess(response) {
                            if (response.success) {
                                $(`#${number} .disability`).addClass('disabled');
                            }
                        },
                    });
                },
            });

        // Set up delete functionality on delete button click.
        $('body').on('click', 'a.delete', (e) => {
            e.preventDefault();
            const extensionId = $(e.target).closest('tr').attr('id');
            extensionsIndex.deleteExtension(extensionId);
        });
    },

    /**
     * Deletes an extension with the given ID.
     * @param {string} extensionId - The ID of the extension to delete.
     */
    deleteExtension(extensionId) {
        $('.message.ajax').remove();
        $.api({
            url: `${globalRootUrl}extensions/delete/${extensionId}`,
            on: 'now',
            successTest(response) {
                // test whether a JSON response is valid
                return response !== undefined
                    && Object.keys(response).length > 0;
            },
            onSuccess(response) {
                if (response.success === true) {
                    extensionsIndex.$extensionsList.find(`tr[id=${extensionId}]`).remove();
                    Extensions.cbOnDataChanged();
                } else {
                    UserMessage.showError(response.message.error, globalTranslate.ex_ImpossibleToDeleteExtension);
                }
            },
        });
    },

    /**
     * Initializes input masks for visualizing formatted numbers.
     * @param {Object} $el - The jQuery object for the element to initialize the input mask on.
     */
    initializeInputmask($el) {
        if (extensionsIndex.maskList === null) {
            // Prepares the table for sort
            extensionsIndex.maskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
        }
        $el.inputmasks({
            inputmask: {
                definitions: {
                    '#': {
                        validator: '[0-9]',
                        cardinality: 1,
                    },
                },
            },
            match: /[0-9]/,
            replace: '9',
            list: extensionsIndex.maskList,
            listKey: 'mask',
        });
    },
};

/**
 *  Initialize Employees table on document ready
 */
$(document).ready(() => {
    extensionsIndex.initialize();
});

