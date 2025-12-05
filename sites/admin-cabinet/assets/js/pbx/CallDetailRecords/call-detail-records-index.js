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
    // Listen for hash changes (when user clicks menu link while already on page)
    // WHY: Browser doesn't reload page on hash-only URL changes
    $("a[href='".concat(globalRootUrl, "call-detail-records/index/#reset-cache']")).on('click', function (e) {
      e.preventDefault(); // Remove hash from URL without page reload

      history.replaceState(null, null, window.location.pathname);
      callDetailRecords.clearFiltersState(); // Also clear page length preference

      localStorage.removeItem('cdrTablePageLength'); // Reload page to apply reset

      window.location.reload();
    }); // Fetch metadata first, then initialize DataTable with proper date range
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
    }); // Build columns dynamically based on ACL permissions
    // WHY: Volt template conditionally renders delete column header based on isAllowed('delete')
    // If columns config doesn't match <thead> count, DataTables throws 'style' undefined error

    var canDelete = typeof ACLHelper !== 'undefined' && ACLHelper.isAllowed('delete');
    var columns = [{
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
    } // 4: duration (array index 3)
    ];

    if (canDelete) {
      columns.push({
        data: null,
        orderable: false
      }); // 5: actions column (logs icon + delete)
    }

    callDetailRecords.$cdrTable.dataTable({
      search: {
        search: callDetailRecords.$globalSearch.val()
      },
      serverSide: true,
      processing: true,
      columns: columns,
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

        $('td', row).eq(4).html(data[3]).addClass('right aligned'); // Actions column: only render if user has delete permission
        // WHY: Volt template conditionally renders this column based on isAllowed('delete')

        if (!canDelete) {
          return;
        } // Last column: log icon + delete button


        var actionsHtml = ''; // Add log icon if user has access to System Diagnostic
        // WHY: Log icon links to system-diagnostic page which requires specific permissions

        var canViewLogs = typeof ACLHelper !== 'undefined' && ACLHelper.isAllowed('viewSystemDiagnostic');

        if (canViewLogs && data.ids !== '') {
          actionsHtml += "<i data-ids=\"".concat(data.ids, "\" class=\"file alternate outline icon\" style=\"cursor: pointer; margin-right: 8px;\"></i>");
        } // Add delete button
        // WHY: Use two-steps-delete mechanism to prevent accidental deletion
        // First click changes trash icon to close icon, second click deletes
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCIkc2VhcmNoQ0RSSW5wdXQiLCIkcGFnZUxlbmd0aFNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImhhc0NEUlJlY29yZHMiLCIkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiU1RPUkFHRV9LRVkiLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImdsb2JhbFJvb3RVcmwiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiY2xlYXJGaWx0ZXJzU3RhdGUiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwicmVsb2FkIiwiZmV0Y2hMYXRlc3RDRFJEYXRlIiwic2F2ZUZpbHRlcnNTdGF0ZSIsInNlc3Npb25TdG9yYWdlIiwiY29uc29sZSIsIndhcm4iLCJzdGF0ZSIsImRhdGVGcm9tIiwiZGF0ZVRvIiwic2VhcmNoVGV4dCIsImN1cnJlbnRQYWdlIiwicGFnZUxlbmd0aCIsImdldFBhZ2VMZW5ndGgiLCJkYXRlUmFuZ2VQaWNrZXIiLCJkYXRhIiwic3RhcnREYXRlIiwiZW5kRGF0ZSIsImZvcm1hdCIsInZhbCIsInBhZ2UiLCJwYWdlSW5mbyIsImluZm8iLCJzZXRJdGVtIiwiSlNPTiIsInN0cmluZ2lmeSIsImVycm9yIiwibG9hZEZpbHRlcnNTdGF0ZSIsInJhd0RhdGEiLCJnZXRJdGVtIiwicGFyc2UiLCJpbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMiLCJzZWFyY2hEZWJvdW5jZVRpbWVyIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImtleUNvZGUiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJjYW5EZWxldGUiLCJBQ0xIZWxwZXIiLCJpc0FsbG93ZWQiLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwicHVzaCIsInNlYXJjaCIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiY29sdW1uRGVmcyIsImRlZmF1bHRDb250ZW50IiwidGFyZ2V0cyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInBhcmFtcyIsImlzTGlua2VkSWRTZWFyY2giLCJpc1ZhbGlkIiwiZW5kT2YiLCJzZWFyY2hLZXl3b3JkIiwidmFsdWUiLCJ0cmltIiwia2V5d29yZCIsInN0YXJ0c1dpdGgiLCJzcmNfbnVtIiwic3Vic3RyaW5nIiwiZHN0X251bSIsImRpZCIsImxpbmtlZGlkIiwibGltaXQiLCJvZmZzZXQiLCJzdGFydCIsInNvcnQiLCJvcmRlciIsImdyb3VwZWQiLCJkYXRhU3JjIiwianNvbiIsInJlc3VsdCIsInJlc3REYXRhIiwicmVjb3JkcyIsInBhZ2luYXRpb24iLCJyZWNvcmRzVG90YWwiLCJ0b3RhbCIsInJlY29yZHNGaWx0ZXJlZCIsInRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZSIsImJlZm9yZVNlbmQiLCJ4aHIiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsInNldFJlcXVlc3RIZWFkZXIiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZW1wdHlUYWJsZSIsImdldEVtcHR5VGFibGVNZXNzYWdlIiwiemVyb1JlY29yZHMiLCJjcmVhdGVkUm93Iiwicm93IiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiYWRkQ2xhc3MiLCJhY3Rpb25zSHRtbCIsImNhblZpZXdMb2dzIiwiaWRzIiwiRFRfUm93SWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZHJfRGVsZXRlUmVjb3JkIiwiZHJhd0NhbGxiYWNrIiwiRXh0ZW5zaW9uc0FQSSIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsInRvZ2dsZVBhZ2luYXRpb25Db250cm9scyIsImluaXRDb21wbGV0ZSIsInJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJtaW5DaGFyYWN0ZXJzIiwic2VhcmNoT25Gb2N1cyIsInNlYXJjaEZpZWxkcyIsInNob3dOb1Jlc3VsdHMiLCJzb3VyY2UiLCJ0aXRsZSIsImNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciIsImNkcl9TZWFyY2hCeURlc3ROdW1iZXIiLCJjZHJfU2VhcmNoQnlESUQiLCJjZHJfU2VhcmNoQnlMaW5rZWRJRCIsImNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzcG9uc2UiLCJmb2N1cyIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibGVuIiwiZHJhdyIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwic2F2ZWRQYWdlTGVuZ3RoIiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmRlZmluZWQiLCJlbmNvZGVVUklDb21wb25lbnQiLCJvcGVuIiwidHIiLCJ0YXJnZXQiLCJjaGlsZCIsImlzU2hvd24iLCJoaWRlIiwic2hvd1JlY29yZHMiLCJzaG93IiwiZmluZCIsImVhY2giLCJpbmRleCIsInBsYXllclJvdyIsImlkIiwiQ0RSUGxheWVyIiwiJGJ1dHRvbiIsInJlY29yZElkIiwiZGVsZXRlUmVjb3JkIiwic2F2ZWRTdGF0ZSIsIkNkckFQSSIsImRlbGV0ZVJlY29yZGluZyIsImVycm9yTXNnIiwibWVzc2FnZXMiLCJjZHJfRGVsZXRlRmFpbGVkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJwYWdlcyIsInRhYmxlIiwiY29udGFpbmVyIiwiZ2V0TWV0YWRhdGEiLCJoYXNSZWNvcmRzIiwibW9tZW50IiwiZWFybGllc3REYXRlIiwibGF0ZXN0RGF0ZSIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsInNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIiLCJjZHJfRmlsdGVyZWRFbXB0eVRpdGxlIiwiY2RyX0ZpbHRlcmVkRW1wdHlEZXNjcmlwdGlvbiIsIm1hcCIsImdyb3VwIiwiYmlsbHNlYyIsInRvdGFsQmlsbHNlYyIsInRpbWVGb3JtYXQiLCJ0aW1pbmciLCJ1dGMiLCJmb3JtYXR0ZWREYXRlIiwicmVjb3JkaW5ncyIsImZpbHRlciIsInIiLCJyZWNvcmRpbmdmaWxlIiwicGxheWJhY2tfdXJsIiwiZG93bmxvYWRfdXJsIiwiaGFzUmVjb3JkaW5ncyIsImlzQW5zd2VyZWQiLCJkaXNwb3NpdGlvbiIsImR0Um93Q2xhc3MiLCJuZWdhdGl2ZUNsYXNzIiwidmVyYm9zZV9jYWxsX2lkIiwiam9pbiIsImh0bWxQbGF5ZXIiLCJmb3JFYWNoIiwicmVjb3JkIiwiaSIsInBsYXliYWNrVXJsIiwiZG93bmxvYWRVcmwiLCJwYXJzZUludCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsIm9wdGlvbnMiLCJyYW5nZXMiLCJjYWxfVG9kYXkiLCJjYWxfWWVzdGVyZGF5Iiwic3VidHJhY3QiLCJjYWxfTGFzdFdlZWsiLCJjYWxfTGFzdDMwRGF5cyIsImNhbF9UaGlzTW9udGgiLCJzdGFydE9mIiwiY2FsX0xhc3RNb250aCIsImFsd2F5c1Nob3dDYWxlbmRhcnMiLCJhdXRvVXBkYXRlSW5wdXQiLCJsaW5rZWRDYWxlbmRhcnMiLCJtYXhEYXRlIiwibG9jYWxlIiwic2VwYXJhdG9yIiwiYXBwbHlMYWJlbCIsImNhbF9BcHBseUJ0biIsImNhbmNlbExhYmVsIiwiY2FsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsImNhbF9mcm9tIiwidG9MYWJlbCIsImNhbF90byIsImN1c3RvbVJhbmdlTGFiZWwiLCJjYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJkYXRlcmFuZ2VwaWNrZXIiLCJjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QiLCJlbmQiLCJsYWJlbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFQyxDQUFDLENBQUMsWUFBRCxDQUxVOztBQU90QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxlQUFELENBWE07O0FBYXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGtCQUFrQixFQUFFRixDQUFDLENBQUMsc0JBQUQsQ0FqQkM7O0FBbUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxlQUFlLEVBQUVILENBQUMsQ0FBQyxtQkFBRCxDQXZCSTs7QUF5QnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLG1CQUFtQixFQUFFSixDQUFDLENBQUMscUJBQUQsQ0E3QkE7O0FBK0J0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxTQUFTLEVBQUUsRUFuQ1c7O0FBcUN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsRUF6Q2E7O0FBMkN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsSUEvQ087O0FBaUR0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSx5QkFBeUIsRUFBRVIsQ0FBQyxDQUFDLGlDQUFELENBckROOztBQXVEdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSVMsRUFBQUEsV0FBVyxFQUFFLG1CQTNE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QUFDSjtBQUNBO0FBQ0E7QUFDSW1CLEVBQUFBLFdBejNCc0IsdUJBeTNCVkQsSUF6M0JVLEVBeTNCSjtBQUNkOUQsSUFBQUEsaUJBQWlCLENBQUNPLFNBQWxCLENBQTRCK0QsTUFBNUIsQ0FBbUNSLElBQW5DLEVBQXlDcUcsSUFBekM7QUFDQW5LLElBQUFBLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ29LLE9BQWhDLENBQXdDLEtBQXhDLEVBQStDckMsUUFBL0MsQ0FBd0QsU0FBeEQ7QUFDSDtBQTUzQnFCLENBQTFCO0FBKzNCQTtBQUNBO0FBQ0E7O0FBQ0FoSSxDQUFDLENBQUN5UixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCNVIsRUFBQUEsaUJBQWlCLENBQUNhLFVBQWxCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRXh0ZW5zaW9uc0FQSSwgbW9tZW50LCBnbG9iYWxUcmFuc2xhdGUsIENEUlBsYXllciwgQ2RyQVBJLCBVc2VyTWVzc2FnZSwgQUNMSGVscGVyICovXG5cbi8qKlxuICogY2FsbERldGFpbFJlY29yZHMgbW9kdWxlLlxuICogQG1vZHVsZSBjYWxsRGV0YWlsUmVjb3Jkc1xuICovXG5jb25zdCBjYWxsRGV0YWlsUmVjb3JkcyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgY2FsbCBkZXRhaWwgcmVjb3JkcyB0YWJsZSBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNkclRhYmxlOiAkKCcjY2RyLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbHNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkYXRlUmFuZ2VTZWxlY3RvcjogJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBzZWFyY2ggQ0RSIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VhcmNoQ0RSSW5wdXQ6ICQoJyNzZWFyY2gtY2RyLWlucHV0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcGFnZUxlbmd0aFNlbGVjdG9yOiAkKCcjcGFnZS1sZW5ndGgtc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQW4gYXJyYXkgb2YgcGxheWVycy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgcGxheWVyczogW10sXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgQ0RSIGRhdGFiYXNlIGhhcyBhbnkgcmVjb3Jkc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGhhc0NEUlJlY29yZHM6IHRydWUsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZW1wdHkgZGF0YWJhc2UgcGxhY2Vob2xkZXIgZWxlbWVudFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcjogJCgnI2Nkci1lbXB0eS1kYXRhYmFzZS1wbGFjZWhvbGRlcicpLFxuXG4gICAgLyoqXG4gICAgICogU3RvcmFnZSBrZXkgZm9yIGZpbHRlciBzdGF0ZSBpbiBzZXNzaW9uU3RvcmFnZVxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgU1RPUkFHRV9LRVk6ICdjZHJfZmlsdGVyc19zdGF0ZScsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHRyYWNrIGlmIERhdGFUYWJsZSBoYXMgY29tcGxldGVkIGluaXRpYWxpemF0aW9uXG4gICAgICogV0hZOiBQcmV2ZW50cyBzYXZpbmcgc3RhdGUgZHVyaW5nIGluaXRpYWwgbG9hZCBiZWZvcmUgZmlsdGVycyBhcmUgcmVzdG9yZWRcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0luaXRpYWxpemVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjYWxsIGRldGFpbCByZWNvcmRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIExpc3RlbiBmb3IgaGFzaCBjaGFuZ2VzICh3aGVuIHVzZXIgY2xpY2tzIG1lbnUgbGluayB3aGlsZSBhbHJlYWR5IG9uIHBhZ2UpXG4gICAgICAgIC8vIFdIWTogQnJvd3NlciBkb2Vzbid0IHJlbG9hZCBwYWdlIG9uIGhhc2gtb25seSBVUkwgY2hhbmdlc1xuICAgICAgICAkKGBhW2hyZWY9JyR7Z2xvYmFsUm9vdFVybH1jYWxsLWRldGFpbC1yZWNvcmRzL2luZGV4LyNyZXNldC1jYWNoZSddYCkub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgIC8vIFJlbW92ZSBoYXNoIGZyb20gVVJMIHdpdGhvdXQgcGFnZSByZWxvYWRcbiAgICAgICAgICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZShudWxsLCBudWxsLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2xlYXJGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgICAgICAvLyBBbHNvIGNsZWFyIHBhZ2UgbGVuZ3RoIHByZWZlcmVuY2VcbiAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgLy8gUmVsb2FkIHBhZ2UgdG8gYXBwbHkgcmVzZXRcbiAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEZldGNoIG1ldGFkYXRhIGZpcnN0LCB0aGVuIGluaXRpYWxpemUgRGF0YVRhYmxlIHdpdGggcHJvcGVyIGRhdGUgcmFuZ2VcbiAgICAgICAgLy8gV0hZOiBQcmV2ZW50cyBkb3VibGUgcmVxdWVzdCBvbiBwYWdlIGxvYWRcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZmV0Y2hMYXRlc3RDRFJEYXRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmUgY3VycmVudCBmaWx0ZXIgc3RhdGUgdG8gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBTdG9yZXMgZGF0ZSByYW5nZSwgc2VhcmNoIHRleHQsIGN1cnJlbnQgcGFnZSwgYW5kIHBhZ2UgbGVuZ3RoXG4gICAgICovXG4gICAgc2F2ZUZpbHRlcnNTdGF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEZlYXR1cmUgZGV0ZWN0aW9uIC0gZXhpdCBzaWxlbnRseSBpZiBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlc3Npb25TdG9yYWdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignW0NEUl0gc2Vzc2lvblN0b3JhZ2Ugbm90IGF2YWlsYWJsZScpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSB7XG4gICAgICAgICAgICAgICAgZGF0ZUZyb206IG51bGwsXG4gICAgICAgICAgICAgICAgZGF0ZVRvOiBudWxsLFxuICAgICAgICAgICAgICAgIHNlYXJjaFRleHQ6ICcnLFxuICAgICAgICAgICAgICAgIGN1cnJlbnRQYWdlOiAwLFxuICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGg6IGNhbGxEZXRhaWxSZWNvcmRzLmdldFBhZ2VMZW5ndGgoKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gR2V0IGRhdGVzIGZyb20gZGF0ZXJhbmdlcGlja2VyIGluc3RhbmNlXG4gICAgICAgICAgICBjb25zdCBkYXRlUmFuZ2VQaWNrZXIgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IuZGF0YSgnZGF0ZXJhbmdlcGlja2VyJyk7XG4gICAgICAgICAgICBpZiAoZGF0ZVJhbmdlUGlja2VyICYmIGRhdGVSYW5nZVBpY2tlci5zdGFydERhdGUgJiYgZGF0ZVJhbmdlUGlja2VyLmVuZERhdGUpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kYXRlRnJvbSA9IGRhdGVSYW5nZVBpY2tlci5zdGFydERhdGUuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgICAgICAgICAgICAgc3RhdGUuZGF0ZVRvID0gZGF0ZVJhbmdlUGlja2VyLmVuZERhdGUuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEdldCBzZWFyY2ggdGV4dCBmcm9tIGlucHV0IGZpZWxkXG4gICAgICAgICAgICBzdGF0ZS5zZWFyY2hUZXh0ID0gY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSB8fCAnJztcblxuICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgcGFnZSBmcm9tIERhdGFUYWJsZSAoaWYgaW5pdGlhbGl6ZWQpXG4gICAgICAgICAgICBpZiAoY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlICYmIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZUluZm8gPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5pbmZvKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUuY3VycmVudFBhZ2UgPSBwYWdlSW5mby5wYWdlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGNhbGxEZXRhaWxSZWNvcmRzLlNUT1JBR0VfS0VZLCBKU09OLnN0cmluZ2lmeShzdGF0ZSkpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0NEUl0gRmFpbGVkIHRvIHNhdmUgZmlsdGVycyB0byBzZXNzaW9uU3RvcmFnZTonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmaWx0ZXIgc3RhdGUgZnJvbSBzZXNzaW9uU3RvcmFnZVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R8bnVsbH0gU2F2ZWQgc3RhdGUgb2JqZWN0IG9yIG51bGwgaWYgbm90IGZvdW5kL2ludmFsaWRcbiAgICAgKi9cbiAgICBsb2FkRmlsdGVyc1N0YXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRmVhdHVyZSBkZXRlY3Rpb24gLSByZXR1cm4gbnVsbCBpZiBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlc3Npb25TdG9yYWdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignW0NEUl0gc2Vzc2lvblN0b3JhZ2Ugbm90IGF2YWlsYWJsZSBmb3IgbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByYXdEYXRhID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShjYWxsRGV0YWlsUmVjb3Jkcy5TVE9SQUdFX0tFWSk7XG4gICAgICAgICAgICBpZiAoIXJhd0RhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSBKU09OLnBhcnNlKHJhd0RhdGEpO1xuXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBzdGF0ZSBzdHJ1Y3R1cmVcbiAgICAgICAgICAgIGlmICghc3RhdGUgfHwgdHlwZW9mIHN0YXRlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNsZWFyRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tDRFJdIEZhaWxlZCB0byBsb2FkIGZpbHRlcnMgZnJvbSBzZXNzaW9uU3RvcmFnZTonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBDbGVhciBjb3JydXB0ZWQgZGF0YVxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2xlYXJGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFyIHNhdmVkIGZpbHRlciBzdGF0ZSBmcm9tIHNlc3Npb25TdG9yYWdlXG4gICAgICovXG4gICAgY2xlYXJGaWx0ZXJzU3RhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlc3Npb25TdG9yYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oY2FsbERldGFpbFJlY29yZHMuU1RPUkFHRV9LRVkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNsZWFyIENEUiBmaWx0ZXJzIGZyb20gc2Vzc2lvblN0b3JhZ2U6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRGF0YVRhYmxlIGFuZCBldmVudCBoYW5kbGVyc1xuICAgICAqIENhbGxlZCBhZnRlciBtZXRhZGF0YSBpcyByZWNlaXZlZFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGVBbmRIYW5kbGVycygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJvdW5jZSB0aW1lciB2YXJpYWJsZVxuICAgICAgICBsZXQgc2VhcmNoRGVib3VuY2VUaW1lciA9IG51bGw7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZXIgaWYgdGhlIHVzZXIgaXMgc3RpbGwgdHlwaW5nXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoc2VhcmNoRGVib3VuY2VUaW1lcik7XG5cbiAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciBmb3IgZGVsYXllZCBleGVjdXRpb25cbiAgICAgICAgICAgIHNlYXJjaERlYm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxM1xuICAgICAgICAgICAgICAgICAgICB8fCBlLmtleUNvZGUgPT09IDhcbiAgICAgICAgICAgICAgICAgICAgfHwgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBwYXNzIHRoZSBzZWFyY2gga2V5d29yZCwgZGF0ZXMgYXJlIGhhbmRsZWQgc2VwYXJhdGVseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVsYXkgYmVmb3JlIGV4ZWN1dGluZyB0aGUgc2VhcmNoXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJ1aWxkIGNvbHVtbnMgZHluYW1pY2FsbHkgYmFzZWQgb24gQUNMIHBlcm1pc3Npb25zXG4gICAgICAgIC8vIFdIWTogVm9sdCB0ZW1wbGF0ZSBjb25kaXRpb25hbGx5IHJlbmRlcnMgZGVsZXRlIGNvbHVtbiBoZWFkZXIgYmFzZWQgb24gaXNBbGxvd2VkKCdkZWxldGUnKVxuICAgICAgICAvLyBJZiBjb2x1bW5zIGNvbmZpZyBkb2Vzbid0IG1hdGNoIDx0aGVhZD4gY291bnQsIERhdGFUYWJsZXMgdGhyb3dzICdzdHlsZScgdW5kZWZpbmVkIGVycm9yXG4gICAgICAgIGNvbnN0IGNhbkRlbGV0ZSA9IHR5cGVvZiBBQ0xIZWxwZXIgIT09ICd1bmRlZmluZWQnICYmIEFDTEhlbHBlci5pc0FsbG93ZWQoJ2RlbGV0ZScpO1xuICAgICAgICBjb25zdCBjb2x1bW5zID0gW1xuICAgICAgICAgICAgeyBkYXRhOiBudWxsLCBvcmRlcmFibGU6IGZhbHNlIH0sICAvLyAwOiBleHBhbmQgaWNvbiBjb2x1bW5cbiAgICAgICAgICAgIHsgZGF0YTogMCB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMTogZGF0ZSAoYXJyYXkgaW5kZXggMClcbiAgICAgICAgICAgIHsgZGF0YTogMSB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMjogc3JjX251bSAoYXJyYXkgaW5kZXggMSlcbiAgICAgICAgICAgIHsgZGF0YTogMiB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMzogZHN0X251bSAoYXJyYXkgaW5kZXggMilcbiAgICAgICAgICAgIHsgZGF0YTogMyB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gNDogZHVyYXRpb24gKGFycmF5IGluZGV4IDMpXG4gICAgICAgIF07XG4gICAgICAgIGlmIChjYW5EZWxldGUpIHtcbiAgICAgICAgICAgIGNvbHVtbnMucHVzaCh7IGRhdGE6IG51bGwsIG9yZGVyYWJsZTogZmFsc2UgfSk7ICAvLyA1OiBhY3Rpb25zIGNvbHVtbiAobG9ncyBpY29uICsgZGVsZXRlKVxuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmRhdGFUYWJsZSh7XG4gICAgICAgICAgICBzZWFyY2g6IHtcbiAgICAgICAgICAgICAgICBzZWFyY2g6IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBjb2x1bW5zLFxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvY2RyJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJywgIC8vIFJFU1QgQVBJIHVzZXMgR0VUIGZvciBsaXN0IHJldHJpZXZhbFxuICAgICAgICAgICAgICAgIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgICAgIGxldCBpc0xpbmtlZElkU2VhcmNoID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gMS4gQWx3YXlzIGdldCBkYXRlcyBmcm9tIGRhdGUgcmFuZ2Ugc2VsZWN0b3IgdXNpbmcgZGF0ZXJhbmdlcGlja2VyIEFQSVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlUmFuZ2VQaWNrZXIgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IuZGF0YSgnZGF0ZXJhbmdlcGlja2VyJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRlUmFuZ2VQaWNrZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0RGF0ZSA9IGRhdGVSYW5nZVBpY2tlci5zdGFydERhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmREYXRlID0gZGF0ZVJhbmdlUGlja2VyLmVuZERhdGU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydERhdGUgJiYgc3RhcnREYXRlLmlzVmFsaWQoKSAmJiBlbmREYXRlICYmIGVuZERhdGUuaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRhdGVGcm9tID0gc3RhcnREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kYXRlVG8gPSBlbmREYXRlLmVuZE9mKCdkYXknKS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW06c3MnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIDIuIFByb2Nlc3Mgc2VhcmNoIGtleXdvcmQgZnJvbSBzZWFyY2ggaW5wdXQgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoS2V5d29yZCA9IGQuc2VhcmNoLnZhbHVlIHx8ICcnO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWFyY2hLZXl3b3JkLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5d29yZCA9IHNlYXJjaEtleXdvcmQudHJpbSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSBzZWFyY2ggcHJlZml4ZXM6IHNyYzosIGRzdDosIGRpZDosIGxpbmtlZGlkOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnc3JjOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IHNvdXJjZSBudW1iZXIgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zcmNfbnVtID0ga2V5d29yZC5zdWJzdHJpbmcoNCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ2RzdDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBkZXN0aW5hdGlvbiBudW1iZXIgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kc3RfbnVtID0ga2V5d29yZC5zdWJzdHJpbmcoNCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ2RpZDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBESUQgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kaWQgPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnbGlua2VkaWQ6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgbGlua2VkaWQgLSBpZ25vcmUgZGF0ZSByYW5nZSBmb3IgbGlua2VkaWQgc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmxpbmtlZGlkID0ga2V5d29yZC5zdWJzdHJpbmcoOSkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzTGlua2VkSWRTZWFyY2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkYXRlIHBhcmFtcyBmb3IgbGlua2VkaWQgc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHBhcmFtcy5kYXRlRnJvbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcGFyYW1zLmRhdGVUbztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRnVsbC10ZXh0IHNlYXJjaDogc2VhcmNoIGluIHNyY19udW0sIGRzdF9udW0sIGFuZCBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZXIgZXhwZWN0cyBzZWFyY2ggd2l0aG91dCBwcmVmaXggdG8gZmluZCBudW1iZXIgYW55d2hlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuc2VhcmNoID0ga2V5d29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJFU1QgQVBJIHBhZ2luYXRpb24gcGFyYW1ldGVyc1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMubGltaXQgPSBkLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9mZnNldCA9IGQuc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zb3J0ID0gJ3N0YXJ0JzsgIC8vIFNvcnQgYnkgY2FsbCBzdGFydCB0aW1lIGZvciBjaHJvbm9sb2dpY2FsIG9yZGVyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vcmRlciA9ICdERVNDJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFdlYlVJIGFsd2F5cyBuZWVkcyBncm91cGVkIHJlY29yZHMgKGJ5IGxpbmtlZGlkKSBmb3IgcHJvcGVyIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgLy8gQmFja2VuZCBkZWZhdWx0cyB0byBncm91cGVkPXRydWUsIGJ1dCBleHBsaWNpdCBpcyBiZXR0ZXIgdGhhbiBpbXBsaWNpdFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZ3JvdXBlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRhdGFTcmM6IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIHJldHVybnMgUEJYQXBpUmVzdWx0IHN0cnVjdHVyZTpcbiAgICAgICAgICAgICAgICAgICAgLy8ge3Jlc3VsdDogdHJ1ZSwgZGF0YToge3JlY29yZHM6IFsuLi5dLCBwYWdpbmF0aW9uOiB7Li4ufX19XG4gICAgICAgICAgICAgICAgICAgIGlmIChqc29uLnJlc3VsdCAmJiBqc29uLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgcmVjb3JkcyBhbmQgcGFnaW5hdGlvbiBmcm9tIG5lc3RlZCBkYXRhIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdERhdGEgPSBqc29uLmRhdGEucmVjb3JkcyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2luYXRpb24gPSBqc29uLmRhdGEucGFnaW5hdGlvbiB8fCB7fTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IERhdGFUYWJsZXMgcGFnaW5hdGlvbiBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uLnJlY29yZHNUb3RhbCA9IHBhZ2luYXRpb24udG90YWwgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc0ZpbHRlcmVkID0gcGFnaW5hdGlvbi50b3RhbCB8fCAwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmFuc2Zvcm0gUkVTVCByZWNvcmRzIHRvIERhdGFUYWJsZSByb3dzXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbERldGFpbFJlY29yZHMudHJhbnNmb3JtUmVzdFRvRGF0YVRhYmxlKHJlc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBiZWZvcmVTZW5kOiBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIEJlYXJlciB0b2tlbiBmb3IgQVBJIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICAvL3Njcm9sbFk6ICQod2luZG93KS5oZWlnaHQoKSAtIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vZmZzZXQoKS50b3AtMTUwLFxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRQYWdlTGVuZ3RoKCksXG4gICAgICAgICAgICBsYW5ndWFnZToge1xuICAgICAgICAgICAgICAgIC4uLlNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgICAgICBlbXB0eVRhYmxlOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRFbXB0eVRhYmxlTWVzc2FnZSgpLFxuICAgICAgICAgICAgICAgIHplcm9SZWNvcmRzOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRFbXB0eVRhYmxlTWVzc2FnZSgpXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIENEUiByb3cuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLkRUX1Jvd0NsYXNzLmluZGV4T2YoXCJkZXRhaWxlZFwiKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCc8aSBjbGFzcz1cImljb24gY2FyZXQgZG93blwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgxKS5odG1sKGRhdGFbMF0pO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgyKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzFdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDMpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGRhdGFbMl0pXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcblxuICAgICAgICAgICAgICAgIC8vIER1cmF0aW9uIGNvbHVtbiAobm8gaWNvbnMpXG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmh0bWwoZGF0YVszXSkuYWRkQ2xhc3MoJ3JpZ2h0IGFsaWduZWQnKTtcblxuICAgICAgICAgICAgICAgIC8vIEFjdGlvbnMgY29sdW1uOiBvbmx5IHJlbmRlciBpZiB1c2VyIGhhcyBkZWxldGUgcGVybWlzc2lvblxuICAgICAgICAgICAgICAgIC8vIFdIWTogVm9sdCB0ZW1wbGF0ZSBjb25kaXRpb25hbGx5IHJlbmRlcnMgdGhpcyBjb2x1bW4gYmFzZWQgb24gaXNBbGxvd2VkKCdkZWxldGUnKVxuICAgICAgICAgICAgICAgIGlmICghY2FuRGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBMYXN0IGNvbHVtbjogbG9nIGljb24gKyBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgbGV0IGFjdGlvbnNIdG1sID0gJyc7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgbG9nIGljb24gaWYgdXNlciBoYXMgYWNjZXNzIHRvIFN5c3RlbSBEaWFnbm9zdGljXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBMb2cgaWNvbiBsaW5rcyB0byBzeXN0ZW0tZGlhZ25vc3RpYyBwYWdlIHdoaWNoIHJlcXVpcmVzIHNwZWNpZmljIHBlcm1pc3Npb25zXG4gICAgICAgICAgICAgICAgY29uc3QgY2FuVmlld0xvZ3MgPSB0eXBlb2YgQUNMSGVscGVyICE9PSAndW5kZWZpbmVkJyAmJiBBQ0xIZWxwZXIuaXNBbGxvd2VkKCd2aWV3U3lzdGVtRGlhZ25vc3RpYycpO1xuICAgICAgICAgICAgICAgIGlmIChjYW5WaWV3TG9ncyAmJiBkYXRhLmlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uc0h0bWwgKz0gYDxpIGRhdGEtaWRzPVwiJHtkYXRhLmlkc31cIiBjbGFzcz1cImZpbGUgYWx0ZXJuYXRlIG91dGxpbmUgaWNvblwiIHN0eWxlPVwiY3Vyc29yOiBwb2ludGVyOyBtYXJnaW4tcmlnaHQ6IDhweDtcIj48L2k+YDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlIHR3by1zdGVwcy1kZWxldGUgbWVjaGFuaXNtIHRvIHByZXZlbnQgYWNjaWRlbnRhbCBkZWxldGlvblxuICAgICAgICAgICAgICAgIC8vIEZpcnN0IGNsaWNrIGNoYW5nZXMgdHJhc2ggaWNvbiB0byBjbG9zZSBpY29uLCBzZWNvbmQgY2xpY2sgZGVsZXRlc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlIGRhdGEuRFRfUm93SWQgd2hpY2ggY29udGFpbnMgbGlua2VkaWQgZm9yIGdyb3VwZWQgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGFjdGlvbnNIdG1sICs9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidHdvLXN0ZXBzLWRlbGV0ZSBkZWxldGUtcmVjb3JkIHBvcHVwZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXJlY29yZC1pZD1cIiR7ZGF0YS5EVF9Sb3dJZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5jZHJfRGVsZXRlUmVjb3JkIHx8ICdEZWxldGUgcmVjb3JkJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiIHN0eWxlPVwibWFyZ2luOiAwO1wiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPmA7XG5cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNSkuaHRtbChhY3Rpb25zSHRtbCkuYWRkQ2xhc3MoJ3JpZ2h0IGFsaWduZWQnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMudG9nZ2xlUGFnaW5hdGlvbkNvbnRyb2xzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJbml0aWFsaXphdGlvbiBjb21wbGV0ZSBjYWxsYmFjayAtIGZpcmVkIGFmdGVyIGZpcnN0IGRhdGEgbG9hZFxuICAgICAgICAgICAgICogV0hZOiBSZXN0b3JlIGZpbHRlcnMgQUZURVIgRGF0YVRhYmxlIGhhcyBsb2FkZWQgaW5pdGlhbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGluaXRDb21wbGV0ZSgpIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgZmxhZyBGSVJTVCB0byBhbGxvdyBzdGF0ZSBzYXZpbmcgZHVyaW5nIGZpbHRlciByZXN0b3JhdGlvblxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIC8vIE5vdyByZXN0b3JlIGZpbHRlcnMgLSBkcmF3IGV2ZW50IHdpbGwgY29ycmVjdGx5IHNhdmUgdGhlIHJlc3RvcmVkIHN0YXRlXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMucmVzdG9yZUZpbHRlcnNGcm9tU3RhdGUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgU2VhcmNoIGNvbXBvbmVudCBBRlRFUiBEYXRhVGFibGUgaXMgY3JlYXRlZFxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kc2VhcmNoQ0RSSW5wdXQuc2VhcmNoKHtcbiAgICAgICAgICAgIG1pbkNoYXJhY3RlcnM6IDAsXG4gICAgICAgICAgICBzZWFyY2hPbkZvY3VzOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaEZpZWxkczogWyd0aXRsZSddLFxuICAgICAgICAgICAgc2hvd05vUmVzdWx0czogZmFsc2UsXG4gICAgICAgICAgICBzb3VyY2U6IFtcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5U291cmNlTnVtYmVyLCB2YWx1ZTogJ3NyYzonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeURlc3ROdW1iZXIsIHZhbHVlOiAnZHN0OicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5RElELCB2YWx1ZTogJ2RpZDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeUxpbmtlZElELCB2YWx1ZTogJ2xpbmtlZGlkOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5Q3VzdG9tUGhyYXNlLCB2YWx1ZTogJycgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvblNlbGVjdDogZnVuY3Rpb24ocmVzdWx0LCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCgnaGlkZSByZXN1bHRzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdGFydCB0aGUgc2VhcmNoIHdoZW4geW91IGNsaWNrIG9uIHRoZSBpY29uXG4gICAgICAgICQoJyNzZWFyY2gtaWNvbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5mb2N1cygpO1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCgncXVlcnknKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgdG8gc2F2ZSB0aGUgdXNlcidzIHBhZ2UgbGVuZ3RoIHNlbGVjdGlvbiBhbmQgdXBkYXRlIHRoZSB0YWJsZVxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKHBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUxlbmd0aCA9PT0gJ2F1dG8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGggPSBjYWxsRGV0YWlsUmVjb3Jkcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBzZWxlY3QgaW5wdXQgdmFsdWUgdG8gdGhlIHNhdmVkIHZhbHVlIGlmIGl0IGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oJ3NldCB2YWx1ZScsIHNhdmVkUGFnZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIFNraXAgc2F2aW5nIHN0YXRlIGR1cmluZyBpbml0aWFsIGxvYWQgYmVmb3JlIGZpbHRlcnMgYXJlIHJlc3RvcmVkXG4gICAgICAgICAgICBpZiAoIWNhbGxEZXRhaWxSZWNvcmRzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNhdmUgc3RhdGUgYWZ0ZXIgZXZlcnkgZHJhdyAocGFnaW5hdGlvbiwgc2VhcmNoLCBkYXRlIGNoYW5nZSlcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnNhdmVGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIGZvciBjbGlja2luZyBvbiBpY29uIHdpdGggZGF0YS1pZHMgKG9wZW4gaW4gbmV3IHdpbmRvdylcbiAgICAgICAgLy8gV0hZOiBDbGlja2luZyBvbiBpY29uIHNob3VsZCBvcGVuIFN5c3RlbSBEaWFnbm9zdGljIGluIG5ldyB3aW5kb3cgdG8gdmlldyB2ZXJib3NlIGxvZ3NcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICdbZGF0YS1pZHNdJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgcm93IHRvZ2dsZVxuXG4gICAgICAgICAgICBjb25zdCBpZHMgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS1pZHMnKTtcbiAgICAgICAgICAgIGlmIChpZHMgIT09IHVuZGVmaW5lZCAmJiBpZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gV0hZOiBGb3JtYXQgYXMgcXVlcnkgcGFyYW0gKyBoYXNoOiA/ZmlsdGVyPS4uLiNmaWxlPS4uLlxuICAgICAgICAgICAgICAgIC8vIE9wZW4gaW4gbmV3IHdpbmRvdyB0byBhbGxvdyB2aWV3aW5nIGxvZ3Mgd2hpbGUga2VlcGluZyBDRFIgdGFibGUgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGAke2dsb2JhbFJvb3RVcmx9c3lzdGVtLWRpYWdub3N0aWMvaW5kZXgvP2ZpbHRlcj0ke2VuY29kZVVSSUNvbXBvbmVudChpZHMpfSNmaWxlPWFzdGVyaXNrJTJGdmVyYm9zZWA7XG4gICAgICAgICAgICAgICAgd2luZG93Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3Igb3BlbmluZyBhbmQgY2xvc2luZyBkZXRhaWxzXG4gICAgICAgIC8vIFdIWTogT25seSBleHBhbmQvY29sbGFwc2Ugb24gZmlyc3QgY29sdW1uIChjYXJldCBpY29uKSBjbGljaywgbm90IG9uIGFjdGlvbiBpY29uc1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ3RyLmRldGFpbGVkIHRkOmZpcnN0LWNoaWxkJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5yb3codHIpO1xuXG4gICAgICAgICAgICBpZiAocm93LmNoaWxkLmlzU2hvd24oKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgcm93IGlzIGFscmVhZHkgb3BlbiAtIGNsb3NlIGl0XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB0ci5yZW1vdmVDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gT3BlbiB0aGlzIHJvd1xuICAgICAgICAgICAgICAgIHJvdy5jaGlsZChjYWxsRGV0YWlsUmVjb3Jkcy5zaG93UmVjb3Jkcyhyb3cuZGF0YSgpKSkuc2hvdygpO1xuICAgICAgICAgICAgICAgIHRyLmFkZENsYXNzKCdzaG93bicpO1xuICAgICAgICAgICAgICAgIHJvdy5jaGlsZCgpLmZpbmQoJy5kZXRhaWwtcmVjb3JkLXJvdycpLmVhY2goKGluZGV4LCBwbGF5ZXJSb3cpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSAkKHBsYXllclJvdykuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDRFJQbGF5ZXIoaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgc2Vjb25kIGNsaWNrIG9uIGRlbGV0ZSBidXR0b24gKGFmdGVyIHR3by1zdGVwcy1kZWxldGUgY2hhbmdlcyBpY29uIHRvIGNsb3NlKVxuICAgICAgICAvLyBXSFk6IFR3by1zdGVwcy1kZWxldGUgbWVjaGFuaXNtIHByZXZlbnRzIGFjY2lkZW50YWwgZGVsZXRpb25cbiAgICAgICAgLy8gRmlyc3QgY2xpY2s6IHRyYXNoIOKGkiBjbG9zZSAoYnkgZGVsZXRlLXNvbWV0aGluZy5qcyksIFNlY29uZCBjbGljazogZXhlY3V0ZSBkZWxldGlvblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ2EuZGVsZXRlLXJlY29yZDpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgcm93IGV4cGFuc2lvblxuXG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtcmVjb3JkLWlkJyk7XG5cbiAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZCBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCBsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIEFsd2F5cyBkZWxldGUgd2l0aCByZWNvcmRpbmdzIGFuZCBsaW5rZWQgcmVjb3Jkc1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGVsZXRlUmVjb3JkKHJlY29yZElkLCAkYnV0dG9uKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc3RvcmUgZmlsdGVycyBmcm9tIHNhdmVkIHN0YXRlIGFmdGVyIERhdGFUYWJsZSBpbml0aWFsaXphdGlvblxuICAgICAqIFdIWTogTXVzdCBiZSBjYWxsZWQgYWZ0ZXIgRGF0YVRhYmxlIGlzIGNyZWF0ZWQgdG8gcmVzdG9yZSBzZWFyY2ggYW5kIHBhZ2VcbiAgICAgKi9cbiAgICByZXN0b3JlRmlsdGVyc0Zyb21TdGF0ZSgpIHtcbiAgICAgICAgY29uc3Qgc2F2ZWRTdGF0ZSA9IGNhbGxEZXRhaWxSZWNvcmRzLmxvYWRGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgaWYgKCFzYXZlZFN0YXRlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXN0b3JlIHNlYXJjaCB0ZXh0IHRvIGlucHV0IGZpZWxkXG4gICAgICAgIGlmIChzYXZlZFN0YXRlLnNlYXJjaFRleHQpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCk7XG4gICAgICAgICAgICAvLyBBcHBseSBzZWFyY2ggdG8gRGF0YVRhYmxlXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuc2VhcmNoKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXN0b3JlIHBhZ2UgbnVtYmVyIHdpdGggZGVsYXlcbiAgICAgICAgLy8gV0hZOiBEYXRhVGFibGUgaWdub3JlcyBwYWdlKCkgZHVyaW5nIGluaXRDb21wbGV0ZSwgbmVlZCBzZXRUaW1lb3V0IHRvIGFsbG93IGluaXRpYWxpemF0aW9uIHRvIGZ1bGx5IGNvbXBsZXRlXG4gICAgICAgIGlmIChzYXZlZFN0YXRlLmN1cnJlbnRQYWdlKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZShzYXZlZFN0YXRlLmN1cnJlbnRQYWdlKS5kcmF3KGZhbHNlKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2F2ZWRTdGF0ZS5zZWFyY2hUZXh0KSB7XG4gICAgICAgICAgICAvLyBJZiBvbmx5IHNlYXJjaCB0ZXh0IGV4aXN0cywgc3RpbGwgbmVlZCB0byBkcmF3XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuZHJhdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBDRFIgcmVjb3JkIHZpYSBSRVNUIEFQSVxuICAgICAqIFdIWTogRGVsZXRlcyBieSBsaW5rZWRpZCAtIGF1dG9tYXRpY2FsbHkgcmVtb3ZlcyBlbnRpcmUgY29udmVyc2F0aW9uIHdpdGggYWxsIGxpbmtlZCByZWNvcmRzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gQ0RSIGxpbmtlZGlkIChsaWtlIFwibWlrb3BieC0xNzYwNzg0NzkzLjQ2MjdcIilcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGJ1dHRvbiAtIEJ1dHRvbiBlbGVtZW50IHRvIHVwZGF0ZSBzdGF0ZVxuICAgICAqL1xuICAgIGRlbGV0ZVJlY29yZChyZWNvcmRJZCwgJGJ1dHRvbikge1xuICAgICAgICAvLyBBbHdheXMgZGVsZXRlIHdpdGggcmVjb3JkaW5nIGZpbGVzXG4gICAgICAgIC8vIFdIWTogbGlua2VkaWQgYXV0b21hdGljYWxseSBkZWxldGVzIGFsbCBsaW5rZWQgcmVjb3JkcyAobm8gZGVsZXRlTGlua2VkIHBhcmFtZXRlciBuZWVkZWQpXG4gICAgICAgIENkckFQSS5kZWxldGVSZWNvcmQocmVjb3JkSWQsIHsgZGVsZXRlUmVjb3JkaW5nOiB0cnVlIH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2lsZW50bHkgcmVsb2FkIHRoZSBEYXRhVGFibGUgdG8gcmVmbGVjdCBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBWaXN1YWwgZmVlZGJhY2sgKGRpc2FwcGVhcmluZyByb3cpIGlzIGVub3VnaCwgbm8gbmVlZCBmb3Igc3VjY2VzcyB0b2FzdFxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5hamF4LnJlbG9hZChudWxsLCBmYWxzZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZSBvbmx5IG9uIGZhaWx1cmVcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IHJlc3BvbnNlPy5tZXNzYWdlcz8uZXJyb3I/LlswXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY2RyX0RlbGV0ZUZhaWxlZCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGRlbGV0ZSByZWNvcmQnO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1zZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSBwYWdpbmF0aW9uIGNvbnRyb2xzIHZpc2liaWxpdHkgYmFzZWQgb24gZGF0YSBzaXplXG4gICAgICovXG4gICAgdG9nZ2xlUGFnaW5hdGlvbkNvbnRyb2xzKCkge1xuICAgICAgICBjb25zdCBpbmZvID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UuaW5mbygpO1xuICAgICAgICBpZiAoaW5mby5wYWdlcyA8PSAxKSB7XG4gICAgICAgICAgICAkKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS50YWJsZSgpLmNvbnRhaW5lcigpKS5maW5kKCcuZGF0YVRhYmxlc19wYWdpbmF0ZScpLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnRhYmxlKCkuY29udGFpbmVyKCkpLmZpbmQoJy5kYXRhVGFibGVzX3BhZ2luYXRlJykuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgQ0RSIG1ldGFkYXRhIChkYXRlIHJhbmdlKSB1c2luZyBDZHJBUElcbiAgICAgKiBXSFk6IExpZ2h0d2VpZ2h0IHJlcXVlc3QgcmV0dXJucyBvbmx5IG1ldGFkYXRhIChkYXRlcyksIG5vdCBmdWxsIENEUiByZWNvcmRzXG4gICAgICogQXZvaWRzIGRvdWJsZSByZXF1ZXN0IG9uIHBhZ2UgbG9hZFxuICAgICAqL1xuICAgIGZldGNoTGF0ZXN0Q0RSRGF0ZSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHNhdmVkIHN0YXRlIGZpcnN0XG4gICAgICAgIGNvbnN0IHNhdmVkU3RhdGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy5sb2FkRmlsdGVyc1N0YXRlKCk7XG5cbiAgICAgICAgQ2RyQVBJLmdldE1ldGFkYXRhKHsgbGltaXQ6IDEwMCB9LCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5oYXNSZWNvcmRzKSB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0RGF0ZSwgZW5kRGF0ZTtcblxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgc2F2ZWQgc3RhdGUgd2l0aCBkYXRlcywgdXNlIHRob3NlIGluc3RlYWQgb2YgbWV0YWRhdGFcbiAgICAgICAgICAgICAgICBpZiAoc2F2ZWRTdGF0ZSAmJiBzYXZlZFN0YXRlLmRhdGVGcm9tICYmIHNhdmVkU3RhdGUuZGF0ZVRvKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0RGF0ZSA9IG1vbWVudChzYXZlZFN0YXRlLmRhdGVGcm9tKTtcbiAgICAgICAgICAgICAgICAgICAgZW5kRGF0ZSA9IG1vbWVudChzYXZlZFN0YXRlLmRhdGVUbyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBtZXRhZGF0YSBkYXRlIHN0cmluZ3MgdG8gbW9tZW50IG9iamVjdHNcbiAgICAgICAgICAgICAgICAgICAgc3RhcnREYXRlID0gbW9tZW50KGRhdGEuZWFybGllc3REYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgZW5kRGF0ZSA9IG1vbWVudChkYXRhLmxhdGVzdERhdGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcihzdGFydERhdGUsIGVuZERhdGUpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBEYXRhVGFibGUgb25seSBpZiB3ZSBoYXZlIHJlY29yZHNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IERhdGFUYWJsZSBuZWVkcyBkYXRlIHJhbmdlIHRvIGJlIHNldCBmaXJzdFxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemVEYXRhVGFibGVBbmRIYW5kbGVycygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBObyByZWNvcmRzIGluIGRhdGFiYXNlIGF0IGFsbCBvciBBUEkgZXJyb3JcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuc2hvd0VtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcigpO1xuICAgICAgICAgICAgICAgIC8vIERvbid0IGluaXRpYWxpemUgRGF0YVRhYmxlIGF0IGFsbCAtIGp1c3Qgc2hvdyBwbGFjZWhvbGRlclxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBhIHN0eWxlZCBlbXB0eSB0YWJsZSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBtZXNzYWdlIGZvciBlbXB0eSB0YWJsZVxuICAgICAqL1xuICAgIGdldEVtcHR5VGFibGVNZXNzYWdlKCkge1xuICAgICAgICAvLyBJZiBkYXRhYmFzZSBpcyBlbXB0eSwgd2UgZG9uJ3Qgc2hvdyB0aGlzIG1lc3NhZ2UgaW4gdGFibGVcbiAgICAgICAgaWYgKCFjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgZmlsdGVyZWQgZW1wdHkgc3RhdGUgbWVzc2FnZVxuICAgICAgICByZXR1cm4gYFxuICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcGxhY2Vob2xkZXIgc2VnbWVudFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGljb24gaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzZWFyY2ggaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5jZHJfRmlsdGVyZWRFbXB0eVRpdGxlfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW5saW5lXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHRcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0ZpbHRlcmVkRW1wdHlEZXNjcmlwdGlvbn1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIGVtcHR5IGRhdGFiYXNlIHBsYWNlaG9sZGVyIGFuZCBoaWRlcyB0aGUgdGFibGVcbiAgICAgKi9cbiAgICBzaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyKCkge1xuICAgICAgICAvLyBIaWRlIHRoZSB0YWJsZSBpdHNlbGYgKERhdGFUYWJsZSB3b24ndCBiZSBpbml0aWFsaXplZClcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmhpZGUoKTtcblxuICAgICAgICAvLyBIaWRlIHNlYXJjaCBhbmQgZGF0ZSBjb250cm9sc1xuICAgICAgICAkKCcjZGF0ZS1yYW5nZS1zZWxlY3RvcicpLmNsb3Nlc3QoJy51aS5yb3cnKS5oaWRlKCk7XG5cbiAgICAgICAgLy8gU2hvdyBwbGFjZWhvbGRlclxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyLnNob3coKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVHJhbnNmb3JtIFJFU1QgQVBJIGdyb3VwZWQgcmVjb3JkcyB0byBEYXRhVGFibGUgcm93IGZvcm1hdFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJlc3REYXRhIC0gQXJyYXkgb2YgZ3JvdXBlZCBDRFIgcmVjb3JkcyBmcm9tIFJFU1QgQVBJXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBEYXRhVGFibGUgcm93c1xuICAgICAqL1xuICAgIHRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZShyZXN0RGF0YSkge1xuICAgICAgICByZXR1cm4gcmVzdERhdGEubWFwKGdyb3VwID0+IHtcbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSB0aW1pbmcgZGlzcGxheVxuICAgICAgICAgICAgY29uc3QgYmlsbHNlYyA9IGdyb3VwLnRvdGFsQmlsbHNlYyB8fCAwO1xuICAgICAgICAgICAgY29uc3QgdGltZUZvcm1hdCA9IChiaWxsc2VjIDwgMzYwMCkgPyAnbW06c3MnIDogJ0hIOm1tOnNzJztcbiAgICAgICAgICAgIGNvbnN0IHRpbWluZyA9IGJpbGxzZWMgPiAwID8gbW9tZW50LnV0YyhiaWxsc2VjICogMTAwMCkuZm9ybWF0KHRpbWVGb3JtYXQpIDogJyc7XG5cbiAgICAgICAgICAgIC8vIEZvcm1hdCBzdGFydCBkYXRlXG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREYXRlID0gbW9tZW50KGdyb3VwLnN0YXJ0KS5mb3JtYXQoJ0RELU1NLVlZWVkgSEg6bW06c3MnKTtcblxuICAgICAgICAgICAgLy8gRXh0cmFjdCByZWNvcmRpbmcgcmVjb3JkcyAtIGZpbHRlciBvbmx5IHJlY29yZHMgd2l0aCBhY3R1YWwgcmVjb3JkaW5nIGZpbGVzXG4gICAgICAgICAgICBjb25zdCByZWNvcmRpbmdzID0gKGdyb3VwLnJlY29yZHMgfHwgW10pXG4gICAgICAgICAgICAgICAgLmZpbHRlcihyID0+IHIucmVjb3JkaW5nZmlsZSAmJiByLnJlY29yZGluZ2ZpbGUubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAubWFwKHIgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHIuaWQsXG4gICAgICAgICAgICAgICAgICAgIHNyY19udW06IHIuc3JjX251bSxcbiAgICAgICAgICAgICAgICAgICAgZHN0X251bTogci5kc3RfbnVtLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmRpbmdmaWxlOiByLnJlY29yZGluZ2ZpbGUsXG4gICAgICAgICAgICAgICAgICAgIHBsYXliYWNrX3VybDogci5wbGF5YmFja191cmwsICAgLy8gVG9rZW4tYmFzZWQgVVJMIGZvciBwbGF5YmFja1xuICAgICAgICAgICAgICAgICAgICBkb3dubG9hZF91cmw6IHIuZG93bmxvYWRfdXJsICAgIC8vIFRva2VuLWJhc2VkIFVSTCBmb3IgZG93bmxvYWRcbiAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIC8vIERldGVybWluZSBDU1MgY2xhc3NcbiAgICAgICAgICAgIGNvbnN0IGhhc1JlY29yZGluZ3MgPSByZWNvcmRpbmdzLmxlbmd0aCA+IDA7XG4gICAgICAgICAgICBjb25zdCBpc0Fuc3dlcmVkID0gZ3JvdXAuZGlzcG9zaXRpb24gPT09ICdBTlNXRVJFRCc7XG4gICAgICAgICAgICBjb25zdCBkdFJvd0NsYXNzID0gaGFzUmVjb3JkaW5ncyA/ICdkZXRhaWxlZCcgOiAndWknO1xuICAgICAgICAgICAgY29uc3QgbmVnYXRpdmVDbGFzcyA9IGlzQW5zd2VyZWQgPyAnJyA6ICcgbmVnYXRpdmUnO1xuXG4gICAgICAgICAgICAvLyBDb2xsZWN0IHZlcmJvc2UgY2FsbCBJRHNcbiAgICAgICAgICAgIGNvbnN0IGlkcyA9IChncm91cC5yZWNvcmRzIHx8IFtdKVxuICAgICAgICAgICAgICAgIC5tYXAociA9PiByLnZlcmJvc2VfY2FsbF9pZClcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGlkID0+IGlkICYmIGlkLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgLmpvaW4oJyYnKTtcblxuICAgICAgICAgICAgLy8gUmV0dXJuIERhdGFUYWJsZSByb3cgZm9ybWF0XG4gICAgICAgICAgICAvLyBEYXRhVGFibGVzIG5lZWRzIGJvdGggYXJyYXkgaW5kaWNlcyBBTkQgc3BlY2lhbCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBjb25zdCByb3cgPSBbXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkRGF0ZSwgICAgICAgICAgICAgIC8vIDA6IGRhdGVcbiAgICAgICAgICAgICAgICBncm91cC5zcmNfbnVtLCAgICAgICAgICAgICAgLy8gMTogc291cmNlIG51bWJlclxuICAgICAgICAgICAgICAgIGdyb3VwLmRzdF9udW0gfHwgZ3JvdXAuZGlkLCAvLyAyOiBkZXN0aW5hdGlvbiBudW1iZXIgb3IgRElEXG4gICAgICAgICAgICAgICAgdGltaW5nLCAgICAgICAgICAgICAgICAgICAgIC8vIDM6IGR1cmF0aW9uXG4gICAgICAgICAgICAgICAgcmVjb3JkaW5ncywgICAgICAgICAgICAgICAgIC8vIDQ6IHJlY29yZGluZyByZWNvcmRzIGFycmF5XG4gICAgICAgICAgICAgICAgZ3JvdXAuZGlzcG9zaXRpb24gICAgICAgICAgIC8vIDU6IGRpc3Bvc2l0aW9uXG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAvLyBBZGQgRGF0YVRhYmxlcyBzcGVjaWFsIHByb3BlcnRpZXNcbiAgICAgICAgICAgIHJvdy5EVF9Sb3dJZCA9IGdyb3VwLmxpbmtlZGlkO1xuICAgICAgICAgICAgcm93LkRUX1Jvd0NsYXNzID0gZHRSb3dDbGFzcyArIG5lZ2F0aXZlQ2xhc3M7XG4gICAgICAgICAgICByb3cuaWRzID0gaWRzOyAvLyBTdG9yZSByYXcgSURzIHdpdGhvdXQgZW5jb2RpbmcgLSBlbmNvZGluZyB3aWxsIGJlIGFwcGxpZWQgd2hlbiBidWlsZGluZyBVUkxcblxuICAgICAgICAgICAgcmV0dXJuIHJvdztcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgc2V0IG9mIGNhbGwgcmVjb3JkcyB3aGVuIGEgcm93IGlzIGNsaWNrZWQuXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2FsbCByZWNvcmRzLlxuICAgICAqL1xuICAgIHNob3dSZWNvcmRzKGRhdGEpIHtcbiAgICAgICAgbGV0IGh0bWxQbGF5ZXIgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBiYXNpYyB0YWJsZSBjZHItcGxheWVyXCI+PHRib2R5Pic7XG4gICAgICAgIGRhdGFbNF0uZm9yRWFjaCgocmVjb3JkLCBpKSA9PiB7XG4gICAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIHx8IHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSBudWxsXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3cgZGlzYWJsZWRcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiXCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiXCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdG9rZW4tYmFzZWQgVVJMcyBpbnN0ZWFkIG9mIGRpcmVjdCBmaWxlIHBhdGhzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBTZWN1cml0eSAtIGhpZGVzIGFjdHVhbCBmaWxlIHBhdGhzIGZyb20gdXNlclxuICAgICAgICAgICAgICAgIC8vIFR3byBzZXBhcmF0ZSBlbmRwb2ludHM6IDpwbGF5YmFjayAoaW5saW5lKSBhbmQgOmRvd25sb2FkIChmaWxlKVxuICAgICAgICAgICAgICAgIGNvbnN0IHBsYXliYWNrVXJsID0gcmVjb3JkLnBsYXliYWNrX3VybCB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBkb3dubG9hZFVybCA9IHJlY29yZC5kb3dubG9hZF91cmwgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3dcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiJHtwbGF5YmFja1VybH1cIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IGljb24gdG9wIGxlZnQgcG9pbnRpbmcgZHJvcGRvd24gZG93bmxvYWQtZm9ybWF0LWRyb3Bkb3duXCIgZGF0YS1kb3dubG9hZC11cmw9XCIke2Rvd25sb2FkVXJsfVwiPlxuICAgIFx0XHQ8aSBjbGFzcz1cImRvd25sb2FkIGljb25cIj48L2k+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIndlYm1cIj5XZWJNIChPcHVzKTwvZGl2PlxuICAgIFx0XHRcdDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1mb3JtYXQ9XCJtcDNcIj5NUDM8L2Rpdj5cbiAgICBcdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtZm9ybWF0PVwid2F2XCI+V0FWPC9kaXY+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIm9nZ1wiPk9HRyAoT3B1cyk8L2Rpdj5cbiAgICBcdFx0PC9kaXY+XG4gICAgXHQ8L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0bWxQbGF5ZXIgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICByZXR1cm4gaHRtbFBsYXllcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgcGFnZSBsZW5ndGggZm9yIERhdGFUYWJsZSwgY29uc2lkZXJpbmcgdXNlcidzIHNhdmVkIHByZWZlcmVuY2VcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldFBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHNhdmVkIHZhbHVlIG9yIHVzZSB0aGUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHZhbHVlIGlmIG5vbmUgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgcmV0dXJuIHNhdmVkUGFnZUxlbmd0aCA/IHBhcnNlSW50KHNhdmVkUGFnZUxlbmd0aCwgMTApIDogY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygcm93cyB0aGF0IGNhbiBmaXQgb24gYSBwYWdlIGJhc2VkIG9uIHRoZSBjdXJyZW50IHdpbmRvdyBoZWlnaHQuXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmZpbmQoJ3Rib2R5ID4gdHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSA0MDA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCA1KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yLlxuICAgICAqIEBwYXJhbSB7bW9tZW50fSBzdGFydERhdGUgLSBPcHRpb25hbCBlYXJsaWVzdCByZWNvcmQgZGF0ZSBmcm9tIGxhc3QgMTAwIHJlY29yZHNcbiAgICAgKiBAcGFyYW0ge21vbWVudH0gZW5kRGF0ZSAtIE9wdGlvbmFsIGxhdGVzdCByZWNvcmQgZGF0ZSBmcm9tIGxhc3QgMTAwIHJlY29yZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3Ioc3RhcnREYXRlID0gbnVsbCwgZW5kRGF0ZSA9IG51bGwpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgIG9wdGlvbnMucmFuZ2VzID0ge1xuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVG9kYXldOiBbbW9tZW50KCksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1llc3RlcmRheV06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RXZWVrXTogW21vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3QzMERheXNdOiBbbW9tZW50KCkuc3VidHJhY3QoMjksICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1RoaXNNb250aF06IFttb21lbnQoKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0TW9udGhdOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zLmFsd2F5c1Nob3dDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmF1dG9VcGRhdGVJbnB1dCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMubGlua2VkQ2FsZW5kYXJzID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5tYXhEYXRlID0gbW9tZW50KCk7XG4gICAgICAgIG9wdGlvbnMubG9jYWxlID0ge1xuICAgICAgICAgICAgZm9ybWF0OiAnREQvTU0vWVlZWScsXG4gICAgICAgICAgICBzZXBhcmF0b3I6ICcgLSAnLFxuICAgICAgICAgICAgYXBwbHlMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9BcHBseUJ0bixcbiAgICAgICAgICAgIGNhbmNlbExhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0NhbmNlbEJ0bixcbiAgICAgICAgICAgIGZyb21MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9mcm9tLFxuICAgICAgICAgICAgdG9MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF90byxcbiAgICAgICAgICAgIGN1c3RvbVJhbmdlTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ3VzdG9tUGVyaW9kLFxuICAgICAgICAgICAgZGF5c09mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LmRheXMsXG4gICAgICAgICAgICBtb250aE5hbWVzOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQubW9udGhzLFxuICAgICAgICAgICAgZmlyc3REYXk6IDEsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBkYXRlIHJhbmdlIGZyb20gbGFzdCAxMDAgcmVjb3JkcywgdXNlIGl0XG4gICAgICAgIC8vIFdIWTogUHJvdmlkZXMgbWVhbmluZ2Z1bCBjb250ZXh0IC0gdXNlciBzZWVzIHBlcmlvZCBjb3ZlcmluZyByZWNlbnQgY2FsbHNcbiAgICAgICAgaWYgKHN0YXJ0RGF0ZSAmJiBlbmREYXRlKSB7XG4gICAgICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudChzdGFydERhdGUpLnN0YXJ0T2YoJ2RheScpO1xuICAgICAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KGVuZERhdGUpLmVuZE9mKCdkYXknKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRvZGF5IGlmIG5vIHJlY29yZHNcbiAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KCk7XG4gICAgICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRlcmFuZ2VwaWNrZXIoXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0LFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIE5vdGU6IERvbid0IGNhbGwgYXBwbHlGaWx0ZXIgaGVyZSAtIERhdGFUYWJsZSBpcyBub3QgaW5pdGlhbGl6ZWQgeWV0XG4gICAgICAgIC8vIERhdGFUYWJsZSB3aWxsIGxvYWQgZGF0YSBhdXRvbWF0aWNhbGx5IGFmdGVyIGluaXRpYWxpemF0aW9uXG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3RvciBzZWxlY3QgZXZlbnQuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBzdGFydCAtIFRoZSBzdGFydCBkYXRlLlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gZW5kIC0gVGhlIGVuZCBkYXRlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYWJlbCAtIFRoZSBsYWJlbC5cbiAgICAgKi9cbiAgICBjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3Qoc3RhcnQsIGVuZCwgbGFiZWwpIHtcbiAgICAgICAgLy8gT25seSBwYXNzIHNlYXJjaCBrZXl3b3JkLCBkYXRlcyBhcmUgcmVhZCBkaXJlY3RseSBmcm9tIGRhdGUgcmFuZ2Ugc2VsZWN0b3JcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIoY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSk7XG4gICAgICAgIC8vIFN0YXRlIHdpbGwgYmUgc2F2ZWQgYXV0b21hdGljYWxseSBpbiBkcmF3IGV2ZW50IGFmdGVyIGZpbHRlciBpcyBhcHBsaWVkXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5zZWFyY2godGV4dCkuZHJhdygpO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgQ0RSIHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==