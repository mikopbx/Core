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
    // WHY: Volt template conditionally renders delete column header based on isAllowed('save')
    // 'save' is a virtual permission that includes delete capability in ModuleUsersUI
    // If columns config doesn't match <thead> count, DataTables throws 'style' undefined error

    var canDelete = typeof ACLHelper !== 'undefined' && ACLHelper.isAllowed('save');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCIkc2VhcmNoQ0RSSW5wdXQiLCIkcGFnZUxlbmd0aFNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImhhc0NEUlJlY29yZHMiLCIkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiU1RPUkFHRV9LRVkiLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImdsb2JhbFJvb3RVcmwiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiY2xlYXJGaWx0ZXJzU3RhdGUiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwicmVsb2FkIiwiZmV0Y2hMYXRlc3RDRFJEYXRlIiwic2F2ZUZpbHRlcnNTdGF0ZSIsInNlc3Npb25TdG9yYWdlIiwiY29uc29sZSIsIndhcm4iLCJzdGF0ZSIsImRhdGVGcm9tIiwiZGF0ZVRvIiwic2VhcmNoVGV4dCIsImN1cnJlbnRQYWdlIiwicGFnZUxlbmd0aCIsImdldFBhZ2VMZW5ndGgiLCJkYXRlUmFuZ2VQaWNrZXIiLCJkYXRhIiwic3RhcnREYXRlIiwiZW5kRGF0ZSIsImZvcm1hdCIsInZhbCIsInBhZ2UiLCJwYWdlSW5mbyIsImluZm8iLCJzZXRJdGVtIiwiSlNPTiIsInN0cmluZ2lmeSIsImVycm9yIiwibG9hZEZpbHRlcnNTdGF0ZSIsInJhd0RhdGEiLCJnZXRJdGVtIiwicGFyc2UiLCJpbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMiLCJzZWFyY2hEZWJvdW5jZVRpbWVyIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImtleUNvZGUiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJjYW5EZWxldGUiLCJBQ0xIZWxwZXIiLCJpc0FsbG93ZWQiLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwicHVzaCIsInNlYXJjaCIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiY29sdW1uRGVmcyIsImRlZmF1bHRDb250ZW50IiwidGFyZ2V0cyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInBhcmFtcyIsImlzTGlua2VkSWRTZWFyY2giLCJpc1ZhbGlkIiwiZW5kT2YiLCJzZWFyY2hLZXl3b3JkIiwidmFsdWUiLCJ0cmltIiwia2V5d29yZCIsInN0YXJ0c1dpdGgiLCJzcmNfbnVtIiwic3Vic3RyaW5nIiwiZHN0X251bSIsImRpZCIsImxpbmtlZGlkIiwibGltaXQiLCJvZmZzZXQiLCJzdGFydCIsInNvcnQiLCJvcmRlciIsImdyb3VwZWQiLCJkYXRhU3JjIiwianNvbiIsInJlc3VsdCIsInJlc3REYXRhIiwicmVjb3JkcyIsInBhZ2luYXRpb24iLCJyZWNvcmRzVG90YWwiLCJ0b3RhbCIsInJlY29yZHNGaWx0ZXJlZCIsInRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZSIsImJlZm9yZVNlbmQiLCJ4aHIiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsInNldFJlcXVlc3RIZWFkZXIiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZW1wdHlUYWJsZSIsImdldEVtcHR5VGFibGVNZXNzYWdlIiwiemVyb1JlY29yZHMiLCJjcmVhdGVkUm93Iiwicm93IiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiYWRkQ2xhc3MiLCJhY3Rpb25zSHRtbCIsImNhblZpZXdMb2dzIiwiaWRzIiwiRFRfUm93SWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZHJfRGVsZXRlUmVjb3JkIiwiZHJhd0NhbGxiYWNrIiwiRXh0ZW5zaW9uc0FQSSIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsInRvZ2dsZVBhZ2luYXRpb25Db250cm9scyIsImluaXRDb21wbGV0ZSIsInJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJtaW5DaGFyYWN0ZXJzIiwic2VhcmNoT25Gb2N1cyIsInNlYXJjaEZpZWxkcyIsInNob3dOb1Jlc3VsdHMiLCJzb3VyY2UiLCJ0aXRsZSIsImNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciIsImNkcl9TZWFyY2hCeURlc3ROdW1iZXIiLCJjZHJfU2VhcmNoQnlESUQiLCJjZHJfU2VhcmNoQnlMaW5rZWRJRCIsImNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzcG9uc2UiLCJmb2N1cyIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibGVuIiwiZHJhdyIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwic2F2ZWRQYWdlTGVuZ3RoIiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmRlZmluZWQiLCJlbmNvZGVVUklDb21wb25lbnQiLCJvcGVuIiwidHIiLCJ0YXJnZXQiLCJjaGlsZCIsImlzU2hvd24iLCJoaWRlIiwic2hvd1JlY29yZHMiLCJzaG93IiwiZmluZCIsImVhY2giLCJpbmRleCIsInBsYXllclJvdyIsImlkIiwiQ0RSUGxheWVyIiwiJGJ1dHRvbiIsInJlY29yZElkIiwiZGVsZXRlUmVjb3JkIiwic2F2ZWRTdGF0ZSIsIkNkckFQSSIsImRlbGV0ZVJlY29yZGluZyIsImVycm9yTXNnIiwibWVzc2FnZXMiLCJjZHJfRGVsZXRlRmFpbGVkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJwYWdlcyIsInRhYmxlIiwiY29udGFpbmVyIiwiZ2V0TWV0YWRhdGEiLCJoYXNSZWNvcmRzIiwibW9tZW50IiwiZWFybGllc3REYXRlIiwibGF0ZXN0RGF0ZSIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsInNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIiLCJjZHJfRmlsdGVyZWRFbXB0eVRpdGxlIiwiY2RyX0ZpbHRlcmVkRW1wdHlEZXNjcmlwdGlvbiIsIm1hcCIsImdyb3VwIiwiYmlsbHNlYyIsInRvdGFsQmlsbHNlYyIsInRpbWVGb3JtYXQiLCJ0aW1pbmciLCJ1dGMiLCJmb3JtYXR0ZWREYXRlIiwicmVjb3JkaW5ncyIsImZpbHRlciIsInIiLCJyZWNvcmRpbmdmaWxlIiwicGxheWJhY2tfdXJsIiwiZG93bmxvYWRfdXJsIiwiaGFzUmVjb3JkaW5ncyIsImlzQW5zd2VyZWQiLCJkaXNwb3NpdGlvbiIsImR0Um93Q2xhc3MiLCJuZWdhdGl2ZUNsYXNzIiwidmVyYm9zZV9jYWxsX2lkIiwiam9pbiIsImh0bWxQbGF5ZXIiLCJmb3JFYWNoIiwicmVjb3JkIiwiaSIsInBsYXliYWNrVXJsIiwiZG93bmxvYWRVcmwiLCJwYXJzZUludCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsIm9wdGlvbnMiLCJyYW5nZXMiLCJjYWxfVG9kYXkiLCJjYWxfWWVzdGVyZGF5Iiwic3VidHJhY3QiLCJjYWxfTGFzdFdlZWsiLCJjYWxfTGFzdDMwRGF5cyIsImNhbF9UaGlzTW9udGgiLCJzdGFydE9mIiwiY2FsX0xhc3RNb250aCIsImFsd2F5c1Nob3dDYWxlbmRhcnMiLCJhdXRvVXBkYXRlSW5wdXQiLCJsaW5rZWRDYWxlbmRhcnMiLCJtYXhEYXRlIiwibG9jYWxlIiwic2VwYXJhdG9yIiwiYXBwbHlMYWJlbCIsImNhbF9BcHBseUJ0biIsImNhbmNlbExhYmVsIiwiY2FsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsImNhbF9mcm9tIiwidG9MYWJlbCIsImNhbF90byIsImN1c3RvbVJhbmdlTGFiZWwiLCJjYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJkYXRlcmFuZ2VwaWNrZXIiLCJjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QiLCJlbmQiLCJsYWJlbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFQyxDQUFDLENBQUMsWUFBRCxDQUxVOztBQU90QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxlQUFELENBWE07O0FBYXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGtCQUFrQixFQUFFRixDQUFDLENBQUMsc0JBQUQsQ0FqQkM7O0FBbUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxlQUFlLEVBQUVILENBQUMsQ0FBQyxtQkFBRCxDQXZCSTs7QUF5QnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLG1CQUFtQixFQUFFSixDQUFDLENBQUMscUJBQUQsQ0E3QkE7O0FBK0J0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxTQUFTLEVBQUUsRUFuQ1c7O0FBcUN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsRUF6Q2E7O0FBMkN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsSUEvQ087O0FBaUR0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSx5QkFBeUIsRUFBRVIsQ0FBQyxDQUFDLGlDQUFELENBckROOztBQXVEdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSVMsRUFBQUEsV0FBVyxFQUFFLG1CQTNE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M0J0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJbUIsRUFBQUEsV0ExM0JzQix1QkEwM0JWRCxJQTEzQlUsRUEwM0JKO0FBQ2Q5RCxJQUFBQSxpQkFBaUIsQ0FBQ08sU0FBbEIsQ0FBNEIrRCxNQUE1QixDQUFtQ1IsSUFBbkMsRUFBeUNxRyxJQUF6QztBQUNBbkssSUFBQUEsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDb0ssT0FBaEMsQ0FBd0MsS0FBeEMsRUFBK0NyQyxRQUEvQyxDQUF3RCxTQUF4RDtBQUNIO0FBNzNCcUIsQ0FBMUI7QUFnNEJBO0FBQ0E7QUFDQTs7QUFDQWhJLENBQUMsQ0FBQ3lSLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEI1UixFQUFBQSxpQkFBaUIsQ0FBQ2EsVUFBbEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNlbWFudGljTG9jYWxpemF0aW9uLCBFeHRlbnNpb25zQVBJLCBtb21lbnQsIGdsb2JhbFRyYW5zbGF0ZSwgQ0RSUGxheWVyLCBDZHJBUEksIFVzZXJNZXNzYWdlLCBBQ0xIZWxwZXIgKi9cblxuLyoqXG4gKiBjYWxsRGV0YWlsUmVjb3JkcyBtb2R1bGUuXG4gKiBAbW9kdWxlIGNhbGxEZXRhaWxSZWNvcmRzXG4gKi9cbmNvbnN0IGNhbGxEZXRhaWxSZWNvcmRzID0ge1xuICAgIC8qKlxuICAgICAqIFRoZSBjYWxsIGRldGFpbCByZWNvcmRzIHRhYmxlIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2RyVGFibGU6ICQoJyNjZHItdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsc2VhcmNoJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0ZSByYW5nZSBzZWxlY3RvciBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRhdGVSYW5nZVNlbGVjdG9yOiAkKCcjZGF0ZS1yYW5nZS1zZWxlY3RvcicpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHNlYXJjaCBDRFIgaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzZWFyY2hDRFJJbnB1dDogJCgnI3NlYXJjaC1jZHItaW5wdXQnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6ICQoJyNwYWdlLWxlbmd0aC1zZWxlY3QnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRhIHRhYmxlIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGRhdGFUYWJsZToge30sXG5cbiAgICAvKipcbiAgICAgKiBBbiBhcnJheSBvZiBwbGF5ZXJzLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBwbGF5ZXJzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgaW5kaWNhdGluZyBpZiBDRFIgZGF0YWJhc2UgaGFzIGFueSByZWNvcmRzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaGFzQ0RSUmVjb3JkczogdHJ1ZSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBlbXB0eSBkYXRhYmFzZSBwbGFjZWhvbGRlciBlbGVtZW50XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyOiAkKCcjY2RyLWVtcHR5LWRhdGFiYXNlLXBsYWNlaG9sZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBTdG9yYWdlIGtleSBmb3IgZmlsdGVyIHN0YXRlIGluIHNlc3Npb25TdG9yYWdlXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBTVE9SQUdFX0tFWTogJ2Nkcl9maWx0ZXJzX3N0YXRlJyxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgRGF0YVRhYmxlIGhhcyBjb21wbGV0ZWQgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBXSFk6IFByZXZlbnRzIHNhdmluZyBzdGF0ZSBkdXJpbmcgaW5pdGlhbCBsb2FkIGJlZm9yZSBmaWx0ZXJzIGFyZSByZXN0b3JlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGNhbGwgZGV0YWlsIHJlY29yZHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gTGlzdGVuIGZvciBoYXNoIGNoYW5nZXMgKHdoZW4gdXNlciBjbGlja3MgbWVudSBsaW5rIHdoaWxlIGFscmVhZHkgb24gcGFnZSlcbiAgICAgICAgLy8gV0hZOiBCcm93c2VyIGRvZXNuJ3QgcmVsb2FkIHBhZ2Ugb24gaGFzaC1vbmx5IFVSTCBjaGFuZ2VzXG4gICAgICAgICQoYGFbaHJlZj0nJHtnbG9iYWxSb290VXJsfWNhbGwtZGV0YWlsLXJlY29yZHMvaW5kZXgvI3Jlc2V0LWNhY2hlJ11gKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgLy8gUmVtb3ZlIGhhc2ggZnJvbSBVUkwgd2l0aG91dCBwYWdlIHJlbG9hZFxuICAgICAgICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsIG51bGwsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jbGVhckZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICAgICAgIC8vIEFsc28gY2xlYXIgcGFnZSBsZW5ndGggcHJlZmVyZW5jZVxuICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgICAvLyBSZWxvYWQgcGFnZSB0byBhcHBseSByZXNldFxuICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRmV0Y2ggbWV0YWRhdGEgZmlyc3QsIHRoZW4gaW5pdGlhbGl6ZSBEYXRhVGFibGUgd2l0aCBwcm9wZXIgZGF0ZSByYW5nZVxuICAgICAgICAvLyBXSFk6IFByZXZlbnRzIGRvdWJsZSByZXF1ZXN0IG9uIHBhZ2UgbG9hZFxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5mZXRjaExhdGVzdENEUkRhdGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZSBjdXJyZW50IGZpbHRlciBzdGF0ZSB0byBzZXNzaW9uU3RvcmFnZVxuICAgICAqIFN0b3JlcyBkYXRlIHJhbmdlLCBzZWFyY2ggdGV4dCwgY3VycmVudCBwYWdlLCBhbmQgcGFnZSBsZW5ndGhcbiAgICAgKi9cbiAgICBzYXZlRmlsdGVyc1N0YXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRmVhdHVyZSBkZXRlY3Rpb24gLSBleGl0IHNpbGVudGx5IGlmIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvblN0b3JhZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQ0RSXSBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICBkYXRlRnJvbTogbnVsbCxcbiAgICAgICAgICAgICAgICBkYXRlVG86IG51bGwsXG4gICAgICAgICAgICAgICAgc2VhcmNoVGV4dDogJycsXG4gICAgICAgICAgICAgICAgY3VycmVudFBhZ2U6IDAsXG4gICAgICAgICAgICAgICAgcGFnZUxlbmd0aDogY2FsbERldGFpbFJlY29yZHMuZ2V0UGFnZUxlbmd0aCgpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBHZXQgZGF0ZXMgZnJvbSBkYXRlcmFuZ2VwaWNrZXIgaW5zdGFuY2VcbiAgICAgICAgICAgIGNvbnN0IGRhdGVSYW5nZVBpY2tlciA9IGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRhKCdkYXRlcmFuZ2VwaWNrZXInKTtcbiAgICAgICAgICAgIGlmIChkYXRlUmFuZ2VQaWNrZXIgJiYgZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZSAmJiBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLmRhdGVGcm9tID0gZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZS5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kYXRlVG8gPSBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZS5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gR2V0IHNlYXJjaCB0ZXh0IGZyb20gaW5wdXQgZmllbGRcbiAgICAgICAgICAgIHN0YXRlLnNlYXJjaFRleHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpIHx8ICcnO1xuXG4gICAgICAgICAgICAvLyBHZXQgY3VycmVudCBwYWdlIGZyb20gRGF0YVRhYmxlIChpZiBpbml0aWFsaXplZClcbiAgICAgICAgICAgIGlmIChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUgJiYgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWdlSW5mbyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmluZm8oKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5jdXJyZW50UGFnZSA9IHBhZ2VJbmZvLnBhZ2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oY2FsbERldGFpbFJlY29yZHMuU1RPUkFHRV9LRVksIEpTT04uc3RyaW5naWZ5KHN0YXRlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbQ0RSXSBGYWlsZWQgdG8gc2F2ZSBmaWx0ZXJzIHRvIHNlc3Npb25TdG9yYWdlOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZpbHRlciBzdGF0ZSBmcm9tIHNlc3Npb25TdG9yYWdlXG4gICAgICogQHJldHVybnMge09iamVjdHxudWxsfSBTYXZlZCBzdGF0ZSBvYmplY3Qgb3IgbnVsbCBpZiBub3QgZm91bmQvaW52YWxpZFxuICAgICAqL1xuICAgIGxvYWRGaWx0ZXJzU3RhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBGZWF0dXJlIGRldGVjdGlvbiAtIHJldHVybiBudWxsIGlmIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvblN0b3JhZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQ0RSXSBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlIGZvciBsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJhd0RhdGEgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGNhbGxEZXRhaWxSZWNvcmRzLlNUT1JBR0VfS0VZKTtcbiAgICAgICAgICAgIGlmICghcmF3RGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzdGF0ZSA9IEpTT04ucGFyc2UocmF3RGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHN0YXRlIHN0cnVjdHVyZVxuICAgICAgICAgICAgaWYgKCFzdGF0ZSB8fCB0eXBlb2Ygc3RhdGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2xlYXJGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0NEUl0gRmFpbGVkIHRvIGxvYWQgZmlsdGVycyBmcm9tIHNlc3Npb25TdG9yYWdlOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGNvcnJ1cHRlZCBkYXRhXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jbGVhckZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgc2F2ZWQgZmlsdGVyIHN0YXRlIGZyb20gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKi9cbiAgICBjbGVhckZpbHRlcnNTdGF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvblN0b3JhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShjYWxsRGV0YWlsUmVjb3Jkcy5TVE9SQUdFX0tFWSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY2xlYXIgQ0RSIGZpbHRlcnMgZnJvbSBzZXNzaW9uU3RvcmFnZTonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEYXRhVGFibGUgYW5kIGV2ZW50IGhhbmRsZXJzXG4gICAgICogQ2FsbGVkIGFmdGVyIG1ldGFkYXRhIGlzIHJlY2VpdmVkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZUFuZEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRlYm91bmNlIHRpbWVyIHZhcmlhYmxlXG4gICAgICAgIGxldCBzZWFyY2hEZWJvdW5jZVRpbWVyID0gbnVsbDtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lciBpZiB0aGUgdXNlciBpcyBzdGlsbCB0eXBpbmdcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWFyY2hEZWJvdW5jZVRpbWVyKTtcblxuICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIGZvciBkZWxheWVkIGV4ZWN1dGlvblxuICAgICAgICAgICAgc2VhcmNoRGVib3VuY2VUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzXG4gICAgICAgICAgICAgICAgICAgIHx8IGUua2V5Q29kZSA9PT0gOFxuICAgICAgICAgICAgICAgICAgICB8fCBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHBhc3MgdGhlIHNlYXJjaCBrZXl3b3JkLCBkYXRlcyBhcmUgaGFuZGxlZCBzZXBhcmF0ZWx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWxheSBiZWZvcmUgZXhlY3V0aW5nIHRoZSBzZWFyY2hcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgY29sdW1ucyBkeW5hbWljYWxseSBiYXNlZCBvbiBBQ0wgcGVybWlzc2lvbnNcbiAgICAgICAgLy8gV0hZOiBWb2x0IHRlbXBsYXRlIGNvbmRpdGlvbmFsbHkgcmVuZGVycyBkZWxldGUgY29sdW1uIGhlYWRlciBiYXNlZCBvbiBpc0FsbG93ZWQoJ3NhdmUnKVxuICAgICAgICAvLyAnc2F2ZScgaXMgYSB2aXJ0dWFsIHBlcm1pc3Npb24gdGhhdCBpbmNsdWRlcyBkZWxldGUgY2FwYWJpbGl0eSBpbiBNb2R1bGVVc2Vyc1VJXG4gICAgICAgIC8vIElmIGNvbHVtbnMgY29uZmlnIGRvZXNuJ3QgbWF0Y2ggPHRoZWFkPiBjb3VudCwgRGF0YVRhYmxlcyB0aHJvd3MgJ3N0eWxlJyB1bmRlZmluZWQgZXJyb3JcbiAgICAgICAgY29uc3QgY2FuRGVsZXRlID0gdHlwZW9mIEFDTEhlbHBlciAhPT0gJ3VuZGVmaW5lZCcgJiYgQUNMSGVscGVyLmlzQWxsb3dlZCgnc2F2ZScpO1xuICAgICAgICBjb25zdCBjb2x1bW5zID0gW1xuICAgICAgICAgICAgeyBkYXRhOiBudWxsLCBvcmRlcmFibGU6IGZhbHNlIH0sICAvLyAwOiBleHBhbmQgaWNvbiBjb2x1bW5cbiAgICAgICAgICAgIHsgZGF0YTogMCB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMTogZGF0ZSAoYXJyYXkgaW5kZXggMClcbiAgICAgICAgICAgIHsgZGF0YTogMSB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMjogc3JjX251bSAoYXJyYXkgaW5kZXggMSlcbiAgICAgICAgICAgIHsgZGF0YTogMiB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMzogZHN0X251bSAoYXJyYXkgaW5kZXggMilcbiAgICAgICAgICAgIHsgZGF0YTogMyB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gNDogZHVyYXRpb24gKGFycmF5IGluZGV4IDMpXG4gICAgICAgIF07XG4gICAgICAgIGlmIChjYW5EZWxldGUpIHtcbiAgICAgICAgICAgIGNvbHVtbnMucHVzaCh7IGRhdGE6IG51bGwsIG9yZGVyYWJsZTogZmFsc2UgfSk7ICAvLyA1OiBhY3Rpb25zIGNvbHVtbiAobG9ncyBpY29uICsgZGVsZXRlKVxuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmRhdGFUYWJsZSh7XG4gICAgICAgICAgICBzZWFyY2g6IHtcbiAgICAgICAgICAgICAgICBzZWFyY2g6IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBjb2x1bW5zLFxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvY2RyJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJywgIC8vIFJFU1QgQVBJIHVzZXMgR0VUIGZvciBsaXN0IHJldHJpZXZhbFxuICAgICAgICAgICAgICAgIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgICAgIGxldCBpc0xpbmtlZElkU2VhcmNoID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gMS4gQWx3YXlzIGdldCBkYXRlcyBmcm9tIGRhdGUgcmFuZ2Ugc2VsZWN0b3IgdXNpbmcgZGF0ZXJhbmdlcGlja2VyIEFQSVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlUmFuZ2VQaWNrZXIgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IuZGF0YSgnZGF0ZXJhbmdlcGlja2VyJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRlUmFuZ2VQaWNrZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0RGF0ZSA9IGRhdGVSYW5nZVBpY2tlci5zdGFydERhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmREYXRlID0gZGF0ZVJhbmdlUGlja2VyLmVuZERhdGU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydERhdGUgJiYgc3RhcnREYXRlLmlzVmFsaWQoKSAmJiBlbmREYXRlICYmIGVuZERhdGUuaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRhdGVGcm9tID0gc3RhcnREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kYXRlVG8gPSBlbmREYXRlLmVuZE9mKCdkYXknKS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW06c3MnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIDIuIFByb2Nlc3Mgc2VhcmNoIGtleXdvcmQgZnJvbSBzZWFyY2ggaW5wdXQgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoS2V5d29yZCA9IGQuc2VhcmNoLnZhbHVlIHx8ICcnO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWFyY2hLZXl3b3JkLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5d29yZCA9IHNlYXJjaEtleXdvcmQudHJpbSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSBzZWFyY2ggcHJlZml4ZXM6IHNyYzosIGRzdDosIGRpZDosIGxpbmtlZGlkOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnc3JjOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IHNvdXJjZSBudW1iZXIgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zcmNfbnVtID0ga2V5d29yZC5zdWJzdHJpbmcoNCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ2RzdDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBkZXN0aW5hdGlvbiBudW1iZXIgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kc3RfbnVtID0ga2V5d29yZC5zdWJzdHJpbmcoNCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ2RpZDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBESUQgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kaWQgPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnbGlua2VkaWQ6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgbGlua2VkaWQgLSBpZ25vcmUgZGF0ZSByYW5nZSBmb3IgbGlua2VkaWQgc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmxpbmtlZGlkID0ga2V5d29yZC5zdWJzdHJpbmcoOSkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzTGlua2VkSWRTZWFyY2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkYXRlIHBhcmFtcyBmb3IgbGlua2VkaWQgc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHBhcmFtcy5kYXRlRnJvbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcGFyYW1zLmRhdGVUbztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRnVsbC10ZXh0IHNlYXJjaDogc2VhcmNoIGluIHNyY19udW0sIGRzdF9udW0sIGFuZCBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZXIgZXhwZWN0cyBzZWFyY2ggd2l0aG91dCBwcmVmaXggdG8gZmluZCBudW1iZXIgYW55d2hlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuc2VhcmNoID0ga2V5d29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJFU1QgQVBJIHBhZ2luYXRpb24gcGFyYW1ldGVyc1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMubGltaXQgPSBkLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9mZnNldCA9IGQuc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zb3J0ID0gJ3N0YXJ0JzsgIC8vIFNvcnQgYnkgY2FsbCBzdGFydCB0aW1lIGZvciBjaHJvbm9sb2dpY2FsIG9yZGVyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vcmRlciA9ICdERVNDJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFdlYlVJIGFsd2F5cyBuZWVkcyBncm91cGVkIHJlY29yZHMgKGJ5IGxpbmtlZGlkKSBmb3IgcHJvcGVyIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgLy8gQmFja2VuZCBkZWZhdWx0cyB0byBncm91cGVkPXRydWUsIGJ1dCBleHBsaWNpdCBpcyBiZXR0ZXIgdGhhbiBpbXBsaWNpdFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZ3JvdXBlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRhdGFTcmM6IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIHJldHVybnMgUEJYQXBpUmVzdWx0IHN0cnVjdHVyZTpcbiAgICAgICAgICAgICAgICAgICAgLy8ge3Jlc3VsdDogdHJ1ZSwgZGF0YToge3JlY29yZHM6IFsuLi5dLCBwYWdpbmF0aW9uOiB7Li4ufX19XG4gICAgICAgICAgICAgICAgICAgIGlmIChqc29uLnJlc3VsdCAmJiBqc29uLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgcmVjb3JkcyBhbmQgcGFnaW5hdGlvbiBmcm9tIG5lc3RlZCBkYXRhIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdERhdGEgPSBqc29uLmRhdGEucmVjb3JkcyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2luYXRpb24gPSBqc29uLmRhdGEucGFnaW5hdGlvbiB8fCB7fTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IERhdGFUYWJsZXMgcGFnaW5hdGlvbiBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uLnJlY29yZHNUb3RhbCA9IHBhZ2luYXRpb24udG90YWwgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc0ZpbHRlcmVkID0gcGFnaW5hdGlvbi50b3RhbCB8fCAwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmFuc2Zvcm0gUkVTVCByZWNvcmRzIHRvIERhdGFUYWJsZSByb3dzXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbERldGFpbFJlY29yZHMudHJhbnNmb3JtUmVzdFRvRGF0YVRhYmxlKHJlc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBiZWZvcmVTZW5kOiBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIEJlYXJlciB0b2tlbiBmb3IgQVBJIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICAvL3Njcm9sbFk6ICQod2luZG93KS5oZWlnaHQoKSAtIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vZmZzZXQoKS50b3AtMTUwLFxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRQYWdlTGVuZ3RoKCksXG4gICAgICAgICAgICBsYW5ndWFnZToge1xuICAgICAgICAgICAgICAgIC4uLlNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgICAgICBlbXB0eVRhYmxlOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRFbXB0eVRhYmxlTWVzc2FnZSgpLFxuICAgICAgICAgICAgICAgIHplcm9SZWNvcmRzOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRFbXB0eVRhYmxlTWVzc2FnZSgpXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIENEUiByb3cuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLkRUX1Jvd0NsYXNzLmluZGV4T2YoXCJkZXRhaWxlZFwiKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCc8aSBjbGFzcz1cImljb24gY2FyZXQgZG93blwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgxKS5odG1sKGRhdGFbMF0pO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgyKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzFdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDMpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGRhdGFbMl0pXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcblxuICAgICAgICAgICAgICAgIC8vIER1cmF0aW9uIGNvbHVtbiAobm8gaWNvbnMpXG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmh0bWwoZGF0YVszXSkuYWRkQ2xhc3MoJ3JpZ2h0IGFsaWduZWQnKTtcblxuICAgICAgICAgICAgICAgIC8vIEFjdGlvbnMgY29sdW1uOiBvbmx5IHJlbmRlciBpZiB1c2VyIGhhcyBkZWxldGUgcGVybWlzc2lvblxuICAgICAgICAgICAgICAgIC8vIFdIWTogVm9sdCB0ZW1wbGF0ZSBjb25kaXRpb25hbGx5IHJlbmRlcnMgdGhpcyBjb2x1bW4gYmFzZWQgb24gaXNBbGxvd2VkKCdkZWxldGUnKVxuICAgICAgICAgICAgICAgIGlmICghY2FuRGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBMYXN0IGNvbHVtbjogbG9nIGljb24gKyBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgbGV0IGFjdGlvbnNIdG1sID0gJyc7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgbG9nIGljb24gaWYgdXNlciBoYXMgYWNjZXNzIHRvIFN5c3RlbSBEaWFnbm9zdGljXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBMb2cgaWNvbiBsaW5rcyB0byBzeXN0ZW0tZGlhZ25vc3RpYyBwYWdlIHdoaWNoIHJlcXVpcmVzIHNwZWNpZmljIHBlcm1pc3Npb25zXG4gICAgICAgICAgICAgICAgY29uc3QgY2FuVmlld0xvZ3MgPSB0eXBlb2YgQUNMSGVscGVyICE9PSAndW5kZWZpbmVkJyAmJiBBQ0xIZWxwZXIuaXNBbGxvd2VkKCd2aWV3U3lzdGVtRGlhZ25vc3RpYycpO1xuICAgICAgICAgICAgICAgIGlmIChjYW5WaWV3TG9ncyAmJiBkYXRhLmlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uc0h0bWwgKz0gYDxpIGRhdGEtaWRzPVwiJHtkYXRhLmlkc31cIiBjbGFzcz1cImZpbGUgYWx0ZXJuYXRlIG91dGxpbmUgaWNvblwiIHN0eWxlPVwiY3Vyc29yOiBwb2ludGVyOyBtYXJnaW4tcmlnaHQ6IDhweDtcIj48L2k+YDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlIHR3by1zdGVwcy1kZWxldGUgbWVjaGFuaXNtIHRvIHByZXZlbnQgYWNjaWRlbnRhbCBkZWxldGlvblxuICAgICAgICAgICAgICAgIC8vIEZpcnN0IGNsaWNrIGNoYW5nZXMgdHJhc2ggaWNvbiB0byBjbG9zZSBpY29uLCBzZWNvbmQgY2xpY2sgZGVsZXRlc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlIGRhdGEuRFRfUm93SWQgd2hpY2ggY29udGFpbnMgbGlua2VkaWQgZm9yIGdyb3VwZWQgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGFjdGlvbnNIdG1sICs9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidHdvLXN0ZXBzLWRlbGV0ZSBkZWxldGUtcmVjb3JkIHBvcHVwZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXJlY29yZC1pZD1cIiR7ZGF0YS5EVF9Sb3dJZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5jZHJfRGVsZXRlUmVjb3JkIHx8ICdEZWxldGUgcmVjb3JkJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiIHN0eWxlPVwibWFyZ2luOiAwO1wiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPmA7XG5cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNSkuaHRtbChhY3Rpb25zSHRtbCkuYWRkQ2xhc3MoJ3JpZ2h0IGFsaWduZWQnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMudG9nZ2xlUGFnaW5hdGlvbkNvbnRyb2xzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJbml0aWFsaXphdGlvbiBjb21wbGV0ZSBjYWxsYmFjayAtIGZpcmVkIGFmdGVyIGZpcnN0IGRhdGEgbG9hZFxuICAgICAgICAgICAgICogV0hZOiBSZXN0b3JlIGZpbHRlcnMgQUZURVIgRGF0YVRhYmxlIGhhcyBsb2FkZWQgaW5pdGlhbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGluaXRDb21wbGV0ZSgpIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgZmxhZyBGSVJTVCB0byBhbGxvdyBzdGF0ZSBzYXZpbmcgZHVyaW5nIGZpbHRlciByZXN0b3JhdGlvblxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIC8vIE5vdyByZXN0b3JlIGZpbHRlcnMgLSBkcmF3IGV2ZW50IHdpbGwgY29ycmVjdGx5IHNhdmUgdGhlIHJlc3RvcmVkIHN0YXRlXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMucmVzdG9yZUZpbHRlcnNGcm9tU3RhdGUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgU2VhcmNoIGNvbXBvbmVudCBBRlRFUiBEYXRhVGFibGUgaXMgY3JlYXRlZFxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kc2VhcmNoQ0RSSW5wdXQuc2VhcmNoKHtcbiAgICAgICAgICAgIG1pbkNoYXJhY3RlcnM6IDAsXG4gICAgICAgICAgICBzZWFyY2hPbkZvY3VzOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaEZpZWxkczogWyd0aXRsZSddLFxuICAgICAgICAgICAgc2hvd05vUmVzdWx0czogZmFsc2UsXG4gICAgICAgICAgICBzb3VyY2U6IFtcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5U291cmNlTnVtYmVyLCB2YWx1ZTogJ3NyYzonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeURlc3ROdW1iZXIsIHZhbHVlOiAnZHN0OicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5RElELCB2YWx1ZTogJ2RpZDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeUxpbmtlZElELCB2YWx1ZTogJ2xpbmtlZGlkOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5Q3VzdG9tUGhyYXNlLCB2YWx1ZTogJycgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvblNlbGVjdDogZnVuY3Rpb24ocmVzdWx0LCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCgnaGlkZSByZXN1bHRzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdGFydCB0aGUgc2VhcmNoIHdoZW4geW91IGNsaWNrIG9uIHRoZSBpY29uXG4gICAgICAgICQoJyNzZWFyY2gtaWNvbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5mb2N1cygpO1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCgncXVlcnknKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgdG8gc2F2ZSB0aGUgdXNlcidzIHBhZ2UgbGVuZ3RoIHNlbGVjdGlvbiBhbmQgdXBkYXRlIHRoZSB0YWJsZVxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKHBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUxlbmd0aCA9PT0gJ2F1dG8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGggPSBjYWxsRGV0YWlsUmVjb3Jkcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBzZWxlY3QgaW5wdXQgdmFsdWUgdG8gdGhlIHNhdmVkIHZhbHVlIGlmIGl0IGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oJ3NldCB2YWx1ZScsIHNhdmVkUGFnZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIFNraXAgc2F2aW5nIHN0YXRlIGR1cmluZyBpbml0aWFsIGxvYWQgYmVmb3JlIGZpbHRlcnMgYXJlIHJlc3RvcmVkXG4gICAgICAgICAgICBpZiAoIWNhbGxEZXRhaWxSZWNvcmRzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNhdmUgc3RhdGUgYWZ0ZXIgZXZlcnkgZHJhdyAocGFnaW5hdGlvbiwgc2VhcmNoLCBkYXRlIGNoYW5nZSlcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnNhdmVGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIGZvciBjbGlja2luZyBvbiBpY29uIHdpdGggZGF0YS1pZHMgKG9wZW4gaW4gbmV3IHdpbmRvdylcbiAgICAgICAgLy8gV0hZOiBDbGlja2luZyBvbiBpY29uIHNob3VsZCBvcGVuIFN5c3RlbSBEaWFnbm9zdGljIGluIG5ldyB3aW5kb3cgdG8gdmlldyB2ZXJib3NlIGxvZ3NcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICdbZGF0YS1pZHNdJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgcm93IHRvZ2dsZVxuXG4gICAgICAgICAgICBjb25zdCBpZHMgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS1pZHMnKTtcbiAgICAgICAgICAgIGlmIChpZHMgIT09IHVuZGVmaW5lZCAmJiBpZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gV0hZOiBGb3JtYXQgYXMgcXVlcnkgcGFyYW0gKyBoYXNoOiA/ZmlsdGVyPS4uLiNmaWxlPS4uLlxuICAgICAgICAgICAgICAgIC8vIE9wZW4gaW4gbmV3IHdpbmRvdyB0byBhbGxvdyB2aWV3aW5nIGxvZ3Mgd2hpbGUga2VlcGluZyBDRFIgdGFibGUgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGAke2dsb2JhbFJvb3RVcmx9c3lzdGVtLWRpYWdub3N0aWMvaW5kZXgvP2ZpbHRlcj0ke2VuY29kZVVSSUNvbXBvbmVudChpZHMpfSNmaWxlPWFzdGVyaXNrJTJGdmVyYm9zZWA7XG4gICAgICAgICAgICAgICAgd2luZG93Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3Igb3BlbmluZyBhbmQgY2xvc2luZyBkZXRhaWxzXG4gICAgICAgIC8vIFdIWTogT25seSBleHBhbmQvY29sbGFwc2Ugb24gZmlyc3QgY29sdW1uIChjYXJldCBpY29uKSBjbGljaywgbm90IG9uIGFjdGlvbiBpY29uc1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ3RyLmRldGFpbGVkIHRkOmZpcnN0LWNoaWxkJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5yb3codHIpO1xuXG4gICAgICAgICAgICBpZiAocm93LmNoaWxkLmlzU2hvd24oKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgcm93IGlzIGFscmVhZHkgb3BlbiAtIGNsb3NlIGl0XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB0ci5yZW1vdmVDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gT3BlbiB0aGlzIHJvd1xuICAgICAgICAgICAgICAgIHJvdy5jaGlsZChjYWxsRGV0YWlsUmVjb3Jkcy5zaG93UmVjb3Jkcyhyb3cuZGF0YSgpKSkuc2hvdygpO1xuICAgICAgICAgICAgICAgIHRyLmFkZENsYXNzKCdzaG93bicpO1xuICAgICAgICAgICAgICAgIHJvdy5jaGlsZCgpLmZpbmQoJy5kZXRhaWwtcmVjb3JkLXJvdycpLmVhY2goKGluZGV4LCBwbGF5ZXJSb3cpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSAkKHBsYXllclJvdykuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDRFJQbGF5ZXIoaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgc2Vjb25kIGNsaWNrIG9uIGRlbGV0ZSBidXR0b24gKGFmdGVyIHR3by1zdGVwcy1kZWxldGUgY2hhbmdlcyBpY29uIHRvIGNsb3NlKVxuICAgICAgICAvLyBXSFk6IFR3by1zdGVwcy1kZWxldGUgbWVjaGFuaXNtIHByZXZlbnRzIGFjY2lkZW50YWwgZGVsZXRpb25cbiAgICAgICAgLy8gRmlyc3QgY2xpY2s6IHRyYXNoIOKGkiBjbG9zZSAoYnkgZGVsZXRlLXNvbWV0aGluZy5qcyksIFNlY29uZCBjbGljazogZXhlY3V0ZSBkZWxldGlvblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ2EuZGVsZXRlLXJlY29yZDpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgcm93IGV4cGFuc2lvblxuXG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtcmVjb3JkLWlkJyk7XG5cbiAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZCBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCBsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIEFsd2F5cyBkZWxldGUgd2l0aCByZWNvcmRpbmdzIGFuZCBsaW5rZWQgcmVjb3Jkc1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGVsZXRlUmVjb3JkKHJlY29yZElkLCAkYnV0dG9uKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc3RvcmUgZmlsdGVycyBmcm9tIHNhdmVkIHN0YXRlIGFmdGVyIERhdGFUYWJsZSBpbml0aWFsaXphdGlvblxuICAgICAqIFdIWTogTXVzdCBiZSBjYWxsZWQgYWZ0ZXIgRGF0YVRhYmxlIGlzIGNyZWF0ZWQgdG8gcmVzdG9yZSBzZWFyY2ggYW5kIHBhZ2VcbiAgICAgKi9cbiAgICByZXN0b3JlRmlsdGVyc0Zyb21TdGF0ZSgpIHtcbiAgICAgICAgY29uc3Qgc2F2ZWRTdGF0ZSA9IGNhbGxEZXRhaWxSZWNvcmRzLmxvYWRGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgaWYgKCFzYXZlZFN0YXRlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXN0b3JlIHNlYXJjaCB0ZXh0IHRvIGlucHV0IGZpZWxkXG4gICAgICAgIGlmIChzYXZlZFN0YXRlLnNlYXJjaFRleHQpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCk7XG4gICAgICAgICAgICAvLyBBcHBseSBzZWFyY2ggdG8gRGF0YVRhYmxlXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuc2VhcmNoKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXN0b3JlIHBhZ2UgbnVtYmVyIHdpdGggZGVsYXlcbiAgICAgICAgLy8gV0hZOiBEYXRhVGFibGUgaWdub3JlcyBwYWdlKCkgZHVyaW5nIGluaXRDb21wbGV0ZSwgbmVlZCBzZXRUaW1lb3V0IHRvIGFsbG93IGluaXRpYWxpemF0aW9uIHRvIGZ1bGx5IGNvbXBsZXRlXG4gICAgICAgIGlmIChzYXZlZFN0YXRlLmN1cnJlbnRQYWdlKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZShzYXZlZFN0YXRlLmN1cnJlbnRQYWdlKS5kcmF3KGZhbHNlKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2F2ZWRTdGF0ZS5zZWFyY2hUZXh0KSB7XG4gICAgICAgICAgICAvLyBJZiBvbmx5IHNlYXJjaCB0ZXh0IGV4aXN0cywgc3RpbGwgbmVlZCB0byBkcmF3XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuZHJhdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBDRFIgcmVjb3JkIHZpYSBSRVNUIEFQSVxuICAgICAqIFdIWTogRGVsZXRlcyBieSBsaW5rZWRpZCAtIGF1dG9tYXRpY2FsbHkgcmVtb3ZlcyBlbnRpcmUgY29udmVyc2F0aW9uIHdpdGggYWxsIGxpbmtlZCByZWNvcmRzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gQ0RSIGxpbmtlZGlkIChsaWtlIFwibWlrb3BieC0xNzYwNzg0NzkzLjQ2MjdcIilcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGJ1dHRvbiAtIEJ1dHRvbiBlbGVtZW50IHRvIHVwZGF0ZSBzdGF0ZVxuICAgICAqL1xuICAgIGRlbGV0ZVJlY29yZChyZWNvcmRJZCwgJGJ1dHRvbikge1xuICAgICAgICAvLyBBbHdheXMgZGVsZXRlIHdpdGggcmVjb3JkaW5nIGZpbGVzXG4gICAgICAgIC8vIFdIWTogbGlua2VkaWQgYXV0b21hdGljYWxseSBkZWxldGVzIGFsbCBsaW5rZWQgcmVjb3JkcyAobm8gZGVsZXRlTGlua2VkIHBhcmFtZXRlciBuZWVkZWQpXG4gICAgICAgIENkckFQSS5kZWxldGVSZWNvcmQocmVjb3JkSWQsIHsgZGVsZXRlUmVjb3JkaW5nOiB0cnVlIH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2lsZW50bHkgcmVsb2FkIHRoZSBEYXRhVGFibGUgdG8gcmVmbGVjdCBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBWaXN1YWwgZmVlZGJhY2sgKGRpc2FwcGVhcmluZyByb3cpIGlzIGVub3VnaCwgbm8gbmVlZCBmb3Igc3VjY2VzcyB0b2FzdFxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5hamF4LnJlbG9hZChudWxsLCBmYWxzZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZSBvbmx5IG9uIGZhaWx1cmVcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IHJlc3BvbnNlPy5tZXNzYWdlcz8uZXJyb3I/LlswXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY2RyX0RlbGV0ZUZhaWxlZCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGRlbGV0ZSByZWNvcmQnO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1zZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSBwYWdpbmF0aW9uIGNvbnRyb2xzIHZpc2liaWxpdHkgYmFzZWQgb24gZGF0YSBzaXplXG4gICAgICovXG4gICAgdG9nZ2xlUGFnaW5hdGlvbkNvbnRyb2xzKCkge1xuICAgICAgICBjb25zdCBpbmZvID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UuaW5mbygpO1xuICAgICAgICBpZiAoaW5mby5wYWdlcyA8PSAxKSB7XG4gICAgICAgICAgICAkKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS50YWJsZSgpLmNvbnRhaW5lcigpKS5maW5kKCcuZGF0YVRhYmxlc19wYWdpbmF0ZScpLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnRhYmxlKCkuY29udGFpbmVyKCkpLmZpbmQoJy5kYXRhVGFibGVzX3BhZ2luYXRlJykuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgQ0RSIG1ldGFkYXRhIChkYXRlIHJhbmdlKSB1c2luZyBDZHJBUElcbiAgICAgKiBXSFk6IExpZ2h0d2VpZ2h0IHJlcXVlc3QgcmV0dXJucyBvbmx5IG1ldGFkYXRhIChkYXRlcyksIG5vdCBmdWxsIENEUiByZWNvcmRzXG4gICAgICogQXZvaWRzIGRvdWJsZSByZXF1ZXN0IG9uIHBhZ2UgbG9hZFxuICAgICAqL1xuICAgIGZldGNoTGF0ZXN0Q0RSRGF0ZSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHNhdmVkIHN0YXRlIGZpcnN0XG4gICAgICAgIGNvbnN0IHNhdmVkU3RhdGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy5sb2FkRmlsdGVyc1N0YXRlKCk7XG5cbiAgICAgICAgQ2RyQVBJLmdldE1ldGFkYXRhKHsgbGltaXQ6IDEwMCB9LCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5oYXNSZWNvcmRzKSB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0RGF0ZSwgZW5kRGF0ZTtcblxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgc2F2ZWQgc3RhdGUgd2l0aCBkYXRlcywgdXNlIHRob3NlIGluc3RlYWQgb2YgbWV0YWRhdGFcbiAgICAgICAgICAgICAgICBpZiAoc2F2ZWRTdGF0ZSAmJiBzYXZlZFN0YXRlLmRhdGVGcm9tICYmIHNhdmVkU3RhdGUuZGF0ZVRvKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0RGF0ZSA9IG1vbWVudChzYXZlZFN0YXRlLmRhdGVGcm9tKTtcbiAgICAgICAgICAgICAgICAgICAgZW5kRGF0ZSA9IG1vbWVudChzYXZlZFN0YXRlLmRhdGVUbyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBtZXRhZGF0YSBkYXRlIHN0cmluZ3MgdG8gbW9tZW50IG9iamVjdHNcbiAgICAgICAgICAgICAgICAgICAgc3RhcnREYXRlID0gbW9tZW50KGRhdGEuZWFybGllc3REYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgZW5kRGF0ZSA9IG1vbWVudChkYXRhLmxhdGVzdERhdGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcihzdGFydERhdGUsIGVuZERhdGUpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBEYXRhVGFibGUgb25seSBpZiB3ZSBoYXZlIHJlY29yZHNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IERhdGFUYWJsZSBuZWVkcyBkYXRlIHJhbmdlIHRvIGJlIHNldCBmaXJzdFxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemVEYXRhVGFibGVBbmRIYW5kbGVycygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBObyByZWNvcmRzIGluIGRhdGFiYXNlIGF0IGFsbCBvciBBUEkgZXJyb3JcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuc2hvd0VtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcigpO1xuICAgICAgICAgICAgICAgIC8vIERvbid0IGluaXRpYWxpemUgRGF0YVRhYmxlIGF0IGFsbCAtIGp1c3Qgc2hvdyBwbGFjZWhvbGRlclxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBhIHN0eWxlZCBlbXB0eSB0YWJsZSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBtZXNzYWdlIGZvciBlbXB0eSB0YWJsZVxuICAgICAqL1xuICAgIGdldEVtcHR5VGFibGVNZXNzYWdlKCkge1xuICAgICAgICAvLyBJZiBkYXRhYmFzZSBpcyBlbXB0eSwgd2UgZG9uJ3Qgc2hvdyB0aGlzIG1lc3NhZ2UgaW4gdGFibGVcbiAgICAgICAgaWYgKCFjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgZmlsdGVyZWQgZW1wdHkgc3RhdGUgbWVzc2FnZVxuICAgICAgICByZXR1cm4gYFxuICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcGxhY2Vob2xkZXIgc2VnbWVudFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGljb24gaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzZWFyY2ggaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5jZHJfRmlsdGVyZWRFbXB0eVRpdGxlfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW5saW5lXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHRcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0ZpbHRlcmVkRW1wdHlEZXNjcmlwdGlvbn1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIGVtcHR5IGRhdGFiYXNlIHBsYWNlaG9sZGVyIGFuZCBoaWRlcyB0aGUgdGFibGVcbiAgICAgKi9cbiAgICBzaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyKCkge1xuICAgICAgICAvLyBIaWRlIHRoZSB0YWJsZSBpdHNlbGYgKERhdGFUYWJsZSB3b24ndCBiZSBpbml0aWFsaXplZClcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmhpZGUoKTtcblxuICAgICAgICAvLyBIaWRlIHNlYXJjaCBhbmQgZGF0ZSBjb250cm9sc1xuICAgICAgICAkKCcjZGF0ZS1yYW5nZS1zZWxlY3RvcicpLmNsb3Nlc3QoJy51aS5yb3cnKS5oaWRlKCk7XG5cbiAgICAgICAgLy8gU2hvdyBwbGFjZWhvbGRlclxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyLnNob3coKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVHJhbnNmb3JtIFJFU1QgQVBJIGdyb3VwZWQgcmVjb3JkcyB0byBEYXRhVGFibGUgcm93IGZvcm1hdFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJlc3REYXRhIC0gQXJyYXkgb2YgZ3JvdXBlZCBDRFIgcmVjb3JkcyBmcm9tIFJFU1QgQVBJXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBEYXRhVGFibGUgcm93c1xuICAgICAqL1xuICAgIHRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZShyZXN0RGF0YSkge1xuICAgICAgICByZXR1cm4gcmVzdERhdGEubWFwKGdyb3VwID0+IHtcbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSB0aW1pbmcgZGlzcGxheVxuICAgICAgICAgICAgY29uc3QgYmlsbHNlYyA9IGdyb3VwLnRvdGFsQmlsbHNlYyB8fCAwO1xuICAgICAgICAgICAgY29uc3QgdGltZUZvcm1hdCA9IChiaWxsc2VjIDwgMzYwMCkgPyAnbW06c3MnIDogJ0hIOm1tOnNzJztcbiAgICAgICAgICAgIGNvbnN0IHRpbWluZyA9IGJpbGxzZWMgPiAwID8gbW9tZW50LnV0YyhiaWxsc2VjICogMTAwMCkuZm9ybWF0KHRpbWVGb3JtYXQpIDogJyc7XG5cbiAgICAgICAgICAgIC8vIEZvcm1hdCBzdGFydCBkYXRlXG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREYXRlID0gbW9tZW50KGdyb3VwLnN0YXJ0KS5mb3JtYXQoJ0RELU1NLVlZWVkgSEg6bW06c3MnKTtcblxuICAgICAgICAgICAgLy8gRXh0cmFjdCByZWNvcmRpbmcgcmVjb3JkcyAtIGZpbHRlciBvbmx5IHJlY29yZHMgd2l0aCBhY3R1YWwgcmVjb3JkaW5nIGZpbGVzXG4gICAgICAgICAgICBjb25zdCByZWNvcmRpbmdzID0gKGdyb3VwLnJlY29yZHMgfHwgW10pXG4gICAgICAgICAgICAgICAgLmZpbHRlcihyID0+IHIucmVjb3JkaW5nZmlsZSAmJiByLnJlY29yZGluZ2ZpbGUubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAubWFwKHIgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHIuaWQsXG4gICAgICAgICAgICAgICAgICAgIHNyY19udW06IHIuc3JjX251bSxcbiAgICAgICAgICAgICAgICAgICAgZHN0X251bTogci5kc3RfbnVtLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmRpbmdmaWxlOiByLnJlY29yZGluZ2ZpbGUsXG4gICAgICAgICAgICAgICAgICAgIHBsYXliYWNrX3VybDogci5wbGF5YmFja191cmwsICAgLy8gVG9rZW4tYmFzZWQgVVJMIGZvciBwbGF5YmFja1xuICAgICAgICAgICAgICAgICAgICBkb3dubG9hZF91cmw6IHIuZG93bmxvYWRfdXJsICAgIC8vIFRva2VuLWJhc2VkIFVSTCBmb3IgZG93bmxvYWRcbiAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIC8vIERldGVybWluZSBDU1MgY2xhc3NcbiAgICAgICAgICAgIGNvbnN0IGhhc1JlY29yZGluZ3MgPSByZWNvcmRpbmdzLmxlbmd0aCA+IDA7XG4gICAgICAgICAgICBjb25zdCBpc0Fuc3dlcmVkID0gZ3JvdXAuZGlzcG9zaXRpb24gPT09ICdBTlNXRVJFRCc7XG4gICAgICAgICAgICBjb25zdCBkdFJvd0NsYXNzID0gaGFzUmVjb3JkaW5ncyA/ICdkZXRhaWxlZCcgOiAndWknO1xuICAgICAgICAgICAgY29uc3QgbmVnYXRpdmVDbGFzcyA9IGlzQW5zd2VyZWQgPyAnJyA6ICcgbmVnYXRpdmUnO1xuXG4gICAgICAgICAgICAvLyBDb2xsZWN0IHZlcmJvc2UgY2FsbCBJRHNcbiAgICAgICAgICAgIGNvbnN0IGlkcyA9IChncm91cC5yZWNvcmRzIHx8IFtdKVxuICAgICAgICAgICAgICAgIC5tYXAociA9PiByLnZlcmJvc2VfY2FsbF9pZClcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGlkID0+IGlkICYmIGlkLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgLmpvaW4oJyYnKTtcblxuICAgICAgICAgICAgLy8gUmV0dXJuIERhdGFUYWJsZSByb3cgZm9ybWF0XG4gICAgICAgICAgICAvLyBEYXRhVGFibGVzIG5lZWRzIGJvdGggYXJyYXkgaW5kaWNlcyBBTkQgc3BlY2lhbCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBjb25zdCByb3cgPSBbXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkRGF0ZSwgICAgICAgICAgICAgIC8vIDA6IGRhdGVcbiAgICAgICAgICAgICAgICBncm91cC5zcmNfbnVtLCAgICAgICAgICAgICAgLy8gMTogc291cmNlIG51bWJlclxuICAgICAgICAgICAgICAgIGdyb3VwLmRzdF9udW0gfHwgZ3JvdXAuZGlkLCAvLyAyOiBkZXN0aW5hdGlvbiBudW1iZXIgb3IgRElEXG4gICAgICAgICAgICAgICAgdGltaW5nLCAgICAgICAgICAgICAgICAgICAgIC8vIDM6IGR1cmF0aW9uXG4gICAgICAgICAgICAgICAgcmVjb3JkaW5ncywgICAgICAgICAgICAgICAgIC8vIDQ6IHJlY29yZGluZyByZWNvcmRzIGFycmF5XG4gICAgICAgICAgICAgICAgZ3JvdXAuZGlzcG9zaXRpb24gICAgICAgICAgIC8vIDU6IGRpc3Bvc2l0aW9uXG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAvLyBBZGQgRGF0YVRhYmxlcyBzcGVjaWFsIHByb3BlcnRpZXNcbiAgICAgICAgICAgIHJvdy5EVF9Sb3dJZCA9IGdyb3VwLmxpbmtlZGlkO1xuICAgICAgICAgICAgcm93LkRUX1Jvd0NsYXNzID0gZHRSb3dDbGFzcyArIG5lZ2F0aXZlQ2xhc3M7XG4gICAgICAgICAgICByb3cuaWRzID0gaWRzOyAvLyBTdG9yZSByYXcgSURzIHdpdGhvdXQgZW5jb2RpbmcgLSBlbmNvZGluZyB3aWxsIGJlIGFwcGxpZWQgd2hlbiBidWlsZGluZyBVUkxcblxuICAgICAgICAgICAgcmV0dXJuIHJvdztcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgc2V0IG9mIGNhbGwgcmVjb3JkcyB3aGVuIGEgcm93IGlzIGNsaWNrZWQuXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2FsbCByZWNvcmRzLlxuICAgICAqL1xuICAgIHNob3dSZWNvcmRzKGRhdGEpIHtcbiAgICAgICAgbGV0IGh0bWxQbGF5ZXIgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBiYXNpYyB0YWJsZSBjZHItcGxheWVyXCI+PHRib2R5Pic7XG4gICAgICAgIGRhdGFbNF0uZm9yRWFjaCgocmVjb3JkLCBpKSA9PiB7XG4gICAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIHx8IHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSBudWxsXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3cgZGlzYWJsZWRcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiXCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiXCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdG9rZW4tYmFzZWQgVVJMcyBpbnN0ZWFkIG9mIGRpcmVjdCBmaWxlIHBhdGhzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBTZWN1cml0eSAtIGhpZGVzIGFjdHVhbCBmaWxlIHBhdGhzIGZyb20gdXNlclxuICAgICAgICAgICAgICAgIC8vIFR3byBzZXBhcmF0ZSBlbmRwb2ludHM6IDpwbGF5YmFjayAoaW5saW5lKSBhbmQgOmRvd25sb2FkIChmaWxlKVxuICAgICAgICAgICAgICAgIGNvbnN0IHBsYXliYWNrVXJsID0gcmVjb3JkLnBsYXliYWNrX3VybCB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBkb3dubG9hZFVybCA9IHJlY29yZC5kb3dubG9hZF91cmwgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3dcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiJHtwbGF5YmFja1VybH1cIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IGljb24gdG9wIGxlZnQgcG9pbnRpbmcgZHJvcGRvd24gZG93bmxvYWQtZm9ybWF0LWRyb3Bkb3duXCIgZGF0YS1kb3dubG9hZC11cmw9XCIke2Rvd25sb2FkVXJsfVwiPlxuICAgIFx0XHQ8aSBjbGFzcz1cImRvd25sb2FkIGljb25cIj48L2k+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIndlYm1cIj5XZWJNIChPcHVzKTwvZGl2PlxuICAgIFx0XHRcdDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1mb3JtYXQ9XCJtcDNcIj5NUDM8L2Rpdj5cbiAgICBcdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtZm9ybWF0PVwid2F2XCI+V0FWPC9kaXY+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIm9nZ1wiPk9HRyAoT3B1cyk8L2Rpdj5cbiAgICBcdFx0PC9kaXY+XG4gICAgXHQ8L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0bWxQbGF5ZXIgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICByZXR1cm4gaHRtbFBsYXllcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgcGFnZSBsZW5ndGggZm9yIERhdGFUYWJsZSwgY29uc2lkZXJpbmcgdXNlcidzIHNhdmVkIHByZWZlcmVuY2VcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldFBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHNhdmVkIHZhbHVlIG9yIHVzZSB0aGUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHZhbHVlIGlmIG5vbmUgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgcmV0dXJuIHNhdmVkUGFnZUxlbmd0aCA/IHBhcnNlSW50KHNhdmVkUGFnZUxlbmd0aCwgMTApIDogY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygcm93cyB0aGF0IGNhbiBmaXQgb24gYSBwYWdlIGJhc2VkIG9uIHRoZSBjdXJyZW50IHdpbmRvdyBoZWlnaHQuXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmZpbmQoJ3Rib2R5ID4gdHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSA0MDA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCA1KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yLlxuICAgICAqIEBwYXJhbSB7bW9tZW50fSBzdGFydERhdGUgLSBPcHRpb25hbCBlYXJsaWVzdCByZWNvcmQgZGF0ZSBmcm9tIGxhc3QgMTAwIHJlY29yZHNcbiAgICAgKiBAcGFyYW0ge21vbWVudH0gZW5kRGF0ZSAtIE9wdGlvbmFsIGxhdGVzdCByZWNvcmQgZGF0ZSBmcm9tIGxhc3QgMTAwIHJlY29yZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3Ioc3RhcnREYXRlID0gbnVsbCwgZW5kRGF0ZSA9IG51bGwpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgIG9wdGlvbnMucmFuZ2VzID0ge1xuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVG9kYXldOiBbbW9tZW50KCksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1llc3RlcmRheV06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RXZWVrXTogW21vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3QzMERheXNdOiBbbW9tZW50KCkuc3VidHJhY3QoMjksICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1RoaXNNb250aF06IFttb21lbnQoKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0TW9udGhdOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zLmFsd2F5c1Nob3dDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmF1dG9VcGRhdGVJbnB1dCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMubGlua2VkQ2FsZW5kYXJzID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5tYXhEYXRlID0gbW9tZW50KCk7XG4gICAgICAgIG9wdGlvbnMubG9jYWxlID0ge1xuICAgICAgICAgICAgZm9ybWF0OiAnREQvTU0vWVlZWScsXG4gICAgICAgICAgICBzZXBhcmF0b3I6ICcgLSAnLFxuICAgICAgICAgICAgYXBwbHlMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9BcHBseUJ0bixcbiAgICAgICAgICAgIGNhbmNlbExhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0NhbmNlbEJ0bixcbiAgICAgICAgICAgIGZyb21MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9mcm9tLFxuICAgICAgICAgICAgdG9MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF90byxcbiAgICAgICAgICAgIGN1c3RvbVJhbmdlTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ3VzdG9tUGVyaW9kLFxuICAgICAgICAgICAgZGF5c09mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LmRheXMsXG4gICAgICAgICAgICBtb250aE5hbWVzOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQubW9udGhzLFxuICAgICAgICAgICAgZmlyc3REYXk6IDEsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBkYXRlIHJhbmdlIGZyb20gbGFzdCAxMDAgcmVjb3JkcywgdXNlIGl0XG4gICAgICAgIC8vIFdIWTogUHJvdmlkZXMgbWVhbmluZ2Z1bCBjb250ZXh0IC0gdXNlciBzZWVzIHBlcmlvZCBjb3ZlcmluZyByZWNlbnQgY2FsbHNcbiAgICAgICAgaWYgKHN0YXJ0RGF0ZSAmJiBlbmREYXRlKSB7XG4gICAgICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudChzdGFydERhdGUpLnN0YXJ0T2YoJ2RheScpO1xuICAgICAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KGVuZERhdGUpLmVuZE9mKCdkYXknKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRvZGF5IGlmIG5vIHJlY29yZHNcbiAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KCk7XG4gICAgICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRlcmFuZ2VwaWNrZXIoXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0LFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIE5vdGU6IERvbid0IGNhbGwgYXBwbHlGaWx0ZXIgaGVyZSAtIERhdGFUYWJsZSBpcyBub3QgaW5pdGlhbGl6ZWQgeWV0XG4gICAgICAgIC8vIERhdGFUYWJsZSB3aWxsIGxvYWQgZGF0YSBhdXRvbWF0aWNhbGx5IGFmdGVyIGluaXRpYWxpemF0aW9uXG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3RvciBzZWxlY3QgZXZlbnQuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBzdGFydCAtIFRoZSBzdGFydCBkYXRlLlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gZW5kIC0gVGhlIGVuZCBkYXRlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYWJlbCAtIFRoZSBsYWJlbC5cbiAgICAgKi9cbiAgICBjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3Qoc3RhcnQsIGVuZCwgbGFiZWwpIHtcbiAgICAgICAgLy8gT25seSBwYXNzIHNlYXJjaCBrZXl3b3JkLCBkYXRlcyBhcmUgcmVhZCBkaXJlY3RseSBmcm9tIGRhdGUgcmFuZ2Ugc2VsZWN0b3JcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIoY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSk7XG4gICAgICAgIC8vIFN0YXRlIHdpbGwgYmUgc2F2ZWQgYXV0b21hdGljYWxseSBpbiBkcmF3IGV2ZW50IGFmdGVyIGZpbHRlciBpcyBhcHBsaWVkXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5zZWFyY2godGV4dCkuZHJhdygpO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgQ0RSIHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==