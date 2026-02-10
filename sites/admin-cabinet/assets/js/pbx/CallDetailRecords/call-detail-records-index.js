"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

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
      var negativeClass = isAnswered ? '' : ' negative'; // Collect unique verbose call IDs

      var ids = _toConsumableArray(new Set((group.records || []).map(function (r) {
        return r.verbose_call_id;
      }).filter(function (id) {
        return id && id.length > 0;
      }))).join('&'); // Return DataTable row format
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCIkc2VhcmNoQ0RSSW5wdXQiLCIkcGFnZUxlbmd0aFNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImhhc0NEUlJlY29yZHMiLCIkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiU1RPUkFHRV9LRVkiLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImdsb2JhbFJvb3RVcmwiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiY2xlYXJGaWx0ZXJzU3RhdGUiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwicmVsb2FkIiwiZmV0Y2hMYXRlc3RDRFJEYXRlIiwic2F2ZUZpbHRlcnNTdGF0ZSIsInNlc3Npb25TdG9yYWdlIiwiY29uc29sZSIsIndhcm4iLCJzdGF0ZSIsImRhdGVGcm9tIiwiZGF0ZVRvIiwic2VhcmNoVGV4dCIsImN1cnJlbnRQYWdlIiwicGFnZUxlbmd0aCIsImdldFBhZ2VMZW5ndGgiLCJkYXRlUmFuZ2VQaWNrZXIiLCJkYXRhIiwic3RhcnREYXRlIiwiZW5kRGF0ZSIsImZvcm1hdCIsInZhbCIsInBhZ2UiLCJwYWdlSW5mbyIsImluZm8iLCJzZXRJdGVtIiwiSlNPTiIsInN0cmluZ2lmeSIsImVycm9yIiwibG9hZEZpbHRlcnNTdGF0ZSIsInJhd0RhdGEiLCJnZXRJdGVtIiwicGFyc2UiLCJpbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMiLCJzZWFyY2hEZWJvdW5jZVRpbWVyIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImtleUNvZGUiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJjYW5EZWxldGUiLCJBQ0xIZWxwZXIiLCJpc0FsbG93ZWQiLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwicHVzaCIsInNlYXJjaCIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiY29sdW1uRGVmcyIsImRlZmF1bHRDb250ZW50IiwidGFyZ2V0cyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInBhcmFtcyIsImlzTGlua2VkSWRTZWFyY2giLCJpc1ZhbGlkIiwiZW5kT2YiLCJzZWFyY2hLZXl3b3JkIiwidmFsdWUiLCJ0cmltIiwia2V5d29yZCIsInN0YXJ0c1dpdGgiLCJzcmNfbnVtIiwic3Vic3RyaW5nIiwiZHN0X251bSIsImRpZCIsImxpbmtlZGlkIiwibGltaXQiLCJvZmZzZXQiLCJzdGFydCIsInNvcnQiLCJvcmRlciIsImdyb3VwZWQiLCJkYXRhU3JjIiwianNvbiIsInJlc3VsdCIsInJlc3REYXRhIiwicmVjb3JkcyIsInBhZ2luYXRpb24iLCJyZWNvcmRzVG90YWwiLCJ0b3RhbCIsInJlY29yZHNGaWx0ZXJlZCIsInRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZSIsImJlZm9yZVNlbmQiLCJ4aHIiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsInNldFJlcXVlc3RIZWFkZXIiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZW1wdHlUYWJsZSIsImdldEVtcHR5VGFibGVNZXNzYWdlIiwiemVyb1JlY29yZHMiLCJjcmVhdGVkUm93Iiwicm93IiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiYWRkQ2xhc3MiLCJhY3Rpb25zSHRtbCIsImNhblZpZXdMb2dzIiwiaWRzIiwiRFRfUm93SWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZHJfRGVsZXRlUmVjb3JkIiwiZHJhd0NhbGxiYWNrIiwiRXh0ZW5zaW9uc0FQSSIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsInRvZ2dsZVBhZ2luYXRpb25Db250cm9scyIsImluaXRDb21wbGV0ZSIsInJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJtaW5DaGFyYWN0ZXJzIiwic2VhcmNoT25Gb2N1cyIsInNlYXJjaEZpZWxkcyIsInNob3dOb1Jlc3VsdHMiLCJzb3VyY2UiLCJ0aXRsZSIsImNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciIsImNkcl9TZWFyY2hCeURlc3ROdW1iZXIiLCJjZHJfU2VhcmNoQnlESUQiLCJjZHJfU2VhcmNoQnlMaW5rZWRJRCIsImNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzcG9uc2UiLCJmb2N1cyIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibGVuIiwiZHJhdyIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwic2F2ZWRQYWdlTGVuZ3RoIiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmRlZmluZWQiLCJlbmNvZGVVUklDb21wb25lbnQiLCJvcGVuIiwidHIiLCJ0YXJnZXQiLCJjaGlsZCIsImlzU2hvd24iLCJoaWRlIiwic2hvd1JlY29yZHMiLCJzaG93IiwiZmluZCIsImVhY2giLCJpbmRleCIsInBsYXllclJvdyIsImlkIiwiQ0RSUGxheWVyIiwiJGJ1dHRvbiIsInJlY29yZElkIiwiZGVsZXRlUmVjb3JkIiwic2F2ZWRTdGF0ZSIsIkNkckFQSSIsImRlbGV0ZVJlY29yZGluZyIsImVycm9yTXNnIiwibWVzc2FnZXMiLCJjZHJfRGVsZXRlRmFpbGVkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJwYWdlcyIsInRhYmxlIiwiY29udGFpbmVyIiwiZ2V0TWV0YWRhdGEiLCJoYXNSZWNvcmRzIiwibW9tZW50IiwiZWFybGllc3REYXRlIiwibGF0ZXN0RGF0ZSIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsInNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIiLCJjZHJfRmlsdGVyZWRFbXB0eVRpdGxlIiwiY2RyX0ZpbHRlcmVkRW1wdHlEZXNjcmlwdGlvbiIsIm1hcCIsImdyb3VwIiwiYmlsbHNlYyIsInRvdGFsQmlsbHNlYyIsInRpbWVGb3JtYXQiLCJ0aW1pbmciLCJ1dGMiLCJmb3JtYXR0ZWREYXRlIiwicmVjb3JkaW5ncyIsImZpbHRlciIsInIiLCJyZWNvcmRpbmdmaWxlIiwicGxheWJhY2tfdXJsIiwiZG93bmxvYWRfdXJsIiwiaGFzUmVjb3JkaW5ncyIsImlzQW5zd2VyZWQiLCJkaXNwb3NpdGlvbiIsImR0Um93Q2xhc3MiLCJuZWdhdGl2ZUNsYXNzIiwiU2V0IiwidmVyYm9zZV9jYWxsX2lkIiwiam9pbiIsImh0bWxQbGF5ZXIiLCJmb3JFYWNoIiwicmVjb3JkIiwiaSIsInBsYXliYWNrVXJsIiwiZG93bmxvYWRVcmwiLCJwYXJzZUludCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsIm9wdGlvbnMiLCJyYW5nZXMiLCJjYWxfVG9kYXkiLCJjYWxfWWVzdGVyZGF5Iiwic3VidHJhY3QiLCJjYWxfTGFzdFdlZWsiLCJjYWxfTGFzdDMwRGF5cyIsImNhbF9UaGlzTW9udGgiLCJzdGFydE9mIiwiY2FsX0xhc3RNb250aCIsImFsd2F5c1Nob3dDYWxlbmRhcnMiLCJhdXRvVXBkYXRlSW5wdXQiLCJsaW5rZWRDYWxlbmRhcnMiLCJtYXhEYXRlIiwibG9jYWxlIiwic2VwYXJhdG9yIiwiYXBwbHlMYWJlbCIsImNhbF9BcHBseUJ0biIsImNhbmNlbExhYmVsIiwiY2FsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsImNhbF9mcm9tIiwidG9MYWJlbCIsImNhbF90byIsImN1c3RvbVJhbmdlTGFiZWwiLCJjYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJkYXRlcmFuZ2VwaWNrZXIiLCJjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QiLCJlbmQiLCJsYWJlbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFQyxDQUFDLENBQUMsWUFBRCxDQUxVOztBQU90QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxlQUFELENBWE07O0FBYXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGtCQUFrQixFQUFFRixDQUFDLENBQUMsc0JBQUQsQ0FqQkM7O0FBbUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxlQUFlLEVBQUVILENBQUMsQ0FBQyxtQkFBRCxDQXZCSTs7QUF5QnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLG1CQUFtQixFQUFFSixDQUFDLENBQUMscUJBQUQsQ0E3QkE7O0FBK0J0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxTQUFTLEVBQUUsRUFuQ1c7O0FBcUN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsRUF6Q2E7O0FBMkN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsSUEvQ087O0FBaUR0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSx5QkFBeUIsRUFBRVIsQ0FBQyxDQUFDLGlDQUFELENBckROOztBQXVEdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSVMsRUFB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bEIsQ0FBZ0N5QyxHQUFoQyxFQUE5QixFQUYyQyxDQUczQztBQUNILEdBcjNCcUI7O0FBdTNCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSW1CLEVBQUFBLFdBMzNCc0IsdUJBMjNCVkQsSUEzM0JVLEVBMjNCSjtBQUNkOUQsSUFBQUEsaUJBQWlCLENBQUNPLFNBQWxCLENBQTRCK0QsTUFBNUIsQ0FBbUNSLElBQW5DLEVBQXlDcUcsSUFBekM7QUFDQW5LLElBQUFBLGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ29LLE9BQWhDLENBQXdDLEtBQXhDLEVBQStDckMsUUFBL0MsQ0FBd0QsU0FBeEQ7QUFDSDtBQTkzQnFCLENBQTFCO0FBaTRCQTtBQUNBO0FBQ0E7O0FBQ0FoSSxDQUFDLENBQUMwUixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCN1IsRUFBQUEsaUJBQWlCLENBQUNhLFVBQWxCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRXh0ZW5zaW9uc0FQSSwgbW9tZW50LCBnbG9iYWxUcmFuc2xhdGUsIENEUlBsYXllciwgQ2RyQVBJLCBVc2VyTWVzc2FnZSwgQUNMSGVscGVyICovXG5cbi8qKlxuICogY2FsbERldGFpbFJlY29yZHMgbW9kdWxlLlxuICogQG1vZHVsZSBjYWxsRGV0YWlsUmVjb3Jkc1xuICovXG5jb25zdCBjYWxsRGV0YWlsUmVjb3JkcyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgY2FsbCBkZXRhaWwgcmVjb3JkcyB0YWJsZSBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNkclRhYmxlOiAkKCcjY2RyLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbHNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkYXRlUmFuZ2VTZWxlY3RvcjogJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBzZWFyY2ggQ0RSIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VhcmNoQ0RSSW5wdXQ6ICQoJyNzZWFyY2gtY2RyLWlucHV0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcGFnZUxlbmd0aFNlbGVjdG9yOiAkKCcjcGFnZS1sZW5ndGgtc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQW4gYXJyYXkgb2YgcGxheWVycy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgcGxheWVyczogW10sXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgQ0RSIGRhdGFiYXNlIGhhcyBhbnkgcmVjb3Jkc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGhhc0NEUlJlY29yZHM6IHRydWUsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZW1wdHkgZGF0YWJhc2UgcGxhY2Vob2xkZXIgZWxlbWVudFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcjogJCgnI2Nkci1lbXB0eS1kYXRhYmFzZS1wbGFjZWhvbGRlcicpLFxuXG4gICAgLyoqXG4gICAgICogU3RvcmFnZSBrZXkgZm9yIGZpbHRlciBzdGF0ZSBpbiBzZXNzaW9uU3RvcmFnZVxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgU1RPUkFHRV9LRVk6ICdjZHJfZmlsdGVyc19zdGF0ZScsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHRyYWNrIGlmIERhdGFUYWJsZSBoYXMgY29tcGxldGVkIGluaXRpYWxpemF0aW9uXG4gICAgICogV0hZOiBQcmV2ZW50cyBzYXZpbmcgc3RhdGUgZHVyaW5nIGluaXRpYWwgbG9hZCBiZWZvcmUgZmlsdGVycyBhcmUgcmVzdG9yZWRcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0luaXRpYWxpemVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjYWxsIGRldGFpbCByZWNvcmRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIExpc3RlbiBmb3IgaGFzaCBjaGFuZ2VzICh3aGVuIHVzZXIgY2xpY2tzIG1lbnUgbGluayB3aGlsZSBhbHJlYWR5IG9uIHBhZ2UpXG4gICAgICAgIC8vIFdIWTogQnJvd3NlciBkb2Vzbid0IHJlbG9hZCBwYWdlIG9uIGhhc2gtb25seSBVUkwgY2hhbmdlc1xuICAgICAgICAkKGBhW2hyZWY9JyR7Z2xvYmFsUm9vdFVybH1jYWxsLWRldGFpbC1yZWNvcmRzL2luZGV4LyNyZXNldC1jYWNoZSddYCkub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgIC8vIFJlbW92ZSBoYXNoIGZyb20gVVJMIHdpdGhvdXQgcGFnZSByZWxvYWRcbiAgICAgICAgICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZShudWxsLCBudWxsLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2xlYXJGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgICAgICAvLyBBbHNvIGNsZWFyIHBhZ2UgbGVuZ3RoIHByZWZlcmVuY2VcbiAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgLy8gUmVsb2FkIHBhZ2UgdG8gYXBwbHkgcmVzZXRcbiAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEZldGNoIG1ldGFkYXRhIGZpcnN0LCB0aGVuIGluaXRpYWxpemUgRGF0YVRhYmxlIHdpdGggcHJvcGVyIGRhdGUgcmFuZ2VcbiAgICAgICAgLy8gV0hZOiBQcmV2ZW50cyBkb3VibGUgcmVxdWVzdCBvbiBwYWdlIGxvYWRcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZmV0Y2hMYXRlc3RDRFJEYXRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmUgY3VycmVudCBmaWx0ZXIgc3RhdGUgdG8gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBTdG9yZXMgZGF0ZSByYW5nZSwgc2VhcmNoIHRleHQsIGN1cnJlbnQgcGFnZSwgYW5kIHBhZ2UgbGVuZ3RoXG4gICAgICovXG4gICAgc2F2ZUZpbHRlcnNTdGF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEZlYXR1cmUgZGV0ZWN0aW9uIC0gZXhpdCBzaWxlbnRseSBpZiBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlc3Npb25TdG9yYWdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignW0NEUl0gc2Vzc2lvblN0b3JhZ2Ugbm90IGF2YWlsYWJsZScpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSB7XG4gICAgICAgICAgICAgICAgZGF0ZUZyb206IG51bGwsXG4gICAgICAgICAgICAgICAgZGF0ZVRvOiBudWxsLFxuICAgICAgICAgICAgICAgIHNlYXJjaFRleHQ6ICcnLFxuICAgICAgICAgICAgICAgIGN1cnJlbnRQYWdlOiAwLFxuICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGg6IGNhbGxEZXRhaWxSZWNvcmRzLmdldFBhZ2VMZW5ndGgoKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gR2V0IGRhdGVzIGZyb20gZGF0ZXJhbmdlcGlja2VyIGluc3RhbmNlXG4gICAgICAgICAgICBjb25zdCBkYXRlUmFuZ2VQaWNrZXIgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IuZGF0YSgnZGF0ZXJhbmdlcGlja2VyJyk7XG4gICAgICAgICAgICBpZiAoZGF0ZVJhbmdlUGlja2VyICYmIGRhdGVSYW5nZVBpY2tlci5zdGFydERhdGUgJiYgZGF0ZVJhbmdlUGlja2VyLmVuZERhdGUpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kYXRlRnJvbSA9IGRhdGVSYW5nZVBpY2tlci5zdGFydERhdGUuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgICAgICAgICAgICAgc3RhdGUuZGF0ZVRvID0gZGF0ZVJhbmdlUGlja2VyLmVuZERhdGUuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEdldCBzZWFyY2ggdGV4dCBmcm9tIGlucHV0IGZpZWxkXG4gICAgICAgICAgICBzdGF0ZS5zZWFyY2hUZXh0ID0gY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSB8fCAnJztcblxuICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgcGFnZSBmcm9tIERhdGFUYWJsZSAoaWYgaW5pdGlhbGl6ZWQpXG4gICAgICAgICAgICBpZiAoY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlICYmIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZUluZm8gPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5pbmZvKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUuY3VycmVudFBhZ2UgPSBwYWdlSW5mby5wYWdlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGNhbGxEZXRhaWxSZWNvcmRzLlNUT1JBR0VfS0VZLCBKU09OLnN0cmluZ2lmeShzdGF0ZSkpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0NEUl0gRmFpbGVkIHRvIHNhdmUgZmlsdGVycyB0byBzZXNzaW9uU3RvcmFnZTonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmaWx0ZXIgc3RhdGUgZnJvbSBzZXNzaW9uU3RvcmFnZVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R8bnVsbH0gU2F2ZWQgc3RhdGUgb2JqZWN0IG9yIG51bGwgaWYgbm90IGZvdW5kL2ludmFsaWRcbiAgICAgKi9cbiAgICBsb2FkRmlsdGVyc1N0YXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRmVhdHVyZSBkZXRlY3Rpb24gLSByZXR1cm4gbnVsbCBpZiBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlc3Npb25TdG9yYWdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignW0NEUl0gc2Vzc2lvblN0b3JhZ2Ugbm90IGF2YWlsYWJsZSBmb3IgbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByYXdEYXRhID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShjYWxsRGV0YWlsUmVjb3Jkcy5TVE9SQUdFX0tFWSk7XG4gICAgICAgICAgICBpZiAoIXJhd0RhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSBKU09OLnBhcnNlKHJhd0RhdGEpO1xuXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBzdGF0ZSBzdHJ1Y3R1cmVcbiAgICAgICAgICAgIGlmICghc3RhdGUgfHwgdHlwZW9mIHN0YXRlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNsZWFyRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tDRFJdIEZhaWxlZCB0byBsb2FkIGZpbHRlcnMgZnJvbSBzZXNzaW9uU3RvcmFnZTonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBDbGVhciBjb3JydXB0ZWQgZGF0YVxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2xlYXJGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFyIHNhdmVkIGZpbHRlciBzdGF0ZSBmcm9tIHNlc3Npb25TdG9yYWdlXG4gICAgICovXG4gICAgY2xlYXJGaWx0ZXJzU3RhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlc3Npb25TdG9yYWdlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oY2FsbERldGFpbFJlY29yZHMuU1RPUkFHRV9LRVkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNsZWFyIENEUiBmaWx0ZXJzIGZyb20gc2Vzc2lvblN0b3JhZ2U6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRGF0YVRhYmxlIGFuZCBldmVudCBoYW5kbGVyc1xuICAgICAqIENhbGxlZCBhZnRlciBtZXRhZGF0YSBpcyByZWNlaXZlZFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGVBbmRIYW5kbGVycygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJvdW5jZSB0aW1lciB2YXJpYWJsZVxuICAgICAgICBsZXQgc2VhcmNoRGVib3VuY2VUaW1lciA9IG51bGw7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZXIgaWYgdGhlIHVzZXIgaXMgc3RpbGwgdHlwaW5nXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoc2VhcmNoRGVib3VuY2VUaW1lcik7XG5cbiAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciBmb3IgZGVsYXllZCBleGVjdXRpb25cbiAgICAgICAgICAgIHNlYXJjaERlYm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxM1xuICAgICAgICAgICAgICAgICAgICB8fCBlLmtleUNvZGUgPT09IDhcbiAgICAgICAgICAgICAgICAgICAgfHwgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBwYXNzIHRoZSBzZWFyY2gga2V5d29yZCwgZGF0ZXMgYXJlIGhhbmRsZWQgc2VwYXJhdGVseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVsYXkgYmVmb3JlIGV4ZWN1dGluZyB0aGUgc2VhcmNoXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJ1aWxkIGNvbHVtbnMgZHluYW1pY2FsbHkgYmFzZWQgb24gQUNMIHBlcm1pc3Npb25zXG4gICAgICAgIC8vIFdIWTogVm9sdCB0ZW1wbGF0ZSBjb25kaXRpb25hbGx5IHJlbmRlcnMgZGVsZXRlIGNvbHVtbiBoZWFkZXIgYmFzZWQgb24gaXNBbGxvd2VkKCdzYXZlJylcbiAgICAgICAgLy8gJ3NhdmUnIGlzIGEgdmlydHVhbCBwZXJtaXNzaW9uIHRoYXQgaW5jbHVkZXMgZGVsZXRlIGNhcGFiaWxpdHkgaW4gTW9kdWxlVXNlcnNVSVxuICAgICAgICAvLyBJZiBjb2x1bW5zIGNvbmZpZyBkb2Vzbid0IG1hdGNoIDx0aGVhZD4gY291bnQsIERhdGFUYWJsZXMgdGhyb3dzICdzdHlsZScgdW5kZWZpbmVkIGVycm9yXG4gICAgICAgIGNvbnN0IGNhbkRlbGV0ZSA9IHR5cGVvZiBBQ0xIZWxwZXIgIT09ICd1bmRlZmluZWQnICYmIEFDTEhlbHBlci5pc0FsbG93ZWQoJ3NhdmUnKTtcbiAgICAgICAgY29uc3QgY29sdW1ucyA9IFtcbiAgICAgICAgICAgIHsgZGF0YTogbnVsbCwgb3JkZXJhYmxlOiBmYWxzZSB9LCAgLy8gMDogZXhwYW5kIGljb24gY29sdW1uXG4gICAgICAgICAgICB7IGRhdGE6IDAgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDE6IGRhdGUgKGFycmF5IGluZGV4IDApXG4gICAgICAgICAgICB7IGRhdGE6IDEgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDI6IHNyY19udW0gKGFycmF5IGluZGV4IDEpXG4gICAgICAgICAgICB7IGRhdGE6IDIgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDM6IGRzdF9udW0gKGFycmF5IGluZGV4IDIpXG4gICAgICAgICAgICB7IGRhdGE6IDMgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDQ6IGR1cmF0aW9uIChhcnJheSBpbmRleCAzKVxuICAgICAgICBdO1xuICAgICAgICBpZiAoY2FuRGVsZXRlKSB7XG4gICAgICAgICAgICBjb2x1bW5zLnB1c2goeyBkYXRhOiBudWxsLCBvcmRlcmFibGU6IGZhbHNlIH0pOyAgLy8gNTogYWN0aW9ucyBjb2x1bW4gKGxvZ3MgaWNvbiArIGRlbGV0ZSlcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5kYXRhVGFibGUoe1xuICAgICAgICAgICAgc2VhcmNoOiB7XG4gICAgICAgICAgICAgICAgc2VhcmNoOiBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uczogY29sdW1ucyxcbiAgICAgICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICAgICAgICB7IGRlZmF1bHRDb250ZW50OiBcIi1cIiwgIHRhcmdldHM6IFwiX2FsbFwifSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBhamF4OiB7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2NkcicsXG4gICAgICAgICAgICAgICAgdHlwZTogJ0dFVCcsICAvLyBSRVNUIEFQSSB1c2VzIEdFVCBmb3IgbGlzdCByZXRyaWV2YWxcbiAgICAgICAgICAgICAgICBkYXRhOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBsZXQgaXNMaW5rZWRJZFNlYXJjaCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIDEuIEFsd2F5cyBnZXQgZGF0ZXMgZnJvbSBkYXRlIHJhbmdlIHNlbGVjdG9yIHVzaW5nIGRhdGVyYW5nZXBpY2tlciBBUElcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZVJhbmdlUGlja2VyID0gY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGEoJ2RhdGVyYW5nZXBpY2tlcicpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0ZVJhbmdlUGlja2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydERhdGUgPSBkYXRlUmFuZ2VQaWNrZXIuc3RhcnREYXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW5kRGF0ZSA9IGRhdGVSYW5nZVBpY2tlci5lbmREYXRlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhcnREYXRlICYmIHN0YXJ0RGF0ZS5pc1ZhbGlkKCkgJiYgZW5kRGF0ZSAmJiBlbmREYXRlLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kYXRlRnJvbSA9IHN0YXJ0RGF0ZS5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZGF0ZVRvID0gZW5kRGF0ZS5lbmRPZignZGF5JykuZm9ybWF0KCdZWVlZLU1NLUREIEhIOm1tOnNzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyAyLiBQcm9jZXNzIHNlYXJjaCBrZXl3b3JkIGZyb20gc2VhcmNoIGlucHV0IGZpZWxkXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlYXJjaEtleXdvcmQgPSBkLnNlYXJjaC52YWx1ZSB8fCAnJztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VhcmNoS2V5d29yZC50cmltKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleXdvcmQgPSBzZWFyY2hLZXl3b3JkLnRyaW0oKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUGFyc2Ugc2VhcmNoIHByZWZpeGVzOiBzcmM6LCBkc3Q6LCBkaWQ6LCBsaW5rZWRpZDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ3NyYzonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBzb3VyY2UgbnVtYmVyIG9ubHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuc3JjX251bSA9IGtleXdvcmQuc3Vic3RyaW5nKDQpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdkc3Q6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgZGVzdGluYXRpb24gbnVtYmVyIG9ubHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZHN0X251bSA9IGtleXdvcmQuc3Vic3RyaW5nKDQpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdkaWQ6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgRElEIG9ubHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZGlkID0ga2V5d29yZC5zdWJzdHJpbmcoNCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ2xpbmtlZGlkOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IGxpbmtlZGlkIC0gaWdub3JlIGRhdGUgcmFuZ2UgZm9yIGxpbmtlZGlkIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5saW5rZWRpZCA9IGtleXdvcmQuc3Vic3RyaW5nKDkpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0xpbmtlZElkU2VhcmNoID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZGF0ZSBwYXJhbXMgZm9yIGxpbmtlZGlkIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJhbXMuZGF0ZUZyb207XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHBhcmFtcy5kYXRlVG87XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZ1bGwtdGV4dCBzZWFyY2g6IHNlYXJjaCBpbiBzcmNfbnVtLCBkc3RfbnVtLCBhbmQgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV0hZOiBVc2VyIGV4cGVjdHMgc2VhcmNoIHdpdGhvdXQgcHJlZml4IHRvIGZpbmQgbnVtYmVyIGFueXdoZXJlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNlYXJjaCA9IGtleXdvcmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBSRVNUIEFQSSBwYWdpbmF0aW9uIHBhcmFtZXRlcnNcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmxpbWl0ID0gZC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vZmZzZXQgPSBkLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuc29ydCA9ICdzdGFydCc7ICAvLyBTb3J0IGJ5IGNhbGwgc3RhcnQgdGltZSBmb3IgY2hyb25vbG9naWNhbCBvcmRlclxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMub3JkZXIgPSAnREVTQyc7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gV0hZOiBXZWJVSSBhbHdheXMgbmVlZHMgZ3JvdXBlZCByZWNvcmRzIChieSBsaW5rZWRpZCkgZm9yIHByb3BlciBkaXNwbGF5XG4gICAgICAgICAgICAgICAgICAgIC8vIEJhY2tlbmQgZGVmYXVsdHMgdG8gZ3JvdXBlZD10cnVlLCBidXQgZXhwbGljaXQgaXMgYmV0dGVyIHRoYW4gaW1wbGljaXRcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmdyb3VwZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFQSSByZXR1cm5zIFBCWEFwaVJlc3VsdCBzdHJ1Y3R1cmU6XG4gICAgICAgICAgICAgICAgICAgIC8vIHtyZXN1bHQ6IHRydWUsIGRhdGE6IHtyZWNvcmRzOiBbLi4uXSwgcGFnaW5hdGlvbjogey4uLn19fVxuICAgICAgICAgICAgICAgICAgICBpZiAoanNvbi5yZXN1bHQgJiYganNvbi5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHJlY29yZHMgYW5kIHBhZ2luYXRpb24gZnJvbSBuZXN0ZWQgZGF0YSBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3REYXRhID0ganNvbi5kYXRhLnJlY29yZHMgfHwgW107XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWdpbmF0aW9uID0ganNvbi5kYXRhLnBhZ2luYXRpb24gfHwge307XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBEYXRhVGFibGVzIHBhZ2luYXRpb24gcHJvcGVydGllc1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzVG90YWwgPSBwYWdpbmF0aW9uLnRvdGFsIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uLnJlY29yZHNGaWx0ZXJlZCA9IHBhZ2luYXRpb24udG90YWwgfHwgMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJhbnNmb3JtIFJFU1QgcmVjb3JkcyB0byBEYXRhVGFibGUgcm93c1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxEZXRhaWxSZWNvcmRzLnRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZShyZXN0RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYmVmb3JlU2VuZDogZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBCZWFyZXIgdG9rZW4gZm9yIEFQSSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQXV0aG9yaXphdGlvbicsIGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgLy9zY3JvbGxZOiAkKHdpbmRvdykuaGVpZ2h0KCkgLSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub2Zmc2V0KCkudG9wLTE1MCxcbiAgICAgICAgICAgIHNEb206ICdydGlwJyxcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogY2FsbERldGFpbFJlY29yZHMuZ2V0UGFnZUxlbmd0aCgpLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IHtcbiAgICAgICAgICAgICAgICAuLi5TZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICAgICAgZW1wdHlUYWJsZTogY2FsbERldGFpbFJlY29yZHMuZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKSxcbiAgICAgICAgICAgICAgICB6ZXJvUmVjb3JkczogY2FsbERldGFpbFJlY29yZHMuZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBDRFIgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5EVF9Sb3dDbGFzcy5pbmRleE9mKFwiZGV0YWlsZWRcIikgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJpY29uIGNhcmV0IGRvd25cIj48L2k+Jyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMSkuaHRtbChkYXRhWzBdKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMilcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoZGF0YVsxXSlcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgzKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzJdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBEdXJhdGlvbiBjb2x1bW4gKG5vIGljb25zKVxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSg0KS5odG1sKGRhdGFbM10pLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBBY3Rpb25zIGNvbHVtbjogb25seSByZW5kZXIgaWYgdXNlciBoYXMgZGVsZXRlIHBlcm1pc3Npb25cbiAgICAgICAgICAgICAgICAvLyBXSFk6IFZvbHQgdGVtcGxhdGUgY29uZGl0aW9uYWxseSByZW5kZXJzIHRoaXMgY29sdW1uIGJhc2VkIG9uIGlzQWxsb3dlZCgnZGVsZXRlJylcbiAgICAgICAgICAgICAgICBpZiAoIWNhbkRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTGFzdCBjb2x1bW46IGxvZyBpY29uICsgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGxldCBhY3Rpb25zSHRtbCA9ICcnO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGxvZyBpY29uIGlmIHVzZXIgaGFzIGFjY2VzcyB0byBTeXN0ZW0gRGlhZ25vc3RpY1xuICAgICAgICAgICAgICAgIC8vIFdIWTogTG9nIGljb24gbGlua3MgdG8gc3lzdGVtLWRpYWdub3N0aWMgcGFnZSB3aGljaCByZXF1aXJlcyBzcGVjaWZpYyBwZXJtaXNzaW9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhblZpZXdMb2dzID0gdHlwZW9mIEFDTEhlbHBlciAhPT0gJ3VuZGVmaW5lZCcgJiYgQUNMSGVscGVyLmlzQWxsb3dlZCgndmlld1N5c3RlbURpYWdub3N0aWMnKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FuVmlld0xvZ3MgJiYgZGF0YS5pZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnNIdG1sICs9IGA8aSBkYXRhLWlkcz1cIiR7ZGF0YS5pZHN9XCIgY2xhc3M9XCJmaWxlIGFsdGVybmF0ZSBvdXRsaW5lIGljb25cIiBzdHlsZT1cImN1cnNvcjogcG9pbnRlcjsgbWFyZ2luLXJpZ2h0OiA4cHg7XCI+PC9pPmA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGRlbGV0ZSBidXR0b25cbiAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZSB0d28tc3RlcHMtZGVsZXRlIG1lY2hhbmlzbSB0byBwcmV2ZW50IGFjY2lkZW50YWwgZGVsZXRpb25cbiAgICAgICAgICAgICAgICAvLyBGaXJzdCBjbGljayBjaGFuZ2VzIHRyYXNoIGljb24gdG8gY2xvc2UgaWNvbiwgc2Vjb25kIGNsaWNrIGRlbGV0ZXNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZSBkYXRhLkRUX1Jvd0lkIHdoaWNoIGNvbnRhaW5zIGxpbmtlZGlkIGZvciBncm91cGVkIHJlY29yZHNcbiAgICAgICAgICAgICAgICBhY3Rpb25zSHRtbCArPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInR3by1zdGVwcy1kZWxldGUgZGVsZXRlLXJlY29yZCBwb3B1cGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1yZWNvcmQtaWQ9XCIke2RhdGEuRFRfUm93SWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0RlbGV0ZVJlY29yZCB8fCAnRGVsZXRlIHJlY29yZCd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIiBzdHlsZT1cIm1hcmdpbjogMDtcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5gO1xuXG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDUpLmh0bWwoYWN0aW9uc0h0bWwpLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSW5pdGlhbGl6YXRpb24gY29tcGxldGUgY2FsbGJhY2sgLSBmaXJlZCBhZnRlciBmaXJzdCBkYXRhIGxvYWRcbiAgICAgICAgICAgICAqIFdIWTogUmVzdG9yZSBmaWx0ZXJzIEFGVEVSIERhdGFUYWJsZSBoYXMgbG9hZGVkIGluaXRpYWwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbml0Q29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGZsYWcgRklSU1QgdG8gYWxsb3cgc3RhdGUgc2F2aW5nIGR1cmluZyBmaWx0ZXIgcmVzdG9yYXRpb25cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAvLyBOb3cgcmVzdG9yZSBmaWx0ZXJzIC0gZHJhdyBldmVudCB3aWxsIGNvcnJlY3RseSBzYXZlIHRoZSByZXN0b3JlZCBzdGF0ZVxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLkRhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIFNlYXJjaCBjb21wb25lbnQgQUZURVIgRGF0YVRhYmxlIGlzIGNyZWF0ZWRcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCh7XG4gICAgICAgICAgICBtaW5DaGFyYWN0ZXJzOiAwLFxuICAgICAgICAgICAgc2VhcmNoT25Gb2N1czogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hGaWVsZHM6IFsndGl0bGUnXSxcbiAgICAgICAgICAgIHNob3dOb1Jlc3VsdHM6IGZhbHNlLFxuICAgICAgICAgICAgc291cmNlOiBbXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciwgdmFsdWU6ICdzcmM6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlEZXN0TnVtYmVyLCB2YWx1ZTogJ2RzdDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeURJRCwgdmFsdWU6ICdkaWQ6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlMaW5rZWRJRCwgdmFsdWU6ICdsaW5rZWRpZDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSwgdmFsdWU6ICcnIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb25TZWxlY3Q6IGZ1bmN0aW9uKHJlc3VsdCwgcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbChyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goJ2hpZGUgcmVzdWx0cycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHNlYXJjaCB3aGVuIHlvdSBjbGljayBvbiB0aGUgaWNvblxuICAgICAgICAkKCcjc2VhcmNoLWljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guZm9jdXMoKTtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goJ3F1ZXJ5Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIHRvIHNhdmUgdGhlIHVzZXIncyBwYWdlIGxlbmd0aCBzZWxlY3Rpb24gYW5kIHVwZGF0ZSB0aGUgdGFibGVcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZShwYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VMZW5ndGggPT09ICdhdXRvJykge1xuICAgICAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoID0gY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcsIHBhZ2VMZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHRoZSBldmVudCBmcm9tIGJ1YmJsaW5nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgc2VsZWN0IGlucHV0IHZhbHVlIHRvIHRoZSBzYXZlZCB2YWx1ZSBpZiBpdCBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBzYXZlZFBhZ2VMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBTa2lwIHNhdmluZyBzdGF0ZSBkdXJpbmcgaW5pdGlhbCBsb2FkIGJlZm9yZSBmaWx0ZXJzIGFyZSByZXN0b3JlZFxuICAgICAgICAgICAgaWYgKCFjYWxsRGV0YWlsUmVjb3Jkcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTYXZlIHN0YXRlIGFmdGVyIGV2ZXJ5IGRyYXcgKHBhZ2luYXRpb24sIHNlYXJjaCwgZGF0ZSBjaGFuZ2UpXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5zYXZlRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3IgY2xpY2tpbmcgb24gaWNvbiB3aXRoIGRhdGEtaWRzIChvcGVuIGluIG5ldyB3aW5kb3cpXG4gICAgICAgIC8vIFdIWTogQ2xpY2tpbmcgb24gaWNvbiBzaG91bGQgb3BlbiBTeXN0ZW0gRGlhZ25vc3RpYyBpbiBuZXcgd2luZG93IHRvIHZpZXcgdmVyYm9zZSBsb2dzXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAnW2RhdGEtaWRzXScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHJvdyB0b2dnbGVcblxuICAgICAgICAgICAgY29uc3QgaWRzID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtaWRzJyk7XG4gICAgICAgICAgICBpZiAoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFdIWTogRm9ybWF0IGFzIHF1ZXJ5IHBhcmFtICsgaGFzaDogP2ZpbHRlcj0uLi4jZmlsZT0uLi5cbiAgICAgICAgICAgICAgICAvLyBPcGVuIGluIG5ldyB3aW5kb3cgdG8gYWxsb3cgdmlld2luZyBsb2dzIHdoaWxlIGtlZXBpbmcgQ0RSIHRhYmxlIHZpc2libGVcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBgJHtnbG9iYWxSb290VXJsfXN5c3RlbS1kaWFnbm9zdGljL2luZGV4Lz9maWx0ZXI9JHtlbmNvZGVVUklDb21wb25lbnQoaWRzKX0jZmlsZT1hc3RlcmlzayUyRnZlcmJvc2VgO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5vcGVuKHVybCwgJ19ibGFuaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgZm9yIG9wZW5pbmcgYW5kIGNsb3NpbmcgZGV0YWlsc1xuICAgICAgICAvLyBXSFk6IE9ubHkgZXhwYW5kL2NvbGxhcHNlIG9uIGZpcnN0IGNvbHVtbiAoY2FyZXQgaWNvbikgY2xpY2ssIG5vdCBvbiBhY3Rpb24gaWNvbnNcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICd0ci5kZXRhaWxlZCB0ZDpmaXJzdC1jaGlsZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ciA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucm93KHRyKTtcblxuICAgICAgICAgICAgaWYgKHJvdy5jaGlsZC5pc1Nob3duKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIHJvdyBpcyBhbHJlYWR5IG9wZW4gLSBjbG9zZSBpdFxuICAgICAgICAgICAgICAgIHJvdy5jaGlsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgdHIucmVtb3ZlQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE9wZW4gdGhpcyByb3dcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoY2FsbERldGFpbFJlY29yZHMuc2hvd1JlY29yZHMocm93LmRhdGEoKSkpLnNob3coKTtcbiAgICAgICAgICAgICAgICB0ci5hZGRDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoKS5maW5kKCcuZGV0YWlsLXJlY29yZC1yb3cnKS5lYWNoKChpbmRleCwgcGxheWVyUm93KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gJChwbGF5ZXJSb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ0RSUGxheWVyKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHNlY29uZCBjbGljayBvbiBkZWxldGUgYnV0dG9uIChhZnRlciB0d28tc3RlcHMtZGVsZXRlIGNoYW5nZXMgaWNvbiB0byBjbG9zZSlcbiAgICAgICAgLy8gV0hZOiBUd28tc3RlcHMtZGVsZXRlIG1lY2hhbmlzbSBwcmV2ZW50cyBhY2NpZGVudGFsIGRlbGV0aW9uXG4gICAgICAgIC8vIEZpcnN0IGNsaWNrOiB0cmFzaCDihpIgY2xvc2UgKGJ5IGRlbGV0ZS1zb21ldGhpbmcuanMpLCBTZWNvbmQgY2xpY2s6IGV4ZWN1dGUgZGVsZXRpb25cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICdhLmRlbGV0ZS1yZWNvcmQ6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHJvdyBleHBhbnNpb25cblxuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXJlY29yZC1pZCcpO1xuXG4gICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBZGQgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQgbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBBbHdheXMgZGVsZXRlIHdpdGggcmVjb3JkaW5ncyBhbmQgbGlua2VkIHJlY29yZHNcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRlbGV0ZVJlY29yZChyZWNvcmRJZCwgJGJ1dHRvbik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXN0b3JlIGZpbHRlcnMgZnJvbSBzYXZlZCBzdGF0ZSBhZnRlciBEYXRhVGFibGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBXSFk6IE11c3QgYmUgY2FsbGVkIGFmdGVyIERhdGFUYWJsZSBpcyBjcmVhdGVkIHRvIHJlc3RvcmUgc2VhcmNoIGFuZCBwYWdlXG4gICAgICovXG4gICAgcmVzdG9yZUZpbHRlcnNGcm9tU3RhdGUoKSB7XG4gICAgICAgIGNvbnN0IHNhdmVkU3RhdGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy5sb2FkRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgIGlmICghc2F2ZWRTdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVzdG9yZSBzZWFyY2ggdGV4dCB0byBpbnB1dCBmaWVsZFxuICAgICAgICBpZiAoc2F2ZWRTdGF0ZS5zZWFyY2hUZXh0KSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbChzYXZlZFN0YXRlLnNlYXJjaFRleHQpO1xuICAgICAgICAgICAgLy8gQXBwbHkgc2VhcmNoIHRvIERhdGFUYWJsZVxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaChzYXZlZFN0YXRlLnNlYXJjaFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVzdG9yZSBwYWdlIG51bWJlciB3aXRoIGRlbGF5XG4gICAgICAgIC8vIFdIWTogRGF0YVRhYmxlIGlnbm9yZXMgcGFnZSgpIGR1cmluZyBpbml0Q29tcGxldGUsIG5lZWQgc2V0VGltZW91dCB0byBhbGxvdyBpbml0aWFsaXphdGlvbiB0byBmdWxseSBjb21wbGV0ZVxuICAgICAgICBpZiAoc2F2ZWRTdGF0ZS5jdXJyZW50UGFnZSkge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2Uoc2F2ZWRTdGF0ZS5jdXJyZW50UGFnZSkuZHJhdyhmYWxzZSk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCkge1xuICAgICAgICAgICAgLy8gSWYgb25seSBzZWFyY2ggdGV4dCBleGlzdHMsIHN0aWxsIG5lZWQgdG8gZHJhd1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLmRyYXcoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgQ0RSIHJlY29yZCB2aWEgUkVTVCBBUElcbiAgICAgKiBXSFk6IERlbGV0ZXMgYnkgbGlua2VkaWQgLSBhdXRvbWF0aWNhbGx5IHJlbW92ZXMgZW50aXJlIGNvbnZlcnNhdGlvbiB3aXRoIGFsbCBsaW5rZWQgcmVjb3Jkc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIENEUiBsaW5rZWRpZCAobGlrZSBcIm1pa29wYngtMTc2MDc4NDc5My40NjI3XCIpXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRidXR0b24gLSBCdXR0b24gZWxlbWVudCB0byB1cGRhdGUgc3RhdGVcbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQocmVjb3JkSWQsICRidXR0b24pIHtcbiAgICAgICAgLy8gQWx3YXlzIGRlbGV0ZSB3aXRoIHJlY29yZGluZyBmaWxlc1xuICAgICAgICAvLyBXSFk6IGxpbmtlZGlkIGF1dG9tYXRpY2FsbHkgZGVsZXRlcyBhbGwgbGlua2VkIHJlY29yZHMgKG5vIGRlbGV0ZUxpbmtlZCBwYXJhbWV0ZXIgbmVlZGVkKVxuICAgICAgICBDZHJBUEkuZGVsZXRlUmVjb3JkKHJlY29yZElkLCB7IGRlbGV0ZVJlY29yZGluZzogdHJ1ZSB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIFNpbGVudGx5IHJlbG9hZCB0aGUgRGF0YVRhYmxlIHRvIHJlZmxlY3QgY2hhbmdlc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogVmlzdWFsIGZlZWRiYWNrIChkaXNhcHBlYXJpbmcgcm93KSBpcyBlbm91Z2gsIG5vIG5lZWQgZm9yIHN1Y2Nlc3MgdG9hc3RcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuYWpheC5yZWxvYWQobnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2Ugb25seSBvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSByZXNwb25zZT8ubWVzc2FnZXM/LmVycm9yPy5bMF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNkcl9EZWxldGVGYWlsZWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBkZWxldGUgcmVjb3JkJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNc2cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgcGFnaW5hdGlvbiBjb250cm9scyB2aXNpYmlsaXR5IGJhc2VkIG9uIGRhdGEgc2l6ZVxuICAgICAqL1xuICAgIHRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpIHtcbiAgICAgICAgY29uc3QgaW5mbyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmluZm8oKTtcbiAgICAgICAgaWYgKGluZm8ucGFnZXMgPD0gMSkge1xuICAgICAgICAgICAgJChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUudGFibGUoKS5jb250YWluZXIoKSkuZmluZCgnLmRhdGFUYWJsZXNfcGFnaW5hdGUnKS5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS50YWJsZSgpLmNvbnRhaW5lcigpKS5maW5kKCcuZGF0YVRhYmxlc19wYWdpbmF0ZScpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIENEUiBtZXRhZGF0YSAoZGF0ZSByYW5nZSkgdXNpbmcgQ2RyQVBJXG4gICAgICogV0hZOiBMaWdodHdlaWdodCByZXF1ZXN0IHJldHVybnMgb25seSBtZXRhZGF0YSAoZGF0ZXMpLCBub3QgZnVsbCBDRFIgcmVjb3Jkc1xuICAgICAqIEF2b2lkcyBkb3VibGUgcmVxdWVzdCBvbiBwYWdlIGxvYWRcbiAgICAgKi9cbiAgICBmZXRjaExhdGVzdENEUkRhdGUoKSB7XG4gICAgICAgIC8vIENoZWNrIGZvciBzYXZlZCBzdGF0ZSBmaXJzdFxuICAgICAgICBjb25zdCBzYXZlZFN0YXRlID0gY2FsbERldGFpbFJlY29yZHMubG9hZEZpbHRlcnNTdGF0ZSgpO1xuXG4gICAgICAgIENkckFQSS5nZXRNZXRhZGF0YSh7IGxpbWl0OiAxMDAgfSwgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEuaGFzUmVjb3Jkcykge1xuICAgICAgICAgICAgICAgIGxldCBzdGFydERhdGUsIGVuZERhdGU7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIHNhdmVkIHN0YXRlIHdpdGggZGF0ZXMsIHVzZSB0aG9zZSBpbnN0ZWFkIG9mIG1ldGFkYXRhXG4gICAgICAgICAgICAgICAgaWYgKHNhdmVkU3RhdGUgJiYgc2F2ZWRTdGF0ZS5kYXRlRnJvbSAmJiBzYXZlZFN0YXRlLmRhdGVUbykge1xuICAgICAgICAgICAgICAgICAgICBzdGFydERhdGUgPSBtb21lbnQoc2F2ZWRTdGF0ZS5kYXRlRnJvbSk7XG4gICAgICAgICAgICAgICAgICAgIGVuZERhdGUgPSBtb21lbnQoc2F2ZWRTdGF0ZS5kYXRlVG8pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgbWV0YWRhdGEgZGF0ZSBzdHJpbmdzIHRvIG1vbWVudCBvYmplY3RzXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0RGF0ZSA9IG1vbWVudChkYXRhLmVhcmxpZXN0RGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGVuZERhdGUgPSBtb21lbnQoZGF0YS5sYXRlc3REYXRlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3Ioc3RhcnREYXRlLCBlbmREYXRlKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgRGF0YVRhYmxlIG9ubHkgaWYgd2UgaGF2ZSByZWNvcmRzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBEYXRhVGFibGUgbmVlZHMgZGF0ZSByYW5nZSB0byBiZSBzZXQgZmlyc3RcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm8gcmVjb3JkcyBpbiBkYXRhYmFzZSBhdCBhbGwgb3IgQVBJIGVycm9yXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3JkcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIoKTtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBpbml0aWFsaXplIERhdGFUYWJsZSBhdCBhbGwgLSBqdXN0IHNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgYSBzdHlsZWQgZW1wdHkgdGFibGUgbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgbWVzc2FnZSBmb3IgZW1wdHkgdGFibGVcbiAgICAgKi9cbiAgICBnZXRFbXB0eVRhYmxlTWVzc2FnZSgpIHtcbiAgICAgICAgLy8gSWYgZGF0YWJhc2UgaXMgZW1wdHksIHdlIGRvbid0IHNob3cgdGhpcyBtZXNzYWdlIGluIHRhYmxlXG4gICAgICAgIGlmICghY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3Jkcykge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGZpbHRlcmVkIGVtcHR5IHN0YXRlIG1lc3NhZ2VcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBsYWNlaG9sZGVyIHNlZ21lbnRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic2VhcmNoIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0ZpbHRlcmVkRW1wdHlUaXRsZX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlubGluZVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0XCI+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9GaWx0ZXJlZEVtcHR5RGVzY3JpcHRpb259XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIHRoZSBlbXB0eSBkYXRhYmFzZSBwbGFjZWhvbGRlciBhbmQgaGlkZXMgdGhlIHRhYmxlXG4gICAgICovXG4gICAgc2hvd0VtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcigpIHtcbiAgICAgICAgLy8gSGlkZSB0aGUgdGFibGUgaXRzZWxmIChEYXRhVGFibGUgd29uJ3QgYmUgaW5pdGlhbGl6ZWQpXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5oaWRlKCk7XG5cbiAgICAgICAgLy8gSGlkZSBzZWFyY2ggYW5kIGRhdGUgY29udHJvbHNcbiAgICAgICAgJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKS5jbG9zZXN0KCcudWkucm93JykuaGlkZSgpO1xuXG4gICAgICAgIC8vIFNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGVtcHR5RGF0YWJhc2VQbGFjZWhvbGRlci5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRyYW5zZm9ybSBSRVNUIEFQSSBncm91cGVkIHJlY29yZHMgdG8gRGF0YVRhYmxlIHJvdyBmb3JtYXRcbiAgICAgKiBAcGFyYW0ge0FycmF5fSByZXN0RGF0YSAtIEFycmF5IG9mIGdyb3VwZWQgQ0RSIHJlY29yZHMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgRGF0YVRhYmxlIHJvd3NcbiAgICAgKi9cbiAgICB0cmFuc2Zvcm1SZXN0VG9EYXRhVGFibGUocmVzdERhdGEpIHtcbiAgICAgICAgcmV0dXJuIHJlc3REYXRhLm1hcChncm91cCA9PiB7XG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgdGltaW5nIGRpc3BsYXlcbiAgICAgICAgICAgIGNvbnN0IGJpbGxzZWMgPSBncm91cC50b3RhbEJpbGxzZWMgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVGb3JtYXQgPSAoYmlsbHNlYyA8IDM2MDApID8gJ21tOnNzJyA6ICdISDptbTpzcyc7XG4gICAgICAgICAgICBjb25zdCB0aW1pbmcgPSBiaWxsc2VjID4gMCA/IG1vbWVudC51dGMoYmlsbHNlYyAqIDEwMDApLmZvcm1hdCh0aW1lRm9ybWF0KSA6ICcnO1xuXG4gICAgICAgICAgICAvLyBGb3JtYXQgc3RhcnQgZGF0ZVxuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkRGF0ZSA9IG1vbWVudChncm91cC5zdGFydCkuZm9ybWF0KCdERC1NTS1ZWVlZIEhIOm1tOnNzJyk7XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgcmVjb3JkaW5nIHJlY29yZHMgLSBmaWx0ZXIgb25seSByZWNvcmRzIHdpdGggYWN0dWFsIHJlY29yZGluZyBmaWxlc1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkaW5ncyA9IChncm91cC5yZWNvcmRzIHx8IFtdKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIociA9PiByLnJlY29yZGluZ2ZpbGUgJiYgci5yZWNvcmRpbmdmaWxlLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgLm1hcChyID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIGlkOiByLmlkLFxuICAgICAgICAgICAgICAgICAgICBzcmNfbnVtOiByLnNyY19udW0sXG4gICAgICAgICAgICAgICAgICAgIGRzdF9udW06IHIuZHN0X251bSxcbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkaW5nZmlsZTogci5yZWNvcmRpbmdmaWxlLFxuICAgICAgICAgICAgICAgICAgICBwbGF5YmFja191cmw6IHIucGxheWJhY2tfdXJsLCAgIC8vIFRva2VuLWJhc2VkIFVSTCBmb3IgcGxheWJhY2tcbiAgICAgICAgICAgICAgICAgICAgZG93bmxvYWRfdXJsOiByLmRvd25sb2FkX3VybCAgICAvLyBUb2tlbi1iYXNlZCBVUkwgZm9yIGRvd25sb2FkXG4gICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgQ1NTIGNsYXNzXG4gICAgICAgICAgICBjb25zdCBoYXNSZWNvcmRpbmdzID0gcmVjb3JkaW5ncy5sZW5ndGggPiAwO1xuICAgICAgICAgICAgY29uc3QgaXNBbnN3ZXJlZCA9IGdyb3VwLmRpc3Bvc2l0aW9uID09PSAnQU5TV0VSRUQnO1xuICAgICAgICAgICAgY29uc3QgZHRSb3dDbGFzcyA9IGhhc1JlY29yZGluZ3MgPyAnZGV0YWlsZWQnIDogJ3VpJztcbiAgICAgICAgICAgIGNvbnN0IG5lZ2F0aXZlQ2xhc3MgPSBpc0Fuc3dlcmVkID8gJycgOiAnIG5lZ2F0aXZlJztcblxuICAgICAgICAgICAgLy8gQ29sbGVjdCB1bmlxdWUgdmVyYm9zZSBjYWxsIElEc1xuICAgICAgICAgICAgY29uc3QgaWRzID0gWy4uLm5ldyBTZXQoXG4gICAgICAgICAgICAgICAgKGdyb3VwLnJlY29yZHMgfHwgW10pXG4gICAgICAgICAgICAgICAgICAgIC5tYXAociA9PiByLnZlcmJvc2VfY2FsbF9pZClcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpZCA9PiBpZCAmJiBpZC5sZW5ndGggPiAwKVxuICAgICAgICAgICAgKV0uam9pbignJicpO1xuXG4gICAgICAgICAgICAvLyBSZXR1cm4gRGF0YVRhYmxlIHJvdyBmb3JtYXRcbiAgICAgICAgICAgIC8vIERhdGFUYWJsZXMgbmVlZHMgYm90aCBhcnJheSBpbmRpY2VzIEFORCBzcGVjaWFsIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IFtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWREYXRlLCAgICAgICAgICAgICAgLy8gMDogZGF0ZVxuICAgICAgICAgICAgICAgIGdyb3VwLnNyY19udW0sICAgICAgICAgICAgICAvLyAxOiBzb3VyY2UgbnVtYmVyXG4gICAgICAgICAgICAgICAgZ3JvdXAuZHN0X251bSB8fCBncm91cC5kaWQsIC8vIDI6IGRlc3RpbmF0aW9uIG51bWJlciBvciBESURcbiAgICAgICAgICAgICAgICB0aW1pbmcsICAgICAgICAgICAgICAgICAgICAgLy8gMzogZHVyYXRpb25cbiAgICAgICAgICAgICAgICByZWNvcmRpbmdzLCAgICAgICAgICAgICAgICAgLy8gNDogcmVjb3JkaW5nIHJlY29yZHMgYXJyYXlcbiAgICAgICAgICAgICAgICBncm91cC5kaXNwb3NpdGlvbiAgICAgICAgICAgLy8gNTogZGlzcG9zaXRpb25cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIC8vIEFkZCBEYXRhVGFibGVzIHNwZWNpYWwgcHJvcGVydGllc1xuICAgICAgICAgICAgcm93LkRUX1Jvd0lkID0gZ3JvdXAubGlua2VkaWQ7XG4gICAgICAgICAgICByb3cuRFRfUm93Q2xhc3MgPSBkdFJvd0NsYXNzICsgbmVnYXRpdmVDbGFzcztcbiAgICAgICAgICAgIHJvdy5pZHMgPSBpZHM7IC8vIFN0b3JlIHJhdyBJRHMgd2l0aG91dCBlbmNvZGluZyAtIGVuY29kaW5nIHdpbGwgYmUgYXBwbGllZCB3aGVuIGJ1aWxkaW5nIFVSTFxuXG4gICAgICAgICAgICByZXR1cm4gcm93O1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSBzZXQgb2YgY2FsbCByZWNvcmRzIHdoZW4gYSByb3cgaXMgY2xpY2tlZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjYWxsIHJlY29yZHMuXG4gICAgICovXG4gICAgc2hvd1JlY29yZHMoZGF0YSkge1xuICAgICAgICBsZXQgaHRtbFBsYXllciA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIHRhYmxlIGNkci1wbGF5ZXJcIj48dGJvZHk+JztcbiAgICAgICAgZGF0YVs0XS5mb3JFYWNoKChyZWNvcmQsIGkpID0+IHtcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IG51bGxcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvdyBkaXNhYmxlZFwiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCJcIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiIGRhdGEtdmFsdWU9XCJcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLnNyY19udW19PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7cmVjb3JkLmRzdF9udW19PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0b2tlbi1iYXNlZCBVUkxzIGluc3RlYWQgb2YgZGlyZWN0IGZpbGUgcGF0aHNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IFNlY3VyaXR5IC0gaGlkZXMgYWN0dWFsIGZpbGUgcGF0aHMgZnJvbSB1c2VyXG4gICAgICAgICAgICAgICAgLy8gVHdvIHNlcGFyYXRlIGVuZHBvaW50czogOnBsYXliYWNrIChpbmxpbmUpIGFuZCA6ZG93bmxvYWQgKGZpbGUpXG4gICAgICAgICAgICAgICAgY29uc3QgcGxheWJhY2tVcmwgPSByZWNvcmQucGxheWJhY2tfdXJsIHx8ICcnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRvd25sb2FkVXJsID0gcmVjb3JkLmRvd25sb2FkX3VybCB8fCAnJztcblxuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvd1wiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCIke3BsYXliYWNrVXJsfVwiPjwvYXVkaW8+XG5cdDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwiZml2ZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiIGRhdGEtdmFsdWU9XCIke3JlY29yZC5pZH1cIj48L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIGNvbXBhY3QgaWNvbiB0b3AgbGVmdCBwb2ludGluZyBkcm9wZG93biBkb3dubG9hZC1mb3JtYXQtZHJvcGRvd25cIiBkYXRhLWRvd25sb2FkLXVybD1cIiR7ZG93bmxvYWRVcmx9XCI+XG4gICAgXHRcdDxpIGNsYXNzPVwiZG93bmxvYWQgaWNvblwiPjwvaT5cbiAgICBcdFx0PGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICBcdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtZm9ybWF0PVwid2VibVwiPldlYk0gKE9wdXMpPC9kaXY+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIm1wM1wiPk1QMzwvZGl2PlxuICAgIFx0XHRcdDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1mb3JtYXQ9XCJ3YXZcIj5XQVY8L2Rpdj5cbiAgICBcdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtZm9ybWF0PVwib2dnXCI+T0dHIChPcHVzKTwvZGl2PlxuICAgIFx0XHQ8L2Rpdj5cbiAgICBcdDwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaHRtbFBsYXllciArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgICAgIHJldHVybiBodG1sUGxheWVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBwYWdlIGxlbmd0aCBmb3IgRGF0YVRhYmxlLCBjb25zaWRlcmluZyB1c2VyJ3Mgc2F2ZWQgcHJlZmVyZW5jZVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0UGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3Mgc2F2ZWQgdmFsdWUgb3IgdXNlIHRoZSBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgdmFsdWUgaWYgbm9uZSBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICByZXR1cm4gc2F2ZWRQYWdlTGVuZ3RoID8gcGFyc2VJbnQoc2F2ZWRQYWdlTGVuZ3RoLCAxMCkgOiBjYWxsRGV0YWlsUmVjb3Jkcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiByb3dzIHRoYXQgY2FuIGZpdCBvbiBhIHBhZ2UgYmFzZWQgb24gdGhlIGN1cnJlbnQgd2luZG93IGhlaWdodC5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZmluZCgndGJvZHkgPiB0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDQwMDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDUpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IuXG4gICAgICogQHBhcmFtIHttb21lbnR9IHN0YXJ0RGF0ZSAtIE9wdGlvbmFsIGVhcmxpZXN0IHJlY29yZCBkYXRlIGZyb20gbGFzdCAxMDAgcmVjb3Jkc1xuICAgICAqIEBwYXJhbSB7bW9tZW50fSBlbmREYXRlIC0gT3B0aW9uYWwgbGF0ZXN0IHJlY29yZCBkYXRlIGZyb20gbGFzdCAxMDAgcmVjb3Jkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcihzdGFydERhdGUgPSBudWxsLCBlbmREYXRlID0gbnVsbCkge1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge307XG5cbiAgICAgICAgb3B0aW9ucy5yYW5nZXMgPSB7XG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9Ub2RheV06IFttb21lbnQoKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfWWVzdGVyZGF5XTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdFdlZWtdOiBbbW9tZW50KCkuc3VidHJhY3QoNiwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdDMwRGF5c106IFttb21lbnQoKS5zdWJ0cmFjdCgyOSwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVGhpc01vbnRoXTogW21vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLmVuZE9mKCdtb250aCcpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RNb250aF06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgIH07XG4gICAgICAgIG9wdGlvbnMuYWx3YXlzU2hvd0NhbGVuZGFycyA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMuYXV0b1VwZGF0ZUlucHV0ID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5saW5rZWRDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLm1heERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgb3B0aW9ucy5sb2NhbGUgPSB7XG4gICAgICAgICAgICBmb3JtYXQ6ICdERC9NTS9ZWVlZJyxcbiAgICAgICAgICAgIHNlcGFyYXRvcjogJyAtICcsXG4gICAgICAgICAgICBhcHBseUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0FwcGx5QnRuLFxuICAgICAgICAgICAgY2FuY2VsTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ2FuY2VsQnRuLFxuICAgICAgICAgICAgZnJvbUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX2Zyb20sXG4gICAgICAgICAgICB0b0xhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX3RvLFxuICAgICAgICAgICAgY3VzdG9tUmFuZ2VMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9DdXN0b21QZXJpb2QsXG4gICAgICAgICAgICBkYXlzT2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQuZGF5cyxcbiAgICAgICAgICAgIG1vbnRoTmFtZXM6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5tb250aHMsXG4gICAgICAgICAgICBmaXJzdERheTogMSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGRhdGUgcmFuZ2UgZnJvbSBsYXN0IDEwMCByZWNvcmRzLCB1c2UgaXRcbiAgICAgICAgLy8gV0hZOiBQcm92aWRlcyBtZWFuaW5nZnVsIGNvbnRleHQgLSB1c2VyIHNlZXMgcGVyaW9kIGNvdmVyaW5nIHJlY2VudCBjYWxsc1xuICAgICAgICBpZiAoc3RhcnREYXRlICYmIGVuZERhdGUpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KHN0YXJ0RGF0ZSkuc3RhcnRPZignZGF5Jyk7XG4gICAgICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBtb21lbnQoZW5kRGF0ZSkuZW5kT2YoJ2RheScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gdG9kYXkgaWYgbm8gcmVjb3Jkc1xuICAgICAgICAgICAgb3B0aW9ucy5zdGFydERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIG9wdGlvbnMuZW5kRGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGVyYW5nZXBpY2tlcihcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QsXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gTm90ZTogRG9uJ3QgY2FsbCBhcHBseUZpbHRlciBoZXJlIC0gRGF0YVRhYmxlIGlzIG5vdCBpbml0aWFsaXplZCB5ZXRcbiAgICAgICAgLy8gRGF0YVRhYmxlIHdpbGwgbG9hZCBkYXRhIGF1dG9tYXRpY2FsbHkgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIHNlbGVjdCBldmVudC5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IHN0YXJ0IC0gVGhlIHN0YXJ0IGRhdGUuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBlbmQgLSBUaGUgZW5kIGRhdGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGxhYmVsIC0gVGhlIGxhYmVsLlxuICAgICAqL1xuICAgIGNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdChzdGFydCwgZW5kLCBsYWJlbCkge1xuICAgICAgICAvLyBPbmx5IHBhc3Mgc2VhcmNoIGtleXdvcmQsIGRhdGVzIGFyZSByZWFkIGRpcmVjdGx5IGZyb20gZGF0ZSByYW5nZSBzZWxlY3RvclxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcihjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpKTtcbiAgICAgICAgLy8gU3RhdGUgd2lsbCBiZSBzYXZlZCBhdXRvbWF0aWNhbGx5IGluIGRyYXcgZXZlbnQgYWZ0ZXIgZmlsdGVyIGlzIGFwcGxpZWRcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZmlsdGVyIHRvIHRoZSBkYXRhIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIGZpbHRlciB0ZXh0LlxuICAgICAqL1xuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBDRFIgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19