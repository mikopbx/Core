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
    callDetailRecords.checkResetHash(); // Listen for hash changes (when user clicks menu link while already on page)
    // WHY: Browser doesn't reload page on hash-only URL changes

    window.addEventListener('hashchange', function () {
      callDetailRecords.checkResetHash();
    }); // Fetch metadata first, then initialize DataTable with proper date range
    // WHY: Prevents double request on page load

    callDetailRecords.fetchLatestCDRDate();
  },

  /**
   * Check for #reset-cache hash and clear filters if present
   * WHY: Centralize reset logic for both initial load and hashchange events
   */
  checkResetHash: function checkResetHash() {
    if (window.location.hash === '#reset-cache') {
      callDetailRecords.clearFiltersState(); // Also clear page length preference

      localStorage.removeItem('cdrTablePageLength'); // Remove hash from URL without page reload

      history.replaceState(null, null, window.location.pathname); // Reload page to apply reset

      window.location.reload();
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCIkc2VhcmNoQ0RSSW5wdXQiLCIkcGFnZUxlbmd0aFNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImhhc0NEUlJlY29yZHMiLCIkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiU1RPUkFHRV9LRVkiLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImNoZWNrUmVzZXRIYXNoIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImZldGNoTGF0ZXN0Q0RSRGF0ZSIsImxvY2F0aW9uIiwiaGFzaCIsImNsZWFyRmlsdGVyc1N0YXRlIiwibG9jYWxTdG9yYWdlIiwicmVtb3ZlSXRlbSIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJwYXRobmFtZSIsInJlbG9hZCIsInNhdmVGaWx0ZXJzU3RhdGUiLCJzZXNzaW9uU3RvcmFnZSIsImNvbnNvbGUiLCJ3YXJuIiwic3RhdGUiLCJkYXRlRnJvbSIsImRhdGVUbyIsInNlYXJjaFRleHQiLCJjdXJyZW50UGFnZSIsInBhZ2VMZW5ndGgiLCJnZXRQYWdlTGVuZ3RoIiwiZGF0ZVJhbmdlUGlja2VyIiwiZGF0YSIsInN0YXJ0RGF0ZSIsImVuZERhdGUiLCJmb3JtYXQiLCJ2YWwiLCJwYWdlIiwicGFnZUluZm8iLCJpbmZvIiwic2V0SXRlbSIsIkpTT04iLCJzdHJpbmdpZnkiLCJlcnJvciIsImxvYWRGaWx0ZXJzU3RhdGUiLCJyYXdEYXRhIiwiZ2V0SXRlbSIsInBhcnNlIiwiaW5pdGlhbGl6ZURhdGFUYWJsZUFuZEhhbmRsZXJzIiwic2VhcmNoRGVib3VuY2VUaW1lciIsIm9uIiwiZSIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJrZXlDb2RlIiwibGVuZ3RoIiwidGV4dCIsImFwcGx5RmlsdGVyIiwic2VhcmNoIiwic2VydmVyU2lkZSIsInByb2Nlc3NpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwiY29sdW1uRGVmcyIsImRlZmF1bHRDb250ZW50IiwidGFyZ2V0cyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInBhcmFtcyIsImlzTGlua2VkSWRTZWFyY2giLCJpc1ZhbGlkIiwiZW5kT2YiLCJzZWFyY2hLZXl3b3JkIiwidmFsdWUiLCJ0cmltIiwia2V5d29yZCIsInN0YXJ0c1dpdGgiLCJzcmNfbnVtIiwic3Vic3RyaW5nIiwiZHN0X251bSIsImRpZCIsImxpbmtlZGlkIiwibGltaXQiLCJvZmZzZXQiLCJzdGFydCIsInNvcnQiLCJvcmRlciIsImdyb3VwZWQiLCJkYXRhU3JjIiwianNvbiIsInJlc3VsdCIsInJlc3REYXRhIiwicmVjb3JkcyIsInBhZ2luYXRpb24iLCJyZWNvcmRzVG90YWwiLCJ0b3RhbCIsInJlY29yZHNGaWx0ZXJlZCIsInRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZSIsImJlZm9yZVNlbmQiLCJ4aHIiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsInNldFJlcXVlc3RIZWFkZXIiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZW1wdHlUYWJsZSIsImdldEVtcHR5VGFibGVNZXNzYWdlIiwiemVyb1JlY29yZHMiLCJjcmVhdGVkUm93Iiwicm93IiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiYWRkQ2xhc3MiLCJhY3Rpb25zSHRtbCIsImlkcyIsIkRUX1Jvd0lkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2RyX0RlbGV0ZVJlY29yZCIsImRyYXdDYWxsYmFjayIsIkV4dGVuc2lvbnNBUEkiLCJ1cGRhdGVQaG9uZXNSZXByZXNlbnQiLCJ0b2dnbGVQYWdpbmF0aW9uQ29udHJvbHMiLCJpbml0Q29tcGxldGUiLCJyZXN0b3JlRmlsdGVyc0Zyb21TdGF0ZSIsIm9yZGVyaW5nIiwiRGF0YVRhYmxlIiwibWluQ2hhcmFjdGVycyIsInNlYXJjaE9uRm9jdXMiLCJzZWFyY2hGaWVsZHMiLCJzaG93Tm9SZXN1bHRzIiwic291cmNlIiwidGl0bGUiLCJjZHJfU2VhcmNoQnlTb3VyY2VOdW1iZXIiLCJjZHJfU2VhcmNoQnlEZXN0TnVtYmVyIiwiY2RyX1NlYXJjaEJ5RElEIiwiY2RyX1NlYXJjaEJ5TGlua2VkSUQiLCJjZHJfU2VhcmNoQnlDdXN0b21QaHJhc2UiLCJvblNlbGVjdCIsInJlc3BvbnNlIiwiZm9jdXMiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxlbiIsImRyYXciLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNhdmVkUGFnZUxlbmd0aCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInByZXZlbnREZWZhdWx0IiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmRlZmluZWQiLCJnbG9iYWxSb290VXJsIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwib3BlbiIsInRyIiwidGFyZ2V0IiwiY2hpbGQiLCJpc1Nob3duIiwiaGlkZSIsInNob3dSZWNvcmRzIiwic2hvdyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJwbGF5ZXJSb3ciLCJpZCIsIkNEUlBsYXllciIsIiRidXR0b24iLCJyZWNvcmRJZCIsImRlbGV0ZVJlY29yZCIsInNhdmVkU3RhdGUiLCJDZHJBUEkiLCJkZWxldGVSZWNvcmRpbmciLCJlcnJvck1zZyIsIm1lc3NhZ2VzIiwiY2RyX0RlbGV0ZUZhaWxlZCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwicGFnZXMiLCJ0YWJsZSIsImNvbnRhaW5lciIsImdldE1ldGFkYXRhIiwiaGFzUmVjb3JkcyIsIm1vbWVudCIsImVhcmxpZXN0RGF0ZSIsImxhdGVzdERhdGUiLCJpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IiLCJzaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiY2RyX0ZpbHRlcmVkRW1wdHlUaXRsZSIsImNkcl9GaWx0ZXJlZEVtcHR5RGVzY3JpcHRpb24iLCJtYXAiLCJncm91cCIsImJpbGxzZWMiLCJ0b3RhbEJpbGxzZWMiLCJ0aW1lRm9ybWF0IiwidGltaW5nIiwidXRjIiwiZm9ybWF0dGVkRGF0ZSIsInJlY29yZGluZ3MiLCJmaWx0ZXIiLCJyIiwicmVjb3JkaW5nZmlsZSIsInBsYXliYWNrX3VybCIsImRvd25sb2FkX3VybCIsImhhc1JlY29yZGluZ3MiLCJpc0Fuc3dlcmVkIiwiZGlzcG9zaXRpb24iLCJkdFJvd0NsYXNzIiwibmVnYXRpdmVDbGFzcyIsInZlcmJvc2VfY2FsbF9pZCIsImpvaW4iLCJodG1sUGxheWVyIiwiZm9yRWFjaCIsInJlY29yZCIsImkiLCJwbGF5YmFja1VybCIsImRvd25sb2FkVXJsIiwicGFyc2VJbnQiLCJyb3dIZWlnaHQiLCJmaXJzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJvcHRpb25zIiwicmFuZ2VzIiwiY2FsX1RvZGF5IiwiY2FsX1llc3RlcmRheSIsInN1YnRyYWN0IiwiY2FsX0xhc3RXZWVrIiwiY2FsX0xhc3QzMERheXMiLCJjYWxfVGhpc01vbnRoIiwic3RhcnRPZiIsImNhbF9MYXN0TW9udGgiLCJhbHdheXNTaG93Q2FsZW5kYXJzIiwiYXV0b1VwZGF0ZUlucHV0IiwibGlua2VkQ2FsZW5kYXJzIiwibWF4RGF0ZSIsImxvY2FsZSIsInNlcGFyYXRvciIsImFwcGx5TGFiZWwiLCJjYWxfQXBwbHlCdG4iLCJjYW5jZWxMYWJlbCIsImNhbF9DYW5jZWxCdG4iLCJmcm9tTGFiZWwiLCJjYWxfZnJvbSIsInRvTGFiZWwiLCJjYWxfdG8iLCJjdXN0b21SYW5nZUxhYmVsIiwiY2FsX0N1c3RvbVBlcmlvZCIsImRheXNPZldlZWsiLCJjYWxlbmRhclRleHQiLCJkYXlzIiwibW9udGhOYW1lcyIsIm1vbnRocyIsImZpcnN0RGF5IiwiZGF0ZXJhbmdlcGlja2VyIiwiY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0IiwiZW5kIiwibGFiZWwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFDLFlBQUQsQ0FMVTs7QUFPdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsZUFBRCxDQVhNOztBQWF0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxrQkFBa0IsRUFBRUYsQ0FBQyxDQUFDLHNCQUFELENBakJDOztBQW1CdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsZUFBZSxFQUFFSCxDQUFDLENBQUMsbUJBQUQsQ0F2Qkk7O0FBeUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxtQkFBbUIsRUFBRUosQ0FBQyxDQUFDLHFCQUFELENBN0JBOztBQStCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsU0FBUyxFQUFFLEVBbkNXOztBQXFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLEVBekNhOztBQTJDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLElBL0NPOztBQWlEdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEseUJBQXlCLEVBQUVSLENBQUMsQ0FBQyxpQ0FBRCxDQXJETjs7QUF1RHRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lTLEVBQUFBLFdBQVcsRUFBRSxtQkEzRFM7O0FBNkR0QjtBQUNK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eDNCcUIsQ0FBMUI7QUEyM0JBO0FBQ0E7QUFDQTs7QUFDQTdILENBQUMsQ0FBQ3VSLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIxUixFQUFBQSxpQkFBaUIsQ0FBQ2EsVUFBbEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNlbWFudGljTG9jYWxpemF0aW9uLCBFeHRlbnNpb25zQVBJLCBtb21lbnQsIGdsb2JhbFRyYW5zbGF0ZSwgQ0RSUGxheWVyLCBDZHJBUEksIFVzZXJNZXNzYWdlLCBBQ0xIZWxwZXIgKi9cblxuLyoqXG4gKiBjYWxsRGV0YWlsUmVjb3JkcyBtb2R1bGUuXG4gKiBAbW9kdWxlIGNhbGxEZXRhaWxSZWNvcmRzXG4gKi9cbmNvbnN0IGNhbGxEZXRhaWxSZWNvcmRzID0ge1xuICAgIC8qKlxuICAgICAqIFRoZSBjYWxsIGRldGFpbCByZWNvcmRzIHRhYmxlIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2RyVGFibGU6ICQoJyNjZHItdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsc2VhcmNoJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0ZSByYW5nZSBzZWxlY3RvciBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRhdGVSYW5nZVNlbGVjdG9yOiAkKCcjZGF0ZS1yYW5nZS1zZWxlY3RvcicpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHNlYXJjaCBDRFIgaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzZWFyY2hDRFJJbnB1dDogJCgnI3NlYXJjaC1jZHItaW5wdXQnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6ICQoJyNwYWdlLWxlbmd0aC1zZWxlY3QnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRhIHRhYmxlIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGRhdGFUYWJsZToge30sXG5cbiAgICAvKipcbiAgICAgKiBBbiBhcnJheSBvZiBwbGF5ZXJzLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBwbGF5ZXJzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgaW5kaWNhdGluZyBpZiBDRFIgZGF0YWJhc2UgaGFzIGFueSByZWNvcmRzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaGFzQ0RSUmVjb3JkczogdHJ1ZSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBlbXB0eSBkYXRhYmFzZSBwbGFjZWhvbGRlciBlbGVtZW50XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyOiAkKCcjY2RyLWVtcHR5LWRhdGFiYXNlLXBsYWNlaG9sZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBTdG9yYWdlIGtleSBmb3IgZmlsdGVyIHN0YXRlIGluIHNlc3Npb25TdG9yYWdlXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBTVE9SQUdFX0tFWTogJ2Nkcl9maWx0ZXJzX3N0YXRlJyxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgRGF0YVRhYmxlIGhhcyBjb21wbGV0ZWQgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBXSFk6IFByZXZlbnRzIHNhdmluZyBzdGF0ZSBkdXJpbmcgaW5pdGlhbCBsb2FkIGJlZm9yZSBmaWx0ZXJzIGFyZSByZXN0b3JlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGNhbGwgZGV0YWlsIHJlY29yZHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHJlc2V0IGhhc2ggRklSU1QsIGJlZm9yZSBhbnkgb3RoZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2hlY2tSZXNldEhhc2goKTtcblxuICAgICAgICAvLyBMaXN0ZW4gZm9yIGhhc2ggY2hhbmdlcyAod2hlbiB1c2VyIGNsaWNrcyBtZW51IGxpbmsgd2hpbGUgYWxyZWFkeSBvbiBwYWdlKVxuICAgICAgICAvLyBXSFk6IEJyb3dzZXIgZG9lc24ndCByZWxvYWQgcGFnZSBvbiBoYXNoLW9ubHkgVVJMIGNoYW5nZXNcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jaGVja1Jlc2V0SGFzaCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBGZXRjaCBtZXRhZGF0YSBmaXJzdCwgdGhlbiBpbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIHByb3BlciBkYXRlIHJhbmdlXG4gICAgICAgIC8vIFdIWTogUHJldmVudHMgZG91YmxlIHJlcXVlc3Qgb24gcGFnZSBsb2FkXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmZldGNoTGF0ZXN0Q0RSRGF0ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBmb3IgI3Jlc2V0LWNhY2hlIGhhc2ggYW5kIGNsZWFyIGZpbHRlcnMgaWYgcHJlc2VudFxuICAgICAqIFdIWTogQ2VudHJhbGl6ZSByZXNldCBsb2dpYyBmb3IgYm90aCBpbml0aWFsIGxvYWQgYW5kIGhhc2hjaGFuZ2UgZXZlbnRzXG4gICAgICovXG4gICAgY2hlY2tSZXNldEhhc2goKSB7XG4gICAgICAgIGlmICh3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gJyNyZXNldC1jYWNoZScpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNsZWFyRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgICAgICAvLyBBbHNvIGNsZWFyIHBhZ2UgbGVuZ3RoIHByZWZlcmVuY2VcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBoYXNoIGZyb20gVVJMIHdpdGhvdXQgcGFnZSByZWxvYWRcbiAgICAgICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsIG51bGwsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgICAgICAgICAvLyBSZWxvYWQgcGFnZSB0byBhcHBseSByZXNldFxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmUgY3VycmVudCBmaWx0ZXIgc3RhdGUgdG8gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBTdG9yZXMgZGF0ZSByYW5nZSwgc2VhcmNoIHRleHQsIGN1cnJlbnQgcGFnZSwgYW5kIHBhZ2UgbGVuZ3RoXG4gICAgICovXG4gICAgc2F2ZUZpbHRlcnNTdGF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEZlYXR1cmUgZGV0ZWN0aW9uIC0gZXhpdCBzaWxlbnRseSBpZiBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlc3Npb25TdG9yYWdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignW0NEUl0gc2Vzc2lvblN0b3JhZ2Ugbm90IGF2YWlsYWJsZScpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSB7XG4gICAgICAgICAgICAgICAgZGF0ZUZyb206IG51bGwsXG4gICAgICAgICAgICAgICAgZGF0ZVRvOiBudWxsLFxuICAgICAgICAgICAgICAgIHNlYXJjaFRleHQ6ICcnLFxuICAgICAgICAgICAgICAgIGN1cnJlbnRQYWdlOiAwLFxuICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGg6IGNhbGxEZXRhaWxSZWNvcmRzLmdldFBhZ2VMZW5ndGgoKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gR2V0IGRhdGVzIGZyb20gZGF0ZXJhbmdlcGlja2VyIGluc3RhbmNlXG4gICAgICAgICAgICBjb25zdCBkYXRlUmFuZ2VQaWNrZXIgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IuZGF0YSgnZGF0ZXJhbmdlcGlja2VyJyk7XG4gICAgICAgICAgICBpZiAoZGF0ZVJhbmdlUGlja2VyICYmIGRhdGVSYW5nZVBpY2tlci5zdGFydERhdGUgJiYgZGF0ZVJhbmdlUGlja2VyLmVuZERhdGUpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kYXRlRnJvbSA9IGRhdGVSYW5nZVBpY2tlci5zdGFydERhdGUuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgICAgICAgICAgICAgc3RhdGUuZGF0ZVRvID0gZGF0ZVJhbmdlUGlja2VyLmVuZERhdGUuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEdldCBzZWFyY2ggdGV4dCBmcm9tIGlucHV0IGZpZWxkXG4gICAgICAgICAgICBzdGF0ZS5zZWFyY2hUZXh0ID0gY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSB8fCAnJztcblxuICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgcGFnZSBmcm9tIERhdGFUYWJsZSAoaWYgaW5pdGlhbGl6ZWQpXG4gICAgICAgICAgICBpZiAoY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlICYmIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZUluZm8gPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5pbmZvKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUuY3VycmVudFBhZ2UgPSBwYWdlSW5mby5wYWdlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGNhbGxEZXRhaWxSZWNvcmRzLlNUT1JBR0VfS0VZLCBKU09OLnN0cmluZ2lmeShzdGF0ZSkpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0NEUl0gRmFpbGVkIHRvIHNhdmUgZmlsdGVycyB0byBzZXNzaW9uU3RvcmFnZTonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmaWx0ZXIgc3RhdGUgZnJvbSBzZXNzaW9uU3RvcmFnZVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R8bnVsbH0gU2F2ZWQgc3RhdGUgb2JqZWN0IG9yIG51bGwgaWYgbm90IGZvdW5kL2ludmFsaWRcbiAgICAgKi9cbiAgICBsb2FkRmlsdGVyc1N0YXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRmVhdHVyZSBkZXRlY3Rpb24gLSByZXR1cm4gbnVsbCBpZiBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlc3Npb25TdG9yYWdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignW0NEUl0gc2Vzc2lvblN0b3JhZ2Ugbm90IGF2YWlsYWJsZSBmb3IgbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByYXdEYXRhID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShjYWxsRGV0YWlsUmVjb3Jkcy5TVE9SQUdFX0tFWSk7XG4gICAgICAgICAgICBpZiAoIXJhd0RhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSBKU09OLnBhcnNlKHJhd0RhdGEpO1xuXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBzdGF0ZSBzdHJ1Y3R1cmVcbiAgICAgICAgICAgIGlmICghc3RhdGUgfHwgdHlwZW9mIHN0YXRlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNsZWFyRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tDRFJdIEZhaWxlZCB0byBsb2FkIGZpbHRlcnMgZnJvbSBzZXNzaW9uU3RvcmFnZTonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBDbGVhciBjb3JydXB0ZWQgZGF0YVxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2xlYXJGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFyIHNhdmVkIGZpbHRlciBzdGF0ZSBmcm9tIHNlc3Npb25TdG9yYWdlXG4gICAgICovXG4gICAgY2xlYXJGaWx0ZXJzU3RhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlc3Npb25TdG9yYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oY2FsbERldGFpbFJlY29yZHMuU1RPUkFHRV9LRVkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNsZWFyIENEUiBmaWx0ZXJzIGZyb20gc2Vzc2lvblN0b3JhZ2U6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRGF0YVRhYmxlIGFuZCBldmVudCBoYW5kbGVyc1xuICAgICAqIENhbGxlZCBhZnRlciBtZXRhZGF0YSBpcyByZWNlaXZlZFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGVBbmRIYW5kbGVycygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJvdW5jZSB0aW1lciB2YXJpYWJsZVxuICAgICAgICBsZXQgc2VhcmNoRGVib3VuY2VUaW1lciA9IG51bGw7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZXIgaWYgdGhlIHVzZXIgaXMgc3RpbGwgdHlwaW5nXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoc2VhcmNoRGVib3VuY2VUaW1lcik7XG5cbiAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciBmb3IgZGVsYXllZCBleGVjdXRpb25cbiAgICAgICAgICAgIHNlYXJjaERlYm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxM1xuICAgICAgICAgICAgICAgICAgICB8fCBlLmtleUNvZGUgPT09IDhcbiAgICAgICAgICAgICAgICAgICAgfHwgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBwYXNzIHRoZSBzZWFyY2gga2V5d29yZCwgZGF0ZXMgYXJlIGhhbmRsZWQgc2VwYXJhdGVseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVsYXkgYmVmb3JlIGV4ZWN1dGluZyB0aGUgc2VhcmNoXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5kYXRhVGFibGUoe1xuICAgICAgICAgICAgc2VhcmNoOiB7XG4gICAgICAgICAgICAgICAgc2VhcmNoOiBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHsgZGF0YTogbnVsbCwgb3JkZXJhYmxlOiBmYWxzZSB9LCAgLy8gMDogZXhwYW5kIGljb24gY29sdW1uXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAwIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAxOiBkYXRlIChhcnJheSBpbmRleCAwKVxuICAgICAgICAgICAgICAgIHsgZGF0YTogMSB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMjogc3JjX251bSAoYXJyYXkgaW5kZXggMSlcbiAgICAgICAgICAgICAgICB7IGRhdGE6IDIgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDM6IGRzdF9udW0gKGFycmF5IGluZGV4IDIpXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAzIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyA0OiBkdXJhdGlvbiAoYXJyYXkgaW5kZXggMylcbiAgICAgICAgICAgICAgICB7IGRhdGE6IG51bGwsIG9yZGVyYWJsZTogZmFsc2UgfSAgIC8vIDU6IGRlbGV0ZSBidXR0b24gY29sdW1uXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvY2RyJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJywgIC8vIFJFU1QgQVBJIHVzZXMgR0VUIGZvciBsaXN0IHJldHJpZXZhbFxuICAgICAgICAgICAgICAgIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgICAgIGxldCBpc0xpbmtlZElkU2VhcmNoID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gMS4gQWx3YXlzIGdldCBkYXRlcyBmcm9tIGRhdGUgcmFuZ2Ugc2VsZWN0b3IgdXNpbmcgZGF0ZXJhbmdlcGlja2VyIEFQSVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlUmFuZ2VQaWNrZXIgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IuZGF0YSgnZGF0ZXJhbmdlcGlja2VyJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRlUmFuZ2VQaWNrZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0RGF0ZSA9IGRhdGVSYW5nZVBpY2tlci5zdGFydERhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmREYXRlID0gZGF0ZVJhbmdlUGlja2VyLmVuZERhdGU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydERhdGUgJiYgc3RhcnREYXRlLmlzVmFsaWQoKSAmJiBlbmREYXRlICYmIGVuZERhdGUuaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRhdGVGcm9tID0gc3RhcnREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kYXRlVG8gPSBlbmREYXRlLmVuZE9mKCdkYXknKS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW06c3MnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIDIuIFByb2Nlc3Mgc2VhcmNoIGtleXdvcmQgZnJvbSBzZWFyY2ggaW5wdXQgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoS2V5d29yZCA9IGQuc2VhcmNoLnZhbHVlIHx8ICcnO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWFyY2hLZXl3b3JkLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5d29yZCA9IHNlYXJjaEtleXdvcmQudHJpbSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSBzZWFyY2ggcHJlZml4ZXM6IHNyYzosIGRzdDosIGRpZDosIGxpbmtlZGlkOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnc3JjOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IHNvdXJjZSBudW1iZXIgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zcmNfbnVtID0ga2V5d29yZC5zdWJzdHJpbmcoNCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ2RzdDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBkZXN0aW5hdGlvbiBudW1iZXIgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kc3RfbnVtID0ga2V5d29yZC5zdWJzdHJpbmcoNCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ2RpZDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBESUQgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kaWQgPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnbGlua2VkaWQ6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgbGlua2VkaWQgLSBpZ25vcmUgZGF0ZSByYW5nZSBmb3IgbGlua2VkaWQgc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmxpbmtlZGlkID0ga2V5d29yZC5zdWJzdHJpbmcoOSkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzTGlua2VkSWRTZWFyY2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkYXRlIHBhcmFtcyBmb3IgbGlua2VkaWQgc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHBhcmFtcy5kYXRlRnJvbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcGFyYW1zLmRhdGVUbztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRnVsbC10ZXh0IHNlYXJjaDogc2VhcmNoIGluIHNyY19udW0sIGRzdF9udW0sIGFuZCBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZXIgZXhwZWN0cyBzZWFyY2ggd2l0aG91dCBwcmVmaXggdG8gZmluZCBudW1iZXIgYW55d2hlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuc2VhcmNoID0ga2V5d29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJFU1QgQVBJIHBhZ2luYXRpb24gcGFyYW1ldGVyc1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMubGltaXQgPSBkLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9mZnNldCA9IGQuc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zb3J0ID0gJ3N0YXJ0JzsgIC8vIFNvcnQgYnkgY2FsbCBzdGFydCB0aW1lIGZvciBjaHJvbm9sb2dpY2FsIG9yZGVyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vcmRlciA9ICdERVNDJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFdlYlVJIGFsd2F5cyBuZWVkcyBncm91cGVkIHJlY29yZHMgKGJ5IGxpbmtlZGlkKSBmb3IgcHJvcGVyIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgLy8gQmFja2VuZCBkZWZhdWx0cyB0byBncm91cGVkPXRydWUsIGJ1dCBleHBsaWNpdCBpcyBiZXR0ZXIgdGhhbiBpbXBsaWNpdFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZ3JvdXBlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRhdGFTcmM6IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIHJldHVybnMgUEJYQXBpUmVzdWx0IHN0cnVjdHVyZTpcbiAgICAgICAgICAgICAgICAgICAgLy8ge3Jlc3VsdDogdHJ1ZSwgZGF0YToge3JlY29yZHM6IFsuLi5dLCBwYWdpbmF0aW9uOiB7Li4ufX19XG4gICAgICAgICAgICAgICAgICAgIGlmIChqc29uLnJlc3VsdCAmJiBqc29uLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgcmVjb3JkcyBhbmQgcGFnaW5hdGlvbiBmcm9tIG5lc3RlZCBkYXRhIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdERhdGEgPSBqc29uLmRhdGEucmVjb3JkcyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2luYXRpb24gPSBqc29uLmRhdGEucGFnaW5hdGlvbiB8fCB7fTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IERhdGFUYWJsZXMgcGFnaW5hdGlvbiBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uLnJlY29yZHNUb3RhbCA9IHBhZ2luYXRpb24udG90YWwgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc0ZpbHRlcmVkID0gcGFnaW5hdGlvbi50b3RhbCB8fCAwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmFuc2Zvcm0gUkVTVCByZWNvcmRzIHRvIERhdGFUYWJsZSByb3dzXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbERldGFpbFJlY29yZHMudHJhbnNmb3JtUmVzdFRvRGF0YVRhYmxlKHJlc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBiZWZvcmVTZW5kOiBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIEJlYXJlciB0b2tlbiBmb3IgQVBJIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICAvL3Njcm9sbFk6ICQod2luZG93KS5oZWlnaHQoKSAtIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vZmZzZXQoKS50b3AtMTUwLFxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRQYWdlTGVuZ3RoKCksXG4gICAgICAgICAgICBsYW5ndWFnZToge1xuICAgICAgICAgICAgICAgIC4uLlNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgICAgICBlbXB0eVRhYmxlOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRFbXB0eVRhYmxlTWVzc2FnZSgpLFxuICAgICAgICAgICAgICAgIHplcm9SZWNvcmRzOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRFbXB0eVRhYmxlTWVzc2FnZSgpXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIENEUiByb3cuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLkRUX1Jvd0NsYXNzLmluZGV4T2YoXCJkZXRhaWxlZFwiKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCc8aSBjbGFzcz1cImljb24gY2FyZXQgZG93blwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgxKS5odG1sKGRhdGFbMF0pO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgyKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzFdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDMpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGRhdGFbMl0pXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcblxuICAgICAgICAgICAgICAgIC8vIER1cmF0aW9uIGNvbHVtbiAobm8gaWNvbnMpXG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmh0bWwoZGF0YVszXSkuYWRkQ2xhc3MoJ3JpZ2h0IGFsaWduZWQnKTtcblxuICAgICAgICAgICAgICAgIC8vIExhc3QgY29sdW1uOiBsb2cgaWNvbiArIGRlbGV0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBsZXQgYWN0aW9uc0h0bWwgPSAnJztcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBsb2cgaWNvbiBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5pZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnNIdG1sICs9IGA8aSBkYXRhLWlkcz1cIiR7ZGF0YS5pZHN9XCIgY2xhc3M9XCJmaWxlIGFsdGVybmF0ZSBvdXRsaW5lIGljb25cIiBzdHlsZT1cImN1cnNvcjogcG9pbnRlcjsgbWFyZ2luLXJpZ2h0OiA4cHg7XCI+PC9pPmA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGRlbGV0ZSBidXR0b25cbiAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZSB0d28tc3RlcHMtZGVsZXRlIG1lY2hhbmlzbSB0byBwcmV2ZW50IGFjY2lkZW50YWwgZGVsZXRpb25cbiAgICAgICAgICAgICAgICAvLyBGaXJzdCBjbGljayBjaGFuZ2VzIHRyYXNoIGljb24gdG8gY2xvc2UgaWNvbiwgc2Vjb25kIGNsaWNrIGRlbGV0ZXNcbiAgICAgICAgICAgICAgICAvLyBOb3RlOiBBQ0wgY2hlY2sgaXMgZG9uZSBzZXJ2ZXItc2lkZSBpbiBWb2x0IHRlbXBsYXRlIChjb2x1bW4gaXMgaGlkZGVuIGlmIG5vIHBlcm1pc3Npb24pXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBVc2UgZGF0YS5EVF9Sb3dJZCB3aGljaCBjb250YWlucyBsaW5rZWRpZCBmb3IgZ3JvdXBlZCByZWNvcmRzXG4gICAgICAgICAgICAgICAgYWN0aW9uc0h0bWwgKz0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ0d28tc3RlcHMtZGVsZXRlIGRlbGV0ZS1yZWNvcmQgcG9wdXBlZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcmVjb3JkLWlkPVwiJHtkYXRhLkRUX1Jvd0lkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9EZWxldGVSZWNvcmQgfHwgJ0RlbGV0ZSByZWNvcmQnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCIgc3R5bGU9XCJtYXJnaW46IDA7XCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+YDtcblxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSg1KS5odG1sKGFjdGlvbnNIdG1sKS5hZGRDbGFzcygncmlnaHQgYWxpZ25lZCcpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEcmF3IGV2ZW50IC0gZmlyZWQgb25jZSB0aGUgdGFibGUgaGFzIGNvbXBsZXRlZCBhIGRyYXcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy50b2dnbGVQYWdpbmF0aW9uQ29udHJvbHMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEluaXRpYWxpemF0aW9uIGNvbXBsZXRlIGNhbGxiYWNrIC0gZmlyZWQgYWZ0ZXIgZmlyc3QgZGF0YSBsb2FkXG4gICAgICAgICAgICAgKiBXSFk6IFJlc3RvcmUgZmlsdGVycyBBRlRFUiBEYXRhVGFibGUgaGFzIGxvYWRlZCBpbml0aWFsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW5pdENvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgIC8vIFNldCBmbGFnIEZJUlNUIHRvIGFsbG93IHN0YXRlIHNhdmluZyBkdXJpbmcgZmlsdGVyIHJlc3RvcmF0aW9uXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgLy8gTm93IHJlc3RvcmUgZmlsdGVycyAtIGRyYXcgZXZlbnQgd2lsbCBjb3JyZWN0bHkgc2F2ZSB0aGUgcmVzdG9yZWQgc3RhdGVcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5yZXN0b3JlRmlsdGVyc0Zyb21TdGF0ZSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZSA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5EYXRhVGFibGUoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBTZWFyY2ggY29tcG9uZW50IEFGVEVSIERhdGFUYWJsZSBpcyBjcmVhdGVkXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goe1xuICAgICAgICAgICAgbWluQ2hhcmFjdGVyczogMCxcbiAgICAgICAgICAgIHNlYXJjaE9uRm9jdXM6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoRmllbGRzOiBbJ3RpdGxlJ10sXG4gICAgICAgICAgICBzaG93Tm9SZXN1bHRzOiBmYWxzZSxcbiAgICAgICAgICAgIHNvdXJjZTogW1xuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlTb3VyY2VOdW1iZXIsIHZhbHVlOiAnc3JjOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5RGVzdE51bWJlciwgdmFsdWU6ICdkc3Q6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlESUQsIHZhbHVlOiAnZGlkOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5TGlua2VkSUQsIHZhbHVlOiAnbGlua2VkaWQ6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlDdXN0b21QaHJhc2UsIHZhbHVlOiAnJyB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9uU2VsZWN0OiBmdW5jdGlvbihyZXN1bHQsIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kc2VhcmNoQ0RSSW5wdXQuc2VhcmNoKCdoaWRlIHJlc3VsdHMnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSBzZWFyY2ggd2hlbiB5b3UgY2xpY2sgb24gdGhlIGljb25cbiAgICAgICAgJCgnI3NlYXJjaC1pY29uJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmZvY3VzKCk7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kc2VhcmNoQ0RSSW5wdXQuc2VhcmNoKCdxdWVyeScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciB0byBzYXZlIHRoZSB1c2VyJ3MgcGFnZSBsZW5ndGggc2VsZWN0aW9uIGFuZCB1cGRhdGUgdGhlIHRhYmxlXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2UocGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlTGVuZ3RoID09PSAnYXV0bycpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFnZUxlbmd0aCA9IGNhbGxEZXRhaWxSZWNvcmRzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnLCBwYWdlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UubGVuKHBhZ2VMZW5ndGgpLmRyYXcoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCB0aGUgZXZlbnQgZnJvbSBidWJibGluZ1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIHNlbGVjdCBpbnB1dCB2YWx1ZSB0byB0aGUgc2F2ZWQgdmFsdWUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgaWYgKHNhdmVkUGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bignc2V0IHZhbHVlJywgc2F2ZWRQYWdlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgLy8gU2tpcCBzYXZpbmcgc3RhdGUgZHVyaW5nIGluaXRpYWwgbG9hZCBiZWZvcmUgZmlsdGVycyBhcmUgcmVzdG9yZWRcbiAgICAgICAgICAgIGlmICghY2FsbERldGFpbFJlY29yZHMuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2F2ZSBzdGF0ZSBhZnRlciBldmVyeSBkcmF3IChwYWdpbmF0aW9uLCBzZWFyY2gsIGRhdGUgY2hhbmdlKVxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuc2F2ZUZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgZm9yIGNsaWNraW5nIG9uIGljb24gd2l0aCBkYXRhLWlkcyAob3BlbiBpbiBuZXcgd2luZG93KVxuICAgICAgICAvLyBXSFk6IENsaWNraW5nIG9uIGljb24gc2hvdWxkIG9wZW4gU3lzdGVtIERpYWdub3N0aWMgaW4gbmV3IHdpbmRvdyB0byB2aWV3IHZlcmJvc2UgbG9nc1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ1tkYXRhLWlkc10nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCByb3cgdG9nZ2xlXG5cbiAgICAgICAgICAgIGNvbnN0IGlkcyA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLWlkcycpO1xuICAgICAgICAgICAgaWYgKGlkcyAhPT0gdW5kZWZpbmVkICYmIGlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBXSFk6IEZvcm1hdCBhcyBxdWVyeSBwYXJhbSArIGhhc2g6ID9maWx0ZXI9Li4uI2ZpbGU9Li4uXG4gICAgICAgICAgICAgICAgLy8gT3BlbiBpbiBuZXcgd2luZG93IHRvIGFsbG93IHZpZXdpbmcgbG9ncyB3aGlsZSBrZWVwaW5nIENEUiB0YWJsZSB2aXNpYmxlXG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gYCR7Z2xvYmFsUm9vdFVybH1zeXN0ZW0tZGlhZ25vc3RpYy9pbmRleC8/ZmlsdGVyPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGlkcyl9I2ZpbGU9YXN0ZXJpc2slMkZ2ZXJib3NlYDtcbiAgICAgICAgICAgICAgICB3aW5kb3cub3Blbih1cmwsICdfYmxhbmsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIGZvciBvcGVuaW5nIGFuZCBjbG9zaW5nIGRldGFpbHNcbiAgICAgICAgLy8gV0hZOiBPbmx5IGV4cGFuZC9jb2xsYXBzZSBvbiBmaXJzdCBjb2x1bW4gKGNhcmV0IGljb24pIGNsaWNrLCBub3Qgb24gYWN0aW9uIGljb25zXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAndHIuZGV0YWlsZWQgdGQ6Zmlyc3QtY2hpbGQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHIgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnJvdyh0cik7XG5cbiAgICAgICAgICAgIGlmIChyb3cuY2hpbGQuaXNTaG93bigpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyByb3cgaXMgYWxyZWFkeSBvcGVuIC0gY2xvc2UgaXRcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIHRyLnJlbW92ZUNsYXNzKCdzaG93bicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBPcGVuIHRoaXMgcm93XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkKGNhbGxEZXRhaWxSZWNvcmRzLnNob3dSZWNvcmRzKHJvdy5kYXRhKCkpKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgdHIuYWRkQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkKCkuZmluZCgnLmRldGFpbC1yZWNvcmQtcm93JykuZWFjaCgoaW5kZXgsIHBsYXllclJvdykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZCA9ICQocGxheWVyUm93KS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENEUlBsYXllcihpZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBzZWNvbmQgY2xpY2sgb24gZGVsZXRlIGJ1dHRvbiAoYWZ0ZXIgdHdvLXN0ZXBzLWRlbGV0ZSBjaGFuZ2VzIGljb24gdG8gY2xvc2UpXG4gICAgICAgIC8vIFdIWTogVHdvLXN0ZXBzLWRlbGV0ZSBtZWNoYW5pc20gcHJldmVudHMgYWNjaWRlbnRhbCBkZWxldGlvblxuICAgICAgICAvLyBGaXJzdCBjbGljazogdHJhc2gg4oaSIGNsb3NlIChieSBkZWxldGUtc29tZXRoaW5nLmpzKSwgU2Vjb25kIGNsaWNrOiBleGVjdXRlIGRlbGV0aW9uXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAnYS5kZWxldGUtcmVjb3JkOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCByb3cgZXhwYW5zaW9uXG5cbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICRidXR0b24uYXR0cignZGF0YS1yZWNvcmQtaWQnKTtcblxuICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkIGxvYWRpbmcnKTtcblxuICAgICAgICAgICAgLy8gQWx3YXlzIGRlbGV0ZSB3aXRoIHJlY29yZGluZ3MgYW5kIGxpbmtlZCByZWNvcmRzXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kZWxldGVSZWNvcmQocmVjb3JkSWQsICRidXR0b24pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzdG9yZSBmaWx0ZXJzIGZyb20gc2F2ZWQgc3RhdGUgYWZ0ZXIgRGF0YVRhYmxlIGluaXRpYWxpemF0aW9uXG4gICAgICogV0hZOiBNdXN0IGJlIGNhbGxlZCBhZnRlciBEYXRhVGFibGUgaXMgY3JlYXRlZCB0byByZXN0b3JlIHNlYXJjaCBhbmQgcGFnZVxuICAgICAqL1xuICAgIHJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlKCkge1xuICAgICAgICBjb25zdCBzYXZlZFN0YXRlID0gY2FsbERldGFpbFJlY29yZHMubG9hZEZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICBpZiAoIXNhdmVkU3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlc3RvcmUgc2VhcmNoIHRleHQgdG8gaW5wdXQgZmllbGRcbiAgICAgICAgaWYgKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCkge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoc2F2ZWRTdGF0ZS5zZWFyY2hUZXh0KTtcbiAgICAgICAgICAgIC8vIEFwcGx5IHNlYXJjaCB0byBEYXRhVGFibGVcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5zZWFyY2goc2F2ZWRTdGF0ZS5zZWFyY2hUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlc3RvcmUgcGFnZSBudW1iZXIgd2l0aCBkZWxheVxuICAgICAgICAvLyBXSFk6IERhdGFUYWJsZSBpZ25vcmVzIHBhZ2UoKSBkdXJpbmcgaW5pdENvbXBsZXRlLCBuZWVkIHNldFRpbWVvdXQgdG8gYWxsb3cgaW5pdGlhbGl6YXRpb24gdG8gZnVsbHkgY29tcGxldGVcbiAgICAgICAgaWYgKHNhdmVkU3RhdGUuY3VycmVudFBhZ2UpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlKHNhdmVkU3RhdGUuY3VycmVudFBhZ2UpLmRyYXcoZmFsc2UpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfSBlbHNlIGlmIChzYXZlZFN0YXRlLnNlYXJjaFRleHQpIHtcbiAgICAgICAgICAgIC8vIElmIG9ubHkgc2VhcmNoIHRleHQgZXhpc3RzLCBzdGlsbCBuZWVkIHRvIGRyYXdcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5kcmF3KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIENEUiByZWNvcmQgdmlhIFJFU1QgQVBJXG4gICAgICogV0hZOiBEZWxldGVzIGJ5IGxpbmtlZGlkIC0gYXV0b21hdGljYWxseSByZW1vdmVzIGVudGlyZSBjb252ZXJzYXRpb24gd2l0aCBhbGwgbGlua2VkIHJlY29yZHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBDRFIgbGlua2VkaWQgKGxpa2UgXCJtaWtvcGJ4LTE3NjA3ODQ3OTMuNDYyN1wiKVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkYnV0dG9uIC0gQnV0dG9uIGVsZW1lbnQgdG8gdXBkYXRlIHN0YXRlXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKHJlY29yZElkLCAkYnV0dG9uKSB7XG4gICAgICAgIC8vIEFsd2F5cyBkZWxldGUgd2l0aCByZWNvcmRpbmcgZmlsZXNcbiAgICAgICAgLy8gV0hZOiBsaW5rZWRpZCBhdXRvbWF0aWNhbGx5IGRlbGV0ZXMgYWxsIGxpbmtlZCByZWNvcmRzIChubyBkZWxldGVMaW5rZWQgcGFyYW1ldGVyIG5lZWRlZClcbiAgICAgICAgQ2RyQVBJLmRlbGV0ZVJlY29yZChyZWNvcmRJZCwgeyBkZWxldGVSZWNvcmRpbmc6IHRydWUgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAvLyBTaWxlbnRseSByZWxvYWQgdGhlIERhdGFUYWJsZSB0byByZWZsZWN0IGNoYW5nZXNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IFZpc3VhbCBmZWVkYmFjayAoZGlzYXBwZWFyaW5nIHJvdykgaXMgZW5vdWdoLCBubyBuZWVkIGZvciBzdWNjZXNzIHRvYXN0XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLmFqYXgucmVsb2FkKG51bGwsIGZhbHNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlIG9ubHkgb24gZmFpbHVyZVxuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTXNnID0gcmVzcG9uc2U/Lm1lc3NhZ2VzPy5lcnJvcj8uWzBdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jZHJfRGVsZXRlRmFpbGVkIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gZGVsZXRlIHJlY29yZCc7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTXNnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIHBhZ2luYXRpb24gY29udHJvbHMgdmlzaWJpbGl0eSBiYXNlZCBvbiBkYXRhIHNpemVcbiAgICAgKi9cbiAgICB0b2dnbGVQYWdpbmF0aW9uQ29udHJvbHMoKSB7XG4gICAgICAgIGNvbnN0IGluZm8gPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5pbmZvKCk7XG4gICAgICAgIGlmIChpbmZvLnBhZ2VzIDw9IDEpIHtcbiAgICAgICAgICAgICQoY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnRhYmxlKCkuY29udGFpbmVyKCkpLmZpbmQoJy5kYXRhVGFibGVzX3BhZ2luYXRlJykuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUudGFibGUoKS5jb250YWluZXIoKSkuZmluZCgnLmRhdGFUYWJsZXNfcGFnaW5hdGUnKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyBDRFIgbWV0YWRhdGEgKGRhdGUgcmFuZ2UpIHVzaW5nIENkckFQSVxuICAgICAqIFdIWTogTGlnaHR3ZWlnaHQgcmVxdWVzdCByZXR1cm5zIG9ubHkgbWV0YWRhdGEgKGRhdGVzKSwgbm90IGZ1bGwgQ0RSIHJlY29yZHNcbiAgICAgKiBBdm9pZHMgZG91YmxlIHJlcXVlc3Qgb24gcGFnZSBsb2FkXG4gICAgICovXG4gICAgZmV0Y2hMYXRlc3RDRFJEYXRlKCkge1xuICAgICAgICAvLyBDaGVjayBmb3Igc2F2ZWQgc3RhdGUgZmlyc3RcbiAgICAgICAgY29uc3Qgc2F2ZWRTdGF0ZSA9IGNhbGxEZXRhaWxSZWNvcmRzLmxvYWRGaWx0ZXJzU3RhdGUoKTtcblxuICAgICAgICBDZHJBUEkuZ2V0TWV0YWRhdGEoeyBsaW1pdDogMTAwIH0sIChkYXRhKSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLmhhc1JlY29yZHMpIHtcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnREYXRlLCBlbmREYXRlO1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBzYXZlZCBzdGF0ZSB3aXRoIGRhdGVzLCB1c2UgdGhvc2UgaW5zdGVhZCBvZiBtZXRhZGF0YVxuICAgICAgICAgICAgICAgIGlmIChzYXZlZFN0YXRlICYmIHNhdmVkU3RhdGUuZGF0ZUZyb20gJiYgc2F2ZWRTdGF0ZS5kYXRlVG8pIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnREYXRlID0gbW9tZW50KHNhdmVkU3RhdGUuZGF0ZUZyb20pO1xuICAgICAgICAgICAgICAgICAgICBlbmREYXRlID0gbW9tZW50KHNhdmVkU3RhdGUuZGF0ZVRvKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IG1ldGFkYXRhIGRhdGUgc3RyaW5ncyB0byBtb21lbnQgb2JqZWN0c1xuICAgICAgICAgICAgICAgICAgICBzdGFydERhdGUgPSBtb21lbnQoZGF0YS5lYXJsaWVzdERhdGUpO1xuICAgICAgICAgICAgICAgICAgICBlbmREYXRlID0gbW9tZW50KGRhdGEubGF0ZXN0RGF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3JkcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKHN0YXJ0RGF0ZSwgZW5kRGF0ZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIERhdGFUYWJsZSBvbmx5IGlmIHdlIGhhdmUgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogRGF0YVRhYmxlIG5lZWRzIGRhdGUgcmFuZ2UgdG8gYmUgc2V0IGZpcnN0XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZURhdGFUYWJsZUFuZEhhbmRsZXJzKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vIHJlY29yZHMgaW4gZGF0YWJhc2UgYXQgYWxsIG9yIEFQSSBlcnJvclxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5zaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyKCk7XG4gICAgICAgICAgICAgICAgLy8gRG9uJ3QgaW5pdGlhbGl6ZSBEYXRhVGFibGUgYXQgYWxsIC0ganVzdCBzaG93IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGEgc3R5bGVkIGVtcHR5IHRhYmxlIG1lc3NhZ2VcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIG1lc3NhZ2UgZm9yIGVtcHR5IHRhYmxlXG4gICAgICovXG4gICAgZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKSB7XG4gICAgICAgIC8vIElmIGRhdGFiYXNlIGlzIGVtcHR5LCB3ZSBkb24ndCBzaG93IHRoaXMgbWVzc2FnZSBpbiB0YWJsZVxuICAgICAgICBpZiAoIWNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBmaWx0ZXJlZCBlbXB0eSBzdGF0ZSBtZXNzYWdlXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBwbGFjZWhvbGRlciBzZWdtZW50XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaWNvbiBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInNlYXJjaCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9GaWx0ZXJlZEVtcHR5VGl0bGV9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpbmxpbmVcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dFwiPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5jZHJfRmlsdGVyZWRFbXB0eURlc2NyaXB0aW9ufVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PmA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93cyB0aGUgZW1wdHkgZGF0YWJhc2UgcGxhY2Vob2xkZXIgYW5kIGhpZGVzIHRoZSB0YWJsZVxuICAgICAqL1xuICAgIHNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIoKSB7XG4gICAgICAgIC8vIEhpZGUgdGhlIHRhYmxlIGl0c2VsZiAoRGF0YVRhYmxlIHdvbid0IGJlIGluaXRpYWxpemVkKVxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuaGlkZSgpO1xuXG4gICAgICAgIC8vIEhpZGUgc2VhcmNoIGFuZCBkYXRlIGNvbnRyb2xzXG4gICAgICAgICQoJyNkYXRlLXJhbmdlLXNlbGVjdG9yJykuY2xvc2VzdCgnLnVpLnJvdycpLmhpZGUoKTtcblxuICAgICAgICAvLyBTaG93IHBsYWNlaG9sZGVyXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIuc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm0gUkVTVCBBUEkgZ3JvdXBlZCByZWNvcmRzIHRvIERhdGFUYWJsZSByb3cgZm9ybWF0XG4gICAgICogQHBhcmFtIHtBcnJheX0gcmVzdERhdGEgLSBBcnJheSBvZiBncm91cGVkIENEUiByZWNvcmRzIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIERhdGFUYWJsZSByb3dzXG4gICAgICovXG4gICAgdHJhbnNmb3JtUmVzdFRvRGF0YVRhYmxlKHJlc3REYXRhKSB7XG4gICAgICAgIHJldHVybiByZXN0RGF0YS5tYXAoZ3JvdXAgPT4ge1xuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWluZyBkaXNwbGF5XG4gICAgICAgICAgICBjb25zdCBiaWxsc2VjID0gZ3JvdXAudG90YWxCaWxsc2VjIHx8IDA7XG4gICAgICAgICAgICBjb25zdCB0aW1lRm9ybWF0ID0gKGJpbGxzZWMgPCAzNjAwKSA/ICdtbTpzcycgOiAnSEg6bW06c3MnO1xuICAgICAgICAgICAgY29uc3QgdGltaW5nID0gYmlsbHNlYyA+IDAgPyBtb21lbnQudXRjKGJpbGxzZWMgKiAxMDAwKS5mb3JtYXQodGltZUZvcm1hdCkgOiAnJztcblxuICAgICAgICAgICAgLy8gRm9ybWF0IHN0YXJ0IGRhdGVcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZERhdGUgPSBtb21lbnQoZ3JvdXAuc3RhcnQpLmZvcm1hdCgnREQtTU0tWVlZWSBISDptbTpzcycpO1xuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IHJlY29yZGluZyByZWNvcmRzIC0gZmlsdGVyIG9ubHkgcmVjb3JkcyB3aXRoIGFjdHVhbCByZWNvcmRpbmcgZmlsZXNcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZGluZ3MgPSAoZ3JvdXAucmVjb3JkcyB8fCBbXSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKHIgPT4gci5yZWNvcmRpbmdmaWxlICYmIHIucmVjb3JkaW5nZmlsZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgIC5tYXAociA9PiAoe1xuICAgICAgICAgICAgICAgICAgICBpZDogci5pZCxcbiAgICAgICAgICAgICAgICAgICAgc3JjX251bTogci5zcmNfbnVtLFxuICAgICAgICAgICAgICAgICAgICBkc3RfbnVtOiByLmRzdF9udW0sXG4gICAgICAgICAgICAgICAgICAgIHJlY29yZGluZ2ZpbGU6IHIucmVjb3JkaW5nZmlsZSxcbiAgICAgICAgICAgICAgICAgICAgcGxheWJhY2tfdXJsOiByLnBsYXliYWNrX3VybCwgICAvLyBUb2tlbi1iYXNlZCBVUkwgZm9yIHBsYXliYWNrXG4gICAgICAgICAgICAgICAgICAgIGRvd25sb2FkX3VybDogci5kb3dubG9hZF91cmwgICAgLy8gVG9rZW4tYmFzZWQgVVJMIGZvciBkb3dubG9hZFxuICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIENTUyBjbGFzc1xuICAgICAgICAgICAgY29uc3QgaGFzUmVjb3JkaW5ncyA9IHJlY29yZGluZ3MubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGlzQW5zd2VyZWQgPSBncm91cC5kaXNwb3NpdGlvbiA9PT0gJ0FOU1dFUkVEJztcbiAgICAgICAgICAgIGNvbnN0IGR0Um93Q2xhc3MgPSBoYXNSZWNvcmRpbmdzID8gJ2RldGFpbGVkJyA6ICd1aSc7XG4gICAgICAgICAgICBjb25zdCBuZWdhdGl2ZUNsYXNzID0gaXNBbnN3ZXJlZCA/ICcnIDogJyBuZWdhdGl2ZSc7XG5cbiAgICAgICAgICAgIC8vIENvbGxlY3QgdmVyYm9zZSBjYWxsIElEc1xuICAgICAgICAgICAgY29uc3QgaWRzID0gKGdyb3VwLnJlY29yZHMgfHwgW10pXG4gICAgICAgICAgICAgICAgLm1hcChyID0+IHIudmVyYm9zZV9jYWxsX2lkKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoaWQgPT4gaWQgJiYgaWQubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAuam9pbignJicpO1xuXG4gICAgICAgICAgICAvLyBSZXR1cm4gRGF0YVRhYmxlIHJvdyBmb3JtYXRcbiAgICAgICAgICAgIC8vIERhdGFUYWJsZXMgbmVlZHMgYm90aCBhcnJheSBpbmRpY2VzIEFORCBzcGVjaWFsIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IFtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWREYXRlLCAgICAgICAgICAgICAgLy8gMDogZGF0ZVxuICAgICAgICAgICAgICAgIGdyb3VwLnNyY19udW0sICAgICAgICAgICAgICAvLyAxOiBzb3VyY2UgbnVtYmVyXG4gICAgICAgICAgICAgICAgZ3JvdXAuZHN0X251bSB8fCBncm91cC5kaWQsIC8vIDI6IGRlc3RpbmF0aW9uIG51bWJlciBvciBESURcbiAgICAgICAgICAgICAgICB0aW1pbmcsICAgICAgICAgICAgICAgICAgICAgLy8gMzogZHVyYXRpb25cbiAgICAgICAgICAgICAgICByZWNvcmRpbmdzLCAgICAgICAgICAgICAgICAgLy8gNDogcmVjb3JkaW5nIHJlY29yZHMgYXJyYXlcbiAgICAgICAgICAgICAgICBncm91cC5kaXNwb3NpdGlvbiAgICAgICAgICAgLy8gNTogZGlzcG9zaXRpb25cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIC8vIEFkZCBEYXRhVGFibGVzIHNwZWNpYWwgcHJvcGVydGllc1xuICAgICAgICAgICAgcm93LkRUX1Jvd0lkID0gZ3JvdXAubGlua2VkaWQ7XG4gICAgICAgICAgICByb3cuRFRfUm93Q2xhc3MgPSBkdFJvd0NsYXNzICsgbmVnYXRpdmVDbGFzcztcbiAgICAgICAgICAgIHJvdy5pZHMgPSBpZHM7IC8vIFN0b3JlIHJhdyBJRHMgd2l0aG91dCBlbmNvZGluZyAtIGVuY29kaW5nIHdpbGwgYmUgYXBwbGllZCB3aGVuIGJ1aWxkaW5nIFVSTFxuXG4gICAgICAgICAgICByZXR1cm4gcm93O1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSBzZXQgb2YgY2FsbCByZWNvcmRzIHdoZW4gYSByb3cgaXMgY2xpY2tlZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjYWxsIHJlY29yZHMuXG4gICAgICovXG4gICAgc2hvd1JlY29yZHMoZGF0YSkge1xuICAgICAgICBsZXQgaHRtbFBsYXllciA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIHRhYmxlIGNkci1wbGF5ZXJcIj48dGJvZHk+JztcbiAgICAgICAgZGF0YVs0XS5mb3JFYWNoKChyZWNvcmQsIGkpID0+IHtcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IG51bGxcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvdyBkaXNhYmxlZFwiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCJcIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiIGRhdGEtdmFsdWU9XCJcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0b2tlbi1iYXNlZCBVUkxzIGluc3RlYWQgb2YgZGlyZWN0IGZpbGUgcGF0aHNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IFNlY3VyaXR5IC0gaGlkZXMgYWN0dWFsIGZpbGUgcGF0aHMgZnJvbSB1c2VyXG4gICAgICAgICAgICAgICAgLy8gVHdvIHNlcGFyYXRlIGVuZHBvaW50czogOnBsYXliYWNrIChpbmxpbmUpIGFuZCA6ZG93bmxvYWQgKGZpbGUpXG4gICAgICAgICAgICAgICAgY29uc3QgcGxheWJhY2tVcmwgPSByZWNvcmQucGxheWJhY2tfdXJsIHx8ICcnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRvd25sb2FkVXJsID0gcmVjb3JkLmRvd25sb2FkX3VybCB8fCAnJztcblxuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvd1wiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCIke3BsYXliYWNrVXJsfVwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIGNvbXBhY3QgaWNvbiB0b3AgbGVmdCBwb2ludGluZyBkcm9wZG93biBkb3dubG9hZC1mb3JtYXQtZHJvcGRvd25cIiBkYXRhLWRvd25sb2FkLXVybD1cIiR7ZG93bmxvYWRVcmx9XCI+XG4gICAgXHRcdDxpIGNsYXNzPVwiZG93bmxvYWQgaWNvblwiPjwvaT5cbiAgICBcdFx0PGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICBcdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtZm9ybWF0PVwid2VibVwiPldlYk0gKE9wdXMpPC9kaXY+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIm1wM1wiPk1QMzwvZGl2PlxuICAgIFx0XHRcdDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1mb3JtYXQ9XCJ3YXZcIj5XQVY8L2Rpdj5cbiAgICBcdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtZm9ybWF0PVwib2dnXCI+T0dHIChPcHVzKTwvZGl2PlxuICAgIFx0XHQ8L2Rpdj5cbiAgICBcdDwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaHRtbFBsYXllciArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgICAgIHJldHVybiBodG1sUGxheWVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBwYWdlIGxlbmd0aCBmb3IgRGF0YVRhYmxlLCBjb25zaWRlcmluZyB1c2VyJ3Mgc2F2ZWQgcHJlZmVyZW5jZVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0UGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3Mgc2F2ZWQgdmFsdWUgb3IgdXNlIHRoZSBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgdmFsdWUgaWYgbm9uZSBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICByZXR1cm4gc2F2ZWRQYWdlTGVuZ3RoID8gcGFyc2VJbnQoc2F2ZWRQYWdlTGVuZ3RoLCAxMCkgOiBjYWxsRGV0YWlsUmVjb3Jkcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiByb3dzIHRoYXQgY2FuIGZpdCBvbiBhIHBhZ2UgYmFzZWQgb24gdGhlIGN1cnJlbnQgd2luZG93IGhlaWdodC5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZmluZCgndGJvZHkgPiB0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDQwMDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDUpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IuXG4gICAgICogQHBhcmFtIHttb21lbnR9IHN0YXJ0RGF0ZSAtIE9wdGlvbmFsIGVhcmxpZXN0IHJlY29yZCBkYXRlIGZyb20gbGFzdCAxMDAgcmVjb3Jkc1xuICAgICAqIEBwYXJhbSB7bW9tZW50fSBlbmREYXRlIC0gT3B0aW9uYWwgbGF0ZXN0IHJlY29yZCBkYXRlIGZyb20gbGFzdCAxMDAgcmVjb3Jkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcihzdGFydERhdGUgPSBudWxsLCBlbmREYXRlID0gbnVsbCkge1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge307XG5cbiAgICAgICAgb3B0aW9ucy5yYW5nZXMgPSB7XG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9Ub2RheV06IFttb21lbnQoKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfWWVzdGVyZGF5XTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdFdlZWtdOiBbbW9tZW50KCkuc3VidHJhY3QoNiwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdDMwRGF5c106IFttb21lbnQoKS5zdWJ0cmFjdCgyOSwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVGhpc01vbnRoXTogW21vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLmVuZE9mKCdtb250aCcpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RNb250aF06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgIH07XG4gICAgICAgIG9wdGlvbnMuYWx3YXlzU2hvd0NhbGVuZGFycyA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMuYXV0b1VwZGF0ZUlucHV0ID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5saW5rZWRDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLm1heERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgb3B0aW9ucy5sb2NhbGUgPSB7XG4gICAgICAgICAgICBmb3JtYXQ6ICdERC9NTS9ZWVlZJyxcbiAgICAgICAgICAgIHNlcGFyYXRvcjogJyAtICcsXG4gICAgICAgICAgICBhcHBseUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0FwcGx5QnRuLFxuICAgICAgICAgICAgY2FuY2VsTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ2FuY2VsQnRuLFxuICAgICAgICAgICAgZnJvbUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX2Zyb20sXG4gICAgICAgICAgICB0b0xhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX3RvLFxuICAgICAgICAgICAgY3VzdG9tUmFuZ2VMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9DdXN0b21QZXJpb2QsXG4gICAgICAgICAgICBkYXlzT2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQuZGF5cyxcbiAgICAgICAgICAgIG1vbnRoTmFtZXM6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5tb250aHMsXG4gICAgICAgICAgICBmaXJzdERheTogMSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGRhdGUgcmFuZ2UgZnJvbSBsYXN0IDEwMCByZWNvcmRzLCB1c2UgaXRcbiAgICAgICAgLy8gV0hZOiBQcm92aWRlcyBtZWFuaW5nZnVsIGNvbnRleHQgLSB1c2VyIHNlZXMgcGVyaW9kIGNvdmVyaW5nIHJlY2VudCBjYWxsc1xuICAgICAgICBpZiAoc3RhcnREYXRlICYmIGVuZERhdGUpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KHN0YXJ0RGF0ZSkuc3RhcnRPZignZGF5Jyk7XG4gICAgICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBtb21lbnQoZW5kRGF0ZSkuZW5kT2YoJ2RheScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gdG9kYXkgaWYgbm8gcmVjb3Jkc1xuICAgICAgICAgICAgb3B0aW9ucy5zdGFydERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIG9wdGlvbnMuZW5kRGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGVyYW5nZXBpY2tlcihcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QsXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gTm90ZTogRG9uJ3QgY2FsbCBhcHBseUZpbHRlciBoZXJlIC0gRGF0YVRhYmxlIGlzIG5vdCBpbml0aWFsaXplZCB5ZXRcbiAgICAgICAgLy8gRGF0YVRhYmxlIHdpbGwgbG9hZCBkYXRhIGF1dG9tYXRpY2FsbHkgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIHNlbGVjdCBldmVudC5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IHN0YXJ0IC0gVGhlIHN0YXJ0IGRhdGUuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBlbmQgLSBUaGUgZW5kIGRhdGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGxhYmVsIC0gVGhlIGxhYmVsLlxuICAgICAqL1xuICAgIGNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdChzdGFydCwgZW5kLCBsYWJlbCkge1xuICAgICAgICAvLyBPbmx5IHBhc3Mgc2VhcmNoIGtleXdvcmQsIGRhdGVzIGFyZSByZWFkIGRpcmVjdGx5IGZyb20gZGF0ZSByYW5nZSBzZWxlY3RvclxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcihjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpKTtcbiAgICAgICAgLy8gU3RhdGUgd2lsbCBiZSBzYXZlZCBhdXRvbWF0aWNhbGx5IGluIGRyYXcgZXZlbnQgYWZ0ZXIgZmlsdGVyIGlzIGFwcGxpZWRcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZmlsdGVyIHRvIHRoZSBkYXRhIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIGZpbHRlciB0ZXh0LlxuICAgICAqL1xuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBDRFIgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19