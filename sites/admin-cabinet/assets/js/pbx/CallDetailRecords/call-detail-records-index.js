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

        $('td', row).eq(1).html(SecurityUtils.escapeHtml(data[0]));
        $('td', row).eq(2).html(SecurityUtils.escapeHtml(data[1])).addClass('need-update').attr('data-cdr-name', data[6] || '');
        $('td', row).eq(3).html(SecurityUtils.escapeHtml(data[2])).addClass('need-update').attr('data-cdr-name', data[7] || ''); // Duration column (no icons)

        $('td', row).eq(4).html(data[3]).addClass('right aligned'); // Actions column: only render if user has delete permission
        // WHY: Volt template conditionally renders this column based on isAllowed('delete')

        if (!canDelete) {
          return;
        } // Last column: log icon + delete button


        var actionsHtml = ''; // Add log icon if user has access to System Diagnostic
        // WHY: Log icon links to system-diagnostic page which requires specific permissions

        var canViewLogs = typeof ACLHelper !== 'undefined' && ACLHelper.isAllowed('viewSystemDiagnostic');

        if (canViewLogs && data.ids !== '') {
          actionsHtml += "<i data-ids=\"".concat(SecurityUtils.escapeHtml(data.ids), "\" class=\"file alternate outline icon\" style=\"cursor: pointer; margin-right: 8px;\"></i>");
        } // Add delete button
        // WHY: Use two-steps-delete mechanism to prevent accidental deletion
        // First click changes trash icon to close icon, second click deletes
        // WHY: Use data.DT_RowId which contains linkedid for grouped records


        actionsHtml += "<a href=\"#\" class=\"two-steps-delete delete-record popuped\"\n                                   data-record-id=\"".concat(SecurityUtils.escapeHtml(data.DT_RowId), "\"\n                                   data-content=\"").concat(globalTranslate.cdr_DeleteRecord || 'Delete record', "\">\n                                   <i class=\"icon trash red\" style=\"margin: 0;\"></i>\n                                </a>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCIkc2VhcmNoQ0RSSW5wdXQiLCIkcGFnZUxlbmd0aFNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImhhc0NEUlJlY29yZHMiLCIkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiU1RPUkFHRV9LRVkiLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImdsb2JhbFJvb3RVcmwiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiY2xlYXJGaWx0ZXJzU3RhdGUiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwicmVsb2FkIiwiZmV0Y2hMYXRlc3RDRFJEYXRlIiwic2F2ZUZpbHRlcnNTdGF0ZSIsInNlc3Npb25TdG9yYWdlIiwiY29uc29sZSIsIndhcm4iLCJzdGF0ZSIsImRhdGVGcm9tIiwiZGF0ZVRvIiwic2VhcmNoVGV4dCIsImN1cnJlbnRQYWdlIiwicGFnZUxlbmd0aCIsImdldFBhZ2VMZW5ndGgiLCJkYXRlUmFuZ2VQaWNrZXIiLCJkYXRhIiwic3RhcnREYXRlIiwiZW5kRGF0ZSIsImZvcm1hdCIsInZhbCIsInBhZ2UiLCJwYWdlSW5mbyIsImluZm8iLCJzZXRJdGVtIiwiSlNPTiIsInN0cmluZ2lmeSIsImVycm9yIiwibG9hZEZpbHRlcnNTdGF0ZSIsInJhd0RhdGEiLCJnZXRJdGVtIiwicGFyc2UiLCJpbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMiLCJzZWFyY2hEZWJvdW5jZVRpbWVyIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImtleUNvZGUiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJjYW5EZWxldGUiLCJBQ0xIZWxwZXIiLCJpc0FsbG93ZWQiLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwicHVzaCIsInNlYXJjaCIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiY29sdW1uRGVmcyIsImRlZmF1bHRDb250ZW50IiwidGFyZ2V0cyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInBhcmFtcyIsImlzTGlua2VkSWRTZWFyY2giLCJpc1ZhbGlkIiwiZW5kT2YiLCJzZWFyY2hLZXl3b3JkIiwidmFsdWUiLCJ0cmltIiwia2V5d29yZCIsInN0YXJ0c1dpdGgiLCJzcmNfbnVtIiwic3Vic3RyaW5nIiwiZHN0X251bSIsImRpZCIsImxpbmtlZGlkIiwibGltaXQiLCJvZmZzZXQiLCJzdGFydCIsInNvcnQiLCJvcmRlciIsImdyb3VwZWQiLCJkYXRhU3JjIiwianNvbiIsInJlc3VsdCIsInJlc3REYXRhIiwicmVjb3JkcyIsInBhZ2luYXRpb24iLCJyZWNvcmRzVG90YWwiLCJ0b3RhbCIsInJlY29yZHNGaWx0ZXJlZCIsInRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZSIsImJlZm9yZVNlbmQiLCJ4aHIiLCJUb2tlbk1hbmFnZXIiLCJhY2Nlc3NUb2tlbiIsInNldFJlcXVlc3RIZWFkZXIiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZW1wdHlUYWJsZSIsImdldEVtcHR5VGFibGVNZXNzYWdlIiwiemVyb1JlY29yZHMiLCJjcmVhdGVkUm93Iiwicm93IiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJhZGRDbGFzcyIsImF0dHIiLCJhY3Rpb25zSHRtbCIsImNhblZpZXdMb2dzIiwiaWRzIiwiRFRfUm93SWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZHJfRGVsZXRlUmVjb3JkIiwiZHJhd0NhbGxiYWNrIiwiRXh0ZW5zaW9uc0FQSSIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsInRvZ2dsZVBhZ2luYXRpb25Db250cm9scyIsImluaXRDb21wbGV0ZSIsInJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJtaW5DaGFyYWN0ZXJzIiwic2VhcmNoT25Gb2N1cyIsInNlYXJjaEZpZWxkcyIsInNob3dOb1Jlc3VsdHMiLCJzb3VyY2UiLCJ0aXRsZSIsImNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciIsImNkcl9TZWFyY2hCeURlc3ROdW1iZXIiLCJjZHJfU2VhcmNoQnlESUQiLCJjZHJfU2VhcmNoQnlMaW5rZWRJRCIsImNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzcG9uc2UiLCJmb2N1cyIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibGVuIiwiZHJhdyIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwic2F2ZWRQYWdlTGVuZ3RoIiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwiY3VycmVudFRhcmdldCIsInVuZGVmaW5lZCIsImVuY29kZVVSSUNvbXBvbmVudCIsIm9wZW4iLCJ0ciIsInRhcmdldCIsImNoaWxkIiwiaXNTaG93biIsImhpZGUiLCJzaG93UmVjb3JkcyIsInNob3ciLCJmaW5kIiwiZWFjaCIsImluZGV4IiwicGxheWVyUm93IiwiaWQiLCJDRFJQbGF5ZXIiLCIkYnV0dG9uIiwicmVjb3JkSWQiLCJkZWxldGVSZWNvcmQiLCJzYXZlZFN0YXRlIiwiQ2RyQVBJIiwiZGVsZXRlUmVjb3JkaW5nIiwiZXJyb3JNc2ciLCJtZXNzYWdlcyIsImNkcl9EZWxldGVGYWlsZWQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInBhZ2VzIiwidGFibGUiLCJjb250YWluZXIiLCJnZXRNZXRhZGF0YSIsImhhc1JlY29yZHMiLCJtb21lbnQiLCJlYXJsaWVzdERhdGUiLCJsYXRlc3REYXRlIiwiaW5pdGlhbGl6ZURhdGVSYW5nZVNlbGVjdG9yIiwic2hvd0VtcHR5RGF0YWJhc2VQbGFjZWhvbGRlciIsImNkcl9GaWx0ZXJlZEVtcHR5VGl0bGUiLCJjZHJfRmlsdGVyZWRFbXB0eURlc2NyaXB0aW9uIiwibWFwIiwiZ3JvdXAiLCJiaWxsc2VjIiwidG90YWxCaWxsc2VjIiwidGltZUZvcm1hdCIsInRpbWluZyIsInV0YyIsImZvcm1hdHRlZERhdGUiLCJyZWNvcmRpbmdzIiwiZmlsdGVyIiwiciIsInJlY29yZGluZ2ZpbGUiLCJzcmNfbmFtZSIsImRzdF9uYW1lIiwicGxheWJhY2tfdXJsIiwiZG93bmxvYWRfdXJsIiwiaGFzUmVjb3JkaW5ncyIsImlzQW5zd2VyZWQiLCJkaXNwb3NpdGlvbiIsImR0Um93Q2xhc3MiLCJuZWdhdGl2ZUNsYXNzIiwiU2V0IiwidmVyYm9zZV9jYWxsX2lkIiwiam9pbiIsImh0bWxQbGF5ZXIiLCJmb3JFYWNoIiwicmVjb3JkIiwiaSIsInBsYXliYWNrVXJsIiwiZG93bmxvYWRVcmwiLCJwYXJzZUludCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsIm92ZXJoZWFkIiwidGFibGVFbCIsImdldCIsInRoZWFkIiwidGhlYWRIZWlnaHQiLCJ0YWJsZVRvcCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsInRvcCIsImJvdHRvbVJlc2VydmUiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJvcHRpb25zIiwicmFuZ2VzIiwiY2FsX1RvZGF5IiwiY2FsX1llc3RlcmRheSIsInN1YnRyYWN0IiwiY2FsX0xhc3RXZWVrIiwiY2FsX0xhc3QzMERheXMiLCJjYWxfVGhpc01vbnRoIiwic3RhcnRPZiIsImNhbF9MYXN0TW9udGgiLCJhbHdheXNTaG93Q2FsZW5kYXJzIiwiYXV0b1VwZGF0ZUlucHV0IiwibGlua2VkQ2FsZW5kYXJzIiwibWF4RGF0ZSIsImxvY2FsZSIsInNlcGFyYXRvciIsImFwcGx5TGFiZWwiLCJjYWxfQXBwbHlCdG4iLCJjYW5jZWxMYWJlbCIsImNhbF9DYW5jZWxCdG4iLCJmcm9tTGFiZWwiLCJjYWxfZnJvbSIsInRvTGFiZWwiLCJjYWxfdG8iLCJjdXN0b21SYW5nZUxhYmVsIiwiY2FsX0N1c3RvbVBlcmlvZCIsImRheXNPZldlZWsiLCJjYWxlbmRhclRleHQiLCJkYXlzIiwibW9udGhOYW1lcyIsIm1vbnRocyIsImZpcnN0RGF5IiwiZGF0ZXJhbmdlcGlja2VyIiwiY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0IiwiZW5kIiwibGFiZWwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFDLFlBQUQsQ0FMVTs7QUFPdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsZUFBRCxDQVhNOztBQWF0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxrQkFBa0IsRUFBRUYsQ0FBQyxDQUFDLHNCQUFELENBakJDOztBQW1CdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsZUFBZSxFQUFFSCxDQUFDLENBQUMsbUJBQUQsQ0F2Qkk7O0FBeUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxtQkFBbUIsRUFBRUosQ0FBQyxDQUFDLHFCQUFELENBN0JBOztBQStCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsU0FBUyxFQUFFLEVBbkNXOztBQXFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLEVBekNhOztBQTJDdEI7QUFDSjtBQUNB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LCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEV4dGVuc2lvbnNBUEksIG1vbWVudCwgZ2xvYmFsVHJhbnNsYXRlLCBDRFJQbGF5ZXIsIENkckFQSSwgVXNlck1lc3NhZ2UsIEFDTEhlbHBlciwgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIGNhbGxEZXRhaWxSZWNvcmRzIG1vZHVsZS5cbiAqIEBtb2R1bGUgY2FsbERldGFpbFJlY29yZHNcbiAqL1xuY29uc3QgY2FsbERldGFpbFJlY29yZHMgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIGNhbGwgZGV0YWlsIHJlY29yZHMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjZHJUYWJsZTogJCgnI2Nkci10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWxzZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGF0ZVJhbmdlU2VsZWN0b3I6ICQoJyNkYXRlLXJhbmdlLXNlbGVjdG9yJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2VhcmNoIENEUiBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlYXJjaENEUklucHV0OiAkKCcjc2VhcmNoLWNkci1pbnB1dCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhZ2VMZW5ndGhTZWxlY3RvcjogJCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9mIHBsYXllcnMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHBsYXllcnM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIENEUiBkYXRhYmFzZSBoYXMgYW55IHJlY29yZHNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBoYXNDRFJSZWNvcmRzOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGVtcHR5IGRhdGFiYXNlIHBsYWNlaG9sZGVyIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXI6ICQoJyNjZHItZW1wdHktZGF0YWJhc2UtcGxhY2Vob2xkZXInKSxcblxuICAgIC8qKlxuICAgICAqIFN0b3JhZ2Uga2V5IGZvciBmaWx0ZXIgc3RhdGUgaW4gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIFNUT1JBR0VfS0VZOiAnY2RyX2ZpbHRlcnNfc3RhdGUnLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byB0cmFjayBpZiBEYXRhVGFibGUgaGFzIGNvbXBsZXRlZCBpbml0aWFsaXphdGlvblxuICAgICAqIFdIWTogUHJldmVudHMgc2F2aW5nIHN0YXRlIGR1cmluZyBpbml0aWFsIGxvYWQgYmVmb3JlIGZpbHRlcnMgYXJlIHJlc3RvcmVkXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgY2FsbCBkZXRhaWwgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBMaXN0ZW4gZm9yIGhhc2ggY2hhbmdlcyAod2hlbiB1c2VyIGNsaWNrcyBtZW51IGxpbmsgd2hpbGUgYWxyZWFkeSBvbiBwYWdlKVxuICAgICAgICAvLyBXSFk6IEJyb3dzZXIgZG9lc24ndCByZWxvYWQgcGFnZSBvbiBoYXNoLW9ubHkgVVJMIGNoYW5nZXNcbiAgICAgICAgJChgYVtocmVmPScke2dsb2JhbFJvb3RVcmx9Y2FsbC1kZXRhaWwtcmVjb3Jkcy9pbmRleC8jcmVzZXQtY2FjaGUnXWApLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAvLyBSZW1vdmUgaGFzaCBmcm9tIFVSTCB3aXRob3V0IHBhZ2UgcmVsb2FkXG4gICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUobnVsbCwgbnVsbCwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNsZWFyRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgICAgICAgLy8gQWxzbyBjbGVhciBwYWdlIGxlbmd0aCBwcmVmZXJlbmNlXG4gICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICAgICAgIC8vIFJlbG9hZCBwYWdlIHRvIGFwcGx5IHJlc2V0XG4gICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBGZXRjaCBtZXRhZGF0YSBmaXJzdCwgdGhlbiBpbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIHByb3BlciBkYXRlIHJhbmdlXG4gICAgICAgIC8vIFdIWTogUHJldmVudHMgZG91YmxlIHJlcXVlc3Qgb24gcGFnZSBsb2FkXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmZldGNoTGF0ZXN0Q0RSRGF0ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlIGN1cnJlbnQgZmlsdGVyIHN0YXRlIHRvIHNlc3Npb25TdG9yYWdlXG4gICAgICogU3RvcmVzIGRhdGUgcmFuZ2UsIHNlYXJjaCB0ZXh0LCBjdXJyZW50IHBhZ2UsIGFuZCBwYWdlIGxlbmd0aFxuICAgICAqL1xuICAgIHNhdmVGaWx0ZXJzU3RhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBGZWF0dXJlIGRldGVjdGlvbiAtIGV4aXQgc2lsZW50bHkgaWYgc2Vzc2lvblN0b3JhZ2Ugbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZXNzaW9uU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tDRFJdIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN0YXRlID0ge1xuICAgICAgICAgICAgICAgIGRhdGVGcm9tOiBudWxsLFxuICAgICAgICAgICAgICAgIGRhdGVUbzogbnVsbCxcbiAgICAgICAgICAgICAgICBzZWFyY2hUZXh0OiAnJyxcbiAgICAgICAgICAgICAgICBjdXJyZW50UGFnZTogMCxcbiAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRQYWdlTGVuZ3RoKClcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEdldCBkYXRlcyBmcm9tIGRhdGVyYW5nZXBpY2tlciBpbnN0YW5jZVxuICAgICAgICAgICAgY29uc3QgZGF0ZVJhbmdlUGlja2VyID0gY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGEoJ2RhdGVyYW5nZXBpY2tlcicpO1xuICAgICAgICAgICAgaWYgKGRhdGVSYW5nZVBpY2tlciAmJiBkYXRlUmFuZ2VQaWNrZXIuc3RhcnREYXRlICYmIGRhdGVSYW5nZVBpY2tlci5lbmREYXRlKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuZGF0ZUZyb20gPSBkYXRlUmFuZ2VQaWNrZXIuc3RhcnREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmRhdGVUbyA9IGRhdGVSYW5nZVBpY2tlci5lbmREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBHZXQgc2VhcmNoIHRleHQgZnJvbSBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgc3RhdGUuc2VhcmNoVGV4dCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCkgfHwgJyc7XG5cbiAgICAgICAgICAgIC8vIEdldCBjdXJyZW50IHBhZ2UgZnJvbSBEYXRhVGFibGUgKGlmIGluaXRpYWxpemVkKVxuICAgICAgICAgICAgaWYgKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZSAmJiBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2VJbmZvID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UuaW5mbygpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmN1cnJlbnRQYWdlID0gcGFnZUluZm8ucGFnZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShjYWxsRGV0YWlsUmVjb3Jkcy5TVE9SQUdFX0tFWSwgSlNPTi5zdHJpbmdpZnkoc3RhdGUpKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tDRFJdIEZhaWxlZCB0byBzYXZlIGZpbHRlcnMgdG8gc2Vzc2lvblN0b3JhZ2U6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZmlsdGVyIHN0YXRlIGZyb20gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fG51bGx9IFNhdmVkIHN0YXRlIG9iamVjdCBvciBudWxsIGlmIG5vdCBmb3VuZC9pbnZhbGlkXG4gICAgICovXG4gICAgbG9hZEZpbHRlcnNTdGF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEZlYXR1cmUgZGV0ZWN0aW9uIC0gcmV0dXJuIG51bGwgaWYgc2Vzc2lvblN0b3JhZ2Ugbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZXNzaW9uU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tDRFJdIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGUgZm9yIGxvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmF3RGF0YSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oY2FsbERldGFpbFJlY29yZHMuU1RPUkFHRV9LRVkpO1xuICAgICAgICAgICAgaWYgKCFyYXdEYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN0YXRlID0gSlNPTi5wYXJzZShyYXdEYXRhKTtcblxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgc3RhdGUgc3RydWN0dXJlXG4gICAgICAgICAgICBpZiAoIXN0YXRlIHx8IHR5cGVvZiBzdGF0ZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jbGVhckZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbQ0RSXSBGYWlsZWQgdG8gbG9hZCBmaWx0ZXJzIGZyb20gc2Vzc2lvblN0b3JhZ2U6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY29ycnVwdGVkIGRhdGFcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNsZWFyRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhciBzYXZlZCBmaWx0ZXIgc3RhdGUgZnJvbSBzZXNzaW9uU3RvcmFnZVxuICAgICAqL1xuICAgIGNsZWFyRmlsdGVyc1N0YXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZXNzaW9uU3RvcmFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGNhbGxEZXRhaWxSZWNvcmRzLlNUT1JBR0VfS0VZKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBjbGVhciBDRFIgZmlsdGVycyBmcm9tIHNlc3Npb25TdG9yYWdlOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSBhbmQgZXZlbnQgaGFuZGxlcnNcbiAgICAgKiBDYWxsZWQgYWZ0ZXIgbWV0YWRhdGEgaXMgcmVjZWl2ZWRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVib3VuY2UgdGltZXIgdmFyaWFibGVcbiAgICAgICAgbGV0IHNlYXJjaERlYm91bmNlVGltZXIgPSBudWxsO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVyIGlmIHRoZSB1c2VyIGlzIHN0aWxsIHR5cGluZ1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNlYXJjaERlYm91bmNlVGltZXIpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgZm9yIGRlbGF5ZWQgZXhlY3V0aW9uXG4gICAgICAgICAgICBzZWFyY2hEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTNcbiAgICAgICAgICAgICAgICAgICAgfHwgZS5rZXlDb2RlID09PSA4XG4gICAgICAgICAgICAgICAgICAgIHx8IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgcGFzcyB0aGUgc2VhcmNoIGtleXdvcmQsIGRhdGVzIGFyZSBoYW5kbGVkIHNlcGFyYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7IC8vIDUwMG1zIGRlbGF5IGJlZm9yZSBleGVjdXRpbmcgdGhlIHNlYXJjaFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCdWlsZCBjb2x1bW5zIGR5bmFtaWNhbGx5IGJhc2VkIG9uIEFDTCBwZXJtaXNzaW9uc1xuICAgICAgICAvLyBXSFk6IFZvbHQgdGVtcGxhdGUgY29uZGl0aW9uYWxseSByZW5kZXJzIGRlbGV0ZSBjb2x1bW4gaGVhZGVyIGJhc2VkIG9uIGlzQWxsb3dlZCgnc2F2ZScpXG4gICAgICAgIC8vICdzYXZlJyBpcyBhIHZpcnR1YWwgcGVybWlzc2lvbiB0aGF0IGluY2x1ZGVzIGRlbGV0ZSBjYXBhYmlsaXR5IGluIE1vZHVsZVVzZXJzVUlcbiAgICAgICAgLy8gSWYgY29sdW1ucyBjb25maWcgZG9lc24ndCBtYXRjaCA8dGhlYWQ+IGNvdW50LCBEYXRhVGFibGVzIHRocm93cyAnc3R5bGUnIHVuZGVmaW5lZCBlcnJvclxuICAgICAgICBjb25zdCBjYW5EZWxldGUgPSB0eXBlb2YgQUNMSGVscGVyICE9PSAndW5kZWZpbmVkJyAmJiBBQ0xIZWxwZXIuaXNBbGxvd2VkKCdzYXZlJyk7XG4gICAgICAgIGNvbnN0IGNvbHVtbnMgPSBbXG4gICAgICAgICAgICB7IGRhdGE6IG51bGwsIG9yZGVyYWJsZTogZmFsc2UgfSwgIC8vIDA6IGV4cGFuZCBpY29uIGNvbHVtblxuICAgICAgICAgICAgeyBkYXRhOiAwIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAxOiBkYXRlIChhcnJheSBpbmRleCAwKVxuICAgICAgICAgICAgeyBkYXRhOiAxIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAyOiBzcmNfbnVtIChhcnJheSBpbmRleCAxKVxuICAgICAgICAgICAgeyBkYXRhOiAyIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAzOiBkc3RfbnVtIChhcnJheSBpbmRleCAyKVxuICAgICAgICAgICAgeyBkYXRhOiAzIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyA0OiBkdXJhdGlvbiAoYXJyYXkgaW5kZXggMylcbiAgICAgICAgXTtcbiAgICAgICAgaWYgKGNhbkRlbGV0ZSkge1xuICAgICAgICAgICAgY29sdW1ucy5wdXNoKHsgZGF0YTogbnVsbCwgb3JkZXJhYmxlOiBmYWxzZSB9KTsgIC8vIDU6IGFjdGlvbnMgY29sdW1uIChsb2dzIGljb24gKyBkZWxldGUpXG4gICAgICAgIH1cblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZGF0YVRhYmxlKHtcbiAgICAgICAgICAgIHNlYXJjaDoge1xuICAgICAgICAgICAgICAgIHNlYXJjaDogY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXJ2ZXJTaWRlOiB0cnVlLFxuICAgICAgICAgICAgcHJvY2Vzc2luZzogdHJ1ZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IGNvbHVtbnMsXG4gICAgICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAgICAgICAgeyBkZWZhdWx0Q29udGVudDogXCItXCIsICB0YXJnZXRzOiBcIl9hbGxcIn0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9jZHInLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdHRVQnLCAgLy8gUkVTVCBBUEkgdXNlcyBHRVQgZm9yIGxpc3QgcmV0cmlldmFsXG4gICAgICAgICAgICAgICAgZGF0YTogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGlzTGlua2VkSWRTZWFyY2ggPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyAxLiBBbHdheXMgZ2V0IGRhdGVzIGZyb20gZGF0ZSByYW5nZSBzZWxlY3RvciB1c2luZyBkYXRlcmFuZ2VwaWNrZXIgQVBJXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVSYW5nZVBpY2tlciA9IGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRhKCdkYXRlcmFuZ2VwaWNrZXInKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGVSYW5nZVBpY2tlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuZERhdGUgPSBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0RGF0ZSAmJiBzdGFydERhdGUuaXNWYWxpZCgpICYmIGVuZERhdGUgJiYgZW5kRGF0ZS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZGF0ZUZyb20gPSBzdGFydERhdGUuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRhdGVUbyA9IGVuZERhdGUuZW5kT2YoJ2RheScpLmZvcm1hdCgnWVlZWS1NTS1ERCBISDptbTpzcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gMi4gUHJvY2VzcyBzZWFyY2gga2V5d29yZCBmcm9tIHNlYXJjaCBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hLZXl3b3JkID0gZC5zZWFyY2gudmFsdWUgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlYXJjaEtleXdvcmQudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXl3b3JkID0gc2VhcmNoS2V5d29yZC50cmltKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHNlYXJjaCBwcmVmaXhlczogc3JjOiwgZHN0OiwgZGlkOiwgbGlua2VkaWQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdzcmM6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgc291cmNlIG51bWJlciBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNyY19udW0gPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnZHN0OicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IGRlc3RpbmF0aW9uIG51bWJlciBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRzdF9udW0gPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnZGlkOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IERJRCBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRpZCA9IGtleXdvcmQuc3Vic3RyaW5nKDQpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdsaW5rZWRpZDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBsaW5rZWRpZCAtIGlnbm9yZSBkYXRlIHJhbmdlIGZvciBsaW5rZWRpZCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMubGlua2VkaWQgPSBrZXl3b3JkLnN1YnN0cmluZyg5KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNMaW5rZWRJZFNlYXJjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRhdGUgcGFyYW1zIGZvciBsaW5rZWRpZCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcGFyYW1zLmRhdGVGcm9tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJhbXMuZGF0ZVRvO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGdWxsLXRleHQgc2VhcmNoOiBzZWFyY2ggaW4gc3JjX251bSwgZHN0X251bSwgYW5kIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlciBleHBlY3RzIHNlYXJjaCB3aXRob3V0IHByZWZpeCB0byBmaW5kIG51bWJlciBhbnl3aGVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zZWFyY2ggPSBrZXl3b3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUkVTVCBBUEkgcGFnaW5hdGlvbiBwYXJhbWV0ZXJzXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5saW1pdCA9IGQubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMub2Zmc2V0ID0gZC5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNvcnQgPSAnc3RhcnQnOyAgLy8gU29ydCBieSBjYWxsIHN0YXJ0IHRpbWUgZm9yIGNocm9ub2xvZ2ljYWwgb3JkZXJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9yZGVyID0gJ0RFU0MnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFdIWTogV2ViVUkgYWx3YXlzIG5lZWRzIGdyb3VwZWQgcmVjb3JkcyAoYnkgbGlua2VkaWQpIGZvciBwcm9wZXIgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICAvLyBCYWNrZW5kIGRlZmF1bHRzIHRvIGdyb3VwZWQ9dHJ1ZSwgYnV0IGV4cGxpY2l0IGlzIGJldHRlciB0aGFuIGltcGxpY2l0XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5ncm91cGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVNyYzogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBUEkgcmV0dXJucyBQQlhBcGlSZXN1bHQgc3RydWN0dXJlOlxuICAgICAgICAgICAgICAgICAgICAvLyB7cmVzdWx0OiB0cnVlLCBkYXRhOiB7cmVjb3JkczogWy4uLl0sIHBhZ2luYXRpb246IHsuLi59fX1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGpzb24ucmVzdWx0ICYmIGpzb24uZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXh0cmFjdCByZWNvcmRzIGFuZCBwYWdpbmF0aW9uIGZyb20gbmVzdGVkIGRhdGEgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN0RGF0YSA9IGpzb24uZGF0YS5yZWNvcmRzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFnaW5hdGlvbiA9IGpzb24uZGF0YS5wYWdpbmF0aW9uIHx8IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgRGF0YVRhYmxlcyBwYWdpbmF0aW9uIHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc1RvdGFsID0gcGFnaW5hdGlvbi50b3RhbCB8fCAwO1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzRmlsdGVyZWQgPSBwYWdpbmF0aW9uLnRvdGFsIHx8IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyYW5zZm9ybSBSRVNUIHJlY29yZHMgdG8gRGF0YVRhYmxlIHJvd3NcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsRGV0YWlsUmVjb3Jkcy50cmFuc2Zvcm1SZXN0VG9EYXRhVGFibGUocmVzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgQmVhcmVyIHRva2VuIGZvciBBUEkgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIC8vc2Nyb2xsWTogJCh3aW5kb3cpLmhlaWdodCgpIC0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9mZnNldCgpLnRvcC0xNTAsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IGNhbGxEZXRhaWxSZWNvcmRzLmdldFBhZ2VMZW5ndGgoKSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiB7XG4gICAgICAgICAgICAgICAgLi4uU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgICAgIGVtcHR5VGFibGU6IGNhbGxEZXRhaWxSZWNvcmRzLmdldEVtcHR5VGFibGVNZXNzYWdlKCksXG4gICAgICAgICAgICAgICAgemVyb1JlY29yZHM6IGNhbGxEZXRhaWxSZWNvcmRzLmdldEVtcHR5VGFibGVNZXNzYWdlKClcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyB0aGUgQ0RSIHJvdy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuRFRfUm93Q2xhc3MuaW5kZXhPZihcImRldGFpbGVkXCIpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBjYXJldCBkb3duXCI+PC9pPicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDEpLmh0bWwoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGFbMF0pKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMilcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGFbMV0pKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtY2RyLW5hbWUnLCBkYXRhWzZdIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGFbMl0pKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtY2RyLW5hbWUnLCBkYXRhWzddIHx8ICcnKTtcblxuICAgICAgICAgICAgICAgIC8vIER1cmF0aW9uIGNvbHVtbiAobm8gaWNvbnMpXG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmh0bWwoZGF0YVszXSkuYWRkQ2xhc3MoJ3JpZ2h0IGFsaWduZWQnKTtcblxuICAgICAgICAgICAgICAgIC8vIEFjdGlvbnMgY29sdW1uOiBvbmx5IHJlbmRlciBpZiB1c2VyIGhhcyBkZWxldGUgcGVybWlzc2lvblxuICAgICAgICAgICAgICAgIC8vIFdIWTogVm9sdCB0ZW1wbGF0ZSBjb25kaXRpb25hbGx5IHJlbmRlcnMgdGhpcyBjb2x1bW4gYmFzZWQgb24gaXNBbGxvd2VkKCdkZWxldGUnKVxuICAgICAgICAgICAgICAgIGlmICghY2FuRGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBMYXN0IGNvbHVtbjogbG9nIGljb24gKyBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgbGV0IGFjdGlvbnNIdG1sID0gJyc7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgbG9nIGljb24gaWYgdXNlciBoYXMgYWNjZXNzIHRvIFN5c3RlbSBEaWFnbm9zdGljXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBMb2cgaWNvbiBsaW5rcyB0byBzeXN0ZW0tZGlhZ25vc3RpYyBwYWdlIHdoaWNoIHJlcXVpcmVzIHNwZWNpZmljIHBlcm1pc3Npb25zXG4gICAgICAgICAgICAgICAgY29uc3QgY2FuVmlld0xvZ3MgPSB0eXBlb2YgQUNMSGVscGVyICE9PSAndW5kZWZpbmVkJyAmJiBBQ0xIZWxwZXIuaXNBbGxvd2VkKCd2aWV3U3lzdGVtRGlhZ25vc3RpYycpO1xuICAgICAgICAgICAgICAgIGlmIChjYW5WaWV3TG9ncyAmJiBkYXRhLmlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uc0h0bWwgKz0gYDxpIGRhdGEtaWRzPVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YS5pZHMpfVwiIGNsYXNzPVwiZmlsZSBhbHRlcm5hdGUgb3V0bGluZSBpY29uXCIgc3R5bGU9XCJjdXJzb3I6IHBvaW50ZXI7IG1hcmdpbi1yaWdodDogOHB4O1wiPjwvaT5gO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFkZCBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBVc2UgdHdvLXN0ZXBzLWRlbGV0ZSBtZWNoYW5pc20gdG8gcHJldmVudCBhY2NpZGVudGFsIGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgLy8gRmlyc3QgY2xpY2sgY2hhbmdlcyB0cmFzaCBpY29uIHRvIGNsb3NlIGljb24sIHNlY29uZCBjbGljayBkZWxldGVzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBVc2UgZGF0YS5EVF9Sb3dJZCB3aGljaCBjb250YWlucyBsaW5rZWRpZCBmb3IgZ3JvdXBlZCByZWNvcmRzXG4gICAgICAgICAgICAgICAgYWN0aW9uc0h0bWwgKz0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ0d28tc3RlcHMtZGVsZXRlIGRlbGV0ZS1yZWNvcmQgcG9wdXBlZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcmVjb3JkLWlkPVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YS5EVF9Sb3dJZCl9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0RlbGV0ZVJlY29yZCB8fCAnRGVsZXRlIHJlY29yZCd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIiBzdHlsZT1cIm1hcmdpbjogMDtcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5gO1xuXG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDUpLmh0bWwoYWN0aW9uc0h0bWwpLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSW5pdGlhbGl6YXRpb24gY29tcGxldGUgY2FsbGJhY2sgLSBmaXJlZCBhZnRlciBmaXJzdCBkYXRhIGxvYWRcbiAgICAgICAgICAgICAqIFdIWTogUmVzdG9yZSBmaWx0ZXJzIEFGVEVSIERhdGFUYWJsZSBoYXMgbG9hZGVkIGluaXRpYWwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbml0Q29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGZsYWcgRklSU1QgdG8gYWxsb3cgc3RhdGUgc2F2aW5nIGR1cmluZyBmaWx0ZXIgcmVzdG9yYXRpb25cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAvLyBOb3cgcmVzdG9yZSBmaWx0ZXJzIC0gZHJhdyBldmVudCB3aWxsIGNvcnJlY3RseSBzYXZlIHRoZSByZXN0b3JlZCBzdGF0ZVxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLkRhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIFNlYXJjaCBjb21wb25lbnQgQUZURVIgRGF0YVRhYmxlIGlzIGNyZWF0ZWRcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCh7XG4gICAgICAgICAgICBtaW5DaGFyYWN0ZXJzOiAwLFxuICAgICAgICAgICAgc2VhcmNoT25Gb2N1czogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hGaWVsZHM6IFsndGl0bGUnXSxcbiAgICAgICAgICAgIHNob3dOb1Jlc3VsdHM6IGZhbHNlLFxuICAgICAgICAgICAgc291cmNlOiBbXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciwgdmFsdWU6ICdzcmM6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlEZXN0TnVtYmVyLCB2YWx1ZTogJ2RzdDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeURJRCwgdmFsdWU6ICdkaWQ6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlMaW5rZWRJRCwgdmFsdWU6ICdsaW5rZWRpZDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSwgdmFsdWU6ICcnIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb25TZWxlY3Q6IGZ1bmN0aW9uKHJlc3VsdCwgcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbChyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goJ2hpZGUgcmVzdWx0cycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHNlYXJjaCB3aGVuIHlvdSBjbGljayBvbiB0aGUgaWNvblxuICAgICAgICAkKCcjc2VhcmNoLWljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guZm9jdXMoKTtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goJ3F1ZXJ5Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIHRvIHNhdmUgdGhlIHVzZXIncyBwYWdlIGxlbmd0aCBzZWxlY3Rpb24gYW5kIHVwZGF0ZSB0aGUgdGFibGVcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZShwYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VMZW5ndGggPT09ICdhdXRvJykge1xuICAgICAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoID0gY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcsIHBhZ2VMZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHRoZSBldmVudCBmcm9tIGJ1YmJsaW5nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgc2VsZWN0IGlucHV0IHZhbHVlIHRvIHRoZSBzYXZlZCB2YWx1ZSBpZiBpdCBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBzYXZlZFBhZ2VMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBTa2lwIHNhdmluZyBzdGF0ZSBkdXJpbmcgaW5pdGlhbCBsb2FkIGJlZm9yZSBmaWx0ZXJzIGFyZSByZXN0b3JlZFxuICAgICAgICAgICAgaWYgKCFjYWxsRGV0YWlsUmVjb3Jkcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTYXZlIHN0YXRlIGFmdGVyIGV2ZXJ5IGRyYXcgKHBhZ2luYXRpb24sIHNlYXJjaCwgZGF0ZSBjaGFuZ2UpXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5zYXZlRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3IgY2xpY2tpbmcgb24gaWNvbiB3aXRoIGRhdGEtaWRzIChvcGVuIGluIG5ldyB3aW5kb3cpXG4gICAgICAgIC8vIFdIWTogQ2xpY2tpbmcgb24gaWNvbiBzaG91bGQgb3BlbiBTeXN0ZW0gRGlhZ25vc3RpYyBpbiBuZXcgd2luZG93IHRvIHZpZXcgdmVyYm9zZSBsb2dzXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAnW2RhdGEtaWRzXScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHJvdyB0b2dnbGVcblxuICAgICAgICAgICAgY29uc3QgaWRzID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtaWRzJyk7XG4gICAgICAgICAgICBpZiAoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFdIWTogRm9ybWF0IGFzIHF1ZXJ5IHBhcmFtICsgaGFzaDogP2ZpbHRlcj0uLi4jZmlsZT0uLi5cbiAgICAgICAgICAgICAgICAvLyBPcGVuIGluIG5ldyB3aW5kb3cgdG8gYWxsb3cgdmlld2luZyBsb2dzIHdoaWxlIGtlZXBpbmcgQ0RSIHRhYmxlIHZpc2libGVcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBgJHtnbG9iYWxSb290VXJsfXN5c3RlbS1kaWFnbm9zdGljL2luZGV4Lz9maWx0ZXI9JHtlbmNvZGVVUklDb21wb25lbnQoaWRzKX0jZmlsZT1hc3RlcmlzayUyRnZlcmJvc2VgO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5vcGVuKHVybCwgJ19ibGFuaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgZm9yIG9wZW5pbmcgYW5kIGNsb3NpbmcgZGV0YWlsc1xuICAgICAgICAvLyBXSFk6IE9ubHkgZXhwYW5kL2NvbGxhcHNlIG9uIGZpcnN0IGNvbHVtbiAoY2FyZXQgaWNvbikgY2xpY2ssIG5vdCBvbiBhY3Rpb24gaWNvbnNcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICd0ci5kZXRhaWxlZCB0ZDpmaXJzdC1jaGlsZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ciA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucm93KHRyKTtcblxuICAgICAgICAgICAgaWYgKHJvdy5jaGlsZC5pc1Nob3duKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIHJvdyBpcyBhbHJlYWR5IG9wZW4gLSBjbG9zZSBpdFxuICAgICAgICAgICAgICAgIHJvdy5jaGlsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgdHIucmVtb3ZlQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE9wZW4gdGhpcyByb3dcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoY2FsbERldGFpbFJlY29yZHMuc2hvd1JlY29yZHMocm93LmRhdGEoKSkpLnNob3coKTtcbiAgICAgICAgICAgICAgICB0ci5hZGRDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoKS5maW5kKCcuZGV0YWlsLXJlY29yZC1yb3cnKS5lYWNoKChpbmRleCwgcGxheWVyUm93KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gJChwbGF5ZXJSb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ0RSUGxheWVyKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHNlY29uZCBjbGljayBvbiBkZWxldGUgYnV0dG9uIChhZnRlciB0d28tc3RlcHMtZGVsZXRlIGNoYW5nZXMgaWNvbiB0byBjbG9zZSlcbiAgICAgICAgLy8gV0hZOiBUd28tc3RlcHMtZGVsZXRlIG1lY2hhbmlzbSBwcmV2ZW50cyBhY2NpZGVudGFsIGRlbGV0aW9uXG4gICAgICAgIC8vIEZpcnN0IGNsaWNrOiB0cmFzaCDihpIgY2xvc2UgKGJ5IGRlbGV0ZS1zb21ldGhpbmcuanMpLCBTZWNvbmQgY2xpY2s6IGV4ZWN1dGUgZGVsZXRpb25cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICdhLmRlbGV0ZS1yZWNvcmQ6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHJvdyBleHBhbnNpb25cblxuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXJlY29yZC1pZCcpO1xuXG4gICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBZGQgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQgbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBBbHdheXMgZGVsZXRlIHdpdGggcmVjb3JkaW5ncyBhbmQgbGlua2VkIHJlY29yZHNcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRlbGV0ZVJlY29yZChyZWNvcmRJZCwgJGJ1dHRvbik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXN0b3JlIGZpbHRlcnMgZnJvbSBzYXZlZCBzdGF0ZSBhZnRlciBEYXRhVGFibGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBXSFk6IE11c3QgYmUgY2FsbGVkIGFmdGVyIERhdGFUYWJsZSBpcyBjcmVhdGVkIHRvIHJlc3RvcmUgc2VhcmNoIGFuZCBwYWdlXG4gICAgICovXG4gICAgcmVzdG9yZUZpbHRlcnNGcm9tU3RhdGUoKSB7XG4gICAgICAgIGNvbnN0IHNhdmVkU3RhdGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy5sb2FkRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgIGlmICghc2F2ZWRTdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVzdG9yZSBzZWFyY2ggdGV4dCB0byBpbnB1dCBmaWVsZFxuICAgICAgICBpZiAoc2F2ZWRTdGF0ZS5zZWFyY2hUZXh0KSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbChzYXZlZFN0YXRlLnNlYXJjaFRleHQpO1xuICAgICAgICAgICAgLy8gQXBwbHkgc2VhcmNoIHRvIERhdGFUYWJsZVxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaChzYXZlZFN0YXRlLnNlYXJjaFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVzdG9yZSBwYWdlIG51bWJlciB3aXRoIGRlbGF5XG4gICAgICAgIC8vIFdIWTogRGF0YVRhYmxlIGlnbm9yZXMgcGFnZSgpIGR1cmluZyBpbml0Q29tcGxldGUsIG5lZWQgc2V0VGltZW91dCB0byBhbGxvdyBpbml0aWFsaXphdGlvbiB0byBmdWxseSBjb21wbGV0ZVxuICAgICAgICBpZiAoc2F2ZWRTdGF0ZS5jdXJyZW50UGFnZSkge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2Uoc2F2ZWRTdGF0ZS5jdXJyZW50UGFnZSkuZHJhdyhmYWxzZSk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCkge1xuICAgICAgICAgICAgLy8gSWYgb25seSBzZWFyY2ggdGV4dCBleGlzdHMsIHN0aWxsIG5lZWQgdG8gZHJhd1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLmRyYXcoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgQ0RSIHJlY29yZCB2aWEgUkVTVCBBUElcbiAgICAgKiBXSFk6IERlbGV0ZXMgYnkgbGlua2VkaWQgLSBhdXRvbWF0aWNhbGx5IHJlbW92ZXMgZW50aXJlIGNvbnZlcnNhdGlvbiB3aXRoIGFsbCBsaW5rZWQgcmVjb3Jkc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIENEUiBsaW5rZWRpZCAobGlrZSBcIm1pa29wYngtMTc2MDc4NDc5My40NjI3XCIpXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRidXR0b24gLSBCdXR0b24gZWxlbWVudCB0byB1cGRhdGUgc3RhdGVcbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQocmVjb3JkSWQsICRidXR0b24pIHtcbiAgICAgICAgLy8gQWx3YXlzIGRlbGV0ZSB3aXRoIHJlY29yZGluZyBmaWxlc1xuICAgICAgICAvLyBXSFk6IGxpbmtlZGlkIGF1dG9tYXRpY2FsbHkgZGVsZXRlcyBhbGwgbGlua2VkIHJlY29yZHMgKG5vIGRlbGV0ZUxpbmtlZCBwYXJhbWV0ZXIgbmVlZGVkKVxuICAgICAgICBDZHJBUEkuZGVsZXRlUmVjb3JkKHJlY29yZElkLCB7IGRlbGV0ZVJlY29yZGluZzogdHJ1ZSB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIFNpbGVudGx5IHJlbG9hZCB0aGUgRGF0YVRhYmxlIHRvIHJlZmxlY3QgY2hhbmdlc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogVmlzdWFsIGZlZWRiYWNrIChkaXNhcHBlYXJpbmcgcm93KSBpcyBlbm91Z2gsIG5vIG5lZWQgZm9yIHN1Y2Nlc3MgdG9hc3RcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuYWpheC5yZWxvYWQobnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2Ugb25seSBvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSByZXNwb25zZT8ubWVzc2FnZXM/LmVycm9yPy5bMF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNkcl9EZWxldGVGYWlsZWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBkZWxldGUgcmVjb3JkJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNc2cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgcGFnaW5hdGlvbiBjb250cm9scyB2aXNpYmlsaXR5IGJhc2VkIG9uIGRhdGEgc2l6ZVxuICAgICAqL1xuICAgIHRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpIHtcbiAgICAgICAgY29uc3QgaW5mbyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmluZm8oKTtcbiAgICAgICAgaWYgKGluZm8ucGFnZXMgPD0gMSkge1xuICAgICAgICAgICAgJChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUudGFibGUoKS5jb250YWluZXIoKSkuZmluZCgnLmRhdGFUYWJsZXNfcGFnaW5hdGUnKS5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS50YWJsZSgpLmNvbnRhaW5lcigpKS5maW5kKCcuZGF0YVRhYmxlc19wYWdpbmF0ZScpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIENEUiBtZXRhZGF0YSAoZGF0ZSByYW5nZSkgdXNpbmcgQ2RyQVBJXG4gICAgICogV0hZOiBMaWdodHdlaWdodCByZXF1ZXN0IHJldHVybnMgb25seSBtZXRhZGF0YSAoZGF0ZXMpLCBub3QgZnVsbCBDRFIgcmVjb3Jkc1xuICAgICAqIEF2b2lkcyBkb3VibGUgcmVxdWVzdCBvbiBwYWdlIGxvYWRcbiAgICAgKi9cbiAgICBmZXRjaExhdGVzdENEUkRhdGUoKSB7XG4gICAgICAgIC8vIENoZWNrIGZvciBzYXZlZCBzdGF0ZSBmaXJzdFxuICAgICAgICBjb25zdCBzYXZlZFN0YXRlID0gY2FsbERldGFpbFJlY29yZHMubG9hZEZpbHRlcnNTdGF0ZSgpO1xuXG4gICAgICAgIENkckFQSS5nZXRNZXRhZGF0YSh7IGxpbWl0OiAxMDAgfSwgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEuaGFzUmVjb3Jkcykge1xuICAgICAgICAgICAgICAgIGxldCBzdGFydERhdGUsIGVuZERhdGU7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIHNhdmVkIHN0YXRlIHdpdGggZGF0ZXMsIHVzZSB0aG9zZSBpbnN0ZWFkIG9mIG1ldGFkYXRhXG4gICAgICAgICAgICAgICAgaWYgKHNhdmVkU3RhdGUgJiYgc2F2ZWRTdGF0ZS5kYXRlRnJvbSAmJiBzYXZlZFN0YXRlLmRhdGVUbykge1xuICAgICAgICAgICAgICAgICAgICBzdGFydERhdGUgPSBtb21lbnQoc2F2ZWRTdGF0ZS5kYXRlRnJvbSk7XG4gICAgICAgICAgICAgICAgICAgIGVuZERhdGUgPSBtb21lbnQoc2F2ZWRTdGF0ZS5kYXRlVG8pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgbWV0YWRhdGEgZGF0ZSBzdHJpbmdzIHRvIG1vbWVudCBvYmplY3RzXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0RGF0ZSA9IG1vbWVudChkYXRhLmVhcmxpZXN0RGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGVuZERhdGUgPSBtb21lbnQoZGF0YS5sYXRlc3REYXRlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3Ioc3RhcnREYXRlLCBlbmREYXRlKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgRGF0YVRhYmxlIG9ubHkgaWYgd2UgaGF2ZSByZWNvcmRzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBEYXRhVGFibGUgbmVlZHMgZGF0ZSByYW5nZSB0byBiZSBzZXQgZmlyc3RcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm8gcmVjb3JkcyBpbiBkYXRhYmFzZSBhdCBhbGwgb3IgQVBJIGVycm9yXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3JkcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIoKTtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBpbml0aWFsaXplIERhdGFUYWJsZSBhdCBhbGwgLSBqdXN0IHNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgYSBzdHlsZWQgZW1wdHkgdGFibGUgbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgbWVzc2FnZSBmb3IgZW1wdHkgdGFibGVcbiAgICAgKi9cbiAgICBnZXRFbXB0eVRhYmxlTWVzc2FnZSgpIHtcbiAgICAgICAgLy8gSWYgZGF0YWJhc2UgaXMgZW1wdHksIHdlIGRvbid0IHNob3cgdGhpcyBtZXNzYWdlIGluIHRhYmxlXG4gICAgICAgIGlmICghY2FsbERldGFpbFJlY29yZHMuaGFzQ0RSUmVjb3Jkcykge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGZpbHRlcmVkIGVtcHR5IHN0YXRlIG1lc3NhZ2VcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBsYWNlaG9sZGVyIHNlZ21lbnRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic2VhcmNoIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0ZpbHRlcmVkRW1wdHlUaXRsZX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlubGluZVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0XCI+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9GaWx0ZXJlZEVtcHR5RGVzY3JpcHRpb259XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIHRoZSBlbXB0eSBkYXRhYmFzZSBwbGFjZWhvbGRlciBhbmQgaGlkZXMgdGhlIHRhYmxlXG4gICAgICovXG4gICAgc2hvd0VtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcigpIHtcbiAgICAgICAgLy8gSGlkZSB0aGUgdGFibGUgaXRzZWxmIChEYXRhVGFibGUgd29uJ3QgYmUgaW5pdGlhbGl6ZWQpXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5oaWRlKCk7XG5cbiAgICAgICAgLy8gSGlkZSBzZWFyY2ggYW5kIGRhdGUgY29udHJvbHNcbiAgICAgICAgJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKS5jbG9zZXN0KCcudWkucm93JykuaGlkZSgpO1xuXG4gICAgICAgIC8vIFNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGVtcHR5RGF0YWJhc2VQbGFjZWhvbGRlci5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRyYW5zZm9ybSBSRVNUIEFQSSBncm91cGVkIHJlY29yZHMgdG8gRGF0YVRhYmxlIHJvdyBmb3JtYXRcbiAgICAgKiBAcGFyYW0ge0FycmF5fSByZXN0RGF0YSAtIEFycmF5IG9mIGdyb3VwZWQgQ0RSIHJlY29yZHMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgRGF0YVRhYmxlIHJvd3NcbiAgICAgKi9cbiAgICB0cmFuc2Zvcm1SZXN0VG9EYXRhVGFibGUocmVzdERhdGEpIHtcbiAgICAgICAgcmV0dXJuIHJlc3REYXRhLm1hcChncm91cCA9PiB7XG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgdGltaW5nIGRpc3BsYXlcbiAgICAgICAgICAgIGNvbnN0IGJpbGxzZWMgPSBncm91cC50b3RhbEJpbGxzZWMgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVGb3JtYXQgPSAoYmlsbHNlYyA8IDM2MDApID8gJ21tOnNzJyA6ICdISDptbTpzcyc7XG4gICAgICAgICAgICBjb25zdCB0aW1pbmcgPSBiaWxsc2VjID4gMCA/IG1vbWVudC51dGMoYmlsbHNlYyAqIDEwMDApLmZvcm1hdCh0aW1lRm9ybWF0KSA6ICcnO1xuXG4gICAgICAgICAgICAvLyBGb3JtYXQgc3RhcnQgZGF0ZVxuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkRGF0ZSA9IG1vbWVudChncm91cC5zdGFydCkuZm9ybWF0KCdERC1NTS1ZWVlZIEhIOm1tOnNzJyk7XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgcmVjb3JkaW5nIHJlY29yZHMgLSBmaWx0ZXIgb25seSByZWNvcmRzIHdpdGggYWN0dWFsIHJlY29yZGluZyBmaWxlc1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkaW5ncyA9IChncm91cC5yZWNvcmRzIHx8IFtdKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIociA9PiByLnJlY29yZGluZ2ZpbGUgJiYgci5yZWNvcmRpbmdmaWxlLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgLm1hcChyID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIGlkOiByLmlkLFxuICAgICAgICAgICAgICAgICAgICBzcmNfbnVtOiByLnNyY19udW0sXG4gICAgICAgICAgICAgICAgICAgIHNyY19uYW1lOiByLnNyY19uYW1lIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICBkc3RfbnVtOiByLmRzdF9udW0sXG4gICAgICAgICAgICAgICAgICAgIGRzdF9uYW1lOiByLmRzdF9uYW1lIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmRpbmdmaWxlOiByLnJlY29yZGluZ2ZpbGUsXG4gICAgICAgICAgICAgICAgICAgIHBsYXliYWNrX3VybDogci5wbGF5YmFja191cmwsICAgLy8gVG9rZW4tYmFzZWQgVVJMIGZvciBwbGF5YmFja1xuICAgICAgICAgICAgICAgICAgICBkb3dubG9hZF91cmw6IHIuZG93bmxvYWRfdXJsICAgIC8vIFRva2VuLWJhc2VkIFVSTCBmb3IgZG93bmxvYWRcbiAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIC8vIERldGVybWluZSBDU1MgY2xhc3NcbiAgICAgICAgICAgIGNvbnN0IGhhc1JlY29yZGluZ3MgPSByZWNvcmRpbmdzLmxlbmd0aCA+IDA7XG4gICAgICAgICAgICBjb25zdCBpc0Fuc3dlcmVkID0gZ3JvdXAuZGlzcG9zaXRpb24gPT09ICdBTlNXRVJFRCc7XG4gICAgICAgICAgICBjb25zdCBkdFJvd0NsYXNzID0gaGFzUmVjb3JkaW5ncyA/ICdkZXRhaWxlZCcgOiAndWknO1xuICAgICAgICAgICAgY29uc3QgbmVnYXRpdmVDbGFzcyA9IGlzQW5zd2VyZWQgPyAnJyA6ICcgbmVnYXRpdmUnO1xuXG4gICAgICAgICAgICAvLyBDb2xsZWN0IHVuaXF1ZSB2ZXJib3NlIGNhbGwgSURzXG4gICAgICAgICAgICBjb25zdCBpZHMgPSBbLi4ubmV3IFNldChcbiAgICAgICAgICAgICAgICAoZ3JvdXAucmVjb3JkcyB8fCBbXSlcbiAgICAgICAgICAgICAgICAgICAgLm1hcChyID0+IHIudmVyYm9zZV9jYWxsX2lkKVxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGlkID0+IGlkICYmIGlkLmxlbmd0aCA+IDApXG4gICAgICAgICAgICApXS5qb2luKCcmJyk7XG5cbiAgICAgICAgICAgIC8vIFJldHVybiBEYXRhVGFibGUgcm93IGZvcm1hdFxuICAgICAgICAgICAgLy8gRGF0YVRhYmxlcyBuZWVkcyBib3RoIGFycmF5IGluZGljZXMgQU5EIHNwZWNpYWwgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gW1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZERhdGUsICAgICAgICAgICAgICAvLyAwOiBkYXRlXG4gICAgICAgICAgICAgICAgZ3JvdXAuc3JjX251bSwgICAgICAgICAgICAgIC8vIDE6IHNvdXJjZSBudW1iZXJcbiAgICAgICAgICAgICAgICBncm91cC5kc3RfbnVtIHx8IGdyb3VwLmRpZCwgLy8gMjogZGVzdGluYXRpb24gbnVtYmVyIG9yIERJRFxuICAgICAgICAgICAgICAgIHRpbWluZywgICAgICAgICAgICAgICAgICAgICAvLyAzOiBkdXJhdGlvblxuICAgICAgICAgICAgICAgIHJlY29yZGluZ3MsICAgICAgICAgICAgICAgICAvLyA0OiByZWNvcmRpbmcgcmVjb3JkcyBhcnJheVxuICAgICAgICAgICAgICAgIGdyb3VwLmRpc3Bvc2l0aW9uLCAgICAgICAgICAvLyA1OiBkaXNwb3NpdGlvblxuICAgICAgICAgICAgICAgIGdyb3VwLnNyY19uYW1lIHx8ICcnLCAgICAgICAvLyA2OiBzb3VyY2UgY2FsbGVyIG5hbWUgZnJvbSBDRFJcbiAgICAgICAgICAgICAgICBncm91cC5kc3RfbmFtZSB8fCAnJyAgICAgICAgLy8gNzogZGVzdGluYXRpb24gY2FsbGVyIG5hbWUgZnJvbSBDRFJcbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIC8vIEFkZCBEYXRhVGFibGVzIHNwZWNpYWwgcHJvcGVydGllc1xuICAgICAgICAgICAgcm93LkRUX1Jvd0lkID0gZ3JvdXAubGlua2VkaWQ7XG4gICAgICAgICAgICByb3cuRFRfUm93Q2xhc3MgPSBkdFJvd0NsYXNzICsgbmVnYXRpdmVDbGFzcztcbiAgICAgICAgICAgIHJvdy5pZHMgPSBpZHM7IC8vIFN0b3JlIHJhdyBJRHMgd2l0aG91dCBlbmNvZGluZyAtIGVuY29kaW5nIHdpbGwgYmUgYXBwbGllZCB3aGVuIGJ1aWxkaW5nIFVSTFxuXG4gICAgICAgICAgICByZXR1cm4gcm93O1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSBzZXQgb2YgY2FsbCByZWNvcmRzIHdoZW4gYSByb3cgaXMgY2xpY2tlZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjYWxsIHJlY29yZHMuXG4gICAgICovXG4gICAgc2hvd1JlY29yZHMoZGF0YSkge1xuICAgICAgICBsZXQgaHRtbFBsYXllciA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIHRhYmxlIGNkci1wbGF5ZXJcIj48dGJvZHk+JztcbiAgICAgICAgZGF0YVs0XS5mb3JFYWNoKChyZWNvcmQsIGkpID0+IHtcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSAnPHRkPjx0cj48L3RyPjwvdGQ+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZWNvcmQucmVjb3JkaW5nZmlsZSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IG51bGxcbiAgICAgICAgICAgICAgICB8fCByZWNvcmQucmVjb3JkaW5nZmlsZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gYFxuXG48dHIgY2xhc3M9XCJkZXRhaWwtcmVjb3JkLXJvdyBkaXNhYmxlZFwiIGlkPVwiJHtyZWNvcmQuaWR9XCI+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGUgcmlnaHQgYWxpZ25lZFwiPlxuICAgXHRcdDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuXHQgICBcdDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke3JlY29yZC5pZH1cIiBzcmM9XCJcIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiIGRhdGEtdmFsdWU9XCJcIj48L2k+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiIGRhdGEtY2RyLW5hbWU9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChyZWNvcmQuc3JjX25hbWUgfHwgJycpfVwiPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJlY29yZC5zcmNfbnVtKX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCIgZGF0YS1jZHItbmFtZT1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJlY29yZC5kc3RfbmFtZSB8fCAnJyl9XCI+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocmVjb3JkLmRzdF9udW0pfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdG9rZW4tYmFzZWQgVVJMcyBpbnN0ZWFkIG9mIGRpcmVjdCBmaWxlIHBhdGhzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBTZWN1cml0eSAtIGhpZGVzIGFjdHVhbCBmaWxlIHBhdGhzIGZyb20gdXNlclxuICAgICAgICAgICAgICAgIC8vIFR3byBzZXBhcmF0ZSBlbmRwb2ludHM6IDpwbGF5YmFjayAoaW5saW5lKSBhbmQgOmRvd25sb2FkIChmaWxlKVxuICAgICAgICAgICAgICAgIGNvbnN0IHBsYXliYWNrVXJsID0gcmVjb3JkLnBsYXliYWNrX3VybCB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBkb3dubG9hZFVybCA9IHJlY29yZC5kb3dubG9hZF91cmwgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3dcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiJHtwbGF5YmFja1VybH1cIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IGljb24gdG9wIGxlZnQgcG9pbnRpbmcgZHJvcGRvd24gZG93bmxvYWQtZm9ybWF0LWRyb3Bkb3duXCIgZGF0YS1kb3dubG9hZC11cmw9XCIke2Rvd25sb2FkVXJsfVwiPlxuICAgIFx0XHQ8aSBjbGFzcz1cImRvd25sb2FkIGljb25cIj48L2k+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIndlYm1cIj5XZWJNIChPcHVzKTwvZGl2PlxuICAgIFx0XHRcdDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1mb3JtYXQ9XCJtcDNcIj5NUDM8L2Rpdj5cbiAgICBcdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtZm9ybWF0PVwid2F2XCI+V0FWPC9kaXY+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIm9nZ1wiPk9HRyAoT3B1cyk8L2Rpdj5cbiAgICBcdFx0PC9kaXY+XG4gICAgXHQ8L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCIgZGF0YS1jZHItbmFtZT1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJlY29yZC5zcmNfbmFtZSB8fCAnJyl9XCI+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocmVjb3JkLnNyY19udW0pfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIiBkYXRhLWNkci1uYW1lPVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocmVjb3JkLmRzdF9uYW1lIHx8ICcnKX1cIj4ke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChyZWNvcmQuZHN0X251bSl9PC9zcGFuPjwvdGQ+XG48L3RyPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodG1sUGxheWVyICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgcmV0dXJuIGh0bWxQbGF5ZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHBhZ2UgbGVuZ3RoIGZvciBEYXRhVGFibGUsIGNvbnNpZGVyaW5nIHVzZXIncyBzYXZlZCBwcmVmZXJlbmNlXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyBzYXZlZCB2YWx1ZSBvciB1c2UgdGhlIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCB2YWx1ZSBpZiBub25lIGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIHJldHVybiBzYXZlZFBhZ2VMZW5ndGggPyBwYXJzZUludChzYXZlZFBhZ2VMZW5ndGgsIDEwKSA6IGNhbGxEZXRhaWxSZWNvcmRzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHJvd3MgdGhhdCBjYW4gZml0IG9uIGEgcGFnZSBiYXNlZCBvbiB0aGUgY3VycmVudCB3aW5kb3cgaGVpZ2h0LlxuICAgICAqIER5bmFtaWNhbGx5IG1lYXN1cmVzIHRoZSBhY3R1YWwgb3ZlcmhlYWQgZnJvbSBET00gZWxlbWVudHMgaW5zdGVhZCBvZiB1c2luZyBhIGhhcmRjb2RlZCBlc3RpbWF0ZS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIE1lYXN1cmUgYWN0dWFsIHJvdyBoZWlnaHQgZnJvbSByZW5kZXJlZCByb3csIGZhbGxiYWNrIHRvIGNvbXBhY3QgdGFibGUgZGVmYXVsdCAofjM2cHgpXG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZmluZCgndGJvZHkgPiB0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKSB8fCAzNjtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgb3ZlcmhlYWQgZHluYW1pY2FsbHkgZnJvbSB0aGUgdGFibGUncyBwb3NpdGlvbiBpbiB0aGUgcGFnZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGxldCBvdmVyaGVhZCA9IDQwMDsgLy8gc2FmZSBmYWxsYmFja1xuICAgICAgICBjb25zdCB0YWJsZUVsID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmdldCgwKTtcbiAgICAgICAgaWYgKHRhYmxlRWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHRoZWFkID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmZpbmQoJ3RoZWFkJyk7XG4gICAgICAgICAgICBjb25zdCB0aGVhZEhlaWdodCA9IHRoZWFkLmxlbmd0aCA/IHRoZWFkLm91dGVySGVpZ2h0KCkgOiAzODtcbiAgICAgICAgICAgIGNvbnN0IHRhYmxlVG9wID0gdGFibGVFbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3A7XG5cbiAgICAgICAgICAgIC8vIFNwYWNlIGJlbG93OiBwYWdpbmF0aW9uKDUwKSArIGluZm8gYmFyKDMwKSArIHNlZ21lbnQgcGFkZGluZygxNCkgKyB2ZXJzaW9uIGZvb3RlcigzNSkgKyBtYXJnaW5zKDEwKVxuICAgICAgICAgICAgY29uc3QgYm90dG9tUmVzZXJ2ZSA9IDEzOTtcblxuICAgICAgICAgICAgb3ZlcmhlYWQgPSB0YWJsZVRvcCArIHRoZWFkSGVpZ2h0ICsgYm90dG9tUmVzZXJ2ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBvdmVyaGVhZCkgLyByb3dIZWlnaHQpLCA1KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yLlxuICAgICAqIEBwYXJhbSB7bW9tZW50fSBzdGFydERhdGUgLSBPcHRpb25hbCBlYXJsaWVzdCByZWNvcmQgZGF0ZSBmcm9tIGxhc3QgMTAwIHJlY29yZHNcbiAgICAgKiBAcGFyYW0ge21vbWVudH0gZW5kRGF0ZSAtIE9wdGlvbmFsIGxhdGVzdCByZWNvcmQgZGF0ZSBmcm9tIGxhc3QgMTAwIHJlY29yZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3Ioc3RhcnREYXRlID0gbnVsbCwgZW5kRGF0ZSA9IG51bGwpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgIG9wdGlvbnMucmFuZ2VzID0ge1xuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVG9kYXldOiBbbW9tZW50KCksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1llc3RlcmRheV06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RXZWVrXTogW21vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3QzMERheXNdOiBbbW9tZW50KCkuc3VidHJhY3QoMjksICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1RoaXNNb250aF06IFttb21lbnQoKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0TW9udGhdOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zLmFsd2F5c1Nob3dDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmF1dG9VcGRhdGVJbnB1dCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMubGlua2VkQ2FsZW5kYXJzID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5tYXhEYXRlID0gbW9tZW50KCk7XG4gICAgICAgIG9wdGlvbnMubG9jYWxlID0ge1xuICAgICAgICAgICAgZm9ybWF0OiAnREQvTU0vWVlZWScsXG4gICAgICAgICAgICBzZXBhcmF0b3I6ICcgLSAnLFxuICAgICAgICAgICAgYXBwbHlMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9BcHBseUJ0bixcbiAgICAgICAgICAgIGNhbmNlbExhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0NhbmNlbEJ0bixcbiAgICAgICAgICAgIGZyb21MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9mcm9tLFxuICAgICAgICAgICAgdG9MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF90byxcbiAgICAgICAgICAgIGN1c3RvbVJhbmdlTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ3VzdG9tUGVyaW9kLFxuICAgICAgICAgICAgZGF5c09mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LmRheXMsXG4gICAgICAgICAgICBtb250aE5hbWVzOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQubW9udGhzLFxuICAgICAgICAgICAgZmlyc3REYXk6IDEsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBkYXRlIHJhbmdlIGZyb20gbGFzdCAxMDAgcmVjb3JkcywgdXNlIGl0XG4gICAgICAgIC8vIFdIWTogUHJvdmlkZXMgbWVhbmluZ2Z1bCBjb250ZXh0IC0gdXNlciBzZWVzIHBlcmlvZCBjb3ZlcmluZyByZWNlbnQgY2FsbHNcbiAgICAgICAgaWYgKHN0YXJ0RGF0ZSAmJiBlbmREYXRlKSB7XG4gICAgICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudChzdGFydERhdGUpLnN0YXJ0T2YoJ2RheScpO1xuICAgICAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KGVuZERhdGUpLmVuZE9mKCdkYXknKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRvZGF5IGlmIG5vIHJlY29yZHNcbiAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KCk7XG4gICAgICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRlcmFuZ2VwaWNrZXIoXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0LFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIE5vdGU6IERvbid0IGNhbGwgYXBwbHlGaWx0ZXIgaGVyZSAtIERhdGFUYWJsZSBpcyBub3QgaW5pdGlhbGl6ZWQgeWV0XG4gICAgICAgIC8vIERhdGFUYWJsZSB3aWxsIGxvYWQgZGF0YSBhdXRvbWF0aWNhbGx5IGFmdGVyIGluaXRpYWxpemF0aW9uXG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3RvciBzZWxlY3QgZXZlbnQuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBzdGFydCAtIFRoZSBzdGFydCBkYXRlLlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gZW5kIC0gVGhlIGVuZCBkYXRlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYWJlbCAtIFRoZSBsYWJlbC5cbiAgICAgKi9cbiAgICBjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3Qoc3RhcnQsIGVuZCwgbGFiZWwpIHtcbiAgICAgICAgLy8gT25seSBwYXNzIHNlYXJjaCBrZXl3b3JkLCBkYXRlcyBhcmUgcmVhZCBkaXJlY3RseSBmcm9tIGRhdGUgcmFuZ2Ugc2VsZWN0b3JcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIoY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSk7XG4gICAgICAgIC8vIFN0YXRlIHdpbGwgYmUgc2F2ZWQgYXV0b21hdGljYWxseSBpbiBkcmF3IGV2ZW50IGFmdGVyIGZpbHRlciBpcyBhcHBsaWVkXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5zZWFyY2godGV4dCkuZHJhdygpO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgQ0RSIHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==