"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
   * Initializes the call detail records.
   */
  initialize: function initialize() {
    // Fetch metadata first, then initialize DataTable with proper date range
    // WHY: Prevents double request on page load
    callDetailRecords.fetchLatestCDRDate();
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
      callDetailRecords.$globalSearch.closest('div').removeClass('loading');
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
    CdrAPI.getMetadata({
      limit: 100
    }, function (data) {
      if (data && data.hasRecords) {
        // Convert date strings to moment objects
        var earliestDate = moment(data.earliestDate);
        var latestDate = moment(data.latestDate);
        callDetailRecords.hasCDRRecords = true;
        callDetailRecords.initializeDateRangeSelector(earliestDate, latestDate); // Initialize DataTable only if we have records
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

      var formattedDate = moment(group.start).format('DD-MM-YYYY HH:mm:ss'); // Extract all recording records (including those without files)
      // WHY: Show details for all records - disabled player is shown when no file exists

      var recordings = (group.records || []).map(function (r) {
        return {
          id: r.id,
          src_num: r.src_num,
          dst_num: r.dst_num,
          recordingfile: r.recordingfile || '',
          playback_url: r.playback_url || '',
          // Token-based URL for playback
          download_url: r.download_url || '' // Token-based URL for download

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
        htmlPlayer += "\n\n<tr class=\"detail-record-row\" id=\"".concat(record.id, "\">\n   \t<td class=\"one wide\"></td>\n   \t<td class=\"one wide right aligned\">\n   \t\t<i class=\"ui icon play\"></i>\n\t   \t<audio preload=\"metadata\" id=\"audio-player-").concat(record.id, "\" src=\"").concat(playbackUrl, "\"></audio>\n\t</td>\n    <td class=\"five wide\">\n    \t<div class=\"ui range cdr-player\" data-value=\"").concat(record.id, "\"></div>\n    </td>\n    <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n    <td class=\"one wide\">\n    \t<i class=\"ui icon download\" data-value=\"").concat(downloadUrl, "\"></i>\n    </td>\n    <td class=\"right aligned\"><span class=\"need-update\">").concat(record.src_num, "</span></td>\n    <td class=\"one wide center aligned\"><i class=\"icon exchange\"></i></td>\n   \t<td class=\"left aligned\"><span class=\"need-update\">").concat(record.dst_num, "</span></td>\n</tr>");
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
    callDetailRecords.applyFilter(callDetailRecords.$globalSearch.val());
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsRGV0YWlsUmVjb3Jkcy9jYWxsLWRldGFpbC1yZWNvcmRzLWluZGV4LmpzIl0sIm5hbWVzIjpbImNhbGxEZXRhaWxSZWNvcmRzIiwiJGNkclRhYmxlIiwiJCIsIiRnbG9iYWxTZWFyY2giLCIkZGF0ZVJhbmdlU2VsZWN0b3IiLCIkc2VhcmNoQ0RSSW5wdXQiLCIkcGFnZUxlbmd0aFNlbGVjdG9yIiwiZGF0YVRhYmxlIiwicGxheWVycyIsImhhc0NEUlJlY29yZHMiLCIkZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyIiwiaW5pdGlhbGl6ZSIsImZldGNoTGF0ZXN0Q0RSRGF0ZSIsImluaXRpYWxpemVEYXRhVGFibGVBbmRIYW5kbGVycyIsInNlYXJjaERlYm91bmNlVGltZXIiLCJvbiIsImUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0Iiwia2V5Q29kZSIsInZhbCIsImxlbmd0aCIsInRleHQiLCJhcHBseUZpbHRlciIsInNlYXJjaCIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiY29sdW1ucyIsImRhdGEiLCJvcmRlcmFibGUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwiYWpheCIsInVybCIsInR5cGUiLCJkIiwicGFyYW1zIiwiaXNMaW5rZWRJZFNlYXJjaCIsImRhdGVSYW5nZVBpY2tlciIsInN0YXJ0RGF0ZSIsImVuZERhdGUiLCJpc1ZhbGlkIiwiZGF0ZUZyb20iLCJmb3JtYXQiLCJkYXRlVG8iLCJlbmRPZiIsInNlYXJjaEtleXdvcmQiLCJ2YWx1ZSIsInRyaW0iLCJrZXl3b3JkIiwic3RhcnRzV2l0aCIsInNyY19udW0iLCJzdWJzdHJpbmciLCJkc3RfbnVtIiwiZGlkIiwibGlua2VkaWQiLCJsaW1pdCIsIm9mZnNldCIsInN0YXJ0Iiwic29ydCIsIm9yZGVyIiwiZ3JvdXBlZCIsImRhdGFTcmMiLCJqc29uIiwicmVzdWx0IiwicmVzdERhdGEiLCJyZWNvcmRzIiwicGFnaW5hdGlvbiIsInJlY29yZHNUb3RhbCIsInRvdGFsIiwicmVjb3Jkc0ZpbHRlcmVkIiwidHJhbnNmb3JtUmVzdFRvRGF0YVRhYmxlIiwiYmVmb3JlU2VuZCIsInhociIsIlRva2VuTWFuYWdlciIsImFjY2Vzc1Rva2VuIiwic2V0UmVxdWVzdEhlYWRlciIsInBhZ2luZyIsInNEb20iLCJkZWZlclJlbmRlciIsInBhZ2VMZW5ndGgiLCJnZXRQYWdlTGVuZ3RoIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImVtcHR5VGFibGUiLCJnZXRFbXB0eVRhYmxlTWVzc2FnZSIsInplcm9SZWNvcmRzIiwiY3JlYXRlZFJvdyIsInJvdyIsIkRUX1Jvd0NsYXNzIiwiaW5kZXhPZiIsImVxIiwiaHRtbCIsImFkZENsYXNzIiwiYWN0aW9uc0h0bWwiLCJpZHMiLCJEVF9Sb3dJZCIsImdsb2JhbFRyYW5zbGF0ZSIsImNkcl9EZWxldGVSZWNvcmQiLCJkcmF3Q2FsbGJhY2siLCJFeHRlbnNpb25zQVBJIiwidXBkYXRlUGhvbmVzUmVwcmVzZW50IiwidG9nZ2xlUGFnaW5hdGlvbkNvbnRyb2xzIiwib3JkZXJpbmciLCJEYXRhVGFibGUiLCJtaW5DaGFyYWN0ZXJzIiwic2VhcmNoT25Gb2N1cyIsInNlYXJjaEZpZWxkcyIsInNob3dOb1Jlc3VsdHMiLCJzb3VyY2UiLCJ0aXRsZSIsImNkcl9TZWFyY2hCeVNvdXJjZU51bWJlciIsImNkcl9TZWFyY2hCeURlc3ROdW1iZXIiLCJjZHJfU2VhcmNoQnlESUQiLCJjZHJfU2VhcmNoQnlMaW5rZWRJRCIsImNkcl9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzcG9uc2UiLCJmb2N1cyIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibG9jYWxTdG9yYWdlIiwicmVtb3ZlSXRlbSIsInNldEl0ZW0iLCJwYWdlIiwibGVuIiwiZHJhdyIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwic2F2ZWRQYWdlTGVuZ3RoIiwiZ2V0SXRlbSIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInByZXZlbnREZWZhdWx0IiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmRlZmluZWQiLCJnbG9iYWxSb290VXJsIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwid2luZG93Iiwib3BlbiIsInRyIiwidGFyZ2V0IiwiY2hpbGQiLCJpc1Nob3duIiwiaGlkZSIsInNob3dSZWNvcmRzIiwic2hvdyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJwbGF5ZXJSb3ciLCJpZCIsIkNEUlBsYXllciIsIiRidXR0b24iLCJyZWNvcmRJZCIsImRlbGV0ZVJlY29yZCIsIkNkckFQSSIsImRlbGV0ZVJlY29yZGluZyIsInJlbG9hZCIsImVycm9yTXNnIiwibWVzc2FnZXMiLCJlcnJvciIsImNkcl9EZWxldGVGYWlsZWQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImluZm8iLCJwYWdlcyIsInRhYmxlIiwiY29udGFpbmVyIiwiZ2V0TWV0YWRhdGEiLCJoYXNSZWNvcmRzIiwiZWFybGllc3REYXRlIiwibW9tZW50IiwibGF0ZXN0RGF0ZSIsImluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvciIsInNob3dFbXB0eURhdGFiYXNlUGxhY2Vob2xkZXIiLCJjZHJfRmlsdGVyZWRFbXB0eVRpdGxlIiwiY2RyX0ZpbHRlcmVkRW1wdHlEZXNjcmlwdGlvbiIsIm1hcCIsImdyb3VwIiwiYmlsbHNlYyIsInRvdGFsQmlsbHNlYyIsInRpbWVGb3JtYXQiLCJ0aW1pbmciLCJ1dGMiLCJmb3JtYXR0ZWREYXRlIiwicmVjb3JkaW5ncyIsInIiLCJyZWNvcmRpbmdmaWxlIiwicGxheWJhY2tfdXJsIiwiZG93bmxvYWRfdXJsIiwiaGFzUmVjb3JkaW5ncyIsImlzQW5zd2VyZWQiLCJkaXNwb3NpdGlvbiIsImR0Um93Q2xhc3MiLCJuZWdhdGl2ZUNsYXNzIiwidmVyYm9zZV9jYWxsX2lkIiwiZmlsdGVyIiwiam9pbiIsImh0bWxQbGF5ZXIiLCJmb3JFYWNoIiwicmVjb3JkIiwiaSIsInBsYXliYWNrVXJsIiwiZG93bmxvYWRVcmwiLCJwYXJzZUludCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsIm9wdGlvbnMiLCJyYW5nZXMiLCJjYWxfVG9kYXkiLCJjYWxfWWVzdGVyZGF5Iiwic3VidHJhY3QiLCJjYWxfTGFzdFdlZWsiLCJjYWxfTGFzdDMwRGF5cyIsImNhbF9UaGlzTW9udGgiLCJzdGFydE9mIiwiY2FsX0xhc3RNb250aCIsImFsd2F5c1Nob3dDYWxlbmRhcnMiLCJhdXRvVXBkYXRlSW5wdXQiLCJsaW5rZWRDYWxlbmRhcnMiLCJtYXhEYXRlIiwibG9jYWxlIiwic2VwYXJhdG9yIiwiYXBwbHlMYWJlbCIsImNhbF9BcHBseUJ0biIsImNhbmNlbExhYmVsIiwiY2FsX0NhbmNlbEJ0biIsImZyb21MYWJlbCIsImNhbF9mcm9tIiwidG9MYWJlbCIsImNhbF90byIsImN1c3RvbVJhbmdlTGFiZWwiLCJjYWxfQ3VzdG9tUGVyaW9kIiwiZGF5c09mV2VlayIsImNhbGVuZGFyVGV4dCIsImRheXMiLCJtb250aE5hbWVzIiwibW9udGhzIiwiZmlyc3REYXkiLCJkYXRlcmFuZ2VwaWNrZXIiLCJjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3QiLCJlbmQiLCJsYWJlbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBQ3RCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFDLFlBQUQsQ0FMVTs7QUFPdEI7QUFD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QnFCLENBQTFCO0FBeXJCQTtBQUNBO0FBQ0E7O0FBQ0E3RixDQUFDLENBQUM2UCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCaFEsRUFBQUEsaUJBQWlCLENBQUNXLFVBQWxCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRXh0ZW5zaW9uc0FQSSwgbW9tZW50LCBnbG9iYWxUcmFuc2xhdGUsIENEUlBsYXllciwgQ2RyQVBJLCBVc2VyTWVzc2FnZSwgQUNMSGVscGVyICovXG5cbi8qKlxuICogY2FsbERldGFpbFJlY29yZHMgbW9kdWxlLlxuICogQG1vZHVsZSBjYWxsRGV0YWlsUmVjb3Jkc1xuICovXG5jb25zdCBjYWxsRGV0YWlsUmVjb3JkcyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgY2FsbCBkZXRhaWwgcmVjb3JkcyB0YWJsZSBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNkclRhYmxlOiAkKCcjY2RyLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbHNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGUgcmFuZ2Ugc2VsZWN0b3IgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkYXRlUmFuZ2VTZWxlY3RvcjogJCgnI2RhdGUtcmFuZ2Utc2VsZWN0b3InKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBzZWFyY2ggQ0RSIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VhcmNoQ0RSSW5wdXQ6ICQoJyNzZWFyY2gtY2RyLWlucHV0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcGFnZUxlbmd0aFNlbGVjdG9yOiAkKCcjcGFnZS1sZW5ndGgtc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQW4gYXJyYXkgb2YgcGxheWVycy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgcGxheWVyczogW10sXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgQ0RSIGRhdGFiYXNlIGhhcyBhbnkgcmVjb3Jkc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGhhc0NEUlJlY29yZHM6IHRydWUsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZW1wdHkgZGF0YWJhc2UgcGxhY2Vob2xkZXIgZWxlbWVudFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcjogJCgnI2Nkci1lbXB0eS1kYXRhYmFzZS1wbGFjZWhvbGRlcicpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGNhbGwgZGV0YWlsIHJlY29yZHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gRmV0Y2ggbWV0YWRhdGEgZmlyc3QsIHRoZW4gaW5pdGlhbGl6ZSBEYXRhVGFibGUgd2l0aCBwcm9wZXIgZGF0ZSByYW5nZVxuICAgICAgICAvLyBXSFk6IFByZXZlbnRzIGRvdWJsZSByZXF1ZXN0IG9uIHBhZ2UgbG9hZFxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5mZXRjaExhdGVzdENEUkRhdGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEYXRhVGFibGUgYW5kIGV2ZW50IGhhbmRsZXJzXG4gICAgICogQ2FsbGVkIGFmdGVyIG1ldGFkYXRhIGlzIHJlY2VpdmVkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZUFuZEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRlYm91bmNlIHRpbWVyIHZhcmlhYmxlXG4gICAgICAgIGxldCBzZWFyY2hEZWJvdW5jZVRpbWVyID0gbnVsbDtcblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lciBpZiB0aGUgdXNlciBpcyBzdGlsbCB0eXBpbmdcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWFyY2hEZWJvdW5jZVRpbWVyKTtcblxuICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIGZvciBkZWxheWVkIGV4ZWN1dGlvblxuICAgICAgICAgICAgc2VhcmNoRGVib3VuY2VUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzXG4gICAgICAgICAgICAgICAgICAgIHx8IGUua2V5Q29kZSA9PT0gOFxuICAgICAgICAgICAgICAgICAgICB8fCBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHBhc3MgdGhlIHNlYXJjaCBrZXl3b3JkLCBkYXRlcyBhcmUgaGFuZGxlZCBzZXBhcmF0ZWx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWxheSBiZWZvcmUgZXhlY3V0aW5nIHRoZSBzZWFyY2hcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmRhdGFUYWJsZSh7XG4gICAgICAgICAgICBzZWFyY2g6IHtcbiAgICAgICAgICAgICAgICBzZWFyY2g6IGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2gudmFsKCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAgeyBkYXRhOiBudWxsLCBvcmRlcmFibGU6IGZhbHNlIH0sICAvLyAwOiBleHBhbmQgaWNvbiBjb2x1bW5cbiAgICAgICAgICAgICAgICB7IGRhdGE6IDAgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDE6IGRhdGUgKGFycmF5IGluZGV4IDApXG4gICAgICAgICAgICAgICAgeyBkYXRhOiAxIH0sICAgICAgICAgICAgICAgICAgICAgICAvLyAyOiBzcmNfbnVtIChhcnJheSBpbmRleCAxKVxuICAgICAgICAgICAgICAgIHsgZGF0YTogMiB9LCAgICAgICAgICAgICAgICAgICAgICAgLy8gMzogZHN0X251bSAoYXJyYXkgaW5kZXggMilcbiAgICAgICAgICAgICAgICB7IGRhdGE6IDMgfSwgICAgICAgICAgICAgICAgICAgICAgIC8vIDQ6IGR1cmF0aW9uIChhcnJheSBpbmRleCAzKVxuICAgICAgICAgICAgICAgIHsgZGF0YTogbnVsbCwgb3JkZXJhYmxlOiBmYWxzZSB9ICAgLy8gNTogZGVsZXRlIGJ1dHRvbiBjb2x1bW5cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAgICAgICAgeyBkZWZhdWx0Q29udGVudDogXCItXCIsICB0YXJnZXRzOiBcIl9hbGxcIn0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9jZHInLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdHRVQnLCAgLy8gUkVTVCBBUEkgdXNlcyBHRVQgZm9yIGxpc3QgcmV0cmlldmFsXG4gICAgICAgICAgICAgICAgZGF0YTogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGlzTGlua2VkSWRTZWFyY2ggPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyAxLiBBbHdheXMgZ2V0IGRhdGVzIGZyb20gZGF0ZSByYW5nZSBzZWxlY3RvciB1c2luZyBkYXRlcmFuZ2VwaWNrZXIgQVBJXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVSYW5nZVBpY2tlciA9IGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRhKCdkYXRlcmFuZ2VwaWNrZXInKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGVSYW5nZVBpY2tlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gZGF0ZVJhbmdlUGlja2VyLnN0YXJ0RGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuZERhdGUgPSBkYXRlUmFuZ2VQaWNrZXIuZW5kRGF0ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0RGF0ZSAmJiBzdGFydERhdGUuaXNWYWxpZCgpICYmIGVuZERhdGUgJiYgZW5kRGF0ZS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZGF0ZUZyb20gPSBzdGFydERhdGUuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRhdGVUbyA9IGVuZERhdGUuZW5kT2YoJ2RheScpLmZvcm1hdCgnWVlZWS1NTS1ERCBISDptbTpzcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gMi4gUHJvY2VzcyBzZWFyY2gga2V5d29yZCBmcm9tIHNlYXJjaCBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hLZXl3b3JkID0gZC5zZWFyY2gudmFsdWUgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlYXJjaEtleXdvcmQudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXl3b3JkID0gc2VhcmNoS2V5d29yZC50cmltKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHNlYXJjaCBwcmVmaXhlczogc3JjOiwgZHN0OiwgZGlkOiwgbGlua2VkaWQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdzcmM6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWFyY2ggYnkgc291cmNlIG51bWJlciBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNyY19udW0gPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnZHN0OicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IGRlc3RpbmF0aW9uIG51bWJlciBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRzdF9udW0gPSBrZXl3b3JkLnN1YnN0cmluZyg0KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXdvcmQuc3RhcnRzV2l0aCgnZGlkOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VhcmNoIGJ5IERJRCBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRpZCA9IGtleXdvcmQuc3Vic3RyaW5nKDQpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5d29yZC5zdGFydHNXaXRoKCdsaW5rZWRpZDonKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlYXJjaCBieSBsaW5rZWRpZCAtIGlnbm9yZSBkYXRlIHJhbmdlIGZvciBsaW5rZWRpZCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMubGlua2VkaWQgPSBrZXl3b3JkLnN1YnN0cmluZyg5KS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNMaW5rZWRJZFNlYXJjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRhdGUgcGFyYW1zIGZvciBsaW5rZWRpZCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcGFyYW1zLmRhdGVGcm9tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJhbXMuZGF0ZVRvO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGdWxsLXRleHQgc2VhcmNoOiBzZWFyY2ggaW4gc3JjX251bSwgZHN0X251bSwgYW5kIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlciBleHBlY3RzIHNlYXJjaCB3aXRob3V0IHByZWZpeCB0byBmaW5kIG51bWJlciBhbnl3aGVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zZWFyY2ggPSBrZXl3b3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUkVTVCBBUEkgcGFnaW5hdGlvbiBwYXJhbWV0ZXJzXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5saW1pdCA9IGQubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMub2Zmc2V0ID0gZC5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnNvcnQgPSAnc3RhcnQnOyAgLy8gU29ydCBieSBjYWxsIHN0YXJ0IHRpbWUgZm9yIGNocm9ub2xvZ2ljYWwgb3JkZXJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9yZGVyID0gJ0RFU0MnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFdIWTogV2ViVUkgYWx3YXlzIG5lZWRzIGdyb3VwZWQgcmVjb3JkcyAoYnkgbGlua2VkaWQpIGZvciBwcm9wZXIgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICAvLyBCYWNrZW5kIGRlZmF1bHRzIHRvIGdyb3VwZWQ9dHJ1ZSwgYnV0IGV4cGxpY2l0IGlzIGJldHRlciB0aGFuIGltcGxpY2l0XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5ncm91cGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVNyYzogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBUEkgcmV0dXJucyBQQlhBcGlSZXN1bHQgc3RydWN0dXJlOlxuICAgICAgICAgICAgICAgICAgICAvLyB7cmVzdWx0OiB0cnVlLCBkYXRhOiB7cmVjb3JkczogWy4uLl0sIHBhZ2luYXRpb246IHsuLi59fX1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGpzb24ucmVzdWx0ICYmIGpzb24uZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXh0cmFjdCByZWNvcmRzIGFuZCBwYWdpbmF0aW9uIGZyb20gbmVzdGVkIGRhdGEgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN0RGF0YSA9IGpzb24uZGF0YS5yZWNvcmRzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFnaW5hdGlvbiA9IGpzb24uZGF0YS5wYWdpbmF0aW9uIHx8IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgRGF0YVRhYmxlcyBwYWdpbmF0aW9uIHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc1RvdGFsID0gcGFnaW5hdGlvbi50b3RhbCB8fCAwO1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzRmlsdGVyZWQgPSBwYWdpbmF0aW9uLnRvdGFsIHx8IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyYW5zZm9ybSBSRVNUIHJlY29yZHMgdG8gRGF0YVRhYmxlIHJvd3NcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsRGV0YWlsUmVjb3Jkcy50cmFuc2Zvcm1SZXN0VG9EYXRhVGFibGUocmVzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgQmVhcmVyIHRva2VuIGZvciBBUEkgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBUb2tlbk1hbmFnZXIgIT09ICd1bmRlZmluZWQnICYmIFRva2VuTWFuYWdlci5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCBgQmVhcmVyICR7VG9rZW5NYW5hZ2VyLmFjY2Vzc1Rva2VufWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIC8vc2Nyb2xsWTogJCh3aW5kb3cpLmhlaWdodCgpIC0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9mZnNldCgpLnRvcC0xNTAsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IGNhbGxEZXRhaWxSZWNvcmRzLmdldFBhZ2VMZW5ndGgoKSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiB7XG4gICAgICAgICAgICAgICAgLi4uU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgICAgIGVtcHR5VGFibGU6IGNhbGxEZXRhaWxSZWNvcmRzLmdldEVtcHR5VGFibGVNZXNzYWdlKCksXG4gICAgICAgICAgICAgICAgemVyb1JlY29yZHM6IGNhbGxEZXRhaWxSZWNvcmRzLmdldEVtcHR5VGFibGVNZXNzYWdlKClcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyB0aGUgQ0RSIHJvdy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuRFRfUm93Q2xhc3MuaW5kZXhPZihcImRldGFpbGVkXCIpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBjYXJldCBkb3duXCI+PC9pPicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5odG1sKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDEpLmh0bWwoZGF0YVswXSk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGRhdGFbMV0pXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVlZC11cGRhdGUnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoZGF0YVsyXSlcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWVkLXVwZGF0ZScpO1xuXG4gICAgICAgICAgICAgICAgLy8gRHVyYXRpb24gY29sdW1uIChubyBpY29ucylcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNCkuaHRtbChkYXRhWzNdKS5hZGRDbGFzcygncmlnaHQgYWxpZ25lZCcpO1xuXG4gICAgICAgICAgICAgICAgLy8gTGFzdCBjb2x1bW46IGxvZyBpY29uICsgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGxldCBhY3Rpb25zSHRtbCA9ICcnO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGxvZyBpY29uIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmlkcyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uc0h0bWwgKz0gYDxpIGRhdGEtaWRzPVwiJHtkYXRhLmlkc31cIiBjbGFzcz1cImZpbGUgYWx0ZXJuYXRlIG91dGxpbmUgaWNvblwiIHN0eWxlPVwiY3Vyc29yOiBwb2ludGVyOyBtYXJnaW4tcmlnaHQ6IDhweDtcIj48L2k+YDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlIHR3by1zdGVwcy1kZWxldGUgbWVjaGFuaXNtIHRvIHByZXZlbnQgYWNjaWRlbnRhbCBkZWxldGlvblxuICAgICAgICAgICAgICAgIC8vIEZpcnN0IGNsaWNrIGNoYW5nZXMgdHJhc2ggaWNvbiB0byBjbG9zZSBpY29uLCBzZWNvbmQgY2xpY2sgZGVsZXRlc1xuICAgICAgICAgICAgICAgIC8vIE5vdGU6IEFDTCBjaGVjayBpcyBkb25lIHNlcnZlci1zaWRlIGluIFZvbHQgdGVtcGxhdGUgKGNvbHVtbiBpcyBoaWRkZW4gaWYgbm8gcGVybWlzc2lvbilcbiAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZSBkYXRhLkRUX1Jvd0lkIHdoaWNoIGNvbnRhaW5zIGxpbmtlZGlkIGZvciBncm91cGVkIHJlY29yZHNcbiAgICAgICAgICAgICAgICBhY3Rpb25zSHRtbCArPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInR3by1zdGVwcy1kZWxldGUgZGVsZXRlLXJlY29yZCBwb3B1cGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1yZWNvcmQtaWQ9XCIke2RhdGEuRFRfUm93SWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0RlbGV0ZVJlY29yZCB8fCAnRGVsZXRlIHJlY29yZCd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIiBzdHlsZT1cIm1hcmdpbjogMDtcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5gO1xuXG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDUpLmh0bWwoYWN0aW9uc0h0bWwpLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLnRvZ2dsZVBhZ2luYXRpb25Db250cm9scygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZSA9IGNhbGxEZXRhaWxSZWNvcmRzLiRjZHJUYWJsZS5EYXRhVGFibGUoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBTZWFyY2ggY29tcG9uZW50IEFGVEVSIERhdGFUYWJsZSBpcyBjcmVhdGVkXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRzZWFyY2hDRFJJbnB1dC5zZWFyY2goe1xuICAgICAgICAgICAgbWluQ2hhcmFjdGVyczogMCxcbiAgICAgICAgICAgIHNlYXJjaE9uRm9jdXM6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoRmllbGRzOiBbJ3RpdGxlJ10sXG4gICAgICAgICAgICBzaG93Tm9SZXN1bHRzOiBmYWxzZSxcbiAgICAgICAgICAgIHNvdXJjZTogW1xuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlTb3VyY2VOdW1iZXIsIHZhbHVlOiAnc3JjOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5RGVzdE51bWJlciwgdmFsdWU6ICdkc3Q6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlESUQsIHZhbHVlOiAnZGlkOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuY2RyX1NlYXJjaEJ5TGlua2VkSUQsIHZhbHVlOiAnbGlua2VkaWQ6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5jZHJfU2VhcmNoQnlDdXN0b21QaHJhc2UsIHZhbHVlOiAnJyB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9uU2VsZWN0OiBmdW5jdGlvbihyZXN1bHQsIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kc2VhcmNoQ0RSSW5wdXQuc2VhcmNoKCdoaWRlIHJlc3VsdHMnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSBzZWFyY2ggd2hlbiB5b3UgY2xpY2sgb24gdGhlIGljb25cbiAgICAgICAgJCgnI3NlYXJjaC1pY29uJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmZvY3VzKCk7XG4gICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kc2VhcmNoQ0RSSW5wdXQuc2VhcmNoKCdxdWVyeScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciB0byBzYXZlIHRoZSB1c2VyJ3MgcGFnZSBsZW5ndGggc2VsZWN0aW9uIGFuZCB1cGRhdGUgdGhlIHRhYmxlXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2UocGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlTGVuZ3RoID09PSAnYXV0bycpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFnZUxlbmd0aCA9IGNhbGxEZXRhaWxSZWNvcmRzLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2NkclRhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnLCBwYWdlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UubGVuKHBhZ2VMZW5ndGgpLmRyYXcoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kcGFnZUxlbmd0aFNlbGVjdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCB0aGUgZXZlbnQgZnJvbSBidWJibGluZ1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIHNlbGVjdCBpbnB1dCB2YWx1ZSB0byB0aGUgc2F2ZWQgdmFsdWUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgaWYgKHNhdmVkUGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bignc2V0IHZhbHVlJywgc2F2ZWRQYWdlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIGZvciBjbGlja2luZyBvbiBpY29uIHdpdGggZGF0YS1pZHMgKG9wZW4gaW4gbmV3IHdpbmRvdylcbiAgICAgICAgLy8gV0hZOiBDbGlja2luZyBvbiBpY29uIHNob3VsZCBvcGVuIFN5c3RlbSBEaWFnbm9zdGljIGluIG5ldyB3aW5kb3cgdG8gdmlldyB2ZXJib3NlIGxvZ3NcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLm9uKCdjbGljaycsICdbZGF0YS1pZHNdJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgcm93IHRvZ2dsZVxuXG4gICAgICAgICAgICBjb25zdCBpZHMgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS1pZHMnKTtcbiAgICAgICAgICAgIGlmIChpZHMgIT09IHVuZGVmaW5lZCAmJiBpZHMgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gV0hZOiBGb3JtYXQgYXMgcXVlcnkgcGFyYW0gKyBoYXNoOiA/ZmlsdGVyPS4uLiNmaWxlPS4uLlxuICAgICAgICAgICAgICAgIC8vIE9wZW4gaW4gbmV3IHdpbmRvdyB0byBhbGxvdyB2aWV3aW5nIGxvZ3Mgd2hpbGUga2VlcGluZyBDRFIgdGFibGUgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGAke2dsb2JhbFJvb3RVcmx9c3lzdGVtLWRpYWdub3N0aWMvaW5kZXgvP2ZpbHRlcj0ke2VuY29kZVVSSUNvbXBvbmVudChpZHMpfSNmaWxlPWFzdGVyaXNrJTJGdmVyYm9zZWA7XG4gICAgICAgICAgICAgICAgd2luZG93Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3Igb3BlbmluZyBhbmQgY2xvc2luZyBkZXRhaWxzXG4gICAgICAgIC8vIFdIWTogT25seSBleHBhbmQvY29sbGFwc2Ugb24gZmlyc3QgY29sdW1uIChjYXJldCBpY29uKSBjbGljaywgbm90IG9uIGFjdGlvbiBpY29uc1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ3RyLmRldGFpbGVkIHRkOmZpcnN0LWNoaWxkJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5yb3codHIpO1xuXG4gICAgICAgICAgICBpZiAocm93LmNoaWxkLmlzU2hvd24oKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgcm93IGlzIGFscmVhZHkgb3BlbiAtIGNsb3NlIGl0XG4gICAgICAgICAgICAgICAgcm93LmNoaWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB0ci5yZW1vdmVDbGFzcygnc2hvd24nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gT3BlbiB0aGlzIHJvd1xuICAgICAgICAgICAgICAgIHJvdy5jaGlsZChjYWxsRGV0YWlsUmVjb3Jkcy5zaG93UmVjb3Jkcyhyb3cuZGF0YSgpKSkuc2hvdygpO1xuICAgICAgICAgICAgICAgIHRyLmFkZENsYXNzKCdzaG93bicpO1xuICAgICAgICAgICAgICAgIHJvdy5jaGlsZCgpLmZpbmQoJy5kZXRhaWwtcmVjb3JkLXJvdycpLmVhY2goKGluZGV4LCBwbGF5ZXJSb3cpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSAkKHBsYXllclJvdykuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDRFJQbGF5ZXIoaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgc2Vjb25kIGNsaWNrIG9uIGRlbGV0ZSBidXR0b24gKGFmdGVyIHR3by1zdGVwcy1kZWxldGUgY2hhbmdlcyBpY29uIHRvIGNsb3NlKVxuICAgICAgICAvLyBXSFk6IFR3by1zdGVwcy1kZWxldGUgbWVjaGFuaXNtIHByZXZlbnRzIGFjY2lkZW50YWwgZGVsZXRpb25cbiAgICAgICAgLy8gRmlyc3QgY2xpY2s6IHRyYXNoIOKGkiBjbG9zZSAoYnkgZGVsZXRlLXNvbWV0aGluZy5qcyksIFNlY29uZCBjbGljazogZXhlY3V0ZSBkZWxldGlvblxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kY2RyVGFibGUub24oJ2NsaWNrJywgJ2EuZGVsZXRlLXJlY29yZDpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgcm93IGV4cGFuc2lvblxuXG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtcmVjb3JkLWlkJyk7XG5cbiAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZCBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCBsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIEFsd2F5cyBkZWxldGUgd2l0aCByZWNvcmRpbmdzIGFuZCBsaW5rZWQgcmVjb3Jkc1xuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuZGVsZXRlUmVjb3JkKHJlY29yZElkLCAkYnV0dG9uKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBDRFIgcmVjb3JkIHZpYSBSRVNUIEFQSVxuICAgICAqIFdIWTogRGVsZXRlcyBieSBsaW5rZWRpZCAtIGF1dG9tYXRpY2FsbHkgcmVtb3ZlcyBlbnRpcmUgY29udmVyc2F0aW9uIHdpdGggYWxsIGxpbmtlZCByZWNvcmRzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gQ0RSIGxpbmtlZGlkIChsaWtlIFwibWlrb3BieC0xNzYwNzg0NzkzLjQ2MjdcIilcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGJ1dHRvbiAtIEJ1dHRvbiBlbGVtZW50IHRvIHVwZGF0ZSBzdGF0ZVxuICAgICAqL1xuICAgIGRlbGV0ZVJlY29yZChyZWNvcmRJZCwgJGJ1dHRvbikge1xuICAgICAgICAvLyBBbHdheXMgZGVsZXRlIHdpdGggcmVjb3JkaW5nIGZpbGVzXG4gICAgICAgIC8vIFdIWTogbGlua2VkaWQgYXV0b21hdGljYWxseSBkZWxldGVzIGFsbCBsaW5rZWQgcmVjb3JkcyAobm8gZGVsZXRlTGlua2VkIHBhcmFtZXRlciBuZWVkZWQpXG4gICAgICAgIENkckFQSS5kZWxldGVSZWNvcmQocmVjb3JkSWQsIHsgZGVsZXRlUmVjb3JkaW5nOiB0cnVlIH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2lsZW50bHkgcmVsb2FkIHRoZSBEYXRhVGFibGUgdG8gcmVmbGVjdCBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBWaXN1YWwgZmVlZGJhY2sgKGRpc2FwcGVhcmluZyByb3cpIGlzIGVub3VnaCwgbm8gbmVlZCBmb3Igc3VjY2VzcyB0b2FzdFxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5hamF4LnJlbG9hZChudWxsLCBmYWxzZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZSBvbmx5IG9uIGZhaWx1cmVcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IHJlc3BvbnNlPy5tZXNzYWdlcz8uZXJyb3I/LlswXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY2RyX0RlbGV0ZUZhaWxlZCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGRlbGV0ZSByZWNvcmQnO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1zZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSBwYWdpbmF0aW9uIGNvbnRyb2xzIHZpc2liaWxpdHkgYmFzZWQgb24gZGF0YSBzaXplXG4gICAgICovXG4gICAgdG9nZ2xlUGFnaW5hdGlvbkNvbnRyb2xzKCkge1xuICAgICAgICBjb25zdCBpbmZvID0gY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnBhZ2UuaW5mbygpO1xuICAgICAgICBpZiAoaW5mby5wYWdlcyA8PSAxKSB7XG4gICAgICAgICAgICAkKGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS50YWJsZSgpLmNvbnRhaW5lcigpKS5maW5kKCcuZGF0YVRhYmxlc19wYWdpbmF0ZScpLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoY2FsbERldGFpbFJlY29yZHMuZGF0YVRhYmxlLnRhYmxlKCkuY29udGFpbmVyKCkpLmZpbmQoJy5kYXRhVGFibGVzX3BhZ2luYXRlJykuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgQ0RSIG1ldGFkYXRhIChkYXRlIHJhbmdlKSB1c2luZyBDZHJBUElcbiAgICAgKiBXSFk6IExpZ2h0d2VpZ2h0IHJlcXVlc3QgcmV0dXJucyBvbmx5IG1ldGFkYXRhIChkYXRlcyksIG5vdCBmdWxsIENEUiByZWNvcmRzXG4gICAgICogQXZvaWRzIGRvdWJsZSByZXF1ZXN0IG9uIHBhZ2UgbG9hZFxuICAgICAqL1xuICAgIGZldGNoTGF0ZXN0Q0RSRGF0ZSgpIHtcbiAgICAgICAgQ2RyQVBJLmdldE1ldGFkYXRhKHsgbGltaXQ6IDEwMCB9LCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5oYXNSZWNvcmRzKSB7XG4gICAgICAgICAgICAgICAgLy8gQ29udmVydCBkYXRlIHN0cmluZ3MgdG8gbW9tZW50IG9iamVjdHNcbiAgICAgICAgICAgICAgICBjb25zdCBlYXJsaWVzdERhdGUgPSBtb21lbnQoZGF0YS5lYXJsaWVzdERhdGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxhdGVzdERhdGUgPSBtb21lbnQoZGF0YS5sYXRlc3REYXRlKTtcblxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmhhc0NEUlJlY29yZHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemVEYXRlUmFuZ2VTZWxlY3RvcihlYXJsaWVzdERhdGUsIGxhdGVzdERhdGUpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBEYXRhVGFibGUgb25seSBpZiB3ZSBoYXZlIHJlY29yZHNcbiAgICAgICAgICAgICAgICAvLyBXSFk6IERhdGFUYWJsZSBuZWVkcyBkYXRlIHJhbmdlIHRvIGJlIHNldCBmaXJzdFxuICAgICAgICAgICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmluaXRpYWxpemVEYXRhVGFibGVBbmRIYW5kbGVycygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBObyByZWNvcmRzIGluIGRhdGFiYXNlIGF0IGFsbCBvciBBUEkgZXJyb3JcbiAgICAgICAgICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuc2hvd0VtcHR5RGF0YWJhc2VQbGFjZWhvbGRlcigpO1xuICAgICAgICAgICAgICAgIC8vIERvbid0IGluaXRpYWxpemUgRGF0YVRhYmxlIGF0IGFsbCAtIGp1c3Qgc2hvdyBwbGFjZWhvbGRlclxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBhIHN0eWxlZCBlbXB0eSB0YWJsZSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBtZXNzYWdlIGZvciBlbXB0eSB0YWJsZVxuICAgICAqL1xuICAgIGdldEVtcHR5VGFibGVNZXNzYWdlKCkge1xuICAgICAgICAvLyBJZiBkYXRhYmFzZSBpcyBlbXB0eSwgd2UgZG9uJ3Qgc2hvdyB0aGlzIG1lc3NhZ2UgaW4gdGFibGVcbiAgICAgICAgaWYgKCFjYWxsRGV0YWlsUmVjb3Jkcy5oYXNDRFJSZWNvcmRzKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgZmlsdGVyZWQgZW1wdHkgc3RhdGUgbWVzc2FnZVxuICAgICAgICByZXR1cm4gYFxuICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcGxhY2Vob2xkZXIgc2VnbWVudFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGljb24gaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzZWFyY2ggaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5jZHJfRmlsdGVyZWRFbXB0eVRpdGxlfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW5saW5lXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHRcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuY2RyX0ZpbHRlcmVkRW1wdHlEZXNjcmlwdGlvbn1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIGVtcHR5IGRhdGFiYXNlIHBsYWNlaG9sZGVyIGFuZCBoaWRlcyB0aGUgdGFibGVcbiAgICAgKi9cbiAgICBzaG93RW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyKCkge1xuICAgICAgICAvLyBIaWRlIHRoZSB0YWJsZSBpdHNlbGYgKERhdGFUYWJsZSB3b24ndCBiZSBpbml0aWFsaXplZClcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmhpZGUoKTtcblxuICAgICAgICAvLyBIaWRlIHNlYXJjaCBhbmQgZGF0ZSBjb250cm9sc1xuICAgICAgICAkKCcjZGF0ZS1yYW5nZS1zZWxlY3RvcicpLmNsb3Nlc3QoJy51aS5yb3cnKS5oaWRlKCk7XG5cbiAgICAgICAgLy8gU2hvdyBwbGFjZWhvbGRlclxuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZW1wdHlEYXRhYmFzZVBsYWNlaG9sZGVyLnNob3coKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVHJhbnNmb3JtIFJFU1QgQVBJIGdyb3VwZWQgcmVjb3JkcyB0byBEYXRhVGFibGUgcm93IGZvcm1hdFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJlc3REYXRhIC0gQXJyYXkgb2YgZ3JvdXBlZCBDRFIgcmVjb3JkcyBmcm9tIFJFU1QgQVBJXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBEYXRhVGFibGUgcm93c1xuICAgICAqL1xuICAgIHRyYW5zZm9ybVJlc3RUb0RhdGFUYWJsZShyZXN0RGF0YSkge1xuICAgICAgICByZXR1cm4gcmVzdERhdGEubWFwKGdyb3VwID0+IHtcbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSB0aW1pbmcgZGlzcGxheVxuICAgICAgICAgICAgY29uc3QgYmlsbHNlYyA9IGdyb3VwLnRvdGFsQmlsbHNlYyB8fCAwO1xuICAgICAgICAgICAgY29uc3QgdGltZUZvcm1hdCA9IChiaWxsc2VjIDwgMzYwMCkgPyAnbW06c3MnIDogJ0hIOm1tOnNzJztcbiAgICAgICAgICAgIGNvbnN0IHRpbWluZyA9IGJpbGxzZWMgPiAwID8gbW9tZW50LnV0YyhiaWxsc2VjICogMTAwMCkuZm9ybWF0KHRpbWVGb3JtYXQpIDogJyc7XG5cbiAgICAgICAgICAgIC8vIEZvcm1hdCBzdGFydCBkYXRlXG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREYXRlID0gbW9tZW50KGdyb3VwLnN0YXJ0KS5mb3JtYXQoJ0RELU1NLVlZWVkgSEg6bW06c3MnKTtcblxuICAgICAgICAgICAgLy8gRXh0cmFjdCBhbGwgcmVjb3JkaW5nIHJlY29yZHMgKGluY2x1ZGluZyB0aG9zZSB3aXRob3V0IGZpbGVzKVxuICAgICAgICAgICAgLy8gV0hZOiBTaG93IGRldGFpbHMgZm9yIGFsbCByZWNvcmRzIC0gZGlzYWJsZWQgcGxheWVyIGlzIHNob3duIHdoZW4gbm8gZmlsZSBleGlzdHNcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZGluZ3MgPSAoZ3JvdXAucmVjb3JkcyB8fCBbXSlcbiAgICAgICAgICAgICAgICAubWFwKHIgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHIuaWQsXG4gICAgICAgICAgICAgICAgICAgIHNyY19udW06IHIuc3JjX251bSxcbiAgICAgICAgICAgICAgICAgICAgZHN0X251bTogci5kc3RfbnVtLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmRpbmdmaWxlOiByLnJlY29yZGluZ2ZpbGUgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgIHBsYXliYWNrX3VybDogci5wbGF5YmFja191cmwgfHwgJycsICAgLy8gVG9rZW4tYmFzZWQgVVJMIGZvciBwbGF5YmFja1xuICAgICAgICAgICAgICAgICAgICBkb3dubG9hZF91cmw6IHIuZG93bmxvYWRfdXJsIHx8ICcnICAgIC8vIFRva2VuLWJhc2VkIFVSTCBmb3IgZG93bmxvYWRcbiAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIC8vIERldGVybWluZSBDU1MgY2xhc3NcbiAgICAgICAgICAgIGNvbnN0IGhhc1JlY29yZGluZ3MgPSByZWNvcmRpbmdzLmxlbmd0aCA+IDA7XG4gICAgICAgICAgICBjb25zdCBpc0Fuc3dlcmVkID0gZ3JvdXAuZGlzcG9zaXRpb24gPT09ICdBTlNXRVJFRCc7XG4gICAgICAgICAgICBjb25zdCBkdFJvd0NsYXNzID0gaGFzUmVjb3JkaW5ncyA/ICdkZXRhaWxlZCcgOiAndWknO1xuICAgICAgICAgICAgY29uc3QgbmVnYXRpdmVDbGFzcyA9IGlzQW5zd2VyZWQgPyAnJyA6ICcgbmVnYXRpdmUnO1xuXG4gICAgICAgICAgICAvLyBDb2xsZWN0IHZlcmJvc2UgY2FsbCBJRHNcbiAgICAgICAgICAgIGNvbnN0IGlkcyA9IChncm91cC5yZWNvcmRzIHx8IFtdKVxuICAgICAgICAgICAgICAgIC5tYXAociA9PiByLnZlcmJvc2VfY2FsbF9pZClcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGlkID0+IGlkICYmIGlkLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgLmpvaW4oJyYnKTtcblxuICAgICAgICAgICAgLy8gUmV0dXJuIERhdGFUYWJsZSByb3cgZm9ybWF0XG4gICAgICAgICAgICAvLyBEYXRhVGFibGVzIG5lZWRzIGJvdGggYXJyYXkgaW5kaWNlcyBBTkQgc3BlY2lhbCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBjb25zdCByb3cgPSBbXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkRGF0ZSwgICAgICAgICAgICAgIC8vIDA6IGRhdGVcbiAgICAgICAgICAgICAgICBncm91cC5zcmNfbnVtLCAgICAgICAgICAgICAgLy8gMTogc291cmNlIG51bWJlclxuICAgICAgICAgICAgICAgIGdyb3VwLmRzdF9udW0gfHwgZ3JvdXAuZGlkLCAvLyAyOiBkZXN0aW5hdGlvbiBudW1iZXIgb3IgRElEXG4gICAgICAgICAgICAgICAgdGltaW5nLCAgICAgICAgICAgICAgICAgICAgIC8vIDM6IGR1cmF0aW9uXG4gICAgICAgICAgICAgICAgcmVjb3JkaW5ncywgICAgICAgICAgICAgICAgIC8vIDQ6IHJlY29yZGluZyByZWNvcmRzIGFycmF5XG4gICAgICAgICAgICAgICAgZ3JvdXAuZGlzcG9zaXRpb24gICAgICAgICAgIC8vIDU6IGRpc3Bvc2l0aW9uXG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAvLyBBZGQgRGF0YVRhYmxlcyBzcGVjaWFsIHByb3BlcnRpZXNcbiAgICAgICAgICAgIHJvdy5EVF9Sb3dJZCA9IGdyb3VwLmxpbmtlZGlkO1xuICAgICAgICAgICAgcm93LkRUX1Jvd0NsYXNzID0gZHRSb3dDbGFzcyArIG5lZ2F0aXZlQ2xhc3M7XG4gICAgICAgICAgICByb3cuaWRzID0gaWRzOyAvLyBTdG9yZSByYXcgSURzIHdpdGhvdXQgZW5jb2RpbmcgLSBlbmNvZGluZyB3aWxsIGJlIGFwcGxpZWQgd2hlbiBidWlsZGluZyBVUkxcblxuICAgICAgICAgICAgcmV0dXJuIHJvdztcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgc2V0IG9mIGNhbGwgcmVjb3JkcyB3aGVuIGEgcm93IGlzIGNsaWNrZWQuXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2FsbCByZWNvcmRzLlxuICAgICAqL1xuICAgIHNob3dSZWNvcmRzKGRhdGEpIHtcbiAgICAgICAgbGV0IGh0bWxQbGF5ZXIgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBiYXNpYyB0YWJsZSBjZHItcGxheWVyXCI+PHRib2R5Pic7XG4gICAgICAgIGRhdGFbNF0uZm9yRWFjaCgocmVjb3JkLCBpKSA9PiB7XG4gICAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9ICc8dGQ+PHRyPjwvdHI+PC90ZD4nO1xuICAgICAgICAgICAgICAgIGh0bWxQbGF5ZXIgKz0gJzx0ZD48dHI+PC90cj48L3RkPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVjb3JkLnJlY29yZGluZ2ZpbGUgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIHx8IHJlY29yZC5yZWNvcmRpbmdmaWxlID09PSBudWxsXG4gICAgICAgICAgICAgICAgfHwgcmVjb3JkLnJlY29yZGluZ2ZpbGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3cgZGlzYWJsZWRcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiXCI+PC9hdWRpbz5cblx0PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJmaXZlIHdpZGVcIj5cbiAgICBcdDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCIgZGF0YS12YWx1ZT1cIiR7cmVjb3JkLmlkfVwiPjwvZGl2PlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgXHQ8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIiBkYXRhLXZhbHVlPVwiXCI+PC9pPlxuICAgIDwvdGQ+XG4gICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5zcmNfbnVtfTwvc3Bhbj48L3RkPlxuICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlIGNlbnRlciBhbGlnbmVkXCI+PGkgY2xhc3M9XCJpY29uIGV4Y2hhbmdlXCI+PC9pPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cImxlZnQgYWxpZ25lZFwiPjxzcGFuIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke3JlY29yZC5kc3RfbnVtfTwvc3Bhbj48L3RkPlxuPC90cj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdG9rZW4tYmFzZWQgVVJMcyBpbnN0ZWFkIG9mIGRpcmVjdCBmaWxlIHBhdGhzXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBTZWN1cml0eSAtIGhpZGVzIGFjdHVhbCBmaWxlIHBhdGhzIGZyb20gdXNlclxuICAgICAgICAgICAgICAgIC8vIFR3byBzZXBhcmF0ZSBlbmRwb2ludHM6IDpwbGF5YmFjayAoaW5saW5lKSBhbmQgOmRvd25sb2FkIChmaWxlKVxuICAgICAgICAgICAgICAgIGNvbnN0IHBsYXliYWNrVXJsID0gcmVjb3JkLnBsYXliYWNrX3VybCB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBkb3dubG9hZFVybCA9IHJlY29yZC5kb3dubG9hZF91cmwgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICBodG1sUGxheWVyICs9IGBcblxuPHRyIGNsYXNzPVwiZGV0YWlsLXJlY29yZC1yb3dcIiBpZD1cIiR7cmVjb3JkLmlkfVwiPlxuICAgXHQ8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjwvdGQ+XG4gICBcdDx0ZCBjbGFzcz1cIm9uZSB3aWRlIHJpZ2h0IGFsaWduZWRcIj5cbiAgIFx0XHQ8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cblx0ICAgXHQ8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtyZWNvcmQuaWR9XCIgc3JjPVwiJHtwbGF5YmFja1VybH1cIj48L2F1ZGlvPlxuXHQ8L3RkPlxuICAgIDx0ZCBjbGFzcz1cImZpdmUgd2lkZVwiPlxuICAgIFx0PGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIiBkYXRhLXZhbHVlPVwiJHtyZWNvcmQuaWR9XCI+PC9kaXY+XG4gICAgPC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICBcdDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiIGRhdGEtdmFsdWU9XCIke2Rvd25sb2FkVXJsfVwiPjwvaT5cbiAgICA8L3RkPlxuICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuc3JjX251bX08L3NwYW4+PC90ZD5cbiAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZSBjZW50ZXIgYWxpZ25lZFwiPjxpIGNsYXNzPVwiaWNvbiBleGNoYW5nZVwiPjwvaT48L3RkPlxuICAgXHQ8dGQgY2xhc3M9XCJsZWZ0IGFsaWduZWRcIj48c3BhbiBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtyZWNvcmQuZHN0X251bX08L3NwYW4+PC90ZD5cbjwvdHI+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0bWxQbGF5ZXIgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICByZXR1cm4gaHRtbFBsYXllcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgcGFnZSBsZW5ndGggZm9yIERhdGFUYWJsZSwgY29uc2lkZXJpbmcgdXNlcidzIHNhdmVkIHByZWZlcmVuY2VcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldFBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHNhdmVkIHZhbHVlIG9yIHVzZSB0aGUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHZhbHVlIGlmIG5vbmUgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjZHJUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgcmV0dXJuIHNhdmVkUGFnZUxlbmd0aCA/IHBhcnNlSW50KHNhdmVkUGFnZUxlbmd0aCwgMTApIDogY2FsbERldGFpbFJlY29yZHMuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygcm93cyB0aGF0IGNhbiBmaXQgb24gYSBwYWdlIGJhc2VkIG9uIHRoZSBjdXJyZW50IHdpbmRvdyBoZWlnaHQuXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gY2FsbERldGFpbFJlY29yZHMuJGNkclRhYmxlLmZpbmQoJ3Rib2R5ID4gdHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSA0MDA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCA1KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBkYXRlIHJhbmdlIHNlbGVjdG9yLlxuICAgICAqIEBwYXJhbSB7bW9tZW50fSBzdGFydERhdGUgLSBPcHRpb25hbCBlYXJsaWVzdCByZWNvcmQgZGF0ZSBmcm9tIGxhc3QgMTAwIHJlY29yZHNcbiAgICAgKiBAcGFyYW0ge21vbWVudH0gZW5kRGF0ZSAtIE9wdGlvbmFsIGxhdGVzdCByZWNvcmQgZGF0ZSBmcm9tIGxhc3QgMTAwIHJlY29yZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0ZVJhbmdlU2VsZWN0b3Ioc3RhcnREYXRlID0gbnVsbCwgZW5kRGF0ZSA9IG51bGwpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgIG9wdGlvbnMucmFuZ2VzID0ge1xuICAgICAgICAgICAgW2dsb2JhbFRyYW5zbGF0ZS5jYWxfVG9kYXldOiBbbW9tZW50KCksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1llc3RlcmRheV06IFttb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpLCBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5cycpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3RXZWVrXTogW21vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX0xhc3QzMERheXNdOiBbbW9tZW50KCkuc3VidHJhY3QoMjksICdkYXlzJyksIG1vbWVudCgpXSxcbiAgICAgICAgICAgIFtnbG9iYWxUcmFuc2xhdGUuY2FsX1RoaXNNb250aF06IFttb21lbnQoKS5zdGFydE9mKCdtb250aCcpLCBtb21lbnQoKS5lbmRPZignbW9udGgnKV0sXG4gICAgICAgICAgICBbZ2xvYmFsVHJhbnNsYXRlLmNhbF9MYXN0TW9udGhdOiBbbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuc3RhcnRPZignbW9udGgnKSwgbW9tZW50KCkuc3VidHJhY3QoMSwgJ21vbnRoJykuZW5kT2YoJ21vbnRoJyldLFxuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zLmFsd2F5c1Nob3dDYWxlbmRhcnMgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmF1dG9VcGRhdGVJbnB1dCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMubGlua2VkQ2FsZW5kYXJzID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5tYXhEYXRlID0gbW9tZW50KCk7XG4gICAgICAgIG9wdGlvbnMubG9jYWxlID0ge1xuICAgICAgICAgICAgZm9ybWF0OiAnREQvTU0vWVlZWScsXG4gICAgICAgICAgICBzZXBhcmF0b3I6ICcgLSAnLFxuICAgICAgICAgICAgYXBwbHlMYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9BcHBseUJ0bixcbiAgICAgICAgICAgIGNhbmNlbExhYmVsOiBnbG9iYWxUcmFuc2xhdGUuY2FsX0NhbmNlbEJ0bixcbiAgICAgICAgICAgIGZyb21MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF9mcm9tLFxuICAgICAgICAgICAgdG9MYWJlbDogZ2xvYmFsVHJhbnNsYXRlLmNhbF90byxcbiAgICAgICAgICAgIGN1c3RvbVJhbmdlTGFiZWw6IGdsb2JhbFRyYW5zbGF0ZS5jYWxfQ3VzdG9tUGVyaW9kLFxuICAgICAgICAgICAgZGF5c09mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LmRheXMsXG4gICAgICAgICAgICBtb250aE5hbWVzOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQubW9udGhzLFxuICAgICAgICAgICAgZmlyc3REYXk6IDEsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBkYXRlIHJhbmdlIGZyb20gbGFzdCAxMDAgcmVjb3JkcywgdXNlIGl0XG4gICAgICAgIC8vIFdIWTogUHJvdmlkZXMgbWVhbmluZ2Z1bCBjb250ZXh0IC0gdXNlciBzZWVzIHBlcmlvZCBjb3ZlcmluZyByZWNlbnQgY2FsbHNcbiAgICAgICAgaWYgKHN0YXJ0RGF0ZSAmJiBlbmREYXRlKSB7XG4gICAgICAgICAgICBvcHRpb25zLnN0YXJ0RGF0ZSA9IG1vbWVudChzdGFydERhdGUpLnN0YXJ0T2YoJ2RheScpO1xuICAgICAgICAgICAgb3B0aW9ucy5lbmREYXRlID0gbW9tZW50KGVuZERhdGUpLmVuZE9mKCdkYXknKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRvZGF5IGlmIG5vIHJlY29yZHNcbiAgICAgICAgICAgIG9wdGlvbnMuc3RhcnREYXRlID0gbW9tZW50KCk7XG4gICAgICAgICAgICBvcHRpb25zLmVuZERhdGUgPSBtb21lbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLiRkYXRlUmFuZ2VTZWxlY3Rvci5kYXRlcmFuZ2VwaWNrZXIoXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgY2FsbERldGFpbFJlY29yZHMuY2JEYXRlUmFuZ2VTZWxlY3Rvck9uU2VsZWN0LFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIE5vdGU6IERvbid0IGNhbGwgYXBwbHlGaWx0ZXIgaGVyZSAtIERhdGFUYWJsZSBpcyBub3QgaW5pdGlhbGl6ZWQgeWV0XG4gICAgICAgIC8vIERhdGFUYWJsZSB3aWxsIGxvYWQgZGF0YSBhdXRvbWF0aWNhbGx5IGFmdGVyIGluaXRpYWxpemF0aW9uXG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgZGF0ZSByYW5nZSBzZWxlY3RvciBzZWxlY3QgZXZlbnQuXG4gICAgICogQHBhcmFtIHttb21lbnQuTW9tZW50fSBzdGFydCAtIFRoZSBzdGFydCBkYXRlLlxuICAgICAqIEBwYXJhbSB7bW9tZW50Lk1vbWVudH0gZW5kIC0gVGhlIGVuZCBkYXRlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYWJlbCAtIFRoZSBsYWJlbC5cbiAgICAgKi9cbiAgICBjYkRhdGVSYW5nZVNlbGVjdG9yT25TZWxlY3Qoc3RhcnQsIGVuZCwgbGFiZWwpIHtcbiAgICAgICAgLy8gT25seSBwYXNzIHNlYXJjaCBrZXl3b3JkLCBkYXRlcyBhcmUgcmVhZCBkaXJlY3RseSBmcm9tIGRhdGUgcmFuZ2Ugc2VsZWN0b3JcbiAgICAgICAgY2FsbERldGFpbFJlY29yZHMuYXBwbHlGaWx0ZXIoY2FsbERldGFpbFJlY29yZHMuJGdsb2JhbFNlYXJjaC52YWwoKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGNhbGxEZXRhaWxSZWNvcmRzLmRhdGFUYWJsZS5zZWFyY2godGV4dCkuZHJhdygpO1xuICAgICAgICBjYWxsRGV0YWlsUmVjb3Jkcy4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgQ0RSIHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjYWxsRGV0YWlsUmVjb3Jkcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==