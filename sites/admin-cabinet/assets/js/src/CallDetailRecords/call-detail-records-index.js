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

/* global globalRootUrl, SemanticLocalization, ExtensionsAPI, moment, globalTranslate, CDRPlayer, CdrAPI, UserMessage, ACLHelper */

/**
 * callDetailRecords module.
 * @module callDetailRecords
 */
const callDetailRecords = {
    /**
     * The call detail records table element.
     * @type {jQuery}
     */
    $cdrTable: $('#cdr-table'),

    /**
     * The global search input element.
     * @type {jQuery}
     */
    $globalSearch: $('#globalsearch'),

    /**
     * The date range selector element.
     * @type {jQuery}
     */
    $dateRangeSelector: $('#date-range-selector'),

    /**
     * The search CDR input element.
     * @type {jQuery}
     */
    $searchCDRInput: $('#search-cdr-input'),

    /**
     * The page length selector.
     * @type {jQuery}
     */
    $pageLengthSelector: $('#page-length-select'),

    /**
     * The data table object.
     * @type {Object}
     */
    dataTable: {},

    /**
     * An array of players.
     * @type {Array}
     */
    players: [],

    /**
     * Flag indicating if CDR database has any records
     * @type {boolean}
     */
    hasCDRRecords: true,

    /**
     * The empty database placeholder element
     * @type {jQuery}
     */
    $emptyDatabasePlaceholder: $('#cdr-empty-database-placeholder'),

    /**
     * Initializes the call detail records.
     */
    initialize() {
        // Fetch metadata first, then initialize DataTable with proper date range
        // WHY: Prevents double request on page load
        callDetailRecords.fetchLatestCDRDate();
    },

    /**
     * Initialize DataTable and event handlers
     * Called after metadata is received
     */
    initializeDataTableAndHandlers() {
        // Initialize debounce timer variable
        let searchDebounceTimer = null;

        callDetailRecords.$globalSearch.on('keyup', (e) => {
            // Clear previous timer if the user is still typing
            clearTimeout(searchDebounceTimer);

            // Set a new timer for delayed execution
            searchDebounceTimer = setTimeout(() => {
                if (e.keyCode === 13
                    || e.keyCode === 8
                    || callDetailRecords.$globalSearch.val().length === 0) {
                    // Only pass the search keyword, dates are handled separately
                    const text = callDetailRecords.$globalSearch.val();
                    callDetailRecords.applyFilter(text);
                }
            }, 500); // 500ms delay before executing the search
        });

        callDetailRecords.$cdrTable.dataTable({
            search: {
                search: callDetailRecords.$globalSearch.val(),
            },
            serverSide: true,
            processing: true,
            columns: [
                { data: null, orderable: false },  // 0: expand icon column
                { data: 0 },                       // 1: date (array index 0)
                { data: 1 },                       // 2: src_num (array index 1)
                { data: 2 },                       // 3: dst_num (array index 2)
                { data: 3 },                       // 4: duration (array index 3)
                { data: null, orderable: false }   // 5: delete button column
            ],
            columnDefs: [
                { defaultContent: "-",  targets: "_all"},
            ],
            ajax: {
                url: '/pbxcore/api/v3/cdr',
                type: 'GET',  // REST API uses GET for list retrieval
                data: function(d) {
                    const params = {};
                    let isLinkedIdSearch = false;

                    // 1. Always get dates from date range selector using daterangepicker API
                    const dateRangePicker = callDetailRecords.$dateRangeSelector.data('daterangepicker');
                    if (dateRangePicker) {
                        const startDate = dateRangePicker.startDate;
                        const endDate = dateRangePicker.endDate;

                        if (startDate && startDate.isValid() && endDate && endDate.isValid()) {
                            params.dateFrom = startDate.format('YYYY-MM-DD');
                            params.dateTo = endDate.endOf('day').format('YYYY-MM-DD HH:mm:ss');
                        }
                    }

                    // 2. Process search keyword from search input field
                    const searchKeyword = d.search.value || '';

                    if (searchKeyword.trim()) {
                        const keyword = searchKeyword.trim();

                        // Parse search prefixes: src:, dst:, did:, linkedid:
                        if (keyword.startsWith('src:')) {
                            // Search by source number only
                            params.src_num = keyword.substring(4).trim();
                        } else if (keyword.startsWith('dst:')) {
                            // Search by destination number only
                            params.dst_num = keyword.substring(4).trim();
                        } else if (keyword.startsWith('did:')) {
                            // Search by DID only
                            params.did = keyword.substring(4).trim();
                        } else if (keyword.startsWith('linkedid:')) {
                            // Search by linkedid - ignore date range for linkedid search
                            params.linkedid = keyword.substring(9).trim();
                            isLinkedIdSearch = true;
                            // Remove date params for linkedid search
                            delete params.dateFrom;
                            delete params.dateTo;
                        } else {
                            // Full-text search: search in src_num, dst_num, and DID
                            // WHY: User expects search without prefix to find number anywhere
                            params.search = keyword;
                        }
                    }

                    // REST API pagination parameters
                    params.limit = d.length;
                    params.offset = d.start;
                    params.sort = 'id';
                    params.order = 'DESC';

                    return params;
                },
                dataSrc: function(json) {
                    // API returns PBXApiResult with nested structure:
                    // {result: true, data: {data: [...], pagination: {...}}}
                    if (json.result && json.data) {
                        const restData = json.data.data || [];
                        const pagination = json.data.pagination || {};

                        // Set DataTables pagination properties
                        json.recordsTotal = pagination.total || 0;
                        json.recordsFiltered = pagination.total || 0;

                        // Transform REST records to DataTable rows
                        return callDetailRecords.transformRestToDataTable(restData);
                    }
                    return [];
                },
                beforeSend: function(xhr) {
                    // Add Bearer token for API authentication
                    if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
                        xhr.setRequestHeader('Authorization', `Bearer ${TokenManager.accessToken}`);
                    }
                }
            },
            paging: true,
            //scrollY: $(window).height() - callDetailRecords.$cdrTable.offset().top-150,
            sDom: 'rtip',
            deferRender: true,
            pageLength: callDetailRecords.getPageLength(),
            language: {
                ...SemanticLocalization.dataTableLocalisation,
                emptyTable: callDetailRecords.getEmptyTableMessage(),
                zeroRecords: callDetailRecords.getEmptyTableMessage()
            },

            /**
             * Constructs the CDR row.
             * @param {HTMLElement} row - The row element.
             * @param {Array} data - The row data.
             */
            createdRow(row, data) {
                if (data.DT_RowClass.indexOf("detailed") >= 0) {
                    $('td', row).eq(0).html('<i class="icon caret down"></i>');
                } else {
                    $('td', row).eq(0).html('');
                }
                $('td', row).eq(1).html(data[0]);
                $('td', row).eq(2)
                    .html(data[1])
                    .addClass('need-update');
                $('td', row).eq(3)
                    .html(data[2])
                    .addClass('need-update');

                // Duration column (no icons)
                $('td', row).eq(4).html(data[3]).addClass('right aligned');

                // Last column: log icon + delete button
                let actionsHtml = '';

                // Add log icon if available
                if (data.ids !== '') {
                    actionsHtml += `<i data-ids="${data.ids}" class="file alternate outline icon" style="cursor: pointer; margin-right: 8px;"></i>`;
                }

                // Add delete button
                // WHY: Use two-steps-delete mechanism to prevent accidental deletion
                // First click changes trash icon to close icon, second click deletes
                // Note: ACL check is done server-side in Volt template (column is hidden if no permission)
                // WHY: Use data.DT_RowId which contains linkedid for grouped records
                actionsHtml += `<a href="#" class="two-steps-delete delete-record popuped"
                                   data-record-id="${data.DT_RowId}"
                                   data-content="${globalTranslate.cdr_DeleteRecord || 'Delete record'}">
                                   <i class="icon trash red" style="margin: 0;"></i>
                                </a>`;

                $('td', row).eq(5).html(actionsHtml).addClass('right aligned');
            },

            /**
             * Draw event - fired once the table has completed a draw.
             */
            drawCallback() {
                ExtensionsAPI.updatePhonesRepresent('need-update');
                callDetailRecords.togglePaginationControls();
            },
            ordering: false,
        });
        callDetailRecords.dataTable = callDetailRecords.$cdrTable.DataTable();

        // Initialize the Search component AFTER DataTable is created
        callDetailRecords.$searchCDRInput.search({
            minCharacters: 0,
            searchOnFocus: false,
            searchFields: ['title'],
            showNoResults: false,
            source: [
                { title: globalTranslate.cdr_SearchBySourceNumber, value: 'src:' },
                { title: globalTranslate.cdr_SearchByDestNumber, value: 'dst:' },
                { title: globalTranslate.cdr_SearchByDID, value: 'did:' },
                { title: globalTranslate.cdr_SearchByLinkedID, value: 'linkedid:' },
                { title: globalTranslate.cdr_SearchByCustomPhrase, value: '' },
            ],
            onSelect: function(result, response) {
                callDetailRecords.$globalSearch.val(result.value);
                callDetailRecords.$searchCDRInput.search('hide results');
                return false;
            }
        });

        // Start the search when you click on the icon
        $('#search-icon').on('click', function() {
            callDetailRecords.$globalSearch.focus();
            callDetailRecords.$searchCDRInput.search('query');
        });

        // Event listener to save the user's page length selection and update the table
        callDetailRecords.$pageLengthSelector.dropdown({
            onChange(pageLength) {
                if (pageLength === 'auto') {
                    pageLength = callDetailRecords.calculatePageLength();
                    localStorage.removeItem('cdrTablePageLength');
                } else {
                    localStorage.setItem('cdrTablePageLength', pageLength);
                }
                callDetailRecords.dataTable.page.len(pageLength).draw();
            },
        });
        callDetailRecords.$pageLengthSelector.on('click', function(event) {
            event.stopPropagation(); // Prevent the event from bubbling
        });

        // Set the select input value to the saved value if it exists
        const savedPageLength = localStorage.getItem('cdrTablePageLength');
        if (savedPageLength) {
            callDetailRecords.$pageLengthSelector.dropdown('set value', savedPageLength);
        }

        callDetailRecords.dataTable.on('draw', () => {
            callDetailRecords.$globalSearch.closest('div').removeClass('loading');
        });

        // Add event listener for clicking on icon with data-ids (open in new window)
        // WHY: Clicking on icon should open System Diagnostic in new window to view verbose logs
        callDetailRecords.$cdrTable.on('click', '[data-ids]', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent row toggle

            const ids = $(e.currentTarget).attr('data-ids');
            if (ids !== undefined && ids !== '') {
                // WHY: Format as query param + hash: ?filter=...#file=...
                // Open in new window to allow viewing logs while keeping CDR table visible
                const url = `${globalRootUrl}system-diagnostic/index/?filter=${encodeURIComponent(ids)}#file=asterisk%2Fverbose`;
                window.open(url, '_blank');
            }
        });

        // Add event listener for opening and closing details
        // WHY: Only expand/collapse on first column (caret icon) click, not on action icons
        callDetailRecords.$cdrTable.on('click', 'tr.detailed td:first-child', (e) => {
            const tr = $(e.target).closest('tr');
            const row = callDetailRecords.dataTable.row(tr);

            if (row.child.isShown()) {
                // This row is already open - close it
                row.child.hide();
                tr.removeClass('shown');
            } else {
                // Open this row
                row.child(callDetailRecords.showRecords(row.data())).show();
                tr.addClass('shown');
                row.child().find('.detail-record-row').each((index, playerRow) => {
                    const id = $(playerRow).attr('id');
                    return new CDRPlayer(id);
                });
                ExtensionsAPI.updatePhonesRepresent('need-update');
            }
        });

        // Handle second click on delete button (after two-steps-delete changes icon to close)
        // WHY: Two-steps-delete mechanism prevents accidental deletion
        // First click: trash → close (by delete-something.js), Second click: execute deletion
        callDetailRecords.$cdrTable.on('click', 'a.delete-record:not(.two-steps-delete)', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent row expansion

            const $button = $(e.currentTarget);
            const recordId = $button.attr('data-record-id');

            if (!recordId) {
                return;
            }

            // Add loading state
            $button.addClass('disabled loading');

            // Always delete with recordings and linked records
            callDetailRecords.deleteRecord(recordId, $button);
        });
    },

    /**
     * Delete CDR record via REST API
     * WHY: Deletes by linkedid - automatically removes entire conversation with all linked records
     * @param {string} recordId - CDR linkedid (like "mikopbx-1760784793.4627")
     * @param {jQuery} $button - Button element to update state
     */
    deleteRecord(recordId, $button) {
        // Always delete with recording files
        // WHY: linkedid automatically deletes all linked records (no deleteLinked parameter needed)
        CdrAPI.deleteRecord(recordId, { deleteRecording: true }, (response) => {
            $button.removeClass('loading disabled');

            if (response && response.result === true) {
                // Silently reload the DataTable to reflect changes
                // WHY: Visual feedback (disappearing row) is enough, no need for success toast
                callDetailRecords.dataTable.ajax.reload(null, false);
            } else {
                // Show error message only on failure
                const errorMsg = response?.messages?.error?.[0] ||
                                globalTranslate.cdr_DeleteFailed ||
                                'Failed to delete record';
                UserMessage.showError(errorMsg);
            }
        });
    },

    /**
     * Toggles the pagination controls visibility based on data size
     */
    togglePaginationControls() {
        const info = callDetailRecords.dataTable.page.info();
        if (info.pages <= 1) {
            $(callDetailRecords.dataTable.table().container()).find('.dataTables_paginate').hide();
        } else {
            $(callDetailRecords.dataTable.table().container()).find('.dataTables_paginate').show();
        }
    },

    /**
     * Fetches CDR metadata (date range) using CdrAPI
     * WHY: Lightweight request returns only metadata (dates), not full CDR records
     * Avoids double request on page load
     */
    fetchLatestCDRDate() {
        CdrAPI.getMetadata({ limit: 100 }, (data) => {
            if (data && data.hasRecords) {
                // Convert date strings to moment objects
                const earliestDate = moment(data.earliestDate);
                const latestDate = moment(data.latestDate);

                callDetailRecords.hasCDRRecords = true;
                callDetailRecords.initializeDateRangeSelector(earliestDate, latestDate);

                // Initialize DataTable only if we have records
                // WHY: DataTable needs date range to be set first
                callDetailRecords.initializeDataTableAndHandlers();
            } else {
                // No records in database at all or API error
                callDetailRecords.hasCDRRecords = false;
                callDetailRecords.showEmptyDatabasePlaceholder();
                // Don't initialize DataTable at all - just show placeholder
            }
        });
    },

    /**
     * Gets a styled empty table message
     * @returns {string} HTML message for empty table
     */
    getEmptyTableMessage() {
        // If database is empty, we don't show this message in table
        if (!callDetailRecords.hasCDRRecords) {
            return '';
        }
        
        // Show filtered empty state message
        return `
        <div class="ui placeholder segment">
            <div class="ui icon header">
                <i class="search icon"></i>
                ${globalTranslate.cdr_FilteredEmptyTitle}
            </div>
            <div class="inline">
                <div class="ui text">
                    ${globalTranslate.cdr_FilteredEmptyDescription}
                </div>
            </div>
        </div>`;
    },
    
    /**
     * Shows the empty database placeholder and hides the table
     */
    showEmptyDatabasePlaceholder() {
        // Hide the table itself (DataTable won't be initialized)
        callDetailRecords.$cdrTable.hide();

        // Hide search and date controls
        $('#date-range-selector').closest('.ui.row').hide();

        // Show placeholder
        callDetailRecords.$emptyDatabasePlaceholder.show();
    },

    /**
     * Transform REST API grouped records to DataTable row format
     * @param {Array} restData - Array of grouped CDR records from REST API
     * @returns {Array} Array of DataTable rows
     */
    transformRestToDataTable(restData) {
        return restData.map(group => {
            // Calculate timing display
            const billsec = group.totalBillsec || 0;
            const timeFormat = (billsec < 3600) ? 'mm:ss' : 'HH:mm:ss';
            const timing = billsec > 0 ? moment.utc(billsec * 1000).format(timeFormat) : '';

            // Format start date
            const formattedDate = moment(group.start).format('DD-MM-YYYY HH:mm:ss');

            // Extract recording records - filter only records with actual recording files
            const recordings = (group.records || [])
                .filter(r => r.recordingfile && r.recordingfile.length > 0)
                .map(r => ({
                    id: r.id,
                    src_num: r.src_num,
                    dst_num: r.dst_num,
                    recordingfile: r.recordingfile,
                    playback_url: r.playback_url,   // Token-based URL for playback
                    download_url: r.download_url    // Token-based URL for download
                }));

            // Determine CSS class
            const hasRecordings = recordings.length > 0;
            const isAnswered = group.disposition === 'ANSWERED';
            const dtRowClass = hasRecordings ? 'detailed' : 'ui';
            const negativeClass = isAnswered ? '' : ' negative';

            // Collect verbose call IDs
            const ids = (group.records || [])
                .map(r => r.verbose_call_id)
                .filter(id => id && id.length > 0)
                .join('&');

            // Return DataTable row format
            // DataTables needs both array indices AND special properties
            const row = [
                formattedDate,              // 0: date
                group.src_num,              // 1: source number
                group.dst_num || group.did, // 2: destination number or DID
                timing,                     // 3: duration
                recordings,                 // 4: recording records array
                group.disposition           // 5: disposition
            ];

            // Add DataTables special properties
            row.DT_RowId = group.linkedid;
            row.DT_RowClass = dtRowClass + negativeClass;
            row.ids = ids; // Store raw IDs without encoding - encoding will be applied when building URL

            return row;
        });
    },

    /**
     * Shows a set of call records when a row is clicked.
     * @param {Array} data - The row data.
     * @returns {string} The HTML representation of the call records.
     */
    showRecords(data) {
        let htmlPlayer = '<table class="ui very basic table cdr-player"><tbody>';
        data[4].forEach((record, i) => {
            if (i > 0) {
                htmlPlayer += '<td><tr></tr></td>';
                htmlPlayer += '<td><tr></tr></td>';
            }
            if (record.recordingfile === undefined
                || record.recordingfile === null
                || record.recordingfile.length === 0) {

                htmlPlayer += `

<tr class="detail-record-row disabled" id="${record.id}">
   	<td class="one wide"></td>
   	<td class="one wide right aligned">
   		<i class="ui icon play"></i>
	   	<audio preload="metadata" id="audio-player-${record.id}" src=""></audio>
	</td>
    <td class="five wide">
    	<div class="ui range cdr-player" data-value="${record.id}"></div>
    </td>
    <td class="one wide"><span class="cdr-duration"></span></td>
    <td class="one wide">
    	<i class="ui icon download" data-value=""></i>
    </td>
    <td class="right aligned"><span class="need-update">${record.src_num}</span></td>
    <td class="one wide center aligned"><i class="icon exchange"></i></td>
   	<td class="left aligned"><span class="need-update">${record.dst_num}</span></td>
</tr>`;
            } else {
                // Use token-based URLs instead of direct file paths
                // WHY: Security - hides actual file paths from user
                // Two separate endpoints: :playback (inline) and :download (file)
                const playbackUrl = record.playback_url || '';
                const downloadUrl = record.download_url || '';

                htmlPlayer += `

<tr class="detail-record-row" id="${record.id}">
   	<td class="one wide"></td>
   	<td class="one wide right aligned">
   		<i class="ui icon play"></i>
	   	<audio preload="metadata" id="audio-player-${record.id}" src="${playbackUrl}"></audio>
	</td>
    <td class="five wide">
    	<div class="ui range cdr-player" data-value="${record.id}"></div>
    </td>
    <td class="one wide"><span class="cdr-duration"></span></td>
    <td class="one wide">
    	<i class="ui icon download" data-value="${downloadUrl}"></i>
    </td>
    <td class="right aligned"><span class="need-update">${record.src_num}</span></td>
    <td class="one wide center aligned"><i class="icon exchange"></i></td>
   	<td class="left aligned"><span class="need-update">${record.dst_num}</span></td>
</tr>`;
            }
        });
        htmlPlayer += '</tbody></table>';
        return htmlPlayer;
    },

    /**
     * Gets the page length for DataTable, considering user's saved preference
     * @returns {number}
     */
    getPageLength() {
        // Get the user's saved value or use the automatically calculated value if none exists
        const savedPageLength = localStorage.getItem('cdrTablePageLength');
        return savedPageLength ? parseInt(savedPageLength, 10) : callDetailRecords.calculatePageLength();
    },

    /**
     * Calculates the number of rows that can fit on a page based on the current window height.
     * @returns {number}
     */
    calculatePageLength() {
        // Calculate row height
        let rowHeight = callDetailRecords.$cdrTable.find('tbody > tr').first().outerHeight();

        // Calculate window height and available space for table
        const windowHeight = window.innerHeight;
        const headerFooterHeight = 400; // Estimate height for header, footer, and other elements

        // Calculate new page length
        return Math.max(Math.floor((windowHeight - headerFooterHeight) / rowHeight), 5);
    },
    /**
     * Initializes the date range selector.
     * @param {moment} startDate - Optional earliest record date from last 100 records
     * @param {moment} endDate - Optional latest record date from last 100 records
     */
    initializeDateRangeSelector(startDate = null, endDate = null) {
        const options = {};

        options.ranges = {
            [globalTranslate.cal_Today]: [moment(), moment()],
            [globalTranslate.cal_Yesterday]: [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            [globalTranslate.cal_LastWeek]: [moment().subtract(6, 'days'), moment()],
            [globalTranslate.cal_Last30Days]: [moment().subtract(29, 'days'), moment()],
            [globalTranslate.cal_ThisMonth]: [moment().startOf('month'), moment().endOf('month')],
            [globalTranslate.cal_LastMonth]: [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
        };
        options.alwaysShowCalendars = true;
        options.autoUpdateInput = true;
        options.linkedCalendars = true;
        options.maxDate = moment();
        options.locale = {
            format: 'DD/MM/YYYY',
            separator: ' - ',
            applyLabel: globalTranslate.cal_ApplyBtn,
            cancelLabel: globalTranslate.cal_CancelBtn,
            fromLabel: globalTranslate.cal_from,
            toLabel: globalTranslate.cal_to,
            customRangeLabel: globalTranslate.cal_CustomPeriod,
            daysOfWeek: SemanticLocalization.calendarText.days,
            monthNames: SemanticLocalization.calendarText.months,
            firstDay: 1,
        };

        // If we have date range from last 100 records, use it
        // WHY: Provides meaningful context - user sees period covering recent calls
        if (startDate && endDate) {
            options.startDate = moment(startDate).startOf('day');
            options.endDate = moment(endDate).endOf('day');
        } else {
            // Fallback to today if no records
            options.startDate = moment();
            options.endDate = moment();
        }

        callDetailRecords.$dateRangeSelector.daterangepicker(
            options,
            callDetailRecords.cbDateRangeSelectorOnSelect,
        );

        // Note: Don't call applyFilter here - DataTable is not initialized yet
        // DataTable will load data automatically after initialization
    },


    /**
     * Handles the date range selector select event.
     * @param {moment.Moment} start - The start date.
     * @param {moment.Moment} end - The end date.
     * @param {string} label - The label.
     */
    cbDateRangeSelectorOnSelect(start, end, label) {
        // Only pass search keyword, dates are read directly from date range selector
        callDetailRecords.applyFilter(callDetailRecords.$globalSearch.val());
    },

    /**
     * Applies the filter to the data table.
     * @param {string} text - The filter text.
     */
    applyFilter(text) {
        callDetailRecords.dataTable.search(text).draw();
        callDetailRecords.$globalSearch.closest('div').addClass('loading');
    },
};

/**
 *  Initialize CDR table on document ready
 */
$(document).ready(() => {
    callDetailRecords.initialize();
});
