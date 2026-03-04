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
   * Dynamically measures the actual overhead from DOM elements instead of using a hardcoded estimate.
   * @returns {number}
   */
  calculatePageLength: function calculatePageLength() {
    // Measure actual row height from rendered row, fallback to compact table default (~36px)
    var rowHeight = callDetailRecords.$cdrTable.find('tbody > tr').first().outerHeight() || 36; // Calculate overhead dynamically from the table's position in the page

    var windowHeight = window.innerHeight;
    var overhead = 400; // safe fallback

    var tableEl = callDetailRecords.$cdrTable.get(0);

    if (tableEl) {
      var thead = callDetailRecords.$cdrTable.find('thead');
      var theadHeight = thead.length ? thead.outerHeight() : 38;
      var tableTop = tableEl.getBoundingClientRect().top; // Space below: pagination(50) + info bar(30) + segment padding(14) + version footer(35) + margins(10)

      var bottomReserve = 139;
      overhead = tableTop + theadHeight + bottomReserve;
    }

    return Math.max(Math.floor((windowHeight - overhead) / rowHeight), 5);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCIkc2VhcmNoQ0RSSW5wdXQiLCIkcGFnZUxlbmd0aFNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImhhc0NEUlJlY29yZHMiLCIkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiU1RPUkFHRV9LRVkiLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImdsb2JhbFJvb3RVcmwiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiY2xlYXJGaWx0ZXJzU3RhdGUiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwicmVsb2FkIiwiZmV0Y2hMYXRlc3RDRFJEYXRlIiwic2F2ZUZpbHRlcnNTdGF0ZSIsInNlc3Npb25TdG9yYWdlIiwiY29uc29sZSIsIndhcm4iLCJzdGF0ZSIsImRhdGVGcm9tIiwiZGF0ZVRvIiwic2VhcmNoVGV4dCIsImN1cnJlbnRQYWdlIiwicGFnZUxlbmd0aCIsImdldFBhZ2VMZW5ndGgiLCJkYXRlUmFuZ2VQaWNrZXIiLCJkYXRhIiwic3RhcnREYXRlIiwiZW5kRGF0ZSIsImZvcm1hdCIsInZhbCIsInBhZ2UiLCJwYWdlSW5mbyIsImluZm8iLCJzZXRJdGVtIiwiSlNPTiIsInN0cmluZ2lmeSIsImVycm9yIiwibG9hZEZpbHRlcnNTdGF0ZSIsInJhd0RhdGEiLCJnZXRJdGVtIiwicGFyc2UiLCJpbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMiLCJzZWFyY2hEZWJvdW5jZVRpbWVyIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImtleUNvZGUiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJjYW5EZWxldGUiLCJBQ0xIZWxwZXIiLCJpc0FsbG93ZWQiLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwicHVzaCIsInNlYXJjaCIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiY29sdW1uRGVmcyIsImRlZmF1bHRDb250ZW50IiwidGFyZ2V0cyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInBhcmFtcyIsImlzTGlua2VkSWRTZWFyY2giLCJpc1ZhbGlkIiwiZW5kT2YiLCJzZWFyY2hLZXl3b3JkIiwidmFsdWUiLCJ0cmltIiwia2V5d29yZCIsInN0YXJ0c1dpdGgiLCJzcmNfbnVtIiwic3Vic3RyaW5nIiwiZHN0X251bSIsImRpZCIsImxpbmtlZGlkIiwibGltaXQiLCJvZmZzZXQiLCJzdGFydCIsInNvcnQiLCJvcmRlciIsImdyb3VwZWQiLCJkYXRhU3JjIiwianNvbiIsInJlc3VsdCIsInJlc3REYXRhIiwicmVjb3JkcyIsInBhZ2luYXRpb24iLCJyZWNvcmRzVG90YWwiLCJ0b3RhbCIsInJlY29yZHNGaWx0ZXJlZCIsInRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZSIsImJlZm9yZVNlbmQiLCJ4aHIiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsInNldFJlcXVlc3RIZWFkZXIiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZW1wdHlUYWJsZSIsImdldEVtcHR5VGFibGVNZXNzYWdlIiwiemVyb1JlY29yZHMiLCJjcmVhdGVkUm93Iiwicm93IiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiYWRkQ2xhc3MiLCJhY3Rpb25zSHRtbCIsImNhblZpZXdMb2dzIiwiaWRzIiwiRFRfUm93SWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZHJfRGVsZXRlUmVjb3JkIiwiZHJhd0NhbGxiYWNrIiwiRXh0ZW5zaW9uc0FQSSIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsInRvZ2dsZVBhZ2luYXRpb25Db250cm9scyIsImluaXRDb21wbGV0ZSIsInJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJtaW5DaGFyYWN0ZXJzIiwic2VhcmNoT25Gb2N1cyIsInNlYXJjaEZpZWxkcyIsInNob3dOb1Jlc3VsdHMiLCJzb3VyY2UiLCJ0aXRsZSIsImNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciIsImNkcl9TZWFyY2hCeURlc3ROdW1iZXIiLCJjZHJfU2VhcmNoQnlESUQiLCJjZHJfU2VhcmNoQnlMaW5rZWRJRCIsImNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzcG9uc2UiLCJmb2N1cyIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibGVuIiwiZHJhdyIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwic2F2ZWRQYWdlTGVuZ3RoIiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmRlZmluZWQiLCJlbmNvZGVVUklDb21wb25lbnQiLCJvcGVuIiwidHIiLCJ0YXJnZXQiLCJjaGlsZCIsImlzU2hvd24iLCJoaWRlIiwic2hvd1JlY29yZHMiLCJzaG93IiwiZmluZCIsImVhY2giLCJpbmRleCIsInBsYXllclJvdyIsImlkIiwiQ0RSUGxheWVyIiwiJGJ1dHRvbiIsInJlY29yZElkIiwiZGVsZXRlUmVjb3JkIiwic2F2ZWRTdGF0ZSIsIkNkckFQSSIsImRlbGV0ZVJlY29yZGluZyIsImVycm9yTXNnIiwibWVzc2FnZXMiLCJjZHJfRGVsZXRlRmFpbGVkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJwYWdlcyIsInRhYmxlIiwiY29udGFpbmVyIiwiZ2V0TWV0YWRhdGEiLCJoYXNSZWNvcmRzIiwibW9tZW50IiwiZWFybGllc3REYXRlIiwibGF0ZXN0RGF0ZSIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsInNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIiLCJjZHJfRmlsdGVyZWRFbXB0eVRpdGxlIiwiY2RyX0ZpbHRlcmVkRW1wdHlEZXNjcmlwdGlvbiIsIm1hcCIsImdyb3VwIiwiYmlsbHNlYyIsInRvdGFsQmlsbHNlYyIsInRpbWVGb3JtYXQiLCJ0aW1pbmciLCJ1dGMiLCJmb3JtYXR0ZWREYXRlIiwicmVjb3JkaW5ncyIsImZpbHRlciIsInIiLCJyZWNvcmRpbmdmaWxlIiwicGxheWJhY2tfdXJsIiwiZG93bmxvYWRfdXJsIiwiaGFzUmVjb3JkaW5ncyIsImlzQW5zd2VyZWQiLCJkaXNwb3NpdGlvbiIsImR0Um93Q2xhc3MiLCJuZWdhdGl2ZUNsYXNzIiwiU2V0IiwidmVyYm9zZV9jYWxsX2lkIiwiam9pbiIsImh0bWxQbGF5ZXIiLCJmb3JFYWNoIiwicmVjb3JkIiwiaSIsInBsYXliYWNrVXJsIiwiZG93bmxvYWRVcmwiLCJwYXJzZUludCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsIm92ZXJoZWFkIiwidGFibGVFbCIsImdldCIsInRoZWFkIiwidGhlYWRIZWlnaHQiLCJ0YWJsZVRvcCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsInRvcCIsImJvdHRvbVJlc2VydmUiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJvcHRpb25zIiwicmFuZ2VzIiwiY2FsX1RvZGF5IiwiY2FsX1llc3RlcmRheSIsInN1YnRyYWN0IiwiY2FsX0xhc3RXZWVrIiwiY2FsX0xhc3QzMERheXMiLCJjYWxfVGhpc01vbnRoIiwic3RhcnRPZiIsImNhbF9MYXN0TW9udGgiLCJhbHdheXNTaG93Q2FsZW5kYXJzIiwiYXV0b1VwZGF0ZUlucHV0IiwibGlua2VkQ2FsZW5kYXJzIiwibWF4RGF0ZSIsImxvY2FsZSIsInNlcGFyYXRvciIsImFwcGx5TGFiZWwiLCJjYWxfQXBwbHlCdG4iLCJjYW5jZWxMYWJlbCIsImNhbF9DYW5jZWxCdG4iLCJmcm9tTGFiZWwiLCJjYWxfZnJvbSIsInRvTGFiZWwiLCJjYWxfdG8iLCJjdXN0b21SYW5nZUxhYmVsIiwiY2FsX0N1c3RvbVBlcmlvZCIsImRheXNPZldlZWsiLCJjYWxlbmRhclRleHQiLCJkYXlzIiwibW9udGhOYW1lcyIsIm1vbnRocyIsImZpcnN0RGF5IiwiZGF0ZXJhbmdlcGlja2VyIiwiY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0IiwiZW5kIiwibGFiZWwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFDLFlBQUQsQ0FMVTs7QUFPdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsZUFBRCxDQVhNOztBQWF0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxrQkFBa0IsRUFBRUYsQ0FBQyxDQUFDLHNCQUFELENBakJDOztBQW1CdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsZUFBZSxFQUFFSCxDQUFDLENBQUMsbUJBQUQsQ0F2Qkk7O0FBeUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxtQkFBbUIsRUFBRUosQ0FBQyxDQUFDLHFCQUFELENBN0JBOztBQStCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsU0FBUyxFQUFFLEVBbkNXOztBQXFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLEVBekNhOztBQTJDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLElBL0NPOztBQWlEdEI7QUFDSjtBQUNB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dGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEV4dGVuc2lvbnNBUEksIG1vbWVudCwgZ2xvYmFsVHJhbnNsYXRlLCBDRFJQbGF5ZXIsIENkckFQSSwgVXNlck1lc3NhZ2UsIEFDTEhlbHBlciAqL1xuXG4vKipcbiAqIGNhbGxEZXRhaWxSZWNvcmRzIG1vZHVsZS5cbiAqIEBtb2R1bGUgY2FsbERldGFpbFJlY29yZHNcbiAqL1xuY29uc3QgY2FsbERldGFpbFJlY29yZHMgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIGNhbGwgZGV0YWlsIHJlY29yZHMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjZHJUYWJsZTogJCgnI2Nkci10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWxzZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGF0ZVJhbmdlU2VsZWN0b3I6ICQoJyNkYXRlLXJhbmdlLXNlbGVjdG9yJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2VhcmNoIENEUiBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlYXJjaENEUklucHV0OiAkKCcjc2VhcmNoLWNkci1pbnB1dCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhZ2VMZW5ndGhTZWxlY3RvcjogJCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9mIHBsYXllcnMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHBsYXllcnM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIENEUiBkYXRhYmFzZSBoYXMgYW55IHJlY29yZHNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBoYXNDRFJSZWNvcmRzOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGVtcHR5IGRhdGFiYXNlIHBsYWNlaG9sZGVyIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXI6ICQoJyNjZHItZW1wdHktZGF0YWJhc2UtcGxhY2Vob2xkZXInKSxcblxuICAgIC8qKlxuICAgICAqIFN0b3JhZ2Uga2V5IGZvciBmaWx0ZXIgc3RhdGUgaW4gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIFNUT1JBR0VfS0VZOiAnY2RyX2ZpbHRlcnNfc3RhdGUnLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byB0cmFjayBpZiBEYXRhVGFibGUgaGFzIGNvbXBsZXRlZCBpbml0aWFsaXphdGlvblxuICAgICAqIFdIWTogUHJldmVudHMgc2F2aW5nIHN0YXRlIGR1cmluZyBpbml0aWFsIGxvYWQgYmVmb3JlIGZpbHRlcnMgYXJlIHJlc3RvcmVkXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgY2FsbCBkZXRhaWwgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBMaXN0ZW4gZm9yIGhhc2ggY2hhbmdlcyAod2hlbiB1c2VyIGNsaWNrcyBtZW51IGxpbmsgd2hpbGUgYWxyZWFkeSBvbiBwYWdlKVxuICAgICAgICAvLyBXSFk6IEJyb3dzZXIgZG9lc24ndCByZWxvYWQgcGFnZSBvbiBoYXNoLW9ubHkgVVJMIGNoYW5nZXNcbiAgICAgICAgJChgYVtocmVmPScke2dsb2JhbFJvb3RVcmx9Y2FsbC1kZXRhaWwtcmVjb3Jkcy9pbmRleC8jcmVzZXQtY2FjaGUnXWApLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAvLyBSZW1vdmUgaGFzaCBmcm9tIFVSTCB3aXRob3V0IHBhZ2UgcmVsb2FkXG4gICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUobnVsbCwgbnVsbCwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNsZWFyRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgICAgICAgLy8gQWxzbyBjbGVhciBwYWdlIGxlbmd0aCBwcmVmZXJlbmNlXG4gICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICAgICAgIC8vIFJlbG9hZCBwYWdlIHRvIGFwcGx5IHJlc2V0XG4gICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBGZXRjaCBtZXRhZGF0YSBmaXJzdCwgdGhlbiBpbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIHByb3BlciBkYXRlIHJhbmdlXG4gICAgICAgIC8vIFdIWTogUHJldmVudHMgZG91YmxlIHJlcXVlc3Qgb24gcGFnZSBsb2FkXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmZldGNoTGF0ZXN0Q0RSRGF0ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlIGN1cnJlbnQgZmlsdGVyIHN0YXRlIHRvIHNlc3Npb25TdG9yYWdlXG4gICAgICogU3RvcmVzIGRhdGUgcmFuZ2UsIHNlYXJjaCB0ZXh0LCBjdXJyZW50IHBhZ2UsIGFuZCBwYWdlIGxlbmd0aFxuICAgICAqL1xuICAgIHNhdmVGaWx0ZXJzU3RhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBGZWF0dXJlIGRldGVjdGlvbiAtIGV4aXQgc2lsZW50bHkgaWYgc2Vzc2lvblN0b3JhZ2Ugbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZXNzaW9uU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tDRFJdIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN0YXRlID0ge1xuICAgICAgICAgICAgICAgIGRhdGVGcm9tOiBudWxsLFxuICAgICAgICAgICAgICAgIGRhdGVUbzogbnVsbCxcbiAgICAgICAgICAgICAgICBzZWFyY2hUZXh0OiAnJyxcbiAgICAgICAgICAgICAgICBjdXJyZW50UGFnZTogMCxcbiAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRQYWdlTGVuZ3RoKClcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEdldCBkYXRlcyBmcm9tIGRhdGVyYW5nZXBpY2tlciBpbnN0YW5jZVxuICAgICAgICAgICAgY29uc3QgZGF0ZVJhbmdlUGlja2VyID0gY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGEoJ2RhdGVyYW5nZXBpY2tlcicpO1xuICAgICAgICAgICAgaWYgKGRhdGVSYW5nZVBpY2tlciAmJiBkYXRlUmFuZ2VQaWNrZXIuc3RhcnREYXRlICYmIGRhdGVSYW5nZVBpY2tlci5lbmREYXRlKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuZGF0ZUZyb20gPSBkYXRlUmFuZ2VQaWNrZXIuc3RhcnREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmRhdGVUbyA9IGRhdGVSYW5nZVBpY2tlci5lbmREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBHZXQgc2VhcmNoIHRleHQgZnJvbSBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgc3RhdGUuc2VhcmNoVGV4dCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCkgfHwgJyc7XG5cbiAgICAgICAgICAgIC8vIEdldCBjdXJyZW50IHBhZ2UgZnJvbSBEYXRhVGFibGUgKGlmIGluaXRpYWxpemVkKVxuICAgICAgICAgICAgaWYgKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZSAmJiBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2VJbmZvID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UuaW5mbygpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmN1cnJlbnRQYWdlID0gcGFnZUluZm8ucGFnZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShjYWxsRGV0YWlsUmVjb3Jkcy5TVE9SQUdFX0tFWSwgSlNPTi5zdHJpbmdpZnkoc3RhdGUpKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tDRFJdIEZhaWxlZCB0byBzYXZlIGZpbHRlcnMgdG8gc2Vzc2lvblN0b3JhZ2U6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZmlsdGVyIHN0YXRlIGZyb20gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fG51bGx9IFNhdmVkIHN0YXRlIG9iamVjdCBvciBudWxsIGlmIG5vdCBmb3VuZC9pbnZhbGlkXG4gICAgICovXG4gICAgbG9hZEZpbHRlcnNTdGF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEZlYXR1cmUgZGV0ZWN0aW9uIC0gcmV0dXJuIG51bGwgaWYgc2Vzc2lvblN0b3JhZ2Ugbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZXNzaW9uU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tDRFJdIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGUgZm9yIGxvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmF3RGF0YSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oY2FsbERldGFpbFJlY29yZHMuU1RPUkFHRV9LRVkpO1xuICAgICAgICAgICAgaWYgKCFyYXdEYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN0YXRlID0gSlNPTi5wYXJzZShyYXdEYXRhKTtcblxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgc3RhdGUgc3RydWN0dXJlXG4gICAgICAgICAgICBpZiAoIXN0YXRlIHx8IHR5cGVvZiBzdGF0ZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jbGVhckZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbQ0RSXSBGYWlsZWQgdG8gbG9hZCBmaWx0ZXJzIGZyb20gc2Vzc2lvblN0b3JhZ2U6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY29ycnVwdGVkIGRhdGFcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNsZWFyRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhciBzYXZlZCBmaWx0ZXIgc3RhdGUgZnJvbSBzZXNzaW9uU3RvcmFnZVxuICAgICAqL1xuICAgIGNsZWFyRmlsdGVyc1N0YXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZXNzaW9uU3RvcmFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGNhbGxEZXRhaWxSZWNvcmRzLlNUT1JBR0VfS0VZKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBjbGVhciBDRFIgZmlsdGVycyBmcm9tIHNlc3Npb25TdG9yYWdlOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSBhbmQgZXZlbnQgaGFuZGxlcnNcbiAgICAgKiBDYWxsZWQgYWZ0ZXIgbWV0YWRhdGEgaXMgcmVjZWl2ZWRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVib3VuY2UgdGltZXIgdmFyaWFibGVcbiAgICAgICAgbGV0IHNlYXJjaERlYm91bmNlVGltZXIgPSBudWxsO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVyIGlmIHRoZSB1c2VyIGlzIHN0aWxsIHR5cGluZ1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNlYXJjaERlYm91bmNlVGltZXIpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgZm9yIGRlbGF5ZWQgZXhlY3V0aW9uXG4gICAgICAgICAgICBzZWFyY2hEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTNcbiAgICAgICAgICAgICAgICAgICAgfHwgZS5rZXlDb2RlID09PSA4XG4gICAgICAgICAgICAgICAgICAgIHx8IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgcGFzcyB0aGUgc2VhcmNoIGtleXdvcmQsIGRhdGVzIGFyZSBoYW5kbGVkIHNlcGFyYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7IC8vIDUwMG1zIGRlbGF5IGJlZm9yZSBleGVjdXRpbmcgdGhlIHNlYXJjaFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCdWlsZCBjb2x1bW5zIGR5bmFtaWNhbGx5IGJhc2VkIG9uIEFDTCBwZXJtaXNzaW9uc1xuICAgICAgICAvLyBXSFk6IFZvbHQgdGVtcGxhdGUgY29uZGl0aW9uYWxseSByZW5kZXJzIGRlbGV0ZSBjb2x1bW4gaGVhZGVyIGJhc2VkIG9uIGlzQWxsb3dlZCgnc2F2ZScpXG4gICAgICAgIC8vICdzYXZlJyBpcyBhIHZpcnR1YWwgcGVybWlzc2lvbiB0aGF0IGluY2x1ZGVzIGRlbGV0ZSBjYXBhYmlsaXR5IGluIE1vZHVsZVVzZXJzVUlcbiAgICAgICAgLy8gSWYgY29sdW1ucyBjb25maWcgZG9lc24ndCBtYXRjaCA8dGhlYWQ+IGNvdW50LCBEYXRhVGFibGVzIHRocm93cyAnc3R5bGUnIHVuZGVmaW5lZCBlcnJvclxuICAgICAgICBjb25zdCBjYW5EZWxldGUgPSB0eXBlb2YgQUNMSGVscGVyICE9PSAndW5kZWZpbmVkJyAmJiBBQ0xIZWxwZXIuaXNBbGxvd2VkKCdzYXZlJyk7XG4gICAgICAgIGNvbnN0IGNvbHVtbnMgPSBbXG4gICAgICAgICAgICB7IGRhdGE6IG51bGwsIG9yZGVyYWJsZTogZmFsc2UgfSwgIC8vIDA6IGV4cGFuZCBpY29uIGNvbHVtblxuICAgICAgICAgICAgeyBkYXRhOiAwIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAxOiBkYXRlIChhcnJheSBpbmRleCAwKVxuICAgICAgICAgICAgeyBkYXRhOiAxIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAyOiBzcmNfbnVtIChhcnJheSBpbmRleCAxKVxuICAgICAgICAgICAgeyBkYXRhOiAyIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAzOiBkc3RfbnVtIChhcnJheSBpbmRleCAyKVxuICAgICAgICAgICAgeyBkYXRhOiAzIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyA0OiBkdXJhdGlvbiAoYXJyYXkgaW5kZXggMylcbiAgICAgICAgXTtcbiAgICAgICAgaWYgKGNhbkRlbGV0ZSkge1xuICAgICAgICAgICAgY29sdW1ucy5wdXNoKHsgZGF0YTogbnVsbCwgb3JkZXJhYmxlOiBmYWxzZSB9KTsgIC8vIDU6IGFjdGlvbnMgY29sdW1uIChsb2dzIGljb24gKyBkZWxldGUpXG4gICAgICAgIH1cblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZGF0YVRhYmxlKHtcbiAgICAgICAgICAgIHNlYXJjaDoge1xuICAgICAgICAgICAgICAgIHNlYXJjaDogY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXJ2ZXJTaWRlOiB0cnVlLFxuICAgICAgICAgICAgcHJvY2Vzc2luZzogdHJ1ZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IGNvbHVtbnMsXG4gICAgICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAgICAgICAgeyBkZWZhdWx0Q29udGVudDogXCItXCIsICB0YXJnZXRzOiBcIl9hbGxcIn0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9jZHInLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdHRVQnLCAgLy8gUkVTVCBBUEkgdXNlcyBHRVQgZm9yIGxpc3QgcmV0cmlldmFsXG4gICAgICAgICAgICAgICAgZGF0YTogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGlzTGlua2VkSWRTZWFyY2ggPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyAxLiBBbHdheXMgZ2V0IGRhdGVzIGZyb20gZGF0ZSByYW5nZSBzZWxlY3RvciB1c2luZyBkYXRlcmFuZ2VwaWNrZXIgQVBJXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVSYW5nZVBpY2tlciA9IGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRhKCdkYXRlcmFuZ2VwaWNrZXInKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGVSYW5nZVBpY2tlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuZERhdGUgPSBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0RGF0ZSAmJiBzdGFydERhdGUuaXNWYWxpZCgpICYmIGVuZERhdGUgJiYgZW5kRGF0ZS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZGF0ZUZyb20gPSBzdGFydERhdGUuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRhdGVUbyA9IGVuZERhdGUuZW5kT2YoJ2RheScpLmZvcm1hdCgnWVlZWS1NTS1ERCBISDptbTpzcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gMi4gUHJvY2VzcyBzZWFyY2gga2V5d29yZCBmcm9tIHNlYXJjaCBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hLZXl3b3JkID0gZC5zZWFyY2gudmFsdWUgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlYXJjaEtleXdvcmQudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXl3b3JkID0gc2VhcmNoS2V5d29yZC50cmltKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHNlYXJjaCBwcmVmaXhlczogc3JjOiwgZHN0OiwgZGlkOiwgbGlua2VkaWQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdzcmM6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgc291cmNlIG51bWJlciBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNyY19udW0gPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnZHN0OicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IGRlc3RpbmF0aW9uIG51bWJlciBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRzdF9udW0gPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnZGlkOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IERJRCBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRpZCA9IGtleXdvcmQuc3Vic3RyaW5nKDQpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdsaW5rZWRpZDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBsaW5rZWRpZCAtIGlnbm9yZSBkYXRlIHJhbmdlIGZvciBsaW5rZWRpZCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMubGlua2VkaWQgPSBrZXl3b3JkLnN1YnN0cmluZyg5KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNMaW5rZWRJZFNlYXJjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRhdGUgcGFyYW1zIGZvciBsaW5rZWRpZCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcGFyYW1zLmRhdGVGcm9tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJhbXMuZGF0ZVRvO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGdWxsLXRleHQgc2VhcmNoOiBzZWFyY2ggaW4gc3JjX251bSwgZHN0X251bSwgYW5kIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlciBleHBlY3RzIHNlYXJjaCB3aXRob3V0IHByZWZpeCB0byBmaW5kIG51bWJlciBhbnl3aGVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zZWFyY2ggPSBrZXl3b3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUkVTVCBBUEkgcGFnaW5hdGlvbiBwYXJhbWV0ZXJzXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5saW1pdCA9IGQubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMub2Zmc2V0ID0gZC5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNvcnQgPSAnc3RhcnQnOyAgLy8gU29ydCBieSBjYWxsIHN0YXJ0IHRpbWUgZm9yIGNocm9ub2xvZ2ljYWwgb3JkZXJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9yZGVyID0gJ0RFU0MnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFdIWTogV2ViVUkgYWx3YXlzIG5lZWRzIGdyb3VwZWQgcmVjb3JkcyAoYnkgbGlua2VkaWQpIGZvciBwcm9wZXIgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICAvLyBCYWNrZW5kIGRlZmF1bHRzIHRvIGdyb3VwZWQ9dHJ1ZSwgYnV0IGV4cGxpY2l0IGlzIGJldHRlciB0aGFuIGltcGxpY2l0XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5ncm91cGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVNyYzogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBUEkgcmV0dXJucyBQQlhBcGlSZXN1bHQgc3RydWN0dXJlOlxuICAgICAgICAgICAgICAgICAgICAvLyB7cmVzdWx0OiB0cnVlLCBkYXRhOiB7cmVjb3JkczogWy4uLl0sIHBhZ2luYXRpb246IHsuLi59fX1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGpzb24ucmVzdWx0ICYmIGpzb24uZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXh0cmFjdCByZWNvcmRzIGFuZCBwYWdpbmF0aW9uIGZyb20gbmVzdGVkIGRhdGEgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN0RGF0YSA9IGpzb24uZGF0YS5yZWNvcmRzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFnaW5hdGlvbiA9IGpzb24uZGF0YS5wYWdpbmF0aW9uIHx8IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgRGF0YVRhYmxlcyBwYWdpbmF0aW9uIHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc1RvdGFsID0gcGFnaW5hdGlvbi50b3RhbCB8fCAwO1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzRmlsdGVyZWQgPSBwYWdpbmF0aW9uLnRvdGFsIHx8IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyYW5zZm9ybSBSRVNUIHJlY29yZHMgdG8gRGF0YVRhYmxlIHJvd3NcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsRGV0YWlsUmVjb3Jkcy50cmFuc2Zvcm1SZXN0VG9EYXRhVGFibGUocmVzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgQmVhcmVyIHRva2VuIGZvciBBUEkgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIC8vc2Nyb2xsWTogJCh3aW5kb3cpLmhlaWdodCgpIC0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9mZnNldCgpLnRvcC0xNTAsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IGNhbGxEZXRhaWxSZWNvcmRzLmdldFBhZ2VMZW5ndGgoKSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiB7XG4gICAgICAgICAgICAgICAgLi4uU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgICAgIGVtcHR5VGFibGU6IGNhbGxEZXRhaWxSZWNvcmRzLmdldEVtcHR5VGFibGVNZXNzYWdlKCksXG4gICAgICAgICAgICAgICAgemVyb1JlY29yZHM6IGNhbGxEZXRhaWxSZWNvcmRzLmdldEVtcHR5VGFibGVNZXNzYWdlKClcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyB0aGUgQ0RSIHJvdy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuRFRfUm93Q2xhc3MuaW5kZXhPZihcImRldGFpbGVkXCIpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBjYXJldCBkb3duXCI+PC9pPicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDEpLmh0bWwoZGF0YVswXSk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGRhdGFbMV0pXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoZGF0YVsyXSlcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuXG4gICAgICAgICAgICAgICAgLy8gRHVyYXRpb24gY29sdW1uIChubyBpY29ucylcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNCkuaHRtbChkYXRhWzNdKS5hZGRDbGFzcygncmlnaHQgYWxpZ25lZCcpO1xuXG4gICAgICAgICAgICAgICAgLy8gQWN0aW9ucyBjb2x1bW46IG9ubHkgcmVuZGVyIGlmIHVzZXIgaGFzIGRlbGV0ZSBwZXJtaXNzaW9uXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBWb2x0IHRlbXBsYXRlIGNvbmRpdGlvbmFsbHkgcmVuZGVycyB0aGlzIGNvbHVtbiBiYXNlZCBvbiBpc0FsbG93ZWQoJ2RlbGV0ZScpXG4gICAgICAgICAgICAgICAgaWYgKCFjYW5EZWxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIExhc3QgY29sdW1uOiBsb2cgaWNvbiArIGRlbGV0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBsZXQgYWN0aW9uc0h0bWwgPSAnJztcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBsb2cgaWNvbiBpZiB1c2VyIGhhcyBhY2Nlc3MgdG8gU3lzdGVtIERpYWdub3N0aWNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IExvZyBpY29uIGxpbmtzIHRvIHN5c3RlbS1kaWFnbm9zdGljIHBhZ2Ugd2hpY2ggcmVxdWlyZXMgc3BlY2lmaWMgcGVybWlzc2lvbnNcbiAgICAgICAgICAgICAgICBjb25zdCBjYW5WaWV3TG9ncyA9IHR5cGVvZiBBQ0xIZWxwZXIgIT09ICd1bmRlZmluZWQnICYmIEFDTEhlbHBlci5pc0FsbG93ZWQoJ3ZpZXdTeXN0ZW1EaWFnbm9zdGljJyk7XG4gICAgICAgICAgICAgICAgaWYgKGNhblZpZXdMb2dzICYmIGRhdGEuaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25zSHRtbCArPSBgPGkgZGF0YS1pZHM9XCIke2RhdGEuaWRzfVwiIGNsYXNzPVwiZmlsZSBhbHRlcm5hdGUgb3V0bGluZSBpY29uXCIgc3R5bGU9XCJjdXJzb3I6IHBvaW50ZXI7IG1hcmdpbi1yaWdodDogOHB4O1wiPjwvaT5gO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFkZCBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBVc2UgdHdvLXN0ZXBzLWRlbGV0ZSBtZWNoYW5pc20gdG8gcHJldmVudCBhY2NpZGVudGFsIGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgLy8gRmlyc3QgY2xpY2sgY2hhbmdlcyB0cmFzaCBpY29uIHRvIGNsb3NlIGljb24sIHNlY29uZCBjbGljayBkZWxldGVzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBVc2UgZGF0YS5EVF9Sb3dJZCB3aGljaCBjb250YWlucyBsaW5rZWRpZCBmb3IgZ3JvdXBlZCByZWNvcmRzXG4gICAgICAgICAgICAgICAgYWN0aW9uc0h0bWwgKz0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ0d28tc3RlcHMtZGVsZXRlIGRlbGV0ZS1yZWNvcmQgcG9wdXBlZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcmVjb3JkLWlkPVwiJHtkYXRhLkRUX1Jvd0lkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9EZWxldGVSZWNvcmQgfHwgJ0RlbGV0ZSByZWNvcmQnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCIgc3R5bGU9XCJtYXJnaW46IDA7XCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+YDtcblxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSg1KS5odG1sKGFjdGlvbnNIdG1sKS5hZGRDbGFzcygncmlnaHQgYWxpZ25lZCcpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEcmF3IGV2ZW50IC0gZmlyZWQgb25jZSB0aGUgdGFibGUgaGFzIGNvbXBsZXRlZCBhIGRyYXcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy50b2dnbGVQYWdpbmF0aW9uQ29udHJvbHMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEluaXRpYWxpemF0aW9uIGNvbXBsZXRlIGNhbGxiYWNrIC0gZmlyZWQgYWZ0ZXIgZmlyc3QgZGF0YSBsb2FkXG4gICAgICAgICAgICAgKiBXSFk6IFJlc3RvcmUgZmlsdGVycyBBRlRFUiBEYXRhVGFibGUgaGFzIGxvYWRlZCBpbml0aWFsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW5pdENvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgIC8vIFNldCBmbGFnIEZJUlNUIHRvIGFsbG93IHN0YXRlIHNhdmluZyBkdXJpbmcgZmlsdGVyIHJlc3RvcmF0aW9uXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgLy8gTm93IHJlc3RvcmUgZmlsdGVycyAtIGRyYXcgZXZlbnQgd2lsbCBjb3JyZWN0bHkgc2F2ZSB0aGUgcmVzdG9yZWQgc3RhdGVcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5yZXN0b3JlRmlsdGVyc0Zyb21TdGF0ZSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZSA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5EYXRhVGFibGUoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBTZWFyY2ggY29tcG9uZW50IEFGVEVSIERhdGFUYWJsZSBpcyBjcmVhdGVkXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goe1xuICAgICAgICAgICAgbWluQ2hhcmFjdGVyczogMCxcbiAgICAgICAgICAgIHNlYXJjaE9uRm9jdXM6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoRmllbGRzOiBbJ3RpdGxlJ10sXG4gICAgICAgICAgICBzaG93Tm9SZXN1bHRzOiBmYWxzZSxcbiAgICAgICAgICAgIHNvdXJjZTogW1xuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlTb3VyY2VOdW1iZXIsIHZhbHVlOiAnc3JjOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5RGVzdE51bWJlciwgdmFsdWU6ICdkc3Q6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlESUQsIHZhbHVlOiAnZGlkOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5TGlua2VkSUQsIHZhbHVlOiAnbGlua2VkaWQ6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlDdXN0b21QaHJhc2UsIHZhbHVlOiAnJyB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9uU2VsZWN0OiBmdW5jdGlvbihyZXN1bHQsIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kc2VhcmNoQ0RSSW5wdXQuc2VhcmNoKCdoaWRlIHJlc3VsdHMnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSBzZWFyY2ggd2hlbiB5b3UgY2xpY2sgb24gdGhlIGljb25cbiAgICAgICAgJCgnI3NlYXJjaC1pY29uJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmZvY3VzKCk7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kc2VhcmNoQ0RSSW5wdXQuc2VhcmNoKCdxdWVyeScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciB0byBzYXZlIHRoZSB1c2VyJ3MgcGFnZSBsZW5ndGggc2VsZWN0aW9uIGFuZCB1cGRhdGUgdGhlIHRhYmxlXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2UocGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlTGVuZ3RoID09PSAnYXV0bycpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFnZUxlbmd0aCA9IGNhbGxEZXRhaWxSZWNvcmRzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnLCBwYWdlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UubGVuKHBhZ2VMZW5ndGgpLmRyYXcoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCB0aGUgZXZlbnQgZnJvbSBidWJibGluZ1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIHNlbGVjdCBpbnB1dCB2YWx1ZSB0byB0aGUgc2F2ZWQgdmFsdWUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgaWYgKHNhdmVkUGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bignc2V0IHZhbHVlJywgc2F2ZWRQYWdlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgLy8gU2tpcCBzYXZpbmcgc3RhdGUgZHVyaW5nIGluaXRpYWwgbG9hZCBiZWZvcmUgZmlsdGVycyBhcmUgcmVzdG9yZWRcbiAgICAgICAgICAgIGlmICghY2FsbERldGFpbFJlY29yZHMuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2F2ZSBzdGF0ZSBhZnRlciBldmVyeSBkcmF3IChwYWdpbmF0aW9uLCBzZWFyY2gsIGRhdGUgY2hhbmdlKVxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuc2F2ZUZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgZm9yIGNsaWNraW5nIG9uIGljb24gd2l0aCBkYXRhLWlkcyAob3BlbiBpbiBuZXcgd2luZG93KVxuICAgICAgICAvLyBXSFk6IENsaWNraW5nIG9uIGljb24gc2hvdWxkIG9wZW4gU3lzdGVtIERpYWdub3N0aWMgaW4gbmV3IHdpbmRvdyB0byB2aWV3IHZlcmJvc2UgbG9nc1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ1tkYXRhLWlkc10nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCByb3cgdG9nZ2xlXG5cbiAgICAgICAgICAgIGNvbnN0IGlkcyA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLWlkcycpO1xuICAgICAgICAgICAgaWYgKGlkcyAhPT0gdW5kZWZpbmVkICYmIGlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBXSFk6IEZvcm1hdCBhcyBxdWVyeSBwYXJhbSArIGhhc2g6ID9maWx0ZXI9Li4uI2ZpbGU9Li4uXG4gICAgICAgICAgICAgICAgLy8gT3BlbiBpbiBuZXcgd2luZG93IHRvIGFsbG93IHZpZXdpbmcgbG9ncyB3aGlsZSBrZWVwaW5nIENEUiB0YWJsZSB2aXNpYmxlXG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gYCR7Z2xvYmFsUm9vdFVybH1zeXN0ZW0tZGlhZ25vc3RpYy9pbmRleC8/ZmlsdGVyPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGlkcyl9I2ZpbGU9YXN0ZXJpc2slMkZ2ZXJib3NlYDtcbiAgICAgICAgICAgICAgICB3aW5kb3cub3Blbih1cmwsICdfYmxhbmsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIGZvciBvcGVuaW5nIGFuZCBjbG9zaW5nIGRldGFpbHNcbiAgICAgICAgLy8gV0hZOiBPbmx5IGV4cGFuZC9jb2xsYXBzZSBvbiBmaXJzdCBjb2x1bW4gKGNhcmV0IGljb24pIGNsaWNrLCBub3Qgb24gYWN0aW9uIGljb25zXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAndHIuZGV0YWlsZWQgdGQ6Zmlyc3QtY2hpbGQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHIgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnJvdyh0cik7XG5cbiAgICAgICAgICAgIGlmIChyb3cuY2hpbGQuaXNTaG93bigpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyByb3cgaXMgYWxyZWFkeSBvcGVuIC0gY2xvc2UgaXRcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIHRyLnJlbW92ZUNsYXNzKCdzaG93bicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBPcGVuIHRoaXMgcm93XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkKGNhbGxEZXRhaWxSZWNvcmRzLnNob3dSZWNvcmRzKHJvdy5kYXRhKCkpKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgdHIuYWRkQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkKCkuZmluZCgnLmRldGFpbC1yZWNvcmQtcm93JykuZWFjaCgoaW5kZXgsIHBsYXllclJvdykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZCA9ICQocGxheWVyUm93KS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENEUlBsYXllcihpZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBzZWNvbmQgY2xpY2sgb24gZGVsZXRlIGJ1dHRvbiAoYWZ0ZXIgdHdvLXN0ZXBzLWRlbGV0ZSBjaGFuZ2VzIGljb24gdG8gY2xvc2UpXG4gICAgICAgIC8vIFdIWTogVHdvLXN0ZXBzLWRlbGV0ZSBtZWNoYW5pc20gcHJldmVudHMgYWNjaWRlbnRhbCBkZWxldGlvblxuICAgICAgICAvLyBGaXJzdCBjbGljazogdHJhc2gg4oaSIGNsb3NlIChieSBkZWxldGUtc29tZXRoaW5nLmpzKSwgU2Vjb25kIGNsaWNrOiBleGVjdXRlIGRlbGV0aW9uXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAnYS5kZWxldGUtcmVjb3JkOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCByb3cgZXhwYW5zaW9uXG5cbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICRidXR0b24uYXR0cignZGF0YS1yZWNvcmQtaWQnKTtcblxuICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkIGxvYWRpbmcnKTtcblxuICAgICAgICAgICAgLy8gQWx3YXlzIGRlbGV0ZSB3aXRoIHJlY29yZGluZ3MgYW5kIGxpbmtlZCByZWNvcmRzXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kZWxldGVSZWNvcmQocmVjb3JkSWQsICRidXR0b24pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzdG9yZSBmaWx0ZXJzIGZyb20gc2F2ZWQgc3RhdGUgYWZ0ZXIgRGF0YVRhYmxlIGluaXRpYWxpemF0aW9uXG4gICAgICogV0hZOiBNdXN0IGJlIGNhbGxlZCBhZnRlciBEYXRhVGFibGUgaXMgY3JlYXRlZCB0byByZXN0b3JlIHNlYXJjaCBhbmQgcGFnZVxuICAgICAqL1xuICAgIHJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlKCkge1xuICAgICAgICBjb25zdCBzYXZlZFN0YXRlID0gY2FsbERldGFpbFJlY29yZHMubG9hZEZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICBpZiAoIXNhdmVkU3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlc3RvcmUgc2VhcmNoIHRleHQgdG8gaW5wdXQgZmllbGRcbiAgICAgICAgaWYgKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCkge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoc2F2ZWRTdGF0ZS5zZWFyY2hUZXh0KTtcbiAgICAgICAgICAgIC8vIEFwcGx5IHNlYXJjaCB0byBEYXRhVGFibGVcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5zZWFyY2goc2F2ZWRTdGF0ZS5zZWFyY2hUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlc3RvcmUgcGFnZSBudW1iZXIgd2l0aCBkZWxheVxuICAgICAgICAvLyBXSFk6IERhdGFUYWJsZSBpZ25vcmVzIHBhZ2UoKSBkdXJpbmcgaW5pdENvbXBsZXRlLCBuZWVkIHNldFRpbWVvdXQgdG8gYWxsb3cgaW5pdGlhbGl6YXRpb24gdG8gZnVsbHkgY29tcGxldGVcbiAgICAgICAgaWYgKHNhdmVkU3RhdGUuY3VycmVudFBhZ2UpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlKHNhdmVkU3RhdGUuY3VycmVudFBhZ2UpLmRyYXcoZmFsc2UpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfSBlbHNlIGlmIChzYXZlZFN0YXRlLnNlYXJjaFRleHQpIHtcbiAgICAgICAgICAgIC8vIElmIG9ubHkgc2VhcmNoIHRleHQgZXhpc3RzLCBzdGlsbCBuZWVkIHRvIGRyYXdcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5kcmF3KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIENEUiByZWNvcmQgdmlhIFJFU1QgQVBJXG4gICAgICogV0hZOiBEZWxldGVzIGJ5IGxpbmtlZGlkIC0gYXV0b21hdGljYWxseSByZW1vdmVzIGVudGlyZSBjb252ZXJzYXRpb24gd2l0aCBhbGwgbGlua2VkIHJlY29yZHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBDRFIgbGlua2VkaWQgKGxpa2UgXCJtaWtvcGJ4LTE3NjA3ODQ3OTMuNDYyN1wiKVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkYnV0dG9uIC0gQnV0dG9uIGVsZW1lbnQgdG8gdXBkYXRlIHN0YXRlXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKHJlY29yZElkLCAkYnV0dG9uKSB7XG4gICAgICAgIC8vIEFsd2F5cyBkZWxldGUgd2l0aCByZWNvcmRpbmcgZmlsZXNcbiAgICAgICAgLy8gV0hZOiBsaW5rZWRpZCBhdXRvbWF0aWNhbGx5IGRlbGV0ZXMgYWxsIGxpbmtlZCByZWNvcmRzIChubyBkZWxldGVMaW5rZWQgcGFyYW1ldGVyIG5lZWRlZClcbiAgICAgICAgQ2RyQVBJLmRlbGV0ZVJlY29yZChyZWNvcmRJZCwgeyBkZWxldGVSZWNvcmRpbmc6IHRydWUgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAvLyBTaWxlbnRseSByZWxvYWQgdGhlIERhdGFUYWJsZSB0byByZWZsZWN0IGNoYW5nZXNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IFZpc3VhbCBmZWVkYmFjayAoZGlzYXBwZWFyaW5nIHJvdykgaXMgZW5vdWdoLCBubyBuZWVkIGZvciBzdWNjZXNzIHRvYXN0XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLmFqYXgucmVsb2FkKG51bGwsIGZhbHNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlIG9ubHkgb24gZmFpbHVyZVxuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTXNnID0gcmVzcG9uc2U/Lm1lc3NhZ2VzPy5lcnJvcj8uWzBdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jZHJfRGVsZXRlRmFpbGVkIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gZGVsZXRlIHJlY29yZCc7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTXNnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIHBhZ2luYXRpb24gY29udHJvbHMgdmlzaWJpbGl0eSBiYXNlZCBvbiBkYXRhIHNpemVcbiAgICAgKi9cbiAgICB0b2dnbGVQYWdpbmF0aW9uQ29udHJvbHMoKSB7XG4gICAgICAgIGNvbnN0IGluZm8gPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5pbmZvKCk7XG4gICAgICAgIGlmIChpbmZvLnBhZ2VzIDw9IDEpIHtcbiAgICAgICAgICAgICQoY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnRhYmxlKCkuY29udGFpbmVyKCkpLmZpbmQoJy5kYXRhVGFibGVzX3BhZ2luYXRlJykuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUudGFibGUoKS5jb250YWluZXIoKSkuZmluZCgnLmRhdGFUYWJsZXNfcGFnaW5hdGUnKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyBDRFIgbWV0YWRhdGEgKGRhdGUgcmFuZ2UpIHVzaW5nIENkckFQSVxuICAgICAqIFdIWTogTGlnaHR3ZWlnaHQgcmVxdWVzdCByZXR1cm5zIG9ubHkgbWV0YWRhdGEgKGRhdGVzKSwgbm90IGZ1bGwgQ0RSIHJlY29yZHNcbiAgICAgKiBBdm9pZHMgZG91YmxlIHJlcXVlc3Qgb24gcGFnZSBsb2FkXG4gICAgICovXG4gICAgZmV0Y2hMYXRlc3RDRFJEYXRlKCkge1xuICAgICAgICAvLyBDaGVjayBmb3Igc2F2ZWQgc3RhdGUgZmlyc3RcbiAgICAgICAgY29uc3Qgc2F2ZWRTdGF0ZSA9IGNhbGxEZXRhaWxSZWNvcmRzLmxvYWRGaWx0ZXJzU3RhdGUoKTtcblxuICAgICAgICBDZHJBUEkuZ2V0TWV0YWRhdGEoeyBsaW1pdDogMTAwIH0sIChkYXRhKSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLmhhc1JlY29yZHMpIHtcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnREYXRlLCBlbmREYXRlO1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBzYXZlZCBzdGF0ZSB3aXRoIGRhdGVzLCB1c2UgdGhvc2UgaW5zdGVhZCBvZiBtZXRhZGF0YVxuICAgICAgICAgICAgICAgIGlmIChzYXZlZFN0YXRlICYmIHNhdmVkU3RhdGUuZGF0ZUZyb20gJiYgc2F2ZWRTdGF0ZS5kYXRlVG8pIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnREYXRlID0gbW9tZW50KHNhdmVkU3RhdGUuZGF0ZUZyb20pO1xuICAgICAgICAgICAgICAgICAgICBlbmREYXRlID0gbW9tZW50KHNhdmVkU3RhdGUuZGF0ZVRvKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IG1ldGFkYXRhIGRhdGUgc3RyaW5ncyB0byBtb21lbnQgb2JqZWN0c1xuICAgICAgICAgICAgICAgICAgICBzdGFydERhdGUgPSBtb21lbnQoZGF0YS5lYXJsaWVzdERhdGUpO1xuICAgICAgICAgICAgICAgICAgICBlbmREYXRlID0gbW9tZW50KGRhdGEubGF0ZXN0RGF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3JkcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yKHN0YXJ0RGF0ZSwgZW5kRGF0ZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIERhdGFUYWJsZSBvbmx5IGlmIHdlIGhhdmUgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogRGF0YVRhYmxlIG5lZWRzIGRhdGUgcmFuZ2UgdG8gYmUgc2V0IGZpcnN0XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZURhdGFUYWJsZUFuZEhhbmRsZXJzKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vIHJlY29yZHMgaW4gZGF0YWJhc2UgYXQgYWxsIG9yIEFQSSBlcnJvclxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5zaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyKCk7XG4gICAgICAgICAgICAgICAgLy8gRG9uJ3QgaW5pdGlhbGl6ZSBEYXRhVGFibGUgYXQgYWxsIC0ganVzdCBzaG93IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGEgc3R5bGVkIGVtcHR5IHRhYmxlIG1lc3NhZ2VcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIG1lc3NhZ2UgZm9yIGVtcHR5IHRhYmxlXG4gICAgICovXG4gICAgZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKSB7XG4gICAgICAgIC8vIElmIGRhdGFiYXNlIGlzIGVtcHR5LCB3ZSBkb24ndCBzaG93IHRoaXMgbWVzc2FnZSBpbiB0YWJsZVxuICAgICAgICBpZiAoIWNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBmaWx0ZXJlZCBlbXB0eSBzdGF0ZSBtZXNzYWdlXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBwbGFjZWhvbGRlciBzZWdtZW50XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaWNvbiBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInNlYXJjaCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9GaWx0ZXJlZEVtcHR5VGl0bGV9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpbmxpbmVcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dFwiPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5jZHJfRmlsdGVyZWRFbXB0eURlc2NyaXB0aW9ufVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PmA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93cyB0aGUgZW1wdHkgZGF0YWJhc2UgcGxhY2Vob2xkZXIgYW5kIGhpZGVzIHRoZSB0YWJsZVxuICAgICAqL1xuICAgIHNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIoKSB7XG4gICAgICAgIC8vIEhpZGUgdGhlIHRhYmxlIGl0c2VsZiAoRGF0YVRhYmxlIHdvbid0IGJlIGluaXRpYWxpemVkKVxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuaGlkZSgpO1xuXG4gICAgICAgIC8vIEhpZGUgc2VhcmNoIGFuZCBkYXRlIGNvbnRyb2xzXG4gICAgICAgICQoJyNkYXRlLXJhbmdlLXNlbGVjdG9yJykuY2xvc2VzdCgnLnVpLnJvdycpLmhpZGUoKTtcblxuICAgICAgICAvLyBTaG93IHBsYWNlaG9sZGVyXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIuc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm0gUkVTVCBBUEkgZ3JvdXBlZCByZWNvcmRzIHRvIERhdGFUYWJsZSByb3cgZm9ybWF0XG4gICAgICogQHBhcmFtIHtBcnJheX0gcmVzdERhdGEgLSBBcnJheSBvZiBncm91cGVkIENEUiByZWNvcmRzIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIERhdGFUYWJsZSByb3dzXG4gICAgICovXG4gICAgdHJhbnNmb3JtUmVzdFRvRGF0YVRhYmxlKHJlc3REYXRhKSB7XG4gICAgICAgIHJldHVybiByZXN0RGF0YS5tYXAoZ3JvdXAgPT4ge1xuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWluZyBkaXNwbGF5XG4gICAgICAgICAgICBjb25zdCBiaWxsc2VjID0gZ3JvdXAudG90YWxCaWxsc2VjIHx8IDA7XG4gICAgICAgICAgICBjb25zdCB0aW1lRm9ybWF0ID0gKGJpbGxzZWMgPCAzNjAwKSA/ICdtbTpzcycgOiAnSEg6bW06c3MnO1xuICAgICAgICAgICAgY29uc3QgdGltaW5nID0gYmlsbHNlYyA+IDAgPyBtb21lbnQudXRjKGJpbGxzZWMgKiAxMDAwKS5mb3JtYXQodGltZUZvcm1hdCkgOiAnJztcblxuICAgICAgICAgICAgLy8gRm9ybWF0IHN0YXJ0IGRhdGVcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZERhdGUgPSBtb21lbnQoZ3JvdXAuc3RhcnQpLmZvcm1hdCgnREQtTU0tWVlZWSBISDptbTpzcycpO1xuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IHJlY29yZGluZyByZWNvcmRzIC0gZmlsdGVyIG9ubHkgcmVjb3JkcyB3aXRoIGFjdHVhbCByZWNvcmRpbmcgZmlsZXNcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZGluZ3MgPSAoZ3JvdXAucmVjb3JkcyB8fCBbXSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKHIgPT4gci5yZWNvcmRpbmdmaWxlICYmIHIucmVjb3JkaW5nZmlsZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgIC5tYXAociA9PiAoe1xuICAgICAgICAgICAgICAgICAgICBpZDogci5pZCxcbiAgICAgICAgICAgICAgICAgICAgc3JjX251bTogci5zcmNfbnVtLFxuICAgICAgICAgICAgICAgICAgICBkc3RfbnVtOiByLmRzdF9udW0sXG4gICAgICAgICAgICAgICAgICAgIHJlY29yZGluZ2ZpbGU6IHIucmVjb3JkaW5nZmlsZSxcbiAgICAgICAgICAgICAgICAgICAgcGxheWJhY2tfdXJsOiByLnBsYXliYWNrX3VybCwgICAvLyBUb2tlbi1iYXNlZCBVUkwgZm9yIHBsYXliYWNrXG4gICAgICAgICAgICAgICAgICAgIGRvd25sb2FkX3VybDogci5kb3dubG9hZF91cmwgICAgLy8gVG9rZW4tYmFzZWQgVVJMIGZvciBkb3dubG9hZFxuICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIENTUyBjbGFzc1xuICAgICAgICAgICAgY29uc3QgaGFzUmVjb3JkaW5ncyA9IHJlY29yZGluZ3MubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGlzQW5zd2VyZWQgPSBncm91cC5kaXNwb3NpdGlvbiA9PT0gJ0FOU1dFUkVEJztcbiAgICAgICAgICAgIGNvbnN0IGR0Um93Q2xhc3MgPSBoYXNSZWNvcmRpbmdzID8gJ2RldGFpbGVkJyA6ICd1aSc7XG4gICAgICAgICAgICBjb25zdCBuZWdhdGl2ZUNsYXNzID0gaXNBbnN3ZXJlZCA/ICcnIDogJyBuZWdhdGl2ZSc7XG5cbiAgICAgICAgICAgIC8vIENvbGxlY3QgdW5pcXVlIHZlcmJvc2UgY2FsbCBJRHNcbiAgICAgICAgICAgIGNvbnN0IGlkcyA9IFsuLi5uZXcgU2V0KFxuICAgICAgICAgICAgICAgIChncm91cC5yZWNvcmRzIHx8IFtdKVxuICAgICAgICAgICAgICAgICAgICAubWFwKHIgPT4gci52ZXJib3NlX2NhbGxfaWQpXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaWQgPT4gaWQgJiYgaWQubGVuZ3RoID4gMClcbiAgICAgICAgICAgICldLmpvaW4oJyYnKTtcblxuICAgICAgICAgICAgLy8gUmV0dXJuIERhdGFUYWJsZSByb3cgZm9ybWF0XG4gICAgICAgICAgICAvLyBEYXRhVGFibGVzIG5lZWRzIGJvdGggYXJyYXkgaW5kaWNlcyBBTkQgc3BlY2lhbCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBjb25zdCByb3cgPSBbXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkRGF0ZSwgICAgICAgICAgICAgIC8vIDA6IGRhdGVcbiAgICAgICAgICAgICAgICBncm91cC5zcmNfbnVtLCAgICAgICAgICAgICAgLy8gMTogc291cmNlIG51bWJlclxuICAgICAgICAgICAgICAgIGdyb3VwLmRzdF9udW0gfHwgZ3JvdXAuZGlkLCAvLyAyOiBkZXN0aW5hdGlvbiBudW1iZXIgb3IgRElEXG4gICAgICAgICAgICAgICAgdGltaW5nLCAgICAgICAgICAgICAgICAgICAgIC8vIDM6IGR1cmF0aW9uXG4gICAgICAgICAgICAgICAgcmVjb3JkaW5ncywgICAgICAgICAgICAgICAgIC8vIDQ6IHJlY29yZGluZyByZWNvcmRzIGFycmF5XG4gICAgICAgICAgICAgICAgZ3JvdXAuZGlzcG9zaXRpb24gICAgICAgICAgIC8vIDU6IGRpc3Bvc2l0aW9uXG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAvLyBBZGQgRGF0YVRhYmxlcyBzcGVjaWFsIHByb3BlcnRpZXNcbiAgICAgICAgICAgIHJvdy5EVF9Sb3dJZCA9IGdyb3VwLmxpbmtlZGlkO1xuICAgICAgICAgICAgcm93LkRUX1Jvd0NsYXNzID0gZHRSb3dDbGFzcyArIG5lZ2F0aXZlQ2xhc3M7XG4gICAgICAgICAgICByb3cuaWRzID0gaWRzOyAvLyBTdG9yZSByYXcgSURzIHdpdGhvdXQgZW5jb2RpbmcgLSBlbmNvZGluZyB3aWxsIGJlIGFwcGxpZWQgd2hlbiBidWlsZGluZyBVUkxcblxuICAgICAgICAgICAgcmV0dXJuIHJvdztcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgc2V0IG9mIGNhbGwgcmVjb3JkcyB3aGVuIGEgcm93IGlzIGNsaWNrZWQuXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2FsbCByZWNvcmRzLlxuICAgICAqL1xuICAgIHNob3dSZWNvcmRzKGRhdGEpIHtcbiAgICAgICAgbGV0IGh0bWxQbGF5ZXIgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBiYXNpYyB0YWJsZSBjZHItcGxheWVyXCI+PHRib2R5Pic7XG4gICAgICAgIGRhdGFbNF0uZm9yRWFjaCgocmVjb3JkLCBpKSA9PiB7XG4gICAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIHx8IHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSBudWxsXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3cgZGlzYWJsZWRcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiXCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiXCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdG9rZW4tYmFzZWQgVVJMcyBpbnN0ZWFkIG9mIGRpcmVjdCBmaWxlIHBhdGhzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBTZWN1cml0eSAtIGhpZGVzIGFjdHVhbCBmaWxlIHBhdGhzIGZyb20gdXNlclxuICAgICAgICAgICAgICAgIC8vIFR3byBzZXBhcmF0ZSBlbmRwb2ludHM6IDpwbGF5YmFjayAoaW5saW5lKSBhbmQgOmRvd25sb2FkIChmaWxlKVxuICAgICAgICAgICAgICAgIGNvbnN0IHBsYXliYWNrVXJsID0gcmVjb3JkLnBsYXliYWNrX3VybCB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBkb3dubG9hZFVybCA9IHJlY29yZC5kb3dubG9hZF91cmwgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3dcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiJHtwbGF5YmFja1VybH1cIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IGljb24gdG9wIGxlZnQgcG9pbnRpbmcgZHJvcGRvd24gZG93bmxvYWQtZm9ybWF0LWRyb3Bkb3duXCIgZGF0YS1kb3dubG9hZC11cmw9XCIke2Rvd25sb2FkVXJsfVwiPlxuICAgIFx0XHQ8aSBjbGFzcz1cImRvd25sb2FkIGljb25cIj48L2k+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIndlYm1cIj5XZWJNIChPcHVzKTwvZGl2PlxuICAgIFx0XHRcdDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1mb3JtYXQ9XCJtcDNcIj5NUDM8L2Rpdj5cbiAgICBcdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtZm9ybWF0PVwid2F2XCI+V0FWPC9kaXY+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIm9nZ1wiPk9HRyAoT3B1cyk8L2Rpdj5cbiAgICBcdFx0PC9kaXY+XG4gICAgXHQ8L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0bWxQbGF5ZXIgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICByZXR1cm4gaHRtbFBsYXllcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgcGFnZSBsZW5ndGggZm9yIERhdGFUYWJsZSwgY29uc2lkZXJpbmcgdXNlcidzIHNhdmVkIHByZWZlcmVuY2VcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldFBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHNhdmVkIHZhbHVlIG9yIHVzZSB0aGUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHZhbHVlIGlmIG5vbmUgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgcmV0dXJuIHNhdmVkUGFnZUxlbmd0aCA/IHBhcnNlSW50KHNhdmVkUGFnZUxlbmd0aCwgMTApIDogY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygcm93cyB0aGF0IGNhbiBmaXQgb24gYSBwYWdlIGJhc2VkIG9uIHRoZSBjdXJyZW50IHdpbmRvdyBoZWlnaHQuXG4gICAgICogRHluYW1pY2FsbHkgbWVhc3VyZXMgdGhlIGFjdHVhbCBvdmVyaGVhZCBmcm9tIERPTSBlbGVtZW50cyBpbnN0ZWFkIG9mIHVzaW5nIGEgaGFyZGNvZGVkIGVzdGltYXRlLlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gTWVhc3VyZSBhY3R1YWwgcm93IGhlaWdodCBmcm9tIHJlbmRlcmVkIHJvdywgZmFsbGJhY2sgdG8gY29tcGFjdCB0YWJsZSBkZWZhdWx0ICh+MzZweClcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5maW5kKCd0Ym9keSA+IHRyJykuZmlyc3QoKS5vdXRlckhlaWdodCgpIHx8IDM2O1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBvdmVyaGVhZCBkeW5hbWljYWxseSBmcm9tIHRoZSB0YWJsZSdzIHBvc2l0aW9uIGluIHRoZSBwYWdlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgbGV0IG92ZXJoZWFkID0gNDAwOyAvLyBzYWZlIGZhbGxiYWNrXG4gICAgICAgIGNvbnN0IHRhYmxlRWwgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZ2V0KDApO1xuICAgICAgICBpZiAodGFibGVFbCkge1xuICAgICAgICAgICAgY29uc3QgdGhlYWQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZmluZCgndGhlYWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHRoZWFkSGVpZ2h0ID0gdGhlYWQubGVuZ3RoID8gdGhlYWQub3V0ZXJIZWlnaHQoKSA6IDM4O1xuICAgICAgICAgICAgY29uc3QgdGFibGVUb3AgPSB0YWJsZUVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcblxuICAgICAgICAgICAgLy8gU3BhY2UgYmVsb3c6IHBhZ2luYXRpb24oNTApICsgaW5mbyBiYXIoMzApICsgc2VnbWVudCBwYWRkaW5nKDE0KSArIHZlcnNpb24gZm9vdGVyKDM1KSArIG1hcmdpbnMoMTApXG4gICAgICAgICAgICBjb25zdCBib3R0b21SZXNlcnZlID0gMTM5O1xuXG4gICAgICAgICAgICBvdmVyaGVhZCA9IHRhYmxlVG9wICsgdGhlYWRIZWlnaHQgKyBib3R0b21SZXNlcnZlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIG92ZXJoZWFkKSAvIHJvd0hlaWdodCksIDUpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IuXG4gICAgICogQHBhcmFtIHttb21lbnR9IHN0YXJ0RGF0ZSAtIE9wdGlvbmFsIGVhcmxpZXN0IHJlY29yZCBkYXRlIGZyb20gbGFzdCAxMDAgcmVjb3Jkc1xuICAgICAqIEBwYXJhbSB7bW9tZW50fSBlbmREYXRlIC0gT3B0aW9uYWwgbGF0ZXN0IHJlY29yZCBkYXRlIGZyb20gbGFzdCAxMDAgcmVjb3Jkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcihzdGFydERhdGUgPSBudWxsLCBlbmREYXRlID0gbnVsbCkge1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge307XG5cbiAgICAgICAgb3B0aW9ucy5yYW5nZXMgPSB7XG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9Ub2RheV06IFttb21lbnQoKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfWWVzdGVyZGF5XTogW21vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyksIG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXlzJyldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdFdlZWtdOiBbbW9tZW50KCkuc3VidHJhY3QoNiwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdDMwRGF5c106IFttb21lbnQoKS5zdWJ0cmFjdCgyOSwgJ2RheXMnKSwgbW9tZW50KCldLFxuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVGhpc01vbnRoXTogW21vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJyksIG1vbWVudCgpLmVuZE9mKCdtb250aCcpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RNb250aF06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnbW9udGgnKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgIH07XG4gICAgICAgIG9wdGlvbnMuYWx3YXlzU2hvd0NhbGVuZGFycyA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMuYXV0b1VwZGF0ZUlucHV0ID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5saW5rZWRDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLm1heERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgb3B0aW9ucy5sb2NhbGUgPSB7XG4gICAgICAgICAgICBmb3JtYXQ6ICdERC9NTS9ZWVlZJyxcbiAgICAgICAgICAgIHNlcGFyYXRvcjogJyAtICcsXG4gICAgICAgICAgICBhcHBseUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0FwcGx5QnRuLFxuICAgICAgICAgICAgY2FuY2VsTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ2FuY2VsQnRuLFxuICAgICAgICAgICAgZnJvbUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX2Zyb20sXG4gICAgICAgICAgICB0b0xhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX3RvLFxuICAgICAgICAgICAgY3VzdG9tUmFuZ2VMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9DdXN0b21QZXJpb2QsXG4gICAgICAgICAgICBkYXlzT2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQuZGF5cyxcbiAgICAgICAgICAgIG1vbnRoTmFtZXM6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5tb250aHMsXG4gICAgICAgICAgICBmaXJzdERheTogMSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGRhdGUgcmFuZ2UgZnJvbSBsYXN0IDEwMCByZWNvcmRzLCB1c2UgaXRcbiAgICAgICAgLy8gV0hZOiBQcm92aWRlcyBtZWFuaW5nZnVsIGNvbnRleHQgLSB1c2VyIHNlZXMgcGVyaW9kIGNvdmVyaW5nIHJlY2VudCBjYWxsc1xuICAgICAgICBpZiAoc3RhcnREYXRlICYmIGVuZERhdGUpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KHN0YXJ0RGF0ZSkuc3RhcnRPZignZGF5Jyk7XG4gICAgICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBtb21lbnQoZW5kRGF0ZSkuZW5kT2YoJ2RheScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gdG9kYXkgaWYgbm8gcmVjb3Jkc1xuICAgICAgICAgICAgb3B0aW9ucy5zdGFydERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIG9wdGlvbnMuZW5kRGF0ZSA9IG1vbWVudCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGVyYW5nZXBpY2tlcihcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QsXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gTm90ZTogRG9uJ3QgY2FsbCBhcHBseUZpbHRlciBoZXJlIC0gRGF0YVRhYmxlIGlzIG5vdCBpbml0aWFsaXplZCB5ZXRcbiAgICAgICAgLy8gRGF0YVRhYmxlIHdpbGwgbG9hZCBkYXRhIGF1dG9tYXRpY2FsbHkgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIHNlbGVjdCBldmVudC5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IHN0YXJ0IC0gVGhlIHN0YXJ0IGRhdGUuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBlbmQgLSBUaGUgZW5kIGRhdGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGxhYmVsIC0gVGhlIGxhYmVsLlxuICAgICAqL1xuICAgIGNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdChzdGFydCwgZW5kLCBsYWJlbCkge1xuICAgICAgICAvLyBPbmx5IHBhc3Mgc2VhcmNoIGtleXdvcmQsIGRhdGVzIGFyZSByZWFkIGRpcmVjdGx5IGZyb20gZGF0ZSByYW5nZSBzZWxlY3RvclxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcihjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpKTtcbiAgICAgICAgLy8gU3RhdGUgd2lsbCBiZSBzYXZlZCBhdXRvbWF0aWNhbGx5IGluIGRyYXcgZXZlbnQgYWZ0ZXIgZmlsdGVyIGlzIGFwcGxpZWRcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZmlsdGVyIHRvIHRoZSBkYXRhIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIGZpbHRlciB0ZXh0LlxuICAgICAqL1xuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBDRFIgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19