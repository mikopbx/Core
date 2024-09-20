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

/* global globalRootUrl, SipAPI, SemanticLocalization, InputMaskPatterns, UserMessage, globalTranslate, Inputmask */


/**
 * The ExtensionsIndex module handles the functionality for the extensions index page.
 *
 * @module extensionsIndex
 */
const extensionsIndex = {
    maskList: null,

    /**
     * The extensions table element.
     * @type {jQuery}
     */
    $extensionsList: $('#extensions-table'),

    /**
     * The global search input element.
     * @type {jQuery}
     */
    $globalSearch: $('#global-search'),

    /**
     * The page length selector.
     * @type {jQuery}
     */
    $pageLengthSelector:$('#page-length-select'),

    /**
     * The page length selector.
     * @type {jQuery}
     */
    $searchExtensionsInput: $('#search-extensions-input'),

    /**
     * The data table object.
     * @type {Object}
     */
    dataTable: {},

    /**
     * The document body.
     * @type {jQuery}
     */
    $body: $('body'),


    /**
     * Initialize the ExtensionsIndex module.
     * Sets up necessary interactivity and features on the page.
     */
    initialize() {

        // Handle avatars with missing src
        $('.avatar').each(function () {
            if ($(this).attr('src') === '') {
                $(this).attr('src', `${globalRootUrl}assets/img/unknownPerson.jpg`);
            }
        });

        // Set up the DataTable on the extensions list.
        extensionsIndex.initializeDataTable();

        // Move the "Add New" button to the first eight-column div.
        $('#add-new-button').appendTo($('div.eight.column:eq(0)'));

        // Set up double-click behavior on the extension rows.
        $('.extension-row td').on('dblclick', (e) => {
            const id = $(e.target).closest('tr').attr('id');
            window.location = `${globalRootUrl}extensions/modify/${id}`;
        });

        // Set up delete functionality on delete button click.
        extensionsIndex.$body.on('click', 'a.delete', (e) => {
            e.preventDefault();
            $(e.target).addClass('disabled');
            // Get the extension ID from the closest table row.
            const extensionId = $(e.target).closest('tr').attr('id');

            // Remove any previous AJAX messages.
            $('.message.ajax').remove();

            // Call the PbxApi method to delete the extension record.
            PbxApi.ExtensionsDeleteRecord(extensionId, extensionsIndex.cbAfterDeleteRecord);
        });

        // Set up copy secret button click.
        extensionsIndex.$body.on('click', 'a.clipboard', (e) => {
            e.preventDefault();
            $(e.target).closest('div.button').addClass('disabled');

            // Get the number from the closest table row.
            const number = $(e.target).closest('tr').attr('data-value');

            // Remove any previous AJAX messages.
            $('.message.ajax').remove();

            // Call the PbxApi method to get the extension secret.
            SipAPI.getSecret(number, extensionsIndex.cbAfterGetSecret);
        });


        // Reset datatable sorts and page
        $(`a[href='${globalRootUrl}extensions/index/#reset-cache']`).on('click', function(e) {
                e.preventDefault();
                extensionsIndex.$extensionsList.DataTable().state.clear();
                window.location.hash = '#reset-cache';
                window.location.reload();
        });

        // Event listener to save the user's page length selection and update the table
        extensionsIndex.$pageLengthSelector.dropdown({
            onChange(pageLength) {
                if (pageLength==='auto'){
                    pageLength = extensionsIndex.calculatePageLength();
                    localStorage.removeItem('extensionsTablePageLength');
                } else {
                    localStorage.setItem('extensionsTablePageLength', pageLength);
                }
                extensionsIndex.dataTable.page.len(pageLength).draw();
            },
        });
        extensionsIndex.$pageLengthSelector.on('click', function(event) {
            event.stopPropagation(); // Prevent the event from bubbling
        });
        // Initialize the Search component
        extensionsIndex.$searchExtensionsInput.search({
            minCharacters: 0,
            searchOnFocus: false,
            searchFields: ['title'],
            showNoResults: false,
            source: [
                { title: globalTranslate.ex_SearchByExtension, value: 'number:' },
                { title: globalTranslate.ex_SearchByMobile, value: 'mobile:' },
                { title: globalTranslate.ex_SearchByEmail, value: 'email:' },
                { title: globalTranslate.ex_SearchByID, value: 'id:' },
                { title: globalTranslate.ex_SearchByCustomPhrase, value: '' },
            ],
            onSelect: function(result, response) {
                extensionsIndex.$globalSearch.val(result.value);
                extensionsIndex.$searchExtensionsInput.search('hide results');
                return false;
            }
        });


        // Start the search when you click on the icon
        $('#search-icon').on('click', function() {
            extensionsIndex.$globalSearch.focus();
            extensionsIndex.$searchExtensionsInput.search('query');
        });

    },

    // Set up the DataTable on the extensions list.
    initializeDataTable(){

        if (window.location.hash === "#reset-cache") {
            localStorage.removeItem('DataTables_extensions-table_/admin-cabinet/extensions/index/');
        }

        // Get the user's saved value or use the automatically calculated value if none exists
        const savedPageLength = localStorage.getItem('extensionsTablePageLength');
        const pageLength = savedPageLength ? savedPageLength : extensionsIndex.calculatePageLength();

        extensionsIndex.$extensionsList.DataTable({
            // Enable state saving to automatically save and restore the table's state
            stateSave: true,
            columnDefs: [
                { defaultContent: "-",  targets: "_all"},
                { responsivePriority: 1,  targets: 0},
                { responsivePriority: 1,  targets: 1},
                { responsivePriority: 3,  targets: 2},
                { responsivePriority: 4,  targets: 3},
                { responsivePriority: 5,  targets: 4},
                { responsivePriority: 1,  targets: -1},
            ],
            responsive: {
                details: false
            },
            columns: [
                {
                    name: 'status',
                    orderable: false,  // This column is not orderable
                    searchable: false  // This column is not searchable,
                },
                {
                    name: 'username',
                    data: 'Users.username',
                },
                {
                    name: 'number',
                    data: 'CAST(Extensions.number AS INTEGER)',
                },
                {
                    name: 'mobile',
                    data: 'CAST(ExternalExtensions.number AS INTEGER)',
                },
                {
                    name: 'email',
                    data: 'Users.email',
                },
                {
                    name: 'buttons',
                    orderable: false,  // This column is not orderable
                    searchable: false,  // This column is not searchable
                },
            ],
            order: [[1, 'asc']],
            serverSide: true,
            processing: false,
            ajax: {
                url: `${globalRootUrl}extensions/getNewRecords`,
                type: 'POST',
            },
            paging: true,
            // stateSave: true,
            sDom: 'rtip',
            deferRender: true,
            pageLength: pageLength,
            scrollCollapse: true,
            // scroller: true,
            language: SemanticLocalization.dataTableLocalisation,
            /**
             * Constructs the Extensions row.
             * @param {HTMLElement} row - The row element.
             * @param {Array} data - The row data.
             */
            createdRow(row, data) {
                const $templateRow  =  $('.extension-row-tpl').clone(true);
                const $avatar = $templateRow.find('.avatar');
                $avatar.attr('src',data.avatar);
                $avatar.after(data.username);
                $templateRow.find('.number').text(data.number);
                $templateRow.find('.mobile input').attr('value', data.mobile);
                $templateRow.find('.email').text(data.email);

                $templateRow.find('.action-buttons').removeClass('small').addClass('tiny');

                const $editButton = $templateRow.find('.action-buttons .button.edit');
                if ($editButton!==undefined){
                    $editButton.attr('href',`${globalRootUrl}extensions/modify/${data.id}`)
                }

                const $clipboardButton = $templateRow.find('.action-buttons .button.clipboard');
                if ($clipboardButton!==undefined){
                    $clipboardButton.attr('data-value',data.number)
                }
                $(row).attr('data-value', data.number);
                $.each($('td', $templateRow), (index, value) => {
                    $('td', row).eq(index)
                        .html($(value).html())
                        .addClass($(value).attr('class'))
                    ;
                });
            },
            /**
             * Draw event - fired once the table has completed a draw.
             */
            drawCallback() {
                // Initialize the input mask for mobile numbers.
                extensionsIndex.initializeInputmask($('input.mobile-number-input'));
                // Set up popups.
                $('.clipboard').popup({
                    on: 'manual',
                });
            },
        });

        // Set the select input value to the saved value if it exists
        if (savedPageLength) {
            extensionsIndex.$pageLengthSelector.dropdown('set value',savedPageLength);
        }

        extensionsIndex.dataTable = extensionsIndex.$extensionsList.DataTable();

        // Initialize debounce timer variable
        let searchDebounceTimer = null;

        extensionsIndex.$globalSearch.on('keyup', (e) => {
            // Clear previous timer if the user is still typing
            clearTimeout(searchDebounceTimer);

            // Set a new timer for delayed execution
            searchDebounceTimer = setTimeout(() => {
                const text = extensionsIndex.$globalSearch.val();
                // Trigger the search if input is valid (Enter, Backspace, or more than 2 characters)
                if (e.keyCode === 13 || e.keyCode === 8 || text.length >= 2) {
                    extensionsIndex.applyFilter(text);
                }
            }, 500); // 500ms delay before executing the search
        });

        extensionsIndex.dataTable.on('draw', () => {
            extensionsIndex.$globalSearch.closest('div').removeClass('loading');
        });


        // Restore the saved search phrase from DataTables state
        const state = extensionsIndex.dataTable.state.loaded();
        if (state && state.search) {
            extensionsIndex.$globalSearch.val(state.search.search); // Set the search field with the saved value
        }

        // Retrieves the value of 'search' query parameter from the URL.
        const searchValue = extensionsIndex.getQueryParam('search');

        // Sets the global search input value and applies the filter if a search value is provided.
        if (searchValue) {
            extensionsIndex.$globalSearch.val(searchValue);
            extensionsIndex.applyFilter(searchValue);
        }
    },

    /**
     * Retrieves the value of a specified query parameter from the URL.
     *
     * @param {string} param - The name of the query parameter to retrieve.
     * @return {string|null} The value of the query parameter, or null if not found.
     */
    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },

    /**
     * Calculates the number of rows that can fit on a page based on the current window height.
     * @returns {number}
     */
    calculatePageLength() {
        // Calculate row height
        let rowHeight = extensionsIndex.$extensionsList.find('tr').first().outerHeight();

        // Calculate window height and available space for table
        const windowHeight = window.innerHeight;
        const headerFooterHeight = 390; // Estimate height for header, footer, and other elements

        // Calculate new page length
        return Math.max(Math.floor((windowHeight - headerFooterHeight) / rowHeight), 5);
    },

    /**
     * Callback function executed after deleting a record.
     * @param {Object} response - The response object from the API.
     */
    cbAfterDeleteRecord(response){
        if (response.result === true) {
            // Remove the deleted extension's table row.
            extensionsIndex.$extensionsList.find(`tr[id=${response.data.id}]`).remove();
            // Call the callback function for data change.
            Extensions.cbOnDataChanged();
        } else {
            // Show an error message if deletion was not successful.
            UserMessage.showError(response.messages.error, globalTranslate.ex_ImpossibleToDeleteExtension);
        }
        $('a.delete').removeClass('disabled');
    },

    /**
     * Callback function executed after cet extension secret.
     * @param {Object} response - The response object from the API.
     */
    cbAfterGetSecret(response){
        if (response.result === true) {
            const $clipboardButton = extensionsIndex.$extensionsList.find(`a.clipboard[data-value=${response.data.number}]`);
            extensionsIndex.copyToClipboard(response.data.secret);
            $clipboardButton.popup('show');
                setTimeout(() => {
                    $clipboardButton.popup('hide');
                }, 1500);
        } else {
            // Show an error message if get secret was not successful.
            UserMessage.showError(response.messages.error, globalTranslate.ex_ImpossibleToGetSecret);
        }
        $('a.clipboard').removeClass('disabled');
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
    /**
     * Applies the filter to the data table.
     * @param {string} text - The filter text.
     */
    applyFilter(text) {
        extensionsIndex.dataTable.search(text).draw();
        extensionsIndex.$globalSearch.closest('div').addClass('loading');
    },

    /**
     * Copies the text passed as param to the system clipboard
     * Check if using HTTPS and navigator.clipboard is available
     * Then uses standard clipboard API, otherwise uses fallback
     */
    copyToClipboard(content) {
        if (window.isSecureContext && navigator.clipboard) {
            navigator.clipboard.writeText(content);
        } else {
            extensionsIndex.unsecuredCopyToClipboard(content);
        }
    },
    /**
     * Put text variable into clipboard for unsecured connection.
     * @param {string} content - The text value.
     */
    unsecuredCopyToClipboard(content) {
        const textArea = document.createElement("textarea");
        textArea.value=content;
        document.body.appendChild(textArea);
        textArea.focus();textArea.select();
        try{
            document.execCommand('copy')
        } catch(err) {
            console.error('Unable to copy to clipboard', err)
        }
        document.body.removeChild(textArea)
    },
};

/**
 *  Initialize Employees table on document ready
 */
$(document).ready(() => {
    extensionsIndex.initialize();
});

