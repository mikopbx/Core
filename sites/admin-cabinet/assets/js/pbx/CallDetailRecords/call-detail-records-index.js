"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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
var callDetailRecords = {
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
   * Storage key for filter state in sessionStorage
   * @type {string}
   */
  STORAGE_KEY: 'cdr_filters_state',

  /**
   * Flag to track if DataTable has completed initialization
   * WHY: Prevents saving state during initial load before filters are restored
   * @type {boolean}
   */
  isInitialized: false,

  /**
   * Initializes the call detail records.
   */
  initialize: function initialize() {
    // Check for reset hash FIRST, before any other initialization
    if (window.location.hash === '#reset-cache') {
      callDetailRecords.clearFiltersState(); // Also clear page length preference

      localStorage.removeItem('cdrTablePageLength'); // Remove hash from URL without page reload

      history.replaceState(null, null, window.location.pathname);
    } // Fetch metadata first, then initialize DataTable with proper date range
    // WHY: Prevents double request on page load


    callDetailRecords.fetchLatestCDRDate();
  },

  /**
   * Save current filter state to sessionStorage
   * Stores date range, search text, current page, and page length
   */
  saveFiltersState: function saveFiltersState() {
    try {
      // Feature detection - exit silently if sessionStorage not available
      if (typeof sessionStorage === 'undefined') {
        console.warn('[CDR] sessionStorage not available');
        return;
      }

      var state = {
        dateFrom: null,
        dateTo: null,
        searchText: '',
        currentPage: 0,
        pageLength: callDetailRecords.getPageLength()
      }; // Get dates from daterangepicker instance

      var dateRangePicker = callDetailRecords.$dateRangeSelector.data('daterangepicker');

      if (dateRangePicker && dateRangePicker.startDate && dateRangePicker.endDate) {
        state.dateFrom = dateRangePicker.startDate.format('YYYY-MM-DD');
        state.dateTo = dateRangePicker.endDate.format('YYYY-MM-DD');
      } // Get search text from input field


      state.searchText = callDetailRecords.$globalSearch.val() || ''; // Get current page from DataTable (if initialized)

      if (callDetailRecords.dataTable && callDetailRecords.dataTable.page) {
        var pageInfo = callDetailRecords.dataTable.page.info();
        state.currentPage = pageInfo.page;
      }

      sessionStorage.setItem(callDetailRecords.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('[CDR] Failed to save filters to sessionStorage:', error);
    }
  },

  /**
   * Load filter state from sessionStorage
   * @returns {Object|null} Saved state object or null if not found/invalid
   */
  loadFiltersState: function loadFiltersState() {
    try {
      // Feature detection - return null if sessionStorage not available
      if (typeof sessionStorage === 'undefined') {
        console.warn('[CDR] sessionStorage not available for loading');
        return null;
      }

      var rawData = sessionStorage.getItem(callDetailRecords.STORAGE_KEY);

      if (!rawData) {
        return null;
      }

      var state = JSON.parse(rawData); // Validate state structure

      if (!state || _typeof(state) !== 'object') {
        callDetailRecords.clearFiltersState();
        return null;
      }

      return state;
    } catch (error) {
      console.error('[CDR] Failed to load filters from sessionStorage:', error); // Clear corrupted data

      callDetailRecords.clearFiltersState();
      return null;
    }
  },

  /**
   * Clear saved filter state from sessionStorage
   */
  clearFiltersState: function clearFiltersState() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(callDetailRecords.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to clear CDR filters from sessionStorage:', error);
    }
  },

  /**
   * Initialize DataTable and event handlers
   * Called after metadata is received
   */
  initializeDataTableAndHandlers: function initializeDataTableAndHandlers() {
    // Initialize debounce timer variable
    var searchDebounceTimer = null;
    callDetailRecords.$globalSearch.on('keyup', function (e) {
      // Clear previous timer if the user is still typing
      clearTimeout(searchDebounceTimer); // Set a new timer for delayed execution

      searchDebounceTimer = setTimeout(function () {
        if (e.keyCode === 13 || e.keyCode === 8 || callDetailRecords.$globalSearch.val().length === 0) {
          // Only pass the search keyword, dates are handled separately
          var text = callDetailRecords.$globalSearch.val();
          callDetailRecords.applyFilter(text);
        }
      }, 500); // 500ms delay before executing the search
    });
    callDetailRecords.$cdrTable.dataTable({
      search: {
        search: callDetailRecords.$globalSearch.val()
      },
      serverSide: true,
      processing: true,
      columns: [{
        data: null,
        orderable: false
      }, // 0: expand icon column
      {
        data: 0
      }, // 1: date (array index 0)
      {
        data: 1
      }, // 2: src_num (array index 1)
      {
        data: 2
      }, // 3: dst_num (array index 2)
      {
        data: 3
      }, // 4: duration (array index 3)
      {
        data: null,
        orderable: false
      } // 5: delete button column
      ],
      columnDefs: [{
        defaultContent: "-",
        targets: "_all"
      }],
      ajax: {
        url: '/pbxcore/api/v3/cdr',
        type: 'GET',
        // REST API uses GET for list retrieval
        data: function data(d) {
          var params = {};
          var isLinkedIdSearch = false; // 1. Always get dates from date range selector using daterangepicker API

          var dateRangePicker = callDetailRecords.$dateRangeSelector.data('daterangepicker');

          if (dateRangePicker) {
            var startDate = dateRangePicker.startDate;
            var endDate = dateRangePicker.endDate;

            if (startDate && startDate.isValid() && endDate && endDate.isValid()) {
              params.dateFrom = startDate.format('YYYY-MM-DD');
              params.dateTo = endDate.endOf('day').format('YYYY-MM-DD HH:mm:ss');
            }
          } // 2. Process search keyword from search input field


          var searchKeyword = d.search.value || '';

          if (searchKeyword.trim()) {
            var keyword = searchKeyword.trim(); // Parse search prefixes: src:, dst:, did:, linkedid:

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
              isLinkedIdSearch = true; // Remove date params for linkedid search

              delete params.dateFrom;
              delete params.dateTo;
            } else {
              // Full-text search: search in src_num, dst_num, and DID
              // WHY: User expects search without prefix to find number anywhere
              params.search = keyword;
            }
          } // REST API pagination parameters


          params.limit = d.length;
          params.offset = d.start;
          params.sort = 'start'; // Sort by call start time for chronological order

          params.order = 'DESC'; // WHY: WebUI always needs grouped records (by linkedid) for proper display
          // Backend defaults to grouped=true, but explicit is better than implicit

          params.grouped = true;
          return params;
        },
        dataSrc: function dataSrc(json) {
          // API returns PBXApiResult structure:
          // {result: true, data: {records: [...], pagination: {...}}}
          if (json.result && json.data) {
            // Extract records and pagination from nested data object
            var restData = json.data.records || [];
            var pagination = json.data.pagination || {}; // Set DataTables pagination properties

            json.recordsTotal = pagination.total || 0;
            json.recordsFiltered = pagination.total || 0; // Transform REST records to DataTable rows

            return callDetailRecords.transformRestToDataTable(restData);
          }

          return [];
        },
        beforeSend: function beforeSend(xhr) {
          // Add Bearer token for API authentication
          if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
            xhr.setRequestHeader('Authorization', "Bearer ".concat(TokenManager.accessToken));
          }
        }
      },
      paging: true,
      //scrollY: $(window).height() - callDetailRecords.$cdrTable.offset().top-150,
      sDom: 'rtip',
      deferRender: true,
      pageLength: callDetailRecords.getPageLength(),
      language: _objectSpread(_objectSpread({}, SemanticLocalization.dataTableLocalisation), {}, {
        emptyTable: callDetailRecords.getEmptyTableMessage(),
        zeroRecords: callDetailRecords.getEmptyTableMessage()
      }),

      /**
       * Constructs the CDR row.
       * @param {HTMLElement} row - The row element.
       * @param {Array} data - The row data.
       */
      createdRow: function createdRow(row, data) {
        if (data.DT_RowClass.indexOf("detailed") >= 0) {
          $('td', row).eq(0).html('<i class="icon caret down"></i>');
        } else {
          $('td', row).eq(0).html('');
        }

        $('td', row).eq(1).html(data[0]);
        $('td', row).eq(2).html(data[1]).addClass('need-update');
        $('td', row).eq(3).html(data[2]).addClass('need-update'); // Duration column (no icons)

        $('td', row).eq(4).html(data[3]).addClass('right aligned'); // Last column: log icon + delete button

        var actionsHtml = ''; // Add log icon if available

        if (data.ids !== '') {
          actionsHtml += "<i data-ids=\"".concat(data.ids, "\" class=\"file alternate outline icon\" style=\"cursor: pointer; margin-right: 8px;\"></i>");
        } // Add delete button
        // WHY: Use two-steps-delete mechanism to prevent accidental deletion
        // First click changes trash icon to close icon, second click deletes
        // Note: ACL check is done server-side in Volt template (column is hidden if no permission)
        // WHY: Use data.DT_RowId which contains linkedid for grouped records


        actionsHtml += "<a href=\"#\" class=\"two-steps-delete delete-record popuped\"\n                                   data-record-id=\"".concat(data.DT_RowId, "\"\n                                   data-content=\"").concat(globalTranslate.cdr_DeleteRecord || 'Delete record', "\">\n                                   <i class=\"icon trash red\" style=\"margin: 0;\"></i>\n                                </a>");
        $('td', row).eq(5).html(actionsHtml).addClass('right aligned');
      },

      /**
       * Draw event - fired once the table has completed a draw.
       */
      drawCallback: function drawCallback() {
        ExtensionsAPI.updatePhonesRepresent('need-update');
        callDetailRecords.togglePaginationControls();
      },

      /**
       * Initialization complete callback - fired after first data load
       * WHY: Restore filters AFTER DataTable has loaded initial data from server
       */
      initComplete: function initComplete() {
        // Set flag FIRST to allow state saving during filter restoration
        callDetailRecords.isInitialized = true; // Now restore filters - draw event will correctly save the restored state

        callDetailRecords.restoreFiltersFromState();
      },
      ordering: false
    });
    callDetailRecords.dataTable = callDetailRecords.$cdrTable.DataTable(); // Initialize the Search component AFTER DataTable is created

    callDetailRecords.$searchCDRInput.search({
      minCharacters: 0,
      searchOnFocus: false,
      searchFields: ['title'],
      showNoResults: false,
      source: [{
        title: globalTranslate.cdr_SearchBySourceNumber,
        value: 'src:'
      }, {
        title: globalTranslate.cdr_SearchByDestNumber,
        value: 'dst:'
      }, {
        title: globalTranslate.cdr_SearchByDID,
        value: 'did:'
      }, {
        title: globalTranslate.cdr_SearchByLinkedID,
        value: 'linkedid:'
      }, {
        title: globalTranslate.cdr_SearchByCustomPhrase,
        value: ''
      }],
      onSelect: function onSelect(result, response) {
        callDetailRecords.$globalSearch.val(result.value);
        callDetailRecords.$searchCDRInput.search('hide results');
        return false;
      }
    }); // Start the search when you click on the icon

    $('#search-icon').on('click', function () {
      callDetailRecords.$globalSearch.focus();
      callDetailRecords.$searchCDRInput.search('query');
    }); // Event listener to save the user's page length selection and update the table

    callDetailRecords.$pageLengthSelector.dropdown({
      onChange: function onChange(pageLength) {
        if (pageLength === 'auto') {
          pageLength = callDetailRecords.calculatePageLength();
          localStorage.removeItem('cdrTablePageLength');
        } else {
          localStorage.setItem('cdrTablePageLength', pageLength);
        }

        callDetailRecords.dataTable.page.len(pageLength).draw();
      }
    });
    callDetailRecords.$pageLengthSelector.on('click', function (event) {
      event.stopPropagation(); // Prevent the event from bubbling
    }); // Set the select input value to the saved value if it exists

    var savedPageLength = localStorage.getItem('cdrTablePageLength');

    if (savedPageLength) {
      callDetailRecords.$pageLengthSelector.dropdown('set value', savedPageLength);
    }

    callDetailRecords.dataTable.on('draw', function () {
      callDetailRecords.$globalSearch.closest('div').removeClass('loading'); // Skip saving state during initial load before filters are restored

      if (!callDetailRecords.isInitialized) {
        return;
      } // Save state after every draw (pagination, search, date change)


      callDetailRecords.saveFiltersState();
    }); // Add event listener for clicking on icon with data-ids (open in new window)
    // WHY: Clicking on icon should open System Diagnostic in new window to view verbose logs

    callDetailRecords.$cdrTable.on('click', '[data-ids]', function (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent row toggle

      var ids = $(e.currentTarget).attr('data-ids');

      if (ids !== undefined && ids !== '') {
        // WHY: Format as query param + hash: ?filter=...#file=...
        // Open in new window to allow viewing logs while keeping CDR table visible
        var url = "".concat(globalRootUrl, "system-diagnostic/index/?filter=").concat(encodeURIComponent(ids), "#file=asterisk%2Fverbose");
        window.open(url, '_blank');
      }
    }); // Add event listener for opening and closing details
    // WHY: Only expand/collapse on first column (caret icon) click, not on action icons

    callDetailRecords.$cdrTable.on('click', 'tr.detailed td:first-child', function (e) {
      var tr = $(e.target).closest('tr');
      var row = callDetailRecords.dataTable.row(tr);

      if (row.child.isShown()) {
        // This row is already open - close it
        row.child.hide();
        tr.removeClass('shown');
      } else {
        // Open this row
        row.child(callDetailRecords.showRecords(row.data())).show();
        tr.addClass('shown');
        row.child().find('.detail-record-row').each(function (index, playerRow) {
          var id = $(playerRow).attr('id');
          return new CDRPlayer(id);
        });
        ExtensionsAPI.updatePhonesRepresent('need-update');
      }
    }); // Handle second click on delete button (after two-steps-delete changes icon to close)
    // WHY: Two-steps-delete mechanism prevents accidental deletion
    // First click: trash → close (by delete-something.js), Second click: execute deletion

    callDetailRecords.$cdrTable.on('click', 'a.delete-record:not(.two-steps-delete)', function (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent row expansion

      var $button = $(e.currentTarget);
      var recordId = $button.attr('data-record-id');

      if (!recordId) {
        return;
      } // Add loading state


      $button.addClass('disabled loading'); // Always delete with recordings and linked records

      callDetailRecords.deleteRecord(recordId, $button);
    });
  },

  /**
   * Restore filters from saved state after DataTable initialization
   * WHY: Must be called after DataTable is created to restore search and page
   */
  restoreFiltersFromState: function restoreFiltersFromState() {
    var savedState = callDetailRecords.loadFiltersState();

    if (!savedState) {
      return;
    } // Restore search text to input field


    if (savedState.searchText) {
      callDetailRecords.$globalSearch.val(savedState.searchText); // Apply search to DataTable

      callDetailRecords.dataTable.search(savedState.searchText);
    } // Restore page number with delay
    // WHY: DataTable ignores page() during initComplete, need setTimeout to allow initialization to fully complete


    if (savedState.currentPage) {
      setTimeout(function () {
        callDetailRecords.dataTable.page(savedState.currentPage).draw(false);
      }, 100);
    } else if (savedState.searchText) {
      // If only search text exists, still need to draw
      callDetailRecords.dataTable.draw();
    }
  },

  /**
   * Delete CDR record via REST API
   * WHY: Deletes by linkedid - automatically removes entire conversation with all linked records
   * @param {string} recordId - CDR linkedid (like "mikopbx-1760784793.4627")
   * @param {jQuery} $button - Button element to update state
   */
  deleteRecord: function deleteRecord(recordId, $button) {
    // Always delete with recording files
    // WHY: linkedid automatically deletes all linked records (no deleteLinked parameter needed)
    CdrAPI.deleteRecord(recordId, {
      deleteRecording: true
    }, function (response) {
      $button.removeClass('loading disabled');

      if (response && response.result === true) {
        // Silently reload the DataTable to reflect changes
        // WHY: Visual feedback (disappearing row) is enough, no need for success toast
        callDetailRecords.dataTable.ajax.reload(null, false);
      } else {
        var _response$messages, _response$messages$er;

        // Show error message only on failure
        var errorMsg = (response === null || response === void 0 ? void 0 : (_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : (_response$messages$er = _response$messages.error) === null || _response$messages$er === void 0 ? void 0 : _response$messages$er[0]) || globalTranslate.cdr_DeleteFailed || 'Failed to delete record';
        UserMessage.showError(errorMsg);
      }
    });
  },

  /**
   * Toggles the pagination controls visibility based on data size
   */
  togglePaginationControls: function togglePaginationControls() {
    var info = callDetailRecords.dataTable.page.info();

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
  fetchLatestCDRDate: function fetchLatestCDRDate() {
    // Check for saved state first
    var savedState = callDetailRecords.loadFiltersState();
    CdrAPI.getMetadata({
      limit: 100
    }, function (data) {
      if (data && data.hasRecords) {
        var startDate, endDate; // If we have saved state with dates, use those instead of metadata

        if (savedState && savedState.dateFrom && savedState.dateTo) {
          startDate = moment(savedState.dateFrom);
          endDate = moment(savedState.dateTo);
        } else {
          // Convert metadata date strings to moment objects
          startDate = moment(data.earliestDate);
          endDate = moment(data.latestDate);
        }

        callDetailRecords.hasCDRRecords = true;
        callDetailRecords.initializeDateRangeSelector(startDate, endDate); // Initialize DataTable only if we have records
        // WHY: DataTable needs date range to be set first

        callDetailRecords.initializeDataTableAndHandlers();
      } else {
        // No records in database at all or API error
        callDetailRecords.hasCDRRecords = false;
        callDetailRecords.showEmptyDatabasePlaceholder(); // Don't initialize DataTable at all - just show placeholder
      }
    });
  },

  /**
   * Gets a styled empty table message
   * @returns {string} HTML message for empty table
   */
  getEmptyTableMessage: function getEmptyTableMessage() {
    // If database is empty, we don't show this message in table
    if (!callDetailRecords.hasCDRRecords) {
      return '';
    } // Show filtered empty state message


    return "\n        <div class=\"ui placeholder segment\">\n            <div class=\"ui icon header\">\n                <i class=\"search icon\"></i>\n                ".concat(globalTranslate.cdr_FilteredEmptyTitle, "\n            </div>\n            <div class=\"inline\">\n                <div class=\"ui text\">\n                    ").concat(globalTranslate.cdr_FilteredEmptyDescription, "\n                </div>\n            </div>\n        </div>");
  },

  /**
   * Shows the empty database placeholder and hides the table
   */
  showEmptyDatabasePlaceholder: function showEmptyDatabasePlaceholder() {
    // Hide the table itself (DataTable won't be initialized)
    callDetailRecords.$cdrTable.hide(); // Hide search and date controls

    $('#date-range-selector').closest('.ui.row').hide(); // Show placeholder

    callDetailRecords.$emptyDatabasePlaceholder.show();
  },

  /**
   * Transform REST API grouped records to DataTable row format
   * @param {Array} restData - Array of grouped CDR records from REST API
   * @returns {Array} Array of DataTable rows
   */
  transformRestToDataTable: function transformRestToDataTable(restData) {
    return restData.map(function (group) {
      // Calculate timing display
      var billsec = group.totalBillsec || 0;
      var timeFormat = billsec < 3600 ? 'mm:ss' : 'HH:mm:ss';
      var timing = billsec > 0 ? moment.utc(billsec * 1000).format(timeFormat) : ''; // Format start date

      var formattedDate = moment(group.start).format('DD-MM-YYYY HH:mm:ss'); // Extract recording records - filter only records with actual recording files

      var recordings = (group.records || []).filter(function (r) {
        return r.recordingfile && r.recordingfile.length > 0;
      }).map(function (r) {
        return {
          id: r.id,
          src_num: r.src_num,
          dst_num: r.dst_num,
          recordingfile: r.recordingfile,
          playback_url: r.playback_url,
          // Token-based URL for playback
          download_url: r.download_url // Token-based URL for download

        };
      }); // Determine CSS class

      var hasRecordings = recordings.length > 0;
      var isAnswered = group.disposition === 'ANSWERED';
      var dtRowClass = hasRecordings ? 'detailed' : 'ui';
      var negativeClass = isAnswered ? '' : ' negative'; // Collect verbose call IDs

      var ids = (group.records || []).map(function (r) {
        return r.verbose_call_id;
      }).filter(function (id) {
        return id && id.length > 0;
      }).join('&'); // Return DataTable row format
      // DataTables needs both array indices AND special properties

      var row = [formattedDate, // 0: date
      group.src_num, // 1: source number
      group.dst_num || group.did, // 2: destination number or DID
      timing, // 3: duration
      recordings, // 4: recording records array
      group.disposition // 5: disposition
      ]; // Add DataTables special properties

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
  showRecords: function showRecords(data) {
    var htmlPlayer = '<table class="ui very basic table cdr-player"><tbody>';
    data[4].forEach(function (record, i) {
      if (i > 0) {
        htmlPlayer += '<td><tr></tr></td>';
        htmlPlayer += '<td><tr></tr></td>';
      }

      if (record.recordingfile === undefined || record.recordingfile === null || record.recordingfile.length === 0) {
        htmlPlayer += "\n\n<tr class=\"detail-record-row disabled\" id=\"".concat(record.id, "\">\n   \t<td class=\"one wide\"></td>\n   \t<td class=\"one wide right aligned\">\n   \t\t<i class=\"ui icon play\"></i>\n\t   \t<audio preload=\"metadata\" id=\"audio-player-").concat(record.id, "\" src=\"\"></audio>\n\t</td>\n    <td class=\"five wide\">\n    \t<div class=\"ui range cdr-player\" data-value=\"").concat(record.id, "\"></div>\n    </td>\n    <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n    <td class=\"one wide\">\n    \t<i class=\"ui icon download\" data-value=\"\"></i>\n    </td>\n    <td class=\"right aligned\"><span class=\"need-update\">").concat(record.src_num, "</span></td>\n    <td class=\"one wide center aligned\"><i class=\"icon exchange\"></i></td>\n   \t<td class=\"left aligned\"><span class=\"need-update\">").concat(record.dst_num, "</span></td>\n</tr>");
      } else {
        // Use token-based URLs instead of direct file paths
        // WHY: Security - hides actual file paths from user
        // Two separate endpoints: :playback (inline) and :download (file)
        var playbackUrl = record.playback_url || '';
        var downloadUrl = record.download_url || '';
        htmlPlayer += "\n\n<tr class=\"detail-record-row\" id=\"".concat(record.id, "\">\n   \t<td class=\"one wide\"></td>\n   \t<td class=\"one wide right aligned\">\n   \t\t<i class=\"ui icon play\"></i>\n\t   \t<audio preload=\"metadata\" id=\"audio-player-").concat(record.id, "\" src=\"").concat(playbackUrl, "\"></audio>\n\t</td>\n    <td class=\"five wide\">\n    \t<div class=\"ui range cdr-player\" data-value=\"").concat(record.id, "\"></div>\n    </td>\n    <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n    <td class=\"one wide\">\n    \t<div class=\"ui compact icon top left pointing dropdown download-format-dropdown\" data-download-url=\"").concat(downloadUrl, "\">\n    \t\t<i class=\"download icon\"></i>\n    \t\t<div class=\"menu\">\n    \t\t\t<div class=\"item\" data-format=\"webm\">WebM (Opus)</div>\n    \t\t\t<div class=\"item\" data-format=\"mp3\">MP3</div>\n    \t\t\t<div class=\"item\" data-format=\"wav\">WAV</div>\n    \t\t\t<div class=\"item\" data-format=\"ogg\">OGG (Opus)</div>\n    \t\t</div>\n    \t</div>\n    </td>\n    <td class=\"right aligned\"><span class=\"need-update\">").concat(record.src_num, "</span></td>\n    <td class=\"one wide center aligned\"><i class=\"icon exchange\"></i></td>\n   \t<td class=\"left aligned\"><span class=\"need-update\">").concat(record.dst_num, "</span></td>\n</tr>");
      }
    });
    htmlPlayer += '</tbody></table>';
    return htmlPlayer;
  },

  /**
   * Gets the page length for DataTable, considering user's saved preference
   * @returns {number}
   */
  getPageLength: function getPageLength() {
    // Get the user's saved value or use the automatically calculated value if none exists
    var savedPageLength = localStorage.getItem('cdrTablePageLength');
    return savedPageLength ? parseInt(savedPageLength, 10) : callDetailRecords.calculatePageLength();
  },

  /**
   * Calculates the number of rows that can fit on a page based on the current window height.
   * @returns {number}
   */
  calculatePageLength: function calculatePageLength() {
    // Calculate row height
    var rowHeight = callDetailRecords.$cdrTable.find('tbody > tr').first().outerHeight(); // Calculate window height and available space for table

    var windowHeight = window.innerHeight;
    var headerFooterHeight = 400; // Estimate height for header, footer, and other elements
    // Calculate new page length

    return Math.max(Math.floor((windowHeight - headerFooterHeight) / rowHeight), 5);
  },

  /**
   * Initializes the date range selector.
   * @param {moment} startDate - Optional earliest record date from last 100 records
   * @param {moment} endDate - Optional latest record date from last 100 records
   */
  initializeDateRangeSelector: function initializeDateRangeSelector() {
    var _options$ranges;

    var startDate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var endDate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var options = {};
    options.ranges = (_options$ranges = {}, _defineProperty(_options$ranges, globalTranslate.cal_Today, [moment(), moment()]), _defineProperty(_options$ranges, globalTranslate.cal_Yesterday, [moment().subtract(1, 'days'), moment().subtract(1, 'days')]), _defineProperty(_options$ranges, globalTranslate.cal_LastWeek, [moment().subtract(6, 'days'), moment()]), _defineProperty(_options$ranges, globalTranslate.cal_Last30Days, [moment().subtract(29, 'days'), moment()]), _defineProperty(_options$ranges, globalTranslate.cal_ThisMonth, [moment().startOf('month'), moment().endOf('month')]), _defineProperty(_options$ranges, globalTranslate.cal_LastMonth, [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]), _options$ranges);
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
      firstDay: 1
    }; // If we have date range from last 100 records, use it
    // WHY: Provides meaningful context - user sees period covering recent calls

    if (startDate && endDate) {
      options.startDate = moment(startDate).startOf('day');
      options.endDate = moment(endDate).endOf('day');
    } else {
      // Fallback to today if no records
      options.startDate = moment();
      options.endDate = moment();
    }

    callDetailRecords.$dateRangeSelector.daterangepicker(options, callDetailRecords.cbDateRangeSelectorOnSelect); // Note: Don't call applyFilter here - DataTable is not initialized yet
    // DataTable will load data automatically after initialization
  },

  /**
   * Handles the date range selector select event.
   * @param {moment.Moment} start - The start date.
   * @param {moment.Moment} end - The end date.
   * @param {string} label - The label.
   */
  cbDateRangeSelectorOnSelect: function cbDateRangeSelectorOnSelect(start, end, label) {
    // Only pass search keyword, dates are read directly from date range selector
    callDetailRecords.applyFilter(callDetailRecords.$globalSearch.val()); // State will be saved automatically in draw event after filter is applied
  },

  /**
   * Applies the filter to the data table.
   * @param {string} text - The filter text.
   */
  applyFilter: function applyFilter(text) {
    callDetailRecords.dataTable.search(text).draw();
    callDetailRecords.$globalSearch.closest('div').addClass('loading');
  }
};
/**
 *  Initialize CDR table on document ready
 */

$(document).ready(function () {
  callDetailRecords.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCIkc2VhcmNoQ0RSSW5wdXQiLCIkcGFnZUxlbmd0aFNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImhhc0NEUlJlY29yZHMiLCIkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiU1RPUkFHRV9LRVkiLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsIndpbmRvdyIsImxvY2F0aW9uIiwiaGFzaCIsImNsZWFyRmlsdGVyc1N0YXRlIiwibG9jYWxTdG9yYWdlIiwicmVtb3ZlSXRlbSIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJwYXRobmFtZSIsImZldGNoTGF0ZXN0Q0RSRGF0ZSIsInNhdmVGaWx0ZXJzU3RhdGUiLCJzZXNzaW9uU3RvcmFnZSIsImNvbnNvbGUiLCJ3YXJuIiwic3RhdGUiLCJkYXRlRnJvbSIsImRhdGVUbyIsInNlYXJjaFRleHQiLCJjdXJyZW50UGFnZSIsInBhZ2VMZW5ndGgiLCJnZXRQYWdlTGVuZ3RoIiwiZGF0ZVJhbmdlUGlja2VyIiwiZGF0YSIsInN0YXJ0RGF0ZSIsImVuZERhdGUiLCJmb3JtYXQiLCJ2YWwiLCJwYWdlIiwicGFnZUluZm8iLCJpbmZvIiwic2V0SXRlbSIsIkpTT04iLCJzdHJpbmdpZnkiLCJlcnJvciIsImxvYWRGaWx0ZXJzU3RhdGUiLCJyYXdEYXRhIiwiZ2V0SXRlbSIsInBhcnNlIiwiaW5pdGlhbGl6ZURhdGFUYWJsZUFuZEhhbmRsZXJzIiwic2VhcmNoRGVib3VuY2VUaW1lciIsIm9uIiwiZSIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJrZXlDb2RlIiwibGVuZ3RoIiwidGV4dCIsImFwcGx5RmlsdGVyIiwic2VhcmNoIiwic2VydmVyU2lkZSIsInByb2Nlc3NpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwiY29sdW1uRGVmcyIsImRlZmF1bHRDb250ZW50IiwidGFyZ2V0cyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInBhcmFtcyIsImlzTGlua2VkSWRTZWFyY2giLCJpc1ZhbGlkIiwiZW5kT2YiLCJzZWFyY2hLZXl3b3JkIiwidmFsdWUiLCJ0cmltIiwia2V5d29yZCIsInN0YXJ0c1dpdGgiLCJzcmNfbnVtIiwic3Vic3RyaW5nIiwiZHN0X251bSIsImRpZCIsImxpbmtlZGlkIiwibGltaXQiLCJvZmZzZXQiLCJzdGFydCIsInNvcnQiLCJvcmRlciIsImdyb3VwZWQiLCJkYXRhU3JjIiwianNvbiIsInJlc3VsdCIsInJlc3REYXRhIiwicmVjb3JkcyIsInBhZ2luYXRpb24iLCJyZWNvcmRzVG90YWwiLCJ0b3RhbCIsInJlY29yZHNGaWx0ZXJlZCIsInRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZSIsImJlZm9yZVNlbmQiLCJ4aHIiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsInNldFJlcXVlc3RIZWFkZXIiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZW1wdHlUYWJsZSIsImdldEVtcHR5VGFibGVNZXNzYWdlIiwiemVyb1JlY29yZHMiLCJjcmVhdGVkUm93Iiwicm93IiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiYWRkQ2xhc3MiLCJhY3Rpb25zSHRtbCIsImlkcyIsIkRUX1Jvd0lkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2RyX0RlbGV0ZVJlY29yZCIsImRyYXdDYWxsYmFjayIsIkV4dGVuc2lvbnNBUEkiLCJ1cGRhdGVQaG9uZXNSZXByZXNlbnQiLCJ0b2dnbGVQYWdpbmF0aW9uQ29udHJvbHMiLCJpbml0Q29tcGxldGUiLCJyZXN0b3JlRmlsdGVyc0Zyb21TdGF0ZSIsIm9yZGVyaW5nIiwiRGF0YVRhYmxlIiwibWluQ2hhcmFjdGVycyIsInNlYXJjaE9uRm9jdXMiLCJzZWFyY2hGaWVsZHMiLCJzaG93Tm9SZXN1bHRzIiwic291cmNlIiwidGl0bGUiLCJjZHJfU2VhcmNoQnlTb3VyY2VOdW1iZXIiLCJjZHJfU2VhcmNoQnlEZXN0TnVtYmVyIiwiY2RyX1NlYXJjaEJ5RElEIiwiY2RyX1NlYXJjaEJ5TGlua2VkSUQiLCJjZHJfU2VhcmNoQnlDdXN0b21QaHJhc2UiLCJvblNlbGVjdCIsInJlc3BvbnNlIiwiZm9jdXMiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxlbiIsImRyYXciLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNhdmVkUGFnZUxlbmd0aCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInByZXZlbnREZWZhdWx0IiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmRlZmluZWQiLCJnbG9iYWxSb290VXJsIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwib3BlbiIsInRyIiwidGFyZ2V0IiwiY2hpbGQiLCJpc1Nob3duIiwiaGlkZSIsInNob3dSZWNvcmRzIiwic2hvdyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJwbGF5ZXJSb3ciLCJpZCIsIkNEUlBsYXllciIsIiRidXR0b24iLCJyZWNvcmRJZCIsImRlbGV0ZVJlY29yZCIsInNhdmVkU3RhdGUiLCJDZHJBUEkiLCJkZWxldGVSZWNvcmRpbmciLCJyZWxvYWQiLCJlcnJvck1zZyIsIm1lc3NhZ2VzIiwiY2RyX0RlbGV0ZUZhaWxlZCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwicGFnZXMiLCJ0YWJsZSIsImNvbnRhaW5lciIsImdldE1ldGFkYXRhIiwiaGFzUmVjb3JkcyIsIm1vbWVudCIsImVhcmxpZXN0RGF0ZSIsImxhdGVzdERhdGUiLCJpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IiLCJzaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiY2RyX0ZpbHRlcmVkRW1wdHlUaXRsZSIsImNkcl9GaWx0ZXJlZEVtcHR5RGVzY3JpcHRpb24iLCJtYXAiLCJncm91cCIsImJpbGxzZWMiLCJ0b3RhbEJpbGxzZWMiLCJ0aW1lRm9ybWF0IiwidGltaW5nIiwidXRjIiwiZm9ybWF0dGVkRGF0ZSIsInJlY29yZGluZ3MiLCJmaWx0ZXIiLCJyIiwicmVjb3JkaW5nZmlsZSIsInBsYXliYWNrX3VybCIsImRvd25sb2FkX3VybCIsImhhc1JlY29yZGluZ3MiLCJpc0Fuc3dlcmVkIiwiZGlzcG9zaXRpb24iLCJkdFJvd0NsYXNzIiwibmVnYXRpdmVDbGFzcyIsInZlcmJvc2VfY2FsbF9pZCIsImpvaW4iLCJodG1sUGxheWVyIiwiZm9yRWFjaCIsInJlY29yZCIsImkiLCJwbGF5YmFja1VybCIsImRvd25sb2FkVXJsIiwicGFyc2VJbnQiLCJyb3dIZWlnaHQiLCJmaXJzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJvcHRpb25zIiwicmFuZ2VzIiwiY2FsX1RvZGF5IiwiY2FsX1llc3RlcmRheSIsInN1YnRyYWN0IiwiY2FsX0xhc3RXZWVrIiwiY2FsX0xhc3QzMERheXMiLCJjYWxfVGhpc01vbnRoIiwic3RhcnRPZiIsImNhbF9MYXN0TW9udGgiLCJhbHdheXNTaG93Q2FsZW5kYXJzIiwiYXV0b1VwZGF0ZUlucHV0IiwibGlua2VkQ2FsZW5kYXJzIiwibWF4RGF0ZSIsImxvY2FsZSIsInNlcGFyYXRvciIsImFwcGx5TGFiZWwiLCJjYWxfQXBwbHlCdG4iLCJjYW5jZWxMYWJlbCIsImNhbF9DYW5jZWxCdG4iLCJmcm9tTGFiZWwiLCJjYWxfZnJvbSIsInRvTGFiZWwiLCJjYWxfdG8iLCJjdXN0b21SYW5nZUxhYmVsIiwiY2FsX0N1c3RvbVBlcmlvZCIsImRheXNPZldlZWsiLCJjYWxlbmRhclRleHQiLCJkYXlzIiwibW9udGhOYW1lcyIsIm1vbnRocyIsImZpcnN0RGF5IiwiZGF0ZXJhbmdlcGlja2VyIiwiY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0IiwiZW5kIiwibGFiZWwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFDLFlBQUQsQ0FMVTs7QUFPdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsZUFBRCxDQVhNOztBQWF0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxrQkFBa0IsRUFBRUYsQ0FBQyxDQUFDLHNCQUFELENBakJDOztBQW1CdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsZUFBZSxFQUFFSCxDQUFDLENBQUMsbUJBQUQsQ0F2Qkk7O0FBeUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxtQkFBbUIsRUFBRUosQ0FBQyxDQUFDLHFCQUFELENBN0JBOztBQStCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsU0FBUyxFQUFFLEVBbkNXOztBQXFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLEVBekNhOztBQTJDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLElBL0NPOztBQWlEdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEseUJBQXlCLEVBQUVSLENBQUMsQ0FBQyxpQ0FBRCxDQXJETjs7QUF1RHRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lTLEVBQUFBLFdBQVcsRUFBRSxtQkEzRFM7O0FBNkR0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFB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T0FBUixHQUFrQmlLLE1BQU0sRUFBeEI7QUFDSDs7QUFFRHZNLElBQUFBLGlCQUFpQixDQUFDSSxrQkFBbEIsQ0FBcUMrUSxlQUFyQyxDQUNJaEMsT0FESixFQUVJblAsaUJBQWlCLENBQUNvUiwyQkFGdEIsRUF2QzBELENBNEMxRDtBQUNBO0FBQ0gsR0FsMUJxQjs7QUFxMUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUEsRUFBQUEsMkJBMzFCc0IsdUNBMjFCTTFMLEtBMzFCTixFQTIxQmEyTCxHQTMxQmIsRUEyMUJrQkMsS0EzMUJsQixFQTIxQnlCO0FBQzNDO0FBQ0F0UixJQUFBQSxpQkFBaUIsQ0FBQzZELFdBQWxCLENBQThCN0QsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDcUMsR0FBaEMsRUFBOUIsRUFGMkMsQ0FHM0M7QUFDSCxHQS8xQnFCOztBQWkyQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lxQixFQUFBQSxXQXIyQnNCLHVCQXEyQlZELElBcjJCVSxFQXEyQko7QUFDZDVELElBQUFBLGlCQUFpQixDQUFDTyxTQUFsQixDQUE0QnVELE1BQTVCLENBQW1DRixJQUFuQyxFQUF5Q2dHLElBQXpDO0FBQ0E1SixJQUFBQSxpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0M2SixPQUFoQyxDQUF3QyxLQUF4QyxFQUErQ3BDLFFBQS9DLENBQXdELFNBQXhEO0FBQ0g7QUF4MkJxQixDQUExQjtBQTIyQkE7QUFDQTtBQUNBOztBQUNBMUgsQ0FBQyxDQUFDcVIsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnhSLEVBQUFBLGlCQUFpQixDQUFDYSxVQUFsQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEV4dGVuc2lvbnNBUEksIG1vbWVudCwgZ2xvYmFsVHJhbnNsYXRlLCBDRFJQbGF5ZXIsIENkckFQSSwgVXNlck1lc3NhZ2UsIEFDTEhlbHBlciAqL1xuXG4vKipcbiAqIGNhbGxEZXRhaWxSZWNvcmRzIG1vZHVsZS5cbiAqIEBtb2R1bGUgY2FsbERldGFpbFJlY29yZHNcbiAqL1xuY29uc3QgY2FsbERldGFpbFJlY29yZHMgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIGNhbGwgZGV0YWlsIHJlY29yZHMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjZHJUYWJsZTogJCgnI2Nkci10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWxzZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGF0ZVJhbmdlU2VsZWN0b3I6ICQoJyNkYXRlLXJhbmdlLXNlbGVjdG9yJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2VhcmNoIENEUiBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlYXJjaENEUklucHV0OiAkKCcjc2VhcmNoLWNkci1pbnB1dCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhZ2VMZW5ndGhTZWxlY3RvcjogJCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9mIHBsYXllcnMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHBsYXllcnM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIENEUiBkYXRhYmFzZSBoYXMgYW55IHJlY29yZHNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBoYXNDRFJSZWNvcmRzOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGVtcHR5IGRhdGFiYXNlIHBsYWNlaG9sZGVyIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXI6ICQoJyNjZHItZW1wdHktZGF0YWJhc2UtcGxhY2Vob2xkZXInKSxcblxuICAgIC8qKlxuICAgICAqIFN0b3JhZ2Uga2V5IGZvciBmaWx0ZXIgc3RhdGUgaW4gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIFNUT1JBR0VfS0VZOiAnY2RyX2ZpbHRlcnNfc3RhdGUnLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byB0cmFjayBpZiBEYXRhVGFibGUgaGFzIGNvbXBsZXRlZCBpbml0aWFsaXphdGlvblxuICAgICAqIFdIWTogUHJldmVudHMgc2F2aW5nIHN0YXRlIGR1cmluZyBpbml0aWFsIGxvYWQgYmVmb3JlIGZpbHRlcnMgYXJlIHJlc3RvcmVkXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgY2FsbCBkZXRhaWwgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDaGVjayBmb3IgcmVzZXQgaGFzaCBGSVJTVCwgYmVmb3JlIGFueSBvdGhlciBpbml0aWFsaXphdGlvblxuICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggPT09ICcjcmVzZXQtY2FjaGUnKSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jbGVhckZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICAgICAgLy8gQWxzbyBjbGVhciBwYWdlIGxlbmd0aCBwcmVmZXJlbmNlXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgaGFzaCBmcm9tIFVSTCB3aXRob3V0IHBhZ2UgcmVsb2FkXG4gICAgICAgICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZShudWxsLCBudWxsLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggbWV0YWRhdGEgZmlyc3QsIHRoZW4gaW5pdGlhbGl6ZSBEYXRhVGFibGUgd2l0aCBwcm9wZXIgZGF0ZSByYW5nZVxuICAgICAgICAvLyBXSFk6IFByZXZlbnRzIGRvdWJsZSByZXF1ZXN0IG9uIHBhZ2UgbG9hZFxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5mZXRjaExhdGVzdENEUkRhdGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZSBjdXJyZW50IGZpbHRlciBzdGF0ZSB0byBzZXNzaW9uU3RvcmFnZVxuICAgICAqIFN0b3JlcyBkYXRlIHJhbmdlLCBzZWFyY2ggdGV4dCwgY3VycmVudCBwYWdlLCBhbmQgcGFnZSBsZW5ndGhcbiAgICAgKi9cbiAgICBzYXZlRmlsdGVyc1N0YXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRmVhdHVyZSBkZXRlY3Rpb24gLSBleGl0IHNpbGVudGx5IGlmIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvblN0b3JhZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQ0RSXSBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICBkYXRlRnJvbTogbnVsbCxcbiAgICAgICAgICAgICAgICBkYXRlVG86IG51bGwsXG4gICAgICAgICAgICAgICAgc2VhcmNoVGV4dDogJycsXG4gICAgICAgICAgICAgICAgY3VycmVudFBhZ2U6IDAsXG4gICAgICAgICAgICAgICAgcGFnZUxlbmd0aDogY2FsbERldGFpbFJlY29yZHMuZ2V0UGFnZUxlbmd0aCgpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBHZXQgZGF0ZXMgZnJvbSBkYXRlcmFuZ2VwaWNrZXIgaW5zdGFuY2VcbiAgICAgICAgICAgIGNvbnN0IGRhdGVSYW5nZVBpY2tlciA9IGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRhKCdkYXRlcmFuZ2VwaWNrZXInKTtcbiAgICAgICAgICAgIGlmIChkYXRlUmFuZ2VQaWNrZXIgJiYgZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZSAmJiBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLmRhdGVGcm9tID0gZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZS5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kYXRlVG8gPSBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZS5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gR2V0IHNlYXJjaCB0ZXh0IGZyb20gaW5wdXQgZmllbGRcbiAgICAgICAgICAgIHN0YXRlLnNlYXJjaFRleHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpIHx8ICcnO1xuXG4gICAgICAgICAgICAvLyBHZXQgY3VycmVudCBwYWdlIGZyb20gRGF0YVRhYmxlIChpZiBpbml0aWFsaXplZClcbiAgICAgICAgICAgIGlmIChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUgJiYgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWdlSW5mbyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmluZm8oKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5jdXJyZW50UGFnZSA9IHBhZ2VJbmZvLnBhZ2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oY2FsbERldGFpbFJlY29yZHMuU1RPUkFHRV9LRVksIEpTT04uc3RyaW5naWZ5KHN0YXRlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbQ0RSXSBGYWlsZWQgdG8gc2F2ZSBmaWx0ZXJzIHRvIHNlc3Npb25TdG9yYWdlOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZpbHRlciBzdGF0ZSBmcm9tIHNlc3Npb25TdG9yYWdlXG4gICAgICogQHJldHVybnMge09iamVjdHxudWxsfSBTYXZlZCBzdGF0ZSBvYmplY3Qgb3IgbnVsbCBpZiBub3QgZm91bmQvaW52YWxpZFxuICAgICAqL1xuICAgIGxvYWRGaWx0ZXJzU3RhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBGZWF0dXJlIGRldGVjdGlvbiAtIHJldHVybiBudWxsIGlmIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvblN0b3JhZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQ0RSXSBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlIGZvciBsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJhd0RhdGEgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGNhbGxEZXRhaWxSZWNvcmRzLlNUT1JBR0VfS0VZKTtcbiAgICAgICAgICAgIGlmICghcmF3RGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzdGF0ZSA9IEpTT04ucGFyc2UocmF3RGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHN0YXRlIHN0cnVjdHVyZVxuICAgICAgICAgICAgaWYgKCFzdGF0ZSB8fCB0eXBlb2Ygc3RhdGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2xlYXJGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0NEUl0gRmFpbGVkIHRvIGxvYWQgZmlsdGVycyBmcm9tIHNlc3Npb25TdG9yYWdlOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGNvcnJ1cHRlZCBkYXRhXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jbGVhckZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgc2F2ZWQgZmlsdGVyIHN0YXRlIGZyb20gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKi9cbiAgICBjbGVhckZpbHRlcnNTdGF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvblN0b3JhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShjYWxsRGV0YWlsUmVjb3Jkcy5TVE9SQUdFX0tFWSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY2xlYXIgQ0RSIGZpbHRlcnMgZnJvbSBzZXNzaW9uU3RvcmFnZTonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEYXRhVGFibGUgYW5kIGV2ZW50IGhhbmRsZXJzXG4gICAgICogQ2FsbGVkIGFmdGVyIG1ldGFkYXRhIGlzIHJlY2VpdmVkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZUFuZEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRlYm91bmNlIHRpbWVyIHZhcmlhYmxlXG4gICAgICAgIGxldCBzZWFyY2hEZWJvdW5jZVRpbWVyID0gbnVsbDtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lciBpZiB0aGUgdXNlciBpcyBzdGlsbCB0eXBpbmdcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWFyY2hEZWJvdW5jZVRpbWVyKTtcblxuICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIGZvciBkZWxheWVkIGV4ZWN1dGlvblxuICAgICAgICAgICAgc2VhcmNoRGVib3VuY2VUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzXG4gICAgICAgICAgICAgICAgICAgIHx8IGUua2V5Q29kZSA9PT0gOFxuICAgICAgICAgICAgICAgICAgICB8fCBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHBhc3MgdGhlIHNlYXJjaCBrZXl3b3JkLCBkYXRlcyBhcmUgaGFuZGxlZCBzZXBhcmF0ZWx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWxheSBiZWZvcmUgZXhlY3V0aW5nIHRoZSBzZWFyY2hcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmRhdGFUYWJsZSh7XG4gICAgICAgICAgICBzZWFyY2g6IHtcbiAgICAgICAgICAgICAgICBzZWFyY2g6IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAgeyBkYXRhOiBudWxsLCBvcmRlcmFibGU6IGZhbHNlIH0sICAvLyAwOiBleHBhbmQgaWNvbiBjb2x1bW5cbiAgICAgICAgICAgICAgICB7IGRhdGE6IDAgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDE6IGRhdGUgKGFycmF5IGluZGV4IDApXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAxIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAyOiBzcmNfbnVtIChhcnJheSBpbmRleCAxKVxuICAgICAgICAgICAgICAgIHsgZGF0YTogMiB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMzogZHN0X251bSAoYXJyYXkgaW5kZXggMilcbiAgICAgICAgICAgICAgICB7IGRhdGE6IDMgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDQ6IGR1cmF0aW9uIChhcnJheSBpbmRleCAzKVxuICAgICAgICAgICAgICAgIHsgZGF0YTogbnVsbCwgb3JkZXJhYmxlOiBmYWxzZSB9ICAgLy8gNTogZGVsZXRlIGJ1dHRvbiBjb2x1bW5cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAgICAgICAgeyBkZWZhdWx0Q29udGVudDogXCItXCIsICB0YXJnZXRzOiBcIl9hbGxcIn0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9jZHInLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdHRVQnLCAgLy8gUkVTVCBBUEkgdXNlcyBHRVQgZm9yIGxpc3QgcmV0cmlldmFsXG4gICAgICAgICAgICAgICAgZGF0YTogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGlzTGlua2VkSWRTZWFyY2ggPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyAxLiBBbHdheXMgZ2V0IGRhdGVzIGZyb20gZGF0ZSByYW5nZSBzZWxlY3RvciB1c2luZyBkYXRlcmFuZ2VwaWNrZXIgQVBJXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVSYW5nZVBpY2tlciA9IGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRhKCdkYXRlcmFuZ2VwaWNrZXInKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGVSYW5nZVBpY2tlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuZERhdGUgPSBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0RGF0ZSAmJiBzdGFydERhdGUuaXNWYWxpZCgpICYmIGVuZERhdGUgJiYgZW5kRGF0ZS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZGF0ZUZyb20gPSBzdGFydERhdGUuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRhdGVUbyA9IGVuZERhdGUuZW5kT2YoJ2RheScpLmZvcm1hdCgnWVlZWS1NTS1ERCBISDptbTpzcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gMi4gUHJvY2VzcyBzZWFyY2gga2V5d29yZCBmcm9tIHNlYXJjaCBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hLZXl3b3JkID0gZC5zZWFyY2gudmFsdWUgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlYXJjaEtleXdvcmQudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXl3b3JkID0gc2VhcmNoS2V5d29yZC50cmltKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHNlYXJjaCBwcmVmaXhlczogc3JjOiwgZHN0OiwgZGlkOiwgbGlua2VkaWQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdzcmM6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgc291cmNlIG51bWJlciBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNyY19udW0gPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnZHN0OicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IGRlc3RpbmF0aW9uIG51bWJlciBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRzdF9udW0gPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnZGlkOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IERJRCBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRpZCA9IGtleXdvcmQuc3Vic3RyaW5nKDQpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdsaW5rZWRpZDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBsaW5rZWRpZCAtIGlnbm9yZSBkYXRlIHJhbmdlIGZvciBsaW5rZWRpZCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMubGlua2VkaWQgPSBrZXl3b3JkLnN1YnN0cmluZyg5KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNMaW5rZWRJZFNlYXJjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRhdGUgcGFyYW1zIGZvciBsaW5rZWRpZCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcGFyYW1zLmRhdGVGcm9tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJhbXMuZGF0ZVRvO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGdWxsLXRleHQgc2VhcmNoOiBzZWFyY2ggaW4gc3JjX251bSwgZHN0X251bSwgYW5kIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlciBleHBlY3RzIHNlYXJjaCB3aXRob3V0IHByZWZpeCB0byBmaW5kIG51bWJlciBhbnl3aGVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zZWFyY2ggPSBrZXl3b3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUkVTVCBBUEkgcGFnaW5hdGlvbiBwYXJhbWV0ZXJzXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5saW1pdCA9IGQubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMub2Zmc2V0ID0gZC5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNvcnQgPSAnc3RhcnQnOyAgLy8gU29ydCBieSBjYWxsIHN0YXJ0IHRpbWUgZm9yIGNocm9ub2xvZ2ljYWwgb3JkZXJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9yZGVyID0gJ0RFU0MnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFdIWTogV2ViVUkgYWx3YXlzIG5lZWRzIGdyb3VwZWQgcmVjb3JkcyAoYnkgbGlua2VkaWQpIGZvciBwcm9wZXIgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICAvLyBCYWNrZW5kIGRlZmF1bHRzIHRvIGdyb3VwZWQ9dHJ1ZSwgYnV0IGV4cGxpY2l0IGlzIGJldHRlciB0aGFuIGltcGxpY2l0XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5ncm91cGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVNyYzogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBUEkgcmV0dXJucyBQQlhBcGlSZXN1bHQgc3RydWN0dXJlOlxuICAgICAgICAgICAgICAgICAgICAvLyB7cmVzdWx0OiB0cnVlLCBkYXRhOiB7cmVjb3JkczogWy4uLl0sIHBhZ2luYXRpb246IHsuLi59fX1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGpzb24ucmVzdWx0ICYmIGpzb24uZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXh0cmFjdCByZWNvcmRzIGFuZCBwYWdpbmF0aW9uIGZyb20gbmVzdGVkIGRhdGEgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN0RGF0YSA9IGpzb24uZGF0YS5yZWNvcmRzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFnaW5hdGlvbiA9IGpzb24uZGF0YS5wYWdpbmF0aW9uIHx8IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgRGF0YVRhYmxlcyBwYWdpbmF0aW9uIHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc1RvdGFsID0gcGFnaW5hdGlvbi50b3RhbCB8fCAwO1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzRmlsdGVyZWQgPSBwYWdpbmF0aW9uLnRvdGFsIHx8IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyYW5zZm9ybSBSRVNUIHJlY29yZHMgdG8gRGF0YVRhYmxlIHJvd3NcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsRGV0YWlsUmVjb3Jkcy50cmFuc2Zvcm1SZXN0VG9EYXRhVGFibGUocmVzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgQmVhcmVyIHRva2VuIGZvciBBUEkgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIC8vc2Nyb2xsWTogJCh3aW5kb3cpLmhlaWdodCgpIC0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9mZnNldCgpLnRvcC0xNTAsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IGNhbGxEZXRhaWxSZWNvcmRzLmdldFBhZ2VMZW5ndGgoKSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiB7XG4gICAgICAgICAgICAgICAgLi4uU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgICAgIGVtcHR5VGFibGU6IGNhbGxEZXRhaWxSZWNvcmRzLmdldEVtcHR5VGFibGVNZXNzYWdlKCksXG4gICAgICAgICAgICAgICAgemVyb1JlY29yZHM6IGNhbGxEZXRhaWxSZWNvcmRzLmdldEVtcHR5VGFibGVNZXNzYWdlKClcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyB0aGUgQ0RSIHJvdy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuRFRfUm93Q2xhc3MuaW5kZXhPZihcImRldGFpbGVkXCIpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBjYXJldCBkb3duXCI+PC9pPicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDEpLmh0bWwoZGF0YVswXSk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGRhdGFbMV0pXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoZGF0YVsyXSlcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuXG4gICAgICAgICAgICAgICAgLy8gRHVyYXRpb24gY29sdW1uIChubyBpY29ucylcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNCkuaHRtbChkYXRhWzNdKS5hZGRDbGFzcygncmlnaHQgYWxpZ25lZCcpO1xuXG4gICAgICAgICAgICAgICAgLy8gTGFzdCBjb2x1bW46IGxvZyBpY29uICsgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGxldCBhY3Rpb25zSHRtbCA9ICcnO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGxvZyBpY29uIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uc0h0bWwgKz0gYDxpIGRhdGEtaWRzPVwiJHtkYXRhLmlkc31cIiBjbGFzcz1cImZpbGUgYWx0ZXJuYXRlIG91dGxpbmUgaWNvblwiIHN0eWxlPVwiY3Vyc29yOiBwb2ludGVyOyBtYXJnaW4tcmlnaHQ6IDhweDtcIj48L2k+YDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlIHR3by1zdGVwcy1kZWxldGUgbWVjaGFuaXNtIHRvIHByZXZlbnQgYWNjaWRlbnRhbCBkZWxldGlvblxuICAgICAgICAgICAgICAgIC8vIEZpcnN0IGNsaWNrIGNoYW5nZXMgdHJhc2ggaWNvbiB0byBjbG9zZSBpY29uLCBzZWNvbmQgY2xpY2sgZGVsZXRlc1xuICAgICAgICAgICAgICAgIC8vIE5vdGU6IEFDTCBjaGVjayBpcyBkb25lIHNlcnZlci1zaWRlIGluIFZvbHQgdGVtcGxhdGUgKGNvbHVtbiBpcyBoaWRkZW4gaWYgbm8gcGVybWlzc2lvbilcbiAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZSBkYXRhLkRUX1Jvd0lkIHdoaWNoIGNvbnRhaW5zIGxpbmtlZGlkIGZvciBncm91cGVkIHJlY29yZHNcbiAgICAgICAgICAgICAgICBhY3Rpb25zSHRtbCArPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInR3by1zdGVwcy1kZWxldGUgZGVsZXRlLXJlY29yZCBwb3B1cGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1yZWNvcmQtaWQ9XCIke2RhdGEuRFRfUm93SWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0RlbGV0ZVJlY29yZCB8fCAnRGVsZXRlIHJlY29yZCd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIiBzdHlsZT1cIm1hcmdpbjogMDtcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5gO1xuXG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDUpLmh0bWwoYWN0aW9uc0h0bWwpLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSW5pdGlhbGl6YXRpb24gY29tcGxldGUgY2FsbGJhY2sgLSBmaXJlZCBhZnRlciBmaXJzdCBkYXRhIGxvYWRcbiAgICAgICAgICAgICAqIFdIWTogUmVzdG9yZSBmaWx0ZXJzIEFGVEVSIERhdGFUYWJsZSBoYXMgbG9hZGVkIGluaXRpYWwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbml0Q29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGZsYWcgRklSU1QgdG8gYWxsb3cgc3RhdGUgc2F2aW5nIGR1cmluZyBmaWx0ZXIgcmVzdG9yYXRpb25cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAvLyBOb3cgcmVzdG9yZSBmaWx0ZXJzIC0gZHJhdyBldmVudCB3aWxsIGNvcnJlY3RseSBzYXZlIHRoZSByZXN0b3JlZCBzdGF0ZVxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLkRhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIFNlYXJjaCBjb21wb25lbnQgQUZURVIgRGF0YVRhYmxlIGlzIGNyZWF0ZWRcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCh7XG4gICAgICAgICAgICBtaW5DaGFyYWN0ZXJzOiAwLFxuICAgICAgICAgICAgc2VhcmNoT25Gb2N1czogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hGaWVsZHM6IFsndGl0bGUnXSxcbiAgICAgICAgICAgIHNob3dOb1Jlc3VsdHM6IGZhbHNlLFxuICAgICAgICAgICAgc291cmNlOiBbXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciwgdmFsdWU6ICdzcmM6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlEZXN0TnVtYmVyLCB2YWx1ZTogJ2RzdDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeURJRCwgdmFsdWU6ICdkaWQ6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlMaW5rZWRJRCwgdmFsdWU6ICdsaW5rZWRpZDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSwgdmFsdWU6ICcnIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb25TZWxlY3Q6IGZ1bmN0aW9uKHJlc3VsdCwgcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbChyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goJ2hpZGUgcmVzdWx0cycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHNlYXJjaCB3aGVuIHlvdSBjbGljayBvbiB0aGUgaWNvblxuICAgICAgICAkKCcjc2VhcmNoLWljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guZm9jdXMoKTtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goJ3F1ZXJ5Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIHRvIHNhdmUgdGhlIHVzZXIncyBwYWdlIGxlbmd0aCBzZWxlY3Rpb24gYW5kIHVwZGF0ZSB0aGUgdGFibGVcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZShwYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VMZW5ndGggPT09ICdhdXRvJykge1xuICAgICAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoID0gY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcsIHBhZ2VMZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHRoZSBldmVudCBmcm9tIGJ1YmJsaW5nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgc2VsZWN0IGlucHV0IHZhbHVlIHRvIHRoZSBzYXZlZCB2YWx1ZSBpZiBpdCBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBzYXZlZFBhZ2VMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBTa2lwIHNhdmluZyBzdGF0ZSBkdXJpbmcgaW5pdGlhbCBsb2FkIGJlZm9yZSBmaWx0ZXJzIGFyZSByZXN0b3JlZFxuICAgICAgICAgICAgaWYgKCFjYWxsRGV0YWlsUmVjb3Jkcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTYXZlIHN0YXRlIGFmdGVyIGV2ZXJ5IGRyYXcgKHBhZ2luYXRpb24sIHNlYXJjaCwgZGF0ZSBjaGFuZ2UpXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5zYXZlRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3IgY2xpY2tpbmcgb24gaWNvbiB3aXRoIGRhdGEtaWRzIChvcGVuIGluIG5ldyB3aW5kb3cpXG4gICAgICAgIC8vIFdIWTogQ2xpY2tpbmcgb24gaWNvbiBzaG91bGQgb3BlbiBTeXN0ZW0gRGlhZ25vc3RpYyBpbiBuZXcgd2luZG93IHRvIHZpZXcgdmVyYm9zZSBsb2dzXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAnW2RhdGEtaWRzXScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHJvdyB0b2dnbGVcblxuICAgICAgICAgICAgY29uc3QgaWRzID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtaWRzJyk7XG4gICAgICAgICAgICBpZiAoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFdIWTogRm9ybWF0IGFzIHF1ZXJ5IHBhcmFtICsgaGFzaDogP2ZpbHRlcj0uLi4jZmlsZT0uLi5cbiAgICAgICAgICAgICAgICAvLyBPcGVuIGluIG5ldyB3aW5kb3cgdG8gYWxsb3cgdmlld2luZyBsb2dzIHdoaWxlIGtlZXBpbmcgQ0RSIHRhYmxlIHZpc2libGVcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBgJHtnbG9iYWxSb290VXJsfXN5c3RlbS1kaWFnbm9zdGljL2luZGV4Lz9maWx0ZXI9JHtlbmNvZGVVUklDb21wb25lbnQoaWRzKX0jZmlsZT1hc3RlcmlzayUyRnZlcmJvc2VgO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5vcGVuKHVybCwgJ19ibGFuaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgZm9yIG9wZW5pbmcgYW5kIGNsb3NpbmcgZGV0YWlsc1xuICAgICAgICAvLyBXSFk6IE9ubHkgZXhwYW5kL2NvbGxhcHNlIG9uIGZpcnN0IGNvbHVtbiAoY2FyZXQgaWNvbikgY2xpY2ssIG5vdCBvbiBhY3Rpb24gaWNvbnNcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICd0ci5kZXRhaWxlZCB0ZDpmaXJzdC1jaGlsZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ciA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucm93KHRyKTtcblxuICAgICAgICAgICAgaWYgKHJvdy5jaGlsZC5pc1Nob3duKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIHJvdyBpcyBhbHJlYWR5IG9wZW4gLSBjbG9zZSBpdFxuICAgICAgICAgICAgICAgIHJvdy5jaGlsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgdHIucmVtb3ZlQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE9wZW4gdGhpcyByb3dcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoY2FsbERldGFpbFJlY29yZHMuc2hvd1JlY29yZHMocm93LmRhdGEoKSkpLnNob3coKTtcbiAgICAgICAgICAgICAgICB0ci5hZGRDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoKS5maW5kKCcuZGV0YWlsLXJlY29yZC1yb3cnKS5lYWNoKChpbmRleCwgcGxheWVyUm93KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gJChwbGF5ZXJSb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ0RSUGxheWVyKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHNlY29uZCBjbGljayBvbiBkZWxldGUgYnV0dG9uIChhZnRlciB0d28tc3RlcHMtZGVsZXRlIGNoYW5nZXMgaWNvbiB0byBjbG9zZSlcbiAgICAgICAgLy8gV0hZOiBUd28tc3RlcHMtZGVsZXRlIG1lY2hhbmlzbSBwcmV2ZW50cyBhY2NpZGVudGFsIGRlbGV0aW9uXG4gICAgICAgIC8vIEZpcnN0IGNsaWNrOiB0cmFzaCDihpIgY2xvc2UgKGJ5IGRlbGV0ZS1zb21ldGhpbmcuanMpLCBTZWNvbmQgY2xpY2s6IGV4ZWN1dGUgZGVsZXRpb25cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICdhLmRlbGV0ZS1yZWNvcmQ6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHJvdyBleHBhbnNpb25cblxuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXJlY29yZC1pZCcpO1xuXG4gICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBZGQgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQgbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBBbHdheXMgZGVsZXRlIHdpdGggcmVjb3JkaW5ncyBhbmQgbGlua2VkIHJlY29yZHNcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRlbGV0ZVJlY29yZChyZWNvcmRJZCwgJGJ1dHRvbik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXN0b3JlIGZpbHRlcnMgZnJvbSBzYXZlZCBzdGF0ZSBhZnRlciBEYXRhVGFibGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBXSFk6IE11c3QgYmUgY2FsbGVkIGFmdGVyIERhdGFUYWJsZSBpcyBjcmVhdGVkIHRvIHJlc3RvcmUgc2VhcmNoIGFuZCBwYWdlXG4gICAgICovXG4gICAgcmVzdG9yZUZpbHRlcnNGcm9tU3RhdGUoKSB7XG4gICAgICAgIGNvbnN0IHNhdmVkU3RhdGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy5sb2FkRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgIGlmICghc2F2ZWRTdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVzdG9yZSBzZWFyY2ggdGV4dCB0byBpbnB1dCBmaWVsZFxuICAgICAgICBpZiAoc2F2ZWRTdGF0ZS5zZWFyY2hUZXh0KSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbChzYXZlZFN0YXRlLnNlYXJjaFRleHQpO1xuICAgICAgICAgICAgLy8gQXBwbHkgc2VhcmNoIHRvIERhdGFUYWJsZVxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaChzYXZlZFN0YXRlLnNlYXJjaFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVzdG9yZSBwYWdlIG51bWJlciB3aXRoIGRlbGF5XG4gICAgICAgIC8vIFdIWTogRGF0YVRhYmxlIGlnbm9yZXMgcGFnZSgpIGR1cmluZyBpbml0Q29tcGxldGUsIG5lZWQgc2V0VGltZW91dCB0byBhbGxvdyBpbml0aWFsaXphdGlvbiB0byBmdWxseSBjb21wbGV0ZVxuICAgICAgICBpZiAoc2F2ZWRTdGF0ZS5jdXJyZW50UGFnZSkge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2Uoc2F2ZWRTdGF0ZS5jdXJyZW50UGFnZSkuZHJhdyhmYWxzZSk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCkge1xuICAgICAgICAgICAgLy8gSWYgb25seSBzZWFyY2ggdGV4dCBleGlzdHMsIHN0aWxsIG5lZWQgdG8gZHJhd1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLmRyYXcoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgQ0RSIHJlY29yZCB2aWEgUkVTVCBBUElcbiAgICAgKiBXSFk6IERlbGV0ZXMgYnkgbGlua2VkaWQgLSBhdXRvbWF0aWNhbGx5IHJlbW92ZXMgZW50aXJlIGNvbnZlcnNhdGlvbiB3aXRoIGFsbCBsaW5rZWQgcmVjb3Jkc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIENEUiBsaW5rZWRpZCAobGlrZSBcIm1pa29wYngtMTc2MDc4NDc5My40NjI3XCIpXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRidXR0b24gLSBCdXR0b24gZWxlbWVudCB0byB1cGRhdGUgc3RhdGVcbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQocmVjb3JkSWQsICRidXR0b24pIHtcbiAgICAgICAgLy8gQWx3YXlzIGRlbGV0ZSB3aXRoIHJlY29yZGluZyBmaWxlc1xuICAgICAgICAvLyBXSFk6IGxpbmtlZGlkIGF1dG9tYXRpY2FsbHkgZGVsZXRlcyBhbGwgbGlua2VkIHJlY29yZHMgKG5vIGRlbGV0ZUxpbmtlZCBwYXJhbWV0ZXIgbmVlZGVkKVxuICAgICAgICBDZHJBUEkuZGVsZXRlUmVjb3JkKHJlY29yZElkLCB7IGRlbGV0ZVJlY29yZGluZzogdHJ1ZSB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIFNpbGVudGx5IHJlbG9hZCB0aGUgRGF0YVRhYmxlIHRvIHJlZmxlY3QgY2hhbmdlc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogVmlzdWFsIGZlZWRiYWNrIChkaXNhcHBlYXJpbmcgcm93KSBpcyBlbm91Z2gsIG5vIG5lZWQgZm9yIHN1Y2Nlc3MgdG9hc3RcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuYWpheC5yZWxvYWQobnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2Ugb25seSBvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSByZXNwb25zZT8ubWVzc2FnZXM/LmVycm9yPy5bMF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNkcl9EZWxldGVGYWlsZWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBkZWxldGUgcmVjb3JkJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNc2cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgcGFnaW5hdGlvbiBjb250cm9scyB2aXNpYmlsaXR5IGJhc2VkIG9uIGRhdGEgc2l6ZVxuICAgICAqL1xuICAgIHRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpIHtcbiAgICAgICAgY29uc3QgaW5mbyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmluZm8oKTtcbiAgICAgICAgaWYgKGluZm8ucGFnZXMgPD0gMSkge1xuICAgICAgICAgICAgJChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUudGFibGUoKS5jb250YWluZXIoKSkuZmluZCgnLmRhdGFUYWJsZXNfcGFnaW5hdGUnKS5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS50YWJsZSgpLmNvbnRhaW5lcigpKS5maW5kKCcuZGF0YVRhYmxlc19wYWdpbmF0ZScpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIENEUiBtZXRhZGF0YSAoZGF0ZSByYW5nZSkgdXNpbmcgQ2RyQVBJXG4gICAgICogV0hZOiBMaWdodHdlaWdodCByZXF1ZXN0IHJldHVybnMgb25seSBtZXRhZGF0YSAoZGF0ZXMpLCBub3QgZnVsbCBDRFIgcmVjb3Jkc1xuICAgICAqIEF2b2lkcyBkb3VibGUgcmVxdWVzdCBvbiBwYWdlIGxvYWRcbiAgICAgKi9cbiAgICBmZXRjaExhdGVzdENEUkRhdGUoKSB7XG4gICAgICAgIC8vIENoZWNrIGZvciBzYXZlZCBzdGF0ZSBmaXJzdFxuICAgICAgICBjb25zdCBzYXZlZFN0YXRlID0gY2FsbERldGFpbFJlY29yZHMubG9hZEZpbHRlcnNTdGF0ZSgpO1xuXG4gICAgICAgIENkckFQSS5nZXRNZXRhZGF0YSh7IGxpbWl0OiAxMDAgfSwgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEuaGFzUmVjb3Jkcykge1xuICAgICAgICAgICAgICAgIGxldCBzdGFydERhdGUsIGVuZERhdGU7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIHNhdmVkIHN0YXRlIHdpdGggZGF0ZXMsIHVzZSB0aG9zZSBpbnN0ZWFkIG9mIG1ldGFkYXRhXG4gICAgICAgICAgICAgICAgaWYgKHNhdmVkU3RhdGUgJiYgc2F2ZWRTdGF0ZS5kYXRlRnJvbSAmJiBzYXZlZFN0YXRlLmRhdGVUbykge1xuICAgICAgICAgICAgICAgICAgICBzdGFydERhdGUgPSBtb21lbnQoc2F2ZWRTdGF0ZS5kYXRlRnJvbSk7XG4gICAgICAgICAgICAgICAgICAgIGVuZERhdGUgPSBtb21lbnQoc2F2ZWRTdGF0ZS5kYXRlVG8pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgbWV0YWRhdGEgZGF0ZSBzdHJpbmdzIHRvIG1vbWVudCBvYmplY3RzXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0RGF0ZSA9IG1vbWVudChkYXRhLmVhcmxpZXN0RGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGVuZERhdGUgPSBtb21lbnQoZGF0YS5sYXRlc3REYXRlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3Ioc3RhcnREYXRlLCBlbmREYXRlKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgRGF0YVRhYmxlIG9ubHkgaWYgd2UgaGF2ZSByZWNvcmRzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBEYXRhVGFibGUgbmVlZHMgZGF0ZSByYW5nZSB0byBiZSBzZXQgZmlyc3RcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm8gcmVjb3JkcyBpbiBkYXRhYmFzZSBhdCBhbGwgb3IgQVBJIGVycm9yXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3JkcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIoKTtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBpbml0aWFsaXplIERhdGFUYWJsZSBhdCBhbGwgLSBqdXN0IHNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgYSBzdHlsZWQgZW1wdHkgdGFibGUgbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgbWVzc2FnZSBmb3IgZW1wdHkgdGFibGVcbiAgICAgKi9cbiAgICBnZXRFbXB0eVRhYmxlTWVzc2FnZSgpIHtcbiAgICAgICAgLy8gSWYgZGF0YWJhc2UgaXMgZW1wdHksIHdlIGRvbid0IHNob3cgdGhpcyBtZXNzYWdlIGluIHRhYmxlXG4gICAgICAgIGlmICghY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3Jkcykge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGZpbHRlcmVkIGVtcHR5IHN0YXRlIG1lc3NhZ2VcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBsYWNlaG9sZGVyIHNlZ21lbnRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic2VhcmNoIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0ZpbHRlcmVkRW1wdHlUaXRsZX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlubGluZVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0XCI+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9GaWx0ZXJlZEVtcHR5RGVzY3JpcHRpb259XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIHRoZSBlbXB0eSBkYXRhYmFzZSBwbGFjZWhvbGRlciBhbmQgaGlkZXMgdGhlIHRhYmxlXG4gICAgICovXG4gICAgc2hvd0VtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcigpIHtcbiAgICAgICAgLy8gSGlkZSB0aGUgdGFibGUgaXRzZWxmIChEYXRhVGFibGUgd29uJ3QgYmUgaW5pdGlhbGl6ZWQpXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5oaWRlKCk7XG5cbiAgICAgICAgLy8gSGlkZSBzZWFyY2ggYW5kIGRhdGUgY29udHJvbHNcbiAgICAgICAgJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKS5jbG9zZXN0KCcudWkucm93JykuaGlkZSgpO1xuXG4gICAgICAgIC8vIFNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGVtcHR5RGF0YWJhc2VQbGFjZWhvbGRlci5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRyYW5zZm9ybSBSRVNUIEFQSSBncm91cGVkIHJlY29yZHMgdG8gRGF0YVRhYmxlIHJvdyBmb3JtYXRcbiAgICAgKiBAcGFyYW0ge0FycmF5fSByZXN0RGF0YSAtIEFycmF5IG9mIGdyb3VwZWQgQ0RSIHJlY29yZHMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgRGF0YVRhYmxlIHJvd3NcbiAgICAgKi9cbiAgICB0cmFuc2Zvcm1SZXN0VG9EYXRhVGFibGUocmVzdERhdGEpIHtcbiAgICAgICAgcmV0dXJuIHJlc3REYXRhLm1hcChncm91cCA9PiB7XG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgdGltaW5nIGRpc3BsYXlcbiAgICAgICAgICAgIGNvbnN0IGJpbGxzZWMgPSBncm91cC50b3RhbEJpbGxzZWMgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVGb3JtYXQgPSAoYmlsbHNlYyA8IDM2MDApID8gJ21tOnNzJyA6ICdISDptbTpzcyc7XG4gICAgICAgICAgICBjb25zdCB0aW1pbmcgPSBiaWxsc2VjID4gMCA/IG1vbWVudC51dGMoYmlsbHNlYyAqIDEwMDApLmZvcm1hdCh0aW1lRm9ybWF0KSA6ICcnO1xuXG4gICAgICAgICAgICAvLyBGb3JtYXQgc3RhcnQgZGF0ZVxuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkRGF0ZSA9IG1vbWVudChncm91cC5zdGFydCkuZm9ybWF0KCdERC1NTS1ZWVlZIEhIOm1tOnNzJyk7XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgcmVjb3JkaW5nIHJlY29yZHMgLSBmaWx0ZXIgb25seSByZWNvcmRzIHdpdGggYWN0dWFsIHJlY29yZGluZyBmaWxlc1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkaW5ncyA9IChncm91cC5yZWNvcmRzIHx8IFtdKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIociA9PiByLnJlY29yZGluZ2ZpbGUgJiYgci5yZWNvcmRpbmdmaWxlLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgLm1hcChyID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIGlkOiByLmlkLFxuICAgICAgICAgICAgICAgICAgICBzcmNfbnVtOiByLnNyY19udW0sXG4gICAgICAgICAgICAgICAgICAgIGRzdF9udW06IHIuZHN0X251bSxcbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkaW5nZmlsZTogci5yZWNvcmRpbmdmaWxlLFxuICAgICAgICAgICAgICAgICAgICBwbGF5YmFja191cmw6IHIucGxheWJhY2tfdXJsLCAgIC8vIFRva2VuLWJhc2VkIFVSTCBmb3IgcGxheWJhY2tcbiAgICAgICAgICAgICAgICAgICAgZG93bmxvYWRfdXJsOiByLmRvd25sb2FkX3VybCAgICAvLyBUb2tlbi1iYXNlZCBVUkwgZm9yIGRvd25sb2FkXG4gICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgQ1NTIGNsYXNzXG4gICAgICAgICAgICBjb25zdCBoYXNSZWNvcmRpbmdzID0gcmVjb3JkaW5ncy5sZW5ndGggPiAwO1xuICAgICAgICAgICAgY29uc3QgaXNBbnN3ZXJlZCA9IGdyb3VwLmRpc3Bvc2l0aW9uID09PSAnQU5TV0VSRUQnO1xuICAgICAgICAgICAgY29uc3QgZHRSb3dDbGFzcyA9IGhhc1JlY29yZGluZ3MgPyAnZGV0YWlsZWQnIDogJ3VpJztcbiAgICAgICAgICAgIGNvbnN0IG5lZ2F0aXZlQ2xhc3MgPSBpc0Fuc3dlcmVkID8gJycgOiAnIG5lZ2F0aXZlJztcblxuICAgICAgICAgICAgLy8gQ29sbGVjdCB2ZXJib3NlIGNhbGwgSURzXG4gICAgICAgICAgICBjb25zdCBpZHMgPSAoZ3JvdXAucmVjb3JkcyB8fCBbXSlcbiAgICAgICAgICAgICAgICAubWFwKHIgPT4gci52ZXJib3NlX2NhbGxfaWQpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihpZCA9PiBpZCAmJiBpZC5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgIC5qb2luKCcmJyk7XG5cbiAgICAgICAgICAgIC8vIFJldHVybiBEYXRhVGFibGUgcm93IGZvcm1hdFxuICAgICAgICAgICAgLy8gRGF0YVRhYmxlcyBuZWVkcyBib3RoIGFycmF5IGluZGljZXMgQU5EIHNwZWNpYWwgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gW1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZERhdGUsICAgICAgICAgICAgICAvLyAwOiBkYXRlXG4gICAgICAgICAgICAgICAgZ3JvdXAuc3JjX251bSwgICAgICAgICAgICAgIC8vIDE6IHNvdXJjZSBudW1iZXJcbiAgICAgICAgICAgICAgICBncm91cC5kc3RfbnVtIHx8IGdyb3VwLmRpZCwgLy8gMjogZGVzdGluYXRpb24gbnVtYmVyIG9yIERJRFxuICAgICAgICAgICAgICAgIHRpbWluZywgICAgICAgICAgICAgICAgICAgICAvLyAzOiBkdXJhdGlvblxuICAgICAgICAgICAgICAgIHJlY29yZGluZ3MsICAgICAgICAgICAgICAgICAvLyA0OiByZWNvcmRpbmcgcmVjb3JkcyBhcnJheVxuICAgICAgICAgICAgICAgIGdyb3VwLmRpc3Bvc2l0aW9uICAgICAgICAgICAvLyA1OiBkaXNwb3NpdGlvblxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgLy8gQWRkIERhdGFUYWJsZXMgc3BlY2lhbCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICByb3cuRFRfUm93SWQgPSBncm91cC5saW5rZWRpZDtcbiAgICAgICAgICAgIHJvdy5EVF9Sb3dDbGFzcyA9IGR0Um93Q2xhc3MgKyBuZWdhdGl2ZUNsYXNzO1xuICAgICAgICAgICAgcm93LmlkcyA9IGlkczsgLy8gU3RvcmUgcmF3IElEcyB3aXRob3V0IGVuY29kaW5nIC0gZW5jb2Rpbmcgd2lsbCBiZSBhcHBsaWVkIHdoZW4gYnVpbGRpbmcgVVJMXG5cbiAgICAgICAgICAgIHJldHVybiByb3c7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhIHNldCBvZiBjYWxsIHJlY29yZHMgd2hlbiBhIHJvdyBpcyBjbGlja2VkLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNhbGwgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBzaG93UmVjb3JkcyhkYXRhKSB7XG4gICAgICAgIGxldCBodG1sUGxheWVyID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgYmFzaWMgdGFibGUgY2RyLXBsYXllclwiPjx0Ym9keT4nO1xuICAgICAgICBkYXRhWzRdLmZvckVhY2goKHJlY29yZCwgaSkgPT4ge1xuICAgICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gbnVsbFxuICAgICAgICAgICAgICAgIHx8IHJlY29yZC5yZWNvcmRpbmdmaWxlLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93IGRpc2FibGVkXCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIlwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCIgZGF0YS12YWx1ZT1cIlwiPjwvaT5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRva2VuLWJhc2VkIFVSTHMgaW5zdGVhZCBvZiBkaXJlY3QgZmlsZSBwYXRoc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogU2VjdXJpdHkgLSBoaWRlcyBhY3R1YWwgZmlsZSBwYXRocyBmcm9tIHVzZXJcbiAgICAgICAgICAgICAgICAvLyBUd28gc2VwYXJhdGUgZW5kcG9pbnRzOiA6cGxheWJhY2sgKGlubGluZSkgYW5kIDpkb3dubG9hZCAoZmlsZSlcbiAgICAgICAgICAgICAgICBjb25zdCBwbGF5YmFja1VybCA9IHJlY29yZC5wbGF5YmFja191cmwgfHwgJyc7XG4gICAgICAgICAgICAgICAgY29uc3QgZG93bmxvYWRVcmwgPSByZWNvcmQuZG93bmxvYWRfdXJsIHx8ICcnO1xuXG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93XCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIiR7cGxheWJhY2tVcmx9XCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgY29tcGFjdCBpY29uIHRvcCBsZWZ0IHBvaW50aW5nIGRyb3Bkb3duIGRvd25sb2FkLWZvcm1hdC1kcm9wZG93blwiIGRhdGEtZG93bmxvYWQtdXJsPVwiJHtkb3dubG9hZFVybH1cIj5cbiAgICBcdFx0PGkgY2xhc3M9XCJkb3dubG9hZCBpY29uXCI+PC9pPlxuICAgIFx0XHQ8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgIFx0XHRcdDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1mb3JtYXQ9XCJ3ZWJtXCI+V2ViTSAoT3B1cyk8L2Rpdj5cbiAgICBcdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtZm9ybWF0PVwibXAzXCI+TVAzPC9kaXY+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIndhdlwiPldBVjwvZGl2PlxuICAgIFx0XHRcdDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1mb3JtYXQ9XCJvZ2dcIj5PR0cgKE9wdXMpPC9kaXY+XG4gICAgXHRcdDwvZGl2PlxuICAgIFx0PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodG1sUGxheWVyICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgcmV0dXJuIGh0bWxQbGF5ZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHBhZ2UgbGVuZ3RoIGZvciBEYXRhVGFibGUsIGNvbnNpZGVyaW5nIHVzZXIncyBzYXZlZCBwcmVmZXJlbmNlXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyBzYXZlZCB2YWx1ZSBvciB1c2UgdGhlIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCB2YWx1ZSBpZiBub25lIGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIHJldHVybiBzYXZlZFBhZ2VMZW5ndGggPyBwYXJzZUludChzYXZlZFBhZ2VMZW5ndGgsIDEwKSA6IGNhbGxEZXRhaWxSZWNvcmRzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHJvd3MgdGhhdCBjYW4gZml0IG9uIGEgcGFnZSBiYXNlZCBvbiB0aGUgY3VycmVudCB3aW5kb3cgaGVpZ2h0LlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5maW5kKCd0Ym9keSA+IHRyJykuZmlyc3QoKS5vdXRlckhlaWdodCgpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gNDAwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgNSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3Rvci5cbiAgICAgKiBAcGFyYW0ge21vbWVudH0gc3RhcnREYXRlIC0gT3B0aW9uYWwgZWFybGllc3QgcmVjb3JkIGRhdGUgZnJvbSBsYXN0IDEwMCByZWNvcmRzXG4gICAgICogQHBhcmFtIHttb21lbnR9IGVuZERhdGUgLSBPcHRpb25hbCBsYXRlc3QgcmVjb3JkIGRhdGUgZnJvbSBsYXN0IDEwMCByZWNvcmRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKHN0YXJ0RGF0ZSA9IG51bGwsIGVuZERhdGUgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7fTtcblxuICAgICAgICBvcHRpb25zLnJhbmdlcyA9IHtcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1RvZGF5XTogW21vbWVudCgpLCBtb21lbnQoKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9ZZXN0ZXJkYXldOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheXMnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheXMnKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0V2Vla106IFttb21lbnQoKS5zdWJ0cmFjdCg2LCAnZGF5cycpLCBtb21lbnQoKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0MzBEYXlzXTogW21vbWVudCgpLnN1YnRyYWN0KDI5LCAnZGF5cycpLCBtb21lbnQoKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9UaGlzTW9udGhdOiBbbW9tZW50KCkuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdE1vbnRoXTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdtb250aCcpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdtb250aCcpLmVuZE9mKCdtb250aCcpXSxcbiAgICAgICAgfTtcbiAgICAgICAgb3B0aW9ucy5hbHdheXNTaG93Q2FsZW5kYXJzID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5hdXRvVXBkYXRlSW5wdXQgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmxpbmtlZENhbGVuZGFycyA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMubWF4RGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICBvcHRpb25zLmxvY2FsZSA9IHtcbiAgICAgICAgICAgIGZvcm1hdDogJ0REL01NL1lZWVknLFxuICAgICAgICAgICAgc2VwYXJhdG9yOiAnIC0gJyxcbiAgICAgICAgICAgIGFwcGx5TGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQXBwbHlCdG4sXG4gICAgICAgICAgICBjYW5jZWxMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9DYW5jZWxCdG4sXG4gICAgICAgICAgICBmcm9tTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfZnJvbSxcbiAgICAgICAgICAgIHRvTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfdG8sXG4gICAgICAgICAgICBjdXN0b21SYW5nZUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0N1c3RvbVBlcmlvZCxcbiAgICAgICAgICAgIGRheXNPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5kYXlzLFxuICAgICAgICAgICAgbW9udGhOYW1lczogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0Lm1vbnRocyxcbiAgICAgICAgICAgIGZpcnN0RGF5OiAxLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIElmIHdlIGhhdmUgZGF0ZSByYW5nZSBmcm9tIGxhc3QgMTAwIHJlY29yZHMsIHVzZSBpdFxuICAgICAgICAvLyBXSFk6IFByb3ZpZGVzIG1lYW5pbmdmdWwgY29udGV4dCAtIHVzZXIgc2VlcyBwZXJpb2QgY292ZXJpbmcgcmVjZW50IGNhbGxzXG4gICAgICAgIGlmIChzdGFydERhdGUgJiYgZW5kRGF0ZSkge1xuICAgICAgICAgICAgb3B0aW9ucy5zdGFydERhdGUgPSBtb21lbnQoc3RhcnREYXRlKS5zdGFydE9mKCdkYXknKTtcbiAgICAgICAgICAgIG9wdGlvbnMuZW5kRGF0ZSA9IG1vbWVudChlbmREYXRlKS5lbmRPZignZGF5Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byB0b2RheSBpZiBubyByZWNvcmRzXG4gICAgICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KCk7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IuZGF0ZXJhbmdlcGlja2VyKFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdCxcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBOb3RlOiBEb24ndCBjYWxsIGFwcGx5RmlsdGVyIGhlcmUgLSBEYXRhVGFibGUgaXMgbm90IGluaXRpYWxpemVkIHlldFxuICAgICAgICAvLyBEYXRhVGFibGUgd2lsbCBsb2FkIGRhdGEgYXV0b21hdGljYWxseSBhZnRlciBpbml0aWFsaXphdGlvblxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3Igc2VsZWN0IGV2ZW50LlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gc3RhcnQgLSBUaGUgc3RhcnQgZGF0ZS5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IGVuZCAtIFRoZSBlbmQgZGF0ZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFiZWwgLSBUaGUgbGFiZWwuXG4gICAgICovXG4gICAgY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0KHN0YXJ0LCBlbmQsIGxhYmVsKSB7XG4gICAgICAgIC8vIE9ubHkgcGFzcyBzZWFyY2gga2V5d29yZCwgZGF0ZXMgYXJlIHJlYWQgZGlyZWN0bHkgZnJvbSBkYXRlIHJhbmdlIHNlbGVjdG9yXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCkpO1xuICAgICAgICAvLyBTdGF0ZSB3aWxsIGJlIHNhdmVkIGF1dG9tYXRpY2FsbHkgaW4gZHJhdyBldmVudCBhZnRlciBmaWx0ZXIgaXMgYXBwbGllZFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBmaWx0ZXIgdG8gdGhlIGRhdGEgdGFibGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgZmlsdGVyIHRleHQuXG4gICAgICovXG4gICAgYXBwbHlGaWx0ZXIodGV4dCkge1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIENEUiB0YWJsZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=