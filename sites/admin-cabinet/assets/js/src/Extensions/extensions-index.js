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

/* global globalRootUrl, SipAPI, SemanticLocalization, InputMaskPatterns, UserMessage, globalTranslate, Inputmask, ExtensionIndexStatusMonitor, ExtensionsAPI, EmployeesAPI */


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
     * Draw counter for DataTables draw parameter
     * @type {number}
     */
    drawCounter: 1,

    /**
     * Timeout reference for retry attempts
     * @type {number}
     */
    retryTimeout: null,

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

        // Initialize the bulk actions dropdown
        $('#bulk-actions-dropdown').dropdown();

        // Set up double-click behavior on the extension rows using delegation for dynamic content.
        // Exclude buttons column to prevent accidental navigation when trying to delete
        extensionsIndex.$body.on('dblclick', '.extension-row td:not(:last-child)', (e) => {
            const extensionId = $(e.target).closest('tr').attr('data-extension-id');
            window.location = `${globalRootUrl}extensions/modify/${extensionId}`;
        });

        // Set up delete functionality on delete button click.
        extensionsIndex.$body.on('click', 'a.delete', (e) => {
            e.preventDefault();
            $(e.target).addClass('disabled');
            // Get the database extension ID from the closest table row.
            const extensionId = $(e.target).closest('tr').attr('data-extension-id');

            // Remove any previous AJAX messages.
            $('.message.ajax').remove();

            // Call the EmployeesAPI method to delete the employee record.
            EmployeesAPI.deleteRecord(extensionId, extensionsIndex.cbAfterDeleteRecord);
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
                    data: null,
                    orderable: false,  // This column is not orderable
                    searchable: false  // This column is not searchable,
                },
                {
                    name: 'username',
                    data: 'user_username',
                },
                {
                    name: 'number',
                    data: 'number',
                },
                {
                    name: 'mobile',
                    data: 'mobile',
                },
                {
                    name: 'email',
                    data: 'user_email',
                },
                {
                    name: 'buttons',
                    data: null,
                    orderable: false,  // This column is not orderable
                    searchable: false,  // This column is not searchable
                },
            ],
            order: [[1, 'asc']],
            serverSide: true,
            processing: false,
            ajax: {
                url: `/pbxcore/api/v3/employees`,
                type: 'GET',
                data: function(d) {
                    // Increment draw counter for this request
                    extensionsIndex.drawCounter = d.draw || ++extensionsIndex.drawCounter;
                    
                    // Transform DataTables request to our REST API format (query params for GET)
                    const requestData = {
                        search: d.search.value,
                        limit: d.length,
                        offset: d.start
                    };
                    
                    // Add sorting information
                    if (d.order && d.order.length > 0) {
                        const orderColumn = d.columns[d.order[0].column];
                        if (orderColumn && orderColumn.name) {
                            requestData.order_by = orderColumn.name;
                            requestData.order_direction = d.order[0].dir.toUpperCase();
                        }
                    }
                    
                    return requestData;
                },
                dataSrc: function(json) {
                    // Handle new pagination format from Employees API
                    // API returns: {data: {data: [...], recordsTotal: n, recordsFiltered: n}}
                    let data, recordsTotal, recordsFiltered;
                    
                    if (json.data && json.data.data && Array.isArray(json.data.data)) {
                        // New pagination format
                        data = json.data.data;
                        recordsTotal = json.data.recordsTotal || data.length;
                        recordsFiltered = json.data.recordsFiltered || recordsTotal;
                    } else {
                        // Fallback to old format for compatibility
                        data = json.data || [];
                        recordsTotal = data.length;
                        recordsFiltered = data.length;
                    }
                    
                    // Set DataTables pagination info on the response object
                    json.draw = extensionsIndex.drawCounter;
                    json.recordsTotal = recordsTotal;
                    json.recordsFiltered = recordsFiltered;
                    
                    // Return just the data array for DataTables to process
                    return data;
                },
                error: function(xhr, textStatus, error) {
                    // Suppress the default error alert
                    console.log('DataTable request failed, will retry in 3 seconds');
                    
                    // Clear any existing retry timeout
                    if (extensionsIndex.retryTimeout) {
                        clearTimeout(extensionsIndex.retryTimeout);
                    }
                    
                    // Set up retry after 3 seconds
                    extensionsIndex.retryTimeout = setTimeout(function() {
                        extensionsIndex.dataTable.ajax.reload(null, false);
                    }, 3000);
                    
                    return false; // Prevent default error handling
                }
            },
            paging: true,
            // stateSave: true,
            sDom: 'rtip',
            deferRender: true,
            pageLength: pageLength,
            scrollCollapse: true,
            // scroller: true,
            language: {
                ...SemanticLocalization.dataTableLocalisation,
                emptyTable: ' ',  // Empty string to hide default message
                zeroRecords: ' ' // Empty string to hide default message
            },
            /**
             * Constructs the Extensions row.
             * @param {HTMLElement} row - The row element.
             * @param {Array} data - The row data.
             */
            createdRow(row, data) {
                const $templateRow  =  $('.extension-row-tpl').clone(true);
                const $avatar = $templateRow.find('.avatar');
                $avatar.attr('src', data.avatar);
                $avatar.after(data.user_username);
                $templateRow.find('.number').text(data.number);
                $templateRow.find('.mobile input').attr('value', data.mobile);
                $templateRow.find('.email').text(data.user_email);

                $templateRow.find('.action-buttons').removeClass('small').addClass('tiny');

                const $editButton = $templateRow.find('.action-buttons .button.edit');
                if ($editButton !== undefined){
                    $editButton.attr('href',`${globalRootUrl}extensions/modify/${data.id}`)
                }

                const $clipboardButton = $templateRow.find('.action-buttons .button.clipboard');
                if ($clipboardButton !== undefined){
                    $clipboardButton.attr('data-value', data.number)
                }
                $(row).attr('data-value', data.number);
                $(row).attr('id', data.number); // Use extension number as ID for status monitor
                $(row).attr('data-extension-id', data.id); // Preserve database ID as data attribute
                $(row).addClass('extension-row'); // Add class for status monitor
                
                // Apply disabled class if extension is disabled
                if (data.disabled) {
                    $(row).addClass('disabled');
                }
                
                // Apply cached status immediately if available
                if (typeof ExtensionIndexStatusMonitor !== 'undefined' && ExtensionIndexStatusMonitor.statusCache) {
                    const cachedStatus = ExtensionIndexStatusMonitor.statusCache[data.number];
                    if (cachedStatus) {
                        // Status is available in cache, apply it immediately
                        const statusColor = ExtensionIndexStatusMonitor.getColorForStatus(cachedStatus.status);
                        const $statusCell = $(row).find('.extension-status');
                        if ($statusCell.length) {
                            const statusHtml = `
                                <div class="ui ${statusColor} empty circular label" 
                                     style="width: 1px;height: 1px;"
                                     title="Extension ${data.number}: ${cachedStatus.status}">
                                </div>
                            `;
                            $statusCell.html(statusHtml);
                        }
                    }
                }
                
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
            drawCallback(settings) {
                // Initialize the input mask for mobile numbers.
                extensionsIndex.initializeInputmask($('input.mobile-number-input'));
                
                // Check if table is empty and show appropriate message
                const api = new $.fn.dataTable.Api(settings);
                const pageInfo = api.page.info();
                const hasRecords = pageInfo.recordsDisplay > 0;
                const searchValue = api.search();
                
                if (!hasRecords) {
                    $('#extensions-table').hide();
                    
                    // Check if this is due to search filter or truly empty database
                    if (searchValue && searchValue.trim() !== '') {
                        // Show "Nothing found" message for search results
                        extensionsIndex.showNoSearchResultsMessage();
                    } else {
                        // Show "Add first employee" placeholder for empty database
                        $('#extensions-table-container').hide();
                        $('#extensions-placeholder').show();
                    }
                } else {
                    $('#extensions-table').show();
                    $('#extensions-table-container').show();
                    $('#extensions-placeholder').hide();
                    extensionsIndex.hideNoSearchResultsMessage();
                    
                    // Apply cached statuses to newly rendered rows
                    if (typeof ExtensionIndexStatusMonitor !== 'undefined') {
                        // Refresh DOM cache for new rows
                        ExtensionIndexStatusMonitor.refreshCache();
                        // Apply cached statuses immediately
                        ExtensionIndexStatusMonitor.applyStatusesToVisibleRows();
                        // Request statuses for any new extensions not in cache
                        ExtensionIndexStatusMonitor.requestStatusesForNewExtensions();
                    }
                }
                
                // Hide pagination when there are few records (less than page length)
                extensionsIndex.togglePaginationVisibility(pageInfo);
                
                // Set up popups.
                $('.clipboard').popup({
                    on: 'manual',
                });
            },
            // Disable DataTables error alerts completely
            fnInitComplete: function() {
                // Override DataTables error event handler
                $.fn.dataTable.ext.errMode = 'none';
            }
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
        
        // Initialize extension index status monitor if available
        if (typeof ExtensionIndexStatusMonitor !== 'undefined') {
            ExtensionIndexStatusMonitor.initialize();
            // Request initial status after table loads
            setTimeout(() => {
                extensionsIndex.requestInitialStatus();
            }, 500);
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
            // Reload the datatable to reflect changes
            extensionsIndex.dataTable.ajax.reload(null, false);
            // Call the callback function for data change if it exists.
            if (typeof Extensions !== 'undefined' && typeof Extensions.cbOnDataChanged === 'function') {
                Extensions.cbOnDataChanged();
            }
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
     * Shows "No search results found" message
     */
    showNoSearchResultsMessage() {
        // Remove any existing no-results message
        extensionsIndex.hideNoSearchResultsMessage();
        
        // Create and show no results message
        const noResultsHtml = `
            <div id="no-search-results" style="margin-top: 2em;">
                <div class="ui icon message">
                    <i class="search icon"></i>
                    <div class="content">
                        <div class="header">${globalTranslate.ex_NoSearchResults}</div>
                        <p>${globalTranslate.ex_TryDifferentKeywords}</p>
                    </div>
                </div>
            </div>
        `;
        $('#extensions-table-container').after(noResultsHtml);
    },

    /**
     * Hides "No search results found" message
     */
    hideNoSearchResultsMessage() {
        $('#no-search-results').remove();
    },

    /**
     * Toggles pagination visibility based on number of records
     * Hides pagination when there are fewer records than the page length
     * @param {Object} pageInfo - DataTables page info object
     */
    togglePaginationVisibility(pageInfo) {
        const paginationWrapper = $('#extensions-table_paginate');
        const paginationInfo = $('#extensions-table_info');
        
        // Hide pagination if total records fit on one page
        if (pageInfo.recordsDisplay <= pageInfo.length) {
            paginationWrapper.hide();
            paginationInfo.hide();
        } else {
            paginationWrapper.show();
            paginationInfo.show();
        }
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
    
    /**
     * Request initial extension status on page load
     */
    requestInitialStatus() {
        if (typeof ExtensionsAPI !== 'undefined') {
            // Use simplified mode for index page - pass options as first param, callback as second
            ExtensionsAPI.getStatuses({ simplified: true }, (response) => {
                // Manually trigger status update
                if (response && response.data && typeof ExtensionIndexStatusMonitor !== 'undefined') {
                    ExtensionIndexStatusMonitor.updateAllExtensionStatuses(response.data);
                }
            });
        }
    }
};

/**
 *  Initialize Employees table on document ready
 */
$(document).ready(() => {
    extensionsIndex.initialize();
});

