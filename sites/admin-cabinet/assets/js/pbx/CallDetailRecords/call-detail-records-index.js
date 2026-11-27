"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

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

/* global globalRootUrl, SemanticLocalization, ExtensionsAPI, moment, globalTranslate, CDRPlayer, CdrAPI, UserMessage, ACLHelper, SecurityUtils, PbxDateTime */

/**
 * callDetailRecords module.
 * @module callDetailRecords
 */
var callDetailRecords = {
  /**
   * The call detail records table element.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $cdrTable: null,

  /**
   * The global search input element.
   * @type {jQuery}
   */
  $globalSearch: null,

  /**
   * The date range selector element.
   * @type {jQuery}
   */
  $dateRangeSelector: null,

  /**
   * The search CDR input element.
   * @type {jQuery}
   */
  $searchCDRInput: null,

  /**
   * The page length selector.
   * @type {jQuery}
   */
  $pageLengthSelector: null,

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
  $emptyDatabasePlaceholder: null,

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
   * Preset periods of the date picker built from the PBX "today", keyed by a stable id
   * @type {Object<string, {label: string, range: moment.Moment[]}>}
   */
  datePresets: {},

  /**
   * Source of the shown period: a preset id, RECENT_PERIOD_KEY or null for custom dates
   * WHY: Saved with the filter state so that "Today" means the current PBX day after a reload,
   * not the day it was chosen on, and the default period follows new calls
   * @type {string|null}
   */
  activePresetKey: null,

  /**
   * Period source of the default range: the days of the last records
   * @type {string}
   */
  RECENT_PERIOD_KEY: 'recent',

  /**
   * Initializes the call detail records.
   */
  initialize: function initialize() {
    callDetailRecords.$cdrTable = $('#cdr-table');
    callDetailRecords.$globalSearch = $('#globalsearch');
    callDetailRecords.$dateRangeSelector = $('#date-range-selector');
    callDetailRecords.$searchCDRInput = $('#search-cdr-input');
    callDetailRecords.$pageLengthSelector = $('#page-length-select');
    callDetailRecords.$emptyDatabasePlaceholder = $('#cdr-empty-database-placeholder'); // Fetch metadata first, then initialize DataTable with proper date range
    // WHY: Prevents double request on page load

    callDetailRecords.fetchLatestCDRDate();
  },

  /**
   * Save current filter state to sessionStorage
   * Stores date range with its preset, search text and current page
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
        presetKey: callDetailRecords.activePresetKey,
        searchText: '',
        currentPage: 0
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
    var searchDebounceTimer = null; // The clear button of the search input fires "search", not keyup

    callDetailRecords.$globalSearch.on('search', function () {
      if (callDetailRecords.$globalSearch.val() === '') {
        clearTimeout(searchDebounceTimer);
        callDetailRecords.applyFilter('');
      }
    });
    callDetailRecords.$globalSearch.on('keyup', function (e) {
      // Clear previous timer if the user is still typing
      clearTimeout(searchDebounceTimer); // Set a new timer for delayed execution

      searchDebounceTimer = setTimeout(function () {
        // An emptied field is already applied by the "search" event where browsers fire it
        if (callDetailRecords.$globalSearch.val() === '' && callDetailRecords.dataTable.search() === '') {
          return;
        }

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
              // Calendar days of the PBX; the server includes the whole last day
              params.dateFrom = startDate.format('YYYY-MM-DD');
              params.dateTo = endDate.format('YYYY-MM-DD');
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
      if (data && data._meta) {
        PbxDateTime.setServerMeta(data._meta);
      }

      if (data && data.hasRecords) {
        var today = PbxDateTime.serverNowMoment();
        callDetailRecords.datePresets = callDetailRecords.buildDatePresets(today);

        var _callDetailRecords$ge = callDetailRecords.getInitialPeriod(savedState, data, today),
            _callDetailRecords$ge2 = _slicedToArray(_callDetailRecords$ge, 2),
            startDate = _callDetailRecords$ge2[0],
            endDate = _callDetailRecords$ge2[1];

        callDetailRecords.hasCDRRecords = true;
        callDetailRecords.initializeDateRangeSelector(startDate, endDate, today); // Initialize DataTable only if we have records
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
   * Builds the preset periods of the date picker.
   * @param {moment.Moment} today - Current PBX time (wall clock)
   * @returns {Object<string, {label: string, range: moment.Moment[]}>}
   */
  buildDatePresets: function buildDatePresets(today) {
    var day = function day() {
      return today.clone();
    };

    return {
      today: {
        label: globalTranslate.cal_Today,
        range: [day(), day()]
      },
      yesterday: {
        label: globalTranslate.cal_Yesterday,
        range: [day().subtract(1, 'days'), day().subtract(1, 'days')]
      },
      lastWeek: {
        label: globalTranslate.cal_LastWeek,
        range: [day().subtract(6, 'days'), day()]
      },
      last30Days: {
        label: globalTranslate.cal_Last30Days,
        range: [day().subtract(29, 'days'), day()]
      },
      thisMonth: {
        label: globalTranslate.cal_ThisMonth,
        range: [day().startOf('month'), day().endOf('month')]
      },
      lastMonth: {
        label: globalTranslate.cal_LastMonth,
        range: [day().subtract(1, 'month').startOf('month'), day().subtract(1, 'month').endOf('month')]
      }
    };
  },

  /**
   * Chooses the period shown on load: the saved preset recalculated for today, the saved dates,
   * or the dates of the last records (also when they were the saved source, so that new calls
   * show up). Both ends are limited to the PBX today
   * WHY: the picker limits only the end, and a start in the future gives an empty list
   * that the saved state would keep after every reload
   * @param {Object|null} savedState - Filter state from sessionStorage
   * @param {Object} metadata - getMetadata response data
   * @param {moment.Moment} today - Current PBX time (wall clock)
   * @returns {moment.Moment[]} Start and end dates
   */
  getInitialPeriod: function getInitialPeriod(savedState, metadata, today) {
    var lastDay = today.clone().endOf('day');

    var limit = function limit(range) {
      return range.map(function (date) {
        return moment.min(date.clone(), lastDay);
      });
    };

    var candidates = [];
    callDetailRecords.activePresetKey = null;
    var preset = savedState && callDetailRecords.datePresets[savedState.presetKey];

    if (preset) {
      candidates.push({
        range: preset.range,
        presetKey: savedState.presetKey
      });
    } else if (savedState && savedState.presetKey !== callDetailRecords.RECENT_PERIOD_KEY && savedState.dateFrom && savedState.dateTo) {
      candidates.push({
        range: [moment(savedState.dateFrom, 'YYYY-MM-DD', true), moment(savedState.dateTo, 'YYYY-MM-DD', true)],
        presetKey: null
      });
    }

    candidates.push({
      range: [moment(metadata.earliestDate), moment(metadata.latestDate)],
      presetKey: callDetailRecords.RECENT_PERIOD_KEY
    });

    for (var _i2 = 0, _candidates = candidates; _i2 < _candidates.length; _i2++) {
      var candidate = _candidates[_i2];

      var _candidate$range = _slicedToArray(candidate.range, 2),
          start = _candidate$range[0],
          end = _candidate$range[1];

      if (start.isValid() && end.isValid() && !start.isAfter(end, 'day')) {
        callDetailRecords.activePresetKey = candidate.presetKey;
        return limit(candidate.range);
      }
    }

    return [today.clone(), today.clone()];
  },

  /**
   * Initializes the date range selector.
   * @param {moment.Moment} startDate - First day of the shown period
   * @param {moment.Moment} endDate - Last day of the shown period
   * @param {moment.Moment} today - Current PBX time (wall clock): presets and the latest selectable day
   */
  initializeDateRangeSelector: function initializeDateRangeSelector(startDate, endDate, today) {
    var options = {};
    options.ranges = {};
    Object.values(callDetailRecords.datePresets).forEach(function (preset) {
      options.ranges[preset.label] = preset.range.map(function (date) {
        return date.clone();
      });
    });
    options.alwaysShowCalendars = true;
    options.autoUpdateInput = true;
    options.linkedCalendars = true;
    options.maxDate = today.clone().endOf('day');
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
    };
    options.startDate = startDate.clone().startOf('day');
    options.endDate = endDate.clone().endOf('day');
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
    callDetailRecords.activePresetKey = Object.keys(callDetailRecords.datePresets).find(function (key) {
      return callDetailRecords.datePresets[key].label === label;
    }) || null; // Only pass search keyword, dates are read directly from date range selector

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJGdsb2JhbFNlYXJjaCIsIiRkYXRlUmFuZ2VTZWxlY3RvciIsIiRzZWFyY2hDRFJJbnB1dCIsIiRwYWdlTGVuZ3RoU2VsZWN0b3IiLCJkYXRhVGFibGUiLCJwbGF5ZXJzIiwiaGFzQ0RSUmVjb3JkcyIsIiRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIiLCJTVE9SQUdFX0tFWSIsImlzSW5pdGlhbGl6ZWQiLCJkYXRlUHJlc2V0cyIsImFjdGl2ZVByZXNldEtleSIsIlJFQ0VOVF9QRVJJT0RfS0VZIiwiaW5pdGlhbGl6ZSIsIiQiLCJmZXRjaExhdGVzdENEUkRhdGUiLCJzYXZlRmlsdGVyc1N0YXRlIiwic2Vzc2lvblN0b3JhZ2UiLCJjb25zb2xlIiwid2FybiIsInN0YXRlIiwiZGF0ZUZyb20iLCJkYXRlVG8iLCJwcmVzZXRLZXkiLCJzZWFyY2hUZXh0IiwiY3VycmVudFBhZ2UiLCJkYXRlUmFuZ2VQaWNrZXIiLCJkYXRhIiwic3RhcnREYXRlIiwiZW5kRGF0ZSIsImZvcm1hdCIsInZhbCIsInBhZ2UiLCJwYWdlSW5mbyIsImluZm8iLCJzZXRJdGVtIiwiSlNPTiIsInN0cmluZ2lmeSIsImVycm9yIiwibG9hZEZpbHRlcnNTdGF0ZSIsInJhd0RhdGEiLCJnZXRJdGVtIiwicGFyc2UiLCJjbGVhckZpbHRlcnNTdGF0ZSIsInJlbW92ZUl0ZW0iLCJpbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMiLCJzZWFyY2hEZWJvdW5jZVRpbWVyIiwib24iLCJjbGVhclRpbWVvdXQiLCJhcHBseUZpbHRlciIsImUiLCJzZXRUaW1lb3V0Iiwic2VhcmNoIiwia2V5Q29kZSIsImxlbmd0aCIsInRleHQiLCJjYW5EZWxldGUiLCJBQ0xIZWxwZXIiLCJpc0FsbG93ZWQiLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwicHVzaCIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiY29sdW1uRGVmcyIsImRlZmF1bHRDb250ZW50IiwidGFyZ2V0cyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInBhcmFtcyIsImlzTGlua2VkSWRTZWFyY2giLCJpc1ZhbGlkIiwic2VhcmNoS2V5d29yZCIsInZhbHVlIiwidHJpbSIsImtleXdvcmQiLCJzdGFydHNXaXRoIiwic3JjX251bSIsInN1YnN0cmluZyIsImRzdF9udW0iLCJkaWQiLCJsaW5rZWRpZCIsImxpbWl0Iiwib2Zmc2V0Iiwic3RhcnQiLCJzb3J0Iiwib3JkZXIiLCJncm91cGVkIiwiZGF0YVNyYyIsImpzb24iLCJyZXN1bHQiLCJyZXN0RGF0YSIsInJlY29yZHMiLCJwYWdpbmF0aW9uIiwicmVjb3Jkc1RvdGFsIiwidG90YWwiLCJyZWNvcmRzRmlsdGVyZWQiLCJ0cmFuc2Zvcm1SZXN0VG9EYXRhVGFibGUiLCJiZWZvcmVTZW5kIiwieGhyIiwiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJzZXRSZXF1ZXN0SGVhZGVyIiwicGFnaW5nIiwic0RvbSIsImRlZmVyUmVuZGVyIiwicGFnZUxlbmd0aCIsImdldFBhZ2VMZW5ndGgiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZW1wdHlUYWJsZSIsImdldEVtcHR5VGFibGVNZXNzYWdlIiwiemVyb1JlY29yZHMiLCJjcmVhdGVkUm93Iiwicm93IiwiRFRfUm93Q2xhc3MiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJhZGRDbGFzcyIsImF0dHIiLCJhY3Rpb25zSHRtbCIsImNhblZpZXdMb2dzIiwiaWRzIiwiRFRfUm93SWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZHJfRGVsZXRlUmVjb3JkIiwiZHJhd0NhbGxiYWNrIiwiRXh0ZW5zaW9uc0FQSSIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsInRvZ2dsZVBhZ2luYXRpb25Db250cm9scyIsImluaXRDb21wbGV0ZSIsInJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJtaW5DaGFyYWN0ZXJzIiwic2VhcmNoT25Gb2N1cyIsInNlYXJjaEZpZWxkcyIsInNob3dOb1Jlc3VsdHMiLCJzb3VyY2UiLCJ0aXRsZSIsImNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciIsImNkcl9TZWFyY2hCeURlc3ROdW1iZXIiLCJjZHJfU2VhcmNoQnlESUQiLCJjZHJfU2VhcmNoQnlMaW5rZWRJRCIsImNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzcG9uc2UiLCJmb2N1cyIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibG9jYWxTdG9yYWdlIiwibGVuIiwiZHJhdyIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwic2F2ZWRQYWdlTGVuZ3RoIiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwicHJldmVudERlZmF1bHQiLCJjdXJyZW50VGFyZ2V0IiwidW5kZWZpbmVkIiwiZ2xvYmFsUm9vdFVybCIsImVuY29kZVVSSUNvbXBvbmVudCIsIndpbmRvdyIsIm9wZW4iLCJ0ciIsInRhcmdldCIsImNoaWxkIiwiaXNTaG93biIsImhpZGUiLCJzaG93UmVjb3JkcyIsInNob3ciLCJmaW5kIiwiZWFjaCIsImluZGV4IiwicGxheWVyUm93IiwiaWQiLCJDRFJQbGF5ZXIiLCIkYnV0dG9uIiwicmVjb3JkSWQiLCJkZWxldGVSZWNvcmQiLCJzYXZlZFN0YXRlIiwiQ2RyQVBJIiwiZGVsZXRlUmVjb3JkaW5nIiwicmVsb2FkIiwiZXJyb3JNc2ciLCJtZXNzYWdlcyIsImNkcl9EZWxldGVGYWlsZWQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInBhZ2VzIiwidGFibGUiLCJjb250YWluZXIiLCJnZXRNZXRhZGF0YSIsIl9tZXRhIiwiUGJ4RGF0ZVRpbWUiLCJzZXRTZXJ2ZXJNZXRhIiwiaGFzUmVjb3JkcyIsInRvZGF5Iiwic2VydmVyTm93TW9tZW50IiwiYnVpbGREYXRlUHJlc2V0cyIsImdldEluaXRpYWxQZXJpb2QiLCJpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3IiLCJzaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiY2RyX0ZpbHRlcmVkRW1wdHlUaXRsZSIsImNkcl9GaWx0ZXJlZEVtcHR5RGVzY3JpcHRpb24iLCJtYXAiLCJncm91cCIsImJpbGxzZWMiLCJ0b3RhbEJpbGxzZWMiLCJ0aW1lRm9ybWF0IiwidGltaW5nIiwibW9tZW50IiwidXRjIiwiZm9ybWF0dGVkRGF0ZSIsInJlY29yZGluZ3MiLCJmaWx0ZXIiLCJyIiwicmVjb3JkaW5nZmlsZSIsInNyY19uYW1lIiwiZHN0X25hbWUiLCJwbGF5YmFja191cmwiLCJkb3dubG9hZF91cmwiLCJoYXNSZWNvcmRpbmdzIiwiaXNBbnN3ZXJlZCIsImRpc3Bvc2l0aW9uIiwiZHRSb3dDbGFzcyIsIm5lZ2F0aXZlQ2xhc3MiLCJTZXQiLCJ2ZXJib3NlX2NhbGxfaWQiLCJqb2luIiwiaHRtbFBsYXllciIsImZvckVhY2giLCJyZWNvcmQiLCJpIiwicGxheWJhY2tVcmwiLCJkb3dubG9hZFVybCIsInBhcnNlSW50Iiwicm93SGVpZ2h0IiwiZmlyc3QiLCJvdXRlckhlaWdodCIsIndpbmRvd0hlaWdodCIsImlubmVySGVpZ2h0Iiwib3ZlcmhlYWQiLCJ0YWJsZUVsIiwiZ2V0IiwidGhlYWQiLCJ0aGVhZEhlaWdodCIsInRhYmxlVG9wIiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwidG9wIiwiYm90dG9tUmVzZXJ2ZSIsIk1hdGgiLCJtYXgiLCJmbG9vciIsImRheSIsImNsb25lIiwibGFiZWwiLCJjYWxfVG9kYXkiLCJyYW5nZSIsInllc3RlcmRheSIsImNhbF9ZZXN0ZXJkYXkiLCJzdWJ0cmFjdCIsImxhc3RXZWVrIiwiY2FsX0xhc3RXZWVrIiwibGFzdDMwRGF5cyIsImNhbF9MYXN0MzBEYXlzIiwidGhpc01vbnRoIiwiY2FsX1RoaXNNb250aCIsInN0YXJ0T2YiLCJlbmRPZiIsImxhc3RNb250aCIsImNhbF9MYXN0TW9udGgiLCJtZXRhZGF0YSIsImxhc3REYXkiLCJkYXRlIiwibWluIiwiY2FuZGlkYXRlcyIsInByZXNldCIsImVhcmxpZXN0RGF0ZSIsImxhdGVzdERhdGUiLCJjYW5kaWRhdGUiLCJlbmQiLCJpc0FmdGVyIiwib3B0aW9ucyIsInJhbmdlcyIsIk9iamVjdCIsInZhbHVlcyIsImFsd2F5c1Nob3dDYWxlbmRhcnMiLCJhdXRvVXBkYXRlSW5wdXQiLCJsaW5rZWRDYWxlbmRhcnMiLCJtYXhEYXRlIiwibG9jYWxlIiwic2VwYXJhdG9yIiwiYXBwbHlMYWJlbCIsImNhbF9BcHBseUJ0biIsImNhbmNlbExhYmVsIiwiY2FsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsImNhbF9mcm9tIiwidG9MYWJlbCIsImNhbF90byIsImN1c3RvbVJhbmdlTGFiZWwiLCJjYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJkYXRlcmFuZ2VwaWNrZXIiLCJjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QiLCJrZXlzIiwia2V5IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBTlc7O0FBUXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxJQVpPOztBQWN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxr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R0FBRDtBQUFBLGFBQVNsVSxpQkFBaUIsQ0FBQ1ksV0FBbEIsQ0FBOEJzVCxHQUE5QixFQUFtQ3hELEtBQW5DLEtBQTZDQSxLQUF0RDtBQUFBLEtBRDBCLEtBQ3NDLElBRDFFLENBRDJDLENBRzNDOztBQUNBMVEsSUFBQUEsaUJBQWlCLENBQUNtRCxXQUFsQixDQUE4Qm5ELGlCQUFpQixDQUFDRSxhQUFsQixDQUFnQytCLEdBQWhDLEVBQTlCLEVBSjJDLENBSzNDO0FBQ0gsR0FwOUJxQjs7QUFzOUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJa0IsRUFBQUEsV0ExOUJzQix1QkEwOUJWTSxJQTE5QlUsRUEwOUJKO0FBQ2R6RCxJQUFBQSxpQkFBaUIsQ0FBQ00sU0FBbEIsQ0FBNEJnRCxNQUE1QixDQUFtQ0csSUFBbkMsRUFBeUN3RyxJQUF6QztBQUNBakssSUFBQUEsaUJBQWlCLENBQUNFLGFBQWxCLENBQWdDbUssT0FBaEMsQ0FBd0MsS0FBeEMsRUFBK0N2QyxRQUEvQyxDQUF3RCxTQUF4RDtBQUNIO0FBNzlCcUIsQ0FBMUI7QUFnK0JBO0FBQ0E7QUFDQTs7QUFDQTlHLENBQUMsQ0FBQ21ULFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJwVSxFQUFBQSxpQkFBaUIsQ0FBQ2UsVUFBbEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNlbWFudGljTG9jYWxpemF0aW9uLCBFeHRlbnNpb25zQVBJLCBtb21lbnQsIGdsb2JhbFRyYW5zbGF0ZSwgQ0RSUGxheWVyLCBDZHJBUEksIFVzZXJNZXNzYWdlLCBBQ0xIZWxwZXIsIFNlY3VyaXR5VXRpbHMsIFBieERhdGVUaW1lICovXG5cbi8qKlxuICogY2FsbERldGFpbFJlY29yZHMgbW9kdWxlLlxuICogQG1vZHVsZSBjYWxsRGV0YWlsUmVjb3Jkc1xuICovXG5jb25zdCBjYWxsRGV0YWlsUmVjb3JkcyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgY2FsbCBkZXRhaWwgcmVjb3JkcyB0YWJsZSBlbGVtZW50LlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjZHJUYWJsZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkYXRlUmFuZ2VTZWxlY3RvcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBzZWFyY2ggQ0RSIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VhcmNoQ0RSSW5wdXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcGFnZUxlbmd0aFNlbGVjdG9yOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9mIHBsYXllcnMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHBsYXllcnM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIENEUiBkYXRhYmFzZSBoYXMgYW55IHJlY29yZHNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBoYXNDRFJSZWNvcmRzOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGVtcHR5IGRhdGFiYXNlIHBsYWNlaG9sZGVyIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBTdG9yYWdlIGtleSBmb3IgZmlsdGVyIHN0YXRlIGluIHNlc3Npb25TdG9yYWdlXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBTVE9SQUdFX0tFWTogJ2Nkcl9maWx0ZXJzX3N0YXRlJyxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgRGF0YVRhYmxlIGhhcyBjb21wbGV0ZWQgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBXSFk6IFByZXZlbnRzIHNhdmluZyBzdGF0ZSBkdXJpbmcgaW5pdGlhbCBsb2FkIGJlZm9yZSBmaWx0ZXJzIGFyZSByZXN0b3JlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogUHJlc2V0IHBlcmlvZHMgb2YgdGhlIGRhdGUgcGlja2VyIGJ1aWx0IGZyb20gdGhlIFBCWCBcInRvZGF5XCIsIGtleWVkIGJ5IGEgc3RhYmxlIGlkXG4gICAgICogQHR5cGUge09iamVjdDxzdHJpbmcsIHtsYWJlbDogc3RyaW5nLCByYW5nZTogbW9tZW50Lk1vbWVudFtdfT59XG4gICAgICovXG4gICAgZGF0ZVByZXNldHM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogU291cmNlIG9mIHRoZSBzaG93biBwZXJpb2Q6IGEgcHJlc2V0IGlkLCBSRUNFTlRfUEVSSU9EX0tFWSBvciBudWxsIGZvciBjdXN0b20gZGF0ZXNcbiAgICAgKiBXSFk6IFNhdmVkIHdpdGggdGhlIGZpbHRlciBzdGF0ZSBzbyB0aGF0IFwiVG9kYXlcIiBtZWFucyB0aGUgY3VycmVudCBQQlggZGF5IGFmdGVyIGEgcmVsb2FkLFxuICAgICAqIG5vdCB0aGUgZGF5IGl0IHdhcyBjaG9zZW4gb24sIGFuZCB0aGUgZGVmYXVsdCBwZXJpb2QgZm9sbG93cyBuZXcgY2FsbHNcbiAgICAgKiBAdHlwZSB7c3RyaW5nfG51bGx9XG4gICAgICovXG4gICAgYWN0aXZlUHJlc2V0S2V5OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogUGVyaW9kIHNvdXJjZSBvZiB0aGUgZGVmYXVsdCByYW5nZTogdGhlIGRheXMgb2YgdGhlIGxhc3QgcmVjb3Jkc1xuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgUkVDRU5UX1BFUklPRF9LRVk6ICdyZWNlbnQnLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGNhbGwgZGV0YWlsIHJlY29yZHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlID0gJCgnI2Nkci10YWJsZScpO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoID0gJCgnI2dsb2JhbHNlYXJjaCcpO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZGF0ZVJhbmdlU2VsZWN0b3IgPSAkKCcjZGF0ZS1yYW5nZS1zZWxlY3RvcicpO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kc2VhcmNoQ0RSSW5wdXQgPSAkKCcjc2VhcmNoLWNkci1pbnB1dCcpO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yID0gJCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyID0gJCgnI2Nkci1lbXB0eS1kYXRhYmFzZS1wbGFjZWhvbGRlcicpO1xuXG4gICAgICAgIC8vIEZldGNoIG1ldGFkYXRhIGZpcnN0LCB0aGVuIGluaXRpYWxpemUgRGF0YVRhYmxlIHdpdGggcHJvcGVyIGRhdGUgcmFuZ2VcbiAgICAgICAgLy8gV0hZOiBQcmV2ZW50cyBkb3VibGUgcmVxdWVzdCBvbiBwYWdlIGxvYWRcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZmV0Y2hMYXRlc3RDRFJEYXRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmUgY3VycmVudCBmaWx0ZXIgc3RhdGUgdG8gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBTdG9yZXMgZGF0ZSByYW5nZSB3aXRoIGl0cyBwcmVzZXQsIHNlYXJjaCB0ZXh0IGFuZCBjdXJyZW50IHBhZ2VcbiAgICAgKi9cbiAgICBzYXZlRmlsdGVyc1N0YXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRmVhdHVyZSBkZXRlY3Rpb24gLSBleGl0IHNpbGVudGx5IGlmIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvblN0b3JhZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQ0RSXSBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICBkYXRlRnJvbTogbnVsbCxcbiAgICAgICAgICAgICAgICBkYXRlVG86IG51bGwsXG4gICAgICAgICAgICAgICAgcHJlc2V0S2V5OiBjYWxsRGV0YWlsUmVjb3Jkcy5hY3RpdmVQcmVzZXRLZXksXG4gICAgICAgICAgICAgICAgc2VhcmNoVGV4dDogJycsXG4gICAgICAgICAgICAgICAgY3VycmVudFBhZ2U6IDAsXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBHZXQgZGF0ZXMgZnJvbSBkYXRlcmFuZ2VwaWNrZXIgaW5zdGFuY2VcbiAgICAgICAgICAgIGNvbnN0IGRhdGVSYW5nZVBpY2tlciA9IGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRhKCdkYXRlcmFuZ2VwaWNrZXInKTtcbiAgICAgICAgICAgIGlmIChkYXRlUmFuZ2VQaWNrZXIgJiYgZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZSAmJiBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLmRhdGVGcm9tID0gZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZS5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kYXRlVG8gPSBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZS5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gR2V0IHNlYXJjaCB0ZXh0IGZyb20gaW5wdXQgZmllbGRcbiAgICAgICAgICAgIHN0YXRlLnNlYXJjaFRleHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpIHx8ICcnO1xuXG4gICAgICAgICAgICAvLyBHZXQgY3VycmVudCBwYWdlIGZyb20gRGF0YVRhYmxlIChpZiBpbml0aWFsaXplZClcbiAgICAgICAgICAgIGlmIChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUgJiYgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWdlSW5mbyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmluZm8oKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5jdXJyZW50UGFnZSA9IHBhZ2VJbmZvLnBhZ2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oY2FsbERldGFpbFJlY29yZHMuU1RPUkFHRV9LRVksIEpTT04uc3RyaW5naWZ5KHN0YXRlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbQ0RSXSBGYWlsZWQgdG8gc2F2ZSBmaWx0ZXJzIHRvIHNlc3Npb25TdG9yYWdlOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZpbHRlciBzdGF0ZSBmcm9tIHNlc3Npb25TdG9yYWdlXG4gICAgICogQHJldHVybnMge09iamVjdHxudWxsfSBTYXZlZCBzdGF0ZSBvYmplY3Qgb3IgbnVsbCBpZiBub3QgZm91bmQvaW52YWxpZFxuICAgICAqL1xuICAgIGxvYWRGaWx0ZXJzU3RhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBGZWF0dXJlIGRldGVjdGlvbiAtIHJldHVybiBudWxsIGlmIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvblN0b3JhZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQ0RSXSBzZXNzaW9uU3RvcmFnZSBub3QgYXZhaWxhYmxlIGZvciBsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJhd0RhdGEgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGNhbGxEZXRhaWxSZWNvcmRzLlNUT1JBR0VfS0VZKTtcbiAgICAgICAgICAgIGlmICghcmF3RGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzdGF0ZSA9IEpTT04ucGFyc2UocmF3RGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHN0YXRlIHN0cnVjdHVyZVxuICAgICAgICAgICAgaWYgKCFzdGF0ZSB8fCB0eXBlb2Ygc3RhdGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2xlYXJGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0NEUl0gRmFpbGVkIHRvIGxvYWQgZmlsdGVycyBmcm9tIHNlc3Npb25TdG9yYWdlOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGNvcnJ1cHRlZCBkYXRhXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jbGVhckZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgc2F2ZWQgZmlsdGVyIHN0YXRlIGZyb20gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKi9cbiAgICBjbGVhckZpbHRlcnNTdGF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvblN0b3JhZ2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShjYWxsRGV0YWlsUmVjb3Jkcy5TVE9SQUdFX0tFWSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY2xlYXIgQ0RSIGZpbHRlcnMgZnJvbSBzZXNzaW9uU3RvcmFnZTonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEYXRhVGFibGUgYW5kIGV2ZW50IGhhbmRsZXJzXG4gICAgICogQ2FsbGVkIGFmdGVyIG1ldGFkYXRhIGlzIHJlY2VpdmVkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZUFuZEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRlYm91bmNlIHRpbWVyIHZhcmlhYmxlXG4gICAgICAgIGxldCBzZWFyY2hEZWJvdW5jZVRpbWVyID0gbnVsbDtcblxuICAgICAgICAvLyBUaGUgY2xlYXIgYnV0dG9uIG9mIHRoZSBzZWFyY2ggaW5wdXQgZmlyZXMgXCJzZWFyY2hcIiwgbm90IGtleXVwXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gub24oJ3NlYXJjaCcsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWFyY2hEZWJvdW5jZVRpbWVyKTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcignJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVyIGlmIHRoZSB1c2VyIGlzIHN0aWxsIHR5cGluZ1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNlYXJjaERlYm91bmNlVGltZXIpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgZm9yIGRlbGF5ZWQgZXhlY3V0aW9uXG4gICAgICAgICAgICBzZWFyY2hEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQW4gZW1wdGllZCBmaWVsZCBpcyBhbHJlYWR5IGFwcGxpZWQgYnkgdGhlIFwic2VhcmNoXCIgZXZlbnQgd2hlcmUgYnJvd3NlcnMgZmlyZSBpdFxuICAgICAgICAgICAgICAgIGlmIChjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpID09PSAnJyAmJiBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuc2VhcmNoKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTNcbiAgICAgICAgICAgICAgICAgICAgfHwgZS5rZXlDb2RlID09PSA4XG4gICAgICAgICAgICAgICAgICAgIHx8IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgcGFzcyB0aGUgc2VhcmNoIGtleXdvcmQsIGRhdGVzIGFyZSBoYW5kbGVkIHNlcGFyYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7IC8vIDUwMG1zIGRlbGF5IGJlZm9yZSBleGVjdXRpbmcgdGhlIHNlYXJjaFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCdWlsZCBjb2x1bW5zIGR5bmFtaWNhbGx5IGJhc2VkIG9uIEFDTCBwZXJtaXNzaW9uc1xuICAgICAgICAvLyBXSFk6IFZvbHQgdGVtcGxhdGUgY29uZGl0aW9uYWxseSByZW5kZXJzIGRlbGV0ZSBjb2x1bW4gaGVhZGVyIGJhc2VkIG9uIGlzQWxsb3dlZCgnc2F2ZScpXG4gICAgICAgIC8vICdzYXZlJyBpcyBhIHZpcnR1YWwgcGVybWlzc2lvbiB0aGF0IGluY2x1ZGVzIGRlbGV0ZSBjYXBhYmlsaXR5IGluIE1vZHVsZVVzZXJzVUlcbiAgICAgICAgLy8gSWYgY29sdW1ucyBjb25maWcgZG9lc24ndCBtYXRjaCA8dGhlYWQ+IGNvdW50LCBEYXRhVGFibGVzIHRocm93cyAnc3R5bGUnIHVuZGVmaW5lZCBlcnJvclxuICAgICAgICBjb25zdCBjYW5EZWxldGUgPSB0eXBlb2YgQUNMSGVscGVyICE9PSAndW5kZWZpbmVkJyAmJiBBQ0xIZWxwZXIuaXNBbGxvd2VkKCdzYXZlJyk7XG4gICAgICAgIGNvbnN0IGNvbHVtbnMgPSBbXG4gICAgICAgICAgICB7IGRhdGE6IG51bGwsIG9yZGVyYWJsZTogZmFsc2UgfSwgIC8vIDA6IGV4cGFuZCBpY29uIGNvbHVtblxuICAgICAgICAgICAgeyBkYXRhOiAwIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAxOiBkYXRlIChhcnJheSBpbmRleCAwKVxuICAgICAgICAgICAgeyBkYXRhOiAxIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAyOiBzcmNfbnVtIChhcnJheSBpbmRleCAxKVxuICAgICAgICAgICAgeyBkYXRhOiAyIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAzOiBkc3RfbnVtIChhcnJheSBpbmRleCAyKVxuICAgICAgICAgICAgeyBkYXRhOiAzIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyA0OiBkdXJhdGlvbiAoYXJyYXkgaW5kZXggMylcbiAgICAgICAgXTtcbiAgICAgICAgaWYgKGNhbkRlbGV0ZSkge1xuICAgICAgICAgICAgY29sdW1ucy5wdXNoKHsgZGF0YTogbnVsbCwgb3JkZXJhYmxlOiBmYWxzZSB9KTsgIC8vIDU6IGFjdGlvbnMgY29sdW1uIChsb2dzIGljb24gKyBkZWxldGUpXG4gICAgICAgIH1cblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZGF0YVRhYmxlKHtcbiAgICAgICAgICAgIHNlYXJjaDoge1xuICAgICAgICAgICAgICAgIHNlYXJjaDogY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXJ2ZXJTaWRlOiB0cnVlLFxuICAgICAgICAgICAgcHJvY2Vzc2luZzogdHJ1ZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IGNvbHVtbnMsXG4gICAgICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAgICAgICAgeyBkZWZhdWx0Q29udGVudDogXCItXCIsICB0YXJnZXRzOiBcIl9hbGxcIn0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9jZHInLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdHRVQnLCAgLy8gUkVTVCBBUEkgdXNlcyBHRVQgZm9yIGxpc3QgcmV0cmlldmFsXG4gICAgICAgICAgICAgICAgZGF0YTogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGlzTGlua2VkSWRTZWFyY2ggPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyAxLiBBbHdheXMgZ2V0IGRhdGVzIGZyb20gZGF0ZSByYW5nZSBzZWxlY3RvciB1c2luZyBkYXRlcmFuZ2VwaWNrZXIgQVBJXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVSYW5nZVBpY2tlciA9IGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRhKCdkYXRlcmFuZ2VwaWNrZXInKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGVSYW5nZVBpY2tlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuZERhdGUgPSBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0RGF0ZSAmJiBzdGFydERhdGUuaXNWYWxpZCgpICYmIGVuZERhdGUgJiYgZW5kRGF0ZS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDYWxlbmRhciBkYXlzIG9mIHRoZSBQQlg7IHRoZSBzZXJ2ZXIgaW5jbHVkZXMgdGhlIHdob2xlIGxhc3QgZGF5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRhdGVGcm9tID0gc3RhcnREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kYXRlVG8gPSBlbmREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gMi4gUHJvY2VzcyBzZWFyY2gga2V5d29yZCBmcm9tIHNlYXJjaCBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hLZXl3b3JkID0gZC5zZWFyY2gudmFsdWUgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlYXJjaEtleXdvcmQudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXl3b3JkID0gc2VhcmNoS2V5d29yZC50cmltKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHNlYXJjaCBwcmVmaXhlczogc3JjOiwgZHN0OiwgZGlkOiwgbGlua2VkaWQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdzcmM6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgc291cmNlIG51bWJlciBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNyY19udW0gPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnZHN0OicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IGRlc3RpbmF0aW9uIG51bWJlciBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRzdF9udW0gPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnZGlkOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IERJRCBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRpZCA9IGtleXdvcmQuc3Vic3RyaW5nKDQpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdsaW5rZWRpZDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBsaW5rZWRpZCAtIGlnbm9yZSBkYXRlIHJhbmdlIGZvciBsaW5rZWRpZCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMubGlua2VkaWQgPSBrZXl3b3JkLnN1YnN0cmluZyg5KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNMaW5rZWRJZFNlYXJjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRhdGUgcGFyYW1zIGZvciBsaW5rZWRpZCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcGFyYW1zLmRhdGVGcm9tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJhbXMuZGF0ZVRvO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGdWxsLXRleHQgc2VhcmNoOiBzZWFyY2ggaW4gc3JjX251bSwgZHN0X251bSwgYW5kIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlciBleHBlY3RzIHNlYXJjaCB3aXRob3V0IHByZWZpeCB0byBmaW5kIG51bWJlciBhbnl3aGVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zZWFyY2ggPSBrZXl3b3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUkVTVCBBUEkgcGFnaW5hdGlvbiBwYXJhbWV0ZXJzXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5saW1pdCA9IGQubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMub2Zmc2V0ID0gZC5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNvcnQgPSAnc3RhcnQnOyAgLy8gU29ydCBieSBjYWxsIHN0YXJ0IHRpbWUgZm9yIGNocm9ub2xvZ2ljYWwgb3JkZXJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9yZGVyID0gJ0RFU0MnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFdIWTogV2ViVUkgYWx3YXlzIG5lZWRzIGdyb3VwZWQgcmVjb3JkcyAoYnkgbGlua2VkaWQpIGZvciBwcm9wZXIgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICAvLyBCYWNrZW5kIGRlZmF1bHRzIHRvIGdyb3VwZWQ9dHJ1ZSwgYnV0IGV4cGxpY2l0IGlzIGJldHRlciB0aGFuIGltcGxpY2l0XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5ncm91cGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVNyYzogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBUEkgcmV0dXJucyBQQlhBcGlSZXN1bHQgc3RydWN0dXJlOlxuICAgICAgICAgICAgICAgICAgICAvLyB7cmVzdWx0OiB0cnVlLCBkYXRhOiB7cmVjb3JkczogWy4uLl0sIHBhZ2luYXRpb246IHsuLi59fX1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGpzb24ucmVzdWx0ICYmIGpzb24uZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXh0cmFjdCByZWNvcmRzIGFuZCBwYWdpbmF0aW9uIGZyb20gbmVzdGVkIGRhdGEgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN0RGF0YSA9IGpzb24uZGF0YS5yZWNvcmRzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFnaW5hdGlvbiA9IGpzb24uZGF0YS5wYWdpbmF0aW9uIHx8IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgRGF0YVRhYmxlcyBwYWdpbmF0aW9uIHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc1RvdGFsID0gcGFnaW5hdGlvbi50b3RhbCB8fCAwO1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzRmlsdGVyZWQgPSBwYWdpbmF0aW9uLnRvdGFsIHx8IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyYW5zZm9ybSBSRVNUIHJlY29yZHMgdG8gRGF0YVRhYmxlIHJvd3NcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsRGV0YWlsUmVjb3Jkcy50cmFuc2Zvcm1SZXN0VG9EYXRhVGFibGUocmVzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgQmVhcmVyIHRva2VuIGZvciBBUEkgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIC8vc2Nyb2xsWTogJCh3aW5kb3cpLmhlaWdodCgpIC0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9mZnNldCgpLnRvcC0xNTAsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IGNhbGxEZXRhaWxSZWNvcmRzLmdldFBhZ2VMZW5ndGgoKSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiB7XG4gICAgICAgICAgICAgICAgLi4uU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgICAgIGVtcHR5VGFibGU6IGNhbGxEZXRhaWxSZWNvcmRzLmdldEVtcHR5VGFibGVNZXNzYWdlKCksXG4gICAgICAgICAgICAgICAgemVyb1JlY29yZHM6IGNhbGxEZXRhaWxSZWNvcmRzLmdldEVtcHR5VGFibGVNZXNzYWdlKClcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyB0aGUgQ0RSIHJvdy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuRFRfUm93Q2xhc3MuaW5kZXhPZihcImRldGFpbGVkXCIpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBjYXJldCBkb3duXCI+PC9pPicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDEpLmh0bWwoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGFbMF0pKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMilcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGFbMV0pKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtY2RyLW5hbWUnLCBkYXRhWzZdIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGFbMl0pKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtY2RyLW5hbWUnLCBkYXRhWzddIHx8ICcnKTtcblxuICAgICAgICAgICAgICAgIC8vIER1cmF0aW9uIGNvbHVtbiAobm8gaWNvbnMpXG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmh0bWwoZGF0YVszXSkuYWRkQ2xhc3MoJ3JpZ2h0IGFsaWduZWQnKTtcblxuICAgICAgICAgICAgICAgIC8vIEFjdGlvbnMgY29sdW1uOiBvbmx5IHJlbmRlciBpZiB1c2VyIGhhcyBkZWxldGUgcGVybWlzc2lvblxuICAgICAgICAgICAgICAgIC8vIFdIWTogVm9sdCB0ZW1wbGF0ZSBjb25kaXRpb25hbGx5IHJlbmRlcnMgdGhpcyBjb2x1bW4gYmFzZWQgb24gaXNBbGxvd2VkKCdkZWxldGUnKVxuICAgICAgICAgICAgICAgIGlmICghY2FuRGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBMYXN0IGNvbHVtbjogbG9nIGljb24gKyBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgbGV0IGFjdGlvbnNIdG1sID0gJyc7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgbG9nIGljb24gaWYgdXNlciBoYXMgYWNjZXNzIHRvIFN5c3RlbSBEaWFnbm9zdGljXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBMb2cgaWNvbiBsaW5rcyB0byBzeXN0ZW0tZGlhZ25vc3RpYyBwYWdlIHdoaWNoIHJlcXVpcmVzIHNwZWNpZmljIHBlcm1pc3Npb25zXG4gICAgICAgICAgICAgICAgY29uc3QgY2FuVmlld0xvZ3MgPSB0eXBlb2YgQUNMSGVscGVyICE9PSAndW5kZWZpbmVkJyAmJiBBQ0xIZWxwZXIuaXNBbGxvd2VkKCd2aWV3U3lzdGVtRGlhZ25vc3RpYycpO1xuICAgICAgICAgICAgICAgIGlmIChjYW5WaWV3TG9ncyAmJiBkYXRhLmlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uc0h0bWwgKz0gYDxpIGRhdGEtaWRzPVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YS5pZHMpfVwiIGNsYXNzPVwiZmlsZSBhbHRlcm5hdGUgb3V0bGluZSBpY29uXCIgc3R5bGU9XCJjdXJzb3I6IHBvaW50ZXI7IG1hcmdpbi1yaWdodDogOHB4O1wiPjwvaT5gO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFkZCBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBVc2UgdHdvLXN0ZXBzLWRlbGV0ZSBtZWNoYW5pc20gdG8gcHJldmVudCBhY2NpZGVudGFsIGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgLy8gRmlyc3QgY2xpY2sgY2hhbmdlcyB0cmFzaCBpY29uIHRvIGNsb3NlIGljb24sIHNlY29uZCBjbGljayBkZWxldGVzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBVc2UgZGF0YS5EVF9Sb3dJZCB3aGljaCBjb250YWlucyBsaW5rZWRpZCBmb3IgZ3JvdXBlZCByZWNvcmRzXG4gICAgICAgICAgICAgICAgYWN0aW9uc0h0bWwgKz0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ0d28tc3RlcHMtZGVsZXRlIGRlbGV0ZS1yZWNvcmQgcG9wdXBlZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcmVjb3JkLWlkPVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YS5EVF9Sb3dJZCl9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0RlbGV0ZVJlY29yZCB8fCAnRGVsZXRlIHJlY29yZCd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIiBzdHlsZT1cIm1hcmdpbjogMDtcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5gO1xuXG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDUpLmh0bWwoYWN0aW9uc0h0bWwpLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSW5pdGlhbGl6YXRpb24gY29tcGxldGUgY2FsbGJhY2sgLSBmaXJlZCBhZnRlciBmaXJzdCBkYXRhIGxvYWRcbiAgICAgICAgICAgICAqIFdIWTogUmVzdG9yZSBmaWx0ZXJzIEFGVEVSIERhdGFUYWJsZSBoYXMgbG9hZGVkIGluaXRpYWwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbml0Q29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGZsYWcgRklSU1QgdG8gYWxsb3cgc3RhdGUgc2F2aW5nIGR1cmluZyBmaWx0ZXIgcmVzdG9yYXRpb25cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAvLyBOb3cgcmVzdG9yZSBmaWx0ZXJzIC0gZHJhdyBldmVudCB3aWxsIGNvcnJlY3RseSBzYXZlIHRoZSByZXN0b3JlZCBzdGF0ZVxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLkRhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIFNlYXJjaCBjb21wb25lbnQgQUZURVIgRGF0YVRhYmxlIGlzIGNyZWF0ZWRcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCh7XG4gICAgICAgICAgICBtaW5DaGFyYWN0ZXJzOiAwLFxuICAgICAgICAgICAgc2VhcmNoT25Gb2N1czogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hGaWVsZHM6IFsndGl0bGUnXSxcbiAgICAgICAgICAgIHNob3dOb1Jlc3VsdHM6IGZhbHNlLFxuICAgICAgICAgICAgc291cmNlOiBbXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciwgdmFsdWU6ICdzcmM6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlEZXN0TnVtYmVyLCB2YWx1ZTogJ2RzdDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeURJRCwgdmFsdWU6ICdkaWQ6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlMaW5rZWRJRCwgdmFsdWU6ICdsaW5rZWRpZDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSwgdmFsdWU6ICcnIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb25TZWxlY3Q6IGZ1bmN0aW9uKHJlc3VsdCwgcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbChyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goJ2hpZGUgcmVzdWx0cycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHNlYXJjaCB3aGVuIHlvdSBjbGljayBvbiB0aGUgaWNvblxuICAgICAgICAkKCcjc2VhcmNoLWljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guZm9jdXMoKTtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goJ3F1ZXJ5Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIHRvIHNhdmUgdGhlIHVzZXIncyBwYWdlIGxlbmd0aCBzZWxlY3Rpb24gYW5kIHVwZGF0ZSB0aGUgdGFibGVcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZShwYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VMZW5ndGggPT09ICdhdXRvJykge1xuICAgICAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoID0gY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcsIHBhZ2VMZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHRoZSBldmVudCBmcm9tIGJ1YmJsaW5nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgc2VsZWN0IGlucHV0IHZhbHVlIHRvIHRoZSBzYXZlZCB2YWx1ZSBpZiBpdCBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBzYXZlZFBhZ2VMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBTa2lwIHNhdmluZyBzdGF0ZSBkdXJpbmcgaW5pdGlhbCBsb2FkIGJlZm9yZSBmaWx0ZXJzIGFyZSByZXN0b3JlZFxuICAgICAgICAgICAgaWYgKCFjYWxsRGV0YWlsUmVjb3Jkcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTYXZlIHN0YXRlIGFmdGVyIGV2ZXJ5IGRyYXcgKHBhZ2luYXRpb24sIHNlYXJjaCwgZGF0ZSBjaGFuZ2UpXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5zYXZlRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3IgY2xpY2tpbmcgb24gaWNvbiB3aXRoIGRhdGEtaWRzIChvcGVuIGluIG5ldyB3aW5kb3cpXG4gICAgICAgIC8vIFdIWTogQ2xpY2tpbmcgb24gaWNvbiBzaG91bGQgb3BlbiBTeXN0ZW0gRGlhZ25vc3RpYyBpbiBuZXcgd2luZG93IHRvIHZpZXcgdmVyYm9zZSBsb2dzXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5vbignY2xpY2snLCAnW2RhdGEtaWRzXScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHJvdyB0b2dnbGVcblxuICAgICAgICAgICAgY29uc3QgaWRzID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtaWRzJyk7XG4gICAgICAgICAgICBpZiAoaWRzICE9PSB1bmRlZmluZWQgJiYgaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFdIWTogRm9ybWF0IGFzIHF1ZXJ5IHBhcmFtICsgaGFzaDogP2ZpbHRlcj0uLi4jZmlsZT0uLi5cbiAgICAgICAgICAgICAgICAvLyBPcGVuIGluIG5ldyB3aW5kb3cgdG8gYWxsb3cgdmlld2luZyBsb2dzIHdoaWxlIGtlZXBpbmcgQ0RSIHRhYmxlIHZpc2libGVcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBgJHtnbG9iYWxSb290VXJsfXN5c3RlbS1kaWFnbm9zdGljL2luZGV4Lz9maWx0ZXI9JHtlbmNvZGVVUklDb21wb25lbnQoaWRzKX0jZmlsZT1hc3RlcmlzayUyRnZlcmJvc2VgO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5vcGVuKHVybCwgJ19ibGFuaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgZm9yIG9wZW5pbmcgYW5kIGNsb3NpbmcgZGV0YWlsc1xuICAgICAgICAvLyBXSFk6IE9ubHkgZXhwYW5kL2NvbGxhcHNlIG9uIGZpcnN0IGNvbHVtbiAoY2FyZXQgaWNvbikgY2xpY2ssIG5vdCBvbiBhY3Rpb24gaWNvbnNcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICd0ci5kZXRhaWxlZCB0ZDpmaXJzdC1jaGlsZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ciA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucm93KHRyKTtcblxuICAgICAgICAgICAgaWYgKHJvdy5jaGlsZC5pc1Nob3duKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIHJvdyBpcyBhbHJlYWR5IG9wZW4gLSBjbG9zZSBpdFxuICAgICAgICAgICAgICAgIHJvdy5jaGlsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgdHIucmVtb3ZlQ2xhc3MoJ3Nob3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE9wZW4gdGhpcyByb3dcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoY2FsbERldGFpbFJlY29yZHMuc2hvd1JlY29yZHMocm93LmRhdGEoKSkpLnNob3coKTtcbiAgICAgICAgICAgICAgICB0ci5hZGRDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgICAgICByb3cuY2hpbGQoKS5maW5kKCcuZGV0YWlsLXJlY29yZC1yb3cnKS5lYWNoKChpbmRleCwgcGxheWVyUm93KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gJChwbGF5ZXJSb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ0RSUGxheWVyKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHNlY29uZCBjbGljayBvbiBkZWxldGUgYnV0dG9uIChhZnRlciB0d28tc3RlcHMtZGVsZXRlIGNoYW5nZXMgaWNvbiB0byBjbG9zZSlcbiAgICAgICAgLy8gV0hZOiBUd28tc3RlcHMtZGVsZXRlIG1lY2hhbmlzbSBwcmV2ZW50cyBhY2NpZGVudGFsIGRlbGV0aW9uXG4gICAgICAgIC8vIEZpcnN0IGNsaWNrOiB0cmFzaCDihpIgY2xvc2UgKGJ5IGRlbGV0ZS1zb21ldGhpbmcuanMpLCBTZWNvbmQgY2xpY2s6IGV4ZWN1dGUgZGVsZXRpb25cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICdhLmRlbGV0ZS1yZWNvcmQ6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHJvdyBleHBhbnNpb25cblxuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXJlY29yZC1pZCcpO1xuXG4gICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBZGQgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQgbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBBbHdheXMgZGVsZXRlIHdpdGggcmVjb3JkaW5ncyBhbmQgbGlua2VkIHJlY29yZHNcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRlbGV0ZVJlY29yZChyZWNvcmRJZCwgJGJ1dHRvbik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXN0b3JlIGZpbHRlcnMgZnJvbSBzYXZlZCBzdGF0ZSBhZnRlciBEYXRhVGFibGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBXSFk6IE11c3QgYmUgY2FsbGVkIGFmdGVyIERhdGFUYWJsZSBpcyBjcmVhdGVkIHRvIHJlc3RvcmUgc2VhcmNoIGFuZCBwYWdlXG4gICAgICovXG4gICAgcmVzdG9yZUZpbHRlcnNGcm9tU3RhdGUoKSB7XG4gICAgICAgIGNvbnN0IHNhdmVkU3RhdGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy5sb2FkRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgIGlmICghc2F2ZWRTdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVzdG9yZSBzZWFyY2ggdGV4dCB0byBpbnB1dCBmaWVsZFxuICAgICAgICBpZiAoc2F2ZWRTdGF0ZS5zZWFyY2hUZXh0KSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbChzYXZlZFN0YXRlLnNlYXJjaFRleHQpO1xuICAgICAgICAgICAgLy8gQXBwbHkgc2VhcmNoIHRvIERhdGFUYWJsZVxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaChzYXZlZFN0YXRlLnNlYXJjaFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVzdG9yZSBwYWdlIG51bWJlciB3aXRoIGRlbGF5XG4gICAgICAgIC8vIFdIWTogRGF0YVRhYmxlIGlnbm9yZXMgcGFnZSgpIGR1cmluZyBpbml0Q29tcGxldGUsIG5lZWQgc2V0VGltZW91dCB0byBhbGxvdyBpbml0aWFsaXphdGlvbiB0byBmdWxseSBjb21wbGV0ZVxuICAgICAgICBpZiAoc2F2ZWRTdGF0ZS5jdXJyZW50UGFnZSkge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2Uoc2F2ZWRTdGF0ZS5jdXJyZW50UGFnZSkuZHJhdyhmYWxzZSk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCkge1xuICAgICAgICAgICAgLy8gSWYgb25seSBzZWFyY2ggdGV4dCBleGlzdHMsIHN0aWxsIG5lZWQgdG8gZHJhd1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLmRyYXcoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgQ0RSIHJlY29yZCB2aWEgUkVTVCBBUElcbiAgICAgKiBXSFk6IERlbGV0ZXMgYnkgbGlua2VkaWQgLSBhdXRvbWF0aWNhbGx5IHJlbW92ZXMgZW50aXJlIGNvbnZlcnNhdGlvbiB3aXRoIGFsbCBsaW5rZWQgcmVjb3Jkc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIENEUiBsaW5rZWRpZCAobGlrZSBcIm1pa29wYngtMTc2MDc4NDc5My40NjI3XCIpXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRidXR0b24gLSBCdXR0b24gZWxlbWVudCB0byB1cGRhdGUgc3RhdGVcbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQocmVjb3JkSWQsICRidXR0b24pIHtcbiAgICAgICAgLy8gQWx3YXlzIGRlbGV0ZSB3aXRoIHJlY29yZGluZyBmaWxlc1xuICAgICAgICAvLyBXSFk6IGxpbmtlZGlkIGF1dG9tYXRpY2FsbHkgZGVsZXRlcyBhbGwgbGlua2VkIHJlY29yZHMgKG5vIGRlbGV0ZUxpbmtlZCBwYXJhbWV0ZXIgbmVlZGVkKVxuICAgICAgICBDZHJBUEkuZGVsZXRlUmVjb3JkKHJlY29yZElkLCB7IGRlbGV0ZVJlY29yZGluZzogdHJ1ZSB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIFNpbGVudGx5IHJlbG9hZCB0aGUgRGF0YVRhYmxlIHRvIHJlZmxlY3QgY2hhbmdlc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogVmlzdWFsIGZlZWRiYWNrIChkaXNhcHBlYXJpbmcgcm93KSBpcyBlbm91Z2gsIG5vIG5lZWQgZm9yIHN1Y2Nlc3MgdG9hc3RcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuYWpheC5yZWxvYWQobnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2Ugb25seSBvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSByZXNwb25zZT8ubWVzc2FnZXM/LmVycm9yPy5bMF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNkcl9EZWxldGVGYWlsZWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBkZWxldGUgcmVjb3JkJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNc2cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgcGFnaW5hdGlvbiBjb250cm9scyB2aXNpYmlsaXR5IGJhc2VkIG9uIGRhdGEgc2l6ZVxuICAgICAqL1xuICAgIHRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpIHtcbiAgICAgICAgY29uc3QgaW5mbyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmluZm8oKTtcbiAgICAgICAgaWYgKGluZm8ucGFnZXMgPD0gMSkge1xuICAgICAgICAgICAgJChjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUudGFibGUoKS5jb250YWluZXIoKSkuZmluZCgnLmRhdGFUYWJsZXNfcGFnaW5hdGUnKS5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS50YWJsZSgpLmNvbnRhaW5lcigpKS5maW5kKCcuZGF0YVRhYmxlc19wYWdpbmF0ZScpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIENEUiBtZXRhZGF0YSAoZGF0ZSByYW5nZSkgdXNpbmcgQ2RyQVBJXG4gICAgICogV0hZOiBMaWdodHdlaWdodCByZXF1ZXN0IHJldHVybnMgb25seSBtZXRhZGF0YSAoZGF0ZXMpLCBub3QgZnVsbCBDRFIgcmVjb3Jkc1xuICAgICAqIEF2b2lkcyBkb3VibGUgcmVxdWVzdCBvbiBwYWdlIGxvYWRcbiAgICAgKi9cbiAgICBmZXRjaExhdGVzdENEUkRhdGUoKSB7XG4gICAgICAgIC8vIENoZWNrIGZvciBzYXZlZCBzdGF0ZSBmaXJzdFxuICAgICAgICBjb25zdCBzYXZlZFN0YXRlID0gY2FsbERldGFpbFJlY29yZHMubG9hZEZpbHRlcnNTdGF0ZSgpO1xuXG4gICAgICAgIENkckFQSS5nZXRNZXRhZGF0YSh7IGxpbWl0OiAxMDAgfSwgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEuX21ldGEpIHtcbiAgICAgICAgICAgICAgICBQYnhEYXRlVGltZS5zZXRTZXJ2ZXJNZXRhKGRhdGEuX21ldGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5oYXNSZWNvcmRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9kYXkgPSBQYnhEYXRlVGltZS5zZXJ2ZXJOb3dNb21lbnQoKTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRlUHJlc2V0cyA9IGNhbGxEZXRhaWxSZWNvcmRzLmJ1aWxkRGF0ZVByZXNldHModG9kYXkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IFtzdGFydERhdGUsIGVuZERhdGVdID0gY2FsbERldGFpbFJlY29yZHMuZ2V0SW5pdGlhbFBlcmlvZChzYXZlZFN0YXRlLCBkYXRhLCB0b2RheSk7XG5cbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3Ioc3RhcnREYXRlLCBlbmREYXRlLCB0b2RheSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIERhdGFUYWJsZSBvbmx5IGlmIHdlIGhhdmUgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogRGF0YVRhYmxlIG5lZWRzIGRhdGUgcmFuZ2UgdG8gYmUgc2V0IGZpcnN0XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuaW5pdGlhbGl6ZURhdGFUYWJsZUFuZEhhbmRsZXJzKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vIHJlY29yZHMgaW4gZGF0YWJhc2UgYXQgYWxsIG9yIEFQSSBlcnJvclxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5zaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyKCk7XG4gICAgICAgICAgICAgICAgLy8gRG9uJ3QgaW5pdGlhbGl6ZSBEYXRhVGFibGUgYXQgYWxsIC0ganVzdCBzaG93IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGEgc3R5bGVkIGVtcHR5IHRhYmxlIG1lc3NhZ2VcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIG1lc3NhZ2UgZm9yIGVtcHR5IHRhYmxlXG4gICAgICovXG4gICAgZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKSB7XG4gICAgICAgIC8vIElmIGRhdGFiYXNlIGlzIGVtcHR5LCB3ZSBkb24ndCBzaG93IHRoaXMgbWVzc2FnZSBpbiB0YWJsZVxuICAgICAgICBpZiAoIWNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBmaWx0ZXJlZCBlbXB0eSBzdGF0ZSBtZXNzYWdlXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBwbGFjZWhvbGRlciBzZWdtZW50XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaWNvbiBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInNlYXJjaCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmNkcl9GaWx0ZXJlZEVtcHR5VGl0bGV9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpbmxpbmVcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dFwiPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5jZHJfRmlsdGVyZWRFbXB0eURlc2NyaXB0aW9ufVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PmA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93cyB0aGUgZW1wdHkgZGF0YWJhc2UgcGxhY2Vob2xkZXIgYW5kIGhpZGVzIHRoZSB0YWJsZVxuICAgICAqL1xuICAgIHNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIoKSB7XG4gICAgICAgIC8vIEhpZGUgdGhlIHRhYmxlIGl0c2VsZiAoRGF0YVRhYmxlIHdvbid0IGJlIGluaXRpYWxpemVkKVxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuaGlkZSgpO1xuXG4gICAgICAgIC8vIEhpZGUgc2VhcmNoIGFuZCBkYXRlIGNvbnRyb2xzXG4gICAgICAgICQoJyNkYXRlLXJhbmdlLXNlbGVjdG9yJykuY2xvc2VzdCgnLnVpLnJvdycpLmhpZGUoKTtcblxuICAgICAgICAvLyBTaG93IHBsYWNlaG9sZGVyXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIuc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm0gUkVTVCBBUEkgZ3JvdXBlZCByZWNvcmRzIHRvIERhdGFUYWJsZSByb3cgZm9ybWF0XG4gICAgICogQHBhcmFtIHtBcnJheX0gcmVzdERhdGEgLSBBcnJheSBvZiBncm91cGVkIENEUiByZWNvcmRzIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIERhdGFUYWJsZSByb3dzXG4gICAgICovXG4gICAgdHJhbnNmb3JtUmVzdFRvRGF0YVRhYmxlKHJlc3REYXRhKSB7XG4gICAgICAgIHJldHVybiByZXN0RGF0YS5tYXAoZ3JvdXAgPT4ge1xuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWluZyBkaXNwbGF5XG4gICAgICAgICAgICBjb25zdCBiaWxsc2VjID0gZ3JvdXAudG90YWxCaWxsc2VjIHx8IDA7XG4gICAgICAgICAgICBjb25zdCB0aW1lRm9ybWF0ID0gKGJpbGxzZWMgPCAzNjAwKSA/ICdtbTpzcycgOiAnSEg6bW06c3MnO1xuICAgICAgICAgICAgY29uc3QgdGltaW5nID0gYmlsbHNlYyA+IDAgPyBtb21lbnQudXRjKGJpbGxzZWMgKiAxMDAwKS5mb3JtYXQodGltZUZvcm1hdCkgOiAnJztcblxuICAgICAgICAgICAgLy8gRm9ybWF0IHN0YXJ0IGRhdGVcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZERhdGUgPSBtb21lbnQoZ3JvdXAuc3RhcnQpLmZvcm1hdCgnREQtTU0tWVlZWSBISDptbTpzcycpO1xuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IHJlY29yZGluZyByZWNvcmRzIC0gZmlsdGVyIG9ubHkgcmVjb3JkcyB3aXRoIGFjdHVhbCByZWNvcmRpbmcgZmlsZXNcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZGluZ3MgPSAoZ3JvdXAucmVjb3JkcyB8fCBbXSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKHIgPT4gci5yZWNvcmRpbmdmaWxlICYmIHIucmVjb3JkaW5nZmlsZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgIC5tYXAociA9PiAoe1xuICAgICAgICAgICAgICAgICAgICBpZDogci5pZCxcbiAgICAgICAgICAgICAgICAgICAgc3JjX251bTogci5zcmNfbnVtLFxuICAgICAgICAgICAgICAgICAgICBzcmNfbmFtZTogci5zcmNfbmFtZSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgZHN0X251bTogci5kc3RfbnVtLFxuICAgICAgICAgICAgICAgICAgICBkc3RfbmFtZTogci5kc3RfbmFtZSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkaW5nZmlsZTogci5yZWNvcmRpbmdmaWxlLFxuICAgICAgICAgICAgICAgICAgICBwbGF5YmFja191cmw6IHIucGxheWJhY2tfdXJsLCAgIC8vIFRva2VuLWJhc2VkIFVSTCBmb3IgcGxheWJhY2tcbiAgICAgICAgICAgICAgICAgICAgZG93bmxvYWRfdXJsOiByLmRvd25sb2FkX3VybCAgICAvLyBUb2tlbi1iYXNlZCBVUkwgZm9yIGRvd25sb2FkXG4gICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgQ1NTIGNsYXNzXG4gICAgICAgICAgICBjb25zdCBoYXNSZWNvcmRpbmdzID0gcmVjb3JkaW5ncy5sZW5ndGggPiAwO1xuICAgICAgICAgICAgY29uc3QgaXNBbnN3ZXJlZCA9IGdyb3VwLmRpc3Bvc2l0aW9uID09PSAnQU5TV0VSRUQnO1xuICAgICAgICAgICAgY29uc3QgZHRSb3dDbGFzcyA9IGhhc1JlY29yZGluZ3MgPyAnZGV0YWlsZWQnIDogJ3VpJztcbiAgICAgICAgICAgIGNvbnN0IG5lZ2F0aXZlQ2xhc3MgPSBpc0Fuc3dlcmVkID8gJycgOiAnIG5lZ2F0aXZlJztcblxuICAgICAgICAgICAgLy8gQ29sbGVjdCB1bmlxdWUgdmVyYm9zZSBjYWxsIElEc1xuICAgICAgICAgICAgY29uc3QgaWRzID0gWy4uLm5ldyBTZXQoXG4gICAgICAgICAgICAgICAgKGdyb3VwLnJlY29yZHMgfHwgW10pXG4gICAgICAgICAgICAgICAgICAgIC5tYXAociA9PiByLnZlcmJvc2VfY2FsbF9pZClcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpZCA9PiBpZCAmJiBpZC5sZW5ndGggPiAwKVxuICAgICAgICAgICAgKV0uam9pbignJicpO1xuXG4gICAgICAgICAgICAvLyBSZXR1cm4gRGF0YVRhYmxlIHJvdyBmb3JtYXRcbiAgICAgICAgICAgIC8vIERhdGFUYWJsZXMgbmVlZHMgYm90aCBhcnJheSBpbmRpY2VzIEFORCBzcGVjaWFsIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IFtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWREYXRlLCAgICAgICAgICAgICAgLy8gMDogZGF0ZVxuICAgICAgICAgICAgICAgIGdyb3VwLnNyY19udW0sICAgICAgICAgICAgICAvLyAxOiBzb3VyY2UgbnVtYmVyXG4gICAgICAgICAgICAgICAgZ3JvdXAuZHN0X251bSB8fCBncm91cC5kaWQsIC8vIDI6IGRlc3RpbmF0aW9uIG51bWJlciBvciBESURcbiAgICAgICAgICAgICAgICB0aW1pbmcsICAgICAgICAgICAgICAgICAgICAgLy8gMzogZHVyYXRpb25cbiAgICAgICAgICAgICAgICByZWNvcmRpbmdzLCAgICAgICAgICAgICAgICAgLy8gNDogcmVjb3JkaW5nIHJlY29yZHMgYXJyYXlcbiAgICAgICAgICAgICAgICBncm91cC5kaXNwb3NpdGlvbiwgICAgICAgICAgLy8gNTogZGlzcG9zaXRpb25cbiAgICAgICAgICAgICAgICBncm91cC5zcmNfbmFtZSB8fCAnJywgICAgICAgLy8gNjogc291cmNlIGNhbGxlciBuYW1lIGZyb20gQ0RSXG4gICAgICAgICAgICAgICAgZ3JvdXAuZHN0X25hbWUgfHwgJycgICAgICAgIC8vIDc6IGRlc3RpbmF0aW9uIGNhbGxlciBuYW1lIGZyb20gQ0RSXG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAvLyBBZGQgRGF0YVRhYmxlcyBzcGVjaWFsIHByb3BlcnRpZXNcbiAgICAgICAgICAgIHJvdy5EVF9Sb3dJZCA9IGdyb3VwLmxpbmtlZGlkO1xuICAgICAgICAgICAgcm93LkRUX1Jvd0NsYXNzID0gZHRSb3dDbGFzcyArIG5lZ2F0aXZlQ2xhc3M7XG4gICAgICAgICAgICByb3cuaWRzID0gaWRzOyAvLyBTdG9yZSByYXcgSURzIHdpdGhvdXQgZW5jb2RpbmcgLSBlbmNvZGluZyB3aWxsIGJlIGFwcGxpZWQgd2hlbiBidWlsZGluZyBVUkxcblxuICAgICAgICAgICAgcmV0dXJuIHJvdztcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgc2V0IG9mIGNhbGwgcmVjb3JkcyB3aGVuIGEgcm93IGlzIGNsaWNrZWQuXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2FsbCByZWNvcmRzLlxuICAgICAqL1xuICAgIHNob3dSZWNvcmRzKGRhdGEpIHtcbiAgICAgICAgbGV0IGh0bWxQbGF5ZXIgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBiYXNpYyB0YWJsZSBjZHItcGxheWVyXCI+PHRib2R5Pic7XG4gICAgICAgIGRhdGFbNF0uZm9yRWFjaCgocmVjb3JkLCBpKSA9PiB7XG4gICAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIHx8IHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSBudWxsXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3cgZGlzYWJsZWRcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiXCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiXCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIiBkYXRhLWNkci1uYW1lPVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocmVjb3JkLnNyY19uYW1lIHx8ICcnKX1cIj4ke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChyZWNvcmQuc3JjX251bSl9PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGUgY2VudGVyIGFsaWduZWRcIj48aSBjbGFzcz1cImljb24gZXhjaGFuZ2VcIj48L2k+PC90ZD5cbiAgIFx0PHRkIGNsYXNzPVwibGVmdCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiIGRhdGEtY2RyLW5hbWU9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChyZWNvcmQuZHN0X25hbWUgfHwgJycpfVwiPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJlY29yZC5kc3RfbnVtKX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRva2VuLWJhc2VkIFVSTHMgaW5zdGVhZCBvZiBkaXJlY3QgZmlsZSBwYXRoc1xuICAgICAgICAgICAgICAgIC8vIFdIWTogU2VjdXJpdHkgLSBoaWRlcyBhY3R1YWwgZmlsZSBwYXRocyBmcm9tIHVzZXJcbiAgICAgICAgICAgICAgICAvLyBUd28gc2VwYXJhdGUgZW5kcG9pbnRzOiA6cGxheWJhY2sgKGlubGluZSkgYW5kIDpkb3dubG9hZCAoZmlsZSlcbiAgICAgICAgICAgICAgICBjb25zdCBwbGF5YmFja1VybCA9IHJlY29yZC5wbGF5YmFja191cmwgfHwgJyc7XG4gICAgICAgICAgICAgICAgY29uc3QgZG93bmxvYWRVcmwgPSByZWNvcmQuZG93bmxvYWRfdXJsIHx8ICcnO1xuXG4gICAgICAgICAgICAgICAgaHRtbFBsYXllciArPSBgXG5cbjx0ciBjbGFzcz1cImRldGFpbC1yZWNvcmQtcm93XCIgaWQ9XCIke3JlY29yZC5pZH1cIj5cbiAgIFx0PHRkIGNsYXNzPVwib25lIHdpZGVcIj48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZSByaWdodCBhbGlnbmVkXCI+XG4gICBcdFx0PGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG5cdCAgIFx0PGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7cmVjb3JkLmlkfVwiIHNyYz1cIiR7cGxheWJhY2tVcmx9XCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8ZGl2IGNsYXNzPVwidWkgY29tcGFjdCBpY29uIHRvcCBsZWZ0IHBvaW50aW5nIGRyb3Bkb3duIGRvd25sb2FkLWZvcm1hdC1kcm9wZG93blwiIGRhdGEtZG93bmxvYWQtdXJsPVwiJHtkb3dubG9hZFVybH1cIj5cbiAgICBcdFx0PGkgY2xhc3M9XCJkb3dubG9hZCBpY29uXCI+PC9pPlxuICAgIFx0XHQ8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgIFx0XHRcdDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1mb3JtYXQ9XCJ3ZWJtXCI+V2ViTSAoT3B1cyk8L2Rpdj5cbiAgICBcdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtZm9ybWF0PVwibXAzXCI+TVAzPC9kaXY+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIndhdlwiPldBVjwvZGl2PlxuICAgIFx0XHRcdDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1mb3JtYXQ9XCJvZ2dcIj5PR0cgKE9wdXMpPC9kaXY+XG4gICAgXHRcdDwvZGl2PlxuICAgIFx0PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkXCI+PHNwYW4gY2xhc3M9XCJuZWVkLXVwZGF0ZVwiIGRhdGEtY2RyLW5hbWU9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChyZWNvcmQuc3JjX25hbWUgfHwgJycpfVwiPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJlY29yZC5zcmNfbnVtKX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCIgZGF0YS1jZHItbmFtZT1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJlY29yZC5kc3RfbmFtZSB8fCAnJyl9XCI+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocmVjb3JkLmRzdF9udW0pfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaHRtbFBsYXllciArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgICAgIHJldHVybiBodG1sUGxheWVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBwYWdlIGxlbmd0aCBmb3IgRGF0YVRhYmxlLCBjb25zaWRlcmluZyB1c2VyJ3Mgc2F2ZWQgcHJlZmVyZW5jZVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0UGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3Mgc2F2ZWQgdmFsdWUgb3IgdXNlIHRoZSBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgdmFsdWUgaWYgbm9uZSBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICByZXR1cm4gc2F2ZWRQYWdlTGVuZ3RoID8gcGFyc2VJbnQoc2F2ZWRQYWdlTGVuZ3RoLCAxMCkgOiBjYWxsRGV0YWlsUmVjb3Jkcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiByb3dzIHRoYXQgY2FuIGZpdCBvbiBhIHBhZ2UgYmFzZWQgb24gdGhlIGN1cnJlbnQgd2luZG93IGhlaWdodC5cbiAgICAgKiBEeW5hbWljYWxseSBtZWFzdXJlcyB0aGUgYWN0dWFsIG92ZXJoZWFkIGZyb20gRE9NIGVsZW1lbnRzIGluc3RlYWQgb2YgdXNpbmcgYSBoYXJkY29kZWQgZXN0aW1hdGUuXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBNZWFzdXJlIGFjdHVhbCByb3cgaGVpZ2h0IGZyb20gcmVuZGVyZWQgcm93LCBmYWxsYmFjayB0byBjb21wYWN0IHRhYmxlIGRlZmF1bHQgKH4zNnB4KVxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmZpbmQoJ3Rib2R5ID4gdHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCkgfHwgMzY7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG92ZXJoZWFkIGR5bmFtaWNhbGx5IGZyb20gdGhlIHRhYmxlJ3MgcG9zaXRpb24gaW4gdGhlIHBhZ2VcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBsZXQgb3ZlcmhlYWQgPSA0MDA7IC8vIHNhZmUgZmFsbGJhY2tcbiAgICAgICAgY29uc3QgdGFibGVFbCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5nZXQoMCk7XG4gICAgICAgIGlmICh0YWJsZUVsKSB7XG4gICAgICAgICAgICBjb25zdCB0aGVhZCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5maW5kKCd0aGVhZCcpO1xuICAgICAgICAgICAgY29uc3QgdGhlYWRIZWlnaHQgPSB0aGVhZC5sZW5ndGggPyB0aGVhZC5vdXRlckhlaWdodCgpIDogMzg7XG4gICAgICAgICAgICBjb25zdCB0YWJsZVRvcCA9IHRhYmxlRWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xuXG4gICAgICAgICAgICAvLyBTcGFjZSBiZWxvdzogcGFnaW5hdGlvbig1MCkgKyBpbmZvIGJhcigzMCkgKyBzZWdtZW50IHBhZGRpbmcoMTQpICsgdmVyc2lvbiBmb290ZXIoMzUpICsgbWFyZ2lucygxMClcbiAgICAgICAgICAgIGNvbnN0IGJvdHRvbVJlc2VydmUgPSAxMzk7XG5cbiAgICAgICAgICAgIG92ZXJoZWFkID0gdGFibGVUb3AgKyB0aGVhZEhlaWdodCArIGJvdHRvbVJlc2VydmU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gb3ZlcmhlYWQpIC8gcm93SGVpZ2h0KSwgNSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBCdWlsZHMgdGhlIHByZXNldCBwZXJpb2RzIG9mIHRoZSBkYXRlIHBpY2tlci5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IHRvZGF5IC0gQ3VycmVudCBQQlggdGltZSAod2FsbCBjbG9jaylcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0PHN0cmluZywge2xhYmVsOiBzdHJpbmcsIHJhbmdlOiBtb21lbnQuTW9tZW50W119Pn1cbiAgICAgKi9cbiAgICBidWlsZERhdGVQcmVzZXRzKHRvZGF5KSB7XG4gICAgICAgIGNvbnN0IGRheSA9ICgpID0+IHRvZGF5LmNsb25lKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b2RheTogeyBsYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9Ub2RheSwgcmFuZ2U6IFtkYXkoKSwgZGF5KCldIH0sXG4gICAgICAgICAgICB5ZXN0ZXJkYXk6IHtcbiAgICAgICAgICAgICAgICBsYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9ZZXN0ZXJkYXksXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtkYXkoKS5zdWJ0cmFjdCgxLCAnZGF5cycpLCBkYXkoKS5zdWJ0cmFjdCgxLCAnZGF5cycpXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsYXN0V2VlazogeyBsYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0V2VlaywgcmFuZ2U6IFtkYXkoKS5zdWJ0cmFjdCg2LCAnZGF5cycpLCBkYXkoKV0gfSxcbiAgICAgICAgICAgIGxhc3QzMERheXM6IHsgbGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdDMwRGF5cywgcmFuZ2U6IFtkYXkoKS5zdWJ0cmFjdCgyOSwgJ2RheXMnKSwgZGF5KCldIH0sXG4gICAgICAgICAgICB0aGlzTW9udGg6IHsgbGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfVGhpc01vbnRoLCByYW5nZTogW2RheSgpLnN0YXJ0T2YoJ21vbnRoJyksIGRheSgpLmVuZE9mKCdtb250aCcpXSB9LFxuICAgICAgICAgICAgbGFzdE1vbnRoOiB7XG4gICAgICAgICAgICAgICAgbGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfTGFzdE1vbnRoLFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbZGF5KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuc3RhcnRPZignbW9udGgnKSwgZGF5KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hvb3NlcyB0aGUgcGVyaW9kIHNob3duIG9uIGxvYWQ6IHRoZSBzYXZlZCBwcmVzZXQgcmVjYWxjdWxhdGVkIGZvciB0b2RheSwgdGhlIHNhdmVkIGRhdGVzLFxuICAgICAqIG9yIHRoZSBkYXRlcyBvZiB0aGUgbGFzdCByZWNvcmRzIChhbHNvIHdoZW4gdGhleSB3ZXJlIHRoZSBzYXZlZCBzb3VyY2UsIHNvIHRoYXQgbmV3IGNhbGxzXG4gICAgICogc2hvdyB1cCkuIEJvdGggZW5kcyBhcmUgbGltaXRlZCB0byB0aGUgUEJYIHRvZGF5XG4gICAgICogV0hZOiB0aGUgcGlja2VyIGxpbWl0cyBvbmx5IHRoZSBlbmQsIGFuZCBhIHN0YXJ0IGluIHRoZSBmdXR1cmUgZ2l2ZXMgYW4gZW1wdHkgbGlzdFxuICAgICAqIHRoYXQgdGhlIHNhdmVkIHN0YXRlIHdvdWxkIGtlZXAgYWZ0ZXIgZXZlcnkgcmVsb2FkXG4gICAgICogQHBhcmFtIHtPYmplY3R8bnVsbH0gc2F2ZWRTdGF0ZSAtIEZpbHRlciBzdGF0ZSBmcm9tIHNlc3Npb25TdG9yYWdlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG1ldGFkYXRhIC0gZ2V0TWV0YWRhdGEgcmVzcG9uc2UgZGF0YVxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gdG9kYXkgLSBDdXJyZW50IFBCWCB0aW1lICh3YWxsIGNsb2NrKVxuICAgICAqIEByZXR1cm5zIHttb21lbnQuTW9tZW50W119IFN0YXJ0IGFuZCBlbmQgZGF0ZXNcbiAgICAgKi9cbiAgICBnZXRJbml0aWFsUGVyaW9kKHNhdmVkU3RhdGUsIG1ldGFkYXRhLCB0b2RheSkge1xuICAgICAgICBjb25zdCBsYXN0RGF5ID0gdG9kYXkuY2xvbmUoKS5lbmRPZignZGF5Jyk7XG4gICAgICAgIGNvbnN0IGxpbWl0ID0gKHJhbmdlKSA9PiByYW5nZS5tYXAoKGRhdGUpID0+IG1vbWVudC5taW4oZGF0ZS5jbG9uZSgpLCBsYXN0RGF5KSk7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBbXTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYWN0aXZlUHJlc2V0S2V5ID0gbnVsbDtcblxuICAgICAgICBjb25zdCBwcmVzZXQgPSBzYXZlZFN0YXRlICYmIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGVQcmVzZXRzW3NhdmVkU3RhdGUucHJlc2V0S2V5XTtcbiAgICAgICAgaWYgKHByZXNldCkge1xuICAgICAgICAgICAgY2FuZGlkYXRlcy5wdXNoKHsgcmFuZ2U6IHByZXNldC5yYW5nZSwgcHJlc2V0S2V5OiBzYXZlZFN0YXRlLnByZXNldEtleSB9KTtcbiAgICAgICAgfSBlbHNlIGlmIChzYXZlZFN0YXRlICYmIHNhdmVkU3RhdGUucHJlc2V0S2V5ICE9PSBjYWxsRGV0YWlsUmVjb3Jkcy5SRUNFTlRfUEVSSU9EX0tFWVxuICAgICAgICAgICAgJiYgc2F2ZWRTdGF0ZS5kYXRlRnJvbSAmJiBzYXZlZFN0YXRlLmRhdGVUbykge1xuICAgICAgICAgICAgY2FuZGlkYXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICByYW5nZTogW21vbWVudChzYXZlZFN0YXRlLmRhdGVGcm9tLCAnWVlZWS1NTS1ERCcsIHRydWUpLCBtb21lbnQoc2F2ZWRTdGF0ZS5kYXRlVG8sICdZWVlZLU1NLUREJywgdHJ1ZSldLFxuICAgICAgICAgICAgICAgIHByZXNldEtleTogbnVsbCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNhbmRpZGF0ZXMucHVzaCh7XG4gICAgICAgICAgICByYW5nZTogW21vbWVudChtZXRhZGF0YS5lYXJsaWVzdERhdGUpLCBtb21lbnQobWV0YWRhdGEubGF0ZXN0RGF0ZSldLFxuICAgICAgICAgICAgcHJlc2V0S2V5OiBjYWxsRGV0YWlsUmVjb3Jkcy5SRUNFTlRfUEVSSU9EX0tFWSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY2FuZGlkYXRlcykge1xuICAgICAgICAgICAgY29uc3QgW3N0YXJ0LCBlbmRdID0gY2FuZGlkYXRlLnJhbmdlO1xuICAgICAgICAgICAgaWYgKHN0YXJ0LmlzVmFsaWQoKSAmJiBlbmQuaXNWYWxpZCgpICYmICFzdGFydC5pc0FmdGVyKGVuZCwgJ2RheScpKSB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYWN0aXZlUHJlc2V0S2V5ID0gY2FuZGlkYXRlLnByZXNldEtleTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGltaXQoY2FuZGlkYXRlLnJhbmdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3RvZGF5LmNsb25lKCksIHRvZGF5LmNsb25lKCldO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3Rvci5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IHN0YXJ0RGF0ZSAtIEZpcnN0IGRheSBvZiB0aGUgc2hvd24gcGVyaW9kXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBlbmREYXRlIC0gTGFzdCBkYXkgb2YgdGhlIHNob3duIHBlcmlvZFxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gdG9kYXkgLSBDdXJyZW50IFBCWCB0aW1lICh3YWxsIGNsb2NrKTogcHJlc2V0cyBhbmQgdGhlIGxhdGVzdCBzZWxlY3RhYmxlIGRheVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcihzdGFydERhdGUsIGVuZERhdGUsIHRvZGF5KSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7fTtcblxuICAgICAgICBvcHRpb25zLnJhbmdlcyA9IHt9O1xuICAgICAgICBPYmplY3QudmFsdWVzKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGVQcmVzZXRzKS5mb3JFYWNoKChwcmVzZXQpID0+IHtcbiAgICAgICAgICAgIG9wdGlvbnMucmFuZ2VzW3ByZXNldC5sYWJlbF0gPSBwcmVzZXQucmFuZ2UubWFwKChkYXRlKSA9PiBkYXRlLmNsb25lKCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgb3B0aW9ucy5hbHdheXNTaG93Q2FsZW5kYXJzID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5hdXRvVXBkYXRlSW5wdXQgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmxpbmtlZENhbGVuZGFycyA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMubWF4RGF0ZSA9IHRvZGF5LmNsb25lKCkuZW5kT2YoJ2RheScpO1xuICAgICAgICBvcHRpb25zLmxvY2FsZSA9IHtcbiAgICAgICAgICAgIGZvcm1hdDogJ0REL01NL1lZWVknLFxuICAgICAgICAgICAgc2VwYXJhdG9yOiAnIC0gJyxcbiAgICAgICAgICAgIGFwcGx5TGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQXBwbHlCdG4sXG4gICAgICAgICAgICBjYW5jZWxMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9DYW5jZWxCdG4sXG4gICAgICAgICAgICBmcm9tTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfZnJvbSxcbiAgICAgICAgICAgIHRvTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfdG8sXG4gICAgICAgICAgICBjdXN0b21SYW5nZUxhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0N1c3RvbVBlcmlvZCxcbiAgICAgICAgICAgIGRheXNPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dC5kYXlzLFxuICAgICAgICAgICAgbW9udGhOYW1lczogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0Lm1vbnRocyxcbiAgICAgICAgICAgIGZpcnN0RGF5OiAxLFxuICAgICAgICB9O1xuXG4gICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gc3RhcnREYXRlLmNsb25lKCkuc3RhcnRPZignZGF5Jyk7XG4gICAgICAgIG9wdGlvbnMuZW5kRGF0ZSA9IGVuZERhdGUuY2xvbmUoKS5lbmRPZignZGF5Jyk7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGVyYW5nZXBpY2tlcihcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QsXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gTm90ZTogRG9uJ3QgY2FsbCBhcHBseUZpbHRlciBoZXJlIC0gRGF0YVRhYmxlIGlzIG5vdCBpbml0aWFsaXplZCB5ZXRcbiAgICAgICAgLy8gRGF0YVRhYmxlIHdpbGwgbG9hZCBkYXRhIGF1dG9tYXRpY2FsbHkgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIHNlbGVjdCBldmVudC5cbiAgICAgKiBAcGFyYW0ge21vbWVudC5Nb21lbnR9IHN0YXJ0IC0gVGhlIHN0YXJ0IGRhdGUuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBlbmQgLSBUaGUgZW5kIGRhdGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGxhYmVsIC0gVGhlIGxhYmVsLlxuICAgICAqL1xuICAgIGNiRGF0ZVJhbmdlU2VsZWN0b3JPblNlbGVjdChzdGFydCwgZW5kLCBsYWJlbCkge1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hY3RpdmVQcmVzZXRLZXkgPSBPYmplY3Qua2V5cyhjYWxsRGV0YWlsUmVjb3Jkcy5kYXRlUHJlc2V0cylcbiAgICAgICAgICAgIC5maW5kKChrZXkpID0+IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGVQcmVzZXRzW2tleV0ubGFiZWwgPT09IGxhYmVsKSB8fCBudWxsO1xuICAgICAgICAvLyBPbmx5IHBhc3Mgc2VhcmNoIGtleXdvcmQsIGRhdGVzIGFyZSByZWFkIGRpcmVjdGx5IGZyb20gZGF0ZSByYW5nZSBzZWxlY3RvclxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcihjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpKTtcbiAgICAgICAgLy8gU3RhdGUgd2lsbCBiZSBzYXZlZCBhdXRvbWF0aWNhbGx5IGluIGRyYXcgZXZlbnQgYWZ0ZXIgZmlsdGVyIGlzIGFwcGxpZWRcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZmlsdGVyIHRvIHRoZSBkYXRhIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIGZpbHRlciB0ZXh0LlxuICAgICAqL1xuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBDRFIgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19