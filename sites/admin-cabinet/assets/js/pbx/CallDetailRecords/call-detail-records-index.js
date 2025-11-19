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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCIkc2VhcmNoQ0RSSW5wdXQiLCIkcGFnZUxlbmd0aFNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImhhc0NEUlJlY29yZHMiLCIkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiU1RPUkFHRV9LRVkiLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImdsb2JhbFJvb3RVcmwiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiY2xlYXJGaWx0ZXJzU3RhdGUiLCJsb2NhbFN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwicmVsb2FkIiwiZmV0Y2hMYXRlc3RDRFJEYXRlIiwic2F2ZUZpbHRlcnNTdGF0ZSIsInNlc3Npb25TdG9yYWdlIiwiY29uc29sZSIsIndhcm4iLCJzdGF0ZSIsImRhdGVGcm9tIiwiZGF0ZVRvIiwic2VhcmNoVGV4dCIsImN1cnJlbnRQYWdlIiwicGFnZUxlbmd0aCIsImdldFBhZ2VMZW5ndGgiLCJkYXRlUmFuZ2VQaWNrZXIiLCJkYXRhIiwic3RhcnREYXRlIiwiZW5kRGF0ZSIsImZvcm1hdCIsInZhbCIsInBhZ2UiLCJwYWdlSW5mbyIsImluZm8iLCJzZXRJdGVtIiwiSlNPTiIsInN0cmluZ2lmeSIsImVycm9yIiwibG9hZEZpbHRlcnNTdGF0ZSIsInJhd0RhdGEiLCJnZXRJdGVtIiwicGFyc2UiLCJpbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMiLCJzZWFyY2hEZWJvdW5jZVRpbWVyIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImtleUNvZGUiLCJsZW5ndGgiLCJ0ZXh0IiwiYXBwbHlGaWx0ZXIiLCJzZWFyY2giLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwiYWpheCIsInVybCIsInR5cGUiLCJkIiwicGFyYW1zIiwiaXNMaW5rZWRJZFNlYXJjaCIsImlzVmFsaWQiLCJlbmRPZiIsInNlYXJjaEtleXdvcmQiLCJ2YWx1ZSIsInRyaW0iLCJrZXl3b3JkIiwic3RhcnRzV2l0aCIsInNyY19udW0iLCJzdWJzdHJpbmciLCJkc3RfbnVtIiwiZGlkIiwibGlua2VkaWQiLCJsaW1pdCIsIm9mZnNldCIsInN0YXJ0Iiwic29ydCIsIm9yZGVyIiwiZ3JvdXBlZCIsImRhdGFTcmMiLCJqc29uIiwicmVzdWx0IiwicmVzdERhdGEiLCJyZWNvcmRzIiwicGFnaW5hdGlvbiIsInJlY29yZHNUb3RhbCIsInRvdGFsIiwicmVjb3Jkc0ZpbHRlcmVkIiwidHJhbnNmb3JtUmVzdFRvRGF0YVRhYmxlIiwiYmVmb3JlU2VuZCIsInhociIsIlRva2VuTWFuYWdlciIsImFjY2Vzc1Rva2VuIiwic2V0UmVxdWVzdEhlYWRlciIsInBhZ2luZyIsInNEb20iLCJkZWZlclJlbmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJlbXB0eVRhYmxlIiwiZ2V0RW1wdHlUYWJsZU1lc3NhZ2UiLCJ6ZXJvUmVjb3JkcyIsImNyZWF0ZWRSb3ciLCJyb3ciLCJEVF9Sb3dDbGFzcyIsImluZGV4T2YiLCJlcSIsImh0bWwiLCJhZGRDbGFzcyIsImFjdGlvbnNIdG1sIiwiaWRzIiwiRFRfUm93SWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZHJfRGVsZXRlUmVjb3JkIiwiZHJhd0NhbGxiYWNrIiwiRXh0ZW5zaW9uc0FQSSIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsInRvZ2dsZVBhZ2luYXRpb25Db250cm9scyIsImluaXRDb21wbGV0ZSIsInJlc3RvcmVGaWx0ZXJzRnJvbVN0YXRlIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJtaW5DaGFyYWN0ZXJzIiwic2VhcmNoT25Gb2N1cyIsInNlYXJjaEZpZWxkcyIsInNob3dOb1Jlc3VsdHMiLCJzb3VyY2UiLCJ0aXRsZSIsImNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciIsImNkcl9TZWFyY2hCeURlc3ROdW1iZXIiLCJjZHJfU2VhcmNoQnlESUQiLCJjZHJfU2VhcmNoQnlMaW5rZWRJRCIsImNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzcG9uc2UiLCJmb2N1cyIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibGVuIiwiZHJhdyIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwic2F2ZWRQYWdlTGVuZ3RoIiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmRlZmluZWQiLCJlbmNvZGVVUklDb21wb25lbnQiLCJvcGVuIiwidHIiLCJ0YXJnZXQiLCJjaGlsZCIsImlzU2hvd24iLCJoaWRlIiwic2hvd1JlY29yZHMiLCJzaG93IiwiZmluZCIsImVhY2giLCJpbmRleCIsInBsYXllclJvdyIsImlkIiwiQ0RSUGxheWVyIiwiJGJ1dHRvbiIsInJlY29yZElkIiwiZGVsZXRlUmVjb3JkIiwic2F2ZWRTdGF0ZSIsIkNkckFQSSIsImRlbGV0ZVJlY29yZGluZyIsImVycm9yTXNnIiwibWVzc2FnZXMiLCJjZHJfRGVsZXRlRmFpbGVkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJwYWdlcyIsInRhYmxlIiwiY29udGFpbmVyIiwiZ2V0TWV0YWRhdGEiLCJoYXNSZWNvcmRzIiwibW9tZW50IiwiZWFybGllc3REYXRlIiwibGF0ZXN0RGF0ZSIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsInNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIiLCJjZHJfRmlsdGVyZWRFbXB0eVRpdGxlIiwiY2RyX0ZpbHRlcmVkRW1wdHlEZXNjcmlwdGlvbiIsIm1hcCIsImdyb3VwIiwiYmlsbHNlYyIsInRvdGFsQmlsbHNlYyIsInRpbWVGb3JtYXQiLCJ0aW1pbmciLCJ1dGMiLCJmb3JtYXR0ZWREYXRlIiwicmVjb3JkaW5ncyIsImZpbHRlciIsInIiLCJyZWNvcmRpbmdmaWxlIiwicGxheWJhY2tfdXJsIiwiZG93bmxvYWRfdXJsIiwiaGFzUmVjb3JkaW5ncyIsImlzQW5zd2VyZWQiLCJkaXNwb3NpdGlvbiIsImR0Um93Q2xhc3MiLCJuZWdhdGl2ZUNsYXNzIiwidmVyYm9zZV9jYWxsX2lkIiwiam9pbiIsImh0bWxQbGF5ZXIiLCJmb3JFYWNoIiwicmVjb3JkIiwiaSIsInBsYXliYWNrVXJsIiwiZG93bmxvYWRVcmwiLCJwYXJzZUludCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsIm9wdGlvbnMiLCJyYW5nZXMiLCJjYWxfVG9kYXkiLCJjYWxfWWVzdGVyZGF5Iiwic3VidHJhY3QiLCJjYWxfTGFzdFdlZWsiLCJjYWxfTGFzdDMwRGF5cyIsImNhbF9UaGlzTW9udGgiLCJzdGFydE9mIiwiY2FsX0xhc3RNb250aCIsImFsd2F5c1Nob3dDYWxlbmRhcnMiLCJhdXRvVXBkYXRlSW5wdXQiLCJsaW5rZWRDYWxlbmRhcnMiLCJtYXhEYXRlIiwibG9jYWxlIiwic2VwYXJhdG9yIiwiYXBwbHlMYWJlbCIsImNhbF9BcHBseUJ0biIsImNhbmNlbExhYmVsIiwiY2FsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsImNhbF9mcm9tIiwidG9MYWJlbCIsImNhbF90byIsImN1c3RvbVJhbmdlTGFiZWwiLCJjYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJkYXRlcmFuZ2VwaWNrZXIiLCJjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QiLCJlbmQiLCJsYWJlbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFDdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFQyxDQUFDLENBQUMsWUFBRCxDQUxVOztBQU90QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxlQUFELENBWE07O0FBYXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGtCQUFrQixFQUFFRixDQUFDLENBQUMsc0JBQUQsQ0FqQkM7O0FBbUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxlQUFlLEVBQUVILENBQUMsQ0FBQyxtQkFBRCxDQXZCSTs7QUF5QnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLG1CQUFtQixFQUFFSixDQUFDLENBQUMscUJBQUQsQ0E3QkE7O0FBK0J0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxTQUFTLEVBQUUsRUFuQ1c7O0FBcUN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsRUF6Q2E7O0FBMkN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsSUEvQ087O0FBaUR0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSx5QkFBeUIsRUFBRVIsQ0FBQyxDQUFDLGlDQUFELENBckROOztBQXVEdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSVMsRUFBQUEsV0FBVyxFQUFFLG1CQTNEUzs7QUE2RHRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLEtBbEVPOztBQW9FdEI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBdkVzQix3QkF1RVQ7QUFDVDtBQUNBO0FBQ0FYLElBQUFBLENBQUMsbUJBQVlZLGFBQVosOENBQUQsQ0FBc0VDLEVBQXRFLENBQXlFLE9BQXpFLEVBQWtGLFVBQVNDLENBQVQsRUFBWTtBQUMxRkEsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGLEdBRDBGLENBRXpGOztBQUNBQyxNQUFBQSxPQUFPLENBQUNDLFlBQVIsQ0FBcUIsSUFBckIsRUFBMkIsSUFBM0IsRUFBaUNDLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsUUFBakQ7QUFFQXRCLE1BQUFBLGlCQUFpQixDQUFDdUIsaUJBQWxCLEdBTHlGLENBTXpGOztBQUNBQyxNQUFBQSxZQUFZLENBQUNDLFVBQWIsQ0FBd0Isb0JBQXhCLEVBUHlGLENBUXpGOztBQUNBTCxNQUFBQSxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JLLE1BQWhCO0FBQ0osS0FWRCxFQUhTLENBZVQ7QUFDQTs7QUFDQTFCLElBQUFBLGlCQUFpQixDQUFDMkIsa0JBQWxCO0FBQ0gsR0F6RnFCOztBQTJGdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBL0ZzQiw4QkErRkg7QUFDZixRQUFJO0FBQ0E7QUFDQSxVQUFJLE9BQU9DLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDdkNDLFFBQUFBLE9BQU8sQ0FBQ0MsSUFBUixDQUFhLG9DQUFiO0FBQ0E7QUFDSDs7QUFFRCxVQUFNQyxLQUFLLEdBQUc7QUFDVkMsUUFBQUEsUUFBUSxFQUFFLElBREE7QUFFVkMsUUFBQUEsTUFBTSxFQUFFLElBRkU7QUFHVkMsUUFBQUEsVUFBVSxFQUFFLEVBSEY7QUFJVkMsUUFBQUEsV0FBVyxFQUFFLENBSkg7QUFLVkMsUUFBQUEsVUFBVSxFQUFFckMsaUJBQWlCLENBQUNzQyxhQUFsQjtBQUxGLE9BQWQsQ0FQQSxDQWVBOztBQUNBLFVBQU1DLGVBQWUsR0FBR3ZDLGlCQUFpQixDQUFDSSxrQkFBbEIsQ0FBcUNvQyxJQUFyQyxDQUEwQyxpQkFBMUMsQ0FBeEI7O0FBQ0EsVUFBSUQsZUFBZSxJQUFJQSxlQUFlLENBQUNFLFNBQW5DLElBQWdERixlQUFlLENBQUNHLE9BQXBFLEVBQTZFO0FBQ3pFVixRQUFBQSxLQUFLLENBQUNDLFFBQU4sR0FBaUJNLGVBQWUsQ0FBQ0UsU0FBaEIsQ0FBMEJFLE1BQTFCLENBQWlDLFlBQWpDLENBQWpCO0FBQ0FYLFFBQUFBLEtBQUssQ0FBQ0UsTUFBTixHQUFlSyxlQUFlLENBQUNHLE9BQWhCLENBQXdCQyxNQUF4QixDQUErQixZQUEvQixDQUFmO0FBQ0gsT0FwQkQsQ0FzQkE7OztBQUNBWCxNQUFBQSxLQUFLLENBQUNHLFVBQU4sR0FBbUJuQyxpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0N5QyxHQUFoQyxNQUF5QyxFQUE1RCxDQXZCQSxDQXlCQTs7QUFDQSxVQUFJNUMsaUJBQWlCLENBQUNPLFNBQWxCLElBQStCUCxpQkFBaUIsQ0FBQ08sU0FBbEIsQ0FBNEJzQyxJQUEvRCxFQUFxRTtBQUNqRSxZQUFNQyxRQUFRLEdBQUc5QyxpQkFBaUIsQ0FBQ08sU0FBbEIsQ0FBNEJzQyxJQUE1QixDQUFpQ0UsSUFBakMsRUFBakI7QUFDQWYsUUFBQUEsS0FBSyxDQUFDSSxXQUFOLEdBQW9CVSxRQUFRLENBQUNELElBQTdCO0FBQ0g7O0FBRURoQixNQUFBQSxjQUFjLENBQUNtQixPQUFmLENBQXVCaEQsaUJBQWlCLENBQUNXLFdBQXpDLEVBQXNEc0MsSUFBSSxDQUFDQyxTQUFMLENBQWVsQixLQUFmLENBQXREO0FBQ0gsS0FoQ0QsQ0FnQ0UsT0FBT21CLEtBQVAsRUFBYztBQUNackIsTUFBQUEsT0FBTyxDQUFDcUIsS0FBUixDQUFjLGlEQUFkLEVBQWlFQSxLQUFqRTtBQUNIO0FBQ0osR0FuSXFCOztBQXFJdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBeklzQiw4QkF5SUg7QUFDZixRQUFJO0FBQ0E7QUFDQSxVQUFJLE9BQU92QixjQUFQLEtBQTBCLFdBQTlCLEVBQTJDO0FBQ3ZDQyxRQUFBQSxPQUFPLENBQUNDLElBQVIsQ0FBYSxnREFBYjtBQUNBLGVBQU8sSUFBUDtBQUNIOztBQUVELFVBQU1zQixPQUFPLEdBQUd4QixjQUFjLENBQUN5QixPQUFmLENBQXVCdEQsaUJBQWlCLENBQUNXLFdBQXpDLENBQWhCOztBQUNBLFVBQUksQ0FBQzBDLE9BQUwsRUFBYztBQUNWLGVBQU8sSUFBUDtBQUNIOztBQUVELFVBQU1yQixLQUFLLEdBQUdpQixJQUFJLENBQUNNLEtBQUwsQ0FBV0YsT0FBWCxDQUFkLENBWkEsQ0FjQTs7QUFDQSxVQUFJLENBQUNyQixLQUFELElBQVUsUUFBT0EsS0FBUCxNQUFpQixRQUEvQixFQUF5QztBQUNyQ2hDLFFBQUFBLGlCQUFpQixDQUFDdUIsaUJBQWxCO0FBQ0EsZUFBTyxJQUFQO0FBQ0g7O0FBRUQsYUFBT1MsS0FBUDtBQUNILEtBckJELENBcUJFLE9BQU9tQixLQUFQLEVBQWM7QUFDWnJCLE1BQUFBLE9BQU8sQ0FBQ3FCLEtBQVIsQ0FBYyxtREFBZCxFQUFtRUEsS0FBbkUsRUFEWSxDQUVaOztBQUNBbkQsTUFBQUEsaUJBQWlCLENBQUN1QixpQkFBbEI7QUFDQSxhQUFPLElBQVA7QUFDSDtBQUNKLEdBcktxQjs7QUF1S3RCO0FBQ0o7QUFDQTtBQUNJQSxFQUFBQSxpQkExS3NCLCtCQTBLRjtBQUNoQixRQUFJO0FBQ0EsVUFBSSxPQUFPTSxjQUFQLEtBQTBCLFdBQTlCLEVBQTJDO0FBQ3ZDQSxRQUFBQSxjQUFjLENBQUNKLFVBQWYsQ0FBMEJ6QixpQkFBaUIsQ0FBQ1csV0FBNUM7QUFDSDtBQUNKLEtBSkQsQ0FJRSxPQUFPd0MsS0FBUCxFQUFjO0FBQ1pyQixNQUFBQSxPQUFPLENBQUNxQixLQUFSLENBQWMsa0RBQWQsRUFBa0VBLEtBQWxFO0FBQ0g7QUFDSixHQWxMcUI7O0FBb0x0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSw4QkF4THNCLDRDQXdMVztBQUM3QjtBQUNBLFFBQUlDLG1CQUFtQixHQUFHLElBQTFCO0FBRUF6RCxJQUFBQSxpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0NZLEVBQWhDLENBQW1DLE9BQW5DLEVBQTRDLFVBQUNDLENBQUQsRUFBTztBQUMvQztBQUNBMEMsTUFBQUEsWUFBWSxDQUFDRCxtQkFBRCxDQUFaLENBRitDLENBSS9DOztBQUNBQSxNQUFBQSxtQkFBbUIsR0FBR0UsVUFBVSxDQUFDLFlBQU07QUFDbkMsWUFBSTNDLENBQUMsQ0FBQzRDLE9BQUYsS0FBYyxFQUFkLElBQ0c1QyxDQUFDLENBQUM0QyxPQUFGLEtBQWMsQ0FEakIsSUFFRzVELGlCQUFpQixDQUFDRyxhQUFsQixDQUFnQ3lDLEdBQWhDLEdBQXNDaUIsTUFBdEMsS0FBaUQsQ0FGeEQsRUFFMkQ7QUFDdkQ7QUFDQSxjQUFNQyxJQUFJLEdBQUc5RCxpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0N5QyxHQUFoQyxFQUFiO0FBQ0E1QyxVQUFBQSxpQkFBaUIsQ0FBQytELFdBQWxCLENBQThCRCxJQUE5QjtBQUNIO0FBQ0osT0FSK0IsRUFRN0IsR0FSNkIsQ0FBaEMsQ0FMK0MsQ0FhdEM7QUFDWixLQWREO0FBZ0JBOUQsSUFBQUEsaUJBQWlCLENBQUNDLFNBQWxCLENBQTRCTSxTQUE1QixDQUFzQztBQUNsQ3lELE1BQUFBLE1BQU0sRUFBRTtBQUNKQSxRQUFBQSxNQUFNLEVBQUVoRSxpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0N5QyxHQUFoQztBQURKLE9BRDBCO0FBSWxDcUIsTUFBQUEsVUFBVSxFQUFFLElBSnNCO0FBS2xDQyxNQUFBQSxVQUFVLEVBQUUsSUFMc0I7QUFNbENDLE1BQUFBLE9BQU8sRUFBRSxDQUNMO0FBQUUzQixRQUFBQSxJQUFJLEVBQUUsSUFBUjtBQUFjNEIsUUFBQUEsU0FBUyxFQUFFO0FBQXpCLE9BREssRUFDOEI7QUFDbkM7QUFBRTVCLFFBQUFBLElBQUksRUFBRTtBQUFSLE9BRkssRUFFOEI7QUFDbkM7QUFBRUEsUUFBQUEsSUFBSSxFQUFFO0FBQVIsT0FISyxFQUc4QjtBQUNuQztBQUFFQSxRQUFBQSxJQUFJLEVBQUU7QUFBUixPQUpLLEVBSThCO0FBQ25DO0FBQUVBLFFBQUFBLElBQUksRUFBRTtBQUFSLE9BTEssRUFLOEI7QUFDbkM7QUFBRUEsUUFBQUEsSUFBSSxFQUFFLElBQVI7QUFBYzRCLFFBQUFBLFNBQVMsRUFBRTtBQUF6QixPQU5LLENBTThCO0FBTjlCLE9BTnlCO0FBY2xDQyxNQUFBQSxVQUFVLEVBQUUsQ0FDUjtBQUFFQyxRQUFBQSxjQUFjLEVBQUUsR0FBbEI7QUFBd0JDLFFBQUFBLE9BQU8sRUFBRTtBQUFqQyxPQURRLENBZHNCO0FBaUJsQ0MsTUFBQUEsSUFBSSxFQUFFO0FBQ0ZDLFFBQUFBLEdBQUcsRUFBRSxxQkFESDtBQUVGQyxRQUFBQSxJQUFJLEVBQUUsS0FGSjtBQUVZO0FBQ2RsQyxRQUFBQSxJQUFJLEVBQUUsY0FBU21DLENBQVQsRUFBWTtBQUNkLGNBQU1DLE1BQU0sR0FBRyxFQUFmO0FBQ0EsY0FBSUMsZ0JBQWdCLEdBQUcsS0FBdkIsQ0FGYyxDQUlkOztBQUNBLGNBQU10QyxlQUFlLEdBQUd2QyxpQkFBaUIsQ0FBQ0ksa0JBQWxCLENBQXFDb0MsSUFBckMsQ0FBMEMsaUJBQTFDLENBQXhCOztBQUNBLGNBQUlELGVBQUosRUFBcUI7QUFDakIsZ0JBQU1FLFNBQVMsR0FBR0YsZUFBZSxDQUFDRSxTQUFsQztBQUNBLGdCQUFNQyxPQUFPLEdBQUdILGVBQWUsQ0FBQ0csT0FBaEM7O0FBRUEsZ0JBQUlELFNBQVMsSUFBSUEsU0FBUyxDQUFDcUMsT0FBVixFQUFiLElBQW9DcEMsT0FBcEMsSUFBK0NBLE9BQU8sQ0FBQ29DLE9BQVIsRUFBbkQsRUFBc0U7QUFDbEVGLGNBQUFBLE1BQU0sQ0FBQzNDLFFBQVAsR0FBa0JRLFNBQVMsQ0FBQ0UsTUFBVixDQUFpQixZQUFqQixDQUFsQjtBQUNBaUMsY0FBQUEsTUFBTSxDQUFDMUMsTUFBUCxHQUFnQlEsT0FBTyxDQUFDcUMsS0FBUixDQUFjLEtBQWQsRUFBcUJwQyxNQUFyQixDQUE0QixxQkFBNUIsQ0FBaEI7QUFDSDtBQUNKLFdBZGEsQ0FnQmQ7OztBQUNBLGNBQU1xQyxhQUFhLEdBQUdMLENBQUMsQ0FBQ1gsTUFBRixDQUFTaUIsS0FBVCxJQUFrQixFQUF4Qzs7QUFFQSxjQUFJRCxhQUFhLENBQUNFLElBQWQsRUFBSixFQUEwQjtBQUN0QixnQkFBTUMsT0FBTyxHQUFHSCxhQUFhLENBQUNFLElBQWQsRUFBaEIsQ0FEc0IsQ0FHdEI7O0FBQ0EsZ0JBQUlDLE9BQU8sQ0FBQ0MsVUFBUixDQUFtQixNQUFuQixDQUFKLEVBQWdDO0FBQzVCO0FBQ0FSLGNBQUFBLE1BQU0sQ0FBQ1MsT0FBUCxHQUFpQkYsT0FBTyxDQUFDRyxTQUFSLENBQWtCLENBQWxCLEVBQXFCSixJQUFyQixFQUFqQjtBQUNILGFBSEQsTUFHTyxJQUFJQyxPQUFPLENBQUNDLFVBQVIsQ0FBbUIsTUFBbkIsQ0FBSixFQUFnQztBQUNuQztBQUNBUixjQUFBQSxNQUFNLENBQUNXLE9BQVAsR0FBaUJKLE9BQU8sQ0FBQ0csU0FBUixDQUFrQixDQUFsQixFQUFxQkosSUFBckIsRUFBakI7QUFDSCxhQUhNLE1BR0EsSUFBSUMsT0FBTyxDQUFDQyxVQUFSLENBQW1CLE1BQW5CLENBQUosRUFBZ0M7QUFDbkM7QUFDQVIsY0FBQUEsTUFBTSxDQUFDWSxHQUFQLEdBQWFMLE9BQU8sQ0FBQ0csU0FBUixDQUFrQixDQUFsQixFQUFxQkosSUFBckIsRUFBYjtBQUNILGFBSE0sTUFHQSxJQUFJQyxPQUFPLENBQUNDLFVBQVIsQ0FBbUIsV0FBbkIsQ0FBSixFQUFxQztBQUN4QztBQUNBUixjQUFBQSxNQUFNLENBQUNhLFFBQVAsR0FBa0JOLE9BQU8sQ0FBQ0csU0FBUixDQUFrQixDQUFsQixFQUFxQkosSUFBckIsRUFBbEI7QUFDQUwsY0FBQUEsZ0JBQWdCLEdBQUcsSUFBbkIsQ0FId0MsQ0FJeEM7O0FBQ0EscUJBQU9ELE1BQU0sQ0FBQzNDLFFBQWQ7QUFDQSxxQkFBTzJDLE1BQU0sQ0FBQzFDLE1BQWQ7QUFDSCxhQVBNLE1BT0E7QUFDSDtBQUNBO0FBQ0EwQyxjQUFBQSxNQUFNLENBQUNaLE1BQVAsR0FBZ0JtQixPQUFoQjtBQUNIO0FBQ0osV0E1Q2EsQ0E4Q2Q7OztBQUNBUCxVQUFBQSxNQUFNLENBQUNjLEtBQVAsR0FBZWYsQ0FBQyxDQUFDZCxNQUFqQjtBQUNBZSxVQUFBQSxNQUFNLENBQUNlLE1BQVAsR0FBZ0JoQixDQUFDLENBQUNpQixLQUFsQjtBQUNBaEIsVUFBQUEsTUFBTSxDQUFDaUIsSUFBUCxHQUFjLE9BQWQsQ0FqRGMsQ0FpRFU7O0FBQ3hCakIsVUFBQUEsTUFBTSxDQUFDa0IsS0FBUCxHQUFlLE1BQWYsQ0FsRGMsQ0FvRGQ7QUFDQTs7QUFDQWxCLFVBQUFBLE1BQU0sQ0FBQ21CLE9BQVAsR0FBaUIsSUFBakI7QUFFQSxpQkFBT25CLE1BQVA7QUFDSCxTQTVEQztBQTZERm9CLFFBQUFBLE9BQU8sRUFBRSxpQkFBU0MsSUFBVCxFQUFlO0FBQ3BCO0FBQ0E7QUFDQSxjQUFJQSxJQUFJLENBQUNDLE1BQUwsSUFBZUQsSUFBSSxDQUFDekQsSUFBeEIsRUFBOEI7QUFDMUI7QUFDQSxnQkFBTTJELFFBQVEsR0FBR0YsSUFBSSxDQUFDekQsSUFBTCxDQUFVNEQsT0FBVixJQUFxQixFQUF0QztBQUNBLGdCQUFNQyxVQUFVLEdBQUdKLElBQUksQ0FBQ3pELElBQUwsQ0FBVTZELFVBQVYsSUFBd0IsRUFBM0MsQ0FIMEIsQ0FLMUI7O0FBQ0FKLFlBQUFBLElBQUksQ0FBQ0ssWUFBTCxHQUFvQkQsVUFBVSxDQUFDRSxLQUFYLElBQW9CLENBQXhDO0FBQ0FOLFlBQUFBLElBQUksQ0FBQ08sZUFBTCxHQUF1QkgsVUFBVSxDQUFDRSxLQUFYLElBQW9CLENBQTNDLENBUDBCLENBUzFCOztBQUNBLG1CQUFPdkcsaUJBQWlCLENBQUN5Ryx3QkFBbEIsQ0FBMkNOLFFBQTNDLENBQVA7QUFDSDs7QUFDRCxpQkFBTyxFQUFQO0FBQ0gsU0E3RUM7QUE4RUZPLFFBQUFBLFVBQVUsRUFBRSxvQkFBU0MsR0FBVCxFQUFjO0FBQ3RCO0FBQ0EsY0FBSSxPQUFPQyxZQUFQLEtBQXdCLFdBQXhCLElBQXVDQSxZQUFZLENBQUNDLFdBQXhELEVBQXFFO0FBQ2pFRixZQUFBQSxHQUFHLENBQUNHLGdCQUFKLENBQXFCLGVBQXJCLG1CQUFnREYsWUFBWSxDQUFDQyxXQUE3RDtBQUNIO0FBQ0o7QUFuRkMsT0FqQjRCO0FBc0dsQ0UsTUFBQUEsTUFBTSxFQUFFLElBdEcwQjtBQXVHbEM7QUFDQUMsTUFBQUEsSUFBSSxFQUFFLE1BeEc0QjtBQXlHbENDLE1BQUFBLFdBQVcsRUFBRSxJQXpHcUI7QUEwR2xDNUUsTUFBQUEsVUFBVSxFQUFFckMsaUJBQWlCLENBQUNzQyxhQUFsQixFQTFHc0I7QUEyR2xDNEUsTUFBQUEsUUFBUSxrQ0FDREMsb0JBQW9CLENBQUNDLHFCQURwQjtBQUVKQyxRQUFBQSxVQUFVLEVBQUVySCxpQkFBaUIsQ0FBQ3NILG9CQUFsQixFQUZSO0FBR0pDLFFBQUFBLFdBQVcsRUFBRXZILGlCQUFpQixDQUFDc0gsb0JBQWxCO0FBSFQsUUEzRzBCOztBQWlIbEM7QUFDWjtBQUNBO0FBQ0E7QUFDQTtBQUNZRSxNQUFBQSxVQXRIa0Msc0JBc0h2QkMsR0F0SHVCLEVBc0hsQmpGLElBdEhrQixFQXNIWjtBQUNsQixZQUFJQSxJQUFJLENBQUNrRixXQUFMLENBQWlCQyxPQUFqQixDQUF5QixVQUF6QixLQUF3QyxDQUE1QyxFQUErQztBQUMzQ3pILFVBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU91SCxHQUFQLENBQUQsQ0FBYUcsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsSUFBbkIsQ0FBd0IsaUNBQXhCO0FBQ0gsU0FGRCxNQUVPO0FBQ0gzSCxVQUFBQSxDQUFDLENBQUMsSUFBRCxFQUFPdUgsR0FBUCxDQUFELENBQWFHLEVBQWIsQ0FBZ0IsQ0FBaEIsRUFBbUJDLElBQW5CLENBQXdCLEVBQXhCO0FBQ0g7O0FBQ0QzSCxRQUFBQSxDQUFDLENBQUMsSUFBRCxFQUFPdUgsR0FBUCxDQUFELENBQWFHLEVBQWIsQ0FBZ0IsQ0FBaEIsRUFBbUJDLElBQW5CLENBQXdCckYsSUFBSSxDQUFDLENBQUQsQ0FBNUI7QUFDQXRDLFFBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU91SCxHQUFQLENBQUQsQ0FBYUcsRUFBYixDQUFnQixDQUFoQixFQUNLQyxJQURMLENBQ1VyRixJQUFJLENBQUMsQ0FBRCxDQURkLEVBRUtzRixRQUZMLENBRWMsYUFGZDtBQUdBNUgsUUFBQUEsQ0FBQyxDQUFDLElBQUQsRUFBT3VILEdBQVAsQ0FBRCxDQUFhRyxFQUFiLENBQWdCLENBQWhCLEVBQ0tDLElBREwsQ0FDVXJGLElBQUksQ0FBQyxDQUFELENBRGQsRUFFS3NGLFFBRkwsQ0FFYyxhQUZkLEVBVmtCLENBY2xCOztBQUNBNUgsUUFBQUEsQ0FBQyxDQUFDLElBQUQsRUFBT3VILEdBQVAsQ0FBRCxDQUFhRyxFQUFiLENBQWdCLENBQWhCLEVBQW1CQyxJQUFuQixDQUF3QnJGLElBQUksQ0FBQyxDQUFELENBQTVCLEVBQWlDc0YsUUFBakMsQ0FBMEMsZUFBMUMsRUFma0IsQ0FpQmxCOztBQUNBLFlBQUlDLFdBQVcsR0FBRyxFQUFsQixDQWxCa0IsQ0FvQmxCOztBQUNBLFlBQUl2RixJQUFJLENBQUN3RixHQUFMLEtBQWEsRUFBakIsRUFBcUI7QUFDakJELFVBQUFBLFdBQVcsNEJBQW9CdkYsSUFBSSxDQUFDd0YsR0FBekIsZ0dBQVg7QUFDSCxTQXZCaUIsQ0F5QmxCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBRCxRQUFBQSxXQUFXLGtJQUMwQnZGLElBQUksQ0FBQ3lGLFFBRC9CLG1FQUV3QkMsZUFBZSxDQUFDQyxnQkFBaEIsSUFBb0MsZUFGNUQsd0lBQVg7QUFNQWpJLFFBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU91SCxHQUFQLENBQUQsQ0FBYUcsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsSUFBbkIsQ0FBd0JFLFdBQXhCLEVBQXFDRCxRQUFyQyxDQUE4QyxlQUE5QztBQUNILE9BM0ppQzs7QUE2SmxDO0FBQ1o7QUFDQTtBQUNZTSxNQUFBQSxZQWhLa0MsMEJBZ0tuQjtBQUNYQyxRQUFBQSxhQUFhLENBQUNDLHFCQUFkLENBQW9DLGFBQXBDO0FBQ0F0SSxRQUFBQSxpQkFBaUIsQ0FBQ3VJLHdCQUFsQjtBQUNILE9BbktpQzs7QUFvS2xDO0FBQ1o7QUFDQTtBQUNBO0FBQ1lDLE1BQUFBLFlBeEtrQywwQkF3S25CO0FBQ1g7QUFDQXhJLFFBQUFBLGlCQUFpQixDQUFDWSxhQUFsQixHQUFrQyxJQUFsQyxDQUZXLENBR1g7O0FBQ0FaLFFBQUFBLGlCQUFpQixDQUFDeUksdUJBQWxCO0FBQ0gsT0E3S2lDO0FBOEtsQ0MsTUFBQUEsUUFBUSxFQUFFO0FBOUt3QixLQUF0QztBQWdMQTFJLElBQUFBLGlCQUFpQixDQUFDTyxTQUFsQixHQUE4QlAsaUJBQWlCLENBQUNDLFNBQWxCLENBQTRCMEksU0FBNUIsRUFBOUIsQ0FwTTZCLENBc003Qjs7QUFDQTNJLElBQUFBLGlCQUFpQixDQUFDSyxlQUFsQixDQUFrQzJELE1BQWxDLENBQXlDO0FBQ3JDNEUsTUFBQUEsYUFBYSxFQUFFLENBRHNCO0FBRXJDQyxNQUFBQSxhQUFhLEVBQUUsS0FGc0I7QUFHckNDLE1BQUFBLFlBQVksRUFBRSxDQUFDLE9BQUQsQ0FIdUI7QUFJckNDLE1BQUFBLGFBQWEsRUFBRSxLQUpzQjtBQUtyQ0MsTUFBQUEsTUFBTSxFQUFFLENBQ0o7QUFBRUMsUUFBQUEsS0FBSyxFQUFFZixlQUFlLENBQUNnQix3QkFBekI7QUFBbURqRSxRQUFBQSxLQUFLLEVBQUU7QUFBMUQsT0FESSxFQUVKO0FBQUVnRSxRQUFBQSxLQUFLLEVBQUVmLGVBQWUsQ0FBQ2lCLHNCQUF6QjtBQUFpRGxFLFFBQUFBLEtBQUssRUFBRTtBQUF4RCxPQUZJLEVBR0o7QUFBRWdFLFFBQUFBLEtBQUssRUFBRWYsZUFBZSxDQUFDa0IsZUFBekI7QUFBMENuRSxRQUFBQSxLQUFLLEVBQUU7QUFBakQsT0FISSxFQUlKO0FBQUVnRSxRQUFBQSxLQUFLLEVBQUVmLGVBQWUsQ0FBQ21CLG9CQUF6QjtBQUErQ3BFLFFBQUFBLEtBQUssRUFBRTtBQUF0RCxPQUpJLEVBS0o7QUFBRWdFLFFBQUFBLEtBQUssRUFBRWYsZUFBZSxDQUFDb0Isd0JBQXpCO0FBQW1EckUsUUFBQUEsS0FBSyxFQUFFO0FBQTFELE9BTEksQ0FMNkI7QUFZckNzRSxNQUFBQSxRQUFRLEVBQUUsa0JBQVNyRCxNQUFULEVBQWlCc0QsUUFBakIsRUFBMkI7QUFDakN4SixRQUFBQSxpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0N5QyxHQUFoQyxDQUFvQ3NELE1BQU0sQ0FBQ2pCLEtBQTNDO0FBQ0FqRixRQUFBQSxpQkFBaUIsQ0FBQ0ssZUFBbEIsQ0FBa0MyRCxNQUFsQyxDQUF5QyxjQUF6QztBQUNBLGVBQU8sS0FBUDtBQUNIO0FBaEJvQyxLQUF6QyxFQXZNNkIsQ0EwTjdCOztBQUNBOUQsSUFBQUEsQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQmEsRUFBbEIsQ0FBcUIsT0FBckIsRUFBOEIsWUFBVztBQUNyQ2YsTUFBQUEsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDc0osS0FBaEM7QUFDQXpKLE1BQUFBLGlCQUFpQixDQUFDSyxlQUFsQixDQUFrQzJELE1BQWxDLENBQXlDLE9BQXpDO0FBQ0gsS0FIRCxFQTNONkIsQ0FnTzdCOztBQUNBaEUsSUFBQUEsaUJBQWlCLENBQUNNLG1CQUFsQixDQUFzQ29KLFFBQXRDLENBQStDO0FBQzNDQyxNQUFBQSxRQUQyQyxvQkFDbEN0SCxVQURrQyxFQUN0QjtBQUNqQixZQUFJQSxVQUFVLEtBQUssTUFBbkIsRUFBMkI7QUFDdkJBLFVBQUFBLFVBQVUsR0FBR3JDLGlCQUFpQixDQUFDNEosbUJBQWxCLEVBQWI7QUFDQXBJLFVBQUFBLFlBQVksQ0FBQ0MsVUFBYixDQUF3QixvQkFBeEI7QUFDSCxTQUhELE1BR087QUFDSEQsVUFBQUEsWUFBWSxDQUFDd0IsT0FBYixDQUFxQixvQkFBckIsRUFBMkNYLFVBQTNDO0FBQ0g7O0FBQ0RyQyxRQUFBQSxpQkFBaUIsQ0FBQ08sU0FBbEIsQ0FBNEJzQyxJQUE1QixDQUFpQ2dILEdBQWpDLENBQXFDeEgsVUFBckMsRUFBaUR5SCxJQUFqRDtBQUNIO0FBVDBDLEtBQS9DO0FBV0E5SixJQUFBQSxpQkFBaUIsQ0FBQ00sbUJBQWxCLENBQXNDUyxFQUF0QyxDQUF5QyxPQUF6QyxFQUFrRCxVQUFTZ0osS0FBVCxFQUFnQjtBQUM5REEsTUFBQUEsS0FBSyxDQUFDQyxlQUFOLEdBRDhELENBQ3JDO0FBQzVCLEtBRkQsRUE1TzZCLENBZ1A3Qjs7QUFDQSxRQUFNQyxlQUFlLEdBQUd6SSxZQUFZLENBQUM4QixPQUFiLENBQXFCLG9CQUFyQixDQUF4Qjs7QUFDQSxRQUFJMkcsZUFBSixFQUFxQjtBQUNqQmpLLE1BQUFBLGlCQUFpQixDQUFDTSxtQkFBbEIsQ0FBc0NvSixRQUF0QyxDQUErQyxXQUEvQyxFQUE0RE8sZUFBNUQ7QUFDSDs7QUFFRGpLLElBQUFBLGlCQUFpQixDQUFDTyxTQUFsQixDQUE0QlEsRUFBNUIsQ0FBK0IsTUFBL0IsRUFBdUMsWUFBTTtBQUN6Q2YsTUFBQUEsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDK0osT0FBaEMsQ0FBd0MsS0FBeEMsRUFBK0NDLFdBQS9DLENBQTJELFNBQTNELEVBRHlDLENBR3pDOztBQUNBLFVBQUksQ0FBQ25LLGlCQUFpQixDQUFDWSxhQUF2QixFQUFzQztBQUNsQztBQUNILE9BTndDLENBUXpDOzs7QUFDQVosTUFBQUEsaUJBQWlCLENBQUM0QixnQkFBbEI7QUFDSCxLQVZELEVBdFA2QixDQWtRN0I7QUFDQTs7QUFDQTVCLElBQUFBLGlCQUFpQixDQUFDQyxTQUFsQixDQUE0QmMsRUFBNUIsQ0FBK0IsT0FBL0IsRUFBd0MsWUFBeEMsRUFBc0QsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3pEQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQUQsTUFBQUEsQ0FBQyxDQUFDZ0osZUFBRixHQUZ5RCxDQUVwQzs7QUFFckIsVUFBTWhDLEdBQUcsR0FBRzlILENBQUMsQ0FBQ2MsQ0FBQyxDQUFDb0osYUFBSCxDQUFELENBQW1CQyxJQUFuQixDQUF3QixVQUF4QixDQUFaOztBQUNBLFVBQUlyQyxHQUFHLEtBQUtzQyxTQUFSLElBQXFCdEMsR0FBRyxLQUFLLEVBQWpDLEVBQXFDO0FBQ2pDO0FBQ0E7QUFDQSxZQUFNdkQsR0FBRyxhQUFNM0QsYUFBTiw2Q0FBc0R5SixrQkFBa0IsQ0FBQ3ZDLEdBQUQsQ0FBeEUsNkJBQVQ7QUFDQTVHLFFBQUFBLE1BQU0sQ0FBQ29KLElBQVAsQ0FBWS9GLEdBQVosRUFBaUIsUUFBakI7QUFDSDtBQUNKLEtBWEQsRUFwUTZCLENBaVI3QjtBQUNBOztBQUNBekUsSUFBQUEsaUJBQWlCLENBQUNDLFNBQWxCLENBQTRCYyxFQUE1QixDQUErQixPQUEvQixFQUF3Qyw0QkFBeEMsRUFBc0UsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3pFLFVBQU15SixFQUFFLEdBQUd2SyxDQUFDLENBQUNjLENBQUMsQ0FBQzBKLE1BQUgsQ0FBRCxDQUFZUixPQUFaLENBQW9CLElBQXBCLENBQVg7QUFDQSxVQUFNekMsR0FBRyxHQUFHekgsaUJBQWlCLENBQUNPLFNBQWxCLENBQTRCa0gsR0FBNUIsQ0FBZ0NnRCxFQUFoQyxDQUFaOztBQUVBLFVBQUloRCxHQUFHLENBQUNrRCxLQUFKLENBQVVDLE9BQVYsRUFBSixFQUF5QjtBQUNyQjtBQUNBbkQsUUFBQUEsR0FBRyxDQUFDa0QsS0FBSixDQUFVRSxJQUFWO0FBQ0FKLFFBQUFBLEVBQUUsQ0FBQ04sV0FBSCxDQUFlLE9BQWY7QUFDSCxPQUpELE1BSU87QUFDSDtBQUNBMUMsUUFBQUEsR0FBRyxDQUFDa0QsS0FBSixDQUFVM0ssaUJBQWlCLENBQUM4SyxXQUFsQixDQUE4QnJELEdBQUcsQ0FBQ2pGLElBQUosRUFBOUIsQ0FBVixFQUFxRHVJLElBQXJEO0FBQ0FOLFFBQUFBLEVBQUUsQ0FBQzNDLFFBQUgsQ0FBWSxPQUFaO0FBQ0FMLFFBQUFBLEdBQUcsQ0FBQ2tELEtBQUosR0FBWUssSUFBWixDQUFpQixvQkFBakIsRUFBdUNDLElBQXZDLENBQTRDLFVBQUNDLEtBQUQsRUFBUUMsU0FBUixFQUFzQjtBQUM5RCxjQUFNQyxFQUFFLEdBQUdsTCxDQUFDLENBQUNpTCxTQUFELENBQUQsQ0FBYWQsSUFBYixDQUFrQixJQUFsQixDQUFYO0FBQ0EsaUJBQU8sSUFBSWdCLFNBQUosQ0FBY0QsRUFBZCxDQUFQO0FBQ0gsU0FIRDtBQUlBL0MsUUFBQUEsYUFBYSxDQUFDQyxxQkFBZCxDQUFvQyxhQUFwQztBQUNIO0FBQ0osS0FsQkQsRUFuUjZCLENBdVM3QjtBQUNBO0FBQ0E7O0FBQ0F0SSxJQUFBQSxpQkFBaUIsQ0FBQ0MsU0FBbEIsQ0FBNEJjLEVBQTVCLENBQStCLE9BQS9CLEVBQXdDLHdDQUF4QyxFQUFrRixVQUFDQyxDQUFELEVBQU87QUFDckZBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBRCxNQUFBQSxDQUFDLENBQUNnSixlQUFGLEdBRnFGLENBRWhFOztBQUVyQixVQUFNc0IsT0FBTyxHQUFHcEwsQ0FBQyxDQUFDYyxDQUFDLENBQUNvSixhQUFILENBQWpCO0FBQ0EsVUFBTW1CLFFBQVEsR0FBR0QsT0FBTyxDQUFDakIsSUFBUixDQUFhLGdCQUFiLENBQWpCOztBQUVBLFVBQUksQ0FBQ2tCLFFBQUwsRUFBZTtBQUNYO0FBQ0gsT0FUb0YsQ0FXckY7OztBQUNBRCxNQUFBQSxPQUFPLENBQUN4RCxRQUFSLENBQWlCLGtCQUFqQixFQVpxRixDQWNyRjs7QUFDQTlILE1BQUFBLGlCQUFpQixDQUFDd0wsWUFBbEIsQ0FBK0JELFFBQS9CLEVBQXlDRCxPQUF6QztBQUNILEtBaEJEO0FBaUJILEdBbmZxQjs7QUFxZnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0k3QyxFQUFBQSx1QkF6ZnNCLHFDQXlmSTtBQUN0QixRQUFNZ0QsVUFBVSxHQUFHekwsaUJBQWlCLENBQUNvRCxnQkFBbEIsRUFBbkI7O0FBQ0EsUUFBSSxDQUFDcUksVUFBTCxFQUFpQjtBQUNiO0FBQ0gsS0FKcUIsQ0FNdEI7OztBQUNBLFFBQUlBLFVBQVUsQ0FBQ3RKLFVBQWYsRUFBMkI7QUFDdkJuQyxNQUFBQSxpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0N5QyxHQUFoQyxDQUFvQzZJLFVBQVUsQ0FBQ3RKLFVBQS9DLEVBRHVCLENBRXZCOztBQUNBbkMsTUFBQUEsaUJBQWlCLENBQUNPLFNBQWxCLENBQTRCeUQsTUFBNUIsQ0FBbUN5SCxVQUFVLENBQUN0SixVQUE5QztBQUNILEtBWHFCLENBYXRCO0FBQ0E7OztBQUNBLFFBQUlzSixVQUFVLENBQUNySixXQUFmLEVBQTRCO0FBQ3hCdUIsTUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYjNELFFBQUFBLGlCQUFpQixDQUFDTyxTQUFsQixDQUE0QnNDLElBQTVCLENBQWlDNEksVUFBVSxDQUFDckosV0FBNUMsRUFBeUQwSCxJQUF6RCxDQUE4RCxLQUE5RDtBQUNILE9BRlMsRUFFUCxHQUZPLENBQVY7QUFHSCxLQUpELE1BSU8sSUFBSTJCLFVBQVUsQ0FBQ3RKLFVBQWYsRUFBMkI7QUFDOUI7QUFDQW5DLE1BQUFBLGlCQUFpQixDQUFDTyxTQUFsQixDQUE0QnVKLElBQTVCO0FBQ0g7QUFDSixHQWhoQnFCOztBQWtoQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJMEIsRUFBQUEsWUF4aEJzQix3QkF3aEJURCxRQXhoQlMsRUF3aEJDRCxPQXhoQkQsRUF3aEJVO0FBQzVCO0FBQ0E7QUFDQUksSUFBQUEsTUFBTSxDQUFDRixZQUFQLENBQW9CRCxRQUFwQixFQUE4QjtBQUFFSSxNQUFBQSxlQUFlLEVBQUU7QUFBbkIsS0FBOUIsRUFBeUQsVUFBQ25DLFFBQUQsRUFBYztBQUNuRThCLE1BQUFBLE9BQU8sQ0FBQ25CLFdBQVIsQ0FBb0Isa0JBQXBCOztBQUVBLFVBQUlYLFFBQVEsSUFBSUEsUUFBUSxDQUFDdEQsTUFBVCxLQUFvQixJQUFwQyxFQUEwQztBQUN0QztBQUNBO0FBQ0FsRyxRQUFBQSxpQkFBaUIsQ0FBQ08sU0FBbEIsQ0FBNEJpRSxJQUE1QixDQUFpQzlDLE1BQWpDLENBQXdDLElBQXhDLEVBQThDLEtBQTlDO0FBQ0gsT0FKRCxNQUlPO0FBQUE7O0FBQ0g7QUFDQSxZQUFNa0ssUUFBUSxHQUFHLENBQUFwQyxRQUFRLFNBQVIsSUFBQUEsUUFBUSxXQUFSLGtDQUFBQSxRQUFRLENBQUVxQyxRQUFWLG1HQUFvQjFJLEtBQXBCLGdGQUE0QixDQUE1QixNQUNEK0UsZUFBZSxDQUFDNEQsZ0JBRGYsSUFFRCx5QkFGaEI7QUFHQUMsUUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCSixRQUF0QjtBQUNIO0FBQ0osS0FkRDtBQWVILEdBMWlCcUI7O0FBNGlCdEI7QUFDSjtBQUNBO0FBQ0lyRCxFQUFBQSx3QkEvaUJzQixzQ0EraUJLO0FBQ3ZCLFFBQU14RixJQUFJLEdBQUcvQyxpQkFBaUIsQ0FBQ08sU0FBbEIsQ0FBNEJzQyxJQUE1QixDQUFpQ0UsSUFBakMsRUFBYjs7QUFDQSxRQUFJQSxJQUFJLENBQUNrSixLQUFMLElBQWMsQ0FBbEIsRUFBcUI7QUFDakIvTCxNQUFBQSxDQUFDLENBQUNGLGlCQUFpQixDQUFDTyxTQUFsQixDQUE0QjJMLEtBQTVCLEdBQW9DQyxTQUFwQyxFQUFELENBQUQsQ0FBbURuQixJQUFuRCxDQUF3RCxzQkFBeEQsRUFBZ0ZILElBQWhGO0FBQ0gsS0FGRCxNQUVPO0FBQ0gzSyxNQUFBQSxDQUFDLENBQUNGLGlCQUFpQixDQUFDTyxTQUFsQixDQUE0QjJMLEtBQTVCLEdBQW9DQyxTQUFwQyxFQUFELENBQUQsQ0FBbURuQixJQUFuRCxDQUF3RCxzQkFBeEQsRUFBZ0ZELElBQWhGO0FBQ0g7QUFDSixHQXRqQnFCOztBQXdqQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXBKLEVBQUFBLGtCQTdqQnNCLGdDQTZqQkQ7QUFDakI7QUFDQSxRQUFNOEosVUFBVSxHQUFHekwsaUJBQWlCLENBQUNvRCxnQkFBbEIsRUFBbkI7QUFFQXNJLElBQUFBLE1BQU0sQ0FBQ1UsV0FBUCxDQUFtQjtBQUFFMUcsTUFBQUEsS0FBSyxFQUFFO0FBQVQsS0FBbkIsRUFBbUMsVUFBQ2xELElBQUQsRUFBVTtBQUN6QyxVQUFJQSxJQUFJLElBQUlBLElBQUksQ0FBQzZKLFVBQWpCLEVBQTZCO0FBQ3pCLFlBQUk1SixTQUFKLEVBQWVDLE9BQWYsQ0FEeUIsQ0FHekI7O0FBQ0EsWUFBSStJLFVBQVUsSUFBSUEsVUFBVSxDQUFDeEosUUFBekIsSUFBcUN3SixVQUFVLENBQUN2SixNQUFwRCxFQUE0RDtBQUN4RE8sVUFBQUEsU0FBUyxHQUFHNkosTUFBTSxDQUFDYixVQUFVLENBQUN4SixRQUFaLENBQWxCO0FBQ0FTLFVBQUFBLE9BQU8sR0FBRzRKLE1BQU0sQ0FBQ2IsVUFBVSxDQUFDdkosTUFBWixDQUFoQjtBQUNILFNBSEQsTUFHTztBQUNIO0FBQ0FPLFVBQUFBLFNBQVMsR0FBRzZKLE1BQU0sQ0FBQzlKLElBQUksQ0FBQytKLFlBQU4sQ0FBbEI7QUFDQTdKLFVBQUFBLE9BQU8sR0FBRzRKLE1BQU0sQ0FBQzlKLElBQUksQ0FBQ2dLLFVBQU4sQ0FBaEI7QUFDSDs7QUFFRHhNLFFBQUFBLGlCQUFpQixDQUFDUyxhQUFsQixHQUFrQyxJQUFsQztBQUNBVCxRQUFBQSxpQkFBaUIsQ0FBQ3lNLDJCQUFsQixDQUE4Q2hLLFNBQTlDLEVBQXlEQyxPQUF6RCxFQWR5QixDQWdCekI7QUFDQTs7QUFDQTFDLFFBQUFBLGlCQUFpQixDQUFDd0QsOEJBQWxCO0FBQ0gsT0FuQkQsTUFtQk87QUFDSDtBQUNBeEQsUUFBQUEsaUJBQWlCLENBQUNTLGFBQWxCLEdBQWtDLEtBQWxDO0FBQ0FULFFBQUFBLGlCQUFpQixDQUFDME0sNEJBQWxCLEdBSEcsQ0FJSDtBQUNIO0FBQ0osS0ExQkQ7QUEyQkgsR0E1bEJxQjs7QUE4bEJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJcEYsRUFBQUEsb0JBbG1Cc0Isa0NBa21CQztBQUNuQjtBQUNBLFFBQUksQ0FBQ3RILGlCQUFpQixDQUFDUyxhQUF2QixFQUFzQztBQUNsQyxhQUFPLEVBQVA7QUFDSCxLQUprQixDQU1uQjs7O0FBQ0Esa0xBSVV5SCxlQUFlLENBQUN5RSxzQkFKMUIsb0lBUWN6RSxlQUFlLENBQUMwRSw0QkFSOUI7QUFZSCxHQXJuQnFCOztBQXVuQnRCO0FBQ0o7QUFDQTtBQUNJRixFQUFBQSw0QkExbkJzQiwwQ0EwbkJTO0FBQzNCO0FBQ0ExTSxJQUFBQSxpQkFBaUIsQ0FBQ0MsU0FBbEIsQ0FBNEI0SyxJQUE1QixHQUYyQixDQUkzQjs7QUFDQTNLLElBQUFBLENBQUMsQ0FBQyxzQkFBRCxDQUFELENBQTBCZ0ssT0FBMUIsQ0FBa0MsU0FBbEMsRUFBNkNXLElBQTdDLEdBTDJCLENBTzNCOztBQUNBN0ssSUFBQUEsaUJBQWlCLENBQUNVLHlCQUFsQixDQUE0Q3FLLElBQTVDO0FBQ0gsR0Fub0JxQjs7QUFxb0J0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0l0RSxFQUFBQSx3QkExb0JzQixvQ0Ewb0JHTixRQTFvQkgsRUEwb0JhO0FBQy9CLFdBQU9BLFFBQVEsQ0FBQzBHLEdBQVQsQ0FBYSxVQUFBQyxLQUFLLEVBQUk7QUFDekI7QUFDQSxVQUFNQyxPQUFPLEdBQUdELEtBQUssQ0FBQ0UsWUFBTixJQUFzQixDQUF0QztBQUNBLFVBQU1DLFVBQVUsR0FBSUYsT0FBTyxHQUFHLElBQVgsR0FBbUIsT0FBbkIsR0FBNkIsVUFBaEQ7QUFDQSxVQUFNRyxNQUFNLEdBQUdILE9BQU8sR0FBRyxDQUFWLEdBQWNULE1BQU0sQ0FBQ2EsR0FBUCxDQUFXSixPQUFPLEdBQUcsSUFBckIsRUFBMkJwSyxNQUEzQixDQUFrQ3NLLFVBQWxDLENBQWQsR0FBOEQsRUFBN0UsQ0FKeUIsQ0FNekI7O0FBQ0EsVUFBTUcsYUFBYSxHQUFHZCxNQUFNLENBQUNRLEtBQUssQ0FBQ2xILEtBQVAsQ0FBTixDQUFvQmpELE1BQXBCLENBQTJCLHFCQUEzQixDQUF0QixDQVB5QixDQVN6Qjs7QUFDQSxVQUFNMEssVUFBVSxHQUFHLENBQUNQLEtBQUssQ0FBQzFHLE9BQU4sSUFBaUIsRUFBbEIsRUFDZGtILE1BRGMsQ0FDUCxVQUFBQyxDQUFDO0FBQUEsZUFBSUEsQ0FBQyxDQUFDQyxhQUFGLElBQW1CRCxDQUFDLENBQUNDLGFBQUYsQ0FBZ0IzSixNQUFoQixHQUF5QixDQUFoRDtBQUFBLE9BRE0sRUFFZGdKLEdBRmMsQ0FFVixVQUFBVSxDQUFDO0FBQUEsZUFBSztBQUNQbkMsVUFBQUEsRUFBRSxFQUFFbUMsQ0FBQyxDQUFDbkMsRUFEQztBQUVQL0YsVUFBQUEsT0FBTyxFQUFFa0ksQ0FBQyxDQUFDbEksT0FGSjtBQUdQRSxVQUFBQSxPQUFPLEVBQUVnSSxDQUFDLENBQUNoSSxPQUhKO0FBSVBpSSxVQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQ0MsYUFKVjtBQUtQQyxVQUFBQSxZQUFZLEVBQUVGLENBQUMsQ0FBQ0UsWUFMVDtBQUt5QjtBQUNoQ0MsVUFBQUEsWUFBWSxFQUFFSCxDQUFDLENBQUNHLFlBTlQsQ0FNeUI7O0FBTnpCLFNBQUw7QUFBQSxPQUZTLENBQW5CLENBVnlCLENBcUJ6Qjs7QUFDQSxVQUFNQyxhQUFhLEdBQUdOLFVBQVUsQ0FBQ3hKLE1BQVgsR0FBb0IsQ0FBMUM7QUFDQSxVQUFNK0osVUFBVSxHQUFHZCxLQUFLLENBQUNlLFdBQU4sS0FBc0IsVUFBekM7QUFDQSxVQUFNQyxVQUFVLEdBQUdILGFBQWEsR0FBRyxVQUFILEdBQWdCLElBQWhEO0FBQ0EsVUFBTUksYUFBYSxHQUFHSCxVQUFVLEdBQUcsRUFBSCxHQUFRLFdBQXhDLENBekJ5QixDQTJCekI7O0FBQ0EsVUFBTTVGLEdBQUcsR0FBRyxDQUFDOEUsS0FBSyxDQUFDMUcsT0FBTixJQUFpQixFQUFsQixFQUNQeUcsR0FETyxDQUNILFVBQUFVLENBQUM7QUFBQSxlQUFJQSxDQUFDLENBQUNTLGVBQU47QUFBQSxPQURFLEVBRVBWLE1BRk8sQ0FFQSxVQUFBbEMsRUFBRTtBQUFBLGVBQUlBLEVBQUUsSUFBSUEsRUFBRSxDQUFDdkgsTUFBSCxHQUFZLENBQXRCO0FBQUEsT0FGRixFQUdQb0ssSUFITyxDQUdGLEdBSEUsQ0FBWixDQTVCeUIsQ0FpQ3pCO0FBQ0E7O0FBQ0EsVUFBTXhHLEdBQUcsR0FBRyxDQUNSMkYsYUFEUSxFQUNvQjtBQUM1Qk4sTUFBQUEsS0FBSyxDQUFDekgsT0FGRSxFQUVvQjtBQUM1QnlILE1BQUFBLEtBQUssQ0FBQ3ZILE9BQU4sSUFBaUJ1SCxLQUFLLENBQUN0SCxHQUhmLEVBR29CO0FBQzVCMEgsTUFBQUEsTUFKUSxFQUlvQjtBQUM1QkcsTUFBQUEsVUFMUSxFQUtvQjtBQUM1QlAsTUFBQUEsS0FBSyxDQUFDZSxXQU5FLENBTW9CO0FBTnBCLE9BQVosQ0FuQ3lCLENBNEN6Qjs7QUFDQXBHLE1BQUFBLEdBQUcsQ0FBQ1EsUUFBSixHQUFlNkUsS0FBSyxDQUFDckgsUUFBckI7QUFDQWdDLE1BQUFBLEdBQUcsQ0FBQ0MsV0FBSixHQUFrQm9HLFVBQVUsR0FBR0MsYUFBL0I7QUFDQXRHLE1BQUFBLEdBQUcsQ0FBQ08sR0FBSixHQUFVQSxHQUFWLENBL0N5QixDQStDVjs7QUFFZixhQUFPUCxHQUFQO0FBQ0gsS0FsRE0sQ0FBUDtBQW1ESCxHQTlyQnFCOztBQWdzQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXFELEVBQUFBLFdBcnNCc0IsdUJBcXNCVnRJLElBcnNCVSxFQXFzQko7QUFDZCxRQUFJMEwsVUFBVSxHQUFHLHVEQUFqQjtBQUNBMUwsSUFBQUEsSUFBSSxDQUFDLENBQUQsQ0FBSixDQUFRMkwsT0FBUixDQUFnQixVQUFDQyxNQUFELEVBQVNDLENBQVQsRUFBZTtBQUMzQixVQUFJQSxDQUFDLEdBQUcsQ0FBUixFQUFXO0FBQ1BILFFBQUFBLFVBQVUsSUFBSSxvQkFBZDtBQUNBQSxRQUFBQSxVQUFVLElBQUksb0JBQWQ7QUFDSDs7QUFDRCxVQUFJRSxNQUFNLENBQUNaLGFBQVAsS0FBeUJsRCxTQUF6QixJQUNHOEQsTUFBTSxDQUFDWixhQUFQLEtBQXlCLElBRDVCLElBRUdZLE1BQU0sQ0FBQ1osYUFBUCxDQUFxQjNKLE1BQXJCLEtBQWdDLENBRnZDLEVBRTBDO0FBRXRDcUssUUFBQUEsVUFBVSxnRUFFbUJFLE1BQU0sQ0FBQ2hELEVBRjFCLDZMQU13QmdELE1BQU0sQ0FBQ2hELEVBTi9CLGdJQVMwQmdELE1BQU0sQ0FBQ2hELEVBVGpDLHVRQWVnQ2dELE1BQU0sQ0FBQy9JLE9BZnZDLHVLQWlCK0IrSSxNQUFNLENBQUM3SSxPQWpCdEMsd0JBQVY7QUFtQkgsT0F2QkQsTUF1Qk87QUFDSDtBQUNBO0FBQ0E7QUFDQSxZQUFNK0ksV0FBVyxHQUFHRixNQUFNLENBQUNYLFlBQVAsSUFBdUIsRUFBM0M7QUFDQSxZQUFNYyxXQUFXLEdBQUdILE1BQU0sQ0FBQ1YsWUFBUCxJQUF1QixFQUEzQztBQUVBUSxRQUFBQSxVQUFVLHVEQUVVRSxNQUFNLENBQUNoRCxFQUZqQiw2TEFNd0JnRCxNQUFNLENBQUNoRCxFQU4vQixzQkFNMkNrRCxXQU4zQyx1SEFTMEJGLE1BQU0sQ0FBQ2hELEVBVGpDLG1QQWFpRm1ELFdBYmpGLGtjQXVCZ0NILE1BQU0sQ0FBQy9JLE9BdkJ2Qyx1S0F5QitCK0ksTUFBTSxDQUFDN0ksT0F6QnRDLHdCQUFWO0FBMkJIO0FBQ0osS0EvREQ7QUFnRUEySSxJQUFBQSxVQUFVLElBQUksa0JBQWQ7QUFDQSxXQUFPQSxVQUFQO0FBQ0gsR0F6d0JxQjs7QUEyd0J0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJNUwsRUFBQUEsYUEvd0JzQiwyQkErd0JOO0FBQ1o7QUFDQSxRQUFNMkgsZUFBZSxHQUFHekksWUFBWSxDQUFDOEIsT0FBYixDQUFxQixvQkFBckIsQ0FBeEI7QUFDQSxXQUFPMkcsZUFBZSxHQUFHdUUsUUFBUSxDQUFDdkUsZUFBRCxFQUFrQixFQUFsQixDQUFYLEdBQW1DakssaUJBQWlCLENBQUM0SixtQkFBbEIsRUFBekQ7QUFDSCxHQW54QnFCOztBQXF4QnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lBLEVBQUFBLG1CQXp4QnNCLGlDQXl4QkE7QUFDbEI7QUFDQSxRQUFJNkUsU0FBUyxHQUFHek8saUJBQWlCLENBQUNDLFNBQWxCLENBQTRCK0ssSUFBNUIsQ0FBaUMsWUFBakMsRUFBK0MwRCxLQUEvQyxHQUF1REMsV0FBdkQsRUFBaEIsQ0FGa0IsQ0FJbEI7O0FBQ0EsUUFBTUMsWUFBWSxHQUFHeE4sTUFBTSxDQUFDeU4sV0FBNUI7QUFDQSxRQUFNQyxrQkFBa0IsR0FBRyxHQUEzQixDQU5rQixDQU1jO0FBRWhDOztBQUNBLFdBQU9DLElBQUksQ0FBQ0MsR0FBTCxDQUFTRCxJQUFJLENBQUNFLEtBQUwsQ0FBVyxDQUFDTCxZQUFZLEdBQUdFLGtCQUFoQixJQUFzQ0wsU0FBakQsQ0FBVCxFQUFzRSxDQUF0RSxDQUFQO0FBQ0gsR0FueUJxQjs7QUFveUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0loQyxFQUFBQSwyQkF6eUJzQix5Q0F5eUJ3QztBQUFBOztBQUFBLFFBQWxDaEssU0FBa0MsdUVBQXRCLElBQXNCO0FBQUEsUUFBaEJDLE9BQWdCLHVFQUFOLElBQU07QUFDMUQsUUFBTXdNLE9BQU8sR0FBRyxFQUFoQjtBQUVBQSxJQUFBQSxPQUFPLENBQUNDLE1BQVIsMkRBQ0tqSCxlQUFlLENBQUNrSCxTQURyQixFQUNpQyxDQUFDOUMsTUFBTSxFQUFQLEVBQVdBLE1BQU0sRUFBakIsQ0FEakMsb0NBRUtwRSxlQUFlLENBQUNtSCxhQUZyQixFQUVxQyxDQUFDL0MsTUFBTSxHQUFHZ0QsUUFBVCxDQUFrQixDQUFsQixFQUFxQixNQUFyQixDQUFELEVBQStCaEQsTUFBTSxHQUFHZ0QsUUFBVCxDQUFrQixDQUFsQixFQUFxQixNQUFyQixDQUEvQixDQUZyQyxvQ0FHS3BILGVBQWUsQ0FBQ3FILFlBSHJCLEVBR29DLENBQUNqRCxNQUFNLEdBQUdnRCxRQUFULENBQWtCLENBQWxCLEVBQXFCLE1BQXJCLENBQUQsRUFBK0JoRCxNQUFNLEVBQXJDLENBSHBDLG9DQUlLcEUsZUFBZSxDQUFDc0gsY0FKckIsRUFJc0MsQ0FBQ2xELE1BQU0sR0FBR2dELFFBQVQsQ0FBa0IsRUFBbEIsRUFBc0IsTUFBdEIsQ0FBRCxFQUFnQ2hELE1BQU0sRUFBdEMsQ0FKdEMsb0NBS0twRSxlQUFlLENBQUN1SCxhQUxyQixFQUtxQyxDQUFDbkQsTUFBTSxHQUFHb0QsT0FBVCxDQUFpQixPQUFqQixDQUFELEVBQTRCcEQsTUFBTSxHQUFHdkgsS0FBVCxDQUFlLE9BQWYsQ0FBNUIsQ0FMckMsb0NBTUttRCxlQUFlLENBQUN5SCxhQU5yQixFQU1xQyxDQUFDckQsTUFBTSxHQUFHZ0QsUUFBVCxDQUFrQixDQUFsQixFQUFxQixPQUFyQixFQUE4QkksT0FBOUIsQ0FBc0MsT0FBdEMsQ0FBRCxFQUFpRHBELE1BQU0sR0FBR2dELFFBQVQsQ0FBa0IsQ0FBbEIsRUFBcUIsT0FBckIsRUFBOEJ2SyxLQUE5QixDQUFvQyxPQUFwQyxDQUFqRCxDQU5yQztBQVFBbUssSUFBQUEsT0FBTyxDQUFDVSxtQkFBUixHQUE4QixJQUE5QjtBQUNBVixJQUFBQSxPQUFPLENBQUNXLGVBQVIsR0FBMEIsSUFBMUI7QUFDQVgsSUFBQUEsT0FBTyxDQUFDWSxlQUFSLEdBQTBCLElBQTFCO0FBQ0FaLElBQUFBLE9BQU8sQ0FBQ2EsT0FBUixHQUFrQnpELE1BQU0sRUFBeEI7QUFDQTRDLElBQUFBLE9BQU8sQ0FBQ2MsTUFBUixHQUFpQjtBQUNick4sTUFBQUEsTUFBTSxFQUFFLFlBREs7QUFFYnNOLE1BQUFBLFNBQVMsRUFBRSxLQUZFO0FBR2JDLE1BQUFBLFVBQVUsRUFBRWhJLGVBQWUsQ0FBQ2lJLFlBSGY7QUFJYkMsTUFBQUEsV0FBVyxFQUFFbEksZUFBZSxDQUFDbUksYUFKaEI7QUFLYkMsTUFBQUEsU0FBUyxFQUFFcEksZUFBZSxDQUFDcUksUUFMZDtBQU1iQyxNQUFBQSxPQUFPLEVBQUV0SSxlQUFlLENBQUN1SSxNQU5aO0FBT2JDLE1BQUFBLGdCQUFnQixFQUFFeEksZUFBZSxDQUFDeUksZ0JBUHJCO0FBUWJDLE1BQUFBLFVBQVUsRUFBRXpKLG9CQUFvQixDQUFDMEosWUFBckIsQ0FBa0NDLElBUmpDO0FBU2JDLE1BQUFBLFVBQVUsRUFBRTVKLG9CQUFvQixDQUFDMEosWUFBckIsQ0FBa0NHLE1BVGpDO0FBVWJDLE1BQUFBLFFBQVEsRUFBRTtBQVZHLEtBQWpCLENBZjBELENBNEIxRDtBQUNBOztBQUNBLFFBQUl4TyxTQUFTLElBQUlDLE9BQWpCLEVBQTBCO0FBQ3RCd00sTUFBQUEsT0FBTyxDQUFDek0sU0FBUixHQUFvQjZKLE1BQU0sQ0FBQzdKLFNBQUQsQ0FBTixDQUFrQmlOLE9BQWxCLENBQTBCLEtBQTFCLENBQXBCO0FBQ0FSLE1BQUFBLE9BQU8sQ0FBQ3hNLE9BQVIsR0FBa0I0SixNQUFNLENBQUM1SixPQUFELENBQU4sQ0FBZ0JxQyxLQUFoQixDQUFzQixLQUF0QixDQUFsQjtBQUNILEtBSEQsTUFHTztBQUNIO0FBQ0FtSyxNQUFBQSxPQUFPLENBQUN6TSxTQUFSLEdBQW9CNkosTUFBTSxFQUExQjtBQUNBNEMsTUFBQUEsT0FBTyxDQUFDeE0sT0FBUixHQUFrQjRKLE1BQU0sRUFBeEI7QUFDSDs7QUFFRHRNLElBQUFBLGlCQUFpQixDQUFDSSxrQkFBbEIsQ0FBcUM4USxlQUFyQyxDQUNJaEMsT0FESixFQUVJbFAsaUJBQWlCLENBQUNtUiwyQkFGdEIsRUF2QzBELENBNEMxRDtBQUNBO0FBQ0gsR0F2MUJxQjs7QUEwMUJ0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUEsRUFBQUEsMkJBaDJCc0IsdUNBZzJCTXZMLEtBaDJCTixFQWcyQmF3TCxHQWgyQmIsRUFnMkJrQkMsS0FoMkJsQixFQWcyQnlCO0FBQzNDO0FBQ0FyUixJQUFBQSxpQkFBaUIsQ0FBQytELFdBQWxCLENBQThCL0QsaUJBQWlCLENBQUNHLGFBQWxCLENBQWdDeUMsR0FBaEMsRUFBOUIsRUFGMkMsQ0FHM0M7QUFDSCxHQXAyQnFCOztBQXMyQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0ltQixFQUFBQSxXQTEyQnNCLHVCQTAyQlZELElBMTJCVSxFQTAyQko7QUFDZDlELElBQUFBLGlCQUFpQixDQUFDTyxTQUFsQixDQUE0QnlELE1BQTVCLENBQW1DRixJQUFuQyxFQUF5Q2dHLElBQXpDO0FBQ0E5SixJQUFBQSxpQkFBaUIsQ0FBQ0csYUFBbEIsQ0FBZ0MrSixPQUFoQyxDQUF3QyxLQUF4QyxFQUErQ3BDLFFBQS9DLENBQXdELFNBQXhEO0FBQ0g7QUE3MkJxQixDQUExQjtBQWczQkE7QUFDQTtBQUNBOztBQUNBNUgsQ0FBQyxDQUFDb1IsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnZSLEVBQUFBLGlCQUFpQixDQUFDYSxVQUFsQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEV4dGVuc2lvbnNBUEksIG1vbWVudCwgZ2xvYmFsVHJhbnNsYXRlLCBDRFJQbGF5ZXIsIENkckFQSSwgVXNlck1lc3NhZ2UsIEFDTEhlbHBlciAqL1xuXG4vKipcbiAqIGNhbGxEZXRhaWxSZWNvcmRzIG1vZHVsZS5cbiAqIEBtb2R1bGUgY2FsbERldGFpbFJlY29yZHNcbiAqL1xuY29uc3QgY2FsbERldGFpbFJlY29yZHMgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIGNhbGwgZGV0YWlsIHJlY29yZHMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjZHJUYWJsZTogJCgnI2Nkci10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWxzZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGF0ZVJhbmdlU2VsZWN0b3I6ICQoJyNkYXRlLXJhbmdlLXNlbGVjdG9yJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2VhcmNoIENEUiBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlYXJjaENEUklucHV0OiAkKCcjc2VhcmNoLWNkci1pbnB1dCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhZ2VMZW5ndGhTZWxlY3RvcjogJCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9mIHBsYXllcnMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHBsYXllcnM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIENEUiBkYXRhYmFzZSBoYXMgYW55IHJlY29yZHNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBoYXNDRFJSZWNvcmRzOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGVtcHR5IGRhdGFiYXNlIHBsYWNlaG9sZGVyIGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlbXB0eURhdGFiYXNlUGxhY2Vob2xkZXI6ICQoJyNjZHItZW1wdHktZGF0YWJhc2UtcGxhY2Vob2xkZXInKSxcblxuICAgIC8qKlxuICAgICAqIFN0b3JhZ2Uga2V5IGZvciBmaWx0ZXIgc3RhdGUgaW4gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIFNUT1JBR0VfS0VZOiAnY2RyX2ZpbHRlcnNfc3RhdGUnLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byB0cmFjayBpZiBEYXRhVGFibGUgaGFzIGNvbXBsZXRlZCBpbml0aWFsaXphdGlvblxuICAgICAqIFdIWTogUHJldmVudHMgc2F2aW5nIHN0YXRlIGR1cmluZyBpbml0aWFsIGxvYWQgYmVmb3JlIGZpbHRlcnMgYXJlIHJlc3RvcmVkXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgY2FsbCBkZXRhaWwgcmVjb3Jkcy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBMaXN0ZW4gZm9yIGhhc2ggY2hhbmdlcyAod2hlbiB1c2VyIGNsaWNrcyBtZW51IGxpbmsgd2hpbGUgYWxyZWFkeSBvbiBwYWdlKVxuICAgICAgICAvLyBXSFk6IEJyb3dzZXIgZG9lc24ndCByZWxvYWQgcGFnZSBvbiBoYXNoLW9ubHkgVVJMIGNoYW5nZXNcbiAgICAgICAgJChgYVtocmVmPScke2dsb2JhbFJvb3RVcmx9Y2FsbC1kZXRhaWwtcmVjb3Jkcy9pbmRleC8jcmVzZXQtY2FjaGUnXWApLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAvLyBSZW1vdmUgaGFzaCBmcm9tIFVSTCB3aXRob3V0IHBhZ2UgcmVsb2FkXG4gICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUobnVsbCwgbnVsbCwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNsZWFyRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgICAgICAgLy8gQWxzbyBjbGVhciBwYWdlIGxlbmd0aCBwcmVmZXJlbmNlXG4gICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICAgICAgIC8vIFJlbG9hZCBwYWdlIHRvIGFwcGx5IHJlc2V0XG4gICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBGZXRjaCBtZXRhZGF0YSBmaXJzdCwgdGhlbiBpbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIHByb3BlciBkYXRlIHJhbmdlXG4gICAgICAgIC8vIFdIWTogUHJldmVudHMgZG91YmxlIHJlcXVlc3Qgb24gcGFnZSBsb2FkXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmZldGNoTGF0ZXN0Q0RSRGF0ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlIGN1cnJlbnQgZmlsdGVyIHN0YXRlIHRvIHNlc3Npb25TdG9yYWdlXG4gICAgICogU3RvcmVzIGRhdGUgcmFuZ2UsIHNlYXJjaCB0ZXh0LCBjdXJyZW50IHBhZ2UsIGFuZCBwYWdlIGxlbmd0aFxuICAgICAqL1xuICAgIHNhdmVGaWx0ZXJzU3RhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBGZWF0dXJlIGRldGVjdGlvbiAtIGV4aXQgc2lsZW50bHkgaWYgc2Vzc2lvblN0b3JhZ2Ugbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZXNzaW9uU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tDRFJdIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN0YXRlID0ge1xuICAgICAgICAgICAgICAgIGRhdGVGcm9tOiBudWxsLFxuICAgICAgICAgICAgICAgIGRhdGVUbzogbnVsbCxcbiAgICAgICAgICAgICAgICBzZWFyY2hUZXh0OiAnJyxcbiAgICAgICAgICAgICAgICBjdXJyZW50UGFnZTogMCxcbiAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoOiBjYWxsRGV0YWlsUmVjb3Jkcy5nZXRQYWdlTGVuZ3RoKClcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEdldCBkYXRlcyBmcm9tIGRhdGVyYW5nZXBpY2tlciBpbnN0YW5jZVxuICAgICAgICAgICAgY29uc3QgZGF0ZVJhbmdlUGlja2VyID0gY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGEoJ2RhdGVyYW5nZXBpY2tlcicpO1xuICAgICAgICAgICAgaWYgKGRhdGVSYW5nZVBpY2tlciAmJiBkYXRlUmFuZ2VQaWNrZXIuc3RhcnREYXRlICYmIGRhdGVSYW5nZVBpY2tlci5lbmREYXRlKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuZGF0ZUZyb20gPSBkYXRlUmFuZ2VQaWNrZXIuc3RhcnREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmRhdGVUbyA9IGRhdGVSYW5nZVBpY2tlci5lbmREYXRlLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBHZXQgc2VhcmNoIHRleHQgZnJvbSBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgc3RhdGUuc2VhcmNoVGV4dCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCkgfHwgJyc7XG5cbiAgICAgICAgICAgIC8vIEdldCBjdXJyZW50IHBhZ2UgZnJvbSBEYXRhVGFibGUgKGlmIGluaXRpYWxpemVkKVxuICAgICAgICAgICAgaWYgKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZSAmJiBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2VJbmZvID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UuaW5mbygpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmN1cnJlbnRQYWdlID0gcGFnZUluZm8ucGFnZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShjYWxsRGV0YWlsUmVjb3Jkcy5TVE9SQUdFX0tFWSwgSlNPTi5zdHJpbmdpZnkoc3RhdGUpKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tDRFJdIEZhaWxlZCB0byBzYXZlIGZpbHRlcnMgdG8gc2Vzc2lvblN0b3JhZ2U6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZmlsdGVyIHN0YXRlIGZyb20gc2Vzc2lvblN0b3JhZ2VcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fG51bGx9IFNhdmVkIHN0YXRlIG9iamVjdCBvciBudWxsIGlmIG5vdCBmb3VuZC9pbnZhbGlkXG4gICAgICovXG4gICAgbG9hZEZpbHRlcnNTdGF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEZlYXR1cmUgZGV0ZWN0aW9uIC0gcmV0dXJuIG51bGwgaWYgc2Vzc2lvblN0b3JhZ2Ugbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZXNzaW9uU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tDRFJdIHNlc3Npb25TdG9yYWdlIG5vdCBhdmFpbGFibGUgZm9yIGxvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmF3RGF0YSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oY2FsbERldGFpbFJlY29yZHMuU1RPUkFHRV9LRVkpO1xuICAgICAgICAgICAgaWYgKCFyYXdEYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN0YXRlID0gSlNPTi5wYXJzZShyYXdEYXRhKTtcblxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgc3RhdGUgc3RydWN0dXJlXG4gICAgICAgICAgICBpZiAoIXN0YXRlIHx8IHR5cGVvZiBzdGF0ZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5jbGVhckZpbHRlcnNTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbQ0RSXSBGYWlsZWQgdG8gbG9hZCBmaWx0ZXJzIGZyb20gc2Vzc2lvblN0b3JhZ2U6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY29ycnVwdGVkIGRhdGFcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmNsZWFyRmlsdGVyc1N0YXRlKCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhciBzYXZlZCBmaWx0ZXIgc3RhdGUgZnJvbSBzZXNzaW9uU3RvcmFnZVxuICAgICAqL1xuICAgIGNsZWFyRmlsdGVyc1N0YXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZXNzaW9uU3RvcmFnZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGNhbGxEZXRhaWxSZWNvcmRzLlNUT1JBR0VfS0VZKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBjbGVhciBDRFIgZmlsdGVycyBmcm9tIHNlc3Npb25TdG9yYWdlOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSBhbmQgZXZlbnQgaGFuZGxlcnNcbiAgICAgKiBDYWxsZWQgYWZ0ZXIgbWV0YWRhdGEgaXMgcmVjZWl2ZWRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlQW5kSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVib3VuY2UgdGltZXIgdmFyaWFibGVcbiAgICAgICAgbGV0IHNlYXJjaERlYm91bmNlVGltZXIgPSBudWxsO1xuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVyIGlmIHRoZSB1c2VyIGlzIHN0aWxsIHR5cGluZ1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNlYXJjaERlYm91bmNlVGltZXIpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgZm9yIGRlbGF5ZWQgZXhlY3V0aW9uXG4gICAgICAgICAgICBzZWFyY2hEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTNcbiAgICAgICAgICAgICAgICAgICAgfHwgZS5rZXlDb2RlID09PSA4XG4gICAgICAgICAgICAgICAgICAgIHx8IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgcGFzcyB0aGUgc2VhcmNoIGtleXdvcmQsIGRhdGVzIGFyZSBoYW5kbGVkIHNlcGFyYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmFwcGx5RmlsdGVyKHRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7IC8vIDUwMG1zIGRlbGF5IGJlZm9yZSBleGVjdXRpbmcgdGhlIHNlYXJjaFxuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuZGF0YVRhYmxlKHtcbiAgICAgICAgICAgIHNlYXJjaDoge1xuICAgICAgICAgICAgICAgIHNlYXJjaDogY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXJ2ZXJTaWRlOiB0cnVlLFxuICAgICAgICAgICAgcHJvY2Vzc2luZzogdHJ1ZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7IGRhdGE6IG51bGwsIG9yZGVyYWJsZTogZmFsc2UgfSwgIC8vIDA6IGV4cGFuZCBpY29uIGNvbHVtblxuICAgICAgICAgICAgICAgIHsgZGF0YTogMCB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMTogZGF0ZSAoYXJyYXkgaW5kZXggMClcbiAgICAgICAgICAgICAgICB7IGRhdGE6IDEgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDI6IHNyY19udW0gKGFycmF5IGluZGV4IDEpXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAyIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAzOiBkc3RfbnVtIChhcnJheSBpbmRleCAyKVxuICAgICAgICAgICAgICAgIHsgZGF0YTogMyB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gNDogZHVyYXRpb24gKGFycmF5IGluZGV4IDMpXG4gICAgICAgICAgICAgICAgeyBkYXRhOiBudWxsLCBvcmRlcmFibGU6IGZhbHNlIH0gICAvLyA1OiBkZWxldGUgYnV0dG9uIGNvbHVtblxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICAgICAgICB7IGRlZmF1bHRDb250ZW50OiBcIi1cIiwgIHRhcmdldHM6IFwiX2FsbFwifSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBhamF4OiB7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2NkcicsXG4gICAgICAgICAgICAgICAgdHlwZTogJ0dFVCcsICAvLyBSRVNUIEFQSSB1c2VzIEdFVCBmb3IgbGlzdCByZXRyaWV2YWxcbiAgICAgICAgICAgICAgICBkYXRhOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBsZXQgaXNMaW5rZWRJZFNlYXJjaCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIDEuIEFsd2F5cyBnZXQgZGF0ZXMgZnJvbSBkYXRlIHJhbmdlIHNlbGVjdG9yIHVzaW5nIGRhdGVyYW5nZXBpY2tlciBBUElcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZVJhbmdlUGlja2VyID0gY2FsbERldGFpbFJlY29yZHMuJGRhdGVSYW5nZVNlbGVjdG9yLmRhdGEoJ2RhdGVyYW5nZXBpY2tlcicpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0ZVJhbmdlUGlja2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydERhdGUgPSBkYXRlUmFuZ2VQaWNrZXIuc3RhcnREYXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW5kRGF0ZSA9IGRhdGVSYW5nZVBpY2tlci5lbmREYXRlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhcnREYXRlICYmIHN0YXJ0RGF0ZS5pc1ZhbGlkKCkgJiYgZW5kRGF0ZSAmJiBlbmREYXRlLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kYXRlRnJvbSA9IHN0YXJ0RGF0ZS5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZGF0ZVRvID0gZW5kRGF0ZS5lbmRPZignZGF5JykuZm9ybWF0KCdZWVlZLU1NLUREIEhIOm1tOnNzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyAyLiBQcm9jZXNzIHNlYXJjaCBrZXl3b3JkIGZyb20gc2VhcmNoIGlucHV0IGZpZWxkXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlYXJjaEtleXdvcmQgPSBkLnNlYXJjaC52YWx1ZSB8fCAnJztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VhcmNoS2V5d29yZC50cmltKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleXdvcmQgPSBzZWFyY2hLZXl3b3JkLnRyaW0oKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUGFyc2Ugc2VhcmNoIHByZWZpeGVzOiBzcmM6LCBkc3Q6LCBkaWQ6LCBsaW5rZWRpZDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ3NyYzonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBzb3VyY2UgbnVtYmVyIG9ubHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuc3JjX251bSA9IGtleXdvcmQuc3Vic3RyaW5nKDQpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdkc3Q6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgZGVzdGluYXRpb24gbnVtYmVyIG9ubHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZHN0X251bSA9IGtleXdvcmQuc3Vic3RyaW5nKDQpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdkaWQ6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgRElEIG9ubHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZGlkID0ga2V5d29yZC5zdWJzdHJpbmcoNCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXl3b3JkLnN0YXJ0c1dpdGgoJ2xpbmtlZGlkOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IGxpbmtlZGlkIC0gaWdub3JlIGRhdGUgcmFuZ2UgZm9yIGxpbmtlZGlkIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5saW5rZWRpZCA9IGtleXdvcmQuc3Vic3RyaW5nKDkpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0xpbmtlZElkU2VhcmNoID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZGF0ZSBwYXJhbXMgZm9yIGxpbmtlZGlkIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJhbXMuZGF0ZUZyb207XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHBhcmFtcy5kYXRlVG87XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZ1bGwtdGV4dCBzZWFyY2g6IHNlYXJjaCBpbiBzcmNfbnVtLCBkc3RfbnVtLCBhbmQgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV0hZOiBVc2VyIGV4cGVjdHMgc2VhcmNoIHdpdGhvdXQgcHJlZml4IHRvIGZpbmQgbnVtYmVyIGFueXdoZXJlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNlYXJjaCA9IGtleXdvcmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBSRVNUIEFQSSBwYWdpbmF0aW9uIHBhcmFtZXRlcnNcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmxpbWl0ID0gZC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vZmZzZXQgPSBkLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuc29ydCA9ICdzdGFydCc7ICAvLyBTb3J0IGJ5IGNhbGwgc3RhcnQgdGltZSBmb3IgY2hyb25vbG9naWNhbCBvcmRlclxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMub3JkZXIgPSAnREVTQyc7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gV0hZOiBXZWJVSSBhbHdheXMgbmVlZHMgZ3JvdXBlZCByZWNvcmRzIChieSBsaW5rZWRpZCkgZm9yIHByb3BlciBkaXNwbGF5XG4gICAgICAgICAgICAgICAgICAgIC8vIEJhY2tlbmQgZGVmYXVsdHMgdG8gZ3JvdXBlZD10cnVlLCBidXQgZXhwbGljaXQgaXMgYmV0dGVyIHRoYW4gaW1wbGljaXRcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmdyb3VwZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFQSSByZXR1cm5zIFBCWEFwaVJlc3VsdCBzdHJ1Y3R1cmU6XG4gICAgICAgICAgICAgICAgICAgIC8vIHtyZXN1bHQ6IHRydWUsIGRhdGE6IHtyZWNvcmRzOiBbLi4uXSwgcGFnaW5hdGlvbjogey4uLn19fVxuICAgICAgICAgICAgICAgICAgICBpZiAoanNvbi5yZXN1bHQgJiYganNvbi5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHJlY29yZHMgYW5kIHBhZ2luYXRpb24gZnJvbSBuZXN0ZWQgZGF0YSBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3REYXRhID0ganNvbi5kYXRhLnJlY29yZHMgfHwgW107XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWdpbmF0aW9uID0ganNvbi5kYXRhLnBhZ2luYXRpb24gfHwge307XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBEYXRhVGFibGVzIHBhZ2luYXRpb24gcHJvcGVydGllc1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzVG90YWwgPSBwYWdpbmF0aW9uLnRvdGFsIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uLnJlY29yZHNGaWx0ZXJlZCA9IHBhZ2luYXRpb24udG90YWwgfHwgMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJhbnNmb3JtIFJFU1QgcmVjb3JkcyB0byBEYXRhVGFibGUgcm93c1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxEZXRhaWxSZWNvcmRzLnRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZShyZXN0RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYmVmb3JlU2VuZDogZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBCZWFyZXIgdG9rZW4gZm9yIEFQSSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIFRva2VuTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcgJiYgVG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQXV0aG9yaXphdGlvbicsIGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgLy9zY3JvbGxZOiAkKHdpbmRvdykuaGVpZ2h0KCkgLSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub2Zmc2V0KCkudG9wLTE1MCxcbiAgICAgICAgICAgIHNEb206ICdydGlwJyxcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogY2FsbERldGFpbFJlY29yZHMuZ2V0UGFnZUxlbmd0aCgpLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IHtcbiAgICAgICAgICAgICAgICAuLi5TZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICAgICAgZW1wdHlUYWJsZTogY2FsbERldGFpbFJlY29yZHMuZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKSxcbiAgICAgICAgICAgICAgICB6ZXJvUmVjb3JkczogY2FsbERldGFpbFJlY29yZHMuZ2V0RW1wdHlUYWJsZU1lc3NhZ2UoKVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBDRFIgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5EVF9Sb3dDbGFzcy5pbmRleE9mKFwiZGV0YWlsZWRcIikgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuaHRtbCgnPGkgY2xhc3M9XCJpY29uIGNhcmV0IGRvd25cIj48L2k+Jyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMSkuaHRtbChkYXRhWzBdKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMilcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoZGF0YVsxXSlcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgzKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChkYXRhWzJdKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZWQtdXBkYXRlJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBEdXJhdGlvbiBjb2x1bW4gKG5vIGljb25zKVxuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSg0KS5odG1sKGRhdGFbM10pLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBMYXN0IGNvbHVtbjogbG9nIGljb24gKyBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgbGV0IGFjdGlvbnNIdG1sID0gJyc7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgbG9nIGljb24gaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuaWRzICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25zSHRtbCArPSBgPGkgZGF0YS1pZHM9XCIke2RhdGEuaWRzfVwiIGNsYXNzPVwiZmlsZSBhbHRlcm5hdGUgb3V0bGluZSBpY29uXCIgc3R5bGU9XCJjdXJzb3I6IHBvaW50ZXI7IG1hcmdpbi1yaWdodDogOHB4O1wiPjwvaT5gO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFkZCBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBVc2UgdHdvLXN0ZXBzLWRlbGV0ZSBtZWNoYW5pc20gdG8gcHJldmVudCBhY2NpZGVudGFsIGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgLy8gRmlyc3QgY2xpY2sgY2hhbmdlcyB0cmFzaCBpY29uIHRvIGNsb3NlIGljb24sIHNlY29uZCBjbGljayBkZWxldGVzXG4gICAgICAgICAgICAgICAgLy8gTm90ZTogQUNMIGNoZWNrIGlzIGRvbmUgc2VydmVyLXNpZGUgaW4gVm9sdCB0ZW1wbGF0ZSAoY29sdW1uIGlzIGhpZGRlbiBpZiBubyBwZXJtaXNzaW9uKVxuICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlIGRhdGEuRFRfUm93SWQgd2hpY2ggY29udGFpbnMgbGlua2VkaWQgZm9yIGdyb3VwZWQgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGFjdGlvbnNIdG1sICs9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidHdvLXN0ZXBzLWRlbGV0ZSBkZWxldGUtcmVjb3JkIHBvcHVwZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXJlY29yZC1pZD1cIiR7ZGF0YS5EVF9Sb3dJZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5jZHJfRGVsZXRlUmVjb3JkIHx8ICdEZWxldGUgcmVjb3JkJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiIHN0eWxlPVwibWFyZ2luOiAwO1wiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPmA7XG5cbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNSkuaHRtbChhY3Rpb25zSHRtbCkuYWRkQ2xhc3MoJ3JpZ2h0IGFsaWduZWQnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMudG9nZ2xlUGFnaW5hdGlvbkNvbnRyb2xzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJbml0aWFsaXphdGlvbiBjb21wbGV0ZSBjYWxsYmFjayAtIGZpcmVkIGFmdGVyIGZpcnN0IGRhdGEgbG9hZFxuICAgICAgICAgICAgICogV0hZOiBSZXN0b3JlIGZpbHRlcnMgQUZURVIgRGF0YVRhYmxlIGhhcyBsb2FkZWQgaW5pdGlhbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGluaXRDb21wbGV0ZSgpIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgZmxhZyBGSVJTVCB0byBhbGxvdyBzdGF0ZSBzYXZpbmcgZHVyaW5nIGZpbHRlciByZXN0b3JhdGlvblxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIC8vIE5vdyByZXN0b3JlIGZpbHRlcnMgLSBkcmF3IGV2ZW50IHdpbGwgY29ycmVjdGx5IHNhdmUgdGhlIHJlc3RvcmVkIHN0YXRlXG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMucmVzdG9yZUZpbHRlcnNGcm9tU3RhdGUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUuRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgU2VhcmNoIGNvbXBvbmVudCBBRlRFUiBEYXRhVGFibGUgaXMgY3JlYXRlZFxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kc2VhcmNoQ0RSSW5wdXQuc2VhcmNoKHtcbiAgICAgICAgICAgIG1pbkNoYXJhY3RlcnM6IDAsXG4gICAgICAgICAgICBzZWFyY2hPbkZvY3VzOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaEZpZWxkczogWyd0aXRsZSddLFxuICAgICAgICAgICAgc2hvd05vUmVzdWx0czogZmFsc2UsXG4gICAgICAgICAgICBzb3VyY2U6IFtcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5U291cmNlTnVtYmVyLCB2YWx1ZTogJ3NyYzonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeURlc3ROdW1iZXIsIHZhbHVlOiAnZHN0OicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5RElELCB2YWx1ZTogJ2RpZDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmNkcl9TZWFyY2hCeUxpbmtlZElELCB2YWx1ZTogJ2xpbmtlZGlkOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5Q3VzdG9tUGhyYXNlLCB2YWx1ZTogJycgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvblNlbGVjdDogZnVuY3Rpb24ocmVzdWx0LCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCgnaGlkZSByZXN1bHRzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdGFydCB0aGUgc2VhcmNoIHdoZW4geW91IGNsaWNrIG9uIHRoZSBpY29uXG4gICAgICAgICQoJyNzZWFyY2gtaWNvbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC5mb2N1cygpO1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHNlYXJjaENEUklucHV0LnNlYXJjaCgncXVlcnknKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgdG8gc2F2ZSB0aGUgdXNlcidzIHBhZ2UgbGVuZ3RoIHNlbGVjdGlvbiBhbmQgdXBkYXRlIHRoZSB0YWJsZVxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKHBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUxlbmd0aCA9PT0gJ2F1dG8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGggPSBjYWxsRGV0YWlsUmVjb3Jkcy5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBzZWxlY3QgaW5wdXQgdmFsdWUgdG8gdGhlIHNhdmVkIHZhbHVlIGlmIGl0IGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY2RyVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oJ3NldCB2YWx1ZScsIHNhdmVkUGFnZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIFNraXAgc2F2aW5nIHN0YXRlIGR1cmluZyBpbml0aWFsIGxvYWQgYmVmb3JlIGZpbHRlcnMgYXJlIHJlc3RvcmVkXG4gICAgICAgICAgICBpZiAoIWNhbGxEZXRhaWxSZWNvcmRzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNhdmUgc3RhdGUgYWZ0ZXIgZXZlcnkgZHJhdyAocGFnaW5hdGlvbiwgc2VhcmNoLCBkYXRlIGNoYW5nZSlcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnNhdmVGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIGZvciBjbGlja2luZyBvbiBpY29uIHdpdGggZGF0YS1pZHMgKG9wZW4gaW4gbmV3IHdpbmRvdylcbiAgICAgICAgLy8gV0hZOiBDbGlja2luZyBvbiBpY29uIHNob3VsZCBvcGVuIFN5c3RlbSBEaWFnbm9zdGljIGluIG5ldyB3aW5kb3cgdG8gdmlldyB2ZXJib3NlIGxvZ3NcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICdbZGF0YS1pZHNdJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgcm93IHRvZ2dsZVxuXG4gICAgICAgICAgICBjb25zdCBpZHMgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS1pZHMnKTtcbiAgICAgICAgICAgIGlmIChpZHMgIT09IHVuZGVmaW5lZCAmJiBpZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gV0hZOiBGb3JtYXQgYXMgcXVlcnkgcGFyYW0gKyBoYXNoOiA/ZmlsdGVyPS4uLiNmaWxlPS4uLlxuICAgICAgICAgICAgICAgIC8vIE9wZW4gaW4gbmV3IHdpbmRvdyB0byBhbGxvdyB2aWV3aW5nIGxvZ3Mgd2hpbGUga2VlcGluZyBDRFIgdGFibGUgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGAke2dsb2JhbFJvb3RVcmx9c3lzdGVtLWRpYWdub3N0aWMvaW5kZXgvP2ZpbHRlcj0ke2VuY29kZVVSSUNvbXBvbmVudChpZHMpfSNmaWxlPWFzdGVyaXNrJTJGdmVyYm9zZWA7XG4gICAgICAgICAgICAgICAgd2luZG93Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3Igb3BlbmluZyBhbmQgY2xvc2luZyBkZXRhaWxzXG4gICAgICAgIC8vIFdIWTogT25seSBleHBhbmQvY29sbGFwc2Ugb24gZmlyc3QgY29sdW1uIChjYXJldCBpY29uKSBjbGljaywgbm90IG9uIGFjdGlvbiBpY29uc1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ3RyLmRldGFpbGVkIHRkOmZpcnN0LWNoaWxkJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5yb3codHIpO1xuXG4gICAgICAgICAgICBpZiAocm93LmNoaWxkLmlzU2hvd24oKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgcm93IGlzIGFscmVhZHkgb3BlbiAtIGNsb3NlIGl0XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB0ci5yZW1vdmVDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gT3BlbiB0aGlzIHJvd1xuICAgICAgICAgICAgICAgIHJvdy5jaGlsZChjYWxsRGV0YWlsUmVjb3Jkcy5zaG93UmVjb3Jkcyhyb3cuZGF0YSgpKSkuc2hvdygpO1xuICAgICAgICAgICAgICAgIHRyLmFkZENsYXNzKCdzaG93bicpO1xuICAgICAgICAgICAgICAgIHJvdy5jaGlsZCgpLmZpbmQoJy5kZXRhaWwtcmVjb3JkLXJvdycpLmVhY2goKGluZGV4LCBwbGF5ZXJSb3cpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSAkKHBsYXllclJvdykuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDRFJQbGF5ZXIoaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgc2Vjb25kIGNsaWNrIG9uIGRlbGV0ZSBidXR0b24gKGFmdGVyIHR3by1zdGVwcy1kZWxldGUgY2hhbmdlcyBpY29uIHRvIGNsb3NlKVxuICAgICAgICAvLyBXSFk6IFR3by1zdGVwcy1kZWxldGUgbWVjaGFuaXNtIHByZXZlbnRzIGFjY2lkZW50YWwgZGVsZXRpb25cbiAgICAgICAgLy8gRmlyc3QgY2xpY2s6IHRyYXNoIOKGkiBjbG9zZSAoYnkgZGVsZXRlLXNvbWV0aGluZy5qcyksIFNlY29uZCBjbGljazogZXhlY3V0ZSBkZWxldGlvblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ2EuZGVsZXRlLXJlY29yZDpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgcm93IGV4cGFuc2lvblxuXG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtcmVjb3JkLWlkJyk7XG5cbiAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZCBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCBsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIEFsd2F5cyBkZWxldGUgd2l0aCByZWNvcmRpbmdzIGFuZCBsaW5rZWQgcmVjb3Jkc1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGVsZXRlUmVjb3JkKHJlY29yZElkLCAkYnV0dG9uKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc3RvcmUgZmlsdGVycyBmcm9tIHNhdmVkIHN0YXRlIGFmdGVyIERhdGFUYWJsZSBpbml0aWFsaXphdGlvblxuICAgICAqIFdIWTogTXVzdCBiZSBjYWxsZWQgYWZ0ZXIgRGF0YVRhYmxlIGlzIGNyZWF0ZWQgdG8gcmVzdG9yZSBzZWFyY2ggYW5kIHBhZ2VcbiAgICAgKi9cbiAgICByZXN0b3JlRmlsdGVyc0Zyb21TdGF0ZSgpIHtcbiAgICAgICAgY29uc3Qgc2F2ZWRTdGF0ZSA9IGNhbGxEZXRhaWxSZWNvcmRzLmxvYWRGaWx0ZXJzU3RhdGUoKTtcbiAgICAgICAgaWYgKCFzYXZlZFN0YXRlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXN0b3JlIHNlYXJjaCB0ZXh0IHRvIGlucHV0IGZpZWxkXG4gICAgICAgIGlmIChzYXZlZFN0YXRlLnNlYXJjaFRleHQpIHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCk7XG4gICAgICAgICAgICAvLyBBcHBseSBzZWFyY2ggdG8gRGF0YVRhYmxlXG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuc2VhcmNoKHNhdmVkU3RhdGUuc2VhcmNoVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXN0b3JlIHBhZ2UgbnVtYmVyIHdpdGggZGVsYXlcbiAgICAgICAgLy8gV0hZOiBEYXRhVGFibGUgaWdub3JlcyBwYWdlKCkgZHVyaW5nIGluaXRDb21wbGV0ZSwgbmVlZCBzZXRUaW1lb3V0IHRvIGFsbG93IGluaXRpYWxpemF0aW9uIHRvIGZ1bGx5IGNvbXBsZXRlXG4gICAgICAgIGlmIChzYXZlZFN0YXRlLmN1cnJlbnRQYWdlKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUucGFnZShzYXZlZFN0YXRlLmN1cnJlbnRQYWdlKS5kcmF3KGZhbHNlKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2F2ZWRTdGF0ZS5zZWFyY2hUZXh0KSB7XG4gICAgICAgICAgICAvLyBJZiBvbmx5IHNlYXJjaCB0ZXh0IGV4aXN0cywgc3RpbGwgbmVlZCB0byBkcmF3XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5kYXRhVGFibGUuZHJhdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBDRFIgcmVjb3JkIHZpYSBSRVNUIEFQSVxuICAgICAqIFdIWTogRGVsZXRlcyBieSBsaW5rZWRpZCAtIGF1dG9tYXRpY2FsbHkgcmVtb3ZlcyBlbnRpcmUgY29udmVyc2F0aW9uIHdpdGggYWxsIGxpbmtlZCByZWNvcmRzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gQ0RSIGxpbmtlZGlkIChsaWtlIFwibWlrb3BieC0xNzYwNzg0NzkzLjQ2MjdcIilcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGJ1dHRvbiAtIEJ1dHRvbiBlbGVtZW50IHRvIHVwZGF0ZSBzdGF0ZVxuICAgICAqL1xuICAgIGRlbGV0ZVJlY29yZChyZWNvcmRJZCwgJGJ1dHRvbikge1xuICAgICAgICAvLyBBbHdheXMgZGVsZXRlIHdpdGggcmVjb3JkaW5nIGZpbGVzXG4gICAgICAgIC8vIFdIWTogbGlua2VkaWQgYXV0b21hdGljYWxseSBkZWxldGVzIGFsbCBsaW5rZWQgcmVjb3JkcyAobm8gZGVsZXRlTGlua2VkIHBhcmFtZXRlciBuZWVkZWQpXG4gICAgICAgIENkckFQSS5kZWxldGVSZWNvcmQocmVjb3JkSWQsIHsgZGVsZXRlUmVjb3JkaW5nOiB0cnVlIH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2lsZW50bHkgcmVsb2FkIHRoZSBEYXRhVGFibGUgdG8gcmVmbGVjdCBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBWaXN1YWwgZmVlZGJhY2sgKGRpc2FwcGVhcmluZyByb3cpIGlzIGVub3VnaCwgbm8gbmVlZCBmb3Igc3VjY2VzcyB0b2FzdFxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5hamF4LnJlbG9hZChudWxsLCBmYWxzZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZSBvbmx5IG9uIGZhaWx1cmVcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IHJlc3BvbnNlPy5tZXNzYWdlcz8uZXJyb3I/LlswXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY2RyX0RlbGV0ZUZhaWxlZCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGRlbGV0ZSByZWNvcmQnO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1zZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSBwYWdpbmF0aW9uIGNvbnRyb2xzIHZpc2liaWxpdHkgYmFzZWQgb24gZGF0YSBzaXplXG4gICAgICovXG4gICAgdG9nZ2xlUGFnaW5hdGlvbkNvbnRyb2xzKCkge1xuICAgICAgICBjb25zdCBpbmZvID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UuaW5mbygpO1xuICAgICAgICBpZiAoaW5mby5wYWdlcyA8PSAxKSB7XG4gICAgICAgICAgICAkKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS50YWJsZSgpLmNvbnRhaW5lcigpKS5maW5kKCcuZGF0YVRhYmxlc19wYWdpbmF0ZScpLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnRhYmxlKCkuY29udGFpbmVyKCkpLmZpbmQoJy5kYXRhVGFibGVzX3BhZ2luYXRlJykuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgQ0RSIG1ldGFkYXRhIChkYXRlIHJhbmdlKSB1c2luZyBDZHJBUElcbiAgICAgKiBXSFk6IExpZ2h0d2VpZ2h0IHJlcXVlc3QgcmV0dXJucyBvbmx5IG1ldGFkYXRhIChkYXRlcyksIG5vdCBmdWxsIENEUiByZWNvcmRzXG4gICAgICogQXZvaWRzIGRvdWJsZSByZXF1ZXN0IG9uIHBhZ2UgbG9hZFxuICAgICAqL1xuICAgIGZldGNoTGF0ZXN0Q0RSRGF0ZSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHNhdmVkIHN0YXRlIGZpcnN0XG4gICAgICAgIGNvbnN0IHNhdmVkU3RhdGUgPSBjYWxsRGV0YWlsUmVjb3Jkcy5sb2FkRmlsdGVyc1N0YXRlKCk7XG5cbiAgICAgICAgQ2RyQVBJLmdldE1ldGFkYXRhKHsgbGltaXQ6IDEwMCB9LCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5oYXNSZWNvcmRzKSB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0RGF0ZSwgZW5kRGF0ZTtcblxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgc2F2ZWQgc3RhdGUgd2l0aCBkYXRlcywgdXNlIHRob3NlIGluc3RlYWQgb2YgbWV0YWRhdGFcbiAgICAgICAgICAgICAgICBpZiAoc2F2ZWRTdGF0ZSAmJiBzYXZlZFN0YXRlLmRhdGVGcm9tICYmIHNhdmVkU3RhdGUuZGF0ZVRvKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0RGF0ZSA9IG1vbWVudChzYXZlZFN0YXRlLmRhdGVGcm9tKTtcbiAgICAgICAgICAgICAgICAgICAgZW5kRGF0ZSA9IG1vbWVudChzYXZlZFN0YXRlLmRhdGVUbyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBtZXRhZGF0YSBkYXRlIHN0cmluZ3MgdG8gbW9tZW50IG9iamVjdHNcbiAgICAgICAgICAgICAgICAgICAgc3RhcnREYXRlID0gbW9tZW50KGRhdGEuZWFybGllc3REYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgZW5kRGF0ZSA9IG1vbWVudChkYXRhLmxhdGVzdERhdGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcihzdGFydERhdGUsIGVuZERhdGUpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBEYXRhVGFibGUgb25seSBpZiB3ZSBoYXZlIHJlY29yZHNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IERhdGFUYWJsZSBuZWVkcyBkYXRlIHJhbmdlIHRvIGJlIHNldCBmaXJzdFxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemVEYXRhVGFibGVBbmRIYW5kbGVycygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBObyByZWNvcmRzIGluIGRhdGFiYXNlIGF0IGFsbCBvciBBUEkgZXJyb3JcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuc2hvd0VtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcigpO1xuICAgICAgICAgICAgICAgIC8vIERvbid0IGluaXRpYWxpemUgRGF0YVRhYmxlIGF0IGFsbCAtIGp1c3Qgc2hvdyBwbGFjZWhvbGRlclxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBhIHN0eWxlZCBlbXB0eSB0YWJsZSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBtZXNzYWdlIGZvciBlbXB0eSB0YWJsZVxuICAgICAqL1xuICAgIGdldEVtcHR5VGFibGVNZXNzYWdlKCkge1xuICAgICAgICAvLyBJZiBkYXRhYmFzZSBpcyBlbXB0eSwgd2UgZG9uJ3Qgc2hvdyB0aGlzIG1lc3NhZ2UgaW4gdGFibGVcbiAgICAgICAgaWYgKCFjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgZmlsdGVyZWQgZW1wdHkgc3RhdGUgbWVzc2FnZVxuICAgICAgICByZXR1cm4gYFxuICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcGxhY2Vob2xkZXIgc2VnbWVudFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGljb24gaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzZWFyY2ggaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5jZHJfRmlsdGVyZWRFbXB0eVRpdGxlfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW5saW5lXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHRcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0ZpbHRlcmVkRW1wdHlEZXNjcmlwdGlvbn1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIGVtcHR5IGRhdGFiYXNlIHBsYWNlaG9sZGVyIGFuZCBoaWRlcyB0aGUgdGFibGVcbiAgICAgKi9cbiAgICBzaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyKCkge1xuICAgICAgICAvLyBIaWRlIHRoZSB0YWJsZSBpdHNlbGYgKERhdGFUYWJsZSB3b24ndCBiZSBpbml0aWFsaXplZClcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmhpZGUoKTtcblxuICAgICAgICAvLyBIaWRlIHNlYXJjaCBhbmQgZGF0ZSBjb250cm9sc1xuICAgICAgICAkKCcjZGF0ZS1yYW5nZS1zZWxlY3RvcicpLmNsb3Nlc3QoJy51aS5yb3cnKS5oaWRlKCk7XG5cbiAgICAgICAgLy8gU2hvdyBwbGFjZWhvbGRlclxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyLnNob3coKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVHJhbnNmb3JtIFJFU1QgQVBJIGdyb3VwZWQgcmVjb3JkcyB0byBEYXRhVGFibGUgcm93IGZvcm1hdFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJlc3REYXRhIC0gQXJyYXkgb2YgZ3JvdXBlZCBDRFIgcmVjb3JkcyBmcm9tIFJFU1QgQVBJXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBEYXRhVGFibGUgcm93c1xuICAgICAqL1xuICAgIHRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZShyZXN0RGF0YSkge1xuICAgICAgICByZXR1cm4gcmVzdERhdGEubWFwKGdyb3VwID0+IHtcbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSB0aW1pbmcgZGlzcGxheVxuICAgICAgICAgICAgY29uc3QgYmlsbHNlYyA9IGdyb3VwLnRvdGFsQmlsbHNlYyB8fCAwO1xuICAgICAgICAgICAgY29uc3QgdGltZUZvcm1hdCA9IChiaWxsc2VjIDwgMzYwMCkgPyAnbW06c3MnIDogJ0hIOm1tOnNzJztcbiAgICAgICAgICAgIGNvbnN0IHRpbWluZyA9IGJpbGxzZWMgPiAwID8gbW9tZW50LnV0YyhiaWxsc2VjICogMTAwMCkuZm9ybWF0KHRpbWVGb3JtYXQpIDogJyc7XG5cbiAgICAgICAgICAgIC8vIEZvcm1hdCBzdGFydCBkYXRlXG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREYXRlID0gbW9tZW50KGdyb3VwLnN0YXJ0KS5mb3JtYXQoJ0RELU1NLVlZWVkgSEg6bW06c3MnKTtcblxuICAgICAgICAgICAgLy8gRXh0cmFjdCByZWNvcmRpbmcgcmVjb3JkcyAtIGZpbHRlciBvbmx5IHJlY29yZHMgd2l0aCBhY3R1YWwgcmVjb3JkaW5nIGZpbGVzXG4gICAgICAgICAgICBjb25zdCByZWNvcmRpbmdzID0gKGdyb3VwLnJlY29yZHMgfHwgW10pXG4gICAgICAgICAgICAgICAgLmZpbHRlcihyID0+IHIucmVjb3JkaW5nZmlsZSAmJiByLnJlY29yZGluZ2ZpbGUubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAubWFwKHIgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHIuaWQsXG4gICAgICAgICAgICAgICAgICAgIHNyY19udW06IHIuc3JjX251bSxcbiAgICAgICAgICAgICAgICAgICAgZHN0X251bTogci5kc3RfbnVtLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmRpbmdmaWxlOiByLnJlY29yZGluZ2ZpbGUsXG4gICAgICAgICAgICAgICAgICAgIHBsYXliYWNrX3VybDogci5wbGF5YmFja191cmwsICAgLy8gVG9rZW4tYmFzZWQgVVJMIGZvciBwbGF5YmFja1xuICAgICAgICAgICAgICAgICAgICBkb3dubG9hZF91cmw6IHIuZG93bmxvYWRfdXJsICAgIC8vIFRva2VuLWJhc2VkIFVSTCBmb3IgZG93bmxvYWRcbiAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIC8vIERldGVybWluZSBDU1MgY2xhc3NcbiAgICAgICAgICAgIGNvbnN0IGhhc1JlY29yZGluZ3MgPSByZWNvcmRpbmdzLmxlbmd0aCA+IDA7XG4gICAgICAgICAgICBjb25zdCBpc0Fuc3dlcmVkID0gZ3JvdXAuZGlzcG9zaXRpb24gPT09ICdBTlNXRVJFRCc7XG4gICAgICAgICAgICBjb25zdCBkdFJvd0NsYXNzID0gaGFzUmVjb3JkaW5ncyA/ICdkZXRhaWxlZCcgOiAndWknO1xuICAgICAgICAgICAgY29uc3QgbmVnYXRpdmVDbGFzcyA9IGlzQW5zd2VyZWQgPyAnJyA6ICcgbmVnYXRpdmUnO1xuXG4gICAgICAgICAgICAvLyBDb2xsZWN0IHZlcmJvc2UgY2FsbCBJRHNcbiAgICAgICAgICAgIGNvbnN0IGlkcyA9IChncm91cC5yZWNvcmRzIHx8IFtdKVxuICAgICAgICAgICAgICAgIC5tYXAociA9PiByLnZlcmJvc2VfY2FsbF9pZClcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGlkID0+IGlkICYmIGlkLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgLmpvaW4oJyYnKTtcblxuICAgICAgICAgICAgLy8gUmV0dXJuIERhdGFUYWJsZSByb3cgZm9ybWF0XG4gICAgICAgICAgICAvLyBEYXRhVGFibGVzIG5lZWRzIGJvdGggYXJyYXkgaW5kaWNlcyBBTkQgc3BlY2lhbCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBjb25zdCByb3cgPSBbXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkRGF0ZSwgICAgICAgICAgICAgIC8vIDA6IGRhdGVcbiAgICAgICAgICAgICAgICBncm91cC5zcmNfbnVtLCAgICAgICAgICAgICAgLy8gMTogc291cmNlIG51bWJlclxuICAgICAgICAgICAgICAgIGdyb3VwLmRzdF9udW0gfHwgZ3JvdXAuZGlkLCAvLyAyOiBkZXN0aW5hdGlvbiBudW1iZXIgb3IgRElEXG4gICAgICAgICAgICAgICAgdGltaW5nLCAgICAgICAgICAgICAgICAgICAgIC8vIDM6IGR1cmF0aW9uXG4gICAgICAgICAgICAgICAgcmVjb3JkaW5ncywgICAgICAgICAgICAgICAgIC8vIDQ6IHJlY29yZGluZyByZWNvcmRzIGFycmF5XG4gICAgICAgICAgICAgICAgZ3JvdXAuZGlzcG9zaXRpb24gICAgICAgICAgIC8vIDU6IGRpc3Bvc2l0aW9uXG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAvLyBBZGQgRGF0YVRhYmxlcyBzcGVjaWFsIHByb3BlcnRpZXNcbiAgICAgICAgICAgIHJvdy5EVF9Sb3dJZCA9IGdyb3VwLmxpbmtlZGlkO1xuICAgICAgICAgICAgcm93LkRUX1Jvd0NsYXNzID0gZHRSb3dDbGFzcyArIG5lZ2F0aXZlQ2xhc3M7XG4gICAgICAgICAgICByb3cuaWRzID0gaWRzOyAvLyBTdG9yZSByYXcgSURzIHdpdGhvdXQgZW5jb2RpbmcgLSBlbmNvZGluZyB3aWxsIGJlIGFwcGxpZWQgd2hlbiBidWlsZGluZyBVUkxcblxuICAgICAgICAgICAgcmV0dXJuIHJvdztcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgc2V0IG9mIGNhbGwgcmVjb3JkcyB3aGVuIGEgcm93IGlzIGNsaWNrZWQuXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2FsbCByZWNvcmRzLlxuICAgICAqL1xuICAgIHNob3dSZWNvcmRzKGRhdGEpIHtcbiAgICAgICAgbGV0IGh0bWxQbGF5ZXIgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBiYXNpYyB0YWJsZSBjZHItcGxheWVyXCI+PHRib2R5Pic7XG4gICAgICAgIGRhdGFbNF0uZm9yRWFjaCgocmVjb3JkLCBpKSA9PiB7XG4gICAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIHx8IHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSBudWxsXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3cgZGlzYWJsZWRcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiXCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiXCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdG9rZW4tYmFzZWQgVVJMcyBpbnN0ZWFkIG9mIGRpcmVjdCBmaWxlIHBhdGhzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBTZWN1cml0eSAtIGhpZGVzIGFjdHVhbCBmaWxlIHBhdGhzIGZyb20gdXNlclxuICAgICAgICAgICAgICAgIC8vIFR3byBzZXBhcmF0ZSBlbmRwb2ludHM6IDpwbGF5YmFjayAoaW5saW5lKSBhbmQgOmRvd25sb2FkIChmaWxlKVxuICAgICAgICAgICAgICAgIGNvbnN0IHBsYXliYWNrVXJsID0gcmVjb3JkLnBsYXliYWNrX3VybCB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBkb3dubG9hZFVybCA9IHJlY29yZC5kb3dubG9hZF91cmwgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3dcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiJHtwbGF5YmFja1VybH1cIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IGljb24gdG9wIGxlZnQgcG9pbnRpbmcgZHJvcGRvd24gZG93bmxvYWQtZm9ybWF0LWRyb3Bkb3duXCIgZGF0YS1kb3dubG9hZC11cmw9XCIke2Rvd25sb2FkVXJsfVwiPlxuICAgIFx0XHQ8aSBjbGFzcz1cImRvd25sb2FkIGljb25cIj48L2k+XG4gICAgXHRcdDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIndlYm1cIj5XZWJNIChPcHVzKTwvZGl2PlxuICAgIFx0XHRcdDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1mb3JtYXQ9XCJtcDNcIj5NUDM8L2Rpdj5cbiAgICBcdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtZm9ybWF0PVwid2F2XCI+V0FWPC9kaXY+XG4gICAgXHRcdFx0PGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWZvcm1hdD1cIm9nZ1wiPk9HRyAoT3B1cyk8L2Rpdj5cbiAgICBcdFx0PC9kaXY+XG4gICAgXHQ8L2Rpdj5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0bWxQbGF5ZXIgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICByZXR1cm4gaHRtbFBsYXllcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgcGFnZSBsZW5ndGggZm9yIERhdGFUYWJsZSwgY29uc2lkZXJpbmcgdXNlcidzIHNhdmVkIHByZWZlcmVuY2VcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldFBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHNhdmVkIHZhbHVlIG9yIHVzZSB0aGUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHZhbHVlIGlmIG5vbmUgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgcmV0dXJuIHNhdmVkUGFnZUxlbmd0aCA/IHBhcnNlSW50KHNhdmVkUGFnZUxlbmd0aCwgMTApIDogY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygcm93cyB0aGF0IGNhbiBmaXQgb24gYSBwYWdlIGJhc2VkIG9uIHRoZSBjdXJyZW50IHdpbmRvdyBoZWlnaHQuXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmZpbmQoJ3Rib2R5ID4gdHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSA0MDA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCA1KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yLlxuICAgICAqIEBwYXJhbSB7bW9tZW50fSBzdGFydERhdGUgLSBPcHRpb25hbCBlYXJsaWVzdCByZWNvcmQgZGF0ZSBmcm9tIGxhc3QgMTAwIHJlY29yZHNcbiAgICAgKiBAcGFyYW0ge21vbWVudH0gZW5kRGF0ZSAtIE9wdGlvbmFsIGxhdGVzdCByZWNvcmQgZGF0ZSBmcm9tIGxhc3QgMTAwIHJlY29yZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3Ioc3RhcnREYXRlID0gbnVsbCwgZW5kRGF0ZSA9IG51bGwpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgIG9wdGlvbnMucmFuZ2VzID0ge1xuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVG9kYXldOiBbbW9tZW50KCksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1llc3RlcmRheV06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RXZWVrXTogW21vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3QzMERheXNdOiBbbW9tZW50KCkuc3VidHJhY3QoMjksICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1RoaXNNb250aF06IFttb21lbnQoKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0TW9udGhdOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zLmFsd2F5c1Nob3dDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmF1dG9VcGRhdGVJbnB1dCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMubGlua2VkQ2FsZW5kYXJzID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5tYXhEYXRlID0gbW9tZW50KCk7XG4gICAgICAgIG9wdGlvbnMubG9jYWxlID0ge1xuICAgICAgICAgICAgZm9ybWF0OiAnREQvTU0vWVlZWScsXG4gICAgICAgICAgICBzZXBhcmF0b3I6ICcgLSAnLFxuICAgICAgICAgICAgYXBwbHlMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9BcHBseUJ0bixcbiAgICAgICAgICAgIGNhbmNlbExhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0NhbmNlbEJ0bixcbiAgICAgICAgICAgIGZyb21MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9mcm9tLFxuICAgICAgICAgICAgdG9MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF90byxcbiAgICAgICAgICAgIGN1c3RvbVJhbmdlTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ3VzdG9tUGVyaW9kLFxuICAgICAgICAgICAgZGF5c09mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LmRheXMsXG4gICAgICAgICAgICBtb250aE5hbWVzOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQubW9udGhzLFxuICAgICAgICAgICAgZmlyc3REYXk6IDEsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBkYXRlIHJhbmdlIGZyb20gbGFzdCAxMDAgcmVjb3JkcywgdXNlIGl0XG4gICAgICAgIC8vIFdIWTogUHJvdmlkZXMgbWVhbmluZ2Z1bCBjb250ZXh0IC0gdXNlciBzZWVzIHBlcmlvZCBjb3ZlcmluZyByZWNlbnQgY2FsbHNcbiAgICAgICAgaWYgKHN0YXJ0RGF0ZSAmJiBlbmREYXRlKSB7XG4gICAgICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudChzdGFydERhdGUpLnN0YXJ0T2YoJ2RheScpO1xuICAgICAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KGVuZERhdGUpLmVuZE9mKCdkYXknKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRvZGF5IGlmIG5vIHJlY29yZHNcbiAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KCk7XG4gICAgICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRlcmFuZ2VwaWNrZXIoXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0LFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIE5vdGU6IERvbid0IGNhbGwgYXBwbHlGaWx0ZXIgaGVyZSAtIERhdGFUYWJsZSBpcyBub3QgaW5pdGlhbGl6ZWQgeWV0XG4gICAgICAgIC8vIERhdGFUYWJsZSB3aWxsIGxvYWQgZGF0YSBhdXRvbWF0aWNhbGx5IGFmdGVyIGluaXRpYWxpemF0aW9uXG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3RvciBzZWxlY3QgZXZlbnQuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBzdGFydCAtIFRoZSBzdGFydCBkYXRlLlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gZW5kIC0gVGhlIGVuZCBkYXRlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYWJlbCAtIFRoZSBsYWJlbC5cbiAgICAgKi9cbiAgICBjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3Qoc3RhcnQsIGVuZCwgbGFiZWwpIHtcbiAgICAgICAgLy8gT25seSBwYXNzIHNlYXJjaCBrZXl3b3JkLCBkYXRlcyBhcmUgcmVhZCBkaXJlY3RseSBmcm9tIGRhdGUgcmFuZ2Ugc2VsZWN0b3JcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIoY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSk7XG4gICAgICAgIC8vIFN0YXRlIHdpbGwgYmUgc2F2ZWQgYXV0b21hdGljYWxseSBpbiBkcmF3IGV2ZW50IGFmdGVyIGZpbHRlciBpcyBhcHBsaWVkXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5zZWFyY2godGV4dCkuZHJhdygpO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgQ0RSIHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==