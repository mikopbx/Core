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

/* global globalRootUrl, SemanticLocalization, ExtensionsAPI, moment, globalTranslate, CDRPlayer, CdrAPI, UserMessage, ACLHelper, SecurityUtils */

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
        $('td', row).eq(2).html(data[1]).addClass('need-update').attr('data-cdr-name', data[6] || '');
        $('td', row).eq(3).html(data[2]).addClass('need-update').attr('data-cdr-name', data[7] || ''); // Duration column (no icons)

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
          src_name: r.src_name || '',
          dst_num: r.dst_num,
          dst_name: r.dst_name || '',
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
      group.disposition, // 5: disposition
      group.src_name || '', // 6: source caller name from CDR
      group.dst_name || '' // 7: destination caller name from CDR
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
        htmlPlayer += "\n\n<tr class=\"detail-record-row disabled\" id=\"".concat(record.id, "\">\n   \t<td class=\"one wide\"></td>\n   \t<td class=\"one wide right aligned\">\n   \t\t<i class=\"ui icon play\"></i>\n\t   \t<audio preload=\"metadata\" id=\"audio-player-").concat(record.id, "\" src=\"\"></audio>\n\t</td>\n    <td class=\"five wide\">\n    \t<div class=\"ui range cdr-player\" data-value=\"").concat(record.id, "\"></div>\n    </td>\n    <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n    <td class=\"one wide\">\n    \t<i class=\"ui icon download\" data-value=\"\"></i>\n    </td>\n    <td class=\"right aligned\"><span class=\"need-update\" data-cdr-name=\"").concat(SecurityUtils.escapeHtml(record.src_name || ''), "\">").concat(SecurityUtils.escapeHtml(record.src_num), "</span></td>\n    <td class=\"one wide center aligned\"><i class=\"icon exchange\"></i></td>\n   \t<td class=\"left aligned\"><span class=\"need-update\" data-cdr-name=\"").concat(SecurityUtils.escapeHtml(record.dst_name || ''), "\">").concat(SecurityUtils.escapeHtml(record.dst_num), "</span></td>\n</tr>");
      } else {
        // Use token-based URLs instead of direct file paths
        // WHY: Security - hides actual file paths from user
        // Two separate endpoints: :playback (inline) and :download (file)
        var playbackUrl = record.playback_url || '';
        var downloadUrl = record.download_url || '';
        htmlPlayer += "\n\n<tr class=\"detail-record-row\" id=\"".concat(record.id, "\">\n   \t<td class=\"one wide\"></td>\n   \t<td class=\"one wide right aligned\">\n   \t\t<i class=\"ui icon play\"></i>\n\t   \t<audio preload=\"metadata\" id=\"audio-player-").concat(record.id, "\" src=\"").concat(playbackUrl, "\"></audio>\n\t</td>\n    <td class=\"five wide\">\n    \t<div class=\"ui range cdr-player\" data-value=\"").concat(record.id, "\"></div>\n    </td>\n    <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n    <td class=\"one wide\">\n    \t<div class=\"ui compact icon top left pointing dropdown download-format-dropdown\" data-download-url=\"").concat(downloadUrl, "\">\n    \t\t<i class=\"download icon\"></i>\n    \t\t<div class=\"menu\">\n    \t\t\t<div class=\"item\" data-format=\"webm\">WebM (Opus)</div>\n    \t\t\t<div class=\"item\" data-format=\"mp3\">MP3</div>\n    \t\t\t<div class=\"item\" data-format=\"wav\">WAV</div>\n    \t\t\t<div class=\"item\" data-format=\"ogg\">OGG (Opus)</div>\n    \t\t</div>\n    \t</div>\n    </td>\n    <td class=\"right aligned\"><span class=\"need-update\" data-cdr-name=\"").concat(SecurityUtils.escapeHtml(record.src_name || ''), "\">").concat(SecurityUtils.escapeHtml(record.src_num), "</span></td>\n    <td class=\"one wide center aligned\"><i class=\"icon exchange\"></i></td>\n   \t<td class=\"left aligned\"><span class=\"need-update\" data-cdr-name=\"").concat(SecurityUtils.escapeHtml(record.dst_name || ''), "\">").concat(SecurityUtils.escapeHtml(record.dst_num), "</span></td>\n</tr>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCIkc2VhcmNoQ0RSSW5wdXQiLCIkcGFnZUxlbmd0aFNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImhhc0NEUlJlY29yZHMiLCIkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiU1RPUkFHRV9LRVkiLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImdsb2JhbFJvb3RVcmwiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiY2xlYXJGaWx0ZXJzU3RhdGUiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwicmVsb2FkIiwiZmV0Y2hMYXRlc3RDRFJEYXRlIiwic2F2ZUZpbHRlcnNTdGF0ZSIsInNlc3Npb25TdG9yYWdlIiwiY29uc29sZSIsIndhcm4iLCJzdGF0ZSIsImRhdGVGcm9tIiwiZGF0ZVRvIiwic2VhcmNoVGV4dCIsImN1cnJlbnRQYWdlIiwicGFnZUxlbmd0aCIsImdldFBhZ2VMZW5ndGgiLCJkYXRlUmFuZ2VQaWNrZXIiLCJkYXRhIiwic3RhcnREYXRlIiwiZW5kRGF0ZSIsImZvcm1hdCIsInZhbCIsInBhZ2UiLCJwYWdlSW5mbyIsImluZm8iLCJzZXRJdGVtIiwiSlNPTiIsInN0cmluZ2lmeSIsImVycm9yIiwibG9hZEZpbHRlcnNTdGF0ZSIsInJhd0RhdGEiLCJnZXRJdGVtIiwicGFyc2UiLCJpbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMiLCJzZWFyY2hEZWJvdW5jZVRpbWVyIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImtleUNvZGUiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJjYW5EZWxldGUiLCJBQ0xIZWxwZXIiLCJpc0FsbG93ZWQiLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwicHVzaCIsInNlYXJjaCIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiY29sdW1uRGVmcyIsImRlZmF1bHRDb250ZW50IiwidGFyZ2V0cyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInBhcmFtcyIsImlzTGlua2VkSWRTZWFyY2giLCJpc1ZhbGlkIiwiZW5kT2YiLCJzZWFyY2hLZXl3b3JkIiwidmFsdWUiLCJ0cmltIiwia2V5d29yZCIsInN0YXJ0c1dpdGgiLCJzcmNfbnVtIiwic3Vic3RyaW5nIiwiZHN0X251bSIsImRpZCIsImxpbmtlZGlkIiwibGltaXQiLCJvZmZzZXQiLCJzdGFydCIsInNvcnQiLCJvcmRlciIsImdyb3VwZWQiLCJkYXRhU3JjIiwianNvbiIsInJlc3VsdCIsInJlc3REYXRhIiwicmVjb3JkcyIsInBhZ2luYXRpb24iLCJyZWNvcmRzVG90YWwiLCJ0b3RhbCIsInJlY29yZHNGaWx0ZXJlZCIsInRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZSIsImJlZm9yZVNlbmQiLCJ4aHIiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsInNldFJlcXVlc3RIZWFkZXIiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZW1wdHlUYWJsZSIsImdldEVtcHR5VGFibGVNZXNzYWdlIiwiemVyb1JlY29yZHMiLCJjcmVhdGVkUm93Iiwicm93IiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiYWRkQ2xhc3MiLCJhdHRyIiwiYWN0aW9uc0h0bWwiLCJjYW5WaWV3TG9ncyIsImlkcyIsIkRUX1Jvd0lkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2RyX0RlbGV0ZVJlY29yZCIsImRyYXdDYWxsYmFjayIsIkV4dGVuc2lvbnNBUEkiLCJ1cGRhdGVQaG9uZXNSZXByZXNlbnQiLCJ0b2dnbGVQYWdpbmF0aW9uQ29udHJvbHMiLCJpbml0Q29tcGxldGUiLCJyZXN0b3JlRmlsdGVyc0Zyb21TdGF0ZSIsIm9yZGVyaW5nIiwiRGF0YVRhYmxlIiwibWluQ2hhcmFjdGVycyIsInNlYXJjaE9uRm9jdXMiLCJzZWFyY2hGaWVsZHMiLCJzaG93Tm9SZXN1bHRzIiwic291cmNlIiwidGl0bGUiLCJjZHJfU2VhcmNoQnlTb3VyY2VOdW1iZXIiLCJjZHJfU2VhcmNoQnlEZXN0TnVtYmVyIiwiY2RyX1NlYXJjaEJ5RElEIiwiY2RyX1NlYXJjaEJ5TGlua2VkSUQiLCJjZHJfU2VhcmNoQnlDdXN0b21QaHJhc2UiLCJvblNlbGVjdCIsInJlc3BvbnNlIiwiZm9jdXMiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxlbiIsImRyYXciLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNhdmVkUGFnZUxlbmd0aCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsImN1cnJlbnRUYXJnZXQiLCJ1bmRlZmluZWQiLCJlbmNvZGVVUklDb21wb25lbnQiLCJvcGVuIiwidHIiLCJ0YXJnZXQiLCJjaGlsZCIsImlzU2hvd24iLCJoaWRlIiwic2hvd1JlY29yZHMiLCJzaG93IiwiZmluZCIsImVhY2giLCJpbmRleCIsInBsYXllclJvdyIsImlkIiwiQ0RSUGxheWVyIiwiJGJ1dHRvbiIsInJlY29yZElkIiwiZGVsZXRlUmVjb3JkIiwic2F2ZWRTdGF0ZSIsIkNkckFQSSIsImRlbGV0ZVJlY29yZGluZyIsImVycm9yTXNnIiwibWVzc2FnZXMiLCJjZHJfRGVsZXRlRmFpbGVkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJwYWdlcyIsInRhYmxlIiwiY29udGFpbmVyIiwiZ2V0TWV0YWRhdGEiLCJoYXNSZWNvcmRzIiwibW9tZW50IiwiZWFybGllc3REYXRlIiwibGF0ZXN0RGF0ZSIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsInNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIiLCJjZHJfRmlsdGVyZWRFbXB0eVRpdGxlIiwiY2RyX0ZpbHRlcmVkRW1wdHlEZXNjcmlwdGlvbiIsIm1hcCIsImdyb3VwIiwiYmlsbHNlYyIsInRvdGFsQmlsbHNlYyIsInRpbWVGb3JtYXQiLCJ0aW1pbmciLCJ1dGMiLCJmb3JtYXR0ZWREYXRlIiwicmVjb3JkaW5ncyIsImZpbHRlciIsInIiLCJyZWNvcmRpbmdmaWxlIiwic3JjX25hbWUiLCJkc3RfbmFtZSIsInBsYXliYWNrX3VybCIsImRvd25sb2FkX3VybCIsImhhc1JlY29yZGluZ3MiLCJpc0Fuc3dlcmVkIiwiZGlzcG9zaXRpb24iLCJkdFJvd0NsYXNzIiwibmVnYXRpdmVDbGFzcyIsIlNldCIsInZlcmJvc2VfY2FsbF9pZCIsImpvaW4iLCJodG1sUGxheWVyIiwiZm9yRWFjaCIsInJlY29yZCIsImkiLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsInBsYXliYWNrVXJsIiwiZG93bmxvYWRVcmwiLCJwYXJzZUludCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsIm92ZXJoZWFkIiwidGFibGVFbCIsImdldCIsInRoZWFkIiwidGhlYWRIZWlnaHQiLCJ0YWJsZVRvcCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsInRvcCIsImJvdHRvbVJlc2VydmUiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJvcHRpb25zIiwicmFuZ2VzIiwiY2FsX1RvZGF5IiwiY2FsX1llc3RlcmRheSIsInN1YnRyYWN0IiwiY2FsX0xhc3RXZWVrIiwiY2FsX0xhc3QzMERheXMiLCJjYWxfVGhpc01vbnRoIiwic3RhcnRPZiIsImNhbF9MYXN0TW9udGgiLCJhbHdheXNTaG93Q2FsZW5kYXJzIiwiYXV0b1VwZGF0ZUlucHV0IiwibGlua2VkQ2FsZW5kYXJzIiwibWF4RGF0ZSIsImxvY2FsZSIsInNlcGFyYXRvciIsImFwcGx5TGFiZWwiLCJjYWxfQXBwbHlCdG4iLCJjYW5jZWxMYWJlbCIsImNhbF9DYW5jZWxCdG4iLCJmcm9tTGFiZWwiLCJjYWxfZnJvbSIsInRvTGFiZWwiLCJjYWxfdG8iLCJjdXN0b21SYW5nZUxhYmVsIiwiY2FsX0N1c3RvbVBlcmlvZCIsImRheXNPZldlZWsiLCJjYWxlbmRhclRleHQiLCJkYXlzIiwibW9udGhOYW1lcyIsIm1vbnRocyIsImZpcnN0RGF5IiwiZGF0ZXJhbmdlcGlja2VyIiwiY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0IiwiZW5kIiwibGFiZWwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFDLFlBQUQsQ0FMVTs7QUFPdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsZUFBRCxDQVhNOztBQWF0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxrQkFBa0IsRUFBRUYsQ0FBQyxDQUFDLHNCQUFELENBakJDOztBQW1CdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsZUFBZSxFQUFFSCxDQUFDLENBQUMsbUJBQUQsQ0F2Qkk7O0FBeUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxtQkFBbUIsRUFBRUosQ0FBQyxDQUFDLHFCQUFELENBN0JBOztBQStCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsU0FBUyxFQUFFLEVBbkNXOztBQXFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLEVBekNhOztBQTJDdEI7QUFDSjtBQUNB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QUFBLE9BQU8sQ0FBQzFOLE9BQVIsR0FBa0JpSyxNQUFNLEVBQXhCO0FBQ0g7O0FBRUQzTSxJQUFBQSxpQkFBaUIsQ0FBQ0ksa0JBQWxCLENBQXFDZ1MsZUFBckMsQ0FDSWhDLE9BREosRUFFSXBRLGlCQUFpQixDQUFDcVMsMkJBRnRCLEVBdkMwRCxDQTRDMUQ7QUFDQTtBQUNILEdBejNCcUI7O0FBNDNCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lBLEVBQUFBLDJCQWw0QnNCLHVDQWs0Qk1yTSxLQWw0Qk4sRUFrNEJhc00sR0FsNEJiLEVBazRCa0JDLEtBbDRCbEIsRUFrNEJ5QjtBQUMzQztBQUNBdlMsSUFBQUEsaUJBQWlCLENBQUMrRCxXQUFsQixDQUE4Qi9ELGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ3lDLEdBQWhDLEVBQTlCLEVBRjJDLENBRzNDO0FBQ0gsR0F0NEJxQjs7QUF3NEJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJbUIsRUFBQUEsV0E1NEJzQix1QkE0NEJWRCxJQTU0QlUsRUE0NEJKO0FBQ2Q5RCxJQUFBQSxpQkFBaUIsQ0FBQ08sU0FBbEIsQ0FBNEIrRCxNQUE1QixDQUFtQ1IsSUFBbkMsRUFBeUNzRyxJQUF6QztBQUNBcEssSUFBQUEsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDcUssT0FBaEMsQ0FBd0MsS0FBeEMsRUFBK0N0QyxRQUEvQyxDQUF3RCxTQUF4RDtBQUNIO0FBLzRCcUIsQ0FBMUI7QUFrNUJBO0FBQ0E7QUFDQTs7QUFDQWhJLENBQUMsQ0FBQ3NTLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ6UyxFQUFBQSxpQkFBaUIsQ0FBQ2EsVUFBbEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNlbWFudGljTG9jYWxpemF0aW9uLCBFeHRlbnNpb25zQVBJLCBtb21lbnQsIGdsb2JhbFRyYW5zbGF0ZSwgQ0RSUGxheWVyLCBDZHJBUEksIFVzZXJNZXNzYWdlLCBBQ0xIZWxwZXIsIFNlY3VyaXR5VXRpbHMgKi9cblxuLyoqXG4gKiBjYWxsRGV0YWlsUmVjb3JkcyBtb2R1bGUuXG4gKiBAbW9kdWxlIGNhbGxEZXRhaWxSZWNvcmRzXG4gKi9cbmNvbnN0IGNhbGxEZXRhaWxSZWNvcmRzID0ge1xuICAgIC8qKlxuICAgICAqIFRoZSBjYWxsIGRldGFpbCByZWNvcmRzIHRhYmxlIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2RyVGFibGU6ICQoJyNjZHItdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsc2VhcmNoJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0ZSByYW5nZSBzZWxlY3RvciBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRhdGVSYW5nZVNlbGVjdG9yOiAkKCcjZGF0ZS1yYW5nZS1zZWxlY3RvcicpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHNlYXJjaCBDRFIgaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzZWFyY2hDRFJJbnB1dDogJCgnI3NlYXJjaC1jZHItaW5wdXQnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6ICQoJyNwYWdlLWxlbmd0aC1zZWxlY3QnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRhIHRhYmxlIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGRhdGFUYWJsZToge30sXG5cbiAgICAvKipcbiAgICAgKiBBbiBhcnJheSBvZiBwbGF5ZXJzLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBwbGF5ZXJzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgaW5kaWNhdGluZyBpZiBDRFIgZGF0YWJhc2UgaGFzIGFueSByZWNvcmRzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaGFzQ0RSUmVjb3JkczogdHJ1ZSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBlbXB0eSBkYXRhYmFzZSBwbGFjZWhvbGRlciBlbGVtZW50XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyOiAkKCcjY2RyLWVtcHR5LWRhdGFiYXNlLXBsYWNlaG9sZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBTdG9yYWdlIGtleSBmb3IgZmlsdGVyIHN0YXRlIGluIHNlc3Npb25TdG9yYWdlXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBTVE9SQUdFX0tFWTogJ2Nkcl9maWx0ZXJzX3N0YXRlJyxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgRGF0YVRhYmxlIGhhcyBjb21wbGV0ZWQgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBXSFk6IFByZXZlbnRzIHNhdmluZyBzdGF0ZSBkdXJpbmcgaW5pdGlhbCBsb2FkIGJlZm9yZSBmaWx0ZXJzIGFyZSByZXN0b3JlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGNhbGwgZGV0YWlsIHJlY29yZHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gTGlzdGVuIGZvciBoYXNoIGNoYW5nZXMgKHdoZW4gdXNlciBjbGlja3MgbWVudSBsaW5rIHdoaWxlIGFscmVhZHkgb24gcGFnZSlcbiAgICAgICAgLy8gV0hZOiBCcm93c2VyIGRvZXNuJ3QgcmVsb2FkIHBhZ2Ugb24gaGFzaC1vbmx5IFVSTCBjaGFuZ2VzXG4gICAgICAgICQoYGFbaHJlZj0nJHtnbG9iYWxSb290VXJsfWNhbGwtZGV0YWlsLXJlY29yZHMvaW5kZXgvI3Jlc2V0LWNhY2hlJ11gKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgLy8gUmVtb3ZlIGhhc2ggZnJvbSBVUkwgd2l0aG91dCBwYWdlIHJlbG9hZFxuICAgICAgICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsIG51bGwsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jbGVhckZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICAgICAgIC8vIEFsc28gY2xlYXIgcGFnZSBsZW5ndGggcHJlZmVyZW5jZVxuICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgICAvLyBSZWxvYWQgcGFnZSB0byBhcHBseSByZXNldFxuICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRmV0Y2ggbWV0YWRhdGEgZmlyc3QsIHRoZW4gaW5pdGlhbGl6ZSBEYXRhVGFibGUgd2l0aCBwcm9wZXIgZGF0ZSByYW5nZVxuICAgICAgICAvLyBXSFk6IFByZXZlbnRzIGRvdWJsZSByZXF1ZXN0IG9uIHBhZ2UgbG9hZFxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5mZXRjaExhdGVzdENEUkRhdGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZSBjdXJyZW50IGZpbHRlciBzdGF0ZSB0byBzZXNzaW9uU3RvcmFnZVxuICAgICAqIFN0b3JlcyBkYXRlIHJhbmdlLCBzZWFyY2ggdGV4dCwgY3VycmVudCBwYWdlLCBhbmQgcGFnZSBsZW5ndGhcbiAgICAgKi9cbiAgICBzYXZlRmlsdGVyc1N0YXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRmVhdHVyZSBkZXRlY3Rpb24gLSBleGl0IHNpbGVudGx5IGlmIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvblN0b3JhZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQ0RSXSBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICBkYXRlRnJvbTogbnVsbCxcbiAgICAgICAgICAgICAgICBkYXRlVG86IG51bGwsXG4gICAgICAgICAgICAgICAgc2VhcmNoVGV4dDogJycsXG4gICAgICAgICAgICAgICAgY3VycmVudFBhZ2U6IDAsXG4gICAgICAgICAgICAgICAgcGFnZUxlbmd0aDogY2FsbERldGFpbFJlY29yZHMuZ2V0UGFnZUxlbmd0aCgpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBHZXQgZGF0ZXMgZnJvbSBkYXRlcmFuZ2VwaWNrZXIgaW5zdGFuY2VcbiAgICAgICAgICAgIGNvbnN0IGRhdGVSYW5nZVBpY2tlciA9IGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRhKCdkYXRlcmFuZ2VwaWNrZXInKTtcbiAgICAgICAgICAgIGlmIChkYXRlUmFuZ2VQaWNrZXIgJiYgZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZSAmJiBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLmRhdGVGcm9tID0gZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZS5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kYXRlVG8gPSBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZS5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gR2V0IHNlYXJjaCB0ZXh0IGZyb20gaW5wdXQgZmllbGRcbiAgICAgICAgICAgIHN0YXRlLnNlYXJjaFRleHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpIHx8ICcnO1xuXG4gICAgICAgICAgICAvLyBHZXQgY3VycmVudCBwYWdlIGZyb20gRGF0YVRhYmxlIChpZiBpbml0aWFsaXplZClcbiAgICAgICAgICAgIGlmIChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUgJiYgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWdlSW5mbyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmluZm8oKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5jdXJyZW50UGFnZSA9IHBhZ2VJbmZvLnBhZ2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oY2FsbERldGFpbFJlY29yZHMuU1RPUkFHRV9LRVksIEpTT04uc3RyaW5naWZ5KHN0YXRlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbQ0RSXSBGYWlsZWQgdG8gc2F2ZSBmaWx0ZXJzIHRvIHNlc3Npb25TdG9yYWdlOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZpbHRlciBzdGF0ZSBmcm9tIHNlc3Npb25TdG9yYWdlXG4gICAgICogQHJldHVybnMge09iamVjdHxudWxsfSBTYXZlZCBzdGF0ZSBvYmplY3Qgb3IgbnVsbCBpZiBub3QgZm91bmQvaW52YWxpZFxuICAgICAqL1xuICAgIGxvYWRGaWx0ZXJzU3RhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBGZWF0dXJlIGRldGVjdGlvbiAtIHJldHVybiBudWxsIGlmIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvblN0b3JhZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQ0RSXSBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlIGZvciBsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJhd0RhdGEgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGNhbGxEZXRhaWxSZWNvcmRzLlNUT1JBR0VfS0VZKTtcbiAgICAgICAgICAgIGlmICghcmF3RGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzdGF0ZSA9IEpTT04ucGFyc2UocmF3RGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHN0YXRlIHN0cnVjdHVyZVxuICAgICAgICAgICAgaWYgKCFzdGF0ZSB8fCB0eXBlb2Ygc3RhdGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2xlYXJGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0NEUl0gRmFpbGVkIHRvIGxvYWQgZmlsdGVycyBmcm9tIHNlc3Npb25TdG9yYWdlOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGNvcnJ1cHRlZCBkYXRhXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jbGVhckZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgc2F2ZWQgZmlsdGVyIHN0YXRlIGZyb20gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKi9cbiAgICBjbGVhckZpbHRlcnNTdGF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvblN0b3JhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShjYWxsRGV0YWlsUmVjb3Jkcy5TVE9SQUdFX0tFWSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY2xlYXIgQ0RSIGZpbHRlcnMgZnJvbSBzZXNzaW9uU3RvcmFnZTonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEYXRhVGFibGUgYW5kIGV2ZW50IGhhbmRsZXJzXG4gICAgICogQ2FsbGVkIGFmdGVyIG1ldGFkYXRhIGlzIHJlY2VpdmVkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZUFuZEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRlYm91bmNlIHRpbWVyIHZhcmlhYmxlXG4gICAgICAgIGxldCBzZWFyY2hEZWJvdW5jZVRpbWVyID0gbnVsbDtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lciBpZiB0aGUgdXNlciBpcyBzdGlsbCB0eXBpbmdcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWFyY2hEZWJvdW5jZVRpbWVyKTtcblxuICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIGZvciBkZWxheWVkIGV4ZWN1dGlvblxuICAgICAgICAgICAgc2VhcmNoRGVib3VuY2VUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzXG4gICAgICAgICAgICAgICAgICAgIHx8IGUua2V5Q29kZSA9PT0gOFxuICAgICAgICAgICAgICAgICAgICB8fCBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHBhc3MgdGhlIHNlYXJjaCBrZXl3b3JkLCBkYXRlcyBhcmUgaGFuZGxlZCBzZXBhcmF0ZWx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWxheSBiZWZvcmUgZXhlY3V0aW5nIHRoZSBzZWFyY2hcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgY29sdW1ucyBkeW5hbWljYWxseSBiYXNlZCBvbiBBQ0wgcGVybWlzc2lvbnNcbiAgICAgICAgLy8gV0hZOiBWb2x0IHRlbXBsYXRlIGNvbmRpdGlvbmFsbHkgcmVuZGVycyBkZWxldGUgY29sdW1uIGhlYWRlciBiYXNlZCBvbiBpc0FsbG93ZWQoJ3NhdmUnKVxuICAgICAgICAvLyAnc2F2ZScgaXMgYSB2aXJ0dWFsIHBlcm1pc3Npb24gdGhhdCBpbmNsdWRlcyBkZWxldGUgY2FwYWJpbGl0eSBpbiBNb2R1bGVVc2Vyc1VJXG4gICAgICAgIC8vIElmIGNvbHVtbnMgY29uZmlnIGRvZXNuJ3QgbWF0Y2ggPHRoZWFkPiBjb3VudCwgRGF0YVRhYmxlcyB0aHJvd3MgJ3N0eWxlJyB1bmRlZmluZWQgZXJyb3JcbiAgICAgICAgY29uc3QgY2FuRGVsZXRlID0gdHlwZW9mIEFDTEhlbHBlciAhPT0gJ3VuZGVmaW5lZCcgJiYgQUNMSGVscGVyLmlzQWxsb3dlZCgnc2F2ZScpO1xuICAgICAgICBjb25zdCBjb2x1bW5zID0gW1xuICAgICAgICAgICAgeyBkYXRhOiBudWxsLCBvcmRlcmFibGU6IGZhbHNlIH0sICAvLyAwOiBleHBhbmQgaWNvbiBjb2x1bW5cbiAgICAgICAgICAgIHsgZGF0YTogMCB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMTogZGF0ZSAoYXJyYXkgaW5kZXggMClcbiAgICAgICAgICAgIHsgZGF0YTogMSB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMjogc3JjX251bSAoYXJyYXkgaW5kZXggMSlcbiAgICAgICAgICAgIHsgZGF0YTogMiB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMzogZHN0X251bSAoYXJyYXkgaW5kZXggMilcbiAgICAgICAgICAgIHsgZGF0YTogMyB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gNDogZHVyYXRpb24gKGFycmF5IGluZGV4IDMpXG4gICAgICAgIF07XG4gICAgICAgIGlmIChjYW5EZWxldGUpIHtcbiAgICAgICAgICAgIGNvbHVtbnMucHVzaCh7IGRhdGE6IG51bGwsIG9yZGVyYWJsZTogZmFsc2UgfSk7ICAvLyA1OiBhY3Rpb25zIGNvbHVtbiAobG9ncyBpY29uICsgZGVsZXRlKVxuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmRhdGFUYWJsZSh7XG4gICAgICAgICAgICBzZWFyY2g6IHtcbiAgICAgICAgICAgICAgICBzZWFyY2g6IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBjb2x1bW5zLFxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvY2RyJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJywgIC8vIFJFU1QgQVBJIHVzZXMgR0VUIGZvciBsaXN0IHJldHJpZXZhbFxuICAgICAgICAgICAgICAgIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgICAgIGxldCBpc0xpbmtlZElkU2VhcmNoID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gMS4gQWx3YXlzIGdldCBkYXRlcyBmcm9tIGRhdGUgcmFuZ2Ugc2VsZWN0b3IgdXNpbmcgZGF0ZXJhbmdlcGlja2VyIEFQSVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlUmFuZ2VQaWNrZXIgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IuZGF0YSgnZGF0ZXJhbmdlcGlja2VyJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRlUmFuZ2VQaWNrZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0RGF0ZSA9IGRhdGVSYW5nZVBpY2tlci5zdGFydERhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmREYXRlID0gZGF0ZVJhbmdlUGlja2VyLmVuZERhdGU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydERhdGUgJiYgc3RhcnREYXRlLmlzVmFsaWQoKSAmJiBlbmREYXRlICYmIGVuZERhdGUuaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRhdGVGcm9tID0gc3RhcnREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kYXRlVG8gPSBlbmREYXRlLmVuZE9mKCdkYXknKS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW06c3MnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIDIuIFByb2Nlc3Mgc2VhcmNoIGtleXdvcmQgZnJvbSBzZWFyY2ggaW5wdXQgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoS2V5d29yZCA9IGQuc2VhcmNoLnZhbHVlIHx8ICcnO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWFyY2hLZXl3b3JkLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5d29yZCA9IHNlYXJjaEtleXdvcmQudHJpbSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSBzZWFyY2ggcHJlZml4ZXM6IHNyYzosIGRzdDosIGRpZDosIGxpbmtlZGlkOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnc3JjOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IHNvdXJjZSBudW1iZXIgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zcmNfbnVtID0ga2V5d29yZC5zdWJzdHJpbmcoNCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ2RzdDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBkZXN0aW5hdGlvbiBudW1iZXIgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kc3RfbnVtID0ga2V5d29yZC5zdWJzdHJpbmcoNCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ2RpZDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBESUQgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kaWQgPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnbGlua2VkaWQ6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgbGlua2VkaWQgLSBpZ25vcmUgZGF0ZSByYW5nZSBmb3IgbGlua2VkaWQgc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmxpbmtlZGlkID0ga2V5d29yZC5zdWJzdHJpbmcoOSkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzTGlua2VkSWRTZWFyY2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkYXRlIHBhcmFtcyBmb3IgbGlua2VkaWQgc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHBhcmFtcy5kYXRlRnJvbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcGFyYW1zLmRhdGVUbztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRnVsbC10ZXh0IHNlYXJjaDogc2VhcmNoIGluIHNyY19udW0sIGRzdF9udW0sIGFuZCBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZXIgZXhwZWN0cyBzZWFyY2ggd2l0aG91dCBwcmVmaXggdG8gZmluZCBudW1iZXIgYW55d2hlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuc2VhcmNoID0ga2V5d29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJFU1QgQVBJIHBhZ2luYXRpb24gcGFyYW1ldGVyc1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMubGltaXQgPSBkLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9mZnNldCA9IGQuc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zb3J0ID0gJ3N0YXJ0JzsgIC8vIFNvcnQgYnkgY2FsbCBzdGFydCB0aW1lIGZvciBjaHJvbm9sb2dpY2FsIG9yZGVyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vcmRlciA9ICdERVNDJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFdlYlVJIGFsd2F5cyBuZWVkcyBncm91cGVkIHJlY29yZHMgKGJ5IGxpbmtlZGlkKSBmb3IgcHJvcGVyIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgLy8gQmFja2VuZCBkZWZhdWx0cyB0byBncm91cGVkPXRydWUsIGJ1dCBleHBsaWNpdCBpcyBiZXR0ZXIgdGhhbiBpbXBsaWNpdFxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZ3JvdXBlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRhdGFTcmM6IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIHJldHVybnMgUEJYQXBpUmVzdWx0IHN0cnVjdHVyZTpcbiAgICAgICAgICAgICAgICAgICAgLy8ge3Jlc3VsdDogdHJ1ZSwgZGF0YToge3JlY29yZHM6IFsuLi5dLCBwYWdpbmF0aW9uOiB7Li4ufX19XG4gICAgICAgICAgICAgICAgICAgIGlmIChqc29uLnJlc3VsdCAmJiBqc29uLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgcmVjb3JkcyBhbmQgcGFnaW5hdGlvbiBmcm9tIG5lc3RlZCBkYXRhIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdERhdGEgPSBqc29uLmRhdGEucmVjb3JkcyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2luYXRpb24gPSBqc29uLmRhdGEucGFnaW5hdGlvbiB8fCB7fTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IERhdGFUYWJsZXMgcGFnaW5hdGlvbiBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uLnJlY29yZHNUb3RhbCA9IHBhZ2luYXRpb24udG90YWwgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc0ZpbHRlcmVkID0gcGFnaW5hdGlvbi50b3RhbCB8fCAwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmFuc2Zvcm0gUkVTVCByZWNvcmRzIHRvIERhdGFUYWJsZSByb3dzXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbERldGFpbFJlY29yZHMudHJhbnNmb3JtUmVzdFRvRGF0YVRhYmxlKHJlc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBiZWZvcmVTZW5kOiBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIEJlYXJlciB0b2tlbiBmb3IgQVBJIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke1Rva2VuTWFuYWdlci5hY2Nlc3NUb2tlbn1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICAvL3Njcm9sbFk6ICQod2luZG93KS5oZWlnaHQoKSAtIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vZmZzZXQoKS50b3AtMTUwLFxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRQYWdlTGVuZ3RoKCksXG4gICAgICAgICAgICBsYW5ndWFnZToge1xuICAgICAgICAgICAgICAgIC4uLlNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgICAgICBlbXB0eVRhYmxlOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRFbXB0eVRhYmxlTWVzc2FnZSgpLFxuICAgICAgICAgICAgICAgIHplcm9SZWNvcmRzOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRFbXB0eVRhYmxlTWVzc2FnZSgpXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIENEUiByb3cuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLkRUX1Jvd0NsYXNzLmluZGV4T2YoXCJkZXRhaWxlZFwiKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCc8aSBjbGFzcz1cImljb24gY2FyZXQgZG93blwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgxKS5odG1sKGRhdGFbMF0pO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgyKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzFdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtY2RyLW5hbWUnLCBkYXRhWzZdIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoZGF0YVsyXSlcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWVkLXVwZGF0ZScpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLWNkci1uYW1lJywgZGF0YVs3XSB8fCAnJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBEdXJhdGlvbiBjb2x1bW4gKG5vIGljb25zKVxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSg0KS5odG1sKGRhdGFbM10pLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBBY3Rpb25zIGNvbHVtbjogb25seSByZW5kZXIgaWYgdXNlciBoYXMgZGVsZXRlIHBlcm1pc3Npb25cbiAgICAgICAgICAgICAgICAvLyBXSFk6IFZvbHQgdGVtcGxhdGUgY29uZGl0aW9uYWxseSByZW5kZXJzIHRoaXMgY29sdW1uIGJhc2VkIG9uIGlzQWxsb3dlZCgnZGVsZXRlJylcbiAgICAgICAgICAgICAgICBpZiAoIWNhbkRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTGFzdCBjb2x1bW46IGxvZyBpY29uICsgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGxldCBhY3Rpb25zSHRtbCA9ICcnO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGxvZyBpY29uIGlmIHVzZXIgaGFzIGFjY2VzcyB0byBTeXN0ZW0gRGlhZ25vc3RpY1xuICAgICAgICAgICAgICAgIC8vIFdIWTogTG9nIGljb24gbGlua3MgdG8gc3lzdGVtLWRpYWdub3N0aWMgcGFnZSB3aGljaCByZXF1aXJlcyBzcGVjaWZpYyBwZXJtaXNzaW9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhblZpZXdMb2dzID0gdHlwZW9mIEFDTEhlbHBlciAhPT0gJ3VuZGVmaW5lZCcgJiYgQUNMSGVscGVyLmlzQWxsb3dlZCgndmlld1N5c3RlbURpYWdub3N0aWMnKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FuVmlld0xvZ3MgJiYgZGF0YS5pZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnNIdG1sICs9IGA8aSBkYXRhLWlkcz1cIiR7ZGF0YS5pZHN9XCIgY2xhc3M9XCJmaWxlIGFsdGVybmF0ZSBvdXRsaW5lIGljb25cIiBzdHlsZT1cImN1cnNvcjogcG9pbnRlcjsgbWFyZ2luLXJpZ2h0OiA4cHg7XCI+PC9pPmA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGRlbGV0ZSBidXR0b25cbiAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZSB0d28tc3RlcHMtZGVsZXRlIG1lY2hhbmlzbSB0byBwcmV2ZW50IGFjY2lkZW50YWwgZGVsZXRpb25cbiAgICAgICAgICAgICAgICAvLyBGaXJzdCBjbGljayBjaGFuZ2VzIHRyYXNoIGljb24gdG8gY2xvc2UgaWNvbiwgc2Vjb25kIGNsaWNrIGRlbGV0ZXNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZSBkYXRhLkRUX1Jvd0lkIHdoaWNoIGNvbnRhaW5zIGxpbmtlZGlkIGZvciBncm91cGVkIHJlY29yZHNcbiAgICAgICAgICAgICAgICBhY3Rpb25zSHRtbCArPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInR3by1zdGVwcy1kZWxldGUgZGVsZXRlLXJlY29yZCBwb3B1cGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1yZWNvcmQtaWQ9XCIke2RhdGEuRFRfUm93SWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0RlbGV0ZVJlY29yZCB8fCAnRGVsZXRlIHJlY29yZCd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIiBzdHlsZT1cIm1hcmdpbjogMDtcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5gO1xuXG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDUpLmh0bWwoYWN0aW9uc0h0bWwpLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSW5pdGlhbGl6YXRpb24gY29tcGxldGUgY2FsbGJhY2sgLSBmaXJlZCBhZnRlciBmaXJzdCBkYXRhIGxvYWRcbiAgICAgICAgICAgICAqIFdIWTogUmVzdG9yZSBmaWx0ZXJzIEFGVEVSIERhdGFUYWJsZSBoYXMgbG9hZGVkIGluaXRpYWwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbml0Q29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGZsYWcgRklSU1QgdG8gYWxsb3cgc3RhdGUgc2F2aW5nIGR1cmluZyBmaWx0ZXIgcmVzdG9yYXRpb25cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAvLyBOb3cgcmVzdG9yZSBmaWx0ZXJzIC0gZHJhdyBldmVudCB3aWxsIGNvcnJlY3RseSBzYXZlIHRoZSByZXN0b3JlZCBzdGF0ZVxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLkRhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIFNlYXJjaCBjb21wb25lbnQgQUZURVIgRGF0YVRhYmxlIGlzIGNyZWF0ZWRcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCh7XG4gICAgICAgICAgICBtaW5DaGFyYWN0ZXJzOiAwLFxuICAgICAgICAgICAgc2VhcmNoT25Gb2N1czogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hGaWVsZHM6IFsndGl0bGUnXSxcbiAgICAgICAgICAgIHNob3dOb1Jlc3VsdHM6IGZhbHNlLFxuICAgICAgICAgICAgc291cmNlOiBbXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciwgdmFsdWU6ICdzcmM6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlEZXN0TnVtYmVyLCB2YWx1ZTogJ2RzdDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeURJRCwgdmFsdWU6ICdkaWQ6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlMaW5rZWRJRCwgdmFsdWU6ICdsaW5rZWRpZDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSwgdmFsdWU6ICcnIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb25TZWxlY3Q6IGZ1bmN0aW9uKHJlc3VsdCwgcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbChyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goJ2hpZGUgcmVzdWx0cycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHNlYXJjaCB3aGVuIHlvdSBjbGljayBvbiB0aGUgaWNvblxuICAgICAgICAkKCcjc2VhcmNoLWljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guZm9jdXMoKTtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goJ3F1ZXJ5Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIHRvIHNhdmUgdGhlIHVzZXIncyBwYWdlIGxlbmd0aCBzZWxlY3Rpb24gYW5kIHVwZGF0ZSB0aGUgdGFibGVcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZShwYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VMZW5ndGggPT09ICdhdXRvJykge1xuICAgICAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoID0gY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcsIHBhZ2VMZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHRoZSBldmVudCBmcm9tIGJ1YmJsaW5nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgc2VsZWN0IGlucHV0IHZhbHVlIHRvIHRoZSBzYXZlZCB2YWx1ZSBpZiBpdCBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBzYXZlZFBhZ2VMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBTa2lwIHNhdmluZyBzdGF0ZSBkdXJpbmcgaW5pdGlhbCBsb2FkIGJlZm9yZSBmaWx0ZXJzIGFyZSByZXN0b3JlZFxuICAgICAgICAgICAgaWYgKCFjYWxsRGV0YWlsUmVjb3Jkcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTYXZlIHN0YXRlIGFmdGVyIGV2ZXJ5IGRyYXcgKHBhZ2luYXRpb24sIHNlYXJjaCwgZGF0ZSBjaGFuZ2UpXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5zYXZlRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3IgY2xpY2tpbmcgb24gaWNvbiB3aXRoIGRhdGEtaWRzIChvcGVuIGluIG5ldyB3aW5kb3cpXG4gICAgICAgIC8vIFdIWTogQ2xpY2tpbmcgb24gaWNvbiBzaG91bGQgb3BlbiBTeXN0ZW0gRGlhZ25vc3RpYyBpbiBuZXcgd2luZG93IHRvIHZpZXcgdmVyYm9zZSBsb2dzXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAnW2RhdGEtaWRzXScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHJvdyB0b2dnbGVcblxuICAgICAgICAgICAgY29uc3QgaWRzID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtaWRzJyk7XG4gICAgICAgICAgICBpZiAoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFdIWTogRm9ybWF0IGFzIHF1ZXJ5IHBhcmFtICsgaGFzaDogP2ZpbHRlcj0uLi4jZmlsZT0uLi5cbiAgICAgICAgICAgICAgICAvLyBPcGVuIGluIG5ldyB3aW5kb3cgdG8gYWxsb3cgdmlld2luZyBsb2dzIHdoaWxlIGtlZXBpbmcgQ0RSIHRhYmxlIHZpc2libGVcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBgJHtnbG9iYWxSb290VXJsfXN5c3RlbS1kaWFnbm9zdGljL2luZGV4Lz9maWx0ZXI9JHtlbmNvZGVVUklDb21wb25lbnQoaWRzKX0jZmlsZT1hc3RlcmlzayUyRnZlcmJvc2VgO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5vcGVuKHVybCwgJ19ibGFuaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgZm9yIG9wZW5pbmcgYW5kIGNsb3NpbmcgZGV0YWlsc1xuICAgICAgICAvLyBXSFk6IE9ubHkgZXhwYW5kL2NvbGxhcHNlIG9uIGZpcnN0IGNvbHVtbiAoY2FyZXQgaWNvbikgY2xpY2ssIG5vdCBvbiBhY3Rpb24gaWNvbnNcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICd0ci5kZXRhaWxlZCB0ZDpmaXJzdC1jaGlsZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ciA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucm93KHRyKTtcblxuICAgICAgICAgICAgaWYgKHJvdy5jaGlsZC5pc1Nob3duKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIHJvdyBpcyBhbHJlYWR5IG9wZW4gLSBjbG9zZSBpdFxuICAgICAgICAgICAgICAgIHJvdy5jaGlsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgdHIucmVtb3ZlQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE9wZW4gdGhpcyByb3dcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoY2FsbERldGFpbFJlY29yZHMuc2hvd1JlY29yZHMocm93LmRhdGEoKSkpLnNob3coKTtcbiAgICAgICAgICAgICAgICB0ci5hZGRDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoKS5maW5kKCcuZGV0YWlsLXJlY29yZC1yb3cnKS5lYWNoKChpbmRleCwgcGxheWVyUm93KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gJChwbGF5ZXJSb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ0RSUGxheWVyKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHNlY29uZCBjbGljayBvbiBkZWxldGUgYnV0dG9uIChhZnRlciB0d28tc3RlcHMtZGVsZXRlIGNoYW5nZXMgaWNvbiB0byBjbG9zZSlcbiAgICAgICAgLy8gV0hZOiBUd28tc3RlcHMtZGVsZXRlIG1lY2hhbmlzbSBwcmV2ZW50cyBhY2NpZGVudGFsIGRlbGV0aW9uXG4gICAgICAgIC8vIEZpcnN0IGNsaWNrOiB0cmFzaCDihpIgY2xvc2UgKGJ5IGRlbGV0ZS1zb21ldGhpbmcuanMpLCBTZWNvbmQgY2xpY2s6IGV4ZWN1dGUgZGVsZXRpb25cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICdhLmRlbGV0ZS1yZWNvcmQ6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHJvdyBleHBhbnNpb25cblxuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXJlY29yZC1pZCcpO1xuXG4gICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBZGQgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQgbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBBbHdheXMgZGVsZXRlIHdpdGggcmVjb3JkaW5ncyBhbmQgbGlua2VkIHJlY29yZHNcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRlbGV0ZVJlY29yZChyZWNvcmRJZCwgJGJ1dHRvbik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXN0b3JlIGZpbHRlcnMgZnJvbSBzYXZlZCBzdGF0ZSBhZnRlciBEYXRhVGFibGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBXSFk6IE11c3QgYmUgY2FsbGVkIGFmdGVyIERhdGFUYWJsZSBpcyBjcmVhdGVkIHRvIHJlc3RvcmUgc2VhcmNoIGFuZCBwYWdlXG4gICAgICovXG4gICAgcmVzdG9yZUZpbHRlcnNGcm9tU3RhdGUoKSB7XG4gICAgICAgIGNvbnN0IHNhdmVkU3RhdGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy5sb2FkRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgIGlmICghc2F2ZWRTdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVzdG9yZSBzZWFyY2ggdGV4dCB0byBpbnB1dCBmaWVsZFxuICAgICAgICBpZiAoc2F2ZWRTdGF0ZS5zZWFyY2hUZXh0KSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbChzYXZlZFN0YXRlLnNlYXJjaFRleHQpO1xuICAgICAgICAgICAgLy8gQXBwbHkgc2VhcmNoIHRvIERhdGFUYWJsZVxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaChzYXZlZFN0YXRlLnNlYXJjaFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVzdG9yZSBwYWdlIG51bWJlciB3aXRoIGRlbGF5XG4gICAgICAgIC8vIFdIWTogRGF0YVRhYmxlIGlnbm9yZXMgcGFnZSgpIGR1cmluZyBpbml0Q29tcGxldGUsIG5lZWQgc2V0VGltZW91dCB0byBhbGxvdyBpbml0aWFsaXphdGlvbiB0byBmdWxseSBjb21wbGV0ZVxuICAgICAgICBpZiAoc2F2ZWRTdGF0ZS5jdXJyZW50UGFnZSkge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2Uoc2F2ZWRTdGF0ZS5jdXJyZW50UGFnZSkuZHJhdyhmYWxzZSk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCkge1xuICAgICAgICAgICAgLy8gSWYgb25seSBzZWFyY2ggdGV4dCBleGlzdHMsIHN0aWxsIG5lZWQgdG8gZHJhd1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLmRyYXcoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgQ0RSIHJlY29yZCB2aWEgUkVTVCBBUElcbiAgICAgKiBXSFk6IERlbGV0ZXMgYnkgbGlua2VkaWQgLSBhdXRvbWF0aWNhbGx5IHJlbW92ZXMgZW50aXJlIGNvbnZlcnNhdGlvbiB3aXRoIGFsbCBsaW5rZWQgcmVjb3Jkc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIENEUiBsaW5rZWRpZCAobGlrZSBcIm1pa29wYngtMTc2MDc4NDc5My40NjI3XCIpXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRidXR0b24gLSBCdXR0b24gZWxlbWVudCB0byB1cGRhdGUgc3RhdGVcbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQocmVjb3JkSWQsICRidXR0b24pIHtcbiAgICAgICAgLy8gQWx3YXlzIGRlbGV0ZSB3aXRoIHJlY29yZGluZyBmaWxlc1xuICAgICAgICAvLyBXSFk6IGxpbmtlZGlkIGF1dG9tYXRpY2FsbHkgZGVsZXRlcyBhbGwgbGlua2VkIHJlY29yZHMgKG5vIGRlbGV0ZUxpbmtlZCBwYXJhbWV0ZXIgbmVlZGVkKVxuICAgICAgICBDZHJBUEkuZGVsZXRlUmVjb3JkKHJlY29yZElkLCB7IGRlbGV0ZVJlY29yZGluZzogdHJ1ZSB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIFNpbGVudGx5IHJlbG9hZCB0aGUgRGF0YVRhYmxlIHRvIHJlZmxlY3QgY2hhbmdlc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogVmlzdWFsIGZlZWRiYWNrIChkaXNhcHBlYXJpbmcgcm93KSBpcyBlbm91Z2gsIG5vIG5lZWQgZm9yIHN1Y2Nlc3MgdG9hc3RcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuYWpheC5yZWxvYWQobnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2Ugb25seSBvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSByZXNwb25zZT8ubWVzc2FnZXM/LmVycm9yPy5bMF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNkcl9EZWxldGVGYWlsZWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBkZWxldGUgcmVjb3JkJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNc2cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgcGFnaW5hdGlvbiBjb250cm9scyB2aXNpYmlsaXR5IGJhc2VkIG9uIGRhdGEgc2l6ZVxuICAgICAqL1xuICAgIHRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpIHtcbiAgICAgICAgY29uc3QgaW5mbyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmluZm8oKTtcbiAgICAgICAgaWYgKGluZm8ucGFnZXMgPD0gMSkge1xuICAgICAgICAgICAgJChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUudGFibGUoKS5jb250YWluZXIoKSkuZmluZCgnLmRhdGFUYWJsZXNfcGFnaW5hdGUnKS5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS50YWJsZSgpLmNvbnRhaW5lcigpKS5maW5kKCcuZGF0YVRhYmxlc19wYWdpbmF0ZScpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIENEUiBtZXRhZGF0YSAoZGF0ZSByYW5nZSkgdXNpbmcgQ2RyQVBJXG4gICAgICogV0hZOiBMaWdodHdlaWdodCByZXF1ZXN0IHJldHVybnMgb25seSBtZXRhZGF0YSAoZGF0ZXMpLCBub3QgZnVsbCBDRFIgcmVjb3Jkc1xuICAgICAqIEF2b2lkcyBkb3VibGUgcmVxdWVzdCBvbiBwYWdlIGxvYWRcbiAgICAgKi9cbiAgICBmZXRjaExhdGVzdENEUkRhdGUoKSB7XG4gICAgICAgIC8vIENoZWNrIGZvciBzYXZlZCBzdGF0ZSBmaXJzdFxuICAgICAgICBjb25zdCBzYXZlZFN0YXRlID0gY2FsbERldGFpbFJlY29yZHMubG9hZEZpbHRlcnNTdGF0ZSgpO1xuXG4gICAgICAgIENkckFQSS5nZXRNZXRhZGF0YSh7IGxpbWl0OiAxMDAgfSwgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEuaGFzUmVjb3Jkcykge1xuICAgICAgICAgICAgICAgIGxldCBzdGFydERhdGUsIGVuZERhdGU7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIHNhdmVkIHN0YXRlIHdpdGggZGF0ZXMsIHVzZSB0aG9zZSBpbnN0ZWFkIG9mIG1ldGFkYXRhXG4gICAgICAgICAgICAgICAgaWYgKHNhdmVkU3RhdGUgJiYgc2F2ZWRTdGF0ZS5kYXRlRnJvbSAmJiBzYXZlZFN0YXRlLmRhdGVUbykge1xuICAgICAgICAgICAgICAgICAgICBzdGFydERhdGUgPSBtb21lbnQoc2F2ZWRTdGF0ZS5kYXRlRnJvbSk7XG4gICAgICAgICAgICAgICAgICAgIGVuZERhdGUgPSBtb21lbnQoc2F2ZWRTdGF0ZS5kYXRlVG8pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgbWV0YWRhdGEgZGF0ZSBzdHJpbmdzIHRvIG1vbWVudCBvYmplY3RzXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0RGF0ZSA9IG1vbWVudChkYXRhLmVhcmxpZXN0RGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGVuZERhdGUgPSBtb21lbnQoZGF0YS5sYXRlc3REYXRlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3Ioc3RhcnREYXRlLCBlbmREYXRlKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgRGF0YVRhYmxlIG9ubHkgaWYgd2UgaGF2ZSByZWNvcmRzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBEYXRhVGFibGUgbmVlZHMgZGF0ZSByYW5nZSB0byBiZSBzZXQgZmlyc3RcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm8gcmVjb3JkcyBpbiBkYXRhYmFzZSBhdCBhbGwgb3IgQVBJIGVycm9yXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3JkcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIoKTtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBpbml0aWFsaXplIERhdGFUYWJsZSBhdCBhbGwgLSBqdXN0IHNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgYSBzdHlsZWQgZW1wdHkgdGFibGUgbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgbWVzc2FnZSBmb3IgZW1wdHkgdGFibGVcbiAgICAgKi9cbiAgICBnZXRFbXB0eVRhYmxlTWVzc2FnZSgpIHtcbiAgICAgICAgLy8gSWYgZGF0YWJhc2UgaXMgZW1wdHksIHdlIGRvbid0IHNob3cgdGhpcyBtZXNzYWdlIGluIHRhYmxlXG4gICAgICAgIGlmICghY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3Jkcykge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGZpbHRlcmVkIGVtcHR5IHN0YXRlIG1lc3NhZ2VcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBsYWNlaG9sZGVyIHNlZ21lbnRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic2VhcmNoIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0ZpbHRlcmVkRW1wdHlUaXRsZX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlubGluZVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0XCI+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9GaWx0ZXJlZEVtcHR5RGVzY3JpcHRpb259XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIHRoZSBlbXB0eSBkYXRhYmFzZSBwbGFjZWhvbGRlciBhbmQgaGlkZXMgdGhlIHRhYmxlXG4gICAgICovXG4gICAgc2hvd0VtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcigpIHtcbiAgICAgICAgLy8gSGlkZSB0aGUgdGFibGUgaXRzZWxmIChEYXRhVGFibGUgd29uJ3QgYmUgaW5pdGlhbGl6ZWQpXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5oaWRlKCk7XG5cbiAgICAgICAgLy8gSGlkZSBzZWFyY2ggYW5kIGRhdGUgY29udHJvbHNcbiAgICAgICAgJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKS5jbG9zZXN0KCcudWkucm93JykuaGlkZSgpO1xuXG4gICAgICAgIC8vIFNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGVtcHR5RGF0YWJhc2VQbGFjZWhvbGRlci5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRyYW5zZm9ybSBSRVNUIEFQSSBncm91cGVkIHJlY29yZHMgdG8gRGF0YVRhYmxlIHJvdyBmb3JtYXRcbiAgICAgKiBAcGFyYW0ge0FycmF5fSByZXN0RGF0YSAtIEFycmF5IG9mIGdyb3VwZWQgQ0RSIHJlY29yZHMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgRGF0YVRhYmxlIHJvd3NcbiAgICAgKi9cbiAgICB0cmFuc2Zvcm1SZXN0VG9EYXRhVGFibGUocmVzdERhdGEpIHtcbiAgICAgICAgcmV0dXJuIHJlc3REYXRhLm1hcChncm91cCA9PiB7XG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgdGltaW5nIGRpc3BsYXlcbiAgICAgICAgICAgIGNvbnN0IGJpbGxzZWMgPSBncm91cC50b3RhbEJpbGxzZWMgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVGb3JtYXQgPSAoYmlsbHNlYyA8IDM2MDApID8gJ21tOnNzJyA6ICdISDptbTpzcyc7XG4gICAgICAgICAgICBjb25zdCB0aW1pbmcgPSBiaWxsc2VjID4gMCA/IG1vbWVudC51dGMoYmlsbHNlYyAqIDEwMDApLmZvcm1hdCh0aW1lRm9ybWF0KSA6ICcnO1xuXG4gICAgICAgICAgICAvLyBGb3JtYXQgc3RhcnQgZGF0ZVxuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkRGF0ZSA9IG1vbWVudChncm91cC5zdGFydCkuZm9ybWF0KCdERC1NTS1ZWVlZIEhIOm1tOnNzJyk7XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgcmVjb3JkaW5nIHJlY29yZHMgLSBmaWx0ZXIgb25seSByZWNvcmRzIHdpdGggYWN0dWFsIHJlY29yZGluZyBmaWxlc1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkaW5ncyA9IChncm91cC5yZWNvcmRzIHx8IFtdKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIociA9PiByLnJlY29yZGluZ2ZpbGUgJiYgci5yZWNvcmRpbmdmaWxlLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgLm1hcChyID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIGlkOiByLmlkLFxuICAgICAgICAgICAgICAgICAgICBzcmNfbnVtOiByLnNyY19udW0sXG4gICAgICAgICAgICAgICAgICAgIHNyY19uYW1lOiByLnNyY19uYW1lIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICBkc3RfbnVtOiByLmRzdF9udW0sXG4gICAgICAgICAgICAgICAgICAgIGRzdF9uYW1lOiByLmRzdF9uYW1lIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmRpbmdmaWxlOiByLnJlY29yZGluZ2ZpbGUsXG4gICAgICAgICAgICAgICAgICAgIHBsYXliYWNrX3VybDogci5wbGF5YmFja191cmwsICAgLy8gVG9rZW4tYmFzZWQgVVJMIGZvciBwbGF5YmFja1xuICAgICAgICAgICAgICAgICAgICBkb3dubG9hZF91cmw6IHIuZG93bmxvYWRfdXJsICAgIC8vIFRva2VuLWJhc2VkIFVSTCBmb3IgZG93bmxvYWRcbiAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIC8vIERldGVybWluZSBDU1MgY2xhc3NcbiAgICAgICAgICAgIGNvbnN0IGhhc1JlY29yZGluZ3MgPSByZWNvcmRpbmdzLmxlbmd0aCA+IDA7XG4gICAgICAgICAgICBjb25zdCBpc0Fuc3dlcmVkID0gZ3JvdXAuZGlzcG9zaXRpb24gPT09ICdBTlNXRVJFRCc7XG4gICAgICAgICAgICBjb25zdCBkdFJvd0NsYXNzID0gaGFzUmVjb3JkaW5ncyA/ICdkZXRhaWxlZCcgOiAndWknO1xuICAgICAgICAgICAgY29uc3QgbmVnYXRpdmVDbGFzcyA9IGlzQW5zd2VyZWQgPyAnJyA6ICcgbmVnYXRpdmUnO1xuXG4gICAgICAgICAgICAvLyBDb2xsZWN0IHVuaXF1ZSB2ZXJib3NlIGNhbGwgSURzXG4gICAgICAgICAgICBjb25zdCBpZHMgPSBbLi4ubmV3IFNldChcbiAgICAgICAgICAgICAgICAoZ3JvdXAucmVjb3JkcyB8fCBbXSlcbiAgICAgICAgICAgICAgICAgICAgLm1hcChyID0+IHIudmVyYm9zZV9jYWxsX2lkKVxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGlkID0+IGlkICYmIGlkLmxlbmd0aCA+IDApXG4gICAgICAgICAgICApXS5qb2luKCcmJyk7XG5cbiAgICAgICAgICAgIC8vIFJldHVybiBEYXRhVGFibGUgcm93IGZvcm1hdFxuICAgICAgICAgICAgLy8gRGF0YVRhYmxlcyBuZWVkcyBib3RoIGFycmF5IGluZGljZXMgQU5EIHNwZWNpYWwgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gW1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZERhdGUsICAgICAgICAgICAgICAvLyAwOiBkYXRlXG4gICAgICAgICAgICAgICAgZ3JvdXAuc3JjX251bSwgICAgICAgICAgICAgIC8vIDE6IHNvdXJjZSBudW1iZXJcbiAgICAgICAgICAgICAgICBncm91cC5kc3RfbnVtIHx8IGdyb3VwLmRpZCwgLy8gMjogZGVzdGluYXRpb24gbnVtYmVyIG9yIERJRFxuICAgICAgICAgICAgICAgIHRpbWluZywgICAgICAgICAgICAgICAgICAgICAvLyAzOiBkdXJhdGlvblxuICAgICAgICAgICAgICAgIHJlY29yZGluZ3MsICAgICAgICAgICAgICAgICAvLyA0OiByZWNvcmRpbmcgcmVjb3JkcyBhcnJheVxuICAgICAgICAgICAgICAgIGdyb3VwLmRpc3Bvc2l0aW9uLCAgICAgICAgICAvLyA1OiBkaXNwb3NpdGlvblxuICAgICAgICAgICAgICAgIGdyb3VwLnNyY19uYW1lIHx8ICcnLCAgICAgICAvLyA2OiBzb3VyY2UgY2FsbGVyIG5hbWUgZnJvbSBDRFJcbiAgICAgICAgICAgICAgICBncm91cC5kc3RfbmFtZSB8fCAnJyAgICAgICAgLy8gNzogZGVzdGluYXRpb24gY2FsbGVyIG5hbWUgZnJvbSBDRFJcbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIC8vIEFkZCBEYXRhVGFibGVzIHNwZWNpYWwgcHJvcGVydGllc1xuICAgICAgICAgICAgcm93LkRUX1Jvd0lkID0gZ3JvdXAubGlua2VkaWQ7XG4gICAgICAgICAgICByb3cuRFRfUm93Q2xhc3MgPSBkdFJvd0NsYXNzICsgbmVnYXRpdmVDbGFzcztcbiAgICAgICAgICAgIHJvdy5pZHMgPSBpZHM7IC8vIFN0b3JlIHJhdyBJRHMgd2l0aG91dCBlbmNvZGluZyAtIGVuY29kaW5nIHdpbGwgYmUgYXBwbGllZCB3aGVuIGJ1aWxkaW5nIFVSTFxuXG4gICAgICAgICAgICByZXR1cm4gcm93O1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSBzZXQgb2YgY2FsbCByZWNvcmRzIHdoZW4gYSByb3cgaXMgY2xpY2tlZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjYWxsIHJlY29yZHMuXG4gICAgICovXG4gICAgc2hvd1JlY29yZHMoZGF0YSkge1xuICAgICAgICBsZXQgaHRtbFBsYXllciA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIHRhYmxlIGNkci1wbGF5ZXJcIj48dGJvZHk+JztcbiAgICAgICAgZGF0YVs0XS5mb3JFYWNoKChyZWNvcmQsIGkpID0+IHtcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IG51bGxcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvdyBkaXNhYmxlZFwiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCJcIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiIGRhdGEtdmFsdWU9XCJcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiIGRhdGEtY2RyLW5hbWU9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChyZWNvcmQuc3JjX25hbWUgfHwgJycpfVwiPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJlY29yZC5zcmNfbnVtKX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCIgZGF0YS1jZHItbmFtZT1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJlY29yZC5kc3RfbmFtZSB8fCAnJyl9XCI+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocmVjb3JkLmRzdF9udW0pfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdG9rZW4tYmFzZWQgVVJMcyBpbnN0ZWFkIG9mIGRpcmVjdCBmaWxlIHBhdGhzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBTZWN1cml0eSAtIGhpZGVzIGFjdHVhbCBmaWxlIHBhdGhzIGZyb20gdXNlclxuICAgICAgICAgICAgICAgIC8vIFR3byBzZXBhcmF0ZSBlbmRwb2ludHM6IDpwbGF5YmFjayAoaW5saW5lKSBhbmQgOmRvd25sb2FkIChmaWxlKVxuICAgICAgICAgICAgICAgIGNvbnN0IHBsYXliYWNrVXJsID0gcmVjb3JkLnBsYXliYWNrX3VybCB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBkb3dubG9hZFVybCA9IHJlY29yZC5kb3dubG9hZF91cmwgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3dcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiJHtwbGF5YmFja1VybH1cIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IGljb24gdG9wIGxlZnQgcG9pbnRpbmcgZHJvcGRvd24gZG93bmxvYWQtZm9ybWF0LWRyb3Bkb3duXCIgZGF0YS1kb3dubG9hZC11cmw9XCIke2Rvd25sb2FkVXJsfVwiPlxuICAgIFx0XHQ8aSBjbGFzcz1cImRvd25sb2FkIGljb25cIj48L2k+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIndlYm1cIj5XZWJNIChPcHVzKTwvZGl2PlxuICAgIFx0XHRcdDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1mb3JtYXQ9XCJtcDNcIj5NUDM8L2Rpdj5cbiAgICBcdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtZm9ybWF0PVwid2F2XCI+V0FWPC9kaXY+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIm9nZ1wiPk9HRyAoT3B1cyk8L2Rpdj5cbiAgICBcdFx0PC9kaXY+XG4gICAgXHQ8L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCIgZGF0YS1jZHItbmFtZT1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJlY29yZC5zcmNfbmFtZSB8fCAnJyl9XCI+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocmVjb3JkLnNyY19udW0pfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIiBkYXRhLWNkci1uYW1lPVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocmVjb3JkLmRzdF9uYW1lIHx8ICcnKX1cIj4ke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChyZWNvcmQuZHN0X251bSl9PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodG1sUGxheWVyICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgcmV0dXJuIGh0bWxQbGF5ZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHBhZ2UgbGVuZ3RoIGZvciBEYXRhVGFibGUsIGNvbnNpZGVyaW5nIHVzZXIncyBzYXZlZCBwcmVmZXJlbmNlXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyBzYXZlZCB2YWx1ZSBvciB1c2UgdGhlIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCB2YWx1ZSBpZiBub25lIGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIHJldHVybiBzYXZlZFBhZ2VMZW5ndGggPyBwYXJzZUludChzYXZlZFBhZ2VMZW5ndGgsIDEwKSA6IGNhbGxEZXRhaWxSZWNvcmRzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHJvd3MgdGhhdCBjYW4gZml0IG9uIGEgcGFnZSBiYXNlZCBvbiB0aGUgY3VycmVudCB3aW5kb3cgaGVpZ2h0LlxuICAgICAqIER5bmFtaWNhbGx5IG1lYXN1cmVzIHRoZSBhY3R1YWwgb3ZlcmhlYWQgZnJvbSBET00gZWxlbWVudHMgaW5zdGVhZCBvZiB1c2luZyBhIGhhcmRjb2RlZCBlc3RpbWF0ZS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIE1lYXN1cmUgYWN0dWFsIHJvdyBoZWlnaHQgZnJvbSByZW5kZXJlZCByb3csIGZhbGxiYWNrIHRvIGNvbXBhY3QgdGFibGUgZGVmYXVsdCAofjM2cHgpXG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZmluZCgndGJvZHkgPiB0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKSB8fCAzNjtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgb3ZlcmhlYWQgZHluYW1pY2FsbHkgZnJvbSB0aGUgdGFibGUncyBwb3NpdGlvbiBpbiB0aGUgcGFnZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGxldCBvdmVyaGVhZCA9IDQwMDsgLy8gc2FmZSBmYWxsYmFja1xuICAgICAgICBjb25zdCB0YWJsZUVsID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmdldCgwKTtcbiAgICAgICAgaWYgKHRhYmxlRWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHRoZWFkID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmZpbmQoJ3RoZWFkJyk7XG4gICAgICAgICAgICBjb25zdCB0aGVhZEhlaWdodCA9IHRoZWFkLmxlbmd0aCA/IHRoZWFkLm91dGVySGVpZ2h0KCkgOiAzODtcbiAgICAgICAgICAgIGNvbnN0IHRhYmxlVG9wID0gdGFibGVFbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3A7XG5cbiAgICAgICAgICAgIC8vIFNwYWNlIGJlbG93OiBwYWdpbmF0aW9uKDUwKSArIGluZm8gYmFyKDMwKSArIHNlZ21lbnQgcGFkZGluZygxNCkgKyB2ZXJzaW9uIGZvb3RlcigzNSkgKyBtYXJnaW5zKDEwKVxuICAgICAgICAgICAgY29uc3QgYm90dG9tUmVzZXJ2ZSA9IDEzOTtcblxuICAgICAgICAgICAgb3ZlcmhlYWQgPSB0YWJsZVRvcCArIHRoZWFkSGVpZ2h0ICsgYm90dG9tUmVzZXJ2ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBvdmVyaGVhZCkgLyByb3dIZWlnaHQpLCA1KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yLlxuICAgICAqIEBwYXJhbSB7bW9tZW50fSBzdGFydERhdGUgLSBPcHRpb25hbCBlYXJsaWVzdCByZWNvcmQgZGF0ZSBmcm9tIGxhc3QgMTAwIHJlY29yZHNcbiAgICAgKiBAcGFyYW0ge21vbWVudH0gZW5kRGF0ZSAtIE9wdGlvbmFsIGxhdGVzdCByZWNvcmQgZGF0ZSBmcm9tIGxhc3QgMTAwIHJlY29yZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3Ioc3RhcnREYXRlID0gbnVsbCwgZW5kRGF0ZSA9IG51bGwpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgIG9wdGlvbnMucmFuZ2VzID0ge1xuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVG9kYXldOiBbbW9tZW50KCksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1llc3RlcmRheV06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RXZWVrXTogW21vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3QzMERheXNdOiBbbW9tZW50KCkuc3VidHJhY3QoMjksICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1RoaXNNb250aF06IFttb21lbnQoKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0TW9udGhdOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zLmFsd2F5c1Nob3dDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmF1dG9VcGRhdGVJbnB1dCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMubGlua2VkQ2FsZW5kYXJzID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5tYXhEYXRlID0gbW9tZW50KCk7XG4gICAgICAgIG9wdGlvbnMubG9jYWxlID0ge1xuICAgICAgICAgICAgZm9ybWF0OiAnREQvTU0vWVlZWScsXG4gICAgICAgICAgICBzZXBhcmF0b3I6ICcgLSAnLFxuICAgICAgICAgICAgYXBwbHlMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9BcHBseUJ0bixcbiAgICAgICAgICAgIGNhbmNlbExhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0NhbmNlbEJ0bixcbiAgICAgICAgICAgIGZyb21MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9mcm9tLFxuICAgICAgICAgICAgdG9MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF90byxcbiAgICAgICAgICAgIGN1c3RvbVJhbmdlTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ3VzdG9tUGVyaW9kLFxuICAgICAgICAgICAgZGF5c09mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LmRheXMsXG4gICAgICAgICAgICBtb250aE5hbWVzOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQubW9udGhzLFxuICAgICAgICAgICAgZmlyc3REYXk6IDEsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBkYXRlIHJhbmdlIGZyb20gbGFzdCAxMDAgcmVjb3JkcywgdXNlIGl0XG4gICAgICAgIC8vIFdIWTogUHJvdmlkZXMgbWVhbmluZ2Z1bCBjb250ZXh0IC0gdXNlciBzZWVzIHBlcmlvZCBjb3ZlcmluZyByZWNlbnQgY2FsbHNcbiAgICAgICAgaWYgKHN0YXJ0RGF0ZSAmJiBlbmREYXRlKSB7XG4gICAgICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudChzdGFydERhdGUpLnN0YXJ0T2YoJ2RheScpO1xuICAgICAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KGVuZERhdGUpLmVuZE9mKCdkYXknKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRvZGF5IGlmIG5vIHJlY29yZHNcbiAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KCk7XG4gICAgICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRlcmFuZ2VwaWNrZXIoXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0LFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIE5vdGU6IERvbid0IGNhbGwgYXBwbHlGaWx0ZXIgaGVyZSAtIERhdGFUYWJsZSBpcyBub3QgaW5pdGlhbGl6ZWQgeWV0XG4gICAgICAgIC8vIERhdGFUYWJsZSB3aWxsIGxvYWQgZGF0YSBhdXRvbWF0aWNhbGx5IGFmdGVyIGluaXRpYWxpemF0aW9uXG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3RvciBzZWxlY3QgZXZlbnQuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBzdGFydCAtIFRoZSBzdGFydCBkYXRlLlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gZW5kIC0gVGhlIGVuZCBkYXRlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYWJlbCAtIFRoZSBsYWJlbC5cbiAgICAgKi9cbiAgICBjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3Qoc3RhcnQsIGVuZCwgbGFiZWwpIHtcbiAgICAgICAgLy8gT25seSBwYXNzIHNlYXJjaCBrZXl3b3JkLCBkYXRlcyBhcmUgcmVhZCBkaXJlY3RseSBmcm9tIGRhdGUgcmFuZ2Ugc2VsZWN0b3JcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIoY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSk7XG4gICAgICAgIC8vIFN0YXRlIHdpbGwgYmUgc2F2ZWQgYXV0b21hdGljYWxseSBpbiBkcmF3IGV2ZW50IGFmdGVyIGZpbHRlciBpcyBhcHBsaWVkXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5zZWFyY2godGV4dCkuZHJhdygpO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgQ0RSIHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==